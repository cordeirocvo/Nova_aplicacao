"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Layers, Sliders, Save, RefreshCw } from 'lucide-react';

interface EtapaItem {
  id: string;
  nome: string;
  pesoPercentual: number;
  progressoAcumulado: number;
  contribuiçãoGlobal: number;
}

interface CurvaSPoint {
  dataStr: string;
  avancoReal: number;
  avancoPrevisto: number;
  desvio: number;
}

interface CurvaSChartProps {
  projetoId: string;
  nomeProjeto?: string;
  readOnly?: boolean;
}

export default function CurvaSChart({ projetoId, nomeProjeto, readOnly = false }: CurvaSChartProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    avancoRealAcumulado: number;
    avancoPrevistoAcumulado: number;
    desvioPercentual: number;
    statusDesvio: 'NO_PRAZO' | 'ADELANTADO' | 'ATRASADO';
    etapas: EtapaItem[];
    historicoCurvaS: CurvaSPoint[];
  } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editableEtapas, setEditableEtapas] = useState<EtapaItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projetoId) {
      fetchCurvaSData();
    }
  }, [projetoId]);

  const fetchCurvaSData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rdo/curva-s?projetoId=${projetoId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setEditableEtapas(json.etapas || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados da Curva S:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEtapas = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/rdo/curva-s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projetoId,
          etapas: editableEtapas
        })
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
        setEditMode(false);
      }
    } catch (err) {
      console.error('Erro ao salvar etapas:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#00B356] animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Calculando Avanço Físico Ponderado e Curva S...</p>
      </div>
    );
  }

  if (!data) return null;

  const somaPesos = editableEtapas.reduce((acc, e) => acc + (Number(e.pesoPercentual) || 0), 0);
  const points = data.historicoCurvaS || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-black text-[#E45318] uppercase tracking-widest block">Gestão de Desempenho Físico</span>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#00B356]" />
            Curva S & Avanço Físico Real Acumulado
          </h2>
          {nomeProjeto && <p className="text-xs text-slate-400 font-medium mt-0.5">{nomeProjeto}</p>}
        </div>

        {!readOnly && (
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <Sliders className="w-4 h-4 text-[#00B356]" />
            {editMode ? 'Cancelar Edição' : 'Ajustar Pesos da EAP'}
          </button>
        )}
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avanço Real Acumulado</span>
          <div className="text-3xl font-black text-[#00B356] flex items-baseline gap-1">
            {data.avancoRealAcumulado}%
            <span className="text-xs font-bold text-slate-400">Ponderado</span>
          </div>
          <p className="text-[11px] text-slate-400">Soma ponderada dos quantitativos de campo</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avanço Previsto (Linha de Base)</span>
          <div className="text-3xl font-black text-sky-400 flex items-baseline gap-1">
            {data.avancoPrevistoAcumulado}%
            <span className="text-xs font-bold text-slate-400">Meta</span>
          </div>
          <p className="text-[11px] text-slate-400">Objetivo previsto no cronograma oficial</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Desvio Físico (Status)</span>
          <div className="text-3xl font-black flex items-center gap-2">
            <span className={data.desvioPercentual < 0 ? 'text-amber-500' : 'text-emerald-400'}>
              {data.desvioPercentual > 0 ? `+${data.desvioPercentual}%` : `${data.desvioPercentual}%`}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-black uppercase ${
              data.statusDesvio === 'ATRASADO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              {data.statusDesvio === 'ATRASADO' ? '⚠️ Atrasado' : '✓ No Prazo'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Variação acumulada em relação à meta</p>
        </div>
      </div>

      {/* SVG Curva S Chart Graphic */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#E45318]" /> Evolução Temporal da Obra (Curva S)
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-3 h-0.5 bg-sky-400 rounded-full"></span> Previsto (Meta)
            </span>
            <span className="flex items-center gap-1.5 text-[#00B356]">
              <span className="w-3 h-0.5 bg-[#00B356] rounded-full"></span> Realizado (Campo)
            </span>
          </div>
        </div>

        {/* SVG Graphic Representation */}
        <div className="relative w-full h-44 bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 flex items-end">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="0" y1="30" x2="500" y2="30" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
            <line x1="0" y1="90" x2="500" y2="90" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />

            {/* Previsto Curve (Blue Line) */}
            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                points={points.map((p, idx) => {
                  const x = (idx / (points.length - 1)) * 500;
                  const y = 110 - (p.avancoPrevisto / 100) * 100;
                  return `${x},${y}`;
                }).join(' ')}
              />
            )}

            {/* Realizado Curve (Green Line) */}
            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="#00B356"
                strokeWidth="3.5"
                points={points.map((p, idx) => {
                  const x = (idx / (points.length - 1)) * 500;
                  const y = 110 - (p.avancoReal / 100) * 100;
                  return `${x},${y}`;
                }).join(' ')}
              />
            )}

            {/* Data Points Dots */}
            {points.map((p, idx) => {
              const x = (idx / (points.length - 1)) * 500;
              const yReal = 110 - (p.avancoReal / 100) * 100;
              return (
                <circle key={idx} cx={x} cy={yReal} r="4" fill="#00B356" stroke="#090d16" strokeWidth="2" />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between text-[10px] font-bold text-slate-500 px-1">
          {points.map((p, idx) => (
            <span key={idx}>{p.dataStr}</span>
          ))}
        </div>
      </div>

      {/* Breakdown by EAP Stages */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden space-y-2">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#E45318]" /> Desmembramento de Pesos por Etapa da EAP
          </h3>
          {editMode && (
            <span className={`text-xs font-bold ${Math.abs(somaPesos - 100) < 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Soma dos Pesos: {somaPesos}% {Math.abs(somaPesos - 100) < 0.1 ? '✓' : '(deve somar 100%)'}
            </span>
          )}
        </div>

        <div className="overflow-x-auto p-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Etapa da Obra (EAP)</th>
                <th className="p-3 text-center">Peso (%)</th>
                <th className="p-3 text-center">Progresso Etapa (%)</th>
                <th className="p-3 text-right">Contribuição no Avanço Global</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {editableEtapas.map((etapa, idx) => (
                <tr key={etapa.id || idx} className="hover:bg-slate-900/40">
                  <td className="p-3 font-extrabold text-slate-200">{etapa.nome}</td>
                  
                  <td className="p-3 text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={etapa.pesoPercentual}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditableEtapas(prev => prev.map((item, i) => i === idx ? { ...item, pesoPercentual: val } : item));
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 text-center rounded-lg p-1 font-bold text-white"
                      />
                    ) : (
                      <span className="font-bold text-slate-300">{etapa.pesoPercentual}%</span>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={etapa.progressoAcumulado}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditableEtapas(prev => prev.map((item, i) => i === idx ? { ...item, progressoAcumulado: val } : item));
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 text-center rounded-lg p-1 font-bold text-white"
                      />
                    ) : (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#00B356] h-full" style={{ width: `${Math.min(100, etapa.progressoAcumulado)}%` }} />
                        </div>
                        <span className="font-extrabold text-white">{etapa.progressoAcumulado}%</span>
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-right font-black text-[#00B356]">
                    +{((etapa.pesoPercentual * etapa.progressoAcumulado) / 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editMode && (
          <div className="p-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSaveEtapas}
              disabled={saving}
              className="px-6 py-2.5 bg-[#00B356] hover:bg-[#009c4a] text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salva...' : 'Salvar Pesos e Progressos'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
