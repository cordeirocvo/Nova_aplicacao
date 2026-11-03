import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createLeadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email().optional().or(z.literal('')),
  empresa: z.string().optional(),
  tipo: z.string().optional().default('DESCONTO_CONTA'),
  endereco: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional().nullable(),
  longitude: z.union([z.number(), z.string()]).optional().nullable(),
  observacoes: z.string().optional(),
  midias: z.array(z.any()).optional().default([])
});

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { role, canManageCRM, id: userId } = session.user;
    const isAuthorized = canManageCRM || role === 'ADMIN' || role === 'VENDEDOR';
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const whereClause: Record<string, any> = {};
    if (role === 'VENDEDOR') {
      whereClause.vendedorId = userId;
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        midias: true,
        vendedor: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('Erro ao listar leads:', error);
    return NextResponse.json({ error: 'Erro interno ao consultar leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada. Faça login novamente.' }, { status: 401 });
    }

    const rawBody = await req.json();
    const validation = createLeadSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;
    const vendedorId = session.user.id;

    const parsedLat = data.latitude ? parseFloat(String(data.latitude)) : null;
    const parsedLon = data.longitude ? parseFloat(String(data.longitude)) : null;

    const midiasCreate = (data.midias || [])
      .filter((m: any) => m && (m.url || m.arquivoUrl))
      .map((m: any) => ({
        arquivoUrl: m.url || m.arquivoUrl,
        tipo: m.tipo || 'OUTRO'
      }));

    const lead = await (prisma.lead as any).create({
      data: {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email || null,
        empresa: data.empresa || null,
        tipo: data.tipo,
        endereco: data.endereco || null,
        latitude: parsedLat,
        longitude: parsedLon,
        observacoes: data.observacoes || null,
        vendedorId,
        midias: { create: midiasCreate }
      },
      include: { midias: true }
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar lead:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar lead', details: error.message }, { status: 500 });
  }
}
