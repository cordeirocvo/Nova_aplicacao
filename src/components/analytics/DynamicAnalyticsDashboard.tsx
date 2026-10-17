"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, ArrowUpRight, ArrowDownRight, RefreshCw, 
  Layers, Database, Cpu, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from "recharts";
import { AntigravityDashboardPayload, DashboardKPI, TimeSeriesPoint } from "@/app/api/dashboard/analitico/route";

interface DynamicAnalyticsDashboardProps {
  apiEndpoint?: string;
  title?: string;
  subtitle?: string;
}

export default function DynamicAnalyticsDashboard({
  apiEndpoint = "/api/dashboard/analitico",
  title = "Painel Analítico de Alta Performance",
  subtitle = "Engine OLAP Dinâmica com DuckDB, Polars e Validação Estrutural Parquet"
}: DynamicAnalyticsDashboardProps) {
  const [data, setData] = useState<AntigravityDashboardPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiEndpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`Falha ao buscar dados analíticos: HTTP ${res.status}`);
      const json: AntigravityDashboardPayload = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.message || "Erro desconhecido ao carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiEndpoint]);

  // Estilização semafórica padrão Cordeiro Operations (3 cores)
  const getStatusBadge = (status: DashboardKPI["status_alerta"]) => {
    switch (status) {
      case "sucesso":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-[#00B356]",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#00B356]" />,
          label: "Ideal"
        };
      case "alerta":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: "Atenção"
        };
      case "perigo":
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
          label: "Intervenção"
        };
      default:
        return {
          bg: "bg-slate-800 border-slate-700 text-slate-400",
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
          label: "Informativo"
        };
    }
  };

  return (
    <div className="bg-[#0A192F] text-white p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
      {/* ─── CABEÇALHO DO DASHBOARD DINÂMICO ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#E45318]" />
              Antigravity Dashboard Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">OLAP Schema v1.0</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            {title}
          </h2>
          <p className="text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        {/* Heartbeat silencioso & Botão de Sincronização */}
        <div className="flex items-center gap-3">
          <div className="text-right text-[10px] font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="block text-slate-500">ÚLTIMO HEARTBEAT:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {lastRefreshed.toLocaleTimeString("pt-BR")}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#E45318]" : ""}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* ─── FEEDBACK DE ERRO OU CARREGAMENTO ─── */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-600/50 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── 4 KPIS FUNDAMENTAIS DINÂMICOS (RENDERIZADOS PELO SCHEMA) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.kpis_gerenciais?.map((kpi) => {
          const badge = getStatusBadge(kpi.status_alerta);
          return (
            <div
              key={kpi.id}
              className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {kpi.titulo}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.bg}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-2xl font-black text-white font-mono">
                  {kpi.tipo_sufixo === "R$" ? `R$ ${kpi.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : kpi.valor.toLocaleString("pt-BR")}
                </span>
                {kpi.tipo_sufixo !== "R$" && (
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    {kpi.tipo_sufixo}
                  </span>
                )}
              </div>

              {/* Variação Percentual */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px] font-mono">
                <span className="text-slate-500">Variação / Desvio:</span>
                <span className={`font-bold flex items-center ${kpi.variacao_percentual >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {kpi.variacao_percentual >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  )}
                  {kpi.variacao_percentual > 0 ? `+${kpi.variacao_percentual}%` : `${kpi.variacao_percentual}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── SÉRIES TEMPORAIS: GRÁFICO OLAP DINÂMICO ─── */}
      <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#00B356]" />
            Comparativo de Séries Temporais: Realizado vs Projetado
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            {data?.series_temporais?.length || 0} registros consolidados
          </span>
        </div>

        <div className="h-64 w-full">
          {data?.series_temporais && data.series_temporais.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series_temporais} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="data" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => val.split("-").slice(1).join("/")}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: "#f8fafc" }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 1 })}`,
                    name === "total_realizado" ? "Realizado" : "Projetado"
                  ]}
                  labelFormatter={(lbl) => `Data: ${lbl}`}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={(value) => (value === "total_realizado" ? "Realizado" : "Projetado")}
                />
                <Bar dataKey="total_realizado" fill="#00B356" radius={[4, 4, 0, 0]} name="total_realizado" />
                <Bar dataKey="total_projetado" fill="#E45318" radius={[4, 4, 0, 0]} name="total_projetado" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Nenhum dado analítico disponível no momento.
            </div>
          )}
        </div>
      </div>

      {/* ─── TABELA ANALÍTICA DE REGISTROS CONSOLIDADOS ─── */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Database className="w-4 h-4 text-amber-400" />
          Registros OLAP Extraídos (DuckDB / Polars Engine)
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 px-3">Local / Ativo</th>
                <th className="py-2 px-3 text-right">Capacidade (kWp)</th>
                <th className="py-2 px-3 text-right">Realizado</th>
                <th className="py-2 px-3 text-right">Projetado</th>
                <th className="py-2 pl-3 text-right">Desvio (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px] font-mono">
              {data?.series_temporais?.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="py-2 pr-3 text-slate-400">{row.data}</td>
                  <td className="py-2 px-3 font-sans font-semibold text-white">{row.local}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{row.capacidade}</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">{row.total_realizado.toFixed(1)}</td>
                  <td className="py-2 px-3 text-right text-orange-400">{row.total_projetado.toFixed(1)}</td>
                  <td className={`py-2 pl-3 text-right font-bold ${row.desvio_percentual >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {row.desvio_percentual > 0 ? `+${row.desvio_percentual}%` : `${row.desvio_percentual}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
