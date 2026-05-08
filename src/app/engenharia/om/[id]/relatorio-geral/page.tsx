"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

function RelatorioGeralContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const idsParam = searchParams?.get("ids") || "";
  const selectedIds = idsParam.split(",").filter(Boolean);
  
  const [usina, setUsina] = useState<any>(null);
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUsina = await fetch(`/api/engenharia/om/usinas?id=${id}`);
        const dataUsina = await resUsina.json();
        setUsina(dataUsina);

        const resManu = await fetch(`/api/engenharia/om/manutencoes?usinaId=${id}`);
        const dataManu = await resManu.json();
        
        const filtered = dataManu.filter((m: any) => selectedIds.includes(m.id));
        setManutencoes(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id && selectedIds.length > 0) fetchData();
    else setLoading(false);
  }, [id, idsParam]);

  if (loading) return <div className="p-12 text-center">Carregando relatório geral...</div>;
  if (!usina || manutencoes.length === 0) return <div className="p-12 text-center text-red-500">Nenhuma intervenção selecionada ou encontrada.</div>;

  const getDuração = (manutencao: any) => {
    if (!manutencao.tempoInicio || !manutencao.tempoFim) return "Não registrado";
    const min = differenceInMinutes(new Date(manutencao.tempoFim), new Date(manutencao.tempoInicio));
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  // Dashboard Calculations
  const custoTotalMateriais = manutencoes.reduce((acc, m) => acc + (m.custoMateriais || 0), 0);
  const custoTotalMaoObra = manutencoes.reduce((acc, m) => acc + (m.custoMaoDeObra || 0), 0);
  const custoTotal = custoTotalMateriais + custoTotalMaoObra;

  // Group by Equipamento
  const equipamentoStats = manutencoes.reduce((acc: any, m: any) => {
    const eqNome = m.equipamento?.nome || "Geral / Não específico";
    const eqTag = m.equipamento?.tag || "-";
    if (!acc[eqNome]) acc[eqNome] = { nome: eqNome, tag: eqTag, count: 0, tipos: new Set(), custo: 0 };
    acc[eqNome].count += 1;
    acc[eqNome].tipos.add(m.tipo);
    acc[eqNome].custo += (m.custoMateriais || 0) + (m.custoMaoDeObra || 0);
    return acc;
  }, {});

  const equipamentosArray = Object.values(equipamentoStats);

  return (
    <div className="bg-slate-100 min-h-screen py-8">
      {/* Botão de Imprimir flutuante (não aparece na impressão) */}
      <button 
        onClick={() => window.print()} 
        className="fixed top-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl hover:bg-blue-700 transition-colors z-50 flex items-center gap-2 print:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Imprimir / Salvar PDF
      </button>

      <div className="max-w-4xl mx-auto space-y-8" id="printable-report">
        
        {/* Renderização individual de cada intervenção */}
        {manutencoes.map((manutencao, index) => (
          <div key={manutencao.id} className="bg-white p-12 text-slate-800 font-sans shadow-sm printable-page border border-slate-200 rounded-lg print:border-none print:shadow-none print:rounded-none">
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
                <p className="text-xs text-slate-400 mt-2">Pág {index + 1} de {manutencoes.length + 1}</p>
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
                    <p className="font-bold text-slate-700">{getDuração(manutencao)}</p>
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
                    {typeof manutencao.custoMateriais === 'number' && !isNaN(manutencao.custoMateriais) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manutencao.custoMateriais) : "R$ 0,00"}
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
          </div>
        ))}

        {/* D A S H B O A R D   C O N S O L I D A D O */}
        <div className="bg-white p-12 text-slate-800 font-sans shadow-sm printable-page border border-slate-200 rounded-lg print:border-none print:shadow-none print:rounded-none">
          <div className="border-b-4 border-emerald-500 pb-6 mb-8 flex justify-between items-end">
            <div>
              <img src="/logo.png" alt="Cordeiro Energia" className="h-16 object-contain mb-4" />
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Dashboard Operacional</h1>
              <p className="text-emerald-600 font-bold mt-1">Consolidação Geral de Custos e Intervenções</p>
            </div>
            <div className="text-right text-sm font-bold text-slate-500">
              <p>DATA DO RELATÓRIO</p>
              <p className="text-slate-800">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p className="text-xs text-slate-400 mt-2">Pág {manutencoes.length + 1} de {manutencoes.length + 1}</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase">Resumo Financeiro da Operação</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-400 uppercase mb-2">Custo de Materiais (Peças)</p>
                <p className="text-3xl font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoTotalMateriais)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-400 uppercase mb-2">Custo de Mão de Obra</p>
                <p className="text-3xl font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoTotalMaoObra)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
                <p className="text-sm font-bold text-emerald-600 uppercase mb-2">Custo Total Consolidado</p>
                <p className="text-4xl font-black text-emerald-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoTotal)}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase">Histórico de Intervenções por Equipamento</h2>
            <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Equipamento / Local</th>
                  <th className="p-4 font-bold">TAG</th>
                  <th className="p-4 font-bold text-center">Nº Intervenções</th>
                  <th className="p-4 font-bold">Tipos de Ação</th>
                  <th className="p-4 font-bold text-right">Custo Agregado</th>
                </tr>
              </thead>
              <tbody>
                {equipamentosArray.map((eq: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-4 font-bold text-slate-700">{eq.nome}</td>
                    <td className="p-4"><span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">{eq.tag}</span></td>
                    <td className="p-4 text-center font-bold text-blue-600">{eq.count}</td>
                    <td className="p-4 text-slate-600 text-sm">{Array.from(eq.tipos).join(", ")}</td>
                    <td className="p-4 text-right font-black text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eq.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
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
          .printable-page {
            page-break-after: always;
            box-shadow: none !important;
            border: none !important;
            padding: 5mm !important;
            margin-bottom: 0 !important;
            height: 277mm; /* Aproximadamente altura A4 menos margens */
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .printable-page:last-child {
            page-break-after: auto;
          }
          .printable-page img.h-16 {
            height: 40px !important;
          }
          .printable-page h1 {
            font-size: 1.5rem !important;
          }
          .printable-page .grid-cols-4 img {
            height: 80px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function RelatorioGeral() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Carregando módulo...</div>}>
      <RelatorioGeralContent />
    </Suspense>
  );
}
