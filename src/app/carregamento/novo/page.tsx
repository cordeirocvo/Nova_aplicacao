"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, ChevronRight, ChevronLeft, Check, AlertTriangle,
  Info, Shield, Loader2, Plus, Trash2, FileText, ExternalLink,
  BatteryCharging, Building2, MapPin, CheckCircle2, Box
} from "lucide-react";
import {
  calcularPadraoEntrada, CHARGER_PRESETS, CEMIG_DOCS,
  type ChargerConfig, type CemigResult
} from "@/lib/ev/cemigEngine";
import { calculateSizing } from "@/lib/ev/sizingEngine";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const inputCls =
  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] transition-all text-sm";
const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1";

/* ─── Component ────────────────────────────────────────────────────────────── */
export default function NovoDimensionamento() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Etapa 1 — dados gerais
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [isCollective, setIsCollective] = useState(false);
  const [location, setLocation] = useState<"urbano" | "rural">("urbano");
  const [existingLoadKW, setExistingLoadKW] = useState(0);
  const [simultaneityFactor, setSimultaneityFactor] = useState(0.8);

  // Carregadores
  const [chargers, setChargers] = useState<ChargerConfig[]>([
    { powerKW: 7.4, quantity: 1, phases: 1, chargerType: "AC" },
  ]);

  // Etapa 2 — parâmetros elétricos
  const [distance, setDistance] = useState(20);
  const [method, setMethod] = useState<"B1" | "C">("B1");
  const [groundingType, setGroundingType] = useState("TT");
  
  // Transformador
  const [hasTransformer, setHasTransformer] = useState(false);
  const [primaryVoltage, setPrimaryVoltage] = useState(220); // Solicitar tensão entre fases
  const [secondaryVoltage, setSecondaryVoltage] = useState(380);
  const [primaryDistance, setPrimaryDistance] = useState(10); // Painel -> Transfo
  const [chargerDistance, setChargerDistance] = useState(10); // Transfo -> Carregador

  // Resultado
  const [cemigResult, setCemigResult] = useState<CemigResult | null>(null);
  const [sizingResult, setSizingResult] = useState<any>(null);

  /* ─── Funções ──────────────────────────────────────────────────────────── */
  const addCharger = () =>
    setChargers([...chargers, { powerKW: 7.4, quantity: 1, phases: 1, chargerType: "AC" }]);

  const removeCharger = (i: number) =>
    setChargers(chargers.filter((_, idx) => idx !== i));

  const updateCharger = (i: number, field: keyof ChargerConfig, value: any) => {
    const updated = chargers.map((c, idx) =>
      idx === i ? { ...c, [field]: value } : c
    );
    setChargers(updated);
  };

  const applyPreset = (i: number, preset: typeof CHARGER_PRESETS[number]) => {
    const updated = chargers.map((c, idx) =>
      idx === i
        ? { ...c, powerKW: preset.powerKW, phases: preset.phases as 1|3, chargerType: preset.type }
        : c
    );
    setChargers(updated);
  };

  const handleCalculate = () => {
    // Calcular padrão CEMIG
    const cResult = calcularPadraoEntrada({
      chargers,
      existingLoadKW,
      simultaneityFactor,
      isCollectiveBuilding: isCollective,
      location,
    });
    setCemigResult(cResult);

    // Calcular dimensionamento elétrico do maior carregador
    const biggest = [...chargers].sort((a, b) => b.powerKW - a.powerKW)[0];
    const sResult = calculateSizing({
      powerkW: biggest.powerKW,
      voltage: hasTransformer ? secondaryVoltage : (biggest.phases === 3 ? 380 : 220),
      phases: biggest.phases,
      distance: hasTransformer ? chargerDistance : distance,
      method: method as any,
      hasTransformer,
      primaryVoltage,
      primaryDistance,
      groundingType
    });
    setSizingResult(sResult);

    setStep(3);
  };

  const handleSave = async () => {
    if (!cemigResult || !sizingResult) return;
    setSaving(true);
    try {
      const biggest = [...chargers].sort((a, b) => b.powerKW - a.powerKW)[0];
      
      const chargerRes = await fetch("/api/ev/chargers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: "Configuração CEMIG",
          model: projectName,
          power: biggest.powerKW,
          voltage: hasTransformer ? secondaryVoltage : (biggest.phases === 3 ? 380 : 220),
          phases: biggest.phases,
          current: sizingResult.current,
        }),
      });
      const { charger } = await chargerRes.json();

      const saveRes = await fetch("/api/ev/sizing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          clientName,
          utility: "CEMIG",
          entranceCategory: cemigResult.tipoUC,
          distance: hasTransformer ? chargerDistance : distance,
          installationMethod: method,
          chargerId: charger.id,
          hasTransformer,
          transformerPrimaryVoltage: primaryVoltage,
          transformerSecondaryVoltage: secondaryVoltage,
          transformerDistance: primaryDistance,
          chargerDistance,
          groundingType,
          existingLoadKW,
          simultaneityFactor,
          isCollective,
          location,
          analysisNotes: `${cemigResult.padraoEntrada} | ${cemigResult.ramalTipo} | ${cemigResult.demandaFaixa}`,
        }),
      });
      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(saveData.error || "Erro ao salvar dimensionamento");
      }

      if (saveData.project?.id) {
        router.push(`/carregamento/${saveData.project.id}`);
      } else {
        router.push("/carregamento");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro inesperado ao salvar projeto. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { n: 1, label: "Instalação & Carregadores" },
    { n: 2, label: "Parâmetros Elétricos" },
    { n: 3, label: "Relatório de Dimensionamento" },
  ];

  const totalKW = chargers.reduce((s, c) => s + c.powerKW * c.quantity, 0) + existingLoadKW;
  const canGoStep2 = projectName.trim() && chargers.length > 0;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800">Novo Dimensionamento</h1>
        <p className="text-slate-500 mt-1 text-sm">Cálculos conforme NBR 5410, NBR 17019 e CEMIG ND-5.1</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-10 gap-0">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${step > s.n ? "bg-[#00BFA5] text-white" : step === s.n ? "bg-[#1E3A8A] text-white ring-4 ring-[#1E3A8A]/20" : "bg-slate-100 text-slate-400"}`}>
                {step > s.n ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-[10px] font-bold mt-1.5 ${step >= s.n ? "text-slate-700" : "text-slate-400"}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${step > s.n ? "bg-[#00BFA5]" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {step === 1 && (
          <div className="p-8 space-y-8">
             {/* Dados Gerais */}
             <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Building2 className="w-5 h-5 text-[#00BFA5]" />
                <h2 className="text-lg font-bold text-slate-800">Identificação do Projeto</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nome do Projeto *</label>
                  <input type="text" className={inputCls} placeholder="Ex: Projeto Residencial X" value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Cliente</label>
                  <input type="text" className={inputCls} placeholder="Nome do cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Tipo de Edificação</label>
                  <select className={inputCls} value={isCollective ? "coletiva" : "individual"} onChange={e => setIsCollective(e.target.value === "coletiva")}>
                    <option value="individual">Individual</option>
                    <option value="coletiva">Coletiva</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Localização</label>
                  <select className={inputCls} value={location} onChange={e => setLocation(e.target.value as any)}>
                    <option value="urbano">Urbano</option>
                    <option value="rural">Rural</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cargas */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Zap className="w-5 h-5 text-[#1E3A8A]" />
                <h2 className="text-lg font-bold text-slate-800">Cargas Existentes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Carga instalada atual (kW)</label>
                  <input type="number" min={0} step={0.5} className={inputCls} value={existingLoadKW} onChange={e => setExistingLoadKW(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className={labelCls}>Fator de Simultaneidade ({Math.round(simultaneityFactor * 100)}%)</label>
                  <input type="range" min={0.3} max={1} step={0.05} className="w-full mt-2" value={simultaneityFactor} onChange={e => setSimultaneityFactor(parseFloat(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Carregadores */}
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BatteryCharging className="w-5 h-5 text-[#00BFA5]" />
                  <h2 className="text-lg font-bold text-slate-800">Carregadores EV</h2>
                </div>
                <button onClick={addCharger} className="flex items-center gap-1.5 text-sm font-bold text-[#00BFA5] px-3 py-1.5 rounded-lg hover:bg-[#00BFA5]/10">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
              <div className="space-y-4">
                {chargers.map((c, i) => (
                  <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-400 uppercase">Carregador {i + 1}</span>
                      {chargers.length > 1 && (
                        <button onClick={() => removeCharger(i)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className={labelCls}>Modelo de Referência</label>
                      <select className={inputCls} onChange={e => applyPreset(i, CHARGER_PRESETS[parseInt(e.target.value)])}>
                        <option value="">— Selecione um modelo —</option>
                        {CHARGER_PRESETS.map((p, pi) => (
                          <option key={pi} value={pi}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className={labelCls}>Potência (kW)</label>
                        <input type="number" min={1} className={inputCls} value={c.powerKW} onChange={e => updateCharger(i, "powerKW", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className={labelCls}>Quantidade</label>
                        <input type="number" min={1} className={inputCls} value={c.quantity} onChange={e => updateCharger(i, "quantity", parseInt(e.target.value) || 1)} />
                      </div>
                      <div>
                        <label className={labelCls}>Fases</label>
                        <select className={inputCls} value={c.phases} onChange={e => updateCharger(i, "phases", parseInt(e.target.value))}>
                          <option value={1}>Monofásico</option>
                          <option value={3}>Trifásico</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Tipo</label>
                        <select className={inputCls} value={c.chargerType} onChange={e => updateCharger(i, "chargerType", e.target.value)}>
                          <option value="AC">AC</option>
                          <option value="DC">DC</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button disabled={!canGoStep2} onClick={() => setStep(2)} className="px-8 py-3 bg-[#1E3A8A] text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-40 hover:bg-[#1e3470] transition-all shadow-lg">
                Próximo <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
              <MapPin className="w-5 h-5 text-[#00BFA5]" />
              <h2 className="text-lg font-bold text-slate-800">Parâmetros de Instalação</h2>
            </div>

            {/* Opção Transformador */}
            <div className="bg-[#1E3A8A]/5 border border-[#1E3A8A]/10 rounded-2xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Box className="w-6 h-6 text-[#1E3A8A]" />
                    <div>
                      <p className="font-black text-slate-800">Uso de Transformador</p>
                      <p className="text-xs text-slate-500">Obrigatório para carregadores de 380V em redes 220V</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={hasTransformer} onChange={e => setHasTransformer(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00BFA5]"></div>
                  </label>
               </div>

               {hasTransformer && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <p className="text-xs font-black text-[#1E3A8A] uppercase">Lado Primário (Rede)</p>
                      <div>
                        <label className={labelCls}>Tensão entre Fases (V)</label>
                        <input type="number" className={inputCls} value={primaryVoltage} onChange={e => setPrimaryVoltage(parseFloat(e.target.value))} />
                      </div>
                      <div>
                        <label className={labelCls}>Distância Quadro → Transfo (m)</label>
                        <input type="number" className={inputCls} value={primaryDistance} onChange={e => setPrimaryDistance(parseFloat(e.target.value))} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-black text-[#00BFA5] uppercase">Lado Secundário (Carregador)</p>
                      <div>
                        <label className={labelCls}>Tensão de Saída (V)</label>
                        <input type="number" className={inputCls} value={secondaryVoltage} onChange={e => setSecondaryVoltage(parseFloat(e.target.value))} />
                      </div>
                      <div>
                        <label className={labelCls}>Distância Transfo → Carregador (m)</label>
                        <input type="number" className={inputCls} value={chargerDistance} onChange={e => setChargerDistance(parseFloat(e.target.value))} />
                      </div>
                    </div>
                 </div>
               )}

               {!hasTransformer && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelCls}>Distância do Painel até o Carregador (m)</label>
                      <input type="number" className={inputCls} value={distance} onChange={e => setDistance(parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Método de Instalação</label>
                      <select className={inputCls} value={method} onChange={e => setMethod(e.target.value as any)}>
                        <option value="B1">Eletroduto embutido (B1)</option>
                        <option value="C">Cabo fixado em parede/eletrocalha (C)</option>
                      </select>
                    </div>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Sistema de Aterramento</label>
                  <select className={inputCls} value={groundingType} onChange={e => setGroundingType(e.target.value)}>
                    <option value="TT">TT (Haste Independente)</option>
                    <option value="TN-S">TN-S (Neutro e Terra Separados)</option>
                    <option value="TN-C-S">TN-C-S (Neutro e Terra Separados após entrada)</option>
                  </select>
                </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-8 py-3 text-slate-500 font-bold flex items-center gap-2 hover:underline">
                <ChevronLeft className="w-5 h-5" /> Voltar
              </button>
              <button onClick={handleCalculate} className="px-8 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg">
                <Zap className="w-5 h-5" /> Calcular Dimensionamento
              </button>
            </div>
          </div>
        )}

        {step === 3 && cemigResult && sizingResult && (
          <div className="p-8 space-y-8 animate-in fade-in duration-500">
             <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-6 h-6 text-[#00BFA5]" />
                  <h2 className="text-2xl font-black text-slate-800">Resultado do Dimensionamento</h2>
                </div>
                <p className="text-sm text-slate-500">{projectName}</p>
              </div>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all no-print">
                <FileText className="w-4 h-4" /> Imprimir
              </button>
            </div>

            {/* Resumo CEMIG */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="p-5 rounded-2xl bg-[#1E3A8A]/5 border-2 border-[#1E3A8A]/10">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Padrão CEMIG</p>
                  <p className="text-lg font-black text-[#1E3A8A]">Tipo {cemigResult.tipoUC}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{cemigResult.padraoEntrada}</p>
               </div>
               <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Demanda</p>
                  <p className="text-lg font-black text-slate-700">{cemigResult.demandaKVA} kVA</p>
                  <p className="text-[10px] text-slate-500 mt-1">{cemigResult.demandaFaixa}</p>
               </div>
               <div className="p-5 rounded-2xl bg-[#00BFA5]/5 border-2 border-[#00BFA5]/10">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Corrente (Maior Carregador)</p>
                  <p className="text-lg font-black text-[#00BFA5]">{sizingResult.current} A</p>
               </div>
            </div>

            {/* Dimensionamento Detalhado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-[#0A192F] text-white p-6 rounded-3xl">
                  <div className="flex items-center gap-2 mb-5 border-b border-white/10 pb-3">
                    <Zap className="w-5 h-5 text-[#00BFA5]" />
                    <h3 className="font-bold">Circuitos e Cabos</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {sizingResult.primary && (
                      <div>
                        <p className="text-[10px] font-black text-[#00BFA5] uppercase mb-3">Lado Primário (Painel → Transfo)</p>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                             <p className="text-[9px] opacity-50 uppercase">Cabo</p>
                             <p className="font-bold">{sizingResult.primary.cableGauge} mm²</p>
                           </div>
                           <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                             <p className="text-[9px] opacity-50 uppercase">Proteção</p>
                             <p className="font-bold">{sizingResult.primary.breaker} A (3P)</p>
                           </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-black text-[#00BFA5] uppercase mb-3">
                        {hasTransformer ? "Lado Secundário (Transfo → Carregador)" : "Circuito de Alimentação"}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase">Cabo</p>
                           <p className="font-bold">{sizingResult.cableGauge} mm²</p>
                         </div>
                         <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase">Proteção</p>
                           <p className="font-bold">{sizingResult.breaker} A</p>
                         </div>
                         <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase">Queda de Tensão</p>
                           <p className={`font-bold ${sizingResult.voltageDrop > 4 ? "text-red-400" : "text-green-400"}`}>{sizingResult.voltageDrop}%</p>
                         </div>
                         <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase">Eletroduto</p>
                           <p className="font-bold">{sizingResult.conduitSize}</p>
                         </div>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-[#1E3A8A]" />
                      <h3 className="font-bold text-slate-800">Proteções Adicionais</h3>
                    </div>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Dispositivo DR (NBR 17019)</p>
                          <p className="text-sm font-bold text-[#1E3A8A]">{sizingResult.idrType}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">DPS (Proteção de Surto)</p>
                          <p className="text-sm font-bold text-[#1E3A8A]">{sizingResult.dpsType}</p>
                       </div>
                    </div>
                  </div>
                  <div className="p-5 border border-slate-200 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Análise de Aterramento</p>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{sizingResult.groundingAnalysis}</p>
                  </div>
               </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-100">
               <button onClick={() => setStep(2)} className="px-6 py-3 text-slate-500 font-bold hover:underline">Recalcular</button>
               <button onClick={handleSave} disabled={saving} className="px-10 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl font-black shadow-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2">
                 {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                 {saving ? "Salvando..." : "Confirmar e Salvar"}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
