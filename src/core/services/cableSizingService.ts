/**
 * CoenergyGO / Cordeiro Energia — Core Electrical Domain Service
 * Regras puras de dimensionamento elétrico NBR 5410 e NBR 17019.
 * Todas as funções são puras, com cláusulas de guarda e menos de 20 linhas (Clean Code).
 */

const COPPER_RESISTIVITY_70C = 0.0213; // ohm * mm² / m (NBR 5410)

export interface CableCalculationInput {
  powerKW: number;
  voltageV: number;
  phases: 1 | 2 | 3;
  distanceMeters: number;
  cosPhi?: number;
  ambientTemperatureC?: number;
  groupedCircuits?: number;
  maxVoltageDropPercent?: number;
}

export interface CableCalculationOutput {
  designCurrentA: number;
  minimumBreakerA: number;
  recommendedBreakerA: number;
  recommendedGaugeMM2: number;
  voltageDropPercent: number;
  isCompliant: boolean;
}

const STANDARD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 90, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400];

// Capacidade de condução de corrente (A) para condutores de cobre PVC 70°C Método B1 NBR 5410
const AMPACITY_TABLE_B1: Record<number, { twoCond: number; threeCond: number }> = {
  2.5: { twoCond: 24, threeCond: 21 },
  4: { twoCond: 32, threeCond: 28 },
  6: { twoCond: 41, threeCond: 36 },
  10: { twoCond: 57, threeCond: 50 },
  16: { twoCond: 76, threeCond: 68 },
  25: { twoCond: 101, threeCond: 89 },
  35: { twoCond: 125, threeCond: 110 },
  50: { twoCond: 151, threeCond: 134 },
  70: { twoCond: 192, threeCond: 171 },
  95: { twoCond: 232, threeCond: 207 },
  120: { twoCond: 269, threeCond: 239 },
  150: { twoCond: 300, threeCond: 265 },
  185: { twoCond: 341, threeCond: 305 },
  240: { twoCond: 400, threeCond: 360 }
};

const STANDARD_GAUGES = [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

/**
 * 1. Calcula a corrente de projeto (Ib) com fator de potência
 */
export function calculateDesignCurrentA(powerKW: number, voltageV: number, phases: 1 | 2 | 3, cosPhi = 0.98): number {
  if (powerKW <= 0 || voltageV <= 0) return 0;
  const divisor = phases === 3 ? Math.sqrt(3) * voltageV * cosPhi : voltageV * cosPhi;
  return Number(((powerKW * 1000) / divisor).toFixed(1));
}

/**
 * 2. Seleciona o disjuntor padrão termomagnético (In >= 1.15 * Ib para regime contínuo VE)
 */
export function selectRecommendedBreakerA(designCurrentA: number, safetyMarginFactor = 1.15): number {
  if (designCurrentA <= 0) return 16;
  const minimumRating = designCurrentA * safetyMarginFactor;
  return STANDARD_BREAKERS.find(b => b >= minimumRating) || 400;
}

/**
 * 3. Fator de correção de temperatura (NBR 5410 Tabela 40)
 */
export function getTemperatureCorrectionFactor(tempC = 30): number {
  if (tempC <= 30) return 1.00;
  if (tempC <= 35) return 0.94;
  if (tempC <= 40) return 0.87;
  return 0.79;
}

/**
 * 4. Fator de correção de agrupamento (NBR 5410 Tabela 42)
 */
export function getGroupingCorrectionFactor(circuits = 1): number {
  if (circuits <= 1) return 1.00;
  if (circuits === 2) return 0.80;
  if (circuits === 3) return 0.70;
  return 0.65;
}

/**
 * 5. Queda de tensão percentual (Delta V %)
 */
export function calculateVoltageDropPercent(
  gaugeMM2: number,
  currentA: number,
  distanceMeters: number,
  voltageV: number,
  phases: 1 | 2 | 3,
  cosPhi = 0.98
): number {
  if (gaugeMM2 <= 0 || voltageV <= 0 || distanceMeters <= 0 || currentA <= 0) return 0;
  const factor = phases === 3 ? Math.sqrt(3) : 2.0;
  const deltaV = (factor * COPPER_RESISTIVITY_70C * distanceMeters * currentA * cosPhi) / gaugeMM2;
  return Number(((deltaV / voltageV) * 100).toFixed(2));
}

/**
 * 6. Dimensionamento completo de um trecho (Ampacidade NBR 5410 + Queda de Tensão)
 */
export function sizeCableSegment(input: CableCalculationInput): CableCalculationOutput {
  const cosPhi = input.cosPhi || 0.98;
  const maxDrop = input.maxVoltageDropPercent || 4.0;
  const currentA = calculateDesignCurrentA(input.powerKW, input.voltageV, input.phases, cosPhi);
  const breakerA = selectRecommendedBreakerA(currentA);

  const fct = getTemperatureCorrectionFactor(input.ambientTemperatureC || 30);
  const fca = getGroupingCorrectionFactor(input.groupedCircuits || 1);
  const requiredAmpacityA = breakerA / (fct * fca);

  let selectedGauge = 2.5;
  let voltageDrop = 0;

  for (const gauge of STANDARD_GAUGES) {
    const tableEntry = AMPACITY_TABLE_B1[gauge];
    const capacityA = input.phases === 3 ? tableEntry.threeCond : tableEntry.twoCond;

    // Critério 1: Capacidade de condução de corrente (Iz >= In / (FCT * FCA))
    if (capacityA < requiredAmpacityA) continue;

    // Critério 2: Limite de queda de tensão (Delta V <= Delta V max)
    voltageDrop = calculateVoltageDropPercent(gauge, currentA, input.distanceMeters, input.voltageV, input.phases, cosPhi);
    if (voltageDrop <= maxDrop) {
      selectedGauge = gauge;
      break;
    }
  }

  return {
    designCurrentA: currentA,
    minimumBreakerA: Number((currentA * 1.15).toFixed(1)),
    recommendedBreakerA: breakerA,
    recommendedGaugeMM2: selectedGauge,
    voltageDropPercent: voltageDrop,
    isCompliant: voltageDrop <= maxDrop
  };
}
