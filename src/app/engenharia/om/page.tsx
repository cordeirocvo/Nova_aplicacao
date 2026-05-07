"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, AlertTriangle, CheckCircle2, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function OMDashboard() {
  const [usinas, setUsinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newUsina, setNewUsina] = useState({ nome: "", localizacao: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resUsinas = await fetch("/api/engenharia/om/usinas");
      const dataUsinas = await resUsinas.json();
      setUsinas(dataUsinas);

      const resProjetos = await fetch("/api/engenharia/projetos");
      const dataProjetos = await resProjetos.json();
      setProjetos(dataProjetos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newUsina.nome) return;
    try {
      await fetch("/api/engenharia/om/usinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUsina),
      });
      setShowNewModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Settings className="text-blue-500 w-8 h-8" /> 
            Operação e Manutenção (O&M)
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Gerenciamento de ativos, manutenções preventivas, corretivas e preditivas das Usinas Fotovoltaicas.
          </p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Usina
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(usinas) ? usinas.map((usina) => (
            <Link key={usina.id} href={`/engenharia/om/${usina.id}`} className="group">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{usina.nome}</h3>
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {usina.localizacao || "Local não informado"}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                    <Settings className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Equipamentos Cadastrados</span>
                    <span className="font-bold text-slate-700">{usina._count?.equipamentos}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Total de Manutenções</span>
                    <span className="font-bold text-slate-700">{usina._count?.manutencoes}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                   <span className="text-blue-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                     Acessar Painel da Usina →
                   </span>
                </div>
              </div>
            </Link>
          )) : (
            <div className="col-span-full p-8 text-center text-red-500 font-bold bg-red-50 rounded-2xl border border-red-100">
              Erro ao carregar usinas. Verifique o console do servidor.
            </div>
          )}
          {Array.isArray(usinas) && usinas.length === 0 && (
            <div className="col-span-full bg-blue-50/50 rounded-3xl p-12 border-2 border-dashed border-blue-100 text-center">
              <Settings className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-blue-900 mb-2">Nenhuma usina cadastrada</h3>
              <p className="text-blue-600/70 mb-6">Comece cadastrando uma nova usina para gerenciar suas manutenções.</p>
              <button 
                onClick={() => setShowNewModal(true)}
                className="bg-white text-blue-600 px-6 py-2 rounded-xl font-bold shadow-sm hover:shadow-md transition-all"
              >
                Cadastrar Primeira Usina
              </button>
            </div>
          )}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">Nova Usina</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Usina</label>
                <input 
                  type="text" 
                  placeholder="Ex: Parque Solar Sun Invest"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  value={newUsina.nome}
                  onChange={e => setNewUsina({...newUsina, nome: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localização</label>
                <input 
                  type="text" 
                  placeholder="Ex: Linhares - ES"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  value={newUsina.localizacao}
                  onChange={e => setNewUsina({...newUsina, localizacao: e.target.value})}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-3 text-slate-500 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={!newUsina.nome} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Criar Usina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
