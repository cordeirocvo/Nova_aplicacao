"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, UploadCloud, Camera, CheckCircle2, ArrowLeft } from "lucide-react";

export default function EditForm({ initialData, statuses }: { initialData: any, statuses: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);

  // Maps DB fields to form state
  const [form, setForm] = useState({
    instalacao: initialData.instalacao || "",
    solicitacao: initialData.solicitacao || "",
    obsInstalacao: initialData.obsInstalacao || "",
    status: initialData.status || "Pendente",
    vendedor: initialData.vendedor || initialData.vendedorSheet || "",
    telefoneCliente: initialData.telefoneCliente || initialData.telefoneSheet || "",
    telefoneVendedor: initialData.telefoneVendedor || "",
    cidade: initialData.cidade || initialData.cidadeSheet || "",
    diaPrev: initialData.diaPrev || "",
    automaticoPrevInstala: initialData.automaticoPrevInstala || "",
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
      let fotosUrls: string[] = initialData.anexoFotos || [];
      let arquivosUrls: string[] = initialData.anexoArquivos || [];
      
      try {
         if (fotos.length) {
            const uploadedFotos = await handleUpload(fotos, "fotos");
            fotosUrls = [...fotosUrls, ...uploadedFotos];
         }
         if (arquivos.length) {
            const uploadedArquivos = await handleUpload(arquivos, "arquivos");
            arquivosUrls = [...arquivosUrls, ...uploadedArquivos];
         }
      } catch(ex) {
         console.warn("Storage não configurado, pulando uploads adicionais.");
      }

      const payload = { ...form, anexoFotos: fotosUrls, anexoArquivos: arquivosUrls };

      const res = await fetch(`/api/activities/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/atividades"), 2000);
      } else {
        alert("Erro ao editar atividade.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro sistêmico ao editar.");
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
        <h2 className="text-2xl font-bold text-slate-800">Atividade Atualizada!</h2>
        <p className="text-slate-500 mt-2">Retornando para as atividades...</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent transition-all shadow-sm";
  const labelClass = "text-sm font-semibold text-slate-700 mb-1 block";

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Editar Atividade</h1>
          <p className="text-slate-500">Altere o status ou adicione fotos e arquivos para esta instalação.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div>
             <label className={labelClass}>Status da Instalação (*)</label>
             <select className={inputClass} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
               <option value="Pendente">Pendente (Padrão)</option>
               {statuses.map(st => (
                 <option key={st.id} value={st.name}>{st.name}</option>
               ))}
             </select>
          </div>
          
          <div>
            <label className={labelClass}>Nome do Cliente (Instalação)</label>
            <input required type="text" className={inputClass} value={form.instalacao} onChange={e => setForm({...form, instalacao: e.target.value})} />
          </div>

          <div>
            <label className={labelClass}>Telefone Cliente</label>
            <input type="text" className={inputClass} value={form.telefoneCliente} onChange={e => setForm({...form, telefoneCliente: e.target.value})} />
          </div>

          <div>
            <label className={labelClass}>Cidade</label>
            <input type="text" className={inputClass} value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} />
          </div>

          <div>
            <label className={labelClass}>Vendedor</label>
            <input type="text" className={inputClass} value={form.vendedor} onChange={e => setForm({...form, vendedor: e.target.value})} />
          </div>

          <div>
             <label className={labelClass}>WhatsApp Vendedor (p/ Alarme)</label>
             <input type="text" className={inputClass} value={form.telefoneVendedor} onChange={e => setForm({...form, telefoneVendedor: e.target.value})} placeholder="+55 (XX) XXXXX-XXXX" />
          </div>

          <div>
             <label className={labelClass}>Dia Prev</label>
             <input type="text" className={inputClass} value={form.diaPrev} onChange={e => setForm({...form, diaPrev: e.target.value})} placeholder="Ex: DD/MM" />
          </div>

          <div>
             <label className={labelClass}>Prev. Instala</label>
             <input type="date" className={inputClass} value={form.automaticoPrevInstala} onChange={e => setForm({...form, automaticoPrevInstala: e.target.value})} />
          </div>
        </div>

        <div>
           <label className={labelClass}>Obs Instalação / Detalhes</label>
           <textarea rows={4} className={inputClass} placeholder="Detalhes técnicos da obra que refletem na planilha..." value={form.obsInstalacao} onChange={e => setForm({...form, obsInstalacao: e.target.value})}></textarea>
        </div>

        {/* Upload Arrays */}
        <div className="border-t border-slate-100 mt-8 pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Adicionar Fotos (Galeria/Câmera)</label>
            <div className="mt-2 flex items-center gap-4">
               <label className="flex items-center gap-2 px-4 py-3 bg-[#EAFBF8] text-[#00BFA5] rounded-xl cursor-pointer hover:bg-[#D4F7F1] transition-colors border border-[#00BFA5]/20 font-medium">
                 <Camera className="w-5 h-5" />
                 <span>Escolher Fotos</span>
                 <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setFotos(Array.from(e.target.files || []))} />
               </label>
               <span className="text-sm text-slate-500">{fotos.length} novas / {initialData.anexoFotos?.length || 0} já salvas</span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Adicionar Arquivos (Documentos)</label>
            <div className="mt-2 flex items-center gap-4">
               <label className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors border border-slate-200 font-medium">
                 <UploadCloud className="w-5 h-5" />
                 <span>Escolher Arquivos</span>
                 <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setArquivos(Array.from(e.target.files || []))} />
               </label>
               <span className="text-sm text-slate-500">{arquivos.length} novos / {initialData.anexoArquivos?.length || 0} já salvos</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#015299] hover:from-[#1e3470] hover:to-[#01417a] text-white font-medium rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] border-none flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {loading ? "Salvando Alterações..." : "Atualizar Atividade"}
          </button>
        </div>
      </form>
    </div>
  );
}
