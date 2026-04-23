"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true); // Automático ativado por padrão
  const router = useRouter();

  const pingSync = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      const res = await fetch('/api/sync');
      if (res.ok) {
        router.refresh(); // Atualiza a tabela na tela transparente
      }
    } catch(err) {
      console.error("Falha ao sincronizar", err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Sincroniza logo no início para garantir que está com os dados mais flexíveis
    pingSync();

    let intervalId: NodeJS.Timeout;
    if (autoSync) {
       // Loop automático a cada 5 minutos
       intervalId = setInterval(() => {
          pingSync();
       }, 5 * 60 * 1000); 
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoSync]);

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setAutoSync(!autoSync)}
        title={autoSync ? "Pausar loop automático" : "Ligar loop automático"}
        className={`p-2 rounded-lg border transition ${autoSync ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}
      >
        {autoSync ? <RefreshCw className="w-4 h-4 animate-[spin_4s_linear_infinite]" /> : <Play className="w-4 h-4" />}
      </button>

      <button
        onClick={pingSync}
        disabled={syncing}
        className="flex items-center gap-2 bg-[#00BFA5] hover:bg-[#009b85] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'SINCRONIZANDO...' : 'SINC. PLANILHA'}
      </button>
    </div>
  );
}
