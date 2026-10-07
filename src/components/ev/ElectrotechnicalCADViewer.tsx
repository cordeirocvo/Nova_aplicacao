"use client";

import React, { useState } from "react";
import { 
  Shield, Zap, Layers, Box, Cable, CheckCircle2, 
  Download, Eye, Maximize2, Sliders, Info, Check, Copy,
  ArrowRight, FileSpreadsheet, RefreshCw
} from "lucide-react";
import { 
  ElectricalInfrastructureSizing, 
  TransformerSizingDetails,
  Panel220VSpec,
  Panel380VSpec,
  UtilityId 
} from "@/lib/coenergygo";

interface ElectrotechnicalCADViewerProps {
  sizing: ElectricalInfrastructureSizing;
  utility: UtilityId;
  chargerPowerKW: number;
  chargerVoltage: number;
  chargerPhases: 1 | 3;
  chargerBrand?: string;
  chargerModel?: string;
  cableLengthMeters: number;
}

export default function ElectrotechnicalCADViewer({
  sizing,
  utility,
  chargerPowerKW,
  chargerVoltage,
  chargerPhases,
  chargerBrand = "WEG",
  chargerModel = "WEMOB Wallbox",
  cableLengthMeters
}: ElectrotechnicalCADViewerProps) {
  const [viewMode, setViewMode] = useState<'unifilar' | 'quadros_din'>('unifilar');
  const [copiedCAD, setCopiedCAD] = useState(false);

  const { transformerDetails, panel220VSpec, panel380VSpec } = sizing;
  const isTrafoActive = transformerDetails.needed && transformerDetails.type === 'elevador_seco';

  const handleCopyCADSummary = () => {
    const text = `--- MEMORIAL DESCRITIVO ELETROTÉCNICO NBR 5410 / NBR 17019 ---
Projeto: CoenergyGO • Cordeiro Energia
Concessionária: ${utility} (Norma ND-5.1)
Estação de Recarga: ${chargerBrand} ${chargerModel} (${chargerPowerKW} kW - ${chargerVoltage}V)
Transformador Elevador: ${isTrafoActive ? `OBRIGATÓRIO (${transformerDetails.nominalKVA} kVA a seco, 220V Delta -> 380V/220V Estrela Aterrada)` : 'DISPENSADO (Rede 220V compatível direto com o carregador)'}

1. PAINEL DE PROTEÇÃO LADO 220V:
- Disjuntor Geral: ${panel220VSpec.mainBreakerA}A ${panel220VSpec.mainBreakerPoles}P Curva ${panel220VSpec.mainBreakerCurve}
- DPS: ${panel220VSpec.dpsSpec}
- Barramento: ${panel220VSpec.busbarRatingA}A
- Módulos DIN: ${panel220VSpec.dinModulesCount}

${isTrafoActive ? `2. PAINEL DE PROTEÇÃO LADO 380V (POTÊNCIA VE):
- Disjuntor Geral Secundário: ${panel380VSpec.mainBreakerA}A 3P Curva C
- Disjuntor Terminal VE: ${panel380VSpec.terminalBreakerA}A 3P Curva C
- Proteção DR: ${panel380VSpec.drType}
- DPS: ${panel380VSpec.dpsSpec}
- Aterramento: ${panel380VSpec.groundingSystem}` : `2. PROTEÇÃO VE (INTEGRADA 220V):
- Disjuntor Terminal: ${sizing.recommendedBreakerA}A Curva C
- Proteção DR: ${sizing.residualCurrentProtection.name}
- DPS: ${sizing.surgeProtectionDPS.name}`}

3. CONDUTORES E INFRAESTRUTURA:
- Fases: ${sizing.cableGaugePhaseMM2} mm² de Cobre
- Neutro: ${sizing.cableGaugeNeutralMM2} mm² (Azul Claro)
- Terra (PE): ${sizing.cableGaugeGroundMM2} mm² (Verde)
- Queda de Tensão: ${sizing.calculatedVoltageDropPercent}% (Limite: 2.0%)
- Eletroduto: ${sizing.conduitSpecification.nominalInches} (${sizing.conduitSpecification.nominalDiameterMM}mm)`;

    navigator.clipboard.writeText(text);
    setCopiedCAD(true);
    setTimeout(() => setCopiedCAD(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 md:p-8 space-y-6">
      
      {/* ─── BARRA SUPERIOR DE SELEÇÃO DE VISTA & AÇÕES ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
              Engenharia Visual Eletrotécnica
            </span>
            <span className="text-xs font-semibold text-slate-400">
              ABNT NBR 5410 & NBR 17019
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-800 mt-1">
            {viewMode === 'unifilar' ? 'Diagrama Unifilar Interativo (Simbologia ABNT)' : 'Layout Físico dos Quadros DIN & Fiação Normatizada'}
          </h3>
          <p className="text-xs text-slate-500">
            {viewMode === 'unifilar'
              ? 'Esquema elétrico funcional detalhando padrão, transformador, disjuntores, DPS e DR Tipo B.'
              : 'Disposição física dos componentes nos trilhos DIN TH35 com cores de cabos conforme NBR 5410.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Seletor de Modo de Visualização */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('unifilar')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'unifilar'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Diagrama Unifilar
            </button>
            <button
              onClick={() => setViewMode('quadros_din')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'quadros_din'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Layout Físico DIN
            </button>
          </div>

          <button
            onClick={handleCopyCADSummary}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {copiedCAD ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCAD ? "Copiado!" : "Copiar Memorial"}</span>
          </button>
        </div>
      </div>

      {/* ─── VISTA 1: DIAGRAMA UNIFILAR INTERATIVO (ABNT NBR 5410 / NBR 17019) ─── */}
      {viewMode === 'unifilar' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 md:p-6 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto">
            <div className="min-w-[760px] space-y-6">
              
              {/* Cabeçalho da Prancha Eletrotécnica */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Documento Técnico</span>
                  <strong className="text-white text-sm">Diagrama Unifilar de Alimentação e Proteção da Estação de Recarga VE</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Norma de Referência</span>
                  <strong className="text-emerald-400">ABNT NBR 17019 / NBR 5410</strong>
                </div>
              </div>

              {/* Roteiro Gráfico do Unifilar em Blocos Técnicos */}
              <div className="grid grid-cols-5 gap-3 text-center text-xs">
                
                {/* Bloco 1: Padrão Concessionária */}
                <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 w-fit mx-auto">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h5 className="font-bold text-white text-xs">Padrão {utility}</h5>
                  <p className="text-[10px] text-slate-400">ND-5.1 Baixa Tensão</p>
                  <div className="bg-slate-900/80 p-2 rounded-lg text-[10px] text-left text-slate-300 space-y-0.5 border border-slate-800">
                    <p>Tensão: <strong>{utility === 'CEMIG' ? '220V/127V' : `${chargerVoltage}V`}</strong></p>
                    <p>Disjuntor: <strong>{sizing.breakerTripDiagnosis.currentBreakerA}A</strong></p>
                    <p>Categoria: <strong>{sizing.cemigStandardBOM?.[0]?.categoria || 'C3'}</strong></p>
                  </div>
                </div>

                {/* Seta de Conexão com Condutores */}
                <div className="flex flex-col items-center justify-center space-y-1 text-slate-400 text-[10px]">
                  <ArrowRight className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white">Alimentador BT</span>
                  <span>{panel220VSpec.cableGaugeMM2} mm² Cu</span>
                  <span>(220V)</span>
                </div>

                {/* Bloco 2: Painel Lado 220V */}
                <div className="bg-slate-800/90 p-4 rounded-xl border border-blue-500/50 space-y-2">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 w-fit mx-auto">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h5 className="font-bold text-white text-xs">Painel 220V</h5>
                  <p className="text-[10px] text-slate-400">Entrada & Auxiliares</p>
                  <div className="bg-slate-900/80 p-2 rounded-lg text-[10px] text-left text-slate-300 space-y-0.5 border border-slate-800">
                    <p>Disjuntor Geral: <strong>{panel220VSpec.mainBreakerA}A {panel220VSpec.mainBreakerCurve}</strong></p>
                    <p>DPS: <strong>Uc 275V (20kA)</strong></p>
                    <p>Modbus: <strong>RS-485 DLM</strong></p>
                  </div>
                </div>

                {/* Bloco Central: Transformador ou Bypass */}
                <div className="flex flex-col items-center justify-center space-y-1 text-slate-400 text-[10px]">
                  <ArrowRight className={`w-5 h-5 ${isTrafoActive ? "text-[#E45318]" : "text-emerald-400"}`} />
                  <span className={`font-black ${isTrafoActive ? "text-[#E45318]" : "text-emerald-400"}`}>
                    {isTrafoActive ? `${transformerDetails.nominalKVA} kVA (Δ-Y)` : "Bypass Direto"}
                  </span>
                  <span>{isTrafoActive ? "220V → 380V Y" : "Tensão Direta 220V"}</span>
                </div>

                {/* Bloco 3: Painel 380V ou Módulo VE */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isTrafoActive 
                    ? "bg-slate-800/90 border-orange-500/60" 
                    : "bg-slate-800/50 border-slate-700"
                }`}>
                  <div className={`p-2 rounded-lg w-fit mx-auto ${
                    isTrafoActive ? "bg-orange-500/20 text-[#E45318]" : "bg-emerald-500/20 text-[#00B356]"
                  }`}>
                    <Box className="w-5 h-5" />
                  </div>
                  <h5 className="font-bold text-white text-xs">
                    {isTrafoActive ? "Painel 380V VE" : "Circuito VE 220V"}
                  </h5>
                  <p className="text-[10px] text-slate-400">Proteção NBR 17019</p>
                  <div className="bg-slate-900/80 p-2 rounded-lg text-[10px] text-left text-slate-300 space-y-0.5 border border-slate-800">
                    <p>Disjuntor VE: <strong>{sizing.recommendedBreakerA}A Curva C</strong></p>
                    <p>DR: <strong className="text-emerald-300">Tipo B 30mA</strong></p>
                    <p>DPS: <strong>{isTrafoActive ? "Uc 385V (4P)" : "Uc 275V (2P)"}</strong></p>
                  </div>
                </div>
              </div>

              {/* Relação dos Circuitos do Unifilar */}
              <div className="border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-[#E45318] block">Especificação do Circuito Terminal (C1)</span>
                  <p className="text-white font-bold">{chargerBrand} {chargerModel} — {chargerPowerKW} kW ({chargerVoltage}V {chargerPhases === 3 ? 'Trifásico' : 'Bifásico'})</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                    <p>Corrente Ib: <strong className="text-white">{sizing.chargerDesignCurrentA} A</strong></p>
                    <p>Disjuntor In: <strong className="text-white">{sizing.recommendedBreakerA} A</strong></p>
                    <p>Condutor Fase: <strong className="text-orange-400">{sizing.cableGaugePhaseMM2} mm² Cu</strong></p>
                    <p>Queda de Tensão: <strong className="text-emerald-400">{sizing.calculatedVoltageDropPercent}% (≤ 2.0%)</strong></p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-[#00B356] block">Sistema de Aterramento & Equipotencialização</span>
                  <p className="text-white font-bold">Esquema TN-S Obrigatório (ABNT NBR 17019)</p>
                  <div className="text-[11px] text-slate-300 space-y-1 pt-1">
                    <p>Condutor de Proteção (PE): <strong className="text-emerald-400">{sizing.cableGaugeGroundMM2} mm² exclusivo</strong></p>
                    <p className="text-slate-400">
                      {isTrafoActive 
                        ? 'O centro-estrela do secundário do transformador é rigidamente conectado ao Barramento de Equipotencialização Principal (BEP).' 
                        : 'Neutro e PE são segregados desde a origem na barra de aterramento principal.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA 2: LAYOUT FÍSICO REALISTA DOS QUADROS DIN (TRILHOS TH35) ─── */}
      {viewMode === 'quadros_din' && (
        <div className="space-y-6">
          
          {/* Quadro 1: Painel Lado 220V */}
          <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 font-black text-xs">
                  Q1
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{panel220VSpec.name}</h4>
                  <p className="text-xs text-slate-500">Trilho DIN TH35 • Grau de Proteção {sizing.panelSpecification.ipRating}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                Tensão de Operação: 220V (Barramento {panel220VSpec.busbarRatingA}A)
              </span>
            </div>

            {/* Trilho DIN Representado com Módulos */}
            <div className="bg-slate-200/90 p-3.5 rounded-xl border border-slate-300 space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Trilho DIN TH35 Superior</span>
              <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white rounded-lg border border-slate-300 shadow-inner">
                
                {/* Disjuntor Geral Primário */}
                <div className={`p-2.5 rounded border text-center text-[10px] font-bold ${
                  panel220VSpec.mainBreakerCurve === 'D' ? "bg-orange-50 border-orange-300 text-orange-900" : "bg-slate-100 border-slate-300 text-slate-800"
                }`}>
                  <span className="block text-[8px] text-slate-500">DISJ GERAL</span>
                  <span>{panel220VSpec.mainBreakerA}A</span>
                  <span className="block text-[8px] font-black">CURVA {panel220VSpec.mainBreakerCurve}</span>
                </div>

                {/* DPS Classe II 275V */}
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-center text-[10px] font-bold">
                  <span className="block text-[8px] text-emerald-600">DPS CL. II</span>
                  <span>275V</span>
                  <span className="block text-[8px] text-emerald-500">20/40kA</span>
                </div>

                {/* Multimedidor Modbus */}
                <div className="p-2.5 rounded bg-blue-50 border border-blue-300 text-blue-900 text-center text-[10px] font-bold">
                  <span className="block text-[8px] text-blue-600">MEDIDOR</span>
                  <span>MODBUS</span>
                  <span className="block text-[8px] text-blue-500">RS-485</span>
                </div>

                {/* Disjuntores Auxiliares */}
                {sizing.auxiliaryCircuits.map((circ, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-300 text-slate-700 text-center text-[10px]">
                    <span className="block text-[8px] text-slate-400">AUX {idx + 1}</span>
                    <strong className="block font-black">{circ.breakerA}A</strong>
                    <span className="block text-[8px] text-slate-500 truncate max-w-[60px]">{circ.name.slice(0, 10)}</span>
                  </div>
                ))}

                {/* Reserva Técnica */}
                <div className="p-2.5 rounded border border-dashed border-slate-300 text-slate-400 text-center text-[10px] italic">
                  <span>Reserva 30%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Módulo Físico do Transformador Elevador (quando aplicável) */}
          {isTrafoActive && (
            <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5 md:p-6 rounded-2xl border-2 border-orange-300 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#E45318] text-white font-black text-xs shadow-sm">
                    TR
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Gabinete Metálico do Transformador Elevador a Seco ({transformerDetails.nominalKVA} kVA)
                    </h4>
                    <p className="text-xs text-slate-500">Enrolamentos em Cobre/Alumínio Eletrolítico • {transformerDetails.coolingType}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-white bg-[#E45318] px-3.5 py-1 rounded-xl shadow-xs">
                  220V Delta → 380V/220V Estrela
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-orange-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[#E45318] block">Bornes de Entrada Primária (220V Trifásico)</span>
                  <p className="text-slate-800 font-bold">Terminais H1 - H2 - H3 (Triângulo Δ)</p>
                  <p className="text-slate-600">Corrente nominal primária: <strong>{transformerDetails.primaryCurrentA} A</strong></p>
                  <p className="text-slate-500 text-[11px]">Alimentado a partir do disjuntor {panel220VSpec.mainBreakerA}A Curva D do Painel 220V</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[#00B356] block">Bornes de Saída Secundária (380V/220V Trifásico)</span>
                  <p className="text-slate-800 font-bold">Terminais X1 - X2 - X3 + Neutro X0 (Estrela Y Aterrada)</p>
                  <p className="text-slate-600">Corrente nominal secundária: <strong>{transformerDetails.secondaryCurrentA} A</strong></p>
                  <p className="text-emerald-700 text-[11px] font-bold">Neutro X0 conectado ao BEP para formação do sistema TN-S</p>
                </div>
              </div>
            </div>
          )}

          {/* Quadro 2: Painel Lado 380V (quando ativo) */}
          {isTrafoActive && (
            <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#E45318] font-black text-xs">
                    Q2
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{panel380VSpec.name}</h4>
                    <p className="text-xs text-slate-500">Trilho DIN TH35 • Acomoda a Proteção Dedicada do Carregador</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl">
                  Barramento 380V Trifásico + Neutro + PE
                </span>
              </div>

              {/* Trilho DIN Representado com Módulos */}
              <div className="bg-slate-200/90 p-3.5 rounded-xl border border-slate-300 space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Trilho DIN TH35 Dedicado à Recarga VE</span>
                <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white rounded-lg border border-slate-300 shadow-inner">
                  
                  {/* Disjuntor Geral Secundário 380V */}
                  <div className="p-2.5 rounded bg-slate-100 border border-slate-300 text-slate-800 text-center text-[10px] font-bold">
                    <span className="block text-[8px] text-slate-500">GERAL 380V</span>
                    <span>{panel380VSpec.mainBreakerA}A</span>
                    <span className="block text-[8px] font-black">CURVA C</span>
                  </div>

                  {/* Disjuntor Terminal VE */}
                  <div className="p-2.5 rounded bg-orange-50 border border-orange-300 text-orange-900 text-center text-[10px] font-bold">
                    <span className="block text-[8px] text-[#E45318]">VE 22 kW</span>
                    <span>{panel380VSpec.terminalBreakerA}A</span>
                    <span className="block text-[8px] font-black">3P CURVA C</span>
                  </div>

                  {/* Interruptor DR Tetrapolar Tipo B */}
                  <div className="p-2.5 rounded bg-emerald-50 border-2 border-[#00B356] text-emerald-950 text-center text-[10px] font-black shadow-xs">
                    <span className="block text-[8px] text-[#00B356]">DR TIPO B</span>
                    <span>40A / 30mA</span>
                    <span className="block text-[8px] text-emerald-700">TESTE [T]</span>
                  </div>

                  {/* DPS Classe II 385V */}
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-center text-[10px] font-bold">
                    <span className="block text-[8px] text-amber-700">DPS 380V</span>
                    <span>Uc 385V</span>
                    <span className="block text-[8px] text-amber-600">4 POLOS</span>
                  </div>

                  {/* Reserva Técnica */}
                  <div className="p-2.5 rounded border border-dashed border-slate-300 text-slate-400 text-center text-[10px] italic">
                    <span>Reserva DIN</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guia de Identificação das Cores dos Cabos conforme NBR 5410 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-500 block">
              Padrão de Cores Normatizado dos Condutores (ABNT NBR 5410 Item 6.1.5)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-blue-500 shrink-0 shadow-xs" />
                <span><strong>Neutro (N):</strong> Azul Claro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-emerald-500 shrink-0 shadow-xs" />
                <span><strong>Proteção (PE):</strong> Verde ou Verde-Amarelo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-slate-900 shrink-0 shadow-xs" />
                <span><strong>Fase R:</strong> Preto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-red-600 shrink-0 shadow-xs" />
                <span><strong>Fase S / T:</strong> Vermelho / Branco</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
