import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    
    if (!usinaId) {
      return NextResponse.json({ error: "ID da usina é obrigatório" }, { status: 400 });
    }

    const acoes = await prisma.acaoCorretiva.findMany({
      where: { usinaId },
      orderBy: { dataExecucao: "desc" }
    });

    return NextResponse.json(acoes);
  } catch (error: any) {
    console.error("Erro ao obter ações corretivas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usinaId, tipoAcao, dataExecucao, observacoes, executadoPor } = body;

    if (!usinaId || !tipoAcao || !dataExecucao) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes (usinaId, tipoAcao, dataExecucao)" }, { status: 400 });
    }

    const acao = await prisma.acaoCorretiva.create({
      data: {
        usinaId,
        tipoAcao,
        dataExecucao: new Date(dataExecucao),
        observacoes: observacoes || null,
        executadoPor: executadoPor || null
      }
    });

    return NextResponse.json({ success: true, acao });
  } catch (error: any) {
    console.error("Erro ao criar ação corretiva:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório para exclusão" }, { status: 400 });
    }

    await prisma.acaoCorretiva.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Ação corretiva excluída com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir ação corretiva:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
