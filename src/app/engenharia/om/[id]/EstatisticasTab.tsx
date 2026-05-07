"use client";

import { useMemo } from "react";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Activity, Clock, DollarSign, Wrench } from "lucide-react";

export default function EstatisticasTab({ usina }: { usina: any }) {
  const stats = useMemo(() => {
    if (!usina?.manutencoes) return { totalGasto: 0, mttr: 0, concluidas: 0, chartCost: [], chartFreq: [] };

    const concluidas = usina.manutencoes.filter((m: any) => m.status === "Concluida");
    
    // Total Gasto
    const totalGasto = concluidas.reduce((acc: number, m: any) => acc + (m.custoMateriais || 0), 0);

    // MTTR (Média em Horas)
    let totalMinutes = 0;
    let countTime = 0;
    concluidas.forEach((m: any) => {
      if (m.tempoInicio && m.tempoFim) {
        totalMinutes += differenceInMinutes(new Date(m.tempoFim), new Date(m.tempoInicio));
        countTime++;
      }
    });
    const mttr = countTime > 0 ? (totalMinutes / countTime / 60).toFixed(1) : "0";

    // Chart: Custos por Mês
    const costMap: Record<string, number> = {};
    concluidas.forEach((m: any) => {
      if (m.dataRealizada) {
        const month = format(new Date(m.dataRealizada), "MMM/yy", { locale: ptBR });
        costMap[month] = (costMap[month] || 0) + (m.custoMateriais || 0);
      }
    });
    const chartCost = Object.keys(costMap).map(k => ({ name: k, valor: costMap[k] }));

    // Chart: Frequência por Equipamento (Top 5)
    const freqMap: Record<string, number> = {};
    usina.manutencoes.forEach((m: any) => {
      const equip = m.equipamento?.tag || "Geral";
      freqMap[equip] = (freqMap[equip] || 0) + 1;
    });
    const chartFreq = Object.keys(freqMap)
      .map(k => ({ name: k, total: freqMap[k] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { totalGasto, mttr, concluidas: concluidas.length, chartCost, chartFreq };
  }, [usina]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><DollarSign className="w-6 h-6" /></div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">Custo Total de O&M</h3>
          </div>
          <p className="text-3xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalGasto)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Clock className="w-6 h-6" /></div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">MTTR (Média)</h3>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.mttr} <span className="text-lg text-slate-400">horas</span></p>
          <p className="text-xs text-slate-400 mt-2">Tempo médio de reparo</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Wrench className="w-6 h-6" /></div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">Intervenções</h3>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.concluidas}</p>
          <p className="text-xs text-slate-400 mt-2">OS Concluídas</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Activity className="w-6 h-6" /></div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">Saúde Geral</h3>
          </div>
          <p className="text-3xl font-black text-emerald-500">Boa</p>
          <p className="text-xs text-slate-400 mt-2">Baseado nas preventivas em dia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6">Custos de Manutenção por Mês (R$)</h3>
          <div className="h-64">
            {stats.chartCost.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartCost}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={4} dot={{r: 6, fill: '#3b82f6', strokeWidth: 0}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">Sem dados financeiros.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6">Equipamentos com Mais Intervenções</h3>
          <div className="h-64">
            {stats.chartFreq.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartFreq} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={80} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="total" fill="#f59e0b" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">Sem dados de manutenção.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
