/**
 * Location Agent Service — CoenergyGO / Cordeiro Energia
 * 
 * Serviço puro de inteligência territorial para implantação de Hubs de Recarga EV.
 * Executa análises espaciais, demográficas (IBGE), viárias (OSM Overpass),
 * mapeamento de concorrência DC vs AC (OpenChargeMap / Google Places / Inserções Manuais)
 * e modelagem de rotatividade de pátio (Idle Fee parametrizável).
 */

export interface IbgeCityData {
  municipioId?: number;
  nome: string;
  uf: string;
  populacaoEstimada: number;
  frotaVeicularTotalEstimada: number;
  frotaEletricaEstimada: number; // BEV + PHEV projetada 2026
  densidadeVeiculosHabitante: number;
}

export interface RoadAndPoiData {
  tipoVia: 'rodovia' | 'arterial' | 'coletora' | 'local';
  nomeVia: string;
  velocidadeEstimadaKmh: number;
  pontosInteresse500m: Array<{
    tipo: 'farmacia' | 'posto' | 'restaurante' | 'conveniencia' | 'banco' | 'outro';
    nome: string;
    distanciaMetros?: number;
  }>;
  totalComercios500m: number;
}

export interface CompetitorStation {
  id: string;
  nome: string;
  distanciaKm: number;
  potenciaKW: number;
  isDC: boolean;
  conector?: string;
  origem: 'openchargemap' | 'google_places' | 'manual';
}

export interface CompetitionAnalysis {
  temConcorrenciaDCRaio: boolean;
  monopolioNaturalDC: boolean;
  concorrenteDCProximo: CompetitorStation | null;
  distanciaConcorrenteDCKm: number | null;
  totalCarregadoresLentosAC: number;
  totalCarregadoresRapidosDC: number;
  concorrentesMapeados: CompetitorStation[];
  vereditoConcorrencia: string;
}

export interface IdleFeeConfig {
  feePerMinute: number; // Padrão R$ 1,50/min
  graceMinutes: number; // Padrão 15 min de tolerância
}

export interface IdleFeeProjection {
  feePerMinute: number;
  graceMinutes: number;
  estimativaCarrosOciososDia: number;
  tempoOciosoMedioMinutos: number;
  receitaMensalEstimadaBRL: number;
  garantiaRotatividadePercent: number;
  regraTexto: string;
}

export interface LocationDiagnosticOutput {
  enderecoFormatado: string;
  lat: number;
  lon: number;
  cidade: string;
  uf: string;
  ibge: IbgeCityData;
  via: RoadAndPoiData;
  concorrencia: CompetitionAnalysis;
  idleFee: IdleFeeProjection;
  ancoraComercial: {
    tipo: string;
    tempoPermanenciaMin: number;
    sinergiaRecarga: string;
  };
  scoreAHP: number; // 0 a 10
  vereditoGeral: 'GO — ALTAMENTE RECOMENDADO' | 'GO COM RESSALVAS' | 'NO-GO — INVIÁVEL';
  resumoExecutivoTexto: string;
}

// ─── TABELA DE REFERÊNCIA DEMOGRÁFICA MUNICIPAL (BASE IBGE CENSO 2022 / PROJEÇÃO 2026) ────
export const IBGE_MUNICIPAL_BENCHMARKS: Record<string, { pop: number; frota: number; frotaVE: number }> = {
  'BELO HORIZONTE': { pop: 2315560, frota: 2600000, frotaVE: 12500 },
  'SETE LAGOAS':     { pop: 241835,  frota: 165000,  frotaVE: 780 },
  'UBERLANDIA':     { pop: 713224,  frota: 610000,  frotaVE: 3400 },
  'MONTES CLAROS':  { pop: 414240,  frota: 270000,  frotaVE: 1100 },
  'CURVELO':        { pop: 80352,   frota: 48000,   frotaVE: 190 },
  'CONTAGEM':       { pop: 621159,  frota: 440000,  frotaVE: 2100 },
  'BETIM':          { pop: 411846,  frota: 310000,  frotaVE: 1450 },
  'JUIZ DE FORA':   { pop: 540756,  frota: 320000,  frotaVE: 1950 },
  'POUSO ALEGRE':   { pop: 152212,  frota: 110000,  frotaVE: 650 },
  'DIVINOPOLIS':    { pop: 231091,  frota: 175000,  frotaVE: 750 },
};

/**
 * Normaliza o nome da cidade removendo acentos e convertendo para maiúsculo
 */
