"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash, Settings, Loader } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OrcamentosConfigPage() {
  const router = useRouter();
  const [tipos, setTipos] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [novoTipo, setNovoTipo] = useState("");
  const [novoItem, setNovoItem] = useState({ codigo: "", descricao: "", tipo: "Material", unidade: "un", precoBaseUnitario: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resTipos, resItens] = await Promise.all([
        fetch("/api/orcamentos/tipos-material"),
        fetch("/api/orcamentos/itens-padrao")
      ]);
      const dataTipos = await resTipos.json();
      const dataItens = await resItens.json();
      setTipos(Array.isArray(dataTipos) ? dataTipos : []);
      setItens(Array.isArray(dataItens) ? dataItens : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTipo.trim()) return;
    try {
      const res = await fetch("/api/orcamentos/tipos-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoTipo.trim() }),
      });
      if (res.ok) {
        setNovoTipo("");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (error) {
      alert("Erro ao adicionar");
    }
  };

  const handleDeleteTipo = async (id: string) => {
    if (!confirm("Excluir este tipo?")) return;
    try {
      await fetch(`/api/orcamentos/tipos-material/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      alert("Erro ao excluir");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.descricao || !novoItem.tipo || !novoItem.unidade) return;
    try {
      const res = await fetch("/api/orcamentos/itens-padrao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoItem),
      });
      if (res.ok) {
        setNovoItem({ codigo: "", descricao: "", tipo: tipos[0]?.nome || "Material", unidade: "un", precoBaseUnitario: "" });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (error) {
      alert("Erro ao adicionar");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Excluir este item padrão?")) return;
    try {
      await fetch(`/api/orcamentos/itens-padrao/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      alert("Erro ao excluir");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader className="w-10 h-10 animate-spin text-[#00BFA5]" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push("/orcamentos")}
          className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-[#1E3A8A]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-[#1E3A8A] uppercase tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-[#00BFA5]" /> Configurações de Orçamentos
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie os tipos de materiais e o banco de composições padrão.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Tipos de Material */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-widest">Tipos de Materiais</h3>
            <p className="text-xs text-slate-500 mt-1">Categorias (Ex: Elétrico, Civil, Hidráulico)</p>
          </div>
          <div className="p-4 border-b border-slate-100">
            <form onSubmit={handleAddTipo} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Novo Tipo"
                required
                value={novoTipo}
                onChange={e => setNovoTipo(e.target.value)}
                className="flex-1 text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]"
              />
              <button type="submit" className="p-2 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e3a8a]/90">
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {tipos.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-bold text-slate-700">{t.nome}</span>
                <button onClick={() => handleDeleteTipo(t.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Banco de Itens */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-widest">Banco de Composições Padrão</h3>
            <p className="text-xs text-slate-500 mt-1">Itens pré-cadastrados para uso rápido na EAP.</p>
          </div>
          <div className="p-4 border-b border-slate-100 bg-slate-50/30">
            <form onSubmit={handleAddItem} className="flex gap-2 items-center">
              <input type="text" placeholder="Cód" className="w-20 text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={novoItem.codigo} onChange={e => setNovoItem({...novoItem, codigo: e.target.value})} />
              <input type="text" placeholder="Descrição" required className="flex-1 text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={novoItem.descricao} onChange={e => setNovoItem({...novoItem, descricao: e.target.value})} />
              <select className="w-32 text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={novoItem.tipo} onChange={e => setNovoItem({...novoItem, tipo: e.target.value})}>
                <option value="Material">Material (Geral)</option>
                {tipos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
              </select>
              <input type="text" placeholder="Un" required className="w-16 text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={novoItem.unidade} onChange={e => setNovoItem({...novoItem, unidade: e.target.value})} />
              <input type="number" placeholder="R$ Base" className="w-24 text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={novoItem.precoBaseUnitario} onChange={e => setNovoItem({...novoItem, precoBaseUnitario: e.target.value})} />
              <button type="submit" className="p-2 bg-[#00BFA5] text-white rounded-lg hover:bg-[#00a892]">
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-xs font-bold text-slate-400 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Un</th>
                  <th className="px-4 py-3 text-right">Preço Base</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {itens.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.codigo || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{item.descricao}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{item.tipo}</td>
                    <td className="px-4 py-3 text-slate-500">{item.unidade}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {item.precoBaseUnitario ? `R$ ${item.precoBaseUnitario.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
