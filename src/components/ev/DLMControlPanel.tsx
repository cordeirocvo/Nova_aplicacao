"use client";

import React, { useRef } from "react";
import { 
  Building, Sun, Zap, Sliders, Upload, 
  RotateCcw, ShieldCheck, BatteryCharging, Clock
} from "lucide-react";
import { TypicalProfileType } from "@/lib/coenergygo/types";

interface DLMControlPanelProps {
  profileType: TypicalProfileType;
  setProfileType: (val: TypicalProfileType) => void;
  peakDemandKW: number;
  setPeakDemandKW: (val: number) => void;
  gridLimitKW: number;
  setGridLimitKW: (val: number) => void;
  chargerCount: number;
  setChargerCount: (val: number) => void;
  chargerUnitPowerKW: number;
  setChargerUnitPowerKW: (val: number) => void;
  chargeStartHour: number;
  setChargeStartHour: (val: number) => void;
  chargeDurationHours: number;
  setChargeDurationHours: (val: number) => void;
  solarPeakKW: number;
  setSolarPeakKW: (val: number) => void;
  enableDLM: boolean;
  setEnableDLM: (val: boolean) => void;
  enableSolarSurplus: boolean;
  setEnableSolarSurplus: (val: boolean) => void;
  onFileUpload: (file: File) => void;
  isLoadingFile?: boolean;
}

export default function DLMControlPanel({
  profileType,
  setProfileType,
  peakDemandKW,
  setPeakDemandKW,
  gridLimitKW,
  setGridLimitKW,
  chargerCount,
  setChargerCount,
  chargerUnitPowerKW,
  setChargerUnitPowerKW,
  chargeStartHour,
  setChargeStartHour,
  chargeDurationHours,
  setChargeDurationHours,
  solarPeakKW,
  setSolarPeakKW,
  enableDLM,
  setEnableDLM,
  enableSolarSurplus,
  setEnableSolarSurplus,
  onFileUpload,
  isLoadingFile
}: DLMControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#E45318]" />
            Parâmetros do Local & Simulação de Carga
          </h3>
          <p className="text-xs text-slate-400">
            Ajuste a capacidade do padrão, curva de consumo e parâmetros da frota em tempo real
          </p>
        </div>

        {/* Botão de Upload de Arquivo Real */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoadingFile}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200"
          >
            <Upload className="w-3.5 h-3.5 text-[#E45318]" />
            {isLoadingFile ? 'Processando Arquivo...' : 'Importar Memória de Massa (CSV)'}
          </button>
        </div>
      </div>

      {/* 1. Seleção de Perfil Típico Pré-Calibrado */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
          Perfil de Carga Típico da Edificação
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: 'condominio_residencial', label: 'Condomínio Residencial', desc: 'Pico noturno 18h-22h' },
            { id: 'edificio_comercial', label: 'Edifício Comercial', desc: 'Pico diurno 09h-17h' },
            { id: 'centro_comercial', label: 'Shopping / Varejo', desc: 'Pico estendido 14h-21h' },
            { id: 'industrial', label: 'Indústria / Turnos', desc: 'Carga contínua 24h' },
          ].map((p) => {
            const isSelected = profileType === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setProfileType(p.id as any)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#E45318] bg-orange-50/50 shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                }`}
              >
                <p className="text-xs font-bold text-slate-800">{p.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sliders e Controles de Potência */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Coluna 1: Capacidades da Edificação */}
        <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-[#0A192F]" /> Padrão da Edificação
          </h4>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-600">Demanda de Pico Atual:</span>
              <span className="text-slate-900">{peakDemandKW} kW</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={peakDemandKW}
              onChange={(e) => setPeakDemandKW(Number(e.target.value))}
              className="w-full accent-[#0A192F]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-600">Capacidade do Padrão:</span>
              <span className="text-red-600 font-black">{gridLimitKW} kW</span>
            </div>
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={gridLimitKW}
              onChange={(e) => setGridLimitKW(Number(e.target.value))}
              className="w-full accent-red-600"
            />
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Ex: 75 kW = Padrão C5 CEMIG / 100A trifásico em 380V ~ 65 kW
            </span>
          </div>
        </div>

        {/* Coluna 2: Carregadores e Horários */}
        <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <BatteryCharging className="w-4 h-4 text-[#E45318]" /> Frota de Carregadores VE
          </h4>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-600">Quantidade de Carregadores:</span>
              <span className="text-[#E45318]">{chargerCount} pontos</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={chargerCount}
              onChange={(e) => setChargerCount(Number(e.target.value))}
              className="w-full accent-[#E45318]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Potência por Ponto:
            </label>
            <select
              value={chargerUnitPowerKW}
              onChange={(e) => setChargerUnitPowerKW(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="3.7">3.7 kW (Portátil / 16A 220V)</option>
              <option value="7.4">7.4 kW (Wallbox Padrão / 32A 220V)</option>
              <option value="11.0">11.0 kW (Trifásico 16A 380V)</option>
              <option value="22.0">22.0 kW (Trifásico 32A 380V)</option>
              <option value="30.0">30.0 kW (DC Rápido)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">Início Recarga</span>
              <input
                type="number"
                min="0"
                max="23"
                value={chargeStartHour}
                onChange={(e) => setChargeStartHour(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">Duração (h)</span>
              <input
                type="number"
                min="1"
                max="16"
                value={chargeDurationHours}
                onChange={(e) => setChargeDurationHours(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Coluna 3: Inteligência DLM & Sinergia Solar */}
        <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#00B356]" /> Gestão Inteligente
            </h4>

            {/* Toggle DLM */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between mb-3 shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Ativar DLM (Smart Charging)</span>
                <span className="text-[10px] text-slate-500">Modula de 6A a 32A em tempo real</span>
              </div>
              <input
                type="checkbox"
                checked={enableDLM}
                onChange={(e) => setEnableDLM(e.target.checked)}
                className="w-5 h-5 accent-[#00B356] rounded cursor-pointer"
              />
            </div>

            {/* Toggle Solar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> Sinergia Solar Cordeiro
                </span>
                <span className="text-[10px] text-slate-500">Recarga com excedente solar diurno</span>
              </div>
              <input
                type="checkbox"
                checked={enableSolarSurplus}
                onChange={(e) => setEnableSolarSurplus(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {enableSolarSurplus && (
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-amber-700">Potência Solar Instalada:</span>
                <span className="text-amber-800">{solarPeakKW} kWp</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={solarPeakKW}
                onChange={(e) => setSolarPeakKW(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
