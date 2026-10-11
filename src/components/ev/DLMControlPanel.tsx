"use client";

import React from "react";
import { 
  Building, Sun, Zap, Sliders, ShieldCheck, 
  BatteryCharging, Clock, CheckCircle2, ArrowRight, Sparkles
} from "lucide-react";
import { TypicalProfileType } from "@/lib/coenergygo/types";
import { HOMOLOGATED_CHARGERS, ChargerDatasheet } from "@/lib/ev/chargersDatabase";

export interface DLMControlPanelProps {
  profileType: TypicalProfileType;
  setProfileType: (val: TypicalProfileType) => void;
  peakDemandKW: number;
  setPeakDemandKW: (val: number) => void;
  gridLimitKW: number;
  setGridLimitKW: (val: number) => void;
  // Carregadores herdados do Passo 1A
  configuredChargersSummary: {
    totalPoints: number;
    totalPowerKW: number;
    description: string;
    isDC: boolean;
  };
  // Cenários de Padrão (Passo 1B)
  currentStandardLimitKW: number;
  currentStandardName: string;
  homologatedStandardLimitKW: number;
  homologatedStandardName: string;
  simulationScenario: 'current' | 'homologated';
  setSimulationScenario: (scen: 'current' | 'homologated') => void;
  // Horários de Simulação
  chargeStartHour: number;
  setChargeStartHour: (val: number) => void;
  chargeDurationHours: number;
  setChargeDurationHours: (val: number) => void;
  // Sinergia Solar
  solarPeakKW: number;
  setSolarPeakKW: (val: number) => void;
  enableDLM: boolean;
  setEnableDLM: (val: boolean) => void;
  enableSolarSurplus: boolean;
  setEnableSolarSurplus: (val: boolean) => void;
  // Medição real ativa
  isCustomCurveActive?: boolean;
  smartMeterFileName?: string;
  onToggleCustomCurve?: () => void;
  // Limitação Segura de Carregador (IEC 61851-1 / NBR 17019)
  suggestedSafeChargerPowerKW?: number;
  isLimitationAccepted?: boolean;
  limitedChargerPowerKW?: number;
  onToggleAcceptLimitation?: (accept: boolean, powerKW?: number) => void;
  onUpdateLimitedChargerPowerKW?: (powerKW: number) => void;
  onSelectRecommendedCharger?: (charger: any) => void;
  // Perfil Customizado pelo Projetista (Editar e Criar)
  customHourlyFactors?: number[];
  onUpdateCustomHourlyFactors?: (factors: number[]) => void;
  customProfileName?: string;
  onUpdateCustomProfileName?: (name: string) => void;
}

