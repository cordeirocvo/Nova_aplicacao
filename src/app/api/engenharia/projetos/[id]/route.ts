import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
    }

    const projeto = await prisma.engeProjeto.findUnique({
      where: { id },
      include: {
        analiseFatura: true,
        analiseMassa: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!projeto) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(projeto);
  } catch (error: any) {
    console.error("ERRO AO BUSCAR PROJETO:", error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
