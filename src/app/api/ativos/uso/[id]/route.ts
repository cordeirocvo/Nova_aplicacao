import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { horimetroInicio, horimetroFim, horasTrabalhadas, custoCalculado, dataUso, obra, responsavel, observacoes } = body;

    const updated = await prisma.historicoUsoAtivo.update({
      where: { id },
      data: {
        horimetroInicio: horimetroInicio !== undefined ? parseFloat(horimetroInicio) : undefined,
        horimetroFim: horimetroFim !== undefined ? parseFloat(horimetroFim) : undefined,
        horasTrabalhadas: horasTrabalhadas !== undefined ? parseFloat(horasTrabalhadas) : undefined,
        custoCalculado: custoCalculado !== undefined ? parseFloat(custoCalculado) : undefined,
        dataUso: dataUso ? new Date(dataUso + "T12:00:00Z") : undefined,
        obra: obra || undefined,
        responsavel: responsavel || undefined,
        observacoes: observacoes || undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("[PUT USO ATIVO ERROR]", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.historicoUsoAtivo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[DELETE USO ATIVO ERROR]", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

