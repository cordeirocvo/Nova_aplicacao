"use client";

import { useState, useEffect } from "react";
import { Settings, X, Save, CheckCircle, Sun, Clock, Activity } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsModal({ initialSettings }: { initialSettings: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"atividades" | "solar" | "tv">("atividades");
  const router = useRouter();

  // Estados locais das configurações
  const [form, setForm] = useState(initialSettings);
  const [prGreen, setPrGreen] = useState(78);
  const [prYellow, setPrYellow] = useState(60);
  const [tvTempoAtividades, setTvTempoAtividades] = useState(15);
  const [tvTempoUsinas, setTvTempoUsinas] = useState(25);
  const [tvUsinasPerPage, setTvUsinasPerPage] = useState(5);

  useEffect(() => {
    // Carrega configurações solares e de TV do localStorage
    const savedPrGreen = localStorage.getItem("cordeiro_pr_green");
    if (savedPrGreen) setPrGreen(Number(savedPrGreen));

    const savedPrYellow = localStorage.getItem("cordeiro_pr_yellow");
    if (savedPrYellow) setPrYellow(Number(savedPrYellow));

    const savedTvAtiv = localStorage.getItem("cordeiro_tv_time_ativ");
    if (savedTvAtiv) setTvTempoAtividades(Number(savedTvAtiv));

    const savedTvUsinas = localStorage.getItem("cordeiro_tv_time_usinas");
    if (savedTvUsinas) setTvTempoUsinas(Number(savedTvUsinas));

    const savedPerPage = localStorage.getItem("cordeiro_tv_usinas_per_page");
    if (savedPerPage) setTvUsinasPerPage(Number(savedPerPage));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Salva configurações de atividades na API
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      // Salva configurações locais e para a TV
      localStorage.setItem("cordeiro_pr_green", String(prGreen));
      localStorage.setItem("cordeiro_pr_yellow", String(prYellow));
      localStorage.setItem("cordeiro_tv_time_ativ", String(tvTempoAtividades));
      localStorage.setItem("cordeiro_tv_time_usinas", String(tvTempoUsinas));
      localStorage.setItem("cordeiro_tv_usinas_per_page", String(tvUsinasPerPage));

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setIsOpen(false);
        router.refresh();
      }, 1200);
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
        className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:text-[#E45318] transition-all cursor-pointer"
      >
        <Settings className="w-4 h-4 text-[#00B356]" /> Configurações & TV
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
                  <Settings className="w-5 h-5 text-[#E45318]" /> Parâmetros do Sistema & Modo TV
                </h3>
                <p className="text-xs text-slate-400">Configure semáforos, alertas e tempos de transição</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas de Navegação */}
            <div className="flex border-b border-slate-100 bg-slate-100/60 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("atividades")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "atividades"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#00B356]" /> Atividades
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("solar")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "solar"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Semáforo Solar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tv")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "tv"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#E45318]" /> Tempos TV
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {activeTab === "atividades" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-emerald-700 mb-1 flex items-center justify-between">
                      <span>Corte de Data Verde (Dias)</span>
                      <span className="text-[11px] font-normal">≥ {form.limiteVerde} dias</span>
                    </label>
                    <input
                      type="number"
                      value={form.limiteVerde}
                      onChange={e => setForm({...form, limiteVerde: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00B356] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-amber-600 mb-1 flex items-center justify-between">
                      <span>Corte de Data Amarela (Dias)</span>
                      <span className="text-[11px] font-normal">≥ {form.limiteAmarelo} dias</span>
                    </label>
                    <input
                      type="number"
                      value={form.limiteAmarelo}
                      onChange={e => setForm({...form, limiteAmarelo: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 mb-1 block">Teto Crítico de Parecer de Acesso</label>
                    <p className="text-[11px] text-slate-400 mb-1.5">Destacar em alerta se restarem menos de:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={form.limiteParecer}
                        onChange={e => setForm({...form, limiteParecer: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-500">dias</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "solar" && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                    Ajuste os valores de referência do <strong>Performance Ratio (PR %)</strong> para classificação automática das usinas na TV:
                  </div>

                  <div>
                    <label className="text-xs font-bold text-emerald-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Limite Mínimo Ideal (Verde)
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600">≥ {prGreen}%</span>
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={95}
                      value={prGreen}
                      onChange={e => setPrGreen(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00B356] outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Usinas com PR igual ou superior a este valor são classificadas como Operação Ideal.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-amber-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Limite Mínimo de Atenção (Amarelo)
                      </span>
                      <span className="text-[11px] font-bold text-amber-600">≥ {prYellow}%</span>
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={90}
                      value={prYellow}
                      onChange={e => setPrYellow(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Abaixo deste valor (ou com inversores offline/alarmes), a usina entra em Intervenção Necessária (Vermelho).</p>
                  </div>
                </div>
              )}

              {activeTab === "tv" && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                    Defina o tempo de exibição de cada tela no <strong>Modo TV Híbrido (1 TV única)</strong>:
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                      Tempo por Página de Atividades (Segundos)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 15, 20, 30].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTvTempoAtividades(s)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            tvTempoAtividades === s
                              ? "bg-[#0A192F] text-white border-[#0A192F]"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {s}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                      Tempo de Exibição das Usinas Solares (Segundos)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 20, 25, 45].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTvTempoUsinas(s)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            tvTempoUsinas === s
                              ? "bg-[#E45318] text-white border-[#E45318]"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {s}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                      Quantidade de Usinas por Tela na TV
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[4, 5, 6].map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setTvUsinasPerPage(q)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            tvUsinasPerPage === q
                              ? "bg-[#0A192F] text-white border-[#0A192F]"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {q} Usinas
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Recomendado: 5 usinas por tela para garantir fontes grandes e semáforo nítido a distância sem rolagem.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button 
                onClick={() => setIsOpen(false)} 
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving || saved}
                className="px-5 py-2 text-xs font-bold text-white bg-[#00B356] hover:bg-[#009c4a] rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Configurações Salvas!" : saving ? "Salvando..." : "Salvar Parâmetros"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
