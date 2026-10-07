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
  // Campos específicos de Alta Demanda (CEMIG Tabela 4 / Categoria F)
  caboFaseAlMM2?: number;
  caboFaseVias?: number;
  eletrodutoPol?: string;
  eletrodutoAcoMM?: number;
  eletrodutoPVCMM?: number;
  tcRelacao?: string;
  tcFatorTermico?: number;
  tcQuantidade?: number;
  caixaMedicao?: string;
  caixaDisjuntor?: string;
  posteHomologado?: string;
  subterraneoObrigatorio?: boolean;
  hastesAterramento?: number;
}

export interface ComplianceAction {
  type: 'obrigatoria' | 'recomendada' | 'alerta';
  title: string;
  description: string;
  normReference: string;
}

export type ApplicationMode = 'individual' | 'condominio_frota' | 'eletroposto_hub';

export interface ClientProjectData {
  projectName: string;
  technicalResponsible: string;
  creaCft: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  address?: string;
  utility: UtilityId;
  installationNumber: string; // Número da Unidade Consumidora (UC) / Instalação / PN
  meterNumber: string; // Número do Medidor da Concessionária
  standardBreakerA?: number; // Disjuntor do Padrão Atual (A) - opcional caso não conste na fatura
  standardCategory: string; // Categoria do Padrão Atual (ex: C1..C6, F1..F9, B1)
  contractedDemandKW?: number;
  utilityBillFileName?: string;
  utilityBillFileUrl?: string;
  utilityBillFileType?: 'pdf' | 'image';

  // ─── Inteligência Energética & GD Solar Extraídos da Fatura ──────────────
  consumoMedioKWh?: number; // Média mensal de consumo (kWh/mês)
  consumoMaximoKWh?: number; // Maior consumo do histórico (kWh)
  demandaEstimadaHistoricoKW?: number; // Demanda estimada da carga existente em kW (FC = 0.30)
  saldoGeracaoKWh?: number; // Saldo de créditos de microgeração solar acumulados (kWh)
  energiaCompensadaKWh?: number; // Energia solar compensada / injetada no ciclo faturado (kWh)
  historicoConsumo?: Array<{ mes: string; kwh: number }>;

  // ─── Vistoria Técnica de Campo do Padrão Existente (CEMIG ND-5.1) ───────────
  fieldPhasesConfirmed?: '1F' | '2F' | '3F'; // Confirmação de fases reais inspecionadas no local
  fieldBreakerConfirmedA?: number; // Amperagem física real do disjuntor do padrão (40A, 50A, 63A, 70A, etc.)
  fieldCableGaugeMM2?: number; // Bitola do condutor do ramal de entrada existente (6, 10, 16, 25, 35 mm²)
  fieldBoxType?: 'policarbonato_atual' | 'chapa_antiga_cm1' | 'desconhecido'; // Tipo de caixa existente
  hasCustomerModifiedBreaker?: boolean; // Suspeita/Confirmação de alteração do disjuntor sem troca da fiação
  fieldInspectionConfirmed?: boolean; // Termo de validação técnica do projetista
}

// ─── 2.2 AMBIENTE DE INSTALAÇÃO & BOMBEIROS (IT-41 / IT-30) ─────────────────
export type CondoEnvironmentLocation = 
  | 'aberto' 
  | 'terreo_coberto' 
  | 'subsolo_g1' 
  | 'subsolo_g2_inferior';

export interface FireSafetyChecklist {
  hasSmokeDetection: boolean; // Sistema de detecção precoce óptico/térmico interligado ao alarme
  hasMechanicalExhaust: boolean; // Ventilação/exaustão mecânica de fumaça e gases
  hasEmergencyButtonWithin5m: boolean; // Botão EPO a ≤ 5m das estações de recarga
  hasExternalDisconnectSwitch: boolean; // Chave seccionadora externa para o Corpo de Bombeiros
  hasMechanicalBollards: boolean; // Balizadores mecânicos de proteção contra impacto
  hasPhotoluminescentSignaling: boolean; // Sinalização de piso e fotoluminescente de rota de fuga
}

