import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { razaoSocial, contatoNome, contatoEmail, contatoTelefone } = body;

    if (!razaoSocial || !razaoSocial.trim()) {
      return NextResponse.json(
        { success: false, error: "Razão Social é obrigatória" },
        { status: 400 }
      );
    }

    const fornecedor = await prisma.fornecedor.update({
      where: { id },
      data: {
        razaoSocial: razaoSocial.trim(),
        contatoNome: contatoNome !== undefined ? (contatoNome?.trim() || null) : undefined,
        contatoEmail: contatoEmail !== undefined ? (contatoEmail?.trim() || null) : undefined,
        contatoTelefone: contatoTelefone !== undefined ? (contatoTelefone?.trim() || null) : undefined
      }
    });

    return NextResponse.json({ success: true, fornecedor });
  } catch (error: any) {
    console.error("Erro ao atualizar fornecedor:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao atualizar fornecedor" },
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

    await prisma.fornecedor.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir fornecedor:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao excluir fornecedor" },
      { status: 500 }
    );
  }
}
