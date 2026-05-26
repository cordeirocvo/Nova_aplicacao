"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Battery, Zap, TrendingDown, DollarSign, Loader, Save, 
  Settings, Info, ChevronRight, BarChart, AlertTriangle, ShieldCheck,
  CheckCircle2, XCircle, Moon, Sun, ArrowLeftRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend
} from "recharts";
import { simularBESSAvancado, BESSAvancadoConfig, BESSApplicationType } from "@/lib/engenharia/bessAvancadoEngine";

function BESSAvancadoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Base Data State
  const [projetos, setProjetos] = useState<any[]>([]);
  const [projetoBase, setProjetoBase] = useState<any>(null);
  const [baterias, setBaterias] = useState<any[]>([]);
  const [inversores, setInversores] = useState<any[]>([]);
  
  // Sizing Config
  const [solarKWp, setSolarKWp] = useState<number>(50);
  const [hspCity, setHspCity] = useState<number>(5.2);
  const [selectedBateriaId, setSelectedBateriaId] = useState("");
  const [selectedInversorId, setSelectedInversorId] = useState("");
  const [quantidadeBaterias, setQuantidadeBaterias] = useState(1);
  const [dodMax, setDodMax] = useState(0.9);
  const [eficienciaRTE, setEficienciaRTE] = useState(0.88);
  const [tecnologiaBateria, setTecnologiaBateria] = useState<'LFP' | 'NMC' | 'LeadAcid'>('LFP');
  const [tipoInversor, setTipoInversor] = useState<'HYBRID' | 'GRID_FORMING' | 'GRID_TIED'>('GRID_FORMING');
  const [isIrrigante, setIsIrrigante] = useState(false);
  
  // Selected Applications
  const [selectedApps, setSelectedApps] = useState<BESSApplicationType[]>([
    'PEAK_SHAVING_ARBITRAGE',
    'BACKUP_CRITICAL'
  ]);

  // Sub-configs
  const [reservaBackupPercent, setReservaBackupPercent] = useState(25);
  const [limiteInjecaoRedeKW, setLimiteInjecaoRedeKW] = useState(0);

  // Active Chart Tab
  const [activeChartTab, setActiveChartTab] = useState<'CARGA' | 'DEMANDA' | 'SOC' | 'SOLAR'>('CARGA');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
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
            const pBase = d.base || d.estudo?.projeto;
            setProjetoBase(pBase);

            // Populate PV parameters if available from Solar Study
            if (pBase?.estudoSolar) {
              setHspCity(pBase.estudoSolar.hspPvgis || pBase.estudoSolar.hspManual || 5.2);
              if (pBase.estudoSolar.quantidadeModulos) {
                // Approximate solar capacity
                setSolarKWp(parseFloat(((pBase.estudoSolar.quantidadeModulos * 550) / 1000).toFixed(1)));
              }
            }

            if (d.estudo) {
              setSelectedBateriaId(d.estudo.bateriaId || "");
              setSelectedInversorId(d.estudo.inversorId || "");
              setQuantidadeBaterias(d.estudo.quantidadeBaterias || 1);
              
              if (d.estudo.configSimulacao) {
                const cfg = d.estudo.configSimulacao as any;
                setSolarKWp(cfg.solarKWp || 50);
                setHspCity(cfg.hspCity || 5.2);
                setDodMax(cfg.dodMax || 0.9);
                setEficienciaRTE(cfg.eficienciaRTE || 0.88);
                setTecnologiaBateria(cfg.tecnologiaBateria || 'LFP');
                setTipoInversor(cfg.tipoInversor || 'GRID_FORMING');
                setIsIrrigante(cfg.isIrrigante || false);
                setSelectedApps(cfg.selectedApps || ['PEAK_SHAVING_ARBITRAGE', 'BACKUP_CRITICAL']);
                setReservaBackupPercent(cfg.reservaBackupPercent || 25);
                setLimiteInjecaoRedeKW(cfg.limiteInjecaoRedeKW || 0);
              }
            }
          }
        }
      } catch (err) {
        console.error("Fetch initial data error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [projetoId]);

  // Handle Equipment auto-calculation of capacity & price
  const activeConfig = useMemo<BESSAvancadoConfig>(() => {
    const bat = baterias.find(b => b.id === selectedBateriaId);
    const inv = inversores.find(i => i.id === selectedInversorId);

    const capInstalada = (bat?.capacidadeNomKWh || 100) * quantidadeBaterias;
    const potInv = inv?.potenciaNominalKW || 50;

    // Approximate cost: batteries (US$350/kWh) + inverter (US$150/kW) * exchange rate * markup
    const batCost = (bat?.custoUSD || 350) * capInstalada;
    const invCost = (inv?.custoUSD || 150) * potInv;
    const totalBESSCostBRL = (batCost + invCost) * 5.25 * 1.45; // 1.45 for taxes, installation, structural elements

    return {
      capacidadeKWh: capInstalada,
      potenciaInversorKW: potInv,
      dodMax,
      eficienciaRTE,
      tecnologiaBateria,
      tipoInversor,
      custoSistema: Math.round(totalBESSCostBRL),
      isIrrigante,
      modoReservadoCEMIG: isIrrigante,
      aplicacoes: selectedApps,
      reservaBackupPercent,
      limiteInjecaoRedeKW
    };
  }, [selectedBateriaId, selectedInversorId, quantidadeBaterias, dodMax, eficienciaRTE, tecnologiaBateria, tipoInversor, isIrrigante, selectedApps, reservaBackupPercent, limiteInjecaoRedeKW, baterias, inversores]);

  // Execute Advanced Sizing Simulation
  const simulacaoResult = useMemo(() => {
    if (!projetoBase?.analiseMassa?.[0]?.curvaMediaDiaria) return null;
    const curva = projetoBase.analiseMassa[0].curvaMediaDiaria as any[];
    const fatura = projetoBase.analiseFatura;

    return simularBESSAvancado(curva, solarKWp, hspCity, activeConfig, fatura);
  }, [projetoBase, solarKWp, hspCity, activeConfig]);

  // Handle Save
  const handleSave = async () => {
    if (!projetoId || !simulacaoResult) return;
    setSaving(true);
    try {
      const res = await fetch("/api/engenharia/bess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projetoId,
          demandaAlvoKW: activeConfig.potenciaInversorKW,
          bateriaId: selectedBateriaId,
          inversorId: selectedInversorId,
          quantidadeBaterias,
          estratégia: selectedApps.join(","),
          picoReduzidoKW: 0,
          economiaMensalBESS: simulacaoResult.economiaMensalTotal,
          paybackSimples: simulacaoResult.paybackAnos,
          vpl: simulacaoResult.vpl,
          tir: simulacaoResult.tir,
          configSimulacao: {
            solarKWp,
            hspCity,
            dodMax,
            eficienciaRTE,
            tecnologiaBateria,
            tipoInversor,
            isIrrigante,
            selectedApps,
            reservaBackupPercent,
            limiteInjecaoRedeKW
          },
          resultadosGrafico: simulacaoResult.series
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert("Erro ao salvar estudo.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro sistêmico ao salvar.");
    }
    setSaving(false);
  };

  const toggleAppSelection = (id: BESSApplicationType) => {
    setSelectedApps(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#00BFA5]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#00BFA5] rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
            <Battery className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Avaliação & Dimensionamento BESS Avançado</h1>
            <p className="text-slate-500 text-sm">Modelagem PV de alta fidelidade e classificação horária REN 1000</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select 
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:ring-2 focus:ring-[#00BFA5] flex-1 md:flex-none"
            value={projetoId}
            onChange={(e) => router.push(`/engenharia/bess-avancado?projetoId=${e.target.value}`)}
          >
            <option value="">Selecione um Projeto</option>
            {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          
          <button 
            disabled={!projetoId || saving}
            onClick={handleSave}
            className="bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-900 transition-all disabled:opacity-40 shrink-0"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {success ? "Salvo com sucesso!" : "Salvar Estudo"}
          </button>
        </div>
      </div>

      {!projetoId ? (
        <div className="bg-slate-50 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
          <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Inicie um Estudo BESS Avançado</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Selecione um projeto de engenharia ativo na barra superior para carregar automaticamente a conta de energia e o perfil de carga (memória de massa).
          </p>
        </div>
      ) : !projetoBase?.analiseMassa?.[0] ? (
        <div className="bg-amber-50 rounded-3xl p-12 border border-amber-200 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-amber-800">Memória de Massa Necessária</h3>
          <p className="text-amber-700 mt-2 max-w-md mx-auto">
            Este projeto ainda não possui análise de memória de massa. O dimensionamento avançado BESS exige a curva de carga horária real importada do arquivo CSV.
          </p>
          <button 
            onClick={() => router.push(`/engenharia/analise-consumo?projetoId=${projetoId}`)} 
            className="mt-6 bg-[#E45318] hover:bg-[#c94510] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
          >
            Ir para Análise de Consumo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sizing & Modeling Configuration Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Settings className="w-5 h-5 text-[#00BFA5]" />
                <h3 className="font-bold text-slate-800 text-base">Modelagem do Sistema</h3>
              </div>

              {/* SECTION A: Photovoltaic System Modeling */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">A. Sistema Fotovoltaico Local</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Potência PV (kWp)</label>
                    <input 
                      type="number" min="0" step="0.5" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      value={solarKWp}
                      onChange={(e) => setSolarKWp(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">HSP Local (kWh/m²)</label>
                    <input 
                      type="number" min="0" step="0.1" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      value={hspCity}
                      onChange={(e) => setHspCity(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * A geração instantânea é calculada hora a hora pelo motor PVLIB embarcado.
                </p>
              </div>

              {/* SECTION B: BESS Configuration */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">B. Tecnologia de Armazenamento</h4>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Química de Bateria</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"
                    value={tecnologiaBateria}
                    onChange={(e: any) => setTecnologiaBateria(e.target.value)}
                  >
                    <option value="LFP">LFP (Lítio Ferro Fosfato) - Recomendado</option>
                    <option value="NMC">NMC (Lítio Níquel Manganês Cobalto)</option>
                    <option value="LeadAcid">Chumbo-Ácido Avançado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Inversor BESS</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"
                    value={tipoInversor}
                    onChange={(e: any) => setTipoInversor(e.target.value)}
                  >
                    <option value="GRID_FORMING">Grid-Forming (Formador de Rede / Nobreak)</option>
                    <option value="HYBRID">Inversor Híbrido Tradicional</option>
                    <option value="GRID_TIED">Grid-Tied Acoplado em CA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Bateria Disponível</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"
                    value={selectedBateriaId}
                    onChange={(e) => setSelectedBateriaId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {baterias.map(b => (
                      <option key={b.id} value={b.id}>{b.fabricante} — {b.modelo} ({b.capacidadeNomKWh}kWh)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Qtd. Módulos Bateria</label>
                    <input 
                      type="number" min="1" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      value={quantidadeBaterias}
                      onChange={(e) => setQuantidadeBaterias(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Inversor do Sistema</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"
                      value={selectedInversorId}
                      onChange={(e) => setSelectedInversorId(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {inversores.map(i => (
                        <option key={i.id} value={i.id}>{i.fabricante} — {i.modelo} ({i.potenciaNominalKW}kW)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Profundidade (DoD)</label>
                    <span className="text-xs font-bold text-slate-600">{(dodMax * 100).toFixed(0)}%</span>
                    <input 
                      type="range" min="0.5" max="1" step="0.05" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00BFA5] mt-1"
                      value={dodMax}
                      onChange={(e) => setDodMax(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Rendimento (RTE)</label>
                    <span className="text-xs font-bold text-slate-600">{(eficienciaRTE * 100).toFixed(0)}%</span>
                    <input 
                      type="range" min="0.75" max="0.98" step="0.01" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00BFA5] mt-1"
                      value={eficienciaRTE}
                      onChange={(e) => setEficienciaRTE(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: Regulatory & REN 1000 */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">C. Períodos Tarifários (REN 1000)</h4>
                
                <div className="flex items-center justify-between p-3 bg-[#EAFBF8] rounded-2xl border border-[#00BFA5]/10">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Consumidor Irrigante?</span>
                    <span className="text-[10px] text-slate-400">Ativa o horário reservado da REN 1000</span>
                  </div>
                  <input 
                    type="checkbox" className="w-4 h-4 accent-[#00BFA5] cursor-pointer"
                    checked={isIrrigante}
                    onChange={(e) => setIsIrrigante(e.target.checked)}
                  />
                </div>
              </div>

              {/* SECTION D: Applications Select */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">D. Objetivos e Estratégias</h4>
                
                <div className="space-y-2">
                  {[
                    { id: 'PEAK_SHAVING_ARBITRAGE', label: '1. Arbitragem & Peak Shaving' },
                    { id: 'BACKUP_CRITICAL', label: '2. Backup Crítico (UPS)' },
                    { id: 'RENEWABLE_INTEGRATION', label: '3. Controle de Injeção Solar' },
                    { id: 'GRID_SERVICES', label: '4. Serviços de Estabilização (Grid)' },
                    { id: 'DIESEL_OPTIMIZATION', label: '5. Hibridização c/ Gerador Diesel' },
                  ].map(app => {
                    const active = selectedApps.includes(app.id as BESSApplicationType);
                    return (
                      <button
                        type="button" key={app.id}
                        onClick={() => toggleAppSelection(app.id as BESSApplicationType)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                          active ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-wider">{app.label}</span>
                        <input 
                          type="checkbox" readOnly checked={active}
                          className="w-3.5 h-3.5 accent-[#00BFA5] rounded"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Conditional Sub-settings */}
                {selectedApps.includes('BACKUP_CRITICAL') && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Reserva de Emergência</span>
                      <span className="text-xs font-black text-slate-700">{reservaBackupPercent}%</span>
                    </div>
                    <input 
                      type="range" min="10" max="80" step="5" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]"
                      value={reservaBackupPercent}
                      onChange={(e) => setReservaBackupPercent(parseInt(e.target.value))}
                    />
                    <span className="text-[9px] text-slate-400 block">* Capacidade da bateria mantida estritamente para quedas de energia.</span>
                  </div>
                )}

                {selectedApps.includes('RENEWABLE_INTEGRATION') && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Limite Injeção Concessionária</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        value={limiteInjecaoRedeKW}
                        onChange={(e) => setLimiteInjecaoRedeKW(parseInt(e.target.value) || 0)}
                      />
                      <span className="text-xs text-slate-400 font-bold">kW</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Specs Summary Badge */}
              <div className="p-4 bg-slate-900 rounded-3xl text-white space-y-3">
                <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-wider">BESS Dimensionado</p>
                <div className="flex items-baseline gap-1.5 border-b border-white/10 pb-2">
                  <span className="text-3xl font-black text-white">{activeConfig.capacidadeKWh.toFixed(0)}</span>
                  <span className="text-xs text-slate-400 font-bold">kWh</span>
                  <span className="text-xs text-slate-400 font-bold">/</span>
                  <span className="text-lg font-black text-white">{activeConfig.potenciaInversorKW}</span>
                  <span className="text-xs text-slate-400 font-bold">kW</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>CAPEX Estimado:</span>
                  <span className="font-bold text-white">R$ {activeConfig.custoSistema.toLocaleString('pt-BR')}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Main Dashboard & Simulation Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Quick Financial Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0"><DollarSign className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Economia Mensal</p>
                  <p className="text-base font-black text-slate-800">R$ {simulacaoResult?.economiaMensalTotal.toLocaleString('pt-BR') || '0'}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0"><TrendingDown className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Payback Estimado</p>
                  <p className="text-base font-black text-slate-800">{simulacaoResult?.paybackAnos || '0'} anos</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0"><Zap className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">TIR Estimada</p>
                  <p className="text-base font-black text-emerald-600">{simulacaoResult?.tir || '0'} %</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 shrink-0"><ArrowLeftRight className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">LCOS (Custo Armaz.)</p>
                  <p className="text-base font-black text-slate-800">R$ {simulacaoResult?.lcos.toFixed(2) || '0.00'}/kWh</p>
                </div>
              </div>
            </div>

            {/* Interactive Simulation Curves Chart */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-[#00BFA5]" /> Curvas Energéticas BESS
                  </h3>
                  <p className="text-xs text-slate-400">Analise a carga local sob as regras da REN 1000</p>
                </div>
                
                {/* Selector Dropdown for active chart tab */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {[
                    { id: 'CARGA', label: 'Curva de Carga' },
                    { id: 'DEMANDA', label: 'Curva de Demanda' },
                    { id: 'SOC', label: 'SoC (%)' },
                    { id: 'SOLAR', label: 'Solar & Curtailment' }
                  ].map(tab => (
                    <button
                      type="button" key={tab.id}
                      onClick={() => setActiveChartTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeChartTab === tab.id ? 'bg-[#00BFA5] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizing Chart Section */}
              <div className="h-80 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulacaoResult?.series}>
                    <defs>
                      <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConsBess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00BFA5" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#00BFA5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="horaFormatada" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      unit={activeChartTab === 'SOC' ? ' %' : ' kW'} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    
                    {/* Shading zones for REN 1000 */}
                    {/* Horário de Ponta (18h às 21h) */}
                    <ReferenceArea x1="18:00" x2="20:00" fill="#fee2e2" fillOpacity={0.25} label={{ value: 'PONTA', fill: '#ef4444', fontSize: 9, fontWeight: 'bold', position: 'insideTop' }} />
                    
                    {/* Horário Reservado Irrigante (22h às 06h) */}
                    {isIrrigante && (
                      <ReferenceArea x1="22:00" x2="05:00" fill="#dcfce7" fillOpacity={0.2} label={{ value: 'RESERVADO (REN 1000)', fill: '#16a34a', fontSize: 9, fontWeight: 'bold', position: 'insideTop' }} />
                    )}

                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />

                    {activeChartTab === 'CARGA' && (
                      <>
                        <Area type="monotone" dataKey="consumoOriginal" stroke="#94a3b8" strokeWidth={1} fillOpacity={1} fill="url(#colorCons)" name="Demanda Original" />
                        <Area type="monotone" dataKey="consumoRede" stroke="#1E3A8A" strokeWidth={3} fillOpacity={1} fill="url(#colorConsBess)" name="Demanda com BESS" />
                      </>
                    )}

                    {activeChartTab === 'DEMANDA' && (
                      <>
                        <Area type="monotone" dataKey="consumoOriginal" stroke="#94a3b8" strokeWidth={1} fill="none" name="Demanda Original" />
                        <Area type="monotone" dataKey="consumoRede" stroke="#1E3A8A" strokeWidth={3} fill="none" name="Demanda com BESS" />
                        <ReferenceLine y={activeConfig.potenciaInversorKW} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limite BESS', fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }} />
                      </>
                    )}

                    {activeChartTab === 'SOC' && (
                      <Area type="monotone" dataKey="soc" stroke="#00BFA5" strokeWidth={3} fillOpacity={1} fill="url(#colorSoc)" name="Nível de Carga Bateria (SoC %)" />
                    )}

                    {activeChartTab === 'SOLAR' && (
                      <>
                        <Area type="monotone" dataKey="geracaoSolar" stroke="#fbbf24" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSolar)" name="Geração Solar (Fidelidade PVLIB)" />
                        <Area type="monotone" dataKey="excedenteCurtailment" stroke="#ef4444" strokeWidth={1.5} fill="none" name="Excedente de Curtailment" />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* REN 1000 Color Legend description */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 border-t border-slate-50 pt-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-red-100 border border-red-200 rounded-sm shrink-0" />
                  <span><strong>Horário de Ponta (18h-21h)</strong>: Tarifa alta, descarga prioritária para time-shifting.</span>
                </div>
                {isIrrigante && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-green-100 border border-green-200 rounded-sm shrink-0" />
                    <span><strong>Horário Reservado (21h30-6h)</strong>: Tarifa 75% mais barata, carga ideal com energia do grid.</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-slate-100 border border-slate-200 rounded-sm shrink-0" />
                  <span><strong>Fora de Ponta</strong>: Operação convencional e armazenamento do excesso solar.</span>
                </div>
              </div>

            </div>

            {/* Sizing & Feasibility Report Card for the 5 Selected Applications */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Relatório de Viabilidade & Dimensionamento</h3>
                <p className="text-xs text-slate-400 mt-0.5">Diagnóstico técnico completo para cada aplicação e tecnologia</p>
              </div>

              <div className="space-y-6 divide-y divide-slate-100">
                {simulacaoResult?.relatoriosAplicacoes.map((rep) => (
                  <div key={rep.id} className="pt-6 first:pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                        {rep.nome}
                      </h4>
                      {rep.adequado ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Adequado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Não Selecionado ou Inadequado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      <strong>Justificativa Técnica:</strong> {rep.justificativa}
                    </p>

                    {rep.adequado && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
                        <div>
                          <p className="font-black text-[#1E3A8A] text-[9px] uppercase tracking-wider mb-0.5">Dimensionamento Sugerido</p>
                          <p className="font-bold">{rep.dimensionamentoSugerido}</p>
                        </div>
                        <div>
                          <p className="font-black text-[#1E3A8A] text-[9px] uppercase tracking-wider mb-0.5">Impacto Operacional</p>
                          <p className="font-bold">{rep.impactoTecnico}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default function BESSAvancadoPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>}>
      <BESSAvancadoContent />
    </Suspense>
  );
}
