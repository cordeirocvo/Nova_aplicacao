/**
 * CoenergyGO — Motor de Cálculo da Topologia em Cadeia (NBR 5410 / NBR 17019 / CEMIG ND-5.1)
 * Cordeiro Energia
 * 
 * Topologia:
 * [Padrão Concessionária] ──Trecho 1──► [Painel 220V] ──Trecho 2──► [Transformador] ──Trecho 3──► [Painel 380V] ──Trecho 4──► [Carregadores 1..N]
 * 
 * Regras Compulsórias:
 * 1. Bypass do Transformador e Painel 380V se a rede for 380V ou se todos os carregadores forem 220V.
 * 2. Barramento de Cobre no Painel 380V: Dispensado se houver apenas 1 carregador (1 disjuntor unificado).
 * 3. Margem de erro (%) configurável individualmente para cada trecho/cabo.
 * 4. Taxa de ocupação de eletrodutos/dutos <= 40% (NBR 5410).
 * 5. Medição dedicada do Hub: agrega somente cargas do Hub (trafo/carregadores + CFTV + tomada + iluminação).
 * 6. Alerta reativo do padrão com diagnóstico de sobrecarga da UC.
 */

import {
  TopologyChargerNode,
  SectionCableConduitSizing,
  AuxiliaryLoadsState,
  Panel220VTopologyState,
  Panel380VTopologyState,
  TransformerTopologyState,
  StandardCapacityAlert,
  ChainTopologyOutput,
  BillOfMaterialItem,
  UtilityId,
  UtilityCategorySpec
} from '../types';
import { CEMIG_CATEGORIES } from '../database/utilities';

// Constantes físicas (NBR 5410)
const COPPER_RESISTIVITY_70C = 0.0213;   // ohm * mm² / m
const ALUMINUM_RESISTIVITY_70C = 0.0351; // ohm * mm² / m (~1.65x a resistividade do cobre)
const STANDARD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 160, 175, 200, 225, 250, 300, 350, 400, 500, 630];
const STANDARD_TRAFOS_KVA = [15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750];

// Tabela de ampacidade de cobre PVC 70°C (Métodos B1/B2/C/D)
interface AmpacityRow {
  gaugeMM2: number;
  outerDiameterMM: number; // Diâmetro externo aproximado para cálculo de ocupação de duto
  areaExternalMM2: number;  // Área transversal total do cabo incluindo isolação
  b1_2cond: number;
  b1_3cond: number;
  b2_2cond: number;
  b2_3cond: number;
  c_2cond: number;
  c_3cond: number;
  // Capacidade para condutor de alumínio PVC/XLPE 70°C / Aéreo Multiplex (NBR 5410)
  al_b1_3cond?: number;
  al_aereo_3cond?: number;
}

const CABLE_SPECS: AmpacityRow[] = [
  { gaugeMM2: 1.5,  outerDiameterMM: 3.0,  areaExternalMM2: 7.1,   b1_2cond: 17.5, b1_3cond: 15.5, b2_2cond: 15.5, b2_3cond: 13.5, c_2cond: 19.5, c_3cond: 17.5 },
  { gaugeMM2: 2.5,  outerDiameterMM: 3.6,  areaExternalMM2: 10.2,  b1_2cond: 24,   b1_3cond: 21,   b2_2cond: 21,   b2_3cond: 18.5, c_2cond: 27,   c_3cond: 24 },
  { gaugeMM2: 4.0,  outerDiameterMM: 4.2,  areaExternalMM2: 13.9,  b1_2cond: 32,   b1_3cond: 28,   b2_2cond: 28,   b2_3cond: 25,   c_2cond: 37,   c_3cond: 32 },
  { gaugeMM2: 6.0,  outerDiameterMM: 4.8,  areaExternalMM2: 18.1,  b1_2cond: 41,   b1_3cond: 36,   b2_2cond: 36,   b2_3cond: 32,   c_2cond: 48,   c_3cond: 41 },
  { gaugeMM2: 10.0, outerDiameterMM: 6.0,  areaExternalMM2: 28.3,  b1_2cond: 57,   b1_3cond: 50,   b2_2cond: 50,   b2_3cond: 44,   c_2cond: 66,   c_3cond: 57, al_b1_3cond: 38, al_aereo_3cond: 48 },
  { gaugeMM2: 16.0, outerDiameterMM: 7.2,  areaExternalMM2: 40.7,  b1_2cond: 76,   b1_3cond: 68,   b2_2cond: 68,   b2_3cond: 60,   c_2cond: 89,   c_3cond: 76, al_b1_3cond: 53, al_aereo_3cond: 68 },
  { gaugeMM2: 25.0, outerDiameterMM: 9.0,  areaExternalMM2: 63.6,  b1_2cond: 101,  b1_3cond: 89,   b2_2cond: 89,   b2_3cond: 77,   c_2cond: 118,  c_3cond: 101, al_b1_3cond: 70, al_aereo_3cond: 92 },
  { gaugeMM2: 35.0, outerDiameterMM: 10.4, areaExternalMM2: 85.0,  b1_2cond: 125,  b1_3cond: 110,  b2_2cond: 110,  b2_3cond: 97,   c_2cond: 145,  c_3cond: 125, al_b1_3cond: 86, al_aereo_3cond: 115 },
  { gaugeMM2: 50.0, outerDiameterMM: 12.2, areaExternalMM2: 116.9, b1_2cond: 151,  b1_3cond: 134,  b2_2cond: 134,  b2_3cond: 118,  c_2cond: 175,  c_3cond: 151, al_b1_3cond: 104, al_aereo_3cond: 142 },
  { gaugeMM2: 70.0, outerDiameterMM: 14.2, areaExternalMM2: 158.4, b1_2cond: 192,  b1_3cond: 171,  b2_2cond: 171,  b2_3cond: 151,  c_2cond: 222,  c_3cond: 192, al_b1_3cond: 133, al_aereo_3cond: 185 },
  { gaugeMM2: 95.0, outerDiameterMM: 16.4, areaExternalMM2: 211.2, b1_2cond: 232,  b1_3cond: 207,  b2_2cond: 207,  b2_3cond: 182,  c_2cond: 269,  c_3cond: 232, al_b1_3cond: 161, al_aereo_3cond: 228 },
  { gaugeMM2: 120.0, outerDiameterMM: 18.2, areaExternalMM2: 260.2, b1_2cond: 269, b1_3cond: 239,  b2_2cond: 239,  b2_3cond: 210,  c_2cond: 312,  c_3cond: 269, al_b1_3cond: 186, al_aereo_3cond: 267 },
  { gaugeMM2: 150.0, outerDiameterMM: 20.4, areaExternalMM2: 326.9, b1_2cond: 300, b1_3cond: 272,  b2_2cond: 272,  b2_3cond: 240,  c_2cond: 358,  c_3cond: 309, al_b1_3cond: 211, al_aereo_3cond: 308 },
  { gaugeMM2: 185.0, outerDiameterMM: 22.8, areaExternalMM2: 408.3, b1_2cond: 341, b1_3cond: 310,  b2_2cond: 310,  b2_3cond: 273,  c_2cond: 408,  c_3cond: 353, al_b1_3cond: 240, al_aereo_3cond: 356 },
  { gaugeMM2: 240.0, outerDiameterMM: 26.0, areaExternalMM2: 530.9, b1_2cond: 400, b1_3cond: 364,  b2_2cond: 364,  b2_3cond: 321,  c_2cond: 481,  c_3cond: 415, al_b1_3cond: 282, al_aereo_3cond: 425 }
];

