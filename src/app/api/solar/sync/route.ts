import { NextResponse } from "next/server";
import { SolarSyncService } from "@/lib/services/solarSyncService";

export async function GET() {
  try {
    console.log("[SYNC API] Gatilho de sincronização manual acionado.");
    // Rodamos em background para não travar o carregamento da página
    SolarSyncService.syncAllPlants();
    return NextResponse.json({ success: true, message: "Sincronização iniciada em segundo plano." });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao iniciar sincronização" }, { status: 500 });
  }
}