export interface CommercialHubOperationalData {
  forecastDailyCharges: number; // Previsão de recargas por dia (ex: 25)
  averageSessionMinutes: number; // Tempo médio de permanência (ex: 35 min)
  peakConcentrationHours: number[]; // Horários de pico (ex: [11, 12, 13, 17, 18, 19])
  hasCanopy: boolean; // Cobertura metálica/canopy para os veículos
  hasAutonomousPayment: boolean; // Totem ou aplicativo com tarifação integrada
  gridSupplyVoltage?: 220 | 380; // Tensão de fornecimento local da rede (ex: 220V CEMIG ou 380V)
}

// ─── 2.3 DATASHEET E CATÁLOGO DE CARREGADORES (WEG / BENY) ──────────────────
export interface ChargerDatasheet {
  id: string;
  brand: string; // Fabricante (ex: WEG, BENY)
  model: string; // Modelo comercial (ex: WEMOB Station 60 kW)
  series: string; // Linha (ex: WEMOB Easy, Parking, Station, HPC, BDC)
  powerKW: number;
  phases: 1 | 3;
  voltageV: number;
  currentInA: number; // Corrente nominal máxima de entrada (A)
  efficiencyPercent: number; // Eficiência elétrica (ex: 96.0%)
  powerFactor: number; // Fator de potência (cos phi, ex: 0.99)
  thdiPercent: number; // Distorção harmônica total de corrente (ex: 4.5%)
  connectorType: string; // CCS2, Tipo 2, CHAdeMO, GB/T
  connectorsCount: number;
  coolingType: 'ar_forcado' | 'liquido' | 'natural';
  ipRating: string; // IP54, IP55, IP65
  ikRating: string; // IK08, IK10
  hasBuiltinRDCDD: boolean; // Detecção 6mA CC embutida
  hasBuiltinEPO: boolean; // Botão de emergência na carcaça
  protocolOCPP: string; // OCPP 1.6J / 2.0.1
  datasheetPdfUrl?: string;
}

export interface ConfiguredCharger {
  id: string;
  name: string;
  powerKW: number;
  phases: 1 | 3;
  voltage: number;
  type: 'AC' | 'DC';
  quantity: number;
  connector: string;
  brand?: string;
  model?: string;
  currentInA?: number;
  efficiencyPercent?: number;
  powerFactor?: number;
  thdiPercent?: number;
  datasheet?: ChargerDatasheet;
  targetVehicleId?: string;
  targetVehicleName?: string;
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
  currentStandardCategoryId?: string;
  currentStandardLimitKW?: number;
}

export interface UtilitySizingOutput {
  utility: UtilityId;
  utilityFullName: string;
  applicableStandards: string[];
  voltageSupply: string;
  
  // Balanço de Potência
  totalChargersKW: number;
  nominalTotalLoadKW?: number;
  isNominalLoadAboveBTLimit?: boolean;
  simultaneityFactorApplied: number;
  diversifiedChargersKW: number;
  totalInstallationLoadKW: number;
  calculatedDemandKVA: number;
  
  // Padrão e Nível de Atendimento
  supplyLevel: 'BT' | 'MT';
  category: UtilityCategorySpec;
  currentCategory?: UtilityCategorySpec;
  isExistingStandardAdequate: boolean;
  headroomInCurrentStandardKW: number;
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
  maxChargerCapKW?: number;          // Teto configurado/aceito de limitação estática/dinâmica pelo usuário (kW)
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
  
  // Sugestão e Limitação Segura Calculada (IEC 61851-1 / NBR 17019)
  suggestedSafeChargerPowerKW: number; // Potência segura máxima calculada para não desarmar o disjuntor
  isLimitationAccepted?: boolean;      // Se o usuário aceitou limitar o carregador na condição segura
  limitedChargerPowerKW?: number;      // Potência limitada efetiva adotada
  
  // Avaliação Executiva de Viabilidade
  status: 'approved_without_dlm' | 'approved_with_dlm' | 'requires_infrastructure_upgrade';
  statusLabel: string;
  statusColor: 'green' | 'yellow' | 'red';
  capexSavingsEstimateBRL: number;   // Economia estimada por evitar troca de trafo/padrão
  recommendations: string[];
}

// ─── 6. TIPOS DO PASSO 3: MEDIÇÃO POR PERÍODO & INFRAESTRUTURA ELETROTÉCNICA ───