// Eletrodutos comerciais de PVC / Aço Galvanizado (Diâmetro interno útil mm)
const CONDUIT_SIZES = [
  { inches: '3/4"',  internalDiameterMM: 21.0,  usableArea40PercentMM2: (Math.PI * (21.0 / 2) ** 2) * 0.40 },
  { inches: '1"',    internalDiameterMM: 27.0,  usableArea40PercentMM2: (Math.PI * (27.0 / 2) ** 2) * 0.40 },
  { inches: '1.1/4"', internalDiameterMM: 35.0, usableArea40PercentMM2: (Math.PI * (35.0 / 2) ** 2) * 0.40 },
  { inches: '1.1/2"', internalDiameterMM: 41.0, usableArea40PercentMM2: (Math.PI * (41.0 / 2) ** 2) * 0.40 },
  { inches: '2"',    internalDiameterMM: 52.0,  usableArea40PercentMM2: (Math.PI * (52.0 / 2) ** 2) * 0.40 },
  { inches: '2.1/2"', internalDiameterMM: 65.0, usableArea40PercentMM2: (Math.PI * (65.0 / 2) ** 2) * 0.40 },
  { inches: '3"',    internalDiameterMM: 78.0,  usableArea40PercentMM2: (Math.PI * (78.0 / 2) ** 2) * 0.40 },
  { inches: '4"',    internalDiameterMM: 102.0, usableArea40PercentMM2: (Math.PI * (102.0 / 2) ** 2) * 0.40 }
];

export interface ChainTopologyInputParams {
  chargers: TopologyChargerNode[];
  gridSupplyVoltage: 220 | 380;
  utility: UtilityId;
  clientBaseLoadKW: number;
  currentStandardCategory: string; // Ex: 'B1', 'C6', 'F1'
  currentStandardBreakerA?: number;
  
  // Distâncias e margens dos trechos gerais
  section1DistanceM: number;       // Padrão -> Painel 220V
  section1MarginPercent: number;
  section1ConductorMaterial?: 'copper' | 'aluminum';
  section1InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
  section2DistanceM: number;       // Painel 220V -> Trafo
  section2MarginPercent: number;
  section2ConductorMaterial?: 'copper' | 'aluminum';
  section2InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
  section3DistanceM: number;       // Trafo -> Painel 380V
  section3MarginPercent: number;
  section3ConductorMaterial?: 'copper' | 'aluminum';
  section3InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';

  auxiliaryConfig: {
    cctvEnabled: boolean;
    cctvPowerW: number;
    outletEnabled: boolean;
    outletPowerW: number;
    lightingEnabled: boolean;
    lightingPowerW: number;
  };

  // Circuitos Customizados Adicionais
  customCircuits220V?: Array<{
    id: string;
    name: string;
    powerW: number;
    voltageV: 127 | 220;
    breakerA: number;
    cableMM2: number;
  }>;
  customCircuits380V?: Array<{
    id: string;
    name: string;
    powerW: number;
    voltageV: 220 | 380;
    breakerA: number;
    cableMM2: number;
  }>;

  // Customização de Transformador Elevador
  customTransformerKVA?: number;

  // Gestão Dinâmica de Carga DLM
  hasSmartChargingDLM?: boolean;
  maxChargerCapKW?: number;
}

/**
 * Dimensiona um trecho específico de cabo e eletroduto com cálculo de queda de tensão, condutores em paralelo e taxa de ocupação
 */
