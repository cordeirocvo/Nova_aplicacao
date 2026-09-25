"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, X, Package, Check, Tag } from "lucide-react";

interface MaterialDB {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  unidade: string;
  precoUnitario: number;
  observacao?: string;
}

interface AdicionarMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdicionarItem: (item: {
    codigo: string;
    descricao: string;
    categoria: string;
    unidade: string;
    quantidade: number;
    precoUnitario: number;
    precoTotal: number;
    obrigatorioNorma: boolean;
  }) => void;
}

const CATEGORIAS = [
  { id: "TODAS", label: "Todas as Categorias" },
  { id: "POSTE", label: "Postes e Suportes" },
  { id: "CAIXA", label: "Caixas de Medição/Proteção" },
  { id: "DISJUNTOR", label: "Disjuntores IEC" },
  { id: "CONDUTOR", label: "Cabos e Condutores" },
  { id: "ELETRODUTO", label: "Eletrodutos e Conexões" },
  { id: "ATERRAMENTO", label: "Aterramento e Hastes" },
  { id: "FERRAGEM", label: "Ferragens e Fixações" },
  { id: "ACESSORIO", label: "Acessórios" },
  { id: "MAO_DE_OBRA", label: "Mão de Obra e Engenharia" },
];

export default function AdicionarMaterialModal({
  isOpen,
  onClose,
  onAdicionarItem,
}: AdicionarMaterialModalProps) {
  const [materiais, setMateriais] = useState<MaterialDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("TODAS");
  const [abaModo, setAbaModo] = useState<"BANCO" | "AVULSO">("BANCO");

  // Form para item avulso
  const [avulsoDescricao, setAvulsoDescricao] = useState("");
  const [avulsoCategoria, setAvulsoCategoria] = useState("ACESSORIO");
  const [avulsoUnidade, setAvulsoUnidade] = useState("un");
  const [avulsoQuantidade, setAvulsoQuantidade] = useState(1);
  const [avulsoPrecoUnitario, setAvulsoPrecoUnitario] = useState(0);

  // Carregar materiais do banco
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/cemig/materiais")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.materiais)) {
            setMateriais(data.materiais);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const materiaisFiltrados = materiais.filter((m) => {
    const matchCat = categoriaAtiva === "TODAS" || m.categoria === categoriaAtiva;
    const matchBusca =
      !busca ||
      m.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      m.codigo.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  const handleSelecionarBanco = (mat: MaterialDB) => {
    onAdicionarItem({
      codigo: mat.codigo,
      descricao: mat.descricao,
      categoria: mat.categoria,
      unidade: mat.unidade,
      quantidade: 1,
      precoUnitario: mat.precoUnitario,
      precoTotal: mat.precoUnitario,
      obrigatorioNorma: false,
    });
    onClose();
  };

  const handleAdicionarAvulso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!avulsoDescricao.trim()) return;

    onAdicionarItem({
      codigo: `AVULSO-${Date.now().toString().slice(-4)}`,
      descricao: avulsoDescricao.trim(),
      categoria: avulsoCategoria,
      unidade: avulsoUnidade,
      quantidade: Number(avulsoQuantidade) || 1,
      precoUnitario: Number(avulsoPrecoUnitario) || 0,
      precoTotal: (Number(avulsoQuantidade) || 1) * (Number(avulsoPrecoUnitario) || 0),
      obrigatorioNorma: false,
    });

    setAvulsoDescricao("");
    setAvulsoPrecoUnitario(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#00BFA5]/20 text-[#00BFA5] rounded-xl border border-[#00BFA5]/30">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Adicionar Material à Lista</h3>
              <p className="text-xs text-slate-400">
                Selecione um item homologado do catálogo CEMIG ou insira um item personalizado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Modo */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setAbaModo("BANCO")}
            className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
              abaModo === "BANCO"
                ? "border-[#00BFA5] text-[#00BFA5]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package className="w-4 h-4" /> Catálogo CEMIG no Banco ({materiais.length} itens)
          </button>
          <button
            onClick={() => setAbaModo("AVULSO")}
            className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
              abaModo === "AVULSO"
                ? "border-[#00BFA5] text-[#00BFA5]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus className="w-4 h-4" /> Criar Item Avulso / Customizado
          </button>
        </div>

        {/* Conteúdo Modo Banco */}
        {abaModo === "BANCO" && (
          <div className="p-6 flex-1 flex flex-col overflow-hidden">
            {/* Filtros e Busca */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por descrição ou código do material..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:bg-white transition"
                />
              </div>
              <div>
                <select
                  value={categoriaAtiva}
                  onChange={(e) => setCategoriaAtiva(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:bg-white font-medium text-slate-700"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista de Materiais */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {loading ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="animate-spin w-8 h-8 border-2 border-[#00BFA5] border-t-transparent rounded-full mx-auto mb-2" />
                  Carregando catálogo de materiais...
                </div>
              ) : materiaisFiltrados.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  Nenhum material encontrado com os filtros aplicados.
                </div>
              ) : (
                materiaisFiltrados.map((mat) => (
                  <div
                    key={mat.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-[#00BFA5] transition-all flex items-center justify-between gap-4 group hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                          {mat.codigo}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {mat.categoria}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 truncate">{mat.descricao}</p>
                      {mat.observacao && (
                        <p className="text-xs text-slate-400 truncate">{mat.observacao}</p>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-base font-black text-slate-900">
                          {mat.precoUnitario.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">por {mat.unidade}</p>
                      </div>
                      <button
                        onClick={() => handleSelecionarBanco(mat)}
                        className="bg-[#00BFA5] hover:bg-[#009688] text-white p-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                      >
                        <Plus className="w-4 h-4" /> Adicionar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Conteúdo Modo Avulso */}
        {abaModo === "AVULSO" && (
          <form onSubmit={handleAdicionarAvulso} className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4 max-w-xl mx-auto w-full">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Descrição do Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Quadro de Distribuição Auxiliar 4 Din, Viga metálica..."
                  value={avulsoDescricao}
                  onChange={(e) => setAvulsoDescricao(e.target.value)}
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={avulsoCategoria}
                    onChange={(e) => setAvulsoCategoria(e.target.value)}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                  >
                    <option value="POSTE">Poste e Estrutura</option>
                    <option value="CAIXA">Caixas e Quadros</option>
                    <option value="DISJUNTOR">Disjuntores e Proteção</option>
                    <option value="CONDUTOR">Cabos e Fios</option>
                    <option value="ELETRODUTO">Eletrodutos e Conexões</option>
                    <option value="ATERRAMENTO">Aterramento</option>
                    <option value="FERRAGEM">Ferragens e Ancoragem</option>
                    <option value="ACESSORIO">Acessórios Gerais</option>
                    <option value="MAO_DE_OBRA">Mão de Obra e Serviços</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Unidade
                  </label>
                  <select
                    value={avulsoUnidade}
                    onChange={(e) => setAvulsoUnidade(e.target.value)}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="m">Metros (m)</option>
                    <option value="cj">Conjunto (cj)</option>
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="sv">Serviço (sv)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={avulsoQuantidade}
                    onChange={(e) => setAvulsoQuantidade(Number(e.target.value))}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Preço Unitário (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={avulsoPrecoUnitario}
                    onChange={(e) => setAvulsoPrecoUnitario(Number(e.target.value))}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFA5]"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-800 uppercase">Subtotal do Item:</span>
                <span className="text-lg font-black text-emerald-700">
                  {((Number(avulsoQuantidade) || 0) * (Number(avulsoPrecoUnitario) || 0)).toLocaleString(
                    "pt-BR",
                    { style: "currency", currency: "BRL" }
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#00BFA5] text-white font-bold text-sm hover:bg-[#009688] transition shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Inserir Item na Lista
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
