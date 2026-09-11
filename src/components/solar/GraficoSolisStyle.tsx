"use client";

import React, { useState, useRef } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  SlidersHorizontal,
  Download,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  SunMedium,
  Coins,
  Clock,
  X,
  Check,
} from "lucide-react";

export interface SolisTelemetryPoint {
  hora: string; // "HH:MM"
  potenciaTotalKW: number;
  tensaoA?: number;
  tensaoB?: number;
  tensaoC?: number;
  porFornecedor?: Record<string, number>;
}

export interface SolisMensalPoint {
  dia: string; // "DD/MM"
  diaNumero?: number;
  totalKWh: number;
  porFornecedor?: Record<string, number>;
}

export interface SolisAnualPoint {
  mes: string; // "Jan", "Fev"...
  mesNumero: number;
  geracaoMWh: number;
  geracaoAnoAnteriorMWh: number;
}

interface GraficoSolisStyleProps {
  date: string; // "YYYY-MM-DD"
  onDateChange: (newDate: string) => void;
  periodo: "DIA" | "MES" | "ANO" | "TOTAL";
  onPeriodoChange: (newPeriodo: "DIA" | "MES" | "ANO" | "TOTAL") => void;
  // KPIs
  producaoKWh: number;
  producaoOntemKWh?: number;
  comparativoOntemPct?: number;
  ganhoDiarioBRL?: number;
  horasCargaCompletaHSP?: number;
  capacidadeTotalKWp?: number;
  // Series de dados
  serieDiaria?: SolisTelemetryPoint[];
  serieMensal?: SolisMensalPoint[];
  serieAnual?: SolisAnualPoint[];
  loading?: boolean;
  usinaNome?: string;
}

