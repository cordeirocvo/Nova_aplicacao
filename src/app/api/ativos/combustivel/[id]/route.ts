import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { litros, precoPorLitro, horimetro, obra, responsavel, observacoes, data } = body;

    const fuelLog = await prisma.registroCombustivel.findUnique({
      where: { id },
      include: { ativo: true }
    });

    if (!fuelLog) {
      return NextResponse.json({ error: "Lançamento de combustível não encontrado." }, { status: 404 });
    }

    const newLitros = parseFloat(String(litros));
    const newPrice = parseFloat(String(precoPorLitro));
    const newCost = newLitros * newPrice;
    const diffCost = newCost - fuelLog.custoTotal;

    const updatedLog = await prisma.registroCombustivel.update({
      where: { id },
      data: {
        litros: newLitros,
        precoPorLitro: newPrice,
        custoTotal: newCost,
        horimetro: horimetro ? parseFloat(String(horimetro)) : null,
        obra,
        responsavel,
        observacoes,
        data: data ? new Date(data) : undefined
      }
    });

    const hor = horimetro ? parseFloat(String(horimetro)) : null;
    await prisma.ativo.update({
      where: { id: fuelLog.ativoId },
      data: {
        horasUso: hor && hor > fuelLog.ativo.horasUso ? hor : undefined,
        ultimoCustoHoras: { increment: diffCost }
      }
    });

    return NextResponse.json(updatedLog);
  } catch (error: any) {
    console.error("Error updating fuel log:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const fuelLog = await prisma.registroCombustivel.findUnique({
      where: { id }
    });

    if (!fuelLog) {
      return NextResponse.json({ error: "Lançamento de combustível não encontrado." }, { status: 404 });
    }

    await prisma.ativo.update({
      where: { id: fuelLog.ativoId },
      data: {
        ultimoCustoHoras: { decrement: fuelLog.custoTotal }
      }
    });

    await prisma.registroCombustivel.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting fuel log:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
