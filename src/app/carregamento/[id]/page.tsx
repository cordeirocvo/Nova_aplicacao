"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Zap, FileText, ChevronLeft, Shield, AlertTriangle, 
  CheckCircle2, Loader2, MapPin, ExternalLink, Edit2, Save, X, Box,
  BatteryCharging
} from "lucide-react";
import { CEMIG_DOCS } from "@/lib/ev/cemigEngine";

const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] transition-all text-sm";
const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1";

export default function ProjetoDetalhes() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [editStep, setEditStep] = useState<1 | 2 | 3>(1);
  const [editData, setEditData] = useState<any>({
    projectName: "",
    clientName: "",
    isCollective: false,
    location: "urbano",
    existingLoadKW: 0,
    simultaneityFactor: 0.8,
    distance: 20,
    installationMethod: "B1",
    hasTransformer: false,
    transformerPrimaryVoltage: 220,
    transformerSecondaryVoltage: 380,
    transformerDistance: 10,
    chargerDistance: 10,
    groundingType: "TT",
    analysisNotes: ""
  });

  useEffect(() => {
    fetch(`/api/ev/sizing/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setEditData({
          projectName: data.projectName || "",
          clientName: data.clientName || "",
          isCollective: data.isCollective || false,
          location: data.location || "urbano",
          existingLoadKW: data.existingLoadKW || 0,
          simultaneityFactor: data.simultaneityFactor || 0.8,
          distance: data.distance || 0,
          installationMethod: data.installationMethod || "B1",
          hasTransformer: data.hasTransformer || false,
          transformerPrimaryVoltage: data.transformerPrimaryVoltage || 220,
          transformerSecondaryVoltage: data.transformerSecondaryVoltage || 380,
          transformerDistance: data.transformerDistance || 10,
          chargerDistance: data.chargerDistance || 10,
          groundingType: data.groundingType || "TT",
          analysisNotes: data.analysisNotes || ""
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ev/sizing/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        setIsEditing(false);
      }
    } catch (err) {
      alert("Erro ao atualizar projeto");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#00BFA5]" />
        <p className="text-slate-500 mt-4 font-medium">Carregando detalhes do projeto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-20">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Projeto não encontrado</h2>
        <button onClick={() => router.push("/carregamento")} className="text-[#00BFA5] mt-4 font-bold">Voltar para a lista</button>
      </div>
    );
  }

  const notes = project.analysisNotes?.split(" | ") || [];
  const padraoEntrada = notes[0] || "-";
  const ramalTipo = notes[1] || "-";
  const demandaFaixa = notes[2] || "-";

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6 no-print">
        <button 
          onClick={() => router.push("/carregamento")}
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#1E3A8A] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" /> Voltar para Projetos
        </button>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                <Edit2 className="w-4 h-4" /> Editar Projeto
              </button>
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <FileText className="w-4 h-4" /> Gerar Relatório PDF
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#00BFA5] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-8 space-y-8">
        {/* Header / Editor Tabs */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-6">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-6">
                <div className="flex border-b border-slate-100 no-print">
                   {[
                     { n: 1, label: "Identificação & CEMIG" },
                     { n: 2, label: "Carregadores & Cargas" },
                     { n: 3, label: "Parâmetros Elétricos" }
                   ].map(s => (
                     <button 
                       key={s.n}
                       onClick={() => setEditStep(s.n as any)}
                       className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${editStep === s.n ? "border-[#00BFA5] text-[#1E3A8A]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                     >
                       {s.label}
                     </button>
                   ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-6 h-6 text-[#00BFA5]" />
                  <h2 className="text-2xl font-black text-slate-800">Laudo Técnico — {project.projectName}</h2>
                </div>
                <p className="text-sm text-slate-500">{project.clientName || 'Cliente Geral'} — Atualizado em {new Date(project.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Body */}
        {isEditing && (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-300">
             {/* TAB 1: IDENTIFICAÇÃO */}
             {editStep === 1 && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Nome do Projeto</label>
                    <input type="text" className={inputCls} value={editData.projectName || ""} onChange={e => setEditData({...editData, projectName: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Cliente</label>
                    <input type="text" className={inputCls} value={editData.clientName || ""} onChange={e => setEditData({...editData, clientName: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de Edificação</label>
                    <select className={inputCls} value={editData.isCollective ? "coletiva" : "individual"} onChange={e => setEditData({...editData, isCollective: e.target.value === "coletiva"})}>
                      <option value="individual">Individual</option>
                      <option value="coletiva">Coletiva</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Localização</label>
                    <select className={inputCls} value={editData.location} onChange={e => setEditData({...editData, location: e.target.value as any})}>
                      <option value="urbano">Urbano</option>
                      <option value="rural">Rural</option>
                    </select>
                  </div>
               </div>
             )}

             {/* TAB 2: CARREGADORES */}
             {editStep === 2 && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Carga instalada atual (kW)</label>
                    <input type="number" className={inputCls} value={editData.existingLoadKW} onChange={e => setEditData({...editData, existingLoadKW: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>Fator de Simultaneidade (0.3 - 1.0)</label>
                    <input type="number" step="0.05" className={inputCls} value={editData.simultaneityFactor} onChange={e => setEditData({...editData, simultaneityFactor: parseFloat(e.target.value) || 0.8})} />
                  </div>
                  <div className="md:col-span-2 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                     <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                     <p className="text-[10px] text-amber-800">
                       Para alterar o modelo/potência do carregador, use as configurações na tela anterior. Aqui você ajusta os parâmetros da infraestrutura.
                     </p>
                  </div>
               </div>
             )}

             {/* TAB 3: ELÉTRICA */}
             {editStep === 3 && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Uso de Transformador</p>
                      <p className="text-[10px] text-slate-500">Obrigatório para 380V em rede 220V</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={editData.hasTransformer} onChange={e => setEditData({...editData, hasTransformer: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-[#00BFA5] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {editData.hasTransformer ? (
                      <>
                        <div>
                          <label className={labelCls}>Tensão Primária (V)</label>
                          <input type="number" className={inputCls} value={editData.transformerPrimaryVoltage || 0} onChange={e => setEditData({...editData, transformerPrimaryVoltage: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                          <label className={labelCls}>Dist. Quadro → Transfo (m)</label>
                          <input type="number" className={inputCls} value={editData.transformerDistance || 0} onChange={e => setEditData({...editData, transformerDistance: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                          <label className={labelCls}>Dist. Transfo → Carreg. (m)</label>
                          <input type="number" className={inputCls} value={editData.chargerDistance || 0} onChange={e => setEditData({...editData, chargerDistance: parseFloat(e.target.value) || 0})} />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className={labelCls}>Distância Total (m)</label>
                        <input type="number" className={inputCls} value={editData.distance || 0} onChange={e => setEditData({...editData, distance: parseFloat(e.target.value) || 0})} />
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>Aterramento</label>
                      <select className={inputCls} value={editData.groundingType || "TT"} onChange={e => setEditData({...editData, groundingType: e.target.value})}>
                        <option value="TT">TT</option>
                        <option value="TN-S">TN-S</option>
                        <option value="TN-C-S">TN-C-S</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Método</label>
                      <select className={inputCls} value={editData.installationMethod || "B1"} onChange={e => setEditData({...editData, installationMethod: e.target.value})}>
                        <option value="B1">Embutido (B1)</option>
                        <option value="C">Aparente (C)</option>
                      </select>
                    </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* View mode results */}
        {!isEditing && (
          <>
            {/* Classificação CEMIG */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl border-2 ${project.entranceCategory === "MT" ? "border-red-300 bg-red-50" : "border-[#1E3A8A]/20 bg-[#1E3A8A]/5"}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de UC / Padrão</p>
                <p className={`text-xl font-black ${project.entranceCategory === "MT" ? "text-red-700" : "text-[#1E3A8A]"}`}>
                  {project.entranceCategory === "MT" ? "⚡ Média Tensão" : `Tipo ${project.entranceCategory}`}
                </p>
                <p className="text-xs text-slate-600 mt-1">{padraoEntrada}</p>
              </div>
              <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ramal de Conexão</p>
                <p className="text-xl font-black text-slate-800">{ramalTipo}</p>
                <p className="text-xs text-slate-600 mt-1">Conforme ND-5.1 / ND-5.2</p>
              </div>
              <div className="p-5 rounded-2xl border-2 border-[#00BFA5]/20 bg-[#00BFA5]/5">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Corrente Projetada</p>
                <p className="text-xl font-black text-[#00BFA5]">{project.calculatedCurrent.toFixed(1)} <span className="text-sm">A</span></p>
                <p className="text-xs text-slate-600 mt-1">{demandaFaixa}</p>
              </div>
            </div>

            {/* Grid: NBR 5410 + Proteções */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0A192F] text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/5">
                <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                  <Zap className="w-6 h-6 text-[#00BFA5]" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Circuitos e Cabos</h3>
                </div>
                
                <div className="space-y-8">
                  {project.hasTransformer && (
                    <div className="animate-in slide-in-from-left duration-500">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#00BFA5] rounded-full animate-pulse"></span>
                          Lado Primário (Rede/QGBT - {project.transformerPrimaryVoltage}V)
                        </p>
                        <p className="text-[9px] text-white/40 font-bold">I = {( ( (project.charger?.power || 22) / 0.95 ) * 1000 / (1.732 * (project.transformerPrimaryVoltage || 220) * 0.95) ).toFixed(1)}A</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                          <p className="text-[9px] opacity-40 uppercase font-black mb-1 group-hover:opacity-60">Condutor</p>
                          <p className="font-black text-xl">{project.calculatedPrimaryCable} mm² <span className="text-xs opacity-50 font-medium">Cobre</span></p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                          <p className="text-[9px] opacity-40 uppercase font-black mb-1 group-hover:opacity-60">Proteção Termomagnética</p>
                          <p className="font-black text-xl">{project.calculatedPrimaryBreaker} A <span className="text-xs opacity-50 font-medium">Curva C</span></p>
                        </div>
                      </div>
                      <p className="text-[8px] text-white/30 mt-2 italic">* Corrente no primário (220V) é superior ao secundário (380V) devido à menor tensão e perdas no transformador.</p>
                    </div>
                  )}

                  <div className="animate-in slide-in-from-left duration-700 delay-200">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#00BFA5] rounded-full"></span>
                        {project.hasTransformer ? `Lado Secundário (Saída Transfo - ${project.transformerSecondaryVoltage}V)` : "Circuito de Alimentação Direta"}
                      </p>
                      <p className="text-[9px] text-white/40 font-bold">I = {project.calculatedCurrent.toFixed(1)}A</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                        <p className="text-[9px] opacity-40 uppercase font-black mb-1 group-hover:opacity-60">Condutor</p>
                        <p className="font-black text-xl">{project.calculatedCableGauge} mm² <span className="text-xs opacity-50 font-medium">Cobre</span></p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                        <p className="text-[9px] opacity-40 uppercase font-black mb-1 group-hover:opacity-60">Proteção Termomagnética</p>
                        <p className="font-black text-xl">{project.calculatedBreaker} A <span className="text-xs opacity-50 font-medium">Curva C</span></p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                        <p className="text-[9px] opacity-40 uppercase font-black mb-1 group-hover:opacity-60">Queda de Tensão Máx.</p>
                        <p className={`font-black text-xl ${project.voltageDrop > 4 ? "text-red-400" : "text-[#00BFA5]"}`}>{project.voltageDrop}%</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                        <p className="text-[9px] opacity-40 uppercase font-black mb-1 group-hover:opacity-60">Infraestrutura Recomendada</p>
                        <p className="font-black text-sm leading-tight mt-1">{project.calculatedConduit}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-[#1E3A8A]" />
                    <h3 className="font-bold text-slate-800">Proteções & Aterramento</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Dispositivo IDR (NBR 17019)</p>
                      <p className="text-sm font-bold text-slate-700">{project.calculatedIDR || project.calculatedDR}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">DPS (Proteção de Surto)</p>
                      <p className="text-sm font-bold text-slate-700">{project.calculatedDPS || "Classe II, 275V, 20kA"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Análise de Aterramento ({project.groundingType})</p>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{project.groundingAnalysis}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Carregador Info */}
            <div className="p-6 border border-slate-200 rounded-3xl bg-slate-50/30">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BatteryCharging className="w-5 h-5 text-[#00BFA5]" />
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Equipamento Selecionado</h3>
                  </div>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className={labelCls}>Marca/Modelo</p>
                    <p className="text-sm font-bold">{project.charger?.brand} {project.charger?.model}</p>
                  </div>
                  <div>
                    <p className={labelCls}>Potência Nominal</p>
                    <p className="text-sm font-bold">{project.charger?.power} kW</p>
                  </div>
                  <div>
                    <p className={labelCls}>Alimentação</p>
                    <p className="text-sm font-bold">{project.charger?.voltage}V ({project.charger?.phases}F)</p>
                  </div>
                  <div>
                    <p className={labelCls}>Conector</p>
                    <p className="text-sm font-bold">{project.charger?.connectorType || 'Tipo 2'}</p>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            color: black !important;
            padding: 2cm !important;
          }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; }
          .bg-white { border: none !important; box-shadow: none !important; }
          .bg-[#0A192F] { 
            background: #0A192F !important; 
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .shadow-xl, .shadow-2xl { box-shadow: none !important; }
          .rounded-3xl, .rounded-[2.5rem] { border-radius: 1rem !important; }
          h2, h3 { color: #1E3A8A !important; }
          .text-[#00BFA5] { color: #00BFA5 !important; -webkit-print-color-adjust: exact; }
          .border { border: 1px solid #eee !important; }
          .animate-in { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
