import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get('usinaId');
    const status = searchParams.get('status');
    const gravidade = searchParams.get('gravidade');

    const where: any = {};
    if (usinaId && usinaId !== 'TODAS') {
      where.usinaId = usinaId;
    }
    if (status && status !== 'TODOS') {
      where.status = status;
    }
    if (gravidade && gravidade !== 'TODAS') {
      where.gravidade = gravidade;
    }

    const ordens = await prisma.ordemServicoIA.findMany({
      where,
      include: {
        usina: {
          select: { id: true, nome: true, capacidadeKWp: true },
        },
      },
      orderBy: [
        { gravidade: 'asc' }, // Prioriza CRITICA e ALTA
        { createdAt: 'desc' },
      ],
    });

    const totalPendentes = ordens.filter((o) => o.status === 'PENDENTE').length;
    const totalEmAtendimento = ordens.filter((o) => o.status === 'EM_ATENDIMENTO').length;
    const totalConcluidas = ordens.filter((o) => o.status === 'CONCLUIDA').length;
    const perdaFinanceiraTotalDia = ordens
      .filter((o) => o.status === 'PENDENTE' || o.status === 'EM_ATENDIMENTO')
      .reduce((acc, o) => acc + (o.impactoFinanceiroDia || 0), 0);

    return NextResponse.json({
      success: true,
      totais: {
        total: ordens.length,
        pendentes: totalPendentes,
        emAtendimento: totalEmAtendimento,
        concluidas: totalConcluidas,
        perdaFinanceiraTotalDia: parseFloat(perdaFinanceiraTotalDia.toFixed(2)),
      },
      ordens,
    });
  } catch (error: any) {
    console.error('Erro ao listar O.S. de IA:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao carregar Ordens de Serviço' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, responsavelCampo, observacoesCampo, fotos, validarTelemetria } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da O.S. é obrigatório' }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (responsavelCampo !== undefined) updateData.responsavelCampo = responsavelCampo;
    if (observacoesCampo !== undefined) updateData.observacoesCampo = observacoesCampo;
    if (fotos && Array.isArray(fotos)) updateData.fotos = fotos;

    if (status === 'CONCLUIDA') {
      updateData.resolvidaEm = new Date();
      if (validarTelemetria) {
        updateData.validadoPorTelemetria = true;
      }
    }

    const osAtualizada = await prisma.ordemServicoIA.update({
      where: { id },
      data: updateData,
      include: {
        usina: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json({
      success: true,
      ordem: osAtualizada,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar O.S.:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar Ordem de Serviço' }, { status: 500 });
  }
}
