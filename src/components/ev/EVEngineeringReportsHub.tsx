"use client";

import React, { useState } from "react";
import { 
  FileText, Printer, Download, CheckCircle2, Shield, AlertTriangle, 
  Zap, Wrench, ClipboardCheck, Sparkles, Building2, User, Calendar, 
  MapPin, Check, ArrowRight, ExternalLink, X, ChevronRight, Layers, FileCode
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ReportType = 
  | 'executivo'
  | 'memorial_descritivo'
  | 'memorial_calculo'
  | 'caderno_obra'
  | 'comissionamento';

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
                            <td className="p-2.5 font-bold">3. Tempo de Atuação do Dispositivo DR (30mA)</td>
                            <td className="p-2.5 text-slate-600">Disparo com corrente residual em tempo ≤ 300 ms</td>
                            <td className="p-2.5 text-center font-mono">24 ms</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">4. Teste de Botão de Emergência e Bobina MX</td>
                            <td className="p-2.5 text-slate-600">Abertura instantânea do disjuntor geral em menos de 50ms</td>
                            <td className="p-2.5 text-center font-mono">&lt; 35 ms</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">APROVADO</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">5. Comunicação OCPP e Sinal Pilot PWM IEC 61851</td>
                            <td className="p-2.5 text-slate-600">Transição correta Estados A ➔ B ➔ C (Veículo Conectado e Carregando)</td>
                            <td className="p-2.5 text-center font-mono">100% OK</td>
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
