"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Check,
  X,
  ChevronDown,
  Sparkles,
  PackagePlus,
  Ban,
  ArrowRight
} from "lucide-react";

// Dicionário de Sinônimos Eletrotécnicos e Termos Populares vs Técnicos
// Ex: "enforca gato" <-> "abraçadeira", "espaguete" <-> "termoencolhível"
const DICIONARIO_SINONIMOS: Record<string, string[]> = {
  "enforca gato": ["abracadeira", "nylon", "cinta plastica", "helashrink", "d-tork"],
  "enforcagato": ["abracadeira", "nylon", "cinta plastica", "helashrink"],
  "abracadeira": ["enforca gato", "enforcagato", "cinta", "nylon", "helashrink", "fita aco"],
  "fita isolante": ["fita auto fusao", "autofusao", "fita 3m", "vinilica"],
  "autofusao": ["fita isolante", "alta tensao", "fusao"],
  "termoencolhivel": ["espaguete", "termo retratil", "tubo termo", "termoencolhivel"],
  "espaguete": ["termoencolhivel", "termo retratil", "tubo termo"],
  "disjuntor": ["dijuntor", "dij", "dj", "chave", "termomagnetico", "caixa moldada", "mini disjuntor"],
  "dijuntor": ["disjuntor"],
  "dij": ["disjuntor"],
  "chave geral": ["disjuntor", "seccionadora"],
  "olhal": ["terminal compressao", "terminal sapata", "terminal de compressao"],
  "sapata": ["terminal compressao", "olhal", "terminal"],
  "terminal compressao": ["olhal", "sapata", "terminal tubular", "terminal ilhos"],
  "trafo": ["transformador", "transformador elevador", "dyn1"],
  "transformador": ["trafo", "elevador"],
  "eletroduto": ["conduite", "tubo pvc", "duto pead", "mangueira corrugada"],
  "conduite": ["eletroduto", "mangueira", "duto"],
  "mangueira": ["eletroduto", "duto pead", "conduite"],
  "duto": ["eletroduto", "pead", "corrugado"],
  "haste": ["haste cantoneira", "haste cobreada", "haste de terra", "aterramento"],
  "aterramento": ["haste cantoneira", "malha terra", "bep", "haste"],
  "painel": ["quadro", "qgbt", "caixa"],
  "quadro": ["painel", "qgbt", "cm-4", "cm-14", "cm-18"],
  "prensa cabo": ["prensa-cabo", "conector prensa cabo"],
  "rele": ["rele protecao", "rele termico", "pt100"]
};

function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CatalogoItem {
  codigo: string;
  descricao: string;
  categoria?: string;
  unidade?: string;
  precoUnitario?: number;
  precoBaseUnitario?: number;
}

interface SeletorItemCatalogoProps {
  itemFornecedor: {
    descricaoFornecedor: string;
    codigoFornecedor?: string | null;
    precoUnitarioFornecedor: number;
    unidadeFornecedor?: string | null;
  };
  codigoSelecionado?: string;
  descricaoSelecionada?: string;
  catalogo: CatalogoItem[];
  onSelect: (codigo: string, descricao: string, isNovoItem?: boolean) => void;
}