export interface MeasuredIntervalPoint {
  index: number;
  dateStr: string;
  timeStr: string;
  powerKW: number;
  voltageV?: number;
  estimatedCurrentA?: number;
}

export interface PeriodMeasurementSummary {
  fileName: string;
  fileType: 'xlsx' | 'csv' | 'txt';
  periodStart: string;
  periodEnd: string;
  durationMinutes: number;
  intervalMinutes: number;
  totalReadings: number;
  minPowerKW: number;
  maxPowerKW: number;
  peakTimestamp: string;
  averagePowerKW: number;
  totalEnergyKWh: number;
  intervalPoints: MeasuredIntervalPoint[];
}

export interface DailyPeakPoint {
  dateStr: string;           // ex: '01/10/2026'
  dayLabel: string;          // ex: '01/10' ou 'Qui 01/10'
  maxPowerKW: number;        // Maior potência registrada no dia
  peakTimeStr: string;       // Hora do pico (ex: '14:00:00')
  averagePowerKW: number;    // Média de demanda do dia
  totalEnergyKWh: number;    // Consumo integrado do dia em kWh
  readingsCount: number;     // Quantidade de leituras naquele dia
  sourceFileName?: string;   // Nome da planilha de onde veio a leitura
}

export interface MultiSheetMeasurementSummary {
  files: PeriodMeasurementSummary[];
  consolidatedSummary: PeriodMeasurementSummary;
  dailyPeaks: DailyPeakPoint[];
  globalMaxPowerKW: number;
  globalPeakTimestamp: string;
  totalDays: number;
}

export interface BillOfMaterialItem {
  id: string;
  category: 'condutores' | 'protecao' | 'quadro' | 'infraestrutura' | 'seguranca' | 'auxiliares' | 'medicao' | 'transformador';
  description: string;
  quantity: number;
  unit: 'm' | 'pç' | 'cj' | 'kit';
  spec: string;
  normReference: string;
}

export interface AuxiliaryCircuitsConfig {
  enableOutlets: boolean;
  outletsCount: number; // ex: 2 ou 4 tomadas 20A 220V (TUG)
  enableLighting: boolean;
  lightingPowerW: number; // ex: 800W LED pátio/canopy
  enableCCTV: boolean;
  cctvPowerW: number; // ex: 400W (Câmeras + Switch PoE + Wi-Fi + Totem)
  enableCustomerTap: boolean;
  customerTapPowerKW: number; // ex: Carga do imóvel/conveniência
  enableEnergyMeter: boolean; // Multimedidor digital com Modbus RS485
}

export interface AuxiliaryCircuitItem {
  id: string;
  name: string;
  voltageV: number;
  phases: 1 | 2 | 3;
  powerW: number;
  currentA: number;
  breakerA: number;
  cableMM2: number;
  protectionType: string;
  normReference: string;
  description: string;
}

export interface BreakerTripDiagnosis {
  willTripWithoutDLM: boolean;
  overloadAmountKW: number;
  overloadAmountA: number;
  currentBreakerA: number;
  requiredBreakerA: number;
  willTripWithDLM: boolean;
  summaryMessage: string;
  actionRequired: string;
}

export interface TransformerRecommendation {
  needed: boolean;
  recommendedKVA: number;
  supplyLevel: 'BT' | 'MT';
  reason: string;
  suggestedTrafoRatingKVA?: number;
  applicableNorm: string;
}

export interface TransformerSizingDetails {
  needed: boolean;
  type: 'elevador_seco' | 'dispensado_rede_compativel' | 'subestacao_mt';
  nominalKVA: number;
  primaryVoltageV: number;
  primaryPhases: 1 | 3;
  primaryCurrentA: number;
  secondaryVoltageV: number;
  secondaryPhases: 1 | 3;
  secondaryCurrentA: number;
  connectionGroup: string; // Ex: 'Triângulo-Estrela Aterrada (Dyn1) com Neutro acessível'
  coolingType: string; // Ex: 'A seco (AN) - Classe de Isolação F (155°C) / H (180°C)'
  enclosureIp: string; // Ex: 'IP23 (Abrigado) / IP54 (Uso Externo)'
  reason: string;
  applicableNorm: string;
  inrushMultiplier: number; // Ex: 8x a 10x In (exige disjuntor curva D no primário)
  lossesEstimatedKW: number; // Ex: ~2% a 3%
  beforeAfterAnalysis?: TransformerBeforeAfterAnalysis;
}

