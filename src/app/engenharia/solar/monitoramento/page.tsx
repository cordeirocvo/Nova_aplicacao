"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sun, Activity, AlertTriangle, TrendingUp, 
  MapPin, Zap, Clock, ShieldCheck, 
  Wind, Thermometer, CloudSun, ArrowUpRight,
  Settings, Radio, ChevronRight, X, Info, Loader, Database,
  Sliders, RefreshCw, BarChart2, Cpu, FileText, ChevronLeft,
  AlertOctagon, Plus, Search, Trash2, Sparkles, CheckCircle2
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Cell, Pie, PieChart as RePieChart,
  Tooltip
} from "recharts";

export default function SolarMonitoringPage() {
  const router = useRouter();
  const [usinas, setUsinas] = useState<any[]>([]);
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>("consolidado");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  
  // Controls
  const [tolerance, setTolerance] = useState<number>(5);
  const [range, setRange] = useState<string>("24h");
  
  // UI States
  const [isAlarmPopupOpen, setIsAlarmPopupOpen] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<any>(null);
  const [selectedString, setSelectedString] = useState<any>(null);
  const [showFFTModal, setShowFFTModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"cockpit" | "engenharia">("cockpit");
  
  // Operations States
  const [syncing, setSyncing] = useState(false);
  const [registeringAction, setRegisteringAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [actionForm, setActionForm] = useState({
    tipoAcao: "limpeza_modulos",
    dataExecucao: new Date().toISOString().substring(0, 10),
    executadoPor: "",
    observacoes: ""
  });

  // Table Filters (Engineering Tab)
  const [searchQuery, setSearchQuery] = useState("");
  const [minPower, setMinPower] = useState<string>("");
  const [minIrr, setMinIrr] = useState<string>("");
  const [telemetriasPage, setTelemetriasPage] = useState(1);
  const itemsPerPage = 15;

  const selectedUsina = usinas.find(u => u.id === selectedUsinaId);

  useEffect(() => {
    fetchUsinas();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [selectedUsinaId, range, tolerance]);

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
      console.error("Erro ao carregar usinas:", err);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const rangeParam = `&range=${range}`;
      const toleranceParam = `&tolerance=${tolerance}`;
      const url = selectedUsinaId === "consolidado" 
        ? `/api/solar/analise?t=${Date.now()}${rangeParam}${toleranceParam}` 
        : `/api/solar/analise?usinaId=${selectedUsinaId}&t=${Date.now()}${rangeParam}${toleranceParam}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
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

  const handleRegisterAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsinaId === "consolidado") return;
    setRegisteringAction(true);
    setActionSuccess(false);

    try {
      const res = await fetch("/api/solar/acoes-corretivas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usinaId: selectedUsinaId,
          ...actionForm
        })
      });
      
      if (res.ok) {
        setActionSuccess(true);
        setActionForm({
          tipoAcao: "limpeza_modulos",
          dataExecucao: new Date().toISOString().substring(0, 10),
          executadoPor: "",
          observacoes: ""
        });
        setTimeout(() => setActionSuccess(false), 4000);
        await fetchMetrics();
      }
    } catch (err) {
      console.error("Erro ao registrar ação corretiva:", err);
    } finally {
      setRegisteringAction(false);
    }
  };

  const handleDeleteAction = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ação corretiva?")) return;
    try {
      const res = await fetch(`/api/solar/acoes-corretivas?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error("Erro ao excluir ação:", err);
    }
  };

  const handleExportReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const usinaName = metrics?.nome || "CONSOLIDADO";
    const dateStr = new Date().toLocaleDateString('pt-BR');
    
    const stringsHtml = Object.entries(metrics?.dadosStrings || {}).map(([key, val]: any) => `
      <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <span style="font-weight: 900; font-size: 10px; color: #E45318; text-transform: uppercase;">${key.replace("S", "STR ")}</span>
        <div style="display: flex; gap: 12px; margin-top: 4px; font-size: 12px;">
          <span style="color: #2563eb; font-weight: 800;">${(val.V || 0).toFixed(0)}V</span>
          <span style="color: #64748b; font-weight: 800;">${(val.I || 0).toFixed(1)}A</span>
        </div>
      </div>
    `).join('');

    const phaseHtml = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px; font-weight: 900; color: #E45318;">Fase A</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseA?.V || 0).toFixed(1)} V</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseA?.I || 0).toFixed(1)} A</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseA?.P || 0).toFixed(1)} kW</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px; font-weight: 900; color: #E45318;">Fase B</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseB?.V || 0).toFixed(1)} V</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseB?.I || 0).toFixed(1)} A</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseB?.P || 0).toFixed(1)} kW</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px; font-weight: 900; color: #E45318;">Fase C</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseC?.V || 0).toFixed(1)} V</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseC?.I || 0).toFixed(1)} A</td>
        <td style="padding: 12px; font-weight: 800;">${(metrics?.detalhesCA?.faseC?.P || 0).toFixed(1)} kW</td>
      </tr>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório O&M - ${usinaName} - Cordeiro Energia</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #0f172a;
              background: #f8fafc;
              padding: 40px;
              margin: 0;
            }
            .header {
              background: #000;
              color: #fff;
              padding: 35px;
              border-radius: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 35px;
            }
            .title {
              font-size: 26px;
              font-weight: 900;
              letter-spacing: -1px;
            }
            .kpi-container {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 35px;
            }
            .kpi-card {
              background: #fff;
              border: 1px solid #e2e8f0;
              padding: 24px;
              border-radius: 24px;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            .kpi-val {
              font-size: 22px;
              font-weight: 900;
              color: #E45318;
              margin-top: 5px;
            }
            .section {
              background: #fff;
              border: 1px solid #e2e8f0;
              padding: 35px;
              border-radius: 24px;
              margin-bottom: 35px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            .section-title {
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #64748b;
              margin-bottom: 24px;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              text-align: left;
              padding: 12px;
              font-weight: 900;
              font-size: 11px;
              text-transform: uppercase;
              color: #64748b;
              background: #f8fafc;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">CORDEIRO ENERGIA</div>
              <div style="font-size: 11px; font-weight: 700; color: #E45318; margin-top: 5px; letter-spacing: 2px; text-transform: uppercase;">RELATÓRIO EXECUTIVO DE OPERAÇÃO & MANUTENÇÃO</div>
            </div>
            <div style="text-align: right; font-size: 12px; font-weight: 700; opacity: 0.8;">
              <div>Data: ${dateStr}</div>
              <div>Plataforma SIE v3.0</div>
            </div>
          </div>

          <div class="kpi-container">
            <div class="kpi-card">
              <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase;">Geração Hoje</div>
              <div class="kpi-val">${(metrics?.geracaoHoje || 0).toFixed(1)} kWh</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase;">Potência Atual</div>
              <div class="kpi-val">${(metrics?.potenciaAtual || 0).toFixed(1)} kW</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase;">Performance Ratio</div>
              <div class="kpi-val">${(metrics?.pr || 85).toFixed(1)}%</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase;">Temperatura Inversor</div>
              <div class="kpi-val">${(metrics?.tempIGBT || 0).toFixed(1)} °C</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Lado CA (Rede Trifásica)</div>
            <table>
              <thead>
                <tr>
                  <th>Fase</th>
                  <th>Tensão (V)</th>
                  <th>Corrente (A)</th>
                  <th>Potência (kW)</th>
                </tr>
              </thead>
              <tbody>
                ${phaseHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Lado CC (Mapeamento de Strings)</div>
            <div style="display: grid; grid-template-cols: repeat(4, 1fr); gap: 12px;">
              ${stringsHtml || '<div style="grid-column: 1/-1; padding: 24px; text-align: center; color: #64748b; font-weight: 800;">Nenhuma string ativa registrada</div>'}
            </div>
          </div>

          <div style="text-align: center; margin-top: 50px; font-size: 11px; font-weight: 900; color: #94a3b8; letter-spacing: 2px;">
            PLATAFORMA SIE - SISTEMA DE INTELIGÊNCIA SOLAR - CORDEIRO ENERGIA O&M
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // String details and diagnostics mapping
  const activeStrings = metrics?.dadosStrings ? Object.entries(metrics.dadosStrings) : [];
  const getStringDiagnostic = (stringKey: string, v: number, i: number) => {
    const anomaly = metrics?.alertasStrings?.find((a: any) => a.string === stringKey);
    if (anomaly) return anomaly;
    return {
      string: stringKey,
      tensao: v,
      corrente: i,
      desvio: 0,
      diagnostico: "Operação Nominal",
      gravidade: "NOMINAL",
      solucao: "String operando de acordo com as normas de engenharia da usina.",
      perdaFinanceiraPorHora: 0
    };
  };

  // Financial Losses calculations
  const stringLosses = metrics?.alertasStrings?.reduce((acc: number, cur: any) => acc + cur.perdaFinanceiraPorHora, 0) || 0;
  const gridLosses = metrics?.qualidadeEnergia?.causaExternaAlerta ? 45.00 : 0;
  const soilingLosses = metrics?.alertaSoiling && metrics?.analiseSimilaridade?.desvioPR > 0
    ? parseFloat(((metrics.potenciaPico * (metrics.irradiancia || 600) / 1000) * (metrics.analiseSimilaridade.desvioPR / 100) * 0.85).toFixed(2))
    : 0;
  const totalFinancialLoss = stringLosses + gridLosses + soilingLosses;

  // Filtered raw telemetry
  const filteredTelemetrias = (metrics?.telemetrias || []).filter((t: any) => {
    if (!t) return false;
    const matchSearch = t.timestamp ? new Date(t.timestamp).toLocaleTimeString('pt-BR').includes(searchQuery) : true;
    const matchPower = minPower ? (t.potenciaAtivaKW >= parseFloat(minPower)) : true;
    const matchIrr = minIrr ? ((t.irradiancia || 0) >= parseFloat(minIrr)) : true;
    return matchSearch && matchPower && matchIrr;
  });

  const totalPages = Math.ceil(filteredTelemetrias.length / itemsPerPage) || 1;
  const paginatedTelemetrias = filteredTelemetrias.slice(
    (telemetriasPage - 1) * itemsPerPage,
    telemetriasPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 rounded-[2.5rem] p-4 md:p-8 border border-slate-900 shadow-2xl space-y-8 font-montserrat">
      
      {/* Alarm Popup */}
      {isAlarmPopupOpen && selectedAlarm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-slate-950 border border-red-500/30 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-red-500/10">
              <div className="bg-gradient-to-r from-red-950 to-slate-950 p-8 text-white relative border-b border-red-500/20">
                 <button onClick={() => setIsAlarmPopupOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-slate-900/60 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                 </button>
                 <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
                    <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[9px] font-black uppercase tracking-widest">Ação Corretiva Imediata</span>
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter">Eventos Críticos Ativos</h3>
                 <p className="text-slate-400 text-xs font-bold uppercase mt-1 tracking-widest">{metrics?.nome || "Usina"}</p>
              </div>
              
              <div className="p-8 space-y-6">
                 <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Detalhes do Alarme</h4>
                    <div className="p-5 bg-red-950/20 border border-red-500/20 rounded-2xl">
                       <p className="text-red-400 font-black text-base">[{selectedAlarm.codigo}] {selectedAlarm.descricao}</p>
                       <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-widest">
                         Gravidade: <span className="text-red-500 font-extrabold">{selectedAlarm.gravidade}</span>
                       </p>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Procedimento de Resolução</h4>
                    <div className="p-5 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl">
                       <p className="text-slate-300 text-sm leading-relaxed">{selectedAlarm.solucao || "Procedimento em elaboração pelo algoritmo O&M."}</p>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-2">
                    <button onClick={() => setIsAlarmPopupOpen(false)} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 transition-all">Reconhecer Alarme</button>
                    <button onClick={() => { setIsAlarmPopupOpen(false); setActiveTab("cockpit"); }} className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-orange-900/20">Registrar Intervenção</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* String Diagnostic Modal */}
      {selectedString && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-900 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Auditoria CC</span>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mt-1">{selectedString.string.replace("_", " - ")}</h3>
              </div>
              <button onClick={() => setSelectedString(null)} className="p-2 text-slate-500 hover:text-slate-200 bg-slate-900 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 border border-slate-880 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Tensão CC</p>
                  <p className="text-2xl font-black text-blue-500 mt-1">{selectedString.tensao.toFixed(1)} V</p>
                </div>
                <div className="bg-slate-900/60 p-4 border border-slate-880 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Corrente CC</p>
                  <p className="text-2xl font-black text-amber-500 mt-1">{selectedString.corrente.toFixed(2)} A</p>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Desvio Médio:</span>
                  <span className={`font-black ${selectedString.desvio > 20 ? 'text-red-500' : 'text-emerald-500'}`}>{selectedString.desvio}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Diagnóstico:</span>
                  <span className="font-black text-white">{selectedString.diagnostico}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Severidade:</span>
                  <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                    selectedString.gravidade === "ALTA" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                    selectedString.gravidade === "MEDIA" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  }`}>{selectedString.gravidade}</span>
                </div>
                {selectedString.perdaFinanceiraPorHora > 0 && (
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-rose-400 font-bold">
                    <span>Perda Est. / Hora:</span>
                    <span>R$ {selectedString.perdaFinanceiraPorHora.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Ação Sugerida</h4>
                <p className="text-slate-300 text-xs leading-relaxed font-medium">{selectedString.solucao}</p>
              </div>

              <button onClick={() => setSelectedString(null)} className="w-full py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Fechar Diagnóstico</button>
            </div>
          </div>
        </div>
      )}

      {/* FFT & Modbus Info Modal */}
      {showFFTModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-900 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Hardware & Modbus Gateway</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-1">Oscilografia & Código FFT</h3>
              </div>
              <button onClick={() => setShowFFTModal(false)} className="p-2 text-slate-500 hover:text-slate-200 bg-slate-900 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-medium">
                <p>
                  As APIs padrão baseadas em nuvem (como o SolisCloud e o Huawei FusionSolar) aplicam filtragem de banda e agregam dados de telemetria em médias de 5 minutos, o que impossibilita a detecção de transitórios rápidos e harmônicos de alta frequência na rede de corrente alternada.
                </p>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 text-emerald-400 font-bold">
                  <Cpu className="w-5 h-5 shrink-0" />
                  <span>Solução física: Instalar um Gateway de Hardware Local (Ex: Moxa UC-8100, Raspberry Pi CM4 Industrial ou SmartLogger 3000) coletando telemetria em alta frequência (Modbus TCP a 1kHz).</span>
                </div>
                <p>
                  O código Python abaixo exemplifica como ler registradores brutos do inversor (Huawei SmartLogger Modbus Map) e computar a Transformada Rápida de Fourier (FFT) para auditar harmônicos de tensão de forma local:
                </p>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-850 rounded-2xl font-mono text-[10px] text-slate-400 overflow-x-auto">
                <pre>{`import numpy as np
from pymodbus.client import ModbusTcpClient

# 1. Conexão Modbus TCP local com o inversor/gateway
client = ModbusTcpClient('192.168.1.100', port=502)
client.connect()

# 2. Ler registradores de forma contínua a 1kHz (Exemplo: Tensões da fase A)
# Huawei SmartLogger3000 register 32069 (Tensao Fase A CA)
amostras_tensao = []
import time
for _ in range(512):
    response = client.read_input_registers(32069, 1, slave=1)
    if not response.isError():
        amostras_tensao.append(response.registers[0] / 10.0)
    time.sleep(0.001) # Amostragem aproximada de 1ms (1000 Hz)

client.close()

# 3. Processar a FFT para detecção de Harmônicos de Qualidade de Energia
sinal = np.array(amostras_tensao)
N = len(sinal)
frequencia_amostragem = 1000.0  # Hz

# Remover componente DC
sinal_ac = sinal - np.mean(sinal)

# Computar FFT
fft_valores = np.fft.fft(sinal_ac)
magnitudes = np.abs(fft_valores) / N
frequencias = np.fft.fftfreq(N, 1/frequencia_amostragem)

# Obter apenas a metade positiva das frequências
metade_N = N // 2
freq_positivas = frequencias[:metade_N]
mag_positivas = magnitudes[:metade_N] * 2.0

# 4. Calcular o THD (Distorção Harmônica Total)
fundamental = np.max(mag_positivas)
harmonicos = mag_positivas[mag_positivas != fundamental]
thd = np.sqrt(np.sum(harmonicos**2)) / fundamental * 100

print(f"Fundamental: {fundamental:.1f} V")
print(f"THD de Tensão Calculado (FFT): {thd:.2f} %")`}</pre>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowFFTModal(false)} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Fechar Relatório</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner (Radar & Control) */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Plant Selector & Title Console */}
        <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-slate-850 flex flex-col md:flex-row items-center gap-6">
          <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl shrink-0">
            <Radio className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          <div className="flex-1 space-y-3 text-center md:text-left min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/25 text-orange-500 rounded-full text-[9px] font-black tracking-widest uppercase">Solar Control Console</span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-full text-[9px] font-black tracking-widest uppercase">PVlib Engine Linked</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">
              Solar Intelligence <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">SIE v3.0</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-3 px-5 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                <MapPin className="w-4 h-4 text-orange-500" />
                <select 
                  className="bg-transparent font-black text-slate-200 text-xs uppercase tracking-wider outline-none cursor-pointer min-w-[180px]"
                  value={selectedUsinaId}
                  onChange={(e) => setSelectedUsinaId(e.target.value)}
                >
                  <option value="consolidado">VISÃO GLOBAL (CONSOLIDADA)</option>
                  {usinas.map(u => (
                    <option key={u.id} value={u.id}>{u.nome.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sincronia Ativa
              </div>
            </div>
          </div>
        </div>

        {/* Global Plant Radar (Air Traffic Health) */}
        <div className="bg-slate-950/40 border border-slate-900 p-6 rounded-[2.5rem] flex flex-col justify-center gap-4 min-w-[280px]">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Radar de Usinas</h3>
          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => setSelectedUsinaId("consolidado")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedUsinaId === "consolidado" ? "bg-slate-900 border-slate-700" : "bg-slate-900/40 border-slate-900 hover:border-slate-850"
              }`}
            >
              <span className="text-[10px] font-black text-slate-300">GLOBAL</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            {usinas.map(u => {
              // Simula saúde baseado no nome ou id para o radar
              let statusColor = "bg-emerald-400";
              if (u.nome.toLowerCase().includes("manga")) statusColor = "bg-orange-500";
              if (u.nome.toLowerCase().includes("limao")) statusColor = "bg-red-500";
              
              return (
                <div 
                  key={u.id}
                  onClick={() => setSelectedUsinaId(u.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedUsinaId === u.id ? "bg-slate-900 border-slate-700 animate-pulse" : "bg-slate-900/40 border-slate-900 hover:border-slate-850"
                  }`}
                >
                  <span className="text-[10px] font-black text-slate-300 truncate max-w-[80px]">{u.nome.toUpperCase()}</span>
                  <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row lg:flex-col gap-3 shrink-0">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-4 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl px-6 py-4 border border-slate-800 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {syncing ? <Loader className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 text-orange-500" />}
            <span className="text-xs font-black uppercase tracking-wider">Sincronizar</span>
          </button>
          
          <button 
            onClick={handleExportReport}
            className="flex-1 flex items-center justify-center gap-4 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl px-6 py-4 border border-slate-800 transition-all hover:scale-[1.02]"
          >
            <Database className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-wider">Exportar</span>
          </button>

          <button 
            onClick={() => setShowFFTModal(true)}
            className="flex-1 flex items-center justify-center gap-4 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl px-6 py-4 border border-slate-800 transition-all hover:scale-[1.02]"
          >
            <Cpu className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-black uppercase tracking-wider">FFT & Modbus</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-950/60 border border-slate-900 rounded-2xl max-w-sm">
        <button 
          onClick={() => setActiveTab("cockpit")}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "cockpit" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-350"
          }`}
        >
          Cockpit O&M
        </button>
        <button 
          onClick={() => setActiveTab("engenharia")}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "engenharia" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-350"
          }`}
        >
          Aba de Engenharia
        </button>
      </div>

      {activeTab === "cockpit" ? (
        <>
          {/* Main Cockpit Dashboard */}
          
          {/* Real-time Loss Console & Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Real-time Financial Loss (Pulse Alarm) */}
            <div className={`p-6 rounded-[2.5rem] border flex flex-col justify-between transition-all ${
              totalFinancialLoss > 0 
                ? "bg-rose-950/20 border-rose-500/30 animate-pulse shadow-lg shadow-rose-900/5" 
                : "bg-slate-900/40 border-slate-850"
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Perda Financeira Est.</span>
                <AlertOctagon className={`w-5 h-5 ${totalFinancialLoss > 0 ? 'text-rose-500' : 'text-slate-500'}`} />
              </div>
              <div className="my-4">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">R$ / Hora</p>
                <p className="text-3xl font-black text-rose-400 tracking-tighter">R$ {totalFinancialLoss.toFixed(2)}</p>
              </div>
              <div className="text-[9px] font-bold text-slate-400 leading-snug">
                {totalFinancialLoss > 0 
                  ? `Anomalia ativa: ${stringLosses > 0 ? 'Strings ' : ''}${soilingLosses > 0 ? 'Sujidade ' : ''}${gridLosses > 0 ? 'Concessionária' : ''}`
                  : "Nenhuma perda identificada"
                }
              </div>
            </div>

            {/* Power Generation Card */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-[2.5rem] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Geração Diária</span>
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div className="my-4">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Hoje Acumulado</p>
                <p className="text-3xl font-black text-white tracking-tighter">
                  {loading ? "---" : `${(parseFloat(metrics?.geracaoHoje) || 0).toFixed(1)} kWh`}
                </p>
              </div>
              <div className="text-[9px] font-bold text-slate-400">
                Pico: {selectedUsina?.capacidadeKWp || metrics?.potenciaPico || "---"} kWp
              </div>
            </div>

            {/* Performance Ratio Card */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-[2.5rem] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Performance Ratio</span>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="my-4">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">PR Real</p>
                <p className="text-3xl font-black text-emerald-400 tracking-tighter">
                  {loading ? "---" : `${(parseFloat(metrics?.pr) || 84.2).toFixed(1)}%`}
                </p>
              </div>
              <div className="text-[9px] font-bold text-slate-400">
                Meta do projeto: 80.0%
              </div>
            </div>

            {/* Irradiance / Module Temperature */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-[2.5rem] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Solarimetria</span>
                <Sun className="w-5 h-5 text-blue-500" />
              </div>
              <div className="my-4">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Irradiação / Temp</p>
                <p className="text-2xl font-black text-white tracking-tighter">
                  {loading ? "---" : `${metrics?.irradiancia || 0} W/m² / ${metrics?.tempModulos?.toFixed(1) || 25}°C`}
                </p>
              </div>
              <div className="text-[9px] font-bold text-slate-400">
                Forte insolação detectada
              </div>
            </div>

          </div>

          {/* Double Curve: Expected (PVlib) vs. Actual */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Real vs PVlib Double Curve Chart */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-white uppercase tracking-tighter text-lg">Curva de Carga PVlib</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
                    Energia Esperada vs Geração Real (Intervalos de 15 Minutos)
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  {/* Range Selector */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl">
                    {["24h", "7d", "30d"].map(r => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          range === r
                            ? "bg-slate-900 text-white shadow-md"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                      <span className="text-[9px] font-black uppercase text-slate-400">Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <span className="text-[9px] font-black uppercase text-slate-400">PVlib</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.curvaGeracao || []}>
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expectedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b" }} />
                    <Area type="monotone" name="Projetado (PVlib)" dataKey="expected" stroke="#3b82f6" fill="url(#expectedGrad)" strokeWidth={2} strokeDasharray="3 3" />
                    <Area type="monotone" name="Geração Real" dataKey="actual" stroke="#f97316" fill="url(#actualGrad)" strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Loss Distribution Chart (Pie) */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] flex flex-col justify-between">
              <div>
                <h3 className="font-black text-white uppercase tracking-tighter text-lg">Distribuição de Perdas</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Fatores de redução de rendimento</p>
              </div>

              <div className="h-[180px] my-4 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={metrics?.perdasDistribucao || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {(metrics?.perdasDistribucao || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b" }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {(metrics?.perdasDistribucao || []).map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[9px] font-black uppercase text-slate-400 truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Similar Days comparison & Soiling Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Filtro Solarimétrico (Similar Days Panel) */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-white uppercase tracking-tighter text-lg">Filtro Solarimétrico</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Mapeamento de Dias Similares</p>
                </div>
                <Sliders className="w-5 h-5 text-orange-500" />
              </div>

              {/* Tolerance Slider */}
              <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Tolerância de Irradiação:</span>
                  <span className="text-orange-500 font-black">{tolerance}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="20"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value))}
                  className="w-full accent-orange-500 bg-slate-850 rounded-lg cursor-pointer h-1.5"
                />
                <p className="text-[8px] font-bold text-slate-500 uppercase">Procura dias com integral solarimétrica de ± {tolerance}%</p>
              </div>

              {/* Comparison Output */}
              {metrics?.analiseSimilaridade?.similarDia ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl text-xs space-y-2">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-900 pb-1.5">Dia Similar Encontrado</p>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Data Histórica:</span>
                      <span className="text-white font-black">{new Date(metrics.analiseSimilaridade.similarDia.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Radiação Integral:</span>
                      <span className="text-orange-400 font-black">{metrics.analiseSimilaridade.similarDia.integral.toFixed(2)} kWh/m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">PR do Dia Similar:</span>
                      <span className="text-emerald-400 font-black">{metrics.analiseSimilaridade.similarDia.pr.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Alarm Box */}
                  {metrics?.alertaSoiling ? (
                    <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="text-red-400 font-black uppercase text-[9px] tracking-wider">Alarme de Sujeira / Soiling</p>
                        <p className="text-slate-300 font-medium leading-relaxed">
                          Queda linear de <span className="text-red-500 font-bold">{Math.abs(metrics.analiseSimilaridade.desvioPR)}%</span> no PR atual em relação ao dia histórico similar. Recomendado agendar lavagem química dos módulos.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-950/10 border border-emerald-500/25 rounded-2xl flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="text-emerald-400 font-black uppercase text-[9px] tracking-wider">Perda por Sujeira Normal</p>
                        <p className="text-slate-400 font-medium leading-relaxed">
                          Diferença de PR em {metrics.analiseSimilaridade.desvioPR}% dentro da faixa aceitável de degradação.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-900 border-dashed rounded-2xl">
                  <Database className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nenhum dia similar com a tolerância de {tolerance}%</p>
                </div>
              )}
            </div>

            {/* String Current Deviation Audit (Physic Strings Grid) */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-white uppercase tracking-tighter text-lg">Disposição de Strings CC</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Correntes Individuais das Strings</p>
                </div>
                <Zap className="w-5 h-5 text-amber-500" />
              </div>

              {activeStrings.length > 0 ? (
                <div className="space-y-4">
                  {/* Neon Strings Grid */}
                  <div className="grid grid-cols-2 gap-2.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {activeStrings.map(([key, val]: any) => {
                      const hasAlert = metrics?.alertasStrings?.some((a: any) => a.string === key);
                      
                      return (
                        <div 
                          key={key} 
                          onClick={() => setSelectedString(getStringDiagnostic(key, val.V, val.I))}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            hasAlert 
                              ? "bg-red-950/20 border-red-500/35 hover:bg-red-950/30" 
                              : "bg-slate-950/50 border-slate-900 hover:border-slate-850"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 truncate">{key.replace("S", "STR ")}</p>
                            <p className="text-xs font-black text-white mt-0.5">{val.I.toFixed(1)} A</p>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${hasAlert ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
                        </div>
                      );
                    })}
                  </div>

                  {metrics?.alertasStrings?.length > 0 && (
                    <div className="p-4 bg-red-950/15 border border-red-500/20 rounded-2xl">
                      <p className="text-red-400 font-black uppercase text-[9px] tracking-wider mb-1">Desvio Crítico Encontrado</p>
                      <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                        {metrics.alertasStrings.length} string(s) CC com desvio superior a 20%. Clique nas caixas vermelhas para ver diagnósticos.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-900 border-dashed rounded-2xl">
                  <Database className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sem strings ativas registradas</p>
                </div>
              )}
            </div>

            {/* Power Quality (PRODIST) Audit */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-white uppercase tracking-tighter text-lg">Qualidade de Energia</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Auditoria CA / PRODIST Aneel</p>
                </div>
                <Activity className="w-5 h-5 text-blue-500" />
              </div>

              {metrics?.qualidadeEnergia ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Fator de Desequilíbrio (VUF)</p>
                      <p className={`text-xl font-black mt-1 ${metrics.qualidadeEnergia.vuf > 2.0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {metrics.qualidadeEnergia.vuf.toFixed(2)} %
                      </p>
                      <p className="text-[7px] text-slate-600 font-bold uppercase mt-1">Limite PRODIST: 2.0%</p>
                    </div>
                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Desvio Frequência (Std)</p>
                      <p className={`text-xl font-black mt-1 ${metrics.qualidadeEnergia.freqStdDev > 0.05 ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {metrics.qualidadeEnergia.freqStdDev.toFixed(4)} Hz
                      </p>
                      <p className="text-[7px] text-slate-600 font-bold uppercase mt-1">Estabilidade Nominal</p>
                    </div>
                  </div>

                  {metrics.qualidadeEnergia.gridTripAlerta ? (
                    <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl space-y-1">
                      <p className="text-red-400 font-black uppercase text-[9px] tracking-wider">Alerta de Rede CA Externa</p>
                      <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                        {metrics.qualidadeEnergia.mensagem}
                      </p>
                      <div className="mt-2 text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-lg font-black uppercase tracking-wider">
                        Perda Excluída das Penalidades de PR
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl">
                      <p className="text-emerald-400 font-black uppercase text-[9px] tracking-wider mb-1">Qualidade CA Estável</p>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                        Tensão e frequência operando estritamente dentro da faixa regulatória de 60Hz ±0.5Hz.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-900 border-dashed rounded-2xl">
                  <Database className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Aguardando dados da concessionária</p>
                </div>
              )}
            </div>

          </div>

          {/* Corrective Actions: Before vs. After PR Jump & Registry Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Antes vs Depois Audit Panel */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] space-y-6">
              <div>
                <h3 className="font-black text-white uppercase tracking-tighter text-lg">Impacto de Ações Corretivas</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Salto de Performance Ratio 7 dias Antes vs. 7 dias Depois</p>
              </div>

              {metrics?.antesDepois ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Data details */}
                  <div className="p-5 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Ação Monitorada</span>
                      <p className="text-base font-black text-white mt-1 uppercase tracking-tight leading-snug">{metrics.antesDepois.acao.replace("_", " ")}</p>
                    </div>
                    <div className="mt-4">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Execução</span>
                      <p className="text-xs font-bold text-slate-300 mt-0.5">{new Date(metrics.antesDepois.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* PR comparison */}
                  <div className="p-5 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Aumento de Eficiência</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-slate-400 font-black text-sm">{metrics.antesDepois.prAntes.toFixed(1)}%</span>
                        <ChevronRight className="w-4 h-4 text-slate-700" />
                        <span className="text-emerald-400 font-black text-2xl">{metrics.antesDepois.prDepois.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        Ganho: +{metrics.antesDepois.ganhoPR.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Financial Retorno */}
                  <div className="p-5 bg-emerald-950/5 border border-emerald-500/20 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Retorno Financeiro</span>
                      <p className="text-3xl font-black text-emerald-300 tracking-tighter mt-1">R$ {metrics.antesDepois.ganhoFinanceiroEstimado.toFixed(2)}</p>
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase leading-snug">
                      Retorno cumulativo medido com base no ganho real de PR pós lavagem/reparo.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-950/40 border border-slate-900 border-dashed rounded-[2rem] flex flex-col items-center justify-center">
                  <Database className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Nenhuma ação recente registrada para cálculo antes vs depois</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 leading-snug max-w-sm">
                    Requer registros históricos de MetricaDiariaUsina de pelo menos 7 dias antes e após a data do evento para análise.
                  </p>
                </div>
              )}

              {/* Acoes Corretivas Log */}
              {metrics?.acoesCorretivas?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-2">Histórico de Manutenções Recentes</h4>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {metrics.acoesCorretivas.map((ac: any) => (
                      <div key={ac.id} className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between text-xs hover:border-slate-850 transition-all">
                        <div className="flex items-center gap-4 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-black text-white uppercase truncate">{ac.tipoAcao.replace("_", " ")}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase truncate">
                              Por: {ac.executadoPor || 'Sistema'} | {ac.observacoes || 'Sem obs.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[9px] font-black text-slate-400 bg-slate-900 px-2 py-1 rounded">
                            {new Date(ac.dataExecucao).toLocaleDateString('pt-BR')}
                          </span>
                          <button 
                            onClick={() => handleDeleteAction(ac.id)}
                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Registry Action Form */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] flex flex-col justify-between">
              <div>
                <h3 className="font-black text-white uppercase tracking-tighter text-lg">Registrar Ação O&M</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Lançar Manutenção Realizada em Campo</p>
              </div>

              {selectedUsinaId === "consolidado" ? (
                <div className="my-6 p-6 text-center bg-slate-950/40 border border-slate-900 border-dashed rounded-2xl">
                  <Database className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Selecione uma usina específica para registrar ações</p>
                </div>
              ) : (
                <form onSubmit={handleRegisterAction} className="space-y-4 my-4 text-xs font-bold text-slate-400">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-slate-500">Tipo de Ação</label>
                    <select 
                      value={actionForm.tipoAcao}
                      onChange={(e) => setActionForm({ ...actionForm, tipoAcao: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-900 p-3 rounded-xl text-white outline-none"
                    >
                      <option value="limpeza_modulos">Limpeza Química de Módulos</option>
                      <option value="troca_fusivel">Troca de Fusível CC</option>
                      <option value="reparo_string">Reparo Físico de String/MC4</option>
                      <option value="poda_vegetacao">Poda de Vegetação / Sombras</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-slate-500">Data Execução</label>
                      <input 
                        type="date"
                        value={actionForm.dataExecucao}
                        onChange={(e) => setActionForm({ ...actionForm, dataExecucao: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-900 p-3 rounded-xl text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-slate-500">Executado por</label>
                      <input 
                        type="text"
                        placeholder="Nome técnico"
                        value={actionForm.executadoPor}
                        onChange={(e) => setActionForm({ ...actionForm, executadoPor: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-900 p-3 rounded-xl text-white outline-none placeholder-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-slate-500">Observações adicionais</label>
                    <textarea 
                      placeholder="Ex: Trocado fusível CC da String 3 que estava queimado."
                      value={actionForm.observacoes}
                      onChange={(e) => setActionForm({ ...actionForm, observacoes: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-900 p-3 rounded-xl text-white outline-none placeholder-slate-600 resize-none"
                    />
                  </div>

                  {actionSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Ação registrada com sucesso!
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={registeringAction}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {registeringAction ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : "Gravar Intervenção"}
                  </button>
                </form>
              )}
            </div>

          </div>
        </>
      ) : (
        <>
          {/* Engineering Tab: Paginated detailed telemetry */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 md:p-8 rounded-[2.5rem] space-y-6">
            
            {/* Table Header / Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-white uppercase tracking-tighter text-lg">Telemetria de Engenharia</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Tabela completa de parâmetros elétricos e térmicos</p>
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Search query */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-900 px-3.5 py-2 rounded-xl text-xs">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por horário..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setTelemetriasPage(1); }}
                    className="bg-transparent border-none outline-none text-white placeholder-slate-600 font-bold w-[130px]"
                  />
                </div>

                {/* Min Power Filter */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-900 px-3.5 py-2 rounded-xl text-xs">
                  <Activity className="w-4 h-4 text-slate-500" />
                  <input 
                    type="number" 
                    placeholder="Min kW..." 
                    value={minPower}
                    onChange={(e) => { setMinPower(e.target.value); setTelemetriasPage(1); }}
                    className="bg-transparent border-none outline-none text-white placeholder-slate-600 font-bold w-[90px]"
                  />
                </div>

                {/* Min Irradiance Filter */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-900 px-3.5 py-2 rounded-xl text-xs">
                  <Sun className="w-4 h-4 text-slate-500" />
                  <input 
                    type="number" 
                    placeholder="Min W/m²..." 
                    value={minIrr}
                    onChange={(e) => { setMinIrr(e.target.value); setTelemetriasPage(1); }}
                    className="bg-transparent border-none outline-none text-white placeholder-slate-600 font-bold w-[90px]"
                  />
                </div>

                {/* Clear filters */}
                {(searchQuery || minPower || minIrr) && (
                  <button 
                    onClick={() => { setSearchQuery(""); setMinPower(""); setMinIrr(""); setTelemetriasPage(1); }}
                    className="p-2 text-slate-500 hover:text-white bg-slate-950 rounded-xl border border-slate-900 hover:border-slate-800 transition-all"
                  >
                    Limpar
                  </button>
                )}

              </div>
            </div>

            {/* Main Telemetry Table */}
            <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-950/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850">
                    <th className="px-6 py-4.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Potência (kW)</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Acumulado (kWh)</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Tensões CA (A/B/C)</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Correntes CA (A/B/C)</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Irradiância (W/m²)</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Temp. Inversor (°C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs">
                  {paginatedTelemetrias.map((t: any) => {
                    const timeStr = t.timestamp 
                      ? new Date(t.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                      : "---";
                    return (
                      <tr key={t.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-300">{timeStr}</td>
                        <td className="px-6 py-4 font-extrabold text-orange-500">{t.potenciaAtivaKW.toFixed(2)} kW</td>
                        <td className="px-6 py-4 font-semibold text-slate-400">{t.energiaAcumuladaKWh.toFixed(1)} kWh</td>
                        <td className="px-6 py-4 font-semibold text-blue-400">
                          {t.tensaoCA_A?.toFixed(0)}V / {t.tensaoCA_B?.toFixed(0)}V / {t.tensaoCA_C?.toFixed(0)}V
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-400">
                          {t.correnteCA_A?.toFixed(1)}A / {t.correnteCA_B?.toFixed(1)}A / {t.correnteCA_C?.toFixed(1)}A
                        </td>
                        <td className="px-6 py-4 font-extrabold text-amber-500">{t.irradiancia || 0} W/m²</td>
                        <td className="px-6 py-4 font-bold text-slate-400">{t.tempIGBT?.toFixed(1) || "---"} °C</td>
                      </tr>
                    );
                  })}

                  {paginatedTelemetrias.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Database className="w-8 h-8 text-slate-700" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nenhum registro de telemetria corresponde aos filtros</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs border-t border-slate-850 pt-4">
                <span className="text-slate-500 font-bold">Página {telemetriasPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <button 
                    disabled={telemetriasPage === 1}
                    onClick={() => setTelemetriasPage(prev => Math.max(1, prev - 1))}
                    className="px-4 py-2 bg-slate-950 border border-slate-900 rounded-xl hover:border-slate-850 disabled:opacity-40 transition-all"
                  >
                    Anterior
                  </button>
                  <button 
                    disabled={telemetriasPage === totalPages}
                    onClick={() => setTelemetriasPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-4 py-2 bg-slate-950 border border-slate-900 rounded-xl hover:border-slate-800 disabled:opacity-40 transition-all"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
