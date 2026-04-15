"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Sun, Zap, MapPin, Settings2, Info, Loader2, Save, 
  ChevronRight, BarChart3, AlertTriangle, CheckCircle2,
  Maximize2, ArrowRightLeft, Layers
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell
} from "recharts";
import { 
  calcularPotenciaNecessaria, 
  verificarCompatibilidadeEletrica 
} from "@/lib/engenharia/solarEngine";

export default function DimensionamentoSolarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  const [loading, setLoading] = useState(true);
  const [fetchingPvgis, setFetchingPvgis] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data State
  const [projetos, setProjetos] = useState<any[]>([]);
  const [projetoBase, setProjetoBase] = useState<any>(null);
  const [modulos, setModulos] = useState<any[]>([]);
  const [inversores, setInversores] = useState<any[]>([]);
  
  // Simulation Config
  const [config, setConfig] = useState({
    lat: -19.91,
    lon: -43.93,
    hspManual: 5.2,
    pr: 0.75, // Performance Ratio
    perdaSistema: 0.14, // Outras perdas
    metaGeracaoKWh: 1000,
    selectedModuloId: "",
    selectedInversorId: "",
    numStrings: 1,
    quantidadeModulos: 0
  });

  const [pvgisData, setPvgisData] = useState<any[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [resProj, resMod, resInv] = await Promise.all([
        fetch("/api/engenharia/projetos"),
        fetch("/api/engenharia/equipamentos/modulos"),
        fetch("/api/engenharia/equipamentos/inversores")
      ]);
      
      if (resProj.ok) setProjetos(await resProj.json());
      if (resMod.ok) setModulos(await resMod.json());
      if (resInv.ok) setInversores(await resInv.json());
      
      if (projetoId) {
        const resEstudo = await fetch(`/api/engenharia/solar?projetoId=${projetoId}`);
        if (resEstudo.ok) {
          const d = await resEstudo.json();
          const base = d.base || d.estudo?.projeto;
          setProjetoBase(base);
          
          if (base?.analiseFatura?.consumoMedioMensalKWh) {
             setConfig(prev => ({ ...prev, metaGeracaoKWh: base.analiseFatura.consumoMedioMensalKWh }));
          }

          if (d.estudo) {
            setConfig(prev => ({
              ...prev,
              lat: d.estudo.lat || prev.lat,
              lon: d.estudo.long || prev.lon,
              hspManual: d.estudo.hspManual || prev.hspManual,
              pr: d.estudo.pr || prev.pr,
              selectedModuloId: d.estudo.moduloId || "",
              selectedInversorId: d.estudo.inversorId || "",
              numStrings: d.estudo.numStrings || 1,
              quantidadeModulos: d.estudo.quantidadeModulos || 0,
            }));
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [projetoId]);

  const fetchPvgis = async () => {
    setFetchingPvgis(true);
    const res = await fetch(`/api/engenharia/solar?action=pvgis&lat=${config.lat}&lon=${config.lon}`);
    if (res.ok) {
      const data = await res.json();
      const monthly = data.outputs.monthly.map((m: any) => ({
        mes: m.month,
        hsp: m.H_m_gh / 30, // HSP média diária no mês
      }));
      setPvgisData(monthly);
      const avgHsp = monthly.reduce((acc: number, cur: any) => acc + cur.hsp, 0) / 12;
      setConfig(prev => ({ ...prev, hspManual: parseFloat(avgHsp.toFixed(2)) }));
    }
    setFetchingPvgis(false);
  };

  // Calculations
  const calculated = useMemo(() => {
    const kwpNecessario = calcularPotenciaNecessaria({
      metaGeracaoMensalKWh: config.metaGeracaoKWh,
      hspCity: config.hspManual,
      pr: config.pr
    });

    const modulo = modulos.find(m => m.id === config.selectedModuloId);
    const inversor = inversores.find(i => i.id === config.selectedInversorId);

    // Ajuste de quantidade de módulos baseado no kWp
    let qteModulos = config.quantidadeModulos;
    if (modulo && qteModulos === 0) {
      qteModulos = Math.ceil((kwpNecessario * 1000) / modulo.potenciaPicoWp);
    }

    const kwpAtual = modulo ? (qteModulos * modulo.potenciaPicoWp) / 1000 : 0;

    const compatibilidade = (modulo && inversor) ? verificarCompatibilidadeEletrica({
      inversor,
      modulo,
      quantidadeModulos: qteModulos,
      numStrings: config.numStrings
    }) : null;

    // Área e Peso
    let area = 0, peso = 0;
    if (modulo && modulo.dimensoes) {
      const [w, h] = modulo.dimensoes.split('x').map((s: string) => parseFloat(s) / 1000);
      area = w * h * qteModulos;
      peso = (modulo.pesoKg || 25) * qteModulos;
    }

    return { kwpNecessario, kwpAtual, qteModulos, compatibilidade, area, peso };
  }, [config, modulos, inversores]);

  const handleSave = async () => {
    if (!projetoId) return;
    setSaving(true);
    await fetch("/api/engenharia/solar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projetoId,
        lat: config.lat,
        long: config.lon,
        hspManual: config.hspManual,
        pr: config.pr,
        geracaoAlvoKWh: config.metaGeracaoKWh,
        potenciaNecessariaKWp: calculated.kwpNecessario,
        moduloId: config.selectedModuloId,
        inversorId: config.selectedInversorId,
        quantidadeModulos: calculated.qteModulos,
        numStrings: config.numStrings,
        modulosPorString: calculated.compatibilidade?.modulosPorString,
        areaOcupadaM2: calculated.area,
        pesoTotalKg: calculated.peso
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
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Sun className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Sistema Fotovoltaico</h1>
            <p className="text-slate-500 text-sm">Dimensionamento de Geração e Strings</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select 
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:ring-2 focus:ring-[#00BFA5]"
            value={projetoId}
            onChange={(e) => router.push(`/engenharia/solar?projetoId=${e.target.value}`)}
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
          <h3 className="text-xl font-bold text-slate-700">Inicie um Projeto Solar</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Vincule a um projeto de engenharia para carregar o histórico de consumo e meta de compensação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sizing Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
                <MapPin className="w-5 h-5 text-amber-500" /> Irradiação & Local
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Latitude</label>
                    <input type="number" step="0.0001" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.lat} onChange={e => setConfig({...config, lat: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Longitude</label>
                    <input type="number" step="0.0001" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.lon} onChange={e => setConfig({...config, lon: parseFloat(e.target.value)})} />
                  </div>
                </div>
                
                <button 
                  onClick={fetchPvgis} disabled={fetchingPvgis}
                  className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 flex items-center justify-center gap-2"
                >
                  {fetchingPvgis ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
                  Buscar Dados PVGIS
                </button>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">HSP Diária (Manual)</label>
                  <input type="number" step="0.1" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-[#1E3A8A]" value={config.hspManual} onChange={e => setConfig({...config, hspManual: parseFloat(e.target.value)})} />
                </div>
              </div>

              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4 pt-2">
                <Settings2 className="w-5 h-5 text-[#00BFA5]" /> Dimensionamento
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Meta de Geração (kWh/mês)</label>
                  <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold" value={config.metaGeracaoKWh} onChange={e => setConfig({...config, metaGeracaoKWh: parseFloat(e.target.value)})} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Performance Ratio (PR)</label>
                  <input type="number" step="0.01" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.pr} onChange={e => setConfig({...config, pr: parseFloat(e.target.value)})} />
                  <p className="text-[10px] text-slate-400 mt-1">Padrão 0.75 (25% de perdas)</p>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Módulo Fotovoltaico</label>
                   <select className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.selectedModuloId} onChange={e => setConfig({...config, selectedModuloId: e.target.value, quantidadeModulos: 0})}>
                     <option value="">Selecione...</option>
                     {modulos.map(m => <option key={m.id} value={m.id}>{m.fabricante} {m.potenciaPicoWp}Wp</option>)}
                   </select>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Inversor</label>
                   <select className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.selectedInversorId} onChange={e => setConfig({...config, selectedInversorId: e.target.value})}>
                     <option value="">Selecione...</option>
                     {inversores.filter(i => i.tipoConexao !== 'OFF_GRID').map(i => <option key={i.id} value={i.id}>{i.fabricante} {i.potenciaNominalKW}kW</option>)}
                   </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sizing Results & Charts */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Potência Necessária</p>
                <p className="text-xl font-black text-[#1E3A8A]">{calculated.kwpNecessario} <span className="text-sm font-medium opacity-50">kWp</span></p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-[#00BFA5]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Qte. de Módulos</p>
                <p className="text-xl font-black">{calculated.qteModulos} <span className="text-sm font-medium opacity-50">UN</span></p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Área Estimada</p>
                <p className="text-xl font-black">{calculated.area.toFixed(1)} <span className="text-sm font-medium opacity-50">m²</span></p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Peso Total</p>
                <p className="text-xl font-black">{calculated.peso.toFixed(0)} <span className="text-sm font-medium opacity-50">kg</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Seasonal Generation Chart */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-500" /> Sazonalidade (HSP)</h3>
                   {pvgisData.length > 0 && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">via PVGIS</span>}
                </div>
                <div className="flex-1 h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={pvgisData.length > 0 ? pvgisData : Array.from({length: 12}, (_, i) => ({mes: i+1, hsp: config.hspManual}))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{fontSize: 10}} tickFormatter={m => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]} />
                        <YAxis tick={{fontSize: 10}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                        <Bar dataKey="hsp" fill="#fbbf24" radius={[4, 4, 0, 0]}>
                           {pvgisData.map((_, index) => (
                             <Cell key={`cell-${index}`} fillOpacity={0.8} />
                           ))}
                        </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                  Gráfico de HSP média diária por mês. Esta variação impacta diretamente na geração do sistema ao longo do ano.
                </p>
              </div>

              {/* Electrical Matching */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Layers className="w-5 h-5 text-[#1E3A8A]" /> Configuração Elétrica</h3>
                 
                 <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strings</p>
                         <div className="flex items-center gap-4 mt-1">
                           <button onClick={() => setConfig({...config, numStrings: Math.max(1, config.numStrings - 1)})} className="p-1 bg-slate-100 rounded-lg"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                           <span className="text-2xl font-black">{config.numStrings}</span>
                           <button onClick={() => setConfig({...config, numStrings: config.numStrings + 1})} className="p-1 bg-slate-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulos / String</p>
                         <p className="text-2xl font-black text-[#1E3A8A]">{calculated.compatibilidade?.modulosPorString || 0}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Tensão Voc String</p>
                          <p className="text-sm font-black text-slate-800 mt-1">{calculated.compatibilidade?.vocTotal.toFixed(1)} V</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Tensão Vmp String</p>
                          <p className="text-sm font-black text-slate-800 mt-1">{calculated.compatibilidade?.vmpTotal.toFixed(1)} V</p>
                       </div>
                    </div>

                    <div className="space-y-2">
                       {calculated.compatibilidade?.warnings.length === 0 && config.selectedModuloId && (
                         <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-100">
                           <CheckCircle2 className="w-4 h-4" /> Configuração elétrica compatível!
                         </div>
                       )}
                       {calculated.compatibilidade?.warnings.map((w, i) => (
                         <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-medium border border-amber-100">
                           <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {w}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Maximize2 className="w-4 h-4 text-slate-400" />
                       <span className="text-xs text-slate-500">Overenclosure (CC/CA):</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{(calculated.kwpAtual / (inversores.find(i => i.id === config.selectedInversorId)?.potenciaNominalKW || 1)).toFixed(2)}</span>
                 </div>
              </div>
            </div>

            {/* Inverter Choice Detail */}
            <div className="bg-[#0A192F] text-white p-8 rounded-3xl shadow-lg flex flex-col md:flex-row items-center gap-8">
               <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center">
                  <ArrowRightLeft className="w-10 h-10 text-[#00BFA5]" />
               </div>
               <div className="flex-1">
                  <h3 className="text-lg font-bold">Resumo do Dimensionamento</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Com este arranjo de <strong>{calculated.qteModulos} módulos</strong> de {modulos.find(m => m.id === config.selectedModuloId)?.potenciaPicoWp}Wp e <strong>{config.numStrings} string(s)</strong>, 
                    você terá uma potência instalada de <strong>{calculated.kwpAtual.toFixed(2)} kWp</strong>.
                  </p>
                  <div className="mt-4 flex gap-4">
                     <div className="bg-white/5 px-4 py-2 rounded-xl text-center">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-tighter">Geração Estimada</p>
                        <p className="font-black text-[#00BFA5]">~{(calculated.kwpAtual * config.hspManual * 30 * config.pr).toFixed(0)} kWh/mês</p>
                     </div>
                     <div className="bg-white/5 px-4 py-2 rounded-xl text-center">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-tighter">Emissões Evitadas</p>
                        <p className="font-black">~{(calculated.kwpAtual * 0.5).toFixed(1)} Ton CO2/ano</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
