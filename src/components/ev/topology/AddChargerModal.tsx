'use client';

import React from 'react';
import { X } from 'lucide-react';
import { HOMOLOGATED_CHARGERS } from '@/lib/ev/chargersDatabase';
import { TopologyChargerNode } from '@/lib/coenergygo/types';

interface AddChargerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharger: (charger: Partial<TopologyChargerNode>) => void;
}

export function AddChargerModal({ isOpen, onClose, onSelectCharger }: AddChargerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0A192F] border border-slate-700 rounded-2xl p-6 text-slate-200 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Adicionar Estação de Recarga Homologada</h3>
            <p className="text-xs text-slate-400">Selecione um modelo oficial da WEG ou BENY para incluir na esteira</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto mt-4 p-1">
          {HOMOLOGATED_CHARGERS.slice(0, 8).map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                const newId = `ch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                onSelectCharger({
                  id: newId,
                  name: `${cat.brand} ${cat.model}`,
                  brand: cat.brand,
                  model: cat.model,
                  powerKW: cat.powerKW,
                  phases: cat.phases,
                  voltageV: cat.voltageV,
                  currentInA: cat.currentInA,
                  connector: cat.connectorType,
                  type: cat.powerKW >= 30 ? 'DC' : 'AC',
                  distanceMeters: 15,
                  marginPercent: 10
                });
                onClose();
              }}
              className="bg-slate-900 border border-slate-800 hover:border-[#E45318] rounded-xl p-3 cursor-pointer hover:bg-slate-800/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span className="text-[#E45318] font-bold">{cat.brand}</span>
                  <span>{cat.voltageV}V ({cat.phases === 3 ? 'Trifásico' : 'Monofásico'})</span>
                </div>
                <h5 className="font-bold text-xs text-white">{cat.model}</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">{cat.series} | {cat.connectorType}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold">{cat.powerKW} kW</span>
                <span className="text-slate-300">{cat.currentInA}A</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
