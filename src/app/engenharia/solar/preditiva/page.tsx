"use client";

import { useState, useEffect } from "react";
import {
  Sun,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Calendar,
  Layers,
  Thermometer,
  CloudSun,
  DollarSign,
  Activity,
  Cpu,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  ShieldAlert,
  Sliders,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

export default function PreditivaSolarPage() {
  const [usinaId, setUsinaId] = useState("cmp8hqv4400h9wgv5c9f2tdbh"); // Manga Grande 01
  const [dataSelecionada, setDataSelecionada] = useState("2026-09-04");
  const [loading, setLoading] = useState(true);
  const [preditivaData, setPreditivaData] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Filtro da tabela de strings
  const [stringFilter, setStringFilter] = useState<"TODAS" | "ALERTAS" | "DESCONECTADAS">("TODAS");

  // Modal de Upload da Estação Sigma
  const [modalUploadOpen, setModalUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const fetchPreditiva = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/solar/preditiva?usinaId=${usinaId}&date=${dataSelecionada}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao carregar dados preditivos");
      }
      setPreditivaData(data);
    } catch (e: any) {
      setErro(e.message || "Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreditiva();
  }, [usinaId, dataSelecionada]);

  const handleUploadEstacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/solar/estacao/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Erro no upload");
      }
      setUploadMsg({ tipo: "sucesso", texto: json.mensagem || "Upload concluído!" });
      setTimeout(() => {
        setModalUploadOpen(false);
        setUploadFile(null);
        setUploadMsg(null);
        fetchPreditiva();
      }, 2000);
    } catch (err: any) {
      setUploadMsg({ tipo: "erro", texto: err.message || "Falha no envio" });
    } finally {
      setUploading(false);
    }
  };

  const filteredStrings = (preditivaData?.diagnosticoStrings?.detalhes || []).filter((s: any) => {
    if (stringFilter === "ALERTAS") return s.status !== "NORMAL";
    if (stringFilter === "DESCONECTADAS") return s.status === "DESCONECTADA";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Padrão Prescinto APM + pvlib
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Estação Solarimétrica Sigma
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Análise Preditiva Solar & Digital Twin
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Previsão científica de perdas, ceifamento físico (1 MW), sujidade (soiling) e diagnóstico preditivo string a string.
          </p>
        </div>

        {/* Controls & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setModalUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors shadow-lg shadow-cyan-600/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Importar Planilha Sigma
          </button>

          <button
            onClick={fetchPreditiva}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Usina:</span>
            <select
              value={usinaId}
              onChange={(e) => setUsinaId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="cmp8hqv4400h9wgv5c9f2tdbh">USINA MANGA GRANDE UFV 1 1852 (1.400 kWp / 1.000 kW CA)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Data:</span>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Quick Date Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Atalhos:</span>
          <button
            onClick={() => setDataSelecionada("2026-09-04")}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
              dataSelecionada === "2026-09-04"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            04/09/2026 (Ref Huawei)
          </button>
          <button
            onClick={() => setDataSelecionada("2026-01-07")}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
              dataSelecionada === "2026-01-07"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            07/01/2026 (Restaurado)
          </button>
          <button
            onClick={() => setDataSelecionada("2026-09-11")}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
              dataSelecionada === "2026-09-11"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            11/09/2026
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Geração Real vs Esperada */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Geração Real Entregue</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {preditivaData?.resumo?.energiaRealKWh?.toLocaleString("pt-BR") || "--"}
            </span>
            <span className="text-sm font-medium text-slate-400">kWh</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Esperado Digital Twin:</span>
            <span className="font-semibold text-cyan-400">
              {preditivaData?.resumo?.energiaEsperadaKWh?.toLocaleString("pt-BR") || "--"} kWh
            </span>
          </div>
        </div>

        {/* Card 2: Performance Ratio & Adherence */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Performance Ratio (PR)</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {preditivaData?.resumo?.performanceRatioReal || "--"}%
            </span>
            <span className="text-xs font-medium text-slate-400">
              (Meta: {preditivaData?.resumo?.performanceRatioEsperado || "82"}%)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Motor Científico:</span>
            <span className="font-semibold text-emerald-400">
              {preditivaData?.resumo?.fonteMotor === "PVLIB_PYTHON" ? "pvlib (Python)" : "Analítico Faiman"}
            </span>
          </div>
        </div>

        {/* Card 3: Perda por Ceifamento (Clipping) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ceifamento (Clipping 1 MW)</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-300">
              {preditivaData?.resumo?.perdaCeifamentoKWh?.toLocaleString("pt-BR") || "--"}
            </span>
            <span className="text-sm font-medium text-slate-400">kWh</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Dimensionamento CC/CA:</span>
            <span className="font-semibold text-slate-300">1.400 kWp CC / 1.000 kW CA</span>
          </div>
        </div>

        {/* Card 4: Perda Térmica e Estresse IGBT */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Perda Térmica & IGBT</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <Thermometer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {preditivaData?.resumo?.perdaTemperaturaKWh?.toLocaleString("pt-BR") || "--"}
            </span>
            <span className="text-sm font-medium text-slate-400">kWh</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Máx Temp IGBT Inversores:</span>
            <span className={`font-semibold ${preditivaData?.resumo?.maxTempIGBT > 75 ? "text-rose-400" : "text-emerald-400"}`}>
              {preditivaData?.resumo?.maxTempIGBT ? `${preditivaData.resumo.maxTempIGBT}°C` : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Section: Curva Real vs Digital Twin pvlib */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              Curva Real (Huawei) vs Digital Twin Esperado (pvlib)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativo a cada 5 minutos. Observe o platô de ceifamento físico em 1.000 kW e as oscilações meteorológicas reais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-slate-300">Potência Real (kW)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-slate-300">pvlib Esperado com Clipping (kW)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="text-slate-300">Potência Sem Ceifamento (kW)</span>
            </div>
          </div>
        </div>

        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={preditivaData?.curvaComparativa || []}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorUnclip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                domain={[0, 1300]}
                label={{ value: "Potência (kW)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.5rem",
                  color: "#f8fafc",
                }}
                formatter={(value: any, name: any) => {
                  const labelMap: Record<string, string> = {
                    realKW: "Potência Real",
                    expectedKW: "Esperado pvlib (Clipped)",
                    unclippedKW: "Sem Ceifamento",
                    poa: "Irradiância POA (W/m²)",
                  };
                  return [`${value ?? 0} kW`, labelMap[name] || name];
                }}
              />
              <Area
                type="monotone"
                dataKey="unclippedKW"
                stroke="#a855f7"
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorUnclip)"
              />
              <Line
                type="monotone"
                dataKey="expectedKW"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="realKW"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorReal)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Layout: Loss Waterfall (Prescinto) & Smart Cleaning Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waterfall Chart (Cascata de Perdas Prescinto) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Cascata de Perdas (Padrão Prescinto APM)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Decomposição física do potencial solar ideal até a energia líquida entregue aos inversores.
              </p>
            </div>
            <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded-md">
              Loss Tree
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={preditivaData?.waterfall || []}
                margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="etapa"
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                  }}
                  formatter={(value: any, name: any, item: any) => {
                    const kwh = `${Math.abs(Number(value)).toLocaleString("pt-BR")} kWh`;
                    const rs = item?.payload?.impactoRS
                      ? ` (R$ ${Math.abs(Number(item.payload.impactoRS)).toFixed(2)})`
                      : "";
                    return [`${kwh}${rs}`, "Energia"];
                  }}
                />
                <Bar dataKey="valorKWh" radius={[4, 4, 0, 0]}>
                  {(preditivaData?.waterfall || []).map((entry: any, index: number) => {
                    let fillColor = "#3b82f6"; // Base blue
                    if (entry.tipo === "perda") fillColor = "#f43f5e"; // Rose
                    if (entry.tipo === "resultado") fillColor = "#10b981"; // Emerald
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Smart Cleaning Dispatcher (Prescinto ROI Lavagem) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-400" />
                Smart Cleaning Dispatcher
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  preditivaData?.otimizacaoLimpeza?.recomendacao?.status === "URGENTE"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : preditivaData?.otimizacaoLimpeza?.recomendacao?.status === "PROGRAMAR"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {preditivaData?.otimizacaoLimpeza?.recomendacao?.status || "OK"}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Otimização econômica baseada na taxa diária de sujidade, tarifa média (R$ 0,90/kWh) e custo de mobilização da equipe.
            </p>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Perda diária por Sujidade:</span>
                <span className="font-semibold text-rose-400">
                  R$ {preditivaData?.otimizacaoLimpeza?.perdaDiariaRS?.toFixed(2) || "0,00"}/dia
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Custo Médio de Limpeza:</span>
                <span className="font-semibold text-slate-200">
                  R$ {preditivaData?.otimizacaoLimpeza?.custoLavagemEstimadoRS?.toLocaleString("pt-BR") || "4.500,00"}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1.5">
                <span>Ponto Ótimo de Lavagem:</span>
                <span className="font-bold text-cyan-400">
                  {preditivaData?.otimizacaoLimpeza?.diasSugeridosParaLavagem || 30} dias
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Diagnóstico Algorítmico:
              </div>
              {preditivaData?.otimizacaoLimpeza?.recomendacao?.mensagem ||
                "Módulos em condições normais de limpeza."}
            </div>
          </div>

          <button className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Gerar OS de Lavagem
          </button>
        </div>
      </div>

      {/* String-Level Predictive Health Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              Diagnóstico Preditivo String a String (Huawei SUN2000)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              112 strings monitoradas (4 inversores x 28 entradas CC). Identificação automática de desvios relativos no MPPT.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStringFilter("TODAS")}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                stringFilter === "TODAS"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Todas ({preditivaData?.diagnosticoStrings?.totalMonitoradas || 0})
            </button>
            <button
              onClick={() => setStringFilter("ALERTAS")}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                stringFilter === "ALERTAS"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Com Alerta ({preditivaData?.diagnosticoStrings?.comAlerta || 0})
            </button>
            <button
              onClick={() => setStringFilter("DESCONECTADAS")}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                stringFilter === "DESCONECTADAS"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Desconectadas ({preditivaData?.diagnosticoStrings?.inativas || 0})
            </button>
          </div>
        </div>

        {/* Strings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Identificador</th>
                <th className="py-2.5 px-3">Inversor</th>
                <th className="py-2.5 px-3">Corrente Média Pico (A)</th>
                <th className="py-2.5 px-3">Tensão (V)</th>
                <th className="py-2.5 px-3">Desvio Relativo (ΔI%)</th>
                <th className="py-2.5 px-3">Status Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStrings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Nenhuma string correspondente aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredStrings.map((s: any, idx: number) => {
                  let badge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Normal
                    </span>
                  );
                  if (s.status === "ALERTA_SUJIDADE") {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Alerta Sujidade / Sombra
                      </span>
                    );
                  } else if (s.status === "FALHA_FUSIVEL") {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Possível Diodo / Fusível
                      </span>
                    );
                  } else if (s.status === "DESCONECTADA") {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Desconectada / Inativa
                      </span>
                    );
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-white">{s.stringName}</td>
                      <td className="py-2 px-3 text-slate-400">{s.inversor}</td>
                      <td className="py-2 px-3 font-mono">{s.correnteMedia} A</td>
                      <td className="py-2 px-3 font-mono">{s.tensao} V</td>
                      <td className="py-2 px-3 font-mono">
                        <span className={s.desvioPercent < -15 ? "text-rose-400 font-bold" : "text-slate-300"}>
                          {s.desvioPercent > 0 ? `+${s.desvioPercent}%` : `${s.desvioPercent}%`}
                        </span>
                      </td>
                      <td className="py-2 px-3">{badge}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Upload Estação Sigma */}
      {modalUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Importar Dados da Estação Sigma
              </h3>
              <button
                onClick={() => setModalUploadOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Selecione a planilha Excel (.xlsx) ou CSV com as leituras solarimétricas da Estação Sigma (GHI, POA, Temperatura Ambiente, Temperatura dos Módulos, Vento, etc.).
            </p>

            <form onSubmit={handleUploadEstacao} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-6 text-center space-y-2 bg-slate-950/40">
                <CloudSun className="w-10 h-10 text-cyan-400 mx-auto" />
                <label className="block text-sm font-semibold text-slate-200 cursor-pointer">
                  <span>{uploadFile ? uploadFile.name : "Clique para selecionar o arquivo"}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-[11px] text-slate-500">Formatos aceitos: Excel (.xlsx) e CSV</p>
              </div>

              {uploadMsg && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    uploadMsg.tipo === "sucesso"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                  }`}
                >
                  {uploadMsg.tipo === "sucesso" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{uploadMsg.texto}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalUploadOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Importando..." : "Processar Planilha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
