// NBR 5410 / NBR 17019 - Sizing Engine for EV Charging
// Cordeiro Energia - Senior Electric Engineer Expert Logic

import { TABELA_COBRE_PVC } from "../engenharia/eletricaEngine";

export interface SizingInput {
  powerkW: number;
  voltage: number; // 220 or 380
  phases: 1 | 3;
  distance: number; // meters (secondary or total)
  method: 'B1' | 'B2' | 'C' | 'D'; // NBR 5410 Reference Methods
  cosPhi?: number; // Power factor (typically 0.95 - 1.0)
  
  // Transformer context
  hasTransformer?: boolean;
  primaryVoltage?: number; // default 220
  primaryDistance?: number;
  groundingType?: string;
  chargerDistance?: number;

  // Demand Control and Existing Standard
  demandControlEnabled?: boolean;
  demandControlLimit?: number; // capacity limit of entrance in Amperes
  existingLoadKW?: number;
  simultaneityFactor?: number;
  existingEntrancePhases?: number;
  existingEntranceBreaker?: number;
  existingEntranceCable?: number;
}

export interface SegmentResult {
  current: number;
  cableGauge: number;
  breaker: number;
  voltageDrop: number;
}

export interface BOMItem {
  code: string;
  description: string;
  type: "material" | "service";
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  
  // Fire Safety & Standards
  fireExtinguisher: string;
  emergencyButton: string;
  warningSigns: string[];
  applicableStandards: string[];
  
  // Secondary segment if transformer used
  primary?: SegmentResult;

  // CAPEX & BOM
  bom?: BOMItem[];
  totalCost?: number;
  groundCableGauge?: number;
  dpsQuantity?: number;

  // Demand Control info
  isCurrentLimited?: boolean;
  originalCurrent?: number;
  originalPowerkW?: number;
  limitedCurrent?: number;
  limitedPowerkW?: number;
}

// Corrigido para as capacidades reais da NBR 5410 Tabela 36 (Cobre, PVC, 70°C)
const cableAmpacity: Record<string, Record<number, number>> = {
  // B1: Condutores em eletroduto embutido em alvenaria
  'B1-2': { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232, 120: 268, 150: 308, 185: 352, 240: 415 },
  'B1-3': { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134, 70: 171, 95: 207, 120: 239, 150: 272, 185: 311, 240: 366 },
  // C: Cabos fixados diretamente em parede ou eletrocalha
  'C-2': { 1.5: 22, 2.5: 30, 4: 40, 6: 51, 10: 71, 16: 96, 25: 127, 35: 157, 50: 190, 70: 242, 95: 293, 120: 339, 150: 389, 185: 444, 240: 522 },
  'C-3': { 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213, 95: 258, 120: 299, 150: 344, 185: 392, 240: 461 },
};

const gauges = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 160, 200, 225, 250, 300, 350, 400];

