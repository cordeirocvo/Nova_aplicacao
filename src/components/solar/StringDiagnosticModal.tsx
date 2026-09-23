"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Zap,
  Activity,
  Layers,
  RefreshCw,
  Wrench,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import { PlantDiagnosticSummary, InverterDiagnosticResult } from "@/lib/services/stringDiagnosticService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usinaId: string;
  usinaNome: string;
  date: string;
  onDateChange?: (date: string) => void;
}

export default function StringDiagnosticModal({
  isOpen,
  onClose,
  usinaId,
  usinaNome,
  date,
  onDateChange,
}: Props) {
  const [data, setData] = useState<PlantDiagnosticSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedInvIdx, setSelectedInvIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostic = async () => {
    if (!usinaId || usinaId === "consolidado") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/solar/telemetria/diagnostico-strings?usinaId=${usinaId}&date=${date}&t=${Date.now()}`
      );
      const json = await res.json();
      if (json.success && json.diagnostico) {
        setData(json.diagnostico);
        setSelectedInvIdx(0);
      } else {
        setData(null);
        setError(json.error || json.mensagem || "Nenhum dado de strings disponível para a data.");
      }
    } catch (err: any) {
      setError("Erro ao carregar diagnóstico de strings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostic();
    }
  }, [isOpen, usinaId, date]);

  if (!isOpen) return null;

  const currentInv: InverterDiagnosticResult | undefined = data?.inversores[selectedInvIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 md:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full p-4 md:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-slate-100 tracking-tight">
                  Diagnóstico Inteligente de Strings CC por MPPT
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Baseline 16/09/2026
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Usina: <span className="font-semibold text-slate-200">{usinaNome}</span> | Data:{" "}
                <span className="font-mono text-amber-300">{date}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostic}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              title="Recarregar diagnóstico"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── CORPO PRINCIPAL ── */}
        <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Processando diagnóstico de correntes por MPPT e comparando com baseline...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-slate-950/70 border border-slate-800 rounded-2xl text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">{error}</p>
              <p className="text-xs text-slate-500">
                Selecione uma data com geração solar sob sol pleno (ex: 16/09/2026) para auditar as strings.
              </p>
              {onDateChange && (
                <button
                  onClick={() => onDateChange("2026-09-16")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 inline-flex items-center gap-2 transition"
                >
                  Carregar Baseline 16/09/2026
                </button>
              )}
            </div>
          ) : data ? (
            <>
              {/* ── CARDS DE KPIS GERAIS DA USINA ── */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Strings</div>
                  <div className="text-xl font-black text-slate-100 font-mono mt-0.5">{data.kpis.totalStrings}</div>
                  <div className="text-[10px] text-slate-400 mt-1">28 strings / inversor</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Ligadas (Projeto)</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{data.kpis.totalLigadas}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Fisicamente ativas</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Vazias (Projeto)</div>
                  <div className="text-xl font-black text-slate-400 font-mono mt-0.5">{data.kpis.totalVazias}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Sem alarme falso</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Saúde Operacional</div>
                  <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{data.kpis.taxaSaudePct}%</div>
                  <div className="text-[10px] text-slate-400 mt-1">Strings normais</div>
                </div>

                <div
                  className={`border rounded-2xl p-3 transition ${
                    data.kpis.totalFusivelQueimado > 0
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                      : "bg-slate-950/80 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold">Fusível / Rompida</div>
                  <div className="text-xl font-black font-mono mt-0.5 text-rose-400">
                    {data.kpis.totalFusivelQueimado}
                  </div>
                  <div className="text-[10px] mt-1">Corrente 0A no pico</div>
                </div>

                <div
                  className={`border rounded-2xl p-3 transition ${
                    data.kpis.totalSubperformance > 0
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                      : "bg-slate-950/80 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold">Desbalanceadas</div>
                  <div className="text-xl font-black font-mono mt-0.5 text-amber-400">
                    {data.kpis.totalSubperformance}
                  </div>
                  <div className="text-[10px] mt-1">Desvio &gt; 30% no MPPT</div>
                </div>
              </div>

              {/* ── PARECER TÉCNICO & RECOMENDAÇÕES DE CAMPO (SE HOUVER ALERTAS) ── */}
              {data.alertasGerais.length > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/30 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                    <Wrench className="w-4 h-4" />
                    Plano de Ação para a Equipe Técnica de Campo ({data.alertasGerais.length} anomalias detectadas):
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {data.alertasGerais.map((alerta, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          alerta.severidade === "ALTA"
                            ? "bg-slate-950 border-rose-500/30 text-rose-200"
                            : "bg-slate-950 border-amber-500/30 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>
                            Inversor {alerta.inversorSN} • MPPT {alerta.mppt} (String {alerta.stringNum})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              alerta.severidade === "ALTA" ? "bg-rose-500 text-slate-950" : "bg-amber-500 text-slate-950"
                            }`}
                          >
                            {alerta.severidade === "ALTA" ? "Fusível / Desconexão" : "Subperformance"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{alerta.mensagem}</p>
                        <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1 mt-1">
                          <ChevronRight className="w-3 h-3 flex-shrink-0" />
                          {alerta.recomendacao}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SELETOR DE ABAS DOS INVERSORES ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Selecione o Inversor para Inspeção Detalhada:
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Ponto de medição: {new Date(data.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {data.inversores.map((inv, idx) => {
                    const isSelected = selectedInvIdx === idx;
                    const hasHighAlert = inv.totalFusivelQueimado > 0;
                    const hasMediumAlert = inv.totalSubperformance > 0;

                    return (
                      <button
                        key={inv.inversorSN}
                        onClick={() => setSelectedInvIdx(idx)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2.5 shadow-sm ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20 scale-[1.02]"
                            : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${isSelected ? "text-slate-950" : "text-amber-400"}`} />
                        <span>Inversor {idx + 1}</span>
                        <span className={`font-mono text-[10px] ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                          ({inv.inversorSN})
                        </span>

                        {hasHighAlert ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
                            {inv.totalFusivelQueimado} FUSÍVEL
                          </span>
                        ) : hasMediumAlert ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                            {inv.totalSubperformance} DESVIO
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── GRID DOS 14 MPPTS DO INVERSOR SELECIONADO ── */}
              {currentInv && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-slate-200">
                      Topologia de Strings do Inversor {currentInv.inversorSN} (14 MPPTs, 28 Entradas CC):
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Normal
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span> Vazia Projeto
                      </span>
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Fusível Rompido
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span> Desbalanceamento
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {currentInv.mppts.map((mppt) => {
                      const isFusivel = mppt.statusGeral === "ALERTA_FUSIVEL";
                      const isDesbal = mppt.statusGeral === "ALERTA_DESBALANCEAMENTO";
                      const isVazio = mppt.statusGeral === "INATIVO";

                      return (
                        <div
                          key={mppt.mppt}
                          className={`rounded-2xl p-3 border transition-all ${
                            isFusivel
                              ? "bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/50"
                              : isDesbal
                              ? "bg-amber-950/20 border-amber-500/40"
                              : isVazio
                              ? "bg-slate-950/40 border-slate-850 opacity-70"
                              : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-850 text-xs">
                            <span className="font-black text-slate-200">MPPT {mppt.mppt}</span>
                            {mppt.deltaCorrentePct !== undefined && mppt.deltaCorrentePct > 0 ? (
                              <span
                                className={`text-[10px] font-mono font-bold ${
                                  mppt.deltaCorrentePct > 30 ? "text-amber-400" : "text-slate-400"
                                }`}
                              >
                                Δ {mppt.deltaCorrentePct}%
                              </span>
                            ) : null}
                          </div>

                          {/* Strings A e B */}
                          <div className="space-y-2 mt-2">
                            {/* String A */}
                            <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl">
                              <div>
                                <span className="font-bold text-slate-300">String {mppt.stringA.stringNum}</span>
                                <div className="text-[10px] text-slate-400">
                                  {mppt.stringA.statusProjeto === "VAZIA" ? (
                                    <span className="text-slate-500 font-semibold">Vazia de Projeto</span>
                                  ) : (
                                    <span className="text-emerald-400">Conectada</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div
                                  className={`font-mono font-bold text-sm ${
                                    mppt.stringA.diagnostico === "FUSIVEL_QUEIMADO"
                                      ? "text-rose-400 animate-pulse font-black"
                                      : mppt.stringA.diagnostico === "SUBPERFORMANCE"
                                      ? "text-amber-400 font-bold"
                                      : mppt.stringA.correnteA > 0
                                      ? "text-emerald-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {mppt.stringA.correnteA.toFixed(2)} A
                                </div>
                                {mppt.stringA.tensaoV && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {mppt.stringA.tensaoV.toFixed(0)} V
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* String B */}
                            <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl">
                              <div>
                                <span className="font-bold text-slate-300">String {mppt.stringB.stringNum}</span>
                                <div className="text-[10px] text-slate-400">
                                  {mppt.stringB.statusProjeto === "VAZIA" ? (
                                    <span className="text-slate-500 font-semibold">Vazia de Projeto</span>
                                  ) : (
                                    <span className="text-emerald-400">Conectada</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div
                                  className={`font-mono font-bold text-sm ${
                                    mppt.stringB.diagnostico === "FUSIVEL_QUEIMADO"
                                      ? "text-rose-400 animate-pulse font-black"
                                      : mppt.stringB.diagnostico === "SUBPERFORMANCE"
                                      ? "text-amber-400 font-bold"
                                      : mppt.stringB.correnteA > 0
                                      ? "text-emerald-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {mppt.stringB.correnteA.toFixed(2)} A
                                </div>
                                {mppt.stringB.tensaoV && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {mppt.stringB.tensaoV.toFixed(0)} V
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Alerta contextual do MPPT */}
                          {isFusivel && (
                            <div className="mt-2 text-[10px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 p-1.5 rounded-lg flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                              <span>Alerta: Fusível CC rompido</span>
                            </div>
                          )}
                          {isDesbal && (
                            <div className="mt-2 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 p-1.5 rounded-lg flex items-center gap-1">
                              <Info className="w-3 h-3 text-amber-400 flex-shrink-0" />
                              <span>Desbalanceamento &gt; 30%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── NOTA DE CONFORMIDADE ── */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-[11px] text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300">Auditoria ABNT NBR 16274 / IEC 61724: </span>
                  O monitoramento contínuo da corrente por par de MPPT assegura a detecção precoce de perda de geração
                  por queima silenciosa de fusíveis gPV e evita aquecimento em pontos quentes (hotspots). As strings
                  vazias de projeto são filtradas para garantir taxa de zero falso-positivo.
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* ── FOOTER COM BOTÃO FECHAR ── */}
        <div className="pt-3 border-t border-slate-800 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 transition"
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}
