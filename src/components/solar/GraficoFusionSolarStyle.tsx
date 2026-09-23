"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  SunMedium,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  Calendar,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Sliders,
  FileDown,
  GitCompare,
} from "lucide-react";
import { generateTelemetryPdf } from "@/lib/reports/telemetryPdfReport";

export interface TelemetryPoint5Min {
  hora: string;
  potenciaTotalKW: number;
  energiaAcumuladaKWh?: number;
  irradianciaWM2?: number;
  tempAmbiente?: number;
  tempModulos?: number;
  tensaoA?: number;
  tensaoB?: number;
  tensaoC?: number;
  inversores?: Record<string, number>;
}

export interface MensalPoint {
  dia: string;
  diaNumero: number;
  totalKWh: number;
  hsp?: number;
}

export interface AnualPoint {
  mes: string;
  mesNumero: number;
  geracaoMWh: number;
  geracaoAnoAnteriorMWh?: number;
}

export interface PlantComparisonData {
  usinaId: string;
  usinaNome: string;
  capacidadeKWp: number;
  cor: string;
  serie: TelemetryPoint5Min[];
}

interface Props {
  date: string; // "YYYY-MM-DD"
  onDateChange: (newDate: string) => void;
  periodo: "DIA" | "MES" | "ANO";
  onPeriodoChange: (p: "DIA" | "MES" | "ANO") => void;
  usinaNome: string;
  capacidadeKWp: number;
  kpis: {
    potenciaAtualKW: number;
    energiaDiaKWh: number;
    energiaOntemKWh: number;
    comparativoOntemPct: number;
    picoPotenciaKW: number;
    horarioPico: string;
    yieldKWhKWp: number;
    horasSolPleno: number;
    performanceRatioEst: number;
    irradianciaAtualWM2: number;
    inversoresStatus?: {
      total: number;
      online: number;
      standby: number;
      alarme: number;
    };
  };
  serieDiaria?: TelemetryPoint5Min[];
  serieMensal?: MensalPoint[];
  serieAnual?: AnualPoint[];
  stringsTimelinePorInversor?: Record<string, any[]>;
  inversoresDisponiveisParaStrings?: string[];
  inversoresCadastrados?: Array<{ id: string; numeroSerie: string; modelo?: string; potenciaNominalKW: number }>;
  comparativoUsinas?: PlantComparisonData[];
  isModoComparativo?: boolean;
  loading?: boolean;
}

// Paleta de cores oficial de inversores (estilo Huawei FusionSolar & Solis)
const INVERTER_COLORS = [
  "#3B82F6", // Azul royal
  "#10B981", // Esmeralda
  "#8B5CF6", // Roxo
  "#EC4899", // Rosa vibrante
  "#06B6D4", // Ciano
  "#F97316", // Laranja
  "#14B8A6", // Verde azulado
  "#6366F1", // Índigo
];

const STRING_COLORS = [
  "#38BDF8", "#34D399", "#A78BFA", "#F472B6", 
  "#FBBF24", "#FB923C", "#4ADE80", "#2DD4BF",
  "#818CF8", "#F87171", "#22D3EE", "#E879F9",
  "#60A5FA", "#A3E635", "#C084FC", "#FDA4AF",
  "#FCD34D", "#FDBA74", "#86EFAC", "#5EEAD4",
  "#A5B4FC", "#FCA5A5", "#67E8F9", "#F0ABFC"
];

