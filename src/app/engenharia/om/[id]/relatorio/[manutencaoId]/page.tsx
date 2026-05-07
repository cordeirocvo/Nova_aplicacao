"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatorioFotografico() {
  const params = useParams();
  const id = params?.id as string;
  const manutencaoId = params?.manutencaoId as string;
  
  const [usina, setUsina] = useState<any>(null);
  const [manutencao, setManutencao] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUsina = await fetch(`/api/engenharia/om/usinas?id=${id}`);
        const dataUsina = await resUsina.json();
        setUsina(dataUsina);

        const resManu = await fetch(`/api/engenharia/om/manutencoes?usinaId=${id}`);
        const dataManu = await resManu.json();
        const m = dataManu.find((x: any) => x.id === manutencaoId);
        setManutencao(m);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id && manutencaoId) fetchData();
  }, [id, manutencaoId]);

  if (loading) return <div className="p-12 text-center">Carregando relatório...</div>;
  if (!usina || !manutencao) return <div className="p-12 text-center text-red-500">Dados não encontrados.</div>;

  const getDuração = () => {
    if (!manutencao.tempoInicio || !manutencao.tempoFim) return "Não registrado";
    const min = differenceInMinutes(new Date(manutencao.tempoFim), new Date(manutencao.tempoInicio));
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  return (
    <div className="bg-white min-h-screen p-8 text-slate-800 font-sans max-w-4xl mx-auto border shadow-sm my-8" id="printable-report">
      {/* Botão de Imprimir flutuante (não aparece na impressão) */}
      <button 
        onClick={() => window.print()} 
        className="fixed top-8 right-8 bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 print:hidden"
      >
        Imprimir / Salvar PDF
      </button>

      {/* Cabeçalho */}
      <div className="border-b-4 border-[#F25C27] pb-6 mb-8 flex justify-between items-end">
        <div>
          <img src="/logo.png" alt="Cordeiro Energia" className="h-16 object-contain mb-4" />
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório Técnico de Intervenção</h1>
          <p className="text-[#F25C27] font-bold mt-1">Operação e Manutenção (O&M)</p>
        </div>
        <div className="text-right text-sm font-bold text-slate-500">
          <p>DATA DO RELATÓRIO</p>
          <p className="text-slate-800">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
      </div>

      {/* Dados do Projeto */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase">Usina Fotovoltaica</h3>
            <p className="font-bold text-lg">{usina.nome}</p>
            <p className="text-sm text-slate-500">{usina.localizacao}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase">Projeto Vinculado</h3>
            <p className="font-bold">{usina.projeto?.nome}</p>
            <p className="text-sm text-slate-500">{usina.projeto?.cliente || "Cliente não informado"}</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase">Tipo de Intervenção</h3>
              <p className="font-bold text-[#F25C27] uppercase">{manutencao.tipo}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-slate-400 uppercase">Duração (MTTR)</h3>
              <p className="font-bold text-slate-700">{getDuração()}</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {manutencao.equipamento?.fotoBase64 && (
              <img src={manutencao.equipamento.fotoBase64} alt={manutencao.equipamento.nome} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
            )}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase">Equipamento Alvo</h3>
              <p className="font-bold">{manutencao.equipamento?.nome || "Geral / Não específico"}</p>
              <p className="text-sm text-slate-500 font-mono">{manutencao.equipamento?.tag || ""}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase">Início do Serviço</h3>
              <p className="font-bold">{manutencao.tempoInicio ? format(new Date(manutencao.tempoInicio), "dd/MM/yyyy HH:mm") : "-"}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase">Término</h3>
              <p className="font-bold">{manutencao.tempoFim ? format(new Date(manutencao.tempoFim), "dd/MM/yyyy HH:mm") : "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Descrição das Atividades */}
      <div className="mb-6">
        <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider">Descrição das Atividades Realizadas</h2>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[100px] whitespace-pre-wrap text-slate-700 leading-relaxed">
          {manutencao.descricao || "Nenhuma descrição fornecida para esta intervenção."}
        </div>
      </div>

      {/* Financeiro / Materiais */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="col-span-2">
          <h2 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-1 mb-3 uppercase tracking-wider">Peças Substituídas</h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px] whitespace-pre-wrap text-slate-700 text-sm">
            {manutencao.pecasTrocadas || "Nenhuma peça foi trocada nesta intervenção."}
          </div>
        </div>
        <div className="col-span-1">
          <h2 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-1 mb-3 uppercase tracking-wider">Custo Materiais</h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px] flex items-center justify-center">
            <p className="text-xl font-black text-slate-800">
              {manutencao.custoMateriais !== null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manutencao.custoMateriais) : "R$ 0,00"}
            </p>
          </div>
        </div>
        <div className="col-span-1">
          <h2 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-1 mb-3 uppercase tracking-wider">Custo Mão de Obra</h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px] flex items-center justify-center">
            <p className="text-xl font-black text-slate-800">
              {typeof manutencao.custoMaoDeObra === 'number' && !isNaN(manutencao.custoMaoDeObra) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manutencao.custoMaoDeObra) : "R$ 0,00"}
            </p>
          </div>
        </div>
      </div>

      {/* Relatório Fotográfico */}
      <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-2 mb-6 uppercase tracking-wider">Relatório Fotográfico</h2>
        {(!manutencao.fotosDetalhes || manutencao.fotosDetalhes.length === 0) ? (
          <p className="text-slate-400 italic">Nenhuma foto anexada a esta manutenção.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {manutencao.fotosDetalhes.map((foto: any, idx: number) => (
              <div key={idx} className="space-y-2" style={{ pageBreakInside: 'avoid' }}>
                <div className="bg-slate-200 rounded-xl overflow-hidden border border-slate-300">
                  <img src={foto.urlBase64} alt={`Foto ${idx+1}`} className="w-full h-32 object-cover" />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                  <p className="text-[10px] font-bold text-[#F25C27] uppercase mb-1">Registro {idx+1}</p>
                  <p className="text-xs text-slate-700 font-medium leading-tight">{foto.observacao || "Sem observações."}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assinaturas */}
      <div className="mt-24 pt-12 border-t-2 border-slate-100 grid grid-cols-2 gap-12 text-center" style={{ pageBreakInside: 'avoid' }}>
        <div>
          <div className="w-64 border-b border-slate-400 mx-auto mb-2"></div>
          <p className="font-bold text-slate-800 uppercase">{manutencao.responsavel || "Responsável Técnico"}</p>
          <p className="text-xs text-slate-500">Cordeiro Energia</p>
        </div>
        <div>
          <div className="w-64 border-b border-slate-400 mx-auto mb-2"></div>
          <p className="font-bold text-slate-800 uppercase">{usina.projeto?.cliente || "Cliente"}</p>
          <p className="text-xs text-slate-500">Aceite do Cliente</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
