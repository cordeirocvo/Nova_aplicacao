"use client";

import { useState } from "react";
import { Settings, X, Save, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsModal({ initialSettings }: { initialSettings: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(initialSettings);
  const router = useRouter();

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setIsOpen(false);
          router.refresh();
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar opções.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-[#00BFA5] transition-colors"
      >
        <Settings className="w-4 h-4" /> Configurar Semáforo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" /> Parâmetros Dinâmicos
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 rounded-md">
                 <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
               <div>
                  <label className="text-sm font-bold text-green-600 mb-1 flex items-center justify-between">
                     <span>Corte de Data Verde (Dias)</span>
                     <span className="text-xs font-normal">≥ {form.limiteVerde} dias</span>
                  </label>
                  <input type="number" value={form.limiteVerde} onChange={e => setForm({...form, limiteVerde: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-400" />
               </div>

               <div>
                  <label className="text-sm font-bold text-yellow-500 mb-1 flex items-center justify-between">
                     <span>Corte de Data Amarela (Dias)</span>
                     <span className="text-xs font-normal">≥ {form.limiteAmarelo} dias</span>
                  </label>
                  <input type="number" value={form.limiteAmarelo} onChange={e => setForm({...form, limiteAmarelo: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400" />
               </div>

               <div>
                  <label className="text-sm font-bold text-slate-800 mb-1 block">Teto Crítico de Parecer de Acesso</label>
                  <p className="text-xs text-slate-500 mb-2">Piscar e jogar para o topo se restarem menos de:</p>
                  <div className="flex items-center gap-2">
                     <input type="number" value={form.limiteParecer} onChange={e => setForm({...form, limiteParecer: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00BFA5]" />
                     <span className="text-sm font-medium">dias</span>
                  </div>
               </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
               <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                 Cancelar
               </button>
               <button 
                 onClick={handleSave} 
                 disabled={saving || saved}
                 className="px-6 py-2 text-sm font-bold text-white bg-[#00BFA5] hover:bg-[#00a690] rounded-lg transition-all flex items-center gap-2"
               >
                 {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                 {saved ? "Salvo" : saving ? "Salvando..." : "Salvar Semáforo"}
               </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
