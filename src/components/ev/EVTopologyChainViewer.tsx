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
  onUpdateChargerPower
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
    section2DistanceM,
    section2MarginPercent,
    section2ConductorMaterial,
    section3DistanceM,
    section3MarginPercent,
    section3ConductorMaterial,
    auxiliaryConfig,
    customTransformerKVA,
    customCircuits220V,
    customCircuits380V,
    selectedDrawerNodeId,
    topologyOutput,
    syncFromProjectData,
    setCustomTransformerKVA,
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

  const {
    standardAlert,
    panel220V,
    transformer,
    panel380V,
    sections,
    totalBOM
  } = topologyOutput;

  const totalChargersKW = chargers.reduce((sum, c) => sum + c.powerKW, 0);

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
          <h2 className="text-2xl font-bold text-white mt-1">
            Esteira Eletrotécnica de Recarga EV
          </h2>
          <p className="text-sm text-slate-400">
            Arraste, adicione ou clique em cada bloco para configurar disjuntores, barramentos, trafo e condutores.
          </p>
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

          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-300">
            <span>Cliente Base: <b>{standardAlert.clientBaseLoadKW} kW</b></span>
            <span>+ Hub VE & Aux: <b>{standardAlert.hubAdditionalLoadKW} kW</b></span>
            <span>= Demanda Total: <b className={standardAlert.isOverloaded ? 'text-rose-400' : 'text-emerald-400'}>{standardAlert.totalRequiredLoadKW} kW</b></span>
            {standardAlert.isOverloaded && (
              <span className="text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-600/40">
                Padrão Sugerido: <b>{standardAlert.recommendedCategory} ({standardAlert.recommendedBreakerA}A)</b>
              </span>
            )}
          </div>
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
                  <span>Cargas Auxiliares</span>
                  <span className={`font-mono font-bold ${panel220V.totalAuxKW > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {panel220V.totalAuxKW.toFixed(2)} kW
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
                      <span>Barramento de Cobre</span>
                      <span className={`font-mono font-bold ${panel380V.requiresBusbar ? 'text-amber-400' : 'text-slate-500'}`}>
                        {panel380V.requiresBusbar ? `${panel380V.busbarRatingA}A` : 'Não Requerido'}
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

                        {/* Seletor rápido de Potência (Aumentar / Diminuir kW) */}
                        <div className="flex items-center gap-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-700/80" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              const step = charger.powerKW > 30 ? 10 : 3.7;
                              const newP = Math.max(3.7, Number((charger.powerKW - step).toFixed(1)));
                              updateCharger(charger.id, { powerKW: newP });
                              if (onUpdateChargerPower) {
                                onUpdateChargerPower(charger.id, newP);
                              }
                            }}
                            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold transition-all cursor-pointer"
                            title="Diminuir potência"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-mono font-bold text-amber-400 min-w-[40px] text-center">
                            {charger.powerKW} kW
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const step = charger.powerKW >= 30 ? 10 : 3.7;
                              const newP = Math.min(240, Number((charger.powerKW + step).toFixed(1)));
                              updateCharger(charger.id, { powerKW: newP });
                              if (onUpdateChargerPower) {
                                onUpdateChargerPower(charger.id, newP);
                              }
                            }}
                            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold transition-all cursor-pointer"
                            title="Aumentar potência"
                          >
                            +
                          </button>
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

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Cabo Sugerido</span>
                      <span className="font-mono font-bold text-amber-400">
                        {sections.section4_chargersFeeders[idx]?.cableGaugePhaseMM2 || 6}mm² (ΔV {sections.section4_chargersFeeders[idx]?.voltageDropPercent || 0.5}%)
                      </span>
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
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Lista Quantitativa de Materiais (BOM)</h3>
              <p className="text-xs text-slate-400">Consolidado automático NBR 5410 com margens de cabo e especificações de quadros</p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-[#E45318]/20 text-[#E45318] border border-[#E45318]/30 rounded-lg">
              {totalBOM.length} Itens Dimensionados
            </span>
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
                {totalBOM.map((item) => (
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
                          <option value="F7">F7 — Alta Demanda 228 kVA / Disjuntor 630A (TC 600/5)</option>
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
                    <p className="text-slate-400 leading-relaxed">
                      O Painel 220V abriga a proteção primária e as cargas auxiliares dedicadas do Hub de recarga.
                    </p>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-3">
                      <h4 className="font-bold text-white text-xs">Cargas Auxiliares Selecionáveis:</h4>
                      
                      {/* CFTV */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={auxiliaryConfig.cctvEnabled}
                            onChange={(e) => updateAuxiliaryConfig({ cctvEnabled: e.target.checked })}
                            className="rounded accent-[#E45318]"
                          />
                          <span className={auxiliaryConfig.cctvEnabled ? 'text-white' : 'text-slate-500'}>
                            CFTV & Wi-Fi (127V mono)
                          </span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            disabled={!auxiliaryConfig.cctvEnabled}
                            value={auxiliaryConfig.cctvPowerW}
                            onChange={(e) => updateAuxiliaryConfig({ cctvPowerW: Number(e.target.value) || 0 })}
                            className={`w-16 bg-slate-800 border border-slate-700 rounded px-1 text-center font-mono ${
                              auxiliaryConfig.cctvEnabled ? 'text-white' : 'text-slate-600 opacity-50'
                            }`}
                          />
                          <span className="text-slate-400">W</span>
                        </div>
                      </div>

                      {/* Tomada de Manutenção */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={auxiliaryConfig.outletEnabled}
                            onChange={(e) => updateAuxiliaryConfig({ outletEnabled: e.target.checked })}
                            className="rounded accent-[#E45318]"
                          />
                          <span className={auxiliaryConfig.outletEnabled ? 'text-white' : 'text-slate-500'}>
                            Tomada Manutenção 20A (127V)
                          </span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            disabled={!auxiliaryConfig.outletEnabled}
                            value={auxiliaryConfig.outletPowerW}
                            onChange={(e) => updateAuxiliaryConfig({ outletPowerW: Number(e.target.value) || 0 })}
                            className={`w-16 bg-slate-800 border border-slate-700 rounded px-1 text-center font-mono ${
                              auxiliaryConfig.outletEnabled ? 'text-white' : 'text-slate-600 opacity-50'
                            }`}
                          />
                          <span className="text-slate-400">W</span>
                        </div>
                      </div>

                      {/* Iluminação */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={auxiliaryConfig.lightingEnabled}
                            onChange={(e) => updateAuxiliaryConfig({ lightingEnabled: e.target.checked })}
                            className="rounded accent-[#E45318]"
                          />
                          <span className={auxiliaryConfig.lightingEnabled ? 'text-white' : 'text-slate-500'}>
                            Iluminação LED Pátio
                          </span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            disabled={!auxiliaryConfig.lightingEnabled}
                            value={auxiliaryConfig.lightingPowerW}
                            onChange={(e) => updateAuxiliaryConfig({ lightingPowerW: Number(e.target.value) || 0 })}
                            className={`w-16 bg-slate-800 border border-slate-700 rounded px-1 text-center font-mono ${
                              auxiliaryConfig.lightingEnabled ? 'text-white' : 'text-slate-600 opacity-50'
                            }`}
                          />
                          <span className="text-slate-400">W</span>
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

                      {/* Formulário Inline de Adição Rápida */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const name = (form.elements.namedItem('circName') as HTMLInputElement).value;
                          const watts = Number((form.elements.namedItem('circPower') as HTMLInputElement).value);
                          const volt = Number((form.elements.namedItem('circVolt') as HTMLSelectElement).value) as 127 | 220;
                          if (name && watts > 0) {
                            addCustomCircuit('220v', { name, powerW: watts, voltageV: volt });
                            form.reset();
                          }
                        }}
                        className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80"
                      >
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

                    <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60 font-mono text-[11px] space-y-1">
                      <div className="text-emerald-400 font-bold">Medidor Exclusivo do Hub: Ativo</div>
                      <div className="text-slate-300">Agrega apenas: Trafo/VEs + Cargas Auxiliares ({panel220V.totalAuxKW} kW)</div>
                      <div className="text-slate-500">Disjuntor Geral 220V: {panel220V.mainBreakerA}A (Curva {panel220V.mainBreakerCurve})</div>
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

                          {/* 4. Critério de Ocupação de Eletroduto */}
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-sans font-semibold text-[11px] block">4. Eletrodutos & Taxa de Ocupação:</span>
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
                        <div className="text-[10px] text-slate-400">
                          Carga total dos carregadores 380V: <b>{transformer.calculationBreakdown?.totalLoadChargersKW} kW</b> | cos φ = 0.98 | η = 0.97 | Margem recomendada: +15%
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
                      <span className="text-[10px] font-mono uppercase text-[#00B356] font-bold">Quadro de Distribuição</span>
                      <h4 className="text-sm font-bold text-white">Painel de Proteção Secundário 380V</h4>
                      <p className="text-[11px] text-slate-400">
                        {panel380V.requiresBusbar
                          ? `Barramento de cobre para ${chargers.length} circuitos com disjuntor geral de ${panel380V.mainBreakerA}A`
                          : `Configuração com 1 Carregador: 1 Único Disjuntor ${panel380V.mainBreakerA}A (Zero Barramento)`}
                      </p>
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

                      {/* Formulário Inline de Adição Rápida */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const name = (form.elements.namedItem('circName380') as HTMLInputElement).value;
                          const watts = Number((form.elements.namedItem('circPower380') as HTMLInputElement).value);
                          const volt = Number((form.elements.namedItem('circVolt380') as HTMLSelectElement).value) as 220 | 380;
                          if (name && watts > 0) {
                            addCustomCircuit('380v', { name, powerW: watts, voltageV: volt });
                            form.reset();
                          }
                        }}
                        className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80"
                      >
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
                        </div>

                        {/* Dados Eletrotécnicos do Alimentador Individual */}
                        {feeder && (
                          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                              <h5 className="font-sans font-bold text-white text-xs">
                                Memorial Alimentador Individual (Trecho 4):
                              </h5>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans font-bold">
                                Conforme NBR 5410 & Fabricante
                              </span>
                            </div>

                            {/* Verificação do Cabo Mínimo Exigido pelo Manual do Fabricante */}
                            {(() => {
                              // Requisitos típicos de manual de instalação (ex: WEG WEMOB / BENY)
                              let minManufacturerGauge = 6; // default 7.4kW / 22kW
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
                                  <p className="text-[10px] text-slate-400 font-sans">
                                    {satisfiesManufacturer
                                      ? `O condutor projetado (${feeder.cableGaugePhaseMM2} mm²) é compatível ou superior à bitola mínima de ${minManufacturerGauge} mm² exigida pelo fabricante para garantia do equipamento.`
                                      : `Atenção: O fabricante exige bitola mínima de ${minManufacturerGauge} mm² nos bornes de conexão.`}
                                  </p>
                                </div>
                              );
                            })()}

                            <div className="flex justify-between">
                              <span className="text-slate-400">Distância Total (+margem):</span>
                              <span className="text-white font-bold">{feeder.distanceTotalM} m</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Corrente de Entrada (In):</span>
                              <span className="text-amber-400 font-bold">{feeder.designCurrentA} A</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Cabo de Fase Recomendado:</span>
                              <span className="text-emerald-400 font-bold">{feeder.cableGaugePhaseMM2} mm²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Condutor Proteção (PE):</span>
                              <span className="text-emerald-400 font-bold">{feeder.cableGaugeGroundMM2} mm²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Queda de Tensão (ΔV):</span>
                              <span className="text-emerald-400 font-bold">{feeder.voltageDropPercent}% ({feeder.voltageDropVolts}V)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Eletroduto & Ocupação:</span>
                              <span className="text-white font-bold">{feeder.conduitInches} ({feeder.conduitFillingRatePercent}% ocup.)</span>
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
              onClick={() => setSelectedDrawerNodeId(null)}
              className="w-full py-2.5 bg-[#E45318] hover:bg-[#c24210] text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer mt-6"
            >
              Concluir & Recalcular Topologia
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
