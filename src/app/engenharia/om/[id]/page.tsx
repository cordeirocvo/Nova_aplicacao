"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Box, Calendar, Plus, PenTool, AlertCircle, FileText, Camera } from "lucide-react";
import Link from "next/link";
import EquipamentosTab from "./EquipamentosTab";
import CalendarioTab from "./CalendarioTab";
import EstatisticasTab from "./EstatisticasTab";
import ComissionamentoTab from "./ComissionamentoTab";
import TermografiaTab from "./TermografiaTab";

export default function UsinaDetails() {
  const params = useParams();
  const id = params?.id as string;
  const [usina, setUsina] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"EQUIPAMENTOS" | "CALENDARIO" | "ESTATISTICAS" | "COMISSIONAMENTO" | "TERMOGRAFIA">("EQUIPAMENTOS");
  const [loading, setLoading] = useState(true);

  const fetchUsina = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engenharia/om/usinas?id=${id}`);
      const data = await res.json();
      setUsina(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchUsina();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!usina) {
    return <div className="p-8 text-center text-slate-500">Usina não encontrada.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/engenharia/om" className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-800">{usina.nome}</h1>
          <p className="text-slate-500 font-medium">{usina.localizacao} • Vinculado ao Projeto: {usina.projeto?.nome}</p>
        </div>
      </div>

      <div className="flex bg-white rounded-2xl border border-slate-100 p-2 shadow-sm overflow-x-auto w-max">
        <button
          onClick={() => setActiveTab("EQUIPAMENTOS")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === "EQUIPAMENTOS" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Box className="w-4 h-4" /> Equipamentos / TAGs
        </button>
        <button
          onClick={() => setActiveTab("CALENDARIO")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === "CALENDARIO" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-4 h-4" /> Plano & Calendário
        </button>
        <button
          onClick={() => setActiveTab("ESTATISTICAS")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === "ESTATISTICAS" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <PenTool className="w-4 h-4" /> Estatísticas & KPIs
        </button>
        <button
          onClick={() => setActiveTab("COMISSIONAMENTO")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === "COMISSIONAMENTO" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-4 h-4" /> Comissionamento
        </button>
        <button
          onClick={() => setActiveTab("TERMOGRAFIA")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === "TERMOGRAFIA" ? "bg-[#EB5E28] text-white shadow-md shadow-orange-200" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Camera className="w-4 h-4" /> Termografia
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 min-h-[500px]">
        {activeTab === "EQUIPAMENTOS" && <EquipamentosTab usinaId={id} usina={usina} onRefresh={fetchUsina} />}
        {activeTab === "CALENDARIO" && <CalendarioTab usinaId={id} usina={usina} onRefresh={fetchUsina} />}
        {activeTab === "ESTATISTICAS" && <EstatisticasTab usina={usina} />}
        {activeTab === "COMISSIONAMENTO" && <ComissionamentoTab usinaId={id} usina={usina} onRefresh={fetchUsina} />}
        {activeTab === "TERMOGRAFIA" && <TermografiaTab usinaId={id} usina={usina} onRefresh={fetchUsina} />}
      </div>
    </div>
  );
}
