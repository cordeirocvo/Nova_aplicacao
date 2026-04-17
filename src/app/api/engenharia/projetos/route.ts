import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const projetos = await prisma.engeProjeto.findMany({
    include: {
      analiseFatura: { select: { concessionaria: true, consumoMedioMensalKWh: true, grupoTarifario: true, subgrupo: true } },
      analiseMassa: { select: { maxDemandaTotal: true, processado: true }, take: 1, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(projetos);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, cliente, tipo } = body;
    if (!nome || !tipo) return NextResponse.json({ error: 'nome e tipo são obrigatórios' }, { status: 400 });

    const projeto = await prisma.engeProjeto.create({
      data: { nome, cliente: cliente || null, tipo },
    });
    return NextResponse.json(projeto, { status: 201 });
  } catch (error: any) {
    console.error("ERRO AO CRIAR PROJETO:", error);
    try {
      require('fs').appendFileSync('scratch/server_error.log', `[${new Date().toISOString()}] POST ERROR: ${error?.message}\n${error?.stack}\n\n`);
    } catch(e) {}
    return NextResponse.json({ error: error?.message || "Erro desconhecido", stack: error?.stack }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const projeto = await prisma.engeProjeto.update({ where: { id }, data });
  return NextResponse.json(projeto);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.engeProjeto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
