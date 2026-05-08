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

        const resReports = await fetch(`/api/engenharia/om/comissionamento?usinaId=${id}`);
        const reports = await resReports.json();
        const found = reports.find((r: any) => r.id === reportId);
        setReport(found);
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
    <div className="bg-slate-50 min-h-screen py-12 px-4 print:p-0 print:bg-white">
      <button 
        onClick={() => window.print()} 
        className="fixed top-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl hover:bg-blue-700 transition-all z-50 flex items-center gap-2 print:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        IMPRIMIR RELATÓRIO
      </button>

      <div className="max-w-[210mm] mx-auto bg-white p-[15mm] shadow-2xl print:shadow-none print:p-0" id="printable-area">
        {/* Header Table */}
        <div className="border-2 border-black mb-6">
          <div className="flex border-b-2 border-black">
            <div className="w-1/4 p-4 flex items-center justify-center border-r-2 border-black">
              <img src="/logo.png" alt="Cordeiro" className="h-10 object-contain" />
            </div>
            <div className="w-3/4 p-4 text-center flex flex-col justify-center">
              <h1 className="text-xl font-black uppercase tracking-widest">Testes de Inspeção Cordeiro Energia</h1>
            </div>
          </div>
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-2 border-r-2 border-black flex gap-2">
              <span className="font-black text-sm uppercase">Usina:</span>
              <span className="text-sm font-bold uppercase">{usina.nome}</span>
            </div>
            <div className="p-2 flex gap-2">
              <span className="font-black text-sm uppercase">Nº:</span>
              <span className="text-sm font-bold">{report.numero || "01"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-2 border-r-2 border-black flex gap-2">
              <span className="font-black text-sm uppercase">Responsável:</span>
              <span className="text-sm font-bold uppercase">{report.responsavel || "Não Informado"}</span>
            </div>
            <div className="p-2 flex gap-2">
              <span className="font-black text-sm uppercase">Data:</span>
              <span className="text-sm font-bold">{format(new Date(report.data), "dd/MM/yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="bg-slate-100 border-2 border-black text-center py-2 mb-0">
          <h2 className="text-lg font-black uppercase">Testes Tensão CC - Comissionamento a {report.tipo}</h2>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse border-l-2 border-r-2 border-b-2 border-black text-[10px]">
          <thead className="bg-white">
            <tr className="border-b-2 border-black text-center font-black">
              <td className="border-r-2 border-black p-2 w-[12%]" rowSpan={2}>Séries FV</td>
              <td className="border-r-2 border-black p-2 w-[8%]" rowSpan={2}>MPPT</td>
              <td className="border-r-2 border-black p-2 w-[12%]" rowSpan={2}>Testes Tensão (V)</td>
              <td className="border-r-2 border-black p-2 w-[15%]" rowSpan={2}>Checagem da Polaridade</td>
              <td className="border-r-2 border-black p-2" colSpan={2}>Continuidade e Flutuação</td>
              <td className="p-2" colSpan={2}>MEGGER</td>
            </tr>
            <tr className="border-b-2 border-black text-center font-black">
              <td className="border-r-2 border-black p-2 w-[10%] text-2xl">+</td>
              <td className="border-r-2 border-black p-2 w-[10%] text-2xl">-</td>
              <td className="border-r-2 border-black p-2 w-[15%] text-2xl">+</td>
              <td className="p-2 w-[15%] text-2xl">-</td>
            </tr>
          </thead>
          <tbody className="text-center font-bold">
            {report.dadosTecnicos?.map((row: any, idx: number) => (
              <tr key={idx} className="border-b border-black h-8">
                <td className="border-r-2 border-black uppercase">String {row.string}</td>
                <td className="border-r-2 border-black">{row.mppt}</td>
                <td className="border-r-2 border-black">{row.tensao}</td>
                <td className="border-r-2 border-black">{row.polaridade}</td>
                <td className="border-r-2 border-black">{row.contPos}</td>
                <td className="border-r-2 border-black">{row.contNeg}</td>
                <td className="border-r-2 border-black">{row.meggerPos}</td>
                <td>{row.meggerNeg}</td>
              </tr>
            ))}
            {/* Fill empty rows to maintain layout if needed */}
            {Array.from({ length: Math.max(0, 30 - (report.dadosTecnicos?.length || 0)) }).map((_, idx) => (
              <tr key={`empty-${idx}`} className="border-b border-black h-8">
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Observations */}
        {report.observacoes && (
          <div className="mt-6 border-2 border-black p-4">
            <h3 className="font-black text-sm uppercase mb-2">Observações:</h3>
            <p className="text-sm whitespace-pre-wrap">{report.observacoes}</p>
          </div>
        )}

        {/* Footer Signature */}
        <div className="mt-24 flex justify-around">
          <div className="text-center w-64">
            <div className="border-b border-black mb-2"></div>
            <p className="text-xs font-black uppercase">Responsável Técnico</p>
            <p className="text-[10px] text-slate-500">Cordeiro Energia</p>
          </div>
          <div className="text-center w-64">
            <div className="border-b border-black mb-2"></div>
            <p className="text-xs font-black uppercase">Aceite do Cliente</p>
            <p className="text-[10px] text-slate-500">{usina.projeto?.cliente || "Cliente"}</p>
          </div>
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
          .print-hidden {
            display: none;
          }
          #printable-area {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 15mm;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
