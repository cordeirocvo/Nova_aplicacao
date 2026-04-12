"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Zap, Upload, ChevronRight, ChevronLeft, Check, 
  Settings, Shield, Info, FileText, Loader2, AlertTriangle,
  Layers, Database
} from "lucide-react";

export default function NovoDimensionamento() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [chargers, setChargers] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    projectName: "",
    clientName: "",
    chargerId: "",
    utility: "CEMIG",
    entranceCategory: "C1",
    distance: 20,
    installationMethod: "B1",
  });

  const [manualSpecs, setManualSpecs] = useState({
    brand: "",
    model: "",
    power: 7.4,
    voltage: 220,
    phases: 1,
    current: 32,
  });

  // Result State
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/ev/chargers")
      .then(res => {
        if (!res.ok) throw new Error("Erro ao carregar carregadores");
        return res.json();
      })
      .then(setChargers)
      .catch(err => console.error(err));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ev/analyze-pdf", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erro na análise");
      const data = await res.json();
      if (data.success) {
        // Create charger if not exists or just pre-fill a mock one
        const chargerRes = await fetch("/api/ev/chargers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.specs),
        });
        if (!chargerRes.ok) throw new Error("Erro ao salvar carregador");
        const newCharger = await chargerRes.json();
        setChargers([newCharger.charger, ...chargers]);
        setForm({ ...form, chargerId: newCharger.charger.id });
        alert("Datasheet analisado com sucesso! Dados extraídos: " + data.specs.brand + " " + data.specs.model);
      }
    } catch (err) {
      alert("Erro ao analisar PDF");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualSave = async () => {
    setLoading(true);
    try {
      const chargerRes = await fetch("/api/ev/chargers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualSpecs),
      });
      if (!chargerRes.ok) throw new Error("Erro ao salvar carregador");
      const newCharger = await chargerRes.json();
      setChargers([newCharger.charger, ...chargers]);
      setForm({ ...form, chargerId: newCharger.charger.id });
      setStep(2);
    } catch (err) {
      alert("Erro ao salvar dados do carregador");
    } finally {
      setLoading(false);
    }
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ev/sizing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro no processamento");
      const data = await res.json();
      setResult(data);
      setStep(3);
    } catch (err) {
      alert("Erro no cálculo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Stepper */}
      <div className="flex items-center justify-center mb-10 gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? 'bg-[#1E3A8A] text-white' : 'bg-slate-200 text-slate-500'}`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && <div className={`w-20 h-1 transition-all ${step > s ? 'bg-[#1E3A8A]' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Step 1: Carregador */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Zap className="text-[#00BFA5]" /> Seleção do Carregador
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Projeto & Cliente</label>
                <input 
                  type="text" 
                  placeholder="Nome do Projeto"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={form.projectName}
                  onChange={e => setForm({...form, projectName: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Nome do Cliente"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={form.clientName}
                  onChange={e => setForm({...form, clientName: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Especificações do Carregador</label>
                  <button 
                    onClick={() => setIsManual(!isManual)}
                    className="text-xs font-bold text-[#00BFA5] hover:underline flex items-center gap-1"
                  >
                    {isManual ? <Upload className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
                    {isManual ? "Usar Análise de PDF" : "Inserir Manualmente"}
                  </button>
                </div>

                {!isManual ? (
                  <div className="border-2 border-dashed border-[#00BFA5]/30 rounded-2xl p-6 text-center hover:bg-[#00BFA5]/5 transition-colors cursor-pointer relative group">
                    {analyzing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" />
                        <span className="text-sm font-medium">Extraindo especificações...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-[#00BFA5] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-sm font-medium text-slate-600">Arraste ou clique para enviar o PDF</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase">Processamento automático via IA</p>
                      </>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="Marca (ex: WEG)" 
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200"
                        value={manualSpecs.brand}
                        onChange={e => setManualSpecs({...manualSpecs, brand: e.target.value})}
                      />
                      <input 
                        type="text" 
                        placeholder="Modelo (ex: WEMOB)" 
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200"
                        value={manualSpecs.model}
                        onChange={e => setManualSpecs({...manualSpecs, model: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Potência (kW)</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                          value={manualSpecs.power}
                          onChange={e => setManualSpecs({...manualSpecs, power: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Corrente (A)</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                          value={manualSpecs.current}
                          onChange={e => setManualSpecs({...manualSpecs, current: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fases</label>
                        <select 
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                          value={manualSpecs.phases}
                          onChange={e => setManualSpecs({...manualSpecs, phases: parseInt(e.target.value)})}
                        >
                          <option value={1}>1F (220V)</option>
                          <option value={3}>3F (380V)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Escolha no Catálogo</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                value={form.chargerId}
                onChange={e => setForm({...form, chargerId: e.target.value})}
              >
                <option value="">Selecione um carregador...</option>
                {chargers.map(c => (
                  <option key={c.id} value={c.id}>{c.brand} {c.model} - {c.power}kW ({c.phases}F)</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-6">
              <button 
                disabled={(!isManual && !form.chargerId) || !form.projectName}
                onClick={isManual ? handleManualSave : () => setStep(2)}
                className="px-8 py-3 bg-[#1E3A8A] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#1e3470] disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Próximo Passo"}
                {!loading && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Infraestrutura */}
        {step === 2 && (
          <div className="p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="text-[#00BFA5]" /> Condições da Instalação
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Concessionária & Padrão de Entrada</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-3">
                  <option>CEMIG</option>
                </select>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={form.entranceCategory}
                  onChange={e => setForm({...form, entranceCategory: e.target.value})}
                >
                  <option value="A">Monofásico (Até 8kW)</option>
                  <option value="B1">Bifásico (Até 12kW)</option>
                  <option value="B2">Bifásico (Até 16kW)</option>
                  <option value="C1">Trifásico (24kVA)</option>
                  <option value="C2">Trifásico (30kVA)</option>
                  <option value="C3">Trifásico (38kVA)</option>
                  <option value="C4">Trifásico (47kVA)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-2 italic px-1">Conforme CEMIG ND-5.1 atualizada.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Distância do Quadro (m)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={form.distance}
                  onChange={e => setForm({...form, distance: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Método de Instalação (NBR 5410)</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={form.installationMethod}
                  onChange={e => setForm({...form, installationMethod: e.target.value})}
                >
                  <option value="B1">Eletroduto Embutido (B1)</option>
                  <option value="C">Cabo Aparente / Bandeja (C)</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
              <p className="text-sm text-blue-700 font-medium">
                Dimensionamento realizado considerando Corrente Admissível, Queda de Tensão (máx 4%) e Sobrecarga.
              </p>
            </div>

            <div className="flex justify-between pt-6">
              <button 
                onClick={() => setStep(1)}
                className="px-8 py-3 text-[#1E3A8A] font-bold flex items-center gap-2 hover:underline"
              >
                <ChevronLeft className="w-5 h-5" /> Voltar
              </button>
              <button 
                onClick={calculate}
                disabled={loading}
                className="px-8 py-3 bg-[#00BFA5] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#00a892] shadow-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                Calcular Dimensionamento
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Resultados & Relatório */}
        {step === 3 && result && (
          <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Resultado do Projeto</h2>
              <button onClick={() => window.print()} className="px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-50">
                 <FileText className="w-4 h-4" /> Exportar Relatório
              </button>
            </div>

            {/* Dash cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Bitola do Cabo</p>
                  <p className="text-2xl font-black text-[#1E3A8A]">{result.result.cableGauge} <span className="text-sm">mm²</span></p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Disjuntor</p>
                  <p className="text-2xl font-black text-[#1E3A8A]">{result.result.breaker} <span className="text-sm">A</span></p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Queda de Tensão</p>
                  <p className="text-2xl font-black text-[#00BFA5]">{result.result.voltageDrop}%</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Proteção DR</p>
                  <p className="text-sm font-black text-slate-700 leading-tight">{result.result.drType}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Diagrama Simbolico */}
               <div className="bg-[#0A192F] text-white p-6 rounded-3xl relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                     <Layers className="w-5 h-5 text-[#00BFA5]" />
                     <h3 className="font-bold">Diagrama Unifilar Simplificado</h3>
                  </div>
                  <div className="space-y-8 py-4 relative">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#00BFA5] font-bold">QD</div>
                        <div className="flex-1 h-0.5 bg-white/20 relative">
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full mb-1 text-[10px] text-white font-bold opacity-60">
                              Dist.: {form.distance}m
                           </div>
                        </div>
                        <div className="w-10 h-10 bg-[#1E3A8A] rounded-full flex items-center justify-center border-2 border-[#00BFA5]"><Zap className="w-5 h-5 text-white" /></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                           <p className="opacity-60 mb-1">Cabo Sugerido</p>
                           <p className="font-bold text-[#00BFA5]">{result.result.cableGauge}mm² (Cobre)</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                           <p className="opacity-60 mb-1">Eletroduto</p>
                           <p className="font-bold text-[#00BFA5]">{result.result.conduitSize}</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Análise Técnica */}
               <div className="space-y-6">
                  <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                     <Shield className="w-5 h-5 text-[#1E3A8A]" />
                     <h3>Análise de Conformidade</h3>
                  </div>
                  <ul className="space-y-3">
                     <li className="flex items-start gap-2 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0"><Check className="w-3 h-3" /></div>
                        <span>Aderente à NBR 17019 para alimentação de veículos elétricos.</span>
                     </li>
                     {result.project.isServiceEntranceOk ? (
                       <li className="flex items-start gap-2 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0"><Check className="w-3 h-3" /></div>
                        <span>Padrão de entrada CEMIG ({form.entranceCategory}) suporta a carga do carregador.</span>
                       </li>
                     ) : (
                       <li className="flex items-start gap-2 text-sm text-amber-600">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0"><AlertTriangle className="w-3 h-3" /></div>
                        <span>Atenção: Necessário pedir aumento de carga para CEMIG.</span>
                       </li>
                     )}
                     <li className="flex items-start gap-2 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><Info className="w-3 h-3" /></div>
                        <span>Sistema de aterramento recomendado: {result.project.groundingAnalysis}</span>
                     </li>
                  </ul>
                  
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                     <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">Orientações Bombeiros</h4>
                     <p className="text-xs text-orange-700 leading-relaxed italic">
                        Para instalações em garagens internas, seguir IT 14 (Sinalização) e IT 35 (Sistemas de detecção). Manter afastamento mínimo de inflamáveis.
                     </p>
                  </div>
               </div>
            </div>

            <div className="pt-10 flex justify-between border-t border-slate-100">
               <button onClick={() => setStep(2)} className="px-8 py-3 text-slate-400 font-bold hover:underline">Recalcular</button>
               <button onClick={() => router.push("/carregamento")} className="px-10 py-3 bg-[#1E3A8A] text-white rounded-xl font-bold shadow-lg">Fechar e Salvar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
