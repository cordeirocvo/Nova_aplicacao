/**
 * Cordeiro Energia — Unified EV Calculation Engine
 * 
 * Fonte da verdade única (Single Source of Truth) para dimensionamento de eletropostos:
 * - Normas: ABNT NBR 5410, ABNT NBR 17019, IEC 61851
 * - Concessionárias: CEMIG ND-5.1 / ND-5.3, CPFL GED-13, Energisa NDU-001
 * - Proteções: DR Tipo B / Tipo A + RDC-DD 6mA, DPS Classe II, Desligamento de Emergência NBR 17019
 * - Gestão de Demanda (DLM) e Dimensionamento de Subestação/Transformador
 * - Lista de Materiais Dinâmica (BOM) Enriquecida com Preços de Mercado e Homologação CEMIG PEC-11
 */

import { ConfiguredCharger } from "@/lib/coenergygo";
import { findRecommendedCategory } from "./utilityStandards";
import { MARKET_PRICING_CATALOG } from "@/lib/coenergygo/database/bomPricingDatabase";

export interface UnifiedCalculationInput {
  chargers: Array<{
    id?: string;
    powerKW: number;
    phases: 1 | 3;
    voltage: number;
    quantity: number;
    type?: 'AC' | 'DC';
    connector?: string;
    currentInA?: number;
    brand?: string;
    model?: string;
    hasBuiltinRDCDD?: boolean;
  }>;
  existingLoadKW?: number;
  simultaneityFactor?: number;
  utility?: 'CEMIG' | 'CPFL' | 'ENERGISA';
  distanceMeters?: number;
  installationMethod?: 'B1' | 'B2' | 'C' | 'D';
  conductorMaterial?: 'copper' | 'aluminum';
  existingBreakerA?: number;
  existingContractedDemandKW?: number;
  hasTransformer?: boolean;
  transformerPrimaryVoltage?: number;
  transformerSecondaryVoltage?: number;
  transformerDistanceM?: number;
  dlmEnabled?: boolean;
  dlmLimitKW?: number;
}

export interface UnifiedBOMItem {
  id: string;
  category: 'cables' | 'protection' | 'panels' | 'safety' | 'infrastructure' | 'labor';
  code: string;
  description: string;
  manufacturer: string;
  unit: string;
  quantity: number;
  unitPriceBRL: number;
  totalPriceBRL: number;
}

export interface UnifiedCalculationOutput {
  // Potências e Demandas
  totalInstalledPowerKW: number;
  effectiveDemandKW: number;
  effectiveDemandKVA: number;
  avgPowerFactor: number;
  
  // Correntes de Projeto
  nominalCurrentA: number;
  correctedCurrentA: number;
  
  // Condutores e Queda de Tensão
  recommendedCableGaugeMM2: number;
  groundCableGaugeMM2: number;
  neutralCableGaugeMM2: number;
  voltageDropPercent: number;
  isVoltageDropAcceptable: boolean; // <= 4% NBR 5410
  
  // Proteções e Concessionária
  recommendedMainBreakerA: number;
  utilityCategory: string;
  utilityStandardName: string;
  isExistingBreakerAdequate: boolean;
  requiresUtilityApproval: boolean;
  
  // Transformador / Subestação
  needsDedicatedTransformer: boolean;
  recommendedTransformerKVA: number;
  transformerPrimaryBreakerA?: number;
  transformerSecondaryBreakerA?: number;
  
  // DLM & Gestão de Carga
  isDLMRecommended: boolean;
  isDLMMandatory: boolean;
  dlmEstimatedSavingsBRL: number;
  curtailedPowerKW: number;
  
  // Semáforo Cordeiro (3 Cores)
  statusTrafficLight: 'IDEAL' | 'ATENCAO' | 'INTERVENCAO';
  statusMessage: string;
  
  // Lista de Materiais e CAPEX Estimado
  bom: UnifiedBOMItem[];
  totalMaterialsCostBRL: number;
  estimatedLaborCostBRL: number;
  totalEstimatedCapexBRL: number;
}

