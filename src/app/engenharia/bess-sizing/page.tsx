"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Battery, Zap, TrendingDown, DollarSign, Loader, Save, 
  Settings, Info, ChevronRight, BarChart, AlertTriangle, ShieldCheck,
  CheckCircle2, XCircle, Moon, Sun, ArrowLeftRight, Activity, Flame
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend
} from "recharts";
import { simularBESSAvancado, BESSAvancadoConfig, BESSApplicationType } from "@/lib/engenharia/bessSizingEngine";

function BESSNewSizingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Data lists fetched from API
  const [projetos, setProjetos] = useState<any[]>([]);
  const [projetoBase, setProjetoBase] = useState<any>(null);
  const [baterias, setBaterias] = useState<any[]>([]);
  const [inversores, setInversores] = useState<any[]>([]);
  
  // Sizing parameters
  const [solarKWp, setSolarKWp] = useState<number>(65);
  const [hspCity, setHspCity] = useState<number>(5.4);
  const [selectedBateriaId, setSelectedBateriaId] = useState("");
  const [selectedInversorId, setSelectedInversorId] = useState("");
  const [quantidadeBaterias, setQuantidadeBaterias] = useState(2);
  const [dodMax, setDodMax] = useState(0.9);
  const [eficienciaRTE, setEficienciaRTE] = useState(0.88);
  const [tecnologiaBateria, setTecnologiaBateria] = useState<'LFP' | 'NMC' | 'LeadAcid'>('LFP');
  const [tipoInversor, setTipoInversor] = useState<'HYBRID' | 'GRID_FORMING' | 'GRID_TIED'>('GRID_FORMING');
  const [isIrrigante, setIsIrrigante] = useState(false);
  
  // Motor startup inputs
  const [tipoPartidaMotor, setTipoPartidaMotor] = useState<'DIRETA' | 'SOFT_STARTER' | 'VFD'>('VFD');
  const [potenciaMotorHP, setPotenciaMotorHP] = useState<number>(0);

  // Selected applications
  const [selectedApps, setSelectedApps] = useState<BESSApplicationType[]>([
    'PEAK_SHAVING_ARBITRAGE',
    'BACKUP_CRITICAL'
  ]);

  // Sub-configurations
  const [reservaBackupPercent, setReservaBackupPercent] = useState(20);
  const [limiteInjecaoRedeKW, setLimiteInjecaoRedeKW] = useState(0);

  // Active Recharts curve tab
  const [activeChartTab, setActiveChartTab] = useState<'CARGA' | 'DEMANDA' | 'SOC' | 'SOLAR'>('CARGA');

  // Fetch baseline databases
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

            if (pBase?.estudoSolar) {
              setHspCity(pBase.estudoSolar.hspPvgis || pBase.estudoSolar.hspManual || 5.4);
              if (pBase.estudoSolar.quantidadeModulos) {
                // Estima KWp do arranjo solar
                setSolarKWp(parseFloat(((pBase.estudoSolar.quantidadeModulos * 550) / 1000).toFixed(1)));
              }
            }

            if (d.estudo) {
              setSelectedBateriaId(d.estudo.bateriaId || "");
              setSelectedInversorId(d.estudo.inversorId || "");
              setQuantidadeBaterias(d.estudo.quantidadeBaterias || 2);
              
              if (d.estudo.configSimulacao) {
                const cfg = d.estudo.configSimulacao as any;
                setSolarKWp(cfg.solarKWp || 65);
                setHspCity(cfg.hspCity || 5.4);
                setDodMax(cfg.dodMax || 0.9);
                setEficienciaRTE(cfg.eficienciaRTE || 0.88);
                setTecnologiaBateria(cfg.tecnologiaBateria || 'LFP');
                setTipoInversor(cfg.tipoInversor || 'GRID_FORMING');
                setIsIrrigante(cfg.isIrrigante || false);
                setSelectedApps(cfg.selectedApps || ['PEAK_SHAVING_ARBITRAGE', 'BACKUP_CRITICAL']);
                setReservaBackupPercent(cfg.reservaBackupPercent || 20);
                setLimiteInjecaoRedeKW(cfg.limiteInjecaoRedeKW || 0);
                setTipoPartidaMotor(cfg.tipoPartidaMotor || 'VFD');
                setPotenciaMotorHP(cfg.potenciaMotorHP || 0);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados base:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [projetoId]);

  // Dynamic system capacity, technology defaults and CAPEX sizing calculations
  const activeConfig = useMemo<BESSAvancadoConfig>(() => {
    const bat = baterias.find(b => b.id === selectedBateriaId);
    const inv = inversores.find(i => i.id === selectedInversorId);

    const capInstalada = (bat?.capacidadeNomKWh || 120) * quantidadeBaterias;
    const potInv = inv?.potenciaNominalKW || 60;

    // CAPEX Model from BESS Pro: Batteries (US$350/kWh) + Inverter (US$150/kW) * Exchange markup
    const batCost = (bat?.custoUSD || 350) * capInstalada;
    const invCost = (inv?.custoUSD || 150) * potInv;
    const totalBESSCostBRL = (batCost + invCost) * 5.25 * 1.45; // Taxes + margins + structural elements

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
      limiteInjecaoRedeKW,
      tipoPartidaMotor,
      potenciaMotorHP
    };
  }, [selectedBateriaId, selectedInversorId, quantidadeBaterias, dodMax, eficienciaRTE, tecnologiaBateria, tipoInversor, isIrrigante, selectedApps, reservaBackupPercent, limiteInjecaoRedeKW, tipoPartidaMotor, potenciaMotorHP, baterias, inversores]);

  // Synthetic Load Profile Generator & Simulation Execution
  const simulacaoResult = useMemo(() => {
    if (!projetoBase) return null;
    
    let curva: Array<{ hora: number; kw: number }> = [];
    const fatura = projetoBase.analiseFatura;

    if (projetoBase.analiseMassa?.[0]?.curvaMediaDiaria) {
      // Usa perfil de consumo real do CSV
      curva = (projetoBase.analiseMassa[0].curvaMediaDiaria as any[]).map(c => ({
        hora: c.hora,
        kw: c.kw || 0
      }));
    } else {
      // Geração de Curva de Carga Sintética baseada na Conta de Energia
      // Se não houver fatura declarada, assume consumo industrial padrão
      const consumoPonta = fatura?.consumoPontaKWh || 450;
      const consumoForaPonta = fatura?.consumoForaPontaKWh || 4200;
      const totalMensal = consumoPonta + consumoForaPonta;
      
      const consumoDiarioMedio = totalMensal / 30; // kWh diários médios
      
      // Cria perfil de carga industrial típico de 24 horas:
      // Operação ativa das 08h às 18h (alta demanda), base load à noite
      const perfilPesos: Record<number, number> = {
        0: 0.2, 1: 0.2, 2: 0.2, 3: 0.2, 4: 0.2, 5: 0.3,
        6: 0.5, 7: 0.8, 8: 1.2, 9: 1.4, 10: 1.5, 11: 1.5,
        12: 1.3, 13: 1.5, 14: 1.5, 15: 1.4, 16: 1.3, 17: 1.2,
        18: 0.9, 19: 0.8, 20: 0.7, 21: 0.4, 22: 0.3, 23: 0.2
      };

      const somaPesos = Object.values(perfilPesos).reduce((a, b) => a + b, 0);
      
      for (let h = 0; h < 24; h++) {
        const proporcao = perfilPesos[h] / somaPesos;
        curva.push({
          hora: h,
          kw: parseFloat((consumoDiarioMedio * proporcao * 24).toFixed(2)) // kW médio na hora
        });
      }
    }

    return simularBESSAvancado(curva, solarKWp, hspCity, activeConfig, fatura);
  }, [projetoBase, solarKWp, hspCity, activeConfig]);

  // Saves study back to database API
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
            limiteInjecaoRedeKW,
            tipoPartidaMotor,
            potenciaMotorHP
          },
          resultadosGrafico: simulacaoResult.series
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert("Erro ao salvar simulação.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de servidor ao salvar estudo.");
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
      <div className="flex h-[80vh] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-10 h-10 animate-spin text-[#00BFA5]" />
          <p className="text-slate-500 font-bold text-xs tracking-wider uppercase">Carregando Simulador...</p>
        </div>
      </div>
    );
  }

  const isSynthetic = !projetoBase?.analiseMassa?.[0]?.curvaMediaDiaria;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 md:px-0">
      
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#00BFA5] rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
            <Battery className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800">Dimensionamento BESS pvlib</h1>
              <span className="px-2.5 py-0.5 bg-[#EAFBF8] text-[#00BFA5] text-[9px] font-black uppercase rounded-full border border-[#00BFA5]/15">
                BESS Pro Math
              </span>
            </div>
            <p className="text-slate-500 text-sm">Modelagem solar de alta fidelidade e spread de arbitragem com RTE</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <select 
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:ring-2 focus:ring-[#00BFA5] flex-1 lg:flex-none"
            value={projetoId}
            onChange={(e) => router.push(`/engenharia/bess-sizing?projetoId=${e.target.value}`)}
          >
            <option value="">Selecione um Projeto</option>
            {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          
          <button 
            disabled={!projetoId || saving}
            onClick={handleSave}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all disabled:opacity-40 shrink-0"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {success ? "Estudo Salvo!" : "Salvar Estudo"}
          </button>
        </div>
      </div>

      {!projetoId ? (
        <div className="bg-slate-50 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
          <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Inicie o Dimensionamento</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Selecione um projeto acima para carregar automaticamente a conta de energia e/ou o arquivo de memória de massa.
          </p>
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

              {/* Data Source Info Badge */}
              {isSynthetic ? (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/50 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black text-amber-800 uppercase block">Curva Sintética Ativada</span>
                    <span className="text-[10px] text-amber-700 leading-snug block">
                      Este projeto não possui memória de massa CSV. Uma curva de carga sintética foi gerada a partir da conta de energia mensal.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/40 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase block">Memória de Massa Carregada</span>
                    <span className="text-[10px] text-emerald-700 leading-snug block">
                      Perfil de consumo importado com sucesso da memória de massa oficial de 15 minutos.
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION A: Photovoltaic System Modeling */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">A. Sistema Fotovoltaico Local</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Potência PV (kWp)</label>
                    <input 
                      type="number" min="0" step="0.5" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00BFA5]"
                      value={solarKWp}
                      onChange={(e) => setSolarKWp(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">HSP Local (kWh/m²)</label>
                    <input 
                      type="number" min="0" step="0.1" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00BFA5]"
                      value={hspCity}
                      onChange={(e) => setHspCity(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 leading-snug italic">
                  * A geração instantânea é calculada hora a hora pelo motor PVLib de alta fidelidade transposta.
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
                      type="number" min="1" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00BFA5]"
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

              {/* SECTION C: Motor startup settings (BESS Pro requirement) */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">C. Proteções de Partida de Motores</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Potência Motor (HP)</label>
                    <input 
                      type="number" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00BFA5]"
                      value={potenciaMotorHP}
                      onChange={(e) => setPotenciaMotorHP(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Método de Partida</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"
                      value={tipoPartidaMotor}
                      onChange={(e: any) => setTipoPartidaMotor(e.target.value)}
                    >
                      <option value="DIRETA">Partida Direta (6-8x)</option>
                      <option value="SOFT_STARTER">Soft Starter (2-3x)</option>
                      <option value="VFD">Inversor / VFD (1.5-2x)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION D: Regulatory & REN 1000 */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">D. Período Regulatório REN 1000</h4>
                
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

              {/* SECTION E: Applications Select */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider">E. Objetivos do BESS</h4>
                
                <div className="space-y-2">
                  {[
                    { id: 'PEAK_SHAVING_ARBITRAGE', label: '1. Arbitragem & Peak Shaving' },
                    { id: 'BACKUP_CRITICAL', label: '2. Backup Crítico (UPS)' },
                    { id: 'RENEWABLE_INTEGRATION', label: '3. Controle de Injeção Solar' },
                    { id: 'GRID_SERVICES', label: '4. Serviços de Estabilização' },
                    { id: 'DIESEL_OPTIMIZATION', label: '5. Hibridização Diesel' },
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
                        <span className="text-[10px] font-black uppercase tracking-wider">{app.label}</span>
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
                    <span className="text-[9px] text-slate-400 block leading-snug">* SoC mínimo garantido para quedas abruptas da distribuidora.</span>
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

              {/* Technical Sizing Specs Summary */}
              <div className="p-4 bg-slate-900 rounded-3xl text-white space-y-3">
                <p className="text-[9px] font-black text-[#00BFA5] uppercase tracking-wider">Dimensionamento Calculado</p>
                <div className="flex items-baseline gap-1.5 border-b border-white/10 pb-2">
                  <span className="text-3xl font-black text-white">{activeConfig.capacidadeKWh.toFixed(0)}</span>
                  <span className="text-xs text-slate-400 font-bold">kWh</span>
                  <span className="text-xs text-slate-400 font-bold">/</span>
                  <span className="text-lg font-black text-white">{activeConfig.potenciaInversorKW}</span>
                  <span className="text-xs text-slate-400 font-bold">kW</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>CAPEX Estimado (BESS Pro):</span>
                  <span className="font-bold text-[#00BFA5]">R$ {activeConfig.custoSistema.toLocaleString('pt-BR')}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Main Dashboard & Simulation Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Quick Sizing & Economic Cards */}
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
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">TIR Estimada (10a)</p>
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

            {/* Alert Panel for C-rate / Inrush (Guidelines from BESS Pro) */}
            {simulacaoResult?.mensagemAlerta && (
              <div className="p-4 bg-amber-50 rounded-3xl border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Aviso de Limites Críticos</h4>
                  <p className="text-xs text-amber-700 leading-relaxed font-medium mt-1">
                    {simulacaoResult.mensagemAlerta}
                  </p>
                </div>
              </div>
            )}

            {/* Sizing Interactive Recharts Selector */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-[#00BFA5]" /> Curvas Energéticas Horárias
                  </h3>
                  <p className="text-xs text-slate-400">Analise o comportamento sob as regras de sombreamento REN 1000</p>
                </div>
                
                {/* Visual Chart tab selectors */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto">
                  {[
                    { id: 'CARGA', label: 'Curva de Carga' },
                    { id: 'DEMANDA', label: 'Curva de Demanda' },
                    { id: 'SOC', label: 'SoC (%)' },
                    { id: 'SOLAR', label: 'Solar & Curtailment' }
                  ].map(tab => (
                    <button
                      type="button" key={tab.id}
                      onClick={() => setActiveChartTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        activeChartTab === tab.id ? 'bg-[#00BFA5] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recharts chart area */}
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
                    
                    {/* Zone Shading Area for Peak Hours (18h-21h) */}
                    <ReferenceArea x1="18:00" x2="20:00" fill="#fee2e2" fillOpacity={0.25} label={{ value: 'PONTA', fill: '#ef4444', fontSize: 9, fontWeight: 'bold', position: 'insideTop' }} />
                    
                    {/* Zone Shading Area for Irrigator Reserved Hours (22h-06h) */}
                    {isIrrigante && (
                      <ReferenceArea x1="22:00" x2="05:00" fill="#dcfce7" fillOpacity={0.2} label={{ value: 'RESERVADO (REN 1000)', fill: '#16a34a', fontSize: 9, fontWeight: 'bold', position: 'insideTop' }} />
                    )}

                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />

                    {activeChartTab === 'CARGA' && (
                      <>
                         <Area type="monotone" dataKey="consumoOriginal" stroke="#94a3b8" strokeWidth={1} fillOpacity={1} fill="url(#colorCons)" name="Carga Original" />
                         <Area type="monotone" dataKey="consumoRede" stroke="#1E3A8A" strokeWidth={3} fillOpacity={1} fill="url(#colorConsBess)" name="Carga com BESS (Solar+Bat)" />
                      </>
                    )}

                    {activeChartTab === 'DEMANDA' && (
                      <>
                         <Area type="monotone" dataKey="consumoOriginal" stroke="#94a3b8" strokeWidth={1} fill="none" name="Demanda Original" />
                         <Area type="monotone" dataKey="consumoRede" stroke="#1E3A8A" strokeWidth={3} fill="none" name="Demanda com BESS" />
                         <ReferenceLine y={activeConfig.potenciaInversorKW} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limite Demanda BESS', fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }} />
                      </>
                    )}

                    {activeChartTab === 'SOC' && (
                      <Area type="monotone" dataKey="soc" stroke="#00BFA5" strokeWidth={3} fillOpacity={1} fill="url(#colorSoc)" name="Estado de Carga Bateria (SoC %)" />
                    )}

                    {activeChartTab === 'SOLAR' && (
                      <>
                         <Area type="monotone" dataKey="geracaoSolar" stroke="#fbbf24" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSolar)" name="Solar (PVLib)" />
                         <Area type="monotone" dataKey="excedenteCurtailment" stroke="#ef4444" strokeWidth={1.5} fill="none" name="Solar Cortado (Curtailment)" />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Shading descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 border-t border-slate-50 pt-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-red-100 border border-red-200 rounded-sm shrink-0" />
                  <span><strong>Horário de Ponta (18h-21h)</strong>: Alta tarifa, descarga ideal para economia máxima.</span>
                </div>
                {isIrrigante && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-green-100 border border-green-200 rounded-sm shrink-0" />
                    <span><strong>Horário Reservado (21h30-6h)</strong>: Tarifa 75% mais barata, recarga prioritária da rede.</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-slate-100 border border-slate-200 rounded-sm shrink-0" />
                  <span><strong>Fora de Ponta</strong>: Operação diurna padrão e recarga com excedente solar.</span>
                </div>
              </div>
            </div>

            {/* Diagnostics Report for the 5 selected applications */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Relatório de Viabilidade & Dimensionamento Técnico</h3>
                <p className="text-xs text-slate-400 mt-0.5">Diagnóstico técnico customizado para as 5 aplicações</p>
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
                          <XCircle className="w-3.5 h-3.5" /> Inadequado / Desativado
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

export default function BESSNewSizingPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>}>
      <BESSNewSizingContent />
    </Suspense>
  );
}
