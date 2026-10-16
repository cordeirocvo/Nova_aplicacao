"use client";

import React, { useState, useMemo } from "react";
import { 
  Sliders, Cpu, Zap, ShieldCheck, AlertTriangle, 
  BatteryCharging, Clock, DollarSign, CheckCircle2, 
  Layers, RefreshCw, Info, ShoppingCart, HelpCircle, Activity, SunMedium
} from "lucide-react";
import DLMSystemVisualizer from "./DLMSystemVisualizer";

export type MarketSystemId = 'beny' | 'weg' | 'schneider' | 'abb' | 'generic';

interface SimulatedVehicle {
  id: string;
  name: string;
  nominalKW: number;
  phases: 1 | 3;
  voltageV: number;
  priority: 'normal' | 'alta' | 'vip';
  socPercent: number;
}

interface DLMMarketSimulatorProps {
  initialGridLimitKW?: number;
  initialBuildingLoadKW?: number;
  initialChargersPowerKW?: number;
  onApplyPresetToProject?: (systemId: MarketSystemId, safePowerKW: number) => void;
}

export default function DLMMarketSimulator({
  initialGridLimitKW = 75,
  initialBuildingLoadKW = 35,
  initialChargersPowerKW = 44,
  onApplyPresetToProject
}: DLMMarketSimulatorProps) {
  // ─── ESTADOS DA SIMULAÇÃO ────────────────────────────────────────────────
  const [selectedSystem, setSelectedSystem] = useState<MarketSystemId>('beny');
  const [gridLimitKW, setGridLimitKW] = useState<number>(initialGridLimitKW);
  const [safetyMarginPercent, setSafetyMarginPercent] = useState<number>(10); // 10% margem de segurança
  const [buildingLoadKW, setBuildingLoadKW] = useState<number>(initialBuildingLoadKW);
  const [solarGenerationKW, setSolarGenerationKW] = useState<number>(0);
  const [isPeakHour, setIsPeakHour] = useState<boolean>(false); // Horário de Ponta (17h30 - 20h30)
  const [peakPolicy, setPeakPolicy] = useState<'block' | 'throttle_6A' | 'allow_surplus'>('throttle_6A');

  // Frota de Veículos Conectados Simultaneamente
  const [vehicles, setVehicles] = useState<SimulatedVehicle[]>([
    { id: 'v1', name: 'Veículo 1 (BYD Dolphin / AC)', nominalKW: 7.4, phases: 1, voltageV: 220, priority: 'normal', socPercent: 35 },
    { id: 'v2', name: 'Veículo 2 (GWM Ora 03 / AC)', nominalKW: 11.0, phases: 3, voltageV: 380, priority: 'normal', socPercent: 50 },
    { id: 'v3', name: 'Veículo 3 (Volvo EX30 / Fast DC)', nominalKW: 30.0, phases: 3, voltageV: 380, priority: 'alta', socPercent: 20 }
  ]);

  // Limite efetivo de segurança da instalação
  const effectiveGridLimitKW = useMemo(() => {
    return Number((gridLimitKW * (1 - safetyMarginPercent / 100)).toFixed(1));
  }, [gridLimitKW, safetyMarginPercent]);

  // Demanda líquida do imóvel considerando eventual geração solar
  const netBuildingLoadKW = useMemo(() => {
    return Math.max(0, Number((buildingLoadKW - solarGenerationKW).toFixed(1)));
  }, [buildingLoadKW, solarGenerationKW]);

  // Folga de potência para veículos antes do DLM atuar
  const rawAvailableKW = useMemo(() => {
    return Math.max(0, Number((effectiveGridLimitKW - netBuildingLoadKW).toFixed(1)));
  }, [effectiveGridLimitKW, netBuildingLoadKW]);

  // Carga nominal total sem controle (se todos os carros puxassem 100%)
  const totalUncontrolledEVKW = useMemo(() => {
    return Number(vehicles.reduce((acc, v) => acc + v.nominalKW, 0).toFixed(1));
  }, [vehicles]);

  // Demanda Total SEM DLM (provoca desarme do disjuntor)
  const totalUncontrolledDemandKW = Number((netBuildingLoadKW + totalUncontrolledEVKW).toFixed(1));
  const isOverloadedWithoutDLM = totalUncontrolledDemandKW > gridLimitKW;
  const overloadDeficitKW = Math.max(0, Number((totalUncontrolledDemandKW - gridLimitKW).toFixed(1)));

  // ─── ALGORITMO DINÂMICO DE ALOCAÇÃO DO SISTEMA DE MERCADO ────────────────
  const simulationResults = useMemo(() => {
    let availablePowerForEV = rawAvailableKW;

    // Regra Tarifária de Horário de Ponta
    if (isPeakHour) {
      if (peakPolicy === 'block') {
        availablePowerForEV = 0;
      } else if (peakPolicy === 'throttle_6A') {
        // Limita ao mínimo normativo de sobrevivência (6A por carro)
        const min6AKW = vehicles.reduce((sum, v) => {
          const p = v.phases === 3 ? (Math.sqrt(3) * v.voltageV * 6.0 * 0.98) / 1000 : (v.voltageV * 6.0 * 0.98) / 1000;
          return sum + p;
        }, 0);
        availablePowerForEV = Math.min(availablePowerForEV, min6AKW);
      } else if (peakPolicy === 'allow_surplus') {
        // Só permite usar o excedente solar
        availablePowerForEV = Math.min(availablePowerForEV, Math.max(0, solarGenerationKW - buildingLoadKW));
      }
    }

    // Se a folga for suficiente para atender a todos a 100%
    if (availablePowerForEV >= totalUncontrolledEVKW) {
      const allocated = vehicles.map(v => {
        const curA = v.phases === 3 
          ? (v.nominalKW * 1000) / (Math.sqrt(3) * v.voltageV * 0.98)
          : (v.nominalKW * 1000) / (v.voltageV * 0.98);
        return {
          ...v,
          allocatedKW: v.nominalKW,
          allocatedA: Number(curA.toFixed(1)),
          percentOfNominal: 100,
          status: 'plena' as const
        };
      });
      return {
        allocatedVehicles: allocated,
        totalControlledEVKW: totalUncontrolledEVKW,
        isThrottled: isPeakHour,
        totalControlledDemandKW: Number((netBuildingLoadKW + totalUncontrolledEVKW).toFixed(1))
      };
    }

    // Algoritmo de rateio proporcional ponderado por prioridade
    let totalWeight = vehicles.reduce((acc, v) => acc + (v.priority === 'vip' ? 2.5 : v.priority === 'alta' ? 1.5 : 1.0), 0);
    let assignedEVKW = 0;

    const allocated = vehicles.map(v => {
      const weight = (v.priority === 'vip' ? 2.5 : v.priority === 'alta' ? 1.5 : 1.0) / totalWeight;
      let targetShareKW = availablePowerForEV * weight;

      // Limita à potência nominal máxima do carregador
      targetShareKW = Math.min(v.nominalKW, targetShareKW);

      // Limita inferiormente à corrente mínima IEC 61851 de 6A (ou 0 se disponível for zero)
      const min6AKW = v.phases === 3 
        ? (Math.sqrt(3) * v.voltageV * 6.0 * 0.98) / 1000
        : (v.voltageV * 6.0 * 0.98) / 1000;

      if (availablePowerForEV < 1.0) {
        targetShareKW = 0;
      } else if (targetShareKW < min6AKW) {
        targetShareKW = availablePowerForEV >= min6AKW ? min6AKW : 0;
      }

      const allocatedA = targetShareKW > 0 
        ? (v.phases === 3 
            ? (targetShareKW * 1000) / (Math.sqrt(3) * v.voltageV * 0.98) 
            : (targetShareKW * 1000) / (v.voltageV * 0.98))
        : 0;

      assignedEVKW += targetShareKW;

      const percent = Math.round((targetShareKW / v.nominalKW) * 100);
      let status: 'plena' | 'modulada' | 'minima' | 'pausada' = 'modulada';
      if (percent >= 98) status = 'plena';
      else if (targetShareKW <= 0) status = 'pausada';
      else if (allocatedA <= 6.5) status = 'minima';

      return {
        ...v,
        allocatedKW: Number(targetShareKW.toFixed(1)),
        allocatedA: Number(allocatedA.toFixed(1)),
        percentOfNominal: percent,
        status
      };
    });

    const totalControlledEV = Number(assignedEVKW.toFixed(1));
    return {
      allocatedVehicles: allocated,
      totalControlledEVKW: totalControlledEV,
      isThrottled: true,
      totalControlledDemandKW: Number((netBuildingLoadKW + totalControlledEV).toFixed(1))
    };
  }, [vehicles, rawAvailableKW, totalUncontrolledEVKW, isPeakHour, peakPolicy, solarGenerationKW, buildingLoadKW, netBuildingLoadKW]);

  // Lista de Materiais do Sistema Selecionado (BOM)
  const systemBOM = {
    beny: [
      { code: 'BENY-DLB-01', name: 'Controlador Dinâmico BENY DLB Box Inteligente', qtd: '1 un', desc: 'Central de controle com interface RS485 Modbus e algoritmo preditivo' },
      { code: 'TC-SPLIT-250', name: 'Transformador de Corrente (TC) Bipartido 250/5A Classe 0.5', qtd: '3 un', desc: 'Instalação direta nos cabos de entrada da CEMIG sem corte de energia' },
      { code: 'CABO-RS485-BELDEN', name: 'Cabo Blindado Par Trançado Shielded AWG24 (120Ω)', qtd: '50 m', desc: 'Comunicação imune a ruídos eletromagnéticos de inversores e motores' },
      { code: 'DPS-DATA-CLAMPER', name: 'Protetor contra Surtos para Linha Serial RS485', qtd: '2 un', desc: 'Proteção contra transientes nas portas de comunicação dos carregadores' }
    ],
    weg: [
      { code: 'WEG-WEMOB-DLM-DIN', name: 'Controlador Central WEG WEMOB Smart DLM', qtd: '1 un', desc: 'Módulo de automação em trilho DIN para até 30 estações WEMOB' },
      { code: 'WEG-MMW03-TC', name: 'Multimedidor de Grandezas Elétricas MMW03 + 3x TCs 400/5A', qtd: '1 cj', desc: 'Medição de corrente, tensão, FP e distorção harmônica no QGBT' },
      { code: 'SW-IND-ETHERNET', name: 'Switch Industrial 5 Portas Fast Ethernet Trilho DIN', qtd: '1 un', desc: 'Rede local com isolamento galvânico para comunicação com totens' },
      { code: 'CABO-CAT6-FSTP', name: 'Cabo de Rede U/FTP Categoria 6 Industrial', qtd: '60 m', desc: 'Comunicação Modbus TCP e telemetria de recarga em alta velocidade' }
    ],
    schneider: [
      { code: 'SCH-EVA-LMS-100', name: 'Gateway Schneider EcoStruxure EV Charging Expert', qtd: '1 un', desc: 'Servidor industrial para até 100 pontos com balanceamento matricial' },
      { code: 'SCH-IEM3255', name: 'Medidor de Energia PowerLogic iEM3255 com Modbus/IP', qtd: '1 un', desc: 'Medição classe 0.5S certificada com suporte a TCs 1A/5A' },
      { code: 'FONTE-ABL8-24V', name: 'Fonte Chaveada 24Vdc 2.5A Trilho DIN Schneider Phaseo', qtd: '1 un', desc: 'Alimentação ininterrupta do gateway e módulos de telemetria' }
    ],
    abb: [
      { code: 'ABB-B23-STE', name: 'Medidor de Energia Trifásico ABB B23 312-100 (65A Direto)', qtd: '1 un', desc: 'Comunicação RS485 Modbus integrada para carregadores Terra AC' },
      { code: 'ABB-DLM-LICENSE', name: 'Habilitação de Firmware Dynamic Load Balancing ABB', qtd: '1 un', desc: 'Controle de balanceamento de fase assimétrico entre estações' }
    ],
    generic: [
      { code: 'GW-OCPP-SMART', name: 'Gateway Local OCPP 1.6J Smart Charging Profile Core', qtd: '1 un', desc: 'Servidor local com Linux embarcado para gestão de perfis de potência' },
      { code: 'SMART-METER-MODBUS', name: 'Medidor Inteligente Bidirecional Modbus RS485', qtd: '1 un', desc: 'Telemetria de fluxo de potência ativa e reativa em tempo real' }
    ]
  }[selectedSystem] || [];

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-6">
      
      {/* ─── CABEÇALHO DO SIMULADOR ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#E45318]" />
              Simulador Eletrotécnico de Mercado
            </span>
            <span className="text-xs text-slate-400 font-mono">Dynamic Load Management 4.0</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Simulador de Gestão Dinâmica de Carga & Contingência
          </h2>
          <p className="text-xs text-slate-400">
            Simule em tempo real o comportamento dos sistemas prontos de mercado (BENY, WEG, Schneider, ABB) sob flutuações de consumo do imóvel e tarifas horárias.
          </p>
        </div>

        {/* Seletor do Sistema de Mercado */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'beny', label: 'BENY DLB Box', desc: 'TCs + Modbus' },
            { id: 'weg', label: 'WEG WEMOB', desc: 'Central DLM' },
            { id: 'schneider', label: 'Schneider', desc: 'LMS Expert' },
            { id: 'abb', label: 'ABB Terra', desc: 'MID B23' }
          ].map(sys => (
            <button
              key={sys.id}
              type="button"
              onClick={() => setSelectedSystem(sys.id as MarketSystemId)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSystem === sys.id
                  ? 'bg-[#E45318] text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div>{sys.label}</div>
              <div className="text-[9px] font-normal opacity-80">{sys.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── PAINEL DE CONTROLES INTERATIVOS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
        
        {/* Controle 1: Limite do Padrão da Concessionária */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Limite do Padrão (kW):
            </span>
            <span className="text-sm font-black text-amber-400 font-mono">{gridLimitKW} kW</span>
          </div>
          <input
            type="range"
            min="20"
            max="150"
            step="5"
            value={gridLimitKW}
            onChange={(e) => setGridLimitKW(Number(e.target.value))}
            className="w-full accent-[#E45318] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>38 kW (100A)</span>
            <span>75 kW (200A)</span>
            <span>150 kW (400A)</span>
          </div>
        </div>

        {/* Controle 2: Carga do Imóvel em Tempo Real */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Carga do Imóvel:
            </span>
            <span className="text-sm font-black text-blue-400 font-mono">{buildingLoadKW} kW</span>
          </div>
          <input
            type="range"
            min="0"
            max={gridLimitKW}
            step="2"
            value={buildingLoadKW}
            onChange={(e) => setBuildingLoadKW(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <button type="button" onClick={() => setBuildingLoadKW(8)} className="hover:text-blue-400">Madrugada (8kW)</button>
            <button type="button" onClick={() => setBuildingLoadKW(35)} className="hover:text-blue-400">Comercial (35kW)</button>
            <button type="button" onClick={() => setBuildingLoadKW(60)} className="hover:text-blue-400">Pico Ar (60kW)</button>
          </div>
        </div>

        {/* Controle 3: Excedente Solar Fotovoltaico */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-yellow-400" />
              Geração Solar:
            </span>
            <span className="text-sm font-black text-yellow-400 font-mono">+{solarGenerationKW} kW</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="2"
            value={solarGenerationKW}
            onChange={(e) => setSolarGenerationKW(Number(e.target.value))}
            className="w-full accent-yellow-500 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>0 kW (Noite)</span>
            <span>20 kW (Média)</span>
            <span>50 kW (Sol Pleno)</span>
          </div>
        </div>

        {/* Controle 4: Tarifa Horária & Horário de Ponta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Horário Tarifário:
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isPeakHour ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {isPeakHour ? 'HORÁRIO PONTA (17h30-20h30)' : 'FORA DE PONTA'}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPeakHour(!isPeakHour)}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                isPeakHour
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isPeakHour ? '⚠️ Simular Horário de Ponta Ativo' : '☀️ Simular Horário Fora de Ponta'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── COMPARATIVO DE SEGURANÇA: SEM DLM VS COM DLM ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Sem DLM (Risco de Desarme) */}
        <div className={`p-4 rounded-2xl border ${
          isOverloadedWithoutDLM 
            ? 'bg-rose-950/40 border-rose-600/60' 
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
              {isOverloadedWithoutDLM ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Info className="w-4 h-4 text-slate-400" />}
              Operação Convencional (SEM DLM)
            </span>
            <span className={`text-xs font-mono font-bold ${isOverloadedWithoutDLM ? 'text-rose-400' : 'text-slate-300'}`}>
              Demanda: {totalUncontrolledDemandKW} kW
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Carga Imóvel + Carga Nominal Carregadores ({totalUncontrolledEVKW} kW):</span>
              <strong className="font-mono">{totalUncontrolledDemandKW} kW</strong>
            </div>

            {isOverloadedWithoutDLM ? (
              <div className="p-2.5 rounded-xl bg-rose-900/40 border border-rose-600/60 text-rose-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  🚨 DESARME DO DISJUNTOR GERAL IMINENTE!
                </div>
                <div>
                  A demanda ultrapassa a capacidade do padrão ({gridLimitKW} kW) em <b>+{overloadDeficitKW} kW</b>. A instalação sofrerá queda de energia total sem o sistema DLM.
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-slate-900 text-slate-400 text-[11px]">
                Operando abaixo da capacidade do padrão. Porém, qualquer acréscimo de ar condicionado causará desarme repentino.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Com DLM (Garantia Absoluta de Proteção) */}
        <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
            <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Operação Inteligente (COM DLM {selectedSystem.toUpperCase()})
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Demanda: {simulationResults.totalControlledDemandKW} kW
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Potência Total Efetiva Entregue aos VE:</span>
              <strong className="font-mono text-emerald-400">{simulationResults.totalControlledEVKW} kW</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/40 text-emerald-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1">
                ✓ ZERO DESARMES • MARGEM DE SEGURANÇA ASSEGURADA
              </div>
              <div>
                O controlador ajusta a corrente em milissegundos. A demanda total ({simulationResults.totalControlledDemandKW} kW) nunca ultrapassa o teto seguro de <b>{effectiveGridLimitKW} kW</b>.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DETALHAMENTO DE ALOCAÇÃO POR VEÍCULO / CARREGADOR ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BatteryCharging className="w-4 h-4 text-[#00B356]" />
            Modulação Dinâmica por Veículo / Tomada Conectada
          </h3>
          <span className="text-[11px] text-slate-400">
            {simulationResults.allocatedVehicles.length} pontos de recarga monitorados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {simulationResults.allocatedVehicles.map((v) => (
            <div 
              key={v.id} 
              className={`p-3.5 rounded-2xl border transition-all ${
                v.status === 'plena'
                  ? 'bg-slate-950/80 border-emerald-500/40'
                  : v.status === 'modulada'
                  ? 'bg-slate-950/80 border-amber-500/40'
                  : v.status === 'minima'
                  ? 'bg-slate-950/80 border-orange-500/40'
                  : 'bg-slate-950/80 border-rose-500/40 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-xs font-bold text-white truncate max-w-[160px]">{v.name}</span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                  v.status === 'plena' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  v.status === 'modulada' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  v.status === 'minima' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {v.status === 'plena' ? 'Carga Plena (100%)' :
                   v.status === 'modulada' ? `DLM: ${v.percentOfNominal}%` :
                   v.status === 'minima' ? 'Mínimo IEC (6A)' : 'Pausado'}
                </span>
              </div>

              <div className="mt-2.5 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Potência Nominal:</span>
                  <span className="text-white">{v.nominalKW} kW ({v.phases === 3 ? 'Trifásico' : 'Monofásico'})</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Potência Alocada Real:</span>
                  <span className="text-emerald-400 font-bold">{v.allocatedKW} kW</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Corrente Efetiva Modulada:</span>
                  <span className="text-amber-400 font-bold">{v.allocatedA} A</span>
                </div>
              </div>

              {/* Barra de Progresso da Corrente */}
              <div className="mt-2.5 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    v.status === 'plena' ? 'bg-emerald-500' :
                    v.status === 'modulada' ? 'bg-amber-500' :
                    v.status === 'minima' ? 'bg-orange-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${v.percentOfNominal}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── DESENHO ILUSTRATIVO DE ARQUITETURA DLM ─── */}
      <DLMSystemVisualizer 
        systemType={selectedSystem}
        gridLimitKW={gridLimitKW}
        buildingLoadKW={netBuildingLoadKW}
        evLoadKW={simulationResults.totalControlledEVKW}
        isThrottled={simulationResults.isThrottled}
        evCount={vehicles.length}
        enableSolarSurplus={solarGenerationKW > 0}
        solarKW={solarGenerationKW}
      />

      {/* ─── LISTA DE MATERIAIS DE INSTALAÇÃO DO SISTEMA DLM (BOM) ─── */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            Lista de Materiais de Campo (BOM) — Kit {selectedSystem.toUpperCase()}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Pronto para Requisição de Compras</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2 pr-3">Código</th>
                <th className="py-2 px-3">Item / Especificação Técnica</th>
                <th className="py-2 px-3 text-center">Quantidade</th>
                <th className="py-2 pl-3">Aplicação no Projeto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
              {systemBOM.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-3 font-mono text-amber-400 font-bold">{item.code}</td>
                  <td className="py-2 px-3 font-semibold text-white">{item.name}</td>
                  <td className="py-2 px-3 text-center font-bold font-mono text-emerald-400">{item.qtd}</td>
                  <td className="py-2 pl-3 text-slate-400">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
