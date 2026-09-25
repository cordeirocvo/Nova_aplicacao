import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { descricao, categoria, unidade, precoUnitario, observacao, ativo } = body;

    const data: any = {};
    if (descricao !== undefined) data.descricao = descricao;
    if (categoria !== undefined) data.categoria = categoria;
    if (unidade !== undefined) data.unidade = unidade;
    if (precoUnitario !== undefined) data.precoUnitario = Number(precoUnitario);
    if (observacao !== undefined) data.observacao = observacao;
    if (ativo !== undefined) data.ativo = Boolean(ativo);

    const material = await prisma.cemigMaterialPreco.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("Erro ao atualizar material CEMIG:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar material" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Em vez de hard delete que pode violar FK, marcar como inativo
    const material = await prisma.cemigMaterialPreco.update({
      where: { id },
      data: { ativo: false }
    });

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("Erro ao desativar material CEMIG:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir material" },
      { status: 500 }
    );
  }
}
