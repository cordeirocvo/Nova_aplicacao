"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Building, Calendar, LayoutDashboard, ChevronRight, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OrcamentosDashboard() {
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/orcamentos")
      .then(res => res.json())
      .then(data => {
        setProjetos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleNovoProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setCriando(true);

    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/orcamentos/${data.id}`);
      } else {
        alert(data.error || "Erro ao criar projeto");
        setCriando(false);
      }
    } catch (error) {
      alert("Erro sistêmico");
      setCriando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1E3A8A] uppercase tracking-tight">Gestão de CAPEX</h1>
          <p className="text-slate-500 font-medium mt-1">Controle de orçamentos, equalização de fornecedores e saving.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/orcamentos/configuracoes")}
            className="bg-white text-slate-500 border border-slate-200 px-6 py-3 rounded-2xl font-bold shadow-sm hover:shadow-md hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            CONFIGURAÇÕES
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00BFA5] text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-[#00BFA5]/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            NOVO PROJETO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-blue-50 text-[#1E3A8A] rounded-2xl flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total de Projetos</p>
              <h3 className="text-3xl font-black text-slate-800">{projetos.length}</h3>
            </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:scale-110 transition-transform">
            <LayoutDashboard className="w-32 h-32 text-[#1E3A8A]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-widest">Projetos em Andamento</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00BFA5] transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando...</div>
        ) : projetos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum projeto encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Crie um novo projeto de orçamento para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {projetos.map((p) => (
              <Link 
                href={`/orcamentos/${p.id}`} 
                key={p.id}
                className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800">{p.nome}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase">
                        <Calendar className="w-3 h-3" /> {new Date(p.dataCriacao).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-xs font-bold text-[#00BFA5] uppercase">{p.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapas</p>
                    <p className="text-lg font-black text-slate-700">{p._count?.etapas || 0}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedores</p>
                    <p className="text-lg font-black text-slate-700">{p._count?.fornecedores || 0}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00BFA5] group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Novo Projeto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Novo Projeto de Orçamento</h2>
            <form onSubmit={handleNovoProjeto}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Projeto</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: UFV Nova Aurora 1MW"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={criando || !novoNome.trim()}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#00BFA5] text-white font-bold hover:shadow-lg hover:bg-[#00a892] transition-all disabled:opacity-50"
                  >
                    {criando ? "Criando..." : "Criar Projeto"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
