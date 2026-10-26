import { NextResponse } from "next/server";
import { SolarSyncService } from "@/lib/services/solarSyncService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!session && !isCronAuthorized) {
      return NextResponse.json({ error: "Acesso não autorizado para sincronização" }, { status: 401 });
    }

    console.log("[SYNC API] Gatilho de sincronização acionado por:", session?.user?.email || "Serviço Autorizado/Cron");
    // Para sincronização manual, aguardamos para que o frontend carregue os dados atualizados imediatamente
    await SolarSyncService.syncAllPlants();
    return NextResponse.json({ success: true, message: "Sincronização concluída com sucesso." });
  } catch (error) {
    console.error("[SYNC API] Falha na sincronização:", error);
    return NextResponse.json({ error: "Falha ao executar sincronização" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
