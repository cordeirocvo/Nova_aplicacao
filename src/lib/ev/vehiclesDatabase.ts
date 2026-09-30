/**
 * Banco de Dados de Veículos Elétricos e Híbridos Plug-in no Brasil
 * CoenergyGO — Mobilidade Elétrica Inteligente (Cordeiro Energia)
 * 
 * Contém especificações reais de bateria, carregador de bordo AC, carga rápida DC,
 * autonomia homologada (PBEV / Inmetro) e cálculo de tempo e compatibilidade.
 */

export interface ElectricVehicle {
  id: string;
  brand: string;
  model: string;
  version: string;
  category: 'Hatch' | 'Sedan' | 'SUV' | 'Picape' | 'Van' | 'Esportivo';
  type: 'BEV' | 'PHEV'; // 100% Elétrico ou Híbrido Plug-in
  batteryGrossKWh: number;
  batteryUsableKWh: number;
  // Carregador de Bordo AC (Onboard Charger)
  onboardACKW: number; // Potência máxima aceita em AC
  onboardPhases: 1 | 2 | 3; // Fases aceitas no carregamento AC
  maxACCurrentA: number; // Corrente máxima AC por fase (ex: 32A para 7.4kW mono, 16A para 11kW tri)
  // Carga Rápida DC (DC Fast Charge)
  maxDCKW: number; // Potência máxima de recarga rápida DC
  dcConnector: 'CCS2' | 'GB/T' | 'CHAdeMO' | 'NACS';
  acConnector: 'Tipo 2' | 'Tipo 1' | 'GB/T';
  // Autonomia e Eficiência
  autonomyPBEVKm: number; // Autonomia oficial Inmetro PBEV
  autonomyWLTPKm?: number;
  avgConsumptionKWhPer100Km: number;
  // Metadados
  year: number;
  popularRank: number; // Classificação por volume de vendas no Brasil
}

