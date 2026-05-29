"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Loader, Save, Send, AlertTriangle } from "lucide-react";

export default function PortalFornecedorPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [finalizado, setFinalizado] = useState(false);

  // Estados para importação automática via PDF
  const [parsingPdf, setParsingPdf] = useState(false);
  const [divergentItems, setDivergentItems] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/portal-fornecedor/${params.token}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.convite) {
          setData(resData.convite);
          setFinalizado(resData.convite.statusConvite === "Respondido");
          
          const initialPrecos: Record<string, string> = {};
          const initialObs: Record<string, string> = {};
          
          resData.propostas?.forEach((p: any) => {
            initialPrecos[p.itemId] = p.precoUnitario.toString();
            if (p.observacao) initialObs[p.itemId] = p.observacao;
          });
          
          setPrecos(initialPrecos);
          setObs(initialObs);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.token]);

  const handleSave = async (finalizar = false) => {
    const propostas = Object.keys(precos).map(itemId => ({
      itemId,
      precoUnitario: precos[itemId] ? parseFloat(precos[itemId].replace(",", ".")) : 0,
      observacao: obs[itemId] || "",
    })).filter(p => p.precoUnitario > 0);

    if (finalizar && propostas.length === 0) {
      alert("Preencha ao menos um preço antes de finalizar.");
      return;
    }

    if (finalizar) setFinalizando(true);
    else setSaving(true);

    try {
      const res = await fetch(`/api/portal-fornecedor/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propostas, finalizar }),
      });

      if (res.ok) {
        if (finalizar) setFinalizado(true);
        else alert("Rascunho salvo com sucesso!");
      }
    } finally {
      setSaving(false);
      setFinalizando(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingPdf(true);
    setDivergentItems([]);
    setMappings({});
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/portal-fornecedor/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error || "Erro ao ler PDF de orçamento");
        return;
      }

      if (resData.items && Array.isArray(resData.items)) {
        const projectItens = data?.projeto?.etapas?.flatMap((e: any) => e.itens) || [];
        
        const newPrecos = { ...precos };
        const newDivergent: any[] = [];

        resData.items.forEach((pdfItem: any) => {
          const pdfItemDesc = (pdfItem.descricao || "").toLowerCase().trim();
          
          // Buscar correspondência exata ou parcial inteligente
          const match = projectItens.find((pi: any) => {
            const piDesc = (pi.descricao || "").toLowerCase().trim();
            return piDesc === pdfItemDesc || piDesc.includes(pdfItemDesc) || pdfItemDesc.includes(piDesc);
          });

          if (match) {
            newPrecos[match.id] = String(pdfItem.precoUnitario);
          } else {
            newDivergent.push(pdfItem);
          }
        });

        setPrecos(newPrecos);
        
        if (newDivergent.length > 0) {
          setDivergentItems(newDivergent);
          alert(`PDF lido! ${resData.items.length - newDivergent.length} itens foram mapeados automaticamente. Identificamos ${newDivergent.length} itens com nomes divergentes para você associar manualmente.`);
        } else {
          alert(`PDF lido com sucesso! Todos os ${resData.items.length} itens foram mapeados e preenchidos automaticamente.`);
        }
      }
    } catch (err) {
      alert("Erro ao enviar PDF.");
    } finally {
      setParsingPdf(false);
    }
  };

  const applyMappings = () => {
    const newPrecos = { ...precos };
    
    Object.entries(mappings).forEach(([idxStr, itemId]) => {
      const idx = parseInt(idxStr);
      const pdfItem = divergentItems[idx];
      
      if (pdfItem && itemId && itemId !== "ignore") {
        newPrecos[itemId] = String(pdfItem.precoUnitario);
      }
    });

    setPrecos(newPrecos);
    setDivergentItems([]);
    setMappings({});
    alert("Associações de itens aplicadas com sucesso!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="w-10 h-10 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-10 bg-white rounded-3xl shadow-lg border border-red-100 max-w-md">
          <p className="text-lg font-black text-red-600 mb-2">Token Inválido ou Expirado</p>
          <p className="text-slate-500">O link de cotação que você acessou não é válido. Solicite um novo link ao comprador.</p>
        </div>
      </div>
    );
  }

  if (finalizado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="text-center p-10 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md animate-in zoom-in duration-500">
          <CheckCircle className="w-20 h-20 text-[#00BFA5] mx-auto mb-6" />
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Cotação Enviada!</h1>
          <p className="text-slate-500">Agradecemos sua participação. A equipe de suprimentos da Cordeiro Energia já recebeu seus preços e entrará em contato em breve.</p>
        </div>
      </div>
    );
  }

  const projectItens = data?.projeto?.etapas?.flatMap((e: any) => e.itens) || [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Header */}
      <div className="bg-[#0A192F] text-white py-6 px-6 shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#00BFA5]">Portal de Cotações</p>
              <h1 className="text-lg font-bold">Projeto: {data.projeto.nome}</h1>
            </div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-sm">
            Bem-vindo, <b>{data.fornecedor.razaoSocial}</b>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-blue-50/50 border-b border-slate-200">
            <h2 className="text-lg font-black text-[#1E3A8A]">Instruções</h2>
            <p className="text-sm text-slate-600 mt-1">Preencha os valores unitários (sem impostos) para os itens que deseja cotar. Você pode deixar em branco itens que não atende. Clique em "Salvar Rascunho" para continuar depois, ou "Enviar Cotação" quando terminar.</p>
          </div>

          {/* Importação Automática via PDF */}
          <div className="p-6 border-b border-slate-200 bg-emerald-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-[#00BFA5] uppercase tracking-wider flex items-center gap-1.5">
                ⚡ Importação Automática via PDF
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Selecione seu arquivo de orçamento em PDF. O sistema lerá e preencherá os preços unitários automaticamente.
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              {parsingPdf ? (
                <div className="flex items-center gap-2 text-xs font-bold text-[#00BFA5] bg-white border border-[#00BFA5]/20 px-4 py-2.5 rounded-xl shadow-sm">
                  <Loader className="w-4 h-4 animate-spin" /> Analisando orçamento em PDF...
                </div>
              ) : (
                <label className="px-4 py-2.5 bg-[#00BFA5] hover:bg-[#00a891] text-white text-xs font-black rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  IMPORTAR ORÇAMENTO EM PDF
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={handlePdfUpload} 
                  />
                </label>
              )}
            </div>
          </div>

          {/* Área de Resolução de Itens Divergentes */}
          {divergentItems.length > 0 && (
            <div className="p-6 border-b border-slate-200 bg-amber-50/30 border-l-4 border-amber-400 animate-in fade-in slide-in-from-top duration-300">
              <h4 className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Itens Divergentes Detectados no PDF
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Não conseguimos associar alguns itens automaticamente devido a diferenças no nome. Por favor, escolha qual produto do nosso escopo representa cada valor extraído:
              </p>
              
              <div className="grid gap-3 mt-4">
                {divergentItems.map((pdfItem, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate" title={pdfItem.descricao}>
                        PDF: <span className="font-medium text-slate-600">{pdfItem.descricao}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        Qtd no PDF: {pdfItem.quantidade} • Preço Unitário: R$ {pdfItem.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <div className="w-full sm:w-96 shrink-0">
                      <select 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent transition-all"
                        value={mappings[idx] || ""}
                        onChange={(e) => setMappings({ ...mappings, [idx]: e.target.value })}
                      >
                        <option value="">-- Associar ao produto do projeto --</option>
                        <option value="ignore">❌ Desconsiderar este item da cotação</option>
                        {projectItens.map((pi: any) => (
                          <option key={pi.id} value={pi.id}>{pi.descricao} ({pi.quantidade} {pi.unidade})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={applyMappings}
                  className="px-4 py-2 bg-[#00BFA5] hover:bg-[#00a891] text-white text-xs font-black rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  APLICAR MAPEAMENTO MANUAL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDivergentItems([]);
                    setMappings({});
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-lg transition-all cursor-pointer"
                >
                  DESCONSIDERAR DIVERGÊNCIAS
                </button>
              </div>
            </div>
          )}

          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Item / Descrição</th>
                  <th className="px-6 py-4 text-center">Un / Qtd</th>
                  <th className="px-6 py-4 w-48">Preço Unitário (R$)</th>
                  <th className="px-6 py-4 w-64">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.projeto.etapas?.flatMap((e: any, indexEtapa: number) => 
                  e.itens?.map((item: any, indexItem: number) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{item.descricao}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">Ref: {item.codigo || "S/C"} • Etapa: {e.nome}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-black text-slate-700">{item.quantidade}</span>
                        <span className="text-[10px] ml-1 text-slate-500">{item.unidade}</span>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent text-right font-medium text-slate-800"
                          value={precos[item.id] || ""}
                          onChange={e => setPrecos({...precos, [item.id]: e.target.value})}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="text"
                          placeholder="Ex: Marca X, Prazo Y..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent text-sm"
                          value={obs[item.id] || ""}
                          onChange={e => setObs({...obs, [item.id]: e.target.value})}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 hidden md:block">Você pode salvar o rascunho para continuar preenchendo mais tarde.</p>
          <div className="flex w-full sm:w-auto items-center gap-3">
            <button 
              onClick={() => handleSave(false)}
              disabled={saving || finalizando}
              className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Salvar Rascunho
            </button>
            <button 
              onClick={() => handleSave(true)}
              disabled={saving || finalizando}
              className="flex-1 sm:flex-none px-6 py-3 bg-[#00BFA5] text-white font-black rounded-xl hover:bg-[#00a891] shadow-lg shadow-[#00BFA5]/20 hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {finalizando ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              ENVIAR COTAÇÃO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
