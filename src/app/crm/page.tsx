"use client";

import { useState, useEffect } from "react";
import { 
  Search, Plus, MapPin, Phone, Mail, MoreHorizontal, 
  LayoutDashboard, Loader, ChevronRight, Eye, FileText, 
  ArrowRightLeft, Camera, CheckCircle, Clock, UserCheck 
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const COLUMNS = [
  { id: "NOVO", label: "Novos Leads", color: "bg-blue-500", border: "border-blue-500/20" },
  { id: "ANALISE", label: "Em Análise", color: "bg-amber-500", border: "border-amber-500/20" },
  { id: "PROPOSTA", label: "Proposta", color: "bg-purple-500", border: "border-purple-500/20" },
  { id: "NEGOCIACAO", label: "Negociação", color: "bg-indigo-500", border: "border-indigo-500/20" },
  { id: "GANHO", label: "Fechado", color: "bg-emerald-500", border: "border-emerald-500/20" },
  { id: "PERDIDO", label: "Perdido", color: "bg-red-500", border: "border-red-500/20" },
];

export default function CRMLeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const userObj = session?.user as any;
  const role = userObj?.role || "USER";
  const isManager = role === "ADMIN" || userObj?.canManageCRM;

  useEffect(() => {
    fetchLeads();
    fetchVendedores();
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

  const fetchVendedores = async () => {
    try {
      const res = await fetch("/api/users/vendedores");
      if (res.ok) {
        const data = await res.json();
        setVendedores(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar vendedores:", err);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    // Atualização otimista na interface para resposta instantânea
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
    
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        fetchLeads();
        alert("Erro ao atualizar o status do lead no servidor.");
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  const updateVendedor = async (leadId: string, newVendedorId: string) => {
    // Encontrar o vendedor selecionado localmente para atualizar a UI otimista
    const selectedSeller = vendedores.find(v => v.id === newVendedorId);
    
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, vendedorId: newVendedorId, vendedor: selectedSeller || null } 
        : lead
    ));

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendedorId: newVendedorId }),
      });
      if (!res.ok) {
        fetchLeads();
        alert("Erro ao direcionar o lead para o vendedor.");
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  const toggleAtendido = async (leadId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Atualização otimista
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, atendido: newVal } : lead
    ));

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atendido: newVal }),
      });
      if (!res.ok) {
        fetchLeads();
        alert("Erro ao atualizar status de atendimento do lead.");
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  // Filtragem dinâmica por nome, telefone, e-mail, tipo ou vendedor
  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    const vendedorNome = lead.vendedor?.name || "";
    return (
      lead.nome.toLowerCase().includes(query) ||
      lead.telefone.toLowerCase().includes(query) ||
      (lead.email && lead.email.toLowerCase().includes(query)) ||
      (lead.empresa && lead.empresa.toLowerCase().includes(query)) ||
      (lead.tipo && lead.tipo.toLowerCase().includes(query)) ||
      vendedorNome.toLowerCase().includes(query)
    );
  });

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "DESCONTO_CONTA": return { label: "Desconto na Conta", emoji: "🟢", color: "text-[#00BFA5] bg-[#00BFA5]/10" };
      case "USINA_SOLAR": return { label: "Usina Solar", emoji: "🔵", color: "text-[#1E3A8A] bg-[#1E3A8A]/10" };
      case "PONTO_RECARGA": return { label: "Recarga VE", emoji: "⚡", color: "text-amber-600 bg-amber-500/10" };
      default: return { label: tipo, emoji: "📋", color: "text-slate-600 bg-slate-100" };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-44 space-y-4">
        <Loader className="w-12 h-12 animate-spin text-[#1E3A8A]" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando CRM...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header section with brand and filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-[#1E3A8A] uppercase tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-[#00BFA5]" /> Gestão de Leads
          </h1>
          <p className="text-slate-500 font-medium mt-1">Funil de Vendas interativo com suporte a Direcionamento de Vendedores e Status de Atendimento.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/crm/lista"
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-xs font-black text-slate-600 hover:text-[#1E3A8A] transition-all"
          >
            <FileText className="w-4 h-4" /> LISTA GERAL
          </Link>
          <Link 
            href="/crm/dashboard"
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-xs font-black text-slate-600 hover:text-[#00BFA5] transition-all"
          >
            <LayoutDashboard className="w-4 h-4" /> ESTATÍSTICAS
          </Link>
          <div className="relative group ml-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1E3A8A] transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar lead, tipo ou vendedor..."
              className="pl-11 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#1E3A8A] focus:bg-white transition-all w-72 shadow-inner"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-6 overflow-x-auto pb-8 min-h-[75vh] select-none">
        {COLUMNS.map(col => {
          const colLeads = filteredLeads.filter(l => l.status === col.id);
          const isOver = draggedOverColumn === col.id;

          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-80 flex flex-col gap-4"
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDraggedOverColumn(col.id)}
              onDragLeave={() => setDraggedOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDraggedOverColumn(null);
                const leadId = e.dataTransfer.getData("text/plain");
                if (leadId) {
                  updateStatus(leadId, col.id);
                }
              }}
            >
              {/* Column Title Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                  {col.label}
                </span>
                <span className="bg-slate-50 px-2.5 py-0.5 rounded-lg text-[10px] font-black text-[#1E3A8A] border border-slate-100 shadow-inner">
                  {colLeads.length}
                </span>
              </div>

              {/* Column Cards Drop Area */}
              <div 
                className={`flex-1 space-y-4 p-2 rounded-3xl transition-all border-2 border-dashed ${
                  isOver 
                    ? "bg-[#1E3A8A]/5 border-[#1E3A8A]/30 scale-[0.99]" 
                     : "border-transparent bg-slate-50/50"
                }`}
              >
                {colLeads.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">
                    Sem registros
                  </div>
                ) : (
                  colLeads.map(lead => {
                    const { label, emoji, color } = getTipoLabel(lead.tipo);
                    const hasVendedor = !!lead.vendedor;
                    
                    return (
                      <div 
                        key={lead.id} 
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", lead.id);
                          e.currentTarget.style.opacity = "0.5";
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        className={`bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-xl hover:scale-[1.02] cursor-grab active:cursor-grabbing transition-all group relative border-l-4 ${col.border}`}
                      >
                        {/* Upper card options */}
                        <div className="flex items-start justify-between mb-4">
                          <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${color}`}>
                            {emoji} {label}
                          </span>
                          
                          {/* Funnel Column Quick Select (Universal Fallback) */}
                          <select 
                            value={lead.status}
                            onChange={(e) => updateStatus(lead.id, e.target.value)}
                            className="text-[9px] font-black bg-slate-50 border border-slate-200/60 rounded-lg py-1 px-1.5 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-slate-500 cursor-pointer shadow-inner hover:bg-slate-100 transition-colors"
                            title="Alterar etapa do funil"
                          >
                            {COLUMNS.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Name and Details */}
                        <h3 className="font-black text-slate-800 text-base leading-tight mb-2 group-hover:text-[#1E3A8A] transition-colors">
                          {lead.nome}
                          {lead.empresa && (
                            <span className="block text-[10px] text-slate-400 font-bold uppercase mt-1">
                              🏢 {lead.empresa}
                            </span>
                          )}
                        </h3>

                        {/* Status do Atendimento & Vendedor Badge */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {/* Botão de Status do Atendimento (Toggles atendido on click) */}
                          <button
                            type="button"
                            onClick={() => toggleAtendido(lead.id, !!lead.atendido)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border
                              ${lead.atendido 
                                ? "bg-green-50 text-green-700 border-green-200/60 hover:bg-green-100" 
                                : "bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100"
                              }`}
                            title="Clique para alternar o status de atendimento"
                          >
                            {lead.atendido ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span>Atendido</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Pendente</span>
                              </>
                            )}
                          </button>

                          {/* Seller assigned marker */}
                          {hasVendedor && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100" title="Vendedor Direcionado">
                              <UserCheck className="w-3 h-3 text-blue-500" />
                              <span className="max-w-[70px] truncate">{lead.vendedor.name || lead.vendedor.email}</span>
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-300" /> {lead.telefone}
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
                              <Mail className="w-3.5 h-3.5 text-slate-300" /> {lead.email}
                            </div>
                          )}
                          {lead.endereco && (
                            <div className="flex items-start gap-2 text-xs text-slate-500 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" /> 
                              <span className="line-clamp-2 leading-relaxed">{lead.endereco}</span>
                            </div>
                          )}
                        </div>

                        {/* Dropdown de Direcionar Vendedor (Disponível apenas para Gestores/ADMINs) */}
                        {isManager && (
                          <div className="mb-4 pt-3 border-t border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Direcionar Consultor</label>
                            <select
                              value={lead.vendedorId || ""}
                              onChange={(e) => updateVendedor(lead.id, e.target.value)}
                              className="text-[10px] font-bold bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-slate-650 cursor-pointer shadow-inner hover:bg-slate-100 transition-colors w-full"
                            >
                              <option value="">Selecionar Vendedor...</option>
                              {vendedores.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.name || v.email} ({v.role === "VENDEDOR" ? "Vendedor" : v.role})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Bottom Actions and Media Preview */}
                        <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                          {/* Media Avatars */}
                          <div className="flex -space-x-2">
                            {lead.midias && lead.midias.length > 0 ? (
                              lead.midias.slice(0, 3).map((m: any, i: number) => (
                                <div key={m.id || i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center">
                                  <img src={m.arquivoUrl} className="w-full h-full object-cover" alt="Midia" />
                                </div>
                              ))
                            ) : (
                              <div className="w-7 h-7 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300" title="Sem fotos">
                                <Camera className="w-3.5 h-3.5" />
                              </div>
                            )}
                            {lead.midias && lead.midias.length > 3 && (
                              <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500 shadow-sm">
                                +{lead.midias.length - 3}
                              </div>
                            )}
                          </div>
                          
                          {/* Details Button Link */}
                          <Link 
                            href={`/crm/${lead.id}`}
                            className="p-2.5 bg-[#1E3A8A] text-white hover:bg-[#00BFA5] rounded-xl shadow-md transition-all hover:scale-105"
                            title="Ver detalhes do lead"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
