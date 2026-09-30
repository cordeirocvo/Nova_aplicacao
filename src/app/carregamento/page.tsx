"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Zap, Plus, FileText, Calendar, User, ChevronRight, Loader, 
  Car, Shield, CheckCircle2, AlertTriangle, Search, Info, 
  BatteryCharging, Gauge, ArrowRight, BookOpen, Layers, Flame, Activity,
  Cable, FileSpreadsheet, Upload, AlertCircle
} from "lucide-react";
import { 
  BRAZIL_ELECTRIC_VEHICLES, 
  ElectricVehicle, 
  calculateChargingTime, 
  ChargingTimeResult,
  searchVehicles
} from "@/lib/ev/vehiclesDatabase";
import { 
  CEMIG_BT_CATEGORIES, 
  CPFL_CATEGORIES, 
  ENERGISA_CATEGORIES,
  analyzeUtilityCompliance
} from "@/lib/ev/utilityEngines";
import { calculateNBR17019Compliance } from "@/lib/ev/nbr17019Engine";
import { 
  generateScaledHourlyCurve, 
  simulateDLM, 
  parseLoadDataFile, 
  parseUniversalLoadFile,
  sizeElectricalInfrastructure,
  TypicalProfileType, 
  DLMSimulationResult,
  HourlyLoadPoint,
  PeriodMeasurementSummary,
  ElectricalInfrastructureSizing,
  evaluateUtility
} from "@/lib/coenergygo";
import LoadCurveChart from "@/components/ev/LoadCurveChart";
import DLMControlPanel from "@/components/ev/DLMControlPanel";
import LoadFeasibilityReport from "@/components/ev/LoadFeasibilityReport";
import ImportedDataViewer from "@/components/ev/ImportedDataViewer";
import InfrastructurePanel from "@/components/ev/InfrastructurePanel";