function calculateSegment(
  powerKW: number, 
  voltage: number, 
  phases: number, 
  distance: number, 
  method: string,
  cosPhi: number
): SegmentResult {
  // 1. Clamp da corrente ativa base para correntes nominais comerciais de carregadores EV
  let activeCurrent = phases === 1 
    ? (powerKW * 1000) / voltage
    : (powerKW * 1000) / (Math.sqrt(3) * voltage);

  if (Math.abs(powerKW - 7.4) < 0.2 && phases === 1 && Math.abs(voltage - 220) < 10) {
    activeCurrent = 32.0;
  } else if (Math.abs(powerKW - 11.0) < 0.2 && phases === 3 && Math.abs(voltage - 380) < 10) {
    activeCurrent = 16.0;
  } else if (Math.abs(powerKW - 22.0) < 0.2 && phases === 3 && Math.abs(voltage - 380) < 10) {
    activeCurrent = 32.0;
  }

  // Corrente final de projeto (Ib) considerando o fator de potência real inserido
  const current = cosPhi === 1.0 ? activeCurrent : activeCurrent / cosPhi;

  // 2. Seleção coordenada de Cabo (Iz) e Disjuntor (In) conforme NBR 5410
  // Ib <= In <= Iz e In >= 1.25 * Ib para uso contínuo
  const lookupKey = `${method}-${phases === 1 ? '2' : '3'}`;
  const table = cableAmpacity[lookupKey] || cableAmpacity['B1-2'];

  let selectedGauge = gauges[gauges.length - 1]; // Fallback máximo
  let selectedBreaker = standardBreakers[standardBreakers.length - 1]; // Fallback máximo
  
  for (const g of gauges) {
    if (g < 2.5) continue; // Mínimo de 2.5 mm² para força
    const Iz = table[g];
    const possibleBreakers = standardBreakers.filter(b => b >= current * 1.25 && b <= Iz);
    if (possibleBreakers.length > 0) {
      selectedGauge = g;
      selectedBreaker = possibleBreakers[0];
      break;
    }
  }

  // 3. Verificação de Queda de Tensão (Máximo 4% conforme NBR 5410)
  // Utiliza as tabelas de impedâncias (Rca e X) de eletricaEngine para precisão de temperatura (70°C)
  const distKm = distance / 1000;
  const getCableProps = (gauge: number) => {
    return TABELA_COBRE_PVC.find(c => c.secao === gauge) || { r_km: 0.085, x_km: 0.078 };
  };

  const getVDropPercent = (gauge: number): number => {
    const props = getCableProps(gauge);
    const senPhi = Math.sin(Math.acos(Math.min(1.0, cosPhi)));
    let dropV = 0;
    if (phases === 3) {
      dropV = Math.sqrt(3) * current * distKm * (props.r_km * cosPhi + props.x_km * senPhi);
    } else {
      dropV = 2 * current * distKm * (props.r_km * cosPhi + props.x_km * senPhi);
    }
    return (dropV / voltage) * 100;
  };

  let vDropPercent = getVDropPercent(selectedGauge);
  
  while (vDropPercent > 4 && selectedGauge < 95) {
    const nextIdx = gauges.indexOf(selectedGauge) + 1;
    if (nextIdx < gauges.length) {
      selectedGauge = gauges[nextIdx];
      vDropPercent = getVDropPercent(selectedGauge);
      
      // Recalcular disjuntor para garantir In <= Iz do novo cabo
      const Iz = table[selectedGauge];
      const possibleBreakers = standardBreakers.filter(b => b >= current * 1.25 && b <= Iz);
      if (possibleBreakers.length > 0) {
        selectedBreaker = possibleBreakers[0];
      }
    } else break;
  }

  return {
    current: Number(current.toFixed(2)),
    cableGauge: selectedGauge,
    breaker: selectedBreaker,
    voltageDrop: Number(vDropPercent.toFixed(2))
  };
}

