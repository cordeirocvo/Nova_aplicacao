"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Edit2, ShieldAlert } from "lucide-react";
import { TagToggler } from "./TagToggler";

export default function AtividadesClientView({ atividades, settings, isAdmin, isTV }: any) {
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10); 

  useEffect(() => {
    const calcRows = () => {
      if (!isTV) {
        setItemsPerPage(atividades.length); 
        return;
      }
      
      const headerSpace = 250; 
      const avHeight = window.innerHeight - headerSpace;
      const rowHeight = 65; 
      let rows = Math.floor(avHeight / rowHeight);
      if (rows < 3) rows = 3; 
      
      setItemsPerPage(rows);
    };

    calcRows();
    window.addEventListener('resize', calcRows);
    return () => window.removeEventListener('resize', calcRows);
  }, [isTV, atividades.length]);

  useEffect(() => {
    if (!isTV || atividades.length <= itemsPerPage) return;
    
    const interval = setInterval(() => {
      setCurrentPage((prev) => {
        const totalPages = Math.ceil(atividades.length / itemsPerPage);
        return (prev + 1) % totalPages;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isTV, atividades.length, itemsPerPage]);

  const currentSlice = isTV 
     ? atividades.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage) 
     : atividades;

  const totalPages = Math.ceil(atividades.length / itemsPerPage);

  if (atividades.length === 0) {
    return (
       <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200 mt-4">
          <p className="text-slate-500 font-medium italic">Nenhuma atividade registrada no sistema.</p>
       </div>
    );
  }

  return (
    <>
      {/* Table Desktop / TV View */}
      <div className={`${isTV ? 'block' : 'hidden lg:block'} bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative`}>
        <table className="w-full text-[13px] text-left table-fixed">
          <thead className="text-[11px] text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="w-1/4 px-3 py-3 font-bold tracking-wider">Cliente / Instalação</th>
              <th className="w-[100px] px-3 py-3 font-bold tracking-wider">Atraso</th>
              <th className="px-3 py-3 font-bold tracking-wider">Observações</th>
              <th className="w-[120px] px-3 py-3 font-bold tracking-wider">Venc. Parecer</th>
              <th className="w-[120px] px-3 py-3 font-bold tracking-wider">Prev. Instala</th>
              <th className="w-[110px] px-3 py-3 font-bold tracking-wider">Status</th>
              {!isTV && <th className="w-[80px] px-3 py-3 font-bold tracking-wider text-right">Ação</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentSlice.map((atv: any) => {
              const isUrgentParecer = atv.daysParecer !== null && atv.daysParecer < settings.limiteParecer;
              
              let bgColorCss = "hover:bg-slate-50 transition-colors h-[65px]";
              let diaPrevRender = "-";
              let inlineStyle = {};
              let fontColor = "text-slate-600";
              
              if (atv.daysPrev !== null) {
                 if (atv.daysPrev >= settings.limiteVerde) {
                    bgColorCss = "bg-green-100 text-green-900 h-[65px]";
                    if (isTV) inlineStyle = { backgroundColor: '#dcfce7', color: '#14532d' };
                 } else if (atv.daysPrev >= settings.limiteAmarelo) {
                    bgColorCss = "bg-yellow-100 text-yellow-900 h-[65px]";
                    if (isTV) inlineStyle = { backgroundColor: '#fef9c3', color: '#713f12' };
                 } else {
                    bgColorCss = "bg-red-100 text-red-900 h-[65px]";
                    if (isTV) inlineStyle = { backgroundColor: '#fee2e2', color: '#7f1d1d' };
                 }
                 diaPrevRender = `${atv.daysPrev} dias`;
              }

              if (atv.prioridade) {
                 bgColorCss = "bg-purple-600 text-white font-medium shadow-md z-20 relative h-[65px]";
                 if (isTV) {
                    bgColorCss = "bg-purple-600 text-white font-medium h-[65px] animate-pulse";
                    inlineStyle = { backgroundColor: '#9333ea', color: '#ffffff' };
                 }
                 fontColor = "text-white";
              } else if (atv.atividadeExtra) {
                 bgColorCss = "bg-[#1E3A8A] text-white font-medium shadow-md z-15 relative h-[65px]";
                 if (isTV) inlineStyle = { backgroundColor: '#1E3A8A', color: '#ffffff' };
                 fontColor = "text-white";
              } else if (isUrgentParecer) {
                 bgColorCss = "bg-red-600 text-white font-medium shadow-md z-10 relative h-[65px] animate-pulse";
                 if (isTV) inlineStyle = { backgroundColor: '#dc2626', color: '#ffffff' };
                 fontColor = "text-white";
              }

              return (
                <tr key={atv.id} className={bgColorCss} style={inlineStyle}>
                  <td className="px-3 py-3 font-bold leading-tight break-words">
                    {isUrgentParecer && <ShieldAlert className="inline-block w-4 h-4 mr-1 mb-0.5 text-red-200" />}
                    <span className="text-sm">{atv.instalacao || "N/A"}</span>
                    <TagToggler id={atv.id} prioridade={atv.prioridade} atividadeExtra={atv.atividadeExtra} isAdmin={!!isAdmin} />
                  </td>
                  <td className="px-3 py-3 font-black text-xs">
                    {diaPrevRender}
                  </td>
                  <td className={`px-3 py-3 text-[12px] leading-tight line-clamp-2 ${fontColor}`} title={atv.obsInstalacao || ""}>
                    {atv.obsInstalacao || "-"}
                  </td>
                  <td className={`px-3 py-3 font-medium whitespace-nowrap ${fontColor}`}>
                    {atv.vencimentoParecer || "-"}
                  </td>
                  <td className={`px-3 py-3 font-medium whitespace-nowrap ${fontColor}`}>
                    {atv.automaticoPrevInstala || "-"}
                  </td>
                  <td className="px-3 py-3">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter ${ (isUrgentParecer || atv.prioridade || atv.atividadeExtra) ? 'bg-white/20 text-white' : 'bg-[#0A192F]/5 text-[#0A192F]'}`}>
                        {atv.status || "Pendente"}
                     </span>
                  </td>
                  {!isTV && (
                    <td className="px-3 py-3 text-right">
                      {isAdmin ? (
                        <Link 
                          href={`/atividades/editar/${atv.id}`}
                          className={`inline-flex items-center p-1.5 rounded-lg transition-all ${isUrgentParecer ? 'bg-white text-red-700 hover:bg-white/90' : 'text-[#00BFA5] hover:bg-[#00BFA5]/10'}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="text-[10px] opacity-50">Admin Only</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Rodapé de Paginação da TV */}
        {isTV && totalPages > 1 && (
          <div className="bg-slate-100 px-4 py-2 text-center border-t border-slate-200 flex justify-center items-center">
             <div className="flex">
               {Array.from({ length: totalPages }).map((_, i) => (
                 <div key={i} className={`h-2 w-2 rounded-full transition-all mr-1 ${currentPage === i ? 'bg-[#00BFA5] scale-125' : 'bg-slate-300'}`} />
               ))}
             </div>
             <span className="text-xs font-bold text-slate-500 ml-3">Página {currentPage + 1} de {totalPages}</span>
          </div>
        )}
      </div>

      {/* Mobile Card View (and Tablet/Laptop) */}
      <div className={`${isTV ? 'hidden' : 'lg:hidden'} grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4`}>
        {currentSlice.map((atv: any) => {
          const isUrgentParecer = atv.daysParecer !== null && atv.daysParecer < settings.limiteParecer;
          let urgencyColor = "border-slate-100 bg-white";
          
          if (atv.daysPrev !== null) {
             if (atv.daysPrev >= settings.limiteVerde) urgencyColor = "border-green-200 bg-green-50";
             else if (atv.daysPrev >= settings.limiteAmarelo) urgencyColor = "border-yellow-200 bg-yellow-50";
             else urgencyColor = "border-red-200 bg-red-50";
          }
          if (isUrgentParecer) urgencyColor = "bg-red-600 border-red-800 text-white";
          if (atv.atividadeExtra) urgencyColor = "bg-[#1E3A8A] border-[#152e75] text-white";
          if (atv.prioridade) urgencyColor = "animate-[pulse_2s_infinite] bg-purple-600 border-purple-800 text-white";

          return (
            <div key={atv.id} className={`p-4 rounded-xl border-2 shadow-sm relative ${urgencyColor}`}>
              {isUrgentParecer && <ShieldAlert className="absolute top-2 right-2 w-5 h-5 text-white animate-bounce" />}
              <div className="flex justify-between items-start mb-2">
                <div className="w-2/3">
                  <h3 className="font-bold text-lg leading-tight">{atv.instalacao}</h3>
                  <TagToggler id={atv.id} prioridade={atv.prioridade} atividadeExtra={atv.atividadeExtra} isAdmin={!!isAdmin} />
                </div>
                <span className="text-xs font-black px-2 py-1 bg-black/5 rounded uppercase tracking-widest">{atv.status || "Pendente"}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 border-t border-black/5 pt-3">
                <div>
                  <p className="text-[10px] opacity-70 uppercase font-bold">Venc. Parecer</p>
                  <p className="font-semibold">{atv.vencimentoParecer || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] opacity-70 uppercase font-bold">Prev. Instala</p>
                  <p className="font-semibold">{atv.automaticoPrevInstala || "-"}</p>
                </div>
                <div className="col-span-2">
                   <p className="text-[10px] opacity-70 uppercase font-bold">Atraso Semáforo</p>
                   <p className="font-black text-[#1E3A8A]">{atv.daysPrev !== null ? `${atv.daysPrev} dias` : "-"}</p>
                </div>
              </div>

              {!isTV && isAdmin && (
                <Link 
                  href={`/atividades/editar/${atv.id}`}
                  className="mt-4 w-full flex items-center justify-center py-2 bg-[#00BFA5] text-white rounded-lg font-bold text-sm shadow-md"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Editar Atividade
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
