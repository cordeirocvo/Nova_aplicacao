"use client";

import { useTransition } from "react";
import { Star, PlusCircle } from "lucide-react";
import { togglePrioridade, toggleAtividadeExtra } from "./actions";

export function TagToggler({ id, prioridade, atividadeExtra, isAdmin }: { id: string, prioridade: boolean, atividadeExtra: boolean, isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (!isAdmin) {
    return (
      <div className="flex flex-col mt-1" style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
        {prioridade && <span className="inline-flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold mb-1" style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginBottom: '4px', fontSize: '10px' }}><Star className="w-3 h-3 mr-1 fill-amber-500" style={{ width: '12px', height: '12px', marginRight: '4px' }} /> Prioridade</span>}
        {atividadeExtra && <span className="inline-flex items-center text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold" style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }}><PlusCircle className="w-3 h-3 mr-1" style={{ width: '12px', height: '12px', marginRight: '4px' }} /> Atv. Extra</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-2" style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
      <label className="flex items-center cursor-pointer hover:bg-black/5 p-1 rounded-md transition-colors w-fit mb-1.5" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '6px' }}>
        <input 
          type="checkbox" 
          checked={prioridade} 
          disabled={isPending}
          onChange={() => startTransition(() => togglePrioridade(id, prioridade))}
          className="w-3.5 h-3.5 accent-amber-500 cursor-pointer mr-1.5"
          style={{ width: '14px', height: '14px', marginRight: '6px' }}
        />
        <span className={`text-[10px] font-bold ${prioridade ? "text-amber-600" : "text-slate-400"}`} style={{ fontSize: '10px', fontWeight: 'bold', color: prioridade ? '#d97706' : '#94a3b8' }}>
          Prioridade
        </span>
      </label>
      <label className="flex items-center cursor-pointer hover:bg-black/5 p-1 rounded-md transition-colors w-fit" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input 
          type="checkbox" 
          checked={atividadeExtra} 
          disabled={isPending}
          onChange={() => startTransition(() => toggleAtividadeExtra(id, atividadeExtra))}
          className="w-3.5 h-3.5 accent-purple-500 cursor-pointer mr-1.5"
          style={{ width: '14px', height: '14px', marginRight: '6px' }}
        />
        <span className={`text-[10px] font-bold ${atividadeExtra ? "text-purple-600" : "text-slate-400"}`} style={{ fontSize: '10px', fontWeight: 'bold', color: atividadeExtra ? '#9333ea' : '#94a3b8' }}>
          Atv. Extra
        </span>
      </label>
    </div>
  );
}
