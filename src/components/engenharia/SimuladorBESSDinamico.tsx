"use client";
import React, { useState, useMemo } from "react";
import { 
  Battery, Zap, Sun, Activity, TrendingDown, ArrowDownUp, 
  Settings, CheckCircle2, ShieldCheck, Play, RefreshCw, BarChart2, Info
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine
} from "recharts";
import { pvlibSimulate } from "@/lib/engenharia/solarEngine";

interface SimuladorBESSDinamicoProps {
  solarKWpDefault?: number;
  hspDefault?: number;
  latDefault?: number;
  lonDefault?: number;
}

export function SimuladorBESSDinamico({
  solarKWpDefault = 100,
  hspDefault = 5.2,
  latDefault = -19.91,
  lonDefault = -43.93
}: SimuladorBESSDinamicoProps) {

  // System Setup
  const [solarKWp, setSolarKWp] = useState(solarKWpDefault);
  const [diaPerfil, setDiaPerfil] = useState<'VERAO' | 'INVERNO' | 'NULBLADO'>('VERAO');
  
  // BESS Specs
  const [capacidadeKWh, setCapacidadeKWh] = useState(150);
  const [potenciaBessKW, setPotenciaBessKW] = useState(50);
  const [dodMax, setDodMax] = useState(0.9); // 90%
  const [rte, setRte] = useState(0.90); // 90% Round Trip Efficiency
  const [socInicial, setSocInicial] = useState(0.20); // 20%
  const [estrategia, setEstrategia] = useState<'AUTOCONSUMO' | 'PEAK_SHAVING' | 'ARBITRAGEM'>('PEAK_SHAVING');

  // Customer Load Curve Profile (24h)
  const [perfilDemanda, setPerfilDemanda] = useState<'INDUSTRIAL_PONTA' | 'COMERCIAL_DIURNO' | 'IRRIGANTE_NOTURNO'>('INDUSTRIAL_PONTA');
  const [picoDemandaKW, setPicoDemandaKW] = useState(80);

  // Dynamic 24-Hour Simulation Engine
  const simulationResults = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minSoc = (1 - dodMax) * 100; // e.g. 10%
    const maxSoc = 100;

    // 1. Generate Hourly PV Generation Curve (using PVLIB model)
    const baseDate = diaPerfil === 'VERAO' ? new Date(2026, 0, 15) : new Date(2026, 5, 21);
    const pvHourly = hours.map(h => {
      const ts = new Date(baseDate);
      ts.setHours(h, 30, 0, 0);

      let ghi = 0;
      if (h >= 6 && h <= 18) {
        const solarHour = h + 0.5;
        const peakGhi = diaPerfil === 'VERAO' ? 950 : (diaPerfil === 'INVERNO' ? 650 : 350);
        ghi = Math.max(0, peakGhi * Math.sin(((solarHour - 6) / 12) * Math.PI));
      }

      const kw = pvlibSimulate({
        timestamp: ts,
        irradianciaGHI: ghi,
        tempAmbiente: diaPerfil === 'VERAO' ? 30 : 20,
        capacidadeKWp: solarKWp,
        latitude: latDefault,
        longitude: lonDefault,
        inclinacao: 15,
        orientacao: 0
      });

      return Math.round(kw * 10) / 10;
    });

    // 2. Generate Customer Demand Profile (kW)
    const demandHourly = hours.map(h => {
      let mult = 0.3;
      if (perfilDemanda === 'INDUSTRIAL_PONTA') {
        if (h >= 8 && h < 18) mult = 0.7;
        else if (h >= 18 && h < 21) mult = 1.0; // Pico Horário de Ponta
        else if (h >= 21 && h < 23) mult = 0.5;
        else mult = 0.25;
      } else if (perfilDemanda === 'COMERCIAL_DIURNO') {
        if (h >= 8 && h <= 18) mult = 0.95;
        else mult = 0.2;
      } else { // IRRIGANTE_NOTURNO
        if (h >= 21 || h < 6) mult = 1.0;
        else mult = 0.15;
      }
      return Math.round(picoDemandaKW * mult * 10) / 10;
    });

    // 3. Dynamic BESS Hourly Charging / Discharging Simulation
    let currentEnergyKWh = (capacidadeKWh * socInicial);
    const hourlyData: any[] = [];
    let totalCargaKWh = 0;
    let totalDescargaKWh = 0;
    let maxDemandaSemBESS = 0;
    let maxDemandaComBESS = 0;

    for (let h = 0; h < 24; h++) {
      const genSolar = pvHourly[h];
      const load = demandHourly[h];
      maxDemandaSemBESS = Math.max(maxDemandaSemBESS, load);

      const netBalance = genSolar - load; // >0 is excess solar, <0 is deficit
      let cargaKW = 0;
      let descargaKW = 0;

      const horaStr = `${String(h).padStart(2, '0')}:00`;
      const isPonta = (h >= 18 && h < 21);
      const isForaPontaMadrugada = (h >= 0 && h < 6);

      if (estrategia === 'PEAK_SHAVING') {
        const targetPeak = picoDemandaKW * 0.65; // Cut peak above 65%
        if (load > targetPeak) {
          const neededKW = load - targetPeak;
          descargaKW = Math.min(neededKW, potenciaBessKW);
        } else if (netBalance > 0) {
          cargaKW = Math.min(netBalance, potenciaBessKW);
        }
      } else if (estrategia === 'ARBITRAGEM') {
        if (isForaPontaMadrugada) {
          // Charge battery from grid during cheap night hours
          cargaKW = Math.min(potenciaBessKW, (capacidadeKWh * maxSoc / 100 - currentEnergyKWh));
        } else if (isPonta) {
          // Discharge battery completely during peak tariff hours (18h-21h)
          descargaKW = Math.min(potenciaBessKW, load);
        } else if (netBalance > 0) {
          cargaKW = Math.min(netBalance, potenciaBessKW);
        }
      } else { // AUTOCONSUMO
        if (netBalance > 0) {
          cargaKW = Math.min(netBalance, potenciaBessKW);
        } else if (netBalance < 0) {
          descargaKW = Math.min(Math.abs(netBalance), potenciaBessKW);
        }
      }

      // Apply battery capacity limits (kWh) & Efficiency
      const maxChargeKWh = Math.max(0, (capacidadeKWh * (maxSoc / 100)) - currentEnergyKWh);
      cargaKW = Math.min(cargaKW, maxChargeKWh);

      const maxDischargeKWh = Math.max(0, currentEnergyKWh - (capacidadeKWh * (minSoc / 100)));
      descargaKW = Math.min(descargaKW, maxDischargeKWh);

      // Energy Balance Update
      currentEnergyKWh += (cargaKW * Math.sqrt(rte)) - (descargaKW / Math.sqrt(rte));
      currentEnergyKWh = Math.max(capacidadeKWh * (minSoc / 100), Math.min(capacidadeKWh * (maxSoc / 100), currentEnergyKWh));

      totalCargaKWh += cargaKW;
      totalDescargaKWh += descargaKW;

      const currentSocPercent = Math.round((currentEnergyKWh / capacidadeKWh) * 100);

      // Grid net interaction
      const netGridKW = Math.round((load + cargaKW - genSolar - descargaKW) * 10) / 10;
      const demandaRedeComBESS = Math.max(0, netGridKW);
      const injecaoRede = netGridKW < 0 ? Math.abs(netGridKW) : 0;

      maxDemandaComBESS = Math.max(maxDemandaComBESS, demandaRedeComBESS);

      hourlyData.push({
        hora: horaStr,
        geracaoSolar: genSolar,
        demandaBruta: load,
        cargaBateria: Math.round(cargaKW * 10) / 10,
        descargaBateria: Math.round(descargaKW * 10) / 10,
        soc: currentSocPercent,
        demandaRedeSemBESS: load,
        demandaRedeComBESS: demandaRedeComBESS,
        injecaoRede: Math.round(injecaoRede * 10) / 10,
        isPonta
      });
    }

    const picoReduzidoKW = Math.max(0, maxDemandaSemBESS - maxDemandaComBESS);

    return {
      hourlyData,
      totalCargaKWh: Math.round(totalCargaKWh),
      totalDescargaKWh: Math.round(totalDescargaKWh),
      maxDemandaSemBESS: Math.round(maxDemandaSemBESS),
      maxDemandaComBESS: Math.round(maxDemandaComBESS),
      picoReduzidoKW: Math.round(picoReduzidoKW),
      reducaoPicoPercent: Math.round((picoReduzidoKW / (maxDemandaSemBESS || 1)) * 100)
    };
  }, [solarKWp, diaPerfil, capacidadeKWh, potenciaBessKW, dodMax, rte, socInicial, estrategia, perfilDemanda, picoDemandaKW, latDefault, lonDefault]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-[#1E3A8A] via-blue-900 to-[#00BFA5] p-6 rounded-2xl text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Battery className="w-7 h-7 text-[#00BFA5]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Operação Dinâmica 24h
            </span>
            <h2 className="text-xl font-black mt-1">Simulador Solar + BESS (Acompanhamento Dinâmico)</h2>
            <p className="text-blue-100 text-xs">Carga/Descarga, Estado de Carga (SOC) e Corte de Pico de Demanda</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
          <Activity className="w-4 h-4 text-[#00BFA5] animate-pulse" />
          <span>Modelo de Células: LFP (LiFePO4)</span>
        </div>
      </div>

      {/* Control Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
        
        {/* PV Plant Config */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Sun className="w-3.5 h-3.5 text-amber-500" /> Usina FV (kWp)
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-sm"
            value={solarKWp}
            onChange={e => setSolarKWp(parseFloat(e.target.value) || 0)}
          />
          <div className="flex gap-1 mt-2">
            {(['VERAO', 'INVERNO', 'NULBLADO'] as const).map(p => (
              <button
                key={p}
                onClick={() => setDiaPerfil(p)}
                className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase transition-all ${diaPerfil === p ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Load Curve Config */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-blue-600" /> Perfil de Carga (Pico kW)
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-sm"
            value={picoDemandaKW}
            onChange={e => setPicoDemandaKW(parseFloat(e.target.value) || 0)}
          />
          <select
            className="w-full mt-2 px-2 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600"
            value={perfilDemanda}
            onChange={e => setPerfilDemanda(e.target.value as any)}
          >
            <option value="INDUSTRIAL_PONTA">Indústria (Pico 18h-21h)</option>
            <option value="COMERCIAL_DIURNO">Comercial (08h-18h)</option>
            <option value="IRRIGANTE_NOTURNO">Irrigante (Noturno 21h-06h)</option>
          </select>
        </div>

        {/* BESS Battery Config */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-[#00BFA5]" /> BESS (kWh / kW Inversor)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              title="Capacidade Nominal (kWh)"
              placeholder="kWh"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-[#1E3A8A] text-sm"
              value={capacidadeKWh}
              onChange={e => setCapacidadeKWh(parseFloat(e.target.value) || 0)}
            />
            <input
              type="number"
              title="Potência do Inversor (kW)"
              placeholder="kW"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-[#00BFA5] text-sm"
              value={potenciaBessKW}
              onChange={e => setPotenciaBessKW(parseFloat(e.target.value) || 0)}
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-medium">DoD: {dodMax * 100}% | Eficiência RTE: {rte * 100}%</p>
        </div>

        {/* BESS Application Strategy */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Settings className="w-3.5 h-3.5 text-purple-600" /> Aplicação BESS
          </label>
          <select
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-sm"
            value={estrategia}
            onChange={e => setEstrategia(e.target.value as any)}
          >
            <option value="PEAK_SHAVING">Peak Shaving (Corte de Ponta)</option>
            <option value="ARBITRAGEM">Arbitragem Tarifária (Carregar FP / Descarregar P)</option>
            <option value="AUTOCONSUMO">Autoconsumo Solar Max (Self-Consumption)</option>
          </select>
          <div className="mt-2 text-[10px] text-slate-500 bg-purple-50 p-1.5 rounded-lg border border-purple-100 font-medium">
            {estrategia === 'PEAK_SHAVING' && "Corta picos de demanda da rede elétrica acima da meta."}
            {estrategia === 'ARBITRAGEM' && "Carrega na tarifa barata e injeta na tarifa de ponta."}
            {estrategia === 'AUTOCONSUMO' && "Armazena a sobra solar diurna para uso noturno."}
          </div>
        </div>

      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Pico Sem BESS</p>
          <p className="text-2xl font-black text-[#1E3A8A] mt-1">{simulationResults.maxDemandaSemBESS} kW</p>
          <p className="text-[10px] text-blue-600 mt-0.5">Demanda máxima original</p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Pico Com BESS</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">{simulationResults.maxDemandaComBESS} kW</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Redução de {simulationResults.picoReduzidoKW} kW ({simulationResults.reducaoPicoPercent}%)</p>
        </div>

        <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Energia Cicada</p>
          <p className="text-2xl font-black text-purple-900 mt-1">{simulationResults.totalDescargaKWh} kWh/dia</p>
          <p className="text-[10px] text-purple-600 mt-0.5">Carga acumulada: {simulationResults.totalCargaKWh} kWh</p>
        </div>

        <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Dimensionamento Ideal</p>
          <p className="text-lg font-black text-amber-900 mt-1">{capacidadeKWh} kWh / {potenciaBessKW} kW</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Ratio C-Rate: {(potenciaBessKW / (capacidadeKWh || 1)).toFixed(2)}C</p>
        </div>
      </div>

      {/* Recharts: State of Charge (SOC %) Dynamic Curve */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Battery className="w-4 h-4 text-[#00BFA5]" /> Curva de Estado de Carga da Bateria (SOC %) — 24 Horas
          </h3>
          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Mín: {(1 - dodMax) * 100}% | Máx: 100%
          </span>
        </div>

        <div className="h-64 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulationResults.hourlyData}>
              <defs>
                <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00BFA5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00BFA5" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} stroke="#94A3B8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94A3B8" unit="%" />
              <Tooltip 
                formatter={(val: any) => [`${val}%`, 'State of Charge (SOC)']}
                contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #CBD5E1' }}
              />
              <ReferenceLine y={(1 - dodMax) * 100} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Limite DoD', fill: '#EF4444', fontSize: 10 }} />
              <Area type="monotone" dataKey="soc" stroke="#00BFA5" strokeWidth={3} fillOpacity={1} fill="url(#socGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recharts: Power Flow Curves 24h (Solar, Load, BESS Charge, BESS Discharge, Net Grid) */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#1E3A8A]" /> Fluxo de Potência (Geração FV, Carga do Cliente, Carga/Descarga BESS)
        </h3>

        <div className="h-72 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={simulationResults.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" unit=" kW" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #CBD5E1' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="geracaoSolar" name="Geração Solar (kW)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demandaBruta" name="Carga Cliente (kW)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cargaBateria" name="Carga BESS (kW)" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="descargaBateria" name="Descarga BESS (kW)" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demandaRedeComBESS" name="Demanda Líquida Rede (kW)" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sizing Recommendation Footer */}
      <div className="bg-amber-50/50 border border-amber-200/70 p-4 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-900">Recomendação de Dimensionamento para BESS</p>
            <p className="text-amber-800">
              Para atender a aplicação <span className="font-bold">{estrategia}</span> com corte de pico de <span className="font-bold">{simulationResults.picoReduzidoKW} kW</span>, recomenda-se um banco de baterias LFP de <span className="font-bold">{capacidadeKWh} kWh</span> com inversor bidirecional de <span className="font-bold">{potenciaBessKW} kW</span>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
