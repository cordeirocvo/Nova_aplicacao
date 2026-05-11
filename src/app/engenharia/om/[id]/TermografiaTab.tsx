"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Camera, 
  Thermometer, 
  Wind, 
  Sun,
  Image as ImageIcon,
  AlertTriangle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function TermografiaTab({ usinaId, usina, onRefresh }: { usinaId: string, usina: any, onRefresh: () => void }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  
  const [report, setReport] = useState<any>({
    id: "",
    dataInspecao: format(new Date(), "yyyy-MM-dd"),
    profissionalId: "",
    equipamentoCamera: "",
    temperaturaAmbiente: "30",
    irradiacao: "800",
    velocidadeVento: "2",
    umidadeRelativa: "50",
    emissividade: "0.95",
    distanciaRef: "1.0",
    itens: []
  });

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/engenharia/om/termografia?usinaId=${usinaId}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfissionais = async () => {
    try {
      const res = await fetch("/api/engenharia/om/profissionais");
      const data = await res.json();
      setProfissionais(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchProfissionais();
  }, [usinaId]);

  const filteredReports = reports.filter(r => {
    if (!dateFilter) return true;
    return r.dataInspecao.startsWith(dateFilter);
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReports.length && filteredReports.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReports.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculateSeverity = (deltaT: number) => {
    if (deltaT < 10) return "Normal";
    if (deltaT < 35) return "Observação";
    return "Crítica";
  };

  const handleAddItem = () => {
    const newItem = {
      tipoEquipamento: "Módulo",
      tag: "",
      localizacao: "",
      temperaturaMedida: "",
      temperaturaReferencia: "",
      deltaT: 0,
      severidade: "Normal",
      causaProvavel: "",
      recomendacao: "",
      imagemTermicaUrl: "",
      imagemVisualUrl: ""
    };
    setReport({ ...report, itens: [...report.itens, newItem] });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItens = [...report.itens];
    const updatedItem = { ...newItens[index], [field]: value };

    if (field === "temperaturaMedida" || field === "temperaturaReferencia") {
      const tMed = parseFloat(updatedItem.temperaturaMedida) || 0;
      const tRef = parseFloat(updatedItem.temperaturaReferencia) || 0;
      const delta = Math.abs(tMed - tRef);
      updatedItem.deltaT = delta;
      updatedItem.severidade = calculateSeverity(delta);
    }

    newItens[index] = updatedItem;
    setReport({ ...report, itens: newItens });
  };

  const removeItem = (index: number) => {
    const newItens = report.itens.filter((_: any, i: number) => i !== index);
    setReport({ ...report, itens: newItens });
  };

  const handleFileUpload = (index: number, field: 'imagemTermicaUrl' | 'imagemVisualUrl', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL("image/jpeg", 0.7);
          updateItem(index, field, base64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (saving) return;
    if (report.itens.length === 0) {
      alert("Adicione pelo menos um ponto de medição.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...report, usinaId };
      const res = await fetch("/api/engenharia/om/termografia", {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchReports();
        resetForm();
      } else {
        const text = await res.text();
        alert("Erro ao salvar: " + text);
      }
    } catch (err: any) {
      alert("Erro de conexão ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setReport({
      id: "",
      dataInspecao: format(new Date(), "yyyy-MM-dd"),
      profissionalId: "",
      equipamentoCamera: "",
      temperaturaAmbiente: "30",
      irradiacao: "800",
      velocidadeVento: "2",
      umidadeRelativa: "50",
      emissividade: "0.95",
      distanciaRef: "1.0",
      itens: []
    });
    setEditMode(false);
  };

  const openEdit = (r: any) => {
    setReport({
      ...r,
      profissionalId: r.profissionalId || "",
      dataInspecao: r.dataInspecao ? format(new Date(r.dataInspecao), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      temperaturaAmbiente: r.temperaturaAmbiente?.toString() || "",
      irradiacao: r.irradiacao?.toString() || "",
      velocidadeVento: r.velocidadeVento?.toString() || "",
      umidadeRelativa: r.umidadeRelativa?.toString() || "",
      emissividade: r.emissividade?.toString() || "0.95",
      distanciaRef: r.distanciaRef?.toString() || "1.0",
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este laudo termográfico?")) return;
    try {
      await fetch(`/api/engenharia/om/termografia?id=${id}`, { method: "DELETE" });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            Inspeção Termográfica (Infravermelho)
            <span className="bg-[#EB5E28]/10 text-[#EB5E28] text-xs px-2 py-1 rounded-full">{reports.length}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Análise de pontos quentes em módulos, painéis e transformadores.</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Data</label>
            <input 
              type="date" 
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#EB5E28] transition-all"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter("")}
                className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase"
              >
                Limpar
              </button>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div 
              onClick={toggleSelectAll}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                selectedIds.length === filteredReports.length && filteredReports.length > 0
                ? 'bg-[#EB5E28] border-[#EB5E28]' 
                : 'border-slate-200 group-hover:border-[#EB5E28]'
              }`}
            >
              {selectedIds.length === filteredReports.length && filteredReports.length > 0 && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Selecionar {dateFilter ? 'Filtrados' : 'Todos'}</span>
          </label>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
              <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">
                {selectedIds.length} selecionados
              </span>
              <Link
                href={`/engenharia/om/${usinaId}/termografia/consolidado?ids=${selectedIds.join(',')}`}
                target="_blank"
                className="bg-slate-800 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-slate-200"
              >
                <FileText className="w-4 h-4" /> Gerar Relatório Consolidado
              </Link>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Link 
            href={`/engenharia/om/${usinaId}/checklist`}
            target="_blank"
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-black flex items-center gap-2 transition-all text-sm uppercase tracking-tight border border-slate-200"
          >
            <FileText className="w-4 h-4" /> Checklist de Campo
          </Link>
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-[#EB5E28] hover:bg-[#d44d1a] text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-100 transition-all text-sm uppercase tracking-tight"
          >
            <Plus className="w-4 h-4" /> Nova Inspeção
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((r) => (
          <div 
            key={r.id} 
            onClick={() => toggleSelect(r.id)}
            className={`bg-white border-2 rounded-[2.5rem] p-8 transition-all group relative overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl ${
              selectedIds.includes(r.id) ? 'border-[#EB5E28]' : 'border-slate-100'
            }`}
          >
            <div className={`absolute top-6 left-6 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-20 ${
              selectedIds.includes(r.id) ? 'bg-[#EB5E28] border-[#EB5E28]' : 'bg-white border-slate-200 opacity-0 group-hover:opacity-100'
            }`}>
              {selectedIds.includes(r.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10 ml-8">
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <Thermometer className="w-3 h-3 text-[#EB5E28]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{r.itens?.length || 0} Pontos Analisados</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="mb-4 relative z-10">
              <h3 className="font-black text-slate-800 text-lg uppercase leading-tight">Laudo de Termografia</h3>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-1">
                {r.dataInspecao ? format(new Date(r.dataInspecao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Data não informada"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6 relative z-10">
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Severidade</p>
                <div className="flex items-center gap-1 mt-1">
                  {r.itens?.some((i: any) => i.severidade === "Crítica") ? (
                    <span className="text-red-600 font-black text-[10px] uppercase">🚨 Crítica</span>
                  ) : r.itens?.some((i: any) => i.severidade === "Observação") ? (
                    <span className="text-orange-600 font-black text-[10px] uppercase">⚠️ Observação</span>
                  ) : (
                    <span className="text-emerald-600 font-black text-[10px] uppercase">✅ Normal</span>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ações</p>
                <div className="flex items-center gap-2 mt-1">
                  <Link 
                    href={`/engenharia/om/${usinaId}/termografia/${r.id}/relatorio`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#EB5E28] hover:scale-105 transition-all text-xs font-black flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </Link>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 -bottom-4 text-slate-50 opacity-10 group-hover:opacity-20 transition-all group-hover:scale-110 pointer-events-none">
              <Camera className="w-24 h-24" />
            </div>
          </div>
        ))}

        {reports.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
            <Camera className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nenhum laudo termográfico disponível.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center shrink-0 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#EB5E28] rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-orange-100">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-[900] text-slate-800 tracking-tighter uppercase">
                    {editMode ? "Editar Laudo" : "Novo Laudo Termográfico"}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">NBR 15572 • NBR 15763 • NBR 15866</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-600 transition-all p-2">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-10 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Inspetor Técnico</label>
                  <select 
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-[#EB5E28] transition-all"
                    value={report.profissionalId}
                    onChange={e => setReport({...report, profissionalId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {profissionais.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Data da Inspeção</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none"
                    value={report.dataInspecao}
                    onChange={e => setReport({...report, dataInspecao: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Modelo da Câmera</label>
                  <input 
                    type="text" 
                    placeholder="Ex: FLIR E8-XT"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none"
                    value={report.equipamentoCamera}
                    onChange={e => setReport({...report, equipamentoCamera: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Emissiv.</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none"
                      value={report.emissividade}
                      onChange={e => setReport({...report, emissividade: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Dist.(m)</label>
                    <input 
                      type="number" step="0.1"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none"
                      value={report.distanciaRef}
                      onChange={e => setReport({...report, distanciaRef: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 ml-2 flex items-center gap-2">
                  <Wind className="w-3 h-3" /> Condições Ambientais no Momento
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500"><Thermometer className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">T. Amb (°C)</p>
                      <input className="w-full font-black text-slate-700 text-sm outline-none bg-transparent" type="number" value={report.temperaturaAmbiente} onChange={e => setReport({...report, temperaturaAmbiente: e.target.value})} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><Sun className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Irrad. (W/m²)</p>
                      <input className="w-full font-black text-slate-700 text-sm outline-none bg-transparent" type="number" value={report.irradiacao} onChange={e => setReport({...report, irradiacao: e.target.value})} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500"><Wind className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Vento (m/s)</p>
                      <input className="w-full font-black text-slate-700 text-sm outline-none bg-transparent" type="number" value={report.velocidadeVento} onChange={e => setReport({...report, velocidadeVento: e.target.value})} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500"><Info className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Umid. (%)</p>
                      <input className="w-full font-black text-slate-700 text-sm outline-none bg-transparent" type="number" value={report.umidadeRelativa} onChange={e => setReport({...report, umidadeRelativa: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Pontos de Medição</h3>
                    <p className="text-xs text-slate-400 font-bold">Identifique anomalias e capture as temperaturas medidas.</p>
                  </div>
                  <button 
                    onClick={handleAddItem}
                    className="bg-slate-800 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Ponto
                  </button>
                </div>

                <div className="space-y-4">
                  {report.itens.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 relative group">
                      <div className="absolute top-6 right-6 flex gap-2">
                        <select 
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border-none outline-none cursor-pointer ${
                            item.severidade === 'Crítica' ? 'bg-red-100 text-red-600' : 
                            item.severidade === 'Observação' ? 'bg-orange-100 text-orange-600' : 
                            'bg-emerald-100 text-emerald-600'
                          }`}
                          value={item.severidade}
                          onChange={e => updateItem(idx, 'severidade', e.target.value)}
                        >
                          <option value="Normal">Normal</option>
                          <option value="Observação">Observação</option>
                          <option value="Crítica">Crítica</option>
                        </select>
                        <button onClick={() => removeItem(idx)} className="w-10 h-10 bg-white text-red-300 hover:text-red-500 rounded-xl flex items-center justify-center border border-slate-100 transition-all shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-4">
                        <div className="md:col-span-4 space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Equipamento</label>
                              <select 
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-slate-700 text-xs outline-none"
                                value={item.tipoEquipamento}
                                onChange={e => updateItem(idx, 'tipoEquipamento', e.target.value)}
                              >
                                <option value="Módulo">Módulo PV</option>
                                <option value="Painel">Painel Elétrico</option>
                                <option value="Transformador">Transformador</option>
                                <option value="Conexão">Conexão/Borne</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">TAG / ID</label>
                              <select 
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-black text-slate-700 text-xs outline-none"
                                value={item.tag}
                                onChange={e => updateItem(idx, 'tag', e.target.value)}
                              >
                                <option value="">Selecione...</option>
                                {usina?.equipamentos?.map((eq: any) => (
                                  <option key={eq.id} value={eq.tag}>{eq.tag} - {eq.nome}</option>
                                ))}
                                <option value="OUTRO">OUTRO / NOVO</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-2xl border border-slate-50">
                              <p className="text-[7px] font-black text-slate-400 uppercase">T. Medida</p>
                              <input className="w-full font-black text-[#EB5E28] text-base bg-transparent outline-none mt-1" type="number" placeholder="0" value={item.temperaturaMedida} onChange={e => updateItem(idx, 'temperaturaMedida', e.target.value)} />
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-slate-50">
                              <p className="text-[7px] font-black text-slate-400 uppercase">T. Ref</p>
                              <input className="w-full font-black text-slate-500 text-base bg-transparent outline-none mt-1" type="number" placeholder="0" value={item.temperaturaReferencia} onChange={e => updateItem(idx, 'temperaturaReferencia', e.target.value)} />
                            </div>
                            <div className="bg-slate-800 p-3 rounded-2xl shadow-lg">
                              <p className="text-[7px] font-black text-slate-300 uppercase">Delta T</p>
                              <p className="font-black text-white text-base mt-1">Δ {item.deltaT.toFixed(1)}°</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Causa Provável</label>
                              <textarea 
                                placeholder="Ex: Mau contato na conexão..."
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-slate-700 text-[10px] outline-none min-h-[60px]"
                                value={item.causaProvavel}
                                onChange={e => updateItem(idx, 'causaProvavel', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Recomendação</label>
                              <textarea 
                                placeholder="Ex: Reapertar bornes..."
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-slate-700 text-[10px] outline-none min-h-[60px]"
                                value={item.recomendacao}
                                onChange={e => updateItem(idx, 'recomendacao', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-8 grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Imagem Térmica</label>
                            <label className="aspect-video bg-slate-200/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group/img relative overflow-hidden cursor-pointer hover:bg-slate-200 transition-all">
                              {item.imagemTermicaUrl ? (
                                <img src={item.imagemTermicaUrl} className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                  <span className="text-[8px] font-black text-slate-400 uppercase">Clique para selecionar</span>
                                </>
                              )}
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={e => e.target.files?.[0] && handleFileUpload(idx, 'imagemTermicaUrl', e.target.files[0])} 
                              />
                            </label>
                          </div>
                          <div className="space-y-3">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Imagem Visual</label>
                            <label className="aspect-video bg-slate-200/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group/img relative overflow-hidden cursor-pointer hover:bg-slate-200 transition-all">
                              {item.imagemVisualUrl ? (
                                <img src={item.imagemVisualUrl} className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                  <span className="text-[8px] font-black text-slate-400 uppercase">Clique para selecionar</span>
                                </>
                              )}
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={e => e.target.files?.[0] && handleFileUpload(idx, 'imagemVisualUrl', e.target.files[0])} 
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {report.itens.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                      <Thermometer className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                      <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Nenhum ponto de medição adicionado.</p>
                      <button onClick={handleAddItem} className="mt-4 text-[#EB5E28] font-black text-[10px] uppercase hover:underline">Adicionar Primeiro Ponto</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-4 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="order-2 md:order-1 flex-1 py-5 text-slate-400 font-black rounded-[1.5rem] hover:bg-white hover:text-slate-600 transition-all text-[10px] uppercase tracking-widest"
              >
                DESCARTAR
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="order-1 md:order-2 flex-[2] py-5 bg-[#EB5E28] text-white font-black rounded-[1.5rem] shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] uppercase tracking-[0.2em]"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> {editMode ? "ATUALIZAR LAUDO" : "SALVAR E GERAR LAUDO"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
