import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canAccessBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const orcamento = await prisma.orcamentoProjeto.findUnique({
      where: { id },
      include: {
        etapas: {
          orderBy: { ordem: "asc" },
          include: {
            itens: {
              include: { propostas: true }
            }
          }
        },
        fornecedores: {
          include: { fornecedor: true }
        }
      }
    });

    if (!orcamento) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(orcamento);
  } catch (error) {
    console.error("Erro ao carregar orçamento:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { nome, cliente, status, idContaAzul } = await req.json();

    const orcamento = await prisma.orcamentoProjeto.update({
      where: { id },
      data: { nome, cliente, status, idContaAzul },
    });

    return NextResponse.json({ success: true, orcamento });
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.orcamentoProjeto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir orçamento:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
