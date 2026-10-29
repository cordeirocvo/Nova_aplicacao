"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { 
  Zap, Plus, FileText, Calendar, User, ChevronRight, Loader, 
  Car, Shield, CheckCircle2, AlertTriangle, Search, Info, 
  BatteryCharging, Gauge, ArrowRight, BookOpen, Layers, Flame, Activity,
  Cable, FileSpreadsheet, Upload, AlertCircle, Printer, Check, Copy, Award,
  Building2, Trash2, Sliders, RefreshCw, Cpu, CheckSquare, Sparkles, Calculator,
  Settings, Globe, ExternalLink, Save, Download, Compass, DollarSign, Box, ShoppingBag
} from "lucide-react";
import { SolicitarNovoMaterialModal } from "@/components/orcamentos/SolicitarNovoMaterialModal";
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
  exportLoadSummaryToExcel,
  DailyPeakPoint,
  MultiSheetMeasurementSummary,
  sizeElectricalInfrastructure,
  TypicalProfileType, 
  RealCurveExtractionMode,
  buildWorstCaseEnvelope24h,
  findWorstPeakDay24h,
  buildAverageReal24h,
  SOLAR_GENERATION_NORMALIZED,
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
import { EVTopologyChainViewer } from "@/components/ev/EVTopologyChainViewer";
import ClientProjectForm from "@/components/ev/ClientProjectForm";
import { EVEngineeringReportsHub } from "@/components/ev/EVEngineeringReportsHub";
import DLMMarketSimulator from "@/components/ev/DLMMarketSimulator";
import DLMSystemVisualizer from "@/components/ev/DLMSystemVisualizer";
import InstallationEnvironmentSelector from "@/components/ev/InstallationEnvironmentSelector";
import ChargerCatalogSelector from "@/components/ev/ChargerCatalogSelector";
import EVStickySummary from "@/components/ev/EVStickySummary";
import EVLocationScoringCockpit from "@/components/ev/EVLocationScoringCockpit";
import { EVFinancialModelingBLEV } from "@/components/ev/EVFinancialModelingBLEV";
import { ModularBOMOutput } from "@/lib/coenergygo/engines/modularBomEngine";
import { calculateUnifiedEVSizing } from "@/lib/ev/unifiedCalculationEngine";
import { 
  ClientProjectData, 
  CondoEnvironmentLocation, 
  FireSafetyChecklist, 
  CommercialHubOperationalData 
} from "@/lib/coenergygo";

const BLANK_CLIENT_PROJECT_DATA: ClientProjectData = {
  projectName: "",
  technicalResponsible: "Eng. Responsável Técnico",
  creaCft: "CREA-MG / CFT",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  address: "",
  utility: 'CEMIG',
  hasExistingStandard: true,
  isNewConnection: false,
  targetNewCategory: "C3",
  installationNumber: "",
  meterNumber: "",
  standardBreakerA: undefined,
  standardCategory: "C1",
  contractedDemandKW: 0,
  utilityBillFileName: undefined,
  utilityBillFileUrl: undefined,
  utilityBillFileType: undefined,
  consumoMedioKWh: undefined,
  consumoMaximoKWh: undefined,
  demandaEstimadaHistoricoKW: undefined,
  saldoGeracaoKWh: undefined,
  energiaCompensadaKWh: undefined,
  historicoConsumo: undefined,
  fieldPhasesConfirmed: undefined,
  fieldBreakerConfirmedA: undefined,
  fieldCableGaugeMM2: undefined,
  customTransformerKVA: undefined,
  customTransformerEfficiencyPercent: undefined,
  customTransformerLossesKW: undefined,
  section1DistanceM: undefined,
  section1MarginPercent: undefined,
  section1ConductorMaterial: undefined,
  section1InstallationMethod: undefined,
  section2DistanceM: undefined,
  section2MarginPercent: undefined,
  section2ConductorMaterial: undefined,
  section2InstallationMethod: undefined,
  section3DistanceM: undefined,
  section3MarginPercent: undefined,
  section3ConductorMaterial: undefined,
  section3InstallationMethod: undefined,
  standardTerminalType: 'COMPRESSAO_OLHAL',
  selectedLoads220V: undefined,
  selectedLoads380V: undefined,
  evBaysCount: undefined
};

