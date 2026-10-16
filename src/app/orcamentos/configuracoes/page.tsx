"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, Plus, Trash2, Settings, Loader, Upload, 
  Percent, DollarSign, RefreshCw, Layers, Sliders, FileSpreadsheet, 
  FileText, Search, Info, HelpCircle, Check, AlertCircle, Edit2,
  Users, Building2, Phone, Mail, Sparkles, TrendingDown, CheckCircle2,
  Package, Globe, ExternalLink, ShieldCheck, ArrowRight, Download
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { ConciliacaoOrcamentoModal } from "@/components/orcamentos/ConciliacaoOrcamentoModal";

export default function OrcamentosConfigPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Globais
  const [tipos, setTipos] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [activeTab, setActiveTab] = useState<"composicoes" | "fornecedores" | "categorias" | "massa">("composicoes");

  // Busca e Filtros da Tabela Insumos Master
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Formulário Novos Itens Master
  const [novoTipo, setNovoTipo] = useState("");
  const [novoItem, setNovoItem] = useState({ 
    codigo: "", 
    descricao: "", 
    tipo: "Material", 
    unidade: "un", 
    precoBaseUnitario: "" 
  });

  // Formulário Fornecedores
  const [novoFornecedor, setNovoFornecedor] = useState({
    razaoSocial: "",
    contatoNome: "",
    contatoEmail: "",
    contatoTelefone: ""
  });
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);
  const [editandoFornecedor, setEditandoFornecedor] = useState<any>(null);
  const [isEditFornecedorModalOpen, setIsEditFornecedorModalOpen] = useState(false);

  // Modal do Leitor IA Multimodal (Conciliação De-Para)
  const [isConciliacaoOpen, setIsConciliacaoOpen] = useState(false);

  // Modal Importador de Planilha (Pré-visualização)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [importedItems, setImportedItems] = useState<any[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Modal Calculadora de BDI
  const [isBdiModalOpen, setIsBdiModalOpen] = useState(false);
  const [selectedBdiCategory, setSelectedBdiCategory] = useState<any>(null);
  const [bdiManual, setBdiManual] = useState(false);
  const [bdiManualValue, setBdiManualValue] = useState("28.0");
  
  // Parâmetros de BDI do TCU (Fórmula Geral)
  const [bdiParams, setBdiParams] = useState({
    ac: 4.0,   // Administração Central (%)
    s: 0.8,    // Seguros (%)
    g: 0.5,    // Garantia (%)
    r: 1.0,    // Risco (%)
    df: 1.2,   // Despesas Financeiras (%)
    l: 8.0,    // Lucro Líquido (%)
    i: 14.25   // Impostos (PIS, COFINS, ISS) (%)
  });
  const [calculatedBdi, setCalculatedBdi] = useState(0);

  // Painel Reajuste Global
  const [reajusteForm, setReajusteForm] = useState({
    tipo: "todos",
    percentual: ""
  });
  const [isApplyingReajuste, setIsApplyingReajuste] = useState(false);

  // Edição inline de preço base
  const [precosEdicao, setPrecosEdicao] = useState<Record<string, string>>({});
  const [salvandoPrecoId, setSalvandoPrecoId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchFornecedores();
  }, []);

  useEffect(() => {
    calculateBdiValue();
  }, [bdiParams]);

  // Busca dados de insumos e categorias
  const fetchData = async () => {
    try {
      const [resTipos, resItens] = await Promise.all([
        fetch("/api/orcamentos/tipos-material"),
        fetch("/api/orcamentos/itens-padrao")
      ]);
      const dataTipos = await resTipos.json();
      const dataItens = await resItens.json();
      setTipos(Array.isArray(dataTipos) ? dataTipos : []);
      setItens(Array.isArray(dataItens) ? dataItens : []);
      
      if (dataTipos.length > 0 && !novoItem.tipo) {
        setNovoItem(prev => ({ ...prev, tipo: dataTipos[0].nome }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Busca fornecedores globais
  const fetchFornecedores = async () => {
    try {
      setLoadingFornecedores(true);
      const res = await fetch("/api/orcamentos/fornecedores");
      const data = await res.json();
      if (data.success && Array.isArray(data.fornecedores)) {
        setFornecedores(data.fornecedores);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFornecedores(false);
    }
  };

  // Salvar novo fornecedor
  const handleAddFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornecedor.razaoSocial.trim()) return;
    setSalvandoFornecedor(true);

    try {
      const res = await fetch("/api/orcamentos/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoFornecedor)
      });
      const data = await res.json();
      if (data.success) {
        setNovoFornecedor({ razaoSocial: "", contatoNome: "", contatoEmail: "", contatoTelefone: "" });
        fetchFornecedores();
      } else {
        alert(data.error || "Erro ao cadastrar fornecedor");
      }
    } catch (err) {
      alert("Erro de conexão ao cadastrar fornecedor");
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  // Salvar edição de fornecedor
  const handleSaveEditFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editandoFornecedor || !editandoFornecedor.razaoSocial.trim()) return;

    try {
      const res = await fetch(`/api/orcamentos/fornecedores/${editandoFornecedor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editandoFornecedor)
      });
      const data = await res.json();
      if (data.success) {
        setIsEditFornecedorModalOpen(false);
        setEditandoFornecedor(null);
        fetchFornecedores();
      } else {
        alert(data.error || "Erro ao atualizar fornecedor");
      }
    } catch (err) {
      alert("Erro de conexão ao salvar fornecedor");
    }
  };

  // Excluir fornecedor
  const handleDeleteFornecedor = async (id: string) => {
    if (!confirm("Deseja realmente excluir este fornecedor da base permanente?")) return;
    try {
      const res = await fetch(`/api/orcamentos/fornecedores/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchFornecedores();
      } else {
        alert(data.error || "Erro ao excluir fornecedor");
      }
    } catch (err) {
      alert("Erro de conexão ao excluir");
    }
  };

  // Salvar edição inline de preço do insumo master
  const handleInlinePrecoBlur = async (id: string, precoAntigo: number | null) => {
    const valorDigitado = precosEdicao[id];
    if (valorDigitado === undefined) return;
    const novoValor = parseFloat(valorDigitado.replace(",", "."));
    if (isNaN(novoValor) || novoValor < 0) return;
    if (novoValor === precoAntigo) return;

    try {
      setSalvandoPrecoId(id);
      const res = await fetch(`/api/orcamentos/itens-padrao/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precoBaseUnitario: novoValor })
      });
      if (res.ok) {
        setItens(prev => prev.map(item => item.id === id ? { ...item, precoBaseUnitario: novoValor } : item));
      } else {
        alert("Erro ao salvar novo preço do item.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de conexão ao salvar preço.");
    } finally {
      setSalvandoPrecoId(null);
    }
  };

  // TCU BDI Formula
  const calculateBdiValue = () => {
    const { ac, s, g, r, df, l, i } = bdiParams;
    const acDecimal = ac / 100;
    const sgDecimal = (s + g) / 100;
    const rDecimal = r / 100;
    const dfDecimal = df / 100;
    const lDecimal = l / 100;
    const iDecimal = i / 100;

    const num = (1 + acDecimal + sgDecimal + rDecimal) * (1 + dfDecimal) * (1 + lDecimal);
    const den = 1 - iDecimal;
    const result = (num / den - 1) * 100;
    setCalculatedBdi(parseFloat(result.toFixed(2)));
  };

  // Handler CRUD Categorias
  const handleAddTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTipo.trim()) return;
    try {
      const res = await fetch("/api/orcamentos/tipos-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoTipo.trim() }),
      });
      if (res.ok) {
        setNovoTipo("");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (error) {
      alert("Erro ao adicionar");
    }
  };

  const handleDeleteTipo = async (id: string) => {
    if (!confirm("Excluir esta categoria de item? Todas as associações serão removidas.")) return;
    try {
      await fetch(`/api/orcamentos/tipos-material/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      alert("Erro ao excluir");
    }
  };

  const handleSaveBdiToCategory = async () => {
    if (!selectedBdiCategory) return;
    const finalBdi = bdiManual ? parseFloat(bdiManualValue) : calculatedBdi;
    if (isNaN(finalBdi)) {
      alert("Valor de BDI inválido.");
      return;
    }

    try {
      const res = await fetch(`/api/orcamentos/tipos-material/${selectedBdiCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bdiDefault: finalBdi }),
      });
      if (res.ok) {
        setIsBdiModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Erro ao atualizar o BDI da categoria");
    }
  };

  // Handler CRUD Insumos
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.descricao || !novoItem.tipo || !novoItem.unidade) return;
    try {
      const res = await fetch("/api/orcamentos/itens-padrao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoItem),
      });
      if (res.ok) {
        setNovoItem({ 
          codigo: "", 
          descricao: "", 
          tipo: tipos[0]?.nome || "Material", 
          unidade: "un", 
          precoBaseUnitario: "" 
        });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (error) {
      alert("Erro ao adicionar");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Excluir este item de composição padrão?")) return;
    try {
      await fetch(`/api/orcamentos/itens-padrao/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      alert("Erro ao excluir");
    }
  };

  // Reajuste Global em Lote
  const handleApplyReajuste = async (e: React.FormEvent) => {
    e.preventDefault();
    const percent = parseFloat(reajusteForm.percentual);
    if (!reajusteForm.tipo || isNaN(percent)) {
      alert("Por favor, selecione uma categoria e insira um percentual válido.");
      return;
    }

    const catName = reajusteForm.tipo === "todos" ? "TODAS as categorias" : `categoria "${reajusteForm.tipo}"`;
    const actionWord = percent > 0 ? `aumento de +${percent}%` : `desconto de ${percent}%`;

    if (!confirm(`ATENÇÃO: Você está prestes a aplicar um ${actionWord} no preço base de todos os itens cadastrados na ${catName}.\nEsta ação é irreversível. Deseja prosseguir?`)) {
      return;
    }

    setIsApplyingReajuste(true);
    try {
      const res = await fetch("/api/orcamentos/itens-padrao/reajustar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: reajusteForm.tipo,
          percentual: percent
        })
      });

      if (res.ok) {
        setReajusteForm(prev => ({ ...prev, percentual: "" }));
        alert("Reajuste de preços aplicado com sucesso!");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao processar reajuste");
      }
    } catch (error) {
      alert("Erro ao enviar dados de reajuste");
    } finally {
      setIsApplyingReajuste(false);
    }
  };

  // Drag and Drop Importer (Excel, CSV)
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadFile(e.target.files[0]);
    }
  };

  const processUploadFile = async (file: File) => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    
    if (fileExt === "pdf") {
      // Abre o modal inteligente para PDF
      setIsConciliacaoOpen(true);
    } else if (fileExt === "xlsx" || fileExt === "xls" || fileExt === "csv") {
      setIsParsingFile(true);
      try {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length <= 1) {
              alert("A planilha está vazia.");
              setIsParsingFile(false);
              return;
            }

            const headerRow = data[0].map(h => String(h || "").trim().toLowerCase());
            const idxDesc = headerRow.findIndex(h => h.includes("desc") || h.includes("item") || h.includes("nome"));
            const idxPreco = headerRow.findIndex(h => h.includes("preço") || h.includes("preco") || h.includes("unit") || h.includes("valor"));
            const idxUnid = headerRow.findIndex(h => h.includes("unid") || h.includes("un") || h.includes("medida"));
            const idxCod = headerRow.findIndex(h => h.includes("cód") || h.includes("cod") || h.includes("referencia"));
            const idxTipo = headerRow.findIndex(h => h.includes("tipo") || h.includes("cat") || h.includes("grupo"));

            const parsed = [];
            for (let i = 1; i < data.length; i++) {
              const row = data[i];
              if (!row || row.length === 0) continue;
              const desc = idxDesc !== -1 ? String(row[idxDesc] || "").trim() : String(row[1] || row[0] || "").trim();
              if (!desc) continue;

              const precoRaw = idxPreco !== -1 ? row[idxPreco] : null;
              let precoNum: number | null = null;
              if (typeof precoRaw === "number") {
                precoNum = precoRaw;
              } else if (typeof precoRaw === "string") {
                const cleaned = precoRaw.replace(/[^\d.,]/g, "").replace(",", ".");
                precoNum = parseFloat(cleaned);
              }

              parsed.push({
                codigo: idxCod !== -1 ? String(row[idxCod] || "").trim().toUpperCase() : "",
                descricao: desc,
                tipo: idxTipo !== -1 && row[idxTipo] ? String(row[idxTipo]).trim() : "Material",
                unidade: idxUnid !== -1 && row[idxUnid] ? String(row[idxUnid]).trim().toLowerCase() : "un",
                precoBaseUnitario: precoNum && !isNaN(precoNum) ? precoNum : null
              });
            }

            setImportedItems(parsed);
            setIsPreviewModalOpen(true);
          } catch (e) {
            console.error(e);
            alert("Erro ao ler dados da planilha.");
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err) {
        setIsParsingFile(false);
        alert("Erro no upload do arquivo.");
      }
    } else {
      alert("Formato não suportado. Utilize PDF, Excel (.xlsx/.xls) ou CSV.");
    }
  };

  // Salvar Itens Importados
  const handleConfirmBatchImport = async () => {
    if (importedItems.length === 0) return;
    try {
      setIsParsingFile(true);
      const res = await fetch("/api/orcamentos/importar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: importedItems })
      });

      if (res.ok) {
        setIsPreviewModalOpen(false);
        setImportedItems([]);
        alert("Composições importadas com sucesso para o catálogo master!");
        fetchData();
      } else {
        alert("Erro ao persistir composições importadas.");
      }
    } catch (err) {
      alert("Erro sistêmico ao importar.");
    } finally {
      setIsParsingFile(false);
    }
  };

  // Exportar Excel
  const handleExportExcel = () => {
    if (itens.length === 0) {
      alert("Nenhum item cadastrado para exportar.");
      return;
    }
    const dataToExport = itens.map(it => ({
      "Código": it.codigo || "",
      "Descrição": it.descricao,
      "Categoria": it.tipo,
      "Unidade": it.unidade,
      "Preço Base (R$)": it.precoBaseUnitario || 0,
      "Menor Preço Quitado (R$)": it.menorPreco || "",
      "Fornecedor Menor Preço": it.fornecedorMenorPreco || "",
      "Data Última Cotação": it.dataUltimaCotacao ? new Date(it.dataUltimaCotacao).toLocaleDateString("pt-BR") : ""
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catalogo_Master_CAPEX");
    XLSX.writeFile(wb, `Cordeiro_Catalogo_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtros da Tabela EAP (Banco de Itens)
  const filteredItens = itens.filter(item => {
    const matchSearch = 
      item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.codigo && item.codigo.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedCategoryFilter === "todos") return matchSearch;
    return matchSearch && item.tipo === selectedCategoryFilter;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItens.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItens.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[600px] bg-slate-50 rounded-3xl m-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[#00B356] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Carregando Módulos de Custos & Fornecedores...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-['Montserrat',sans-serif] animate-in fade-in duration-500 pb-16">
      
      {/* ─── HEADER INSTITUCIONAL CORDEIRO ENERGIA & CAPEX ─── */}
      <div className="bg-[#0A192F] text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Glows radiais */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#E45318]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-48 -top-10 w-64 h-64 bg-[#00B356]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Barra Superior */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => router.push("/orcamentos")}
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl shadow-sm transition-all hover:scale-105 inline-flex items-center justify-center border border-white/10 text-white cursor-pointer"
                title="Voltar para Orçamentos"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

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
                  Cordeiro Energia • Gestão de CAPEX & Suprimentos
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Master Data Hub: Cadastro Central de Materiais, Custos & Fornecedores
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

          {/* Título & Ações Principais */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-[#E45318] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                  Cordeiro CAPEX v3.0
                </span>
                <span className="bg-[#00B356]/20 text-[#00B356] border border-[#00B356]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Fonte Única de Preços & Cotações
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Catálogo Master & <span className="text-[#E45318]">Configurações</span>
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
                Administre os insumos permanentes de engenharia, fornecedores homologados, taxas de BDI oficial TCU e 
                alimente automaticamente o menor preço nas listas do Padrão CEMIG e CoenergyGO.
              </p>
            </div>

            {/* Ações do Header */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsConciliacaoOpen(true)}
                className="bg-gradient-to-r from-[#E45318] to-[#ff6b2b] hover:from-[#d1440d] hover:to-[#e45318] text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#E45318]/30 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer border border-[#E45318]/40"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Conciliar Cotação com IA (PDF/Foto)</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-[#00B356]" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* Abas de Navegação (Pill Tabs CoenergyGO) */}
          <div className="flex flex-wrap bg-slate-900/80 p-1.5 rounded-2xl gap-1.5 border border-slate-800">
            <button 
              type="button"
              onClick={() => setActiveTab("composicoes")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "composicoes" 
                  ? "bg-[#00B356] text-white shadow-lg shadow-[#00B356]/20 font-black" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" /> 
              <span>Composições & Materiais</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-white">
                {itens.length}
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab("fornecedores")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "fornecedores" 
                  ? "bg-[#E45318] text-white shadow-lg shadow-[#E45318]/20 font-black" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" /> 
              <span>Fornecedores Homologados</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-white">
                {fornecedores.length}
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab("categorias")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "categorias" 
                  ? "bg-white text-slate-900 shadow-md font-black" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Percent className="w-4 h-4" /> 
              <span>Categorias & BDI (TCU)</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab("massa")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "massa" 
                  ? "bg-white text-slate-900 shadow-md font-black" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <RefreshCw className="w-4 h-4" /> 
              <span>Ações em Massa & Planilhas</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── ABA 1: BANCO DE COMPOSIÇÕES MASTER ─── */}
      {activeTab === "composicoes" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Formulário Novo Insumo */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm h-fit space-y-6">
            <div>
              <span className="px-3 py-1 bg-emerald-50 text-[#00B356] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                Cadastro Master
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mt-3">Novo Insumo Padrão</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Cadastre um material ou serviço permanente. Este item ficará disponível para o Padrão CEMIG e outros orçamentos.
              </p>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Código (Opcional)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: CABO-16MM-AZUL ou CEM-DISJ-100"
                  value={novoItem.codigo}
                  onChange={e => setNovoItem({...novoItem, codigo: e.target.value.toUpperCase()})}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00B356] focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Descrição Técnica *
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Cabo de Cobre Isolado 16 mm² 750V"
                  required
                  value={novoItem.descricao}
                  onChange={e => setNovoItem({...novoItem, descricao: e.target.value})}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00B356] focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Unidade *
                  </label>
                  <input 
                    type="text" 
                    placeholder="m, un, kg, cj"
                    required
                    value={novoItem.unidade}
                    onChange={e => setNovoItem({...novoItem, unidade: e.target.value})}
                    className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00B356] focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Preço Base (R$)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={novoItem.precoBaseUnitario}
                    onChange={e => setNovoItem({...novoItem, precoBaseUnitario: e.target.value})}
                    className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00B356] focus:bg-white transition-all font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Categoria de Custos
                </label>
                <select 
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00B356] focus:bg-white transition-all font-bold text-slate-700"
                  value={novoItem.tipo}
                  onChange={e => setNovoItem({...novoItem, tipo: e.target.value})}
                >
                  <option value="Material">Material (Geral)</option>
                  <option value="CONDUTOR">Condutores & Cabos</option>
                  <option value="DISJUNTOR">Disjuntores & Proteção</option>
                  <option value="CAIXA">Caixas de Medição & Derivação</option>
                  <option value="POSTE">Postes & Estruturas</option>
                  <option value="ATERRAMENTO">Aterramento</option>
                  <option value="ELETRODUTO">Eletrodutos & Curvas</option>
                  <option value="Mão de Obra">Mão de Obra</option>
                  <option value="Equipamentos">Equipamentos</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 bg-[#00B356] text-white hover:bg-[#009b4a] rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00B356]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Salvar no Catálogo Master
              </button>
            </form>
          </div>

          {/* Tabela de Composições */}
          <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[740px]">
            {/* Filtros da Tabela */}
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#00B356]" />
                  Itens & Preços da Fonte Única da Verdade
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Mostrando {filteredItens.length} itens cadastrados • Edite o preço base diretamente na tabela
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar código ou descrição..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00B356] text-xs font-semibold"
                  />
                </div>

                <select 
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00B356] text-xs font-bold text-slate-700 cursor-pointer"
                  value={selectedCategoryFilter}
                  onChange={(e) => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="todos">TODAS AS CATEGORIAS</option>
                  <option value="Material">Material (Geral)</option>
                  <option value="CONDUTOR">Condutores & Cabos</option>
                  <option value="DISJUNTOR">Disjuntores & Proteção</option>
                  <option value="CAIXA">Caixas de Medição</option>
                  <option value="POSTE">Postes</option>
                  <option value="ATERRAMENTO">Aterramento</option>
                  <option value="ELETRODUTO">Eletrodutos</option>
                  <option value="Mão de Obra">Mão de Obra</option>
                  <option value="Equipamentos">Equipamentos</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listagem */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-5 py-3.5">Código</th>
                    <th className="px-5 py-3.5">Descrição</th>
                    <th className="px-5 py-3.5">Categoria</th>
                    <th className="px-3 py-3.5 text-center">Un.</th>
                    <th className="px-5 py-3.5 text-right">Preço Base</th>
                    <th className="px-5 py-3.5 text-right">Menor Cotação</th>
                    <th className="px-5 py-3.5">Fornecedor</th>
                    <th className="px-3 py-3.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-3 font-mono font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                        {item.codigo || "---"}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {item.descricao}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/60">
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-500 uppercase">
                        {item.unidade}
                      </td>
                      
                      {/* Preço Base com Edição Rápida */}
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">R$</span>
                          <input
                            type="text"
                            defaultValue={item.precoBaseUnitario ? item.precoBaseUnitario.toFixed(2) : ""}
                            placeholder="0,00"
                            onChange={e => setPrecosEdicao({ ...precosEdicao, [item.id]: e.target.value })}
                            onBlur={() => handleInlinePrecoBlur(item.id, item.precoBaseUnitario)}
                            className="w-20 text-right font-bold text-slate-900 bg-transparent hover:bg-white focus:bg-white px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-[#00B356] outline-none transition-all"
                          />
                          {salvandoPrecoId === item.id && (
                            <div className="w-3 h-3 border-2 border-[#00B356] border-t-transparent rounded-full animate-spin shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Menor Preço Quitado pela IA */}
                      <td className="px-5 py-3 text-right">
                        {item.menorPreco !== null && item.menorPreco !== undefined ? (
                          <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            R$ {Number(item.menorPreco).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300">---</span>
                        )}
                      </td>

                      {/* Fornecedor Menor Preço */}
                      <td className="px-5 py-3 text-slate-500 font-medium truncate max-w-[140px]" title={item.fornecedorMenorPreco || ""}>
                        {item.fornecedorMenorPreco || "---"}
                      </td>

                      {/* Ação de Exclusão */}
                      <td className="px-3 py-3 text-right">
                        <button 
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Excluir item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredItens.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Layers className="w-10 h-10 text-slate-200" />
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhuma composição encontrada</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages} ({filteredItens.length} itens)
                </span>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#00B356] rounded-xl text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#00B356] rounded-xl text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ABA 2: FORNECEDORES HOMOLOGADOS (NOVA ABA CENTRAL) ─── */}
      {activeTab === "fornecedores" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Cadastro de Fornecedor */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm h-fit space-y-6">
            <div>
              <span className="px-3 py-1 bg-orange-50 text-[#E45318] rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-100">
                Cadastro Homologado
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mt-3">Novo Fornecedor</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Cadastre distribuidores, fabricantes e representantes de materiais e equipamentos elétricos.
              </p>
            </div>

            <form onSubmit={handleAddFornecedor} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Razão Social / Nome Fantasia *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Comercial Elétrica PJ Ltda ou EletroMG"
                  value={novoFornecedor.razaoSocial}
                  onChange={e => setNovoFornecedor({ ...novoFornecedor, razaoSocial: e.target.value })}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#E45318] focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Nome do Contato / Vendedor
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Carlos Oliveira"
                  value={novoFornecedor.contatoNome}
                  onChange={e => setNovoFornecedor({ ...novoFornecedor, contatoNome: e.target.value })}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#E45318] focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Telefone / WhatsApp
                </label>
                <input 
                  type="text" 
                  placeholder="(31) 99999-9999"
                  value={novoFornecedor.contatoTelefone}
                  onChange={e => setNovoFornecedor({ ...novoFornecedor, contatoTelefone: e.target.value })}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#E45318] focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  E-mail para Cotações
                </label>
                <input 
                  type="email" 
                  placeholder="compras@fornecedor.com.br"
                  value={novoFornecedor.contatoEmail}
                  onChange={e => setNovoFornecedor({ ...novoFornecedor, contatoEmail: e.target.value })}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#E45318] focus:bg-white transition-all font-medium"
                />
              </div>

              <button 
                type="submit" 
                disabled={salvandoFornecedor}
                className="w-full py-3.5 bg-[#E45318] text-white hover:bg-[#d1440d] rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#E45318]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> 
                <span>{salvandoFornecedor ? "Cadastrando..." : "Cadastrar Fornecedor"}</span>
              </button>
            </form>
          </div>

          {/* Lista de Fornecedores */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#E45318]" />
                  Fornecedores Homologados ({fornecedores.length})
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Parceiros cadastrados para cotações e equalizações de obras
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsConciliacaoOpen(true)}
                className="bg-gradient-to-r from-[#E45318] to-[#ff6b2b] text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Importar Cotação com IA</span>
              </button>
            </div>

            {loadingFornecedores ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                <div className="w-6 h-6 border-2 border-[#E45318] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 mt-2">Carregando carteira de fornecedores...</p>
              </div>
            ) : fornecedores.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-black text-slate-700 uppercase">Nenhum fornecedor cadastrado</p>
                <p className="text-xs text-slate-400">Preencha o formulário ao lado para cadastrar seu primeiro parceiro comercial.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fornecedores.map((f) => (
                  <div 
                    key={f.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4 relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          HOMOLOGADO
                        </span>
                        <h4 className="text-lg font-black text-slate-900 mt-2">{f.razaoSocial}</h4>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoFornecedor(f);
                            setIsEditFornecedorModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar fornecedor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFornecedor(f.id)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Excluir fornecedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                      {f.contatoNome && (
                        <p className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{f.contatoNome}</span>
                        </p>
                      )}
                      {f.contatoTelefone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{f.contatoTelefone}</span>
                        </p>
                      )}
                      {f.contatoEmail && (
                        <p className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-blue-500" />
                          <span className="truncate">{f.contatoEmail}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>{f.totalCotacoesIA || 0} cotações processadas</span>
                      <button
                        type="button"
                        onClick={() => setIsConciliacaoOpen(true)}
                        className="text-[#E45318] hover:text-[#d1440d] font-black uppercase text-[10px] tracking-wider inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Cotar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ABA 3: CATEGORIAS & BDI (TCU) ─── */}
      {activeTab === "categorias" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Formulário Nova Categoria */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm h-fit space-y-6">
            <div>
              <span className="px-3 py-1 bg-emerald-50 text-[#00B356] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                Segmentação EAP
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mt-3">Adicionar Categoria</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Crie partições de composições para segmentar a planilha do orçamento por disciplinas específicas de engenharia.
              </p>
            </div>

            <form onSubmit={handleAddTipo} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Nome da Categoria *
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Subestação, Painéis, Civil, BESS"
                  required
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value)}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00B356] focus:bg-white transition-all font-semibold"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 bg-[#0A192F] text-white hover:bg-[#00B356] rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Criar Categoria
              </button>
            </form>
          </div>

          {/* Grid de Categorias & BDIs */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Parametrização de BDIs por Categoria
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Estipule o percentual padrão de BDI para encarecimento automático durante a composição do orçamento.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[160px] border-l-4 border-l-slate-400">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">SISTEMA DEFAULT</span>
                  <h4 className="text-xl font-black uppercase text-slate-900 mt-2">Material Geral</h4>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-black">
                    BDI Padrão: 0.0%
                  </span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Edição Local</p>
                </div>
              </div>

              {/* Categorias */}
              {tipos.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-3xl border border-[#00B356]/20 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[160px] group border-l-4 border-l-[#00B356]">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#00B356] bg-emerald-50 px-2 py-0.5 rounded">
                        DISCIPLINA
                      </span>
                      <h4 className="text-xl font-black uppercase text-slate-900 mt-2">{t.nome}</h4>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteTipo(t.id)}
                      className="p-1.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                    <span className="px-3 py-1 bg-emerald-50 text-[#00B356] rounded-xl text-xs font-black border border-emerald-100">
                      BDI: {(t.bdiDefault ?? 0).toFixed(1)}%
                    </span>

                    <button 
                      type="button"
                      onClick={() => { setSelectedBdiCategory(t); setIsBdiModalOpen(true); }}
                      className="text-xs font-black uppercase text-slate-700 hover:text-[#00B356] tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 text-[#00B356]" /> Configurar BDI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 4: AÇÕES EM MASSA & PLANILHAS ─── */}
      {activeTab === "massa" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card Esquerdo: Importador Drag-and-drop */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-emerald-50 text-[#00B356] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                Lote & Planilhas
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Importador em Lote</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Carregue composições em massa. Arraste planilhas de fornecedores (**CSV**, **XLSX**, **XLS**) ou propostas em **PDF** para extração assistida por Inteligência Artificial (Gemini).
              </p>
            </div>

            {/* Area de Drop */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group ${
                dragActive 
                  ? "border-[#00B356] bg-emerald-50/30" 
                  : "border-slate-300 hover:border-[#00B356] bg-slate-50/50 hover:bg-white"
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                multiple={false}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden" 
              />
              
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#00B356] group-hover:scale-110 shadow-sm transition-all">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Arraste arquivos ou clique para selecionar
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Suporta planilhas Excel e propostas em PDF</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={handleExportExcel}
                className="text-[#00B356] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Catálogo Atual em Excel
              </button>
            </div>
          </div>

          {/* Card Direito: Reajuste Percentual em Lote */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-orange-50 text-[#E45318] rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-100">
                Inflação & Reajuste
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Reajuste de Preços</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Aplique uma variação percentual sobre todos os preços base de uma categoria ou em todo o catálogo de forma instantânea.
              </p>
            </div>

            <form onSubmit={handleApplyReajuste} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Categoria Alvo
                </label>
                <select
                  value={reajusteForm.tipo}
                  onChange={e => setReajusteForm({ ...reajusteForm, tipo: e.target.value })}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#E45318] focus:bg-white transition-all font-bold text-slate-700 cursor-pointer"
                >
                  <option value="todos">TODAS AS CATEGORIAS</option>
                  <option value="Material">Material (Geral)</option>
                  <option value="CONDUTOR">Condutores & Cabos</option>
                  <option value="DISJUNTOR">Disjuntores & Proteção</option>
                  <option value="Mão de Obra">Mão de Obra</option>
                  <option value="Equipamentos">Equipamentos</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Percentual de Reajuste (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5.5 para aumento ou -3.2 para desconto"
                    value={reajusteForm.percentual}
                    onChange={e => setReajusteForm({ ...reajusteForm, percentual: e.target.value })}
                    className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#E45318] focus:bg-white transition-all font-bold text-slate-900"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isApplyingReajuste}
                className="w-full py-3.5 bg-[#E45318] text-white hover:bg-[#d1440d] rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#E45318]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isApplyingReajuste ? "Processando..." : "Aplicar Reajuste em Lote"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DO LEITOR INTELIGENTE IA (CONTA AZUL RECONCILIATION) ─── */}
      <ConciliacaoOrcamentoModal
        isOpen={isConciliacaoOpen}
        onClose={() => setIsConciliacaoOpen(false)}
        catalogoMateriais={itens}
        onSucesso={() => {
          setIsConciliacaoOpen(false);
          fetchData();
          fetchFornecedores();
        }}
      />

      {/* ─── MODAL: EDITAR FORNECEDOR ─── */}
      {isEditFornecedorModalOpen && editandoFornecedor && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] tracking-widest block">Edição Cadastral</span>
                <h3 className="text-xl font-black text-slate-900">Editar Fornecedor</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#E45318] flex items-center justify-center">
                <Edit2 className="w-5 h-5" />
              </div>
            </div>

            <form onSubmit={handleSaveEditFornecedor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Razão Social *
                </label>
                <input 
                  type="text" 
                  required
                  value={editandoFornecedor.razaoSocial}
                  onChange={e => setEditandoFornecedor({ ...editandoFornecedor, razaoSocial: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E45318] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Contato / Representante
                </label>
                <input 
                  type="text" 
                  value={editandoFornecedor.contatoNome || ""}
                  onChange={e => setEditandoFornecedor({ ...editandoFornecedor, contatoNome: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E45318] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Telefone / WhatsApp
                </label>
                <input 
                  type="text" 
                  value={editandoFornecedor.contatoTelefone || ""}
                  onChange={e => setEditandoFornecedor({ ...editandoFornecedor, contatoTelefone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E45318] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  E-mail
                </label>
                <input 
                  type="email" 
                  value={editandoFornecedor.contatoEmail || ""}
                  onChange={e => setEditandoFornecedor({ ...editandoFornecedor, contatoEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E45318] transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditFornecedorModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#E45318] hover:bg-[#d1440d] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CALCULADORA DE BDI TCU ─── */}
      {isBdiModalOpen && selectedBdiCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#00B356] tracking-widest block">
                  Metodologia Oficial Acórdão TCU
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Cálculo de BDI • {selectedBdiCategory.nome}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00B356] flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Administração Central (AC %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bdiParams.ac}
                    onChange={e => setBdiParams({ ...bdiParams, ac: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Seguros & Garantias (S+G %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bdiParams.s}
                    onChange={e => setBdiParams({ ...bdiParams, s: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Risco (R %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bdiParams.r}
                    onChange={e => setBdiParams({ ...bdiParams, r: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Despesas Financeiras (DF %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bdiParams.df}
                    onChange={e => setBdiParams({ ...bdiParams, df: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Lucro Operacional Líquido (L %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bdiParams.l}
                    onChange={e => setBdiParams({ ...bdiParams, l: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tributos / Impostos (I %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bdiParams.i}
                    onChange={e => setBdiParams({ ...bdiParams, i: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 mt-1"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">BDI Resultante</span>
                  <p className="text-2xl font-black text-emerald-800">{calculatedBdi.toFixed(2)}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkManual"
                    checked={bdiManual}
                    onChange={e => setBdiManual(e.target.checked)}
                    className="rounded text-[#00B356]"
                  />
                  <label htmlFor="chkManual" className="text-xs font-bold text-slate-600">Inserir Manual</label>
                </div>
              </div>

              {bdiManual && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Manual (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bdiManualValue}
                    onChange={e => setBdiManualValue(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 mt-1"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBdiModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveBdiToCategory}
                className="bg-[#00B356] hover:bg-[#009b4a] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                Aplicar BDI à Categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: PREVIEW DE IMPORTAÇÃO DE PLANILHA ─── */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#00B356] tracking-widest block">Pré-visualização</span>
                <h3 className="text-xl font-black text-slate-900">
                  {importedItems.length} Itens Mapeados na Planilha
                </h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00B356] flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Cat.</th>
                    <th className="p-3">Un.</th>
                    <th className="p-3 text-right">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importedItems.slice(0, 30).map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-400">{it.codigo || "---"}</td>
                      <td className="p-3 font-semibold text-slate-800">{it.descricao}</td>
                      <td className="p-3 text-slate-500">{it.tipo}</td>
                      <td className="p-3 uppercase text-slate-500">{it.unidade}</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {it.precoBaseUnitario ? `R$ ${it.precoBaseUnitario.toFixed(2)}` : "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importedItems.length > 30 && (
                <p className="p-3 text-center text-xs text-slate-400 bg-slate-50 font-bold">
                  ...e mais {importedItems.length - 30} itens
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchImport}
                disabled={isParsingFile}
                className="bg-[#00B356] hover:bg-[#009b4a] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isParsingFile ? "Importando..." : "Confirmar e Gravar no Catálogo"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