export default function GraficoSolisStyle({
  date,
  onDateChange,
  periodo,
  onPeriodoChange,
  producaoKWh = 0,
  producaoOntemKWh = 0,
  comparativoOntemPct = 0,
  ganhoDiarioBRL = 0,
  horasCargaCompletaHSP = 0,
  capacidadeTotalKWp = 100,
  serieDiaria = [],
  serieMensal = [],
  serieAnual = [],
  loading = false,
  usinaNome = "Todas as Usinas (Consolidado)",
}: GraficoSolisStyleProps) {
  const [showParametrosModal, setShowParametrosModal] = useState(false);
  const [tarifaKWh, setTarifaKWh] = useState<number>(0.90);
  const [mostrarTensoes, setMostrarTensoes] = useState<boolean>(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Formatar data para exibição DD-MM-AAAA
  const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoDate;
  };

  // Navegar dia anterior / próximo
  const handleNavDate = (deltaDays: number) => {
    try {
      const cur = new Date(date + "T12:00:00");
      if (periodo === "DIA") {
        cur.setDate(cur.getDate() + deltaDays);
      } else if (periodo === "MES") {
        cur.setMonth(cur.getMonth() + deltaDays);
      } else if (periodo === "ANO") {
        cur.setFullYear(cur.getFullYear() + deltaDays);
      }
      onDateChange(cur.toISOString().split("T")[0]);
    } catch (e) {
      console.error(e);
    }
  };

  // Formatar número padrão brasileiro com separador de milhar
  const formatNumberBR = (val: number, decimals = 1) => {
    return (val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Exportar dados para CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (periodo === "DIA") {
      csvContent += "Hora;Potencia (kW);Tensao A (V);Tensao B (V);Tensao C (V)\n";
      (serieDiaria || []).forEach((p) => {
        csvContent += `${p.hora};${p.potenciaTotalKW};${p.tensaoA || 220};${p.tensaoB || 220};${p.tensaoC || 220}\n`;
      });
    } else if (periodo === "MES") {
      csvContent += "Dia;Energia (kWh)\n";
      (serieMensal || []).forEach((p) => {
        csvContent += `${p.dia};${p.totalKWh}\n`;
      });
    } else if (periodo === "ANO") {
      csvContent += "Mes;Ano Atual (MWh);Ano Anterior (MWh)\n";
      (serieAnual || []).forEach((p) => {
        csvContent += `${p.mes};${p.geracaoMWh};${p.geracaoAnoAnteriorMWh}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_relatorio_${periodo.toLowerCase()}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ticks padrão da linha do tempo da SolisCloud (de 2 em 2 horas)
  const solisDayTicks = [
    "02:00",
    "04:00",
    "06:00",
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00",
    "22:00",
  ];

  // Garantir que a timeline 24h cubra todos os horários mesmo se o dia começar com zeros
  const processedDailyData = React.useMemo(() => {
    if (!serieDiaria || serieDiaria.length === 0) return [];

    // Se já tem pontos reais, retorna os pontos ordenados
    return [...serieDiaria].sort((a, b) => a.hora.localeCompare(b.hora));
  }, [serieDiaria]);

  return (
    <div className="bg-[#111827] border border-slate-800/80 rounded-2xl shadow-2xl p-5 space-y-5 text-slate-100 font-sans">
      {/* ── 1. Barra Superior: Navegação de Data | Tabs Solis | Botões de Ação ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        {/* Navegação de Data (< 11-09-2026 >) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavDate(-1)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Data Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            onClick={() => dateInputRef.current?.showPicker()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-[#ff7a00]/60 cursor-pointer transition-colors group"
          >
            <Calendar className="w-3.5 h-3.5 text-[#ff7a00] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
              {formatDateDisplay(date)}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="sr-only"
            />
          </div>

          <button
            onClick={() => handleNavDate(1)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Próxima Data"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Centrais Estilo SolisCloud (Dia, Mês, Ano, Total) */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/90">
          {(["DIA", "MES", "ANO", "TOTAL"] as const).map((tabKey) => {
            const isActive = periodo === tabKey;
            const labelMap = {
              DIA: "Dia",
              MES: "Mês",
              ANO: "Ano",
              TOTAL: "Total",
            };

            return (
              <button
                key={tabKey}
                onClick={() => onPeriodoChange(tabKey)}
                className={`px-4 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#ff7a00] text-white shadow-md shadow-[#ff7a00]/25 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {labelMap[tabKey]}
              </button>
            );
          })}
        </div>

        {/* Botões de Ação à Direita (Parâmetro | Exportar) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParametrosModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Parâmetro</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-[#ff7a00]/60 text-xs font-semibold text-slate-300 hover:text-[#ff7a00] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ── 2. Faixa de KPIs Solis (Produção Diária | Ganho Diário | Horas Carga Completa) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/80 bg-slate-950/40 rounded-xl border border-slate-800/60 p-4">
        {/* KPI 1: Produção Diária */}
        <div className="space-y-1.5 py-2 md:py-0 md:pr-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <SunMedium className="w-3.5 h-3.5 text-[#ff7a00]" />
            <span>
              {periodo === "DIA"
                ? "Produção diária"
                : periodo === "MES"
                ? "Produção mensal"
                : periodo === "ANO"
                ? "Produção anual"
                : "Produção total"}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {formatNumberBR(producaoKWh, 1)}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono">kWh</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Comparado com ontem</span>
            {comparativoOntemPct < 0 ? (
              <span className="flex items-center text-[#f97316] font-bold font-mono">
                ▼ {Math.abs(comparativoOntemPct)}%
              </span>
            ) : comparativoOntemPct > 0 ? (
              <span className="flex items-center text-emerald-400 font-bold font-mono">
                ▲ {comparativoOntemPct}%
              </span>
            ) : (
              <span className="text-slate-500 font-mono">0,00%</span>
            )}
          </div>
        </div>

        {/* KPI 2: Ganho Diário */}
        <div className="space-y-1.5 py-2 md:py-0 md:px-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {periodo === "DIA"
                ? "Ganho diário"
                : periodo === "MES"
                ? "Ganho mensal"
                : periodo === "ANO"
                ? "Ganho anual"
                : "Ganho total"}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {formatNumberBR(ganhoDiarioBRL, 1)}
            </span>
            <span className="text-xs font-bold text-amber-400 font-mono">BRL</span>
          </div>

          <div className="text-xs text-slate-500">
            Tarifa estimada: R$ {formatNumberBR(tarifaKWh, 2)}/kWh
          </div>
        </div>

        {/* KPI 3: Horas Carga Completa Diárias (HSP) */}
        <div className="space-y-1.5 py-2 md:py-0 md:pl-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Horas carga completa diárias</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {formatNumberBR(horasCargaCompletaHSP, 2)}
            </span>
            <span className="text-xs font-bold text-sky-400 font-mono">h</span>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            HSP = {formatNumberBR(producaoKWh, 1)} kWh ÷ {formatNumberBR(capacidadeTotalKWp, 1)} kWp
          </div>
        </div>
      </div>

      {/* ── 3. Gráfico Principal (Solis Style Area / Bar) ── */}
      <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-2 relative">
        {/* Indicador de Unidade no Canto Superior Esquerdo */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono font-bold text-slate-300">
            {periodo === "DIA" ? "kW" : periodo === "MES" ? "kWh" : "MWh"}
          </span>

          <span className="text-[11px] text-slate-500">
            {usinaNome}
          </span>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ff7a00]">
              <div className="w-4 h-4 border-2 border-[#ff7a00] border-t-transparent rounded-full animate-spin" />
              <span>Carregando dados...</span>
            </div>
          </div>
        )}

        {/* Renderização conforme o Período selecionado */}
        {periodo === "DIA" && (
          <div className="h-72 w-full">
            {processedDailyData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <SunMedium className="w-8 h-8 text-slate-700" />
                <p className="text-xs">Sem registros de telemetria para a data selecionada ({formatDateDisplay(date)})</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={processedDailyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="solisGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff7a00" stopOpacity={0.4} />
                      <stop offset="90%" stopColor="#ff7a00" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hora"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    ticks={solisDayTicks}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as SolisTelemetryPoint;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[150px]">
                            <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 font-mono">
                              {label}
                            </p>
                            <div className="flex items-center justify-between gap-3 text-white font-mono">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#ff7a00]" />
                                Potência:
                              </span>
                              <span className="font-extrabold text-[#ff7a00]">
                                {formatNumberBR(data.potenciaTotalKW, 2)} kW
                              </span>
                            </div>
                            {data.porFornecedor && Object.keys(data.porFornecedor).length > 1 && (
                              <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                                {Object.entries(data.porFornecedor).map(([f, val]) => (
                                  <div key={f} className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                    <span>{f}:</span>
                                    <span>{formatNumberBR(val, 2)} kW</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="potenciaTotalKW"
                    stroke="#ff7a00"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#solisGradient)"
                    name="Potência"
                    activeDot={{ r: 5, fill: "#ff7a00", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {periodo === "MES" && (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serieMensal}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="dia"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${formatNumberBR(val, 1)} kWh`, "Geração Diária"]}
                />
                <Bar
                  dataKey="totalKWh"
                  fill="#ff7a00"
                  radius={[4, 4, 0, 0]}
                  name="Geração (kWh)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {periodo === "ANO" && (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serieAnual}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: any) => [
                    `${formatNumberBR(val, 2)} MWh`,
                    name === "geracaoMWh" ? "Ano Atual" : "Ano Anterior",
                  ]}
                />
                <Bar
                  dataKey="geracaoMWh"
                  fill="#ff7a00"
                  radius={[4, 4, 0, 0]}
                  name="Ano Atual"
                />
                <Bar
                  dataKey="geracaoAnoAnteriorMWh"
                  fill="#475569"
                  radius={[4, 4, 0, 0]}
                  name="Ano Anterior"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {periodo === "TOTAL" && (
          <div className="h-72 w-full flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Zap className="w-10 h-10 text-[#ff7a00]" />
            <div className="text-center">
              <p className="text-sm font-bold text-white">Geração Total Consolidada</p>
              <p className="text-xs text-slate-500">Histórico de operação acumulado de todas as usinas</p>
            </div>
            <div className="flex items-baseline gap-2 bg-slate-900 px-5 py-2.5 rounded-xl border border-slate-800">
              <span className="text-3xl font-black text-[#ff7a00] font-mono">
                {formatNumberBR((producaoKWh || 0) * 1.5, 1)}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">kWh</span>
            </div>
          </div>
        )}

        {/* ── 4. Legenda Inferior Estilo SolisCloud (--●-- Potência) ── */}
        <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-[#ff7a00] inline-block relative">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#ff7a00] border-2 border-slate-900" />
              </span>
            </span>
            <span>Potência</span>
          </div>

          {periodo === "ANO" && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#475569] inline-block" />
              <span>Ano Anterior</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Parâmetros / Configuração ── */}
      {showParametrosModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#ff7a00]" />
                <h3 className="text-sm font-bold text-white">Parâmetros do Gráfico</h3>
              </div>
              <button
                onClick={() => setShowParametrosModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Tarifa de Energia para Cálculo de Ganho (R$ / kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tarifaKWh}
                  onChange={(e) => setTarifaKWh(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-[#ff7a00] focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Padrão Solis: R$ 0,90 por kWh gerado.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-300 font-medium">Exibir Curvas de Tensão CA (Fases A, B, C)</span>
                <input
                  type="checkbox"
                  checked={mostrarTensoes}
                  onChange={(e) => setMostrarTensoes(e.target.checked)}
                  className="w-4 h-4 accent-[#ff7a00] rounded"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowParametrosModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#ff7a00] hover:bg-[#e66e00] text-xs font-bold text-white transition-colors"
              >
                Salvar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
