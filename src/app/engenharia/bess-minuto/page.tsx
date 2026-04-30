"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Battery, Zap, Loader2, Settings2, Info, AlertCircle, ArrowRightLeft 
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from "recharts";
import { simularBESSMinutoAMinuto, BESSConfig } from "@/lib/engenharia/bessEngine";

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
    standbyLossesKW: 0.1 // 100W padrão de consumo eletrônico do BESS
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const resProj = await fetch("/api/engenharia/projetos");
      if (resProj.ok) setProjetos(await resProj.json());
      
      if (projetoId) {
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
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [projetoId]);

  const simulacao = useMemo(() => {
    if (!projetoBase?.analiseMassa?.[0]?.curvaMediaDiaria) return null;
    const curva = projetoBase.analiseMassa[0].curvaMediaDiaria as any[];
    
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

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>;

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
        </div>
      ) : !simulacao ? (
        <div className="bg-amber-50 rounded-3xl p-12 text-center text-amber-700 border border-amber-200">
          <AlertCircle className="w-10 h-10 mx-auto mb-2" />
          Este projeto não possui Curva de Carga importada.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Settings2 className="w-5 h-5"/> Parâmetros BESS</h3>
              
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
                 <ArrowRightLeft className="w-5 h-5 text-indigo-500" /> Fluxo Energético Preciso (Plot: a cada 10 min)
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
