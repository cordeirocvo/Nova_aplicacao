"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Sun, Zap, MapPin, Settings, Info, Loader, Save, 
  ChevronRight, BarChart as BarChartIcon, AlertTriangle, CheckCircle,
  Maximize, ArrowRight, Layers, Compass, MoveUp, Activity, Plus,
  Battery, User, Building2, Calendar, FileText, Sparkles
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LabelList
} from "recharts";
import { 
  calcularPotenciaNecessaria, 
  verificarCompatibilidadeEletrica 
} from "@/lib/engenharia/solarEngine";
import { ModalCadastrarModulo } from "@/components/engenharia/ModalCadastrarModulo";
import { ModalCadastrarInversor } from "@/components/engenharia/ModalCadastrarInversor";
import { SimuladorBESSDinamico } from "@/components/engenharia/SimuladorBESSDinamico";

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MESES_SIGLAS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function SolarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projetoId = searchParams.get("projetoId") || "";

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'SOLAR' | 'BESS_DINAMICO'>('SOLAR');

  const [loading, setLoading] = useState(true);
  const [fetchingPvgis, setFetchingPvgis] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modals for Equipment Registration with Datasheets
  const [modalModuloOpen, setModalModuloOpen] = useState(false);
  const [modalInversorOpen, setModalInversorOpen] = useState(false);
  
  // Data State
  const [projetos, setProjetos] = useState<any[]>([]);
  const [projetoBase, setProjetoBase] = useState<any>(null);
  const [modulos, setModulos] = useState<any[]>([]);
  const [inversores, setInversores] = useState<any[]>([]);
  
  // Client & Location Metadata
  const [nomeCliente, setNomeCliente] = useState("");
  const [cidadeProjeto, setCidadeProjeto] = useState("");
  const [cidadeSolar, setCidadeSolar] = useState("");

  // 12 Months Consumption Inputs (kWh)
  const [consumo12Meses, setConsumo12Meses] = useState<number[]>([
    1000, 1000, 1000, 1000, 1000, 1000,
    1000, 1000, 1000, 1000, 1000, 1000
  ]);

  // Calculated 12-month average consumption
  const mediaConsumo12Meses = useMemo(() => {
    const sum = consumo12Meses.reduce((acc, curr) => acc + (curr || 0), 0);
    return Math.round(sum / 12);
  }, [consumo12Meses]);

  // Simulation Config
  const [config, setConfig] = useState({
    lat: -19.91,
    lon: -43.93,
    hspManual: 5.2,
    pr: 0.75, // Performance Ratio
    perdaSistema: 0.14,
    selectedModuloId: "",
    selectedInversorId: "",
    numStrings: 1,
    quantidadeModulos: 0,
    tilt: 15,
    azimuth: 0, // 0° = Norte no Brasil
    overPercent: 30, // 30% overdimensionamento (Ratio DC/AC = 1.30)
  });

  const [pvgisData, setPvgisData] = useState<any[]>([]);

  // 1. Initial Data Fetching
  const fetchData = async () => {
    setLoading(true);
    const [resProj, resMod, resInv] = await Promise.all([
      fetch("/api/engenharia/projetos"),
      fetch("/api/engenharia/equipamentos/modulos"),
      fetch("/api/engenharia/equipamentos/inversores")
    ]);
    
    let modData: any[] = [];
    let invData: any[] = [];

    if (resProj.ok) setProjetos(await resProj.json());
    if (resMod.ok) {
      modData = await resMod.json();
      setModulos(modData);
    }
    if (resInv.ok) {
      invData = await resInv.json();
      setInversores(invData);
    }
    
    if (projetoId) {
      const resEstudo = await fetch(`/api/engenharia/solar?projetoId=${projetoId}`);
      if (resEstudo.ok) {
        const d = await resEstudo.json();
        const base = d.base || d.estudo?.projeto;
        setProjetoBase(base);

        if (base) {
          if (base.cliente) setNomeCliente(base.cliente);
          if (base.cidade) setCidadeProjeto(base.cidade);

          // Populates 12 months consumption if present in invoice analysis
          const fatura = base.analiseFatura;
          if (fatura) {
            if (fatura.endereco && !cidadeProjeto) {
              setCidadeProjeto(fatura.endereco.split('-')[0] || fatura.endereco);
            }
            if (fatura.nomeCliente && !nomeCliente) {
              setNomeCliente(fatura.nomeCliente);
            }

            if (fatura.consumoMeses && Array.isArray(fatura.consumoMeses) && fatura.consumoMeses.length > 0) {
              const arr = Array.from({ length: 12 }, (_, i) => {
                const mesMatch = fatura.consumoMeses.find((m: any) => {
                  if (typeof m.mes === 'number') return m.mes === i + 1;
                  if (typeof m.mes === 'string') {
                    const prefix = m.mes.substring(0, 3).toUpperCase();
                    return MESES_SIGLAS[i].toUpperCase() === prefix;
                  }
                  return false;
                });
                return mesMatch?.kwh || fatura.consumoMedioMensalKWh || 1000;
              });
              setConsumo12Meses(arr);
            } else if (fatura.consumoMedioMensalKWh) {
              setConsumo12Meses(Array(12).fill(Math.round(fatura.consumoMedioMensalKWh)));
            }
          }
        }

        if (d.estudo) {
          const e = d.estudo;
          setConfig(prev => ({
            ...prev,
            lat: e.lat || -19.91,
            lon: e.long || -43.93,
            hspManual: e.hspManual || 5.2,
            pr: e.pr || 0.75,
            perdaSistema: e.perdaSistema || 0.14,
            selectedModuloId: e.moduloId || (modData[0]?.id || ""),
            selectedInversorId: e.inversorId || (invData[0]?.id || ""),
            numStrings: e.numStrings || 1,
            quantidadeModulos: e.quantidadeModulos || 0,
            tilt: e.tilt ?? 15,
            azimuth: e.azimuth ?? 0,
            overPercent: e.overEnclosureAlvo ? Math.round((e.overEnclosureAlvo - 1) * 100) : 30
          }));
        } else {
          setConfig(prev => ({
            ...prev,
            selectedModuloId: prev.selectedModuloId || (modData[0]?.id || ""),
            selectedInversorId: prev.selectedInversorId || (invData[0]?.id || "")
          }));
        }
      }
    } else {
      if (modData.length > 0) setConfig(prev => ({ ...prev, selectedModuloId: modData[0].id }));
      if (invData.length > 0) setConfig(prev => ({ ...prev, selectedInversorId: invData[0].id }));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projetoId]);

  // 2. Query Solar Irradiance from PVLIB / PVGIS
  const fetchPVLIBData = async () => {
    setFetchingPvgis(true);
    try {
      let queryUrl = `/api/engenharia/solar?action=pvgis&lat=${config.lat}&lon=${config.lon}&tilt=${config.tilt}&azimuth=${config.azimuth}`;
      if (cidadeSolar) {
        queryUrl = `/api/engenharia/irradiacao?endereco=${encodeURIComponent(cidadeSolar)}`;
      }
      
      const res = await fetch(queryUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          setConfig(prev => ({ ...prev, lat: data.lat, lon: data.lng }));
        }

        const raw = data.mensal || data.outputs?.monthly?.fixed || [];
        const monthly = raw.map((m: any) => ({
          mes: m.month || m.mes,
          hsp: (m["H(i)_m"] ? m["H(i)_m"] / 30 : m.hsp) || 5.2,
          energySpecific: m.E_m || 0,
        }));

        if (monthly.length > 0) {
          setPvgisData(monthly);
          const avgHsp = data.hsp || (monthly.reduce((acc: number, cur: any) => acc + cur.hsp, 0) / 12);
          setConfig(prev => ({ ...prev, hspManual: parseFloat(avgHsp.toFixed(2)) }));
        }
      } else {
        alert("Não foi possível consultar os dados solarimétricos PVLIB. Verifique a cidade ou coordenadas.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao buscar dados PVLIB.");
    } finally {
      setFetchingPvgis(false);
    }
  };

  // Re-fetch PVGIS when geometry changes
  useEffect(() => {
    if (!loading && config.lat && config.lon) {
      fetchPVLIBData();
    }
  }, [config.lat, config.lon, config.tilt, config.azimuth, loading]);

  // Main Solar Sizing Calculations
  const calculated = useMemo(() => {
    const kwpNecessario = calcularPotenciaNecessaria({
      metaGeracaoMensalKWh: mediaConsumo12Meses,
      hspCity: config.hspManual,
      pr: config.pr
    });

    const modulo = modulos.find(m => m.id === config.selectedModuloId) || modulos[0];
    const inversor = inversores.find(i => i.id === config.selectedInversorId) || inversores[0];

    // Calculated modules count
    let qteModulos = config.quantidadeModulos;
    if (modulo && (qteModulos === 0 || !qteModulos)) {
      qteModulos = Math.ceil((kwpNecessario * 1000) / modulo.potenciaPicoWp);
    }

    const kwpAtual = modulo ? (qteModulos * (modulo.potenciaPicoWp as number)) / 1000 : 0;

    // Inverter Oversizing Ratio Calculation
    const targetOverRatio = 1 + (config.overPercent / 100);
    const inverterPowerTargetKW = kwpAtual / targetOverRatio;

    let overActualPercent = 0;
    if (inversor && inversor.potenciaNominalKW > 0) {
      overActualPercent = Math.round(((kwpAtual / inversor.potenciaNominalKW) - 1) * 100);
    }

    // Electrical String Compatibility
    const compatibilidade = (modulo && inversor) ? verificarCompatibilidadeEletrica({
      inversor,
      modulo,
      quantidadeModulos: qteModulos,
      numStrings: config.numStrings
    }) : null;

    // Physical Footprint
    let area = 0, peso = 0;
    if (modulo && modulo.dimensoes) {
      const parts = modulo.dimensoes.split('x');
      if (parts.length >= 2) {
        const w = parseFloat(parts[0]) / 1000;
        const h = parseFloat(parts[1]) / 1000;
        area = Math.round(w * h * qteModulos * 10) / 10;
      }
      peso = Math.round(((modulo.pesoKg || 27) * qteModulos));
    }

    // 12-Month Generation Curve vs 12-Month Consumption
    const monthlyGeneration = Array.from({ length: 12 }, (_, i) => {
      const mesNum = i + 1;
      const pvgisMatch = pvgisData.find(m => m.mes === mesNum);
      const consumoMes = consumo12Meses[i] || mediaConsumo12Meses;

      let geracaoCalculada = 0;
      let hsp = 0;

      if (pvgisMatch && pvgisMatch.energySpecific) {
        hsp = pvgisMatch.hsp;
        geracaoCalculada = pvgisMatch.energySpecific * (kwpAtual || 0);
      } else {
        const sazonalidade = 1 + 0.15 * Math.cos((2 * Math.PI * (mesNum - 1)) / 12);
        hsp = (pvgisMatch ? pvgisMatch.hsp : config.hspManual) || 5.2;
        geracaoCalculada = hsp * 30 * (kwpAtual || 0) * (config.pr || 0) * sazonalidade;
      }

      return {
        mes: mesNum,
        mesNome: MESES_NOMES[i],
        mesSigla: MESES_SIGLAS[i],
        hsp: Number(hsp.toFixed(2)),
        geracao: Math.round(geracaoCalculada),
        consumo: Math.round(consumoMes),
        saldo: Math.round(geracaoCalculada - consumoMes)
      };
    });

    const geracaoAnualTotal = monthlyGeneration.reduce((acc, curr) => acc + curr.geracao, 0);
    const consumoAnualTotal = monthlyGeneration.reduce((acc, curr) => acc + curr.consumo, 0);
    const coberturaAnualPercent = Math.round((geracaoAnualTotal / (consumoAnualTotal || 1)) * 100);

    return { 
      kwpNecessario, 
      kwpAtual, 
      qteModulos, 
      inverterPowerTargetKW,
      overActualPercent, 
      compatibilidade, 
      area, 
      peso, 
      monthlyGeneration, 
      geracaoAnualTotal,
      consumoAnualTotal,
      coberturaAnualPercent,
      modulo,
      inversor
    };
  }, [config, modulos, inversores, consumo12Meses, mediaConsumo12Meses, pvgisData]);

  // Handle Save Solar Sizing
  const handleSave = async () => {
    if (!projetoId) return;
    setSaving(true);
    try {
      await fetch("/api/engenharia/solar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projetoId,
          lat: Number(config.lat),
          long: Number(config.lon),
          hspManual: Number(config.hspManual),
          pr: Number(config.pr),
          geracaoAlvoKWh: Number(mediaConsumo12Meses),
          potenciaNecessariaKWp: Number(calculated.kwpNecessario),
          moduloId: config.selectedModuloId,
          inversorId: config.selectedInversorId,
          quantidadeModulos: Number(calculated.qteModulos),
          numStrings: Number(config.numStrings),
          modulosPorString: Number(calculated.compatibilidade?.modulosPorString || 0),
          tilt: Number(config.tilt),
          azimuth: Number(config.azimuth),
          overEnclosureAlvo: 1 + (config.overPercent / 100),
          areaOcupadaM2: Number(calculated.area),
          pesoTotalKg: Number(calculated.peso)
        })
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Erro ao salvar estudo solar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#00BFA5]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Sun className="w-7 h-7" />
          </div>
          <div>
            <button 
              onClick={() => router.push(`/engenharia`)}
              className="text-[10px] font-black text-slate-400 hover:text-[#1E3A8A] uppercase tracking-widest mb-1 flex items-center gap-1 transition-colors"
            >
               ← Central de Engenharia
            </button>
            <h1 className="text-2xl font-black text-slate-800">Dimensionamento Solar FV & BESS</h1>
            <p className="text-slate-500 text-sm">Cálculo de Consumo, Geração PVLIB e Simulação Híbrida de Baterias</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            className="bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-blue-900 transition-all disabled:opacity-40 shadow-sm"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : (savedSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />)}
            {savedSuccess ? "Salvo!" : "Salvar Estudo"}
          </button>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('SOLAR')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'SOLAR'
              ? 'border-[#00BFA5] text-[#1E3A8A]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" /> 1. Dimensionamento Fotovoltaico (Solar FV)
        </button>

        <button
          onClick={() => setActiveTab('BESS_DINAMICO')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'BESS_DINAMICO'
              ? 'border-[#00BFA5] text-[#1E3A8A]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Battery className="w-4 h-4 text-[#00BFA5]" /> 2. Simulação Dinâmica de BESS (Operação 24h)
        </button>
      </div>

      {/* TAB 1: SOLAR SIZING TOOL */}
      {activeTab === 'SOLAR' && (
        <div className="space-y-6">
          
          {/* Section 1: Customer Metadata & 12-Month Consumption Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-[#1E3A8A]" /> Cadastro do Projeto & Histórico de Consumo (12 Meses)
              </h2>

              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Média dos 12 Meses</p>
                  <p className="text-lg font-black text-emerald-900">{mediaConsumo12Meses.toLocaleString('pt-BR')} kWh/mês</p>
                </div>
              </div>
            </div>

            {/* Inputs: Customer Name & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Nome do Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva / Indústria Alfa S.A."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm font-bold text-slate-800"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Cidade para Cadastro do Projeto
                </label>
                <input
                  type="text"
                  placeholder="Ex: Belo Horizonte - MG"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm font-bold text-slate-800"
                  value={cidadeProjeto}
                  onChange={(e) => setCidadeProjeto(e.target.value)}
                />
              </div>
            </div>

            {/* 12 Months Consumption Grid Inputs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-amber-500" /> Consumo Mensal dos Últimos 12 Meses (kWh)
                </label>

                <div className="flex gap-2">
                  {projetoBase?.analiseFatura?.consumoMeses?.length > 0 && (
                    <button
                      onClick={() => {
                        const fat = projetoBase.analiseFatura.consumoMeses;
                        const arr = Array.from({ length: 12 }, (_, i) => fat[i]?.kwh || fat[0]?.kwh || 1000);
                        setConsumo12Meses(arr);
                      }}
                      className="text-[10px] font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100"
                    >
                      Restaurar da Fatura
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const val = prompt("Digite um consumo mensal fixo para aplicar aos 12 meses (kWh):", String(mediaConsumo12Meses));
                      if (val) {
                        const num = parseFloat(val) || 0;
                        setConsumo12Meses(Array(12).fill(num));
                      }
                    }}
                    className="text-[10px] font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    Fixar Valor Único
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {consumo12Meses.map((val, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                    <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                      {idx + 1}. {MESES_SIGLAS[idx]}
                    </span>
                    <input
                      type="number"
                      step="1"
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-[#00BFA5] outline-none"
                      value={val}
                      onChange={(e) => {
                        const newArr = [...consumo12Meses];
                        newArr[idx] = parseFloat(e.target.value) || 0;
                        setConsumo12Meses(newArr);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Section 2: Location, PVLIB Solar Index & Sizing Parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Column: Location, PVLIB API, Over-enclosure & Parameters */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                  <MapPin className="w-5 h-5 text-amber-500" /> Irradiação (PVLIB) & Local
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cidade para Índice Solar</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Montes Claros, MG"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                        value={cidadeSolar}
                        onChange={(e) => setCidadeSolar(e.target.value)}
                      />
                      <button
                        onClick={fetchPVLIBData}
                        disabled={fetchingPvgis}
                        className="px-3 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {fetchingPvgis ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                        PVLIB
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-medium"
                        value={config.lat || 0}
                        onChange={e => setConfig({ ...config, lat: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-medium"
                        value={config.lon || 0}
                        onChange={e => setConfig({ ...config, lon: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Irradiação HSP Médica</span>
                    <div className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 px-2 py-1 rounded-lg border border-amber-300 text-sm font-black text-amber-900 bg-white text-right"
                        value={config.hspManual}
                        onChange={e => setConfig({ ...config, hspManual: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="block text-[9px] text-amber-700 font-medium">kWh/m²/dia</span>
                    </div>
                  </div>

                  {/* Overpaneling (Over %) Input */}
                  <div className="border-t border-slate-50 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Over de Módulos (%)</label>
                      <span className="text-xs font-black text-[#1E3A8A]">{config.overPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      className="w-full"
                      value={config.overPercent}
                      onChange={e => setConfig({ ...config, overPercent: parseInt(e.target.value) || 0 })}
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>0% (Sem Over)</span>
                      <span>30% (Standard)</span>
                      <span>60% (Alto)</span>
                    </div>
                  </div>

                  {/* Geometry: Tilt & Azimuth */}
                  <div className="border-t border-slate-50 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Orientação (Azimute)</label>
                      <span className="text-xs font-bold text-slate-700">{config.azimuth}° (Norte=0°)</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="15"
                      className="w-full"
                      value={config.azimuth}
                      onChange={e => setConfig({ ...config, azimuth: parseInt(e.target.value) || 0 })}
                    />

                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Inclinação (Tilt)</label>
                      <span className="text-xs font-bold text-slate-700">{config.tilt}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="1"
                      className="w-full"
                      value={config.tilt}
                      onChange={e => setConfig({ ...config, tilt: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                </div>

              </div>
            </div>

            {/* Right Column: Module & Inverter Selection + Sizing Dashboard Cards + Charts */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Module & Inverter Selection Card with Datasheet Registration Buttons */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                  <Settings className="w-5 h-5 text-[#00BFA5]" /> Seleção de Componentes & Datasheet
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Photovoltaic Module Selection */}
                  <div className="space-y-3 bg-amber-50/40 p-4 rounded-2xl border border-amber-100/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-amber-900 uppercase flex items-center gap-1">
                        <Sun className="w-4 h-4 text-amber-500" /> Módulo Fotovoltaico
                      </label>
                      <button
                        onClick={() => setModalModuloOpen(true)}
                        className="text-[10px] font-bold px-2.5 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Plus className="w-3 h-3" /> Datasheet Módulo
                      </button>
                    </div>

                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      value={config.selectedModuloId}
                      onChange={e => setConfig({ ...config, selectedModuloId: e.target.value })}
                    >
                      {modulos.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.fabricante} {m.modelo} — {m.potenciaPicoWp}Wp (Voc: {m.Voc}V | Vmp: {m.Vmp}V)
                        </option>
                      ))}
                    </select>

                    {calculated.modulo && (
                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-2 pt-1 font-medium">
                        <span>Potência: <strong className="text-slate-800">{calculated.modulo.potenciaPicoWp} Wp</strong></span>
                        <span>Eficiência: <strong className="text-slate-800">{calculated.modulo.eficiencia}%</strong></span>
                        <span>Voc: <strong className="text-slate-800">{calculated.modulo.Voc} V</strong></span>
                        <span>Isc: <strong className="text-slate-800">{calculated.modulo.Isc} A</strong></span>
                        {calculated.modulo.datasheetUrl && (
                          <div className="col-span-2 pt-1">
                            <a
                              href={calculated.modulo.datasheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-700 font-bold underline hover:text-amber-900 text-[10px] flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Abrir Datasheet do Módulo (PDF)
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inverter Selection */}
                  <div className="space-y-3 bg-blue-50/40 p-4 rounded-2xl border border-blue-100/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-blue-900 uppercase flex items-center gap-1">
                        <Zap className="w-4 h-4 text-blue-600" /> Inversor Fotovoltaico
                      </label>
                      <button
                        onClick={() => setModalInversorOpen(true)}
                        className="text-[10px] font-bold px-2.5 py-1 bg-[#1E3A8A] text-white rounded-lg hover:bg-blue-900 flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Plus className="w-3 h-3" /> Datasheet Inversor
                      </button>
                    </div>

                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1E3A8A] outline-none"
                      value={config.selectedInversorId}
                      onChange={e => setConfig({ ...config, selectedInversorId: e.target.value })}
                    >
                      {inversores.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.fabricante} {i.modelo} — {i.potenciaNominalKW} kW ({i.fase === 3 ? 'Trifásico' : 'Monofásico'} | MPPT: {i.tensaoEntradaMinV}-{i.tensaoEntradaMaxV}V)
                        </option>
                      ))}
                    </select>

                    {calculated.inversor && (
                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-2 pt-1 font-medium">
                        <span>Potência Nom.: <strong className="text-slate-800">{calculated.inversor.potenciaNominalKW} kW</strong></span>
                        <span>MPPT Range: <strong className="text-slate-800">{calculated.inversor.tensaoEntradaMinV}-{calculated.inversor.tensaoEntradaMaxV} V</strong></span>
                        <span>Nº Strings/MPPT: <strong className="text-slate-800">{calculated.inversor.numeroStringsMPPT || 2}</strong></span>
                        <span>Over Real: <strong className={calculated.overActualPercent > 45 ? "text-amber-600" : "text-emerald-600"}>{calculated.overActualPercent}%</strong></span>
                        {calculated.inversor.datasheetUrl && (
                          <div className="col-span-2 pt-1">
                            <a
                              href={calculated.inversor.datasheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-800 font-bold underline hover:text-blue-900 text-[10px] flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Abrir Datasheet do Inversor (PDF)
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* String Configuration Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nº Módulos Ajustado</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs"
                      value={calculated.qteModulos}
                      onChange={e => setConfig({ ...config, quantidadeModulos: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Número de Strings</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs"
                      value={config.numStrings}
                      onChange={e => setConfig({ ...config, numStrings: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Módulos / String</label>
                    <p className="font-bold text-slate-800 text-sm py-1.5">{calculated.compatibilidade?.modulosPorString || 0} unid.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Área & Peso Total</label>
                    <p className="font-bold text-slate-800 text-xs py-1.5">{calculated.area} m² / {calculated.peso} kg</p>
                  </div>
                </div>

              </div>

              {/* Sizing Results KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Potência Pico (kWp)</p>
                  <p className="text-2xl font-black text-amber-900 mt-1">{calculated.kwpAtual.toFixed(2)} kWp</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">{calculated.qteModulos} módulos de {calculated.modulo?.potenciaPicoWp}Wp</p>
                </div>

                <div className="bg-blue-50/70 border border-blue-200/60 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Inversor Recomendado</p>
                  <p className="text-2xl font-black text-[#1E3A8A] mt-1">{calculated.inversor?.potenciaNominalKW || 0} kW</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">Over: {calculated.overActualPercent}% (Alvo: {config.overPercent}%)</p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/60 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Geração Estimada</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">
                    ~{Math.round(calculated.kwpAtual * config.hspManual * 30 * config.pr).toLocaleString('pt-BR')} kWh/mês
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Anual: {calculated.geracaoAnualTotal.toLocaleString('pt-BR')} kWh</p>
                </div>

                <div className="bg-purple-50/70 border border-purple-200/60 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-purple-800 uppercase tracking-widest">Cobertura da Fatura</p>
                  <p className="text-2xl font-black text-purple-900 mt-1">{calculated.coberturaAnualPercent}%</p>
                  <p className="text-[10px] text-purple-700 mt-0.5">Saldo Anual: {(calculated.geracaoAnualTotal - calculated.consumoAnualTotal).toLocaleString('pt-BR')} kWh</p>
                </div>
              </div>

              {/* Recharts Bar Chart: 12-Month Generation vs 12-Month Consumption */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BarChartIcon className="w-5 h-5 text-[#00BFA5]" /> Curva de Geração Mensal vs Consumo Fatura (12 Meses)
                  </h3>

                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-[#1E3A8A] rounded-md" />
                      <span className="text-slate-600">Consumo (kWh)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-[#00BFA5] rounded-md" />
                      <span className="text-slate-600">Geração PVLIB (kWh)</span>
                    </div>
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={calculated.monthlyGeneration}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mesSigla" tick={{ fontSize: 11, fontWeight: 'bold' }} stroke="#64748B" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#64748B" unit=" kWh" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="consumo" name="Consumo Fatura (kWh)" fill="#1E3A8A" radius={[4, 4, 0, 0]} barSize={22} />
                      <Bar dataKey="geracao" name="Geração PVLIB (kWh)" fill="#00BFA5" radius={[4, 4, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: DYNAMIC BESS SIMULATOR (24h) */}
      {activeTab === 'BESS_DINAMICO' && (
        <SimuladorBESSDinamico
          solarKWpDefault={calculated.kwpAtual || 100}
          hspDefault={config.hspManual || 5.2}
          latDefault={config.lat}
          lonDefault={config.lon}
        />
      )}

      {/* Modals for Equipment Datasheet Registration */}
      <ModalCadastrarModulo
        isOpen={modalModuloOpen}
        onClose={() => setModalModuloOpen(false)}
        onSuccess={(newMod) => {
          setModulos(prev => [...prev, newMod]);
          setConfig(prev => ({ ...prev, selectedModuloId: newMod.id }));
        }}
      />

      <ModalCadastrarInversor
        isOpen={modalInversorOpen}
        onClose={() => setModalInversorOpen(false)}
        onSuccess={(newInv) => {
          setInversores(prev => [...prev, newInv]);
          setConfig(prev => ({ ...prev, selectedInversorId: newInv.id }));
        }}
      />

    </div>
  );
}

export default function DimensionamentoSolarPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>}>
      <SolarContent />
    </Suspense>
  );
}
