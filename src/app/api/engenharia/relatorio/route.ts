import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const projetoId = req.nextUrl.searchParams.get('projetoId');
  if (!projetoId) return NextResponse.json({ error: 'projetoId obrigatório' }, { status: 400 });

  try {
    const projeto = await prisma.engeProjeto.findUnique({
      where: { id: projetoId },
      include: {
        analiseFatura: true,
        analiseMassa: { orderBy: { createdAt: 'desc' }, take: 1 },
        estudoBESS: true,
        estudoSolar: true,
      }
    });

    if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });

    // Buscar detalhes dos equipamentos se existirem IDs
    let bateria = null, modulo = null, inversorBESS = null, inversorSolar = null;

    if (projeto.estudoBESS?.bateriaId) {
      bateria = await prisma.bateriaSistema.findUnique({ where: { id: projeto.estudoBESS.bateriaId } });
    }
    if (projeto.estudoBESS?.inversorId) {
      inversorBESS = await prisma.inversorSolar.findUnique({ where: { id: projeto.estudoBESS.inversorId } });
    }
    if (projeto.estudoSolar?.moduloId) {
      modulo = await prisma.moduloFotovoltaico.findUnique({ where: { id: projeto.estudoSolar.moduloId } });
    }
    if (projeto.estudoSolar?.inversorId) {
      inversorSolar = await prisma.inversorSolar.findUnique({ where: { id: projeto.estudoSolar.inversorId } });
    }

    return NextResponse.json({
      projeto,
      equipamentos: {
        bateria,
        modulo,
        inversorBESS,
        inversorSolar
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
