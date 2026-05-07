import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    
    if (!usinaId) return NextResponse.json({ error: "usinaId required" }, { status: 400 });

    const manutencoes = await prisma.manutencaoUsina.findMany({
      where: { usinaId },
      include: { equipamento: true },
      orderBy: { dataAgendada: "asc" },
    });
    return NextResponse.json(manutencoes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const manutencao = await prisma.manutencaoUsina.create({
      data: {
        usinaId: data.usinaId,
        equipamentoId: data.equipamentoId || null,
        tipo: data.tipo,
        dataAgendada: new Date(data.dataAgendada),
        descricao: data.descricao,
        responsavel: data.responsavel,
      },
    });
    return NextResponse.json(manutencao);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const updateData: any = {
      tipo: data.tipo,
      dataAgendada: data.dataAgendada ? new Date(data.dataAgendada) : undefined,
      status: data.status,
      descricao: data.descricao,
      responsavel: data.responsavel,
      pecasTrocadas: data.pecasTrocadas,
      tempoInicio: data.tempoInicio ? new Date(data.tempoInicio) : undefined,
      tempoFim: data.tempoFim ? new Date(data.tempoFim) : undefined,
    };

    const custo = data.custoMateriais !== undefined ? parseFloat(data.custoMateriais) : undefined;
    updateData.custoMateriais = isNaN(custo as any) ? 0 : custo;

    const custoMao = data.custoMaoDeObra !== undefined ? parseFloat(data.custoMaoDeObra) : undefined;
    if (custoMao !== undefined) {
      updateData.custoMaoDeObra = isNaN(custoMao as any) ? 0 : custoMao;
    }

    if (data.status === "Concluida" && !data.dataRealizada) {
      updateData.dataRealizada = new Date();
    } else if (data.dataRealizada) {
      updateData.dataRealizada = new Date(data.dataRealizada);
    }

    if (data.fotosUrls) updateData.fotosUrls = data.fotosUrls;
    if (data.fotosDetalhes) updateData.fotosDetalhes = data.fotosDetalhes;
    if (data.documentosUrls) updateData.documentosUrls = data.documentosUrls;

    const manutencao = await prisma.manutencaoUsina.update({
      where: { id: data.id },
      data: updateData,
    });
    return NextResponse.json(manutencao);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.manutencaoUsina.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
