"use client";

import { useTransition } from "react";
import { Star, PlusCircle } from "lucide-react";
import { togglePrioridade, toggleAtividadeExtra } from "./actions";

export function TagToggler({ id, prioridade, atividadeExtra, isAdmin }: { id: string, prioridade: boolean, atividadeExtra: boolean, isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-1 mt-1">
        {prioridade && <span className="inline-flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold"><Star className="w-3 h-3 mr-1 fill-amber-500" /> Prioridade</span>}
        {atividadeExtra && <span className="inline-flex items-center text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold"><PlusCircle className="w-3 h-3 mr-1" /> Atv. Extra</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <label className="flex items-center gap-1.5 cursor-pointer hover:bg-black/5 p-1 rounded-md transition-colors w-fit">
        <input 
          type="checkbox" 
          checked={prioridade} 
          disabled={isPending}
          onChange={() => startTransition(() => togglePrioridade(id, prioridade))}
          className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
        />
        <span className={`text-[10px] font-bold ${prioridade ? "text-amber-600" : "text-slate-400"}`}>
          Prioridade
        </span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer hover:bg-black/5 p-1 rounded-md transition-colors w-fit">
        <input 
          type="checkbox" 
          checked={atividadeExtra} 
          disabled={isPending}
          onChange={() => startTransition(() => toggleAtividadeExtra(id, atividadeExtra))}
          className="w-3.5 h-3.5 accent-purple-500 cursor-pointer"
        />
        <span className={`text-[10px] font-bold ${atividadeExtra ? "text-purple-600" : "text-slate-400"}`}>
          Atv. Extra
        </span>
      </label>
    </div>
  );
}
