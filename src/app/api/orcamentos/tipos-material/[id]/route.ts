import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.orcamentoTipoMaterial.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { nome, bdiDefault } = await req.json();
    const data: any = {};
    if (nome !== undefined) data.nome = nome;
    if (bdiDefault !== undefined) data.bdiDefault = Number(bdiDefault);

    const tipo = await prisma.orcamentoTipoMaterial.update({
      where: { id: params.id },
      data
    });
    return NextResponse.json({ success: true, tipo });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
