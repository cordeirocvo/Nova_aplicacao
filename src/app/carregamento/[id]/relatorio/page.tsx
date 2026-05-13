"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import dynamic from "next/dynamic";
import { 
  Zap, Shield, AlertTriangle, CheckCircle2, 
  MapPin, BatteryCharging, FileText, ChevronLeft,
  Info, Box, Building2, FlameKindling, Download, Loader2
} from "lucide-react";
import { EVReportPDF } from "@/components/ev/EVReportPDF";

// Importação dinâmica apenas do Link para evitar erros de SSR em ambientes que não suportam Blob/URL
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

export default function EVReportPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-16 h-16 border-4 border-[#00BFA5] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 font-black text-slate-400 uppercase tracking-widest text-sm">Gerando Laudo Técnico...</p>
    </div>
  );

  if (!project) return <div className="p-20 text-center">Projeto não encontrado.</div>;

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
          onClick={() => window.history.back()} 
          className="bg-white text-slate-600 px-6 py-3 rounded-full font-bold shadow-xl hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200"
        >
          <ChevronLeft className="w-5 h-5" /> VOLTAR
        </button>
      </div>

      <div className="fixed top-8 right-8 flex gap-4 z-50 print:hidden">
        <button 
          onClick={() => window.print()} 
          className="bg-white text-slate-600 px-6 py-4 rounded-full font-bold shadow-xl hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200"
        >
          <FileText className="w-5 h-5" />
          IMPRIMIR
        </button>

        {isMounted && project && (
          <PDFDownloadLink
            document={<EVReportPDF project={project} />}
            fileName={`Laudo_EV_${(project.projectName || "Projeto").replace(/[^a-z0-9]/gi, '_').toUpperCase()}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <button 
                disabled={pdfLoading}
                className="bg-[#1E3A8A] text-white px-8 py-4 rounded-full font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-3 border-none cursor-pointer disabled:opacity-50"
              >
                {pdfLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Download className="w-6 h-6" />
                )}
                {pdfLoading ? "PREPARANDO PDF..." : "BAIXAR LAUDO PDF"}
              </button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      {/* Report Container (A4) */}
      <div className="max-w-[210mm] mx-auto bg-white p-[15mm] shadow-[0_20px_60px_rgba(30,58,138,0.15)] print:shadow-none print:p-0 print:overflow-visible relative border border-slate-100" id="printable-area">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12 relative z-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-[#1E3A8A] rounded-xl flex items-center justify-center">
                  <Zap className="w-7 h-7 text-[#00BFA5]" />
               </div>
               <div>
                  <h2 className="text-[#1E3A8A] text-2xl font-[900] uppercase leading-none tracking-tighter">Cordeiro</h2>
                  <h2 className="text-[#00BFA5] text-xl font-[800] uppercase leading-none tracking-tighter">Energia EV</h2>
               </div>
            </div>
            <div>
              <h1 className="text-[#212529] text-3xl font-[900] uppercase leading-[0.9] tracking-tighter">Laudo Técnico de</h1>
              <h1 className="text-[#1E3A8A] text-3xl font-[900] uppercase leading-[0.9] tracking-tighter">Infraestrutura EV</h1>
              <p className="text-[9px] font-black text-slate-400 mt-4 tracking-[0.3em] uppercase">Conformidade NBR 17019 • NBR 5410 • IT 41/CBMG</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-[#1E3A8A] text-white px-8 py-4 rounded-3xl inline-block mb-3 shadow-xl">
              <span className="text-[9px] font-bold uppercase block opacity-60 tracking-widest mb-1">PROJETO Nº</span>
              <span className="text-2xl font-[900] tracking-tighter">{project.id.substring(project.id.length - 8).toUpperCase()}</span>
            </div>
            <p className="text-xs font-black text-[#1E3A8A] uppercase tracking-widest">{format(new Date(project.createdAt), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR })}</p>
          </div>
        </div>

        {/* Project Context Strip */}
        <div className="grid grid-cols-4 gap-4 bg-[#F8FAFC] rounded-[2.5rem] p-8 mb-10 border border-slate-100 relative overflow-hidden print:break-inside-avoid">
          <div className="relative z-10">
            <span className="text-[9px] font-black text-[#00BFA5] uppercase block mb-1 opacity-80">Identificação</span>
            <span className="text-xs font-black text-[#1E3A8A] uppercase leading-tight">{project.projectName}</span>
          </div>
          <div className="relative z-10 border-l border-slate-200 pl-4">
            <span className="text-[9px] font-black text-[#00BFA5] uppercase block mb-1 opacity-80">Cliente</span>
            <span className="text-xs font-black text-[#1E3A8A] uppercase leading-tight">{project.clientName || "Geral"}</span>
          </div>
          <div className="relative z-10 border-l border-slate-200 pl-4">
            <span className="text-[9px] font-black text-[#00BFA5] uppercase block mb-1 opacity-80">Localização</span>
            <span className="text-xs font-black text-[#1E3A8A] uppercase leading-tight">{project.location}</span>
          </div>
          <div className="relative z-10 border-l border-slate-200 pl-4">
            <span className="text-[9px] font-black text-[#00BFA5] uppercase block mb-1 opacity-80">Tipo Edificação</span>
            <span className="text-xs font-black text-[#1E3A8A] uppercase leading-tight">{project.isCollective ? "Coletiva" : "Individual"}</span>
          </div>
        </div>

        {/* Technical Summary Blocks */}
        <div className="grid grid-cols-3 gap-6 mb-10 print:break-inside-avoid">
           <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-[#1E3A8A]/30 transition-all">
              <div className="flex items-center gap-2 mb-3">
                 <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                 <span className="text-[10px] font-black text-slate-400 uppercase">Padrão CEMIG</span>
              </div>
              <p className="text-xl font-[900] text-[#1E3A8A] leading-tight">TIPO {project.entranceCategory}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{padraoEntrada}</p>
           </div>
           <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-[#00BFA5]/30 transition-all">
              <div className="flex items-center gap-2 mb-3">
                 <Zap className="w-4 h-4 text-[#00BFA5]" />
                 <span className="text-[10px] font-black text-slate-400 uppercase">Corrente Nominal</span>
              </div>
              <p className="text-xl font-[900] text-[#00BFA5] leading-tight">{project.calculatedCurrent.toFixed(1)} <span className="text-xs">A</span></p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{project.charger?.power} kW @ {project.hasTransformer ? project.transformerSecondaryVoltage : project.charger?.voltage}V</p>
           </div>
           <div className="bg-[#1E3A8A] rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
              <div className="flex items-center gap-2 mb-3 relative z-10">
                 <Shield className="w-4 h-4 text-[#00BFA5]" />
                 <span className="text-[10px] font-black text-white/50 uppercase">Proteção Principal</span>
              </div>
              <p className="text-xl font-[900] text-white leading-tight relative z-10">{project.calculatedBreaker} <span className="text-xs">A</span></p>
              <p className="text-[10px] font-bold text-[#00BFA5] mt-1 uppercase relative z-10">DISJUNTOR CURVA C</p>
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                 <Shield className="w-20 h-20 text-white" />
              </div>
           </div>
        </div>

        {/* Detailed Engineering Section */}
        <div className="bg-[#0A192F] text-white p-10 rounded-[3rem] shadow-2xl mb-10 relative overflow-hidden print:break-inside-avoid">
           <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-5">
              <Zap className="w-6 h-6 text-[#00BFA5]" />
              <h3 className="text-xl font-black uppercase tracking-tight">Dimensionamento de Condutores e Circuitos</h3>
           </div>

           <div className="space-y-10">
              {/* PRIMARY SEGMENT (if transformer) */}
              {project.hasTransformer && (
                <div className="relative">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-[#00BFA5] rounded-full animate-pulse"></div>
                         <p className="text-[11px] font-black text-[#00BFA5] uppercase tracking-widest">Lado Primário (Alimentação Transformador)</p>
                      </div>
                      <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase">Tensão: {project.transformerPrimaryVoltage}V</span>
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <p className="text-[9px] opacity-40 uppercase font-black mb-1">Cabo Recomendado</p>
                         <p className="text-2xl font-black">{project.calculatedPrimaryCable} <span className="text-sm">mm²</span></p>
                         <p className="text-[8px] opacity-30 mt-1 uppercase">Cobre isolação HEPR/XLPE</p>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <p className="text-[9px] opacity-40 uppercase font-black mb-1">Proteção Termomagnética</p>
                         <p className="text-2xl font-black">{project.calculatedPrimaryBreaker} <span className="text-sm">A</span></p>
                         <p className="text-[8px] opacity-30 mt-1 uppercase">Tripolar Curva C</p>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <p className="text-[9px] opacity-40 uppercase font-black mb-1">Distância Lançada</p>
                         <p className="text-2xl font-black">{project.transformerDistance} <span className="text-sm">m</span></p>
                         <p className="text-[8px] opacity-30 mt-1 uppercase">Quadro Geral para Transfo</p>
                      </div>
                   </div>
                </div>
              )}

              {/* SECONDARY SEGMENT */}
              <div className="relative">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-[#00BFA5] rounded-full"></div>
                       <p className="text-[11px] font-black text-[#00BFA5] uppercase tracking-widest">
                          {project.hasTransformer ? "Lado Secundário (Alimentação do Carregador)" : "Circuito de Alimentação Direta"}
                       </p>
                    </div>
                    <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase">Tensão: {project.hasTransformer ? project.transformerSecondaryVoltage : project.charger?.voltage}V</span>
                 </div>
                 <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                       <p className="text-[9px] opacity-40 uppercase font-black mb-1">Cabo</p>
                       <p className="text-2xl font-black">{project.calculatedCableGauge} <span className="text-sm">mm²</span></p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                       <p className="text-[9px] opacity-40 uppercase font-black mb-1">Disjuntor</p>
                       <p className="text-2xl font-black">{project.calculatedBreaker} <span className="text-sm">A</span></p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                       <p className="text-[9px] opacity-40 uppercase font-black mb-1">Queda de Tensão</p>
                       <p className={`text-2xl font-black ${project.voltageDrop > 4 ? "text-red-400" : "text-[#00BFA5]"}`}>{project.voltageDrop}<span className="text-sm">%</span></p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                       <p className="text-[9px] opacity-40 uppercase font-black mb-1">Eletroduto</p>
                       <p className="text-sm font-black mt-2 leading-tight uppercase">{project.calculatedConduit}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="absolute right-[-30px] top-[-30px] w-64 h-64 bg-[#00BFA5] rounded-full opacity-[0.03] pointer-events-none"></div>
        </div>

        {/* Protections & Safety Section */}
        <div className="grid grid-cols-2 gap-8 mb-10 print:break-inside-avoid">
           <div className="space-y-6">
              <div className="p-8 border-2 border-slate-100 rounded-[2.5rem] bg-slate-50/30">
                 <h4 className="text-[11px] font-black text-[#1E3A8A] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Proteções Específicas NBR 17019
                 </h4>
                 <div className="space-y-6">
                    <div className="relative pl-4 border-l-4 border-[#00BFA5]">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dispositivo IDR (Residual)</p>
                       <p className="text-sm font-black text-slate-800">{project.calculatedIDR || project.calculatedDR}</p>
                       <p className="text-[8px] text-slate-500 mt-1 italic">* Instalado no lado secundário (pós-transformador).</p>
                    </div>
                    <div className="relative pl-4 border-l-4 border-[#1E3A8A]">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dispositivo DPS (Surto)</p>
                       <p className="text-sm font-black text-slate-800">{project.calculatedDPS}</p>
                       <p className="text-[8px] text-slate-500 mt-1 italic">* Instalado no ponto de entrada do sistema.</p>
                    </div>
                    <div className="relative pl-4 border-l-4 border-slate-300">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sistema de Aterramento ({project.groundingType})</p>
                       <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{project.groundingAnalysis}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="p-8 border-2 border-red-50 rounded-[2.5rem] bg-red-50/20">
                 <h4 className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <FlameKindling className="w-4 h-4" /> Segurança AVCB / Bombeiros (IT 41)
                 </h4>
                 <div className="space-y-5">
                    <div className="flex items-start gap-3">
                       <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase">Extintor de Incêndio</p>
                          <p className="text-xs text-slate-600 font-bold">{project.fireExtinguisherType}</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase">Botão de Emergência (Ponto Remoto)</p>
                          <p className="text-xs text-slate-600 font-bold">Obrigatório a 5m do equipamento (Instalar tipo Cogumelo com trava).</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase">Sinalização de Advertência</p>
                          <p className="text-xs text-slate-600 font-bold">Instalar placas conforme NBR 17019 e pintura de solo demarcatória.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Standards & Notes */}
        <div className="bg-[#F8FAFC] p-10 rounded-[3rem] border border-slate-100 mb-10">
           <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Normas e Regulamentações Aplicáveis</h3>
           <div className="grid grid-cols-2 gap-4">
              <ul className="space-y-2">
                 {project.abntStandards?.split(", ").map((s: string, i: number) => (
                   <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <div className="w-1.5 h-1.5 bg-[#00BFA5] rounded-full"></div> {s}
                   </li>
                 ))}
              </ul>
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Instrução Técnica Bombeiros</p>
                 <p className="text-xs font-black text-[#1E3A8A]">{project.fireDeptStandards || "IT 41/2023 - CBMG"}</p>
                 <p className="text-[9px] text-slate-500 mt-2 italic">Refere-se à segurança em sistemas de recarga em garagens e estacionamentos.</p>
              </div>
           </div>
           {project.specificSafetyNotes && (
             <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Observações Técnicas Adicionais</p>
                <p className="text-[10px] text-slate-600 leading-relaxed font-medium">{project.specificSafetyNotes}</p>
             </div>
           )}
        </div>

        {/* Final Disclaimer */}
        <div className="text-[9px] text-slate-400 leading-relaxed text-justify px-4">
           Este laudo técnico foi gerado com base nas especificações do fabricante e normas técnicas vigentes na data de emissão. 
           A responsabilidade pela execução da obra deve ser de profissional habilitado com emissão de ART/TRT. 
           A instalação do transformador, quando necessária, deve prever ventilação adequada e proteção contra intempéries.
        </div>

        {/* Signature Area */}
        <div className="mt-20 pt-10 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-20 px-10">
            <div className="text-center">
              <div className="h-20 flex items-end justify-center mb-4 relative">
                 <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                    <Zap className="w-20 h-20 text-[#1E3A8A]" />
                 </div>
                 <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.5em] rotate-[-2deg]">Assinatura Engenharia</p>
              </div>
              <div className="h-[1px] w-full bg-slate-300 mb-3"></div>
              <p className="text-[11px] font-[900] uppercase text-[#1E3A8A]">Eng. Responsável Técnico</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Cordeiro Energia O&M</p>
            </div>
            <div className="text-center">
              <div className="h-20 flex items-end justify-center mb-4"></div>
              <div className="h-[1px] w-full bg-slate-300 mb-3"></div>
              <p className="text-[11px] font-[900] uppercase text-slate-800">Aceite e Aprovação</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{project.clientName || "Cliente Contratante"}</p>
            </div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-20 flex justify-between items-center opacity-40 pt-10">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Cordeiro Energia • Sistema de Gestão de Infraestrutura EV</p>
          <div className="flex items-center gap-2">
             <span className="text-[8px] font-black text-[#1E3A8A]">POWERED BY</span>
             <h2 className="text-[#1E3A8A] text-xs font-black uppercase tracking-tighter">Cordeiro SaaS</h2>
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
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
            position: relative !important;
            display: block !important;
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
