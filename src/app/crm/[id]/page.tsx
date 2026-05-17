"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Phone, Mail, Calendar, User, FileText, Loader, ExternalLink, Maximize, ArrowRight, Download } from "lucide-react";
import Link from "next/link";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchLead();
  }, [params.id]);

  const fetchLead = async () => {
    try {
      const res = await fetch("/api/leads"); // Simplificado para MVP
      const data = await res.json();
      const currentLead = data.find((l: any) => l.id === params.id);
      setLead(currentLead);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchLead();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader className="w-10 h-10 animate-spin text-[#1E3A8A]" /></div>;
  if (!lead) return <div className="p-20 text-center font-bold text-slate-400">Lead não encontrado</div>;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-[#1E3A8A] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-[#1E3A8A] uppercase tracking-tight">{lead.nome}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                lead.tipo === "USINA_SOLAR" ? "bg-blue-100 text-blue-700" : 
                lead.tipo === "PONTO_RECARGA" ? "bg-amber-100 text-amber-700" : 
                "bg-emerald-100 text-emerald-700"
              }`}>
                {lead.tipo === "USINA_SOLAR" ? "Usina Solar" : 
                 lead.tipo === "PONTO_RECARGA" ? "Ponto de Recarga VE" : 
                 "Desconto"}
              </span>
            </div>
            <p className="text-slate-500 font-medium mt-1">Lead de Campo #{lead.id.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href={`/crm/${lead.id}/relatorio`}
            className="flex items-center gap-2 px-6 py-3 bg-[#1E3A8A] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:scale-105 transition-all"
          >
            <Download className="w-4 h-4" /> Relatório de Abordagem
          </Link>
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-[2rem]">
            {["NOVO", "ANALISE", "PROPOSTA", "NEGOCIACAO", "GANHO"].map(s => (
              <button 
                key={s}
                onClick={() => updateStatus(s)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${lead.status === s ? "bg-[#1E3A8A] text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Col */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">Informações do Cliente</h3>
            
            <div className="space-y-6">
              <InfoItem icon={<Phone className="w-5 h-5" />} label="WhatsApp" value={lead.telefone} />
              <InfoItem icon={<Mail className="w-5 h-5" />} label="E-mail" value={lead.email || "Não informado"} />
              <InfoItem icon={<MapPin className="w-5 h-5" />} label="Endereço" value={lead.endereco || "Não informado"} />
              <InfoItem icon={<Calendar className="w-5 h-5" />} label="Data da Abordagem" value={new Date(lead.createdAt).toLocaleDateString("pt-BR")} />
            </div>

            {lead.latitude && (
              <div className="pt-4 border-t border-slate-50">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`}
                  target="_blank"
                  className="w-full bg-[#00BFA5] text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-[#00BFA5]/20 hover:scale-[1.02] transition-transform"
                >
                  <MapPin className="w-5 h-5" />
                  Ver no Google Maps
                </a>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <FileText className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Observações do Vendedor</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-300 italic font-medium">
              "{lead.observacoes || "Nenhuma observação registrada pelo vendedor de campo."}"
            </p>
          </div>
        </div>

        {/* Media Col */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-50 pb-4">Documentação Fotográfica</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {lead.midias?.map((midia: any) => (
              <div 
                key={midia.id} 
                className="group relative aspect-square rounded-[2rem] overflow-hidden bg-slate-50 border border-slate-100 cursor-zoom-in"
                onClick={() => setSelectedImage(midia.arquivoUrl)}
              >
                <img src={midia.arquivoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedImage(midia.arquivoUrl); }}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-xl transition-all"
                    >
                      <Maximize className="text-white w-5 h-5" />
                    </button>
                    <a 
                      href={midia.arquivoUrl} 
                      download 
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-[#00BFA5] hover:bg-[#00BFA5]/80 rounded-xl transition-all"
                    >
                      <Download className="text-white w-5 h-5" />
                    </a>
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{midia.tipo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Zoom */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 md:p-20"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} className="max-w-full max-h-full object-contain animate-in zoom-in duration-300" />
          <button className="absolute top-10 right-10 text-white font-black uppercase tracking-widest text-xs bg-white/10 px-6 py-3 rounded-2xl hover:bg-white/20 transition-colors">Fechar</button>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">{label}</span>
        <span className="text-base font-bold text-slate-800">{value}</span>
      </div>
    </div>
  );
}
