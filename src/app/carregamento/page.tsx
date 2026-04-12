"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Plus, FileText, Calendar, User, ChevronRight, Loader2 } from "lucide-react";

export default function CarregamentoDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ev/sizing")
      .then(res => {
        if (!res.ok) throw new Error("Erro ao carregar projetos");
        return res.json();
      })
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dimensionamento VE</h1>
          <p className="text-slate-500">Gestão de projetos de infraestrutura para carregamento elétrico.</p>
        </div>
        <Link 
          href="/carregamento/novo"
          className="bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all font-bold"
        >
          <Plus className="w-5 h-5" />
          Novo Dimensionamento
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 bg-blue-100 text-[#1E3A8A] rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{projects.length}</p>
          <p className="text-sm text-slate-500 font-medium">Projetos Realizados</p>
        </div>
        {/* Adicionar mais stats aqui se necessário */}
      </div>

      <h2 className="text-xl font-bold text-slate-800 pt-4">Projetos Recentes</h2>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
          <p className="text-slate-500">Nenhum projeto de dimensionamento encontrado.</p>
          <Link href="/carregamento/novo" className="text-[#00BFA5] font-bold hover:underline mt-2 inline-block">
            Começar primeiro projeto →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#1E3A8A] transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{p.projectName}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.clientName || 'Cliente Geral'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-400 uppercase">Cabo Calculado</p>
                  <p className="text-sm font-bold text-slate-700">{p.calculatedCableGauge} mm²</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-400 uppercase">Proteção</p>
                  <p className="text-sm font-bold text-slate-700">{p.calculatedBreaker}A</p>
                </div>
                <div className="p-2 rounded-full bg-slate-50 group-hover:bg-[#00BFA5]/10 group-hover:text-[#00BFA5] transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
