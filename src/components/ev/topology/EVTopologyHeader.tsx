'use client';

import React from 'react';
import { Activity, FileSpreadsheet, FileText, Plus } from 'lucide-react';

interface EVTopologyHeaderProps {
  activeTab: 'vis' | 'bom';
  setActiveTab: (tab: 'vis' | 'bom') => void;
  onOpenReportsHub: () => void;
  onOpenAddChargerModal: () => void;
  gridSupplyVoltage: 220 | 380;
  setGridSupplyVoltage: (voltage: 220 | 380) => void;
  clientBaseLoadKW: number;
  setClientBaseLoadKW: (kw: number) => void;
}

export function EVTopologyHeader({
  activeTab,
  setActiveTab,
  onOpenReportsHub,
  onOpenAddChargerModal,
  gridSupplyVoltage,
  setGridSupplyVoltage,
  clientBaseLoadKW,
  setClientBaseLoadKW
}: EVTopologyHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4 relative z-10">
      <div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-[#E45318]/20 border border-[#E45318]/40 text-[#E45318] text-xs font-bold uppercase tracking-wider rounded-full">
            {activeTab === 'bom'
              ? 'Passo 4B: Lista de Materiais & Orçamentos (CAPEX)'
              : 'Passo 4A: Topologia Interativa NBR 5410 & NBR 17019'}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00B356] animate-pulse" />
            {activeTab === 'bom'
              ? 'Preços CAPEX & Homologação em Tempo Real'
              : 'Recálculo Reativo Bidirecional Ativo'}
          </span>
        </div>
        <h2 className="text-xl font-black text-white mt-2 flex items-center gap-2">
          {activeTab === 'bom'
            ? 'Lista de Materiais e Orçamentos da Obra (Modular por Etapas)'
            : 'Diagrama Interativo do Fluxo de Energia: Rede Concessionária → Veículo Elétrico'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          {activeTab === 'bom'
            ? 'Navegue pelas abas para auditar cada trecho físico da instalação ou visualize a lista completa na aba Consolidada. Cabos calculados com condutores de fase, neutro e PE.'
            : 'Clique sobre qualquer bloco ou trecho da cadeia para visualizar ou editar parâmetros, abrir gavetas de dimensionamento, adicionar circuitos terminais e simular em tempo real a integridade da esteira.'}
        </p>
      </div>

      {/* Botões de Ação Rápida e Abas */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('vis')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'vis'
              ? 'bg-[#E45318] text-white shadow-lg shadow-[#E45318]/30 font-black'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Passo 4A: Topologia
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bom')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'bom'
              ? 'bg-[#00B356] text-white shadow-lg shadow-[#00B356]/30 font-black'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Passo 4B: Lista & Orçamentos (BOM)
        </button>

        <button
          type="button"
          onClick={onOpenReportsHub}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white shadow-md transition-all cursor-pointer flex items-center gap-2 border border-slate-700"
          title="Acessar os 5 Relatórios de Engenharia Oficiais"
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Relatórios (5 em 1)</span>
        </button>
      </div>

      {/* Controles Globais Rápidos (Apenas na Topologia) */}
      {activeTab === 'vis' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tensão Concessionária:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setGridSupplyVoltage(220)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  gridSupplyVoltage === 220
                    ? 'bg-[#E45318] text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                220V (F-F CEMIG)
              </button>
              <button
                type="button"
                onClick={() => setGridSupplyVoltage(380)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  gridSupplyVoltage === 380
                    ? 'bg-[#E45318] text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                380V (F-F Direto)
              </button>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
            <span className="text-slate-400">Carga Base Cliente:</span>
            <input
              type="number"
              min="0"
              max="200"
              step="0.5"
              value={clientBaseLoadKW}
              onChange={(e) => setClientBaseLoadKW(Number(e.target.value) || 0)}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-center text-white font-bold"
            />
            <span className="text-slate-400">kW</span>
          </div>

          <button
            type="button"
            onClick={onOpenAddChargerModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E45318] to-[#c24210] hover:from-[#f35c20] hover:to-[#E45318] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#E45318]/20 transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Carregador
          </button>
        </div>
      )}
    </div>
  );
}
