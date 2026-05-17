import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canAccessBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orcamentos = await prisma.orcamentoProjeto.findMany({
      include: {
        _count: {
          select: { etapas: true, fornecedores: true }
        }
      },
      orderBy: { dataAtualizacao: "desc" },
    });

    return NextResponse.json(orcamentos);
  } catch (error) {
    console.error("Erro ao listar orçamentos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { nome, cliente, status, idContaAzul } = await req.json();

    if (!nome) {
      return NextResponse.json({ error: "Nome do projeto é obrigatório" }, { status: 400 });
    }

    const orcamento = await prisma.orcamentoProjeto.create({
      data: {
        nome,
        cliente,
        status: status || "Planejamento",
        idContaAzul,
      },
    });

    return NextResponse.json({ success: true, id: orcamento.id });
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
