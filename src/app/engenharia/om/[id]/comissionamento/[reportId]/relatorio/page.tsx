"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ComissionamentoRelatorio() {
  const params = useParams();
  const id = params?.id as string;
  const reportId = params?.reportId as string;
  
  const [usina, setUsina] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUsina = await fetch(`/api/engenharia/om/usinas?id=${id}`);
        setUsina(await resUsina.json());

        const resReport = await fetch(`/api/engenharia/om/comissionamento?id=${reportId}`);
        const data = await resReport.json();
        setReport(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id && reportId) fetchData();
  }, [id, reportId]);

  if (loading) return <div className="p-12 text-center">Gerando relatório...</div>;
  if (!usina || !report) return <div className="p-12 text-center text-red-500">Dados não encontrados.</div>;

  return (
    <div className="bg-[#F8F9FA] min-h-screen py-12 px-4 print:p-0 print:bg-white font-['Montserrat',sans-serif]">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      
      <button 
        onClick={() => window.print()} 
        className="fixed top-8 right-8 bg-[#EB5E28] text-white px-8 py-4 rounded-full font-black shadow-2xl hover:scale-105 transition-all z-50 flex items-center gap-3 print:hidden border-none cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        IMPRIMIR RELATÓRIO
      </button>

      <div className="max-w-[210mm] mx-auto bg-white p-[15mm] shadow-[0_20px_50px_rgba(0,0,0,0.1)] print:shadow-none print:p-0 overflow-hidden relative" id="printable-area">
        {/* Modern Header */}
        <div className="flex justify-between items-start mb-12 relative z-10">
          <div className="space-y-4">
            <img src="/logo.png" alt="Cordeiro" className="h-16 object-contain" />
            <div>
              <h1 className="text-[#EB5E28] text-3xl font-[900] uppercase leading-none tracking-tighter">Relatório de</h1>
              <h1 className="text-[#212529] text-3xl font-[900] uppercase leading-none tracking-tighter">Comissionamento</h1>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-[#212529] text-white px-6 py-2 rounded-2xl inline-block mb-2">
              <span className="text-[10px] font-bold uppercase block opacity-70">Protocolo Nº</span>
              <span className="text-lg font-black">{report.numero || "001"}</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(report.data), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR })}</p>
          </div>
        </div>

        {/* Project Info Strip */}
        <div className="grid grid-cols-3 gap-1 bg-[#F8F9FA] rounded-3xl p-6 mb-10 border border-slate-100">
          <div>
            <span className="text-[9px] font-black text-[#EB5E28] uppercase block mb-1">Usina Fotovoltaica</span>
            <span className="text-sm font-black text-[#212529] uppercase">{usina.nome}</span>
          </div>
          <div>
            <span className="text-[9px] font-black text-[#EB5E28] uppercase block mb-1">Responsável Técnico</span>
            <span className="text-sm font-black text-[#212529] uppercase">{report.responsavel || "Não Informado"}</span>
          </div>
          <div>
            <span className="text-[9px] font-black text-[#EB5E28] uppercase block mb-1">Tipo de Inspeção</span>
            <span className="text-sm font-black text-[#212529] uppercase">Comissionamento a {report.tipo}</span>
          </div>
        </div>

        {/* Main Content Title */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-[#EB5E28]/20"></div>
          <h2 className="text-[11px] font-black uppercase text-[#EB5E28] tracking-[0.2em]">Parâmetros de Teste CC</h2>
          <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-[#EB5E28]/20"></div>
        </div>

        {/* Modern Table */}
        <div className="rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm mb-10">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#212529] text-white text-center font-bold">
                <th className="p-4 border-r border-white/10" rowSpan={2}>SÉRIES FV</th>
                <th className="p-4 border-r border-white/10" rowSpan={2}>MPPT</th>
                <th className="p-4 border-r border-white/10" rowSpan={2}>TENSÃO (V)</th>
                <th className="p-4 border-r border-white/10" rowSpan={2}>POLARIDADE</th>
                <th className="p-3 border-b border-white/10" colSpan={2}>CONT. E FLUTUAÇÃO</th>
                <th className="p-3 border-b border-white/10" colSpan={2}>MEGGER (ISO)</th>
              </tr>
              <tr className="bg-[#212529] text-white text-center text-[12px]">
                <th className="p-2 border-r border-white/10 font-black">+</th >
                <th className="p-2 border-r border-white/10 font-black">-</th>
                <th className="p-2 border-r border-white/10 font-black">+</th>
                <th className="p-2 font-black">-</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {report.dadosTecnicos?.map((row: any, idx: number) => (
                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-50 transition-colors h-10`}>
                  <td className="p-2 font-black text-[#212529] uppercase border-r border-slate-50">String {row.string}</td>
                  <td className="p-2 font-bold text-slate-600 border-r border-slate-50">{row.mppt}</td>
                  <td className="p-2 font-black text-[#EB5E28] border-r border-slate-50">{row.tensao}V</td>
                  <td className="p-2 border-r border-slate-50">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${row.polaridade === 'OK' ? 'bg-[#00A859]/10 text-[#00A859]' : 'bg-red-50 text-red-600'}`}>{row.polaridade}</span>
                  </td>
                  <td className="p-2 border-r border-slate-50">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${row.contPos === 'OK' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{row.contPos}</span>
                  </td>
                  <td className="p-2 border-r border-slate-50">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${row.contNeg === 'OK' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{row.contNeg}</span>
                  </td>
                  <td className="p-2 border-r border-slate-50 font-bold text-slate-500 italic">{row.meggerPos}</td>
                  <td className="p-2 font-bold text-slate-500 italic">{row.meggerNeg}</td>
                </tr>
              ))}
              {/* Minimal empty rows if needed */}
              {Array.from({ length: Math.max(0, 10 - (report.dadosTecnicos?.length || 0)) }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="border-b border-slate-50 h-10">
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td className="border-r border-slate-50"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Observations */}
        {report.observacoes && (
          <div className="mb-12 bg-orange-50/30 rounded-3xl p-8 border border-orange-100">
            <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EB5E28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <h3 className="font-black text-xs uppercase text-[#EB5E28] tracking-widest">Observações Técnicas</h3>
            </div>
            <p className="text-sm text-[#212529] font-medium leading-relaxed">{report.observacoes}</p>
          </div>
        )}

        {/* Signature Area */}
        <div className="mt-20 grid grid-cols-2 gap-20">
          <div className="text-center group">
            <div className="h-16 flex items-end justify-center mb-4">
               {/* Space for actual signature */}
            </div>
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#212529] to-transparent mb-3 opacity-20"></div>
            <p className="text-[10px] font-black uppercase text-[#212529]">{report.responsavel || "Responsável Técnico"}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{report.crea ? `CREA: ${report.crea}` : "Cordeiro Energia"}</p>
          </div>
          <div className="text-center">
            <div className="h-16 flex items-end justify-center mb-4">
               {/* Space for actual signature */}
            </div>
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#212529] to-transparent mb-3 opacity-20"></div>
            <p className="text-[10px] font-black uppercase text-[#212529]">Aceite do Cliente</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{usina.projeto?.cliente || "Contratante"}</p>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center opacity-50">
          <p className="text-[8px] font-bold text-slate-400">WWW.CORDEIROENERGIA.COM.BR</p>
          <img src="/logo.png" alt="Logo" className="h-4 grayscale brightness-0" />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background-color: white;
          }
          #printable-area {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 15mm;
            box-shadow: none;
          }
          .bg-[#F8F9FA] { background-color: #F8F9FA !important; -webkit-print-color-adjust: exact; }
          .bg-[#212529] { background-color: #212529 !important; -webkit-print-color-adjust: exact; }
          .bg-[#EB5E28] { background-color: #EB5E28 !important; -webkit-print-color-adjust: exact; }
          .text-white { color: white !important; }
        }
      `}</style>
    </div>
  );
}
