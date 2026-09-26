import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Busca timestamps de última atualização de atividades e usinas
    const [lastActivity, lastTelemetry, lastAlarme] = await Promise.all([
      prisma.planilhaInstalacao.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true, id: true, status: true },
      }),
      prisma.telemetria.findFirst({
        orderBy: { timestamp: "desc" },
        select: { timestamp: true, id: true },
      }),
      prisma.alarme.findFirst({
        where: { status: "ATIVO" },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true, id: true },
      }),
    ]);

    const activityVersion = lastActivity?.updatedAt ? new Date(lastActivity.updatedAt).getTime() : 0;
    const telemetryVersion = lastTelemetry?.timestamp ? new Date(lastTelemetry.timestamp).getTime() : 0;
    const alarmeVersion = lastAlarme?.timestamp ? new Date(lastAlarme.timestamp).getTime() : 0;

    const hash = `${activityVersion}_${telemetryVersion}_${alarmeVersion}`;

    return NextResponse.json({
      success: true,
      hash,
      activityVersion,
      telemetryVersion,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
