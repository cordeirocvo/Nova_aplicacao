"use client";

import { useState, useEffect } from "react";
import { 
  Search, ChevronLeft, MapPin, Phone, MessageSquare, Download, 
  FileText, Filter, Calendar, Loader, CheckCircle, Clock, UserCheck 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "next-auth/react";

export default function ListaLeadsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [leads, setLeads] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

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

  const updateVendedor = async (leadId: string, newVendedorId: string) => {
    const selectedSeller = vendedores.find(v => v.id === newVendedorId);
    
    // UI otimista
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
        alert("Erro ao direcionar o lead.");
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  const toggleAtendido = async (leadId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // UI otimista
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
        alert("Erro ao atualizar atendimento.");
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  console.log("CRM Lista - Total leads:", leads.length, "Filter query:", filter);

  const filteredLeads = leads.filter(l => {
    try {
      const query = (filter || "").toLowerCase();
      const nome = (l.nome || "").toLowerCase();
      const endereco = (l.endereco || "").toLowerCase();
      const telefone = (l.telefone || "").toLowerCase();
      const vendedorNome = (l.vendedor?.name || l.vendedor?.email || "").toLowerCase();
      
      return (
        nome.includes(query) ||
        endereco.includes(query) ||
        telefone.includes(query) ||
        vendedorNome.includes(query)
      );
    } catch (err) {
      console.error("Erro ao filtrar lead:", l, err);
      return false;
    }
  });

  console.log("CRM Lista - Filtered leads:", filteredLeads.length);

  const getTipoLabel = (tipo: string) => {
    const map: any = {
      "DESCONTO_CONTA": "Desconto na Conta",
      "USINA_SOLAR": "Usina Solar",
      "PONTO_RECARGA": "Ponto de Recarga VE"
    };
    return map[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const map: any = {
      "DESCONTO_CONTA": "bg-emerald-50 text-emerald-600 border-emerald-100",
      "USINA_SOLAR": "bg-blue-50 text-blue-600 border-blue-100",
      "PONTO_RECARGA": "bg-amber-50 text-amber-600 border-amber-100"
    };
    return map[tipo] || "bg-slate-50 text-slate-600 border-slate-100";
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader className="w-10 h-10 animate-spin text-[#1E3A8A]" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/crm")}
            className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-[#1E3A8A] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tight">Lista Consolidada de Leads</h1>
            <p className="text-sm text-slate-500 font-medium">Visualização completa de todas as abordagens de campo.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar lead ou vendedor..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1E3A8A] transition-all outline-none shadow-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:bg-slate-50 shadow-sm transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table/List */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Contato</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Modalidade</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendimento</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedor Responsável</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço / Obs</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">
                        {format(new Date(lead.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {format(new Date(lead.createdAt), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[#1E3A8A] leading-tight">
                        {lead.nome}
                        {lead.empresa && (
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            🏢 {lead.empresa}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Phone className="w-3 h-3 text-slate-300" />
                        <span className="text-xs text-slate-500 font-medium">{lead.telefone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider ${getTipoColor(lead.tipo)}`}>
                      {getTipoLabel(lead.tipo)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {/* Quick Attended Status Click Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleAtendido(lead.id, !!lead.atendido)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all
                        ${lead.atendido 
                          ? "bg-green-50 text-green-700 border-green-200/60 hover:bg-green-100" 
                          : "bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100"
                        }`}
                      title="Clique para alternar o status de atendimento"
                    >
                      {lead.atendido ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          <span>Atendido</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pendente</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-5">
                    {isManager ? (
                      <select
                        value={lead.vendedorId || ""}
                        onChange={(e) => updateVendedor(lead.id, e.target.value)}
                        className="text-xs font-bold bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-slate-650 cursor-pointer shadow-inner hover:bg-slate-100 transition-colors w-48"
                      >
                        <option value="">Selecionar Vendedor...</option>
                        {vendedores.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name || v.email} ({v.role === "VENDEDOR" ? "Vendedor" : v.role})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-100">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        {lead.vendedor?.name || lead.vendedor?.email || "Não direcionado"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 max-w-xs">
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
                        <span className="text-xs text-slate-600 font-medium line-clamp-1">{lead.endereco || "Não informado"}</span>
                      </div>
                      {lead.observacoes && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
                          <span className="text-[11px] text-slate-400 italic line-clamp-1">{lead.observacoes}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        title="Ver Detalhes"
                        onClick={() => router.push(`/crm/${lead.id}`)}
                        className="p-2 text-slate-400 hover:text-[#1E3A8A] hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <Link 
                        href={`/crm/${lead.id}/relatorio`}
                        title="Gerar PDF da Abordagem"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Download className="w-5 h-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLeads.length === 0 && !loading && (
          <div className="p-20 text-center">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum lead encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
