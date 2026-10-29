"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Layers,
  X,
  Search,
  Check,
  RefreshCw,
  Info,
  DollarSign,
  Building2,
  PackagePlus
} from "lucide-react";
import SeletorItemCatalogo from "./SeletorItemCatalogo";

interface ItemConciliado {
  itemNumero: number;
  codigoFornecedor?: string | null;
  descricaoFornecedor: string;
  unidadeFornecedor?: string | null;
  quantidade: number;
  precoUnitarioFornecedor: number;
  marca?: string | null;
  status: "EXATO" | "SUGERIDO" | "NAO_ENCONTRADO";
  confianca: number;
  origemMatch: string;
  explicacao: string;
  sugestao: {
    codigo?: string;
    codigoOficial?: string;
    descricao?: string;
    descricaoOficial?: string;
    categoria?: string;
    unidade?: string;
    precoAtual?: number;
    menorPrecoAtual?: number | null;
    fornecedorMenorPreco?: string | null;
  } | null;
  isMenorPreco: boolean;
  diferencaPreco: number;
  percentualEconomia: number;
  confirmado?: boolean;
  codigoOficialSelecionado?: string;
  descricaoOficialSelecionada?: string;
}

interface ConciliacaoOrcamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSucesso: (atualizados: Record<string, number>) => void;
  catalogoMateriais: any[];
}

