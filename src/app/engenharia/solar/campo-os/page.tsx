"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ShieldAlert,
  Sliders,
  Filter,
  CheckSquare,
  Play,
  Check,
  Camera,
  X,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  Zap,
} from "lucide-react";

export default function CampoOSPage() {
  const [ordens, setOrdens] = useState<any[]>([]);
  const [totais, setTotais] = useState<any>({
    total: 0,
    pendentes: 0,
    emAtendimento: 0,
    concluidas: 0,
    perdaFinanceiraTotalDia: 0,
  });
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [filtroGravidade, setFiltroGravidade] = useState<string>("TODAS");

  // Modal de Conclusão de O.S.
  const [osSelecionada, setOsSelecionada] = useState<any | null>(null);
  const [responsavelNome, setResponsavelNome] = useState("");
  const [observacoesCampo, setObservacoesCampo] = useState("");
  const [validarTelemetria, setValidarTelemetria] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregarOrdens() {
    setCarregando(true);
    try {
      let url = `/api/solar/ai-os?status=${filtroStatus}&gravidade=${filtroGravidade}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrdens(data.ordens);
        setTotais(data.totais);
      }
    } catch (e) {
      console.error("Erro ao buscar Ordens de Serviço:", e);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarOrdens();
  }, [filtroStatus, filtroGravidade]);

  // Iniciar atendimento de uma O.S.
  async function iniciarAtendimento(osId: string) {
    try {
      const res = await fetch("/api/solar/ai-os", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: osId,
          status: "EM_ATENDIMENTO",
        }),
      });
      const data = await res.json();
      if (data.success) {
        carregarOrdens();
      }
    } catch (e: any) {
      alert("Erro ao iniciar atendimento: " + e.message);
    }
  }

  // Finalizar atendimento de uma O.S.
  async function finalizarAtendimento() {
    if (!osSelecionada) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/solar/ai-os", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: osSelecionada.id,
          status: "CONCLUIDA",
          responsavelCampo: responsavelNome || "Técnico de Campo",
          observacoesCampo,
          validarTelemetria,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOsSelecionada(null);
        setResponsavelNome("");
        setObservacoesCampo("");
        carregarOrdens();
      }
    } catch (e: any) {
      alert("Erro ao finalizar O.S.: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* CABEÇALHO DO PAINEL DE CAMPO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/engenharia/solar/cockpit-ai"
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition"
              title="Voltar ao Cockpit"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/20">
              <Wrench className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200 bg-clip-text text-transparent">
                Ordens de Serviço de Campo (IA O&M)
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Intervenções Guiadas por Telemetria, Especificação Exata de Peças e Procedimentos de Segurança (NR-10)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => carregarOrdens()}
          disabled={carregando}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border border-slate-800 transition shadow"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? "animate-spin text-amber-400" : ""}`} />
          <span>Atualizar Ordens</span>
        </button>
      </div>

      {/* CARDS DE RESUMO DE ATIVIDADES DE CAMPO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <span className="text-xs text-slate-400 block font-medium">O.S. Pendentes</span>
          <span className="text-2xl md:text-3xl font-extrabold text-amber-400 mt-1 block">
            {totais.pendentes}
          </span>
          <span className="text-[11px] text-slate-500">Aguardando início</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <span className="text-xs text-slate-400 block font-medium">Em Atendimento</span>
          <span className="text-2xl md:text-3xl font-extrabold text-cyan-400 mt-1 block">
            {totais.emAtendimento}
          </span>
          <span className="text-[11px] text-slate-500">Técnicos em deslocamento/campo</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <span className="text-xs text-slate-400 block font-medium">Concluídas & Validadas</span>
          <span className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1 block">
            {totais.concluidas}
          </span>
          <span className="text-[11px] text-slate-500">Resolvidas na telemetria</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <span className="text-xs text-slate-400 block font-medium">Impacto em Aberto</span>
          <span className="text-2xl md:text-3xl font-extrabold text-rose-400 mt-1 block font-mono">
            R$ {totais.perdaFinanceiraTotalDia?.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500">Perda diária ativa</span>
        </div>
      </div>

      {/* FILTROS RÁPIDOS */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs md:text-sm">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>Filtrar:</span>
        </div>

        {/* Filtro Status */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
        >
          <option value="TODOS">Todos os Status</option>
          <option value="PENDENTE">Apenas Pendentes</option>
          <option value="EM_ATENDIMENTO">Em Atendimento</option>
          <option value="CONCLUIDA">Apenas Concluídas</option>
        </select>

        {/* Filtro Gravidade */}
        <select
          value={filtroGravidade}
          onChange={(e) => setFiltroGravidade(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
        >
          <option value="TODAS">Todas as Gravidades</option>
          <option value="CRITICA">Crítica</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Média</option>
          <option value="BAIXA">Baixa</option>
        </select>
      </div>

      {/* LISTAGEM DAS ORDENS DE SERVIÇO */}
      {carregando ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400">Carregando Ordens de Serviço...</p>
        </div>
      ) : ordens.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">Nenhuma Ordem de Serviço encontrada</h3>
          <p className="text-xs text-slate-500 mt-1">
            Selecione outro filtro ou gere novas Ordens de Serviço a partir do Cockpit de IA.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ordens.map((os) => {
            const isPendente = os.status === "PENDENTE";
            const isEmAtendimento = os.status === "EM_ATENDIMENTO";
            const isConcluida = os.status === "CONCLUIDA";

            return (
              <div
                key={os.id}
                className={`bg-slate-900/80 border rounded-2xl p-5 shadow-xl space-y-4 transition ${
                  isConcluida
                    ? "border-slate-800/80 opacity-70"
                    : isEmAtendimento
                    ? "border-cyan-500/40 shadow-cyan-950/20"
                    : "border-amber-500/30 shadow-amber-950/10"
                }`}
              >
                {/* TOPO DO CARD */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                          os.gravidade === "CRITICA"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : os.gravidade === "ALTA"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {os.gravidade}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {os.usina?.nome || "Usina"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug">{os.titulo}</h3>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                      isPendente
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : isEmAtendimento
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isPendente ? "Pendente" : isEmAtendimento ? "Em Campo" : "Concluída"}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {os.descricao}
                </p>

                {/* DETALHES DE ENGENHARIA DE CAMPO */}
                <div className="space-y-2 text-xs">
                  {/* Localização Física */}
                  <div className="flex items-start gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-amber-300">Localização:</strong> {os.localizacaoFisica || "Mesa de Campo"}
                    </span>
                  </div>

                  {/* Peça Sugerida para Levar */}
                  {os.pecaSugerida && (
                    <div className="flex items-start gap-2 text-slate-300 bg-amber-950/30 border border-amber-500/20 p-2.5 rounded-lg">
                      <Package className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-amber-300">Peça para Levar:</strong> {os.pecaSugerida}
                      </span>
                    </div>
                  )}

                  {/* Procedimento de Segurança NR-10 */}
                  {os.procedimentoSeguranca && (
                    <div className="flex items-start gap-2 text-slate-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">
                        <strong className="text-rose-300">Segurança (NR-10):</strong> {os.procedimentoSeguranca}
                      </span>
                    </div>
                  )}

                  {/* Referência Normativa */}
                  {os.normaReferencia && (
                    <p className="text-[11px] text-slate-500 italic">
                      📜 Referência: {os.normaReferencia}
                    </p>
                  )}
                </div>

                {/* RODAPÉ DO CARD & BOTÕES DE AÇÃO */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[10px]">Impacto Financeiro</span>
                    <span className="font-mono font-bold text-rose-400">
                      R$ {os.impactoFinanceiroDia?.toFixed(2) || "0.00"}/dia
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPendente && (
                      <button
                        onClick={() => iniciarAtendimento(os.id)}
                        className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Iniciar Atendimento</span>
                      </button>
                    )}

                    {isEmAtendimento && (
                      <button
                        onClick={() => setOsSelecionada(os)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Concluir Reparo</span>
                      </button>
                    )}

                    {isConcluida && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolvida {os.validadoPorTelemetria && "(Validada em Telemetria)"}
                        </span>
                        {os.responsavelCampo && (
                          <span className="text-[10px] text-slate-500 block">
                            Por: {os.responsavelCampo}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONCLUSÃO DE O.S. */}
      {osSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Concluir Ordem de Serviço
              </h3>
              <button
                onClick={() => setOsSelecionada(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <p><strong>O.S.:</strong> {osSelecionada.titulo}</p>
              <p><strong>Local:</strong> {osSelecionada.localizacaoFisica}</p>
              <p><strong>Peça Substituída:</strong> {osSelecionada.pecaSugerida || "--"}</p>
            </div>

            <div className="space-y-3 text-xs md:text-sm">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Nome do Técnico Responsável
                </label>
                <input
                  type="text"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  placeholder="Ex: João Silva (Eletricista de O&M)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Observações Técnicas do Reparo
                </label>
                <textarea
                  value={observacoesCampo}
                  onChange={(e) => setObservacoesCampo(e.target.value)}
                  rows={3}
                  placeholder="Ex: Fusível substituído e reapertado com torque especificado. Tensão e corrente conferidas com alicate amperímetro CC."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chkTelemetria"
                  checked={validarTelemetria}
                  onChange={(e) => setValidarTelemetria(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="chkTelemetria" className="text-xs text-slate-300 cursor-pointer">
                  Validar retorno da corrente em tempo real no banco de telemetria
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => setOsSelecionada(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarAtendimento}
                disabled={salvando}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {salvando ? "Finalizando..." : "Confirmar Encerramento da O.S."}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
