import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tipo, percentual } = await req.json();

    if (!tipo || percentual === undefined || isNaN(Number(percentual))) {
      return NextResponse.json({ error: "Parâmetros de reajuste inválidos" }, { status: 400 });
    }

    const multiplier = 1 + Number(percentual) / 100;

    // Se o tipo for "todos", reajusta todos os itens padrão
    const whereClause = tipo === "todos" ? {} : { tipo };

    // Buscar todos os itens que serão atualizados
    const itens = await prisma.orcamentoItemPadrao.findMany({
      where: whereClause
    });

    // Atualização em lote (como o prisma updateMany não aceita operações matemáticas diretas no Postgres, 
    // rodamos um raw query ou uma transação de atualizações individuais para garantir precisão e integridade)
    const updates = itens.map(item => {
      const currentPrice = item.precoBaseUnitario || 0;
      const newPrice = parseFloat((currentPrice * multiplier).toFixed(2));
      return prisma.orcamentoItemPadrao.update({
        where: { id: item.id },
        data: { precoBaseUnitario: newPrice }
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({ 
      success: true, 
      count: itens.length, 
      message: `Reajuste de ${percentual}% aplicado a ${itens.length} itens.` 
    });
  } catch (error: any) {
    console.error("Erro ao aplicar reajuste em lote:", error);
    return NextResponse.json({ error: "Internal Server Error ao reajustar itens" }, { status: 500 });
  }
}
