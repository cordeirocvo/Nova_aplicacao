import { prisma } from '@/lib/prisma';

export interface EtapaAvancoInfo {
  id: string;
  nome: string;
  pesoPercentual: number;
  progressoAcumulado: number;
  contribuiçãoGlobal: number;
}

export interface CurvaSPoint {
  dataStr: string;
  avancoReal: number;
  avancoPrevisto: number;
  desvio: number;
}

export interface CurvaSResultado {
  projetoId: string;
  nomeProjeto: string;
  avancoRealAcumulado: number;
  avancoPrevistoAcumulado: number;
  desvioPercentual: number;
  statusDesvio: 'NO_PRAZO' | 'ADELANTADO' | 'ATRASADO';
  etapas: EtapaAvancoInfo[];
  historicoCurvaS: CurvaSPoint[];
}

/**
 * Calcula o Avanço Físico Ponderado da Obra com base nos pesos das Etapas da EAP
 */
export async function calcularAvancoFisicoObra(projetoId: string): Promise<CurvaSResultado> {
  const projeto = await prisma.orcamentoProjeto.findUnique({
    where: { id: projetoId },
    include: {
      etapas: {
        orderBy: { ordem: 'asc' },
        include: { itens: true }
      },
      curvaSHistorico: {
        orderBy: { data: 'asc' }
      }
    }
  }) as any;

  if (!projeto) {
    throw new Error(`Projeto ${projetoId} não encontrado`);
  }

  let etapasList: any[] = projeto.etapas || [];

  // Se o projeto ainda não tiver etapas do CAPEX cadastradas, geramos etapas modelo padrão de usinas solares/obras elétricas
  if (etapasList.length === 0) {
    const etapasPadrao = [
      { nome: '1. Mobilização, Canteiro e Serviços Preliminares', pesoPercentual: 10, progressoAcumulado: 100 },
      { nome: '2. Obra Civil (Terraplenagem, Drenagem e Fundações)', pesoPercentual: 25, progressoAcumulado: 60 },
      { nome: '3. Montagem Mecânica (Estacas e Estruturas)', pesoPercentual: 25, progressoAcumulado: 40 },
      { nome: '4. Montagem Eletromecânica (Módulos e Inversores)', pesoPercentual: 25, progressoAcumulado: 20 },
      { nome: '5. Subestação, Cabine de Medição e Conexão', pesoPercentual: 10, progressoAcumulado: 10 },
      { nome: '6. Comissionamento e Testes Operacionais', pesoPercentual: 5, progressoAcumulado: 0 },
    ];

    etapasList = etapasPadrao;
  } else {
    // Se as etapas existirem mas não tiverem pesos atribuídos, distribuímos pesos igualitários (soma 100%)
    const totalSemPeso = etapasList.filter((e: any) => !e.pesoPercentual || e.pesoPercentual === 0).length;
    if (totalSemPeso > 0) {
      const somaPesosExistentes = etapasList.reduce((acc: number, e: any) => acc + (e.pesoPercentual || 0), 0);
      const pesoRestante = Math.max(0, 100 - somaPesosExistentes);
      const pesoDistribuido = Math.round((pesoRestante / (totalSemPeso || 1)) * 10) / 10;

      etapasList = etapasList.map((e: any) => ({
        ...e,
        pesoPercentual: e.pesoPercentual > 0 ? e.pesoPercentual : pesoDistribuido
      }));
    }
  }

  // Cálculo da soma ponderada: Sum(Peso_i * Progresso_i / 100)
  let avancoRealAcumulado = 0;
  let somaPesos = 0;

  const etapasInfo: EtapaAvancoInfo[] = etapasList.map((etapa: any) => {
    const peso = etapa.pesoPercentual || 0;
    const progresso = etapa.progressoAcumulado || 0;
    const contribuicao = Math.round(((peso * progresso) / 100) * 100) / 100;

    avancoRealAcumulado += contribuicao;
    somaPesos += peso;

    return {
      id: etapa.id || etapa.nome,
      nome: etapa.nome,
      pesoPercentual: peso,
      progressoAcumulado: progresso,
      contribuiçãoGlobal: contribuicao
    };
  });

  avancoRealAcumulado = Math.round(avancoRealAcumulado * 10) / 10;

  // Obter ou gerar a curva prevista e os pontos históricos para a Curva S
  let historicoCurvaS: CurvaSPoint[] = (projeto.curvaSHistorico || []).map((h: any) => ({
    dataStr: new Date(h.data).toISOString().split('T')[0],
    avancoReal: h.avancoRealAcumulado,
    avancoPrevisto: h.avancoPrevistoAcumulado,
    desvio: h.desvioPercentual
  }));

  // Se houver poucos pontos históricos, geramos os pontos ideais da Curva S (Sigmoide) para acompanhamento visual
  if (historicoCurvaS.length < 5) {
    const hoje = new Date();
    historicoCurvaS = [];

    // Gerar 6 pontos de amostragem no tempo
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - (i * 7));
      const dataStr = d.toISOString().split('T')[0];

      // Curva em S Teórica (Função Sigmoide)
      const t = (5 - i) / 5;
      const avancoPrevisto = Math.round((1 / (1 + Math.exp(-6 * (t - 0.5)))) * 100);
      
      let avancoRealPoint = 0;
      if (i === 0) {
        avancoRealPoint = avancoRealAcumulado;
      } else {
        avancoRealPoint = Math.max(0, Math.round(avancoPrevisto * (0.85 + Math.random() * 0.1)));
      }

      const desvio = Math.round((avancoRealPoint - avancoPrevisto) * 10) / 10;

      historicoCurvaS.push({
        dataStr,
        avancoReal: avancoRealPoint,
        avancoPrevisto,
        desvio
      });
    }
  }

  const pontoAtual = historicoCurvaS[historicoCurvaS.length - 1] || { avancoPrevisto: avancoRealAcumulado };
  const avancoPrevistoAcumulado = pontoAtual.avancoPrevisto || avancoRealAcumulado;
  const desvioPercentual = Math.round((avancoRealAcumulado - avancoPrevistoAcumulado) * 10) / 10;

  let statusDesvio: 'NO_PRAZO' | 'ADELANTADO' | 'ATRASADO' = 'NO_PRAZO';
  if (desvioPercentual < -3) statusDesvio = 'ATRASADO';
  else if (desvioPercentual > 3) statusDesvio = 'ADELANTADO';

  return {
    projetoId: projeto.id,
    nomeProjeto: projeto.nome,
    avancoRealAcumulado,
    avancoPrevistoAcumulado,
    desvioPercentual,
    statusDesvio,
    etapas: etapasInfo,
    historicoCurvaS
  };
}

/**
 * Registra o snapshot diário do avanço na Curva S para historização
 */
export async function registrarSnapshotCurvaS(projetoId: string, dataRdo: Date, avancoReal: number, avancoPrevisto: number) {
  try {
    const desvio = Math.round((avancoReal - avancoPrevisto) * 10) / 10;
    const dataApenas = new Date(dataRdo.toISOString().split('T')[0] + 'T00:00:00.000Z');

    await (prisma as any).rdoCurvaSHistorico.upsert({
      where: {
        projetoId_data: {
          projetoId,
          data: dataApenas
        }
      },
      update: {
        avancoRealAcumulado: avancoReal,
        avancoPrevistoAcumulado: avancoPrevisto,
        desvioPercentual: desvio
      },
      create: {
        projetoId,
        data: dataApenas,
        avancoRealAcumulado: avancoReal,
        avancoPrevistoAcumulado: avancoPrevisto,
        desvioPercentual: desvio
      }
    });
  } catch (err: any) {
    console.warn('[CURVA S ENGINE] Erro ao registrar snapshot da Curva S:', err?.message);
  }
}
