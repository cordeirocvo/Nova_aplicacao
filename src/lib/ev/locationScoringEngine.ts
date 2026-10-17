/**
 * Location Scoring & EV Market Analytics Engine
 * Módulo de Ciência de Dados e Inteligência de Mercado para Eletropostos
 * Padrão de Alta Performance: Análise de Integridade, Processamento Vetorizado em Lote e DTOs Frontend.
 */

export type CommercialAnchorType = 
  | 'farmacia_24h' 
  | 'supermercado' 
  | 'shopping' 
  | 'posto_combustivel' 
  | 'centro_medico' 
  | 'hotel_resort'
  | 'comercio_geral';

export type ElectricalGridCategory = 
  | 'bt_grupo_f_disponivel' // Baixa Tensão CEMIG ND-5.1 Grupo F até 800A (dispensa subestação MT)
  | 'bt_convencional_pequena' // Baixa tensão até 200A (requer aumento de carga)
  | 'mt_subestacao_existente' // Média tensão já existente com trafo disponível
  | 'mt_nova_necessaria'; // Exige construção de nova cabine MT (alto CAPEX)

export interface LocationInputData {
  vdmVehiclesPerDay: number; // Volume Diário Médio de veículos na via
  evFleetDensityPercent: number; // Penetração da frota de VE na região (%)
  commercialAnchor: CommercialAnchorType;
  gridCategory: ElectricalGridCategory;
  availablePowerKW: number; // Potência elétrica disponível sem desarme
  competitorDistanceKM: number; // Distância do eletroposto DC rápido mais próximo
  totalChargerPowerKW: number; // Potência nominal total dos carregadores projetados
  averageDwellTimeMinutes?: number; // Tempo médio de permanência dos clientes
}

export interface DataIntegrityCheck {
  isValid: boolean;
  warnings: string[];
  anomaliesDetected: string[];
  cleanData: LocationInputData;
}

export interface LocationScoreBreakdown {
  trafficScore: number; // Max 25
  fleetScore: number; // Max 25
  anchorScore: number; // Max 20
  electricalScore: number; // Max 20
  competitionScore: number; // Max 10
  totalScore: number; // Max 100
  rating: 'Excelente' | 'Muito Bom' | 'Viável com Ressalvas' | 'Inviável / Alto Risco';
  verdictBadgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  executiveSummary: string;
  keyRecommendations: string[];
}

export interface ScenarioProjection {
  name: 'Conservador' | 'Realista' | 'Otimista';
  operatingHoursPerDay: number;
  utilizationRatePercent: number;
  dailySessions: number;
  dailyKWh: number;
  monthlyKWh: number;
  monthlyGrossRevenue: number;
  monthlyEnergyCost: number;
  monthlyOpex: number;
  monthlyNetProfit: number;
  paybackMonths: number;
}

export interface HourlyLoadPoint {
  hour: number; // 0 a 23
  hourLabel: string; // "00h", "01h", etc.
  expectedSessionsCount: number;
  projectedDemandKW: number;
  occupancyPercent: number;
  isPeakTariffHour: boolean; // 17h30 às 20h30 (Ponta CEMIG)
}

export interface BatchEvaluationSummary {
  totalLocationsEvaluated: number;
  averageScore: number;
  topRankedLocationId: string;
  topRankedLocationName: string;
  rankedLocations: Array<{
    id: string;
    name: string;
    score: number;
    rating: string;
    monthlyProfitRealista: number;
    paybackMonths: number;
  }>;
}

/**
 * 1. CHECKLIST DE INTEGRIDADE DOS DADOS (DATA HYGIENE FIRST)
 */