export interface TransformerSideAnalysis {
  voltageV: number;
  phases: number;
  connection: string; // Ex: "Triângulo Delta (Δ)" ou "Estrela Aterrada com Neutro (Yn)"
  nominalCurrentA: number;
  inrushCurrentA?: number; // Corrente transitória de magnetização a frio (8x a 10x In)
  breakerRatingA: number;
  breakerPoles: number;
  breakerCurve: 'C' | 'D';
  breakerType: string;
  cableGaugePhaseMM2: number;
  cableGaugeNeutralMM2?: number;
  cableGaugeGroundMM2: number;
  voltageDropPercent: number;
  voltageDropVolts: number;
  shortCircuitCurrentKA: number; // Icc estimado no barramento
  dpsSpec: string;
  dpsUcVolts: number;
  drSpec?: string;
  groundingSystem: string;
}

export interface TransformerEquipmentSpecs {
  nominalKVA: number;
  efficiencyPercent: number;
  lossesKW: number;
  impedanceZccPercent: number;
  coolingType: string;
  isolationClass: string;
  ipRating: string;
  connectionGroup: string;
  standards: string[];
}

export interface TransformerBeforeAfterAnalysis {
  needed: boolean;
  reason: string;
  primary: TransformerSideAnalysis;
  transformer: TransformerEquipmentSpecs;
  secondary: TransformerSideAnalysis;
  neutralGroundingCompliance: {
    system: 'TN-S';
    standard: string;
    description: string;
    bepConnectionRequired: boolean;
  };
}

export interface Panel220VSpec {
  name: string;
  mainBreakerA: number;
  mainBreakerPoles: number;
  mainBreakerCurve: 'C' | 'D';
  dpsSpec: string;
  busbarRatingA: number;
  dinModulesCount: number;
  cableGaugeMM2: number;
  circuitsCount: number;
  voltageV: number;
  phases: 1 | 2 | 3;
  description: string;
}

export interface Panel380VSpec {
  active: boolean;
  name: string;
  mainBreakerA: number;
  mainBreakerPoles: number;
  mainBreakerCurve: 'C' | 'D';
  dpsSpec: string;
  drType: string;
  busbarRatingA: number;
  dinModulesCount: number;
  cableGaugeMM2: number;
  terminalBreakerA: number;
  groundingSystem: string;
  voltageV: number;
  phases: 3;
  description: string;
}

export interface ElectricalInfrastructureInput {
  utility?: UtilityId;
  chargerPowerKW: number;
  chargerVoltage: number;
  chargerPhases: 1 | 3;
  cableLengthMeters: number;
  installationMethod: 'B1' | 'B2' | 'C' | 'D';
  ambientTemperatureC?: number;
  groupedCircuits?: number;
  existingPeakDemandKW: number;
  gridStandardLimitKW: number;
  currentStandardBreakerA?: number;
  hasSmartChargingDLM?: boolean;
  isOutdoor?: boolean;
  auxiliaryConfig?: AuxiliaryCircuitsConfig;
  cemigStandardBOM?: any[];
  gridSupplyVoltage?: 220 | 380;
  chargerModelName?: string;
  chargerBrand?: string;
  chargerCurrentInA?: number;
}

export interface ElectricalInfrastructureSizing {
  // Circuito Terminal do Carregador (EV)
  chargerDesignCurrentA: number;
  recommendedBreakerA: number;
  chargerModelName?: string;
  chargerBrand?: string;
  chargerCurrentInA?: number;
  cableGaugePhaseMM2: number;
  cableGaugeNeutralMM2: number;
  cableGaugeGroundMM2: number;
  calculatedVoltageDropPercent: number;
  isVoltageDropCompliant: boolean;
  maxAllowedVoltageDropPercent: number;
  
  // Proteções Conforme NBR 17019
  residualCurrentProtection: ProtectionDeviceSpec;
  surgeProtectionDPS: ProtectionDeviceSpec;
  
