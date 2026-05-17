"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sun, Activity, AlertTriangle, TrendingUp, 
  MapPin, Zap, Clock, ShieldCheck, 
  Wind, Thermometer, CloudSun, ArrowUpRight,
  Settings, Radio, ChevronRight, X, Info, Loader, Database
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  ReTooltip, ResponsiveContainer, Cell, Pie, PieChart as RePieChart
} from "recharts";

const performanceData = [
  { time: "06:00", actual: 0, expected: 5 },
  { time: "08:00", actual: 15, expected: 20 },
  { time: "10:00", actual: 45, expected: 50 },
  { time: "12:00", actual: 85, expected: 90 },
  { time: "14:00", actual: 75, expected: 80 },
  { time: "16:00", actual: 30, expected: 35 },
  { time: "18:00", actual: 5, expected: 8 },
];

const lossDistribution = [
  { name: "Sujidade", value: 3.5, color: "#E45318" },
  { name: "Temperatura", value: 2.1, color: "#f59e0b" },
  { name: "Sombreamento", value: 1.2, color: "#ef4444" },
  { name: "Outros", value: 0.8, color: "#94a3b8" },
];

export default function SolarMonitoringPage() {
  const router = useRouter();
  const [usinas, setUsinas] = useState<any[]>([]);
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>("consolidado");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [isAlarmPopupOpen, setIsAlarmPopupOpen] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [telemetrias, setTelemetrias] = useState<any[]>([]);
  
  const selectedUsina = usinas.find(u => u.id === selectedUsinaId);

  useEffect(() => {
    fetchUsinas();
  }, []);

  useEffect(() => {
    if (usinas.length > 0) {
      fetchMetrics();
    }
  }, [selectedUsinaId, usinas]);

  useEffect(() => {
    if (metrics?.alarmes?.length > 0) {
      setIsAlarmPopupOpen(true);
      setSelectedAlarm(metrics.alarmes[0]);
    }
  }, [metrics]);

  const fetchUsinas = async () => {
    try {
      const res = await fetch("/api/solar/usinas");
      const data = await res.json();
      setUsinas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const url = selectedUsinaId === "consolidado" 
        ? `/api/solar/analise?t=${Date.now()}` 
        : `/api/solar/analise?usinaId=${selectedUsinaId}&t=${Date.now()}`;
      const res = await fetch(url);
      const data = await res.json();
      setMetrics(data);
      if (data.telemetrias) setTelemetrias(data.telemetrias);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/solar/sync', { method: 'POST' });
      await fetchMetrics();
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 font-montserrat">
      {/* Alarm Popup */}
      {isAlarmPopupOpen && selectedAlarm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-300">
           <div className="bg-white rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border-4 border-red-500/20">
              <div className="bg-red-600 p-10 text-white relative">
                 <button onClick={() => setIsAlarmPopupOpen(false)} className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                    <X className="w-5 h-5" />
                 </button>
                 <div className="flex items-center gap-4 mb-4">
                    <AlertTriangle className="w-10 h-10 animate-bounce" />
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Ação Necessária</span>
                 </div>
                 <h3 className="text-3xl font-black uppercase tracking-tighter">Alarme de Usina Detectado</h3>
                 <p className="opacity-80 font-bold uppercase text-xs mt-2 tracking-widest">{metrics?.nome || "Usina Desconhecida"}</p>
              </div>
              
              <div className="p-10 space-y-8">
                 <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição do Erro</h4>
                    <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                       <p className="text-red-700 font-black text-lg">[{selectedAlarm.codigo}] {selectedAlarm.descricao}</p>
                       <p className="text-red-400 text-xs font-bold mt-2 uppercase tracking-widest">Gravidade: {selectedAlarm.gravidade}</p>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-cordeiro-green">Solução Recomendada</h4>
                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                       <p className="text-emerald-800 font-bold leading-relaxed">{selectedAlarm.solucao || "Aguardando análise técnica da engenharia."}</p>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button onClick={() => setIsAlarmPopupOpen(false)} className="flex-1 btn-pill bg-black text-white py-5">Reconhecer Alerta</button>
                    <button className="flex-1 btn-pill bg-slate-100 text-slate-400 py-5">Registrar Manutenção</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Title & Plant Selector */}
        <div className="flex-1 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-8">
          <div className="p-6 bg-orange-50 rounded-[2rem]">
            <Sun className="w-12 h-12 text-cordeiro-orange animate-pulse" />
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex flex-wrap items-center justify-center md:justify-start gap-4">
              SOLAR INTELLIGENCE 
              <span className="text-cordeiro-orange">SIE</span>
              <span className="px-4 py-1.5 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">v3.0 PRO</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <MapPin className="w-4 h-4 text-cordeiro-orange" />
                <select 
                  className="bg-transparent font-black text-slate-700 text-sm uppercase tracking-widest outline-none cursor-pointer min-w-[200px]"
                  value={selectedUsinaId}
                  onChange={(e) => setSelectedUsinaId(e.target.value)}
                >
                  <option value="consolidado">VISÃO GLOBAL (TODAS)</option>
                  {usinas.map(u => (
                    <option key={u.id} value={u.id}>{u.nome.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sistema Online
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row lg:flex-col gap-4">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-6 bg-black text-white hover:bg-slate-800 rounded-[2.5rem] px-10 py-6 md:py-8 shadow-2xl shadow-black/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {syncing ? <Loader className="w-6 h-6 animate-spin" /> : <Activity className="w-6 h-6 text-cordeiro-orange" />}
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">Telemetria</p>
              <p className="text-base font-black uppercase tracking-tighter leading-none">Sincronizar</p>
            </div>
          </button>
          <button 
            onClick={() => router.push('/engenharia/solar/monitoramento/usinas')}
            className="p-6 md:p-8 bg-white text-slate-400 hover:text-cordeiro-orange rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 transition-all hover:scale-105 group"
          >
            <Settings className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <KPICard 
          title="Geração Hoje" 
          value={loading ? "---" : `${parseFloat(metrics?.geracaoHoje || '0').toFixed(1)} kWh`} 
          sub={metrics?.percentualEsperado ? `${metrics.percentualEsperado}% da meta` : "Aguardando telemetria"} 
          icon={Zap} trend={metrics?.tendenciaGeracao || "+5.2%"} 
          trendUp={true} color="orange" 
        />
        <KPICard 
          title="Potência Instantânea" 
          value={loading ? "---" : `${parseFloat(metrics?.potenciaAtual || '0').toFixed(1)} kW`} 
          sub={`Capacidade: ${selectedUsina?.capacidadeKWp || '---'} kWp`} 
          icon={Activity} trend="Tempo Real" 
          trendUp={true} color="green" 
        />
        <KPICard 
          title="Performance Ratio (PR)" 
          value={loading ? "---" : `${metrics?.pr || '84.2'}%`} 
          sub={`Meta: 80%`} 
          icon={TrendingUp} trend="+2.1%" 
          trendUp={true} color="orange" 
        />
        <KPICard 
          title="Alertas Ativos" 
          value={loading ? "---" : `${metrics?.alarmes?.length || '0'}`} 
          sub="IA Preditiva Ativa" 
          icon={AlertTriangle} trend={metrics?.alarmes?.length > 0 ? "CRÍTICO" : "Status OK"} 
          trendUp={false} color={metrics?.alarmes?.length > 0 ? "red" : "green"} 
        />
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-cordeiro">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-black text-black uppercase tracking-tighter text-xl">Curva de Geração Dinâmica</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">Real vs. Estimado (IA Model)</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cordeiro-orange"></div>
                  <span className="text-[10px] font-bold uppercase">Real</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  <span className="text-[10px] font-bold uppercase">Estimado</span>
               </div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.curvaGeracao || performanceData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E45318" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#E45318" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Area type="monotone" dataKey="expected" stroke="#e2e8f0" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="actual" stroke="#E45318" fillOpacity={1} fill="url(#colorActual)" strokeWidth={5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-black rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <h3 className="font-black uppercase tracking-tighter text-lg text-cordeiro-orange mb-10">Loss Bucketing Analysis</h3>
            
            <div className="flex justify-center mb-10 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={metrics?.perdasDistribucao || lossDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {(metrics?.perdasDistribucao || lossDistribution).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {(metrics?.perdasDistribucao || lossDistribution).map((item: any) => (
                <div key={item.name} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">{item.name}</span>
                  </div>
                  <span className="text-sm font-black">{item.value}%</span>
                </div>
              ))}
            </div>

            <div className="mt-10 p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
               <div className="flex items-center gap-3 mb-4 text-cordeiro-orange">
                 <ShieldCheck className="w-5 h-5" />
                 <span className="text-[11px] font-black uppercase tracking-widest">SIE Intelligence Insight</span>
               </div>
               <p className="text-xs leading-relaxed opacity-80 font-medium italic">
                  {metrics?.aiInsight || `Geração otimizada. Não foram detectadas anomalias significativas nas últimas 24h.`}
               </p>
            </div>
        </div>
      </div>

      {/* Detailed Technical Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Environmental Station */}
        <div className="card-cordeiro">
           <div className="flex items-center justify-between mb-8">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Estação Solarimétrica</h4>
              <Radio className="w-4 h-4 text-cordeiro-green animate-pulse" />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <EnvMetric label="Irradiância" value={loading ? "---" : `${metrics?.irradiancia || '0'} W/m²`} icon={Sun} color="orange" />
              <EnvMetric label="Temp. Módulo" value={loading ? "---" : `${metrics?.tempModulos || '0'}°C`} icon={Thermometer} color="orange" />
              <EnvMetric label="Temp. Ambiente" value={loading ? "---" : `${metrics?.tempAmbiente || '0'}°C`} icon={Thermometer} color="slate" />
              <EnvMetric label="Vento" value={loading ? "---" : `${metrics?.vento || '0'} m/s`} icon={Wind} color="slate" />
           </div>
           {metrics?.irradiancia > 0 ? (
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-cordeiro-green uppercase bg-emerald-50 p-3 rounded-xl">
                 <Radio className="w-3 h-3" /> Monitoramento em Tempo Real Ativo
              </div>
           ) : metrics?.estacao ? (
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-cordeiro-green uppercase bg-emerald-50 p-3 rounded-xl">
                 <Radio className="w-3 h-3" /> Conectado a: {metrics.estacao.nome}
              </div>
           ) : (
              <div className="mt-6 text-[9px] font-bold text-slate-400 uppercase bg-slate-50 p-3 rounded-xl italic">
                 Nenhuma estação vinculada. Usando estimativa local.
              </div>
           )}
        </div>

        {/* Detailed Inverter Telemetry */}
        <div className="xl:col-span-2 card-cordeiro overflow-hidden">
           <div className="flex items-center justify-between mb-8">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Telemetria Detalhada dos Inversores</h4>
              <Zap className="w-4 h-4 text-cordeiro-orange" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* AC Side */}
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">Lado CA (Rede Elétrica)</h5>
                 <div className="space-y-4">
                    <PhaseMetric phase="Fase A" v={metrics?.detalhesCA?.faseA?.V || 0} i={metrics?.detalhesCA?.faseA?.I || 0} p={metrics?.detalhesCA?.faseA?.P || 0} />
                    <PhaseMetric phase="Fase B" v={metrics?.detalhesCA?.faseB?.V || 0} i={metrics?.detalhesCA?.faseB?.I || 0} p={metrics?.detalhesCA?.faseB?.P || 0} />
                    <PhaseMetric phase="Fase C" v={metrics?.detalhesCA?.faseC?.V || 0} i={metrics?.detalhesCA?.faseC?.I || 0} p={metrics?.detalhesCA?.faseC?.P || 0} />
                 </div>
                 <div className="p-5 bg-slate-50 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Thermometer className="w-4 h-4 text-orange-500" />
                       <span className="text-[10px] font-black uppercase text-slate-500">Temp. IGBT Interna</span>
                    </div>
                    <span className="text-sm font-black text-black">{(metrics?.tempIGBT || 0).toFixed(1)} °C</span>
                 </div>
              </div>

              {/* DC Side (Strings) */}
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">Lado CC (Strings Fotovoltaicas)</h5>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.keys(metrics?.dadosStrings || {}).length > 0 ? (
                       Object.entries(metrics.dadosStrings).map(([key, val]: any) => (
                          <StringMetric key={key} name={key} v={val.V} i={val.I} />
                       ))
                    ) : (
                       <div className="col-span-full py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aguardando mapeamento de strings</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Tabela de Dados Brutos para Análise */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden mt-12 mb-20">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Dados Brutos de Telemetria (SIE)</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Registros históricos em tempo real para auditoria técnica</p>
          </div>
          <button 
            onClick={() => fetchMetrics()}
            className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all hover:scale-110 active:scale-95 shadow-sm"
          >
            <Activity className="w-5 h-5 text-cordeiro-orange" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Horário</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Potência (kW)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Energia Dia (kWh)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">V. String 1 (V)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Irradiância</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Temp. Amb.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {telemetrias.slice(0, 15).map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-black text-slate-800 tracking-tighter">
                    {new Date(t.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-8 py-5 text-sm font-black text-cordeiro-orange">
                    {t.potenciaAtivaKW.toFixed(2)} kW
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-600">
                    {t.energiaAcumuladaKWh.toFixed(2)}
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-blue-600">
                    {(t.dadosStrings?.S1?.V || t.tensaoCA_A || 0).toFixed(1)} V
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-amber-500">
                    {t.irradiancia} W/m²
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-500">
                    {t.tempAmbiente}°C
                  </td>
                </tr>
              ))}
              {telemetrias.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Database className="w-12 h-12 text-slate-200" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Sincronize os dados para iniciar a análise</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PhaseMetric({ phase, v, i, p }: any) {
  return (
    <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-4 items-center gap-2">
       <span className="text-[10px] font-black text-black uppercase">{phase}</span>
       <div className="text-center"><p className="text-[8px] font-bold text-slate-400 uppercase">Tensão</p><p className="text-xs font-black">{v.toFixed(1)}V</p></div>
       <div className="text-center"><p className="text-[8px] font-bold text-slate-400 uppercase">Corrente</p><p className="text-xs font-black">{i.toFixed(1)}A</p></div>
       <div className="text-center"><p className="text-[8px] font-bold text-slate-400 uppercase">Potência</p><p className="text-xs font-black">{p.toFixed(1)}kW</p></div>
    </div>
  );
}

function StringMetric({ name, v, i }: any) {
  return (
    <div className="p-2 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-cordeiro-orange/50 transition-all">
       <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cordeiro-orange"></div>
          <span className="text-[8px] font-black text-black uppercase">{name}</span>
       </div>
       <div className="flex gap-2">
          <div className="text-right"><p className="text-[8px] font-black text-blue-600">{v.toFixed(0)}V</p></div>
          <div className="text-right"><p className="text-[8px] font-black text-slate-400">{i.toFixed(1)}A</p></div>
       </div>
    </div>
  );
}

function KPICard({ title, value, sub, icon: Icon, trend, trendUp, color }: any) {
  const colors: any = {
    orange: "bg-orange-50 text-cordeiro-orange",
    green: "bg-emerald-50 text-cordeiro-green",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-50 text-slate-600"
  };
  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 hover:-translate-y-1 transition-all group">
      <div className="flex items-center justify-between mb-8">
        <div className={`p-4 rounded-3xl ${colors[color]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-8 h-8" />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${trendUp ? "text-cordeiro-green" : "text-red-500"}`}>
          {trend} <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 truncate">{title}</h4>
      <p className="text-3xl font-black text-black tracking-tighter truncate">{value}</p>
      <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-wide truncate">{sub}</p>
    </div>
  );
}

function EnvMetric({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    orange: "text-cordeiro-orange bg-orange-50",
    slate: "text-slate-500 bg-slate-50",
  };
  return (
    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color] || colors.slate}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-2 tracking-tighter truncate">{label}</p>
        <p className="text-sm font-black text-black leading-none truncate">{value}</p>
      </div>
    </div>
  );
}
