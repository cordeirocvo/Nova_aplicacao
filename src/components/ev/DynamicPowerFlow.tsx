"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, Shield, Cable, Box, AlertTriangle, CheckCircle2, 
  Play, Pause, RefreshCw, Activity, ArrowRight, Info,
  Sliders, Gauge, BatteryCharging, CheckSquare, Sparkles,
  HelpCircle, Eye, EyeOff, ShieldCheck
} from "lucide-react";
import { 
  ElectricalInfrastructureSizing, 
  TransformerSizingDetails,
  Panel220VSpec,
  Panel380VSpec,
  UtilityId
} from "@/lib/coenergygo";

interface DynamicPowerFlowProps {
  sizing: ElectricalInfrastructureSizing;
  utility: UtilityId;
  chargerPowerKW: number;
  chargerVoltage: number;
  chargerPhases: 1 | 3;
  chargerBrand?: string;
  chargerModel?: string;
  cableLengthMeters: number;
  onSimulateChargerToggle?: (voltage: number, powerKW: number, phases: 1 | 3) => void;
}

export default function DynamicPowerFlow({
  sizing,
  utility,
  chargerPowerKW,
  chargerVoltage,
  chargerPhases,
  chargerBrand = "WEG",
  chargerModel = "WEMOB Wallbox",
  cableLengthMeters,
  onSimulateChargerToggle
}: DynamicPowerFlowProps) {
  // Controles de Simulação Interativa
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simulatedCurrentA, setSimulatedCurrentA] = useState<number>(32);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<string | null>(null);
  const [batterySOC, setBatterySOC] = useState<number>(45);
  const [accumulatedKWh, setAccumulatedKWh] = useState<number>(3.84);

  const { transformerDetails, panel220VSpec, panel380VSpec } = sizing;
  const isTrafoActive = Boolean(transformerDetails.needed && (transformerDetails.type === 'elevador_seco' || transformerDetails.type === 'subestacao_mt'));
  const isSubstationMT = transformerDetails.type === 'subestacao_mt';
  const analysis = sizing.transformerBeforeAfter || transformerDetails.beforeAfterAnalysis;

  // Simular potência real entregue conforme a corrente modulada
  const activePowerMultiplier = simulatedCurrentA / 32;
  const activeDeliveredKW = Number((chargerPowerKW * activePowerMultiplier).toFixed(1));
  const trafoLossesKW = isTrafoActive ? Number(((transformerDetails.lossesEstimatedKW || (chargerPowerKW * 0.025)) * activePowerMultiplier).toFixed(2)) : 0;
  const totalGridPowerKW = Number((activeDeliveredKW + trafoLossesKW).toFixed(1));

  // Animação gradual do SOC da bateria e acúmulo contínuo de kWh quando o fluxo está ativo
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBatterySOC(prev => (prev >= 99 ? 20 : prev + 1));
      // Incrementa energia com base na potência ativa entregue: (kW / 3600) * delta
      setAccumulatedKWh(prev => Number((prev + (activeDeliveredKW * 0.002)).toFixed(3)));
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying, activeDeliveredKW]);

  // Cálculo das grandezas em cada ponto do fluxo
  const gridVoltageStr = utility === 'CEMIG' ? '220V / 127V' : `${chargerVoltage}V`;
  const trafoPrimaryCurrentA = isTrafoActive ? Number((transformerDetails.primaryCurrentA * activePowerMultiplier).toFixed(1)) : 0;
  const trafoSecondaryCurrentA = isTrafoActive ? Number((transformerDetails.secondaryCurrentA * activePowerMultiplier).toFixed(1)) : 0;

  return (
    <div className="bg-[#0A192F] text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden font-['Montserrat',sans-serif]">
      {/* Glows de ambientação eletrotécnica Cordeiro Energia */}
      <div className={`absolute -right-20 -top-20 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
        isTrafoActive ? "bg-[#E45318]/15" : "bg-[#00B356]/15"
      }`} />
      <div className="absolute left-1/3 -bottom-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── BARRA SUPERIOR: TÍTULO, CONTROLES DE FLUXO & TOGGLE RÁPIDO ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#00B356] bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-[#00B356] animate-ping" : "bg-slate-500"}`} />
              Telemetria Dinâmica de Fluxo de Potência
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              ABNT NBR 17019 / NBR 5410 / CEMIG ND-5.1
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            Diagrama Interativo do Fluxo de Energia: Rede Concessionária → Veículo Elétrico
          </h3>
          <p className="text-xs text-slate-300 max-w-3xl">
            Acompanhe a trajetória da energia em tempo real, a verificação de compatibilidade de tensão e o diagnóstico automático de necessidade ou dispensa do transformador elevador.
          </p>
        </div>

        {/* Controles do Fluxo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
              isPlaying
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-[#00B356] text-white hover:bg-emerald-600"
            }`}
            title={isPlaying ? "Pausar animação do fluxo de energia" : "Iniciar animação do fluxo de energia"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isPlaying ? "Pausar Fluxo" : "Animar Fluxo"}</span>
          </button>

          {/* Seletor de Corrente Simulada (DLM) */}
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center gap-2 text-xs">
            <Sliders className="w-3.5 h-3.5 text-[#E45318]" />
            <span className="text-slate-400 text-[11px] font-bold">Modulação:</span>
            <div className="flex items-center gap-1">
              {[6, 16, 32].map(amp => (
                <button
                  key={amp}
                  onClick={() => setSimulatedCurrentA(amp)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all ${
                    simulatedCurrentA === amp
                      ? "bg-[#E45318] text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                  title={`Simular modulação de recarga a ${amp}A`}
                >
                  {amp}A
                </button>
              ))}
            </div>
          </div>

          {/* Alternador Rápido de Demonstração (7.4kW vs 22kW) */}
          {onSimulateChargerToggle && (
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => onSimulateChargerToggle(220, 7.4, 1)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  chargerVoltage === 220
                    ? "bg-[#00B356] text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Simular carregador 7.4 kW 220V (Sem Trafo)"
              >
                7.4 kW (220V)
              </button>
              <button
                onClick={() => onSimulateChargerToggle(380, 22, 3)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  chargerVoltage === 380
                    ? "bg-[#E45318] text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Simular carregador 22 kW 380V (Com Trafo Elevador)"
              >
                22 kW (380V)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── BANNER DINÂMICO DE COMPATIBILIDADE DE TENSÃO ─── */}
      <div className={`p-4 md:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isTrafoActive
          ? "bg-[#E45318]/10 border-[#E45318]/40 text-orange-200"
          : "bg-[#00B356]/10 border-[#00B356]/40 text-emerald-200"
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 text-white shadow-md ${
            isTrafoActive ? "bg-[#E45318]" : "bg-[#00B356]"
          }`}>
            <Zap className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isTrafoActive ? "bg-orange-500/30 text-orange-200" : "bg-emerald-500/30 text-emerald-200"
              }`}>
                {isSubstationMT
                  ? "Subestação Particular de Média Tensão (MT)"
                  : isTrafoActive
                  ? "Transformador Elevador Obrigatório"
                  : "Transformador Dispensado • Ligação Direta"}
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                Rede: {utility} ({isSubstationMT ? '13,8 kV MT / ' : ''}{gridVoltageStr}) ⇄ Carregador: {chargerVoltage}V ({chargerPhases === 3 ? 'Trifásico' : 'Bifásico/F+N'})
              </span>
            </div>
            <p className="text-xs md:text-sm text-white font-medium leading-relaxed">
              {transformerDetails.reason}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-700/80 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Saída do Padrão</span>
            <strong className="text-lg font-black text-amber-400">{totalGridPowerKW} kW</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">({gridVoltageStr})</span>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Entregue no Carro</span>
            <strong className="text-lg font-black text-emerald-400">{activeDeliveredKW} kW</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">({chargerVoltage}V)</span>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Energia Acumulada</span>
            <strong className="text-lg font-black text-[#00B356] font-mono">{accumulatedKWh.toFixed(2)} kWh</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">Sessão Ativa</span>
          </div>
        </div>
      </div>

      {/* ─── DIAGRAMA GRÁFICO DO FLUXO DE ENERGIA (SVG & CARDS INTERATIVOS) ─── */}
      <div className="bg-slate-950/80 p-5 md:p-8 rounded-3xl border border-slate-800/90 shadow-inner space-y-6">
        
        {/* Visualização de nós conectados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5 relative">
          
          {/* NÓ 1: Padrão Concessionária (CEMIG ND-5.1) */}
          <div 
            onClick={() => setSelectedNodeDetails('grid')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group hover:border-[#00B356] ${
              selectedNodeDetails === 'grid' ? "bg-slate-800/90 border-[#00B356] shadow-lg shadow-emerald-500/10" : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Origem</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Rede {utility}</h4>
                <p className="text-[10px] text-slate-400">Padrão ND-5.1</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
              <p className="text-slate-300">Tensão: <strong className="text-white">{gridVoltageStr}</strong></p>
              <p className="text-slate-300">Disjuntor: <strong className="text-white">{sizing.breakerTripDiagnosis.currentBreakerA}A</strong></p>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Detalhes técnicos</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* NÓ 2: Painel de Proteção Lado 220V */}
          <div 
            onClick={() => setSelectedNodeDetails('panel220')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group hover:border-blue-400 ${
              selectedNodeDetails === 'panel220' ? "bg-slate-800/90 border-blue-400 shadow-lg shadow-blue-500/10" : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Lado 220V</span>
              <Shield className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Painel 220V</h4>
                <p className="text-[10px] text-slate-400">Entrada & Auxiliares</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
              <p className="text-slate-300">Geral: <strong className="text-white">{panel220VSpec.mainBreakerA}A {panel220VSpec.mainBreakerCurve}</strong></p>
              <p className="text-slate-300">DPS: <strong className="text-blue-300">Uc 275V Cl. II</strong></p>
              <p className="text-slate-300">Auxiliares: <strong className="text-white">{panel220VSpec.circuitsCount} circ.</strong></p>
            </div>
            <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Detalhes técnicos</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* NÓ 3: NÓ CENTRAL INTELIGENTE (TRANSFORMADOR OU BYPASS DIRETO) */}
          <div 
            onClick={() => setSelectedNodeDetails('trafo')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group col-span-1 lg:col-span-1 ${
              isTrafoActive
                ? "bg-gradient-to-br from-orange-950/40 to-slate-900 border-[#E45318] shadow-lg shadow-orange-500/15"
                : "bg-gradient-to-br from-emerald-950/40 to-slate-900 border-[#00B356] shadow-lg shadow-emerald-500/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase tracking-wider ${
                isTrafoActive ? "text-[#E45318]" : "text-[#00B356]"
              }`}>
                {isSubstationMT ? "Subestação MT" : isTrafoActive ? "Trafo Ativo" : "Bypass Direto"}
              </span>
              <Activity className={`w-3.5 h-3.5 ${isTrafoActive ? "text-[#E45318]" : "text-[#00B356]"}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl text-white ${
                isTrafoActive ? "bg-[#E45318]" : "bg-[#00B356]"
              }`}>
                <RefreshCw className={`w-4 h-4 ${isPlaying && isTrafoActive ? "animate-spin" : ""}`} style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {isSubstationMT
                    ? `Subestação ${transformerDetails.nominalKVA} kVA`
                    : isTrafoActive
                    ? `${transformerDetails.nominalKVA} kVA a Seco`
                    : "Sem Trafo (220V)"}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {isSubstationMT
                    ? "Média Tensão 13.8kV → 380V"
                    : isTrafoActive
                    ? "Elevação 220V → 380V"
                    : "Tensão Direta"}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
              {isTrafoActive ? (
                <>
                  <p className="text-slate-300">Primário: <strong className="text-orange-300">{isSubstationMT ? '13.8 kV' : '220V Δ'} ({trafoPrimaryCurrentA || transformerDetails.primaryCurrentA}A)</strong></p>
                  <p className="text-slate-300">Secundário: <strong className="text-emerald-300">380V Y ({trafoSecondaryCurrentA || transformerDetails.secondaryCurrentA}A)</strong></p>
                  <p className="text-[10px] text-emerald-400 font-bold">Neutro Aterrado (TN-S)</p>
                  <div className="pt-1.5 flex items-center gap-1 text-[10px] text-orange-400 font-bold group-hover:text-orange-300">
                    <Sparkles className="w-3 h-3 text-[#E45318]" />
                    <span>Ver Análise Detalhada ➔</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-300">Tensão: <strong className="text-white">220V Direto</strong></p>
                  <p className="text-slate-300">Perdas de Trafo: <strong className="text-emerald-400">0.00 kW</strong></p>
                  <p className="text-[10px] text-emerald-400 font-bold">Economia de Custo & Espaço</p>
                </>
              )}
            </div>
          </div>

          {/* NÓ 4: Painel de Proteção Lado 380V (quando ativo) ou Módulo de Saída */}
          <div 
            onClick={() => setSelectedNodeDetails('panel380')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group ${
              isTrafoActive
                ? "bg-slate-900/80 border-[#E45318]/70 hover:border-[#E45318]"
                : "bg-slate-900/40 border-slate-800/60 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase tracking-wider ${
                isTrafoActive ? "text-[#E45318]" : "text-slate-500"
              }`}>
                {isTrafoActive ? "Lado 380V Potência" : "Lado 380V"}
              </span>
              <Shield className={`w-3.5 h-3.5 ${isTrafoActive ? "text-[#E45318]" : "text-slate-500"}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                isTrafoActive ? "bg-orange-500/10 text-[#E45318]" : "bg-slate-800 text-slate-500"
              }`}>
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {isTrafoActive ? "Painel 380V VE" : "Dispensado"}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {isTrafoActive ? "Proteção NBR 17019" : "Integrado ao 220V"}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
              <p className="text-slate-300">Disjuntor: <strong className="text-white">{panel380VSpec.active ? `${panel380VSpec.mainBreakerA}A 3P` : "N/A"}</strong></p>
              <p className="text-slate-300">Proteção DR: <strong className="text-emerald-300">Tipo B 30mA</strong></p>
              <p className="text-slate-300">DPS: <strong className="text-orange-300">{isTrafoActive ? "Uc 385V (4P)" : "N/A"}</strong></p>
            </div>
          </div>

          {/* NÓ 5: Estação de Recarga Wallbox */}
          <div 
            onClick={() => setSelectedNodeDetails('charger')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group hover:border-[#00B356] ${
              selectedNodeDetails === 'charger' ? "bg-slate-800/90 border-[#00B356] shadow-lg shadow-emerald-500/10" : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Estação VE</span>
              <div className="w-2 h-2 rounded-full bg-[#00B356] animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-[#00B356]">
                <Zap className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-white truncate">{chargerBrand} {chargerModel}</h4>
                <p className="text-[10px] text-slate-400">{chargerPowerKW} kW • {chargerVoltage}V</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
              <p className="text-slate-300">Potência Atual: <strong className="text-white">{activeDeliveredKW} kW</strong></p>
              <p className="text-slate-300">Cabo Alimentador: <strong className="text-white">{sizing.cableGaugePhaseMM2} mm²</strong></p>
              <p className="text-slate-300">Queda de Tensão: <strong className="text-emerald-400">{sizing.calculatedVoltageDropPercent}%</strong></p>
            </div>
          </div>

          {/* NÓ 6: Veículo Elétrico (Bateria em Carregamento) */}
          <div 
            onClick={() => setSelectedNodeDetails('vehicle')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group hover:border-[#E45318] ${
              selectedNodeDetails === 'vehicle' ? "bg-slate-800/90 border-[#E45318] shadow-lg shadow-orange-500/10" : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">Veículo Elétrico</span>
              <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Bateria EV</h4>
                <p className="text-[10px] text-slate-400">SOC {batterySOC}%</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
              {/* Barra de progresso da bateria */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-[#00B356] h-full rounded-full transition-all duration-500"
                  style={{ width: `${batterySOC}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Recebendo: <strong className="text-white">{activeDeliveredKW} kW</strong></span>
                <span className="text-emerald-400 font-bold">+{Math.round((activeDeliveredKW * 1000) / 160)} km/h</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60">
                <span>Energia na Bateria:</span>
                <span className="font-mono text-amber-300 font-bold">{accumulatedKWh.toFixed(2)} kWh</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── LINHA DE FLUXO ANIMADA SVG (VISUALIZAÇÃO DE CORRENTE ELÉTRICA) ─── */}
        <div className="relative py-2">
          <svg className="w-full h-12 overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 40">
            <defs>
              <linearGradient id="flowGrad220" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00B356" />
                <stop offset="100%" stopColor={isTrafoActive ? "#E45318" : "#00B356"} />
              </linearGradient>
            </defs>

            {/* Linha guia estática */}
            <line 
              x1="50" y1="20" x2="950" y2="20" 
              stroke="#1e293b" 
              strokeWidth="4" 
              strokeDasharray="4 4" 
            />

            {/* Linha de fluxo com partículas animadas */}
            {isPlaying && (
              <line 
                x1="50" y1="20" x2="950" y2="20" 
                stroke="url(#flowGrad220)" 
                strokeWidth="5" 
                strokeLinecap="round"
                strokeDasharray="16 24"
                className="animate-[dash_1.5s_linear_infinite]"
                style={{
                  strokeDashoffset: isPlaying ? 100 : 0
                }}
              />
            )}

            {/* Nós circulares demarcadores */}
            <circle cx="80" cy="20" r="7" fill="#00B356" className="shadow" />
            <circle cx="250" cy="20" r="7" fill="#3b82f6" />
            <circle cx="430" cy="20" r="9" fill={isTrafoActive ? "#E45318" : "#00B356"} stroke="#ffffff" strokeWidth="2" />
            <circle cx="610" cy="20" r="7" fill={isTrafoActive ? "#E45318" : "#64748b"} />
            <circle cx="780" cy="20" r="7" fill="#00B356" />
            <circle cx="930" cy="20" r="8" fill="#f59e0b" />
          </svg>

          {/* Rótulos explicativos sob os nós */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-4">
            <span className="text-emerald-400">1. Entrada CEMIG</span>
            <span className="text-blue-400">2. Proteção 220V</span>
            <span className={isTrafoActive ? "text-[#E45318]" : "text-emerald-400"}>
              {isTrafoActive ? "3. Elevação Δ-Y" : "3. Bypass Direto"}
            </span>
            <span className={isTrafoActive ? "text-[#E45318]" : "text-slate-500"}>4. Proteção 380V</span>
            <span className="text-emerald-400">5. Wallbox VE</span>
            <span className="text-amber-400">6. Bateria</span>
          </div>
        </div>

        {/* ─── CARD EXPANSÍVEL DE DETALHES TÉCNICOS DO NÓ SELECIONADO ─── */}
        {selectedNodeDetails && (
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900 border border-slate-700 text-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-black text-white text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E45318]" />
                {selectedNodeDetails === 'grid' && `Detalhamento: Padrão Concessionária ${utility}`}
                {selectedNodeDetails === 'panel220' && `Detalhamento: ${panel220VSpec.name}`}
                {selectedNodeDetails === 'trafo' && (isTrafoActive ? `Detalhamento: Transformador Elevador ${transformerDetails.nominalKVA} kVA` : "Detalhamento: Alimentação Direta 220V (Sem Trafo)")}
                {selectedNodeDetails === 'panel380' && `Detalhamento: ${panel380VSpec.name}`}
                {selectedNodeDetails === 'charger' && `Detalhamento: Estação de Recarga ${chargerBrand} ${chargerModel}`}
                {selectedNodeDetails === 'vehicle' && "Detalhamento: Inversor de Bordo & Bateria do Veículo Elétrico"}
              </span>
              <button
                onClick={() => setSelectedNodeDetails(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {selectedNodeDetails === 'trafo' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {isTrafoActive && analysis ? (
                  <>
                    <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-black uppercase text-orange-300 tracking-wider">
                          Análise Eletrotécnica Comparativa: ANTES e DEPOIS do Transformador Elevador
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-white bg-orange-600/40 px-2 py-0.5 rounded-full border border-orange-500/50">
                        {analysis.transformer.nominalKVA} kVA a Seco • Rendimento {analysis.transformer.efficiencyPercent}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-slate-300">
                      {/* CARD 1: ANTES DO TRAFO (Primário 220V Δ) */}
                      <div className="bg-slate-950 p-4 rounded-2xl border-2 border-orange-500/40 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                            1. Antes do Trafo (Primário 220V)
                          </span>
                          <span className="text-[10px] font-bold bg-orange-950 text-orange-300 px-2 py-0.5 rounded-md border border-orange-800">
                            {analysis.primary.connection}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <p className="flex justify-between">
                            <span className="text-slate-400">Tensão de Entrada:</span>
                            <strong className="text-white">{analysis.primary.voltageV}V Trifásico</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Corrente Nominal I₁:</span>
                            <strong className="text-orange-300">{analysis.primary.nominalCurrentA} A</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Corrente Inrush (Pico):</span>
                            <strong className="text-amber-400">~{analysis.primary.inrushCurrentA} A (8.5× In)</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Disjuntor Primário:</span>
                            <strong className="text-white">{analysis.primary.breakerRatingA}A Curva {analysis.primary.breakerCurve} (3P)</strong>
                          </p>
                          <div className="p-1.5 rounded-lg bg-orange-950/40 border border-orange-900/60 text-[10px] text-orange-200">
                            ⚡ Curva D mandatória: suporta a magnetização a frio do núcleo sem desarme indevido.
                          </div>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Cabo Alimentador:</span>
                            <strong className="text-white">{analysis.primary.cableGaugePhaseMM2} mm² Cobre</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Queda de Tensão ΔV₁:</span>
                            <strong className="text-emerald-400">{analysis.primary.voltageDropPercent}% ({analysis.primary.voltageDropVolts}V)</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">DPS Primário:</span>
                            <strong className="text-blue-300">Uc {analysis.primary.dpsUcVolts}V Cl. II</strong>
                          </p>
                        </div>
                      </div>

                      {/* CARD 2: O TRANSFORMADOR ELEVADOR */}
                      <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            2. O Transformador Elevador
                          </span>
                          <span className="text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded-md border border-slate-700">
                            {analysis.transformer.nominalKVA} kVA
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <p className="flex justify-between">
                            <span className="text-slate-400">Grupo de Ligação:</span>
                            <strong className="text-white font-mono text-[10px]">{analysis.transformer.connectionGroup}</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Rendimento Nominal:</span>
                            <strong className="text-emerald-400">{analysis.transformer.efficiencyPercent}%</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Perdas Estimadas:</span>
                            <strong className="text-amber-400">{analysis.transformer.lossesKW} kW</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Impedância Zcc:</span>
                            <strong className="text-white">{analysis.transformer.impedanceZccPercent}%</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Tipo de Refrigeração:</span>
                            <strong className="text-slate-200">{analysis.transformer.coolingType}</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Grau de Proteção:</span>
                            <strong className="text-slate-200">{analysis.transformer.ipRating}</strong>
                          </p>
                          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                            Normas: {analysis.transformer.standards.join(' • ')}
                          </div>
                        </div>
                      </div>

                      {/* CARD 3: DEPOIS DO TRAFO (Secundário 380V Y) */}
                      <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/40 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                            3. Depois do Trafo (Secundário 380V)
                          </span>
                          <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800">
                            {analysis.secondary.connection}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <p className="flex justify-between">
                            <span className="text-slate-400">Tensão de Saída:</span>
                            <strong className="text-white">{analysis.secondary.voltageV}V / 220V (3F+N)</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Corrente Nominal I₂:</span>
                            <strong className="text-emerald-300">{analysis.secondary.nominalCurrentA} A</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Disjuntor Secundário:</span>
                            <strong className="text-white">{analysis.secondary.breakerRatingA}A Curva {analysis.secondary.breakerCurve} (4P)</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Proteção Diferencial:</span>
                            <strong className="text-emerald-400">DR 30mA Tipo B</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Cabo até a Estação:</span>
                            <strong className="text-white">{analysis.secondary.cableGaugePhaseMM2} mm² (3F+N+PE)</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Queda de Tensão ΔV₂:</span>
                            <strong className="text-emerald-400">{analysis.secondary.voltageDropPercent}% ({analysis.secondary.voltageDropVolts}V)</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">DPS Secundário:</span>
                            <strong className="text-orange-300">Uc {analysis.secondary.dpsUcVolts}V (4 Polos)</strong>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Icc₂ Limitado pelo Trafo:</span>
                            <strong className="text-slate-300 font-mono">~{analysis.secondary.shortCircuitCurrentKA} kA</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* BANNER DE CONFORMIDADE NBR 17019 & SISTEMA TN-S */}
                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-emerald-300">
                          {analysis.neutralGroundingCompliance.standard} — Sistema {analysis.neutralGroundingCompliance.system}
                        </span>
                        <p className="text-emerald-100 text-[11px] leading-relaxed">
                          {analysis.neutralGroundingCompliance.description}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Alimentação Direta 220V — Sem Necessidade de Transformador Elevador</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      O carregador selecionado opera em {chargerVoltage}V ({chargerPowerKW} kW), atendendo diretamente ao fornecimento em Baixa Tensão da CEMIG. A eliminação do transformador economiza espaço físico no local, elimina perdas magnéticas (~0.55 kW) e reduz significativamente o investimento inicial da instalação.
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedNodeDetails === 'panel220' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Dispositivo de Proteção Geral</span>
                  <p className="text-white font-bold">Disjuntor {panel220VSpec.mainBreakerA}A {panel220VSpec.mainBreakerPoles}P Curva {panel220VSpec.mainBreakerCurve}</p>
                  <p className="text-[11px] text-slate-400">
                    {panel220VSpec.mainBreakerCurve === 'D' ? 'Curva D: Suporta inrush de magnetização do trafo sem desarme' : 'Curva C: Proteção padrão de alimentador'}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Barramento & Surtos (DPS)</span>
                  <p className="text-white">{panel220VSpec.dpsSpec}</p>
                  <p>Capacidade Barramento: <strong className="text-blue-400">{panel220VSpec.busbarRatingA}A</strong></p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Cabos do Primário / Alimentador</span>
                  <p className="text-white font-bold">{panel220VSpec.cableGaugeMM2} mm² de Cobre</p>
                  <p className="text-slate-400">Gabinete DIN: {panel220VSpec.dinModulesCount} módulos ({sizing.panelSpecification.ipRating})</p>
                </div>
              </div>
            )}

            {selectedNodeDetails === 'panel380' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Proteção Diferencial-Residual (DR)</span>
                  <p className="text-emerald-400 font-bold">{panel380VSpec.drType}</p>
                  <p className="text-[11px] text-slate-400">Exclusivo por ponto de recarga conforme NBR 17019 Item 5.3</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Proteção Geral & Terminal</span>
                  <p>Geral Secundário: <strong className="text-white">{panel380VSpec.mainBreakerA}A 3P Curva C</strong></p>
                  <p>Terminal Carregador: <strong className="text-orange-300">{panel380VSpec.terminalBreakerA}A Curva C</strong></p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Aterramento & DPS 380V</span>
                  <p className="text-white">{panel380VSpec.dpsSpec}</p>
                  <p className="text-emerald-400 font-bold">{panel380VSpec.groundingSystem}</p>
                </div>
              </div>
            )}

            {selectedNodeDetails === 'charger' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Parâmetros de Alimentação</span>
                  <p className="text-white font-bold">{chargerPowerKW} kW ({chargerVoltage}V {chargerPhases === 3 ? 'Trifásico' : 'Bifásico'})</p>
                  <p className="text-slate-400">Corrente nominal: {sizing.chargerDesignCurrentA}A (Modulada: {simulatedCurrentA}A)</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Circuito Terminal</span>
                  <p>Distância: <strong className="text-white">{cableLengthMeters} metros</strong></p>
                  <p>Condutor: <strong className="text-orange-400">{sizing.cableGaugePhaseMM2} mm²</strong></p>
                  <p>Queda de Tensão: <strong className="text-emerald-400">{sizing.calculatedVoltageDropPercent}% ≤ 2.0%</strong></p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Segurança Integrada</span>
                  <p className="text-white">Botoeira EPO a ≤ 5m (IT-41)</p>
                  <p className="text-emerald-400 font-bold">Coordenação total com a NBR 17019</p>
                </div>
              </div>
            )}

            {selectedNodeDetails === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Concessionária & Norma</span>
                  <p className="text-white font-bold">{utility} • Norma ND-5.1 (BT)</p>
                  <p className="text-slate-400">Tensão Nominal: {gridVoltageStr}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Diagnóstico de Desarme</span>
                  <p className="text-white font-bold">Disjuntor Padrão: {sizing.breakerTripDiagnosis.currentBreakerA}A</p>
                  <p className={sizing.breakerTripDiagnosis.willTripWithoutDLM ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                    {sizing.breakerTripDiagnosis.willTripWithoutDLM ? "Requer Gestão DLM para evitar queda" : "Padrão comporta sem risco de desarme"}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Demanda Simultânea Total</span>
                  <p className="text-white font-bold">{sizing.totalSimultaneousDemandKW} kW</p>
                  <p className="text-slate-400">Limite do Padrão: {sizing.gridHeadroomKW > 0 ? `+${sizing.gridHeadroomKW} kW folga` : 'No limite com DLM'}</p>
                </div>
              </div>
            )}

            {selectedNodeDetails === 'vehicle' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Estado da Bateria (SOC)</span>
                  <p className="text-white font-bold">{batterySOC}% Carregado</p>
                  <p className="text-slate-400">Potência Atual de Injeção: {activeDeliveredKW} kW</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Inversor de Bordo (OBC)</span>
                  <p className="text-white font-bold">
                    {chargerPhases === 3 ? "OBC Trifásico 11 kW / 22 kW AC" : "OBC Monofásico/Bifásico 7 kW AC"}
                  </p>
                  <p className="text-slate-400">Curva de carga com modulação CC/CV</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tempo Restante Estimado</span>
                  <p className="text-amber-400 font-bold">
                    ~{Math.max(1, Math.round(((100 - batterySOC) * 0.6) / (activeDeliveredKW / 10)))} horas até 100%
                  </p>
                  <p className="text-emerald-400 font-bold">Fluxo seguro e contínuo NBR 17019</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
