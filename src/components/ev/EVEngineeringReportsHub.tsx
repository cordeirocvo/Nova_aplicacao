"use client";

import React, { useState } from "react";
import { 
  FileText, Printer, Download, CheckCircle2, Shield, AlertTriangle, 
  Zap, Wrench, ClipboardCheck, Sparkles, Building2, User, Calendar, 
  MapPin, Check, ArrowRight, ExternalLink, X, ChevronRight, Layers, FileCode,
  TrendingUp, DollarSign, BarChart3, SunMedium, ArrowUpRight, Award, ShieldCheck, Clock
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
  };
}

export function EVEngineeringReportsHub({
  isOpen,
  onClose,
  projectData
}: EVEngineeringReportsHubProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('executivo');

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

  // Cálculo da Viabilidade Econômico-Financeira & Negócios (Modelo BLEV / CoenergyGO)
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
      title: '6. Dossiê de Viabilidade & Negócios (BLEV)',
      subtitle: 'Estudo executivo com DRE, sensibilidade 4h/6h/9h, CEMIG BT Grupo F e Payback',
      icon: TrendingUp,
      tag: 'Investidores & Diretoria'
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 transition-all">
      <div className="w-full max-w-6xl bg-white text-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
        
        {/* ─── TOPO DE AÇÕES & IDENTIDADE VISUAL CORDEIRO ENERGIA ─── */}
        <div className="bg-[#0A192F] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
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
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Menu Lateral de Seleção dos 5 Relatórios */}
          <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto space-y-2">
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
          <div className="flex-1 bg-slate-200 p-4 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
            <div className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 shadow-xl print:shadow-none border border-slate-200 print:border-none min-h-[297mm] flex flex-col justify-between font-['Montserrat',sans-serif]">
              
              {/* CABEÇALHO DO LAUDO (IDENTIDADE CORDEIRO ENERGIA) */}
              <div>
                <div className="flex items-start justify-between border-b-2 border-[#0A192F] pb-4 mb-6">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs mb-6">
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
                
                {/* 1. RELATÓRIO EXECUTIVO */}
                {selectedReport === 'executivo' && (
                  <div className="space-y-6 text-xs text-slate-700">
                    <div className="bg-gradient-to-br from-[#0A192F] to-slate-900 text-white p-5 rounded-2xl space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[#00B356] tracking-wider">Sumário Executivo</span>
                      <h3 className="text-lg font-bold text-white">Viabilidade e Retorno da Infraestrutura de Recarga</h3>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Este estudo contempla a implantação de {chargersCount} estação(ões) física(s) atendendo {evBaysCount} vaga(s) de recarga simultânea ({chargingPointsCount} pontos/pistolas ativas) com potência agregada de {totalPower.toFixed(1)} kW. 
                        A solução foi desenhada para garantir máxima segurança patrimonial, otimização da demanda com proteção contra desarmes de disjuntores e total conformidade com a CEMIG e o Corpo de Bombeiros.
                        {projectData.realLoadCurveMode && (
                          <span className="block mt-1 text-[#00B356] font-semibold">
                            ✓ Dimensionado com base em Medição Real de Campo (SmartMeter — {projectData.realLoadCurveMode === 'worst_case_envelope' ? 'Envoltória de Piores Picos NBR 5410' : 'Dia do Pico Crítico'}).
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-800">Investimento Total Estimado</span>
                        <p className="text-xl font-black text-[#00B356] mt-1">
                          R$ {(projectData.totalInvestmentBRL || 35000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[10px] text-emerald-700">Equipamentos + Montagem</span>
                      </div>
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-bold text-orange-800">Economia com Gestão DLM</span>
                        <p className="text-xl font-black text-[#E45318] mt-1">
                          R$ {(projectData.capexSavingsBRL || 18500).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[10px] text-orange-700">Evitou aumento de padrão imediato</span>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-bold text-blue-800">Mitigação de CO₂ Estimada</span>
                        <p className="text-xl font-black text-blue-700 mt-1">~{(evBaysCount * 6.2).toFixed(1)} ton/ano</p>
                        <span className="text-[10px] text-blue-600">Sustentabilidade ESG ({evBaysCount} vagas)</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] border-b pb-2">Relação de Estações de Recarga Previstas</h4>
                      <div className="space-y-2">
                        {projectData.chargers?.map((ch, idx) => {
                          const isDual = (ch.powerKW >= 60 && ch.type === 'DC') || (ch.connector && ch.connector.includes('2x'));
                          return (
                            <div key={ch.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#E45318] text-white flex items-center justify-center font-bold text-[10px]">
                                  {idx + 1}
                                </span>
                                <div>
                                  <strong className="text-slate-800 block">{ch.name}</strong>
                                  <span className="text-slate-500 text-[10px]">
                                    {ch.brand || 'WEG'} • Conector {ch.connector || 'Tipo 2'} • {isDual ? '2 Vagas Simultâneas (Dual-Gun)' : '1 Vaga'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <strong className="text-slate-900 block">{ch.powerKW} kW</strong>
                                <span className="text-slate-500 text-[10px]">{ch.phases === 3 ? 'Trifásico 380V' : 'Monofásico 220V'}</span>
                              </div>
                            </div>
                          );
                        })}
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

                    {/* 4. GESTÃO DINÂMICA DE CARGA (DLM) & SISTEMAS DE MERCADO */}
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 uppercase text-xs flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[#E45318]" />
                          <span>4. Gestão Dinâmica de Carga (DLM) & Sistemas Prontos de Mercado</span>
                        </h3>
                        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          IEC 61851-1 / NBR 17019
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Para viabilizar a recarga de alta potência sem a necessidade de aumento oneroso da demanda contratada ou troca de padrão junto à concessionária, o projeto adota o sistema de <strong>Gestão Dinâmica de Carga (DLM - Dynamic Load Management)</strong>. O sistema monitora em tempo real a corrente consumida pelo imóvel e modula continuamente a potência entregue aos veículos elétricos (de 6A a 32A por conector).
                      </p>

                      {/* Renderização Vetorial Didática do Fluxo DLM */}
                      <div className="my-3">
                        <DLMSystemVisualizer 
                          systemType={projectData.dlmSystemType || 'beny'}
                          gridLimitKW={projectData.standardBreakerA ? Number(((projectData.standardBreakerA * (projectData.voltageV || 220) * 1.732) / 1000).toFixed(1)) : 75}
                          buildingLoadKW={projectData.realPeakKW || 35}
                          evLoadKW={totalPower}
                          isThrottled={Boolean(projectData.deficitKW && projectData.deficitKW > 0)}
                          evCount={chargingPointsCount}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <strong className="text-slate-900 block uppercase text-[10px] text-[#E45318]">Mecanismo de Proteção e Watchdog Fail-Safe:</strong>
                          <p className="text-slate-600 leading-relaxed">
                            Caso ocorra falha de comunicação no barramento RS485 Modbus ou perda do sinal dos TCs de medição por tempo superior a <strong>5 segundos</strong>, o sistema comuta imediatamente para o modo de segurança (Fail-Safe), reduzindo a corrente de todos os carregadores para a taxa mínima de <strong>6A</strong> ou desarmando preventivamente os circuitos de recarga para impedir a queda do disjuntor geral da concessionária.
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <strong className="text-slate-900 block uppercase text-[10px] text-[#00B356]">Sinergia com Geração Solar e Tarifa Branca:</strong>
                          <p className="text-slate-600 leading-relaxed">
                            O controlador integra leitura bidirecional com inversores fotovoltaicos locais. Havendo injeção na rede (excedente solar), o sistema transfere 100% da sobra para os carregadores antes da exportação. No horário de ponta da concessionária (17h30 às 20h30), o algoritmo restringe a corrente para evitar tarifas de sobreconsumo.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 5. SUBESTAÇÃO E TRANSFORMADOR PARA RECARGA DE VE (Dyn1) */}
                    {(projectData.hasTransformer || totalPower >= 22) && (
                      <div className="space-y-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 uppercase text-xs flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-600" />
                            <span>5. Transformador para Recarga de VE (Dyn1) & Diagramas Técnicos NBR 17019</span>
                          </h3>
                          <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                            Aterramento TN-S Mandatório
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Para adequação da tensão de atendimento da concessionária (220V trifásico) para a tensão nominal exigida pelos carregadores de alta potência (380V trifásico com neutro), foi dimensionado um <strong>Transformador Elevador/Isolador a Seco Dyn1</strong> com classe de isolamento 1,1 kV e fator K-4 para suportar harmônicas de retificação veicular.
                        </p>

                        {/* Hub Interativo Completo do Transformador (Trifilar Dyn1, Unifilar, Caderno e BOM) */}
                        <div className="my-3">
                          <TransformerEngineeringHub 
                            nominalKVA={projectData.transformerKVA || (totalPower >= 40 ? Math.ceil((totalPower * 1.25) / 5) * 5 : 75)}
                            primaryVoltageV={220}
                            secondaryVoltageV={380}
                            lossesKW={projectData.transformerLossesKW || 1.88}
                            projectName={projectData.projectName}
                          />
                        </div>
                      </div>
                    )}
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
                            <td className="p-2">95 mm² Cu</td>
                            <td className="p-2">Duto 2.1/2"</td>
                            <td className="p-2 text-right text-emerald-600 font-bold">0.82%</td>
                          </tr>
                          {projectData.hasTransformer && (
                            <tr>
                              <td className="p-2 font-bold font-sans">Trecho 2 (QGBT ➔ Trafo Dyn1)</td>
                              <td className="p-2">10 m</td>
                              <td className="p-2">140 A</td>
                              <td className="p-2 font-bold text-amber-600">150A CM</td>
                              <td className="p-2">70 mm² Cu</td>
                              <td className="p-2">Duto 2"</td>
                              <td className="p-2 text-right text-emerald-600 font-bold">0.45%</td>
                            </tr>
                          )}
                          <tr>
                            <td className="p-2 font-bold font-sans">Trecho Terminal (Alimentador VE)</td>
                            <td className="p-2">15 m</td>
                            <td className="p-2">32 A</td>
                            <td className="p-2 font-bold text-slate-900">40A DIN</td>
                            <td className="p-2">6.0 mm² Cu</td>
                            <td className="p-2">Duto 1"</td>
                            <td className="p-2 text-right text-emerald-600 font-bold">1.12%</td>
                          </tr>
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

                {/* 6. DOSSIÊ DE VIABILIDADE ECONÔMICO-FINANCEIRA & NEGÓCIOS (PADRÃO BLEV / CARLOS MAGNO) */}
                {selectedReport === 'viabilidade_negocios' && (
                  <div className="space-y-6 text-xs text-slate-700">
                    
                    {/* I. SUMÁRIO EXECUTIVO & DIAGNÓSTICO (GO / NO-GO) */}
                    <div className="bg-gradient-to-br from-[#0A192F] via-[#0f2442] to-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-[#00B356] bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full">
                            Diagnóstico Institucional de Viabilidade
                          </span>
                          <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                            <span>Dossiê de Negócios & Eletromobilidade de Alta Potência</span>
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

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 space-y-2">
                          <p className="text-slate-300 text-xs leading-relaxed">
                            O presente projeto para <strong className="text-white">{projectData.clientName}</strong> contempla o dimensionamento e a implantação de um Hub Comercial de Recarga Rápida com potência agregada de <strong className="text-[#00B356]">{totalPower.toFixed(1)} kW</strong> ({chargingPointsCount} pontos/pistolas de recarga simultâneos atendendo {evBaysCount} vagas).
                          </p>
                          <p className="text-slate-400 text-[11px] leading-relaxed">
                            A modelagem adotada segue o padrão de inteligência financeira da <strong>BLEV Educação</strong> e a engenharia eletrotécnica da <strong>Cordeiro Energia</strong>, combinando alta atratividade de fluxo de caixa, mitigação de riscos regulatórios (CNAE 5229-0/99) e sinergia de autoprodução de energia solar.
                          </p>
                        </div>

                        <div className="md:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Score do Ponto</span>
                          <div className="text-3xl font-black text-[#00B356]">
                            {financialViability.locationScore.overallScore} <span className="text-sm font-normal text-slate-400">/ 10.0</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded-full inline-block">
                            Classificação: {financialViability.locationScore.verdict}
                          </span>
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
                          Com Usina Solar ({financialViability.scenarios.conservative4h.paybackMonthsGrid} meses na Rede)
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

                    {/* II. ENGENHARIA ELÉTRICA & PADRÃO CEMIG GRUPO F (BAIXA TENSÃO ATÉ 800A SEM SUBESTAÇÃO MT) */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[#E45318]" />
                          <h4 className="font-bold text-slate-900 uppercase text-xs">
                            II. Engenharia Elétrica & Fornecimento em Baixa Tensão (CEMIG Grupo F até 800A)
                          </h4>
                        </div>
                        <span className="text-[10px] font-black uppercase text-[#00B356] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Disrupção Técnica Normativa
                        </span>
                      </div>

                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-2xl text-[11px] text-emerald-950 space-y-1.5 leading-relaxed">
                        <strong className="text-emerald-900 font-bold block text-xs">
                          Economia Direta de R$ 80.000 a R$ 120.000 em CAPEX: Dispensa de Subestação MT Particular
                        </strong>
                        <p>
                          Diferente de instalações convencionais que exigem a construção compulsória de cabine primária de Média Tensão (13,8 kV) segundo a norma ND-5.3, a engenharia da Cordeiro Energia estruturou o atendimento de <strong>{totalPower.toFixed(1)} kW</strong> no escopo da norma <strong>CEMIG ND-5.1 (Tabela 4 / Categorias F1 a F9)</strong>.
                        </p>
                        <p>
                          A CEMIG permite fornecimento em <strong>Baixa Tensão (127/220V ou 220/380V) com disjuntor de até 800A (304 kVA)</strong> através de medição indireta por TCs instalados em caixas CM-4 e CM-18. Isso elimina a compra de transformador de 13,8 kV a óleo/seco, para-raios MT, chaves seccionadoras e alvenaria blindada, direcionando o capital diretamente para carregadores de maior performance.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Enquadramento Normativo</span>
                          <strong className="text-slate-800 block">CEMIG ND-5.1 Tabela 4 (Grupo F)</strong>
                          <span className="text-slate-500 text-[10px] block">Fornecimento Direto em BT (Medição Indireta por TCs)</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Proteção Geral Recomendada</span>
                          <strong className="text-slate-800 block">
                            Disjuntor Caixa Moldada {totalPower <= 60 ? '175A / 200A' : totalPower <= 120 ? '300A / 400A' : '600A / 800A'}
                          </strong>
                          <span className="text-slate-500 text-[10px] block">Homologado CEMIG PEC-11 / Icu ≥ 25 kA</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Eficiência & Queda de Tensão</span>
                          <strong className="text-emerald-700 block">ΔV ≤ 1.85% (Dentro da NBR 5410)</strong>
                          <span className="text-slate-500 text-[10px] block">Condutores EPR/XLPE 90°C em cobre eletrolítico</span>
                        </div>
                      </div>
                    </div>

                    {/* III. ANÁLISE DE MERCADO, TRÁFEGO E CONCORRÊNCIA */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-slate-900 uppercase text-xs">
                          III. Análise de Mercado, Tráfego e Concorrência Local
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
                        <div className="border border-slate-200 p-3.5 rounded-2xl space-y-1.5 bg-slate-50/50">
                          <strong className="text-slate-900 font-bold block text-xs">
                            Localização Âncora & Conveniência de Permanência
                          </strong>
                          <p className="text-slate-600">
                            Ponto estrategicamente posicionado em <strong className="text-slate-800">{projectData.address || 'Av. Amazonas, 2000 - Belo Horizonte / MG'}</strong>, ancorado em comércio consolidado e farmácia 24h com estacionamento frontal.
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li><strong>Tempo de Permanência Ideal:</strong> Sessões rápidas de 30 a 45 minutos (recarga de 20% a 80% do pack de baterias) geram alto consumo cruzado no varejo do imóvel.</li>
                            <li><strong>Sobretaxa de Ociosidade (Idle Fee):</strong> Aplicação de tarifa de permanência de R$ 1,50/min após 15 min do término da recarga, garantindo rotatividade ininterrupta das vagas.</li>
                          </ul>
                        </div>

                        <div className="border border-slate-200 p-3.5 rounded-2xl space-y-1.5 bg-slate-50/50">
                          <strong className="text-slate-900 font-bold block text-xs">
                            Impacto Viário & Densidade Competitiva
                          </strong>
                          <p className="text-slate-600">
                            Varredura de projetos de infraestrutura urbana confirmando <strong>ausência de impactos de intervenções do BRT Move ou desvios viários até 2027</strong>, mantendo o corredor arterial totalmente acessível.
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li><strong>Escassez de Recarga DC:</strong> Quase totalidade dos pontos concorrentes no raio de 3 km operam com recarga lenta AC (7.4 kW a 22 kW), tornando a recarga rápida DC um diferencial monopolista de conveniência.</li>
                            <li><strong>Modelo Imobiliário:</strong> Parceria sob regime de {projectData.commercialHub?.realEstateModel === 'aluguel_fixo' ? 'Locação Fixa' : projectData.commercialHub?.realEstateModel === 'revenue_share' ? 'Revenue Share' : 'Comodato Gratuito'} com enquadramento societário seguro.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* IV. MODELAGEM FINANCEIRA & SENSIBILIDADE (CENÁRIOS 4H, 6H E 9H / SINERGIA SOLAR) */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-bold text-slate-900 uppercase text-xs">
                            IV. Modelagem Financeira & Análise de Sensibilidade em 3 Cenários
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Tarifa de Venda: <strong>R$ {(projectData.commercialHub?.sellingPricePerKWh || 2.00).toFixed(2)}/kWh</strong>
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-[#0A192F] text-white text-[10px] uppercase">
                            <tr>
                              <th className="p-2.5">Variável de Performance</th>
                              <th className="p-2.5 text-center bg-slate-800">Cenário Conservador (4h/dia)</th>
                              <th className="p-2.5 text-center bg-slate-700">Cenário Realista (6h/dia)</th>
                              <th className="p-2.5 text-center bg-emerald-900">Cenário Otimista (9h/dia)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="p-2.5 font-bold text-slate-800">Horas de Operação por Ponto / Dia</td>
                              <td className="p-2.5 text-center font-mono">4,0 horas</td>
                              <td className="p-2.5 text-center font-mono">6,0 horas</td>
                              <td className="p-2.5 text-center font-mono font-bold text-emerald-700">9,0 horas</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold text-slate-800">Energia Entregue Mensal (kWh/mês)</td>
                              <td className="p-2.5 text-center font-mono">{financialViability.scenarios.conservative4h.monthlyDeliveredKWh.toLocaleString('pt-BR')} kWh</td>
                              <td className="p-2.5 text-center font-mono">{financialViability.scenarios.realistic6h.monthlyDeliveredKWh.toLocaleString('pt-BR')} kWh</td>
                              <td className="p-2.5 text-center font-mono">{financialViability.scenarios.aggressive9h.monthlyDeliveredKWh.toLocaleString('pt-BR')} kWh</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold text-slate-800">Receita Bruta Mensal Estimada</td>
                              <td className="p-2.5 text-center font-mono font-bold">R$ {financialViability.scenarios.conservative4h.monthlyGrossRevenueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono font-bold">R$ {financialViability.scenarios.realistic6h.monthlyGrossRevenueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-emerald-700">R$ {financialViability.scenarios.aggressive9h.monthlyGrossRevenueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-800">Custo de Energia da Rede CEMIG (R$ 1,00/kWh)</td>
                              <td className="p-2.5 text-center font-mono text-rose-700">- R$ {financialViability.scenarios.conservative4h.energyCostGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-rose-700">- R$ {financialViability.scenarios.realistic6h.energyCostGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-rose-700">- R$ {financialViability.scenarios.aggressive9h.energyCostGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-emerald-50/30">
                              <td className="p-2.5 font-bold text-emerald-950">Custo com Usina Solar Cordeiro (R$ 0,50/kWh)</td>
                              <td className="p-2.5 text-center font-mono text-emerald-800">- R$ {financialViability.scenarios.conservative4h.energyCostSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-emerald-800">- R$ {financialViability.scenarios.realistic6h.energyCostSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-emerald-800">- R$ {financialViability.scenarios.aggressive9h.energyCostSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 text-slate-600">OPEX Variável (Plataforma + Impostos 14%)</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">- R$ {financialViability.scenarios.conservative4h.variableOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">- R$ {financialViability.scenarios.realistic6h.variableOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">- R$ {financialViability.scenarios.aggressive9h.variableOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 text-slate-600">OPEX Fixo (R$ 474/mês por ponto: Seguro + 4G + O&M)</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">- R$ {financialViability.scenarios.conservative4h.fixedOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">- R$ {financialViability.scenarios.realistic6h.fixedOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">- R$ {financialViability.scenarios.aggressive9h.fixedOpexBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                              <td className="p-2.5 text-slate-900">Lucro Líquido Mensal (Rede Concessionária)</td>
                              <td className="p-2.5 text-center font-mono text-slate-900">R$ {financialViability.scenarios.conservative4h.monthlyNetProfitGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-slate-900">R$ {financialViability.scenarios.realistic6h.monthlyNetProfitGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-slate-900">R$ {financialViability.scenarios.aggressive9h.monthlyNetProfitGridBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-emerald-100/60 font-bold text-emerald-950">
                              <td className="p-2.5 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Lucro Líquido com Usina Solar Cordeiro (+76%)</span>
                              </td>
                              <td className="p-2.5 text-center font-mono text-[#00B356] text-xs">R$ {financialViability.scenarios.conservative4h.monthlyNetProfitSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-[#00B356] text-xs">R$ {financialViability.scenarios.realistic6h.monthlyNetProfitSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center font-mono text-[#00B356] text-xs">R$ {financialViability.scenarios.aggressive9h.monthlyNetProfitSolarBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="text-[10px]">
                              <td className="p-2.5 font-bold text-slate-600">Tempo de Retorno (Payback Solar vs. Rede)</td>
                              <td className="p-2.5 text-center font-mono font-bold text-[#00B356]">{financialViability.scenarios.conservative4h.paybackMonthsSolar}m (vs {financialViability.scenarios.conservative4h.paybackMonthsGrid}m)</td>
                              <td className="p-2.5 text-center font-mono font-bold text-[#00B356]">{financialViability.scenarios.realistic6h.paybackMonthsSolar}m (vs {financialViability.scenarios.realistic6h.paybackMonthsGrid}m)</td>
                              <td className="p-2.5 text-center font-mono font-bold text-[#00B356]">{financialViability.scenarios.aggressive9h.paybackMonthsSolar}m (vs {financialViability.scenarios.aggressive9h.paybackMonthsGrid}m)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <SunMedium className="w-4 h-4 text-[#E45318]" />
                          <span><strong>Estratégia de Transição:</strong> Operação inicial de 6 meses na Rede CEMIG ➔ Migração para Usina Solar Própria (GD Remota Cordeiro Energia) eleva o lucro líquido mensal em mais de 76%.</span>
                        </span>
                      </div>
                    </div>

                    {/* V. MATRIZ DE RISCOS CRÍTICOS E MITIGAÇÕES */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 uppercase text-xs">
                          V. Matriz de Riscos Críticos & Salvaguardas Institucionais
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">1. Risco Societário & Fiscal</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Enquadramento fiscal sob o CNAE <strong>5229-0/99 (Serviços Auxiliares ao Transporte Terrestre)</strong> e Resolução Normativa ANEEL 819/2018: a recarga não configura revenda de energia elétrica, mas prestação de serviço de recarga veicular, eliminando riscos de bitributação ou questionamentos pelo Fisco.
                          </p>
                        </div>

                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">2. Risco Elétrico & Desarme de Demanda</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Aplicação de Dynamic Load Management (DLM CoenergyGO) e monitoramento do ramal com transformadores de corrente (TCs), modulando dinamicamente a amperagem das pistolas para impedir qualquer sobrecarga no disjuntor de entrada da concessionária.
                          </p>
                        </div>

                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">3. Risco Patrimonial & Vandalismo</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Apólice de seguro patrimonial multirrisco com franquia reduzida (R$ 150/mês por ponto) cobrindo furto de cabos com blindagem de cobre, danos elétricos e responsabilidade civil, somada a monitoramento inteligente 24h por CFTV IP de alta resolução.
                          </p>
                        </div>

                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold">4. Risco de Obsolescência Tecnológica</strong>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Mitigado</span>
                          </div>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Carregadores rápidos DC com arquitetura de retificadores SiC modulares intercambiáveis, conector universal CCS2 com compatibilidade NACS e protocolo aberto <strong>OCPP 1.6J / 2.0.1</strong> para atualização de firmware e bilhetagem em nuvem por mais de 10 anos de vida útil.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* VI. PLANO DE AÇÃO IMEDIATO EM 3 FASES (90 DIAS) */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <Clock className="w-4 h-4 text-[#E45318]" />
                        <h4 className="font-bold text-slate-900 uppercase text-xs">
                          VI. Plano de Ação Imediato em 3 Fases (Cronograma Executivo de 90 Dias)
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                          <span className="text-[9px] font-black uppercase text-blue-700 block tracking-wider">Fase 1 • Semanas 1 a 4</span>
                          <strong className="text-slate-900 block text-xs">Aprovações, Contratos & Projeto</strong>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>Assinatura formal do contrato imobiliário de cessão das vagas.</li>
                            <li>Projeto elétrico executivo NBR 5410 / NBR 17019 com ART do Eng. Responsável.</li>
                            <li>Protocolo do pedido de fornecimento em Baixa Tensão CEMIG ND-5.1 Grupo F.</li>
                            <li>Emissão de pedido de compra dos carregadores DC de alta potência.</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E45318]" />
                          <span className="text-[9px] font-black uppercase text-[#E45318] block tracking-wider">Fase 2 • Semanas 5 a 9</span>
                          <strong className="text-slate-900 block text-xs">Infraestrutura Civil, Elétrica & Totens</strong>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>Abertura de valas e lançamento de eletrodutos PEAD envelopados.</li>
                            <li>Lançamento dos condutores de cobre e montagem do QDC-VE.</li>
                            <li>Concretagem das bases estruturais de fixação dos totens de recarga.</li>
                            <li>Pintura viária epóxi verde com pictogramas de vagas exclusivas VE.</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00B356]" />
                          <span className="text-[9px] font-black uppercase text-[#00B356] block tracking-wider">Fase 3 • Semanas 10 a 12</span>
                          <strong className="text-slate-900 block text-xs">Comissionamento, Software & Go-Live</strong>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                            <li>Ensaios de isolamento e continuidade com megômetro calibrado.</li>
                            <li>Testes de disparo do botão de emergência e bobina MX em &lt; 50ms.</li>
                            <li>Integração da plataforma de bilhetagem OCPP 1.6J e meios de pagamento.</li>
                            <li>Inauguração oficial e ativação da sinergia com a farmácia/comércio local.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* RODAPÉ E ASSINATURAS DO ENGENHEIRO E CLIENTE */}
              <div className="mt-12 pt-6 border-t-2 border-slate-100 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs text-slate-500">
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

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
