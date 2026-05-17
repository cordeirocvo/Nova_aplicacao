"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Settings, Trash, Link, 
  ChevronLeft, Loader, Save, Activity
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function GestaoUsinasPage() {
  const router = useRouter();
  const [usinas, setUsinas] = useState<any[]>([]);
  const [estacoes, setEstacoes] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUsina, setEditingUsina] = useState<any>(null);
  const [discoveredUsinas, setDiscoveredUsinas] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newUsina, setNewUsina] = useState({
    nome: "",
    capacidadeKWp: 0,
    apiFornecedor: "",
    apiId: "",
    apiKey: "",
    apiSecret: "",
    coefSujidade: 0.03,
    coefTemperatura: -0.0035,
    taxaDegradacao: 0.005,
    estacaoId: ""
  });

  useEffect(() => {
    fetchData();
    // Gatilho automático de sincronização ao abrir a página
    fetch("/api/solar/sync").catch(() => {});
  }, []);

  const handleSync = async () => {
    setIsDiscovering(true);
    try {
      await fetch("/api/solar/sync");
      setTimeout(() => fetchData(), 2000);
    } finally {
      setIsDiscovering(false);
    }
  };

  const fetchData = async () => {
    try {
      const [uRes, eRes, mRes] = await Promise.all([
        fetch("/api/solar/usinas"),
        fetch("/api/solar/estacoes"),
        fetch("/api/solar/manufacturers")
      ]);
      
      const uData = uRes.ok ? await uRes.json().catch(() => []) : [];
      const eData = eRes.ok ? await eRes.json().catch(() => []) : [];
      const mData = mRes.ok ? await mRes.json().catch(() => []) : [];
      
      setUsinas(Array.isArray(uData) ? uData : []);
      setEstacoes(Array.isArray(eData) ? eData : []);
      setManufacturers(Array.isArray(mData) ? mData : []);
      
      if (!uRes.ok || !eRes.ok || !mRes.ok) {
        console.warn("Algumas APIs retornaram erro, mas a página foi carregada.");
      }
    } catch (err) {
      console.error("Erro fatal ao carregar dados:", err);
      setErrorMsg("Erro de conexão com o servidor. Tente atualizar a página.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const url = editingUsina ? `/api/solar/usinas?id=${editingUsina.id}` : "/api/solar/usinas";
      const method = editingUsina ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUsina)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingUsina(null);
        setErrorMsg(null);
        fetchData();
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || "Erro desconhecido ao salvar usina");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de conexão com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscover = async () => {
    if (!newUsina.apiFornecedor) {
      alert("Selecione um fabricante primeiro.");
      return;
    }
    setIsDiscovering(true);
    setDiscoveredUsinas([]);
    setDiscoverySearch("");
    try {
      // Pega chaves se estiverem vazias
      let key = newUsina.apiKey;
      let secret = newUsina.apiSecret;
      const m = manufacturers.find(x => x.name === newUsina.apiFornecedor);
      if (m) {
        if (!key) key = m.userKey || "";
        if (!secret || secret.includes("***")) secret = m.secretKey || "";
      }

      const res = await fetch(`/api/solar/usinas/discover?fornecedor=${newUsina.apiFornecedor}&user=${key}&pass=${secret}&t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setDiscoveredUsinas(data);
      } else {
        alert("Nenhuma usina encontrada ou erro nas credenciais.");
      }
    } catch (e) {
      alert("Falha ao consultar portal.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleEdit = (usina: any) => {
    setEditingUsina(usina);
    setNewUsina({
      nome: usina.nome,
      capacidadeKWp: usina.capacidadeKWp,
      apiFornecedor: usina.apiFornecedor,
      apiId: usina.apiId,
      apiKey: usina.apiKey || "",
      apiSecret: usina.apiSecret || "",
      coefSujidade: usina.coefSujidade,
      coefTemperatura: usina.coefTemperatura,
      taxaDegradacao: usina.taxaDegradacao,
      estacaoId: usina.estacaoId || ""
    });
    setIsModalOpen(true);
  };

  return (
    <div className="w-full max-w-[100vw] px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-500 font-montserrat overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/engenharia/solar/monitoramento")} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-cordeiro-orange transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter">Gestão de Ativos</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Calibre modelos de IA e vincule estações solarimétricas.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleSync} disabled={isDiscovering} className="btn-pill bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-2 text-[10px] md:text-xs">
            {isDiscovering ? <Loader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Sincronizar Dados
          </button>
          <button onClick={() => router.push("/engenharia/solar/monitoramento/configuracoes")} className="btn-pill bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-2 text-[10px] md:text-xs">
            <Settings className="w-4 h-4" /> Configurações
          </button>
          <button onClick={() => router.push("/engenharia/solar/monitoramento/estacoes")} className="btn-pill bg-black text-white hover:bg-slate-800 flex items-center gap-2 text-[10px] md:text-xs">
            <Plus className="w-4 h-4" /> Estações
          </button>
          <button 
            onClick={() => { 
              setEditingUsina(null); 
              setNewUsina({ nome: "", capacidadeKWp: 0, apiFornecedor: "", apiId: "", apiKey: "", apiSecret: "", coefSujidade: 0.03, coefTemperatura: -0.0035, taxaDegradacao: 0.005, estacaoId: "" }); 
              setDiscoveredUsinas([]);
              setIsModalOpen(true); 
            }}
            className="btn-pill bg-cordeiro-orange text-white hover:scale-105 shadow-lg shadow-orange-500/20 flex items-center gap-2 text-[10px] md:text-xs"
          >
            <Plus className="w-5 h-5" /> Conectar Ativo
          </button>
        </div>
      </div>

      {/* Grid de Ativos */}
      {loading ? (
            <div className="flex justify-center p-20"><Loader className="w-10 h-10 animate-spin text-cordeiro-orange" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {usinas.map((usina) => (
                <UsinaCard 
                  key={usina.id} 
                  usina={usina} 
                  onUpdate={fetchData} 
                  onEdit={() => handleEdit(usina)} 
                  estacaoNome={estacoes.find(e => e.id === usina.estacaoId)?.nome}
                />
              ))}
              {usinas.length === 0 && (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                   <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                   <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma usina conectada</p>
                </div>
              )}
            </div>
          )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-black p-10 text-white">
               <h3 className="text-2xl font-black uppercase tracking-tight">{editingUsina ? 'Configuração' : 'Nova Conexão'}</h3>
               <p className="text-slate-400 text-sm mt-1 font-medium">Integração Northbound e Calibração de IA.</p>
            </div>
            
            <div className="p-10 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Usina</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={newUsina.nome} onChange={e => setNewUsina({...newUsina, nome: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidade (kWp)</label>
                  <input type="number" step="0.01" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={newUsina.capacidadeKWp} onChange={e => setNewUsina({...newUsina, capacidadeKWp: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-cordeiro-orange uppercase tracking-[0.2em] flex items-center gap-2"><Activity className="w-4 h-4" /> Descoberta Automática</h4>
                  <button onClick={handleDiscover} disabled={isDiscovering} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                    {isDiscovering ? <Loader className="w-3 h-3 animate-spin" /> : "Consultar Portal"}
                  </button>
                </div>

                {discoveredUsinas.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                    <input 
                      type="text"
                      placeholder="🔍 Buscar usina no portal..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-cordeiro-orange transition-colors"
                      value={discoverySearch}
                      onChange={e => setDiscoverySearch(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto">
                      {discoveredUsinas
                        .filter((d: any) => 
                          (d.nome || "").toLowerCase().includes(discoverySearch.toLowerCase()) ||
                          (d.id || "").toLowerCase().includes(discoverySearch.toLowerCase())
                        )
                        .map((d: any) => (
                          <button key={d.id} type="button" onClick={() => setNewUsina({...newUsina, nome: d.nome || `Usina ${d.id}`, capacidadeKWp: d.capacidade || 0, apiId: d.id})} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-all">
                            <div>
                              <p className="text-[11px] font-black text-white uppercase">{d.nome || "NOME NÃO IDENTIFICADO"}</p>
                              <span className="text-[9px] text-slate-500">ID: {d.id} | {d.capacidade} kWp</span>
                            </div>
                            <Link className="w-4 h-4 text-slate-600" />
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fabricante</label>
                    <select className="w-full px-6 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-white" value={newUsina.apiFornecedor} onChange={e => {
                      const mName = e.target.value;
                      const m = manufacturers.find(x => x.name === mName);
                      setNewUsina({...newUsina, apiFornecedor: mName, apiKey: m?.userKey || "", apiSecret: m?.secretKey ? "********" : ""});
                    }}>
                      <option value="" className="bg-slate-900">Selecione...</option>
                      {manufacturers.map(m => <option key={m.id} value={m.name} className="bg-slate-900">{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-cordeiro-orange">ID da Estação</label>
                    <input className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white" value={newUsina.apiId} onChange={e => setNewUsina({...newUsina, apiId: e.target.value})} />
                  </div>
                </div>
              </div>

              {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center uppercase">{errorMsg}</div>}

              <div className="flex flex-col gap-4">
                <button onClick={handleCreate} disabled={saving} className="w-full py-5 bg-cordeiro-orange text-white rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3">
                  {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Salvar Configurações
                </button>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-[10px] uppercase">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsinaCard({ usina, onUpdate, onEdit, estacaoNome }: { usina: any, onUpdate: () => void, onEdit: () => void, estacaoNome?: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("⚠️ Excluir permanentemente?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/solar/usinas?id=${usina.id}`, { method: "DELETE" });
      if (res.ok) onUpdate();
      else alert("Erro ao excluir");
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group">
      <div className="flex items-center justify-between mb-8">
        <span className="px-4 py-2 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">{usina.apiFornecedor}</span>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-2 text-slate-300 hover:text-cordeiro-orange"><Settings className="w-5 h-5" /></button>
          <button onClick={handleDelete} className="p-2 text-slate-300 hover:text-red-500">{isDeleting ? <Loader className="w-5 h-5 animate-spin" /> : <Trash className="w-5 h-5" />}</button>
        </div>
      </div>
      <h3 className="text-2xl font-black text-slate-800 leading-tight mb-2">{usina.nome}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">ID: {usina.apiId} {estacaoNome && `| ${estacaoNome}`}</p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 p-4 rounded-3xl">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Potência</p>
          <p className="text-base font-black text-slate-800">{usina.capacidadeKWp} kWp</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-3xl">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">CALIBRADO</p>
        </div>
      </div>
      <button onClick={() => window.location.href = `/engenharia/solar/monitoramento?id=${usina.id}`} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-cordeiro-orange transition-all">Acessar Inteligência</button>
    </div>
  );
}
