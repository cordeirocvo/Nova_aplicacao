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

export type { CompetitorStationFeature } from '../coenergygo/types';

export type CommercialAnchorType = 
  | 'posto_combustivel'
  | 'farmacia_24h' 
  | 'padaria_restaurante'
  | 'supermercado' 
  | 'centro_medico' 
  | 'shopping' 
  | 'hotel_resort'
  | 'comercio_geral';

export interface CommercialAnchorSpec {
  key: CommercialAnchorType;
  label: string;
  shortLabel: string;
  typicalDwellRangeLabel: string;
  defaultDwellMinutes: number;
  targetSessionKWh: number; // Meta de energia útil entregue na janela da parada (kWh)
  idealMinKW: number;
  idealMaxKW: number;
  recommendedTechLabel: string;
  benchmarkSource: string;
}

export const COMMERCIAL_ANCHOR_SPECS: Record<CommercialAnchorType, CommercialAnchorSpec> = {
  posto_combustivel: {
    key: 'posto_combustivel',
    label: 'Posto Rodoviário / Conveniência Expressa (15–25 min)',
    shortLabel: 'Posto / Conveniência Expressa',
    typicalDwellRangeLabel: '15 a 25 min',
    defaultDwellMinutes: 25,
    targetSessionKWh: 25,
    idealMinKW: 60,
    idealMaxKW: 350,
    recommendedTechLabel: 'DC Rápido / Ultrarrápido (60 a 350 kW)',
    benchmarkSource: 'Sindicom / ANP / Corredores Rodoviários'
  },
  farmacia_24h: {
    key: 'farmacia_24h',
    label: 'Farmácia 24h / Conveniência Urbana (20–35 min)',
    shortLabel: 'Farmácia 24h / Conveniência',
    typicalDwellRangeLabel: '20 a 35 min',
    defaultDwellMinutes: 30,
    targetSessionKWh: 22,
    idealMinKW: 50,
    idealMaxKW: 120,
    recommendedTechLabel: 'DC Rápido Urbano (40 a 120 kW)',
    benchmarkSource: 'Abrafarma / Varejo Conveniência Urbana'
  },
  padaria_restaurante: {
    key: 'padaria_restaurante',
    label: 'Padaria / Cafeteria / Restaurante (35–55 min)',
    shortLabel: 'Padaria / Restaurante / Café',
    typicalDwellRangeLabel: '35 a 55 min',
    defaultDwellMinutes: 45,
    targetSessionKWh: 22,
    idealMinKW: 30,
    idealMaxKW: 80,
    recommendedTechLabel: 'DC Rápido Compacto (30 a 80 kW)',
    benchmarkSource: 'Abrasel / Alimentação Fora do Lar'
  },
  supermercado: {
    key: 'supermercado',
    label: 'Supermercado / Atacarejo (45–75 min)',
    shortLabel: 'Supermercado / Atacarejo',
    typicalDwellRangeLabel: '45 a 75 min',
    defaultDwellMinutes: 60,
    targetSessionKWh: 24,
    idealMinKW: 22,
    idealMaxKW: 60,
    recommendedTechLabel: 'DC 30–60 kW ou Wallbox AC 22 kW',
    benchmarkSource: 'ABRAS (Associação Brasileira de Supermercados)'
  },
  centro_medico: {
    key: 'centro_medico',
    label: 'Academia / Centro Médico / Clínica (60–90 min)',
    shortLabel: 'Academia / Centro Médico',
    typicalDwellRangeLabel: '60 a 90 min',
    defaultDwellMinutes: 75,
    targetSessionKWh: 20,
    idealMinKW: 11,
    idealMaxKW: 45,
    recommendedTechLabel: 'DC 30–40 kW ou Wallbox AC 11–22 kW',
    benchmarkSource: 'ACAD Brasil / Serviços de Saúde & Fitness'
  },
  shopping: {
    key: 'shopping',
    label: 'Shopping Center / Home Center (90–180 min)',
    shortLabel: 'Shopping Center / Lazer',
    typicalDwellRangeLabel: '90 a 180 min',
    defaultDwellMinutes: 120,
    targetSessionKWh: 25,
    idealMinKW: 11,
    idealMaxKW: 60,
    recommendedTechLabel: 'Mix Wallbox AC 22 kW + DC 60 kW',
    benchmarkSource: 'ABRASCE (Censo Brasileiro de Shopping Centers)'
  },
  hotel_resort: {
    key: 'hotel_resort',
    label: 'Hotel / Pousada / Condomínio Pernoite (6h–10h)',
    shortLabel: 'Hotel / Pernoite (Destino)',
    typicalDwellRangeLabel: '360 a 600 min',
    defaultDwellMinutes: 360,
    targetSessionKWh: 36,
    idealMinKW: 7.4,
    idealMaxKW: 22,
    recommendedTechLabel: 'Wallbox AC Destino (7.4 a 22 kW)',
    benchmarkSource: 'FOHB (Fórum de Operadores Hoteleiros do Brasil)'
  },
  comercio_geral: {
    key: 'comercio_geral',
    label: 'Comércio de Rua Geral / Pátio Corporativo (30–50 min)',
    shortLabel: 'Comércio de Rua / Pátio',
    typicalDwellRangeLabel: '30 a 50 min',
    defaultDwellMinutes: 40,
    targetSessionKWh: 20,
    idealMinKW: 30,
    idealMaxKW: 80,
    recommendedTechLabel: 'DC 30–60 kW ou AC 22 kW',
    benchmarkSource: 'CNC / Varejo de Rua & Serviços'
  }
};

export interface DwellEnergyEvaluation {
  anchorSpec: CommercialAnchorSpec;
  sessionMinutes: number;
  chargerPowerKW: number;
  deliveredKWh: number;
  addedRangeKM: number;
  recoveredSocPercent: number;
  minutesTo80PercentSoc: number;
  idleBlockedMinutes: number;
  dwellScore: number;
  statusVerdict: 'match_perfeito' | 'bom_atende' | 'subdimensionado' | 'bloqueio_ocioso';
  explanation: string;
}

