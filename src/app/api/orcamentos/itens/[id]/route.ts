import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { codigo, descricao, tipo, unidade, quantidade, precoBaseUnitario } = body;

    if (!descricao || !tipo || !unidade || quantidade === undefined) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const item = await prisma.orcamentoItem.update({
      where: { id },
      data: {
        codigo: codigo || null,
        descricao,
        tipo,
        unidade,
        quantidade: Number(quantidade),
        precoBaseUnitario: precoBaseUnitario !== undefined && precoBaseUnitario !== null ? Number(precoBaseUnitario) : null
      }
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Error updating budget item:", error);
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
    await prisma.orcamentoItem.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
