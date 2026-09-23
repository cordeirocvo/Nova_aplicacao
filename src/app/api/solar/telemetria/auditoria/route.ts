import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    const tipoAcao = searchParams.get("tipoAcao");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (usinaId && usinaId !== "consolidado" && usinaId !== "todos") {
      where.usinaId = usinaId;
    }
    if (tipoAcao) {
      where.tipoAcao = tipoAcao;
    }

    const registros = await prisma.auditoriaTelemetria.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    // Buscar nomes das usinas para enriquecer o retorno
    const usinaIds: string[] = Array.from(new Set(registros.map((r: any) => r.usinaId as string)));
    const usinas = await prisma.usina.findMany({
      where: { id: { in: usinaIds } },
      select: { id: true, nome: true },
    });
    const usinaMap = new Map(usinas.map((u: any) => [u.id, u.nome]));

    const enriched = registros.map((r: any) => ({
      ...r,
      usinaNome: usinaMap.get(r.usinaId) || "Usina Desconhecida",
    }));

    return NextResponse.json({
      success: true,
      total: enriched.length,
      registros: enriched,
    });
  } catch (error: any) {
    console.error("[Auditoria API] Erro ao buscar trilha de auditoria:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao consultar trilha de auditoria." },
      { status: 500 }
    );
  }
}