export const BRAZIL_ELECTRIC_VEHICLES: ElectricVehicle[] = [
  // ─── BYD (Líder de Mercado no Brasil) ──────────────────────────────────
  {
    id: 'byd-dolphin-mini',
    brand: 'BYD',
    model: 'Dolphin Mini',
    version: '4 Lugares / 5 Lugares (38 kWh)',
    category: 'Hatch',
    type: 'BEV',
    batteryGrossKWh: 38.0,
    batteryUsableKWh: 38.0,
    onboardACKW: 6.6,
    onboardPhases: 1,
    maxACCurrentA: 30,
    maxDCKW: 40,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 280,
    autonomyWLTPKm: 380,
    avgConsumptionKWhPer100Km: 13.5,
    year: 2024,
    popularRank: 1,
  },
  {
    id: 'byd-dolphin-gs',
    brand: 'BYD',
    model: 'Dolphin',
    version: 'GS (44.9 kWh)',
    category: 'Hatch',
    type: 'BEV',
    batteryGrossKWh: 44.9,
    batteryUsableKWh: 44.9,
    onboardACKW: 6.6,
    onboardPhases: 1,
    maxACCurrentA: 30,
    maxDCKW: 60,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 291,
    autonomyWLTPKm: 340,
    avgConsumptionKWhPer100Km: 14.5,
    year: 2023,
    popularRank: 2,
  },
  {
    id: 'byd-dolphin-plus',
    brand: 'BYD',
    model: 'Dolphin',
    version: 'Plus (60.48 kWh)',
    category: 'Hatch',
    type: 'BEV',
    batteryGrossKWh: 60.48,
    batteryUsableKWh: 60.48,
    onboardACKW: 7.0,
    onboardPhases: 1,
    maxACCurrentA: 32,
    maxDCKW: 80,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 330,
    autonomyWLTPKm: 427,
    avgConsumptionKWhPer100Km: 15.2,
    year: 2023,
    popularRank: 4,
  },
  {
    id: 'byd-yuan-plus',
    brand: 'BYD',
    model: 'Yuan Plus',
    version: 'EV (60.48 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 60.48,
    batteryUsableKWh: 60.48,
    onboardACKW: 7.0,
    onboardPhases: 1,
    maxACCurrentA: 32,
    maxDCKW: 80,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 294,
    autonomyWLTPKm: 420,
    avgConsumptionKWhPer100Km: 16.5,
    year: 2023,
    popularRank: 6,
  },
  {
    id: 'byd-yuan-pro',
    brand: 'BYD',
    model: 'Yuan Pro',
    version: 'GL (45.1 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 45.1,
    batteryUsableKWh: 45.1,
    onboardACKW: 6.6,
    onboardPhases: 1,
    maxACCurrentA: 30,
    maxDCKW: 65,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 250,
    autonomyWLTPKm: 380,
    avgConsumptionKWhPer100Km: 15.0,
    year: 2024,
    popularRank: 7,
  },
  {
    id: 'byd-seal',
    brand: 'BYD',
    model: 'Seal',
    version: 'AWD (82.5 kWh)',
    category: 'Sedan',
    type: 'BEV',
    batteryGrossKWh: 82.56,
    batteryUsableKWh: 82.56,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 150,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 372,
    autonomyWLTPKm: 520,
    avgConsumptionKWhPer100Km: 17.8,
    year: 2023,
    popularRank: 5,
  },
  {
    id: 'byd-song-plus',
    brand: 'BYD',
    model: 'Song Plus',
    version: 'DM-i Híbrido Plug-in (18.3 kWh)',
    category: 'SUV',
    type: 'PHEV',
    batteryGrossKWh: 18.3,
    batteryUsableKWh: 18.3,
    onboardACKW: 3.3,
    onboardPhases: 1,
    maxACCurrentA: 16,
    maxDCKW: 0,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 68,
    autonomyWLTPKm: 110,
    avgConsumptionKWhPer100Km: 18.0,
    year: 2023,
    popularRank: 3,
  },
  {
    id: 'byd-shark',
    brand: 'BYD',
    model: 'Shark',
    version: 'DMO Híbrida Plug-in (29.5 kWh)',
    category: 'Picape',
    type: 'PHEV',
    batteryGrossKWh: 29.58,
    batteryUsableKWh: 29.58,
    onboardACKW: 6.6,
    onboardPhases: 1,
    maxACCurrentA: 30,
    maxDCKW: 40,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 75,
    autonomyWLTPKm: 100,
    avgConsumptionKWhPer100Km: 24.0,
    year: 2024,
    popularRank: 8,
  },
  {
    id: 'byd-tan',
    brand: 'BYD',
    model: 'Tan',
    version: 'EV AWD (108.8 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 108.8,
    batteryUsableKWh: 108.8,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 170,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 430,
    autonomyWLTPKm: 530,
    avgConsumptionKWhPer100Km: 22.0,
    year: 2024,
    popularRank: 18,
  },

  // ─── GWM (Great Wall Motors) ──────────────────────────────────────────
  {
    id: 'gwm-ora-03-skin',
    brand: 'GWM',
    model: 'Ora 03',
    version: 'Skin (48 kWh)',
    category: 'Hatch',
    type: 'BEV',
    batteryGrossKWh: 48.0,
    batteryUsableKWh: 48.0,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 64,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 232,
    autonomyWLTPKm: 310,
    avgConsumptionKWhPer100Km: 15.0,
    year: 2023,
    popularRank: 9,
  },
  {
    id: 'gwm-ora-03-gt',
    brand: 'GWM',
    model: 'Ora 03',
    version: 'GT (63 kWh)',
    category: 'Hatch',
    type: 'BEV',
    batteryGrossKWh: 63.0,
    batteryUsableKWh: 63.0,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 67,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 319,
    autonomyWLTPKm: 400,
    avgConsumptionKWhPer100Km: 15.5,
    year: 2023,
    popularRank: 10,
  },
  {
    id: 'gwm-haval-h6-phev',
    brand: 'GWM',
    model: 'Haval H6',
    version: 'PHEV / GT (34 kWh)',
    category: 'SUV',
    type: 'PHEV',
    batteryGrossKWh: 34.0,
    batteryUsableKWh: 34.0,
    onboardACKW: 6.6,
    onboardPhases: 1,
    maxACCurrentA: 30,
    maxDCKW: 48,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 113,
    autonomyWLTPKm: 170,
    avgConsumptionKWhPer100Km: 19.0,
    year: 2023,
    popularRank: 11,
  },

  // ─── VOLVO CARS ───────────────────────────────────────────────────────
  {
    id: 'volvo-ex30-single',
    brand: 'Volvo',
    model: 'EX30',
    version: 'Single Motor Extended Range (69 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 69.0,
    batteryUsableKWh: 64.0,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 153,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 338,
    autonomyWLTPKm: 476,
    avgConsumptionKWhPer100Km: 16.8,
    year: 2024,
    popularRank: 12,
  },
  {
    id: 'volvo-ex30-ultra',
    brand: 'Volvo',
    model: 'EX30',
    version: 'Ultra Twin Motor (69 kWh / 22 kW AC)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 69.0,
    batteryUsableKWh: 64.0,
    onboardACKW: 22.0,
    onboardPhases: 3,
    maxACCurrentA: 32,
    maxDCKW: 153,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 338,
    autonomyWLTPKm: 450,
    avgConsumptionKWhPer100Km: 17.5,
    year: 2024,
    popularRank: 13,
  },
  {
    id: 'volvo-xc40-recharge',
    brand: 'Volvo',
    model: 'EX40 / XC40',
    version: 'Recharge Ultimate (78 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 78.0,
    batteryUsableKWh: 75.0,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 150,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 348,
    autonomyWLTPKm: 435,
    avgConsumptionKWhPer100Km: 19.5,
    year: 2023,
    popularRank: 14,
  },

  // ─── RENAULT ──────────────────────────────────────────────────────────
  {
    id: 'renault-kwid-e-tech',
    brand: 'Renault',
    model: 'Kwid E-Tech',
    version: 'Elétrico (26.8 kWh)',
    category: 'Hatch',
    type: 'BEV',
    batteryGrossKWh: 26.8,
    batteryUsableKWh: 25.0,
    onboardACKW: 7.4,
    onboardPhases: 1,
    maxACCurrentA: 32,
    maxDCKW: 30,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 185,
    autonomyWLTPKm: 298,
    avgConsumptionKWhPer100Km: 13.0,
    year: 2022,
    popularRank: 15,
  },
  {
    id: 'renault-megane-e-tech',
    brand: 'Renault',
    model: 'Megane E-Tech',
    version: 'EV60 (60 kWh / 22 kW AC)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 60.0,
    batteryUsableKWh: 60.0,
    onboardACKW: 22.0,
    onboardPhases: 3,
    maxACCurrentA: 32,
    maxDCKW: 130,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 337,
    autonomyWLTPKm: 450,
    avgConsumptionKWhPer100Km: 15.8,
    year: 2023,
    popularRank: 16,
  },

  // ─── BMW ──────────────────────────────────────────────────────────────
  {
    id: 'bmw-ix1',
    brand: 'BMW',
    model: 'iX1',
    version: 'xDrive30 M Sport (64.7 kWh / 22 kW AC)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 66.5,
    batteryUsableKWh: 64.7,
    onboardACKW: 22.0,
    onboardPhases: 3,
    maxACCurrentA: 32,
    maxDCKW: 130,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 317,
    autonomyWLTPKm: 440,
    avgConsumptionKWhPer100Km: 18.2,
    year: 2023,
    popularRank: 17,
  },
  {
    id: 'bmw-i4',
    brand: 'BMW',
    model: 'i4',
    version: 'eDrive40 (83.9 kWh)',
    category: 'Sedan',
    type: 'BEV',
    batteryGrossKWh: 83.9,
    batteryUsableKWh: 80.7,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 205,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 422,
    autonomyWLTPKm: 590,
    avgConsumptionKWhPer100Km: 17.5,
    year: 2023,
    popularRank: 21,
  },

  // ─── PORSCHE ──────────────────────────────────────────────────────────
  {
    id: 'porsche-taycan',
    brand: 'Porsche',
    model: 'Taycan',
    version: 'Performance Battery Plus (93.4 kWh / 800V)',
    category: 'Esportivo',
    type: 'BEV',
    batteryGrossKWh: 93.4,
    batteryUsableKWh: 83.7,
    onboardACKW: 22.0,
    onboardPhases: 3,
    maxACCurrentA: 32,
    maxDCKW: 270,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 350,
    autonomyWLTPKm: 480,
    avgConsumptionKWhPer100Km: 21.0,
    year: 2024,
    popularRank: 25,
  },

  // ─── HYUNDAI ──────────────────────────────────────────────────────────
  {
    id: 'hyundai-ioniq-5',
    brand: 'Hyundai',
    model: 'Ioniq 5',
    version: 'AWD (84 kWh / 800V V2L)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 84.0,
    batteryUsableKWh: 80.0,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 240,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 380,
    autonomyWLTPKm: 507,
    avgConsumptionKWhPer100Km: 18.0,
    year: 2024,
    popularRank: 20,
  },

  // ─── CHEVROLET ────────────────────────────────────────────────────────
  {
    id: 'chevrolet-equinox-ev',
    brand: 'Chevrolet',
    model: 'Equinox EV',
    version: 'AWD (85 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 85.0,
    batteryUsableKWh: 85.0,
    onboardACKW: 11.5,
    onboardPhases: 1,
    maxACCurrentA: 32,
    maxDCKW: 150,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 443,
    autonomyWLTPKm: 500,
    avgConsumptionKWhPer100Km: 18.5,
    year: 2024,
    popularRank: 22,
  },

  // ─── MERCEDES-BENZ ────────────────────────────────────────────────────
  {
    id: 'mercedes-eqa',
    brand: 'Mercedes-Benz',
    model: 'EQA',
    version: '250 (66.5 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 66.5,
    batteryUsableKWh: 66.5,
    onboardACKW: 11.0,
    onboardPhases: 3,
    maxACCurrentA: 16,
    maxDCKW: 100,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 310,
    autonomyWLTPKm: 426,
    avgConsumptionKWhPer100Km: 17.5,
    year: 2023,
    popularRank: 23,
  },

  // ─── AUDI ─────────────────────────────────────────────────────────────
  {
    id: 'audi-q8-etron',
    brand: 'Audi',
    model: 'Q8 e-tron',
    version: '55 quattro (114 kWh)',
    category: 'SUV',
    type: 'BEV',
    batteryGrossKWh: 114.0,
    batteryUsableKWh: 106.0,
    onboardACKW: 22.0,
    onboardPhases: 3,
    maxACCurrentA: 32,
    maxDCKW: 170,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 360,
    autonomyWLTPKm: 582,
    avgConsumptionKWhPer100Km: 23.0,
    year: 2024,
    popularRank: 24,
  },

  // ─── JAC MOTORS ───────────────────────────────────────────────────────
  {
    id: 'jac-e-js1',
    brand: 'JAC',
    model: 'E-JS1',
    version: 'Elétrico (30.2 kWh)',
    category: 'Hatch',
    type: 'BEV',
    batteryGrossKWh: 30.2,
    batteryUsableKWh: 30.2,
    onboardACKW: 7.4,
    onboardPhases: 1,
    maxACCurrentA: 32,
    maxDCKW: 30,
    dcConnector: 'CCS2',
    acConnector: 'Tipo 2',
    autonomyPBEVKm: 161,
    autonomyWLTPKm: 260,
    avgConsumptionKWhPer100Km: 13.5,
    year: 2022,
    popularRank: 26,
  }
];

