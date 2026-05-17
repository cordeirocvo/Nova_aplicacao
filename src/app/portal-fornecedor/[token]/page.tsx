"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Loader, Save, Send } from "lucide-react";

export default function PortalFornecedorPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [finalizado, setFinalizado] = useState(false);

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
