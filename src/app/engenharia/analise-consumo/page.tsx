"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Upload, FileText, BarChart3, AlertTriangle, CheckCircle2,
  Info, Sun, Zap, Loader2, Plus, Settings2, ChevronDown, ExternalLink, Edit3, Save
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const MESES_PTBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5";
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] text-sm transition-all";

/* ─── Manual Form ────────────────────────────────────────────────────────── */
type MesConsumo = { mes: string; kwh: number; injetadoKWh: number; bandeira: string };

function initialMeses(): MesConsumo[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, kwh: 0, injetadoKWh: 0, bandeira: "Verde" };
  });
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function AnaliseConsumoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  const [tab, setTab] = useState<"fatura" | "massa" | "manual">("fatura");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fatura state
  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [faturaResult, setFaturaResult] = useState<any>(null);
  const [faturaError, setFaturaError] = useState("");

  // Massa state
  const [massaFiles, setMassaFiles] = useState<File[]>([]);
  const [massaResult, setMassaResult] = useState<any>(null);
  const [postoConfig, setPostoConfig] = useState({ hp_inicio: "18:00", hp_fim: "21:00", hfp_inicio: "21:01", hfp_fim: "17:59", hr_inicio: "", hr_fim: "" });

  // Manual state
  const [manualForm, setManualForm] = useState({
    concessionaria: "CEMIG-D", grupoTarifario: "B", subgrupo: "B3",
    modalidadeTarifaria: "CONVENCIONAL", classeConsumo: "Comercial/Serviços",
    demandaContratadaKW: 0, tusd: 0, te: 0, tarifaHP: 0, tarifaHFP: 0,
    tarifaDemandaHP: 0,
  });
  const [meses, setMeses] = useState<MesConsumo[]>(initialMeses());
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);

  // Fetch existing data
  useEffect(() => {
    if (!projetoId) return;
    fetch(`/api/engenharia/fatura?projetoId=${projetoId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFaturaResult({ analise: d }); });
  }, [projetoId]);

  const buscarTarifasANEEL = useCallback(async () => {
    setLoadingTarifas(true);
    const params = new URLSearchParams({ distribuidora: manualForm.concessionaria, subgrupo: manualForm.subgrupo });
    const r = await fetch(`/api/engenharia/tarifas?${params}`);
    const d = await r.json();
    setTarifas(d.tarifas || []);
    setLoadingTarifas(false);
  }, [manualForm.concessionaria, manualForm.subgrupo]);

  /* ── Upload Fatura ─────────────────────────────────────────────────────── */
  const handleFaturaUpload = async () => {
    if (!faturaFile || !projetoId) { setFaturaError("Selecione um arquivo e um projeto."); return; }
    setLoading(true); setFaturaError("");
    const fd = new FormData();
    fd.append("file", faturaFile);
    fd.append("projetoId", projetoId);
    const res = await fetch("/api/engenharia/fatura", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setFaturaError(data.error || "Erro ao processar fatura"); }
    else { setFaturaResult(data); }
    setLoading(false);
  };

  /* ── Upload Massa ──────────────────────────────────────────────────────── */
  const handleMassaUpload = async () => {
    if (massaFiles.length === 0 || !projetoId) return;
    setLoading(true);
    const fd = new FormData();
    massaFiles.forEach(f => fd.append("files", f));
    fd.append("projetoId", projetoId);
    Object.entries(postoConfig).forEach(([k, v]) => v && fd.append(k, v));
    const res = await fetch("/api/engenharia/memoria-massa", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setMassaResult(data);
    setLoading(false);
  };

  /* ── Save Manual ───────────────────────────────────────────────────────── */
  const handleManualSave = async () => {
    if (!projetoId) return;
    setSaving(true);
    await fetch("/api/engenharia/fatura", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projetoId, ...manualForm, consumoMeses: meses }),
    });
    setSaving(false);
  };

  if (!projetoId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Selecione um projeto</h2>
        <p className="text-slate-500 mt-2">Acesse esta página a partir da listagem de projetos de engenharia.</p>
        <button onClick={() => router.push("/engenharia")} className="mt-4 text-[#00BFA5] font-bold hover:underline">← Ir para Projetos</button>
      </div>
    );
  }

  const analise = faturaResult?.analise;
  const consumoMeses: MesConsumo[] = (analise?.consumoMeses as MesConsumo[]) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/engenharia")} className="text-xs text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1">← Projetos</button>
        <h1 className="text-2xl font-black text-slate-800">Análise de Consumo</h1>
        <p className="text-slate-500 text-sm mt-1">Importe a fatura de energia ou memória de massa para análise automática</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
        {([["fatura", "Fatura de Energia", FileText], ["massa", "Memória de Massa", BarChart3], ["manual", "Inserção Manual", Edit3]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === key ? "bg-white shadow-sm text-[#1E3A8A]" : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* FATURA TAB */}
          {tab === "fatura" && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <FileText className="w-5 h-5 text-[#00BFA5]" />
                <h2 className="font-bold text-slate-800">Análise de Fatura PDF</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Envie a fatura CEMIG ou de outra concessionária em PDF. A IA extrai automaticamente: consumo dos 12 meses, grupo tarifário, demanda, tarifas, bandeira e geração distribuída.
              </p>

              <div
                className="border-2 border-dashed border-[#00BFA5]/30 rounded-2xl p-6 text-center cursor-pointer hover:bg-[#00BFA5]/5 transition-colors relative"
                onClick={() => document.getElementById('faturaInput')?.click()}
              >
                <Upload className="w-8 h-8 text-[#00BFA5] mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">{faturaFile ? faturaFile.name : "Clique ou arraste o PDF da fatura"}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">PDF, PNG ou JPG — CEMIG, CPFL, CELESC, ENEL...</p>
                <input id="faturaInput" type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                  onChange={e => setFaturaFile(e.target.files?.[0] || null)} />
              </div>

              {faturaError && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {faturaError}
                </div>
              )}

              <button onClick={handleFaturaUpload} disabled={!faturaFile || loading}
                className="w-full py-3 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com IA...</> : <><Zap className="w-4 h-4" /> Analisar Fatura</>}
              </button>

              {analise && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl space-y-2">
                  <p className="text-xs font-black text-green-700 uppercase">Dados Extraídos</p>
                  <p className="text-sm font-bold text-slate-700">{analise.concessionaria || "Concessionária"} — UC {analise.numeroInstalacao || "—"}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span><strong>Grupo:</strong> {analise.grupoTarifario || "—"}{analise.subgrupo ? `/${analise.subgrupo}` : ""}</span>
                    <span><strong>Classe:</strong> {analise.classeConsumo || "—"}</span>
                    <span><strong>Modalidade:</strong> {analise.modalidadeTarifaria || "—"}</span>
                    <span><strong>Consumo médio:</strong> {analise.consumoMedioMensalKWh?.toFixed(0) || "—"} kWh/mês</span>
                    {analise.demandaContratadaKW && <span><strong>Demanda:</strong> {analise.demandaContratadaKW} kW</span>}
                    {analise.temGeracao && <span className="text-green-600 font-bold col-span-2">⚡ GD detectada: {analise.geracaoTipos}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MASSA TAB */}
          {tab === "massa" && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-800">Memória de Massa XLS</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Envie um ou mais arquivos XLS da Memória de Massa CEMIG. O sistema detecta automaticamente o período mais crítico e gera a curva de carga por posto tarifário.
              </p>

              {/* Posto Config */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase mb-2">
                  <Settings2 className="w-3.5 h-3.5" /> Configuração de Postos Tarifários
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[["HP Início", "hp_inicio"], ["HP Fim", "hp_fim"], ["HFP Início", "hfp_inicio"], ["HFP Fim", "hfp_fim"], ["HR Início (opt.)", "hr_inicio"], ["HR Fim (opt.)", "hr_fim"]].map(([label, key]) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <input type="time" className={inputCls} value={(postoConfig as any)[key]} onChange={e => setPostoConfig({ ...postoConfig, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload area */}
              <div
                className="border-2 border-dashed border-amber-300/50 rounded-2xl p-6 text-center cursor-pointer hover:bg-amber-50/50 transition-colors relative"
                onClick={() => document.getElementById('massaInput')?.click()}
              >
                <BarChart3 className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                {massaFiles.length === 0 ? (
                  <p className="text-sm font-medium text-slate-600">Clique para enviar arquivos XLS da Memória de Massa</p>
                ) : (
                  <div className="space-y-1">
                    {massaFiles.map((f, i) => <p key={i} className="text-sm text-amber-700 font-medium">{f.name}</p>)}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1 uppercase">XLS / XLSX — CEMIG (múltiplos arquivos aceitos)</p>
                <input id="massaInput" type="file" accept=".xls,.xlsx" multiple className="hidden"
                  onChange={e => setMassaFiles(Array.from(e.target.files || []))} />
              </div>

              <button onClick={handleMassaUpload} disabled={massaFiles.length === 0 || loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><BarChart3 className="w-4 h-4" /> Processar Memória de Massa</>}
              </button>
            </div>
          )}

          {/* MANUAL TAB */}
          {tab === "manual" && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <Edit3 className="w-5 h-5 text-[#1E3A8A]" />
                <h2 className="font-bold text-slate-800">Entrada Manual</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelCls}>Concessionária</label><input type="text" className={inputCls} value={manualForm.concessionaria} onChange={e => setManualForm({ ...manualForm, concessionaria: e.target.value })} /></div>
                <div><label className={labelCls}>Grupo</label>
                  <select className={inputCls} value={manualForm.grupoTarifario} onChange={e => setManualForm({ ...manualForm, grupoTarifario: e.target.value })}>
                    <option value="A">A (AT/MT)</option><option value="B">B (BT)</option>
                  </select>
                </div>
                <div><label className={labelCls}>Subgrupo</label>
                  <select className={inputCls} value={manualForm.subgrupo} onChange={e => setManualForm({ ...manualForm, subgrupo: e.target.value })}>
                    {manualForm.grupoTarifario === 'A'
                      ? ["A1","A2","A3","A3a","A4","AS"].map(s => <option key={s}>{s}</option>)
                      : ["B1","B2","B3","B4"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className={labelCls}>Modalidade Tarifária</label>
                  <select className={inputCls} value={manualForm.modalidadeTarifaria} onChange={e => setManualForm({ ...manualForm, modalidadeTarifaria: e.target.value })}>
                    <option value="CONVENCIONAL">Convencional (Monômia)</option>
                    <option value="HORARIA_AZUL">Horária Azul</option>
                    <option value="HORARIA_VERDE">Horária Verde</option>
                    <option value="BRANCA">Branca</option>
                  </select>
                </div>
                {manualForm.grupoTarifario === 'A' && (
                  <div className="col-span-2">
                    <label className={labelCls}>Demanda Contratada (kW)</label>
                    <input type="number" className={inputCls} value={manualForm.demandaContratadaKW} onChange={e => setManualForm({ ...manualForm, demandaContratadaKW: parseFloat(e.target.value) || 0 })} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button onClick={buscarTarifasANEEL} disabled={loadingTarifas}
                  className="text-xs font-bold text-[#1E3A8A] border border-[#1E3A8A]/20 bg-[#1E3A8A]/5 hover:bg-[#1E3A8A]/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all">
                  {loadingTarifas ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                  Buscar Tarifas ANEEL
                </button>
                {tarifas.length > 0 && <span className="text-[10px] text-green-600 font-bold">{tarifas.length} tarifas encontradas</span>}
              </div>

              {tarifas.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
                  {tarifas.slice(0, 8).map((t, i) => (
                    <button key={i} onClick={() => setManualForm({ ...manualForm, tusd: t.valorTUSD, te: t.valorTE })}
                      className="w-full text-left text-xs p-2 rounded-lg hover:bg-white transition-colors flex justify-between">
                      <span className="font-medium">{t.postoTarifario} — {t.modalidade}</span>
                      <span className="text-[#1E3A8A] font-bold">TUSD: R${t.valorTUSD?.toFixed(4)} | TE: R${t.valorTE?.toFixed(4)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 12 meses */}
              <div>
                <label className={labelCls}>Consumo dos últimos 12 meses</label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {meses.map((m, i) => (
                    <div key={m.mes} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-xs font-bold text-slate-500">{MESES_PTBR[parseInt(m.mes.split('-')[1]) - 1]}/{m.mes.split('-')[0].slice(2)}</span>
                      <input type="number" className={`${inputCls} col-span-1`} placeholder="kWh" value={m.kwh || ''} onChange={e => {
                        const novo = [...meses]; novo[i] = { ...m, kwh: parseFloat(e.target.value) || 0 }; setMeses(novo);
                      }} />
                      <input type="number" className={`${inputCls} col-span-1`} placeholder="Injetado" value={m.injetadoKWh || ''} onChange={e => {
                        const novo = [...meses]; novo[i] = { ...m, injetadoKWh: parseFloat(e.target.value) || 0 }; setMeses(novo);
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleManualSave} disabled={saving}
                className="w-full py-3 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Dados
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel — charts ────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Classificação tarifária */}
          {(analise || tab === "manual") && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#1E3A8A]" /> Classificação Tarifária (ANEEL REN 1000/2021)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Grupo Tarifário", value: analise?.grupoTarifario || manualForm.grupoTarifario, color: "blue" },
                  { label: "Subgrupo", value: analise?.subgrupo || manualForm.subgrupo, color: "indigo" },
                  { label: "Modalidade", value: analise?.modalidadeTarifaria || manualForm.modalidadeTarifaria || "—", color: "violet" },
                  { label: "Classe de Consumo", value: analise?.classeConsumo || manualForm.classeConsumo || "—", color: "emerald" },
                  { label: "Bandeira", value: analise?.bandeiraTarifaria || "Verde", color: analise?.bandeiraTarifaria?.includes("Vermelha") ? "red" : "green" },
                  { label: "GD Solar", value: analise?.temGeracao ? "Detectada ✅" : "Não detectada", color: analise?.temGeracao ? "green" : "slate" },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{item.label}</p>
                    <p className="font-bold text-slate-700 text-sm mt-0.5">{item.value || "—"}</p>
                  </div>
                ))}
              </div>

              {/* Regras */}
              {faturaResult?.classificacao?.regras?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {(faturaResult.classificacao.regras as string[]).map((r, i) => (
                    <div key={i} className={`flex gap-2 p-3 rounded-xl text-xs ${r.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Histórico de consumo 12 meses */}
          {consumoMeses.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><Sun className="w-5 h-5 text-amber-500" /> Histórico de Consumo — 12 Meses</h3>
              <p className="text-xs text-slate-400 mb-5">kWh consumido da rede vs. energia injetada (GD)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={consumoMeses.map(m => ({
                  mes: MESES_PTBR[parseInt(m.mes.split('-')[1]) - 1],
                  Consumo: m.kwh,
                  Injetado: m.injetadoKWh || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kWh" />
                  <Tooltip formatter={(v: any) => `${Number(v).toLocaleString('pt-BR')} kWh`} />
                  <Legend />
                  <Bar dataKey="Consumo" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Injetado" fill="#00BFA5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-4 text-sm text-slate-600">
                <span>Média: <strong className="text-[#1E3A8A]">{(consumoMeses.reduce((s, m) => s + m.kwh, 0) / consumoMeses.length).toFixed(0)} kWh/mês</strong></span>
                <span>Anual: <strong className="text-[#1E3A8A]">{consumoMeses.reduce((s, m) => s + m.kwh, 0).toFixed(0)} kWh</strong></span>
                {consumoMeses.some(m => m.injetadoKWh > 0) && (
                  <span className="text-[#00BFA5]">GD injetada: <strong>{consumoMeses.reduce((s, m) => s + (m.injetadoKWh || 0), 0).toFixed(0)} kWh</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Curva de carga — memória de massa */}
          {massaResult?.analise && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Demanda Máx. HP", value: `${massaResult.analise.maxDemandaHP?.toFixed(1)} kW`, color: "red" },
                  { label: "Demanda Máx. HFP", value: `${massaResult.analise.maxDemandaHFP?.toFixed(1)} kW`, color: "blue" },
                  { label: "Pico Absoluto", value: `${massaResult.analise.maxDemandaTotal?.toFixed(1)} kW`, color: "orange" },
                ].map(s => (
                  <div key={s.label} className={`p-4 rounded-2xl border-2 ${s.color === 'red' ? 'bg-red-50 border-red-200' : s.color === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                    <p className="text-[10px] font-black uppercase opacity-60">{s.label}</p>
                    <p className="text-xl font-black mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-bold text-slate-800 mb-1">Curva de Carga Média Diária</h3>
                <p className="text-xs text-slate-400 mb-5">Demanda média (kW) ao longo das 24 horas</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={massaResult.analise.curvaMediaDiaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hora" tick={{ fontSize: 11 }} tickFormatter={h => `${String(h).padStart(2,'0')}h`} />
                    <YAxis tick={{ fontSize: 11 }} unit=" kW" />
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} kW`} labelFormatter={l => `${String(l).padStart(2,'0')}:00`} />
                    <ReferenceLine x={parseInt(postoConfig.hp_inicio)} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "HP", fill: "#ef4444", fontSize: 10 }} />
                    <ReferenceLine x={parseInt(postoConfig.hp_fim)} stroke="#ef4444" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="kw" stroke="#1E3A8A" strokeWidth={2} dot={false} name="Demanda (kW)" />
                  </LineChart>
                </ResponsiveContainer>
                {massaResult.analise.diaCriticoData && (
                  <p className="text-xs text-slate-500 mt-3">
                    📌 Dia crítico: <strong>{new Date(massaResult.analise.diaCriticoData).toLocaleDateString('pt-BR')}</strong> — Pico: <strong className="text-red-600">{massaResult.analise.diaCriticoDemandaKW?.toFixed(1)} kW</strong>
                  </p>
                )}
              </div>

              {/* Resumo mensal */}
              {massaResult.resumoMensal?.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-800 mb-5">Demanda Máxima por Mês (HP vs. HFP)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={massaResult.resumoMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} unit=" kW" />
                      <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)} kW`} />
                      <Legend />
                      <Bar dataKey="maxDemandaHP" name="HP" fill="#ef4444" radius={[3,3,0,0]} />
                      <Bar dataKey="maxDemandaHFP" name="HFP" fill="#1E3A8A" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Placeholder quando não há dados */}
          {!analise && !massaResult && (
            <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] rounded-3xl p-12 text-center text-white">
              <Sun className="w-16 h-16 text-[#00BFA5] mx-auto mb-4 opacity-60" />
              <h3 className="text-xl font-bold mb-2">Nenhum dado de consumo ainda</h3>
              <p className="text-slate-400 text-sm">Envie a fatura em PDF ou a memória de massa XLS para visualizar os gráficos de consumo, curva de carga e classificação tarifária automática.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
