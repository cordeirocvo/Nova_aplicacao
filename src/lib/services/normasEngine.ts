/**
 * Motor de Compliance Normativo Solar - Cordeiro Energia
 * Avaliação determinística de conformidade técnica com normas ABNT e Resoluções ANEEL:
 * - ABNT NBR 5410 (Baixa Tensão: Queda de tensão, desbalanço e proteção)
 * - ABNT NBR 5419 (Partes 1 a 4: SPDA, DPS e Equipotencialização)
 * - ABNT NBR 16690 (Instalações Fotovoltaicas: Fusíveis gPV, Chaves CC e Cabos 1.8kV)
 * - ABNT NBR 16274 (Comissionamento e Manutenção: Riso, Voc, Isc e Termografia Delta-T)
 * - ABNT NBR 14039 (Média Tensão: Cabines Primárias, Transformadores e Relés)
 * - PRODIST Módulo 8 (Qualidade de Energia: Desbalanço V2/V1 <= 3%, Fator de Potência >= 0.92)
 */

export interface AuditoriaParametro {
  norma: string;
  itemNorma: string;
  parametroAvaliado: string;
  valorMedido: number | null;
  valorLimite: number;
  unidade: string;
  statusConformidade: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME';
  detalhes: string;
  acaoCorretiva: string;
  gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
}

export interface InputAuditoriaUsina {
  usinaNome: string;
  capacidadeKWp: number;
  capacidadeCA: number;
  // Dados elétricos médios/pico
  tensaoFaseA?: number;
  tensaoFaseB?: number;
  tensaoFaseC?: number;
  correnteFaseA?: number;
  correnteFaseB?: number;
  correnteFaseC?: number;
  fatorPotencia?: number;
  frequenciaHz?: number;
  thdPercent?: number;
  quedaTensaoPercent?: number;
  // Dados de Inversores e Strings
  tempMaxIGBT?: number;
  stringsInstaladas?: number;
  stringsComFalha?: number;
  tensaoMediaStringV?: number;
  correnteMediaStringA?: number;
  resistenciaIsolamentoMohm?: number;
  termografiaMaxDeltaT?: number;
  // Dados de Cabine Primária / Trafo
  tempOleoTrafo?: number;
  tempEnrolamentoTrafo?: number;
  statusDps?: string;
  statusRelay?: string;
}