export const SeletorItemCatalogo: React.FC<SeletorItemCatalogoProps> = ({
  itemFornecedor,
  codigoSelecionado,
  descricaoSelecionada,
  catalogo,
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focar campo de busca
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Encontrar item atual no catálogo
  const itemAtual = useMemo(() => {
    if (!codigoSelecionado || codigoSelecionado === "__NOVO_ITEM__") return null;
    return catalogo.find((c) => c.codigo === codigoSelecionado);
  }, [codigoSelecionado, catalogo]);

  const isNovoItemSelecionado = codigoSelecionado === "__NOVO_ITEM__";

  // Expansão de sinônimos para a busca
  const sinonimosExpandidos = useMemo(() => {
    if (!termoBusca.trim()) return [];
    const norm = normalizarTexto(termoBusca);
    const expandidos: string[] = [norm];

    // Checar cada chave do dicionário
    Object.entries(DICIONARIO_SINONIMOS).forEach(([chave, valores]) => {
      const normChave = normalizarTexto(chave);
      if (norm.includes(normChave) || normChave.includes(norm)) {
        expandidos.push(...valores.map(normalizarTexto));
      }
      valores.forEach((v) => {
        const normV = normalizarTexto(v);
        if (norm.includes(normV) || normV.includes(norm)) {
          expandidos.push(normChave);
        }
      });
    });

    return Array.from(new Set(expandidos));
  }, [termoBusca]);

  // Filtragem dos itens com pontuação de relevância
  const itensFiltrados = useMemo(() => {
    if (!termoBusca.trim()) {
      // Quando não há busca, mostrar os primeiros 40 itens
      return catalogo.slice(0, 40);
    }

    const palavrasBusca = normalizarTexto(termoBusca).split(" ").filter(Boolean);

    const resultados = catalogo.map((item) => {
      const descNorm = normalizarTexto(item.descricao);
      const codNorm = normalizarTexto(item.codigo);

      let score = 0;

      // Correspondência direta por código
      if (codNorm.includes(normalizarTexto(termoBusca))) score += 50;

      // Correspondência direta por palavras
      const todasPalavras = palavrasBusca.every((p) => descNorm.includes(p) || codNorm.includes(p));
      if (todasPalavras) score += 30;

      // Correspondência parcial
      palavrasBusca.forEach((p) => {
        if (descNorm.includes(p)) score += 10;
      });

      // Correspondência por sinônimo expandido (ex: enforca gato -> abraçadeira)
      sinonimosExpandidos.forEach((sin) => {
        if (descNorm.includes(sin)) score += 25;
      });

      return { item, score };
    });

    return resultados
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item)
      .slice(0, 50);
  }, [catalogo, termoBusca, sinonimosExpandidos]);

  const handleSelectNovoItem = () => {
    onSelect("__NOVO_ITEM__", itemFornecedor.descricaoFornecedor, true);
    setIsOpen(false);
    setTermoBusca("");
  };

  const handleSelectNaoVincular = () => {
    onSelect("", "");
    setIsOpen(false);
    setTermoBusca("");
  };

  const handleSelectItemOficial = (item: CatalogoItem) => {
    onSelect(item.codigo, item.descricao, false);
    setIsOpen(false);
    setTermoBusca("");
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botão Gatilho do Seletor */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full p-2.5 text-xs rounded-xl border text-left transition flex items-center justify-between gap-2 shadow-sm ${
          isNovoItemSelecionado
            ? "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70"
            : itemAtual
            ? "bg-slate-50 border-slate-300 text-slate-800 hover:bg-white"
            : "bg-amber-50/50 border-amber-300 text-amber-900 hover:bg-amber-50"
        }`}
      >
        <div className="flex-1 truncate">
          {isNovoItemSelecionado ? (
            <div className="flex items-center gap-1.5 font-black text-emerald-700">
              <PackagePlus className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">
                [Adicionar Item] Cadastrar como novo item no Catálogo Master
              </span>
            </div>
          ) : itemAtual ? (
            <div className="truncate">
              <span className="font-mono text-[10px] font-black bg-slate-200 text-slate-700 px-1 py-0.5 rounded mr-1.5">
                {itemAtual.codigo}
              </span>
              <span className="font-semibold">{itemAtual.descricao}</span>
              <span className="text-[10px] text-slate-400 ml-1.5">
                (R$ {(itemAtual.precoUnitario || itemAtual.precoBaseUnitario || 0).toFixed(2)})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-800 font-medium">
              <Ban className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>-- Não vincular (Ignorar este item) --</span>
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Popover de Busca e Seleção */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-300 p-2 text-xs space-y-2 animate-in fade-in-50 zoom-in-95 duration-150 max-w-full min-w-[320px] sm:min-w-[480px]">
          
          {/* Campo de Pesquisa com Suporte a Sinônimos */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Pesquisar (ex: enforca gato, abraçadeira, cabo 50mm, disjuntor...)"
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BFA5] text-slate-800 font-medium"
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => setTermoBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dica de sinônimo ativo */}
          {sinonimosExpandidos.length > 1 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-800 rounded-lg text-[11px] border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600 flex-shrink-0" />
              <span>
                Buscando também por termos equivalentes:{" "}
                <b>{sinonimosExpandidos.slice(1, 4).join(", ")}</b>
              </span>
            </div>
          )}

          {/* Ações Especiais no Topo */}
          <div className="space-y-1 pb-1 border-b border-slate-100">
            {/* Opção 1: ADICIONAR ITEM AO CATÁLOGO MASTER (Requisito Principal do Usuário) */}
            <button
              type="button"
              onClick={handleSelectNovoItem}
              className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition ${
                isNovoItemSelecionado
                  ? "bg-emerald-600 text-white font-black shadow-sm"
                  : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${isNovoItemSelecionado ? "bg-white/20" : "bg-emerald-200/60 text-emerald-800"}`}>
                <PackagePlus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-black text-xs flex items-center gap-1">
                    Adicionar Item ao Catálogo Master
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isNovoItemSelecionado ? "bg-white/20" : "bg-emerald-200 text-emerald-900"}`}>
                    Novo
                  </span>
                </div>
                <p className={`text-[11px] truncate mt-0.5 ${isNovoItemSelecionado ? "text-emerald-100" : "text-emerald-700"}`}>
                  Cadastra "{itemFornecedor.descricaoFornecedor}" com preço R$ {itemFornecedor.precoUnitarioFornecedor.toFixed(2)} e salva De-Para
                </p>
              </div>
            </button>

            {/* Opção 2: NÃO VINCULAR */}
            <button
              type="button"
              onClick={handleSelectNaoVincular}
              className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 transition text-[11px] ${
                !codigoSelecionado
                  ? "bg-slate-200 text-slate-800 font-bold"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-slate-400" />
              <span>-- Não vincular (Ignorar este item) --</span>
            </button>
          </div>

          {/* Cabeçalho da Lista de Resultados */}
          <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Itens no Catálogo Oficial ({itensFiltrados.length})</span>
            {termoBusca && <span>Filtrado por relevância</span>}
          </div>

          {/* Lista com Rolagem */}
          <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-slate-100 pr-1">
            {itensFiltrados.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-slate-400 text-xs">
                  Nenhum item corresponde a "<b>{termoBusca}</b>".
                </p>
                <button
                  type="button"
                  onClick={handleSelectNovoItem}
                  className="px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl inline-flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar "{itemFornecedor.descricaoFornecedor}" agora
                </button>
              </div>
            ) : (
              itensFiltrados.map((item) => {
                const isSelected = codigoSelecionado === item.codigo;
                const preco = item.precoUnitario || item.precoBaseUnitario || 0;

                return (
                  <button
                    key={item.codigo}
                    type="button"
                    onClick={() => handleSelectItemOficial(item)}
                    className={`w-full p-2 text-left rounded-xl transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-slate-900 text-white font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded ${
                            isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.codigo}
                        </span>
                        {item.categoria && (
                          <span className={`text-[9px] uppercase ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                            • {item.categoria}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {item.descricao}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-xs font-black ${isSelected ? "text-emerald-400" : "text-slate-900"}`}>
                        R$ {preco.toFixed(2)}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto mt-0.5" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeletorItemCatalogo;
