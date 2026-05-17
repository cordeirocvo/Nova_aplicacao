"use client";
import { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Battery, Zap, Loader, Settings, Info, AlertTriangle, ArrowRight, FileText, Database, Keyboard, LayoutGrid, Upload, CheckCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from "recharts";
import { simularBESSMinutoAMinuto, BESSConfig } from "@/lib/engenharia/bessEngine";
import LevantamentoCarga, { EquipamentoCarga } from "./LevantamentoCarga";
import ConsumoFormPreview from "./ConsumoFormPreview";

type Step = 'DADOS' | 'SIMULACAO';
type DataTab = 'PDF' | 'MASSA' | 'MANUAL' | 'LEVANTAMENTO';

function BESSMinutoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  const [loading, setLoading] = useState(true);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [projetoBase, setProjetoBase] = useState<any>(null);
  
  const [config, setConfig] = useState<BESSConfig & { potenciaSolarKWp: number }>({
    capacidadeKWh: 100,
    potenciaInversorKW: 50,
    potenciaSolarKWp: 50, // Default mock value
    dodMax: 0.9,
    eficienciaRTE: 0.9,
    custoSistema: 0,
    estratégia: 'HYBRID',
    standbyLossesKW: 0.1
  });

  const [step, setStep] = useState<Step>('DADOS');
  const [dataTab, setDataTab] = useState<DataTab>('LEVANTAMENTO');
  const [curvaManual, setCurvaManual] = useState<Array<{hora: number, kw: number}> | null>(null);
  const [equipamentosSalvos, setEquipamentosSalvos] = useState<EquipamentoCarga[]>([]);
  
  // Upload states
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  
  const [faturaPreviewData, setFaturaPreviewData] = useState<any>(null);
  const [showFaturaPreview, setShowFaturaPreview] = useState(false);
  const [showMassaPreview, setShowMassaPreview] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!projetoId) return;
    setLoading(true);
    const resProj = await fetch("/api/engenharia/projetos");
    if (resProj.ok) setProjetos(await resProj.json());
    
    const resEstudo = await fetch(`/api/engenharia/bess?projetoId=${projetoId}`);
    if (resEstudo.ok) {
      const d = await resEstudo.json();
      setProjetoBase(d.base || d.estudo?.projeto);
      if (d.estudo) {
        setConfig(prev => ({
          ...prev,
          capacidadeKWh: (d.estudo.quantidadeBaterias || 1) * 100,
          potenciaInversorKW: 50,
          potenciaSolarKWp: d.base?.estudoSolar?.potenciaNecessariaKWp || 50,
          estratégia: d.estudo.estratégia || 'HYBRID'
        }));
      }
      if (d.base?.levantamentoCargas) {
          try {
            setEquipamentosSalvos(typeof d.base.levantamentoCargas === 'string' ? JSON.parse(d.base.levantamentoCargas) : d.base.levantamentoCargas);
          } catch(e) {}
      }
    }
    setLoading(false);
  }, [projetoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadPDF = async () => {
    if (!fileToUpload || !projetoId) return;
    setUploading(true); setUploadError("");
    const fd = new FormData();
    fd.append("file", fileToUpload);
    fd.append("projetoId", projetoId);
    
    try {
      const res = await fetch("/api/engenharia/fatura", { method: "POST", body: fd });
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || "Erro ao processar fatura PDF");
      await fetchData(); // Recarrega projetoBase
      setFaturaPreviewData(data.extraido || data.analise);
      setShowFaturaPreview(true);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      setFileToUpload(null);
    }
  };

  const handleUploadMassa = async () => {
    if (!fileToUpload || !projetoId) return;
    setUploading(true); setUploadError("");
    const fd = new FormData();
    fd.append("files", fileToUpload);
    fd.append("projetoId", projetoId);
    
    try {
      const res = await fetch("/api/engenharia/memoria-massa", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Erro ao processar Memória de Massa");
      await fetchData(); // Recarrega projetoBase
      setShowMassaPreview(true);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      setFileToUpload(null);
    }
  };

  const handleManualSave = async (data: any) => {
    // Calcula o consumo medio mensal para criar curva de 24h
    let consumoMedio = 0;
    if (data.consumoMeses && data.consumoMeses.length > 0) {
      const total = data.consumoMeses.reduce((acc: number, m: any) => acc + Number(m.kwh || 0), 0);
      consumoMedio = total / data.consumoMeses.length;
    }
    const kwhDia = consumoMedio / 30;
    const kwMedioHora = kwhDia / 24;
    const curvaSintetica = Array.from({ length: 24 }, (_, i) => ({ hora: i, kw: kwMedioHora }));
    
    // Salvar no banco
    if (projetoId) {
      await fetch("/api/engenharia/fatura", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetoId, ...data }),
      });
    }
    
    setCurvaManual(curvaSintetica);
    setShowFaturaPreview(false);
    setStep('SIMULACAO');
  };

  const simulacao = useMemo(() => {
    let curva: Array<{ hora: number; kw: number }> = [];

    if (curvaManual) {
      curva = curvaManual;
    } else if (projetoBase?.analiseMassa?.[0]?.curvaMediaDiaria) {
      curva = projetoBase.analiseMassa[0].curvaMediaDiaria as any[];
    } else {
      return null;
    }
    
    let solarKWp = config.potenciaSolarKWp;
    const hspCity = projetoBase.estudoSolar?.hspCity || 5.2;
    
    // Roda a simulação minuto a minuto (1440 pontos)
    const din = simularBESSMinutoAMinuto(curva, solarKWp, hspCity, config);
    return din;
  }, [projetoBase, config]);

  // Downsample para o gráfico: exibe 1 ponto a cada 10 minutos (144 pontos totais) 
  // para garantir 60fps no navegador, mas mantendo a matemática baseada em 1440 pontos.
  const chartData = useMemo(() => {
    return simulacao?.series.filter((_, i) => i % 10 === 0) || [];
  }, [simulacao]);

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Battery className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              Dimensionamento BESS <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg ml-2">Teste Minuto a Minuto</span>
            </h1>
            <p className="text-slate-500 text-sm">Simulação com granularidade de 1440 pontos diários e integração PVLib</p>
          </div>
        </div>
        <select 
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none"
          value={projetoId}
          onChange={(e) => router.push(`/engenharia/bess-minuto?projetoId=${e.target.value}`)}
        >
          <option value="">Selecione um Projeto</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {!projetoId ? (
        <div className="bg-slate-100 rounded-3xl p-20 text-center">
          <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Aguardando Projeto</h3>
          <p className="text-slate-500 mt-2">Selecione um projeto acima para iniciar o dimensionamento.</p>
        </div>
      ) : step === 'DADOS' ? (
        <div className="space-y-6">
          <div className="flex gap-4 p-2 bg-slate-100 rounded-2xl w-full max-w-3xl mx-auto mb-8">
            <button 
              onClick={() => setDataTab('PDF')}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${dataTab === 'PDF' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-4 h-4"/> Fatura PDF
            </button>
            <button 
              onClick={() => setDataTab('MASSA')}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${dataTab === 'MASSA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Database className="w-4 h-4"/> Memória Massa
            </button>
            <button 
              onClick={() => setDataTab('MANUAL')}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${dataTab === 'MANUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Keyboard className="w-4 h-4"/> Dados Manuais
            </button>
            <button 
              onClick={() => setDataTab('LEVANTAMENTO')}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${dataTab === 'LEVANTAMENTO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-4 h-4"/> Levantamento
            </button>
          </div>

          {dataTab === 'LEVANTAMENTO' && (
            <LevantamentoCarga 
              projetoId={projetoId} 
              savedData={equipamentosSalvos}
              onCurveGenerated={async (curva, equipamentos) => {
                setEquipamentosSalvos(equipamentos);
                setCurvaManual(curva);
                
                // Salvar no banco
                if (projetoId) {
                   try {
                     await fetch(`/api/engenharia/projetos/${projetoId}`, {
                       method: 'PUT',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ levantamentoCargas: equipamentos })
                     });
                   } catch(e) { console.error("Erro ao salvar levantamento", e); }
                }

                setStep('SIMULACAO');
              }} 
            />
          )}

          {dataTab === 'PDF' && (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm max-w-2xl mx-auto">
              {!showFaturaPreview ? (
                <>
                  <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500"/> Fatura de Energia (PDF)</h3>
                  <p className="text-slate-500 mb-6">Nossa Inteligência Artificial lerá sua conta de energia (CEMIG, Enel) para estimar o perfil horário de consumo.</p>
                  
                  <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl p-8 text-center relative group">
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                    />
                    {!fileToUpload ? (
                      <>
                        <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                        <p className="text-indigo-900 font-bold">Arraste a Fatura PDF ou clique aqui</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-emerald-900 font-bold">{fileToUpload.name}</p>
                      </>
                    )}
                  </div>
                  
                  {uploadError && <p className="text-red-500 text-sm mt-4 text-center font-bold">{uploadError}</p>}
                  
                  <button 
                    disabled={!fileToUpload || uploading}
                    onClick={handleUploadPDF}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? <Loader className="w-5 h-5 animate-spin" /> : 'Processar e Visualizar'}
                  </button>
                </>
              ) : (
                <ConsumoFormPreview 
                  initialData={faturaPreviewData} 
                  onSave={handleManualSave} 
                  onCancel={() => setShowFaturaPreview(false)}
                />
              )}
            </div>
          )}

          {dataTab === 'MASSA' && (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm max-w-2xl mx-auto">
              {!showMassaPreview ? (
                <>
                  <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2"><Database className="w-5 h-5 text-emerald-500"/> Memória de Massa</h3>
                  <p className="text-slate-500 mb-6">Faça o upload do arquivo XLS/CSV fornecido pela concessionária com os dados de medição minuto-a-minuto ou 15 em 15min.</p>
                  
                  <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl p-8 text-center relative group">
                    <input 
                      type="file" 
                      accept=".csv, .xls, .xlsx" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                    />
                    {!fileToUpload ? (
                      <>
                        <Upload className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-emerald-900 font-bold">Arraste a Memória de Massa ou clique aqui</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-emerald-900 font-bold">{fileToUpload.name}</p>
                      </>
                    )}
                  </div>
                  
                  {uploadError && <p className="text-red-500 text-sm mt-4 text-center font-bold">{uploadError}</p>}

                  <button 
                    disabled={!fileToUpload || uploading}
                    onClick={handleUploadMassa}
                    className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? <Loader className="w-5 h-5 animate-spin" /> : 'Importar Dados'}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-slate-800">1440 Pontos Lidos com Sucesso!</h3>
                  <p className="text-slate-500 mt-2 mb-8">A curva diária horária foi processada a partir do histórico de faturamento bruto.</p>
                  <button 
                    onClick={() => setStep('SIMULACAO')}
                    className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600"
                  >
                    Ir para Simulação Minuto-a-Minuto
                  </button>
                </div>
              )}
            </div>
          )}

          {dataTab === 'MANUAL' && (
            <div className="max-w-2xl mx-auto">
                <ConsumoFormPreview 
                  initialData={projetoBase?.analiseFatura} 
                  onSave={handleManualSave} 
                  title="Entrada Manual de Fatura"
                  subtitle="Insira manualmente o perfil de 12 meses"
                />
            </div>
          )}
        </div>
      ) : !simulacao ? (
        <div className="bg-amber-50 rounded-3xl p-12 text-center text-amber-700 border border-amber-200">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
          Este projeto não possui Curva de Carga. Volte ao Passo 1.
          <br/>
          <button onClick={() => setStep('DADOS')} className="mt-4 px-4 py-2 bg-amber-200 rounded-xl font-bold">Voltar</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          <div className="lg:col-span-4 flex justify-end">
             <button onClick={() => setStep('DADOS')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold bg-slate-100 px-4 py-2 rounded-xl">
               <ArrowRight className="w-4 h-4" /> Alterar Dados de Entrada
             </button>
          </div>
          
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Settings className="w-5 h-5"/> Parâmetros BESS</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Geração Solar (kWp)</label>
                  <input type="number" className="w-full mt-1 p-2 border rounded-xl" value={config.potenciaSolarKWp} onChange={e => setConfig({...config, potenciaSolarKWp: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Capacidade Bateria (kWh)</label>
                  <input type="number" className="w-full mt-1 p-2 border rounded-xl" value={config.capacidadeKWh} onChange={e => setConfig({...config, capacidadeKWh: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Potência Inversor BESS (kW)</label>
                  <input type="number" className="w-full mt-1 p-2 border rounded-xl" value={config.potenciaInversorKW} onChange={e => setConfig({...config, potenciaInversorKW: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Perdas Stand-by (kW)</label>
                  <input type="number" step="0.01" className="w-full mt-1 p-2 border rounded-xl" value={config.standbyLossesKW} onChange={e => setConfig({...config, standbyLossesKW: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Estratégia de Carga</label>
                  <select className="w-full mt-1 p-2 border rounded-xl" value={config.estratégia} onChange={e => setConfig({...config, estratégia: e.target.value as any})}>
                    <option value="HYBRID">Híbrido (Solar + Rede HFP)</option>
                    <option value="SOLAR_ONLY">Auto-consumo (Apenas Solar)</option>
                    <option value="ARBITRAGE">Arbitragem (Rede Noturna)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-md">
              <h3 className="text-indigo-200 text-xs font-black uppercase tracking-wider mb-4">Métricas de Minuto a Minuto</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs opacity-60">Energia Injetada (Solar Excedente)</p>
                  <p className="text-xl font-bold">{simulacao.energiaInjetadaRedeKWh} kWh/dia</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Energia Importada (Déficit)</p>
                  <p className="text-xl font-bold">{simulacao.energiaImportadaRedeKWh} kWh/dia</p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Ciclos Diários Equivalentes</p>
                  <p className="text-xl font-bold text-[#00BFA5]">{simulacao.ciclosEstimadosDia} ciclos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-3">
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[600px] flex flex-col">
               <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <ArrowRight className="w-5 h-5 text-indigo-500" /> Fluxo Energético Preciso (Plot: a cada 10 min)
               </h3>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="horaFormatada" tick={{ fontSize: 10 }} interval={17} />
                      <YAxis yAxisId="kw" tick={{ fontSize: 10 }} unit=" kW" />
                      <YAxis yAxisId="soc" orientation="right" tick={{ fontSize: 10 }} unit=" %" domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Legend />
                      <Area yAxisId="kw" type="monotone" dataKey="geracaoSolarKW" stroke="#fbbf24" fill="#fef3c7" name="Geração Solar (PVLib)" strokeWidth={2} />
                      <Area yAxisId="kw" type="monotone" dataKey="consumoOriginalKW" stroke="#94a3b8" fill="none" name="Consumo Original" strokeWidth={1} strokeDasharray="3 3" />
                      <Area yAxisId="kw" type="monotone" dataKey="consumoRedeKW" stroke="#ef4444" fill="none" name="Consumo da Rede (Final)" strokeWidth={2} />
                      <Area yAxisId="kw" type="monotone" dataKey="potenciaBateriaKW" stroke="#1E3A8A" fill="none" name="Potência Bateria (+Carga)" strokeWidth={2} />
                      <Area yAxisId="soc" type="monotone" dataKey="soc" stroke="#00BFA5" fill="#ccfbf1" name="Estado de Carga (SoC %)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function BESSMinutoPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <BESSMinutoContent />
    </Suspense>
  );
}
