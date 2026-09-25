"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Calculator,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Printer,
  Package,
  Layers,
  CheckCircle,
  AlertTriangle,
  Info,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Search,
  DollarSign,
  Edit2,
  FileText,
  BatteryCharging,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  ExternalLink,
  History,
  Database
} from "lucide-react";
import AdicionarMaterialModal from "@/components/cemig/AdicionarMaterialModal";
import PropostaModal from "@/components/cemig/PropostaModal";
import {
  dimensionarPadraoCemig,
  TipoPadrao,
  LadoRede,
  TipoSaida,
  LocalizacaoPadrao,
  TipoEstrutura,
  FinalidadePadrao,
  ResultadoDimensionamentoPadrao,
  ItemMaterialSugerido,
  FAIXAS_TRIFASICO_TABELA_2
} from "@/lib/cemig/padraoEngine";

export default function PadraoCemigPage() {
  // Aba ativa: "ORCAMENTO", "PROPOSTAS_SALVAS", "BANCO_PRECOS"
  const [abaAtiva, setAbaAtiva] = useState<"ORCAMENTO" | "PROPOSTAS_SALVAS" | "BANCO_PRECOS">("ORCAMENTO");

  // Parâmetros de Seleção do Padrão
  const [tipoPadrao, setTipoPadrao] = useState<TipoPadrao>("TRIFASICO");
  const [disjuntorAmperes, setDisjuntorAmperes] = useState<number>(100);
  const [ladoRede, setLadoRede] = useState<LadoRede>("MESMO_LADO");
  const [tipoSaida, setTipoSaida] = useState<TipoSaida>("AEREA");
  const [localizacao, setLocalizacao] = useState<LocalizacaoPadrao>("URBANO");
  const [tipoEstrutura, setTipoEstrutura] = useState<TipoEstrutura>("POSTE_CONCRETO");
  const [finalidade, setFinalidade] = useState<FinalidadePadrao>("CARREGADOR_VE");
  const [potenciaCarregadorKW, setPotenciaCarregadorKW] = useState<number>(22);
  const [modeloCarregador, setModeloCarregador] = useState<string>("Wallbox 22 kW Trifásico");

  // Dados do Cliente
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [cidade, setCidade] = useState("Belo Horizonte - MG");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Margens e Descontos
  const [bdiMargem, setBdiMargem] = useState<number>(15);
  const [valorDesconto, setValorDesconto] = useState<number>(0);

  // Estados dos Itens e Resultados
  const [itens, setItens] = useState<ItemMaterialSugerido[]>([]);
  const [resumoTecnico, setResumoTecnico] = useState<ResultadoDimensionamentoPadrao | null>(null);
  const [precosDB, setPrecosDB] = useState<Record<string, number>>({});
  const [carregandoPrecos, setCarregandoPrecos] = useState(false);

  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPropostaModalOpen, setIsPropostaModalOpen] = useState(false);
  const [propostaParaModal, setPropostaParaModal] = useState<any>(null);

  // Histórico de Propostas Salvas
  const [propostasSalvas, setPropostasSalvas] = useState<any[]>([]);
  const [buscaProposta, setBuscaProposta] = useState("");
  const [salvandoProposta, setSalvandoProposta] = useState(false);

  // Tabela de Preços do Banco
  const [catalogoMateriais, setCatalogoMateriais] = useState<any[]>([]);
  const [buscaCatalogo, setBuscaCatalogo] = useState("");
  const [catFiltro, setCatFiltro] = useState("TODAS");
  const [editandoMaterial, setEditandoMaterial] = useState<{ id: string; preco: number } | null>(null);
  const [salvandoPreco, setSalvandoPreco] = useState(false);

  // Carregar catálogo de preços inicial
  const carregarPrecosDB = async () => {
    try {
      setCarregandoPrecos(true);
      const res = await fetch("/api/cemig/materiais");
      const data = await res.json();
      if (data.success && Array.isArray(data.materiais)) {
        setCatalogoMateriais(data.materiais);
        const map: Record<string, number> = {};
        data.materiais.forEach((m: any) => {
          map[m.codigo] = m.precoUnitario;
        });
        setPrecosDB(map);
        return map;
      }
    } catch (err) {
      console.error("Erro ao carregar preços do banco:", err);
    } finally {
      setCarregandoPrecos(false);
    }
    return {};
  };

  // Carregar propostas salvas
  const carregarPropostasSalvas = async () => {
    try {
      const res = await fetch("/api/cemig/propostas");
      const data = await res.json();
      if (data.success && Array.isArray(data.propostas)) {
        setPropostasSalvas(data.propostas);
      }
    } catch (err) {
      console.error("Erro ao carregar propostas salvas:", err);
    }
  };

  useEffect(() => {
    carregarPrecosDB();
    carregarPropostasSalvas();
  }, []);

  // Recalcular lista padrão sempre que os parâmetros essenciais mudarem
  const calcularListaPadrao = (customPrecos?: Record<string, number>) => {
    const mapa = customPrecos || precosDB;
    const resultado = dimensionarPadraoCemig(
      {
        tipoPadrao,
        disjuntorAmperes,
        ladoRede: localizacao === "RURAL" ? "LADO_OPOSTO" : ladoRede,
        tipoSaida,
        localizacao,
        tipoEstrutura,
        finalidade,
        potenciaCarregadorKW,
        modeloCarregador
      },
      mapa
    );

    setResumoTecnico(resultado);
    setItens(resultado.itensSugeridos);
  };

  useEffect(() => {
    calcularListaPadrao();
  }, [tipoPadrao, disjuntorAmperes, ladoRede, tipoSaida, localizacao, tipoEstrutura, finalidade, potenciaCarregadorKW]);

  // Se trocar para bifásico, ajustar disjuntor para 63A caso estivesse em um valor inválido
  const handleTrocaTipoPadrao = (tipo: TipoPadrao) => {
    setTipoPadrao(tipo);
    if (tipo === "BIFASICO") {
      setDisjuntorAmperes(63);
      if (potenciaCarregadorKW > 7.4) {
        setPotenciaCarregadorKW(7.4);
        setModeloCarregador("Wallbox 7.4 kW Monofásico/Bifásico (32A)");
      }
    } else {
      if (disjuntorAmperes < 63) {
        setDisjuntorAmperes(63);
      }
    }
  };

  // Alterar quantitativo de item
  const handleAlterarQuantidade = (index: number, novaQtd: number) => {
    if (novaQtd < 0) novaQtd = 0;
    setItens((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantidade: Number(novaQtd),
        precoTotal: Number(novaQtd) * copy[index].precoUnitarioEstimado
      };
      return copy;
    });
  };

  // Alterar preço unitário de item na lista
  const handleAlterarPrecoUnitario = (index: number, novoPreco: number) => {
    if (novoPreco < 0) novoPreco = 0;
    setItens((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        precoUnitarioEstimado: Number(novoPreco),
        precoTotal: copy[index].quantidade * Number(novoPreco)
      };
      return copy;
    });
  };

  // Remover item da lista
  const handleRemoverItem = (index: number) => {
    setItens((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Adicionar item vindo do modal
  const handleAdicionarItemDoModal = (novoItem: any) => {
    setItens((prev) => [
      ...prev,
      {
        codigo: novoItem.codigo,
        descricao: novoItem.descricao,
        categoria: novoItem.categoria,
        unidade: novoItem.unidade,
        quantidade: novoItem.quantidade,
        precoUnitarioEstimado: novoItem.precoUnitario,
        precoTotal: novoItem.precoTotal,
        obrigatorioNorma: false
      }
    ]);
  };

  // Totais Financeiros
  const subtotalMateriais = itens
    .filter((it) => it.categoria !== "MAO_DE_OBRA")
    .reduce((acc, it) => acc + (it.precoTotal || 0), 0);

  const subtotalMaoDeObra = itens
    .filter((it) => it.categoria === "MAO_DE_OBRA")
    .reduce((acc, it) => acc + (it.precoTotal || 0), 0);

  const baseCalculoBDI = subtotalMateriais + subtotalMaoDeObra;
  const valorBDI = (baseCalculoBDI * (bdiMargem || 0)) / 100;
  const valorTotalCapex = Math.max(0, baseCalculoBDI + valorBDI - (valorDesconto || 0));

  // Salvar Proposta
  const handleSalvarProposta = async () => {
    if (!clienteNome.trim()) {
      alert("Por favor, preencha o Nome do Cliente antes de salvar.");
      return;
    }

    try {
      setSalvandoProposta(true);
      const payload = {
        clienteNome: clienteNome.trim(),
        clienteTelefone: clienteTelefone.trim() || null,
        clienteEmail: clienteEmail.trim() || null,
        clienteDocumento: clienteDocumento.trim() || null,
        cidade: cidade.trim() || "Belo Horizonte - MG",
        endereco: endereco.trim() || null,
        finalidade,
        potenciaCarregadorKW: finalidade === "CARREGADOR_VE" ? potenciaCarregadorKW : null,
        modeloCarregador: finalidade === "CARREGADOR_VE" ? modeloCarregador : null,
        tipoPadrao,
        disjuntorAmperes,
        faixaDemanda: resumoTecnico?.faixaFornecimento || (tipoPadrao === "BIFASICO" ? "B1" : "C1"),
        ladoRede,
        tipoEstrutura,
        posteHomologado: resumoTecnico?.posteHomologado || null,
        caboEntrada: `${resumoTecnico?.caboFaseMm2} mm²`,
        eletroduto: `PVC Ø ${resumoTecnico?.eletrodutoPVCmm} mm`,
        hastesQtde: resumoTecnico?.hastesAterramentoQtde || 2,
        valorMateriais: subtotalMateriais,
        valorMaoDeObra: subtotalMaoDeObra,
        bdiMargem: Number(bdiMargem),
        valorDesconto: Number(valorDesconto),
        valorTotal: valorTotalCapex,
        status: "RASCUNHO",
        observacoes: observacoes.trim() || null,
        itens: itens.map((it) => ({
          codigo: it.codigo,
          descricao: it.descricao,
          categoria: it.categoria,
          unidade: it.unidade,
          quantidade: it.quantidade,
          precoUnitario: it.precoUnitarioEstimado,
          precoTotal: it.precoTotal
        }))
      };

      const res = await fetch("/api/cemig/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(`Proposta ${data.proposta.numeroProposta} salva com sucesso!`);
        carregarPropostasSalvas();
      } else {
        alert(data.error || "Erro ao salvar proposta");
      }
    } catch (err) {
      alert("Erro de comunicação ao salvar");
    } finally {
      setSalvandoProposta(false);
    }
  };

  // Abrir Modal de Impressão de Proposta
  const handleAbrirModalProposta = () => {
    if (!clienteNome.trim()) {
      alert("Por favor, preencha o Nome do Cliente para gerar a proposta.");
      return;
    }

    setPropostaParaModal({
      numeroProposta: `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      clienteNome,
      clienteTelefone,
      clienteEmail,
      clienteDocumento,
      cidade,
      endereco,
      finalidade,
      potenciaCarregadorKW: finalidade === "CARREGADOR_VE" ? potenciaCarregadorKW : undefined,
      modeloCarregador: finalidade === "CARREGADOR_VE" ? modeloCarregador : undefined,
      tipoPadrao,
      disjuntorAmperes,
      faixaDemanda: resumoTecnico?.faixaFornecimento || (tipoPadrao === "BIFASICO" ? "B1" : "C1"),
      ladoRede: localizacao === "RURAL" ? "LADO_OPOSTO" : ladoRede,
      tipoSaida,
      localizacao,
      caixaMedicao: resumoTecnico?.caixaMedicao,
      tipoEstrutura,
      posteHomologado: resumoTecnico?.posteHomologado,
      caboEntrada: `${resumoTecnico?.caboFaseMm2} mm²`,
      eletroduto: `PVC Ø ${resumoTecnico?.eletrodutoPVCmm} mm`,
      hastesQtde: resumoTecnico?.hastesAterramentoQtde,
      valorMateriais: subtotalMateriais,
      valorMaoDeObra: subtotalMaoDeObra,
      bdiMargem,
      valorDesconto,
      valorTotal: valorTotalCapex,
      observacoes,
      itens: itens.map((it) => ({
        codigo: it.codigo,
        descricao: it.descricao,
        categoria: it.categoria,
        unidade: it.unidade,
        quantidade: it.quantidade,
        precoUnitario: it.precoUnitarioEstimado,
        precoTotal: it.precoTotal
      }))
    });

    setIsPropostaModalOpen(true);
  };

  // Atualizar Preço no Banco de Dados
  const handleSalvarEdicaoPreco = async (id: string, novoPreco: number) => {
    try {
      setSalvandoPreco(true);
      const res = await fetch(`/api/cemig/materiais/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precoUnitario: novoPreco })
      });
      const data = await res.json();
      if (data.success) {
        setCatalogoMateriais((prev) =>
          prev.map((m) => (m.id === id ? { ...m, precoUnitario: novoPreco } : m))
        );
        setEditandoMaterial(null);
        await carregarPrecosDB();
      } else {
        alert("Erro ao salvar preço");
      }
    } catch (err) {
      alert("Erro ao conectar");
    } finally {
      setSalvandoPreco(false);
    }
  };

  // Carregar Proposta Salva no Editor
  const handleCarregarPropostaNoEditor = (p: any) => {
    setClienteNome(p.clienteNome || "");
    setClienteTelefone(p.clienteTelefone || "");
    setClienteEmail(p.clienteEmail || "");
    setClienteDocumento(p.clienteDocumento || "");
    setCidade(p.cidade || "Belo Horizonte - MG");
    setEndereco(p.endereco || "");
    setFinalidade(p.finalidade || "CARREGADOR_VE");
    setPotenciaCarregadorKW(p.potenciaCarregadorKW || 22);
    setModeloCarregador(p.modeloCarregador || "");
    setTipoPadrao(p.tipoPadrao || "TRIFASICO");
    setDisjuntorAmperes(p.disjuntorAmperes || 100);
    setLadoRede(p.ladoRede || "MESMO_LADO");
    setTipoSaida(p.tipoSaida || "AEREA");
    setLocalizacao(p.localizacao || "URBANO");
    setTipoEstrutura(p.tipoEstrutura || "POSTE_CONCRETO");
    setBdiMargem(p.bdiMargem || 15);
    setValorDesconto(p.valorDesconto || 0);
    setObservacoes(p.observacoes || "");

    if (Array.isArray(p.itens) && p.itens.length > 0) {
      setItens(
        p.itens.map((it: any) => ({
          codigo: it.codigo,
          descricao: it.descricao,
          categoria: it.categoria,
          unidade: it.unidade,
          quantidade: it.quantidade,
          precoUnitarioEstimado: it.precoUnitario,
          precoTotal: it.precoTotal,
          obrigatorioNorma: false
        }))
      );
    }

    setAbaAtiva("ORCAMENTO");
  };

  // Excluir Proposta Salva
  const handleExcluirProposta = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta proposta?")) return;
    try {
      const res = await fetch(`/api/cemig/propostas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPropostasSalvas((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      alert("Erro ao excluir proposta");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-slate-900 text-[#00BFA5] rounded-2xl shadow-md border border-slate-800">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Padrão CEMIG & CAPEX (Norma ND 5.1)
              </h1>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Tabela 1 e Tabela 2
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Dimensionamento automatizado de lista de materiais, quantitativos e custos com preços do banco de dados para postos de recarga VE e propostas comerciais.
            </p>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setAbaAtiva("ORCAMENTO")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              abaAtiva === "ORCAMENTO"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="w-4 h-4 text-[#00BFA5]" /> Dimensionador & CAPEX
          </button>
          <button
            onClick={() => {
              setAbaAtiva("PROPOSTAS_SALVAS");
              carregarPropostasSalvas();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              abaAtiva === "PROPOSTAS_SALVAS"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4 text-blue-600" /> Propostas Salvas ({propostasSalvas.length})
          </button>
          <button
            onClick={() => {
              setAbaAtiva("BANCO_PRECOS");
              carregarPrecosDB();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              abaAtiva === "BANCO_PRECOS"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-4 h-4 text-amber-600" /> Tabela de Preços ({catalogoMateriais.length})
          </button>
        </div>
      </div>

      {/* ─── ABA 1: DIMENSIONADOR & ORÇAMENTO ───────────────────────────── */}
      {abaAtiva === "ORCAMENTO" && (
        <div className="space-y-6">
          {/* Grid de Configuração do Padrão */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Coluna 1 & 2: Seleção Técnica do Padrão */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Layers className="w-5 h-5 text-[#00BFA5]" />
                  <h2 className="font-bold text-base">Parâmetros de Entrada da Concessionária</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Conforme ND 5.1 CEMIG</span>
              </div>

              {/* Seletor Bifásico vs Trifásico */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  1. Tipo de Fornecimento / Fases
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTrocaTipoPadrao("TRIFASICO")}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between ${
                      tipoPadrao === "TRIFASICO"
                        ? "border-[#00BFA5] bg-emerald-50/40 ring-2 ring-[#00BFA5]/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">TRIFÁSICO (3F + Neutro)</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-700">Tabela 2</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        127/220V (4 Fios) | Demanda até 75 kVA | Ideal para carregadores VE rápidos e potências acima de 11 kW.
                      </p>
                    </div>
                    {tipoPadrao === "TRIFASICO" && <CheckCircle className="w-5 h-5 text-[#00BFA5] shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrocaTipoPadrao("BIFASICO")}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between ${
                      tipoPadrao === "BIFASICO"
                        ? "border-[#00BFA5] bg-emerald-50/40 ring-2 ring-[#00BFA5]/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">BIFÁSICO (2F + Neutro)</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-700">Tabela 1</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        127/220V (3 Fios) | Carga até 16 kW | Ideal para residências e carregadores VE até 7.4 kW (32A).
                      </p>
                    </div>
                    {tipoPadrao === "BIFASICO" && <CheckCircle className="w-5 h-5 text-[#00BFA5] shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Seletor do Disjuntor */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  2. Disjuntor Termomagnético IEC ({tipoPadrao === "TRIFASICO" ? "Tripolar" : "Bipolar"})
                </label>

                {tipoPadrao === "TRIFASICO" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {FAIXAS_TRIFASICO_TABELA_2.map((f) => (
                      <button
                        key={f.faixa}
                        type="button"
                        onClick={() => setDisjuntorAmperes(f.disjuntor)}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          disjuntorAmperes === f.disjuntor
                            ? "border-[#00BFA5] bg-[#00BFA5] text-white shadow-md font-black ring-2 ring-[#00BFA5]/30"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span className="text-lg font-black">{f.disjuntor} A</span>
                        <span className={`text-[10px] font-bold ${disjuntorAmperes === f.disjuntor ? "text-emerald-100" : "text-slate-400"}`}>
                          Faixa {f.faixa}
                        </span>
                        <span className={`text-[9px] ${disjuntorAmperes === f.disjuntor ? "text-emerald-100" : "text-slate-500"}`}>
                          até {f.demandaMax} kVA
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {[40, 50, 63].map((amp) => (
                      <button
                        key={amp}
                        type="button"
                        onClick={() => setDisjuntorAmperes(amp)}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          disjuntorAmperes === amp
                            ? "border-[#00BFA5] bg-[#00BFA5] text-white shadow-md font-black"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span className="text-lg font-black">{amp} A</span>
                        <span className={`text-[10px] font-bold ${disjuntorAmperes === amp ? "text-emerald-100" : "text-slate-400"}`}>
                          {amp === 63 ? "Padrão Tabela 1 (B1)" : "Ajuste Especial"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Parâmetros Construtivos: Localização, Posição da Rede, Tipo de Saída e Estrutura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 3. Localização (Urbana vs Rural) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                      3. Localização da Instalação
                    </label>
                    {localizacao === "RURAL" && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        ND 5.1 Nota 9: Travessia Obrigatória
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLocalizacao("URBANO");
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        localizacao === "URBANO"
                          ? "border-[#00BFA5] bg-emerald-50 text-emerald-950 font-bold ring-1 ring-[#00BFA5]"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${localizacao === "URBANO" ? "bg-[#00BFA5]" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-xs font-black">ÁREA URBANA</p>
                        <p className="text-[10px] text-slate-500 font-normal">Padrão convencional</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLocalizacao("RURAL");
                        setLadoRede("LADO_OPOSTO"); // Trava em Contra
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        localizacao === "RURAL"
                          ? "border-amber-500 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-500"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${localizacao === "RURAL" ? "bg-amber-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-xs font-black">ÁREA RURAL</p>
                        <p className="text-[10px] text-slate-500 font-normal">Obrigatório Contra a Rede</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 4. Posição em Relação à Rede CEMIG */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    4. Posição em Relação à Rede CEMIG
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={localizacao === "RURAL"}
                      onClick={() => setLadoRede("MESMO_LADO")}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        localizacao === "RURAL"
                          ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                          : ladoRede === "MESMO_LADO"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${ladoRede === "MESMO_LADO" && localizacao !== "RURAL" ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-xs font-black">A FAVOR</p>
                        <p className="text-[10px] text-slate-500 font-normal">Mesmo Lado da Rede</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLadoRede("LADO_OPOSTO")}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        ladoRede === "LADO_OPOSTO" || localizacao === "RURAL"
                          ? "border-red-500 bg-red-50 text-red-900 font-bold ring-1 ring-red-500"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${ladoRede === "LADO_OPOSTO" || localizacao === "RURAL" ? "bg-red-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-xs font-black">CONTRA</p>
                        <p className="text-[10px] text-slate-500 font-normal">Lado Oposto (Cruza Rua)</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 5. Tipo de Saída da Carga (Aérea vs Subterrânea) */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    5. Tipo de Saída da Carga
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoSaida("AEREA")}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        tipoSaida === "AEREA"
                          ? "border-sky-500 bg-sky-50 text-sky-950 font-bold ring-1 ring-sky-500"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${tipoSaida === "AEREA" ? "bg-sky-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-xs font-black">SAÍDA AÉREA</p>
                        <p className="text-[10px] text-slate-500 font-normal">2 Cabeçotes + 2 Curvas S</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoSaida("SUBTERRANEA")}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        tipoSaida === "SUBTERRANEA"
                          ? "border-indigo-500 bg-indigo-50 text-indigo-950 font-bold ring-1 ring-indigo-500"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${tipoSaida === "SUBTERRANEA" ? "bg-indigo-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-xs font-black">SAÍDA SUBTERRÂNEA</p>
                        <p className="text-[10px] text-slate-500 font-normal">1 Cabeçote + 1 Curva S</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 6. Tipo Construtivo / Estrutura */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    6. Tipo Construtivo / Estrutura
                  </label>
                  <select
                    value={tipoEstrutura}
                    onChange={(e) => setTipoEstrutura(e.target.value as any)}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5] font-bold text-slate-800"
                  >
                    <option value="POSTE_CONCRETO">Poste de Concreto Duplo T (PC)</option>
                    <option value="POSTE_ACO">Poste de Aço Galvanizado (PA - Com Tampão)</option>
                    <option value="PONTALETE">Pontalete de Aço (PT - Fachada / Muro)</option>
                    <option value="MURO">Muro / Mureta (Caixa Embutida na Alvenaria)</option>
                  </select>
                </div>

              </div>

              {/* Seção Especial: Aplicação para Posto de Carregamento VE */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BatteryCharging className="w-5 h-5 text-[#00BFA5]" />
                    <span className="font-bold text-sm">Aplicação: Posto de Recarga Veicular (Capex EV)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={finalidade === "CARREGADOR_VE"}
                      onChange={(e) => setFinalidade(e.target.checked ? "CARREGADOR_VE" : "PADRAO_GERAL")}
                      className="w-4 h-4 accent-[#00BFA5] rounded"
                    />
                    Ativar Modo Estação de Recarga
                  </label>
                </div>

                {finalidade === "CARREGADOR_VE" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">
                        Potência do Carregador EV (kW)
                      </label>
                      <select
                        value={potenciaCarregadorKW}
                        onChange={(e) => {
                          const pot = Number(e.target.value);
                          setPotenciaCarregadorKW(pot);
                          if (pot <= 7.4) {
                            setModeloCarregador("Wallbox 7.4 kW (32A Monofásico/Bifásico)");
                          } else if (pot <= 11) {
                            setModeloCarregador("Wallbox 11 kW Trifásico (16A)");
                          } else if (pot <= 22) {
                            setModeloCarregador("Wallbox 22 kW Trifásico (32A)");
                          } else if (pot <= 44) {
                            setModeloCarregador("Estação Dupla 44 kW (2x 22 kW)");
                          } else {
                            setModeloCarregador(`Carregador Rápido DC ${pot} kW`);
                          }
                        }}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                      >
                        <option value={7.4}>7.4 kW (32A 220V - Wallbox AC)</option>
                        <option value={11}>11.0 kW (16A 380V / 220V - Wallbox AC)</option>
                        <option value={22}>22.0 kW (32A 380V / 220V - Wallbox AC)</option>
                        <option value={44}>44.0 kW (Hub Duplo 2x 22 kW)</option>
                        <option value={30}>30.0 kW (DC Rápido)</option>
                        <option value={50}>50.0 kW (DC Rápido Comercial)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">
                        Identificação do Carregador
                      </label>
                      <input
                        type="text"
                        value={modeloCarregador}
                        onChange={(e) => setModeloCarregador(e.target.value)}
                        placeholder="Ex: Wallbox Pulsar Plus, ABB Terra..."
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Coluna 3: Card de Resumo Técnico CEMIG ND 5.1 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-slate-800 mb-3 border-b border-slate-200 pb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm">Resumo Técnico Normativo</h3>
                </div>

                {resumoTecnico ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Faixa CEMIG:</span>
                        <span className="font-black text-sm text-[#00BFA5] px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                          {tipoPadrao === "BIFASICO" ? "B1" : `Categoria ${resumoTecnico.faixaFornecimento}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Demanda Atendida:</span>
                        <span className="font-bold text-slate-800">
                          {resumoTecnico.demandaMinKVA} a {resumoTecnico.demandaMaxKVA} kVA
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tensão / Fios:</span>
                        <span className="font-bold text-slate-800">
                          127/220V ({resumoTecnico.fios} Fios / {resumoTecnico.fases} Fases)
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Poste Homologado:</span>
                        <span className="font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {resumoTecnico.posteHomologado || "PC1"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Localização / Saída:</span>
                        <span className="font-bold text-slate-800">
                          {resumoTecnico.localizacao === "RURAL" ? "Rural" : "Urbana"} | {resumoTecnico.tipoSaida === "AEREA" ? "Saída Aérea" : "Saída Subterrânea"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Condutores de Entrada:</span>
                        <span className="font-bold text-slate-800">{resumoTecnico.caboFaseMm2} mm² (PVC 70°C)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Eletroduto:</span>
                        <span className="font-bold text-slate-800">PVC Ø {resumoTecnico.eletrodutoPVCmm} mm ({resumoTecnico.eletrodutoPvcPol})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Aterramento:</span>
                        <span className="font-bold text-slate-800">
                          {resumoTecnico.hastesAterramentoQtde} Haste(s) Galvanizada(s) 5/8"
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Caixa de Medição:</span>
                        <span className="font-bold text-slate-800">{resumoTecnico.caixaMedicao}</span>
                      </div>
                    </div>

                    {/* Alertas EV */}
                    {resumoTecnico.alertasEV.length > 0 && (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
                        <p className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Notas para Carregadores VE:
                        </p>
                        {resumoTecnico.alertasEV.map((alerta, idx) => (
                          <p key={idx} className="text-[11px] text-amber-800 font-medium">
                            {alerta}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Calculando dimensionamento...</p>
                )}
              </div>

              {/* Botão de Restaurar Padrão */}
              <button
                type="button"
                onClick={() => calcularListaPadrao()}
                className="w-full py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" /> Restaurar Lista Padrão CEMIG
              </button>
            </div>

          </div>

          {/* Dados do Cliente e Proposta */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-slate-800">
              <User className="w-5 h-5 text-[#00BFA5]" />
              <h3 className="font-bold text-sm">Dados do Cliente para Geração da Proposta</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Nome do Cliente / Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva / Condomínio Solar"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(31) 99999-9999"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">E-mail</label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Cidade / UF</label>
                <input
                  type="text"
                  placeholder="Belo Horizonte - MG"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Materiais & Custos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#00BFA5]" /> Lista de Materiais & Custos (Banco de Dados)
                </h3>
                <p className="text-xs text-slate-500">
                  Os quantitativos podem ser alterados livremente. Você também pode inserir novos itens do catálogo ou retirar itens.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-[#00BFA5] hover:bg-[#009688] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Adicionar Material à Lista
                </button>
              </div>
            </div>

            {/* Tabela Responsiva */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-black border-b border-slate-200 uppercase text-[10px]">
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Material / Equipamento</th>
                    <th className="p-3 w-28">Categoria</th>
                    <th className="p-3 w-16 text-center">Unid.</th>
                    <th className="p-3 w-32 text-center">Quantidade</th>
                    <th className="p-3 w-28 text-right">Preço Unit.</th>
                    <th className="p-3 w-28 text-right">Subtotal</th>
                    <th className="p-3 w-12 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Nenhum item na lista. Clique em "Restaurar Lista Padrão" ou "Adicionar Material".
                      </td>
                    </tr>
                  ) : (
                    itens.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{item.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.codigo && (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.codigo}
                              </span>
                            )}
                            {item.obrigatorioNorma && (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Norma CEMIG
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-600">{item.unidade}</td>
                        
                        {/* Quantidade Editável */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 max-w-[120px] mx-auto">
                            <button
                              type="button"
                              onClick={() => handleAlterarQuantidade(idx, Math.max(0, item.quantidade - 1))}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 font-bold shadow-sm transition"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.quantidade}
                              onChange={(e) => handleAlterarQuantidade(idx, Number(e.target.value))}
                              className="w-12 text-center text-xs font-black bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAlterarQuantidade(idx, item.quantidade + 1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 font-bold shadow-sm transition"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Preço Unitário Editável */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 text-[10px]">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.precoUnitarioEstimado}
                              onChange={(e) => handleAlterarPrecoUnitario(idx, Number(e.target.value))}
                              className="w-20 text-right text-xs font-bold p-1 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-[#00BFA5]"
                            />
                          </div>
                        </td>

                        {/* Subtotal */}
                        <td className="p-3 text-right font-black text-slate-900">
                          {item.precoTotal.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })}
                        </td>

                        {/* Excluir */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(idx)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                            title="Remover item da lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Fechamento Financeiro & BDI */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 uppercase">
                  Observações Adicionais para a Proposta
                </label>
                <textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Padrão inclui ramal subterrâneo até o quadro de distribuição; fornecimento do carregador por conta do cliente..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                />
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal Materiais ({itens.filter(i => i.categoria !== "MAO_DE_OBRA").length} itens):</span>
                  <span className="font-bold text-slate-900">
                    {subtotalMateriais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal Mão de Obra e ART:</span>
                  <span className="font-bold text-slate-900">
                    {subtotalMaoDeObra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      Margem Comercial / BDI (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={bdiMargem}
                      onChange={(e) => setBdiMargem(Number(e.target.value))}
                      className="w-full p-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      Desconto Comercial (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={valorDesconto}
                      onChange={(e) => setValorDesconto(Number(e.target.value))}
                      className="w-full p-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-right text-red-600"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-slate-900 uppercase block">INVESTIMENTO TOTAL (CAPEX):</span>
                    <span className="text-[10px] text-slate-400 font-medium">Materiais + Serviços + BDI</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">
                    {valorTotalCapex.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleSalvarProposta}
                    disabled={salvandoProposta}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-[#00BFA5]" />
                    {salvandoProposta ? "Salvando..." : "Salvar Orçamento"}
                  </button>

                  <button
                    type="button"
                    onClick={handleAbrirModalProposta}
                    className="w-full py-3 bg-[#00BFA5] hover:bg-[#009688] text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Gerar Proposta / PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 2: PROPOSTAS SALVAS ───────────────────────────────────── */}
      {abaAtiva === "PROPOSTAS_SALVAS" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Histórico de Propostas & Capex Salvos</h2>
              <p className="text-xs text-slate-500">Consulte, imprima ou recarregue propostas geradas anteriormente no sistema.</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por cliente ou número..."
                value={buscaProposta}
                onChange={(e) => setBuscaProposta(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">Nº Proposta</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Tipo Padrão</th>
                  <th className="p-3">Disjuntor</th>
                  <th className="p-3">Rede</th>
                  <th className="p-3">Data</th>
                  <th className="p-3 text-right">Valor Total</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {propostasSalvas
                  .filter(
                    (p) =>
                      !buscaProposta ||
                      p.clienteNome.toLowerCase().includes(buscaProposta.toLowerCase()) ||
                      p.numeroProposta.toLowerCase().includes(buscaProposta.toLowerCase())
                  )
                  .map((prop) => (
                    <tr key={prop.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-700">{prop.numeroProposta}</td>
                      <td className="p-3 font-bold text-slate-900">{prop.clienteNome}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prop.tipoPadrao === "TRIFASICO" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                          {prop.tipoPadrao}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{prop.disjuntorAmperes} A</td>
                      <td className="p-3">
                        {prop.ladoRede === "MESMO_LADO" ? (
                          <span className="text-emerald-600 font-bold">A Favor</span>
                        ) : (
                          <span className="text-red-600 font-bold">Contra</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(prop.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600">
                        {prop.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleCarregarPropostaNoEditor(prop)}
                            className="p-1.5 bg-slate-100 hover:bg-[#00BFA5] hover:text-white rounded-lg transition"
                            title="Carregar no editor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setPropostaParaModal(prop);
                              setIsPropostaModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-800 hover:text-white rounded-lg transition"
                            title="Visualizar Proposta / Imprimir"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExcluirProposta(prop.id)}
                            className="p-1.5 bg-slate-100 hover:bg-red-600 hover:text-white rounded-lg transition"
                            title="Excluir proposta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ABA 3: BANCO DE PREÇOS DOS MATERIAIS ───────────────────────── */}
      {abaAtiva === "BANCO_PRECOS" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Catálogo de Preços dos Materiais CEMIG no Banco</h2>
              <p className="text-xs text-slate-500">
                Alimente ou edite os custos unitários de mercado de cada item para que futuros dimensionamentos usem estes valores automaticamente.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={catFiltro}
                onChange={(e) => setCatFiltro(e.target.value)}
                className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="TODAS">Todas as Categorias</option>
                <option value="POSTE">Postes</option>
                <option value="CAIXA">Caixas</option>
                <option value="DISJUNTOR">Disjuntores</option>
                <option value="CONDUTOR">Condutores</option>
                <option value="ELETRODUTO">Eletrodutos</option>
                <option value="ATERRAMENTO">Aterramento</option>
                <option value="FERRAGEM">Ferragens</option>
                <option value="ACESSORIO">Acessórios</option>
                <option value="MAO_DE_OBRA">Mão de Obra</option>
              </select>

              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filtrar materiais..."
                  value={buscaCatalogo}
                  onChange={(e) => setBuscaCatalogo(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3 w-28">Código</th>
                  <th className="p-3">Descrição do Material</th>
                  <th className="p-3 w-28">Categoria</th>
                  <th className="p-3 w-16 text-center">Unidade</th>
                  <th className="p-3 w-36 text-right">Preço Unitário (R$)</th>
                  <th className="p-3 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalogoMateriais
                  .filter((m) => {
                    const matchCat = catFiltro === "TODAS" || m.categoria === catFiltro;
                    const matchBusca =
                      !buscaCatalogo ||
                      m.descricao.toLowerCase().includes(buscaCatalogo.toLowerCase()) ||
                      m.codigo.toLowerCase().includes(buscaCatalogo.toLowerCase());
                    return matchCat && matchBusca;
                  })
                  .map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-700">{mat.codigo}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{mat.descricao}</p>
                        {mat.observacao && <p className="text-[11px] text-slate-400">{mat.observacao}</p>}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {mat.categoria}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-600">{mat.unidade}</td>
                      <td className="p-3 text-right">
                        {editandoMaterial && editandoMaterial.id === mat.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={editandoMaterial.preco}
                              onChange={(e) =>
                                setEditandoMaterial({ id: mat.id, preco: Number(e.target.value) })
                              }
                              className="w-24 p-1 text-right text-xs font-bold border border-[#00BFA5] rounded bg-white"
                            />
                            <button
                              onClick={() => handleSalvarEdicaoPreco(mat.id, editandoMaterial.preco)}
                              disabled={salvandoPreco}
                              className="p-1.5 bg-[#00BFA5] text-white rounded hover:bg-[#009688] transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-black text-slate-900">
                            {mat.precoUnitario.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL"
                            })}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setEditandoMaterial({ id: mat.id, preco: mat.precoUnitario })}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Editar Preço"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      <AdicionarMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdicionarItem={handleAdicionarItemDoModal}
      />

      {propostaParaModal && (
        <PropostaModal
          isOpen={isPropostaModalOpen}
          onClose={() => setIsPropostaModalOpen(false)}
          proposta={propostaParaModal}
        />
      )}
    </div>
  );
}
