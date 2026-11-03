import React from 'react';
import { Loader2 } from 'lucide-react';

export function EVTabLoadingSkeleton({ label = "Carregando módulo..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center animate-pulse">
      <Loader2 className="w-10 h-10 text-[#E45318] animate-spin mb-4" />
      <span className="text-slate-300 font-medium text-sm tracking-wide">{label}</span>
      <span className="text-xs text-slate-500 mt-1">Carregando sob demanda para máxima performance</span>
    </div>
  );
}
