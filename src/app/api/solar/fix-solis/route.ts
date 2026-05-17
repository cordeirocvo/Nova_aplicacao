import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SolisService } from "@/lib/services/solisService";

export const runtime = 'nodejs';

// GET /api/solar/fix-solis → configura credenciais
// GET /api/solar/fix-solis?action=clean → limpa telemetria errada de hoje e re-sincroniza
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "clean") {
      return await cleanAndResync();
    }
    return await fixCredentials();
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function fixCredentials() {
  const manufacturer = await prisma.manufacturerAPI.upsert({
    where: { name: "SOLIS" },
    update: { 
      userKey: "1300319277300416147", 
      secretKey: "f5ad8e6d759d469fb8610e2155f9a20c", 
      apiUrl: "https://www.soliscloud.com:13333" 
    },
    create: { 
      name: "SOLIS", 
      userKey: "1300319277300416147", 
      secretKey: "f5ad8e6d759d469fb8610e2155f9a20c", 
      apiUrl: "https://www.soliscloud.com:13333" 
    },
  });
  return NextResponse.json({ success: true, message: "SOLIS configurado!", data: manufacturer });
}

async function cleanAndResync() {
  // BRT = UTC-3: início do dia de hoje
  const todayBRT = new Date();
  todayBRT.setUTCHours(todayBRT.getUTCHours() - 3);
  todayBRT.setUTCHours(0, 0, 0, 0);
  
  // Apaga TODA a telemetria de hoje (valores antigos incorretos)
  const deletedCount = await prisma.telemetria.deleteMany({
    where: { timestamp: { gte: todayBRT } }
  });

  console.log(`[FIX] Apagadas ${deletedCount.count} telemetrias incorretas de hoje.`);

  // Busca todas as usinas Solis
  const globalSolis = await prisma.manufacturerAPI.findFirst({ where: { name: "SOLIS" } });
  const usinasSolis = await prisma.usina.findMany({
    where: { apiFornecedor: { in: ["SOLIS", "Solis", "solis"] } }
  });

  const results = [];

  for (const usina of usinasSolis) {
    const key = usina.apiKey || globalSolis?.userKey;
    const secret = usina.apiSecret || globalSolis?.secretKey;

    if (!key || !secret || !usina.apiId) {
      results.push({ usina: usina.nome, status: "SEM_CREDENCIAIS" });
      continue;
    }

    try {
      // Busca dados da usina (eToday, power)
      const stationData = await SolisService.getStationData(usina.apiId, key, secret);
      
      if (!stationData) {
        results.push({ usina: usina.nome, status: "API_SEM_RESPOSTA" });
        continue;
      }

      // Busca dados do inversor (strings DC + dados CA)
      const inverterData = await SolisService.getInverterDetail(usina.apiId, key, secret);

      const powerKW   = parseFloat(String(stationData.power     ?? "0"));
      const energyKWh = parseFloat(String(stationData.dayEnergy  ?? stationData.eToday ?? "0"));

      // Monta strings DC (uPv1..8, iPv1..8)
      const strings: Record<string, { V: number; I: number }> = {};
      if (inverterData) {
        for (let i = 1; i <= 8; i++) {
          const v = parseFloat(String(inverterData[`uPv${i}`] || "0"));
          const amp = parseFloat(String(inverterData[`iPv${i}`] || "0"));
          if (v > 0 || amp > 0) strings[`S${i}`] = { V: v, I: amp };
        }
      }

      // Dados CA
      const voltageA = parseFloat(String(inverterData?.uAc1 || "0"));
      const voltageB = parseFloat(String(inverterData?.uAc2 || "0"));
      const voltageC = parseFloat(String(inverterData?.uAc3 || "0"));
      const currentA = parseFloat(String(inverterData?.iAc1 || "0"));
      const currentB = parseFloat(String(inverterData?.iAc2 || "0"));
      const currentC = parseFloat(String(inverterData?.iAc3 || "0"));
      const tempIGBT = parseFloat(String(inverterData?.inverterTemperature || "0"));

      // Timestamp BRT
      const brtTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000);

      await prisma.telemetria.create({
        data: {
          usinaId: usina.id,
          potenciaAtivaKW: powerKW,
          energiaAcumuladaKWh: energyKWh,  // eToday da Solis = valor EXATO
          irradiancia: 0,
          tempAmbiente: 0,
          tempModulos: 0,
          timestamp: brtTimestamp,
          tensaoCA_A: voltageA,
          tensaoCA_B: voltageB,
          tensaoCA_C: voltageC,
          correnteCA_A: currentA,
          correnteCA_B: currentB,
          correnteCA_C: currentC,
          tempIGBT,
          dadosStrings: strings
        }
      });

      results.push({ 
        usina: usina.nome, 
        status: "SINCRONIZADO",
        powerKW,
        energyKWh,
        stringsCount: Object.keys(strings).length,
        tensaoCA_A: voltageA,
        tempIGBT
      });
    } catch (e: any) {
      results.push({ usina: usina.nome, status: "ERRO", error: e.message });
    }
  }

  return NextResponse.json({
    success: true,
    deletedOldRecords: deletedCount.count,
    results
  });
}
