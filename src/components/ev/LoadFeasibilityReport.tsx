"use client";

import React from "react";
import { 
  CheckCircle2, AlertTriangle, XCircle, TrendingDown, 
  DollarSign, Zap, Sun, ShieldCheck, FileCheck
} from "lucide-react";
import { DLMSimulationResult } from "@/lib/coenergygo/types";

interface LoadFeasibilityReportProps {
  simulation: DLMSimulationResult;
}

export default function LoadFeasibilityReport({ simulation }: LoadFeasibilityReportProps) {
  const {
    statusColor,
    statusLabel,
    peakWithoutDLMKW,
    peakWithDLMKW,
    gridEffectiveLimitKW,
    isOverloadedWithoutDLM,
    maxOverloadWithoutDLMKW,
    overloadHoursCount,
    averageModulatedCurrentA,
    energyDeliveryEfficiencyPercent,
    solarEnergyUsedKWh,
    capexSavingsEstimateBRL,
    recommendations
  } = simulation;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      {/* 1. Header do Parecer de Viabilidade com Semáforo de 3 Cores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Diagnóstico Eletrotécnico CoenergyGO
          </span>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            {statusColor === 'green' && <CheckCircle2 className="w-6 h-6 text-[#00B356]" />}
            {statusColor === 'yellow' && <ShieldCheck className="w-6 h-6 text-amber-500" />}
            {statusColor === 'red' && <XCircle className="w-6 h-6 text-red-500" />}
            {statusLabel}
          </h3>
        </div>

        {/* Badge Semáforo */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              statusColor === 'green'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : statusColor === 'yellow'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusColor === 'green' ? 'bg-[#00B356]' : statusColor === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
              }`}
            />
            {statusColor === 'green' ? 'Semáforo Verde' : statusColor === 'yellow' ? 'Semáforo Atenção' : 'Semáforo Crítico'}
          </span>
        </div>
      </div>

      {/* 2. Grid de KPIs Fundamentais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Pico de Carga */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
            Pico Sem DLM vs Com DLM
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-red-600 line-through">{peakWithoutDLMKW} kW</span>
            <span className="text-2xl font-black text-[#00B356]">{peakWithDLMKW} kW</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            Limite do Padrão: <strong>{gridEffectiveLimitKW} kW</strong>
          </p>
        </div>

        {/* KPI 2: Sobrecarga Evitada */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
            Sobrecarga Evitada
          </span>
          <p className="text-2xl font-black text-slate-800">
            {isOverloadedWithoutDLM ? `${maxOverloadWithoutDLMKW} kW` : 'Zero'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            {isOverloadedWithoutDLM ? `${overloadHoursCount} horas com risco de desarme eliminadas` : 'Sem risco de sobrecarga'}
          </p>
        </div>

        {/* KPI 3: Corrente Média Modulada */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
            Corrente Média Modulada
          </span>
          <p className="text-2xl font-black text-slate-800">{averageModulatedCurrentA} A</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            Eficiência de Entrega: <strong>{energyDeliveryEfficiencyPercent}%</strong>
          </p>
        </div>

        {/* KPI 4: Economia de CAPEX ou Solar */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
          <span className="text-[10px] font-black text-[#00B356] uppercase tracking-wider block mb-1">
            {capexSavingsEstimateBRL > 0 ? 'Economia Estimada de CAPEX' : 'Excedente Solar Usado'}
          </span>
          <p className="text-2xl font-black text-slate-900">
            {capexSavingsEstimateBRL > 0 
              ? `R$ ${capexSavingsEstimateBRL.toLocaleString('pt-BR')}`
              : `${solarEnergyUsedKWh} kWh/dia`}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            {capexSavingsEstimateBRL > 0 ? 'Evitou obra civil de subestação' : 'Energia solar limpa a custo zero'}
          </p>
        </div>
      </div>

      {/* 3. Recomendações e Parecer Técnico para Condomínio / Cliente */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <FileCheck className="w-4 h-4 text-[#E45318]" /> Recomendações e Diretrizes da Engenharia Cordeiro
        </h4>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium leading-relaxed flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#00B356] flex-shrink-0 mt-0.5" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
