"use client";

import React, { useState } from "react";
import {
  Plus,
  X,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Package,
  Layers,
  DollarSign,
  Info,
  Loader2
} from "lucide-react";

interface SolicitarNovoMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCriado?: (item: any) => void;
  onSuccess?: () => void;
  origem?: string;
}

export function SolicitarNovoMaterialModal({
  isOpen,
  onClose,
  onItemCriado,
  onSuccess,
  origem = "MODULO_ENGENHARIA"
}: SolicitarNovoMaterialModalProps) {
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"Material" | "Mão de Obra">("Material");
  const [unidade, setUnidade] = useState("un");
  const [precoEstimado, setPrecoEstimado] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setErroMsg("A descrição técnica do material é obrigatória.");
      return;
    }

    try {
      setSalvando(true);
      setErroMsg(null);
      setSucessoMsg(null);

      const res = await fetch("/api/orcamentos/novo-item-com-alerta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricao.trim(),
          unidade: unidade.trim() || "un",
          tipo,
          precoManual: precoEstimado ? parseFloat(precoEstimado) : undefined,
          observacao: observacao.trim() || undefined,
          origem
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao cadastrar material no catálogo master.");
      }

      setSucessoMsg(data.mensagemAlerta || "Material cadastrado e notificação enviada à equipe de compras!");
      
      if (onItemCriado && data.item) {
        onItemCriado(data.item);
      }
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setDescricao("");
        setPrecoEstimado("");
        setObservacao("");
        setSucessoMsg(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErroMsg(err.message || "Erro de conexão ao salvar material.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto font-['Montserrat',sans-serif]">
      <div className="bg-[#0A192F] border border-slate-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-[#0A192F] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#E45318]/20 border border-[#E45318]/40 rounded-2xl">
              <ShoppingBag className="w-6 h-6 text-[#E45318]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E45318] text-white">
                  Catálogo Master & Compras
                </span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Alerta de Cotação Ativo
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                Solicitar Novo Material / Cotação
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {erroMsg && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl flex items-center gap-3 text-rose-200 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{erroMsg}</span>
            </div>
          )}

          {sucessoMsg && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{sucessoMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#E45318]" />
              Descrição Técnica do Insumo / Equipamento *
            </label>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Disjuntor Caixa Moldada 200A Curva D 25kA ou Transformador 75kVA a Seco"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-[#E45318] focus:outline-hidden transition"
            />
            <span className="text-[10px] text-slate-400">
              Descreva com detalhes elétricos (bitola, corrente, tensão, modelo) para facilitar a cotação por IA.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Tipo de Insumo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:border-[#E45318] focus:outline-hidden"
              >
                <option value="Material">Material Físico</option>
                <option value="Mão de Obra">Mão de Obra / Serviço</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Unidade de Medida</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:border-[#E45318] focus:outline-hidden"
              >
                <option value="un">un (Unidade)</option>
                <option value="m">m (Metro)</option>
                <option value="cj">cj (Conjunto)</option>
                <option value="pc">pç (Peça)</option>
                <option value="kg">kg (Quilo)</option>
                <option value="vb">vb (Verba)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Preço Ref. (Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precoEstimado}
                onChange={(e) => setPrecoEstimado(e.target.value)}
                placeholder="Ex: 850.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:border-[#E45318] focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Observações / Instruções para a Equipe de Compras
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Fabricante preferencial Soprano, WEG ou Schneider. Prazo de entrega crítico para a obra."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#E45318] focus:outline-hidden transition"
            />
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#00B356] shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              <strong>Como funciona a integração:</strong> Ao salvar, o item é inserido no Catálogo Master (`OrcamentoItemPadrao`),
              recebe uma estimativa de mercado preliminar para não travar o dimensionamento e fica marcado como 
              <span className="text-amber-400 font-bold"> "Pendente de Cotação"</span> para que a equipe de compras solicite preços aos fornecedores.
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E45318] to-[#ff6b2b] hover:from-[#d04610] hover:to-[#e45318] text-white text-xs font-black shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando & Notificando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Insumo & Notificar Compras
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
