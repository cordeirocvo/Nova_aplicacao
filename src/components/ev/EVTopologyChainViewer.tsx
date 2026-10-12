'use client';

import React, { useState } from 'react';
import { useEVTopologyStore } from '@/lib/coenergygo/store/useEVTopologyStore';
import { HOMOLOGATED_CHARGERS } from '@/lib/ev/chargersDatabase';
import { CEMIG_CATEGORIES } from '@/lib/coenergygo/database/utilities';
import {
  Zap,
  Plus,
  Trash2,
  Settings2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Activity,
  Layers,
  Cpu,
  Flame,
  FileSpreadsheet,
  Gauge,
  Sliders,
  Cable,
  X
} from 'lucide-react';

export interface EVTopologyChainViewerProps {
  externalClientBaseLoadKW?: number;
  externalStandardCategory?: string;
  externalStandardBreakerA?: number;
  externalGridSupplyVoltage?: 220 | 380;
  externalChargers?: Array<{
    id: string;
    name: string;
    brand: string;
    model: string;
    powerKW: number;
    phases: 1 | 2 | 3;
    voltageV: number;
    currentInA?: number;
    connector?: string;
    type?: 'AC' | 'DC';
  }>;
  onUpdateStandard?: (categoryId: string, breakerA?: number) => void;
  externalHasSmartChargingDLM?: boolean;
  externalMaxChargerCapKW?: number;
  onUpdateChargerPower?: (id: string, newPowerKW: number) => void;
  cemigStandardBOM?: any[];
  onSaveTopologyParams?: (params: {
    section1DistanceM: number;
    section1MarginPercent: number;
    section1ConductorMaterial?: 'copper' | 'aluminum';
    section1InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
    section2DistanceM: number;
    section2MarginPercent: number;
    section2ConductorMaterial?: 'copper' | 'aluminum';
    section2InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
    section3DistanceM: number;
    section3MarginPercent: number;
    section3ConductorMaterial?: 'copper' | 'aluminum';
    section3InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
    customTransformerKVA?: number;
    customTransformerEfficiencyPercent?: number;
    customTransformerLossesKW?: number;
  }) => void;
  onConcludeTopology?: () => void;
}

