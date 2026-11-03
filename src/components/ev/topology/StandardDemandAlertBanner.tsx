'use client';

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { StandardCapacityAlert } from '@/lib/coenergygo/types';

interface StandardDemandAlertBannerProps {
  standardAlert: StandardCapacityAlert;
  externalHasSmartChargingDLM?: boolean;
  externalMaxChargerCapKW?: number;
  breakdownClientKW: number;
  breakdownHubTotalKW: number;
  breakdownTotalRequiredKW: number;
  breakdownDeficitKW: number;
  onAdequarAoPadrao?: () => void;
  hasChargers: boolean;
}

export function StandardDemandAlertBanner({
  standardAlert,
  externalHasSmartChargingDLM,
  externalMaxChargerCapKW,
  breakdownClientKW,
  breakdownHubTotalKW,
  breakdownTotalRequiredKW,
  breakdownDeficitKW,
  onAdequarAoPadrao,
  hasChargers
}: StandardDemandAlertBannerProps) {
  const [showDemandBreakdown, setShowDemandBreakdown] = useState(false);

  return (
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

        {/* Destaque Didático: Redução Necessária ou Sobra */}
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

          {standardAlert.isOverloaded && hasChargers && onAdequarAoPadrao && (
            <button
              type="button"
              onClick={onAdequarAoPadrao}
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
            <span>
              {showDemandBreakdown
                ? '▲ Ocultar Memorial'
                : standardAlert.isOverloaded
                ? `🔍 Detalhar Demanda (${breakdownTotalRequiredKW} kW • Déficit ${breakdownDeficitKW > 0 ? breakdownDeficitKW : 0} kW)`
                : `🔍 Detalhar Demanda (${breakdownTotalRequiredKW} kW • Sobra +${Math.abs(breakdownDeficitKW).toFixed(1)} kW)`}
            </span>
          </button>
        </div>

        {/* Memorial Discriminado da Demanda */}
        {showDemandBreakdown && (
          <div className="mt-3 p-4 bg-slate-950/90 rounded-xl border border-amber-500/40 space-y-3 font-mono text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] block tracking-wider">
                  Memorial de Cálculo Eletrotécnico Discriminado (NBR 5410 & CEMIG ND-5.1)
                </span>
                <h5 className="font-bold text-white text-sm">Balanço de Carga & Dimensionamento do Alimentador Geral</h5>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-300">
                Limite Contratado: <b>{standardAlert.currentStandardLimitKW} kW</b>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300 text-[11px]">
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-bold">1. Instalação do Cliente</span>
                <p>Carga Base: <b className="text-white">{breakdownClientKW} kW</b></p>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-bold">2. Hub de Recarga VE</span>
                <p>Potência Hub: <b className="text-white">{breakdownHubTotalKW} kW</b></p>
              </div>
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-bold">3. Total Simulâneo</span>
                <p>Demanda: <b className={standardAlert.isOverloaded ? 'text-rose-400' : 'text-emerald-400'}>{breakdownTotalRequiredKW} kW</b></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