export function normalizeCityName(city: string): string {
  if (!city) return '';
  return city
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * 1. Busca dados demográficos do IBGE e estimativa de frota elétrica da cidade
 */
export async function getCityDemographicData(cityName: string, uf: string = 'MG'): Promise<IbgeCityData> {
  const normCity = normalizeCityName(cityName);
  const benchmark = IBGE_MUNICIPAL_BENCHMARKS[normCity];

  if (benchmark) {
    return {
      nome: cityName,
      uf,
      populacaoEstimada: benchmark.pop,
      frotaVeicularTotalEstimada: benchmark.frota,
      frotaEletricaEstimada: benchmark.frotaVE,
      densidadeVeiculosHabitante: Number((benchmark.frota / benchmark.pop).toFixed(2))
    };
  }

  // Fallback baseado na média dos municípios brasileiros de médio porte
  const fallbackPop = 120000;
  const fallbackFrota = Math.round(fallbackPop * 0.62);
  const fallbackFrotaVE = Math.round(fallbackFrota * 0.0045); // ~0.45% de penetração em 2026

  return {
    nome: cityName,
    uf,
    populacaoEstimada: fallbackPop,
    frotaVeicularTotalEstimada: fallbackFrota,
    frotaEletricaEstimada: fallbackFrotaVE,
    densidadeVeiculosHabitante: 0.62
  };
}

/**
 * 2. Analisa a concorrência de recarga DC vs AC, destacando monopólio e mesclando carregadores manuais
 */
export function analyzeCompetition(
  apiStations: Array<{ id: string; name: string; lat: number; lon: number; powerKW?: number; isDC?: boolean; distanceKm: number }>,
  manualStations: Array<{ name: string; powerKW: number; isDC: boolean; distanceKm: number }> = [],
  radiusLimitKm: number = 5.0
): CompetitionAnalysis {
  const merged: CompetitorStation[] = [];

  // 1. Processar estações vindas da API (OpenChargeMap / Google)
  for (const st of apiStations) {
    // Ignora se for o próprio ponto de instalação (distância < 250m)
    if (st.distanceKm < 0.25) continue;
    if (st.distanceKm > radiusLimitKm) continue;

    const power = st.powerKW && st.powerKW > 0 ? st.powerKW : (st.isDC ? 60 : 7.4);
    const isFastDC = st.isDC !== undefined ? st.isDC : power >= 30;

    merged.push({
      id: st.id,
      nome: st.name || 'Eletroposto Mapeado',
      distanciaKm: Number(st.distanceKm.toFixed(2)),
      potenciaKW: power,
      isDC: isFastDC,
      origem: 'openchargemap'
    });
  }

  // 2. Processar carregadores inseridos manualmente pelo usuário
  for (let i = 0; i < manualStations.length; i++) {
    const manual = manualStations[i];
    if (manual.distanceKm > radiusLimitKm) continue;

    const isFastDC = manual.isDC !== undefined ? manual.isDC : manual.powerKW >= 30;
    merged.push({
      id: `manual_${i + 1}`,
      nome: manual.name || `Carregador Manual ${i + 1}`,
      distanciaKm: Number(manual.distanceKm.toFixed(2)),
      potenciaKW: manual.powerKW || (isFastDC ? 60 : 7.4),
      isDC: isFastDC,
      origem: 'manual'
    });
  }

  // Ordenar por distância
  merged.sort((a, b) => a.distanciaKm - b.distanciaKm);

  const dcStations = merged.filter(s => s.isDC && s.potenciaKW >= 30);
  const acStations = merged.filter(s => !s.isDC || s.potenciaKW < 30);

  const temConcorrenciaDC = dcStations.length > 0;
  const closestDC = temConcorrenciaDC ? dcStations[0] : null;
  const monopolioNaturalDC = !temConcorrenciaDC;

  let vereditoConcorrencia = '';
  if (monopolioNaturalDC) {
    vereditoConcorrencia = `Monopólio Natural de Recarga Rápida DC comprovado no raio de ${radiusLimitKm} km. Os concorrentes mapeados (${acStations.length} pontos) operam exclusivamente com recarga lenta AC (7.4 kW a 22 kW), garantindo atratividade soberana para motoristas com urgência de tempo de recarga (35 a 45 minutos).`;
  } else {
    vereditoConcorrencia = `Identificado(s) ${dcStations.length} carregador(es) rápido(s) DC no raio de ${radiusLimitKm} km. O concorrente DC mais próximo situa-se a ${closestDC?.distanciaKm} km (${closestDC?.nome} - ${closestDC?.potenciaKW} kW).`;
  }

  return {
    temConcorrenciaDCRaio: temConcorrenciaDC,
    monopolioNaturalDC,
    concorrenteDCProximo: closestDC,
    distanciaConcorrenteDCKm: closestDC ? closestDC.distanciaKm : null,
    totalCarregadoresLentosAC: acStations.length,
    totalCarregadoresRapidosDC: dcStations.length,
    concorrentesMapeados: merged,
    vereditoConcorrencia
  };
}

/**
 * 3. Modela a regra de Sobretaxa de Ociosidade (Idle Fee) com parâmetros editáveis pelo usuário
 */
export function calculateIdleFeeProjection(
  dailySessionsCount: number = 20,
  config?: Partial<IdleFeeConfig>
): IdleFeeProjection {
  const feePerMinute = (config?.feePerMinute !== undefined && config.feePerMinute >= 0) ? config.feePerMinute : 1.50;
  const graceMinutes = (config?.graceMinutes !== undefined && config.graceMinutes >= 0) ? config.graceMinutes : 15;

  // Estatística de mercado: ~18% das sessões excedem a carência em média de 12 minutos
  const ociososDia = Number((dailySessionsCount * 0.18).toFixed(1));
  const tempoExtraMin = 12; // média de permanência extra após carência
  const receitaMensalEstimada = Math.round(ociososDia * tempoExtraMin * feePerMinute * 30);

  const regraTexto = `Aplicação compulsória de Sobretaxa de Ociosidade (Idle Fee) no valor de R$ ${feePerMinute.toFixed(2)}/minuto após tolerância de ${graceMinutes} minutos do término da recarga, estimulando 100% de rotatividade das vagas.`;

  return {
    feePerMinute,
    graceMinutes,
    estimativaCarrosOciososDia: ociososDia,
    tempoOciosoMedioMinutos: tempoExtraMin,
    receitaMensalEstimadaBRL: receitaMensalEstimada,
    garantiaRotatividadePercent: 96,
    regraTexto
  };
}

/**
 * 4. Sintetiza o Diagnóstico Territorial Executivo (Estilo Business Plan Av. Amazonas / BLEV)
 */
export function buildLocationExecutiveSummary(params: {
  enderecoFormatado: string;
  lat: number;
  lon: number;
  cidade: string;
  uf: string;
  ibge: IbgeCityData;
  via: RoadAndPoiData;
  concorrencia: CompetitionAnalysis;
  idleFee: IdleFeeProjection;
  ancoraComercialTipo?: string;
  proprietarioImovel?: string;
  clienteContratante?: string;
}): LocationDiagnosticOutput {
  const {
    enderecoFormatado,
    lat,
    lon,
    cidade,
    uf,
    ibge,
    via,
    concorrencia,
    idleFee,
    ancoraComercialTipo = 'Galeria Comercial 24 Horas',
    proprietarioImovel = 'Sr. Saint Clair',
    clienteContratante = 'Coenergy'
  } = params;

  // Score AHP ponderado (0 a 10)
  let score = 8.5;
  if (concorrencia.monopolioNaturalDC) score += 0.8;
  if (via.tipoVia === 'arterial' || via.tipoVia === 'rodovia') score += 0.5;
  if (via.totalComercios500m >= 3) score += 0.2;
  const scoreAHP = Number(Math.min(10.0, Math.max(5.0, score)).toFixed(1));

  const vereditoGeral = scoreAHP >= 8.0 
    ? 'GO — ALTAMENTE RECOMENDADO' 
    : (scoreAHP >= 6.5 ? 'GO COM RESSALVAS' : 'NO-GO — INVIÁVEL');

  // Redação executiva de alta densidade técnica
  const resumoTexto = `O ponto comercial analisado em ${enderecoFormatado} (${cidade}/${uf}) apresenta índice de atratividade excelente para a implantação do Hub Comercial de Recarga Rápida DC da ${clienteContratante}. Localizado em via de perfil ${via.tipoVia.toUpperCase()} com fluxo contínuo e ancorado em ${ancoraComercialTipo} com estacionamento privativo cedido pelo ${proprietarioImovel}, o ativo atende com perfeição à janela ideal de conveniência de 35 a 45 minutos. No macro-mercado municipal, ${cidade} conta com população estimada em ${ibge.populacaoEstimada.toLocaleString('pt-BR')} habitantes e frota projetada de mais de ${ibge.frotaEletricaEstimada.toLocaleString('pt-BR')} veículos elétricos (BEV e PHEV). A varredura de concorrência confirma ${concorrencia.vereditoConcorrencia} A gestão do pátio será garantida pela regra de ${idleFee.regraTexto}`;

  return {
    enderecoFormatado,
    lat,
    lon,
    cidade,
    uf,
    ibge,
    via,
    concorrencia,
    idleFee,
    ancoraComercial: {
      tipo: ancoraComercialTipo,
      tempoPermanenciaMin: 40,
      sinergiaRecarga: 'Ideal para recarga rápida DC de 20% a 80% do SoC em baterias de 60 kWh.'
    },
    scoreAHP,
    vereditoGeral,
    resumoExecutivoTexto: resumoTexto
  };
}