export function EVTopologyChainViewer({
  externalClientBaseLoadKW,
  externalStandardCategory,
  externalStandardBreakerA,
  externalGridSupplyVoltage,
  externalChargers,
  onUpdateStandard,
  externalHasSmartChargingDLM,
  externalMaxChargerCapKW,
  onUpdateChargerPower,
  cemigStandardBOM,
  onSaveTopologyParams,
  onConcludeTopology
}: EVTopologyChainViewerProps = {}) {
  const {
    chargers,
    gridSupplyVoltage,
    clientBaseLoadKW,
    currentStandardCategory,
    currentStandardBreakerA,
    section1DistanceM,
    section1MarginPercent,
    section1ConductorMaterial,
    section1InstallationMethod,
    section2DistanceM,
    section2MarginPercent,
    section2ConductorMaterial,
    section2InstallationMethod,
    section3DistanceM,
    section3MarginPercent,
    section3ConductorMaterial,
    section3InstallationMethod,
    auxiliaryConfig,
    customTransformerKVA,
    customTransformerEfficiencyPercent,
    customTransformerLossesKW,
    customCircuits220V,
    customCircuits380V,
    selectedDrawerNodeId,
    topologyOutput,
    syncFromProjectData,
    setCustomTransformerKVA,
    setTransformerEfficiencyAndLosses,
    addCustomCircuit,
    removeCustomCircuit,
    addCharger,
    removeCharger,
    updateCharger,
    setGridSupplyVoltage,
    setClientBaseLoadKW,
    setCurrentStandardCategory,
    updateSectionDistanceAndMargin,
    updateSectionMaterial,
    updateSectionInstallationMethod,
    updateAuxiliaryConfig,
    setSelectedDrawerNodeId
  } = useEVTopologyStore();

  // Sincronizar em tempo real com os passos 1A e 1B se informados externamente
  React.useEffect(() => {
    if (externalClientBaseLoadKW !== undefined || externalStandardCategory || externalChargers) {
      syncFromProjectData({
        clientBaseLoadKW: externalClientBaseLoadKW ?? clientBaseLoadKW,
        currentStandardCategory: externalStandardCategory ?? currentStandardCategory,
        currentStandardBreakerA: externalStandardBreakerA ?? currentStandardBreakerA,
        gridSupplyVoltage: externalGridSupplyVoltage ?? gridSupplyVoltage,
        chargers: externalChargers ? externalChargers.map((c, i) => ({
          id: c.id || `ext-${i}`,
          name: c.name,
          brand: c.brand || 'WEG',
          model: c.model || c.name,
          powerKW: c.powerKW,
          phases: c.phases,
          voltageV: c.voltageV,
          currentInA: c.currentInA || Math.round((c.powerKW * 1000) / (c.phases === 3 ? Math.sqrt(3) * c.voltageV * 0.98 : c.voltageV * 0.98)),
          connector: c.connector || (c.type === 'DC' ? 'CCS2' : 'Tipo 2'),
          type: c.type || (c.powerKW >= 30 ? 'DC' : 'AC'),
          distanceMeters: 15,
          marginPercent: 10
        })) : undefined,
        hasSmartChargingDLM: externalHasSmartChargingDLM,
        maxChargerCapKW: externalMaxChargerCapKW
      });
    }
  }, [
    externalClientBaseLoadKW,
    externalStandardCategory,
    externalStandardBreakerA,
    externalGridSupplyVoltage,
    externalChargers?.length,
    externalHasSmartChargingDLM,
    externalMaxChargerCapKW
  ]);

  const [activeTab, setActiveTab] = useState<'vis' | 'bom' | 'sections'>('vis');
  const [showAddChargerModal, setShowAddChargerModal] = useState(false);
  const [includeEntranceStandardInBOM, setIncludeEntranceStandardInBOM] = useState<boolean>(true);
  const [showDemandBreakdown, setShowDemandBreakdown] = useState<boolean>(false);

  // Seleção individual de cargas associadas nos painéis (conforme Foto 04 e Figura 05)
  const [selectedLoads220V, setSelectedLoads220V] = useState<Record<string, boolean>>({
    clientBase: true,
    trafoFeeder: true,
    auxLighting: true,
    auxOutlet: true,
    auxCctv: true,
    sectionLosses: true
  });

  const [selectedLoads380V, setSelectedLoads380V] = useState<Record<string, boolean>>({
    feederLosses: true,
    chargerInternalLosses: true
  });

  const toggleLoad220V = (id: string) => {
    setSelectedLoads220V(prev => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  const toggleLoad380V = (id: string) => {
    setSelectedLoads380V(prev => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  const [uiMode, setUiMode] = useState<'STUDIO_DARK' | 'CLASSIC'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coenergygo_ui_theme_mode');
      if (saved === 'CLASSIC' || saved === 'STUDIO_DARK') return saved;
    }
    return 'STUDIO_DARK';
  });

  const handleToggleUiMode = (mode: 'STUDIO_DARK' | 'CLASSIC') => {
    setUiMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('coenergygo_ui_theme_mode', mode);
      } catch (e) {}
    }
  };

  const isDark = uiMode === 'STUDIO_DARK';

  const {
    standardAlert,
    panel220V,
    transformer,
    panel380V,
    sections,
    totalBOM
  } = topologyOutput;

  const individualChargerBreakers = panel380V.individualBreakers || panel220V.individualChargerBreakers || [];

  const totalChargersKW = chargers.reduce((sum, c) => sum + c.powerKW, 0);

  // Cálculos discriminados do memorial de demanda e déficit (93,77 kW vs 75,00 kW = 18,8 kW)
  const breakdownClientKW = clientBaseLoadKW;
  const breakdownChargersNominalKW = totalChargersKW;
  const breakdownTrafoLossesKW = transformer.needed
    ? Number(((breakdownChargersNominalKW / 0.98) - breakdownChargersNominalKW).toFixed(2))
    : 0;
  const breakdownCableLossesKW = transformer.needed
    ? Number((((breakdownChargersNominalKW / 0.98) / 0.97) - (breakdownChargersNominalKW / 0.98)).toFixed(2))
    : Number((breakdownChargersNominalKW * 0.02).toFixed(2));
  const breakdownAuxLightingKW = auxiliaryConfig.lightingEnabled ? Number((auxiliaryConfig.lightingPowerW / 1000).toFixed(2)) : 0;
  const breakdownAuxOutletKW = auxiliaryConfig.outletEnabled ? Number((auxiliaryConfig.outletPowerW / 1000).toFixed(2)) : 0;
  const breakdownAuxCctvKW = auxiliaryConfig.cctvEnabled ? Number((auxiliaryConfig.cctvPowerW / 1000).toFixed(2)) : 0;
  const breakdownAuxTotalKW = Number((breakdownAuxLightingKW + breakdownAuxOutletKW + breakdownAuxCctvKW).toFixed(2));
  const breakdownHubTotalKW = Number((breakdownChargersNominalKW + breakdownTrafoLossesKW + breakdownCableLossesKW + breakdownAuxTotalKW).toFixed(2));
  const breakdownTotalRequiredKW = Number((breakdownClientKW + breakdownHubTotalKW).toFixed(2));
  const breakdownStandardLimitKW = standardAlert.currentStandardLimitKW;
  const breakdownDeficitKW = Number((breakdownTotalRequiredKW - breakdownStandardLimitKW).toFixed(2));

  // Potência e corrente das cargas ativas selecionadas no Painel 220V (conforme Foto 01, Foto 04 e Figura 05)
  const panel220VSelectedKW = React.useMemo(() => {
    let sum = 0;
    if (selectedLoads220V.clientBase !== false) sum += breakdownClientKW;
    if (transformer.needed) {
      if (selectedLoads220V.trafoFeeder !== false) sum += breakdownChargersNominalKW;
      if (selectedLoads220V.trafoLosses !== false) sum += breakdownTrafoLossesKW;
    } else {
      chargers.forEach(c => {
        if (selectedLoads220V[`ch_${c.id}`] !== false) sum += c.powerKW;
      });
    }
    if (selectedLoads220V.auxLighting !== false && auxiliaryConfig.lightingEnabled) sum += breakdownAuxLightingKW;
    if (selectedLoads220V.auxOutlet !== false && auxiliaryConfig.outletEnabled) sum += breakdownAuxOutletKW;
    if (selectedLoads220V.auxCctv !== false && auxiliaryConfig.cctvEnabled) sum += breakdownAuxCctvKW;
    if (selectedLoads220V.sectionLosses !== false) sum += breakdownCableLossesKW;
    customCircuits220V.forEach(c => {
      if (selectedLoads220V[`custom_${c.id}`] !== false) sum += c.powerW / 1000;
    });
    return Number(sum.toFixed(2));
  }, [selectedLoads220V, breakdownClientKW, transformer.needed, breakdownChargersNominalKW, breakdownTrafoLossesKW, chargers, auxiliaryConfig, breakdownAuxLightingKW, breakdownAuxOutletKW, breakdownAuxCctvKW, breakdownCableLossesKW, customCircuits220V]);

  const panel220VSelectedCurrentA = Number(((panel220VSelectedKW * 1000) / (Math.sqrt(3) * 220 * 0.98)).toFixed(1));

  // Potência e corrente das cargas ativas selecionadas no Painel 380V (conforme Foto 04 e Figura 05)
  const panel380VSelectedKW = React.useMemo(() => {
    let sum = 0;
    chargers.forEach(c => {
      if (selectedLoads380V[c.id] !== false) sum += c.powerKW;
    });
    if (selectedLoads380V.feederLosses !== false) sum += breakdownCableLossesKW;
    if (selectedLoads380V.chargerInternalLosses !== false) sum += Number((breakdownChargersNominalKW * 0.02).toFixed(2));
    customCircuits380V.forEach(c => {
      if (selectedLoads380V[`custom_${c.id}`] !== false) sum += c.powerW / 1000;
    });
    return Number(sum.toFixed(2));
  }, [selectedLoads380V, chargers, breakdownCableLossesKW, breakdownChargersNominalKW, customCircuits380V]);

  const panel380VSelectedCurrentA = Number(((panel380VSelectedKW * 1000) / (Math.sqrt(3) * 380 * 0.98)).toFixed(1));

  // BOM combinada considerando a seleção de inclusão ou não do padrão de entrada
  const effectiveBOM = React.useMemo(() => {
    let items = [...totalBOM];
    if (includeEntranceStandardInBOM && cemigStandardBOM && cemigStandardBOM.length > 0) {
      const cemigBOMItems = cemigStandardBOM.map((cItem: any, idx: number) => ({
        id: `bom-cemig-${idx}-${cItem.codigo || idx}`,
        category: (cItem.categoria ? `PADRÃO CEMIG (${cItem.categoria})` : 'PADRÃO CEMIG') as any,
        description: cItem.descricao,
        quantity: cItem.quantidade,
        unit: cItem.unidade,
        spec: cItem.nota || `Material homologado CEMIG ND-5.1 (${cItem.codigo || 'Normativo'})`,
        normReference: 'CEMIG ND-5.1 / ND-5.3'
      }));
      items = [...cemigBOMItems, ...items];
    }
    return items;
  }, [totalBOM, includeEntranceStandardInBOM, cemigStandardBOM]);

  return (
    <div className="bg-[#0A192F] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 relative overflow-hidden font-sans">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#E45318]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00B356]/5 rounded-full blur-3xl pointer-events-none" />

      {/* ─── HEADER COM BRANDING CORDEIRO & BARRA DE STATUS ───────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#E45318]/20 border border-[#E45318]/40 text-[#E45318] text-xs font-bold uppercase tracking-wider rounded-full">
              Topologia Interativa NBR 5410 & NBR 17019
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00B356] animate-pulse" />
              Recálculo Reativo Bidirecional Ativo
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-2 flex items-center gap-2">
            Diagrama Interativo do Fluxo de Energia: Rede Concessionária → Veículo Elétrico
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Clique sobre qualquer bloco ou trecho da cadeia para visualizar ou editar parâmetros, abrir gavetas de dimensionamento, adicionar circuitos terminais e simular em tempo real a integridade da esteira.
          </p>
        </div>

        {/* Botões de Ação Rápida e Abas */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor do Modo de Exibição (Reversível) */}
          <div className="bg-slate-900/90 p-1 rounded-xl flex gap-1 border border-slate-700/80 shadow-md">
            <button
              type="button"
              onClick={() => handleToggleUiMode('STUDIO_DARK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Interface escura ergonômica com contraste WCAG AAA para menor fadiga visual"
            >
              <span>🌙</span> Studio Ergonômico
            </button>
            <button
              type="button"
              onClick={() => handleToggleUiMode('CLASSIC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isDark
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Voltar ao layout clássico original a qualquer momento"
            >
              <span>☀️</span> Modo Clássico
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('vis')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'vis'
                ? 'bg-[#E45318] text-white shadow-lg shadow-[#E45318]/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Topologia da Cadeia
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sections'
                ? 'bg-[#E45318] text-white shadow-lg shadow-[#E45318]/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            Trechos & Eletrodutos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bom')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bom'
                ? 'bg-[#E45318] text-white shadow-lg shadow-[#E45318]/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Lista de Materiais (BOM)
          </button>
        </div>

        {/* Controles Globais Rápidos */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tensão Concessionária:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setGridSupplyVoltage(220)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  gridSupplyVoltage === 220
                    ? 'bg-[#E45318] text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                220V (F-F CEMIG)
              </button>
              <button
                type="button"
                onClick={() => setGridSupplyVoltage(380)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  gridSupplyVoltage === 380
                    ? 'bg-[#E45318] text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                380V (F-F Direto)
              </button>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
            <span className="text-slate-400">Carga Base Cliente:</span>
            <input
              type="number"
              min="0"
              max="200"
              step="0.5"
              value={clientBaseLoadKW}
              onChange={(e) => setClientBaseLoadKW(Number(e.target.value) || 0)}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-center text-white font-bold"
            />
            <span className="text-slate-400">kW</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddChargerModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E45318] to-[#c24210] hover:from-[#f35c20] hover:to-[#E45318] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#E45318]/20 transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Carregador
          </button>
        </div>
      </div>

      {/* ─── BANNER DINÂMICO DE ALERTA DE CAPACIDADE DO PADRÃO ────────────── */}
      <div
        className={`mt-4 p-4 rounded-xl border flex items-start gap-4 transition-all ${
          standardAlert.isOverloaded
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
        }`}
      >
        <div
          className={`p-2 rounded-lg ${
            standardAlert.isOverloaded ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}
        >
          {standardAlert.isOverloaded ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <CheckCircle2 className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm tracking-wide">
                {standardAlert.isOverloaded 
                  ? 'DIAGNÓSTICO: CAPACIDADE DO PADRÃO ULTRAPASSADA' 
                  : (externalHasSmartChargingDLM && externalMaxChargerCapKW)
                  ? 'PROTEGIDO POR GESTÃO DINÂMICA (DLM CONFORME IEC 61851-1)'
                  : 'PADRÃO DE ENTRADA HOMOLOGADO E CONFORME'}
              </h4>
              {externalHasSmartChargingDLM && externalMaxChargerCapKW && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00B356] border border-emerald-500/40">
                  Smart Charging Ativo ({externalMaxChargerCapKW} kW)
                </span>
              )}
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-900/60 border border-current">
              Padrão Atual: {standardAlert.currentStandardCategory} ({standardAlert.currentStandardLimitKW} kW / {standardAlert.currentStandardBreakerA}A)
            </span>
          </div>
          <p className="text-xs mt-1 text-slate-300 leading-relaxed">
            {standardAlert.message}
          </p>

          {/* Destaque Didático para Leigos: Quanto de potência precisa reduzir ou folga disponível */}
          <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              {standardAlert.isOverloaded ? (
                <div className="text-rose-300 flex items-center gap-2">
                  <span className="font-bold">⚠️ Redução Necessária no Carregador:</span>
                  <span className="font-mono font-black text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                    -{(standardAlert.totalRequiredLoadKW - standardAlert.currentStandardLimitKW).toFixed(1)} kW
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (Diminua a potência no card do carregador ou ative o DLM para o padrão não desarmar)
                  </span>
                </div>
              ) : (
                <div className="text-emerald-300 flex items-center gap-2">
                  <span className="font-bold">✓ Operação Segura:</span>
                  <span className="font-mono font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    +{(standardAlert.currentStandardLimitKW - standardAlert.totalRequiredLoadKW).toFixed(1)} kW de Sobra
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (O disjuntor de {standardAlert.currentStandardBreakerA}A suporta a carga com folga)
                  </span>
                </div>
              )}
            </div>

            {standardAlert.isOverloaded && chargers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const excessKW = standardAlert.totalRequiredLoadKW - standardAlert.currentStandardLimitKW;
                  const perChargerCut = excessKW / chargers.length;
                  chargers.forEach((c) => {
                    const safeP = Math.max(3.7, Number((c.powerKW - perChargerCut - 0.5).toFixed(1)));
                    updateCharger(c.id, { powerKW: safeP });
                    if (onUpdateChargerPower) {
                      onUpdateChargerPower(c.id, safeP);
                    }
                  });
                }}
                className="px-2.5 py-1 bg-[#E45318] hover:bg-[#c24310] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Ajusta automaticamente a potência dos carregadores para caber no limite do disjuntor"
              >
                ⚡ Adequar ao Padrão Atual
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-800/80 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Cliente Base: <b>{breakdownClientKW} kW</b></span>
              <span>+ Hub VE & Aux: <b>{breakdownHubTotalKW} kW</b></span>
              <span>= Demanda Total: <b className={standardAlert.isOverloaded ? 'text-rose-400' : 'text-emerald-400'}>{breakdownTotalRequiredKW} kW</b></span>
              {standardAlert.isOverloaded && (
                <span className="text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-600/40">
                  Padrão Sugerido: <b>{standardAlert.recommendedCategory} ({standardAlert.recommendedBreakerA}A)</b>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDemandBreakdown(prev => !prev)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-bold transition-all border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showDemandBreakdown ? '▲ Ocultar Memorial' : '🔍 Detalhar Demanda (93,77 kW & Déficit 18,8 kW)'}</span>
            </button>
          </div>

          {/* ─── PAINEL EXPANSÍVEL: MEMORIAL DISCRIMINADO COMPLETO DA DEMANDA E DÉFICIT ─── */}
          {showDemandBreakdown && (
            <div className="mt-3 p-4 bg-slate-950/90 rounded-xl border border-amber-500/40 space-y-3 font-mono text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#E45318] block tracking-wider">
                    Memorial de Cálculo Eletrotécnico Discriminado (NBR 5410 & CEMIG ND-5.1)
                  </span>
                  <h5 className="font-bold text-white text-sm">
                    Composição Analítica da Demanda Total ({breakdownTotalRequiredKW} kW) e Déficit ({breakdownDeficitKW > 0 ? breakdownDeficitKW : 0} kW)
                  </h5>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Padrão Avaliado: {standardAlert.currentStandardCategory} ({breakdownStandardLimitKW} kW / {standardAlert.currentStandardBreakerA}A)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Item / Parcela de Carga</th>
                      <th className="px-3 py-2 text-center">Tensão / Fases</th>
                      <th className="px-3 py-2 text-center">Fórmula / Base de Cálculo</th>
                      <th className="px-3 py-2 text-right">Potência Ativa</th>
                      <th className="px-3 py-2 text-right">% da Demanda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    <tr className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        1. Carga Base do Imóvel (Medição Existente)
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400">220V (3F)</td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[11px]">Leitura SmartMeter / Vistoria (Passo 1B)</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-400">{breakdownClientKW.toFixed(2)} kW</td>
                      <td className="px-3 py-2 text-right text-slate-400">{((breakdownClientKW / breakdownTotalRequiredKW) * 100).toFixed(1)}%</td>
                    </tr>

                    <tr className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E45318] inline-block" />
                        2. Carregadores Veiculares (Nominal)
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400">{transformer.needed ? '380V (3F)' : '220V'}</td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[11px]">Soma das potências de placa ({chargers.length} estações VE)</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-400">{breakdownChargersNominalKW.toFixed(2)} kW</td>
                      <td className="px-3 py-2 text-right text-slate-400">{((breakdownChargersNominalKW / breakdownTotalRequiredKW) * 100).toFixed(1)}%</td>
                    </tr>

                    {transformer.needed && (
                      <tr className="hover:bg-slate-900/50">
                        <td className="px-3 py-2 font-medium text-slate-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          3. Perdas no Transformador Elevador Dyn1 (220/380V)
                        </td>
                        <td className="px-3 py-2 text-center text-slate-400">220V ➔ 380V</td>
                        <td className="px-3 py-2 text-center text-slate-400 text-[11px]">Perdas no ferro e cobre (rendimento ~98%)</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-300">+{breakdownTrafoLossesKW.toFixed(2)} kW</td>
                        <td className="px-3 py-2 text-right text-slate-400">{((breakdownTrafoLossesKW / breakdownTotalRequiredKW) * 100).toFixed(1)}%</td>
                      </tr>
                    )}

                    <tr className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 font-medium text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                        4. Perdas Joule nos Cabos Alimentadores
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400">Trechos 1 a 4</td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[11px]">Efeito Joule R · I² nos condutores dimensionados</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-300">+{breakdownCableLossesKW.toFixed(2)} kW</td>
                      <td className="px-3 py-2 text-right text-slate-400">{((breakdownCableLossesKW / breakdownTotalRequiredKW) * 100).toFixed(1)}%</td>
                    </tr>

                    <tr className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 font-medium text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        5. Cargas Auxiliares do Hub (Iluminação + Tomada + CFTV)
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400">127V / 220V</td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[11px]">
                        Luz ({breakdownAuxLightingKW}kW) + Tomada ({breakdownAuxOutletKW}kW) + CFTV ({breakdownAuxCctvKW}kW)
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-400">+{breakdownAuxTotalKW.toFixed(2)} kW</td>
                      <td className="px-3 py-2 text-right text-slate-400">{((breakdownAuxTotalKW / breakdownTotalRequiredKW) * 100).toFixed(1)}%</td>
                    </tr>

                    <tr className="bg-slate-900/80 font-bold border-t-2 border-slate-700 text-white">
                      <td className="px-3 py-2.5">SUBTOTAL DO HUB VE (Carregadores + Perdas + Auxiliares)</td>
                      <td className="px-3 py-2.5 text-center text-amber-400">Hub Dedicado</td>
                      <td className="px-3 py-2.5 text-center text-slate-400 text-[11px]">
                        {breakdownChargersNominalKW.toFixed(1)}kW VE
                        {transformer.needed ? ` + ${breakdownTrafoLossesKW.toFixed(2)}kW trafo` : ''}
                        {` + ${breakdownCableLossesKW.toFixed(2)}kW cabos`}
                        {breakdownAuxTotalKW > 0 ? ` + ${breakdownAuxTotalKW.toFixed(2)}kW aux` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-right text-amber-400 text-sm">{breakdownHubTotalKW.toFixed(2)} kW</td>
                      <td className="px-3 py-2.5 text-right text-slate-300">{((breakdownHubTotalKW / breakdownTotalRequiredKW) * 100).toFixed(1)}%</td>
                    </tr>

                    <tr className="bg-slate-900 font-black border-t-2 border-slate-600 text-white">
                      <td className="px-3 py-2.5 text-sm">DEMANDA TOTAL SIMULTÂNEA REQUERIDA (1 + Subtotal Hub)</td>
                      <td className="px-3 py-2.5 text-center text-[#E45318]">Geral</td>
                      <td className="px-3 py-2.5 text-center text-slate-400 text-[11px]">Cliente ({breakdownClientKW.toFixed(2)} kW) + Hub ({breakdownHubTotalKW.toFixed(2)} kW)</td>
                      <td className="px-3 py-2.5 text-right text-[#E45318] text-base">{breakdownTotalRequiredKW.toFixed(2)} kW</td>
                      <td className="px-3 py-2.5 text-right text-white">100.0%</td>
                    </tr>

                    <tr className="bg-slate-950 text-slate-300 border-t border-slate-800">
                      <td className="px-3 py-2">CAPACIDADE DO PADRÃO EXISTENTE ({standardAlert.currentStandardCategory})</td>
                      <td className="px-3 py-2 text-center text-slate-400">220V (3F)</td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[11px]">Limite Normativo CEMIG ND-5.1 ({standardAlert.currentStandardBreakerA}A)</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-400">{breakdownStandardLimitKW.toFixed(2)} kW</td>
                      <td className="px-3 py-2 text-right text-slate-500">-</td>
                    </tr>

                    <tr className={`font-black border-t-2 ${breakdownDeficitKW > 0 ? 'bg-rose-950/60 text-rose-300 border-rose-700' : 'bg-emerald-950/60 text-emerald-300 border-emerald-700'}`}>
                      <td className="px-3 py-2.5 text-sm flex items-center gap-1.5">
                        {breakdownDeficitKW > 0 ? '⚠️ DÉFICIT DE POTÊNCIA / REDUÇÃO NECESSÁRIA' : '✓ SOBRA / FOLGA DE CAPACIDADE'}
                      </td>
                      <td className="px-3 py-2.5 text-center">-</td>
                      <td className="px-3 py-2.5 text-center text-[11px]">
                        {breakdownTotalRequiredKW.toFixed(2)} kW - {breakdownStandardLimitKW.toFixed(2)} kW
                      </td>
                      <td className="px-3 py-2.5 text-right text-base font-black">
                        {breakdownDeficitKW > 0 ? `-${breakdownDeficitKW.toFixed(2)} kW` : `+${Math.abs(breakdownDeficitKW).toFixed(2)} kW`}
                      </td>
                      <td className="px-3 py-2.5 text-right">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Nota Técnica Explicativa dos 72,4 kW vs 75 kW */}
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="text-amber-400 font-bold block">
                  📌 Nota Técnica da Engenharia (Origem dos 75 kW vs 72,4 kW da Foto 01):
                </span>
                <p>
                  • <strong>75 kW:</strong> É o teto normativo oficial da Tabela de Categorias da concessionária (CEMIG ND-5.1 para Categoria C6 com disjuntor de 200A).
                </p>
                <p>
                  • <strong>72,4 kW:</strong> É a potência ativa calculada rigorosamente pela fórmula física de corrente alternada trifásica em 220V considerando o disjuntor de 200A a fator de potência regulatório 0,95:
                  <code className="text-slate-200 ml-1 bg-slate-950 px-1 py-0.5 rounded">P = (√3 × 220V × 200A × 0,95) / 1000 = 72,41 kW</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── TABS DE NAVEGAÇÃO ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('vis')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'vis'
              ? 'bg-slate-800 text-[#E45318] border border-[#E45318]/30 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Topologia Visual & Cadeia em Série ({chargers.length} Carregadores)
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'sections'
              ? 'bg-slate-800 text-[#E45318] border border-[#E45318]/30 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cable className="w-4 h-4" />
          Trechos & Dutos (Ocupação ≤ 40% & Queda ΔV)
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'bom'
              ? 'bg-slate-800 text-[#E45318] border border-[#E45318]/30 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Lista Consolidada de Materiais (BOM)
        </button>
      </div>

      {/* ─── CONTEÚDO PRINCIPAL: ESTEIRA VISUAL DA CADEIA ─────────────────── */}
      {activeTab === 'vis' && (
        <div className="mt-6">
          {/* Scroll horizontal para acomodar a cadeia topológica */}
          <div className="overflow-x-auto pb-6">
            <div className="flex items-stretch gap-3 min-w-[1100px] justify-start py-2">

              {/* ─── BLOCO 1: PADRÃO DA CONCESSIONÁRIA ─── */}
              <div
                onClick={() => setSelectedDrawerNodeId('padrao')}
                className="w-56 flex-shrink-0 bg-slate-900/90 border border-slate-700/80 hover:border-[#E45318] rounded-xl p-4 shadow-xl hover:shadow-[#E45318]/10 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-mono uppercase font-bold text-[#E45318]">Passo 1</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">Entrada BT</span>
                  </div>
                  {/* Ícone / Ilustração */}
                  <div className="w-full h-24 bg-gradient-to-b from-slate-800 to-slate-900/90 rounded-lg border border-slate-700/60 flex flex-col items-center justify-center p-2 mb-3 group-hover:border-[#E45318]/50 transition-all">
                    <div className="w-12 h-14 bg-slate-800 border-2 border-slate-600 rounded flex flex-col items-center justify-around p-1 shadow-inner">
                      <div className="w-7 h-4 bg-emerald-950 border border-emerald-600/60 rounded flex items-center justify-center text-[8px] font-mono text-emerald-400">
                        {standardAlert.currentStandardLimitKW}kW
                      </div>
                      <div className="w-6 h-3 bg-slate-950 border border-slate-700 rounded flex items-center justify-center text-[7px] text-amber-400 font-bold">
                        {standardAlert.currentStandardBreakerA}A
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">Caixa Policarbonato / CM</span>
                  </div>

                  <h3 className="font-bold text-sm text-white group-hover:text-[#E45318] transition-colors">
                    Padrão CEMIG ({standardAlert.currentStandardCategory})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Disjuntor {standardAlert.currentStandardBreakerA}A | Limite {standardAlert.currentStandardLimitKW} kW
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Margem Disp.</span>
                  <span className={`font-mono font-bold ${standardAlert.isOverloaded ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(standardAlert.currentStandardLimitKW - standardAlert.totalRequiredLoadKW).toFixed(1)} kW
                  </span>
                </div>
              </div>

              {/* ─── CONECTOR TRECHO 1 ─── */}
              <div
                onClick={() => setSelectedDrawerNodeId('trecho_1')}
                className="w-32 flex-shrink-0 flex flex-col items-center justify-center cursor-pointer group hover:opacity-100 transition-all px-1"
                title="Clique para ver memorial e editar Trecho 1"
              >
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-[#E45318] text-center mb-1">
                  Trecho 1 ({sections.section1_standardToPanel220.distanceTotalM}m)
                </span>
                <div className="w-full flex items-center">
                  <div className="h-1 flex-1 bg-gradient-to-r from-slate-700 to-amber-500 group-hover:h-1.5 transition-all rounded" />
                  <ArrowRight className="w-4 h-4 text-amber-500 -ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 text-center whitespace-nowrap">
                    {sections.section1_standardToPanel220.conductorsPerPhase > 1
                      ? `${sections.section1_standardToPanel220.conductorsPerPhase}x (${sections.section1_standardToPanel220.cableGaugePhaseMM2}mm²)`
                      : `${sections.section1_standardToPanel220.cableGaugePhaseMM2}mm²`}{' '}
                    {sections.section1_standardToPanel220.conductorMaterial === 'aluminum' ? 'Al' : 'Cu'}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-700/60 whitespace-nowrap" title="Eletroduto dimensionado">
                    Duto {sections.section1_standardToPanel220.conduitInches} ({sections.section1_standardToPanel220.conduitFillingRatePercent}%)
                  </span>
                </div>
              </div>

              {/* ─── BLOCO 2: PAINEL GERAL (220V ou 380V) ─── */}
              <div
                onClick={() => setSelectedDrawerNodeId('panel220v')}
                className="w-64 flex-shrink-0 bg-slate-900/90 border border-slate-700/80 hover:border-[#E45318] rounded-xl p-4 shadow-xl hover:shadow-[#E45318]/10 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-mono uppercase font-bold text-[#E45318]">Passo 2</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-amber-400 font-bold">
                      {gridSupplyVoltage === 380 ? 'QGBT 380V' : 'QGBT 220V'}
                    </span>
                  </div>

                  <div className="w-full h-24 bg-gradient-to-b from-slate-800 to-slate-900/90 rounded-lg border border-slate-700/60 flex flex-col items-center justify-center p-2 mb-3 group-hover:border-[#E45318]/50 transition-all">
                    <div className="w-36 bg-slate-800 border-2 border-slate-600 rounded p-1.5 flex flex-col gap-1 shadow-inner">
                      {/* Barramento Superior Representativo */}
                      <div className="h-1.5 bg-amber-600 rounded-sm w-full" title={`Barramento de Cobre ${gridSupplyVoltage}V`} />
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-300">
                        <span className="bg-slate-950 px-1 rounded text-amber-400">Geral {panel220V.mainBreakerA}A</span>
                        <span className="text-emerald-400 font-bold">
                          {gridSupplyVoltage === 380 ? '4x DPS 385V' : '3x DPS 275V'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[7px] text-slate-400">
                        <span>Aux: {auxiliaryConfig.cctvEnabled || auxiliaryConfig.outletEnabled || auxiliaryConfig.lightingEnabled ? 'ON' : 'OFF'}</span>
                        <span>{gridSupplyVoltage === 380 ? `${chargers.length}x Disj. VE` : 'Alim. Trafo'}</span>
                        <span className="text-emerald-400 font-bold">DR 30mA</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">
                      {gridSupplyVoltage === 380 ? 'Alimentadores Diretos 380V' : 'Medição Exclusiva do Hub'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white group-hover:text-[#E45318] transition-colors">
                    {gridSupplyVoltage === 380 ? 'Painel Geral de Proteção 380V' : 'Painel Proteção 220V'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Disjuntor Geral {panel220V.mainBreakerA}A (Curva {panel220V.mainBreakerCurve}) + Barramento {panel220V.busbarRatingA}A
                    {gridSupplyVoltage === 380 && ` • Protege ${chargers.length} Carregadores + Cargas Auxiliares`}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" />
                    Cargas Selecionadas
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {panel220VSelectedKW.toFixed(1)} kW ({panel220VSelectedCurrentA}A)
                  </span>
                </div>
              </div>

              {/* ─── CASO A: TRANSFORMADOR ELEVADOR & PAINEL 380V ATIVOS ─── */}
              {transformer.needed ? (
                <>
                  {/* CONECTOR TRECHO 2 */}
                  <div
                    onClick={() => setSelectedDrawerNodeId('trecho_2')}
                    className="w-32 flex-shrink-0 flex flex-col items-center justify-center cursor-pointer group hover:opacity-100 transition-all px-1"
                    title="Clique para ver memorial e editar Trecho 2"
                  >
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-[#E45318] text-center mb-1">
                      Trecho 2 ({sections.section2_panel220ToTrafo?.distanceTotalM}m)
                    </span>
                    <div className="w-full flex items-center">
                      <div className="h-1 flex-1 bg-gradient-to-r from-slate-700 to-amber-500 group-hover:h-1.5 transition-all rounded" />
                      <ArrowRight className="w-4 h-4 text-amber-500 -ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="mt-1 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 text-center whitespace-nowrap">
                        {sections.section2_panel220ToTrafo && sections.section2_panel220ToTrafo.conductorsPerPhase > 1
                          ? `${sections.section2_panel220ToTrafo.conductorsPerPhase}x (${sections.section2_panel220ToTrafo.cableGaugePhaseMM2}mm²)`
                          : `${sections.section2_panel220ToTrafo?.cableGaugePhaseMM2}mm²`}{' '}
                        {sections.section2_panel220ToTrafo?.conductorMaterial === 'aluminum' ? 'Al' : 'Cu'}
                      </span>
                      {sections.section2_panel220ToTrafo && (
                        <span className="text-[8px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-700/60 whitespace-nowrap">
                          Duto {sections.section2_panel220ToTrafo.conduitInches} ({sections.section2_panel220ToTrafo.conduitFillingRatePercent}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BLOCO 3: TRANSFORMADOR ELEVADOR */}
                  <div
                    onClick={() => setSelectedDrawerNodeId('transformer')}
                    className="w-60 flex-shrink-0 bg-slate-900/90 border border-slate-700/80 hover:border-[#E45318] rounded-xl p-4 shadow-xl hover:shadow-[#E45318]/10 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-mono uppercase font-bold text-[#E45318]">Passo 3</span>
                        <span className="bg-amber-950/50 text-amber-400 border border-amber-700/40 px-2 py-0.5 rounded text-[10px]">
                          220V ➔ 380V
                        </span>
                      </div>

                      <div className="w-full h-24 bg-gradient-to-b from-slate-800 to-slate-900/90 rounded-lg border border-slate-700/60 flex flex-col items-center justify-center p-2 mb-3 group-hover:border-[#E45318]/50 transition-all">
                        <div className="w-16 h-14 bg-amber-950/30 border-2 border-amber-600/70 rounded flex flex-col items-center justify-center shadow-inner relative">
                          <Cpu className="w-7 h-7 text-amber-400" />
                          <span className="text-[8px] font-mono font-bold text-amber-300 mt-0.5">Dyn1 Seco</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 font-mono">Curva D Inrush Protegida</span>
                      </div>

                      <h3 className="font-bold text-sm text-white group-hover:text-[#E45318] transition-colors">
                        Trafo Elevador {transformer.nominalKVA} kVA
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">
                        Primário 220V ({transformer.primaryCurrentA}A) ➔ Secundário 380V ({transformer.secondaryCurrentA}A)
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Perdas Estimadas</span>
                      <span className="font-mono font-bold text-amber-400">~{transformer.lossesKW} kW</span>
                    </div>
                  </div>

                  {/* CONECTOR TRECHO 3 */}
                  <div
                    onClick={() => setSelectedDrawerNodeId('trecho_3')}
                    className="w-32 flex-shrink-0 flex flex-col items-center justify-center cursor-pointer group hover:opacity-100 transition-all px-1"
                    title="Clique para ver memorial e editar Trecho 3"
                  >
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-[#E45318] text-center mb-1">
                      Trecho 3 ({sections.section3_trafoToPanel380?.distanceTotalM}m)
                    </span>
                    <div className="w-full flex items-center">
                      <div className="h-1 flex-1 bg-gradient-to-r from-slate-700 to-amber-500 group-hover:h-1.5 transition-all rounded" />
                      <ArrowRight className="w-4 h-4 text-amber-500 -ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="mt-1 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 text-center whitespace-nowrap">
                        {sections.section3_trafoToPanel380 && sections.section3_trafoToPanel380.conductorsPerPhase > 1
                          ? `${sections.section3_trafoToPanel380.conductorsPerPhase}x (${sections.section3_trafoToPanel380.cableGaugePhaseMM2}mm²)`
                          : `${sections.section3_trafoToPanel380?.cableGaugePhaseMM2}mm²`}{' '}
                        {sections.section3_trafoToPanel380?.conductorMaterial === 'aluminum' ? 'Al' : 'Cu'}
                      </span>
                      {sections.section3_trafoToPanel380 && (
                        <span className="text-[8px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-700/60 whitespace-nowrap">
                          Duto {sections.section3_trafoToPanel380.conduitInches} ({sections.section3_trafoToPanel380.conduitFillingRatePercent}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BLOCO 4: PAINEL 380V */}
                  <div
                    onClick={() => setSelectedDrawerNodeId('panel380v')}
                    className="w-64 flex-shrink-0 bg-slate-900/90 border border-slate-700/80 hover:border-[#E45318] rounded-xl p-4 shadow-xl hover:shadow-[#E45318]/10 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-mono uppercase font-bold text-[#E45318]">Passo 4</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">QDC-VE 380V</span>
                      </div>

                      <div className="w-full h-24 bg-gradient-to-b from-slate-800 to-slate-900/90 rounded-lg border border-slate-700/60 flex flex-col items-center justify-center p-2 mb-3 group-hover:border-[#E45318]/50 transition-all">
                        <div className="w-32 bg-slate-800 border-2 border-slate-600 rounded p-1.5 flex flex-col gap-1 shadow-inner">
                          {/* Se houver barramento (mais de 1 carregador) exibe a barra, senão indica unificado */}
                          {panel380V.requiresBusbar ? (
                            <div className="h-1.5 bg-amber-600 rounded-sm w-full" title="Barramento de Cobre 380V" />
                          ) : (
                            <div className="text-[7px] text-center text-emerald-400 font-mono">1 Carregador: Sem Barramento</div>
                          )}
                          <div className="flex items-center justify-between text-[8px] font-mono text-slate-300">
                            <span className="bg-slate-950 px-1 rounded text-amber-400">
                              {panel380V.requiresBusbar ? `Geral ${panel380V.mainBreakerA}A` : `Disjuntor Único ${panel380V.mainBreakerA}A`}
                            </span>
                            <span className="text-emerald-400 font-bold">DR Tipo B 30mA</span>
                          </div>
                          <div className="flex items-center justify-between text-[7px] text-slate-400">
                            <span>4x DPS 385V</span>
                            <span>{panel380V.requiresBusbar ? `${chargers.length} Disjuntores` : 'Direto'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 font-mono">
                          {panel380V.requiresBusbar ? `Barramento Cobre ${panel380V.busbarRatingA}A` : 'Dispensado Barramento'}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white group-hover:text-[#E45318] transition-colors">
                        Painel Proteção 380V
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">
                        {panel380V.requiresBusbar
                          ? `Geral ${panel380V.mainBreakerA}A + Barramento ${panel380V.busbarRatingA}A + ${chargers.length} Disj. Dedicados`
                          : `1 Único Disjuntor ${panel380V.mainBreakerA}A (Zero Barramento - Regra de Ouro)`}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-emerald-400" />
                        Cargas Selecionadas
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {panel380VSelectedKW.toFixed(1)} kW ({panel380VSelectedCurrentA}A)
                      </span>
                    </div>
                  </div>
                </>
              ) : gridSupplyVoltage === 380 ? null : (
                /* CASO B: BYPASS DO TRANSFORMADOR QUANDO TODOS OS CARREGADORES SÃO 220V */
                <div className="flex items-center px-4 py-2 bg-emerald-950/20 border border-emerald-500/30 rounded-xl my-auto text-xs text-emerald-300 gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">Bypass Automático Ativo</div>
                    <span>
                      Todos os carregadores operam em 220V. Sem necessidade de transformador elevador!
                    </span>
                  </div>
                </div>
              )}

              {/* ─── CONECTOR TRECHO 4 (ALIMENTADORES DOS CARREGADORES) ─── */}
              <div
                onClick={() => setSelectedDrawerNodeId('trecho_4_all')}
                className="flex flex-col items-center justify-center px-2 cursor-pointer group hover:opacity-100 transition-all"
                title="Clique para ver o memorial e cálculos de todos os alimentadores dos carregadores"
              >
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-[#E45318] text-center mb-1">
                  Trecho 4 ({sections.section4_chargersFeeders.length} Feeders)
                </span>
                <div className="flex items-center">
                  <div className="h-1 w-10 bg-gradient-to-r from-slate-700 to-[#E45318] group-hover:h-1.5 transition-all rounded" />
                  <ArrowRight className="w-4 h-4 text-[#E45318] -ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-[9px] font-mono font-bold text-amber-400 mt-1 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 text-center">
                  {sections.section4_chargersFeeders.map((f: any) => `${f.cableGaugePhaseMM2}mm²`).join(' | ')}
                </span>
              </div>

              {/* ─── BLOCO 5: LISTA DINÂMICA DE CARREGADORES NA PONTA ─── */}
              <div className="flex items-stretch gap-3">
                {chargers.map((charger, idx) => (
                  <div
                    key={charger.id}
                    onClick={() => setSelectedDrawerNodeId(charger.id)}
                    className="w-56 flex-shrink-0 bg-slate-900/90 border border-slate-700/80 hover:border-[#E45318] rounded-xl p-4 shadow-xl hover:shadow-[#E45318]/20 transition-all cursor-pointer flex flex-col justify-between group relative"
                  >
                    {/* Botão de Excluir Carregador Reativo */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCharger(charger.id);
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-700 transition-all cursor-pointer z-20"
                      title="Remover este carregador"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <span className="font-mono uppercase font-bold text-[#E45318]">EV #{idx + 1}</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{charger.brand}</span>
                      </div>

                      {/* Mockup / Ícone do Carregador com Seletor Interativo de Potência */}
                      <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900/90 rounded-lg border border-slate-700/60 flex flex-col items-center justify-center p-2 mb-3 group-hover:border-[#E45318]/50 transition-all">
                        <div className="w-14 h-12 bg-slate-950 border-2 border-[#E45318]/60 rounded-lg flex flex-col items-center justify-around p-1 shadow-md mb-2">
                          <Zap className="w-4 h-4 text-[#E45318]" />
                          <span className="text-[9px] font-bold text-white font-mono">{charger.powerKW} kW</span>
                        </div>

                        {/* Seletor de Potência: Input direto ou ajuste de 1 em 1 kW */}
                        <div className="flex flex-col items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-700/80 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                const newP = Math.max(1, Number((charger.powerKW - 1).toFixed(1)));
                                updateCharger(charger.id, { powerKW: newP });
                                if (onUpdateChargerPower) {
                                  onUpdateChargerPower(charger.id, newP);
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded text-xs font-bold transition-all cursor-pointer"
                              title="Diminuir 1 kW"
                            >
                              -
                            </button>
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                min="1"
                                max="360"
                                step="1"
                                value={charger.powerKW}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val > 0) {
                                    updateCharger(charger.id, { powerKW: val });
                                    if (onUpdateChargerPower) {
                                      onUpdateChargerPower(charger.id, val);
                                    }
                                  }
                                }}
                                className="w-14 bg-slate-900 border border-slate-700 focus:border-[#E45318] focus:outline-none rounded px-1 py-0.5 text-center text-xs font-mono font-bold text-amber-400"
                                title="Digite a potência em kW"
                              />
                              <span className="text-[10px] font-mono text-slate-400 font-bold">kW</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newP = Math.min(360, Number((charger.powerKW + 1).toFixed(1)));
                                updateCharger(charger.id, { powerKW: newP });
                                if (onUpdateChargerPower) {
                                  onUpdateChargerPower(charger.id, newP);
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded text-xs font-bold transition-all cursor-pointer"
                              title="Aumentar 1 kW"
                            >
                              +
                            </button>
                          </div>

                          {/* Badge Indicativo de Carga Reduzida / Ajustada por DLM */}
                          {externalHasSmartChargingDLM && externalMaxChargerCapKW && externalMaxChargerCapKW > 0 && (
                            <div className="w-full bg-emerald-950/80 border border-emerald-500/50 rounded px-1.5 py-0.5 text-[8px] font-mono text-emerald-300 text-center flex items-center justify-center gap-1 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              <span>DLM Ativo: Ajustado p/ Padrão ({externalMaxChargerCapKW} kW)</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 font-mono">{charger.voltageV}V | {charger.connector}</span>
                      </div>

                      <h4 className="font-bold text-sm text-white group-hover:text-[#E45318] transition-colors line-clamp-1">
                        {charger.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Alimentador L={charger.distanceMeters}m (+{charger.marginPercent}%)
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 space-y-1 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Disjuntor Sugerido</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {individualChargerBreakers.find(b => b.chargerId === charger.id)?.breakerA || 40}A Curva C + DR
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cabo Sugerido</span>
                        <span className="font-mono font-bold text-amber-400">
                          {sections.section4_chargersFeeders[idx]?.cableGaugePhaseMM2 || 6}mm² (ΔV {sections.section4_chargersFeeders[idx]?.voltageDropPercent || 0.5}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Card "+ Adicionar Novo Carregador" na Esteira */}
                <button
                  type="button"
                  onClick={() => setShowAddChargerModal(true)}
                  className="w-40 flex-shrink-0 border-2 border-dashed border-slate-700 hover:border-[#E45318] rounded-xl flex flex-col items-center justify-center p-4 text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-[#E45318] text-white flex items-center justify-center mb-2 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Adicionar Outro Carregador</span>
                  <span className="text-[10px] text-slate-500 mt-1 text-center">Recalcula toda a cadeia</span>
                </button>
              </div>

            </div>
          </div>

          {/* Resumo Rodapé da Esteira */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <span className="text-slate-400">
                Carregadores Ativos: <b className="text-white">{chargers.length} estações</b>
              </span>
              <span className="text-slate-400">
                Potência Total Carregadores: <b className="text-[#E45318]">{totalChargersKW} kW</b>
              </span>
              <span className="text-slate-400">
                Medição Mensal Estimada do Hub: <b className="text-[#00B356]">{topologyOutput.hubDedicatedMeterKWhEstimatedMonthly} kWh/mês</b>
              </span>
            </div>
            <div className="text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Clique sobre qualquer componente para inspecionar e alterar parâmetros</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB TRECHOS, CONDUTORES E DUTOS (OCUPAÇÃO <= 40%) ─────────────── */}
      {activeTab === 'sections' && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trecho 1 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Cable className="w-4 h-4 text-[#E45318]" />
                  {sections.section1_standardToPanel220.name}
                </h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                  {sections.section1_standardToPanel220.voltageV}V Trifásico
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-slate-400">Comprimento Nominal:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={section1DistanceM}
                      onChange={(e) => updateSectionDistanceAndMargin('trecho_1', Number(e.target.value) || 0, section1MarginPercent)}
                      className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                    <span className="text-slate-400">m</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Margem de Erro (%):</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={section1MarginPercent}
                      onChange={(e) => updateSectionDistanceAndMargin('trecho_1', section1DistanceM, Number(e.target.value) || 0)}
                      className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span>Distância Total (com margem): <b>{sections.section1_standardToPanel220.distanceTotalM}m</b></span>
                <span>Bitola Fase: <b className="text-amber-400">
                  {sections.section1_standardToPanel220.conductorsPerPhase > 1
                    ? `${sections.section1_standardToPanel220.conductorsPerPhase}x (${sections.section1_standardToPanel220.cableGaugePhaseMM2}mm²)`
                    : `${sections.section1_standardToPanel220.cableGaugePhaseMM2}mm²`}
                </b></span>
                <span>Duto {sections.section1_standardToPanel220.conduitInches} (Ocupação: <b className="text-emerald-400">{sections.section1_standardToPanel220.conduitFillingRatePercent}%</b> ≤ 40%)</span>
              </div>
            </div>

            {/* Trecho 2 (Se trafo ativo) */}
            {sections.section2_panel220ToTrafo && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Cable className="w-4 h-4 text-[#E45318]" />
                    {sections.section2_panel220ToTrafo.name}
                  </h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                    220V Primário Trafo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-slate-400">Comprimento Nominal:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={section2DistanceM}
                        onChange={(e) => updateSectionDistanceAndMargin('trecho_2', Number(e.target.value) || 0, section2MarginPercent)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                      <span className="text-slate-400">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Margem de Erro (%):</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={section2MarginPercent}
                        onChange={(e) => updateSectionDistanceAndMargin('trecho_2', section2DistanceM, Number(e.target.value) || 0)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span>Distância Total: <b>{sections.section2_panel220ToTrafo.distanceTotalM}m</b></span>
                  <span>Bitola Fase: <b className="text-amber-400">
                    {sections.section2_panel220ToTrafo.conductorsPerPhase > 1
                      ? `${sections.section2_panel220ToTrafo.conductorsPerPhase}x (${sections.section2_panel220ToTrafo.cableGaugePhaseMM2}mm²)`
                      : `${sections.section2_panel220ToTrafo.cableGaugePhaseMM2}mm²`}
                  </b></span>
                  <span>Duto {sections.section2_panel220ToTrafo.conduitInches} (Ocupação: <b className="text-emerald-400">{sections.section2_panel220ToTrafo.conduitFillingRatePercent}%</b>)</span>
                </div>
              </div>
            )}

            {/* Trecho 3 (Trafo -> Painel 380V) */}
            {sections.section3_trafoToPanel380 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Cable className="w-4 h-4 text-[#00B356]" />
                    {sections.section3_trafoToPanel380.name}
                  </h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                    380V Secundário Trafo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-slate-400">Comprimento Nominal:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={section3DistanceM}
                        onChange={(e) => updateSectionDistanceAndMargin('trecho_3', Number(e.target.value) || 0, section3MarginPercent)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                      <span className="text-slate-400">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Margem de Erro (%):</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={section3MarginPercent}
                        onChange={(e) => updateSectionDistanceAndMargin('trecho_3', section3DistanceM, Number(e.target.value) || 0)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span>Distância Total: <b>{sections.section3_trafoToPanel380.distanceTotalM}m</b></span>
                  <span>Bitola Fase: <b className="text-emerald-400">
                    {sections.section3_trafoToPanel380.conductorsPerPhase > 1
                      ? `${sections.section3_trafoToPanel380.conductorsPerPhase}x (${sections.section3_trafoToPanel380.cableGaugePhaseMM2}mm²)`
                      : `${sections.section3_trafoToPanel380.cableGaugePhaseMM2}mm²`}
                  </b></span>
                  <span>Duto {sections.section3_trafoToPanel380.conduitInches} (Ocupação: <b className="text-emerald-400">{sections.section3_trafoToPanel380.conduitFillingRatePercent}%</b>)</span>
                </div>
              </div>
            )}
          </div>

          {/* Feeders dos Carregadores (Trecho 4) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mt-4">
            <h4 className="font-bold text-sm text-white mb-3">
              Alimentadores dos Carregadores (Trecho 4) — Margem e Distância Individual
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-2.5">Carregador</th>
                    <th className="p-2.5">Tensão / Potência</th>
                    <th className="p-2.5">Dist. Nominal</th>
                    <th className="p-2.5">Margem (%)</th>
                    <th className="p-2.5">Dist. Total</th>
                    <th className="p-2.5">Bitola Fase</th>
                    <th className="p-2.5">Duto Indicado</th>
                    <th className="p-2.5">Ocupação</th>
                    <th className="p-2.5">Queda ΔV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {sections.section4_chargersFeeders.map((feeder, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-sans font-bold text-white">{chargers[i]?.name}</td>
                      <td className="p-2.5 text-slate-300">{chargers[i]?.voltageV}V / {chargers[i]?.powerKW} kW</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={chargers[i]?.distanceMeters || 10}
                          onChange={(e) => updateCharger(chargers[i].id, { distanceMeters: Number(e.target.value) || 0 })}
                          className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                        /> m
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={chargers[i]?.marginPercent || 10}
                          onChange={(e) => updateCharger(chargers[i].id, { marginPercent: Number(e.target.value) || 0 })}
                          className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                        /> %
                      </td>
                      <td className="p-2.5 text-slate-300 font-bold">{feeder.distanceTotalM}m</td>
                      <td className="p-2.5 text-amber-400 font-bold">{feeder.cableGaugePhaseMM2}mm²</td>
                      <td className="p-2.5 text-slate-300">{feeder.conduitInches}</td>
                      <td className="p-2.5 text-emerald-400 font-bold">{feeder.conduitFillingRatePercent}%</td>
                      <td className="p-2.5 text-slate-300">{feeder.voltageDropPercent}% ({feeder.voltageDropVolts}V)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB LISTA DE MATERIAIS CONSOLIDADA (BOM) ─────────────────────── */}
      {activeTab === 'bom' && (
        <div className="mt-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-3">
            <div>
              <h3 className="font-bold text-base text-white">Lista Quantitativa de Materiais (BOM)</h3>
              <p className="text-xs text-slate-400">Consolidado automático NBR 5410 com margens de cabo, quadros e padrão de entrada</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle de inclusão dos itens do padrão de entrada na BOM */}
              <label className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 cursor-pointer text-xs transition-colors">
                <input
                  type="checkbox"
                  checked={includeEntranceStandardInBOM}
                  onChange={(e) => setIncludeEntranceStandardInBOM(e.target.checked)}
                  className="rounded accent-[#E45318]"
                />
                <span className={includeEntranceStandardInBOM ? 'text-white font-semibold' : 'text-slate-400'}>
                  Incluir Padrão de Entrada na BOM
                </span>
              </label>

              <span className="text-xs font-mono font-bold px-3 py-1 bg-[#E45318]/20 text-[#E45318] border border-[#E45318]/30 rounded-lg">
                {effectiveBOM.length} Itens Dimensionados
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Descrição do Material</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-center">Unidade</th>
                  <th className="p-3">Especificação Técnica</th>
                  <th className="p-3">Norma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {effectiveBOM.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="p-3 uppercase font-mono text-[10px] text-slate-400">{item.category}</td>
                    <td className="p-3 font-semibold text-white">{item.description}</td>
                    <td className="p-3 text-center font-mono font-bold text-amber-400">{item.quantity}</td>
                    <td className="p-3 text-center font-mono text-slate-400">{item.unit}</td>
                    <td className="p-3 text-slate-300">{item.spec}</td>
                    <td className="p-3 font-mono text-slate-400">{item.normReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL POPUP DE CONFIGURAÇÃO DO BLOCO SELECIONADO (CENTRALIZADO NA TELA) ───────────── */}
      {selectedDrawerNodeId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0A192F] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200 flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono text-[#E45318] uppercase font-bold">Memorial & Configuração</span>
                  <h3 className="text-lg font-bold text-white capitalize">{selectedDrawerNodeId.replace(/_/g, ' ')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDrawerNodeId(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Fechar Janela"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo específico dependendo do bloco selecionado */}
              <div className="mt-4 space-y-4 text-xs">
                {selectedDrawerNodeId === 'padrao' && (
                  <div className="space-y-3">
                    <p className="text-slate-400 leading-relaxed">
                      Selecione ou altere o padrão de entrada da unidade consumidora. Qualquer alteração aqui é sincronizada retroativamente com o Passo 1B e recalcula todas as proteções e cabos.
                    </p>
                    <div>
                      <label className="block text-slate-400 mb-1">Padrão Homologado / Categoria:</label>
                      <select
                        value={currentStandardCategory}
                        onChange={(e) => {
                          const catId = e.target.value;
                          const found = CEMIG_CATEGORIES[catId];
                          const breakerA = found?.breakerCurrentA;
                          setCurrentStandardCategory(catId, breakerA);
                          if (onUpdateStandard) {
                            onUpdateStandard(catId, breakerA);
                          }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      >
                        <optgroup label="Monofásico / Bifásico (ND-5.1)">
                          <option value="A1">A1 — Monofásico 63A (8 kW)</option>
                          <option value="A_LEGADO_40A">A (Legado Antigo) — Monofásico 40A (8.8 kW)</option>
                          <option value="B1">B1 — Bifásico 63A (16 kW)</option>
                          <option value="B2">B2 — Bifásico 63A (16 kW)</option>
                        </optgroup>
                        <optgroup label="Trifásico Convencional BT (ND-5.1 Tabela 2)">
                          <option value="C1">C1 — Trifásico 40A (15 kW)</option>
                          <option value="C2">C2 — Trifásico 50A (20 kW)</option>
                          <option value="C3">C3 — Trifásico 63A (25 kW)</option>
                          <option value="C4">C4 — Trifásico 80A (30 kW)</option>
                          <option value="C5">C5 — Trifásico 125A (50 kW)</option>
                          <option value="C6">C6 — Trifásico 200A (75 kW)</option>
                        </optgroup>
                        <optgroup label="Alta Demanda BT com Medição Indireta TC (ND-5.1 Tabela 4)">
                          <option value="F1">F1 — Alta Demanda 76 kVA / Disjuntor 200A (TC 200/5)</option>
                          <option value="F2">F2 — Alta Demanda 95 kVA / Disjuntor 250A (TC 200/5)</option>
                          <option value="F3">F3 — Alta Demanda 114 kVA / Disjuntor 300A (TC 200/5)</option>
                          <option value="F4">F4 — Alta Demanda 152 kVA / Disjuntor 400A (TC 400/5)</option>
                          <option value="F5">F5 — Alta Demanda 171 kVA / Disjuntor 450A (TC 400/5)</option>
                          <option value="F6">F6 — Alta Demanda 188 kVA / Disjuntor 500A (TC 400/5)</option>
                          <option value="F7_600">F7 (600A) — Alta Demanda 217 kW / Disjuntor 600A (TC 600/5)</option>
                          <option value="F7_630">F7 (630A) — Alta Demanda 228 kVA / Disjuntor 630A (TC 600/5)</option>
                          <option value="F8">F8 — Alta Demanda 266 kVA / Disjuntor 700A (TC 800/5)</option>
                          <option value="F9">F9 — Alta Demanda 304 kVA / Disjuntor 800A (TC 800/5)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                      <h5 className="font-sans font-bold text-white text-xs border-b border-slate-800 pb-1.5 flex items-center justify-between">
                        <span>Balanço de Cargas Alocadas no Padrão:</span>
                        <span className={`text-[11px] font-bold ${standardAlert.isOverloaded ? 'text-rose-400' : 'text-[#00B356]'}`}>
                          {standardAlert.isOverloaded ? 'SOBRECARGA' : 'CONFORME'}
                        </span>
                      </h5>

                      <div className="space-y-1.5 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-slate-400 font-sans font-semibold text-[11px] block">Relação Detalhada de Cargas:</span>
                        <div className="flex justify-between text-slate-300">
                          <span>• Carga Existente do Imóvel:</span>
                          <span className="text-white font-bold">{standardAlert.clientBaseLoadKW} kW</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>• Estações de Recarga ({chargers.length} VEs):</span>
                          <span className="text-amber-400 font-bold">{chargers.reduce((s, c) => s + c.powerKW, 0)} kW</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>• Cargas Auxiliares do Hub (Luz/CFTV/Tomada):</span>
                          <span className="text-slate-300 font-bold">
                            {panel220V.totalAuxKW.toFixed(2)} kW
                          </span>
                        </div>
                        {transformer.needed && (
                          <div className="flex justify-between text-slate-300">
                            <span>• Perdas Estimadas do Trafo:</span>
                            <span className="text-slate-400 font-bold">~{transformer.lossesKW} kW</span>
                          </div>
                        )}
                        <div className="flex justify-between text-white font-bold border-t border-slate-800 pt-1.5 mt-1">
                          <span>Demanda Total Simultânea:</span>
                          <span className="text-[#E45318] text-sm">{standardAlert.totalRequiredLoadKW} kW</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-slate-400 font-sans font-semibold text-[11px] block">Capacidade Máxima do Padrão Selecionado:</span>
                        <div className="flex justify-between text-slate-300">
                          <span>Disjuntor Geral Homologado:</span>
                          <span className="text-amber-400 font-bold">{standardAlert.currentStandardBreakerA} A</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Limite Máximo Nominal:</span>
                          <span className="text-emerald-400 font-bold">{standardAlert.currentStandardLimitKW} kW</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Corrente Máxima Suportada:</span>
                          <span className="text-slate-200 font-bold">{standardAlert.currentStandardBreakerA} A</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Corrente de Demanda Solicitada:</span>
                          <span className="text-amber-400 font-bold">{standardAlert.requiredCapacityA} A</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1">
                          <span className="font-bold text-slate-300">Folga / Sobra Disponível:</span>
                          <span className={`font-bold ${standardAlert.currentStandardLimitKW >= standardAlert.totalRequiredLoadKW ? 'text-[#00B356]' : 'text-rose-400'}`}>
                            {(standardAlert.currentStandardLimitKW - standardAlert.totalRequiredLoadKW).toFixed(2)} kW ({((standardAlert.currentStandardLimitKW - standardAlert.totalRequiredLoadKW) * 1000 / (1.732 * 220 * 0.98)).toFixed(1)} A)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDrawerNodeId === 'panel220v' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[#E45318] font-bold">
                          Quadro de Distribuição Geral (QGBT 220V)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">
                          {panel220V.voltageV}V (3F+N+PE)
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">Detalhamento e Seleção de Cargas Associadas</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Selecione ou desmarque as cargas que passam por este painel (carga do cliente, alimentação do trafo, cargas auxiliares e perdas) para calcular a potência agregada em tempo real (conforme Foto 04 e Figura 05).
                      </p>
                    </div>

                    {/* Resumo Dinâmico das Cargas Selecionadas no Painel 220V */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-sans">Potência Selecionada no Quadro:</span>
                        <strong className="text-base text-amber-400 font-bold">{panel220VSelectedKW.toFixed(2)} kW</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-sans">Corrente de Projeto (Ib @ 220V):</span>
                        <strong className="text-base text-emerald-400 font-bold">{panel220VSelectedCurrentA} A</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-sans">Disjuntor Geral Recomendado:</span>
                        <strong className="text-base text-[#E45318] font-bold">
                          {panel220V.mainBreakerA} A (Curva {panel220V.mainBreakerCurve})
                        </strong>
                      </div>
                    </div>

                    {/* Lista Completa de Cargas Associadas com Checkboxes (Estilo Figura 05) */}
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h5 className="font-bold text-white text-xs flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          Relação de Cargas Associadas ao Painel 220V
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Clique nas caixas para incluir/ignorar carga
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* 1. Carga Base do Cliente */}
                        <div 
                          onClick={() => toggleLoad220V('clientBase')}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedLoads220V.clientBase !== false 
                              ? 'bg-slate-950 border-blue-500/50 text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLoads220V.clientBase !== false}
                              onChange={() => {}}
                              className="rounded accent-[#E45318] cursor-pointer"
                            />
                            <div>
                              <strong className="text-xs block">1. Carga Existente do Imóvel (SmartMeter)</strong>
                              <span className="text-[10px] text-slate-400 font-sans">Medição de demanda em campo • Trifásico 220V</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-blue-400 block">{breakdownClientKW.toFixed(2)} kW</span>
                            <span className="text-[10px] text-slate-400">{((breakdownClientKW * 1000) / (Math.sqrt(3) * 220 * 0.98)).toFixed(1)} A</span>
                          </div>
                        </div>

                        {/* 2. Carregadores Veiculares Nominais (Passantes pelo Trafo ou Diretos) */}
                        {transformer.needed ? (
                          <>
                            <div 
                              onClick={() => toggleLoad220V('trafoFeeder')}
                              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                                selectedLoads220V.trafoFeeder !== false 
                                  ? 'bg-slate-950 border-[#E45318]/50 text-white' 
                                  : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedLoads220V.trafoFeeder !== false}
                                  onChange={() => {}}
                                  className="rounded accent-[#E45318] cursor-pointer"
                                />
                                <div>
                                  <strong className="text-xs block">2. Carregadores Veiculares Nominais (Hub VE)</strong>
                                  <span className="text-[10px] text-slate-400 font-sans">
                                    Potência nominal de placa ({chargers.length} estações VE) • Sem perdas acopladas
                                  </span>
                                </div>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-xs font-bold text-amber-400 block">
                                  {breakdownChargersNominalKW.toFixed(2)} kW
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {Number(((breakdownChargersNominalKW * 1000) / (Math.sqrt(3) * 220 * 0.98)).toFixed(1))} A
                                </span>
                              </div>
                            </div>

                            {/* 3. Perdas no Transformador Elevador Dyn1 */}
                            <div 
                              onClick={() => toggleLoad220V('trafoLosses')}
                              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                                selectedLoads220V.trafoLosses !== false 
                                  ? 'bg-slate-950 border-amber-500/50 text-white' 
                                  : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedLoads220V.trafoLosses !== false}
                                  onChange={() => {}}
                                  className="rounded accent-amber-500 cursor-pointer"
                                />
                                <div>
                                  <strong className="text-xs block">3. Perdas no Transformador Elevador Dyn1</strong>
                                  <span className="text-[10px] text-slate-400 font-sans">
                                    Perdas ativas nos enrolamentos e núcleo ferromagnético (rendimento ~98%)
                                  </span>
                                </div>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-xs font-bold text-amber-300 block">
                                  +{breakdownTrafoLossesKW.toFixed(2)} kW
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {Number(((breakdownTrafoLossesKW * 1000) / (Math.sqrt(3) * 220 * 0.98)).toFixed(1))} A
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          chargers.map((ch, idx) => (
                            <div 
                              key={`load-ch-${ch.id}`}
                              onClick={() => toggleLoad220V(`ch_${ch.id}`)}
                              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                                selectedLoads220V[`ch_${ch.id}`] !== false 
                                  ? 'bg-slate-950 border-[#E45318]/50 text-white' 
                                  : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedLoads220V[`ch_${ch.id}`] !== false}
                                  onChange={() => {}}
                                  className="rounded accent-[#E45318] cursor-pointer"
                                />
                                <div>
                                  <strong className="text-xs block">VE {idx + 1}: {ch.name} ({ch.brand})</strong>
                                  <span className="text-[10px] text-slate-400 font-sans">Carregador Direto 220V</span>
                                </div>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-xs font-bold text-amber-400 block">{ch.powerKW.toFixed(2)} kW</span>
                                <span className="text-[10px] text-slate-400">{ch.currentInA} A</span>
                              </div>
                            </div>
                          ))
                        )}

                        {/* 3. Cargas Auxiliares: Iluminação */}
                        <div 
                          onClick={() => toggleLoad220V('auxLighting')}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedLoads220V.auxLighting !== false && auxiliaryConfig.lightingEnabled
                              ? 'bg-slate-950 border-emerald-500/50 text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLoads220V.auxLighting !== false && auxiliaryConfig.lightingEnabled}
                              onChange={() => {}}
                              className="rounded accent-[#E45318] cursor-pointer"
                            />
                            <div>
                              <strong className="text-xs block">3. Iluminação LED do Pátio</strong>
                              <span className="text-[10px] text-slate-400 font-sans">Circuito de Iluminação • Monofásico 127V</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-emerald-400 block">{breakdownAuxLightingKW.toFixed(2)} kW</span>
                            <span className="text-[10px] text-slate-400">{((breakdownAuxLightingKW * 1000) / 127).toFixed(1)} A</span>
                          </div>
                        </div>

                        {/* 4. Cargas Auxiliares: Tomada */}
                        <div 
                          onClick={() => toggleLoad220V('auxOutlet')}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedLoads220V.auxOutlet !== false && auxiliaryConfig.outletEnabled
                              ? 'bg-slate-950 border-emerald-500/50 text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLoads220V.auxOutlet !== false && auxiliaryConfig.outletEnabled}
                              onChange={() => {}}
                              className="rounded accent-[#E45318] cursor-pointer"
                            />
                            <div>
                              <strong className="text-xs block">4. Tomada de Manutenção / Serviço</strong>
                              <span className="text-[10px] text-slate-400 font-sans">Tomada 2P+T 20A • Monofásico 127V</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-emerald-400 block">{breakdownAuxOutletKW.toFixed(2)} kW</span>
                            <span className="text-[10px] text-slate-400">{((breakdownAuxOutletKW * 1000) / 127).toFixed(1)} A</span>
                          </div>
                        </div>

                        {/* 5. Cargas Auxiliares: CFTV */}
                        <div 
                          onClick={() => toggleLoad220V('auxCctv')}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedLoads220V.auxCctv !== false && auxiliaryConfig.cctvEnabled
                              ? 'bg-slate-950 border-emerald-500/50 text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLoads220V.auxCctv !== false && auxiliaryConfig.cctvEnabled}
                              onChange={() => {}}
                              className="rounded accent-[#E45318] cursor-pointer"
                            />
                            <div>
                              <strong className="text-xs block">5. CFTV & Monitoramento</strong>
                              <span className="text-[10px] text-slate-400 font-sans">Câmeras e roteador • Monofásico 127V</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-emerald-400 block">{breakdownAuxCctvKW.toFixed(2)} kW</span>
                            <span className="text-[10px] text-slate-400">{((breakdownAuxCctvKW * 1000) / 127).toFixed(1)} A</span>
                          </div>
                        </div>

                        {/* 6. Perdas Joule nos Condutores */}
                        <div 
                          onClick={() => toggleLoad220V('sectionLosses')}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedLoads220V.sectionLosses !== false 
                              ? 'bg-slate-950 border-slate-600 text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLoads220V.sectionLosses !== false}
                              onChange={() => {}}
                              className="rounded accent-[#E45318] cursor-pointer"
                            />
                            <div>
                              <strong className="text-xs block">6. Perdas nos Trechos a Jusante (Efeito Joule)</strong>
                              <span className="text-[10px] text-slate-400 font-sans">Perdas nos cabos dimensionados após o quadro</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-slate-300 block">+{breakdownCableLossesKW.toFixed(2)} kW</span>
                            <span className="text-[10px] text-slate-500">Estimativa Joule</span>
                          </div>
                        </div>

                        {/* 7. Circuitos Customizados Cadastrados */}
                        {customCircuits220V.map((circ, idx) => (
                          <div 
                            key={`load-custom-${circ.id}`}
                            onClick={() => toggleLoad220V(`custom_${circ.id}`)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                              selectedLoads220V[`custom_${circ.id}`] !== false 
                                ? 'bg-slate-950 border-amber-500/50 text-white' 
                                : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedLoads220V[`custom_${circ.id}`] !== false}
                                onChange={() => {}}
                                className="rounded accent-[#E45318] cursor-pointer"
                              />
                              <div>
                                <strong className="text-xs block">Circuito {7 + idx}: {circ.name}</strong>
                                <span className="text-[10px] text-slate-400 font-sans">Circuito extra cadastrado • {circ.voltageV}V</span>
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-xs font-bold text-amber-400 block">{(circ.powerW / 1000).toFixed(2)} kW</span>
                              <span className="text-[10px] text-slate-400">{circ.breakerA} A</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Configuração de Potência das Cargas Auxiliares */}
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                      <h5 className="font-bold text-white text-xs">Ajuste Fino de Potência das Cargas Auxiliares (Watts):</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-300">Iluminação:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              disabled={!auxiliaryConfig.lightingEnabled}
                              value={auxiliaryConfig.lightingPowerW}
                              onChange={(e) => updateAuxiliaryConfig({ lightingPowerW: Number(e.target.value) || 0 })}
                              className="w-16 bg-slate-800 border border-slate-700 rounded px-1 text-center font-mono text-xs text-white"
                            />
                            <span className="text-[10px] text-slate-400">W</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-300">Tomada:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              disabled={!auxiliaryConfig.outletEnabled}
                              value={auxiliaryConfig.outletPowerW}
                              onChange={(e) => updateAuxiliaryConfig({ outletPowerW: Number(e.target.value) || 0 })}
                              className="w-16 bg-slate-800 border border-slate-700 rounded px-1 text-center font-mono text-xs text-white"
                            />
                            <span className="text-[10px] text-slate-400">W</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-300">CFTV:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              disabled={!auxiliaryConfig.cctvEnabled}
                              value={auxiliaryConfig.cctvPowerW}
                              onChange={(e) => updateAuxiliaryConfig({ cctvPowerW: Number(e.target.value) || 0 })}
                              className="w-16 bg-slate-800 border border-slate-700 rounded px-1 text-center font-mono text-xs text-white"
                            />
                            <span className="text-[10px] text-slate-400">W</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Circuitos Auxiliares Extras Customizados */}
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="font-bold text-white text-xs">Circuitos Adicionais no Painel 220V:</h4>
                        <span className="text-[10px] text-slate-400">{customCircuits220V.length} cadastrado(s)</span>
                      </div>

                      {customCircuits220V.map((circ) => (
                        <div key={circ.id} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                          <div>
                            <span className="text-white font-medium block">{circ.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {circ.powerW}W ({circ.voltageV}V) • Disj. {circ.breakerA}A • Cabo {circ.cableMM2}mm²
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomCircuit('220v', circ.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all"
                            title="Remover circuito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Formulário Inline de Adição Rápida com Categorização NBR 5410 */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const name = (form.elements.namedItem('circName') as HTMLInputElement).value;
                          const watts = Number((form.elements.namedItem('circPower') as HTMLInputElement).value);
                          const volt = Number((form.elements.namedItem('circVolt') as HTMLSelectElement).value) as 127 | 220;
                          const category = (form.elements.namedItem('circCategory') as HTMLSelectElement).value as any;
                          if (name && watts > 0) {
                            addCustomCircuit('220v', { name, powerW: watts, voltageV: volt, circuitCategory: category });
                            form.reset();
                          }
                        }}
                        className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80"
                      >
                        <select
                          name="circCategory"
                          defaultValue="outlet_tug"
                          className="w-full sm:w-44 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#E45318]"
                          title="Categoria normativa do circuito (determina bitola mínima, curva e DR obrigatório)"
                        >
                          <option value="outlet_tug">Tomada TUG (Mín. 2.5mm² + DR 30mA)</option>
                          <option value="outlet_tue">Tomada TUE (Mín. 2.5mm² + DR 30mA)</option>
                          <option value="lighting">Iluminação (Mín. 1.5mm² Curva B)</option>
                          <option value="electronics_cctv">CFTV / TI (Mín. 2.5mm² + DPS III)</option>
                          <option value="transformer_feeder">Alimentador Trafo (Curva D)</option>
                          <option value="ev_charger">Carregador VE (NBR 17019 - DR B)</option>
                          <option value="custom">Geral / Customizado</option>
                        </select>
                        <input
                          name="circName"
                          placeholder="Nome (Ex: Totem, Sensor)"
                          required
                          className="flex-1 min-w-[120px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E45318]"
                        />
                        <input
                          name="circPower"
                          type="number"
                          placeholder="Potência (W)"
                          min="1"
                          required
                          className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center placeholder-slate-500 focus:outline-none focus:border-[#E45318]"
                        />
                        <select
                          name="circVolt"
                          defaultValue="127"
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-[#E45318]"
                        >
                          <option value="127">127V</option>
                          <option value="220">220V</option>
                        </select>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-[#E45318] hover:bg-[#c24310] text-white rounded text-xs font-bold transition-all"
                        >
                          + Adicionar
                        </button>
                      </form>
                    </div>

                    {/* ── DIAGRAMA UNIFILAR INTERATIVO DO PAINEL 220V (CONFORME FOTO 04 / NBR 5410 & NBR 17019) ── */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#E45318] block">Diagrama Unifilar Interativo (NBR 5410 / NBR 17019)</span>
                          <span className="text-white text-xs font-bold">Quadro de Distribuição 220V (QGBT-VE)</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold">
                          Tensão Barramento: {panel220V.voltageV}V (3F+N+PE)
                        </span>
                      </div>

                      {/* Visualização Esquemática Unifilar Vetorial */}
                      <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800 space-y-4">
                        {/* 1. Entrada: Disjuntor Geral Caixa Moldada */}
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-400 uppercase font-bold mb-1">Entrada da Concessionária (Trecho 1)</span>
                          <div className="w-1 bg-[#E45318] h-4" />
                          <div className="bg-slate-800 border-2 border-[#E45318] rounded-lg px-4 py-2 text-center shadow-md">
                            <span className="text-[10px] text-slate-400 block font-sans">Disjuntor Geral QGBT</span>
                            <span className="text-white text-sm font-bold block">{panel220V.mainBreakerA}A Caixa Moldada</span>
                            <span className="text-[9px] text-amber-400">Curva {panel220V.mainBreakerCurve} • Tripolar 3P • Icu ≥ 25kA</span>
                          </div>
                          <div className="w-1 bg-amber-500 h-4" />
                        </div>

                        {/* 2. DPS Classe II e Proteção de Surto */}
                        <div className="flex items-center justify-center gap-2">
                          <div className="bg-slate-950 border border-emerald-500/60 rounded px-2.5 py-1 text-center">
                            <span className="text-[9px] text-emerald-400 font-bold block">3x DPS Classe II (275V / 45kA)</span>
                            <span className="text-[8px] text-slate-400">Proteção contra sobretensões transitórias</span>
                          </div>
                          <div className="bg-slate-950 border border-cyan-500/60 rounded px-2.5 py-1 text-center">
                            <span className="text-[9px] text-cyan-400 font-bold block">Medidor Modbus RTU RS-485</span>
                            <span className="text-[8px] text-slate-400">Leitura exclusiva do Hub</span>
                          </div>
                        </div>

                        {/* 3. Barramento Principal em Cobre (Degraus R, S, T) */}
                        <div className="space-y-1 my-2">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 font-sans">
                            <span>Barramento de Distribuição de Cobre Eletrolítico</span>
                            <span className="text-amber-400 font-bold">{panel220V.busbarRatingA}A (99.9% Cu)</span>
                          </div>
                          <div className="h-2 bg-gradient-to-r from-red-600 via-amber-500 to-blue-600 rounded-sm w-full shadow-inner" title="Fases R, S, T" />
                        </div>

                        {/* 4. Derivações dos Circuitos Terminais Derivados (Conforme Foto 04) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                          {/* Circuito 0: Carga Existente do Cliente */}
                          {panel220V.auxiliaryLoads.clientBaseBreaker && panel220V.auxiliaryLoads.clientBaseBreaker.powerKW > 0 && (
                            <div className="p-2.5 rounded-lg border text-xs bg-slate-950 border-blue-500/50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white font-bold text-[11px] truncate">Circ. Cliente: Carga Existente</span>
                                <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-700/60 px-1.5 py-0.2 rounded font-bold">
                                  {panel220V.auxiliaryLoads.clientBaseBreaker.breakerA}A Curva C (3P)
                                </span>
                              </div>
                              <span className="text-[10px] text-blue-300 block">
                                Trifásico 220V • {panel220V.auxiliaryLoads.clientBaseBreaker.powerKW.toFixed(2)} kW ({panel220V.auxiliaryLoads.clientBaseBreaker.designCurrentA} A)
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                Medição SmartMeter (Passos 1A e 1B)
                              </span>
                            </div>
                          )}

                          {/* Circuito 1: Iluminação */}
                          <div className={`p-2.5 rounded-lg border text-xs transition-all ${
                            auxiliaryConfig.lightingEnabled ? 'bg-slate-950 border-slate-700' : 'bg-slate-950/40 border-slate-900 opacity-60'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-bold text-[11px]">Circ. 1: Iluminação LED</span>
                              <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-emerald-400 font-bold">
                                {panel220V.auxiliaryLoads.lighting.breakerA}A Curva B
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">Monofásico 127V • {auxiliaryConfig.lightingPowerW}W</span>
                            <span className="text-[9px] text-slate-500 font-mono">Cabo 2.5 mm² • Duto 3/4"</span>
                          </div>

                          {/* Circuito 2: Tomada Manutenção */}
                          <div className={`p-2.5 rounded-lg border text-xs transition-all ${
                            auxiliaryConfig.outletEnabled ? 'bg-slate-950 border-slate-700' : 'bg-slate-950/40 border-slate-900 opacity-60'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-bold text-[11px]">Circ. 2: Tomada de Serviço</span>
                              <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-emerald-400 font-bold">
                                {panel220V.auxiliaryLoads.maintenanceOutlet.breakerA}A Curva C
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">Monofásico 127V • {auxiliaryConfig.outletPowerW}W</span>
                            <span className="text-[9px] text-slate-500 font-mono">Cabo 2.5 mm² + DR 30mA</span>
                          </div>

                          {/* Circuito 3: CFTV & Wi-Fi */}
                          <div className={`p-2.5 rounded-lg border text-xs transition-all ${
                            auxiliaryConfig.cctvEnabled ? 'bg-slate-950 border-slate-700' : 'bg-slate-950/40 border-slate-900 opacity-60'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-bold text-[11px]">Circ. 3: CFTV & Automação</span>
                              <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-emerald-400 font-bold">
                                {panel220V.auxiliaryLoads.cctv.breakerA}A Curva C
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">Monofásico 127V • {auxiliaryConfig.cctvPowerW}W</span>
                            <span className="text-[9px] text-slate-500 font-mono">Cabo 2.5 mm² • DPS Cl. III</span>
                          </div>

                          {/* Circuitos Extras Cadastrados */}
                          {customCircuits220V.map((circ, idx) => (
                            <div key={circ.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-700 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white font-bold text-[11px] truncate">Circ. {4 + idx}: {circ.name}</span>
                                <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-amber-400 font-bold">
                                  {circ.breakerA}A Curva {circ.curve || 'C'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block">{circ.voltageV}V • {circ.powerW}W</span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                Cabo {circ.cableMM2} mm² {circ.drRequired ? '• DR 30mA' : ''} {circ.dpsClass && circ.dpsClass !== 'Dispensado' ? `• DPS ${circ.dpsClass}` : ''}
                              </span>
                            </div>
                          ))}

                          {/* Circuito Dedicado: Alimentação do Transformador Elevador (se aplicável) */}
                          {transformer.needed && (
                            <div className="p-2.5 bg-[#E45318]/10 rounded-lg border border-[#E45318]/60 text-xs col-span-full sm:col-span-2 md:col-span-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-[#E45318]" />
                                  <span className="text-white font-bold text-[11px]">Circuito Alimentador do Transformador Elevador 220/380V (Dyn1)</span>
                                </div>
                                <span className="text-[10px] bg-[#E45318] text-white px-2 py-0.5 rounded font-bold">
                                  Disjuntor {panel220V.transformerProtectionBreakerA || 300}A Curva D (3P)
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-[10px] text-slate-300 font-sans">
                                <div>
                                  <span className="text-slate-400 block">Carga do Trafo:</span>
                                  <strong className="text-white">{transformer.nominalKVA} kVA ({transformer.activePowerKW} kW)</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Corrente Primária 220V:</span>
                                  <strong className="text-amber-400">{transformer.primaryCurrentA} A</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Alimentador Primário:</span>
                                  <strong className="text-emerald-400">{sections.section2_panel220ToTrafo ? `${sections.section2_panel220ToTrafo.conductorsPerPhase}x ${sections.section2_panel220ToTrafo.cableGaugePhaseMM2}mm²` : 'Dimensionado'}</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Circuitos de Proteção Exclusiva dos Carregadores VE (Rede 380V ou Bypass) */}
                          {(!transformer.needed || gridSupplyVoltage === 380) && chargers.map((ch, idx) => {
                            const inrushFactor = 1.15;
                            const v = ch.voltageV >= 380 ? 380 : (gridSupplyVoltage === 380 ? 380 : 220);
                            const calcA = (ch.powerKW * 1000) / (Math.sqrt(ch.phases === 3 ? 3 : 1) * v * 0.98) * inrushFactor;
                            const breakerA = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 150, 175, 200, 225, 250, 300, 400, 500, 630].find(b => b >= calcA) || 40;
                            return (
                              <div key={`ch-unifilar-${ch.id}`} className="p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-500/40 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white font-bold text-[11px] truncate">VE {idx + 1}: {ch.name}</span>
                                  <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1.5 py-0.2 rounded font-bold">{breakerA}A Curva C ({ch.phases === 3 ? '3P' : '2P'})</span>
                                </div>
                                <span className="text-[10px] text-emerald-400 block">{ch.powerKW} kW ({v}V) • DR 30mA Tipo B</span>
                                <span className="text-[9px] text-slate-400 font-mono">Alimentador Trecho 4 • Conector {ch.connector || 'Tipo 2'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Memorial de Cálculo Passo a Passo de Todos os Componentes do Painel 220V */}
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                      <div className="text-amber-400 font-bold font-sans text-xs flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span>Memorial de Cálculo de Dimensionamento dos Disjuntores (Painel 220V):</span>
                        <span className="text-[#00B356] text-[10px]">Auditável NBR 5410</span>
                      </div>
                      
                      <div className="space-y-1.5 text-[11px]">
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <strong className="text-white block font-sans">1. Disjuntor Geral do Painel 220V:</strong>
                          <span className="text-amber-300 block">
                            {panel220V.calculationBreakdown?.formulaMainBreaker || `In = ${panel220V.mainBreakerA}A Caixa Moldada Curva ${panel220V.mainBreakerCurve}`}
                          </span>
                        </div>

                        {panel220V.calculationBreakdown?.formulaTrafoBreaker && (
                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                            <strong className="text-white block font-sans">2. Disjuntor de Proteção do Transformador Dyn1:</strong>
                            <span className="text-amber-300 block">
                              {panel220V.calculationBreakdown.formulaTrafoBreaker}
                            </span>
                          </div>
                        )}

                        {panel220V.auxiliaryLoads.clientBaseBreaker && panel220V.auxiliaryLoads.clientBaseBreaker.powerKW > 0 && (
                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                            <strong className="text-white block font-sans">3. Disjuntor do Alimentador da Carga do Cliente:</strong>
                            <span className="text-blue-300 block">
                              {panel220V.auxiliaryLoads.clientBaseBreaker.formulaSizing}
                            </span>
                          </div>
                        )}

                        <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
                          <strong className="text-white block font-sans">4. Disjuntores dos Circuitos Auxiliares (CFTV, Iluminação, Tomadas e Outros):</strong>
                          <div className="text-emerald-400 block">• CFTV: {panel220V.auxiliaryLoads.cctv.formulaSizing}</div>
                          <div className="text-emerald-400 block">• Iluminação: {panel220V.auxiliaryLoads.lighting.formulaSizing}</div>
                          <div className="text-emerald-400 block">• Tomada de Serviço: {panel220V.auxiliaryLoads.maintenanceOutlet.formulaSizing}</div>
                          {customCircuits220V.map((circ, idx) => (
                            <div key={`circ-mem-${circ.id}`} className="text-slate-300 block">
                              • Circ. {idx + 4} ({circ.name}): Ib = {circ.powerW}W / {circ.voltageV}V = {(circ.powerW / circ.voltageV).toFixed(1)}A ➔ Disjuntor {circ.breakerA}A Curva {circ.curve || 'C'} ({circ.drRequired ? 'com DR 30mA' : 'sem DR'})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── POPUP DE DIMENSIONAMENTO DETALHADO DOS TRECHOS 1, 2 e 3 ─── */}
                {(selectedDrawerNodeId === 'trecho_1' || selectedDrawerNodeId === 'trecho_2' || selectedDrawerNodeId === 'trecho_3') && (
                  (() => {
                    const sec = selectedDrawerNodeId === 'trecho_1'
                      ? sections.section1_standardToPanel220
                      : selectedDrawerNodeId === 'trecho_2'
                      ? sections.section2_panel220ToTrafo
                      : sections.section3_trafoToPanel380;

                    if (!sec) return <p className="text-slate-400">Trecho não ativo para esta topologia.</p>;

                    const nominalDist = selectedDrawerNodeId === 'trecho_1' ? section1DistanceM : selectedDrawerNodeId === 'trecho_2' ? section2DistanceM : section3DistanceM;
                    const margin = selectedDrawerNodeId === 'trecho_1' ? section1MarginPercent : selectedDrawerNodeId === 'trecho_2' ? section2MarginPercent : section3MarginPercent;

                    return (
                      <div className="space-y-4">
                        <div className="bg-slate-900/90 p-3.5 rounded-xl border border-[#E45318]/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase text-[#E45318] font-bold">Memorial de Cálculo NBR 5410</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                              {sec.voltageV}V ({sec.phases} Fases)
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white">{sec.name}</h4>
                          <p className="text-[11px] text-slate-400">
                            De <strong>{sec.fromNode}</strong> até <strong>{sec.toNode}</strong>
                          </p>
                        </div>

                        {/* Edição Rápida de Comprimento, Margem e Material do Condutor */}
                        <div className="space-y-2.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Comprimento Nominal:</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={nominalDist}
                                  onChange={(e) => updateSectionDistanceAndMargin(selectedDrawerNodeId as any, Number(e.target.value) || 0, margin)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                                />
                                <span className="text-slate-400">m</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Margem de Erro (%):</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={margin}
                                  onChange={(e) => updateSectionDistanceAndMargin(selectedDrawerNodeId as any, nominalDist, Number(e.target.value) || 0)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                                />
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>
                          </div>

                          {/* Seletor Cobre (Cu) vs Alumínio (Al) */}
                          <div className="pt-2 border-t border-slate-800/80">
                            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1.5">
                              Material dos Condutores (NBR 5410):
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => updateSectionMaterial(selectedDrawerNodeId as any, 'copper')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border text-left ${
                                  (sec.conductorMaterial || 'copper') === 'copper'
                                    ? 'bg-[#E45318]/20 border-[#E45318] text-white shadow-sm'
                                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>Cobre (Cu)</span>
                                  <span className="text-[10px] font-mono text-amber-400">70°C PVC</span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-normal block mt-0.5">
                                  Padrão NBR 5410 p/ eletrodutos
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => updateSectionMaterial(selectedDrawerNodeId as any, 'aluminum')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border text-left ${
                                  sec.conductorMaterial === 'aluminum'
                                    ? 'bg-[#00B356]/20 border-[#00B356] text-white shadow-sm'
                                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>Alumínio (Al)</span>
                                  <span className="text-[10px] font-mono text-emerald-400">Mín. 16mm²</span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-normal block mt-0.5">
                                  Aéreo multiplex / Duto enterrado
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Seletor de Método de Instalação NBR 5410 (Tabela 33) */}
                          <div className="pt-2 border-t border-slate-800/80">
                            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1.5">
                              Método de Instalação Normativo (NBR 5410 Tabela 33):
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { id: 'B1', title: 'Método B1', sub: 'Embutido', desc: 'Duto alvenaria' },
                                { id: 'B2', title: 'Método B2', sub: 'Aparente', desc: 'Duto em parede' },
                                { id: 'C', title: 'Método C', sub: 'Bandeja/Perf.', desc: 'Direto em perfil' },
                                { id: 'D', title: 'Método D', sub: 'Enterrado', desc: 'Duto no solo 20°C' },
                              ].map((m) => {
                                const isCurrent = (sec.installationMethod || 'B1') === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => updateSectionInstallationMethod(selectedDrawerNodeId as any, m.id as any)}
                                    className={`p-2 rounded-lg border text-left transition-all ${
                                      isCurrent
                                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-sm'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold">{m.title}</span>
                                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                    </div>
                                    <span className="text-[9px] block text-amber-300/80 font-mono mt-0.5">{m.sub}</span>
                                    <span className="text-[8px] block text-slate-400">{m.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Dados Eletrotécnicos Completos */}
                        {/* Dados Eletrotécnicos Completos com Fórmulas e Contas Explícitas */}
                        <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-3 text-xs font-mono">
                          <h5 className="font-sans font-bold text-white text-xs border-b border-slate-800 pb-1.5 flex items-center justify-between">
                            <span>Memorial de Cálculo Matemático:</span>
                            <span className="text-[#00B356] text-[11px]">Passo a Passo</span>
                          </h5>

                          {/* 1. Cálculo da Corrente de Projeto */}
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-sans font-semibold text-[11px] block">1. Corrente de Projeto (Ib):</span>
                            <div className="text-amber-400 text-[11px] font-bold">
                              {sec.calculationBreakdown?.formulaDesignCurrent || `Ib = ${sec.designCurrentA} A`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Distância: {sec.distanceNominalM}m + {sec.marginPercent}% margem = <b>{sec.distanceTotalM}m</b>
                            </div>
                          </div>

                          {/* 2. Critério da Capacidade de Condução de Corrente (Ampacidade) */}
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-sans font-semibold text-[11px] block">2. Critério de Ampacidade (NBR 5410):</span>
                            <div className="text-emerald-400 text-[11px]">
                              {sec.calculationBreakdown?.formulaAmpacity || `Iz = ${sec.totalAmpacityA} A ≥ Ib (${sec.designCurrentA} A)`}
                            </div>
                            <div className="text-[10px] text-slate-300 mt-1 flex flex-wrap gap-2">
                              <span>Vias em paralelo: <b className="text-white">{sec.conductorsPerPhase} condutor(es)/fase</b></span>
                              <span>• Bitola: <b className="text-[#00B356]">{sec.conductorsPerPhase > 1 ? `${sec.conductorsPerPhase}x ` : ''}{sec.cableGaugePhaseMM2} mm² {sec.conductorMaterial === 'aluminum' ? (sec.phases === 1 ? 'Al (Biplex)' : sec.phases === 2 ? 'Al (Triplex)' : 'Al (Quadruplex)') : 'Cu'}</b></span>
                              <span>• Neutro: <b className="text-blue-400">{sec.cableGaugeNeutralMM2 ? `${sec.conductorsPerPhase > 1 ? `${sec.conductorsPerPhase}x ` : ''}${sec.cableGaugeNeutralMM2} mm²` : 'N/A'}</b></span>
                              <span>• PE: <b className="text-emerald-400">{sec.cableGaugeGroundMM2} mm²</b></span>
                            </div>
                            {sec.calculationBreakdown?.standardOriginNote && (
                              <div className="text-[10px] text-amber-300/90 bg-amber-950/30 p-1 rounded mt-1 border border-amber-900/40">
                                📌 {sec.calculationBreakdown.standardOriginNote}
                              </div>
                            )}
                          </div>

                          {/* 3. Critério de Queda de Tensão */}
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-sans font-semibold text-[11px] block">3. Critério de Queda de Tensão (NBR 5410 / NBR 17019):</span>
                            <div className={`text-[11px] font-bold ${sec.isVoltageDropCompliant ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {sec.calculationBreakdown?.formulaVoltageDrop || `ΔV = ${sec.voltageDropVolts}V (${sec.voltageDropPercent}%)`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Limite normativo do trecho: &le; 2.0% (Status: <b>{sec.isVoltageDropCompliant ? 'APROVADO' : 'REPROVADO'}</b>)
                            </div>
                          </div>

                          {/* 4. Perdas Joule nos Cabos (Efeito Joule NBR 5410) */}
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-sans font-semibold text-[11px] block">4. Perdas por Efeito Joule nos Condutores:</span>
                              <span className="text-[10px] text-amber-400 font-bold">
                                {sec.calculationBreakdown?.jouleLossesKW !== undefined ? `${sec.calculationBreakdown.jouleLossesKW} kW` : `${sec.calculationBreakdown?.jouleLossesWatts ?? 0} W`}
                                {sec.calculationBreakdown?.jouleLossesPercent !== undefined ? ` (${sec.calculationBreakdown.jouleLossesPercent}%)` : ''}
                              </span>
                            </div>
                            <div className="text-amber-300 text-[11px] font-bold">
                              {sec.calculationBreakdown?.formulaJouleLosses || `P_perda = 3 · R · I²`}
                            </div>
                            <div className="text-[10px] text-slate-400 flex flex-wrap gap-2">
                              <span>Resistência de Fase: <b className="text-white">{sec.calculationBreakdown?.cableResistanceOhm !== undefined ? `${sec.calculationBreakdown.cableResistanceOhm.toFixed(4)} Ω` : 'N/A'}</b></span>
                              <span>• Perda Total do Trecho: <b className="text-amber-400">{sec.calculationBreakdown?.jouleLossesWatts ?? 0} W</b></span>
                            </div>
                          </div>

                          {/* 5. Critério de Ocupação de Eletroduto */}
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-sans font-semibold text-[11px] block">5. Eletrodutos & Taxa de Ocupação:</span>
                            <div className="text-slate-200 text-[11px]">
                              Eletroduto: <b className="text-amber-400">{sec.conduitInches} ({sec.conduitDiameterMM}mm interno)</b>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Taxa de ocupação calculada: <b className="text-emerald-400">{sec.conduitFillingRatePercent}%</b> (&le; 40% NBR 5410)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* POPUP DE DETALHES DO TRANSFORMADOR ELEVADOR */}
                {selectedDrawerNodeId === 'transformer' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/40 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">Memorial de Dimensionamento do Transformador</span>
                      <h4 className="text-sm font-bold text-white">Transformador Elevador a Seco {transformer.nominalKVA} kVA</h4>
                      <p className="text-[11px] text-slate-400">Ligação Triângulo Dyn1 (Δ 220V primário / Y 380V secundário com Neutro acessível aterrado no BEP)</p>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-3 text-xs font-mono">
                      <h5 className="font-sans font-bold text-white text-xs border-b border-slate-800 pb-1.5 flex items-center justify-between">
                        <span>Contas e Fórmulas Passo a Passo:</span>
                        <span className="text-amber-400 text-[11px]">ABNT NBR 5356</span>
                      </h5>

                      {/* 1. Cálculo da Potência do Trafo com Opção Manual */}
                      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans font-semibold text-[11px] block">1. Potência Nominal do Trafo (kVA):</span>
                          {customTransformerKVA && (
                            <button
                              type="button"
                              onClick={() => setCustomTransformerKVA(undefined)}
                              className="text-[10px] text-amber-400 underline hover:text-amber-300"
                            >
                              Restaurar Automático
                            </button>
                          )}
                        </div>

                        {/* Input de kVA e presets comerciais */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-300">Potência:</span>
                            <input
                              type="number"
                              min="10"
                              max="1000"
                              step="5"
                              value={transformer.nominalKVA}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val > 0) setCustomTransformerKVA(val);
                              }}
                              className={`w-20 bg-slate-900 border rounded px-2 py-1 text-center font-bold text-xs ${
                                transformer.calculationBreakdown?.isOverloaded
                                  ? 'border-rose-500 text-rose-400 animate-pulse'
                                  : 'border-amber-500 text-amber-400'
                              }`}
                            />
                            <span className="text-slate-400 text-xs">kVA</span>
                          </div>

                        {/* Presets comerciais redondos */}
                          <div className="flex items-center gap-1 text-[10px]">
                            {[50, 75, 100, 150, 225].map((k) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => setCustomTransformerKVA(k)}
                                className={`px-1.5 py-0.5 rounded border transition-all ${
                                  transformer.nominalKVA === k
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                {k}kVA
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Configuração de Rendimento e Perdas Internas do Trafo */}
                        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-400 font-sans">Rendimento (η %):</span>
                              {customTransformerEfficiencyPercent !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => setTransformerEfficiencyAndLosses(undefined, customTransformerLossesKW)}
                                  className="text-[9px] text-amber-400 underline"
                                >
                                  Padrão
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="85"
                                max="99.9"
                                step="0.1"
                                placeholder="97.5"
                                value={customTransformerEfficiencyPercent ?? transformer.efficiencyPercent ?? 97.5}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setTransformerEfficiencyAndLosses(val > 0 ? val : undefined, customTransformerLossesKW);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-xs text-white"
                              />
                              <span className="text-slate-400 text-[10px] font-mono">%</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-400 font-sans">Perdas Totais (kW):</span>
                              {customTransformerLossesKW !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => setTransformerEfficiencyAndLosses(customTransformerEfficiencyPercent, undefined)}
                                  className="text-[9px] text-amber-400 underline"
                                >
                                  Padrão
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="Ex: 1.5"
                                value={customTransformerLossesKW ?? transformer.lossesKW ?? ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setTransformerEfficiencyAndLosses(customTransformerEfficiencyPercent, val > 0 ? val : undefined);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-xs text-amber-400"
                              />
                              <span className="text-slate-400 text-[10px] font-mono">kW</span>
                            </div>
                          </div>
                        </div>

                        {/* Alerta de Sobrecarga do Trafo se o usuário digitar valor inferior */}
                        {transformer.calculationBreakdown?.isOverloaded && (
                          <div className="p-2 rounded bg-rose-950/60 border border-rose-600 text-rose-300 text-[11px] space-y-1">
                            <div className="font-bold flex items-center gap-1">
                              ⚠️ ALERTA: SUBDIMENSIONAMENTO DO TRANSFORMADOR!
                            </div>
                            <div>
                              A carga necessária é de <b>{transformer.calculationBreakdown.calculatedRawKVA} kVA</b>. O valor digitado ({transformer.nominalKVA} kVA) provocará aquecimento e desarme contínuo.
                            </div>
                          </div>
                        )}

                        <div className="text-amber-400 text-[11px] font-bold">
                          {transformer.calculationBreakdown?.formulaKVA || `S = ${transformer.nominalKVA} kVA`}
                        </div>
                        {transformer.calculationBreakdown?.formulaLosses && (
                          <div className="text-emerald-400 text-[11px]">
                            {transformer.calculationBreakdown.formulaLosses}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          <div>
                            Carga nos carregadores 380V: <b>{transformer.calculationBreakdown?.totalLoadChargersKW} kW</b> | Perdas nos alimentadores: <b>{transformer.calculationBreakdown?.totalFeedersLossKW ?? 0} kW</b>
                          </div>
                          <div>
                            Potência secundária total: <b>{transformer.calculationBreakdown?.totalSecondaryPowerKW} kW</b> | Primário com perdas: <b>{transformer.calculationBreakdown?.totalPrimaryPowerKW} kW</b>
                          </div>
                        </div>
                      </div>

                      {/* 2. Correntes Primária e Secundária */}
                      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-sans font-semibold text-[11px] block">2. Correntes Nominais do Transformador:</span>
                        <div className="text-slate-200 text-[11px]">
                          • <b>Primário 220V:</b> <span className="text-amber-400 font-bold">{transformer.primaryCurrentA} A</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {transformer.calculationBreakdown?.formulaPrimaryCurrent}
                        </div>
                        <div className="text-slate-200 text-[11px] mt-1 pt-1 border-t border-slate-800/60">
                          • <b>Secundário 380V:</b> <span className="text-emerald-400 font-bold">{transformer.secondaryCurrentA} A</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {transformer.calculationBreakdown?.formulaSecondaryCurrent}
                        </div>
                      </div>

                      {/* 3. Proteções e Perdas */}
                      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-sans font-semibold text-[11px] block">3. Proteção Contra Inrush e Perdas:</span>
                        <div className="text-slate-300 text-[11px]">
                          Proteção no Primário: <b className="text-[#E45318]">Disjuntor Caixa Moldada Curva D (10x a 12x Inrush)</b>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Perdas estimadas no ferro/cobre: ~<b>{transformer.lossesKW} kW</b>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Fator K para harmônicas de retificador VE: <b>Fator K-4 Obrigatório</b>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* POPUP DE DETALHES DO PAINEL 380V */}
                {selectedDrawerNodeId === 'panel380v' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-[#00B356]/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[#00B356] font-bold">Quadro Secundário QDC-VE</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold">380V (3F+N+PE)</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">Detalhamento e Seleção de Cargas Associadas (380V)</h4>
                      <p className="text-[11px] text-slate-400">
                        {panel380V.requiresBusbar
                          ? `Barramento de cobre para ${chargers.length} circuitos com disjuntor geral de ${panel380V.mainBreakerA}A`
                          : `Configuração com 1 Carregador: 1 Único Disjuntor ${panel380V.mainBreakerA}A (Zero Barramento - Regra de Ouro)`}
                      </p>
                    </div>

                    {/* Resumo Dinâmico das Cargas Selecionadas no Painel 380V */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-sans">Potência Selecionada no Quadro:</span>
                        <strong className="text-base text-emerald-400 font-bold">{panel380VSelectedKW.toFixed(2)} kW</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-sans">Corrente Secundária (Ib @ 380V):</span>
                        <strong className="text-base text-amber-400 font-bold">{panel380VSelectedCurrentA} A</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-sans">Disjuntor Geral 380V:</span>
                        <strong className="text-base text-white font-bold">
                          {panel380V.mainBreakerA} A Tripolar
                        </strong>
                      </div>
                    </div>

                    {/* Lista Completa de Cargas Associadas no 380V com Checkboxes (Estilo Figura 05) */}
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h5 className="font-bold text-white text-xs flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-400" />
                          Relação de Cargas Associadas ao Painel 380V
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Marque/desmarque conforme Figura 05
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* 1. Carregadores VE Conectados */}
                        {chargers.map((ch, idx) => (
                          <div 
                            key={`load-380-ch-${ch.id}`}
                            onClick={() => toggleLoad380V(ch.id)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                              selectedLoads380V[ch.id] !== false 
                                ? 'bg-slate-950 border-emerald-500/50 text-white' 
                                : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedLoads380V[ch.id] !== false}
                                onChange={() => {}}
                                className="rounded accent-[#00B356] cursor-pointer"
                              />
                              <div>
                                <strong className="text-xs block">VE {idx + 1}: {ch.name} ({ch.brand})</strong>
                                <span className="text-[10px] text-slate-400 font-sans">
                                  Estação de Recarga • 380V Trifásico • DR Tipo B 30mA
                                </span>
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-xs font-bold text-emerald-400 block">{ch.powerKW.toFixed(2)} kW</span>
                              <span className="text-[10px] text-slate-400">
                                {Number(((ch.powerKW * 1000) / (Math.sqrt(3) * 380 * 0.98)).toFixed(1))} A
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* 2. Perdas nos Alimentadores dos Carregadores */}
                        <div 
                          onClick={() => toggleLoad380V('feederLosses')}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedLoads380V.feederLosses !== false 
                              ? 'bg-slate-950 border-slate-600 text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLoads380V.feederLosses !== false}
                              onChange={() => {}}
                              className="rounded accent-[#00B356] cursor-pointer"
                            />
                            <div>
                              <strong className="text-xs block">Perdas Joule nos Cabos Alimentadores (Trecho 4)</strong>
                              <span className="text-[10px] text-slate-400 font-sans">Dissipação térmica nos circuitos ramais dos carregadores</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-slate-300 block">+{breakdownCableLossesKW.toFixed(2)} kW</span>
                            <span className="text-[10px] text-slate-500">Efeito Joule</span>
                          </div>
                        </div>

                        {/* 3. Perdas Internas do Carregador */}
                        <div 
                          onClick={() => toggleLoad380V('chargerInternalLosses')}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedLoads380V.chargerInternalLosses !== false 
                              ? 'bg-slate-950 border-slate-600 text-white' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLoads380V.chargerInternalLosses !== false}
                              onChange={() => {}}
                              className="rounded accent-[#00B356] cursor-pointer"
                            />
                            <div>
                              <strong className="text-xs block">Perdas Internas do Carregador (Retificador / Datasheet)</strong>
                              <span className="text-[10px] text-slate-400 font-sans">Eletrônica de potência, ventilação e controle do totem</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-slate-300 block">+{(totalChargersKW * 0.02).toFixed(2)} kW</span>
                            <span className="text-[10px] text-slate-500">~2% interno</span>
                          </div>
                        </div>

                        {/* 4. Circuitos Customizados em 380V */}
                        {customCircuits380V.map((circ, idx) => (
                          <div 
                            key={`load-380-custom-${circ.id}`}
                            onClick={() => toggleLoad380V(`custom_${circ.id}`)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                              selectedLoads380V[`custom_${circ.id}`] !== false 
                                ? 'bg-slate-950 border-emerald-500/50 text-white' 
                                : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedLoads380V[`custom_${circ.id}`] !== false}
                                onChange={() => {}}
                                className="rounded accent-[#00B356] cursor-pointer"
                              />
                              <div>
                                <strong className="text-xs block">Circuito {idx + 1}: {circ.name}</strong>
                                <span className="text-[10px] text-slate-400 font-sans">Circuito extra 380V cadastrado</span>
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-xs font-bold text-emerald-400 block">{(circ.powerW / 1000).toFixed(2)} kW</span>
                              <span className="text-[10px] text-slate-400">{circ.breakerA} A</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Disjuntor Geral 380V:</span>
                        <span className="text-amber-400 font-bold">{panel380V.mainBreakerA} A Tripolar (Curva C)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Barramento de Cobre:</span>
                        <span className={`font-bold ${panel380V.requiresBusbar ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {panel380V.requiresBusbar ? `${panel380V.busbarRatingA} A` : 'Dispensado (1 Carregador)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DPS Proteção contra Surtos:</span>
                        <span className="text-white font-bold">Classe II Uc=385V / 40kA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dispositivo DR:</span>
                        <span className="text-emerald-400 font-bold">Tetrapolar 40A / 30mA Tipo B</span>
                      </div>
                    </div>

                    {/* Memorial de Cálculo Passo a Passo do Painel 380V (NBR 5410 & NBR 17019) */}
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 font-mono text-xs space-y-2.5">
                      <div className="text-emerald-400 font-bold font-sans text-xs flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span>Memorial de Cálculo de Dimensionamento (Painel 380V):</span>
                        <span className="text-amber-400 text-[10px]">Auditável NBR 17019</span>
                      </div>

                      <div className="space-y-2 text-[11px]">
                        {/* 1. Disjuntor Geral 380V */}
                        <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                          <strong className="text-white block font-sans">
                            1. Disjuntor Geral 380V {panel380V.calculationBreakdown?.isSingleChargerUnified ? '(Unificado - 1 Carregador)' : '(Soma de Cargas + Perdas)'}:
                          </strong>
                          <span className="text-amber-300 block leading-relaxed">
                            {panel380V.calculationBreakdown?.formulaMainBreaker || `In = ${panel380V.mainBreakerA}A Tripolar`}
                          </span>
                          <div className="text-[10px] text-slate-400 pt-1 flex flex-wrap gap-2 border-t border-slate-800/60">
                            <span>Potência Nominal Carregadores: <b>{panel380V.calculationBreakdown?.totalChargersNominalKW ?? totalChargersKW} kW</b></span>
                            <span>• Perdas Internas: <b>+{panel380V.calculationBreakdown?.totalInternalLossesKW ?? 0} kW</b></span>
                            <span>• Perdas Cabos Ramais: <b>+{panel380V.calculationBreakdown?.totalFeedersLossesKW ?? 0} kW</b></span>
                          </div>
                        </div>

                        {/* 2. Disjuntores Individuais de Cada Carregador */}
                        <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                          <strong className="text-white block font-sans">2. Dimensionamento dos Disjuntores e DRs dos Carregadores:</strong>
                          {(panel380V.individualBreakers && panel380V.individualBreakers.length > 0
                            ? panel380V.individualBreakers
                            : individualChargerBreakers
                          ).map((cb, idx) => {
                            const chRef = chargers.find(c => c.id === cb.chargerId);
                            return (
                              <div key={`brk-380-${cb.chargerId}`} className="p-1.5 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-white font-bold">{chRef?.name || `Carregador ${idx + 1}`}:</span>
                                  <span className="text-amber-400 font-bold">{cb.breakerA}A Curva {cb.curve} ({cb.poles}P) + {cb.drType}</span>
                                </div>
                                <div className="text-[10px] text-emerald-400">
                                  {cb.formulaSizing}
                                </div>
                                <div className="text-[9px] text-slate-400">
                                  Potência saída: {cb.nominalPowerKW}kW | Perdas internas retificador: {cb.internalLossesKW || 0}kW | Potência total demandada: {cb.inputPowerKW}kW
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* 3. Barramento e Seletividade */}
                        <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                          <strong className="text-white block font-sans">3. Barramento de Cobre e Esquema de Proteção:</strong>
                          <div className="text-slate-300 text-[10px]">
                            {panel380V.requiresBusbar ? (
                              <span>
                                • Barramento de Cobre Eletrolítico dimensionado para <b>{panel380V.busbarRatingA} A</b> com isoladores epóxi e pintura termocontrátil (Fases R, S, T + Neutro 100% + Terra PE).
                              </span>
                            ) : (
                              <span>
                                • <b>Barramento Dispensado (Regra NBR 17019):</b> Em instalações com 1 única estação de recarga, o condutor de alimentação conecta-se diretamente aos bornes do disjuntor de proteção do carregador, eliminando perdas por conexões intermediárias.
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            • Esquema de Aterramento: TN-S (Condutor Neutro e Condutor de Proteção PE separados após o transformador Dyn1 e equipotencializados no BEP).
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Circuitos Adicionais no Painel 380V */}
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="font-bold text-white text-xs">Circuitos Auxiliares no Painel 380V:</h4>
                        <span className="text-[10px] text-slate-400">{customCircuits380V.length} cadastrado(s)</span>
                      </div>

                      {customCircuits380V.map((circ) => (
                        <div key={circ.id} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                          <div>
                            <span className="text-white font-medium block">{circ.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {circ.powerW}W ({circ.voltageV}V) • Disj. {circ.breakerA}A • Cabo {circ.cableMM2}mm²
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomCircuit('380v', circ.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all"
                            title="Remover circuito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Formulário Inline de Adição Rápida com Categorização NBR 5410 / NBR 17019 */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const name = (form.elements.namedItem('circName380') as HTMLInputElement).value;
                          const watts = Number((form.elements.namedItem('circPower380') as HTMLInputElement).value);
                          const volt = Number((form.elements.namedItem('circVolt380') as HTMLSelectElement).value) as 220 | 380;
                          const category = (form.elements.namedItem('circCategory380') as HTMLSelectElement).value as any;
                          if (name && watts > 0) {
                            addCustomCircuit('380v', { name, powerW: watts, voltageV: volt, circuitCategory: category });
                            form.reset();
                          }
                        }}
                        className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80"
                      >
                        <select
                          name="circCategory380"
                          defaultValue="ev_charger"
                          className="w-full sm:w-44 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00B356]"
                          title="Categoria normativa do circuito (determina bitola mínima, curva e DR obrigatório)"
                        >
                          <option value="ev_charger">Carregador VE (NBR 17019 - DR B)</option>
                          <option value="outlet_tue">Tomada TUE 380V (Mín. 2.5mm² + DR)</option>
                          <option value="electronics_cctv">Painel Automação / TI (DPS III)</option>
                          <option value="custom">Geral Trifásico / Outros</option>
                        </select>
                        <input
                          name="circName380"
                          placeholder="Nome (Ex: Ar-condicionado, Painel Sec)"
                          required
                          className="flex-1 min-w-[120px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B356]"
                        />
                        <input
                          name="circPower380"
                          type="number"
                          placeholder="Potência (W)"
                          min="1"
                          required
                          className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center placeholder-slate-500 focus:outline-none focus:border-[#00B356]"
                        />
                        <select
                          name="circVolt380"
                          defaultValue="380"
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-[#00B356]"
                        >
                          <option value="380">380V (3F)</option>
                          <option value="220">220V (F-N)</option>
                        </select>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-[#00B356] hover:bg-[#009647] text-white rounded text-xs font-bold transition-all"
                        >
                          + Adicionar
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Se for um dos carregadores */}
                {chargers.find((c) => c.id === selectedDrawerNodeId) && (
                  (() => {
                    const c = chargers.find((ch) => ch.id === selectedDrawerNodeId)!;
                    const cIdx = chargers.findIndex((ch) => ch.id === selectedDrawerNodeId);
                    const feeder = sections.section4_chargersFeeders[cIdx];

                    return (
                      <div className="space-y-4">
                        <div className="bg-slate-900/90 p-3.5 rounded-xl border border-[#E45318]/40 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-[#E45318] font-bold">Estação de Recarga VE</span>
                          <h4 className="text-sm font-bold text-white">{c.name}</h4>
                          <p className="text-[11px] text-slate-400">{c.brand} • {c.powerKW} kW ({c.voltageV}V)</p>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Nome de Identificação:</label>
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => updateCharger(c.id, { name: e.target.value })}
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Potência (kW):</label>
                              <input
                                type="number"
                                value={c.powerKW}
                                onChange={(e) => updateCharger(c.id, { powerKW: Number(e.target.value) || 0 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Tensão Nominal (V):</label>
                              <select
                                value={c.voltageV}
                                onChange={(e) => updateCharger(c.id, { voltageV: Number(e.target.value) as 220 | 380 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                              >
                                <option value="220">220V</option>
                                <option value="380">380V</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Distância do Cabo (m):</label>
                              <input
                                type="number"
                                value={c.distanceMeters}
                                onChange={(e) => updateCharger(c.id, { distanceMeters: Number(e.target.value) || 0 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Margem de Erro (%):</label>
                              <input
                                type="number"
                                value={c.marginPercent}
                                onChange={(e) => updateCharger(c.id, { marginPercent: Number(e.target.value) || 0 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                              />
                            </div>
                          </div>

                          {/* Perdas Internas e Rendimento do Carregador */}
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                            <span className="text-[10px] text-slate-300 font-bold uppercase block">
                              Parâmetros de Eficiência e Perdas Internas (Datasheet / Medição):
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 text-[10px] font-sans mb-0.5">Rendimento Interno (η %):</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="70"
                                    max="99.9"
                                    step="0.1"
                                    placeholder={c.type === 'DC' ? '95.0' : '98.5'}
                                    value={c.efficiencyPercent ?? (c.type === 'DC' ? 95 : 98.5)}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      updateCharger(c.id, { efficiencyPercent: val > 0 ? val : undefined });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono text-center"
                                  />
                                  <span className="text-slate-400 text-[10px] font-mono">%</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-slate-400 text-[10px] font-sans mb-0.5">Perdas Internas (kW):</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="0.05"
                                    placeholder="Ex: 0.8"
                                    value={c.internalLossesKW ?? ''}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      updateCharger(c.id, { internalLossesKW: val > 0 ? val : undefined });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 text-xs font-mono text-center"
                                  />
                                  <span className="text-slate-400 text-[10px] font-mono">kW</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400">
                              A potência demandada da rede incorpora as perdas de conversão (P_in = P_out / η ou P_out + P_perdas).
                            </p>
                          </div>
                        </div>

                        {/* Dados Eletrotécnicos do Alimentador Individual com Memorial Completo */}
                        {feeder && (
                          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                              <h5 className="font-sans font-bold text-white text-xs">
                                Memorial de Cálculo Matemático Passo a Passo:
                              </h5>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans font-bold">
                                NBR 5410 & NBR 17019
                              </span>
                            </div>

                            {/* Verificação do Cabo Mínimo Exigido pelo Manual do Fabricante */}
                            {(() => {
                              let minManufacturerGauge = 6;
                              if (c.powerKW >= 80) minManufacturerGauge = 50;
                              else if (c.powerKW >= 60) minManufacturerGauge = 35;
                              else if (c.powerKW >= 40) minManufacturerGauge = 25;
                              else if (c.powerKW >= 30) minManufacturerGauge = 16;
                              else if (c.powerKW >= 22) minManufacturerGauge = 6;
                              else if (c.powerKW >= 7.4) minManufacturerGauge = 6;

                              const satisfiesManufacturer = feeder.cableGaugePhaseMM2 >= minManufacturerGauge;

                              return (
                                <div className="p-2 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400 font-sans font-semibold">Cabo Mínimo do Manual ({c.brand}):</span>
                                    <span className="font-bold text-amber-400">{minManufacturerGauge} mm²</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400 font-sans font-semibold">Cabo Dimensionado em Projeto:</span>
                                    <span className={`font-bold ${satisfiesManufacturer ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {feeder.cableGaugePhaseMM2} mm² {satisfiesManufacturer ? '✅ Atende' : '⚠️ Abaixo do recomendado'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Dimensionamento do Disjuntor de Proteção do Carregador (NBR 17019) */}
                            {(() => {
                              const brkInfo = individualChargerBreakers.find(b => b.chargerId === c.id);
                              return (
                                <div className="p-2.5 rounded bg-slate-950/80 border border-amber-500/30 space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-white font-sans font-bold">Disjuntor de Proteção do Carregador:</span>
                                    <span className="font-bold text-amber-400">
                                      {brkInfo ? `${brkInfo.breakerA}A Curva ${brkInfo.curve} (${brkInfo.poles}P)` : 'Dimensionado'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-emerald-400">
                                    {brkInfo?.formulaSizing}
                                  </div>
                                  <div className="text-[9px] text-slate-400 flex flex-wrap gap-2 pt-1 border-t border-slate-800/60">
                                    <span>DR Obrigatório: <b className="text-white">{brkInfo?.drType || 'Tetrapolar 40A / 30mA Tipo B'}</b></span>
                                    <span>• Perdas Internas: <b className="text-amber-300">+{brkInfo?.internalLossesKW ?? 0} kW</b></span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 1. Corrente de Projeto */}
                            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
                              <span className="text-slate-400 font-sans font-semibold text-[11px] block">1. Corrente de Projeto (Ib) e Cabo Alimentador:</span>
                              <div className="text-amber-400 text-[11px] font-bold">
                                {feeder.calculationBreakdown?.formulaDesignCurrent || `Ib = ${feeder.designCurrentA} A`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Distância: {feeder.distanceNominalM}m + {feeder.marginPercent}% folga = <b>{feeder.distanceTotalM}m</b>
                              </div>
                            </div>

                            {/* 2. Critério de Ampacidade */}
                            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
                              <span className="text-slate-400 font-sans font-semibold text-[11px] block">2. Critério de Ampacidade (NBR 5410):</span>
                              <div className="text-emerald-400 text-[11px]">
                                {feeder.calculationBreakdown?.formulaAmpacity || `Iz = ${feeder.totalAmpacityA} A ≥ Ib (${feeder.designCurrentA} A)`}
                              </div>
                              <div className="text-[10px] text-slate-300 flex flex-wrap gap-2">
                                <span>Bitola Fase: <b className="text-[#00B356]">{feeder.cableGaugePhaseMM2} mm² Cu</b></span>
                                <span>• Neutro: <b className="text-blue-400">{feeder.cableGaugeNeutralMM2 ? `${feeder.cableGaugeNeutralMM2} mm²` : 'N/A'}</b></span>
                                <span>• PE: <b className="text-emerald-400">{feeder.cableGaugeGroundMM2} mm²</b></span>
                              </div>
                            </div>

                            {/* 3. Critério de Queda de Tensão */}
                            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
                              <span className="text-slate-400 font-sans font-semibold text-[11px] block">3. Queda de Tensão (NBR 5410 / NBR 17019):</span>
                              <div className={`text-[11px] font-bold ${feeder.isVoltageDropCompliant ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {feeder.calculationBreakdown?.formulaVoltageDrop || `ΔV = ${feeder.voltageDropVolts}V (${feeder.voltageDropPercent}%)`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Limite normativo do trecho: &le; 2.0% (Status: <b>{feeder.isVoltageDropCompliant ? 'APROVADO' : 'REPROVADO'}</b>)
                              </div>
                            </div>

                            {/* 4. Perdas Joule no Cabo do Alimentador */}
                            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-sans font-semibold text-[11px] block">4. Perdas Joule no Cabo:</span>
                                <span className="text-[10px] text-amber-400 font-bold">
                                  {feeder.calculationBreakdown?.jouleLossesKW !== undefined ? `${feeder.calculationBreakdown.jouleLossesKW} kW` : `${feeder.calculationBreakdown?.jouleLossesWatts ?? 0} W`}
                                  {feeder.calculationBreakdown?.jouleLossesPercent !== undefined ? ` (${feeder.calculationBreakdown.jouleLossesPercent}%)` : ''}
                                </span>
                              </div>
                              <div className="text-amber-300 text-[11px]">
                                {feeder.calculationBreakdown?.formulaJouleLosses || `P_perda = 3 · R · I²`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Resistência: <b>{feeder.calculationBreakdown?.cableResistanceOhm !== undefined ? `${feeder.calculationBreakdown.cableResistanceOhm.toFixed(4)} Ω` : 'N/A'}</b> | Perda: <b>{feeder.calculationBreakdown?.jouleLossesWatts ?? 0} W</b>
                              </div>
                            </div>

                            {/* 5. Eletrodutos & Ocupação */}
                            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
                              <span className="text-slate-400 font-sans font-semibold text-[11px] block">5. Eletrodutos & Taxa de Ocupação:</span>
                              <div className="text-slate-200 text-[11px]">
                                Eletroduto: <b className="text-amber-400">{feeder.conduitInches} ({feeder.conduitDiameterMM}mm interno)</b>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Taxa de ocupação calculada: <b className="text-emerald-400">{feeder.conduitFillingRatePercent}%</b> (&le; 40% NBR 5410)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* POPUP COLETIVO: TRECHO 4 - TODOS OS ALIMENTADORES DOS CARREGADORES */}
                {selectedDrawerNodeId === 'trecho_4_all' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-[#00B356]/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[#00B356] font-bold">Trecho 04 • Ramais Terminais</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          {chargers.length} Circuitos Independentes
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">Alimentadores das Estações de Recarga VE</h4>
                      <p className="text-[11px] text-slate-400">
                        Cada carregador possui circuito terminal exclusivo saindo do barramento secundário 380V até o borne do equipamento, dimensionado individualmente por capacidade de condução e queda de tensão.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {chargers.map((c, idx) => {
                        const feeder = sections.section4_chargersFeeders[idx];
                        let minGauge = 6;
                        if (c.powerKW >= 80) minGauge = 50;
                        else if (c.powerKW >= 60) minGauge = 35;
                        else if (c.powerKW >= 40) minGauge = 25;
                        else if (c.powerKW >= 30) minGauge = 16;
                        else if (c.powerKW >= 22) minGauge = 6;

                        return (
                          <div key={c.id} className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                              <div>
                                <span className="text-[10px] text-[#E45318] font-bold block">{c.brand} {c.model}</span>
                                <h5 className="font-sans font-bold text-white text-xs">{c.name} ({c.powerKW} kW • {c.voltageV}V)</h5>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[11px]">
                                {c.currentInA} A
                              </span>
                            </div>

                            {feeder ? (
                              <div className="space-y-1.5 pt-1">
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                                    <span className="text-slate-400 text-[10px] block">Condutores de Fase:</span>
                                    <span className="text-emerald-400 font-bold">{feeder.cableGaugePhaseMM2} mm²</span>
                                    <span className="text-[9px] text-slate-500 block">Mín. fabr: {minGauge} mm²</span>
                                  </div>
                                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                                    <span className="text-slate-400 text-[10px] block">Eletroduto Rígido:</span>
                                    <span className="text-white font-bold">{feeder.conduitInches}</span>
                                    <span className="text-[9px] text-slate-500 block">{feeder.conduitFillingRatePercent}% preenchimento</span>
                                  </div>
                                </div>

                                <div className="bg-slate-950/40 p-2 rounded space-y-1 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Distância Total:</span>
                                    <span className="text-slate-200">{feeder.distanceTotalM} m (+{c.marginPercent}% folga)</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Queda de Tensão (ΔV):</span>
                                    <span className="text-emerald-400 font-bold">{feeder.voltageDropPercent}% ({feeder.voltageDropVolts}V)</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Perdas Joule no Cabo:</span>
                                    <span className="text-amber-400 font-bold">
                                      {feeder.calculationBreakdown?.jouleLossesKW !== undefined ? `${feeder.calculationBreakdown.jouleLossesKW} kW` : `${feeder.calculationBreakdown?.jouleLossesWatts ?? 0} W`}
                                      {feeder.calculationBreakdown?.jouleLossesPercent !== undefined ? ` (${feeder.calculationBreakdown.jouleLossesPercent}%)` : ''}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Condutor Proteção (PE):</span>
                                    <span className="text-slate-200">{feeder.cableGaugeGroundMM2} mm²</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic">Alimentador sendo calculado...</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSaveTopologyParams) {
                  onSaveTopologyParams({
                    section1DistanceM,
                    section1MarginPercent,
                    section1ConductorMaterial,
                    section1InstallationMethod,
                    section2DistanceM,
                    section2MarginPercent,
                    section2ConductorMaterial,
                    section2InstallationMethod,
                    section3DistanceM,
                    section3MarginPercent,
                    section3ConductorMaterial,
                    section3InstallationMethod,
                    customTransformerKVA,
                    customTransformerEfficiencyPercent,
                    customTransformerLossesKW
                  });
                }
                if (onConcludeTopology) {
                  onConcludeTopology();
                }
                setSelectedDrawerNodeId(null);
              }}
              className="w-full py-2.5 bg-[#E45318] hover:bg-[#c24210] text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer mt-6 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir & Recalcular Topologia</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL ADICIONAR NOVO CARREGADOR DO CATÁLOGO WEG / BENY ─────────── */}
      {showAddChargerModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0A192F] border border-slate-700 rounded-2xl p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Adicionar Estação de Recarga Homologada</h3>
                <p className="text-xs text-slate-400">Selecione um modelo oficial da WEG ou BENY para incluir na esteira</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChargerModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto mt-4 p-1">
              {HOMOLOGATED_CHARGERS.slice(0, 8).map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    addCharger({
                      name: `${cat.brand} ${cat.model}`,
                      brand: cat.brand,
                      model: cat.model,
                      powerKW: cat.powerKW,
                      phases: cat.phases,
                      voltageV: cat.voltageV,
                      currentInA: cat.currentInA,
                      connector: cat.connectorType,
                      type: cat.powerKW >= 30 ? 'DC' : 'AC',
                      distanceMeters: 15,
                      marginPercent: 10
                    });
                    setShowAddChargerModal(false);
                  }}
                  className="bg-slate-900 border border-slate-800 hover:border-[#E45318] rounded-xl p-3 cursor-pointer hover:bg-slate-800/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span className="text-[#E45318] font-bold">{cat.brand}</span>
                      <span>{cat.voltageV}V ({cat.phases === 3 ? 'Trifásico' : 'Monofásico'})</span>
                    </div>
                    <h5 className="font-bold text-xs text-white">{cat.model}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cat.series} | {cat.connectorType}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-400 font-bold">{cat.powerKW} kW</span>
                    <span className="text-slate-300">{cat.currentInA}A</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddChargerModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
