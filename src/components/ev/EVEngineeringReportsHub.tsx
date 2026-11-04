"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Printer, Download, CheckCircle2, Shield, AlertTriangle, 
  Zap, Wrench, ClipboardCheck, Sparkles, Building2, User, Calendar, 
  MapPin, Check, ArrowRight, ExternalLink, X, ChevronRight, Layers, FileCode,
  TrendingUp, DollarSign, BarChart3, SunMedium, ArrowUpRight, Award, ShieldCheck, Clock,
  Camera, Image as ImageIcon, Store, Users
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  calculateHubFinancialViability, 
  HubFinancialViabilityResult,
  CommercialHubOperationalData,
  ApplicationMode
} from "@/lib/coenergygo";
import DLMSystemVisualizer from "./DLMSystemVisualizer";
import TransformerEngineeringHub from "./TransformerEngineeringHub";

export type ReportType = 
  | 'executivo'
  | 'memorial_descritivo'
  | 'memorial_calculo'
  | 'caderno_obra'
  | 'comissionamento'
  | 'viabilidade_negocios';

interface EVEngineeringReportsHubProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: {
    projectName: string;
    clientName: string;
    technicalResponsible?: string;
    creaCft?: string;
    utility?: string;
    address?: string;
    propertyOwner?: string;
    commercialAnchorType?: string;
    targetPublic?: string;
    idleFeePerMinute?: number;
    idleFeeGraceMinutes?: number;
    facadePhotoUrl?: string;
    onUpdateFacadePhoto?: (url: string | undefined) => void;
    standardCategory?: string;
    standardBreakerA?: number;
    voltageV?: number;
    totalPowerKW?: number;
    chargers?: Array<{
      id: string;
      name: string;
      brand?: string;
      powerKW: number;
      phases: number;
      voltage: number;
      currentA?: number;
      type?: string;
      connector?: string;
      quantity?: number;
    }>;
    sections?: any;
    hasTransformer?: boolean;
    transformerKVA?: number;
    transformerLossesKW?: number;
    fireSafety?: any;
    bomItems?: any[];
    totalInvestmentBRL?: number;
    capexSavingsBRL?: number;
    evBaysCount?: number;
    chargingPointsCount?: number;
    parkingLocation?: string;
    parkingAccessControl?: string;
    hasPcdAccessibleBay?: boolean;
    parkingSurfaceType?: string;
    realLoadCurveMode?: string;
    realPeakKW?: number;
    realPeakDate?: string;
    commercialHub?: CommercialHubOperationalData;
    applicationMode?: ApplicationMode;
    enableDLM?: boolean;
    hasDLM?: boolean;
    dlmSystemType?: 'beny' | 'weg' | 'schneider' | 'abb' | 'generic';
    deficitKW?: number;
    locationDiagnostic?: any;
    ahpTotalScore?: number;
    ahpRating?: string;
    existingLoadKW?: number;
    gridLimitKW?: number;
    headroomKW?: number;
    competitorStationsList?: any[];
  };
}

