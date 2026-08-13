import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { projetoId, descricao, responsavelId, status, dataInicio, dataFim } = body;

    const activity = await prisma.atividadeDiario.findUnique({
      where: { id }
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const isSupervisor = (session.user as any).role === "ADMIN";
    const isAssignedExecutor = activity.responsavelId === (session.user as any).id;

    if (!isSupervisor && !isAssignedExecutor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (isSupervisor) {
      if (projetoId !== undefined) updateData.projetoId = projetoId;
      if (descricao !== undefined) updateData.descricao = descricao;
      if (responsavelId !== undefined) updateData.responsavelId = responsavelId;
      if (status !== undefined) updateData.status = status;
      if (dataInicio !== undefined) updateData.dataInicio = dataInicio ? new Date(dataInicio) : null;
      if (dataFim !== undefined) updateData.dataFim = dataFim ? new Date(dataFim) : null;
    } else {
      // Executor can only update the status of their task
      if (status !== undefined) updateData.status = status;
    }

    const updatedActivity = await prisma.atividadeDiario.update({
      where: { id },
      data: updateData,
      include: {
        projeto: true,
        responsavel: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(updatedActivity);
  } catch (error: any) {
    console.error("Error updating activity:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSupervisor = (session.user as any).role === "ADMIN";
    if (!isSupervisor) {
      return NextResponse.json({ error: "Forbidden: Supervisors only" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.atividadeDiario.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting activity:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