export function validateLocationDataIntegrity(raw: Partial<LocationInputData>): DataIntegrityCheck {
  const warnings: string[] = [];
  const anomalies: string[] = [];

  // VDM Check
  let vdm = Number(raw.vdmVehiclesPerDay);
  if (isNaN(vdm) || vdm <= 0) {
    warnings.push("VDM ausente ou zerado. Aplicado VDM de via arterial padrão (15.000 veículos/dia).");
    vdm = 15000;
  } else if (vdm > 250000) {
    anomalies.push(`VDM informado (${vdm}) é atipicamente elevado para vias urbanas. Verificar se refere-se a rodovia com múltiplas faixas.`);
  }

  // Fleet Density Check
  let fleet = Number(raw.evFleetDensityPercent);
  if (isNaN(fleet) || fleet <= 0) {
    warnings.push("Densidade de frota VE não informada. Utilizada média nacional ABVE (1.5%).");
    fleet = 1.5;
  } else if (fleet > 20) {
    anomalies.push(`Densidade de frota informada (${fleet}%) excede a média das capitais brasileiras.`);
  }

  // Power Check
  let power = Number(raw.availablePowerKW);
  if (isNaN(power) || power <= 0) {
    warnings.push("Potência disponível não especificada. Assumido limite do Padrão BT 200A (75 kW).");
    power = 75;
  }

  // Competitor Distance Check
  let dist = Number(raw.competitorDistanceKM);
  if (isNaN(dist) || dist < 0) {
    dist = 5.0; // Distância padrão neutra
  }

  const cleanData: LocationInputData = {
    vdmVehiclesPerDay: vdm,
    evFleetDensityPercent: fleet,
    commercialAnchor: raw.commercialAnchor || 'comercio_geral',
    gridCategory: raw.gridCategory || 'bt_grupo_f_disponivel',
    availablePowerKW: power,
    competitorDistanceKM: dist,
    totalChargerPowerKW: Number(raw.totalChargerPowerKW) || 60,
    averageDwellTimeMinutes: raw.averageDwellTimeMinutes || 35
  };

  return {
    isValid: anomalies.length === 0,
    warnings,
    anomaliesDetected: anomalies,
    cleanData
  };
}

/**
 * 2. ALGORITMO MULTICRITÉRIO DE SCORING LOCACIONAL (LFI - LOCATION FEASIBILITY INDEX)
 */
export function calculateLocationScore(input: LocationInputData): LocationScoreBreakdown {
  const { cleanData } = validateLocationDataIntegrity(input);

  // 1. Tráfego (Max 25 pts)
  // VDM >= 35.000 = 25 pts; 20.000 = 18 pts; 10.000 = 12 pts; 5.000 = 6 pts
  const trafficRatio = Math.min(1.0, cleanData.vdmVehiclesPerDay / 35000);
  const trafficScore = Number((trafficRatio * 25).toFixed(1));

  // 2. Densidade Frota VE (Max 25 pts)
  // Frota >= 3.5% = 25 pts; 2.0% = 18 pts; 1.0% = 10 pts
  const fleetRatio = Math.min(1.0, cleanData.evFleetDensityPercent / 3.5);
  const fleetScore = Number((fleetRatio * 25).toFixed(1));

  // 3. Âncora Comercial & Dwell Time (Max 20 pts)
  const ANCHOR_SCORES: Record<CommercialAnchorType, number> = {
    farmacia_24h: 20, // Excelente giro rápido para DC 30-60kW
    posto_combustivel: 19, // Parada natural com conveniência
    supermercado: 18, // Tempo de permanência de 45 a 90 min ideal
    shopping: 17, // Longa permanência, excelente para AC e Fast DC
    centro_medico: 15,
    hotel_resort: 14,
    comercio_geral: 10
  };
  const anchorScore = ANCHOR_SCORES[cleanData.commercialAnchor] || 10;

  // 4. Infraestrutura Elétrica (Max 20 pts)
  let electricalScore = 15;
  if (cleanData.gridCategory === 'bt_grupo_f_disponivel') {
    electricalScore = 20; // Dispensa subestação MT, economia de R$ 80k-120k
  } else if (cleanData.gridCategory === 'mt_subestacao_existente') {
    electricalScore = 18; // Subestação já pronta, apenas ramal
  } else if (cleanData.gridCategory === 'bt_convencional_pequena') {
    electricalScore = 12; // Requer aumento de padrão
  } else if (cleanData.gridCategory === 'mt_nova_necessaria') {
    electricalScore = 6; // Alto CAPEX inicial e prazo de homologação elevado
  }

  // 5. Concorrência & Exclusividade (Max 10 pts)
  // Distância do concorrente mais próximo: >= 5km = 10 pts; 3km = 7 pts; 1km = 4 pts; < 0.5km = 2 pts
  let competitionScore = 5;
  if (cleanData.competitorDistanceKM >= 5.0) competitionScore = 10;
  else if (cleanData.competitorDistanceKM >= 3.0) competitionScore = 8;
  else if (cleanData.competitorDistanceKM >= 1.5) competitionScore = 6;
  else if (cleanData.competitorDistanceKM >= 0.8) competitionScore = 4;
  else competitionScore = 2;

  const totalScore = Number((trafficScore + fleetScore + anchorScore + electricalScore + competitionScore).toFixed(1));

  let rating: LocationScoreBreakdown['rating'] = 'Inviável / Alto Risco';
  let verdictBadgeColor: LocationScoreBreakdown['verdictBadgeColor'] = 'rose';

  if (totalScore >= 80) {
    rating = 'Excelente';
    verdictBadgeColor = 'emerald';
  } else if (totalScore >= 65) {
    rating = 'Muito Bom';
    verdictBadgeColor = 'blue';
  } else if (totalScore >= 50) {
    rating = 'Viável com Ressalvas';
    verdictBadgeColor = 'amber';
  }

  const recommendations: string[] = [];
  if (trafficScore < 15) {
    recommendations.push("VDM moderado na via: investir em sinalização indicativa de recarga e integração em apps (PlugShare, Tupinambá, Waze).");
  }
  if (cleanData.gridCategory === 'bt_grupo_f_disponivel') {
    recommendations.push("Aproveitar fornecimento CEMIG Grupo F (até 800A) para economizar até R$ 120.000 em subestação MT.");
  } else if (cleanData.gridCategory === 'mt_nova_necessaria') {
    recommendations.push("Avaliar redução de potência ou implantação de Gestão Dinâmica DLM para tentar enquadramento em Baixa Tensão antes de investir em cabine MT.");
  }
  if (cleanData.commercialAnchor === 'farmacia_24h' || cleanData.commercialAnchor === 'posto_combustivel') {
    recommendations.push("Alta compatibilidade com carregadores rápidos DC (30 kW a 60 kW) com tempo médio de sessão de 35 minutos.");
  }

  return {
    trafficScore,
    fleetScore,
    anchorScore,
    electricalScore,
    competitionScore,
    totalScore,
    rating,
    verdictBadgeColor,
    executiveSummary: `Local com score global ${totalScore}/100 (${rating}). Tráfego: ${trafficScore}/25, Frota: ${fleetScore}/25, Âncora: ${anchorScore}/20, Elétrica: ${electricalScore}/20, Concorrência: ${competitionScore}/10.`,
    keyRecommendations: recommendations
  };
}

