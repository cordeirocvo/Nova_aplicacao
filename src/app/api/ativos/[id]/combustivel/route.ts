import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { litros, precoPorLitro, horimetro, obra, responsavel, observacoes, data } = body;

    if (!litros || !precoPorLitro || !obra || !responsavel) {
      return NextResponse.json({ error: "Litros, preço por litro, obra e responsável são obrigatórios." }, { status: 400 });
    }

    const asset = await prisma.ativo.findUnique({
      where: { id }
    });

    if (!asset) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    const lts = parseFloat(String(litros));
    const prc = parseFloat(String(precoPorLitro));
    const cost = lts * prc;
    const hor = horimetro ? parseFloat(String(horimetro)) : null;

    const fuelLog = await prisma.registroCombustivel.create({
      data: {
        ativoId: id,
        litros: lts,
        precoPorLitro: prc,
        custoTotal: cost,
        horimetro: hor,
        obra,
        responsavel,
        observacoes: observacoes || null,
        data: data ? new Date(data) : new Date()
      }
    });

    const updatedAsset = await prisma.ativo.update({
      where: { id },
      data: {
        horasUso: hor && hor > asset.horasUso ? hor : asset.horasUso,
        ultimoCustoHoras: asset.ultimoCustoHoras + cost,
        localizacao: obra,
        responsavel: responsavel
      }
    });

    return NextResponse.json({ fuelLog, asset: updatedAsset });
  } catch (error: any) {
    console.error("Error logging fuel consumption:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
