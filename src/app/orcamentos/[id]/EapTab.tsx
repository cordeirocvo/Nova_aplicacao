import { useState, useEffect } from "react";
import { Plus, ListTree, Package, Wrench, HardHat, Loader, Trash, Edit, Check, X, Search, Camera } from "lucide-react";

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

      <div className="space-y-6">
        {orcamento.etapas?.length === 0 ? (
          <div className="text-center p-10 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
            <ListTree className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma Etapa Criada</p>
            <p className="text-xs text-slate-400 mt-1">Comece adicionando a primeira etapa da obra no canto superior direito.</p>
          </div>
        ) : (
          orcamento.etapas?.map((etapa: any, index: number) => (
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
                    <h3 className="font-black text-slate-800 text-lg">{index + 1}. {etapa.nome}</h3>
                    <button onClick={() => { setEditingEtapa(etapa.id); setEditEtapaName(etapa.nome); }} className="text-slate-400 hover:text-[#00BFA5]"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteEtapa(etapa.id)} className="text-slate-400 hover:text-red-500"><Trash className="w-4 h-4" /></button>
                  </div>
                )}
                <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shrink-0">
                  {etapa.itens?.length || 0} Itens
                </span>
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
          ))
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
    </div>
  );
}
