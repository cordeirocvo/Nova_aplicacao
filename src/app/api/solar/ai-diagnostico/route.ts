import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SolarAiEngine } from '@/lib/services/solarAiEngine';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get('usinaId') || 'cmp8hqv4400h9wgv5c9f2tdbh'; // Padrão Manga Grande 01
    const dateStr = searchParams.get('date') || '2026-09-04';
    const gerarParecerGemini = searchParams.get('gemini') === 'true';
    const salvarOS = searchParams.get('salvarOS') === 'true';

    // Se o usuário pediu TODAS as usinas
    if (usinaId === 'TODAS') {
      const usinas = await prisma.usina.findMany({
        select: { id: true, nome: true, capacidadeKWp: true },
        orderBy: { nome: 'asc' },
      });

      const diagnosticos = [];
      for (const u of usinas) {
        try {
          const diag = await SolarAiEngine.executarDiagnostico(u.id, dateStr, {
            gerarParecerGemini: false,
          });
          diagnosticos.push(diag);
        } catch (err: any) {
          console.warn(`Erro ao diagnosticar usina ${u.nome}:`, err?.message);
        }
      }

      // Ranking de Benchmark do Portfólio
      const benchmarkRanking = diagnosticos.map((d) => ({
        usinaId: d.usinaId,
        usinaNome: d.usinaNome,
        yieldReal: d.desempenho.yieldRealKWhKWp,
        yieldEsperado: d.desempenho.yieldEsperadoKWhKWp,
        prReal: d.desempenho.performanceRatioReal,
        scoreNormativo: d.complianceNormativo.scoreConformidadePercent,
        perdaRS: d.desempenho.perdaFinanceiraDiariaRS,
        falhasFusivel: d.strings.falhasFusivel,
      })).sort((a, b) => b.prReal - a.prReal);

      return NextResponse.json({
        success: true,
        dataAnalise: dateStr,
        tipo: 'PORTFOLIO_CONSOLIDADO',
        totalUsinas: usinas.length,
        benchmarkRanking,
        diagnosticos,
      });
    }

    // Diagnóstico detalhado de uma usina específica
    const diagnostico = await SolarAiEngine.executarDiagnostico(usinaId, dateStr, {
      gerarParecerGemini,
    });

    // Se solicitado para persistir ou sincronizar Ordens de Serviço
    if (salvarOS && diagnostico.ordensServicoSugeridas.length > 0) {
      for (const os of diagnostico.ordensServicoSugeridas) {
        // Verificar se já existe O.S. aberta para este mesmo alvo
        const existeAberta = await prisma.ordemServicoIA.findFirst({
          where: {
            usinaId,
            titulo: os.titulo,
            status: { in: ['PENDENTE', 'EM_ATENDIMENTO'] },
          },
        });

        if (!existeAberta) {
          await prisma.ordemServicoIA.create({
            data: {
              usinaId,
              titulo: os.titulo,
              descricao: os.descricao,
              tipoAlvo: os.tipoAlvo,
              localizacaoFisica: os.localizacaoFisica,
              gravidade: os.gravidade,
              impactoFinanceiroDia: os.impactoFinanceiroDia,
              perdaPotenciaKW: os.perdaPotenciaKW,
              normaReferencia: os.normaReferencia,
              pecaSugerida: os.pecaSugerida,
              procedimentoSeguranca: os.procedimentoSeguranca,
              status: 'PENDENTE',
            },
          });
        }
      }
    }

    // Gravar auditorias normativas na tabela NormaConformidade
    try {
      for (const a of diagnostico.complianceNormativo.auditorias) {
        await prisma.normaConformidade.create({
          data: {
            usinaId,
            norma: a.norma,
            itemNorma: a.itemNorma,
            parametroAvaliado: a.parametroAvaliado,
            valorMedido: a.valorMedido,
            valorLimite: a.valorLimite,
            unidade: a.unidade,
            statusConformidade: a.statusConformidade,
            detalhes: a.detalhes,
            acaoCorretiva: a.acaoCorretiva,
          },
        });
      }
    } catch (e: any) {
      // Log não bloqueante se houver duplicatas de auditoria
    }

    return NextResponse.json({
      success: true,
      dataAnalise: dateStr,
      diagnostico,
    });
  } catch (error: any) {
    console.error('Erro na API AI Diagnóstico:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no diagnóstico por IA' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usinaId, date, gemini, salvarOS } = body;
    if (!usinaId) {
      return NextResponse.json({ error: 'usinaId é obrigatório' }, { status: 400 });
    }

    const diagnostico = await SolarAiEngine.executarDiagnostico(usinaId, date || '2026-09-04', {
      gerarParecerGemini: Boolean(gemini),
    });

    if (salvarOS && diagnostico.ordensServicoSugeridas.length > 0) {
      for (const os of diagnostico.ordensServicoSugeridas) {
        const existeAberta = await prisma.ordemServicoIA.findFirst({
          where: {
            usinaId,
            titulo: os.titulo,
            status: { in: ['PENDENTE', 'EM_ATENDIMENTO'] },
          },
        });

        if (!existeAberta) {
          await prisma.ordemServicoIA.create({
            data: {
              usinaId,
              titulo: os.titulo,
              descricao: os.descricao,
              tipoAlvo: os.tipoAlvo,
              localizacaoFisica: os.localizacaoFisica,
              gravidade: os.gravidade,
              impactoFinanceiroDia: os.impactoFinanceiroDia,
              perdaPotenciaKW: os.perdaPotenciaKW,
              normaReferencia: os.normaReferencia,
              pecaSugerida: os.pecaSugerida,
              procedimentoSeguranca: os.procedimentoSeguranca,
              status: 'PENDENTE',
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      diagnostico,
    });
  } catch (error: any) {
    console.error('Erro no POST AI Diagnostico:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar diagnóstico' },
      { status: 500 }
    );
  }
}
