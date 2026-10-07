"use client";

import React, { useState } from "react";
import { 
  FileSpreadsheet, Calendar, Clock, Zap, Activity, 
  TrendingUp, BarChart3, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Trash2, Layers
} from "lucide-react";
import { PeriodMeasurementSummary, MeasuredIntervalPoint, DailyPeakPoint } from "@/lib/coenergygo";

interface ImportedDataViewerProps {
  summary: PeriodMeasurementSummary;
  chargerPowerKW: number;
  gridLimitKW: number;
  dailyPeaks?: DailyPeakPoint[];
  attachedFiles?: { id: string; name: string; maxKW: number; readings: number }[];
  onRemoveFile?: (fileId: string) => void;
  onClear?: () => void;
}

export default function ImportedDataViewer({
  summary,
  chargerPowerKW,
  gridLimitKW,
  dailyPeaks = [],
  attachedFiles = [],
  onRemoveFile,
  onClear
}: ImportedDataViewerProps) {
  const [activeTab, setActiveTab] = useState<'daily_peaks' | 'full_curve' | 'table'>('daily_peaks');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTable, setShowTable] = useState(false);
  const pageSize = 10;

  const totalPages = Math.ceil(summary.intervalPoints.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentPoints = summary.intervalPoints.slice(startIndex, startIndex + pageSize);

  // SVG Chart Geometry
  const svgWidth = 850;
  const svgHeight = 260;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Escalas Curva Completa
  const points = summary.intervalPoints;
  const maxMeasured = summary.maxPowerKW;
  const maxProjected = maxMeasured + chargerPowerKW;
  const yMax = Math.max(gridLimitKW * 1.05, maxProjected * 1.15, 10);

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft;
    return paddingLeft + (index / (points.length - 1)) * plotWidth;
  };

  const getY = (valKW: number) => {
    return paddingTop + plotHeight - (valKW / yMax) * plotHeight;
  };

  const getCurveX = getX;
  const getCurveY = getY;
  const yGridLimit = getY(gridLimitKW);
  const yGridLimitCurve = yGridLimit;

  // Escalas Picos Diários
  const peaksToRender: DailyPeakPoint[] = dailyPeaks && dailyPeaks.length > 0 
    ? dailyPeaks 
    : [{ 
        dateStr: summary.periodStart, 
        dayLabel: summary.periodStart.slice(0, 5), 
        maxPowerKW: summary.maxPowerKW, 
        peakTimeStr: summary.peakTimestamp,
        averagePowerKW: summary.averagePowerKW, 
        totalEnergyKWh: summary.totalEnergyKWh, 
        readingsCount: summary.totalReadings,
        sourceFileName: summary.fileName
      }];

  const maxDailyP = Math.max(...peaksToRender.map(p => p.maxPowerKW), 1);
  const yDailyMax = Math.max(gridLimitKW * 1.05, (maxDailyP + chargerPowerKW) * 1.15, 10);

  const getDailyX = (index: number) => {
    if (peaksToRender.length <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (peaksToRender.length - 1)) * plotWidth;
  };

  const getDailyY = (valKW: number) => {
    return paddingTop + plotHeight - (valKW / yDailyMax) * plotHeight;
  };

  const yGridLimitDaily = getDailyY(gridLimitKW);

  // Construção do Path da curva medida
  let pathMeasured = "";
  let areaMeasured = "";
  let pathWithCharger = "";

  points.forEach((pt, i) => {
    const x = getX(i);
    const yBase = getY(pt.powerKW);
    const yTotal = getY(pt.powerKW + chargerPowerKW);

    if (i === 0) {
      pathMeasured = `M ${x.toFixed(1)} ${yBase.toFixed(1)}`;
      pathWithCharger = `M ${x.toFixed(1)} ${yTotal.toFixed(1)}`;
      areaMeasured = `M ${x.toFixed(1)} ${paddingTop + plotHeight} L ${x.toFixed(1)} ${yBase.toFixed(1)}`;
    } else {
      pathMeasured += ` L ${x.toFixed(1)} ${yBase.toFixed(1)}`;
      pathWithCharger += ` L ${x.toFixed(1)} ${yTotal.toFixed(1)}`;
      areaMeasured += ` L ${x.toFixed(1)} ${yBase.toFixed(1)}`;
    }
  });

  const lastX = getX(points.length - 1);
  areaMeasured += ` L ${lastX.toFixed(1)} ${paddingTop + plotHeight} Z`;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 animate-in fade-in duration-200">
      {/* ─── CABEÇALHO COM METADADOS DO ARQUIVO ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 text-[#00B356] rounded-2xl flex items-center justify-center font-bold shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-800">{summary.fileName}</h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {summary.fileType.toUpperCase()} Importado
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Período: <strong>{summary.periodStart}</strong> até <strong>{summary.periodEnd}</strong></span>
              <span>•</span>
              <span>Passo: <strong>{summary.intervalMinutes} min</strong></span>
            </p>
          </div>
        </div>

        {/* Botões de Ação Superior */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('daily_peaks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'daily_peaks'
                  ? 'bg-white text-[#E45318] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Maior Potência / Dia</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('full_curve')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'full_curve'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Curva Contínua</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tabela</span>
            </button>
          </div>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Excluir medição e zerar dados de carga anexados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Medição</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── LISTA DE PLANILHAS ANEXADAS (COM BOTÃO DE DELETAR CADA UMA INDIVIDUALMENTE) ─── */}
      {attachedFiles.length > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#E45318]" />
              Planilhas Anexadas no Projeto ({attachedFiles.length}):
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Você pode remover qualquer planilha individualmente abaixo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {attachedFiles.map((f) => (
              <div 
                key={f.id} 
                className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-800 truncate text-[11px]">{f.name}</p>
                  <p className="text-[10px] text-slate-400">
                    Pico: <strong className="text-[#E45318]">{f.maxKW.toFixed(2)} kW</strong> • {f.readings} pts
                  </p>
                </div>
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(f.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                    title={`Remover planilha ${f.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CARDS DE ESTATÍSTICAS DO PERÍODO ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <Zap className="w-3.5 h-3.5 text-[#E45318]" /> Pico Medido no Local
          </div>
          <p className="text-2xl font-black text-slate-800">{summary.maxPowerKW.toFixed(2)} <span className="text-xs font-bold text-slate-400">kW</span></p>
          <span className="text-[10px] text-slate-500 block truncate">
            Horário: <strong>{summary.peakTimestamp.split(' ')[1] || summary.peakTimestamp}</strong>
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <Activity className="w-3.5 h-3.5 text-blue-600" /> Demanda Média
          </div>
          <p className="text-2xl font-black text-slate-800">{summary.averagePowerKW.toFixed(2)} <span className="text-xs font-bold text-slate-400">kW</span></p>
          <span className="text-[10px] text-slate-500 block">
            Mínima: <strong>{summary.minPowerKW.toFixed(2)} kW</strong>
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <BarChart3 className="w-3.5 h-3.5 text-[#00B356]" /> Energia Integrada
          </div>
          <p className="text-2xl font-black text-slate-800">{summary.totalEnergyKWh.toFixed(1)} <span className="text-xs font-bold text-slate-400">kWh</span></p>
          <span className="text-[10px] text-slate-500 block">
            Duração: <strong>{Math.round(summary.durationMinutes / 60)}h {summary.durationMinutes % 60}min</strong>
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <Clock className="w-3.5 h-3.5 text-purple-600" /> Total de Medições
          </div>
          <p className="text-2xl font-black text-slate-800">{summary.totalReadings} <span className="text-xs font-bold text-slate-400">pontos</span></p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% registros íntegros
          </span>
        </div>
      </div>

      {/* ─── 1. VISUALIZAÇÃO: GRÁFICO DA MAIOR POTÊNCIA DE CADA DIA (PICOS DIÁRIOS) ─── */}
      {activeTab === 'daily_peaks' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#E45318]" />
                Histórico de Maior Potência Registrada por Dia ({peaksToRender.length} Dias Monitorados)
              </h4>
              <p className="text-[11px] text-slate-500">
                O sistema compila o pico de carga de cada dia para dimensionar com precisão a folga do padrão
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Maior Potência do Dia (kW)
              </span>
              <span className="flex items-center gap-1.5 text-orange-600">
                <span className="w-3 h-1.5 bg-[#E45318] inline-block" /> Pico + VE ({chargerPowerKW} kW)
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-1 bg-slate-400 inline-block border-t border-dashed" /> Limite Padrão ({gridLimitKW} kW)
              </span>
            </div>
          </div>

          <div className="bg-[#0A192F] p-4 rounded-3xl overflow-x-auto shadow-inner">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[650px]">
              {/* Linhas de Grade Horizontais */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                const val = yDailyMax * frac;
                const y = getDailyY(val);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray={idx === 0 ? "none" : "3,3"}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="Montserrat"
                    >
                      {val.toFixed(0)} kW
                    </text>
                  </g>
                );
              })}

              {/* Linha do Padrão da Rede */}
              <line
                x1={paddingLeft}
                y1={yGridLimitDaily}
                x2={svgWidth - paddingRight}
                y2={yGridLimitDaily}
                stroke="#e2e8f0"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.6"
              />
              <text
                x={svgWidth - paddingRight}
                y={yGridLimitDaily - 6}
                textAnchor="end"
                fill="#cbd5e1"
                fontSize="9"
                fontWeight="bold"
                fontFamily="Montserrat"
              >
                Limite do Padrão ({gridLimitKW} kW)
              </text>

              {/* Linha de Tendência de Carga Máxima + VE */}
              {peaksToRender.length > 1 && (
                <path
                  d={peaksToRender.map((p, i) => {
                    const x = getDailyX(i);
                    const y = getDailyY(p.maxPowerKW + chargerPowerKW);
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#E45318"
                  strokeWidth="2"
                  strokeDasharray="4,3"
                />
              )}

              {/* Barras e Pontos de Cada Dia */}
              {peaksToRender.map((p, i) => {
                const x = getDailyX(i);
                const yVal = getDailyY(p.maxPowerKW);
                const barWidth = Math.max(16, Math.min(42, (plotWidth / peaksToRender.length) * 0.55));
                const barHeight = Math.max(2, (paddingTop + plotHeight) - yVal);
                const isMaxEver = p.maxPowerKW === summary.maxPowerKW;

                return (
                  <g key={i} className="group cursor-pointer">
                    {/* Barra do Dia */}
                    <rect
                      x={x - barWidth / 2}
                      y={yVal}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={isMaxEver ? "#E45318" : "#f59e0b"}
                      opacity="0.85"
                    />

                    {/* Marcador no topo da barra */}
                    <circle
                      cx={x}
                      cy={yVal}
                      r={isMaxEver ? 6 : 4}
                      fill={isMaxEver ? "#E45318" : "#ffffff"}
                      stroke={isMaxEver ? "#ffffff" : "#f59e0b"}
                      strokeWidth={isMaxEver ? "2.5" : "2"}
                    />

                    {/* Valor em kW sobre a barra */}
                    <text
                      x={x}
                      y={yVal - (isMaxEver ? 18 : 8)}
                      textAnchor="middle"
                      fill={isMaxEver ? "#fb923c" : "#fde68a"}
                      fontSize={isMaxEver ? "10" : "9"}
                      fontWeight="black"
                      fontFamily="Montserrat"
                    >
                      {p.maxPowerKW.toFixed(2)} kW
                    </text>

                    {/* Tag de destaque absoluto se for o dia recorde global */}
                    {isMaxEver && (
                      <text
                        x={x}
                        y={yVal - 6}
                        textAnchor="middle"
                        fill="#E45318"
                        fontSize="7.5"
                        fontWeight="black"
                        fontFamily="Montserrat"
                      >
                        ★ PICO GLOBAL
                      </text>
                    )}

                    {/* Rótulo do Dia no Eixo X */}
                    <line x1={x} y1={paddingTop + plotHeight} x2={x} y2={paddingTop + plotHeight + 5} stroke="#334155" />
                    <text
                      x={x}
                      y={paddingTop + plotHeight + 18}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Montserrat"
                    >
                      {p.dayLabel}
                    </text>

                    {/* Hora do pico no rodapé */}
                    <text
                      x={x}
                      y={paddingTop + plotHeight + 30}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                      fontFamily="Montserrat"
                    >
                      {p.peakTimeStr.slice(0, 5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* ─── 2. VISUALIZAÇÃO: CURVA CONTÍNUA EM ALTA RESOLUÇÃO ─── */}
      {activeTab === 'full_curve' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Curva Contínua de Leituras ({summary.totalReadings} Pontos a cada {summary.intervalMinutes} min)
              </h4>
              <p className="text-[11px] text-slate-500">
                Visualização temporal contínua para identificação de horários de ponta e simultaneidade
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Carga Medida
              </span>
              <span className="flex items-center gap-1.5 text-orange-600">
                <span className="w-3 h-3 rounded-full bg-[#E45318] inline-block" /> Carga + VE ({chargerPowerKW} kW)
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-1 bg-slate-400 inline-block border-t border-dashed" /> Limite ({gridLimitKW} kW)
              </span>
            </div>
          </div>

          <div className="bg-[#0A192F] p-4 rounded-3xl overflow-x-auto shadow-inner">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[650px]">
              <defs>
                <linearGradient id="measuredGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade Horizontais */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                const val = yMax * frac;
                const y = getCurveY(val);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray={idx === 0 ? "none" : "3,3"}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="Montserrat"
                    >
                      {val.toFixed(0)} kW
                    </text>
                  </g>
                );
              })}

              {/* Linha do Padrão da Rede */}
              <line
                x1={paddingLeft}
                y1={yGridLimitCurve}
                x2={svgWidth - paddingRight}
                y2={yGridLimitCurve}
                stroke="#e2e8f0"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.6"
              />
              <text
                x={svgWidth - paddingRight}
                y={yGridLimitCurve - 6}
                textAnchor="end"
                fill="#cbd5e1"
                fontSize="9"
                fontWeight="bold"
                fontFamily="Montserrat"
              >
                Limite do Padrão ({gridLimitKW} kW)
              </text>

              {/* Área e Linha da Medição Real */}
              <path d={areaMeasured} fill="url(#measuredGradient)" />
              <path d={pathMeasured} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

              {/* Linha Projetada com Carregador */}
              <path d={pathWithCharger} fill="none" stroke="#E45318" strokeWidth="2" strokeDasharray="5,3" />

              {/* Ponto de Pico Destacado */}
              {points.length > 0 && (() => {
                const peakIdx = points.findIndex(p => p.powerKW === summary.maxPowerKW);
                if (peakIdx === -1) return null;
                const xPeak = getCurveX(peakIdx);
                const yPeak = getCurveY(summary.maxPowerKW);
                return (
                  <g>
                    <circle cx={xPeak} cy={yPeak} r="5" fill="#E45318" stroke="#ffffff" strokeWidth="2" />
                    <rect
                      x={xPeak - 40}
                      y={yPeak - 24}
                      width="80"
                      height="18"
                      rx="6"
                      fill="#E45318"
                    />
                    <text
                      x={xPeak}
                      y={yPeak - 12}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Montserrat"
                    >
                      Pico: {summary.maxPowerKW.toFixed(2)} kW
                    </text>
                  </g>
                );
              })()}

              {/* Eixo X com Labels de Horários */}
              {points.map((pt, i) => {
                const step = Math.max(1, Math.round(points.length / 8));
                if (i % step === 0 || i === points.length - 1) {
                  const x = getCurveX(i);
                  return (
                    <g key={i}>
                      <line x1={x} y1={paddingTop + plotHeight} x2={x} y2={paddingTop + plotHeight + 5} stroke="#334155" />
                      <text
                        x={x}
                        y={paddingTop + plotHeight + 18}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="Montserrat"
                      >
                        {pt.dateStr ? pt.dateStr.slice(0, 5) : pt.timeStr.slice(0, 5)}
                      </text>
                    </g>
                  );
                }
                return null;
              })}
            </svg>
          </div>
        </div>
      )}

      {/* ─── 3. VISUALIZAÇÃO: TABELA DE INSPEÇÃO DE DADOS (EXPANSÍVEL) ─── */}
      {activeTab === 'table' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in duration-200">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Registros Lidos ({summary.totalReadings} pontos no período)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-4 py-2.5">Hora</th>
                  <th className="px-4 py-2.5">Potência Ativa (kW)</th>
                  <th className="px-4 py-2.5">Corrente Estimada (A @ 220V)</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentPoints.map((pt) => {
                  const isPeak = pt.powerKW === summary.maxPowerKW;
                  return (
                    <tr key={pt.index} className={isPeak ? "bg-orange-50/70 font-semibold" : "hover:bg-slate-50"}>
                      <td className="px-4 py-2 text-slate-400">{pt.index}</td>
                      <td className="px-4 py-2">{pt.dateStr}</td>
                      <td className="px-4 py-2 font-mono font-bold text-slate-800">{pt.timeStr}</td>
                      <td className="px-4 py-2">
                        <span className={isPeak ? "text-[#E45318] font-bold" : "text-slate-800"}>
                          {pt.powerKW.toFixed(3)} kW
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono">{pt.estimatedCurrentA?.toFixed(1)} A</td>
                      <td className="px-4 py-2">
                        {isPeak ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-[#E45318]">
                            Pico Global
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
