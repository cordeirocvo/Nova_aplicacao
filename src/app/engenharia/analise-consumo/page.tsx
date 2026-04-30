"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Upload, FileText, BarChart3, AlertTriangle, CheckCircle2,
  Info, Sun, Zap, Loader2, Plus, Settings2, ChevronDown, ExternalLink, Edit3, Save, Search, Battery
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

import { Suspense } from "react";

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

function AnaliseConsumoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  const [tab, setTab] = useState<"fatura" | "massa" | "manual">("fatura");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fatura state
  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [faturaResult, setFaturaResult] = useState<any>(null);
  const [faturaError, setFaturaError] = useState("");
  const [faturaPassword, setFaturaPassword] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [tempData, setTempData] = useState<any>(null);

  const [isConfirmingMassa, setIsConfirmingMassa] = useState(false);
  const [tempDataMassa, setTempDataMassa] = useState<any>(null);
  const [massaError, setMassaError] = useState("");

  // Massa state
  const [massaFiles, setMassaFiles] = useState<File[]>([]);
  const [massaResult, setMassaResult] = useState<any>(null);
  const [postoConfig, setPostoConfig] = useState({ hp_inicio: "18:00", hp_fim: "21:00", hfp_inicio: "21:01", hfp_fim: "17:59", hr_inicio: "", hr_fim: "" });

  // Manual state
  const [manualForm, setManualForm] = useState({
    concessionaria: "CEMIG-D", grupoTarifario: "B", subgrupo: "B3",
    modalidadeTarifaria: "CONVENCIONAL", classeConsumo: "Comercial/Serviços",
    demandaContratadaKW: 0, tusd: 0, te: 0, tarifaHP: 0, tarifaHFP: 0,
    tarifaDemandaHP: 0, padraoConexao: "TRIFASICO",
    energiaAtivaHRKWh: 0, descontoIrrigante: 0
  });
  const [manualError, setManualError] = useState("");
  const [meses, setMeses] = useState<MesConsumo[]>(initialMeses());
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);
  const [projeto, setProjeto] = useState<any>(null);

  // Fetch existing data
  useEffect(() => {
    if (!projetoId) return;
    
    // Buscar projeto para saber o tipo
    fetch(`/api/engenharia/projetos/${projetoId}`)
      .then(r => r.json())
      .then(d => setProjeto(d))
      .catch(err => console.error("Erro ao buscar projeto:", err));

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
    if (faturaPassword) fd.append("password", faturaPassword);
    
    try {
      const res = await fetch("/api/engenharia/fatura", { method: "POST", body: fd });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("O servidor falhou com um erro crítico não-JSON. Tente novamente.");
      }

      if (!res.ok) { 
        setFaturaError(data.error || "Erro ao processar fatura"); 
      } else { 
        setTempData(data.extraido); 
        setIsConfirming(true);
      }
    } catch (err: any) {
      setFaturaError(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Upload Massa ──────────────────────────────────────────────────────── */
  const handleMassaUpload = async () => {
    if (massaFiles.length === 0 || !projetoId) return;
    setLoading(true);
    setMassaError("");
    const fd = new FormData();
    massaFiles.forEach(f => fd.append("files", f));
    fd.append("projetoId", projetoId);
    Object.entries(postoConfig).forEach(([k, v]) => v && fd.append(k, v));
    
    try {
      const res = await fetch("/api/engenharia/memoria-massa", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMassaError(data.error || "Erro ao processar memória de massa.");
      } else {
        setTempDataMassa(data.resultado || data.analise); 
        setIsConfirmingMassa(true);
      }
    } catch (err) {
      setMassaError("Falha na conexão com o servidor.");
    }
    setLoading(false);
  };

  /* ── Save Manual ───────────────────────────────────────────────────────── */
  const handleManualSave = async (dataToSave?: any) => {
    if (!projetoId) return;
    setSaving(true);
    const body = dataToSave || { ...manualForm, consumoMeses: meses };
    const res = await fetch("/api/engenharia/fatura", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projetoId, ...body }),
    });
    if (res.ok) {
      const d = await res.json();
      setFaturaResult({ analise: d });
      setIsConfirming(false);
      setSaveSuccess(true);
      setManualError("");
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      const err = await res.json();
      setManualError(err.error || "Erro ao salvar dados");
    }
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

              <div>
                <label className={labelCls}>Senha do PDF (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: 31130 ou CNPJ se protegido"
                  className={inputCls} 
                  value={faturaPassword} 
                  onChange={e => setFaturaPassword(e.target.value)} 
                />
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
                <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase">Dados Extraídos para Análise</h3>
                    </div>
                    <div className="flex gap-2">
                      {analise.rawPdfUrl && (
                         <a href={analise.rawPdfUrl} target="_blank" className="text-[11px] font-bold text-[#1E3A8A] flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                           <ExternalLink className="w-3 h-3" /> Ver Anexo
                         </a>
                      )}
                      <button 
                        onClick={() => {
                          setTempData(analise);
                          setIsConfirming(true);
                        }} 
                        className="text-[11px] font-bold text-slate-600 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                         <Edit3 className="w-3 h-3" /> Editar
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs bg-slate-50">
                      <tbody>
                        {[
                          ["Instalação", analise.numeroInstalacao],
                          ["Vencimento", analise.vencimento],
                          ["Total a Pagar", analise.valorUltimaFatura ? `R$ ${analise.valorUltimaFatura.toFixed(2)}` : null],
                          ["Demanda Medida (kW)", analise.demandaMedidaHFPKW],
                          ["Demanda Contratada (kW)", analise.demandaContratadaKW],
                          ["Energia Reativa (kWh)", analise.energiaAtivaHRKWh],
                          ["Desconto Irrigante", analise.descontoIrrigante ? `R$ ${analise.descontoIrrigante.toFixed(2)}` : null],
                          ["CPF/CNPJ Titular", analise.cnpjCpfTitular],
                          ["Grupo Tarifário", `${analise.grupoTarifario || ""} ${analise.subgrupo ? "/ " + analise.subgrupo : ""}`],
                          ["Consumo Atual (kWh)", analise.consumoMeses?.[0]?.kwh]
                        ].filter(item => item[1] !== undefined && item[1] !== null && item[1] !== "").map(([label, value], i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-emerald-50/50 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-500 w-1/2">{label}</td>
                            <td className="py-2 px-3 font-medium text-slate-800 bg-white">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

              {massaError && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {massaError}
                </div>
              )}
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
                    <option value="BRANCA">Branca</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Padrão de Conexão</label>
                  <select className={inputCls} value={manualForm.padraoConexao} onChange={e => setManualForm({ ...manualForm, padraoConexao: e.target.value })}>
                    <option value="MONOFASICO">Monofásico</option>
                    <option value="BIFASICO">Bifásico</option>
                    <option value="TRIFASICO">Trifásico</option>
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

              {manualForm.grupoTarifario === 'A' && (
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className={labelCls}>Energia Ativa HR (kWh)</label>
                    <input type="number" className={inputCls} value={manualForm.energiaAtivaHRKWh || ''} onChange={e => setManualForm({...manualForm, energiaAtivaHRKWh: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>Desconto Irrigante (R$)</label>
                    <input type="number" className={inputCls} value={manualForm.descontoIrrigante || ''} onChange={e => setManualForm({...manualForm, descontoIrrigante: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              )}

              <button onClick={() => handleManualSave()} disabled={saving}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  saveSuccess ? "bg-emerald-500 text-white" : "bg-[#1E3A8A] text-white"
                }`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
                {saveSuccess ? "Dados Salvos!" : "Salvar Dados"}
              </button>

              {manualError && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {manualError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Confirmation Modal (Fatura) ─────────────────────────────────────────── */}
        {isConfirming && tempData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Settings2 className="w-5 h-5" /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Conferir Dados da Fatura</h2>
                    <p className="text-xs text-slate-400">Verifique se a IA extraiu as informações corretamente</p>
                  </div>
                </div>
                <button onClick={() => setIsConfirming(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>Nome do Cliente</label>
                    <input type="text" className={inputCls} value={tempData.nomeCliente || ""} onChange={e => setTempData({...tempData, nomeCliente: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Endereço</label>
                    <input type="text" className={inputCls} value={tempData.endereco || ""} onChange={e => setTempData({...tempData, endereco: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Concessionária</label>
                    <input type="text" className={inputCls} value={tempData.concessionaria || ""} onChange={e => setTempData({...tempData, concessionaria: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Instalação / UC</label>
                    <input type="text" className={inputCls} value={tempData.numeroInstalacao || ""} onChange={e => setTempData({...tempData, numeroInstalacao: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Subgrupo</label>
                    <input type="text" className={inputCls} value={tempData.subgrupo || ""} onChange={e => setTempData({...tempData, subgrupo: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Modalidade</label>
                    <select className={inputCls} value={tempData.modalidadeTarifaria || ""} onChange={e => setTempData({...tempData, modalidadeTarifaria: e.target.value})}>
                      <option value="CONVENCIONAL">CONVENCIONAL</option>
                      <option value="HORARIA_AZUL">AZUL</option>
                      <option value="HORARIA_VERDE">VERDE</option>
                      <option value="BRANCA">BRANCA</option>
    </select>
  </div>
                  <div>
                    <label className={labelCls}>Mês Referência</label>
                    <input type="text" className={inputCls} placeholder="MMM/YYYY" value={tempData.mesReferencia || ""} onChange={e => setTempData({...tempData, mesReferencia: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Energia Ativa Reativa (HR)</label>
                    <input type="number" className={inputCls} placeholder="kWh" value={tempData.energiaAtivaHRKWh || ""} onChange={e => setTempData({...tempData, energiaAtivaHRKWh: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>Demanda Ativa HFP</label>
                    <input type="number" className={inputCls} placeholder="kW" value={tempData.demandaMedidaHFPKW || ""} onChange={e => setTempData({...tempData, demandaMedidaHFPKW: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>Desconto Irrigante</label>
                    <input type="number" className={inputCls} placeholder="R$" value={tempData.descontoIrrigante || ""} onChange={e => setTempData({...tempData, descontoIrrigante: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Histórico de Consumo (Últimos 12 meses)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tempData.consumoMeses?.map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 w-16">{m.mes}</span>
                        <input type="number" className="flex-1 text-xs font-bold focus:outline-none" value={m.kwh || ""} placeholder="kWh" onChange={e => {
                          const novo = [...tempData.consumoMeses]; 
                          novo[i] = { ...m, kwh: parseFloat(e.target.value) || 0 }; 
                          setTempData({...tempData, consumoMeses: novo});
                        }} />
                        <span className="text-[10px] text-slate-300">kWh</span>
                        <input type="number" className="w-16 text-xs text-[#00BFA5] font-bold focus:outline-none text-right" value={m.injetadoKWh || 0} placeholder="Inj." onChange={e => {
                           const novo = [...tempData.consumoMeses]; 
                           novo[i] = { ...m, injetadoKWh: parseFloat(e.target.value) || 0 }; 
                           setTempData({...tempData, consumoMeses: novo});
                        }} />
                        <span className="text-[10px] text-slate-300">Inj.</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>TUSD (R$/kWh)</label>
                    <input type="number" step="0.0001" className={inputCls} value={tempData.tusd || ""} onChange={e => setTempData({...tempData, tusd: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>TE (R$/kWh)</label>
                    <input type="number" step="0.0001" className={inputCls} value={tempData.te || ""} onChange={e => setTempData({...tempData, te: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>Demanda (kW)</label>
                    <input type="number" className={inputCls} value={tempData.demandaContratadaKW || ""} onChange={e => setTempData({...tempData, demandaContratadaKW: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button onClick={() => setIsConfirming(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Descartar</button>
                <button onClick={() => handleManualSave(tempData)} disabled={saving}
                  className="flex-2 py-3 bg-[#00BFA5] text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 px-8">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Confirmar e Salvar</>}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-3 space-y-6">

          {/* 📊 DASHBOARD DE MEMÓRIA DE MASSA (Corrigido) */}
          {(tempDataMassa || massaResult) && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1E3A8A] text-white rounded-xl shadow-lg shadow-blue-100">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight">Painel de Memória de Massa</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Aba Processada: <span className="text-[#1E3A8A]">{(tempDataMassa || massaResult)?.abaProcessada}</span></p>
                    </div>
                  </div>
                  {tempDataMassa && !massaResult && (
                    <button 
                      onClick={() => { setMassaResult(tempDataMassa); setTempDataMassa(null); }}
                      className="px-6 py-2 bg-[#00BFA5] text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-[#00a690] transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirmar Importação
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-8">
                  {/* Métricas Principais Ampliadas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Maior Demanda (Pico)</p>
                      <p className="text-3xl font-black text-[#1E3A8A]">{(tempDataMassa || massaResult)?.maxDemandaTotal?.toFixed(2)} <span className="text-sm font-normal text-slate-400">kW</span></p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">🗓️ {(tempDataMassa || massaResult)?.maxDemandaTotalData ? new Date((tempDataMassa || massaResult).maxDemandaTotalData).toLocaleString('pt-BR') : '—'}</p>
                    </div>
                    <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Consumo Total Período</p>
                      <p className="text-3xl font-black text-[#00BFA5]">{(tempDataMassa || massaResult)?.consumoTotal?.toFixed(4)} <span className="text-sm font-normal text-slate-400">kWh</span></p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">⚡ Total somado HP + HFP + HR</p>
                    </div>
                    <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Média Dia Crítico</p>
                      <p className="text-3xl font-black text-amber-700">{(tempDataMassa || massaResult)?.mediaDiaCritico?.toFixed(3)} <span className="text-sm font-normal text-amber-400">kW</span></p>
                      <p className="text-[10px] text-amber-400 mt-1 font-bold">⚠️ Data: {(tempDataMassa || massaResult)?.diaCriticoData ? new Date((tempDataMassa || massaResult).diaCriticoData).toLocaleDateString('pt-BR') : '—'}</p>
                    </div>
                  </div>

                  {/* Curva de Demanda Ampliada */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Curva de Carga Diária (Dia Crítico)</h4>
                      <div className="px-3 py-1 bg-[#1E3A8A]/10 text-[#1E3A8A] rounded-full text-[10px] font-black">KW (DEMANDA)</div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={(tempDataMassa || massaResult)?.diaCriticoCurva}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="hora" tick={{ fontSize: 11, fontWeight: 'bold' }} tickFormatter={h => `${h}h`} />
                        <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} unit=" kW" />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          formatter={(v: any) => [`${Number(v).toFixed(3)} kW`, "Demanda"]}
                        />
                        <Line type="monotone" dataKey="kw" stroke="#1E3A8A" strokeWidth={5} dot={{ r: 5, fill: '#1E3A8A' }} activeDot={{ r: 9 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Consumo Horário Ampliado */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Distribuição de Consumo por Posto</h4>
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black">KWH (CONSUMO)</div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={(tempDataMassa || massaResult)?.diaCriticoCurva?.map((d: any) => ({
                        ...d,
                        kwhHP: d.posto === 'HP' ? d.kwh : 0,
                        kwhHFP: d.posto === 'HFP' ? d.kwh : 0,
                        kwhHR: d.posto === 'HR' ? d.kwh : 0,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="hora" tick={{ fontSize: 11, fontWeight: 'bold' }} tickFormatter={h => `${h}h`} />
                        <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} unit=" kWh" />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          formatter={(v: any, name: any) => [`${Number(v).toFixed(4)} kWh`, name === 'kwhHP' ? 'Ponta' : name === 'kwhHFP' ? 'Fora Ponta' : 'Reservado']}
                        />
                        <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="kwhHP" name="Ponta" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="kwhHFP" name="Fora Ponta" stackId="a" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                        {postoConfig.hr_inicio && <Bar dataKey="kwhHR" name="Reservado" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Diagnóstico de Importação (Auditoria) */}
                  <div className="p-6 bg-[#1E3A8A]/5 border border-[#1E3A8A]/10 rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-[#1E3A8A]" />
                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">Arquivos e Amostra de Dados (Auditoria)</h4>
                      </div>
                      <span className="px-3 py-1 bg-white text-[10px] font-black text-slate-400 rounded-lg border border-slate-100 shadow-sm">LOGS DE IMPORTAÇÃO</span>
                    </div>
                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="p-3 font-black uppercase text-slate-400">Data e Hora</th>
                            <th className="p-3 font-black uppercase text-slate-400">Consumo Lido (kWh)</th>
                            <th className="p-3 font-black uppercase text-slate-400">Posto Tarifário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tempDataMassa || massaResult)?.amostraDados?.map((r: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-700">{r.ts}</td>
                              <td className="p-3 font-black text-[#1E3A8A]">{r.v.toFixed(4)}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                  r.posto === 'HP' ? 'bg-red-100 text-red-600' : 
                                  r.posto === 'HR' ? 'bg-amber-100 text-amber-600' : 
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {r.posto}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas Adicionais de Engenharia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "D. Máx. HP", value: `${(tempDataMassa || massaResult)?.maxDemandaHP?.toFixed(3)} kW`, color: "red" },
                  { label: "D. Máx. HFP", value: `${(tempDataMassa || massaResult)?.maxDemandaHFP?.toFixed(3)} kW`, color: "blue" },
                  { label: "D. Máx. HR", value: `${(tempDataMassa || massaResult)?.maxDemandaHR?.toFixed(3)} kW`, color: "amber", hide: !postoConfig.hr_inicio },
                ].filter(s => !s.hide).map(s => (
                  <div key={s.label} className={`p-4 rounded-2xl border-2 ${s.color === 'red' ? 'bg-red-50 border-red-200 text-red-700' : s.color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    <p className="text-[10px] font-black uppercase opacity-60">{s.label}</p>
                    <p className="text-lg font-black mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-bold text-slate-800 mb-1">Curva de Carga Média Diária (Período)</h3>
                <p className="text-xs text-slate-400 mb-5">Demanda média (kW) consolidada nas 24 horas</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={(tempDataMassa || massaResult)?.curvaMediaDiaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hora" tick={{ fontSize: 11 }} tickFormatter={h => `${String(h).padStart(2,'0')}h`} />
                    <YAxis tick={{ fontSize: 11 }} unit=" kW" />
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} kW`} labelFormatter={l => `${String(l).padStart(2,'0')}:00`} />
                    <Line type="monotone" dataKey="kw" stroke="#1E3A8A" strokeWidth={3} dot={false} name="Demanda Média" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {(tempDataMassa || massaResult)?.resumoMensal?.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-800 mb-5 text-sm uppercase tracking-widest">Demanda Máxima Mensal (HP x HFP)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={(tempDataMassa || massaResult).resumoMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} unit=" kW" />
                      <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} kW`} />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar dataKey="maxDemandaHP" name="Ponta" fill="#ef4444" radius={[3,3,0,0]} />
                      <Bar dataKey="maxDemandaHFP" name="Fora Ponta" fill="#1E3A8A" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

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
                  { label: "Energia HR", value: (analise?.energiaAtivaHRKWh || manualForm.energiaAtivaHRKWh) ? `${analise?.energiaAtivaHRKWh || manualForm.energiaAtivaHRKWh} kWh` : "—", color: "amber", hide: !(analise?.energiaAtivaHRKWh || manualForm.energiaAtivaHRKWh) },
                  { label: "Desconto Irrig.", value: (analise?.descontoIrrigante || manualForm.descontoIrrigante) ? `R$ ${(analise?.descontoIrrigante || manualForm.descontoIrrigante).toFixed(2)}` : "—", color: "emerald", hide: !(analise?.descontoIrrigante || manualForm.descontoIrrigante) },
                ].filter(item => !item.hide).map(item => (
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
                  mes: MESES_PTBR[parseInt(m.mes.split('-')[1]) - 1] || m.mes,
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
              <div className="flex gap-6 mt-4 mb-4 text-sm text-slate-600">
                <span>Média: <strong className="text-[#1E3A8A]">{(consumoMeses.reduce((s, m) => s + m.kwh, 0) / consumoMeses.length).toFixed(0)} kWh/mês</strong></span>
                <span>Anual: <strong className="text-[#1E3A8A]">{consumoMeses.reduce((s, m) => s + m.kwh, 0).toFixed(0)} kWh</strong></span>
                {consumoMeses.some(m => m.injetadoKWh > 0) && (
                  <span className="text-[#00BFA5]">GD injetada: <strong>{consumoMeses.reduce((s, m) => s + (m.injetadoKWh || 0), 0).toFixed(0)} kWh</strong></span>
                )}
              </div>

              {consumoMeses[0] && (consumoMeses[0] as any).demandaHFP !== undefined && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase mb-3">Tabela Detalhada de Consumo (Dimensionamento)</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[10px] bg-slate-50 text-slate-600">
                      <thead className="bg-[#1E3A8A] text-white">
                        <tr>
                          <th className="px-3 py-2 font-bold uppercase border-b border-blue-900 border-r">Mês/Ano</th>
                          <th className="px-3 py-2 font-bold uppercase text-center border-b border-blue-900 border-r" colSpan={2}>Demanda (kW)</th>
                          <th className="px-3 py-2 font-bold uppercase text-center border-b border-blue-900" colSpan={3}>Energia (kWh)</th>
                        </tr>
                        <tr>
                          <th className="px-3 py-2 bg-blue-800 font-medium border-r border-blue-900"></th>
                          <th className="px-3 py-2 bg-blue-800 font-medium border-r border-blue-900 text-center">HP</th>
                          <th className="px-3 py-2 bg-blue-800 font-medium border-r border-blue-900 text-center">HFP</th>
                          <th className="px-3 py-2 bg-blue-800 font-medium border-r border-blue-900 text-center">HP</th>
                          <th className="px-3 py-2 bg-blue-800 font-medium border-r border-blue-900 text-center">HFP</th>
                          <th className="px-3 py-2 bg-blue-800 font-medium text-center">HR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consumoMeses.map((m: any, i: number) => (
                          <tr key={i} className="border-b border-slate-200 hover:bg-emerald-50 transition-colors">
                            <td className="px-3 py-2 font-bold border-r border-slate-200">{m.mes}</td>
                            <td className="px-3 py-2 text-center border-r border-slate-200">{m.demandaHP}</td>
                            <td className="px-3 py-2 text-center font-bold text-[#1E3A8A] border-r border-slate-200">{m.demandaHFP}</td>
                            <td className="px-3 py-2 text-center border-r border-slate-200">{m.energiaHP}</td>
                            <td className="px-3 py-2 text-center font-bold text-[#00BFA5] border-r border-slate-200">{m.energiaHFP}</td>
                            <td className="px-3 py-2 text-center text-amber-600">{m.energiaHR}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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

      {/* ── Sticky Flow Navigation Rodapé ─────────────────────────────────────────── */}
      {(analise || massaResult) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[40] w-full max-w-4xl px-4 animate-in slide-in-from-bottom-10 duration-500">
           <div className="bg-[#0A192F] text-white p-4 rounded-3xl shadow-2xl shadow-blue-900/40 border border-white/10 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-4 ml-2">
                 <div className="w-10 h-10 bg-[#00BFA5]/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[#00BFA5]" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-widest">Análise Concluída</p>
                    <p className="text-xs font-bold text-slate-300">Deseja prosseguir para o dimensionamento?</p>
                 </div>
              </div>

              <div className="flex gap-3">
                 {(!projeto || projeto?.tipo === 'SOLAR' || projeto?.tipo === 'HYBRID') && (
                   <button 
                     onClick={() => {
                       const meta = parseFloat(analise?.consumoMedioMensalKWh) || 0;
                       router.push(`/engenharia/solar?projetoId=${projetoId}&meta=${meta}`);
                     }}
                     className="bg-[#00BFA5] hover:bg-[#00a690] text-white px-6 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                   >
                     <Sun className="w-4 h-4" /> Dimensionamento Solar
                   </button>
                 )}
                 {(!projeto || projeto?.tipo === 'BESS' || projeto?.tipo === 'HYBRID') && (
                   <button 
                     onClick={() => router.push(`/engenharia/bess?projetoId=${projetoId}`)}
                     className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-900/20"
                   >
                     <Battery className="w-4 h-4" /> Estudo BESS
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function AnaliseConsumoPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>}>
      <AnaliseConsumoContent />
    </Suspense>
  );
}