export function evaluateDwellTimeAndEnergyMatch(
  anchor: CommercialAnchorType,
  chargerPowerKW: number,
  customSessionMinutes?: number
): DwellEnergyEvaluation {
  const spec = COMMERCIAL_ANCHOR_SPECS[anchor] || COMMERCIAL_ANCHOR_SPECS.farmacia_24h;
  const sessionMinutes = (customSessionMinutes && customSessionMinutes > 0) ? customSessionMinutes : spec.defaultDwellMinutes;
  const sessionHours = sessionMinutes / 60;

  // Fator de absorção real CC/CV (82% para DC; em AC <= 22kW considera-se também a limitação média de OBC quando aplicável)
  const rawDeliveredKWh = chargerPowerKW * sessionHours * 0.82;
  // Uma bateria padrão de 60 kWh chegando com 20% SoC absorve no máximo ~48 kWh na sessão
  const deliveredKWh = Number(Math.min(54, rawDeliveredKWh).toFixed(1));
  const addedRangeKM = Math.round(deliveredKWh * 6.0); // 6.0 km/kWh média PBEV/Inmetro
  const recoveredSocPercent = Math.min(90, Math.round((deliveredKWh / 60) * 100));

  // Tempo para carregar 36 kWh (20% -> 80% de uma bateria de 60 kWh)
  const effectiveRateKW = Math.max(3.0, chargerPowerKW * 0.82);
  const minutesTo80PercentSoc = Math.round((36 / effectiveRateKW) * 60);
  const idleBlockedMinutes = Math.max(0, sessionMinutes - minutesTo80PercentSoc);

  let dwellScore = 70;
  let statusVerdict: DwellEnergyEvaluation['statusVerdict'] = 'bom_atende';
  let explanation = '';

  const energyRatio = deliveredKWh / Math.max(10, spec.targetSessionKWh);

  if (idleBlockedMinutes > 60 && chargerPowerKW > spec.idealMaxKW) {
    // Superdimensionado para permanência longa (carro termina rápido e bloqueia a vaga)
    const penalty = Math.min(30, Math.round((idleBlockedMinutes - 45) / 6));
    dwellScore = Math.max(62, 95 - penalty);
    statusVerdict = 'bloqueio_ocioso';
    explanation = `Carga de 80% concluída em ${minutesTo80PercentSoc} min, gerando ~${idleBlockedMinutes} min de vaga bloqueada ociosa na janela de ${sessionMinutes} min.`;
  } else if (chargerPowerKW >= spec.idealMinKW && chargerPowerKW <= spec.idealMaxKW && energyRatio >= 0.85) {
    // Faixa ideal de potência e energia entregue
    dwellScore = Math.min(100, Math.round(90 + Math.min(10, (energyRatio - 0.85) * 35)));
    statusVerdict = 'match_perfeito';
    explanation = `Sinergia Ideal: ${chargerPowerKW} kW em ${sessionMinutes} min entrega ${deliveredKWh} kWh (+${addedRangeKM} km / +${recoveredSocPercent}% bateria), atingindo 100% da meta da âncora.`;
  } else if (energyRatio >= 0.65) {
    // Caso intermediário (ex.: 40 kW DC em Farmácia de 30–35 min -> entrega 16.4 a 19.1 kWh de 22 kWh = 75% a 87% da meta -> Nota 80 a 88!)
    dwellScore = Math.min(92, Math.max(76, Math.round(45 + 48 * Math.min(1, energyRatio))));
    statusVerdict = 'bom_atende';
    explanation = `Boa Aderência Comercial: ${chargerPowerKW} kW em ${sessionMinutes} min entrega ${deliveredKWh} kWh (+${addedRangeKM} km / +${recoveredSocPercent}% bateria), atendendo ${Math.round(energyRatio * 100)}% da meta ideal (${spec.targetSessionKWh} kWh).`;
  } else {
    // Subdimensionado (ex.: AC 7.4 kW ou 22 kW em parada rápida de 25–30 min)
    dwellScore = Math.max(25, Math.min(72, Math.round(25 + 50 * energyRatio)));
    statusVerdict = 'subdimensionado';
    explanation = `Potência Abaixo do Ideal p/ Janela de ${sessionMinutes} min: entrega apenas ${deliveredKWh} kWh (+${addedRangeKM} km). Recomendado para ${spec.shortLabel}: ${spec.recommendedTechLabel}.`;
  }

  return {
    anchorSpec: spec,
    sessionMinutes,
    chargerPowerKW,
    deliveredKWh,
    addedRangeKM,
    recoveredSocPercent,
    minutesTo80PercentSoc,
    idleBlockedMinutes,
    dwellScore,
    statusVerdict,
    explanation
  };
}

export type ElectricalGridCategory = 
  | 'bt_grupo_f_disponivel' // Baixa Tensão CEMIG ND-5.1 Grupo F até 800A (dispensa subestação MT)
  | 'bt_convencional_pequena' // Baixa tensão até 200A (requer aumento de carga)
  | 'mt_subestacao_existente' // Média tensão já existente com trafo disponível
  | 'mt_nova_necessaria' // Exige construção de nova cabine MT (alto CAPEX)
  | 'ligacao_nova_bt' // Ligação Nova Baixa Tensão: Padrão novo BT homologado (obra simples, custo incluso no CAPEX)
  | 'ligacao_nova_mt'; // Ligação Nova Média Tensão: Sem padrão, subestação MT nova necessária (CAPEX elevado)

export type LocationNicheType = 
  | 'highway'      // 1. Corredor Rodoviário (Rápido DC 60–350 kW)
  | 'urban_hub'    // 2. Hub Urbano de Bairro / App (Rápido DC 30–120 kW)
  | 'destination'  // 3. Varejo de Destino & Lazer (AC 7–22 kW / DC 30 kW)
  | 'fleet_depot'  // 4. Frotas Urbanas Last-Mile (Pátio DC/AC Misto)
  | 'heavy_duty'   // 5. Transporte Pesado / Eletroterminais (MCS / DC > 150 kW)
  | 'residential'; // 6. Residencial Coletivo & Garagens (AC 7.4 kW + DLM)

export interface MunicipalFleetRecord {
  key: string;
  cityName: string;
  uf: string;
  ibgeCode: string;
  ibgeUrl: string;
  totalLightVehicles: number; // Automóveis + Caminhonetes/Utilitários leves (IBGE / Senatran)
  evPluginVehicles: number;   // Elétricos BEV + Híbridos Plug-in PHEV (Senatran / ABVE)
  defaultCorridorFactor: number; // Multiplicador típico do corredor comercial/rodoviário
  referencePeriod: string;
}

