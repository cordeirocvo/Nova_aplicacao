"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Zap, Plus, FileText, Calendar, User, ChevronRight, Loader, 
  Car, Shield, CheckCircle2, AlertTriangle, Search, Info, 
  BatteryCharging, Gauge, ArrowRight, BookOpen, Layers, Flame, Activity,
  Cable, FileSpreadsheet, Upload, AlertCircle, Printer, Check, Copy, Award,
  Building2, Trash2, Sliders, RefreshCw, Cpu, CheckSquare, Sparkles, Calculator,
  Settings, Globe, ExternalLink, Save
} from "lucide-react";
import { 
  BRAZIL_ELECTRIC_VEHICLES, 
  ElectricVehicle, 
  calculateChargingTime, 
  ChargingTimeResult,
  searchVehicles
} from "@/lib/ev/vehiclesDatabase";
import { calculateNBR17019Compliance } from "@/lib/ev/nbr17019Engine";
import { 
  generateScaledHourlyCurve, 
  simulateDLM, 
  parseUniversalLoadFile,
  compileMultipleLoadSummaries,
  DailyPeakPoint,
  MultiSheetMeasurementSummary,
  sizeElectricalInfrastructure,
  TypicalProfileType, 
  DLMSimulationResult,
  PeriodMeasurementSummary,
  ElectricalInfrastructureSizing,
  evaluateUtility,
  ApplicationMode,
  ConfiguredCharger,
  UtilityId,
  CEMIG_CATEGORIES,
  CPFL_CATEGORIES,
  ENERGISA_CATEGORIES,
  UtilityCategorySpec,
  AuxiliaryCircuitsConfig
} from "@/lib/coenergygo";
import { dimensionarPadraoCemig } from "@/lib/cemig/padraoEngine";
import LoadCurveChart from "@/components/ev/LoadCurveChart";
import DLMControlPanel from "@/components/ev/DLMControlPanel";
import LoadFeasibilityReport from "@/components/ev/LoadFeasibilityReport";
import ImportedDataViewer from "@/components/ev/ImportedDataViewer";
import InfrastructurePanel from "@/components/ev/InfrastructurePanel";
import { EVTopologyChainViewer } from "@/components/ev/EVTopologyChainViewer";
import ClientProjectForm from "@/components/ev/ClientProjectForm";
import InstallationEnvironmentSelector from "@/components/ev/InstallationEnvironmentSelector";
import ChargerCatalogSelector from "@/components/ev/ChargerCatalogSelector";
import { 
  ClientProjectData, 
  CondoEnvironmentLocation, 
  FireSafetyChecklist, 
  CommercialHubOperationalData 
} from "@/lib/coenergygo";

