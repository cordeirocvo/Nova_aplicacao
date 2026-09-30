"use client";

import React, { useState } from "react";
import { 
  Zap, Shield, Cable, Box, AlertTriangle, CheckCircle2, 
  Copy, Check, FileDown, Layers, Info, ArrowRight, Gauge,
  Flame, Cpu
} from "lucide-react";
import { ElectricalInfrastructureSizing, BillOfMaterialItem } from "@/lib/coenergygo";

interface InfrastructurePanelProps {
  sizing: ElectricalInfrastructureSizing;
  chargerPowerKW: number;
  chargerVoltage: number;
  chargerPhases: 1 | 3;
  cableLengthMeters: number;
}

export default function InfrastructurePanel({
  sizing,
  chargerPowerKW,
  chargerVoltage,
  chargerPhases,
  cableLengthMeters
}: InfrastructurePanelProps) {
  const [copiedBOM, setCopiedBOM] = useState(false);
  const [selectedBOMCategory, setSelectedBOMCategory] = useState<string>("all");

  const handleCopyBOM = () => {
    const text = sizing.billOfMaterials
      .map(item => `[${item.category.toUpperCase()}] ${item.description} - Quantidade: ${item.quantity} ${item.unit} | Especificação: ${item.spec} (Ref: ${item.normReference})`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedBOM(true);
    setTimeout(() => setCopiedBOM(false), 2500);
  };

  const filteredBOM = selectedBOMCategory === "all"
    ? sizing.billOfMaterials
    : sizing.billOfMaterials.filter(i => i.category === selectedBOMCategory);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── RESUMO ESQUEMÁTICO DA INFRAESTRUTURA (UNIFILAR COMPACTO) ─── */}
      <div className="bg-[#0A192F] text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#00B356] bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                Passo 3: Engenharia Eletrotécnica
              </span>
              <span className="text-[10px] font-bold text-slate-400">NBR 5410 & NBR 17019</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mt-1">
              Infraestrutura Eletrotécnica do Ponto de Recarga
            </h3>
            <p className="text-xs text-slate-300">
              Dimensionamento do circuito alimentador geral, quadro de distribuição dedicado (QDC-VE) e proteções compulsórias.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Demanda Total Local + VE</span>
              <span className="text-xl font-black text-white">{sizing.totalSimultaneousDemandKW.toFixed(2)} kW</span>
            </div>
          </div>
        </div>

        {/* Esquema Unifilar Visual (Fluxo de Alimentação) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* 1. Entrada / Medição SmartMeter */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-blue-400">Ponto de Entrada</span>
              <Gauge className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Medição do Local</h4>
            <div className="text-xs text-slate-300 space-y-0.5">
              <p>Pico Medido: <strong className="text-white">{sizing.measuredPeakDemandKW.toFixed(2)} kW</strong></p>
              <p>Disjuntor Geral Rec.: <strong className="text-emerald-400">{sizing.feederGeneralBreakerRecommendedA}A</strong></p>
              <p>Cabo Geral: <strong className="text-white">{sizing.feederCableGaugePhaseMM2} mm²</strong></p>
            </div>
          </div>

          {/* 2. Alimentador & Infraestrutura de Passagem */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-400">Passagem & Eletroduto</span>
              <Cable className="w-4 h-4 text-amber-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Alimentador ({cableLengthMeters}m)</h4>
            <div className="text-xs text-slate-300 space-y-0.5">
              <p>Eletroduto: <strong className="text-white">{sizing.conduitSpecification.nominalInches} ({sizing.conduitSpecification.nominalDiameterMM}mm)</strong></p>
              <p>Queda Tensão: <strong className={sizing.isVoltageDropCompliant ? "text-emerald-400" : "text-red-400"}>
                {sizing.calculatedVoltageDropPercent}% (&le; 2.0%)
              </strong></p>
              <p>Taxa de Ocupação: <strong className="text-white">&le; 40% NBR 5410</strong></p>
            </div>
          </div>

          {/* 3. Quadro QDC-VE DIN */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#00B356]">Quadro QDC-VE</span>
              <Box className="w-4 h-4 text-[#00B356]" />
            </div>
            <h4 className="text-sm font-bold text-white">{sizing.panelSpecification.dinModulesCount} Módulos DIN</h4>
            <div className="text-xs text-slate-300 space-y-0.5">
              <p>Grau de Proteção: <strong className="text-white">{sizing.panelSpecification.ipRating}</strong></p>
              <p>Disjuntor VE: <strong className="text-emerald-400">{sizing.recommendedBreakerA}A Curva C</strong></p>
              <p>DR: <strong className="text-white">Tipo B (30mA)</strong></p>
            </div>
          </div>

          {/* 4. Estação de Recarga Terminal */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#E45318]">Ponto de Recarga (VE)</span>
              <Zap className="w-4 h-4 text-[#E45318]" />
            </div>
            <h4 className="text-sm font-bold text-white">{chargerPowerKW} kW ({chargerPhases}F @ {chargerVoltage}V)</h4>
            <div className="text-xs text-slate-300 space-y-0.5">
              <p>Corrente Ib: <strong className="text-white">{sizing.chargerDesignCurrentA}A</strong></p>
              <p>Condutor Fase: <strong className="text-white">{sizing.cableGaugePhaseMM2} mm²</strong></p>
              <p>Condutor PE: <strong className="text-emerald-400">{sizing.cableGaugeGroundMM2} mm² (Exclusivo)</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CARDS DE DETALHAMENTO TÉCNICO DAS PROTEÇÕES ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Condutores e Queda de Tensão */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
              Condutores de Potência
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              NBR 5410 Tab. 36
            </span>
          </div>
          <h4 className="text-base font-bold text-slate-800">Cabo Flexível {sizing.cableGaugePhaseMM2} mm² (Cobre)</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dimensionado para corrente de projeto de <strong>{sizing.chargerDesignCurrentA}A</strong> com margem contínua (Fs = 1.0).
          </p>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Queda Calculada:</span>
              <strong className={sizing.isVoltageDropCompliant ? "text-[#00B356]" : "text-red-500"}>
                {sizing.calculatedVoltageDropPercent}%
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Limite Normativo:</span>
              <strong className="text-slate-700">&le; 2.0% (NBR 17019)</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Neutro (Azul Claro):</span>
              <strong className="text-slate-700">{sizing.cableGaugeNeutralMM2} mm²</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Terra PE (Verde):</span>
              <strong className="text-[#00B356]">{sizing.cableGaugeGroundMM2} mm²</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Proteção Diferencial Residual */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#00B356] tracking-wider">
              Proteção Diferencial Residual
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              Mandatório NBR 17019
            </span>
          </div>
          <h4 className="text-base font-bold text-slate-800">{sizing.residualCurrentProtection.name}</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            {sizing.residualCurrentProtection.technicalJustification}
          </p>
          <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
            <p className="text-[11px] text-slate-600">
              Especificação: <strong>{sizing.residualCurrentProtection.rating}</strong>
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              Normas: {sizing.residualCurrentProtection.normativeReference}
            </p>
          </div>
        </div>

        {/* Card 3: Proteção contra Surtos (DPS) & Segurança */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
              Proteção Contra Surtos
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              Classe II
            </span>
          </div>
          <h4 className="text-base font-bold text-slate-800">{sizing.surgeProtectionDPS.name}</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            {sizing.surgeProtectionDPS.technicalJustification}
          </p>
          <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
            <p className="text-[11px] text-slate-600">
              Especificação: <strong>{sizing.surgeProtectionDPS.rating}</strong>
            </p>
            <p className="text-[10px] text-amber-700 font-semibold">
              Botoeira EPO: <strong>Obrigatória a &le; 5m da estação de recarga</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ─── LISTA DE MATERIAIS ELÉTRICOS (BOM - BILL OF MATERIALS) ─── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#E45318]" />
              Lista de Materiais Quantitativa da Instalação (BOM)
            </h4>
            <p className="text-xs text-slate-500">
              Quantitativo comercial exato de condutores, disjuntores, proteções e infraestrutura para aquisição e montagem.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBOM}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {copiedBOM ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedBOM ? "Copiado!" : "Copiar Lista"}
            </button>
          </div>
        </div>

        {/* Filtros de Categoria da BOM */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "Todos os Itens" },
            { id: "quadro", label: "Quadro QDC" },
            { id: "protecao", label: "Proteções DIN" },
            { id: "condutores", label: "Cabos Elétricos" },
            { id: "infraestrutura", label: "Infraestrutura" },
            { id: "seguranca", label: "Segurança / Bombeiros" }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedBOMCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                selectedBOMCategory === cat.id
                  ? "bg-[#0A192F] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tabela de Itens */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Descrição Comercial</th>
                <th className="px-4 py-3 text-center">Quant.</th>
                <th className="px-4 py-3">Especificação Técnica</th>
                <th className="px-4 py-3">Referência Normativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBOM.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-400">{item.id}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.description}</td>
                  <td className="px-4 py-3 text-center font-bold text-[#E45318]">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">{item.spec}</td>
                  <td className="px-4 py-3 text-slate-400 text-[10px] font-medium">{item.normReference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── PARECER TÉCNICO & NOTAS NORMATIVAS ─── */}
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" /> Notas Eletrotécnicas e Memorial Descritivo
        </h4>
        <div className="space-y-2">
          {sizing.technicalNotes.map((note, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E45318] mt-1.5 shrink-0" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
