"use client";

import React, { useState } from 'react';
import { 
  Zap, Settings, Plus, Calculator, Trash2, Flashlight, 
  Activity, AlertTriangle, FileCheck, CheckCircle2 
} from 'lucide-react';
import { 
  dimensionarCircuitoBT, ParametrosCircuito, ResultadoEletrico,
  calcularCurtoMalhaEletrica, ParametrosMalhaCurto, MetodoInstalacao, Isolacao
} from '@/lib/engenharia/eletricaEngine';

export default function EletricaDimensionamentoPage() {
  const [trafo, setTrafo] = useState<ParametrosMalhaCurto>({
    tensaoSecundarioFF: 380,
    potenciaTrafo_KVA: 112.5,
    impTrafo_Perc: 4.0,
    sccRede_MVA: 500,
    zExtra_Ohms: 0
  });

  const [circuitos, setCircuitos] = useState<(ParametrosCircuito & { id: string, resultado?: ResultadoEletrico, icc_kA?: number })[]>([]);
  const [simulando, setSimulando] = useState(false);

  const addCircuito = () => {
    setCircuitos([...circuitos, {
      id: Date.now().toString(),
      nome: `Circuito ${circuitos.length + 1}`,
      potenciaKW: 10,
      fases: 3,
      fatorPotencia: 0.92,
      comprimentoMetros: 50,
      tensaoFN: trafo.tensaoSecundarioFF === 380 ? 220 : 127,
      tensaoFF: trafo.tensaoSecundarioFF,
      quedaTensaoMaxPorcento: 4.0,
      metodoInstalacao: 'B1',
      isolacao: 'PVC',
      material: 'COBRE',
      temperaturaAmbiente: 30,
      numCircuitosAgrupados: 1
    }]);
  };

  const removeCircuito = (id: string) => {
    setCircuitos(circuitos.filter(c => c.id !== id));
  };

  const calcularTudo = () => {
    setSimulando(true);
    setTimeout(() => {
      // 1. Calcula o curto na barra principal (Curto na origem)
      const origemSCC = calcularCurtoMalhaEletrica(trafo);

      // 2. Dimensiona os circuitos
      const novos = circuitos.map(c => {
        const result = dimensionarCircuitoBT(c);
        
        // 3. Calcula o novo curto no FIM do percurso do circuito
        const pontaSCC = calcularCurtoMalhaEletrica({
          ...trafo,
          zExtra_Ohms: result.impedanciaZ_Ohms
        });

        return { ...c, resultado: result, icc_kA: pontaSCC.curtoCircuitoKA };
      });
      setCircuitos(novos);
      setSimulando(false);
    }, 500);
  };

  const origemTrafo = calcularCurtoMalhaEletrica(trafo);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl border border-amber-200">
            <Zap className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dimensionamento Elétrico</h1>
            <p className="text-sm text-slate-500 font-medium">Motor de Cálculo NBR-5410, NBR-14039 (Curto Circuito e Cabos BT)</p>
          </div>
        </div>
        <button 
          onClick={calcularTudo}
          className="bg-amber-500 text-white px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition font-bold flex items-center gap-2"
        >
          {simulando ? <Activity className="w-5 h-5 animate-pulse" /> : <Calculator className="w-5 h-5" />}
          PROCESSAR CÁLCULOS
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Configuração Fonte */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 mb-4 border-b pb-2">
            <Settings className="w-5 h-5" />
            <h2 className="font-bold">Parâmetros da Subestação (Fonte)</h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Potência do Trafo (kVA)</label>
              <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={trafo.potenciaTrafo_KVA} onChange={e => setTrafo({...trafo, potenciaTrafo_KVA: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tensão Secundário (VL-L)</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={trafo.tensaoSecundarioFF} onChange={e => setTrafo({...trafo, tensaoSecundarioFF: Number(e.target.value)})}>
                <option value={220}>220V</option>
                <option value={380}>380V</option>
                <option value={440}>440V</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Impedância Trafo (Zcc %)</label>
              <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={trafo.impTrafo_Perc} onChange={e => setTrafo({...trafo, impTrafo_Perc: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nível Curto Rede Primária (MVA)</label>
              <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={trafo.sccRede_MVA} onChange={e => setTrafo({...trafo, sccRede_MVA: Number(e.target.value)})} />
            </div>
          </div>

          <div className="mt-6 bg-slate-800 text-white p-4 rounded-xl space-y-2 relative overflow-hidden">
             <Flashlight className="w-20 h-20 text-slate-700 opacity-20 absolute -right-4 -bottom-4" />
             <p className="text-xs text-slate-400 font-bold uppercase">Curto na Origem (QGBT)</p>
             <p className="text-2xl font-black">{origemTrafo.curtoCircuitoKA.toFixed(2)} <span className="text-sm font-medium text-slate-400">kA</span></p>
          </div>
        </div>

        {/* Quadro de Cargas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2 flex flex-col items-start justify-start">
          <div className="flex items-center justify-between w-full mb-4 border-b pb-2">
            <div className="flex items-center gap-2 text-slate-800">
              <Activity className="w-5 h-5" />
              <h2 className="font-bold">Quadro de Cargas Eletromecânicas</h2>
            </div>
            <button 
              onClick={addCircuito}
              className="text-xs font-bold bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> ADICIONAR CIRCUITO
            </button>
          </div>

          <div className="w-full space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {circuitos.length === 0 && (
              <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                 <p className="text-sm font-medium text-slate-500">Nenhum circuito criado.</p>
              </div>
            )}
            
            {circuitos.map((c, i) => (
              <div key={c.id} className="border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col gap-0 overflow-hidden relative">
                {/* Cabeçalho do Circuito */}
                <div className="flex justify-between items-center bg-slate-100 px-4 py-2 border-b border-slate-200">
                  <input 
                    className="bg-transparent font-bold text-sm text-slate-700 w-1/3 outline-none focus:border-b border-amber-400 placeholder:text-slate-400"
                    value={c.nome}
                    onChange={(e) => {
                      const nc = [...circuitos];
                      nc[i].nome = e.target.value;
                      setCircuitos(nc);
                    }}
                  />
                  <button onClick={() => removeCircuito(c.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Corpo do Cadastro */}
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Potência (kW)</label>
                    <input type="number" className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" value={c.potenciaKW} onChange={e => { const nc=[...circuitos]; nc[i].potenciaKW = Number(e.target.value); setCircuitos(nc); }}/>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Tensão</label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-400 cursor-not-allowed">
                       {c.tensaoFF}V ({c.fases}F)
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Fases</label>
                    <select className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none cursor-pointer" value={c.fases} onChange={e => { const nc=[...circuitos]; nc[i].fases = Number(e.target.value) as 1|2|3; setCircuitos(nc); }}>
                      <option value={1}>Monofásico</option>
                      <option value={2}>Bifásico</option>
                      <option value={3}>Trifásico</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Distância (m)</label>
                    <input type="number" className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" value={c.comprimentoMetros} onChange={e => { const nc=[...circuitos]; nc[i].comprimentoMetros = Number(e.target.value); setCircuitos(nc); }}/>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Método (NBR)</label>
                    <select className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" value={c.metodoInstalacao} onChange={e => { const nc=[...circuitos]; nc[i].metodoInstalacao = e.target.value as MetodoInstalacao; setCircuitos(nc); }}>
                      <option value="B1">B1 Eletroduto Embutido</option>
                      <option value="B2">B2 Eletroduto Aparente</option>
                      <option value="C">C Parede/Bandeja</option>
                      <option value="E">E Ar Livre Multi</option>
                      <option value="F">F Ar Livre Unipolar</option>
                    </select>
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-bold text-slate-500">Isolação</label>
                     <select className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" value={c.isolacao} onChange={e => { const nc=[...circuitos]; nc[i].isolacao = e.target.value as Isolacao; setCircuitos(nc); }}>
                        <option value="PVC">PVC (70°C)</option>
                        <option value="EPR_XLPE">XLPE/EPR (90°C)</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-bold text-slate-500">Temp Ambiente</label>
                     <input type="number" className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" value={c.temperaturaAmbiente} onChange={e => { const nc=[...circuitos]; nc[i].temperaturaAmbiente = Number(e.target.value); setCircuitos(nc); }}/>
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-bold text-slate-500">C. Agrupados</label>
                     <input type="number" className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" value={c.numCircuitosAgrupados} onChange={e => { const nc=[...circuitos]; nc[i].numCircuitosAgrupados = Number(e.target.value); setCircuitos(nc); }}/>
                  </div>
                </div>
                
                {/* Resumo do Dimensionamento */}
                {c.resultado && (
                   <div className="bg-emerald-50 border-t border-emerald-100 p-4 grid grid-cols-2 lg:grid-cols-5 gap-3 items-center">
                     <div className="flex items-center col-span-2 gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <div>
                           <p className="text-[10px] uppercase font-bold text-emerald-600">Condutor NBR-5410</p>
                           <p className="font-bold text-emerald-900 text-lg">{c.resultado.secaoEscolhidaMM} mm² <span className="text-xs font-normal">({c.resultado.capacidadeCaboIz.toFixed(1)}A)</span></p>
                        </div>
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-slate-500">Icc Fim Sec.</p>
                       <p className="font-bold text-slate-800 text-sm tracking-tighter">{c.icc_kA?.toFixed(2)} kA</p>
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-slate-500">Disjuntor</p>
                       <p className="font-bold text-slate-800 text-sm">{c.resultado.disjuntorIn} A</p>
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-slate-500">Queda Tensão</p>
                       <p className="font-bold text-red-600 text-sm">{c.resultado.quedaTensaoRealPorcento.toFixed(2)} % <span className="text-slate-400 font-normal text-xs">({c.resultado.quedaTensaoRealVolts.toFixed(1)}V)</span></p>
                     </div>
                   </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