export default function CoenergyGODashboard() {
  const [activeTab, setActiveTab] = useState<'projetos' | 'veiculos' | 'concessionarias' | 'nbr17019' | 'curva_dlm' | 'infraestrutura' | 'resultado'>('projetos');
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Metadados do Projeto Selecionado
  const [projectName, setProjectName] = useState<string>("Novo Dimensionamento");
  const [clientName, setClientName] = useState<string>("Cliente Particular");

  // Dados Estruturados do Cliente e Padrão Concessionária (Passo 01)
  const [clientProjectData, setClientProjectData] = useState<ClientProjectData>({
    projectName: "Novo Dimensionamento",
    technicalResponsible: "Eng. Responsável Técnico",
    creaCft: "CREA-MG / CFT",
    clientName: "Cliente Particular",
    clientPhone: "",
    clientEmail: "",
    address: "",
    utility: 'CEMIG',
    installationNumber: "",
    meterNumber: "",
    standardBreakerA: 63,
    standardCategory: "C3",
    contractedDemandKW: 0
  });

  // Localização física da garagem e Segurança contra Incêndio (IT-41 CBPMESP / IT-30 CBMMG)
  const [condoLocation, setCondoLocation] = useState<CondoEnvironmentLocation>('terreo_coberto');
  const [fireSafety, setFireSafety] = useState<FireSafetyChecklist>({
    hasSmokeDetection: true,
    hasMechanicalExhaust: false,
    hasEmergencyButtonWithin5m: true,
    hasExternalDisconnectSwitch: true,
    hasMechanicalBollards: true,
    hasPhotoluminescentSignaling: true
  });

  // Dados Operacionais para Eletroposto Comercial (Fluxo Diário e Modelagem do Passo 2)
  const [commercialHub, setCommercialHub] = useState<CommercialHubOperationalData>({
    forecastDailyCharges: 25,
    averageSessionMinutes: 35,
    peakConcentrationHours: [11, 12, 13, 17, 18, 19],
    hasCanopy: true,
    hasAutonomousPayment: true
  });

  // ─── ESTADO CENTRAL E UNIFICADO (SINGLE SOURCE OF TRUTH) ───────────────────
  // Modo de Aplicação
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>('individual');

  // Carregadores Configurados no Projeto (Consumidos por TODOS os Passos)
  const [configuredChargers, setConfiguredChargers] = useState<ConfiguredCharger[]>([
    {
      id: 'ch-1',
      name: 'Wallbox Residencial Padrão',
      powerKW: 7.4,
      phases: 1,
      voltage: 220,
      type: 'AC',
      quantity: 1,
      connector: 'Tipo 2',
      targetVehicleId: BRAZIL_ELECTRIC_VEHICLES[0].id,
      targetVehicleName: `${BRAZIL_ELECTRIC_VEHICLES[0].brand} ${BRAZIL_ELECTRIC_VEHICLES[0].model}`
    }
  ]);

  // Veículo Selecionado para Homologação Individual
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<ElectricVehicle>(BRAZIL_ELECTRIC_VEHICLES[0]);
  const [simulationResult, setSimulationResult] = useState<ChargingTimeResult | null>(null);

  const filteredVehicles: ElectricVehicle[] = BRAZIL_ELECTRIC_VEHICLES.filter((v: ElectricVehicle) =>
    v.brand.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.version.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // Concessionária & Padrão de Entrada Atual do Imóvel (Passo 1B)
  const [selectedUtility, setSelectedUtility] = useState<UtilityId>('CEMIG');
  const [currentStandardCategoryId, setCurrentStandardCategoryId] = useState<string>('C3');
  const [loadSourceMode, setLoadSourceMode] = useState<'fatura' | 'smartmeter' | 'spot'>('smartmeter');
  const [manualExistingLoadKW, setManualExistingLoadKW] = useState<number>(15);
  const [useSmartMeterExistingLoad, setUseSmartMeterExistingLoad] = useState<boolean>(true);

  // Parâmetros de Medição Spot de Campo (Calculadora)
  const [spotVoltage, setSpotVoltage] = useState<number>(220);
  const [spotPhases, setSpotPhases] = useState<1 | 3>(3);
  const [spotCurrentA, setSpotCurrentA] = useState<number>(40);
  const [spotPowerFactor, setSpotPowerFactor] = useState<number>(0.92);
  const [spotSafetyMargin, setSpotSafetyMargin] = useState<number>(1.15);

  // Cálculo da Potência Medida Spot em Campo
  const calculatedSpotKW = Number(
    (spotPhases === 3
      ? (Math.sqrt(3) * spotVoltage * spotCurrentA * spotPowerFactor * spotSafetyMargin) / 1000
      : (spotVoltage * spotCurrentA * spotPowerFactor * spotSafetyMargin) / 1000
    ).toFixed(1)
  );

  // Parâmetros Eletrotécnicos Físicos (Compartilhados entre 1C, 3 e Dossiê)
  const [circuitDistanceMeters, setCircuitDistanceMeters] = useState<number>(25);
  const [installationMethod, setInstallationMethod] = useState<'B1' | 'B2' | 'C' | 'D'>('B1');
  const [ambientTemp, setAmbientTemp] = useState<number>(30);
  const [isOutdoor, setIsOutdoor] = useState<boolean>(false);

  // Circuitos Auxiliares e QGBT (Passo 3)
  const [auxiliaryConfig, setAuxiliaryConfig] = useState<AuxiliaryCircuitsConfig>({
    enableOutlets: true,
    outletsCount: 2,
    enableLighting: true,
    lightingPowerW: 800,
    enableCCTV: true,
    cctvPowerW: 400,
    enableCustomerTap: false,
    customerTapPowerKW: 0,
    enableEnergyMeter: true
  });

  // NBR 17019 & Bombeiros (Passo 1C)
  const [auditHasEmergencyButton, setAuditHasEmergencyButton] = useState<boolean>(true);
  const [auditHasBollards, setAuditHasBollards] = useState<boolean>(true);
  const [auditHasSignaling, setAuditHasSignaling] = useState<boolean>(true);

  // Medição SmartMeter (Passo 3 e Curva de Carga com Suporte a Múltiplas Planilhas e Picos Diários)
  const [smartMeterSummary, setSmartMeterSummary] = useState<PeriodMeasurementSummary | null>(null);
  const [attachedSheetsList, setAttachedSheetsList] = useState<{ id: string; name: string; summary: PeriodMeasurementSummary; hourlyCurve: any[] }[]>([]);
  const [dailyPeaksState, setDailyPeaksState] = useState<DailyPeakPoint[]>([]);
  const [customCurvePoints, setCustomCurvePoints] = useState<any[] | null>(null);
  const [customCurveBackup, setCustomCurveBackup] = useState<any[] | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  // Curva de Carga & DLM (Passo 2)
  const [dlmProfileType, setDlmProfileType] = useState<TypicalProfileType>('condominio_residencial');
  const [dlmPeakDemandKW, setDlmPeakDemandKW] = useState<number>(55);
  const [dlmSimulationScenario, setDlmSimulationScenario] = useState<'current' | 'homologated'>('current');
  const [dlmChargeStartHour, setDlmChargeStartHour] = useState<number>(8);
  const [dlmChargeDurationHours, setDlmChargeDurationHours] = useState<number>(2);
  const [dlmSolarPeakKW, setDlmSolarPeakKW] = useState<number>(25);
  const [dlmEnableDLM, setDlmEnableDLM] = useState<boolean>(true);
  const [dlmEnableSolarSurplus, setDlmEnableSolarSurplus] = useState<boolean>(true);
  const [isDlmLimitationAccepted, setIsDlmLimitationAccepted] = useState<boolean>(false);
  const [dlmLimitedChargerPowerKW, setDlmLimitedChargerPowerKW] = useState<number | null>(null);
  const [customHomologatedCategoryId, setCustomHomologatedCategoryId] = useState<string | null>(null);
  const [customHourlyFactors, setCustomHourlyFactors] = useState<number[]>(Array(24).fill(1.0));
  const [customProfileName, setCustomProfileName] = useState<string>("Perfil do Projetista");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // ─── CARREGAR PROJETOS EXISTENTES (BANCO SUPABASE + LOCALSTORAGE RESILIENTE) ─
  useEffect(() => {
    let localSaved: any[] = [];
    try {
      const stored = localStorage.getItem('coenergygo_saved_projects');
      if (stored) {
        localSaved = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Aviso ao ler projetos do localStorage:", e);
    }

    fetch("/api/ev/sizing")
      .then(res => {
        if (!res.ok) throw new Error("Erro ao carregar projetos do banco");
        return res.json();
      })
      .then(dbProjects => {
        const dbList = Array.isArray(dbProjects) ? dbProjects : [];
        // Mesclar priorizando os snapshots mais completos do localStorage (que contêm perfis 24h e customizações)
        const combined = [...localSaved];
        dbList.forEach(p => {
          const existingIdx = combined.findIndex(c => c.id === p.id);
          if (existingIdx >= 0) {
            // Mescla mantendo campos avançados salvos localmente
            combined[existingIdx] = { ...p, ...combined[existingIdx] };
          } else {
            combined.push(p);
          }
        });
        setProjects(combined);
        setLoadingProjects(false);
      })
      .catch(err => {
        console.warn("Aviso na API remota /api/ev/sizing, utilizando projetos locais:", err);
        if (localSaved.length > 0) {
          setProjects(localSaved);
        }
        setLoadingProjects(false);
      });
  }, []);

  const effectiveExistingLoadKW = (loadSourceMode === 'smartmeter' && smartMeterSummary)
    ? smartMeterSummary.maxPowerKW
    : (loadSourceMode === 'spot')
    ? calculatedSpotKW
    : manualExistingLoadKW;

  const totalChargersInstalledKW = configuredChargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0);
  const totalChargersCount = configuredChargers.reduce((sum, c) => sum + c.quantity, 0);
  const highestChargerPowerKW = configuredChargers.length > 0
    ? Math.max(...configuredChargers.map(c => c.powerKW))
    : 7.4;
  const primaryCharger = configuredChargers[0] || { powerKW: 7.4, phases: 1, voltage: 220, type: 'AC' };

  // Atualizar simulação do veículo selecionado com o primeiro carregador
  useEffect(() => {
    if (selectedVehicle) {
      const res = calculateChargingTime(
        selectedVehicle,
        primaryCharger.powerKW,
        primaryCharger.phases as (1 | 3),
        primaryCharger.type as ('AC' | 'DC')
      );
      setSimulationResult(res);
    }
  }, [selectedVehicle, primaryCharger.powerKW, primaryCharger.phases, primaryCharger.type]);

  // Lista de categorias da concessionária selecionada para alimentar o Dropdown "Padrão Atual"
  const getCategoriesForUtility = (util: UtilityId): Record<string, UtilityCategorySpec> => {
    switch (util) {
      case 'CEMIG':
        return CEMIG_CATEGORIES;
      case 'CPFL':
        return CPFL_CATEGORIES;
      case 'ENERGISA':
        return ENERGISA_CATEGORIES;
      case 'ENEL_SP':
      case 'ENEL_RJ':
      default:
        return CPFL_CATEGORIES;
    }
  };

  const availableCategories = getCategoriesForUtility(selectedUtility);

  // Garantir categoria padrão válida e sincronização automática entre Passo 1A e Passo 1B
  useEffect(() => {
    if (clientProjectData.standardCategory && availableCategories[clientProjectData.standardCategory]) {
      if (currentStandardCategoryId !== clientProjectData.standardCategory) {
        setCurrentStandardCategoryId(clientProjectData.standardCategory);
      }
    } else {
      const keys = Object.keys(availableCategories);
      if (!availableCategories[currentStandardCategoryId]) {
        setCurrentStandardCategoryId(keys.includes('C3') ? 'C3' : keys.includes('T1') ? 'T1' : keys[0] || 'C3');
      }
    }
  }, [selectedUtility, clientProjectData.standardCategory]);

  // ─── MOTOR DE CONCESSIONÁRIA CENTRAL (Passo 1B) ────────────────────────────
  const utilityAnalysis = evaluateUtility({
    utility: selectedUtility,
    location: 'urbano',
    installationType: applicationMode === 'individual' ? 'individual' : applicationMode === 'condominio_frota' ? 'coletivo_condominio' : 'comercial_eletroposto',
    existingLoadKW: effectiveExistingLoadKW,
    currentStandardCategoryId,
    chargers: configuredChargers.map(c => ({
      powerKW: c.powerKW,
      quantity: c.quantity,
      phases: c.phases as (1 | 3),
      chargerType: c.type as ('AC' | 'DC')
    })),
    hasSmartChargingDLM: dlmEnableDLM
  });

  // ─── MOTOR NBR 17019 CENTRAL (Passo 1C) ────────────────────────────────────
  const auditResult = calculateNBR17019Compliance({
    powerKW: highestChargerPowerKW,
    voltage: highestChargerPowerKW >= 11 ? 380 : 220,
    phases: (highestChargerPowerKW >= 11 ? 3 : 1) as (1 | 2 | 3),
    cableLengthMeters: circuitDistanceMeters,
    installationMethod,
    conductorMaterial: 'copper',
    ambientTemperature: ambientTemp,
    hasBuiltinRDCDD: true,
    hasEmergencyButtonWithin5m: auditHasEmergencyButton,
    hasMechanicalBollards: auditHasBollards,
    hasPhotoluminescentSignaling: auditHasSignaling
  });

  // Sincronizar demanda base do Passo 2 sempre que a medição do Passo 1B for alterada
  useEffect(() => {
    if (effectiveExistingLoadKW > 0) {
      setDlmPeakDemandKW(effectiveExistingLoadKW);
    }
  }, [effectiveExistingLoadKW]);

  // Calibrar perfil e horários de funcionamento padrão com base no modo da aplicação
  useEffect(() => {
    if (applicationMode === 'eletroposto_hub') {
      setDlmProfileType('edificio_comercial');
      setDlmChargeStartHour(8); // 08:00h comercial
      setDlmChargeDurationHours(highestChargerPowerKW >= 30 ? 2 : 8);
    } else if (applicationMode === 'condominio_frota') {
      setDlmProfileType('condominio_residencial');
      setDlmChargeStartHour(19); // 19:00h noturno
      setDlmChargeDurationHours(8);
    } else {
      setDlmProfileType('condominio_residencial');
      setDlmChargeStartHour(20); // 20:00h noturno
      setDlmChargeDurationHours(7);
    }
  }, [applicationMode, highestChargerPowerKW]);

  // Categoria Homologada Efetiva (Automática ou Personalizada pelo Usuário)
  const effectiveHomologatedCategory = (customHomologatedCategoryId && availableCategories[customHomologatedCategoryId])
    ? availableCategories[customHomologatedCategoryId]
    : utilityAnalysis.category;

  // ─── CAPACIDADE REAL DO PADRÃO BASEADA NA VISTORIA DE CAMPO ────────────────
  const fieldBreakerAmps = clientProjectData.fieldBreakerConfirmedA || (utilityAnalysis.currentCategory?.breakerCurrentA || 63);
  const fieldPhases = clientProjectData.fieldPhasesConfirmed || (utilityAnalysis.currentCategory?.phases === 3 ? '3F' : utilityAnalysis.currentCategory?.phases === 2 ? '2F' : '1F');
  
  // Limite em kW do padrão existente baseado na vistoria de campo ou categoria teórica
  const fieldCalculatedLimitKW = clientProjectData.fieldBreakerConfirmedA
    ? Number(
        (fieldPhases === '3F'
          ? (Math.sqrt(3) * (selectedUtility === 'CEMIG' ? 220 : 380) * fieldBreakerAmps * 0.95) / 1000
          : fieldPhases === '2F'
          ? (220 * fieldBreakerAmps * 0.95) / 1000
          : (220 * fieldBreakerAmps) / 1000
        ).toFixed(1)
      )
    : (utilityAnalysis.currentCategory?.maxLimitKW || 75);

  // Limites e Cenários de Simulação para o Passo 2
  const currentStandardLimitKW = fieldCalculatedLimitKW;
  const currentStandardDisplayName = clientProjectData.fieldBreakerConfirmedA
    ? `${clientProjectData.fieldPhasesConfirmed || '1F'} ${fieldBreakerAmps}A (Vistoria de Campo: ${fieldCalculatedLimitKW} kW)`
    : `${utilityAnalysis.currentCategory?.categoryName || currentStandardCategoryId} (${currentStandardLimitKW} kW)`;

  const homologatedStandardLimitKW = effectiveHomologatedCategory.maxLimitKW || 95;
  const effectiveDlmGridLimitKW = dlmSimulationScenario === 'current'
    ? currentStandardLimitKW
    : homologatedStandardLimitKW;

  // ─── MOTOR DLM E CURVA DE CARGA (Passo 2) ──────────────────────────────────
  const baseCurve = customCurvePoints || generateScaledHourlyCurve(
    dlmProfileType,
    dlmPeakDemandKW,
    dlmEnableSolarSurplus ? dlmSolarPeakKW : 0,
    dlmProfileType === 'custom_usuario' ? customHourlyFactors : undefined
  );

  const dlmResult: DLMSimulationResult = simulateDLM(baseCurve, {
    gridLimitKW: effectiveDlmGridLimitKW,
    safetyMarginPercent: 0.0, // Limite nominal pleno contratado da concessionária sem corte artificial
    voltage: primaryCharger.phases === 3 ? 380 : 220,
    phases: primaryCharger.phases as (1 | 3),
    chargerCount: totalChargersCount,
    chargerUnitPowerKW: Number((totalChargersInstalledKW / Math.max(1, totalChargersCount)).toFixed(1)),
    chargeStartHour: dlmChargeStartHour,
    chargeDurationHours: dlmChargeDurationHours,
    enableDLM: dlmEnableDLM,
    enableSolarSurplus: dlmEnableSolarSurplus,
    solarPeakKW: dlmSolarPeakKW,
    maxChargerCapKW: (dlmEnableDLM && isDlmLimitationAccepted && dlmLimitedChargerPowerKW !== null)
      ? dlmLimitedChargerPowerKW
      : undefined
  });

  // ─── MOTOR OFICIAL CEMIG ND-5.1 (Lista de Materiais Padronizada da Concessionária) ─
  const cemigPadraoResult = selectedUtility === 'CEMIG' ? (() => {
    try {
      const isF = effectiveHomologatedCategory.categoryId.startsWith('F');
      return dimensionarPadraoCemig({
        tipoPadrao: "TRIFASICO",
        categoriaDemanda: isF ? "ALTA_DEMANDA_TABELA_4" : "INDIVIDUAL_TABELA_2",
        disjuntorAmperes: effectiveHomologatedCategory.breakerCurrentA || 200,
        ladoRede: "MESMO_LADO",
        tipoEstrutura: "POSTE_CONCRETO",
        finalidade: "CARREGADOR_VE",
        potenciaCarregadorKW: highestChargerPowerKW,
        incluirMaoDeObra: true,
        incluirART: true,
        incluirVistoria: true
      });
    } catch (e) {
      console.warn("Aviso ao calcular materiais padrão CEMIG:", e);
      return null;
    }
  })() : null;

  // Potência total de cargas auxiliares do painel 220V
  const totalAuxiliaryPowerKW = Number((
    ((auxiliaryConfig.enableOutlets ? auxiliaryConfig.outletsCount * 100 : 0) +
     (auxiliaryConfig.enableLighting ? auxiliaryConfig.lightingPowerW : 0) +
     (auxiliaryConfig.enableCCTV ? auxiliaryConfig.cctvPowerW : 0)) / 1000 +
    (auxiliaryConfig.enableCustomerTap ? auxiliaryConfig.customerTapPowerKW : 0)
  ).toFixed(2));

  // Limite efetivo para verificação de queda do disjuntor geral:
  // Se já foi selecionado/dimensionado um padrão homologado (ex: F8 700A), o disjuntor geral considerado
  // para verificar se "vai cair" deve ser a capacidade do padrão homologado/aprovado.
  const effectiveBreakerCapacityKW = effectiveHomologatedCategory.maxLimitKW || currentStandardLimitKW;
  const effectiveBreakerAmpsForSizing = effectiveHomologatedCategory.breakerCurrentA || fieldBreakerAmps;

  // ─── MOTOR DE INFRAESTRUTURA ELETROTÉCNICA & QGBT (Passo 3) ───────────────
  const infrastructureSizing: ElectricalInfrastructureSizing = sizeElectricalInfrastructure({
    utility: selectedUtility,
    chargerPowerKW: highestChargerPowerKW,
    chargerVoltage: primaryCharger?.voltage || (highestChargerPowerKW >= 11 ? 380 : 220),
    chargerPhases: (primaryCharger?.phases || (highestChargerPowerKW >= 11 ? 3 : 1)) as (1 | 3),
    cableLengthMeters: circuitDistanceMeters,
    installationMethod,
    ambientTemperatureC: ambientTemp,
    existingPeakDemandKW: effectiveExistingLoadKW,
    gridStandardLimitKW: effectiveBreakerCapacityKW,
    currentStandardBreakerA: effectiveBreakerAmpsForSizing,
    hasSmartChargingDLM: dlmEnableDLM,
    isOutdoor,
    auxiliaryConfig,
    cemigStandardBOM: cemigPadraoResult?.itensSugeridos,
    gridSupplyVoltage: commercialHub.gridSupplyVoltage ?? (selectedUtility === 'CEMIG' ? 220 : 380),
    chargerModelName: primaryCharger.model || primaryCharger.name,
    chargerBrand: primaryCharger.brand || 'WEG',
    chargerCurrentInA: primaryCharger.currentInA
  });

  // ─── HANDLERS DE CONFIGURAÇÃO DE CARREGADORES (Passo 1A) ───────────────────
  const handleSelectIndividualPower = (kw: number, phases: 1 | 3, type: 'AC' | 'DC', name?: string) => {
    setConfiguredChargers([
      {
        id: 'ch-ind-1',
        name: name || `${kw} kW ${type === 'DC' ? 'DC Rápido' : 'Wallbox AC'}`,
        powerKW: kw,
        phases,
        voltage: kw >= 11 ? 380 : 220,
        type,
        quantity: 1,
        connector: type === 'DC' ? selectedVehicle.dcConnector : selectedVehicle.acConnector,
        targetVehicleId: selectedVehicle.id,
        targetVehicleName: `${selectedVehicle.brand} ${selectedVehicle.model}`
      }
    ]);
  };

  const handleApplyCondoPreset = (count: number, kw: number) => {
    setConfiguredChargers([
      {
        id: 'ch-cond-1',
        name: `Vagas Coletivas (${count}x ${kw} kW)`,
        powerKW: kw,
        phases: kw >= 11 ? 3 : 1,
        voltage: kw >= 11 ? 380 : 220,
        type: 'AC',
        quantity: count,
        connector: 'Tipo 2'
      }
    ]);
  };

  const handleApplyHubPreset = (dcCount: number, dcKW: number, acCount: number, acKW: number) => {
    const list: ConfiguredCharger[] = [];
    if (dcCount > 0) {
      list.push({
        id: 'ch-hub-dc',
        name: `Dispensadores Rápidos DC (${dcCount}x ${dcKW} kW)`,
        powerKW: dcKW,
        phases: 3,
        voltage: 380,
        type: 'DC',
        quantity: dcCount,
        connector: 'CCS2'
      });
    }
    if (acCount > 0) {
      list.push({
        id: 'ch-hub-ac',
        name: `Pontos de Conveniência AC (${acCount}x ${acKW} kW)`,
        powerKW: acKW,
        phases: acKW >= 11 ? 3 : 1,
        voltage: acKW >= 11 ? 380 : 220,
        type: 'AC',
        quantity: acCount,
        connector: 'Tipo 2'
      });
    }
    setConfiguredChargers(list);
  };

  const handleAddCustomCharger = () => {
    const newId = `ch-${Date.now()}`;
    setConfiguredChargers(prev => [
      ...prev,
      {
        id: newId,
        name: `Novo Ponto ${prev.length + 1}`,
        powerKW: 7.4,
        phases: 1,
        voltage: 220,
        type: 'AC',
        quantity: 1,
        connector: 'Tipo 2'
      }
    ]);
  };

  const handleRemoveCharger = (id: string) => {
    if (configuredChargers.length <= 1) {
      alert("A estação de recarga precisa ter no mínimo 1 carregador configurado.");
      return;
    }
    setConfiguredChargers(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCharger = (newCharger: ConfiguredCharger) => {
    setConfiguredChargers(prev => [...prev, newCharger]);
  };

  const handleClientProjectChange = (updated: Partial<ClientProjectData>) => {
    setClientProjectData(prev => ({ ...prev, ...updated }));
    if (updated.clientName) setClientName(updated.clientName);
    if (updated.projectName) setProjectName(updated.projectName);
    if (updated.utility) setSelectedUtility(updated.utility);
    if (updated.standardCategory) setCurrentStandardCategoryId(updated.standardCategory);
    if (updated.demandaEstimadaHistoricoKW && updated.demandaEstimadaHistoricoKW > 0) {
      setManualExistingLoadKW(updated.demandaEstimadaHistoricoKW);
      setLoadSourceMode('fatura');
    } else if (updated.consumoMedioKWh && updated.consumoMedioKWh > 0) {
      const kw = Number((updated.consumoMedioKWh / (720 * 0.30)).toFixed(1));
      setManualExistingLoadKW(kw);
      setLoadSourceMode('fatura');
    }
  };

  const handleFireSafetyChange = (updated: Partial<FireSafetyChecklist>) => {
    setFireSafety(prev => {
      const next = { ...prev, ...updated };
      if (updated.hasEmergencyButtonWithin5m !== undefined) setAuditHasEmergencyButton(updated.hasEmergencyButtonWithin5m);
      if (updated.hasMechanicalBollards !== undefined) setAuditHasBollards(updated.hasMechanicalBollards);
      if (updated.hasPhotoluminescentSignaling !== undefined) setAuditHasSignaling(updated.hasPhotoluminescentSignaling);
      return next;
    });
  };

  const handleStartNewProject = () => {
    setProjectName("Novo Dimensionamento");
    setClientName("Cliente Particular");
    setApplicationMode('individual');
    setConfiguredChargers([
      {
        id: 'ch-1',
        name: '7.4 kW Wallbox Monofásico AC',
        powerKW: 7.4,
        phases: 1,
        voltage: 220,
        type: 'AC',
        quantity: 1,
        connector: 'Tipo 2',
        targetVehicleId: BRAZIL_ELECTRIC_VEHICLES[0].id,
        targetVehicleName: `${BRAZIL_ELECTRIC_VEHICLES[0].brand} ${BRAZIL_ELECTRIC_VEHICLES[0].model}`
      }
    ]);
    setActiveTab('veiculos');
  };

  const handleLoadProjectIntoCoenergyGO = (p: any) => {
    setProjectName(p.projectName || 'Dimensionamento Carregado');
    setClientName(p.clientName || 'Cliente Particular');
    if (p.utility) setSelectedUtility(p.utility as UtilityId);
    
    // Restaurar Modo de Aplicação exato selecionado no projeto
    if (p.applicationMode) {
      setApplicationMode(p.applicationMode);
    } else if (p.clientProjectData?.applicationMode) {
      setApplicationMode(p.clientProjectData.applicationMode);
    } else if (p.isCollective) {
      setApplicationMode('condominio_frota');
    } else {
      setApplicationMode('individual');
    }
    if (p.existingLoadKW) {
      setLoadSourceMode('fatura');
      setManualExistingLoadKW(Number(p.existingLoadKW));
    }
    if (p.existingEntranceCategory && availableCategories[p.existingEntranceCategory]) {
      setCurrentStandardCategoryId(p.existingEntranceCategory);
    }
    if (p.entranceCategory && availableCategories[p.entranceCategory]) {
      setCustomHomologatedCategoryId(p.entranceCategory);
    }
    if (p.distance) {
      setCircuitDistanceMeters(Number(p.distance));
    }
    if (p.installationMethod) {
      setInstallationMethod(p.installationMethod as any);
    }
    if (p.demandControlEnabled !== undefined) {
      setDlmEnableDLM(Boolean(p.demandControlEnabled));
    }
    if (p.demandControlLimit) {
      setDlmPeakDemandKW(Number(p.demandControlLimit));
    }
    if (p.dlmProfileType) {
      setDlmProfileType(p.dlmProfileType);
    }
    if (p.dlmChargeStartHour !== undefined) {
      setDlmChargeStartHour(Number(p.dlmChargeStartHour));
    }
    if (p.dlmChargeDurationHours !== undefined) {
      setDlmChargeDurationHours(Number(p.dlmChargeDurationHours));
    }
    if (p.dlmSimulationScenario) {
      setDlmSimulationScenario(p.dlmSimulationScenario);
    }
    if (p.isOutdoor !== undefined) {
      setIsOutdoor(Boolean(p.isOutdoor));
    }
    if (p.customHourlyFactors && Array.isArray(p.customHourlyFactors)) {
      setCustomHourlyFactors(p.customHourlyFactors);
    }
    if (p.customProfileName) {
      setCustomProfileName(p.customProfileName);
    }
    if (p.commercialHub) {
      setCommercialHub(prev => ({ ...prev, ...p.commercialHub }));
    }

    // Se possui clientProjectData estruturado
    if (p.clientProjectData) {
      setClientProjectData(prev => ({ ...prev, ...p.clientProjectData }));
    }

    // Se possui lista completa de carregadores restaurada do snapshot
    if (Array.isArray(p.configuredChargers) && p.configuredChargers.length > 0) {
      setConfiguredChargers(p.configuredChargers);
    } else if (p.charger) {
      // Injetar carregador padrão do relacionamento 1:1 caso não tenha o snapshot
      const kw = Number(p.charger.power) || 7.4;
      const phases = (Number(p.charger.phases) || (kw >= 11 ? 3 : 1)) as (1 | 3);
      const isDC = p.charger.type === 'DC' || kw >= 30;
      setConfiguredChargers([{
        id: `ch-loaded-${p.id}`,
        name: p.charger.model || (isDC ? `${kw} kW Dispensador DC Rápido` : `${kw} kW Wallbox AC`),
        powerKW: kw,
        phases,
        voltage: Number(p.charger.voltage) || (phases === 3 ? 380 : 220),
        type: isDC ? 'DC' : 'AC',
        quantity: 1,
        connector: isDC ? 'CCS2' : 'Tipo 2'
      }]);
    }
    setActiveTab('veiculos');
  };

  const handleDeleteProject = (id: string, projectName: string) => {
    if (!window.confirm(`Deseja realmente remover o projeto "${projectName}" do sistema?`)) {
      return;
    }
    // Remover do localStorage
    try {
      const stored = localStorage.getItem('coenergygo_saved_projects');
      if (stored) {
        const list = JSON.parse(stored);
        const filtered = list.filter((x: any) => x.id !== id);
        localStorage.setItem('coenergygo_saved_projects', JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn("Aviso ao remover do localStorage:", e);
    }
    // Remover do estado local
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateCharger = (id: string, updates: Partial<ConfiguredCharger>) => {
    setConfiguredChargers(prev => prev.map(c => {
      if (c.id === id) {
        const merged = { ...c, ...updates };
        if (updates.powerKW !== undefined) {
          const kw = merged.powerKW;
          if (kw >= 11) {
            merged.phases = 3;
            merged.voltage = 380;
          } else {
            merged.phases = 1;
            merged.voltage = 220;
          }
          if (kw >= 30) {
            merged.type = 'DC';
            merged.connector = 'CCS2';
            merged.name = `${kw} kW Dispensador DC Rápido`;
          } else {
            merged.type = 'AC';
            merged.connector = 'Tipo 2';
            merged.name = kw <= 7.4 ? `${kw} kW Wallbox Monofásico AC` : `${kw} kW Estação Trifásica AC`;
          }
        }
        return merged;
      }
      return c;
    }));
  };

  const handleSyncToDLM = () => {
    setActiveTab('curva_dlm');
  };

  // ─── UPLOAD & PROCESSAMENTO MULTI-PLANILHAS (SmartMeter / Usina SmartMeter) ───
  const handleMultiFileUpload = async (files: FileList | File[]) => {
    try {
      setIsLoadingFile(true);
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      const newParsedEntries: { id: string; name: string; summary: PeriodMeasurementSummary; hourlyCurve: any[] }[] = [];

      for (const file of fileArr) {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        let summary: PeriodMeasurementSummary;
        let parsedResult: any;

        if (isExcel) {
          const buffer = await file.arrayBuffer();
          const res = parseUniversalLoadFile(buffer, file.name);
          summary = res.summary;
          parsedResult = res.parsedResult;
        } else {
          const text = await file.text();
          const res = parseUniversalLoadFile(text, file.name);
          summary = res.summary;
          parsedResult = res.parsedResult;
        }

        newParsedEntries.push({
          id: `${file.name}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          summary,
          hourlyCurve: parsedResult.hourlyCurve24h
        });
      }

      // Combina com as já anexadas (evitando duplicar mesmo nome se desejado)
      const updatedList = [...attachedSheetsList, ...newParsedEntries];
      setAttachedSheetsList(updatedList);

      // Compilar todos os resumos
      const allSummaries = updatedList.map(item => item.summary);
      const compilation = compileMultipleLoadSummaries(allSummaries);

      setSmartMeterSummary(compilation.consolidatedSummary);
      setDailyPeaksState(compilation.dailyPeaks);
      setDlmPeakDemandKW(compilation.globalMaxPowerKW);

      // Curva horária 24h: usa a da última ou a agregada consolidada
      const lastEntry = newParsedEntries[newParsedEntries.length - 1];
      if (lastEntry) {
        setCustomCurvePoints(lastEntry.hourlyCurve);
        setCustomCurveBackup(lastEntry.hourlyCurve);
      }

      setIsLoadingFile(false);
    } catch (err: any) {
      alert("Erro ao ler planilhas de medição: " + (err.message || "Formato inválido"));
      setIsLoadingFile(false);
    }
  };

  // Remover uma planilha individual da lista anexada e recalcular automaticamente
  const handleRemoveAttachedSheet = (sheetId: string) => {
    const updated = attachedSheetsList.filter(s => s.id !== sheetId);
    setAttachedSheetsList(updated);

    if (updated.length === 0) {
      // Nenhuma planilha restante
      setSmartMeterSummary(null);
      setDailyPeaksState([]);
      setCustomCurvePoints(null);
      setCustomCurveBackup(null);
      setDlmPeakDemandKW(effectiveExistingLoadKW);
    } else {
      const allSummaries = updated.map(item => item.summary);
      const compilation = compileMultipleLoadSummaries(allSummaries);
      setSmartMeterSummary(compilation.consolidatedSummary);
      setDailyPeaksState(compilation.dailyPeaks);
      setDlmPeakDemandKW(compilation.globalMaxPowerKW);
      setCustomCurvePoints(updated[updated.length - 1].hourlyCurve);
      setCustomCurveBackup(updated[updated.length - 1].hourlyCurve);
    }
  };

  // Limpar todas as planilhas e zerar os dados de medição
  const handleClearAllSheets = () => {
    setAttachedSheetsList([]);
    setSmartMeterSummary(null);
    setDailyPeaksState([]);
    setCustomCurvePoints(null);
    setCustomCurveBackup(null);
    setDlmPeakDemandKW(effectiveExistingLoadKW);
  };

  const getEstimatedUnitPrice = (item: any): number => {
    if (item.category === 'condutores') return (item.spec && item.spec.includes('10 mm²')) ? 14.5 : (item.spec && item.spec.includes('16 mm²')) ? 22.0 : 9.5;
    if (item.category === 'protecao') {
      if (item.description.includes('DR') || item.description.includes('Diferencial')) return 380.0;
      if (item.description.includes('DPS')) return 160.0;
      return 85.0;
    }
    if (item.category === 'quadro') return 240.0;
    if (item.category === 'infraestrutura') {
      if (item.id === 'BOM-TRAFO-01' || item.description.includes('Transformador')) {
        const kva = infrastructureSizing.transformerDetails?.nominalKVA || 30;
        return kva * 320; // R$ 320 por kVA para trafo/autotrafo elevador a seco
      }
      return 28.0;
    }
    if (item.category === 'seguranca') return 95.0;
    return 50.0;
  };

  const cemigBOMCost = (infrastructureSizing.cemigStandardBOM || []).reduce(
    (acc: number, it: any) => acc + (it.precoTotal || (it.quantidade * (it.precoUnitarioEstimado || 0))),
    0
  );

  const qgbtBOMCost = infrastructureSizing.billOfMaterials.reduce(
    (acc, it) => acc + it.quantity * getEstimatedUnitPrice(it),
    0
  );

  const totalEstimatedBOMCost = qgbtBOMCost + cemigBOMCost;

  const handleCopyExecutiveSummary = () => {
    const text = `*MEMORIAL EXECUTIVO DE RECARGA - COENERGYGO / CORDEIRO ENERGIA*
Data: ${new Date().toLocaleDateString('pt-BR')}
Modo de Aplicação: ${applicationMode === 'individual' ? 'Residencial Individual' : applicationMode === 'condominio_frota' ? 'Condomínio / Frota Coletiva' : 'Eletroposto Comercial (Hub DC/AC)'}
Cliente: ${clientProjectData.clientName || clientName}
Responsável Técnico: ${clientProjectData.technicalResponsible || 'Eng. Eletricista'} (${clientProjectData.creaCft || 'CREA-MG'})

0. VISTORIA TÉCNICA OBRIGATÓRIA DE CAMPO (PADRÃO EXISTENTE):
- Fases Confirmadas em Campo: ${clientProjectData.fieldPhasesConfirmed || 'Não inspecionado'}
- Disjuntor Geral Físico Instalado: ${fieldBreakerAmps}A
- Bitola dos Condutores de Entrada: ${clientProjectData.fieldCableGaugeMM2 ? `${clientProjectData.fieldCableGaugeMM2} mm²` : 'Não informada'}
- Capacidade Física Efetiva em Campo: ${fieldCalculatedLimitKW} kW
- Diagnóstico de Segurança de Campo: ${
    (clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA >= 63 && clientProjectData.fieldCableGaugeMM2 && clientProjectData.fieldCableGaugeMM2 <= 10)
      ? '🚨 RISCO CRÍTICO DE INCÊNDIO: Disjuntor de 63A em cabo de 10 mm². Risco severo de sobreaquecimento sob recarga veicular contínua (32A por 6 a 8h). Obrigatório reformar os condutores para 16 mm² conforme CEMIG ND-5.1 MAR/2026.'
      : (clientProjectData.fieldPhasesConfirmed === '1F' && clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA <= 40)
      ? '⚠️ PADRÃO MONOFÁSICO ANTIGO 40A CEMIG: Capacidade de 8.8 kW em 220V. Incompatível com carregador de 7.4 kW sem queda imediata do disjuntor. Exige aumento de carga para A1 (63A) ou B1 (63A).'
      : '✅ Padrão Inspecionado em Conformidade com a ND-5.1 MAR/2026 e NBR 5410.'
  }

1. CONFIGURAÇÃO DE RECARGA (Passo 1A):
- Total de Pontos: ${totalChargersCount} carregador(es)
- Potência Total Instalada: ${totalChargersInstalledKW} kW
- Potência Diversificada (Fsim ${utilityAnalysis.simultaneityFactorApplied}): ${utilityAnalysis.diversifiedChargersKW.toFixed(1)} kW
- Equipamentos:
${configuredChargers.map(c => `  * ${c.quantity}x ${c.name} (${c.powerKW} kW - ${c.type} ${c.phases}F)`).join('\n')}

2. CONCESSIONÁRIA & PADRÃO DE ENTRADA (Passo 1B):
- Concessionária: ${selectedUtility}
- Padrão Atual do Imóvel: ${currentStandardDisplayName}
- Demanda Total da Edificação: ${utilityAnalysis.totalInstallationLoadKW.toFixed(1)} kW (${utilityAnalysis.calculatedDemandKVA.toFixed(1)} kVA)
- Diagnóstico de Desarme: ${infrastructureSizing.breakerTripDiagnosis.willTripWithoutDLM ? `⚠️ O DISJUNTOR GERAL DE ${fieldBreakerAmps}A IRÁ CAIR sem DLM (Sobrecarga de ${infrastructureSizing.breakerTripDiagnosis.overloadAmountKW} kW / ${infrastructureSizing.breakerTripDiagnosis.overloadAmountA}A). Com DLM ativo: RISCO ZERO.` : `✅ O DISJUNTOR GERAL NÃO IRÁ CAIR (Folga de +${infrastructureSizing.gridHeadroomKW} kW).`}
- Parecer de Transformador: ${infrastructureSizing.transformerRecommendation.needed ? `Exige Trafo Particular de ${infrastructureSizing.transformerRecommendation.recommendedKVA} kVA (${infrastructureSizing.transformerRecommendation.supplyLevel === 'MT' ? 'Média Tensão ND-5.3' : 'Alta Demanda BT Tabela 4'})` : `Dispensado (Atendido em Baixa Tensão BT pela CEMIG ND-5.1)`}
- Padrão Homologado / Caixas: ${utilityAnalysis.category.caixaMedicao || utilityAnalysis.category.meterBoxType}${utilityAnalysis.category.caixaDisjuntor ? ` + Caixa Disjuntor ${utilityAnalysis.category.caixaDisjuntor}` : ''}${utilityAnalysis.category.tcRelacao ? ` (com 3 TCs ${utilityAnalysis.category.tcRelacao}A)` : ''}

3. PROTEÇÕES MANDATÓRIAS (Passo 1C - NBR 17019):
- Dispositivo DR: ${auditResult.residualProtection.name} (Tipo B / RDC-DD 6mA)
- DPS: ${auditResult.surgeProtection.name} (${auditResult.surgeProtection.rating})
- Condutor PE: Exclusivo interligado ao BEP
- Botoeira EPO e Bombeiros: ${auditHasEmergencyButton ? 'Conforme IT-41 / IT-30' : 'Pendente'}

4. GESTÃO DINÂMICA DLM (Passo 2):
- Limite da Rede Configurado: ${effectiveDlmGridLimitKW} kW
- Carga Existente Medida (Pico): ${effectiveExistingLoadKW.toFixed(1)} kW ${smartMeterSummary ? '(via SmartMeter)' : '(Manual)'}
- Economia Estimada em Obras: R$ ${dlmResult.capexSavingsEstimateBRL.toLocaleString('pt-BR')}

5. INFRAESTRUTURA ELETROTÉCNICA & QGBT (Passo 3):
- Disjuntor Geral QGBT: ${infrastructureSizing.qgbtMainBreakerA}A Tripolar (Demanda QGBT: ${infrastructureSizing.qgbtTotalInstalledKW} kW)
- Barramento 380V (Potência VE): ${infrastructureSizing.panelSpecification.busbar380VRatingA}A
- Barramento 220V (Auxiliares): ${infrastructureSizing.panelSpecification.busbar220VRatingA}A (${infrastructureSizing.auxiliaryCircuits.length} circuitos ativos)
- Condutor Alimentador Carregador: ${infrastructureSizing.cableGaugePhaseMM2} mm² Cobre (Queda: ${infrastructureSizing.calculatedVoltageDropPercent}% a ${circuitDistanceMeters}m)
- Quadro QGBT: ${infrastructureSizing.panelSpecification.dinModulesCount} módulos DIN (${infrastructureSizing.panelSpecification.ipRating})
- Orçamento Estimado QGBT Interno: R$ ${qgbtBOMCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Orçamento Estimado Padrão CEMIG: R$ ${cemigBOMCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Orçamento Geral Consolidado: R$ ${totalEstimatedBOMCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // ─── SALVAR PROJETO COMPLETO NO BANCO DE DADOS (Passo 1A + 1B + 1C + 2 + 3) ───
  const [savingProject, setSavingProject] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Snapshot completo com todos os parâmetros dos Passos 1A a 3
  const buildCurrentProjectSnapshot = (customId?: string) => {
    const resolvedProjectName = clientProjectData.projectName || projectName || "Novo Dimensionamento VE";
    const resolvedClientName = clientProjectData.clientName || clientName || "Cliente Particular";
    const projectId = customId || `proj-coenergygo-${Date.now()}`;

    return {
      id: projectId,
      projectName: resolvedProjectName,
      clientName: resolvedClientName,
      clientDocument: clientProjectData.installationNumber ? `Instalação CEMIG: ${clientProjectData.installationNumber}` : "",
      clientPhone: clientProjectData.clientPhone || "",
      clientEmail: clientProjectData.clientEmail || "",
      clientAddress: clientProjectData.address || "",
      utility: selectedUtility,
      entranceCategory: effectiveHomologatedCategory.categoryId,
      existingEntranceCategory: currentStandardCategoryId,
      existingEntranceBreaker: fieldBreakerAmps,
      existingEntranceCable: clientProjectData.fieldCableGaugeMM2 || 10,
      existingEntrancePhases: fieldPhases === '3F' ? 3 : fieldPhases === '2F' ? 2 : 1,
      existingLoadKW: effectiveExistingLoadKW,
      distance: circuitDistanceMeters,
      installationMethod: installationMethod,
      applicationMode: applicationMode,
      isCollective: applicationMode !== 'individual',
      isOutdoor: isOutdoor,
      demandControlEnabled: dlmEnableDLM,
      demandControlLimit: effectiveDlmGridLimitKW,
      dlmProfileType: dlmProfileType,
      dlmChargeStartHour: dlmChargeStartHour,
      dlmChargeDurationHours: dlmChargeDurationHours,
      dlmSimulationScenario: dlmSimulationScenario,
      customHourlyFactors: customHourlyFactors,
      customProfileName: customProfileName,
      hasEmergencyButton5m: auditHasEmergencyButton,
      requiresWarningSigns: auditHasSignaling,
      groundingType: "TN-S",
      cosPhi: 0.98,
      totalPowerKW: totalChargersInstalledKW,
      configuredChargers: configuredChargers,
      commercialHub: commercialHub,
      clientProjectData: {
        ...clientProjectData,
        projectName: resolvedProjectName,
        clientName: resolvedClientName,
        standardCategory: clientProjectData.standardCategory || currentStandardCategoryId,
        applicationMode: applicationMode
      },
      charger: {
        brand: primaryCharger.brand || "WEG",
        model: primaryCharger.model || primaryCharger.name,
        power: primaryCharger.powerKW,
        voltage: primaryCharger.voltage,
        phases: primaryCharger.phases,
        current: primaryCharger.currentInA || 32
      },
      createdAt: new Date().toISOString()
    };
  };

  // Auto-Save silencioso automático disparado ao mudar de passo
  const handleAutoSaveSnapshot = () => {
    try {
      const snapshot = buildCurrentProjectSnapshot('proj-auto-saved-current');
      const stored = localStorage.getItem('coenergygo_saved_projects');
      const list = stored ? JSON.parse(stored) : [];
      const updatedList = [snapshot, ...list.filter((x: any) => x.id !== snapshot.id)];
      localStorage.setItem('coenergygo_saved_projects', JSON.stringify(updatedList));
      localStorage.setItem('coenergygo_active_draft', JSON.stringify(snapshot));
    } catch (e) {
      console.warn("Auto-save snapshot aviso:", e);
    }
  };

  // Navegação protegida entre abas com auto-save automático
  const handleTabChange = (nextTab: 'projetos' | 'veiculos' | 'concessionarias' | 'nbr17019' | 'curva_dlm' | 'infraestrutura' | 'resultado') => {
    handleAutoSaveSnapshot();
    setActiveTab(nextTab);
  };

  const handleSaveCurrentProject = async () => {
    try {
      setSavingProject(true);
      setSaveSuccessMessage(null);

      const resolvedProjectName = clientProjectData.projectName || projectName || "Novo Dimensionamento VE";
      const resolvedClientName = clientProjectData.clientName || clientName || "Cliente Particular";
      const fullProjectSnapshot = buildCurrentProjectSnapshot();

      // 1. Persistência imediata e segura em localStorage
      try {
        const stored = localStorage.getItem('coenergygo_saved_projects');
        const list = stored ? JSON.parse(stored) : [];
        const updatedList = [fullProjectSnapshot, ...list.filter((x: any) => x.id !== fullProjectSnapshot.id)];
        localStorage.setItem('coenergygo_saved_projects', JSON.stringify(updatedList));
      } catch (e) {
        console.warn("Aviso ao salvar snapshot no localStorage:", e);
      }

      // Atualiza o estado da UI imediatamente para garantir feedback ao usuário
      setProjects(prev => [fullProjectSnapshot, ...prev.filter(p => p.id !== fullProjectSnapshot.id)]);

      // 2. Persistência remota na API /api/ev/sizing
      const payload = {
        projectName: resolvedProjectName,
        clientName: resolvedClientName,
        clientDocument: clientProjectData.installationNumber ? `Instalação CEMIG: ${clientProjectData.installationNumber}` : "",
        clientPhone: clientProjectData.clientPhone || "",
        clientEmail: clientProjectData.clientEmail || "",
        clientAddress: clientProjectData.address || "",
        projectDescription: `Dimensionamento CoenergyGO. Fases: ${fieldPhases}, Disjuntor Campo: ${fieldBreakerAmps}A, Cabos: ${clientProjectData.fieldCableGaugeMM2 || 10} mm², Padrão Homologado CEMIG: ${effectiveHomologatedCategory.categoryId}. Carregadores: ${configuredChargers.map(c => `${c.quantity}x ${c.name} (${c.powerKW}kW)`).join(', ')}.`,
        utility: selectedUtility,
        entranceCategory: effectiveHomologatedCategory.categoryId,
        existingEntranceCategory: currentStandardCategoryId,
        existingEntranceBreaker: fieldBreakerAmps,
        existingEntranceCable: clientProjectData.fieldCableGaugeMM2 || 10,
        existingEntrancePhases: fieldPhases === '3F' ? 3 : fieldPhases === '2F' ? 2 : 1,
        existingLoadKW: effectiveExistingLoadKW,
        distance: circuitDistanceMeters,
        installationMethod: installationMethod,
        chargerBrand: primaryCharger.brand || "WEG",
        chargerModel: primaryCharger.model || primaryCharger.name,
        chargerPowerKW: primaryCharger.powerKW,
        chargerVoltage: primaryCharger.voltage,
        chargerPhases: primaryCharger.phases,
        chargerCurrentA: primaryCharger.currentInA || (primaryCharger.powerKW * 1000 / (primaryCharger.phases === 3 ? Math.sqrt(3) * 380 * 0.95 : 220 * 0.95)),
        isCollective: applicationMode !== 'individual',
        demandControlEnabled: dlmEnableDLM,
        demandControlLimit: effectiveDlmGridLimitKW,
        hasEmergencyButton5m: auditHasEmergencyButton,
        requiresWarningSigns: auditHasSignaling,
        groundingType: "TN-S",
        cosPhi: 0.98
      };

      try {
        const res = await fetch("/api/ev/sizing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.project) {
            // Substitui temporário pelo retornado do banco
            const merged = { ...fullProjectSnapshot, ...data.project };
            setProjects(prev => [merged, ...prev.filter(p => p.id !== fullProjectSnapshot.id && p.id !== data.project.id)]);
            // Atualiza também o cache local com o ID do banco
            try {
              const stored = localStorage.getItem('coenergygo_saved_projects');
              const list = stored ? JSON.parse(stored) : [];
              const updatedList = [merged, ...list.filter((x: any) => x.id !== fullProjectSnapshot.id && x.id !== data.project.id)];
              localStorage.setItem('coenergygo_saved_projects', JSON.stringify(updatedList));
            } catch (err) {}
          }
        } else {
          console.warn("Aviso: Falha ao persistir no banco remoto, mas o projeto foi salvo localmente.");
        }
      } catch (netErr) {
        console.warn("Aviso de rede: Projeto salvo localmente com sucesso. Sincronização remota pendente:", netErr);
      }

      setSaveSuccessMessage(`Projeto "${resolvedProjectName}" salvo no Dossiê com sucesso!`);
      setTimeout(() => setSaveSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error("Erro ao salvar projeto:", err);
      alert("Erro ao salvar o projeto: " + err.message);
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-['Montserrat',sans-serif]">
      {/* ─── HEADER INSTITUCIONAL CORDEIRO ENERGIA & COENERGYGO ─── */}
      <div className="bg-[#0A192F] text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Glows sutis da paleta Cordeiro */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#E45318]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-48 -top-10 w-64 h-64 bg-[#00B356]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Barra Superior Institucional: Logo Cordeiro Energia & Links Oficiais */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <a 
                href="https://www.cordeiroenergia.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/95 hover:bg-white p-2.5 rounded-2xl shadow-sm transition-all hover:scale-105 inline-flex items-center justify-center border border-white/20"
                title="Visitar Cordeiro Energia"
              >
                <img 
                  src="/logo.png" 
                  alt="Cordeiro Energia" 
                  className="h-8 md:h-9 object-contain" 
                />
              </a>
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest block">
                  Cordeiro Energia • Engenharia & Eletromobilidade
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Soluções Integradas em Energia Solar & Infraestrutura de Recarga
                </span>
              </div>
            </div>

            {/* Links Digitais Oficiais */}
            <div className="flex items-center gap-2.5">
              <a
                href="https://www.cordeiroenergia.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 shadow-xs"
              >
                <Globe className="w-3.5 h-3.5 text-[#00B356]" />
                <span className="hidden md:inline">cordeiroenergia.com.br</span>
                <span className="md:hidden">Site</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <a
                href="https://www.instagram.com/cordeiroenergia"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-[#E45318]/20 to-[#E45318]/40 hover:from-[#E45318]/40 hover:to-[#E45318]/60 text-orange-200 border border-[#E45318]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-[#E45318]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
                <span>@cordeiroenergia</span>
                <ExternalLink className="w-3 h-3 text-orange-300" />
              </a>
            </div>
          </div>

          {/* Linha Principal: Título, Descrição e Botões de Ação */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-[#E45318] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                  CoenergyGO v2.0
                </span>
                <span className="bg-[#00B356]/20 text-[#00B356] border border-[#00B356]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" /> NBR 17019 & CEMIG ND-5.1 MAR/2026
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> CBMMG IT-30 / CBPMESP IT-41
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Coenergy<span className="text-[#E45318]">GO</span>
                <span className="text-sm font-semibold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-xl">
                  Mobilidade Elétrica Inteligente
                </span>
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
                Dimensionamento eletrotécnico de estações de recarga, compatibilidade veicular em tempo real,
                vistoria técnica de padrões de concessionárias e proteção dinâmica DLM contra desarmes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link 
                href="/engenharia/padrao-cemig"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-3 rounded-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold transition-all shadow-sm"
              >
                <Zap className="w-4 h-4 text-[#00B356]" />
                Padrão CEMIG & CAPEX
              </Link>
              <button
                onClick={handleStartNewProject}
                className="bg-gradient-to-r from-[#E45318] to-[#ff6b2b] text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all font-bold text-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Novo Dimensionamento
              </button>
            </div>
          </div>

          {/* SUB-NAV TABS (100% VISÍVEIS E RESPONSIVOS) */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => handleTabChange('projetos')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'projetos'
                  ? 'bg-white text-[#0A192F] shadow-sm font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('veiculos')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'veiculos'
                  ? 'bg-[#00B356] text-white shadow-sm ring-1 ring-emerald-400 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Passo 1A: Veículos & Eletroposto</span>
              <span className="bg-slate-900/60 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{totalChargersCount} pts</span>
            </button>

            <button
              onClick={() => handleTabChange('concessionarias')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'concessionarias'
                  ? 'bg-[#E45318] text-white shadow-sm ring-1 ring-orange-400 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Passo 1B: Concessionárias & Padrão</span>
              <span className="bg-slate-900/60 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{selectedUtility}</span>
            </button>

            <button
              onClick={() => handleTabChange('nbr17019')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'nbr17019'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Passo 1C: NBR 17019 & Bombeiros</span>
            </button>

            <button
              onClick={() => handleTabChange('curva_dlm')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'curva_dlm'
                  ? 'bg-[#0A192F] text-white shadow-sm ring-2 ring-[#00B356] font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Activity className="w-4 h-4 text-[#00B356]" />
              <span>Passo 2: Curva de Carga & DLM</span>
              {customCurvePoints && (
                <span className="bg-[#00B356] text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">CURVA OK</span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('infraestrutura')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'infraestrutura'
                  ? 'bg-[#E45318] text-white shadow-sm ring-1 ring-orange-300 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Cable className="w-4 h-4 text-orange-200" />
              <span>Passo 3: Infra & SmartMeter</span>
              {smartMeterSummary && (
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">XLSX OK</span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('resultado')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'resultado'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-600 text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Resultado & Dossiê</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER DE NOTIFICAÇÃO DE SUCESSO DE SALVAMENTO */}
      {saveSuccessMessage && (
        <div className="bg-emerald-50 border-2 border-[#00B356] text-emerald-950 px-5 py-4 rounded-2xl flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00B356] text-white flex items-center justify-center font-bold">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-900">{saveSuccessMessage}</p>
              <p className="text-xs text-emerald-700">O projeto foi gravado de forma persistente e está disponível no histórico do Dashboard.</p>
            </div>
          </div>
          <button 
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ─── TAB 1: PROJETOS & VISÃO GERAL ─── */}
      {activeTab === 'projetos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-[#0A192F] rounded-2xl flex items-center justify-center font-bold">
                <BatteryCharging className="w-6 h-6 text-[#E45318]" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{projects.length}</p>
                <p className="text-xs text-slate-400 font-semibold">Projetos no Sistema</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-[#00B356] rounded-2xl flex items-center justify-center font-bold">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{BRAZIL_ELECTRIC_VEHICLES.length}</p>
                <p className="text-xs text-slate-400 font-semibold">Modelos Homologados</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 text-[#E45318] rounded-2xl flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">4 Concessionárias</p>
                <p className="text-xs text-slate-400 font-semibold">CEMIG, CPFL, Energisa, Enel</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">100% NBR 17019</p>
                <p className="text-xs text-slate-400 font-semibold">DR Tipo B + EPO + DPS</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Projetos de Dimensionamento Recentes</h2>
              <p className="text-xs text-slate-500">Histórico de memórias de cálculo e laudos técnicos gerados</p>
            </div>
            <button 
              onClick={handleStartNewProject}
              className="text-[#E45318] text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Iniciar Novo Projeto CoenergyGO →
            </button>
          </div>

          {loadingProjects ? (
            <div className="flex justify-center p-12 bg-white rounded-3xl border border-slate-100">
              <Loader className="w-8 h-8 animate-spin text-[#E45318]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-3">
              <div className="w-16 h-16 bg-orange-50 text-[#E45318] rounded-full flex items-center justify-center mx-auto">
                <BatteryCharging className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Nenhum projeto de dimensionamento salvo ainda</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Inicie um novo dimensionamento para calcular lista de materiais, cabos, proteções da NBR 17019 e padrão da concessionária.
              </p>
              <button 
                onClick={handleStartNewProject}
                className="bg-[#0A192F] text-white px-6 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 hover:bg-slate-800 transition-all shadow cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#00B356]" />
                Iniciar Primeiro Projeto CoenergyGO
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div 
                  key={p.id} 
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#E45318]/40 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {p.utility || 'CEMIG'}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 mt-1.5">
                        {p.projectName || 'Dimensionamento VE'}
                      </h4>
                      <p className="text-xs text-slate-500">{p.clientName || 'Cliente Particular'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadProjectIntoCoenergyGO(p)}
                        className="bg-orange-50 hover:bg-[#E45318] text-[#E45318] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Carregar parâmetros deste projeto no fluxo CoenergyGO (Passos 1A a 3)"
                      >
                        <span>Abrir no CoenergyGO</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.id, p.projectName || 'Dimensionamento')}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Excluir projeto do histórico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#E45318]" />
                      {p.charger?.power ? `${p.charger.power} kW` : p.totalPowerKW ? `${p.totalPowerKW} kW` : p.calculatedCurrent ? `${((p.calculatedCurrent * 220) / 1000).toFixed(1)} kW` : '7.4 kW'} {p.isCollective ? '• Coletivo' : '• Individual'}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
                      </span>
                      <Link 
                        href={`/carregamento/${p.id}`}
                        className="text-[11px] text-slate-400 hover:text-slate-700 hover:underline"
                        title="Ver memorial técnico antigo salvo"
                      >
                        Memorial
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: PASSO 1A: CLIENTE, AMBIENTE & CARREGADORES HOMOLOGADOS ─── */}
      {activeTab === 'veiculos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. Identificação do Cliente, Responsável Técnico e Anexo Inteligente de Fatura */}
          <ClientProjectForm
            data={clientProjectData}
            onChange={handleClientProjectChange}
            availableCategories={Object.keys(availableCategories)}
            onApplyEstimatedLoadToStep1B={(kw) => {
              setManualExistingLoadKW(kw);
              setLoadSourceMode('fatura');
            }}
          />

          {/* 2. Cenário de Instalação, Normas de Bombeiros (IT-41/IT-30) e Dados Operacionais */}
          <InstallationEnvironmentSelector
            applicationMode={applicationMode}
            onApplicationModeChange={setApplicationMode}
            condoLocation={condoLocation}
            onCondoLocationChange={setCondoLocation}
            fireSafety={fireSafety}
            onFireSafetyChange={handleFireSafetyChange}
            commercialHub={commercialHub}
            onCommercialHubChange={(upd) => setCommercialHub(prev => ({ ...prev, ...upd }))}
            utility={selectedUtility}
            onApplyPreset={(presetType) => {
              if (presetType === 'condo') {
                handleApplyCondoPreset(4, 7.4);
                setApplicationMode('condominio_frota');
              } else {
                handleApplyHubPreset(1, 80, 1, 22);
                setApplicationMode('eletroposto_hub');
              }
            }}
          />

          {/* CENÁRIO 1: RESIDENCIAL / INDIVIDUAL */}
          {applicationMode === 'individual' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lado Esquerdo: Lista e Busca de Veículos */}
              <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Veículos do Brasil</h3>
                    <p className="text-xs text-slate-400">Banco de dados oficial de baterias e recarga</p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    {filteredVehicles.length} modelos
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Buscar modelo (ex: Dolphin, Seal, EX30, Ora 03...)"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E45318]"
                  />
                </div>

                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredVehicles.map((v) => {
                    const isSelected = selectedVehicle.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicle(v)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#00B356] bg-emerald-50/50 shadow-sm'
                            : 'border-slate-100 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{v.brand} {v.model}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {v.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{v.version}</p>
                          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 pt-0.5">
                            <span>Bat: <strong className="text-slate-700">{v.batteryUsableKWh} kWh</strong></span>
                            <span>AC: <strong className="text-slate-700">{v.onboardACKW} kW</strong> ({v.onboardPhases}F)</span>
                            <span>DC: <strong className="text-slate-700">{v.maxDCKW} kW</strong></span>
                          </div>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-[#00B356]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lado Direito: Simulador de Tempo e Gargalo de Bordo */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest block mb-1">
                        Veículo Selecionado
                      </span>
                      <h2 className="text-2xl font-black text-slate-800">
                        {selectedVehicle.brand} {selectedVehicle.model}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">{selectedVehicle.version}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-[#00B356]">{selectedVehicle.autonomyPBEVKm} km</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Autonomia PBEV (Inmetro)</p>
                    </div>
                  </div>

                  {/* Seleção Rápida de Carregador */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Potência da Estação de Recarga Selecionada
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { name: '3.7 kW (Portátil)', kw: 3.7, phases: 1, type: 'AC' },
                        { name: '7.4 kW (Wallbox Padrão)', kw: 7.4, phases: 1, type: 'AC' },
                        { name: '11 kW (Trifásico)', kw: 11.0, phases: 3, type: 'AC' },
                        { name: '22 kW (Trifásico Potente)', kw: 22.0, phases: 3, type: 'AC' },
                        { name: '30 kW (DC Rápido)', kw: 30.0, phases: 3, type: 'DC' },
                        { name: '60 kW (DC Rápido)', kw: 60.0, phases: 3, type: 'DC' },
                        { name: '120 kW (DC Ultrarrápido)', kw: 120.0, phases: 3, type: 'DC' },
                        { name: '180 kW (DC Hub)', kw: 180.0, phases: 3, type: 'DC' },
                      ].map((c) => {
                        const isSelected = primaryCharger.powerKW === c.kw && primaryCharger.type === c.type;
                        return (
                          <button
                            key={c.name}
                            onClick={() => handleSelectIndividualPower(c.kw, c.phases as (1 | 3), c.type as ('AC' | 'DC'), c.name)}
                            className={`p-2.5 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? 'border-[#E45318] bg-orange-50/50 shadow-sm'
                                : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                            }`}
                          >
                            <p className="text-xs font-bold text-slate-800">{c.kw} kW</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">{c.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alerta Inteligente de Gargalo de Bordo */}
                  {simulationResult?.isBottleneckedByCar && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900">Alerta Técnico de Limite de Bordo</h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          {simulationResult.bottleneckReason}
                        </p>
                        <p className="text-[11px] text-amber-700 mt-1 font-medium">
                          Potência efetiva calculada: <strong>{simulationResult.effectiveChargingPowerKW} kW</strong> (em vez dos {primaryCharger.powerKW} kW nominais do carregador).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resultados da Simulação */}
                  {simulationResult && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#0A192F] text-white p-5 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#00B356] tracking-wider block">
                          Carga do Dia a Dia (20% a 80%)
                        </span>
                        <p className="text-3xl font-black">{simulationResult.timeFormatted20to80}</p>
                        <p className="text-[11px] text-slate-400">
                          {simulationResult.energyDeliveredKWh20to80} kWh entregues
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                          Carga Completa (0% a 100%)
                        </span>
                        <p className="text-3xl font-black text-slate-800">{simulationResult.timeFormatted0to100}</p>
                        <p className="text-[11px] text-slate-400">
                          Com desaceleração térmica pós-80%
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#E45318] tracking-wider block">
                          Velocidade de Alcance
                        </span>
                        <p className="text-3xl font-black text-slate-800">+{simulationResult.kmAddedPerHour} km/h</p>
                        <p className="text-[11px] text-slate-400">
                          Km recuperados a cada hora plugado
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Especificações Construtivas do Carro */}
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                      Ficha Técnica de Homologação Veicular
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Conector AC</span>
                        <strong className="text-slate-800">{selectedVehicle.acConnector} (Tipo 2)</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Conector DC</span>
                        <strong className="text-slate-800">{selectedVehicle.dcConnector}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Consumo Médio</span>
                        <strong className="text-slate-800">{selectedVehicle.avgConsumptionKWhPer100Km} kWh/100km</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Bateria Total</span>
                        <strong className="text-slate-800">{selectedVehicle.batteryGrossKWh} kWh</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Catálogo Técnico Homologado WEG / BENY, Datasheet, Cadastro Manual & Importador IA */}
          <ChargerCatalogSelector
            chargers={configuredChargers}
            onAddCharger={handleAddCharger}
            onUpdateCharger={handleUpdateCharger}
            onRemoveCharger={handleRemoveCharger}
          />

          {/* 5. Barra de Navegação Inferior para o Passo 1B */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-500">
              <strong className="text-slate-700">Pronto para a análise regulatória?</strong> Todos os dados de carga configurados alimentam automaticamente o Passo 1B.
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('concessionarias')}
              className="w-full sm:w-auto bg-[#E45318] hover:bg-[#d04610] text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Avançar para Passo 1B: Análise de Padrão & Concessionária</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 3: PASSO 1B: CONCESSIONÁRIAS & COMPARADOR DE PADRÃO ─── */}
      {activeTab === 'concessionarias' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest block mb-1">
                  Passo 1B • Comparador Normativo Real
                </span>
                <h3 className="text-xl font-black text-slate-800">
                  Padrão Atual do Cliente vs Padrão Futuro Requerido
                </h3>
                <p className="text-xs text-slate-500">
                  Compara a capacidade do disjuntor e ramal existente com a carga somada da estação para evitar trocas desnecessárias de padrão.
                </p>
              </div>

              {/* Seletor de Concessionária */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'CEMIG', label: 'CEMIG (MG)' },
                  { id: 'CPFL', label: 'CPFL Energia' },
                  { id: 'ENERGISA', label: 'Energisa' },
                  { id: 'ENEL_SP', label: 'Enel SP' }
                ].map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUtility(u.id as any)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                      selectedUtility === u.id
                        ? 'bg-[#0A192F] text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CARD DE AUDITORIA: VISTORIA TÉCNICA OBRIGATÓRIA DE CAMPO */}
            <div className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
              clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA >= 63 && clientProjectData.fieldCableGaugeMM2 && clientProjectData.fieldCableGaugeMM2 <= 10
                ? 'bg-red-50/90 border-red-300 text-red-950'
                : clientProjectData.fieldPhasesConfirmed === '1F' && clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA <= 40
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA >= 63 && clientProjectData.fieldCableGaugeMM2 && clientProjectData.fieldCableGaugeMM2 <= 10
                      ? 'bg-red-600 text-white'
                      : clientProjectData.fieldPhasesConfirmed === '1F' && clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA <= 40
                      ? 'bg-amber-500 text-white'
                      : 'bg-[#00B356] text-white'
                  }`}>
                    {clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA >= 63 && clientProjectData.fieldCableGaugeMM2 && clientProjectData.fieldCableGaugeMM2 <= 10 ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : clientProjectData.fieldPhasesConfirmed === '1F' && clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA <= 40 ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Vistoria Técnica Obrigatória de Campo
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200">
                        ND-5.1 MAR/2026
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5">
                      Padrão Físico: {fieldPhases} • Disjuntor {fieldBreakerAmps}A • Cabos {clientProjectData.fieldCableGaugeMM2 || 10} mm² ({fieldCalculatedLimitKW} kW em 220V)
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('veiculos')}
                  className="text-[11px] font-bold text-[#E45318] hover:underline self-start sm:self-auto flex items-center gap-1 cursor-pointer"
                >
                  <span>Revisar Vistoria no Passo 1A</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Parecer Normativo da Vistoria */}
              {clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA >= 63 && clientProjectData.fieldCableGaugeMM2 && clientProjectData.fieldCableGaugeMM2 <= 10 ? (
                <div className="p-3 bg-red-100/80 rounded-xl border border-red-300 text-red-900 text-xs leading-relaxed space-y-1">
                  <strong className="block text-red-950 font-black">
                    🚨 RISCO CRÍTICO DE INCÊNDIO POR SOBREAQUECIMENTO:
                  </strong>
                  <p>
                    O imóvel possui disjuntor de <strong>{fieldBreakerAmps}A</strong> instalado em fiação de apenas <strong>{clientProjectData.fieldCableGaugeMM2} mm²</strong>.
                    Sob recarga veicular contínua de 7,4 kW (32A por 6 a 8 horas com fator de carga contínua Fs = 1.0 da NBR 17019), a corrente ultrapassa a ampacidade segura do cabo de 10 mm² sem que o disjuntor de 63A desarme.
                    <strong> É OBRIGATÓRIA a reforma completa do padrão</strong> com substituição dos cabos para 16 mm², nova caixa de medição e aterramento conforme a CEMIG ND-5.1 Tabela 1.
                  </p>
                </div>
              ) : clientProjectData.fieldPhasesConfirmed === '1F' && clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA <= 40 ? (
                <div className="p-3 bg-amber-100/80 rounded-xl border border-amber-300 text-amber-900 text-xs leading-relaxed space-y-1">
                  <strong className="block text-amber-950 font-black">
                    ⚠️ PADRÃO MONOFÁSICO ANTIGO CEMIG (40A / 10 mm²):
                  </strong>
                  <p>
                    Nas normas anteriores da CEMIG, o padrão monofásico era fornecido com disjuntor de 40A e cabo de 10 mm² (limite físico de ~8,8 kW).
                    Com um carregador de 7,4 kW (32A), restam apenas 1,4 kW para toda a residência, causando <strong>queda imediata do disjuntor geral</strong> em qualquer pico simultâneo.
                    Pela nova norma CEMIG ND-5.1 MAR/2026, é necessário solicitar <strong>Aumento de Padrão</strong> para a Categoria A1 (Monofásico 63A / 16 mm²), B1 (Bifásico 63A / 16 mm²) ou C1 (Trifásico 63A / 16 mm²).
                  </p>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs leading-relaxed flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00B356] shrink-0" />
                  <span>
                    <strong>Padrão Inspecionado em Conformidade:</strong> O conjunto disjuntor ({fieldBreakerAmps}A) e cabos ({clientProjectData.fieldCableGaugeMM2 || 16} mm²) está dimensionado e atende aos requisitos técnicos da CEMIG ND-5.1 MAR/2026.
                  </span>
                </div>
              )}
            </div>

            {/* Painel de Parâmetros com Entrada do Padrão Atual do Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-2xl text-xs border border-slate-100">
              {/* Dropdown do Padrão Atual do Imóvel */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Padrão de Entrada Atual do Imóvel ({selectedUtility})
                </label>
                <select
                  value={currentStandardCategoryId}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCurrentStandardCategoryId(newCat);
                    const spec = availableCategories[newCat];
                    if (spec) {
                      setClientProjectData(prev => ({
                        ...prev,
                        standardCategory: newCat,
                        standardBreakerA: spec.breakerCurrentA,
                        contractedDemandKW: spec.maxLimitKW
                      }));
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 shadow-sm focus:border-[#E45318] focus:outline-none"
                >
                  {Object.entries(availableCategories).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.categoryId} — {cat.maxLimitKW} kW ({cat.breakerCurrentA}A - {cat.phases}F)
                    </option>
                  ))}
                  <option value="MT_EXISTENTE">Subestação Particular MT Existente</option>
                </select>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Disjuntor geral e ramal já instalados no cliente
                </span>
              </div>

              {/* Carga Existente da Edificação (Módulo Multifonte) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Origem da Carga Existente ({effectiveExistingLoadKW} kW)
                  </label>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    {loadSourceMode === 'smartmeter' ? '📊 Memória / XLSX' : loadSourceMode === 'spot' ? '🔍 Medição Spot' : '📋 Fatura'}
                  </span>
                </div>

                {/* Sub-abas de seleção de origem */}
                <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                  <button
                    onClick={() => setLoadSourceMode('smartmeter')}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                      loadSourceMode === 'smartmeter'
                        ? 'bg-white text-[#0A192F] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3 h-3 text-[#00B356]" />
                    <span>Excel / Memória</span>
                  </button>
                  <button
                    onClick={() => setLoadSourceMode('spot')}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                      loadSourceMode === 'spot'
                        ? 'bg-white text-[#0A192F] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calculator className="w-3 h-3 text-[#E45318]" />
                    <span>Medição Spot</span>
                  </button>
                  <button
                    onClick={() => {
                      setLoadSourceMode('fatura');
                      const kwFatura = clientProjectData.demandaEstimadaHistoricoKW ||
                        (clientProjectData.consumoMedioKWh ? Number((clientProjectData.consumoMedioKWh / (720 * 0.30)).toFixed(1)) : 0);
                      if (kwFatura > 0) {
                        setManualExistingLoadKW(kwFatura);
                      }
                      if (clientProjectData.standardCategory && availableCategories[clientProjectData.standardCategory]) {
                        setCurrentStandardCategoryId(clientProjectData.standardCategory);
                      }
                    }}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                      loadSourceMode === 'fatura'
                        ? 'bg-white text-[#0A192F] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-blue-600" />
                    <span>Fatura</span>
                  </button>
                </div>

                {/* 1. Modo Memória de Massa / XLSX */}
                {loadSourceMode === 'smartmeter' && (
                  <div className="space-y-2">
                    {smartMeterSummary ? (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-emerald-950 flex items-center gap-1 truncate max-w-[200px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00B356] shrink-0" />
                            {smartMeterSummary.fileName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-xs font-black text-emerald-700">
                              {smartMeterSummary.maxPowerKW.toFixed(2)} kW
                            </strong>
                            <button
                              type="button"
                              onClick={handleClearAllSheets}
                              className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                              title="Remover planilha e limpar dados"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 flex justify-between">
                          <span>Pico: {smartMeterSummary.peakTimestamp || '08:30'}</span>
                          <span>{smartMeterSummary.totalReadings} leituras {dailyPeaksState.length > 1 ? `(${dailyPeaksState.length} dias)` : ''}</span>
                        </p>

                        {/* Botão para anexar mais planilhas ou substituir */}
                        <div className="pt-1 border-t border-emerald-200/60 flex justify-end">
                          <label className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer">
                            <Upload className="w-3 h-3 text-[#E45318]" />
                            <span>Anexar mais planilhas (.xlsx)</span>
                            <input
                              type="file"
                              multiple
                              accept=".xlsx,.xls,.csv,.txt"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleMultiFileUpload(e.target.files);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
                        <p className="text-[10px] text-slate-600 leading-tight">
                          Selecione uma ou mais planilhas (ex: <i>Usina SmartMeter (01-10 a 06-10)</i>) para extrair o pico de cada dia:
                        </p>
                        <label className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs py-2 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4 text-[#E45318]" />
                          <span>Selecionar Planilha(s) SmartMeter</span>
                          <input
                            type="file"
                            multiple
                            accept=".xlsx,.xls,.csv,.txt"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleMultiFileUpload(e.target.files);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Modo Medição Spot (Calculadora) */}
                {loadSourceMode === 'spot' && (
                  <div className="p-2.5 bg-orange-50/50 border border-orange-200 rounded-xl space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block">Tensão (V)</label>
                        <select
                          value={spotVoltage}
                          onChange={(e) => setSpotVoltage(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 font-bold text-slate-800 text-[11px]"
                        >
                          <option value="220">220V</option>
                          <option value="380">380V</option>
                          <option value="127">127V</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block">Fases</label>
                        <select
                          value={spotPhases}
                          onChange={(e) => setSpotPhases(Number(e.target.value) as (1 | 3))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 font-bold text-slate-800 text-[11px]"
                        >
                          <option value="3">Trifásico (3F)</option>
                          <option value="1">Monofásico (1F)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block">Corrente Medida (A)</label>
                        <input
                          type="number"
                          value={spotCurrentA}
                          onChange={(e) => setSpotCurrentA(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 font-bold text-slate-800 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block">Margem Segurança</label>
                        <select
                          value={spotSafetyMargin}
                          onChange={(e) => setSpotSafetyMargin(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 font-bold text-slate-800 text-[11px]"
                        >
                          <option value="1.0">0%</option>
                          <option value="1.15">+15% (Recomendado)</option>
                          <option value="1.25">+25%</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-orange-200 text-orange-950 font-bold text-[10px]">
                      <span>Carga Calculada:</span>
                      <strong className="text-xs text-[#E45318]">{calculatedSpotKW} kW</strong>
                    </div>
                  </div>
                )}

                {/* 3. Modo Fatura / Histórico */}
                {loadSourceMode === 'fatura' && (
                  <div className="space-y-2">
                    {clientProjectData.utilityBillFileName || (clientProjectData.consumoMedioKWh && clientProjectData.consumoMedioKWh > 0) ? (
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-blue-950 flex items-center gap-1 truncate max-w-[200px]">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {clientProjectData.utilityBillFileName || "Fatura Concessionária"}
                          </span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-md">
                            {clientProjectData.utility || 'CEMIG'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 flex flex-wrap gap-x-2 gap-y-0.5">
                          {clientProjectData.consumoMedioKWh && (
                            <span>Consumo Médio: <strong>{clientProjectData.consumoMedioKWh} kWh/mês</strong></span>
                          )}
                          {clientProjectData.consumoMaximoKWh && (
                            <span>• Pico: <strong>{clientProjectData.consumoMaximoKWh} kWh</strong></span>
                          )}
                          {clientProjectData.saldoGeracaoKWh && (
                            <span>• Saldo GD: <strong>{clientProjectData.saldoGeracaoKWh} kWh</strong></span>
                          )}
                        </div>
                        <p className="text-[9px] text-blue-700/80 italic">
                          Demanda de pico estimada por FC = 0.30 (ajustável no campo abaixo se desejar):
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Insira a carga existente da fatura ou anexe a conta no Passo 1A:
                      </p>
                    )}
                    <div className="relative">
                      <input
                        type="number"
                        value={manualExistingLoadKW}
                        onChange={(e) => setManualExistingLoadKW(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 shadow-sm focus:border-[#E45318] focus:outline-none"
                        placeholder="Ex: 5"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">kW</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo da Estação do Passo 1A */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">
                    Carregadores Configurados (Passo 1A)
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {totalChargersCount} ponto(s) | {totalChargersInstalledKW} kW
                  </p>
                  <p className="text-[10px] text-[#00B356] font-bold">
                    Carga Diversificada: {utilityAnalysis.diversifiedChargersKW.toFixed(1)} kW (Fsim: {(utilityAnalysis.simultaneityFactorApplied * 100).toFixed(0)}%)
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange('veiculos')}
                  className="text-[10px] font-bold text-[#E45318] hover:underline self-start mt-2"
                >
                  Alterar equipamentos no Passo 1A →
                </button>
              </div>
            </div>

            {/* BANNER DE INTEGRAÇÃO COM A CURVA DE CARGA (PASSO 2) */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00B356] flex-shrink-0" />
                <span>
                  <strong>Integração com a Curva de Carga:</strong> A carga existente adotada (<strong>{effectiveExistingLoadKW} kW</strong>) alimenta tanto a verificação do padrão da concessionária abaixo quanto a simulação horária no <strong>Passo 2 (Curva de Carga & DLM)</strong>.
                  {smartMeterSummary ? ` (Medição ativa: ${smartMeterSummary.fileName} • Pico 6,44 kW)` : ' (Você também pode carregar memória de massa diretamente aqui ou no Passo 2)'}
                </span>
              </div>
              <button
                onClick={() => handleTabChange('curva_dlm')}
                className="bg-[#00B356] hover:bg-emerald-600 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl whitespace-nowrap shadow-sm self-start sm:self-auto flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Ver Curva 24h (Passo 2) →
              </button>
            </div>

            {/* CARD COMPARATIVO REAL: PADRÃO ATUAL VS FUTURO REQUERIDO */}
            {/* CARD COMPARATIVO REAL: PADRÃO ATUAL VS FUTURO REQUERIDO */}
            {(() => {
              const nominalSumKW = Number((totalChargersInstalledKW + effectiveExistingLoadKW).toFixed(1));
              const isOverBT = nominalSumKW > 75;
              const isAdequateWithDLMOnly = utilityAnalysis.isExistingStandardAdequate && isOverBT;
              const isFullyAdequate = utilityAnalysis.isExistingStandardAdequate && !isOverBT;

              return (
                <div className={`p-6 rounded-3xl border transition-all ${
                  isFullyAdequate
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : isAdequateWithDLMOnly
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : 'bg-red-50/90 border-red-300 text-red-950'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isFullyAdequate ? (
                          <span className="bg-[#00B356] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Padrão Atual Atende com Folga!
                          </span>
                        ) : isAdequateWithDLMOnly ? (
                          <span className="bg-[#E45318] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                            <AlertTriangle className="w-3.5 h-3.5" /> Atendimento em BT Condicionado a DLM Homologado
                          </span>
                        ) : (
                          <span className="bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                            <AlertCircle className="w-3.5 h-3.5" /> Aumento de Carga / Migração MT Necessária
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-600">
                          Norma: <strong>{utilityAnalysis.applicableStandards[0]}</strong>
                        </span>
                        {isOverBT && (
                          <span className="bg-slate-800 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                            Carga Instalada ({nominalSumKW} kW) &gt; Teto BT (75 kW)
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-black">
                        {isFullyAdequate
                          ? `Nenhuma Obra de Concessionária Necessária (Folga: +${utilityAnalysis.headroomInCurrentStandardKW.toFixed(1)} kW livres)`
                          : isAdequateWithDLMOnly
                          ? `Carga Bruta (${nominalSumKW} kW) Ultrapassa o Teto de BT (75 kW). Exige DLM Homologado.`
                          : `Demanda Requerida (${utilityAnalysis.totalInstallationLoadKW.toFixed(1)} kW) Excede o Limite do Padrão Atual (${utilityAnalysis.currentCategory?.maxLimitKW || 0} kW)`}
                      </h3>

                      <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
                        {isFullyAdequate
                          ? `A demanda total calculada (${utilityAnalysis.totalInstallationLoadKW.toFixed(1)} kW / ${utilityAnalysis.calculatedDemandKVA.toFixed(1)} kVA) está plenamente contida na capacidade do padrão atual ${utilityAnalysis.currentCategory?.categoryId || currentStandardCategoryId} (${utilityAnalysis.currentCategory?.maxLimitKW || 0} kW). Não há necessidade de troca de disjuntor ou ramal de entrada.`
                          : isAdequateWithDLMOnly
                          ? `A potência nominal instalada (${totalChargersInstalledKW} kW de carregadores + ${effectiveExistingLoadKW} kW do imóvel = ${nominalSumKW} kW) excede o limite máximo de fornecimento em Baixa Tensão da CEMIG (75 kW / Disjuntor 200A Tipo C6 - ND-5.1 § 4.1). Pela regra da concessionária, para permanecer no padrão C6 sem migrar para Média Tensão (ND-5.3), é OBRIGATÓRIO apresentar projeto de Gestão Dinâmica de Carga (DLM) com bloqueio físico de sobrecorrente em ${utilityAnalysis.currentCategory?.maxLimitKW || 75} kW. Sem aprovação formal de DLM na CEMIG, a ligação em Baixa Tensão será reprovada.`
                          : `A instalação da estação de recarga exigirá adequação de padrão junto à ${selectedUtility} para a categoria ${utilityAnalysis.category.categoryId} (${utilityAnalysis.category.maxLimitKW} ${utilityAnalysis.category.categoryId.startsWith('F') ? 'kVA' : 'kW'} com disjuntor de ${utilityAnalysis.category.breakerCurrentA}A) ou migração para Subestação Particular de Média Tensão (ND-5.3).`}
                      </p>
                    </div>

                    {/* Comparativo de Números com Todas as Grandezas - Claro e Transparente */}
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl min-w-[280px] space-y-2 text-xs shadow-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">1. Capacidade do Padrão Atual ({currentStandardCategoryId}):</span>
                        <strong className="text-slate-900 font-bold">{utilityAnalysis.currentCategory?.maxLimitKW || 0} kW ({utilityAnalysis.currentCategory?.breakerCurrentA || 0}A)</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">2. Demanda Base do Imóvel:</span>
                        <strong className="text-slate-900 font-bold">{effectiveExistingLoadKW.toFixed(1)} kW</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">3. Nova Carga dos Carregadores VE:</span>
                        <strong className="text-amber-600 font-bold">+{totalChargersInstalledKW.toFixed(1)} kW</strong>
                      </div>
                      {totalAuxiliaryPowerKW > 0 && (
                        <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                          <span className="font-medium">• Cargas Auxiliares (Ilum/CFTV/Tomadas):</span>
                          <strong className="font-bold">+{totalAuxiliaryPowerKW.toFixed(2)} kW</strong>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-slate-100 pb-1.5 bg-slate-50/80 p-1.5 rounded-lg">
                        <span className="text-slate-700 font-bold">Demanda Total Simultânea:</span>
                        <strong className="text-[#E45318] font-black">
                          {(utilityAnalysis.totalInstallationLoadKW + totalAuxiliaryPowerKW).toFixed(1)} kW
                        </strong>
                      </div>

                      {/* Saldo: Sobra ou Falta de Carga */}
                      {(() => {
                        const standardLimit = utilityAnalysis.currentCategory?.maxLimitKW || 0;
                        const totalLoad = Number((utilityAnalysis.totalInstallationLoadKW + totalAuxiliaryPowerKW).toFixed(1));
                        const diffKW = Number((standardLimit - totalLoad).toFixed(1));
                        const isSurplus = diffKW >= 0;
                        return (
                          <div className={`flex justify-between items-center p-2 rounded-xl border ${
                            isSurplus 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}>
                            <span className="font-bold flex items-center gap-1">
                              {isSurplus ? '✅ Sobra de Carga (Folga):' : '⚠️ Falta de Carga (Déficit):'}
                            </span>
                            <strong className={`text-sm font-black ${isSurplus ? 'text-[#00B356]' : 'text-rose-600'}`}>
                              {isSurplus ? `+${diffKW} kW` : `${diffKW} kW`}
                            </strong>
                          </div>
                        );
                      })()}

                      <div className="flex justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-500 font-medium">Padrão Homologado Requerido:</span>
                        <strong className="text-[#00B356] font-black">{utilityAnalysis.category.categoryId} ({utilityAnalysis.category.maxLimitKW} {utilityAnalysis.category.categoryId.startsWith('F') ? 'kVA' : 'kW'})</strong>
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 leading-tight italic bg-amber-50/60 p-2 rounded-lg border border-amber-200/50">
                        ℹ️ <strong>Nota de Dimensionamento:</strong> O dimensionamento global consolida a Demanda Base com os Carregadores VE e as Cargas Auxiliares do QGBT (iluminação, CFTV, tomadas de serviço e perdas de transformação). Caso haja déficit, no <strong>Passo 2</strong> é possível acionar o <strong>DLM (Gestão Dinâmica)</strong> para operar sem trocar o padrão, ou adequar o padrão no <strong>Passo 3</strong>.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Parecer Técnico e Ações Mandatórias da Concessionária */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-[#0A192F] text-white p-6 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-[#00B356] tracking-wider">
                        Especificação do Padrão Homologado ({effectiveHomologatedCategory.categoryId})
                      </span>
                      {customHomologatedCategoryId && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-[#E45318] border border-[#E45318]/40">
                          Ajustado Manualmente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {effectiveHomologatedCategory.categoryId.startsWith('F') && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-[#00B356] border border-[#00B356]/30">
                          CEMIG ND-5.1 Tab. 4
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {utilityAnalysis.supplyLevel === 'BT' ? 'Baixa Tensão (BT)' : 'Média Tensão (MT)'}
                      </span>
                    </div>
                  </div>

                  {/* Seletor Manual do Padrão Homologado (Recomendado vs Manual) */}
                  <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-[#00B356]" />
                        Padrão Alvo Homologado:
                      </label>
                      {customHomologatedCategoryId && (
                        <button
                          onClick={() => setCustomHomologatedCategoryId(null)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline self-start sm:self-auto cursor-pointer"
                        >
                          Restaurar Calculado ({utilityAnalysis.category.categoryId})
                        </button>
                      )}
                    </div>
                    <select
                      value={customHomologatedCategoryId || utilityAnalysis.category.categoryId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === utilityAnalysis.category.categoryId) {
                          setCustomHomologatedCategoryId(null);
                        } else {
                          setCustomHomologatedCategoryId(val);
                        }
                      }}
                      className="w-full bg-[#0A192F] border border-slate-600 text-white font-bold text-xs rounded-xl px-3 py-2 focus:border-[#00B356] focus:outline-none"
                    >
                      <optgroup label="Recomendação do Motor (Baseada na Carga)">
                        <option value={utilityAnalysis.category.categoryId}>
                          ⭐ {utilityAnalysis.category.categoryId} — {utilityAnalysis.category.categoryName} ({utilityAnalysis.category.breakerCurrentA}A) [Recomendado]
                        </option>
                      </optgroup>
                      <optgroup label="Alterar Manualmente (Categorias Disponíveis)">
                        {Object.entries(availableCategories).map(([key, cat]) => (
                          <option key={key} value={cat.categoryId}>
                            {cat.categoryId} — {cat.categoryName} ({cat.breakerCurrentA}A)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 font-medium">Categoria Normativa de Atendimento</p>
                    <h3 className="text-xl font-bold text-white mt-0.5">{effectiveHomologatedCategory.categoryName}</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Faixa de Demanda: <strong>até {effectiveHomologatedCategory.maxLimitKW} {effectiveHomologatedCategory.categoryId.startsWith('F') ? 'kVA' : 'kW'}</strong> | Disjuntor Geral: <strong className="text-[#00B356]">{effectiveHomologatedCategory.breakerCurrentA}A {effectiveHomologatedCategory.categoryId.startsWith('F') ? 'Tripolar Caixa Moldada' : 'Termomagnético'}</strong>
                    </p>
                  </div>

                  {/* Grid Eletrotécnico Completo */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
                    <div className="col-span-1">
                      <span className="text-slate-400 block text-[10px]">Caixa de Medição</span>
                      <strong className="text-emerald-400">
                        {effectiveHomologatedCategory.caixaMedicao || effectiveHomologatedCategory.meterBoxType}
                      </strong>
                    </div>

                    {effectiveHomologatedCategory.caixaDisjuntor && (
                      <div className="col-span-1">
                        <span className="text-slate-400 block text-[10px]">Caixa do Disjuntor</span>
                        <strong className="text-white">
                          Caixa {effectiveHomologatedCategory.caixaDisjuntor}
                        </strong>
                      </div>
                    )}

                    {effectiveHomologatedCategory.tcRelacao && (
                      <div className="col-span-1">
                        <span className="text-slate-400 block text-[10px]">Transformadores de Corrente</span>
                        <strong className="text-amber-400">
                          {effectiveHomologatedCategory.tcQuantidade || 3}x TC {effectiveHomologatedCategory.tcRelacao}A (FT {effectiveHomologatedCategory.tcFatorTermico || '2.0'})
                        </strong>
                        <span className="text-[9px] text-slate-400 block font-normal">Fornecimento gratuito CEMIG</span>
                      </div>
                    )}

                    <div className="col-span-1">
                      <span className="text-slate-400 block text-[10px]">Condutor Fase (Cobre)</span>
                      <strong>
                        {effectiveHomologatedCategory.caboFaseVias && effectiveHomologatedCategory.caboFaseVias > 1 ? `${effectiveHomologatedCategory.caboFaseVias}x ` : ''}
                        {effectiveHomologatedCategory.cableGaugePhaseMM2} mm² Cu
                      </strong>
                    </div>

                    {effectiveHomologatedCategory.caboFaseAlMM2 && (
                      <div className="col-span-1">
                        <span className="text-slate-400 block text-[10px]">Condutor Fase (Alumínio alt.)</span>
                        <strong className="text-slate-200">
                          {effectiveHomologatedCategory.caboFaseVias && effectiveHomologatedCategory.caboFaseVias > 1 ? `${effectiveHomologatedCategory.caboFaseVias}x ` : ''}
                          {effectiveHomologatedCategory.caboFaseAlMM2} mm² Al
                        </strong>
                      </div>
                    )}

                    <div className="col-span-1">
                      <span className="text-slate-400 block text-[10px]">Condutor de Terra (PE)</span>
                      <strong>
                        {effectiveHomologatedCategory.cableGaugeGroundMM2} mm² Cu Nu
                      </strong>
                      {effectiveHomologatedCategory.hastesAterramento && (
                        <span className="text-[9px] text-slate-400 block font-normal">
                          {effectiveHomologatedCategory.hastesAterramento} hastes 5/8" x 2,4m
                        </span>
                      )}
                    </div>

                    {effectiveHomologatedCategory.eletrodutoPol && (
                      <div className="col-span-1">
                        <span className="text-slate-400 block text-[10px]">Eletroduto de Entrada</span>
                        <strong className="text-white">
                          {effectiveHomologatedCategory.eletrodutoPol} ({effectiveHomologatedCategory.eletrodutoPVCMM} mm PVC / {effectiveHomologatedCategory.eletrodutoAcoMM} mm Aço)
                        </strong>
                      </div>
                    )}

                    {effectiveHomologatedCategory.posteHomologado && (
                      <div className="col-span-1 md:col-span-2">
                        <span className="text-slate-400 block text-[10px]">Poste Homologado</span>
                        <strong className="text-slate-300">
                          {effectiveHomologatedCategory.posteHomologado}
                        </strong>
                      </div>
                    )}
                  </div>

                  {utilityAnalysis.requiresTransformer && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-amber-400 flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4" /> Enquadramento Normativo da Demanda ({utilityAnalysis.calculatedDemandKVA} kVA)
                        </strong>
                        <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                          Trafo Sugerido: {utilityAnalysis.recommendedTransformerKVA} kVA
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Como a demanda calculada ({utilityAnalysis.calculatedDemandKVA} kVA / {utilityAnalysis.totalInstallationLoadKW} kW) supera 75 kW:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[#00B356] font-bold block mb-0.5">Opção 1: Baixa Tensão (ND-5.1 Tab. 4)</span>
                          <span className="text-slate-300">
                            Entrada direta em BT Categoria <strong>{effectiveHomologatedCategory.categoryId}</strong> (Disjuntor {effectiveHomologatedCategory.breakerCurrentA}A) se a rede de distribuição local da concessionária possuir capacidade de transformação.
                          </span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[#E45318] font-bold block mb-0.5">Opção 2: Subestação MT (ND-5.3)</span>
                          <span className="text-slate-300">
                            Subestação particular com transformador de <strong>{utilityAnalysis.recommendedTransformerKVA} kVA</strong>. A proteção geral e medição no secundário adotam o padrão <strong>{utilityAnalysis.category.categoryId}</strong>.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações Mandatórias da Concessionária */}
              <div className="lg:col-span-6 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Exigências Regulatórias & Comunicação Prévia ({selectedUtility})
                </h4>

                <div className="space-y-3">
                  {utilityAnalysis.actions.map((act, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-1 ${
                        act.type === 'obrigatoria'
                          ? 'bg-blue-50/50 border-blue-200 text-blue-950'
                          : 'bg-amber-50/50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#00B356]" />
                          {act.title}
                        </span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/80 border">
                          {act.type}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{act.description}</p>
                      <p className="text-[10px] text-slate-400 font-semibold pt-1">
                        Ref: {act.normReference}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: PASSO 1C: AUDITORIA NBR 17019 & BOMBEIROS ─── */}
      {activeTab === 'nbr17019' && auditResult && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest block mb-1">
                  Passo 1C • Conformidade Eletrotécnica & Bombeiros
                </span>
                <h3 className="text-xl font-black text-slate-800">
                  Auditoria Normativa NBR 17019 / NBR 5410 & AVCB
                </h3>
                <p className="text-xs text-slate-500">
                  Validação compulsória de DR Tipo B / RDC-DD 6mA, DPS Classe II, aterramento TN-S exclusivo e itens do Corpo de Bombeiros (IT-41/IT-30).
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 self-start md:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sincronizado com os {totalChargersCount} carregador(es) do Passo 1A
              </span>
            </div>

            {/* Checklist de Segurança do Corpo de Bombeiros e Acessibilidade */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs">
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">
                Checklist do Corpo de Bombeiros (IT-41 CBPMESP / IT-30 CBMMG)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <input
                    type="checkbox"
                    checked={auditHasEmergencyButton}
                    onChange={(e) => setAuditHasEmergencyButton(e.target.checked)}
                    className="rounded text-[#E45318] focus:ring-0"
                  />
                  <span>Botoeira de Emergência (EPO) a &le; 5m do ponto</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <input
                    type="checkbox"
                    checked={auditHasBollards}
                    onChange={(e) => setAuditHasBollards(e.target.checked)}
                    className="rounded text-[#E45318] focus:ring-0"
                  />
                  <span>Defensas mecânicas contra colisão frontal</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <input
                    type="checkbox"
                    checked={auditHasSignaling}
                    onChange={(e) => setAuditHasSignaling(e.target.checked)}
                    className="rounded text-[#E45318] focus:ring-0"
                  />
                  <span>Sinalização horizontal e fotoluminescente</span>
                </label>
              </div>
            </div>

            {/* Cards de Proteções Obrigatórias Calculadas (Conformidade NBR 17019) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase text-[#00B356] tracking-wider block">
                  Dispositivo Diferencial Residual (DR)
                </span>
                <h4 className="text-base font-bold text-white">{auditResult.residualProtection.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {auditResult.residualProtection.technicalJustification}
                </p>
                <span className="text-[10px] font-bold text-emerald-400 block pt-1">
                  Norma: {auditResult.residualProtection.normativeReference}
                </span>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase text-[#E45318] tracking-wider block">
                  Proteção Contra Surtos (DPS)
                </span>
                <h4 className="text-base font-bold text-white">{auditResult.surgeProtection.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {auditResult.surgeProtection.technicalJustification}
                </p>
                <span className="text-[10px] font-bold text-orange-400 block pt-1">
                  Especificação: {auditResult.surgeProtection.rating}
                </span>
              </div>
            </div>

            {/* Checklist de Conformidade */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Checklist de Inspeção e Conformidade
              </h4>

              <div className="space-y-2">
                {auditResult.checklistItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                      item.isCompliant
                        ? 'border-emerald-100 bg-emerald-50/40 text-emerald-950'
                        : 'border-red-200 bg-red-50/50 text-red-950'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.rule}</span>
                        <span className="text-[10px] text-slate-500 font-medium">({item.standard})</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{item.recommendation}</p>
                    </div>
                    {item.isCompliant ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Em Conformidade
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Não Conforme
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: PASSO 2: CURVA DE CARGA, FOLGA DE DEMANDA & DLM ─── */}
      {activeTab === 'curva_dlm' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Barra de Sincronismo e Fonte da Curva com Passo 1A e 1B */}
          <div className="bg-[#0A192F] text-white rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#00B356]" />
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Passo 2: Gestão Dinâmica de Carga (DLM) & Curva de Demanda 24h
                  {customCurvePoints ? (
                    <span className="bg-[#00B356] text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                      Planilha Real Ativa ({smartMeterSummary?.fileName || 'SmartMeter.xlsx'})
                    </span>
                  ) : (
                    <span className="bg-slate-700 text-slate-200 text-[9px] px-2 py-0.5 rounded-full font-bold">
                      Modelo Sintético 24h
                    </span>
                  )}
                </h4>
              </div>
              <p className="text-xs text-slate-300">
                {customCurvePoints
                  ? `Simulação horária alimentada diretamente pelos ${smartMeterSummary?.totalReadings || 136} pontos da memória de massa (Pico medido: ${smartMeterSummary?.maxPowerKW.toFixed(2) || '6.44'} kW).`
                  : `Simulação horária baseada no perfil ${dlmProfileType.replace('_', ' ')} com pico de ${dlmPeakDemandKW.toFixed(1)} kW (Passo 1B) e carregadores do Passo 1A (${totalChargersCount} pts • ${totalChargersInstalledKW} kW).`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {customCurveBackup && (
                <button
                  onClick={() => setCustomCurvePoints(prev => prev ? null : customCurveBackup)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  {customCurvePoints ? 'Alternar p/ Curva Sintética' : `Usar Medição Real (${smartMeterSummary?.fileName || 'SmartMeter.xlsx'})`}
                </button>
              )}

              <button
                onClick={() => setActiveTab('concessionarias')}
                className="bg-[#00B356] hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Ajustar Padrão no Passo 1B →</span>
              </button>
            </div>
          </div>

          <DLMControlPanel
            profileType={dlmProfileType}
            setProfileType={(val) => {
              setDlmProfileType(val);
              setCustomCurvePoints(null);
            }}
            peakDemandKW={dlmPeakDemandKW}
            setPeakDemandKW={(val) => {
              setDlmPeakDemandKW(val);
              setCustomCurvePoints(null);
            }}
            gridLimitKW={effectiveDlmGridLimitKW}
            setGridLimitKW={() => {}}
            configuredChargersSummary={{
              totalPoints: totalChargersCount,
              totalPowerKW: totalChargersInstalledKW,
              description: configuredChargers.map(c => `${c.quantity}x ${c.name}`).join(' + '),
              isDC: configuredChargers.some(c => c.type === 'DC' || c.powerKW >= 30)
            }}
            currentStandardLimitKW={currentStandardLimitKW}
            currentStandardName={currentStandardDisplayName}
            homologatedStandardLimitKW={homologatedStandardLimitKW}
            homologatedStandardName={effectiveHomologatedCategory.categoryName}
            simulationScenario={dlmSimulationScenario}
            setSimulationScenario={setDlmSimulationScenario}
            chargeStartHour={dlmChargeStartHour}
            setChargeStartHour={setDlmChargeStartHour}
            chargeDurationHours={dlmChargeDurationHours}
            setChargeDurationHours={setDlmChargeDurationHours}
            solarPeakKW={dlmSolarPeakKW}
            setSolarPeakKW={setDlmSolarPeakKW}
            enableDLM={dlmEnableDLM}
            setEnableDLM={setDlmEnableDLM}
            enableSolarSurplus={dlmEnableSolarSurplus}
            setEnableSolarSurplus={setDlmEnableSolarSurplus}
            isCustomCurveActive={Boolean(customCurvePoints)}
            smartMeterFileName={smartMeterSummary?.fileName}
            onToggleCustomCurve={() => {
              setCustomCurvePoints(prev => prev ? null : customCurveBackup);
            }}
            suggestedSafeChargerPowerKW={dlmResult.suggestedSafeChargerPowerKW}
            isLimitationAccepted={isDlmLimitationAccepted}
            limitedChargerPowerKW={dlmLimitedChargerPowerKW ?? dlmResult.suggestedSafeChargerPowerKW}
            onToggleAcceptLimitation={(accept, pKW) => {
              setIsDlmLimitationAccepted(accept);
              if (accept && pKW) {
                setDlmLimitedChargerPowerKW(pKW);
              } else if (!accept) {
                setDlmLimitedChargerPowerKW(null);
              }
            }}
            onUpdateLimitedChargerPowerKW={(pKW) => {
              setDlmLimitedChargerPowerKW(pKW);
              setIsDlmLimitationAccepted(true);
            }}
            onSelectRecommendedCharger={(recommended) => {
              // Substitui o carregador ativo de 80 kW pelo modelo ideal recomendado (ex: 60 kW)
              setConfiguredChargers([
                {
                  id: `ch-rec-${recommended.id}`,
                  name: `${recommended.brand} ${recommended.model}`,
                  powerKW: recommended.powerKW,
                  phases: recommended.phases as (1 | 3),
                  voltage: recommended.voltageV,
                  type: recommended.powerKW >= 30 ? 'DC' : 'AC',
                  quantity: 1,
                  connector: recommended.connectorType,
                  targetVehicleId: selectedVehicle?.id || 'ev-generic',
                  targetVehicleName: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Veículo Elétrico'
                }
              ]);
              setDlmLimitedChargerPowerKW(recommended.powerKW);
              setIsDlmLimitationAccepted(true);
            }}
            customHourlyFactors={customHourlyFactors}
            onUpdateCustomHourlyFactors={setCustomHourlyFactors}
            customProfileName={customProfileName}
            onUpdateCustomProfileName={setCustomProfileName}
          />

          <LoadCurveChart
            data={dlmResult.hourlyPoints}
            gridLimitKW={dlmResult.gridEffectiveLimitKW}
            enableDLM={dlmEnableDLM}
            enableSolar={dlmEnableSolarSurplus}
          />

          <LoadFeasibilityReport simulation={dlmResult} />
        </div>
      )}

      {/* ─── TAB 6: PASSO 3: INFRAESTRUTURA ELETROTÉCNICA & SMARTMETER ─── */}
      {activeTab === 'infraestrutura' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Topologia Reativa em Cadeia com Blocos Clicáveis NBR 5410 & NBR 17019 */}
          <EVTopologyChainViewer
            externalClientBaseLoadKW={effectiveExistingLoadKW}
            externalStandardCategory={effectiveHomologatedCategory.categoryId || currentStandardCategoryId}
            externalStandardBreakerA={effectiveHomologatedCategory.breakerCurrentA || fieldBreakerAmps}
            externalGridSupplyVoltage={commercialHub.gridSupplyVoltage ?? (selectedUtility === 'CEMIG' ? 220 : 380)}
            externalChargers={configuredChargers.map(c => ({
              id: c.id,
              name: c.name,
              brand: c.brand || 'WEG',
              model: c.model || c.name,
              powerKW: c.powerKW,
              phases: c.phases as (1 | 2 | 3),
              voltageV: c.voltage,
              currentInA: c.currentInA,
              connector: c.connector,
              type: c.type
            }))}
            onUpdateStandard={(catId, breakerA) => {
              setCurrentStandardCategoryId(catId);
              setCustomHomologatedCategoryId(catId);
              if (breakerA) {
                setClientProjectData(prev => ({
                  ...prev,
                  standardCategory: catId,
                  fieldBreakerConfirmedA: breakerA
                }));
              }
            }}
            externalHasSmartChargingDLM={dlmEnableDLM}
            externalMaxChargerCapKW={(dlmEnableDLM && isDlmLimitationAccepted && dlmLimitedChargerPowerKW !== null)
              ? dlmLimitedChargerPowerKW
              : undefined}
            onUpdateChargerPower={(id, newPowerKW) => {
              handleUpdateCharger(id, { powerKW: newPowerKW });
            }}
            cemigStandardBOM={cemigPadraoResult?.itensSugeridos}
          />

          {/* Painel de Identificação e Integração dos Parâmetros */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#E45318] tracking-wider bg-orange-50 px-2.5 py-0.5 rounded-full">
                    Passo 3: Engenharia Eletrotécnica Interna & BOM
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">NBR 5410 & NBR 17019</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mt-1">
                  Dimensionamento do Circuito Alimentador & Lista de Materiais
                </h3>
                <p className="text-xs text-slate-500">
                  Cálculo normativo da bitola de cobre (critério de capacidade de corrente $I_z$ e queda de tensão &le; 2,0%), especificação do quadro QDC-VE e quantitativos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#00B356]" />
                  Cargas Herdados: <strong>{totalChargersInstalledKW} kW ({totalChargersCount} VEs)</strong> + <strong>{effectiveExistingLoadKW} kW Imóvel</strong>
                  {totalAuxiliaryPowerKW > 0 && (
                    <span> + <strong className="text-slate-600">{totalAuxiliaryPowerKW} kW Auxiliares</strong></span>
                  )}
                  <span className="ml-1 text-[11px] text-[#E45318] font-mono">
                    = {(totalChargersInstalledKW + effectiveExistingLoadKW + totalAuxiliaryPowerKW).toFixed(1)} kW Total
                  </span>
                </span>
              </div>
            </div>

            {/* Informações Complementares da Instalação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Método de Instalação dos Eletrodutos</label>
                <select
                  value={installationMethod}
                  onChange={(e) => setInstallationMethod(e.target.value as any)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 mt-1"
                >
                  <option value="B1">B1 - Eletroduto em alvenaria</option>
                  <option value="B2">B2 - Eletroduto aparente</option>
                  <option value="C">C - Eletrocalha / perfilado</option>
                  <option value="D">D - Eletroduto subterrâneo</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOutdoor}
                    onChange={(e) => setIsOutdoor(e.target.checked)}
                    className="rounded text-[#E45318]"
                  />
                  Instalação ao Tempo (Grau de Proteção IP65 / NBR 17019)
                </label>
              </div>
            </div>
          </div>

          {/* Visualização dos Dados Medidos Importados ou Origem de Carga */}
          {smartMeterSummary ? (
            <ImportedDataViewer
              summary={smartMeterSummary}
              chargerPowerKW={highestChargerPowerKW}
              gridLimitKW={effectiveHomologatedCategory.maxLimitKW || 75}
              dailyPeaks={dailyPeaksState}
              attachedFiles={attachedSheetsList.map(s => ({
                id: s.id,
                name: s.name,
                maxKW: s.summary.maxPowerKW,
                readings: s.summary.totalReadings
              }))}
              onRemoveFile={handleRemoveAttachedSheet}
              onClear={handleClearAllSheets}
            />
          ) : loadSourceMode === 'spot' ? (
            <div className="bg-orange-50/80 border border-orange-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#E45318]" />
                  <h4 className="text-sm font-bold text-orange-950">
                    Carga Existente Definida via Medição Spot de Campo ({effectiveExistingLoadKW.toFixed(1)} kW)
                  </h4>
                </div>
                <p className="text-xs text-orange-900 leading-relaxed">
                  Cálculo realizado no Passo 1B com base em medição de campo de {spotCurrentA}A ({spotPhases}F {spotVoltage}V). O dimensionamento do alimentador e proteções abaixo já considera essa carga de forma integrada.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTabChange('concessionarias')}
                  className="bg-white hover:bg-orange-100 border border-orange-300 text-orange-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer"
                >
                  Ajustar Medição Spot (Passo 1B)
                </button>
                <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow whitespace-nowrap cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Anexar Planilha(s) SmartMeter</span>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleMultiFileUpload(e.target.files);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : loadSourceMode === 'fatura' ? (
            <div className="bg-blue-50/80 border border-blue-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h4 className="text-sm font-bold text-blue-950">
                    Carga Existente Definida via Fatura de Energia ({effectiveExistingLoadKW.toFixed(1)} kW)
                  </h4>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed">
                  Demanda faturada informada no Passo 1B. O dimensionamento do alimentador e proteções abaixo já considera essa carga de forma integrada.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('concessionarias')}
                  className="bg-white hover:bg-blue-100 border border-blue-300 text-blue-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer"
                >
                  Ajustar Fatura (Passo 1B)
                </button>
                <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow whitespace-nowrap cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Anexar Planilha(s) SmartMeter</span>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleMultiFileUpload(e.target.files);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h4 className="text-sm font-bold text-amber-950">Nenhuma planilha SmartMeter importada no momento</h4>
                </div>
                <p className="text-xs text-amber-800">
                  Carregue uma ou mais planilhas de medição (ex: <i>Usina SmartMeter (29-09 a 06-10)</i>) para compilar os picos de cada dia e dimensionar o sistema.
                </p>
              </div>
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow whitespace-nowrap cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Selecionar Planilha(s) SmartMeter</span>
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMultiFileUpload(e.target.files);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Painel de Infraestrutura Eletrotécnica e Lista de Materiais (BOM) */}
          <InfrastructurePanel
            sizing={infrastructureSizing}
            utility={selectedUtility}
            chargerPowerKW={highestChargerPowerKW}
            chargerVoltage={primaryCharger?.voltage || (highestChargerPowerKW >= 11 ? 380 : 220)}
            chargerPhases={(primaryCharger?.phases || (highestChargerPowerKW >= 11 ? 3 : 1)) as (1 | 3)}
            cableLengthMeters={circuitDistanceMeters}
            chargerName={primaryCharger.name}
            chargerBrand={primaryCharger.brand || 'WEG'}
            chargerModel={primaryCharger.model || primaryCharger.name}
            chargerCurrentInA={primaryCharger.currentInA}
            chargerCount={totalChargersCount}
            onUpdateAuxiliaryConfig={setAuxiliaryConfig}
            onSimulateChargerToggle={(voltage, powerKW, phases) => {
              handleSelectIndividualPower(powerKW, phases, 'AC', `${powerKW} kW (${voltage}V)`);
            }}
          />
        </div>
      )}

      {/* ─── TAB 7: RESULTADO CONSOLIDADO & DOSSIÊ EXECUTIVO DE IMPLANTAÇÃO ─── */}
      {activeTab === 'resultado' && (
        <div className="space-y-6">
          {/* Barra de Ações do Laudo */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Dossiê Executivo de Engenharia
                </span>
                <span className="text-slate-400 text-xs font-semibold">
                  CoenergyGO • Cordeiro Energia
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-800 mt-1">
                Memorial Técnico-Descritivo de Implantação
              </h2>
              <p className="text-xs text-slate-500">
                Consolidação completa: Veículos, Concessionária, NBR 17019, Curva DLM e Infraestrutura
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveCurrentProject}
                disabled={savingProject}
                className="bg-[#00B356] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Salva este dimensionamento completo no banco de dados com os dados do Passo 1A"
              >
                {savingProject ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{savingProject ? 'Salvando Projeto...' : 'Salvar Projeto CoenergyGO'}</span>
              </button>

              <button
                onClick={handleCopyExecutiveSummary}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                {isCopied ? 'Memorial Copiado!' : 'Copiar Memorial'}
              </button>

              <button
                onClick={() => window.print()}
                className="bg-[#0A192F] hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                Imprimir / Salvar PDF
              </button>
            </div>
          </div>

          {/* BANNER FLUTUANTE DE SUCESSO DE SALVAMENTO */}
          {saveSuccessMessage && (
            <div className="bg-emerald-500/10 border-2 border-[#00B356] p-4 rounded-2xl flex items-center justify-between gap-4 text-xs animate-in fade-in duration-300">
              <div className="flex items-center gap-3 text-emerald-950">
                <div className="w-9 h-9 rounded-xl bg-[#00B356] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block text-sm text-[#00B356] font-black">
                    {saveSuccessMessage}
                  </strong>
                  <span className="text-slate-600">
                    O dimensionamento com todos os dados do Passo 1A foi gravado no banco de dados e adicionado ao seu histórico.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('projetos');
                  setSaveSuccessMessage(null);
                }}
                className="bg-[#0A192F] hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all shadow-sm cursor-pointer"
              >
                Ver no Dashboard de Projetos →
              </button>
            </div>
          )}

          {/* Banner de Viabilidade Executiva */}
          <div className="bg-gradient-to-br from-[#0A192F] to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-[#00B356] text-white text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                    <CheckCircle2 className="w-4 h-4" />
                    Instalação Aprovada & Viável
                  </span>
                  <span className="text-slate-400 text-xs font-medium">
                    Laudo Nº COGO-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  Estação de Recarga {applicationMode === 'individual' ? `${selectedVehicle.brand} ${selectedVehicle.model}` : applicationMode === 'condominio_frota' ? `Condomínio Coletivo (${totalChargersCount} Vagas)` : `Eletroposto Comercial (${totalChargersInstalledKW} kW)`}
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  O dimensionamento atende integralmente à <strong>ABNT NBR 17019</strong>, <strong>ABNT NBR 5410</strong>, norma da concessionária <strong>{selectedUtility}</strong> e às exigências de segurança contra incêndio do Corpo de Bombeiros. A gestão dinâmica DLM assegura proteção contínua contra sobrecargas.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center min-w-[200px] space-y-1">
                <p className="text-[10px] uppercase font-bold text-[#00B356] tracking-wider">Custo Total de Infra (BOM)</p>
                <p className="text-2xl font-black text-white">
                  R$ {totalEstimatedBOMCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-400">
                  Economia DLM: R$ {dlmResult.capexSavingsEstimateBRL.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Grid dos 5 Pilares de Engenharia */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Pilar 1: Veículos e Configuração */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00B356] flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Passo 1A: Equipamentos</h4>
                    <p className="text-[10px] text-slate-400">Porte da Instalação</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {totalChargersCount} pts
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Modo:</span>
                  <strong className="text-slate-800">
                    {applicationMode === 'individual' ? 'Residencial Individual' : applicationMode === 'condominio_frota' ? 'Condomínio Multi-vagas' : 'Eletroposto Comercial'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Potência Total Instalada:</span>
                  <strong className="text-slate-800">{totalChargersInstalledKW} kW</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fator de Simultaneidade:</span>
                  <strong className="text-[#00B356]">{(utilityAnalysis.simultaneityFactorApplied * 100).toFixed(0)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carga Diversificada:</span>
                  <strong className="text-[#E45318]">{utilityAnalysis.diversifiedChargersKW.toFixed(1)} kW</strong>
                </div>
                {applicationMode === 'individual' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Veículo Alvo:</span>
                    <strong className="text-slate-800">{selectedVehicle.brand} {selectedVehicle.model}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Pilar 2: Concessionária & Padrão de Entrada */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E45318] flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Passo 1B: Concessionária & Vistoria</h4>
                    <p className="text-[10px] text-slate-400">{selectedUtility} (ND-5.1 MAR/2026)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {effectiveHomologatedCategory.categoryId}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Padrão Inspecionado:</span>
                  <strong className="text-slate-800">
                    {clientProjectData.fieldPhasesConfirmed || '1F'} {fieldBreakerAmps}A ({fieldCalculatedLimitKW} kW)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cabos de Entrada (Campo):</span>
                  <strong className={
                    clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA >= 63 && clientProjectData.fieldCableGaugeMM2 && clientProjectData.fieldCableGaugeMM2 <= 10
                      ? "text-red-600 font-black"
                      : "text-slate-800"
                  }>
                    {clientProjectData.fieldCableGaugeMM2 || 10} mm² {
                      clientProjectData.fieldBreakerConfirmedA && clientProjectData.fieldBreakerConfirmedA >= 63 && clientProjectData.fieldCableGaugeMM2 && clientProjectData.fieldCableGaugeMM2 <= 10
                        ? "⚠️ Risco de Incêndio!"
                        : ""
                    }
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Padrão Requerido:</span>
                  <strong className="text-slate-800">{effectiveHomologatedCategory.categoryId} ({effectiveHomologatedCategory.breakerCurrentA}A)</strong>
                </div>
                {effectiveHomologatedCategory.caixaMedicao && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Caixas Homologadas:</span>
                    <strong className="text-slate-800">{effectiveHomologatedCategory.caixaMedicao} + {effectiveHomologatedCategory.caixaDisjuntor}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Demanda Total Calculada:</span>
                  <strong className="text-slate-800">{utilityAnalysis.calculatedDemandKVA.toFixed(1)} kVA</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diagnóstico Disjuntor:</span>
                  <strong className={infrastructureSizing.breakerTripDiagnosis.willTripWithoutDLM ? "text-red-600 font-black" : "text-[#00B356] font-black"}>
                    {infrastructureSizing.breakerTripDiagnosis.willTripWithoutDLM ? 'Cai sem DLM (Sobrecarga)' : 'Não Cai (Operação Segura)'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nível de Fornecimento:</span>
                  <strong className="text-slate-800">{utilityAnalysis.supplyLevel}</strong>
                </div>
              </div>
            </div>

            {/* Pilar 3: Proteções Mandatórias NBR 17019 */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Passo 1C: NBR 17019</h4>
                    <p className="text-[10px] text-slate-400">Proteções & Bombeiros</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">CONFORME</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Proteção Diferencial:</span>
                  <strong className="text-slate-800">DR Tipo B / RDC-DD 6mA</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Proteção Surtos:</span>
                  <strong className="text-slate-800">DPS Classe II 20kA</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Condutor Terra (PE):</span>
                  <strong className="text-slate-800">Exclusivo interligado ao BEP</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Botão de Emergência:</span>
                  <strong className="text-slate-800">{auditHasEmergencyButton ? 'Conforme (≤ 5m)' : 'Não instalado'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Corpo de Bombeiros:</span>
                  <strong className="text-emerald-700">IT-41 / IT-30 Validado</strong>
                </div>
              </div>
            </div>

            {/* Pilar 4: Gestão Dinâmica DLM & Demanda */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Passo 2: Curva de Carga & DLM</h4>
                    <p className="text-[10px] text-slate-400">Balanço de Potência</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {dlmEnableDLM ? 'DLM ATIVO' : 'DLM OFF'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Limite da Conexão:</span>
                  <strong className="text-slate-800">{effectiveDlmGridLimitKW} kW</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Demanda Máxima Medida:</span>
                  <strong className="text-slate-800">{effectiveExistingLoadKW.toFixed(1)} kW</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Folga de Demanda:</span>
                  <strong className="text-emerald-700">
                    {(effectiveDlmGridLimitKW - effectiveExistingLoadKW).toFixed(1)} kW
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Modulação IEC 61851-1:</span>
                  <strong className="text-slate-800">6A a 32A Dinâmica</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Economia em Obras:</span>
                  <strong className="text-[#00B356]">R$ {dlmResult.capexSavingsEstimateBRL.toLocaleString('pt-BR')}</strong>
                </div>
              </div>
            </div>

            {/* Pilar 5: Infraestrutura Eletrotécnica & QGBT */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 md:col-span-2 lg:col-span-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E45318] flex items-center justify-center">
                    <Cable className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Passo 3: Dimensionamento do QGBT & Infraestrutura Interna</h4>
                    <p className="text-[10px] text-slate-400">NBR 5410 & NBR 17019</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    infrastructureSizing.breakerTripDiagnosis.willTripWithoutDLM ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    Disjuntor Geral: {infrastructureSizing.breakerTripDiagnosis.willTripWithoutDLM ? "Cai sem DLM / Seguro com DLM" : "Não Cai (Seguro)"}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Queda {infrastructureSizing.calculatedVoltageDropPercent}% ≤ 2.0%
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Cabo {infrastructureSizing.cableGaugePhaseMM2} mm²
                  </span>
                </div>
              </div>

              {/* Grid de Especificações do QGBT */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Disjuntor Geral QGBT</span>
                  <p className="text-sm font-black text-slate-800">{infrastructureSizing.qgbtMainBreakerA}A Tripolar</p>
                  <p className="text-[10px] text-slate-500">Demanda Total: {infrastructureSizing.qgbtTotalInstalledKW} kW</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Barramento 380V (Potência VE)</span>
                  <p className="text-sm font-black text-[#E45318]">{infrastructureSizing.panelSpecification.busbar380VRatingA}A</p>
                  <p className="text-[10px] text-slate-500">Disjuntor VE: {infrastructureSizing.recommendedBreakerA}A Curva C</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Barramento 220V (Auxiliares)</span>
                  <p className="text-sm font-black text-blue-600">{infrastructureSizing.panelSpecification.busbar220VRatingA}A</p>
                  <p className="text-[10px] text-slate-500">{infrastructureSizing.auxiliaryCircuits.length} circuitos acessórios ativos</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Transformador / Subestação</span>
                  <p className={`text-sm font-black ${infrastructureSizing.transformerDetails?.needed ? "text-[#E45318]" : "text-slate-800"}`}>
                    {infrastructureSizing.transformerRecommendation.needed ? `${infrastructureSizing.transformerRecommendation.recommendedKVA} kVA` : 'Dispensado (BT)'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {infrastructureSizing.transformerDetails?.type === 'elevador_seco'
                      ? 'Elevador 220V → 380V (A Seco)'
                      : infrastructureSizing.transformerRecommendation.supplyLevel === 'MT'
                      ? 'Média Tensão (ND-5.3)'
                      : 'Direto em 220V (Sem Trafo)'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela Resumo da Lista Quantitativa de Materiais (BOM) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Lista Quantitativa de Materiais e Equipamentos (BOM Consolidada)
                </h3>
                <p className="text-xs text-slate-400">
                  Estimativa orçamentária do Padrão CEMIG Oficial (ND-5.1) e do QGBT com infraestrutura interna (NBR 5410)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {cemigBOMCost > 0 && (
                  <span className="text-[11px] font-bold text-orange-900 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
                    Padrão CEMIG: R$ {cemigBOMCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
                <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  QGBT Interno: R$ {qgbtBOMCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-black text-white bg-[#0A192F] px-3.5 py-1.5 rounded-xl shadow-sm">
                  Total Geral: R$ {totalEstimatedBOMCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Descrição Técnica</th>
                    <th className="p-3">Especificação / Referência</th>
                    <th className="p-3 text-center">Qtd</th>
                    <th className="p-3 text-center">Un</th>
                    <th className="p-3 text-right">Unitário (R$)</th>
                    <th className="p-3 text-right">Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {infrastructureSizing.billOfMaterials.map((item, idx) => {
                    const unitPrice = getEstimatedUnitPrice(item);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.category.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{item.description}</td>
                        <td className="p-3 text-slate-500 text-[11px]">{item.spec} ({item.normReference})</td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-center text-slate-400">{item.unit}</td>
                        <td className="p-3 text-right text-slate-500">R$ {unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-slate-900">
                          R$ {(item.quantity * unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé do Laudo com Assinatura Técnica */}
            <div className="border-t border-slate-100 pt-6 mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div>
                <p className="font-bold text-slate-600">Cordeiro Energia • Engenharia & Eletromobilidade</p>
                <p className="text-[11px]">Sistema de Dimensionamento Automatizado CoenergyGO • Conforme ABNT NBR 17019 / NBR 5410</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveCurrentProject}
                  disabled={savingProject}
                  className="bg-[#E45318] hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Grava o dimensionamento completo no banco com os dados do Passo 1A"
                >
                  {savingProject ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{savingProject ? 'Salvando...' : 'Salvar como Novo Projeto'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
