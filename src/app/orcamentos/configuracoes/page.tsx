"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, Plus, Trash, Settings, Loader, Upload, 
  Percent, DollarSign, RefreshCw, Layers, Sliders, FileSpreadsheet, 
  FileText, Search, Info, HelpCircle, Check, AlertCircle, Edit2
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export default function OrcamentosConfigPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Globais
  const [tipos, setTipos] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"composicoes" | "categorias" | "massa">("composicoes");

  // Busca e Filtros da EAP (Tabela Insumos)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Formulário Novos Itens
  const [novoTipo, setNovoTipo] = useState("");
  const [novoItem, setNovoItem] = useState({ 
    codigo: "", 
    descricao: "", 
    tipo: "Material", 
    unidade: "un", 
    precoBaseUnitario: "" 
  });

  // Modal Importador (Pré-visualização)
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateBdiValue();
  }, [bdiParams]);

  // Busca inicial
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

  // TCU BDI Formula
  const calculateBdiValue = () => {
    const { ac, s, g, r, df, l, i } = bdiParams;
    const acDecimal = ac / 100;
    const sgDecimal = (s + g) / 100;
    const rDecimal = r / 100;
    const dfDecimal = df / 100;
    const lDecimal = l / 100;
    const iDecimal = i / 100;

    // Fórmula do BDI TCU: [((1 + AC + S + G + R) * (1 + DF) * (1 + L)) / (1 - I)] - 1
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

  // Salvar taxa BDI calculada ou manual na categoria
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

  // Drag and Drop Importer (Excel, CSV, PDF)
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
      // Importação de PDF via Gemini AI
      setIsParsingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/orcamentos/importar", {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            setImportedItems(data.items);
            setIsPreviewModalOpen(true);
          } else {
            alert("A IA não conseguiu mapear itens válidos neste PDF.");
          }
        } else {
          const data = await res.json();
          alert(data.error || "Falha na análise do arquivo PDF.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro no upload do arquivo PDF.");
      } finally {
        setIsParsingFile(false);
      }
    } else if (fileExt === "xlsx" || fileExt === "xls" || fileExt === "csv") {
      // Importação de planilhas locais via SheetJS
      setIsParsingFile(true);
      try {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Identificar cabeçalho e colunas para mapear: Código, Descrição, Tipo, Unidade, Preço
            const headers = data[0] || [];
            let colIdx = { codigo: -1, descricao: -1, tipo: -1, unidade: -1, preco: -1 };

            headers.forEach((h: any, i: number) => {
              const text = String(h).toLowerCase().trim();
              if (text.includes("cód") || text.includes("cod")) colIdx.codigo = i;
              else if (text.includes("desc") || text.includes("item") || text.includes("nome")) colIdx.descricao = i;
              else if (text.includes("tipo") || text.includes("cat")) colIdx.tipo = i;
              else if (text.includes("un") || text.includes("medida")) colIdx.unidade = i;
              else if (text.includes("preço") || text.includes("preco") || text.includes("valor") || text.includes("base")) colIdx.preco = i;
            });

            // Fallback se não encontrou cabeçalho estruturado (mapeamento posicional)
            if (colIdx.descricao === -1) colIdx.descricao = 1;
            if (colIdx.preco === -1) colIdx.preco = headers.length - 1;

            const mappedRows = data.slice(1).map(row => {
              const code = colIdx.codigo !== -1 ? row[colIdx.codigo] : null;
              const desc = colIdx.descricao !== -1 ? row[colIdx.descricao] : null;
              const type = colIdx.tipo !== -1 ? row[colIdx.tipo] : "Material";
              const unit = colIdx.unidade !== -1 ? row[colIdx.unidade] : "un";
              const price = colIdx.preco !== -1 ? parseFloat(String(row[colIdx.preco]).replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) : null;

              if (!desc) return null; // Ignora linhas em branco

              // Normalizar tipos
              let finalType = "Material";
              const typeStr = String(type).toLowerCase();
              if (typeStr.includes("mão") || typeStr.includes("mao") || typeStr.includes("serviço") || typeStr.includes("labor")) {
                finalType = "Mão de Obra";
              } else if (typeStr.includes("equi") || typeStr.includes("maq") || typeStr.includes("ferra")) {
                finalType = "Equipamentos";
              }

              return {
                codigo: code ? String(code) : null,
                descricao: String(desc),
                tipo: finalType,
                unidade: unit ? String(unit) : "un",
                precoBaseUnitario: isNaN(Number(price)) ? null : Number(price)
              };
            }).filter(Boolean);

            if (mappedRows.length > 0) {
              setImportedItems(mappedRows);
              setIsPreviewModalOpen(true);
            } else {
              alert("Nenhum item válido pôde ser extraído da planilha.");
            }
          } catch (err) {
            alert("Erro ao interpretar as células da planilha.");
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err) {
        alert("Erro ao ler o arquivo.");
        setIsParsingFile(false);
      }
    } else {
      alert("Formato não suportado. Envie arquivos .xlsx, .xls, .csv ou .pdf!");
    }
  };

  // Salvar itens pré-visualizados no banco
  const handleSaveImportedItems = async () => {
    try {
      const res = await fetch("/api/orcamentos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: importedItems })
      });

      if (res.ok) {
        setIsPreviewModalOpen(false);
        setImportedItems([]);
        alert("Composições importadas e salvas com sucesso!");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar os itens no banco de dados.");
      }
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    }
  };

  // Manipular edição rápida das células na pré-visualização da importação
  const handleEditImportedRow = (index: number, field: string, value: any) => {
    const updated = [...importedItems];
    if (field === "precoBaseUnitario") {
      updated[index][field] = value ? parseFloat(value) : null;
    } else {
      updated[index][field] = value;
    }
    setImportedItems(updated);
  };

  const handleRemoveImportedRow = (index: number) => {
    setImportedItems(importedItems.filter((_, i) => i !== index));
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
      <div className="flex justify-center items-center min-h-[600px] bg-slate-50/50 rounded-[4rem] border border-slate-100/50 m-8">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#00BFA5]" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Carregando Módulos de Custos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 font-montserrat">
      
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push("/orcamentos")}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl shadow-sm hover:shadow transition-all text-slate-500 hover:text-slate-900 group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
              CAPEX & BUDGET <span className="text-[#00BFA5]">SIE</span>
              <span className="px-4 py-1.5 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">v3.5 PRO</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#00BFA5] animate-spin" style={{ animationDuration: "12s" }} /> 
              Banco de Preços de Insumos, Mão de Obra e Encargos BDI
            </p>
          </div>
        </div>

        {/* Abas Glassmorphism */}
        <div className="flex bg-slate-100 p-2 rounded-2xl gap-2 self-start lg:self-center border border-slate-200/30">
          <button 
            onClick={() => setActiveTab("composicoes")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "composicoes" 
                ? "bg-white text-slate-900 shadow-lg shadow-slate-200" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" /> Composições
          </button>
          <button 
            onClick={() => setActiveTab("categorias")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "categorias" 
                ? "bg-white text-slate-900 shadow-lg shadow-slate-200" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Percent className="w-4 h-4 inline mr-2" /> Categorias & BDI
          </button>
          <button 
            onClick={() => setActiveTab("massa")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "massa" 
                ? "bg-white text-slate-900 shadow-lg shadow-slate-200" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <RefreshCw className="w-4 h-4 inline mr-2" /> Ações em Massa
          </button>
        </div>
      </div>

      {/* ── ABA 1: BANCO DE COMPOSIÇÕES ──────────────────────────────────────── */}
      {activeTab === "composicoes" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Formulário Inserção Unitária */}
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl shadow-slate-200/40 h-fit space-y-8">
            <div>
              <span className="px-3 py-1 bg-emerald-50 text-[#00BFA5] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                Cadastro Rápido
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mt-4">Novo Insumo Padrão</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">Preencha os campos abaixo para salvar uma composição unitária no banco de insumos permanente.</p>
            </div>

            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código do Item</label>
                <input 
                  type="text" 
                  placeholder="Ex: CAB-CC-06"
                  value={novoItem.codigo}
                  onChange={e => setNovoItem({...novoItem, codigo: e.target.value.toUpperCase()})}
                  className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição Técnica</label>
                <input 
                  type="text" 
                  placeholder="Ex: Cabo de cobre solar flexível 6mm2"
                  required
                  value={novoItem.descricao}
                  onChange={e => setNovoItem({...novoItem, descricao: e.target.value})}
                  className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</label>
                  <input 
                    type="text" 
                    placeholder="Ex: m, un, kg"
                    required
                    value={novoItem.unidade}
                    onChange={e => setNovoItem({...novoItem, unidade: e.target.value})}
                    className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Base (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 8.90"
                    required
                    value={novoItem.precoBaseUnitario}
                    onChange={e => setNovoItem({...novoItem, precoBaseUnitario: e.target.value})}
                    className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria de Custos</label>
                <select 
                  className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-bold text-slate-700"
                  value={novoItem.tipo}
                  onChange={e => setNovoItem({...novoItem, tipo: e.target.value})}
                >
                  <option value="Material">Material (Geral)</option>
                  <option value="Mão de Obra">Mão de Obra</option>
                  <option value="Equipamentos">Equipamentos</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-[#00BFA5] text-white hover:bg-[#00a892] rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-[#00BFA5]/20 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Salvar Composição
                </button>
                
                <div className="flex items-center py-1">
                  <div className="flex-1 h-px bg-slate-100"></div>
                  <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">ou importar em lote</span>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".xlsx,.xls,.csv";
                    input.onchange = (e: any) => {
                      if (e.target.files && e.target.files[0]) {
                        processUploadFile(e.target.files[0]);
                      }
                    };
                    input.click();
                  }}
                  className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#00BFA5]" /> Carregar Planilha Excel
                </button>
              </div>
            </form>
          </div>

          {/* Tabela de Composições */}
          <div className="xl:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col h-[700px]">
            {/* Filtros */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Banco de Composições Padrão</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wide">
                  Mostrando {filteredItens.length} itens cadastrados
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Campo de Busca */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar insumos..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00BFA5] text-xs font-semibold w-[200px]"
                  />
                </div>

                {/* Filtro por Categoria */}
                <select 
                  className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00BFA5] text-xs font-bold text-slate-600 cursor-pointer"
                  value={selectedCategoryFilter}
                  onChange={(e) => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="todos">TODAS AS ABAS</option>
                  <option value="Material">MATERIAL (GERAL)</option>
                  <option value="Mão de Obra">MÃO DE OBRA</option>
                  <option value="Equipamentos">EQUIPAMENTOS</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listagem */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-8 py-5">Código</th>
                    <th className="px-8 py-5">Descrição</th>
                    <th className="px-8 py-5">Categoria</th>
                    <th className="px-8 py-5 text-center">Unidade</th>
                    <th className="px-8 py-5 text-right">Preço Base</th>
                    <th className="px-8 py-5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="px-8 py-4 font-mono text-xs font-bold text-slate-400 group-hover:text-slate-700 transition-colors">
                        {item.codigo || "---"}
                      </td>
                      <td className="px-8 py-4 font-semibold text-slate-800 text-sm">
                        {item.descricao}
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          item.tipo === "Mão de Obra" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          item.tipo === "Equipamentos" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          "bg-slate-50 text-slate-600 border border-slate-200/50"
                        }`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center font-bold text-slate-500 text-xs uppercase">
                        {item.unidade}
                      </td>
                      <td className="px-8 py-4 text-right font-black text-slate-900 text-sm">
                        {item.precoBaseUnitario ? `R$ ${item.precoBaseUnitario.toFixed(2)}` : "R$ 0,00"}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 border border-slate-100 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredItens.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Layers className="w-12 h-12 text-slate-200" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma composição encontrada</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-slate-200 hover:border-[#00BFA5] rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-colors"
                  >
                    Anterior
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-slate-200 hover:border-[#00BFA5] rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA 2: CATEGORIAS & BDI ─────────────────────────────────────────── */}
      {activeTab === "categorias" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Formulário Nova Categoria */}
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl shadow-slate-200/40 h-fit space-y-8">
            <div>
              <span className="px-3 py-1 bg-emerald-50 text-[#00BFA5] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                Categorias
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mt-4">Adicionar Categoria</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">Crie partições de composições para segmentar a planilha do orçamento por disciplinas específicas de engenharia.</p>
            </div>

            <form onSubmit={handleAddTipo} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Categoria</label>
                <input 
                  type="text" 
                  placeholder="Ex: Subestação, Painéis, Civil"
                  required
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value)}
                  className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-semibold"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-black text-white hover:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
              >
                <Plus className="w-4 h-4" /> Criar Categoria
              </button>
            </form>
          </div>

          {/* Grid de Categorias & BDIs */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Parametrização de BDIs por Categoria</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Estipule o percentual padrão de BDI para encarecimento automático de insumos durante a montagem do orçamento.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Categorias Padrão do Sistema (Material, Mão de Obra, Equipamentos) */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg relative flex flex-col justify-between min-h-[180px] group border-l-4 border-l-slate-400">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">SISTEMA DEFAULT</span>
                  </div>
                  <h4 className="text-2xl font-black uppercase text-slate-900 mt-2">Material Geral</h4>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <span className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black">
                    BDI Padrão: 0.0%
                  </span>
                  <p className="text-[9px] font-bold text-slate-300 italic uppercase">Somente edição local</p>
                </div>
              </div>

              {/* Categorias Customizadas com BDI */}
              {tipos.map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[2.5rem] border border-[#00BFA5]/10 shadow-lg hover:shadow-xl transition-all relative flex flex-col justify-between min-h-[180px] group border-l-4 border-l-[#00BFA5]">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#00BFA5] bg-emerald-50 px-2 py-0.5 rounded">CUSTOM CATEGORY</span>
                      <h4 className="text-2xl font-black uppercase text-slate-900 mt-2">{t.nome}</h4>
                    </div>
                    <button 
                      onClick={() => handleDeleteTipo(t.id)}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100 hover:border-red-100"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-6">
                    <span className="px-4 py-1.5 bg-emerald-50 text-[#00BFA5] rounded-xl text-xs font-black border border-emerald-100">
                      BDI Padrão: {(t.bdiDefault ?? 0).toFixed(1)}%
                    </span>

                    <button 
                      onClick={() => { setSelectedBdiCategory(t); setIsBdiModalOpen(true); }}
                      className="text-xs font-black uppercase text-slate-700 hover:text-[#00BFA5] tracking-widest flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-4.5 h-4.5 text-[#00BFA5]" /> Configurar BDI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA 3: AÇÕES EM MASSA ───────────────────────────────────────────── */}
      {activeTab === "massa" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card Esquerdo: Importador Drag-and-drop */}
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl shadow-slate-200/40 space-y-8 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-3 py-1 bg-emerald-50 text-[#00BFA5] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                Otimização CAPEX
              </span>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Importador em Lote Inteligente</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Carregue centenas de composições em segundos. Arraste planilhas de fornecedores (**CSV**, **XLSX**, **XLS**) ou propostas em **PDF** para extração assistida por Inteligência Artificial (Gemini).
              </p>
            </div>

            {/* Area de Drop */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-16 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group ${
                dragActive 
                  ? "border-[#00BFA5] bg-emerald-50/20" 
                  : "border-slate-200 hover:border-[#00BFA5]/50 bg-slate-50/50 hover:bg-white"
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
              
              {isParsingFile ? (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <Loader className="w-12 h-12 text-[#00BFA5] animate-spin" />
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    IA e Parsers interpretando os dados... Aguarde.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-md group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-[#00BFA5]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-tight text-slate-800">
                      Arraste o arquivo ou clique para carregar
                    </p>
                    <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
                      Suporta: Excel (.xlsx, .xls), CSV e PDF (Extração IA)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Informações Extras */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start">
              <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                **PDF Inteligente:** Para arquivos PDF, a IA (Gemini) fará a varredura das tabelas de propostas técnicas e gerará a lista contendo as descrições de insumos e preços base correspondentes para sua conferência antes de salvar.
              </p>
            </div>
          </div>

          {/* Card Direito: Reajuste em Lote */}
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl shadow-slate-200/40 space-y-8 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100">
                Inflação & Reajustes
              </span>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Reajuste de Preços em Lote</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Aplique correções inflacionárias globais, flutuações de insumos elétricos (cobre/alumínio) ou dê descontos percentuais a toda uma categoria cadastrada de uma só vez.
              </p>
            </div>

            <form onSubmit={handleApplyReajuste} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seleção de Categoria */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplina de Itens</label>
                  <select 
                    className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-bold text-slate-700"
                    value={reajusteForm.tipo}
                    onChange={e => setReajusteForm({...reajusteForm, tipo: e.target.value})}
                  >
                    <option value="todos">TODOS OS ITENS DO BANCO</option>
                    <option value="Material">Material (Geral)</option>
                    <option value="Mão de Obra">Mão de Obra</option>
                    <option value="Equipamentos">Equipamentos</option>
                    {tipos.map(t => (
                      <option key={t.id} value={t.nome}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Percentual de Reajuste */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Percentual de Ajuste (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 5.5 ou -3.2"
                      required
                      value={reajusteForm.percentual}
                      onChange={e => setReajusteForm({...reajusteForm, percentual: e.target.value})}
                      className="w-full text-sm p-4 pr-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#00BFA5] focus:bg-white transition-all font-black text-slate-800"
                    />
                    <Percent className="w-5 h-5 absolute right-4 top-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100/50 flex gap-4 items-start">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-red-600 font-bold uppercase tracking-wide">
                  **ATENÇÃO:** O reajuste global recalcula e sobrescreve de forma direta o Preço Base unitário de todas as composições elegíveis no banco. Certifique-se dos valores antes de salvar.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isApplyingReajuste}
                className="w-full py-5 bg-black hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.01] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isApplyingReajuste ? <Loader className="w-4 h-4 animate-spin text-white" /> : <RefreshCw className="w-4 h-4 text-cordeiro-orange" />}
                {isApplyingReajuste ? "Processando no Servidor..." : "Aplicar Reajuste Global"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CALCULADORA DE BDI (TCU ACÓRDÃO 2622/2013) ────────────────── */}
      {isBdiModalOpen && selectedBdiCategory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl overflow-hidden shadow-2xl border-4 border-[#00BFA5]/20 flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]">
            
            {/* Esquerda: Parâmetros e Inputs */}
            <div className="flex-1 p-8 md:p-10 space-y-6 overflow-y-auto max-h-[50vh] md:max-h-[90vh]">
              <div>
                <span className="px-3 py-1 bg-emerald-50 text-[#00BFA5] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                  TCU Acórdão 2622/2013
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mt-4">Calculadora de BDI</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Categoria: {selectedBdiCategory.nome}</p>
              </div>

              {/* Botão de Override Manual */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="manualBdi" 
                  checked={bdiManual} 
                  onChange={(e) => setBdiManual(e.target.checked)}
                  className="w-4 h-4 text-[#00BFA5] focus:ring-[#00BFA5] border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="manualBdi" className="text-xs font-black text-slate-700 uppercase tracking-wide cursor-pointer">
                  Definir percentual de BDI manualmente
                </label>
              </div>

              {bdiManual ? (
                // Campo Manual Livre
                <div className="space-y-2 animate-in slide-in-from-top duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de BDI Final (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 28.5"
                      value={bdiManualValue}
                      onChange={(e) => setBdiManualValue(e.target.value)}
                      className="w-full text-base p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00BFA5] font-black text-slate-800"
                    />
                    <Percent className="w-5 h-5 absolute right-4 top-4.5 text-slate-400" />
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold italic">Isso aplicará uma taxa direta sem passar pelas composições de custos indiretos do TCU.</p>
                </div>
              ) : (
                // Sliders de Custos Indiretos (TCU Formula)
                <div className="space-y-5 animate-in slide-in-from-bottom duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                        <span>Adm. Central (AC)</span>
                        <span className="text-slate-700">{bdiParams.ac}%</span>
                      </div>
                      <input type="range" min="1" max="10" step="0.1" value={bdiParams.ac} onChange={e => setBdiParams({...bdiParams, ac: parseFloat(e.target.value)})} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                        <span>Lucro Líquido (L)</span>
                        <span className="text-slate-700">{bdiParams.l}%</span>
                      </div>
                      <input type="range" min="1" max="15" step="0.1" value={bdiParams.l} onChange={e => setBdiParams({...bdiParams, l: parseFloat(e.target.value)})} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                        <span>Seguros (S)</span>
                        <span className="text-slate-700">{bdiParams.s}%</span>
                      </div>
                      <input type="number" step="0.1" value={bdiParams.s} onChange={e => setBdiParams({...bdiParams, s: parseFloat(e.target.value) || 0})} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-center" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                        <span>Garantia (G)</span>
                        <span className="text-slate-700">{bdiParams.g}%</span>
                      </div>
                      <input type="number" step="0.1" value={bdiParams.g} onChange={e => setBdiParams({...bdiParams, g: parseFloat(e.target.value) || 0})} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-center" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                        <span>Risco (R)</span>
                        <span className="text-slate-700">{bdiParams.r}%</span>
                      </div>
                      <input type="number" step="0.1" value={bdiParams.r} onChange={e => setBdiParams({...bdiParams, r: parseFloat(e.target.value) || 0})} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-center" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                        <span>Desp. Financeiras (DF)</span>
                        <span className="text-slate-700">{bdiParams.df}%</span>
                      </div>
                      <input type="number" step="0.1" value={bdiParams.df} onChange={e => setBdiParams({...bdiParams, df: parseFloat(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-center" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                        <span>Tributos / Impostos (I)</span>
                        <span className="text-slate-700">{bdiParams.i}%</span>
                      </div>
                      <input type="number" step="0.01" value={bdiParams.i} onChange={e => setBdiParams({...bdiParams, i: parseFloat(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-center" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direita: Resultado da fórmula (TCU Acórdão) */}
            <div className="w-full md:w-[350px] bg-slate-900 p-8 md:p-10 text-white flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 overflow-y-auto max-h-[40vh] md:max-h-[90vh]">
              <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultado do BDI</h4>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-6xl font-black tracking-tighter text-[#00BFA5]">
                      {bdiManual ? parseFloat(bdiManualValue || '0').toFixed(2) : calculatedBdi}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">
                    {bdiManual ? "Taxa Global Inserida Manualmente" : "Calculado via Acórdão do TCU"}
                  </p>
                </div>

                {/* Fórmula TCU Visível */}
                {!bdiManual && (
                  <div className="space-y-4 p-5 bg-white/5 border border-white/5 rounded-2xl text-[10px] leading-relaxed">
                    <div className="border-b border-white/5 pb-2 text-slate-400">
                      <span className="font-bold uppercase tracking-wider block text-white mb-2">Equação do TCU</span>
                      <div className="font-mono text-[9px] text-[#00BFA5] bg-black/40 p-3 rounded-xl text-center leading-relaxed font-black">
                        BDI = [ ( (1 + AC + S + G + R) * (1 + DF) * (1 + L) ) / (1 - I) ] - 1
                      </div>
                    </div>
                    
                    <div className="space-y-1 font-mono text-[9px] text-slate-300">
                      <p>Numerador: (1 + {bdiParams.ac/100} + {(bdiParams.s+bdiParams.g)/100} + {bdiParams.r/100}) * (1 + {bdiParams.df/100}) * (1 + {bdiParams.l/100}) = <span className="text-[#00BFA5] font-bold">{((1 + bdiParams.ac/100 + (bdiParams.s+bdiParams.g)/100 + bdiParams.r/100) * (1 + bdiParams.df/100) * (1 + bdiParams.l/100)).toFixed(4)}</span></p>
                      <p>Denominador (1 - I): 1 - {bdiParams.i/100} = <span className="text-[#00BFA5] font-bold">{(1 - bdiParams.i/100).toFixed(4)}</span></p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 mt-8">
                <button 
                  onClick={handleSaveBdiToCategory}
                  className="w-full py-4 bg-[#00BFA5] text-white hover:bg-[#00a892] rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Aplicar à Categoria
                </button>
                <button 
                  onClick={() => setIsBdiModalOpen(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PRÉ-VISUALIZAÇÃO DE IMPORTAÇÃO (GRID INTERATIVO) ──────────── */}
      {isPreviewModalOpen && importedItems.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-6xl overflow-hidden shadow-2xl border-4 border-[#00BFA5]/20 flex flex-col h-[85vh] max-h-[85vh]">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <span className="px-3 py-1 bg-emerald-50 text-[#00BFA5] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                  Preview de Carga de Composições
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mt-4">Pré-visualização da Importação</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Confronte os dados interpretados. Você pode editar diretamente as células abaixo antes de efetivar no banco PostgreSQL.</p>
              </div>
              
              <div className="text-right">
                <span className="px-4 py-2 bg-black text-white rounded-xl font-mono text-xs font-black">
                  {importedItems.length} itens extraídos
                </span>
              </div>
            </div>

            {/* Grid Interativo para Edição Rápida */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-20">
                  <tr>
                    <th className="p-4 border border-slate-200">Código</th>
                    <th className="p-4 border border-slate-200">Descrição Técnica</th>
                    <th className="p-4 border border-slate-200 w-40">Categoria</th>
                    <th className="p-4 border border-slate-200 text-center w-24">Unidade</th>
                    <th className="p-4 border border-slate-200 text-right w-36">Preço Base (R$)</th>
                    <th className="p-4 border border-slate-200 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importedItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      {/* Código */}
                      <td className="p-2 border border-slate-200 font-mono text-xs font-bold text-slate-700">
                        <input 
                          type="text" 
                          value={item.codigo || ""} 
                          onChange={(e) => handleEditImportedRow(index, "codigo", e.target.value.toUpperCase())}
                          className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-[#00BFA5] rounded font-bold"
                          placeholder="CÓD"
                        />
                      </td>

                      {/* Descrição */}
                      <td className="p-2 border border-slate-200 text-sm font-semibold">
                        <input 
                          type="text" 
                          value={item.descricao || ""} 
                          onChange={(e) => handleEditImportedRow(index, "descricao", e.target.value)}
                          className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-[#00BFA5] rounded"
                        />
                      </td>

                      {/* Categoria */}
                      <td className="p-2 border border-slate-200 text-xs">
                        <select 
                          value={item.tipo} 
                          onChange={(e) => handleEditImportedRow(index, "tipo", e.target.value)}
                          className="w-full bg-transparent p-1 outline-none focus:bg-white font-bold text-slate-600 cursor-pointer"
                        >
                          <option value="Material">Material (Geral)</option>
                          <option value="Mão de Obra">Mão de Obra</option>
                          <option value="Equipamentos">Equipamentos</option>
                          {tipos.map(t => (
                            <option key={t.id} value={t.nome}>{t.nome}</option>
                          ))}
                        </select>
                      </td>

                      {/* Unidade */}
                      <td className="p-2 border border-slate-200 text-center font-bold text-slate-500">
                        <input 
                          type="text" 
                          value={item.unidade || "un"} 
                          onChange={(e) => handleEditImportedRow(index, "unidade", e.target.value)}
                          className="w-full bg-transparent p-1 outline-none text-center focus:bg-white focus:ring-1 focus:ring-[#00BFA5] rounded uppercase font-bold"
                        />
                      </td>

                      {/* Preço Base */}
                      <td className="p-2 border border-slate-200 text-right font-black text-slate-900">
                        <div className="relative flex items-center">
                          <span className="text-slate-400 text-xs mr-1">R$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={item.precoBaseUnitario !== null ? item.precoBaseUnitario : ""} 
                            onChange={(e) => handleEditImportedRow(index, "precoBaseUnitario", e.target.value)}
                            className="w-full bg-transparent p-1 text-right outline-none focus:bg-white focus:ring-1 focus:ring-[#00BFA5] rounded font-black text-slate-900"
                            placeholder="0.00"
                          />
                        </div>
                      </td>

                      {/* Remover Linha */}
                      <td className="p-2 border border-slate-200 text-center">
                        <button 
                          onClick={() => handleRemoveImportedRow(index)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4 justify-end">
              <button 
                onClick={() => { setIsPreviewModalOpen(false); setImportedItems([]); }}
                className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Descartar Carga
              </button>
              <button 
                onClick={handleSaveImportedItems}
                className="px-8 py-4 bg-[#00BFA5] hover:bg-[#00a892] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-[#00BFA5]/25"
              >
                Confirmar e Gravar no Banco ({importedItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
