"use client";

import { useState, useEffect } from "react";
import { 
  ChevronLeft, Save, Trash, Plus, 
  Loader, Database, Globe, Key, RefreshCw, Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ConfigSolarPage() {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newBrand, setNewBrand] = useState({
    name: "",
    userKey: "",
    secretKey: "",
    apiUrl: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/solar/manufacturers");
      const data = await res.json();
      setManufacturers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/solar/manufacturers/seed");
      if (res.ok) {
        await fetchData();
      } else {
        alert("Erro ao restaurar fabricantes padrão");
      }
    } catch (e) {
      alert("Erro de conexão com o servidor");
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.name) return;
    
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/solar/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBrand)
      });
      
      if (res.ok) {
        setNewBrand({ name: "", userKey: "", secretKey: "", apiUrl: "" });
        fetchData();
      } else {
        const d = await res.json();
        setError(d.error || "Erro ao salvar fabricante");
      }
    } catch (err) {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este fabricante? As chaves globais serão removidas.")) return;
    try {
      await fetch(`/api/solar/manufacturers?id=${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert("Erro ao excluir");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-montserrat">
      {/* Header Fixo */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                Configurações de APIs de Monitoramento
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Gerenciamento Global de Credenciais (Huawei, Solis, Canadian, Hoymiles, Fronius, Sungrow, SMA, Deye, etc.)
              </p>
            </div>
          </div>

          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {seeding ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-600" />}
            Restaurar Lista Padrão de Fabricantes
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-12 space-y-12">
        
        {/* Formulário de Cadastro */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cordeiro-orange/10 rounded-xl">
                <Plus className="w-5 h-5 text-cordeiro-orange" />
              </div>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Cadastrar / Configurar API de Fabricante</h2>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Fabricante / Plataforma *</label>
                <input 
                  required
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold uppercase focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                  placeholder="HUAWEI, SOLIS, CANADIAN_SOLAR, HOYMILES, FRONIUS, SUNGROW..."
                  value={newBrand.name}
                  onChange={e => setNewBrand({...newBrand, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Base da API (Opcional)</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                  placeholder="https://api.plataforma.com/v1"
                  value={newBrand.apiUrl}
                  onChange={e => setNewBrand({...newBrand, apiUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário / App Key Global</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                  placeholder="Chave pública ou usuário"
                  value={newBrand.userKey}
                  onChange={e => setNewBrand({...newBrand, userKey: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha / App Secret Global</label>
                <input 
                  type="password"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                  placeholder="Chave secreta ou senha"
                  value={newBrand.secretKey}
                  onChange={e => setNewBrand({...newBrand, secretKey: e.target.value})}
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 font-bold uppercase text-center">{error}</p>}

            <div className="flex justify-center pt-4">
              <button 
                type="submit"
                disabled={saving}
                className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Credenciais da API
              </button>
            </div>
          </form>
        </section>

        {/* Lista de Fabricantes Ativos */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Sistemas de Monitoramento Cadastrados</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{manufacturers.length} Fabricantes</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="h-40 flex items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                <Loader className="w-6 h-6 text-slate-300 animate-spin" />
              </div>
            ) : manufacturers.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 gap-3">
                <Database className="w-8 h-8 text-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum fabricante cadastrado</p>
                <button onClick={handleSeedDefaults} className="text-xs text-cordeiro-orange font-bold hover:underline">
                  Clique aqui para carregar lista padrão
                </button>
              </div>
            ) : (
              manufacturers.map((m: any) => (
                <div key={m.id} className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-slate-900 text-amber-400 rounded-3xl flex items-center justify-center font-black text-lg shadow-lg shadow-slate-200">
                      {m.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 uppercase tracking-tighter">{m.name}</h4>
                      <div className="flex flex-wrap items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          {m.apiUrl || "URL Padrão"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          {m.userKey ? `User/Key: ${m.userKey}` : "Sem Chave Configurada"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewBrand({
                          name: m.name,
                          userKey: m.userKey || "",
                          secretKey: m.secretKey ? "********" : "",
                          apiUrl: m.apiUrl || ""
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(m.id)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
