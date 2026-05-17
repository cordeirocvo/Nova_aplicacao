"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle, MapPin, Phone, MessageSquare, 
  ChevronLeft, Download, Loader, Zap, Sun, Car, Info
} from "lucide-react";

export default function LeadReportPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads`)
      .then(res => res.json())
      .then(data => {
        const current = data.find((l: any) => l.id === params.id);
        setLead(current);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader className="w-16 h-16 animate-spin text-[#1E3A8A]" />
      <p className="mt-6 font-black text-slate-400 uppercase tracking-widest text-sm">Gerando Relatório de Abordagem...</p>
    </div>
  );

  if (!lead) return <div className="p-20 text-center">Lead não encontrado.</div>;

  const handlePrint = () => {
    window.print();
  };

  const getIcon = () => {
    if (lead.tipo === "USINA_SOLAR") return <Sun className="w-8 h-8 text-blue-600" />;
    if (lead.tipo === "PONTO_RECARGA") return <Car className="w-8 h-8 text-amber-500" />;
    return <Zap className="w-8 h-8 text-emerald-500" />;
  };

  return (
    <div className="bg-slate-100 min-h-screen py-12 px-4 print:p-0 print:bg-white">
      <div className="max-w-[800px] mx-auto bg-white shadow-2xl rounded-[3rem] overflow-hidden print:shadow-none print:rounded-none">
        {/* Header Report */}
        <div className="bg-[#1E3A8A] p-12 text-white relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white p-3 rounded-2xl">
                  {getIcon()}
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight">Relatório de Abordagem</h1>
              </div>
              <p className="text-blue-200 font-bold uppercase tracking-widest text-xs">Cordeiro Energia | Comercial & CRM</p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-black uppercase opacity-60">Data de Emissão</span>
              <span className="text-lg font-bold">{format(new Date(), "dd/MM/yyyy")}</span>
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
            <div>
              <span className="block text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">Identificação do Lead</span>
              <h2 className="text-2xl font-black">{lead.nome}</h2>
              <div className="flex items-center gap-2 mt-2 text-blue-200">
                <Phone className="w-4 h-4" />
                <span className="font-bold">{lead.telefone}</span>
              </div>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">Localização da Visita</span>
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-[#00BFA5] shrink-0 mt-1" />
                <p className="font-medium text-sm leading-relaxed">{lead.endereco || "Localização capturada via GPS"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-12 space-y-12">
          {/* Status & Type */}
          <div className="grid grid-cols-3 gap-6">
            <SummaryItem label="Modalidade" value={lead.tipo.replace("_", " ")} />
            <SummaryItem label="Status Atual" value={lead.status} />
            <SummaryItem label="Vendedor" value={lead.vendedor?.name || "Campo"} />
          </div>

          {/* Observations */}
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-[#1E3A8A]">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-black uppercase tracking-widest text-xs">Observações e Perfil do Cliente</h3>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed italic">
              "{lead.observacoes || "Nenhuma observação detalhada foi registrada para esta abordagem."}"
            </p>
          </div>

          {/* Photos */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <CheckCircle className="w-5 h-5 text-[#00BFA5]" />
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-800">Documentação Fotográfica em Campo</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {lead.midias?.map((m: any) => (
                <div key={m.id} className="space-y-2">
                  <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200">
                    <img src={m.arquivoUrl} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">{m.tipo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer PDF */}
          <div className="pt-12 border-t border-slate-100 flex justify-between items-center text-slate-400">
            <div className="text-[10px] font-bold uppercase tracking-widest">
              Gerado via Cordeiro Energia OS
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest">
              {params.id}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex gap-4 print:hidden">
        <button 
          onClick={() => router.back()}
          className="bg-white text-slate-600 p-4 rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center gap-2 font-bold"
        >
          <ChevronLeft className="w-5 h-5" /> Voltar
        </button>
        <button 
          onClick={handlePrint}
          className="bg-[#1E3A8A] text-white p-4 rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 font-black uppercase tracking-widest text-sm"
        >
          <Download className="w-5 h-5" /> Imprimir / PDF
        </button>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-black text-[#1E3A8A] uppercase tracking-tight">{value}</span>
    </div>
  );
}