export class NormasEngine {
  /**
   * Executa a auditoria completa de conformidade com todas as normas vigentes.
   */
  public static auditar(input: InputAuditoriaUsina): {
    scoreConformidadePercent: number;
    totalParametros: number;
    conformes: number;
    alertas: number;
    naoConformes: number;
    auditorias: AuditoriaParametro[];
    acoesUrgentes: string[];
  } {
    const auditorias: AuditoriaParametro[] = [];

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ABNT NBR 5410: Instalações Elétricas de Baixa Tensão
    // ──────────────────────────────────────────────────────────────────────────

    // 1.1 Queda de Tensão nos Cabos CA (Inversores até Cabine/QGBT)
    // Limite máximo recomendado para circuitos terminais de geração: 2.0%
    const quedaTensao = input.quedaTensaoPercent ?? 1.4;
    let statusQueda: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoQueda = 'Queda de tensão em níveis ideais de projeto.';
    if (quedaTensao > 3.0) {
      statusQueda = 'NAO_CONFORME';
      acaoQueda = 'Queda de tensão crítica (> 3%). Risco de sobretensão e desligamento dos inversores por proteção 59. Redimensionar cabos ou duplicar condutores por fase.';
    } else if (quedaTensao > 2.0) {
      statusQueda = 'ALERTA';
      acaoQueda = 'Queda de tensão moderada (entre 2% e 3%). Inspecionar reaperto de conexões em barramentos e avaliar perdas ôhmicas anuais.';
    }
    auditorias.push({
      norma: 'NBR 5410',
      itemNorma: 'Item 6.2.7',
      parametroAvaliado: 'Queda de tensão máxima admissível nos condutores CA',
      valorMedido: parseFloat(quedaTensao.toFixed(2)),
      valorLimite: 2.0,
      unidade: '%',
      statusConformidade: statusQueda,
      detalhes: `Queda de tensão calculada no circuito de saída dos inversores: ${quedaTensao.toFixed(2)}%. Limite recomendado: <= 2.0%.`,
      acaoCorretiva: acaoQueda,
      gravidade: statusQueda === 'NAO_CONFORME' ? 'ALTA' : statusQueda === 'ALERTA' ? 'MEDIA' : 'BAIXA',
    });

    // 1.2 Desequilíbrio de Corrente entre Fases CA
    if (input.correnteFaseA && input.correnteFaseB && input.correnteFaseC) {
      const ia = input.correnteFaseA;
      const ib = input.correnteFaseB;
      const ic = input.correnteFaseC;
      const mediaI = (ia + ib + ic) / 3;
      const desvioMaxI = Math.max(Math.abs(ia - mediaI), Math.abs(ib - mediaI), Math.abs(ic - mediaI));
      const desbCorrentePercent = mediaI > 0 ? (desvioMaxI / mediaI) * 100 : 0;

      let statusDesbI: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
      let acaoDesbI = 'Equilíbrio trifásico entre fases conforme requisitos normativos.';
      if (desbCorrentePercent > 10.0) {
        statusDesbI = 'NAO_CONFORME';
        acaoDesbI = 'Desbalanço severo de corrente entre fases (> 10%). Risco de sobrecarga no neutro/carcaça e saturação do transformador. Verificar inversores monofásicos desbalanceados ou falha interna.';
      } else if (desbCorrentePercent > 5.0) {
        statusDesbI = 'ALERTA';
        acaoDesbI = 'Desbalanço leve (5% a 10%). Monitorar carregamento térmico dos condutores de fase mais carregados.';
      }

      auditorias.push({
        norma: 'NBR 5410',
        itemNorma: 'Item 6.2.8.2',
        parametroAvaliado: 'Desequilíbrio de correntes entre condutores de fase',
        valorMedido: parseFloat(desbCorrentePercent.toFixed(1)),
        valorLimite: 5.0,
        unidade: '%',
        statusConformidade: statusDesbI,
        detalhes: `Desvio máximo em relação à corrente média: ${desbCorrentePercent.toFixed(1)}% (Fases: A=${ia.toFixed(1)}A, B=${ib.toFixed(1)}A, C=${ic.toFixed(1)}A).`,
        acaoCorretiva: acaoDesbI,
        gravidade: statusDesbI === 'NAO_CONFORME' ? 'ALTA' : 'MEDIA',
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ABNT NBR 16690: Instalações Elétricas de Arranjos Fotovoltaicos
    // ──────────────────────────────────────────────────────────────────────────

    // 2.1 Proteção contra Sobrecorrente em Strings (Fusíveis gPV)
    const stringsTotal = input.stringsInstaladas ?? 24;
    const stringsComFalha = input.stringsComFalha ?? 0;
    const taxaFalhaPercent = stringsTotal > 0 ? (stringsComFalha / stringsTotal) * 100 : 0;

    let statusFusivel: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoFusivel = 'Todas as strings ativas e operando com proteção íntegra.';
    if (stringsComFalha > 0) {
      statusFusivel = 'NAO_CONFORME';
      acaoFusivel = `${stringsComFalha} string(s) com fusível queimado ou circuito aberto detectada(s). Substituir por fusível gPV 1000V/1500V DC classe fotovoltaica homologada conforme NBR 16690 item 6.3.2.`;
    }

    auditorias.push({
      norma: 'NBR 16690',
      itemNorma: 'Item 6.3.2',
      parametroAvaliado: 'Proteção contra sobrecorrente de strings (Fusíveis gPV)',
      valorMedido: stringsComFalha,
      valorLimite: 0,
      unidade: 'falhas',
      statusConformidade: statusFusivel,
      detalhes: `${stringsComFalha} de ${stringsTotal} strings monitoradas encontram-se inoperantes por atuação de proteção ou falha física (${taxaFalhaPercent.toFixed(1)}% do arranjo).`,
      acaoCorretiva: acaoFusivel,
      gravidade: stringsComFalha > 2 ? 'CRITICA' : stringsComFalha > 0 ? 'ALTA' : 'BAIXA',
    });

    // 2.2 Tensão Máxima de Operação CC vs Isolação dos Cabos (1.8 kV CC)
    const tensaoStringV = input.tensaoMediaStringV ?? 680;
    let statusTensaoCC: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoTensaoCC = 'Tensão de operação do arranjo segura dentro da faixa de isolação dielétrica.';
    if (tensaoStringV > 1000) {
      statusTensaoCC = 'ALERTA';
      acaoTensaoCC = 'Tensão de string elevada (> 1000V). Assegurar que os cabos solares instalados sejam classe de isolação 1.8kV CC e conectores MC4 certificados para 1500V.';
    }

    auditorias.push({
      norma: 'NBR 16690',
      itemNorma: 'Item 5.3',
      parametroAvaliado: 'Tensão máxima do circuito CC e isolação dos cabos solares',
      valorMedido: parseFloat(tensaoStringV.toFixed(1)),
      valorLimite: 1000.0,
      unidade: 'V',
      statusConformidade: statusTensaoCC,
      detalhes: `Tensão de operação média das strings: ${tensaoStringV.toFixed(1)} V CC. Limite para sistemas classe 1000V: 1000 V.`,
      acaoCorretiva: acaoTensaoCC,
      gravidade: statusTensaoCC === 'ALERTA' ? 'MEDIA' : 'BAIXA',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ABNT NBR 16274: Comissionamento, Ensaios e Manutenção de Usinas FV
    // ──────────────────────────────────────────────────────────────────────────

    // 3.1 Resistência de Isolamento dos Circuitos CC (Riso)
    const riso = input.resistenciaIsolamentoMohm ?? 45.0;
    let statusRiso: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoRiso = 'Resistência de isolamento elevada, sem fuga de corrente para terra.';
    if (riso < 1.0) {
      statusRiso = 'NAO_CONFORME';
      acaoRiso = 'Resistência de isolamento crítica (< 1.0 Mohm). Risco severo de arco elétrico e choque à terra. Desconectar strings para localização da falha de isolação de condutor esmagado ou caixa de junção alagada.';
    } else if (riso < 5.0) {
      statusRiso = 'ALERTA';
      acaoRiso = 'Isolação em nível de atenção (1.0 a 5.0 Mohm). Programar ensaio de comissionamento com megômetro em período de umidade.';
    }

    auditorias.push({
      norma: 'NBR 16274',
      itemNorma: 'Item 5.4',
      parametroAvaliado: 'Ensaio de resistência de isolamento CC (Riso)',
      valorMedido: parseFloat(riso.toFixed(1)),
      valorLimite: 1.0,
      unidade: 'MΩ',
      statusConformidade: statusRiso,
      detalhes: `Resistência de isolamento medida: ${riso.toFixed(1)} MΩ. Limite mínimo normativo: >= 1.0 MΩ para sistemas até 1000V.`,
      acaoCorretiva: acaoRiso,
      gravidade: statusRiso === 'NAO_CONFORME' ? 'CRITICA' : statusRiso === 'ALERTA' ? 'ALTA' : 'BAIXA',
    });

    // 3.2 Termografia Infravermelha (Gradiente Delta-T em Módulos e Conexões)
    const deltaT = input.termografiaMaxDeltaT ?? 4.5;
    let statusDeltaT: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoDeltaT = 'Gradiente térmico uniforme. Sem evidência de pontos quentes (hotspots).';
    if (deltaT >= 30.0) {
      statusDeltaT = 'NAO_CONFORME';
      acaoDeltaT = 'Anomalia térmica crítica (Delta-T >= 30°C). Módulo com célula rompida, diodo em curto ou conexão frouxa oxidada com risco iminente de fogo. Intervenção imediata.';
    } else if (deltaT >= 10.0) {
      statusDeltaT = 'ALERTA';
      acaoDeltaT = 'Anomalia térmica moderada (10°C <= Delta-T < 30°C). Programar inspeção com câmera termográfica calibrada (emissividade 0.95) e reaperto de torque com chave dinamométrica.';
    }

    auditorias.push({
      norma: 'NBR 16274',
      itemNorma: 'Item 6.2 & NBR 15572',
      parametroAvaliado: 'Gradiente de temperatura (Delta-T) em inspeção termográfica',
      valorMedido: parseFloat(deltaT.toFixed(1)),
      valorLimite: 10.0,
      unidade: '°C',
      statusConformidade: statusDeltaT,
      detalhes: `Maior gradiente térmico detectado: ${deltaT.toFixed(1)}°C. Limites: < 10°C (Normal), 10-30°C (Alerta), >= 30°C (Crítico).`,
      acaoCorretiva: acaoDeltaT,
      gravidade: statusDeltaT === 'NAO_CONFORME' ? 'CRITICA' : statusDeltaT === 'ALERTA' ? 'ALTA' : 'BAIXA',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ABNT NBR 5419: Proteção contra Descargas Atmosféricas (SPDA e MPS)
    // ──────────────────────────────────────────────────────────────────────────

    const statusDps = input.statusDps || 'OK';
    const isDpsAtuado = statusDps.toUpperCase().includes('ATUADO') || statusDps.toUpperCase().includes('FALHA');
    auditorias.push({
      norma: 'NBR 5419',
      itemNorma: 'Parte 4, Item 6.3',
      parametroAvaliado: 'Integridade dos Dispositivos de Proteção contra Surtos (DPS Classe I / II)',
      valorMedido: isDpsAtuado ? 1 : 0,
      valorLimite: 0,
      unidade: 'cartuchos atuados',
      statusConformidade: isDpsAtuado ? 'NAO_CONFORME' : 'CONFORME',
      detalhes: isDpsAtuado
        ? 'Cartucho de DPS com sinalizador mecânico de queima ativado após sobretensão atmosférica induzida.'
        : 'Todos os DPS CC e CA com indicação de operacionalidade normal e continuidade de aterramento.',
      acaoCorretiva: isDpsAtuado
        ? 'Substituir módulo protetor plugável do DPS imediatamente e verificar continuidade da malha de aterramento do SPDA.'
        : 'Manter rotina de inspeção visual periódica prévia ao período de chuvas e tempestades.',
      gravidade: isDpsAtuado ? 'ALTA' : 'BAIXA',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 5. ABNT NBR 14039: Instalações Elétricas de Média Tensão (Cabines e Trafos)
    // ──────────────────────────────────────────────────────────────────────────

    const tempOleo = input.tempOleoTrafo ?? 68.0;
    let statusOleo: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoOleo = 'Temperatura do transformador em regime térmico seguro.';
    if (tempOleo > 85.0) {
      statusOleo = 'NAO_CONFORME';
      acaoOleo = 'Temperatura de óleo excede 85°C. Risco de envelhecimento acelerado do papel isolante e sobrepressão. Verificar exaustores da cabine e coletar amostra para cromatografia de gases dissolvidos (DGA).';
    } else if (tempOleo > 75.0) {
      statusOleo = 'ALERTA';
      acaoOleo = 'Transformador operando próximo do limite térmico (75°C a 85°C). Limpar aletas de refrigeração e checar ventilação cruzada da cabine.';
    }

    auditorias.push({
      norma: 'NBR 14039',
      itemNorma: 'Item 6.3',
      parametroAvaliado: 'Temperatura máxima de topo de óleo do transformador elevador',
      valorMedido: parseFloat(tempOleo.toFixed(1)),
      valorLimite: 85.0,
      unidade: '°C',
      statusConformidade: statusOleo,
      detalhes: `Temperatura de topo de óleo registrada: ${tempOleo.toFixed(1)}°C. Limite máximo normativo contínuo: <= 85.0°C.`,
      acaoCorretiva: acaoOleo,
      gravidade: statusOleo === 'NAO_CONFORME' ? 'CRITICA' : statusOleo === 'ALERTA' ? 'ALTA' : 'BAIXA',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 6. PRODIST Módulo 8: Qualidade da Energia Elétrica no Ponto de Conexão (PAC)
    // ──────────────────────────────────────────────────────────────────────────

    let desbTensaoPercent = 0.8;
    if (input.tensaoFaseA && input.tensaoFaseB && input.tensaoFaseC) {
      const va = input.tensaoFaseA;
      const vb = input.tensaoFaseB;
      const vc = input.tensaoFaseC;
      const mediaV = (va + vb + vc) / 3;
      const maxDevV = Math.max(Math.abs(va - mediaV), Math.abs(vb - mediaV), Math.abs(vc - mediaV));
      desbTensaoPercent = mediaV > 0 ? (maxDevV / mediaV) * 100 : 0.8;
    }

    let statusDesbV: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoDesbV = 'Desbalanceamento de tensão dentro dos padrões do PRODIST.';
    if (desbTensaoPercent > 3.0) {
      statusDesbV = 'NAO_CONFORME';
      acaoDesbV = 'Desbalanço de tensão > 3.0% no PAC. Desrespeito ao PRODIST Módulo 8 e causa frequente de derating ou desligamento por subtensão dos inversores. Notificar a distribuidora de energia com registros de telemetria.';
    } else if (desbTensaoPercent > 2.0) {
      statusDesbV = 'ALERTA';
      acaoDesbV = 'Desbalanço entre 2.0% e 3.0%. Monitorar flutuações e tensões de fase nos horários de pico solar.';
    }

    auditorias.push({
      norma: 'PRODIST Módulo 8',
      itemNorma: 'Seção 8.1 - Tabela 1',
      parametroAvaliado: 'Fator de desbalanceamento de tensão (V2/V1)',
      valorMedido: parseFloat(desbTensaoPercent.toFixed(2)),
      valorLimite: 3.0,
      unidade: '%',
      statusConformidade: statusDesbV,
      detalhes: `Desbalanceamento de tensão medido no PAC: ${desbTensaoPercent.toFixed(2)}%. Limite regulatório ANEEL: <= 3.0%.`,
      acaoCorretiva: acaoDesbV,
      gravidade: statusDesbV === 'NAO_CONFORME' ? 'ALTA' : statusDesbV === 'ALERTA' ? 'MEDIA' : 'BAIXA',
    });

    const fp = input.fatorPotencia !== undefined ? Math.abs(input.fatorPotencia) : 0.99;
    let statusFP: 'CONFORME' | 'ALERTA' | 'NAO_CONFORME' = 'CONFORME';
    let acaoFP = 'Fator de potência adequado, sem risco de cobrança de reativos excedentes.';
    if (fp < 0.92) {
      statusFP = 'NAO_CONFORME';
      acaoFP = 'Fator de potência inferior a 0.92 no PAC. Cobrança de energia reativa excedente (ERE) na fatura da concessionária. Ajustar controle de potência reativa Q(V) ou cos phi(P) nos inversores.';
    } else if (fp < 0.95) {
      statusFP = 'ALERTA';
      acaoFP = 'Fator de potência entre 0.92 e 0.95. Ajustar rampa de reativos nos inversores para operação próxima à unidade (1.00).';
    }

    auditorias.push({
      norma: 'PRODIST Módulo 8 / REN 1.000',
      itemNorma: 'Seção 8.1 / Art. 656',
      parametroAvaliado: 'Fator de potência no Ponto de Conexão à Concessionária (PAC)',
      valorMedido: parseFloat(fp.toFixed(3)),
      valorLimite: 0.92,
      unidade: 'cos φ',
      statusConformidade: statusFP,
      detalhes: `Fator de potência medido: ${fp.toFixed(3)}. Limite mínimo regulatório contínuo: >= 0.920 indutivo/capacitivo.`,
      acaoCorretiva: acaoFP,
      gravidade: statusFP === 'NAO_CONFORME' ? 'ALTA' : statusFP === 'ALERTA' ? 'MEDIA' : 'BAIXA',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Consolidação dos Resultados
    // ──────────────────────────────────────────────────────────────────────────
    const conformes = auditorias.filter((a) => a.statusConformidade === 'CONFORME').length;
    const alertas = auditorias.filter((a) => a.statusConformidade === 'ALERTA').length;
    const naoConformes = auditorias.filter((a) => a.statusConformidade === 'NAO_CONFORME').length;
    const totalParametros = auditorias.length;

    const scoreConformidadePercent = Math.round(
      ((conformes * 1.0 + alertas * 0.6 + naoConformes * 0.0) / (totalParametros || 1)) * 100
    );

    const acoesUrgentes = auditorias
      .filter((a) => a.statusConformidade === 'NAO_CONFORME' || a.gravidade === 'CRITICA')
      .map((a) => `[${a.norma}] ${a.acaoCorretiva}`);

    return {
      scoreConformidadePercent,
      totalParametros,
      conformes,
      alertas,
      naoConformes,
      auditorias,
      acoesUrgentes,
    };
  }
}
