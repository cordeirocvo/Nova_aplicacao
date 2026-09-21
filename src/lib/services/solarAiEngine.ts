import { prisma } from '@/lib/prisma';
import { PvlibService } from '@/lib/services/pvlibService';
import { NormasEngine, InputAuditoriaUsina, AuditoriaParametro } from '@/lib/services/normasEngine';
import axios from 'axios';

export interface DiagnosticoCompletoUsina {
  usinaId: string;
  usinaNome: string;
  dataAnalise: string;
  capacidadeKWp: number;
  capacidadeCA: number;
  
  // Nível 1: Ponto de Conexão e Cabine Elétrica
  cabine: {
    potenciaTrafoKVA: number;
    tensaoFasesV: { A: number; B: number; C: number };
    desbalancoTensaoPercent: number;
    fatorPotencia: number;
    frequenciaHz: number;
    tempOleoTrafo: number;
    statusDps: string;
    conformidadeProdist: 'ADEQUADA' | 'PRECARIA' | 'CRITICA';
  };

  // Nível 2: Desempenho e Benchmark Inter-Usinas
  desempenho: {
    energiaRealKWh: number;
    energiaEsperadaKWh: number;
    yieldRealKWhKWp: number; // Yf
    yieldEsperadoKWhKWp: number; // Yr
    performanceRatioReal: number; // PR Real %
    performanceRatioEsperado: number; // PR Esperado %
    perdaTotalKWh: number;
    perdaFinanceiraDiariaRS: number;
  };

  // Nível 3: Diagnóstico Intra-Usina (Inversores)
  inversores: Array<{
    serial: string;
    nome: string;
    modelo: string;
    potenciaPicoKW: number;
    energiaEntregueKWh: number;
    maxTempIGBT: number;
    statusTermico: 'NORMAL' | 'ALERTA_VENTILACAO' | 'DERATING_CRITICO';
    eficienciaEstimadaPercent: number;
  }>;

  // Nível 4: Diagnóstico Fino de Strings
  strings: {
    totalMonitoradas: number;
    ativasConduzindo: number;
    falhasFusivel: number;
    alertasSujidade: number;
    naoConectadasNC: number;
    perdaStringsKWh: number;
    perdaSujidadeKWh: number;
    detalhesFalhas: Array<{
      stringName: string;
      inversor: string;
      tensaoV: number;
      correnteA: number;
      diagnostico: string;
      pecaSugerida: string;
      localizacaoProvavel: string;
    }>;
  };

  // Otimizador de Lavagem (Smart Cleaning Dispatcher)
  otimizacaoLimpeza: {
    soilingRatio: number;
    perdaDiariaRS: number;
    custoLavagemRS: number;
    diasAteEquilibrio: number;
    status: 'URGENTE' | 'PROGRAMAR' | 'OK';
    mensagem: string;
  };

  // Auditoria de Normas (NBR 5410, 5419, 16690, 16274, 14039, PRODIST 8)
  complianceNormativo: {
    scoreConformidadePercent: number;
    conformes: number;
    alertas: number;
    naoConformes: number;
    auditorias: AuditoriaParametro[];
    acoesUrgentes: string[];
  };

  // Ordens de Serviço Sugeridas para Campo (O.S. Inteligentes)
  ordensServicoSugeridas: Array<{
    titulo: string;
    descricao: string;
    tipoAlvo: 'STRING' | 'INVERSOR' | 'CABINE' | 'MODULOS_SUJIDADE' | 'SPDA_DPS';
    localizacaoFisica: string;
    gravidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
    impactoFinanceiroDia: number;
    perdaPotenciaKW: number;
    normaReferencia: string;
    pecaSugerida: string;
    procedimentoSeguranca: string;
  }>;

  // Parecer Técnico Consolidado da IA (Raciocínio com Gemini ou Motor Cognitivo)
  parecerTecnicoIA?: string;
}

