"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Zap, Sun, TrendingUp, CheckCircle2, AlertTriangle, AlertOctagon, 
  Clock, RefreshCw, ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Activity
} from "lucide-react";

export interface UsinaEssentialKpi {
  id: string;
  nome: string;
  cidade: string;
  capacidadeKWp: number;
  potenciaAtualKW: number;
  potenciaCarregamentoPct: number;
  geracaoHojeKWh: number;
  pr: number;
  inversoresOnline: number;
  inversoresTotal: number;
  status: "ONLINE" | "ALERTA" | "OFFLINE";
  statusColor: "GREEN" | "YELLOW" | "RED";
  alarmesAtivosCount: number;
  ultimoAlarmeDesc?: string;
  ultimaAtualizacao: string;
}

interface TvUsinasViewProps {
  onBackToAtividades: () => void;
  isStandaloneTv?: boolean;
  prLimiteVerde?: number;
  prLimiteAmarelo?: number;
  tempoPorTela?: number; // Tempo de cada página de usina em segundos
  usinasPorTela?: number; // Padrão: 5
  onSwitchCycleMode?: () => void;
  onExitTv?: () => void;
  tvModeSelection?: "HYBRID" | "TV_ATIVIDADES" | "TV_USINAS";
}

export default function TvUsinasView({
  onBackToAtividades,
  isStandaloneTv = false,
  prLimiteVerde = 78,
  prLimiteAmarelo = 60,
  tempoPorTela = 20,
  usinasPorTela = 5,
  onSwitchCycleMode,
  onExitTv,
  tvModeSelection = "HYBRID",
}: TvUsinasViewProps) {
  const [usinas, setUsinas] = useState<UsinaEssentialKpi[]>([]);
  const [kpiTotal, setKpiTotal] = useState({
    potenciaTotalKW: 0,
    capacidadeTotalKWp: 0,
    geracaoTotalHojeKWh: 0,
    usinasTotal: 0,
    usinasGreen: 0,
    usinasYellow: 0,
    usinasRed: 0,
    prMedio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  // Paginação inteligente de Usinas para TV
  const [currentUsinaPage, setCurrentUsinaPage] = useState(0);
  const [pageSecondsRemaining, setPageSecondsRemaining] = useState<number>(tempoPorTela);

  // Relógio ao vivo
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTvKpis = async () => {
    try {
      const res = await fetch(
        `/api/solar/tv-kpis?prGreen=${prLimiteVerde}&prYellow=${prLimiteAmarelo}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success) {
        setUsinas(data.usinas || []);
        if (data.kpiTotal) {
          setKpiTotal(data.kpiTotal);
        }
      }
    } catch (err) {
      console.error("[TV USINAS] Erro ao carregar KPIs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTvKpis();
    const pollInterval = setInterval(fetchTvKpis, 10000);
    return () => clearInterval(pollInterval);
  }, [prLimiteVerde, prLimiteAmarelo]);

  // Cálculo de páginas
  const itemsPerPage = Math.max(3, usinasPorTela);
  const totalPages = Math.ceil(usinas.length / itemsPerPage) || 1;

  // Ajusta a página atual caso a lista diminua
  useEffect(() => {
    if (currentUsinaPage >= totalPages) {
      setCurrentUsinaPage(0);
    }
  }, [totalPages, currentUsinaPage]);

  // Reset do timer quando o tempo configurado mudar
  useEffect(() => {
    setPageSecondsRemaining(tempoPorTela);
  }, [tempoPorTela]);

  // Ciclo automático da TV para as Usinas
  useEffect(() => {
    const timer = setInterval(() => {
      setPageSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (currentUsinaPage < totalPages - 1) {
            setCurrentUsinaPage((p) => p + 1);
            return tempoPorTela;
          } else {
            setCurrentUsinaPage(0);
            if (!isStandaloneTv) {
              onBackToAtividades();
            }
            return tempoPorTela;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUsinaPage, totalPages, tempoPorTela, isStandaloneTv, onBackToAtividades]);

  // Usinas exibidas na página atual
  const paginatedUsinas = useMemo(() => {
    const start = currentUsinaPage * itemsPerPage;
    return usinas.slice(start, start + itemsPerPage);
  }, [usinas, currentUsinaPage, itemsPerPage]);

  const progressPct = tempoPorTela > 0 
    ? Math.max(0, Math.min(100, ((tempoPorTela - pageSecondsRemaining) / tempoPorTela) * 100)) 
    : 0;

  const handleNextPage = () => {
    setCurrentUsinaPage((p) => (p + 1) % totalPages);
    setPageSecondsRemaining(tempoPorTela);
  };

  const handlePrevPage = () => {
    setCurrentUsinaPage((p) => (p - 1 + totalPages) % totalPages);
    setPageSecondsRemaining(tempoPorTela);
  };

  return (
    <div 
      className="w-full h-full min-h-screen bg-[#0A192F] text-white flex flex-col justify-between p-3 sm:p-4 select-none overflow-hidden font-sans box-border"
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
      {/* ── Topo do Painel de TV NOC ──────────────────────────────────── */}
      <div 
        className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-2 shrink-0"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1E293B",
          paddingBottom: "12px",
          marginBottom: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div 
            style={{
              backgroundColor: "#E45318",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "13px",
              padding: "6px 14px",
              borderRadius: "8px",
              letterSpacing: "1px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
            }}
          >
            CORDEIRO ENERGIA
          </div>
          <div style={{ height: "24px", width: "1px", backgroundColor: "#334155" }} />
          <div>
            <h1 
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#FFFFFF",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Sun style={{ width: "20px", height: "20px", color: "#FBBF24" }} />
              NOC • MONITORAMENTO SOLAR FOTOVOLTAICO
            </h1>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "2px 0 0 0" }}>
              Telemetria e Desempenho Operacional em Tempo Real
            </p>
          </div>
        </div>

        {/* Status de Semáforo Rápido, Relógio e Ações */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#0D213F",
              border: "1px solid #1E293B",
              padding: "6px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            <span style={{ color: "#34D399", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981", display: "inline-block" }} /> 
              {kpiTotal.usinasGreen} Ideal
            </span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ color: "#FBBF24", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#F59E0B", display: "inline-block" }} /> 
              {kpiTotal.usinasYellow} Atenção
            </span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ color: "#F87171", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#EF4444", display: "inline-block" }} /> 
              {kpiTotal.usinasRed} Crítico
            </span>
          </div>

          <div 
            style={{
              backgroundColor: "rgba(6, 78, 59, 0.6)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34D399",
              padding: "6px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#34D399", display: "inline-block" }} />
            AO VIVO
          </div>

          <div 
            style={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              color: "#E2E8F0",
              padding: "6px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "1px"
            }}
          >
            {currentTime || "--:--:--"}
          </div>

          {!isStandaloneTv && (
            <button
              onClick={onBackToAtividades}
              style={{
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                color: "#00B356",
                padding: "6px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer"
              }}
              title="Voltar para Atividades"
            >
              <ArrowLeft style={{ width: "14px", height: "14px" }} />
              Atividades
            </button>
          )}

          {onSwitchCycleMode && (
            <button
              onClick={onSwitchCycleMode}
              style={{
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                color: "#E2E8F0",
                padding: "6px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer"
              }}
              title="Alternar ciclo da TV"
            >
              <RotateCcw style={{ width: "14px", height: "14px", color: "#E45318" }} />
              {tvModeSelection === "HYBRID" ? "Ciclo Híbrido" : tvModeSelection === "TV_USINAS" ? "TV Só Usinas" : "TV Só Atividades"}
            </button>
          )}

          {onExitTv && (
            <button
              onClick={onExitTv}
              style={{
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                color: "#CBD5E1",
                padding: "6px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer"
              }}
              title="Sair do Modo TV"
            >
              <Activity style={{ width: "14px", height: "14px", color: "#00B356" }} />
              Sair da TV
            </button>
          )}
        </div>
      </div>

      {/* ── Faixa de 4 KPIs Globais no Topo ─────────────────────────────── */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginBottom: "10px"
        }}
      >
        {/* Potência Total Instantânea */}
        <div 
          style={{
            backgroundColor: "#0D213F",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div 
            style={{
              padding: "8px",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              color: "#F59E0B",
              borderRadius: "10px"
            }}
          >
            <Zap style={{ width: "20px", height: "20px" }} />
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              Potência Total Instantânea
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#F59E0B" }}>
                {kpiTotal.potenciaTotalKW.toLocaleString("pt-BR")}
              </span>
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "bold" }}>kW</span>
            </div>
            <span style={{ fontSize: "10px", color: "#64748B", display: "block" }}>
              de {kpiTotal.capacidadeTotalKWp.toLocaleString("pt-BR")} kWp instalados
            </span>
          </div>
        </div>

        {/* Geração Acumulada Hoje */}
        <div 
          style={{
            backgroundColor: "#0D213F",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div 
            style={{
              padding: "8px",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              color: "#10B981",
              borderRadius: "10px"
            }}
          >
            <TrendingUp style={{ width: "20px", height: "20px" }} />
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              Geração Total Hoje
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#10B981" }}>
                {kpiTotal.geracaoTotalHojeKWh.toLocaleString("pt-BR")}
              </span>
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "bold" }}>kWh</span>
            </div>
            <span style={{ fontSize: "10px", color: "#64748B", display: "block" }}>
              Energia limpa injetada
            </span>
          </div>
        </div>

        {/* Performance Ratio Médio */}
        <div 
          style={{
            backgroundColor: "#0D213F",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div 
            style={{
              padding: "8px",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              color: "#3B82F6",
              borderRadius: "10px"
            }}
          >
            <Sun style={{ width: "20px", height: "20px" }} />
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              Performance Ratio Médio
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#60A5FA" }}>
                {kpiTotal.prMedio}%
              </span>
            </div>
            <span style={{ fontSize: "10px", color: "#64748B", display: "block" }}>
              Eficiência global do parque
            </span>
          </div>
        </div>

        {/* Parque Solar */}
        <div 
          style={{
            backgroundColor: "#0D213F",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div 
            style={{
              padding: "8px",
              backgroundColor: "rgba(228, 83, 24, 0.1)",
              border: "1px solid rgba(228, 83, 24, 0.2)",
              color: "#E45318",
              borderRadius: "10px"
            }}
          >
            <CheckCircle2 style={{ width: "20px", height: "20px" }} />
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              Parque Solar
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#FFFFFF" }}>
                {kpiTotal.usinasTotal} Usinas
              </span>
            </div>
            <span style={{ fontSize: "10px", color: "#34D399", fontWeight: "bold", display: "block" }}>
              {kpiTotal.usinasGreen} em operação ideal
            </span>
          </div>
        </div>
      </div>

      {/* ── TABELA CLEAN DE USINAS SOLARES (COM ESTILOS INLINE ROBUSTOS) ─ */}
      <div 
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
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {loading && usinas.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
              <RefreshCw style={{ width: "32px", height: "32px", color: "#00B356" }} className="animate-spin" />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#94A3B8" }}>Sincronizando usinas fotovoltaicas...</span>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ backgroundColor: "#071224", borderBottom: "1px solid #1E293B", color: "#94A3B8", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
                  <th style={{ padding: "12px 16px", width: "30%" }}>Usina Fotovoltaica / Localização</th>
                  <th style={{ padding: "12px 16px", width: "15%" }}>1. Potência Atual</th>
                  <th style={{ padding: "12px 16px", width: "14%" }}>2. Geração Hoje</th>
                  <th style={{ padding: "12px 16px", width: "17%" }}>3. Performance (PR)</th>
                  <th style={{ padding: "12px 16px", width: "12%" }}>4. Inversores</th>
                  <th style={{ padding: "12px 16px", width: "12%", textAlign: "center" }}>Status Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsinas.map((usina) => {
                  const isRed = usina.statusColor === "RED";
                  const isYellow = usina.statusColor === "YELLOW";

                  const borderLeftColor = isRed ? "#EF4444" : isYellow ? "#F59E0B" : "#10B981";
                  const rowBg = isRed ? "rgba(127, 29, 29, 0.2)" : isYellow ? "rgba(120, 53, 15, 0.15)" : "transparent";

                  const badgeBg = isRed ? "#450a0a" : isYellow ? "#451a03" : "#022c22";
                  const badgeColor = isRed ? "#f87171" : isYellow ? "#fbbf24" : "#34d399";
                  const badgeBorder = isRed ? "1px solid rgba(239, 68, 68, 0.5)" : isYellow ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(16, 185, 129, 0.5)";

                  return (
                    <tr 
                      key={usina.id} 
                      style={{
                        height: "64px",
                        borderBottom: "1px solid #1E293B",
                        borderLeft: `4px solid ${borderLeftColor}`,
                        backgroundColor: rowBg
                      }}
                    >
                      {/* 1. Nome e Capacidade da Usina */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {isRed ? (
                            <AlertOctagon style={{ width: "18px", height: "18px", color: "#EF4444", flexShrink: 0 }} />
                          ) : isYellow ? (
                            <AlertTriangle style={{ width: "18px", height: "18px", color: "#F59E0B", flexShrink: 0 }} />
                          ) : (
                            <CheckCircle2 style={{ width: "18px", height: "18px", color: "#10B981", flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0, overflow: "hidden" }}>
                            <span 
                              style={{
                                fontWeight: 900,
                                color: "#FFFFFF",
                                fontSize: "14px",
                                display: "block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={usina.nome}
                            >
                              {usina.nome}
                            </span>
                            <span style={{ fontSize: "11px", color: "#94A3B8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              Capacidade: <strong style={{ color: "#E2E8F0" }}>{usina.capacidadeKWp} kWp</strong> • {usina.cidade}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Potência Atual (kW e %) */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 900, color: "#F59E0B", whiteSpace: "nowrap" }}>
                            {usina.potenciaAtualKW}
                          </span>
                          <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "bold" }}>kW</span>
                          <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "4px", whiteSpace: "nowrap" }}>
                            ({usina.potenciaCarregamentoPct}%)
                          </span>
                        </div>
                      </td>

                      {/* 3. Geração Hoje (kWh) */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 900, color: "#10B981", whiteSpace: "nowrap" }}>
                            {usina.geracaoHojeKWh.toLocaleString("pt-BR")}
                          </span>
                          <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "bold" }}>kWh</span>
                        </div>
                      </td>

                      {/* 4. Performance Ratio (PR %) com Barra de Status */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px", fontWeight: 900 }}>
                          <span style={{ color: badgeColor, fontSize: "14px" }}>
                            {usina.pr}%
                          </span>
                          <span style={{ fontSize: "10px", color: "#94A3B8", fontWeight: "normal" }}>
                            Meta: ≥ {prLimiteVerde}%
                          </span>
                        </div>
                        <div style={{ width: "100%", backgroundColor: "#1E293B", borderRadius: "9999px", height: "6px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "6px",
                              borderRadius: "9999px",
                              backgroundColor: borderLeftColor,
                              width: `${Math.min(100, Math.max(5, usina.pr))}%`
                            }}
                          />
                        </div>
                      </td>

                      {/* 5. Inversores */}
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 900, whiteSpace: "nowrap", color: usina.inversoresOnline < usina.inversoresTotal ? "#F59E0B" : "#E2E8F0" }}>
                          {usina.inversoresOnline} / {usina.inversoresTotal} Online
                        </span>
                        {usina.ultimoAlarmeDesc && (
                          <span style={{ fontSize: "10px", color: "#F87171", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={usina.ultimoAlarmeDesc}>
                            ⚠️ {usina.ultimoAlarmeDesc}
                          </span>
                        )}
                      </td>

                      {/* 6. Status Semáforo */}
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        <span 
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: 900,
                            padding: "4px 12px",
                            borderRadius: "9999px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            whiteSpace: "nowrap",
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            border: badgeBorder
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: badgeColor }} />
                          {isRed ? "INTERVENÇÃO" : isYellow ? "ATENÇÃO" : "IDEAL"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Rodapé da Tabela NOC com Paginação Multi-Telas e Progresso ─ */}
        <div 
          style={{
            padding: "12px 16px",
            backgroundColor: "#071224",
            borderTop: "1px solid #1E293B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#94A3B8"
          }}
        >
          {/* Lado Esquerdo: Info de Página e Semáforo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div 
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#0D213F",
                border: "1px solid #1E293B",
                padding: "4px 10px",
                borderRadius: "8px"
              }}
            >
              <span style={{ fontWeight: "bold", color: "#FFFFFF" }}>
                Página {currentUsinaPage + 1} de {totalPages}
              </span>
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "6px" }}>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: currentUsinaPage === idx ? "#00B356" : "#334155",
                        transform: currentUsinaPage === idx ? "scale(1.2)" : "scale(1)"
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <span style={{ color: "#475569" }}>•</span>

            <span style={{ color: "#CBD5E1", fontWeight: 500 }}>
              Exibindo usinas {usinas.length > 0 ? currentUsinaPage * itemsPerPage + 1 : 0} a {Math.min((currentUsinaPage + 1) * itemsPerPage, usinas.length)} de {usinas.length}
            </span>

            <span style={{ color: "#475569" }}>•</span>

            <span style={{ fontSize: "11px", color: "#64748B" }}>
              Semáforo: Verde (≥{prLimiteVerde}%) | Amarelo (≥{prLimiteAmarelo}%) | Vermelho (&lt;{prLimiteAmarelo}%)
            </span>
          </div>

          {/* Lado Direito: Navegação Manual e Temporizador de Transição */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={handlePrevPage}
                  style={{
                    padding: "4px 6px",
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#CBD5E1",
                    cursor: "pointer"
                  }}
                  title="Página Anterior de Usinas"
                >
                  <ChevronLeft style={{ width: "16px", height: "16px" }} />
                </button>
                <button
                  onClick={handleNextPage}
                  style={{
                    padding: "4px 6px",
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#CBD5E1",
                    cursor: "pointer"
                  }}
                  title="Próxima Página de Usinas"
                >
                  <ChevronRight style={{ width: "16px", height: "16px" }} />
                </button>
              </div>
            )}

            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", color: "#00B356" }}>
              <Clock style={{ width: "14px", height: "14px" }} />
              {totalPages > 1 && currentUsinaPage < totalPages - 1
                ? `Próxima página em ${pageSecondsRemaining}s`
                : !isStandaloneTv
                ? `Retornando para Atividades em ${pageSecondsRemaining}s`
                : `Reiniciando ciclo em ${pageSecondsRemaining}s`}
            </span>

            <div style={{ width: "100px", backgroundColor: "#1E293B", borderRadius: "9999px", height: "6px", overflow: "hidden" }}>
              <div
                style={{
                  backgroundColor: "#00B356",
                  height: "100%",
                  width: `${progressPct}%`,
                  transition: "width 1s linear"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
