"use client";

import React from "react";
import { Shield, Zap, AlertTriangle } from "lucide-react";

interface VisualPanelModelProps {
  phases: 1 | 3;
  breakerAmperes: number;
  idrType: string;
  dpsType: string;
  hasEmergencyButton: boolean;
}

export default function VisualPanelModel({
  phases,
  breakerAmperes,
  idrType,
  dpsType,
  hasEmergencyButton,
}: VisualPanelModelProps) {
  // Determine widths and counts based on phases
  const poles = phases === 3 ? 4 : 2; // Trifásico + Neutro ou Monofásico/Bifásico + Neutro
  const dpsCount = phases === 3 ? 4 : 2;

  // Render a clean visual representation of the protective panel (QDC)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white font-['Montserrat',sans-serif]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Modelagem Visual do Quadro (QDC)
            </h4>
            <p className="text-[9px] text-slate-400 font-medium">
              Layout de componentes em Trilho DIN TS-35
            </p>
          </div>
        </div>
        <span className="text-[8px] font-black bg-slate-800 text-[#00BFA5] px-3 py-1 rounded-full uppercase tracking-wider">
          NBR 17019 / NBR 5410
        </span>
      </div>

      {/* Wiring diagram indicator */}
      <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-6">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-red-500 rounded"></span> Fase A (Vermelho)
          </span>
          {phases === 3 && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-black border border-slate-700 rounded"></span> Fase B (Preto)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-amber-700 rounded"></span> Fase C (Marrom)
              </span>
            </>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-blue-500 rounded"></span> Neutro (Azul)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-green-500 rounded"></span> Terra (Verde)
          </span>
        </div>
        {hasEmergencyButton && (
          <span className="text-red-400 flex items-center gap-1 font-black">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> Comando Remoto 24V/220V
          </span>
        )}
      </div>

      {/* Physical DIN Rail wrapper */}
      <div className="relative bg-[#1A1F2C] border-y-4 border-[#2D3345] rounded-lg p-6 py-10 flex gap-1 justify-center items-stretch shadow-inner overflow-x-auto min-h-[220px]">
        {/* DIN Rail metallic background bar */}
        <div className="absolute top-[40%] left-0 right-0 h-10 bg-gradient-to-b from-slate-600 via-slate-500 to-slate-700 shadow-sm pointer-events-none opacity-40 z-0"></div>

        {/* 1. DISJUNTOR GERAL */}
        <div className="relative z-10 bg-slate-100 border-2 border-slate-300 rounded-md text-slate-800 text-center font-bold px-2 py-4 flex flex-col justify-between shadow-lg shrink-0 min-w-[70px]">
          <div className="text-[7px] text-slate-400 uppercase font-black tracking-tighter">Geral</div>
          <div className="my-2 flex justify-center gap-0.5">
            {Array.from({ length: poles - 1 }).map((_, idx) => (
              <div key={idx} className="w-2 h-10 bg-slate-300 rounded border border-slate-400 flex items-center justify-center">
                <span className="text-[6px] text-slate-600 font-black">F</span>
              </div>
            ))}
            <div className="w-2.5 h-10 bg-blue-200 rounded border border-blue-300 flex items-center justify-center">
              <span className="text-[6px] text-blue-700 font-black">N</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-800 leading-none">DJ</div>
            <div className="text-[8px] font-black text-[#1E3A8A] leading-tight mt-0.5">{breakerAmperes}A</div>
            <div className="text-[6px] text-slate-500 uppercase leading-none font-bold mt-1">Curva C</div>
          </div>
        </div>

        {/* 2. BOBINA DE DISPARO MX (Shunt Trip) */}
        {hasEmergencyButton && (
          <div className="relative z-10 bg-red-100 border-2 border-red-300 rounded-md text-red-800 text-center font-bold px-1.5 py-4 flex flex-col justify-between shadow-lg shrink-0 min-w-[45px] animate-pulse">
            <div className="text-[6px] text-red-500 uppercase font-black tracking-tighter leading-none">Shunt</div>
            <div className="my-3 flex flex-col items-center">
              <div className="w-3 h-8 bg-red-300 rounded border border-red-400 flex items-center justify-center">
                <span className="text-[6px] text-red-700 font-black">MX</span>
              </div>
              {/* Mechanical link line */}
              <div className="w-8 h-[2px] bg-red-500 absolute top-[48%] right-[-10px] z-20"></div>
            </div>
            <div>
              <div className="text-[8px] font-black text-red-600 leading-none">Disparo</div>
              <div className="text-[5px] text-red-500 uppercase font-black leading-none mt-1">Remoto 5m</div>
            </div>
          </div>
        )}

        {/* 3. DISPOSITIVO IDR */}
        <div className="relative z-10 bg-slate-200 border-2 border-slate-300 rounded-md text-slate-800 text-center font-bold px-3 py-4 flex flex-col justify-between shadow-lg shrink-0 min-w-[80px]">
          <div className="text-[7px] text-slate-400 uppercase font-black tracking-tighter leading-none">Diferencial</div>
          
          <div className="my-2 flex items-center justify-around gap-1">
            {/* Test button 'T' */}
            <div className="w-4 h-4 rounded-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer shadow-sm text-[8px] font-black">
              T
            </div>
            <div className="w-3 h-8 bg-slate-300 rounded border border-slate-400 flex items-center justify-center">
              <span className="text-[5px] text-slate-600 font-black">30mA</span>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-black text-slate-800 leading-none">IDR</div>
            <div className="text-[7px] font-black text-[#00BFA5] leading-tight mt-0.5">
              {phases === 3 || breakerAmperes >= 40 ? "40A / Tipo A" : "25A / Tipo A"}
            </div>
            <div className="text-[5px] text-slate-500 leading-none font-bold mt-1">NBR 17019 EV</div>
          </div>
        </div>

        {/* 4. DISPOSITIVO DPS */}
        <div className="relative z-10 bg-orange-50 border-2 border-orange-200 rounded-md text-slate-800 text-center font-bold px-2 py-4 flex flex-col justify-between shadow-lg shrink-0 min-w-[80px]">
          <div className="text-[7px] text-orange-600 uppercase font-black tracking-tighter leading-none">Surto</div>
          <div className="my-2 flex justify-center gap-0.5">
            {Array.from({ length: dpsCount }).map((_, idx) => (
              <div key={idx} className="w-2.5 h-10 bg-orange-600 rounded border border-orange-700 flex flex-col justify-between p-0.5 relative">
                {/* Health visual flag */}
                <div className="w-1.5 h-1.5 bg-green-500 rounded-xs mx-auto border border-green-600"></div>
                <div className="text-[4px] text-white font-black leading-none uppercase rotate-90 my-1">
                  275V
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[9px] font-black text-orange-700 leading-none">DPS</div>
            <div className="text-[7px] font-black text-orange-600 leading-tight mt-0.5">Classe II</div>
            <div className="text-[5px] text-slate-500 leading-none font-bold mt-1">20kA / 45kA</div>
          </div>
        </div>
      </div>

      {/* Schematic Footnotes */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-slate-400 font-medium leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
        <div>
          <span className="text-orange-500 font-bold block mb-1">Proteções NBR 17019/5410:</span>
          O QDC modelado deve ser instalado o mais próximo possível do carregador (limite de 10m). A isolação dos cabos deve ser termofixa (HEPR ou XLPE) com condutividade corrigida pela temperatura de regime (70°C).
        </div>
        <div>
          <span className="text-red-400 font-bold block mb-1">Desligamento Remoto (AVCB):</span>
          {hasEmergencyButton ? (
            <span className="flex items-start gap-1">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>
                Bobina de disparo MX acoplada eletromecanicamente ao disjuntor geral. Ao acionar o botão de emergência "cogumelo" (a 5 metros de distância), o disjuntor geral é desarmado instantaneamente cortando a tensão de todo o painel.
              </span>
            </span>
          ) : (
            "Não configurado com bobina de disparo. Recomendado adicionar para garagens fechadas ou comerciais conforme IT 41."
          )}
        </div>
      </div>
    </div>
  );
}