export default function GraficoFusionSolarStyle({
  date,
  onDateChange,
  periodo,
  onPeriodoChange,
  usinaNome,
  capacidadeKWp,
  kpis,
  serieDiaria = [],
  serieMensal = [],
  serieAnual = [],
  stringsTimelinePorInversor = {},
  inversoresDisponiveisParaStrings = [],
  inversoresCadastrados = [],
  comparativoUsinas = [],
  isModoComparativo = false,
  loading = false,
}: Props) {
  // Controles de visibilidade de séries
  const [mostrarCurvaUsina, setMostrarCurvaUsina] = useState(true);
  const [mostrarInversores, setMostrarInversores] = useState(true);
  const [mostrarIrradiancia, setMostrarIrradiancia] = useState(true);
  const [inversoresVisiveis, setInversoresVisiveis] = useState<Record<string, boolean>>({});
  const [selectedInversorStrings, setSelectedInversorStrings] = useState<string>("");
  const [mostrarStringsSecao, setMostrarStringsSecao] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Controles de Comparativo Multi-Usinas
  const [normalizarComparativo, setNormalizarComparativo] = useState(true);
  const [usinasComparativoVisiveis, setUsinasComparativoVisiveis] = useState<Record<string, boolean>>({});

  // Dataset mesclado para o gráfico comparativo (288 baldes de 5 min)
  const dadosGraficoComparativo = useMemo(() => {
    if (!comparativoUsinas || comparativoUsinas.length === 0) return [];

    const baseHours = serieDiaria.length > 0
      ? serieDiaria.map(p => p.hora)
      : Array.from({ length: 288 }, (_, i) => {
          const m = i * 5;
          const hh = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          return `${hh}:${mm}`;
        });

    return baseHours.map(hora => {
      const row: Record<string, any> = { hora };
      comparativoUsinas.forEach(u => {
        const pt = u.serie.find(s => s.hora === hora);
        const pKW = pt?.potenciaTotalKW || 0;
        if (normalizarComparativo) {
          const yieldInst = u.capacidadeKWp > 0 ? pKW / u.capacidadeKWp : 0;
          row[u.usinaId] = parseFloat(yieldInst.toFixed(3));
        } else {
          row[u.usinaId] = parseFloat(pKW.toFixed(2));
        }
      });
      return row;
    });
  }, [comparativoUsinas, serieDiaria, normalizarComparativo]);

  // Lista única de seriais de inversores detectados nos dados ou cadastrados
  const listaInversores = useMemo(() => {
    const setInv = new Set<string>();
    inversoresCadastrados.forEach(i => setInv.add(i.numeroSerie));
    serieDiaria.forEach(p => {
      if (p.inversores) {
        Object.keys(p.inversores).forEach(k => setInv.add(k));
      }
    });
    return Array.from(setInv);
  }, [inversoresCadastrados, serieDiaria]);

  // Inversor padrão para strings
  const currentInversorForStrings = useMemo(() => {
    if (selectedInversorStrings && inversoresDisponiveisParaStrings.includes(selectedInversorStrings)) {
      return selectedInversorStrings;
    }
    return inversoresDisponiveisParaStrings[0] || listaInversores[0] || "";
  }, [selectedInversorStrings, inversoresDisponiveisParaStrings, listaInversores]);

  // Dados das strings para o inversor selecionado
  const dadosStringsDoInversor = useMemo(() => {
    if (!currentInversorForStrings) return [];
    return stringsTimelinePorInversor[currentInversorForStrings] || [];
  }, [currentInversorForStrings, stringsTimelinePorInversor]);

  // Lista de chaves de strings presentes no inversor selecionado
  const chavesStrings = useMemo(() => {
    const keys = new Set<string>();
    dadosStringsDoInversor.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== "hora") keys.add(k);
      });
    });
    return Array.from(keys).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
      return numA - numB;
    });
  }, [dadosStringsDoInversor]);

  // Formatação de data exibida (DD/MM/AAAA)
  const formattedDateBR = useMemo(() => {
    if (!date) return "";
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y}`;
  }, [date]);

  const handlePrevDay = () => {
    const d = new Date(`${date}T12:00:00-03:00`);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }));
  };

  const handleNextDay = () => {
    const d = new Date(`${date}T12:00:00-03:00`);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }));
  };

  const handleToday = () => {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    onDateChange(today);
  };

  const toggleInversorVisibility = (invSn: string) => {
    setInversoresVisiveis(prev => ({
      ...prev,
      [invSn]: prev[invSn] === undefined ? false : !prev[invSn]
    }));
  };

  const isInversorVisible = (invSn: string) => {
    return inversoresVisiveis[invSn] !== false;
  };

  // Escala dinâmica do eixo Y de potência (ajusta ao pico + margem)
  const maxPotY = useMemo(() => {
    const pico = Math.max(kpis.picoPotenciaKW, ...serieDiaria.map(p => p.potenciaTotalKW), 10);
    return Math.ceil(pico * 1.15);
  }, [kpis.picoPotenciaKW, serieDiaria]);

  return (
    <div className={`space-y-6 transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto" : ""}`}>
      {/* ── BARRA DE CONTROLE SUPERIOR (Estilo Huawei FusionSolar) ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Lado Esquerdo: Nome da Usina & Status de Comunicação */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <SunMedium className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 tracking-tight">{usinaNome}</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Em Operação
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Capacidade Instalada: <span className="text-slate-200 font-semibold">{capacidadeKWp.toLocaleString("pt-BR")} kWp</span>
              {kpis.inversoresStatus && (
                <span className="ml-2 text-slate-500">
                  • {kpis.inversoresStatus.total} {kpis.inversoresStatus.total === 1 ? "Inversor" : "Inversores"} ({kpis.inversoresStatus.online} Online)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Centro: Navegador de Data & Botões Rápido */}
        <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-xl p-1 shadow-inner">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            title="Dia Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{formattedDateBR}</span>
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            title="Próximo Dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="ml-2 px-2.5 py-1 text-[11px] font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition"
          >
            Hoje
          </button>
        </div>

        {/* Lado Direito: Seletor de Período (Dia / Mês / Ano) & Ações */}
        <div className="flex items-center gap-2">
          {/* Botão de Exportação PDF Executivo (1 Clique) */}
          <button
            onClick={() => {
              generateTelemetryPdf({
                usinaNome,
                capacidadeKWp,
                data: date,
                kpis,
                serieDiaria,
                inversoresCadastrados,
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition shadow-sm"
            title="Exportar Laudo Técnico Executivo em PDF (1 Clique)"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          <div className="flex bg-slate-950/80 border border-slate-800 rounded-xl p-1">
            {(["DIA", "MES", "ANO"] as const).map(p => (
              <button
                key={p}
                onClick={() => onPeriodoChange(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodo === p
                    ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {p === "DIA" ? "Dia" : p === "MES" ? "Mês" : "Ano"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── CARDS DE KPIS EXECUTIVOS (Estilo FusionSolar / Solis) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Potência Atual */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Potência Atual</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-100 tracking-tight">
              {kpis.potenciaAtualKW.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-semibold text-slate-400">kW</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Tempo Real (5 min)
          </div>
        </div>

        {/* 2. Energia do Dia */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Energia do Dia</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-100 tracking-tight">
              {kpis.energiaDiaKWh.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-semibold text-slate-400">kWh</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold">
            {kpis.comparativoOntemPct >= 0 ? (
              <span className="text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{kpis.comparativoOntemPct}% vs ontem
              </span>
            ) : (
              <span className="text-rose-400 flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {kpis.comparativoOntemPct}% vs ontem
              </span>
            )}
          </div>
        </div>

        {/* 3. Rendimento Específico (Yield) / HSP */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Yield Específico</span>
            <SunMedium className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-100 tracking-tight">
              {kpis.yieldKWhKWp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-400">kWh/kWp</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            HSP: <span className="text-slate-200 font-semibold">{kpis.horasSolPleno.toFixed(2)} h</span>
          </div>
        </div>

        {/* 4. Potência de Pico & Horário */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Potência Pico</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-100 tracking-tight">
              {kpis.picoPotenciaKW.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-semibold text-slate-400">kW</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-slate-500" /> Registrado às {kpis.horarioPico}
          </div>
        </div>

        {/* 5. Performance Ratio (PR) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-cyan-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Performance Ratio</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-cyan-400 tracking-tight">
              {kpis.performanceRatioEst.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            Geração vs. Irradiação
          </div>
        </div>

        {/* 6. Irradiância Solar Atual */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-amber-400/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Irradiância Atual</span>
            <SunMedium className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-100 tracking-tight">
              {kpis.irradianciaAtualWM2 > 0 ? kpis.irradianciaAtualWM2.toFixed(0) : "--"}
            </span>
            <span className="text-xs font-semibold text-slate-400">W/m²</span>
          </div>
          <div className="mt-2 text-[10px] text-amber-400/90 font-medium">
            Estação Solarimétrica
          </div>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL DO GRÁFICO (DIA / MÊS / ANO) ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
        {/* Cabeçalho do Gráfico: Controles de Camadas (Toggles) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">
              {isModoComparativo
                ? `Curva Comparativa Multi-Usinas (${comparativoUsinas.length} usinas selecionadas)`
                : periodo === "DIA"
                ? "Curva de Potência e Irradiância (24 Horas / 5 min)"
                : periodo === "MES"
                ? "Produção Diária do Mês (kWh/dia)"
                : "Produção Mensal do Ano (MWh/mês)"}
            </h3>
          </div>

          {isModoComparativo ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Normalização:</span>
              <button
                onClick={() => setNormalizarComparativo(!normalizarComparativo)}
                className={`px-3 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                  normalizarComparativo
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : "bg-blue-500/20 border-blue-500/50 text-blue-300"
                }`}
                title="Alterna entre Rendimento Específico proporcional (kW/kWp) e Potência Absoluta (kW)"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{normalizarComparativo ? "Yield Específico (kW/kWp)" : "Potência Absoluta (kW)"}</span>
              </button>
            </div>
          ) : periodo === "DIA" && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Toggle Curva Usina */}
              <button
                onClick={() => setMostrarCurvaUsina(!mostrarCurvaUsina)}
                className={`px-3 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                  mostrarCurvaUsina
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm"
                    : "bg-slate-800/40 border-slate-800 text-slate-500"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Usina Total</span>
                {mostrarCurvaUsina ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
              </button>

              {/* Toggle Inversores */}
              {listaInversores.length > 0 && (
                <button
                  onClick={() => setMostrarInversores(!mostrarInversores)}
                  className={`px-3 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                    mostrarInversores
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-sm"
                      : "bg-slate-800/40 border-slate-800 text-slate-500"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  <span>Inversores ({listaInversores.length})</span>
                  {mostrarInversores ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
                </button>
              )}

              {/* Toggle Irradiância */}
              <button
                onClick={() => setMostrarIrradiancia(!mostrarIrradiancia)}
                className={`px-3 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                  mostrarIrradiancia
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm"
                    : "bg-slate-800/40 border-slate-800 text-slate-500"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span>Irradiância (W/m²)</span>
                {mostrarIrradiancia ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
              </button>

              {/* Toggle Aba Strings CC */}
              {inversoresDisponiveisParaStrings.length > 0 && (
                <button
                  onClick={() => setMostrarStringsSecao(!mostrarStringsSecao)}
                  className={`px-3 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                    mostrarStringsSecao
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm font-semibold"
                      : "bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sliders className="w-3 h-3 text-purple-400" />
                  <span>Correntes das Strings CC</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sub-legenda Modo Comparativo */}
        {isModoComparativo && comparativoUsinas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Usinas Comparadas:</span>
            {comparativoUsinas.map((u) => {
              const visible = usinasComparativoVisiveis[u.usinaId] !== false;
              return (
                <button
                  key={u.usinaId}
                  onClick={() =>
                    setUsinasComparativoVisiveis((prev) => ({
                      ...prev,
                      [u.usinaId]: !visible,
                    }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-2 transition ${
                    visible
                      ? "bg-slate-800/80 text-slate-100 border-slate-700 shadow-sm"
                      : "bg-slate-900 text-slate-600 border-slate-850 opacity-40"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: visible ? u.cor : "#475569" }}></span>
                  <span>{u.usinaNome}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({u.capacidadeKWp} kWp)</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sub-legenda de Inversores Individuais (quando habilitado no modo individual) */}
        {!isModoComparativo && periodo === "DIA" && mostrarInversores && listaInversores.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Filtro por Inversor:</span>
            {listaInversores.map((invSn, idx) => {
              const color = INVERTER_COLORS[idx % INVERTER_COLORS.length];
              const visible = isInversorVisible(invSn);
              return (
                <button
                  key={invSn}
                  onClick={() => toggleInversorVisibility(invSn)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition ${
                    visible
                      ? "bg-slate-800/70 text-slate-200 border-slate-700 hover:bg-slate-800"
                      : "bg-slate-900 text-slate-600 border-slate-850 opacity-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: visible ? color : "#475569" }}></span>
                  <span>{invSn}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── GRÁFICO RECHARTS ── */}
        <div className="h-[420px] w-full pt-2">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium">Carregando telemetria de alta precisão...</p>
            </div>
          ) : isModoComparativo && comparativoUsinas.length > 0 ? (
            /* ── VISÃO COMPARATIVA MULTI-USINAS ── */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGraficoComparativo} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="hora" stroke="#64748B" fontSize={11} tickLine={false} interval={23} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  unit={normalizarComparativo ? " kW/kWp" : " kW"}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-slate-200">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              {label} (Comparativo)
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {normalizarComparativo ? "Yield Específico" : "Potência"}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {comparativoUsinas.map((u) => {
                              const val = payload.find((p) => p.dataKey === u.usinaId)?.value;
                              return (
                                <div key={u.usinaId} className="flex justify-between items-center text-xs">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.cor }}></span>
                                    <span className="font-medium truncate max-w-[130px]">{u.usinaNome}:</span>
                                  </span>
                                  <span className="font-bold text-slate-100 font-mono">
                                    {val !== undefined ? Number(val).toLocaleString("pt-BR") : "--"}{" "}
                                    {normalizarComparativo ? "kW/kWp" : "kW"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {comparativoUsinas.map((u) => {
                  if (usinasComparativoVisiveis[u.usinaId] === false) return null;
                  return (
                    <Area
                      key={u.usinaId}
                      type="monotone"
                      dataKey={u.usinaId}
                      name={u.usinaNome}
                      stroke={u.cor}
                      strokeWidth={2.4}
                      fill={u.cor}
                      fillOpacity={0.06}
                      dot={false}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          ) : periodo === "DIA" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieDiaria} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <defs>
                  {/* Gradiente Dourado FusionSolar */}
                  <linearGradient id="fusionSolarAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                
                {/* Eixo X: Horários de 5 em 5 minutos */}
                <XAxis
                  dataKey="hora"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  interval={23} // Amostragem a cada ~2 horas para visual limpo
                />

                {/* Eixo Y1 (Esquerda): Potência Ativa (kW) */}
                <YAxis
                  yAxisId="power"
                  domain={[0, maxPotY]}
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  unit=" kW"
                />

                {/* Eixo Y2 (Direita): Irradiância (W/m²) */}
                {mostrarIrradiancia && (
                  <YAxis
                    yAxisId="irr"
                    orientation="right"
                    domain={[0, 1200]}
                    stroke="#06B6D4"
                    fontSize={11}
                    tickLine={false}
                    unit=" W/m²"
                  />
                )}

                {/* Tooltip FusionSolar de Alta Fidelidade */}
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload as TelemetryPoint5Min;
                      return (
                        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-slate-200">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              {label} (Brasília)
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-amber-400 font-bold">
                              <span>Potência Total:</span>
                              <span>{dataPoint.potenciaTotalKW.toLocaleString("pt-BR")} kW</span>
                            </div>

                            {dataPoint.energiaAcumuladaKWh ? (
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="text-slate-400">Energia Acumulada:</span>
                                <span className="font-semibold">{dataPoint.energiaAcumuladaKWh.toLocaleString("pt-BR")} kWh</span>
                              </div>
                            ) : null}

                            {dataPoint.irradianciaWM2 ? (
                              <div className="flex justify-between items-center text-cyan-400 font-medium">
                                <span>Irradiância:</span>
                                <span>{dataPoint.irradianciaWM2} W/m²</span>
                              </div>
                            ) : null}

                            {/* Detalhe dos Inversores no Horário */}
                            {dataPoint.inversores && Object.keys(dataPoint.inversores).length > 0 && (
                              <div className="border-t border-slate-800 pt-1.5 mt-1 space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Inversores:</span>
                                {Object.entries(dataPoint.inversores).map(([invKey, potVal], idx) => {
                                  const color = INVERTER_COLORS[idx % INVERTER_COLORS.length];
                                  return (
                                    <div key={invKey} className="flex justify-between items-center text-[11px]">
                                      <span className="flex items-center gap-1 text-slate-300">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
                                        {invKey}:
                                      </span>
                                      <span className="font-medium text-slate-200">{Number(potVal).toLocaleString("pt-BR")} kW</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Curva da Usina Total (Sombreada em degradê âmbar) */}
                {mostrarCurvaUsina && (
                  <Area
                    yAxisId="power"
                    type="monotone"
                    dataKey="potenciaTotalKW"
                    name="Usina Total"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fusionSolarAmber)"
                  />
                )}

                {/* Curva de Irradiância da Estação (Azul Claro) */}
                {mostrarIrradiancia && (
                  <Line
                    yAxisId="irr"
                    type="monotone"
                    dataKey="irradianciaWM2"
                    name="Irradiância"
                    stroke="#06B6D4"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 4"
                  />
                )}

                {/* Curvas Individuais dos Inversores Sobrepostas */}
                {mostrarInversores && listaInversores.map((invSn, idx) => {
                  if (!isInversorVisible(invSn)) return null;
                  const color = INVERTER_COLORS[idx % INVERTER_COLORS.length];
                  return (
                    <Line
                      key={invSn}
                      yAxisId="power"
                      type="monotone"
                      dataKey={(item: TelemetryPoint5Min) => item.inversores?.[invSn]}
                      name={invSn}
                      stroke={color}
                      strokeWidth={1.8}
                      dot={false}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          ) : periodo === "MES" ? (
            /* ── VISÃO MENSAL (Barras diárias de kWh) ── */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieMensal} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="dia" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit=" kWh" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload as MensalPoint;
                      return (
                        <div className="bg-slate-900 border border-slate-750 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-200">Dia {label}</p>
                          <p className="text-amber-400 font-semibold">Geração: {p.totalKWh.toLocaleString("pt-BR")} kWh</p>
                          {p.hsp && <p className="text-slate-400">Rendimento HSP: {p.hsp.toFixed(2)} h</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalKWh" name="Geração Diária" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* ── VISÃO ANUAL (Barras mensais de MWh) ── */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieAnual} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="mes" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit=" MWh" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload as AnualPoint;
                      return (
                        <div className="bg-slate-900 border border-slate-750 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-200">Mês: {label}</p>
                          <p className="text-amber-400 font-semibold">Geração: {p.geracaoMWh.toLocaleString("pt-BR")} MWh</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="geracaoMWh" name="Geração Mensal" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── SEÇÃO RETRÁTIL: DIAGNÓSTICO DE CORRENTE DE STRINGS CC ($PV_1 \dots PV_{24}$) ── */}
      {mostrarStringsSecao && periodo === "DIA" && (
        <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Curvas de Corrente das Strings CC (Auditoria de Fusíveis & Desvios)
                </h3>
                <p className="text-xs text-slate-400">
                  Diagnóstico visual imediato: identifique strings com corrente nula (fusível aberto) ou abaixo da média.
                </p>
              </div>
            </div>

            {/* Seletor do Inversor para as Strings */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Inversor Selecionado:</span>
              <select
                value={currentInversorForStrings}
                onChange={(e) => setSelectedInversorStrings(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:border-purple-500"
              >
                {inversoresDisponiveisParaStrings.map(sn => (
                  <option key={sn} value={sn}>{sn}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Gráfico de Linhas de cada String CC ao longo do dia */}
          <div className="h-[360px] w-full pt-2">
            {dadosStringsDoInversor.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Nenhum dado de string CC registrado para este inversor no dia selecionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosStringsDoInversor} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="hora" stroke="#64748B" fontSize={11} tickLine={false} interval={23} />
                  <YAxis domain={[0, 'auto']} stroke="#C084FC" fontSize={11} tickLine={false} unit=" A" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-slate-750 p-3 rounded-xl shadow-xl text-xs space-y-1.5 max-h-60 overflow-y-auto min-w-[180px]">
                            <p className="font-bold text-purple-400 border-b border-slate-800 pb-1">{label} - Correntes (A)</p>
                            {payload.map((item: any, idx: number) => (
                              <div key={item.dataKey} className="flex justify-between items-center text-[11px]">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.stroke }}></span>
                                  {item.dataKey}:
                                </span>
                                <span className={`font-semibold ${Number(item.value) <= 0.1 ? "text-rose-400" : "text-slate-100"}`}>
                                  {Number(item.value).toFixed(2)} A
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {chavesStrings.map((strName, idx) => {
                    const color = STRING_COLORS[idx % STRING_COLORS.length];
                    return (
                      <Line
                        key={strName}
                        type="monotone"
                        dataKey={strName}
                        name={strName}
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
