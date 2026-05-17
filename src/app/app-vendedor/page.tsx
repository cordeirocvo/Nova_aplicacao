"use client";

import { useState, useEffect } from "react";
import { 
  Plus, MapPin, List, LogOut, Home, Phone, 
  Map, Calendar, ChevronDown, ChevronUp, Search, Camera, CheckCircle2 
} from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

interface LeadMidia {
  id: string;
  tipo: string;
  arquivoUrl: string;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  tipo: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  observacoes: string | null;
  endereco: string | null;
  createdAt: string;
  midias: LeadMidia[];
}

export default function AppVendedorPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"home" | "campo" | "leads">("home");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Busca os dados do vendedor em tempo real
  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch("/api/app-vendedor/leads");
        if (res.ok) {
          const data = await res.json();
          setLeads(data);
        }
      } catch (err) {
        console.error("Erro ao buscar leads:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  // Filtros de contadores
  const today = new Date().toDateString();
  const leadsHoje = leads.filter(lead => new Date(lead.createdAt).toDateString() === today).length;
  const leadsTotal = leads.length;

  // Filtragem de busca para abas Campo e Leads
  const filteredLeads = leads.filter(lead => 
    lead.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (lead.endereco && lead.endereco.toLowerCase().includes(searchQuery.toLowerCase())) ||
    lead.tipo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `https://wa.me/55${cleaned}`;
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "DESCONTO_CONTA": return { label: "Desconto na Conta", emoji: "🟢", color: "text-[#00BFA5] bg-[#00BFA5]/10" };
      case "USINA_SOLAR": return { label: "Usina Solar", emoji: "🔵", color: "text-[#1E3A8A] bg-[#1E3A8A]/10" };
      case "PONTO_RECARGA": return { label: "Recarga VE", emoji: "⚡", color: "text-amber-600 bg-amber-500/10" };
      default: return { label: tipo, emoji: "📋", color: "text-slate-600 bg-slate-100" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Brand Blue Header (Same style as Login Page) */}
      <div className="relative w-full bg-[#0A192F] py-8 px-6 shadow-2xl rounded-b-[2.5rem] overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00BFA5] via-transparent to-transparent"></div>
        <div className="relative flex justify-between items-center max-w-md mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center p-2">
              <img src="/logo-white.svg" alt="Cordeiro Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight uppercase tracking-wide">App Vendedor</h1>
              <p className="text-xs text-[#00BFA5] font-black uppercase tracking-widest">
                {session?.user?.name || "Cordeiro Energia"}
              </p>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-red-400 rounded-2xl transition-all shadow-md"
            title="Sair do aplicativo"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto w-full px-4 mt-6 flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* View 1: Home Dashboard */}
            {activeTab === "home" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-300">
                {/* Large Premium CTA Button */}
                <div className="flex justify-center mt-4">
                  <Link 
                    href="/app-vendedor/novo"
                    className="w-full aspect-[4/3] bg-gradient-to-br from-[#1E3A8A] to-[#0A192F] rounded-[2.5rem] shadow-xl hover:shadow-2xl flex flex-col items-center justify-center text-white hover:scale-[1.02] transition-all border border-white/5 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#00BFA5] via-transparent to-transparent"></div>
                    <div className="bg-white/10 p-5 rounded-full mb-4 border border-white/10 group-hover:scale-110 transition-transform shadow-inner">
                      <Plus className="w-10 h-10 text-[#00BFA5]" />
                    </div>
                    <span className="text-lg font-black tracking-wider uppercase">Nova Abordagem</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">Registrar visita em campo</span>
                  </Link>
                </div>

                {/* Grid metrics cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center transition-all hover:shadow-md">
                    <span className="text-3xl font-black text-[#00BFA5]">{leadsHoje}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Hoje</span>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center transition-all hover:shadow-md">
                    <span className="text-3xl font-black text-[#1E3A8A]">{leadsTotal}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total</span>
                  </div>
                </div>

                {/* Quick Guide Card */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-5 rounded-[2rem] flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-600 font-black text-xl">💡</div>
                  <div>
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">Dica do Dia</h4>
                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                      Colete as coordenadas GPS no início da abordagem para habilitar rotas automáticas para sua equipe de instalação.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Campo Logistics */}
            {activeTab === "campo" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
                <div className="space-y-2">
                  <h2 className="text-lg font-black text-[#1E3A8A] uppercase tracking-tight">Abordagens de Campo</h2>
                  <p className="text-xs text-slate-500 font-medium">Logística e localização geográfica de seus clientes cadastrados.</p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por cliente, bairro, tipo..." 
                    className="w-full bg-white border border-slate-200 rounded-[2rem] py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#1E3A8A] transition-all outline-none shadow-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Campo Leads list */}
                {filteredLeads.length === 0 ? (
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center text-slate-400 font-bold text-sm">
                    Nenhum ponto de abordagem localizado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLeads.map((lead) => {
                      const hasGps = lead.latitude && lead.longitude;
                      const { label, emoji, color } = getTipoLabel(lead.tipo);
                      return (
                        <div key={lead.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between gap-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">CLIENTE</span>
                              <h3 className="font-black text-slate-800 leading-tight tracking-tight">{lead.nome}</h3>
                              <p className="text-xs text-slate-400 font-medium mt-1">{lead.endereco || "Endereço não informado"}</p>
                            </div>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${color}`}>
                              {emoji} {label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin className={`w-4 h-4 ${hasGps ? "text-[#00BFA5]" : ""}`} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                {hasGps ? "GPS Capturado" : "Sem GPS"}
                              </span>
                            </div>
                            {hasGps && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#1E3A8A]/10 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                              >
                                <Map className="w-3.5 h-3.5" />
                                Rota GPS
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View 3: Meus Leads List */}
            {activeTab === "leads" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
                <div className="space-y-2">
                  <h2 className="text-lg font-black text-[#1E3A8A] uppercase tracking-tight">Meus Leads</h2>
                  <p className="text-xs text-slate-500 font-medium">Acompanhe, filtre e visualize os dados coletados das suas abordagens.</p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por nome ou detalhes..." 
                    className="w-full bg-white border border-slate-200 rounded-[2rem] py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#1E3A8A] transition-all outline-none shadow-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Leads list */}
                {filteredLeads.length === 0 ? (
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center text-slate-400 font-bold text-sm">
                    Nenhum lead encontrado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLeads.map((lead) => {
                      const isExpanded = expandedLead === lead.id;
                      const { label, emoji, color } = getTipoLabel(lead.tipo);
                      return (
                        <div 
                          key={lead.id} 
                          className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all"
                        >
                          {/* Header card (always visible) */}
                          <div 
                            onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="space-y-1">
                              <h3 className="font-black text-slate-800 leading-tight tracking-tight">{lead.nome}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${color}`}>
                                  {emoji} {label}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black px-2.5 py-1 bg-teal-50 text-teal-600 rounded-full border border-teal-100 uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {lead.status}
                              </span>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </div>
                          </div>

                          {/* Expanded content (accordion details) */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 p-5 bg-slate-50/30 space-y-6 animate-in slide-in-from-top duration-300">
                              {/* Contact & Address */}
                              <div className="grid grid-cols-1 gap-4 bg-white p-4 rounded-2xl border border-slate-100">
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">TELEFONE</span>
                                  <span className="text-xs font-bold text-slate-700">{lead.telefone}</span>
                                </div>
                                {lead.email && (
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">E-MAIL</span>
                                    <span className="text-xs font-bold text-slate-700">{lead.email}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">ENDEREÇO</span>
                                  <span className="text-xs font-medium text-slate-600">{lead.endereco || "Não preenchido"}</span>
                                </div>
                              </div>

                              {/* Observations */}
                              {lead.observacoes && (
                                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">OBSERVAÇÕES DA VISITA</span>
                                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{lead.observacoes}</p>
                                </div>
                              )}

                              {/* Media Photos Gallery */}
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">FOTOS ANEXADAS</span>
                                {lead.midias.length === 0 ? (
                                  <div className="bg-white p-4 rounded-2xl border border-slate-100 border-dashed text-center text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-1">
                                    <Camera className="w-5 h-5 text-slate-300" />
                                    Nenhuma foto anexada a este lead.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-4 gap-2">
                                    {lead.midias.map((midia) => (
                                      <a 
                                        key={midia.id} 
                                        href={midia.arquivoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="aspect-square rounded-xl overflow-hidden border border-slate-100 bg-white shadow-inner flex items-center justify-center group relative cursor-pointer"
                                      >
                                        <img src={midia.arquivoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                          {midia.tipo}
                                        </span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Action Quick WhatsApp Buttons */}
                              <div className="flex gap-2">
                                <a 
                                  href={formatPhone(lead.telefone)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 bg-[#25D366] hover:bg-[#20ba59] text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-center shadow-lg transition-colors flex items-center justify-center gap-2"
                                >
                                  <Phone className="w-4 h-4 fill-white" />
                                  Chamar no WhatsApp
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Plus CTA on Leads/Campo views for quick action */}
      {activeTab !== "home" && !loading && (
        <Link 
          href="/app-vendedor/novo"
          className="fixed bottom-24 right-6 bg-[#1E3A8A] text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform border border-white/10 z-30"
          title="Nova abordagem"
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}

      {/* Premium Footer Nav Bar */}
      <div className="fixed bottom-6 left-6 right-6 h-20 bg-[#0A192F] rounded-[2rem] shadow-2xl border border-white/5 flex items-center justify-around px-8 z-40">
        <button 
          onClick={() => setActiveTab("campo")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "campo" ? "text-[#00BFA5] scale-110 font-black" : "text-white/40 hover:text-white"}`}
        >
          <MapPin className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Campo</span>
        </button>
        
        <div className="w-px h-8 bg-white/10"></div>
        
        <button 
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "home" ? "text-[#00BFA5] scale-110 font-black" : "text-white/40 hover:text-white"}`}
        >
          <Home className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Início</span>
        </button>
        
        <div className="w-px h-8 bg-white/10"></div>
        
        <button 
          onClick={() => setActiveTab("leads")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "leads" ? "text-[#00BFA5] scale-110 font-black" : "text-white/40 hover:text-white"}`}
        >
          <List className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Meus Leads</span>
        </button>
      </div>
    </div>
  );
}
