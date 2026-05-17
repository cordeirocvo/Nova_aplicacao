"use client";

import { useState } from "react";
import { ChevronLeft, Camera, MapPin, Send, Loader, CheckCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

export default function NovoLeadPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    tipo: "", // "DESCONTO_CONTA" | "USINA_SOLAR" | "PONTO_RECARGA"
    endereco: "",
    observacoes: "",
    midias: {} as Record<string, string[]>
  });

  const [uploading, setUploading] = useState<string | null>(null);

  const captureGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => {
        alert("Erro ao capturar GPS. Verifique as permissões.");
      });
    } else {
      alert("GPS não disponível no seu aparelho.");
    }
  };

  const handleFileUpload = async (tipo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentPhotos = form.midias[tipo] || [];
    if (currentPhotos.length >= 4) {
      alert("Limite de 4 fotos por campo atingido.");
      return;
    }

    setUploading(tipo);

    try {
      const file = files[0];
      
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.url) {
        setForm(prev => ({
          ...prev,
          midias: {
            ...prev.midias,
            [tipo]: [...(prev.midias[tipo] || []), data.url]
          }
        }));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar/enviar a foto.");
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = (tipo: string, url: string) => {
    setForm(prev => ({
      ...prev,
      midias: {
        ...prev.midias,
        [tipo]: (prev.midias[tipo] || []).filter(u => u !== url)
      }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const flattenedMidias: any[] = [];
      Object.entries(form.midias).forEach(([tipo, urls]) => {
        urls.forEach(url => flattenedMidias.push({ url, tipo }));
      });

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: coords?.lat,
          longitude: coords?.lng,
          midias: flattenedMidias
        }),
      });
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/app-vendedor"), 2000);
      } else {
        const errorData = await res.json();
        alert(`Erro ao enviar lead: ${errorData.error || "Tente novamente"}${errorData.details ? "\n\nDetalhes: " + errorData.details : ""}`);
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 animate-in zoom-in duration-500">
        <div className="bg-[#00BFA5]/10 p-6 rounded-full mb-6">
          <CheckCircle className="w-20 h-20 text-[#00BFA5]" />
        </div>
        <h2 className="text-2xl font-black text-[#1E3A8A] text-center uppercase">Lead Enviado!</h2>
        <p className="text-slate-500 text-center mt-2 font-medium">O relatório já está disponível no CRM.</p>
      </div>
    );
  }

  const getPhotosForStep = () => {
    if (form.tipo === "DESCONTO_CONTA") return ["CONTA", "CNH"];
    if (form.tipo === "USINA_SOLAR") return ["TELHADO", "CONTA", "PADRAO", "MEDIDOR"];
    if (form.tipo === "PONTO_RECARGA") return ["LOCAL", "DRONE", "PADRAO"];
    return [];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 pb-12 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => step === 1 ? router.back() : setStep(1)}
          className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-[#1E3A8A] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black text-[#1E3A8A] uppercase tracking-tight">Nova Abordagem</h1>
      </div>

      <div className="max-w-md mx-auto w-full space-y-6">
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-2">Qual o objetivo da visita?</label>
              <div className="grid grid-cols-1 gap-4">
                <OptionButton 
                  emoji="🟢" 
                  title="Desconto na Conta" 
                  sub="Venda de Assinatura" 
                  color="border-[#00BFA5]" 
                  onClick={() => { setForm({...form, tipo: "DESCONTO_CONTA"}); setStep(2); }} 
                />
                <OptionButton 
                  emoji="🔵" 
                  title="Venda de Usina Solar" 
                  sub="Instalação Fotovoltaica" 
                  color="border-[#1E3A8A]" 
                  onClick={() => { setForm({...form, tipo: "USINA_SOLAR"}); setStep(2); }} 
                />
                <OptionButton 
                  emoji="⚡" 
                  title="Ponto de Recarga VE" 
                  sub="Infraestrutura Elétrica" 
                  color="border-amber-500" 
                  onClick={() => { setForm({...form, tipo: "PONTO_RECARGA"}); setStep(2); }} 
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Localização GPS</span>
                  <span className={`text-sm font-bold ${coords ? "text-[#00BFA5]" : "text-slate-400"}`}>
                    {coords ? "✓ Coordenadas capturadas" : "Pendente"}
                  </span>
                </div>
                <button 
                  onClick={captureGPS}
                  className={`p-4 rounded-2xl transition-all shadow-lg ${coords ? "bg-[#00BFA5] text-white rotate-0" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                >
                  <MapPin className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Endereço Completo</label>
                <input 
                  type="text" 
                  placeholder="Rua, Número, Bairro, Cidade..." 
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#1E3A8A] transition-all"
                  value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Dados do Cliente</span>
              <input 
                type="text" 
                placeholder="Nome do Proprietário / Responsável" 
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#1E3A8A] transition-all"
                value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
              />
              <input 
                type="tel" 
                placeholder="WhatsApp (com DDD)" 
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#1E3A8A] transition-all"
                value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})}
              />
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between ml-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fotos da Visita</span>
                <span className="text-[9px] font-bold text-slate-300">MÁX 4 POR CAMPO</span>
              </div>
              
              <div className="space-y-6">
                {getPhotosForStep().map((tipo) => (
                  <div key={tipo} className="space-y-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">{tipo}</span>
                    <div className="grid grid-cols-4 gap-2">
                      {(form.midias[tipo] || []).map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100">
                          <img src={url} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removePhoto(tipo, url)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                      {(form.midias[tipo] || []).length < 4 && (
                        <label className={`aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors ${uploading === tipo ? "opacity-50" : ""}`}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                            disabled={uploading === tipo}
                            onChange={(e) => handleFileUpload(tipo, e)} 
                          />
                          {uploading === tipo ? <Loader className="w-4 h-4 animate-spin text-[#1E3A8A]" /> : <Camera className="w-5 h-5 text-slate-300" />}
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <textarea 
              placeholder="Observações importantes sobre o local ou negociação..." 
              rows={4}
              className="w-full bg-white border border-slate-100 rounded-[2.5rem] p-6 text-sm font-medium focus:ring-2 focus:ring-[#1E3A8A] transition-all shadow-sm outline-none"
              value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
            />

            <button 
              onClick={handleSubmit}
              disabled={loading || !form.nome || !coords || !form.endereco}
              className="w-full bg-[#1E3A8A] text-white p-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-[#162a63] transition-all"
            >
              {loading ? <Loader className="animate-spin" /> : <Send className="w-5 h-5" />}
              Enviar para Análise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionButton({ emoji, title, sub, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`bg-white border-2 border-transparent hover:${color} p-6 rounded-[2.5rem] shadow-sm flex items-center gap-4 transition-all text-left group`}
    >
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
        {emoji}
      </div>
      <div>
        <span className="block font-black text-slate-800 tracking-tight leading-tight">{title}</span>
        <span className="text-xs text-slate-500 font-medium italic">{sub}</span>
      </div>
    </button>
  );
}
