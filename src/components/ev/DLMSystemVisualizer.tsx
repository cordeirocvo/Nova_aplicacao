"use client";

import React from "react";
import { 
  Cpu, Zap, Home, ShieldCheck, ArrowRight, Gauge, 
  Layers, AlertTriangle, CheckCircle2, Sliders, Radio, Activity
} from "lucide-react";

interface DLMSystemVisualizerProps {
  systemType?: 'beny' | 'weg' | 'schneider' | 'abb' | 'generic';
  gridLimitKW: number;
  buildingLoadKW: number;
  evLoadKW: number;
  isThrottled?: boolean;
  evCount?: number;
  enableSolarSurplus?: boolean;
  solarKW?: number;
}

export default function DLMSystemVisualizer({
  systemType = 'beny',
  gridLimitKW = 75,
  buildingLoadKW = 35,
  evLoadKW = 32.5,
  isThrottled = false,
  evCount = 2,
  enableSolarSurplus = false,
  solarKW = 0
}: DLMSystemVisualizerProps) {
  const totalDemandKW = Number((buildingLoadKW + evLoadKW).toFixed(1));
  const availableMarginKW = Number(Math.max(0, gridLimitKW - totalDemandKW).toFixed(1));
  const usagePercent = Math.min(100, Math.round((totalDemandKW / gridLimitKW) * 100));

  // Título e detalhes do sistema selecionado
  const SYSTEM_CONFIGS: Record<string, {
    name: string;
    badge: string;
    desc: string;
    protocol: string;
    sensor: string;
    controller: string;
  }> = {
    beny: {
      name: "BENY DLB Box (Hardwired RS485)",
      badge: "TCs Bipartidos + Modbus",
      desc: "Medição direta nos condutores de entrada via TCs (transformadores de corrente) e comando aos carregadores BCP via RS485 com latência < 2s.",
      protocol: "RS485 Modbus RTU / Wi-Fi",
      sensor: "3x TCs Bipartidos (100A a 600A) no Padrão",
      controller: "Módulo Dinâmico BENY DLB Box"
    },
    weg: {
      name: "WEG WEMOB Smart DLM",
      badge: "Painel Hub Centralizado",
      desc: "Controlador industrial em trilho DIN com comunicação Ethernet/Modbus gerenciando até 30 estações WEMOB (Wall, Parking, Station).",
      protocol: "Modbus TCP / RTU / OCPP 1.6J",
      sensor: "Multimedidor de Grandezas Elétricas no QGBT",
      controller: "Central WEG WEMOB DLM Controller"
    },
    schneider: {
      name: "Schneider EcoStruxure LMS",
      badge: "Solução Corporativa Industrial",
      desc: "EV Charging Expert com gateway inteligente gerenciando até 1.000 pontos em múltiplos quadros com divisão por prioridades.",
      protocol: "Ethernet TCP/IP / Modbus / BACnet",
      sensor: "Medidores Schneider PowerLogic iEM3000 / PM5000",
      controller: "Gateway Schneider EcoStruxure LMS"
    },
    abb: {
      name: "ABB Dynamic Load Management",
      badge: "Medidor MID Integrado",
      desc: "Balanceamento dinâmico entre carregadores Terra AC/DC com leitura direta de medidores ABB B23/B24 e ajuste contínuo de corrente.",
      protocol: "RS485 Modbus / OCPP Smart Charging",
      sensor: "Medidor Trifásico ABB B23/B24 no Padrão",
      controller: "Firmware DLM Embarcado nos Carregadores"
    },
    generic: {
      name: "OCPP 1.6J / 2.0.1 Smart Charging",
      badge: "Protocolo Aberto Cloud/Local",
      desc: "Gestão inteligente via servidor central através de perfis padronizados ChargePointMaxProfile e TxDefaultProfile da norma OCPP.",
      protocol: "WebSockets JSON (OCPP 1.6J / 2.0.1)",
      sensor: "Smart Metering com telemetria via API/MQTT",
      controller: "Servidor OCPP / Gateway Local"
    }
  };

  const systemInfo = SYSTEM_CONFIGS[systemType] || SYSTEM_CONFIGS.beny;

  return (
    <div className="bg-[#0A192F] text-white p-5 rounded-3xl border border-slate-800 space-y-5 shadow-2xl">
      {/* Cabeçalho do Diagrama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Activity className="w-3 h-3 animate-pulse" />
              Arquitetura Eletrotécnica Ilustrada
            </span>
            <span className="text-xs text-slate-400 font-mono">NBR 17019 & IEC 61851-1</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
            Gestão Dinâmica de Carga (DLM) & Integração de Mercado
          </h3>
          <p className="text-xs text-slate-400">
            {systemInfo.desc}
          </p>
        </div>

        {/* Badge do Sistema de Mercado */}
        <div className="text-right bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl">
          <span className="text-[9px] font-mono text-slate-400 block uppercase">Sistema Selecionado:</span>
          <span className="text-xs font-black text-[#00B356]">{systemInfo.name}</span>
          <span className="text-[10px] text-amber-400 block font-mono">{systemInfo.badge}</span>
        </div>
      </div>

      {/* ─── DIAGRAMA VETORIAL ILUSTRADO (SVG RESPONSIVO) ─── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-slate-950 to-[#0d1f3c] p-4 rounded-2xl border border-slate-800">
        
        {/* Barra Superior de Status da Potência do Padrão */}
        <div className="mb-4 bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Capacidade do Padrão:</span>
              <strong className="text-white text-sm">{gridLimitKW} kW</strong>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-[10px] text-slate-400 block uppercase">Carga do Imóvel:</span>
              <strong className="text-blue-400 text-sm">{buildingLoadKW} kW</strong>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-[10px] text-slate-400 block uppercase">Carga VE (Controlada):</span>
              <strong className="text-emerald-400 text-sm">{evLoadKW} kW</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Demanda Total / Ocupação:</span>
              <div className="flex items-center gap-1.5">
                <strong className={`text-sm ${usagePercent > 95 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {totalDemandKW} kW ({usagePercent}%)
                </strong>
                {isThrottled && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                    MODULADO DLM
                  </span>
                )}
              </div>
            </div>
            <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-500 ${
                  usagePercent > 95 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* SVG ILUSTRATIVO DO SISTEMA */}
        <svg 
          viewBox="0 0 950 420" 
          className="w-full h-auto drop-shadow-md"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Definições de Gradientes e Marcadores */}
          <defs>
            <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="dlmGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E45318" />
              <stop offset="100%" stopColor="#b8380b" />
            </linearGradient>
            <linearGradient id="chargerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B356" />
              <stop offset="100%" stopColor="#00803d" />
            </linearGradient>
            <marker id="arrowEnergy" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="arrowData" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker id="arrowEV" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
          </defs>

          {/* ─── 1. POSTE / REDE CONCESSIONÁRIA ─── */}
          <g transform="translate(30, 60)">
            <rect x="0" y="0" width="140" height="150" rx="14" fill="url(#gridGrad)" stroke="#334155" strokeWidth="1.5" />
            <circle cx="70" cy="40" r="22" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M 70 26 L 62 42 L 68 42 L 65 54 L 78 38 L 72 38 Z" fill="#60a5fa" />
            <text x="70" y="80" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold" fontFamily="sans-serif">REDE PÚBLICA</text>
            <text x="70" y="98" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">CEMIG 220/127V</text>
            <text x="70" y="116" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">Limite: {gridLimitKW} kW</text>
            <rect x="20" y="128" width="100" height="14" rx="4" fill="#1e293b" />
            <text x="70" y="139" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Transformador Rua</text>
          </g>

          {/* ─── 2. PADRÃO DE ENTRADA & MEDIÇÃO COM TCs DE MEDIÇÃO ─── */}
          <g transform="translate(230, 45)">
            <rect x="0" y="0" width="180" height="180" rx="16" fill="#0f172a" stroke="#E45318" strokeWidth="1.5" />
            
            {/* Medidor e TCs */}
            <rect x="15" y="15" width="150" height="70" rx="10" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="90" y="35" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">PADRÃO DE ENTRADA</text>
            <text x="90" y="52" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">Disjuntor Padrão: 200A</text>
            
            {/* TCs Sensores (Transformadores de Corrente) */}
            <g transform="translate(25, 60)">
              <rect x="0" y="0" width="36" height="18" rx="4" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
              <text x="18" y="12" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">TC Fase R</text>

              <rect x="46" y="0" width="36" height="18" rx="4" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
              <text x="64" y="12" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">TC Fase S</text>

              <rect x="92" y="0" width="36" height="18" rx="4" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
              <text x="110" y="12" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">TC Fase T</text>
            </g>

            {/* Descrição do Sensor */}
            <rect x="15" y="95" width="150" height="40" rx="8" fill="#182234" />
            <text x="90" y="112" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">Medição em Tempo Real</text>
            <text x="90" y="127" textAnchor="middle" fill="#94a3b8" fontSize="8">Leitura a cada 100ms</text>

            <rect x="15" y="145" width="150" height="24" rx="6" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="1" />
            <text x="90" y="161" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">TCs de Alta Precisão</text>
          </g>

          {/* Linha de Energia: Rede Pública -> Padrão */}
          <path d="M 170 135 L 230 135" stroke="#38bdf8" strokeWidth="3" markerEnd="url(#arrowEnergy)" />
          <text x="200" y="125" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">Alimentação</text>

          {/* ─── 3. CARGAS DO IMÓVEL (PRIORIDADE TOTAL) ─── */}
          <g transform="translate(480, 20)">
            <rect x="0" y="0" width="170" height="115" rx="14" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="35" cy="30" r="14" fill="#3b82f6" fillOpacity="0.2" />
            <path d="M 28 32 L 35 24 L 42 32 M 30 32 L 30 38 L 40 38 L 40 32" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
            <text x="58" y="32" fill="#f8fafc" fontSize="11" fontWeight="bold">CARGAS IMÓVEL</text>
            <text x="58" y="44" fill="#94a3b8" fontSize="9">Prioridade Absoluta</text>

            <rect x="15" y="60" width="140" height="42" rx="8" fill="#1e293b" />
            <text x="25" y="77" fill="#cbd5e1" fontSize="9">Ar condicionado, luzes, computadores</text>
            <text x="25" y="93" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="monospace">Consumo: {buildingLoadKW} kW</text>
          </g>

          {/* Linha de Energia: Padrão -> Imóvel */}
          <path d="M 410 80 L 480 80" stroke="#38bdf8" strokeWidth="3" markerEnd="url(#arrowEnergy)" />

          {/* ─── 4. CONTROLADOR CENTRAL DLM (O CÉREBRO) ─── */}
          <g transform="translate(470, 165)">
            <rect x="0" y="0" width="190" height="150" rx="16" fill="#182234" stroke="#E45318" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))" />
            
            {/* Header da Gaveta DLM */}
            <rect x="0" y="0" width="190" height="34" rx="16" fill="url(#dlmGrad)" />
            <text x="95" y="22" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold" letterSpacing="0.5">
              CENTRAL DLM INTELIGENTE
            </text>

            <text x="95" y="55" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
              {systemInfo.controller}
            </text>

            <rect x="15" y="68" width="160" height="45" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="25" y="85" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Algoritmo de Cálculo Dinâmico:</text>
            <text x="25" y="98" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
              P_ve = Limite - P_imóvel
            </text>
            <text x="25" y="108" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="monospace">
              Folga Segura: {availableMarginKW} kW
            </text>

            <rect x="15" y="120" width="160" height="20" rx="5" fill="#f59e0b" fillOpacity="0.15" />
            <text x="95" y="134" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">
              {isThrottled ? "⚠️ MODULAÇÃO ATIVA: Evita desarme" : "✓ OPERAÇÃO NORMAL: Carga plena"}
            </text>
          </g>

          {/* Linha de Dados de Medição: TCs do Padrão -> Central DLM */}
          <path d="M 320 225 L 320 240 L 470 240" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowData)" />
          <text x="385" y="235" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="monospace">Sinal dos TCs (Amostragem)</text>

          {/* ─── 5. ESTAÇÕES DE RECARGA DE VEÍCULOS (MODULADAS EM TEMPO REAL) ─── */}
          
          {/* Carregador 1 */}
          <g transform="translate(730, 40)">
            <rect x="0" y="0" width="180" height="150" rx="14" fill="#0f172a" stroke="#00B356" strokeWidth="1.5" />
            <rect x="0" y="0" width="180" height="28" rx="14" fill="url(#chargerGrad)" />
            <text x="90" y="18" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">CARREGADOR VE 1 (Vaga A)</text>
            
            <circle cx="30" cy="55" r="12" fill="#00B356" fillOpacity="0.2" />
            <path d="M 27 50 L 33 55 L 27 60" stroke="#10b981" strokeWidth="1.5" fill="none" />
            <text x="50" y="52" fill="#ffffff" fontSize="10" fontWeight="bold">BENY BCP / WEG</text>
            <text x="50" y="64" fill="#94a3b8" fontSize="8">Conector Tipo 2 / CCS2</text>

            <rect x="15" y="75" width="150" height="42" rx="8" fill="#1e293b" />
            <text x="25" y="92" fill="#94a3b8" fontSize="8">Comando Recebido:</text>
            <text x="25" y="108" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace">
              {(evLoadKW / Math.max(1, evCount)).toFixed(1)} kW ({isThrottled ? "Modulado" : "Pleno"})
            </text>

            <rect x="15" y="124" width="150" height="16" rx="4" fill="#00B356" fillOpacity="0.15" />
            <text x="90" y="136" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">
              {isThrottled ? "Corrente Limitada pela Central" : "Corrente Nominal (32A)"}
            </text>
          </g>

          {/* Carregador 2 */}
          <g transform="translate(730, 220)">
            <rect x="0" y="0" width="180" height="150" rx="14" fill="#0f172a" stroke="#00B356" strokeWidth="1.5" />
            <rect x="0" y="0" width="180" height="28" rx="14" fill="url(#chargerGrad)" />
            <text x="90" y="18" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">CARREGADOR VE 2 (Vaga B)</text>
            
            <circle cx="30" cy="55" r="12" fill="#00B356" fillOpacity="0.2" />
            <path d="M 27 50 L 33 55 L 27 60" stroke="#10b981" strokeWidth="1.5" fill="none" />
            <text x="50" y="52" fill="#ffffff" fontSize="10" fontWeight="bold">BENY / ABB Fast</text>
            <text x="50" y="64" fill="#94a3b8" fontSize="8">Pistola 2 / Dual Gun</text>

            <rect x="15" y="75" width="150" height="42" rx="8" fill="#1e293b" />
            <text x="25" y="92" fill="#94a3b8" fontSize="8">Comando Recebido:</text>
            <text x="25" y="108" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace">
              {(evLoadKW / Math.max(1, evCount)).toFixed(1)} kW ({isThrottled ? "Modulado" : "Pleno"})
            </text>

            <rect x="15" y="124" width="150" height="16" rx="4" fill="#00B356" fillOpacity="0.15" />
            <text x="90" y="136" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">
              {isThrottled ? "Divisão Dinâmica Ativa" : "Corrente Nominal (32A)"}
            </text>
          </g>

          {/* Linhas de Comunicação DLM: Central DLM -> Carregadores */}
          <path d="M 660 215 L 695 215 L 695 115 L 730 115" stroke="#E45318" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrowEV)" />
          <path d="M 660 245 L 695 245 L 695 295 L 730 295" stroke="#E45318" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrowEV)" />
          <text x="695" y="175" textAnchor="middle" fill="#E45318" fontSize="8" fontWeight="bold" transform="rotate(-90 695 175)">
            Controle Modbus / RS485 / OCPP
          </text>

          {/* Linha de Potência Elétrica: Padrão -> Carregadores */}
          <path d="M 380 225 L 380 385 L 710 385 L 710 330 L 730 330" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrowEnergy)" />
          <path d="M 710 385 L 710 160 L 730 160" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrowEnergy)" />
          <text x="545" y="380" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
            Alimentação Elétrica Principal (QGBT ➔ QDC-VE)
          </text>

          {/* Sinergia Solar (se habilitada) */}
          {enableSolarSurplus && solarKW > 0 && (
            <g transform="translate(30, 240)">
              <rect x="0" y="0" width="140" height="120" rx="14" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
              <circle cx="70" cy="35" r="16" fill="#eab308" fillOpacity="0.2" />
              <text x="70" y="40" textAnchor="middle" fill="#facc15" fontSize="16">☀️</text>
              <text x="70" y="70" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold">USINA SOLAR</text>
              <text x="70" y="85" textAnchor="middle" fill="#94a3b8" fontSize="8">Geração Fotovoltaica</text>
              <text x="70" y="102" textAnchor="middle" fill="#facc15" fontSize="11" fontWeight="bold" fontFamily="monospace">+{solarKW} kW</text>

              <path d="M 140 300 L 230 165" stroke="#facc15" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrowEnergy)" />
            </g>
          )}
        </svg>

        {/* Legenda Explicativa Integrada */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#38bdf8] shrink-0" />
            <span><strong>Linha de Potência (Azul):</strong> Fluxo de energia bruta dos condutores de cobre/alumínio.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] shrink-0" />
            <span><strong>Linha de Medição (Amarela):</strong> Sinal dos TCs para leitura de corrente em cada fase.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#E45318] shrink-0" />
            <span><strong>Linha de Controle (Laranja):</strong> Comandos dinâmicos Modbus RS485 / OCPP em tempo real.</span>
          </div>
        </div>
      </div>

      {/* Tabela de Benchmark dos Sistemas Prontos de Mercado */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-[#00B356]" />
          Compatibilidade com Sistemas Prontos de Mercado (Plug & Play)
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2 pr-3">Fabricante / Modelo</th>
                <th className="py-2 px-3">Topologia de Medição</th>
                <th className="py-2 px-3">Comunicação</th>
                <th className="py-2 px-3">Tempo Resposta</th>
                <th className="py-2 px-3">Capacidade Máx.</th>
                <th className="py-2 pl-3 text-right">Aplicação Típica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className={systemType === 'beny' ? 'bg-amber-500/10 text-white font-bold' : ''}>
                <td className="py-2 pr-3 font-semibold text-amber-400">BENY DLB Box</td>
                <td className="py-2 px-3">TCs bipartidos no Padrão (100A/250A/600A)</td>
                <td className="py-2 px-3">RS485 Modbus / Wi-Fi</td>
                <td className="py-2 px-3 text-emerald-400">&lt; 2 seg</td>
                <td className="py-2 px-3">1 a 10 Carregadores</td>
                <td className="py-2 pl-3 text-right text-slate-400">Residencial & Comercial Leve</td>
              </tr>
              <tr className={systemType === 'weg' ? 'bg-amber-500/10 text-white font-bold' : ''}>
                <td className="py-2 pr-3 font-semibold text-blue-400">WEG WEMOB Smart DLM</td>
                <td className="py-2 px-3">Multimedidor no QGBT + TCs</td>
                <td className="py-2 px-3">Ethernet / Modbus TCP / 4G</td>
                <td className="py-2 px-3 text-emerald-400">&lt; 1.5 seg</td>
                <td className="py-2 px-3">Até 30 Carregadores</td>
                <td className="py-2 pl-3 text-right text-slate-400">Condomínios & Frotas</td>
              </tr>
              <tr className={systemType === 'schneider' ? 'bg-amber-500/10 text-white font-bold' : ''}>
                <td className="py-2 pr-3 font-semibold text-emerald-400">Schneider EcoStruxure LMS</td>
                <td className="py-2 px-3">Medidores PowerLogic iEM3000 / PM5000</td>
                <td className="py-2 px-3">Modbus / BACnet / IP</td>
                <td className="py-2 px-3 text-emerald-400">&lt; 1.0 seg</td>
                <td className="py-2 px-3">Até 1.000 Carregadores</td>
                <td className="py-2 pl-3 text-right text-slate-400">Shopping Centers & Hubs</td>
              </tr>
              <tr className={systemType === 'abb' ? 'bg-amber-500/10 text-white font-bold' : ''}>
                <td className="py-2 pr-3 font-semibold text-rose-400">ABB Dynamic Load Balancing</td>
                <td className="py-2 px-3">Medidor ABB B23/B24 trilho DIN</td>
                <td className="py-2 px-3">Modbus RTU / OCPP</td>
                <td className="py-2 px-3 text-emerald-400">&lt; 1.5 seg</td>
                <td className="py-2 px-3">1 a 32 Carregadores</td>
                <td className="py-2 pl-3 text-right text-slate-400">Eletropostos & Concessionárias</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
