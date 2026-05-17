import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { nome, ordem } = await req.json();

    if (!nome) {
      return NextResponse.json({ error: "Nome da etapa é obrigatório" }, { status: 400 });
    }

    const etapa = await prisma.orcamentoEtapa.create({
      data: {
        projetoId: id,
        nome,
        ordem: ordem || 0,
      },
    });

    return NextResponse.json({ success: true, etapa });
  } catch (error) {
    console.error("Erro ao criar etapa:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
