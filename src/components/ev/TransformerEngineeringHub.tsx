"use client";

import React, { useState } from "react";
import { 
  Zap, Shield, Wrench, FileText, CheckCircle2, 
  AlertTriangle, Layers, Download, Copy, Check, Info,
  Maximize2, ArrowRight, Gauge, Cpu, CheckSquare
} from "lucide-react";

interface TransformerEngineeringHubProps {
  nominalKVA?: number;
  primaryVoltageV?: number;
  secondaryVoltageV?: number;
  primaryCurrentA?: number;
  secondaryCurrentA?: number;
  efficiencyPercent?: number;
  lossesKW?: number;
  projectName?: string;
}

export default function TransformerEngineeringHub({
  nominalKVA = 75,
  primaryVoltageV = 220,
  secondaryVoltageV = 380,
  primaryCurrentA = 196.8,
  secondaryCurrentA = 113.9,
  efficiencyPercent = 97.5,
  lossesKW = 1.88,
  projectName = "Eletroposto Cordeiro Energia"
}: TransformerEngineeringHubProps) {
  const [activeTab, setActiveTab] = useState<'trifilar' | 'unifilar' | 'montagem' | 'bom'>('trifilar');
  const [isCopied, setIsCopied] = useState(false);

  // Cálculos dinâmicos
  const calculatedPrimaryCurrentA = primaryCurrentA || Number(((nominalKVA * 1000) / (Math.sqrt(3) * primaryVoltageV)).toFixed(1));
  const calculatedSecondaryCurrentA = secondaryCurrentA || Number(((nominalKVA * 1000) / (Math.sqrt(3) * secondaryVoltageV)).toFixed(1));
  const primaryBreakerA = Math.ceil(calculatedPrimaryCurrentA * 1.25);
  const secondaryBreakerA = Math.ceil(calculatedSecondaryCurrentA * 1.25);

  const handleCopySpecs = () => {
    const text = `--- ESPECIFICAÇÃO TÉCNICA E MEMORIAL DO TRANSFORMADOR (NBR 17019 / NBR 5356) ---
Projeto: ${projectName}
Potência Nominal: ${nominalKVA} kVA
Grupo de Ligação: Dyn1 (Triângulo Primário 220V / Estrela Secundário 380V com Neutro Central X0)
Rendimento Elétrico: ${efficiencyPercent}% • Perdas Totais Estimadas: ${lossesKW} kW
Fator K para Harmônicas: K-4 Obrigatório (cargas retificadoras de VE)
Primário: 220V Trifásico • Corrente: ${calculatedPrimaryCurrentA}A • Proteção: Disjuntor Curva D ${primaryBreakerA}A (Inrush 10x-14x In)
Secundário: 380V Trifásico + Neutro • Corrente: ${calculatedSecondaryCurrentA}A • Proteção: Disjuntor Curva C ${secondaryBreakerA}A
Esquema de Aterramento Secundário: TN-S Rígido (Neutro X0 aterrado diretamente ao BEP)
Norma Regulamentadora: ABNT NBR 17019 item 722.312.2 (PROIBIDO ESQUEMA TN-C A JUSANTE DO BEP)`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="bg-[#0A192F] text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl space-y-6">
      
      {/* ─── CABEÇALHO DO HUB DE ENGENHARIA DO TRANSFORMADOR ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Subestação / Transformador Isolador a Seco
            </span>
            <span className="text-xs text-slate-400 font-mono">ABNT NBR 17019 & NBR 5356</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Engenharia de Ligação, Diagramas & Montagem do Transformador Dyn1
          </h2>
          <p className="text-xs text-slate-400">
            Diagramas unifilar e trifilar detalhados, regras de aterramento TN-S no BEP, roteiro para montadores de campo e lista de materiais.
          </p>
        </div>

        {/* Botão Copiar Especificações */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySpecs}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? "Especificações Copiadas!" : "Copiar Especificações"}
          </button>
        </div>
      </div>

      {/* ─── NAVEGAÇÃO DE ABAS ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'trifilar', label: '1. Diagrama Trifilar Dyn1 (Foto 4)', icon: Layers },
          { id: 'unifilar', label: '2. Diagrama Unifilar NBR 5410', icon: FileText },
          { id: 'montagem', label: '3. Caderno de Montagem de Campo', icon: Wrench },
          { id: 'bom', label: '4. Lista de Materiais Completa (BOM)', icon: CheckSquare }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 1: DIAGRAMA TRIFILAR DETALHADO DYN1 (FOTO 4 & NBR 17019)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trifilar' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          
          {/* Alerta Normativo Compulsório NBR 17019 */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-400 block uppercase font-bold text-[11px]">
                  Regra Compulsória ABNT NBR 17019 item 722.312.2:
                </strong>
                <span className="text-slate-300">
                  É <strong>estritamente proibido o uso do esquema TN-C</strong> (neutro e condutor de proteção combinados em PEN) a jusante do BEP. O secundário do transformador deve ser <strong>obrigatoriamente TN-S</strong>, com condutores de Neutro (N) e Proteção (PE) 100% separados.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase bg-slate-900 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/20 whitespace-nowrap">
              Dyn1 • TN-S Puro
            </span>
          </div>

          {/* SVG Vetorial de Alta Densidade do Diagrama Trifilar */}
          <div className="w-full overflow-hidden bg-gradient-to-b from-slate-950 via-[#0d1f3c] to-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800">
            <svg 
              viewBox="0 0 1000 680" 
              className="w-full h-auto drop-shadow-lg"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="trafoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <linearGradient id="bepGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>

              {/* TÍTULO NO TOPO DO DIAGRAMA */}
              <text x="500" y="30" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
                DIAGRAMA TRIFILAR DE POTÊNCIA & ATERRAMENTO DO TRANSFORMADOR DYN1
              </text>
              <text x="500" y="48" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                Primário 220V (Δ Triângulo) ➔ Secundário 380/220V (Yn Estrela com Neutro aterrado no BEP)
              </text>

              {/* ─── 1. BARRAMENTO PRIMÁRIO 220V (QGBT) ─── */}
              <g transform="translate(60, 80)">
                <rect x="0" y="0" width="380" height="70" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                <text x="15" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold">ENTRADA 220V TRIFÁSICA (QGBT)</text>
                
                {/* Linhas das 3 Fases */}
                <line x1="20" y1="40" x2="360" y2="40" stroke="#ef4444" strokeWidth="3" />
                <text x="365" y="43" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="monospace">Fase R (220V)</text>

                <line x1="20" y1="50" x2="360" y2="50" stroke="#f59e0b" strokeWidth="3" />
                <text x="365" y="53" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">Fase S (220V)</text>

                <line x1="20" y1="60" x2="360" y2="60" stroke="#3b82f6" strokeWidth="3" />
                <text x="365" y="63" fill="#3b82f6" fontSize="10" fontWeight="bold" fontFamily="monospace">Fase T (220V)</text>
              </g>

              {/* ─── 2. DISJUNTOR GERAL PRIMÁRIO (CURVA D) ─── */}
              <g transform="translate(140, 180)">
                <rect x="0" y="0" width="220" height="65" rx="10" fill="#1e293b" stroke="#E45318" strokeWidth="1.5" />
                <text x="110" y="22" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">DISJUNTOR PRIMÁRIO</text>
                <text x="110" y="38" textAnchor="middle" fill="#E45318" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  CURVA D • {primaryBreakerA}A Caixa Moldada
                </text>
                <text x="110" y="52" textAnchor="middle" fill="#94a3b8" fontSize="9">
                  Proteção contra Corrente de Inrush (10x-14x In)
                </text>

                {/* Linhas de conexão */}
                <line x1="50" y1="-30" x2="50" y2="0" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="110" y1="-30" x2="110" y2="0" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="170" y1="-30" x2="170" y2="0" stroke="#3b82f6" strokeWidth="2.5" />

                <line x1="50" y1="65" x2="50" y2="95" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="110" y1="65" x2="110" y2="95" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="170" y1="65" x2="170" y2="95" stroke="#3b82f6" strokeWidth="2.5" />
              </g>

              {/* DPS Primário Classe I+II */}
              <g transform="translate(380, 190)">
                <rect x="0" y="0" width="80" height="45" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <text x="40" y="18" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">DPS Cl. I+II</text>
                <text x="40" y="32" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">220V 45kA</text>
                <line x1="-20" y1="22" x2="0" y2="22" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="40" y1="45" x2="40" y2="75" stroke="#10b981" strokeWidth="1.5" />
              </g>

              {/* ─── 3. TRANSFORMADOR A SECO (BLOCO DYN1) ─── */}
              <g transform="translate(80, 275)">
                <rect x="0" y="0" width="340" height="150" rx="16" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                
                {/* Header Trafo */}
                <rect x="0" y="0" width="340" height="30" rx="16" fill="url(#trafoGrad)" />
                <text x="170" y="20" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                  TRANSFORMADOR ISOLADOR A SECO {nominalKVA} kVA
                </text>

                {/* Bornes do Primário (H1, H2, H3) */}
                <circle cx="60" cy="50" r="10" fill="#1e293b" stroke="#ef4444" strokeWidth="2" />
                <text x="60" y="54" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">H1</text>

                <circle cx="170" cy="50" r="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="170" y="54" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">H2</text>

                <circle cx="280" cy="50" r="10" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                <text x="280" y="54" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">H3</text>

                <text x="170" y="80" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                  Primário: 220V Triângulo (Δ) • Sem Neutro
                </text>
                <text x="170" y="95" textAnchor="middle" fill="#94a3b8" fontSize="9">
                  Bloqueio de 3ª Harmônica e Sequência Zero
                </text>

                {/* Divisor Central com Blindagem Eletrostática */}
                <line x1="20" y1="105" x2="320" y2="105" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="170" y="117" textAnchor="middle" fill="#10b981" fontSize="9">
                  Blindagem Eletrostática Aterrada no BEP
                </text>

                {/* Bornes do Secundário (X1, X2, X3 e X0) */}
                <circle cx="50" cy="135" r="10" fill="#1e293b" stroke="#ef4444" strokeWidth="2" />
                <text x="50" y="139" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">X1</text>

                <circle cx="130" cy="135" r="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="130" y="139" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">X2</text>

                <circle cx="210" cy="135" r="10" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                <text x="210" y="139" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">X3</text>

                <circle cx="290" cy="135" r="11" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="290" y="139" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">X0</text>
              </g>

              {/* ─── 4. BARRAMENTO DE EQUIPOTENCIALIZAÇÃO PRINCIPAL (BEP) ─── */}
              <g transform="translate(60, 480)">
                <rect x="0" y="0" width="880" height="40" rx="8" fill="url(#bepGrad)" stroke="#10b981" strokeWidth="2" />
                <text x="440" y="24" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black" letterSpacing="1">
                  BARRAMENTO DE EQUIPOTENCIALIZAÇÃO PRINCIPAL (BEP) — ATERRAMENTO CENTRAL
                </text>

                {/* Conexão da Malha de Terra */}
                <line x1="120" y1="40" x2="120" y2="80" stroke="#10b981" strokeWidth="3" />
                <path d="M 100 80 L 140 80 M 108 86 L 132 86 M 116 92 L 124 92" stroke="#10b981" strokeWidth="2.5" />
                <text x="120" y="110" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">Malha de Terra SPDA (R ≤ 10 Ω)</text>

                {/* Conexão da Carcaça do Trafo ao BEP */}
                <line x1="250" y1="-55" x2="250" y2="0" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
                <text x="255" y="-20" fill="#10b981" fontSize="9">Carcaça Trafo</text>
              </g>

              {/* CONDUTOR CRÍTICO: NEUTRO X0 DO SECUNDÁRIO ➔ BEP */}
              <path d="M 370 410 L 370 450 L 500 450 L 500 480" stroke="#38bdf8" strokeWidth="4" fill="none" />
              <text x="435" y="442" fill="#38bdf8" fontSize="10" fontWeight="black" fontFamily="monospace">
                Aterramento do Neutro X0 no BEP (Obrigatório)
              </text>

              {/* ─── 5. SECUNDÁRIO 380V (TN-S PURO A JUSANTE DO BEP) ─── */}
              <g transform="translate(560, 100)">
                <rect x="0" y="0" width="380" height="340" rx="16" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                
                {/* Header Painel 380V */}
                <rect x="0" y="0" width="380" height="35" rx="16" fill="#1e293b" />
                <text x="190" y="22" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="bold">
                  PAINEL DE CARREGADORES QDC-VE (380V TN-S)
                </text>

                {/* Banner de Proibição TN-C */}
                <rect x="15" y="45" width="350" height="26" rx="6" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1" />
                <text x="190" y="62" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">
                  ⛔ PROIBIDO ESQUEMA TN-C A JUSANTE DO BEP (NBR 17019)
                </text>

                {/* Disjuntor Geral Secundário */}
                <rect x="30" y="85" width="320" height="45" rx="8" fill="#1e293b" stroke="#334155" />
                <text x="190" y="105" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                  DISJUNTOR GERAL SECUNDÁRIO • CURVA C {secondaryBreakerA}A
                </text>
                <text x="190" y="120" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  Corrente Nominal: {calculatedSecondaryCurrentA}A • 380V Trifásico
                </text>

                {/* Barramentos Independentes N e PE */}
                <g transform="translate(30, 145)">
                  <text x="0" y="12" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="monospace">Fase R (380V)</text>
                  <line x1="85" y1="9" x2="320" y2="9" stroke="#ef4444" strokeWidth="3" />

                  <text x="0" y="32" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">Fase S (380V)</text>
                  <line x1="85" y1="29" x2="320" y2="29" stroke="#f59e0b" strokeWidth="3" />

                  <text x="0" y="52" fill="#3b82f6" fontSize="10" fontWeight="bold" fontFamily="monospace">Fase T (380V)</text>
                  <line x1="85" y1="49" x2="320" y2="49" stroke="#3b82f6" strokeWidth="3" />

                  <text x="0" y="74" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">Neutro (N)</text>
                  <line x1="85" y1="71" x2="320" y2="71" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 3" />

                  <text x="0" y="96" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace">Terra (PE)</text>
                  <line x1="85" y1="93" x2="320" y2="93" stroke="#10b981" strokeWidth="3" />
                </g>

                {/* Circuitos Terminais dos Carregadores */}
                <g transform="translate(30, 260)">
                  <rect x="0" y="0" width="150" height="65" rx="8" fill="#182234" stroke="#00B356" />
                  <text x="75" y="18" textAnchor="middle" fill="#00B356" fontSize="10" fontWeight="bold">CARREGADOR 1</text>
                  <text x="75" y="32" textAnchor="middle" fill="#ffffff" fontSize="9">Disjuntor 40A + DR</text>
                  <text x="75" y="46" textAnchor="middle" fill="#38bdf8" fontSize="8">RDC-DD 6mA CC</text>
                  <text x="75" y="58" textAnchor="middle" fill="#94a3b8" fontSize="8">Tipo 2 / CCS2 (380V)</text>

                  <rect x="170" y="0" width="150" height="65" rx="8" fill="#182234" stroke="#00B356" />
                  <text x="245" y="18" textAnchor="middle" fill="#00B356" fontSize="10" fontWeight="bold">CARREGADOR 2</text>
                  <text x="245" y="32" textAnchor="middle" fill="#ffffff" fontSize="9">Disjuntor 40A + DR</text>
                  <text x="245" y="46" textAnchor="middle" fill="#38bdf8" fontSize="8">RDC-DD 6mA CC</text>
                  <text x="245" y="58" textAnchor="middle" fill="#94a3b8" fontSize="8">Tipo 2 / CCS2 (380V)</text>
                </g>
              </g>

              {/* Linhas de Fases do Secundário X1, X2, X3 ➔ Painel 380V */}
              <path d="M 130 410 L 130 440 L 460 440 L 460 215 L 560 215" stroke="#ef4444" strokeWidth="2.5" fill="none" />
              <path d="M 210 410 L 210 430 L 470 430 L 470 225 L 560 225" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
              <path d="M 290 410 L 290 420 L 480 420 L 480 235 L 560 235" stroke="#3b82f6" strokeWidth="2.5" fill="none" />

              {/* Condutor Neutro N puro que sai do BEP para o barramento de Neutro */}
              <path d="M 650 480 L 650 250 L 675 250" stroke="#38bdf8" strokeWidth="3" strokeDasharray="5 3" fill="none" />
              <text x="655" y="360" fill="#38bdf8" fontSize="9" fontWeight="bold" transform="rotate(-90 655 360)">
                Neutro Puro N (Isolado da Carcaça)
              </text>

              {/* Condutor de Proteção PE que sai do BEP para a carcaça e pinos terra */}
              <path d="M 800 480 L 800 280 L 780 280" stroke="#10b981" strokeWidth="3" fill="none" />
              <text x="805" y="360" fill="#10b981" fontSize="9" fontWeight="bold" transform="rotate(-90 805 360)">
                Condutor PE Exclusivo (Aterrado)
              </text>

            </svg>
          </div>

          {/* Destaques Técnicos das Normas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">1. Por que ligação Dyn1?</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                O primário em <strong>Triângulo ($\Delta$)</strong> isola e bloqueia harmônicas de sequência zero (3ª, 9ª, 15ª) provenientes dos retificadores eletrônicos de potência dos carros elétricos, impedindo que circulem para a rede da concessionária.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">2. Neutro e Terra Separados</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                O ponto central da estrela secundária (**X0**) conecta-se ao BEP. A partir dele, o condutor de **Neutro (N)** segue isolado de qualquer carcaça, e o condutor **PE** conecta todas as massas metálicas, garantindo que o dispositivo DR funcione perfeitamente.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase block">3. Disjuntor Primário Curva D</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Transformadores a seco possuem elevada corrente de magnetização (*inrush*) ao serem energizados (de 10x a 14x a corrente nominal durante os primeiros 50 a 100 ms). Disjuntores comuns de Curva C desarmam em falso na energização.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 2: DIAGRAMA UNIFILAR NORMALIZADO (NBR 5410)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'unifilar' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Diagrama Unifilar Normalizado de Conexão do Transformador
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Padronização ABNT / CEMIG</span>
            </div>

            {/* Representação Unifilar ASCII/Vetorial Técnica */}
            <div className="p-4 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto space-y-3 leading-relaxed border border-slate-800">
              <pre className="text-emerald-400">
{`[ REDE CEMIG 220V ] ───► [ PADRÃO MEDIÇÃO ] ───► [ QGBT 220V ]
                                                     │
                                                     ├──► [ CARGAS IMÓVEL ]
                                                     │
                                                     ▼
                                        [ DISJUNTOR GERAL PRIMÁRIO ]
                                        • Caixa Moldada ${primaryBreakerA}A Curva D
                                        • Icu: 25 kA / 220V
                                        • DPS Classe I+II (45 kA)
                                                     │
                                                     │ 3# 95 mm² EPR 90°C (Duto 2")
                                                     ▼
                                      ╔═════════════════════════════╗
                                      ║    TRANSFORMADOR DYN1       ║
                                      ║    Potência: ${nominalKVA} kVA          ║
                                      ║    Primário: 220V Δ (${calculatedPrimaryCurrentA}A)   ║
                                      ║    Secundário: 380V Yn (${calculatedSecondaryCurrentA}A) ║
                                      ║    Blindagem Eletrostática  ║
                                      ╚══════════════╤══════════════╝
                                                     │
                                    ┌────────────────┴────────────────┐
                                    │ X0 (Neutro)                     │ Fases X1, X2, X3 (380V)
                                    ▼                                 ▼
                     ╔═════════════════════════════╗    [ DISJUNTOR GERAL SECUNDÁRIO ]
                     ║    BARRAMENTO BEP GERAL     ║    • Curva C ${secondaryBreakerA}A Caixa Moldada
                     ║    (Malha Terra R ≤ 10 Ω)   ║    • DPS Classe II (275/440V)
                     ╚══════════════╤══════════════╝                  │
                                    │                                 ▼
                      ┌─────────────┴─────────────┐         [ BARRAMENTO 380V QDC-VE ]
                      │                           │         • Barramento Fases R-S-T
                      ▼                           ▼         • Barramento Neutro N (Isolado)
               [ BARRAMENTO N ]           [ BARRAMENTO PE ] • Barramento Terra PE (Aterrado)
               (Azul-Claro)               (Verde-Amarelo)             │
                      │                           │                   ▼
                      └───────────────────────────┴─────────► [ CARREGADORES VE ]
                                                               • Disjuntores 40A / 63A
                                                               • RDC-DD 6mA CC + DR 30mA
                                                               • Cabo Flexível 10mm²`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 3: CADERNO DE MONTAGEM DE CAMPO
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'montagem' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Bloco 1: Posicionamento Mecânico & Ventilação */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5 font-mono">
                <Wrench className="w-4 h-4" />
                1. Posicionamento Físico & Ventilação Natural
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Afastamento de Paredes:</strong> Mínimo de <strong>500 mm</strong> em todas as laterais para convecção natural de ar (NBR 5356).</li>
                <li><strong>Base de Assentamento:</strong> Base nivelada de concreto com calços antivibratórios (coxins de neoprene / vibra-stop) para mitigação de vibração acústica de 60 Hz.</li>
                <li><strong>Grau de Proteção:</strong> Instalação abrigada (IP21/IP23) em sala elétrica ou cubículo ventilado à prova de intempéries.</li>
              </ul>
            </div>

            {/* Bloco 2: Conexões de Cabos & Torques */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5 font-mono">
                <Gauge className="w-4 h-4" />
                2. Terminações & Torques de Conexão
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Terminais dos Cabos:</strong> Terminais de compressão de cobre estanhado bimetálicos com 2 furos para cabos ≥ 70 mm², evitando afrouxamento por ciclagem térmica.</li>
                <li><strong>Parafusos de Fixação:</strong> Aço galvanizado a fogo ou inox com arruelas belleville de pressão constante.</li>
                <li><strong>Torques Obrigatórios:</strong>
                  <ul className="pl-3 space-y-0.5 text-slate-400 font-mono text-[11px]">
                    <li>• Parafusos M10: <strong>25 a 30 N·m</strong></li>
                    <li>• Parafusos M12: <strong>45 a 50 N·m</strong></li>
                    <li>• Parafusos M16: <strong>80 a 90 N·m</strong></li>
                  </ul>
                </li>
              </ul>
            </div>

            {/* Bloco 3: Roteiro de Ensaios Pré-Energização (Comissionamento) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 md:col-span-2">
              <h4 className="text-xs font-bold text-sky-400 uppercase flex items-center gap-1.5 font-mono">
                <Shield className="w-4 h-4" />
                3. Roteiro Obrigatório de Ensaios Pré-Energização (Equipe de Campo)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <strong className="text-white block font-bold mb-1">Ensaio 1: Megômetro (Isolamento)</strong>
                  <p className="text-slate-400 text-[11px]">
                    Tensão de teste: 1000V ou 2500V CC. Resistência entre Primário-Massa, Secundário-Massa e Primário-Secundário: <strong>≥ 100 MΩ</strong>.
                  </p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <strong className="text-white block font-bold mb-1">Ensaio 2: Relação de Espiras (TTR)</strong>
                  <p className="text-slate-400 text-[11px]">
                    Medição de tensão a vazio: Tensão Primária / Secundária deve resultar na relação nominal de 220V/380V (desvio &le; 0.5%).
                  </p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <strong className="text-white block font-bold mb-1">Ensaio 3: Aterramento do Neutro X0</strong>
                  <p className="text-slate-400 text-[11px]">
                    Continuidade ôhmica entre o terminal X0 e a barra BEP: <strong>R &le; 0.1 Ω</strong>. Resistência da malha de terra: <strong>&le; 10 Ω</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ABA 4: LISTA DE MATERIAIS COMPLETA (BOM)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'bom' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Lista de Materiais de Campo (BOM) — Transformador & Acessórios
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Quantitativo para Orçamento e Compra</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 px-3">Descrição Técnica Detalhada</th>
                    <th className="py-2 px-3 text-center">Quantidade</th>
                    <th className="py-2 px-3 text-center">Unidade</th>
                    <th className="py-2 pl-3">Aplicação Técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">TR-01</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Transformador Isolador a Seco {nominalKVA} kVA Dyn1 (220V/380V)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">1</td>
                    <td className="py-2.5 px-3 text-center font-mono">un</td>
                    <td className="py-2.5 pl-3 text-slate-400">Elevação de tensão 220V para 380V (Fator K-4)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">DJ-PRI</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Disjuntor Caixa Moldada Tripolar Curva D {primaryBreakerA}A (Icu ≥ 25 kA)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">1</td>
                    <td className="py-2.5 px-3 text-center font-mono">un</td>
                    <td className="py-2.5 pl-3 text-slate-400">Proteção primária 220V contra inrush</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">DJ-SEC</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Disjuntor Caixa Moldada Tripolar Curva C {secondaryBreakerA}A (Icu ≥ 18 kA)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">1</td>
                    <td className="py-2.5 px-3 text-center font-mono">un</td>
                    <td className="py-2.5 pl-3 text-slate-400">Proteção geral do secundário 380V</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">DPS-PRI</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Conjunto DPS Classe I+II 220V (In: 20kA, Imax: 45kA)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">3</td>
                    <td className="py-2.5 px-3 text-center font-mono">un</td>
                    <td className="py-2.5 pl-3 text-slate-400">Proteção contra descargas atmosféricas no primário</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">DPS-SEC</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Conjunto DPS Classe II 275/440V (In: 20kA, Imax: 40kA)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">4</td>
                    <td className="py-2.5 px-3 text-center font-mono">un</td>
                    <td className="py-2.5 pl-3 text-slate-400">Proteção contra sobretensões nas 3 fases e neutro</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">BEP-COP</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Barramento de Cobre Eletrolítico 50x5 mm com Isoladores e Furação M10
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">1</td>
                    <td className="py-2.5 px-3 text-center font-mono">barra (1m)</td>
                    <td className="py-2.5 pl-3 text-slate-400">Barramento BEP central de aterramento TN-S</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">COXIN-VIB</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Amortecedor de Vibração Vibra-Stop de Neoprene Reforçado
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">4</td>
                    <td className="py-2.5 px-3 text-center font-mono">un</td>
                    <td className="py-2.5 pl-3 text-slate-400">Isolamento mecânico dos pés do transformador</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">TERM-BIM</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Terminal de Compressão de Cobre Estanhado 2 Furos M10
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-400">16</td>
                    <td className="py-2.5 px-3 text-center font-mono">un</td>
                    <td className="py-2.5 pl-3 text-slate-400">Conexão segura nos bornes H1-H3 e X0-X3</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