/**
 * 3. MODELAGEM FINANCEIRA & OPERACIONAL EM 3 CENÁRIOS
 */
export function calculateScenarioProjections(
  input: LocationInputData,
  totalCapex: number = 85000,
  tariffPerKWh: number = 2.10,
  energyCostPerKWh: number = 0.85,
  idleFeePerMin: number = 1.50
): ScenarioProjection[] {
  const { cleanData } = validateLocationDataIntegrity(input);
  const chargerPowerKW = cleanData.totalChargerPowerKW;

  const scenariosDef = [
    { name: 'Conservador' as const, hours: 3.0, rate: 25 },
    { name: 'Realista' as const, hours: 6.0, rate: 50 },
    { name: 'Otimista' as const, hours: 9.0, rate: 75 }
  ];

  return scenariosDef.map(sc => {
    // Sessões diárias baseadas no tempo médio de recarga (ex: 40 min = 0.67h)
    const avgSessionHours = Math.max(0.33, (cleanData.averageDwellTimeMinutes || 40) / 60);
    const dailySessions = Number((sc.hours / avgSessionHours).toFixed(1));
    
    // Consumo de energia
    const dailyKWh = Number((chargerPowerKW * sc.hours * 0.82).toFixed(1)); // 82% fator de potência médio de curva CC
    const monthlyKWh = Number((dailyKWh * 30).toFixed(1));

    // Receita e custos
    const monthlyGrossRevenue = Number((monthlyKWh * tariffPerKWh).toFixed(2));
    const monthlyEnergyCost = Number((monthlyKWh * energyCostPerKWh).toFixed(2));
    
    // OPEX (12% taxa de gateway/software + impostos + R$ 350 manutenção fixa)
    const monthlyOpex = Number((monthlyGrossRevenue * 0.12 + 350).toFixed(2));
    const monthlyNetProfit = Number((monthlyGrossRevenue - monthlyEnergyCost - monthlyOpex).toFixed(2));

    const paybackMonths = monthlyNetProfit > 0 
      ? Number((totalCapex / monthlyNetProfit).toFixed(1)) 
      : 999;

    return {
      name: sc.name,
      operatingHoursPerDay: sc.hours,
      utilizationRatePercent: sc.rate,
      dailySessions,
      dailyKWh,
      monthlyKWh,
      monthlyGrossRevenue,
      monthlyEnergyCost,
      monthlyOpex,
      monthlyNetProfit,
      paybackMonths
    };
  });
}

