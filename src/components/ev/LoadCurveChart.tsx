"use client";

import React, { useState } from "react";
import { HourlyLoadPoint } from "@/lib/coenergygo/types";
import { AlertTriangle, CheckCircle2, Sun, Zap } from "lucide-react";

interface LoadCurveChartProps {
  data: HourlyLoadPoint[];
  gridLimitKW: number;
  enableDLM: boolean;
  enableSolar: boolean;
}

export default function LoadCurveChart({
  data,
  gridLimitKW,
  enableDLM,
  enableSolar
}: LoadCurveChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HourlyLoadPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-72 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-semibold">
        Nenhum dado de curva de carga disponível
      </div>
    );
  }

  // Encontrar o valor máximo para escala do eixo Y (com margem de 15%)
  const maxKwInData = Math.max(
    gridLimitKW,
    ...data.map((d) => Math.max(d.totalUncontrolledKW, d.totalControlledKW, d.solarGenerationKW, d.baseLoadKW))
  );
  const maxY = Math.ceil((maxKwInData * 1.15) / 10) * 10 || 100;

  // Dimensões do SVG
  const width = 800;
  const height = 300;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (hour: number) => paddingLeft + (hour / 23) * chartWidth;
  const getY = (val: number) => paddingTop + chartHeight - (val / maxY) * chartHeight;

  // Gerar linhas SVG (Path d)
  const createPath = (key: 'baseLoadKW' | 'totalUncontrolledKW' | 'totalControlledKW' | 'solarGenerationKW') => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.hour)} ${getY(d[key])}`)
      .join(' ');
  };

  const pathBase = createPath('baseLoadKW');
  const pathUncontrolled = createPath('totalUncontrolledKW');
  const pathControlled = createPath('totalControlledKW');
  const pathSolar = createPath('solarGenerationKW');

  // Linha do Limite da Rede
  const yLimit = getY(gridLimitKW);

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#E45318]" />
            Curva de Demanda 24 Horas & Impacto dos Carregadores VE
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">
            Comparativo da demanda da edificação, limite do padrão e atuação da modulação inteligente
          </p>
        </div>

        {/* Legenda Dinâmica */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-0.5 bg-slate-400 rounded"></span> Consumo Atual
          </span>
          <span className="flex items-center gap-1.5 text-red-600">
            <span className="w-3 h-0.5 bg-red-500 rounded border-dashed"></span> Limite Padrão ({gridLimitKW} kW)
          </span>
          <span className="flex items-center gap-1.5 text-red-500">
            <span className="w-3 h-1 bg-red-400 rounded"></span> Sem DLM (Sobrecarga)
          </span>
          {enableDLM && (
            <span className="flex items-center gap-1.5 text-[#00B356]">
              <span className="w-3 h-1 bg-[#00B356] rounded"></span> Com DLM Seguro
            </span>
          )}
          {enableSolar && (
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="w-3 h-0.5 bg-amber-400 rounded"></span> Excedente Solar
            </span>
          )}
        </div>
      </div>

      {/* Gráfico SVG Responsivo */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Linhas de Grade Horizontais */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = Math.round(maxY * ratio);
            const y = getY(val);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-semibold"
                >
                  {val}kW
                </text>
              </g>
            );
          })}

          {/* Linhas de Grade Verticais (Horas) */}
          {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => {
            const x = getX(h);
            return (
              <g key={h}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={height - paddingBottom}
                  stroke="#F8FAFC"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-semibold"
                >
                  {String(h).padStart(2, '0')}h
                </text>
              </g>
            );
          })}

          {/* Curva Solar Fotovoltaica */}
          {enableSolar && (
            <path
              d={pathSolar}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          )}

          {/* Curva de Consumo Base da Edificação */}
          <path
            d={pathBase}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
          />

          {/* Curva de Sobrecarga SEM DLM */}
          <path
            d={pathUncontrolled}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeDasharray="4 2"
            opacity="0.75"
          />

          {/* Curva Protegida COM DLM */}
          {enableDLM && (
            <path
              d={pathControlled}
              fill="none"
              stroke="#00B356"
              strokeWidth="3"
            />
          )}

          {/* Linha do Limite Contratual / Disjuntor */}
          <line
            x1={paddingLeft}
            y1={yLimit}
            x2={width - paddingRight}
            y2={yLimit}
            stroke="#DC2626"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
          <text
            x={width - paddingRight}
            y={yLimit - 6}
            textAnchor="end"
            className="text-[9px] fill-red-600 font-black uppercase tracking-wider"
          >
            Limite do Padrão: {gridLimitKW} kW
          </text>

          {/* Interatividade / Pontos Invisíveis de Detecção de Mouse */}
          {data.map((d) => {
            const x = getX(d.hour);
            const isHovered = hoveredPoint?.hour === d.hour;
            return (
              <g
                key={d.hour}
                onMouseEnter={() => setHoveredPoint(d)}
                className="cursor-pointer"
              >
                {/* Faixa vertical transparente para clique/hover */}
                <rect
                  x={x - (chartWidth / 48)}
                  y={paddingTop}
                  width={chartWidth / 24}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Marcador vertical quando selecionado */}
                {isHovered && (
                  <>
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={height - paddingBottom}
                      stroke="#0A192F"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={x}
                      cy={getY(enableDLM ? d.totalControlledKW : d.totalUncontrolledKW)}
                      r="5"
                      fill={enableDLM ? "#00B356" : "#EF4444"}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip Flutuante */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-[#0A192F] text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 border border-slate-700 pointer-events-none z-20 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-1.5 font-bold">
              <span className="text-[#00B356]">Horário: {hoveredPoint.hourLabel}</span>
              <span className="text-[10px] text-slate-400">Padrão: {gridLimitKW} kW</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] pt-1">
              <span className="text-slate-400">Consumo da Edificação:</span>
              <strong className="text-right">{hoveredPoint.baseLoadKW} kW</strong>

              {hoveredPoint.solarGenerationKW > 0 && (
                <>
                  <span className="text-amber-400">Geração Solar:</span>
                  <strong className="text-right text-amber-300">-{hoveredPoint.solarGenerationKW} kW</strong>
                  {hoveredPoint.solarGenerationKW > hoveredPoint.baseLoadKW && (
                    <>
                      <span className="text-emerald-400">Excedente Solar:</span>
                      <strong className="text-right text-emerald-300">
                        +{(hoveredPoint.solarGenerationKW - hoveredPoint.baseLoadKW).toFixed(1)} kW
                      </strong>
                    </>
                  )}
                </>
              )}

              <span className="text-slate-400">Carregadores VE:</span>
              <strong className={`text-right font-bold ${hoveredPoint.evLoadUncontrolledKW > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                {hoveredPoint.evLoadUncontrolledKW > 0 
                  ? `+${hoveredPoint.evLoadUncontrolledKW} kW (Ativo)` 
                  : 'Desconectados (0 kW)'}
              </strong>

              <span className="text-slate-400">Folga no Padrão:</span>
              <strong className="text-right text-emerald-400">{hoveredPoint.headroomKW} kW</strong>

              <div className="col-span-2 border-t border-slate-700/80 my-1"></div>

              <span className="text-slate-300">Demanda da Rede (Sem DLM):</span>
              <strong className="text-right text-slate-200">{hoveredPoint.totalUncontrolledKW} kW</strong>

              {enableDLM && (
                <>
                  <span className="text-[#00B356] font-bold">Demanda da Rede (Com DLM):</span>
                  <strong className="text-right text-[#00B356] font-black">{hoveredPoint.totalControlledKW} kW</strong>

                  {hoveredPoint.evLoadUncontrolledKW > 0 && (
                    <>
                      <span className="text-slate-400">Corrente por Veículo:</span>
                      <strong className="text-right text-slate-200">{hoveredPoint.perChargerCurrentA}A</strong>
                    </>
                  )}
                </>
              )}
            </div>

            {hoveredPoint.isOverloadedWithoutDLM && (
              <div className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 mt-1 font-semibold">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                Sobrecarga sem DLM: +{hoveredPoint.overloadAmountKW} kW
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