export function calculateSizing(input: SizingInput): SizingResult {
  const { 
    powerkW, 
    voltage, 
    phases, 
    distance, 
    method, 
    hasTransformer, 
    primaryVoltage, 
    primaryDistance, 
    groundingType,
    chargerDistance,
    demandControlEnabled,
    demandControlLimit,
    existingLoadKW,
    simultaneityFactor
  } = input;
  
  // Fator de Potência parametrizado, se não fornecido usa 1.0 (padrão comercial VE no Brasil)
  const safeCosPhi = input.cosPhi !== undefined ? Number(input.cosPhi) : 1.0;

  // LÓGICA DE CONTROLE DE DEMANDA
  let isCurrentLimited = false;
  let originalCurrent = phases === 1 
    ? (powerkW * 1000) / voltage
    : (powerkW * 1000) / (Math.sqrt(3) * voltage);
  
  // Ajuste FP para corrente original
  originalCurrent = safeCosPhi === 1.0 ? originalCurrent : originalCurrent / safeCosPhi;
  
  let targetPowerKW = powerkW;
  let limitedCurrent = originalCurrent;
  let limitedPowerkW = powerkW;

  if (demandControlEnabled && demandControlLimit) {
    const buildingDemandKW = (existingLoadKW || 0) * (simultaneityFactor !== undefined ? simultaneityFactor : 0.8);
    const buildingCurrent = phases === 3
      ? (buildingDemandKW * 1000) / (Math.sqrt(3) * voltage)
      : (buildingDemandKW * 1000) / voltage;

    const availableCurrent = demandControlLimit - buildingCurrent;
    if (availableCurrent < originalCurrent) {
      isCurrentLimited = true;
      limitedCurrent = Math.max(6.0, availableCurrent); // Mínimo de 6A para manter a comunicação do EVSE ativa
      
      // Calcular nova potência limitada do carregador
      limitedPowerkW = phases === 3
        ? (limitedCurrent * Math.sqrt(3) * voltage * safeCosPhi) / 1000
        : (limitedCurrent * voltage * safeCosPhi) / 1000;
      
      targetPowerKW = limitedPowerkW;
    }
  }

  // Circuito Final (Secundário) - Do painel local ao carregador (usa targetPowerKW com limites aplicados)
  const safeSecondaryDistance = hasTransformer ? (chargerDistance || 10) : distance;
  const secondary = calculateSegment(targetPowerKW, voltage, phases, safeSecondaryDistance, method, safeCosPhi);
  
  let primary: SegmentResult | undefined = undefined;
  if (hasTransformer) {
    // Rendimento do transformador de ~95%
    const pVoltage = primaryVoltage || 220;
    const pDistance = primaryDistance || 10;
    const pPower = powerkW / 0.95; 
    // Transformadores comerciais de alimentação costumam ser trifásicos
    primary = calculateSegment(pPower, pVoltage, 3, pDistance, method, safeCosPhi);
  }

  // IDR Selection - NBR 17019
  let idrType = "";
  if (powerkW >= 20) {
    idrType = "IDR Tetrapolar 40A/30mA Tipo B (Obrigatório para Corrente Contínua)";
  } else if (phases === 3) {
    idrType = "IDR Tetrapolar 40A/30mA Tipo A + Proteção 6mA DC";
  } else {
    idrType = "IDR Bipolar 40A/30mA Tipo A";
  }

  // DPS Selection
  const dpsQuantity = phases === 3 ? 4 : 2; // TT: 3F+N ou F+N
  const dpsType = `${dpsQuantity}x DPS Classe II, 275V, In 20kA, Imax 45kA`;

  // Eletroduto
  const selectedGauge = secondary.cableGauge;
  const conduitSize = selectedGauge <= 4 ? "25mm (3/4\")" : selectedGauge <= 10 ? "32mm (1\")" : "40mm (1 1/4\")";

  // Aterramento
  const gType = groundingType || "TT";
  const groundingAnalysis = `${gType} - Resistência < 4Ω exigida pelo fabricante para eletrônica de potência. Malha dedicada recomendada.`;

  // Bombeiros (IT 41)
  const fireExtinguisher = "CO2 6kg ou PQS 6kg (Classe B/C) - Instalar a no máximo 15m de distância.";
  const emergencyButton = "Botão de Emergência (Cogumelo com trava) - Instalar a 5m do carregador (IT 41 CBMG).";
  const warningSigns = [
    "Placa: Risco de Choque Elétrico",
    "Placa: Localização de Botão de Emergência",
    "Placa: Instruções de Uso e Segurança",
    "Pintura de solo conforme padrão NBR 17019"
  ];
  
  const applicableStandards = [
    "NBR 5410: Instalações elétricas de baixa tensão",
    "NBR 17019: Instalações elétricas de baixa tensão — Veículos elétricos",
    "IT 41 (Corpo de Bombeiros): Segurança contra incêndio em estacionamentos",
    "NBR 14039: Instalações elétricas de média tensão (se aplicável)"
  ];

  // Cabo de Aterramento (PE) conforme NBR 5410 Tabela 54:
  // Seção da fase <= 16 => PE = Seção da fase. 
  // Seção da fase > 16 e <= 35 => PE = 16.
  // Seção da fase > 35 => PE = Seção da fase / 2.
  const groundCableGauge = selectedGauge <= 16 
    ? selectedGauge 
    : (selectedGauge <= 35 ? 16 : Math.ceil(selectedGauge / 2));

  // --- CALCULO FINANCEIRO DE MATERIAIS (BOM & CAPEX PROTÓTIPO) ---
  const bom: BOMItem[] = [];

  // 1. Quadro de Distribuição
  bom.push({
    code: "QDC-IP65",
    description: "Quadro de Distribuição de Sobrepor IP65 (Mínimo 8 módulos DIN)",
    type: "material",
    unit: "un",
    quantity: 1,
    unitPrice: 95.00,
    totalPrice: 95.00
  });

  // 2. Disjuntor Termomagnético
  const breakerPrice = phases === 3 ? 65.00 : 35.00;
  bom.push({
    code: `DJ-${secondary.breaker}A-${phases}P`,
    description: `Disjuntor Termomagnético ${secondary.breaker}A Curva C (${phases} Polos)`,
    type: "material",
    unit: "un",
    quantity: 1,
    unitPrice: breakerPrice,
    totalPrice: breakerPrice
  });

  // 3. IDR
  const idrPrice = (phases === 3 || powerkW >= 20) ? 290.00 : 190.00;
  bom.push({
    code: (phases === 3 || powerkW >= 20) ? "IDR-4P-40A-30MA" : "IDR-2P-40A-30MA",
    description: idrType,
    type: "material",
    unit: "un",
    quantity: 1,
    unitPrice: idrPrice,
    totalPrice: idrPrice
  });

  // 4. DPS
  const dpsPrice = 60.00;
  bom.push({
    code: "DPS-275V-45KA",
    description: "Dispositivo de Proteção contra Surtos (DPS) Classe II 275V 45kA",
    type: "material",
    unit: "un",
    quantity: dpsQuantity,
    unitPrice: dpsPrice,
    totalPrice: dpsPrice * dpsQuantity
  });

  // 5. Condutores Ativos (Fase/Neutro)
  const activeConductors = phases === 3 ? 4 : 2; // Trifásico = 3F+N, Monofásico/Bifásico = 2 condutores
  const getCablePrice = (gauge: number): number => {
    if (gauge <= 2.5) return 3.20;
    if (gauge <= 4) return 4.50;
    if (gauge <= 6) return 6.80;
    if (gauge <= 10) return 11.50;
    if (gauge <= 16) return 18.20;
    if (gauge <= 25) return 29.00;
    return 39.50;
  };
  const activeCablePrice = getCablePrice(selectedGauge);
  bom.push({
    code: `CB-COP-${selectedGauge}MM`,
    description: `Cabo de Cobre Flexível ${selectedGauge} mm² (Fases/Neutro)`,
    type: "material",
    unit: "m",
    quantity: Math.ceil(activeConductors * safeSecondaryDistance),
    unitPrice: activeCablePrice,
    totalPrice: Number((activeConductors * safeSecondaryDistance * activeCablePrice).toFixed(2))
  });

  // 6. Condutor de Aterramento (PE)
  const peCablePrice = getCablePrice(groundCableGauge);
  bom.push({
    code: `CB-COP-PE-${groundCableGauge}MM`,
    description: `Cabo de Cobre Flexível ${groundCableGauge} mm² (Aterramento - Verde)`,
    type: "material",
    unit: "m",
    quantity: Math.ceil(safeSecondaryDistance),
    unitPrice: peCablePrice,
    totalPrice: Number((safeSecondaryDistance * peCablePrice).toFixed(2))
  });

  // 7. Acessórios
  bom.push({
    code: "ACC-EL",
    description: "Kit de Acessórios (Barramento tipo pente, prensa-cabos e terminais tubular)",
    type: "material",
    unit: "kit",
    quantity: 1,
    unitPrice: 45.00,
    totalPrice: 45.00
  });

  // 8. Transformador (se aplicável)
  if (hasTransformer) {
    const trafoPower = Math.ceil(powerkW / 0.95);
    const trafoPrice = trafoPower <= 10 ? 1800.00 : trafoPower <= 20 ? 2900.00 : 4200.00;
    bom.push({
      code: `TRAFO-ISOL-${trafoPower}KVA`,
      description: `Transformador Isolador Trifásico ${trafoPower} kVA (Alimentação do Carregador)`,
      type: "material",
      unit: "un",
      quantity: 1,
      unitPrice: trafoPrice,
      totalPrice: trafoPrice
    });

    if (primary) {
      const pConductors = 3; // Lado primário do trafo costuma ser Delta 3 fios
      const pDistance = primaryDistance || 10;
      const pCablePrice = getCablePrice(primary.cableGauge);
      bom.push({
        code: `CB-COP-PRI-${primary.cableGauge}MM`,
        description: `Cabo de Cobre Flexível ${primary.cableGauge} mm² (Alimentação Primária do Trafo)`,
        type: "material",
        unit: "m",
        quantity: Math.ceil(pConductors * pDistance),
        unitPrice: pCablePrice,
        totalPrice: Number((pConductors * pDistance * pCablePrice).toFixed(2))
      });

      bom.push({
        code: `DJ-PRI-${primary.breaker}A-3P`,
        description: `Disjuntor Termomagnético Geral ${primary.breaker}A 3P Curva C (Proteção Primária)`,
        type: "material",
        unit: "un",
        quantity: 1,
        unitPrice: 65.00,
        totalPrice: 65.00
      });
    }
  }

  const totalCost = Number(bom.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));

  return {
    ...secondary,
    idrType,
    drType: idrType,
    dpsType,
    conduitSize,
    groundingAnalysis,
    fireExtinguisher,
    emergencyButton,
    warningSigns,
    applicableStandards,
    primary,
    
    // Novas informações de CAPEX e BOM
    bom,
    totalCost,
    groundCableGauge,
    dpsQuantity,

    // Demand Control info
    isCurrentLimited,
    originalCurrent: Number(originalCurrent.toFixed(2)),
    originalPowerkW: powerkW,
    limitedCurrent: Number(limitedCurrent.toFixed(2)),
    limitedPowerkW: Number(limitedPowerkW.toFixed(2))
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
