"use client";

import React from "react";
import { Zap, Cpu, Activity, TrendingUp } from "lucide-react";

interface FabricanteItem {
  fornecedor: string;
  totalKWh: number;
  percentual: number;
}

interface CardFabricantesConsolidadoProps {
  participacao: FabricanteItem[];
  capacidadeTotalKWp: number;
  periodoStr?: string;
}

const getBrandColor = (brand: string) => {
  const b = (brand || "").toUpperCase();
  if (b.includes("HUAWEI")) return { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-400", bar: "bg-red-500" };
  if (b.includes("SOLIS")) return { bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-400", bar: "bg-amber-500" };
  if (b.includes("HOYMILES")) return { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-400", bar: "bg-cyan-500" };
  if (b.includes("CANADIAN")) return { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400", bar: "bg-emerald-500" };
  if (b.includes("FRONIUS")) return { bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-400", bar: "bg-orange-500" };
  if (b.includes("SUNGROW")) return { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-400", bar: "bg-blue-500" };
  return { bg: "bg-indigo-500/20", border: "border-indigo-500/40", text: "text-indigo-400", bar: "bg-indigo-500" };
};

export default function CardFabricantesConsolidado({
  participacao,
  capacidadeTotalKWp,
  periodoStr = "no Período",
}: CardFabricantesConsolidadoProps) {
  const safeList = Array.isArray(participacao) && participacao.length > 0
    ? participacao
    : [
        { fornecedor: "HUAWEI", totalKWh: 0, percentual: 60 },
        { fornecedor: "SOLIS", totalKWh: 0, percentual: 30 },
        { fornecedor: "HOYMILES", totalKWh: 0, percentual: 10 },
      ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Composição Multi-Fabricante da Usina
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-mono">
                {capacidadeTotalKWp > 0 ? `${capacidadeTotalKWp} kWp Instalados` : "Consolidado"}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Contribuição de cada fabricante para o total de geração {periodoStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
          <Activity className="w-3.5 h-3.5 text-[#10B981]" />
          <span>{safeList.length} Fabricante(s) Ativo(s)</span>
        </div>
      </div>

      {/* Grid de Cards de Participação por Fabricante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {safeList.map((item) => {
          const colors = getBrandColor(item.fornecedor);
          return (
            <div
              key={item.fornecedor}
              className={`p-3.5 rounded-xl border ${colors.bg} ${colors.border} space-y-2 transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black px-2 py-0.5 rounded uppercase ${colors.text} bg-slate-950/60 border ${colors.border}`}>
                  {item.fornecedor}
                </span>
                <span className="text-xs font-bold text-white font-mono">
                  {item.percentual}% do Total
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-400">Geração Acumulada:</span>
                <span className="text-sm font-extrabold text-white font-mono">
                  {item.totalKWh.toLocaleString("pt-BR")} <span className="text-xs text-slate-400">kWh</span>
                </span>
              </div>

              {/* Barra de Progresso do Percentual */}
              <div className="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${colors.bar} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(Math.max(item.percentual, 5), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
