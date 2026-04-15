"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Plus, Sun, Battery, BatteryCharging, FileText, Calendar, ChevronRight, Loader2, Zap, Download } from "lucide-react";
import { ReportButton } from "@/components/engenharia/ReportButton";

const TIPO_ICONS: Record<string, React.ElementType> = {
  BESS: Battery,
  SOLAR: Sun,
  HYBRID: Zap,
  CARREGADOR: BatteryCharging,
};

const TIPO_COLORS: Record<string, string> = {
  BESS: "from-amber-500 to-orange-600",
  SOLAR: "from-yellow-400 to-amber-500",
  HYBRID: "from-[#1E3A8A] to-[#00BFA5]",
  CARREGADOR: "from-[#00BFA5] to-emerald-600",
};

export default function EngenhariaPage() {
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", cliente: "", tipo: "HYBRID" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/engenharia/projetos")
      .then(r => r.json()).then(d => { setProjetos(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newForm.nome) return;
    setSaving(true);
    const res = await fetch("/api/engenharia/projetos", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newForm),
    });
    if (res.ok) {
      const p = await res.json();
      setProjetos([p, ...projetos]);
      setShowNew(false);
      setNewForm({ nome: "", cliente: "", tipo: "HYBRID" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Engenharia & Cálculos</h1>
          <p className="text-slate-500 mt-1 text-sm">Dimensionamento BESS, Solar FV, Análise de Consumo</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all font-bold text-sm">
          <Plus className="w-5 h-5" /> Novo Projeto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: projetos.length, color: "bg-[#1E3A8A]/10 text-[#1E3A8A]" },
          { label: "Com Fatura", value: projetos.filter(p => p.analiseFatura).length, color: "bg-green-100 text-green-700" },
          { label: "Com Memória de Massa", value: projetos.filter(p => p.analiseMassa?.length > 0).length, color: "bg-amber-100 text-amber-700" },
          { label: "Rascunhos", value: projetos.filter(p => p.status === 'Rascunho').length, color: "bg-slate-100 text-slate-600" },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-2xl ${s.color} flex flex-col`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-bold mt-1 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New project modal */}
      {showNew && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
            <h2 className="text-xl font-black text-slate-800">Novo Projeto de Engenharia</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Projeto *</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm"
                  placeholder="Ex: BESS — Indústria Alfa" value={newForm.nome} onChange={e => setNewForm({ ...newForm, nome: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm"
                  placeholder="Nome do cliente" value={newForm.cliente} onChange={e => setNewForm({ ...newForm, cliente: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm bg-white"
                  value={newForm.tipo} onChange={e => setNewForm({ ...newForm, tipo: e.target.value })}>
                  <option value="HYBRID">Solar + BESS Híbrido</option>
                  <option value="SOLAR">Solar Fotovoltaico</option>
                  <option value="BESS">BESS / Armazenamento</option>
                  <option value="CARREGADOR">Carregadores VE</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !newForm.nome}
                className="flex-1 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white rounded-xl font-bold text-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Criar Projeto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects list */}
      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>
      ) : projetos.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Nenhum projeto de engenharia criado.</p>
          <button onClick={() => setShowNew(true)} className="text-[#00BFA5] font-bold mt-2 hover:underline">Criar primeiro projeto →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projetos.map(p => {
            const Icon = TIPO_ICONS[p.tipo] || Zap;
            const grad = TIPO_COLORS[p.tipo] || "from-slate-500 to-slate-700";
            return (
              <Link key={p.id} href={`/engenharia/analise-consumo?projetoId=${p.id}`}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${grad} rounded-2xl flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-[#1E3A8A] transition-colors">{p.nome}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {p.cliente && <span>{p.cliente}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex gap-3">
                    {p.analiseFatura && (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <FileText className="w-3 h-3" /> Fatura
                      </span>
                    )}
                    {p.analiseMassa?.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        <BarChart3 className="w-3 h-3" /> Massa
                      </span>
                    )}
                    {p.analiseFatura?.grupoTarifario && (
                      <span className="text-xs font-bold text-[#1E3A8A] bg-[#1E3A8A]/10 px-2 py-1 rounded-full">
                        Grupo {p.analiseFatura.grupoTarifario}{p.analiseFatura.subgrupo ? `/${p.analiseFatura.subgrupo}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-3 mr-2">
                    <ReportButton projetoId={p.id} projectName={p.nome} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#00BFA5] transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
