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
    const tipos = await prisma.orcamentoTipoMaterial.findMany({
      orderBy: { nome: "asc" }
    });
    return NextResponse.json(tipos);
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
    const { nome, bdiDefault } = await req.json();
    if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const tipo = await prisma.orcamentoTipoMaterial.create({ 
      data: { 
        nome,
        bdiDefault: bdiDefault ? Number(bdiDefault) : 0
      } 
    });
    return NextResponse.json({ success: true, tipo });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Tipo já existe" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
