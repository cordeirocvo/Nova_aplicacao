"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, ChevronRight, ChevronLeft, Check, AlertTriangle,
  Info, Shield, Loader2, Plus, Trash2, FileText, ExternalLink,
  BatteryCharging, Building2, MapPin, CheckCircle2
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

  // Etapa 2 — parâmetros elétricos (NBR 5410)
  const [distance, setDistance] = useState(20);
  const [method, setMethod] = useState<"B1" | "C">("B1");

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

    // Calcular dimensionamento elétrico do maior carregador (NBR 5410)
    const biggest = [...chargers].sort((a, b) => b.powerKW - a.powerKW)[0];
    const sResult = calculateSizing({
      powerkW: biggest.powerKW,
      voltage: biggest.phases === 3 ? 380 : 220,
      phases: biggest.phases,
      distance,
      method: method as any,
    });
    setSizingResult(sResult);

    setStep(3);
  };

  const handleSave = async () => {
    if (!cemigResult || !sizingResult) return;
    setSaving(true);
    try {
      // Salva o maior carregador como base do projeto
      const biggest = [...chargers].sort((a, b) => b.powerKW - a.powerKW)[0];
      // 1. Criar/buscar carregador
      const chargerRes = await fetch("/api/ev/chargers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: "Configuração CEMIG",
          model: projectName,
          power: cemigResult.totalChargersKW,
          voltage: biggest.phases === 3 ? 380 : 220,
          phases: biggest.phases,
          current: sizingResult.current,
        }),
      });
      const { charger } = await chargerRes.json();

      // 2. Salvar projeto de dimensionamento
      await fetch("/api/ev/sizing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          clientName,
          utility: "CEMIG",
          entranceCategory: cemigResult.tipoUC,
          distance,
          installationMethod: method,
          chargerId: charger.id,
          calculatedCurrent: sizingResult.current,
          calculatedCableGauge: sizingResult.cableGauge,
          calculatedBreaker: sizingResult.breaker,
          calculatedDR: sizingResult.drType,
          calculatedConduit: sizingResult.conduitSize,
          voltageDrop: sizingResult.voltageDrop,
          groundingAnalysis: "TT (haste de aço cobreado, resistência ≤ 100Ω)",
          isServiceEntranceOk: cemigResult.tipoUC !== "MT",
          analysisNotes: `${cemigResult.padraoEntrada} | ${cemigResult.ramalTipo} | ${cemigResult.demandaFaixa}`,
        }),
      });

      router.push("/carregamento");
    } catch {
      alert("Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Render ────────────────────────────────────────────────────────────── */
  const steps = [
    { n: 1, label: "Instalação & Carregadores" },
    { n: 2, label: "Parâmetros Elétricos" },
    { n: 3, label: "Laudo CEMIG" },
  ];

  const totalKW = chargers.reduce((s, c) => s + c.powerKW * c.quantity, 0) + existingLoadKW;
  const canGoStep2 = projectName.trim() && chargers.length > 0;
  const canCalc = distance > 0;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Título */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800">Novo Dimensionamento</h1>
        <p className="text-slate-500 mt-1 text-sm">Conforme CEMIG ND-5.1 (NOV/2024) + NBR 5410 + REN 1000/2021</p>
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

        {/* ── STEP 1 ──────────────────────────────────────────────────────── */}
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
                  <input type="text" className={inputCls} placeholder="Ex: Posto Beija-Flor — 4 carregadores" value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Cliente</label>
                  <input type="text" className={inputCls} placeholder="Nome do cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Tipo de Edificação</label>
                  <select className={inputCls} value={isCollective ? "coletiva" : "individual"} onChange={e => setIsCollective(e.target.value === "coletiva")}>
                    <option value="individual">Individual (residência, comércio único)</option>
                    <option value="coletiva">Coletiva (condomínio, shopping, posto)</option>
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

            {/* Cargas Existentes */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Zap className="w-5 h-5 text-[#1E3A8A]" />
                <h2 className="text-lg font-bold text-slate-800">Cargas Existentes e Simultaneidade</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Carga instalada existente (kW) — sem os carregadores</label>
                  <input type="number" min={0} step={0.5} className={inputCls} value={existingLoadKW} onChange={e => setExistingLoadKW(parseFloat(e.target.value) || 0)} />
                  <p className="text-[11px] text-slate-400 mt-1">Soma de todas as cargas já existentes no imóvel (iluminação, tomadas, ar-cond., etc.)</p>
                </div>
                <div>
                  <label className={labelCls}>Fator de Simultaneidade ({Math.round(simultaneityFactor * 100)}%)</label>
                  <input type="range" min={0.3} max={1} step={0.05} className="w-full mt-2" value={simultaneityFactor} onChange={e => setSimultaneityFactor(parseFloat(e.target.value))} />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>30% — Poucos simultâneos</span>
                    <span>100% — Todos juntos</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Para postos com gestão de carga (OCPP/smart), usar 50–70%. Sem gestão: 80–100%.</p>
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
                <button onClick={addCharger} className="flex items-center gap-1.5 text-sm font-bold text-[#00BFA5] hover:text-[#00a892] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#00BFA5]/10">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              <div className="space-y-4">
                {chargers.map((c, i) => (
                  <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-400 uppercase">Carregador {i + 1}</span>
                      {chargers.length > 1 && (
                        <button onClick={() => removeCharger(i)} className="text-red-400 hover:text-red-600 p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Preset Selector */}
                    <div className="mb-3">
                      <label className={labelCls}>Selecionar por tipo</label>
                      <select
                        className={inputCls}
                        onChange={e => {
                          const p = CHARGER_PRESETS[parseInt(e.target.value)];
                          if (p) applyPreset(i, p);
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>— Selecione um padrão de carregador —</option>
                        {CHARGER_PRESETS.map((p, pi) => (
                          <option key={pi} value={pi}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className={labelCls}>Potência (kW)</label>
                        <input type="number" min={1} step={0.5} className={inputCls} value={c.powerKW} onChange={e => updateCharger(i, "powerKW", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className={labelCls}>Quantidade</label>
                        <input type="number" min={1} max={100} className={inputCls} value={c.quantity} onChange={e => updateCharger(i, "quantity", parseInt(e.target.value) || 1)} />
                      </div>
                      <div>
                        <label className={labelCls}>Fases</label>
                        <select className={inputCls} value={c.phases} onChange={e => updateCharger(i, "phases", parseInt(e.target.value))}>
                          <option value={1}>Monofásico (1F)</option>
                          <option value={3}>Trifásico (3F)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Tipo</label>
                        <select className={inputCls} value={c.chargerType} onChange={e => updateCharger(i, "chargerType", e.target.value)}>
                          <option value="AC">AC (Wallbox)</option>
                          <option value="DC">DC (Rápido/DCFC)</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Subtotal: <strong>{(c.powerKW * c.quantity).toFixed(1)} kW</strong>
                      {c.chargerType === "DC" && c.powerKW >= 22 && (
                        <span className="ml-2 text-orange-500 font-bold">⚠ Pode ser carga perturbadora (harmônicos)</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              {/* Resumo */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#1E3A8A]/5 to-[#00BFA5]/5 border border-[#1E3A8A]/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Carga Total Estimada</p>
                  <p className="text-2xl font-black text-[#1E3A8A]">{totalKW.toFixed(1)} <span className="text-sm font-medium">kW instalado</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase">Apenas Carregadores</p>
                  <p className="text-lg font-black text-[#00BFA5]">{chargers.reduce((s, c) => s + c.powerKW * c.quantity, 0).toFixed(1)} kW</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button disabled={!canGoStep2} onClick={() => setStep(2)} className="px-8 py-3 bg-[#1E3A8A] text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-40 hover:bg-[#1e3470] transition-all shadow-lg">
                Próximo <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ──────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
              <MapPin className="w-5 h-5 text-[#00BFA5]" />
              <h2 className="text-lg font-bold text-slate-800">Parâmetros Elétricos (NBR 5410)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Distância do Quadro de Distribuição até o Carregador (m)</label>
                <input type="number" min={1} step={1} className={inputCls} value={distance} onChange={e => setDistance(parseInt(e.target.value) || 1)} />
                <p className="text-[11px] text-slate-400 mt-1">Comprimento total do percurso do cabo (fase + neutro).</p>
              </div>
              <div>
                <label className={labelCls}>Método de Instalação — NBR 5410 Tabela 36</label>
                <select className={inputCls} value={method} onChange={e => setMethod(e.target.value as any)}>
                  <option value="B1">B1 — Eletroduto embutido em parede/laje</option>
                  <option value="C">C — Cabo fixado em parede/eletrocalha (melhor)</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-bold mb-1">Critérios de dimensionamento (NBR 5410 / NBR 17019)</p>
                <ul className="space-y-1 list-disc list-inside text-blue-600 text-xs">
                  <li>Corrente admissível (Iz ≥ 1,25 × Ib — carga contínua)</li>
                  <li>Queda de tensão máxima 4% (iluminação e força)</li>
                  <li>Coordenação com disjuntor: Ib ≤ In ≤ Iz</li>
                  <li>Proteção DR obrigatória para EV: Tipo A ou B, 30mA + detecção 6mA DC</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-8 py-3 text-slate-500 font-bold flex items-center gap-2 hover:underline">
                <ChevronLeft className="w-5 h-5" /> Voltar
              </button>
              <button disabled={!canCalc} onClick={handleCalculate} className="px-8 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-40 hover:opacity-90 transition-all">
                <Zap className="w-5 h-5" /> Gerar Laudo CEMIG
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ──────────────────────────────────────────────────────── */}
        {step === 3 && cemigResult && sizingResult && (
          <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header resultado */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-6 h-6 text-[#00BFA5]" />
                  <h2 className="text-2xl font-black text-slate-800">Laudo Técnico — CEMIG ND-5.1</h2>
                </div>
                <p className="text-sm text-slate-500">{projectName} {clientName && `— ${clientName}`}</p>
              </div>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                <FileText className="w-4 h-4" /> Imprimir
              </button>
            </div>

            {/* Classificação CEMIG */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl border-2 ${cemigResult.tipoUC === "MT" ? "border-red-300 bg-red-50" : "border-[#1E3A8A]/20 bg-[#1E3A8A]/5"}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de UC / Padrão de Entrada</p>
                <p className={`text-xl font-black ${cemigResult.tipoUC === "MT" ? "text-red-700" : "text-[#1E3A8A]"}`}>{cemigResult.tipoUC === "MT" ? "⚡ Média Tensão" : `Tipo ${cemigResult.tipoUC}`}</p>
                <p className="text-xs text-slate-600 mt-1">{cemigResult.tipoUCDesc}</p>
              </div>
              <div className={`p-5 rounded-2xl border-2 ${cemigResult.ramalTipo === "Subterrâneo" ? "border-amber-300 bg-amber-50" : cemigResult.ramalTipo === "MT" ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ramal de Conexão</p>
                <p className="text-xl font-black text-slate-800">{cemigResult.ramalTipo}</p>
                {cemigResult.caixaInspecao && (
                  <p className="text-xs font-bold text-amber-700 mt-1">Caixa de inspeção: {cemigResult.caixaInspecao}</p>
                )}
              </div>
              <div className="p-5 rounded-2xl border-2 border-[#00BFA5]/20 bg-[#00BFA5]/5">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Demanda Calculada</p>
                <p className="text-xl font-black text-[#00BFA5]">{cemigResult.demandaKVA} <span className="text-sm">kVA</span></p>
                <p className="text-xs text-slate-600 mt-1">{cemigResult.demandaFaixa}</p>
              </div>
            </div>

            {/* Grid: NBR 5410 + CEMIG */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NBR 5410 */}
              <div className="bg-[#0A192F] text-white p-6 rounded-3xl">
                <div className="flex items-center gap-2 mb-5 border-b border-white/10 pb-3">
                  <Zap className="w-5 h-5 text-[#00BFA5]" />
                  <h3 className="font-bold">Dimensionamento NBR 5410</h3>
                  <span className="text-[10px] opacity-50 ml-auto">Maior carregador</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Bitola do Cabo", value: `${sizingResult.cableGauge} mm²`, color: "text-[#00BFA5]" },
                    { label: "Disjuntor", value: `${sizingResult.breaker} A`, color: "text-[#00BFA5]" },
                    { label: "Queda de Tensão", value: `${sizingResult.voltageDrop}%`, color: sizingResult.voltageDrop > 4 ? "text-red-400" : "text-green-400" },
                    { label: "Eletroduto", value: sizingResult.conduitSize, color: "text-white" },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[10px] opacity-50 uppercase mb-1">{item.label}</p>
                      <p className={`font-black text-lg ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[10px] opacity-50 uppercase mb-1">Proteção DR (NBR 17019)</p>
                  <p className="text-xs font-bold text-[#00BFA5]">{sizingResult.drType}</p>
                </div>
              </div>

              {/* CEMIG Padrão */}
              <div className="space-y-4">
                <div className="p-5 border border-slate-200 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-[#1E3A8A]" />
                    <h3 className="font-bold text-slate-800">Padrão de Entrada CEMIG</h3>
                  </div>
                  <p className="font-black text-[#1E3A8A] text-base">{cemigResult.padraoEntrada}</p>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{cemigResult.padraoDesc}</p>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Norma Aplicável</p>
                  <p className="font-bold text-slate-700 text-sm">{cemigResult.normaAplicavel}</p>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{cemigResult.ramalDesc}</p>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {cemigResult.alertas.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Alertas Técnicos</h3>
                {cemigResult.alertas.map((a, i) => (
                  <div key={i} className={`p-4 rounded-2xl flex gap-3 border ${
                    a.nivel === "critico" ? "bg-red-50 border-red-200" :
                    a.nivel === "atencao" ? "bg-amber-50 border-amber-200" :
                    "bg-blue-50 border-blue-100"
                  }`}>
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                      a.nivel === "critico" ? "text-red-500" :
                      a.nivel === "atencao" ? "text-amber-500" : "text-blue-400"
                    }`} />
                    <div>
                      <p className={`font-bold text-sm ${
                        a.nivel === "critico" ? "text-red-800" :
                        a.nivel === "atencao" ? "text-amber-800" : "text-blue-800"
                      }`}>{a.titulo}</p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${
                        a.nivel === "critico" ? "text-red-700" :
                        a.nivel === "atencao" ? "text-amber-700" : "text-blue-700"
                      }`}>{a.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ações Obrigatórias */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Ações Obrigatórias (fluxo CEMIG)</h3>
              {cemigResult.acoes.map((a, i) => (
                <div key={i} className={`p-4 rounded-2xl border flex gap-3 ${
                  a.tipo === "obrigatoria" ? "bg-slate-50 border-slate-200" :
                  a.tipo === "warning" ? "bg-orange-50 border-orange-200" :
                  "bg-green-50 border-green-100"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${
                    a.tipo === "obrigatoria" ? "bg-[#1E3A8A] text-white" :
                    a.tipo === "warning" ? "bg-orange-500 text-white" : "bg-green-500 text-white"
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{a.titulo}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{a.descricao}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{a.referencia}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Links Normas */}
            <div className="border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-black text-slate-400 uppercase mb-3">Documentos CEMIG Aplicáveis</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "ND-5.1", url: CEMIG_DOCS.nd51 },
                  { label: "ND-5.2", url: CEMIG_DOCS.nd52 },
                  { label: "ND-5.3", url: CEMIG_DOCS.nd53 },
                  { label: "ND-5.30", url: CEMIG_DOCS.nd530 },
                  { label: "ED-5.58 (Perturbadoras)", url: CEMIG_DOCS.ed558 },
                  { label: "PEC-11", url: CEMIG_DOCS.pec11 },
                  { label: "Formulário APR Web", url: CEMIG_DOCS.aprWeb },
                ].map(doc => (
                  <a key={doc.label} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-[#1E3A8A] bg-[#1E3A8A]/5 hover:bg-[#1E3A8A]/10 px-3 py-1.5 rounded-full transition-colors">
                    <ExternalLink className="w-3 h-3" /> {doc.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(2)} className="px-6 py-3 text-slate-500 font-bold hover:underline flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Recalcular
              </button>
              <button onClick={handleSave} disabled={saving} className="px-10 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl font-black shadow-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {saving ? "Salvando..." : "Salvar Projeto"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