// ─── TABELAS NBR 5410 & PADRÕES ─────────────────────────────────────────────
const STANDARD_BREAKERS = [16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 160, 175, 200, 225, 250, 300, 350, 400, 500, 630, 800];
const STANDARD_TRAFOS_KVA = [15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000];

// Capacidades de condução de corrente (Cobre, PVC, 70°C, 3 condutores carregados B1)
const AMPACITY_COPPER_B1: Record<number, number> = {
  2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134,
  70: 171, 95: 207, 120: 239, 150: 272, 185: 311, 240: 366
};

// Capacidades de condução de corrente (Cobre, XLPE/EPR, 90°C, Método C)
const AMPACITY_COPPER_C_XLPE: Record<number, number> = {
  2.5: 31, 4: 42, 6: 54, 10: 75, 16: 100, 25: 133, 35: 164, 50: 198,
  70: 253, 95: 306, 120: 354, 150: 407, 185: 464, 240: 546
};

export function calculateUnifiedEVSizing(input: UnifiedCalculationInput): UnifiedCalculationOutput {
  const {
    chargers,
    existingLoadKW = 0,
    simultaneityFactor = 0.85,
    utility = 'CEMIG',
    distanceMeters = 25,
    existingBreakerA = 63,
    dlmEnabled = false,
    dlmLimitKW = 0,
    hasTransformer = false,
    transformerPrimaryVoltage = 220,
    transformerSecondaryVoltage = 380
  } = input;

  // 1. Carga total dos carregadores
  const totalInstalledPowerKW = chargers.reduce((acc, c) => acc + (c.powerKW * (c.quantity || 1)), 0);
  
  // Identifica se há carregadores DC
  const hasDC = chargers.some(c => c.type === 'DC' || c.powerKW >= 30);
  const avgPowerFactor = hasDC ? 0.98 : 0.95;

  // 2. Demanda efetiva considerando simultaneidade ou limitação por DLM
  let calculatedDemandKW = (totalInstalledPowerKW * simultaneityFactor) + existingLoadKW;
  let curtailedPowerKW = 0;

  if (dlmEnabled && dlmLimitKW > 0 && calculatedDemandKW > dlmLimitKW) {
    curtailedPowerKW = calculatedDemandKW - dlmLimitKW;
    calculatedDemandKW = dlmLimitKW;
  }

  const effectiveDemandKW = calculatedDemandKW;
  const effectiveDemandKVA = effectiveDemandKW / avgPowerFactor;

  // 3. Corrente nominal de projeto Ib (Trifásico 380V ou 220V)
  const isTrifasico = chargers.some(c => c.phases === 3) || totalInstalledPowerKW > 10;
  const nominalVoltage = isTrifasico ? (hasTransformer ? transformerSecondaryVoltage : 380) : 220;

  let nominalCurrentA = 0;
  if (isTrifasico) {
    nominalCurrentA = (effectiveDemandKW * 1000) / (Math.sqrt(3) * nominalVoltage * avgPowerFactor);
  } else {
    nominalCurrentA = (effectiveDemandKW * 1000) / (nominalVoltage * avgPowerFactor);
  }

  // Fator de agrupamento e temperatura (NBR 5410)
  const correctionFactor = 0.85 * 0.94; // Agrupamento de 2 circuitos + Temp 35°C
  const correctedCurrentA = nominalCurrentA / correctionFactor;

  // 4. Seleção de Disjuntor Geral
  const recommendedMainBreakerA = STANDARD_BREAKERS.find(b => b >= nominalCurrentA * 1.15) || 800;

  // 5. Dimensionamento do Condutor (Cobre, XLPE 90°C)
  const availableGauges = [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
  let recommendedCableGaugeMM2 = 2.5;

  for (const gauge of availableGauges) {
    const ampacity = AMPACITY_COPPER_C_XLPE[gauge] || 30;
    if (ampacity >= correctedCurrentA) {
      recommendedCableGaugeMM2 = gauge;
      break;
    }
  }

  // 6. Queda de Tensão (NBR 5410 - máx 4% para ramais terminais)
  // Resistividade do cobre rho = 0.0178 ohm*mm2/m a 20°C
  const rho = 0.023; // corrigido a 70°C
  let voltageDropVolts = 0;
  if (isTrifasico) {
    voltageDropVolts = (Math.sqrt(3) * rho * distanceMeters * nominalCurrentA * avgPowerFactor) / recommendedCableGaugeMM2;
  } else {
    voltageDropVolts = (2 * rho * distanceMeters * nominalCurrentA * avgPowerFactor) / recommendedCableGaugeMM2;
  }
  let voltageDropPercent = (voltageDropVolts / nominalVoltage) * 100;

  // Se a queda de tensão ultrapassar 4%, incrementa a bitola
  while (voltageDropPercent > 4.0 && recommendedCableGaugeMM2 < 240) {
    const nextIdx = availableGauges.indexOf(recommendedCableGaugeMM2) + 1;
    if (nextIdx < availableGauges.length) {
      recommendedCableGaugeMM2 = availableGauges[nextIdx];
      if (isTrifasico) {
        voltageDropVolts = (Math.sqrt(3) * rho * distanceMeters * nominalCurrentA * avgPowerFactor) / recommendedCableGaugeMM2;
      } else {
        voltageDropVolts = (2 * rho * distanceMeters * nominalCurrentA * avgPowerFactor) / recommendedCableGaugeMM2;
      }
      voltageDropPercent = (voltageDropVolts / nominalVoltage) * 100;
    } else {
      break;
    }
  }

  const isVoltageDropAcceptable = voltageDropPercent <= 4.0;

  // Condutor de Proteção (Terra) segundo Tabela 58 da NBR 5410
  let groundCableGaugeMM2 = recommendedCableGaugeMM2;
  if (recommendedCableGaugeMM2 > 16 && recommendedCableGaugeMM2 <= 35) {
    groundCableGaugeMM2 = 16;
  } else if (recommendedCableGaugeMM2 > 35) {
    groundCableGaugeMM2 = recommendedCableGaugeMM2 / 2;
  }

  // Neutro
  const neutralCableGaugeMM2 = recommendedCableGaugeMM2;

  // 7. Concessionária & Categoria (CEMIG ND-5.1 / ND-5.3)
  const utilityRec = findRecommendedCategory(utility, effectiveDemandKVA);
  const utilityCategory = utilityRec?.id ? `Categoria ${utilityRec.id}` : (effectiveDemandKVA <= 76 ? "C3 / C4" : "Grupo F (Especial)");
  const utilityStandardName = effectiveDemandKVA > 76 ? `${utility} ND-5.3 (Média Tensão / Subestação)` : `${utility} ND-5.1 (Baixa Tensão)`;
  const requiresUtilityApproval = effectiveDemandKVA > 38 || hasDC;

  // 8. Transformador Dedicado
  const needsDedicatedTransformer = hasTransformer || effectiveDemandKVA > 76 || (totalInstalledPowerKW >= 40 && nominalVoltage === 380 && transformerPrimaryVoltage === 220);
  const recommendedTransformerKVA = needsDedicatedTransformer
    ? (STANDARD_TRAFOS_KVA.find(t => t >= effectiveDemandKVA * 1.1) || 500)
    : 0;

  // 9. Análise de DLM & Necessidade de Intervenção
  const isExistingBreakerAdequate = existingBreakerA >= recommendedMainBreakerA;
  const isDLMRecommended = !isExistingBreakerAdequate && !hasTransformer;
  const isDLMMandatory = totalInstalledPowerKW + existingLoadKW > 76 && !hasTransformer && !dlmEnabled;

  // Estimativa de economia do DLM (evita adequação de padrão MT ou troca de trafo)
  const dlmEstimatedSavingsBRL = isDLMRecommended
    ? (effectiveDemandKVA > 76 ? 85000 : 28000)
    : 0;

  // 10. Semáforo Cordeiro (3 Cores)
  let statusTrafficLight: 'IDEAL' | 'ATENCAO' | 'INTERVENCAO' = 'IDEAL';
  let statusMessage = "Padrão de energia plenamente compatível com os carregadores selecionados.";

  if (isDLMMandatory || effectiveDemandKVA > 150) {
    statusTrafficLight = 'INTERVENCAO';
    statusMessage = "Demanda excede o padrão de BT existente. Exige subestação dedicada ou DLM ativo com corte dinâmico.";
  } else if (isDLMRecommended || !isExistingBreakerAdequate || voltageDropPercent > 3.0) {
    statusTrafficLight = 'ATENCAO';
    statusMessage = "Disjuntor ou queda de tensão próximos do limite. DLM recomendado para evitar aumento de padrão.";
  }

  // 11. Geração da Lista de Materiais Dinâmica (BOM)
  const bom: UnifiedBOMItem[] = [];

  // Cabos de Alimentação Principal
  const totalCableLengthM = distanceMeters * (isTrifasico ? 5 : 3); // 3F + N + PE ou F + N + PE
  const cableUnitPrice = recommendedCableGaugeMM2 >= 70 ? 98.0 : (recommendedCableGaugeMM2 >= 35 ? 48.0 : (recommendedCableGaugeMM2 >= 16 ? 24.0 : 12.5));
  bom.push({
    id: "bom_cables_main",
    category: "cables",
    code: `CABO-EPR-061KV-${recommendedCableGaugeMM2}MM`,
    description: `Cabo de Cobre Unipolar 0,6/1kV HEPR/XLPE 90°C Classe 5 - ${recommendedCableGaugeMM2} mm²`,
    manufacturer: "Prysmian / Cobrecom / Sil (Homologado)",
    unit: "metros",
    quantity: totalCableLengthM,
    unitPriceBRL: cableUnitPrice,
    totalPriceBRL: totalCableLengthM * cableUnitPrice
  });

  // Disjuntor Geral Caixa Moldada (MCCB)
  const mccbPrice = recommendedMainBreakerA >= 200 ? 1250.0 : (recommendedMainBreakerA >= 100 ? 580.0 : 320.0);
  bom.push({
    id: "bom_breaker_main",
    category: "protection",
    code: `DISJ-MCCB-${recommendedMainBreakerA}A`,
    description: `Disjuntor Caixa Moldada Tripolar ${recommendedMainBreakerA}A Icu ≥ 25kA (Homologado CEMIG PEC-11)`,
    manufacturer: "WEG / Schneider / Soprano",
    unit: "unid",
    quantity: 1,
    unitPriceBRL: mccbPrice,
    totalPriceBRL: mccbPrice
  });

  // Proteções por Ponto de Recarga (Disjuntores Terminais + DR)
  chargers.forEach((chg, idx) => {
    const chgQty = chg.quantity || 1;
    const chgCurrent = (chg.powerKW * 1000) / ((chg.phases === 3 ? Math.sqrt(3) * 380 : 220) * 0.95);
    const chgBreakerA = STANDARD_BREAKERS.find(b => b >= chgCurrent * 1.25) || 40;

    // Disjuntor DIN
    bom.push({
      id: `bom_breaker_chg_${idx}`,
      category: "protection",
      code: `DISJ-DIN-${chg.phases}P-${chgBreakerA}A`,
      description: `Disjuntor Miniatura DIN ${chg.phases === 3 ? 'Tripolar' : 'Bipolar'} Curva C ${chgBreakerA}A 10kA (Ponto VE ${idx + 1})`,
      manufacturer: "WEG / Soprano (PEC-11)",
      unit: "unid",
      quantity: chgQty,
      unitPriceBRL: chg.phases === 3 ? 85.0 : 48.0,
      totalPriceBRL: chgQty * (chg.phases === 3 ? 85.0 : 48.0)
    });

    // DR Tipo B (se não tiver RDC-DD 6mA interno no carregador)
    const needsTypeB = !chg.hasBuiltinRDCDD && chg.brand !== "BENY" && chg.brand !== "WEG";
    const drPrice = needsTypeB ? 850.0 : 185.0;
    bom.push({
      id: `bom_dr_chg_${idx}`,
      category: "protection",
      code: needsTypeB ? `DR-TYPE-B-${chgBreakerA}A` : `DR-TYPE-A-${chgBreakerA}A`,
      description: needsTypeB 
        ? `Dispositivo DR Tetrapolar Tipo B 30mA ${chgBreakerA}A (Imunidade Corrente Residual DC 6mA NBR 17019)`
        : `Dispositivo DR ${chg.phases === 3 ? 'Tetrapolar' : 'Bipolar'} Tipo A 30mA ${chgBreakerA}A (Compatível com RDC-DD)`,
      manufacturer: "Schneider / WEG",
      unit: "unid",
      quantity: chgQty,
      unitPriceBRL: drPrice,
      totalPriceBRL: chgQty * drPrice
    });
  });

  // DPS Classe II (Proteção contra Surtos)
  const dpsQty = isTrifasico ? 4 : 2; // 3 Fases + Neutro
  bom.push({
    id: "bom_dps",
    category: "protection",
    code: "DPS-CLASSE-II-45KA",
    description: "DPS Monopolar Classe II 45kA 275V Plugue Extraível (Norma IEC 61643-11)",
    manufacturer: "Clamper / WEG",
    unit: "unid",
    quantity: dpsQty,
    unitPriceBRL: 98.0,
    totalPriceBRL: dpsQty * 98.0
  });

  // Sistema Obrigatório de Desligamento de Emergência (NBR 17019 / Bombeiros)
  bom.push({
    id: "bom_emergency_button",
    category: "safety",
    code: "BOTAO-EMERG-COGUMELO",
    description: "Botão de Emergência Tipo Cogumelo com Trava/Giro IP65 (Posicionado a ≥ 5m dos carregadores)",
    manufacturer: "Soprano / Schneider / WEG",
    unit: "unid",
    quantity: 1,
    unitPriceBRL: 145.0,
    totalPriceBRL: 145.0
  });

  bom.push({
    id: "bom_shunt_trip",
    category: "safety",
    code: "BOBINA-DISPARO-MX",
    description: "Bobina de Disparo MX 220V CA acoplada ao Disjuntor Geral dos Carregadores (Acionamento Remoto)",
    manufacturer: "WEG / Soprano",
    unit: "unid",
    quantity: 1,
    unitPriceBRL: 285.0,
    totalPriceBRL: 285.0
  });

  // Transformador (quando aplicável)
  if (needsDedicatedTransformer) {
    const trafoPrice = recommendedTransformerKVA >= 150 ? 42000.0 : (recommendedTransformerKVA >= 75 ? 26000.0 : 18500.0);
    bom.push({
      id: "bom_transformer",
      category: "panels",
      code: `TRAFO-A-SECO-${recommendedTransformerKVA}KVA`,
      description: `Transformador a Seco / Óleo ${recommendedTransformerKVA} kVA (Primário ${transformerPrimaryVoltage}V / Secundário ${transformerSecondaryVoltage}V)`,
      manufacturer: "WEG / Romagnole / Tamura",
      unit: "unid",
      quantity: 1,
      unitPriceBRL: trafoPrice,
      totalPriceBRL: trafoPrice
    });
  }

  // Totais
  const totalMaterialsCostBRL = bom.reduce((sum, item) => sum + item.totalPriceBRL, 0);
  const estimatedLaborCostBRL = Math.round(totalMaterialsCostBRL * 0.35); // 35% de mão de obra e montagem especializada
  const totalEstimatedCapexBRL = totalMaterialsCostBRL + estimatedLaborCostBRL;

  return {
    totalInstalledPowerKW,
    effectiveDemandKW,
    effectiveDemandKVA,
    avgPowerFactor,
    nominalCurrentA: Math.round(nominalCurrentA * 10) / 10,
    correctedCurrentA: Math.round(correctedCurrentA * 10) / 10,
    recommendedCableGaugeMM2,
    groundCableGaugeMM2,
    neutralCableGaugeMM2,
    voltageDropPercent: Math.round(voltageDropPercent * 100) / 100,
    isVoltageDropAcceptable,
    recommendedMainBreakerA,
    utilityCategory,
    utilityStandardName,
    isExistingBreakerAdequate,
    requiresUtilityApproval,
    needsDedicatedTransformer,
    recommendedTransformerKVA,
    isDLMRecommended,
    isDLMMandatory,
    dlmEstimatedSavingsBRL,
    curtailedPowerKW,
    statusTrafficLight,
    statusMessage,
    bom,
    totalMaterialsCostBRL,
    estimatedLaborCostBRL,
    totalEstimatedCapexBRL
  };
}
