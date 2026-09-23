import { NextRequest, NextResponse } from "next/server";
import { TelemetryGapRecoveryService } from "@/lib/services/telemetryGapRecoveryService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    const date = searchParams.get("date") || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

    if (!usinaId || usinaId === "consolidado" || usinaId === "todos") {
      return NextResponse.json(
        { error: "Selecione uma usina solar específica para verificar gaps." },
        { status: 400 }
      );
    }

    const scan = await TelemetryGapRecoveryService.scanGaps(usinaId, date);
    return NextResponse.json({ success: true, scan });
  } catch (error: any) {
    console.error("[Gap Recovery API - GET] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao verificar lacunas de telemetria." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usinaId, date, midnightMode } = body;

    if (midnightMode) {
      const relatorio = await TelemetryGapRecoveryService.runMidnightHealingForAllPlants();
      return NextResponse.json({
        success: true,
        mensagem: "Rotina noturna de auto-cura executada para todas as usinas.",
        relatorio,
      });
    }

    if (!usinaId || usinaId === "consolidado" || usinaId === "todos") {
      return NextResponse.json(
        { error: "Informe o ID da usina para auto-cura." },
        { status: 400 }
      );
    }

    const dateStr = date || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const result = await TelemetryGapRecoveryService.recoverGaps(usinaId, dateStr);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Gap Recovery API - POST] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao executar processo de auto-cura." },
      { status: 500 }
    );
  }
}
