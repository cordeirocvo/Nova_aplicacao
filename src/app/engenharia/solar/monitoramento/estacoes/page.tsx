"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Settings, Trash, 
  ChevronLeft, Loader, Save,
  Radio, MapPin, Database, Info
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function GestaoEstacoesPage() {
  const router = useRouter();
  const [estacoes, setEstacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstacao, setEditingEstacao] = useState<any>(null);
  const [newEstacao, setNewEstacao] = useState({
    nome: "",
    apiFornecedor: "ISOFEN",
    apiId: "",
    apiKey: "",
    apiSecret: "",
    localizacao: "",
    modoColeta: "API", // API, FTP, GATEWAY
    host: "",
    porta: 21,
    usuario: "",
    senha: "",
    diretorio: ""
  });

  const fetchEstacoes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/solar/estacoes");
      const data = await res.json();
      setEstacoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar estações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstacoes();
  }, []);

  const handleEdit = (estacao: any) => {
    setEditingEstacao(estacao);
    setNewEstacao({
      nome: estacao.nome,
      apiFornecedor: estacao.apiFornecedor,
      apiId: estacao.apiId,
      apiKey: estacao.apiKey || "",
      apiSecret: estacao.apiSecret || "",
      localizacao: estacao.localizacao || "",
      modoColeta: estacao.modoColeta || "API",
      host: estacao.host || "",
      porta: estacao.porta || 21,
      usuario: estacao.usuario || "",
      senha: estacao.senha || "",
      diretorio: estacao.diretorio || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta estação?")) return;
    try {
      const res = await fetch(`/api/solar/estacoes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setEstacoes(prev => prev.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error("Erro ao deletar estação:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingEstacao ? "PUT" : "POST";
      const body = editingEstacao ? { ...newEstacao, id: editingEstacao.id } : newEstacao;
      
      const res = await fetch("/api/solar/estacoes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        // fetchEstacoes(); // Re-fetch or update local state
        router.refresh();
      }
    } catch (error) {
      console.error("Erro ao salvar estação:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 font-montserrat">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/engenharia/solar/monitoramento")}
            className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-cordeiro-orange transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-black uppercase tracking-tighter">Estações Solarimétricas</h1>
            <p className="text-sm text-slate-500 font-medium">Gerencie credenciais e hardware de campo.</p>
          </div>
        </div>

        <button 
          onClick={() => { 
            setEditingEstacao(null); 
            setNewEstacao({ nome: "", apiFornecedor: "ISOFEN", apiId: "", apiKey: "", apiSecret: "", localizacao: "", modoColeta: "API", host: "", porta: 21, usuario: "", senha: "", diretorio: "" }); 
            setIsModalOpen(true); 
          }}
          className="btn-pill bg-cordeiro-orange text-white hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Nova Estação
        </button>
      </div>

      {/* Grid de Estações ... */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader className="w-10 h-10 animate-spin text-cordeiro-orange" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-hidden">
          {estacoes.map((estacao) => (
            <div key={estacao.id} className="card-cordeiro group relative overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                 <div className="p-3 bg-orange-50 text-cordeiro-orange rounded-2xl">
                    <Radio className="w-6 h-6" />
                 </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(estacao)} className="p-2 text-slate-300 hover:text-cordeiro-orange transition-colors">
                       <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(estacao.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                       <Trash className="w-4 h-4" />
                    </button>
                  </div>
               </div>
               
               <h3 className="text-xl font-black text-black mb-1 truncate">{estacao.nome}</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 truncate">
                 {estacao.modoColeta} {estacao.modoColeta === 'API' ? `/ ${estacao.apiFornecedor}` : `/ ${estacao.host}`}
               </p>
               
               <div className="flex items-center gap-2 text-slate-500 text-sm mb-6 truncate">
                  <MapPin className="w-4 h-4 text-cordeiro-orange flex-shrink-0" />
                  <span className="truncate">{estacao.localizacao || "Localização não informada"}</span>
               </div>

               <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${estacao.modoColeta === 'API' ? 'bg-cordeiro-green' : 'bg-blue-500'} animate-pulse`} />
                     <span className={`text-[10px] font-black uppercase ${estacao.modoColeta === 'API' ? 'text-cordeiro-green' : 'text-blue-500'}`}>
                       {estacao.modoColeta}
                     </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">Hardware SIE</span>
               </div>
            </div>
          ))}

          {estacoes.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma estação cadastrada</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="bg-black p-10 text-white">
               <h3 className="text-2xl font-black uppercase tracking-tight">
                 {editingEstacao ? 'Configuração SIE Station' : 'Nova Estação Solarimétrica'}
               </h3>
               <p className="text-slate-400 text-sm mt-1 font-medium">Defina o método de coleta e autenticação.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modo de Coleta</label>
                <div className="grid grid-cols-3 gap-4">
                  {["API", "FTP", "GATEWAY"].map(mode => (
                    <button
                      key={mode} type="button"
                      onClick={() => setNewEstacao({...newEstacao, modoColeta: mode})}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${newEstacao.modoColeta === mode ? 'bg-cordeiro-orange text-white border-cordeiro-orange shadow-lg shadow-orange-500/20' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Estação</label>
                <input 
                  required
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                  placeholder="Ex: Estação Caetanópolis - MG"
                  value={newEstacao.nome}
                  onChange={e => setNewEstacao({...newEstacao, nome: e.target.value})}
                />
              </div>

              {newEstacao.modoColeta === 'API' ? (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tecnologia / API</label>
                      <select 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                        value={newEstacao.apiFornecedor}
                        onChange={e => setNewEstacao({...newEstacao, apiFornecedor: e.target.value})}
                      >
                        <option value="ISOFEN">ISO-FEN (HB500)</option>
                        <option value="PRESCINTO">Prescinto API</option>
                        <option value="HUKSEFLUX">Hukseflux Brasil</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID da Estação (Site ID)</label>
                      <input 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                        placeholder="ID no Portal"
                        value={newEstacao.apiId}
                        onChange={e => setNewEstacao({...newEstacao, apiId: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-cordeiro-orange">API Key / Access Key</label>
                      <input 
                        type="password"
                        className="w-full px-6 py-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                        placeholder="••••••••••••"
                        value={newEstacao.apiKey}
                        onChange={e => setNewEstacao({...newEstacao, apiKey: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-cordeiro-orange">API Secret / Private Key</label>
                      <input 
                        type="password"
                        className="w-full px-6 py-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                        placeholder="••••••••••••"
                        value={newEstacao.apiSecret}
                        onChange={e => setNewEstacao({...newEstacao, apiSecret: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 p-8 rounded-[2rem] space-y-6">
                  <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Database className="w-4 h-4 text-cordeiro-orange" /> Parâmetros de Conexão Local
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Host (IP / DNS)</label>
                      <input 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs"
                        value={newEstacao.host}
                        onChange={e => setNewEstacao({...newEstacao, host: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Porta</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs"
                        value={newEstacao.porta}
                        onChange={e => setNewEstacao({...newEstacao, porta: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Usuário</label>
                      <input 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs"
                        value={newEstacao.usuario}
                        onChange={e => setNewEstacao({...newEstacao, usuario: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Senha</label>
                      <input 
                        type="password"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs"
                        value={newEstacao.senha}
                        onChange={e => setNewEstacao({...newEstacao, senha: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">{newEstacao.modoColeta === 'FTP' ? 'Diretório / Path' : 'Endpoint / URL'}</label>
                    <input 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs"
                      placeholder={newEstacao.modoColeta === 'FTP' ? '/logs/daily/' : '/api/v1/sensors'}
                      value={newEstacao.diretorio}
                      onChange={e => setNewEstacao({...newEstacao, diretorio: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localização (Opcional)</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-cordeiro-orange transition-all outline-none"
                  placeholder="Cidade, UF ou Coordenadas"
                  value={newEstacao.localizacao}
                  onChange={e => setNewEstacao({...newEstacao, localizacao: e.target.value})}
                />
              </div>

              <div className="flex items-center justify-end gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors px-4">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="btn-pill bg-black text-white hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Estação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
