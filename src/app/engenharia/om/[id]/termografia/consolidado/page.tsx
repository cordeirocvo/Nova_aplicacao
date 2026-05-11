"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function ConsolidadoContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const usinaId = params?.id as string;
  const ids = searchParams?.get("ids")?.split(",") || [];
  
  const [usina, setUsina] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUsina = await fetch(`/api/engenharia/om/usinas?id=${usinaId}`);
        setUsina(await resUsina.json());

        // Buscar todos os laudos em paralelo
        const reportPromises = ids.map(id => 
          fetch(`/api/engenharia/om/termografia?id=${id}`).then(res => res.json())
        );
        const reportsData = await Promise.all(reportPromises);
        
        // Filtrar laudos válidos antes de ordenar
        const validReports = reportsData.filter(r => r && r.dataInspecao && !r.error);
        
        setReports(validReports.sort((a, b) => 
          new Date(a.dataInspecao).getTime() - new Date(b.dataInspecao).getTime()
        ));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (usinaId && ids.length > 0) fetchData();
  }, [usinaId, ids.length]);

  if (loading) return <div className="p-12 text-center font-black uppercase text-slate-400 tracking-widest animate-pulse">Gerando Relatório Consolidado...</div>;
  if (!usina || reports.length === 0) return <div className="p-12 text-center text-red-500">Dados não encontrados.</div>;

  // Função auxiliar para formatar data de forma segura
  const safeFormat = (dateStr: any, fmt: string, options?: any) => {
    try {
      if (!dateStr) return "N/A";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Data Inválida";
      return format(d, fmt, options);
    } catch (err) {
      return "Erro Data";
    }
  };

  // Agrupar itens por data para os sumários
  const reportsByDate = reports.filter(r => r && r.dataInspecao).reduce((acc: any, report: any) => {
    const date = report.dataInspecao.split('T')[0]; // Pega apenas a parte da data YYYY-MM-DD
    if (!acc[date]) acc[date] = [];
    acc[date].push(report);
    return acc;
  }, {});

  const totalPoints = reports.reduce((acc: number, r: any) => acc + (r.itens?.length || 0), 0);
  const criticalPoints = reports.reduce((acc: number, r: any) => acc + (r.itens?.filter((i:any) => i.severidade === 'Crítica').length || 0), 0);

  return (
    <div className="bg-[#F8F9FA] min-h-screen py-12 px-4 print:p-0 print:bg-white font-['Montserrat',sans-serif]">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      
      <button 
        onClick={() => window.print()} 
        className="fixed top-8 right-8 bg-slate-800 text-white px-8 py-4 rounded-full font-black shadow-2xl hover:scale-105 transition-all z-50 flex items-center gap-3 print:hidden border-none cursor-pointer uppercase text-xs tracking-widest"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        IMPRIMIR RELATÓRIO COMPLETO
      </button>

      <div className="max-w-[210mm] mx-auto bg-white p-[15mm] shadow-[0_20px_50px_rgba(0,0,0,0.1)] print:shadow-none print:p-0 overflow-hidden relative" id="printable-area">
        
        {/* PÁGINA 1 - CAPA CONSOLIDADA */}
        <div className="min-h-[265mm] flex flex-col justify-between pb-20">
          <div className="flex justify-between items-start">
            <div className="space-y-6">
              <img src="/logo.png" alt="Cordeiro" className="h-20 object-contain" />
              <div>
                <h1 className="text-[#EB5E28] text-5xl font-[900] uppercase leading-none tracking-tighter">Relatório</h1>
                <h1 className="text-[#212529] text-5xl font-[900] uppercase leading-none tracking-tighter">Consolidado</h1>
                <p className="text-[12px] font-black text-slate-400 mt-4 tracking-[0.4em] uppercase">Inspeção Termográfica Infravermelha</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-[#EB5E28] text-white px-8 py-4 rounded-3xl inline-block mb-4 shadow-xl shadow-orange-100">
                <span className="text-[10px] font-bold uppercase block opacity-60 tracking-widest">Protocolo</span>
                <span className="text-2xl font-[900] tracking-tighter">CONS-{usina.id.substring(0, 6).toUpperCase()}</span>
              </div>
              <p className="text-sm font-black text-[#212529] uppercase tracking-widest">Gerado em {safeFormat(new Date(), "dd/MM/yyyy")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 bg-slate-50 p-12 rounded-[4rem] border border-slate-100">
            <div>
              <span className="text-[10px] font-black text-[#EB5E28] uppercase block mb-2 tracking-widest">Unidade Geradora</span>
              <h2 className="text-3xl font-[900] text-[#212529] uppercase tracking-tighter">{usina.nome}</h2>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase">{usina.projeto?.cliente || "Cliente Particular"}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Total de Inspeções</span>
                <span className="text-2xl font-[900] text-[#212529]">{reports.length}</span>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Pontos Críticos</span>
                <span className="text-2xl font-[900] text-red-600">{criticalPoints}</span>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Total Analisado</span>
                <span className="text-2xl font-[900] text-slate-800">{totalPoints}</span>
              </div>
              <div className="bg-[#212529] p-6 rounded-[2rem] shadow-xl">
                <span className="text-[8px] font-black text-white/50 uppercase block mb-1">Status Global</span>
                <span className="text-xs font-black text-white uppercase">{criticalPoints > 0 ? "Ação Requerida" : "Operação Normal"}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-12 rounded-[4rem] text-white">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-6 text-[#EB5E28]">Parecer Consolidado</h3>
            <p className="text-xs leading-relaxed text-slate-300 text-justify font-medium text-justify">
              Este documento consolida {reports.length} laudos técnicos de inspeção termográfica realizados na planta {usina.nome}. 
              Foram analisados {totalPoints} pontos de medição em diferentes datas. Os pontos identificados com severidade "Crítica" 
              devem receber intervenção imediata para evitar falhas catastróficas ou perda de geração. 
              As recomendações técnicas detalhadas encontram-se nas fichas individuais após os sumários por data.
            </p>
          </div>
        </div>

        {/* PÁGINAS DE SUMÁRIO POR DATA */}
        {Object.entries(reportsByDate).map(([date, dateReports]: [string, any], dIdx) => (
          <div key={date} className="print:break-before-page min-h-[265mm] pt-10 flex flex-col">
            <div className="flex justify-between items-end mb-10 border-b-4 border-[#212529] pb-6">
              <div>
                <h2 className="text-[10px] font-black text-[#EB5E28] uppercase tracking-[0.4em]">Sumário Executivo por Data</h2>
                <h3 className="text-4xl font-[900] text-[#212529] uppercase tracking-tighter mt-2">
                  {safeFormat(date.includes('T') ? date : date + "T12:00:00", "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
              </div>
              <div className="text-right text-[10px] font-black text-slate-400 uppercase">
                Página {dIdx + 2} de {Object.keys(reportsByDate).length + totalPoints + 1}
              </div>
            </div>

            <div className="flex-1">
              <table className="w-full text-[11px] border-collapse rounded-[2.5rem] overflow-hidden border border-slate-100 bg-white">
                <thead className="bg-[#212529] text-white">
                  <tr>
                    <th className="p-6 text-left uppercase tracking-widest font-black">Equipamento / TAG</th>
                    <th className="p-6 text-left uppercase tracking-widest font-black">Localização</th>
                    <th className="p-6 text-center uppercase tracking-widest font-black">Delta T</th>
                    <th className="p-6 text-center uppercase tracking-widest font-black">Severidade</th>
                  </tr>
                </thead>
                <tbody>
                  {dateReports.flatMap((r: any) => r.itens || []).map((item: any, iIdx: number) => (
                    <tr key={iIdx} className={`${iIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-50`}>
                      <td className="p-6 font-black text-slate-800 uppercase">{item.tipoEquipamento} - {item.tag}</td>
                      <td className="p-6 text-slate-500 uppercase font-bold">{item.localizacao || "Geral"}</td>
                      <td className="p-6 text-center font-[900] text-[#EB5E28]">Δ {item.deltaT}°C</td>
                      <td className="p-6 text-center">
                        <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase ${
                          item.severidade === 'Crítica' ? 'bg-red-600 text-white' : 
                          item.severidade === 'Observação' ? 'bg-orange-500 text-white' : 
                          'bg-emerald-600 text-white'
                        }`}>
                          {item.severidade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 p-8 bg-[#F8F9FA] rounded-[3rem] border border-slate-100 flex justify-between items-center">
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Pontos na Data</p>
                  <p className="text-xl font-[900] text-slate-800">{dateReports.reduce((a:any, r:any) => a + (r.itens?.length || 0), 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Críticos</p>
                  <p className="text-xl font-[900] text-red-600">{dateReports.reduce((a:any, r:any) => a + (r.itens?.filter((i:any) => i.severidade === 'Crítica').length || 0), 0)}</p>
                </div>
              </div>
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                {usina.nome} • Inspeção {date}
              </div>
            </div>
          </div>
        ))}

        {/* FICHAS INDIVIDUAIS - UMA POR PÁGINA */}
        {reports.flatMap(r => (r.itens || []).map((item: any) => ({ ...item, reportDate: r.dataInspecao }))).map((item: any, idx: number) => (
          <div key={`item-${idx}`} className="print:break-before-page min-h-[265mm] pt-10 flex flex-col">
            <div className="flex justify-between items-end mb-8 border-b-2 border-slate-100 pb-4">
              <div>
                <h2 className="text-[10px] font-black text-[#EB5E28] uppercase tracking-[0.3em]">Ficha de Recomendação Técnica</h2>
                <h3 className="text-3xl font-[900] text-[#212529] uppercase tracking-tighter mt-1">{item.tipoEquipamento} {item.tag}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Data da Inspeção: {safeFormat(item.reportDate.includes('T') ? item.reportDate : item.reportDate + "T12:00:00", "dd/MM/yyyy")}</p>
              </div>
              <div className={`px-6 py-2 rounded-2xl font-black text-xs uppercase ${
                item.severidade === 'Crítica' ? 'bg-red-100 text-red-600' : 
                item.severidade === 'Observação' ? 'bg-orange-100 text-orange-600' : 
                'bg-emerald-100 text-emerald-600'
              }`}>
                STATUS: {item.severidade}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="h-[320px] rounded-[3rem] overflow-hidden border-4 border-[#212529] shadow-2xl bg-slate-50">
                  {item.imagemTermicaUrl ? (
                    <img src={item.imagemTermicaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-[10px] uppercase">Sem Termograma</div>
                  )}
                </div>
                <div className="bg-[#212529] text-white py-2 px-8 rounded-full inline-block text-[11px] font-black uppercase tracking-widest">
                  Termograma
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-[320px] rounded-[3rem] overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50">
                  {item.imagemVisualUrl ? (
                    <img src={item.imagemVisualUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-[10px] uppercase">Sem Foto Visual</div>
                  )}
                </div>
                <div className="bg-slate-100 text-slate-500 py-2 px-8 rounded-full inline-block text-[11px] font-black uppercase tracking-widest">
                  Foto Visual
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-[#F8F9FA] p-8 rounded-[2.5rem] border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Temperatura Máx.</p>
                <p className="text-3xl font-[900] text-[#EB5E28]">{item.temperaturaMedida}°C</p>
              </div>
              <div className="bg-[#F8F9FA] p-8 rounded-[2.5rem] border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Temperatura Ref.</p>
                <p className="text-3xl font-[900] text-slate-600">{item.temperaturaReferencia}°C</p>
              </div>
              <div className="bg-[#212529] p-8 rounded-[2.5rem] shadow-xl text-center">
                <p className="text-[10px] font-black text-white/50 uppercase mb-1">Elevação (Delta T)</p>
                <p className="text-3xl font-[900] text-white">Δ {item.deltaT}°C</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-orange-50/50 p-10 rounded-[3rem] border border-orange-100 relative overflow-hidden">
                <h4 className="text-[11px] font-black text-[#EB5E28] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">Causa Provável</h4>
                <p className="text-[13px] font-bold text-[#212529] leading-relaxed uppercase">{item.causaProvavel || "NÃO IDENTIFICADA."}</p>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#EB5E28]"></div>
              </div>
              <div className="bg-emerald-50/50 p-10 rounded-[3rem] border border-emerald-100 relative overflow-hidden">
                <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">Recomendação</h4>
                <p className="text-[13px] font-black text-[#212529] leading-relaxed uppercase">{item.recomendacao || "MANUTENÇÃO PREVENTIVA."}</p>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-600"></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-widest pt-8">
               <span>PONTO {idx + 1} DE {totalPoints}</span>
               <span>{usina.nome}</span>
            </div>
          </div>
        ))}

        {/* ASSINATURAS FINAL - Página Final */}
        <div className="print:break-before-page min-h-[265mm] pt-20 flex flex-col">
          <div className="flex-1 flex flex-col justify-center gap-32">
            <div className="grid grid-cols-2 gap-40">
              <div className="text-center">
                <div className="h-[2px] w-full bg-slate-200 mb-6"></div>
                <p className="text-sm font-black uppercase text-[#212529]">Engenharia Responsável</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Cordeiro Energia</p>
              </div>
              <div className="text-center">
                <div className="h-[2px] w-full bg-slate-200 mb-6"></div>
                <p className="text-sm font-black uppercase text-[#212529]">Representante do Cliente</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{usina.projeto?.cliente || "Contratante"}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center opacity-30 mt-auto pt-20 border-t border-slate-100">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">Relatório Gerado via Cordeiro SaaS • Operação & Manutenção</p>
            <img src="/logo.png" alt="Logo" className="h-4 grayscale brightness-0" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background-color: white; -webkit-print-color-adjust: exact; }
          #printable-area { width: 210mm; margin: 0; padding: 15mm; box-shadow: none; }
          .bg-[#F8F9FA] { background-color: #F8F9FA !important; }
          .bg-[#212529] { background-color: #212529 !important; }
          .bg-[#EB5E28] { background-color: #EB5E28 !important; }
          .bg-slate-900 { background-color: #0f172a !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .text-white { color: white !important; }
          .text-red-600 { color: #dc2626 !important; }
          .bg-red-600 { background-color: #dc2626 !important; }
          .bg-orange-500 { background-color: #f97316 !important; }
          .bg-emerald-600 { background-color: #059669 !important; }
        }
      `}</style>
    </div>
  );
}

export default function TermografiaConsolidado() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Carregando...</div>}>
      <ConsolidadoContent />
    </Suspense>
  );
}
