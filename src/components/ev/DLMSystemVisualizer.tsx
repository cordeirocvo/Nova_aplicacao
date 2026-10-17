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
          viewBox="0 0 1020 440" 
          className="w-full h-auto drop-shadow-md"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Definições de Gradientes e Marcadores Eletrotécnicos Precisos */}
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

            {/* Marcadores de Seta com refX/refY exatos (a ponta da seta termina exatamente no fim da linha sem invadir o card) */}
            <marker id="arrowBlueRight" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
            <marker id="arrowOrangeRight" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
            <marker id="arrowDlmRight" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#E45318" />
            </marker>
            <marker id="arrowGreenRight" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#00B356" />
            </marker>
            <marker id="arrowBlueUp" viewBox="0 0 10 10" refX="5" refY="1" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 1.5 9 L 5 1 L 8.5 9 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* ─── 1. POSTE / REDE CONCESSIONÁRIA ─── */}
          <g transform="translate(25, 45)">
            <rect x="0" y="0" width="140" height="145" rx="14" fill="url(#gridGrad)" stroke="#334155" strokeWidth="1.5" />
            <circle cx="70" cy="36" r="20" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M 70 24 L 63 38 L 68 38 L 65 48 L 77 34 L 72 34 Z" fill="#60a5fa" />
            <text x="70" y="75" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold" fontFamily="sans-serif">REDE PÚBLICA</text>
            <text x="70" y="93" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">CEMIG 220/127V</text>
            <text x="70" y="110" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">Limite: {gridLimitKW} kW</text>
            <rect x="18" y="122" width="104" height="15" rx="4" fill="#1e293b" />
            <text x="70" y="133" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Transformador Rua</text>
          </g>

          {/* Linha de Energia: Rede Pública -> Padrão (Sem invasão de borda e com badge limpo) */}
          <path d="M 165 110 L 221 110" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrowBlueRight)" />
          <g transform="translate(168, 86)">
            <rect x="0" y="0" width="53" height="16" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
            <text x="26.5" y="11.5" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">Alimentação</text>
          </g>

          {/* ─── 2. PADRÃO DE ENTRADA & MEDIÇÃO COM TCs DE MEDIÇÃO ─── */}
          <g transform="translate(225, 35)">
            <rect x="0" y="0" width="180" height="175" rx="16" fill="#0f172a" stroke="#E45318" strokeWidth="1.5" />
            
            {/* Medidor e TCs */}
            <rect x="15" y="12" width="150" height="72" rx="10" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="90" y="30" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">PADRÃO DE ENTRADA</text>
            <text x="90" y="46" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">Disjuntor Geral: 200A</text>
            
            {/* TCs Sensores (Transformadores de Corrente) */}
            <g transform="translate(18, 54)">
              <rect x="0" y="0" width="44" height="20" rx="4" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
              <text x="22" y="13" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">TC Fase R</text>

              <rect x="50" y="0" width="44" height="20" rx="4" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
              <text x="72" y="13" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">TC Fase S</text>

              <rect x="100" y="0" width="44" height="20" rx="4" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
              <text x="122" y="13" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">TC Fase T</text>
            </g>

            {/* Descrição do Sensor */}
            <rect x="15" y="93" width="150" height="38" rx="8" fill="#182234" />
            <text x="90" y="109" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">Medição em Tempo Real</text>
            <text x="90" y="123" textAnchor="middle" fill="#94a3b8" fontSize="8">Leitura a cada 100ms</text>

            <rect x="15" y="139" width="150" height="24" rx="6" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="1" />
            <text x="90" y="155" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">TCs Bipartidos de Alta Precisão</text>
          </g>

          {/* ─── 3. CARGAS DO IMÓVEL (PRIORIDADE TOTAL) ─── */}
          <g transform="translate(465, 20)">
            <rect x="0" y="0" width="185" height="130" rx="14" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="30" cy="28" r="13" fill="#3b82f6" fillOpacity="0.2" />
            <path d="M 24 30 L 30 23 L 36 30 M 26 30 L 26 35 L 34 35 L 34 30" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
            <text x="50" y="28" fill="#f8fafc" fontSize="11" fontWeight="bold">CARGAS IMÓVEL</text>
            <text x="50" y="40" fill="#94a3b8" fontSize="8">Prioridade Absoluta</text>

            <rect x="12" y="50" width="160" height="68" rx="8" fill="#1e293b" />
            {/* Texto com quebra garantida via tspan, 100% contido no card sem vazar */}
            <text x="20" y="68" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif">
              <tspan x="20" dy="0">Ar condicionado, iluminação</tspan>
              <tspan x="20" dy="13">e computadores do imóvel</tspan>
            </text>
            <text x="20" y="104" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="monospace">
              Consumo: {buildingLoadKW} kW
            </text>
          </g>

          {/* Linha de Energia: Padrão -> Imóvel (com margem limpa) */}
          <path d="M 405 75 L 461 75" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrowBlueRight)" />
          <g transform="translate(410, 52)">
            <rect x="0" y="0" width="48" height="15" rx="3" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
            <text x="24" y="10.5" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontWeight="bold">Prioridade</text>
          </g>

          {/* ─── 4. CONTROLADOR CENTRAL DLM (O CÉREBRO) ─── */}
          <g transform="translate(465, 175)">
            <rect x="0" y="0" width="185" height="155" rx="16" fill="#182234" stroke="#E45318" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))" />
            
            {/* Header da Gaveta DLM */}
            <rect x="0" y="0" width="185" height="32" rx="16" fill="url(#dlmGrad)" />
            <text x="92.5" y="21" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="bold" letterSpacing="0.5">
              CENTRAL DLM INTELIGENTE
            </text>

            <text x="92.5" y="52" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontWeight="bold" fontFamily="sans-serif">
              {systemInfo.controller}
            </text>

            <rect x="12" y="65" width="161" height="48" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="20" y="80" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Algoritmo de Cálculo Dinâmico:</text>
            <text x="20" y="93" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
              P_ve = Limite - P_imóvel
            </text>
            <text x="20" y="105" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="monospace">
              Folga Segura: {availableMarginKW} kW
            </text>

            <rect x="12" y="121" width="161" height="22" rx="5" fill="#f59e0b" fillOpacity="0.15" />
            <text x="92.5" y="135" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">
              {isThrottled ? "⚠️ MODULAÇÃO ATIVA: Evita desarme" : "✓ OPERAÇÃO NORMAL: Carga plena"}
            </text>
          </g>

          {/* Linha de Dados de Medição: TCs do Padrão -> Central DLM (Badge sólido sem sobrepor texto) */}
          <path d="M 315 210 L 315 250 L 461 250" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowOrangeRight)" />
          <g transform="translate(332, 239)">
            <rect x="0" y="0" width="112" height="18" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
            <text x="56" y="12" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">Sinal dos TCs (100ms)</text>
          </g>

          {/* ─── 5. ESTAÇÕES DE RECARGA DE VEÍCULOS (MODULADAS EM TEMPO REAL) ─── */}
          
          {/* Carregador 1 */}
          <g transform="translate(770, 20)">
            <rect x="0" y="0" width="210" height="160" rx="14" fill="#0f172a" stroke="#00B356" strokeWidth="1.5" />
            <rect x="0" y="0" width="210" height="28" rx="14" fill="url(#chargerGrad)" />
            <text x="105" y="18" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">CARREGADOR VE 1 (Vaga A)</text>
            
            <circle cx="30" cy="54" r="12" fill="#00B356" fillOpacity="0.2" />
            <path d="M 27 49 L 33 54 L 27 59" stroke="#10b981" strokeWidth="1.5" fill="none" />
            <text x="50" y="51" fill="#ffffff" fontSize="10" fontWeight="bold">BENY BCP / WEG</text>
            <text x="50" y="63" fill="#94a3b8" fontSize="8">Conector Tipo 2 / CCS2</text>

            <rect x="15" y="74" width="180" height="46" rx="8" fill="#1e293b" />
            <text x="25" y="91" fill="#94a3b8" fontSize="8">Comando Recebido:</text>
            <text x="25" y="108" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace">
              {(evLoadKW / Math.max(1, evCount)).toFixed(1)} kW ({isThrottled ? "Modulado" : "Pleno"})
            </text>

            <rect x="15" y="128" width="180" height="20" rx="4" fill="#00B356" fillOpacity="0.15" />
            <text x="105" y="141" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">
              {isThrottled ? "Corrente Limitada pela Central" : "Corrente Nominal (32A)"}
            </text>
          </g>

          {/* Carregador 2 */}
          <g transform="translate(770, 205)">
            <rect x="0" y="0" width="210" height="160" rx="14" fill="#0f172a" stroke="#00B356" strokeWidth="1.5" />
            <rect x="0" y="0" width="210" height="28" rx="14" fill="url(#chargerGrad)" />
            <text x="105" y="18" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">CARREGADOR VE 2 (Vaga B)</text>
            
            <circle cx="30" cy="54" r="12" fill="#00B356" fillOpacity="0.2" />
            <path d="M 27 49 L 33 54 L 27 59" stroke="#10b981" strokeWidth="1.5" fill="none" />
            <text x="50" y="51" fill="#ffffff" fontSize="10" fontWeight="bold">BENY / ABB Fast</text>
            <text x="50" y="63" fill="#94a3b8" fontSize="8">Pistola 2 / Dual Gun</text>

            <rect x="15" y="74" width="180" height="46" rx="8" fill="#1e293b" />
            <text x="25" y="91" fill="#94a3b8" fontSize="8">Comando Recebido:</text>
            <text x="25" y="108" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace">
              {(evLoadKW / Math.max(1, evCount)).toFixed(1)} kW ({isThrottled ? "Modulado" : "Pleno"})
            </text>

            <rect x="15" y="128" width="180" height="20" rx="4" fill="#00B356" fillOpacity="0.15" />
            <text x="105" y="141" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">
              {isThrottled ? "Divisão Dinâmica Ativa" : "Corrente Nominal (32A)"}
            </text>
          </g>

          {/* ─── LINHAS DE COMUNICAÇÃO DLM: CENTRAL DLM -> CARREGADORES (LATERAL ESQUERDA) ─── */}
          {/* Ramal para Carregador 1: sai de DLM (x=650), sobe pelo canal de sinal em x=705 e entra na lateral de Carregador 1 (x=766) */}
          <path d="M 650 240 L 705 240 L 705 85 L 766 85" stroke="#E45318" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrowDlmRight)" />
          {/* Ramal para Carregador 2: entra na lateral de Carregador 2 (x=766) */}
          <path d="M 650 260 L 705 260 L 705 270 L 766 270" stroke="#E45318" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrowDlmRight)" />

          {/* Badge Horizontal de Comunicação (Elimina texto vertical rotacionado sobre a linha) */}
          <g transform="translate(668, 158)">
            <rect x="0" y="0" width="76" height="26" rx="6" fill="#182234" stroke="#E45318" strokeWidth="1" />
            <text x="38" y="11" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">RS485 / Modbus</text>
            <text x="38" y="21" textAnchor="middle" fill="#cbd5e1" fontSize="7">Comando DLM</text>
          </g>

          {/* ─── LINHA DE POTÊNCIA ELÉTRICA: PADRÃO -> CARREGADORES (CANALETA INFERIOR DEDICADA) ─── */}
          {/* Sai do fundo do Padrão em x=365, desce até canaleta inferior y=395, corre até a prumada x=875 dos carregadores */}
          {/* Alimentação sobe na base inferior de Carregador 2 (y=369, sem entrar no card) */}
          <path d="M 365 210 L 365 395 L 875 395 L 875 369" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrowBlueUp)" />
          {/* Alimentação sobe na base inferior de Carregador 1 (y=184, sem entrar no card) */}
          <path d="M 875 205 L 875 184" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrowBlueUp)" />

          {/* Badge Informativo da Alimentação Principal */}
          <g transform="translate(470, 384)">
            <rect x="0" y="0" width="240" height="22" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <text x="120" y="15" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
              Alimentação Elétrica Principal (QGBT ➔ QDC-VE)
            </text>
          </g>

          {/* Sinergia Solar (se habilitada) */}
          {enableSolarSurplus && solarKW > 0 && (
            <g transform="translate(25, 220)">
              <rect x="0" y="0" width="140" height="120" rx="14" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
              <circle cx="70" cy="35" r="16" fill="#eab308" fillOpacity="0.2" />
              <text x="70" y="40" textAnchor="middle" fill="#facc15" fontSize="16">☀️</text>
              <text x="70" y="68" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold">USINA SOLAR</text>
              <text x="70" y="83" textAnchor="middle" fill="#94a3b8" fontSize="8">Geração Fotovoltaica</text>
              <text x="70" y="100" textAnchor="middle" fill="#facc15" fontSize="11" fontWeight="bold" fontFamily="monospace">+{solarKW} kW</text>

              {/* Rota limpa para o Padrão sem cruzar outras linhas */}
              <path d="M 165 270 L 195 270 L 195 160 L 221 160" stroke="#facc15" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrowOrangeRight)" />
              <g transform="translate(172, 210)">
                <rect x="0" y="0" width="46" height="16" rx="4" fill="#0f172a" stroke="#eab308" strokeWidth="1" />
                <text x="23" y="11.5" textAnchor="middle" fill="#facc15" fontSize="8" fontWeight="bold">+Solar</text>
              </g>
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
