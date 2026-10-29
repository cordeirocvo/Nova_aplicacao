"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Building2, Calendar, LayoutDashboard, ChevronRight, 
  Settings, Edit, Trash2, Copy, Sparkles, FileText, UploadCloud, 
  TrendingDown, Users, Globe, ExternalLink, CheckCircle2, DollarSign,
  Package, ArrowUpRight, Filter, ShieldCheck, RefreshCw, ShoppingBag,
  Save, AlertTriangle, Layers
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConciliacaoOrcamentoModal } from "@/components/orcamentos/ConciliacaoOrcamentoModal";
import { SolicitarNovoMaterialModal } from "@/components/orcamentos/SolicitarNovoMaterialModal";

export default function OrcamentosDashboard() {
  const router = useRouter();

  // Estados dos Projetos
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  // Navegação por Abas Exclusivas da Gestão de Orçamentos
  const [activeTab, setActiveTab] = useState<"projetos" | "catalogo" | "fornecedores">("projetos");
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("TODOS");
  const [isSolicitarNovoItemOpen, setIsSolicitarNovoItemOpen] = useState(false);
  const [salvandoPrecoId, setSalvandoPrecoId] = useState<string | null>(null);
  const [tempPrecos, setTempPrecos] = useState<Record<string, number>>({});

  // Estatísticas do Hub Master Data
  const [stats, setStats] = useState({
    totalItensMaster: 0,
    totalFornecedores: 0,
    itensComMenorPreco: 0
  });

  // Catálogo para o Leitor IA
  const [catalogoMateriais, setCatalogoMateriais] = useState<any[]>([]);
  const [isConciliacaoOpen, setIsConciliacaoOpen] = useState(false);

  // Modais de Criação e Edição de Projeto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCliente, setNovoCliente] = useState("");
  const [criando, setCriando] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resProjetos, resItens, resFornecedores] = await Promise.all([
        fetch("/api/orcamentos"),
        fetch("/api/orcamentos/itens-padrao"),
        fetch("/api/orcamentos/fornecedores")
      ]);

      const dataProjetos = await resProjetos.json();
      const dataItens = await resItens.json();
      const dataFornecedores = await resFornecedores.json();

      const projetosArray = Array.isArray(dataProjetos) ? dataProjetos : [];
      const itensArray = Array.isArray(dataItens) ? dataItens : [];
      const fornecedoresArray = dataFornecedores?.fornecedores || [];

      setProjetos(projetosArray);
      setCatalogoMateriais(itensArray);
      setFornecedores(fornecedoresArray);

      const comMenorPreco = itensArray.filter((i: any) => i.menorPreco !== null && i.menorPreco > 0).length;

      setStats({
        totalItensMaster: itensArray.length,
        totalFornecedores: fornecedoresArray.length,
        itensComMenorPreco: comMenorPreco
      });
    } catch (err) {
      console.error("Erro ao carregar dados do CAPEX:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarPrecoMaster = async (id: string, novoValor: number) => {
    try {
      setSalvandoPrecoId(id);
      const res = await fetch(`/api/orcamentos/itens-padrao/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precoBaseUnitario: novoValor })
      });
      if (res.ok) {
        setCatalogoMateriais(prev => prev.map(item => item.id === id ? { ...item, precoBaseUnitario: novoValor } : item));
      } else {
        alert("Erro ao salvar novo preço do item no catálogo master.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de conexão ao salvar preço.");
    } finally {
      setSalvandoPrecoId(null);
    }
  };

  const handleNovoProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setCriando(true);

    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nome: novoNome.trim(),
          cliente: novoCliente.trim() || null
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/orcamentos/${data.id}`);
      } else {
        alert(data.error || "Erro ao criar projeto");
        setCriando(false);
      }
    } catch (error) {
      alert("Erro sistêmico ao criar projeto");
      setCriando(false);
    }
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.nome.trim()) return;
    setSalvandoEdicao(true);

    try {
      const res = await fetch(`/api/orcamentos/${editingProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editingProject.nome.trim(),
          cliente: editingProject.cliente?.trim() || null,
          status: editingProject.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProjetos(projetos.map(p => p.id === editingProject.id ? { ...p, ...data.orcamento } : p));
        setIsEditModalOpen(false);
        setEditingProject(null);
      } else {
        alert(data.error || "Erro ao salvar alterações");
      }
    } catch (error) {
      alert("Erro de conexão ao salvar");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (typeof window !== "undefined" && !window.confirm("ATENÇÃO: Deseja realmente excluir este projeto permanentemente com todas as etapas, composições e cotações?")) {
      return;
    }

    try {
      const res = await fetch(`/api/orcamentos/${projectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setProjetos(projetos.filter(p => p.id !== projectId));
      } else {
        alert(data.error || "Erro ao excluir o projeto");
      }
    } catch (error) {
      alert("Erro de conexão");
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Deseja duplicar este projeto de orçamento com todas as etapas, itens e estrutura?")) {
      return;
    }

    try {
      const res = await fetch(`/api/orcamentos/${projectId}/duplicar`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        carregarDados();
      } else {
        alert(data.error || "Erro ao duplicar projeto");
      }
    } catch (error) {
      alert("Erro de conexão");
    }
  };

  // Filtragem de projetos
  const filteredProjetos = projetos.filter(p => {
    const matchBusca = 
      p.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cliente?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "TODOS") return matchBusca;
    return matchBusca && (p.status || "Rascunho").toUpperCase() === statusFilter.toUpperCase();
  });

  // Filtragem do catálogo master
  const filteredCatalogo = catalogoMateriais.filter(item => {
    const term = itemSearchQuery.toLowerCase();
    const matchBusca = !itemSearchQuery ||
      item.descricao?.toLowerCase().includes(term) ||
      item.codigo?.toLowerCase().includes(term);
    
    if (itemTypeFilter === "TODOS") return matchBusca;
    return matchBusca && item.tipo === itemTypeFilter;
  });

  // Filtragem de fornecedores
  const filteredFornecedores = fornecedores.filter(f => {
    const term = searchQuery.toLowerCase();
    return !searchQuery ||
      f.nome?.toLowerCase().includes(term) ||
      f.cnpj?.includes(term) ||
      f.cidade?.toLowerCase().includes(term) ||
      f.contato?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-['Montserrat',sans-serif] animate-in fade-in duration-500 pb-16">
      
      {/* ─── HEADER INSTITUCIONAL CORDEIRO ENERGIA & CAPEX ─── */}
      <div className="bg-[#0A192F] text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Glows radiais da paleta Cordeiro */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#E45318]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-48 -top-10 w-64 h-64 bg-[#00B356]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Barra Superior: Logo Cordeiro Energia & Links Oficiais */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <a 
                href="https://www.cordeiroenergia.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/95 hover:bg-white p-2.5 rounded-2xl shadow-sm transition-all hover:scale-105 inline-flex items-center justify-center border border-white/20"
                title="Visitar Cordeiro Energia"
              >
                <img 
                  src="/logo.png" 
                  alt="Cordeiro Energia" 
                  className="h-8 md:h-9 object-contain" 
                />
              </a>
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest block">
                  Cordeiro Energia • Engenharia & Gestão Energética
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Hub Central de Custos, Fornecedores & Inteligência de Cotações (CAPEX)
                </span>
              </div>
            </div>

            {/* Links Digitais Oficiais */}
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="https://www.cordeiroenergia.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 shadow-xs"
              >
                <Globe className="w-3.5 h-3.5 text-[#00B356]" />
                <span className="hidden md:inline">cordeiroenergia.com.br</span>
                <span className="md:hidden">Site</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <a
                href="https://www.instagram.com/cordeiroenergia"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-[#E45318]/20 to-[#E45318]/40 hover:from-[#E45318]/40 hover:to-[#E45318]/60 text-orange-200 border border-[#E45318]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-[#E45318]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
                <span>@cordeiroenergia</span>
                <ExternalLink className="w-3 h-3 text-orange-300" />
              </a>

              <a
                href="https://www.instagram.com/coenergygo"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#00B356]/15 hover:bg-[#00B356]/30 text-emerald-200 border border-[#00B356]/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-[#00B356]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
                <span>@coenergygo</span>
                <ExternalLink className="w-3 h-3 text-emerald-300" />
              </a>
            </div>
          </div>

          {/* Linha Principal: Título, Badges e Botões Executivos */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-[#E45318] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                  Cordeiro CAPEX v3.0
                </span>
                <span className="bg-[#00B356]/20 text-[#00B356] border border-[#00B356]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Fonte Única da Verdade (Master Data)
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Leitor Multimodal IA Gemini 2.5
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Gestão de <span className="text-[#E45318]">Orçamentos</span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-xl">
                  CAPEX & Suprimentos
                </span>
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
                Central oficial de dados mestres de engenharia: equalização de fornecedores, banco mestre de insumos, 
                leitura inteligente de cotações em PDF/imagem e alimentação direta de listas para o Padrão CEMIG e CoenergyGO.
              </p>
            </div>

            {/* Botões de Ação do Hub */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Gatilho Principal do Leitor IA */}
              <button
                type="button"
                onClick={() => setIsConciliacaoOpen(true)}
                className="bg-gradient-to-r from-[#E45318] to-[#ff6b2b] hover:from-[#d1440d] hover:to-[#e45318] text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#E45318]/30 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer border border-[#E45318]/40"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Importar Cotação (PDF / Foto IA)</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/orcamentos/configuracoes")}
                className="bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Settings className="w-4 h-4 text-[#00B356]" />
                <span>Catálogo Master & Fornecedores</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-[#00B356] hover:bg-[#009b4a] text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00B356]/25 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Projeto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CARDS DE KPIS EXECUTIVOS (MASTER DATA) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projetos */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Projetos em Gestão</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0A192F] flex items-center justify-center font-bold">
              <LayoutDashboard className="w-5 h-5 text-[#0A192F]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{projetos.length}</span>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Obras e equalizações ativas</p>
          </div>
        </div>

        {/* Itens Cadastrados no Master Data */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-[#00B356]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Insumos Master</span>
            <div className="w-10 h-10 rounded-2xl bg-[#00B356]/10 text-[#00B356] flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalItensMaster}</span>
            <p className="text-xs font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Alimentando CEMIG & CoenergyGO
            </p>
          </div>
        </div>

        {/* Fornecedores Homologados */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fornecedores Base</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalFornecedores}</span>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Distribuidores e parceiros</p>
          </div>
        </div>

        {/* Menores Preços Quitados com IA */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-[#E45318]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Menor Preço Ativo</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#E45318] flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[#E45318] tracking-tight">{stats.itensComMenorPreco}</span>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Itens com saving equalizado</p>
          </div>
        </div>
      </div>

      {/* ─── NAVEGAÇÃO DE ABAS DO HUB CAPEX ─── */}
      <div className="flex border-b border-slate-200/80 gap-2 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("projetos")}
          className={`flex items-center gap-2.5 px-6 py-3.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition-all cursor-pointer ${
            activeTab === "projetos"
              ? "bg-white text-slate-900 border-t-2 border-x border-[#E45318] -mb-px shadow-xs"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === "projetos" ? "text-[#E45318]" : ""}`} />
          <span>Projetos & Obras</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {projetos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("catalogo")}
          className={`flex items-center gap-2.5 px-6 py-3.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition-all cursor-pointer ${
            activeTab === "catalogo"
              ? "bg-white text-slate-900 border-t-2 border-x border-[#00B356] -mb-px shadow-xs"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
        >
          <Package className={`w-4 h-4 ${activeTab === "catalogo" ? "text-[#00B356]" : ""}`} />
          <span>Catálogo Master de Insumos</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            SSOT • {catalogoMateriais.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fornecedores")}
          className={`flex items-center gap-2.5 px-6 py-3.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition-all cursor-pointer ${
            activeTab === "fornecedores"
              ? "bg-white text-slate-900 border-t-2 border-x border-[#0A192F] -mb-px shadow-xs"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === "fornecedores" ? "text-[#0A192F]" : ""}`} />
          <span>Fornecedores Homologados</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {fornecedores.length}
          </span>
        </button>
      </div>

      {/* ─── ABA 1: PROJETOS DE ORÇAMENTO (OBRAS) ─── */}
      {activeTab === "projetos" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in">
          {/* Barra de Filtros */}
          <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#E45318]" />
                Projetos de Orçamento (Obras)
              </h3>
              <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
                {filteredProjetos.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro de Status */}
              <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                {["TODOS", "RASCUNHO", "EM ANDAMENTO", "CONCLUÍDO"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-[11px] uppercase ${
                      statusFilter === st
                        ? "bg-white text-slate-900 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Busca textual */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar projeto ou cliente..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00B356] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Conteúdo da Lista */}
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#00B356] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando Projetos e Custos Master...</p>
            </div>
          ) : filteredProjetos.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Nenhum projeto encontrado</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {searchQuery ? "Nenhum resultado corresponde à sua pesquisa." : "Crie um novo projeto de CAPEX para estruturar etapas, insumos e equalização de propostas."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#00B356] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#009b4a] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Criar Primeiro Projeto
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredProjetos.map((p) => (
                <div 
                  key={p.id}
                  className="p-5 md:p-6 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  {/* Lado Esquerdo: Nome, Cliente, Status e Data */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[#0A192F] group-hover:text-white transition-all shadow-xs">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link 
                          href={`/orcamentos/${p.id}`}
                          className="text-base font-black text-slate-900 hover:text-[#E45318] transition-colors"
                        >
                          {p.nome}
                        </Link>
                        {p.cliente && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                            {p.cliente}
                          </span>
                        )}
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          (p.status || "Rascunho").toUpperCase() === "CONCLUÍDO"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : (p.status || "Rascunho").toUpperCase() === "EM ANDAMENTO"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {p.status || "Rascunho"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Calendar className="w-3.5 h-3.5" /> 
                          {new Date(p.createdAt || p.dataCriacao || new Date()).toLocaleDateString("pt-BR")}
                        </span>
                        <span>•</span>
                        <span>{p._count?.etapas || 0} etapas estruturadas</span>
                        <span>•</span>
                        <span>{p._count?.fornecedores || 0} fornecedores convidados</span>
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Ações Rápidas */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button 
                      type="button"
                      onClick={() => handleDuplicateProject(p.id)}
                      className="p-2.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
                      title="Duplicar projeto"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        setEditingProject({
                          id: p.id,
                          nome: p.nome,
                          cliente: p.cliente || "",
                          status: p.status || "Rascunho"
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-xl transition-all cursor-pointer"
                      title="Editar informações básicas"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                      title="Excluir projeto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/orcamentos/${p.id}`}
                      className="bg-[#0A192F] hover:bg-[#E45318] text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm group-hover:scale-105"
                    >
                      <span>Abrir EAP</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 2: CATÁLOGO MASTER DE INSUMOS & SUPRIMENTOS (SSOT) ─── */}
      {activeTab === "catalogo" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in space-y-0">
          {/* Barra de Filtros e Ações do Catálogo */}
          <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#00B356]" />
                  Catálogo Master de Insumos & Suprimentos
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                  {filteredCatalogo.length} itens
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Alimenta automaticamente os cálculos e listas de materiais do Padrão CEMIG e CoenergyGO.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro por Tipo */}
              <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                {["TODOS", "MATERIAL", "MAO_DE_OBRA", "EQUIPAMENTO"].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setItemTypeFilter(tipo)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-[11px] uppercase ${
                      itemTypeFilter === tipo
                        ? "bg-white text-slate-900 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tipo.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Busca de Itens */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Filtrar por código ou descrição..."
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00B356] transition-all"
                />
              </div>

              {/* Botão Solicitar Insumo Compras */}
              <button
                type="button"
                onClick={() => setIsSolicitarNovoItemOpen(true)}
                className="bg-[#00B356] hover:bg-[#009b4a] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Solicitar Insumo (Compras)</span>
              </button>
            </div>
          </div>

          {/* Tabela de Insumos Master */}
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#00B356] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando catálogo...</p>
            </div>
          ) : filteredCatalogo.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Nenhum insumo encontrado</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Ajuste seus filtros de busca ou solicite um novo material para cotação pela equipe de compras.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSolicitarNovoItemOpen(true)}
                className="bg-[#00B356] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#009b4a] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Solicitar Insumo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Código / Identificador</th>
                    <th className="py-3 px-4">Descrição do Insumo</th>
                    <th className="py-3 px-3 text-center">Tipo</th>
                    <th className="py-3 px-3 text-center">Unidade</th>
                    <th className="py-3 px-4 text-right">Preço Base Master (R$)</th>
                    <th className="py-3 px-4 text-right">Menor Cotação Equalizada</th>
                    <th className="py-3 px-4">Fornecedor / Ref.</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCatalogo.map((item) => {
                    const precoAtual = tempPrecos[item.id] !== undefined 
                      ? tempPrecos[item.id] 
                      : (item.precoBaseUnitario ?? 0);
                    const isPendente = item.observacao?.includes("PENDENTE_HOMOLOGACAO");

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Código */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">
                          {item.codigo ? (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                              {item.codigo}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Descrição */}
                        <td className="py-3 px-4 max-w-md">
                          <div className="font-semibold text-slate-900 group-hover:text-[#0A192F] transition-colors leading-relaxed">
                            {item.descricao}
                          </div>
                          {isPendente && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Aguardando Cotação Compras
                            </span>
                          )}
                        </td>

                        {/* Tipo */}
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            item.tipo === "MATERIAL"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : item.tipo === "MAO_DE_OBRA"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {item.tipo?.replace("_", " ") || "MATERIAL"}
                          </span>
                        </td>

                        {/* Unidade */}
                        <td className="py-3 px-3 text-center font-bold text-slate-500 uppercase">
                          {item.unidade || "UN"}
                        </td>

                        {/* Preço Base Master Editável */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={precoAtual}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setTempPrecos(prev => ({ ...prev, [item.id]: val }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSalvarPrecoMaster(item.id, precoAtual);
                                }
                              }}
                              className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#00B356] focus:outline-none transition-all"
                            />
                            <button
                              type="button"
                              disabled={salvandoPrecoId === item.id}
                              onClick={() => handleSalvarPrecoMaster(item.id, precoAtual)}
                              className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                              title="Salvar preço base no Catálogo Master"
                            >
                              {salvandoPrecoId === item.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#00B356] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Menor Cotação Equalizada */}
                        <td className="py-3 px-4 text-right">
                          {item.menorPreco ? (
                            <div>
                              <span className="font-black text-emerald-600 block">
                                R$ {Number(item.menorPreco).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {item.precoBaseUnitario && item.precoBaseUnitario > item.menorPreco && (
                                <span className="text-[10px] font-bold text-[#00B356] bg-emerald-50 px-1.5 py-0.5 rounded">
                                  -{( (1 - item.menorPreco / item.precoBaseUnitario) * 100 ).toFixed(0)}% saving
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs italic">Sem cotação</span>
                          )}
                        </td>

                        {/* Fornecedor / Cotação */}
                        <td className="py-3 px-4">
                          {item.fornecedorMenorPreco ? (
                            <div>
                              <span className="font-bold text-slate-800 block text-xs truncate max-w-[150px]">
                                {item.fornecedorMenorPreco}
                              </span>
                              {item.numeroOrcamentoMenorPreco && (
                                <span className="text-[10px] text-slate-400">
                                  Cot. #{item.numeroOrcamentoMenorPreco}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setIsConciliacaoOpen(true)}
                            className="p-1.5 bg-slate-100 hover:bg-orange-50 text-slate-500 hover:text-[#E45318] rounded-lg transition-all cursor-pointer"
                            title="Importar cotação fornecedor com IA"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 3: FORNECEDORES HOMOLOGADOS ─── */}
      {activeTab === "fornecedores" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in space-y-0">
          <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0A192F]" />
                Fornecedores Homologados & Equalizados
              </h3>
              <p className="text-xs text-slate-500">
                Parceiros e distribuidores de materiais elétricos, eletropostos e transformadores.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/orcamentos/configuracoes")}
                className="bg-[#0A192F] hover:bg-[#E45318] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Gerenciar Fornecedores</span>
              </button>
            </div>
          </div>

          {filteredFornecedores.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Nenhum fornecedor registrado</p>
              <button
                type="button"
                onClick={() => router.push("/orcamentos/configuracoes")}
                className="bg-[#0A192F] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#E45318] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar Fornecedor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {filteredFornecedores.map((f: any) => (
                <div key={f.id} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{f.nome}</h4>
                      {f.cnpj && (
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">CNPJ: {f.cnpj}</p>
                      )}
                    </div>
                    <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    {f.contato && <p><span className="font-semibold text-slate-400">Contato:</span> {f.contato}</p>}
                    {f.email && <p><span className="font-semibold text-slate-400">Email:</span> {f.email}</p>}
                    {f.telefone && <p><span className="font-semibold text-slate-400">Tel:</span> {f.telefone}</p>}
                    {f.cidade && <p><span className="font-semibold text-slate-400">Cidade:</span> {f.cidade}{f.estado ? ` - ${f.estado}` : ""}</p>}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Homologado
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsConciliacaoOpen(true)}
                      className="text-[#E45318] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Cotação IA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL DO LEITOR INTELIGENTE IA (CONTA AZUL RECONCILIATION) ─── */}
      <ConciliacaoOrcamentoModal
        isOpen={isConciliacaoOpen}
        onClose={() => setIsConciliacaoOpen(false)}
        catalogoMateriais={catalogoMateriais}
        onSucesso={() => {
          setIsConciliacaoOpen(false);
          carregarDados();
        }}
      />

      {/* ─── MODAL: SOLICITAR NOVO INSUMO / MATERIAL PARA COMPRAS ─── */}
      <SolicitarNovoMaterialModal
        isOpen={isSolicitarNovoItemOpen}
        onClose={() => setIsSolicitarNovoItemOpen(false)}
        onSuccess={() => {
          setIsSolicitarNovoItemOpen(false);
          carregarDados();
        }}
      />

      {/* ─── MODAL: NOVO PROJETO ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest block">Novo Empreendimento</span>
                <h3 className="text-xl font-black text-slate-900">Criar Projeto de Orçamento</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#E45318] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <form onSubmit={handleNovoProjeto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Nome do Projeto / Obra *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Usina Solar Curvelo 1MW ou Eletroposto Shopping"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00B356] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Cliente / Contratante (Opcional)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Grupo Cordeiro ou Cliente Particular"
                  value={novoCliente}
                  onChange={e => setNovoCliente(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00B356] transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criando}
                  className="bg-[#00B356] hover:bg-[#009b4a] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00B356]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {criando ? "Criando..." : "Criar e Abrir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDITAR PROJETO ─── */}
      {isEditModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#0A192F] tracking-widest block">Edição de Projeto</span>
                <h3 className="text-xl font-black text-slate-900">Editar Detalhes</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0A192F] flex items-center justify-center">
                <Edit className="w-5 h-5" />
              </div>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Nome do Projeto *
                </label>
                <input 
                  type="text" 
                  required
                  value={editingProject.nome}
                  onChange={e => setEditingProject({ ...editingProject, nome: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00B356] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Cliente
                </label>
                <input 
                  type="text" 
                  value={editingProject.cliente || ""}
                  onChange={e => setEditingProject({ ...editingProject, cliente: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00B356] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Status
                </label>
                <select
                  value={editingProject.status || "Rascunho"}
                  onChange={e => setEditingProject({ ...editingProject, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B356] transition-all"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="bg-[#0A192F] hover:bg-[#E45318] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
