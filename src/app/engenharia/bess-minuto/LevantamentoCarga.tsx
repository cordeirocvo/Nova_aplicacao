"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Zap, Calculator } from "lucide-react";

export interface EquipamentoCarga {
  id: string;
  nome: string;
  potenciaW: number;
  quantidade: number;
  fase: "Monofásico" | "Bifásico" | "Trifásico";
  horaLiga: string; // "08:00"
  horaDesliga: string; // "16:00"
}

interface LevantamentoCargaProps {
  projetoId?: string;
  onCurveGenerated: (curva: Array<{ hora: number; kw: number }>, equipamentos: EquipamentoCarga[]) => void;
  savedData?: EquipamentoCarga[];
}

export default function LevantamentoCarga({ projetoId, onCurveGenerated, savedData }: LevantamentoCargaProps) {
  const [equipamentos, setEquipamentos] = useState<EquipamentoCarga[]>(savedData || []);

  const handleAdd = () => {
    setEquipamentos([
      ...equipamentos,
      {
        id: Math.random().toString(36).substring(7),
        nome: "Novo Equipamento",
        potenciaW: 1000,
        quantidade: 1,
        fase: "Monofásico",
        horaLiga: "08:00",
        horaDesliga: "18:00"
      }
    ]);
  };

  const handleRemove = (id: string) => {
    setEquipamentos(equipamentos.filter((e) => e.id !== id));
  };

  const handleChange = (id: string, field: keyof EquipamentoCarga, value: any) => {
    setEquipamentos(
      equipamentos.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // Calcula horas de uso
  const getHorasUso = (liga: string, desliga: string) => {
    if (!liga || !desliga) return 0;
    const [hL, mL] = liga.split(":").map(Number);
    const [hD, mD] = desliga.split(":").map(Number);
    
    let tempoL = hL + mL / 60;
    let tempoD = hD + mD / 60;
    
    if (tempoD < tempoL) {
      tempoD += 24; // Atravessa a meia-noite
    }
    
    return tempoD - tempoL;
  };

  // Gera a curva 24h a partir dos equipamentos
  const gerarCurva24h = () => {
    const curva = Array.from({ length: 24 }, (_, i) => ({ hora: i, kw: 0 }));

    equipamentos.forEach((eq) => {
      const potTotalKW = (eq.potenciaW * eq.quantidade) / 1000;
      
      const [hL, mL] = eq.horaLiga.split(":").map(Number);
      const [hD, mD] = eq.horaDesliga.split(":").map(Number);
      
      let horaAtual = hL;
      let horasRestantes = getHorasUso(eq.horaLiga, eq.horaDesliga);

      // Distribuição simplificada por hora cheia para a curva base (1440 pontos vai interpolar isso depois se quiser)
      while (horasRestantes > 0) {
        const hIndex = horaAtual % 24;
        // Pega fração da hora se necessário (ex: 30 min)
        const fracaoNestaHora = Math.min(1, horasRestantes);
        curva[hIndex].kw += potTotalKW * fracaoNestaHora;
        
        horaAtual++;
        horasRestantes -= fracaoNestaHora;
      }
    });

    onCurveGenerated(curva, equipamentos);
  };

  const totalKW = equipamentos.reduce((acc, eq) => acc + (eq.potenciaW * eq.quantidade) / 1000, 0);
  const totalKWh = equipamentos.reduce((acc, eq) => acc + ((eq.potenciaW * eq.quantidade) / 1000) * getHorasUso(eq.horaLiga, eq.horaDesliga), 0);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Levantamento de Cargas (Equipamentos)
          </h3>
          <p className="text-slate-500 text-sm">Insira as potências e horários de uso para estimar a curva de consumo off-grid/micro-rede.</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Adicionar Equipamento
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
              <th className="pb-3 font-semibold">Equipamento</th>
              <th className="pb-3 font-semibold text-center">Potência (W)</th>
              <th className="pb-3 font-semibold text-center">QTD</th>
              <th className="pb-3 font-semibold text-center">Fase</th>
              <th className="pb-3 font-semibold text-center">Total (kW)</th>
              <th className="pb-3 font-semibold text-center">Hora Liga</th>
              <th className="pb-3 font-semibold text-center">Hora Desliga</th>
              <th className="pb-3 font-semibold text-center">kWh/dia</th>
              <th className="pb-3 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {equipamentos.map((eq) => {
              const kwTotal = (eq.potenciaW * eq.quantidade) / 1000;
              const hUso = getHorasUso(eq.horaLiga, eq.horaDesliga);
              const kwh = kwTotal * hUso;

              return (
                <tr key={eq.id} className="group">
                  <td className="py-4 pr-4">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={eq.nome}
                      onChange={(e) => handleChange(eq.id, "nome", e.target.value)}
                      placeholder="Ex: Rompedor"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg text-sm text-center"
                      value={eq.potenciaW}
                      onChange={(e) => handleChange(eq.id, "potenciaW", Number(e.target.value))}
                    />
                  </td>
                  <td className="py-4 px-2">
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg text-sm text-center"
                      value={eq.quantidade}
                      onChange={(e) => handleChange(eq.id, "quantidade", Number(e.target.value))}
                    />
                  </td>
                  <td className="py-4 px-2">
                    <select
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={eq.fase}
                      onChange={(e) => handleChange(eq.id, "fase", e.target.value)}
                    >
                      <option value="Monofásico">Monofásico</option>
                      <option value="Bifásico">Bifásico</option>
                      <option value="Trifásico">Trifásico</option>
                    </select>
                  </td>
                  <td className="py-4 px-2 text-center font-semibold text-slate-700">
                    {kwTotal.toFixed(2)}
                  </td>
                  <td className="py-4 px-2">
                    <input
                      type="time"
                      className="w-full px-2 py-2 border rounded-lg text-sm text-center"
                      value={eq.horaLiga}
                      onChange={(e) => handleChange(eq.id, "horaLiga", e.target.value)}
                    />
                  </td>
                  <td className="py-4 px-2">
                    <input
                      type="time"
                      className="w-full px-2 py-2 border rounded-lg text-sm text-center"
                      value={eq.horaDesliga}
                      onChange={(e) => handleChange(eq.id, "horaDesliga", e.target.value)}
                    />
                  </td>
                  <td className="py-4 px-2 text-center font-semibold text-[#00BFA5]">
                    {kwh.toFixed(2)}
                  </td>
                  <td className="py-4 pl-4 text-right">
                    <button
                      onClick={() => handleRemove(eq.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {equipamentos.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Nenhum equipamento adicionado. Clique no botão acima para iniciar o levantamento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex gap-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Potência Total Instalada</p>
            <p className="text-2xl font-black text-slate-800">{totalKW.toFixed(2)} kW</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Energia Estimada</p>
            <p className="text-2xl font-black text-[#00BFA5]">{totalKWh.toFixed(2)} kWh/dia</p>
          </div>
        </div>
        
        <button 
          onClick={gerarCurva24h}
          disabled={equipamentos.length === 0}
          className="flex items-center gap-2 bg-[#00BFA5] hover:bg-[#00a891] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calculator className="w-5 h-5" />
          Gerar Curva BESS e Prosseguir
        </button>
      </div>
    </div>
  );
}
