"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Zap, Shield, AlertTriangle, CheckCircle, 
  MapPin, BatteryCharging, FileText, ChevronLeft,
  Info, Box, Building, FlameKindling, Download, Loader, X, Globe
} from "lucide-react";
import { calculateSizing } from "@/lib/ev/sizingEngine";
import { UTILITY_DATABASE, findRecommendedCategory } from "@/lib/ev/utilityStandards";
import VisualPanelModel from "@/components/ev/VisualPanelModel";

export default function EVReportPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ev/sizing/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-['Montserrat',sans-serif]">
      <div className="w-16 h-16 border-4 border-[#00BFA5] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 font-black text-slate-400 uppercase tracking-widest text-sm">Gerando Relatório Técnico...</p>
    </div>
  );

  if (!project) return <div className="p-20 text-center font-['Montserrat',sans-serif]">Projeto não encontrado.</div>;

  // Sizing Calculation on the fly
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
    existingEntranceCable: project.existingEntranceCable
  }) : null;

  const demandKVA = project && sizingResult ? (((sizingResult.limitedPowerkW ?? project.charger?.power ?? 7.4) * (project.simultaneityFactor ?? 0.8)) + (project.existingLoadKW ?? 0)) : 0;
  const recommendedCategoryObj = project && sizingResult ? findRecommendedCategory(project.utility || "CEMIG", demandKVA) : null;
  const hasAdequateBreaker = project && recommendedCategoryObj && Number(project.existingEntranceBreaker || 0) >= (recommendedCategoryObj.breakerA ?? 40);

  const notes = project.analysisNotes?.split(" | ") || [];
  const padraoEntrada = notes[0] || "-";
  const ramalTipo = notes[1] || "-";
  const demandaFaixa = notes[2] || "-";

  return (
    <div className="bg-[#F1F5F9] min-h-screen py-12 px-4 print:p-0 print:bg-white font-['Montserrat',sans-serif]">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      
      {/* Controls */}
      <div className="fixed top-8 left-8 flex flex-col gap-3 z-50 print:hidden">
        <button 
          onClick={() => router.push(`/carregamento/${params.id}`)} 
          className="bg-white text-slate-600 px-6 py-3 rounded-full font-bold shadow-xl hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" /> VOLTAR
        </button>
      </div>

      <div className="fixed top-8 right-8 flex gap-4 z-50 print:hidden">
        <button 
          onClick={() => window.print()} 
          className="bg-[#1E3A8A] text-white px-8 py-4 rounded-full font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-3 border-none cursor-pointer"
        >
          <Download className="w-6 h-6" />
          GERAR / BAIXAR PDF
        </button>
      </div>

      {/* Report Container (A4 pages) */}
      <div id="printable-area" className="flex flex-col gap-12 print:gap-0 items-center w-full">
        
        {/* === PÁGINA 1 === */}
        <div className="print-page w-[210mm] h-[297mm] bg-white p-[15mm] shadow-[0_20px_60px_rgba(30,58,138,0.15)] print:shadow-none print:w-[210mm] print:h-[297mm] print:p-[15mm] print:m-0 relative border border-slate-200 flex flex-col print:border-none page-break-after print:overflow-hidden box-border">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <div className="w-10 h-10 bg-[#1E3A8A] rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-[#00BFA5]" />
                 </div>
                 <div>
                    <h2 className="text-[#1E3A8A] text-lg font-[900] uppercase leading-none tracking-tighter">Cordeiro Energia</h2>
                    <h2 className="text-[#00BFA5] text-base font-[800] uppercase leading-none tracking-tighter">&amp; Coenergy</h2>
                 </div>
              </div>
              <div>
                <h1 className="text-[#212529] text-2xl font-[900] uppercase leading-[0.9] tracking-tighter">Laudo Técnico de Sizing</h1>
                <h1 className="text-[#1E3A8A] text-2xl font-[900] uppercase leading-[0.9] tracking-tighter">Infraestrutura de Recarga</h1>
                <p className="text-[8px] font-black text-slate-400 mt-2 tracking-[0.25em] uppercase">NBR 17019 • NBR 5410 • IT 41/CBMG</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-[#1E3A8A] text-white px-6 py-3 rounded-2xl inline-block mb-2 shadow-md">
                <span className="text-[8px] font-bold uppercase block opacity-60 tracking-widest mb-0.5">LAUDO Nº</span>
                <span className="text-xl font-[900] tracking-tighter">{project.id.substring(project.id.length - 8).toUpperCase()}</span>
              </div>
              <p className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest">{format(new Date(project.createdAt), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR })}</p>
            </div>
          </div>

          {/* Brand Websites Header Watermark */}
          <div className="flex justify-between text-[7px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 pb-2 mb-6">
            <span>www.cordeiroenergia.com.br</span>
            <span>www.coenergysolar.com.br</span>
          </div>

          {/* Client & Project Identification */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-[#F8FAFC] rounded-2xl p-5 mb-6 border border-slate-100 text-xs">
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Identificação do Projeto</span>
              <span className="font-bold text-[#1E3A8A] uppercase">{project.projectName}</span>
            </div>
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Cliente / Razão Social</span>
              <span className="font-bold text-[#1E3A8A] uppercase">{project.clientName || "Geral"}</span>
            </div>
            {project.clientDocument && (
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">CNPJ / CPF</span>
                <span className="font-bold text-slate-700">{project.clientDocument}</span>
              </div>
            )}
            {project.clientAddress && (
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Local da Instalação</span>
                <span className="font-bold text-slate-700">{project.clientAddress}</span>
              </div>
            )}
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Concessionária</span>
              <span className="font-bold text-slate-700">{project.utility || "CEMIG"}</span>
            </div>
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Tipo de UC</span>
              <span className="font-bold text-slate-700">{project.isCollective ? "Coletiva / Condomínio" : "Individual / Residencial"} ({project.location})</span>
            </div>
          </div>

          {/* Comparison Block */}
          <div className="border-2 border-slate-100 rounded-2xl p-5 mb-6 space-y-4 bg-slate-50/50">
            <h3 className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-wider">
              Análise do Padrão de Entrada &amp; Demanda Elétrica
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Padrão Existente</p>
                <p className="font-bold text-slate-700">Fases: {project.existingEntrancePhases}F</p>
                <p className="font-bold text-slate-700">Disjuntor Geral: {project.existingEntranceBreaker}A</p>
                <p className="font-bold text-slate-700">Cabo Geral: {project.existingEntranceCable} mm²</p>
                {project.existingEntranceCategory && <p className="font-bold text-slate-700">Categoria: {project.existingEntranceCategory}</p>}
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#00BFA5]/30 bg-[#00BFA5]/5 text-xs">
                <p className="text-[8px] font-black text-[#00BFA5] uppercase mb-1">Padrão Proposto / Requerido</p>
                <p className="font-bold text-slate-700">Concessionária: {project.utility || "CEMIG"}</p>
                <p className="font-bold text-slate-700 font-black text-[#1E3A8A]">Categoria: {recommendedCategoryObj ? `Tipo ${recommendedCategoryObj.id}` : "Acima de BT (MT)"}</p>
                <p className="font-bold text-slate-700">Geral Recomendado: {recommendedCategoryObj ? `${recommendedCategoryObj.breakerA}A` : "Subestação"}</p>
                {recommendedCategoryObj && <p className="text-[8px] text-slate-500 font-bold uppercase">{recommendedCategoryObj.desc}</p>}
              </div>
            </div>
            <div className="p-3 rounded-xl text-[10px] font-bold leading-relaxed border flex items-start gap-2 bg-white">
              {hasAdequateBreaker ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-green-700 font-semibold">
                    O padrão existente de {project.existingEntranceBreaker}A é elétricamente ADEQUADO para suportar a nova demanda dimensionada de {demandKVA.toFixed(1)} kVA. Não é necessária a reforma imediata do padrão.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-red-700 font-semibold">
                    ATENÇÃO: O padrão de entrada existente de {project.existingEntranceBreaker}A é INSUFICIENTE para a nova demanda de {demandKVA.toFixed(1)} kVA. É necessária a reforma do padrão e solicitação de aumento de carga junto à concessionária {project.utility || "CEMIG"}.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Sizing Outputs */}
          <div className="bg-[#0A192F] text-white p-6 rounded-2xl relative overflow-hidden flex-1 flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <Zap className="w-5 h-5 text-[#00BFA5]" />
                <h3 className="text-sm font-black uppercase tracking-tight">Dimensionamento de Condutores e Circuitos</h3>
             </div>

             <div className="space-y-6">
                {/* Lado Primário */}
                {project.hasTransformer && (
                  <div>
                     <div className="flex justify-between mb-2 text-[10px]">
                        <span className="font-black text-[#00BFA5] uppercase tracking-widest">Circuito Primário (Rede → Transfo)</span>
                        <span className="font-bold">Alimentação: {project.transformerPrimaryVoltage}V (Trifásico)</span>
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                           <p className="text-[8px] opacity-40 uppercase font-black mb-0.5">Cabo</p>
                           <p className="text-lg font-black">{project.calculatedPrimaryCable} mm²</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                           <p className="text-[8px] opacity-40 uppercase font-black mb-0.5">Disjuntor</p>
                           <p className="text-lg font-black">{project.calculatedPrimaryBreaker} A</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                           <p className="text-[8px] opacity-40 uppercase font-black mb-0.5">Distância</p>
                           <p className="text-lg font-black">{project.transformerDistance} m</p>
                        </div>
                     </div>
                  </div>
                )}

                {/* Lado Secundário */}
                <div>
                   <div className="flex justify-between mb-2 text-[10px]">
                      <span className="font-black text-[#00BFA5] uppercase tracking-widest">
                         {project.hasTransformer ? "Circuito Secundário (Transfo → Carregador)" : "Circuito de Força Direto"}
                      </span>
                      <span className="font-bold">Alimentação: {project.hasTransformer ? project.transformerSecondaryVoltage : project.charger?.voltage}V ({project.charger?.phases}F)</span>
                   </div>
                   <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                         <p className="text-[8px] opacity-40 uppercase font-black mb-0.5">Cabo</p>
                         <p className="text-lg font-black">{project.calculatedCableGauge} mm²</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                         <p className="text-[8px] opacity-40 uppercase font-black mb-0.5">Disjuntor</p>
                         <p className="text-lg font-black">{project.calculatedBreaker} A</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                         <p className="text-[8px] opacity-40 uppercase font-black mb-0.5">Queda Tensão</p>
                         <p className={`text-lg font-black ${project.voltageDrop > 4 ? "text-red-400" : "text-[#00BFA5]"}`}>{project.voltageDrop}%</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                         <p className="text-[8px] opacity-40 uppercase font-black mb-0.5">Infraestrutura</p>
                         <p className="text-[10px] font-black leading-tight uppercase truncate mt-1">{project.calculatedConduit}</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Footer Página 1 */}
          <div className="mt-8 pt-4 flex justify-between items-center opacity-40 border-t border-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Cordeiro Energia • Laudo de Dimensionamento VE</span>
            <span>PÁGINA 1 DE 3</span>
          </div>
        </div>

        {/* === PÁGINA 2 === */}
        <div className="print-page w-[210mm] h-[297mm] bg-white p-[15mm] shadow-[0_20px_60px_rgba(30,58,138,0.15)] print:shadow-none print:w-[210mm] print:h-[297mm] print:p-[15mm] print:m-0 relative border border-slate-200 flex flex-col print:border-none page-break-after print:overflow-hidden box-border">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
               <Zap className="w-5 h-5 text-[#1E3A8A]" />
               <h3 className="text-xs font-black uppercase text-[#1E3A8A]">Diagrama de Proteções &amp; Orçamento CAPEX</h3>
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Laudo Nº {project.id.substring(project.id.length - 8).toUpperCase()}</span>
          </div>

          <div className="flex justify-between text-[7px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100 pb-2 mb-6">
            <span>www.cordeiroenergia.com.br</span>
            <span>www.coenergysolar.com.br</span>
          </div>

          {/* DIN-rail protective model */}
          <div className="mb-6 scale-95 origin-top print:break-inside-avoid">
            <VisualPanelModel 
              phases={project.charger?.phases || 1}
              breakerAmperes={sizingResult?.breaker || 40}
              idrType={sizingResult?.idrType || "IDR Tipo A 40A 30mA"}
              dpsType={sizingResult?.dpsType || "DPS Classe II 275V 20kA"}
              hasEmergencyButton={project.hasEmergencyButton5m}
            />
          </div>

          {/* Detailed Protections and Grounding */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs print:break-inside-avoid">
            <div className="p-4 bg-slate-50 border border-slate-250 rounded-xl space-y-3">
              <h4 className="text-[9px] font-black text-[#1E3A8A] uppercase tracking-wider">Especificações de Proteção</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Dispositivo IDR</span>
                  <span className="font-bold text-slate-800 text-[11px]">{sizingResult?.idrType}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Dispositivo DPS</span>
                  <span className="font-bold text-slate-800 text-[11px]">{sizingResult?.dpsType}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-250 rounded-xl space-y-2">
              <h4 className="text-[9px] font-black text-[#1E3A8A] uppercase tracking-wider">Sistema de Aterramento</h4>
              <div>
                <span className="text-[8px] text-slate-400 font-black uppercase block">Esquema Recomendado</span>
                <span className="font-bold text-slate-800 text-[11px]">Sistema {project.groundingType || "TT"}</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-tight">{sizingResult?.groundingAnalysis}</p>
            </div>
          </div>

          {/* CAPEX & BOM Block */}
          {sizingResult && (
            <div className="p-5 border-2 border-emerald-150 rounded-2xl bg-emerald-50/10 flex-1 flex flex-col justify-between print:break-inside-avoid">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2 mb-3">
                   <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Lista de Insumos &amp; CAPEX Comercial</h3>
                   </div>
                   <div className="text-right">
                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Total Estimado</span>
                      <span className="text-lg font-black text-emerald-600">
                         {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sizingResult.totalCost || 0)}
                      </span>
                   </div>
                </div>

                <div className="overflow-hidden">
                   <table className="w-full text-left text-[9px] leading-tight">
                      <thead>
                         <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[8px]">
                            <th className="pb-2">Cód</th>
                            <th className="pb-2">Descrição</th>
                            <th className="pb-2 text-center">Qtd</th>
                            <th className="pb-2 text-right">Unitário</th>
                            <th className="pb-2 text-right">Total</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-bold">
                         {sizingResult.bom?.slice(0, 7).map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                               <td className="py-1.5 font-mono text-slate-400 text-[8px]">{item.code}</td>
                               <td className="py-1.5 pr-2 text-slate-800 truncate max-w-[200px]">{item.description}</td>
                               <td className="py-1.5 text-center">{item.quantity} {item.unit}</td>
                               <td className="py-1.5 text-right">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.unitPrice)}
                               </td>
                               <td className="py-1.5 text-right text-slate-900">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.totalPrice)}
                                </td>
                            </tr>
                         ))}
                         {sizingResult.bom && sizingResult.bom.length > 7 && (
                            <tr>
                               <td colSpan={5} className="py-1 text-slate-400 italic text-center text-[8px]">
                                 (+ {sizingResult.bom.length - 7} outros itens de fixação e acessórios inclusos no valor total)
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
              </div>
              <p className="text-[7.5px] text-slate-400 font-medium italic mt-4">*Valores médios de mercado em BRL para materiais elétricos de primeira linha (Siemens, Schneider, Clamper ou similar). Exclui custos logísticos de frete, impostos regionais e mão de obra de engenharia de montagem.</p>
            </div>
          )}

          {/* Footer Página 2 */}
          <div className="mt-8 pt-4 flex justify-between items-center opacity-40 border-t border-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Cordeiro Energia • Laudo de Dimensionamento VE</span>
            <span>PÁGINA 2 DE 3</span>
          </div>
        </div>

        {/* === PÁGINA 3 === */}
        <div className="print-page w-[210mm] h-[297mm] bg-white p-[15mm] shadow-[0_20px_60px_rgba(30,58,138,0.15)] print:shadow-none print:w-[210mm] print:h-[297mm] print:p-[15mm] print:m-0 relative border border-slate-200 flex flex-col print:border-none print:overflow-hidden box-border">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
               <FlameKindling className="w-5 h-5 text-red-600" />
               <h3 className="text-xs font-black uppercase text-red-600">Segurança Contra Incêndio &amp; AVCB</h3>
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Laudo Nº {project.id.substring(project.id.length - 8).toUpperCase()}</span>
          </div>

          <div className="flex justify-between text-[7px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100 pb-2 mb-6">
            <span>www.cordeiroenergia.com.br</span>
            <span>www.coenergysolar.com.br</span>
          </div>

          {/* AVCB & IT-41 Fire Safety Requirements */}
          <div className="bg-red-50/10 border border-red-100 rounded-2xl p-5 mb-6 text-xs space-y-4 print:break-inside-avoid">
            <div className="flex items-center gap-2 text-red-600 border-b border-red-100 pb-2">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="font-black uppercase tracking-wider text-[10px]">Exigências Técnicas de Segurança AVCB (IT 41/2023)</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="pl-3 border-l-2 border-red-500">
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Extintor Dedicado</span>
                  <span className="font-bold text-slate-800">{project.fireExtinguisherType || "CO2 6kg ou PQS B/C 6kg"}</span>
                  <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Instalar a no máximo 15 metros do ponto de recarga, com sinalização de piso e parede.</p>
                </div>
                <div className="pl-3 border-l-2 border-red-500">
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Placas de Sinalização</span>
                  <span className="font-bold text-slate-800">Sinalização de Advertência</span>
                  <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Instalar placas de advertência visual próximo ao carregador com os dizeres: "PERIGO - ESTAÇÃO DE RECARGA DE VEÍCULOS ELÉTRICOS" e instruções para caso de emergência.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="pl-3 border-l-2 border-red-500">
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Comando de Desligamento Emergência</span>
                  <span className="font-bold text-slate-800">{project.hasEmergencyButton5m ? "Configurado com Disparo MX" : "Recomendado Bobina MX"}</span>
                  <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Botão de emergência externo tipo cogumelo a 5 metros de distância. Conectado à bobina de disparo MX instalada junto ao disjuntor geral do QDC.</p>
                </div>
                <div className="pl-3 border-l-2 border-red-500">
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Normativa de Bombeiros</span>
                  <span className="font-bold text-slate-800">{project.fireDeptStandards || "IT 41/2023 - CBMG"}</span>
                  <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5">Padrão normativo de combate a incêndios e pânico do Corpo de Bombeiros Militar.</p>
                </div>
              </div>
            </div>
          </div>

          {/* MX Shunt Trip schematic layout */}
          <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 mb-6 print:break-inside-avoid">
            <h4 className="text-[9px] font-black text-[#1E3A8A] uppercase tracking-wider mb-3">Diagrama de Desligamento de Emergência Remoto (AVCB)</h4>
            <div className="border border-slate-200 rounded-xl bg-white p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Emergency button simulation */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-600 border-4 border-red-700 flex items-center justify-center shadow-md animate-pulse">
                  <div className="w-4 h-4 bg-red-800 rounded-full"></div>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-black uppercase block leading-none">Comando Remoto</span>
                  <span className="text-[10px] font-black text-slate-800">Botão Cogumelo (5m)</span>
                </div>
              </div>

              {/* Wire path simulation */}
              <div className="flex-1 border-t-2 border-dashed border-red-500 h-0 relative flex justify-center items-center py-2">
                <span className="text-[8px] font-mono text-red-600 bg-white px-2 py-0.5 border border-red-200 rounded">
                  Circuito de Disparo MX (Cabo 1.5mm² - 24V ou 220V)
                </span>
              </div>

              {/* Shunt Coil + Breaker */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex gap-0.5">
                  <div className="w-6 h-12 bg-red-100 border border-red-300 rounded flex items-center justify-center font-bold text-red-700 text-[8px]">MX</div>
                  <div className="w-8 h-12 bg-slate-100 border border-slate-300 rounded flex items-center justify-center font-bold text-slate-700 text-[8px]">Geral</div>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-black uppercase block leading-none">Proteção Geral</span>
                  <span className="text-[10px] font-black text-slate-800">Disjuntor Geral QDC</span>
                </div>
              </div>
            </div>
            <p className="text-[8px] text-slate-500 leading-tight mt-3">
              *Nota de Funcionamento: Ao pressionar o botão cogumelo de emergência, uma corrente é enviada à bobina MX (Shunt Trip) acoplada eletromecanicamente ao disjuntor geral do QDC. Isso força o desarme mecânico do disjuntor geral, desligando instantaneamente toda a energia do wallbox, mesmo em caso de falha de software.
            </p>
          </div>

          {/* Reference standards list */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-5 mb-6 text-xs print:break-inside-avoid">
            <h4 className="text-[9px] font-black text-[#1E3A8A] uppercase tracking-wider mb-2">Normas de Referência Aplicáveis</h4>
            <div className="grid grid-cols-2 gap-4 text-[9px] font-semibold text-slate-600">
              <ul className="space-y-1">
                <li>• ABNT NBR 17019 - Instalações de Recarga de VE</li>
                <li>• ABNT NBR 5410 - Instalações Elétricas de Baixa Tensão</li>
                <li>• ABNT NBR 14039 - Instalações Elétricas de Média Tensão</li>
              </ul>
              <ul className="space-y-1">
                <li>• ABNT NBR IEC 61851-1 - Sistema de Recarga Condutiva de VE</li>
                <li>• IT 41/2023 - Diretiva do Corpo de Bombeiros Militar</li>
                <li>• ND-5.1/5.2 - Normas técnicas de padrões de entrada</li>
              </ul>
            </div>
          </div>

          {/* Disclaimers & Signature block */}
          <div className="mt-auto print:break-inside-avoid">
            <p className="text-[8px] text-slate-400 leading-relaxed text-justify mb-8">
              Este laudo técnico certifica o dimensionamento correto e conformidade das proteções elétricas da infraestrutura de recarga VE Cordeiro Energia / Coenergy com base na legislação técnica brasileira. A execução da montagem do QDC e passagem dos cabos deve ser realizada por profissional devidamente qualificado com emissão do Termo de Responsabilidade Técnica (ART/TRT).
            </p>

            <div className="grid grid-cols-2 gap-12 px-8 pt-4 border-t border-slate-100">
              <div className="text-center">
                <div className="h-12 flex items-end justify-center mb-2 relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.02]">
                    <Zap className="w-12 h-12 text-[#1E3A8A]" />
                  </div>
                  <p className="text-[8px] font-black uppercase text-slate-300 tracking-[0.4em]">Assinatura O&amp;M</p>
                </div>
                <div className="h-[1px] w-full bg-slate-200 mb-2"></div>
                <p className="text-[10px] font-black uppercase text-[#1E3A8A]">Eng. Responsável Técnico</p>
                <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Cordeiro Energia O&amp;M</p>
              </div>
              <div className="text-center">
                <div className="h-12 flex items-end justify-center mb-2"></div>
                <div className="h-[1px] w-full bg-slate-200 mb-2"></div>
                <p className="text-[10px] font-black uppercase text-slate-800">Aceite e Aprovação</p>
                <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{project.clientName || "Cliente Contratante"}</p>
              </div>
            </div>
          </div>

          {/* Footer Página 3 */}
          <div className="mt-8 pt-4 flex justify-between items-center opacity-40 border-t border-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Cordeiro Energia • Laudo de Dimensionamento VE</span>
            <span>PÁGINA 3 DE 3</span>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          aside, nav, button, .fixed, .print\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          #printable-area {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            position: relative !important;
            overflow: hidden !important;
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
