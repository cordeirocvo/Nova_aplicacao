/**
 * Location Scoring & EV Market Analytics Engine (AHP / MCDA Model)
 * Cordeiro Energia / CoenergyGO
 * 
 * Implementação Científica Baseada em:
 * 1. Analytic Hierarchy Process (AHP - 4 Macro-Pilares com Pesos Calibrados)
 * 2. Multiplicadores Binários de Restrição Fatal (Fatal Flaw Analysis: Prod(Fj))
 * 3. Cálculo de Proximidade Espacial via Distância de Haversine
 * 4. Modelagem de 3 Cenários Operacionais & Curva de Carga Horária 24h
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

export interface BinaryFatalFlawGuards {
  has4gOrWifiConnectivity: boolean; // Conectividade celular/Wi-Fi para OCPP e gateway de pagamento
  isOutsideEnvironmentalProtectedArea: boolean; // Fora de APP ou terreno inundável
  hasPhysical24hAccess: boolean; // Acesso físico livre sem bloqueio noturno
  utilityFeasibilityApproved: boolean; // Viabilidade prévia ou sem veto da concessionária
}

export interface LocationInputData {
  vdmVehiclesPerDay: number; // Volume Diário Médio na via (veículos/dia)
  evFleetDensityPercent: number; // Penetração da frota de VE na região (%)
  commercialAnchor: CommercialAnchorType;
  gridCategory: ElectricalGridCategory;
  availablePowerKW: number; // Potência disponível na rede local
  competitorDistanceKM: number; // Distância até o próximo eletroposto DC rápido concorrente
  totalChargerPowerKW: number; // Potência nominal projetada para a estação
  averageDwellTimeMinutes?: number; // Tempo médio de permanência dos usuários
  isVerticalHousingArea?: boolean; // Região com alta densidade de prédios sem garagem (+demanda pública DC)
  fatalFlaws?: Partial<BinaryFatalFlawGuards>;
}

export interface NearbyChargingStation {
  id_estacao: string;
  nome: string;
  latitude: number;
  longitude: number;
  potencia_kw: number;
  status: 'Disponível' | 'Ocupado' | 'Manutenção';
  distancia_km?: number;
}

export interface AntigravityGeoPayload {
  status: 'sucesso' | 'erro';
  ponto_referencia: { lat: number; lon: number };
  raio_busca_km: number;
  total_encontrado: number;
  estacoes: Array<{
    nome: string;
    potencia_kw: number;
    status: 'Disponível' | 'Ocupado' | 'Manutenção';
    latitude: number;
    longitude: number;
    distancia_km: number;
  }>;
}

export interface LocationScoreBreakdown {
  gridReadinessScore: number; // 0 a 100 (Peso: 35%)
  trafficAndFleetScore: number; // 0 a 100 (Peso: 30%)
  dwellTimeMatchScore: number; // 0 a 100 (Peso: 20%)
  competitionAndAccessScore: number; // 0 a 100 (Peso: 15%)
  
  weightedBaseScore: number; // Soma ponderada (0 a 100)
  fatalFlawMultiplier: number; // 1 (aprovado) ou 0 (vetado)
  totalScore: number; // weightedBaseScore * fatalFlawMultiplier

  rating: 'Excelente' | 'Muito Bom' | 'Viável com Ressalvas' | 'Inviável / Fatal Flaw';
  verdictBadgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  fatalFlawReasons: string[];
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
  hour: number;
  hourLabel: string;
  expectedSessionsCount: number;
  projectedDemandKW: number;
  occupancyPercent: number;
  isPeakTariffHour: boolean;
}

/**
 * CÁLCULO TRIGONOMÉTRICO DE HAVERSINE (DISTÂNCIA GEODÉSICA ENTRE COORDENADAS)
 * R = 6371 km
 */