export default function CoenergyGODashboard() {
  const [activeTab, setActiveTab] = useState<'projetos' | 'viabilidade' | 'veiculos' | 'concessionarias' | 'nbr17019' | 'curva_dlm' | 'infraestrutura' | 'resultado' | 'modelagem_financeira'>('projetos');
  const [projectModularBOM, setProjectModularBOM] = useState<ModularBOMOutput | null>(null);

  // Sincronização protegida com verificação de igualdade para prevenir loop de render
  const handleModularBOMChange = useCallback((bom: ModularBOMOutput) => {
    setProjectModularBOM(prev => {
      if (
        prev &&
        prev.totalProjectInvestmentBRL === bom.totalProjectInvestmentBRL &&
        prev.totalItemsCount === bom.totalItemsCount &&
        prev.stages?.length === bom.stages?.length &&
        prev.syncedOrcamentoProjetoId === bom.syncedOrcamentoProjetoId
      ) {
        return prev;
      }
      return bom;
    });
  }, []);

  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Metadados do Projeto Selecionado
  const [projectName, setProjectName] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");

  // Dados Estruturados do Cliente e Padrão Concessionária (Passo 01)
  const [clientProjectData, setClientProjectData] = useState<ClientProjectData>(BLANK_CLIENT_PROJECT_DATA);
  const [projectLatitude, setProjectLatitude] = useState<number>(-19.471676);
  const [projectLongitude, setProjectLongitude] = useState<number>(-44.258735);

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
  const [manualExistingLoadKW, setManualExistingLoadKW] = useState<number>(0);
  const [useSmartMeterExistingLoad, setUseSmartMeterExistingLoad] = useState<boolean>(true);

  // Estados para persistência de personalizações da Lista de Materiais Modular (BOM)
  const [bomUserOverrides, setBomUserOverrides] = useState<Record<string, { quantity?: number; unitPriceBRL?: number }>>({});
  const [bomDeletedItemIds, setBomDeletedItemIds] = useState<string[]>([]);
  const [bomCustomAddedItems, setBomCustomAddedItems] = useState<any[]>([]);
  const [bomLaborMode, setBomLaborMode] = useState<'TABELADO' | 'PERCENTUAL'>('TABELADO');
  const [bomLaborPercent, setBomLaborPercent] = useState<number>(25);
  const [bomGlobalBdiPercent, setBomGlobalBdiPercent] = useState<number>(20);

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
  const [realCurveExtractionMode, setRealCurveExtractionMode] = useState<RealCurveExtractionMode>('worst_case_envelope');

  // Curva de Carga & DLM (Passo 2)
  const [dlmProfileType, setDlmProfileType] = useState<TypicalProfileType>('condominio_residencial');
  const [dlmPeakDemandKW, setDlmPeakDemandKW] = useState<number>(55);
  const [dlmSimulationScenario, setDlmSimulationScenario] = useState<'current' | 'homologated'>('current');
  const [dlmChargeStartHour, setDlmChargeStartHour] = useState<number>(8);
  const [dlmChargeDurationHours, setDlmChargeDurationHours] = useState<number>(2);
  const [dlmSolarPeakKW, setDlmSolarPeakKW] = useState<number>(25);
  const [dlmEnableDLM, setDlmEnableDLM] = useState<boolean>(true);
  const [dlmEnableSolarSurplus, setDlmEnableSolarSurplus] = useState<boolean>(false);
  const [isDlmLimitationAccepted, setIsDlmLimitationAccepted] = useState<boolean>(false);
  const [dlmLimitedChargerPowerKW, setDlmLimitedChargerPowerKW] = useState<number | null>(null);
  const [customHomologatedCategoryId, setCustomHomologatedCategoryId] = useState<string | null>(null);
  const [customHourlyFactors, setCustomHourlyFactors] = useState<number[]>(Array(24).fill(1.0));
  const [customProfileName, setCustomProfileName] = useState<string>("Perfil do Projetista");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeLoadedProjectId, setActiveLoadedProjectId] = useState<string | null>(null);
  const [showEngineeringReportsHubModal, setShowEngineeringReportsHubModal] = useState<boolean>(false);
  const [showSolicitarMaterialModal, setShowSolicitarMaterialModal] = useState<boolean>(false);

  // ─── CARREGAR PROJETOS EXISTENTES (BANCO SUPABASE + LOCALSTORAGE RESILIENTE) ─
  useEffect(() => {
    let localSaved: any[] = [];
    try {
      const stored = localStorage.getItem('coenergygo_saved_projects');
      if (stored) {
        const raw = JSON.parse(stored);
        if (Array.isArray(raw)) {
          // Descarta snapshots voláteis de rascunho
          localSaved = raw.filter((x: any) => x && x.id && x.id !== 'proj-auto-saved-current');
        }
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
        
        // 1. Deduplicar registros do banco e deserializar snapshot de analysisNotes se presente
        const dedupedDb: any[] = [];
        const seenDbNames = new Set<string>();
        dbList.forEach(p => {
          let enrichedProject = { ...p };
          if (p.analysisNotes && typeof p.analysisNotes === 'string' && p.analysisNotes.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(p.analysisNotes);
              if (parsed && typeof parsed === 'object') {
                enrichedProject = {
                  ...parsed,
                  ...p,
                  id: p.id,
                  // Priorizar estruturas ricas do snapshot
                  userBOMOverrides: parsed.userBOMOverrides || p.userBOMOverrides || parsed.clientProjectData?.userBOMOverrides || {},
                  deletedItemIds: parsed.deletedItemIds || p.deletedItemIds || parsed.clientProjectData?.deletedItemIds || [],
                  customAddedItems: parsed.customAddedItems || p.customAddedItems || parsed.clientProjectData?.customAddedItems || [],
                  laborMode: parsed.laborMode || p.laborMode || 'TABELADO',
                  laborPercent: typeof parsed.laborPercent === 'number' ? parsed.laborPercent : (typeof p.laborPercent === 'number' ? p.laborPercent : 25),
                  globalBdiPercent: typeof parsed.globalBdiPercent === 'number' ? parsed.globalBdiPercent : (typeof p.globalBdiPercent === 'number' ? p.globalBdiPercent : 20),
                  financialAssumptions: parsed.financialAssumptions || p.financialAssumptions || null,
                  configuredChargers: parsed.configuredChargers || p.configuredChargers,
                  attachedSheetsList: parsed.attachedSheetsList || p.attachedSheetsList,
                  smartMeterSummary: parsed.smartMeterSummary || p.smartMeterSummary,
                  dailyPeaksState: parsed.dailyPeaksState || p.dailyPeaksState,
                  customCircuits220V: parsed.customCircuits220V || p.customCircuits220V,
                  customCircuits380V: parsed.customCircuits380V || p.customCircuits380V,
                  clientProjectData: {
                    ...p.clientProjectData,
                    ...parsed.clientProjectData,
                    userBOMOverrides: parsed.userBOMOverrides || p.userBOMOverrides || parsed.clientProjectData?.userBOMOverrides || {},
                    deletedItemIds: parsed.deletedItemIds || p.deletedItemIds || parsed.clientProjectData?.deletedItemIds || [],
                    customAddedItems: parsed.customAddedItems || p.customAddedItems || parsed.clientProjectData?.customAddedItems || []
                  }
                };
              }
            } catch (e) {
              console.warn("Aviso ao deserializar analysisNotes do projeto:", p.id, e);
            }
          }

          const normName = (enrichedProject.projectName || "").trim().toLowerCase();
          if (normName && seenDbNames.has(normName)) {
            // Já existe um registro com esse nome; mantém o primeiro (mais recente)
            return;
          }
          if (normName) seenDbNames.add(normName);
          dedupedDb.push(enrichedProject);
        });

        // 2. Mesclar projetos locais com projetos do banco priorizando o snapshot oficial do banco (sem contaminação cruzada)
        const sanitizeProjectRecord = (proj: any) => {
          if (!proj) return proj;
          const pName = (proj.projectName || proj.clientProjectData?.projectName || "").toLowerCase();
          const pAddr = (proj.clientAddress || proj.clientProjectData?.address || "").toLowerCase();
          const isSeteLagoas = pName.includes("sete lagoas") || pAddr.includes("olavo bilac") || pAddr.includes("sete lagoas");
          const cpd = proj.clientProjectData ? { ...proj.clientProjectData } : {};

          // Se não é o projeto de Sete Lagoas mas herdou acidentalmente dados da fatura de Sete Lagoas (811.109.018-18), limpar
          if (!isSeteLagoas && (cpd.installationNumber === "811.109.018-18" || (proj.clientDocument || "").includes("811.109.018-18"))) {
            cpd.installationNumber = "";
            cpd.meterNumber = "";
            cpd.utilityBillFileName = undefined;
            cpd.utilityBillFileUrl = undefined;
            cpd.utilityBillFileType = undefined;
            cpd.historicoConsumo = undefined;
            cpd.consumoMedioKWh = undefined;
            cpd.consumoMaximoKWh = undefined;
            cpd.demandaEstimadaHistoricoKW = undefined;
            cpd.saldoGeracaoKWh = undefined;
            cpd.energiaCompensadaKWh = undefined;
            proj.clientDocument = "";
          }

          // Se é Ligação Nova (Sem Padrão Existente), sincronizar targetNewCategory
          if (cpd.isNewConnection) {
            if (proj.existingLoadKW === undefined || proj.existingLoadKW === null) {
              proj.existingLoadKW = 0;
            }
            cpd.hasExistingStandard = false;
            if (cpd.standardCategory && cpd.standardCategory !== 'C1') {
              cpd.targetNewCategory = cpd.standardCategory;
            } else if (cpd.targetNewCategory) {
              cpd.standardCategory = cpd.targetNewCategory;
            }
          }

          cpd.userBOMOverrides = proj.userBOMOverrides || cpd.userBOMOverrides || {};
          cpd.deletedItemIds = proj.deletedItemIds || cpd.deletedItemIds || [];
          cpd.customAddedItems = proj.customAddedItems || cpd.customAddedItems || [];
          proj.userBOMOverrides = cpd.userBOMOverrides;
          proj.deletedItemIds = cpd.deletedItemIds;
          proj.customAddedItems = cpd.customAddedItems;

          proj.clientProjectData = cpd;
          return proj;
        };

        const finalProjects: any[] = dedupedDb.map(sanitizeProjectRecord);
        localSaved.forEach(rawLocalP => {
          const localP = sanitizeProjectRecord(rawLocalP);
          const normLocalName = (localP.projectName || "").trim().toLowerCase();
          const existingById = finalProjects.find(fp => fp.id === localP.id);
          const existingByName = normLocalName ? finalProjects.find(fp => (fp.projectName || "").trim().toLowerCase() === normLocalName) : null;

          if (!existingById && !existingByName) {
            // Projeto offline exclusivo
            finalProjects.push(localP);
          }
        });

        // Salva a lista limpa e deduplicada de volta no localStorage
        try {
          localStorage.setItem('coenergygo_saved_projects', JSON.stringify(finalProjects));
        } catch (e) {}

        setProjects(finalProjects);
        setLoadingProjects(false);

        // Se houver um rascunho de sessão recente salvo, restaurar parâmetros se ainda no modo novo
        try {
          const draft = localStorage.getItem('coenergygo_active_draft');
          if (draft) {
            const parsedDraft = JSON.parse(draft);
            if (parsedDraft && parsedDraft.clientProjectData) {
              setClientProjectData(prev => ({ ...prev, ...parsedDraft.clientProjectData }));
            }
            const draftLoads220 = parsedDraft?.selectedLoads220V || parsedDraft?.clientProjectData?.selectedLoads220V;
            const draftLoads380 = parsedDraft?.selectedLoads380V || parsedDraft?.clientProjectData?.selectedLoads380V;
            if (draftLoads220 || draftLoads380) {
              try {
                const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
                if (draftLoads220) useEVTopologyStore.getState().setSelectedLoads220V(draftLoads220);
                if (draftLoads380) useEVTopologyStore.getState().setSelectedLoads380V(draftLoads380);
              } catch (e) {}
            }
            if (Array.isArray(parsedDraft?.configuredChargers) && parsedDraft.configuredChargers.length > 0) {
              setConfiguredChargers(parsedDraft.configuredChargers);
            }
            if (parsedDraft.enableSolarSurplus !== undefined) {
              setDlmEnableSolarSurplus(Boolean(parsedDraft.enableSolarSurplus));
            } else if (parsedDraft.dlmEnableSolarSurplus !== undefined) {
              setDlmEnableSolarSurplus(Boolean(parsedDraft.dlmEnableSolarSurplus));
            }
            if (typeof parsedDraft.solarPeakKW === 'number' && parsedDraft.solarPeakKW > 0) {
              setDlmSolarPeakKW(parsedDraft.solarPeakKW);
            } else if (typeof parsedDraft.dlmSolarPeakKW === 'number' && parsedDraft.dlmSolarPeakKW > 0) {
              setDlmSolarPeakKW(parsedDraft.dlmSolarPeakKW);
            }
            if (parsedDraft.demandControlEnabled !== undefined) {
              setDlmEnableDLM(Boolean(parsedDraft.demandControlEnabled));
            }
            if (parsedDraft.isDlmLimitationAccepted !== undefined) {
              setIsDlmLimitationAccepted(Boolean(parsedDraft.isDlmLimitationAccepted));
            }
            if (parsedDraft.dlmLimitedChargerPowerKW !== undefined) {
              setDlmLimitedChargerPowerKW(parsedDraft.dlmLimitedChargerPowerKW);
            }
            if (parsedDraft.customHomologatedCategoryId) {
              setCustomHomologatedCategoryId(parsedDraft.customHomologatedCategoryId);
            }

            // Restauração das edições da BOM Modular
            const draftOverrides = parsedDraft?.userBOMOverrides || parsedDraft?.clientProjectData?.userBOMOverrides;
            if (draftOverrides && typeof draftOverrides === 'object') {
              setBomUserOverrides(draftOverrides);
            } else {
              try {
                const s = localStorage.getItem('coenergygo_bom_user_overrides');
                if (s) setBomUserOverrides(JSON.parse(s));
              } catch (e) {}
            }

            const draftDeleted = parsedDraft?.deletedItemIds || parsedDraft?.clientProjectData?.deletedItemIds;
            if (Array.isArray(draftDeleted)) {
              setBomDeletedItemIds(draftDeleted);
            } else {
              try {
                const s = localStorage.getItem('coenergygo_bom_deleted_items');
                if (s) setBomDeletedItemIds(JSON.parse(s));
              } catch (e) {}
            }

            const draftCustom = parsedDraft?.customAddedItems || parsedDraft?.clientProjectData?.customAddedItems;
            if (Array.isArray(draftCustom)) {
              setBomCustomAddedItems(draftCustom);
            } else {
              try {
                const s = localStorage.getItem('coenergygo_bom_custom_items');
                if (s) setBomCustomAddedItems(JSON.parse(s));
              } catch (e) {}
            }

            const draftLaborMode = parsedDraft?.laborMode || parsedDraft?.clientProjectData?.laborMode;
            if (draftLaborMode) setBomLaborMode(draftLaborMode);

            const draftLaborPct = parsedDraft?.laborPercent ?? parsedDraft?.clientProjectData?.laborPercent;
            if (typeof draftLaborPct === 'number') setBomLaborPercent(draftLaborPct);

            const draftBdi = parsedDraft?.globalBdiPercent ?? parsedDraft?.clientProjectData?.globalBdiPercent;
            if (typeof draftBdi === 'number') setBomGlobalBdiPercent(draftBdi);

            // Restauração das premissas financeiras BLEV (Passo 5 / Foto 2)
            const draftFinancial = parsedDraft?.financialAssumptions || parsedDraft?.clientProjectData;
            if (draftFinancial && typeof draftFinancial === 'object') {
              try {
                localStorage.setItem('coenergygo_financial_assumptions', JSON.stringify({
                  ahpTariffBRL: draftFinancial.ahpTariffBRL,
                  ahpEnergyCostBRL: draftFinancial.ahpEnergyCostBRL,
                  ahpSolarEnergyCostBRL: draftFinancial.ahpSolarEnergyCostBRL,
                  ahpFixedOpexBRL: draftFinancial.ahpFixedOpexBRL,
                  ahpVariableOpexPercent: draftFinancial.ahpVariableOpexPercent,
                  ahpSessionMinutes: draftFinancial.ahpSessionMinutes,
                  ahpCapexBRL: draftFinancial.ahpCapexBRL,
                  ahpVdm: draftFinancial.ahpVdm,
                  ahpFleetDensityPercent: draftFinancial.ahpFleetDensityPercent,
                  ahpEnergySourceMode: draftFinancial.ahpEnergySourceMode,
                  ahpSolarSharePercent: draftFinancial.ahpSolarSharePercent,
                  ahpRealEstateModel: draftFinancial.ahpRealEstateModel,
                  ahpRevenueSharePercent: draftFinancial.ahpRevenueSharePercent,
                  ahpFixedRentBRL: draftFinancial.ahpFixedRentBRL,
                  ahpUseAutoCapex: draftFinancial.ahpUseAutoCapex
                }));
              } catch (e) {}
            }
          }
        } catch (e) {}
      })
      .catch(err => {
        console.warn("Aviso na API remota /api/ev/sizing, utilizando projetos locais:", err);
        if (localSaved.length > 0) {
          // Deduplicar localSaved por nome
          const dedupedLocal: any[] = [];
          const seenLocal = new Set<string>();
          localSaved.forEach(p => {
            const n = (p.projectName || "").trim().toLowerCase();
            if (!seenLocal.has(n)) {
              if (n) seenLocal.add(n);
              dedupedLocal.push(p);
            }
          });
          setProjects(dedupedLocal);
        }
        setLoadingProjects(false);

        try {
          const draft = localStorage.getItem('coenergygo_active_draft');
          if (draft) {
            const parsedDraft = JSON.parse(draft);
            if (parsedDraft && parsedDraft.clientProjectData) {
              setClientProjectData(prev => ({ ...prev, ...parsedDraft.clientProjectData }));
            }
            const draftLoads220 = parsedDraft?.selectedLoads220V || parsedDraft?.clientProjectData?.selectedLoads220V;
            const draftLoads380 = parsedDraft?.selectedLoads380V || parsedDraft?.clientProjectData?.selectedLoads380V;
            if (draftLoads220 || draftLoads380) {
              try {
                const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
                if (draftLoads220) useEVTopologyStore.getState().setSelectedLoads220V(draftLoads220);
                if (draftLoads380) useEVTopologyStore.getState().setSelectedLoads380V(draftLoads380);
              } catch (e) {}
            }
            if (Array.isArray(parsedDraft?.configuredChargers) && parsedDraft.configuredChargers.length > 0) {
              setConfiguredChargers(parsedDraft.configuredChargers);
            }
            if (parsedDraft.enableSolarSurplus !== undefined) {
              setDlmEnableSolarSurplus(Boolean(parsedDraft.enableSolarSurplus));
            } else if (parsedDraft.dlmEnableSolarSurplus !== undefined) {
              setDlmEnableSolarSurplus(Boolean(parsedDraft.dlmEnableSolarSurplus));
            }
            if (typeof parsedDraft.solarPeakKW === 'number' && parsedDraft.solarPeakKW > 0) {
              setDlmSolarPeakKW(parsedDraft.solarPeakKW);
            } else if (typeof parsedDraft.dlmSolarPeakKW === 'number' && parsedDraft.dlmSolarPeakKW > 0) {
              setDlmSolarPeakKW(parsedDraft.dlmSolarPeakKW);
            }
            if (parsedDraft.demandControlEnabled !== undefined) {
              setDlmEnableDLM(Boolean(parsedDraft.demandControlEnabled));
            }
            if (parsedDraft.isDlmLimitationAccepted !== undefined) {
              setIsDlmLimitationAccepted(Boolean(parsedDraft.isDlmLimitationAccepted));
            }
            if (parsedDraft.dlmLimitedChargerPowerKW !== undefined) {
              setDlmLimitedChargerPowerKW(parsedDraft.dlmLimitedChargerPowerKW);
            }
            if (parsedDraft.customHomologatedCategoryId) {
              setCustomHomologatedCategoryId(parsedDraft.customHomologatedCategoryId);
            }

            // Restauração das edições da BOM Modular
            const draftOverrides = parsedDraft?.userBOMOverrides || parsedDraft?.clientProjectData?.userBOMOverrides;
            if (draftOverrides && typeof draftOverrides === 'object') {
              setBomUserOverrides(draftOverrides);
            } else {
              try {
                const s = localStorage.getItem('coenergygo_bom_user_overrides');
                if (s) setBomUserOverrides(JSON.parse(s));
              } catch (e) {}
            }

            const draftDeleted = parsedDraft?.deletedItemIds || parsedDraft?.clientProjectData?.deletedItemIds;
            if (Array.isArray(draftDeleted)) {
              setBomDeletedItemIds(draftDeleted);
            } else {
              try {
                const s = localStorage.getItem('coenergygo_bom_deleted_items');
                if (s) setBomDeletedItemIds(JSON.parse(s));
              } catch (e) {}
            }

            const draftCustom = parsedDraft?.customAddedItems || parsedDraft?.clientProjectData?.customAddedItems;
            if (Array.isArray(draftCustom)) {
              setBomCustomAddedItems(draftCustom);
            } else {
              try {
                const s = localStorage.getItem('coenergygo_bom_custom_items');
                if (s) setBomCustomAddedItems(JSON.parse(s));
              } catch (e) {}
            }

            const draftLaborMode = parsedDraft?.laborMode || parsedDraft?.clientProjectData?.laborMode;
            if (draftLaborMode) setBomLaborMode(draftLaborMode);

            const draftLaborPct = parsedDraft?.laborPercent ?? parsedDraft?.clientProjectData?.laborPercent;
            if (typeof draftLaborPct === 'number') setBomLaborPercent(draftLaborPct);

            const draftBdi = parsedDraft?.globalBdiPercent ?? parsedDraft?.clientProjectData?.globalBdiPercent;
            if (typeof draftBdi === 'number') setBomGlobalBdiPercent(draftBdi);

            // Restauração das premissas financeiras BLEV (Passo 5 / Foto 2)
            const draftFinancial = parsedDraft?.financialAssumptions || parsedDraft?.clientProjectData;
            if (draftFinancial && typeof draftFinancial === 'object') {
              try {
                localStorage.setItem('coenergygo_financial_assumptions', JSON.stringify({
                  ahpTariffBRL: draftFinancial.ahpTariffBRL,
                  ahpEnergyCostBRL: draftFinancial.ahpEnergyCostBRL,
                  ahpSolarEnergyCostBRL: draftFinancial.ahpSolarEnergyCostBRL,
                  ahpFixedOpexBRL: draftFinancial.ahpFixedOpexBRL,
                  ahpVariableOpexPercent: draftFinancial.ahpVariableOpexPercent,
                  ahpSessionMinutes: draftFinancial.ahpSessionMinutes,
                  ahpCapexBRL: draftFinancial.ahpCapexBRL,
                  ahpVdm: draftFinancial.ahpVdm,
                  ahpFleetDensityPercent: draftFinancial.ahpFleetDensityPercent,
                  ahpEnergySourceMode: draftFinancial.ahpEnergySourceMode,
                  ahpSolarSharePercent: draftFinancial.ahpSolarSharePercent,
                  ahpRealEstateModel: draftFinancial.ahpRealEstateModel,
                  ahpRevenueSharePercent: draftFinancial.ahpRevenueSharePercent,
                  ahpFixedRentBRL: draftFinancial.ahpFixedRentBRL,
                  ahpUseAutoCapex: draftFinancial.ahpUseAutoCapex
                }));
              } catch (e) {}
            }
          }
        } catch (e) {}
      });
  }, []);

  const effectiveExistingLoadKW = (loadSourceMode === 'smartmeter' && smartMeterSummary)
    ? smartMeterSummary.maxPowerKW
    : (loadSourceMode === 'spot')
    ? calculatedSpotKW
    : manualExistingLoadKW;

  const totalChargersInstalledKW = configuredChargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0);
  const totalChargersCount = configuredChargers.reduce((sum, c) => sum + c.quantity, 0);

  // Total de Pontos/Pistolas de Recarga Simultâneos (ex: 60kW DC = 2 pistolas por unidade)
  const totalChargingPointsCount = configuredChargers.reduce((sum, c) => {
    const isDualGun = (c.powerKW >= 60 && c.type === 'DC') || (c.connector && c.connector.includes('2x'));
    return sum + ((isDualGun ? 2 : 1) * c.quantity);
  }, 0);

  // Total de Vagas VE Atendidas (respeita o valor cadastrado pelo usuário se informado, senão computa pelos pontos de recarga)
  const totalEvBaysCount = (clientProjectData.evBaysCount && clientProjectData.evBaysCount > 0)
    ? clientProjectData.evBaysCount
    : Math.max(totalChargersCount, totalChargingPointsCount);

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

  // Sincronizar demanda base do Passo 2 sempre que a medição ou carga manual do Passo 1B for alterada
  useEffect(() => {
    if (effectiveExistingLoadKW >= 0) {
      setDlmPeakDemandKW(effectiveExistingLoadKW);
    }
  }, [effectiveExistingLoadKW]);

  // Calibrar perfil e horários de funcionamento padrão com base no modo da aplicação apenas quando o usuário não tiver customizado ou carregado um projeto
  useEffect(() => {
    // Se há um projeto ativo carregado ou o usuário configurou um perfil customizado, não sobrescrever
    if (activeLoadedProjectId || dlmProfileType === 'custom_usuario') {
      return;
    }

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
  }, [applicationMode, highestChargerPowerKW, activeLoadedProjectId, dlmProfileType]);

  // Categoria Homologada Efetiva (Automática, Ligação Nova ou Personalizada pelo Usuário)
  const effectiveHomologatedCategory = (customHomologatedCategoryId && availableCategories[customHomologatedCategoryId])
    ? availableCategories[customHomologatedCategoryId]
    : (clientProjectData.isNewConnection && clientProjectData.standardCategory && availableCategories[clientProjectData.standardCategory])
    ? availableCategories[clientProjectData.standardCategory]
    : utilityAnalysis.category;

  // ─── CAPACIDADE REAL DO PADRÃO BASEADA NA VISTORIA DE CAMPO ────────────────
  const fieldBreakerAmps = clientProjectData.fieldBreakerConfirmedA || (utilityAnalysis.currentCategory?.breakerCurrentA || 63);
  const fieldPhases = clientProjectData.fieldPhasesConfirmed || (utilityAnalysis.currentCategory?.phases === 3 ? '3F' : utilityAnalysis.currentCategory?.phases === 2 ? '2F' : '1F');
  
  // Limite em kW do padrão existente ou escolhido na Ligação Nova:
  // Se for Ligação Nova ou se o disjuntor confirmado corresponder ao disjuntor nominal da categoria CEMIG (ex: F1 = 225A -> 86 kW, C6 = 200A -> 75 kW),
  // utiliza o limite homologado oficial da Tabela da Concessionária (evitando discrepância 81.4 kW vs 86 kW).
  const isBreakerMatchingCurrentCategory = Boolean(
    utilityAnalysis.currentCategory &&
    clientProjectData.fieldBreakerConfirmedA === utilityAnalysis.currentCategory.breakerCurrentA
  );

  const fieldCalculatedLimitKW = (clientProjectData.isNewConnection || isBreakerMatchingCurrentCategory)
    ? (utilityAnalysis.currentCategory?.maxLimitKW || effectiveHomologatedCategory.maxLimitKW || 75)
    : clientProjectData.fieldBreakerConfirmedA
    ? (clientProjectData.fieldBreakerConfirmedA === 200 && fieldPhases === '3F'
        ? 75.0
        : clientProjectData.fieldBreakerConfirmedA === 225 && fieldPhases === '3F'
        ? 86.0
        : Number(
            (fieldPhases === '3F'
              ? (Math.sqrt(3) * (selectedUtility === 'CEMIG' ? 220 : 380) * fieldBreakerAmps * 0.95) / 1000
              : fieldPhases === '2F'
              ? (220 * fieldBreakerAmps * 0.95) / 1000
              : (220 * fieldBreakerAmps) / 1000
            ).toFixed(1)
          ))
    : (utilityAnalysis.currentCategory?.maxLimitKW || 75);

  // Limites e Cenários de Simulação para o Passo 2 (Curva 24h & DLM)
  const currentStandardLimitKW = fieldCalculatedLimitKW;
  const currentStandardDisplayName = clientProjectData.isNewConnection
    ? `${effectiveHomologatedCategory.categoryName || currentStandardCategoryId} (Ligação Nova: ${currentStandardLimitKW} kW)`
    : isBreakerMatchingCurrentCategory
    ? `${utilityAnalysis.currentCategory?.categoryName || currentStandardCategoryId} (${currentStandardLimitKW} kW)`
    : clientProjectData.fieldBreakerConfirmedA
    ? `${clientProjectData.fieldPhasesConfirmed || '1F'} ${fieldBreakerAmps}A (Vistoria de Campo: ${fieldCalculatedLimitKW} kW)`
    : `${utilityAnalysis.currentCategory?.categoryName || currentStandardCategoryId} (${currentStandardLimitKW} kW)`;

  const homologatedStandardLimitKW = effectiveHomologatedCategory.maxLimitKW || 95;
  const effectiveDlmGridLimitKW = dlmSimulationScenario === 'current'
    ? currentStandardLimitKW
    : homologatedStandardLimitKW;

  // ─── MOTOR DLM E CURVA DE CARGA (Passo 2) ──────────────────────────────────
  // Se houver medição real customizada carregada e o perfil for smartmeter_real,
  // ou se for qualquer outro perfil, recalcula os 24 pontos respeitando a demanda de base e a geração solar ativa
  const baseCurve = (() => {
    if (dlmProfileType === 'smartmeter_real' && customCurvePoints) {
      return customCurvePoints.map((pt, hour) => {
        const solarGenKW = dlmEnableSolarSurplus
          ? Number(((SOLAR_GENERATION_NORMALIZED[hour] || 0) * dlmSolarPeakKW).toFixed(1))
          : 0;
        const baseKW = pt.baseLoadKW;
        return {
          ...pt,
          baseLoadKW: baseKW,
          solarGenerationKW: solarGenKW,
          netBuildingLoadKW: Number(Math.max(0, baseKW - solarGenKW).toFixed(1))
        };
      });
    }

    return generateScaledHourlyCurve(
      dlmProfileType,
      dlmPeakDemandKW,
      dlmEnableSolarSurplus ? dlmSolarPeakKW : 0,
      (dlmProfileType === 'custom_usuario' || dlmProfileType === 'smartmeter_real') ? customHourlyFactors : undefined
    );
  })();

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
        ladoRede: clientProjectData.standardSideOfStreet || "MESMO_LADO",
        tipoSaida: clientProjectData.standardExitType || "SUBTERRANEA",
        tipoEstrutura: clientProjectData.standardStructureType || "POSTE_CONCRETO",
        localizacao: clientProjectData.standardLocation || "URBANO",
        tipoCaixaDisjuntorTabela4: clientProjectData.standardBoxChoiceTabela4 || "CM-18",
        tipoTerminalDisjuntor: clientProjectData.standardTerminalType || "COMPRESSAO_OLHAL",
        preferirKitProntoCaixas: clientProjectData.preferKitProntoCaixas ?? false,
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
    if (updated.clientName !== undefined) setClientName(updated.clientName);
    if (updated.projectName !== undefined) setProjectName(updated.projectName);
    if (updated.utility) setSelectedUtility(updated.utility);
    if (updated.standardCategory) {
      setCurrentStandardCategoryId(updated.standardCategory);
      setCustomHomologatedCategoryId(updated.standardCategory);
    }
    if (updated.isNewConnection === true) {
      setManualExistingLoadKW(0);
    }
    if (updated.demandaEstimadaHistoricoKW && updated.demandaEstimadaHistoricoKW > 0) {
      setManualExistingLoadKW(updated.demandaEstimadaHistoricoKW);
      setLoadSourceMode('fatura');
    } else if (updated.consumoMedioKWh && updated.consumoMedioKWh > 0) {
      const kw = Number((updated.consumoMedioKWh / (720 * 0.30)).toFixed(1));
      setManualExistingLoadKW(kw);
      setLoadSourceMode('fatura');
    }
  };

  // ─── GEOCODIFICAÇÃO AUTOMÁTICA COM DEBOUNCE (SINGLE SOURCE OF TRUTH) ─────
  useEffect(() => {
    const rawAddress = clientProjectData.address?.trim();
    if (!rawAddress || rawAddress.length < 4 || rawAddress === "Endereço a definir") return;

    // Se o endereço é o padrão de Sete Lagoas, aplica diretamente as coordenadas de alta precisão
    if (rawAddress.toLowerCase().includes('olavo bilac')) {
      setProjectLatitude(-19.471676);
      setProjectLongitude(-44.258735);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/ev/geocode?address=${encodeURIComponent(rawAddress)}`)
        .then(res => res.json())
        .then(geo => {
          if (geo.success && typeof geo.lat === 'number' && typeof geo.lon === 'number') {
            setProjectLatitude(geo.lat);
            setProjectLongitude(geo.lon);
          }
        })
        .catch(err => console.warn("Aviso ao geocodificar endereço do projeto:", err));
    }, 600);

    return () => clearTimeout(timer);
  }, [clientProjectData.address]);


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
    setActiveLoadedProjectId(null);
    setProjectName("");
    setClientName("");
    setApplicationMode('individual');

    // 1. Limpa TODOS os dados do cliente e da fatura anterior para começar 100% em branco
    setClientProjectData({ ...BLANK_CLIENT_PROJECT_DATA });

    // 2. Carregador inicial padrão limpo (1x Wallbox 7.4 kW em branco para o cliente configurar)
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

    // 3. Resetar concessionária, padrão e coordenadas para valores iniciais neutros
    setSelectedUtility('CEMIG');
    setCurrentStandardCategoryId('C1');
    setCustomHomologatedCategoryId(null);
    setProjectLatitude(-19.471676);
    setProjectLongitude(-44.258735);

    // 4. Resetar medições de carga e planilhas
    setLoadSourceMode('fatura');
    setManualExistingLoadKW(0);
    setUseSmartMeterExistingLoad(false);
    setSmartMeterSummary(null);
    setAttachedSheetsList([]);
    setDailyPeaksState([]);
    setCustomCurvePoints(null);
    setCustomCurveBackup(null);

    // 5. Resetar parâmetros de infraestrutura e DLM
    setCircuitDistanceMeters(15);
    setInstallationMethod('B1');
    setAmbientTemp(30);
    setIsOutdoor(false);
    setDlmProfileType('condominio_residencial');
    setDlmPeakDemandKW(10);
    setDlmSimulationScenario('current');
    setDlmChargeStartHour(8);
    setDlmChargeDurationHours(2);
    setDlmSolarPeakKW(0);
    setDlmEnableSolarSurplus(false);
    setDlmEnableDLM(true);
    setIsDlmLimitationAccepted(false);
    setDlmLimitedChargerPowerKW(null);
    setCommercialHub({
      forecastDailyCharges: 25,
      averageSessionMinutes: 35,
      peakConcentrationHours: [11, 12, 13, 17, 18, 19],
      hasCanopy: true,
      hasAutonomousPayment: true
    });

    // 6. Limpar rascunhos anteriores do localStorage para evitar ressuscitar projetos passados
    try {
      localStorage.removeItem('coenergygo_active_draft');
      localStorage.removeItem('coenergygo_custom_circuits_220v');
      localStorage.removeItem('coenergygo_custom_circuits_380v');
      localStorage.removeItem('coenergygo_bom_user_overrides');
      localStorage.removeItem('coenergygo_bom_deleted_items');
      localStorage.removeItem('coenergygo_bom_custom_items');
      localStorage.removeItem('coenergygo_financial_assumptions');
    } catch (e) {}
    setBomUserOverrides({});
    setBomDeletedItemIds([]);
    setBomCustomAddedItems([]);

    // 7. Resetar o Store da Topologia Eletrotécnica
    try {
      const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
      useEVTopologyStore.getState().resetToBlank();
    } catch (err) {}

    // 8. Navegar para o Passo 1A limpo
    setActiveTab('veiculos');
    setSaveSuccessMessage("Novo projeto em branco iniciado com sucesso.");
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleLoadProjectIntoCoenergyGO = (p: any) => {
    const cleanName = p.projectName || p.clientProjectData?.projectName || 'Dimensionamento Carregado';
    const cleanClient = p.clientName || p.clientProjectData?.clientName || 'Cliente Particular';
    const cleanUtility = (p.utility || p.clientProjectData?.utility || 'CEMIG') as UtilityId;
    const cleanAddress = p.clientProjectData?.address || p.clientAddress || '';

    setActiveLoadedProjectId(p.id || null);
    setProjectName(cleanName);
    setClientName(cleanClient);
    setSelectedUtility(cleanUtility);

    // 1. Restaurar Modo de Aplicação exato selecionado no projeto
    if (p.applicationMode) {
      setApplicationMode(p.applicationMode);
    } else if (p.clientProjectData?.applicationMode) {
      setApplicationMode(p.clientProjectData.applicationMode);
    } else if (p.isCollective) {
      setApplicationMode('condominio_frota');
    } else {
      setApplicationMode('individual');
    }

    // 2. Construir clientProjectData 100% isolado a partir de BLANK_CLIENT_PROJECT_DATA (NUNCA mesclar sobre prev!)
    const rawClientData = p.clientProjectData || {};
    const isSeteLagoas = cleanName.toLowerCase().includes('sete lagoas') || cleanAddress.toLowerCase().includes('olavo bilac') || cleanAddress.toLowerCase().includes('sete lagoas');
    const isNewConn = Boolean(rawClientData.isNewConnection);
    const resolvedStdCat = rawClientData.standardCategory || p.existingEntranceCategory || p.entranceCategory || 'C3';
    const resolvedTargetNewCat = isNewConn
      ? (rawClientData.standardCategory && rawClientData.standardCategory !== 'C1' ? rawClientData.standardCategory : (rawClientData.targetNewCategory || resolvedStdCat))
      : (rawClientData.targetNewCategory || resolvedStdCat);

    const mergedClientData: ClientProjectData = {
      ...BLANK_CLIENT_PROJECT_DATA,
      ...rawClientData,
      projectName: cleanName,
      clientName: cleanClient,
      address: cleanAddress,
      utility: cleanUtility,
      isNewConnection: isNewConn,
      hasExistingStandard: !isNewConn,
      standardCategory: resolvedStdCat,
      targetNewCategory: resolvedTargetNewCat,
      section1DistanceM: p.section1DistanceM ?? rawClientData.section1DistanceM,
      section1MarginPercent: p.marginPercent ?? p.section1MarginPercent ?? rawClientData.section1MarginPercent,
      section1ConductorMaterial: p.section1ConductorMaterial ?? rawClientData.section1ConductorMaterial,
      section1InstallationMethod: p.section1InstallationMethod ?? rawClientData.section1InstallationMethod,
      section2DistanceM: p.section2DistanceM ?? rawClientData.section2DistanceM,
      section2MarginPercent: p.section2MarginPercent ?? rawClientData.section2MarginPercent,
      section2ConductorMaterial: p.section2ConductorMaterial ?? rawClientData.section2ConductorMaterial,
      section2InstallationMethod: p.section2InstallationMethod ?? rawClientData.section2InstallationMethod,
      section3DistanceM: p.section3DistanceM ?? rawClientData.section3DistanceM,
      section3MarginPercent: p.section3MarginPercent ?? rawClientData.section3MarginPercent,
      section3ConductorMaterial: p.section3ConductorMaterial ?? rawClientData.section3ConductorMaterial,
      section3InstallationMethod: p.section3InstallationMethod ?? rawClientData.section3InstallationMethod,
      customTransformerKVA: p.customTransformerKVA ?? rawClientData.customTransformerKVA,
      customTransformerEfficiencyPercent: p.customTransformerEfficiencyPercent ?? rawClientData.customTransformerEfficiencyPercent,
      customTransformerLossesKW: p.customTransformerLossesKW ?? rawClientData.customTransformerLossesKW,
      standardTerminalType: p.standardTerminalType ?? rawClientData.standardTerminalType ?? 'COMPRESSAO_OLHAL',
      selectedLoads220V: p.selectedLoads220V ?? rawClientData.selectedLoads220V,
      selectedLoads380V: p.selectedLoads380V ?? rawClientData.selectedLoads380V
    };

    // Blindagem extra: se não for Sete Lagoas ou se for Ligação Nova, limpar qualquer resquício de fatura de outro projeto
    if ((!isSeteLagoas && mergedClientData.installationNumber === "811.109.018-18") || isNewConn) {
      mergedClientData.installationNumber = "";
      mergedClientData.meterNumber = "";
      mergedClientData.utilityBillFileName = undefined;
      mergedClientData.utilityBillFileUrl = undefined;
      mergedClientData.utilityBillFileType = undefined;
      mergedClientData.historicoConsumo = undefined;
      mergedClientData.consumoMedioKWh = undefined;
      mergedClientData.consumoMaximoKWh = undefined;
      mergedClientData.demandaEstimadaHistoricoKW = undefined;
      mergedClientData.saldoGeracaoKWh = undefined;
      mergedClientData.energiaCompensadaKWh = undefined;
    }

    setClientProjectData(mergedClientData);

    // 3. Sincronizar Coordenadas Geodésicas imediatamente para o projeto carregado
    const contextLower = `${cleanAddress} ${cleanName}`.toLowerCase();
    if (contextLower.includes('olavo bilac') || contextLower.includes('sete lagoas')) {
      setProjectLatitude(-19.471676);
      setProjectLongitude(-44.258735);
    } else if (contextLower.includes('uberlândia') || contextLower.includes('uberlandia')) {
      setProjectLatitude(typeof p.latitude === 'number' ? p.latitude : -18.9077034);
      setProjectLongitude(typeof p.longitude === 'number' ? p.longitude : -48.3258897);
    } else if (contextLower.includes('montes claros') || contextLower.includes('dangelis') || contextLower.includes('br 251')) {
      setProjectLatitude(typeof p.latitude === 'number' ? p.latitude : -16.657055);
      setProjectLongitude(typeof p.longitude === 'number' ? p.longitude : -43.740725);
    } else if (contextLower.includes('curvelo')) {
      setProjectLatitude(typeof p.latitude === 'number' ? p.latitude : -18.763554);
      setProjectLongitude(typeof p.longitude === 'number' ? p.longitude : -44.422256);
    } else if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
      setProjectLatitude(p.latitude);
      setProjectLongitude(p.longitude);
    }

    // 4. Sincronizar Categorias de Entrada e Carga Existente (sem herdar estado anterior)
    setCurrentStandardCategoryId(resolvedStdCat);
    if (p.entranceCategory && availableCategories[p.entranceCategory]) {
      setCustomHomologatedCategoryId(p.entranceCategory);
    } else if (isNewConn && availableCategories[resolvedStdCat]) {
      setCustomHomologatedCategoryId(resolvedStdCat);
    } else {
      setCustomHomologatedCategoryId(null);
    }

    const resolvedExistingLoadKW = Number(p.existingLoadKW ?? mergedClientData.demandaEstimadaHistoricoKW ?? 0) || 0;
    setManualExistingLoadKW(resolvedExistingLoadKW);

    if (isNewConn) {
      setLoadSourceMode('fatura');
    } else if (p.loadSourceMode) {
      setLoadSourceMode(p.loadSourceMode);
    } else if (p.attachedSheetsList?.length > 0 || p.smartMeterSummary) {
      setLoadSourceMode('smartmeter');
    } else {
      setLoadSourceMode('fatura');
    }

    // 5. Restaurar ou resetar parâmetros físicos e DLM
    setCircuitDistanceMeters(Number(p.distance) || 15);
    setInstallationMethod((p.installationMethod as any) || 'B1');
    setDlmEnableDLM(p.demandControlEnabled !== undefined ? Boolean(p.demandControlEnabled) : true);
    setDlmPeakDemandKW(resolvedExistingLoadKW);
    setDlmProfileType(p.dlmProfileType || (p.applicationMode === 'eletroposto_hub' ? 'edificio_comercial' : 'condominio_residencial'));
    setDlmChargeStartHour(p.dlmChargeStartHour !== undefined ? Number(p.dlmChargeStartHour) : 8);
    setDlmChargeDurationHours(p.dlmChargeDurationHours !== undefined ? Number(p.dlmChargeDurationHours) : 2);
    setDlmSimulationScenario(p.dlmSimulationScenario || 'current');
    setDlmEnableSolarSurplus(
      p.enableSolarSurplus !== undefined ? Boolean(p.enableSolarSurplus) :
      p.dlmEnableSolarSurplus !== undefined ? Boolean(p.dlmEnableSolarSurplus) :
      false
    );
    setDlmSolarPeakKW(
      typeof p.solarPeakKW === 'number' && p.solarPeakKW > 0 ? p.solarPeakKW :
      typeof p.dlmSolarPeakKW === 'number' && p.dlmSolarPeakKW > 0 ? p.dlmSolarPeakKW :
      25
    );
    setIsDlmLimitationAccepted(p.isDlmLimitationAccepted !== undefined ? Boolean(p.isDlmLimitationAccepted) : false);
    setDlmLimitedChargerPowerKW(p.dlmLimitedChargerPowerKW !== undefined ? p.dlmLimitedChargerPowerKW : null);
    setIsOutdoor(Boolean(p.isOutdoor));
    setCustomHourlyFactors(Array.isArray(p.customHourlyFactors) ? p.customHourlyFactors : Array(24).fill(1.0));
    setCustomProfileName(p.customProfileName || "Perfil do Projetista");
    setCommercialHub({
      forecastDailyCharges: 25,
      averageSessionMinutes: 35,
      peakConcentrationHours: [11, 12, 13, 17, 18, 19],
      hasCanopy: true,
      hasAutonomousPayment: true,
      ...(p.commercialHub || {})
    });

    // 6. Restaurar Planilhas de Medição e Histórico de Carga (com limpeza explícita se o projeto não tiver!)
    if (!isNewConn && Array.isArray(p.attachedSheetsList) && p.attachedSheetsList.length > 0) {
      setAttachedSheetsList(p.attachedSheetsList);
      setSmartMeterSummary(p.smartMeterSummary || null);
      setDailyPeaksState(Array.isArray(p.dailyPeaksState) ? p.dailyPeaksState : []);
      if (p.smartMeterSummary) {
        const realPoints = buildWorstCaseEnvelope24h(p.smartMeterSummary);
        setCustomCurvePoints(realPoints);
        setCustomCurveBackup(realPoints);
      } else {
        setCustomCurvePoints(null);
        setCustomCurveBackup(null);
      }
    } else if (!isNewConn && p.smartMeterSummary) {
      setAttachedSheetsList([]);
      setSmartMeterSummary(p.smartMeterSummary);
      setDailyPeaksState(Array.isArray(p.dailyPeaksState) ? p.dailyPeaksState : []);
      const realPoints = buildWorstCaseEnvelope24h(p.smartMeterSummary);
      setCustomCurvePoints(realPoints);
      setCustomCurveBackup(realPoints);
    } else {
      setAttachedSheetsList([]);
      setSmartMeterSummary(null);
      setDailyPeaksState([]);
      setCustomCurvePoints(null);
      setCustomCurveBackup(null);
    }
    setRealCurveExtractionMode(p.realCurveExtractionMode || 'worst_case_envelope');

    // 7. Restaurar ou Limpar Circuitos Customizados dos Painéis 220V e 380V
    try {
      if (Array.isArray(p.customCircuits220V) && p.customCircuits220V.length > 0) {
        localStorage.setItem('coenergygo_custom_circuits_220v', JSON.stringify(p.customCircuits220V));
      } else {
        localStorage.removeItem('coenergygo_custom_circuits_220v');
      }
      if (Array.isArray(p.customCircuits380V) && p.customCircuits380V.length > 0) {
        localStorage.setItem('coenergygo_custom_circuits_380v', JSON.stringify(p.customCircuits380V));
      } else {
        localStorage.removeItem('coenergygo_custom_circuits_380v');
      }
    } catch (e) {}

    // 8. Restaurar lista de carregadores do projeto
    let restoredChargersList: ConfiguredCharger[] = [];
    if (Array.isArray(p.configuredChargers) && p.configuredChargers.length > 0) {
      restoredChargersList = p.configuredChargers;
      setConfiguredChargers(p.configuredChargers);
    } else if (p.charger) {
      const kw = Number(p.charger.power) || 7.4;
      const phases = (Number(p.charger.phases) || (kw >= 11 ? 3 : 1)) as (1 | 3);
      const isDC = p.charger.type === 'DC' || kw >= 30;
      restoredChargersList = [{
        id: `ch-loaded-${p.id}`,
        name: p.charger.model || (isDC ? `${kw} kW Dispensador DC Rápido` : `${kw} kW Wallbox AC`),
        powerKW: kw,
        phases,
        voltage: Number(p.charger.voltage) || (phases === 3 ? 380 : 220),
        type: isDC ? 'DC' : 'AC',
        quantity: 1,
        connector: isDC ? 'CCS2' : 'Tipo 2',
        distanceMeters: 15,
        marginPercent: 10
      }];
      setConfiguredChargers(restoredChargersList);
    }

    // 9. Resetar e sincronizar store da topologia com isolamento total
    try {
      const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
      useEVTopologyStore.getState().resetToBlank();
      useEVTopologyStore.getState().syncFromProjectData({
        clientBaseLoadKW: resolvedExistingLoadKW,
        currentStandardCategory: resolvedStdCat,
        currentStandardBreakerA: Number(mergedClientData.fieldBreakerConfirmedA || mergedClientData.standardBreakerA || p.existingEntranceBreaker) || 63,
        gridSupplyVoltage: p.commercialHub?.gridSupplyVoltage ?? 220,
        section1DistanceM: mergedClientData.section1DistanceM,
        section1MarginPercent: mergedClientData.section1MarginPercent,
        section1ConductorMaterial: mergedClientData.section1ConductorMaterial,
        section1InstallationMethod: mergedClientData.section1InstallationMethod,
        section2DistanceM: mergedClientData.section2DistanceM,
        section2MarginPercent: mergedClientData.section2MarginPercent,
        section2ConductorMaterial: mergedClientData.section2ConductorMaterial,
        section2InstallationMethod: mergedClientData.section2InstallationMethod,
        section3DistanceM: mergedClientData.section3DistanceM,
        section3MarginPercent: mergedClientData.section3MarginPercent,
        section3ConductorMaterial: mergedClientData.section3ConductorMaterial,
        section3InstallationMethod: mergedClientData.section3InstallationMethod,
        customTransformerKVA: mergedClientData.customTransformerKVA,
        customTransformerEfficiencyPercent: mergedClientData.customTransformerEfficiencyPercent,
        customTransformerLossesKW: mergedClientData.customTransformerLossesKW,
        selectedLoads220V: mergedClientData.selectedLoads220V,
        selectedLoads380V: mergedClientData.selectedLoads380V,
        customCircuits220V: Array.isArray(p.customCircuits220V) ? p.customCircuits220V : [],
        customCircuits380V: Array.isArray(p.customCircuits380V) ? p.customCircuits380V : [],
        chargers: restoredChargersList.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          brand: ch.brand || 'WEG',
          model: ch.model || ch.name,
          powerKW: ch.powerKW,
          phases: ch.phases,
          voltageV: ch.voltage,
          currentInA: ch.currentInA || Math.round((ch.powerKW * 1000) / (ch.phases === 3 ? Math.sqrt(3) * ch.voltage * 0.98 : ch.voltage * 0.98)),
          connector: ch.connector,
          type: ch.type,
          distanceMeters: ch.distanceMeters ?? 15,
          marginPercent: ch.marginPercent ?? 10,
          conductorMaterial: ch.conductorMaterial ?? 'copper',
          installationMethod: ch.installationMethod ?? 'B1',
          internalLossesKW: ch.internalLossesKW,
          efficiencyPercent: ch.efficiencyPercent
        }))
      });
    } catch (err) {
      console.warn("Aviso ao sincronizar useEVTopologyStore no carregamento do projeto:", err);
    }

    // 9B. Restaurar e sincronizar overrides e edições manuais da Lista de Materiais Modular (BOM)
    const restoredOverrides = p.userBOMOverrides || p.clientProjectData?.userBOMOverrides || {};
    const restoredDeleted = p.deletedItemIds || p.clientProjectData?.deletedItemIds || [];
    const restoredCustomItems = p.customAddedItems || p.clientProjectData?.customAddedItems || [];
    const restoredLaborMode = p.laborMode || p.clientProjectData?.laborMode || 'TABELADO';
    const restoredLaborPercent = typeof p.laborPercent === 'number' ? p.laborPercent : (p.clientProjectData?.laborPercent ?? 25);
    const restoredBdiPercent = typeof p.globalBdiPercent === 'number' ? p.globalBdiPercent : (p.clientProjectData?.globalBdiPercent ?? 20);

    setBomUserOverrides(restoredOverrides);
    setBomDeletedItemIds(restoredDeleted);
    setBomCustomAddedItems(restoredCustomItems);
    setBomLaborMode(restoredLaborMode);
    setBomLaborPercent(restoredLaborPercent);
    setBomGlobalBdiPercent(restoredBdiPercent);

    try {
      localStorage.setItem('coenergygo_bom_user_overrides', JSON.stringify(restoredOverrides));
      localStorage.setItem('coenergygo_bom_deleted_items', JSON.stringify(restoredDeleted));
      localStorage.setItem('coenergygo_bom_custom_items', JSON.stringify(restoredCustomItems));
    } catch (e) {}

    // 9C. Restaurar premissas financeiras da Modelagem BLEV (Passo 5 / Foto 2)
    const rawFin = p.financialAssumptions || p.clientProjectData || {};
    if (rawFin.ahpTariffBRL !== undefined || rawFin.ahpEnergyCostBRL !== undefined) {
      try {
        localStorage.setItem('coenergygo_financial_assumptions', JSON.stringify({
          ahpTariffBRL: rawFin.ahpTariffBRL,
          ahpEnergyCostBRL: rawFin.ahpEnergyCostBRL,
          ahpSolarEnergyCostBRL: rawFin.ahpSolarEnergyCostBRL,
          ahpFixedOpexBRL: rawFin.ahpFixedOpexBRL,
          ahpVariableOpexPercent: rawFin.ahpVariableOpexPercent,
          ahpSessionMinutes: rawFin.ahpSessionMinutes,
          ahpCapexBRL: rawFin.ahpCapexBRL,
          ahpVdm: rawFin.ahpVdm,
          ahpFleetDensityPercent: rawFin.ahpFleetDensityPercent,
          ahpEnergySourceMode: rawFin.ahpEnergySourceMode,
          ahpSolarSharePercent: rawFin.ahpSolarSharePercent,
          ahpRealEstateModel: rawFin.ahpRealEstateModel,
          ahpRevenueSharePercent: rawFin.ahpRevenueSharePercent,
          ahpFixedRentBRL: rawFin.ahpFixedRentBRL,
          ahpUseAutoCapex: rawFin.ahpUseAutoCapex
        }));
      } catch (e) {}
    }

    // 10. Atualizar rascunho ativo imediatamente com o projeto carregado
    try {
      localStorage.setItem('coenergygo_active_draft', JSON.stringify({
        ...p,
        userBOMOverrides: restoredOverrides,
        deletedItemIds: restoredDeleted,
        customAddedItems: restoredCustomItems,
        laborMode: restoredLaborMode,
        laborPercent: restoredLaborPercent,
        globalBdiPercent: restoredBdiPercent,
        clientProjectData: {
          ...mergedClientData,
          userBOMOverrides: restoredOverrides,
          deletedItemIds: restoredDeleted,
          customAddedItems: restoredCustomItems,
          laborMode: restoredLaborMode,
          laborPercent: restoredLaborPercent,
          globalBdiPercent: restoredBdiPercent
        },
        configuredChargers: restoredChargersList
      }));
    } catch (e) {}

    setActiveTab('veiculos');
  };

  // ─── CARREGAMENTO DIRETO VIA QUERY PARAM (?loadId=...) ─────────────────────────────
  useEffect(() => {
    if (projects.length === 0 || typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const loadId = urlParams.get('loadId');
    if (loadId && !activeLoadedProjectId) {
      const targetProj = projects.find(p => p.id === loadId);
      if (targetProj) {
        handleLoadProjectIntoCoenergyGO(targetProj);
      }
    }
  }, [projects, activeLoadedProjectId]);

  const handleDeleteProject = async (id: string, projectName: string) => {
    if (!window.confirm(`Deseja realmente remover o projeto "${projectName}" do sistema?`)) {
      return;
    }
    const normName = (projectName || "").trim().toLowerCase();

    // 1. Remover do banco de dados remoto (passando id e projectName para limpar duplicatas)
    try {
      await fetch(`/api/ev/sizing/${id}?projectName=${encodeURIComponent(projectName)}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Aviso ao remover projeto do banco remoto:", err);
    }

    // 2. Remover do localStorage (por id e por projectName)
    try {
      const stored = localStorage.getItem('coenergygo_saved_projects');
      if (stored) {
        const list = JSON.parse(stored);
        const filtered = list.filter((x: any) => 
          x.id !== id && ((x.projectName || "").trim().toLowerCase() !== normName)
        );
        localStorage.setItem('coenergygo_saved_projects', JSON.stringify(filtered));
      }

      // Se for o rascunho ativo salvo, limpar também
      const draft = localStorage.getItem('coenergygo_active_draft');
      if (draft) {
        const d = JSON.parse(draft);
        if (d.id === id || ((d.projectName || "").trim().toLowerCase() === normName)) {
          localStorage.removeItem('coenergygo_active_draft');
        }
      }
    } catch (e) {
      console.warn("Aviso ao remover do localStorage:", e);
    }

    // 3. Remover do estado local e desmarcar projeto ativo se for ele
    setProjects(prev => prev.filter(p => 
      p.id !== id && ((p.projectName || "").trim().toLowerCase() !== normName)
    ));
    if (activeLoadedProjectId === id) {
      setActiveLoadedProjectId(null);
    }
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

      // Curva horária 24h: usa a Envoltória dos Piores Casos NBR 5410 da medição real consolidada
      const realPoints = buildWorstCaseEnvelope24h(compilation.consolidatedSummary);
      setCustomCurvePoints(realPoints);
      setCustomCurveBackup(realPoints);
      setDlmProfileType('smartmeter_real');
      setRealCurveExtractionMode('worst_case_envelope');

      // Preencher automaticamente as 24 caixas do editor do Passo 2 com os fatores reais
      const maxRealKW = Math.max(...realPoints.map((p: any) => p.baseLoadKW), 1);
      const calculatedFactors = realPoints.map((p: any) => Number((p.baseLoadKW / maxRealKW).toFixed(3)));
      setCustomHourlyFactors(calculatedFactors);

      setIsLoadingFile(false);
    } catch (err: any) {
      alert("Erro ao ler planilhas de medição: " + (err.message || "Formato inválido"));
      setIsLoadingFile(false);
    }
  };

  // Alternador da Estratégia de Extração de Curva Real (Envoltória vs Dia de Pico vs Média)
  const handleSelectRealCurveExtractionMode = (mode: RealCurveExtractionMode) => {
    setRealCurveExtractionMode(mode);
    setDlmProfileType('smartmeter_real');
    if (!smartMeterSummary) return;

    let pts: any[];
    if (mode === 'worst_day_peak') {
      const res = findWorstPeakDay24h(smartMeterSummary);
      pts = res.curve24h;
      setDlmPeakDemandKW(res.maxPowerKW);
    } else if (mode === 'average_real') {
      pts = buildAverageReal24h(smartMeterSummary);
      setDlmPeakDemandKW(smartMeterSummary.averagePowerKW);
    } else {
      pts = buildWorstCaseEnvelope24h(smartMeterSummary);
      setDlmPeakDemandKW(smartMeterSummary.maxPowerKW);
    }

    setCustomCurvePoints(pts);
    setCustomCurveBackup(pts);

    // Atualiza os fatores no editor 24h
    const maxVal = Math.max(...pts.map((p: any) => p.baseLoadKW), 1);
    const factors = pts.map((p: any) => Number((p.baseLoadKW / maxVal).toFixed(3)));
    setCustomHourlyFactors(factors);
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

4. GESTÃO DINÂMICA DLM & SISTEMAS DE MERCADO (Passo 2):
- Limite da Rede Configurado: ${effectiveDlmGridLimitKW} kW
- Carga Existente Medida (Pico): ${effectiveExistingLoadKW.toFixed(1)} kW ${smartMeterSummary ? '(via SmartMeter)' : '(Manual)'}
- Economia Estimada em Obras: R$ ${dlmResult.capexSavingsEstimateBRL.toLocaleString('pt-BR')}
- Ecossistema DLM Compatível: BENY DLB Box (Hardwired RS485 com TCs locais), WEG WEMOB DLM, Schneider LMS ou ABB Terra
- Faixa de Modulação Efetiva: 6A a 32A por conector (IEC 61851-1) com Watchdog Fail-Safe de 5s

5. INFRAESTRUTURA ELETROTÉCNICA & QGBT (Passo 3):
- Disjuntor Geral QGBT: ${infrastructureSizing.qgbtMainBreakerA}A Tripolar (Demanda QGBT: ${infrastructureSizing.qgbtTotalInstalledKW} kW)
- Transformador Dyn1: ${configuredChargers.some(c => c.voltage === 380 || c.powerKW >= 22) ? `Instalado a Seco ${infrastructureSizing.transformerRecommendation.recommendedKVA || 75} kVA 220V/380V Dyn1 com Proteção Primária Curva D, Neutro Aterrado no BEP e Proibição TN-C a Jusante (NBR 17019 item 722.312.2)` : 'Dispensado (Atendimento direto na tensão de rede)'}
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
    const projectId = customId || activeLoadedProjectId || `proj-coenergygo-${Date.now()}`;

    return {
      id: projectId,
      projectName: resolvedProjectName,
      clientName: resolvedClientName,
      clientDocument: clientProjectData.installationNumber ? `Instalação CEMIG: ${clientProjectData.installationNumber}` : "",
      clientPhone: clientProjectData.clientPhone || "",
      clientEmail: clientProjectData.clientEmail || "",
      clientAddress: clientProjectData.address || "",
      latitude: projectLatitude,
      longitude: projectLongitude,
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
      loadSourceMode: loadSourceMode,
      realCurveExtractionMode: realCurveExtractionMode,
      isCollective: applicationMode !== 'individual',
      isOutdoor: isOutdoor,
      demandControlEnabled: dlmEnableDLM,
      demandControlLimit: effectiveDlmGridLimitKW,
      enableSolarSurplus: dlmEnableSolarSurplus,
      dlmEnableSolarSurplus: dlmEnableSolarSurplus,
      solarPeakKW: dlmSolarPeakKW,
      dlmSolarPeakKW: dlmSolarPeakKW,
      isDlmLimitationAccepted: isDlmLimitationAccepted,
      dlmLimitedChargerPowerKW: dlmLimitedChargerPowerKW,
      customHomologatedCategoryId: customHomologatedCategoryId,
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
      attachedSheetsList: attachedSheetsList,
      smartMeterSummary: smartMeterSummary,
      dailyPeaksState: dailyPeaksState,
      customCircuits220V: (() => {
        try {
          const s = localStorage.getItem('coenergygo_custom_circuits_220v');
          return s ? JSON.parse(s) : [];
        } catch (e) {
          return [];
        }
      })(),
      customCircuits380V: (() => {
        try {
          const s = localStorage.getItem('coenergygo_custom_circuits_380v');
          return s ? JSON.parse(s) : [];
        } catch (e) {
          return [];
        }
      })(),
      section1DistanceM: clientProjectData.section1DistanceM,
      section1MarginPercent: clientProjectData.section1MarginPercent,
      section1ConductorMaterial: clientProjectData.section1ConductorMaterial,
      section1InstallationMethod: clientProjectData.section1InstallationMethod,
      section2DistanceM: clientProjectData.section2DistanceM,
      section2MarginPercent: clientProjectData.section2MarginPercent,
      section2ConductorMaterial: clientProjectData.section2ConductorMaterial,
      section2InstallationMethod: clientProjectData.section2InstallationMethod,
      section3DistanceM: clientProjectData.section3DistanceM,
      section3MarginPercent: clientProjectData.section3MarginPercent,
      section3ConductorMaterial: clientProjectData.section3ConductorMaterial,
      section3InstallationMethod: clientProjectData.section3InstallationMethod,
      customTransformerKVA: clientProjectData.customTransformerKVA,
      customTransformerEfficiencyPercent: clientProjectData.customTransformerEfficiencyPercent,
      customTransformerLossesKW: clientProjectData.customTransformerLossesKW,
      standardTerminalType: clientProjectData.standardTerminalType || 'COMPRESSAO_OLHAL',
      selectedLoads220V: (() => {
        try {
          const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
          return useEVTopologyStore.getState().selectedLoads220V || clientProjectData.selectedLoads220V;
        } catch (e) {
          return clientProjectData.selectedLoads220V;
        }
      })(),
      selectedLoads380V: (() => {
        try {
          const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
          return useEVTopologyStore.getState().selectedLoads380V || clientProjectData.selectedLoads380V;
        } catch (e) {
          return clientProjectData.selectedLoads380V;
        }
      })(),
      userBOMOverrides: bomUserOverrides,
      deletedItemIds: bomDeletedItemIds,
      customAddedItems: bomCustomAddedItems,
      laborMode: bomLaborMode,
      laborPercent: bomLaborPercent,
      globalBdiPercent: bomGlobalBdiPercent,
      financialAssumptions: (() => {
        try {
          const s = localStorage.getItem('coenergygo_financial_assumptions');
          return s ? JSON.parse(s) : null;
        } catch (e) {
          return null;
        }
      })(),
      clientProjectData: {
        ...clientProjectData,
        ...(() => {
          try {
            const s = localStorage.getItem('coenergygo_financial_assumptions');
            return s ? JSON.parse(s) : {};
          } catch (e) {
            return {};
          }
        })(),
        projectName: resolvedProjectName,
        clientName: resolvedClientName,
        standardCategory: clientProjectData.standardCategory || currentStandardCategoryId,
        applicationMode: applicationMode,
        userBOMOverrides: bomUserOverrides,
        deletedItemIds: bomDeletedItemIds,
        customAddedItems: bomCustomAddedItems,
        laborMode: bomLaborMode,
        laborPercent: bomLaborPercent,
        globalBdiPercent: bomGlobalBdiPercent,
        selectedLoads220V: (() => {
          try {
            const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
            return useEVTopologyStore.getState().selectedLoads220V || clientProjectData.selectedLoads220V;
          } catch (e) {
            return clientProjectData.selectedLoads220V;
          }
        })(),
        selectedLoads380V: (() => {
          try {
            const { useEVTopologyStore } = require('@/lib/coenergygo/store/useEVTopologyStore');
            return useEVTopologyStore.getState().selectedLoads380V || clientProjectData.selectedLoads380V;
          } catch (e) {
            return clientProjectData.selectedLoads380V;
          }
        })()
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

  // Auto-Save silencioso automático disparado ao mudar de passo (salva APENAS se houver dados preenchidos)
  const handleAutoSaveSnapshot = () => {
    // Evita criar rascunho de tela em branco sem nenhum dado
    if (!clientProjectData.projectName && !clientProjectData.clientName && !clientProjectData.address && !clientProjectData.utilityBillFileName) {
      return;
    }
    try {
      const snapshot = buildCurrentProjectSnapshot('proj-auto-saved-current');
      localStorage.setItem('coenergygo_active_draft', JSON.stringify(snapshot));
    } catch (e) {
      console.warn("Auto-save snapshot aviso:", e);
    }
  };

  // Navegação protegida entre abas com auto-save automático
  const handleTabChange = (nextTab: 'projetos' | 'viabilidade' | 'veiculos' | 'concessionarias' | 'nbr17019' | 'curva_dlm' | 'infraestrutura' | 'resultado' | 'modelagem_financeira') => {
    handleAutoSaveSnapshot();
    setActiveTab(nextTab);
  };

  const handleApplyAHPToProject = (data: {
    powerKW: number;
    commercialAnchor: any;
    vdm: number;
    fleetDensity: number;
    fleetCount?: number;
    gridCategory: any;
    isVerticalHousing?: boolean;
    tariffBRL?: number;
    energyCostBRL?: number;
    capexBRL?: number;
    sessionMinutes?: number;
    dailySessionsRealistic?: number;
    totalScore?: number;
    rating?: string;
    recommendation: string;
    niche?: any;
    cityKey?: string;
    cityTotalVehicles?: number;
    cityEvVehicles?: number;
    corridorFactor?: number;
    fleetSourceMode?: 'censo_municipal' | 'manual_override';
    vdmSourceMode?: 'osm_hcm' | 'dnit_corridor' | 'field_count' | 'manual_override';
    roadHierarchy?: string;
    roadLanes?: number;
    roadOneway?: boolean;
    corridorPresetKey?: string;
    fieldCountVehicles?: number;
    fieldCountMinutes?: number;
    fieldKFactor?: number;
    fieldDirectionMode?: 'ambos_sem_canteiro' | 'um_sentido_mao_dupla' | 'ambos_com_canteiro' | 'sentido_porta';
  }) => {
    // 1. Sincronizar Modo da Aplicação conforme o Nicho AHP
    const nextAppMode: ApplicationMode =
      data.niche === 'residential'
        ? 'individual'
        : data.niche === 'fleet_depot'
        ? 'condominio_frota'
        : 'eletroposto_hub';
    setApplicationMode(nextAppMode);

    // 2. Sincronizar Dados Operacionais de Demanda (Passo 2 - Curva 24h & DLM)
    const nextCommercialHub = {
      ...commercialHub,
      forecastDailyCharges: Math.max(1, Math.round(data.dailySessionsRealistic || 10)),
      averageSessionMinutes: data.sessionMinutes || 35
    };
    setCommercialHub(nextCommercialHub);

    // 3. Persistir todos os parâmetros AHP dentro de clientProjectData (VDM, % Frota, Âncora, Tarifas, Score)
    const isNewConnFromAhp =
      data.gridCategory === 'ligacao_nova_bt' || data.gridCategory === 'ligacao_nova_mt'
        ? true
        : clientProjectData.isNewConnection;

    const updatedClientData: ClientProjectData = {
      ...clientProjectData,
      applicationMode: nextAppMode,
      isNewConnection: isNewConnFromAhp,
      hasExistingStandard: !isNewConnFromAhp,
      ahpNiche: data.niche,
      ahpVdm: data.vdm,
      ahpFleetDensityPercent: data.fleetDensity,
      ahpFleetCount: data.fleetCount,
      ahpCommercialAnchor: data.commercialAnchor,
      ahpGridCategory: data.gridCategory,
      ahpIsVerticalHousing: data.isVerticalHousing,
      ahpTariffBRL: data.tariffBRL,
      ahpEnergyCostBRL: data.energyCostBRL,
      ahpCapexBRL: data.capexBRL,
      ahpSessionMinutes: data.sessionMinutes,
      ahpTotalScore: data.totalScore,
      ahpRating: data.rating,
      ahpCityKey: data.cityKey,
      ahpCityTotalVehicles: data.cityTotalVehicles,
      ahpCityEvVehicles: data.cityEvVehicles,
      ahpCorridorFactor: data.corridorFactor,
      ahpFleetSourceMode: data.fleetSourceMode,
      ahpVdmSourceMode: data.vdmSourceMode,
      ahpRoadHierarchy: data.roadHierarchy,
      ahpRoadLanes: data.roadLanes,
      ahpRoadOneway: data.roadOneway,
      ahpCorridorPresetKey: data.corridorPresetKey,
      ahpFieldCountVehicles: data.fieldCountVehicles,
      ahpFieldCountMinutes: data.fieldCountMinutes,
      ahpFieldKFactor: data.fieldKFactor,
      ahpFieldDirectionMode: data.fieldDirectionMode
    };
    setClientProjectData(updatedClientData);

    // 4. Atualizar Carregadores APENAS se o usuário alterou a potência no Cockpit AHP (preserva 80 kW se não mudou!)
    let nextChargers = configuredChargers;
    if (Math.abs(totalChargersInstalledKW - data.powerKW) >= 1) {
      if (data.powerKW >= 120) {
        nextChargers = [
          {
            id: "chg_dc_120kw",
            name: "BENY BDC-120KW Estação Ultrarrápida",
            brand: "BENY",
            model: "BDC-120KW",
            powerKW: data.powerKW,
            phases: 3,
            voltage: 380,
            type: "DC",
            quantity: 1,
            connector: "CCS2 + CHAdeMO",
            currentInA: Math.round((data.powerKW * 1000) / (Math.sqrt(3) * 380 * 0.96)),
            hasBuiltinRDCDD: true
          }
        ];
      } else if (data.powerKW >= 60) {
        nextChargers = [
          {
            id: `chg_dc_${data.powerKW}kw`,
            name: `BENY BDC-${data.powerKW}KW Rápido`,
            brand: "BENY",
            model: `BDC-${data.powerKW}KW`,
            powerKW: data.powerKW,
            phases: 3,
            voltage: 380,
            type: "DC",
            quantity: 1,
            connector: "CCS2",
            currentInA: Math.round((data.powerKW * 1000) / (Math.sqrt(3) * 380 * 0.96)),
            hasBuiltinRDCDD: true
          }
        ];
      } else {
        nextChargers = [
          {
            id: "chg_ac_22kw",
            name: "BENY BCP-A2N-L 22kW",
            brand: "BENY",
            model: "BCP-A2N-L",
            powerKW: 22,
            phases: 3,
            voltage: 380,
            type: "AC",
            quantity: Math.max(1, Math.round(data.powerKW / 22)),
            connector: "Tipo 2",
            currentInA: 32,
            hasBuiltinRDCDD: true
          }
        ];
      }
      setConfiguredChargers(nextChargers);
    }

    // 5. Salvar imediatamente no Estado dos Projetos, LocalStorage e Banco de Dados
    try {
      const baseSnap = buildCurrentProjectSnapshot(activeLoadedProjectId || undefined);
      const enrichedSnap = {
        ...baseSnap,
        applicationMode: nextAppMode,
        totalPowerKW: data.powerKW,
        configuredChargers: nextChargers,
        commercialHub: nextCommercialHub,
        clientProjectData: updatedClientData
      };

      localStorage.setItem('coenergygo_active_draft', JSON.stringify(enrichedSnap));

      const normName = (enrichedSnap.projectName || "").trim().toLowerCase();
      setProjects(prev =>
        prev.map(p =>
          p.id === enrichedSnap.id || ((p.projectName || "").trim().toLowerCase() === normName)
            ? { ...p, ...enrichedSnap, clientProjectData: updatedClientData }
            : p
        )
      );

      const stored = localStorage.getItem('coenergygo_saved_projects');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          const updatedList = list.map((x: any) =>
            x.id === enrichedSnap.id || ((x.projectName || "").trim().toLowerCase() === normName)
              ? { ...x, ...enrichedSnap, clientProjectData: updatedClientData }
              : x
          );
          localStorage.setItem('coenergygo_saved_projects', JSON.stringify(updatedList));
        }
      }

      if (activeLoadedProjectId && !activeLoadedProjectId.startsWith('proj-')) {
        fetch(`/api/ev/sizing/${activeLoadedProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: enrichedSnap.projectName,
            clientName: enrichedSnap.clientName,
            clientAddress: enrichedSnap.clientAddress,
            utility: selectedUtility,
            entranceCategory: effectiveHomologatedCategory.categoryId,
            existingEntranceCategory: currentStandardCategoryId,
            existingLoadKW: effectiveExistingLoadKW,
            chargerPowerKW: data.powerKW,
            analysisNotes: JSON.stringify({
              isCoenergyGOSnapshot: true,
              ...enrichedSnap
            })
          })
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Aviso ao persistir dados AHP:", e);
    }

    setSaveSuccessMessage(
      `Parâmetros AHP salvos no projeto "${clientProjectData.projectName || 'Ativo'}": VDM ${data.vdm.toLocaleString('pt-BR')} veíc/dia, Frota VE ${data.fleetDensity}%, Âncora "${data.commercialAnchor}" e ${Math.round(data.dailySessionsRealistic || 10)} recargas/dia sincronizados!`
    );
    setTimeout(() => setSaveSuccessMessage(null), 6000);
  };

  // ─── MOTOR DE CÁLCULO UNIFICADO (SINGLE SOURCE OF TRUTH) ───────────────────
  const unifiedCalculation = useMemo(() => {
    return calculateUnifiedEVSizing({
      chargers: configuredChargers.map(c => ({
        id: c.id,
        powerKW: c.powerKW,
        phases: (c.phases as 1 | 3) || 3,
        voltage: c.voltage || 380,
        quantity: c.quantity || 1,
        type: c.type,
        connector: c.connector,
        currentInA: c.currentInA,
        brand: c.brand,
        model: c.model,
        hasBuiltinRDCDD: c.hasBuiltinRDCDD
      })),
      existingLoadKW: effectiveExistingLoadKW || 0,
      simultaneityFactor: utilityAnalysis.simultaneityFactorApplied || 0.85,
      utility: (selectedUtility as any) || 'CEMIG',
      distanceMeters: circuitDistanceMeters || 25,
      existingBreakerA: effectiveBreakerAmpsForSizing || fieldBreakerAmps || 63,
      existingContractedDemandKW: effectiveBreakerCapacityKW || effectiveDlmGridLimitKW || 86,
      dlmEnabled: dlmEnableDLM,
      dlmLimitKW: effectiveDlmGridLimitKW || 0,
      hasTransformer: Boolean(clientProjectData.customTransformerKVA && clientProjectData.customTransformerKVA > 0),
      transformerPrimaryVoltage: 220,
      transformerSecondaryVoltage: 380
    });
  }, [
    configuredChargers,
    effectiveExistingLoadKW,
    utilityAnalysis.simultaneityFactorApplied,
    selectedUtility,
    circuitDistanceMeters,
    fieldBreakerAmps,
    dlmEnableDLM,
    effectiveDlmGridLimitKW,
    clientProjectData.customTransformerKVA
  ]);

  const handleSaveCurrentProject = async () => {
    try {
      setSavingProject(true);
      setSaveSuccessMessage(null);

      const resolvedProjectName = clientProjectData.projectName || projectName || "Novo Dimensionamento VE";
      const resolvedClientName = clientProjectData.clientName || clientName || "Cliente Particular";
      const fullProjectSnapshot = buildCurrentProjectSnapshot();

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
        cosPhi: 0.98,
        analysisNotes: JSON.stringify({
          isCoenergyGOSnapshot: true,
          ...fullProjectSnapshot
        })
      };

      // Verifica se já existe um projeto no banco com o mesmo id ou mesmo nome
      const normName = resolvedProjectName.trim().toLowerCase();
      const existingProjectInList = projects.find(p => 
        (activeLoadedProjectId && p.id === activeLoadedProjectId) ||
        ((p.projectName || "").trim().toLowerCase() === normName)
      );

      const targetDbId = existingProjectInList && !existingProjectInList.id.startsWith('proj-')
        ? existingProjectInList.id
        : (activeLoadedProjectId && !activeLoadedProjectId.startsWith('proj-') ? activeLoadedProjectId : null);

      const url = targetDbId ? `/api/ev/sizing/${targetDbId}` : "/api/ev/sizing";
      const method = targetDbId ? "PUT" : "POST";

      let savedProject: any = null;

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.project) {
            savedProject = data.project;
          }
        } else {
          console.warn("Aviso: Falha ao persistir no banco remoto, mas o projeto foi salvo localmente.");
        }
      } catch (netErr) {
        console.warn("Aviso de rede: Sincronização remota pendente:", netErr);
      }

      // Se retornou do banco, usa o id oficial; caso contrário, usa o id do snapshot
      const finalId = savedProject?.id || targetDbId || fullProjectSnapshot.id;
      setActiveLoadedProjectId(finalId);

      const mergedProject = {
        ...fullProjectSnapshot,
        ...(savedProject || {}),
        id: finalId,
        projectName: resolvedProjectName,
        clientName: resolvedClientName
      };

      // Atualiza o estado da lista no React deduplicando rigorosamente por ID e por Nome
      setProjects(prev => [
        mergedProject,
        ...prev.filter(p => 
          p.id !== finalId && 
          p.id !== fullProjectSnapshot.id && 
          ((p.projectName || "").trim().toLowerCase() !== normName)
        )
      ]);

      // Atualiza o localStorage deduplicando
      try {
        const stored = localStorage.getItem('coenergygo_saved_projects');
        const list = stored ? JSON.parse(stored) : [];
        const updatedList = [
          mergedProject,
          ...list.filter((x: any) => 
            x.id !== finalId && 
            x.id !== fullProjectSnapshot.id && 
            x.id !== 'proj-auto-saved-current' && 
            ((x.projectName || "").trim().toLowerCase() !== normName)
          )
        ];
        localStorage.setItem('coenergygo_saved_projects', JSON.stringify(updatedList));
        localStorage.setItem('coenergygo_active_draft', JSON.stringify(mergedProject));
      } catch (err) {
        console.warn("Aviso ao salvar snapshot no localStorage:", err);
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
                onClick={() => setShowSolicitarMaterialModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-4 py-3 rounded-2xl flex items-center gap-2 border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Solicitar inclusão de novo material ao catálogo master com notificação para compras"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Solicitar Insumo (Compras)</span>
              </button>
              <button
                onClick={handleStartNewProject}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-3 rounded-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Iniciar Novo Projeto em Branco (Limpar todos os dados)"
              >
                <Plus className="w-4 h-4" />
                Novo Projeto
              </button>
              <button
                onClick={handleSaveCurrentProject}
                disabled={savingProject}
                className="bg-gradient-to-r from-[#00B356] to-[#009447] text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] transition-all font-bold text-sm cursor-pointer disabled:opacity-60"
                title="Salvar Projeto e Lista de Materiais no Banco de Dados"
              >
                {savingProject ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Projeto
                  </>
                )}
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
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>Passo 1A: Cliente, Fatura & Carregadores</span>
              <span className="bg-slate-900/60 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{totalChargersCount} pts</span>
            </button>

            <button
              onClick={() => handleTabChange('viabilidade')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'viabilidade'
                  ? 'bg-gradient-to-r from-[#E45318] to-orange-600 text-white shadow-sm ring-1 ring-orange-400 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Compass className="w-4 h-4 text-orange-300" />
              <span>Passo 1B: Viabilidade Locacional AHP</span>
              <span className="bg-slate-900/60 text-[9px] px-1.5 py-0.5 rounded-full font-bold">AHP</span>
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
              <span>Passo 2A: Concessionárias & Padrão</span>
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
              <span>Passo 2B: NBR 17019 & Bombeiros</span>
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
              <span>Passo 3: Curva de Carga & DLM</span>
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
              <span>Passo 4A: Infra & SmartMeter</span>
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
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Passo 4B: Lista de Materiais & Orçamentos (CAPEX)</span>
            </button>

            <button
              onClick={() => handleTabChange('modelagem_financeira')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'modelagem_financeira'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-[#00B356] text-white shadow-md font-black shadow-emerald-900/30 ring-2 ring-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-300" />
              <span>Passo 5: Modelagem Financeira & 3 Cenários (BLEV)</span>
            </button>

            <button
              onClick={() => setShowEngineeringReportsHubModal(true)}
              className="px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 bg-[#00B356] hover:bg-emerald-600 text-white shadow-md shadow-emerald-900/30 cursor-pointer border border-emerald-400/40"
              title="Emissão dos 5 Relatórios de Engenharia do Pilar 4 (Executivo, Memorial Descritivo, Cálculo NBR 5410, Caderno de Obra e Comissionamento)"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Relatórios Oficiais (5 em 1)</span>
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

      {/* ─── TAB: PASSO 1B: VIABILIDADE LOCACIONAL AHP & CONCORRENTES GEOESPACIAIS ─── */}
      {activeTab === 'viabilidade' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <EVLocationScoringCockpit
            projectId={activeLoadedProjectId}
            projectName={clientProjectData.projectName || projectName || "Novo Projeto de Recarga"}
            initialAddress={clientProjectData.address || "Endereço a definir"}
            initialNiche={(clientProjectData.ahpNiche as any) || (applicationMode === 'individual' ? 'residential' : applicationMode === 'condominio_frota' ? 'fleet_depot' : 'urban_hub')}
            initialLatitude={projectLatitude}
            initialLongitude={projectLongitude}
            utility={selectedUtility}
            installationNumber={clientProjectData.installationNumber}
            standardCategory={clientProjectData.isNewConnection ? (clientProjectData.standardCategory || clientProjectData.targetNewCategory || effectiveHomologatedCategory.categoryId) : currentStandardCategoryId}
            standardBreakerA={effectiveBreakerAmpsForSizing}
            projectAvailablePowerKW={effectiveBreakerCapacityKW}
            projectExistingLoadKW={effectiveExistingLoadKW}
            projectHeadroomKW={Math.max(0, Number((effectiveBreakerCapacityKW - effectiveExistingLoadKW).toFixed(1)))}
            projectChargerPowerKW={totalChargersInstalledKW}
            projectChargerDescription={configuredChargers.map(c => `${c.quantity}x ${c.name} (${c.powerKW} kW)`).join(' + ')}
            projectTotalCapexBRL={Math.round(totalEstimatedBOMCost + (totalChargersInstalledKW * 950))}
            isNewConnection={clientProjectData.isNewConnection || false}
            targetNewCategory={clientProjectData.standardCategory || clientProjectData.targetNewCategory || "C3"}
            isExistingStandardAdequate={utilityAnalysis.isExistingStandardAdequate}
            savedNiche={clientProjectData.ahpNiche as any}
            savedVdm={clientProjectData.ahpVdm}
            savedFleetDensity={clientProjectData.ahpFleetDensityPercent}
            savedFleetCount={clientProjectData.ahpFleetCount}
            savedAnchor={clientProjectData.ahpCommercialAnchor as any}
            savedGridCategory={clientProjectData.ahpGridCategory as any}
            savedIsVerticalHousing={clientProjectData.ahpIsVerticalHousing}
            savedTariffBRL={clientProjectData.ahpTariffBRL}
            savedEnergyCostBRL={clientProjectData.ahpEnergyCostBRL}
            savedCapexBRL={clientProjectData.ahpCapexBRL}
            savedSessionMinutes={clientProjectData.ahpSessionMinutes}
            savedCityKey={clientProjectData.ahpCityKey}
            savedCityTotalVehicles={clientProjectData.ahpCityTotalVehicles}
            savedCityEvVehicles={clientProjectData.ahpCityEvVehicles}
            savedCorridorFactor={clientProjectData.ahpCorridorFactor}
            savedFleetSourceMode={clientProjectData.ahpFleetSourceMode}
            savedVdmSourceMode={clientProjectData.ahpVdmSourceMode}
            savedRoadHierarchy={clientProjectData.ahpRoadHierarchy as any}
            savedRoadLanes={clientProjectData.ahpRoadLanes}
            savedRoadOneway={clientProjectData.ahpRoadOneway}
            savedCorridorPresetKey={clientProjectData.ahpCorridorPresetKey}
            savedFieldCountVehicles={clientProjectData.ahpFieldCountVehicles}
            savedFieldCountMinutes={clientProjectData.ahpFieldCountMinutes}
            savedFieldKFactor={clientProjectData.ahpFieldKFactor}
            savedFieldDirectionMode={clientProjectData.ahpFieldDirectionMode}
            savedSolarEnergyCostBRL={clientProjectData.ahpSolarEnergyCostBRL ?? commercialHub.solarEnergyCostPerKWh ?? 0.39}
            savedEnergySourceMode={clientProjectData.ahpEnergySourceMode ?? commercialHub.energySourceMode ?? 'concessionaria'}
            savedSolarSharePercent={clientProjectData.ahpSolarSharePercent ?? commercialHub.solarSharePercent ?? 50}
            savedRealEstateModel={clientProjectData.ahpRealEstateModel ?? commercialHub.realEstateModel ?? 'comodato'}
            savedRevenueSharePercent={clientProjectData.ahpRevenueSharePercent ?? commercialHub.realEstateRevenueSharePercent ?? 10}
            savedFixedRentBRL={clientProjectData.ahpFixedRentBRL ?? commercialHub.realEstateFixedRentBRL ?? 500}
            savedVariableOpexPercent={clientProjectData.ahpVariableOpexPercent ?? commercialHub.variableOpexPercent ?? 12}
            savedFixedOpexBRL={clientProjectData.ahpFixedOpexBRL ?? commercialHub.fixedOpexPerPointBRL ?? 350}
            savedCustomRealEstateModels={clientProjectData.ahpCustomRealEstateModels ?? commercialHub.customRealEstateModels ?? []}
            savedCustomCompetitors={clientProjectData.ahpCustomCompetitors || []}
            onAhpStateChange={(upd) => {
              setClientProjectData(prev => ({ ...prev, ...upd }));
              setCommercialHub(prev => ({
                ...prev,
                ...(upd.ahpTariffBRL !== undefined ? { sellingPricePerKWh: upd.ahpTariffBRL } : {}),
                ...(upd.ahpEnergyCostBRL !== undefined ? { gridEnergyCostPerKWh: upd.ahpEnergyCostBRL } : {}),
                ...(upd.ahpSolarEnergyCostBRL !== undefined ? { solarEnergyCostPerKWh: upd.ahpSolarEnergyCostBRL } : {}),
                ...(upd.ahpEnergySourceMode !== undefined ? { energySourceMode: upd.ahpEnergySourceMode } : {}),
                ...(upd.ahpSolarSharePercent !== undefined ? { solarSharePercent: upd.ahpSolarSharePercent } : {}),
                ...(upd.ahpRealEstateModel !== undefined ? { realEstateModel: upd.ahpRealEstateModel } : {}),
                ...(upd.ahpRevenueSharePercent !== undefined ? { realEstateRevenueSharePercent: upd.ahpRevenueSharePercent } : {}),
                ...(upd.ahpFixedRentBRL !== undefined ? { realEstateFixedRentBRL: upd.ahpFixedRentBRL } : {}),
                ...(upd.ahpVariableOpexPercent !== undefined ? { variableOpexPercent: upd.ahpVariableOpexPercent } : {}),
                ...(upd.ahpFixedOpexBRL !== undefined ? { fixedOpexPerPointBRL: upd.ahpFixedOpexBRL } : {}),
                ...(upd.ahpCustomRealEstateModels !== undefined ? { customRealEstateModels: upd.ahpCustomRealEstateModels } : {})
              }));
            }}
            onApplyToProject={handleApplyAHPToProject}
            onCoordinatesChange={(coords) => {
              setProjectLatitude(coords.lat);
              setProjectLongitude(coords.lon);
              if (coords.address) {
                setClientProjectData(prev => ({ ...prev, address: coords.address }));
              }
            }}
          />

        </div>
      )}

      {/* ─── TAB: PASSO 1A: CLIENTE, AMBIENTE & CARREGADORES HOMOLOGADOS ─── */}
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
            onCommercialHubChange={(upd) => {
              setCommercialHub(prev => ({ ...prev, ...upd }));
              setClientProjectData(prev => ({
                ...prev,
                ...(upd.sellingPricePerKWh !== undefined ? { ahpTariffBRL: upd.sellingPricePerKWh } : {}),
                ...(upd.gridEnergyCostPerKWh !== undefined ? { ahpEnergyCostBRL: upd.gridEnergyCostPerKWh } : {}),
                ...(upd.solarEnergyCostPerKWh !== undefined ? { ahpSolarEnergyCostBRL: upd.solarEnergyCostPerKWh } : {}),
                ...(upd.energySourceMode !== undefined ? { ahpEnergySourceMode: upd.energySourceMode } : {}),
                ...(upd.solarSharePercent !== undefined ? { ahpSolarSharePercent: upd.solarSharePercent } : {}),
                ...(upd.realEstateModel !== undefined ? { ahpRealEstateModel: upd.realEstateModel } : {}),
                ...(upd.realEstateRevenueSharePercent !== undefined ? { ahpRevenueSharePercent: upd.realEstateRevenueSharePercent } : {}),
                ...(upd.realEstateFixedRentBRL !== undefined ? { ahpFixedRentBRL: upd.realEstateFixedRentBRL } : {}),
                ...(upd.variableOpexPercent !== undefined ? { ahpVariableOpexPercent: upd.variableOpexPercent } : {}),
                ...(upd.fixedOpexPerPointBRL !== undefined ? { ahpFixedOpexBRL: upd.fixedOpexPerPointBRL } : {}),
                ...(upd.customRealEstateModels !== undefined ? { ahpCustomRealEstateModels: upd.customRealEstateModels } : {})
              }));
            }}
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
                      Padrão Físico: {fieldPhases} • Disjuntor {fieldBreakerAmps}A • Cabos {clientProjectData.fieldCableGaugeMM2 || 10} mm²
                      {fieldBreakerAmps === 200 ? (
                        <span className="text-xs font-mono font-bold text-blue-700 ml-1">
                          (75 kW Normativo CEMIG C6 | 72,4 kW Térmico @ FP 0,95)
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-600 ml-1">
                          ({fieldCalculatedLimitKW} kW em 220V)
                        </span>
                      )}
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
                              onClick={() => {
                                try {
                                  const bytes = exportLoadSummaryToExcel(smartMeterSummary, dailyPeaksState);
                                  const blob = new Blob([bytes as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  const cleanFileName = smartMeterSummary.fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                                  a.download = cleanFileName.endsWith('.xlsx') ? cleanFileName : `${cleanFileName}.xlsx`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                } catch (err: any) {
                                  alert("Erro ao baixar planilha: " + err.message);
                                }
                              }}
                              className="text-emerald-700 hover:text-emerald-950 p-1 hover:bg-emerald-100 rounded cursor-pointer transition-colors"
                              title="Baixar planilha de medição em Excel (.xlsx)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAllSheets}
                              className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded cursor-pointer transition-colors"
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

                        {/* Lista Discriminada de Planilhas Anexadas */}
                        {attachedSheetsList.length > 0 && (
                          <div className="pt-2 border-t border-emerald-200/60 space-y-1">
                            <span className="text-[9px] font-bold uppercase text-emerald-900 block">
                              Planilhas Processadas ({attachedSheetsList.length}):
                            </span>
                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                              {attachedSheetsList.map((sheet, sIdx) => (
                                <div key={sheet.id || sIdx} className="flex items-center justify-between bg-white/80 px-2 py-1 rounded text-[10px] border border-emerald-200">
                                  <div className="truncate max-w-[170px]">
                                    <span className="font-semibold text-slate-800 block truncate">{sheet.name}</span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      Pico: {sheet.summary?.maxPowerKW?.toFixed(1)} kW • {sheet.summary?.totalReadings} leituras
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttachedSheet(sheet.id)}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                                    title={`Remover planilha ${sheet.name}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setManualExistingLoadKW(val);
                          setClientProjectData(prev => ({
                            ...prev,
                            demandaEstimadaHistoricoKW: val,
                            existingLoadKW: val
                          }));
                        }}
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
                  {smartMeterSummary ? ` (Medição ativa: ${smartMeterSummary.fileName} • Pico ${smartMeterSummary.maxPowerKW.toFixed(2)} kW)` : ' (Você também pode carregar memória de massa diretamente aqui ou no Passo 2)'}
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
              const currentStandardMaxKW = utilityAnalysis.currentCategory?.maxLimitKW || 75;
              const nominalSumKW = Number((totalChargersInstalledKW + effectiveExistingLoadKW + totalAuxiliaryPowerKW).toFixed(1));
              const diversifiedSumKW = Number((utilityAnalysis.totalInstallationLoadKW + totalAuxiliaryPowerKW).toFixed(1));
              const surplusKW = Number((currentStandardMaxKW - diversifiedSumKW).toFixed(1));
              // Só exige DLM para permanecer no padrão atual se a carga nominal bruta superar o limite do padrão escolhido (ex: > 86 kW no F1 ou > 75 kW no C6), mas a carga diversificada couber
              const isExceedingChosenStandardWithoutDLM = nominalSumKW > currentStandardMaxKW;
              const isAdequateWithDLMOnly = utilityAnalysis.isExistingStandardAdequate && isExceedingChosenStandardWithoutDLM && surplusKW < 0;
              const isFullyAdequate = utilityAnalysis.isExistingStandardAdequate && surplusKW >= 0 && !isExceedingChosenStandardWithoutDLM;

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
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {clientProjectData.isNewConnection
                              ? `Ligação Nova (${currentStandardCategoryId} — ${currentStandardMaxKW} kW) Dimensionada com Folga!`
                              : 'Padrão Atual Atende 100% com Folga (Sem Necessidade de DLM)!'}
                          </span>
                        ) : isAdequateWithDLMOnly ? (
                          <span className="bg-[#E45318] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                            <AlertTriangle className="w-3.5 h-3.5" /> Atendimento Condicionado a DLM Homologado
                          </span>
                        ) : (
                          <span className="bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                            <AlertCircle className="w-3.5 h-3.5" /> Aumento de Carga / Migração MT Necessária
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-600">
                          Norma: <strong>{utilityAnalysis.applicableStandards[0]}</strong>
                        </span>
                        {isFullyAdequate && (
                          <span className="bg-emerald-800 text-emerald-100 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                            Dispensa DLM ({diversifiedSumKW} kW &le; {currentStandardMaxKW} kW)
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-black">
                        {isFullyAdequate
                          ? clientProjectData.isNewConnection
                            ? `Padrão Escolhido p/ Ligação Nova (${currentStandardCategoryId} — ${currentStandardMaxKW} kW / ${utilityAnalysis.currentCategory?.breakerCurrentA || 225}A) Atende 100% da Carga (Folga: +${surplusKW.toFixed(1)} kW livres)`
                            : `Nenhuma Obra de Concessionária Necessária (Folga: +${surplusKW.toFixed(1)} kW livres)`
                          : isAdequateWithDLMOnly
                          ? `Carga Bruta (${nominalSumKW} kW) Ultrapassa o Teto do Padrão (${currentStandardMaxKW} kW). Exige DLM Homologado.`
                          : `Demanda Requerida (${diversifiedSumKW} kW) Excede o Limite do Padrão Atual (${currentStandardMaxKW} kW)`}
                      </h3>

                      <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
                        {isFullyAdequate
                          ? clientProjectData.isNewConnection
                            ? `Como se trata de uma Ligação Nova dimensionada no padrão ${utilityAnalysis.currentCategory?.categoryId || currentStandardCategoryId} (${currentStandardMaxKW} kW / Disjuntor ${utilityAnalysis.currentCategory?.breakerCurrentA || 225}A — CEMIG ND-5.1 Tabela 4), a capacidade do padrão contratado supera a demanda simultânea total (${diversifiedSumKW} kW = ${totalChargersInstalledKW} kW VE ${effectiveExistingLoadKW > 0 ? `+ ${effectiveExistingLoadKW.toFixed(1)} kW base ` : ''}+ ${totalAuxiliaryPowerKW.toFixed(1)} kW auxiliares), restando +${surplusKW.toFixed(1)} kW de sobra líquida. Portanto, o carregador opera a 100% da sua potência nominal sem precisar de limitação por DLM.`
                            : `A demanda total calculada (${diversifiedSumKW} kW / ${utilityAnalysis.calculatedDemandKVA.toFixed(1)} kVA) está plenamente contida na capacidade do padrão ${utilityAnalysis.currentCategory?.categoryId || currentStandardCategoryId} (${currentStandardMaxKW} kW). Não há necessidade de DLM, troca de disjuntor ou reforma de entrada.`
                          : isAdequateWithDLMOnly
                          ? `A potência nominal instalada (${nominalSumKW} kW) excede o limite do padrão ${currentStandardCategoryId} (${currentStandardMaxKW} kW). Para manter este padrão sem migrar para categoria superior, é necessário ativar a Gestão Dinâmica de Carga (DLM) limitada a ${currentStandardMaxKW} kW.`
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

                      <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 leading-relaxed bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/70 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <span>Nota de Dimensionamento & Variação de Demanda:</span>
                        </div>
                        <p>
                          O dimensionamento global consolida a Demanda Base com os Carregadores VE e as Cargas Auxiliares do QGBT (iluminação, CFTV, tomadas de serviço e perdas de transformação).
                        </p>
                        <p className="font-medium text-amber-950">
                          ⚠️ <strong>Atenção:</strong> Estes valores podem ter alteração devido a outras cargas da instalação, fator de simultaneidade real e perdas adicionais do sistema que podem ser consideradas (perdas nos alimentadores longos, filtros harmônicos e rendimento do transformador). Caso haja déficit, no <strong>Passo 2</strong> é possível acionar o <strong>DLM (Gestão Dinâmica)</strong> para operar sem trocar o padrão, ou adequar o padrão no <strong>Passo 3</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ─── CARD DE COLETA DE INFORMAÇÕES FÍSICAS DO PADRÃO (PASSO 2A - CEMIG ND-5.1) ─── */}
            <div className="bg-gradient-to-r from-slate-900 via-[#0A192F] to-slate-900 text-white p-6 rounded-3xl border border-slate-700/80 shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest block mb-0.5">
                    Passo 2A • Parâmetros Construtivos do Padrão CEMIG ND-5.1
                  </span>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#00B356]" />
                    Coleta de Dados Físicos do Padrão de Entrada
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina o lado da via, saída, tipo de poste e kits de caixas para cálculo exato de materiais, metragens de cabos e esforço mecânico do poste.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-[#00B356] border border-[#00B356]/40 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Alimentando Lista de Materiais & Orçamento (Passo 4B)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* 1. Lado da Via em Relação à Rede */}
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">
                    1. Lado da Via em Relação à Rede
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setClientProjectData(prev => ({ ...prev, standardSideOfStreet: 'MESMO_LADO' }))}
                      className={`p-2 rounded-xl font-bold text-center transition-all ${
                        (clientProjectData.standardSideOfStreet || 'MESMO_LADO') === 'MESMO_LADO'
                          ? 'bg-[#00B356] text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Mesmo Lado
                      <span className="block text-[9px] font-normal opacity-85 mt-0.5">A favor da rede</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientProjectData(prev => ({ ...prev, standardSideOfStreet: 'LADO_OPOSTO' }))}
                      className={`p-2 rounded-xl font-bold text-center transition-all ${
                        clientProjectData.standardSideOfStreet === 'LADO_OPOSTO'
                          ? 'bg-[#E45318] text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Lado Oposto
                      <span className="block text-[9px] font-normal opacity-85 mt-0.5">Contra (Travessia)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {clientProjectData.standardSideOfStreet === 'LADO_OPOSTO'
                      ? '⚠️ Lado oposto exige travessia aérea da rua (+18m cabos e poste de maior esforço daN).'
                      : '✅ Mesmo lado da rede dispensa travessia aérea sobre a via pública.'}
                  </p>
                </div>

                {/* 2. Tipo de Saída do Padrão */}
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">
                    2. Tipo de Saída do Padrão
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setClientProjectData(prev => ({ ...prev, standardExitType: 'SUBTERRANEA' }))}
                      className={`p-2 rounded-xl font-bold text-center transition-all ${
                        (clientProjectData.standardExitType || 'SUBTERRANEA') === 'SUBTERRANEA'
                          ? 'bg-[#00B356] text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Subterrânea
                      <span className="block text-[9px] font-normal opacity-85 mt-0.5">Duto PEAD enterrado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientProjectData(prev => ({ ...prev, standardExitType: 'AEREA' }))}
                      className={`p-2 rounded-xl font-bold text-center transition-all ${
                        clientProjectData.standardExitType === 'AEREA'
                          ? 'bg-[#00B356] text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Aérea
                      <span className="block text-[9px] font-normal opacity-85 mt-0.5">Ramal aéreo</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {(clientProjectData.standardExitType || 'SUBTERRANEA') === 'SUBTERRANEA'
                      ? 'Recomendado para hubs VE com dutos corrugados e fita de advertência.'
                      : 'Saída aérea por cabeçote no topo do poste (apenas para cargas até F2).'}
                  </p>
                </div>

                {/* 3. Tipo de Estrutura Física */}
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">
                    3. Suporte / Estrutura Física
                  </label>
                  <select
                    value={clientProjectData.standardStructureType || 'POSTE_CONCRETO'}
                    onChange={(e) => setClientProjectData(prev => ({ ...prev, standardStructureType: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 font-bold text-white text-xs outline-none focus:border-[#00B356]"
                  >
                    <option value="POSTE_CONCRETO">Poste Concreto Duplo T (PC1..PC4)</option>
                    <option value="POSTE_ACO">Poste de Aço Galvanizado (PT1..PT4)</option>
                    <option value="MURO">Instalação em Muro / Fachada Predial</option>
                  </select>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {clientProjectData.standardStructureType === 'MURO'
                      ? 'Caixas fixadas em alvenaria com eletrodutos embutidos.'
                      : 'Poste homologado com base concretada e cabeçote conforme ND-5.1.'}
                  </p>
                </div>

                {/* 4. Localização & Aterramento */}
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">
                    4. Localização Geográfica
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setClientProjectData(prev => ({ ...prev, standardLocation: 'URBANO' }))}
                      className={`p-2 rounded-xl font-bold text-center transition-all ${
                        (clientProjectData.standardLocation || 'URBANO') === 'URBANO'
                          ? 'bg-[#00B356] text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Urbano
                      <span className="block text-[9px] font-normal opacity-85 mt-0.5">Calçada / Lote</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientProjectData(prev => ({ ...prev, standardLocation: 'RURAL' }))}
                      className={`p-2 rounded-xl font-bold text-center transition-all ${
                        clientProjectData.standardLocation === 'RURAL'
                          ? 'bg-[#00B356] text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Rural
                      <span className="block text-[9px] font-normal opacity-85 mt-0.5">Nota 9 ND-5.1</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {clientProjectData.standardLocation === 'RURAL'
                      ? 'Em área rural, a CEMIG exige travessia aérea e aterramento estendido.'
                      : 'Em área urbana, segue o alinhamento predial da via pública.'}
                  </p>
                </div>
              </div>

              {/* 5. Seleção de Tipo de Terminal do Projeto (Terminal Olhal de Compressão vs Terminal Tubular) */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <strong className="text-xs font-bold text-white block">
                    5. Tipo de Terminal dos Condutores (Padrão CEMIG & Painéis)
                  </strong>
                  <p className="text-[11px] text-slate-300">
                    Escolha exclusivamente entre <strong>Terminal Olhal de Compressão</strong> ou <strong>Terminal Tubular</strong> para a lista de materiais do projeto.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setClientProjectData(prev => ({ ...prev, standardTerminalType: 'COMPRESSAO_OLHAL' }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (clientProjectData.standardTerminalType || 'COMPRESSAO_OLHAL') === 'COMPRESSAO_OLHAL'
                        ? 'bg-[#00B356] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Terminal Olhal de Compressão
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientProjectData(prev => ({ ...prev, standardTerminalType: 'TUBULAR' }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      clientProjectData.standardTerminalType === 'TUBULAR'
                        ? 'bg-[#E45318] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Terminal Tubular
                  </button>
                </div>
              </div>

              {/* Opções de Fornecimento de Caixas para Alta Demanda (F1..F9) */}
              {effectiveHomologatedCategory.categoryId.startsWith('F') && (
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-emerald-400" />
                      <strong className="text-xs font-bold text-white">
                        Conjunto Pré-Montado de Caixas com Barramento (Fornecedores Homologados)
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Distribuidores autorizados fornecem o conjunto montado <strong>Caixa CM-09 + CM-04</strong> ou <strong>Caixa CM-18 + CM-04 com Barramento de cobre sem disjuntor</strong>.
                    </p>
                  </div>

                  <label className="flex items-center gap-2.5 bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-700 cursor-pointer hover:border-[#00B356] transition-colors shrink-0">
                    <input
                      type="checkbox"
                      checked={clientProjectData.preferKitProntoCaixas ?? false}
                      onChange={(e) => setClientProjectData(prev => ({ ...prev, preferKitProntoCaixas: e.target.checked }))}
                      className="rounded text-[#00B356] focus:ring-0 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-white">
                      Adotar Conjunto Pré-Montado no Orçamento
                    </span>
                  </label>
                </div>
              )}
            </div>

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
              if (val === 'smartmeter_real' && smartMeterSummary) {
                handleSelectRealCurveExtractionMode(realCurveExtractionMode);
              } else {
                setCustomCurvePoints(null);
              }
            }}
            peakDemandKW={dlmPeakDemandKW}
            setPeakDemandKW={(val) => {
              setDlmPeakDemandKW(val);
              if (dlmProfileType !== 'smartmeter_real') {
                setCustomCurvePoints(null);
              }
            }}
            gridLimitKW={effectiveDlmGridLimitKW}
            setGridLimitKW={() => {}}
            configuredChargersSummary={{
              totalPoints: totalChargersCount,
              totalPowerKW: totalChargersInstalledKW,
              description: configuredChargers.map(c => `${c.quantity}x ${c.name}`).join(' + '),
              isDC: configuredChargers.some(c => c.type === 'DC' || c.powerKW >= 30)
            }}
            isNewConnection={Boolean(clientProjectData.isNewConnection)}
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
            setEnableSolarSurplus={(val) => {
              setDlmEnableSolarSurplus(val);
              if (val && dlmSolarPeakKW <= 0) {
                setDlmSolarPeakKW(25);
              }
            }}
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
            realCurveExtractionMode={realCurveExtractionMode}
            onSelectRealCurveExtractionMode={handleSelectRealCurveExtractionMode}
            realPeakInfo={{
              maxPowerKW: smartMeterSummary?.maxPowerKW || dlmPeakDemandKW,
              peakTimestamp: smartMeterSummary?.peakTimestamp || '',
              daysCount: dailyPeaksState.length || (attachedSheetsList.length > 0 ? attachedSheetsList.length : 1),
              worstDayDate: smartMeterSummary?.peakTimestamp?.split(' ')[0]
            }}
          />

          <LoadCurveChart
            data={dlmResult.hourlyPoints}
            gridLimitKW={dlmResult.gridEffectiveLimitKW}
            enableDLM={dlmEnableDLM}
            enableSolar={dlmEnableSolarSurplus}
          />

          <LoadFeasibilityReport simulation={dlmResult} />

          {/* ─── SIMULADOR DE SISTEMAS PRONTOS DE MERCADO DLM & HARDWARE ─── */}
          <div className="pt-4 border-t border-slate-800">
            <DLMMarketSimulator
              initialGridLimitKW={dlmResult.gridEffectiveLimitKW || 75}
              initialBuildingLoadKW={effectiveExistingLoadKW || 35}
              initialChargersPowerKW={totalChargersInstalledKW || 44}
              onApplyPresetToProject={(_systemId, _safePowerKW) => {
                setDlmEnableDLM(true);
              }}
            />
          </div>
        </div>
      )}

      {/* ─── TAB 6 & 7: PASSO 4A & 4B: INFRAESTRUTURA ELETROTÉCNICA, TOPOLOGIA & LISTA DE MATERIAIS (CAPEX) ─── */}
      {(activeTab === 'infraestrutura' || activeTab === 'resultado') && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
                  <span className="text-slate-400">
                    O dimensionamento com todos os dados foi gravado no banco de dados e adicionado ao seu histórico.
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

          {/* Topologia Reativa em Cadeia com Blocos Clicáveis NBR 5410 & NBR 17019 / Lista de Materiais Modular */}
          <EVTopologyChainViewer
            isNewConnection={clientProjectData.isNewConnection || false}
            isExistingStandardAdequate={utilityAnalysis.isExistingStandardAdequate}
            targetNewCategory={clientProjectData.targetNewCategory || clientProjectData.standardCategory || "C3"}
            externalClientBaseLoadKW={effectiveExistingLoadKW}
            externalStandardCategory={effectiveHomologatedCategory.categoryId || currentStandardCategoryId}
            externalStandardBreakerA={effectiveHomologatedCategory.breakerCurrentA || fieldBreakerAmps}
            externalGridSupplyVoltage={commercialHub.gridSupplyVoltage ?? (selectedUtility === 'CEMIG' ? 220 : 380)}
            forcedTab={activeTab === 'resultado' ? 'bom' : 'vis'}
            onNavigateToBOM={() => handleTabChange('resultado')}
            onNavigateToVis={() => handleTabChange('infraestrutura')}
            onNavigateToFinancialModeling={() => handleTabChange('modelagem_financeira')}
            onModularBOMChange={handleModularBOMChange}
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
              type: c.type,
              distanceMeters: c.distanceMeters,
              marginPercent: c.marginPercent,
              conductorMaterial: c.conductorMaterial,
              installationMethod: c.installationMethod,
              internalLossesKW: c.internalLossesKW,
              efficiencyPercent: c.efficiencyPercent
            }))}
            externalSection1DistanceM={clientProjectData.section1DistanceM}
            externalSection1MarginPercent={clientProjectData.section1MarginPercent}
            externalSection1ConductorMaterial={clientProjectData.section1ConductorMaterial}
            externalSection1InstallationMethod={clientProjectData.section1InstallationMethod}
            externalSection2DistanceM={clientProjectData.section2DistanceM}
            externalSection2MarginPercent={clientProjectData.section2MarginPercent}
            externalSection2ConductorMaterial={clientProjectData.section2ConductorMaterial}
            externalSection2InstallationMethod={clientProjectData.section2InstallationMethod}
            externalSection3DistanceM={clientProjectData.section3DistanceM}
            externalSection3MarginPercent={clientProjectData.section3MarginPercent}
            externalSection3ConductorMaterial={clientProjectData.section3ConductorMaterial}
            externalSection3InstallationMethod={clientProjectData.section3InstallationMethod}
            externalCustomTransformerKVA={clientProjectData.customTransformerKVA}
            externalCustomTransformerEfficiencyPercent={clientProjectData.customTransformerEfficiencyPercent}
            externalCustomTransformerLossesKW={clientProjectData.customTransformerLossesKW}
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
            onAddCharger={(node: any) => {
              const newC: ConfiguredCharger = {
                id: node.id || `ch-${Date.now()}`,
                name: node.name || `${node.brand || 'WEG'} ${node.model || 'Charger'}`,
                powerKW: node.powerKW,
                phases: (node.phases === 3 ? 3 : node.phases === 2 ? 2 : 1) as (1 | 2 | 3),
                voltage: node.voltageV || (node.phases === 3 ? 380 : 220),
                type: node.type || (node.powerKW >= 30 ? 'DC' : 'AC'),
                quantity: 1,
                connector: node.connector || (node.type === 'DC' ? 'CCS2' : 'Tipo 2'),
                distanceMeters: node.distanceMeters || 15,
                marginPercent: node.marginPercent || 10,
                conductorMaterial: node.conductorMaterial || 'copper',
                installationMethod: node.installationMethod || 'B1'
              };
              handleAddCharger(newC);
            }}
            onRemoveCharger={handleRemoveCharger}
            onUpdateChargerFull={(id, updates) => {
              setConfiguredChargers(prev => prev.map(c => {
                if (c.id === id) {
                  return {
                    ...c,
                    ...updates,
                    phases: (updates.phases ?? c.phases) as (1 | 2 | 3)
                  };
                }
                return c;
              }));
            }}
            cemigStandardBOM={cemigPadraoResult?.itensSugeridos}
            externalTerminalType={clientProjectData.standardTerminalType || 'COMPRESSAO_OLHAL'}
            onChangeTerminalType={(type) => {
              setClientProjectData(prev => ({ ...prev, standardTerminalType: type }));
            }}
            onChangeSelectedLoads={(loads220, loads380) => {
              setClientProjectData(prev => ({
                ...prev,
                selectedLoads220V: loads220,
                selectedLoads380V: loads380
              }));
            }}
            onSaveTopologyParams={(params) => {
              setClientProjectData(prev => ({
                ...prev,
                section1DistanceM: params.section1DistanceM,
                section1MarginPercent: params.section1MarginPercent,
                section1ConductorMaterial: params.section1ConductorMaterial,
                section1InstallationMethod: params.section1InstallationMethod,
                section2DistanceM: params.section2DistanceM,
                section2MarginPercent: params.section2MarginPercent,
                section2ConductorMaterial: params.section2ConductorMaterial,
                section2InstallationMethod: params.section2InstallationMethod,
                section3DistanceM: params.section3DistanceM,
                section3MarginPercent: params.section3MarginPercent,
                section3ConductorMaterial: params.section3ConductorMaterial,
                section3InstallationMethod: params.section3InstallationMethod,
                customTransformerKVA: params.customTransformerKVA,
                customTransformerEfficiencyPercent: params.customTransformerEfficiencyPercent,
                customTransformerLossesKW: params.customTransformerLossesKW,
                selectedLoads220V: params.selectedLoads220V ?? prev.selectedLoads220V,
                selectedLoads380V: params.selectedLoads380V ?? prev.selectedLoads380V
              }));
              if (params.chargers && params.chargers.length > 0) {
                setConfiguredChargers(prev => {
                  return params.chargers!.map(node => {
                    const existing = prev.find(ch => ch.id === node.id);
                    if (existing) {
                      return {
                        ...existing,
                        powerKW: node.powerKW ?? existing.powerKW,
                        distanceMeters: node.distanceMeters,
                        marginPercent: node.marginPercent,
                        conductorMaterial: node.conductorMaterial,
                        installationMethod: node.installationMethod,
                        internalLossesKW: node.internalLossesKW,
                        efficiencyPercent: node.efficiencyPercent
                      };
                    }
                    return {
                      id: node.id,
                      name: node.name,
                      powerKW: node.powerKW,
                      phases: (node.phases === 3 ? 3 : node.phases === 2 ? 2 : 1) as (1 | 2 | 3),
                      voltage: node.voltageV || (node.phases === 3 ? 380 : 220),
                      type: (node.type as ('AC' | 'DC')) || 'AC',
                      quantity: 1,
                      connector: node.connector || 'Tipo 2',
                      distanceMeters: node.distanceMeters || 15,
                      marginPercent: node.marginPercent || 10,
                      conductorMaterial: node.conductorMaterial || 'copper',
                      installationMethod: node.installationMethod || 'B1',
                      internalLossesKW: node.internalLossesKW,
                      efficiencyPercent: node.efficiencyPercent
                    };
                  });
                });
              }
              handleAutoSaveSnapshot();
            }}
            onConcludeTopology={() => {
              handleAutoSaveSnapshot();
            }}
            externalUserBOMOverrides={bomUserOverrides}
            externalDeletedItemIds={bomDeletedItemIds}
            externalCustomAddedItems={bomCustomAddedItems}
            externalLaborMode={bomLaborMode}
            externalLaborPercent={bomLaborPercent}
            externalGlobalBdiPercent={bomGlobalBdiPercent}
            onUpdateBOMOverrides={(overrides) => {
              setBomUserOverrides(overrides);
              try { localStorage.setItem('coenergygo_bom_user_overrides', JSON.stringify(overrides)); } catch (e) {}
              handleAutoSaveSnapshot();
            }}
            onUpdateDeletedItemIds={(ids) => {
              setBomDeletedItemIds(ids);
              try { localStorage.setItem('coenergygo_bom_deleted_items', JSON.stringify(ids)); } catch (e) {}
              handleAutoSaveSnapshot();
            }}
            onUpdateCustomAddedItems={(items) => {
              setBomCustomAddedItems(items);
              try { localStorage.setItem('coenergygo_bom_custom_items', JSON.stringify(items)); } catch (e) {}
              handleAutoSaveSnapshot();
            }}
            onUpdateLaborMode={(mode) => { setBomLaborMode(mode); handleAutoSaveSnapshot(); }}
            onUpdateLaborPercent={(pct) => { setBomLaborPercent(pct); handleAutoSaveSnapshot(); }}
            onUpdateGlobalBdiPercent={(bdi) => { setBomGlobalBdiPercent(bdi); handleAutoSaveSnapshot(); }}
          />
        </div>
      )}

      {/* ─── TAB 8: PASSO 5: MODELAGEM FINANCEIRA & 3 CENÁRIOS (PADRÃO BLEV - FOTOS 01 & 02) ─── */}
      {activeTab === 'modelagem_financeira' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <EVFinancialModelingBLEV
            initialCapexBRL={
              projectModularBOM?.totalProjectInvestmentBRL ||
              unifiedCalculation.totalEstimatedCapexBRL ||
              95000
            }
            capexBreakdown={
              projectModularBOM
                ? {
                    materialsBRL: projectModularBOM.totalMaterialsNetBRL,
                    laborBRL: projectModularBOM.totalLaborNetBRL,
                    bdiBRL: projectModularBOM.globalBdiAmountBRL,
                    totalBRL: projectModularBOM.totalProjectInvestmentBRL,
                    itemsCount: projectModularBOM.totalItemsCount,
                    syncedOrcamentoId: projectModularBOM.syncedOrcamentoProjetoId
                  }
                : undefined
            }
            totalChargersPowerKW={totalChargersInstalledKW}
            chargerPowerKW={configuredChargers[0]?.powerKW || 22}
            totalChargersCount={totalChargersCount}
            configuredChargers={configuredChargers.map(c => ({
              id: c.id,
              name: c.name,
              powerKW: c.powerKW,
              type: c.type
            }))}
            selectedUtility={selectedUtility}
            gridEnergyCostDefaultBRL={commercialHub.gridEnergyCostPerKWh || 0.85}
            solarEnergyCostDefaultBRL={0.39}
            vdmVehiclesPerDayDefault={clientProjectData.ahpVdm || 15000}
            fleetDensityPercentDefault={clientProjectData.ahpFleetDensityPercent || 2.5}
            averageSessionMinutesDefault={clientProjectData.ahpSessionMinutes || 35}
            clientProjectData={clientProjectData}
            dlmCapexSavingsBRL={unifiedCalculation.dlmEstimatedSavingsBRL || 0}
            onSaveFinancialAssumptions={(updatedData) => {
              setClientProjectData(prev => ({
                ...prev,
                ...updatedData
              }));
              handleAutoSaveSnapshot();
              setSaveSuccessMessage("Premissas da Modelagem Financeira BLEV sincronizadas com sucesso!");
              setTimeout(() => setSaveSuccessMessage(null), 5000);
            }}
            onNavigateToBOM={() => handleTabChange('resultado')}
            onNavigateToTopologia={() => handleTabChange('infraestrutura')}
          />
        </div>
      )}

      {/* ─── MODAL CENTRAL DA SUÍTE DE 5 RELATÓRIOS OFICIAIS (PILAR 4) ─────────── */}
      <EVEngineeringReportsHub
        isOpen={showEngineeringReportsHubModal}
        onClose={() => setShowEngineeringReportsHubModal(false)}
        projectData={{
          projectName: clientProjectData.projectName || 'Projeto de Eletromobilidade CoenergyGO',
          clientName: clientProjectData.clientName || 'Cliente Cordeiro Energia',
          technicalResponsible: clientProjectData.technicalResponsible || 'Eng. Eletricista Responsável',
          creaCft: clientProjectData.creaCft || 'CREA-MG 148293/D',
          utility: clientProjectData.utility || selectedUtility || 'CEMIG Distribuição',
          address: clientProjectData.address || 'Belo Horizonte / MG',
          standardCategory: effectiveHomologatedCategory.categoryId || currentStandardCategoryId,
          standardBreakerA: effectiveBreakerAmpsForSizing,
          voltageV: 220,
          totalPowerKW: Number(totalChargersInstalledKW.toFixed(1)),
          chargers: configuredChargers.map(c => ({
            id: c.id,
            name: c.name,
            powerKW: c.powerKW,
            phases: c.phases,
            voltage: c.voltage,
            type: c.type,
            connector: c.connector
          })),
          sections: {
            section1: {
              name: 'Ramal de Entrada até QGBT 220V',
              cableGaugeMM2: 35,
              breakerA: 100,
              dropVoltagePercent: 0.85,
              distanceM: 25,
              currentA: 82
            },
            section2: {
              name: 'Alimentador do Trafo Dyn1 220V-380V',
              cableGaugeMM2: 50,
              breakerA: 125,
              dropVoltagePercent: 1.12,
              distanceM: 15,
              currentA: 95
            },
            section3: {
              name: 'Sub-ramal QDC-VE até Carregadores',
              cableGaugeMM2: 10,
              breakerA: 40,
              dropVoltagePercent: 0.94,
              distanceM: 18,
              currentA: 32
            }
          },
          hasTransformer: configuredChargers.some(c => c.voltage === 380 || c.powerKW >= 22),
          transformerKVA: 45,
          transformerLossesKW: 0.9,
          fireSafety: fireSafety,
          bomItems: [
            { category: 'Padrão Entrada', name: 'Disjuntor Caixa Moldada 100A Homologado CEMIG PEC-11', quantity: 1, unit: 'un', unitPrice: 850 },
            { category: 'Proteções', name: 'Disjuntor Termomagnético Bipolar/Tripolar DIN Curva C Soprano', quantity: configuredChargers.length, unit: 'un', unitPrice: 95 },
            { category: 'Segurança NBR 17019', name: 'Interruptor Diferencial Residual IDR Tipo B / A-EV 30mA', quantity: configuredChargers.length, unit: 'un', unitPrice: 680 },
            { category: 'Emergência', name: 'Botão de Emergência Cogumelo com Trava Giratória + Bobina MX', quantity: 1, unit: 'kit', unitPrice: 320 },
            { category: 'Quadros', name: 'Quadro Metálico de Sobrepor Cemar / Strahl IP65 com Barramentos', quantity: 2, unit: 'un', unitPrice: 1250 }
          ],
          totalInvestmentBRL: Number((totalChargersInstalledKW * 1450 + 12000).toFixed(2)),
          capexSavingsBRL: 18500,
          evBaysCount: totalEvBaysCount,
          chargingPointsCount: totalChargingPointsCount,
          parkingLocation: clientProjectData.parkingLocation || 'aberto',
          parkingAccessControl: clientProjectData.parkingAccessControl || 'livre',
          hasPcdAccessibleBay: clientProjectData.hasPcdAccessibleBay || false,
          parkingSurfaceType: clientProjectData.parkingSurfaceType || 'concreto',
          realLoadCurveMode: realCurveExtractionMode,
          realPeakKW: smartMeterSummary?.maxPowerKW,
          realPeakDate: smartMeterSummary?.peakTimestamp,
          commercialHub: commercialHub,
          applicationMode: applicationMode,
          enableDLM: dlmEnableDLM || dlmResult.isLimitationAccepted,
          hasDLM: dlmEnableDLM || dlmResult.isLimitationAccepted || (dlmResult.maxOverloadWithoutDLMKW > 0),
          dlmSystemType: 'beny',
          deficitKW: dlmResult.maxOverloadWithoutDLMKW
        }}
      />

      <SolicitarNovoMaterialModal
        isOpen={showSolicitarMaterialModal}
        onClose={() => setShowSolicitarMaterialModal(false)}
        origem="COENERGYGO_VE"
        onItemCriado={(novoItem) => {
          setSaveSuccessMessage(`Material "${novoItem.descricao}" cadastrado e enviado para compras!`);
          setTimeout(() => setSaveSuccessMessage(null), 5000);
        }}
      />
    </div>
  );
}
