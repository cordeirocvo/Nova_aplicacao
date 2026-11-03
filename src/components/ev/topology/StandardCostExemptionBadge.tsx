'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface StandardCostExemptionBadgeProps {
  includeEntranceStandardInBOM: boolean;
  onToggleIncludeEntranceStandard?: () => void;
  isNewConnection?: boolean;
  isExistingStandardAdequate?: boolean;
}

export function StandardCostExemptionBadge({
  includeEntranceStandardInBOM,
  onToggleIncludeEntranceStandard,
  isNewConnection = false,
  isExistingStandardAdequate = true
}: StandardCostExemptionBadgeProps) {
  return (
    <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
      !includeEntranceStandardInBOM
        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
    }`}>
      <div className="flex items-start md:items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${
          !includeEntranceStandardInBOM ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        }`}>
          {!includeEntranceStandardInBOM ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm tracking-wide">
              {!includeEntranceStandardInBOM
                ? '🟢 Padrão Existente Adequado — Desconsiderado do Orçamento (R$ 0,00)'
                : '🟠 Ligação Nova / Adequação de Padrão — Custo Considerado no Orçamento'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-900 border border-current">
              {isNewConnection ? 'Ligação Nova' : (isExistingStandardAdequate ? 'Existente Adequado' : 'Requer Reforma')}
            </span>
          </div>
          <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
            {!includeEntranceStandardInBOM
              ? 'Como o imóvel já dispõe de padrão de entrada homologado sem necessidade de reforma, os itens da Etapa 1 estão zerados no CAPEX.'
              : 'O custo do padrão CEMIG (caixa de medição CM, disjuntor de entrada, poste e mureta) está computado no investimento inicial.'}
          </p>
        </div>
      </div>

      {onToggleIncludeEntranceStandard && (
        <button
          type="button"
          onClick={onToggleIncludeEntranceStandard}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border shrink-0 ${
            !includeEntranceStandardInBOM
              ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-600'
              : 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border-amber-600'
          }`}
        >
          {!includeEntranceStandardInBOM ? 'Incluir Custo do Padrão' : 'Desconsiderar Custo (Zerar)'}
        </button>
      )}
    </div>
  );
}
