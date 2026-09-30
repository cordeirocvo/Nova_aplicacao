"use client";

import React, { useState } from "react";
import { 
  FileSpreadsheet, Calendar, Clock, Zap, Activity, 
  TrendingUp, BarChart3, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle
} from "lucide-react";
import { PeriodMeasurementSummary, MeasuredIntervalPoint } from "@/lib/coenergygo";

interface ImportedDataViewerProps {
  summary: PeriodMeasurementSummary;
  chargerPowerKW: number;
  gridLimitKW: number;
  onClear?: () => void;
}

export default function ImportedDataViewer({
  summary,
  chargerPowerKW,
  gridLimitKW,
  onClear
}: ImportedDataViewerProps) {
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

  // Escalas
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

  const yGridLimit = getY(gridLimitKW);

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTable(!showTable)}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all"
          >
            {showTable ? "Ocultar Tabela de Leituras" : "Inspecionar Dados Lidos"}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs font-bold text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl transition-all"
            >
              Remover
            </button>
          )}
        </div>
      </div>

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

      {/* ─── GRÁFICO EM ALTA RESOLUÇÃO DO PERÍODO MEDIDO (PASSO 5 MIN) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E45318]" />
              Curva Real de Demanda (Intervalo de {summary.intervalMinutes} min) vs Carregador ({chargerPowerKW} kW)
            </h4>
            <p className="text-[11px] text-slate-500">
              Acompanhamento contínuo da medição importada e projeção da demanda simultânea total com a recarga
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
              const y = getY(val);
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
              y1={yGridLimit}
              x2={svgWidth - paddingRight}
              y2={yGridLimit}
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.6"
            />
            <text
              x={svgWidth - paddingRight}
              y={yGridLimit - 6}
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
              const xPeak = getX(peakIdx);
              const yPeak = getY(summary.maxPowerKW);
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
                    Pico: {summary.maxPowerKW.toFixed(1)} kW
                  </text>
                </g>
              );
            })()}

            {/* Eixo X com Labels de Horários */}
            {points.map((pt, i) => {
              // Mostra labels a cada ~12 pontos (a cada 1 hora se passo for 5 min)
              const step = Math.max(1, Math.round(points.length / 8));
              if (i % step === 0 || i === points.length - 1) {
                const x = getX(i);
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
                      {pt.timeStr.slice(0, 5)}
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>
      </div>

      {/* ─── TABELA DE INSPEÇÃO DE DADOS (EXPANSÍVEL) ─── */}
      {showTable && (
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
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
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
                            Pico do Período
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