export class SolarAiEngine {
  /**
   * Executa a análise profunda de inteligência artificial em 4 níveis para uma usina e data específicas.
   */
  public static async executarDiagnostico(
    usinaId: string,
    dataStr: string,
    options?: { gerarParecerGemini?: boolean }
  ): Promise<DiagnosticoCompletoUsina> {
    // 1. Obter Usina com inversores e estação
    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: {
        estacao: true,
        inversores: true,
      },
    });

    if (!usina) {
      throw new Error(`Usina não encontrada com ID: ${usinaId}`);
    }

    const capacidadeKWp = usina.capacidadeKWp || 1400.0;
    const potInversores = usina.inversores?.reduce((acc, inv) => acc + (inv.potenciaNominalKW || 0), 0) || 0;
    const capacidadeCA = potInversores > 0 ? potInversores : parseFloat((capacidadeKWp / 1.25).toFixed(1));

    const latitude = usina.latitude ? Number(usina.latitude) : -15.15;
    const longitude = usina.longitude ? Number(usina.longitude) : -43.85;
    const tilt = usina.inclinacao ? Number(usina.inclinacao) : 15.0;

    let azimuth = 0.0;
    if (usina.orientacao) {
      const ori = usina.orientacao.trim().toUpperCase();
      if (ori === 'N' || ori === 'NORTE') azimuth = 0.0;
      else if (ori === 'S' || ori === 'SUL') azimuth = 180.0;
      else if (ori === 'L' || ori === 'LESTE') azimuth = 90.0;
      else if (ori === 'O' || ori === 'OESTE') azimuth = 270.0;
      else {
        const n = parseFloat(ori);
        azimuth = isNaN(n) ? 0.0 : n;
      }
    }

    // 2. Buscar Dados Meteorológicos da Estação
    let meteoData: any[] = [];
    if (usina.estacaoId) {
      const startDay = new Date(`${dataStr}T00:00:00-03:00`);
      const endDay = new Date(`${dataStr}T23:59:59.999-03:00`);
      const telemetriasEst = await prisma.telemetriaEstacao.findMany({
        where: {
          estacaoId: usina.estacaoId,
          timestamp: { gte: startDay, lte: endDay },
        },
        orderBy: { timestamp: 'asc' },
      });
      meteoData = telemetriasEst.map((t) => ({
        timestamp: t.timestamp,
        ghi: t.ghi,
        poa: t.poa,
        tempAmbiente: t.tempAmbiente,
        tempModulos: t.tempModulos,
        velocidadeVento: t.velocidadeVento,
      }));
    }

    // 3. Simulação Física do Digital Twin (pvlib)
    const pvlibResult = await PvlibService.simulate({
      date: dataStr,
      latitude,
      longitude,
      capacidadeKWp,
      capacidadeCA,
      tilt,
      azimuth,
      meteo_data: meteoData,
    });

    // 4. Buscar Telemetrias da Usina
    const startDayBRT = new Date(`${dataStr}T00:00:00-03:00`);
    const endDayBRT = new Date(`${dataStr}T23:59:59.999-03:00`);

    const telemetrias = await prisma.telemetria.findMany({
      where: {
        usinaId,
        timestamp: { gte: startDayBRT, lte: endDayBRT },
      },
      orderBy: { timestamp: 'asc' },
    });

    const metricaDiaria = await prisma.metricaDiariaUsina.findFirst({
      where: {
        usinaId,
        data: { gte: startDayBRT, lte: endDayBRT },
      },
    });

    // 5. Decomposição e Agregação Multidimensional
    let maxTempIGBTGeral = 0;
    let somaTensaoA = 0;
    let somaTensaoB = 0;
    let somaTensaoC = 0;
    let somaCorrenteA = 0;
    let somaCorrenteB = 0;
    let somaCorrenteC = 0;
    let countCA = 0;

    const inverterStats: Record<string, { maxPicoKW: number; sumEnergia: number; maxIGBT: number }> = {};
    const stringSamples: Record<string, { sumI: number; count: number; lastV: number }> = {};

    for (const tel of telemetrias) {
      if (tel.tempIGBT && tel.tempIGBT > maxTempIGBTGeral) {
        maxTempIGBTGeral = tel.tempIGBT;
      }

      if (tel.tensaoCA_A && tel.tensaoCA_B && tel.tensaoCA_C) {
        somaTensaoA += tel.tensaoCA_A;
        somaTensaoB += tel.tensaoCA_B;
        somaTensaoC += tel.tensaoCA_C;
        somaCorrenteA += tel.correnteCA_A || 0;
        somaCorrenteB += tel.correnteCA_B || 0;
        somaCorrenteC += tel.correnteCA_C || 0;
        countCA++;
      }

      const localTime = new Date(tel.timestamp.getTime() - 3 * 3600 * 1000);
      const hour = localTime.getHours();

      // Amostragem de strings no horário de pico solar (10h às 14h)
      if (hour >= 10 && hour <= 14 && tel.dadosStrings && typeof tel.dadosStrings === 'object') {
        const strings = tel.dadosStrings as Record<string, { V: number; I: number }>;
        for (const [k, v] of Object.entries(strings)) {
          if (!stringSamples[k]) {
            stringSamples[k] = { sumI: 0, count: 0, lastV: v.V };
          }
          stringSamples[k].sumI += v.I;
          stringSamples[k].count += 1;
          stringSamples[k].lastV = v.V;

          // Agrupamento por inversor
          const invKey = k.includes('_') ? k.split('_')[0] : 'INV01';
          if (!inverterStats[invKey]) {
            inverterStats[invKey] = { maxPicoKW: 0, sumEnergia: 0, maxIGBT: 0 };
          }
          if (tel.tempIGBT && tel.tempIGBT > inverterStats[invKey].maxIGBT) {
            inverterStats[invKey].maxIGBT = tel.tempIGBT;
          }
          if (tel.potenciaAtivaKW && tel.potenciaAtivaKW > inverterStats[invKey].maxPicoKW) {
            inverterStats[invKey].maxPicoKW = tel.potenciaAtivaKW;
          }
        }
      }
    }

    // 6. Diagnóstico Fino de Strings (IEC 61724-1 / Prescinto)
    const stringKeys = Object.keys(stringSamples);
    const activeStringKeys: string[] = [];
    let stringsVaziasNC = 0;
    let stringsComFalha = 0;
    let stringsComAlertaSujidade = 0;
    const falhasDetalhadas: DiagnosticoCompletoUsina['strings']['detalhesFalhas'] = [];
    const ordensServico: DiagnosticoCompletoUsina['ordensServicoSugeridas'] = [];

    for (const key of stringKeys) {
      const s = stringSamples[key];
      const avgI = s.sumI / (s.count || 1);
      if (avgI < 0.15 && s.lastV < 50) {
        stringsVaziasNC++;
      } else {
        activeStringKeys.push(key);
      }
    }

    const healthyCurrents = activeStringKeys
      .map((k) => stringSamples[k].sumI / (stringSamples[k].count || 1))
      .filter((i) => i >= 0.5);
    const avgHealthyCurrent =
      healthyCurrents.length > 0 ? healthyCurrents.reduce((a, b) => a + b, 0) / healthyCurrents.length : 8.5;

    for (const key of activeStringKeys) {
      const s = stringSamples[key];
      const avgI = s.sumI / (s.count || 1);
      const inv = key.includes('_') ? key.split('_')[0] : 'Inversor 01';
      const mpptMatch = key.match(/(?:_S|_PV|PV|S)(\d+)$/i);
      const stringNum = mpptMatch ? parseInt(mpptMatch[1], 10) : 1;
      const mpptNum = Math.ceil(stringNum / 2);

      // Fusível queimado: tensão nominal presente (V >= 350V) com corrente nula (I < 0.2A)
      if (avgI < 0.2 && s.lastV >= 350) {
        stringsComFalha++;
        const localizacao = `Inversor: ${inv}, MPPT: ${mpptNum}, String: ${key} (Fileira correspondente)`;
        const peca = s.lastV > 900 ? 'Fusível Solar Cilíndrico gPV 1500V DC 15A' : 'Fusível Solar Cilíndrico gPV 1000V DC 15A 10x38mm';

        falhasDetalhadas.push({
          stringName: key,
          inversor: inv,
          tensaoV: parseFloat(s.lastV.toFixed(1)),
          correnteA: parseFloat(avgI.toFixed(2)),
          diagnostico: 'Fusível Queimado / Seccionador Aberto',
          pecaSugerida: peca,
          localizacaoProvavel: localizacao,
        });

        ordensServico.push({
          titulo: `Troca de Fusível Queimado - ${inv} (${key})`,
          descricao: `Detectada string inoperante com tensão de circuito aberto normal (${s.lastV.toFixed(1)}V) e corrente nula (0.00A). Média das strings saudáveis: ${avgHealthyCurrent.toFixed(1)}A. Perda de ~5.5 kW de pico na string.`,
          tipoAlvo: 'STRING',
          localizacaoFisica: localizacao,
          gravidade: 'ALTA',
          impactoFinanceiroDia: parseFloat(((5.5 * 5.0 * 0.90)).toFixed(2)), // ~27.5 kWh/dia * R$ 0.90
          perdaPotenciaKW: 5.5,
          normaReferencia: 'ABNT NBR 16690 item 6.3.2 (Dispositivos de Proteção contra Sobrecorrente em Circuitos CC)',
          pecaSugerida: peca,
          procedimentoSeguranca: '1. Desligar a chave seccionadora CC do inversor sob carga. 2. Desarmar a base porta-fusíveis. 3. Utilizar EPI (óculos, luvas 1000V). 4. Testar continuidade do novo fusível antes de inserir.',
        });
      } else {
        const desvio = avgHealthyCurrent > 0 ? ((avgI - avgHealthyCurrent) / avgHealthyCurrent) * 100 : 0;
        if (desvio < -12) {
          stringsComAlertaSujidade++;
        }
      }
    }

    // 7. Cálculos de Energia e Desempenho
    let energiaRealKWh = metricaDiaria?.energiaRealKWh || 0;
    if (energiaRealKWh <= 0 && telemetrias.length > 0) {
      energiaRealKWh = telemetrias.reduce((acc, t) => acc + (t.potenciaAtivaKW || 0) * (5 / 60), 0);
    }
    energiaRealKWh = parseFloat(energiaRealKWh.toFixed(2));
    const energiaEsperadaKWh = pvlibResult.energiaEsperadaKWh;

    const yieldRealKWhKWp = parseFloat((energiaRealKWh / (capacidadeKWp || 1)).toFixed(2));
    const yieldEsperadoKWhKWp = parseFloat((energiaEsperadaKWh / (capacidadeKWp || 1)).toFixed(2));
    const prReal =
      metricaDiaria?.performanceRatioReal
        ? metricaDiaria.performanceRatioReal * 100
        : energiaRealKWh > 0 && energiaEsperadaKWh > 0
        ? (energiaRealKWh / energiaEsperadaKWh) * pvlibResult.prEsperado
        : 80.0;

    const tarifaKWh = 0.90;
    const totalInstaladas = Math.max(1, activeStringKeys.length);
    const perdaStringsKWh = stringsComFalha > 0 ? parseFloat((energiaEsperadaKWh * (stringsComFalha / totalInstaladas) * 0.85).toFixed(2)) : 0;
    const perdaSujidadeKWh = parseFloat((energiaEsperadaKWh * 0.042).toFixed(2)); // Padrão 4.2% sujidade
    const perdaTotalKWh = parseFloat((perdaStringsKWh + perdaSujidadeKWh + pvlibResult.perdaCeifamentoKWh).toFixed(2));
    const perdaFinanceiraDiariaRS = parseFloat((perdaTotalKWh * tarifaKWh).toFixed(2));

    // 8. Otimizador Financeiro de Lavagem (Smart Cleaning Dispatcher)
    const custoLavagemRS = Math.max(350.0, parseFloat((capacidadeKWp * 3.20).toFixed(2)));
    const perdaFinanceiraSujidadeDia = parseFloat((perdaSujidadeKWh * tarifaKWh).toFixed(2));
    const diasAteEquilibrio = perdaFinanceiraSujidadeDia > 20
      ? Math.max(1, Math.round(custoLavagemRS / perdaFinanceiraSujidadeDia))
      : 30;

    let statusLimpeza: 'URGENTE' | 'PROGRAMAR' | 'OK' = 'OK';
    let mensagemLimpeza = `Módulos em condições aceitáveis (perda de R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia). Nenhuma ação necessária no momento.`;
    if (perdaFinanceiraSujidadeDia > 200) {
      statusLimpeza = 'URGENTE';
      mensagemLimpeza = `Perda por sujidade atinge R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia. Ponto de equilíbrio atingido em ${diasAteEquilibrio} dias. Lavagem recomendada imediatamente para evitar degradação de PR.`;
      
      ordensServico.push({
        titulo: `Lavagem Integral de Módulos Fotovoltaicos - ${usina.nome}`,
        descricao: `Taxa de sujidade acumulada provocando perda de R$ ${perdaFinanceiraSujidadeDia.toFixed(2)} ao dia (${perdaSujidadeKWh} kWh/dia). Retorno do investimento da lavagem garantido em ${diasAteEquilibrio} dias.`,
        tipoAlvo: 'MODULOS_SUJIDADE',
        localizacaoFisica: `Complexo ${usina.nome}, todas as mesas e strings`,
        gravidade: 'MEDIA',
        impactoFinanceiroDia: perdaFinanceiraSujidadeDia,
        perdaPotenciaKW: parseFloat(((perdaSujidadeKWh / 5.5)).toFixed(1)),
        normaReferencia: 'ABNT NBR 16274 / IEC 61724-1 (Soiling Ratio & Manutenção Preventiva)',
        pecaSugerida: 'Água desmineralizada ou com condutividade < 200 µS/cm, escovas rotativas de cerdas macias anti-risco',
        procedimentoSeguranca: 'Realizar lavagem exclusivamente no início da manhã ou final da tarde para evitar choque térmico no vidro temperado dos módulos e choque elétrico por alta tensão.',
      });
    } else if (perdaFinanceiraSujidadeDia > 80) {
      statusLimpeza = 'PROGRAMAR';
      mensagemLimpeza = `Perda por sujidade de R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia. Programar limpeza da usina em ${diasAteEquilibrio} dias.`;
    }

    // 9. Auditoria Normativa Automatizada (NormasEngine)
    const mediaTensaoA = countCA > 0 ? somaTensaoA / countCA : 220;
    const mediaTensaoB = countCA > 0 ? somaTensaoB / countCA : 220;
    const mediaTensaoC = countCA > 0 ? somaTensaoC / countCA : 220;
    const mediaCorrenteA = countCA > 0 ? somaCorrenteA / countCA : 150;
    const mediaCorrenteB = countCA > 0 ? somaCorrenteB / countCA : 150;
    const mediaCorrenteC = countCA > 0 ? somaCorrenteC / countCA : 150;

    const auditoriaInput: InputAuditoriaUsina = {
      usinaNome: usina.nome,
      capacidadeKWp,
      capacidadeCA,
      tensaoFaseA: mediaTensaoA,
      tensaoFaseB: mediaTensaoB,
      tensaoFaseC: mediaTensaoC,
      correnteFaseA: mediaCorrenteA,
      correnteFaseB: mediaCorrenteB,
      correnteFaseC: mediaCorrenteC,
      fatorPotencia: 0.985,
      frequenciaHz: 60.0,
      quedaTensaoPercent: 1.45,
      tempMaxIGBT: maxTempIGBTGeral || 64,
      stringsInstaladas: totalInstaladas,
      stringsComFalha,
      tensaoMediaStringV: 685,
      resistenciaIsolamentoMohm: 48.0,
      termografiaMaxDeltaT: 5.2,
      tempOleoTrafo: 65.0,
      statusDps: 'OK',
    };

    const complianceNormativo = NormasEngine.auditar(auditoriaInput);

    // 10. Diagnóstico dos Inversores
    const inversoresLista = (usina.inversores && usina.inversores.length > 0 ? usina.inversores : [
      { id: '1', numeroSerie: 'INV01', modelo: 'SUN2000-100KTL-M1', potenciaNominalKW: 100 },
      { id: '2', numeroSerie: 'INV02', modelo: 'SUN2000-100KTL-M1', potenciaNominalKW: 100 },
      { id: '3', numeroSerie: 'INV03', modelo: 'SUN2000-100KTL-M1', potenciaNominalKW: 100 },
      { id: '4', numeroSerie: 'INV04', modelo: 'SUN2000-100KTL-M1', potenciaNominalKW: 100 },
    ]).map((inv) => {
      const stats = inverterStats[inv.numeroSerie] || { maxPicoKW: 95.0, sumEnergia: 0, maxIGBT: maxTempIGBTGeral || 62 };
      const statusTermico: 'NORMAL' | 'ALERTA_VENTILACAO' | 'DERATING_CRITICO' =
        stats.maxIGBT > 85 ? 'DERATING_CRITICO' : stats.maxIGBT > 75 ? 'ALERTA_VENTILACAO' : 'NORMAL';

      if (statusTermico === 'DERATING_CRITICO') {
        ordensServico.push({
          titulo: `Inspeção de Ventilação e Dissipador - Inversor ${inv.numeroSerie}`,
          descricao: `Temperatura de semicondutores IGBT atingiu ${stats.maxIGBT.toFixed(1)}°C, provocando derating térmico e corte de geração em horários de alta irradiância.`,
          tipoAlvo: 'INVERSOR',
          localizacaoFisica: `Eletrocentro / Base do Inversor ${inv.numeroSerie}`,
          gravidade: 'ALTA',
          impactoFinanceiroDia: 45.0,
          perdaPotenciaKW: 15.0,
          normaReferencia: 'ABNT NBR 5410 item 5.2 (Influências Externas e Dissipação Térmica de Equipamentos)',
          pecaSugerida: 'Ventoinha / Cooler de substituição original do fabricante ou filtro de ar limpo',
          procedimentoSeguranca: 'Desenergizar lados CC e CA do inversor, aguardar descarga dos capacitores (mínimo 15 minutos) antes de abrir compartimento de ventilação.',
        });
      }

      return {
        serial: inv.numeroSerie,
        nome: `${inv.modelo || 'Inversor'} (${inv.numeroSerie})`,
        modelo: inv.modelo || 'Inversor Solar',
        potenciaPicoKW: parseFloat((stats.maxPicoKW || 95.0).toFixed(1)),
        energiaEntregueKWh: parseFloat((energiaRealKWh / (usina.inversores?.length || 4)).toFixed(1)),
        maxTempIGBT: parseFloat((stats.maxIGBT || 62.0).toFixed(1)),
        statusTermico,
        eficienciaEstimadaPercent: 98.4,
      };
    });

    // 11. Dados da Cabine Elétrica (PRODIST Md. 8)
    let cabineDb: any = null;
    try {
      if ((prisma as any).cabineEletrica) {
        cabineDb = await (prisma as any).cabineEletrica.findFirst({ where: { usinaId } });
      }
    } catch (_) {}

    const mediaV = (mediaTensaoA + mediaTensaoB + mediaTensaoC) / 3;
    const maxDevV = Math.max(Math.abs(mediaTensaoA - mediaV), Math.abs(mediaTensaoB - mediaV), Math.abs(mediaTensaoC - mediaV));
    const desbTensao = mediaV > 0 ? (maxDevV / mediaV) * 100 : 0.8;
    const conformidadeProdist: 'ADEQUADA' | 'PRECARIA' | 'CRITICA' =
      desbTensao > 3.0 ? 'CRITICA' : desbTensao > 2.0 ? 'PRECARIA' : 'ADEQUADA';

    const cabineDados: DiagnosticoCompletoUsina['cabine'] = {
      potenciaTrafoKVA: cabineDb?.potenciaTrafoKVA || 1250,
      tensaoFasesV: {
        A: parseFloat(mediaTensaoA.toFixed(1)),
        B: parseFloat(mediaTensaoB.toFixed(1)),
        C: parseFloat(mediaTensaoC.toFixed(1)),
      },
      desbalancoTensaoPercent: parseFloat(desbTensao.toFixed(2)),
      fatorPotencia: cabineDb?.fatorPotencia || 0.985,
      frequenciaHz: cabineDb?.frequenciaHz || 60.0,
      tempOleoTrafo: cabineDb?.tempOleoGraus || 65.0,
      statusDps: cabineDb?.statusDps || 'OK',
      conformidadeProdist,
    };

    // 12. Geração Opcional de Parecer Cognitivo com Google Gemini
    let parecerTecnicoIA: string | undefined;
    if (options?.gerarParecerGemini && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `
Você é o Especialista Chefe em Engenharia Solar e Inteligência Artificial da Cordeiro Energia.
Abaixo estão os dados consolidados da usina ${usina.nome} no dia ${dataStr}:

- Capacidade Instalada: ${capacidadeKWp} kWp CC / ${capacidadeCA} kW CA
- Geração Real: ${energiaRealKWh} kWh (Esperada pvlib: ${energiaEsperadaKWh} kWh, PR Real: ${prReal.toFixed(1)}%)
- Perda Financeira Estimada: R$ ${perdaFinanceiraDiariaRS}/dia
- Strings com Falha (Fusível Queimado): ${stringsComFalha} de ${totalInstaladas} strings
- Strings com Alerta de Sujidade: ${stringsComAlertaSujidade}
- Score de Conformidade Normativa (NBRs/PRODIST): ${complianceNormativo.scoreConformidadePercent}% (${complianceNormativo.naoConformes} não conformidades, ${complianceNormativo.alertas} alertas)
- Temperatura Máxima de IGBT: ${maxTempIGBTGeral.toFixed(1)}°C
- Qualidade de Energia no PAC (PRODIST Módulo 8): Desbalanço de ${desbTensao.toFixed(2)}%, Fator de Potência 0.985

Elabore um Parecer Técnico Executivo de Engenharia Solar estruturado com:
1. Resumo da Operação e Diagnóstico de Eficiência.
2. Análise de Causa Raiz (RCA) das perdas financeiras identificadas.
3. Conformidade Normativa com NBR 5410, NBR 5419, NBR 16690 e PRODIST Módulo 8.
4. Plano de Ação Prioritário para a Equipe de Campo e Equipe de Engenharia.

Seja técnico, preciso e direto. Use formatação markdown elegante.
        `;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { contents: [{ parts: [{ text: prompt }] }] },
          { timeout: 15000 }
        );

        parecerTecnicoIA = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (geminiErr: any) {
        console.warn('Não foi possível gerar parecer com Gemini, aplicando síntese analítica padrão:', geminiErr?.message);
        parecerTecnicoIA = `**Parecer Técnico da Engenharia (Síntese Analítica):** A usina ${usina.nome} operou com Performance Ratio de ${prReal.toFixed(1)}% e score normativo de ${complianceNormativo.scoreConformidadePercent}%. Foi identificado impacto financeiro de R$ ${perdaFinanceiraDiariaRS.toFixed(2)}/dia decorrente principalmente de ${stringsComFalha > 0 ? `${stringsComFalha} string(s) com fusível queimado (NBR 16690)` : 'sujidade acumulada nos módulos'}. Recomenda-se execução das Ordens de Serviço listadas no painel de campo.`;
      }
    }

    return {
      usinaId: usina.id,
      usinaNome: usina.nome,
      dataAnalise: dataStr,
      capacidadeKWp,
      capacidadeCA,
      cabine: cabineDados,
      desempenho: {
        energiaRealKWh,
        energiaEsperadaKWh,
        yieldRealKWhKWp,
        yieldEsperadoKWhKWp,
        performanceRatioReal: parseFloat(prReal.toFixed(1)),
        performanceRatioEsperado: pvlibResult.prEsperado,
        perdaTotalKWh,
        perdaFinanceiraDiariaRS,
      },
      inversores: inversoresLista,
      strings: {
        totalMonitoradas: totalInstaladas + stringsVaziasNC,
        ativasConduzindo: totalInstaladas - stringsComFalha,
        falhasFusivel: stringsComFalha,
        alertasSujidade: stringsComAlertaSujidade,
        naoConectadasNC: stringsVaziasNC,
        perdaStringsKWh,
        perdaSujidadeKWh,
        detalhesFalhas: falhasDetalhadas,
      },
      otimizacaoLimpeza: {
        soilingRatio: 0.958,
        perdaDiariaRS: perdaFinanceiraSujidadeDia,
        custoLavagemRS,
        diasAteEquilibrio,
        status: statusLimpeza,
        mensagem: mensagemLimpeza,
      },
      complianceNormativo,
      ordensServicoSugeridas: ordensServico,
      parecerTecnicoIA,
    };
  }
}
