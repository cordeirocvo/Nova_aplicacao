"use client";

import React, { useState, useEffect, useTransition } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Edit, ShieldAlert, Paperclip, Download, Activity, Sun, RotateCcw, 
  Clock, CheckCircle2, ChevronDown, ChevronUp, Tv, AlertTriangle
} from "lucide-react";
import { TagToggler } from "./TagToggler";
import TvUsinasView from "./TvUsinasView";

export default function AtividadesClientView({ atividades, settings, isAdmin, isTV }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const [localIsTV, setLocalIsTV] = useState(isTV);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("__ALL__");
  const [pillFilter, setPillFilter] = useState<"ALL" | "URGENT" | "PRIORITY" | "EXTRA" | "LATE">("ALL");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Configurações do Semáforo e Tempos da TV
  const [prGreen, setPrGreen] = useState(78);
  const [prYellow, setPrYellow] = useState(60);
  const [tvTempoAtividades, setTvTempoAtividades] = useState(15);
  const [tvTempoUsinas, setTvTempoUsinas] = useState(25);
  const [tvUsinasPerPage, setTvUsinasPerPage] = useState(5);

  const [tvModeSelection, setTvModeSelection] = useState<"HYBRID" | "TV_ATIVIDADES" | "TV_USINAS">("HYBRID");
  const [activeTvScreen, setActiveTvScreen] = useState<"atividades" | "usinas">("atividades");
  const [tvSecondsRemaining, setTvSecondsRemaining] = useState<number>(15);

  // Carrega preferências do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("forcedTvMode");
    if (stored === "true") setLocalIsTV(true);
    else if (stored === "false") setLocalIsTV(false);
    else setLocalIsTV(isTV);

    const savedMode = localStorage.getItem("cordeiro_tv_mode");
    if (savedMode === "HYBRID" || savedMode === "TV_ATIVIDADES" || savedMode === "TV_USINAS") {
      setTvModeSelection(savedMode);
      if (savedMode === "TV_USINAS") setActiveTvScreen("usinas");
      if (savedMode === "TV_ATIVIDADES") setActiveTvScreen("atividades");
    }

    const g = localStorage.getItem("cordeiro_pr_green");
    if (g) setPrGreen(Number(g));
    const y = localStorage.getItem("cordeiro_pr_yellow");
    if (y) setPrYellow(Number(y));
    const ta = localStorage.getItem("cordeiro_tv_time_ativ");
    if (ta) setTvTempoAtividades(Number(ta));
    const tu = localStorage.getItem("cordeiro_tv_time_usinas");
    if (tu) setTvTempoUsinas(Number(tu));
    const upp = localStorage.getItem("cordeiro_tv_usinas_per_page");
    if (upp) setTvUsinasPerPage(Number(upp));
  }, [isTV]);

  // Heartbeat para atualização em tempo real
  useEffect(() => {
    let lastHash = "";
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/tv/heartbeat");
        const data = await res.json();
        if (data.success && data.hash) {
          if (lastHash && lastHash !== data.hash) {
            startTransition(() => {
              router.refresh();
            });
          }
          lastHash = data.hash;
        }
      } catch {
        // silencioso
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [router]);

  const toggleTvMode = (mode?: "HYBRID" | "TV_ATIVIDADES" | "TV_USINAS") => {
    if (!localIsTV) {
      const selected = mode || "HYBRID";
      setTvModeSelection(selected);
      localStorage.setItem("cordeiro_tv_mode", selected);
      setLocalIsTV(true);
      localStorage.setItem("forcedTvMode", "true");
      setActiveTvScreen(selected === "TV_USINAS" ? "usinas" : "atividades");
      setTvSecondsRemaining(selected === "TV_USINAS" ? tvTempoUsinas : tvTempoAtividades);
    } else {
      setLocalIsTV(false);
      localStorage.removeItem("forcedTvMode");
      window.dispatchEvent(new Event("storage"));
    }
  };

  const switchTvCycleMode = () => {
    let next: "HYBRID" | "TV_ATIVIDADES" | "TV_USINAS" = "HYBRID";
    if (tvModeSelection === "HYBRID") next = "TV_ATIVIDADES";
    else if (tvModeSelection === "TV_ATIVIDADES") next = "TV_USINAS";
    else next = "HYBRID";

    setTvModeSelection(next);
    localStorage.setItem("cordeiro_tv_mode", next);
    if (next === "TV_USINAS") {
      setActiveTvScreen("usinas");
      setTvSecondsRemaining(tvTempoUsinas);
    } else {
      setActiveTvScreen("atividades");
      setTvSecondsRemaining(tvTempoAtividades);
    }
  };

  // Filtros combinados (Busca + Select + Pílulas)
  const filteredAtividades = React.useMemo(() => {
    let list = atividades as any[];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.instalacao || "").toLowerCase().includes(q) ||
          (a.obsInstalacao || "").toLowerCase().includes(q) ||
          (a.vendedor || "").toLowerCase().includes(q) ||
          (a.cidade || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "__ALL__") {
      list = list.filter((a) => (a.status || "Pendente") === statusFilter);
    }

    if (pillFilter === "URGENT") {
      list = list.filter((a) => a.daysParecer !== null && a.daysParecer <= settings.limiteParecer);
    } else if (pillFilter === "PRIORITY") {
      list = list.filter((a) => a.prioridade);
    } else if (pillFilter === "EXTRA") {
      list = list.filter((a) => a.atividadeExtra);
    } else if (pillFilter === "LATE") {
      list = list.filter((a) => a.daysPrev !== null && a.daysPrev < 0);
    }

    return list;
  }, [atividades, search, statusFilter, pillFilter, settings.limiteParecer]);

  const uniqueStatuses = React.useMemo(() => {
    const seen = new Set<string>();
    (atividades as any[]).forEach((a) => seen.add(a.status || "Pendente"));
    return Array.from(seen).sort();
  }, [atividades]);

  const totalUrgent = React.useMemo(
    () => (atividades as any[]).filter((a) => a.daysParecer !== null && a.daysParecer <= settings.limiteParecer).length,
    [atividades, settings.limiteParecer]
  );
  const totalPriority = React.useMemo(() => (atividades as any[]).filter((a) => a.prioridade).length, [atividades]);
  const totalExtra = React.useMemo(() => (atividades as any[]).filter((a) => a.atividadeExtra).length, [atividades]);
  const totalLate = React.useMemo(() => (atividades as any[]).filter((a) => a.daysPrev !== null && a.daysPrev < 0).length, [atividades]);

  // Paginação inteligente para caber perfeitamente na TV sem barra de rolagem
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(0);
  }, [localIsTV, search, statusFilter, pillFilter]);

  useEffect(() => {
    const calcRows = () => {
      if (!localIsTV) {
        setItemsPerPage(25);
        return;
      }
      const headerSpace = 200;
      const avHeight = window.innerHeight - headerSpace;
      const rowHeight = 62;
      let rows = Math.floor(avHeight / rowHeight);
      if (rows < 4) rows = 4;
      if (rows > 8) rows = 8;
      setItemsPerPage(rows);
    };

    calcRows();
    window.addEventListener('resize', calcRows);
    return () => window.removeEventListener('resize', calcRows);
  }, [localIsTV]);

  const totalPages = Math.ceil(filteredAtividades.length / itemsPerPage) || 1;

  // Ciclo automático da TV
  useEffect(() => {
    if (!localIsTV) return;

    if (tvModeSelection === "TV_ATIVIDADES") {
      if (totalPages <= 1) return;
      const interval = setInterval(() => {
        setCurrentPage((prev) => (prev + 1) % totalPages);
      }, tvTempoAtividades * 1000);
      return () => clearInterval(interval);
    }

    if (tvModeSelection === "TV_USINAS") {
      setActiveTvScreen("usinas");
      return;
    }

    // Modo Híbrido: controla a tela de atividades; a tela de usinas controla seu próprio ciclo e chama onBackToAtividades
    if (tvModeSelection === "HYBRID" && activeTvScreen === "atividades") {
      const timer = setInterval(() => {
        setTvSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (currentPage < totalPages - 1) {
              setCurrentPage((p) => p + 1);
              return tvTempoAtividades;
            } else {
              setActiveTvScreen("usinas");
              return tvTempoUsinas;
            }
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [localIsTV, tvModeSelection, activeTvScreen, currentPage, totalPages, tvTempoAtividades, tvTempoUsinas]);

  const currentSlice = filteredAtividades.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  // ── MODO TV: RENDERIZAÇÃO FULLSCREEN COM DESIGN DARK NOC DE ALTO CONTRASTE ──
  if (localIsTV) {
    if (activeTvScreen === "usinas") {
      return (
        <div data-tv="true" className="fixed inset-0 z-[100] w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0A192F] box-border">
          <TvUsinasView
            onBackToAtividades={() => {
              setActiveTvScreen("atividades");
              setCurrentPage(0);
              setTvSecondsRemaining(tvTempoAtividades);
            }}
            isStandaloneTv={tvModeSelection === "TV_USINAS"}
            prLimiteVerde={prGreen}
            prLimiteAmarelo={prYellow}
            tempoPorTela={tvTempoUsinas}
            usinasPorTela={tvUsinasPerPage}
            onSwitchCycleMode={switchTvCycleMode}
            onExitTv={() => toggleTvMode()}
            tvModeSelection={tvModeSelection}
          />
        </div>
      );
    }

    return (
      <div 
        data-tv="true"
        className="fixed inset-0 z-[100] w-full h-[100dvh] max-h-[100dvh] bg-[#0A192F] text-white flex flex-col justify-between p-3 sm:p-4 lg:p-5 select-none overflow-hidden font-sans box-border"
        style={{
          backgroundColor: "#0A192F",
          color: "#FFFFFF",
          minHeight: "100vh",
          maxHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px",
          boxSizing: "border-box",
          overflow: "hidden",
          fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* Topo da TV Atividades */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#E45318] text-white font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg tracking-wider shadow-md shrink-0">
              CORDEIRO ENERGIA
            </div>
            <div className="h-6 w-[1px] bg-slate-700 hidden sm:block shrink-0" />
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#00B356] shrink-0" />
                CENTRAL DE OPERAÇÕES • ATIVIDADES
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">Linha de Produção, Instalações e Pareceres CEMIG</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold">
              <span className="text-slate-200">{filteredAtividades.length} Ativas</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400">{totalPriority} Prioritárias</span>
              <span className="text-slate-600">|</span>
              <span className="text-red-400">{totalUrgent} Parecer CEMIG</span>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono tracking-wider text-slate-200">
              Página {currentPage + 1} de {totalPages}
            </div>

            {tvModeSelection === "HYBRID" && (
              <button
                onClick={() => {
                  setActiveTvScreen("usinas");
                  setTvSecondsRemaining(tvTempoUsinas);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Ir para o painel de usinas"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Ver Usinas</span>
              </button>
            )}

            <button
              onClick={switchTvCycleMode}
              className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Alternar modo da TV"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#E45318]" />
              {tvModeSelection === "HYBRID" ? "Ciclo Híbrido" : tvModeSelection === "TV_ATIVIDADES" ? "TV Só Atividades" : "TV Só Usinas"}
            </button>

            <button
              onClick={() => toggleTvMode()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-900/60 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Sair do Modo TV"
            >
              <Activity className="w-3.5 h-3.5 text-[#00B356]" />
              <span className="hidden sm:inline">Sair da TV</span>
            </button>
          </div>
        </div>

        {/* ── TABELA DE ATIVIDADES NOC (DARK MODE DE ALTO CONTRASTE) ──── */}
        <div 
          className="flex-1 bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between min-h-0"
          style={{
            flex: 1,
            backgroundColor: "#0D213F",
            border: "1px solid #1E293B",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 0
          }}
        >
          <div className="overflow-y-auto flex-1" style={{ flex: 1, overflowY: "auto" }}>
            <table className="w-full border-collapse text-left text-sm table-fixed" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
              <thead 
                className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider sticky top-0 z-10 backdrop-blur-md"
                style={{ backgroundColor: "#071224", borderBottom: "1px solid #1E293B", color: "#94A3B8" }}
              >
                <tr>
                  <th className="p-3.5 w-1/3" style={{ padding: "12px 14px", width: "33%" }}>Cliente / Instalação</th>
                  <th className="p-3.5 w-36" style={{ padding: "12px 14px", width: "15%" }}>Dias para Montar</th>
                  <th className="p-3.5" style={{ padding: "12px 14px" }}>Observações</th>
                  <th className="p-3.5 w-36" style={{ padding: "12px 14px", width: "15%" }}>Venc. Parecer</th>
                  <th className="p-3.5 w-36" style={{ padding: "12px 14px", width: "15%" }}>Prev. Instalação</th>
                  <th className="p-3.5 w-32 text-center" style={{ padding: "12px 14px", width: "10%", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {currentSlice.map((atv: any) => {
                  const isUrgentParecer = atv.daysParecer !== null && atv.daysParecer <= settings.limiteParecer;
                  const isLate = atv.daysPrev !== null && atv.daysPrev < 0;

                  // Borda lateral e destaque por criticidade
                  let rowBorderClass = "border-l-4 border-l-slate-700 hover:bg-slate-800/50";
                  if (atv.prioridade) {
                    rowBorderClass = "border-l-4 border-l-amber-400 bg-amber-950/10 hover:bg-amber-950/20";
                  } else if (atv.atividadeExtra) {
                    rowBorderClass = "border-l-4 border-l-[#E45318] bg-orange-950/10 hover:bg-orange-950/20";
                  } else if (isUrgentParecer) {
                    rowBorderClass = "border-l-4 border-l-red-500 bg-red-950/25 hover:bg-red-950/35 animate-pulse";
                  } else if (isLate) {
                    rowBorderClass = "border-l-4 border-l-red-500/80 bg-red-950/10 hover:bg-red-950/20";
                  } else if (atv.daysPrev !== null && atv.daysPrev >= settings.limiteVerde) {
                    rowBorderClass = "border-l-4 border-l-emerald-500 hover:bg-slate-800/50";
                  } else if (atv.daysPrev !== null && atv.daysPrev >= settings.limiteAmarelo) {
                    rowBorderClass = "border-l-4 border-l-amber-500 hover:bg-slate-800/50";
                  }

                  // Badge de prazo (Dias para Montar)
                  let badgePrazoClass = "bg-slate-800 text-slate-300 border-slate-700";
                  if (atv.daysPrev !== null) {
                    if (atv.daysPrev >= settings.limiteVerde) {
                      badgePrazoClass = "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40";
                    } else if (atv.daysPrev >= settings.limiteAmarelo) {
                      badgePrazoClass = "bg-amber-950/80 text-amber-400 border border-amber-500/40";
                    } else {
                      badgePrazoClass = "bg-red-950/80 text-red-400 border border-red-500/40";
                    }
                  }

                  return (
                    <tr key={atv.id} className={`h-14 transition-colors ${rowBorderClass}`}>
                      {/* Cliente / Instalação */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          {isUrgentParecer ? (
                            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                          ) : atv.prioridade ? (
                            <span className="text-amber-400 text-xs shrink-0">⭐</span>
                          ) : atv.atividadeExtra ? (
                            <span className="text-[#E45318] text-xs shrink-0">⚡</span>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#00B356] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-white text-sm block truncate" title={atv.instalacao}>
                              {atv.instalacao || "N/A"}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                              {atv.cidade && <span>{atv.cidade} •</span>}
                              <span>Vendedor: {atv.vendedor || "Não informado"}</span>
                              {atv.prioridade && (
                                <span className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                  PRIORIDADE
                                </span>
                              )}
                              {atv.atividadeExtra && (
                                <span className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-[#E45318]/20 text-[#E45318] border border-[#E45318]/30">
                                  EXTRA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dias para Montar */}
                      <td className="p-3.5">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black tracking-tight ${badgePrazoClass}`}>
                          {atv.daysPrev !== null ? `${atv.daysPrev} dias` : "-"}
                        </span>
                      </td>

                      {/* Observações */}
                      <td className="p-3.5">
                        <span className="text-xs text-slate-200 block truncate" title={atv.obsInstalacao || ""}>
                          {atv.obsInstalacao || "-"}
                        </span>
                      </td>

                      {/* Vencimento Parecer CEMIG */}
                      <td className="p-3.5">
                        {isUrgentParecer ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-red-300 bg-red-950/80 border border-red-500/50 px-2.5 py-1 rounded-lg animate-pulse">
                            ⚠️ {atv.vencimentoParecer} ({atv.daysParecer}d)
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-300">
                            {atv.vencimentoParecer || "-"}
                          </span>
                        )}
                      </td>

                      {/* Previsão de Instalação */}
                      <td className="p-3.5">
                        <span className="text-xs font-semibold text-slate-300">
                          {atv.dataPrevista || atv.automaticoPrevInstala || "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {atv.status || "Pendente"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé da tabela da TV */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex justify-between items-center text-xs font-bold text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Página {currentPage + 1} de {totalPages}</span>
              <div className="flex gap-1.5 ml-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      currentPage === i ? "bg-[#00B356] scale-110" : "bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            {tvModeSelection === "HYBRID" ? (
              <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Clock className="w-3.5 h-3.5 text-[#00B356]" />
                {currentPage < totalPages - 1
                  ? `Próxima página em ${tvSecondsRemaining}s`
                  : `Transitando para Usinas em ${tvSecondsRemaining}s`}
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">Modo TV 1: Exclusivo Atividades da Equipe</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MODO NORMAL: APLICAÇÃO WEB (TABELA CLEAN EXCLUSIVA) ───────────────────
  return (
    <div className="space-y-4">
      {/* ── Barra Superior de Filtros & Ações ──────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Busca */}
        <div className="relative flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Buscar por cliente, observação, vendedor ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B356] placeholder:text-slate-400"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1 0 4.5 4.5a7.5 7.5 0 0 0 12.15 12.15z" />
          </svg>
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              ✕
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B356] text-slate-700 min-w-[160px]"
        >
          <option value="__ALL__">Todos os Status</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Botão de Ativação do Modo TV */}
        <button
          type="button"
          onClick={() => toggleTvMode("HYBRID")}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-[#0A192F] hover:bg-slate-800 rounded-xl shadow-md transition-all cursor-pointer shrink-0"
        >
          <Tv className="w-4 h-4 text-[#00B356]" />
          Modo TV (NOC)
        </button>
      </div>

      {/* ── Pílulas Rápidas de Filtragem ───────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
        <button
          onClick={() => setPillFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            pillFilter === "ALL"
              ? "bg-[#0A192F] text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Todas ({atividades.length})
        </button>

        {totalUrgent > 0 && (
          <button
            onClick={() => setPillFilter(pillFilter === "URGENT" ? "ALL" : "URGENT")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              pillFilter === "URGENT"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Parecer CEMIG ({totalUrgent})
          </button>
        )}

        {totalPriority > 0 && (
          <button
            onClick={() => setPillFilter(pillFilter === "PRIORITY" ? "ALL" : "PRIORITY")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              pillFilter === "PRIORITY"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
            }`}
          >
            ⭐ Prioritárias ({totalPriority})
          </button>
        )}

        {totalExtra > 0 && (
          <button
            onClick={() => setPillFilter(pillFilter === "EXTRA" ? "ALL" : "EXTRA")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              pillFilter === "EXTRA"
                ? "bg-[#E45318] text-white shadow-sm"
                : "bg-orange-50 text-[#E45318] border border-orange-200 hover:bg-orange-100"
            }`}
          >
            ⚡ Extras ({totalExtra})
          </button>
        )}

        {totalLate > 0 && (
          <button
            onClick={() => setPillFilter(pillFilter === "LATE" ? "ALL" : "LATE")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              pillFilter === "LATE"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            ⚠️ Atrasadas ({totalLate})
          </button>
        )}
      </div>

      {/* Estado Vazio */}
      {filteredAtividades.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">Nenhuma atividade encontrada com os filtros selecionados.</p>
          <button
            onClick={() => { setSearch(""); setStatusFilter("__ALL__"); setPillFilter("ALL"); }}
            className="mt-3 text-xs font-bold text-[#E45318] hover:underline"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* ── TABELA CLEAN DE ATIVIDADES (MODO EXCLUSIVO E MODERNO) ───────── */}
      {filteredAtividades.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-1/4">Cliente / Instalação</th>
                <th className="p-3.5 w-36">Dias para Montar</th>
                <th className="p-3.5">Observações</th>
                <th className="p-3.5 w-32">Venc. Parecer</th>
                <th className="p-3.5 w-36">Previsão</th>
                <th className="p-3.5 w-32">Status</th>
                <th className="p-3.5 w-28 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredAtividades.map((atv: any) => {
                const isUrgentParecer = atv.daysParecer !== null && atv.daysParecer <= settings.limiteParecer;
                const isExpanded = expandedRow === atv.id;
                const hasAttachments = (atv.anexoFotos && atv.anexoFotos.length > 0) || (atv.anexoArquivos && atv.anexoArquivos.length > 0);

                let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                if (atv.daysPrev !== null) {
                  if (atv.daysPrev >= settings.limiteVerde) badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  else if (atv.daysPrev >= settings.limiteAmarelo) badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                  else badgeColor = "bg-red-50 text-red-800 border-red-200";
                }

                return (
                  <React.Fragment key={atv.id}>
                    <tr className={`hover:bg-slate-50/80 transition-colors ${isUrgentParecer ? "bg-red-50/30" : ""}`}>
                      {/* Cliente / Instalação */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {isUrgentParecer && <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />}
                          <span className="truncate">{atv.instalacao || "N/A"}</span>
                          {atv.prioridade && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                              ⭐
                            </span>
                          )}
                          {atv.atividadeExtra && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-[#E45318] border border-orange-200 shrink-0">
                              ⚡
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block truncate">
                          {atv.cidade ? `${atv.cidade} • ` : ""}Vendedor: {atv.vendedor || "Não informado"}
                        </span>
                      </td>

                      {/* Dias para Montar */}
                      <td className="p-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${badgeColor}`}>
                          {atv.daysPrev !== null ? `${atv.daysPrev} dias` : "-"}
                        </span>
                      </td>

                      {/* Observações com botão de expandir */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-700 line-clamp-1 truncate">
                            {atv.obsInstalacao || "-"}
                          </span>
                          {(atv.obsInstalacao || hasAttachments) && (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : atv.id)}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 shrink-0 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Vencimento Parecer */}
                      <td className="p-3.5">
                        <span className={`text-xs font-semibold ${isUrgentParecer ? "text-red-600 font-bold" : "text-slate-700"}`}>
                          {atv.vencimentoParecer || "-"}
                        </span>
                      </td>

                      {/* Previsão */}
                      <td className="p-3.5 text-xs text-slate-700 font-medium">
                        {atv.dataPrevista || atv.automaticoPrevInstala || "-"}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                          {atv.status || "Pendente"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <TagToggler id={atv.id} prioridade={!!atv.prioridade} atividadeExtra={!!atv.atividadeExtra} isAdmin={isAdmin} />
                          {isAdmin && (
                            <Link
                              href={`/atividades/editar?id=${atv.id}`}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                              title="Editar atividade"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Linha expansível com detalhes e anexos */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="p-4 text-xs space-y-2 border-b border-slate-200">
                          {hasAttachments && (
                            <div className="mb-2">
                              <span className="font-bold text-slate-800 block mb-1">Anexos & Documentos:</span>
                              <div className="flex flex-wrap gap-2">
                                {atv.anexoFotos?.map((f: string, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => downloadFile(f, `anexo_foto_${idx + 1}`)}
                                    className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer"
                                  >
                                    <Paperclip className="w-3 h-3 text-[#E45318]" /> Foto {idx + 1}
                                  </button>
                                ))}
                                {atv.anexoArquivos?.map((a: string, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => downloadFile(a, `anexo_doc_${idx + 1}`)}
                                    className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer"
                                  >
                                    <Download className="w-3 h-3 text-[#00B356]" /> Doc {idx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <span className="font-bold text-slate-800 block mb-1">Observação Completa:</span>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap">
                              {atv.obsInstalacao || "Nenhuma observação registrada."}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
