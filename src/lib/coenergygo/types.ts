/**
 * CoenergyGO — Mobilidade Elétrica Inteligente (Cordeiro Energia)
 * Definições de Tipos Compulsórios e Estruturas de Dados
 * 
 * Normas de Referência:
 * - ABNT NBR 17019:2022 / ABNT NBR 5410:2004
 * - CEMIG: ND-5.1, ND-5.2, ND-5.3, ND-5.30 e REN ANEEL 1000/2021 Art. 550
 * - CPFL: GED-150030, GED-13, GED-119
 * - ENERGISA: NDU 042, NDU 001, NDU 002
 * - Corpo de Bombeiros: IT-41 CBPMESP e IT-30 CBMMG
 */

// ─── 1. TIPOS DE VEÍCULOS ELÉTRICOS ──────────────────────────────────────────

export type VehicleCategory = 'Hatch' | 'Sedan' | 'SUV' | 'Picape' | 'Van' | 'Esportivo';
export type PowertrainType = 'BEV' | 'PHEV'; // 100% Elétrico ou Híbrido Plug-in
export type ACConnectorType = 'Tipo 2' | 'Tipo 1' | 'GB/T';
export type DCConnectorType = 'CCS2' | 'GB/T' | 'CHAdeMO' | 'NACS';

export interface ElectricVehicle {
  id: string;
  brand: string;
  model: string;
  version: string;
  category: VehicleCategory;
  powertrain: PowertrainType;
  
  // Bateria e Autonomia
  batteryGrossKWh: number;
  batteryUsableKWh: number;
  autonomyPBEVKm: number; // Inmetro PBEV
  autonomyWLTPKm?: number;
  avgConsumptionKWhPer100Km: number;

  // Carregador de Bordo AC (Onboard Charger)
  onboardACKW: number;
  onboardPhases: 1 | 2 | 3;
  maxACCurrentA: number;
  acConnector: ACConnectorType;

  // Recarga Rápida DC (DC Fast Charge)
  maxDCKW: number;
  dcConnector: DCConnectorType;
  
  // Metadados
  year: number;
  popularRank: number;
}

export interface ChargingSimulationResult {
  vehicleId: string;
  vehicleName: string;
  chargerNominalKW: number;
  effectiveChargingPowerKW: number;
  isBottleneckedByCar: boolean;
  bottleneckReason?: string;
  timeHours0to100: number;
  timeFormatted0to100: string;
  timeHours20to80: number;
  timeFormatted20to80: string;
  energyDeliveredKWh20to80: number;
  kmAddedPerHour: number;
  estimatedAutonomyGainedKm20to80: number;
}

// ─── 2. TIPOS DE ESTAÇÃO DE RECARGA (SAVE) ───────────────────────────────────

export interface ChargerItem {
  powerKW: number;
  quantity: number;
  phases: 1 | 3;
  chargerType: 'AC' | 'DC';
}

// ─── 3. TIPOS DE CONCESSIONÁRIAS DE ENERGIA ──────────────────────────────────

export type UtilityId = 'CEMIG' | 'CPFL' | 'ENERGISA' | 'ENEL_SP' | 'ENEL_RJ';

export interface UtilityCategorySpec {
  categoryId: string;
  categoryName: string;
  phases: 1 | 2 | 3;
  voltage: string;
  maxLimitKW: number;
  breakerCurrentA: number;
  cableGaugePhaseMM2: number;
  cableGaugeNeutralMM2: number;
  cableGaugeGroundMM2: number;
  meterBoxType: string;
}

export interface ComplianceAction {
  type: 'obrigatoria' | 'recomendada' | 'alerta';
  title: string;
  description: string;
  normReference: string;
}

export interface UtilitySizingInput {
  utility: UtilityId;
  chargers: ChargerItem[];
  existingLoadKW: number;
  location: 'urbano' | 'rural';
  installationType: 'individual' | 'coletivo_condominio' | 'comercial_eletroposto';
  hasDedicatedTransformer?: boolean;
  contractedDemandKVA?: number;
  hasSmartChargingDLM?: boolean;
}

export interface UtilitySizingOutput {
  utility: UtilityId;
  utilityFullName: string;
  applicableStandards: string[];
  voltageSupply: string;
  
  // Balanço de Potência
  totalChargersKW: number;
  simultaneityFactorApplied: number;
  diversifiedChargersKW: number;
  totalInstallationLoadKW: number;
  calculatedDemandKVA: number;
  
  // Padrão e Nível de Atendimento
  supplyLevel: 'BT' | 'MT';
  category: UtilityCategorySpec;
  requiresTransformer: boolean;
  recommendedTransformerKVA?: number;
  
  // Requisitos Regulatórios
  meteringScheme: string;
  needsStandardUpgrade: boolean;
  actions: ComplianceAction[];
  notes: string[];
}

// ─── 4. TIPOS DE PROTEÇÃO MANDATÓRIA NBR 17019 / NBR 5410 ────────────────────

