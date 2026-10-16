"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, Shield, Wrench, FileText, CheckCircle2, 
  AlertTriangle, Layers, Download, Copy, Check, Info,
  Maximize2, ArrowRight, Gauge, Cpu, CheckSquare, X,
  ZoomIn, ZoomOut, RotateCcw, Sun, Moon, Sliders, BatteryCharging
} from "lucide-react";

export type HubTabId = 
  | 'trifilar_trafo'
  | 'trifilar_painel220'
  | 'trifilar_painel380'
  | 'unifilar'
  | 'montagem'
  | 'bom';

interface TransformerEngineeringHubProps {
  nominalKVA?: number;
  primaryVoltageV?: number;
  secondaryVoltageV?: number;
  primaryCurrentA?: number;
  secondaryCurrentA?: number;
  efficiencyPercent?: number;
  lossesKW?: number;
  projectName?: string;
  onClose?: () => void;
}

export default function TransformerEngineeringHub({
  nominalKVA = 75,
  primaryVoltageV = 220,
  secondaryVoltageV = 380,
  primaryCurrentA = 196.8,
  secondaryCurrentA = 113.9,
  efficiencyPercent = 97.5,
  lossesKW = 1.88,
  projectName = "Eletroposto Cordeiro Energia",
  onClose
}: TransformerEngineeringHubProps) {
  const [activeTab, setActiveTab] = useState<HubTabId>('trifilar_trafo');
  const [isCopied, setIsCopied] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState<'cad_light' | 'dark_studio'>('dark_studio');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Cálculos dinâmicos
  const calculatedPrimaryCurrentA = primaryCurrentA || Number(((nominalKVA * 1000) / (Math.sqrt(3) * primaryVoltageV)).toFixed(1));
  const calculatedSecondaryCurrentA = secondaryCurrentA || Number(((nominalKVA * 1000) / (Math.sqrt(3) * secondaryVoltageV)).toFixed(1));
  const primaryBreakerA = Math.ceil(calculatedPrimaryCurrentA * 1.25);
  const secondaryBreakerA = Math.ceil(calculatedSecondaryCurrentA * 1.25);

  // Fechamento via teclado ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
Código de Cores dos Cabos (NBR 5410): Fase R = Vermelho • Fase S = Branco • Fase T = Preto • Neutro = Azul-claro • Terra = Verde
Norma Regulamentadora: ABNT NBR 17019 item 722.312.2 (PROIBIDO ESQUEMA TN-C A JUSANTE DO BEP)`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Cores dinâmicas para os cabos conforme NBR 5410 e tema
  const c = canvasTheme === 'cad_light' ? {
    bg: '#FFFFFF',
    border: '#E2E8F0',
    gridDot: '#CBD5E1',
    cardBg: '#F8FAFC',
    cardBorder: '#CBD5E1',
    textMain: '#0F172A',
    textMuted: '#64748B',
    phaseR: '#DC2626',      // Vermelho
    phaseS: '#FFFFFF',      // Branco (com stroke visível)
    phaseSStroke: '#475569',// Contorno do cabo branco
    phaseT: '#000000',      // Preto absoluto (zero confusão com azul!)
    neutral: '#2563EB',     // Azul
    earth: '#16A34A',       // Verde
    bep: '#059669',         // Verde BEP
    busCopper: '#B45309'    // Cobre
  } : {
    bg: '#0A1424',
    border: '#1E293B',
    gridDot: '#1E293B',
    cardBg: '#0F1D33',
    cardBorder: '#334155',
    textMain: '#F8FAFC',
    textMuted: '#94A3B8',
    phaseR: '#EF4444',      // Vermelho vivo
    phaseS: '#FFFFFF',      // Branco puro
    phaseSStroke: '#94A3B8',// Contorno suave para o branco
    phaseT: '#0F172A',      // Preto com contorno halo claro
    phaseTStroke: '#E2E8F0',// Contorno branco para o preto se destacar no dark
    neutral: '#38BDF8',     // Azul elétrico
    earth: '#22C55E',       // Verde elétrico
    bep: '#10B981',         // Verde BEP
    busCopper: '#D97706'    // Cobre
  };

  return (
    <div className="bg-[#0A192F] text-white rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
      
      {/* ─── BARRA DE CABEÇALHO FIXA COM BOTÃO DE FECHAR PROEMINENTE ─── */}
      <div className="sticky top-0 z-30 bg-[#0A192F]/95 backdrop-blur-md px-5 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Subestação Dyn1 • 220V ➔ 380V • NBR 17019
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Cores: R (Vermelho), S (Branco), T (Preto), N (Azul), PE (Verde)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Engenharia de Ligação, Diagramas Trifilares & Painéis
            </h2>
          </div>
        </div>

        {/* Controles de Topo: Tema, Zoom, Copiar e Botão FECHAR */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {/* Alternador de Tema do Canvas CAD */}
          <button
            type="button"
            onClick={() => setCanvasTheme(t => t === 'cad_light' ? 'dark_studio' : 'cad_light')}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Alternar entre Papel Técnico CAD (Claro) e Dark Studio"
          >
            {canvasTheme === 'cad_light' ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{canvasTheme === 'cad_light' ? 'Dark' : 'Papel CAD'}</span>
          </button>

          {/* Controles de Zoom */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold px-2 text-amber-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              title="Resetar Zoom (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Copiar Especificações */}
          <button
            type="button"
            onClick={handleCopySpecs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 hidden lg:flex"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? "Copiado!" : "Copiar"}</span>
          </button>

          {/* BOTÃO FECHAR PROEMINENTE (RESOLVE A DEMANDA DO USUÁRIO) */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer ml-1"
              title="Fechar Diagrama (ou pressione ESC)"
            >
              <X className="w-4 h-4" />
              <span>Fechar</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── NAVEGAÇÃO DE ABAS ─── */}
      <div className="bg-slate-950/60 px-5 py-2.5 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-thin">
        {[
          { id: 'trifilar_trafo', label: '1. Trafo Dyn1 & Ligação aos Carregadores', icon: Layers, highlight: true },
          { id: 'trifilar_painel220', label: '2. Painel 220V QGBT (Foto 3)', icon: Cpu },
          { id: 'trifilar_painel380', label: '3. Painel 380V QDC-VE', icon: BatteryCharging },
          { id: 'unifilar', label: '4. Diagrama Unifilar NBR 5410', icon: FileText },
          { id: 'montagem', label: '5. Caderno de Montagem de Campo', icon: Wrench },
          { id: 'bom', label: '6. Lista de Materiais (BOM)', icon: CheckSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as HubTabId)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── CORPO PRINCIPAL COM ROLAGEM ─── */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
        
        {/* LEGENDA OBRIGATÓRIA NBR 5410 EM TODAS AS ABAS TRIFILARES */}
        {(activeTab === 'trifilar_trafo' || activeTab === 'trifilar_painel220' || activeTab === 'trifilar_painel380') && (
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Padrão NBR 5410:</span>
              <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
                <span className="flex items-center gap-1 text-rose-500">
                  <span className="w-3.5 h-2 rounded bg-rose-600 inline-block border border-rose-400"></span> Fase R (Vermelho)
                </span>
                <span className="flex items-center gap-1 text-slate-100">
                  <span className="w-3.5 h-2 rounded bg-white inline-block border border-slate-400"></span> Fase S (Branco)
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-3.5 h-2 rounded bg-black inline-block border border-slate-300"></span> Fase T (Preto)
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-3.5 h-2 rounded bg-sky-500 inline-block border border-sky-300"></span> Neutro N (Azul)
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-3.5 h-2 rounded bg-emerald-500 inline-block border border-emerald-300"></span> Terra PE (Verde)
                </span>
              </div>
            </div>

            <div className="text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              ✓ Proibido condutor PEN a jusante do BEP (NBR 17019 - Esquema TN-S)
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 1: DIAGRAMA TRIFILAR ESTENDIDO DYN1 + FIAÇÃO ATÉ OS CARREGADORES
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trifilar_trafo' && (
          <div className="space-y-4">
            {/* Banner de Orientação para Equipe Técnica */}
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between text-xs text-blue-200">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  <strong>Roteiro de Ligação de Campo:</strong> O técnico pode seguir a fiação contínua desde os bornes primários H1-H3, secundários X1-X3 e X0, o aterramento no BEP até as proteções e bornes terminais L1, L2, L3, N e PE dos dois carregadores.
                </span>
              </div>
              <span className="text-[10px] font-mono text-blue-300 uppercase bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                1700px Formato Amplo
              </span>
            </div>

            {/* Container com Scroll Horizontal e Zoom */}
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 shadow-xl bg-slate-950 scrollbar-thin">
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', minWidth: '1600px' }}>
                <svg 
                  viewBox="0 0 1700 860" 
                  className="w-[1700px] h-[860px]"
                  style={{ backgroundColor: c.bg }}
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="gridDots" width="30" height="30" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill={c.gridDot} opacity="0.4" />
                    </pattern>
                    <linearGradient id="trafoHeaderGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>
                    <linearGradient id="bepHeaderGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>

                  {/* Fundo com Grade Técnica */}
                  <rect width="1700" height="860" fill="url(#gridDots)" />

                  {/* TÍTULO PRINCIPAL NO TOPO */}
                  <g transform="translate(850, 35)">
                    <rect x="-380" y="-18" width="760" height="40" rx="10" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    <text x="0" y="8" textAnchor="middle" fill={c.textMain} fontSize="14" fontWeight="bold" fontFamily="sans-serif">
                      DIAGRAMA TRIFILAR DE POTÊNCIA & LIGAÇÃO DOS CARREGADORES (DYN1 ➔ TN-S)
                    </text>
                  </g>

                  {/* ─────────────────────────────────────────────────────────────
                      BLOCO 1 (ESQUERDA): ENTRADA 220V PRIMÁRIA & PROTEÇÃO IN-RUSH
                  ───────────────────────────────────────────────────────────── */}
                  <g transform="translate(40, 90)">
                    {/* Painel Entrada */}
                    <rect x="0" y="0" width="380" height="80" rx="12" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    <text x="15" y="24" fill={c.textMuted} fontSize="11" fontWeight="bold">1. ALIMENTAÇÃO PRIMÁRIA 220V TRIFÁSICA (QGBT)</text>
                    
                    {/* Linhas R, S, T da Entrada */}
                    <line x1="20" y1="42" x2="260" y2="42" stroke={c.phaseR} strokeWidth="3" />
                    <rect x="265" y="32" width="105" height="18" rx="4" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" />
                    <text x="317" y="45" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="monospace">Fase R (220V)</text>

                    <line x1="20" y1="56" x2="260" y2="56" stroke={c.phaseS} strokeWidth="3" />
                    <line x1="20" y1="56" x2="260" y2="56" stroke={c.phaseSStroke} strokeWidth="1" strokeDasharray="3 3" />
                    <rect x="265" y="47" width="105" height="18" rx="4" fill="#ffffff" fillOpacity="0.15" stroke="#94a3b8" />
                    <text x="317" y="60" textAnchor="middle" fill={c.textMain} fontSize="10" fontWeight="bold" fontFamily="monospace">Fase S (220V)</text>

                    <line x1="20" y1="70" x2="260" y2="70" stroke={c.phaseT} strokeWidth="3" />
                    {canvasTheme === 'dark_studio' && (
                      <line x1="20" y1="70" x2="260" y2="70" stroke={c.phaseTStroke} strokeWidth="1" strokeDasharray="3 3" />
                    )}
                    <rect x="265" y="62" width="105" height="18" rx="4" fill="#000000" fillOpacity="0.3" stroke="#475569" />
                    <text x="317" y="75" textAnchor="middle" fill={c.textMain} fontSize="10" fontWeight="bold" fontFamily="monospace">Fase T (Preto)</text>
                  </g>

                  {/* Disjuntor Primário Caixa Moldada Curva D */}
                  <g transform="translate(100, 200)">
                    <rect x="0" y="0" width="260" height="75" rx="10" fill={c.cardBg} stroke="#E45318" strokeWidth="2" />
                    <text x="130" y="24" textAnchor="middle" fill={c.textMain} fontSize="11" fontWeight="bold">DISJUNTOR PRIMÁRIO (TRAFO)</text>
                    <text x="130" y="42" textAnchor="middle" fill="#E45318" fontSize="12" fontWeight="black" fontFamily="monospace">
                      CURVA D • {primaryBreakerA}A Caixa Moldada
                    </text>
                    <text x="130" y="60" textAnchor="middle" fill={c.textMuted} fontSize="9">
                      Anti-Inrush (Disparo Magnético 10x a 14x In)
                    </text>

                    {/* Conexão de Entrada no Disjuntor */}
                    <line x1="60" y1="-30" x2="60" y2="0" stroke={c.phaseR} strokeWidth="3" />
                    <line x1="130" y1="-30" x2="130" y2="0" stroke={c.phaseS} strokeWidth="3" />
                    <line x1="200" y1="-30" x2="200" y2="0" stroke={c.phaseT} strokeWidth="3" />

                    {/* Conexão de Saída do Disjuntor para o Trafo */}
                    <line x1="60" y1="75" x2="60" y2="105" stroke={c.phaseR} strokeWidth="3" />
                    <line x1="130" y1="75" x2="130" y2="105" stroke={c.phaseS} strokeWidth="3" />
                    <line x1="200" y1="75" x2="200" y2="105" stroke={c.phaseT} strokeWidth="3" />
                  </g>

                  {/* ─────────────────────────────────────────────────────────────
                      BLOCO 2: TRANSFORMADOR A SECO 75kVA DYN1 (ALTA FIDELIDADE)
                  ───────────────────────────────────────────────────────────── */}
                  <g transform="translate(50, 305)">
                    <rect x="0" y="0" width="360" height="235" rx="16" fill={c.cardBg} stroke="#f59e0b" strokeWidth="2.5" />
                    
                    {/* Header Trafo */}
                    <rect x="0" y="0" width="360" height="34" rx="16" fill="url(#trafoHeaderGrad)" />
                    <text x="180" y="22" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                      TRANSFORMADOR ISOLADOR A SECO {nominalKVA} kVA (Dyn1)
                    </text>

                    {/* Bornes do Primário (H1, H2, H3 - 220V Δ) */}
                    <g transform="translate(0, 50)">
                      <circle cx="80" cy="10" r="14" fill="#1e293b" stroke={c.phaseR} strokeWidth="2.5" />
                      <text x="80" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">H1</text>

                      <circle cx="180" cy="10" r="14" fill="#1e293b" stroke={c.phaseS} strokeWidth="2.5" />
                      <text x="180" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">H2</text>

                      <circle cx="280" cy="10" r="14" fill="#1e293b" stroke={c.phaseT} strokeWidth="2.5" />
                      <text x="280" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">H3</text>
                    </g>

                    <text x="180" y="98" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                      Primário: 220V Triângulo (Δ) • Sem Neutro
                    </text>
                    <text x="180" y="114" textAnchor="middle" fill={c.textMuted} fontSize="9">
                      Bloqueio de 3ª Harmônica • Fator K-4 para Retificadores VE
                    </text>

                    {/* Blindagem Eletrostática */}
                    <line x1="20" y1="128" x2="340" y2="128" stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 5" />
                    <text x="180" y="139" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">
                      Blindagem Eletrostática Interfolhas Aterrada no BEP
                    </text>

                    <text x="180" y="165" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                      Secundário: 380V / 220V Estrela com Neutro (Yn)
                    </text>

                    {/* Bornes do Secundário (X1, X2, X3 e Borne Central de Neutro X0) */}
                    <g transform="translate(0, 195)">
                      <circle cx="60" cy="10" r="14" fill="#1e293b" stroke={c.phaseR} strokeWidth="2.5" />
                      <text x="60" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">X1</text>

                      <circle cx="140" cy="10" r="14" fill="#1e293b" stroke={c.phaseS} strokeWidth="2.5" />
                      <text x="140" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">X2</text>

                      <circle cx="220" cy="10" r="14" fill="#1e293b" stroke={c.phaseT} strokeWidth="2.5" />
                      <text x="220" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">X3</text>

                      {/* Borne Central X0 */}
                      <circle cx="300" cy="10" r="15" fill="#0284c7" stroke="#38bdf8" strokeWidth="3" />
                      <text x="300" y="14" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">X0</text>
                    </g>
                  </g>

                  {/* ─────────────────────────────────────────────────────────────
                      BLOCO 3: BARRAMENTO BEP CENTRAL DE ATERRAMENTO (EMBAIXO)
                  ───────────────────────────────────────────────────────────── */}
                  <g transform="translate(40, 680)">
                    <rect x="0" y="0" width="1620" height="45" rx="10" fill="url(#bepHeaderGrad)" stroke="#10b981" strokeWidth="2.5" />
                    <text x="810" y="28" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="black" letterSpacing="1.5">
                      BARRAMENTO DE EQUIPOTENCIALIZAÇÃO PRINCIPAL (BEP) — ATERRAMENTO TN-S UNIFICADO
                    </text>

                    {/* Malha de Aterramento SPDA */}
                    <line x1="160" y1="45" x2="160" y2="85" stroke="#10b981" strokeWidth="3.5" />
                    <path d="M 135 85 L 185 85 M 145 92 L 175 92 M 153 99 L 167 99" stroke="#10b981" strokeWidth="3" />
                    <rect x="70" y="105" width="180" height="22" rx="4" fill={c.cardBg} stroke="#10b981" />
                    <text x="160" y="120" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
                      Malha de Terra SPDA (R ≤ 10 Ω)
                    </text>

                    {/* Aterramento da Carcaça do Trafo */}
                    <line x1="280" y1="-140" x2="280" y2="0" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 4" />
                    <rect x="235" y="-70" width="90" height="20" rx="4" fill={c.cardBg} stroke="#10b981" />
                    <text x="280" y="-56" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">Carcaça Trafo</text>
                  </g>

                  {/* ROTA EXCLUSIVA DO NEUTRO X0 DO SECUNDÁRIO ➔ BEP (SEM CRUZAR TEXTO) */}
                  <g>
                    <path d="M 350 520 L 350 630 L 460 630 L 460 680" stroke="#38bdf8" strokeWidth="4.5" fill="none" />
                    <rect x="365" y="612" width="280" height="24" rx="6" fill={c.cardBg} stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="505" y="628" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      Aterramento do Neutro X0 no BEP (Mandatório)
                    </text>
                  </g>

                  {/* ─────────────────────────────────────────────────────────────
                      BLOCO 4 (DIREITA): PAINEL 380V (QDC-VE) & BARRAMENTO 5 POLOS
                  ───────────────────────────────────────────────────────────── */}
                  <g transform="translate(480, 90)">
                    <rect x="0" y="0" width="1180" height="540" rx="20" fill={c.cardBg} stroke="#10b981" strokeWidth="2" />
                    
                    {/* Header Painel 380V */}
                    <rect x="0" y="0" width="1180" height="40" rx="20" fill="#1e293b" />
                    <text x="590" y="26" textAnchor="middle" fill="#10b981" fontSize="13" fontWeight="bold">
                      PAINEL DE CARREGADORES VE — QDC-VE (380V TN-S PURO)
                    </text>

                    {/* BANNER DE PROIBIÇÃO TN-C (SEM LINHAS PASSANDO EM CIMA) */}
                    <rect x="30" y="52" width="1120" height="30" rx="8" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1.5" />
                    <text x="590" y="72" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="bold">
                      ⛔ REGRA COMPULSÓRIA NBR 17019 ITEM 722.312.2: PROIBIDO ESQUEMA TN-C (PEN COMBINADO) A JUSANTE DO BEP
                    </text>

                    {/* Disjuntor Geral Secundário 380V */}
                    <g transform="translate(40, 95)">
                      <rect x="0" y="0" width="340" height="60" rx="10" fill="#182234" stroke={c.cardBorder} />
                      <text x="170" y="24" textAnchor="middle" fill={c.textMain} fontSize="11" fontWeight="bold">
                        DISJUNTOR GERAL SECUNDÁRIO 380V
                      </text>
                      <text x="170" y="42" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="black" fontFamily="monospace">
                        CURVA C • {secondaryBreakerA}A Caixa Moldada
                      </text>
                      <text x="170" y="55" textAnchor="middle" fill={c.textMuted} fontSize="9">
                        In = {calculatedSecondaryCurrentA}A • 380V Trifásico
                      </text>
                    </g>

                    {/* ─── 5 BARRAMENTOS INDEPENDENTES DE COBRE (R, S, T, N, PE) ─── */}
                    <g transform="translate(420, 100)">
                      {/* Barramento R */}
                      <text x="0" y="12" fill={c.phaseR} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase R (380V)</text>
                      <line x1="210" y1="8" x2="720" y2="8" stroke={c.phaseR} strokeWidth="4" />

                      {/* Barramento S */}
                      <text x="0" y="34" fill={c.textMain} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase S (380V)</text>
                      <line x1="210" y1="30" x2="720" y2="30" stroke={c.phaseS} strokeWidth="4" />
                      <line x1="210" y1="30" x2="720" y2="30" stroke={c.phaseSStroke} strokeWidth="1" strokeDasharray="3 3" />

                      {/* Barramento T */}
                      <text x="0" y="56" fill={c.textMain} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase T (380V)</text>
                      <line x1="210" y1="52" x2="720" y2="52" stroke={c.phaseT} strokeWidth="4" />
                      {canvasTheme === 'dark_studio' && (
                        <line x1="210" y1="52" x2="720" y2="52" stroke={c.phaseTStroke} strokeWidth="1" strokeDasharray="3 3" />
                      )}

                      {/* Barramento N */}
                      <text x="0" y="78" fill={c.neutral} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Neutro (N)</text>
                      <line x1="210" y1="74" x2="720" y2="74" stroke={c.neutral} strokeWidth="4" strokeDasharray="6 3" />

                      {/* Barramento PE */}
                      <text x="0" y="100" fill={c.earth} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Terra (PE)</text>
                      <line x1="210" y1="96" x2="720" y2="96" stroke={c.earth} strokeWidth="4" />
                    </g>

                    {/* ─────────────────────────────────────────────────────────
                        CIRCUITO 1: PROTEÇÃO INDIVIDUAL ➔ CARREGADOR VE 1
                    ───────────────────────────────────────────────────────── */}
                    <g transform="translate(60, 230)">
                      {/* Caixa de Proteções VE 1 */}
                      <rect x="0" y="0" width="500" height="110" rx="12" fill="#14213d" stroke="#00B356" strokeWidth="1.5" />
                      <text x="250" y="22" textAnchor="middle" fill="#00B356" fontSize="12" fontWeight="bold">
                        CIRCUITO DEDICADO CARREGADOR 01 (22kW AC / 30kW DC)
                      </text>

                      {/* Disjuntor DIN Tripolar 40A */}
                      <rect x="25" y="38" width="200" height="58" rx="8" fill="#1e293b" stroke={c.cardBorder} />
                      <text x="125" y="56" textAnchor="middle" fill={c.textMain} fontSize="10" fontWeight="bold">Disjuntor 40A Curva C</text>
                      <text x="125" y="72" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="monospace">3P • Soprano / WEG</text>
                      <text x="125" y="86" textAnchor="middle" fill={c.textMuted} fontSize="8">Proteção Termomagnética</text>

                      {/* DR Tipo B Tetrapolar 30mA com RDC-DD */}
                      <rect x="245" y="38" width="230" height="58" rx="8" fill="#1e293b" stroke="#38bdf8" />
                      <text x="360" y="56" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">IDR Tetrapolar Tipo B (4P 40A)</text>
                      <text x="360" y="72" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace">Sensibilidade: 30mA AC / 6mA DC</text>
                      <text x="360" y="86" textAnchor="middle" fill="#10b981" fontSize="8">Em conformidade com IEC 62955</text>
                    </g>

                    {/* ESTAÇÃO DE RECARGA 1 (TOTEM) COM BORNES ROTULADOS FIO A FIO */}
                    <g transform="translate(60, 360)">
                      <rect x="0" y="0" width="500" height="150" rx="14" fill="#0b172a" stroke="#00B356" strokeWidth="2" />
                      
                      <div className="flex items-center">
                        <text x="25" y="26" fill="#00B356" fontSize="12" fontWeight="black">
                          ESTAÇÃO VE 1 (TOTEM / WALLBOX 380V)
                        </text>
                        <text x="475" y="26" textAnchor="end" fill="#38bdf8" fontSize="10" fontWeight="bold">
                          Plugue Tipo 2 / CCS2
                        </text>
                      </div>

                      {/* Barra de Bornes Internos L1, L2, L3, N, PE */}
                      <g transform="translate(25, 45)">
                        {/* Borne L1 */}
                        <g transform="translate(0, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.phaseR} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne L1</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.phaseR} fontSize="9" fontWeight="bold">Cabo Vermelho</text>
                        </g>

                        {/* Borne L2 */}
                        <g transform="translate(92, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.phaseS} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne L2</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.textMain} fontSize="9" fontWeight="bold">Cabo Branco</text>
                        </g>

                        {/* Borne L3 */}
                        <g transform="translate(184, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.phaseT} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne L3</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.textMain} fontSize="9" fontWeight="bold">Cabo Preto</text>
                        </g>

                        {/* Borne N */}
                        <g transform="translate(276, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.neutral} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne N</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.neutral} fontSize="9" fontWeight="bold">Cabo Azul</text>
                        </g>

                        {/* Borne PE */}
                        <g transform="translate(368, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.earth} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne PE</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.earth} fontSize="9" fontWeight="bold">Cabo Verde</text>
                        </g>
                      </g>

                      {/* Instrução ao Técnico */}
                      <rect x="25" y="110" width="450" height="26" rx="6" fill="#1e293b" />
                      <text x="250" y="127" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        ⚡ Sequência de Ligação do Eletricista: L1➔Vermelho, L2➔Branco, L3➔Preto, N➔Azul, PE➔Verde
                      </text>
                    </g>

                    {/* ─────────────────────────────────────────────────────────
                        CIRCUITO 2: PROTEÇÃO INDIVIDUAL ➔ CARREGADOR VE 2
                    ───────────────────────────────────────────────────────── */}
                    <g transform="translate(620, 230)">
                      {/* Caixa de Proteções VE 2 */}
                      <rect x="0" y="0" width="500" height="110" rx="12" fill="#14213d" stroke="#00B356" strokeWidth="1.5" />
                      <text x="250" y="22" textAnchor="middle" fill="#00B356" fontSize="12" fontWeight="bold">
                        CIRCUITO DEDICADO CARREGADOR 02 (22kW AC / 30kW DC)
                      </text>

                      {/* Disjuntor DIN Tripolar 40A */}
                      <rect x="25" y="38" width="200" height="58" rx="8" fill="#1e293b" stroke={c.cardBorder} />
                      <text x="125" y="56" textAnchor="middle" fill={c.textMain} fontSize="10" fontWeight="bold">Disjuntor 40A Curva C</text>
                      <text x="125" y="72" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="monospace">3P • Soprano / WEG</text>
                      <text x="125" y="86" textAnchor="middle" fill={c.textMuted} fontSize="8">Proteção Termomagnética</text>

                      {/* DR Tipo B Tetrapolar 30mA com RDC-DD */}
                      <rect x="245" y="38" width="230" height="58" rx="8" fill="#1e293b" stroke="#38bdf8" />
                      <text x="360" y="56" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">IDR Tetrapolar Tipo B (4P 40A)</text>
                      <text x="360" y="72" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace">Sensibilidade: 30mA AC / 6mA DC</text>
                      <text x="360" y="86" textAnchor="middle" fill="#10b981" fontSize="8">Em conformidade com IEC 62955</text>
                    </g>

                    {/* ESTAÇÃO DE RECARGA 2 (TOTEM) COM BORNES ROTULADOS FIO A FIO */}
                    <g transform="translate(620, 360)">
                      <rect x="0" y="0" width="500" height="150" rx="14" fill="#0b172a" stroke="#00B356" strokeWidth="2" />
                      
                      <text x="25" y="26" fill="#00B356" fontSize="12" fontWeight="black">
                        ESTAÇÃO VE 2 (TOTEM / WALLBOX 380V)
                      </text>
                      <text x="475" y="26" textAnchor="end" fill="#38bdf8" fontSize="10" fontWeight="bold">
                        Plugue Tipo 2 / CCS2
                      </text>

                      {/* Barra de Bornes Internos L1, L2, L3, N, PE */}
                      <g transform="translate(25, 45)">
                        <g transform="translate(0, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.phaseR} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne L1</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.phaseR} fontSize="9" fontWeight="bold">Cabo Vermelho</text>
                        </g>

                        <g transform="translate(92, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.phaseS} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne L2</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.textMain} fontSize="9" fontWeight="bold">Cabo Branco</text>
                        </g>

                        <g transform="translate(184, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.phaseT} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne L3</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.textMain} fontSize="9" fontWeight="bold">Cabo Preto</text>
                        </g>

                        <g transform="translate(276, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.neutral} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne N</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.neutral} fontSize="9" fontWeight="bold">Cabo Azul</text>
                        </g>

                        <g transform="translate(368, 0)">
                          <rect x="0" y="0" width="80" height="50" rx="8" fill="#1e293b" stroke={c.earth} strokeWidth="2" />
                          <text x="40" y="20" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Borne PE</text>
                          <text x="40" y="38" textAnchor="middle" fill={c.earth} fontSize="9" fontWeight="bold">Cabo Verde</text>
                        </g>
                      </g>

                      {/* Instrução ao Técnico */}
                      <rect x="25" y="110" width="450" height="26" rx="6" fill="#1e293b" />
                      <text x="250" y="127" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        ⚡ Sequência de Ligação do Eletricista: L1➔Vermelho, L2➔Branco, L3➔Preto, N➔Azul, PE➔Verde
                      </text>
                    </g>
                  </g>

                  {/* ─────────────────────────────────────────────────────────────
                      ROTEAMENTO FÍSICO DOS CONDUTORES X1, X2, X3, N, PE ➔ QDC-VE
                      (Linhas completamente espaçadas, sem sobreposição nem contato)
                  ───────────────────────────────────────────────────────────── */}
                  {/* Linha X1 (Fase R - Vermelho) */}
                  <path d="M 110 520 L 110 570 L 440 570 L 440 215 L 520 215" stroke={c.phaseR} strokeWidth="3" fill="none" />
                  
                  {/* Linha X2 (Fase S - Branco) */}
                  <path d="M 190 520 L 190 585 L 452 585 L 452 230 L 520 230" stroke={c.phaseS} strokeWidth="3" fill="none" />
                  <path d="M 190 520 L 190 585 L 452 585 L 452 230 L 520 230" stroke={c.phaseSStroke} strokeWidth="1" strokeDasharray="3 3" fill="none" />

                  {/* Linha X3 (Fase T - Preto) */}
                  <path d="M 270 520 L 270 600 L 464 600 L 464 245 L 520 245" stroke={c.phaseT} strokeWidth="3" fill="none" />
                  {canvasTheme === 'dark_studio' && (
                    <path d="M 270 520 L 270 600 L 464 600 L 464 245 L 520 245" stroke={c.phaseTStroke} strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  )}

                  {/* Condutor Neutro Puro (N) subindo do BEP para o Barramento de Neutro */}
                  <path d="M 960 680 L 960 215 L 940 215" stroke={c.neutral} strokeWidth="3.5" strokeDasharray="6 3" fill="none" />
                  <rect x="880" y="470" width="160" height="22" rx="4" fill={c.cardBg} stroke={c.neutral} />
                  <text x="960" y="485" textAnchor="middle" fill={c.neutral} fontSize="9" fontWeight="bold">
                    Neutro Puro N (Isolado)
                  </text>

                  {/* Condutor de Proteção (PE) subindo do BEP para o Barramento de Terra */}
                  <path d="M 1120 680 L 1120 235 L 1100 235" stroke={c.earth} strokeWidth="3.5" fill="none" />
                  <rect x="1040" y="505" width="160" height="22" rx="4" fill={c.cardBg} stroke={c.earth} />
                  <text x="1120" y="520" textAnchor="middle" fill={c.earth} fontSize="9" fontWeight="bold">
                    Condutor PE (Aterrado)
                  </text>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 2: PAINEL 220V QGBT (REPLICA E ESTENDE A FOTO 3 EM FORMATO TRIFILAR)
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trifilar_painel220' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Quadro Geral de Baixa Tensão (QGBT 220V):</strong> Representação trifilar com a chegada da concessionária (CEMIG), disjuntor de entrada 200A/225A, barramento de 250A e as 5 derivações (Carga do Imóvel, Trafo 75kVA Curva D, Iluminação, Tomadas e CFTV).
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 uppercase bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                Foto 03 em Formato Trifilar
              </span>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 shadow-xl bg-slate-950 scrollbar-thin">
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', minWidth: '1600px' }}>
                <svg 
                  viewBox="0 0 1700 860" 
                  className="w-[1700px] h-[860px]"
                  style={{ backgroundColor: c.bg }}
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="1700" height="860" fill="url(#gridDots)" />

                  {/* Título */}
                  <g transform="translate(850, 35)">
                    <rect x="-350" y="-18" width="700" height="40" rx="10" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    <text x="0" y="8" textAnchor="middle" fill={c.textMain} fontSize="14" fontWeight="bold">
                      DIAGRAMA TRIFILAR DO PAINEL GERAL DE BAIXA TENSÃO (QGBT 220V)
                    </text>
                  </g>

                  {/* ─── TOPO: CONCESSIONÁRIA & PADRÃO DE ENTRADA CEMIG ─── */}
                  <g transform="translate(650, 75)">
                    <rect x="0" y="0" width="400" height="135" rx="14" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" strokeDasharray="5 5" />
                    <text x="200" y="22" textAnchor="middle" fill={c.textMain} fontSize="11" fontWeight="black">
                      VEM DA CONCESSIONÁRIA (CEMIG DISTRIBUIÇÃO)
                    </text>
                    <text x="200" y="38" textAnchor="middle" fill={c.textMuted} fontSize="9">
                      Padrão de Entrada Categoria C6 (CEMIG ND-5.1)
                    </text>

                    {/* Medidor kWh */}
                    <rect x="60" y="52" width="100" height="40" rx="6" fill="#1e293b" stroke="#38bdf8" />
                    <text x="110" y="70" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">MEDIDOR</text>
                    <text x="110" y="84" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">kWh</text>

                    {/* Disjuntor do Padrão */}
                    <rect x="230" y="52" width="120" height="40" rx="6" fill="#1e293b" stroke="#f59e0b" />
                    <text x="290" y="68" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">DISJ. PADRÃO</text>
                    <text x="290" y="82" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">200A Curva C (3P)</text>

                    {/* Especificação do Cabo Multiplexado */}
                    <rect x="20" y="102" width="360" height="22" rx="4" fill="#0f172a" />
                    <text x="200" y="116" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      Cabo Alumínio Quadruplex (3F+N) 150mm² + 150mm² N (0.6/1kV XLPE)
                    </text>
                  </g>

                  {/* Disjuntor Geral do Painel 220V + DPS */}
                  <g transform="translate(680, 235)">
                    <rect x="0" y="0" width="340" height="65" rx="10" fill={c.cardBg} stroke="#E45318" strokeWidth="2" />
                    <text x="170" y="24" textAnchor="middle" fill={c.textMain} fontSize="11" fontWeight="bold">
                      DISJUNTOR GERAL DO PAINEL 220V
                    </text>
                    <text x="170" y="42" textAnchor="middle" fill="#E45318" fontSize="12" fontWeight="black" fontFamily="monospace">
                      225A Caixa Moldada (3P) • Icu ≥ 25 kA
                    </text>
                    <text x="170" y="56" textAnchor="middle" fill={c.textMuted} fontSize="9">
                      Proteção Geral QGBT
                    </text>

                    {/* Bloco DPS */}
                    <g transform="translate(360, 10)">
                      <rect x="0" y="0" width="100" height="45" rx="6" fill="#1e293b" stroke="#38bdf8" />
                      <text x="50" y="20" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">DPS Cl. II</text>
                      <text x="50" y="34" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace">45 kA</text>
                    </g>
                  </g>

                  {/* ─── BARRAMENTO PRINCIPAL 220V (250A Cobre) ─── */}
                  <g transform="translate(80, 335)">
                    {/* Barramento Fase R */}
                    <text x="0" y="14" fill={c.phaseR} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase R (220V)</text>
                    <line x1="220" y1="10" x2="1500" y2="10" stroke={c.phaseR} strokeWidth="4" />

                    {/* Barramento Fase S */}
                    <text x="0" y="36" fill={c.textMain} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase S (220V)</text>
                    <line x1="220" y1="32" x2="1500" y2="32" stroke={c.phaseS} strokeWidth="4" />
                    <line x1="220" y1="32" x2="1500" y2="32" stroke={c.phaseSStroke} strokeWidth="1" strokeDasharray="3 3" />

                    {/* Barramento Fase T */}
                    <text x="0" y="58" fill={c.textMain} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase T (220V)</text>
                    <line x1="220" y1="54" x2="1500" y2="54" stroke={c.phaseT} strokeWidth="4" />
                    {canvasTheme === 'dark_studio' && (
                      <line x1="220" y1="54" x2="1500" y2="54" stroke={c.phaseTStroke} strokeWidth="1" strokeDasharray="3 3" />
                    )}

                    {/* Barramento N */}
                    <text x="0" y="80" fill={c.neutral} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Neutro (N)</text>
                    <line x1="220" y1="76" x2="1500" y2="76" stroke={c.neutral} strokeWidth="4" strokeDasharray="6 3" />

                    {/* Barramento PE */}
                    <text x="0" y="102" fill={c.earth} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Terra (PE)</text>
                    <line x1="220" y1="98" x2="1500" y2="98" stroke={c.earth} strokeWidth="4" />
                  </g>

                  {/* ─────────────────────────────────────────────────────────────
                      AS 5 DERIVAÇÕES DE CARGA DO PAINEL 220V (CONFORME FOTO 3)
                  ───────────────────────────────────────────────────────────── */}
                  
                  {/* Derivação 1: Carga Existente Imóvel */}
                  <g transform="translate(100, 470)">
                    <rect x="0" y="0" width="260" height="310" rx="14" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    
                    {/* Disjuntor */}
                    <rect x="25" y="20" width="210" height="50" rx="8" fill="#1e293b" stroke="#10b981" />
                    <text x="130" y="40" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">Disjuntor 32A 3P</text>
                    <text x="130" y="56" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace">Curva C (Trifásico)</text>

                    {/* Detalhes de Cabos */}
                    <rect x="25" y="80" width="210" height="30" rx="6" fill="#0f172a" />
                    <text x="130" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Cabos 16mm² Cu (R+S+T+N+PE)
                    </text>

                    {/* Bloco de Carga */}
                    <g transform="translate(25, 125)">
                      <rect x="0" y="0" width="210" height="150" rx="10" fill="#182234" stroke="#10b981" strokeWidth="1.5" />
                      <text x="105" y="26" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="bold">
                        CARGA EXISTENTE IMÓVEL
                      </text>
                      <text x="105" y="52" textAnchor="middle" fill={c.textMain} fontSize="18" fontWeight="black" fontFamily="monospace">
                        7.9 kW
                      </text>
                      <text x="105" y="70" textAnchor="middle" fill={c.textMuted} fontSize="10">
                        Demanda Base Residencial/Comercial
                      </text>
                      
                      {/* Lista de Fios */}
                      <rect x="15" y="85" width="180" height="50" rx="6" fill="#0f172a" />
                      <text x="105" y="104" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Fase R, S e T (220V)</text>
                      <text x="105" y="122" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">Neutro Azul + Terra Verde</text>
                    </g>
                  </g>

                  {/* Derivação 2: Proteção do Transformador 75kVA (Alimentador VE) */}
                  <g transform="translate(410, 470)">
                    <rect x="0" y="0" width="290" height="310" rx="14" fill={c.cardBg} stroke="#f59e0b" strokeWidth="2" />
                    
                    {/* Disjuntor Curva D */}
                    <rect x="25" y="20" width="240" height="50" rx="8" fill="#1e293b" stroke="#E45318" />
                    <text x="145" y="40" textAnchor="middle" fill="#E45318" fontSize="11" fontWeight="bold">Disjuntor 225A 3P</text>
                    <text x="145" y="56" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace">Curva D (Anti-Inrush Trafo)</text>

                    {/* Detalhes de Cabos */}
                    <rect x="25" y="80" width="240" height="30" rx="6" fill="#0f172a" />
                    <text x="145" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Cabos 95mm² Cu (R+S+T+PE)
                    </text>

                    {/* Bloco de Carga */}
                    <g transform="translate(25, 125)">
                      <rect x="0" y="0" width="240" height="150" rx="10" fill="#182234" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="120" y="26" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">
                        ALIMENTADOR TRAFO 75kVA
                      </text>
                      <text x="120" y="52" textAnchor="middle" fill="#f59e0b" fontSize="18" fontWeight="black" fontFamily="monospace">
                        60.0 kW (75 kVA)
                      </text>
                      <text x="120" y="70" textAnchor="middle" fill={c.textMuted} fontSize="10">
                        Primário 220V Δ ➔ Painel 380V
                      </text>
                      
                      <rect x="15" y="85" width="210" height="50" rx="6" fill="#0f172a" />
                      <text x="120" y="104" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Bornes H1, H2 e H3</text>
                      <text x="120" y="122" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">Blindagem Aterrada no BEP</text>
                    </g>
                  </g>

                  {/* Derivação 3: Iluminação Técnica LED */}
                  <g transform="translate(745, 470)">
                    <rect x="0" y="0" width="260" height="310" rx="14" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    
                    <rect x="25" y="20" width="210" height="50" rx="8" fill="#1e293b" stroke="#38bdf8" />
                    <text x="130" y="40" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Disjuntor 10A 1P</text>
                    <text x="130" y="56" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace">Curva B (Monofásico)</text>

                    <rect x="25" y="80" width="210" height="30" rx="6" fill="#0f172a" />
                    <text x="130" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Cabos 2.5mm² (Fase R + N + PE)
                    </text>

                    <g transform="translate(25, 125)">
                      <rect x="0" y="0" width="210" height="150" rx="10" fill="#182234" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="105" y="26" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
                        ILUMINAÇÃO TÉCNICA LED
                      </text>
                      <text x="105" y="52" textAnchor="middle" fill={c.textMain} fontSize="18" fontWeight="black" fontFamily="monospace">
                        0.4 kW
                      </text>
                      <text x="105" y="70" textAnchor="middle" fill={c.textMuted} fontSize="10">
                        Iluminação do Pátio de Recarga
                      </text>
                      
                      <rect x="15" y="85" width="180" height="50" rx="6" fill="#0f172a" />
                      <text x="105" y="104" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Fase R (Vermelho)</text>
                      <text x="105" y="122" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">Neutro Azul + Terra Verde</text>
                    </g>
                  </g>

                  {/* Derivação 4: Tomadas de Serviço 2P+T */}
                  <g transform="translate(1050, 470)">
                    <rect x="0" y="0" width="260" height="310" rx="14" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    
                    <rect x="25" y="20" width="210" height="50" rx="8" fill="#1e293b" stroke="#f59e0b" />
                    <text x="130" y="40" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">Disjuntor 10A 1P</text>
                    <text x="130" y="56" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace">Curva C (Monofásico)</text>

                    <rect x="25" y="80" width="210" height="30" rx="6" fill="#0f172a" />
                    <text x="130" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Cabos 2.5mm² (Fase S + N + PE)
                    </text>

                    <g transform="translate(25, 125)">
                      <rect x="0" y="0" width="210" height="150" rx="10" fill="#182234" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="105" y="26" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">
                        TOMADAS DE SERVIÇO 2P+T
                      </text>
                      <text x="105" y="52" textAnchor="middle" fill={c.textMain} fontSize="18" fontWeight="black" fontFamily="monospace">
                        1.0 kW
                      </text>
                      <text x="105" y="70" textAnchor="middle" fill={c.textMuted} fontSize="10">
                        Manutenção & Ferramentas
                      </text>
                      
                      <rect x="15" y="85" width="180" height="50" rx="6" fill="#0f172a" />
                      <text x="105" y="104" textAnchor="middle" fill={c.textMain} fontSize="9" fontWeight="bold">Fase S (Branco)</text>
                      <text x="105" y="122" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">Neutro Azul + Terra Verde</text>
                    </g>
                  </g>

                  {/* Derivação 5: CFTV & Telecomunicação */}
                  <g transform="translate(1355, 470)">
                    <rect x="0" y="0" width="260" height="310" rx="14" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    
                    <rect x="25" y="20" width="210" height="50" rx="8" fill="#1e293b" stroke="#38bdf8" />
                    <text x="130" y="40" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">Disjuntor 10A 1P</text>
                    <text x="130" y="56" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace">Curva C (Monofásico)</text>

                    <rect x="25" y="80" width="210" height="30" rx="6" fill="#0f172a" />
                    <text x="130" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Cabos 2.5mm² (Fase T + N + PE)
                    </text>

                    <g transform="translate(25, 125)">
                      <rect x="0" y="0" width="210" height="150" rx="10" fill="#182234" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="105" y="26" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
                        CFTV & TELECOMUNICAÇÃO
                      </text>
                      <text x="105" y="52" textAnchor="middle" fill={c.textMain} fontSize="18" fontWeight="black" fontFamily="monospace">
                        0.5 kW
                      </text>
                      <text x="105" y="70" textAnchor="middle" fill={c.textMuted} fontSize="10">
                        Câmeras & Modem 4G/DLM
                      </text>
                      
                      <rect x="15" y="85" width="180" height="50" rx="6" fill="#0f172a" />
                      <text x="105" y="104" textAnchor="middle" fill={c.textMain} fontSize="9" fontWeight="bold">Fase T (Preto)</text>
                      <text x="105" y="122" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">Neutro Azul + Terra Verde</text>
                    </g>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 3: PAINEL 380V QDC-VE (SUPER DETALHAMENTO DOS CARREGADORES)
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trifilar_painel380' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Quadro de Distribuição de Carga Veicular (QDC-VE 380V):</strong> Detalhamento dos barramentos R, S, T, N e PE em 380V, disjuntores DIN e IDRs Tipo B 30mA com RDC-DD 6mA, e ligação dos condutores diretamente aos conectores e carregadores.
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Padrão NBR 17019
              </span>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 shadow-xl bg-slate-950 scrollbar-thin">
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', minWidth: '1600px' }}>
                <svg 
                  viewBox="0 0 1700 800" 
                  className="w-[1700px] h-[800px]"
                  style={{ backgroundColor: c.bg }}
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="1700" height="800" fill="url(#gridDots)" />

                  <g transform="translate(850, 35)">
                    <rect x="-350" y="-18" width="700" height="40" rx="10" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    <text x="0" y="8" textAnchor="middle" fill={c.textMain} fontSize="14" fontWeight="bold">
                      DIAGRAMA TRIFILAR DETALHADO DO QUADRO DE RECARGA (QDC-VE 380V)
                    </text>
                  </g>

                  {/* Alimentação 380V vinda do Transformador Dyn1 */}
                  <g transform="translate(100, 80)">
                    <rect x="0" y="0" width="380" height="110" rx="12" fill={c.cardBg} stroke={c.cardBorder} strokeWidth="1.5" />
                    <text x="20" y="24" fill={c.textMain} fontSize="11" fontWeight="bold">ALIMENTAÇÃO 380V DO SECUNDÁRIO DYN1</text>
                    
                    <g transform="translate(20, 40)">
                      <line x1="0" y1="10" x2="340" y2="10" stroke={c.phaseR} strokeWidth="3" />
                      <line x1="0" y1="22" x2="340" y2="22" stroke={c.phaseS} strokeWidth="3" />
                      <line x1="0" y1="34" x2="340" y2="34" stroke={c.phaseT} strokeWidth="3" />
                      <line x1="0" y1="46" x2="340" y2="46" stroke={c.neutral} strokeWidth="3" strokeDasharray="5 3" />
                      <line x1="0" y1="58" x2="340" y2="58" stroke={c.earth} strokeWidth="3" />
                    </g>
                  </g>

                  {/* Disjuntor Geral 380V */}
                  <g transform="translate(540, 80)">
                    <rect x="0" y="0" width="360" height="110" rx="12" fill={c.cardBg} stroke="#10b981" strokeWidth="2" />
                    <text x="180" y="24" textAnchor="middle" fill={c.textMain} fontSize="12" fontWeight="bold">DISJUNTOR GERAL QDC-VE</text>
                    <text x="180" y="46" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="black" fontFamily="monospace">
                      CURVA C • {secondaryBreakerA}A Caixa Moldada
                    </text>
                    <text x="180" y="66" textAnchor="middle" fill={c.textMuted} fontSize="10">
                      Capacidade de Ruptura: Icu ≥ 25 kA em 380V
                    </text>
                    <rect x="40" y="80" width="280" height="20" rx="4" fill="#0f172a" />
                    <text x="180" y="94" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">
                      Acoplado a Bobina Shunt Trip (MX) de Emergência
                    </text>
                  </g>

                  {/* Botão de Emergência */}
                  <g transform="translate(950, 95)">
                    <circle cx="40" cy="40" r="32" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
                    <text x="40" y="45" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">EPO</text>
                    <text x="40" y="90" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Botão de Emergência</text>
                  </g>

                  {/* Barramentos Principais 380V */}
                  <g transform="translate(100, 230)">
                    <text x="0" y="14" fill={c.phaseR} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase R (380V)</text>
                    <line x1="220" y1="10" x2="1480" y2="10" stroke={c.phaseR} strokeWidth="4" />

                    <text x="0" y="36" fill={c.textMain} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase S (380V)</text>
                    <line x1="220" y1="32" x2="1480" y2="32" stroke={c.phaseS} strokeWidth="4" />

                    <text x="0" y="58" fill={c.textMain} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Fase T (380V)</text>
                    <line x1="220" y1="54" x2="1480" y2="54" stroke={c.phaseT} strokeWidth="4" />

                    <text x="0" y="80" fill={c.neutral} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Neutro (N)</text>
                    <line x1="220" y1="76" x2="1480" y2="76" stroke={c.neutral} strokeWidth="4" strokeDasharray="6 3" />

                    <text x="0" y="102" fill={c.earth} fontSize="11" fontWeight="bold" fontFamily="monospace">Barramento Terra (PE)</text>
                    <line x1="220" y1="98" x2="1480" y2="98" stroke={c.earth} strokeWidth="4" />
                  </g>

                  {/* 3 Colunas de Carregadores */}
                  {/* Carregador 1 */}
                  <g transform="translate(150, 370)">
                    <rect x="0" y="0" width="420" height="380" rx="16" fill={c.cardBg} stroke="#00B356" strokeWidth="2" />
                    <text x="210" y="28" textAnchor="middle" fill="#00B356" fontSize="13" fontWeight="black">
                      CARREGADOR VE 1 (TOTEM 01)
                    </text>

                    <rect x="30" y="50" width="360" height="70" rx="8" fill="#182234" stroke={c.cardBorder} />
                    <text x="210" y="72" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                      Disjuntor 40A Curva C + IDR Tipo B (30mA / 6mA DC)
                    </text>
                    <text x="210" y="92" textAnchor="middle" fill="#94a3b8" fontSize="9">
                      Cabo Cobre 5x10mm² (3F+N+PE) • Duto 1.1/2"
                    </text>

                    {/* Bornes do Totem 1 */}
                    <g transform="translate(30, 140)">
                      <rect x="0" y="0" width="360" height="150" rx="10" fill="#0b172a" stroke="#00B356" />
                      <text x="180" y="24" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                        BORNES DE LIGAÇÃO DO EQUIPAMENTO:
                      </text>
                      
                      <g transform="translate(20, 45)">
                        <rect x="0" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.phaseR} strokeWidth="2" />
                        <text x="27" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">L1</text>
                        <text x="27" y="38" textAnchor="middle" fill={c.phaseR} fontSize="8">Vermelho</text>

                        <rect x="65" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.phaseS} strokeWidth="2" />
                        <text x="92" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">L2</text>
                        <text x="92" y="38" textAnchor="middle" fill={c.textMain} fontSize="8">Branco</text>

                        <rect x="130" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.phaseT} strokeWidth="2" />
                        <text x="157" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">L3</text>
                        <text x="157" y="38" textAnchor="middle" fill={c.textMain} fontSize="8">Preto</text>

                        <rect x="195" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.neutral} strokeWidth="2" />
                        <text x="222" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">N</text>
                        <text x="222" y="38" textAnchor="middle" fill={c.neutral} fontSize="8">Azul</text>

                        <rect x="260" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.earth} strokeWidth="2" />
                        <text x="287" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">PE</text>
                        <text x="287" y="38" textAnchor="middle" fill={c.earth} fontSize="8">Verde</text>
                      </g>

                      <text x="180" y="125" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
                        Potência: 22kW AC (3x32A em 380V)
                      </text>
                    </g>
                  </g>

                  {/* Carregador 2 */}
                  <g transform="translate(640, 370)">
                    <rect x="0" y="0" width="420" height="380" rx="16" fill={c.cardBg} stroke="#00B356" strokeWidth="2" />
                    <text x="210" y="28" textAnchor="middle" fill="#00B356" fontSize="13" fontWeight="black">
                      CARREGADOR VE 2 (TOTEM 02)
                    </text>

                    <rect x="30" y="50" width="360" height="70" rx="8" fill="#182234" stroke={c.cardBorder} />
                    <text x="210" y="72" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                      Disjuntor 40A Curva C + IDR Tipo B (30mA / 6mA DC)
                    </text>
                    <text x="210" y="92" textAnchor="middle" fill="#94a3b8" fontSize="9">
                      Cabo Cobre 5x10mm² (3F+N+PE) • Duto 1.1/2"
                    </text>

                    {/* Bornes do Totem 2 */}
                    <g transform="translate(30, 140)">
                      <rect x="0" y="0" width="360" height="150" rx="10" fill="#0b172a" stroke="#00B356" />
                      <text x="180" y="24" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                        BORNES DE LIGAÇÃO DO EQUIPAMENTO:
                      </text>
                      
                      <g transform="translate(20, 45)">
                        <rect x="0" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.phaseR} strokeWidth="2" />
                        <text x="27" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">L1</text>
                        <text x="27" y="38" textAnchor="middle" fill={c.phaseR} fontSize="8">Vermelho</text>

                        <rect x="65" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.phaseS} strokeWidth="2" />
                        <text x="92" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">L2</text>
                        <text x="92" y="38" textAnchor="middle" fill={c.textMain} fontSize="8">Branco</text>

                        <rect x="130" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.phaseT} strokeWidth="2" />
                        <text x="157" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">L3</text>
                        <text x="157" y="38" textAnchor="middle" fill={c.textMain} fontSize="8">Preto</text>

                        <rect x="195" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.neutral} strokeWidth="2" />
                        <text x="222" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">N</text>
                        <text x="222" y="38" textAnchor="middle" fill={c.neutral} fontSize="8">Azul</text>

                        <rect x="260" y="0" width="55" height="50" rx="6" fill="#1e293b" stroke={c.earth} strokeWidth="2" />
                        <text x="287" y="22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">PE</text>
                        <text x="287" y="38" textAnchor="middle" fill={c.earth} fontSize="8">Verde</text>
                      </g>

                      <text x="180" y="125" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
                        Potência: 22kW AC (3x32A em 380V)
                      </text>
                    </g>
                  </g>

                  {/* Circuito Reserva / Futura Expansão */}
                  <g transform="translate(1130, 370)">
                    <rect x="0" y="0" width="420" height="380" rx="16" fill={c.cardBg} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 5" />
                    <text x="210" y="28" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">
                      RESERVA EXPANSÃO (CARREGADOR 03)
                    </text>
                    
                    <rect x="30" y="80" width="360" height="120" rx="10" fill="#182234" />
                    <text x="210" y="125" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                      Espaço Reserva DIN no Barramento
                    </text>
                    <text x="210" y="150" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      Capacidade de Barramento dimensionada para expansão
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 4: DIAGRAMA UNIFILAR NORMALIZADO NBR 5410
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'unifilar' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between text-xs text-blue-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  <strong>Diagrama Unifilar Normalizado (NBR 5410):</strong> Representação unifilar clássica para aprovação de projeto na concessionária e prontuário das instalações elétricas (NR-10).
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 shadow-xl bg-white p-6 scrollbar-thin">
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', minWidth: '1200px' }}>
                <svg 
                  viewBox="0 0 1200 680" 
                  className="w-[1200px] h-[680px]"
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <text x="600" y="30" textAnchor="middle" fill="#0f172a" fontSize="15" fontWeight="bold">
                    DIAGRAMA UNIFILAR DO SISTEMA ELEVADOR DYN1 E PÁTIO DE RECARGA
                  </text>

                  {/* Entrada */}
                  <line x1="600" y1="50" x2="600" y2="100" stroke="#0f172a" strokeWidth="2.5" />
                  <text x="615" y="75" fill="#0f172a" fontSize="10" fontWeight="bold">QGBT 220V (3F, 220V, 60Hz)</text>

                  {/* Disjuntor Primário */}
                  <rect x="585" y="100" width="30" height="40" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                  <line x1="585" y1="100" x2="615" y2="140" stroke="#0f172a" strokeWidth="2" />
                  <text x="630" y="125" fill="#0f172a" fontSize="10" fontWeight="bold">Disjuntor Caixa Moldada {primaryBreakerA}A Curva D</text>

                  <line x1="600" y1="140" x2="600" y2="200" stroke="#0f172a" strokeWidth="2.5" />

                  {/* Símbolo Trafo Dyn1 (Dois Círculos Cruzados) */}
                  <circle cx="600" cy="230" r="30" stroke="#d97706" strokeWidth="3" fill="none" />
                  <circle cx="600" cy="270" r="30" stroke="#0284c7" strokeWidth="3" fill="none" />
                  <text x="600" y="235" textAnchor="middle" fill="#d97706" fontSize="11" fontWeight="bold">Δ 220V</text>
                  <text x="600" y="275" textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">Yn 380V</text>
                  <text x="645" y="255" fill="#0f172a" fontSize="11" fontWeight="bold">
                    Trafo a Seco {nominalKVA} kVA (Dyn1) • K-4
                  </text>

                  <line x1="600" y1="300" x2="600" y2="350" stroke="#0f172a" strokeWidth="2.5" />

                  {/* Disjuntor Secundário */}
                  <rect x="585" y="350" width="30" height="40" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                  <line x1="585" y1="350" x2="615" y2="390" stroke="#0f172a" strokeWidth="2" />
                  <text x="630" y="375" fill="#0f172a" fontSize="10" fontWeight="bold">Disjuntor Geral 380V {secondaryBreakerA}A Curva C</text>

                  <line x1="600" y1="390" x2="600" y2="440" stroke="#0f172a" strokeWidth="2.5" />

                  {/* Barramento 380V */}
                  <line x1="200" y1="440" x2="1000" y2="440" stroke="#0f172a" strokeWidth="4" />
                  <text x="600" y="430" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">
                    BARRAMENTO GERAL 380V / 220V (3F+N+PE)
                  </text>

                  {/* Saída Carregador 1 */}
                  <line x1="380" y1="440" x2="380" y2="500" stroke="#0f172a" strokeWidth="2" />
                  <rect x="365" y="500" width="30" height="35" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                  <line x1="365" y1="500" x2="395" y2="535" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="405" y="520" fill="#0f172a" fontSize="9" fontWeight="bold">DJ 40A 3P + DR Tipo B 30mA</text>
                  <line x1="380" y1="535" x2="380" y2="590" stroke="#0f172a" strokeWidth="2" />
                  <rect x="330" y="590" width="100" height="50" rx="8" fill="#f8fafc" stroke="#00B356" strokeWidth="2" />
                  <text x="380" y="612" textAnchor="middle" fill="#00B356" fontSize="10" fontWeight="bold">CARREGADOR 1</text>
                  <text x="380" y="628" textAnchor="middle" fill="#0f172a" fontSize="9">22 kW (380V)</text>

                  {/* Saída Carregador 2 */}
                  <line x1="820" y1="440" x2="820" y2="500" stroke="#0f172a" strokeWidth="2" />
                  <rect x="805" y="500" width="30" height="35" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                  <line x1="805" y1="500" x2="835" y2="535" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="845" y="520" fill="#0f172a" fontSize="9" fontWeight="bold">DJ 40A 3P + DR Tipo B 30mA</text>
                  <line x1="820" y1="535" x2="820" y2="590" stroke="#0f172a" strokeWidth="2" />
                  <rect x="770" y="590" width="100" height="50" rx="8" fill="#f8fafc" stroke="#00B356" strokeWidth="2" />
                  <text x="820" y="612" textAnchor="middle" fill="#00B356" fontSize="10" fontWeight="bold">CARREGADOR 2</text>
                  <text x="820" y="628" textAnchor="middle" fill="#0f172a" fontSize="9">22 kW (380V)</text>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 5: CADERNO DE MONTAGEM DE CAMPO PARA ELETRICISTAS
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'montagem' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-amber-400 block text-sm">1. Ventilação e Convecção Térmica (AN)</strong>
              <p className="text-slate-300 leading-relaxed">
                O transformador a seco dissipa cerca de {lossesKW} kW sob carga total. É obrigatório manter afastamento mínimo de <strong>500 mm</strong> de paredes laterais e traseiras para permitir circulação livre de ar.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-amber-400 block text-sm">2. Amortecedores de Vibração (Vibra-Stop)</strong>
              <p className="text-slate-300 leading-relaxed">
                Instalar obrigatoriamente 4 coxins amortecedores de borracha vulcanizada (neoprene) sob as sapatas do transformador para eliminar a propagação de ruído acústico e zumbido de 120Hz para a estrutura da edificação.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-amber-400 block text-sm">3. Terminais Bimetálicos e Torquímetro</strong>
              <p className="text-slate-300 leading-relaxed">
                Utilizar terminais de compressão estanhados com 2 furos para parafusos M10. Aplicar torque calibrado de <strong>25 N·m</strong> com torquímetro e pasta antioxidante nos bornes de alumínio/cobre para prevenir pontos quentes.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-amber-400 block text-sm">4. Rigidez do Esquema TN-S no BEP</strong>
              <p className="text-slate-300 leading-relaxed">
                O borne de Neutro X0 deve ser interligado diretamente ao BEP através de cabo de cobre isolado exclusivo. A partir do BEP, o condutor Neutro (N) e o condutor de Proteção (PE) seguem rigorosamente separados, sendo <strong>estritamente proibido qualquer jumper de interligação nos quadros a jusante (NBR 17019)</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 6: LISTA DE MATERIAIS COMPLETA (BOM)
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'bom' && (
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A192F] text-slate-300 text-[10px] uppercase font-mono">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descrição do Material de Campo</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-center">Unidade</th>
                  <th className="p-3">Função Eletrotécnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-3 font-mono text-amber-400 font-bold">TR-SECO-75</td>
                  <td className="p-3 font-semibold text-white">Transformador Isolador a Seco {nominalKVA} kVA Dyn1 (220V/380V) Fator K-4</td>
                  <td className="p-3 text-center font-bold text-emerald-400">1</td>
                  <td className="p-3 text-center">un</td>
                  <td className="p-3 text-slate-400">Elevação de tensão 220V para 380V trifásico</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-amber-400 font-bold">DJ-CURVA-D</td>
                  <td className="p-3 font-semibold text-white">Disjuntor Caixa Moldada Tripolar Curva D {primaryBreakerA}A (Icu ≥ 25 kA)</td>
                  <td className="p-3 text-center font-bold text-emerald-400">1</td>
                  <td className="p-3 text-center">un</td>
                  <td className="p-3 text-slate-400">Proteção primária contra corrente de inrush</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-amber-400 font-bold">DJ-CURVA-C</td>
                  <td className="p-3 font-semibold text-white">Disjuntor Caixa Moldada Tripolar Curva C {secondaryBreakerA}A (Icu ≥ 18 kA)</td>
                  <td className="p-3 text-center font-bold text-emerald-400">1</td>
                  <td className="p-3 text-center">un</td>
                  <td className="p-3 text-slate-400">Disjuntor geral secundário 380V</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-amber-400 font-bold">BEP-BARRA</td>
                  <td className="p-3 font-semibold text-white">Barramento de Cobre Eletrolítico 50x5 mm com Isoladores M10</td>
                  <td className="p-3 text-center font-bold text-emerald-400">1</td>
                  <td className="p-3 text-center">barra</td>
                  <td className="p-3 text-slate-400">Barramento BEP central de aterramento TN-S</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-amber-400 font-bold">COXIN-NEO</td>
                  <td className="p-3 font-semibold text-white">Amortecedores Vibra-Stop de Neoprene para Sapatas</td>
                  <td className="p-3 text-center font-bold text-emerald-400">4</td>
                  <td className="p-3 text-center">un</td>
                  <td className="p-3 text-slate-400">Isolamento acústico mecânico contra vibração</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-amber-400 font-bold">IDR-TIPO-B</td>
                  <td className="p-3 font-semibold text-white">Dispositivo DR Tetrapolar Tipo B 40A 30mA com Sensor RDC-DD 6mA DC</td>
                  <td className="p-3 text-center font-bold text-emerald-400">2</td>
                  <td className="p-3 text-center">un</td>
                  <td className="p-3 text-slate-400">Proteção contra choque e fuga DC veicular NBR 17019</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
