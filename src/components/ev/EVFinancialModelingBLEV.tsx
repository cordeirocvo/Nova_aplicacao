"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Zap,
  Sun,
  ShieldCheck,
  Building2,
  Calendar,
  Percent,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Save,
  Sliders,
  Sparkles,
  Info,
  Clock,
  Car,
  ChevronRight,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import {
  calculateScenarioProjections,
  formatPaybackMonthsAndYears,
  ScenarioProjection,
  FinancialModelingOptions,
  CustomRealEstateModelSpec,
  LocationInputData
} from "@/lib/ev/locationScoringEngine";
import { ClientProjectData } from "@/lib/coenergygo/types";

export interface EVFinancialModelingBLEVProps {
  initialCapexBRL?: number;
  capexBreakdown?: {
    materialsBRL: number;
    laborBRL: number;
    bdiBRL: number;
    totalBRL: number;
    itemsCount: number;
    syncedOrcamentoId?: string;
  };
  totalChargersPowerKW: number;
  chargerPowerKW?: number;
  totalChargersCount: number;
  configuredChargers?: Array<{
    id: string;
    name: string;
    powerKW: number;
    type?: string;
  }>;
  selectedUtility?: string;
  gridEnergyCostDefaultBRL?: number;
  solarEnergyCostDefaultBRL?: number;
  vdmVehiclesPerDayDefault?: number;
  fleetDensityPercentDefault?: number;
  averageSessionMinutesDefault?: number;
  clientProjectData?: ClientProjectData;
  dlmCapexSavingsBRL?: number;
  onSaveFinancialAssumptions?: (updatedData: Partial<ClientProjectData>) => void;
  onNavigateToBOM?: () => void;
  onNavigateToTopologia?: () => void;
}

