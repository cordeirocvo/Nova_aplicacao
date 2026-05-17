import { prisma } from "../prisma";
import { HuaweiIntegration } from "./huaweiIntegration";
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), 'sync_log.txt');

export class HuaweiSyncService {
  static async syncAll() {
    fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Início Huawei Sync\n`);
    
    const usinas = await prisma.usina.findMany({
      where: { apiFornecedor: { equals: 'HUAWEI', mode: 'insensitive' } }
    });
    fs.appendFileSync(logFile, `Usinas encontradas: ${usinas.length}\n`);

    const manufacturers = await prisma.manufacturerAPI.findMany();
    const globalHuawei = manufacturers.find(m => m.name === "HUAWEI");

    // Agrupar por credenciais para otimizar login
    const accounts = new Map<string, any[]>();
    usinas.forEach(u => {
      const key = `${u.apiKey || globalHuawei?.userKey || 'default'}:${u.apiSecret || globalHuawei?.secretKey || 'default'}`;
      if (!accounts.has(key)) accounts.set(key, []);
      accounts.get(key)!.push(u);
    });

    for (const [creds, group] of accounts.entries()) {
      const [user, pass] = creds.split(":").map(s => s.trim());
      fs.appendFileSync(logFile, `Processando conta: '${user}'\n`);
      if (user === "default") {
        fs.appendFileSync(logFile, `Conta ${user} ignorada (sem credenciais).\n`);
        continue;
      }

      try {
        const login = await HuaweiIntegration.login(user, pass);
        fs.appendFileSync(logFile, `Login OK para ${user}\n`);
        
        // 1. Batch Station KPIs
        const codes = group.map(u => u.apiId.startsWith("NE=") ? u.apiId : `NE=${u.apiId}`).join(",");
        const allStationKpi = await HuaweiIntegration.getPlantData(codes, login.token, login.cookie);
        
        // 2. Batch Device Lists
        const allDevices = await HuaweiIntegration.getDeviceList(codes, login.token, login.cookie);
        const inverters = (allDevices || []).filter((d: any) => d.devTypeId === 1);
        
        // 3. Batch Device KPIs
        let allDevKpis: any[] = [];
        if (inverters.length > 0) {
          const allDevIds = inverters.map((i: any) => i.id || i.devId).filter(Boolean).join(",");
          fs.appendFileSync(logFile, `Consultando KPIs para ${inverters.length} inversores: ${allDevIds}\n`);
          allDevKpis = await HuaweiIntegration.getDeviceRealData(allDevIds, login.token, login.cookie);
          fs.appendFileSync(logFile, `Retornados ${allDevKpis.length} KPIs de dispositivos.\n`);
        }

        for (const usina of group) {
          try {
            const usinaCode = usina.apiId.startsWith("NE=") ? usina.apiId : `NE=${usina.apiId}`;
            const stationData = allStationKpi.find((s: any) => s.stationCode === usinaCode)?.dataItemMap || {};
            
            let energyKWh = parseFloat(String(stationData.day_power ?? "0"));
            let powerFinal = parseFloat(String(stationData.active_power ?? "0"));

            const usinaInverters = inverters.filter((i: any) => i.stationCode === usinaCode);
            const stringsAcc: Record<string, { V: number; I: number }> = {};
            let v = { a: 0, b: 0, c: 0 }, cur = { a: 0, b: 0, c: 0 }, t = 45;

            if (usinaInverters.length > 0) {
              let totalP_DC = 0, totalE = 0;
              const invIds = usinaInverters.map((i: any) => i.id || i.devId);
              const usinaDevKpis = allDevKpis.filter((k: any) => invIds.includes(k.devId) || invIds.includes(Number(k.devId)) || invIds.includes(String(k.id)));
              fs.appendFileSync(logFile, `${usina.nome}: Match de ${usinaDevKpis.length} KPIs de inversores.\n`);

              usinaDevKpis.forEach((k: any, idx: number) => {
                const map = k.dataItemMap || {};
                // Prioritiza day_cap (kWh) sobre total_cap (que pode estar em MWh)
                const energy = parseFloat(String(map.day_cap || map.total_cap || "0"));
                const pDC = parseFloat(String(map.mppt_power ?? map.active_power ?? "0"));
                
                totalP_DC += pDC;
                totalE += energy;
                
                fs.appendFileSync(logFile, `  - Inversor ${k.devId}: CC=${pDC}kW, E=${energy}kWh\n`);
                
                const invLabel = k.sn || `Inv${idx+1}`;
                for (let i = 1; i <= 24; i++) {
                  const vol = parseFloat(String(map[`pv${i}_u`] || "0"));
                  const amp = parseFloat(String(map[`pv${i}_i`] || "0"));
                  if (vol > 0) stringsAcc[`${invLabel}_S${i}`] = { V: vol, I: amp };
                }
                if (idx === 0) {
                  v = { a: parseFloat(map.a_u ?? map.ab_u ?? "0"), b: parseFloat(map.b_u ?? map.bc_u ?? "0"), c: parseFloat(map.c_u ?? map.ca_u ?? "0") };
                  cur = { a: parseFloat(map.a_i ?? "0"), b: parseFloat(map.b_i ?? "0"), c: parseFloat(map.c_i ?? "0") };
                  t = parseFloat(map.temperature ?? "0");
                }
              });

              if (totalP_DC > 0) powerFinal = totalP_DC;
              if (energyKWh <= 0) energyKWh = totalE;
            }

            console.log(`[HUAWEI-SYNC] ${usina.nome}: Potência=${powerFinal.toFixed(2)}kW, Energia=${energyKWh}kWh`);

            await prisma.telemetria.create({
              data: {
                usinaId: usina.id,
                potenciaAtivaKW: powerFinal,
                energiaAcumuladaKWh: energyKWh,
                timestamp: new Date(),
                tensaoCA_A: v.a,
                tensaoCA_B: v.b,
                tensaoCA_C: v.c,
                correnteCA_A: cur.a,
                correnteCA_B: cur.b,
                correnteCA_C: cur.c,
                tempIGBT: t,
                dadosStrings: stringsAcc
              }
            });
            
            // AI Analysis
            await HuaweiIntegration.calculateLosses(usina.id).catch(() => {});

          } catch (uErr) {
            fs.appendFileSync(logFile, `[HUAWEI-SYNC] Erro em ${usina.nome}: ${uErr}\n`);
          }
        }
      } catch (batchErr) {
        fs.appendFileSync(logFile, `[HUAWEI-SYNC] Falha no grupo Huawei: ${batchErr}\n`);
      }
    }
    fs.appendFileSync(logFile, `[HUAWEI-SYNC] Finalizado.\n`);
  }
}
