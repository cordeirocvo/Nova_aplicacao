"use client";

import React, { useState, useMemo } from 'react';
import { renderAuthenticNBR5444SVG, UnifilarCircuitItem } from '@/lib/coenergygo/cad/unifilarGraphEngine';
import { 
  Zap, Sliders, Shield, AlertTriangle, CheckCircle2, 
  RefreshCw, ZoomIn, ZoomOut, Moon, Sun, Printer, FileText, Download 
} from 'lucide-react';

export interface InteractiveUnifilarViewerProps {
  initialGridLimitKW?: number;
  initialBuildingLoadKW?: number;
  gridVoltageV?: number;
  hasTrafo?: boolean;
  trafoKVA?: number;
  chargers?: Array<{
    id: string;
    name: string;
    powerKW: number;
    phases: 1 | 2 | 3;
    voltageV: number;
    currentInA: number;
    connector?: string;
  }>;
}

export const InteractiveUnifilarViewer: React.FC<InteractiveUnifilarViewerProps> = ({
  initialGridLimitKW = 70,
  initialBuildingLoadKW = 15,
  gridVoltageV = 220,
  hasTrafo = false,
  trafoKVA = 45,
  chargers = [
    { id: 'ev-1', name: 'Wallbox Residencial AC', powerKW: 7.4, phases: 1, voltageV: 220, currentInA: 32 },
    { id: 'ev-2', name: 'Wallbox Garagem Coletiva', powerKW: 7.4, phases: 1, voltageV: 220, currentInA: 32 }
  ]
}) => {
  const [gridLimitKW, setGridLimitKW] = useState<number>(initialGridLimitKW);
  const [buildingLoadKW, setBuildingLoadKW] = useState<number>(initialBuildingLoadKW);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [theme, setTheme] = useState<'CAD_WHITE' | 'STUDIO_DARK'>('CAD_WHITE');

  const availablePowerKW = Math.max(0, gridLimitKW - buildingLoadKW);
  const totalChargersPowerKW = chargers.reduce((sum, c) => sum + c.powerKW, 0);
  const isOverload = buildingLoadKW + totalChargersPowerKW > gridLimitKW;

  // Montagem da lista canônica de circuitos unifilares conforme Fotos 1 e 2
  const circuits: UnifilarCircuitItem[] = useMemo(() => {
    const list: UnifilarCircuitItem[] = [];
    let curNumber = 1;

    // 1. Cargas Tradicionais Prediais (Foto 1: Iluminação, TUGs, Chuveiro, etc.)
    list.push({
      id: 'circ-ilum',
      circuitNumber: curNumber++,
      name: 'Iluminação & Serviços Gerais',
      breakerAmps: 10,
      phases: 1,
      voltageV: 127,
      powerKW: 1.5,
      cableGaugeMM2: 1.5,
      status: 'safe'
    });

    list.push({
      id: 'circ-tugs',
      circuitNumber: curNumber++,
      name: "Tomadas de Uso Geral (TUG's)",
      breakerAmps: 20,
      phases: 1,
      voltageV: 127,
      powerKW: 2.5,
      cableGaugeMM2: 2.5,
      status: 'safe'
    });

    // Carga de maior potência predial se informada
    if (buildingLoadKW > 4) {
      list.push({
        id: 'circ-predio-geral',
        circuitNumber: curNumber++,
        name: 'Alimentador Principal Existente do Imóvel',
        breakerAmps: Math.min(63, Math.max(25, Math.round((buildingLoadKW * 1000) / (gridVoltageV * 0.95)))),
        phases: gridVoltageV === 380 ? 3 : 1,
        voltageV: gridVoltageV,
        powerKW: Math.max(0, buildingLoadKW - 4),
        cableGaugeMM2: 6.0,
        status: 'safe'
      });
    }

    // 2. Circuitos Dedicados de Recarga Veicular (EVSE) com balanço dinâmico (DLM)
    const perEvPowerShareKW = chargers.length > 0 ? availablePowerKW / chargers.length : 0;

    chargers.forEach((ch, idx) => {
      const allocatedAmps = ch.phases === 3
        ? (perEvPowerShareKW * 1000) / (Math.sqrt(3) * ch.voltageV * 0.95)
        : (perEvPowerShareKW * 1000) / (ch.voltageV * 0.95);

      const status = isOverload ? 'overload' : allocatedAmps < ch.currentInA ? 'limited' : 'safe';

      list.push({
        id: `circ-ev-${ch.id || idx}`,
        circuitNumber: curNumber++,
        name: `Estação VE: ${ch.name}`,
        breakerAmps: Math.round(ch.currentInA * 1.25), // Proteção IEC 60364-7-722 contínua
        phases: ch.phases,
        voltageV: ch.voltageV,
        powerKW: ch.powerKW,
        cableGaugeMM2: ch.currentInA > 32 ? 10 : 6,
        allocatedAmps: Math.min(ch.currentInA, Number(allocatedAmps.toFixed(1))),
        status
      });
    });

    return list;
  }, [chargers, buildingLoadKW, gridVoltageV, availablePowerKW, isOverload]);

  // Geração do SVG autêntico da NBR 5444
  const generatedSvg = useMemo(() => {
    return renderAuthenticNBR5444SVG({
      utilityName: 'CEMIG Distribuição',
      supplyVoltageV: gridVoltageV,
      supplyPhases: gridVoltageV === 380 ? 3 : 1,
      entranceBreakerAmps: Math.max(70, Math.round((gridLimitKW * 1000) / (gridVoltageV * (gridVoltageV === 380 ? Math.sqrt(3) : 1) * 0.95))),
      panelName: 'Quadro de Distribuição (QGBT-VE)',
      panelMainBreakerAmps: Math.max(70, Math.round((gridLimitKW * 1000) / (gridVoltageV * (gridVoltageV === 380 ? Math.sqrt(3) : 1) * 0.95))),
      circuits,
      theme,
      showTrafoSubstation: hasTrafo,
      trafoKVA
    });
  }, [gridLimitKW, gridVoltageV, circuits, theme, hasTrafo, trafoKVA]);

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Diagrama Unifilar NBR 5444 - Cordeiro Energia</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
              svg { width: 100%; height: auto; max-height: 95vh; }
            </style>
          </head>
          <body>
            ${renderAuthenticNBR5444SVG({
              utilityName: 'CEMIG Distribuição',
              supplyVoltageV: gridVoltageV,
              supplyPhases: gridVoltageV === 380 ? 3 : 1,
              entranceBreakerAmps: 70,
              panelName: 'Quadro de Distribuição (QGBT-VE)',
              panelMainBreakerAmps: 70,
              circuits,
              theme: 'CAD_WHITE',
              showTrafoSubstation: hasTrafo,
              trafoKVA
            })}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  return (
    <div className={`rounded-2xl border transition-colors duration-200 p-5 flex flex-col gap-4 shadow-2xl ${theme === 'CAD_WHITE' ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#0A192F] text-slate-100 border-slate-800'}`}>
      {/* ─── PAINEL DE CONTROLE TÉCNICO & FERRAMENTAS ──────────────────────── */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-5 ${theme === 'CAD_WHITE' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'}`}>
        
        {/* Sliders de Simulação Interativa */}
        <div className="flex-1 w-full flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#E45318]">
              <Sliders className="w-4 h-4" /> Limite Contratado do Padrão:
            </span>
            <span className={`font-mono text-sm px-2 py-0.5 rounded border ${theme === 'CAD_WHITE' ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-800 text-white border-slate-700'}`}>
              {gridLimitKW} kW
            </span>
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
        </div>

        <div className="flex-1 w-full flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-sky-600">
              <Zap className="w-4 h-4" /> Carga Predial Ativa Concorrente:
            </span>
            <span className={`font-mono text-sm px-2 py-0.5 rounded border ${theme === 'CAD_WHITE' ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-800 text-white border-slate-700'}`}>
              {buildingLoadKW} kW
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="120"
            step="5"
            value={buildingLoadKW}
            onChange={(e) => setBuildingLoadKW(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>

        {/* Alternância de Modo & Exportação */}
        <div className="flex items-center gap-2 border-l pl-4 border-slate-300 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTheme(t => t === 'CAD_WHITE' ? 'STUDIO_DARK' : 'CAD_WHITE')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${theme === 'CAD_WHITE' ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
            title="Alternar entre Esquema Técnico Papel (Fundo Branco) e Modo Studio Dark"
          >
            {theme === 'CAD_WHITE' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span>{theme === 'CAD_WHITE' ? 'Modo Dark' : 'Padrão Técnico CAD'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#00B356] hover:bg-emerald-600 text-white shadow transition-all cursor-pointer flex items-center gap-1.5"
            title="Imprimir ou Salvar em PDF em escala A4"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir A4</span>
          </button>
        </div>
      </div>

      {/* ─── CANVAS VETORIAL DO DIAGRAMA UNIFILAR NBR 5444 ──────────────────── */}
      <div className={`relative w-full overflow-hidden rounded-xl border p-4 flex flex-col items-center justify-center shadow-inner ${theme === 'CAD_WHITE' ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-800'}`}>
        
        {/* Controles de Zoom Flutuantes */}
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg p-1 z-10 shadow">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
            title="Reduzir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-300 px-1.5">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.1))}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
            title="Resetar Zoom"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ViewBox Dinâmico Renderizado */}
        <div className="w-full overflow-x-auto flex justify-center py-2">
          <div 
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
            className="min-w-[880px] max-w-full select-none"
            dangerouslySetInnerHTML={{ __html: generatedSvg }}
          />
        </div>
      </div>

      {/* Rodapé Informativo */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
        <span className="font-semibold text-slate-500">
          ✓ Padronização Gráfica ABNT NBR 5444 / NBR 5410 • Barramento Espinha de Peixe • Símbolos Autênticos de Engenharia
        </span>
        <span className="text-emerald-500 font-mono font-bold">
          {availablePowerKW > 0 ? `Folga Disponível: ${availablePowerKW.toFixed(1)} kW` : 'Atenção: Sobrecarga no Padrão de Entrada'}
        </span>
      </div>
    </div>
  );
};
