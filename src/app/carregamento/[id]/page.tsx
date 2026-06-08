"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Zap, FileText, ChevronLeft, Shield, AlertTriangle, 
  CheckCircle, Loader, MapPin, ExternalLink, Edit, Save, X, Box,
  BatteryCharging
} from "lucide-react";
import { CEMIG_DOCS } from "@/lib/ev/cemigEngine";
import { calculateSizing } from "@/lib/ev/sizingEngine";
import { UTILITY_DATABASE, findRecommendedCategory } from "@/lib/ev/utilityStandards";
import VisualPanelModel from "@/components/ev/VisualPanelModel";
import { Globe, Search, Phone, Mail, FileCheck, Check } from "lucide-react";

const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] transition-all text-sm";
const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1";

export default function ProjetoDetalhes() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recalculate sizing on the fly to get BOM and totalCost
  const sizingResult = project ? calculateSizing({
    powerkW: project.charger?.power || 7.4,
    voltage: project.hasTransformer ? project.transformerSecondaryVoltage : (project.charger?.voltage || 220),
    phases: project.charger?.phases as 1 | 3 || 1,
    distance: project.hasTransformer ? project.chargerDistance : project.distance,
    method: project.installationMethod as any,
    cosPhi: project.cosPhi !== undefined ? project.cosPhi : 1.0,
    hasTransformer: project.hasTransformer,
    primaryVoltage: project.transformerPrimaryVoltage,
    primaryDistance: project.transformerDistance,
    groundingType: project.groundingType,
    chargerDistance: project.chargerDistance,
    demandControlEnabled: project.demandControlEnabled,
    demandControlLimit: project.demandControlLimit,
    existingLoadKW: project.existingLoadKW,
    simultaneityFactor: project.simultaneityFactor,
    existingEntrancePhases: project.existingEntrancePhases,
    existingEntranceBreaker: project.existingEntranceBreaker,
  }) : null;

  const demandKVA = project && sizingResult ? (((sizingResult.limitedPowerkW ?? project.charger?.power ?? 7.4) * (project.simultaneityFactor ?? 0.8)) + (project.existingLoadKW ?? 0)) : 0;
  const recommendedCategoryObj = project && sizingResult ? findRecommendedCategory(project.utility || "CEMIG", demandKVA) : null;
  const hasAdequateBreaker = project && recommendedCategoryObj && Number(project.existingEntranceBreaker || 0) >= (recommendedCategoryObj.breakerA ?? 40);

  // Edit fields
  const [editData, setEditData] = useState<any>({
    projectName: "",
    clientName: "",
    clientDocument: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    projectDescription: "",
    utility: "CEMIG",
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
    analysisNotes: "",
    fireExtinguisherType: "",
    hasEmergencyButton5m: true,
    requiresWarningSigns: true,
    fireDeptStandards: "",
    abntStandards: "",
    specificSafetyNotes: "",
    existingEntrancePhases: 3,
    existingEntranceBreaker: 50,
    existingEntranceCable: 10,
    existingEntranceCategory: "Tipo C",
    demandControlEnabled: false,
    demandControlLimit: 50
  });

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedAssistantUtility, setSelectedAssistantUtility] = useState("CEMIG");

  useEffect(() => {
    fetch(`/api/ev/sizing/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setEditData({
          projectName: data.projectName || "",
          clientName: data.clientName || "",
          clientDocument: data.clientDocument || "",
          clientPhone: data.clientPhone || "",
          clientEmail: data.clientEmail || "",
          clientAddress: data.clientAddress || "",
          projectDescription: data.projectDescription || "",
          utility: data.utility || "CEMIG",
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
          analysisNotes: data.analysisNotes || "",
          fireExtinguisherType: data.fireExtinguisherType || "",
          hasEmergencyButton5m: data.hasEmergencyButton5m ?? true,
          requiresWarningSigns: data.requiresWarningSigns ?? true,
          fireDeptStandards: data.fireDeptStandards || "",
          abntStandards: data.abntStandards || "",
          specificSafetyNotes: data.specificSafetyNotes || "",
          cosPhi: data.cosPhi !== undefined ? data.cosPhi : 1.0,
          existingEntrancePhases: data.existingEntrancePhases !== undefined ? data.existingEntrancePhases : 3,
          existingEntranceBreaker: data.existingEntranceBreaker !== undefined ? data.existingEntranceBreaker : 50,
          existingEntranceCable: data.existingEntranceCable !== undefined ? data.existingEntranceCable : 10,
          existingEntranceCategory: data.existingEntranceCategory || "Tipo C",
          demandControlEnabled: data.demandControlEnabled ?? false,
          demandControlLimit: data.demandControlLimit || 50
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
        <Loader className="w-10 h-10 animate-spin text-[#00BFA5]" />
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
                <Edit className="w-4 h-4" /> Editar Projeto
              </button>
              <button 
                onClick={() => router.push(`/carregamento/${params.id}/relatorio`)} 
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <FileText className="w-4 h-4" /> Gerar Relatório Técnico (AVCB)
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#00BFA5] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </>
          )}
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-8 space-y-8">
        {/* Header / Editor */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-6">
          <div className="flex-1">
            {isEditing ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Edit className="w-6 h-6 text-[#00BFA5]" />
                  <h2 className="text-2xl font-black text-slate-800">Editar Dimensionamento</h2>
                </div>
                <p className="text-sm text-slate-500">Altere os parâmetros técnicos abaixo e clique em "Salvar Alterações" no topo.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-6 h-6 text-[#00BFA5]" />
                  <h2 className="text-2xl font-black text-slate-800">Laudo Técnico — {project.projectName}</h2>
                </div>
                <p className="text-sm text-slate-500">{project.clientName || 'Cliente Geral'} — Atualizado em {new Date(project.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Body */}
        {isEditing && (
          <div className="space-y-8 animate-in fade-in">
             {/* SEÇÃO 1: IDENTIFICAÇÃO DO PROJETO & CLIENTE */}
             <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-2">1. Identificação do Projeto &amp; Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Nome do Projeto *</label>
                    <input type="text" className={inputCls} value={editData.projectName || ""} onChange={e => setEditData({...editData, projectName: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Cliente / Razão Social *</label>
                    <input type="text" className={inputCls} value={editData.clientName || ""} onChange={e => setEditData({...editData, clientName: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>CNPJ / CPF do Cliente</label>
                    <input type="text" className={inputCls} value={editData.clientDocument || ""} onChange={e => setEditData({...editData, clientDocument: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Telefone do Cliente</label>
                    <input type="text" className={inputCls} value={editData.clientPhone || ""} onChange={e => setEditData({...editData, clientPhone: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>E-mail do Cliente</label>
                    <input type="email" className={inputCls} value={editData.clientEmail || ""} onChange={e => setEditData({...editData, clientEmail: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Endereço da Instalação</label>
                    <input type="text" className={inputCls} value={editData.clientAddress || ""} onChange={e => setEditData({...editData, clientAddress: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Concessionária Responsável</label>
                    <div className="flex gap-2">
                      <select className={inputCls} value={editData.utility || "CEMIG"} onChange={e => setEditData({...editData, utility: e.target.value})}>
                        {Object.keys(UTILITY_DATABASE).map(u => (
                          <option key={u} value={u}>{UTILITY_DATABASE[u].name} ({UTILITY_DATABASE[u].region})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setAssistantOpen(true)}
                        className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all border-none cursor-pointer shrink-0"
                      >
                        Assistente
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de Edificação</label>
                    <select className={inputCls} value={editData.isCollective ? "coletiva" : "individual"} onChange={e => setEditData({...editData, isCollective: e.target.value === "coletiva"})}>
                      <option value="individual">Residencial Individual</option>
                      <option value="coletiva">Condomínio / Comercial (Coletiva)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Localização</label>
                    <select className={inputCls} value={editData.location} onChange={e => setEditData({...editData, location: e.target.value as any})}>
                      <option value="urbano">Urbano</option>
                      <option value="rural">Rural</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Descrição Detalhada do Projeto</label>
                    <textarea className={`${inputCls} h-20 resize-none`} placeholder="Detalhes da instalação..." value={editData.projectDescription || ""} onChange={e => setEditData({...editData, projectDescription: e.target.value})} />
                  </div>
                </div>
             </div>

             {/* SEÇÃO 2: DADOS DE CARGA E DEMANDA */}
             <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-6">
                <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-2">2. Carga Local, Demanda &amp; Padrão Existente</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>Carga instalada atual (kW)</label>
                    <input type="number" step="0.1" className={inputCls} value={editData.existingLoadKW} onChange={e => setEditData({...editData, existingLoadKW: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>Fator de Simultaneidade (0% a 100%)</label>
                    <div className="flex items-center gap-4 mt-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        className="w-full accent-[#00BFA5] cursor-pointer" 
                        value={editData.simultaneityFactor} 
                        onChange={e => setEditData({...editData, simultaneityFactor: parseFloat(e.target.value) || 0.8})} 
                      />
                      <span className="text-sm font-black text-[#1E3A8A] shrink-0 min-w-[45px] text-right">
                        {Math.round(editData.simultaneityFactor * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>FP do Carregador (cos ϕ)</label>
                    <input type="number" step="0.01" min="0.8" max="1" className={inputCls} value={editData.cosPhi || 1.0} onChange={e => setEditData({...editData, cosPhi: parseFloat(e.target.value) || 1.0})} />
                  </div>
                </div>

                {/* Padrão de Entrada Existente */}
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Padrão de Entrada Existente</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className={labelCls}>Nº Fases</label>
                      <select className={inputCls} value={editData.existingEntrancePhases || 3} onChange={e => setEditData({...editData, existingEntrancePhases: parseInt(e.target.value)})}>
                        <option value={1}>1 Fase (Monofásico)</option>
                        <option value={2}>2 Fases (Bifásico)</option>
                        <option value={3}>3 Fases (Trifásico)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Disjuntor Geral (A)</label>
                      <input type="number" className={inputCls} value={editData.existingEntranceBreaker || 50} onChange={e => setEditData({...editData, existingEntranceBreaker: parseFloat(e.target.value) || 50})} />
                    </div>
                    <div>
                      <label className={labelCls}>Cabo de Entrada (mm²)</label>
                      <input type="number" className={inputCls} value={editData.existingEntranceCable || 10} onChange={e => setEditData({...editData, existingEntranceCable: parseFloat(e.target.value) || 10})} />
                    </div>
                    <div>
                      <label className={labelCls}>Categoria Existente</label>
                      <input type="text" className={inputCls} value={editData.existingEntranceCategory || ""} onChange={e => setEditData({...editData, existingEntranceCategory: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Controle de Demanda */}
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Controle de Demanda Ativo (Limitação de Carga)</p>
                      <p className="text-[10px] text-slate-500 font-medium">O carregador limitará a corrente de recarga para manter o sistema ligado.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={editData.demandControlEnabled || false} onChange={e => setEditData({...editData, demandControlEnabled: e.target.checked})} />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  {editData.demandControlEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div>
                        <label className={labelCls}>Corrente Máxima do Padrão Limite (A)</label>
                        <input type="number" className={inputCls} value={editData.demandControlLimit || 50} onChange={e => setEditData({...editData, demandControlLimit: parseFloat(e.target.value) || 50})} />
                      </div>
                    </div>
                  )}
                </div>
             </div>

             {/* SEÇÃO 3: PARÂMETROS ELÉTRICOS */}
             <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-6">
                <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-2">3. Parâmetros Elétricos &amp; Distribuição</h3>
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
                    <label className={labelCls}>Método de Instalação</label>
                    <select className={inputCls} value={editData.installationMethod || "B1"} onChange={e => setEditData({...editData, installationMethod: e.target.value})}>
                      <option value="B1">Embutido (B1)</option>
                      <option value="C">Aparente (C)</option>
                    </select>
                  </div>
                </div>
             </div>

             {/* SEÇÃO 4: SEGURANÇA E NORMAS */}
             <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-6">
                <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-2">4. Segurança Contra Incêndio &amp; AVCB</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Modelo do Extintor</label>
                    <input type="text" className={inputCls} value={editData.fireExtinguisherType || ""} onChange={e => setEditData({...editData, fireExtinguisherType: e.target.value})} placeholder="Ex: CO2 6kg ou PQS B/C 6kg" />
                  </div>
                  <div>
                    <label className={labelCls}>Normas Aplicáveis</label>
                    <input type="text" className={inputCls} value={editData.abntStandards || ""} onChange={e => setEditData({...editData, abntStandards: e.target.value})} placeholder="Ex: NBR 17019, NBR 5410" />
                  </div>
                  <div>
                    <label className={labelCls}>Instruções Técnicas (Bombeiros)</label>
                    <input type="text" className={inputCls} value={editData.fireDeptStandards || ""} onChange={e => setEditData({...editData, fireDeptStandards: e.target.value})} placeholder="Ex: IT 41/CBMG" />
                  </div>
                  <div className="flex items-center gap-6 p-4 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                       <input type="checkbox" className="w-4 h-4 rounded text-[#00BFA5] cursor-pointer" checked={editData.hasEmergencyButton5m} onChange={e => setEditData({...editData, hasEmergencyButton5m: e.target.checked})} />
                       <span className="text-xs font-bold text-slate-700">Botão Emergência (5m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="checkbox" className="w-4 h-4 rounded text-[#00BFA5] cursor-pointer" checked={editData.requiresWarningSigns} onChange={e => setEditData({...editData, requiresWarningSigns: e.target.checked})} />
                       <span className="text-xs font-bold text-slate-700">Placas de Advertência</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Notas de Segurança AVCB</label>
                    <textarea className={inputCls} rows={3} value={editData.specificSafetyNotes || ""} onChange={e => setEditData({...editData, specificSafetyNotes: e.target.value})} />
                  </div>
                </div>
             </div>
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

                <div className="p-5 border border-slate-200 rounded-2xl bg-red-50/30 border-red-100">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-slate-800">Segurança & Bombeiros</h3>
                  </div>
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">Extintor</span>
                      <span className="font-bold text-slate-700">{project.fireExtinguisherType || 'PQS 6kg'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">Botão Emergência (5m)</span>
                      <span className={`font-bold ${project.hasEmergencyButton5m ? 'text-green-600' : 'text-red-600'}`}>{project.hasEmergencyButton5m ? 'Sim (Obrigatório)' : 'Não'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">Sinalização Visual</span>
                      <span className={`font-bold ${project.requiresWarningSigns ? 'text-green-600' : 'text-red-600'}`}>{project.requiresWarningSigns ? 'Obrigatória' : 'Não'}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Normas de Referência</p>
                      <p className="text-[10px] font-bold text-slate-600">{project.abntStandards}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMPARISONS AND DEMAND WARNINGS */}
            {sizingResult?.isCurrentLimited && (
              <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-3xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-orange-850 text-sm uppercase">Carga Limitada por Controle de Demanda</h4>
                  <p className="text-xs text-orange-700 mt-1 font-semibold leading-relaxed">
                    A potência nominal do carregador ({(sizingResult.originalPowerkW ?? 0)} kW) excedia a capacidade de energia disponível no padrão. O sistema reduziu a potência ativa de carregamento de forma inteligente para <span className="font-black">{(sizingResult.limitedPowerkW ?? 0).toFixed(1)} kW</span> (corrente de carregamento limitada de {(sizingResult.originalCurrent ?? 0).toFixed(1)}A para <span className="font-black">{(sizingResult.limitedCurrent ?? 0).toFixed(1)}A</span>) para preservar a estabilidade da instalação.
                  </p>
                </div>
              </div>
            )}

            {/* Comparação do Padrão de Entrada Existente vs. Requerido */}
            <div className="p-8 border-2 border-slate-200 rounded-[2.5rem] bg-slate-50/30 space-y-4">
              <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-wider">
                Comparação de Padrão de Entrada Existente vs. Requerido
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-white rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Padrão de Entrada Existente</p>
                  <p className="font-bold text-slate-800 text-sm">Fases: {project.existingEntrancePhases}F</p>
                  <p className="font-bold text-slate-800 text-sm">Disjuntor Geral: {project.existingEntranceBreaker}A</p>
                  <p className="font-bold text-slate-800 text-sm">Cabo de Entrada: {project.existingEntranceCable} mm²</p>
                  {project.existingEntranceCategory && <p className="font-bold text-slate-800 text-sm">Categoria/Tipo: {project.existingEntranceCategory}</p>}
                </div>
                <div className="p-4 bg-white rounded-2xl border border-[#00BFA5]/30 bg-[#00BFA5]/5">
                  <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-wider mb-2">Padrão Requerido (Dimensionado)</p>
                  <p className="font-bold text-slate-800 text-sm">Concessionária: {project.utility || "CEMIG"}</p>
                  <p className="font-bold text-slate-800 text-sm">Categoria Proposta: {recommendedCategoryObj ? `Tipo ${recommendedCategoryObj.id}` : "Subestação / Acima de BT"}</p>
                  <p className="font-bold text-slate-800 text-sm">Disjuntor Recomendado: {recommendedCategoryObj ? `${recommendedCategoryObj.breakerA} A` : "Sob Consulta"}</p>
                  {recommendedCategoryObj && <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{recommendedCategoryObj.desc}</p>}
                </div>
              </div>
              <div className="mt-2 p-4 rounded-2xl text-xs font-bold leading-relaxed border flex items-start gap-2 bg-white">
                {hasAdequateBreaker ? (
                  <>
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-green-700 font-semibold">
                      O padrão de entrada existente de {project.existingEntranceBreaker}A é adequado para suportar a demanda total calculada de {demandKVA.toFixed(1)} kVA. Não é necessária a reforma imediata do padrão.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="text-red-700 font-semibold">
                      ATENÇÃO: O padrão de entrada existente de {project.existingEntranceBreaker}A é INSUFICIENTE para a nova demanda dimensionada de {demandKVA.toFixed(1)} kVA. Recomendamos solicitar aumento de carga para a concessionária {project.utility || "CEMIG"} e reformar o padrão.
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Modelagem do Painel do Carregador (Trilho DIN) */}
            <VisualPanelModel 
              phases={project.charger?.phases || 1}
              breakerAmperes={sizingResult?.breaker || 40}
              idrType={sizingResult?.idrType || "IDR Tipo A 40A 30mA"}
              dpsType={sizingResult?.dpsType || "DPS Classe II 275V 20kA"}
              hasEmergencyButton={project.hasEmergencyButton5m}
            />

            {/* Painel de CAPEX e BOM */}
            {sizingResult && (
              <div className="p-8 border-2 border-emerald-100 rounded-[2.5rem] bg-emerald-50/10 shadow-sm space-y-6">
                 <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md">
                          <FileText className="w-5 h-5" />
                       </div>
                       <div>
                          <h3 className="font-black text-slate-800 uppercase tracking-tight">Orçamento Estimativo de Instalação (CAPEX)</h3>
                          <p className="text-xs text-slate-500 font-medium">Preços de referência comercial de mercado.</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Custo Total Estimativo</p>
                       <p className="text-2xl font-black text-emerald-600">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sizingResult.totalCost || 0)}
                       </p>
                    </div>
                 </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                       <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                             <th className="pb-3">Cód</th>
                             <th className="pb-3">Descrição Técnica</th>
                             <th className="pb-3 text-center">Qtd</th>
                             <th className="pb-3">Unidade</th>
                             <th className="pb-3 text-right">Preço Unit.</th>
                             <th className="pb-3 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                          {sizingResult.bom?.map((item: any, idx: number) => (
                             <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-3 font-mono text-slate-400 text-[10px]">{item.code}</td>
                                <td className="py-3 pr-4 text-slate-800">{item.description}</td>
                                <td className="py-3 text-center">{item.quantity}</td>
                                <td className="py-3 uppercase text-slate-400">{item.unit}</td>
                                <td className="py-3 text-right">
                                   {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.unitPrice)}
                                </td>
                                <td className="py-3 text-right text-slate-900">
                                   {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.totalPrice)}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 <p className="text-[9px] text-slate-400 font-medium italic">*Nota: Os valores acima são estimativos de insumos elétricos e condutores de cobre baseados em médias de mercado. Não inclui frete ou mão de obra de instalação especializada.</p>
              </div>
            )}

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
      
      {/* Assistente de Concessionárias Modal */}
      {assistantOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[999] p-4 font-['Montserrat',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#1E3A8A] text-white p-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#00BFA5]" />
                <h3 className="font-black uppercase tracking-wider text-sm">Assistente de Padrões de Entrada do Brasil</h3>
              </div>
              <button 
                onClick={() => setAssistantOpen(false)} 
                className="text-white hover:opacity-80 border-none bg-transparent cursor-pointer font-bold text-xs"
              >
                FECHAR
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
              <div>
                <label className={labelCls}>Escolha a Concessionária</label>
                <select 
                  className={inputCls} 
                  value={selectedAssistantUtility} 
                  onChange={e => setSelectedAssistantUtility(e.target.value)}
                >
                  {Object.keys(UTILITY_DATABASE).map(u => (
                    <option key={u} value={u}>{UTILITY_DATABASE[u].fullName} ({UTILITY_DATABASE[u].region})</option>
                  ))}
                </select>
              </div>
              
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-black text-xs uppercase text-[#1E3A8A]">
                  {UTILITY_DATABASE[selectedAssistantUtility].fullName}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600 pt-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Região de Atendimento</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].region}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Tensões Disponíveis</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].tensions}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Limite de Baixa Tensão (BT)</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].maxBTLimitKW} kW</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Norma Técnica Base</span>
                    <span className="text-slate-800">{UTILITY_DATABASE[selectedAssistantUtility].standardsDocName}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tabela de Padrão de Entrada BT</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[8px] tracking-wider border-b border-slate-200">
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Fases</th>
                        <th className="p-3">Limite Carga</th>
                        <th className="p-3">Disjuntor Geral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                      {UTILITY_DATABASE[selectedAssistantUtility].categories.map(cat => (
                        <tr key={cat.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900">{cat.id}</td>
                          <td className="p-3">{cat.phases === 1 ? 'Monofásico' : (cat.phases === 2 ? 'Bifásico' : 'Trifásico')}</td>
                          <td className="p-3">{cat.limitKW} kW</td>
                          <td className="p-3 text-[#1E3A8A]">{cat.breakerA} A</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  setEditData({ ...editData, utility: selectedAssistantUtility });
                  setAssistantOpen(false);
                }} 
                className="px-6 py-2.5 bg-[#00BFA5] text-white font-black rounded-xl text-xs hover:scale-102 transition-all border-none cursor-pointer"
              >
                SELECIONAR CONCESSIONÁRIA E APLICAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
