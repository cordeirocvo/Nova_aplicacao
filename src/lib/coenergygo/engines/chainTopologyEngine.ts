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
  { gaugeMM2: 10.0, outerDiameterMM: 6.0,  areaExternalMM2: 28.3,  b1_2cond: 57,   b1_3cond: 50,   b2_2cond: 50,   b2_3cond: 44,   c_2cond: 66,   c_3cond: 57, al_b1_3cond: 38, al_aereo_3cond: 55 },
  { gaugeMM2: 16.0, outerDiameterMM: 7.2,  areaExternalMM2: 40.7,  b1_2cond: 76,   b1_3cond: 68,   b2_2cond: 68,   b2_3cond: 60,   c_2cond: 89,   c_3cond: 76, al_b1_3cond: 53, al_aereo_3cond: 78 },
  { gaugeMM2: 25.0, outerDiameterMM: 9.0,  areaExternalMM2: 63.6,  b1_2cond: 101,  b1_3cond: 89,   b2_2cond: 89,   b2_3cond: 77,   c_2cond: 118,  c_3cond: 101, al_b1_3cond: 70, al_aereo_3cond: 105 },
  { gaugeMM2: 35.0, outerDiameterMM: 10.4, areaExternalMM2: 85.0,  b1_2cond: 125,  b1_3cond: 110,  b2_2cond: 110,  b2_3cond: 97,   c_2cond: 145,  c_3cond: 125, al_b1_3cond: 86, al_aereo_3cond: 130 },
  { gaugeMM2: 50.0, outerDiameterMM: 12.2, areaExternalMM2: 116.9, b1_2cond: 151,  b1_3cond: 134,  b2_2cond: 134,  b2_3cond: 118,  c_2cond: 175,  c_3cond: 151, al_b1_3cond: 104, al_aereo_3cond: 160 },
  { gaugeMM2: 70.0, outerDiameterMM: 14.2, areaExternalMM2: 158.4, b1_2cond: 192,  b1_3cond: 171,  b2_2cond: 171,  b2_3cond: 151,  c_2cond: 222,  c_3cond: 192, al_b1_3cond: 133, al_aereo_3cond: 205 },
  { gaugeMM2: 95.0, outerDiameterMM: 16.4, areaExternalMM2: 211.2, b1_2cond: 232,  b1_3cond: 207,  b2_2cond: 207,  b2_3cond: 182,  c_2cond: 269,  c_3cond: 232, al_b1_3cond: 161, al_aereo_3cond: 250 },
  { gaugeMM2: 120.0, outerDiameterMM: 18.2, areaExternalMM2: 260.2, b1_2cond: 269, b1_3cond: 239,  b2_2cond: 239,  b2_3cond: 210,  c_2cond: 312,  c_3cond: 269, al_b1_3cond: 186, al_aereo_3cond: 290 },
  { gaugeMM2: 150.0, outerDiameterMM: 20.4, areaExternalMM2: 326.9, b1_2cond: 300, b1_3cond: 272,  b2_2cond: 272,  b2_3cond: 240,  c_2cond: 358,  c_3cond: 309, al_b1_3cond: 211, al_aereo_3cond: 330 },
  { gaugeMM2: 185.0, outerDiameterMM: 22.8, areaExternalMM2: 408.3, b1_2cond: 341, b1_3cond: 310,  b2_2cond: 310,  b2_3cond: 273,  c_2cond: 408,  c_3cond: 353, al_b1_3cond: 240, al_aereo_3cond: 380 },
  { gaugeMM2: 240.0, outerDiameterMM: 26.0, areaExternalMM2: 530.9, b1_2cond: 400, b1_3cond: 364,  b2_2cond: 364,  b2_3cond: 321,  c_2cond: 481,  c_3cond: 415, al_b1_3cond: 282, al_aereo_3cond: 450 }
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
  
  // Seleção e exclusão dinâmica de cargas e perdas nos painéis
  selectedLoads220V?: Record<string, boolean>;
  selectedLoads380V?: Record<string, boolean>;

  // Distâncias e margens dos trechos gerais
  section1DistanceM: number;       // Padrão -> Painel 220V
  section1MarginPercent: number;
  section1ConductorMaterial?: 'copper' | 'aluminum';
  section1InstallationMethod?: 'B1' | 'B2' | 'C' | 'D' | 'F' | 'E';
  section2DistanceM: number;       // Painel 220V -> Trafo
  section2MarginPercent: number;
  section2ConductorMaterial?: 'copper' | 'aluminum';
  section2InstallationMethod?: 'B1' | 'B2' | 'C' | 'D' | 'F' | 'E';
  section3DistanceM: number;       // Trafo -> Painel 380V
  section3MarginPercent: number;
  section3ConductorMaterial?: 'copper' | 'aluminum';
  section3InstallationMethod?: 'B1' | 'B2' | 'C' | 'D' | 'F' | 'E';

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

  // Customização de Transformador Elevador e Perdas
  customTransformerKVA?: number;
  customTransformerEfficiencyPercent?: number; // Rendimento (%) do trafo (default 97.5%)
  customTransformerLossesKW?: number;          // Perdas no cobre e ferro em kW (direto do ensaio/datasheet)

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
  installationMethod?: 'B1' | 'B2' | 'C' | 'D' | 'F' | 'E';
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

  // Fatores de correção ambientais (NBR 5410 Tabela 40 e Tabela 42)
  const FCT = installationMethod === 'D' ? 1.00 : 1.00; // Solo 20°C (FCT=1.0) ou Ar 30°C (FCT=1.0)
  const FCA = 1.00; // 1 circuito no duto ou feixe (FCA=1.0)
  const DERATING_FACTOR = FCT * FCA;

  const isAerial = installationMethod === 'F' || installationMethod === 'E';

  const methodLabel = installationMethod === 'F'
    ? 'Método F (Cabos unipolares ou multiplexados ao ar livre / aéreo em postes - NBR 5410 Tabela 33)'
    : installationMethod === 'E'
    ? 'Método E (Cabo multipolar / multiplexado ao ar livre em isoladores ou fixado em poste - NBR 5410)'
    : installationMethod === 'B1'
    ? 'Método B1 (Condutores isolados em eletroduto de seção circular embutido em alvenaria - NBR 5410 Tabela 33)'
    : installationMethod === 'B2'
    ? 'Método B2 (Cabo multipolar em eletroduto sobre parede ou aparente - NBR 5410 Tabela 33)'
    : installationMethod === 'C'
    ? 'Método C (Cabos unipolares ou multipolares fixados diretamente na parede/perfilado - NBR 5410)'
    : 'Método D (Cabos em eletroduto enterrado no solo - NBR 5410 Tabela 33)';

  const tempRef = installationMethod === 'D' ? '20°C (Solo, FCT=1.00)' : '30°C (Ar Ambiente, FCT=1.00)';
  const groupedNote = isAerial ? 'Cabo isolado autossustentado ao ar livre' : '1 circuito isolado no conduto (FCA=1.00)';

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
      else if (installationMethod === 'C') cap = isThreePhase ? spec.c_3cond : spec.c_2cond;
      else if (isAerial) cap = isThreePhase ? (spec.c_3cond * 1.15) : (spec.c_2cond * 1.15);

      // Capacidade de condutor de Alumínio (multiplexado aéreo ou duto)
      if (isAluminum) {
        if (isAerial) {
          cap = spec.al_aereo_3cond || Math.round(cap * 0.85);
        } else {
          cap = spec.al_b1_3cond || Math.round(cap * 0.78);
        }
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

  // 2. Critério de Queda de Tensão (NBR 5410 / NBR 17019: máx 2.0% a 3.0% trecho parcial)
  const initialAmpacityGauge = selectedSpec.gaugeMM2;
  const initialAmpacityA = ampacityPerCable;
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

      // Atualiza a ampacidade nominal de tabela para corresponder rigorosamente à nova bitola
      let cap = isThreePhase ? spec.b1_3cond : spec.b1_2cond;
      if (installationMethod === 'B2') cap = isThreePhase ? spec.b2_3cond : spec.b2_2cond;
      else if (installationMethod === 'C') cap = isThreePhase ? spec.c_3cond : spec.c_2cond;
      else if (isAerial) cap = isThreePhase ? (spec.c_3cond * 1.15) : (spec.c_2cond * 1.15);

      if (isAluminum) {
        if (isAerial) {
          cap = spec.al_aereo_3cond || Math.round(cap * 0.85);
        } else {
          cap = spec.al_b1_3cond || Math.round(cap * 0.78);
        }
      }
      ampacityPerCable = cap;
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

  const isGaugeIncreasedByVoltageDrop = cableGaugePhaseMM2 > initialAmpacityGauge;
  const reasonText = isGaugeIncreasedByVoltageDrop
    ? ` (Nota Técnica: Pelo critério de ampacidade pura da NBR 5410, a bitola de ${initialAmpacityGauge}mm² com Iz = ${initialAmpacityA}A já atenderia à corrente Ib = ${designCurrentA.toFixed(1)}A. A bitola foi elevada para ${cableGaugePhaseMM2}mm² com Iz = ${totalAmpacityA}A exclusivamente para atender ao limite de Queda de Tensão máxima de ${maxAllowedVoltageDropPercent}% em virtude da distância de ${distanceTotalM}m a ${voltageV}V).`
    : '';

  const formulaAmpacity = chosenConductors > 1
    ? `Critério de Ampacidade: ${chosenConductors} vias em paralelo de ${matLabel}. ${methodLabel}. Temperatura: ${tempRef}, Agrupamento: ${groupedNote}. Fator de Correção Total FCT × FCA = ${(FCT * FCA).toFixed(2)}. Corrente de projeto por via: Ib/via = ${designCurrentA.toFixed(1)}A / ${chosenConductors} = ${(designCurrentA / chosenConductors).toFixed(1)}A. Capacidade nominal de tabela: ${ampacityPerCable}A por cabo. Capacidade corrigida total: Iz = ${chosenConductors} × (${ampacityPerCable}A × ${(FCT * FCA).toFixed(2)}) = ${totalAmpacityA}A (≥ Ib ${designCurrentA.toFixed(1)}A — CONFORME).${reasonText}`
    : `Critério de Ampacidade: 1 condutor por fase de ${matLabel}. ${methodLabel}. Temperatura: ${tempRef}, Agrupamento: ${groupedNote}. Fator de Correção Total FCT × FCA = ${(FCT * FCA).toFixed(2)}. Cabo ${cableGaugePhaseMM2}mm² possui capacidade nominal de ${ampacityPerCable}A. Capacidade corrigida Iz = ${ampacityPerCable}A × ${(FCT * FCA).toFixed(2)} = ${totalAmpacityA}A (≥ Ib ${designCurrentA.toFixed(1)}A — CONFORME).${reasonText}`;

  const formulaVoltageDrop = isThreePhase
    ? `ΔV = (√3 × ρ_${isAluminum ? 'Al' : 'Cu'} × L × Ib × cos φ) / S_eq = (1.732 × ${resistivity} × ${distanceTotalM}m × ${designCurrentA.toFixed(1)}A × ${cosPhi}) / (${cableGaugePhaseMM2} × ${chosenConductors}mm²) = ${voltageDropVolts}V (${voltageDropPercent}% ≤ ${maxAllowedVoltageDropPercent}% - CONFORME).`
    : `ΔV = (2 × ρ_${isAluminum ? 'Al' : 'Cu'} × L × Ib × cos φ) / S_eq = ${voltageDropVolts}V (${voltageDropPercent}% ≤ ${maxAllowedVoltageDropPercent}% - CONFORME).`;

  // 4. Perdas Joule nos Cabos (Efeito Joule NBR 5410)
  const equivalentPhaseGauge = cableGaugePhaseMM2 * chosenConductors;
  const cableResistanceOhm = Number(((resistivity * distanceTotalM) / equivalentPhaseGauge).toFixed(4));
  const numCarryingConductors = isThreePhase ? 3 : 2;
  const jouleLossesWatts = Math.round(numCarryingConductors * cableResistanceOhm * (designCurrentA ** 2));
  const jouleLossesKW = Number((jouleLossesWatts / 1000).toFixed(3));
  const activePowerRefKW = powerKW || Number(((designCurrentA * Math.sqrt(isThreePhase ? 3 : 1) * voltageV * cosPhi) / 1000).toFixed(1));
  const jouleLossesPercent = activePowerRefKW > 0 ? Number(((jouleLossesKW / activePowerRefKW) * 100).toFixed(2)) : 0;

  const formulaJouleLosses = isThreePhase
    ? `P_perda = 3 × R_fase × Ib² = 3 × (${resistivity} × ${distanceTotalM}m / ${equivalentPhaseGauge}mm²) × (${designCurrentA.toFixed(1)}A)² = 3 × ${cableResistanceOhm}Ω × ${(designCurrentA ** 2).toFixed(0)} = ${jouleLossesWatts} W (${jouleLossesKW} kW • ${jouleLossesPercent}%)`
    : `P_perda = 2 × R_fase × Ib² = 2 × (${resistivity} × ${distanceTotalM}m / ${equivalentPhaseGauge}mm²) × (${designCurrentA.toFixed(1)}A)² = 2 × ${cableResistanceOhm}Ω × ${(designCurrentA ** 2).toFixed(0)} = ${jouleLossesWatts} W (${jouleLossesKW} kW • ${jouleLossesPercent}%)`;

  // Construção da especificação normatizada do cabo
  // Regras NBR 5410 / CEMIG ND-5.1:
  // - Alumínio: Trifásico = Quadruplex (3F+N), Bifásico = Triplex (2F+N), Monofásico = Biplex (1F+N)
  // - Cobre: Enterrado em duto (Método D) = Isolamento 0,6/1kV (NBR 7286/7288); Em alvenaria (Método B1) = Isolamento 450/750V (NBR NM 247-3)
  let cableDescription = '';
  const viasStr = chosenConductors > 1 ? `${chosenConductors}x ` : '';
  if (isAluminum) {
    const multiplexType = phases === 3 ? 'Quadruplex (3F+N)' : phases === 2 ? 'Triplex (2F+N)' : 'Biplex (1F+N)';
    const neutroStr = includeNeutral ? ` + ${cableGaugePhaseMM2}mm² N` : '';
    cableDescription = `Cabo Alumínio ${multiplexType} ${viasStr}${cableGaugePhaseMM2}mm²${neutroStr} (0,6/1kV XLPE)`;
  } else {
    // Cobre
    const numFasesStr = phases === 3 ? '3x' : phases === 2 ? '2x' : '1x';
    const isolamentoStr = installationMethod === 'D' 
      ? '0,6/1kV (Enterrado NBR 5410)' 
      : '750V (Alvenaria NBR 5410)';
    const neutroPE = includeNeutral 
      ? ` + ${cableGaugePhaseMM2}mm² N + ${cableGaugeGroundMM2}mm² PE` 
      : ` + ${cableGaugeGroundMM2}mm² PE`;
    cableDescription = `Cabo Cobre ${viasStr}${numFasesStr} ${cableGaugePhaseMM2}mm²${neutroPE} (${isolamentoStr})`;
  }

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
    cableDescription,
    conduitDiameterMM: isAerial ? 0 : selectedConduit.internalDiameterMM,
    conduitInches: isAerial ? 'Aéreo (Sem Duto)' : conduitQuantity > 1 ? `${conduitQuantity}x(${selectedConduit.inches})` : selectedConduit.inches,
    conduitQuantity: isAerial ? 0 : conduitQuantity,
    conduitFillingRatePercent: isAerial ? 0 : conduitFillingRatePercent,
    voltageDropPercent,
    voltageDropVolts,
    isVoltageDropCompliant: voltageDropPercent <= maxAllowedVoltageDropPercent,
    ampacityPerCableA: ampacityPerCable,
    totalAmpacityA,
    calculationBreakdown: {
      activePowerKW: powerKW,
      apparentPowerKVA: Number(((designCurrentA * Math.sqrt(isThreePhase ? 3 : 1) * voltageV) / 1000).toFixed(1)),
      cableResistanceOhm,
      jouleLossesWatts,
      jouleLossesKW,
      jouleLossesPercent,
      formulaDesignCurrent,
      formulaAmpacity,
      formulaVoltageDrop,
      formulaJouleLosses,
      fct: FCT,
      fca: FCA,
      rhoCopper: resistivity,
      installationMethodName: methodLabel,
      tempReference: tempRef,
      groupedCircuitsNote: groupedNote,
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
    maxChargerCapKW,
    selectedLoads220V = {},
    selectedLoads380V = {}
  } = params;

  const {
    customTransformerEfficiencyPercent,
    customTransformerLossesKW
  } = params;

  // 1. Diagnóstico e Perdas Internas dos Carregadores
  const totalChargersNominalKW = Number(chargers.reduce((sum, c) => sum + c.powerKW, 0).toFixed(2));
  const hasCharger380V = chargers.some(c => c.voltageV >= 380);
  const allChargers220V = chargers.length > 0 && chargers.every(c => c.voltageV < 380);
  const isGrid380V = gridSupplyVoltage === 380;
  const isTransformerNeeded = gridSupplyVoltage === 220 && hasCharger380V;

  // Filtros dinâmicos de perdas selecionadas nos painéis
  const includeFeederLosses380V = selectedLoads380V.feederLosses !== false;
  const includeChargerLosses380V = selectedLoads380V.chargerInternalLosses !== false;

  // 1.1 Modelagem individual dos Carregadores com Rendimento e Perdas Internas
  const enrichedChargers = chargers.map(c => {
    const is380 = c.voltageV >= 380;
    const isSelected = is380
      ? (selectedLoads380V[c.id] !== false)
      : (selectedLoads220V[`ch_${c.id}`] !== false);

    const isDC = c.type === 'DC' || c.powerKW >= 30;
    // Rendimento padrão da indústria: 95.0% para retificadores DC industriais / 98.5% para AC Wallbox
    const defaultEff = isDC ? 95.0 : 98.5;
    const effPercent = c.efficiencyPercent !== undefined && c.efficiencyPercent > 0 ? c.efficiencyPercent : defaultEff;
    const eff = effPercent / 100;

    // Perda interna calculada em kW: P_loss = P_nominal * (1/η - 1)
    const calcLossesKW = Number((c.powerKW * (1 / eff - 1)).toFixed(2));
    const rawInternalLossesKW = c.internalLossesKW !== undefined && c.internalLossesKW >= 0 ? c.internalLossesKW : calcLossesKW;
    const internalLossesKW = (is380 ? includeChargerLosses380V : true) ? rawInternalLossesKW : 0;
    
    // Potência de entrada: se não estiver selecionado na lista de cargas ativas, a potência alocada é zero
    const inputPowerKW = isSelected ? Number((c.powerKW + internalLossesKW).toFixed(2)) : 0;

    // Corrente de entrada na alimentação do carregador (considerando perdas internas se ativas)
    const sqrtPhases = Math.sqrt(c.phases === 3 ? 3 : 1);
    const designCurrentA = inputPowerKW > 0 ? Number(((inputPowerKW * 1000) / (sqrtPhases * c.voltageV * 0.98)).toFixed(1)) : 0;

    return {
      ...c,
      isSelected,
      efficiencyPercent: effPercent,
      internalLossesKW,
      inputPowerKW,
      designCurrentA
    };
  });

  const totalChargersInputKW = Number(enrichedChargers.reduce((sum, c) => sum + c.inputPowerKW, 0).toFixed(2));
  const totalChargersLossesKW = Number(enrichedChargers.reduce((sum, c) => sum + c.internalLossesKW, 0).toFixed(2));

  // 2. Trecho 4: Alimentadores Individuais para cada Carregador
  // Cada alimentador é dimensionado para a corrente de entrada que inclui as perdas do carregador
  const section4_feeders: SectionCableConduitSizing[] = enrichedChargers.map((charger, index) => {
    const is380 = charger.voltageV >= 380;
    const fromPanel = isGrid380V ? 'Painel Geral 380V (QGBT)' : (is380 ? 'Painel 380V' : 'Painel 220V');

    return sizeCableAndConduitSection({
      sectionId: 'trecho_4',
      name: `Trecho 4.${index + 1}: ${fromPanel} ➔ ${charger.brand} ${charger.name} (${charger.powerKW} kW)`,
      fromNode: fromPanel,
      toNode: charger.name,
      distanceNominalM: charger.distanceMeters,
      marginPercent: charger.marginPercent,
      designCurrentA: charger.designCurrentA > 0 ? charger.designCurrentA : 10,
      phases: charger.phases,
      voltageV: charger.voltageV,
      conductorMaterial: charger.conductorMaterial || 'copper',
      installationMethod: charger.installationMethod || 'B1',
      maxAllowedVoltageDropPercent: 2.0,
      includeNeutral: true,
      powerKW: charger.inputPowerKW
    });
  });

  // Perdas Joule nos alimentadores do Trecho 4 (zeradas se o usuário desmarcar perdas de alimentadores)
  const totalFeederLosses380VKW = includeFeederLosses380V
    ? Number(
        section4_feeders
          .filter((_, idx) => enrichedChargers[idx].voltageV >= 380 && enrichedChargers[idx].isSelected)
          .reduce((sum, f) => sum + (f.calculationBreakdown?.jouleLossesKW || 0), 0)
          .toFixed(3)
      )
    : 0;

  const totalFeederLossesAllKW = includeFeederLosses380V
    ? Number(
        section4_feeders
          .filter((_, idx) => enrichedChargers[idx].isSelected)
          .reduce((sum, f) => sum + (f.calculationBreakdown?.jouleLossesKW || 0), 0)
          .toFixed(3)
      )
    : 0;

  // Cargas Auxiliares no Painel 380V (filtradas por circuitos marcados)
  const activeCustomCircuits380V = customCircuits380V.filter(c => selectedLoads380V[`custom_${c.id}`] !== false);
  const customCircuits380VKW = activeCustomCircuits380V.reduce((sum, c) => sum + (c.powerW || 0), 0) / 1000;
  const customCircuits380VA = customCircuits380VKW > 0 ? (customCircuits380VKW * 1000) / (Math.sqrt(3) * 380 * 0.98) : 0;

  // 3. Potência Ativa e Corrente Total no Secundário 380V (estritamente das cargas e perdas selecionadas)
  const chargers380VInputKW = Number(
    enrichedChargers.filter(c => c.voltageV >= 380 && c.isSelected).reduce((sum, c) => sum + c.inputPowerKW, 0).toFixed(2)
  );
  const secondaryTotalActiveKW = Number((chargers380VInputKW + totalFeederLosses380VKW + customCircuits380VKW).toFixed(2));
  const trafoSecondaryCurrentA = secondaryTotalActiveKW > 0
    ? Number(((secondaryTotalActiveKW * 1000) / (Math.sqrt(3) * 380 * 0.98)).toFixed(1))
    : 0;

  // 4. Trecho 3: Secundário do Transformador (380V) ➔ Painel 380V
  let section3: SectionCableConduitSizing | undefined;
  let section3LossKW = 0;
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
      includeNeutral: true,
      minGaugeMM2: section3ConductorMaterial === 'aluminum' ? 16 : 10, // Seção mínima NBR 5410 (CORREÇÃO: removido 70/95mm² que forçava 70mm²)
      minConductorsPerPhase: trafoSecondaryCurrentA > 360 ? 2 : 1,
      standardOriginNote: `Alimentação secundária do Trafo em 380V com ${trafoSecondaryCurrentA}A • Condutor ${section3ConductorMaterial === 'aluminum' ? 'Alumínio' : 'Cobre'}`,
      powerKW: secondaryTotalActiveKW
    });
    section3LossKW = section3.calculationBreakdown?.jouleLossesKW || 0;
  }

  // 5. Dimensionamento do Transformador Elevador (Dyn1 a seco)
  let transformerKVA = 0;
  let trafoPrimaryCurrentA = 0;
  let trafoPrimaryActiveKW = 0;
  let downstreamCables220LossesKW = 0;
  let trafoLossesKW = 0;
  let isTrafoOverloaded = false;
  let trafoOverloadPercent = 0;
  let trafoBreakdown: TransformerTopologyState['calculationBreakdown'] | undefined;
  const cosPhiTrafo = 0.98;
  const defaultTrafoEff = 97.5; // Rendimento padrão 97.5% para trafo a seco moderno NBR 5356
  const trafoEffPercent = customTransformerEfficiencyPercent || defaultTrafoEff;
  const effTrafo = trafoEffPercent / 100;

  const isTrafoFeederSelected = selectedLoads220V.trafoFeeder !== false;
  const includeTrafoLosses220V = selectedLoads220V.trafoLosses !== false;
  const includeSectionLosses220V = selectedLoads220V.sectionLosses !== false;
  const effectiveSection3LossKW = includeSectionLosses220V ? section3LossKW : 0;

  if (isTransformerNeeded) {
    // Demanda entregue pelo secundário somando cargas e perdas do cabo Trecho 3 (se selecionado o alimentador do trafo)
    const trafoOutputDemandKW = isTrafoFeederSelected
      ? Number((secondaryTotalActiveKW + effectiveSection3LossKW).toFixed(2))
      : 0;

    // Perdas do transformador (ferro + cobre)
    const calcTrafoLossesKW = includeTrafoLosses220V && trafoOutputDemandKW > 0
      ? Number((trafoOutputDemandKW * (1 / effTrafo - 1)).toFixed(2))
      : 0;
    trafoLossesKW = customTransformerLossesKW !== undefined && customTransformerLossesKW >= 0
      ? (includeTrafoLosses220V ? customTransformerLossesKW : 0)
      : calcTrafoLossesKW;

    downstreamCables220LossesKW = includeSectionLosses220V
      ? Number((effectiveSection3LossKW + (includeFeederLosses380V ? totalFeederLosses380VKW : 0)).toFixed(2))
      : 0;

    // Potência primária considerando estritamente as cargas e perdas ativas selecionadas no quadro
    trafoPrimaryActiveKW = isTrafoFeederSelected
      ? Number((totalChargersNominalKW + trafoLossesKW + downstreamCables220LossesKW).toFixed(2))
      : 0;
    const loadApparentKVA = Number((trafoPrimaryActiveKW / cosPhiTrafo).toFixed(1));
    const safetyMarginFactor = 1.15; // NBR 17019 regime contínuo
    const requiredKVA = Number((loadApparentKVA * safetyMarginFactor).toFixed(1));

    let autoSelectedKVA = 300;
    if (trafoOutputDemandKW <= 40) autoSelectedKVA = 50;
    else if (trafoOutputDemandKW <= 60) autoSelectedKVA = 75;
    else if (trafoOutputDemandKW <= 80) autoSelectedKVA = 100;
    else if (trafoOutputDemandKW <= 120) autoSelectedKVA = 150;
    else if (trafoOutputDemandKW <= 180) autoSelectedKVA = 225;
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

    trafoPrimaryCurrentA = trafoPrimaryActiveKW > 0
      ? Number(((trafoPrimaryActiveKW * 1000) / (Math.sqrt(3) * 220 * cosPhiTrafo)).toFixed(1))
      : 0;

    trafoBreakdown = {
      totalLoadChargersKW: totalChargersNominalKW,
      totalFeedersLossKW: totalFeederLosses380VKW,
      totalSecondaryPowerKW: secondaryTotalActiveKW,
      totalPrimaryPowerKW: trafoPrimaryActiveKW,
      cosPhi: cosPhiTrafo,
      efficiency: effTrafo,
      safetyMarginFactor,
      calculatedRawKVA: requiredKVA,
      standardSelectedKVA: transformerKVA,
      isCustomSelected: Boolean(customTransformerKVA && customTransformerKVA > 0),
      isOverloaded: isTrafoOverloaded,
      overloadPercentage: trafoOverloadPercent,
      formulaKVA: customTransformerKVA
        ? `S_trafo = ${customTransformerKVA} kVA (Demanda necessária com perdas: ${loadApparentKVA} kVA ${isTrafoOverloaded ? `⚠️ SOBRECARGA DE +${trafoOverloadPercent}%!` : '✓ ADEQUADO'})`
        : `S_trafo = (P_prim / cos φ) × 1.15 = (${trafoPrimaryActiveKW} kW / ${cosPhiTrafo}) × 1.15 = ${requiredKVA} kVA ➔ Comercial: ${transformerKVA} kVA`,
      formulaPrimaryCurrent: `I_prim (220V) = P_prim / (√3 × 220V × cos φ) = (${trafoPrimaryActiveKW} × 1000) / (1.732 × 220 × ${cosPhiTrafo}) = ${trafoPrimaryCurrentA} A`,
      formulaSecondaryCurrent: `I_sec (380V) = P_sec / (√3 × 380V × cos φ) = (${secondaryTotalActiveKW} × 1000) / (1.732 × 380 × ${cosPhiTrafo}) = ${trafoSecondaryCurrentA} A`,
      formulaLosses: `Perdas no Trafo (${trafoEffPercent}% rendimento): ${trafoLossesKW} kW • Perdas nos cabos secundários: ${(totalFeederLosses380VKW + section3LossKW).toFixed(2)} kW • Perdas internas carregadores 380V: ${(chargers380VInputKW - chargers.filter(c => c.voltageV >= 380).reduce((s, c) => s + c.powerKW, 0)).toFixed(2)} kW`,
      notes: isTrafoOverloaded
        ? `ALERTA DE ENGENHARIA: A potência digitada (${customTransformerKVA} kVA) é inferior à demanda da carga com perdas (${loadApparentKVA} kVA). Risco de sobreaquecimento térmico.`
        : `Transformador elevador a seco com fator K-4. Ligação Dyn1 (Δ 220V primário / Y 380V secundário com Neutro acessível aterrado no BEP).`
    };
  }

  // 6. Trecho 2: Painel 220V ➔ Primário do Transformador
  let section2: SectionCableConduitSizing | undefined;
  let section2LossKW = 0;
  if (isTransformerNeeded) {
    const trafoPrimaryActiveKW = trafoBreakdown?.totalPrimaryPowerKW || 0;
    section2 = sizeCableAndConduitSection({
      sectionId: 'trecho_2',
      name: 'Trecho 2: Painel 220V ➔ Primário Transformador (220V)',
      fromNode: 'Painel 220V',
      toNode: 'Primário Transformador',
      distanceNominalM: section2DistanceM,
      marginPercent: section2MarginPercent,
      designCurrentA: trafoPrimaryCurrentA > 0 ? trafoPrimaryCurrentA : 10,
      phases: 3,
      voltageV: 220,
      conductorMaterial: section2ConductorMaterial,
      installationMethod: section2InstallationMethod,
      maxAllowedVoltageDropPercent: 1.0,
      includeNeutral: true,
      minGaugeMM2: section2ConductorMaterial === 'aluminum' ? 16 : 10,
      minConductorsPerPhase: trafoPrimaryCurrentA > 360 ? (trafoPrimaryCurrentA > 600 ? 3 : 2) : 1,
      standardOriginNote: `Alimentação primária em 220V considerando perdas totais (${trafoPrimaryCurrentA}A) • Trafo de ${transformerKVA} kVA • Condutor ${section2ConductorMaterial === 'aluminum' ? 'Alumínio' : 'Cobre'}`,
      powerKW: trafoPrimaryActiveKW
    });
    section2LossKW = includeSectionLosses220V ? (section2.calculationBreakdown?.jouleLossesKW || 0) : 0;
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
    efficiencyPercent: trafoEffPercent,
    customLossesKW: customTransformerLossesKW,
    apparentPowerKVA: transformerKVA,
    activePowerKW: chargers.filter(c => c.voltageV >= 380).reduce((sum, c) => sum + c.powerKW, 0),
    calculationBreakdown: trafoBreakdown
  };

  // 7. Cargas Auxiliares no Painel 220V
  const isCctvSelected = (selectedLoads220V.auxCctv !== false && selectedLoads220V.cctv !== false) && auxiliaryConfig.cctvEnabled;
  const isOutletSelected = (selectedLoads220V.auxOutlet !== false && selectedLoads220V.outlet !== false) && auxiliaryConfig.outletEnabled;
  const isLightingSelected = (selectedLoads220V.auxLighting !== false && selectedLoads220V.lighting !== false) && auxiliaryConfig.lightingEnabled;

  const cctvPowerW = isCctvSelected ? auxiliaryConfig.cctvPowerW : 0;
  const outletPowerW = isOutletSelected ? auxiliaryConfig.outletPowerW : 0;
  const lightingPowerW = isLightingSelected ? auxiliaryConfig.lightingPowerW : 0;
  const activeCustomCircuits220V = customCircuits220V.filter(c => selectedLoads220V[`custom_${c.id}`] !== false);
  const customAux220VKW = activeCustomCircuits220V.reduce((sum, c) => sum + (c.powerW || 0), 0) / 1000;
  const totalAuxKW = Number(((cctvPowerW + outletPowerW + lightingPowerW) / 1000 + customAux220VKW).toFixed(2));

  // Correntes de cada circuito auxiliar dimensionadas pela sua carga lançada em projeto
  const cctvVoltage = isGrid380V ? 220 : 127;
  const cctvCurrentA = cctvPowerW > 0 ? Number((cctvPowerW / cctvVoltage).toFixed(1)) : 0;
  const cctvBreakerA = 16; // Padrão normativo de projeto: 16A Monofásico Curva C

  const outletVoltage = isGrid380V ? 220 : 127;
  const outletCurrentA = outletPowerW > 0 ? Number((outletPowerW / outletVoltage).toFixed(1)) : 0;
  const outletBreakerA = 25; // Padrão normativo de projeto: 25A Monofásico Curva C (Tomada de Manutenção TUG/TUE)

  const lightingVoltage = isGrid380V ? 220 : 127;
  const lightingCurrentA = lightingPowerW > 0 ? Number((lightingPowerW / lightingVoltage).toFixed(1)) : 0;
  const lightingBreakerA = 10; // Padrão normativo de projeto: 10A Monofásico Curva C (Iluminação LED)

  // Carga de base do cliente (filtrada se selecionada)
  const isClientBaseSelected = selectedLoads220V.clientBase !== false;
  const effectiveClientBaseLoadKW = isClientBaseSelected ? clientBaseLoadKW : 0;

  // Disjuntor do Cliente dimensionado pela carga existente de medição (Passos 1A e 1B)
  const clientVoltage = isGrid380V ? 380 : 220;
  const clientCurrentA = effectiveClientBaseLoadKW > 0
    ? Number(((effectiveClientBaseLoadKW * 1000) / (Math.sqrt(3) * clientVoltage * 0.95)).toFixed(1))
    : 0;
  const clientBreakerA = clientCurrentA > 0
    ? (STANDARD_BREAKERS.find(b => b >= clientCurrentA * 1.15) || 40)
    : 40;

  // Medidor Exclusivo do Hub: Mede trafo/carregadores + auxiliares (NÃO mede carga de base do cliente)
  const hubDirectLoadKW = isTransformerNeeded
    ? Number((trafoPrimaryActiveKW + (includeSectionLosses220V ? section2LossKW : 0)).toFixed(2))
    : Number((totalChargersInputKW + totalFeederLossesAllKW).toFixed(2));
  const hubAggregatedLoadKW = Number((hubDirectLoadKW + totalAuxKW).toFixed(2));

  const auxiliaryLoads: AuxiliaryLoadsState = {
    cctv: {
      enabled: auxiliaryConfig.cctvEnabled && isCctvSelected,
      voltageV: cctvVoltage as any,
      powerW: cctvPowerW,
      phases: 1,
      breakerA: cctvBreakerA,
      cableMM2: 2.5,
      curve: 'C',
      designCurrentA: cctvCurrentA,
      formulaSizing: `Ib = P / V = ${cctvPowerW}W / ${cctvVoltage}V = ${cctvCurrentA}A ➔ Disjuntor ${cctvBreakerA}A Curva C + DPS Classe III`
    },
    maintenanceOutlet: {
      enabled: auxiliaryConfig.outletEnabled && isOutletSelected,
      voltageV: outletVoltage as any,
      powerW: outletPowerW,
      phases: 1,
      breakerA: outletBreakerA,
      cableMM2: 2.5,
      curve: 'C',
      designCurrentA: outletCurrentA,
      drRequired: true,
      drType: 'Bipolar 25A / 30mA Tipo A/AC',
      formulaSizing: `Ib = P / V = ${outletPowerW}W / ${outletVoltage}V = ${outletCurrentA}A ➔ Disjuntor ${outletBreakerA}A Curva C + DR 30mA (NBR 5410)`
    },
    lighting: {
      enabled: auxiliaryConfig.lightingEnabled && isLightingSelected,
      voltageV: lightingVoltage as any,
      powerW: lightingPowerW,
      phases: 1,
      breakerA: lightingBreakerA,
      cableMM2: 2.5,
      curve: 'C',
      designCurrentA: lightingCurrentA,
      formulaSizing: `Ib = P / V = ${lightingPowerW}W / ${lightingVoltage}V = ${lightingCurrentA}A ➔ Disjuntor ${lightingBreakerA}A Curva C`
    },
    clientBaseBreaker: {
      enabled: effectiveClientBaseLoadKW > 0,
      voltageV: clientVoltage as any,
      powerKW: effectiveClientBaseLoadKW,
      phases: 3,
      breakerA: clientBreakerA,
      designCurrentA: clientCurrentA,
      curve: 'C',
      formulaSizing: `Ib = P / (√3 × ${clientVoltage}V × 0.95) = (${effectiveClientBaseLoadKW} × 1000) / (1.732 × ${clientVoltage} × 0.95) = ${clientCurrentA}A ➔ Disjuntor ${clientBreakerA}A Caixa Moldada`
    },
    dps220V: {
      enabled: true,
      classType: 'Classe II',
      rating: isGrid380V ? 'Uc=385V, In=20kA, Imax=40kA' : 'Uc=275V, In=20kA, Imax=40kA',
      quantity: isGrid380V ? 4 : 3
    },
    energyMeter: {
      enabled: true,
      type: 'Multimedidor digital com TC bipartido e RS485 Modbus RTU',
      measuresTrafoAndAuxOnly: true,
      aggregatedLoadKW: hubAggregatedLoadKW
    }
  };

  // 8. Painel Geral 220V: Disjuntor Geral dimensionado pela SOMA INTEGRAL:
  // Carga Carregadores + Auxiliares + Carga do Cliente + Perdas inerentes aos cabos e componentes a frente
  const totalPanel220VActiveKW = Number((effectiveClientBaseLoadKW + hubAggregatedLoadKW).toFixed(2));
  const panel220VVoltage = isGrid380V ? 380 : 220;
  const panelMainCurrentA = totalPanel220VActiveKW > 0
    ? Number(((totalPanel220VActiveKW * 1000) / (Math.sqrt(3) * panel220VVoltage * 0.98)).toFixed(1))
    : 0;
  const panelMainBreakerA = panelMainCurrentA > 0
    ? (panelMainCurrentA > 200 && panelMainCurrentA <= 250
        ? 250
        : (STANDARD_BREAKERS.find(b => b >= panelMainCurrentA) || (isGrid380V ? 100 : 125)))
    : 40;

  // Disjuntor dedicado de proteção do transformador 220/380V (no primário 220V do Painel)
  // Critério NBR 5410 (Ib <= In <= Iz) com suporte magnético Curva D para inrush
  const trafoPrimaryBreakerA = isTransformerNeeded
    ? (trafoPrimaryCurrentA > 0
        ? (trafoPrimaryCurrentA > 200 && trafoPrimaryCurrentA <= 250
            ? 250
            : (STANDARD_BREAKERS.find(b => b >= trafoPrimaryCurrentA) || 250))
        : 40)
    : undefined;

  // Disjuntores dos carregadores individuais (dimensionados pela potência e perdas internas)
  const individualChargerBreakers = enrichedChargers.map(c => {
    const inrushFactor = 1.15;
    const calcA = c.designCurrentA * inrushFactor;
    const breakerA = STANDARD_BREAKERS.find(b => b >= calcA) || 40;
    const vRef = c.voltageV;
    const sqrtPh = Math.sqrt(c.phases === 3 ? 3 : 1);
    const formulaSizing = `Ib = P_ent / (${c.phases === 3 ? '√3 × ' : ''}${vRef}V × 0.98) = ${c.inputPowerKW}kW / (${sqrtPh.toFixed(3)} × ${vRef} × 0.98) = ${c.designCurrentA}A ➔ Disjuntor ${breakerA}A Curva C (${c.phases}P)`;
    return {
      chargerId: c.id,
      breakerA,
      poles: c.phases === 3 ? 3 : 2,
      curve: 'C' as const,
      drType: c.phases === 3 ? 'Tetrapolar 40A / 30mA Tipo B' : 'Bipolar 40A / 30mA Tipo B',
      designCurrentA: c.designCurrentA,
      nominalPowerKW: c.powerKW,
      internalLossesKW: c.internalLossesKW,
      inputPowerKW: c.inputPowerKW,
      formulaSizing
    };
  });

  const panelMarginA = panelMainBreakerA > panelMainCurrentA ? Number((panelMainBreakerA - panelMainCurrentA).toFixed(1)) : 0;
  const panelMarginPct = panelMainCurrentA > 0 ? Number((((panelMainBreakerA / panelMainCurrentA) - 1) * 100).toFixed(1)) : 0;
  const trafoMarginA = (trafoPrimaryBreakerA && trafoPrimaryCurrentA > 0) ? Number((trafoPrimaryBreakerA - trafoPrimaryCurrentA).toFixed(1)) : 0;
  const trafoMarginPct = (trafoPrimaryBreakerA && trafoPrimaryCurrentA > 0) ? Number((((trafoPrimaryBreakerA / trafoPrimaryCurrentA) - 1) * 100).toFixed(1)) : 0;

  const formula220VMain = `Disjuntor Geral 220V: P_tot = P_cliente (${effectiveClientBaseLoadKW.toFixed(2)} kW) + P_hub (${hubAggregatedLoadKW.toFixed(2)} kW com perdas trafo ${trafoLossesKW}kW e cabos) = ${totalPanel220VActiveKW.toFixed(2)} kW. Ib = P_tot / (√3 × 220V × 0.98) = ${panelMainCurrentA} A. Critério NBR 5410 item 5.3.4.1 (Ib ≤ In ≤ Iz): Adotado Disjuntor Geral ${panelMainBreakerA}A Caixa Moldada Curva ${isTransformerNeeded ? 'D' : 'C'} (Folga térmica contínua: +${panelMarginA} A / +${panelMarginPct}%). O transitório de energização (inrush de trafo/retificadores de 10x a 14x In: ${panelMainBreakerA * 10}A a ${panelMainBreakerA * 14}A) é absorvido pela Curva ${isTransformerNeeded ? 'D' : 'C'} no disparo magnético instantâneo, dispensando sobredimensionamento térmico para 300A e otimizando a bitola dos condutores.`;
  const formulaTrafoBreaker = isTransformerNeeded
    ? `Disjuntor do Trafo (Primário 220V): P_prim = ${trafoPrimaryActiveKW} kW (Cargas carregadores ${isTrafoFeederSelected ? totalChargersNominalKW : 0} kW + perdas trafo ${trafoLossesKW} kW + perdas cabos ${downstreamCables220LossesKW} kW). I_prim = ${trafoPrimaryCurrentA} A. Critério NBR 5410 / NBR 17019: Adotado Disjuntor ${trafoPrimaryBreakerA}A Caixa Moldada Curva D (Folga térmica contínua: +${trafoMarginA} A / +${trafoMarginPct}%). O inrush magnético do trafo Dyn1 (10x-12x In: ${Number(trafoPrimaryBreakerA) * 10}A a ${Number(trafoPrimaryBreakerA) * 12}A) é suportado no limiar magnético da Curva D, eliminando a necessidade de disjuntor de 300A e garantindo coordenação seletiva precisa.`
    : undefined;

  const panel220V: Panel220VTopologyState = {
    voltageV: isGrid380V ? 380 : 220,
    panelName: isGrid380V ? 'Painel Geral de Proteção 380V (QGBT)' : 'Painel de Proteção e Medição 220V',
    mainBreakerA: panelMainBreakerA,
    mainBreakerPoles: 3,
    mainBreakerCurve: isTransformerNeeded ? 'D' : 'C',
    busbarRatingA: panelMainBreakerA,
    requiresBusbar: true,
    totalAuxKW: Number(totalAuxKW.toFixed(2)),
    totalLoadWithClientKW: totalPanel220VActiveKW,
    totalDesignCurrentA: panelMainCurrentA,
    auxiliaryLoads,
    customCircuits: customCircuits220V,
    transformerProtectionBreakerA: trafoPrimaryBreakerA,
    transformerProtectionCurve: 'D',
    calculationBreakdown: {
      totalLoadKW: totalPanel220VActiveKW,
      totalCurrentA: panelMainCurrentA,
      chargerLoadsKW: totalChargersNominalKW,
      clientLoadKW: effectiveClientBaseLoadKW,
      auxLoadsKW: Number(totalAuxKW.toFixed(2)),
      lossesKW: Number((trafoLossesKW + section2LossKW + totalFeederLossesAllKW + totalChargersLossesKW).toFixed(2)),
      formulaMainBreaker: formula220VMain,
      formulaTrafoBreaker,
      formulaClientBreaker: auxiliaryLoads.clientBaseBreaker?.formulaSizing
    },
    individualChargerBreakers: isGrid380V ? individualChargerBreakers : undefined
  };

  // 9. Painel 380V (Secundário)
  const isPanel380VActive = isTransformerNeeded;
  const active380Chargers = enrichedChargers.filter(c => c.voltageV >= 380 && c.isSelected);
  const chargersCount380V = active380Chargers.length;
  const isSingleChargerUnified = chargersCount380V === 1 && activeCustomCircuits380V.length === 0;

  const panel380VMainBreakerRating = (trafoSecondaryCurrentA + customCircuits380VA) * 1.15;
  const panel380VCalculatedMainBreakerA = (trafoSecondaryCurrentA + customCircuits380VA) > 0
    ? (STANDARD_BREAKERS.find(b => b >= panel380VMainBreakerRating) || 40)
    : 40;

  const finalPanel380VMainBreakerA = isSingleChargerUnified
    ? (individualChargerBreakers.find(b => b.chargerId === active380Chargers[0]?.id)?.breakerA || individualChargerBreakers[0]?.breakerA || 40)
    : panel380VCalculatedMainBreakerA;

  const formula380VMain = isSingleChargerUnified
    ? `Disjuntor Geral 380V Unificado: Configuração com 1 único carregador (${active380Chargers[0]?.name}). O disjuntor geral é o próprio disjuntor de proteção do carregador (${finalPanel380VMainBreakerA}A Curva C) dispensando barramento secundário (Regra de Ouro NBR 17019).`
    : `Disjuntor Geral 380V: Soma das potências dos carregadores (${chargers380VInputKW.toFixed(2)} kW com perdas internas) + perdas nos cabos ramais (${totalFeederLosses380VKW.toFixed(2)} kW) = ${secondaryTotalActiveKW.toFixed(2)} kW. Corrente Secundária Ib = ${trafoSecondaryCurrentA} A. Com margem inrush 1.15x: In ≥ ${(trafoSecondaryCurrentA * 1.15).toFixed(1)} A ➔ Disjuntor Geral ${finalPanel380VMainBreakerA}A Tripolar.`;

  const panel380V: Panel380VTopologyState = {
    active: isPanel380VActive,
    mainBreakerA: finalPanel380VMainBreakerA,
    mainBreakerPoles: 3,
    mainBreakerCurve: 'C',
    requiresBusbar: !isSingleChargerUnified && chargersCount380V > 0,
    busbarRatingA: (!isSingleChargerUnified && chargersCount380V > 0) ? finalPanel380VMainBreakerA : 0,
    totalLoadWithLossesKW: secondaryTotalActiveKW,
    totalSecondaryCurrentA: trafoSecondaryCurrentA,
    dps380V: {
      enabled: isPanel380VActive,
      classType: 'Classe II',
      rating: 'Uc=385V, In=20kA, Imax=40kA',
      quantity: 4
    },
    customCircuits: customCircuits380V,
    calculationBreakdown: {
      totalChargersNominalKW: active380Chargers.reduce((s, c) => s + c.powerKW, 0),
      totalInternalLossesKW: Number((chargers380VInputKW - active380Chargers.reduce((s, c) => s + c.powerKW, 0)).toFixed(2)),
      totalFeedersLossesKW: totalFeederLosses380VKW,
      totalCustomCircuitsKW: customCircuits380VKW,
      totalActiveKW: secondaryTotalActiveKW,
      totalCurrentA: trafoSecondaryCurrentA,
      isSingleChargerUnified,
      formulaMainBreaker: formula380VMain
    },
    individualBreakers: individualChargerBreakers.filter(b => chargers.find(c => c.id === b.chargerId)?.voltageV === 380)
  };

  // Identificação das especificações normatizadas do padrão selecionado
  const cemigList: UtilityCategorySpec[] = Object.values(CEMIG_CATEGORIES);
  const activeStd = cemigList.find((c: UtilityCategorySpec) => c.categoryId === currentStandardCategory) || cemigList[0];
  const standardMinGaugeMM2 = activeStd.cableGaugePhaseMM2 || 2.5;
  const standardConductorsPerPhase = (activeStd as any).caboFaseVias || 1;

  // 10. Trecho 1: Padrão Concessionária -> Painel Geral (220V ou 380V)
  const section1 = sizeCableAndConduitSection({
    sectionId: 'trecho_1',
    name: `Trecho 1: Padrão Concessionária ➔ ${panel220V.panelName}`,
    fromNode: `Padrão CEMIG (${activeStd.categoryId} - ${currentStandardBreakerA || activeStd.breakerCurrentA}A)`,
    toNode: panel220V.panelName,
    distanceNominalM: section1DistanceM,
    marginPercent: section1MarginPercent,
    designCurrentA: panelMainCurrentA > 0 ? panelMainCurrentA : 10,
    phases: 3,
    voltageV: gridSupplyVoltage,
    conductorMaterial: section1ConductorMaterial,
    installationMethod: section1InstallationMethod,
    maxAllowedVoltageDropPercent: 2.5,
    includeNeutral: true,
    minGaugeMM2: section1ConductorMaterial === 'aluminum' ? Math.max(16, standardMinGaugeMM2) : standardMinGaugeMM2,
    minConductorsPerPhase: standardConductorsPerPhase,
    standardOriginNote: `Bitola alinhada à saída do padrão CEMIG Categoria ${activeStd.categoryId} (${standardConductorsPerPhase}x ${standardMinGaugeMM2}mm² por fase) • Condutor ${section1ConductorMaterial === 'aluminum' ? 'Alumínio (Al)' : 'Cobre (Cu)'}`,
    powerKW: totalPanel220VActiveKW
  });

  // 11. Alerta de Capacidade do Padrão de Entrada
  const activeBreakerA = currentStandardBreakerA || activeStd.breakerCurrentA;
  const isCustomBreaker = Boolean(currentStandardBreakerA && currentStandardBreakerA !== activeStd.breakerCurrentA);
  const calculatedBreakerLimitKW = Number(((Math.sqrt(3) * gridSupplyVoltage * activeBreakerA) / 1000).toFixed(1));
  const activeLimitKW = isCustomBreaker ? calculatedBreakerLimitKW : activeStd.maxLimitKW;

  // Se houver limitação de potência aceita/aplicada por DLM aos carregadores, recalculamos a demanda efetiva do hub
  let effectiveHubAggregatedKW = hubAggregatedLoadKW;
  if (hasSmartChargingDLM && maxChargerCapKW !== undefined && maxChargerCapKW > 0 && active380Chargers.length > 0) {
    const dlmChargersPowerKW = maxChargerCapKW * active380Chargers.length;
    const dlmHubDirectLoadKW = isTransformerNeeded
      ? Number((dlmChargersPowerKW + trafoLossesKW + section2LossKW).toFixed(2))
      : Number((dlmChargersPowerKW + totalFeederLossesAllKW).toFixed(2));
    effectiveHubAggregatedKW = Number((dlmHubDirectLoadKW + totalAuxKW).toFixed(2));
  }

  const totalRequiredLoadKW = Number((effectiveClientBaseLoadKW + effectiveHubAggregatedKW).toFixed(2));
  
  // Condição de sobrecarga física
  let isOverloaded = totalRequiredLoadKW > activeLimitKW;
  
  const isProtectedByDLM = Boolean(hasSmartChargingDLM && (!isOverloaded || (maxChargerCapKW !== undefined && maxChargerCapKW > 0)));
  if (isProtectedByDLM && totalRequiredLoadKW <= activeLimitKW) {
    isOverloaded = false;
  }

  // Encontrar padrão recomendado se houver sobrecarga
  const recommendedCategorySpec = cemigList.find((c: UtilityCategorySpec) => c.maxLimitKW >= totalRequiredLoadKW) || cemigList[cemigList.length - 1];

  let standardAlertMessage = '';
  if (isOverloaded) {
    standardAlertMessage = `ATENÇÃO: A demanda total (${totalRequiredLoadKW} kW: cliente ${effectiveClientBaseLoadKW} kW + hub ${effectiveHubAggregatedKW} kW) supera o limite do padrão ${activeStd.categoryId} (${activeLimitKW} kW / ${activeBreakerA}A). Recomendado upgrade para Categoria ${recommendedCategorySpec.categoryId} (${recommendedCategorySpec.breakerCurrentA}A) ou ativação de Gestão Dinâmica DLM.`;
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
    clientBaseLoadKW: effectiveClientBaseLoadKW,
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

  if (isPanel380VActive) {
    totalBOM.push({
      id: 'bom-painel-380v',
      category: 'quadro',
      description: panel380V.requiresBusbar
        ? `Painel de Distribuição 380V com Barramento de Cobre ${panel380V.busbarRatingA}A e ${chargersCount380V} Disjuntores`
        : `Caixa de Proteção 380V com Disjuntor Unificado ${panel380V.mainBreakerA}A (Zero Barramento)`,
      quantity: 1,
      unit: 'pç',
      spec: panel380V.requiresBusbar ? 'Barramento proporcional + DPS 385V + DRs Tipo B' : 'Disjuntor único sem barramento',
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
