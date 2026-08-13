import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { horasTrabalhadas, horimetroInicio, horimetroFim, obra, responsavel, observacoes, dataUso, fotoHorimetroInicioUrl, fotoHorimetroFimUrl } = body;

    const usageLog = await prisma.historicoUsoAtivo.findUnique({
      where: { id },
      include: { ativo: true }
    });

    if (!usageLog) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    const newHours = parseFloat(String(horasTrabalhadas));
    const rate = usageLog.ativo.taxaHoraria || 0;
    const newCost = newHours * rate;
    const diffHours = newHours - usageLog.horasTrabalhadas;
    const diffCost = newCost - usageLog.custoCalculado;

    const updatedLog = await prisma.historicoUsoAtivo.update({
      where: { id },
      data: {
        horasTrabalhadas: newHours,
        horimetroInicio: horimetroInicio ? parseFloat(String(horimetroInicio)) : null,
        horimetroFim: horimetroFim ? parseFloat(String(horimetroFim)) : null,
        custoCalculado: newCost,
        obra,
        responsavel,
        observacoes,
        dataUso: dataUso ? new Date(dataUso) : undefined,
        fotoHorimetroInicioUrl,
        fotoHorimetroFimUrl
      }
    });

    await prisma.ativo.update({
      where: { id: usageLog.ativoId },
      data: {
        horasUso: { increment: diffHours },
        ultimoCustoHoras: { increment: diffCost }
      }
    });

    return NextResponse.json(updatedLog);
  } catch (error: any) {
    console.error("Error updating usage log:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const usageLog = await prisma.historicoUsoAtivo.findUnique({
      where: { id }
    });

    if (!usageLog) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    await prisma.ativo.update({
      where: { id: usageLog.ativoId },
      data: {
        horasUso: { decrement: usageLog.horasTrabalhadas },
        ultimoCustoHoras: { decrement: usageLog.custoCalculado }
      }
    });

    await prisma.historicoUsoAtivo.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting usage log:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
