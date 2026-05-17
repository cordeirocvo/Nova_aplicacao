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
    const itens = await prisma.orcamentoItemPadrao.findMany({
      orderBy: { descricao: "asc" }
    });
    return NextResponse.json(itens);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { codigo, descricao, tipo, unidade, precoBaseUnitario } = await req.json();
    if (!descricao || !tipo || !unidade) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const item = await prisma.orcamentoItemPadrao.create({
      data: {
        codigo,
        descricao,
        tipo,
        unidade,
        precoBaseUnitario: precoBaseUnitario ? Number(precoBaseUnitario) : null
      }
    });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
