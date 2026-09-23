"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sun,
  Zap,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Search,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Activity,
  Calendar,
  AlertCircle,
  GitCompare,
  Wrench,
  CheckCircle,
  Clock,
  X,
  FileText,
} from "lucide-react";
import GraficoFusionSolarStyle, { PlantComparisonData } from "@/components/solar/GraficoFusionSolarStyle";
import ManualTelemetryModal from "@/components/solar/ManualTelemetryModal";

const COMPARISON_COLORS = [
  "#F59E0B", // Âmbar / Ouro
  "#10B981", // Esmeralda
  "#3B82F6", // Azul Royal
  "#8B5CF6", // Roxo
  "#EC4899", // Rosa vibrante
  "#06B6D4", // Ciano
  "#F97316", // Laranja
];

export default function TelemetriaSolarPage() {
  const [usinas, setUsinas] = useState<any[]>([]);
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>("consolidado");
  const [date, setDate] = useState<string>(() => {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  });
  const [periodo, setPeriodo] = useState<"DIA" | "MES" | "ANO">("DIA");

  const [telemetryData, setTelemetryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // Estados do Modo Comparativo Multi-Usinas
  const [isModoComparativo, setIsModoComparativo] = useState<boolean>(false);
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  const [comparativoData, setComparativoData] = useState<PlantComparisonData[]>([]);
  const [loadingComparativo, setLoadingComparativo] = useState<boolean>(false);

  // Estados do Modal de Auto-Cura de Gaps
  const [isGapModalOpen, setIsGapModalOpen] = useState<boolean>(false);
  const [gapScanData, setGapScanData] = useState<any>(null);
  const [scanningGaps, setScanningGaps] = useState<boolean>(false);
  const [healingGaps, setHealingGaps] = useState<boolean>(false);

  // Estados do Modal de Auditoria
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Carregar lista de usinas
  const fetchUsinas = async () => {
    try {
      const res = await fetch("/api/solar/usinas");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsinas(data);
        if (data.length > 0 && selectedComparisonIds.length === 0) {
          // Pré-seleciona as duas primeiras usinas para o comparativo
          setSelectedComparisonIds(data.slice(0, 3).map((u) => u.id));
        }
      }
    } catch (err) {
      console.error("Erro ao carregar usinas:", err);
    }
  };

  useEffect(() => {
    fetchUsinas();
  }, []);

  // Carregar dados de telemetria individual ou consolidada
  const fetchTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        usinaId: selectedUsinaId,
        date: date,
        periodo: periodo,
        t: Date.now().toString(),
      });

      const res = await fetch(`/api/solar/telemetria/alta-fidelidade?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTelemetryData(data);
      } else {
        console.warn("Falha ao carregar telemetria:", data.error);
      }
    } catch (err) {
      console.error("Erro ao buscar telemetria de alta fidelidade:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedUsinaId, date, periodo]);

  useEffect(() => {
    if (!isModoComparativo) {
      fetchTelemetry();
    }
  }, [fetchTelemetry, isModoComparativo]);

  // Carregar dados do modo comparativo quando ativo
  const fetchComparativoTelemetry = useCallback(async () => {
    if (!isModoComparativo || selectedComparisonIds.length === 0) return;
    setLoadingComparativo(true);
    try {
      const results = await Promise.all(
        selectedComparisonIds.map(async (uId, idx) => {
          const res = await fetch(
            `/api/solar/telemetria/alta-fidelidade?usinaId=${uId}&date=${date}&periodo=DIA&t=${Date.now()}`
          );
          const d = await res.json();
          const uObj = usinas.find((u) => u.id === uId);
          return {
            usinaId: uId,
            usinaNome: uObj?.nome || `Usina ${idx + 1}`,
            capacidadeKWp: uObj?.capacidadeKWp || 1000,
            cor: COMPARISON_COLORS[idx % COMPARISON_COLORS.length],
            serie: d.serieDiaria || [],
          };
        })
      );
      setComparativoData(results);
    } catch (err) {
      console.error("Erro ao carregar dados comparativos:", err);
    } finally {
      setLoadingComparativo(false);
    }
  }, [isModoComparativo, selectedComparisonIds, date, usinas]);

  useEffect(() => {
    if (isModoComparativo) {
      fetchComparativoTelemetry();
    }
  }, [fetchComparativoTelemetry, isModoComparativo]);

  // Sincronização ao vivo sob demanda
  const handleLiveSync = async () => {
    setSyncing(true);
    setStatusMessage({ text: "Sincronizando telemetria com as nuvens Huawei, Solis e Hoymiles...", type: "info" });
    try {
      const res = await fetch("/api/solar/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: "✓ Telemetria sincronizada com sucesso das plataformas oficiais!", type: "success" });
        if (isModoComparativo) {
          await fetchComparativoTelemetry();
        } else {
          await fetchTelemetry();
        }
      } else {
        setStatusMessage({ text: "Aviso: Sincronização concluída com avisos.", type: "info" });
      }
    } catch (err) {
      setStatusMessage({ text: "Erro ao comunicar com o coordenador de sincronização.", type: "error" });
    } finally {
      setSyncing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Abrir e verificar gaps da usina atual
  const handleOpenGapModal = async () => {
    const targetUsinaId = selectedUsinaId === "consolidado" ? usinas[0]?.id : selectedUsinaId;
    if (!targetUsinaId) return;

    setIsGapModalOpen(true);
    setScanningGaps(true);
    try {
      const res = await fetch(`/api/solar/telemetria/gap-recovery?usinaId=${targetUsinaId}&date=${date}`);
      const data = await res.json();
      if (data.success) {
        setGapScanData(data.scan);
      }
    } catch (err) {
      console.error("Erro ao escanear gaps:", err);
    } finally {
      setScanningGaps(false);
    }
  };

  // Executar auto-cura de gaps
  const handleExecuteHealing = async () => {
    if (!gapScanData?.usinaId) return;
    setHealingGaps(true);
    try {
      const res = await fetch(`/api/solar/telemetria/gap-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usinaId: gapScanData.usinaId, date }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.mensagem || "✓ Auto-cura de gaps executada com sucesso!", type: "success" });
        setGapScanData(data.scanAtual || data.scan);
        fetchTelemetry();
      } else {
        setStatusMessage({ text: data.error || "Aviso durante auto-cura.", type: "info" });
      }
    } catch (err) {
      setStatusMessage({ text: "Erro ao executar processo de auto-cura.", type: "error" });
    } finally {
      setHealingGaps(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  // Abrir trilha de auditoria
  const handleOpenAuditModal = async () => {
    setIsAuditModalOpen(true);
    setLoadingAudit(true);
    try {
      const targetUsinaId = selectedUsinaId !== "consolidado" ? selectedUsinaId : undefined;
      const url = targetUsinaId
        ? `/api/solar/telemetria/auditoria?usinaId=${targetUsinaId}&limit=50`
        : `/api/solar/telemetria/auditoria?limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.registros || []);
      }
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Usinas filtradas para a barra de seleção rápida
  const filteredUsinas = usinas.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.apiFornecedor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUsinaObj = usinas.find((u) => u.id === selectedUsinaId);
  const usinaNomeAtual =
    selectedUsinaId === "consolidado"
      ? "Todas as Usinas (Consolidado)"
      : selectedUsinaObj?.nome || "Usina Solar";

  const capacidadeKWpAtual =
    selectedUsinaId === "consolidado"
      ? usinas.reduce((acc, u) => acc + (u.capacidadeKWp || 0), 0)
      : selectedUsinaObj?.capacidadeKWp || 1000;

  const toggleUsinaComparativo = (uId: string) => {
    setSelectedComparisonIds((prev) => {
      if (prev.includes(uId)) {
        if (prev.length <= 1) return prev; // Mantém pelo menos 1
        return prev.filter((id) => id !== uId);
      } else {
        if (prev.length >= 6) return prev; // Limite de 6
        return [...prev, uId];
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* ── HEADER PRINCIPAL ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
              Telemetria & Monitoramento Fotovoltaico
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Supervisório de alta fidelidade em tempo real com Proteção Criptográfica AES-256 e Circuit Breaker
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Modo Comparativo */}
          <button
            onClick={() => setIsModoComparativo(!isModoComparativo)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-sm ${
              isModoComparativo
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20"
                : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
            title="Comparar múltiplas usinas na mesma escala normalizada (kW/kWp)"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{isModoComparativo ? "Modo Comparativo Ativo" : "Comparar Usinas"}</span>
          </button>

          {/* Auto-Cura de Gaps */}
          <button
            onClick={handleOpenGapModal}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-200 transition flex items-center gap-2 shadow-sm"
            title="Escanear e reparar lacunas temporais sem dados"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Cura de Gaps</span>
          </button>

          {/* Trilha de Auditoria */}
          <button
            onClick={handleOpenAuditModal}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition flex items-center gap-2 shadow-sm"
            title="Ver histórico de importações manuais e sincronizações"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auditoria</span>
          </button>

          {/* Sincronização ao Vivo */}
          <button
            onClick={handleLiveSync}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-850 text-slate-200 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Sincronizando..." : "Sincronizar APIs"}</span>
          </button>

          {/* Importação Manual (Excel/CSV/Colar) */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar Planilha</span>
          </button>
        </div>
      </div>

      {/* Alerta de Status / Notificação */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : statusMessage.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-300"
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ── BARRA DE SELEÇÃO: MODO COMPARATIVO VS MODO INDIVIDUAL ── */}
      {isModoComparativo ? (
        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Selecione as usinas para comparar (até 6 simultâneas):
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {selectedComparisonIds.length} selecionada(s)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {usinas.map((u, idx) => {
              const isChecked = selectedComparisonIds.includes(u.id);
              const color = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUsinaComparativo(u.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ${
                    isChecked
                      ? "bg-slate-800 text-slate-100 border-amber-400 shadow-sm"
                      : "bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isChecked ? color : "#475569" }}
                  ></span>
                  <span>{u.nome}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({u.capacidadeKWp} kWp)</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Barra Padrão de Seleção de Usina Individual */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500">
              Selecione a Usina:
            </span>
            {usinas.length > 5 && (
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrar usinas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
            {/* Opção Consolidado */}
            <button
              onClick={() => setSelectedUsinaId("consolidado")}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                selectedUsinaId === "consolidado"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/10"
                  : "bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Consolidado Global</span>
            </button>

            {/* Usinas Individuais */}
            {filteredUsinas.map((u) => {
              const isSelected = selectedUsinaId === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUsinaId(u.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/10"
                      : "bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                  }`}
                >
                  <span className="font-bold">{u.nome}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected ? "bg-slate-950/20 text-slate-900 font-bold" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {u.apiFornecedor}
                  </span>
                  <span className="text-[11px] opacity-75">{u.capacidadeKWp} kWp</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COMPONENTE GRÁFICO FUSIONSOLAR / SOLISCLOUD STYLE ── */}
      <GraficoFusionSolarStyle
        date={date}
        onDateChange={setDate}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        usinaNome={usinaNomeAtual}
        capacidadeKWp={capacidadeKWpAtual}
        kpis={
          telemetryData?.kpis || {
            potenciaAtualKW: 0,
            energiaDiaKWh: 0,
            energiaOntemKWh: 0,
            comparativoOntemPct: 0,
            picoPotenciaKW: 0,
            horarioPico: "--:--",
            yieldKWhKWp: 0,
            horasSolPleno: 0,
            performanceRatioEst: 80,
            irradianciaAtualWM2: 0,
            inversoresStatus: { total: 1, online: 1, standby: 0, alarme: 0 },
          }
        }
        serieDiaria={telemetryData?.serieDiaria || []}
        serieMensal={telemetryData?.serieMensal || []}
        serieAnual={telemetryData?.serieAnual || []}
        stringsTimelinePorInversor={telemetryData?.stringsTimelinePorInversor || {}}
        inversoresDisponiveisParaStrings={telemetryData?.inversoresDisponiveisParaStrings || []}
        inversoresCadastrados={telemetryData?.inversores || []}
        comparativoUsinas={comparativoData}
        isModoComparativo={isModoComparativo}
        loading={isModoComparativo ? loadingComparativo : loading}
      />

      {/* ── MODAL DE AUTO-CURA DE GAPS ── */}
      {isGapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Auto-Cura de Gaps de Telemetria</h3>
              </div>
              <button
                onClick={() => setIsGapModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {scanningGaps ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs">Varrendo linha temporal das 06:00 às 18:00 (Brasília)...</p>
              </div>
            ) : gapScanData ? (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Usina Inspecionada:</span>
                    <span className="font-bold text-slate-200">{gapScanData.usinaNome}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Data de Medição:</span>
                    <span className="font-semibold text-slate-300">{gapScanData.data}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Pontos Encontrados / Esperados:</span>
                    <span className="font-mono text-slate-200">
                      {gapScanData.totalPontosEncontrados} / {gapScanData.pontosEsperados} ({gapScanData.coberturaPct}%)
                    </span>
                  </div>
                </div>

                {gapScanData.gaps.length === 0 ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Telemetria Íntegra!</p>
                      <p className="text-[11px] opacity-90">
                        Nenhuma lacuna superior a 15 minutos foi detectada no período solar.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-amber-400">
                      Lacunas Detectadas ({gapScanData.gaps.length}):
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {gapScanData.gaps.map((g: any, i: number) => (
                        <div
                          key={i}
                          className="bg-slate-950 border border-amber-500/20 rounded-xl p-2.5 text-xs flex justify-between items-center"
                        >
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            {g.startHoraStr} às {g.endHoraStr}
                          </span>
                          <span className="text-amber-400 font-mono font-bold">
                            {g.durationMinutes} minutos sem dados
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setIsGapModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300"
                  >
                    Fechar
                  </button>
                  {gapScanData.gaps.length > 0 && (
                    <button
                      onClick={handleExecuteHealing}
                      disabled={healingGaps}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Wrench className={`w-3.5 h-3.5 ${healingGaps ? "animate-spin" : ""}`} />
                      <span>{healingGaps ? "Recuperando..." : "Executar Auto-Cura Retroativa"}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── MODAL DE TRILHA DE AUDITORIA ── */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">Trilha de Auditoria da Telemetria</h3>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingAudit ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs">Carregando logs de auditoria transacional...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">Nenhum registro de auditoria encontrado.</p>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Data/Hora</th>
                      <th className="py-2.5 px-3">Usina</th>
                      <th className="py-2.5 px-3">Ação</th>
                      <th className="py-2.5 px-3">Ref.</th>
                      <th className="py-2.5 px-3">Pontos</th>
                      <th className="py-2.5 px-3">Pico kW</th>
                      <th className="py-2.5 px-3">Origem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2 px-3 text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-200">{log.usinaNome}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.tipoAcao === "IMPORTACAO_MANUAL"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : log.tipoAcao === "BACKFILL_GAP"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {log.tipoAcao}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">{log.dataReferencia || "--"}</td>
                        <td className="py-2 px-3 font-bold text-slate-100">{log.totalPontos}</td>
                        <td className="py-2 px-3 font-mono">{log.picoPotenciaKW ? `${log.picoPotenciaKW} kW` : "--"}</td>
                        <td className="py-2 px-3 text-[10px] text-slate-400 truncate max-w-[120px]">
                          {log.nomeArquivo || log.usuarioEmail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE IMPORTAÇÃO MANUAL (Excel / CSV / Colar) ── */}
      <ManualTelemetryModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          setStatusMessage({ text: "✓ Planilha de telemetria importada com sucesso!", type: "success" });
          fetchTelemetry();
          setTimeout(() => setStatusMessage(null), 5000);
        }}
        defaultUsinaId={selectedUsinaId !== "consolidado" ? selectedUsinaId : usinas[0]?.id}
        usinasList={usinas.map((u) => ({ id: u.id, nome: u.nome, apiFornecedor: u.apiFornecedor }))}
      />
    </div>
  );
}
