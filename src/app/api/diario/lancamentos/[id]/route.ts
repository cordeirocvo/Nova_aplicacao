import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { descricao, progresso, fotos, audios, statusRevisao, comentariosSupervisor } = body;

    const log = await prisma.rdoLancamento.findUnique({
      where: { id },
      include: {
        atividade: true
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const isSupervisor = (session.user as any).role === "ADMIN";
    const isAssignedExecutor = log.atividade.responsavelId === (session.user as any).id;

    if (!isSupervisor && !isAssignedExecutor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {};

    if (isSupervisor) {
      if (descricao !== undefined) updateData.descricao = descricao;
      if (progresso !== undefined) updateData.progresso = parseFloat(progresso);
      if (fotos !== undefined) updateData.fotos = fotos;
      if (audios !== undefined) updateData.audios = audios;
      if (statusRevisao !== undefined) updateData.statusRevisao = statusRevisao;
      if (comentariosSupervisor !== undefined) updateData.comentariosSupervisor = comentariosSupervisor;
    } else {
      // Executor can only update details of their log entry
      if (descricao !== undefined) updateData.descricao = descricao;
      if (progresso !== undefined) updateData.progresso = parseFloat(progresso);
      if (fotos !== undefined) updateData.fotos = fotos;
      if (audios !== undefined) updateData.audios = audios;
      // Mark it back to PENDENTE on modifications
      updateData.statusRevisao = "PENDENTE";
    }

    const updatedLog = await prisma.rdoLancamento.update({
      where: { id },
      data: updateData,
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        atividade: {
          include: {
            projeto: true
          }
        }
      }
    });

    // If progress was modified, update status of the parent activity accordingly
    if (progresso !== undefined) {
      let newStatus = "EM_ANDAMENTO";
      if (parseFloat(progresso) >= 100) {
        newStatus = "CONCLUIDA";
      }
      await prisma.atividadeDiario.update({
        where: { id: log.atividadeId },
        data: { status: newStatus }
      });
    }

    return NextResponse.json(updatedLog);
  } catch (error: any) {
    console.error("Error updating log:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const log = await prisma.rdoLancamento.findUnique({
      where: { id },
      include: {
        atividade: true
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const isSupervisor = (session.user as any).role === "ADMIN";
    const isAssignedExecutor = log.atividade.responsavelId === (session.user as any).id;

    if (!isSupervisor && !isAssignedExecutor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.rdoLancamento.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting log:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
