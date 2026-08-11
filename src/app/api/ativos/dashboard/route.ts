import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const countAssets = await prisma.ativo.count();
    const countPesados = await prisma.ativo.count({ where: { categoria: "PESADO" } });
    const countFerramentas = await prisma.ativo.count({ where: { categoria: "FERRAMENTA" } });
    const countEmUso = await prisma.ativo.count({ where: { status: "EM_USO" } });

    const allPesados = await prisma.ativo.findMany({
      where: { categoria: "PESADO" }
    });
    const necessitamRevisao = allPesados.filter(ativo => {
      if (!ativo.horasManutencaoPreventiva) return false;
      return ativo.horasUso >= ativo.horasManutencaoPreventiva;
    });

    const [historicoUso, historicoCombustivel] = await Promise.all([
      prisma.historicoUsoAtivo.findMany({
        select: {
          obra: true,
          custoCalculado: true
        }
      }),
      prisma.registroCombustivel.findMany({
        select: {
          obra: true,
          custoTotal: true
        }
      })
    ]);

    const custosPorObraMap: Record<string, { horas: number; combustivel: number; total: number }> = {};
    let totalCustoAcumulado = 0;

    historicoUso.forEach(log => {
      const obra = log.obra || "Obra Indefinida";
      if (!custosPorObraMap[obra]) {
        custosPorObraMap[obra] = { horas: 0, combustivel: 0, total: 0 };
      }
      custosPorObraMap[obra].horas += log.custoCalculado;
      custosPorObraMap[obra].total += log.custoCalculado;
      totalCustoAcumulado += log.custoCalculado;
    });

    historicoCombustivel.forEach(log => {
      const obra = log.obra || "Obra Indefinida";
      if (!custosPorObraMap[obra]) {
        custosPorObraMap[obra] = { horas: 0, combustivel: 0, total: 0 };
      }
      custosPorObraMap[obra].combustivel += log.custoTotal;
      custosPorObraMap[obra].total += log.custoTotal;
      totalCustoAcumulado += log.custoTotal;
    });

    const custosPorObra = Object.entries(custosPorObraMap).map(([obra, detail]) => ({
      obra,
      custoHoras: detail.horas,
      custoCombustivel: detail.combustivel,
      totalCusto: detail.total
    })).sort((a, b) => b.totalCusto - a.totalCusto);

    return NextResponse.json({
      metrics: {
        totalAtivos: countAssets,
        totalPesados: countPesados,
        totalFerramentas: countFerramentas,
        totalEmUso: countEmUso,
        totalCustoAcumulado,
        ativosNecessitamRevisao: necessitamRevisao.length
      },
      necessitamRevisao,
      custosPorObra
    });
  } catch (error: any) {
    console.error("Error gathering asset dashboard data:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