export const ConciliacaoOrcamentoModal: React.FC<ConciliacaoOrcamentoModalProps> = ({
  isOpen,
  onClose,
  onSucesso,
  catalogoMateriais
}) => {
  const [fase, setFase] = useState<"UPLOAD" | "PROCESSANDO" | "CONCILIACAO" | "SUCESSO">("UPLOAD");
  const [etapaTexto, setEtapaTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Dados extraídos da leitura
  const [fornecedorInfo, setFornecedorInfo] = useState<any>(null);
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [itensConciliacao, setItensConciliacao] = useState<ItemConciliado[]>([]);
  const [catalogoOficial, setCatalogoOficial] = useState<any[]>([]);

  // Filtro de busca na conciliação
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "MENOR_PRECO" | "PENDENTES" | "ALTA_CONFIANCA">("TODOS");

  // Salvamento final
  const [salvandoFinal, setSalvandoFinal] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Processar arquivo com IA
  const handleSelecionarArquivo = async (file: File) => {
    setArquivo(file);
    setFase("PROCESSANDO");
    setEtapaTexto("Extraindo dados com IA Multimodal Gemini 2.5...");

    try {
      // 1. Enviar arquivo para /api/orcamentos/leitor-ia
      const formData = new FormData();
      formData.append("file", file);

      const resLeitor = await fetch("/api/orcamentos/leitor-ia", {
        method: "POST",
        body: formData
      });

      const dataLeitor = await resLeitor.json();

      if (!dataLeitor.success || !Array.isArray(dataLeitor.itens) || dataLeitor.itens.length === 0) {
        throw new Error(dataLeitor.error || "Não foi possível extrair itens do orçamento.");
      }

      setFornecedorInfo(dataLeitor.fornecedor || {});
      setArquivoUrl(dataLeitor.arquivoUrl || null);

      // 2. Chamar /api/orcamentos/conciliacao para De-Para inteligente
      setEtapaTexto("Cruzando descrições com a base oficial e avaliando menores preços...");

      const resConciliacao = await fetch("/api/orcamentos/conciliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedorNome: dataLeitor.fornecedor?.razaoSocial || dataLeitor.fornecedor?.nomeFantasia || "Fornecedor",
          fornecedorCnpj: dataLeitor.fornecedor?.cnpj,
          numeroOrcamento: dataLeitor.fornecedor?.numeroOrcamento,
          itens: dataLeitor.itens
        })
      });

      const dataConciliacao = await resConciliacao.json();

      if (!dataConciliacao.success || !Array.isArray(dataConciliacao.itens)) {
        throw new Error(dataConciliacao.error || "Falha ao conciliar itens com o catálogo.");
      }

      setCatalogoOficial(dataConciliacao.catalogoOficial || catalogoMateriais);

      // Inicializar itens com auto-seleção e confirmação para alta confiança (>80%)
      const itensPreparados: ItemConciliado[] = dataConciliacao.itens.map((it: any) => {
        const codOficial = it.sugestao?.codigoOficial || it.sugestao?.codigo || "";
        const descOficial = it.sugestao?.descricaoOficial || it.sugestao?.descricao || "";
        return {
          ...it,
          confirmado: it.confianca >= 80 && Boolean(codOficial),
          codigoOficialSelecionado: codOficial,
          descricaoOficialSelecionada: descOficial
        };
      });

      setItensConciliacao(itensPreparados);
      setFase("CONCILIACAO");
    } catch (err: any) {
      console.error("Erro na leitura/conciliação:", err);
      alert(err.message || "Erro ao processar orçamento. Tente novamente.");
      setFase("UPLOAD");
    }
  };

  // Alternar confirmação individual
  const toggleConfirmarItem = (idx: number) => {
    setItensConciliacao((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], confirmado: !copy[idx].confirmado };
      return copy;
    });
  };

  // Alterar correspondência manual ou cadastrar como novo item
  const handleAlterarMatchManual = (
    idx: number,
    novoCodigoOficial: string,
    novaDescricaoOficial?: string,
    isNovoItem?: boolean
  ) => {
    setItensConciliacao((prev) => {
      const copy = [...prev];
      if (!novoCodigoOficial) {
        copy[idx] = {
          ...copy[idx],
          codigoOficialSelecionado: "",
          descricaoOficialSelecionada: "",
          confirmado: false,
          isMenorPreco: false
        };
      } else if (novoCodigoOficial === "__NOVO_ITEM__" || isNovoItem) {
        copy[idx] = {
          ...copy[idx],
          codigoOficialSelecionado: "__NOVO_ITEM__",
          descricaoOficialSelecionada: novaDescricaoOficial || copy[idx].descricaoFornecedor,
          confirmado: true,
          confianca: 100,
          origemMatch: "NOVO_ITEM",
          explicacao: "Item novo: será adicionado ao Catálogo Master e memória De-Para.",
          sugestao: {
            codigo: "__NOVO_ITEM__",
            descricao: novaDescricaoOficial || copy[idx].descricaoFornecedor,
            categoria: "GERAL",
            unidade: copy[idx].unidadeFornecedor || "un",
            precoAtual: copy[idx].precoUnitarioFornecedor,
            menorPrecoAtual: copy[idx].precoUnitarioFornecedor,
            fornecedorMenorPreco: fornecedorInfo?.razaoSocial || "Fornecedor"
          },
          isMenorPreco: true
        };
      } else {
        const itemOficial = (catalogoOficial.length > 0 ? catalogoOficial : catalogoMateriais).find(
          (m) => m.codigo === novoCodigoOficial
        );

        if (itemOficial) {
          const precoFornec = copy[idx].precoUnitarioFornecedor;
          const menorAtual = itemOficial.menorPreco || itemOficial.precoUnitario || itemOficial.precoBaseUnitario || 0;
          const eMenor = menorAtual > 0 ? precoFornec < menorAtual : true;

          copy[idx] = {
            ...copy[idx],
            codigoOficialSelecionado: itemOficial.codigo,
            descricaoOficialSelecionada: itemOficial.descricao,
            confirmado: true,
            confianca: 100,
            origemMatch: "MANUAL",
            explicacao: "Selecionado manualmente pelo operador no catálogo.",
            sugestao: {
              codigo: itemOficial.codigo,
              descricao: itemOficial.descricao,
              categoria: itemOficial.categoria || itemOficial.tipo || "GERAL",
              unidade: itemOficial.unidade || "un",
              precoAtual: itemOficial.precoUnitario || itemOficial.precoBaseUnitario || 0,
              menorPrecoAtual: itemOficial.menorPreco,
              fornecedorMenorPreco: itemOficial.fornecedorMenorPreco
            },
            isMenorPreco: eMenor
          };
        }
      }
      return copy;
    });
  };

  // Comando Automático: Adicionar Todos os Itens Pendentes sem vínculo ao Catálogo Master
  const handleAdicionarTodosPendentes = () => {
    let pendentesCount = 0;
    setItensConciliacao((prev) =>
      prev.map((it) => {
        if (!it.codigoOficialSelecionado || it.codigoOficialSelecionado === "") {
          pendentesCount++;
          return {
            ...it,
            codigoOficialSelecionado: "__NOVO_ITEM__",
            descricaoOficialSelecionada: it.descricaoFornecedor,
            confirmado: true,
            confianca: 100,
            origemMatch: "NOVO_ITEM",
            explicacao: "Item novo: será adicionado ao Catálogo Master e memória De-Para.",
            sugestao: {
              codigo: "__NOVO_ITEM__",
              descricao: it.descricaoFornecedor,
              categoria: "GERAL",
              unidade: it.unidadeFornecedor || "un",
              precoAtual: it.precoUnitarioFornecedor,
              menorPrecoAtual: it.precoUnitarioFornecedor,
              fornecedorMenorPreco: fornecedorInfo?.razaoSocial || "Fornecedor"
            },
            isMenorPreco: true
          };
        }
        return it;
      })
    );
  };

  // Confirmar todos com alta confiança
  const handleConfirmarAltaConfianca = () => {
    setItensConciliacao((prev) =>
      prev.map((it) => ({
        ...it,
        confirmado: it.confianca >= 75 && Boolean(it.codigoOficialSelecionado)
      }))
    );
  };

  // Confirmar todos
  const handleConfirmarTodos = () => {
    setItensConciliacao((prev) =>
      prev.map((it) => ({
        ...it,
        confirmado: Boolean(it.codigoOficialSelecionado)
      }))
    );
  };

  // Desmarcar todos
  const handleDesmarcarTodos = () => {
    setItensConciliacao((prev) => prev.map((it) => ({ ...it, confirmado: false })));
  };

  // Salvar no Banco e Atualizar Catálogo
  const handleSalvarConciliacao = async () => {
    const itensConfirmados = itensConciliacao.filter(
      (it) => it.confirmado && it.codigoOficialSelecionado
    );

    if (itensConfirmados.length === 0) {
      alert("Selecione e confirme pelo menos um item vinculado para atualizar o catálogo.");
      return;
    }

    try {
      setSalvandoFinal(true);

      const vinculos = itensConfirmados.map((it) => ({
        codigoFornecedor: it.codigoFornecedor || null,
        descricaoFornecedor: it.descricaoFornecedor,
        codigoOficial: it.codigoOficialSelecionado,
        descricaoOficial: it.descricaoOficialSelecionada,
        cadastrarComoNovo: it.codigoOficialSelecionado === "__NOVO_ITEM__",
        precoUnitario: it.precoUnitarioFornecedor,
        quantidade: it.quantidade,
        unidade: it.unidadeFornecedor || null,
        marca: it.marca || null,
        categoria: it.sugestao?.categoria || "GERAL"
      }));

      const res = await fetch("/api/orcamentos/conciliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRMAR",
          fornecedorNome: fornecedorInfo?.razaoSocial || fornecedorInfo?.nomeFantasia || "Fornecedor",
          fornecedorCnpj: fornecedorInfo?.cnpj,
          numeroOrcamento: fornecedorInfo?.numeroOrcamento,
          dataOrcamento: fornecedorInfo?.dataOrcamento,
          arquivoUrl,
          vinculos
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao salvar vínculos no catálogo.");
      }

      setResultadoFinal({
        totalConfirmados: vinculos.length,
        materiaisCriados: data.materiaisCriados || 0,
        materiaisAtualizados: data.materiaisAtualizados || vinculos.length,
        fornecedor: fornecedorInfo?.razaoSocial || "Fornecedor",
        numeroOrcamento: fornecedorInfo?.numeroOrcamento || "S/N"
      });

      // Mapeamento de novos preços para atualizar a tela pai imediatamente
      const mapaPrecosAtualizados: Record<string, number> = {};
      vinculos.forEach((v) => {
        if (v.codigoOficial && v.precoUnitario) {
          mapaPrecosAtualizados[v.codigoOficial] = v.precoUnitario;
        }
      });

      onSucesso(mapaPrecosAtualizados);
      setFase("SUCESSO");
    } catch (err: any) {
      console.error("Erro ao finalizar conciliação:", err);
      alert(err.message || "Erro ao salvar no banco de dados.");
    } finally {
      setSalvandoFinal(false);
    }
  };

  // Filtragem dos itens exibidos
  const itensFiltrados = itensConciliacao.filter((it) => {
    // Filtro texto
    const matchTexto =
      !filtroBusca ||
      it.descricaoFornecedor.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      (it.codigoFornecedor && it.codigoFornecedor.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      (it.descricaoOficialSelecionada &&
        it.descricaoOficialSelecionada.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      (it.codigoOficialSelecionado &&
        it.codigoOficialSelecionado.toLowerCase().includes(filtroBusca.toLowerCase()));

    if (!matchTexto) return false;

    // Filtro status
    if (filtroStatus === "MENOR_PRECO") return it.isMenorPreco;
    if (filtroStatus === "PENDENTES") return !it.confirmado;
    if (filtroStatus === "ALTA_CONFIANCA") return it.confianca >= 80;

    return true;
  });

  const totalConfirmados = itensConciliacao.filter((it) => it.confirmado && it.codigoOficialSelecionado).length;
  const totalMenoresPrecos = itensConciliacao.filter((it) => it.isMenorPreco).length;
  const totalAltaConfianca = itensConciliacao.filter((it) => it.confianca >= 80).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#0A192F] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E45318]/20 border border-[#E45318]/40 flex items-center justify-center text-[#E45318]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Leitor Inteligente de Orçamentos & Conciliação
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00B356]/20 text-[#00B356] border border-[#00B356]/30">
                  IA Multimodal
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Padrão CEMIG, CoenergyGO e CAPEX integrados com memória De-Para e seleção de menor preço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#F8FAFC]">
          
          {/* FASE 1: UPLOAD */}
          {fase === "UPLOAD" && (
            <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files[0]) handleSelecionarArquivo(files[0]);
                }}
                className={`border-2 border-dashed rounded-3xl p-10 transition-all ${
                  dragOver
                    ? "border-[#E45318] bg-[#E45318]/5 scale-[1.01]"
                    : "border-slate-300 hover:border-slate-400 bg-white"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-600 mb-4 shadow-sm">
                  <UploadCloud className="w-8 h-8 text-[#E45318]" />
                </div>
                <h3 className="text-base font-black text-slate-800 mb-1">
                  Arraste e solte o orçamento aqui
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Suporta arquivos <b>PDF</b> e <b>Fotos / Imagens</b> (JPEG, PNG, WebP) de orçamentos de balcão
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files[0]) handleSelecionarArquivo(files[0]);
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#E45318] hover:bg-[#c94512] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition active:scale-95 inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Selecionar Arquivo do Computador
                </button>
              </div>

              {/* Informações dos orçamentos locais identificados */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left space-y-2">
                <p className="text-xs font-black text-slate-700 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#00B356]" />
                  Orçamentos identificados na pasta Downloads para teste imediato:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-800">2282821 CoEn.PDF</p>
                    <p className="text-[11px] text-slate-500">Universo Elétrico • 16 itens • Total R$ 16.282,06</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-800">2286514 CoEn.PDF</p>
                    <p className="text-[11px] text-slate-500">Universo Elétrico • 25 itens • Total R$ 6.900,00</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FASE 2: PROCESSANDO */}
          {fase === "PROCESSANDO" && (
            <div className="max-w-md mx-auto py-16 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-[#E45318] animate-spin" />
                <Sparkles className="w-8 h-8 text-[#E45318] absolute inset-0 m-auto" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                Lendo e Analisando Orçamento
              </h3>
              <p className="text-xs text-slate-600 font-medium animate-pulse">
                {etapaTexto}
              </p>
              <div className="text-[11px] text-slate-400 bg-white p-3 rounded-xl border border-slate-200 inline-block">
                Arquivo: <b>{arquivo?.name}</b>
              </div>
            </div>
          )}

          {/* FASE 3: CONCILIAÇÃO (DE-PARA ESTILO CONTA AZUL) */}
          {fase === "CONCILIACAO" && (
            <div className="space-y-4">
              
              {/* Card de Resumo do Fornecedor */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      {fornecedorInfo?.razaoSocial || fornecedorInfo?.nomeFantasia || "Fornecedor Identificado"}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      {fornecedorInfo?.cnpj && <span>CNPJ: {fornecedorInfo.cnpj}</span>}
                      {fornecedorInfo?.numeroOrcamento && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          Orçamento nº {fornecedorInfo.numeroOrcamento}
                        </span>
                      )}
                      {fornecedorInfo?.dataOrcamento && <span>Data: {fornecedorInfo.dataOrcamento}</span>}
                    </p>
                  </div>
                </div>

                {/* Métricas Rápidas */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Itens Lidos</p>
                    <p className="text-sm font-black text-slate-800">{itensConciliacao.length}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-center">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Alta Confiança</p>
                    <p className="text-sm font-black text-emerald-700">{totalAltaConfianca}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
                    <p className="text-[10px] text-amber-600 font-bold uppercase">Menores Preços</p>
                    <p className="text-sm font-black text-amber-700">{totalMenoresPrecos}</p>
                  </div>
                </div>
              </div>

              {/* Barra de Ações e Filtros */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                {/* Busca */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por descrição do fornecedor ou código oficial..."
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00BFA5]"
                  />
                </div>

                {/* Filtro rápido */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("TODOS")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filtroStatus === "TODOS" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Todos ({itensConciliacao.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("MENOR_PRECO")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filtroStatus === "MENOR_PRECO" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Menor Preço ({totalMenoresPrecos})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("PENDENTES")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filtroStatus === "PENDENTES" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Pendentes ({itensConciliacao.length - totalConfirmados})
                  </button>
                </div>

                {/* Botões de Ação em Lote */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Comando para Adicionar Itens Inéditos / Pendentes Automaticamente */}
                  <button
                    type="button"
                    onClick={handleAdicionarTodosPendentes}
                    className="px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
                    title="Marca todos os itens que ainda não possuem vínculo para serem cadastrados automaticamente como novos itens no Catálogo Master"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    Adicionar Pendentes ao Catálogo
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmarAltaConfianca}
                    className="px-3 py-1.5 text-xs font-bold bg-[#00B356] hover:bg-[#009447] text-white rounded-xl transition"
                    title="Marca 'Confirmar' para todos os itens onde a IA tem mais de 80% de certeza"
                  >
                    Confirmar Sugestões (&gt;80%)
                  </button>
                  <button
                    type="button"
                    onClick={handleDesmarcarTodos}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Tabela de Conciliação Estilo Conta Azul */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-black border-b border-slate-200 uppercase text-[10px]">
                        <th className="p-3 w-12 text-center">Confirmar</th>
                        <th className="p-3 w-5/12">Item no Orçamento (Fornecedor)</th>
                        <th className="p-3 w-5/12">Correspondência no Catálogo Oficial (Cordeiro)</th>
                        <th className="p-3 w-2/12 text-right">Preço & Comparativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            Nenhum item encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        itensFiltrados.map((item) => {
                          const originalIdx = itensConciliacao.findIndex(
                            (it) => it.itemNumero === item.itemNumero
                          );

                          return (
                            <tr
                              key={item.itemNumero}
                              className={`transition ${
                                item.confirmado ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-slate-50"
                              }`}
                            >
                              {/* Checkbox Confirmar */}
                              <td className="p-3 text-center align-top">
                                <input
                                  type="checkbox"
                                  checked={item.confirmado || false}
                                  onChange={() => toggleConfirmarItem(originalIdx)}
                                  className="w-4 h-4 rounded text-[#00B356] focus:ring-[#00B356] cursor-pointer"
                                />
                              </td>

                              {/* Lado Esquerdo: Fornecedor */}
                              <td className="p-3 align-top space-y-1">
                                <div className="flex items-center gap-2">
                                  {item.codigoFornecedor && (
                                    <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                      Cód: {item.codigoFornecedor}
                                    </span>
                                  )}
                                  {item.marca && (
                                    <span className="text-[10px] font-bold text-slate-500">
                                      Marca: {item.marca}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    Qtd: <b>{item.quantidade}</b> {item.unidadeFornecedor || "un"}
                                  </span>
                                </div>
                                <p className="font-bold text-slate-800 leading-snug">
                                  {item.descricaoFornecedor}
                                </p>
                              </td>

                              {/* Lado Central: Catálogo Oficial & De-Para */}
                              <td className="p-3 align-top space-y-2">
                                {/* Badge de Confiança / Match */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.codigoOficialSelecionado === "__NOVO_ITEM__" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <PackagePlus className="w-3 h-3 text-emerald-600" />
                                      Item Novo (Cadastrar no Catálogo)
                                    </span>
                                  ) : item.confianca >= 90 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      {item.confianca}% de Confiança ({item.origemMatch})
                                    </span>
                                  ) : item.confianca >= 70 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                      <Sparkles className="w-3 h-3 text-amber-600" />
                                      {item.confianca}% Sugestão IA
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                                      Atenção (Revisar Vínculo)
                                    </span>
                                  )}

                                  {item.explicacao && (
                                    <span className="text-[10px] text-slate-500 italic">
                                      {item.explicacao}
                                    </span>
                                  )}
                                </div>

                                {/* Seletor Pesquisável com Suporte a Sinônimos e Opção Adicionar Item */}
                                <SeletorItemCatalogo
                                  itemFornecedor={{
                                    descricaoFornecedor: item.descricaoFornecedor,
                                    codigoFornecedor: item.codigoFornecedor,
                                    precoUnitarioFornecedor: item.precoUnitarioFornecedor,
                                    unidadeFornecedor: item.unidadeFornecedor
                                  }}
                                  codigoSelecionado={item.codigoOficialSelecionado}
                                  descricaoSelecionada={item.descricaoOficialSelecionada}
                                  catalogo={catalogoOficial.length > 0 ? catalogoOficial : catalogoMateriais}
                                  onSelect={(cod, desc, isNovo) =>
                                    handleAlterarMatchManual(originalIdx, cod, desc, isNovo)
                                  }
                                />
                              </td>

                              {/* Lado Direito: Comparativo de Preço */}
                              <td className="p-3 align-top text-right space-y-1">
                                <div className="font-black text-sm text-slate-900">
                                  {item.precoUnitarioFornecedor.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL"
                                  })}
                                </div>

                                {item.sugestao && (
                                  <div className="text-[10px] text-slate-500">
                                    Catálogo: R$ {(item.sugestao.precoAtual ?? 0).toFixed(2)}
                                  </div>
                                )}

                                {item.isMenorPreco ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <TrendingDown className="w-3 h-3 text-emerald-600" />
                                    Menor Preço!
                                  </span>
                                ) : (
                                  item.sugestao?.menorPrecoAtual && (
                                    <span className="text-[10px] text-slate-400 block">
                                      Menor já cotado: R$ {item.sugestao.menorPrecoAtual.toFixed(2)}
                                    </span>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Barra Inferior com Botão de Confirmação Final */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-black text-slate-900">{totalConfirmados}</span> itens marcados para sincronizar com a base de dados oficial.
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFase("UPLOAD")}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Voltar / Trocar Arquivo
                  </button>

                  <button
                    type="button"
                    onClick={handleSalvarConciliacao}
                    disabled={salvandoFinal || totalConfirmados === 0}
                    className="flex-1 sm:flex-none bg-[#00B356] hover:bg-[#009447] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    {salvandoFinal ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Atualizando Catálogo...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Salvar Vínculos & Atualizar Preços
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FASE 4: SUCESSO */}
          {fase === "SUCESSO" && (
            <div className="max-w-md mx-auto py-12 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Catálogo Atualizado com Sucesso!
              </h3>
              <p className="text-xs text-slate-600">
                Foram sincronizados <b>{resultadoFinal?.totalConfirmados}</b> itens da cotação de{" "}
                <b>{resultadoFinal?.fornecedor}</b> (Orç. {resultadoFinal?.numeroOrcamento}).
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
                {Boolean(resultadoFinal?.materiaisCriados && resultadoFinal.materiaisCriados > 0) && (
                  <p className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <b>{resultadoFinal.materiaisCriados}</b> novos itens cadastrados diretamente no Catálogo Master!
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  Memória <i>De-Para</i> gravada (reconhecimento automático em futuros orçamentos).
                </p>
                <p className="flex items-center gap-1.5 text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  Preços unitários e menores preços atualizados no Padrão CEMIG e CAPEX.
                </p>
                <p className="flex items-center gap-1.5 text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  Histórico de cotação registrado para auditoria de compras.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="bg-[#0A192F] hover:bg-slate-800 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-md transition active:scale-95"
              >
                Concluir & Visualizar Lista
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default ConciliacaoOrcamentoModal;