// ─── UTILITÁRIOS E CÁLCULOS TÉCNICOS ─────────────────────────────────────────

export interface ChargingTimeResult {
  vehicleId: string;
  vehicleName: string;
  chargerPowerNominalKW: number;
  effectiveChargingPowerKW: number;
  isBottleneckedByCar: boolean;
  bottleneckReason?: string;
  
  // Tempos em Horas e Minutos
  timeHours0to100: number;
  timeFormatted0to100: string;
  timeHours20to80: number;
  timeFormatted20to80: string;
  
  // Eficiência energética e alcance
  energyDeliveredKWh20to80: number;
  kmAddedPerHour: number;
  estimatedAutonomyGainedKm20to80: number;
}

/**
 * Calcula o tempo real de recarga levando em conta o gargalo do carregador de bordo do carro
 * e a potência física disponibilizada pela infraestrutura elétrica.
 */
export function calculateChargingTime(
  vehicle: ElectricVehicle,
  chargerPowerKW: number,
  chargerPhases: 1 | 3,
  chargerType: 'AC' | 'DC' = 'AC'
): ChargingTimeResult {
  let effectiveKW = chargerPowerKW;
  let isBottlenecked = false;
  let bottleneckReason = undefined;

  if (chargerType === 'AC') {
    // Se o carregador é trifásico (ex: 22 kW), mas o carro só aceita monofásico (ex: Dolphin 6.6 kW):
    if (chargerPhases === 3 && vehicle.onboardPhases === 1) {
      effectiveKW = Math.min(vehicle.onboardACKW, 7.4);
      isBottlenecked = true;
      bottleneckReason = `O carregador fornece ${chargerPowerKW} kW (Trifásico), porém o ${vehicle.brand} ${vehicle.model} possui carregador de bordo monofásico limitado a ${vehicle.onboardACKW} kW.`;
    } else if (chargerPowerKW > vehicle.onboardACKW) {
      effectiveKW = vehicle.onboardACKW;
      isBottlenecked = true;
      bottleneckReason = `O carregador fornece ${chargerPowerKW} kW, mas o carregador de bordo aceita no máximo ${vehicle.onboardACKW} kW AC.`;
    }
  } else {
    // Carga rápida DC (ignora carregador de bordo AC do carro, usa limite de recarga DC da bateria)
    if (chargerPowerKW > vehicle.maxDCKW) {
      effectiveKW = vehicle.maxDCKW;
      isBottlenecked = true;
      bottleneckReason = `O eletroposto DC fornece ${chargerPowerKW} kW, mas o veículo aceita no máximo ${vehicle.maxDCKW} kW em DC.`;
    }
  }

  // Fator de eficiência de recarga (perdas de conversão AC/DC e refrigeração ~ 90% em AC, 93% em DC)
  const chargingEfficiency = chargerType === 'AC' ? 0.90 : 0.93;

  const energyTotal = vehicle.batteryUsableKWh;
  const energy0to80 = energyTotal * 0.8;
  const energy80to100 = energyTotal * 0.2;

  const time0to80Hours = energy0to80 / (effectiveKW * chargingEfficiency);
  const taperFactor = chargerType === 'DC' ? 0.35 : 0.65;
  const time80to100Hours = energy80to100 / (effectiveKW * chargingEfficiency * taperFactor);
  
  const totalHours = time0to80Hours + time80to100Hours;
  const time20to80Hours = (energyTotal * 0.6) / (effectiveKW * chargingEfficiency);

  const kmPerKWh = vehicle.autonomyPBEVKm / vehicle.batteryUsableKWh;
  const kmAddedPerHour = Math.round(effectiveKW * chargingEfficiency * kmPerKWh);

  const formatHours = (h: number): string => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}min`;
  };

  return {
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.version}`,
    chargerPowerNominalKW: chargerPowerKW,
    effectiveChargingPowerKW: Number(effectiveKW.toFixed(1)),
    isBottleneckedByCar: isBottlenecked,
    bottleneckReason,
    timeHours0to100: Number(totalHours.toFixed(2)),
    timeFormatted0to100: formatHours(totalHours),
    timeHours20to80: Number(time20to80Hours.toFixed(2)),
    timeFormatted20to80: formatHours(time20to80Hours),
    energyDeliveredKWh20to80: Number((energyTotal * 0.6).toFixed(1)),
    kmAddedPerHour,
    estimatedAutonomyGainedKm20to80: Math.round(vehicle.autonomyPBEVKm * 0.6),
  };
}

/**
 * Busca veículos pelo nome, marca ou categoria
 */
export function searchVehicles(query: string): ElectricVehicle[] {
  if (!query || query.trim() === '') return BRAZIL_ELECTRIC_VEHICLES;
  const q = query.toLowerCase().trim();
  return BRAZIL_ELECTRIC_VEHICLES.filter(v => 
    v.brand.toLowerCase().includes(q) ||
    v.model.toLowerCase().includes(q) ||
    v.version.toLowerCase().includes(q) ||
    v.category.toLowerCase().includes(q)
  );
}

/**
 * Obtém veículo pelo ID
 */
export function getVehicleById(id: string): ElectricVehicle | undefined {
  return BRAZIL_ELECTRIC_VEHICLES.find(v => v.id === id);
}