export default function CoenergyGODashboard() {
  const [activeTab, setActiveTab] = useState<'projetos' | 'veiculos' | 'concessionarias' | 'nbr17019' | 'curva_dlm' | 'infraestrutura'>('projetos');
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Estados do Passo 2: Curva de Carga e DLM
  const [dlmProfileType, setDlmProfileType] = useState<TypicalProfileType>('condominio_residencial');
  const [dlmPeakDemandKW, setDlmPeakDemandKW] = useState(55);
  const [dlmGridLimitKW, setDlmGridLimitKW] = useState(75);
  const [dlmChargerCount, setDlmChargerCount] = useState(6);
  const [dlmChargerUnitPowerKW, setDlmChargerUnitPowerKW] = useState(7.4);
  const [dlmChargeStartHour, setDlmChargeStartHour] = useState(18);
  const [dlmChargeDurationHours, setDlmChargeDurationHours] = useState(8);
  const [dlmSolarPeakKW, setDlmSolarPeakKW] = useState(25);
  const [dlmEnableDLM, setDlmEnableDLM] = useState(true);
  const [dlmEnableSolarSurplus, setDlmEnableSolarSurplus] = useState(true);
  const [customCurvePoints, setCustomCurvePoints] = useState<any[] | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Estados do Simulador de Veículos
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<ElectricVehicle>(BRAZIL_ELECTRIC_VEHICLES[0]);
  const [simChargerPowerKW, setSimChargerPowerKW] = useState(7.4);
  const [simChargerPhases, setSimChargerPhases] = useState<1 | 3>(1);
  const [simChargerType, setSimChargerType] = useState<'AC' | 'DC'>('AC');
  const [simulationResult, setSimulationResult] = useState<ChargingTimeResult | null>(null);

  // Estados do Comparador Normativo de Concessionárias
  const [selectedUtility, setSelectedUtility] = useState<'CEMIG' | 'CPFL' | 'ENERGISA' | 'ENEL_SP'>('CEMIG');
  const [installationType, setInstallationType] = useState<'individual' | 'coletivo_condominio' | 'comercial_eletroposto'>('individual');
  const [existingLoadKW, setExistingLoadKW] = useState(15);
  const [chargerCount, setChargerCount] = useState(2);
  const [chargerPowerUnitKW, setChargerPowerUnitKW] = useState(7.4);

  // Estados da Auditoria NBR 17019
  const [auditPowerKW, setAuditPowerKW] = useState(7.4);
  const [auditCableLength, setAuditCableLength] = useState(25);
  const [auditHasEmergencyButton, setAuditHasEmergencyButton] = useState(true);
  const [auditHasBollards, setAuditHasBollards] = useState(true);
  const [auditHasSignaling, setAuditHasSignaling] = useState(true);
  const [auditResult, setAuditResult] = useState<any>(null);

  // Estados do Passo 3: Infraestrutura Eletrotécnica & SmartMeter
  const [smartMeterSummary, setSmartMeterSummary] = useState<PeriodMeasurementSummary | null>(null);
  const [infraChargerPowerKW, setInfraChargerPowerKW] = useState(7.4);
  const [infraChargerVoltage, setInfraChargerVoltage] = useState(220);
  const [infraChargerPhases, setInfraChargerPhases] = useState<1 | 3>(1);
  const [infraCableLength, setInfraCableLength] = useState(25);
  const [infraInstallationMethod, setInfraInstallationMethod] = useState<'B1' | 'B2' | 'C' | 'D'>('B1');
  const [infraAmbientTemp, setInfraAmbientTemp] = useState(30);
  const [infraIsOutdoor, setInfraIsOutdoor] = useState(false);
  const [infraGridLimitKW, setInfraGridLimitKW] = useState(75);

  useEffect(() => {
    fetch("/api/ev/sizing")
      .then(res => {
        if (!res.ok) throw new Error("Erro ao carregar projetos");
        return res.json();
      })
      .then(data => {
        setProjects(Array.isArray(data) ? data : []);
        setLoadingProjects(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingProjects(false);
      });
  }, []);

  // Recalcular simulação de tempo do veículo
  useEffect(() => {
    if (selectedVehicle) {
      const res = calculateChargingTime(
        selectedVehicle,
        simChargerPowerKW,
        simChargerPhases,
        simChargerType
      );
      setSimulationResult(res);
    }
  }, [selectedVehicle, simChargerPowerKW, simChargerPhases, simChargerType]);

  // Recalcular auditoria NBR 17019
  useEffect(() => {
    const res = calculateNBR17019Compliance({
      powerKW: auditPowerKW,
      voltage: auditPowerKW >= 11 ? 380 : 220,
      phases: auditPowerKW >= 11 ? 3 : 1,
      cableLengthMeters: auditCableLength,
      installationMethod: 'B1',
      hasBuiltinRDCDD: true,
      hasEmergencyButtonWithin5m: auditHasEmergencyButton,
      hasMechanicalBollards: auditHasBollards,
      hasPhotoluminescentSignaling: auditHasSignaling
    });
    setAuditResult(res);
  }, [auditPowerKW, auditCableLength, auditHasEmergencyButton, auditHasBollards, auditHasSignaling]);

  const filteredVehicles = searchVehicles(vehicleSearch);

  // Análise da Concessionária (CEMIG, CPFL, Energisa, Enel)
  const utilityAnalysis = evaluateUtility({
    utility: selectedUtility,
    location: 'urbano',
    installationType,
    existingLoadKW,
    chargers: [
      {
        quantity: chargerCount,
        powerKW: chargerPowerUnitKW,
        phases: chargerPowerUnitKW >= 11 ? 3 : 1,
        chargerType: chargerPowerUnitKW >= 30 ? 'DC' : 'AC'
      }
    ],
    hasSmartChargingDLM: dlmEnableDLM
  });

  // Simulação de Curva de Carga e DLM (Passo 2)
  const baseCurve = customCurvePoints || generateScaledHourlyCurve(
    dlmProfileType,
    dlmPeakDemandKW,
    dlmEnableSolarSurplus ? dlmSolarPeakKW : 0
  );

  const dlmResult: DLMSimulationResult = simulateDLM(baseCurve, {
    gridLimitKW: dlmGridLimitKW,
    safetyMarginPercent: 0.10,
    voltage: dlmChargerUnitPowerKW >= 11 ? 380 : 220,
    phases: dlmChargerUnitPowerKW >= 11 ? 3 : 1,
    chargerCount: dlmChargerCount,
    chargerUnitPowerKW: dlmChargerUnitPowerKW,
    chargeStartHour: dlmChargeStartHour,
    chargeDurationHours: dlmChargeDurationHours,
    enableDLM: dlmEnableDLM,
    enableSolarSurplus: dlmEnableSolarSurplus,
    solarPeakKW: dlmSolarPeakKW
  });

  // Dimensionamento Eletrotécnico de Infraestrutura (Passo 3)
  const infrastructureSizing: ElectricalInfrastructureSizing = sizeElectricalInfrastructure({
    chargerPowerKW: infraChargerPowerKW,
    chargerVoltage: infraChargerVoltage,
    chargerPhases: infraChargerPhases,
    cableLengthMeters: infraCableLength,
    installationMethod: infraInstallationMethod,
    ambientTemperatureC: infraAmbientTemp,
    existingPeakDemandKW: smartMeterSummary ? smartMeterSummary.maxPowerKW : dlmPeakDemandKW,
    gridStandardLimitKW: infraGridLimitKW,
    isOutdoor: infraIsOutdoor
  });

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoadingFile(true);
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

      setSmartMeterSummary(summary);
      setCustomCurvePoints(parsedResult.hourlyCurve24h);
      setDlmPeakDemandKW(summary.maxPowerKW);
      setIsLoadingFile(false);
    } catch (err: any) {
      alert("Erro ao ler arquivo de medição: " + (err.message || "Formato inválido"));
      setIsLoadingFile(false);
    }
  };

  const handleLoadSmartMeterDemo = async () => {
    try {
      setIsLoadingFile(true);
      const res = await fetch("/api/ev/smartmeter-demo");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Arquivo SmartMeter.xlsx não encontrado");
      }
      const data = await res.json();
      setSmartMeterSummary(data.summary);
      setCustomCurvePoints(data.parsedResult.hourlyCurve24h);
      setDlmPeakDemandKW(data.summary.maxPowerKW);
      setIsLoadingFile(false);
    } catch (err: any) {
      alert("Aviso: " + err.message);
      setIsLoadingFile(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-['Montserrat',sans-serif]">
      {/* ─── HEADER COENERGYGO ─── */}
      <div className="bg-[#0A192F] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#E45318]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-10 w-48 h-48 bg-[#00B356]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-[#E45318] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                CoenergyGO v2.0
              </span>
              <span className="bg-[#00B356]/20 text-[#00B356] border border-[#00B356]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="w-3 h-3" /> NBR 17019 & CEMIG ND-5.1/5.2
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Coenergy<span className="text-[#E45318]">GO</span>
              <span className="text-sm font-semibold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-xl">
                Mobilidade Elétrica Inteligente
              </span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-medium">
              Dimensionamento eletrotécnico de estações de recarga, compatibilidade veicular em tempo real,
              adequação de padrões de entrada de concessionárias e conformidade com o Corpo de Bombeiros.
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
            <Link 
              href="/carregamento/novo"
              className="bg-gradient-to-r from-[#E45318] to-[#ff6b2b] text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all font-bold text-sm"
            >
              <Plus className="w-5 h-5" />
              Novo Dimensionamento
            </Link>
          </div>
        </div>

        {/* SUB-NAV TABS */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('projetos')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'projetos'
                ? 'bg-white text-[#0A192F] shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Projetos & Dashboard
          </button>

          <button
            onClick={() => setActiveTab('veiculos')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'veiculos'
                ? 'bg-[#00B356] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Car className="w-4 h-4" />
            Banco de Veículos & Simulador
            <span className="bg-slate-900/60 text-[9px] px-2 py-0.5 rounded-full">{BRAZIL_ELECTRIC_VEHICLES.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('concessionarias')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'concessionarias'
                ? 'bg-[#E45318] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            Concessionárias (CEMIG, CPFL, Energisa)
          </button>

          <button
            onClick={() => setActiveTab('nbr17019')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'nbr17019'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            Auditoria NBR 17019 & Bombeiros
          </button>

          <button
            onClick={() => setActiveTab('curva_dlm')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'curva_dlm'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-300" />
            Curva de Carga & DLM
            <span className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">Passo 2</span>
          </button>

          <button
            onClick={() => setActiveTab('infraestrutura')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'infraestrutura'
                ? 'bg-gradient-to-r from-[#E45318] to-orange-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cable className="w-4 h-4 text-orange-200" />
            Infraestrutura Elétrica & SmartMeter
            <span className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">Passo 3</span>
          </button>
        </div>
      </div>

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
            <Link 
              href="/carregamento/novo"
              className="text-[#E45318] text-xs font-bold hover:underline flex items-center gap-1"
            >
              Criar Novo Projeto →
            </Link>
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
                Inicie um novo dimensionamento para dimensionar a lista de materiais, cabos, proteções da NBR 17019 e padrão da concessionária.
              </p>
              <Link 
                href="/carregamento/novo" 
                className="bg-[#0A192F] text-white px-6 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 hover:bg-slate-800 transition-all shadow"
              >
                <Plus className="w-4 h-4 text-[#00B356]" />
                Iniciar Primeiro Projeto CoenergyGO
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <Link 
                  href={`/carregamento/${p.id}`} 
                  key={p.id} 
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#E45318]/40 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {p.utility || 'CEMIG'}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 group-hover:text-[#E45318] transition-colors mt-1.5">
                        {p.projectName || 'Dimensionamento VE'}
                      </h4>
                      <p className="text-xs text-slate-500">{p.clientName || 'Cliente sem nome'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#E45318] group-hover:translate-x-1 transition-all" />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#E45318]" />
                      {p.totalPowerKW || 7.4} kW
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: BANCO DE VEÍCULOS & SIMULADOR DE CARGA ─── */}
      {activeTab === 'veiculos' && (
        <div className="space-y-6">
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

                {/* Seleção do Carregador para Simulação */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Configuração da Estação de Recarga a Simular
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
                      { name: '180 kW (DC Eletroposto)', kw: 180.0, phases: 3, type: 'DC' },
                    ].map((c) => {
                      const isSelected = simChargerPowerKW === c.kw && simChargerType === c.type;
                      return (
                        <button
                          key={c.name}
                          onClick={() => {
                            setSimChargerPowerKW(c.kw);
                            setSimChargerPhases(c.phases as 1 | 3);
                            setSimChargerType(c.type as 'AC' | 'DC');
                          }}
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
                        Potência efetiva calculada: <strong>{simulationResult.effectiveChargingPowerKW} kW</strong> (em vez dos {simChargerPowerKW} kW nominais do carregador).
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
        </div>
      )}

      {/* ─── TAB 3: CONCESSIONÁRIAS (CEMIG, CPFL, ENERGISA, ENEL) ─── */}
      {activeTab === 'concessionarias' && (
        <div className="space-y-6">
          {/* Seletor de Concessionária */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Motor de Concessionárias de Energia</h3>
                <p className="text-xs text-slate-500">
                  Regras estritas de atendimento BT, medição agrupada para condomínios e subestações MT
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { id: 'CEMIG', label: 'CEMIG (Minas Gerais)', norm: 'ND-5.1 / ND-5.2 / ND-5.3' },
                  { id: 'CPFL', label: 'CPFL Energia', norm: 'GED-150030 / GED-13' },
                  { id: 'ENERGISA', label: 'Grupo Energisa', norm: 'NDU 042 / NDU 001' },
                  { id: 'ENEL_SP', label: 'Enel SP', norm: 'LIG BT / Enel X' }
                ].map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUtility(u.id as any)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                      selectedUtility === u.id
                        ? 'bg-[#0A192F] text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {u.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Parâmetros da Simulação */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Tipo de Instalação
                </label>
                <select
                  value={installationType}
                  onChange={(e) => setInstallationType(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
                >
                  <option value="individual">Residencial / Comercial Individual</option>
                  <option value="coletivo_condominio">Condomínio Coletivo (Edificação)</option>
                  <option value="comercial_eletroposto">Eletroposto Comercial Dedicado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Carga Existente da Edificação (kW)
                </label>
                <input
                  type="number"
                  value={existingLoadKW}
                  onChange={(e) => setExistingLoadKW(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Qtd de Carregadores VE
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={chargerCount}
                  onChange={(e) => setChargerCount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Potência Unitária (kW)
                </label>
                <select
                  value={chargerPowerUnitKW}
                  onChange={(e) => setChargerPowerUnitKW(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
                >
                  <option value="7.4">7.4 kW (Wallbox Monofásico/Bifásico)</option>
                  <option value="11.0">11.0 kW (Trifásico Comercial)</option>
                  <option value="22.0">22.0 kW (Trifásico Rápido AC)</option>
                  <option value="30.0">30.0 kW (DC Rápido)</option>
                  <option value="60.0">60.0 kW (DC Rápido)</option>
                </select>
              </div>
            </div>

            {/* Resultado da Análise da Concessionária */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-[#0A192F] text-white p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-[10px] font-black uppercase text-[#00B356] tracking-wider">
                      Parecer Técnico da Concessionária
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {utilityAnalysis.supplyLevel === 'BT' ? 'Baixa Tensão (BT)' : 'Média Tensão (MT)'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 font-medium">Categoria do Padrão Recomendada</p>
                    <h3 className="text-xl font-bold text-white mt-0.5">{utilityAnalysis.category.categoryName}</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Limite de Atendimento: <strong>{utilityAnalysis.category.maxLimitKW} kW</strong> | Disjuntor Geral: <strong>{utilityAnalysis.category.breakerCurrentA}A</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/60 p-3 rounded-2xl">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cabo Ramal (Fase/Neutro)</span>
                      <strong>{utilityAnalysis.category.cableGaugePhaseMM2} mm² cobre</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Condutor de Terra (PE)</span>
                      <strong>{utilityAnalysis.category.cableGaugeGroundMM2} mm²</strong>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-700/50">
                      <span className="text-slate-400 block text-[10px]">Caixa / Padrão de Medição</span>
                      <strong className="text-emerald-400">{utilityAnalysis.category.meterBoxType}</strong>
                    </div>
                  </div>

                  {utilityAnalysis.requiresTransformer && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 text-xs text-orange-300 space-y-1">
                      <strong className="text-orange-400 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4" /> Exige Subestação Particular MT
                      </strong>
                      <p>
                        A carga total ({utilityAnalysis.totalInstallationLoadKW} kW) supera o limite regulatório de 75 kW de BT.
                        Transformador mínimo recomendado: <strong>{utilityAnalysis.recommendedTransformerKVA} kVA</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações Mandatórias da Concessionária */}
              <div className="lg:col-span-6 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Ações e Exigências Regulatórias ({selectedUtility})
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

      {/* ─── TAB 4: AUDITORIA NBR 17019 & BOMBEIROS ─── */}
      {activeTab === 'nbr17019' && auditResult && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Motor de Proteção Mandatória NBR 17019</h3>
                <p className="text-xs text-slate-500">
                  Regras compulsórias de segurança, prevenção contra choque elétrico e proteção contra incêndio
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> NBR 17019 / NBR 5410
              </span>
            </div>

            {/* Parâmetros Rápidos da Linha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Potência do Ponto VE (kW)
                </label>
                <select
                  value={auditPowerKW}
                  onChange={(e) => setAuditPowerKW(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
                >
                  <option value="7.4">7.4 kW (Monofásico 32A / 220V)</option>
                  <option value="11.0">11.0 kW (Trifásico 16A / 380V)</option>
                  <option value="22.0">22.0 kW (Trifásico 32A / 380V)</option>
                  <option value="30.0">30.0 kW (DC Rápido / 380V)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Comprimento do Circuito (metros)
                </label>
                <input
                  type="number"
                  value={auditCableLength}
                  onChange={(e) => setAuditCableLength(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">
                  Checklist do Corpo de Bombeiros (IT-41 / IT-30)
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={auditHasEmergencyButton}
                      onChange={(e) => setAuditHasEmergencyButton(e.target.checked)}
                      className="rounded text-[#E45318] focus:ring-0"
                    />
                    Botoeira de Emergência (EPO) a &le; 5m
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={auditHasBollards}
                      onChange={(e) => setAuditHasBollards(e.target.checked)}
                      className="rounded text-[#E45318] focus:ring-0"
                    />
                    Defensas mecânicas contra colisão
                  </label>
                </div>
              </div>
            </div>

            {/* Cards de Proteções Obrigatórias Calculadas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block">
                  Condutores & Queda de Tensão
                </span>
                <h4 className="text-base font-bold text-white">
                  Cabos: {auditResult.cableGaugePhaseMM2} mm² | PE: {auditResult.cableGaugeProtectionPEMM2} mm²
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Queda calculada: <strong className={auditResult.isVoltageDropCompliant ? 'text-emerald-400' : 'text-red-400'}>
                    {auditResult.voltageDropPercent}% ({auditResult.voltageDropVolts}V)
                  </strong> (Máx. permitido pela NBR 17019: 2.0%).
                </p>
                <span className="text-[10px] font-bold text-slate-300 block pt-1">
                  Eletroduto sugerido: {auditResult.conduitRecommendedInch}
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

      {/* ─── TAB 5: CURVA DE CARGA, FOLGA DE DEMANDA & DLM (PASSO 2) ─── */}
      {activeTab === 'curva_dlm' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
            gridLimitKW={dlmGridLimitKW}
            setGridLimitKW={setDlmGridLimitKW}
            chargerCount={dlmChargerCount}
            setChargerCount={setDlmChargerCount}
            chargerUnitPowerKW={dlmChargerUnitPowerKW}
            setChargerUnitPowerKW={setDlmChargerUnitPowerKW}
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
            onFileUpload={handleFileUpload}
            isLoadingFile={isLoadingFile}
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

      {/* ─── TAB 6: INFRAESTRUTURA ELETROTÉCNICA & SMARTMETER (PASSO 3) ─── */}
      {activeTab === 'infraestrutura' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Painel de Upload e Seleção de Dados */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#E45318] tracking-wider bg-orange-50 px-2.5 py-0.5 rounded-full">
                    Passo 3: Módulo de Infraestrutura
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Leitura por Período Excel & Memória de Massa</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mt-1">
                  Dados de Medição do Local & Dimensionamento Eletrotécnico
                </h3>
                <p className="text-xs text-slate-500">
                  Importe dados de consumo em Excel (.xlsx) ou memórias de massa (.csv) para calcular a infraestrutura elétrica exata do carregador.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleLoadSmartMeterDemo}
                  disabled={isLoadingFile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Carregar SmartMeter.xlsx (Local de Exemplo)
                </button>
                <label className="bg-[#E45318] hover:bg-[#d04610] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow cursor-pointer transition-all flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Planilha (.xlsx / .csv)
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Configuração dos Parâmetros da Infraestrutura */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Potência do Carregador</label>
                <select
                  value={infraChargerPowerKW}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setInfraChargerPowerKW(p);
                    if (p >= 11) {
                      setInfraChargerPhases(3);
                      setInfraChargerVoltage(380);
                    } else {
                      setInfraChargerPhases(1);
                      setInfraChargerVoltage(220);
                    }
                  }}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 focus:ring-0 mt-1"
                >
                  <option value="7.4">7.4 kW (Wallbox 32A Monofásico/Bifásico)</option>
                  <option value="11.0">11.0 kW (Wallbox 16A Trifásico 380V)</option>
                  <option value="22.0">22.0 kW (Wallbox 32A Trifásico 380V)</option>
                  <option value="3.7">3.7 kW (Wallbox 16A Monofásico)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Comprimento do Circuito</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="5"
                    max="150"
                    value={infraCableLength}
                    onChange={(e) => setInfraCableLength(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400">metros</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Método de Instalação</label>
                <select
                  value={infraInstallationMethod}
                  onChange={(e) => setInfraInstallationMethod(e.target.value as any)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 mt-1"
                >
                  <option value="B1">B1 - Eletroduto em alvenaria</option>
                  <option value="B2">B2 - Eletroduto aparente</option>
                  <option value="C">C - Eletrocalha / perfilado</option>
                  <option value="D">D - Eletroduto subterrâneo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Limite Padrão da Rede</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={infraGridLimitKW}
                    onChange={(e) => setInfraGridLimitKW(Number(e.target.value))}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400">kW</span>
                </div>
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infraIsOutdoor}
                    onChange={(e) => setInfraIsOutdoor(e.target.checked)}
                    className="rounded text-[#E45318]"
                  />
                  Instalação Externa (IP65)
                </label>
              </div>
            </div>
          </div>

          {/* Visualização dos Dados Medidos Importados (SmartMeter.xlsx) */}
          {smartMeterSummary ? (
            <ImportedDataViewer
              summary={smartMeterSummary}
              chargerPowerKW={infraChargerPowerKW}
              gridLimitKW={infraGridLimitKW}
              onClear={() => setSmartMeterSummary(null)}
            />
          ) : (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h4 className="text-sm font-bold text-amber-950">Nenhuma planilha SmartMeter importada no momento</h4>
                </div>
                <p className="text-xs text-amber-800">
                  Carregue o arquivo <strong>SmartMeter.xlsx</strong> da pasta download ou clique no botão acima para visualizar a curva de medição em alta resolução.
                </p>
              </div>
              <button
                onClick={handleLoadSmartMeterDemo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow whitespace-nowrap"
              >
                Carregar Arquivo SmartMeter.xlsx Agora
              </button>
            </div>
          )}

          {/* Painel de Infraestrutura Eletrotécnica e Lista de Materiais (BOM) */}
          <InfrastructurePanel
            sizing={infrastructureSizing}
            chargerPowerKW={infraChargerPowerKW}
            chargerVoltage={infraChargerVoltage}
            chargerPhases={infraChargerPhases}
            cableLengthMeters={infraCableLength}
          />
        </div>
      )}
    </div>
  );
}
