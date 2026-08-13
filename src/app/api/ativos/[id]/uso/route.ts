import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { horasTrabalhadas, horimetroInicio, horimetroFim, obra, responsavel, observacoes, dataUso, fotoHorimetroInicioUrl, fotoHorimetroFimUrl } = body;

    if (!horasTrabalhadas || !obra || !responsavel) {
      return NextResponse.json({ error: "Horas trabalhadas, obra e responsável são obrigatórios." }, { status: 400 });
    }

    const asset = await prisma.ativo.findUnique({
      where: { id }
    });

    if (!asset) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    const hours = parseFloat(String(horasTrabalhadas));
    const rate = asset.taxaHoraria || 0;
    const cost = hours * rate;

    const usageLog = await prisma.historicoUsoAtivo.create({
      data: {
        ativoId: id,
        horasTrabalhadas: hours,
        horimetroInicio: horimetroInicio ? parseFloat(String(horimetroInicio)) : null,
        horimetroFim: horimetroFim ? parseFloat(String(horimetroFim)) : null,
        custoCalculado: cost,
        obra,
        responsavel,
        observacoes: observacoes || null,
        dataUso: dataUso ? new Date(dataUso) : new Date(),
        fotoHorimetroInicioUrl: fotoHorimetroInicioUrl || null,
        fotoHorimetroFimUrl: fotoHorimetroFimUrl || null
      }
    });

    const updatedAsset = await prisma.ativo.update({
      where: { id },
      data: {
        horasUso: asset.horasUso + hours,
        ultimoCustoHoras: asset.ultimoCustoHoras + cost,
        localizacao: obra,
        responsavel: responsavel
      }
    });

    return NextResponse.json({ usageLog, asset: updatedAsset });
  } catch (error: any) {
    console.error("Error logging asset usage:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
