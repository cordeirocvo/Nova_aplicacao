"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChecklistCampo() {
  const params = useParams();
  const id = params?.id as string;
  
  const [usina, setUsina] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUsina = await fetch(`/api/engenharia/om/usinas?id=${id}`);
        setUsina(await resUsina.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="p-12 text-center">Gerando checklist de campo...</div>;
  if (!usina) return <div className="p-12 text-center text-red-500">Usina não encontrada.</div>;

  return (
    <div className="bg-white min-h-screen p-8 font-['Montserrat',sans-serif]">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      
      <div className="max-w-[210mm] mx-auto border-2 border-slate-200 p-8 rounded-3xl print:border-none print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b-2 border-slate-100 pb-6">
          <div>
            <img src="/logo.png" alt="Cordeiro" className="h-12 object-contain mb-4" />
            <h1 className="text-2xl font-[900] text-slate-800 uppercase tracking-tighter">Checklist de Campo</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspeção Termográfica Preventiva</p>
          </div>
          <div className="text-right">
            <div className="bg-slate-100 px-4 py-2 rounded-xl mb-2">
              <span className="text-[10px] font-black text-slate-500 block uppercase">Data Prevista</span>
              <span className="text-sm font-bold text-slate-700">____ / ____ / 2026</span>
            </div>
            <button 
              onClick={() => window.print()}
              className="bg-[#EB5E28] text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-100 print:hidden"
            >
              Imprimir Checklist
            </button>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Usina / Localização</span>
            <span className="text-sm font-black text-slate-700 uppercase">{usina.nome}</span>
            <p className="text-[10px] text-slate-500 mt-1">{usina.localizacao || "Endereço não informado"}</p>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Inspetor Responsável</span>
            <span className="text-sm font-black text-slate-700 uppercase">________________________________</span>
          </div>
        </div>

        {/* Field Instructions */}
        <div className="mb-8 p-4 border-l-4 border-orange-500 bg-orange-50 rounded-r-xl">
          <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Instruções de Campo:</h3>
          <p className="text-[9px] text-slate-600 leading-tight">
            1. Realizar inspeção com carga mínima de 40%. 2. Manter distância de segurança conforme NR-10. 
            3. Registrar T. Ambiente e Irradiação. 4. Fotografar todos os pontos Críticos e de Observação.
          </p>
        </div>

        {/* Equipment Table */}
        <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm mb-10">
          <table className="w-full text-[10px] border-collapse">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3 text-left">TAG / EQUIPAMENTO</th>
                <th className="p-3">T. MEDIDA</th>
                <th className="p-3">T. REF</th>
                <th className="p-3">STATUS (N/O/C)</th>
                <th className="p-3 text-left">OBSERVAÇÕES DE CAMPO</th>
              </tr>
            </thead>
            <tbody>
              {usina.equipamentos?.map((eq: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-100 h-16">
                  <td className="p-3">
                    <span className="font-black text-slate-800 block uppercase">{eq.tag}</span>
                    <span className="text-[8px] text-slate-400 uppercase">{eq.nome}</span>
                  </td>
                  <td className="p-3 border-l border-slate-100 w-24 text-center text-slate-300">____ °C</td>
                  <td className="p-3 border-l border-slate-100 w-24 text-center text-slate-300">____ °C</td>
                  <td className="p-3 border-l border-slate-100 w-32">
                    <div className="flex justify-center gap-4 text-slate-300 text-[12px] font-black">
                       <span>[ ] N</span> <span>[ ] O</span> <span>[ ] C</span>
                    </div>
                  </td>
                  <td className="p-3 border-l border-slate-100 text-slate-200">________________________________</td>
                </tr>
              ))}
              {/* Additional empty rows */}
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`extra-${idx}`} className="border-b border-slate-100 h-16">
                  <td className="p-3">
                    <span className="text-slate-200">TAG: ____________</span>
                  </td>
                  <td className="p-3 border-l border-slate-100"></td>
                  <td className="p-3 border-l border-slate-100"></td>
                  <td className="p-3 border-l border-slate-100"></td>
                  <td className="p-3 border-l border-slate-100"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Environmental Data Capture Area */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
             <span className="text-[8px] font-black text-slate-400 uppercase block mb-4">T. Ambiente (°C)</span>
             <span className="text-xl text-slate-200">________</span>
          </div>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
             <span className="text-[8px] font-black text-slate-400 uppercase block mb-4">Irradiação (W/m²)</span>
             <span className="text-xl text-slate-200">________</span>
          </div>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
             <span className="text-[8px] font-black text-slate-400 uppercase block mb-4">Umidade (%)</span>
             <span className="text-xl text-slate-200">________</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest pt-10">
           <span>GERADO EM: {format(new Date(), "dd/MM/yyyy HH:mm")}</span>
           <span>PÁGINA 1 DE 1</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background-color: white !important; }
          .print\:hidden { display: none !important; }
          @page { margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