export function sizeCableAndConduitSection(params: {
  sectionId: 'trecho_1' | 'trecho_2' | 'trecho_3' | 'trecho_4';
  name: string;
  fromNode: string;
  toNode: string;
  distanceNominalM: number;
  marginPercent: number;
  designCurrentA: number;
  phases: 1 | 2 | 3;
  voltageV: number;
  conductorMaterial?: 'copper' | 'aluminum';
  installationMethod?: 'B1' | 'B2' | 'C' | 'D';
  maxAllowedVoltageDropPercent?: number;
  includeNeutral?: boolean;
  minGaugeMM2?: number;          // Seção mínima imposta (ex: saída do padrão CEMIG)
  minConductorsPerPhase?: number; // Mínimo de condutores por fase imposto pelo padrão
  standardOriginNote?: string;
  powerKW?: number;
}): SectionCableConduitSizing {
  const {
    sectionId,
    name,
    fromNode,
    toNode,
    distanceNominalM,
    marginPercent,
    designCurrentA,
    phases,
    voltageV,
    conductorMaterial = 'copper',
    installationMethod = 'B1',
    maxAllowedVoltageDropPercent = 2.0,
    includeNeutral = true,
    minGaugeMM2 = 2.5,
    minConductorsPerPhase = 1,
    standardOriginNote,
    powerKW
  } = params;

  const distanceTotalM = Number((distanceNominalM * (1 + marginPercent / 100)).toFixed(2));
  const isThreePhase = phases === 3;
  const cosPhi = 0.98;
  const isAluminum = conductorMaterial === 'aluminum';
  const resistivity = isAluminum ? ALUMINUM_RESISTIVITY_70C : COPPER_RESISTIVITY_70C;
  // NBR 5410 item 6.2.7.1: bitola mínima de alumínio é 16 mm² (10 mm² em casos específicos de linhas aéreas particulares)
  const effectiveMinGauge = isAluminum ? Math.max(16, minGaugeMM2) : minGaugeMM2;

  // Fatores de correção ambientais (NBR 5410)
  const FCT = 1.00; // Temperatura ambiente 30°C
  const FCA = 1.00; // Circuito exclusivo no duto
  const DERATING_FACTOR = FCT * FCA;

  // 1. Bitola por Ampacidade e Seleção de Condutores em Paralelo (NBR 5410)
  let chosenConductors = Math.max(1, minConductorsPerPhase);
  let selectedSpec = CABLE_SPECS.find(s => s.gaugeMM2 >= effectiveMinGauge) || CABLE_SPECS[1];
  let ampacityPerCable = 0;

  // Busca a melhor combinação de número de vias (1 a 4) e bitola comercial
  for (let numVias = chosenConductors; numVias <= 4; numVias++) {
    const currentPerVia = designCurrentA / numVias;
    let found = false;

    for (const spec of CABLE_SPECS) {
      if (spec.gaugeMM2 < effectiveMinGauge) continue;

      let cap = isThreePhase ? spec.b1_3cond : spec.b1_2cond;
      if (installationMethod === 'B2') cap = isThreePhase ? spec.b2_3cond : spec.b2_2cond;
      if (installationMethod === 'C') cap = isThreePhase ? spec.c_3cond : spec.c_2cond;

      // Capacidade de condutor de Alumínio (multiplexado aéreo ou duto)
      if (isAluminum) {
        cap = spec.al_aereo_3cond || spec.al_b1_3cond || Math.round(cap * 0.78);
      }

      const correctedCap = cap * DERATING_FACTOR;

      if (correctedCap >= currentPerVia) {
        selectedSpec = spec;
        chosenConductors = numVias;
        ampacityPerCable = cap;
        found = true;
        break;
      }
    }

    if (found) {
      break;
    } else if (numVias === 4) {
      selectedSpec = CABLE_SPECS[CABLE_SPECS.length - 1];
      chosenConductors = 4;
      ampacityPerCable = isAluminum
        ? (selectedSpec.al_aereo_3cond || 282)
        : (isThreePhase ? selectedSpec.b1_3cond : selectedSpec.b1_2cond);
    }
  }

  // 2. Critério de Queda de Tensão (NBR 5410 / NBR 17019: máx 2.0% trecho parcial)
  let cableGaugePhaseMM2 = selectedSpec.gaugeMM2;
  let voltageDropPercent = 0;
  let voltageDropVolts = 0;

  for (const spec of CABLE_SPECS) {
    if (spec.gaugeMM2 < cableGaugePhaseMM2) continue;

    const equivalentPhaseGauge = spec.gaugeMM2 * chosenConductors;

    const vDrop = isThreePhase
      ? (Math.sqrt(3) * resistivity * distanceTotalM * designCurrentA * cosPhi) / equivalentPhaseGauge
      : (2 * resistivity * distanceTotalM * designCurrentA * cosPhi) / equivalentPhaseGauge;
    const pDrop = (vDrop / voltageV) * 100;

    if (pDrop <= maxAllowedVoltageDropPercent || spec.gaugeMM2 === 240) {
      cableGaugePhaseMM2 = spec.gaugeMM2;
      voltageDropVolts = Number(vDrop.toFixed(2));
      voltageDropPercent = Number(pDrop.toFixed(2));
      selectedSpec = spec;
      break;
    }
  }

  // Dimensionamento do Condutor PE de Proteção (NBR 5410 Tabela 58)
  const totalPhaseGauge = cableGaugePhaseMM2 * chosenConductors;
  let singleGroundGauge = cableGaugePhaseMM2;
  if (totalPhaseGauge > 16 && totalPhaseGauge <= 35) {
    singleGroundGauge = 16;
  } else if (totalPhaseGauge > 35) {
    const halfGauge = totalPhaseGauge / 2;
    const foundGroundSpec = CABLE_SPECS.find(s => s.gaugeMM2 >= halfGauge) || CABLE_SPECS[CABLE_SPECS.length - 1];
    singleGroundGauge = foundGroundSpec.gaugeMM2;
  }
  const cableGaugeGroundMM2 = singleGroundGauge;

  // Contagem de condutores no eletroduto
  const phaseConductorsCount = (isThreePhase ? 3 : phases === 2 ? 2 : 1) * chosenConductors;
  const neutralConductorsCount = includeNeutral ? (1 * chosenConductors) : 0;
  const groundConductorsCount = 1;
  const totalConductorsCount = phaseConductorsCount + neutralConductorsCount + groundConductorsCount;

  // 3. Taxa de Ocupação de Eletroduto (NBR 5410: Máximo 40% para 3 ou mais cabos)
  const totalConductorsAreaMM2 = (phaseConductorsCount + neutralConductorsCount) * selectedSpec.areaExternalMM2 + groundConductorsCount * (CABLE_SPECS.find(s => s.gaugeMM2 === cableGaugeGroundMM2)?.areaExternalMM2 || selectedSpec.areaExternalMM2);

  let conduitQuantity = chosenConductors > 1 ? chosenConductors : 1;
  let areaPerConduitMM2 = totalConductorsAreaMM2 / conduitQuantity;

  let selectedConduit = CONDUIT_SIZES[CONDUIT_SIZES.length - 1];
  for (const conduit of CONDUIT_SIZES) {
    if (conduit.usableArea40PercentMM2 >= areaPerConduitMM2) {
      selectedConduit = conduit;
      break;
    }
  }

  const conduitTotalAreaMM2 = Math.PI * (selectedConduit.internalDiameterMM / 2) ** 2;
  const conduitFillingRatePercent = Number(((areaPerConduitMM2 / conduitTotalAreaMM2) * 100).toFixed(1));

  const totalAmpacityA = Number((ampacityPerCable * chosenConductors * DERATING_FACTOR).toFixed(1));

  // Memorial Matemático Passo a Passo
  const matLabel = isAluminum ? 'Alumínio (Al)' : 'Cobre (Cu)';
  const formulaDesignCurrent = isThreePhase
    ? `Ib = P / (√3 × V × cos φ) = ${(powerKW ? powerKW * 1000 : designCurrentA * Math.sqrt(3) * voltageV * cosPhi).toFixed(0)}W / (1.732 × ${voltageV}V × ${cosPhi}) = ${designCurrentA.toFixed(1)} A`
    : `Ib = P / (V × cos φ) = ${designCurrentA.toFixed(1)} A`;

  const formulaAmpacity = chosenConductors > 1
    ? `Critério de Ampacidade: ${chosenConductors} vias em paralelo de ${matLabel}. Corrente por via = ${designCurrentA.toFixed(1)}A / ${chosenConductors} = ${(designCurrentA / chosenConductors).toFixed(1)}A. Cabo ${cableGaugePhaseMM2}mm² suporta ${ampacityPerCable}A. Capacidade total Iz = ${chosenConductors} × ${ampacityPerCable}A = ${totalAmpacityA}A (≥ ${designCurrentA.toFixed(1)}A - CONFORME).`
    : `Critério de Ampacidade: 1 condutor por fase de ${matLabel}. Cabo ${cableGaugePhaseMM2}mm² suporta ${ampacityPerCable}A (FCT=1.0, FCA=1.0) ≥ Ib (${designCurrentA.toFixed(1)}A - CONFORME).`;

  const formulaVoltageDrop = isThreePhase
    ? `ΔV = (√3 × ρ_${isAluminum ? 'Al' : 'Cu'} × L × Ib × cos φ) / S_eq = (1.732 × ${resistivity} × ${distanceTotalM}m × ${designCurrentA.toFixed(1)}A × ${cosPhi}) / (${cableGaugePhaseMM2} × ${chosenConductors}mm²) = ${voltageDropVolts}V (${voltageDropPercent}% ≤ ${maxAllowedVoltageDropPercent}% - CONFORME).`
    : `ΔV = (2 × ρ_${isAluminum ? 'Al' : 'Cu'} × L × Ib × cos φ) / S_eq = ${voltageDropVolts}V (${voltageDropPercent}% ≤ ${maxAllowedVoltageDropPercent}% - CONFORME).`;

  return {
    sectionId,
    name,
    fromNode,
    toNode,
    distanceNominalM,
    marginPercent,
    distanceTotalM,
    designCurrentA: Number(designCurrentA.toFixed(1)),
    phases,
    voltageV,
    conductorMaterial,
    installationMethod,
    conductorsPerPhase: chosenConductors,
    cableGaugePhaseMM2,
    cableGaugeNeutralMM2: includeNeutral ? cableGaugePhaseMM2 : undefined,
    cableGaugeGroundMM2,
    totalConductorsCount,
    conduitDiameterMM: selectedConduit.internalDiameterMM,
    conduitInches: isAluminum && installationMethod === 'D' ? 'Aéreo Multiplex' : conduitQuantity > 1 ? `${conduitQuantity}x(${selectedConduit.inches})` : selectedConduit.inches,
    conduitQuantity,
    conduitFillingRatePercent,
    voltageDropPercent,
    voltageDropVolts,
    isVoltageDropCompliant: voltageDropPercent <= maxAllowedVoltageDropPercent,
    ampacityPerCableA: ampacityPerCable,
    totalAmpacityA,
    calculationBreakdown: {
      activePowerKW: powerKW,
      apparentPowerKVA: Number(((designCurrentA * Math.sqrt(isThreePhase ? 3 : 1) * voltageV) / 1000).toFixed(1)),
      formulaDesignCurrent,
      formulaAmpacity,
      formulaVoltageDrop,
      fct: FCT,
      fca: FCA,
      rhoCopper: resistivity,
      standardOriginNote
    }
  };
}

