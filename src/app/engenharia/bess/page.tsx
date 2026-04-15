"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Battery, Zap, TrendingDown, DollarSign, Loader2, Save, 
  Settings2, Info, ChevronRight, BarChart3, AlertCircle 
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import { simularPeakShaving, simularTimeShifting, calcularFinanceiroBESS, BESSConfig } from "@/lib/engenharia/bessEngine";

export default function DimensionamentoBESSPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data State
  const [projetos, setProjetos] = useState<any[]>([]);
  const [projetoBase, setProjetoBase] = useState<any>(null);
  const [baterias, setBaterias] = useState<any[]>([]);
  const [inversores, setInversores] = useState<any[]>([]);
  
  // Simulation Config
  const [config, setConfig] = useState<BESSConfig>({
    capacidadeKWh: 100,
    potenciaInversorKW: 50,
    dodMax: 0.9,
    eficienciaRTE: 0.9,
    custoSistema: 250000
  });

  const [selectedBateriaId, setSelectedBateriaId] = useState("");
  const [selectedInversorId, setSelectedInversorId] = useState("");
  const [quantidadeBaterias, setQuantidadeBaterias] = useState(1);
  const [demandaAlvoKW, setDemandaAlvoKW] = useState(100);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [resProj, resBat, resInv] = await Promise.all([
        fetch("/api/engenharia/projetos"),
        fetch("/api/engenharia/equipamentos/baterias"),
        fetch("/api/engenharia/equipamentos/inversores")
      ]);
      
      if (resProj.ok) setProjetos(await resProj.json());
      if (resBat.ok) setBaterias(await resBat.json());
      if (resInv.ok) setInversores(await resInv.json());
      
      if (projetoId) {
        const resEstudo = await fetch(`/api/engenharia/bess?projetoId=${projetoId}`);
        if (resEstudo.ok) {
          const d = await resEstudo.json();
          setProjetoBase(d.base || d.estudo?.projeto);
          if (d.estudo) {
            setDemandaAlvoKW(d.estudo.demandaAlvoKW || 100);
            setQuantidadeBaterias(d.estudo.quantidadeBaterias || 1);
            setSelectedBateriaId(d.estudo.bateriaId || "");
            setSelectedInversorId(d.estudo.inversorId || "");
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [projetoId]);

  // Update config when equipments are selected
  useEffect(() => {
    const bat = baterias.find(b => b.id === selectedBateriaId);
    const inv = inversores.find(i => i.id === selectedInversorId);
    
    if (bat || inv) {
      setConfig(prev => ({
        ...prev,
        capacidadeKWh: (bat?.capacidadeNomKWh || 0) * quantidadeBaterias,
        potenciaInversorKW: inv?.potenciaNominalKW || prev.potenciaInversorKW,
        dodMax: bat?.profundidadeDescarga || 0.9,
        custoSistema: ((bat?.custoUSD || 0) * 5.2 + (inv?.custoUSD || 0) * 5.2 + 50000) // Mock cost formula
      }));
    }
  }, [selectedBateriaId, selectedInversorId, quantidadeBaterias, baterias, inversores]);

  // Simulation Logic
  const simulacao = useMemo(() => {
    if (!projetoBase?.analiseMassa?.[0]?.curvaMediaDiaria) return null;
    const curva = projetoBase.analiseMassa[0].curvaMediaDiaria as any[];
    
    // Peak Shaving
    const ps = simularPeakShaving(curva, config, demandaAlvoKW);
    
    // Time Shifting (if in HP/HFP mode)
    const fatura = projetoBase.analiseFatura;
    let ts = null;
    if (fatura?.tarifaHP && fatura?.tarifaHFP) {
      ts = simularTimeShifting(config.capacidadeKWh * config.dodMax, fatura.tarifaHP, fatura.tarifaHFP, config.eficienciaRTE);
    }
    
    // Financials
    const economiaMensal = (ts?.economiaDiariaBruta || 0) * 22; // Dias úteis
    const fin = calcularFinanceiroBESS(config.custoSistema, economiaMensal);

    return { ps, ts, fin };
  }, [projetoBase, config, demandaAlvoKW]);

  const handleSave = async () => {
    if (!projetoId) return;
    setSaving(true);
    await fetch("/api/engenharia/bess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projetoId,
        demandaAlvoKW,
        bateriaId: selectedBateriaId,
        inversorId: selectedInversorId,
        quantidadeBaterias,
        picoReduzidoKW: simulacao?.ps.picoReduzidoKW,
        economiaMensalBESS: simulacao?.fin.economiaMensalEstimada,
        paybackSimples: simulacao?.fin.paybackAnos,
        vpl: simulacao?.fin.vpl,
        tir: simulacao?.fin.tir,
        resultadosGrafico: simulacao?.ps.shavedCurve
      })
    });
    setSaving(false);
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#00BFA5] rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Battery className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Dimensionamento BESS</h1>
            <p className="text-slate-500 text-sm">Estudo de Peak Shaving e Time Shifting</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select 
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:ring-2 focus:ring-[#00BFA5]"
            value={projetoId}
            onChange={(e) => router.push(`/engenharia/bess?projetoId=${e.target.value}`)}
          >
            <option value="">Selecione um Projeto</option>
            {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <button 
            disabled={!projetoId || saving}
            onClick={handleSave}
            className="bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-blue-900 transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Estudo
          </button>
        </div>
      </div>

      {!projetoId ? (
        <div className="bg-slate-100 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
          <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Bem-vindo ao Planejamento BESS</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Selecione um projeto de engenharia acima para iniciar a simulação baseada no consumo real.</p>
        </div>
      ) : !projetoBase?.analiseMassa?.[0] ? (
        <div className="bg-amber-50 rounded-3xl p-12 border border-amber-200 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-amber-800">Falta Memória de Massa</h3>
          <p className="text-amber-700 mt-2">Este projeto ainda não possui análise de memória de massa. O dimensionamento BESS exige a curva de carga (XLS).</p>
          <button onClick={() => router.push(`/engenharia/analise-consumo?projetoId=${projetoId}`)} className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-xl font-bold">Ir para Análise de Consumo</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar Config */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
                <Settings2 className="w-5 h-5 text-[#00BFA5]" /> Configuração
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Bateria</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm"
                    value={selectedBateriaId}
                    onChange={(e) => setSelectedBateriaId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {baterias.map(b => <option key={b.id} value={b.id}>{b.fabricante} — {b.modelo} ({b.capacidadeNomKWh}kWh)</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Quantidade de Baterias</label>
                  <input 
                    type="number" min="1" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm"
                    value={quantidadeBaterias}
                    onChange={(e) => setQuantidadeBaterias(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Inversor BESS / Híbrido</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm"
                    value={selectedInversorId}
                    onChange={(e) => setSelectedInversorId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {inversores.filter(i => i.tipoConexao === 'HYBRID').map(i => <option key={i.id} value={i.id}>{i.fabricante} — {i.modelo} ({i.potenciaNominalKW}kW)</option>)}
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Demanda Alvo (kW)</label>
                    <span className="text-sm font-black text-[#1E3A8A]">{demandaAlvoKW} kW</span>
                  </div>
                  <input 
                    type="range" min="0" max={Math.ceil(projetoBase.analiseMassa[0].maxDemandaTotal * 1.2)} step="5"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]"
                    value={demandaAlvoKW}
                    onChange={(e) => setDemandaAlvoKW(parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0 kW</span>
                    <span>Máx: {Math.ceil(projetoBase.analiseMassa[0].maxDemandaTotal)} kW</span>
                  </div>
                </div>
              </div>

              {/* Specs Summary */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2">
                <p className="text-[10px] font-black text-[#00BFA5] uppercase">Capacidade Instalada</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{config.capacidadeKWh.toFixed(1)}</span>
                  <span className="text-xs opacity-60">kWh</span>
                </div>
                <div className="flex justify-between text-[11px] opacity-70">
                  <span>Potência: {config.potenciaInversorKW}kW</span>
                  <span>DOD: {(config.dodMax * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Financial Results */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">Resultados Financeiros</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500 font-medium">Payback Simples</span>
                  <span className="text-sm font-black text-slate-800">{simulacao?.fin.paybackAnos} anos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500 font-medium">TIR</span>
                  <span className="text-sm font-black text-emerald-600">{simulacao?.fin.tir}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500 font-medium">VPL (10 anos)</span>
                  <span className="text-sm font-black text-slate-800">R$ {simulacao?.fin.vpl.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#1E3A8A]"><TrendingDown className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Redução Demanda</p>
                  <p className="text-xl font-black">{(projetoBase.analiseMassa[0].maxDemandaTotal - (simulacao?.ps.picoReduzidoKW || 0)).toFixed(1)} kW</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><DollarSign className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Economia Mensal</p>
                  <p className="text-xl font-black">R$ {simulacao?.fin.economiaMensalEstimada.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600"><Zap className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Energia p/ Shaving</p>
                  <p className="text-xl font-black">{simulacao?.ps.energiaNecessariaCicloKWh} kWh/dia</p>
                </div>
              </div>
            </div>

            {/* Load Curve Chart */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#00BFA5]" /> Simulação de Curva Shaved
                  </h3>
                  <p className="text-xs text-slate-400">Visão da demanda original vs. demanda após atuação do BESS</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-200 rounded-sm" /> <span className="text-[10px] font-bold text-slate-500 uppercase">Original</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#00BFA5] rounded-sm" /> <span className="text-[10px] font-bold text-slate-500 uppercase">Com BESS</span></div>
                </div>
              </div>
              
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulacao?.ps.shavedCurve}>
                    <defs>
                      <linearGradient id="colorOrig" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00BFA5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00BFA5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="hora" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      tickFormatter={h => `${String(h).padStart(2,'0')}h`}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit=" kW" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={h => `${String(h).padStart(2,'0')}:00`}
                    />
                    <ReferenceLine y={demandaAlvoKW} stroke="#f43f5e" strokeDasharray="5 5" label={{ value: 'Alvo', fill: '#f43f5e', fontSize: 10, offset: 10, position: 'insideTopLeft' }} />
                    <Area type="monotone" dataKey="originalKW" stroke="#94a3b8" strokeWidth={1} fillOpacity={1} fill="url(#colorOrig)" name="Demanda Original" />
                    <Area type="monotone" dataKey="finalKW" stroke="#00BFA5" strokeWidth={3} fillOpacity={1} fill="url(#colorBess)" name="Demanda Shaved" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8 p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                 <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><AlertCircle className="w-5 h-5" /></div>
                 <p className="text-xs text-slate-500 leading-relaxed">
                   <strong>Nota Técnica:</strong> Esta simulação considera descarga constante para manutenção do patamar alvo de <strong>{demandaAlvoKW} kW</strong>. 
                   A autonomia real depende do SOC da bateria no início do evento e da vida útil residual.
                 </p>
              </div>
            </div>

            {/* Time Shifting Explanation */}
            {simulacao?.ts && (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">Arbitragem de Energia (Time Shifting)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    O sistema aproveita a diferença tarifária entre o horário de Ponta e Fora Ponta.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-slate-600">Tarifa HFP: <strong>R$ {projetoBase.analiseFatura.tarifaHFP.toFixed(2)}/kWh</strong></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-slate-600">Tarifa HP: <strong>R$ {projetoBase.analiseFatura.tarifaHP.toFixed(2)}/kWh</strong></span>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1E3A8A]/5 rounded-2xl p-6 border border-[#1E3A8A]/10">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-[#1E3A8A] uppercase mb-1">Spread de Economia</p>
                    <p className="text-4xl font-black text-[#1E3A8A]">R$ {(projetoBase.analiseFatura.tarifaHP - (projetoBase.analiseFatura.tarifaHFP / config.eficienciaRTE)).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Líquido por kWh deslocado</p>
                  </div>
                  <div className="mt-6 flex justify-between border-t border-[#1E3A8A]/10 pt-4">
                    <div className="text-center flex-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Vida Útil</p>
                      <p className="text-sm font-bold text-slate-700">6000 Ciclos</p>
                    </div>
                    <div className="w-px bg-[#1E3A8A]/10 opacity-30" />
                    <div className="text-center flex-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Max Shifting</p>
                      <p className="text-sm font-bold text-slate-700">{simulacao.ts.energiaDeslocadaDiariaKWh.toFixed(1)} kWh/dia</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
