"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
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
  BarChart3,
  Award,
  Radio,
  FileText,
  Printer,
  PlusCircle,
  ClipboardCheck,
  Wrench,
  Check,
  ZapOff,
  AlertOctagon,
  CheckSquare,
  FileSpreadsheet,
} from "lucide-react";
import ManualTelemetryModal from "@/components/solar/ManualTelemetryModal";
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
  const [abaAtiva, setAbaAtiva] = useState<
    "DIAGNOSTICO" | "BENCHMARK" | "STATUS_USINA" | "SANADOS" | "STRINGS_FUSIVEIS"
  >("DIAGNOSTICO");
  const [usinaId, setUsinaId] = useState("cmp8hqv4400h9wgv5c9f2tdbh"); // Manga Grande 01 default
  const [dataSelecionada, setDataSelecionada] = useState("2026-09-14");
  const [loading, setLoading] = useState(true);
  const [preditivaData, setPreditivaData] = useState<any>(null);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [relatoriosData, setRelatoriosData] = useState<any>(null);
  const [stringsReportData, setStringsReportData] = useState<any>(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [loadingRelatorios, setLoadingRelatorios] = useState(false);
  const [loadingStringsReport, setLoadingStringsReport] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros da aba de Strings
  const [filtroUsinaStrings, setFiltroUsinaStrings] = useState<string>("TODAS");
  const [apenasFalhasStrings, setApenasFalhasStrings] = useState<boolean>(true);

  // Filtro da tabela de strings da Aba Diagnóstico
  const [stringFilter, setStringFilter] = useState<"TODAS" | "ALERTAS" | "FUSIVEL" | "NC">("TODAS");

  // Modal de Upload da Estação Sigma
  const [modalUploadOpen, setModalUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Modal de Criação de Ordem de Serviço (OS)
  const [modalOSOpen, setModalOSOpen] = useState(false);
  const [tipoAcaoOS, setTipoAcaoOS] = useState("limpeza_modulos");
  const [dataExecucaoOS, setDataExecucaoOS] = useState("2026-09-14");
  const [executadoPorOS, setExecutadoPorOS] = useState("Equipe de Campo Cordeiro O&M");
  const [custoEstimadoOS, setCustoEstimadoOS] = useState("4500");
  const [observacoesOS, setObservacoesOS] = useState("");
  const [salvandoOS, setSalvandoOS] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [listaUsinas, setListaUsinas] = useState<any[]>([]);

  // Escala Dinâmica do Gráfico e Importação Manual de Telemetria
  const [escalaGrafico, setEscalaGrafico] = useState<"AUTO" | "NOMINAL">("AUTO");
  const [modalImportManualOpen, setModalImportManualOpen] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/solar/usinas")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setListaUsinas(data);
        }
      })
      .catch((e) => console.error("Erro ao carregar lista de usinas:", e));
  }, []);

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

  const fetchBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const res = await fetch(`/api/solar/benchmark?date=${dataSelecionada}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBenchmarkData(data);
      }
    } catch (e: any) {
      console.error("Erro ao carregar benchmark:", e);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  const fetchRelatorios = async () => {
    setLoadingRelatorios(true);
    try {
      const res = await fetch(`/api/solar/relatorios?usinaId=${usinaId}&date=${dataSelecionada}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRelatoriosData(data);
      }
    } catch (e: any) {
      console.error("Erro ao carregar relatórios:", e);
    } finally {
      setLoadingRelatorios(false);
    }
  };

  const fetchStringsReport = async () => {
    setLoadingStringsReport(true);
    try {
      const res = await fetch(
        `/api/solar/relatorios/strings?date=${dataSelecionada}&usinaId=${filtroUsinaStrings}&apenasFalhas=${apenasFalhasStrings}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setStringsReportData(data);
      }
    } catch (e: any) {
      console.error("Erro ao carregar relatório de strings:", e);
    } finally {
      setLoadingStringsReport(false);
    }
  };

  useEffect(() => {
    fetchPreditiva();
    fetchRelatorios();
  }, [usinaId, dataSelecionada]);

  useEffect(() => {
    if (abaAtiva === "BENCHMARK") {
      fetchBenchmark();
    } else if (abaAtiva === "STATUS_USINA" || abaAtiva === "SANADOS") {
      fetchRelatorios();
    } else if (abaAtiva === "STRINGS_FUSIVEIS") {
      fetchStringsReport();
    }
  }, [abaAtiva, dataSelecionada, usinaId, filtroUsinaStrings, apenasFalhasStrings]);

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
      setUploadMsg({ tipo: "sucesso", texto: json.mensagem || "Upload concluído com sucesso!" });
      setTimeout(() => {
        setModalUploadOpen(false);
        setUploadFile(null);
        fetchPreditiva();
        if (abaAtiva === "BENCHMARK") fetchBenchmark();
      }, 2000);
    } catch (err: any) {
      setUploadMsg({ tipo: "erro", texto: err.message || "Falha ao importar arquivo" });
    } finally {
      setUploading(false);
    }
  };

  const handleCriarOS = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoOS(true);
    try {
      const metaObj = {
        texto: observacoesOS || "Ordem de serviço gerada via Análise Preditiva.",
        custoIntervencaoRS: parseFloat(custoEstimadoOS) || 0,
        status: "CONCLUIDO",
        energiaRecuperadaDiaKWh:
          tipoAcaoOS === "limpeza_modulos" ? 675.9 : tipoAcaoOS === "troca_fusivel" ? 237.5 : 120.0,
        valorSalvoDiaRS:
          tipoAcaoOS === "limpeza_modulos" ? 608.31 : tipoAcaoOS === "troca_fusivel" ? 213.75 : 108.0,
      };

      const res = await fetch("/api/solar/acoes-corretivas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usinaId,
          tipoAcao: tipoAcaoOS,
          dataExecucao: dataExecucaoOS,
          observacoes: JSON.stringify(metaObj),
          executadoPor: executadoPorOS,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar OS");

      setModalOSOpen(false);
      setToastMsg("Ordem de Serviço cadastrada com sucesso! Problema registrado e sanado.");
      setTimeout(() => setToastMsg(null), 5000);
      fetchRelatorios();
      fetchPreditiva();
      if (abaAtiva === "STRINGS_FUSIVEIS") fetchStringsReport();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSalvandoOS(false);
    }
  };

  const abrirModalOSComTipo = (tipo: string, custoPadrao: string, obsPadrao: string) => {
    setTipoAcaoOS(tipo);
    setDataExecucaoOS(dataSelecionada);
    setCustoEstimadoOS(custoPadrao);
    setObservacoesOS(obsPadrao);
    setModalOSOpen(true);
  };

  // Filtragem de strings na aba 1
  const stringsFiltradas = (preditivaData?.diagnosticoStrings?.detalhes || []).filter((s: any) => {
    if (stringFilter === "ALERTAS") return s.status === "ALERTA_SUJIDADE";
    if (stringFilter === "FUSIVEL") return s.status === "FALHA_FUSIVEL";
    if (stringFilter === "NC") return s.status === "NAO_CONECTADA_NC";
    return true;
  });

  // Cálculo de Escala Dinâmica para o Gráfico de Geração Real vs Digital Twin
  const curvaPontos = preditivaData?.curvaComparativa || [];
  const picoMaxCurva = curvaPontos.reduce((max: number, p: any) => {
    return Math.max(max, p.realKW || 0, p.expectedKW || 0, p.unclippedKW || 0);
  }, 0);
  const yAxisMaxAuto = picoMaxCurva > 0 ? Math.ceil((picoMaxCurva * 1.15) / 20) * 20 : 100;
  const capCA = preditivaData?.usina?.capacidadeCA || 1000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-emerald-400/40">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Análise Preditiva & APM Solar
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Padrão Prescinto + pvlib
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Digital Twin físico, detecção de sujidade (IEC 61724-1), diagnóstico de strings por inversor, ordens de serviço e relatórios de valor salvo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/engenharia/solar/cockpit-ai"
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <Brain className="w-4 h-4" /> Cockpit IA & Normas
          </Link>

          <button
            onClick={() =>
              abrirModalOSComTipo(
                "limpeza_modulos",
                "4500",
                `Lavagem geral dos módulos fotovoltaicos recomendada pelo Smart Cleaning Dispatcher na data ${dataSelecionada}.`
              )
            }
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Wrench className="w-4 h-4" /> Gerar Ordem de Serviço (OS)
          </button>

          <button
            onClick={() => setModalUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors shadow-lg shadow-cyan-600/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Importar Planilha Sigma
          </button>

          <button
            onClick={() => setModalImportManualOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-lg transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            title="Copie e cole dados do Excel da Huawei/Solis ou faça upload da planilha para salvar no banco"
          >
            <FileSpreadsheet className="w-4 h-4" /> 📥 Importar do Excel / Colar Telemetria
          </button>

          <button
            onClick={() => {
              fetchPreditiva();
              fetchRelatorios();
              if (abaAtiva === "BENCHMARK") fetchBenchmark();
              if (abaAtiva === "STRINGS_FUSIVEIS") fetchStringsReport();
            }}
            disabled={loading || loadingStringsReport}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading || loadingBenchmark || loadingRelatorios || loadingStringsReport ? "animate-spin" : ""
              }`}
            />{" "}
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setAbaAtiva("DIAGNOSTICO")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            abaAtiva === "DIAGNOSTICO"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" /> Diagnóstico da Usina
        </button>

        <button
          onClick={() => setAbaAtiva("STRINGS_FUSIVEIS")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            abaAtiva === "STRINGS_FUSIVEIS"
              ? "border-rose-500 text-rose-400 bg-rose-500/10 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Cpu className="w-4 h-4 text-rose-400" /> Relatório de Strings & Fusíveis por Inversor
        </button>

        <button
          onClick={() => setAbaAtiva("BENCHMARK")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            abaAtiva === "BENCHMARK"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Benchmark Multi-Usina (Manga 01, 02 e 03)
        </button>

        <button
          onClick={() => setAbaAtiva("STATUS_USINA")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            abaAtiva === "STATUS_USINA"
              ? "border-rose-500 text-rose-400 bg-rose-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" /> Relatório de Status da Usina (Problemas)
        </button>

        <button
          onClick={() => setAbaAtiva("SANADOS")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            abaAtiva === "SANADOS"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> Problemas Sanados & Valor Salvo
        </button>
      </div>

      {/* Filter Bar Geral */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Usina:</span>
            <select
              value={usinaId}
              onChange={(e) => setUsinaId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {listaUsinas.length > 0 ? (
                Object.entries(
                  listaUsinas.reduce((acc: Record<string, any[]>, u: any) => {
                    const fornecedor = (u.apiFornecedor || "OUTROS").toUpperCase();
                    if (!acc[fornecedor]) acc[fornecedor] = [];
                    acc[fornecedor].push(u);
                    return acc;
                  }, {})
                ).map(([fabricante, usinasDoGrupo]) => (
                  <optgroup key={fabricante} label={`--- ${fabricante} ---`}>
                    {usinasDoGrupo.map((u: any) => {
                      const potCA = u.inversores?.reduce((s: number, inv: any) => s + (inv.potenciaNominalKW || 0), 0) || Math.round((u.capacidadeKWp || 0) / 1.25);
                      return (
                        <option key={u.id} value={u.id}>
                          [{fabricante}] {u.nome} ({u.capacidadeKWp} kWp / {potCA} kW CA)
                        </option>
                      );
                    })}
                  </optgroup>
                ))
              ) : (
                <>
                  <option value="cmp8hqv4400h9wgv5c9f2tdbh">USINA MANGA GRANDE UFV 1 1852 (1.400 kWp / 1.000 kW CA)</option>
                  <option value="cmp8qki8u00050wv5m092pu9g">USINA MANGA GRANDE UFV 2 2243 (1.400 kWp / 1.000 kW CA)</option>
                  <option value="cmtur27em00nel4v55jwzfpah">USINA MANGA GRANDE 3 2565 (1.400 kWp / 1.000 kW CA)</option>
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Data:</span>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Quick Date Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Atalhos:</span>
          <button
            onClick={() => setDataSelecionada("2026-09-14")}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
              dataSelecionada === "2026-09-14"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            14/09/2026 (Telemetria 3 Usinas)
          </button>
          <button
            onClick={() => setDataSelecionada("2026-09-16")}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
              dataSelecionada === "2026-09-16"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            16/09/2026 (Mais Recente)
          </button>
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
            onClick={() => setDataSelecionada("2026-08-03")}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
              dataSelecionada === "2026-08-03"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            03/08/2026 (Alinhado Sigma)
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* ABA 1: DIAGNÓSTICO DA USINA */}
      {abaAtiva === "DIAGNOSTICO" && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                <span>Capacidade: 1.400 kWp CC / 1.000 kW CA</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Digital Twin (pvlib)</span>
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <Sun className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-cyan-300">
                  {preditivaData?.resumo?.energiaEsperadaKWh?.toLocaleString("pt-BR") || "--"}
                </span>
                <span className="text-sm font-medium text-slate-400">kWh</span>
              </div>
              <div className="mt-2 text-xs text-cyan-400/80 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Baseado na Estação Sigma</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Performance Ratio Real</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">
                  {preditivaData?.resumo?.performanceRatioReal || "--"}%
                </span>
                <span className="text-xs text-slate-400">
                  (Esp: {preditivaData?.resumo?.performanceRatioEsperado || "--"}%)
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                <span>Relação CC/CA = 1,40</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Perda por Sujidade (IEC)</span>
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-400">
                  {preditivaData?.resumo?.perdaSujidadeKWh?.toFixed(1) || "--"}
                </span>
                <span className="text-sm font-medium text-slate-400">kWh</span>
              </div>
              <div className="mt-2 text-xs text-rose-400/90 font-medium">
                Impacto: R$ {preditivaData?.otimizacaoLimpeza?.perdaDiariaRS?.toFixed(2) || "--"}/dia
              </div>
            </div>
          </div>

          {/* Main Chart: Real vs Digital Twin pvlib */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-400" />
                  Curva de Geração Real vs. Digital Twin (pvlib)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparação da telemetria de 5 minutos com o modelo físico solarimétrico (ceifamento nominal a {capCA} kW).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                {/* Seletor de Escala do Gráfico: Automática vs Nominal */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setEscalaGrafico("AUTO")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      escalaGrafico === "AUTO"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Ajusta o eixo vertical dinamicamente ao pico real da geração"
                  >
                    🔍 Escala Auto (Pico: {picoMaxCurva.toFixed(0)} kW)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscalaGrafico("NOMINAL")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      escalaGrafico === "NOMINAL"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Exibe o gráfico na escala nominal total dos inversores da usina"
                  >
                    📐 Escala Nominal ({capCA} kW)
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-300 font-medium">Geração Real</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-cyan-400" />
                  <span className="text-slate-300 font-medium">Esperada (pvlib)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 border-t-2 border-dashed border-rose-400" />
                  <span className="text-slate-300 font-medium">Sem Ceifamento</span>
                </div>
              </div>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={preditivaData?.curvaComparativa || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    domain={[0, escalaGrafico === "AUTO" ? yAxisMaxAuto : capCA]}
                    unit=" kW"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: any, name: any) => {
                      if (name === "realKW") return [`${Number(value).toFixed(1)} kW`, "Geração Real"];
                      if (name === "expectedKW") return [`${Number(value).toFixed(1)} kW`, "Esperada pvlib (com teto)"];
                      if (name === "unclippedKW") return [`${Number(value).toFixed(1)} kW`, "Potência sem Ceifamento"];
                      return [value, String(name || "")];
                    }}
                  />
                  <Area type="monotone" dataKey="realKW" stroke="#f59e0b" strokeWidth={2.5} fill="url(#realGradient)" name="realKW" />
                  <Line type="monotone" dataKey="expectedKW" stroke="#06b6d4" strokeWidth={2} dot={false} name="expectedKW" />
                  <Line type="monotone" dataKey="unclippedKW" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="unclippedKW" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Loss Waterfall & Smart Cleaning */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Cascata de Perdas Prescinto (Loss Waterfall)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Decomposição física da energia teórica STC até a entrega real na rede.
                </p>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={preditivaData?.waterfall || []} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="etapa" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => [`${Math.abs(Number(val)).toFixed(1)} kWh`, "Valor"]}
                    />
                    <Bar dataKey="valorKWh" radius={[4, 4, 0, 0]}>
                      {(preditivaData?.waterfall || []).map((entry: any, index: number) => {
                        let fill = "#3b82f6";
                        if (entry.tipo === "base") fill = "#6366f1";
                        if (entry.tipo === "perda") fill = "#ef4444";
                        if (entry.tipo === "resultado") fill = "#10b981";
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-cyan-400" />
                    Smart Cleaning Dispatcher
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Otimizador financeiro de lavagem baseado no Soiling Ratio IEC 61724-1.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Perda diária por Sujidade:</span>
                    <span className="font-semibold text-rose-400">
                      R$ {preditivaData?.otimizacaoLimpeza?.perdaDiariaRS?.toFixed(2) || "0,00"}/dia
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Custo Estimado de Limpeza:</span>
                    <span className="font-semibold text-slate-200">
                      R$ {preditivaData?.otimizacaoLimpeza?.custoLavagemEstimadoRS?.toLocaleString("pt-BR") || "4.500,00"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1.5">
                    <span>Ponto Ótimo de Payback:</span>
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
                  {preditivaData?.otimizacaoLimpeza?.recomendacao?.mensagem || "Módulos em condições normais."}
                </div>
              </div>

              <button
                onClick={() =>
                  abrirModalOSComTipo(
                    "limpeza_modulos",
                    "4500",
                    `Lavagem programada via Smart Cleaning Dispatcher na data ${dataSelecionada}. Perda atual: R$ ${preditivaData?.otimizacaoLimpeza?.perdaDiariaRS?.toFixed(2)}/dia.`
                  )
                }
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/40 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/20"
              >
                <Wrench className="w-4 h-4 text-white" /> Programar Ordem de Serviço (OS de Lavagem)
              </button>
            </div>
          </div>

          {/* String-Level Diagnosis */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-amber-400" />
                  Diagnóstico String a String (4 Estados: Normal, Sujidade, Fusível, NC)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Diferenciação precisa entre portas vazias de fábrica (NC) e fusíveis queimados em operação.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
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
                  Alerta Sujidade ({preditivaData?.diagnosticoStrings?.comAlerta || 0})
                </button>
                <button
                  onClick={() => setStringFilter("FUSIVEL")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    stringFilter === "FUSIVEL"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Fusível Queimado ({preditivaData?.diagnosticoStrings?.falhasFusivel || 0})
                </button>
                <button
                  onClick={() => setStringFilter("NC")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    stringFilter === "NC"
                      ? "bg-slate-700 text-slate-200 border border-slate-600 font-bold"
                      : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Entrada Vazia NC ({preditivaData?.diagnosticoStrings?.naoConectadasNC || 0})
                </button>
              </div>
            </div>

            {/* Strings Table */}
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Identificador</th>
                    <th className="py-2.5 px-3">Inversor</th>
                    <th className="py-2.5 px-3">Corrente Pico (A)</th>
                    <th className="py-2.5 px-3">Tensão (V)</th>
                    <th className="py-2.5 px-3">Desvio (ΔI%)</th>
                    <th className="py-2.5 px-3">Diagnóstico Físico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stringsFiltradas.slice(0, 50).map((s: any, idx: number) => {
                    let badge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        NORMAL
                      </span>
                    );
                    if (s.status === "ALERTA_SUJIDADE") {
                      badge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          ALERTA SUJIDADE
                        </span>
                      );
                    } else if (s.status === "FALHA_FUSIVEL") {
                      badge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          FUSÍVEL QUEIMADO
                        </span>
                      );
                    } else if (s.status === "NAO_CONECTADA_NC") {
                      badge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          ENTRADA VAZIA (NC)
                        </span>
                      );
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-white">{s.stringName}</td>
                        <td className="py-2 px-3 text-slate-400">{s.inversor}</td>
                        <td className="py-2 px-3 font-semibold text-white">{s.correnteMedia.toFixed(2)} A</td>
                        <td className="py-2 px-3 text-slate-300">{s.tensao ? `${s.tensao.toFixed(1)} V` : "--"}</td>
                        <td className="py-2 px-3">
                          <span
                            className={
                              s.status === "NAO_CONECTADA_NC"
                                ? "text-slate-500"
                                : s.desvioPercent < -15
                                ? "text-rose-400 font-bold"
                                : "text-emerald-400"
                            }
                          >
                            {s.status === "NAO_CONECTADA_NC" ? "--" : `${s.desvioPercent > 0 ? "+" : ""}${s.desvioPercent}%`}
                          </span>
                        </td>
                        <td className="py-2 px-3">{badge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ABA 2: RELATÓRIO DE STRINGS & FUSÍVEIS POR INVERSOR (NOVA ABA) */}
      {abaAtiva === "STRINGS_FUSIVEIS" && (
        <div className="space-y-6">
          {/* Sub-header e Controles */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2.5">
                  <ZapOff className="w-5 h-5 text-rose-400" />
                  Relatório Técnico de Strings & Fusíveis Queimados por Inversor
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Mapeamento elétrico por inversor SUN2000 identificando fusíveis gPV abertos (tensão presente e corrente nula) e séries desconectadas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-cyan-400" /> Imprimir Ordem de Campo (Checklist)
                </button>

                <button
                  onClick={() =>
                    abrirModalOSComTipo(
                      "troca_fusivel",
                      "1200",
                      `Substituição emergencial de fusíveis cerâmicos gPV 15A 1000V DC para restabelecimento das strings inoperantes identificadas em ${dataSelecionada}.`
                    )
                  }
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  <Wrench className="w-4 h-4" /> Abrir OS Geral de Fusíveis
                </button>
              </div>
            </div>

            {/* Filtros da Aba de Strings */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider">Usina:</span>
                  <select
                    value={filtroUsinaStrings}
                    onChange={(e) => setFiltroUsinaStrings(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
                  >
                    <option value="TODAS">TODAS AS USINAS (Portfólio Consolidado)</option>
                    {listaUsinas.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        [{u.apiFornecedor || "OUTROS"}] {u.nome} ({u.capacidadeKWp} kWp)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                  <input
                    type="checkbox"
                    id="chkApenasFalhas"
                    checked={apenasFalhasStrings}
                    onChange={(e) => setApenasFalhasStrings(e.target.checked)}
                    className="cursor-pointer accent-rose-500 rounded"
                  />
                  <label htmlFor="chkApenasFalhas" className="text-slate-300 cursor-pointer select-none">
                    Exibir apenas strings com anomalias / falhas
                  </label>
                </div>
              </div>

              {stringsReportData?.consolidadoComplexo && (
                <div className="text-slate-400">
                  Data Analisada: <b className="text-amber-400">{stringsReportData?.dataReferencia}</b>
                </div>
              )}
            </div>

            {/* Consolidated Summary KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-300 font-semibold uppercase tracking-wider">Fusíveis Queimados (gPV)</span>
                  <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
                    <ZapOff className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-rose-400">
                    {stringsReportData?.consolidadoComplexo?.totalFusivelQueimado ?? "--"}
                  </span>
                  <span className="text-xs text-slate-400">strings inoperantes</span>
                </div>
                <span className="text-[11px] text-slate-400 block">Tensão presente (V aprox. 850V) e I = 0A</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Séries Desconectadas / NC</span>
                  <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-amber-400">
                    {stringsReportData?.consolidadoComplexo?.totalDesligadas ?? 0}
                  </span>
                  <span className="text-xs text-slate-400">strings</span>
                </div>
                <span className="text-[11px] text-slate-400 block">Tensão nula (V &lt; 100V) ou conector solto</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Perda Diária Estimada</span>
                  <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-rose-400">
                    R$ {stringsReportData?.consolidadoComplexo?.perdaTotalRSDia?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                  </span>
                  <span className="text-xs text-slate-400">/dia</span>
                </div>
                <span className="text-[11px] text-slate-400 block">Sob radiação solar de pico</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Perda Mensal Projetada</span>
                  <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-amber-300">
                    R$ {stringsReportData?.consolidadoComplexo?.perdaTotalRSMes?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                  </span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <span className="text-[11px] text-slate-400 block">Tarifa referência: R$ 0,90/kWh</span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loadingStringsReport && (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-400" />
              <p className="text-sm font-semibold">Analisando strings e fusíveis de todos os inversores do complexo...</p>
            </div>
          )}

          {/* Relatório por Usina e por Inversor */}
          {!loadingStringsReport && (
            <div className="space-y-8">
              {(stringsReportData?.usinas || []).map((u: any) => (
                <div
                  key={u.usinaId}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-6 p-6"
                >
                  {/* Cabeçalho da Usina */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {u.capacidadeKWp} kWp CC / {u.capacidadeCA} kW CA
                        </span>
                        <h3 className="text-lg font-black text-white">{u.usinaNome}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Amostra de Pico: <b className="text-white">{u.horaPicoBRT || "--:--"} BRT</b> ({u.potenciaPicoKW?.toFixed(1) || "--"} kW) | Data Efetiva: <b className="text-amber-400">{u.dataAnalisada}</b>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[11px]">Total com Falha:</span>
                        <span className="text-base font-extrabold text-rose-400">
                          {u.resumo.fusivelQueimadoCount} Fusíveis Queimados
                        </span>
                      </div>
                      <div className="text-right border-l border-slate-800 pl-4">
                        <span className="text-slate-400 block text-[11px]">Perda Diária da Usina:</span>
                        <span className="text-base font-extrabold text-amber-300">
                          R$ {u.resumo.perdaTotalRSDia?.toFixed(2)}/dia
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Inversores da Usina */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {(u.inversores || []).map((inv: any) => (
                      <div
                        key={inv.inversorId}
                        className={`rounded-xl border p-5 space-y-4 transition-colors ${
                          inv.status === "CRITICO"
                            ? "bg-slate-950/80 border-rose-800/40 hover:border-rose-700/60"
                            : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Header do Inversor */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-cyan-400" />
                                {inv.inversorNome}
                              </h4>
                              {inv.status === "CRITICO" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                                  CRÍTICO ({inv.resumo.fusivelQueimado} FUSÍVEIS)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  NORMAL
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Modelo: <b className="text-slate-300">{inv.modelo}</b> | Serial: <code className="text-cyan-300">{inv.serial}</code>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                abrirModalOSComTipo(
                                  "troca_fusivel",
                                  `${inv.resumo.fusivelQueimado * 150 || 600}`,
                                  `Substituição de ${inv.resumo.fusivelQueimado} fusíveis gPV no ${inv.inversorNome} (${inv.serial}) da usina ${u.usinaNome}. Strings afetadas: ${inv.stringsAfetadas.map((s: any) => s.stringName).join(", ")}.`
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                            >
                              Abrir OS deste Inversor
                            </button>
                          </div>
                        </div>

                        {/* Mini Resumo do Inversor */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                            <span className="text-slate-400 block text-[10px]">Strings Normais</span>
                            <span className="font-bold text-emerald-400">{inv.resumo.normais}</span>
                          </div>
                          <div className="p-2 bg-rose-950/20 rounded-lg border border-rose-800/30">
                            <span className="text-rose-400 block text-[10px]">Fusíveis Queimados</span>
                            <span className="font-bold text-rose-400">{inv.resumo.fusivelQueimado}</span>
                          </div>
                          <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                            <span className="text-slate-400 block text-[10px]">Perda Diária</span>
                            <span className="font-bold text-amber-400">R$ {inv.resumo.perdaRSDia?.toFixed(2)}/dia</span>
                          </div>
                        </div>

                        {/* Tabela de Strings Afetadas */}
                        {inv.stringsAfetadas.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/30 rounded-lg">
                            Nenhuma string com anomalia neste inversor.
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                                <tr>
                                  <th className="py-2 px-2.5">String</th>
                                  <th className="py-2 px-2.5">MPPT</th>
                                  <th className="py-2 px-2.5">Tensão (V)</th>
                                  <th className="py-2 px-2.5">Corrente (A)</th>
                                  <th className="py-2 px-2.5">Diagnóstico Técnico</th>
                                  <th className="py-2 px-2.5">Perda</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {inv.stringsAfetadas.map((s: any, sIdx: number) => {
                                  let statusBadge = (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                      FUSÍVEL GPV ABERTO
                                    </span>
                                  );
                                  if (s.status === "NAO_CONECTADA_NC") {
                                    statusBadge = (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                        PORTA VAZIA (NC)
                                      </span>
                                    );
                                  } else if (s.status === "DESLIGADA_ABERTA" || s.status === "DESLIGADA_NC") {
                                    statusBadge = (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                        STRING DESCONECTADA
                                      </span>
                                    );
                                  } else if (s.status === "SUBGERACAO") {
                                    statusBadge = (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                                        SUBGERAÇÃO
                                      </span>
                                    );
                                  }

                                  return (
                                    <tr key={sIdx} className="hover:bg-slate-800/30 transition-colors">
                                      <td className="py-2 px-2.5 font-mono font-bold text-white">{s.stringName}</td>
                                      <td className="py-2 px-2.5 text-cyan-300 font-semibold">{s.mppt}</td>
                                      <td className="py-2 px-2.5 font-medium text-slate-200">{s.tensaoV} V</td>
                                      <td className={`py-2 px-2.5 font-bold ${s.correnteA > 0 ? "text-amber-400" : "text-rose-400"}`}>{s.correnteA.toFixed(2)} A</td>
                                      <td className="py-2 px-2.5">
                                        <div>{statusBadge}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] truncate" title={s.diagnostico}>
                                          {s.acaoRecomendada}
                                        </div>
                                      </td>
                                      <td className={`py-2 px-2.5 font-bold whitespace-nowrap ${s.perdaRSDia > 0 ? "text-rose-400" : "text-slate-500"}`}>
                                        {s.perdaRSDia > 0 ? `-R$ ${s.perdaRSDia?.toFixed(2)}/dia` : "R$ 0,00"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Checklist para Equipe de Campo / Eletricistas (Pronto para Impressão) */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 print:bg-white print:text-black">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Procedimento Padrão para Manutenção de Fusíveis de Strings (Checklist de Campo)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Protocolo de segurança NR-10 para substituição de fusíveis gPV 15A 1000V DC nos inversores SUN2000.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="space-y-2 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="font-bold text-cyan-400 block">Etapas de Segurança Obrigatórias:</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>Desligar a chave seccionadora CC do inversor correspondente antes de abrir o porta-fusível.</li>
                  <li>Utilizar EPIs adequados: Luvas isolantes classe 0 (1.000V) e óculos de proteção com proteção UV.</li>
                  <li>Medir a ausência de corrente com alicate amperímetro CC tipo clamp antes de extrair o fusível.</li>
                  <li>Inspecionar a caixa de fusíveis quanto a sinais de arco elétrico ou aquecimento excessivo.</li>
                </ul>
              </div>

              <div className="space-y-2 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="font-bold text-emerald-400 block">Especificação do Fusível de Reposição:</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li><b>Tipo:</b> Fusível Cerâmico Fotovoltaico Classe gPV (10x38 mm).</li>
                  <li><b>Tensão Nominal:</b> 1.000V DC (ou 1.500V DC conforme o string-box).</li>
                  <li><b>Corrente Nominal:</b> 15A (adequado para módulos de até 600Wp com Isc ~14A).</li>
                  <li><b>Capacidade de Ruptura:</b> 30 kA a 1.000V DC.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: BENCHMARK MULTI-USINA */}
      {abaAtiva === "BENCHMARK" && (
        <div className="space-y-6">
          {/* Weather Station Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-800/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {benchmarkData?.estacao?.nome || "Estação Solarimétrica Sigma"} (Compartilhada)
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    ONLINE (Fuso UTC Calibrado)
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Referência meteorológica unificada para o Complexo Solar Manga Grande (UFV 1, UFV 2 e UFV 3).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-center">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Irradiação Acumulada</span>
                <span className="text-xl font-black text-cyan-300">
                  {benchmarkData?.estacao?.irradiacaoDiaKWhM2 || "--"} kWh/m²
                </span>
              </div>
              <div className="border-l border-slate-800 pl-6">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Irradiância de Pico</span>
                <span className="text-xl font-black text-amber-400">
                  {benchmarkData?.estacao?.irradianciaPicoW || "--"} W/m²
                </span>
              </div>
            </div>
          </div>

          {/* Comparative Cards: UFV 1, 2, 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(benchmarkData?.usinas || []).map((u: any, idx: number) => (
              <div
                key={u.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 relative overflow-hidden group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-white">{u.nome}</h4>
                    <span className="text-xs text-slate-400">1.400 kWp CC / 1.000 kW CA</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {idx + 1}º Lugar
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">Geração Diária:</span>
                    <span className="text-lg font-bold text-white">{u.energiaDiaKWh.toLocaleString("pt-BR")} kWh</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">Geração Específica:</span>
                    <span className="text-lg font-bold text-cyan-400">{u.geracaoEspecificaKWhKWp} kWh/kWp</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">Performance Ratio:</span>
                    <span className="text-lg font-bold text-emerald-400">{u.performanceRatio}%</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">Total 2026 (MWh):</span>
                    <span className="text-lg font-bold text-amber-400">{u.totalAcumuladoAnoMWh.toLocaleString("pt-BR")} MWh</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] flex justify-between text-slate-400">
                  <span>Perda Clipping: <b className="text-rose-400">{u.perdaClippingKWh} kWh</b></span>
                  <span>Perda Sujidade: <b className="text-amber-400">{u.perdaSujidadeKWh} kWh</b></span>
                </div>
              </div>
            ))}
          </div>

          {/* Overlaid Generation Curves Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Curvas de Potência Sobrepostas (Benchmark Diário)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparação direta da curva de geração de Manga Grande 01, 02 e 03 contra a irradiância da Estação Sigma.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-amber-500" />
                  <span className="text-slate-300">UFV 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-cyan-400" />
                  <span className="text-slate-300">UFV 2</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-purple-400" />
                  <span className="text-slate-300">UFV 3</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-yellow-400 border-t border-dashed" />
                  <span className="text-slate-300">Irradiância GHI (W/m²)</span>
                </div>
              </div>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={benchmarkData?.curvaComparativa || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    domain={[0, (dataMax: number) => Math.ceil(Math.max((dataMax || 0) * 1.15, 50))]}
                    unit=" kW"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    domain={[0, (dataMax: number) => Math.ceil(Math.max((dataMax || 0) * 1.15, 100))]}
                    unit=" W/m²"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="cmp8hqv4400h9wgv5c9f2tdbh" stroke="#f59e0b" strokeWidth={2} dot={false} name="UFV 1 (kW)" />
                  <Line yAxisId="left" type="monotone" dataKey="cmp8qki8u00050wv5m092pu9g" stroke="#06b6d4" strokeWidth={2} dot={false} name="UFV 2 (kW)" />
                  <Line yAxisId="left" type="monotone" dataKey="cmtur27em00nel4v55jwzfpah" stroke="#a855f7" strokeWidth={2} dot={false} name="UFV 3 (kW)" />
                  <Line yAxisId="right" type="monotone" dataKey="ghi" stroke="#eab308" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Irradiância GHI (W/m²)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking & Performance Summary Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Ranking de Eficiência Operacional do Complexo Manga Grande
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Classificação baseada no rendimento específico (kWh/kWp) sob as mesmas condições climáticas da Estação Sigma.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Classificação</th>
                    <th className="py-2.5 px-3">Usina Solar</th>
                    <th className="py-2.5 px-3">Geração Específica</th>
                    <th className="py-2.5 px-3">Performance Ratio (PR)</th>
                    <th className="py-2.5 px-3">Geração Entregue</th>
                    <th className="py-2.5 px-3">Desempenho Relativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(benchmarkData?.ranking || []).map((r: any) => (
                    <tr key={r.posicao} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-amber-400">
                        {r.posicao === 1 ? "🥇 1º Lugar" : r.posicao === 2 ? "🥈 2º Lugar" : "🥉 3º Lugar"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{r.nome}</td>
                      <td className="py-2.5 px-3 font-bold text-cyan-400">{r.geracaoEspecifica} kWh/kWp</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{r.pr}%</td>
                      <td className="py-2.5 px-3 font-medium text-white">
                        {(benchmarkData?.usinas?.find((u: any) => u.id === r.usinaId)?.energiaDiaKWh || 0).toLocaleString("pt-BR")} kWh
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {r.posicao === 1 ? "LÍDER DO COMPLEXO" : "OPERACIONAL"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: RELATÓRIO DE STATUS DA USINA (PROBLEMAS ENCONTRADOS) */}
      {abaAtiva === "STATUS_USINA" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rose-400" />
                  Relatório Executivo de Status & Diagnóstico de Anomalias
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Usina: <b className="text-white">{relatoriosData?.usina?.nome}</b> | Data de Referência: <b className="text-amber-400">{dataSelecionada}</b>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Exportar Relatório
                </button>
                <button
                  onClick={() =>
                    abrirModalOSComTipo(
                      "troca_fusivel",
                      "800",
                      `Substituição dos fusíveis gPV queimados identificados no relatório de ${dataSelecionada}.`
                    )
                  }
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  <Wrench className="w-4 h-4" /> Abrir OS para os Problemas
                </button>
              </div>
            </div>

            {/* Financial Impact Banner */}
            <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Impacto Financeiro Total das Anomalias</h4>
                  <p className="text-xs text-slate-400">
                    Perda financeira diária somando sujeira nos módulos, fusíveis queimados e perda térmica.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-rose-400">
                  R$ {relatoriosData?.relatorioStatus?.totalPerdaIdentificadaRS?.toFixed(2) || "0,00"}/dia
                </span>
                <span className="block text-xs text-slate-400">
                  ~ R$ {((relatoriosData?.relatorioStatus?.totalPerdaIdentificadaRS || 0) * 30).toFixed(2)}/mês
                </span>
              </div>
            </div>

            {/* List of Found Problems */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Anomalias & Gargalos Identificados pelo Algoritmo Preditivo
              </h4>

              <div className="grid grid-cols-1 gap-4">
                {(relatoriosData?.relatorioStatus?.problemas || []).map((p: any) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.severidade === "CRITICA"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              : p.severidade === "ALTA"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : p.severidade === "MEDIA"
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          SEVERIDADE: {p.severidade}
                        </span>
                        <h5 className="text-sm font-bold text-white">{p.titulo}</h5>
                      </div>

                      <div className="text-xs font-semibold text-rose-400">
                        Perda: -{p.impactoKWhDia} kWh/dia (R$ {p.impactoRSDia}/dia)
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{p.descricao}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-cyan-400">Recomendação Técnica:</span>
                        <span>{p.acaoRecomendada}</span>
                      </div>

                      {p.paybackDias && (
                        <div className="text-cyan-300 font-bold bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-800/40 text-[11px]">
                          Payback: {p.paybackDias} dias
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: RELATÓRIO DE PROBLEMAS SANADOS E VALOR SALVO */}
      {abaAtiva === "SANADOS" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                  Relatório de Problemas Sanados & Retorno Financeiro
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Histórico de manutenções executadas, energia recuperada e valor financeiro salvo na usina.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir Relatório
                </button>
                <button
                  onClick={() =>
                    abrirModalOSComTipo(
                      "limpeza_modulos",
                      "4500",
                      "Ação corretiva registrada após intervenção de campo."
                    )
                  }
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Registrar Problema Sanado
                </button>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Custo Total de O&M Investido</span>
                <span className="text-2xl font-extrabold text-slate-200">
                  R$ {relatoriosData?.relatorioSanados?.totalCustoOMRS?.toLocaleString("pt-BR") || "0,00"}
                </span>
                <span className="text-[11px] text-slate-500 block">Total de intervenções registradas</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
                <span className="text-xs text-emerald-400 uppercase tracking-wider block">Valor Financeiro Salvo</span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  R$ {relatoriosData?.relatorioSanados?.totalValorSalvoRS?.toLocaleString("pt-BR") || "0,00"}
                </span>
                <span className="text-[11px] text-emerald-400/80 block">Energia evitada de ser perdida</span>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-1">
                <span className="text-xs text-cyan-400 uppercase tracking-wider block">Ganho Financeiro Líquido</span>
                <span className="text-2xl font-extrabold text-cyan-300">
                  R$ {relatoriosData?.relatorioSanados?.totalGanhoLiquidoRS?.toLocaleString("pt-BR") || "0,00"}
                </span>
                <span className="text-[11px] text-cyan-400/80 block">Retorno Líquido pós-manutenção</span>
              </div>
            </div>

            {/* Table of Resolved Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Intervenções e Ações Corretivas Concluídas
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Tipo de Intervenção</th>
                      <th className="py-2.5 px-3">Responsável</th>
                      <th className="py-2.5 px-3">Custo (R$)</th>
                      <th className="py-2.5 px-3">Energia Recuperada</th>
                      <th className="py-2.5 px-3">Valor Salvo (R$)</th>
                      <th className="py-2.5 px-3">Retorno Líquido</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(relatoriosData?.relatorioSanados?.acoes || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500">
                          Nenhuma ação corretiva registrada ainda. Clique em "Registrar Problema Sanado" para incluir.
                        </td>
                      </tr>
                    ) : (
                      (relatoriosData?.relatorioSanados?.acoes || []).map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono">{a.dataExecucao}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{a.tipoAcaoFormatado}</td>
                          <td className="py-2.5 px-3 text-slate-400">{a.executadoPor}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-300">
                            R$ {a.custoIntervencaoRS.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-cyan-400">
                            +{a.energiaRecuperadaDiaKWh} kWh/dia
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-400">
                            R$ {a.valorSalvoTotalRS.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-cyan-300">
                            +R$ {a.ganhoLiquidoRS.toLocaleString("pt-BR")} ({a.roiPercent}%)
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              SANADO
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE ORDEM DE SERVIÇO (OS) */}
      {modalOSOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-400" />
                Programar Ordem de Serviço (OS) & Ação Corretiva
              </h3>
              <button
                onClick={() => setModalOSOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarOS} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Tipo de Intervenção:</label>
                <select
                  value={tipoAcaoOS}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTipoAcaoOS(val);
                    if (val === "limpeza_modulos") setCustoEstimadoOS("4500");
                    else if (val === "troca_fusivel") setCustoEstimadoOS("800");
                    else if (val === "reparo_string") setCustoEstimadoOS("1200");
                    else setCustoEstimadoOS("600");
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="limpeza_modulos">Lavagem Completa dos Módulos (Sujidade / Soiling)</option>
                  <option value="troca_fusivel">Substituição de Fusíveis Queimados gPV</option>
                  <option value="reparo_string">Inspeção e Reparo de Conexões de Strings</option>
                  <option value="limpeza_coolers">Limpeza e Manutenção Térmica dos Inversores</option>
                  <option value="poda_vegetacao">Poda de Vegetação / Desobstrução</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Data de Execução:</label>
                  <input
                    type="date"
                    value={dataExecucaoOS}
                    onChange={(e) => setDataExecucaoOS(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Custo Estimado (R$):</label>
                  <input
                    type="number"
                    value={custoEstimadoOS}
                    onChange={(e) => setCustoEstimadoOS(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Técnico / Equipe Responsável:</label>
                <input
                  type="text"
                  value={executadoPorOS}
                  onChange={(e) => setExecutadoPorOS(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Observações Técnicas:</label>
                <textarea
                  rows={3}
                  value={observacoesOS}
                  onChange={(e) => setObservacoesOS(e.target.value)}
                  placeholder="Descreva as strings inspecionadas, número de módulos limpos, etc."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-300 block">Retorno Financeiro Estimado:</span>
                  <span className="text-[11px] text-slate-400">
                    Recuperação de até {tipoAcaoOS === "limpeza_modulos" ? "675 kWh/dia" : "237 kWh/dia"} (R${" "}
                    {tipoAcaoOS === "limpeza_modulos" ? "608,31/dia" : "213,75/dia"})
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-900/60 px-2 py-1 rounded">
                  Payback: ~{Math.round(parseFloat(custoEstimadoOS || "4500") / (tipoAcaoOS === "limpeza_modulos" ? 608 : 213))} dias
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOSOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoOS}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  {salvandoOS && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar e Gerar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Upload da Estação Sigma */}
      {modalUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Upload de Telemetria — Estação Sigma
              </h3>
              <button
                onClick={() => setModalUploadOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadEstacao} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-6 text-center space-y-2 transition-colors">
                <CloudSun className="w-10 h-10 text-cyan-400 mx-auto" />
                <div className="text-xs text-slate-300 font-medium">
                  Selecione a planilha Excel ou CSV exportada da Estação Sigma
                </div>
                <p className="text-[11px] text-slate-500">GHI, POA, Temperatura do Módulo, Ambiente e Vento</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-2 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                />
              </div>

              {uploadMsg && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    uploadMsg.tipo === "sucesso"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {uploadMsg.tipo === "sucesso" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{uploadMsg.texto}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalUploadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Processar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação Manual de Telemetria (Excel / Copiar & Colar) */}
      <ManualTelemetryModal
        isOpen={modalImportManualOpen}
        onClose={() => setModalImportManualOpen(false)}
        onSuccess={(data) => {
          setToastMsg(data.mensagem || "Telemetria importada com sucesso!");
          setTimeout(() => setToastMsg(null), 5000);
          fetchPreditiva();
          fetchRelatorios();
          if (abaAtiva === "BENCHMARK") fetchBenchmark();
          if (abaAtiva === "STRINGS_FUSIVEIS") fetchStringsReport();
        }}
        defaultUsinaId={usinaId}
        usinasList={listaUsinas}
      />
    </div>
  );
}
