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

  // Obras do CAPEX list state
  const [capexProjects, setCapexProjects] = useState<any[]>([]);

  // New Asset Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({
    nome: "",
    codigo: "",
    categoria: "PESADO",
    tipoCusto: "HORARIO",
    valorCusto: "",
    taxaHoraria: "",
    custoDiario: "",
    custoSemanal: "",
    custoMensal: "",
    possuiHorimetro: true,
    horasUso: "0",
    horasManutencaoPreventiva: "",
    responsavel: "",
    localizacao: "",
    tipoPropriedade: "PROPRIO",
    contratoAluguelUrl: ""
  });

  // Hours Logging Form State
  const [selectedAssetForHours, setSelectedAssetForHours] = useState("");
  const [hoursForm, setHoursForm] = useState({
    horasTrabalhadas: "",
    horimetroInicio: "",
    horimetroFim: "",
    obra: "",
    responsavel: "",
    observacoes: "",
    dataUso: new Date().toISOString().split("T")[0],
    fotoHorimetroInicioUrl: "",
    fotoHorimetroFimUrl: ""
  });

  // Fuel Logging Form State
  const [selectedAssetForFuel, setSelectedAssetForFuel] = useState("");
  const [fuelForm, setFuelForm] = useState({
    litros: "",
    precoPorLitro: "",
    horimetro: "",
    obra: "",
    responsavel: "",
    observacoes: "",
    data: new Date().toISOString().split("T")[0]
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
  const [historyTab, setHistoryTab] = useState<"uso" | "combustivel">("uso");
  const [obrasSubTab, setObrasSubTab] = useState<"capex" | "horas">("capex");
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [editingLogType, setEditingLogType] = useState<"uso" | "combustivel" | null>(null);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (file: File): Promise<string | null> => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        return data.url;
      } else {
        alert(data.error || "Erro ao fazer upload do arquivo.");
        return null;
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar arquivo.");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAtivos, resDashboard, resCapex] = await Promise.all([
        fetch("/api/ativos"),
        fetch("/api/ativos/dashboard"),
        fetch("/api/orcamentos")
      ]);
      if (resAtivos.ok) {
        const data = await resAtivos.json();
        setAtivos(data);
      }
      if (resDashboard.ok) {
        const data = await resDashboard.json();
        setDashboardData(data);
      }
      if (resCapex.ok) {
        const data = await resCapex.json();
        setCapexProjects(data);
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
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: "Erro no servidor ao cadastrar ativo." }; }

      if (res.ok) {
        setFormSuccess("Ativo cadastrado com sucesso!");
        setNewAsset({
          nome: "",
          codigo: "",
          categoria: "PESADO",
          tipoCusto: "HORARIO",
          valorCusto: "",
          taxaHoraria: "",
          custoDiario: "",
          custoSemanal: "",
          custoMensal: "",
          possuiHorimetro: true,
          horasUso: "0",
          horasManutencaoPreventiva: "",
          responsavel: "",
          localizacao: "",
          tipoPropriedade: "PROPRIO",
          contratoAluguelUrl: ""
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

    let calculatedHours = hoursForm.horasTrabalhadas;
    if (hoursForm.horimetroInicio && hoursForm.horimetroFim) {
      const diff = parseFloat(hoursForm.horimetroFim) - parseFloat(hoursForm.horimetroInicio);
      if (diff < 0) {
        setFormError("O horímetro final deve ser maior ou igual ao horímetro inicial.");
        return;
      }
      calculatedHours = diff.toString();
    }

    if (!selectedAssetForHours || !calculatedHours || !hoursForm.obra || !hoursForm.responsavel) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const res = await fetch(`/api/ativos/${selectedAssetForHours}/uso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...hoursForm,
          horasTrabalhadas: calculatedHours
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Horas de uso registradas com sucesso!");
        setHoursForm({
          horasTrabalhadas: "",
          horimetroInicio: "",
          horimetroFim: "",
          obra: "",
          responsavel: "",
          observacoes: "",
          dataUso: new Date().toISOString().split("T")[0],
          fotoHorimetroInicioUrl: "",
          fotoHorimetroFimUrl: ""
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

  const handleLogFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!selectedAssetForFuel || !fuelForm.litros || !fuelForm.precoPorLitro || !fuelForm.obra || !fuelForm.responsavel) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const res = await fetch(`/api/ativos/${selectedAssetForFuel}/combustivel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fuelForm)
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Abastecimento de combustível registrado com sucesso!");
        setFuelForm({
          litros: "",
          precoPorLitro: "",
          horimetro: "",
          obra: "",
          responsavel: "",
          observacoes: "",
          data: new Date().toISOString().split("T")[0]
        });
        setSelectedAssetForFuel("");
        fetchData();
      } else {
        setFormError(data.error || "Erro ao registrar abastecimento.");
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

  const handleDeleteHoursLog = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento de horas? Os custos e o horômetro do ativo serão deduzidos automaticamente.")) return;
    try {
      const res = await fetch(`/api/ativos/uso/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFormSuccess("Lançamento de horas excluído!");
        fetchData();
      } else {
        alert("Erro ao excluir lançamento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFuelLog = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este abastecimento? O custo associado será deduzido do ativo.")) return;
    try {
      const res = await fetch(`/api/ativos/combustivel/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFormSuccess("Abastecimento excluído com sucesso!");
        fetchData();
      } else {
        alert("Erro ao excluir abastecimento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!editingLog || !editingLogType) return;

    try {
      const endpoint = editingLogType === "uso" 
        ? `/api/ativos/uso/${editingLog.id}` 
        : `/api/ativos/combustivel/${editingLog.id}`;

      let calculatedHours = editingLog.horasTrabalhadas;
      if (editingLogType === "uso" && editingLog.horimetroInicio && editingLog.horimetroFim) {
        const diff = parseFloat(editingLog.horimetroFim) - parseFloat(editingLog.horimetroInicio);
        if (diff >= 0) {
          calculatedHours = diff.toString();
        }
      }

      const bodyPayload = editingLogType === "uso" 
        ? {
            horasTrabalhadas: calculatedHours,
            horimetroInicio: editingLog.horimetroInicio,
            horimetroFim: editingLog.horimetroFim,
            obra: editingLog.obra,
            responsavel: editingLog.responsavel,
            observacoes: editingLog.observacoes,
            dataUso: editingLog.dataUso
          }
        : {
            litros: editingLog.litros,
            precoPorLitro: editingLog.precoPorLitro,
            horimetro: editingLog.horimetro,
            obra: editingLog.obra,
            responsavel: editingLog.responsavel,
            observacoes: editingLog.observacoes,
            data: editingLog.data
          };

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Lançamento atualizado com sucesso!");
        setEditingLog(null);
        setEditingLogType(null);
        fetchData();
      } else {
        setFormError(data.error || "Erro ao atualizar lançamento.");
      }
    } catch (err) {
      setFormError("Erro de conexão.");
    }
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!editingAsset) return;

    try {
      const res = await fetch(`/api/ativos/${editingAsset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAsset)
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Configuração do ativo atualizada com sucesso!");
        setEditingAsset(null);
        fetchData();
      } else {
        setFormError(data.error || "Erro ao atualizar ativo.");
      }
    } catch (err) {
      setFormError("Erro de conexão.");
    }
  };

  const getObrasReportData = () => {
    const reportMap: {
      [obraName: string]: {
        obra: string;
        custoProprio: number;
        custoAlugado: number;
        custoCombustivel: number;
        horasProprio: number;
        horasAlugado: number;
        totalCusto: number;
        maquinas: {
          [ativoId: string]: {
            nome: string;
            codigo: string;
            tipoPropriedade: string;
            horas: number;
            custo: number;
          }
        }
      }
    } = {};

    ativos.forEach(ativo => {
      // Group hours usage
      (ativo.historicoUso || []).forEach((uso: any) => {
        const obraName = uso.obra || "Geral - Sem Obra";
        if (!reportMap[obraName]) {
          reportMap[obraName] = {
            obra: obraName,
            custoProprio: 0,
            custoAlugado: 0,
            custoCombustivel: 0,
            horasProprio: 0,
            horasAlugado: 0,
            totalCusto: 0,
            maquinas: {}
          };
        }

        const isAlugado = ativo.tipoPropriedade === "ALUGADO";
        const horas = uso.horasTrabalhadas || 0;
        const custo = uso.custoCalculado || 0;

        if (isAlugado) {
          reportMap[obraName].custoAlugado += custo;
          reportMap[obraName].horasAlugado += horas;
        } else {
          reportMap[obraName].custoProprio += custo;
          reportMap[obraName].horasProprio += horas;
        }
        reportMap[obraName].totalCusto += custo;

        if (!reportMap[obraName].maquinas[ativo.id]) {
          reportMap[obraName].maquinas[ativo.id] = {
            nome: ativo.nome,
            codigo: ativo.codigo,
            tipoPropriedade: ativo.tipoPropriedade || "PROPRIO",
            horas: 0,
            custo: 0
          };
        }
        reportMap[obraName].maquinas[ativo.id].horas += horas;
        reportMap[obraName].maquinas[ativo.id].custo += custo;
      });

      // Group fuel log
      (ativo.combustiveis || []).forEach((comb: any) => {
        const obraName = comb.obra || "Geral - Sem Obra";
        if (!reportMap[obraName]) {
          reportMap[obraName] = {
            obra: obraName,
            custoProprio: 0,
            custoAlugado: 0,
            custoCombustivel: 0,
            horasProprio: 0,
            horasAlugado: 0,
            totalCusto: 0,
            maquinas: {}
          };
        }
        const custo = comb.custoTotal || 0;
        reportMap[obraName].custoCombustivel += custo;
        reportMap[obraName].totalCusto += custo;
      });
    });

    return Object.values(reportMap);
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Modalidade de Custo *</label>
                    <select 
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newAsset.tipoCusto}
                      onChange={e => {
                        const newTipo = e.target.value;
                        const val = parseFloat(newAsset.valorCusto || newAsset.taxaHoraria);
                        if (!isNaN(val) && val > 0) {
                          let th = ""; let cd = ""; let cs = ""; let cm = "";
                          if (newTipo === "DIARIO") { cd = val.toString(); cs = (val * 5).toFixed(2); cm = (val * 22).toFixed(2); th = (val / 8).toFixed(2); }
                          else if (newTipo === "SEMANAL") { cs = val.toString(); cd = (val / 5).toFixed(2); cm = (val * 4.4).toFixed(2); th = (val / 44).toFixed(2); }
                          else if (newTipo === "MENSAL") { cm = val.toString(); cs = (val / 4.4).toFixed(2); cd = (val / 22).toFixed(2); th = (val / 176).toFixed(2); }
                          else { th = val.toString(); cd = (val * 8).toFixed(2); cs = (val * 44).toFixed(2); cm = (val * 176).toFixed(2); }
                          setNewAsset({...newAsset, tipoCusto: newTipo, taxaHoraria: th, custoDiario: cd, custoSemanal: cs, custoMensal: cm});
                        } else {
                          setNewAsset({...newAsset, tipoCusto: newTipo});
                        }
                      }}
                    >
                      <option value="HORARIO">⏱️ Custo Horário (R$/h)</option>
                      <option value="DIARIO">☀️ Custo Diário (R$/dia)</option>
                      <option value="SEMANAL">📅 Custo Semanal (R$/semana)</option>
                      <option value="MENSAL">🗓️ Custo Mensal (R$/mês)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                      Valor do Custo ({newAsset.tipoCusto === "DIARIO" ? "R$/dia" : newAsset.tipoCusto === "SEMANAL" ? "R$/semana" : newAsset.tipoCusto === "MENSAL" ? "R$/mês" : "R$/h"}) *
                    </label>
                    <input 
                      type="number"
                      step="any"
                      placeholder={newAsset.tipoCusto === "DIARIO" ? "Ex: 500 (R$/dia)" : newAsset.tipoCusto === "SEMANAL" ? "Ex: 2500 (R$/sem)" : newAsset.tipoCusto === "MENSAL" ? "Ex: 10000 (R$/mês)" : "Ex: 150 (R$/h)"}
                      className="w-full px-3 py-2.5 bg-white border border-orange-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newAsset.valorCusto}
                      onChange={e => {
                        const valStr = e.target.value;
                        const val = parseFloat(valStr);
                        if (!isNaN(val) && val > 0) {
                          let th = ""; let cd = ""; let cs = ""; let cm = "";
                          if (newAsset.tipoCusto === "DIARIO") { cd = valStr; cs = (val * 5).toFixed(2); cm = (val * 22).toFixed(2); th = (val / 8).toFixed(2); }
                          else if (newAsset.tipoCusto === "SEMANAL") { cs = valStr; cd = (val / 5).toFixed(2); cm = (val * 4.4).toFixed(2); th = (val / 44).toFixed(2); }
                          else if (newAsset.tipoCusto === "MENSAL") { cm = valStr; cs = (val / 4.4).toFixed(2); cd = (val / 22).toFixed(2); th = (val / 176).toFixed(2); }
                          else { th = valStr; cd = (val * 8).toFixed(2); cs = (val * 44).toFixed(2); cm = (val * 176).toFixed(2); }
                          setNewAsset({...newAsset, valorCusto: valStr, taxaHoraria: th, custoDiario: cd, custoSemanal: cs, custoMensal: cm});
                        } else {
                          setNewAsset({...newAsset, valorCusto: valStr});
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 col-span-1 md:col-span-2 bg-slate-100/70 p-3 rounded-2xl border border-slate-200/60">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Taxa Horária (R$/h)</label>
                      <input 
                        type="number" step="any"
                        placeholder="R$/h"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        value={newAsset.taxaHoraria}
                        onChange={e => setNewAsset({...newAsset, taxaHoraria: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Custo Diário (R$/dia)</label>
                      <input 
                        type="number" step="any"
                        placeholder="R$/dia"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        value={newAsset.custoDiario}
                        onChange={e => setNewAsset({...newAsset, custoDiario: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Custo Semanal (R$/sem)</label>
                      <input 
                        type="number" step="any"
                        placeholder="R$/semana"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        value={newAsset.custoSemanal}
                        onChange={e => setNewAsset({...newAsset, custoSemanal: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Custo Mensal (R$/mês)</label>
                      <input 
                        type="number" step="any"
                        placeholder="R$/mês"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        value={newAsset.custoMensal}
                        onChange={e => setNewAsset({...newAsset, custoMensal: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Possui Horímetro (registro de horas)? *</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAsset({...newAsset, possuiHorimetro: true})}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          newAsset.possuiHorimetro
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        ⏱️ SIM (Com Horímetro)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAsset({...newAsset, possuiHorimetro: false})}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          !newAsset.possuiHorimetro
                            ? "bg-slate-700 border-slate-700 text-white shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        🚫 NÃO (Sem Horímetro)
                      </button>
                    </div>
                  </div>

                  {newAsset.possuiHorimetro && (
                    <>
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
                  )}
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

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Propriedade *</label>
                <select 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={newAsset.tipoPropriedade}
                  onChange={e => setNewAsset({...newAsset, tipoPropriedade: e.target.value})}
                >
                  <option value="PROPRIO">Próprio</option>
                  <option value="ALUGADO">Alugado</option>
                </select>
              </div>

              {newAsset.tipoPropriedade === "ALUGADO" && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Contrato de Aluguel (PDF/Imagem)</label>
                  <div className="flex gap-2">
                    <input 
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      id="contrato-file-input"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) {
                            setNewAsset({...newAsset, contratoAluguelUrl: url});
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="contrato-file-input"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 border border-slate-200"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      {newAsset.contratoAluguelUrl ? "Alterar Contrato" : "Anexar Contrato"}
                    </label>
                    {newAsset.contratoAluguelUrl && (
                      <a 
                        href={newAsset.contratoAluguelUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        Visualizar
                      </a>
                    )}
                  </div>
                </div>
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
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex gap-1.5 items-center flex-wrap">
                            <span className="text-[9px] font-black uppercase text-[#f15a24] bg-[#f15a24]/10 px-2 py-0.5 rounded-md">
                              {ativo.categoria === "PESADO" ? "Equipamento Pesado" : "Ferramenta"}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              ativo.tipoPropriedade === "ALUGADO" 
                                ? "bg-purple-50 text-purple-700 border border-purple-100" 
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}>
                              {ativo.tipoPropriedade === "ALUGADO" ? "Alugado" : "Próprio"}
                            </span>
                            {ativo.tipoPropriedade === "ALUGADO" && ativo.contratoAluguelUrl && (
                              <a 
                                href={ativo.contratoAluguelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-0.5 text-slate-400 hover:text-purple-600 transition-colors"
                                title="Visualizar Contrato de Aluguel"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
                              </a>
                            )}
                          </div>
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
                        <button
                          onClick={() => setEditingAsset(ativo)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                          title="Editar Equipamento"
                        >
                          <FileText className="w-4 h-4 text-blue-500" />
                        </button>

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* Column 1: Forms Container */}
          <div className="space-y-6">
            
            {/* Hours Input Form Panel */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <form onSubmit={handleLogHours} className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#f15a24]" /> Registrar Horas de Uso
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Informe as horas operadas pelo maquinário pesado para cálculo do CAPEX.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Equipamento Pesado *</label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={selectedAssetForHours}
                    onChange={e => setSelectedAssetForHours(e.target.value)}
                  >
                    <option value="">Selecione uma máquina...</option>
                    {ativos.filter(a => a.categoria === "PESADO").map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.codigo}) - R$ {a.taxaHoraria || 0}/h
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horímetro Inicial</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="Ex: 83280"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={hoursForm.horimetroInicio}
                      onChange={e => {
                        const val = e.target.value;
                        const finalVal = hoursForm.horimetroFim;
                        let calcHrs = hoursForm.horasTrabalhadas;
                        if (val && finalVal) {
                          calcHrs = (parseFloat(finalVal) - parseFloat(val)).toString();
                        }
                        setHoursForm({
                          ...hoursForm,
                          horimetroInicio: val,
                          horasTrabalhadas: calcHrs
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horímetro Final</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="Ex: 83288"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={hoursForm.horimetroFim}
                      onChange={e => {
                        const val = e.target.value;
                        const startVal = hoursForm.horimetroInicio;
                        let calcHrs = hoursForm.horasTrabalhadas;
                        if (val && startVal) {
                          calcHrs = (parseFloat(val) - parseFloat(startVal)).toString();
                        }
                        setHoursForm({
                          ...hoursForm,
                          horimetroFim: val,
                          horasTrabalhadas: calcHrs
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas Operadas *</label>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      placeholder="Ex: 8.0"
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Obra Vinculada (CAPEX) *</label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={hoursForm.obra}
                    onChange={e => setHoursForm({...hoursForm, obra: e.target.value})}
                  >
                    <option value="">Selecione a Obra...</option>
                    {capexProjects.map(p => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                    <option value="Geral - Sem Obra Específica">Geral - Sem Obra Específica</option>
                  </select>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Foto Horímetro Início</label>
                    <input 
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="foto-inicio-file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) {
                            setHoursForm({...hoursForm, fotoHorimetroInicioUrl: url});
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="foto-inicio-file"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase cursor-pointer text-center block transition-all hover:bg-slate-100"
                    >
                      {hoursForm.fotoHorimetroInicioUrl ? "📸 Alterar Início" : "📷 Foto Início"}
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Foto Horímetro Fim</label>
                    <input 
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="foto-fim-file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) {
                            setHoursForm({...hoursForm, fotoHorimetroFimUrl: url});
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="foto-fim-file"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase cursor-pointer text-center block transition-all hover:bg-slate-100"
                    >
                      {hoursForm.fotoHorimetroFimUrl ? "📸 Alterar Fim" : "📷 Foto Fim"}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações</label>
                  <textarea 
                    rows={2}
                    placeholder="Serviços realizados..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                    value={hoursForm.observacoes}
                    onChange={e => setHoursForm({...hoursForm, observacoes: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Registrar Horas de Uso
                </button>
              </form>
            </div>

            {/* Fuel Input Form Panel */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <form onSubmit={handleLogFuel} className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[#00BFA5]" /> Registrar Abastecimento
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Lançamento de combustível (litros e custo) com impacto automático no CAPEX.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Equipamento Pesado / Máquina *</label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={selectedAssetForFuel}
                    onChange={e => setSelectedAssetForFuel(e.target.value)}
                  >
                    <option value="">Selecione uma máquina...</option>
                    {ativos.filter(a => a.categoria === "PESADO").map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Litros *</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 50"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={fuelForm.litros}
                      onChange={e => setFuelForm({...fuelForm, litros: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Preço / Litro (R$) *</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 5.89"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={fuelForm.precoPorLitro}
                      onChange={e => setFuelForm({...fuelForm, precoPorLitro: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Leitura Horímetro (h)</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="Ex: 1245.5"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={fuelForm.horimetro}
                      onChange={e => setFuelForm({...fuelForm, horimetro: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data *</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={fuelForm.data}
                      onChange={e => setFuelForm({...fuelForm, data: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
                  <span>Custo Estimado:</span>
                  <span className="text-[#00BFA5]">
                    {fuelForm.litros && fuelForm.precoPorLitro 
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(fuelForm.litros) * parseFloat(fuelForm.precoPorLitro))
                      : "R$ 0,00"
                    }
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Obra Destino (CAPEX) *</label>
                  <select
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={fuelForm.obra}
                    onChange={e => setFuelForm({...fuelForm, obra: e.target.value})}
                  >
                    <option value="">Selecione a Obra...</option>
                    {capexProjects.map(p => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                    <option value="Geral - Sem Obra Específica">Geral - Sem Obra Específica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Responsável Abastecimento *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={fuelForm.responsavel}
                    onChange={e => setFuelForm({...fuelForm, responsavel: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações</label>
                  <textarea 
                    rows={2}
                    placeholder="Notas adicionais..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                    value={fuelForm.observacoes}
                    onChange={e => setFuelForm({...fuelForm, observacoes: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#00BFA5] hover:bg-teal-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Registrar Combustível
                </button>
              </form>
            </div>

          </div>

          {/* Column 2: Logs History Panels */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Histórico de Lançamentos</h3>
                
                {/* Secondary tab selectors */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryTab("uso")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      historyTab === "uso" 
                        ? "bg-[#0a192f] text-white" 
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    Horas Trabalhadas
                  </button>
                  <button
                    onClick={() => setHistoryTab("combustivel")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      historyTab === "combustivel" 
                        ? "bg-[#0a192f] text-white" 
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    Abastecimentos
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Últimos logs operacionais e despesas vinculadas aos projetos.</p>
            </div>

            <div className="mt-4 flex-grow overflow-y-auto">
              {historyTab === "uso" ? (
                <table className="w-full border-collapse border border-slate-100 text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px]">
                      <th className="p-3 text-left">Equipamento</th>
                      <th className="p-3 text-left">Obra</th>
                      <th className="p-3 text-center">Horas</th>
                      <th className="p-3 text-right">Custo</th>
                      <th className="p-3 text-left">Responsável</th>
                      <th className="p-3 text-center">Data</th>
                      <th className="p-3 text-center w-[80px]">Ações</th>
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
                    .slice(0, 15)
                    .map((log: any) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 text-slate-800 font-bold">{log.ativoNome} <span className="text-[10px] text-slate-400 font-normal">({log.ativoCodigo})</span></td>
                        <td className="p-3 text-slate-600 font-semibold">{log.obra}</td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-slate-800 font-black">{log.horasTrabalhadas} h</span>
                            {(log.fotoHorimetroInicioUrl || log.fotoHorimetroFimUrl) && (
                              <div className="flex gap-1.5 mt-0.5 justify-center">
                                {log.fotoHorimetroInicioUrl && (
                                  <a href={log.fotoHorimetroInicioUrl} target="_blank" rel="noreferrer" className="text-[8px] font-black text-blue-500 hover:underline" title="Ver foto início">Início</a>
                                )}
                                {log.fotoHorimetroFimUrl && (
                                  <a href={log.fotoHorimetroFimUrl} target="_blank" rel="noreferrer" className="text-[8px] font-black text-teal-500 hover:underline" title="Ver foto fim">Fim</a>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right text-[#f15a24] font-black">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(log.custoCalculado)}
                        </td>
                        <td className="p-3 text-slate-600">{log.responsavel}</td>
                        <td className="p-3 text-center text-slate-400 font-medium">
                          {new Date(log.dataUso).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingLog({
                                  ...log,
                                  dataUso: new Date(log.dataUso).toISOString().split("T")[0]
                                });
                                setEditingLogType("uso");
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHoursLog(log.id)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {ativos.every(a => !a.historicoUso || a.historicoUso.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                          Nenhum registro de horas encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse border border-slate-100 text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px]">
                      <th className="p-3 text-left">Equipamento</th>
                      <th className="p-3 text-left">Obra</th>
                      <th className="p-3 text-center">Litros</th>
                      <th className="p-3 text-center">R$/L</th>
                      <th className="p-3 text-right">Custo Total</th>
                      <th className="p-3 text-center">Horímetro</th>
                      <th className="p-3 text-left">Responsável</th>
                      <th className="p-3 text-center">Data</th>
                      <th className="p-3 text-center w-[80px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ativos.flatMap(ativo => 
                      (ativo.combustiveis || []).map((comb: any) => ({
                        ...comb,
                        ativoNome: ativo.nome,
                        ativoCodigo: ativo.codigo
                      }))
                    )
                    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                    .slice(0, 15)
                    .map((log: any) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 text-slate-800 font-bold">{log.ativoNome} <span className="text-[10px] text-slate-400 font-normal">({log.ativoCodigo})</span></td>
                        <td className="p-3 text-slate-600 font-semibold">{log.obra}</td>
                        <td className="p-3 text-center text-slate-800 font-black">{log.litros} L</td>
                        <td className="p-3 text-center text-slate-500 font-medium">R$ {log.precoPorLitro}</td>
                        <td className="p-3 text-right text-[#00BFA5] font-black">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(log.custoTotal)}
                        </td>
                        <td className="p-3 text-center text-slate-600 font-mono font-bold">{log.horimetro ? `${log.horimetro} h` : "-"}</td>
                        <td className="p-3 text-slate-600">{log.responsavel}</td>
                        <td className="p-3 text-center text-slate-400 font-medium">
                          {new Date(log.data).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingLog({
                                  ...log,
                                  data: new Date(log.data).toISOString().split("T")[0]
                                });
                                setEditingLogType("combustivel");
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFuelLog(log.id)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {ativos.every(a => !a.combustiveis || a.combustiveis.length === 0) && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                          Nenhum registro de abastecimento encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

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
                  <select
                    required={moveForm.tipo === "SAIDA"}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={moveForm.destino}
                    onChange={e => setMoveForm({...moveForm, destino: e.target.value})}
                  >
                    <option value="">Selecione a Obra de Destino...</option>
                    {capexProjects.map(p => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                    <option value="Outro Local / Almoxarifado Geral">Outro Local / Almoxarifado Geral</option>
                  </select>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* Main Costs Aggregated Table & Charts */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4 w-full">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Relatórios de Custos & CAPEX</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Visão consolidada de despesas de maquinário e consumo por obra.</p>
                </div>
                
                {/* Obras sub tab selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setObrasSubTab("capex")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      obrasSubTab === "capex" 
                        ? "bg-[#0a192f] text-white font-black" 
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100 font-bold"
                    }`}
                  >
                    Gráfico CAPEX
                  </button>
                  <button
                    onClick={() => setObrasSubTab("horas")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      obrasSubTab === "horas" 
                        ? "bg-[#0a192f] text-white font-black" 
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100 font-bold"
                    }`}
                  >
                    Relatório de Horas
                  </button>
                </div>
              </div>

              {obrasSubTab === "capex" ? (
                <div className="space-y-6">
                  {getObrasReportData().map((obraData: any, idx: number) => {
                    const total = (obraData.custoProprio || 0) + (obraData.custoAlugado || 0) + (obraData.custoCombustivel || 0);
                    const pctProprio = total > 0 ? ((obraData.custoProprio || 0) / total) * 100 : 0;
                    const pctAlugado = total > 0 ? ((obraData.custoAlugado || 0) / total) * 100 : 0;
                    const pctCombustivel = total > 0 ? ((obraData.custoCombustivel || 0) / total) * 100 : 0;

                    return (
                      <div key={idx} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{obraData.obra}</h4>
                            <span className="text-[10px] text-slate-400 font-bold">Consolidado Geral de Ativos</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Total Geral CAPEX</span>
                            <span className="text-base font-black text-[#f15a24]">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
                            </span>
                          </div>
                        </div>

                        {/* Stacked Chart bar */}
                        <div className="space-y-1.5">
                          <div className="w-full bg-slate-100 h-7 rounded-xl overflow-hidden flex shadow-inner border border-slate-200/50">
                            {pctProprio > 0 && (
                              <div style={{ width: `${pctProprio}%` }} className="bg-[#00BFA5] h-full text-[9px] font-black text-white flex items-center justify-center shadow-sm" title="Ativos Próprios">
                                {pctProprio.toFixed(0)}%
                              </div>
                            )}
                            {pctAlugado > 0 && (
                              <div style={{ width: `${pctAlugado}%` }} className="bg-[#8B5CF6] h-full text-[9px] font-black text-white flex items-center justify-center shadow-sm" title="Ativos Alugados">
                                {pctAlugado.toFixed(0)}%
                              </div>
                            )}
                            {pctCombustivel > 0 && (
                              <div style={{ width: `${pctCombustivel}%` }} className="bg-[#f15a24] h-full text-[9px] font-black text-white flex items-center justify-center shadow-sm" title="Combustível">
                                {pctCombustivel.toFixed(0)}%
                              </div>
                            )}
                            {total === 0 && (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 italic">
                                Sem despesas logadas
                              </div>
                            )}
                          </div>

                          {/* Legends with costs */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 text-[10px] font-bold text-slate-500">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-[#00BFA5] block" /> Horas Próprias
                              </span>
                              <span className="text-slate-800 font-black mt-0.5">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(obraData.custoProprio || 0)}
                              </span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 pl-3">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] block" /> Horas Alugadas
                              </span>
                              <span className="text-slate-800 font-black mt-0.5">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(obraData.custoAlugado || 0)}
                              </span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 pl-3">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-[#f15a24] block" /> Combustível
                              </span>
                              <span className="text-slate-800 font-black mt-0.5">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(obraData.custoCombustivel || 0)}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                  {getObrasReportData().length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic text-xs">
                      Nenhum custo por obra registrado ainda.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {getObrasReportData().map((obraData: any, idx: number) => (
                    <div key={idx} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
                        <div>
                          <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{obraData.obra}</h4>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Relatório de Horas de Máquina</span>
                        </div>
                        <div className="flex gap-4 text-[10px] font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-100">
                          <span>Horas Próprio: <strong className="text-slate-800">{obraData.horasProprio} h</strong></span>
                          <span>Horas Alugado: <strong className="text-slate-800 text-purple-700">{obraData.horasAlugado} h</strong></span>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs bg-white rounded-xl border border-slate-100 overflow-hidden">
                          <thead>
                            <tr className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                              <th className="p-3 text-left">Equipamento / Ferramenta</th>
                              <th className="p-3 text-center">Propriedade</th>
                              <th className="p-3 text-center">Horas Operadas</th>
                              <th className="p-3 text-right">Custo Operacional</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(obraData.maquinas).map((maq: any, mIdx: number) => (
                              <tr key={mIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-700">{maq.nome} <span className="text-[10px] text-slate-400 font-normal">({maq.codigo})</span></td>
                                <td className="p-3 text-center">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    maq.tipoPropriedade === "ALUGADO" 
                                      ? "bg-purple-50 text-purple-700 border border-purple-100" 
                                      : "bg-blue-50 text-blue-700 border border-blue-100"
                                  }`}>
                                    {maq.tipoPropriedade === "ALUGADO" ? "Alugado" : "Próprio"}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-black text-slate-800">{maq.horas} h</td>
                                <td className="p-3 text-right font-black text-slate-800">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(maq.custo)}
                                </td>
                              </tr>
                            ))}
                            {Object.keys(obraData.maquinas).length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-6 text-center italic text-slate-400">
                                  Nenhum equipamento registrou horas nesta obra.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {getObrasReportData().length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic text-xs">
                      Nenhum registro de horas por obra encontrado.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Maintenance list panel */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4 w-full">
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

      {/* ================= MODAL DE EDIÇÃO DE ATIVO ================= */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-[#0a192f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#f15a24]" /> 
                  Editar Equipamento / Ativo
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Ajuste todas as definições, custos, horímetro e propriedade do ativo.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingAsset(null)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAsset} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome do Equipamento / Ferramenta *</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={editingAsset.nome || ""}
                  onChange={e => setEditingAsset({...editingAsset, nome: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Código / Tag *</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.codigo || ""}
                    onChange={e => setEditingAsset({...editingAsset, codigo: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Categoria *</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.categoria || "PESADO"}
                    onChange={e => setEditingAsset({...editingAsset, categoria: e.target.value})}
                  >
                    <option value="PESADO">Equipamento Pesado</option>
                    <option value="FERRAMENTA">Ferramenta Manual</option>
                  </select>
                </div>
              </div>

              {/* Modalidade de Custo & Valores */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Modalidade de Custo *</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.tipoCusto || "HORARIO"}
                    onChange={e => {
                      const newTipo = e.target.value;
                      const val = parseFloat(editingAsset.valorCusto || editingAsset.taxaHoraria || 0);
                      if (!isNaN(val) && val > 0) {
                        let th = ""; let cd = ""; let cs = ""; let cm = "";
                        if (newTipo === "DIARIO") { cd = val.toString(); cs = (val * 5).toFixed(2); cm = (val * 22).toFixed(2); th = (val / 8).toFixed(2); }
                        else if (newTipo === "SEMANAL") { cs = val.toString(); cd = (val / 5).toFixed(2); cm = (val * 4.4).toFixed(2); th = (val / 44).toFixed(2); }
                        else if (newTipo === "MENSAL") { cm = val.toString(); cs = (val / 4.4).toFixed(2); cd = (val / 22).toFixed(2); th = (val / 176).toFixed(2); }
                        else { th = val.toString(); cd = (val * 8).toFixed(2); cs = (val * 44).toFixed(2); cm = (val * 176).toFixed(2); }
                        setEditingAsset({...editingAsset, tipoCusto: newTipo, taxaHoraria: th, custoDiario: cd, custoSemanal: cs, custoMensal: cm});
                      } else {
                        setEditingAsset({...editingAsset, tipoCusto: newTipo});
                      }
                    }}
                  >
                    <option value="HORARIO">⏱️ Custo Horário (R$/h)</option>
                    <option value="DIARIO">☀️ Custo Diário (R$/dia)</option>
                    <option value="SEMANAL">📅 Custo Semanal (R$/semana)</option>
                    <option value="MENSAL">🗓️ Custo Mensal (R$/mês)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                    Valor do Custo (R$) *
                  </label>
                  <input 
                    type="number"
                    step="any"
                    placeholder="Ex: 250"
                    className="w-full px-3 py-2.5 bg-white border border-orange-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.valorCusto !== undefined && editingAsset.valorCusto !== null ? editingAsset.valorCusto : (editingAsset.taxaHoraria || "")}
                    onChange={e => {
                      const valStr = e.target.value;
                      const val = parseFloat(valStr);
                      if (!isNaN(val) && val > 0) {
                        let th = ""; let cd = ""; let cs = ""; let cm = "";
                        const tipo = editingAsset.tipoCusto || "HORARIO";
                        if (tipo === "DIARIO") { cd = valStr; cs = (val * 5).toFixed(2); cm = (val * 22).toFixed(2); th = (val / 8).toFixed(2); }
                        else if (tipo === "SEMANAL") { cs = valStr; cd = (val / 5).toFixed(2); cm = (val * 4.4).toFixed(2); th = (val / 44).toFixed(2); }
                        else if (tipo === "MENSAL") { cm = valStr; cs = (val / 4.4).toFixed(2); cd = (val / 22).toFixed(2); th = (val / 176).toFixed(2); }
                        else { th = valStr; cd = (val * 8).toFixed(2); cs = (val * 44).toFixed(2); cm = (val * 176).toFixed(2); }
                        setEditingAsset({...editingAsset, valorCusto: valStr, taxaHoraria: th, custoDiario: cd, custoSemanal: cs, custoMensal: cm});
                      } else {
                        setEditingAsset({...editingAsset, valorCusto: valStr});
                      }
                    }}
                  />
                </div>
              </div>

              {/* Custos Calculados Preview */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[9.5px] font-bold text-slate-700">
                <div>Horária: <span className="text-slate-900 block font-black">R$ {parseFloat(editingAsset.taxaHoraria || 0).toFixed(2)}/h</span></div>
                <div>Diária: <span className="text-slate-900 block font-black">R$ {parseFloat(editingAsset.custoDiario || 0).toFixed(2)}/dia</span></div>
                <div>Semanal: <span className="text-slate-900 block font-black">R$ {parseFloat(editingAsset.custoSemanal || 0).toFixed(2)}/sem</span></div>
                <div>Mensal: <span className="text-slate-900 block font-black">R$ {parseFloat(editingAsset.custoMensal || 0).toFixed(2)}/mês</span></div>
              </div>

              {/* Toggle Possui Horímetro */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Possui Horímetro (registro de horas)? *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAsset({...editingAsset, possuiHorimetro: true})}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      editingAsset.possuiHorimetro !== false
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    ⏱️ SIM (Com Horímetro)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAsset({...editingAsset, possuiHorimetro: false})}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      editingAsset.possuiHorimetro === false
                        ? "bg-slate-700 border-slate-700 text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    🚫 NÃO (Sem Horímetro)
                  </button>
                </div>
              </div>

              {/* Horas de Uso & Revisão (se tiver horímetro) */}
              {editingAsset.possuiHorimetro !== false && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas Acumuladas de Uso</label>
                    <input 
                      type="number"
                      step="any"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={editingAsset.horasUso !== undefined ? editingAsset.horasUso : 0}
                      onChange={e => setEditingAsset({...editingAsset, horasUso: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas p/ Revisão Preventiva</label>
                    <input 
                      type="number"
                      step="any"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={editingAsset.horasManutencaoPreventiva || ""}
                      onChange={e => setEditingAsset({...editingAsset, horasManutencaoPreventiva: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* Propriedade & Status */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Propriedade *</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.tipoPropriedade || "PROPRIO"}
                    onChange={e => setEditingAsset({...editingAsset, tipoPropriedade: e.target.value})}
                  >
                    <option value="PROPRIO">Próprio</option>
                    <option value="ALUGADO">Alugado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status Atual</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.status || "DISPONIVEL"}
                    onChange={e => setEditingAsset({...editingAsset, status: e.target.value})}
                  >
                    <option value="DISPONIVEL">Disponível</option>
                    <option value="EM_USO">Em Uso</option>
                    <option value="MANUTENCAO">Em Manutenção</option>
                  </select>
                </div>
              </div>

              {/* Responsável & Localização */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Responsável / Operador</label>
                  <input 
                    type="text"
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.responsavel || ""}
                    onChange={e => setEditingAsset({...editingAsset, responsavel: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Localização / Obra</label>
                  <input 
                    type="text"
                    placeholder="Ex: Obra Usina Itália"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingAsset.localizacao || ""}
                    onChange={e => setEditingAsset({...editingAsset, localizacao: e.target.value})}
                  />
                </div>
              </div>

              {editingAsset.tipoPropriedade === "ALUGADO" && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Contrato de Aluguel</label>
                  <div className="flex gap-2">
                    <input 
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      id="edit-contrato-file-input"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) {
                            setEditingAsset({...editingAsset, contratoAluguelUrl: url});
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="edit-contrato-file-input"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 border border-slate-200 flex-1"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      {editingAsset.contratoAluguelUrl ? "Alterar Contrato" : "Anexar Contrato"}
                    </label>
                    {editingAsset.contratoAluguelUrl && (
                      <a 
                        href={editingAsset.contratoAluguelUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        Visualizar
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE EDIÇÃO DE LANÇAMENTO ================= */}
      {editingLog && editingLogType && (
        <div className="fixed inset-0 z-50 bg-[#0a192f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 relative animate-in slide-in-from-bottom-8 duration-300">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#f15a24]" /> 
                  Editar Lançamento
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Ajuste as informações registradas para recálculo do custo.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setEditingLog(null);
                  setEditingLogType(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateLog} className="space-y-4">
              
              {editingLogType === "uso" ? (
                <>
                  {/* Horas Trabalhadas fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horímetro Inicial</label>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="Ex: 83280"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={editingLog.horimetroInicio || ""}
                        onChange={e => {
                          const val = e.target.value;
                          const finalVal = editingLog.horimetroFim;
                          let calcHrs = editingLog.horasTrabalhadas;
                          if (val && finalVal) {
                            calcHrs = (parseFloat(finalVal) - parseFloat(val)).toString();
                          }
                          setEditingLog({
                            ...editingLog,
                            horimetroInicio: val,
                            horasTrabalhadas: calcHrs
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horímetro Final</label>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="Ex: 83288"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={editingLog.horimetroFim || ""}
                        onChange={e => {
                          const val = e.target.value;
                          const startVal = editingLog.horimetroInicio;
                          let calcHrs = editingLog.horasTrabalhadas;
                          if (val && startVal) {
                            calcHrs = (parseFloat(val) - parseFloat(startVal)).toString();
                          }
                          setEditingLog({
                            ...editingLog,
                            horimetroFim: val,
                            horasTrabalhadas: calcHrs
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Horas Operadas *</label>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={editingLog.horasTrabalhadas || ""}
                      onChange={e => setEditingLog({...editingLog, horasTrabalhadas: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data do Uso *</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={editingLog.dataUso || ""}
                      onChange={e => setEditingLog({...editingLog, dataUso: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Foto Horímetro Início</label>
                      <div className="flex gap-2">
                        <input 
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="edit-foto-inicio-file"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleFileUpload(file);
                              if (url) {
                                setEditingLog({...editingLog, fotoHorimetroInicioUrl: url});
                              }
                            }
                          }}
                        />
                        <label 
                          htmlFor="edit-foto-inicio-file"
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase cursor-pointer text-center block flex-1 transition-all hover:bg-slate-100"
                        >
                          {editingLog.fotoHorimetroInicioUrl ? "📸 Alterar" : "📷 Início"}
                        </label>
                        {editingLog.fotoHorimetroInicioUrl && (
                          <a href={editingLog.fotoHorimetroInicioUrl} target="_blank" rel="noreferrer" className="px-2 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-[10px] flex items-center justify-center">Ver</a>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Foto Horímetro Fim</label>
                      <div className="flex gap-2">
                        <input 
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="edit-foto-fim-file"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleFileUpload(file);
                              if (url) {
                                setEditingLog({...editingLog, fotoHorimetroFimUrl: url});
                              }
                            }
                          }}
                        />
                        <label 
                          htmlFor="edit-foto-fim-file"
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase cursor-pointer text-center block flex-1 transition-all hover:bg-slate-100"
                        >
                          {editingLog.fotoHorimetroFimUrl ? "📸 Alterar" : "📷 Fim"}
                        </label>
                        {editingLog.fotoHorimetroFimUrl && (
                          <a href={editingLog.fotoHorimetroFimUrl} target="_blank" rel="noreferrer" className="px-2 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-[10px] flex items-center justify-center">Ver</a>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Combustível fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Litros *</label>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={editingLog.litros || ""}
                        onChange={e => setEditingLog({...editingLog, litros: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Preço / Litro (R$) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={editingLog.precoPorLitro || ""}
                        onChange={e => setEditingLog({...editingLog, precoPorLitro: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Leitura Horímetro (h)</label>
                      <input 
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={editingLog.horimetro || ""}
                        onChange={e => setEditingLog({...editingLog, horimetro: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data *</label>
                      <input 
                        type="date"
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={editingLog.data || ""}
                        onChange={e => setEditingLog({...editingLog, data: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Obra Vinculada (CAPEX) *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={editingLog.obra || ""}
                  onChange={e => setEditingLog({...editingLog, obra: e.target.value})}
                >
                  <option value="">Selecione a Obra...</option>
                  {capexProjects.map(p => (
                    <option key={p.id} value={p.nome}>{p.nome}</option>
                  ))}
                  <option value="Geral - Sem Obra Específica">Geral - Sem Obra Específica</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Responsável / Encarregado *</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={editingLog.responsavel || ""}
                  onChange={e => setEditingLog({...editingLog, responsavel: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações</label>
                <textarea 
                  rows={2}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                  value={editingLog.observacoes || ""}
                  onChange={e => setEditingLog({...editingLog, observacoes: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingLog(null);
                    setEditingLogType(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
