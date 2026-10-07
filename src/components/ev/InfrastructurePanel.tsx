"use client";

import React, { useState } from "react";
import { 
  Zap, Shield, Cable, Box, AlertTriangle, CheckCircle2, 
  Copy, Check, Layers, Info, ArrowRight, Gauge,
  Activity, Sliders, ToggleLeft, ToggleRight, Radio,
  Sparkles, CheckSquare, Plus, Minus, RefreshCw,
  FolderTree, Wrench, FileSpreadsheet, ShieldCheck
} from "lucide-react";
import { 
  ElectricalInfrastructureSizing, 
  BillOfMaterialItem,
  AuxiliaryCircuitsConfig,
  UtilityId 
} from "@/lib/coenergygo";
import DynamicPowerFlow from "./DynamicPowerFlow";
import ElectrotechnicalCADViewer from "./ElectrotechnicalCADViewer";

interface InfrastructurePanelProps {
  sizing: ElectricalInfrastructureSizing;
  utility?: UtilityId;
  chargerPowerKW: number;
  chargerVoltage: number;
  chargerPhases: 1 | 3;
  cableLengthMeters: number;
  chargerName?: string;
  chargerBrand?: string;
  chargerModel?: string;
  chargerCurrentInA?: number;
  chargerCount?: number;
  onUpdateAuxiliaryConfig?: (newConfig: AuxiliaryCircuitsConfig) => void;
  onSimulateChargerToggle?: (voltage: number, powerKW: number, phases: 1 | 3) => void;
}

