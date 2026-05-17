import { NextResponse } from "next/server";
import { HuaweiIntegration } from "@/lib/services/huaweiIntegration";
import { SolisService } from "@/lib/services/solisService";

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fornecedor = searchParams.get("fornecedor") || searchParams.get("vendor"); 
    const user = searchParams.get("user");
    const pass = searchParams.get("pass");

    console.log(`[DEBUG DISCOVER] Iniciando busca para: ${fornecedor}`);

    if (fornecedor?.toUpperCase() === "HUAWEI") {
      const stations = await HuaweiIntegration.listStations(user || undefined, pass || undefined);
      const formatted = stations.map((s: any) => ({
        id: s.stationCode,
        nome: s.stationName || `Estação ${s.stationCode}`,
        capacidade: parseFloat(s.capacity || s.installedCapacity || "0"),
        localizacao: s.stationAddr || s.addr
      }));
      return NextResponse.json(formatted);
    } 
    
    if (fornecedor?.toUpperCase() === "SOLIS") {
      const stations = await SolisService.listStations(user || undefined, pass || undefined);
      const formatted = (stations || []).map((s: any) => ({
        id: s.id || s.stationId,
        nome: s.sName || s.stationName || s.name || `Usina ${s.id}`,
        capacidade: parseFloat(s.designCapacity || s.capacity || s.installedCapacity || "0"),
        localizacao: `${s.city || ''} ${s.countryStr || ''}`.trim() || "Local não informado"
      }));
      return NextResponse.json(formatted);
    }

    return NextResponse.json({ error: "Fornecedor inválido" }, { status: 400 });
  } catch (error) {
    console.error("Discovery Error:", error);
    return NextResponse.json({ error: "Falha na descoberta de usinas" }, { status: 500 });
  }
}