  // Especificação do Quadro (QDC-VE / QGBT)
  panelSpecification: {
    enclosureType: string;
    ipRating: string;
    dinModulesCount: number;
    recommendedModel: string;
    busbar380VRatingA: number;
    busbar220VRatingA: number;
  };

  // Painéis Segregados Lado 220V e Lado 380V
  panel220VSpec: Panel220VSpec;
  panel380VSpec: Panel380VSpec;

  // Disjuntor Geral do QGBT
  qgbtMainBreakerA: number;
  qgbtTotalInstalledKW: number;
  qgbtTotalDesignCurrentA: number;

  // Circuitos Auxiliares (Lado 220V)
  auxiliaryCircuits: AuxiliaryCircuitItem[];
  auxiliaryConfig: AuxiliaryCircuitsConfig;

  // Diagnóstico de Desarme ("O Disjuntor Geral Irá Cair?")
  breakerTripDiagnosis: BreakerTripDiagnosis;

  // Recomendação de Transformador / Nível MT
  transformerRecommendation: TransformerRecommendation;
  transformerDetails: TransformerSizingDetails;
  transformerBeforeAfter?: TransformerBeforeAfterAnalysis;
  
  // Eletroduto / Eletrocalha
  conduitSpecification: {
    type: string;
    nominalDiameterMM: number;
    nominalInches: string;
  };
  
  // Balanço com a Demanda Real Medida (SmartMeter)
  measuredPeakDemandKW: number;
  totalSimultaneousDemandKW: number;
  feederGeneralBreakerRecommendedA: number;
  feederCableGaugePhaseMM2: number;
  feederCableGaugeGroundMM2: number;
  isGridLimitExceeded: boolean;
  gridHeadroomKW: number;
  
  // Relação de Materiais (BOM) & Notas
  billOfMaterials: BillOfMaterialItem[];
  cemigStandardBOM?: any[];
  technicalNotes: string[];
}

// ─── 7. TOPOLOGIA EM CADEIA REATIVA MULTI-TRECHO (NOVO FLUXO INTERATIVO) ──────

export interface TopologyChargerNode {
  id: string;
  name: string;
  brand: string;
  model: string;
  powerKW: number;
  phases: 1 | 2 | 3;
  voltageV: number;
  currentInA: number;
  connector: string;
  type: 'AC' | 'DC';
  distanceMeters: number;      // Distância individual do Trecho 4 (Painel -> Carregador)
  marginPercent: number;        // Margem de erro do cabo (ex: 10% ou 15%)
  photoUrl?: string;
}

export interface SectionCableConduitSizing {
  sectionId: 'trecho_1' | 'trecho_2' | 'trecho_3' | 'trecho_4';
  name: string;
  fromNode: string;
  toNode: string;
  distanceNominalM: number;
  marginPercent: number;
  distanceTotalM: number;       // distanceNominalM * (1 + marginPercent / 100)
  designCurrentA: number;
  phases: 1 | 2 | 3;
  voltageV: number;
  conductorMaterial: 'copper' | 'aluminum';
  installationMethod: 'B1' | 'B2' | 'C' | 'D';
  conductorsPerPhase: number;    // Número de condutores em paralelo por fase (ex: 1, 2, 3)
  cableGaugePhaseMM2: number;
  cableGaugeNeutralMM2?: number;
  cableGaugeGroundMM2: number;
  totalConductorsCount: number;
  conduitDiameterMM: number;
  conduitInches: string;
  conduitFillingRatePercent: number; // Max 40% NBR 5410 para 3 ou mais condutores
  conduitQuantity?: number;      // Quantidade de eletrodutos em paralelo (ex: 1, 2, 3)
  voltageDropPercent: number;
  voltageDropVolts: number;
  isVoltageDropCompliant: boolean;
  ampacityPerCableA?: number;    // Capacidade de corrente de 1 cabo na tabela
  totalAmpacityA?: number;       // conductorsPerPhase * ampacityPerCableA
  calculationBreakdown?: {
    apparentPowerKVA?: number;
    activePowerKW?: number;
    formulaDesignCurrent?: string;
    formulaAmpacity?: string;
    formulaVoltageDrop?: string;
    fct?: number;
    fca?: number;
    rhoCopper?: number;
    standardOriginNote?: string;
  };
}

