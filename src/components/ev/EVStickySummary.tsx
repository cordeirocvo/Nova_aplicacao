"use client";

import React, { useState } from "react";
import { 
  Zap, Shield, BatteryCharging, AlertTriangle, CheckCircle2, 
  AlertOctagon, Save, FileText, ChevronDown, ChevronUp, Layers, 
  TrendingDown, Cable, Sparkles, Plus
} from "lucide-react";
import { UnifiedCalculationOutput } from "@/lib/ev/unifiedCalculationEngine";

interface EVStickySummaryProps {
  calculation: UnifiedCalculationOutput;
  projectName: string;
  clientName: string;
  activeStep: string;
  onStepClick: (stepId: any) => void;
  onSaveProject: () => void;
  onGenerateReport: () => void;
  onNewProject?: () => void;
  isSaving?: boolean;
}

export default function EVStickySummary({
  calculation,
  projectName,
  clientName,
  activeStep,
  onStepClick,
  onSaveProject,
  onGenerateReport,
  onNewProject,
  isSaving = false
}: EVStickySummaryProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Semáforo Cordeiro: Cores e Ícones
  const trafficLightConfig = {
    IDEAL: {
      bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
      badge: "bg-emerald-500 text-white",
      dot: "bg-[#00B356] shadow-[0_0_12px_#00B356]",
      label: "VIABILIDADE IDEAL",
      icon: CheckCircle2
    },
    ATENCAO: {
      bg: "bg-amber-500/10 border-amber-500/40 text-amber-300",
      badge: "bg-amber-500 text-slate-900 font-black",
      dot: "bg-amber-400 shadow-[0_0_12px_#F59E0B]",
      label: "ATENÇÃO / DLM RECOMENDADO",
      icon: AlertTriangle
    },
    INTERVENCAO: {
      bg: "bg-rose-500/10 border-rose-500/40 text-rose-300",
      badge: "bg-rose-500 text-white font-black",
      dot: "bg-rose-500 shadow-[0_0_12px_#EF4444]",
      label: "INTERVENÇÃO OBRIGATÓRIA",
      icon: AlertOctagon
    }
  }[calculation.statusTrafficLight];

  const TrafficIcon = trafficLightConfig.icon;

  return (
    <div className="sticky top-0 z-40 w-full bg-[#0A192F]/95 backdrop-blur-md border-b border-slate-700/80 shadow-2xl transition-all duration-300 font-['Montserrat',sans-serif]">
      {/* ─── TOPO COMPACTO (SEMPRE VISÍVEL) ─── */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Identificação do Projeto & Status Semáforo */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#E45318] shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-sm tracking-tight truncate">
                {projectName || "Novo Dimensionamento"}
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
                {clientName || "Cliente Particular"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${trafficLightConfig.dot} animate-pulse`} />
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-300">
                {trafficLightConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPIs Fundamentais (Visíveis em Desktop e Tablet) */}
        <div className="hidden md:flex items-center gap-6">
          {/* KPI 1: Potência Total */}
          <div className="text-right">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Potência Total
            </span>
            <span className="text-sm font-black text-white">
              {calculation.totalInstalledPowerKW} <span className="text-[10px] font-normal text-slate-400">kW</span>
            </span>
          </div>

          {/* KPI 2: Demanda Simultânea */}
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Demanda kVA
            </span>
            <span className="text-sm font-black text-emerald-400">
              {Math.round(calculation.effectiveDemandKVA * 10) / 10} <span className="text-[10px] font-normal text-slate-400">kVA</span>
            </span>
          </div>

          {/* KPI 3: Disjuntor Recomendado */}
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Disjuntor Geral
            </span>
            <span className="text-sm font-black text-[#E45318]">
              {calculation.recommendedMainBreakerA}A
            </span>
          </div>

          {/* KPI 4: Cabo Principal */}
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Cabo Alimentador
            </span>
            <span className="text-sm font-black text-slate-200">
              {calculation.recommendedCableGaugeMM2} <span className="text-[10px] font-normal text-slate-400">mm²</span>
            </span>
          </div>
        </div>

        {/* Ações Rápidas & Botão Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Iniciar Novo Projeto em Branco (Limpa todos os dados)"
            >
              <Plus className="w-3.5 h-3.5 text-[#00B356]" />
              <span className="hidden sm:inline">Novo Projeto</span>
            </button>
          )}

          <button
            onClick={onSaveProject}
            disabled={isSaving}
            className="bg-[#E45318] hover:bg-[#ff6b2b] text-white px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Salvar Estado do Projeto"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSaving ? "Gravando..." : "Salvar"}</span>
          </button>

          <button
            onClick={onGenerateReport}
            className="bg-[#00B356] hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            title="Gerar e Baixar Dossiê Técnico"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dossiê</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            title={isExpanded ? "Recolher Resumo" : "Expandir Resumo"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── PAINEL EXPANSÍVEL DE DETALHES TÉCNICOS & SEMÁFORO ─── */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            {/* Mensagem do Semáforo Cordeiro */}
            <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border ${trafficLightConfig.bg} flex-1`}>
              <TrafficIcon className="w-4 h-4 shrink-0" />
              <p className="font-medium leading-tight">
                <strong className="font-black mr-1">{calculation.utilityCategory}:</strong>
                {calculation.statusMessage}
              </p>
            </div>

            {/* Destaque de Economia com DLM ou Alerta de Subestação */}
            {calculation.dlmEstimatedSavingsBRL > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold">
                  Economia potencial de <strong className="text-white font-black">R$ {calculation.dlmEstimatedSavingsBRL.toLocaleString('pt-BR')}</strong> com DLM ativo
                </span>
              </div>
            )}

            {calculation.needsDedicatedTransformer && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 shrink-0">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-bold">
                  Trafo Dedicado Sugerido: <strong className="text-white font-black">{calculation.recommendedTransformerKVA} kVA</strong>
                </span>
              </div>
            )}

            {/* Resumo de CAPEX Estimado */}
            <div className="flex items-center gap-3 border-l border-slate-800 pl-3 shrink-0">
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                  CAPEX Estimado (BOM + M.O.)
                </span>
                <span className="text-xs font-black text-white">
                  R$ {calculation.totalEstimatedCapexBRL.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