/**
 * 4. GERAÇÃO DE CURVA DE CARGA HORÁRIA TÍPICA (24 HORAS)
 */
export function generate24HourLoadProfile(
  input: LocationInputData,
  scenario: 'Conservador' | 'Realista' | 'Otimista' = 'Realista'
): HourlyLoadPoint[] {
  const { cleanData } = validateLocationDataIntegrity(input);
  const maxKW = cleanData.totalChargerPowerKW;

  // Fator multiplicador conforme o cenário
  const mult = scenario === 'Conservador' ? 0.6 : scenario === 'Otimista' ? 1.3 : 1.0;

  // Distribuição típica de ocupação horária conforme a âncora comercial
  const is24h = cleanData.commercialAnchor === 'farmacia_24h' || cleanData.commercialAnchor === 'posto_combustivel';

  return Array.from({ length: 24 }, (_, hour) => {
    let baseOccupancy = 0.05;

    if (hour >= 6 && hour < 9) baseOccupancy = 0.25; // Manhã
    else if (hour >= 9 && hour < 12) baseOccupancy = 0.45;
    else if (hour >= 12 && hour < 14) baseOccupancy = 0.65; // Almoço / oportunidade
    else if (hour >= 14 && hour < 17) baseOccupancy = 0.50;
    else if (hour >= 17 && hour < 20) baseOccupancy = 0.85; // Pico fim de tarde
    else if (hour >= 20 && hour < 23) baseOccupancy = is24h ? 0.40 : 0.15;
    else baseOccupancy = is24h ? 0.15 : 0.02; // Madrugada

    const finalOccupancy = Math.min(1.0, Math.max(0, baseOccupancy * mult));
    const projectedKW = Number((maxKW * finalOccupancy).toFixed(1));
    const sessions = Number((finalOccupancy * 2.5).toFixed(1));
    const isPeakHour = hour >= 17 && hour <= 20;

    return {
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}h`,
      expectedSessionsCount: sessions,
      projectedDemandKW: projectedKW,
      occupancyPercent: Math.round(finalOccupancy * 100),
      isPeakTariffHour: isPeakHour
    };
  });
}

/**
 * 5. PROCESSAMENTO VETORIAL EM LOTE (BATCH EVALUATION) PARA MÚLTIPLOS LOCAIS / CNPJs
 */
export function evaluateBatchLocations(
  locations: Array<LocationInputData & {
    id: string;
    name: string;
    capex?: number;
    tariff?: number;
    energyCost?: number;
  }>
): BatchEvaluationSummary {
  if (!locations || locations.length === 0) {
    return {
      totalLocationsEvaluated: 0,
      averageScore: 0,
      topRankedLocationId: '',
      topRankedLocationName: '',
      rankedLocations: []
    };
  }

  const results = locations.map(loc => {
    const scoreRes = calculateLocationScore(loc);
    const scenarios = calculateScenarioProjections(
      loc,
      loc.capex || 85000,
      loc.tariff || 2.10,
      loc.energyCost || 0.85
    );
    const realista = scenarios.find(s => s.name === 'Realista') || scenarios[1];

    return {
      id: loc.id,
      name: loc.name,
      score: scoreRes.totalScore,
      rating: scoreRes.rating,
      monthlyProfitRealista: realista.monthlyNetProfit,
      paybackMonths: realista.paybackMonths
    };
  });

  // Ordenação descendente por score
  results.sort((a, b) => b.score - a.score);

  const avgScore = Number((results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1));

  return {
    totalLocationsEvaluated: results.length,
    averageScore: avgScore,
    topRankedLocationId: results[0]?.id || '',
    topRankedLocationName: results[0]?.name || '',
    rankedLocations: results
  };
}
