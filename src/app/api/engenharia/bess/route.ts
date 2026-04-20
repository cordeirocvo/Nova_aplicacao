import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const projetoId = req.nextUrl.searchParams.get('projetoId');
  if (!projetoId) return NextResponse.json({ error: 'projetoId obrigatório' }, { status: 400 });

  try {
    const estudo = await prisma.estudoBESS.findUnique({
      where: { projetoId },
      include: {
        projeto: {
          include: {
            analiseFatura: true,
            analiseMassa: { orderBy: { createdAt: "desc" }, take: 1 },
            estudoSolar: true,
          }
        }
      }
    });

    if (!estudo) {
      // Se não existe, busca apenas os dados base do projeto para iniciar novo estudo
      const base = await prisma.engeProjeto.findUnique({
        where: { id: projetoId },
        include: {
          analiseFatura: true,
          analiseMassa: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      });
      return NextResponse.json({ base });
    }

    return NextResponse.json({ estudo });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projetoId, ...data } = body;

  try {
    const estudo = await prisma.estudoBESS.upsert({
      where: { projetoId },
      update: data,
      create: { projetoId, ...data },
    });
    return NextResponse.json(estudo);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