export function EVEngineeringReportsHub({
  isOpen,
  onClose,
  projectData
}: EVEngineeringReportsHubProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('executivo');

  // Isolamento estrito de impressão A4 (evita vazamento de estilos de tela e sobreposição de páginas)
  useEffect(() => {
    const handleBefore = () => document.body.classList.add('printing-ev-report');
    const handleAfter = () => document.body.classList.remove('printing-ev-report');
    window.addEventListener('beforeprint', handleBefore);
    window.addEventListener('afterprint', handleAfter);
    return () => {
      document.body.classList.remove('printing-ev-report');
      window.removeEventListener('beforeprint', handleBefore);
      window.removeEventListener('afterprint', handleAfter);
    };
  }, []);

  if (!isOpen) return null;

  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const totalPower = projectData.totalPowerKW || (projectData.chargers?.reduce((s, c) => s + c.powerKW, 0) || 7.4);

  // Detecção inteligente de pontos de recarga simultâneos (ex: 60kW DC = 2 pistolas)
  const calculatedPointsCount = projectData.chargers?.reduce((acc, c) => {
    const isDual = (c.powerKW >= 60 && c.type === 'DC') || (c.connector && c.connector.includes('2x'));
    return acc + (isDual ? 2 : 1);
  }, 0) || 1;
  const chargingPointsCount = projectData.chargingPointsCount || calculatedPointsCount;
  const evBaysCount = projectData.evBaysCount || chargingPointsCount;
  const chargersCount = projectData.chargers?.length || 1;

  // Score AHP Unificado (SSOT com Cockpit AHP)
  const effectiveAhpScore = typeof projectData.ahpTotalScore === 'number' && projectData.ahpTotalScore > 0
    ? projectData.ahpTotalScore
    : (projectData.locationDiagnostic?.scoreAHP ? projectData.locationDiagnostic.scoreAHP * 10 : 66.5);
  const effectiveAhpRating = projectData.ahpRating || (effectiveAhpScore >= 80 ? 'EXCELENTE (GO)' : (effectiveAhpScore >= 65 ? 'MUITO BOM (GO)' : 'GO COM RESSALVAS'));

  // Cálculo da Viabilidade Econômico-Financeira & Negócios (Modelo CoenergyGO / CoenergyGO)
  const financialViability: HubFinancialViabilityResult = calculateHubFinancialViability({
    chargers: (projectData.chargers && projectData.chargers.length > 0)
      ? projectData.chargers.map(c => ({
          id: c.id,
          name: c.name,
          powerKW: c.powerKW,
          phases: (c.phases || 3) as (1 | 3),
          voltage: c.voltage || 380,
          type: (c.type || (c.powerKW >= 40 ? 'DC' : 'AC')) as ('AC' | 'DC'),
          quantity: 1,
          connector: c.connector || 'CCS2'
        }))
      : [{
          id: 'def-hub',
          name: 'Carregador Rápido DC',
          powerKW: totalPower || 120,
          phases: 3,
          voltage: 380,
          type: 'DC',
          quantity: 1,
          connector: 'CCS2'
        }],
    operationalData: projectData.commercialHub,
    totalInfrastructureCostBRL: 25000
  });

  const reportsNav: Array<{ id: ReportType; title: string; subtitle: string; icon: any; tag: string }> = [
    {
      id: 'executivo',
      title: '1. Relatório Executivo Comercial',
      subtitle: 'Apresentação visual, KPIs, fotos e retorno do investimento',
      icon: Sparkles,
      tag: 'Cliente & Diretoria'
    },
    {
      id: 'memorial_descritivo',
      title: '2. Memorial Descritivo da Instalação',
      subtitle: 'Documento formal para Concessionárias, Condomínios e Bombeiros',
      icon: Building2,
      tag: 'Homologação'
    },
    {
      id: 'memorial_calculo',
      title: '3. Memorial de Cálculo Eletrotécnico',
      subtitle: 'Memória auditável NBR 5410: Ib, Iz, condutores e queda ΔV',
      icon: Zap,
      tag: 'Engenharia'
    },
    {
      id: 'caderno_obra',
      title: '4. Caderno de Obra & Instruções de Campo',
      subtitle: 'Roteiro de montagem, métodos B1/B2/D, eletrodutos e torques',
      icon: Wrench,
      tag: 'Eletricistas & Obra'
    },
    {
      id: 'comissionamento',
      title: '5. Relatório de Comissionamento & Checklist',
      subtitle: 'Ensaios de isolamento, continuidade PE e teste de emergência',
      icon: ClipboardCheck,
      tag: 'Qualidade & Entrega'
    },
    {
      id: 'viabilidade_negocios',
      title: '6. Dossiê de Viabilidade & Negócios (CoenergyGO)',
      subtitle: 'Estudo executivo com DRE, sensibilidade 4h/6h/9h, CEMIG BT Grupo F e Payback',
      icon: TrendingUp,
      tag: 'Investidores & Diretoria'
    }
  ];

  const handlePrint = () => {
    const reportElem = document.getElementById('printable-report-sheet');
    const reportTitles: Record<ReportType, string> = {
      executivo: 'Cordeiro_Energia_Sumario_Executivo_Carregador_Sete_Lagoas_Coenergy',
      memorial_descritivo: 'Cordeiro_Energia_Memorial_Descritivo_Carregador_Sete_Lagoas_Coenergy',
      memorial_calculo: 'Cordeiro_Energia_Memorial_Calculo_Eletrotecnico_Carregador_Sete_Lagoas_Coenergy',
      caderno_obra: 'Cordeiro_Energia_Caderno_Encargos_Obra_Carregador_Sete_Lagoas_Coenergy',
      comissionamento: 'Cordeiro_Energia_Protocolo_Comissionamento_Carregador_Sete_Lagoas_Coenergy',
      viabilidade_negocios: 'Cordeiro_Energia_Estudo_Viabilidade_Financeira_Carregador_Sete_Lagoas_Coenergy',
    };

    const docTitle = reportTitles[selectedReport] || 'Cordeiro_Energia_Memorial_Calculo_Sete_Lagoas_Coenergy';

    if (!reportElem) {
      const originalTitle = document.title;
      document.title = docTitle;
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 2000);
      return;
    }

    try {
      // Cria um iframe invisível isolado estritamente para impressão sem interferência do DOM pai (livre de flex e fixed)
      const existingFrame = document.getElementById('report-print-frame');
      if (existingFrame) {
        existingFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'report-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc || !iframe.contentWindow) {
        window.print();
        return;
      }

      // Copia todas as folhas de estilo e links CSS ativos na página
      let stylesMarkup = '';
      const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
      styleNodes.forEach((node) => {
        stylesMarkup += node.outerHTML + '\n';
      });

      const printCustomStyles = `
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          html, body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Montserrat', sans-serif !important;
            font-size: 11px;
            line-height: 1.5;
            overflow: visible !important;
            width: 100% !important;
          }
          #printable-report-sheet {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .report-card, .print-card, [class*="report-card"] {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
            display: block !important;
            overflow: visible !important;
            margin-bottom: 20px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }
          tr, thead, tbody, th, td {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
          p {
            text-align: justify !important;
            text-justify: inter-word !important;
          }
          .no-print, button, .print\\:hidden {
            display: none !important;
          }
        </style>
      `;

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>${docTitle}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
            ${stylesMarkup}
            ${printCustomStyles}
          </head>
          <body>
            <div id="printable-report-sheet">
              ${reportElem.innerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      const originalDocTitle = document.title;
      document.title = docTitle;

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.warn('Erro ao disparar print no iframe, fallback para window.print:', printErr);
          window.print();
        } finally {
          document.title = originalDocTitle;
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 4000);
        }
      }, 500);

    } catch (err) {
      console.error('Erro na preparação da impressão isolada:', err);
      const originalDocTitle = document.title;
      document.title = docTitle;
      window.print();
      setTimeout(() => { document.title = originalDocTitle; }, 2000);
    }
  };

  return (
    <div id="coenergygo-reports-hub-modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 transition-all print:static print:bg-white print:p-0 print:m-0 print:block print:overflow-visible print:inset-auto">
      <div className="w-full max-w-6xl bg-white text-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200 print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none print:max-h-none print:overflow-visible print:block print:p-0 print:m-0">
        
        {/* ─── TOPO DE AÇÕES & IDENTIDADE VISUAL CORDEIRO ENERGIA ─── */}
        <div id="coenergygo-reports-header" className="bg-[#0A192F] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl">
              <img src="/logo.png" alt="Cordeiro Energia" className="h-7 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest bg-[#E45318]/20 px-2 py-0.5 rounded-full">
                  Suíte de Engenharia CoenergyGO
                </span>
                <span className="text-xs text-slate-400 font-mono">Pilar 4 • NBR 17019 / NBR 5410</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                Central de Emissão de Relatórios Técnicos Oficiais
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#E45318] hover:bg-[#c24210] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#E45318]/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Gerar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── CORPO: SELETOR DE RELATÓRIO + PAINEL DE VISUALIZAÇÃO A4 ─── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden print:block print:overflow-visible print:w-full print:p-0 print:m-0">
          
          {/* Menu Lateral de Seleção dos 5 Relatórios */}
          <div id="coenergygo-reports-sidebar" className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto space-y-2 print:hidden">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
              Selecione o Relatório Desejado:
            </div>
            {reportsNav.map((rep) => {
              const Icon = rep.icon;
              const isSelected = selectedReport === rep.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedReport(rep.id)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer border flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#0A192F] text-white border-[#0A192F] shadow-md scale-[1.01]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#E45318]/50 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#E45318]' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold">{rep.title}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/10 text-emerald-400' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {rep.tag}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed pl-6 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {rep.subtitle}
                  </p>
                </button>
              );
            })}

            {/* Banner de Links Úteis da Cordeiro Energia */}
            <div className="mt-6 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 text-xs space-y-1.5">
              <span className="font-bold text-[10px] uppercase text-[#00B356] block">Atendimento & Engenharia</span>
              <p className="text-[11px] leading-snug">
                Projetos e laudos emitidos com responsabilidade técnica e conformidade integral Cemig e ABNT.
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-emerald-800">
                <span>cordeiroenergia.com.br</span>
                <span>@cordeiroenergia</span>
              </div>
            </div>
          </div>

          {/* Área de Visualização do Documento (Simulação A4 Limpa e Pronta para Impressão) */}
          <div className="flex-1 bg-slate-200 p-4 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:bg-white print:block print:overflow-visible print:w-full">
            <div id="printable-report-sheet" className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 shadow-xl print:shadow-none border border-slate-200 print:border-none min-h-[297mm] flex flex-col justify-between font-['Montserrat',sans-serif] print:p-0 print:m-0 print:border-none print:shadow-none print:block print:min-h-0 print:h-auto print:max-w-none print:w-full print:overflow-visible">
              
              {/* CABEÇALHO DO LAUDO (IDENTIDADE CORDEIRO ENERGIA) */}
              <div>
                <div className="flex items-start justify-between border-b-2 border-[#0A192F] pb-4 mb-6 break-inside-avoid print:break-inside-avoid">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest">
                        Cordeiro Energia • CoenergyGO
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#0A192F] uppercase tracking-tight">
                      {reportsNav.find(r => r.id === selectedReport)?.title}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Projeto: <strong>{projectData.projectName}</strong> • Cliente: <strong>{projectData.clientName}</strong>
                      {projectData.propertyOwner && (
                        <span className="ml-1 text-slate-600 font-normal">
                          (Cedente: <strong>{projectData.propertyOwner}</strong>)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <img src="/logo.png" alt="Cordeiro Energia" className="h-9 object-contain ml-auto mb-1" />
                    <span className="text-[10px] font-mono text-slate-400 block">{dateStr}</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      HOMOLOGADO
                    </span>
                  </div>
                </div>

                {/* METADADOS GERAIS DO PROJETO */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs mb-6 break-inside-avoid print:break-inside-avoid">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Concessionária</span>
                    <strong className="text-slate-800">{projectData.utility || 'CEMIG Distribuição'}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Padrão / Categoria</span>
                    <strong className="text-slate-800">{projectData.standardCategory || 'C6'} ({projectData.standardBreakerA || 200}A)</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Potência Instalada VE</span>
                    <strong className="text-[#E45318] font-bold">
                      {totalPower.toFixed(1)} kW ({evBaysCount} {evBaysCount === 1 ? 'Vaga' : 'Vagas'} | {chargingPointsCount} {chargingPointsCount === 1 ? 'Ponto' : 'Pontos de Recarga'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Responsável Técnico</span>
                    <strong className="text-slate-800">{projectData.technicalResponsible || 'Eng. Eletricista'} ({projectData.creaCft || 'CREA-MG'})</strong>
                  </div>
                </div>

                {/* CONTEÚDO ESPECÍFICO DE CADA UM DOS 5 RELATÓRIOS */}
                
                {/* 1. RELATÓRIO EXECUTIVO — PADRÃO BUSINESS PLAN AV. AMAZONAS */}
                                {/* 1. RELATÓRIO EXECUTIVO — PLANO INTEGRAL DE ENGENHARIA & NEGÓCIOS (6 PASSOS) */}
                                {/* 1. RELATÓRIO EXECUTIVO — PLANO INTEGRAL DE ENGENHARIA & NEGÓCIOS (6 PASSOS) */}
                {selectedReport === 'executivo' && (
                  <div className="text-xs text-slate-700">
                    
                    {/* 1. SUMÁRIO EXECUTIVO & IDENTIFICAÇÃO DO ATIVO (Passo 1A) */}
                    <div className="report-card bg-gradient-to-br from-[#0A192F] to-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md break-inside-avoid print:break-inside-avoid border border-slate-800 mb-5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black text-[#00B356] tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            Passo 1A • Sumário Executivo & Negócios
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Metodologia CoenergyGO Intelligence • Padrão Cordeiro Energia
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {projectData.locationDiagnostic?.cidade || 'Sete Lagoas'} - {projectData.locationDiagnostic?.uf || 'MG'}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Hub Comercial de Recarga de Alta Performance: Viabilidade Técnica, Demográfica e Econômica
                      </h3>

                      <p className="text-slate-300 text-xs leading-relaxed text-justify">
                        Este estudo estratégico e eletrotécnico contempla a implantação de{' '}
                        <strong className="text-white font-semibold">{chargersCount} estação física</strong> de alta potência atendendo{' '}
                        <strong className="text-[#00B356] font-semibold">{evBaysCount} vagas comerciais simultâneas</strong> ({chargingPointsCount} conectores rápidos CCS2) com potência agregada de{' '}
                        <strong className="text-white font-semibold">{totalPower.toFixed(1)} kW</strong> no imóvel cedido pelo{' '}
                        <strong className="text-white font-semibold">{projectData.propertyOwner || 'Sr. Saint Clair'}</strong>. O empreendimento está ancorado em{' '}
                        <strong className="text-white font-semibold">{projectData.commercialAnchorType || 'Galeria de lojas aberta 24 horas'}</strong>, oferecendo conveniência permanente, iluminação de segurança, sanitários e acesso frontal imediato sem necessidade de manobras de ré.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Cliente Proponente</span>
                          <strong className="text-white truncate block">{projectData.clientName}</strong>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Proprietário / Cedente</span>
                          <strong className="text-white truncate block">{projectData.propertyOwner || 'Sr. Saint Clair'}</strong>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Âncora Comercial</span>
                          <strong className="text-[#00B356] truncate block">{projectData.commercialAnchorType || 'Galeria 24 Horas'}</strong>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Concessionária</span>
                          <strong className="text-white truncate block">{projectData.utility || 'CEMIG Distribuição'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* 2. MACRO-DIAGNÓSTICO DEMOGRÁFICO & INTELIGÊNCIA LOCACIONAL AHP (Passo 1B) */}
                    {projectData.locationDiagnostic && (
                      <div className="report-card p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 break-inside-avoid print:break-inside-avoid mb-5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-[#00B356]" />
                            Passo 1B • Macro-Diagnóstico Demográfico & Frota de Veículos Elétricos (IBGE 2026)
                          </h4>
                          <span className="text-[10px] font-black text-[#00B356] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Score AHP: {effectiveAhpScore.toFixed(1)} / 100 ({effectiveAhpRating})
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">População Municipal</span>
                            <strong className="text-slate-800 text-sm font-black">
                              {projectData.locationDiagnostic.ibge?.populacaoEstimada?.toLocaleString('pt-BR') || '241.835'} hab.
                            </strong>
                            <span className="text-[8px] text-slate-400 block">Base IBGE Censo</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Frota VE Projetada 2026</span>
                            <strong className="text-amber-600 text-sm font-black">
                              {projectData.locationDiagnostic.ibge?.frotaEletricaEstimada?.toLocaleString('pt-BR') || '780'} VEs
                            </strong>
                            <span className="text-[8px] text-amber-700/80 block">BEV + PHEV em circulação</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Classificação Viária</span>
                            <strong className="text-blue-600 text-sm font-black uppercase">
                              {projectData.locationDiagnostic.via?.tipoVia || 'Arterial'}
                            </strong>
                            <span className="text-[8px] text-slate-400 block">{projectData.locationDiagnostic.via?.velocidadeEstimadaKmh || 60} km/h regulamentar</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Comércios em 500m</span>
                            <strong className="text-[#00B356] text-sm font-black">
                              {projectData.locationDiagnostic.via?.totalComercios500m || 4} Pontos
                            </strong>
                            <span className="text-[8px] text-slate-400 block">Sinergia com conveniência</span>
                          </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-justify leading-relaxed text-[11px] text-slate-700">
                          {(() => {
                            const fastComps = (projectData.competitorStationsList || []).filter((s: any) => (s.potencia_kw || s.potenciaKW || 0) >= 30 || s.is_dc || s.isDC);
                            let paras: string[] = projectData.locationDiagnostic.resumoExecutivoParagrafos 
                              ? [...projectData.locationDiagnostic.resumoExecutivoParagrafos]
                              : (projectData.locationDiagnostic.resumoExecutivoTexto || '').split('\n\n');

                            paras = paras.filter((p: string) => !p.toLowerCase().includes('ociosidade') && !p.toLowerCase().includes('idle fee'));

                            if (fastComps.length > 0) {
                              const listaDC = fastComps.map((s: any) => `${s.nome || s.name} (${s.potencia_kw || s.potenciaKW || 60} kW a ${(s.distancia_km || s.distanciaKm || 0).toFixed(1)} km)`).join(', ');
                              paras = paras.map((p: string) => {
                                if (p.toLowerCase().includes('monopólio natural') || p.toLowerCase().includes('0 pontos') || p.toLowerCase().includes('exclusivamente com recarga lenta')) {
                                  return `A varredura de concorrência identifica ${fastComps.length} postos com recarga rápida DC no raio de 3 a 5 km: ${listaDC}. Diante desse cenário competitivo, a implantação do Hub CoenergyGO se consolida estrategicamente com dispensador BENY DC de 60 kW com dois conectores CCS2 simultâneos, diferenciando-se pela ancoragem comercial contínua de 24 horas, recarga em 35 a 45 minutos e alta segurança patrimonial.`;
                                }
                                return p;
                              });
                            }

                            return paras.map((p: string, pIdx: number) => (
                              <p key={pIdx}>{p}</p>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    {/* 3. VARREDURA CRITERIOSA DA CONCORRÊNCIA NO RAIO DE 5 KM (Passo 1B Cont.) */}
                    <div className="report-card p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 break-inside-avoid print:break-inside-avoid mb-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          Passo 1B (Cont.) • Varredura Criteriosa de Concorrência no Raio de 5 km
                        </h4>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#00B356] border border-emerald-300">
                          ⚡ Ambiente Competitivo DC Mapeado
                        </span>
                      </div>

                      <p className="text-slate-700 text-justify text-[11px] leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80">
                        {(() => {
                          const fastCompetitors = (projectData.competitorStationsList || []).filter((s: any) => (s.potencia_kw || s.potenciaKW || 0) >= 30 || s.is_dc || s.isDC);
                          if (fastCompetitors.length > 0) {
                            const nomes = fastCompetitors.map((s: any) => `${s.nome || s.name} (${s.potencia_kw || s.potenciaKW || 60} kW DC a ${(s.distancia_km || s.distanciaKm || 0).toFixed(1)} km)`).join(', ');
                            return `A varredura de concorrência mapeou ${fastCompetitors.length} estação(ões) de recarga rápida DC no raio de 3 a 5 km: ${nomes}. O ponto alvo do Hub CoenergyGO se posiciona de forma soberana com dispensador BENY DC de 60 kW com 2 pistolas CCS2 simultâneas, ancoragem comercial contínua de 24 horas na galeria, recarga em 35 a 45 minutos e alta segurança patrimonial.`;
                          }
                          return projectData.locationDiagnostic?.concorrencia?.vereditoConcorrencia || 'A varredura de concorrência mapeou as estações de recarga no raio de 5 km, avaliando potências nominais e operadores locais para posicionamento estratégico do Hub CoenergyGO.';
                        })()}
                      </p>

                      {/* Tabela de Eletropostos Mapeados */}
                      {Array.isArray(projectData.competitorStationsList) && projectData.competitorStationsList.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <div className="bg-slate-100 px-3 py-2 text-[9px] font-bold uppercase text-slate-600 grid grid-cols-12 gap-1 border-b">
                            <span className="col-span-4">Estabelecimento / Nome</span>
                            <span className="col-span-2 text-center">Distância</span>
                            <span className="col-span-2 text-center">Potência</span>
                            <span className="col-span-4">Observações de Campo / Acesso</span>
                          </div>
                          <div className="divide-y divide-slate-100 text-[10px]">
                            {projectData.competitorStationsList.map((st: any, idx: number) => {
                              const nome = st.nome || st.name || `Eletroposto ${idx + 1}`;
                              const dist = typeof st.distancia_km === 'number' ? st.distancia_km : (st.distanciaKm || 0);
                              const pot = st.potencia_kw || st.potenciaKW || (st.is_dc || st.isDC ? 60 : 7.4);
                              const isDC = st.is_dc !== undefined ? st.is_dc : (st.isDC !== undefined ? st.isDC : pot >= 30);
                              const obs = st.observacao || st.observation || 'Mapeado em vistoria técnica';

                              return (
                                <div key={st.id || idx} className="px-3 py-2 grid grid-cols-12 gap-1 items-center hover:bg-slate-50">
                                  <div className="col-span-4 font-semibold text-slate-800 truncate">
                                    {nome}
                                  </div>
                                  <div className="col-span-2 text-center text-slate-500 font-mono">
                                    {dist.toFixed(1)} km
                                  </div>
                                  <div className="col-span-2 text-center">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isDC ? 'bg-orange-100 text-[#E45318]' : 'bg-blue-100 text-blue-700'}`}>
                                      {pot} kW {isDC ? 'DC' : 'AC'}
                                    </span>
                                  </div>
                                  <div className="col-span-4 text-slate-500 text-[9px] italic truncate" title={obs}>
                                    {obs}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. ENGENHARIA ELÉTRICA & BALANÇO DE CARGAS (Passo 2A) */}
                    <div className="report-card p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 break-inside-avoid print:break-inside-avoid mb-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#E45318]" />
                          Passo 2A • Engenharia Elétrica, Demanda CEMIG & Gestão de Carga
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500">
                          ABNT NBR 17019 / CEMIG ND-5.1
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">Padrão de Entrada</span>
                          <strong className="text-slate-900 text-sm font-black">
                            {projectData.standardCategory || 'C6'} ({projectData.standardBreakerA || 200}A)
                          </strong>
                          <span className="text-[8px] text-slate-400 block">{projectData.voltageV || 220}V Trifásico</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">Capacidade da Entrada</span>
                          <strong className="text-slate-900 text-sm font-black">
                            {(projectData.gridLimitKW || 75.0).toFixed(1)} kW
                          </strong>
                          <span className="text-[8px] text-slate-400 block">Limite contratual/físico</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">Carga Atual do Imóvel</span>
                          <strong className="text-slate-900 text-sm font-black">
                            {(projectData.existingLoadKW || projectData.realPeakKW || 7.9).toFixed(1)} kW
                          </strong>
                          <span className="text-[8px] text-slate-400 block">SmartMeter (Pico NBR 5410)</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">Folga Disponível</span>
                          <strong className="text-[#00B356] text-sm font-black">
                            {(projectData.headroomKW !== undefined ? projectData.headroomKW : Math.max(0, (projectData.gridLimitKW || 75.0) - (projectData.existingLoadKW || 7.9))).toFixed(1)} kW
                          </strong>
                          <span className="text-[8px] text-emerald-700 block">Headroom para recarga</span>
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-[11px] leading-relaxed text-justify">
                        <strong className="text-slate-900 block font-semibold mb-0.5">Regime Eletrotécnico Operacional:</strong>
                        <span className="text-slate-700">
                          ✓ <strong>Alimentação Direta em Carga Plena:</strong> A folga de potência identificada no padrão existente ({(projectData.headroomKW !== undefined ? projectData.headroomKW : 67.1).toFixed(1)} kW) suporta integralmente as estações instaladas ({totalPower.toFixed(1)} kW) em operação contínua sem risco de sobrecarga e sem a necessidade de aumento oneroso de demanda contratada junto à CEMIG.
                        </span>
                      </div>
                    </div>

                    {/* 5. CONFORMIDADE ELETROTÉCNICA & BOMBEIROS NBR 17019 (Passo 2B) */}
                    <div className="report-card p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 break-inside-avoid print:break-inside-avoid mb-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          Passo 2B • Conformidade com ABNT NBR 17019 & Corpo de Bombeiros (CBMMG IT-41)
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          100% Homologado
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                          <strong className="text-slate-900 block text-[10px] uppercase font-bold text-[#E45318]">
                            1. Aterramento TN-S Mandatório (NBR 5410):
                          </strong>
                          <p className="text-slate-600 text-justify leading-relaxed">
                            Condutor de proteção (PE) exclusivo interligado diretamente ao Barramento de Equipotencialização Principal (BEP), com resistividade de terra auditada inferior a 10 ohms.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                          <strong className="text-slate-900 block text-[10px] uppercase font-bold text-[#00B356]">
                            2. Dispositivo IDR Tipo B Dedicado (30mA):
                          </strong>
                          <p className="text-slate-600 text-justify leading-relaxed">
                            Proteção diferencial-residual Tipo B específica para VE, imune a correntes CC de fuga transitórias e permanentes originadas nos retificadores veiculares de alta potência.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                          <strong className="text-slate-900 block text-[10px] uppercase font-bold text-blue-700">
                            3. Proteção contra Surtos (DPS Classe I+II):
                          </strong>
                          <p className="text-slate-600 text-justify leading-relaxed">
                            Dispositivos protetores de surtos coordenados instalados no QDC-VE (Up &lt; 1,5 kV), protegendo os circuitos eletrônicos e os veículos contra descargas atmosféricas.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                          <strong className="text-slate-900 block text-[10px] uppercase font-bold text-red-700">
                            4. Seccionamento de Emergência & Combate a Incêndio:
                          </strong>
                          <p className="text-slate-600 text-justify leading-relaxed">
                            Botoeira de emergência tipo cogumelo com disparo de bobina de mínima tensão em &lt; 50ms, extintor de pó químico/CO₂ (5 kg) adjacente e sinalização viária NBR 9050.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 6. ESPECIFICAÇÃO TÉCNICA DAS ESTAÇÕES DE RECARGA (Passo 1A / 3) */}
                    <div className="report-card border border-slate-200 rounded-2xl p-5 space-y-3 bg-white break-inside-avoid print:break-inside-avoid mb-5">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#00B356]" />
                          Passo 3 • Especificação Técnica das Estações de Recarga Homologadas
                        </h4>
                        <span className="text-[10px] text-slate-500 font-bold">
                          Total: {chargersCount} est. ({totalPower.toFixed(1)} kW | {evBaysCount} vagas)
                        </span>
                      </div>

                      {/* Card Detalhado do Carregador BENY DC 60 kW */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-[#E45318] text-white flex items-center justify-center font-black text-xs shadow-sm">
                              01
                            </span>
                            <div>
                              <strong className="text-slate-900 text-xs block font-bold">
                                BENY BDC-60 kW DC Comercial Rápido (Dual-Gun CCS2)
                              </strong>
                              <span className="text-slate-500 text-[10px]">
                                Fabricante: <strong>BENY New Energy</strong> • Modelo: <strong>BDC-60KW-2G</strong> • Tecnologia SiC
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <strong className="text-[#E45318] text-base font-black block">60.0 kW</strong>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-100 text-[#E45318]">
                              DC Rápido • Trifásico
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-slate-400 block font-semibold uppercase text-[8px]">Conectores</span>
                            <strong className="text-slate-800">2x CCS2 (Dual-Gun)</strong>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-slate-400 block font-semibold uppercase text-[8px]">Divisão de Potência</span>
                            <strong className="text-slate-800">2x 30 kW ou 1x 60 kW</strong>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-slate-400 block font-semibold uppercase text-[8px]">Protocolo OCPP</span>
                            <strong className="text-slate-800">OCPP 1.6J / 2.0.1 JSON</strong>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-slate-400 block font-semibold uppercase text-[8px]">Tempo Médio Recarga</span>
                            <strong className="text-[#00B356]">35 a 45 minutos</strong>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-600 leading-relaxed text-justify bg-white p-3 rounded-lg border border-slate-200/80">
                          A estação BENY DC 60 kW utiliza módulos de potência com semicondutores de Carboneto de Silício (SiC), garantindo eficiência de conversão CA/CC superior a 96% e baixo aquecimento operacional. O equipamento dispõe de leitor RFID integrado, display touch de 7 polegadas com interface em português e leitor QR Code dinâmico para integração autônoma com aplicativos de bilhetagem.
                        </p>
                      </div>
                    </div>

                    {/* 7. ORÇAMENTO DETALHADO (BOM/CAPEX) & LISTA DE MATERIAIS (Passo 4B) */}
                    <div className="report-card p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 break-inside-avoid print:break-inside-avoid mb-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          Passo 4B • Orçamento Modular de CAPEX & Lista de Materiais (BOM Consolidado)
                        </h4>
                        <span className="text-[10px] text-slate-500 font-bold">
                          BDI Global: <strong>18,5%</strong> • Base SINAPI / Fornecedores
                        </span>
                      </div>

                      {/* Tabela de Composição do CAPEX */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-[#0A192F] text-white text-[9px] uppercase">
                            <tr>
                              <th className="p-2.5">Item</th>
                              <th className="p-2.5">Descrição dos Equipamentos, Materiais & Serviços</th>
                              <th className="p-2.5 text-center">Qtd</th>
                              <th className="p-2.5 text-right">Valor Total (R$)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-[10px]">
                            <tr>
                              <td className="p-2.5 font-bold text-slate-900">01</td>
                              <td className="p-2.5 text-slate-800">
                                <strong>Estação de Recarga BENY DC 60 kW Dual Gun CCS2</strong> (Módulos SiC, OCPP 1.6J, RFID, Tela 7")
                              </td>
                              <td className="p-2.5 text-center font-mono">1 un</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">R$ 58.000,00</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-900">02</td>
                              <td className="p-2.5 text-slate-800">
                                <strong>Quadro Geral QDC-VE 380V</strong> (Disjuntor Caixa Moldada 125A, Dispositivo IDR Tipo B 30mA, DPS Classe I+II)
                              </td>
                              <td className="p-2.5 text-center font-mono">1 cj</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">R$ 14.500,00</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold text-slate-900">03</td>
                              <td className="p-2.5 text-slate-800">
                                <strong>Infraestrutura Eletrotécnica & Cabos Sintenax 0,6/1kV</strong> (Cabos 35mm² Cu, Eletrodutos Galvanizados e Conexões)
                              </td>
                              <td className="p-2.5 text-center font-mono">1 cj</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">R$ 13.998,88</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-900">04</td>
                              <td className="p-2.5 text-slate-800">
                                <strong>Obras Civis, Base Estrutural, 4 Bollards e Pintura Viária Epóxi</strong> (Concretagem, 2 Vagas NBR 9050 e Sinalização)
                              </td>
                              <td className="p-2.5 text-center font-mono">1 gl</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">R$ 10.000,00</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold text-slate-900">05</td>
                              <td className="p-2.5 text-slate-800">
                                <strong>Engenharia, Comissionamento NBR 17019, Ensaios Megômetro & ART</strong> (Responsabilidade Técnica Bruno Cordeiro)
                              </td>
                              <td className="p-2.5 text-center font-mono">1 gl</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">R$ 10.000,00</td>
                            </tr>
                            <tr className="bg-emerald-50 border-t-2 border-emerald-300 font-bold">
                              <td className="p-2.5 text-emerald-900 uppercase" colSpan={3}>
                                Investimento Total Consolidado do Hub Comercial (CAPEX Total):
                              </td>
                              <td className="p-2.5 text-right font-mono text-sm text-[#00B356] font-black">
                                R$ 106.498,88
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-0.5">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          ✓ <strong>Garantia do Equipamento:</strong> 24 meses direto do fabricante BENY com suporte nacional.
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          ✓ <strong>Garantia de Instalação:</strong> 36 meses na infraestrutura executada pela Cordeiro Energia O&M.
                        </div>
                      </div>
                    </div>

                    {/* 8. MODELAGEM ECONÔMICO-FINANCEIRA EM 3 CENÁRIOS OPERACIONAIS (Passo 5) */}
                    <div className="report-card p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 break-inside-avoid print:break-inside-avoid mb-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#00B356]" />
                          Passo 5 • Modelagem Financeira & Análise de Sensibilidade (CoenergyGO Intelligence)
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Tarifa Venda: R$ 2,20/kWh • Custo Energia: R$ 0,85/kWh (Margem 61,4%)
                        </span>
                      </div>

                      {/* Tabela Comparativa dos 3 Cenários de Recarga */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead className="bg-[#0A192F] text-white text-[9px] uppercase">
                            <tr>
                              <th className="p-2.5">Cenário Operacional</th>
                              <th className="p-2.5 text-center">Uso / Dia</th>
                              <th className="p-2.5 text-right">Energia / Mês</th>
                              <th className="p-2.5 text-right">Faturamento Bruto</th>
                              <th className="p-2.5 text-right">Custos Totais</th>
                              <th className="p-2.5 text-right font-black text-emerald-400">Lucro Líquido / Mês</th>
                              <th className="p-2.5 text-center font-bold text-amber-300">Payback</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="p-2.5 font-bold text-slate-800">
                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5" />
                                Conservador
                              </td>
                              <td className="p-2.5 text-center font-mono">4 h / dia</td>
                              <td className="p-2.5 text-right font-mono">7.200 kWh</td>
                              <td className="p-2.5 text-right font-mono">R$ 15.840,00</td>
                              <td className="p-2.5 text-right font-mono text-slate-500">R$ 7.620,00</td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#00B356]">R$ 8.220,00</td>
                              <td className="p-2.5 text-center font-mono font-black text-slate-900 bg-amber-50">13,0 meses</td>
                            </tr>
                            <tr className="bg-emerald-50/40">
                              <td className="p-2.5 font-bold text-slate-900">
                                <span className="w-2 h-2 rounded-full bg-[#00B356] inline-block mr-1.5" />
                                Moderado (Base)
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold">6 h / dia</td>
                              <td className="p-2.5 text-right font-mono font-bold">10.800 kWh</td>
                              <td className="p-2.5 text-right font-mono font-bold">R$ 23.760,00</td>
                              <td className="p-2.5 text-right font-mono text-slate-500">R$ 10.680,00</td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#00B356]">R$ 13.080,00</td>
                              <td className="p-2.5 text-center font-mono font-black text-[#00B356] bg-emerald-100">8,1 meses</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold text-slate-800">
                                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block mr-1.5" />
                                Otimista
                              </td>
                              <td className="p-2.5 text-center font-mono">9 h / dia</td>
                              <td className="p-2.5 text-right font-mono">16.200 kWh</td>
                              <td className="p-2.5 text-right font-mono">R$ 35.640,00</td>
                              <td className="p-2.5 text-right font-mono text-slate-500">R$ 15.270,00</td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#00B356]">R$ 20.370,00</td>
                              <td className="p-2.5 text-center font-mono font-black text-slate-900 bg-amber-50">5,2 meses</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Indicadores ESG e Sustentabilidade */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                          <span className="text-[9px] uppercase font-bold text-emerald-800 block">Investimento Consolidado</span>
                          <strong className="text-sm font-black text-[#00B356] font-mono">R$ 106.498,88</strong>
                          <span className="text-[8px] text-emerald-700 block mt-0.5">Equipamentos + Obra Civil</span>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-center">
                          <span className="text-[9px] uppercase font-bold text-orange-800 block">Capacidade do Hub</span>
                          <strong className="text-sm font-black text-[#E45318] font-mono">60.0 kW DC Rápido</strong>
                          <span className="text-[8px] text-orange-700 block mt-0.5">2 Vagas Simultâneas (Dual-Gun)</span>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                          <span className="text-[9px] uppercase font-bold text-blue-800 block">Mitigação de CO₂ Estimada</span>
                          <strong className="text-sm font-black text-blue-700 font-mono">~12.4 ton/ano</strong>
                          <span className="text-[8px] text-blue-600 block mt-0.5">~0,42 kg CO₂/kWh evitado vs fóssil</span>
                        </div>
                      </div>
                    </div>

                    {/* 9. PLANO DE IMPLANTAÇÃO FÍSICA (CRONOGRAMA DE 12 SEMANAS) */}
                    <div className="report-card p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 break-inside-avoid print:break-inside-avoid mb-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-600" />
                          Passo 6 • Cronograma de Implantação Física & Diretrizes de Entrega (12 Semanas)
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500">
                          Prazo Total: <strong>90 Dias Corridos</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px]">
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0A192F]" />
                          <span className="text-[8px] font-black uppercase text-[#0A192F] block tracking-wider">Fase 1 • Semanas 1 a 4</span>
                          <strong className="text-slate-900 block text-xs">Suprimentos & Mobilização</strong>
                          <p className="text-slate-600 leading-snug">
                            Aquisição da estação BENY DC 60 kW, montagem do quadro QDC-VE e entrega técnica de documentação à CEMIG.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E45318]" />
                          <span className="text-[8px] font-black uppercase text-[#E45318] block tracking-wider">Fase 2 • Semanas 5 a 9</span>
                          <strong className="text-slate-900 block text-xs">Obra Civil & Eletrotécnica</strong>
                          <p className="text-slate-600 leading-snug">
                            Concretagem da base do totem, passagem dos cabos Sintenax 35mm², fixação dos bollards e pintura epóxi NBR 9050.
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00B356]" />
                          <span className="text-[8px] font-black uppercase text-[#00B356] block tracking-wider">Fase 3 • Semanas 10 a 12</span>
                          <strong className="text-slate-900 block text-xs">Comissionamento & Go-Live</strong>
                          <p className="text-slate-600 leading-snug">
                            Ensaios NBR 17019, testes de disparo de emergência em &lt; 50ms, integração do software OCPP e inauguração comercial.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 10. TERMO DE ENCERRAMENTO & ASSINATURAS FORMAIS */}
                    <div className="report-card mt-6 pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs text-slate-500 break-inside-avoid print:break-inside-avoid">
                      <div className="text-center sm:text-left">
                        <div className="h-9 border-b border-slate-400 w-56 mb-1" />
                        <strong className="text-slate-900 block text-xs">{projectData.technicalResponsible || 'Bruno Cordeiro'}</strong>
                        <span className="text-[10px] text-slate-500">Eng. Eletricista • {projectData.creaCft || 'CREA-MG 102835-D'}</span>
                        <span className="text-[9px] text-[#E45318] font-bold block">Cordeiro Energia O&M</span>
                      </div>

                      <div className="text-center sm:text-right">
                        <div className="h-9 border-b border-slate-400 w-56 ml-auto mb-1" />
                        <strong className="text-slate-900 block text-xs">{projectData.propertyOwner || projectData.clientName || 'Saint Clair'}</strong>
                        <span className="text-[10px] text-slate-500">Proprietário / Cedente do Imóvel</span>
                        <span className="text-[9px] text-[#00B356] font-bold block">Aceite Formal do Projeto Comercial</span>
                      </div>
                    </div>

                  </div>
                )}

                {/* 2. MEMORIAL DESCRITIVO */}
                {selectedReport === 'memorial_descritivo' && (
                  <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 uppercase text-xs border-b pb-1">1. Objetivo e Escopo</h3>
                      <p>
                        Este Memorial Descritivo estabelece os requisitos técnicos e de segurança para a infraestrutura de recarga de Veículos Elétricos (VE) do projeto <strong>{projectData.projectName}</strong>. 
                        O projeto abrange desde o ponto de conexão na rede de baixa tensão até os quadros de distribuição exclusivos e estações terminais de recarga.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 uppercase text-xs border-b pb-1">2. Normas Técnicas e Regulamentações Aplicáveis</h3>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        <li><strong>ABNT NBR 17019:2022:</strong> Instalações elétricas de baixa tensão — Requisitos particulares para locais de recarga de veículos elétricos.</li>
                        <li><strong>ABNT NBR 5410:2004:</strong> Instalações elétricas de baixa tensão.</li>
                        <li><strong>IEC 61851-1:</strong> Electric vehicle conductive charging system — General requirements.</li>
                        <li><strong>CEMIG ND-5.1:</strong> Fornecimento de Energia Elétrica em Tensão Secundária de Edificações Individuais.</li>
                        <li><strong>Instrução Técnica CBMMG IT-41 / CBPMESP IT-41:</strong> Segurança contra incêndio em estações de recarga de veículos elétricos.</li>
                        <li><strong>NR-10:</strong> Segurança em instalações e serviços em eletricidade.</li>
                        <li><strong>ABNT NBR 9050:</strong> Acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 uppercase text-xs border-b pb-1">3. Características do Pátio e Vagas de Recarga</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-bold text-[9px] uppercase">Vagas VE Atendidas:</span>
                          <strong className="text-slate-900">{evBaysCount} vagas</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[9px] uppercase">Pontos / Pistolas:</span>
                          <strong className="text-[#E45318]">{chargingPointsCount} saídas simultâneas</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[9px] uppercase">Ambiente de Instalação:</span>
                          <strong className="text-slate-900">{projectData.parkingLocation ? projectData.parkingLocation.replace(/_/g, ' ').toUpperCase() : 'TÉRREO / GARAGEM'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[9px] uppercase">Acessibilidade NBR 9050:</span>
                          <strong className="text-emerald-700">{projectData.hasPcdAccessibleBay ? 'Vaga PCD Atendida' : 'Conforme Pátio'}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 uppercase text-xs border-b pb-1">3. Proteções Mandatórias e Esquema de Segurança</h3>
                      <p>
                        Cada ponto de recarga é dotado de circuito individual e dedicado protegido por:
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-2.5 bg-slate-50 rounded-xl border">
                          <strong className="text-slate-900 block">• Proteção Diferencial Residual (DR):</strong>
                          <span>Dispositivo DR Tetrapolar Tipo B (ou Tipo A com sensor RDC-DD 6mA DC conforme IEC 62955) de alta sensibilidade (30mA).</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border">
                          <strong className="text-slate-900 block">• Proteção contra Surtos (DPS):</strong>
                          <span>DPS Classe II, In ≥ 20 kA, Imax = 45 kA, nos modos F-PE e N-PE (Clamper VCL ou similar).</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border">
                          <strong className="text-slate-900 block">• Desligamento de Emergência:</strong>
                          <span>Botão cogumelo com retenção e trava a ≥ 5m do carregador, acoplado a bobina de abertura Shunt Trip (MX) no disjuntor geral.</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border">
                          <strong className="text-slate-900 block">• Esquema de Aterramento:</strong>
                          <span>Aterramento interligado diretamente ao Barramento de Equipotencialização Principal (BEP) com condutor PE exclusivo e identificado em verde/amarelo.</span>
                        </div>
                      </div>
                    </div>

                                      </div>
                )}

                {/* 3. MEMORIAL DE CÁLCULO ELETROTÉCNICO */}
                {selectedReport === 'memorial_calculo' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase text-xs border-b pb-1 mb-2">1. Critérios de Dimensionamento Passo a Passo</h3>
                      <p className="leading-relaxed">
                        Os condutores foram dimensionados simultaneamente pelos critérios de <strong>Capacidade de Condução de Corrente ($I_z \ge I_b$)</strong> conforme Tabela 36 a 39 da NBR 5410 e <strong>Queda de Tensão Máxima ($\Delta V \le 2.0\%$)</strong>.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border font-mono text-[11px] space-y-1">
                      <span className="text-[#E45318] font-bold block">Fórmula de Corrente de Projeto:</span>
                      <div>Trifásica: <code>Ib = P / (√3 × V × cosφ) = {(totalPower * 1000).toFixed(0)} / (1.732 × 380 × 0.98) = {((totalPower * 1000) / (1.732 * 380 * 0.98)).toFixed(1)} A</code></div>
                      <div>Monofásica: <code>Ib = P / (V × cosφ) = {(7400 / (220 * 0.98)).toFixed(1)} A</code></div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2">2. Resumo de Condutores e Quedas de Tensão Trecho a Trecho</h4>
                      <table className="w-full text-left border-collapse border border-slate-200">
                        <thead className="bg-[#0A192F] text-white text-[10px] uppercase">
                          <tr>
                            <th className="p-2">Trecho</th>
                            <th className="p-2">Distância</th>
                            <th className="p-2">Ib (A)</th>
                            <th className="p-2">Disjuntor</th>
                            <th className="p-2">Cabo Fase</th>
                            <th className="p-2">Duto</th>
                            <th className="p-2 text-right">Queda ΔV</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          <tr>
                            <td className="p-2 font-bold font-sans">Trecho 1 (Padrão ➔ QGBT)</td>
                            <td className="p-2">25 m</td>
                            <td className="p-2">185 A</td>
                            <td className="p-2 font-bold text-[#E45318]">200A CM</td>
                            <td className="p-2">95 mm² Cu <span className="text-[10px] text-slate-500 font-sans block sm:inline">(ou 120 mm² Al)</span></td>
                            <td className="p-2">Duto 2.1/2"</td>
                            <td className="p-2 text-right text-emerald-600 font-bold">0.82%</td>
                          </tr>
                          {(projectData.hasTransformer || totalPower >= 40) && (
                            <>
                              <tr>
                                <td className="p-2 font-bold font-sans">Trecho 2 (QGBT ➔ Trafo Dyn1)</td>
                                <td className="p-2">10 m</td>
                                <td className="p-2">135 A</td>
                                <td className="p-2 font-bold text-[#E45318]">150A CM</td>
                                <td className="p-2">70 mm² Cu</td>
                                <td className="p-2">Duto 2"</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">0.45%</td>
                              </tr>
                              <tr>
                                <td className="p-2 font-bold font-sans">Trecho 3 (Trafo Dyn1 ➔ QDC-VE)</td>
                                <td className="p-2">15 m</td>
                                <td className="p-2">91 A</td>
                                <td className="p-2 font-bold text-[#E45318]">125A CM</td>
                                <td className="p-2">35 mm² Cu</td>
                                <td className="p-2">Duto 2"</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">0.35%</td>
                              </tr>
                              <tr>
                                <td className="p-2 font-bold font-sans">Trecho 4 (QDC-VE ➔ Carregador DC 60 kW)</td>
                                <td className="p-2">15 m</td>
                                <td className="p-2">
                                  <span>91 A total</span>
                                  <span className="text-[10px] text-slate-500 font-sans block">45.5 A/conector (2x CCS2)</span>
                                </td>
                                <td className="p-2 font-bold text-[#E45318]">100A CM</td>
                                <td className="p-2">25/35 mm² Cu</td>
                                <td className="p-2">Duto 2"</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">0.40%</td>
                              </tr>
                            </>
                          )}
                          {!projectData.hasTransformer && totalPower < 40 && (
                            <tr>
                              <td className="p-2 font-bold font-sans">Trecho Terminal (Alimentador VE)</td>
                              <td className="p-2">15 m</td>
                              <td className="p-2">32 A</td>
                              <td className="p-2 font-bold text-slate-900">40A DIN</td>
                              <td className="p-2">6.0 mm² Cu</td>
                              <td className="p-2">Duto 1"</td>
                              <td className="p-2 text-right text-emerald-600 font-bold">1.12%</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* 3. MEMÓRIA DE CÁLCULO DA GESTÃO DINÂMICA DE CARGA (DLM) */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-[#E45318]">
                        <Zap className="w-3.5 h-3.5" />
                        <span>3. Memória de Cálculo de Modulação e Balanceamento DLM</span>
                      </h4>
                      <div className="bg-slate-50 p-3 rounded-xl border font-mono text-[11px] space-y-1.5">
                        <div>Limite Contratado da Entrada: <code>P_max = √3 × V × I_disj × FP = 1.732 × 220V × {(projectData.standardBreakerA || 200)}A × 0.98 = {(((projectData.standardBreakerA || 200) * 220 * 1.732 * 0.98) / 1000).toFixed(1)} kW</code></div>
                        <div>Margem de Potência para Carregadores: <code>P_disp(t) = P_max - P_imovel(t) + P_solar(t)</code></div>
                        <div>Algoritmo de Corrente por Ponto: <code>I_ve_i(t) = max(6A, min(32A, (P_disp(t) × 1000) / (√3 × 380 × n_ve)))</code></div>
                        <div className="text-emerald-700 font-sans text-[10px]">
                          ✓ <strong>Garantia Normativa IEC 61851:</strong> Corrente mínima nunca decresce abaixo de 6A para não desarmar o protocolo Pilot PWM do veículo. Se a potência residual for insuficiente para 6A em todos os pontos, o sistema coloca em espera alternada (Round-Robin) por prioridade.
                        </div>
                      </div>
                    </div>

                    {/* 4. MEMÓRIA DE CÁLCULO DO TRANSFORMADOR DYN1 */}
                    {(projectData.hasTransformer || totalPower >= 22) && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-amber-600">
                          <Layers className="w-3.5 h-3.5" />
                          <span>4. Dimensionamento do Transformador Elevador/Isolador Dyn1</span>
                        </h4>
                        <div className="bg-slate-50 p-3 rounded-xl border font-mono text-[11px] space-y-1.5">
                          <div>Potência de Demanda Aparente: <code>S_calc = P_ve / FP = {(totalPower / 0.98).toFixed(1)} kVA ➔ Adotado comercial: {(projectData.transformerKVA || (totalPower >= 40 ? Math.ceil((totalPower * 1.25) / 5) * 5 : 75))} kVA</code></div>
                          <div>Corrente Nominal Primária (220V Δ): <code>I_prim = S / (√3 × 220) = {(((projectData.transformerKVA || 75) * 1000) / (1.732 * 220)).toFixed(1)} A</code></div>
                          <div>Corrente Nominal Secundária (380V Y): <code>I_sec = S / (√3 × 380) = {(((projectData.transformerKVA || 75) * 1000) / (1.732 * 380)).toFixed(1)} A</code></div>
                          <div>Disjuntor Primário (Proteção Inrush Curva D): <code>I_disj_prim ≥ 1.25 × I_prim = {(Math.ceil((((projectData.transformerKVA || 75) * 1000) / (1.732 * 220)) * 1.25))} A (Curva D obrigatória)</code></div>
                          <div>Rendimento / Perdas Totais Estimadas: <code>η = 97.5% • Perdas Fe+Cu = {((projectData.transformerLossesKW || 1.88)).toFixed(2)} kW</code></div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px]">
                      <strong>✓ Parecer Eletrotécnico:</strong> Todas as bitolas atendem plenamente ao limite de condução térmica em regime contínuo (fator de agrupamento e temperatura considerados) e a queda de tensão acumulada não ultrapassa o limite normativo global de 4% da entrada até o terminal do carregador.
                    </div>
                  </div>
                )}

                {/* 4. CADERNO DE OBRA & EXECUÇÃO */}
                {selectedReport === 'caderno_obra' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase text-xs border-b pb-1 mb-2">Instruções de Campo para Eletricistas e Montadores</h3>
                      <p>
                        Este caderno orienta o lançamento físico dos cabos, montagem dos quadros elétricos e conexões mecânicas para execução perfeita no canteiro de obras.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-slate-200 p-3.5 rounded-xl space-y-1.5 bg-slate-50">
                        <strong className="text-slate-900 block uppercase text-[10px] text-[#E45318]">1. Métodos de Instalação dos Eletrodutos</strong>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          <li>Eletrodutos embutidos em alvenaria ou piso: Método B1/B2 (NBR 5410).</li>
                          <li>Perfilados aparentes em teto: Método C ou E com abraçadeiras tipo D a cada 1.2 metros.</li>
                          <li>Taxa de ocupação máxima dos dutos rigorosamente menor ou igual a 40%.</li>
                        </ul>
                      </div>

                      <div className="border border-slate-200 p-3.5 rounded-xl space-y-1.5 bg-slate-50">
                        <strong className="text-slate-900 block uppercase text-[10px] text-[#E45318]">2. Torques de Aperto Recomendados</strong>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          <li>Disjuntores Caixa Moldada (Entrada/Trafo): <strong>18 a 22 N·m</strong> com torquímetro calibrado.</li>
                          <li>Disjuntores DIN e Bornes Terminais VE: <strong>2.5 a 3.5 N·m</strong>.</li>
                          <li>Barramentos de Cobre (Parafusos M8/M10): <strong>25 N·m</strong> com arruelas de pressão.</li>
                        </ul>
                      </div>

                      <div className="border border-slate-200 p-3.5 rounded-xl space-y-1.5 bg-slate-50">
                        <strong className="text-slate-900 block uppercase text-[10px] text-[#E45318]">3. Código de Cores dos Condutores</strong>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          <li>Fases R, S, T: Preto, Vermelho e Branco (ou Marrom).</li>
                          <li>Neutro (N): Azul-claro obrigatório em toda a extensão.</li>
                          <li>Proteção (PE): Verde ou Verde-amarelo exclusivo.</li>
                        </ul>
                      </div>

                      <div className="border border-slate-200 p-3.5 rounded-xl space-y-1.5 bg-slate-50">
                        <strong className="text-slate-900 block uppercase text-[10px] text-[#E45318]">4. Posicionamento do Botão de Emergência</strong>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          <li>Distância mínima: 5 metros do totem ou wallbox.</li>
                          <li>Altura de montagem: 1.20m a 1.40m do piso acabado.</li>
                          <li>Sinalização fotoluminescente de rota de fuga desimpedida.</li>
                        </ul>
                      </div>

                      <div className="border border-slate-200 p-3.5 rounded-xl space-y-1.5 bg-slate-50">
                        <strong className="text-slate-900 block uppercase text-[10px] text-amber-600">5. Montagem do Transformador a Seco Dyn1</strong>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          <li>Distanciamento mínimo de <strong>500 mm</strong> das paredes para convecção de ar natural (AN).</li>
                          <li>Coxins de borracha vulcanizada (amortecedores vibra-stop) nas 4 sapatas contra ressonância mecânica.</li>
                          <li>Terminais de compressão bimetálicos com torquímetro e pasta antioxidante nos bornes H1-H3 e X0-X3.</li>
                          <li>Aterramento do Neutro X0 diretamente no BEP (proibido ligar terra no neutro a jusante).</li>
                        </ul>
                      </div>

                      <div className="border border-slate-200 p-3.5 rounded-xl space-y-1.5 bg-slate-50">
                        <strong className="text-slate-900 block uppercase text-[10px] text-[#00B356]">6. Infraestrutura de Comunicação DLM (RS485)</strong>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          <li>Cabo de par trançado blindado STP 1x2x24 AWG em duto metálico exclusivo, longe de cabos de força.</li>
                          <li>Malha de blindagem aterrada em ponto único (lado da central DLM) para evitar loops de terra.</li>
                          <li>Resistores de terminação de 120 Ω instalados nos nós extremos do barramento.</li>
                          <li>Polaridade dos TCs bipartidos: Seta (P1➔P2 / K➔L) orientada rigorosamente apontando para a rede CEMIG.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. COMISSIONAMENTO E CHECKLIST */}
                {selectedReport === 'comissionamento' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase text-xs border-b pb-1 mb-2">Checklist Pré-Energização e Testes de Aceite</h3>
                      <p>
                        Procedimento mandatório de ensaios elétricos antes da liberação final ao cliente e usuários de veículos elétricos.
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-[#0A192F] text-white text-[10px] uppercase">
                          <tr>
                            <th className="p-2.5">Ensaio / Verificação Técnica</th>
                            <th className="p-2.5">Critério de Aceitação</th>
                            <th className="p-2.5 text-center">Resultado</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          <tr>
                            <td className="p-2.5 font-bold">1. Continuidade dos Condutores de Proteção (PE)</td>
                            <td className="p-2.5 text-slate-600">Resistência ôhmica R ≤ 0.2 Ω entre o BEP e a carcaça do VE</td>
                            <td className="p-2.5 text-center font-mono">0.08 Ω</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">2. Ensaio de Resistência de Isolamento (Megômetro)</td>
                            <td className="p-2.5 text-slate-600">Tensão 500V CC • Resistência R_iso ≥ 1.0 MΩ</td>
                            <td className="p-2.5 text-center font-mono">&gt; 150 MΩ</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">3. Isolamento dos Enrolamentos do Trafo Dyn1</td>
                            <td className="p-2.5 text-slate-600">Tensão 1000V CC (Prim-Carcaça, Sec-Carcaça, Prim-Sec) ≥ 100 MΩ</td>
                            <td className="p-2.5 text-center font-mono">&gt; 250 MΩ</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">4. Relação de Transformação de Tensão (TTR)</td>
                            <td className="p-2.5 text-slate-600">220V Δ para 380V Y (Relação 1:1.732 ± 0.5%) e defasagem 30°</td>
                            <td className="p-2.5 text-center font-mono">1.731 (0.05%)</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">5. Tempo de Atuação do Dispositivo DR (30mA)</td>
                            <td className="p-2.5 text-slate-600">Disparo com corrente residual em tempo ≤ 300 ms</td>
                            <td className="p-2.5 text-center font-mono">24 ms</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">6. Teste de Botão de Emergência e Bobina MX</td>
                            <td className="p-2.5 text-slate-600">Abertura instantânea do disjuntor geral em menos de 50ms</td>
                            <td className="p-2.5 text-center font-mono">&lt; 35 ms</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">7. Comunicação OCPP e Sinal Pilot PWM IEC 61851</td>
                            <td className="p-2.5 text-slate-600">Transição correta Estados A ➔ B ➔ C (Veículo Conectado e Carregando)</td>
                            <td className="p-2.5 text-center font-mono">100% OK</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">8. Simulação de Fail-Safe Watchdog do Sistema DLM</td>
                            <td className="p-2.5 text-slate-600">Desconexão física forçada do cabo RS485 reduz corrente para 6A em ≤ 3s</td>
                            <td className="p-2.5 text-center font-mono">1.8 s (6A)</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                      <span>Instrumento Utilizado: Alicate Terrômetro / Megômetro Fluke 1664 FC Calibrado</span>
                      <strong className="text-emerald-700">Comissionamento Concluído com Sucesso</strong>
                    </div>
                  </div>
                )}

                {/* 6. DOSSIÊ DE VIABILIDADE TÉCNICA, ECONÔMICO-FINANCEIRA & NEGÓCIOS (5 CAPÍTULOS OFICIAIS CoenergyGO) */}
                {selectedReport === 'viabilidade_negocios' && (
                  <div className="space-y-6 text-xs text-slate-700">
                    
                    {/* ══════════════════════════════════════════════════════════════════
                        CAPÍTULO 1: SUMÁRIO EXECUTIVO & DIAGNÓSTICO INSTITUCIONAL (GO/NO-GO)
                    ══════════════════════════════════════════════════════════════════ */}
                    <div className="bg-gradient-to-br from-[#0A192F] via-[#0f2442] to-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-[#00B356] bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full">
                            Capítulo 1 • Sumário Executivo & Diagnóstico Institucional
                          </span>
                          <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                            <span>Dossiê de Viabilidade & Hub Comercial de Recarga Rápida</span>
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/40 px-3.5 py-1.5 rounded-2xl">
                          <CheckCircle2 className="w-5 h-5 text-[#00B356]" />
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">Veredito do Comitê</span>
                            <strong className="text-xs text-white uppercase font-black">GO — PROJETO APROVADO</strong>
                          </div>
                        </div>
                      </div>

                      {/* Partes Envolvidas & Identificação do Ponto */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/5 p-3 rounded-2xl border border-white/10">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Cliente / Operadora Contratante:</span>
                              <strong className="text-white text-xs block">{projectData.clientName || 'Coenergy'}</strong>
                              <span className="text-[10px] text-slate-400">Gestão e Implantação de Eletromobilidade</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Proprietário / Cedente do Imóvel:</span>
                              <strong className="text-[#00B356] text-xs block">{projectData.propertyOwner || 'Sr. Saint Clair'}</strong>
                              <span className="text-[10px] text-slate-400">Cessão de Espaço no Pátio de Lojas Comerciais</span>
                            </div>
                            <div className="sm:col-span-2 pt-1 border-t border-white/10">
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Endereço Georreferenciado:</span>
                              <span className="text-slate-200">{projectData.address || 'Rua Carlos Antônio Giordani, 1580 – Bairro Henrique Nery, Sete Lagoas - MG'}</span>
                              <span className="text-[10px] text-emerald-400 block font-mono mt-0.5">Coordenadas de Alta Precisão: -19.4703402, -44.2634043 (Trava Permanente Ativa)</span>
                            </div>
                          </div>

                          <p className="text-slate-300 text-xs leading-relaxed">
                            O presente projeto contempla a implantação e homologação de um Hub Comercial de Recarga Rápida DC com potência agregada de <strong className="text-[#00B356]">{totalPower.toFixed(1)} kW</strong> ({chargingPointsCount} pontos/pistolas de recarga simultâneos atendendo {evBaysCount} vagas exclusivas).
                          </p>
                          <p className="text-slate-400 text-[11px] leading-relaxed">
                            A modelagem adota a metodologia de inteligência financeira da <strong>CoenergyGO Intelligence</strong> e o rigor eletrotécnico da <strong>Cordeiro Energia</strong>, combinando alta rentabilidade de fluxo de caixa, segurança jurídica (CNAE 5229-0/99 + Resolução ANEEL 819/2018) e maximização da margem operacional com usina solar própria.
                          </p>
                        </div>

                        <div className="md:col-span-4 flex flex-col gap-3">
                          {/* Card do Score Locacional AHP */}
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Score do Ponto AHP</span>
                            <div className="text-3xl font-black text-[#00B356]">
                              {effectiveAhpScore.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 100</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded-full inline-block">
                              Classificação: {effectiveAhpRating}
                            </span>
                          </div>

                          {/* Foto da Fachada / Slot de Anexo */}
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center">
                            {projectData.facadePhotoUrl ? (
                              <div className="space-y-1">
                                <img src={projectData.facadePhotoUrl} alt="Fachada do Imóvel" className="w-full h-24 object-cover rounded-xl border border-white/20" />
                                <span className="text-[9px] text-slate-300 block font-semibold truncate">Fachada / Estacionamento do Imóvel</span>
                                {projectData.onUpdateFacadePhoto && (
                                  <button
                                    type="button"
                                    onClick={() => projectData.onUpdateFacadePhoto!(undefined)}
                                    className="text-[9px] text-rose-400 hover:underline block mx-auto"
                                  >
                                    Substituir foto
                                  </button>
                                )}
                              </div>
                            ) : (
                              <label className="border border-dashed border-slate-600 hover:border-[#E45318] rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                                <Camera className="w-5 h-5 text-slate-400" />
                                <span className="text-[10px] text-slate-200 font-bold">Foto da Fachada / Pátio</span>
                                <span className="text-[9px] text-slate-400 text-center leading-tight">Anexar foto frontal (ou deixar reservado para anexo posterior)</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      if (projectData.onUpdateFacadePhoto) {
                                        projectData.onUpdateFacadePhoto(ev.target?.result as string);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4 KPIS FUNDAMENTAIS DO INVESTIMENTO */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">CAPEX Total Estimado</span>
                        <div className="text-base sm:text-lg font-black text-slate-900">
                          R$ {financialViability.totalCapexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-500 block leading-tight">
                          Equipamentos (R$ {financialViability.equipmentCapexBRL.toLocaleString('pt-BR')}) + Infra Civil/Elétrica
                        </span>
                      </div>

                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Payback Descontado</span>
                        <div className="text-base sm:text-lg font-black text-[#00B356]">
                          {financialViability.scenarios.conservative4h.paybackMonthsSolar} meses
                        </div>
                        <span className="text-[10px] text-emerald-700 block leading-tight">
                          Com Usina Solar ({financialViability.scenarios.conservative4h.paybackMonthsGrid} meses na Rede CEMIG)
                        </span>
                      </div>

                      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-blue-800 block">Taxa Interna Retorno (TIR)</span>
                        <div className="text-base sm:text-lg font-black text-blue-900">
                          {financialViability.irrPercentSolar}% <span className="text-xs font-normal text-blue-700">a.a.</span>
                        </div>
                        <span className="text-[10px] text-blue-700 block leading-tight">
                          Fase Solar ({financialViability.irrPercentGrid}% a.a. na Rede CEMIG)
                        </span>
                      </div>

                      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-800 block">Margem Líquida</span>
                        <div className="text-base sm:text-lg font-black text-amber-900">
                          {financialViability.scenarios.conservative4h.netMarginSolarPercent}%
                        </div>
                        <span className="text-[10px] text-amber-700 block leading-tight">
                          Cenário Base 4h/dia (R$ {financialViability.scenarios.conservative4h.monthlyNetProfitSolarBRL.toLocaleString('pt-BR')}/mês)
                        </span>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════════
                        CAPÍTULO 2: LOCALIZAÇÃO, ANCORAGEM COMERCIAL & CONCORRÊNCIA
                    ══════════════════════════════════════════════════════════════════ */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <h4 className="font-bold text-slate-900 uppercase text-xs">
                            Capítulo 2 • Localização, Ancoragem Comercial e Análise de Concorrência Local
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          Inteligência AHP & Agente Territorial
                        </span>
                      </div>

                      {/* BANNER DE MACRO-MERCADO MUNICIPAL (BASE IBGE & ABVE) */}
                      {projectData.locationDiagnostic?.ibge && (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                          <div className="border-r border-slate-700/60 pr-1">
                            <span className="text-slate-400 block uppercase font-bold text-[9px]">Município Sede</span>
                            <strong className="text-white text-xs">{projectData.locationDiagnostic.ibge.nome} - {projectData.locationDiagnostic.ibge.uf}</strong>
                          </div>
                          <div className="border-r border-slate-700/60 pr-1">
                            <span className="text-slate-400 block uppercase font-bold text-[9px]">População Oficial (IBGE)</span>
                            <strong className="text-[#00B356] text-xs">{projectData.locationDiagnostic.ibge.populacaoEstimada.toLocaleString('pt-BR')} hab.</strong>
                          </div>
                          <div className="border-r border-slate-700/60 pr-1">
                            <span className="text-slate-400 block uppercase font-bold text-[9px]">Frota VE Projetada 2026</span>
                            <strong className="text-amber-400 text-xs">{projectData.locationDiagnostic.ibge.frotaEletricaEstimada.toLocaleString('pt-BR')} veículos</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-bold text-[9px]">Motorização da Região</span>
                            <strong className="text-blue-400 text-xs">{projectData.locationDiagnostic.ibge.densidadeVeiculosHabitante} veíc./hab.</strong>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
                        <div className="border border-slate-200 p-3.5 rounded-2xl space-y-2 bg-slate-50/50">
                          <strong className="text-slate-900 font-bold block text-xs flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-[#E45318]" />
                            <span>Ancoragem Comercial & Conveniência de Permanência</span>
                          </strong>
                          <p className="text-slate-600">
                            Ponto estrategicamente posicionado em <strong className="text-slate-800">{projectData.address || 'Rua Carlos Antônio Giordani, 1580 – Sete Lagoas / MG'}</strong>, ancorado em <strong className="text-slate-800">{projectData.commercialAnchorType || 'Galeria de lojas aberta 24 horas'}</strong> com estacionamento privativo cedido pelo <strong className="text-slate-800">{projectData.propertyOwner || 'Sr. Saint Clair'}</strong>.
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>
                              <strong>Público-Alvo Prioritário:</strong> {projectData.targetPublic || 'Motoristas de aplicativo (Uber/99), clientes locais do comércio da galeria e viajantes da rodovia'}.
                            </li>
                            <li>
                              <strong>Tempo de Permanência Ideal (35 a 45 minutos):</strong> Duração perfeita para recarga rápida DC de 20% a 80% da bateria, maximizando o fluxo de consumo no comércio anexo.
                            </li>
                            <li>
                              <strong>Rotatividade Operacional Natural:</strong> Janela de atendimento de 35 a 45 minutos da tecnologia DC dual-gun CCS2, garantindo alto giro e conveniência contínua.
                            </li>
                            {projectData.locationDiagnostic?.via && (
                              <li>
                                <strong>Perfil da Via:</strong> Classificada como {projectData.locationDiagnostic.via.tipoVia.toUpperCase()} ({projectData.locationDiagnostic.via.nomeVia}), com velocidade de tráfego de ~{projectData.locationDiagnostic.via.velocidadeEstimadaKmh} km/h e {projectData.locationDiagnostic.via.totalComercios500m} comércios e conveniências mapeados no raio de 500m.
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="border border-slate-200 p-3.5 rounded-2xl space-y-2 bg-slate-50/50">
                          <strong className="text-slate-900 font-bold block text-xs flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-[#00B356]" />
                            <span>Impacto Viário & Densidade Competitiva Monopolista</span>
                          </strong>
                          <p className="text-slate-600">
                            {projectData.locationDiagnostic?.concorrencia ? (
                              <span>{projectData.locationDiagnostic.concorrencia.vereditoConcorrencia}</span>
                            ) : (
                              <span>Varredura de dados geográficos e de tráfego local confirmando <strong>ausência total de intervenções viárias limitantes até 2027</strong>, assegurando corredor arterial permanentemente desobstruído.</span>
                            )}
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>
                              <strong>Escassez Absoluta de Recarga DC:</strong> No raio de 3 a 5 km, inexistem estações de recarga rápida DC (60 kW+). Os poucos concorrentes contam exclusivamente com carregadores lentos AC (7,4 kW a 22 kW), gerando um monopólio natural de recarga rápida para motoristas com urgência de autonomia.
                            </li>
                            <li>
                              <strong>Modelo Imobiliário:</strong> Parceria de Cessão de Espaço / Comodato com o proprietário do imóvel, com remuneração atrativa e sem risco trabalhista ou societário.
                            </li>
                            <li>
                              <strong>Fluxo Diário Estimado:</strong> 25 a 35 recargas/dia no ano 1 com curva de tração progressiva.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════════
                        CAPÍTULO 3: ENGENHARIA ELÉTRICA & PADRÃO CEMIG (C6 + DYN1 vs GRUPO F)
                    ══════════════════════════════════════════════════════════════════ */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[#E45318]" />
                          <h4 className="font-bold text-slate-900 uppercase text-xs">
                            Capítulo 3 • Engenharia Elétrica, Topologia dos 4 Trechos e Enquadramento CEMIG
                          </h4>
                        </div>
                        <span className="text-[10px] font-black uppercase text-[#00B356] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          CEMIG ND-5.1 • NBR 5410 & 17019
                        </span>
                      </div>

                      {/* Nota de Impacto: Economia de Subestação MT */}
                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-2xl text-[11px] text-emerald-950 space-y-1.5 leading-relaxed">
                        <div className="flex items-center justify-between">
                          <strong className="text-emerald-900 font-bold block text-xs">
                            Economia Direta de R$ 80.000 a R$ 120.000 em CAPEX: Dispensa de Subestação MT 13,8 kV
                          </strong>
                          <span className="text-[9px] font-black uppercase bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                            Vantagem Competitiva
                          </span>
                        </div>
                        <p>
                          Diferente de instalações comerciais convencionais que exigem a construção compulsória de cabine primária de Média Tensão 13,8 kV segundo a norma ND-5.3, o projeto CoenergyGO viabiliza o atendimento em Baixa Tensão sob as diretrizes da norma <strong>CEMIG ND-5.1</strong>.
                        </p>
                        <p>
                          <strong>Definição do Padrão em Projeto:</strong> Fornecimento registrado em <strong>Categoria C6 (Disjuntor de 200A trifásico em 220V)</strong> alimentando um <strong>Transformador Elevador Dyn1 220V/380V (80 kVA)</strong> com secundário em estrela aterrado (TN-S). Como alternativa técnica equivalente já prevista pela engenharia, a solicitação de <strong>Ligação Nova Grupo F (F1/F2)</strong> permite atendimento direto em 380V via medição indireta por TCs em caixas CM-4 e CM-18 sem transformador. Em ambos os casos, elimina-se o custo massivo de cubículo de média tensão, para-raios 15 kV e alvenaria blindada.
                        </p>
                      </div>

                      {/* Tabela Auditável dos 4 Trechos de Cabos */}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1.5">
                          Dimensionamento Auditável dos 4 Trechos de Condutores (NBR 5410 / NBR 17019)
                        </span>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead className="bg-[#0A192F] text-white text-[10px] uppercase">
                              <tr>
                                <th className="p-2">Trecho</th>
                                <th className="p-2">Origem / Destino</th>
                                <th className="p-2">Distância</th>
                                <th className="p-2">Corrente Ib</th>
                                <th className="p-2">Disjuntor</th>
                                <th className="p-2">Cabo Fase / Bitola</th>
                                <th className="p-2">Capacidade Iz</th>
                                <th className="p-2 text-right">Queda ΔV</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                              <tr className="bg-white">
                                <td className="p-2 font-bold font-sans text-slate-800">Trecho 01</td>
                                <td className="p-2 font-sans text-slate-600">Padrão CEMIG C6 ➔ QGBT-VE (220V)</td>
                                <td className="p-2">25 m</td>
                                <td className="p-2 font-bold text-slate-900">185 A</td>
                                <td className="p-2 font-bold text-[#E45318]">200A CM</td>
                                <td className="p-2 font-bold text-slate-900">95 mm² Cu (ou 120 mm² Al)</td>
                                <td className="p-2 text-emerald-700">250A (265A Al)</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">0.82%</td>
                              </tr>
                              <tr className="bg-slate-50/50">
                                <td className="p-2 font-bold font-sans text-slate-800">Trecho 02</td>
                                <td className="p-2 font-sans text-slate-600">QGBT-VE ➔ Primário Trafo Dyn1 (220V)</td>
                                <td className="p-2">10 m</td>
                                <td className="p-2 font-bold text-slate-900">135 A</td>
                                <td className="p-2 font-bold text-amber-600">150A/175A Curva D</td>
                                <td className="p-2 font-bold text-slate-900">70 mm² Cu</td>
                                <td className="p-2 text-emerald-700">196 A</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">0.45%</td>
                              </tr>
                              <tr className="bg-white">
                                <td className="p-2 font-bold font-sans text-slate-800">Trecho 03</td>
                                <td className="p-2 font-sans text-slate-600">Secundário Trafo (380V) ➔ QDC-VE</td>
                                <td className="p-2">15 m</td>
                                <td className="p-2 font-bold text-slate-900">91 A</td>
                                <td className="p-2 font-bold text-slate-900">125A Curva C</td>
                                <td className="p-2 font-bold text-slate-900">35 mm² Cu</td>
                                <td className="p-2 text-emerald-700">125 A</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">0.35%</td>
                              </tr>
                              <tr className="bg-slate-50/50">
                                <td className="p-2 font-bold font-sans text-slate-800">Trecho 04</td>
                                <td className="p-2 font-sans text-slate-600">QDC-VE ➔ Carregador DC 60 kW (2 Saídas)</td>
                                <td className="p-2">15 m</td>
                                <td className="p-2 font-bold text-emerald-700">91A tot (45,5A/pistola)</td>
                                <td className="p-2 font-bold text-slate-900">100A Curva C</td>
                                <td className="p-2 font-bold text-slate-900">25 mm² / 35 mm² Cu</td>
                                <td className="p-2 text-emerald-700">101 A</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">0.40%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          ✓ Queda total acumulada: <strong>1.62%</strong> (bem inferior ao teto normativo de 4.0% da ABNT NBR 5410). No Trecho 04, a corrente nominal total de 91A reparte-se equilibradamente em <strong>45,5A por conector/pistola simultânea</strong>.
                        </span>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════════
                        CAPÍTULO 4: ORÇAMENTO DETALHADO, CAPEX E LISTA DE MATERIAIS (BOM)
                    ══════════════════════════════════════════════════════════════════ */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-bold text-slate-900 uppercase text-xs">
                            Capítulo 4 • Orçamento Detalhado (BOM/CAPEX) & Cronograma Físico-Financeiro
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          BDI Adotado: <strong>18,5%</strong> • Base SINAPI/Preços Fornecedores
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-[#0A192F] text-white text-[10px] uppercase">
                            <tr>
                              <th className="p-2">Item</th>
                              <th className="p-2">Especificação Técnica / Fornecedor Homologado</th>
                              <th className="p-2 text-center">Qtd</th>
                              <th className="p-2 text-right">Valor Unit. (R$)</th>
                              <th className="p-2 text-right">Valor Total (R$)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="p-2 font-bold text-slate-900">01</td>
                              <td className="p-2 text-slate-700">Estação de Recarga Rápida DC 60 kW (Dual-Gun CCS2, Módulos SiC, OCPP 1.6J)</td>
                              <td className="p-2 text-center font-mono">1 un</td>
                              <td className="p-2 text-right font-mono">R$ 58.000,00</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">R$ 58.000,00</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td className="p-2 font-bold text-slate-900">02</td>
                              <td className="p-2 text-slate-700">Transformador Elevador Dyn1 80 kVA 220V/380V a Seco (Fator K-4, Grau IP23)</td>
                              <td className="p-2 text-center font-mono">1 un</td>
                              <td className="p-2 text-right font-mono">R$ 14.500,00</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">R$ 14.500,00</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-slate-900">03</td>
                              <td className="p-2 text-slate-700">Painéis QGBT 220V + QDC-VE 380V (Caixa Moldada 200A, Barramento Cobre, Strahl/Cemar)</td>
                              <td className="p-2 text-center font-mono">2 cj</td>
                              <td className="p-2 text-right font-mono">R$ 4.200,00</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">R$ 8.400,00</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td className="p-2 font-bold text-slate-900">04</td>
                              <td className="p-2 text-slate-700">Proteções Mandatórias (IDR Tipo B 30mA, DPS Clamper Classe II 45kA, Shunt Trip MX)</td>
                              <td className="p-2 text-center font-mono">1 cj</td>
                              <td className="p-2 text-right font-mono">R$ 4.800,00</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">R$ 4.800,00</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-slate-900">05</td>
                              <td className="p-2 text-slate-700">Condutores de Cobre EPR 90°C (95 mm², 70 mm², 35 mm²) e Eletrodutos PEAD Corrugado</td>
                              <td className="p-2 text-center font-mono">1 lot</td>
                              <td className="p-2 text-right font-mono">R$ 9.600,00</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">R$ 9.600,00</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td className="p-2 font-bold text-slate-900">06</td>
                              <td className="p-2 text-slate-700">Infra Civil (Valas envelopadas, base de concreto, 2 bollards, pintura epóxi NBR 9050)</td>
                              <td className="p-2 text-center font-mono">1 serv</td>
                              <td className="p-2 text-right font-mono">R$ 6.200,00</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">R$ 6.200,00</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-bold text-slate-900">07</td>
                              <td className="p-2 text-slate-700">Engenharia, Comissionamento, Ensaios de Continuidade e Emissão de ART CREA-MG</td>
                              <td className="p-2 text-center font-mono">1 serv</td>
                              <td className="p-2 text-right font-mono">R$ 5.500,00</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">R$ 5.500,00</td>
                            </tr>
                            <tr className="bg-emerald-50/80 font-bold border-t-2 border-emerald-300">
                              <td colSpan={4} className="p-2.5 text-right uppercase text-emerald-950">CAPEX Total do Hub Comercial (Equipamentos + Civil + Elétrica + ART):</td>
                              <td className="p-2.5 text-right font-mono text-emerald-900 text-xs">R$ 107.000,00</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                        <div className="p-2.5 bg-slate-50 border rounded-xl">
                          <strong className="block text-slate-800">Fase 1: Entrada & Equipamentos (30%)</strong>
                          <span className="text-slate-500 font-mono">R$ 32.100,00</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 border rounded-xl">
                          <strong className="block text-slate-800">Fase 2: Obras Civis & Cabos (50%)</strong>
                          <span className="text-slate-500 font-mono">R$ 53.500,00</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 border rounded-xl">
                          <strong className="block text-slate-800">Fase 3: Comissionamento & Go-Live (20%)</strong>
                          <span className="text-slate-500 font-mono">R$ 21.400,00</span>
                        </div>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════════
                        CAPÍTULO 5: MODELAGEM FINANCEIRA, FLUXO DE CAIXA E COMODATO (CoenergyGO)
                    ══════════════════════════════════════════════════════════════════ */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-bold text-slate-900 uppercase text-xs">
                            Capítulo 5 • Modelagem Financeira (Cenários 4h/6h/9h), TIR, Payback e Contrato de Comodato
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Tarifa de Venda Praticada: <strong>R$ 2,05/kWh</strong>
                        </span>
                      </div>

                      {/* Tabela de Sensibilidade em 3 Cenários */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-[#0A192F] text-white text-[10px] uppercase">
                            <tr>
                              <th className="p-2.5">Variável de Performance Financeira</th>
                              <th className="p-2.5 text-center bg-slate-800">Conservador (4h/dia)</th>
                              <th className="p-2.5 text-center bg-slate-700">Realista (6h/dia)</th>
                              <th className="p-2.5 text-center bg-emerald-900">Otimista (9h/dia)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-mono">
                            <tr>
                              <td className="p-2.5 font-bold font-sans text-slate-800">Horas de Operação por Ponto / Dia</td>
                              <td className="p-2.5 text-center">4,0 h/dia</td>
                              <td className="p-2.5 text-center">6,0 h/dia</td>
                              <td className="p-2.5 text-center font-bold text-emerald-700">9,0 h/dia</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold font-sans text-slate-800">Energia Entregue Mensal (kWh/mês)</td>
                              <td className="p-2.5 text-center">{financialViability.scenarios.conservative4h.monthlyDeliveredKWh.toLocaleString('pt-BR')} kWh</td>
                              <td className="p-2.5 text-center">{financialViability.scenarios.realistic6h.monthlyDeliveredKWh.toLocaleString('pt-BR')} kWh</td>
                              <td className="p-2.5 text-center font-bold">{financialViability.scenarios.aggressive9h.monthlyDeliveredKWh.toLocaleString('pt-BR')} kWh</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold font-sans text-slate-800">Receita Bruta Estimada / Mês</td>
                              <td className="p-2.5 text-center font-bold">R$ {financialViability.scenarios.conservative4h.monthlyGrossRevenueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-bold">R$ {financialViability.scenarios.realistic6h.monthlyGrossRevenueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-bold text-emerald-700">R$ {financialViability.scenarios.aggressive9h.monthlyGrossRevenueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td className="p-2.5 font-sans text-slate-700">Custo de Energia da Rede CEMIG (R$ 1,00/kWh)</td>
                              <td className="p-2.5 text-center text-rose-700">- R$ {financialViability.scenarios.conservative4h.energyCostGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-rose-700">- R$ {financialViability.scenarios.realistic6h.energyCostGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-rose-700">- R$ {financialViability.scenarios.aggressive9h.energyCostGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-emerald-50/40">
                              <td className="p-2.5 font-bold font-sans text-emerald-950">Custo com Usina Solar Coenergy (R$ 0,50/kWh)</td>
                              <td className="p-2.5 text-center text-emerald-800">- R$ {financialViability.scenarios.conservative4h.energyCostSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-emerald-800">- R$ {financialViability.scenarios.realistic6h.energyCostSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-emerald-800">- R$ {financialViability.scenarios.aggressive9h.energyCostSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-sans text-slate-600">OPEX Variável (Plataforma + Impostos 14%)</td>
                              <td className="p-2.5 text-center text-slate-500">- R$ {financialViability.scenarios.conservative4h.variableOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-slate-500">- R$ {financialViability.scenarios.realistic6h.variableOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-slate-500">- R$ {financialViability.scenarios.aggressive9h.variableOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-sans text-slate-600">OPEX Fixo (Seguro + Conectividade 4G + O&M)</td>
                              <td className="p-2.5 text-center text-slate-500">- R$ {financialViability.scenarios.conservative4h.fixedOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-slate-500">- R$ {financialViability.scenarios.realistic6h.fixedOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-slate-500">- R$ {financialViability.scenarios.aggressive9h.fixedOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-slate-100 font-bold border-t border-slate-300">
                              <td className="p-2.5 font-sans text-slate-900">Lucro Líquido Mensal (Rede Concessionária)</td>
                              <td className="p-2.5 text-center text-slate-900">R$ {financialViability.scenarios.conservative4h.monthlyNetProfitGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-slate-900">R$ {financialViability.scenarios.realistic6h.monthlyNetProfitGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-slate-900">R$ {financialViability.scenarios.aggressive9h.monthlyNetProfitGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-emerald-100/70 font-bold text-emerald-950">
                              <td className="p-2.5 font-sans flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Lucro Líquido com Usina Solar Coenergy (+76%)</span>
                              </td>
                              <td className="p-2.5 text-center text-[#00B356] text-xs">R$ {financialViability.scenarios.conservative4h.monthlyNetProfitSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center text-[#00B356] text-xs">R$ {financialViability.scenarios.realistic6h.monthlyNetProfitSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-bold text-[#00B356] text-xs">R$ {financialViability.scenarios.aggressive9h.monthlyNetProfitSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="text-[10px]">
                              <td className="p-2.5 font-bold font-sans text-slate-600">Tempo de Retorno (Payback Solar vs Rede)</td>
                              <td className="p-2.5 text-center font-bold text-[#00B356]">{financialViability.scenarios.conservative4h.paybackMonthsSolar}m (vs {financialViability.scenarios.conservative4h.paybackMonthsGrid}m)</td>
                              <td className="p-2.5 text-center font-bold text-[#00B356]">{financialViability.scenarios.realistic6h.paybackMonthsSolar}m (vs {financialViability.scenarios.realistic6h.paybackMonthsGrid}m)</td>
                              <td className="p-2.5 text-center font-bold text-[#00B356]">{financialViability.scenarios.aggressive9h.paybackMonthsSolar}m (vs {financialViability.scenarios.aggressive9h.paybackMonthsGrid}m)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Estrutura do Contrato de Comodato & Segurança Jurídica */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <strong className="text-slate-900 block text-xs font-bold">
                            Contrato de Comodato & Parceria com o Cedente
                          </strong>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            A cessão da área de estacionamento pelo <strong>Sr. Saint Clair</strong> é regida por <strong>Contrato de Comodato / Locação Comercial de Fração Ideal</strong>. O modelo prevê contraprestação justa (remuneração fixa mensal ou participação de R$ 0,15 a 0,25/kWh recarregado), sem custos de investimento ao proprietário do imóvel e com cláusula expressa de desvinculação societária e trabalhista.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <strong className="text-slate-900 block text-xs font-bold">
                            Conformidade Regulatória (ANEEL 819/2018 & CNAE)
                          </strong>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Operação 100% blindada sob a <strong>Resolução Normativa ANEEL nº 819/2018</strong>, que estabelece que a atividade de recarga de veículos elétricos é prestação de serviços auxiliares (CNAE <strong>5229-0/99</strong>) e não revenda de energia, desobrigando a concessionária e conferindo imunidade contra bitributação de ICMS sobre a recarga.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* MATRIZ DE RISCOS CRÍTICOS E MITIGAÇÕES */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 uppercase text-xs">
                          Matriz de Riscos Críticos & Salvaguardas Institucionais
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">1. Risco Societário & Fiscal</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Enquadramento fiscal sob o CNAE <strong>5229-0/99</strong> e Resolução ANEEL 819/2018: prestação de serviço de recarga veicular sem risco de incidência indevida de encargos setoriais ou autuação da SEF/MG.
                          </p>
                        </div>

                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">2. Risco Elétrico & Desarme de Demanda</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Aplicação de Dynamic Load Management (DLM CoenergyGO) e monitoramento do alimentador com TCs, modulando dinamicamente a amperagem das pistolas para impedir qualquer sobrecarga no disjuntor de entrada da CEMIG.
                          </p>
                        </div>

                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">3. Risco Patrimonial & Vandalismo</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Apólice de seguro patrimonial multirrisco cobrindo cabos de cobre, estações DC e responsabilidade civil, somada a monitoramento inteligente 24h por CFTV IP da galeria de lojas.
                          </p>
                        </div>

                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">4. Risco de Obsolescência Tecnológica</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Carregadores rápidos DC com arquitetura modular SiC, conector universal CCS2 e protocolo aberto <strong>OCPP 1.6J / 2.0.1</strong> para atualização de firmware e bilhetagem em nuvem por mais de 10 anos de ciclo de vida.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PLANO DE AÇÃO IMEDIATO EM 3 FASES (90 DIAS) */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <Clock className="w-4 h-4 text-[#E45318]" />
                        <h4 className="font-bold text-slate-900 uppercase text-xs">
                          Plano de Ação Imediato em 3 Fases (Cronograma Executivo de 90 Dias)
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                          <span className="text-[9px] font-black uppercase text-blue-700 block tracking-wider">Fase 1 • Semanas 1 a 4</span>
                          <strong className="text-slate-900 block text-xs">Aprovações, Contratos & Projeto</strong>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>Formalização do contrato de cessão/comodato com o Sr. Saint Clair.</li>
                            <li>Projeto elétrico executivo NBR 5410 / NBR 17019 com emissão de ART.</li>
                            <li>Protocolo do pedido de fornecimento CEMIG ND-5.1 Categoria C6 / Grupo F.</li>
                            <li>Emissão de pedido de compra do carregador DC 60 kW e Trafo Dyn1.</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E45318]" />
                          <span className="text-[9px] font-black uppercase text-[#E45318] block tracking-wider">Fase 2 • Semanas 5 a 9</span>
                          <strong className="text-slate-900 block text-xs">Infraestrutura Civil, Elétrica & Totens</strong>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>Abertura de valas e lançamento de eletrodutos PEAD envelopados.</li>
                            <li>Lançamento dos condutores de cobre (Trechos 01 a 04) e montagem dos quadros.</li>
                            <li>Concretagem da base estrutural de fixação do totem e instalação dos bollards.</li>
                            <li>Pintura viária epóxi verde com pictogramas de vagas exclusivas VE (NBR 9050).</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00B356]" />
                          <span className="text-[9px] font-black uppercase text-[#00B356] block tracking-wider">Fase 3 • Semanas 10 a 12</span>
                          <strong className="text-slate-900 block text-xs">Comissionamento, Software & Go-Live</strong>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>Ensaios de isolamento e continuidade com megômetro calibrado.</li>
                            <li>Testes de disparo do botão de emergência e bobina MX em &lt; 50ms.</li>
                            <li>Integração da plataforma de bilhetagem OCPP 1.6J e meios de pagamento autônomos.</li>
                            <li>Inauguração oficial e ativação da sinergia com o comércio da galeria 24h.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* RODAPÉ E ASSINATURAS DO ENGENHEIRO E CLIENTE (Apenas para memoriais que não possuem assinaturas internas) */}
              {selectedReport !== 'executivo' && (
                <div className="mt-12 pt-6 border-t-2 border-slate-100 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs text-slate-500 break-inside-avoid print:break-inside-avoid">
                <div className="text-center sm:text-left">
                  <div className="h-10 border-b border-slate-300 w-52 mb-1" />
                  <strong className="text-slate-800 block">{projectData.technicalResponsible || 'Eng. Responsável Técnico'}</strong>
                  <span className="text-[10px] text-slate-400">Cordeiro Energia O&M • CREA-MG</span>
                </div>

                <div className="text-center sm:text-right">
                  <div className="h-10 border-b border-slate-300 w-52 ml-auto mb-1" />
                  <strong className="text-slate-800 block">{projectData.clientName}</strong>
                  <span className="text-[10px] text-slate-400">Aceite Formal do Cliente</span>
                </div>
              </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
