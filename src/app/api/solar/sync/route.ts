import { NextResponse } from "next/server";
import { SolarSyncService } from "@/lib/services/solarSyncService";

export async function GET() {
  try {
    console.log("[SYNC API] Gatilho de sincronização manual acionado.");
    // Para sincronização manual, aguardamos para que o frontend carregue os dados atualizados imediatamente
    await SolarSyncService.syncAllPlants();
    return NextResponse.json({ success: true, message: "Sincronização concluída com sucesso." });
  } catch (error) {
    console.error("[SYNC API] Falha na sincronização:", error);
    return NextResponse.json({ error: "Falha ao executar sincronização" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
