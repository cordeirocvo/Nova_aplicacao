"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TermografiaRelatorio() {
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

        const resReport = await fetch(`/api/engenharia/om/termografia?id=${reportId}`);
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

  if (loading) return <div className="p-12 text-center">Gerando laudo técnico...</div>;
  if (!usina || !report) return <div className="p-12 text-center text-red-500">Dados não encontrados.</div>;

  return (
    <div className="bg-[#F8F9FA] min-h-screen py-12 px-4 print:p-0 print:bg-white font-['Montserrat',sans-serif]">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      
      <button 
        onClick={() => window.print()} 
        className="fixed top-8 right-8 bg-[#EB5E28] text-white px-8 py-4 rounded-full font-black shadow-2xl hover:scale-105 transition-all z-50 flex items-center gap-3 print:hidden border-none cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        IMPRIMIR LAUDO
      </button>

      <div className="max-w-[210mm] mx-auto bg-white p-[15mm] shadow-[0_20px_50px_rgba(0,0,0,0.1)] print:shadow-none print:p-0 overflow-hidden relative" id="printable-area">
        
        {/* CAPA - Página 1 */}
        <div className="min-h-[260mm] flex flex-col">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div className="space-y-4">
              <img src="/logo.png" alt="Cordeiro" className="h-16 object-contain" />
              <div>
                <h1 className="text-[#EB5E28] text-4xl font-[900] uppercase leading-none tracking-tighter">Laudo de</h1>
                <h1 className="text-[#212529] text-4xl font-[900] uppercase leading-none tracking-tighter">Termografia</h1>
                <p className="text-[10px] font-black text-slate-400 mt-2 tracking-[0.3em] uppercase">Inspeção por Infravermelho • ABNT NBR 15572 / 15763</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-[#212529] text-white px-6 py-3 rounded-3xl inline-block mb-3 shadow-lg shadow-slate-200">
                <span className="text-[10px] font-bold uppercase block opacity-60 tracking-widest">Laudo Nº</span>
                <span className="text-xl font-[900] tracking-tighter">{report.id.substring(report.id.length - 6).toUpperCase()}</span>
              </div>
              <p className="text-xs font-black text-[#212529] uppercase tracking-widest">{format(new Date(report.dataInspecao), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR })}</p>
            </div>
          </div>

          {/* Technical Context Strip */}
          <div className="grid grid-cols-4 gap-4 bg-[#F8F9FA] rounded-[2.5rem] p-8 mb-10 border border-slate-100 relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[9px] font-black text-[#EB5E28] uppercase block mb-1 opacity-80">Usina / Local</span>
              <span className="text-xs font-black text-[#212529] uppercase leading-tight">{usina.nome}</span>
            </div>
            <div className="relative z-10 border-l border-slate-200 pl-4">
              <span className="text-[9px] font-black text-[#EB5E28] uppercase block mb-1 opacity-80">Inspetor Técnico</span>
              <span className="text-xs font-black text-[#212529] uppercase leading-tight">{report.profissional?.nome || "Não Informado"}</span>
              <span className="text-[8px] font-bold text-slate-400 block mt-0.5">CREA: {report.profissional?.crea || "---"}</span>
            </div>
            <div className="relative z-10 border-l border-slate-200 pl-4">
              <span className="text-[9px] font-black text-[#EB5E28] uppercase block mb-1 opacity-80">Câmera Térmica</span>
              <span className="text-xs font-black text-[#212529] uppercase leading-tight">{report.equipamentoCamera || "FLIR Series"}</span>
            </div>
            <div className="relative z-10 border-l border-slate-200 pl-4">
              <span className="text-[9px] font-black text-[#EB5E28] uppercase block mb-1 opacity-80">Pontos Críticos</span>
              <span className="text-xs font-black text-red-600 uppercase leading-tight">{report.itens?.filter((i:any) => i.severidade === 'Crítica').length || 0} de {report.itens?.length || 0}</span>
            </div>
          </div>

          {/* Environmental Conditions */}
          <div className="grid grid-cols-4 gap-4 mb-10">
            <div className="bg-white border border-slate-100 rounded-3xl p-4 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Temp. Ambiente</span>
              <span className="text-base font-[900] text-[#212529]">{report.temperaturaAmbiente || "--"}°C</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-4 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Irradiação</span>
              <span className="text-base font-[900] text-[#212529]">{report.irradiacao || "--"} W/m²</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-4 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Emissividade</span>
              <span className="text-base font-[900] text-[#212529]">{report.emissividade || "0.95"}</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-4 text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Vento</span>
              <span className="text-base font-[900] text-[#212529]">{report.velocidadeVento || "--"} m/s</span>
            </div>
          </div>

          {/* Intro Text */}
          <div className="mt-auto bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
            <h3 className="text-xs font-black text-[#212529] uppercase tracking-widest mb-4">Objetivo da Inspeção</h3>
            <p className="text-[10px] text-slate-500 leading-relaxed text-justify font-medium">
              Este relatório apresenta os resultados da inspeção termográfica realizada na usina fotovoltaica {usina.nome}. 
              A inspeção visa identificar anomalias térmicas (pontos quentes) em módulos, inversores, painéis e conexões 
              elétricas que possam comprometer a segurança ou a performance do sistema, seguindo os critérios de 
              severidade estabelecidos pela norma ABNT NBR 15763.
            </p>
          </div>
        </div>

        {/* SUMÁRIO - Página 2 - Folha Exclusiva */}
        <div className="print:break-before-page min-h-[260mm] pt-10 flex flex-col">
          <h2 className="text-2xl font-[900] uppercase text-[#EB5E28] tracking-tighter mb-8 border-b-4 border-[#EB5E28] pb-4">
             Sumário de Equipamentos Inspecionados
          </h2>
          <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm bg-white flex-1">
            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-[#212529] text-white">
                <tr>
                  <th className="p-5 text-left uppercase tracking-widest font-black">Equipamento / TAG</th>
                  <th className="p-5 text-left uppercase tracking-widest font-black">Localização / Detalhe</th>
                  <th className="p-5 uppercase tracking-widest font-black text-center">Delta T</th>
                  <th className="p-5 uppercase tracking-widest font-black text-center">Status</th>
                </tr>
              </thead>
              <tbody className="font-bold">
                {report.itens?.map((item: any, idx: number) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100`}>
                    <td className="p-5 text-[#212529] uppercase font-black">{item.tipoEquipamento} - {item.tag}</td>
                    <td className="p-5 text-slate-500 uppercase">{item.localizacao || "Geral"}</td>
                    <td className="p-5 text-center font-[900] text-[#EB5E28]">Δ {item.deltaT}°C</td>
                    <td className="p-5 text-center">
                      <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase inline-block ${
                        item.severidade === 'Crítica' ? 'bg-red-600 text-white' : 
                        item.severidade === 'Observação' ? 'bg-orange-500 text-white' : 
                        'bg-emerald-600 text-white'
                      }`}>
                        {item.severidade}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-[9px] font-black text-slate-300 uppercase tracking-widest text-right italic">
             Total de pontos analisados: {report.itens?.length || 0}
          </div>
        </div>

        {/* FICHAS TÉCNICAS - Uma por página - Imagens Maiores */}
        {report.itens?.map((item: any, idx: number) => (
          <div key={`ficha-${idx}`} className="print:break-before-page min-h-[260mm] pt-10 flex flex-col">
            {/* Header Mini */}
            <div className="flex justify-between items-end mb-8 border-b-2 border-slate-100 pb-4">
              <div>
                <h2 className="text-[10px] font-black text-[#EB5E28] uppercase tracking-[0.3em]">FICHA DE RECOMENDAÇÃO TÉCNICA</h2>
                <h3 className="text-3xl font-[900] text-[#212529] uppercase tracking-tighter mt-1">{item.tipoEquipamento} {item.tag}</h3>
              </div>
              <div className={`px-6 py-2 rounded-2xl font-black text-xs uppercase ${
                item.severidade === 'Crítica' ? 'bg-red-100 text-red-600' : 
                item.severidade === 'Observação' ? 'bg-orange-100 text-orange-600' : 
                'bg-emerald-100 text-emerald-600'
              }`}>
                STATUS: {item.severidade}
              </div>
            </div>

            {/* Imagens Grandes Lado a Lado */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="space-y-3">
                <div className="h-[320px] rounded-[3rem] overflow-hidden border-4 border-[#212529] shadow-2xl bg-slate-50">
                  {item.imagemTermicaUrl ? (
                    <img src={item.imagemTermicaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-[10px] uppercase">Sem Termograma</div>
                  )}
                </div>
                <div className="bg-[#212529] text-white py-2 px-6 rounded-full inline-block text-[11px] font-black uppercase tracking-widest">
                  Termograma (Infravermelho)
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-[320px] rounded-[3rem] overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50">
                  {item.imagemVisualUrl ? (
                    <img src={item.imagemVisualUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-[10px] uppercase">Sem Foto Visual</div>
                  )}
                </div>
                <div className="bg-slate-100 text-slate-500 py-2 px-6 rounded-full inline-block text-[11px] font-black uppercase tracking-widest">
                  Foto Digital (Visual)
                </div>
              </div>
            </div>

            {/* Dados Técnicos e Análise */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-[#F8F9FA] p-6 rounded-[2rem] border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Temperatura Máxima</p>
                <p className="text-3xl font-[900] text-[#EB5E28]">{item.temperaturaMedida}°C</p>
              </div>
              <div className="bg-[#F8F9FA] p-6 rounded-[2rem] border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Temperatura Ref.</p>
                <p className="text-3xl font-[900] text-slate-600">{item.temperaturaReferencia}°C</p>
              </div>
              <div className="bg-[#212529] p-6 rounded-[2rem] shadow-xl text-center">
                <p className="text-[10px] font-black text-white/50 uppercase mb-1">Elevação (Delta T)</p>
                <p className="text-3xl font-[900] text-white">Δ {item.deltaT}°C</p>
              </div>
            </div>

            {/* Causa e Recomendação */}
            <div className="space-y-6 mb-8 flex-1">
              <div className="bg-orange-50/50 p-10 rounded-[3rem] border border-orange-100 relative overflow-hidden">
                <h4 className="text-[11px] font-black text-[#EB5E28] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                   <span className="w-2.5 h-2.5 bg-[#EB5E28] rounded-full animate-pulse"></span> Causa Provável da Anomalia
                </h4>
                <p className="text-[13px] font-bold text-[#212529] leading-relaxed uppercase">{item.causaProvavel || "NÃO IDENTIFICADA NO MOMENTO DA INSPEÇÃO."}</p>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#EB5E28]"></div>
              </div>

              <div className="bg-emerald-50/50 p-10 rounded-[3rem] border border-emerald-100 relative overflow-hidden">
                <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                   <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></span> Recomendação de Manutenção
                </h4>
                <p className="text-[13px] font-black text-[#212529] leading-relaxed uppercase">{item.recomendacao || "REALIZAR INSPEÇÃO VISUAL E REAPERTO TÉCNICO."}</p>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-600"></div>
              </div>
            </div>

            {/* Footer Ficha */}
            <div className="flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-widest pt-6 border-t border-slate-50">
               <span>PONTO DE INSPEÇÃO {idx + 1} DE {report.itens.length}</span>
               <span className="text-[#EB5E28]">{usina.nome}</span>
            </div>
          </div>
        ))}

        {/* Signature Area */}
        <div className="mt-20 pt-10 border-t border-slate-100 print:break-before-page">
          <div className="grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="h-20 flex items-end justify-center mb-4">
                 <p className="text-sm font-black uppercase text-slate-400 opacity-20 rotate-[-5deg]">Assinatura Digital</p>
              </div>
              <div className="h-[2px] w-full bg-slate-200 mb-3"></div>
              <p className="text-[10px] font-black uppercase text-[#212529]">{report.profissional?.nome || "Responsável Técnico"}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">CREA: {report.profissional?.crea || "Não Informado"}</p>
            </div>
            <div className="text-center">
              <div className="h-20 flex items-end justify-center mb-4"></div>
              <div className="h-[2px] w-full bg-slate-200 mb-3"></div>
              <p className="text-[10px] font-black uppercase text-[#212529]">Aceite do Cliente</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{usina.projeto?.cliente || "Contratante"}</p>
            </div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-20 flex justify-between items-center opacity-30">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">Cordeiro Energia • Laudo Gerado via Cordeiro SaaS</p>
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
            -webkit-print-color-adjust: exact;
          }
          #printable-area {
            width: 210mm;
            margin: 0;
            padding: 15mm;
            box-shadow: none;
          }
          .bg-[#F8F9FA] { background-color: #F8F9FA !important; }
          .bg-[#212529] { background-color: #212529 !important; }
          .bg-[#EB5E28] { background-color: #EB5E28 !important; }
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
