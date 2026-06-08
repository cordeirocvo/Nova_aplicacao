"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, FileText, Edit, ShieldAlert, Download
} from "lucide-react";
import Link from "next/link";
import { TagToggler } from "../TagToggler";

export default function GronnerTestView({
  initialGoogleRecords,
  settings,
}: {
  initialGoogleRecords: any[];
  initialGronnerRecords: any[];
  settings: { limiteVerde: number; limiteAmarelo: number; limiteParecer: number };
}) {
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/atividades" 
              className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-3 h-3 mr-1" /> Voltar
            </Link>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Ambiente de Testes</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1E3A8A] tracking-tight">
            Planilha de Testes
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Visualize e configure os testes de formatação condicional, prioridades e atividades adicionais.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div 
          className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all duration-300 ${
            actionMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">{actionMessage.text}</span>
          </div>
          <button 
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 font-bold ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1E3A8A] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00BFA5]" />
            Planilha Google &amp; Atividades Adicionais (Produção)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualização direta de todos os registros (sincronizados da planilha ou inseridos manualmente no acompanhamento).
          </p>
        </div>

        {initialGoogleRecords.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200 text-xs text-slate-500 italic">
            Nenhum registro encontrado no banco de produção.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left" style={{ tableLayout: 'fixed' }}>
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3 w-[100px]" style={{ width: '100px' }}>Origem / ID</th>
                  <th className="px-4 py-3 w-1/4" style={{ width: '22%' }}>Cliente / Instalação</th>
                  <th className="px-4 py-3 w-[110px]" style={{ width: '110px' }}>Dias para Montar</th>
                  <th className="px-4 py-3" style={{ width: '18%' }}>Observações</th>
                  <th className="px-4 py-3" style={{ width: '18%' }}>Histórico</th>
                  <th className="px-4 py-3 w-[110px]" style={{ width: '110px' }}>Venc. Parecer</th>
                  <th className="px-4 py-3 w-[110px]" style={{ width: '110px' }}>Prev. Instala</th>
                  <th className="px-4 py-3 w-[95px]" style={{ width: '95px' }}>Status</th>
                  <th className="px-4 py-3 w-[75px] text-right" style={{ width: '75px' }}>Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialGoogleRecords.map((rec) => {
                  const isUrgentParecer = rec.daysParecer !== null && rec.daysParecer <= settings.limiteParecer;
                  
                  let bgColorCss = "hover:bg-slate-50 transition-colors h-[65px]";
                  let diaPrevRender = "-";
                  let fontColor = "text-slate-600";
                  
                  if (rec.daysPrev !== null) {
                     if (rec.daysPrev >= settings.limiteVerde) {
                        bgColorCss = "bg-green-100 text-green-900 h-[65px]";
                        fontColor = "text-green-800";
                     } else if (rec.daysPrev >= settings.limiteAmarelo) {
                        bgColorCss = "bg-yellow-100 text-yellow-900 h-[65px]";
                        fontColor = "text-yellow-850";
                     } else {
                        bgColorCss = "bg-red-100 text-red-900 h-[65px]";
                        fontColor = "text-red-800";
                     }
                     diaPrevRender = `${rec.daysPrev} dias`;
                  }

                  if (rec.prioridade) {
                     bgColorCss = "bg-purple-600 text-white font-medium shadow-md h-[65px]";
                     fontColor = "text-white";
                  } else if (rec.atividadeExtra) {
                     bgColorCss = "bg-[#1E3A8A] text-white font-medium shadow-md h-[65px]";
                     fontColor = "text-white";
                  } else if (isUrgentParecer) {
                     bgColorCss = "bg-red-600 text-white font-medium shadow-md h-[65px] animate-pulse";
                     fontColor = "text-white";
                  }

                  return (
                    <tr key={rec.id} className={bgColorCss}>
                      <td className="px-4 py-3 font-bold">
                        {rec.idInterno ? (
                          <span>#{rec.idInterno}</span>
                        ) : (
                          <span className={rec.prioridade || rec.atividadeExtra || isUrgentParecer 
                            ? "text-purple-200 bg-white/10 text-[9px] font-bold px-1.5 py-0.5 rounded" 
                            : "text-purple-600 bg-purple-50 text-[9px] font-bold px-1.5 py-0.5 rounded"
                          }>
                            Adicional
                          </span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3 font-bold leading-tight break-words">
                        {isUrgentParecer && <ShieldAlert className="inline-block w-4 h-4 mr-1 mb-0.5 text-red-200" />}
                        <span className="text-sm">{rec.instalacao || "N/A"}</span>
                        {((rec.anexoFotos && rec.anexoFotos.length > 0) || (rec.anexoArquivos && rec.anexoArquivos.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {rec.anexoFotos?.map((url: string, idx: number) => (
                              <button
                                type="button"
                                key={`foto-${idx}`}
                                onClick={(e) => { e.stopPropagation(); downloadFile(url, `foto-${idx + 1}-${rec.instalacao || 'anexo'}.jpg`); }}
                                className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                  (rec.prioridade || rec.atividadeExtra || isUrgentParecer)
                                    ? 'bg-white/20 hover:bg-white/30 border-white/25 text-white'
                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                                title="Baixar Foto"
                              >
                                <Download className="w-2.5 h-2.5" /> Foto {idx + 1}
                              </button>
                            ))}
                            {rec.anexoArquivos?.map((url: string, idx: number) => {
                              const filename = url.split('/').pop() || `arq-${idx + 1}`;
                              return (
                                <button
                                  type="button"
                                  key={`arq-${idx}`}
                                  onClick={(e) => { e.stopPropagation(); downloadFile(url, `${rec.instalacao || 'anexo'}-${filename}`); }}
                                  className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                    (rec.prioridade || rec.atividadeExtra || isUrgentParecer)
                                      ? 'bg-white/20 hover:bg-white/30 border-white/25 text-white'
                                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                  }`}
                                  title={`Baixar ${filename}`}
                                >
                                  <Download className="w-2.5 h-2.5" /> {filename.length > 12 ? filename.substring(0, 10) + '...' : filename}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <TagToggler id={rec.id} prioridade={rec.prioridade} atividadeExtra={rec.atividadeExtra} isAdmin={true} light={rec.prioridade || rec.atividadeExtra || isUrgentParecer} />
                      </td>

                      <td className="px-4 py-3 font-black text-xs">
                        {diaPrevRender}
                      </td>

                      <td className={`px-4 py-3 text-[12px] leading-tight line-clamp-2 ${fontColor}`} title={rec.obsInstalacao || rec.observacao || ""}>
                        {rec.obsInstalacao || rec.observacao || "-"}
                      </td>
                      
                      <td className={`px-4 py-2 text-[11px] leading-tight ${fontColor}`}>
                        {Array.isArray(rec.historico) && rec.historico.length > 0 ? (
                          <div className="space-y-1 max-h-[55px] overflow-y-auto custom-scrollbar pr-1">
                            {(rec.historico as any[]).map((h: any, idx: number) => (
                              <div key={idx} className="whitespace-normal break-words">
                                <span className="font-bold opacity-75">{h.date}:</span> {h.action}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="opacity-60 italic">-</span>
                        )}
                      </td>

                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${fontColor}`}>
                        {rec.vencimentoParecer || "-"}
                      </td>

                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${fontColor}`}>
                        {rec.automaticoPrevInstala || rec.dataPrevista || "-"}
                      </td>

                      <td className="px-4 py-3">
                         <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter ${ (isUrgentParecer || rec.prioridade || rec.atividadeExtra) ? 'bg-white/20 text-white' : 'bg-[#0A192F]/5 text-[#0A192F]'}`}>
                            {rec.status || "Pendente"}
                         </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link 
                          href={`/atividades/editar/${rec.id}`}
                          className={`inline-flex items-center p-1.5 rounded-lg transition-all ${
                            (isUrgentParecer || rec.prioridade || rec.atividadeExtra) 
                              ? 'bg-white text-slate-800 hover:bg-white/95 shadow-sm' 
                              : 'text-[#00BFA5] hover:bg-[#00BFA5]/10'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
