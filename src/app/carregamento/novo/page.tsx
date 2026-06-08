"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Zap, Shield, Plus, Trash, Check, ChevronRight, 
  ChevronLeft, Building, BatteryCharging, FileText, 
  CheckCircle, Loader, MapPin, Box, AlertTriangle, Save,
  Globe, Search, Phone, Mail, FileCheck
} from "lucide-react";
import { CHARGER_PRESETS, ChargerConfig, calcularPadraoEntrada, CemigResult } from "@/lib/ev/cemigEngine";
import { calculateSizing } from "@/lib/ev/sizingEngine";
import { UTILITY_DATABASE, findRecommendedCategory } from "@/lib/ev/utilityStandards";
import VisualPanelModel from "@/components/ev/VisualPanelModel";

const labelCls = "text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest";
const inputCls = "w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-[#00BFA5] focus:ring-0 transition-all outline-none";

export default function NovoDimensionamento() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Etapa 1 — dados do projeto e cargas
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isCollective, setIsCollective] = useState(false);
  const [location, setLocation] = useState<"urbano" | "rural">("urbano");
  const [existingLoadKW, setExistingLoadKW] = useState(0);
  const [simultaneityFactor, setSimultaneityFactor] = useState(0.8);

  // Carregadores
  const [chargers, setChargers] = useState<ChargerConfig[]>([
    { powerKW: 7.4, quantity: 1, phases: 1, chargerType: "AC" },
  ]);

  // Concessionária e Assistente
  const [utility, setUtility] = useState("CEMIG");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedAssistantUtility, setSelectedAssistantUtility] = useState("CEMIG");

  // Padrão de Entrada Existente (para comparação)
  const [existingEntrancePhases, setExistingEntrancePhases] = useState(3);
  const [existingEntranceBreaker, setExistingEntranceBreaker] = useState(50);
  const [existingEntranceCable, setExistingEntranceCable] = useState(10);
  const [existingEntranceCategory, setExistingEntranceCategory] = useState("Tipo C");

  // Controle de Demanda
  const [demandControlEnabled, setDemandControlEnabled] = useState(false);
  const [demandControlLimit, setDemandControlLimit] = useState(50);

  // Etapa 2 — parâmetros elétricos
  const [distance, setDistance] = useState(20);
  const [method, setMethod] = useState<"B1" | "C">("B1");
  const [groundingType, setGroundingType] = useState("TT");
  
  // Transformador
  const [hasTransformer, setHasTransformer] = useState(false);
  const [primaryVoltage, setPrimaryVoltage] = useState(220); 
  const [secondaryVoltage, setSecondaryVoltage] = useState(380);
  const [primaryDistance, setPrimaryDistance] = useState(10);
  const [chargerDistance, setChargerDistance] = useState(10);

  // Segurança
  const [fireExtinguisherType, setFireExtinguisherType] = useState("PQS 6kg (B/C)");
  const [cosPhi, setCosPhi] = useState(1.0);
  const [createCapexProject, setCreateCapexProject] = useState(false);
  const [hasEmergencyButton5m, setHasEmergencyButton5m] = useState(true);
  const [requiresWarningSigns, setRequiresWarningSigns] = useState(true);

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
    // Calcular a demanda conforme regras básicas
    const cResult = calcularPadraoEntrada({
      chargers,
      existingLoadKW,
      simultaneityFactor,
      isCollectiveBuilding: isCollective,
      location,
    });
    
    // Obter recomendações específicas da Concessionária selecionada
    const recommendedCat = findRecommendedCategory(utility, cResult.demandaKVA);
    if (recommendedCat) {
      cResult.tipoUC = recommendedCat.id as any;
      cResult.tipoUCDesc = recommendedCat.desc;
      cResult.padraoEntrada = `Categoria ${recommendedCat.id} (${recommendedCat.desc})`;
      cResult.demandaFaixa = `Limite: ${recommendedCat.limitKW} kW (Disjuntor Geral ${recommendedCat.breakerA}A)`;
    }

    setCemigResult(cResult);

    const biggest = [...chargers].sort((a, b) => b.powerKW - a.powerKW)[0];
    const sResult = calculateSizing({
      powerkW: biggest.powerKW,
      voltage: hasTransformer ? secondaryVoltage : (biggest.phases === 3 ? 380 : 220),
      phases: biggest.phases,
      distance: hasTransformer ? chargerDistance : distance,
      method: method as any,
      cosPhi: cosPhi,
      hasTransformer,
      primaryVoltage,
      primaryDistance,
      groundingType,
      chargerDistance,
      demandControlEnabled,
      demandControlLimit: Number(demandControlLimit) || 50,
      existingLoadKW,
      simultaneityFactor,
      existingEntrancePhases,
      existingEntranceBreaker,
      existingEntranceCable
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
          brand: "Referência Técnica",
          model: biggest.powerKW + "kW " + biggest.chargerType,
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
          clientDocument,
          clientPhone,
          clientEmail,
          clientAddress,
          projectDescription,
          utility,
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
          fireExtinguisherType,
          hasEmergencyButton5m,
          requiresWarningSigns,
          analysisNotes: `${cemigResult.padraoEntrada} | ${cemigResult.ramalTipo} | ${cemigResult.demandaFaixa}`,
          createCapexProject,
          cosPhi,
          existingEntrancePhases: Number(existingEntrancePhases),
          existingEntranceBreaker: Number(existingEntranceBreaker),
          existingEntranceCable: Number(existingEntranceCable),
          existingEntranceCategory,
          demandControlEnabled,
          demandControlLimit: Number(demandControlLimit)
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
      const errorMessage = error.message || "Erro inesperado ao salvar projeto.";
      alert(errorMessage + (error.details ? "\n\nDetalhes: " + error.details : ""));
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { n: 1, label: "Cargas & Carregadores" },
    { n: 2, label: "Parâmetros & Segurança" },
    { n: 3, label: "Resultado" },
  ];

  const canGoStep2 = projectName.trim() && chargers.length > 0;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Novo Dimensionamento EV</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Dimensionamento técnico conforme NBR 17019, NBR 5410 e IT 41 Bombeiros.</p>
      </div>

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
          <div className="p-8 space-y-8 animate-in fade-in duration-500">
             <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Building className="w-5 h-5 text-[#00BFA5]" />
                <h2 className="text-lg font-bold text-slate-800">Identificação do Cliente e Projeto</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nome do Projeto *</label>
                  <input type="text" className={inputCls} placeholder="Ex: Estacionamento Shopping X" value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Cliente / Razão Social *</label>
                  <input type="text" className={inputCls} placeholder="Nome do cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>CNPJ / CPF do Cliente</label>
                  <input type="text" className={inputCls} placeholder="00.000.000/0000-00" value={clientDocument} onChange={e => setClientDocument(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Telefone do Cliente</label>
                  <input type="text" className={inputCls} placeholder="(31) 99999-9999" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>E-mail do Cliente</label>
                  <input type="email" className={inputCls} placeholder="contato@cliente.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Endereço da Instalação</label>
                  <input type="text" className={inputCls} placeholder="Rua, Número, Bairro, Cidade - UF" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Descrição Detalhada do Projeto</label>
                  <textarea className={`${inputCls} h-20 resize-none`} placeholder="Descreva os detalhes da instalação..." value={projectDescription} onChange={e => setProjectDescription(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#1E3A8A]" />
                  <h2 className="text-lg font-bold text-slate-800">Concessionária de Energia</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-black bg-[#1E3A8A]/10 text-[#1E3A8A] px-3.5 py-2 rounded-xl hover:bg-[#1E3A8A]/20 transition-all border-none"
                >
                  <Search className="w-3.5 h-3.5" /> Assistente de Concessionárias
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Concessionária Responsável</label>
                  <select className={inputCls} value={utility} onChange={e => setUtility(e.target.value)}>
                    {Object.keys(UTILITY_DATABASE).map(u => (
                      <option key={u} value={u}>{UTILITY_DATABASE[u].name} ({UTILITY_DATABASE[u].region})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tipo de Edificação</label>
                  <select className={inputCls} value={isCollective ? "coletiva" : "individual"} onChange={e => setIsCollective(e.target.value === "coletiva")}>
                    <option value="individual">Residencial Individual (Casas)</option>
                    <option value="coletiva">Condomínio / Comercial (Coletiva)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Padrão de Entrada Existente */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <FileCheck className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-800">Padrão de Entrada Existente (para Comparação)</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Nº Fases</label>
                  <select className={inputCls} value={existingEntrancePhases} onChange={e => setExistingEntrancePhases(parseInt(e.target.value))}>
                    <option value={1}>1 Fase (Monofásico)</option>
                    <option value={2}>2 Fases (Bifásico)</option>
                    <option value={3}>3 Fases (Trifásico)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Disjuntor Geral (A)</label>
                  <input type="number" min={10} className={inputCls} value={existingEntranceBreaker} onChange={e => setExistingEntranceBreaker(parseFloat(e.target.value) || 50)} />
                </div>
                <div>
                  <label className={labelCls}>Cabo de Entrada (mm²)</label>
                  <input type="number" min={1.5} className={inputCls} value={existingEntranceCable} onChange={e => setExistingEntranceCable(parseFloat(e.target.value) || 10)} />
                </div>
                <div>
                  <label className={labelCls}>Categoria Existente (opcional)</label>
                  <input type="text" className={inputCls} placeholder="Ex: C3 CEMIG" value={existingEntranceCategory} onChange={e => setExistingEntranceCategory(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Controle de Demanda Inteligente */}
            <div className="p-6 bg-orange-50/30 border border-orange-100 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Controle de Demanda Ativo (Limitação de Carga)</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Os carregadores reduzem a potência de recarga se o prédio + carregador for ultrapassar o padrão.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={demandControlEnabled} onChange={e => setDemandControlEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {demandControlEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-orange-100 animate-in slide-in-from-top-2">
                  <div>
                    <label className={labelCls}>Corrente Máxima do Padrão Limite (A)</label>
                    <input type="number" className={inputCls} value={demandControlLimit} onChange={e => setDemandControlLimit(parseFloat(e.target.value) || 50)} />
                    <p className="text-[9px] text-slate-400 mt-1 italic">Geralmente coincide com o disjuntor do padrão de entrada existente (ex: 50A ou 63A).</p>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="p-3 bg-white/50 rounded-xl text-[10px] font-bold text-slate-600 border border-orange-100">
                      Capacidade atual reservada ao prédio: <span className="text-slate-800">{(existingLoadKW * simultaneityFactor).toFixed(1)} kW</span>.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Zap className="w-5 h-5 text-[#1E3A8A]" />
                <h2 className="text-lg font-bold text-slate-800">Cargas e Uso da Edificação</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Carga instalada atual (kW)</label>
                  <input type="number" min={0} step={0.5} className={inputCls} value={existingLoadKW} onChange={e => setExistingLoadKW(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className={labelCls}>Fator de Simultaneidade ({Math.round(simultaneityFactor * 100)}%)</label>
                  <input type="range" min={0} max={1} step={0.05} className="w-full mt-2 accent-[#00BFA5]" value={simultaneityFactor} onChange={e => setSimultaneityFactor(parseFloat(e.target.value))} />
                  <p className="text-[9px] text-slate-400">Escala de 0% a 100%.</p>
                </div>
                <div>
                  <label className={labelCls}>Localização da UC</label>
                  <select className={inputCls} value={location} onChange={e => setLocation(e.target.value as any)}>
                    <option value="urbano">Urbano</option>
                    <option value="rural">Rural</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BatteryCharging className="w-5 h-5 text-[#00BFA5]" />
                  <h2 className="text-lg font-bold text-slate-800">Estações de Recarga</h2>
                </div>
                <button onClick={addCharger} className="flex items-center gap-1.5 text-sm font-bold text-[#00BFA5] px-3 py-1.5 rounded-lg hover:bg-[#00BFA5]/10 transition-colors">
                  <Plus className="w-4 h-4" /> Adicionar Carregador
                </button>
              </div>
              <div className="space-y-4">
                {chargers.map((c, i) => (
                  <div key={i} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 relative hover:border-[#00BFA5]/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipamento {i + 1}</span>
                      {chargers.length > 1 && (
                        <button onClick={() => removeCharger(i)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Modelo de Referência</label>
                      <select className={inputCls} onChange={e => applyPreset(i, CHARGER_PRESETS[parseInt(e.target.value)])}>
                        <option value="">— Selecione um modelo do datasheet —</option>
                        {CHARGER_PRESETS.map((p, pi) => (
                          <option key={pi} value={pi}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className={labelCls}>Potência (kW)</label>
                        <input type="number" min={1} className={inputCls} value={c.powerKW} onChange={e => updateCharger(i, "powerKW", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className={labelCls}>Quantidade</label>
                        <input type="number" min={1} className={inputCls} value={c.quantity} onChange={e => updateCharger(i, "quantity", parseInt(e.target.value) || 1)} />
                      </div>
                      <div>
                        <label className={labelCls}>Conexão</label>
                        <select className={inputCls} value={c.phases} onChange={e => updateCharger(i, "phases", parseInt(e.target.value))}>
                          <option value={1}>Monofásico</option>
                          <option value={3}>Trifásico</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Tecnologia</label>
                        <select className={inputCls} value={c.chargerType} onChange={e => updateCharger(i, "chargerType", e.target.value)}>
                          <option value="AC">AC (Wallbox)</option>
                          <option value="DC">DC (Rápido)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button disabled={!canGoStep2} onClick={() => setStep(2)} className="px-10 py-4 bg-[#1E3A8A] text-white rounded-2xl font-black flex items-center gap-3 disabled:opacity-40 hover:bg-[#1e3470] transition-all shadow-xl hover:-translate-y-0.5">
                Configurações de Infra <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 space-y-10 animate-in slide-in-from-right duration-500">
            <div>
               <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                  <MapPin className="w-5 h-5 text-[#00BFA5]" />
                  <h2 className="text-lg font-bold text-slate-800">Parâmetros de Instalação Elétrica</h2>
               </div>

               <div className="bg-[#1E3A8A]/5 border border-[#1E3A8A]/10 rounded-3xl p-8 mb-8">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                           <Box className="w-6 h-6 text-[#1E3A8A]" />
                        </div>
                        <div>
                           <p className="font-black text-slate-800">Uso de Transformador Isolador</p>
                           <p className="text-xs text-slate-500 font-medium italic">Obrigatório para carregadores DC/380V em redes 220V (F+F).</p>
                        </div>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer scale-125">
                        <input type="checkbox" className="sr-only peer" checked={hasTransformer} onChange={e => setHasTransformer(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00BFA5]"></div>
                     </label>
                  </div>

                  {hasTransformer && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-500">
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-[#1E3A8A] rounded-full"></span> Lado Primário (Rede Local)
                           </p>
                           <div>
                              <label className={labelCls}>Tensão Nominal (V)</label>
                              <input type="number" className={inputCls} value={primaryVoltage} onChange={e => setPrimaryVoltage(parseFloat(e.target.value) || 220)} />
                           </div>
                           <div>
                              <label className={labelCls}>Distância QGBT → Transformador (m)</label>
                              <input type="number" className={inputCls} value={primaryDistance} onChange={e => setPrimaryDistance(parseFloat(e.target.value) || 10)} />
                           </div>
                        </div>
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-[#00BFA5] rounded-full"></span> Lado Secundário (Carregador)
                           </p>
                           <div>
                              <label className={labelCls}>Tensão de Saída (V)</label>
                              <input type="number" className={inputCls} value={secondaryVoltage} onChange={e => setSecondaryVoltage(parseFloat(e.target.value) || 380)} />
                           </div>
                           <div>
                              <label className={labelCls}>Distância Transformador → Carregador (m)</label>
                              <input type="number" className={inputCls} value={chargerDistance} onChange={e => setChargerDistance(parseFloat(e.target.value) || 10)} />
                           </div>
                        </div>
                    </div>
                  )}

                  {!hasTransformer && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                           <label className={labelCls}>Distância do Quadro até o Carregador (m)</label>
                           <input type="number" className={inputCls} value={distance} onChange={e => setDistance(parseFloat(e.target.value) || 20)} />
                        </div>
                        <div>
                           <label className={labelCls}>Método de Instalação (NBR 5410)</label>
                           <select className={inputCls} value={method} onChange={e => setMethod(e.target.value as any)}>
                              <option value="B1">Eletroduto embutido em alvenaria (B1)</option>
                              <option value="C">Cabo fixado em parede ou eletrocalha (C)</option>
                           </select>
                        </div>
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 border border-slate-200 rounded-3xl bg-slate-50/50">
                     <label className={labelCls}>Esquema de Aterramento</label>
                     <select className={inputCls} value={groundingType} onChange={e => setGroundingType(e.target.value)}>
                        <option value="TT">TT (Haste Independente - Recomendado EV)</option>
                        <option value="TN-S">TN-S (Neutro e Terra Separados desde a origem)</option>
                        <option value="TN-C-S">TN-C-S (Neutro e Terra Separados após entrada)</option>
                     </select>
                     <p className="text-[10px] text-slate-400 mt-2 italic">* Carregadores DC exigem resistência de aterramento inferior a 4 ohms.</p>
                  </div>
                  <div className="p-6 border border-slate-200 rounded-3xl bg-slate-50/50">
                     <label className={labelCls}>Fator de Potência (cos ϕ)</label>
                     <input type="number" step="0.01" min="0.8" max="1.0" className={inputCls} value={cosPhi} onChange={e => setCosPhi(parseFloat(e.target.value) || 1.0)} />
                     <p className="text-[10px] text-slate-400 mt-2 italic">* Wallboxes e carregadores modernos com PFC ativo operam com FP perto de 1.0 (padrão de fábrica).</p>
                  </div>
               </div>
            </div>

            <div>
               <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-bold text-slate-800">Segurança Contra Incêndio & AVCB</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-red-50/30 border border-red-100 rounded-3xl space-y-4">
                     <div>
                        <label className={labelCls}>Extintor de Incêndio Próximo</label>
                        <select className={inputCls} value={fireExtinguisherType} onChange={e => setFireExtinguisherType(e.target.value)}>
                           <option value="PQS 6kg (B/C)">PQS 6kg (Classe B/C)</option>
                           <option value="CO2 6kg (B/C)">CO2 6kg (Classe B/C - Recomendado)</option>
                           <option value="PQS 4kg (B/C)">PQS 4kg (Classe B/C)</option>
                        </select>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-red-100">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Botão de Emergência (a 5m)</span>
                        <input type="checkbox" className="w-5 h-5 accent-red-600" checked={hasEmergencyButton5m} onChange={e => setHasEmergencyButton5m(e.target.checked)} />
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-red-100">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Placas de Advertência</span>
                        <input type="checkbox" className="w-5 h-5 accent-red-600" checked={requiresWarningSigns} onChange={e => setRequiresWarningSigns(e.target.checked)} />
                     </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Resumo de Normas</h3>
                     <ul className="space-y-2 text-[10px] font-bold text-slate-600">
                        <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> NBR 17019:2017 (Instalações EV)</li>
                        <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> NBR 5410:2004 (Baixa Tensão)</li>
                        <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> IT 41 / CBMG (Incêndio Garagens)</li>
                     </ul>
                  </div>
               </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(1)} className="px-8 py-4 text-slate-500 font-bold flex items-center gap-2 hover:underline transition-all">
                <ChevronLeft className="w-5 h-5" /> Voltar
              </button>
              <button onClick={handleCalculate} className="px-10 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-2xl font-black flex items-center gap-3 shadow-xl hover:-translate-y-1 transition-all active:scale-95">
                <Zap className="w-6 h-6" /> Gerar Dimensionamento
              </button>
            </div>
          </div>
        )}

        {step === 3 && cemigResult && sizingResult && (
          <div className="p-8 space-y-10 animate-in fade-in duration-700">
             <div className="flex items-start justify-between border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#00BFA5] rounded-full flex items-center justify-center text-white shadow-lg">
                     <CheckCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Relatório Gerado com Sucesso</h2>
                </div>
                <p className="text-sm text-slate-500 font-medium">Os parâmetros atendem às normas técnicas brasileiras vigentes.</p>
              </div>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-50 transition-all no-print shadow-sm active:bg-slate-100">
                <FileText className="w-5 h-5" /> Visualizar Laudo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-6 rounded-[2rem] bg-[#1E3A8A]/5 border-2 border-[#1E3A8A]/10 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Padrão CEMIG</p>
                  <p className="text-xl font-black text-[#1E3A8A]">Tipo {cemigResult.tipoUC}</p>
                  <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">{cemigResult.padraoEntrada}</p>
               </div>
               <div className="p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Demanda Calculada</p>
                  <p className="text-xl font-black text-slate-700">{cemigResult.demandaKVA} kVA</p>
                  <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">{cemigResult.demandaFaixa}</p>
               </div>
               <div className="p-6 rounded-[2rem] bg-[#00BFA5]/5 border-2 border-[#00BFA5]/10 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Corrente Circuito</p>
                  <p className="text-xl font-black text-[#00BFA5]">{sizingResult.current} A</p>
                  <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Ib - Secundário</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-[#0A192F] text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                    <Zap className="w-6 h-6 text-[#00BFA5]" />
                    <h3 className="font-[900] uppercase tracking-tight">Circuitos e Condutores</h3>
                  </div>
                  
                  <div className="space-y-8 relative z-10">
                    {sizingResult.primary && (
                      <div className="animate-in slide-in-from-left duration-500">
                        <p className="text-[10px] font-[900] text-[#00BFA5] uppercase tracking-[0.2em] mb-4">Lado Primário (Rede → Transfo)</p>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                             <p className="text-[9px] opacity-50 uppercase font-black mb-1">Bitola Cabo</p>
                             <p className="font-black text-xl">{sizingResult.primary.cableGauge} mm²</p>
                           </div>
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                             <p className="text-[9px] opacity-50 uppercase font-black mb-1">Disjuntor</p>
                             <p className="font-black text-xl">{sizingResult.primary.breaker} A</p>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="animate-in slide-in-from-left duration-700 delay-200">
                      <p className="text-[10px] font-[900] text-[#00BFA5] uppercase tracking-[0.2em] mb-4">
                        {hasTransformer ? "Lado Secundário (Transfo → Carregador)" : "Circuito de Força Único"}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase font-black mb-1">Bitola Cabo</p>
                           <p className="font-black text-xl">{sizingResult.cableGauge} mm²</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase font-black mb-1">Disjuntor</p>
                           <p className="font-black text-xl">{sizingResult.breaker} A</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase font-black mb-1">Queda Tensão</p>
                           <p className={`font-black text-xl ${sizingResult.voltageDrop > 4 ? "text-red-400" : "text-green-400"}`}>{sizingResult.voltageDrop}%</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[9px] opacity-50 uppercase font-black mb-1">Infraestrutura</p>
                           <p className="font-black text-xs leading-tight mt-1 uppercase">{sizingResult.conduitSize}</p>
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-[-30px] bottom-[-30px] w-64 h-64 bg-[#00BFA5] rounded-full opacity-[0.03] pointer-events-none"></div>
               </div>

                  <div className="space-y-6">
                   {/* Modelagem do Painel do Carregador (Trilho DIN) */}
                   <VisualPanelModel 
                     phases={chargers[0].phases}
                     breakerAmperes={sizingResult.breaker}
                     idrType={sizingResult.idrType}
                     dpsType={sizingResult.dpsType}
                     hasEmergencyButton={hasEmergencyButton5m}
                   />

                   <div className="p-8 border-2 border-red-50 rounded-[2.5rem] bg-red-50/20">
                      <div className="flex items-center gap-3 mb-4 text-red-600">
                         <AlertTriangle className="w-5 h-5" />
                         <h3 className="font-black uppercase tracking-tight">Segurança Bombeiros (AVCB)</h3>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase">
                         {sizingResult.fireExtinguisher} <br/>
                         {sizingResult.emergencyButton}
                      </p>
                   </div>
                </div>
             </div>

             {/* COMPARISONS AND DEMAND WARNINGS */}
             {sizingResult.isCurrentLimited && (
               <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-3xl flex items-start gap-3">
                 <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="font-black text-orange-800 text-sm uppercase">Carga Limitada por Controle de Demanda</h4>
                   <p className="text-xs text-orange-700 mt-1 font-semibold leading-relaxed">
                     A potência nominal do carregador ({sizingResult.originalPowerkW} kW) excedia a capacidade de energia disponível no padrão. O sistema reduziu a potência ativa de carregamento de forma inteligente para <span className="font-black">{sizingResult.limitedPowerkW.toFixed(1)} kW</span> (corrente de carregamento limitada de {sizingResult.originalCurrent.toFixed(1)}A para <span className="font-black">{sizingResult.limitedCurrent.toFixed(1)}A</span>) para evitar que o disjuntor geral do prédio caia.
                   </p>
                 </div>
               </div>
             )}

             {/* Comparação do Padrão de Entrada Existente vs. Proposto */}
             <div className="p-8 border-2 border-slate-200 rounded-[2.5rem] bg-slate-50/30 space-y-4">
               <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-wider">
                 Comparação de Padrão de Entrada Existente vs. Requerido
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="p-4 bg-white rounded-2xl border border-slate-200">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Padrão de Entrada Existente</p>
                   <p className="font-bold text-slate-800 text-sm">Fases: {existingEntrancePhases}F</p>
                   <p className="font-bold text-slate-800 text-sm">Disjuntor Geral: {existingEntranceBreaker}A</p>
                   <p className="font-bold text-slate-800 text-sm">Cabo de Entrada: {existingEntranceCable} mm²</p>
                   {existingEntranceCategory && <p className="font-bold text-slate-800 text-sm">Categoria/Tipo: {existingEntranceCategory}</p>}
                 </div>
                 <div className="p-4 bg-white rounded-2xl border border-[#00BFA5]/30 bg-[#00BFA5]/5">
                   <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-wider mb-2">Padrão Requerido (Dimensionado)</p>
                   <p className="font-bold text-slate-800 text-sm">Concessionária: {utility}</p>
                   <p className="font-bold text-slate-800 text-sm">Categoria Proposta: Tipo {cemigResult.tipoUC}</p>
                   <p className="font-bold text-slate-800 text-sm">Disjuntor Recomendado: {cemigResult.tipoUC === 'MT' ? 'Subestação MT' : (cemigResult.tipoUC === 'F' ? '400A' : (cemigResult.tipoUC === 'C' ? '100A' : (cemigResult.tipoUC === 'B' ? '63A' : '40A')))}</p>
                   <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{cemigResult.padraoDesc}</p>
                 </div>
               </div>
               <div className="mt-2 p-4 rounded-2xl text-xs font-bold leading-relaxed border flex items-start gap-2 bg-white">
                 {Number(existingEntranceBreaker) >= (cemigResult.tipoUC === 'C' ? 63 : (cemigResult.tipoUC === 'B' ? 50 : 40)) ? (
                   <>
                     <Check className="w-5 h-5 text-green-500 shrink-0" />
                     <span className="text-green-700 font-semibold">
                       O padrão de entrada existente de {existingEntranceBreaker}A parece adequado para suportar a nova demanda dimensionada de {cemigResult.demandaKVA.toFixed(1)} kVA. Não é necessária a reforma imediata do padrão.
                     </span>
                   </>
                 ) : (
                   <>
                     <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                     <span className="text-red-700 font-semibold">
                       ATENÇÃO: O padrão de entrada existente de {existingEntranceBreaker}A é INSUFICIENTE para a nova demanda dimensionada de {cemigResult.demandaKVA.toFixed(1)} kVA. Recomendamos solicitar aumento de carga para a concessionária {utility} e reformar o padrão.
                     </span>
                   </>
                 )}
                </div>
              </div>

            {/* Painel de CAPEX e BOM */}
            <div className="p-8 border-2 border-emerald-100 rounded-[2.5rem] bg-emerald-50/10 shadow-sm space-y-6">
               <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md">
                        <FileText className="w-5 h-5" />
                     </div>
                     <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Orçamento Estimativo de Instalação (CAPEX)</h3>
                        <p className="text-xs text-slate-500 font-medium">Preços de referência comercial de mercado.</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Custo Total Estimativo</p>
                     <p className="text-2xl font-black text-emerald-600">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sizingResult.totalCost || 0)}
                     </p>
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                     <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                           <th className="pb-3">Cód</th>
                           <th className="pb-3">Descrição Técnica</th>
                           <th className="pb-3 text-center">Qtd</th>
                           <th className="pb-3">Unidade</th>
                           <th className="pb-3 text-right">Preço Unit.</th>
                           <th className="pb-3 text-right">Total</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                        {sizingResult.bom?.map((item: any, idx: number) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-3 font-mono text-slate-400 text-[10px]">{item.code}</td>
                              <td className="py-3 pr-4 text-slate-800">{item.description}</td>
                              <td className="py-3 text-center">{item.quantity}</td>
                              <td className="py-3 uppercase text-slate-400">{item.unit}</td>
                              <td className="py-3 text-right">
                                 {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.unitPrice)}
                              </td>
                              <td className="py-3 text-right text-slate-900">
                                 {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.totalPrice)}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               <p className="text-[9px] text-slate-400 font-medium italic">*Nota: Os valores acima são estimativos de insumos elétricos e condutores de cobre baseados em médias de mercado. Não inclui frete ou mão de obra de instalação especializada.</p>
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-2xl">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1E3A8A]/10 rounded-lg flex items-center justify-center text-[#1E3A8A]">
                     <FileText className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-xs font-black text-slate-800">Enviar para o Módulo de CAPEX/Orçamentos</p>
                     <p className="text-[10px] text-slate-500 font-medium">Cria automaticamente um projeto de cotação com a lista de materiais gerada.</p>
                  </div>
               </div>
               <label className="relative inline-flex items-center cursor-pointer scale-110">
                  <input type="checkbox" className="sr-only peer" checked={createCapexProject} onChange={e => setCreateCapexProject(e.target.checked)} />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
               </label>
            </div>

            <div className="flex justify-between pt-10 border-t border-slate-100">
               <button onClick={() => setStep(2)} className="px-8 py-4 text-slate-500 font-bold hover:underline transition-all">Ajustar Parâmetros</button>
               <button onClick={handleSave} disabled={saving} className="px-12 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-2xl font-black shadow-2xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95">
                 {saving ? <Loader className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                 {saving ? "Processando..." : "Confirmar e Salvar Projeto"}
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Assistente de Concessionárias Modal */}
      {assistantOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[999] p-4 font-['Montserrat',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#1E3A8A] text-white p-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#00BFA5]" />
                <h3 className="font-black uppercase tracking-wider text-sm">Assistente de Concessionárias do Brasil</h3>
              </div>
              <button 
                onClick={() => setAssistantOpen(false)} 
                className="text-white hover:opacity-80 border-none bg-transparent cursor-pointer font-bold text-xs"
              >
                FECHAR
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className={labelCls}>Escolha a Concessionária</label>
                <select 
                  className={inputCls} 
                  value={selectedAssistantUtility} 
                  onChange={e => setSelectedAssistantUtility(e.target.value)}
                >
                  {Object.keys(UTILITY_DATABASE).map(u => (
                    <option key={u} value={u}>{UTILITY_DATABASE[u].fullName} ({UTILITY_DATABASE[u].region})</option>
                  ))}
                </select>
              </div>
              
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-black text-slate-850 text-xs uppercase text-[#1E3A8A]">
                  {UTILITY_DATABASE[selectedAssistantUtility].fullName}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600 pt-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Região de Atendimento</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].region}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Tensões Disponíveis</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].tensions}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Limite de Baixa Tensão (BT)</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].maxBTLimitKW} kW</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Norma Técnica Base</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].standardsDocName}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tabela de Padrão de Entrada BT</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[8px] tracking-wider border-b border-slate-200">
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Fases</th>
                        <th className="p-3">Limite Carga</th>
                        <th className="p-3">Disjuntor Geral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                      {UTILITY_DATABASE[selectedAssistantUtility].categories.map(cat => (
                        <tr key={cat.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900">{cat.id}</td>
                          <td className="p-3">{cat.phases === 1 ? 'Monofásico' : (cat.phases === 2 ? 'Bifásico' : 'Trifásico')}</td>
                          <td className="p-3">{cat.limitKW} kW</td>
                          <td className="p-3 text-[#1E3A8A]">{cat.breakerA} A</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  setUtility(selectedAssistantUtility);
                  setAssistantOpen(false);
                }} 
                className="px-6 py-2.5 bg-[#00BFA5] text-white font-black rounded-xl text-xs hover:scale-102 transition-all border-none cursor-pointer"
              >
                SELECIONAR CONCESSIONÁRIA E APLICAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