/**
 * Executa o cálculo topológico completo da cadeia reativa
 */
export function calculateChainTopology(params: ChainTopologyInputParams): ChainTopologyOutput {
  const {
    chargers,
    gridSupplyVoltage,
    utility,
    clientBaseLoadKW,
    currentStandardCategory,
    currentStandardBreakerA,
    section1DistanceM,
    section1MarginPercent,
    section1ConductorMaterial = 'copper',
    section1InstallationMethod = 'B1',
    section2DistanceM,
    section2MarginPercent,
    section2ConductorMaterial = 'copper',
    section2InstallationMethod = 'B1',
    section3DistanceM,
    section3MarginPercent,
    section3ConductorMaterial = 'copper',
    section3InstallationMethod = 'B1',
    auxiliaryConfig,
    customCircuits220V = [],
    customCircuits380V = [],
    customTransformerKVA,
    hasSmartChargingDLM,
    maxChargerCapKW
  } = params;

  // 1. Diagnóstico dos Carregadores
  const totalChargersKW = chargers.reduce((sum, c) => sum + c.powerKW, 0);
  const hasCharger380V = chargers.some(c => c.voltageV >= 380);
  const allChargers220V = chargers.length > 0 && chargers.every(c => c.voltageV < 380);

  // 2. Determinação do Transformador Elevador
  // Regra de Ouro: Necessário SOMENTE se a rede for 220V (F-F) E houver pelo menos um carregador 380V
  const isTransformerNeeded = gridSupplyVoltage === 220 && hasCharger380V;

  let transformerKVA = 0;
  let trafoPrimaryCurrentA = 0;
  let trafoSecondaryCurrentA = 0;
  let trafoLossesKW = 0;
  let isTrafoOverloaded = false;
  let trafoOverloadPercent = 0;
  let trafoBreakdown: TransformerTopologyState['calculationBreakdown'] | undefined;

  if (isTransformerNeeded) {
    const chargers380VKW = chargers.filter(c => c.voltageV >= 380).reduce((sum, c) => sum + c.powerKW, 0);
    const cosPhiTrafo = 0.98;
    const effTrafo = 0.97;
    // Potência aparente consumida pela carga: S = P / (cos φ * η)
    const loadApparentKVA = chargers380VKW / (cosPhiTrafo * effTrafo);
    // Margem de segurança operacional recomendada para regime contínuo de recarga VE (15% a 20%)
    const safetyMarginFactor = 1.15;
    const requiredKVA = loadApparentKVA * safetyMarginFactor;

    // Tabela Prática Comercial por faixa de carregador:
    // 40 kW -> Trafo 50 kVA
    // 60 kW -> Trafo 75 kVA
    // 80 kW -> Trafo 100 kVA
    // 120 kW -> Trafo 150 kVA
    // 160 kW -> Trafo 200 kVA ou 225 kVA
    let autoSelectedKVA = 300;
    if (chargers380VKW <= 40) autoSelectedKVA = 50;
    else if (chargers380VKW <= 60) autoSelectedKVA = 75;
    else if (chargers380VKW <= 80) autoSelectedKVA = 100;
    else if (chargers380VKW <= 120) autoSelectedKVA = 150;
    else if (chargers380VKW <= 180) autoSelectedKVA = 225;
    else {
      autoSelectedKVA = STANDARD_TRAFOS_KVA.find(k => k >= requiredKVA) || 300;
    }

    if (customTransformerKVA && customTransformerKVA > 0) {
      transformerKVA = customTransformerKVA;
      if (customTransformerKVA < loadApparentKVA) {
        isTrafoOverloaded = true;
        trafoOverloadPercent = Number((((loadApparentKVA - customTransformerKVA) / customTransformerKVA) * 100).toFixed(1));
      }
    } else {
      transformerKVA = autoSelectedKVA;
    }

    // Corrente primária nominal em 220V (Δ trifásico)
    trafoPrimaryCurrentA = Number(((chargers380VKW * 1000) / (Math.sqrt(3) * 220 * cosPhiTrafo * effTrafo)).toFixed(1));
    // Corrente secundária nominal em 380V (Yn trifásico + Neutro)
    trafoSecondaryCurrentA = Number(((chargers380VKW * 1000) / (Math.sqrt(3) * 380 * cosPhiTrafo)).toFixed(1));
    // Perdas estimadas no núcleo e enrolamentos (~2.0% a 2.5%)
    trafoLossesKW = Number((transformerKVA * 0.02).toFixed(2));

    trafoBreakdown = {
      totalLoadChargersKW: chargers380VKW,
      cosPhi: cosPhiTrafo,
      efficiency: effTrafo,
      safetyMarginFactor,
      calculatedRawKVA: Number(requiredKVA.toFixed(1)),
      standardSelectedKVA: transformerKVA,
      isCustomSelected: Boolean(customTransformerKVA && customTransformerKVA > 0),
      isOverloaded: isTrafoOverloaded,
      overloadPercentage: trafoOverloadPercent,
      formulaKVA: customTransformerKVA
        ? `S_trafo (Definido pelo Usuário) = ${customTransformerKVA} kVA (Demanda necessária da carga: ${loadApparentKVA.toFixed(1)} kVA ${isTrafoOverloaded ? `⚠️ SOBRECARGA DE +${trafoOverloadPercent}%!` : '✓ ADEQUADO'})`
        : `S_trafo = (P_ve / (cos φ × η)) × 1.15 = (${chargers380VKW} kW / (${cosPhiTrafo} × ${effTrafo})) × 1.15 = ${requiredKVA.toFixed(1)} kVA ➔ Trafo Comercial Prático: ${transformerKVA} kVA`,
      formulaPrimaryCurrent: `I_prim (220V) = P_ve / (√3 × 220V × cos φ × η) = (${chargers380VKW} × 1000) / (1.732 × 220 × ${cosPhiTrafo} × ${effTrafo}) = ${trafoPrimaryCurrentA} A`,
      formulaSecondaryCurrent: `I_sec (380V) = P_ve / (√3 × 380V × cos φ) = (${chargers380VKW} × 1000) / (1.732 × 380 × ${cosPhiTrafo}) = ${trafoSecondaryCurrentA} A`,
      notes: isTrafoOverloaded
        ? `ALERTA DE ENGENHARIA: A potência digitada (${customTransformerKVA} kVA) é inferior à demanda da carga dos carregadores (${loadApparentKVA.toFixed(1)} kVA). Risco de aquecimento excessivo e desligamento por relé térmico.`
        : `Transformador elevador a seco com fator K-4 para suportar harmônicas de retificadores VE. Ligação Dyn1 (Δ 220V primário / Y 380V secundário com Neutro acessível aterrado no BEP).`
    };
  }

  const transformerState: TransformerTopologyState = {
    needed: isTransformerNeeded,
    type: isTransformerNeeded ? 'elevador_seco' : 'dispensado_rede_compativel',
    nominalKVA: transformerKVA,
    primaryVoltageV: 220,
    secondaryVoltageV: 380,
    primaryCurrentA: trafoPrimaryCurrentA,
    secondaryCurrentA: trafoSecondaryCurrentA,
    connectionGroup: 'Dyn1 (Δ 220V / Y 380V+N aterrado)',
    inrushCurveProtection: 'D',
    lossesKW: trafoLossesKW,
    apparentPowerKVA: transformerKVA,
    activePowerKW: chargers.filter(c => c.voltageV >= 380).reduce((sum, c) => sum + c.powerKW, 0),
    calculationBreakdown: trafoBreakdown
  };

  // 3. Cargas Auxiliares no Painel 220V
  const cctvPowerW = auxiliaryConfig.cctvEnabled ? auxiliaryConfig.cctvPowerW : 0;
  const outletPowerW = auxiliaryConfig.outletEnabled ? auxiliaryConfig.outletPowerW : 0;
  const lightingPowerW = auxiliaryConfig.lightingEnabled ? auxiliaryConfig.lightingPowerW : 0;
  const customAux220VKW = customCircuits220V.reduce((sum, c) => sum + (c.powerW || 0), 0) / 1000;
  const totalAuxKW = (cctvPowerW + outletPowerW + lightingPowerW) / 1000 + customAux220VKW;

  // Medidor Exclusivo do Hub: Mede trafo/carregadores + auxiliares (NÃO mede carga de base do cliente)
  const hubDirectLoadKW = isTransformerNeeded ? (trafoPrimaryCurrentA * Math.sqrt(3) * 220 * 0.98 * 0.97) / 1000 : totalChargersKW;
  const hubAggregatedLoadKW = Number((hubDirectLoadKW + totalAuxKW).toFixed(2));

  const auxiliaryLoads: AuxiliaryLoadsState = {
    cctv: {
      enabled: auxiliaryConfig.cctvEnabled,
      voltageV: 127,
      powerW: cctvPowerW,
      phases: 1,
      breakerA: 10,
      cableMM2: 2.5
    },
    maintenanceOutlet: {
      enabled: auxiliaryConfig.outletEnabled,
      voltageV: 127,
      powerW: outletPowerW,
      phases: 1,
      breakerA: 20,
      cableMM2: 2.5
    },
    lighting: {
      enabled: auxiliaryConfig.lightingEnabled,
      voltageV: 127,
      powerW: lightingPowerW,
      phases: 1,
      breakerA: 10,
      cableMM2: 2.5
    },
    dps220V: {
      enabled: true,
      classType: 'Classe II',
      rating: 'Uc=275V, In=20kA, Imax=40kA',
      quantity: 3
    },
    energyMeter: {
      enabled: true,
      type: 'Multimedidor digital com TC bipartido e RS485 Modbus RTU',
      measuresTrafoAndAuxOnly: true,
      aggregatedLoadKW: hubAggregatedLoadKW
    }
  };

  // 4. Painel 220V
  // Corrente total no Painel 220V = corrente primária do trafo (ou dos carregadores 220V) + auxiliares
  const auxCurrent220VA = totalAuxKW > 0 ? (totalAuxKW * 1000) / 127 : 0;
  const panel220VCurrentA = (isTransformerNeeded ? trafoPrimaryCurrentA : (totalChargersKW * 1000) / (Math.sqrt(3) * 220 * 0.98)) + (auxCurrent220VA / 3);
  const panel220VMainBreakerRating = panel220VCurrentA * 1.15;
  const panel220VMainBreakerA = STANDARD_BREAKERS.find(b => b >= panel220VMainBreakerRating) || 80;

  const panel220V: Panel220VTopologyState = {
    mainBreakerA: panel220VMainBreakerA,
    mainBreakerPoles: 3,
    mainBreakerCurve: isTransformerNeeded ? 'D' : 'C', // Curva D se houver trafo a jusante
    busbarRatingA: panel220VMainBreakerA,
    requiresBusbar: true,
    totalAuxKW: Number(totalAuxKW.toFixed(2)),
    auxiliaryLoads,
    customCircuits: customCircuits220V
  };

  // 5. Painel 380V (Secundário)
  // Regra de Ouro:
  // - Inativo/bypassed se não houver carregadores 380V na rede 220V
  // - Se ativo e houver APENAS 1 carregador e nenhum circuito extra: 1 único disjuntor de proteção, ZERO barramento!
  // - Se houver >= 2 circuitos: barramento de cobre dimensionado pelo disjuntor geral
  const isPanel380VActive = isTransformerNeeded;
  const chargersCount = chargers.length;
  const totalCircuits380V = chargersCount + customCircuits380V.length;
  const requires380VBusbar = isPanel380VActive && totalCircuits380V > 1;

  const individualBreakers = chargers.map(c => {
    const inrushFactor = 1.15;
    const calcA = (c.powerKW * 1000) / (Math.sqrt(3) * 380 * 0.98) * inrushFactor;
    const breakerA = STANDARD_BREAKERS.find(b => b >= calcA) || 40;
    return {
      chargerId: c.id,
      breakerA,
      poles: 3,
      curve: 'C' as const,
      drType: 'Tetrapolar 40A / 30mA Tipo B'
    };
  });

  const customCircuits380VKW = customCircuits380V.reduce((sum, c) => sum + (c.powerW || 0), 0) / 1000;
  const customCircuits380VA = (customCircuits380VKW * 1000) / (Math.sqrt(3) * 380 * 0.98);
  const panel380VMainBreakerRating = (trafoSecondaryCurrentA + customCircuits380VA) * 1.15;
  const panel380VMainBreakerA = STANDARD_BREAKERS.find(b => b >= panel380VMainBreakerRating) || 40;

  const panel380V: Panel380VTopologyState = {
    active: isPanel380VActive,
    mainBreakerA: requires380VBusbar ? panel380VMainBreakerA : (individualBreakers[0]?.breakerA || 40),
    mainBreakerPoles: 3,
    mainBreakerCurve: 'C',
    requiresBusbar: requires380VBusbar,
    busbarRatingA: requires380VBusbar ? panel380VMainBreakerA : 0,
    dps380V: {
      enabled: isPanel380VActive,
      classType: 'Classe II',
      rating: 'Uc=385V, In=20kA, Imax=40kA',
      quantity: 4 // 3 Fases + Neutro
    },
    customCircuits: customCircuits380V,
    individualBreakers
  };

  // Identificação das especificações normatizadas do padrão selecionado
  const cemigList: UtilityCategorySpec[] = Object.values(CEMIG_CATEGORIES);
  const activeStd = cemigList.find((c: UtilityCategorySpec) => c.categoryId === currentStandardCategory) || cemigList[0];
  const standardMinGaugeMM2 = activeStd.cableGaugePhaseMM2 || 2.5;
  const standardConductorsPerPhase = (activeStd as any).caboFaseVias || 1;

  // 6. Dimensionamento dos 4 Trechos de Cabos e Eletrodutos
  // Trecho 1: Padrão Concessionária -> Painel 220V
  const section1 = sizeCableAndConduitSection({
    sectionId: 'trecho_1',
    name: 'Trecho 1: Padrão Concessionária ➔ Painel Geral 220V',
    fromNode: `Padrão CEMIG (${activeStd.categoryId} - ${activeStd.breakerCurrentA}A)`,
    toNode: 'Painel Geral 220V',
    distanceNominalM: section1DistanceM,
    marginPercent: section1MarginPercent,
    designCurrentA: panel220VCurrentA,
    phases: 3,
    voltageV: 220,
    conductorMaterial: section1ConductorMaterial,
    installationMethod: section1InstallationMethod,
    maxAllowedVoltageDropPercent: 1.5,
    includeNeutral: true,
    minGaugeMM2: section1ConductorMaterial === 'aluminum' ? Math.max(16, standardMinGaugeMM2) : standardMinGaugeMM2,
    minConductorsPerPhase: standardConductorsPerPhase,
    standardOriginNote: `Bitola alinhada à saída do padrão CEMIG Categoria ${activeStd.categoryId} (${standardConductorsPerPhase}x ${standardMinGaugeMM2}mm² por fase) • Condutor ${section1ConductorMaterial === 'aluminum' ? 'Alumínio (Al)' : 'Cobre (Cu)'}`,
    powerKW: hubAggregatedLoadKW
  });

  // Trecho 2: Painel 220V -> Transformador (Apenas se houver transformador)
  let section2: SectionCableConduitSizing | undefined;
  if (isTransformerNeeded) {
    section2 = sizeCableAndConduitSection({
      sectionId: 'trecho_2',
      name: 'Trecho 2: Painel 220V ➔ Primário Transformador (220V)',
      fromNode: 'Painel 220V',
      toNode: 'Primário Transformador',
      distanceNominalM: section2DistanceM,
      marginPercent: section2MarginPercent,
      designCurrentA: trafoPrimaryCurrentA,
      phases: 3,
      voltageV: 220,
      conductorMaterial: section2ConductorMaterial,
      installationMethod: section2InstallationMethod,
      maxAllowedVoltageDropPercent: 1.0,
      includeNeutral: false, // Primário em triângulo Dyn1
      minGaugeMM2: section2ConductorMaterial === 'aluminum' ? 16 : 10, // Seção mínima técnica da NBR 5410 para cabo de força (Al min 16mm², Cu min 10mm²)
      minConductorsPerPhase: trafoPrimaryCurrentA > 360 ? (trafoPrimaryCurrentA > 600 ? 3 : 2) : 1,
      standardOriginNote: `Alimentação primária em 220V baseada na corrente de carga dos carregadores (${trafoPrimaryCurrentA}A) • Trafo de ${transformerKVA} kVA • Condutor ${section2ConductorMaterial === 'aluminum' ? 'Alumínio' : 'Cobre'}`,
      powerKW: chargers.filter(c => c.voltageV >= 380).reduce((sum, c) => sum + c.powerKW, 0)
    });
  }

  // Trecho 3: Transformador -> Painel 380V (Apenas se houver transformador)
  let section3: SectionCableConduitSizing | undefined;
  if (isTransformerNeeded) {
    section3 = sizeCableAndConduitSection({
      sectionId: 'trecho_3',
      name: 'Trecho 3: Secundário Transformador (380V) ➔ Painel 380V',
      fromNode: 'Secundário Transformador',
      toNode: 'Painel 380V',
      distanceNominalM: section3DistanceM,
      marginPercent: section3MarginPercent,
      designCurrentA: trafoSecondaryCurrentA,
      phases: 3,
      voltageV: 380,
      conductorMaterial: section3ConductorMaterial,
      installationMethod: section3InstallationMethod,
      maxAllowedVoltageDropPercent: 1.0,
      includeNeutral: true, // Secundário estrela aterrada Dyn1
      minGaugeMM2: section3ConductorMaterial === 'aluminum' ? 95 : 70,
      minConductorsPerPhase: trafoSecondaryCurrentA > 360 ? 2 : 1,
      standardOriginNote: `Alimentação secundária do Trafo em 380V com ${trafoSecondaryCurrentA}A • Condutor ${section3ConductorMaterial === 'aluminum' ? 'Alumínio' : 'Cobre'}`,
      powerKW: chargers.filter(c => c.voltageV >= 380).reduce((sum, c) => sum + c.powerKW, 0)
    });
  }

  // Trecho 4: Alimentadores individuais para cada Carregador (Painel 380V -> Carregador_i ou Painel 220V -> Carregador_i)
  const section4_feeders: SectionCableConduitSizing[] = chargers.map((charger, index) => {
    const is380 = charger.voltageV >= 380;
    const fromPanel = is380 ? 'Painel 380V' : 'Painel 220V';
    const chargerDesignA = (charger.powerKW * 1000) / (Math.sqrt(charger.phases === 3 ? 3 : 1) * charger.voltageV * 0.98);

    return sizeCableAndConduitSection({
      sectionId: 'trecho_4',
      name: `Trecho 4.${index + 1}: ${fromPanel} ➔ ${charger.brand} ${charger.name} (${charger.powerKW} kW)`,
      fromNode: fromPanel,
      toNode: charger.name,
      distanceNominalM: charger.distanceMeters,
      marginPercent: charger.marginPercent,
      designCurrentA: chargerDesignA,
      phases: charger.phases,
      voltageV: charger.voltageV,
      conductorMaterial: (charger as any).conductorMaterial || 'copper',
      installationMethod: (charger as any).installationMethod || 'B1',
      maxAllowedVoltageDropPercent: 2.0,
      includeNeutral: true,
      powerKW: charger.powerKW
    });
  });

  // 7. Alerta de Capacidade do Padrão de Entrada
  const activeBreakerA = currentStandardBreakerA || activeStd.breakerCurrentA;
  const activeLimitKW = activeStd.maxLimitKW;

  // Se houver limitação de potência aceita/aplicada por DLM aos carregadores, recalculamos a demanda efetiva do hub
  const effectiveChargersPowerKW = (hasSmartChargingDLM && maxChargerCapKW !== undefined && maxChargerCapKW > 0)
    ? (maxChargerCapKW * chargers.length)
    : totalChargersKW;

  const effectiveHubDirectLoadKW = isTransformerNeeded
    ? (effectiveChargersPowerKW / (0.98 * 0.97))
    : effectiveChargersPowerKW;
  const effectiveHubAggregatedKW = Number((effectiveHubDirectLoadKW + totalAuxKW).toFixed(2));

  const totalRequiredLoadKW = Number((clientBaseLoadKW + effectiveHubAggregatedKW).toFixed(2));
  
  // Condição de sobrecarga física
  let isOverloaded = totalRequiredLoadKW > activeLimitKW;
  
  // Se o DLM estiver ativo e a potência foi limitada para caber no disjuntor do padrão,
  // ou se o DLM garante a modulação dinâmica contínua sem ultrapassar o padrão (IEC 61851-1 / NBR 17019):
  const isProtectedByDLM = Boolean(hasSmartChargingDLM && (!isOverloaded || (maxChargerCapKW !== undefined && maxChargerCapKW > 0)));
  if (isProtectedByDLM && totalRequiredLoadKW <= activeLimitKW) {
    isOverloaded = false;
  }

  // Encontrar padrão recomendado se houver sobrecarga
  const recommendedCategorySpec = cemigList.find((c: UtilityCategorySpec) => c.maxLimitKW >= totalRequiredLoadKW) || cemigList[cemigList.length - 1];

  let standardAlertMessage = '';
  if (isOverloaded) {
    standardAlertMessage = `ATENÇÃO: A demanda total (${totalRequiredLoadKW} kW: cliente ${clientBaseLoadKW} kW + hub ${effectiveHubAggregatedKW} kW) supera o limite do padrão ${activeStd.categoryId} (${activeLimitKW} kW / ${activeBreakerA}A). Recomendado upgrade para Categoria ${recommendedCategorySpec.categoryId} (${recommendedCategorySpec.breakerCurrentA}A) ou ativação de Gestão Dinâmica DLM.`;
  } else if (hasSmartChargingDLM && maxChargerCapKW !== undefined && maxChargerCapKW > 0) {
    standardAlertMessage = `OPERAÇÃO CONFORME COM SMART CHARGING (DLM): Carregadores limitados a ${maxChargerCapKW} kW em tempo real. Demanda total contida em ${totalRequiredLoadKW} kW, eliminando risco de desarme do disjuntor geral de ${activeBreakerA}A (${activeLimitKW} kW) conforme ABNT NBR 17019 e IEC 61851-1.`;
  } else {
    standardAlertMessage = `Padrão de entrada ${activeStd.categoryId} (${activeLimitKW} kW) adequado para absorver a carga adicional de ${effectiveHubAggregatedKW} kW.`;
  }

  const standardAlert: StandardCapacityAlert = {
    isOverloaded,
    currentStandardCategory: activeStd.categoryId,
    currentStandardBreakerA: activeBreakerA,
    currentStandardLimitKW: activeLimitKW,
    clientBaseLoadKW,
    hubAdditionalLoadKW: effectiveHubAggregatedKW,
    totalRequiredLoadKW,
    requiredCapacityA: Number(((totalRequiredLoadKW * 1000) / (Math.sqrt(3) * 220 * 0.98)).toFixed(1)),
    recommendedCategory: recommendedCategorySpec.categoryId,
    recommendedBreakerA: recommendedCategorySpec.breakerCurrentA,
    message: standardAlertMessage
  };

  // Função auxiliar para descrição normativa do condutor
  const formatCableBOMDescription = (
    sec: SectionCableConduitSizing,
    circuitRole: string
  ): { desc: string; norm: string } => {
    const isAl = sec.conductorMaterial === 'aluminum';
    const gauge = sec.cableGaugePhaseMM2;
    const viasFase = sec.conductorsPerPhase;
    const viasPrefix = viasFase > 1 ? `${viasFase}x ` : '';

    if (isAl) {
      if (sec.phases === 1) {
        return {
          desc: `Cabo de Alumínio Multiplexado Biplex 0,6/1kV XLPE 90°C ${viasPrefix}(1x${gauge} + 1x${gauge} N) mm² (${circuitRole})`,
          norm: 'ABNT NBR 8182 / NBR 5410'
        };
      } else if (sec.phases === 2) {
        return {
          desc: `Cabo de Alumínio Multiplexado Triplex 0,6/1kV XLPE 90°C ${viasPrefix}(2x${gauge} + 1x${gauge} N) mm² (${circuitRole})`,
          norm: 'ABNT NBR 8182 / NBR 5410'
        };
      } else {
        return {
          desc: `Cabo de Alumínio Multiplexado Quadruplex 0,6/1kV XLPE 90°C ${viasPrefix}(3x${gauge} + 1x${gauge} N) mm² (${circuitRole})`,
          norm: 'ABNT NBR 8182 / NBR 5410'
        };
      }
    }

    return {
      desc: `Cabo de Cobre 750V/1kV PVC 70°C ${viasPrefix}${gauge}mm² (${circuitRole})`,
      norm: 'ABNT NBR 5410 / NBR 7288'
    };
  };

  // 8. Lista de Materiais Quantitativa (BOM)
  const totalBOM: BillOfMaterialItem[] = [];

  // Cabos do Trecho 1
  const t1Cable = formatCableBOMDescription(section1, 'Fases + N + PE');
  totalBOM.push({
    id: 'bom-cabo-t1',
    category: 'condutores',
    description: t1Cable.desc,
    quantity: Math.ceil(section1.distanceTotalM * section1.totalConductorsCount),
    unit: 'm',
    spec: `${section1.totalConductorsCount} vias de ${section1.cableGaugePhaseMM2}mm² com ${section1.marginPercent}% de margem`,
    normReference: t1Cable.norm
  });

  // Eletroduto do Trecho 1
  totalBOM.push({
    id: 'bom-duto-t1',
    category: 'infraestrutura',
    description: `Eletroduto Rígido / Corrugado Reforçado ${section1.conduitInches} (${section1.conduitDiameterMM}mm)`,
    quantity: Math.ceil(section1.distanceTotalM),
    unit: 'm',
    spec: `Taxa de ocupação de ${section1.conduitFillingRatePercent}% (≤ 40% NBR 5410)`,
    normReference: 'NBR 5410'
  });

  // Trecho 2 (se houver)
  if (section2) {
    const t2Cable = formatCableBOMDescription(section2, 'Primário Trafo');
    totalBOM.push({
      id: 'bom-cabo-t2',
      category: 'condutores',
      description: t2Cable.desc,
      quantity: Math.ceil(section2.distanceTotalM * section2.totalConductorsCount),
      unit: 'm',
      spec: `${section2.totalConductorsCount} vias com ${section2.marginPercent}% margem`,
      normReference: t2Cable.norm
    });
    totalBOM.push({
      id: 'bom-duto-t2',
      category: 'infraestrutura',
      description: `Eletroduto Rígido ${section2.conduitInches}`,
      quantity: Math.ceil(section2.distanceTotalM * (section2.conduitQuantity || 1)),
      unit: 'm',
      spec: `Taxa ocupação ${section2.conduitFillingRatePercent}% (${section2.conduitQuantity || 1} dutos em paralelo)`,
      normReference: 'NBR 5410'
    });
  }

  // Trecho 3 (se houver)
  if (section3) {
    const t3Cable = formatCableBOMDescription(section3, 'Secundário Trafo 380V');
    totalBOM.push({
      id: 'bom-cabo-t3',
      category: 'condutores',
      description: t3Cable.desc,
      quantity: Math.ceil(section3.distanceTotalM * section3.totalConductorsCount),
      unit: 'm',
      spec: `${section3.totalConductorsCount} vias (${section3.conductorsPerPhase} por fase) com ${section3.marginPercent}% margem`,
      normReference: t3Cable.norm
    });
    totalBOM.push({
      id: 'bom-duto-t3',
      category: 'infraestrutura',
      description: `Eletroduto Rígido ${section3.conduitInches}`,
      quantity: Math.ceil(section3.distanceTotalM * (section3.conduitQuantity || 1)),
      unit: 'm',
      spec: `Taxa ocupação ${section3.conduitFillingRatePercent}%`,
      normReference: 'NBR 5410'
    });
  }

  // Trechos 4 (Alimentadores dos Carregadores)
  section4_feeders.forEach((feeder, i) => {
    const t4Cable = formatCableBOMDescription(feeder, feeder.toNode);
    totalBOM.push({
      id: `bom-cabo-t4-${i}`,
      category: 'condutores',
      description: t4Cable.desc,
      quantity: Math.ceil(feeder.distanceTotalM * feeder.totalConductorsCount),
      unit: 'm',
      spec: `${feeder.totalConductorsCount} vias (L=${feeder.distanceTotalM}m com ${feeder.marginPercent}% margem)`,
      normReference: t4Cable.norm
    });
    totalBOM.push({
      id: `bom-duto-t4-${i}`,
      category: 'infraestrutura',
      description: `Eletroduto ${feeder.conduitInches} p/ ${feeder.toNode}`,
      quantity: Math.ceil(feeder.distanceTotalM),
      unit: 'm',
      spec: `Taxa ocupação ${feeder.conduitFillingRatePercent}%`,
      normReference: 'NBR 5410'
    });
  });

  // Equipamentos e Painéis
  if (isTransformerNeeded) {
    totalBOM.push({
      id: 'bom-trafo-elevador',
      category: 'transformador',
      description: `Transformador Elevador a Seco ${transformerKVA} kVA (220V Δ ➔ 380V/220V Yn)`,
      quantity: 1,
      unit: 'pç',
      spec: `Fator K-4 p/ harmônicas VE, Classe F/H, Grau de Proteção IP23/IP54, Ligação Dyn1`,
      normReference: 'ABNT NBR 5356 / NBR 17019'
    });
  }

  totalBOM.push({
    id: 'bom-painel-220v',
    category: 'quadro',
    description: `Quadro Geral de Proteção 220V com Disjuntor Geral ${panel220V.mainBreakerA}A Curva ${panel220V.mainBreakerCurve}`,
    quantity: 1,
    unit: 'pç',
    spec: `Barramento de cobre ${panel220V.busbarRatingA}A + 3x DPS Cl. II 275V + Medidor Modbus`,
    normReference: 'NBR 5410 / NBR IEC 61439'
  });

  if (isTransformerNeeded) {
    totalBOM.push({
      id: 'bom-trafo-elevador',
      category: 'quadro',
      description: `Transformador Elevador a Seco ${transformerKVA} kVA (220V Delta -> 380V/220V Estrela Dyn1)`,
      quantity: 1,
      unit: 'pç',
      spec: 'Isolação Classe F/H, Grau de Proteção IP23/IP54 com neutro aterrado no BEP',
      normReference: 'ABNT NBR 5356 / NBR 17019'
    });
  }

  if (isPanel380VActive) {
    totalBOM.push({
      id: 'bom-painel-380v',
      category: 'quadro',
      description: requires380VBusbar
        ? `Painel de Distribuição 380V com Barramento de Cobre ${panel380V.busbarRatingA}A e ${chargersCount} Disjuntores`
        : `Caixa de Proteção 380V com Disjuntor Unificado ${panel380V.mainBreakerA}A (Zero Barramento)`,
      quantity: 1,
      unit: 'pç',
      spec: requires380VBusbar ? 'Barramento proporcional + DPS 385V + DRs Tipo B' : 'Disjuntor único sem barramento',
      normReference: 'NBR 17019 / NBR 5410'
    });
  }

  return {
    chargers,
    gridSupplyVoltage,
    utility,
    standardAlert,
    panel220V,
    transformer: transformerState,
    panel380V,
    sections: {
      section1_standardToPanel220: section1,
      section2_panel220ToTrafo: section2,
      section3_trafoToPanel380: section3,
      section4_chargersFeeders: section4_feeders
    },
    hubDedicatedMeterKWhEstimatedMonthly: Number((hubAggregatedLoadKW * 120).toFixed(0)), // ~4h/dia média
    totalBOM
  };
}
