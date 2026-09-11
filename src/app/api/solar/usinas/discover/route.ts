import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HuaweiIntegration } from "@/lib/services/huaweiIntegration";
import { SolisService } from "@/lib/services/solisService";
import { HoymilesService } from "@/lib/services/hoymilesService";

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawVendor = searchParams.get("fornecedor") || searchParams.get("vendor") || "ALL";
    const targetVendor = rawVendor.trim().toUpperCase();
    const userParam = searchParams.get("user");
    const passParam = searchParams.get("pass");

    console.log(`[DEBUG DISCOVER] Iniciando busca para fabricante: '${targetVendor}'`);

    let manufacturers: any[] = [];
    try {
      manufacturers = await prisma.manufacturerAPI.findMany({
        where: { active: true }
      });
    } catch (dbErr: any) {
      console.warn("[DISCOVER] Aviso: Falha ao consultar banco, usando fallback padrão.", dbErr.message);
    }

    const discovered: any[] = [];

    // 1. Descoberta Huawei
    if (targetVendor === "ALL" || targetVendor === "TODOS" || targetVendor === "" || targetVendor === "HUAWEI") {
      try {
        const hwConfig = Array.isArray(manufacturers) ? manufacturers.find(m => m.name === "HUAWEI") : null;
        const user = (userParam && userParam !== "********" && userParam.trim() !== "") 
          ? userParam.trim() 
          : (hwConfig?.userKey || "Cordeiroapihuawei").trim();
        const pass = (passParam && passParam !== "********" && passParam.trim() !== "") 
          ? passParam.trim() 
          : (hwConfig?.secretKey || "Cordeiroapi123").trim();

        if (user && pass) {
          console.log(`[DISCOVER] Consultando Huawei com usuário '${user}'`);
          const stations = await HuaweiIntegration.listStations(user, pass);
          if (Array.isArray(stations) && stations.length > 0) {
            stations.forEach((s: any) => {
              discovered.push({
                id: s.stationCode || s.code,
                nome: s.stationName || s.name || `Estação Huawei ${s.stationCode}`,
                capacidade: parseFloat(s.capacity || s.installedCapacity || "0"),
                localizacao: s.stationAddr || s.addr || "Brasil",
                fornecedor: "HUAWEI"
              });
            });
          }
        }
      } catch (hwErr: any) {
        console.error("[DISCOVER] Erro na consulta Huawei:", hwErr.message);
      }
    }

    // 2. Descoberta Solis
    if (targetVendor === "ALL" || targetVendor === "TODOS" || targetVendor === "" || targetVendor === "SOLIS") {
      try {
        const solisConfig = Array.isArray(manufacturers) ? manufacturers.find(m => m.name === "SOLIS") : null;
        const key = (userParam && userParam !== "********" && userParam.trim() !== "") 
          ? userParam.trim() 
          : (solisConfig?.userKey || "1300319277300416147").trim();
        const secret = (passParam && passParam !== "********" && passParam.trim() !== "") 
          ? passParam.trim() 
          : (solisConfig?.secretKey || "Z23F3H297P0K0X38").trim();

        if (key && secret) {
          console.log(`[DISCOVER] Consultando Solis com Key '${key}'`);
          const stations = await SolisService.listStations(key, secret);
          if (Array.isArray(stations) && stations.length > 0) {
            stations.forEach((s: any) => {
              discovered.push({
                id: s.id || s.stationId,
                nome: s.sName || s.stationName || s.name || `Usina Solis ${s.id}`,
                capacidade: parseFloat(s.designCapacity || s.capacity || s.installedCapacity || "0"),
                localizacao: `${s.city || ''} ${s.countryStr || ''}`.trim() || "Brasil",
                fornecedor: "SOLIS"
              });
            });
          }
        }
      } catch (solisErr: any) {
        console.error("[DISCOVER] Erro na consulta Solis:", solisErr.message);
      }
    }

    // 3. Descoberta Hoymiles
    if (targetVendor === "ALL" || targetVendor === "TODOS" || targetVendor === "" || targetVendor === "HOYMILES") {
      try {
        const hoymilesConfig = Array.isArray(manufacturers) ? manufacturers.find(m => m.name === "HOYMILES") : null;
        const key = (userParam && userParam !== "********" && userParam.trim() !== "") 
          ? userParam.trim() 
          : (hoymilesConfig?.userKey || "").trim();
        const secret = (passParam && passParam !== "********" && passParam.trim() !== "") 
          ? passParam.trim() 
          : (hoymilesConfig?.secretKey || "").trim();

        console.log(`[DISCOVER] Consultando Hoymiles...`);
        const stations = await HoymilesService.listStations(key, secret);
        if (Array.isArray(stations) && stations.length > 0) {
          stations.forEach((s: any) => {
            discovered.push({
              id: s.id,
              nome: s.sName || s.name || `Usina Hoymiles ${s.id}`,
              capacidade: parseFloat(s.capacity || "0"),
              localizacao: s.city || "Brasil",
              fornecedor: "HOYMILES"
            });
          });
        }
      } catch (hoyErr: any) {
        console.error("[DISCOVER] Erro na consulta Hoymiles:", hoyErr.message);
      }
    }

    console.log(`[DEBUG DISCOVER] Retornando ${discovered.length} usinas encontradas nos portais.`);
    return NextResponse.json(discovered);
  } catch (error: any) {
    console.error("Discovery Error:", error);
    return NextResponse.json([], { status: 200 }); // Retorna array vazio em vez de 500 para evitar quebra de frontend
  }
}
