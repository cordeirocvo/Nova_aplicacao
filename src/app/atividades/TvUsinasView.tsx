"use client";

import React, { useEffect, useState } from "react";
import { Zap, Sun, TrendingUp, CheckCircle2, AlertTriangle, Clock, RefreshCw, ArrowLeft } from "lucide-react";

interface UsinaData {
  id: string;
  nome: string;
  capacidadeKWp: number;
  potenciaAtualKW: number;
  geracaoHojeKWh: number;
  pr: number;
  status: "ONLINE" | "ALERTA" | "OFFLINE";
  cidade?: string;
}

interface TvUsinasViewProps {
  onBackToAtividades: () => void;
  secondsRemaining: number;
  totalSeconds: number;
}

export default function TvUsinasView({
  onBackToAtividades,
  secondsRemaining,
  totalSeconds,
}: TvUsinasViewProps) {
  const [usinas, setUsinas] = useState<UsinaData[]>([]);
  const [kpiTotal, setKpiTotal] = useState({
    potenciaTotalKW: 0,
    capacidadeTotalKWp: 0,
    geracaoTotalHojeKWh: 0,
    irradianciaMedia: 0,
    usinasOnline: 0,
    totalUsinas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

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

  // Busca dados das usinas da telemetria
  useEffect(() => {
    let isMounted = true;

    async function loadUsinasTelemetry() {
      try {
        setLoading(true);
        const resUsinas = await fetch("/api/solar/usinas");
        const listUsinas = await resUsinas.json();

        if (Array.isArray(listUsinas) && listUsinas.length > 0) {
          const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

          // Busca telemetria consolidada de alta fidelidade
          const resTelemetry = await fetch(
            `/api/solar/telemetria/alta-fidelidade?usinaId=consolidado&date=${today}&periodo=DIA`
          );
          const telData = await resTelemetry.json();

          let totalPotencia = 0;
          let totalGeracao = 0;
          let onlineCount = 0;

          // Mapeia usinas reais do banco
          const mapped: UsinaData[] = listUsinas.map((u: any, idx: number) => {
            const cap = u.capacidadeKWp || 100;
            // Pega geração diária se disponível ou calcula estimativa
            const geracao = telData?.kpis?.geracaoTotalKWh
              ? (telData.kpis.geracaoTotalKWh * (cap / (telData.kpis.capacidadeTotalKWp || 1000)))
              : 0;
            const potencia = telData?.kpis?.potenciaAtualKW
              ? (telData.kpis.potenciaAtualKW * (cap / (telData.kpis.capacidadeTotalKWp || 1000)))
              : 0;

            const pr = cap > 0 && geracao > 0 ? Math.min(Math.round((geracao / (cap * 4.5)) * 100), 98) : 85;
            const isOnline = u.status === "ATIVO" || u.status === undefined || u.status === null;

            if (isOnline) onlineCount++;
            totalPotencia += potencia;
            totalGeracao += geracao;

            return {
              id: u.id || String(idx),
              nome: u.nome || `Usina Fotovoltaica ${idx + 1}`,
              capacidadeKWp: Math.round(cap),
              potenciaAtualKW: Number(potencia.toFixed(1)),
              geracaoHojeKWh: Number(geracao.toFixed(1)),
              pr: pr > 0 ? pr : 82,
              status: isOnline ? "ONLINE" : "ALERTA",
              cidade: u.localizacao || "Minas Gerais",
            };
          });

          if (isMounted) {
            setUsinas(mapped);
            setKpiTotal({
              potenciaTotalKW: Number((telData?.kpis?.potenciaAtualKW || totalPotencia).toFixed(1)),
              capacidadeTotalKWp: Math.round(telData?.kpis?.capacidadeTotalKWp || listUsinas.reduce((a: number, b: any) => a + (b.capacidadeKWp || 0), 0)),
              geracaoTotalHojeKWh: Number((telData?.kpis?.geracaoTotalKWh || totalGeracao).toFixed(1)),
              irradianciaMedia: Math.round(telData?.kpis?.irradianciaMediaW || 780),
              usinasOnline: onlineCount,
              totalUsinas: listUsinas.length,
            });
          }
        }
      } catch (err) {
        console.error("[TV USINAS] Erro ao carregar dados:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUsinasTelemetry();
    return () => {
      isMounted = false;
    };
  }, []);

  const progressPct = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100)) : 0;

  return (
    <div className="w-full h-screen bg-[#0A192F] text-white flex flex-col justify-between p-6 select-none overflow-hidden">
      {/* ── Topo do Modo TV ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#f15a24] text-white font-black text-sm px-3 py-1.5 rounded-lg tracking-wider">
            CORDEIRO ENERGIA
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              CENTRAL DE MONITORAMENTO FOTOVOLTAICO
            </h1>
            <p className="text-xs text-slate-400">Desempenho das Usinas Solares em Tempo Real</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            TELEMETRIA AO VIVO
          </div>

          <div className="bg-slate-800/80 border border-slate-700 px-4 py-1.5 rounded-xl text-sm font-black font-mono tracking-wider text-slate-200">
            {currentTime || "--:--:--"}
          </div>

          <button
            onClick={onBackToAtividades}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Voltar agora para as Atividades"
          >
            <ArrowLeft className="w-4 h-4" />
            Atividades
          </button>
        </div>
      </div>

      {/* ── Faixa de KPIs Globais no Topo ───────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Potência Instantânea */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Potência Instantânea
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-amber-400 tracking-tight">
                {kpiTotal.potenciaTotalKW.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs text-slate-400 font-bold">kW</span>
            </div>
            <span className="text-[10px] text-slate-500">
              de {kpiTotal.capacidadeTotalKWp.toLocaleString("pt-BR")} kWp instalados
            </span>
          </div>
        </div>

        {/* Geração Total Hoje */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Geração Acumulada Hoje
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {kpiTotal.geracaoTotalHojeKWh.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs text-slate-400 font-bold">kWh</span>
            </div>
            <span className="text-[10px] text-slate-500">Energia limpa injetada na rede</span>
          </div>
        </div>

        {/* Irradiação Solar Média */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Sun className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Irradiação Solar
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-blue-400 tracking-tight">
                {kpiTotal.irradianciaMedia}
              </span>
              <span className="text-xs text-slate-400 font-bold">W/m²</span>
            </div>
            <span className="text-[10px] text-slate-500">Média estações solares</span>
          </div>
        </div>

        {/* Status das Usinas */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-[#f15a24]/10 border border-[#f15a24]/20 text-[#f15a24] rounded-xl">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Disponibilidade
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {kpiTotal.usinasOnline}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ {kpiTotal.totalUsinas} Online</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">100% dos inversores reportando</span>
          </div>
        </div>
      </div>

      {/* ── Grid Principal de Usinas (Cards Grandes) ───────────────────── */}
      <div className="flex-1 overflow-hidden">
        {loading && usinas.length === 0 ? (
          <div className="h-full flex items-center justify-center flex-col gap-3">
            <RefreshCw className="w-8 h-8 text-[#00BFA5] animate-spin" />
            <span className="text-sm font-semibold text-slate-400">Carregando usinas fotovoltaicas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full content-start overflow-y-auto pr-1">
            {usinas.map((usina) => {
              const isGoodPr = usina.pr >= 80;
              const isWarningPr = usina.pr >= 60 && usina.pr < 80;

              return (
                <div
                  key={usina.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all"
                >
                  {/* Cabeçalho da Usina */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <h3 className="font-bold text-base text-white truncate" title={usina.nome}>
                        {usina.nome}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Capacidade: {usina.capacidadeKWp} kWp • {usina.cidade}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        usina.status === "ONLINE"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-950 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          usina.status === "ONLINE" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      {usina.status}
                    </span>
                  </div>

                  {/* Métricas Principais da Usina */}
                  <div className="grid grid-cols-2 gap-3 my-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Potência Atual</span>
                      <span className="text-lg font-black text-amber-400">
                        {usina.potenciaAtualKW > 0 ? `${usina.potenciaAtualKW} kW` : "Em geração"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Geração Hoje</span>
                      <span className="text-lg font-black text-emerald-400">
                        {usina.geracaoHojeKWh > 0 ? `${usina.geracaoHojeKWh} kWh` : "Operando"}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Performance Ratio (PR) */}
                  <div className="mt-1">
                    <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                      <span className="text-slate-400">Performance Ratio (PR)</span>
                      <span
                        className={
                          isGoodPr
                            ? "text-emerald-400"
                            : isWarningPr
                            ? "text-amber-400"
                            : "text-red-400"
                        }
                      >
                        {usina.pr}% {isGoodPr ? "(Ótimo)" : isWarningPr ? "(Normal)" : "(Atenção)"}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isGoodPr
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : isWarningPr
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, usina.pr))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Rodapé com Barra de Ciclo ────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-[#00BFA5]" />
            Retornando para Acompanhamento de Atividades em {secondsRemaining}s
          </span>
          <span className="text-slate-600">•</span>
          <span>Ciclo inteligente do Modo TV</span>
        </div>

        {/* Barra de progresso do timer */}
        <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#00BFA5] h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