export default function InfrastructurePanel({
  sizing,
  utility = "CEMIG",
  chargerPowerKW,
  chargerVoltage,
  chargerPhases,
  cableLengthMeters,
  chargerName,
  chargerBrand = "WEG",
  chargerModel,
  chargerCurrentInA,
  chargerCount = 1,
  onUpdateAuxiliaryConfig,
  onSimulateChargerToggle
}: InfrastructurePanelProps) {
  const [activeElectrotechnicalTab, setActiveElectrotechnicalTab] = useState<
    'fluxo_dinamico' | 'cad_unifilar' | 'paineis_segregados' | 'analise_trafo' | 'auxiliares' | 'bom'
  >('fluxo_dinamico');

  const [copiedBOM, setCopiedBOM] = useState(false);
  const [selectedBOMCategory, setSelectedBOMCategory] = useState<string>("all");
  const [activeBOMTab, setActiveBOMTab] = useState<'qgbt' | 'cemig' | 'todas'>('todas');

  const { 
    breakerTripDiagnosis, 
    transformerRecommendation, 
    transformerDetails,
    panel220VSpec,
    panel380VSpec,
    panelSpecification, 
    auxiliaryCircuits, 
    auxiliaryConfig 
  } = sizing;

  const isTrafoActive = transformerDetails.needed && transformerDetails.type === 'elevador_seco';
  const analysis = sizing.transformerBeforeAfter || transformerDetails.beforeAfterAnalysis;

  const handleToggleAux = (key: keyof AuxiliaryCircuitsConfig, value: any) => {
    if (!onUpdateAuxiliaryConfig) return;
    onUpdateAuxiliaryConfig({
      ...auxiliaryConfig,
      [key]: value
    });
  };

  const handleCopyBOM = () => {
    let text = "";
    if (activeBOMTab === 'cemig' && sizing.cemigStandardBOM && sizing.cemigStandardBOM.length > 0) {
      text = "--- LISTA DE MATERIAIS PADRÃO DE ENTRADA CEMIG (ND-5.1) ---\n" +
        sizing.cemigStandardBOM
          .map((item: any) => `[${item.categoria}] ${item.descricao} - Quantidade: ${item.quantidade} ${item.unidade} | R$ ${item.precoTotal?.toFixed(2) || '0.00'}`)
          .join("\n");
    } else if (activeBOMTab === 'qgbt') {
      text = "--- LISTA DE MATERIAIS QGBT E ALIMENTADORES INTERNOS (NBR 5410 / NBR 17019) ---\n" +
        sizing.billOfMaterials
          .map(item => `[${item.category.toUpperCase()}] ${item.description} - Quantidade: ${item.quantity} ${item.unit} | Especificação: ${item.spec} (Ref: ${item.normReference})`)
          .join("\n");
    } else {
      text = "--- LISTA CONSOLIDADA DE MATERIAIS (CEMIG + QGBT INTERNO) ---\n";
      if (sizing.cemigStandardBOM && sizing.cemigStandardBOM.length > 0) {
        text += "1. PADRÃO CEMIG:\n" + sizing.cemigStandardBOM.map((i: any) => `  * ${i.descricao} (${i.quantidade} ${i.unidade})`).join("\n") + "\n\n";
      }
      text += "2. QGBT & INFRAESTRUTURA INTERNA:\n" + sizing.billOfMaterials.map(i => `  * ${i.description} (${i.quantity} ${i.unit})`).join("\n");
    }

    navigator.clipboard.writeText(text);
    setCopiedBOM(true);
    setTimeout(() => setCopiedBOM(false), 2500);
  };

  const filteredBOM = selectedBOMCategory === "all"
    ? sizing.billOfMaterials
    : sizing.billOfMaterials.filter(i => i.category === selectedBOMCategory);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-['Montserrat',sans-serif]">
      
      {/* ─── 1. CARD DIAGNÓSTICO ENFÁTICO: O DISJUNTOR GERAL IRÁ CAIR? ─── */}
      <div className={`p-6 rounded-3xl border shadow-lg transition-all ${
        breakerTripDiagnosis.willTripWithoutDLM
          ? "bg-red-50/90 border-red-300 text-red-950"
          : "bg-emerald-50/90 border-emerald-300 text-emerald-950"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl ${
              breakerTripDiagnosis.willTripWithoutDLM ? "bg-red-600 text-white shadow-md shadow-red-500/20" : "bg-[#00B356] text-white shadow-md shadow-emerald-500/20"
            }`}>
              {breakerTripDiagnosis.willTripWithoutDLM ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  breakerTripDiagnosis.willTripWithoutDLM ? "bg-red-200 text-red-900" : "bg-emerald-200 text-emerald-900"
                }`}>
                  Diagnóstico Crítico de Operação
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  NBR 5410 & Coordenação de Proteções
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-black mt-1">
                {breakerTripDiagnosis.willTripWithoutDLM
                  ? "ATENÇÃO: O DISJUNTOR GERAL IRÁ CAIR SEM GESTÃO DE CARGA (DLM)!"
                  : "OPERACIONAL SEGURO: O DISJUNTOR GERAL NÃO IRÁ CAIR"}
              </h3>
              <p className="text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                {breakerTripDiagnosis.summaryMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 gap-1 bg-white/80 p-4 rounded-2xl border border-slate-200 shadow-sm text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Capacidade do Padrão Atual</span>
            <span className="text-lg font-black text-slate-800">
              {breakerTripDiagnosis.currentBreakerA}A ({sizing.gridHeadroomKW > 0 ? `+${sizing.gridHeadroomKW} kW folga` : `${breakerTripDiagnosis.overloadAmountKW} kW sobrecarga`})
            </span>
            <span className={`text-xs font-bold ${breakerTripDiagnosis.willTripWithoutDLM ? "text-red-600" : "text-[#00B356]"}`}>
              {breakerTripDiagnosis.willTripWithoutDLM 
                ? `Exige disjuntor de ${breakerTripDiagnosis.requiredBreakerA}A ou DLM` 
                : "Folga suficiente para recarga plena"}
            </span>
          </div>
        </div>

        {/* Parecer do DLM e Ação Corretiva */}
        <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E45318]" />
            <span className="font-semibold text-slate-700">Ação Recomendada:</span>
            <span className="text-slate-900 font-bold">{breakerTripDiagnosis.actionRequired}</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Com DLM ativo: <strong className="text-[#00B356]">Risco Zero de Desarme (Corrente Modulada 6A a 32A)</strong>
          </div>
        </div>
      </div>

      {/* ─── 2. NAVEGAÇÃO POR ABAS DO PASSO ELETROTÉCNICO ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveElectrotechnicalTab('fluxo_dinamico')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeElectrotechnicalTab === 'fluxo_dinamico'
              ? "bg-[#0A192F] text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Zap className="w-4 h-4 text-[#00B356]" />
          <span>1. Fluxo Dinâmico de Energia</span>
        </button>

        <button
          onClick={() => setActiveElectrotechnicalTab('cad_unifilar')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeElectrotechnicalTab === 'cad_unifilar'
              ? "bg-[#0A192F] text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FolderTree className="w-4 h-4 text-[#E45318]" />
          <span>2. Diagrama Unifilar & Quadros DIN</span>
        </button>

        <button
          onClick={() => setActiveElectrotechnicalTab('paineis_segregados')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeElectrotechnicalTab === 'paineis_segregados'
              ? "bg-[#0A192F] text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Shield className="w-4 h-4 text-blue-400" />
          <span>3. Painéis Segregados</span>
        </button>

        <button
          onClick={() => setActiveElectrotechnicalTab('analise_trafo')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeElectrotechnicalTab === 'analise_trafo'
              ? "bg-[#E45318] text-white shadow-md"
              : isTrafoActive
                ? "bg-orange-50 text-[#E45318] border border-orange-200 hover:bg-orange-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isTrafoActive ? "text-[#E45318]" : "text-slate-400"}`} />
          <span>4. Análise Antes & Depois do Trafo</span>
          {isTrafoActive && (
            <span className="text-[9px] bg-orange-600 text-white px-1.5 py-0.2 rounded-full font-black">
              {transformerDetails.nominalKVA} kVA
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveElectrotechnicalTab('auxiliares')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeElectrotechnicalTab === 'auxiliares'
              ? "bg-[#0A192F] text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>5. Circuitos Auxiliares</span>
        </button>

        <button
          onClick={() => setActiveElectrotechnicalTab('bom')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeElectrotechnicalTab === 'bom'
              ? "bg-[#0A192F] text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>6. Lista Quantitativa (BOM)</span>
        </button>
      </div>

      {/* ─── CONTEÚDO DA ABA 1: FLUXO DINÂMICO DE ENERGIA ─── */}
      {activeElectrotechnicalTab === 'fluxo_dinamico' && (
        <DynamicPowerFlow
          sizing={sizing}
          utility={utility}
          chargerPowerKW={chargerPowerKW}
          chargerVoltage={chargerVoltage}
          chargerPhases={chargerPhases}
          chargerBrand={chargerBrand}
          chargerModel={chargerModel}
          cableLengthMeters={cableLengthMeters}
          onSimulateChargerToggle={onSimulateChargerToggle}
        />
      )}

      {/* ─── CONTEÚDO DA ABA 2: DIAGRAMA UNIFILAR & QUADROS DIN ─── */}
      {activeElectrotechnicalTab === 'cad_unifilar' && (
        <ElectrotechnicalCADViewer
          sizing={sizing}
          utility={utility}
          chargerPowerKW={chargerPowerKW}
          chargerVoltage={chargerVoltage}
          chargerPhases={chargerPhases}
          chargerBrand={chargerBrand}
          chargerModel={chargerModel}
          cableLengthMeters={cableLengthMeters}
        />
      )}

      {/* ─── CONTEÚDO DA ABA 3: PAINÉIS SEGREGADOS LADO 220V & LADO 380V ─── */}
      {activeElectrotechnicalTab === 'paineis_segregados' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Card Resumo da Arquitetura Segregada */}
          <div className="bg-gradient-to-br from-[#0A192F] to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00B356] bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  Segregação Normativa de Baixa Tensão
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white mt-1.5">
                  {isTrafoActive 
                    ? "Arquitetura com Painel Lado 220V + Transformador Elevador + Painel Lado 380V" 
                    : "Arquitetura com Quadro Geral Unificado 220V (Sem Necessidade de Trafo)"}
                </h3>
                <p className="text-xs text-slate-300">
                  {isTrafoActive
                    ? "Separação física e elétrica para garantir isolação de transitórios, proteção contra inrush no primário e atendimento à NBR 17019 com DR Tipo B no secundário."
                    : "A alimentação direta a partir da rede 220V elimina perdas magnéticas e custos adicionais com transformadores desnecessários."}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Disjuntor Primário 220V</span>
                  <span className="text-lg font-black text-white">{panel220VSpec.mainBreakerA}A Curva {panel220VSpec.mainBreakerCurve}</span>
                </div>
                {isTrafoActive && (
                  <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Secundário 380V</span>
                    <span className="text-lg font-black text-[#00B356]">{panel380VSpec.mainBreakerA}A 3P</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid dos Blocos dos Painéis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Painel 1: Lado 220V */}
              <div className="bg-slate-800/70 p-5 rounded-2xl border border-blue-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{panel220VSpec.name}</h4>
                      <p className="text-[10px] text-slate-400">Tensão Nominal: 220V ({panel220VSpec.phases}F)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-800">
                    Lado 220V
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-2">
                  <p>• Disjuntor Geral: <strong className="text-white">{panel220VSpec.mainBreakerA}A Curva {panel220VSpec.mainBreakerCurve}</strong> ({panel220VSpec.mainBreakerCurve === 'D' ? 'Suporte a inrush do trafo' : 'Proteção termomagnética'})</p>
                  <p>• Barramento de Cobre: <strong className="text-white">{panel220VSpec.busbarRatingA}A</strong></p>
                  <p>• Proteção contra Surtos: <strong className="text-emerald-400">{panel220VSpec.dpsSpec}</strong></p>
                  <p>• Condutor Alimentador: <strong className="text-white">{panel220VSpec.cableGaugeMM2} mm²</strong></p>
                  <p>• Gabinete DIN: <strong className="text-white">{panel220VSpec.dinModulesCount} módulos ({sizing.panelSpecification.ipRating})</strong></p>
                  <p>• Circuitos Auxiliares: <strong className="text-white">{panel220VSpec.circuitsCount} circuitos integrados</strong></p>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60 leading-relaxed">
                  {panel220VSpec.description}
                </p>
              </div>

              {/* Painel 2: Lado 380V (ou Card Informativo de Dispensa) */}
              {isTrafoActive ? (
                <div className="bg-slate-800/70 p-5 rounded-2xl border border-orange-500/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-orange-500/20 text-[#E45318]">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{panel380VSpec.name}</h4>
                        <p className="text-[10px] text-slate-400">Tensão Nominal: 380V (3F + N + PE)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-orange-400 bg-orange-950 px-2.5 py-0.5 rounded-full border border-orange-800">
                      Lado 380V VE
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-2">
                    <p>• Disjuntor Geral Secundário: <strong className="text-white">{panel380VSpec.mainBreakerA}A 3P Curva C</strong></p>
                    <p>• Disjuntor Terminal VE: <strong className="text-orange-300">{panel380VSpec.terminalBreakerA}A 3P Curva C</strong></p>
                    <p>• Dispositivo DR Compulsório: <strong className="text-emerald-400">{panel380VSpec.drType}</strong></p>
                    <p>• Proteção contra Surtos: <strong className="text-white">{panel380VSpec.dpsSpec}</strong></p>
                    <p>• Esquema de Aterramento: <strong className="text-emerald-300">{panel380VSpec.groundingSystem}</strong></p>
                    <p>• Barramento de Potência VE: <strong className="text-white">{panel380VSpec.busbarRatingA}A</strong></p>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60 leading-relaxed">
                    {panel380VSpec.description}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-dashed border-slate-700 flex flex-col justify-center space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <h4 className="text-sm font-black text-white">Painel 380V Dispensado</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Como o carregador opera em 220V ({chargerPowerKW} kW), a alimentação é feita diretamente a partir do Painel 220V. Não há barramento ou painel de 380V nesta instalação.
                  </p>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>• Disjuntor terminal VE: <strong>{sizing.recommendedBreakerA}A Curva C (220V)</strong></p>
                    <p>• Proteção DR: <strong>{sizing.residualCurrentProtection.name}</strong></p>
                    <p>• Instalação mais compacta e de menor custo de implantação.</p>
                  </div>
                </div>
              )}
            </div>

            {isTrafoActive && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveElectrotechnicalTab('analise_trafo')}
                  className="bg-[#E45318] hover:bg-[#d0450d] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ver Análise Eletrotécnica Completa Antes e Depois do Transformador ➔</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CONTEÚDO DA ABA 4: ANÁLISE COMPARATIVA ANTES & DEPOIS DO TRANSFORMADOR ─── */}
      {activeElectrotechnicalTab === 'analise_trafo' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-[#0A192F] to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-950/80 border border-orange-800 px-2.5 py-0.5 rounded-full">
                    Engenharia Eletrotécnica • NBR 5410 & NBR 17019
                  </span>
                  <span className="text-xs text-slate-400">CEMIG 127/220V ➔ Estação 380V</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white mt-1.5 flex items-center gap-2.5">
                  <RefreshCw className="w-6 h-6 text-[#E45318]" />
                  Análise Comparativa: Antes e Depois do Transformador Elevador
                </h3>
                <p className="text-xs text-slate-300">
                  {isTrafoActive
                    ? "Detalhamento das grandezas de entrada (lado 220V primário), parâmetros do transformador a seco e grandezas de saída (lado 380V secundário com neutro TN-S)."
                    : "Diagnóstico de compatibilidade de tensão direta da rede da concessionária sem necessidade de transformador."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  isTrafoActive
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}>
                  {isTrafoActive ? `Transformador de ${transformerDetails.nominalKVA} kVA Ativo` : "Alimentação 220V Direta"}
                </span>
              </div>
            </div>

            {isTrafoActive && analysis ? (
              <>
                {/* Comparativo em 3 Colunas: Antes, Equipamento, Depois */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Coluna 1: ANTES DO TRAFO (Lado Primário 220V Δ) */}
                  <div className="bg-slate-800/80 p-5 rounded-2xl border-2 border-orange-500/50 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">
                          Lado Primário
                        </span>
                        <h4 className="text-sm font-black text-white">1. Antes do Trafo (220V)</h4>
                      </div>
                      <span className="text-[10px] font-bold bg-orange-950 text-orange-300 px-2 py-0.5 rounded-md border border-orange-800">
                        {analysis.primary.connection}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Tensão Nominal:</span>
                        <strong className="text-white">{analysis.primary.voltageV}V Trifásico Δ (F-F)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Corrente Nominal I₁:</span>
                        <strong className="text-orange-300 font-bold">{analysis.primary.nominalCurrentA} A</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Inrush de Magnetização:</span>
                        <strong className="text-amber-400 font-bold">~{analysis.primary.inrushCurrentA} A (8.5× In)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Disjuntor Primário:</span>
                        <strong className="text-white font-bold">{analysis.primary.breakerRatingA}A Curva {analysis.primary.breakerCurve} (3P)</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-orange-950/60 border border-orange-800/60 text-[11px] text-orange-200 leading-tight">
                        ⚡ <strong>Curva D Obrigatória:</strong> Suporta a corrente transitória de inrush da energização a frio do núcleo sem provocar o desarme do disjuntor.
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Condutor do Primário:</span>
                        <strong className="text-white font-bold">{analysis.primary.cableGaugePhaseMM2} mm² de Cobre</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Queda de Tensão ΔV₁:</span>
                        <strong className="text-emerald-400 font-bold">{analysis.primary.voltageDropPercent}% ({analysis.primary.voltageDropVolts}V)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Proteção contra Surtos (DPS):</span>
                        <strong className="text-blue-300 font-bold">Uc {analysis.primary.dpsUcVolts}V Cl. II (3P)</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Icc Presumido da Rede:</span>
                        <strong className="text-slate-300 font-mono">~{analysis.primary.shortCircuitCurrentKA} kA</strong>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: O TRANSFORMADOR ELEVADOR */}
                  <div className="bg-slate-800/80 p-5 rounded-2xl border-2 border-slate-600 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Equipamento
                        </span>
                        <h4 className="text-sm font-black text-white">2. Transformador Elevador</h4>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-700 text-white px-2 py-0.5 rounded-md border border-slate-600">
                        {analysis.transformer.nominalKVA} kVA
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Grupo de Ligação:</span>
                        <strong className="text-white font-mono text-[11px]">{analysis.transformer.connectionGroup}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Rendimento Energético:</span>
                        <strong className="text-emerald-400 font-bold">{analysis.transformer.efficiencyPercent}%</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Perdas Estimadas (Vazio+Carga):</span>
                        <strong className="text-amber-400 font-bold">{analysis.transformer.lossesKW} kW</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Impedância de Curto Zcc:</span>
                        <strong className="text-white font-bold">{analysis.transformer.impedanceZccPercent}%</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Classe Térmica / Isolação:</span>
                        <strong className="text-slate-200">{analysis.transformer.isolationClass}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Tipo de Refrigeração:</span>
                        <strong className="text-slate-200">{analysis.transformer.coolingType}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Grau de Proteção Invólucro:</span>
                        <strong className="text-slate-200">{analysis.transformer.ipRating}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-[10px] text-slate-300">
                        Conformidade: {analysis.transformer.standards.join(' • ')}
                      </div>
                    </div>
                  </div>

                  {/* Coluna 3: DEPOIS DO TRAFO (Lado Secundário 380V Y) */}
                  <div className="bg-slate-800/80 p-5 rounded-2xl border-2 border-emerald-500/50 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                          Lado Secundário
                        </span>
                        <h4 className="text-sm font-black text-white">3. Depois do Trafo (380V)</h4>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800">
                        {analysis.secondary.connection}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Tensão de Alimentação VE:</span>
                        <strong className="text-white">{analysis.secondary.voltageV}V / 220V (3F + N)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Corrente Nominal I₂:</span>
                        <strong className="text-emerald-300 font-bold">{analysis.secondary.nominalCurrentA} A</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Disjuntor Terminal VE:</span>
                        <strong className="text-white font-bold">{analysis.secondary.breakerRatingA}A Curva {analysis.secondary.breakerCurve} (4P)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Proteção Diferencial DR:</span>
                        <strong className="text-emerald-400 font-bold">DR 30mA Tipo B</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-200 leading-tight">
                        🛡️ <strong>DR Tipo B Compulsório (NBR 17019):</strong> Detecta correntes residuais contínuas (CC até 6mA) oriundas da eletrônica de potência do inversor do veículo.
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Cabo até o Carregador:</span>
                        <strong className="text-white font-bold">{analysis.secondary.cableGaugePhaseMM2} mm² (3F+N+PE)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Queda de Tensão ΔV₂:</span>
                        <strong className="text-emerald-400 font-bold">{analysis.secondary.voltageDropPercent}% ({analysis.secondary.voltageDropVolts}V)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">DPS Secundário:</span>
                        <strong className="text-orange-300 font-bold">Uc {analysis.secondary.dpsUcVolts}V (4P: 3F+N)</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Icc₂ Limitado pelo Trafo:</span>
                        <strong className="text-slate-300 font-mono">~{analysis.secondary.shortCircuitCurrentKA} kA</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner de Aterramento e Sistema TN-S */}
                <div className="bg-emerald-950/50 border border-emerald-500/40 p-5 rounded-2xl flex items-start gap-3.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-xs">
                    <h5 className="text-sm font-bold text-emerald-300">
                      {analysis.neutralGroundingCompliance.standard} — Sistema {analysis.neutralGroundingCompliance.system}
                    </h5>
                    <p className="text-emerald-100 leading-relaxed">
                      {analysis.neutralGroundingCompliance.description}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <h4 className="text-base font-bold text-white">Alimentação Direta 220V da Rede — Sem Necessidade de Transformador Elevador</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O carregador selecionado opera em {chargerVoltage}V ({chargerPowerKW} kW), atendendo diretamente ao fornecimento em Baixa Tensão da CEMIG. A eliminação do transformador economiza espaço físico no local, elimina perdas magnéticas em vazio e sob carga (~0.55 kW) e reduz significativamente o investimento inicial do cliente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CONTEÚDO DA ABA 5: CIRCUITOS AUXILIARES DO QGBT ─── */}
      {activeElectrotechnicalTab === 'auxiliares' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                  Lado 220V do Painel
                </span>
                <span className="text-xs font-semibold text-slate-400">NBR 5410</span>
              </div>
              <h4 className="text-base font-black text-slate-800 mt-1 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#E45318]" />
                Configuração dos Circuitos Auxiliares e Derivações do QGBT
              </h4>
              <p className="text-xs text-slate-500">
                Personalize os disjuntores e cargas acessórias integradas no painel do eletroposto ou condomínio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Toggle 1: Tomadas de Manutenção */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#E45318]" />
                  <span className="text-xs font-bold text-slate-800">Tomadas de Serviço (220V 20A)</span>
                </div>
                <button
                  onClick={() => handleToggleAux('enableOutlets', !auxiliaryConfig.enableOutlets)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    auxiliaryConfig.enableOutlets ? "bg-[#00B356] text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {auxiliaryConfig.enableOutlets ? "Ativo" : "Inativo"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                TUGs para manutenção, testes e ferramentas elétricas com disjuntor 20A e DR 30mA.
              </p>
              {auxiliaryConfig.enableOutlets && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">Quantidade de Pontos:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAux('outletsCount', Math.max(1, auxiliaryConfig.outletsCount - 1))}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-slate-900">{auxiliaryConfig.outletsCount}</span>
                    <button
                      onClick={() => handleToggleAux('outletsCount', Math.min(8, auxiliaryConfig.outletsCount + 1))}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle 2: Iluminação Pátio */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800">Iluminação Pátio / Canopy</span>
                </div>
                <button
                  onClick={() => handleToggleAux('enableLighting', !auxiliaryConfig.enableLighting)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    auxiliaryConfig.enableLighting ? "bg-[#00B356] text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {auxiliaryConfig.enableLighting ? "Ativo" : "Inativo"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Refletores LED e luminárias sob a cobertura de recarga com disjuntor 10A Curva B.
              </p>
              {auxiliaryConfig.enableLighting && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">Potência Total LED:</span>
                  <select
                    value={auxiliaryConfig.lightingPowerW}
                    onChange={(e) => handleToggleAux('lightingPowerW', Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800"
                  >
                    <option value={400}>400 W (2x 200W LED)</option>
                    <option value={800}>800 W (4x 200W LED)</option>
                    <option value={1200}>1200 W (6x 200W LED)</option>
                    <option value={2000}>2000 W (Posto Médio)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Toggle 3: CFTV, Telecom, Wi-Fi */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-800">CFTV, Telecom & Totem</span>
                </div>
                <button
                  onClick={() => handleToggleAux('enableCCTV', !auxiliaryConfig.enableCCTV)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    auxiliaryConfig.enableCCTV ? "bg-[#00B356] text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {auxiliaryConfig.enableCCTV ? "Ativo" : "Inativo"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Câmeras IP, switch PoE, roteador 4G/Wi-Fi e totem de pagamento com DPS fino Classe III.
              </p>
              {auxiliaryConfig.enableCCTV && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">Potência Estimada:</span>
                  <span className="font-bold text-slate-800">{auxiliaryConfig.cctvPowerW} W (Disj. 16A)</span>
                </div>
              )}
            </div>

            {/* Toggle 4: Derivação de Carga do Cliente */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cable className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800">Derivação Carga Cliente</span>
                </div>
                <button
                  onClick={() => handleToggleAux('enableCustomerTap', !auxiliaryConfig.enableCustomerTap)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    auxiliaryConfig.enableCustomerTap ? "bg-[#00B356] text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {auxiliaryConfig.enableCustomerTap ? "Ativo" : "Inativo"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Alimentador secundário para o subquadro do imóvel ou loja de conveniência.
              </p>
              {auxiliaryConfig.enableCustomerTap && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">Demanda Derivada:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={auxiliaryConfig.customerTapPowerKW}
                      onChange={(e) => handleToggleAux('customerTapPowerKW', Math.max(0, Number(e.target.value)))}
                      className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 text-right"
                    />
                    <span className="text-xs font-bold text-slate-500">kW</span>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle 5: Multimedidor Digital Modbus */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00B356]" />
                  <span className="text-xs font-bold text-slate-800">Multimedidor Modbus</span>
                </div>
                <button
                  onClick={() => handleToggleAux('enableEnergyMeter', !auxiliaryConfig.enableEnergyMeter)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    auxiliaryConfig.enableEnergyMeter ? "bg-[#00B356] text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {auxiliaryConfig.enableEnergyMeter ? "Ativo" : "Inativo"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Medição direta/indireta de grandezas elétricas para rateio de energia e telemetria DLM.
              </p>
              {auxiliaryConfig.enableEnergyMeter && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-bold text-[#00B356]">Modbus RS485 Ativo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTEÚDO DA ABA 5: LISTA DE MATERIAIS QUANTITATIVA (BOM) ─── */}
      {activeElectrotechnicalTab === 'bom' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#E45318]" />
                Lista de Materiais Quantitativa (BOM) & Padrão {utility}
              </h4>
              <p className="text-xs text-slate-500">
                Engenharia completa: materiais normatizados da concessionária, transformador (se houver) e do quadro interno QGBT.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyBOM}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedBOM ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedBOM ? "Copiado!" : "Copiar Lista"}
              </button>
            </div>
          </div>

          {/* Abas da Lista de Materiais */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveBOMTab('todas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeBOMTab === 'todas'
                  ? "bg-[#0A192F] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Lista Geral Consolidada
            </button>
            <button
              onClick={() => setActiveBOMTab('cemig')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBOMTab === 'cemig'
                  ? "bg-[#E45318] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Padrão {utility} Oficial</span>
              {sizing.cemigStandardBOM && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {sizing.cemigStandardBOM.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveBOMTab('qgbt')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBOMTab === 'qgbt'
                  ? "bg-[#00B356] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>QGBT & Infraestrutura Interna</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {sizing.billOfMaterials.length}
              </span>
            </button>
          </div>

          {/* Filtro de Categoria da BOM Interna */}
          {activeBOMTab !== 'cemig' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-400 font-bold mr-1 text-[11px]">Filtrar:</span>
              {[
                { id: 'all', label: 'Todos os Itens' },
                { id: 'protecao', label: 'Proteções (Disjuntores/DPS/DR)' },
                { id: 'condutores', label: 'Condutores de Cobre' },
                { id: 'quadro', label: 'Quadros DIN' },
                { id: 'infraestrutura', label: 'Infraestrutura & Trafo' },
                { id: 'medicao', label: 'Medição & DLM' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedBOMCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedBOMCategory === cat.id
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Tabela da BOM */}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {/* Se aba for Padrão Concessionária ou Consolidada */}
                {(activeBOMTab === 'cemig' || activeBOMTab === 'todas') && sizing.cemigStandardBOM && sizing.cemigStandardBOM.map((item: any, idx: number) => (
                  <tr key={`cemig-${idx}`} className="hover:bg-orange-50/40 transition-colors bg-orange-50/15">
                    <td className="p-3 font-bold text-orange-900">CEMIG-{idx + 1}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 uppercase">
                        {item.categoria || 'PADRÃO'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{item.descricao}</td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {item.especificacao || `Padrão Homologado ND-5.1 (${item.codigoCemig || 'CEMIG'})`}
                    </td>
                    <td className="p-3 text-center font-bold">{item.quantidade}</td>
                    <td className="p-3 text-center text-slate-400">{item.unidade}</td>
                  </tr>
                ))}

                {/* Se aba for QGBT Interno ou Consolidada */}
                {(activeBOMTab === 'qgbt' || activeBOMTab === 'todas') && filteredBOM.map((item, idx) => (
                  <tr key={`qgbt-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{item.description}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{item.spec} ({item.normReference})</td>
                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                    <td className="p-3 text-center text-slate-400">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
