"use client";

import { useState, useEffect } from "react";
import { Search, Plus, MapPin, Phone, Mail, MoreHorizontal, LayoutDashboard, Loader, ChevronRight, Eye, FileText } from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { id: "NOVO", label: "Novos Leads", color: "bg-blue-500" },
  { id: "ANALISE", label: "Em Análise", color: "bg-amber-500" },
  { id: "PROPOSTA", label: "Proposta", color: "bg-purple-500" },
  { id: "NEGOCIACAO", label: "Negociação", color: "bg-indigo-500" },
  { id: "GANHO", label: "Fechado", color: "bg-emerald-500" },
  { id: "PERDIDO", label: "Perdido", color: "bg-red-500" },
];

export default function CRMLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader className="w-10 h-10 animate-spin text-[#1E3A8A]" /></div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#1E3A8A] uppercase tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-[#00BFA5]" /> Gestão de Leads
          </h1>
          <p className="text-slate-500 font-medium mt-1">Funil de Vendas e Acompanhamento de Campo.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/crm/lista"
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:text-[#1E3A8A] hover:border-[#1E3A8A] transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" /> LISTA GERAL
          </Link>
          <Link 
            href="/crm/dashboard"
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:text-[#00BFA5] hover:border-[#00BFA5] transition-all shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4" /> DASHBOARD
          </Link>
          <div className="relative group ml-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1E3A8A] transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar lead..."
              className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-[#1E3A8A] transition-all w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 min-h-[70vh]">
        {COLUMNS.map(col => (
          <div key={col.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 rounded-xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                {col.label}
              </span>
              <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-200">
                {leads.filter(l => l.status === col.id).length}
              </span>
            </div>

            <div className="flex-1 space-y-4">
              {leads.filter(l => l.status === col.id).map(lead => (
                <div key={lead.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group relative">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${lead.tipo === "USINA_SOLAR" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {lead.tipo === "USINA_SOLAR" ? "Usina Solar" : "Desconto"}
                    </span>
                    <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
                  </div>

                  <h3 className="font-black text-slate-800 text-lg leading-tight mb-4 group-hover:text-[#1E3A8A] transition-colors">{lead.nome}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-300" /> {lead.telefone}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-300" /> {lead.email}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                    <div className="flex -space-x-2">
                      {lead.midias?.slice(0, 3).map((m: any, i: number) => (
                        <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
                          <img src={m.arquivoUrl} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {lead.midias?.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          +{lead.midias.length - 3}
                        </div>
                      )}
                    </div>
                    
                    <Link 
                      href={`/crm/${lead.id}`}
                      className="p-3 bg-[#1E3A8A] text-white rounded-2xl shadow-lg shadow-blue-900/20 hover:scale-110 transition-transform"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
