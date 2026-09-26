"use client";

import React from "react";
import ElectricalPanelVisualizer from "@/components/cad/ElectricalPanelVisualizer";
import { Zap, ShieldCheck, Layers, FileCode, Cpu, Car, Sun } from "lucide-react";
import Link from "next/link";

export default function PaineisEletricosPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl pb-20">
      {/* Header da Página */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#f15a24] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
              Engenharia Elétrica & CAD
            </span>
            <span className="text-xs text-slate-500 font-semibold">NBR 5410 • NBR IEC 61851</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Zap className="w-7 h-7 text-[#f15a24]" />
            Diagramas & Layout Físico de Painéis Elétricos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Geração visual de quadros DIN, barramentos, proteções dedicadas de carregadores EV e exportação para AutoCAD (.DXF).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/engenharia/padrao-cemig"
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Padrão Cemig
          </Link>
          <Link
            href="/engenharia/solar/telemetria"
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Telemetria Solar
          </Link>
        </div>
      </div>

      {/* Destaques das Normas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Padronização DIN TH35</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Módulos proporcionais de 18mm por polo com barramentos tipo pente e bornes de fase/neutro/terra.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Proteção Carregador EV</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Circuito dedicado com DR Tipo A/B (fuga DC 6mA) e disjuntor curva C exclusivo conforme NBR IEC 61851.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">AutoCAD (.DXF Nativo)</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Exportação direta em layers organizados (`ELET_QUADRO`, `ELET_DISJUNTORES`, `ELET_CABOS`).
            </p>
          </div>
        </div>
      </div>

      {/* Componente Visualizador do Painel */}
      <ElectricalPanelVisualizer />
    </div>
  );
}
