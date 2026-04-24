"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, UploadCloud, Camera, CheckCircle2 } from "lucide-react";

export default function NovaAtividadePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);

  // FormData state
  const [form, setForm] = useState({
    instalacao: "",
    solicitacao: "",
    observacao: "",
    status: "Pendente",
    vendedor: "",
    telefoneCliente: "",
    telefoneVendedor: "",
    cidade: "",
    dataPrevista: "",
  });

  const handleUpload = async (files: File[], bucket: string) => {
    const urls: string[] = [];
    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (data) {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        urls.push(publicData.publicUrl);
      }
      if (error) console.error("Upload error", error);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Upload files to Supabase (assuming buckets exist, or mock if they don't)
      // We wrap in try to not break saving if bucket isn't setup.
      let fotosUrls: string[] = [];
      let arquivosUrls: string[] = [];
      
      try {
         if (fotos.length) fotosUrls = await handleUpload(fotos, "fotos");
         if (arquivos.length) arquivosUrls = await handleUpload(arquivos, "arquivos");
      } catch(ex) {
         console.warn("Storage não configurado, pulando uploads.");
      }

      // 2. Setup payload
      const payload = { ...form, anexoFotos: fotosUrls, anexoArquivos: arquivosUrls };

      // 3. Save to Prisma via API endpoint
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/atividades"), 2000);
      } else {
        alert("Erro ao salvar atividade.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro sistêmico ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Atividade Registrada!</h2>
        <p className="text-slate-500 mt-2">Redirecionando para as atividades...</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent transition-all shadow-sm";
  const labelClass = "text-sm font-semibold text-slate-700 mb-1 block";

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Nova Atividade</h1>
        <p className="text-slate-500">Preencha os campos para inserir um novo registro na base local.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div>
            <label className={labelClass}>Nome do Cliente (Instalação)</label>
            <input required type="text" className={inputClass} placeholder="Ex: Cordeiro João" value={form.instalacao} onChange={e => setForm({...form, instalacao: e.target.value})} />
          </div>

          <div>
            <label className={labelClass}>Telefone Cliente</label>
            <input type="text" className={inputClass} placeholder="(XX) XXXXX-XXXX" value={form.telefoneCliente} onChange={e => setForm({...form, telefoneCliente: e.target.value})} />
          </div>

          <div>
            <label className={labelClass}>Cidade</label>
            <input type="text" className={inputClass} placeholder="Nome da cidade" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} />
          </div>

          <div>
            <label className={labelClass}>Vendedor</label>
            <input type="text" className={inputClass} placeholder="Nome do Vendedor" value={form.vendedor} onChange={e => setForm({...form, vendedor: e.target.value})} />
          </div>

          <div>
            <label className={labelClass}>WhatsApp Vendedor (p/ Alarme)</label>
            <input type="text" className={inputClass} placeholder="+55 (XX) XXXXX-XXXX" value={form.telefoneVendedor} onChange={e => setForm({...form, telefoneVendedor: e.target.value})} />
          </div>

          <div>
             <label className={labelClass}>Data Prevista</label>
             <input type="date" className={inputClass} value={form.dataPrevista} onChange={e => setForm({...form, dataPrevista: e.target.value})} />
          </div>
          
          <div>
             <label className={labelClass}>Status</label>
             <select className={inputClass} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
               <option>Pendente</option>
               <option>Em Andamento</option>
               <option>Concluído</option>
             </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Solicitação</label>
          <input required type="text" className={inputClass} placeholder="Título da solicitação..." value={form.solicitacao} onChange={e => setForm({...form, solicitacao: e.target.value})} />
        </div>

        <div>
          <label className={labelClass}>Observação</label>
          <textarea rows={4} className={inputClass} placeholder="Detalhes técnicos ou da obra..." value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})}></textarea>
        </div>

        {/* Upload Arrays */}
        <div className="border-t border-slate-100 mt-8 pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Anexo Fotos (Galeria/Câmera)</label>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-3 bg-[#EAFBF8] text-[#00BFA5] rounded-xl cursor-pointer hover:bg-[#D4F7F1] transition-colors border border-[#00BFA5]/20 font-medium">
                <Camera className="w-5 h-5" />
                <span>Escolher Fotos</span>
                <input type="file" required={false} multiple accept="image/*" className="hidden" onChange={(e) => setFotos(Array.from(e.target.files || []))} />
              </label>
              <span className="text-sm text-slate-500">{fotos.length} selecionadas</span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Anexo Arquivos (Documentos)</label>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors border border-slate-200 font-medium">
                <UploadCloud className="w-5 h-5" />
                <span>Escolher Arquivos</span>
                <input type="file" required={false} multiple accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setArquivos(Array.from(e.target.files || []))} />
              </label>
              <span className="text-sm text-slate-500">{arquivos.length} selecionados</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#015299] hover:from-[#1e3470] hover:to-[#01417a] text-white font-medium rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {loading ? "Salvando..." : "Registrar Atividade"}
          </button>
        </div>
      </form>
    </div>
  );
}
