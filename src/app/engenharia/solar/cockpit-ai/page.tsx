"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Zap,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  TrendingDown,
  TrendingUp,
  Activity,
  Cpu,
  Droplets,
  Wrench,
  Sparkles,
  RefreshCw,
  Send,
  Sliders,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

export default function CockpitSolarAiPage() {
  const [usinas, setUsinas] = useState<any[]>([]);
  const [usinaId, setUsinaId] = useState<string>("cmp8hqv4400h9wgv5c9f2tdbh");
  const [dataSelecionada, setDataSelecionada] = useState<string>("2026-09-04");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [gerandoGemini, setGerandoGemini] = useState<boolean>(false);
  const [despachandoOS, setDespachandoOS] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const [diagnostico, setDiagnostico] = useState<any | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<
    "NORMAS" | "INVERSORES_CABINE" | "STRINGS" | "PARECER_IA"
  >("NORMAS");

  // Carregar Usinas cadastradas
  useEffect(() => {
    async function carregarUsinas() {
      try {
        const res = await fetch("/api/solar/extrator");
        const data = await res.json();
        if (data.success && data.usinas) {
          setUsinas(data.usinas);
          if (data.usinas.length > 0 && !usinaId) {
            setUsinaId(data.usinas[0].id);
          }
        }
      } catch (e) {
        console.error("Erro ao listar usinas:", e);
      }
    }
    carregarUsinas();
  }, []);

  // Executar Diagnóstico IA
  async function executarDiagnostico(gemini = false) {
    if (!usinaId) return;
    setCarregando(true);
    setMensagemSucesso(null);
    try {
      const res = await fetch(
        `/api/solar/ai-diagnostico?usinaId=${usinaId}&date=${dataSelecionada}&gemini=${gemini}`
      );
      const data = await res.json();
      if (data.success) {
        setDiagnostico(data.diagnostico);
      } else {
        alert(data.error || "Erro ao rodar diagnóstico");
      }
    } catch (e: any) {
      alert("Falha na comunicação com o servidor de IA: " + e.message);
    } finally {
      setCarregando(false);
      setGerandoGemini(false);
    }
  }

  // Executar ao selecionar usina ou data
  useEffect(() => {
    if (usinaId) {
      executarDiagnostico(false);
    }
  }, [usinaId, dataSelecionada]);

  // Despachar O.S. para o campo
  async function despacharParaCampo() {
    if (!diagnostico || !diagnostico.ordensServicoSugeridas?.length) return;
    setDespachandoOS(true);
    try {
      const res = await fetch(
        `/api/solar/ai-diagnostico?usinaId=${usinaId}&date=${dataSelecionada}&salvarOS=true`
      );
      const data = await res.json();
      if (data.success) {
        setMensagemSucesso(
          `🚀 ${diagnostico.ordensServicoSugeridas.length} Ordens de Serviço foram despachadas para a Equipe de Campo!`
        );
        setTimeout(() => setMensagemSucesso(null), 6000);
      }
    } catch (e: any) {
      alert("Erro ao despachar O.S.: " + e.message);
    } finally {
      setDespachandoOS(false);
    }
  }

  const compliance = diagnostico?.complianceNormativo;
  const desempenho = diagnostico?.desempenho;
  const strings = diagnostico?.strings;
  const cabine = diagnostico?.cabine;
  const otimizacao = diagnostico?.otimizacaoLimpeza;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* CABEÇALHO DO COCKPIT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200 bg-clip-text text-transparent">
                Cockpit de IA & Engenharia Solar
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Auditoria Normativa Contínua (NBRs & PRODIST), Diagnóstico Multiescala e Maximização de Potência
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES E BOTÕES DE AÇÃO */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Seletor de Usina */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs md:text-sm">
            <Layers className="w-4 h-4 text-amber-400" />
            <select
              value={usinaId}
              onChange={(e) => setUsinaId(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              {usinas.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Data */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs md:text-sm">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Botão Executar Diagnóstico */}
          <button
            onClick={() => executarDiagnostico(false)}
            disabled={carregando}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? "animate-spin text-amber-400" : ""}`} />
            <span>Atualizar</span>
          </button>

          {/* Botão Gerar Parecer com Gemini */}
          <button
            onClick={() => {
              setGerandoGemini(true);
              executarDiagnostico(true);
            }}
            disabled={gerandoGemini || carregando}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium shadow-md shadow-purple-600/20 transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${gerandoGemini ? "animate-spin" : ""}`} />
            <span>{gerandoGemini ? "Gerando Parecer..." : "Parecer Técnico (Gemini)"}</span>
          </button>

          {/* Atalho para Painel de Campo */}
          <Link
            href="/engenharia/solar/campo-os"
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs md:text-sm shadow-md shadow-amber-500/20 transition"
          >
            <Wrench className="w-4 h-4" />
            <span>Painel de Campo (O.S.)</span>
          </Link>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO */}
      {mensagemSucesso && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg shadow-emerald-950/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{mensagemSucesso}</span>
        </div>
      )}

      {/* CARDS DE KPIS ESTRATÉGICOS (TOPO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Performance Ratio & Yield */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Desempenho & PR
            </span>
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {desempenho ? `${desempenho.performanceRatioReal}%` : "--"}
            </span>
            <span className="text-xs text-slate-400">
              (Meta: {desempenho ? `${desempenho.performanceRatioEsperado}%` : "--"})
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Yield: <strong className="text-slate-200">{desempenho?.yieldRealKWhKWp || "--"} kWh/kWp</strong></span>
            <span>Real: <strong className="text-amber-400">{desempenho?.energiaRealKWh?.toLocaleString("pt-BR") || "--"} kWh</strong></span>
          </div>
        </div>

        {/* KPI 2: Perda Financeira Diária Total */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Perda Financeira Total
            </span>
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">
              {desempenho ? `R$ ${desempenho.perdaFinanceiraDiariaRS?.toFixed(2)}` : "--"}
            </span>
            <span className="text-xs text-slate-400">/dia</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Mês Est.: <strong className="text-rose-300">R$ {desempenho ? (desempenho.perdaFinanceiraDiariaRS * 30).toFixed(0) : "--"}</strong></span>
            <span>Perda: <strong className="text-slate-200">{desempenho?.perdaTotalKWh || "--"} kWh</strong></span>
          </div>
        </div>

        {/* KPI 3: Score de Compliance Normativo */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Compliance NBRs & ANEEL
            </span>
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${
              (compliance?.scoreConformidadePercent || 0) >= 80
                ? "text-emerald-400"
                : (compliance?.scoreConformidadePercent || 0) >= 60
                ? "text-amber-400"
                : "text-rose-400"
            }`}>
              {compliance ? `${compliance.scoreConformidadePercent}%` : "--"}
            </span>
            <span className="text-xs text-slate-400">
              ({compliance?.conformes || 0} de {compliance?.totalParametros || 0} OK)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Alertas: <strong className="text-amber-400">{compliance?.alertas || 0}</strong></span>
            <span>Não Conformes: <strong className="text-rose-400">{compliance?.naoConformes || 0}</strong></span>
          </div>
        </div>

        {/* KPI 4: Otimizador de Limpeza (Soiling) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Otimizador de Limpeza
            </span>
            <Droplets className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-xl font-bold ${
              otimizacao?.status === "URGENTE"
                ? "text-rose-400"
                : otimizacao?.status === "PROGRAMAR"
                ? "text-amber-400"
                : "text-emerald-400"
            }`}>
              {otimizacao?.status === "URGENTE"
                ? "LAVAGEM URGENTE"
                : otimizacao?.status === "PROGRAMAR"
                ? "PROGRAMAR LIMPEZA"
                : "MÓDULOS OK"}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Soiling: <strong className="text-slate-200">{otimizacao?.perdaDiariaRS ? `R$ ${otimizacao.perdaDiariaRS}/dia` : "--"}</strong></span>
            <span>Ponto Eq.: <strong className="text-cyan-400">{otimizacao?.diasAteEquilibrio || "--"} dias</strong></span>
          </div>
        </div>
      </div>

      {/* BOTÃO E BANNER DE DESPACHO PARA O CAMPO */}
      {diagnostico?.ordensServicoSugeridas?.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-300">
                A IA identificou {diagnostico.ordensServicoSugeridas.length} intervenções críticas para maximização de potência
              </h3>
              <p className="text-xs text-slate-400">
                Strings com fusível queimado, sujidade ou derating térmico somando perda de{" "}
                <strong className="text-amber-300">R$ {desempenho?.perdaFinanceiraDiariaRS?.toFixed(2)}/dia</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={despacharParaCampo}
              disabled={despachandoOS}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50 text-xs md:text-sm"
            >
              <Send className={`w-4 h-4 ${despachandoOS ? "animate-pulse" : ""}`} />
              <span>{despachandoOS ? "Despachando O.S..." : "Despachar Ordens de Serviço para Campo"}</span>
            </button>
            <Link
              href="/engenharia/solar/campo-os"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Abrir Painel de Campo"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO ENTRE ABAS DO COCKPIT */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setAbaAtiva("NORMAS")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold rounded-t-lg transition border-b-2 ${
            abaAtiva === "NORMAS"
              ? "border-amber-400 text-amber-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Compliance Normativo (NBRs / PRODIST)</span>
          {compliance?.naoConformes > 0 && (
            <span className="bg-rose-500/20 text-rose-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {compliance.naoConformes}
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva("STRINGS")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold rounded-t-lg transition border-b-2 ${
            abaAtiva === "STRINGS"
              ? "border-amber-400 text-amber-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Diagnóstico de Strings & Fusíveis</span>
          {strings?.falhasFusivel > 0 && (
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {strings.falhasFusivel}
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva("INVERSORES_CABINE")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold rounded-t-lg transition border-b-2 ${
            abaAtiva === "INVERSORES_CABINE"
              ? "border-amber-400 text-amber-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Inversores & Cabine Primária (PAC)</span>
        </button>

        <button
          onClick={() => setAbaAtiva("PARECER_IA")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold rounded-t-lg transition border-b-2 ${
            abaAtiva === "PARECER_IA"
              ? "border-purple-400 text-purple-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Parecer Técnico do Especialista (Gemini)</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {carregando ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">
            O Cordeiro Solar AI Engine está processando as grandezas de telemetria, simulando o modelo físico pvlib e auditando as normas vigentes...
          </p>
        </div>
      ) : (
        <div>
          {/* ABA 1: COMPLIANCE NORMATIVO */}
          {abaAtiva === "NORMAS" && (
            <div className="space-y-6">
              {/* Tabela de Auditoria das Normas */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      Matriz de Auditoria e Conformidade Técnica
                    </h3>
                    <p className="text-xs text-slate-400">
                      Verificação contínua contra NBR 5410, NBR 5419, NBR 16690, NBR 16274, NBR 14039 e PRODIST Módulo 8
                    </p>
                  </div>
                  <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full font-medium">
                    {compliance?.auditorias?.length || 0} Requisitos Auditados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Norma & Item</th>
                        <th className="py-3 px-4">Parâmetro Avaliado</th>
                        <th className="py-3 px-4">Medido vs. Limite</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Ação Técnica Recomendada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {compliance?.auditorias?.map((item: any, idx: number) => {
                        const isConforme = item.statusConformidade === "CONFORME";
                        const isAlerta = item.statusConformidade === "ALERTA";
                        const isNaoConforme = item.statusConformidade === "NAO_CONFORME";

                        return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-amber-300 block">{item.norma}</span>
                              <span className="text-[11px] text-slate-500">{item.itemNorma}</span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-200">
                              {item.parametroAvaliado}
                              <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                                {item.detalhes}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-mono text-xs">
                                <span className={isNaoConforme ? "text-rose-400 font-bold" : "text-slate-200"}>
                                  {item.valorMedido !== null ? `${item.valorMedido} ${item.unidade}` : "--"}
                                </span>
                                <span className="text-slate-500 block text-[10px]">
                                  (Limite: {item.valorLimite} {item.unidade})
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isConforme
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : isAlerta
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {isConforme ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : isAlerta ? (
                                  <AlertTriangle className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                <span>{item.statusConformidade}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs md:max-w-md">
                              {item.acaoCorretiva}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: STRINGS & FUSÍVEIS */}
          {abaAtiva === "STRINGS" && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      Diagnóstico String a String (Padrão Prescinto APM / IEC 61724-1)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Monitoradas: <strong className="text-slate-200">{strings?.totalMonitoradas}</strong> |
                      Ativas em condução: <strong className="text-emerald-400">{strings?.ativasConduzindo}</strong> |
                      Fusíveis queimados: <strong className="text-rose-400">{strings?.falhasFusivel}</strong> |
                      Portas vazias (NC): <strong className="text-slate-500">{strings?.naoConectadasNC}</strong>
                    </p>
                  </div>
                </div>

                {strings?.detalhesFalhas?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {strings.detalhesFalhas.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950/70 border border-rose-500/30 rounded-xl p-4 space-y-3 relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            {f.diagnostico}
                          </span>
                          <span className="text-[11px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                            {f.stringName}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Tensão MPPT</span>
                            <span className="font-mono font-bold text-slate-200">{f.tensaoV} V</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Corrente</span>
                            <span className="font-mono font-bold text-rose-400">{f.correnteA} A (0A)</span>
                          </div>
                        </div>

                        <div className="text-xs space-y-1 text-slate-300">
                          <p>📍 <strong>Localização:</strong> {f.localizacaoProvavel}</p>
                          <p>🔧 <strong>Peça Sugerida:</strong> {f.pecaSugerida}</p>
                          <p className="text-[11px] text-slate-400">📜 <em>NBR 16690 item 6.3.2 (Substituição de proteção gPV)</em></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    Nenhum fusível queimado ou circuito aberto detectado no arranjo fotovoltaico.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 3: INVERSORES & CABINE */}
          {abaAtiva === "INVERSORES_CABINE" && (
            <div className="space-y-6">
              {/* Card de Cabine Primária & Qualidade de Energia */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Cabine Primária & Qualidade de Energia no PAC (PRODIST Módulo 8)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">Desbalanço de Tensão (V2/V1)</span>
                    <span className="text-2xl font-bold text-slate-100 font-mono">
                      {cabine ? `${cabine.desbalancoTensaoPercent}%` : "--"}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">Limite ANEEL: &le; 3.0%</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">Fator de Potência (PAC)</span>
                    <span className="text-2xl font-bold text-emerald-400 font-mono">
                      {cabine ? `${cabine.fatorPotencia}` : "--"}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">Limite Mínimo: &ge; 0.920</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">Temp. Topo Óleo Trafo</span>
                    <span className="text-2xl font-bold text-slate-200 font-mono">
                      {cabine ? `${cabine.tempOleoTrafo}°C` : "--"}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">NBR 14039: &le; 85.0°C</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">Tensões de Fase CA</span>
                    <span className="text-sm font-bold text-slate-300 font-mono block mt-1">
                      A: {cabine?.tensaoFasesV?.A}V | B: {cabine?.tensaoFasesV?.B}V | C: {cabine?.tensaoFasesV?.C}V
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">Freq: {cabine?.frequenciaHz || 60} Hz</span>
                  </div>
                </div>
              </div>

              {/* Tabela de Inversores */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-amber-400" />
                    Intra-Plant Benchmark (Comparativo de Inversores)
                  </h3>
                  <span className="text-xs text-slate-400">
                    {diagnostico?.inversores?.length || 0} Inversores Monitorados
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Inversor</th>
                        <th className="py-3 px-4">Modelo / Serial</th>
                        <th className="py-3 px-4">Pico kW</th>
                        <th className="py-3 px-4">Energia Entregue</th>
                        <th className="py-3 px-4">Temp. IGBT</th>
                        <th className="py-3 px-4 text-center">Status Térmico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {diagnostico?.inversores?.map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-bold text-slate-200">{inv.nome}</td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-xs">{inv.serial}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-200">{inv.potenciaPicoKW} kW</td>
                          <td className="py-3 px-4 font-mono text-slate-300">{inv.energiaEntregueKWh} kWh</td>
                          <td className="py-3 px-4 font-mono">
                            <span className={inv.maxTempIGBT > 75 ? "text-amber-400 font-bold" : "text-slate-300"}>
                              {inv.maxTempIGBT}°C
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                inv.statusTermico === "NORMAL"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : inv.statusTermico === "ALERTA_VENTILACAO"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {inv.statusTermico}
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

          {/* ABA 4: PARECER TÉCNICO IA (GEMINI) */}
          {abaAtiva === "PARECER_IA" && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-purple-300">
                      Parecer Pericial de Engenharia Fotovoltaica
                    </h3>
                    <p className="text-xs text-slate-400">
                      Elaborado pelo Cordeiro Solar AI Engine com fundamentação nas normas técnicas ABNT e ANEEL
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => executarDiagnostico(true)}
                  disabled={gerandoGemini}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gerandoGemini ? "animate-spin" : ""}`} />
                  <span>{gerandoGemini ? "Reanalisando..." : "Regerar Parecer"}</span>
                </button>
              </div>

              {diagnostico?.parecerTecnicoIA ? (
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-950/70 p-6 rounded-xl border border-slate-800/80">
                  {diagnostico.parecerTecnicoIA}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm">Nenhum parecer técnico gerado ainda para esta data.</p>
                  <button
                    onClick={() => executarDiagnostico(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-lg shadow-purple-600/20 transition"
                  >
                    Gerar Parecer Completo com Gemini
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