export function EVFinancialModelingBLEV({
  initialCapexBRL = 95000,
  capexBreakdown,
  totalChargersPowerKW = 30,
  chargerPowerKW,
  totalChargersCount = 1,
  configuredChargers = [],
  selectedUtility = "CEMIG",
  gridEnergyCostDefaultBRL = 0.85,
  solarEnergyCostDefaultBRL = 0.39,
  vdmVehiclesPerDayDefault = 15000,
  fleetDensityPercentDefault = 2.5,
  averageSessionMinutesDefault = 35,
  clientProjectData,
  dlmCapexSavingsBRL = 0,
  onSaveFinancialAssumptions,
  onNavigateToBOM,
  onNavigateToTopologia
}: EVFinancialModelingBLEVProps) {
  // ─── 1. CAPEX ALIMENTADO AUTOMATICAMENTE DO PASSO 4B COM OPÇÃO DE OVERRIDE ─
  const [useAutoCapex, setUseAutoCapex] = useState<boolean>(true);
  const [manualCapexBRL, setManualCapexBRL] = useState<number>(initialCapexBRL);

  // Mantém sincronizado com Passo 4B quando o modo auto estiver ativo
  useEffect(() => {
    if (useAutoCapex && initialCapexBRL > 0) {
      setManualCapexBRL(initialCapexBRL);
    }
  }, [initialCapexBRL, useAutoCapex]);

  const effectiveCapexBRL = useAutoCapex && initialCapexBRL > 0 ? initialCapexBRL : manualCapexBRL;

  // ─── 2. PREMISSAS DE MERCADO & FLUXO DE RECARGA (SINCRONIZADAS COM PASSOS 1A E 1B) ─
  const effectivePowerKW = totalChargersPowerKW > 0 ? totalChargersPowerKW : (chargerPowerKW || 30);
  const [tariffPerKWh, setTariffPerKWh] = useState<number>(clientProjectData?.ahpTariffBRL || 2.10);
  const [energyCostPerKWh, setEnergyCostPerKWh] = useState<number>(clientProjectData?.ahpEnergyCostBRL || gridEnergyCostDefaultBRL);
  const [solarEnergyCostPerKWh, setSolarEnergyCostPerKWh] = useState<number>(clientProjectData?.ahpSolarEnergyCostBRL || solarEnergyCostDefaultBRL);
  const [energySourceMode, setEnergySourceMode] = useState<"concessionaria" | "solar" | "hibrido">(
    (clientProjectData?.ahpEnergySourceMode as any) || "concessionaria"
  );
  const [solarSharePercent, setSolarSharePercent] = useState<number>(clientProjectData?.ahpSolarSharePercent || 50);

  // Parâmetros de tráfego
  const [vdm, setVdm] = useState<number>(clientProjectData?.ahpVdm || vdmVehiclesPerDayDefault);
  const [fleetDensity, setFleetDensity] = useState<number>(clientProjectData?.ahpFleetDensityPercent || fleetDensityPercentDefault);
  const [avgSessionMinutes, setAvgSessionMinutes] = useState<number>(
    clientProjectData?.ahpSessionMinutes || averageSessionMinutesDefault
  );

  // Custos operacionais (OPEX)
  const [variableOpexPercent, setVariableOpexPercent] = useState<number>(clientProjectData?.ahpVariableOpexPercent || 12);
  const [fixedOpexBRL, setFixedOpexBRL] = useState<number>(clientProjectData?.ahpFixedOpexBRL || 350);

  // Modelo do Ponto Comercial / Parceria
  const [realEstateModel, setRealEstateModel] = useState<string>(clientProjectData?.ahpRealEstateModel || "comodato");
  const [revenueSharePercent, setRevenueSharePercent] = useState<number>(clientProjectData?.ahpRevenueSharePercent || 10);
  const [fixedRentBRL, setFixedRentBRL] = useState<number>(clientProjectData?.ahpFixedRentBRL || 500);
  const [customRealEstateModels, setCustomRealEstateModels] = useState<CustomRealEstateModelSpec[]>(
    (clientProjectData?.ahpCustomRealEstateModels as any) || []
  );
  const [showCustomPartnerModal, setShowCustomPartnerModal] = useState<boolean>(false);
  const [newPartnerLabel, setNewPartnerLabel] = useState<string>("");
  const [newPartnerShare, setNewPartnerShare] = useState<number>(10);
  const [newPartnerFixed, setNewPartnerFixed] = useState<number>(0);
  const [newPartnerBasis, setNewPartnerBasis] = useState<"gross" | "net_margin">("gross");

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sincroniza com clientProjectData quando um novo projeto ou rascunho é carregado
  useEffect(() => {
    if (clientProjectData) {
      if (typeof clientProjectData.ahpTariffBRL === 'number') setTariffPerKWh(clientProjectData.ahpTariffBRL);
      if (typeof clientProjectData.ahpEnergyCostBRL === 'number') setEnergyCostPerKWh(clientProjectData.ahpEnergyCostBRL);
      if (typeof clientProjectData.ahpSolarEnergyCostBRL === 'number') setSolarEnergyCostPerKWh(clientProjectData.ahpSolarEnergyCostBRL);
      if (typeof clientProjectData.ahpFixedOpexBRL === 'number') setFixedOpexBRL(clientProjectData.ahpFixedOpexBRL);
      if (typeof clientProjectData.ahpVariableOpexPercent === 'number') setVariableOpexPercent(clientProjectData.ahpVariableOpexPercent);
      if (typeof clientProjectData.ahpSessionMinutes === 'number') setAvgSessionMinutes(clientProjectData.ahpSessionMinutes);
      if (typeof clientProjectData.ahpVdm === 'number') setVdm(clientProjectData.ahpVdm);
      if (typeof clientProjectData.ahpFleetDensityPercent === 'number') setFleetDensity(clientProjectData.ahpFleetDensityPercent);
      if (clientProjectData.ahpEnergySourceMode) setEnergySourceMode(clientProjectData.ahpEnergySourceMode as any);
      if (typeof clientProjectData.ahpSolarSharePercent === 'number') setSolarSharePercent(clientProjectData.ahpSolarSharePercent);
      if (clientProjectData.ahpRealEstateModel) setRealEstateModel(clientProjectData.ahpRealEstateModel);
      if (typeof clientProjectData.ahpRevenueSharePercent === 'number') setRevenueSharePercent(clientProjectData.ahpRevenueSharePercent);
      if (typeof clientProjectData.ahpFixedRentBRL === 'number') setFixedRentBRL(clientProjectData.ahpFixedRentBRL);
      if (Array.isArray(clientProjectData.ahpCustomRealEstateModels)) setCustomRealEstateModels(clientProjectData.ahpCustomRealEstateModels as any);
      if (typeof clientProjectData.ahpCapexBRL === 'number') {
        setManualCapexBRL(clientProjectData.ahpCapexBRL);
      }
      if (typeof (clientProjectData as any).ahpUseAutoCapex === 'boolean') {
        setUseAutoCapex((clientProjectData as any).ahpUseAutoCapex);
      }
    }
  }, [clientProjectData]);

  // Propagação contínua automática para o pai e para localStorage a cada alteração nos inputs
  const onSaveAssumptionsRef = React.useRef(onSaveFinancialAssumptions);
  onSaveAssumptionsRef.current = onSaveFinancialAssumptions;
  const lastFinancialSigRef = React.useRef<string>('');

  useEffect(() => {
    const payload = {
      ahpTariffBRL: tariffPerKWh,
      ahpEnergyCostBRL: energyCostPerKWh,
      ahpSolarEnergyCostBRL: solarEnergyCostPerKWh,
      ahpEnergySourceMode: energySourceMode,
      ahpSolarSharePercent: solarSharePercent,
      ahpCapexBRL: effectiveCapexBRL,
      ahpRealEstateModel: realEstateModel,
      ahpRevenueSharePercent: revenueSharePercent,
      ahpFixedRentBRL: fixedRentBRL,
      ahpVariableOpexPercent: variableOpexPercent,
      ahpFixedOpexBRL: fixedOpexBRL,
      ahpSessionMinutes: avgSessionMinutes,
      ahpVdm: vdm,
      ahpFleetDensityPercent: fleetDensity,
      ahpCustomRealEstateModels: customRealEstateModels,
      ahpUseAutoCapex: useAutoCapex
    };

    const sig = JSON.stringify(payload);
    if (sig !== lastFinancialSigRef.current) {
      lastFinancialSigRef.current = sig;
      try {
        localStorage.setItem('coenergygo_financial_assumptions', sig);
      } catch (e) {}
      if (onSaveAssumptionsRef.current) {
        onSaveAssumptionsRef.current(payload);
      }
    }
  }, [
    tariffPerKWh,
    energyCostPerKWh,
    solarEnergyCostPerKWh,
    energySourceMode,
    solarSharePercent,
    effectiveCapexBRL,
    realEstateModel,
    revenueSharePercent,
    fixedRentBRL,
    variableOpexPercent,
    fixedOpexBRL,
    avgSessionMinutes,
    vdm,
    fleetDensity,
    customRealEstateModels,
    useAutoCapex
  ]);

  // ─── 3. CÁLCULO DOS 3 CENÁRIOS OPERACIONAIS (PADRÃO BLEV / FOTOS 01 & 02) ───
  const financialOptions: FinancialModelingOptions = useMemo(() => ({
    energySourceMode,
    gridCostPerKWh: energyCostPerKWh,
    solarEnergyCostPerKWh,
    solarSharePercent,
    realEstateModel,
    revenueSharePercent,
    fixedRentBRL,
    variableOpexPercent,
    fixedOpexBRL,
    customRealEstateModels
  }), [
    energySourceMode,
    energyCostPerKWh,
    solarEnergyCostPerKWh,
    solarSharePercent,
    realEstateModel,
    revenueSharePercent,
    fixedRentBRL,
    variableOpexPercent,
    fixedOpexBRL,
    customRealEstateModels
  ]);

  const locationInput: LocationInputData = useMemo(() => ({
    vdmVehiclesPerDay: vdm,
    evFleetDensityPercent: fleetDensity,
    totalChargerPowerKW: effectivePowerKW,
    averageDwellTimeMinutes: avgSessionMinutes,
    commercialAnchor: (clientProjectData?.ahpCommercialAnchor as any) || "posto_combustivel_rodoviario",
    gridCategory: (clientProjectData?.ahpGridCategory as any) || "entrada_existente_adequada",
    availablePowerKW: effectivePowerKW,
    competitorDistanceKM: 5.0,
    isVerticalHousingArea: clientProjectData?.ahpIsVerticalHousing,
    fleetVehiclesCount: clientProjectData?.ahpFleetCount
  }), [vdm, fleetDensity, effectivePowerKW, avgSessionMinutes, clientProjectData]);

  const scenarios: ScenarioProjection[] = useMemo(() => {
    return calculateScenarioProjections(
      locationInput,
      effectiveCapexBRL,
      tariffPerKWh,
      energyCostPerKWh,
      financialOptions
    );
  }, [locationInput, effectiveCapexBRL, tariffPerKWh, energyCostPerKWh, financialOptions]);

  const realisticScenario = scenarios.find((s) => s.name === "Realista") || scenarios[1] || scenarios[0];

  // Cálculo da TIR Anualizada e VPL de 5 anos para o cenário Realista
  const financialMetrics = useMemo(() => {
    const annualNetProfit = realisticScenario.monthlyNetProfit * 12;
    const tirPercent = effectiveCapexBRL > 0
      ? Number(((annualNetProfit / effectiveCapexBRL) * 100).toFixed(1))
      : 0;

    // VPL com taxa mínima de atratividade (TMA) de 12% a.a.
    const discountRate = 0.12;
    let vplBRL = -effectiveCapexBRL;
    for (let year = 1; year <= 5; year++) {
      vplBRL += annualNetProfit / Math.pow(1 + discountRate, year);
    }

    // Economia mensal extra com energia solar vs concessionária
    const monthlySolarSavingsBRL = realisticScenario.monthlyKWh * Math.max(0, energyCostPerKWh - solarEnergyCostPerKWh);

    return {
      annualGrossRevenue: realisticScenario.monthlyGrossRevenue * 12,
      annualNetProfit,
      tirPercent,
      vplBRL: Number(vplBRL.toFixed(2)),
      monthlySolarSavingsBRL: Number(monthlySolarSavingsBRL.toFixed(2)),
      annualSolarSavingsBRL: Number((monthlySolarSavingsBRL * 12).toFixed(2))
    };
  }, [realisticScenario, effectiveCapexBRL, energyCostPerKWh, solarEnergyCostPerKWh]);

  // Salvar premissas no projeto
  const handleSaveAssumptions = () => {
    if (onSaveFinancialAssumptions) {
      onSaveFinancialAssumptions({
        ahpTariffBRL: tariffPerKWh,
        ahpEnergyCostBRL: energyCostPerKWh,
        ahpSolarEnergyCostBRL: solarEnergyCostPerKWh,
        ahpEnergySourceMode: energySourceMode,
        ahpSolarSharePercent: solarSharePercent,
        ahpCapexBRL: effectiveCapexBRL,
        ahpRealEstateModel: realEstateModel,
        ahpRevenueSharePercent: revenueSharePercent,
        ahpFixedRentBRL: fixedRentBRL,
        ahpVariableOpexPercent: variableOpexPercent,
        ahpFixedOpexBRL: fixedOpexBRL,
        ahpSessionMinutes: avgSessionMinutes,
        ahpVdm: vdm,
        ahpFleetDensityPercent: fleetDensity,
        ahpCustomRealEstateModels: customRealEstateModels
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  // Exportação CSV formatada dos 3 cenários
  const handleExportCSV = () => {
    const headers = [
      "Cenario",
      "Horas Uteis/dia",
      "Ocupacao (%)",
      "Sessoes/dia",
      "Energia (kWh/dia)",
      "Energia (kWh/mes)",
      "Tarifa Venda (R$/kWh)",
      "Receita Bruta Mensal (R$)",
      "Custo Energia Mensal (R$)",
      "OPEX Mensal (R$)",
      "Custo Ponto (R$)",
      "Lucro Liquido Mensal (R$)",
      "Lucro Liquido Anual (R$)",
      "CAPEX Total (R$)",
      "Payback (Meses)",
      "Payback Formatado",
      "TIR Estimada (%)"
    ];

    const rows = scenarios.map((sc) => [
      sc.name,
      sc.operatingHoursPerDay,
      sc.utilizationRatePercent,
      sc.dailySessions,
      sc.dailyKWh,
      sc.monthlyKWh,
      sc.tariffPerKWh.toFixed(2),
      sc.monthlyGrossRevenue.toFixed(2),
      sc.monthlyEnergyCost.toFixed(2),
      sc.monthlyOpex.toFixed(2),
      sc.monthlyRealEstateCost.toFixed(2),
      sc.monthlyNetProfit.toFixed(2),
      (sc.monthlyNetProfit * 12).toFixed(2),
      sc.totalCapexBRL.toFixed(2),
      sc.paybackMonths.toFixed(1),
      sc.paybackYearsAndMonthsLabel,
      sc.totalCapexBRL > 0 ? ((sc.monthlyNetProfit * 12 / sc.totalCapexBRL) * 100).toFixed(1) : "0"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Projecao_Financeira_BLEV_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-['Montserrat',sans-serif]">
      {/* ─── BANNER PRINCIPAL DO PASSO 5: INTEGRAÇÃO SSOT & BRANDING BLEV ──── */}
      <div className="bg-gradient-to-r from-[#0A192F] via-slate-900 to-[#0A192F] border border-slate-700/80 rounded-3xl p-5 md:p-6 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00B356]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#E45318]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-[#00B356] border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                <DollarSign className="w-3.5 h-3.5" />
                Passo 5: Viabilidade Econômico-Financeira
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700">
                Padrão BLEV / Carlos Magno • Fotos 01 &amp; 02
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#00B356]" />
                Alimentado pelos Passos 1A, 1B, 2A &amp; 4B
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Modelagem Financeira de Negócios &amp; Projeção em 3 Cenários
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              O fluxo de caixa abaixo utiliza rigorosamente os dados reais consolidados na esteira: o{" "}
              <strong className="text-white">CAPEX oficial de R$ {effectiveCapexBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>{" "}
              gerado na Lista de Materiais do Passo 4B, a potência instalada de{" "}
              <strong className="text-emerald-400">{effectivePowerKW} kW</strong> do Passo 1A e as tarifas da{" "}
              <strong className="text-amber-400">{selectedUtility}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {onNavigateToBOM && (
              <button
                type="button"
                onClick={onNavigateToBOM}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Voltar para a Lista de Materiais e Orçamentos do Passo 4B"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auditar CAPEX no Passo 4B</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#E45318] hover:bg-[#c24310] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Exportar planilha analítica completa com os 3 cenários operacionais"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir</span>
            </button>

            {onSaveFinancialAssumptions && (
              <button
                type="button"
                onClick={handleSaveAssumptions}
                className="px-4 py-2 rounded-xl bg-[#00B356] hover:bg-[#009b4a] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#00B356]/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveSuccess ? "Salvo no Projeto!" : "Salvar Premissas"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── BARRA DE RASTREABILIDADE SSOT (DADOS IMPORTADOS DOS OUTROS PASSOS) ─── */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Origem CAPEX Passo 4B */}
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">CAPEX do Projeto (Passo 4B)</span>
            <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
              R$ {effectiveCapexBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-medium">
              {capexBreakdown ? `${capexBreakdown.itemsCount} itens BOM + M.O. + BDI` : "Sincronizado SSOT"}
            </span>
          </div>

          {/* Potência Passo 1A */}
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Potência VE (Passo 1A)</span>
            <div className="text-sm font-black text-white font-mono mt-0.5">
              {effectivePowerKW} kW
            </div>
            <span className="text-[9px] text-slate-500 font-medium">
              {totalChargersCount} {totalChargersCount === 1 ? "estação" : "estações"} no ponto
            </span>
          </div>

          {/* Tarifa Rede Passo 2A */}
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Tarifa Concessionária (2A)</span>
            <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
              R$ {energyCostPerKWh.toFixed(2)}/kWh
            </div>
            <span className="text-[9px] text-slate-500 font-medium">
              {selectedUtility} ND-5.1
            </span>
          </div>

          {/* Tráfego VDM Passo 1B */}
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Tráfego da Via (Passo 1B)</span>
            <div className="text-sm font-black text-purple-300 font-mono mt-0.5">
              {vdm.toLocaleString("pt-BR")} VEs/dia
            </div>
            <span className="text-[9px] text-slate-500 font-medium">
              Frota VE: {fleetDensity}%
            </span>
          </div>

          {/* Duração Recarga */}
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Tempo Médio Recarga</span>
            <div className="text-sm font-black text-sky-300 font-mono mt-0.5">
              {avgSessionMinutes} min
            </div>
            <span className="text-[9px] text-slate-500 font-medium">
              {(avgSessionMinutes / 60).toFixed(2)}h por sessão
            </span>
          </div>

          {/* Curva CC/CV */}
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Fator Curva CC/CV</span>
            <div className="text-sm font-black text-[#00B356] font-mono mt-0.5">
              82% (0.82)
            </div>
            <span className="text-[9px] text-slate-500 font-medium">
              Saturação real de bateria
            </span>
          </div>
        </div>
      </div>

      {/* ─── CARDS DE INDICADORES EXECUTIVOS (CENÁRIO REALISTA) ────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lucro Líquido Mensal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Lucro Líquido Operacional</span>
            <TrendingUp className="w-4 h-4 text-[#00B356]" />
          </div>
          <div className="text-2xl font-black text-[#00B356] font-mono">
            R$ {realisticScenario.monthlyNetProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-400">/mês</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            R$ {financialMetrics.annualNetProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por ano (Cenário Realista)
          </p>
        </div>

        {/* Payback do Investimento */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Payback Simples (CAPEX / Lucro)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {realisticScenario.paybackMonths.toFixed(1)} <span className="text-xs font-normal text-slate-400">meses</span>
          </div>
          <p className="text-[10px] text-amber-400/90 mt-1 font-semibold">
            {realisticScenario.paybackYearsAndMonthsLabel}
          </p>
        </div>

        {/* TIR Anualizada */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>TIR Estimada (Retorno Anual)</span>
            <Percent className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {financialMetrics.tirPercent}% <span className="text-xs font-normal text-slate-400">a.a.</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            VPL (5 anos a 12% a.a.): R$ {financialMetrics.vplBRL.toLocaleString("pt-BR")}
          </p>
        </div>

        {/* Economia com Energia Solar Cordeiro */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold mb-1">
            <span>Vantagem Solar Cordeiro</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            + R$ {financialMetrics.monthlySolarSavingsBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-400">/mês</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
            Economia de R$ {financialMetrics.annualSolarSavingsBRL.toLocaleString("pt-BR")} / ano com geração própria
          </p>
        </div>
      </div>

      {/* ─── PAINEL DE CONTROLE DE ENERGIA & PARCERIA COMERCIAL DO PONTO ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg text-xs">
        {/* Bloco 1: Matriz de Custos de Energia (Rede vs Solar) */}
        <div className="lg:col-span-6 space-y-3 border-b lg:border-b-0 lg:border-r border-slate-800 pb-4 lg:pb-0 lg:pr-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              1. Matriz Energética da Recarga:
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              Efetivo: R$ {realisticScenario.energyCostPerKWh.toFixed(2)}/kWh
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Alterne entre energia da concessionária ou geração solar própria para simular a explosão de margem do modelo BLEV.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "concessionaria", label: "⚡ Concessionária", sub: `R$ ${energyCostPerKWh.toFixed(2)}/kWh` },
              { id: "solar", label: "☀️ Energia Solar", sub: `R$ ${solarEnergyCostPerKWh.toFixed(2)}/kWh` },
              { id: "hibrido", label: "🔄 Mix Híbrido", sub: `${solarSharePercent}% Solar` }
            ].map((m) => {
              const active = energySourceMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setEnergySourceMode(m.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? "bg-[#00B356] text-white border-emerald-400 shadow-lg shadow-[#00B356]/20"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <strong className="block text-xs font-black">{m.label}</strong>
                  <span className={`text-[10px] font-mono ${active ? "text-emerald-100" : "text-slate-400"}`}>
                    {m.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {energySourceMode === "hibrido" && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">
                  Composição do Mix: <strong className="text-emerald-400">{solarSharePercent}% Solar</strong> +{" "}
                  <strong className="text-amber-400">{100 - solarSharePercent}% Concessionária</strong>
                </span>
                <span className="font-mono text-white font-bold">
                  R$ {realisticScenario.energyCostPerKWh.toFixed(2)}/kWh
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={solarSharePercent}
                onChange={(e) => setSolarSharePercent(Number(e.target.value))}
                className="w-full accent-[#00B356] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Bloco 2: Modelo do Ponto Comercial / Parceria */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#E45318]" />
              2. Modelo Comercial do Ponto / Aluguel:
            </span>
            <button
              type="button"
              onClick={() => setShowCustomPartnerModal(!showCustomPartnerModal)}
              className="text-[11px] font-bold text-[#00B356] hover:underline cursor-pointer"
            >
              {showCustomPartnerModal ? "Fechar Cadastro" : "+ Cadastrar Nova Modalidade"}
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Defina o acordo comercial com o proprietário do imóvel (shopping, posto, supermercado ou condomínio).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <select
              value={realEstateModel}
              onChange={(e) => setRealEstateModel(e.target.value)}
              className="sm:col-span-7 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="comodato">Comodato Gratuito (Ponto Próprio — 0%)</option>
              <option value="revenue_share_bruto">Participação na Receita Bruta — Revenue Share (%)</option>
              <option value="revenue_share_liquido">Participação na Margem Pós-Energia (%)</option>
              <option value="aluguel_fixo">Aluguel Fixo Mensal de Vaga (R$/mês)</option>
              <option value="misto">Modelo Misto (Aluguel Fixo R$ + % Receita)</option>
              <option value="reembolso_energia_split">Parceiro Cede Energia + Split de Lucro (%)</option>
              {customRealEstateModels.map((cm) => (
                <option key={cm.id} value={cm.id}>
                  ★ {cm.label} ({cm.fixedRentBRL > 0 ? `R$ ${cm.fixedRentBRL} + ` : ""}{cm.revenueSharePercent}%)
                </option>
              ))}
            </select>

            {(realEstateModel === "revenue_share" ||
              realEstateModel === "revenue_share_bruto" ||
              realEstateModel === "revenue_share_liquido" ||
              realEstateModel === "misto" ||
              realEstateModel === "reembolso_energia_split") && (
              <div className="sm:col-span-5 flex items-center gap-1.5 bg-slate-950 border border-amber-500/40 rounded-xl px-2.5 py-1.5">
                <span className="text-[10px] text-amber-300 font-mono whitespace-nowrap">% Repasse:</span>
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="1"
                  value={revenueSharePercent}
                  onChange={(e) => setRevenueSharePercent(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-transparent text-xs font-bold text-amber-300 focus:outline-none text-right font-mono"
                />
                <span className="text-[10px] text-slate-400 font-mono">%</span>
              </div>
            )}

            {(realEstateModel === "aluguel_fixo" || realEstateModel === "misto") && (
              <div className="sm:col-span-5 flex items-center gap-1.5 bg-slate-950 border border-cyan-500/40 rounded-xl px-2.5 py-1.5">
                <span className="text-[10px] text-cyan-300 font-mono whitespace-nowrap">Fixo R$:</span>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  step="50"
                  value={fixedRentBRL}
                  onChange={(e) => setFixedRentBRL(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-transparent text-xs font-bold text-cyan-300 focus:outline-none text-right font-mono"
                />
              </div>
            )}
          </div>

          {/* Modal rápido inline para nova modalidade */}
          {showCustomPartnerModal && (
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2 text-[10px]">
              <span className="font-bold text-emerald-400 uppercase block">Cadastrar Nova Modalidade de Parceria:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Nome (ex: Rede Postos 15%)"
                  value={newPartnerLabel}
                  onChange={(e) => setNewPartnerLabel(e.target.value)}
                  className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold"
                />
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2">
                  <span className="text-slate-400">% Rec:</span>
                  <input
                    type="number"
                    value={newPartnerShare}
                    onChange={(e) => setNewPartnerShare(Number(e.target.value))}
                    className="w-full bg-transparent text-white font-bold py-1 text-right"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2">
                  <span className="text-slate-400">Fixo R$:</span>
                  <input
                    type="number"
                    value={newPartnerFixed}
                    onChange={(e) => setNewPartnerFixed(Number(e.target.value))}
                    className="w-full bg-transparent text-white font-bold py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newPartnerBasis}
                  onChange={(e) => setNewPartnerBasis(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                >
                  <option value="gross">Calcular % sobre Receita Bruta</option>
                  <option value="net_margin">Calcular % sobre Margem Pós-Energia</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPartnerLabel.trim()) return;
                    const id = "custom_" + Date.now();
                    const nextModels = [
                      ...customRealEstateModels,
                      {
                        id,
                        label: newPartnerLabel.trim(),
                        fixedRentBRL: newPartnerFixed,
                        revenueSharePercent: newPartnerShare,
                        basis: newPartnerBasis
                      }
                    ];
                    setCustomRealEstateModels(nextModels);
                    setRealEstateModel(id);
                    setFixedRentBRL(newPartnerFixed);
                    setRevenueSharePercent(newPartnerShare);
                    setNewPartnerLabel("");
                    setShowCustomPartnerModal(false);
                  }}
                  className="bg-[#00B356] hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg cursor-pointer"
                >
                  Salvar Modalidade
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── PAINEL DE PREMISSAS DE ENTRADA EDITÁVEIS (AUDITORIA DA DRE) ───────── */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#00B356]" />
            Parâmetros Financeiros &amp; Tarifas de Entrada (Auditoria das Fórmulas):
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Modo CAPEX:</span>
            <button
              type="button"
              onClick={() => setUseAutoCapex(!useAutoCapex)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                useAutoCapex
                  ? "bg-[#00B356]/20 text-[#00B356] border-[#00B356]/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
            >
              {useAutoCapex ? "✓ Sincronizado ao Passo 4B" : "Ajuste Manual"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs font-mono">
          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Potência (kW):</label>
            <input
              type="number"
              min="3.7"
              max="1000"
              step="1"
              value={effectivePowerKW}
              disabled
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold text-[#00B356] cursor-not-allowed"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Passo 1A ({totalChargersCount} pts)</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Venda (R$/kWh):</label>
            <input
              type="number"
              min="0.50"
              max="10.00"
              step="0.05"
              value={tariffPerKWh}
              onChange={(e) => setTariffPerKWh(Math.max(0.1, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Padrão: R$ 2,10</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Rede (R$/kWh):</label>
            <input
              type="number"
              min="0.10"
              max="5.00"
              step="0.05"
              value={energyCostPerKWh}
              onChange={(e) => setEnergyCostPerKWh(Math.max(0.05, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">{selectedUtility} ND-5.1</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Solar (R$/kWh):</label>
            <input
              type="number"
              min="0.05"
              max="3.00"
              step="0.05"
              value={solarEnergyCostPerKWh}
              onChange={(e) => setSolarEnergyCostPerKWh(Math.max(0.05, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Cordeiro Solar</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">OPEX Fixo (R$):</label>
            <input
              type="number"
              min="0"
              max="20000"
              step="50"
              value={fixedOpexBRL}
              onChange={(e) => setFixedOpexBRL(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Manutenção preventiva</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">OPEX Var. (%):</label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={variableOpexPercent}
              onChange={(e) => setVariableOpexPercent(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">OCPP / Gateway</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Sessão (min):</label>
            <input
              type="number"
              min="10"
              max="600"
              step="5"
              value={avgSessionMinutes}
              onChange={(e) => setAvgSessionMinutes(Math.max(10, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-purple-400 focus:outline-none focus:border-purple-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Duração média</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">CAPEX Total (R$):</label>
            <input
              type="number"
              min="5000"
              max="10000000"
              step="1000"
              disabled={useAutoCapex}
              value={effectiveCapexBRL}
              onChange={(e) => {
                const val = Math.max(1000, Number(e.target.value));
                setManualCapexBRL(val);
              }}
              className={`w-full border rounded-lg px-2 py-1.5 text-xs font-bold font-mono ${
                useAutoCapex
                  ? "bg-slate-950/60 border-slate-800 text-emerald-400 cursor-not-allowed"
                  : "bg-slate-950 border-amber-500 text-amber-300"
              }`}
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">
              {useAutoCapex ? "Importado Passo 4B" : "Manual"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── OS 3 CENÁRIOS OPERACIONAIS (PADRÃO BLEV - FOTOS 01 & 02) ─────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Award className="w-4 h-4 text-[#00B356]" />
            Projeção em 3 Cenários Operacionais (Fotos 01 &amp; 02)
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Fórmula: Payback = CAPEX Total ÷ Lucro Líquido Mensal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((sc, idx) => {
            const isRealistic = sc.name === "Realista";
            const annualProfit = sc.monthlyNetProfit * 12;
            const tir = sc.totalCapexBRL > 0 ? Number(((annualProfit / sc.totalCapexBRL) * 100).toFixed(1)) : 0;

            return (
              <div
                key={idx}
                className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
                  isRealistic
                    ? "bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-[#00B356]/60 shadow-xl shadow-[#00B356]/10 ring-1 ring-[#00B356]/50"
                    : "bg-slate-900/90 border-slate-800"
                }`}
              >
                {isRealistic && (
                  <div className="absolute top-0 right-0 bg-[#00B356] text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-bl-xl tracking-wider">
                    Recomendado / Mais Provável
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-sm font-black uppercase text-white block">{sc.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Captura: {sc.captureRatePercent}% dos {sc.passingEvsPerDay} VEs da via
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                    {sc.operatingHoursPerDay}h/dia úteis
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Sessões Diárias ({sc.operatingHoursPerDay}h ÷ {(sc.averageSessionMinutes / 60).toFixed(2)}h):</span>
                    <span className="text-white font-bold">{sc.dailySessions} recargas</span>
                  </div>

                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Energia Diária ({effectivePowerKW}kW × {sc.operatingHoursPerDay}h × 0.82):</span>
                    <span className="text-slate-200">{sc.dailyKWh.toLocaleString("pt-BR")} kWh/dia</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>Energia Faturada Mensal (× 30 dias):</span>
                    <span className="text-white font-bold">{sc.monthlyKWh.toLocaleString("pt-BR")} kWh</span>
                  </div>

                  <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-800">
                    <span>(+) Faturamento Bruto (× R$ {sc.tariffPerKWh.toFixed(2)}):</span>
                    <span className="text-emerald-400 font-bold">
                      R$ {sc.monthlyGrossRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-rose-300/90 text-[11px]">
                    <span>(-) Custo Energia ({sc.energySourceLabel.split(" ")[0]} • R$ {sc.energyCostPerKWh.toFixed(2)}):</span>
                    <span>- R$ {sc.monthlyEnergyCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-amber-300/90 text-[11px]">
                    <span>(-) OPEX ({variableOpexPercent}% OCPP + R$ {fixedOpexBRL}):</span>
                    <span>- R$ {sc.monthlyOpex.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>

                  {sc.monthlyRealEstateCost > 0 && (
                    <div className="flex justify-between text-purple-300/90 text-[11px]">
                      <span>(-) Ponto ({sc.realEstateLabel}):</span>
                      <span>- R$ {sc.monthlyRealEstateCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-white pt-2 border-t border-slate-800 font-sans">
                    <span className="font-bold text-xs">(=) Lucro Líquido Mensal:</span>
                    <span className="text-[#00B356] font-black text-base font-mono">
                      R$ {sc.monthlyNetProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Lucro Líquido Anual:</span>
                    <span className="text-slate-200 font-bold">
                      R$ {annualProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Card de Payback & Retorno do Cenário */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Payback do Investimento:
                      </span>
                      <span className="text-amber-400 font-black text-sm">
                        {sc.paybackMonths.toFixed(1)} meses
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-300 font-semibold text-right">
                      {sc.paybackYearsAndMonthsLabel}
                    </p>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-900 text-[10px]">
                      <span className="text-slate-500">TIR Estimada:</span>
                      <span className="text-sky-400 font-bold font-mono">{tir}% a.a.</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MEMÓRIA DE CÁLCULO & AUDITORIA DETALHADA (FOTOS 01 & 02) ─────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
          <span className="font-black text-slate-200 uppercase text-xs tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#00B356]" />
            Memória de Cálculo &amp; Rastreabilidade das Fórmulas (Padrão BLEV - Fotos 01 &amp; 02):
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Algoritmo Matemático: <code className="text-emerald-400">calculateScenarioProjections()</code>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px] text-slate-300">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
            <strong className="text-emerald-400 block text-xs font-sans">
              1. Funil de Tráfego VE &amp; Sessões Diárias:
            </strong>
            <p>
              • <strong>Frota VE na Via:</strong> VDM ({vdm.toLocaleString("pt-BR")}) × Densidade VE ({fleetDensity}%) ={" "}
              <strong>{Math.max(1, Math.round(vdm * (fleetDensity / 100)))} VEs/dia</strong> circulando no raio do ponto.
            </p>
            <p>
              • <strong>Sessões/Dia:</strong> Horas Úteis (3h, 6h ou 9h) ÷ Duração Média ({avgSessionMinutes} min ={" "}
              {(avgSessionMinutes / 60).toFixed(2)}h).
            </p>
            <p>
              • <strong>Energia Diária:</strong> Potência ({effectivePowerKW} kW) × Horas Úteis ×{" "}
              <strong className="text-white">0.82</strong> (fator real de absorção da curva CC/CV de baterias de veículos elétricos).
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
            <strong className="text-amber-400 block text-xs font-sans">
              2. DRE Mensal do Eletroposto &amp; Payback:
            </strong>
            <p>
              • <strong>Faturamento Bruto:</strong> Energia Mensal (kWh) × Tarifa de Venda (R$ {tariffPerKWh.toFixed(2)}/kWh).
            </p>
            <p>
              • <strong>Custo de Aquisição de Energia:</strong> R$ {realisticScenario.energyCostPerKWh.toFixed(2)}/kWh{" "}
              ({realisticScenario.energySourceLabel}).
            </p>
            <p>
              • <strong>OPEX Total:</strong> {variableOpexPercent}% (Software OCPP / Meios de Pagamento) + R$ {fixedOpexBRL.toFixed(2)} (Manutenção).
            </p>
            <p>
              • <strong>Payback Realista:</strong> CAPEX (R$ {effectiveCapexBRL.toLocaleString("pt-BR")}) ÷ Lucro Líquido Mensal ={" "}
              <strong className="text-amber-300">{realisticScenario.paybackMonths.toFixed(1)} meses ({realisticScenario.paybackYearsAndMonthsLabel})</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
