"use client";

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RefreshCw, Sun, Moon, Printer, Zap, LayoutGrid, GitBranch, Shield, ArrowDown } from 'lucide-react';

export interface PanelCircuitItem {
  id: string;
  name: string;
  breakerAmps: number;
  curve?: string;
  phases: 1 | 2 | 3;
  voltageV: number;
  powerKW: number;
  cableGaugeMM2: number;
  isTrafoProtection?: boolean;
}

export interface PanelUnifilarDiagramProps {
  panelType: '220V' | '380V';
  utilityName?: string;
  entranceCategory?: string;
  entranceBreakerAmps?: number;
  entranceCableConduitDesc?: string;
  panelMainBreakerAmps: number;
  panelVoltageV: number;
  busbarRatingA: number;
  hasTransformer?: boolean;
  circuits: PanelCircuitItem[];
}

export const PanelUnifilarDiagram: React.FC<PanelUnifilarDiagramProps> = ({
  panelType,
  utilityName = 'CEMIG',
  entranceCategory = 'C3',
  entranceBreakerAmps = 70,
  entranceCableConduitDesc = 'Cabo 3x 35mm² + 35mm² N + 16mm² PE • Eletroduto 2"',
  panelMainBreakerAmps,
  panelVoltageV,
  busbarRatingA,
  hasTransformer = false,
  circuits
}) => {
  // Modo de visualização:
  // - 'ESQUEMATICO_VERTICAL': Esquemático com simbologia NBR 5444 (conforme rascunho de engenharia)
  // - 'UNIFILAR_ORIGINAL': O diagrama unifilar interativo modular implementado primeiramente
  const [viewMode, setViewMode] = useState<'ESQUEMATICO_VERTICAL' | 'UNIFILAR_ORIGINAL'>('ESQUEMATICO_VERTICAL');
  const [theme, setTheme] = useState<'CAD_WHITE' | 'STUDIO_DARK'>('CAD_WHITE');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const isWhite = theme === 'CAD_WHITE';
  const cLine = isWhite ? '#0F172A' : '#F8FAFC';
  const cText = isWhite ? '#0F172A' : '#F1F5F9';
  const cTextMuted = isWhite ? '#475569' : '#94A3B8';
  const cBus = isWhite ? '#0F172A' : (panelType === '220V' ? '#E45318' : '#00B356');
  const cBg = isWhite ? '#FFFFFF' : '#0B132B';

  // Cores normatizadas NBR 5444: Fase = Preto, Neutro = Azul, Terra = Verde
  const cCondFase = isWhite ? '#000000' : '#F8FAFC';
  const cCondNeutro = '#0284C7';
  const cCondTerra = '#00B356';

  // Cálculos geométricos do SVG do Esquemático Vertical
  const is220V = panelType === '220V';
  const colSpacing = 160; // Espaçamento confortável entre ramais
  const numCircuits = Math.max(1, circuits.length);

  // Amperagem do barramento com fallback seguro
  const effectiveBusbarA = busbarRatingA && busbarRatingA > 0 ? busbarRatingA : (panelMainBreakerAmps || 200);

  // Quebra de texto inteligente para nomes de circuitos em linhas de no máximo maxChars
  const wrapCircuitName = (name: string, maxChars = 18): string[] => {
    if (!name) return ['CIRCUITO'];
    const words = name.trim().split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= maxChars) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 4); // Limita a 4 linhas no máximo
  };

  // Layout geométrico perfeitamente centralizado em relação ao barramento
  // Margem lateral esquerda suficiente para o BEP/DPS e rótulos
  const leftMargin = 160;
  const circuitsStartX = leftMargin;
  const lastCircuitX = circuitsStartX + (numCircuits - 1) * colSpacing;
  
  // O barramento se estende cobrindo todos os circuitos derivados com folgas harmônicas
  const busStartX = circuitsStartX - 70;
  const busEndX = lastCircuitX + 90;
  
  // O tronco de entrada (xCenter) é centralizado no meio do barramento horizontal
  const xCenter = Math.round(busStartX + (busEndX - busStartX) / 2);
  
  const totalSvgWidth = Math.max(1100, busEndX + 220); // Margem direita segura para textos inclinados sem cortes
  const totalSvgHeight = 820; // 820px garante respiro total na base para nomes com quebra de linha

  // Coordenadas verticais do tronco
  const yTop = 35;
  const yPadraoTop = 60;
  const yMedidor = 90;
  const yDisjPadrao = 148;
  const yPadraoBottom = 190;
  const yCaboDesc = 228;
  const yDisjGeral = 278;
  const yDpsNode = 320;
  const yBusbar = 358;
  const yBranchStart = yBusbar;
  const yBranchBreaker = 418;
  const yBranchConductors = 472;
  const yBranchArrow = 514;
  const yBranchText = 536;

  /**
   * Renderiza o símbolo do disjuntor em arco (NBR 5444):
   * Quantidade de traços cortando o arco é rigorosamente igual ao número de fases:
   * - 1 Fase (Monofásico): 1 traço no centro do arco
   * - 2 Fases (Bifásico): 2 traços paralelos
   * - 3 Fases (Trifásico): 3 traços paralelos
   */
  const renderBreakerArc = (x: number, y: number, poles: 1 | 2 | 3) => {
    let ticks = '';
    const arcH = 22;
    const midY = y + 11;

    if (poles === 1) {
      ticks = `<line x1="${x + 6}" y1="${midY}" x2="${x + 15}" y2="${midY}" stroke="${cLine}" stroke-width="1.8" stroke-linecap="round" />`;
    } else if (poles === 2) {
      ticks = `
        <line x1="${x + 6}" y1="${midY - 3}" x2="${x + 14}" y2="${midY - 3}" stroke="${cLine}" stroke-width="1.8" stroke-linecap="round" />
        <line x1="${x + 6}" y1="${midY + 3}" x2="${x + 14}" y2="${midY + 3}" stroke="${cLine}" stroke-width="1.8" stroke-linecap="round" />
      `;
    } else {
      // 3 fases = 3 traços cortando o arco
      ticks = `
        <line x1="${x + 5}" y1="${midY - 4.5}" x2="${x + 13}" y2="${midY - 4.5}" stroke="${cLine}" stroke-width="1.8" stroke-linecap="round" />
        <line x1="${x + 6}" y1="${midY}" x2="${x + 15}" y2="${midY}" stroke="${cLine}" stroke-width="1.8" stroke-linecap="round" />
        <line x1="${x + 5}" y1="${midY + 4.5}" x2="${x + 13}" y2="${midY + 4.5}" stroke="${cLine}" stroke-width="1.8" stroke-linecap="round" />
      `;
    }

    return (
      <g>
        <circle cx={x} cy={y} r="2.5" fill={cLine} />
        <circle cx={x} cy={y + arcH} r="2.5" fill={cLine} />
        <path d={`M ${x} ${y} A 11 11 0 0 1 ${x} ${y + arcH}`} fill="none" stroke={cLine} strokeWidth="1.8" />
        <g dangerouslySetInnerHTML={{ __html: ticks }} />
      </g>
    );
  };

  /**
   * Renderização dos condutores (NBR 5444) em linha vertical:
   * Símbolos horizontais cortando/saindo da linha vertical, empilhados ao longo do eixo Y.
   * - Fase: traço horizontal cortando o condutor (Preto)
   * - Neutro: traço horizontal com perna dobrada na ponta (Azul)
   * - Terra: traço horizontal com barra perpendicular na ponta (Verde)
   * - Afastamento aumentado entre neutro e terra para não sobrepor.
   */
  const renderConductorsHorizontal = (x: number, yCenter: number, phases: 1 | 2 | 3, hasNeutral = true, hasPE = true) => {
    let elements = '';
    const gapPhase = 8;
    const gapNeutral = 10;
    const gapPE = 15; // Afastado para zero sobreposição entre neutro e terra

    const totalSpan = (phases - 1) * gapPhase + (hasNeutral ? gapNeutral : 0) + (hasPE ? gapPE : 0);
    let curY = yCenter - (totalSpan / 2);

    // 1. FASES (traços horizontais cortando a linha vertical) - COR PRETA
    for (let i = 0; i < phases; i++) {
      elements += `<line x1="${x - 10}" y1="${curY}" x2="${x + 10}" y2="${curY}" stroke="${cCondFase}" stroke-width="2" stroke-linecap="round" />`;
      curY += gapPhase;
    }

    // 2. NEUTRO (traço horizontal com gancho a 90° na ponta) - COR AZUL
    if (hasNeutral) {
      curY += (gapNeutral - gapPhase);
      elements += `
        <line x1="${x}" y1="${curY}" x2="${x + 11}" y2="${curY}" stroke="${cCondNeutro}" stroke-width="2" stroke-linecap="round" />
        <line x1="${x + 11}" y1="${curY}" x2="${x + 11}" y2="${curY - 6}" stroke="${cCondNeutro}" stroke-width="2" stroke-linecap="round" />
      `;
    }

    // 3. TERRA (traço horizontal com travessão vertical na ponta em T) - COR VERDE
    if (hasPE) {
      curY += gapPE;
      elements += `
        <line x1="${x}" y1="${curY}" x2="${x + 12}" y2="${curY}" stroke="${cCondTerra}" stroke-width="2" stroke-linecap="round" />
        <line x1="${x + 12}" y1="${curY - 6}" x2="${x + 12}" y2="${curY + 6}" stroke="${cCondTerra}" stroke-width="2" stroke-linecap="round" />
      `;
    }

    return elements;
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      const containerId = viewMode === 'ESQUEMATICO_VERTICAL' ? `panel-svg-${panelType}` : `panel-original-${panelType}`;
      const content = document.getElementById(containerId)?.outerHTML || '';

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Diagrama Unifilar - ${panelType === '220V' ? 'QGBT 220V' : 'QDC-VE 380V'}</title>
            <style>
              @page { size: A4 landscape; margin: 8mm; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; font-family: Montserrat, sans-serif; }
              svg { width: 100%; height: auto; max-height: 96vh; }
            </style>
          </head>
          <body>
            ${content}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 shadow-xl flex flex-col gap-3 font-sans ${isWhite ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950/95 border-slate-800 text-slate-100'}`}>
      
      {/* ─── BARRA DE FERRAMENTAS DO UNIFILAR COM AS DUAS OPÇÕES ───────────── */}
      <div className="flex flex-wrap items-center justify-between border-b pb-3 gap-3 border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className={`p-2 rounded-xl ${is220V ? 'bg-[#E45318]/20 text-[#E45318]' : 'bg-[#00B356]/20 text-[#00B356]'}`}>
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-bold text-xs">
              Diagrama Unifilar • {is220V ? 'Quadro de Distribuição 220V (QGBT)' : 'Quadro de Distribuição 380V (QDC-VE)'}
            </h4>
            <p className="text-[10px] text-slate-400">
              Simbologia Canônica ABNT NBR 5444 / NBR 5410 • Reativo à seleção de cargas
            </p>
          </div>
        </div>

        {/* SELETOR DAS DUAS OPÇÕES DE VISUALIZAÇÃO */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('ESQUEMATICO_VERTICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'ESQUEMATICO_VERTICAL'
                ? 'bg-[#E45318] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Diagrama Esquemático com simbologia NBR 5444 (conforme rascunho de engenharia)"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Esquemático Vertical</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('UNIFILAR_ORIGINAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'UNIFILAR_ORIGINAL'
                ? 'bg-[#00B356] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Diagrama Unifilar Interativo em blocos modulares (implementado primeiramente)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Diagrama Original Modular</span>
          </button>
        </div>

        {/* CONTROLES DE ZOOM, TEMA E IMPRESSÃO */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTheme(t => t === 'CAD_WHITE' ? 'STUDIO_DARK' : 'CAD_WHITE')}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1 cursor-pointer"
            title="Alternar entre Esquema Técnico Papel (Fundo Branco) e Modo Studio Dark"
          >
            {isWhite ? <Moon className="w-3.5 h-3.5 text-slate-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isWhite ? 'Modo Dark' : 'Modo Papel CAD'}</span>
          </button>

          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
            title="Reduzir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1.0)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
            title="Resetar Zoom"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#00B356] hover:bg-emerald-600 text-white flex items-center gap-1 cursor-pointer shadow"
            title="Imprimir ou Salvar PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* ─── CORPO: RENDERIZAÇÃO DA OPÇÃO SELECIONADA ───────────────────────── */}
      {viewMode === 'ESQUEMATICO_VERTICAL' ? (
        /* ─── OPÇÃO 1: ESQUEMÁTICO VERTICAL (MODELO DO RASCUNHO TÉCNICO) ───── */
        <div className="w-full overflow-x-auto py-3 px-2 rounded-xl" style={{ backgroundColor: cBg }}>
          <div className="min-w-fit mx-auto" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', transition: 'transform 0.15s ease' }}>
            <svg
              id={`panel-svg-${panelType}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
              width={totalSvgWidth}
              height={totalSvgHeight}
              style={{ backgroundColor: cBg, fontFamily: 'Montserrat, Arial, sans-serif', overflow: 'visible', display: 'block' }}
            >
              {/* 1. TOPO: ALIMENTAÇÃO EXTERNA */}
              <line x1={xCenter} y1={yTop - 15} x2={xCenter} y2={yPadraoTop} stroke={cLine} strokeWidth="2" />
              <polygon points={`${xCenter - 5},${yTop} ${xCenter + 5},${yTop} ${xCenter},${yTop + 10}`} fill={cLine} />
              <text x={xCenter + 14} y={yTop} fontSize="11" fontWeight="bold" fill={cText}>
                {is220V 
                  ? `VEM DA CONCESSIONÁRIA (${utilityName.toUpperCase()})` 
                  : 'VEM DO SECUNDÁRIO DO TRANSFORMADOR DYN1 (380V)'}
              </text>

              {/* 2. PADRÃO DE ENTRADA (RETÂNGULO TRACEJADO COM MEDIDOR E DISJUNTOR) */}
              {is220V ? (
                <g id="bloco-padrao-entrada">
                  {/* Caixa Pontilhada do Padrão */}
                  <rect
                    x={xCenter - 75}
                    y={yPadraoTop}
                    width="150"
                    height={yPadraoBottom - yPadraoTop}
                    fill="none"
                    stroke={cLine}
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                    rx="6"
                  />
                  {/* Título do Padrão posicionado à direita externa (SEM SOBREPOSIÇÃO) */}
                  <text x={xCenter + 88} y={yPadraoTop + 24} fontSize="11" fontWeight="bold" fill={cText}>
                    PADRÃO DE ENTRADA
                  </text>
                  <text x={xCenter + 88} y={yPadraoTop + 38} fontSize="9" fill={cTextMuted}>
                    Categoria {entranceCategory} ({utilityName})
                  </text>

                  {/* Medidor kWh */}
                  <line x1={xCenter} y1={yPadraoTop} x2={xCenter} y2={yMedidor} stroke={cLine} strokeWidth="2" />
                  <rect x={xCenter - 24} y={yMedidor} width="48" height="26" fill={cBg} stroke={cLine} strokeWidth="1.8" rx="2" />
                  <text x={xCenter} y={yMedidor + 17} textAnchor="middle" fontSize="10.5" fontWeight="bold" fill={cText}>
                    KWH
                  </text>
                  {/* Rótulo 'MEDIDOR' colocado à esquerda da caixa (SEM SOBREPOSIÇÃO) */}
                  <text x={xCenter - 32} y={yMedidor + 17} textAnchor="end" fontSize="9" fontWeight="bold" fill={cTextMuted}>
                    MEDIDOR
                  </text>

                  {/* Disjuntor do Padrão Dimensionado: 3 Fases = 3 traços no arco */}
                  <line x1={xCenter} y1={yMedidor + 26} x2={xCenter} y2={yDisjPadrao} stroke={cLine} strokeWidth="2" />
                  {renderBreakerArc(xCenter, yDisjPadrao, 3)}
                  
                  <text x={xCenter + 26} y={yDisjPadrao + 10} fontSize="10" fontWeight="bold" fill={cText}>
                    DISJUNTOR PADRÃO
                  </text>
                  <text x={xCenter + 26} y={yDisjPadrao + 22} fontSize="9" fontWeight="bold" fill="#00B356">
                    {entranceBreakerAmps}A (Curva C Tripolar)
                  </text>

                  <line x1={xCenter} y1={yDisjPadrao + 24} x2={xCenter} y2={yPadraoBottom} stroke={cLine} strokeWidth="2" />
                </g>
              ) : (
                <g id="bloco-entrada-380v">
                  {/* No 380V, vem do Secundário Trafo Dyn1 */}
                  <line x1={xCenter} y1={yTop + 10} x2={xCenter} y2={yPadraoBottom} stroke={cLine} strokeWidth="2" />
                  <text x={xCenter + 14} y={yPadraoTop + 30} fontSize="10.5" fontWeight="bold" fill="#00B356">
                    Trafo Dyn1 220V/380V Elevador
                  </text>
                  <text x={xCenter + 14} y={yPadraoTop + 45} fontSize="9" fill={cTextMuted}>
                    Secundário Trifásico Estrela Aterrado (3F+N+PE)
                  </text>
                </g>
              )}

              {/* 3. TRECHO INTERMEDIÁRIO: CABO E ELETRODUTO DIMENSIONADO */}
              <line x1={xCenter} y1={yPadraoBottom} x2={xCenter} y2={yDisjGeral} stroke={cLine} strokeWidth="2" />
              
              {/* Símbolos Horizontais de Condutores (Fase Preto, Neutro Azul, Terra Verde com Afastamento) */}
              <g dangerouslySetInnerHTML={{ __html: renderConductorsHorizontal(xCenter, yCaboDesc, 3, true, true) }} />
              
              <text x={xCenter + 26} y={yCaboDesc - 4} fontSize="10" fontWeight="bold" fill={cText}>
                CABO E ELETRODUTO DIMENSIONADO
              </text>
              <text x={xCenter + 26} y={yCaboDesc + 12} fontSize="9" fill={cTextMuted}>
                {entranceCableConduitDesc}
              </text>

              {/* 4. DISJUNTOR GERAL DO PAINEL: 3 Fases = 3 traços no arco */}
              {renderBreakerArc(xCenter, yDisjGeral, 3)}
              
              <text x={xCenter + 26} y={yDisjGeral + 10} fontSize="10.5" fontWeight="bold" fill={cText}>
                DISJUNTOR GERAL DO PAINEL {panelVoltageV}V
              </text>
              <text x={xCenter + 26} y={yDisjGeral + 23} fontSize="9.5" fontWeight="bold" fill="#E45318">
                {panelMainBreakerAmps}A Caixa Moldada (3P)
              </text>

              {/* 5. DERIVAÇÃO LATERAL PARA O DPS E TERRA */}
              <line x1={xCenter} y1={yDisjGeral + 24} x2={xCenter} y2={yBusbar} stroke={cLine} strokeWidth="2" />
              <circle cx={xCenter} cy={yDpsNode} r="3" fill={cLine} />
              {/* Linha lateral até o DPS */}
              <line x1={xCenter} y1={yDpsNode} x2={xCenter - 80} y2={yDpsNode} stroke={cLine} strokeWidth="1.8" />
              {/* Caixa DPS */}
              <rect x={xCenter - 115} y={yDpsNode - 10} width="35" height="20" fill={cBg} stroke={cLine} strokeWidth="1.8" rx="2" />
              <text x={xCenter - 97} y={yDpsNode + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill={cText}>
                DPS
              </text>
              {/* Aterramento PE à esquerda */}
              <line x1={xCenter - 115} y1={yDpsNode} x2={xCenter - 135} y2={yDpsNode} stroke={cLine} strokeWidth="1.8" />
              <line x1={xCenter - 135} y1={yDpsNode - 8} x2={xCenter - 135} y2={yDpsNode + 8} stroke={cLine} strokeWidth="2" />
              <line x1={xCenter - 139} y1={yDpsNode - 5} x2={xCenter - 139} y2={yDpsNode + 5} stroke={cLine} strokeWidth="1.5" />
              <line x1={xCenter - 143} y1={yDpsNode - 2} x2={xCenter - 143} y2={yDpsNode + 2} stroke={cLine} strokeWidth="1.2" />
              <text x={xCenter - 105} y={yDpsNode - 14} fontSize="8" fill={cTextMuted}>
                Classe II (45kA)
              </text>

              {/* 6. BARRAMENTO PRINCIPAL HORIZONTAL (com tronco centralizado no barramento) */}
              <circle cx={xCenter} cy={yBusbar} r="4" fill={cBus} />
              <line x1={busStartX} y1={yBusbar} x2={busEndX} y2={yBusbar} stroke={cBus} strokeWidth="4.5" strokeLinecap="round" />
              <text x={busStartX} y={yBusbar - 10} textAnchor="start" fontSize="10.5" fontWeight="bold" fill={cText}>
                BARRAMENTO PRINCIPAL ({effectiveBusbarA}A Cu)
              </text>

              {/* 7. DERIVAÇÕES VERTICAIS DOS CIRCUITOS (DESCENDO DA BARRA) */}
              {circuits.map((circ, idx) => {
                const xCol = circuitsStartX + (idx * colSpacing);
                const isTrafo = circ.isTrafoProtection;
                const nameLines = wrapCircuitName(circ.name.toUpperCase(), 18);

                return (
                  <g key={`branch-${circ.id}-${idx}`} id={`circuito-${circ.id}`}>
                    {/* Ponto de derivação na barra */}
                    <circle cx={xCol} cy={yBranchStart} r="3.5" fill={cBus} />
                    
                    {/* Linha vertical até o disjuntor */}
                    <line x1={xCol} y1={yBranchStart} x2={xCol} y2={yBranchBreaker} stroke={cLine} strokeWidth="1.8" />

                    {/* Disjuntor em Arco com traços exatos conforme fases (1F = 1 traço, 2F = 2 traços, 3F = 3 traços) */}
                    {renderBreakerArc(xCol, yBranchBreaker, circ.phases)}
                    
                    {/* Amperagem do Disjuntor padronizado de mercado */}
                    <text x={xCol + 16} y={yBranchBreaker + 12} fontSize="10" fontWeight="bold" fill={isTrafo ? '#E45318' : '#00B356'}>
                      {circ.breakerAmps}A
                    </text>
                    <text x={xCol + 16} y={yBranchBreaker + 24} fontSize="8.5" fill={cTextMuted}>
                      {circ.phases === 3 ? '3P' : circ.phases === 2 ? '2P' : '1P'} ({circ.curve || 'C'})
                    </text>

                    {/* Linha vertical abaixo do disjuntor */}
                    <line x1={xCol} y1={yBranchBreaker + 22} x2={xCol} y2={yBranchArrow} stroke={cLine} strokeWidth="1.8" />

                    {/* Símbolos Horizontais de Condutores (Fase Preto, Neutro Azul, Terra Verde, afastados) */}
                    <g dangerouslySetInnerHTML={{ __html: renderConductorsHorizontal(xCol, yBranchConductors, circ.phases, circ.phases !== 2, true) }} />

                    {/* Seta terminal apontando para baixo */}
                    <polygon points={`${xCol - 4},${yBranchArrow} ${xCol + 4},${yBranchArrow} ${xCol},${yBranchArrow + 8}`} fill={cLine} />

                    {/* Rótulo e Nome do Circuito inclinado a 55º com QUEBRA DE LINHAS (não cruza circuitos vizinhos) */}
                    <g transform={`translate(${xCol - 4}, ${yBranchText}) rotate(55)`}>
                      <text x="0" y="0" fontSize="10" fontWeight="bold" fill={isTrafo ? '#E45318' : cText}>
                        {nameLines.map((line, lIdx) => (
                          <tspan key={lIdx} x="0" dy={lIdx === 0 ? 0 : 13}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                      <text x="0" y={nameLines.length * 13 + 3} fontSize="8.5" fill={cTextMuted}>
                        {circ.cableGaugeMM2}mm² • {circ.powerKW.toFixed(1)}kW ({circ.voltageV}V)
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      ) : (
        /* ─── OPÇÃO 2: DIAGRAMA UNIFILAR ORIGINAL INTERATIVO MODULAR ───────── */
        <div id={`panel-original-${panelType}`} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#E45318] block">Diagrama Unifilar Interativo (NBR 5410 / NBR 17019)</span>
              <span className="text-white text-xs font-bold">
                {panelType === '220V' ? 'Quadro de Distribuição 220V (QGBT-VE)' : 'Quadro de Distribuição 380V (QDC-VE)'}
              </span>
            </div>
            <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold">
              Tensão Barramento: {panelVoltageV}V ({panelVoltageV === 380 ? '3F+N+PE' : '3F+N+PE'})
            </span>
          </div>

          {/* Visualização Esquemática Unifilar em Blocos Vetoriais */}
          <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800 space-y-4">
            
            {/* 1. Entrada: Disjuntor Geral Caixa Moldada */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-400 uppercase font-bold mb-1">
                {is220V ? 'Entrada da Concessionária (Trecho 1)' : 'Alimentação Secundário Trafo Dyn1 (Trecho 3)'}
              </span>
              <div className="w-1 bg-[#E45318] h-4" />
              <div className="bg-slate-800 border-2 border-[#E45318] rounded-lg px-5 py-2.5 text-center shadow-md">
                <span className="text-[10px] text-slate-400 block font-sans">
                  Disjuntor Geral {is220V ? 'QGBT 220V' : 'QDC-VE 380V'}
                </span>
                <span className="text-white text-sm font-bold block">{panelMainBreakerAmps}A Caixa Moldada</span>
                <span className="text-[9px] text-amber-400">Curva C • Tripolar 3P • Icu ≥ 25kA</span>
              </div>
              <div className="w-1 bg-amber-500 h-4" />
            </div>

            {/* 2. DPS Classe II e Proteção de Surto */}
            <div className="flex items-center justify-center gap-3">
              <div className="bg-slate-950 border border-emerald-500/60 rounded-lg px-3 py-1.5 text-center shadow-xs">
                <span className="text-[9px] text-emerald-400 font-bold block">
                  {is220V ? '3x DPS Classe II (275V / 45kA)' : '4x DPS Classe II (385V / 45kA)'}
                </span>
                <span className="text-[8px] text-slate-400">Proteção contra sobretensões transitórias</span>
              </div>
              <div className="bg-slate-950 border border-cyan-500/60 rounded-lg px-3 py-1.5 text-center shadow-xs">
                <span className="text-[9px] text-cyan-400 font-bold block">Medidor Modbus RTU RS-485</span>
                <span className="text-[8px] text-slate-400">Telemetria e DLM Balanceamento</span>
              </div>
            </div>

            {/* 3. Barramento Principal em Cobre (Degraus R, S, T) */}
            <div className="space-y-1.5 my-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-sans">
                <span className="font-semibold text-slate-300">Barramento de Distribuição de Cobre Eletrolítico</span>
                <span className="text-amber-400 font-bold">{busbarRatingA}A Cu (99.9% Cobre)</span>
              </div>
              <div className="h-2.5 bg-gradient-to-r from-red-600 via-amber-500 to-blue-600 rounded w-full shadow-inner" title="Fases R, S, T" />
            </div>

            {/* 4. Grid dos Circuitos Derivados Conectados ao Barramento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {circuits.map((circ, idx) => {
                const isTrafo = circ.isTrafoProtection;

                return (
                  <div
                    key={`card-orig-${circ.id}-${idx}`}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isTrafo
                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isTrafo ? 'bg-[#E45318]' : 'bg-[#00B356]'}`} />
                        {circ.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isTrafo ? 'bg-[#E45318] text-white' : 'bg-slate-800 text-emerald-400'
                      }`}>
                        {circ.breakerAmps}A Curva {circ.curve || 'C'} ({circ.phases === 3 ? '3P' : circ.phases === 2 ? '2P' : '1P'})
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 font-sans">
                      <div className="flex justify-between">
                        <span>Potência Demandada:</span>
                        <strong className="text-white">{circ.powerKW.toFixed(1)} kW ({circ.voltageV}V)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Condutor Alimentador:</span>
                        <strong className="text-[#00B356]">{circ.cableGaugeMM2} mm² Cu</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Proteção DR NBR 5410:</span>
                        <span className="text-emerald-300 font-bold">{circ.phases === 3 ? 'Tetrapolar 30mA Tipo B' : 'Bipolar 30mA'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Coordenação Seletiva de Proteção NBR 5410 */}
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Coordenação Seletiva de Proteção (NBR 5410 / NBR 17019):
            </div>
            <div className="text-slate-300 text-[10px]">
              • Disjuntor Geral ({panelMainBreakerAmps}A Curva C) coordenado seletivamente com os disjuntores dos ramais e com a entrada da concessionária.
            </div>
            {is220V && hasTransformer && (
              <div className="text-amber-400 text-[10px]">
                • Disjuntor do Transformador Dyn1 em Curva D suporta a corrente de inrush de magnetização sem desarme acidental.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── LEGENDA TÉCNICA E RESUMO ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80 text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-black dark:bg-white" />
            <b className="text-slate-300">Fase (Preto)</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#0284C7]" />
            <b className="text-[#0284C7]">Neutro (Azul)</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#00B356]" />
            <b className="text-[#00B356]">Terra (Verde)</b>
          </span>
          {is220V && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E45318]" />
              Proteção do Trafo Dyn1 (Curva D)
            </span>
          )}
        </div>
        <span className="font-mono text-slate-400">
          Modo ativo: <b>{viewMode === 'ESQUEMATICO_VERTICAL' ? 'Esquemático Vertical' : 'Diagrama Original Modular'}</b> • {circuits.length} circuito(s)
        </span>
      </div>
    </div>
  );
};