export function calculateHaversineDistanceKM(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371.0; // Raio médio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) * Math.cos((lat2 * Math.PI) / 180.0) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * FILTRAGEM ESPACIAL DE ESTAÇÕES CONCORRENTES EM UM RAIO (CATCHMENT AREA)
 */
export function filterStationsWithinRadius(
  centerLat: number,
  centerLon: number,
  radiusKM: number,
  stations: NearbyChargingStation[]
): AntigravityGeoPayload {
  const filtered = stations
    .map(st => {
      const dist = calculateHaversineDistanceKM(centerLat, centerLon, st.latitude, st.longitude);
      return {
        nome: st.nome,
        potencia_kw: st.potencia_kw,
        status: st.status,
        latitude: st.latitude,
        longitude: st.longitude,
        distancia_km: dist
      };
    })
    .filter(st => st.distancia_km <= radiusKM)
    .sort((a, b) => a.distancia_km - b.distancia_km);

  return {
    status: 'sucesso',
    ponto_referencia: { lat: centerLat, lon: centerLon },
    raio_busca_km: radiusKM,
    total_encontrado: filtered.length,
    estacoes: filtered
  };
}

/**
 * 1. CHECKLIST DE INTEGRIDADE DOS DADOS & RESILIÊNCIA
 */
export function validateLocationDataIntegrity(raw: Partial<LocationInputData>) {
  const warnings: string[] = [];
  const anomalies: string[] = [];

  let vdm = Number(raw.vdmVehiclesPerDay);
  if (isNaN(vdm) || vdm <= 0) {
    warnings.push("VDM não informado. Aplicado VDM arterial padrão de 15.000 veículos/dia.");
    vdm = 15000;
  }

  let fleet = Number(raw.evFleetDensityPercent);
  if (isNaN(fleet) || fleet <= 0) {
    warnings.push("Densidade de frota VE ausente. Utilizada média nacional ABVE (1.5%).");
    fleet = 1.5;
  }

  let power = Number(raw.availablePowerKW);
  if (isNaN(power) || power <= 0) {
    warnings.push("Potência disponível não definida. Utilizado limite padrão 200A (75 kW).");
    power = 75;
  }

  const cleanData: LocationInputData = {
    vdmVehiclesPerDay: vdm,
    evFleetDensityPercent: fleet,
    commercialAnchor: raw.commercialAnchor || 'comercio_geral',
    gridCategory: raw.gridCategory || 'bt_grupo_f_disponivel',
    availablePowerKW: power,
    competitorDistanceKM: typeof raw.competitorDistanceKM === 'number' ? raw.competitorDistanceKM : 4.5,
    totalChargerPowerKW: Number(raw.totalChargerPowerKW) || 60,
    averageDwellTimeMinutes: raw.averageDwellTimeMinutes || 35,
    isVerticalHousingArea: Boolean(raw.isVerticalHousingArea),
    fatalFlaws: {
      has4gOrWifiConnectivity: raw.fatalFlaws?.has4gOrWifiConnectivity ?? true,
      isOutsideEnvironmentalProtectedArea: raw.fatalFlaws?.isOutsideEnvironmentalProtectedArea ?? true,
      hasPhysical24hAccess: raw.fatalFlaws?.hasPhysical24hAccess ?? true,
      utilityFeasibilityApproved: raw.fatalFlaws?.utilityFeasibilityApproved ?? true
    }
  };

  return { cleanData, warnings, anomalies };
}

/**
 * 2. ALGORITMO MULTICRITÉRIO AHP DE SELEÇÃO DE PONTOS (MCDA SITE SELECTION)
 * 
 * Fórmula:
 * S_x = [ (0.35 * C_grid) + (0.30 * C_traffic) + (0.20 * C_dwell) + (0.15 * C_competition) ] * Prod(F_j)
 */
export function calculateLocationScore(input: LocationInputData): LocationScoreBreakdown {
  const { cleanData } = validateLocationDataIntegrity(input);

  // ─── A. PILAR 1: GRID READINESS & CAPACIDADE ELÉTRICA (35%) ───────────────
  // Avalia prontidão do padrão, custo de conexão e risco elétrico fatal
  let gridRaw = 60;
  if (cleanData.gridCategory === 'bt_grupo_f_disponivel') {
    gridRaw = 100; // Dispensa subestação MT, economia de R$ 80k-120k no CAPEX
  } else if (cleanData.gridCategory === 'mt_subestacao_existente') {
    gridRaw = 90; // Trafo já existente com folga de kVA
  } else if (cleanData.gridCategory === 'bt_convencional_pequena') {
    gridRaw = 65; // Requer aumento de padrão simples para 200A
  } else if (cleanData.gridCategory === 'mt_nova_necessaria') {
    gridRaw = 30; // Exige cabine alvenaria MT (CAPEX destrói TIR se potência < 200kW)
  }

  // Bonificação/Penalização pela relação Potência Disponível vs Demanda do Carregador
  if (cleanData.availablePowerKW >= cleanData.totalChargerPowerKW * 1.1) {
    gridRaw = Math.min(100, gridRaw + 10);
  } else if (cleanData.availablePowerKW < cleanData.totalChargerPowerKW * 0.8) {
    gridRaw = Math.max(20, gridRaw - 20); // Sobrecarga que exigirá DLM severo
  }

  // ─── B. PILAR 2: DEMANDA ESTIMADA & FROTA VE (30%) ────────────────────────
  // VDM base (saturação aos 35.000 veículos/dia)
  const vdmRatio = Math.min(1.0, cleanData.vdmVehiclesPerDay / 35000);
  // Frota regional (saturação aos 4.0% de frota circulante)
  const fleetRatio = Math.min(1.0, cleanData.evFleetDensityPercent / 4.0);
  
  let trafficFleetRaw = (vdmRatio * 50) + (fleetRatio * 50); // Escala 0 a 100

  // Bônus de Habitação Vertical (regiões com prédios antigos sem tomadas na garagem aumentam demanda pública DC)
  if (cleanData.isVerticalHousingArea) {
    trafficFleetRaw = Math.min(100, trafficFleetRaw * 1.15);
  }

  // ─── C. PILAR 3: DWELL TIME & COMPATIBILIDADE DE POI (20%) ────────────────
  // Compatibilidade entre o tempo de permanência da âncora e a velocidade do carregador
  let dwellRaw = 50;
  const isFastDC = cleanData.totalChargerPowerKW >= 50; // DC Rápido

  switch (cleanData.commercialAnchor) {
    case 'farmacia_24h':
      // Farmácia (15-35 min): excelente para Fast DC, péssimo para AC lento
      dwellRaw = isFastDC ? 100 : 40;
      break;
    case 'posto_combustivel':
      dwellRaw = isFastDC ? 98 : 35;
      break;
    case 'supermercado':
      // Supermercado (45-90 min): muito bom para DC 30-60kW e AC 22kW
      dwellRaw = isFastDC ? 90 : 85;
      break;
    case 'shopping':
      // Shopping (2-4h): excelente para Wallboxes AC e DC
      dwellRaw = isFastDC ? 88 : 95;
      break;
    case 'centro_medico':
      dwellRaw = isFastDC ? 80 : 75;
      break;
    case 'hotel_resort':
      // Hotel (pernoite): ideal para AC lenta durante a noite
      dwellRaw = isFastDC ? 65 : 100;
      break;
    default:
      dwellRaw = 55;
  }

  // ─── D. PILAR 4: CONCORRÊNCIA & ÁREA DE CAPTAÇÃO (15%) ────────────────────
  // Avalia o raio de exclusão e saturação do mercado vizinho
  let compRaw = 50;
  if (cleanData.competitorDistanceKM >= 6.0) {
    compRaw = 100; // Raio totalmente livre sem concorrentes
  } else if (cleanData.competitorDistanceKM >= 3.5) {
    compRaw = 85;
  } else if (cleanData.competitorDistanceKM >= 2.0) {
    compRaw = 65;
  } else if (cleanData.competitorDistanceKM >= 1.0) {
    compRaw = 45; // Concorrência moderada próxima
  } else {
    compRaw = 20; // Saturação iminente (canibalização de demanda)
  }

  // ─── CÁLCULO PONDERADO BASE (AHP WEIGHTS) ─────────────────────────────────
  const W_GRID = 0.35;
  const W_TRAFFIC = 0.30;
  const W_DWELL = 0.20;
  const W_COMP = 0.15;

  const weightedBaseScore = Number((
    (gridRaw * W_GRID) +
    (trafficFleetRaw * W_TRAFFIC) +
    (dwellRaw * W_DWELL) +
    (compRaw * W_COMP)
  ).toFixed(1));

  // ─── MULTIPLICADORES BINÁRIOS DE RESTRIÇÃO FATAL (PROD(Fj)) ───────────────
  const fatalFlawReasons: string[] = [];
  const flaws = cleanData.fatalFlaws;

  if (flaws) {
    if (!flaws.has4gOrWifiConnectivity) {
      fatalFlawReasons.push("FATAL FLAW: Ausência de sinal de conectividade 4G/Wi-Fi no local (inviabiliza comunicação OCPP e gateway de pagamento).");
    }
    if (!flaws.isOutsideEnvironmentalProtectedArea) {
      fatalFlawReasons.push("FATAL FLAW: Local em área de preservação permanente (APP) ou vulnerável a inundações.");
    }
    if (!flaws.hasPhysical24hAccess) {
      fatalFlawReasons.push("FATAL FLAW: Bloqueio de acesso viário ou horário de funcionamento restrito incompatível com a viabilidade.");
    }
    if (!flaws.utilityFeasibilityApproved) {
      fatalFlawReasons.push("FATAL FLAW: Recusa formal de viabilidade ou veto técnico emitido pela concessionária de energia.");
    }
  }

  const fatalFlawMultiplier = fatalFlawReasons.length === 0 ? 1 : 0;
  const totalScore = Number((weightedBaseScore * fatalFlawMultiplier).toFixed(1));

  // Determinação de Rating e Semáforo
  let rating: LocationScoreBreakdown['rating'] = 'Inviável / Fatal Flaw';
  let verdictBadgeColor: LocationScoreBreakdown['verdictBadgeColor'] = 'rose';

  if (fatalFlawMultiplier === 0) {
    rating = 'Inviável / Fatal Flaw';
    verdictBadgeColor = 'rose';
  } else if (totalScore >= 80) {
    rating = 'Excelente';
    verdictBadgeColor = 'emerald';
  } else if (totalScore >= 65) {
    rating = 'Muito Bom';
    verdictBadgeColor = 'blue';
  } else if (totalScore >= 50) {
    rating = 'Viável com Ressalvas';
    verdictBadgeColor = 'amber';
  }

  const keyRecommendations: string[] = [];
  if (fatalFlawMultiplier === 0) {
    keyRecommendations.push("Projeto vetado no screening prévio. Resolver as restrições fatais antes de prosseguir com qualquer despesa de engenharia.");
  } else {
    if (gridRaw >= 90) {
      keyRecommendations.push("Excelente prontidão elétrica: priorizar padrão CEMIG BT Grupo F para economizar até R$ 120k em cabine de transformação.");
    } else if (gridRaw < 60) {
      keyRecommendations.push("Atenção à infraestrutura elétrica: aplicar Gestão Dinâmica DLM para mitigar custos de nova cabine primária MT.");
    }
    if (cleanData.isVerticalHousingArea) {
      keyRecommendations.push("Fator de habitação vertical favorável: alta demanda espontânea de moradores de edifícios sem recarga privada.");
    }
    if (compRaw < 50) {
      keyRecommendations.push("Presença de concorrente a menos de 2 km: apostar em diferencial de conveniência (farmácia 24h) e preço competitivo por kWh.");
    }
  }

  return {
    gridReadinessScore: Number(gridRaw.toFixed(1)),
    trafficAndFleetScore: Number(trafficFleetRaw.toFixed(1)),
    dwellTimeMatchScore: Number(dwellRaw.toFixed(1)),
    competitionAndAccessScore: Number(compRaw.toFixed(1)),
    weightedBaseScore,
    fatalFlawMultiplier,
    totalScore,
    rating,
    verdictBadgeColor,
    fatalFlawReasons,
    executiveSummary: fatalFlawMultiplier === 0
      ? `Projeto VETADO (${totalScore}/100) por violação de condicionantes eliminatórias.`
      : `Score Científico AHP: ${totalScore}/100 (${rating}). Rede: ${gridRaw}/100 (35%), Demanda: ${trafficFleetRaw.toFixed(0)}/100 (30%), Dwell: ${dwellRaw}/100 (20%), Concorrência: ${compRaw}/100 (15%).`,
    keyRecommendations
  };
}

/**
 * 3. PROJEÇÃO FINANCEIRA & OPERACIONAL EM 3 CENÁRIOS
 */
export function calculateScenarioProjections(
  input: LocationInputData,
  totalCapex: number = 85000,
  tariffPerKWh: number = 2.10,
  energyCostPerKWh: number = 0.85
): ScenarioProjection[] {
  const { cleanData } = validateLocationDataIntegrity(input);
  const chargerPowerKW = cleanData.totalChargerPowerKW;

  const scenariosDef = [
    { name: 'Conservador' as const, hours: 3.0, rate: 25 },
    { name: 'Realista' as const, hours: 6.0, rate: 50 },
    { name: 'Otimista' as const, hours: 9.0, rate: 75 }
  ];

  return scenariosDef.map(sc => {
    const avgSessionHours = Math.max(0.33, (cleanData.averageDwellTimeMinutes || 40) / 60);
    const dailySessions = Number((sc.hours / avgSessionHours).toFixed(1));
    const dailyKWh = Number((chargerPowerKW * sc.hours * 0.82).toFixed(1));
    const monthlyKWh = Number((dailyKWh * 30).toFixed(1));

    const monthlyGrossRevenue = Number((monthlyKWh * tariffPerKWh).toFixed(2));
    const monthlyEnergyCost = Number((monthlyKWh * energyCostPerKWh).toFixed(2));
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
 * 4. GERAÇÃO DE CURVA DE CARGA HORÁRIA 24 HORAS
 */
export function generate24HourLoadProfile(
  input: LocationInputData,
  scenario: 'Conservador' | 'Realista' | 'Otimista' = 'Realista'
): HourlyLoadPoint[] {
  const { cleanData } = validateLocationDataIntegrity(input);
  const maxKW = cleanData.totalChargerPowerKW;
  const mult = scenario === 'Conservador' ? 0.6 : scenario === 'Otimista' ? 1.3 : 1.0;
  const is24h = cleanData.commercialAnchor === 'farmacia_24h' || cleanData.commercialAnchor === 'posto_combustivel';

  return Array.from({ length: 24 }, (_, hour) => {
    let baseOccupancy = 0.05;

    if (hour >= 6 && hour < 9) baseOccupancy = 0.25;
    else if (hour >= 9 && hour < 12) baseOccupancy = 0.45;
    else if (hour >= 12 && hour < 14) baseOccupancy = 0.65;
    else if (hour >= 14 && hour < 17) baseOccupancy = 0.50;
    else if (hour >= 17 && hour < 20) baseOccupancy = 0.85;
    else if (hour >= 20 && hour < 23) baseOccupancy = is24h ? 0.40 : 0.15;
    else baseOccupancy = is24h ? 0.15 : 0.02;

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