export const MUNICIPAL_FLEET_CENSUS_MG: Record<string, MunicipalFleetRecord> = {
  belo_horizonte: {
    key: 'belo_horizonte',
    cityName: 'Belo Horizonte',
    uf: 'MG',
    ibgeCode: '3106200',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/belo-horizonte/pesquisa/22/28120',
    totalLightVehicles: 1420000,
    evPluginVehicles: 18460, // ~1.30% da frota municipal (epicentro estadual MG)
    defaultCorridorFactor: 2.0, // Corredores Centro-Sul / Savassi (~2.60% na via)
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  uberlandia: {
    key: 'uberlandia',
    cityName: 'Uberlândia',
    uf: 'MG',
    ibgeCode: '3170206',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/uberlandia/pesquisa/22/28120',
    totalLightVehicles: 338500,
    evPluginVehicles: 3550, // ~1.05% da frota municipal (1º polo do interior MG)
    defaultCorridorFactor: 1.8, // Eixos Rondon Pacheco / Granja Marileusa / Brasil (~1.89% na via)
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  sete_lagoas: {
    key: 'sete_lagoas',
    cityName: 'Sete Lagoas',
    uf: 'MG',
    ibgeCode: '3167202',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/sete-lagoas/pesquisa/22/28120',
    totalLightVehicles: 94200,
    evPluginVehicles: 755, // ~0.80% da frota municipal
    defaultCorridorFactor: 1.5, // Eixo comercial Olavo Bilac / Canaã / Lagoa (~1.20% na via)
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  montes_claros: {
    key: 'montes_claros',
    cityName: 'Montes Claros',
    uf: 'MG',
    ibgeCode: '3143302',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/montes-claros/pesquisa/22/28120',
    totalLightVehicles: 142800,
    evPluginVehicles: 1070, // ~0.75% da frota municipal
    defaultCorridorFactor: 1.8, // Entroncamento rodoviário BR-251 / BR-135 (~1.35% na via)
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  curvelo: {
    key: 'curvelo',
    cityName: 'Curvelo',
    uf: 'MG',
    ibgeCode: '3120904',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/curvelo/pesquisa/22/28120',
    totalLightVehicles: 29400,
    evPluginVehicles: 190, // ~0.65% da frota municipal
    defaultCorridorFactor: 1.7, // Eixo passagem BR-040 / Av. Bias Fortes (~1.10% na via)
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  contagem: {
    key: 'contagem',
    cityName: 'Contagem',
    uf: 'MG',
    ibgeCode: '3118601',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/contagem/pesquisa/22/28120',
    totalLightVehicles: 245000,
    evPluginVehicles: 2205, // ~0.90% da frota municipal
    defaultCorridorFactor: 1.5,
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  betim: {
    key: 'betim',
    cityName: 'Betim',
    uf: 'MG',
    ibgeCode: '3106705',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/betim/pesquisa/22/28120',
    totalLightVehicles: 162000,
    evPluginVehicles: 1460, // ~0.90% da frota municipal
    defaultCorridorFactor: 1.5,
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  juiz_de_fora: {
    key: 'juiz_de_fora',
    cityName: 'Juiz de Fora',
    uf: 'MG',
    ibgeCode: '3136702',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/juiz-de-fora/pesquisa/22/28120',
    totalLightVehicles: 215000,
    evPluginVehicles: 2150, // ~1.00% da frota municipal
    defaultCorridorFactor: 1.6,
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  uberaba: {
    key: 'uberaba',
    cityName: 'Uberaba',
    uf: 'MG',
    ibgeCode: '3170107',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/uberaba/pesquisa/22/28120',
    totalLightVehicles: 158000,
    evPluginVehicles: 1420, // ~0.90% da frota municipal
    defaultCorridorFactor: 1.6,
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  divinopolis: {
    key: 'divinopolis',
    cityName: 'Divinópolis',
    uf: 'MG',
    ibgeCode: '3122306',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/divinopolis/pesquisa/22/28120',
    totalLightVehicles: 108000,
    evPluginVehicles: 865, // ~0.80% da frota municipal
    defaultCorridorFactor: 1.5,
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  pouso_alegre: {
    key: 'pouso_alegre',
    cityName: 'Pouso Alegre',
    uf: 'MG',
    ibgeCode: '3152501',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/pouso-alegre/pesquisa/22/28120',
    totalLightVehicles: 78500,
    evPluginVehicles: 785, // ~1.00% da frota municipal (Eixo Fernão Dias BR-381)
    defaultCorridorFactor: 1.8,
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  ipatinga: {
    key: 'ipatinga',
    cityName: 'Ipatinga',
    uf: 'MG',
    ibgeCode: '3131307',
    ibgeUrl: 'https://cidades.ibge.gov.br/brasil/mg/ipatinga/pesquisa/22/28120',
    totalLightVehicles: 104000,
    evPluginVehicles: 830, // ~0.80% da frota municipal
    defaultCorridorFactor: 1.5,
    referencePeriod: 'Senatran / ABVE 2025-2026'
  },
  outro_municipio: {
    key: 'outro_municipio',
    cityName: 'Outro Município (Personalizado)',
    uf: 'BR',
    ibgeCode: '0000000',
    ibgeUrl: 'https://cidades.ibge.gov.br/',
    totalLightVehicles: 80000,
    evPluginVehicles: 640, // ~0.80% base
    defaultCorridorFactor: 1.5,
    referencePeriod: 'Personalizado pelo Projetista'
  }
};

export function detectCityKeyFromContext(contextText: string): string {
  const norm = (contextText || '').toLowerCase();
  if (norm.includes('uberlândia') || norm.includes('uberlandia')) return 'uberlandia';
  if (norm.includes('montes claros') || norm.includes('dangelis') || norm.includes('br 251') || norm.includes('br-251')) return 'montes_claros';
  if (norm.includes('curvelo')) return 'curvelo';
  if (norm.includes('belo horizonte') || norm.includes('savassi')) return 'belo_horizonte';
  if (norm.includes('contagem')) return 'contagem';
  if (norm.includes('betim')) return 'betim';
  if (norm.includes('juiz de fora')) return 'juiz_de_fora';
  if (norm.includes('uberaba')) return 'uberaba';
  if (norm.includes('divinópolis') || norm.includes('divinopolis')) return 'divinopolis';
  if (norm.includes('pouso alegre')) return 'pouso_alegre';
  if (norm.includes('ipatinga')) return 'ipatinga';
  if (norm.includes('sete lagoas') || norm.includes('olavo bilac')) return 'sete_lagoas';
  return 'sete_lagoas';
}

export type RoadHierarchyKey =
  | 'rodovia_dupla'
  | 'rodovia_simples'
  | 'arterial_primaria'
  | 'coletora_secundaria'
  | 'coletora_bairro'
  | 'via_local';

export interface RoadHierarchySpec {
  key: RoadHierarchyKey;
  label: string;
  shortLabel: string;
  osmTags: string;
  baseDailyVolumePerLane: number; // VDM base por faixa de rolamento (HCM / CET / DNIT)
  defaultLanes: number;
  typicalSpeedKmh: number;
}

export const ROAD_HIERARCHY_HCM_SPECS: Record<RoadHierarchyKey, RoadHierarchySpec> = {
  rodovia_dupla: {
    key: 'rodovia_dupla',
    label: 'Rodovia Duplicada / Via Expressa (BR / MG)',
    shortLabel: 'Rodovia Duplicada',
    osmTags: 'motorway / trunk',
    baseDailyVolumePerLane: 9500,
    defaultLanes: 4,
    typicalSpeedKmh: 100
  },
  rodovia_simples: {
    key: 'rodovia_simples',
    label: 'Rodovia Pista Simples / Contorno Rodoviário',
    shortLabel: 'Rodovia Pista Simples',
    osmTags: 'trunk / primary (rodoviário)',
    baseDailyVolumePerLane: 8500,
    defaultLanes: 2,
    typicalSpeedKmh: 80
  },
  arterial_primaria: {
    key: 'arterial_primaria',
    label: 'Avenida Arterial Principal (Eixo Estrutural Urbano)',
    shortLabel: 'Avenida Arterial 1ª',
    osmTags: 'primary',
    baseDailyVolumePerLane: 6000,
    defaultLanes: 4,
    typicalSpeedKmh: 60
  },
  coletora_secundaria: {
    key: 'coletora_secundaria',
    label: 'Avenida Comercial / Coletora Principal',
    shortLabel: 'Avenida Coletora 2ª',
    osmTags: 'secondary',
    baseDailyVolumePerLane: 4500,
    defaultLanes: 2,
    typicalSpeedKmh: 50
  },
  coletora_bairro: {
    key: 'coletora_bairro',
    label: 'Rua Coletora de Bairro / Comércio Local (ex.: R. Olavo Bilac)',
    shortLabel: 'Coletora de Bairro',
    osmTags: 'tertiary',
    baseDailyVolumePerLane: 3600,
    defaultLanes: 2,
    typicalSpeedKmh: 40
  },
  via_local: {
    key: 'via_local',
    label: 'Rua Local Residencial / Tráfego Calmo',
    shortLabel: 'Via Local Residencial',
    osmTags: 'residential',
    baseDailyVolumePerLane: 1300,
    defaultLanes: 2,
    typicalSpeedKmh: 30
  }
};

export interface OfficialRoadCorridorRecord {
  key: string;
  name: string;
  cityOrRegion: string;
  hierarchyKey: RoadHierarchyKey;
  lanes: number;
  isOneway: boolean;
  officialVdm: number;
  agencySource: string;
}

export const OFFICIAL_ROAD_CORRIDORS_MG: Record<string, OfficialRoadCorridorRecord> = {
  udi_rondon_pacheco: {
    key: 'udi_rondon_pacheco',
    name: 'Av. Rondon Pacheco / Av. João Naves de Ávila',
    cityOrRegion: 'Uberlândia - MG',
    hierarchyKey: 'arterial_primaria',
    lanes: 6,
    isOneway: false,
    officialVdm: 36000,
    agencySource: 'Settran Uberlândia / Radares Municipais'
  },
  udi_getulio_vargas: {
    key: 'udi_getulio_vargas',
    name: 'Av. Getúlio Vargas / Av. Afonso Pena / Centro',
    cityOrRegion: 'Uberlândia - MG',
    hierarchyKey: 'arterial_primaria',
    lanes: 4,
    isOneway: false,
    officialVdm: 24500,
    agencySource: 'Settran Uberlândia / Engenharia Viária'
  },
  br050_uberlandia: {
    key: 'br050_uberlandia',
    name: 'Rodovia BR-050 / BR-365 (Trevo Uberlândia)',
    cityOrRegion: 'Uberlândia - MG',
    hierarchyKey: 'rodovia_dupla',
    lanes: 4,
    isOneway: false,
    officialVdm: 42000,
    agencySource: 'DNIT PNCT / Concessionária Eco050'
  },
  sl_olavo_bilac: {
    key: 'sl_olavo_bilac',
    name: 'Rua Olavo Bilac (Bairro Canaã / Boa Vista)',
    cityOrRegion: 'Sete Lagoas - MG',
    hierarchyKey: 'coletora_bairro',
    lanes: 2,
    isOneway: false,
    officialVdm: 7200,
    agencySource: 'Seltrans Sete Lagoas / Modelo HCM Coletora'
  },
  sl_otavio_campelo: {
    key: 'sl_otavio_campelo',
    name: 'Av. Otávio Campelo Ribeiro / Av. Pref. Alberto Moura',
    cityOrRegion: 'Sete Lagoas - MG',
    hierarchyKey: 'arterial_primaria',
    lanes: 4,
    isOneway: false,
    officialVdm: 18500,
    agencySource: 'Seltrans Sete Lagoas / Eixo Shopping-BR040'
  },
  br040_sete_lagoas: {
    key: 'br040_sete_lagoas',
    name: 'Rodovia BR-040 Km 472 (Trecho Sete Lagoas)',
    cityOrRegion: 'Sete Lagoas - MG',
    hierarchyKey: 'rodovia_dupla',
    lanes: 4,
    isOneway: false,
    officialVdm: 38500,
    agencySource: 'DNIT PNCT / Concessionária Via 040'
  },
  br251_montes_claros: {
    key: 'br251_montes_claros',
    name: "Rodovia BR-251 Km 514 (Posto D'Angelis / Entroncamento)",
    cityOrRegion: 'Montes Claros - MG',
    hierarchyKey: 'rodovia_simples',
    lanes: 2,
    isOneway: false,
    officialVdm: 24800,
    agencySource: 'DNIT PNCT (Posto de Contagem BR-251)'
  },
  br040_curvelo: {
    key: 'br040_curvelo',
    name: 'Rodovia BR-040 / BR-135 (Trevo Posto Décio Curvelo)',
    cityOrRegion: 'Curvelo - MG',
    hierarchyKey: 'rodovia_dupla',
    lanes: 4,
    isOneway: false,
    officialVdm: 26400,
    agencySource: 'DNIT PNCT / Concessionária Eco135'
  },
  curvelo_bias_fortes: {
    key: 'curvelo_bias_fortes',
    name: 'Avenida Bias Fortes (Centro Comercial)',
    cityOrRegion: 'Curvelo - MG',
    hierarchyKey: 'arterial_primaria',
    lanes: 3,
    isOneway: false,
    officialVdm: 13800,
    agencySource: 'Engenharia de Tráfego Municipal Curvelo'
  },
  bh_getulio_vargas: {
    key: 'bh_getulio_vargas',
    name: 'Av. Getúlio Vargas / Av. do Contorno (Savassi)',
    cityOrRegion: 'Belo Horizonte - MG',
    hierarchyKey: 'arterial_primaria',
    lanes: 4,
    isOneway: false,
    officialVdm: 32500,
    agencySource: 'BHTrans / Relatório de Mobilidade Urbana'
  },
  br381_fernao_dias: {
    key: 'br381_fernao_dias',
    name: 'Rodovia BR-381 Fernão Dias (Eixo Betim – Pouso Alegre)',
    cityOrRegion: 'Minas Gerais (Eixo Sul)',
    hierarchyKey: 'rodovia_dupla',
    lanes: 4,
    isOneway: false,
    officialVdm: 46000,
    agencySource: 'DNIT PNCT / Arteris Fernão Dias'
  }
};

export function getCityScaleTrafficFactor(cityTotalLightVehicles: number): number {
  if (cityTotalLightVehicles >= 800000) return 1.35; // Metrópole (ex.: BH)
  if (cityTotalLightVehicles >= 250000) return 1.15; // Grande Polo (ex.: Uberlândia, Contagem)
  if (cityTotalLightVehicles >= 70000) return 1.00;  // Cidade Média Polo (ex.: Sete Lagoas, Montes Claros)
  return 0.80;                                       // Cidade menor (< 70k leves, ex.: Curvelo)
}

export function calculateHcmVdm(
  hierarchyKey: RoadHierarchyKey,
  lanes: number,
  isOneway: boolean,
  cityTotalLightVehicles: number
): number {
  const spec = ROAD_HIERARCHY_HCM_SPECS[hierarchyKey] || ROAD_HIERARCHY_HCM_SPECS.coletora_bairro;
  const isHighway = hierarchyKey === 'rodovia_dupla' || hierarchyKey === 'rodovia_simples';
  const cityScale = isHighway ? 1.0 : getCityScaleTrafficFactor(cityTotalLightVehicles);
  const directionFactor = isOneway ? 0.78 : 1.0;
  const rawVdm = spec.baseDailyVolumePerLane * Math.max(1, lanes) * cityScale * directionFactor;
  return Math.max(500, Math.round(rawVdm / 100) * 100);
}

export function detectRoadDefaultsFromContext(contextText: string, cityKey: string): {
  hierarchyKey: RoadHierarchyKey;
  lanes: number;
  isOneway: boolean;
  corridorKey: string;
} {
  const norm = (contextText || '').toLowerCase();
  if (norm.includes('br-040') || norm.includes('br 040')) {
    if (norm.includes('curvelo') || norm.includes('décio') || norm.includes('decio')) {
      return { hierarchyKey: 'rodovia_dupla', lanes: 4, isOneway: false, corridorKey: 'br040_curvelo' };
    }
    return { hierarchyKey: 'rodovia_dupla', lanes: 4, isOneway: false, corridorKey: 'br040_sete_lagoas' };
  }
  if (norm.includes('br-251') || norm.includes('br 251') || norm.includes('dangelis') || norm.includes("d'angelis")) {
    return { hierarchyKey: 'rodovia_simples', lanes: 2, isOneway: false, corridorKey: 'br251_montes_claros' };
  }
  if (norm.includes('olavo bilac')) {
    return { hierarchyKey: 'coletora_bairro', lanes: 2, isOneway: false, corridorKey: 'sl_olavo_bilac' };
  }
  if (norm.includes('otávio campelo') || norm.includes('otavio campelo') || norm.includes('shopping sete lagoas')) {
    return { hierarchyKey: 'arterial_primaria', lanes: 4, isOneway: false, corridorKey: 'sl_otavio_campelo' };
  }
  if (norm.includes('bias fortes')) {
    return { hierarchyKey: 'arterial_primaria', lanes: 3, isOneway: false, corridorKey: 'curvelo_bias_fortes' };
  }
  if (norm.includes('savassi') || norm.includes('getúlio vargas') || norm.includes('getulio vargas')) {
    return { hierarchyKey: 'arterial_primaria', lanes: 4, isOneway: false, corridorKey: 'bh_getulio_vargas' };
  }
  if (cityKey === 'uberlandia' || norm.includes('uberlândia') || norm.includes('uberlandia')) {
    if (norm.includes('rondon pacheco') || norm.includes('joão naves') || norm.includes('joao naves')) {
      return { hierarchyKey: 'arterial_primaria', lanes: 6, isOneway: false, corridorKey: 'udi_rondon_pacheco' };
    }
    return { hierarchyKey: 'coletora_secundaria', lanes: 3, isOneway: false, corridorKey: 'udi_getulio_vargas' };
  }
  if (cityKey === 'belo_horizonte') {
    return { hierarchyKey: 'arterial_primaria', lanes: 4, isOneway: false, corridorKey: 'bh_getulio_vargas' };
  }
  return { hierarchyKey: 'coletora_bairro', lanes: 2, isOneway: false, corridorKey: 'sl_olavo_bilac' };
}

export interface NicheProfileMetadata {
  id: LocationNicheType;
  title: string;
  subtitle: string;
  recommendedCharger: string;
  typicalDwellTime: string;
  weights: {
    grid: number;
    traffic: number;
    fleet: number;
    dwell: number;
    comp: number;
  };
}

export const NICHE_PROFILES: Record<LocationNicheType, NicheProfileMetadata> = {
  highway: {
    id: 'highway',
    title: '1. Corredor Rodoviário / Viagem',
    subtitle: 'Postos de rodovia, paradas 24h e travessias intermunicipais',
    recommendedCharger: 'Rápido / Ultra-Rápido DC (60 kW a 350 kW)',
    typicalDwellTime: '15 a 30 minutos',
    weights: { grid: 0.35, traffic: 0.30, fleet: 0.15, dwell: 0.10, comp: 0.10 }
  },
  urban_hub: {
    id: 'urban_hub',
    title: '2. Hub Urbano de Bairro / App (Recarga Rápida)',
    subtitle: 'Vias arteriais, Ubers, táxis e moradores verticais sem tomada',
    recommendedCharger: 'Rápido DC (30 kW a 120 kW)',
    typicalDwellTime: '20 a 35 minutos',
    weights: { grid: 0.25, traffic: 0.30, fleet: 0.25, dwell: 0.10, comp: 0.10 }
  },
  destination: {
    id: 'destination',
    title: '3. Varejo de Destino, Lazer & Hotéis',
    subtitle: 'Shoppings, hipermercados, centros médicos e hotelaria',
    recommendedCharger: 'Wallbox AC (7.4 kW a 22 kW) ou DC (30 kW)',
    typicalDwellTime: '1 a 4 horas',
    weights: { grid: 0.20, traffic: 0.15, fleet: 0.20, dwell: 0.35, comp: 0.10 }
  },
  fleet_depot: {
    id: 'fleet_depot',
    title: '4. Frotas Corporativas & Last-Mile',
    subtitle: 'Pátios de vans, entregas urbanas (e-commerce) e carros de serviço',
    recommendedCharger: 'Misto AC (11-22 kW noturno) + DC (30-60 kW recarga rápida de turno)',
    typicalDwellTime: 'Janela de pátio ou pernoite',
    weights: { grid: 0.30, traffic: 0.05, fleet: 0.45, dwell: 0.10, comp: 0.10 }
  },
  heavy_duty: {
    id: 'heavy_duty',
    title: '5. Transporte Pesado & Eletroterminais',
    subtitle: 'Caminhões elétricos, carretas, ônibus e polos logísticos de carga',
    recommendedCharger: 'MCS / Ultra-Fast DC (> 150 kW até 1 MW)',
    typicalDwellTime: 'Parada da Lei do Motorista (30 a 60 min)',
    weights: { grid: 0.45, traffic: 0.10, fleet: 0.35, dwell: 0.05, comp: 0.05 }
  },
  residential: {
    id: 'residential',
    title: '6. Residencial Coletivo & Condomínios',
    subtitle: 'Garagens de prédios, condomínios fechados horizontais com rateio',
    recommendedCharger: 'Wallbox AC (7.4 kW a 11 kW) com DLM Obrigatório',
    typicalDwellTime: 'Pernoite (6 a 10 horas)',
    weights: { grid: 0.15, traffic: 0.05, fleet: 0.45, dwell: 0.25, comp: 0.10 }
  }
};

export interface BinaryFatalFlawGuards {
  has4gOrWifiConnectivity: boolean; // Conectividade celular/Wi-Fi para OCPP e gateway de pagamento
  isOutsideEnvironmentalProtectedArea: boolean; // Fora de APP ou terreno inundável
  hasPhysical24hAccess: boolean; // Acesso físico livre sem bloqueio noturno
  utilityFeasibilityApproved: boolean; // Viabilidade prévia ou sem veto da concessionária
}

export interface LocationInputData {
  niche?: LocationNicheType; // Nicho operacional do projeto
  vdmVehiclesPerDay: number; // Volume Diário Médio na via (veículos/dia)
  evFleetDensityPercent: number; // Penetração da frota de VE na região (%)
  commercialAnchor: CommercialAnchorType;
  gridCategory: ElectricalGridCategory;
  availablePowerKW: number; // Potência disponível na rede local
  competitorDistanceKM: number; // Distância até o próximo eletroposto DC rápido concorrente
  totalChargerPowerKW: number; // Potência nominal projetada para a estação
  averageDwellTimeMinutes?: number; // Tempo médio de permanência dos usuários
  isVerticalHousingArea?: boolean; // Região com alta densidade de prédios sem garagem (+demanda pública DC)
  fleetVehiclesCount?: number; // Quantidade de veículos dedicados (frotas / condomínios)
  latitude?: number;
  longitude?: number;
  fatalFlaws?: Partial<BinaryFatalFlawGuards>;
}

export interface NearbyChargingStation {
  id_estacao?: string;
  nome: string;
  latitude: number;
  longitude: number;
  potencia_kw: number;
  status: 'Disponível' | 'Ocupado' | 'Manutenção';
  distancia_km?: number;
  operador?: string;
  conectores?: string[];
  endereco?: string;
  cidade?: string;
}

export interface AntigravityGeoPayload {
  status: 'sucesso' | 'erro';
  ponto_referencia: { lat: number; lon: number };
  raio_busca_km: number;
  total_encontrado: number;
  estacoes: Array<{
    id_estacao?: string;
    nome: string;
    potencia_kw: number;
    status: 'Disponível' | 'Ocupado' | 'Manutenção';
    latitude: number;
    longitude: number;
    distancia_km: number;
    operador?: string;
    conectores?: string[];
    endereco?: string;
    cidade?: string;
    origem?: 'MANUAL_PLUGSHARE' | 'GOOGLE_PLACES' | 'OPENSTREETMAP';
  }>;
}


export interface LocationScoreBreakdown {
  selectedNiche: LocationNicheType;
  nicheWeights: { grid: number; traffic: number; fleet: number; dwell: number; comp: number };
  gridReadinessScore: number; // 0 a 100 (Peso dinâmico por nicho)
  trafficScore: number; // 0 a 100 (Peso dinâmico por nicho)
  fleetScore: number; // 0 a 100 (Peso dinâmico por nicho)
  trafficAndFleetScore: number; // 0 a 100 (Média retrocompatível)
  dwellTimeMatchScore: number; // 0 a 100
  competitionAndAccessScore: number; // 0 a 100
  
  weightedBaseScore: number; // Soma ponderada (0 a 100)
  fatalFlawMultiplier: number; // 1 (aprovado) ou 0 (vetado)
  totalScore: number; // weightedBaseScore * fatalFlawMultiplier

  rating: 'Excelente' | 'Muito Bom' | 'Viável com Ressalvas' | 'Não Aceitável (< 50 pts)' | 'Inviável / Fatal Flaw';
  verdictBadgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  fatalFlawReasons: string[];
  executiveSummary: string;
  keyRecommendations: string[];
}

export interface CustomRealEstateModelSpec {
  id: string;
  label: string;
  fixedRentBRL: number;
  revenueSharePercent: number;
  basis: 'gross' | 'net_margin';
}

export type CustomRealEstatePartnershipOption = CustomRealEstateModelSpec;

export interface FinancialModelingOptions {
  energySourceMode?: 'concessionaria' | 'solar' | 'hibrido';
  gridCostPerKWh?: number;
  solarCostPerKWh?: number;
  solarEnergyCostPerKWh?: number;
  solarSharePercent?: number;
  realEstateModel?: string;
  revenueSharePercent?: number;
  fixedRentBRL?: number;
  variableOpexPercent?: number;
  fixedOpexBRL?: number;
  customRealEstateModels?: CustomRealEstateModelSpec[];
}

export interface ScenarioProjection {
  name: 'Conservador' | 'Realista' | 'Otimista';
  operatingHoursPerDay: number;
  utilizationRatePercent: number;
  averageSessionMinutes: number;
  efficiencyFactor: number;
  passingEvsPerDay: number;
  captureRatePercent: number;
  dailySessions: number;
  dailyKWh: number;
  monthlyKWh: number;
  tariffPerKWh: number;
  energyCostPerKWh: number;
  energySourceMode: 'concessionaria' | 'solar' | 'hibrido';
  energySourceLabel: string;
  gridCostPerKWh: number;
  solarCostPerKWh: number;
  solarSharePercent: number;
  realEstateModel: string;
  realEstateLabel: string;
  realEstateModelLabel: string;
  monthlyRealEstateCost: number;
  variableOpexPercent: number;
  totalCapexBRL: number;
  monthlyGrossRevenue: number;
  monthlyEnergyCost: number;
  monthlyOpexVariable: number;
  monthlyOpexFixed: number;
  monthlyOpex: number;
  monthlyNetProfit: number;
  paybackMonths: number;
  paybackFormatted: string;
  paybackYearsAndMonthsLabel: string;
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

export type ParsedLocationResult = 
  | { type: 'coordinates'; lat: number; lon: number; raw: string }
  | { type: 'address'; query: string };

/**
 * PARSER INTELIGENTE DE ENTRADA GEOGRÁFICA
 * Identifica se a string é par de coordenadas GPS, link do Google Maps ou endereço textual
 */
export function parseLocationInput(raw: string): ParsedLocationResult {
  if (!raw) return { type: 'address', query: '' };
  const trimmed = raw.trim();

  // 1. Link do Google Maps contendo @lat,lon ou q=lat,lon ou ll=lat,lon
  if (trimmed.includes('google.com/maps') || trimmed.includes('maps.google') || trimmed.includes('goo.gl')) {
    const atMatch = trimmed.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (atMatch) {
      return {
        type: 'coordinates',
        lat: parseFloat(atMatch[1]),
        lon: parseFloat(atMatch[2]),
        raw: trimmed
      };
    }
    const qMatch = trimmed.match(/[?&](?:q|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (qMatch) {
      return {
        type: 'coordinates',
        lat: parseFloat(qMatch[1]),
        lon: parseFloat(qMatch[2]),
        raw: trimmed
      };
    }
  }

  // 2. Par de Coordenadas Numéricas Diretas (ex: -18.9104592, -48.3037299 ou -18.9104592 -48.3037299)
  const coordsRegex = /^\s*\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?\s*$/;
  const match = trimmed.match(coordsRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return {
        type: 'coordinates',
        lat: Number(lat.toFixed(7)),
        lon: Number(lon.toFixed(7)),
        raw: trimmed
      };
    }
  }

  return {
    type: 'address',
    query: trimmed
  };
}

/**
 * ESTIMATIVA DE DISTÂNCIA DE ROTA VIÁRIA (DRIVING DISTANCE)
 * Aplica fator médio de tortuosidade urbana brasileira (1.28x)
 */
export function estimateDrivingDistanceKM(straightLineKM: number): number {
  if (straightLineKM <= 0) return 0;
  const factor = straightLineKM < 1.0 ? 1.20 : 1.28;
  return Number((straightLineKM * factor).toFixed(2));
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
        id_estacao: st.id_estacao,
        nome: st.nome,
        potencia_kw: st.potencia_kw,
        status: st.status,
        latitude: st.latitude,
        longitude: st.longitude,
        distancia_km: dist,
        operador: st.operador,
        conectores: st.conectores,
        endereco: st.endereco,
        cidade: st.cidade
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

  const niche: LocationNicheType = raw.niche || 'urban_hub';

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
    niche,
    vdmVehiclesPerDay: vdm,
    evFleetDensityPercent: fleet,
    commercialAnchor: raw.commercialAnchor || 'comercio_geral',
    gridCategory: raw.gridCategory || 'bt_grupo_f_disponivel',
    availablePowerKW: power,
    competitorDistanceKM: typeof raw.competitorDistanceKM === 'number' ? raw.competitorDistanceKM : 4.5,
    totalChargerPowerKW: Number(raw.totalChargerPowerKW) || 60,
    averageDwellTimeMinutes: raw.averageDwellTimeMinutes || 35,
    isVerticalHousingArea: Boolean(raw.isVerticalHousingArea),
    fleetVehiclesCount: Number(raw.fleetVehiclesCount) || 20,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : -19.471676,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : -44.258735,
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
 * Fórmula Dinâmica dos 6 Nichos de Mercado:
 * S_x = [ (W_grid * C_grid) + (W_traffic * C_traffic) + (W_fleet * C_fleet) + (W_dwell * C_dwell) + (W_comp * C_comp) ] * Prod(F_j)
 */
export function calculateLocationScore(input: LocationInputData): LocationScoreBreakdown {
  const { cleanData } = validateLocationDataIntegrity(input);
  const selectedNiche = cleanData.niche || 'urban_hub';
  const profile = NICHE_PROFILES[selectedNiche] || NICHE_PROFILES.urban_hub;
  const W = profile.weights;

  // ─── A. PILAR 1: GRID READINESS & CAPACIDADE ELÉTRICA (W.grid) ───────────────
  let gridRaw = 60;
  if (cleanData.gridCategory === 'bt_grupo_f_disponivel') {
    gridRaw = 100; // Padrão existente adequado: dispensa subestação MT, sem custo de padrão (Plug & Play)
  } else if (cleanData.gridCategory === 'mt_subestacao_existente') {
    gridRaw = 90; // Trafo já existente com folga de kVA
  } else if (cleanData.gridCategory === 'ligacao_nova_bt') {
    gridRaw = 75; // Ligação Nova BT: Padrão novo homologado (obra simples em BT, custo previsto no CAPEX)
  } else if (cleanData.gridCategory === 'bt_convencional_pequena') {
    gridRaw = 65; // Padrão existente insuficiente: Requer aumento de padrão simples para 200A
  } else if (cleanData.gridCategory === 'mt_nova_necessaria' || cleanData.gridCategory === 'ligacao_nova_mt') {
    gridRaw = 30; // Exige cabine alvenaria MT / Subestação Nova (CAPEX elevado)
  }

  // Bonificação/Penalização pela relação Potência Disponível vs Demanda do Carregador
  if (cleanData.availablePowerKW >= cleanData.totalChargerPowerKW * 1.1) {
    gridRaw = Math.min(100, gridRaw + 10);
  } else if (cleanData.availablePowerKW < cleanData.totalChargerPowerKW * 0.8) {
    gridRaw = Math.max(20, gridRaw - 20); // Sobrecarga que exigirá DLM severo
  }

  // ─── B. PILAR 2: FLUXO DE TRÁFEGO & VISIBILIDADE (W.traffic) ──────────────────
  let trafficRaw = 50;
  if (selectedNiche === 'highway') {
    trafficRaw = Math.min(100, (cleanData.vdmVehiclesPerDay / 35000) * 100);
  } else if (selectedNiche === 'urban_hub') {
    trafficRaw = Math.min(100, (cleanData.vdmVehiclesPerDay / 20000) * 100);
  } else if (selectedNiche === 'destination') {
    trafficRaw = Math.min(100, (cleanData.vdmVehiclesPerDay / 15000) * 100);
  } else {
    // Para frotas, pesados e residencial: vias arteriais próximas facilitam acesso
    trafficRaw = Math.min(100, Math.max(50, (cleanData.vdmVehiclesPerDay / 8000) * 100));
  }

  // ─── C. PILAR 3: DENSIDADE DA FROTA ALVO (W.fleet) ──────────────────────────
  let fleetRaw = 50;
  if (selectedNiche === 'fleet_depot') {
    const fleetCount = cleanData.fleetVehiclesCount || 20;
    fleetRaw = Math.min(100, (fleetCount / 30) * 100);
  } else if (selectedNiche === 'heavy_duty') {
    const trucksCount = cleanData.fleetVehiclesCount || 10;
    fleetRaw = Math.min(100, (trucksCount / 15) * 100);
  } else {
    // Penetração da frota de VE na região (saturação aos 4.0%)
    fleetRaw = Math.min(100, (cleanData.evFleetDensityPercent / 4.0) * 100);
    if (cleanData.isVerticalHousingArea && (selectedNiche === 'urban_hub' || selectedNiche === 'residential')) {
      fleetRaw = Math.min(100, fleetRaw * 1.20); // Bônus de Habitação Vertical (+20%)
    }
  }

  const trafficFleetRaw = Number(((trafficRaw * 0.5) + (fleetRaw * 0.5)).toFixed(1));

  // ─── D. PILAR 4: DWELL TIME & COMPATIBILIDADE FÍSICA DE ENERGIA (W.dwell) ───
  const dwellEval = evaluateDwellTimeAndEnergyMatch(
    cleanData.commercialAnchor,
    cleanData.totalChargerPowerKW,
    cleanData.averageDwellTimeMinutes
  );
  const dwellRaw = dwellEval.dwellScore;

  // ─── E. PILAR 5: CONCORRÊNCIA & ÁREA DE CAPTAÇÃO (W.comp) ─────────────────────
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
    compRaw = 20; // Saturação iminente
  }

  // ─── CÁLCULO PONDERADO BASE COM OS PESOS DO NICHO SELECIONADO ──────────────
  const weightedBaseScore = Number((
    (gridRaw * W.grid) +
    (trafficRaw * W.traffic) +
    (fleetRaw * W.fleet) +
    (dwellRaw * W.dwell) +
    (compRaw * W.comp)
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

  // Determinação de Rating e Semáforo (Nota de Corte Mínima Aceitável = 50.0 pts)
  let rating: LocationScoreBreakdown['rating'] = 'Não Aceitável (< 50 pts)';
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
  } else {
    rating = 'Não Aceitável (< 50 pts)';
    verdictBadgeColor = 'rose';
  }

  const keyRecommendations: string[] = [];
  if (fatalFlawMultiplier === 0) {
    keyRecommendations.push("Projeto vetado no screening prévio. Resolver as restrições fatais antes de prosseguir com qualquer despesa de engenharia.");
  } else {
    keyRecommendations.push(`Nicho ativo: ${profile.title}. Tecnologia recomendada: ${profile.recommendedCharger}.`);
    if (cleanData.gridCategory === 'ligacao_nova_bt') {
      keyRecommendations.push("Classificado como Ligação Nova BT: O padrão de entrada homologado foi adicionado ao orçamento executivo (CAPEX). A rede local atende em baixa tensão sem necessidade de subestação.");
    } else if (cleanData.gridCategory === 'ligacao_nova_mt') {
      keyRecommendations.push("Classificado como Ligação Nova MT: A carga total requer implantação de subestação particular de média tensão, inclusa no orçamento com ART de projeto.");
    } else if (gridRaw >= 90) {
      keyRecommendations.push("Excelente prontidão elétrica: padrão existente atende sem custos de adequação de padrão (R$ 0,00 no orçamento).");
    } else if (gridRaw < 60) {
      keyRecommendations.push("Atenção à infraestrutura elétrica: aplicar Gestão Dinâmica DLM para mitigar custos de nova cabine primária MT.");
    }
    if (cleanData.isVerticalHousingArea) {
      keyRecommendations.push("Fator de habitação vertical favorável: alta demanda espontânea de moradores de edifícios sem recarga privada.");
    }
    if (compRaw < 50) {
      keyRecommendations.push("Presença de concorrente a menos de 2 km: apostar em diferencial de conveniência e preço competitivo por kWh.");
    }
  }

  return {
    selectedNiche,
    nicheWeights: W,
    gridReadinessScore: Number(gridRaw.toFixed(1)),
    trafficScore: Number(trafficRaw.toFixed(1)),
    fleetScore: Number(fleetRaw.toFixed(1)),
    trafficAndFleetScore: trafficFleetRaw,
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
      : `Score Científico AHP (${profile.title}): ${totalScore}/100 (${rating}). Rede (${Math.round(W.grid * 100)}%): ${gridRaw}/100, Tráfego (${Math.round(W.traffic * 100)}%): ${trafficRaw.toFixed(0)}/100, Frota (${Math.round(W.fleet * 100)}%): ${fleetRaw.toFixed(0)}/100, Dwell (${Math.round(W.dwell * 100)}%): ${dwellRaw}/100, Concorrência (${Math.round(W.comp * 100)}%): ${compRaw}/100.`,
    keyRecommendations
  };
}

/**
 * Formata um número de meses em "X meses (Y anos e Z meses)" para exibição clara de Payback (Foto 02)
 */
export function formatPaybackMonthsAndYears(paybackMonths: number): string {
  if (!Number.isFinite(paybackMonths) || paybackMonths <= 0 || paybackMonths >= 900) {
    return 'Indeterminado (Lucro <= 0)';
  }
  const roundedMonths = Math.round(paybackMonths);
  const years = Math.floor(roundedMonths / 12);
  const remMonths = roundedMonths % 12;

  let yearsPart = '';
  if (years === 0) {
    yearsPart = `${roundedMonths} ${roundedMonths === 1 ? 'mês' : 'meses'}`;
  } else if (remMonths === 0) {
    yearsPart = `${years} ${years === 1 ? 'ano' : 'anos'}`;
  } else {
    yearsPart = `${years} ${years === 1 ? 'ano' : 'anos'} e ${remMonths} ${remMonths === 1 ? 'mês' : 'meses'}`;
  }

  return `${paybackMonths.toFixed(1)} meses (${yearsPart})`;
}

/**
 * 3. PROJEÇÃO FINANCEIRA & OPERACIONAL EM 3 CENÁRIOS (CONECTADA AO QUADRO BLEV — FOTOS 01 E 02)
 */
export function calculateScenarioProjections(
  input: LocationInputData,
  totalCapex: number = 95000,
  tariffPerKWh: number = 2.10,
  energyCostPerKWh: number = 0.85,
  financialOptions?: FinancialModelingOptions
): ScenarioProjection[] {
  const { cleanData } = validateLocationDataIntegrity(input);
  const chargerPowerKW = cleanData.totalChargerPowerKW;
  const sessionMinutes = cleanData.averageDwellTimeMinutes || 35;
  const efficiencyFactor = 0.82; // Fator médio de absorção da curva CC/CV (82% da potência nominal)
  const passingEvsPerDay = Math.max(1, Math.round(cleanData.vdmVehiclesPerDay * (cleanData.evFleetDensityPercent / 100)));

  const energySourceMode = financialOptions?.energySourceMode || 'concessionaria';
  const gridCostPerKWh = energyCostPerKWh;
  const solarCostPerKWh = financialOptions?.solarEnergyCostPerKWh ?? 0.39;
  const solarSharePercent = financialOptions?.solarSharePercent ?? 50;

  let effectiveEnergyCostPerKWh = gridCostPerKWh;
  let energySourceLabel = '100% Concessionária';
  if (energySourceMode === 'solar') {
    effectiveEnergyCostPerKWh = solarCostPerKWh;
    energySourceLabel = '100% Energia Solar Fotovoltaica';
  } else if (energySourceMode === 'hibrido') {
    const solarWeight = Math.min(100, Math.max(0, solarSharePercent)) / 100;
    effectiveEnergyCostPerKWh = Number(((solarCostPerKWh * solarWeight) + (gridCostPerKWh * (1 - solarWeight))).toFixed(3));
    energySourceLabel = `Mix Híbrido (${solarSharePercent}% Solar + ${100 - solarSharePercent}% Concessionária)`;
  }

  const variableOpexPct = financialOptions?.variableOpexPercent ?? 12;
  const fixedOpexBRL = financialOptions?.fixedOpexBRL ?? 350;
  const realEstateModel = financialOptions?.realEstateModel || 'comodato';
  const revSharePct = financialOptions?.revenueSharePercent ?? 10;
  const fixedRentBRL = financialOptions?.fixedRentBRL ?? 500;
  const customModels = financialOptions?.customRealEstateModels || [];

  const scenariosDef = [
    { name: 'Conservador' as const, hours: 3.0, rate: 25 },
    { name: 'Realista' as const, hours: 6.0, rate: 50 },
    { name: 'Otimista' as const, hours: 9.0, rate: 75 }
  ];

  return scenariosDef.map(sc => {
    const avgSessionHours = Math.max(0.25, sessionMinutes / 60);
    const dailySessions = Number((sc.hours / avgSessionHours).toFixed(1));
    const captureRatePercent = Number(((dailySessions / passingEvsPerDay) * 100).toFixed(2));
    const dailyKWh = Number((chargerPowerKW * sc.hours * efficiencyFactor).toFixed(1));
    const monthlyKWh = Number((dailyKWh * 30).toFixed(1));

    const monthlyGrossRevenue = Number((monthlyKWh * tariffPerKWh).toFixed(2));
    const monthlyEnergyCost = Number((monthlyKWh * effectiveEnergyCostPerKWh).toFixed(2));
    const marginAfterEnergy = Math.max(0, monthlyGrossRevenue - monthlyEnergyCost);
    const monthlyOpexVariable = Number((monthlyGrossRevenue * (variableOpexPct / 100)).toFixed(2));
    const monthlyOpexFixed = Number(fixedOpexBRL.toFixed(2));
    const monthlyOpex = Number((monthlyOpexVariable + monthlyOpexFixed).toFixed(2));

    let monthlyRealEstateCost = 0;
    let realEstateLabel = 'Comodato Gratuito (0%)';

    if (realEstateModel === 'comodato') {
      monthlyRealEstateCost = 0;
      realEstateLabel = 'Comodato Gratuito (0%)';
    } else if (realEstateModel === 'revenue_share' || realEstateModel === 'revenue_share_bruto') {
      monthlyRealEstateCost = Number((monthlyGrossRevenue * (revSharePct / 100)).toFixed(2));
      realEstateLabel = `Revenue Share Bruto (${revSharePct}%)`;
    } else if (realEstateModel === 'revenue_share_liquido') {
      monthlyRealEstateCost = Number((marginAfterEnergy * (revSharePct / 100)).toFixed(2));
      realEstateLabel = `Participação Margem Pós-Energia (${revSharePct}%)`;
    } else if (realEstateModel === 'aluguel_fixo') {
      monthlyRealEstateCost = Number(fixedRentBRL.toFixed(2));
      realEstateLabel = `Aluguel Fixo (R$ ${fixedRentBRL.toLocaleString('pt-BR')}/mês)`;
    } else if (realEstateModel === 'misto') {
      monthlyRealEstateCost = Number((fixedRentBRL + monthlyGrossRevenue * (revSharePct / 100)).toFixed(2));
      realEstateLabel = `Misto (R$ ${fixedRentBRL.toLocaleString('pt-BR')} + ${revSharePct}%)`;
    } else if (realEstateModel === 'reembolso_energia_split') {
      const netBeforeSplit = Math.max(0, marginAfterEnergy - monthlyOpex);
      monthlyRealEstateCost = Number((netBeforeSplit * (revSharePct / 100)).toFixed(2));
      realEstateLabel = `Reembolso Energia + Split Lucro (${revSharePct}%)`;
    } else {
      const foundCustom = customModels.find(m => m.id === realEstateModel);
      if (foundCustom) {
        const baseForShare = foundCustom.basis === 'net_margin' ? marginAfterEnergy : monthlyGrossRevenue;
        monthlyRealEstateCost = Number((foundCustom.fixedRentBRL + baseForShare * (foundCustom.revenueSharePercent / 100)).toFixed(2));
        realEstateLabel = `${foundCustom.label} (${foundCustom.fixedRentBRL > 0 ? `R$ ${foundCustom.fixedRentBRL} + ` : ''}${foundCustom.revenueSharePercent}%)`;
      }
    }

    const monthlyNetProfit = Number((monthlyGrossRevenue - monthlyEnergyCost - monthlyOpex - monthlyRealEstateCost).toFixed(2));

    const paybackMonths = monthlyNetProfit > 0 
      ? Number((totalCapex / monthlyNetProfit).toFixed(1)) 
      : 999;

    const paybackYearsAndMonthsLabel = formatPaybackMonthsAndYears(paybackMonths);

    return {
      name: sc.name,
      operatingHoursPerDay: sc.hours,
      utilizationRatePercent: sc.rate,
      averageSessionMinutes: sessionMinutes,
      efficiencyFactor,
      passingEvsPerDay,
      captureRatePercent,
      dailySessions,
      dailyKWh,
      monthlyKWh,
      tariffPerKWh,
      energyCostPerKWh: effectiveEnergyCostPerKWh,
      energySourceMode,
      gridCostPerKWh,
      solarCostPerKWh,
      solarSharePercent,
      energySourceLabel,
      totalCapexBRL: totalCapex,
      monthlyGrossRevenue,
      monthlyEnergyCost,
      monthlyOpexVariable,
      monthlyOpexFixed,
      monthlyOpex,
      monthlyRealEstateCost,
      realEstateModel,
      realEstateLabel,
      realEstateModelLabel: realEstateLabel,
      variableOpexPercent: variableOpexPct,
      monthlyNetProfit,
      paybackMonths,
      paybackFormatted: paybackYearsAndMonthsLabel,
      paybackYearsAndMonthsLabel
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
