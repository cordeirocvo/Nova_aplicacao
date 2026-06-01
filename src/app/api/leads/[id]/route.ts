import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingLead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    // Permissões:
    // ADMIN ou canManageCRM podem alterar tudo (inclusive vendedorId).
    // O Vendedor associado pode alterar campos de atendimento (como atendido e observacoes).
    const isManager = session.user.role === "ADMIN" || session.user.canManageCRM;
    const isAssignedSeller = existingLead.vendedorId === session.user.id;

    if (!isManager && !isAssignedSeller) {
      return NextResponse.json({ error: "Não autorizado a alterar este lead" }, { status: 403 });
    }

    const updateData: any = {};

    // Campos restritos a gestores
    if (isManager) {
      if (body.vendedorId !== undefined) {
        updateData.vendedorId = body.vendedorId;
      }
      if (body.status !== undefined) {
        updateData.status = body.status;
      }
      if (body.nome !== undefined) {
        updateData.nome = body.nome;
      }
      if (body.telefone !== undefined) {
        updateData.telefone = body.telefone;
      }
      if (body.email !== undefined) {
        updateData.email = body.email;
      }
    }

    // Campos que o vendedor associado ou gestor podem alterar
    if (body.atendido !== undefined) {
      updateData.atendido = !!body.atendido;
    }
    if (body.observacoes !== undefined) {
      updateData.observacoes = body.observacoes;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        midias: true,
        vendedor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error("Erro ao atualizar lead:", error);
    return NextResponse.json({ error: "Erro interno do servidor", details: error.message }, { status: 500 });
  }
}