export interface AuxiliaryLoadsState {
  cctv: {
    enabled: boolean;
    voltageV: 127 | 220;
    powerW: number;
    phases: 1;
    breakerA: number;
    cableMM2: number;
  };
  maintenanceOutlet: {
    enabled: boolean;
    voltageV: 127 | 220;
    powerW: number;
    phases: 1;
    breakerA: number;
    cableMM2: number;
  };
  lighting: {
    enabled: boolean;
    voltageV: 127 | 220;
    powerW: number; // Editável pelo usuário
    phases: 1;
    breakerA: number;
    cableMM2: number;
  };
  dps220V: {
    enabled: boolean;
    classType: string; // "Classe II"
    rating: string;    // "Uc=275V, In=20kA, Imax=40kA"
    quantity: number;  // 3 polos (F+F+T ou F+N+T)
  };
  energyMeter: {
    enabled: boolean;
    type: string;      // "Multimedidor digital trifásico com TC e RS485 Modbus"
    measuresTrafoAndAuxOnly: boolean; // TRUE: não inclui consumo de base do cliente
    aggregatedLoadKW: number;
  };
}

export interface Panel220VTopologyState {
  mainBreakerA: number;
  mainBreakerPoles: number;
  mainBreakerCurve: 'C' | 'D';
  busbarRatingA: number;       // Dimensionado exatamente pelo disjuntor geral
  requiresBusbar: boolean;
  auxiliaryLoads: AuxiliaryLoadsState;
}

export interface Panel380VTopologyState {
  active: boolean;             // Bypassed/False se todos os carregadores forem 220V ou rede 380V
  mainBreakerA: number;
  mainBreakerPoles: 3;
  mainBreakerCurve: 'C';
  requiresBusbar: boolean;     // False se apenas 1 carregador (1 disjuntor unificado, zero barramento)
  busbarRatingA: number;
  individualBreakers: Array<{
    chargerId: string;
    breakerA: number;
    poles: number;
    curve: 'C';
    drType: string;
  }>;
}

export interface TransformerTopologyState {
  needed: boolean;             // True apenas se houver carregador 380V e rede 220V
  type: 'elevador_seco' | 'dispensado_rede_compativel' | 'subestacao_mt';
  nominalKVA: number;
  primaryVoltageV: 220;
  secondaryVoltageV: 380;
  primaryCurrentA: number;
  secondaryCurrentA: number;
  connectionGroup: string;     // Dyn1
  inrushCurveProtection: 'D';  // Curva D obrigatória
  lossesKW: number;
  apparentPowerKVA?: number;
  activePowerKW?: number;
  calculationBreakdown?: {
    totalLoadChargersKW: number;
    cosPhi: number;
    efficiency: number;
    safetyMarginFactor: number;
    calculatedRawKVA: number;
    standardSelectedKVA: number;
    formulaKVA: string;
    formulaPrimaryCurrent: string;
    formulaSecondaryCurrent: string;
    notes: string;
  };
}

export interface StandardCapacityAlert {
  isOverloaded: boolean;
  currentStandardCategory: string;
  currentStandardBreakerA: number;
  currentStandardLimitKW: number;
  clientBaseLoadKW: number;
  hubAdditionalLoadKW: number;
  totalRequiredLoadKW: number;
  requiredCapacityA: number;
  recommendedCategory: string;
  recommendedBreakerA: number;
  message: string;
}

export interface ChainTopologyOutput {
  chargers: TopologyChargerNode[];
  gridSupplyVoltage: 220 | 380;
  utility: UtilityId;
  standardAlert: StandardCapacityAlert;
  panel220V: Panel220VTopologyState;
  transformer: TransformerTopologyState;
  panel380V: Panel380VTopologyState;
  sections: {
    section1_standardToPanel220: SectionCableConduitSizing;
    section2_panel220ToTrafo?: SectionCableConduitSizing;
    section3_trafoToPanel380?: SectionCableConduitSizing;
    section4_chargersFeeders: SectionCableConduitSizing[];
  };
  hubDedicatedMeterKWhEstimatedMonthly: number;
  totalBOM: BillOfMaterialItem[];
}

