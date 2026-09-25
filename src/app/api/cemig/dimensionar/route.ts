import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dimensionarPadraoCemig, ParametrosPadraoCemig } from "@/lib/cemig/padraoEngine";

export async function POST(req: Request) {
  try {
    const body: ParametrosPadraoCemig = await req.json();

    if (!body.tipoPadrao || !body.disjuntorAmperes || !body.ladoRede) {
      return NextResponse.json(
        { success: false, error: "Parâmetros obrigatórios: tipoPadrao, disjuntorAmperes, ladoRede" },
        { status: 400 }
      );
    }

    // Carregar preços atuais do banco de dados
    const materiaisDB = await prisma.cemigMaterialPreco.findMany({
      where: { ativo: true }
    });

    const precosMap: Record<string, number> = {};
    materiaisDB.forEach((m) => {
      precosMap[m.codigo] = m.precoUnitario;
    });

    const resultado = dimensionarPadraoCemig(body, precosMap);

    return NextResponse.json({
      success: true,
      resultado,
      totalItensCadastrados: materiaisDB.length
    });
  } catch (error: any) {
    console.error("Erro no dimensionamento CEMIG:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar dimensionamento" },
      { status: 500 }
    );
  }
}
