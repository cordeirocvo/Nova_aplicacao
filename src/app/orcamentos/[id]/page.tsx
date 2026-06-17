"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ListTree, Users, BarChart, Loader, FileText } from "lucide-react";
import EapTab from "./EapTab";
import CotacoesTab from "./CotacoesTab";
import EqualizacaoTab from "./EqualizacaoTab";
import RelatorioTab from "./RelatorioTab";

export default function OrcamentoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"EAP" | "COTACOES" | "EQUALIZACAO" | "RELATORIO">("EAP");

  useEffect(() => {
    fetchOrcamento();
  }, [params.id]);

  const fetchOrcamento = async () => {
    try {
      const res = await fetch(`/api/orcamentos/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) router.push("/orcamentos");
        return;
      }
      const data = await res.json();
      setOrcamento(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader className="w-10 h-10 animate-spin text-[#00BFA5]" />
      </div>
    );
  }

  if (!orcamento) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push("/orcamentos")}
          className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-[#1E3A8A]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{orcamento.nome}</h1>
          <p className="text-sm font-medium text-slate-500">Gestão de CAPEX • {orcamento.cliente || "Cliente Geral"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("EAP")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === "EAP" 
              ? "bg-[#1E3A8A] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          <ListTree className="w-4 h-4" /> EAP & Escopo Base
        </button>
        <button
          onClick={() => setActiveTab("COTACOES")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === "COTACOES" 
              ? "bg-[#1E3A8A] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" /> Portal de Fornecedores
        </button>
        <button
          onClick={() => setActiveTab("EQUALIZACAO")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === "EQUALIZACAO" 
              ? "bg-[#1E3A8A] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          <BarChart className="w-4 h-4" /> Equalização & Saving
        </button>
        <button
          onClick={() => setActiveTab("RELATORIO")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === "RELATORIO" 
              ? "bg-[#00BFA5] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-4 h-4" /> Relatório Analítico
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8 min-h-[500px]">
        {activeTab === "EAP" && <EapTab orcamento={orcamento} onUpdate={fetchOrcamento} />}
        {activeTab === "COTACOES" && <CotacoesTab orcamento={orcamento} onUpdate={fetchOrcamento} />}
        {activeTab === "EQUALIZACAO" && <EqualizacaoTab orcamento={orcamento} onUpdate={fetchOrcamento} />}
        {activeTab === "RELATORIO" && <RelatorioTab orcamento={orcamento} />}
      </div>
    </div>
  );
}
