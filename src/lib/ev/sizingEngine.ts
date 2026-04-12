// NBR 5410 / NBR 17019 - Sizing Engine for EV Charging
// Cordeiro Energia - Senior Electric Engineer Expert Logic

export interface SizingInput {
  powerkW: number;
  voltage: number; // 220 or 380
  phases: 1 | 3;
  distance: number; // meters
  method: 'B1' | 'B2' | 'C' | 'D'; // NBR 5410 Reference Methods
}

export interface SizingResult {
  current: number;
  cableGauge: number;
  breaker: number;
  voltageDrop: number;
  drType: string;
  conduitSize: string;
}

// Table 36 NBR 5410 - Corrente Admissível (Cobre, PVC 70C, 2 condutores carregados para Monofásico, 3 para Trifásico)
// Simplificado para os métodos mais comuns. Valores em Amperes (A).
const cableAmpacity: Record<string, Record<number, number>> = {
  // B1: Eletroduto embutido em parede termicamente isolante
  'B1-2': { 1.5: 14.5, 2.5: 19.5, 4: 26, 6: 34, 10: 46, 16: 61, 25: 80, 35: 99, 50: 119, 70: 151, 95: 182 },
  'B1-3': { 1.5: 13.5, 2.5: 18, 4: 24, 6: 31, 10: 42, 16: 56, 25: 73, 35: 89, 50: 108, 70: 136, 95: 164 },
  // C: Cabos fixados diretamente em paredes (Melhor dissipação)
  'C-2': { 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213, 95: 258 },
  'C-3': { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 96, 35: 119, 50: 144, 70: 184, 95: 223 },
};

const gauges = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95];

export function calculateSizing(input: SizingInput): SizingResult {
  const { powerkW, voltage, phases, distance, method } = input;
  
  // 1. Calcular Corrente de Projeto (Ib)
  // EV Charging is a continuous load, NBR 17019 suggests Fd = 1.
  let current = 0;
  if (phases === 1) {
    current = (powerkW * 1000) / (voltage * 0.95); // Consuming cos phi around 0.95
  } else {
    current = (powerkW * 1000) / (Math.sqrt(3) * voltage * 0.95);
  }

  // 2. Critério da Capacidade de Condução (Iz)
  // Precisamos Iz >= Ib. E também coordenar com disjuntor.
  const lookupKey = `${method}-${phases === 1 ? '2' : '3'}`;
  const table = cableAmpacity[lookupKey] || cableAmpacity['B1-2'];
  
  let selectedGauge = 2.5; // Mínimo para circuitos de força NBR 5410
  for (const g of gauges) {
    if (g < 2.5) continue;
    if (table[g] >= current * 1.25) { // 1.25 safety factor for continuous load protection coordination
      selectedGauge = g;
      break;
    }
  }

  // 3. Critério da Queda de Tensão (dV)
  // dV = (K * L * I * cos phi) / (sigma * S)
  // K = 2 (Mono) ou sqrt(3) (Tri)
  // sigma (Cobre) = 56 m/(ohm*mm2)
  const K = phases === 1 ? 2 : Math.sqrt(3);
  const sigma = 56;
  const cosPhi = 0.95;
  
  let vDrop = (K * distance * current * cosPhi) / (sigma * selectedGauge);
  let vDropPercent = (vDrop / voltage) * 100;
  
  // Se > 4%, aumenta bitola
  while (vDropPercent > 4 && selectedGauge < 95) {
    const nextIdx = gauges.indexOf(selectedGauge) + 1;
    if (nextIdx < gauges.length) {
      selectedGauge = gauges[nextIdx];
      vDrop = (K * distance * current * cosPhi) / (sigma * selectedGauge);
      vDropPercent = (vDrop / voltage) * 100;
    } else {
      break;
    }
  }

  // 4. Seleção de Disjuntor (In)
  // Ib <= In <= Iz. 
  const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125];
  let selectedBreaker = 20;
  for (const b of standardBreakers) {
    if (b >= current * 1.15 && b <= table[selectedGauge]) {
      selectedBreaker = b;
      break;
    }
  }

  // 5. Outros Componentes
  const drType = current > 32 ? "6mA DC + 30mA Tipo A ou Tipo B" : "30mA Tipo A com Detecção 6mA DC";
  const conduitSize = selectedGauge <= 4 ? "25mm (3/4\")" : selectedGauge <= 10 ? "32mm (1\")" : "40mm (1 1/4\")";

  return {
    current: Number(current.toFixed(2)),
    cableGauge: selectedGauge,
    breaker: selectedBreaker,
    voltageDrop: Number(vDropPercent.toFixed(2)),
    drType,
    conduitSize
  };
}

// CEMIG ND-5.1 Categories
export const cemigCategories = [
  { id: 'A', desc: 'Monofásico (até 8kW)', limit: 8, breaker: '40A/50A' },
  { id: 'B1', desc: 'Bifásico (até 12kW)', limit: 12, breaker: '50A' },
  { id: 'B2', desc: 'Bifásico (até 16kW)', limit: 16, breaker: '63A' },
  { id: 'C1', desc: 'Trifásico (até 24kVA)', limit: 24, breaker: '63A' },
  { id: 'C2', desc: 'Trifásico (até 30kVA)', limit: 30, breaker: '80A' },
  { id: 'C3', desc: 'Trifásico (até 38kVA)', limit: 38, breaker: '100A' },
  { id: 'C4', desc: 'Trifásico (até 47kVA)', limit: 47, breaker: '125A' },
];