export default function DLMControlPanel({
  profileType,
  setProfileType,
  peakDemandKW,
  setPeakDemandKW,
  gridLimitKW,
  setGridLimitKW,
  configuredChargersSummary,
  currentStandardLimitKW,
  currentStandardName,
  homologatedStandardLimitKW,
  homologatedStandardName,
  simulationScenario,
  setSimulationScenario,
  chargeStartHour,
  setChargeStartHour,
  chargeDurationHours,
  setChargeDurationHours,
  solarPeakKW,
  setSolarPeakKW,
  enableDLM,
  setEnableDLM,
  enableSolarSurplus,
  setEnableSolarSurplus,
  isCustomCurveActive,
  smartMeterFileName,
  onToggleCustomCurve,
  suggestedSafeChargerPowerKW,
  isLimitationAccepted = false,
  limitedChargerPowerKW,
  onToggleAcceptLimitation,
  onUpdateLimitedChargerPowerKW,
  onSelectRecommendedCharger,
  customHourlyFactors,
  onUpdateCustomHourlyFactors,
  customProfileName = "Perfil Customizado",
  onUpdateCustomProfileName
}: DLMControlPanelProps) {
  // Cálculo de engenharia solar (Módulos 550Wp e HSP CEMIG/MG = 5.1 kWh/m2/dia)
  const estimatedModuleCount = Math.round((solarPeakKW * 1000) / 550);
  const estimatedDailySolarKWh = Number((solarPeakKW * 5.1 * 0.80).toFixed(1)); // PR 80%

  // Potência nominal individual de referência
  const nominalUnitPowerKW = configuredChargersSummary.totalPoints > 0
    ? Number((configuredChargersSummary.totalPowerKW / configuredChargersSummary.totalPoints).toFixed(1))
    : 7.4;
  const safeKW = suggestedSafeChargerPowerKW !== undefined ? suggestedSafeChargerPowerKW : nominalUnitPowerKW;
  const activeLimitedKW = limitedChargerPowerKW ?? safeKW;

  // Lógica de Engenharia: Determinar o Carregador Ideal que melhor atende a capacidade segura do padrão
  let recommendedCharger: ChargerDatasheet | null = null;
  let recommendedChargerReason = "";

  if (safeKW < nominalUnitPowerKW || safeKW < 75) {
    // Filtrar equipamentos homologados de acordo com tipo (DC ou AC)
    const isDCScheme = configuredChargersSummary.isDC || safeKW >= 25;
    const candidateChargers = HOMOLOGATED_CHARGERS.filter(c => {
      if (isDCScheme) {
        return c.powerKW >= 30; // Modelos DC Comerciais
      } else {
        return c.powerKW <= 22; // Modelos AC
      }
    });

    // Encontrar o modelo cuja potência nominal é a mais próxima e mais adequada para o teto disponível
    // Ex: Se teto seguro é ~58.5 kW, o carregador ideal de 60 kW (BENY BDC-60 ou WEG Station 60 kW) aproveita ~98% sem desperdício de capex de um carregador de 80 kW
    const sorted = [...candidateChargers].sort((a, b) => {
      const diffA = Math.abs(a.powerKW - safeKW);
      const diffB = Math.abs(b.powerKW - safeKW);
      return diffA - diffB;
    });

    if (sorted.length > 0) {
      recommendedCharger = sorted[0];
      if (recommendedCharger.powerKW < nominalUnitPowerKW) {
        recommendedChargerReason = `O carregador de ${recommendedCharger.powerKW} kW se ajusta perfeitamente à margem segura de ${safeKW} kW do seu padrão atual, evitando pagar por um carregador de ${nominalUnitPowerKW} kW que operaria estrangulado pelo DLM.`;
      } else {
        recommendedChargerReason = `Excelente compatibilidade com a margem do padrão (${safeKW} kW), aproveitando a recarga sem risco de desarme.`;
      }
    }
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      {/* Header com Origem dos Dados */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#E45318]" />
              Simulação Dinâmica de Demanda 24h & DLM
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#00B356] border border-emerald-200">
              Dados Integrados dos Passos 1A e 1B
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Analise o comportamento hora a hora e teste a capacidade do padrão existente vs o novo padrão homologado
          </p>
        </div>

        {/* Status de Medição Real / Sintética */}
        <div className="flex items-center gap-2">
          {isCustomCurveActive ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B356]" />
              <span>Medição Real Ativa ({smartMeterFileName || 'SmartMeter.xlsx'})</span>
              {onToggleCustomCurve && (
                <button
                  onClick={onToggleCustomCurve}
                  className="text-[10px] text-emerald-950 underline hover:text-emerald-700 ml-1"
                >
                  Alternar p/ Sintética
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold">
              <span>Modelo Sintético Típico (24h)</span>
              {onToggleCustomCurve && (
                <button
                  onClick={onToggleCustomCurve}
                  className="text-[10px] text-[#E45318] underline hover:text-orange-700 ml-1"
                >
                  Usar Planilha Real
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1. Seleção de Perfil Típico Pré-Calibrado */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Perfil de Carga da Edificação (Estimativa ou Contratada)
          </label>
          <span className="text-[10px] text-slate-400">
            💡 <strong>Padrão Ouro:</strong> Para projetos definitivos, recomenda-se monitorar no mínimo <strong>7 dias</strong> com SmartMeter.
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { id: 'posto_combustivel_constante', label: 'Carga Constante 24h', desc: 'Linha plana contínua (Postos, indústrias, etc.)' },
            { id: 'condominio_residencial', label: 'Condomínio Residencial', desc: 'Pico noturno 18h-22h' },
            { id: 'edificio_comercial', label: 'Edifício Comercial', desc: 'Pico diurno 09h-17h' },
            { id: 'centro_comercial', label: 'Shopping / Varejo', desc: 'Pico estendido 14h-21h' },
            { id: 'industrial', label: 'Indústria / Turnos', desc: 'Oscilação por turnos' },
            { id: 'custom_usuario', label: customProfileName || 'Perfil do Projetista', desc: 'Valores hora a hora editáveis pelo projetista' }
          ].map((p) => {
            const isSelected = profileType === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setProfileType(p.id as any);
                  // Ao selecionar qualquer perfil pré-definido, carregar seus fatores típicos normalizados para o editor
                  const templateMap: Record<string, number[]> = {
                    condominio_residencial: [
                      0.28, 0.24, 0.22, 0.21, 0.22, 0.28,
                      0.42, 0.58, 0.50, 0.38, 0.35, 0.38,
                      0.44, 0.42, 0.40, 0.42, 0.52, 0.70,
                      0.88, 1.00, 0.96, 0.85, 0.60, 0.40
                    ],
                    edificio_comercial: [
                      0.15, 0.14, 0.14, 0.14, 0.15, 0.20,
                      0.35, 0.65, 0.88, 0.98, 1.00, 0.95,
                      0.82, 0.88, 0.96, 0.95, 0.92, 0.75,
                      0.50, 0.35, 0.26, 0.20, 0.18, 0.16
                    ],
                    centro_comercial: [
                      0.20, 0.18, 0.18, 0.18, 0.18, 0.20,
                      0.25, 0.35, 0.50, 0.70, 0.80, 0.85,
                      0.88, 0.85, 0.92, 0.96, 0.98, 1.00,
                      0.98, 0.95, 0.85, 0.65, 0.40, 0.25
                    ],
                    industrial: [
                      0.60, 0.58, 0.58, 0.60, 0.75, 0.90,
                      0.95, 1.00, 0.98, 0.95, 0.95, 0.90,
                      0.85, 0.95, 0.98, 0.96, 0.92, 0.85,
                      0.80, 0.75, 0.70, 0.68, 0.65, 0.62
                    ],
                    posto_combustivel_constante: Array(24).fill(1.0)
                  };
                  if (templateMap[p.id]) {
                    onUpdateCustomHourlyFactors?.(templateMap[p.id]);
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#E45318] bg-orange-50/50 shadow-sm ring-1 ring-[#E45318]'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                }`}
              >
                <p className="text-xs font-bold text-slate-800">{p.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Editor de Pontos Horários Disponível para Qualquer Perfil Selecionado */}
        <div className="mt-3 p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#E45318]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Editor de Curva de Carga 24 Horas ({
                  profileType === 'posto_combustivel_constante' ? 'Carga Constante 24h' :
                  profileType === 'condominio_residencial' ? 'Condomínio Residencial' :
                  profileType === 'edificio_comercial' ? 'Edifício Comercial' :
                  profileType === 'centro_comercial' ? 'Shopping / Varejo' :
                  profileType === 'industrial' ? 'Indústria / Turnos' :
                  (customProfileName || 'Perfil do Projetista')
                })
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customProfileName}
                onChange={(e) => onUpdateCustomProfileName?.(e.target.value)}
                placeholder="Nome do Perfil Customizado"
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-[#E45318]"
              />
              <button
                type="button"
                onClick={() => {
                  const flat = Array(24).fill(1.0);
                  onUpdateCustomHourlyFactors?.(flat);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[10px] font-bold border border-slate-700"
                title="Ajusta todas as 24 horas para 100% (linha reta contínua)"
              >
                24h Linha Reta (100%)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            Ajuste a intensidade de cada hora do dia (% da Demanda Base de {peakDemandKW.toFixed(1)} kW). Ao alterar os horários, a curva é recalculada instantaneamente em tempo real.
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5 pt-1">
            {Array.from({ length: 24 }).map((_, hour) => {
              const factors = customHourlyFactors && customHourlyFactors.length === 24
                ? customHourlyFactors
                : Array(24).fill(1.0);
              const currentVal = factors[hour] !== undefined ? factors[hour] : 1.0;
              const kwValue = (currentVal * peakDemandKW).toFixed(1);

              return (
                <div key={hour} className="bg-slate-800/90 p-1.5 rounded-lg border border-slate-700 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-400 font-bold">
                    {String(hour).padStart(2, '0')}h
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={currentVal}
                    onChange={(e) => {
                      const newV = Math.max(0, Math.min(2.0, parseFloat(e.target.value) || 0));
                      const nextFactors = [...factors];
                      nextFactors[hour] = newV;
                      onUpdateCustomHourlyFactors?.(nextFactors);
                    }}
                    className="w-12 bg-slate-950 border border-slate-600 rounded text-center text-xs font-bold text-amber-400 my-1 py-0.5 focus:outline-none focus:border-[#E45318]"
                  />
                  <span className="text-[8px] font-mono text-slate-400">
                    {kwValue} kW
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Painel de Parâmetros Integrados (3 Colunas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Coluna 1: Padrão da Edificação & Chaveamento de Cenário */}
        <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-[#0A192F]" /> Cenário do Padrão de Entrada
          </h4>

          {/* Seletor de Cenário: Padrão Atual vs Homologado (ou Card Consolidado se já for adequado) */}
          <div className="space-y-2">
            {currentStandardLimitKW >= homologatedStandardLimitKW || currentStandardName === homologatedStandardName ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00B356]" />
                    Padrão Atual Homologado & Adequado
                  </span>
                  <span className="font-black text-xs text-[#00B356] bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                    {currentStandardLimitKW} kW
                  </span>
                </div>
                <strong className="block text-xs text-slate-800">
                  {currentStandardName}
                </strong>
                <p className="text-[11px] text-emerald-900 leading-snug">
                  A capacidade da entrada atende integralmente à carga existente somada à recarga veicular. <strong>Não é necessário solicitar aumento de carga ou reforma de padrão junto à CEMIG.</strong>
                </p>
              </div>
            ) : (
              <>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Limite de Demanda em Teste:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setSimulationScenario('current');
                      setGridLimitKW(currentStandardLimitKW);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs ${
                      simulationScenario === 'current'
                        ? 'border-[#E45318] bg-white shadow-sm ring-1 ring-[#E45318]'
                        : 'border-slate-200 bg-white/60 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div>
                      <strong className="block text-slate-800">1. Padrão Atual do Cliente</strong>
                      <span className="text-[10px] text-slate-500">{currentStandardName}</span>
                    </div>
                    <span className="font-black text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                      {currentStandardLimitKW} kW
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setSimulationScenario('homologated');
                      setGridLimitKW(homologatedStandardLimitKW);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs ${
                      simulationScenario === 'homologated'
                        ? 'border-[#00B356] bg-white shadow-sm ring-1 ring-[#00B356]'
                        : 'border-slate-200 bg-white/60 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div>
                      <strong className="block text-slate-800">2. Novo Padrão Homologado (Sugerido)</strong>
                      <span className="text-[10px] text-[#00B356] font-bold">{homologatedStandardName}</span>
                    </div>
                    <span className="font-black text-xs text-[#00B356] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {homologatedStandardLimitKW} kW
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Demanda de Base da Edificação */}
          <div className="pt-1 border-t border-slate-200/80">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-600">Demanda Base do Imóvel:</span>
              <span className="text-slate-900 font-black">{peakDemandKW.toFixed(1)} kW</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(150, Math.round(peakDemandKW * 2))}
              step="1"
              value={peakDemandKW}
              onChange={(e) => setPeakDemandKW(Number(e.target.value))}
              className="w-full accent-[#0A192F]"
            />
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Valor herdado da medição do Passo 1B (ajuste se desejar simular variações sazonais)
            </span>
          </div>
        </div>

        {/* Coluna 2: Estação de Recarga Herdada do Passo 1A */}
        <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <BatteryCharging className="w-4 h-4 text-[#E45318]" /> Programação Horária dos Carregadores (24h)
          </h4>

          {/* Card Resumo do Equipamento Real Herdado */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">Herdado do Passo 1A</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                {configuredChargersSummary.totalPoints} ponto(s)
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {configuredChargersSummary.description}
            </p>
            <p className="text-sm font-black text-[#E45318]">
              Potência Total: {configuredChargersSummary.totalPowerKW} kW
            </p>
          </div>

          {/* Configuração da Janela de Uso */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 block">
                Janela de Conexão dos Veículos
              </span>
              <span className="text-[9px] text-slate-400 font-medium">Define o pico no gráfico</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-600 font-bold block mb-1">Horário de Início</span>
                <select
                  value={chargeStartHour}
                  onChange={(e) => setChargeStartHour(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 text-xs focus:border-[#E45318] focus:outline-none"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00h {h >= 6 && h < 12 ? '☀️ Manhã' : h >= 12 && h < 18 ? '🌤️ Tarde' : '🌙 Noite'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 font-bold block mb-1">Horário de Término / Duração</span>
                <select
                  value={chargeDurationHours}
                  onChange={(e) => setChargeDurationHours(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 text-xs focus:border-[#E45318] focus:outline-none"
                >
                  {Array.from({ length: 24 }).map((_, d) => {
                    const dur = d + 1;
                    const endH = (chargeStartHour + dur) % 24;
                    return (
                      <option key={dur} value={dur}>
                        Até {String(endH).padStart(2, '0')}:00h ({dur}h de recarga)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-0.5">
              <p>
                ⏰ <strong>Janela de Operação Ativa:</strong> Das <strong>{String(chargeStartHour).padStart(2, '0')}:00h</strong> às <strong>{String((chargeStartHour + chargeDurationHours) % 24).padStart(2, '0')}:00h</strong> (Duração: {chargeDurationHours} horas contínuas).
              </p>
              <p className="text-slate-400">
                Você pode selecionar qualquer horário de início e término desejado. O simulador projeta a curva horária exata para a janela definida.
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 3: Inteligência DLM & Sinergia Solar Cordeiro */}
        <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#00B356]" /> Gestão Inteligente & Solar
            </h4>

            {/* Toggle DLM */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between mb-3 shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Ativar DLM (Smart Charging)</span>
                <span className="text-[10px] text-slate-500">
                  {configuredChargersSummary.isDC
                    ? 'Modula potência DC em kW para evitar desarme'
                    : 'Modula corrente AC de 6A a 32A em tempo real'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={enableDLM}
                onChange={(e) => setEnableDLM(e.target.checked)}
                className="w-5 h-5 accent-[#00B356] rounded cursor-pointer"
              />
            </div>

            {/* Painel Interativo de Limitação Segura de Potência do Carregador (IEC 61851-1 / NBR 17019) */}
            {enableDLM && (
              <div className={`p-3.5 rounded-2xl border mb-3 space-y-2.5 transition-all ${
                isLimitationAccepted
                  ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                  : 'bg-amber-50/70 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                    <ShieldCheck className={`w-4 h-4 ${isLimitationAccepted ? 'text-[#00B356]' : 'text-amber-600'}`} />
                    Limitação Segura do Carregador
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    isLimitationAccepted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {isLimitationAccepted ? 'Ativa no Gráfico & Padrão' : 'Pendente de Aceite'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-snug">
                  Para que o disjuntor do padrão de <strong>{gridLimitKW} kW</strong> não caia/desarme nos momentos de pico da edificação, recomendamos parametrizar o carregador para <strong>{safeKW} kW</strong> (Potência nominal instalada: {nominalUnitPowerKW} kW).
                </p>

                {/* Botão de Aceite Rápido */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleAcceptLimitation) {
                        onToggleAcceptLimitation(!isLimitationAccepted, safeKW);
                      }
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      isLimitationAccepted
                        ? 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 shadow-xs'
                        : 'bg-[#00B356] text-white hover:bg-emerald-600 shadow-sm'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isLimitationAccepted
                      ? `Limitação Aceita: Carregador limitado a ${activeLimitedKW} kW`
                      : `Aceitar Limitar Carregador a ${safeKW} kW`}
                  </button>
                </div>

                {/* Ajuste Fino / Personalizado da Potência Limitada */}
                {isLimitationAccepted && (
                  <div className="pt-2 border-t border-emerald-200/80 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-bold text-[10px]">Ajuste Fino de Limite:</span>
                      <span className="font-black text-[#00B356]">{activeLimitedKW} kW</span>
                    </div>
                    <input
                      type="range"
                      min="1.4"
                      max={nominalUnitPowerKW}
                      step="0.1"
                      value={activeLimitedKW}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (onUpdateLimitedChargerPowerKW) {
                          onUpdateLimitedChargerPowerKW(val);
                        }
                      }}
                      className="w-full accent-[#00B356]"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>Mín. IEC: 1.4 kW (6A)</span>
                      <span>Nominal: {nominalUnitPowerKW} kW</span>
                    </div>
                  </div>
                )}

                <div className="text-[9px] text-slate-500 bg-white/70 p-2 rounded-lg border border-slate-200/60 leading-tight">
                  ⚖️ <strong>Embasamento Normativo:</strong> Conforme <strong>ABNT NBR 17019</strong> e <strong>IEC 61851-1</strong>, com a gestão dinâmica DLM ativada e potência fixada no teto seguro, <em>o disjuntor do padrão não desarma</em> e os alarmes de sobrecarga são anulados.
                </div>

                {/* SUGESTÃO INTELIGENTE DE CARREGADOR COMERCIAL IDEAL */}
                {recommendedCharger && (
                  <div className="bg-gradient-to-br from-slate-900 to-[#0A192F] text-white p-3.5 rounded-2xl border border-emerald-500/30 shadow-md space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#00B356] tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Carregador Ideal Recomendado
                      </span>
                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        {recommendedCharger.powerKW} kW ({recommendedCharger.brand})
                      </span>
                    </div>

                    <div>
                      <strong className="text-xs text-white block">
                        {recommendedCharger.model}
                      </strong>
                      <p className="text-[10px] text-slate-300 leading-snug mt-0.5">
                        {recommendedChargerReason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-[10px]">
                      <span className="text-slate-300">
                        Aproveitamento do Padrão: <strong className="text-[#00B356]">{Math.min(100, Math.round((safeKW / recommendedCharger.powerKW) * 100))}%</strong>
                      </span>
                      {onSelectRecommendedCharger && (
                        <button
                          type="button"
                          onClick={() => onSelectRecommendedCharger(recommendedCharger)}
                          className="bg-[#00B356] hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <span>Adotar este Carregador</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Toggle Solar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> Sinergia Solar Cordeiro
                </span>
                <span className="text-[10px] text-slate-500">Recarga com excedente solar diurno</span>
              </div>
              <input
                type="checkbox"
                checked={enableSolarSurplus}
                onChange={(e) => setEnableSolarSurplus(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {enableSolarSurplus && (
            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-amber-800">Gerador Fotovoltaico Local:</span>
                <span className="text-amber-950 font-black">{solarPeakKW} kWp</span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={solarPeakKW}
                onChange={(e) => setSolarPeakKW(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="text-[10px] text-amber-900 leading-tight pt-1 border-t border-amber-200/60">
                <p>Equivale a <strong>~{estimatedModuleCount} módulos de 550Wp</strong>.</p>
                <p>Geração estimada: <strong>~{estimatedDailySolarKWh} kWh/dia</strong> (HSP CEMIG 5,10 kWh/m²/dia • PR 80%).</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
