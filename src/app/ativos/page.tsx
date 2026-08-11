"use client";

import React, { useState, useEffect } from "react";
import { 
  Wrench, ShieldAlert, Clock, Coins, UserCheck, MapPin, 
  Plus, Search, Trash2, Calendar, FileText, CheckCircle2, 
  ArrowLeftRight, HelpCircle, HardHat, FileSpreadsheet, RefreshCw
} from "lucide-react";

export default function GestaoAtivosPage() {
  const [activeTab, setActiveTab] = useState<"inventario" | "horas" | "movimentacao" | "obras">("inventario");
  const [ativos, setAtivos] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({
    metrics: {
      totalAtivos: 0,
      totalPesados: 0,
      totalFerramentas: 0,
      totalEmUso: 0,
      totalCustoAcumulado: 0,
      ativosNecessitamRevisao: 0
    },
    necessitamRevisao: [],
    custosPorObra: []
  });
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");

  // New Asset Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({
    nome: "",
    codigo: "",
    categoria: "PESADO",
    taxaHoraria: "",
    horasUso: "0",
    horasManutencaoPreventiva: "",
    responsavel: "",
    localizacao: ""
  });

  // Hours Logging Form State
  const [selectedAssetForHours, setSelectedAssetForHours] = useState("");
  const [hoursForm, setHoursForm] = useState({
    horasTrabalhadas: "",
    obra: "",
    responsavel: "",
    observacoes: "",
    dataUso: new Date().toISOString().split("T")[0]
  });

  // Tool Checkout/Return Form State
  const [selectedAssetForMove, setSelectedAssetForMove] = useState("");
  const [moveForm, setMoveForm] = useState({
    tipo: "SAIDA", // SAIDA ou RETORNO
    responsavel: "",
    destino: "",
    observacoes: "",
    data: new Date().toISOString().split("T")[0]
  });

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAtivos, resDashboard] = await Promise.all([
        fetch("/api/ativos"),
        fetch("/api/ativos/dashboard")
      ]);
      if (resAtivos.ok) {
        const data = await resAtivos.json();
        setAtivos(data);
      }
      if (resDashboard.ok) {
        const data = await resDashboard.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Erro ao buscar dados de ativos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!newAsset.nome || !newAsset.codigo) {
      setFormError("Nome e Código são obrigatórios.");
      return;
    }

    try {
      const res = await fetch("/api/ativos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset)
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Ativo cadastrado com sucesso!");
        setNewAsset({
          nome: "",
          codigo: "",
          categoria: "PESADO",
          taxaHoraria: "",
          horasUso: "0",
          horasManutencaoPreventiva: "",
          responsavel: "",
          localizacao: ""
        });
        setShowAddForm(false);
        fetchData();
      } else {
        setFormError(data.error || "Erro ao cadastrar ativo.");
      }
    } catch (err) {
      setFormError("Erro de conexão com o servidor.");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este ativo? Todos os históricos associados serão apagados.")) return;
    try {
      const res = await fetch(`/api/ativos/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        alert("Erro ao excluir ativo.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!selectedAssetForHours || !hoursForm.horasTrabalhadas || !hoursForm.obra || !hoursForm.responsavel) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const res = await fetch(`/api/ativos/${selectedAssetForHours}/uso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hoursForm)
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Horas de uso registradas com sucesso!");
        setHoursForm({
          horasTrabalhadas: "",
          obra: "",
          responsavel: "",
          observacoes: "",
          dataUso: new Date().toISOString().split("T")[0]
        });
        setSelectedAssetForHours("");
        fetchData();
      } else {
        setFormError(data.error || "Erro ao registrar horas.");
      }
    } catch (err) {
      setFormError("Erro de conexão com o servidor.");
    }
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!selectedAssetForMove || !moveForm.responsavel) {
      setFormError("Responsável é obrigatório.");
      return;
    }

    try {
      const res = await fetch(`/api/ativos/${selectedAssetForMove}/movimentacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moveForm)
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Movimentação registrada com sucesso!");
        setMoveForm({
          tipo: "SAIDA",
          responsavel: "",
          destino: "",
          observacoes: "",
          data: new Date().toISOString().split("T")[0]
        });
        setSelectedAssetForMove("");
        fetchData();
      } else {
        setFormError(data.error || "Erro ao registrar movimentação.");
      }
    } catch (err) {
      setFormError("Erro de conexão.");
    }
  };

  const filteredAtivos = ativos.filter(ativo => {
    const matchesSearch = ativo.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ativo.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (ativo.localizacao && ativo.localizacao.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategoria = filterCategoria === "TODOS" || ativo.categoria === filterCategoria;
    const matchesStatus = filterStatus === "TODOS" || ativo.status === filterStatus;
    
    return matchesSearch && matchesCategoria && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Title Header */}
      <div className="flex justify-between items-center bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            <Wrench className="w-8 h-8 text-[#f15a24]" /> Gestão de Ativos
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Controle de máquinas pesadas, ferramentas, horas operacionais, custos e manutenção preventiva de canteiros.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all border border-slate-100"
          title="Recarregar dados"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Ativos</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{dashboardData.metrics.totalAtivos}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#f15a24]/10 text-[#f15a24] rounded-2xl">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Máquinas Ativas</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{dashboardData.metrics.totalPesados}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#f15a24]/20 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#f15a24]/10 text-[#f15a24] rounded-2xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revisão Pendente</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{dashboardData.metrics.ativosNecessitamRevisao}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#00BFA5]/10 text-[#00BFA5] rounded-2xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custo de Operação</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dashboardData.metrics.totalCustoAcumulado)}
            </h3>
          </div>
        </div>

      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setActiveTab("inventario"); setFormError(""); setFormSuccess(""); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap text-sm ${
            activeTab === "inventario" 
              ? "bg-[#0a192f] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" /> Inventário de Ativos
        </button>

        <button
          onClick={() => { setActiveTab("horas"); setFormError(""); setFormSuccess(""); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap text-sm ${
            activeTab === "horas" 
              ? "bg-[#0a192f] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" /> Registro de Uso (Horas)
        </button>

        <button
          onClick={() => { setActiveTab("movimentacao"); setFormError(""); setFormSuccess(""); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap text-sm ${
            activeTab === "movimentacao" 
              ? "bg-[#0a192f] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" /> Movimentação de Ferramentas
        </button>

        <button
          onClick={() => { setActiveTab("obras"); setFormError(""); setFormSuccess(""); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap text-sm ${
            activeTab === "obras" 
              ? "bg-[#0a192f] text-white shadow-lg" 
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
          }`}
        >
          <Coins className="w-4 h-4" /> Custos por Obra
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {formError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-2xl text-xs font-bold text-red-700">
          {formError}
        </div>
      )}
      {formSuccess && (
        <div className="bg-green-50 border-l-4 border-[#00BFA5] p-4 rounded-2xl text-xs font-bold text-green-700">
          {formSuccess}
        </div>
      )}

      {/* ================= INVENTARIO TAB ================= */}
      {activeTab === "inventario" && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex flex-1 items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome, tag ou obra..." 
                className="bg-transparent border-none outline-none text-xs font-semibold text-slate-800 w-full placeholder-slate-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select 
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value)}
              >
                <option value="TODOS">Todas as Categorias</option>
                <option value="PESADO">Equipamentos Pesados</option>
                <option value="FERRAMENTA">Ferramentas Manuais</option>
              </select>

              <select 
                className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="TODOS">Todos os Status</option>
                <option value="DISPONIVEL">Disponível</option>
                <option value="EM_USO">Em Uso</option>
                <option value="MANUTENCAO">Em Manutenção</option>
              </select>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Novo Ativo
              </button>
            </div>
          </div>

          {/* Collapsible Form for New Asset */}
          {showAddForm && (
            <form onSubmit={handleAddAsset} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top duration-300">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome do Equipamento / Ferramenta *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Retroescavadeira CAT 320"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={newAsset.nome}
                  onChange={e => setNewAsset({...newAsset, nome: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Código / Tag Única *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: RET-001"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={newAsset.codigo}
                  onChange={e => setNewAsset({...newAsset, codigo: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Categoria *</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={newAsset.categoria}
                  onChange={e => setNewAsset({...newAsset, categoria: e.target.value})}
                >
                  <option value="PESADO">Equipamento Pesado</option>
                  <option value="FERRAMENTA">Ferramenta Manual</option>
                </select>
              </div>

              {newAsset.categoria === "PESADO" ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Taxa Horária de Uso (R$/h)</label>
                    <input 
                      type="number"
                      placeholder="Ex: 150"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newAsset.taxaHoraria}
                      onChange={e => setNewAsset({...newAsset, taxaHoraria: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas Iniciais de Uso</label>
                    <input 
                      type="number"
                      placeholder="Ex: 0"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newAsset.horasUso}
                      onChange={e => setNewAsset({...newAsset, horasUso: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas para Revisão Preventiva</label>
                    <input 
                      type="number"
                      placeholder="Ex: 250"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newAsset.horasManutencaoPreventiva}
                      onChange={e => setNewAsset({...newAsset, horasManutencaoPreventiva: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Responsável Inicial</label>
                    <input 
                      type="text"
                      placeholder="Ex: João da Silva"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newAsset.responsavel}
                      onChange={e => setNewAsset({...newAsset, responsavel: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Localização Atual</label>
                    <input 
                      type="text"
                      placeholder="Ex: Almoxarifado Principal"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newAsset.localizacao}
                      onChange={e => setNewAsset({...newAsset, localizacao: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#00BFA5] hover:bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          )}

          {/* Assets Cards list */}
          {loading ? (
            <div className="flex justify-center p-12 text-slate-500">
              Carregando ativos cadastrados...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAtivos.map((ativo) => {
                const needsMaintenance = 
                  ativo.categoria === "PESADO" && 
                  ativo.horasManutencaoPreventiva && 
                  ativo.horasUso >= ativo.horasManutencaoPreventiva;

                return (
                  <div key={ativo.id} className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden ${needsMaintenance ? "border-l-4 border-l-red-500" : ""}`}>
                    
                    {/* Header: Name and Category badge */}
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-black uppercase text-[#f15a24] bg-[#f15a24]/10 px-2 py-0.5 rounded-md">
                            {ativo.categoria === "PESADO" ? "Equipamento Pesado" : "Ferramenta"}
                          </span>
                          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mt-1">{ativo.nome}</h3>
                          <p className="text-[10px] font-bold text-slate-400 font-mono">{ativo.codigo}</p>
                        </div>
                        
                        {/* Status tag */}
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                          ativo.status === "DISPONIVEL" 
                            ? "bg-green-50 text-green-700" 
                            : ativo.status === "EM_USO"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {ativo.status === "DISPONIVEL" ? "Disponível" : ativo.status === "EM_USO" ? "Em Uso" : "Revisão"}
                        </span>
                      </div>

                      {/* Technical specifications */}
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        {ativo.categoria === "PESADO" ? (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">Taxa Horária:</span>
                              <span className="text-slate-700 font-black">R$ {ativo.taxaHoraria || 0}/h</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">Horas Acumuladas:</span>
                              <span className="text-slate-700 font-black">{ativo.horasUso} h</span>
                            </div>
                            {ativo.horasManutencaoPreventiva && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400 font-bold">Próxima Revisão:</span>
                                  <span className={`font-black ${needsMaintenance ? "text-red-500 animate-pulse" : "text-slate-700"}`}>
                                    {ativo.horasManutencaoPreventiva} h
                                  </span>
                                </div>
                                {/* Progress bar */}
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${needsMaintenance ? "bg-red-500" : "bg-[#00BFA5]"}`} 
                                    style={{ width: `${Math.min(100, (ativo.horasUso / ativo.horasManutencaoPreventiva) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">Responsável:</span>
                              <span className="text-slate-700 font-black">{ativo.responsavel || "Ninguém"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">Localização:</span>
                              <span className="text-slate-700 font-black">{ativo.localizacao || "Almoxarifado"}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Operational Details Summary & Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custo Logado</span>
                        <span className="text-xs font-black text-slate-800">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ativo.ultimoCustoHoras || 0)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {ativo.categoria === "PESADO" ? (
                          <button
                            onClick={() => { setSelectedAssetForHours(ativo.id); setActiveTab("horas"); }}
                            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <Clock className="w-3 h-3" /> Horas
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedAssetForMove(ativo.id); setMoveForm({...moveForm, tipo: ativo.status === "EM_USO" ? "RETORNO" : "SAIDA"}); setActiveTab("movimentacao"); }}
                            className="bg-[#00BFA5] hover:bg-teal-600 text-white font-bold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <ArrowLeftRight className="w-3 h-3" /> Movimentar
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteAsset(ativo.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Excluir Ativo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>

                    {/* Warning overlay badge for Maintenance */}
                    {needsMaintenance && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase animate-pulse shadow-sm">
                        <ShieldAlert className="w-2.5 h-2.5" /> REVISÃO
                      </div>
                    )}

                  </div>
                );
              })}
              
              {filteredAtivos.length === 0 && (
                <div className="col-span-full bg-white p-12 text-center text-slate-400 italic rounded-3xl border border-slate-100">
                  Nenhum ativo encontrado com os critérios informados.
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ================= HORAS TAB (MAQUINAS PESADAS) ================= */}
      {activeTab === "horas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Hours Input Form Panel */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <form onSubmit={handleLogHours} className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Lançar Horas Trabalhadas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Informe o tempo de operação para calcular o custo operacional e atualizar as horas.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Selecionar Máquina Pesada *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={selectedAssetForHours}
                  onChange={e => setSelectedAssetForHours(e.target.value)}
                >
                  <option value="">Selecione um Equipamento...</option>
                  {ativos.filter(a => a.categoria === "PESADO").map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nome} - Tag: {a.codigo} (R$ {a.taxaHoraria || 0}/h)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas Operadas *</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    placeholder="Ex: 8.5"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={hoursForm.horasTrabalhadas}
                    onChange={e => setHoursForm({...hoursForm, horasTrabalhadas: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data do Uso *</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={hoursForm.dataUso}
                    onChange={e => setHoursForm({...hoursForm, dataUso: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Obra / Canteiro *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Obra Curvelo Centro"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={hoursForm.obra}
                  onChange={e => setHoursForm({...hoursForm, obra: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Operador Responsável *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={hoursForm.responsavel}
                  onChange={e => setHoursForm({...hoursForm, responsavel: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Serviços de terraplenagem e cercamento lateral."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                  value={hoursForm.observacoes}
                  onChange={e => setHoursForm({...hoursForm, observacoes: e.target.value})}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md mt-2"
              >
                Registrar e Atualizar Custo
              </button>
            </form>
          </div>

          {/* Hours History Logs Grid */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Histórico Recente de Lançamentos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Últimos logs operacionais e custos vinculados a cada obra.</p>
            </div>

            <div className="mt-4 flex-1 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-100 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="p-3 text-left">Equipamento</th>
                    <th className="p-3 text-left">Obra</th>
                    <th className="p-3 text-center">Horas</th>
                    <th className="p-3 text-right">Custo Calculado</th>
                    <th className="p-3 text-left">Operador</th>
                    <th className="p-3 text-center">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {ativos.flatMap(ativo => 
                    (ativo.historicoUso || []).map((uso: any) => ({
                      ...uso,
                      ativoNome: ativo.nome,
                      ativoCodigo: ativo.codigo
                    }))
                  )
                  .sort((a, b) => new Date(b.dataUso).getTime() - new Date(a.dataUso).getTime())
                  .slice(0, 10)
                  .map((log: any) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 text-slate-800 font-bold">{log.ativoNome} <span className="text-[10px] text-slate-400 font-normal">({log.ativoCodigo})</span></td>
                      <td className="p-3 text-slate-600 font-semibold">{log.obra}</td>
                      <td className="p-3 text-center text-slate-800 font-black">{log.horasTrabalhadas} h</td>
                      <td className="p-3 text-right text-[#f15a24] font-black">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(log.custoCalculado)}
                      </td>
                      <td className="p-3 text-slate-600">{log.responsavel}</td>
                      <td className="p-3 text-center text-slate-400 font-medium">
                        {new Date(log.dataUso).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {ativos.every(a => !a.historicoUso || a.historicoUso.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                        Nenhum registro de horas encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= MOVIMENTACAO TAB ================= */}
      {activeTab === "movimentacao" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Movement Input Form Panel */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <form onSubmit={handleRegisterMovement} className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Registrar Movimentação</h3>
                <p className="text-xs text-slate-500 mt-0.5">Faça o controle de retirada (Saída) e retorno de ferramentas no almoxarifado.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Selecionar Ferramenta *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={selectedAssetForMove}
                  onChange={e => setSelectedAssetForMove(e.target.value)}
                >
                  <option value="">Selecione uma Ferramenta...</option>
                  {ativos.filter(a => a.categoria === "FERRAMENTA").map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nome} - Tag: {a.codigo} ({a.status === "EM_USO" ? "Em Uso" : "Disponível"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de Operação *</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={moveForm.tipo}
                    onChange={e => setMoveForm({...moveForm, tipo: e.target.value})}
                  >
                    <option value="SAIDA">Retirada (Saída)</option>
                    <option value="RETORNO">Retorno (Devolução)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data *</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={moveForm.data}
                    onChange={e => setMoveForm({...moveForm, data: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Responsável / Colaborador *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={moveForm.responsavel}
                  onChange={e => setMoveForm({...moveForm, responsavel: e.target.value})}
                />
              </div>

              {moveForm.tipo === "SAIDA" && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Destino / Obra de Utilização *</label>
                  <input 
                    type="text"
                    required={moveForm.tipo === "SAIDA"}
                    placeholder="Ex: Obra Curvelo Norte"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={moveForm.destino}
                    onChange={e => setMoveForm({...moveForm, destino: e.target.value})}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Devolvido com maleta e cabos limpos."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                  value={moveForm.observacoes}
                  onChange={e => setMoveForm({...moveForm, observacoes: e.target.value})}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#00BFA5] hover:bg-[#00BFA5]/90 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md mt-2"
              >
                Confirmar Lançamento
              </button>
            </form>
          </div>

          {/* Movement Logs History Grid */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Histórico de Movimentações (Almoxarifado)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Histórico completo de checkouts e checkins de ferramentas.</p>
            </div>

            <div className="mt-4 flex-1 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-100 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="p-3 text-left">Ferramenta</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-left">Responsável</th>
                    <th className="p-3 text-left">Destino / Localização</th>
                    <th className="p-3 text-center">Data</th>
                    <th className="p-3 text-left">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {ativos.flatMap(ativo => 
                    (ativo.movimentacoes || []).map((mov: any) => ({
                      ...mov,
                      ativoNome: ativo.nome,
                      ativoCodigo: ativo.codigo
                    }))
                  )
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .slice(0, 10)
                  .map((log: any) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 text-slate-800 font-bold">{log.ativoNome} <span className="text-[10px] text-slate-400 font-normal">({log.ativoCodigo})</span></td>
                      <td className="p-3 text-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          log.tipo === "SAIDA" 
                            ? "bg-blue-50 text-blue-700" 
                            : "bg-green-50 text-green-700"
                        }`}>
                          {log.tipo === "SAIDA" ? "Saída" : "Retorno"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-semibold">{log.responsavel}</td>
                      <td className="p-3 text-slate-600">{log.destino}</td>
                      <td className="p-3 text-center text-slate-400 font-medium">
                        {new Date(log.data).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 text-slate-400 text-[10px] italic max-w-xs truncate">{log.observacoes || "-"}</td>
                    </tr>
                  ))}
                  {ativos.every(a => !a.movimentacoes || a.movimentacoes.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                        Nenhuma movimentação registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= COSTS BY PROJECT TAB ================= */}
      {activeTab === "obras" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Costs Aggregated Table */}
          <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Custos Operacionais de Equipamentos por Obra</h3>
              <p className="text-xs text-slate-500 mt-0.5">Demonstrativo consolidado de despesas com maquinário por canteiro de obras.</p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-100 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="p-4 text-left">Nome da Obra / Projeto</th>
                    <th className="p-4 text-right">Custos Totais Logados (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.custosPorObra.map((costGroup: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 text-slate-800 font-bold text-sm">{costGroup.obra}</td>
                      <td className="p-4 text-right text-[#f15a24] font-black text-sm">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(costGroup.totalCusto)}
                      </td>
                    </tr>
                  ))}
                  {dashboardData.custosPorObra.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-12 text-center text-slate-400 italic">
                        Nenhum custo por obra registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maintenance list panel */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight text-red-500 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Revisões Pendentes
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Máquinas que atingiram a marca horária recomendada e necessitam de inspeção imediata.</p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {dashboardData.necessitamRevisao.map((ativo: any) => (
                  <div key={ativo.id} className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 uppercase text-xs">{ativo.nome}</h4>
                      <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-mono">{ativo.codigo}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Horas Acumuladas:</span>
                      <span className="text-slate-800 font-black">{ativo.horasUso} h</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Limite Recomendado:</span>
                      <span className="text-red-600 font-black">{ativo.horasManutencaoPreventiva} h</span>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={async () => {
                          if (confirm(`Confirmar que a manutenção preventiva de ${ativo.nome} foi concluída e resetar contador?`)) {
                            // Reset next limit adding 250 hours or double the current recommendation
                            const nextLimit = (ativo.horasManutencaoPreventiva || 250) + 250;
                            const res = await fetch(`/api/ativos/${ativo.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ horasManutencaoPreventiva: nextLimit })
                            });
                            if (res.ok) {
                              fetchData();
                            }
                          }
                        }}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-[10px] uppercase transition-all cursor-pointer"
                      >
                        Marcar Manutenção Concluída
                      </button>
                    </div>
                  </div>
                ))}
                
                {dashboardData.necessitamRevisao.length === 0 && (
                  <div className="p-8 text-center text-slate-400 italic text-xs">
                    Nenhuma máquina necessitando revisão no momento.
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
              <strong>Nota Preventiva:</strong> A revisão periódica ajuda a prolongar a vida útil de escavadeiras e perfuratrizes e previne paradas imprevistas no canteiro de obras.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
