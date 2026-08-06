import { useState, useEffect } from "react";
import { Plus, ListTree, Package, Wrench, HardHat, Loader, Trash, Edit, Check, X, Search, Camera, Copy, Printer, FileSpreadsheet, CheckSquare, Square } from "lucide-react";
import * as XLSX from "xlsx";

export default function EapTab({ orcamento, onUpdate }: { orcamento: any, onUpdate: () => void }) {
  const [novaEtapa, setNovaEtapa] = useState("");
  const [loadingEtapa, setLoadingEtapa] = useState(false);
  const [itemForms, setItemForms] = useState<Record<string, any>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  
  const [tipos, setTipos] = useState<any[]>([]);
  const [itensPadrao, setItensPadrao] = useState<any[]>([]);
  const [editingEtapa, setEditingEtapa] = useState<string | null>(null);
  const [editEtapaName, setEditEtapaName] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState<any>({});
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  // Seleção de etapas para gerar lista de materiais
  const [selectedEtapas, setSelectedEtapas] = useState<string[]>([]);

  // Estados para modal de conferência de materiais
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewObra, setPreviewObra] = useState("");
  const [previewLocal, setPreviewLocal] = useState("");
  const [previewObs, setPreviewObs] = useState("Favor fornecer preços unitários e prazos de entrega para os itens listados.");

  useEffect(() => {
    if (orcamento) {
      setPreviewObra(orcamento.nome || "");
      setPreviewLocal(orcamento.cliente || "");
    }
  }, [orcamento]);

  const handleItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean, etapaIdOrItemId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingItem(etapaIdOrItemId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          if (isEditMode) {
            setEditItemForm((prev: any) => ({ ...prev, imagemUrl: data.url }));
          } else {
            updateItemForm(etapaIdOrItemId, "imagemUrl", data.url);
          }
        }
      } else {
        alert("Erro no upload da foto");
      }
    } catch (err) {
      alert("Erro ao enviar arquivo");
    } finally {
      setUploadingItem(null);
    }
  };

  useEffect(() => {
    fetch("/api/orcamentos/tipos-material").then(res => res.json()).then(data => setTipos(Array.isArray(data) ? data : []));
    fetch("/api/orcamentos/itens-padrao").then(res => res.json()).then(data => setItensPadrao(Array.isArray(data) ? data : []));
  }, []);

  const handleCreateEtapa = async () => {
    if (!novaEtapa) return;
    setLoadingEtapa(true);
    try {
      const res = await fetch(`/api/orcamentos/${orcamento.id}/etapas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novaEtapa }),
      });
      if (res.ok) {
        setNovaEtapa("");
        onUpdate();
      }
    } finally {
      setLoadingEtapa(false);
    }
  };

  const handleEditEtapa = async (etapaId: string) => {
    if (!editEtapaName) return;
    try {
      const res = await fetch(`/api/orcamentos/etapas/${etapaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editEtapaName }),
      });
      if (res.ok) {
        setEditingEtapa(null);
        onUpdate();
      }
    } catch (e) {}
  };

  const handleDeleteEtapa = async (etapaId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Tem certeza que deseja excluir esta etapa e todos os seus itens?")) return;
    try {
      const res = await fetch(`/api/orcamentos/etapas/${etapaId}`, { method: "DELETE" });
      if (res.ok) {
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao excluir a etapa");
      }
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  const handleCreateItem = async (etapaId: string) => {
    const form = itemForms[etapaId];
    if (!form || !form.descricao || !form.tipo || !form.unidade || !form.quantidade) {
      alert("Preencha todos os campos obrigatórios do item");
      return;
    }

    setLoadingItems({ ...loadingItems, [etapaId]: true });
    try {
      const res = await fetch(`/api/orcamentos/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, etapaId }),
      });
      if (res.ok) {
        setItemForms({ ...itemForms, [etapaId]: null });
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao adicionar o item");
      }
    } catch (error) {
      alert("Erro de conexão");
    } finally {
      setLoadingItems({ ...loadingItems, [etapaId]: false });
    }
  };

  const updateItemForm = (etapaId: string, field: string, value: any) => {
    setItemForms({
      ...itemForms,
      [etapaId]: {
        ...(itemForms[etapaId] || { tipo: tipos[0]?.nome || "Material", unidade: "un" }),
        [field]: value
      }
    });
  };

  const handleSelectPadrao = (etapaId: string, padraoId: string) => {
    if (!padraoId) return;
    const item = itensPadrao.find(i => i.id === padraoId);
    if (!item) return;
    setItemForms({
      ...itemForms,
      [etapaId]: {
        ...(itemForms[etapaId] || {}),
        codigo: item.codigo || "",
        descricao: item.descricao,
        tipo: item.tipo,
        unidade: item.unidade,
        precoBaseUnitario: item.precoBaseUnitario || "",
        imagemUrl: item.imagemUrl || ""
      }
    });
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo.toLowerCase().includes("elétrica")) return <Wrench className="w-3 h-3" />;
    if (tipo.toLowerCase().includes("civil")) return <HardHat className="w-3 h-3" />;
    return <Package className="w-3 h-3" />;
  };

  const handleDeleteItem = async (itemId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Excluir este item?")) return;
    try {
      const res = await fetch(`/api/orcamentos/itens/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao excluir o item");
      }
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  const handleSaveItemEdit = async (itemId: string) => {
    if (!editItemForm.descricao || !editItemForm.tipo || !editItemForm.unidade || editItemForm.quantidade === undefined) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }
    try {
      const res = await fetch(`/api/orcamentos/itens/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: editItemForm.codigo || null,
          descricao: editItemForm.descricao,
          tipo: editItemForm.tipo,
          unidade: editItemForm.unidade,
          quantidade: parseFloat(String(editItemForm.quantidade).replace(",", ".")),
          precoBaseUnitario: (editItemForm.precoBaseUnitario !== undefined && editItemForm.precoBaseUnitario !== null && editItemForm.precoBaseUnitario !== "") 
            ? parseFloat(String(editItemForm.precoBaseUnitario).replace(",", ".")) 
            : null,
          imagemUrl: editItemForm.imagemUrl || null
        })
      });
      if (res.ok) {
        setEditingItem(null);
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao salvar as alterações do item");
      }
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  const handleToggleSelectEtapa = (etapaId: string) => {
    setSelectedEtapas(prev => 
      prev.includes(etapaId) ? prev.filter(id => id !== etapaId) : [...prev, etapaId]
    );
  };

  const handleSelectAll = () => {
    if (!orcamento.etapas) return;
    setSelectedEtapas(orcamento.etapas.map((e: any) => e.id));
  };

  const handleClearSelection = () => {
    setSelectedEtapas([]);
  };

  const handleExportExcel = () => {
    const itemsToExport: any[] = [];
    orcamento.etapas?.forEach((etapa: any) => {
      if (selectedEtapas.includes(etapa.id)) {
        etapa.itens?.forEach((item: any) => {
          itemsToExport.push({
            "Etapa": etapa.nome,
            "Código": item.codigo || "",
            "Descrição": item.descricao,
            "Tipo": item.tipo,
            "Unidade": item.unidade,
            "Quantidade": item.quantidade,
            "Preço Unitário Base (R$)": item.precoBaseUnitario || 0,
            "Total Base (R$)": (item.quantidade || 0) * (item.precoBaseUnitario || 0)
          });
        });
      }
    });

    if (itemsToExport.length === 0) {
      alert("Nenhum item encontrado nas etapas selecionadas.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(itemsToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Materiais");
    
    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 45 },
      { wch: 15 },
      { wch: 8 },
      { wch: 12 },
      { wch: 25 },
      { wch: 20 }
    ];

    XLSX.writeFile(workbook, `Lista_Materiais_${orcamento.nome.replace(/\s+/g, "_")}.xlsx`);
  };

  const handleCopyToClipboard = () => {
    let text = `📋 *LISTA DE MATERIAIS PARA ORÇAMENTO*\n`;
    text += `*Projeto:* ${orcamento.nome}\n`;
    text += `*Cliente:* ${orcamento.cliente || "Cordeiro Energia"}\n`;
    text += `*Data:* ${new Date().toLocaleDateString("pt-BR")}\n\n`;

    let itemIndex = 1;
    let hasItems = false;

    orcamento.etapas?.forEach((etapa: any) => {
      if (selectedEtapas.includes(etapa.id)) {
        const stageItens = etapa.itens || [];
        if (stageItens.length > 0) {
          text += `🔹 *${etapa.nome.toUpperCase()}*\n`;
          stageItens.forEach((item: any) => {
            text += `${itemIndex++}. ${item.descricao} | Qtd: ${item.quantidade} ${item.unidade}`;
            if (item.codigo) text += ` (Cód: ${item.codigo})`;
            text += `\n`;
          });
          text += `\n`;
          hasItems = true;
        }
      }
    });

    if (!hasItems) {
      alert("Nenhum item encontrado nas etapas selecionadas.");
      return;
    }

    navigator.clipboard.writeText(text);
    alert("Lista de materiais formatada copiada para a área de transferência!");
  };

  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const selectedEtapaObjs = orcamento.etapas?.filter((e: any) => selectedEtapas.includes(e.id)) || [];
    const logoUrl = typeof window !== "undefined" ? window.location.origin + "/Logo_Cordeiro_Energia.png" : "/Logo_Cordeiro_Energia.png";
    
    let rowsHtml = "";
    let itemIndex = 1;
    
    selectedEtapaObjs.forEach((etapa: any) => {
      etapa.itens?.forEach((item: any) => {
        rowsHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; page-break-inside: avoid;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; color: #475569; font-weight: 500;">${itemIndex++}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-family: monospace; color: #475569; text-align: center;">${item.codigo || "-"}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: 600; color: #0a192f;">${item.descricao}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; color: #475569;">${item.unidade}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 800; color: #f15a24;">${item.quantidade}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color: #0a192f; font-weight: 600; font-size: 11px;">${etapa.nome}</td>
          </tr>
        `;
      });
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Lista de Materiais - ${previewObra}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #334155; line-height: 1.5; background: #fff; }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #f15a24; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-img { height: 50px; object-fit: contain; }
            .title-area { text-align: right; }
            .doc-title { font-size: 18px; font-weight: 900; color: #0a192f; text-transform: uppercase; margin: 0; }
            .meta-grid { display: grid; grid-template-columns: auto auto; gap: 2px 12px; margin-top: 8px; font-size: 11px; text-align: right; justify-content: end; }
            .meta-label { color: #64748b; font-weight: 600; text-transform: uppercase; }
            .meta-val { color: #0a192f; font-weight: 700; }
            .instructions { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 25px; font-size: 11px; color: #475569; border-left: 4px solid #0a192f; }
            .instructions strong { color: #0a192f; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background-color: #0a192f; color: white; padding: 10px; border: 1px solid #cbd5e1; text-transform: uppercase; font-weight: 800; font-size: 10px; text-align: left; }
            td { border: 1px solid #cbd5e1; }
            .footer { margin-top: 50px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-weight: 500; line-height: 1.6; }
            .footer-brand { color: #f15a24; font-weight: 700; }
            @media print {
              body { padding: 10px; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <img src="${logoUrl}" class="logo-img" alt="Logo Cordeiro Energia" />
            <div class="title-area">
              <h1 class="doc-title">Lista de Materiais para Cotação</h1>
              <div class="meta-grid">
                <span class="meta-label">Obra/Projeto:</span>
                <span class="meta-val">${previewObra}</span>
                <span class="meta-label">Local:</span>
                <span class="meta-val">${previewLocal || "Não especificado"}</span>
                <span class="meta-label">Data de Emissão:</span>
                <span class="meta-val">${new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>
          
          ${previewObs ? `
          <div class="instructions">
            <strong>Observações:</strong> <br/>
            ${previewObs.replace(/\n/g, "<br/>")}
          </div>
          ` : ""}

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">Item</th>
                <th style="width: 100px; text-align: center;">Código</th>
                <th>Descrição do Material / Equipamento</th>
                <th style="width: 60px; text-align: center;">Unidade</th>
                <th style="width: 70px; text-align: right;">Quantidade</th>
                <th style="width: 160px; text-align: left;">Etapa de Utilização</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <div class="footer">
            <span class="footer-brand">Cordeiro Energia</span> • Soluções e Engenharia Energética • <a href="https://www.cordeiroenergia.com.br" style="color: #94a3b8; text-decoration: none;">www.cordeiroenergia.com.br</a> <br/>
            Curvelo - MG • CNPJ: 55.302.950/0001-62
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Custom helper to calculate total items from selected stages
  const getSelectedItemsCount = () => {
    let count = 0;
    orcamento.etapas?.forEach((e: any) => {
      if (selectedEtapas.includes(e.id)) {
        count += e.itens?.length || 0;
      }
    });
    return count;
  };

  // Cálculos Consolidados
  let totalProjeto = 0;
  const totaisPorTipo: Record<string, number> = {};

  orcamento.etapas?.forEach((etapa: any) => {
    etapa.itens?.forEach((item: any) => {
      const valorItem = (item.quantidade || 0) * (item.precoBaseUnitario || 0);
      totalProjeto += valorItem;
      totaisPorTipo[item.tipo] = (totaisPorTipo[item.tipo] || 0) + valorItem;
    });
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ListTree className="w-5 h-5 text-[#00BFA5]" /> EAP & Escopo Base
          </h2>
          <p className="text-sm text-slate-500 mt-1">Estruture a obra em etapas e defina o orçamento meta (Base).</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Nova Etapa (Ex: Aterramento)"
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00BFA5]"
            value={novaEtapa}
            onChange={e => setNovaEtapa(e.target.value)}
          />
          <button 
            onClick={handleCreateEtapa}
            disabled={loadingEtapa || !novaEtapa}
            className="bg-[#1E3A8A] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
          >
            {loadingEtapa ? <Loader className="w-4 h-4 animate-spin" /> : "Adicionar"}
          </button>
        </div>
      </div>

      {orcamento.etapas?.length > 0 && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs font-bold text-slate-500 hover:text-[#00BFA5] flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Selecionar Tudo
            </button>
            {selectedEtapas.length > 0 && (
              <button
                onClick={handleClearSelection}
                className="text-xs font-bold text-slate-500 hover:text-red-500 flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 transition-colors"
              >
                <Square className="w-3.5 h-3.5" /> Desmarcar Tudo
              </button>
            )}
          </div>
          {selectedEtapas.length > 0 && (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              {selectedEtapas.length} de {orcamento.etapas.length} etapas selecionadas
            </span>
          )}
        </div>
      )}

      <div className="space-y-6">
        {orcamento.etapas?.length === 0 ? (
          <div className="text-center p-10 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
            <ListTree className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma Etapa Criada</p>
            <p className="text-xs text-slate-400 mt-1">Comece adicionando a primeira etapa da obra no canto superior direito.</p>
          </div>
        ) : (
          orcamento.etapas?.map((etapa: any, index: number) => {
            const totalEtapa = etapa.itens?.reduce((acc: number, item: any) => acc + ((item.quantidade || 0) * (item.precoBaseUnitario || 0)), 0) || 0;
            return (
              <div key={etapa.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  {editingEtapa === etapa.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-4">
                      <input 
                        type="text" 
                        className="flex-1 px-3 py-1 border border-slate-200 rounded-lg text-lg font-black text-slate-800 outline-none focus:border-[#00BFA5]"
                        value={editEtapaName}
                        onChange={e => setEditEtapaName(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => handleEditEtapa(etapa.id)} className="p-2 bg-[#00BFA5] text-white rounded-lg hover:bg-[#00a892]"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingEtapa(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={selectedEtapas.includes(etapa.id)}
                        onChange={() => handleToggleSelectEtapa(etapa.id)}
                        className="w-4 h-4 text-[#00BFA5] border-slate-300 rounded focus:ring-[#00BFA5] cursor-pointer"
                        title="Selecionar esta etapa"
                      />
                      <h3 className="font-black text-slate-800 text-lg">{index + 1}. {etapa.nome}</h3>
                      <button onClick={() => { setEditingEtapa(etapa.id); setEditEtapaName(etapa.nome); }} className="text-slate-400 hover:text-[#00BFA5]"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteEtapa(etapa.id)} className="text-slate-400 hover:text-red-500"><Trash className="w-4 h-4" /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-[#00BFA5] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      Total: R$ {totalEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                      {etapa.itens?.length || 0} Itens
                    </span>
                  </div>
                </div>
              
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-3 w-12">Item</th>
                      <th className="px-4 py-3 w-16 text-center">Foto</th>
                      <th className="px-4 py-3 w-24">Código</th>
                      <th className="px-4 py-3">Descrição / Memorial</th>
                      <th className="px-4 py-3 w-36">Tipo</th>
                      <th className="px-4 py-3 w-16">Un</th>
                      <th className="px-4 py-3 w-20 text-right">Qtd</th>
                      <th className="px-4 py-3 w-32 text-right">Preço Base (R$)</th>
                      <th className="px-4 py-3 w-32 text-right">Total (R$)</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {etapa.itens?.map((item: any, i: number) => {
                      const isEditing = editingItem === item.id;
                      const total = (item.quantidade || 0) * (item.precoBaseUnitario || 0);

                      if (isEditing) {
                        return (
                          <tr key={item.id} className="bg-[#f8fafc]">
                            <td className="px-4 py-2 font-medium text-slate-400">{index + 1}.{i + 1}</td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex flex-col items-center justify-center gap-1">
                                {editItemForm.imagemUrl ? (
                                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm mx-auto group/editimg">
                                    <img src={editItemForm.imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                      type="button"
                                      onClick={() => setEditItemForm({ ...editItemForm, imagemUrl: "" })}
                                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/editimg:opacity-100 transition-opacity text-[8px] font-black uppercase"
                                      title="Remover foto"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                ) : (
                                  <label className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 hover:bg-slate-200 transition-all cursor-pointer mx-auto">
                                    {uploadingItem === item.id ? (
                                      <Loader className="w-4 h-4 animate-spin text-[#00BFA5]" />
                                    ) : (
                                      <Camera className="w-4 h-4 text-slate-400" />
                                    )}
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleItemPhotoUpload(e, true, item.id)} 
                                    />
                                  </label>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" 
                                value={editItemForm.codigo || ""} 
                                onChange={e => setEditItemForm({ ...editItemForm, codigo: e.target.value })} 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" 
                                value={editItemForm.descricao || ""} 
                                onChange={e => setEditItemForm({ ...editItemForm, descricao: e.target.value })} 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" 
                                value={editItemForm.tipo || "Material"} 
                                onChange={e => setEditItemForm({ ...editItemForm, tipo: e.target.value })}
                              >
                                <option value="Material">Material</option>
                                <option value="Equipamento">Equipamento</option>
                                <option value="Mão de Obra">Mão de Obra</option>
                                {tipos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" 
                                value={editItemForm.unidade || ""} 
                                onChange={e => setEditItemForm({ ...editItemForm, unidade: e.target.value })} 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5] text-right" 
                                value={editItemForm.quantidade || ""} 
                                onChange={e => setEditItemForm({ ...editItemForm, quantidade: e.target.value })} 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5] text-right" 
                                value={editItemForm.precoBaseUnitario || ""} 
                                onChange={e => setEditItemForm({ ...editItemForm, precoBaseUnitario: e.target.value })} 
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-black text-slate-300 text-xs">-</td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => handleSaveItemEdit(item.id)} 
                                  className="p-1 bg-[#00BFA5] text-white rounded-md hover:bg-[#009b86] transition-colors"
                                  title="Salvar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setEditingItem(null)} 
                                  className="p-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-400">{index + 1}.{i + 1}</td>
                          <td className="px-4 py-3 text-center">
                            {item.imagemUrl ? (
                              <div 
                                className="group/img relative w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm mx-auto cursor-pointer" 
                                onClick={() => window.open(item.imagemUrl, "_blank")}
                                title="Visualizar imagem"
                              >
                                <img src={item.imagemUrl} alt="Item" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto" title="Sem foto">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{item.codigo || "-"}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{item.descricao}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase whitespace-nowrap">
                              {getTipoIcon(item.tipo)} {item.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-medium">{item.unidade}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-800">{item.quantidade}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-600">
                            {item.precoBaseUnitario ? item.precoBaseUnitario.toFixed(2) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-[#1E3A8A]">
                            {total > 0 ? total.toFixed(2) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => {
                                  setEditingItem(item.id);
                                  setEditItemForm({
                                    codigo: item.codigo || "",
                                    descricao: item.descricao,
                                    tipo: item.tipo,
                                    unidade: item.unidade,
                                    quantidade: item.quantidade,
                                    precoBaseUnitario: item.precoBaseUnitario || "",
                                    imagemUrl: item.imagemUrl || ""
                                  });
                                }} 
                                className="text-slate-400 hover:text-[#00BFA5]"
                                title="Editar item"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteItem(item.id)} 
                                className="text-slate-400 hover:text-red-500"
                                title="Excluir item"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Linha de Subtotal da Etapa */}
                    <tr className="bg-slate-50/50 font-bold border-t border-slate-200 text-slate-700">
                      <td colSpan={7} className="px-4 py-3 text-right text-xs uppercase tracking-wider font-black">Total da Etapa:</td>
                      <td colSpan={2} className="px-4 py-3 text-right font-black text-[#1E3A8A] text-sm">
                        R$ {totalEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>

                    {/* Novo Item Row */}
                    <tr className="bg-[#f8fafc]/80">
                      <td className="px-4 py-3 font-medium text-[#00BFA5] text-xs uppercase tracking-wider whitespace-nowrap">Novo</td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {itemForms[etapa.id]?.imagemUrl ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm mx-auto group/newimg">
                              <img src={itemForms[etapa.id].imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={() => updateItemForm(etapa.id, "imagemUrl", "")}
                                className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/newimg:opacity-100 transition-opacity text-[8px] font-black uppercase"
                                title="Remover foto"
                              >
                                Remover
                              </button>
                            </div>
                          ) : (
                            <label className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 transition-all cursor-pointer mx-auto">
                              {uploadingItem === etapa.id ? (
                                <Loader className="w-4 h-4 animate-spin text-[#00BFA5]" />
                              ) : (
                                <Camera className="w-4 h-4 text-slate-400" />
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleItemPhotoUpload(e, false, etapa.id)} 
                              />
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input type="text" placeholder="Código" className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={itemForms[etapa.id]?.codigo || ""} onChange={e => updateItemForm(etapa.id, "codigo", e.target.value)} />
                      </td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        <select 
                          className="w-10 text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5] text-transparent bg-transparent absolute opacity-0 cursor-pointer"
                          onChange={e => handleSelectPadrao(etapa.id, e.target.value)}
                          title="Importar item padrão"
                        >
                          <option value="">Selecione...</option>
                          {itensPadrao.map(i => <option key={i.id} value={i.id}>{i.descricao}</option>)}
                        </select>
                        <Search className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                        <input type="text" placeholder="Descrição técnica..." className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={itemForms[etapa.id]?.descricao || ""} onChange={e => updateItemForm(etapa.id, "descricao", e.target.value)} />
                      </td>
                      <td className="px-4 py-2">
                        <select className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={itemForms[etapa.id]?.tipo || "Material"} onChange={e => updateItemForm(etapa.id, "tipo", e.target.value)}>
                          <option value="Material">Material</option>
                          <option value="Equipamento">Equipamento</option>
                          <option value="Mão de Obra">Mão de Obra</option>
                          {tipos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input type="text" placeholder="Un" className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5]" value={itemForms[etapa.id]?.unidade || "un"} onChange={e => updateItemForm(etapa.id, "unidade", e.target.value)} />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" placeholder="Qtd" className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5] text-right" value={itemForms[etapa.id]?.quantidade || ""} onChange={e => updateItemForm(etapa.id, "quantidade", e.target.value)} />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" placeholder="Preço" className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00BFA5] text-right" value={itemForms[etapa.id]?.precoBaseUnitario || ""} onChange={e => updateItemForm(etapa.id, "precoBaseUnitario", e.target.value)} />
                      </td>
                      <td className="px-4 py-2 text-right font-black text-slate-300 text-xs">-</td>
                      <td className="px-4 py-2 text-right">
                        <button 
                          onClick={() => handleCreateItem(etapa.id)}
                          disabled={loadingItems[etapa.id]}
                          className="p-2 bg-[#00BFA5] text-white rounded-lg hover:bg-[#009b86] transition-colors disabled:opacity-50"
                        >
                          {loadingItems[etapa.id] ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </div>
            );
          })
        )}
      </div>

      {/* Consolidado CAPEX Dashboard */}
      <div className="bg-[#1E3A8A] rounded-[2rem] p-8 text-white shadow-xl flex flex-col md:flex-row gap-8 items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-blue-300 uppercase tracking-widest">Consolidado CAPEX</h3>
          <p className="text-4xl font-black mt-1">
            R$ {totalProjeto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {Object.entries(totaisPorTipo).sort((a, b) => b[1] - a[1]).map(([tipo, valor]) => (
            <div key={tipo} className="bg-white/10 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-200 uppercase truncate">{tipo}</p>
              <p className="text-lg font-black mt-1">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Bar for Material List RFQ */}
      {selectedEtapas.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between gap-6 max-w-4xl w-[90%] animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedEtapas.length} {selectedEtapas.length === 1 ? "Etapa Selecionada" : "Etapas Selecionadas"}
            </span>
            <span className="text-sm font-black text-slate-800">
              {getSelectedItemsCount()} {getSelectedItemsCount() === 1 ? "item cadastrado" : "itens cadastrados"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Copiar para WhatsApp / Email"
            >
              <Copy className="w-3.5 h-3.5" /> WhatsApp
            </button>
            
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-[#00BFA5]/10 hover:bg-[#00BFA5]/20 text-[#00BFA5] font-black rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Baixar Planilha Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
            </button>

            <button
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
              title="Visualizar e Imprimir RFQ"
            >
              <Printer className="w-3.5 h-3.5" /> PDF / Imprimir
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button
              onClick={handleClearSelection}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Conferência de Materiais e Preview de Impressão */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl flex flex-col md:flex-row overflow-hidden border border-slate-100 max-h-[90vh]">
            
            {/* Sidebar de Configurações */}
            <div className="w-full md:w-80 bg-slate-50 p-6 border-r border-slate-200 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Apresentação da Lista</h3>
                  <p className="text-xs text-slate-500 mt-1">Personalize os dados que aparecerão no cabeçalho impresso.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome da Obra / Objeto</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={previewObra}
                      onChange={e => setPreviewObra(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Local da Obra</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={previewLocal}
                      onChange={e => setPreviewLocal(e.target.value)}
                      placeholder="Ex: Curvelo - MG"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Instruções / Observações</label>
                    <textarea 
                      rows={4}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                      value={previewObs}
                      onChange={e => setPreviewObs(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Confirmar e Imprimir
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Document Preview Panel */}
            <div className="flex-1 bg-slate-200/50 p-6 md:p-10 overflow-y-auto flex justify-center">
              {/* Branded Document A4 Mockup */}
              <div className="bg-white w-full max-w-[21cm] min-h-[29.7cm] p-12 shadow-lg border border-slate-200 rounded-lg flex flex-col justify-between text-slate-700 relative text-[11px] leading-relaxed">
                
                <div>
                  {/* Clean Branded Header */}
                  <div className="flex justify-between items-center border-b-4 border-[#f15a24] pb-6 mb-8">
                    <img 
                      src="/Logo_Cordeiro_Energia.png" 
                      alt="Cordeiro Energia" 
                      className="h-12 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const label = document.getElementById("logo-text-fallback");
                        if (label) label.style.display = "block";
                      }}
                    />
                    <div id="logo-text-fallback" className="hidden font-black text-xl text-[#0a192f] tracking-tighter">
                      CORDEIRO <span className="text-[#f15a24]">ENERGIA</span>
                    </div>

                    <div className="text-right">
                      <h2 className="text-sm font-black text-[#0a192f] uppercase tracking-wider">Lista de Materiais para Cotação</h2>
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 text-[10px] justify-end text-right mt-2 font-semibold">
                        <span className="text-slate-400 uppercase text-[8px] self-center">Obra:</span>
                        <span className="text-slate-800 font-bold">{previewObra || "Não preenchido"}</span>
                        <span className="text-slate-400 uppercase text-[8px] self-center">Local:</span>
                        <span className="text-slate-800 font-bold">{previewLocal || "Não especificado"}</span>
                        <span className="text-slate-400 uppercase text-[8px] self-center">Data:</span>
                        <span className="text-slate-800 font-bold">{new Date().toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Observations Block */}
                  {previewObs && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 border-l-4 border-[#0a192f] text-slate-600">
                      <p className="font-bold text-[#0a192f] uppercase text-[9px] tracking-wider mb-1">Observações / Instruções:</p>
                      <p className="whitespace-pre-line text-[10px] leading-relaxed">{previewObs}</p>
                    </div>
                  )}

                  {/* Materials Table */}
                  <table className="w-full border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-[#0a192f] text-white text-[9px] uppercase tracking-wider">
                        <th className="p-3 border border-slate-200 text-center w-12 font-bold">Item</th>
                        <th className="p-3 border border-slate-200 text-center w-24 font-bold">Código</th>
                        <th className="p-3 border border-slate-200 text-left font-bold">Descrição do Material</th>
                        <th className="p-3 border border-slate-200 text-center w-16 font-bold">Un</th>
                        <th className="p-3 border border-slate-200 text-right w-20 font-bold">Qtd</th>
                        <th className="p-3 border border-slate-200 text-left w-36 font-bold">Etapa de Utilização</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const selectedEtapaObjs = orcamento.etapas?.filter((e: any) => selectedEtapas.includes(e.id)) || [];
                        let globalIndex = 0;
                        return selectedEtapaObjs.flatMap((etapa: any, etapaIdx: number) => {
                          const currentOffset = globalIndex;
                          globalIndex += etapa.itens?.length || 0;
                          return etapa.itens?.map((item: any, itemIdx: number) => (
                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-[10px]">
                              <td className="p-2 border border-slate-200 text-center font-bold text-slate-400">{currentOffset + itemIdx + 1}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{item.codigo || "-"}</td>
                              <td className="p-2 border border-slate-200 text-slate-800 font-semibold">{item.descricao}</td>
                              <td className="p-2 border border-slate-200 text-center text-slate-600">{item.unidade}</td>
                              <td className="p-2 border border-slate-200 text-right font-bold text-[#f15a24]">{item.quantidade}</td>
                              <td className="p-2 border border-slate-200 text-slate-800 font-bold uppercase text-[9px]">{etapa.nome}</td>
                            </tr>
                          ));
                        });
                      })()}
                      {getSelectedItemsCount() === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                            Nenhum item selecionado. Marque etapas do projeto na aba EAP para exibir os materiais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Clean Branded Footer */}
                <div className="border-t border-slate-200 pt-6 mt-12 text-center text-[9px] text-slate-400 font-medium">
                  <span className="text-[#f15a24] font-black">Cordeiro Energia</span> • Soluções e Engenharia Energética • <a href="https://www.cordeiroenergia.com.br" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600 transition-colors">www.cordeiroenergia.com.br</a> <br/>
                  Curvelo - MG • CNPJ: 55.302.950/0001-62
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