export interface NBR17019Input {
  powerKW: number;
  voltage: number;
  phases: 1 | 2 | 3;
  cableLengthMeters: number;
  installationMethod: 'B1' | 'B2' | 'C' | 'D';
  conductorMaterial?: 'copper' | 'aluminum';
  ambientTemperature?: number;
  groupedCircuits?: number;
  hasBuiltinRDCDD?: boolean;
  hasEmergencyButtonWithin5m: boolean;
  hasMechanicalBollards: boolean;
  hasPhotoluminescentSignaling: boolean;
}

export interface ProtectionDeviceSpec {
  code: string;
  name: string;
  type: string;
  rating: string;
  normativeReference: string;
  isMandatory: boolean;
  technicalJustification: string;
}

export interface ChecklistVerificationItem {
  rule: string;
  standard: string;
  isCompliant: boolean;
  severity: 'critico' | 'atencao' | 'ok';
  recommendation: string;
}

export interface NBR17019Output {
  nominalCurrentA: number;
  designCurrentA: number;
  recommendedBreakerA: number;
  
  // Condutores
  cableGaugePhaseMM2: number;
  cableGaugeNeutralMM2: number;
  cableGaugeProtectionPEMM2: number;
  conduitRecommendedInch: string;
  
  // Queda de Tensão
  voltageDropPercent: number;
  voltageDropVolts: number;
  isVoltageDropCompliant: boolean;
  
  // Proteções
  residualProtection: ProtectionDeviceSpec;
  surgeProtection: ProtectionDeviceSpec;
  breakerProtection: ProtectionDeviceSpec;
  
  // Auditoria e Bombeiros
  checklistItems: ChecklistVerificationItem[];
  fireSafetyStatus: {
    isApproved: boolean;
    missingRequirements: string[];
  };
}

// ─── 5. TIPOS DE CURVA DE CARGA, FOLGA (HEADROOM) E DLM ──────────────────────

export type TypicalProfileType = 
  | 'condominio_residencial' 
  | 'edificio_comercial' 
  | 'centro_comercial' 
  | 'industrial';

export interface HourlyLoadPoint {
  hour: number;                      // 0 a 23
  hourLabel: string;                 // "00:00", "01:00", etc.
  baseLoadKW: number;                // Carga existente da edificação
  solarGenerationKW: number;         // Geração solar fotovoltaica no horário
  netBuildingLoadKW: number;         // Demanda líquida (baseLoad - solarGeneration, mín 0)
  gridLimitKW: number;               // Limite do padrão/disjuntor com margem
  headroomKW: number;                // Folga disponível para recarga
  
  // Sem DLM (recarga descontrolada)
  evLoadUncontrolledKW: number;
  totalUncontrolledKW: number;
  isOverloadedWithoutDLM: boolean;
  overloadAmountKW: number;
  
  // Com DLM (Smart Charging)
  evLoadControlledKW: number;
  totalControlledKW: number;
  isOverloadedWithDLM: boolean;
  perChargerCurrentA: number;        // Corrente modulada por carregador (6A a 32A)
  isThrottled: boolean;              // Se a potência foi reduzida pelo DLM
}

export interface DLMConfiguration {
  gridLimitKW: number;               // Capacidade do padrão (kW) ou disjuntor
  safetyMarginPercent: number;       // Margem de segurança (ex: 0.10 para 10%)
  voltage: number;                   // 220V ou 380V
  phases: 1 | 3;                    // 1 = monofásico, 3 = trifásico
  chargerCount: number;              // Quantidade de carregadores instalados
  chargerUnitPowerKW: number;        // Potência unitária nominal (ex: 7.4 ou 22 kW)
  chargeStartHour: number;           // Horário típico de conexão (ex: 18h)
  chargeDurationHours: number;       // Duração da sessão de recarga (ex: 8 horas)
  enableDLM: boolean;                // Se o DLM está ativo
  enableSolarSurplus: boolean;       // Se aproveita excedente solar
  solarPeakKW?: number;              // Potência de pico do sistema solar instalado
}

export interface DLMSimulationResult {
  hourlyPoints: HourlyLoadPoint[];
  
  // Indicadores de Potência de Pico
  peakBaseLoadKW: number;
  peakWithoutDLMKW: number;
  peakWithDLMKW: number;
  gridEffectiveLimitKW: number;
  
  // Diagnóstico de Sobrecarga
  isOverloadedWithoutDLM: boolean;
  maxOverloadWithoutDLMKW: number;
  overloadHoursCount: number;
  isOverloadedWithDLM: boolean;
  
  // Desempenho e Energia
  totalEnergyDeliveredUncontrolledKWh: number;
  totalEnergyDeliveredControlledKWh: number;
  averageModulatedCurrentA: number;
  minModulatedCurrentA: number;
  energyDeliveryEfficiencyPercent: number;
  solarEnergyUsedKWh: number;
  
  // Avaliação Executiva de Viabilidade
  status: 'approved_without_dlm' | 'approved_with_dlm' | 'requires_infrastructure_upgrade';
  statusLabel: string;
  statusColor: 'green' | 'yellow' | 'red';
  capexSavingsEstimateBRL: number;   // Economia estimada por evitar troca de trafo/padrão
  recommendations: string[];
}
