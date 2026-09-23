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
} from "lucide-react";
import GraficoFusionSolarStyle from "@/components/solar/GraficoFusionSolarStyle";
import ManualTelemetryModal from "@/components/solar/ManualTelemetryModal";

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

  // Carregar lista de usinas
  const fetchUsinas = async () => {
    try {
      const res = await fetch("/api/solar/usinas");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsinas(data);
      }
    } catch (err) {
      console.error("Erro ao carregar usinas:", err);
    }
  };

  useEffect(() => {
    fetchUsinas();
  }, []);

  // Carregar dados de telemetria de alta fidelidade
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
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Sincronização ao vivo sob demanda
  const handleLiveSync = async () => {
    setSyncing(true);
    setStatusMessage({ text: "Sincronizando telemetria com as nuvens Huawei, Solis e Hoymiles...", type: "info" });
    try {
      const res = await fetch("/api/solar/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: "✓ Telemetria sincronizada com sucesso das plataformas oficiais!", type: "success" });
        await fetchTelemetry();
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

  // Usinas filtradas para a barra de seleção rápida
  const filteredUsinas = usinas.filter(u =>
    u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.apiFornecedor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUsinaObj = usinas.find(u => u.id === selectedUsinaId);
  const usinaNomeAtual = selectedUsinaId === "consolidado"
    ? "Todas as Usinas (Consolidado)"
    : (selectedUsinaObj?.nome || "Usina Solar");

  const capacidadeKWpAtual = selectedUsinaId === "consolidado"
    ? usinas.reduce((acc, u) => acc + (u.capacidadeKWp || 0), 0)
    : (selectedUsinaObj?.capacidadeKWp || 1000);

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
            Supervisório de alta fidelidade em tempo real (Huawei FusionSolar, SolisCloud, Hoymiles S-Miles Cloud)
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5">
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
            <span>Importar Planilha / Colar</span>
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

      {/* ── BARRA HORIZONTAL DE SELEÇÃO DE USINA ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500">Selecione a Usina:</span>
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
          {filteredUsinas.map(u => {
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

      {/* ── COMPONENTE GRÁFICO FUSIONSOLAR / SOLISCLOUD STYLE ── */}
      <GraficoFusionSolarStyle
        date={date}
        onDateChange={setDate}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        usinaNome={usinaNomeAtual}
        capacidadeKWp={capacidadeKWpAtual}
        kpis={telemetryData?.kpis || {
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
        }}
        serieDiaria={telemetryData?.serieDiaria || []}
        serieMensal={telemetryData?.serieMensal || []}
        serieAnual={telemetryData?.serieAnual || []}
        stringsTimelinePorInversor={telemetryData?.stringsTimelinePorInversor || {}}
        inversoresDisponiveisParaStrings={telemetryData?.inversoresDisponiveisParaStrings || []}
        inversoresCadastrados={telemetryData?.inversores || []}
        loading={loading}
      />

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
        usinasList={usinas.map(u => ({ id: u.id, nome: u.nome, apiFornecedor: u.apiFornecedor }))}
      />
    </div>
  );
}
