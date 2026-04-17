"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Sun, Zap, MapPin, Settings2, Info, Loader2, Save, 
  ChevronRight, BarChart3, AlertTriangle, CheckCircle2,
  Maximize2, ArrowRightLeft, Layers, Compass, MoveUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell
} from "recharts";
import { 
  calcularPotenciaNecessaria, 
  verificarCompatibilidadeEletrica 
} from "@/lib/engenharia/solarEngine";

function SolarContent() {
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
    quantidadeModulos: 0,
    tilt: 15,
    azimuth: 180, // Default Norte p/ Brasil
    overEnclosureAlvo: 1.40
  });

  const [pvgisData, setPvgisData] = useState<any[]>([]);
  
  // Custom Equipment State (Manual Input)
  const [isCustomModulo, setIsCustomModulo] = useState(false);
  const [customModulo, setCustomModulo] = useState({
    fabricante: "Genérico",
    modelo: "Custom",
    potenciaPicoWp: 550,
    Voc: 49.6,
    Vmp: 40.9,
    Isc: 14.0,
    Imp: 13.4,
    dimensoes: "2279x1134x35",
    pesoKg: 28
  });
  const [isCustomInversor, setIsCustomInversor] = useState(false);
  const [customInversor, setCustomInversor] = useState({
    fabricante: "Genérico",
    modelo: "Custom",
    potenciaNominalKW: 5,
    tensaoEntradaMinV: 100,
    tensaoEntradaMaxV: 600,
    correnteMaxCC: 12.5,
    numeroStringsMPPT: 2
  });

  // 1. Carregamento inicial de dados (Projetos e Equipamentos)
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
        const metaSugestao = searchParams.get("meta");
        const resEstudo = await fetch(`/api/engenharia/solar?projetoId=${projetoId}`);
        if (resEstudo.ok) {
          const d = await resEstudo.json();
          const base = d.base || d.estudo?.projeto;
          setProjetoBase(base);
          
          if (d.estudo) {
            const e = d.estudo;
            setConfig({
              lat: e.lat || -19.91,
              lon: e.lon || -43.93,
              hspManual: e.hspManual || 5.2,
              pr: e.pr || 0.75,
              perdaSistema: e.perdaSistema || 0.14,
              metaGeracaoKWh: e.metaGeracaoKWh || (metaSugestao ? parseFloat(metaSugestao) : 1000),
              selectedModuloId: e.selectedModuloId || "",
              selectedInversorId: e.selectedInversorId || "",
              numStrings: e.numStrings || 1,
              quantidadeModulos: e.quantidadeModulos || 0,
              tilt: e.tilt ?? 15,
              azimuth: e.azimuth ?? 180,
              overEnclosureAlvo: e.overEnclosureAlvo || 1.40
            });
          } else {
             const meta = metaSugestao ? parseFloat(metaSugestao) : (base?.analiseFatura?.consumoMedioMensalKWh || 1000);
             setConfig(prev => ({ ...prev, metaGeracaoKWh: meta }));
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [projetoId]);

  // 2. Re-simular PVGIS quando a geometria muda
  useEffect(() => {
    if (!loading && config.lat && config.lon) {
      triggerPvgisFetch(config.lat, config.lon, config.tilt, config.azimuth);
    }
  }, [config.lat, config.lon, config.tilt, config.azimuth, loading]);

  const triggerPvgisFetch = async (lat: number, lon: number, tilt: number, azimuth: number) => {
    setFetchingPvgis(true);
    try {
      const res = await fetch(`/api/engenharia/solar?action=pvgis&lat=${lat}&lon=${lon}&tilt=${tilt}&azimuth=${azimuth}`);
      if (res.ok) {
        const data = await res.json();
        const raw = data.outputs?.monthly?.fixed || [];
        const monthly = raw.map((m: any) => ({
          mes: m.month,
          hsp: m["H(i)_m"] / 30,
          energySpecific: m.E_m,
        }));
        setPvgisData(monthly);
      }
    } catch (err) { console.error(err); }
    setFetchingPvgis(false);
  };

  const fetchPvgis = async () => {
    setFetchingPvgis(true);
    const res = await fetch(`/api/engenharia/solar?action=pvgis&lat=${config.lat}&lon=${config.lon}&tilt=${config.tilt}&azimuth=${config.azimuth}`);
    if (res.ok) {
      const data = await res.json();
      // PVcalc retorna outputs.monthly.fixed com E_m (energia mensal p/ 1kWp)
      const raw = data.outputs?.monthly?.fixed || [];
      const monthly = raw.map((m: any) => ({
        mes: m.month,
        hsp: m["H(i)_m"] / 30, // Irradiação no plano inclinado
        energySpecific: m.E_m, // Energia estimada p/ 1kWp (já considera PR, Temp, IAM)
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

    const modulo = isCustomModulo ? customModulo : modulos.find(m => m.id === config.selectedModuloId);
    const inversor = isCustomInversor ? customInversor : inversores.find(i => i.id === config.selectedInversorId);

    // Ajuste de quantidade de módulos baseado no kWp
    let qteModulos = config.quantidadeModulos;
    if (modulo && qteModulos === 0) {
      qteModulos = Math.ceil((kwpNecessario * 1000) / modulo.potenciaPicoWp);
    }

    const kwpAtual = modulo ? (qteModulos * (modulo.potenciaPicoWp as number)) / 1000 : 0;

    const compatibilidade = (modulo && inversor) ? verificarCompatibilidadeEletrica({
      inversor,
      modulo,
      quantidadeModulos: qteModulos,
      numStrings: config.numStrings
    }) : null;

    // Área e Peso
    let area = 0, peso = 0;
    if (modulo && modulo.dimensoes) {
      const parts = modulo.dimensoes.split('x');
      const w = parseFloat(parts[0]) / 1000;
      const h = parseFloat(parts[1]) / 1000;
      area = w * h * qteModulos;
      peso = ((modulo as any).pesoKg || 25) * qteModulos;
    }

    const monthlyGeneration = Array.from({ length: 12 }, (_, i) => {
      const mesNum = i + 1;
      const pvgisMatch = pvgisData.find(m => m.mes === mesNum);
      
      let geracaoCalculada = 0;
      let hsp = 0;
      
      if (pvgisMatch && pvgisMatch.energySpecific) {
        hsp = pvgisMatch.hsp;
        geracaoCalculada = pvgisMatch.energySpecific * (kwpAtual || 0);
      } else {
        // Fallback: Curva senoidal sintética para o Hemisfério Sul (Norte é 180)
        // No Brasil, geração é maior em Jan/Dez (~1.1x) e menor em Jun/Jul (~0.85x)
        const sazonalidade = 1 + 0.15 * Math.cos((2 * Math.PI * (mesNum - 1)) / 12);
        hsp = (pvgisMatch ? pvgisMatch.hsp : config.hspManual) || 5.2;
        geracaoCalculada = hsp * 30 * (kwpAtual || 0) * (config.pr || 0) * sazonalidade;
      }

      const realConsumo = (projetoBase?.analiseFatura?.consumoMeses as any[])?.find((m: any) => {
         if (typeof m.mes === 'string') {
            const index = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].indexOf(m.mes);
            return index + 1 === mesNum;
         }
         return m.mes === mesNum;
      })?.kwh;

      return {
        mes: mesNum,
        hsp: Number(hsp.toFixed(2)),
        geracao: Number(geracaoCalculada.toFixed(0)),
        consumo: Number((realConsumo || config.metaGeracaoKWh || 0).toFixed(0))
      };
    });

    // Lógica de Sugestão de Inversores baseada em Fases e Precisão de Over
    const padrao = projetoBase?.analiseFatura?.padraoConexao || "TRIFASICO";
    const acPowerTarget = kwpAtual / (config.overEnclosureAlvo || 1.4);
    let sugestoes: any[] = [];

    if (kwpAtual > 0) {
      if (padrao === "TRIFASICO") {
        // Busca o inversor que deixa o over o mais próximo possível do alvo
        const options = inversores
          .filter(i => i.fase === 3 || !i.fase)
          .map(i => ({ ...i, overDiff: Math.abs((kwpAtual / i.potenciaNominalKW) - config.overEnclosureAlvo) }))
          .sort((a, b) => a.overDiff - b.overDiff);
        
        if (options[0]) sugestoes = [{ ...options[0], quantidade: 1 }];
      } else if (padrao === "BIFASICO") {
        const halfPowerTarget = acPowerTarget / 2;
        const options = inversores
          .filter(i => i.fase === 1 || i.fase === 2)
          .map(i => ({ ...i, overDiff: Math.abs(( (kwpAtual/2) / i.potenciaNominalKW) - config.overEnclosureAlvo) }))
          .sort((a, b) => a.overDiff - b.overDiff);
        
        if (options[0]) sugestoes = [{ ...options[0], quantidade: 2 }];
      } else {
        const options = inversores
          .filter(i => i.fase === 1 || !i.fase)
          .map(i => ({ ...i, overDiff: Math.abs((kwpAtual / i.potenciaNominalKW) - config.overEnclosureAlvo) }))
          .sort((a, b) => a.overDiff - b.overDiff);
        
        if (options[0]) sugestoes = [{ ...options[0], quantidade: 1 }];
      }
    }

    const overActual = sugestoes.length > 0 
      ? kwpAtual / sugestoes.reduce((acc, cur) => acc + (cur.potenciaNominalKW * cur.quantidade), 0)
      : 0;

    return { kwpNecessario, kwpAtual, qteModulos, compatibilidade, area, peso, monthlyGeneration, sugestoes, padrao, overActual };
  }, [config, modulos, inversores, isCustomModulo, customModulo, isCustomInversor, customInversor, projetoBase, pvgisData]);

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
        tilt: config.tilt,
        azimuth: config.azimuth,
        overEnclosureAlvo: config.overEnclosureAlvo,
        inversoresSugeridos: calculated.sugestoes.map(s => ({ id: s.id, quantidade: s.quantidade })),
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
            <button 
              onClick={() => router.push(`/engenharia/analise-consumo?projetoId=${projetoId}`)}
              className="text-[10px] font-black text-slate-400 hover:text-[#1E3A8A] uppercase tracking-widest mb-1 flex items-center gap-1 transition-colors"
            >
               ← Voltar para Análise de Consumo
            </button>
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

      {projetoBase && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
               <Zap className="w-5 h-5 text-[#1E3A8A]" />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Padrão do Cliente</p>
               <p className="text-sm font-bold text-[#1E3A8A]">{calculated.padrao} — {projetoBase?.analiseFatura?.concessionaria}</p>
             </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumo Médio</p>
              <p className="text-sm font-bold text-slate-700">{projetoBase?.analiseFatura?.consumoMedioMensalKWh?.toFixed(0)} kWh/mês</p>
           </div>
        </div>
      )}

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
                    <input type="number" step="0.0001" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.lat || 0} onChange={e => {
                      const val = parseFloat(e.target.value);
                      setConfig({...config, lat: isNaN(val) ? 0 : val});
                    }} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Longitude</label>
                    <input type="number" step="0.0001" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.lon || 0} onChange={e => {
                      const val = parseFloat(e.target.value);
                      setConfig({...config, lon: isNaN(val) ? 0 : val});
                    }} />
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
                  <input type="number" step="0.1" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-[#1E3A8A]" value={config.hspManual || 0} onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, hspManual: isNaN(val) ? 0 : val});
                  }} />
                </div>

                <div className="border-t border-slate-50 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Orientação (Azimute)</label>
                    <span className="text-xs font-bold text-[#1E3A8A]">{config.azimuth}°</span>
                  </div>
                  
                  <div className="flex justify-center py-2 relative group">
                    <div className="w-24 h-24 rounded-full border-2 border-slate-100 flex items-center justify-center relative bg-slate-50/50 shadow-inner">
                       <Compass className="w-full h-full text-slate-200 absolute inset-0 opacity-20" />
                       <div className="text-[8px] absolute top-1 font-black text-slate-400">N</div>
                       <div className="text-[8px] absolute bottom-1 font-black text-slate-400">S</div>
                       <div className="text-[8px] absolute left-1 font-black text-slate-400">E</div>
                       <div className="text-[8px] absolute right-1 font-black text-slate-400">W</div>
                       <div 
                         className="w-1.5 h-12 bg-gradient-to-t from-red-500 to-red-600 rounded-full transition-transform duration-500 shadow-sm"
                         style={{ transform: `rotate(${config.azimuth}deg)` }}
                       >
                         <div className="w-3 h-3 bg-white border border-red-500 rounded-full absolute -top-1 -left-0.5 shadow-sm" />
                       </div>
                    </div>
                  </div>

                  <input 
                    type="range" min="-180" max="180" step="15" 
                    className="w-full" 
                    value={config.azimuth || 0} 
                    onChange={e => setConfig({...config, azimuth: parseInt(e.target.value) || 0})} 
                  />
                  <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase">
                    <span>Leste (-90°)</span>
                    <span>Norte (180°)</span>
                    <span>Norte (-180°)</span>
                    <span>Oeste (90°)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Inclinação (Tilt)</label>
                    <span className="text-xs font-bold text-[#1E3A8A]">{config.tilt}°</span>
                  </div>
                  <div className="flex items-end gap-1 h-8 px-2 border-b border-slate-100">
                     <div 
                       className="w-12 h-0.5 bg-slate-300 origin-left transition-transform duration-300"
                       style={{ transform: `rotate(-${config.tilt}deg)` }}
                     />
                     <MoveUp className="w-3 h-3 text-amber-500 -mb-1.5" />
                  </div>
                  <input 
                    type="range" min="0" max="90" step="1" 
                    className="w-full" 
                    value={config.tilt || 0} 
                    onChange={e => setConfig({...config, tilt: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>

              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4 pt-2">
                <Settings2 className="w-5 h-5 text-[#00BFA5]" /> Dimensionamento
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Meta de Geração (kWh/mês)</label>
                  <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold" value={config.metaGeracaoKWh || 0} onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, metaGeracaoKWh: isNaN(val) ? 0 : val});
                  }} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Performance Ratio (PR)</label>
                  <input type="number" step="0.01" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.pr || 0} onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, pr: isNaN(val) ? 0 : val});
                  }} />
                  <p className="text-[10px] text-slate-400 mt-1">Padrão 0.75 (25% de perdas)</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Over-enclosure Alvo (DC/AC)</label>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <input 
                      type="number" step="0.01" min="1" max="2"
                      className="w-20 bg-transparent text-sm font-black text-[#1E3A8A] outline-none" 
                      value={config.overEnclosureAlvo || 1.4} 
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setConfig({...config, overEnclosureAlvo: isNaN(val) ? 1.4 : val});
                      }} 
                    />
                    <div className="flex gap-1">
                      {[1.2, 1.4, 1.5].map(v => (
                        <button key={v} onClick={() => setConfig({...config, overEnclosureAlvo: v})} className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${config.overEnclosureAlvo === v ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-white text-slate-400 border-slate-200'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Módulo Fotovoltaico</label>
                     <button onClick={() => setIsCustomModulo(!isCustomModulo)} className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border ${isCustomModulo ? 'bg-amber-100 text-amber-700 border-amber-200' : 'text-slate-400 border-slate-200'}`}>
                       {isCustomModulo ? 'Manual' : 'Auto'}
                     </button>
                   </div>
                   {!isCustomModulo ? (
                     <select className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.selectedModuloId} onChange={e => setConfig({...config, selectedModuloId: e.target.value, quantidadeModulos: 0})}>
                       <option value="">Selecione...</option>
                       {modulos.map(m => <option key={m.id} value={m.id}>{m.fabricante} {m.potenciaPicoWp}Wp</option>)}
                     </select>
                   ) : (
                     <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" placeholder="Wp" className="w-full px-2 py-1.5 rounded-lg border text-xs" value={customModulo.potenciaPicoWp || 0} onChange={e => {
                            const val = parseInt(e.target.value);
                            setCustomModulo({...customModulo, potenciaPicoWp: isNaN(val) ? 0 : val});
                          }} />
                          <input type="number" placeholder="Voc" className="w-full px-2 py-1.5 rounded-lg border text-xs" value={customModulo.Voc || 0} onChange={e => {
                            const val = parseFloat(e.target.value);
                            setCustomModulo({...customModulo, Voc: isNaN(val) ? 0 : val});
                          }} />
                        </div>
                        <input type="text" placeholder="Fabricante/Modelo" className="w-full px-2 py-1.5 rounded-lg border text-xs" value={`${customModulo.fabricante} ${customModulo.modelo}`} onChange={e => setCustomModulo({...customModulo, fabricante: e.target.value})} />
                     </div>
                   )}
                </div>

                <div>
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Inversor</label>
                     <button onClick={() => setIsCustomInversor(!isCustomInversor)} className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border ${isCustomInversor ? 'bg-amber-100 text-amber-700 border-amber-200' : 'text-slate-400 border-slate-200'}`}>
                       {isCustomInversor ? 'Manual' : 'Auto'}
                     </button>
                   </div>
                   {!isCustomInversor ? (
                     <div className="space-y-2">
                       <select className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm" value={config.selectedInversorId} onChange={e => setConfig({...config, selectedInversorId: e.target.value})}>
                         <option value="">Selecione...</option>
                         {inversores.filter(i => i.tipoConexao !== 'OFF_GRID').map(i => (
                           <option key={i.id} value={i.id}>
                             {i.fabricante} {i.potenciaNominalKW}kW ({i.fase === 1 ? 'Mono' : i.fase === 3 ? 'Tri' : 'Bi-fásico'})
                           </option>
                         ))}
                       </select>
                       {calculated.sugestoes.length > 0 && (
                         <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-black text-[#1E3A8A] uppercase tracking-widest flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Sugestão p/ Over {config.overEnclosureAlvo}
                              </p>
                              <span className="text-[9px] font-bold text-slate-400">Total CA: {calculated.sugestoes.reduce((acc, cur) => acc + (cur.potenciaNominalKW * cur.quantidade), 0)}kW</span>
                            </div>
                           {calculated.sugestoes.map((s, idx) => (
                             <div key={idx} className="flex items-center justify-between">
                               <span className="text-xs font-bold text-slate-700">{s.quantidade}x {s.fabricante} {s.potenciaNominalKW}kW</span>
                               {config.selectedInversorId !== s.id && (
                                 <button onClick={() => setConfig({...config, selectedInversorId: s.id})} className="text-[10px] font-black text-white bg-[#00BFA5] px-2 py-0.5 rounded-full hover:bg-[#00a690]">
                                   Usar
                                 </button>
                               )}
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" placeholder="kW" className="w-full px-2 py-1.5 rounded-lg border text-xs" value={customInversor.potenciaNominalKW || 0} onChange={e => {
                            const val = parseFloat(e.target.value);
                            setCustomInversor({...customInversor, potenciaNominalKW: isNaN(val) ? 0 : val});
                          }} />
                          <input type="number" placeholder="MPPTs" className="w-full px-2 py-1.5 rounded-lg border text-xs" value={customInversor.numeroStringsMPPT || 0} onChange={e => {
                            const val = parseInt(e.target.value);
                            setCustomInversor({...customInversor, numeroStringsMPPT: isNaN(val) ? 0 : val});
                          }} />
                        </div>
                     </div>
                   )}
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
                     <BarChart data={calculated.monthlyGeneration}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{fontSize: 10}} tickFormatter={m => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]} />
                        <YAxis tick={{fontSize: 10}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="hsp" name="HSP (Irradiação)" fill="#fbbf24" radius={[4, 4, 0, 0]}>
                           {calculated.monthlyGeneration.map((_, index) => (
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

            {/* Monthly Balance Chart */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-[#00BFA5]" /> Balanço Energético Mensal</h3>
                   <div className="flex gap-4">
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#1E3A8A] rounded-full" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Consumo</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#00BFA5] rounded-full" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Geração</span>
                     </div>
                   </div>
                </div>
                <div className="h-72">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculated.monthlyGeneration}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="mes" tick={{fontSize: 10}} tickFormatter={m => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]} />
                         <YAxis tick={{fontSize: 10}} unit="kWh" />
                         <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                         <Bar dataKey="consumo" name="Consumo (Fatura)" fill="#1E3A8A" radius={[4, 4, 0, 0]} barSize={20} />
                         <Bar dataKey="geracao" name="Geração Projetada" fill="#00BFA5" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                   <p className="text-xs text-slate-500 font-medium italic">Simulação baseada na inclinação de {config.tilt}° e azimute de {config.azimuth}°.</p>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Saldo Anual Projetado</p>
                      <p className={`text-sm font-black ${calculated.monthlyGeneration.reduce((acc, c) => acc + (c.geracao - c.consumo), 0) >= 0 ? 'text-[#00BFA5]' : 'text-red-500'}`}>
                        {calculated.monthlyGeneration.reduce((acc, c) => acc + (c.geracao - c.consumo), 0).toFixed(0)} kWh
                      </p>
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

export default function DimensionamentoSolarPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>}>
      <SolarContent />
    </Suspense>
  );
}
