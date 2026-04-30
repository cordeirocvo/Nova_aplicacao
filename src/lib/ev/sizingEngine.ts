// NBR 5410 / NBR 17019 - Sizing Engine for EV Charging
// Cordeiro Energia - Senior Electric Engineer Expert Logic

export interface SizingInput {
  powerkW: number;
  voltage: number; // 220 or 380
  phases: 1 | 3;
  distance: number; // meters (secondary or total)
  method: 'B1' | 'B2' | 'C' | 'D'; // NBR 5410 Reference Methods
  
  // Transformer context
  hasTransformer?: boolean;
  primaryVoltage?: number; // default 220
  primaryDistance?: number;
  groundingType?: string;
}

export interface SegmentResult {
  current: number;
  cableGauge: number;
  breaker: number;
  voltageDrop: number;
}

export interface SizingResult {
  current: number;
  cableGauge: number;
  breaker: number;
  voltageDrop: number;
  drType: string;
  idrType: string; // Detailed IDR
  dpsType: string;
  conduitSize: string;
  groundingAnalysis: string;
  
  // Secondary segment if transformer used
  primary?: SegmentResult;
}

const cableAmpacity: Record<string, Record<number, number>> = {
  'B1-2': { 1.5: 14.5, 2.5: 19.5, 4: 26, 6: 34, 10: 46, 16: 61, 25: 80, 35: 99, 50: 119, 70: 151, 95: 182, 120: 210, 150: 240, 185: 273, 240: 321 },
  'B1-3': { 1.5: 13.5, 2.5: 18, 4: 24, 6: 31, 10: 42, 16: 56, 25: 73, 35: 89, 50: 108, 70: 136, 95: 164, 120: 188, 150: 216, 185: 245, 240: 286 },
  'C-2': { 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213, 95: 258, 120: 299, 150: 344, 185: 392, 240: 461 },
  'C-3': { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 96, 35: 119, 50: 144, 70: 184, 95: 223, 120: 259, 150: 299, 185: 341, 240: 403 },
};

const gauges = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 160, 200, 225, 250, 300, 350, 400];

function calculateSegment(powerKW: number, voltage: number, phases: number, distance: number, method: string): SegmentResult {
  const cosPhi = 0.95;
  const sigma = 56;
  const K = phases === 1 ? 2 : Math.sqrt(3);

  // 1. Current (Ib)
  const current = phases === 1 
    ? (powerKW * 1000) / (voltage * cosPhi)
    : (powerKW * 1000) / (Math.sqrt(3) * voltage * cosPhi);

  // 2. Ampacity (Iz)
  const lookupKey = `${method}-${phases === 1 ? '2' : '3'}`;
  const table = cableAmpacity[lookupKey] || cableAmpacity['B1-2'];
  
  let selectedGauge = gauges[gauges.length - 1]; // Default to max if overflow
  for (const g of gauges) {
    if (g < 2.5) continue;
    if (table[g] >= current * 1.25) {
      selectedGauge = g;
      break;
    }
  }

  // 3. Voltage Drop
  let vDrop = (K * distance * current * cosPhi) / (sigma * selectedGauge);
  let vDropPercent = (vDrop / voltage) * 100;
  
  while (vDropPercent > 4 && selectedGauge < 95) {
    const nextIdx = gauges.indexOf(selectedGauge) + 1;
    if (nextIdx < gauges.length) {
      selectedGauge = gauges[nextIdx];
      vDrop = (K * distance * current * cosPhi) / (sigma * selectedGauge);
      vDropPercent = (vDrop / voltage) * 100;
    } else break;
  }

  // 4. Breaker
  let selectedBreaker = standardBreakers[standardBreakers.length - 1]; // Default to max
  for (const b of standardBreakers) {
    if (b >= current * 1.15 && b <= table[selectedGauge]) {
      selectedBreaker = b;
      break;
    }
  }

  return {
    current: Number(current.toFixed(2)),
    cableGauge: selectedGauge,
    breaker: selectedBreaker,
    voltageDrop: Number(vDropPercent.toFixed(2))
  };
}

export function calculateSizing(input: SizingInput): SizingResult {
  const { powerkW, voltage, phases, distance, method, hasTransformer, primaryVoltage, primaryDistance, groundingType } = input;
  
  // Secondary segment (Transformer to Charger or Panel to Charger)
  const secondary = calculateSegment(powerkW, voltage, phases, distance, method);
  
  let primary: SegmentResult | undefined = undefined;
  if (hasTransformer) {
    // Transformer efficiency ~95%
    const pVoltage = primaryVoltage || 220;
    const pDistance = primaryDistance || 10;
    const pPower = powerkW / 0.95; 
    primary = calculateSegment(pPower, pVoltage, 3, pDistance, method); // Transformers usually fed 3-phase
  }

  // IDR Selection
  let idrType = "";
  if (powerkW > 22) {
    idrType = "IDR Tetrapolar Tipo B (Sensível a CC) 30mA";
  } else if (phases === 3) {
    idrType = "IDR Tetrapolar Tipo A 30mA + Detecção 6mA DC";
  } else {
    idrType = "IDR Bipolar Tipo A 30mA";
  }

  // DPS Selection
  const dpsType = "DPS Classe II, Uc 275V, In 20kA, Imax 40kA (3F+N)";

  // Conduit
  const selectedGauge = secondary.cableGauge;
  const conduitSize = selectedGauge <= 4 ? "25mm (3/4\")" : selectedGauge <= 10 ? "32mm (1\")" : "40mm (1 1/4\")";

  // Grounding
  const gType = groundingType || "TT";
  const groundingAnalysis = `${gType} - Executar malha com haste 2.4m, resistência < 10 ohms recomendada para eletrônica sensível.`;

  return {
    ...secondary,
    idrType,
    drType: idrType, // Backward compatibility
    dpsType,
    conduitSize,
    groundingAnalysis,
    primary
  };
}

export const cemigCategories = [
  { id: 'A', desc: 'Monofásico (até 8kW)', limit: 8, breaker: '40A/50A' },
  { id: 'B1', desc: 'Bifásico (até 12kW)', limit: 12, breaker: '50A' },
  { id: 'B2', desc: 'Bifásico (até 16kW)', limit: 16, breaker: '63A' },
  { id: 'C1', desc: 'Trifásico (até 24kVA)', limit: 24, breaker: '63A' },
  { id: 'C2', desc: 'Trifásico (até 30kVA)', limit: 30, breaker: '80A' },
  { id: 'C3', desc: 'Trifásico (até 38kVA)', limit: 38, breaker: '100A' },
  { id: 'C4', desc: 'Trifásico (até 47kVA)', limit: 47, breaker: '125A' },
];
