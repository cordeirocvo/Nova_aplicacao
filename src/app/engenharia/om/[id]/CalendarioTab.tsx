"use client";

import { useState, useRef } from "react";
import { Plus, Calendar as CalendarIcon, CheckCircle, Clock, AlertTriangle, PenTool, Upload, FileText, X, ChevronLeft, ChevronRight, List } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import ImageAnnotator from "./ImageAnnotator";

export default function CalendarioTab({ usinaId, usina, onRefresh }: { usinaId: string, usina: any, onRefresh: () => void }) {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showModal, setShowModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<any>(null);
  const [actionMenuManutencao, setActionMenuManutencao] = useState<any>(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  
  const [newManutencao, setNewManutencao] = useState({
    usinaId, equipamentoId: "", tipo: "Preventiva", dataAgendada: "", descricao: "", responsavel: ""
  });
  
  const [reportData, setReportData] = useState({
    descricao: "", 
    pecasTrocadas: "",
    custoMateriais: "",
    custoMaoDeObra: "",
    tempoInicio: "",
    tempoFim: "",
    fotosDetalhes: [] as {urlBase64: string, observacao: string}[]
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [annotatorFile, setAnnotatorFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newManutencao.dataAgendada || !newManutencao.tipo) return;
    try {
      const isEditing = (newManutencao as any).id;
      const url = "/api/engenharia/om/manutencoes";
      const method = isEditing ? "PATCH" : "POST";
      
      await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newManutencao),
      });
      
      setShowModal(false);
      setNewManutencao({ usinaId, equipamentoId: "", tipo: "Preventiva", dataAgendada: "", descricao: "", responsavel: "" });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async () => {
    if (!showCompleteModal) return;
    try {
      const res = await fetch("/api/engenharia/om/manutencoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showCompleteModal.id,
          status: "Concluida",
          descricao: reportData.descricao || showCompleteModal.descricao,
          pecasTrocadas: reportData.pecasTrocadas,
          custoMateriais: reportData.custoMateriais || "0",
          custoMaoDeObra: reportData.custoMaoDeObra || "0",
          tempoInicio: reportData.tempoInicio,
          tempoFim: reportData.tempoFim,
          fotosDetalhes: reportData.fotosDetalhes
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert("Erro ao salvar: " + errData.error);
        return;
      }

      setShowCompleteModal(null);
      setReportData({ 
        descricao: "", 
        pecasTrocadas: "", 
        custoMateriais: "", 
        custoMaoDeObra: "", 
        tempoInicio: "", 
        tempoFim: "", 
        fotosDetalhes: [] 
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const openCompleteModal = (m: any) => {
    setReportData({
      descricao: m.descricao || "",
      pecasTrocadas: m.pecasTrocadas || "",
      custoMateriais: m.custoMateriais?.toString() || "",
      custoMaoDeObra: m.custoMaoDeObra?.toString() || "",
      tempoInicio: m.tempoInicio ? new Date(m.tempoInicio).toISOString().slice(0, 16) : "",
      tempoFim: m.tempoFim ? new Date(m.tempoFim).toISOString().slice(0, 16) : "",
      fotosDetalhes: m.fotosDetalhes || []
    });
    setShowCompleteModal(m);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnnotatorFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusBadge = (m: any) => {
    if (m.status === "Concluida") {
      return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3" /> Concluída</span>;
    }
    const agendada = new Date(m.dataAgendada);
    if (isPast(agendada) && !isToday(agendada)) {
      return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> Atrasada</span>;
    }
    return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Pendente</span>;
  };

  const computeStatusColor = (m: any) => {
    if (m.status === "Concluida") return "bg-slate-200 border-slate-300 text-slate-600 line-through";
    
    const dataAgendada = new Date(m.dataAgendada);
    const createdAt = new Date(m.createdAt || m.dataAgendada); // Fallback to dataAgendada if createdAt is missing
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Start of day for comparison
    
    const agendadaStart = new Date(dataAgendada);
    agendadaStart.setHours(0, 0, 0, 0);
    
    if (agendadaStart < hoje) {
      return "bg-red-500 text-white border-red-600 shadow-sm"; // Atrasada (Vermelho)
    }
    
    const timeTotal = agendadaStart.getTime() - createdAt.getTime();
    const timeRemaining = agendadaStart.getTime() - hoje.getTime();
    
    if (timeTotal <= 0) return "bg-amber-400 text-amber-900 border-amber-500 shadow-sm"; // Amarelo
    
    const percentage = timeRemaining / timeTotal;
    
    if (percentage <= 0.3) {
      return "bg-[#F25C27] text-white border-[#d44815] shadow-sm"; // Laranja/Amarelo Cordeiro
    }
    
    return "bg-emerald-500 text-white border-emerald-600 shadow-sm"; // Verde
  };

  const firstDay = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
  const lastDay = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0-6
  const emptyDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);
  const daysInMonth = Array.from({ length: lastDay.getDate() }).map((_, i) => i + 1);

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openEditAgenda = (m: any) => {
    setNewManutencao({
      id: m.id,
      usinaId: m.usinaId,
      equipamentoId: m.equipamentoId || "",
      tipo: m.tipo,
      dataAgendada: new Date(m.dataAgendada).toISOString().split('T')[0],
      descricao: m.descricao || "",
      responsavel: m.responsavel || ""
    } as any);
    setShowModal(true);
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Agenda de Manutenções 
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarIcon className="w-4 h-4" /> Calendário
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-4 h-4" /> Lista
            </button>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#F25C27] hover:bg-[#d44815] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm"
        >
          <CalendarIcon className="w-4 h-4" /> Agendar Intervenção
        </button>
      </div>

      {viewMode === "calendar" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h3 className="font-bold text-slate-700 capitalize text-lg">{format(currentMonthDate, "MMMM yyyy", { locale: ptBR })}</h3>
          <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        
        <div className="flex gap-4 p-3 border-b border-slate-100 bg-white justify-center text-xs font-bold text-slate-500 uppercase">
           <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> &gt; 30% Limite</span>
           <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#F25C27]"></div> &le; 30% Limite</span>
           <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Atrasada</span>
        </div>

        <div className="grid grid-cols-7 text-center border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50">
          <div className="py-2">Dom</div><div className="py-2">Seg</div><div className="py-2">Ter</div><div className="py-2">Qua</div><div className="py-2">Qui</div><div className="py-2">Sex</div><div className="py-2">Sáb</div>
        </div>
        <div className="grid grid-cols-7 text-sm min-h-[400px]">
          {emptyDays.map(d => (
            <div key={`empty-${d}`} className="border-r border-b border-slate-100 bg-slate-50/50 p-2 min-h-[100px]"></div>
          ))}
          {daysInMonth.map(day => {
            const dayDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day);
            const dayStr = dayDate.toISOString().split('T')[0];
            const dayManutencoes = usina.manutencoes?.filter((m: any) => new Date(m.dataAgendada).toISOString().split('T')[0] === dayStr);
            const isCurrentDay = isToday(dayDate);

            return (
              <div key={day} className={`border-r border-b border-slate-100 p-2 min-h-[120px] flex flex-col gap-1 hover:bg-slate-50 transition-colors ${isCurrentDay ? 'bg-blue-50/30' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-bold inline-block text-center rounded-full w-6 h-6 leading-6 ${isCurrentDay ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{day}</span>
                </div>
                {dayManutencoes?.map((m: any) => (
                  <div 
                    key={m.id} 
                    onClick={(e) => { e.stopPropagation(); setActionMenuManutencao(m); }}
                    className={`text-xs p-1.5 rounded border cursor-pointer font-medium ${computeStatusColor(m)} hover:opacity-80 transition-opacity`}
                    title={`${m.tipo} - ${m.equipamento?.tag || 'Geral'}`}
                  >
                    <div className="truncate">{m.tipo}</div>
                    <div className="truncate opacity-90 text-[10px]">{m.equipamento?.tag || "Geral"}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-4">
          {usina.manutencoes?.length === 0 && (
            <div className="text-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-medium">
              Nenhuma manutenção agendada.
            </div>
          )}

          {usina.manutencoes?.map((m: any) => (
            <div 
              key={m.id} 
              className={`bg-white border ${selectedIds.includes(m.id) ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-200'} rounded-2xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer group/item hover:border-blue-200`}
              onClick={() => openEditAgenda(m)}
            >
              <div 
                className="pt-2 cursor-pointer" 
                onClick={(e) => toggleSelection(m.id, e)}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(m.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-slate-50'}`}>
                  {selectedIds.includes(m.id) && <CheckCircle className="w-4 h-4" />}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center min-w-[80px] border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">{format(new Date(m.dataAgendada), "MMM", { locale: ptBR })}</p>
                <p className="text-2xl font-black text-slate-700">{format(new Date(m.dataAgendada), "dd")}</p>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 group-hover/item:text-blue-600 transition-colors">
                      {m.tipo} 
                      <span className="text-xs font-medium text-slate-400">({m.equipamento?.tag || "Geral"})</span>
                    </h3>
                    <p className="text-slate-500 text-sm">{m.descricao || "Sem descrição"}</p>
                  </div>
                  {getStatusBadge(m)}
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 pt-2 border-t border-slate-100">
                  <span>Responsável: {m.responsavel || "Não atribuído"}</span>
                  {m.equipamento && <span>Equipamento: {m.equipamento.nome}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[140px]" onClick={e => e.stopPropagation()}>
                {m.status !== "Concluida" ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openCompleteModal(m);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <PenTool className="w-4 h-4" /> Reportar
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openCompleteModal(m);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200"
                    >
                      <PenTool className="w-4 h-4" /> Editar Relatório
                    </button>
                    <Link 
                      href={`/engenharia/om/${usinaId}/relatorio/${m.id}`}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileText className="w-4 h-4" /> Gerar PDF
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Ações do Calendário */}
      {actionMenuManutencao && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setActionMenuManutencao(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-slate-800">Ações da Atividade</h2>
                <p className="text-sm text-slate-500 font-medium">{actionMenuManutencao.tipo} - {format(new Date(actionMenuManutencao.dataAgendada), "dd/MM/yyyy")}</p>
              </div>
              <button onClick={() => setActionMenuManutencao(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <button 
                onClick={() => { openEditAgenda(actionMenuManutencao); setActionMenuManutencao(null); }}
                className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-3 transition-colors"
              >
                <CalendarIcon className="w-5 h-5 text-blue-500" /> Editar Agendamento
              </button>
              
              {actionMenuManutencao.status !== "Concluida" ? (
                <button 
                  onClick={() => { openCompleteModal(actionMenuManutencao); setActionMenuManutencao(null); }}
                  className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center gap-3 transition-colors"
                >
                  <PenTool className="w-5 h-5" /> Reportar Intervenção (Concluir)
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => { openCompleteModal(actionMenuManutencao); setActionMenuManutencao(null); }}
                    className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-3 transition-colors"
                  >
                    <PenTool className="w-5 h-5 text-slate-500" /> Editar Relatório de Conclusão
                  </button>
                  <Link 
                    href={`/engenharia/om/${usinaId}/relatorio/${actionMenuManutencao.id}`}
                    className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-5 h-5" /> Gerar Laudo PDF
                  </Link>
                  <button 
                    onClick={() => { toggleSelection(actionMenuManutencao.id); setActionMenuManutencao(null); }}
                    className={`w-full text-left px-4 py-3 ${selectedIds.includes(actionMenuManutencao.id) ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'} font-bold rounded-xl flex items-center gap-3 transition-colors`}
                  >
                    {selectedIds.includes(actionMenuManutencao.id) ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
                    {selectedIds.includes(actionMenuManutencao.id) ? "Remover do Relatório Geral" : "Selecionar para Relatório Geral"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 z-40">
          <span className="font-bold">{selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}</span>
          <Link href={`/engenharia/om/${usinaId}/relatorio-geral?ids=${selectedIds.join(',')}`} className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-full font-bold text-sm transition-colors">
            Gerar Relatório Geral
          </Link>
          <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">{(newManutencao as any).id ? "Editar Manutenção" : "Agendar Manutenção"}</h2>
              <button onClick={() => {
                setShowModal(false);
                setNewManutencao({ usinaId, equipamentoId: "", tipo: "Preventiva", dataAgendada: "", descricao: "", responsavel: "" });
              }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Manutenção</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" value={newManutencao.tipo} onChange={e => setNewManutencao({...newManutencao, tipo: e.target.value})}>
                  <option value="Preventiva">Preventiva</option>
                  <option value="Corretiva">Corretiva</option>
                  <option value="Preditiva">Preditiva</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipamento Vinculado</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" value={newManutencao.equipamentoId} onChange={e => setNewManutencao({...newManutencao, equipamentoId: e.target.value})}>
                  <option value="">Geral / Nenhum equipamento específico</option>
                  {usina.equipamentos?.map((eq: any) => (
                    <option key={eq.id} value={eq.id}>{eq.tag} - {eq.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Agendada</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" value={newManutencao.dataAgendada} onChange={e => setNewManutencao({...newManutencao, dataAgendada: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" placeholder="Ex: João Engenharia" value={newManutencao.responsavel} onChange={e => setNewManutencao({...newManutencao, responsavel: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição / Check-list</label>
                <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 h-24 resize-none" placeholder="O que deve ser feito?" value={newManutencao.descricao} onChange={e => setNewManutencao({...newManutencao, descricao: e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => {
                setShowModal(false);
                setNewManutencao({ usinaId, equipamentoId: "", tipo: "Preventiva", dataAgendada: "", descricao: "", responsavel: "" });
              }} className="flex-1 py-3 text-slate-500 font-bold border border-slate-200 rounded-xl">Cancelar</button>
              <button onClick={handleCreate} disabled={!newManutencao.dataAgendada} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">
                {(newManutencao as any).id ? "Salvar Alterações" : "Agendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Concluir Manutenção (Novo Reportar) */}
      {showCompleteModal && !annotatorFile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
              <h2 className="text-xl font-black text-emerald-800 flex items-center gap-2"><CheckCircle className="w-6 h-6" /> Relatório de Intervenção</h2>
              <button onClick={() => setShowCompleteModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início da Manutenção</label>
                  <input type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" value={reportData.tempoInicio} onChange={e => setReportData({...reportData, tempoInicio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fim da Manutenção</label>
                  <input type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" value={reportData.tempoFim} onChange={e => setReportData({...reportData, tempoFim: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Atividades Realizadas</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 h-24 resize-none" 
                  placeholder="Descreva o que foi feito..." 
                  value={reportData.descricao} 
                  onChange={e => setReportData({...reportData, descricao: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peças Trocadas (Inventário)</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 h-20 resize-none" 
                    placeholder="Ex: 2x Fusíveis 15A, 1x Contatora" 
                    value={reportData.pecasTrocadas} 
                    onChange={e => setReportData({...reportData, pecasTrocadas: e.target.value})} 
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Materiais (R$)</label>
                  <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" placeholder="Ex: 450.00" value={reportData.custoMateriais} onChange={e => setReportData({...reportData, custoMateriais: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Mão de Obra (R$)</label>
                  <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" placeholder="Ex: 1200.00" value={reportData.custoMaoDeObra} onChange={e => setReportData({...reportData, custoMaoDeObra: e.target.value})} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Relatório Fotográfico ({reportData.fotosDetalhes.length})</label>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {reportData.fotosDetalhes.map((f, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-100">
                      <img src={f.urlBase64} alt={`Foto ${i}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-2 transition-opacity">
                        <p className="text-white text-xs line-clamp-2">{f.observacao}</p>
                      </div>
                      <button 
                        onClick={() => setReportData({...reportData, fotosDetalhes: reportData.fotosDetalhes.filter((_, index) => index !== i)})}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 font-bold text-sm">Inserir e Anotar Foto</p>
                  <p className="text-slate-400 text-xs mt-1">Desenhe marcações para apontar falhas</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={() => setShowCompleteModal(null)} className="flex-1 py-3 text-slate-500 font-bold border border-slate-200 rounded-xl">Cancelar</button>
              <button onClick={handleComplete} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors">
                Finalizar e Gerar Laudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotator Modal Overlay */}
      {annotatorFile && (
        <ImageAnnotator 
          file={annotatorFile} 
          onCancel={() => setAnnotatorFile(null)} 
          onSave={(data) => {
            setReportData({...reportData, fotosDetalhes: [...reportData.fotosDetalhes, data]});
            setAnnotatorFile(null);
          }} 
        />
      )}
    </div>
  );
}
