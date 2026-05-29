"use client";

import React, { useState, useEffect } from 'react';
import { calcDaysLate } from '@/lib/dateUtils';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Loader, CheckCircle, Plus, Zap, Hammer, Paperclip, Download,
  Printer
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, parseISO, isValid, parse,
  addWeeks, subWeeks, addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function CronogramaClient({ atividades, manutencoes }: any) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Local state for optimistic updates
  const [localAtividades, setLocalAtividades] = useState(atividades);
  const [localManutencoes, setLocalManutencoes] = useState(manutencoes);

  // Drag and drop states
  const [draggedEvent, setDraggedEvent] = useState<any>(null);
  const [dragHoveredDay, setDragHoveredDay] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync props to local state if they change
  useEffect(() => {
    setLocalAtividades(atividades);
  }, [atividades]);

  useEffect(() => {
    setLocalManutencoes(manutencoes);
  }, [manutencoes]);

  // Estado para o modal de nova atividade
  const [novaAtividade, setNovaAtividade] = useState<{ open: boolean; date: Date | null }>({ open: false, date: null });
  const [novaForm, setNovaForm] = useState({
    instalacao: '',
    solicitacao: '',
    observacao: '',
    status: 'Pendente',
    vendedor: '',
    telefoneCliente: '',
    telefoneVendedor: '',
    cidade: '',
    dataPrevista: '',
  });
  const [novaLoading, setNovaLoading] = useState(false);
  const [novaSuccess, setNovaSuccess] = useState(false);

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentMonth(subWeeks(currentMonth, 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setCurrentMonth(addWeeks(currentMonth, 1));
    }
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  // Lógica para arrastar e soltar (Drag and Drop)
  const handleDragStart = (e: React.DragEvent, eventObj: any) => {
    setDraggedEvent(eventObj);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: eventObj.id, type: eventObj.type }));
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
  };

  const handleDragOver = (e: React.DragEvent, dayStr: string) => {
    e.preventDefault();
    if (dragHoveredDay !== dayStr) {
      setDragHoveredDay(dayStr);
    }
  };

  const handleDragLeave = () => {
    setDragHoveredDay(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragHoveredDay(null);

    if (!draggedEvent) return;

    const targetDateStr = format(targetDay, 'yyyy-MM-dd');
    const originalDateStr = format(draggedEvent.date, 'yyyy-MM-dd');
    
    // Se soltar no mesmo dia, cancela
    if (originalDateStr === targetDateStr) {
      setDraggedEvent(null);
      return;
    }

    const eventId = draggedEvent.original.id;
    const eventType = draggedEvent.type;

    // Cópia para caso de erro
    const prevAtividades = [...localAtividades];
    const prevManutencoes = [...localManutencoes];

    // Atualização otimista imediata na tela
    if (eventType === 'instalacao') {
      setLocalAtividades((prev: any[]) =>
        prev.map(a => (a.id === eventId ? { ...a, automaticoPrevInstala: targetDateStr } : a))
      );
    } else if (eventType === 'manutencao') {
      setLocalManutencoes((prev: any[]) =>
        prev.map(m => (m.id === eventId ? { ...m, dataAgendada: targetDateStr } : m))
      );
    }

    setIsSaving(true);
    try {
      if (eventType === 'instalacao') {
        // Enviar os dados originais, mas OMITIR dataPrevista para preservá-la no backend
        const { id, dataPrevista, ...rest } = draggedEvent.original;
        const payload = {
          ...rest,
          automaticoPrevInstala: targetDateStr
        };

        const res = await fetch(`/api/activities/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Erro ao atualizar data da instalação");
      } else if (eventType === 'manutencao') {
        // PATCH para /api/engenharia/om/manutencoes
        const res = await fetch('/api/engenharia/om/manutencoes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: eventId,
            dataAgendada: targetDateStr
          })
        });
        if (!res.ok) throw new Error("Erro ao atualizar data da manutenção");
      }

      // Atualizar automaticamente recarregando os dados em tela
      window.location.reload();
    } catch (err) {
      console.error(err);
      // Reverter alteração otimista
      setLocalAtividades(prevAtividades);
      setLocalManutencoes(prevManutencoes);
      alert('Não foi possível salvar o novo agendamento.');
      setIsSaving(false);
    } finally {
      setDraggedEvent(null);
    }
  };

  // Função para parsear datas em formatos variados
  const parseDate = (dateStr: any) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    let d = parseISO(dateStr);
    if (isValid(d)) return d;

    d = parse(dateStr, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return d;

    return null;
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Transformar dados em eventos de calendário
  const events = [
    ...localAtividades.map((a: any) => {
      const daysParecer = a.vencimentoParecer ? calcDaysLate(a.vencimentoParecer) : null;
      const isUrgent = daysParecer !== null && daysParecer <= 30;
      return {
        id: `inst-${a.id}`,
        type: 'instalacao',
        title: a.instalacao || 'Sem nome',
        date: parseDate(a.automaticoPrevInstala || a.vencimentoParecer),
        original: a,
        color: isUrgent ? 'bg-red-600' : (a.prioridade ? 'bg-purple-600' : a.atividadeExtra ? 'bg-blue-800' : 'bg-blue-500'),
        status: a.status,
        hasAttachments: (a.anexoFotos && a.anexoFotos.length > 0) || (a.anexoArquivos && a.anexoArquivos.length > 0),
        isUrgent,
        daysParecer
      };
    }),
    ...localManutencoes.map((m: any) => ({
      id: `om-${m.id}`,
      type: 'manutencao',
      title: `${m.usina?.nome || 'Usina'} - ${m.tipo}`,
      date: parseDate(m.dataAgendada),
      original: m,
      color: 'bg-[#F25C27]',
      status: m.status
    }))
  ].filter(e => e.date !== null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = viewMode === 'month'
    ? eachDayOfInterval({ start: startDate, end: endDate })
    : eachDayOfInterval({ start: startOfWeek(currentMonth), end: endOfWeek(currentMonth) });

  // Calcular os dias para a impressão: Segunda a Sábado (6 dias)
  const mondayOfCurrentWeek = startOfWeek(currentMonth, { weekStartsOn: 1 });
  const printDays = Array.from({ length: 6 }).map((_, idx) => addDays(mondayOfCurrentWeek, idx));

  // Abrir modal de nova atividade com data pré-preenchida
  const handleDayDoubleClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    setNovaForm({
      instalacao: '',
      solicitacao: '',
      observacao: '',
      status: 'Pendente',
      vendedor: '',
      telefoneCliente: '',
      telefoneVendedor: '',
      cidade: '',
      dataPrevista: dateStr,
    });
    setNovaSuccess(false);
    setNovaAtividade({ open: true, date: day });
  };

  const handleNovaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNovaLoading(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...novaForm, 
          obsInstalacao: novaForm.observacao, 
          anexoFotos: [], 
          anexoArquivos: [] 
        }),
      });
      if (res.ok) {
        setNovaSuccess(true);
        setTimeout(() => {
          setNovaAtividade({ open: false, date: null });
          setNovaSuccess(false);
          window.location.reload();
        }, 1800);
      } else {
        alert('Erro ao salvar atividade.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar atividade.');
    } finally {
      setNovaLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm shadow-sm";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="w-full">
      {/* 
        ========================================================================
        CONTEÚDO INTERATIVO DA TELA (Oculto ao imprimir)
        ========================================================================
      */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
        {/* Header do Calendário */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-slate-800 capitalize leading-tight">
                {viewMode === 'month' 
                  ? format(currentMonth, 'MMMM yyyy', { locale: ptBR })
                  : `Semana de ${format(startOfWeek(currentMonth), "dd/MM")} a ${format(endOfWeek(currentMonth), "dd/MM")}`
                }
              </h2>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider mt-0.5">
                {viewMode === 'month' ? 'Visão Mensal' : 'Visão Semanal'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Indicador de Salvamento */}
            {isSaving && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-xl border border-blue-100 font-bold shrink-0 animate-pulse">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span>Atualizando...</span>
              </div>
            )}

            {/* Alternar Visualização */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button 
                onClick={() => setViewMode('month')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setViewMode('week')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Semanal
              </button>
            </div>

            {/* Botão de Impressão Semanal */}
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all shadow-sm shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            
            {/* Navegação de Datas */}
            <div className="flex items-center gap-1.5 bg-slate-100/55 p-1 rounded-xl border border-slate-200/50">
              <button onClick={prevPeriod} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleToday} className="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                Hoje
              </button>
              <button onClick={nextPeriod} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Legenda */}
        <div className="flex flex-wrap gap-4 px-6 py-3 border-b border-slate-100 bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div> Instalação
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600"></div> Prioridade
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-800"></div> Extra
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F25C27]"></div> Manutenção O&M
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-350 border border-slate-400"></div> Finalizada
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div> Parecer Vencendo (≤ 30 dias)
          </div>
          <div className="flex items-center gap-2 ml-auto text-slate-300 font-medium normal-case tracking-normal">
            <span>Arraste atividades ou clique duplo para cadastrar</span>
          </div>
        </div>

        {/* Corpo do Calendário dependendo da visualização */}
        {viewMode === 'month' ? (
          <>
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50/30">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 border-r border-slate-100 last:border-0">{day}</div>
              ))}
            </div>

            {/* Grade dos dias (Mensal) */}
            <div className="grid grid-cols-7 auto-rows-[140px]">
              {calendarDays.map((day, idx) => {
                const dayEvents = events.filter(e => isSameDay(e.date as Date, day));
                const isSelectedMonth = isSameMonth(day, currentMonth);
                const isTodayDay = isToday(day);
                const dayStr = format(day, 'yyyy-MM-dd');
                const isHovered = dragHoveredDay === dayStr;

                return (
                  <div 
                    key={day.toString()} 
                    onDoubleClick={() => handleDayDoubleClick(day)}
                    onDragOver={(e) => handleDragOver(e, dayStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`border-r border-b border-slate-100 p-2 transition-colors flex flex-col gap-1 group relative
                      ${!isSelectedMonth ? 'bg-slate-50/50 opacity-40' : 'bg-white hover:bg-blue-50/30 cursor-pointer'}
                      ${isTodayDay ? 'ring-2 ring-inset ring-blue-500/20' : ''}
                      ${isHovered ? 'bg-blue-50 border border-dashed border-blue-500 z-10 scale-[1.01]' : ''}
                    `}
                    title={isSelectedMonth ? 'Clique duplo para nova atividade' : ''}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-black ${isTodayDay ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                        {format(day, 'd')}
                      </span>
                      {isSelectedMonth && (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                          <Plus className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                      {dayEvents.map(event => {
                        const isFinished = event.status && /conclu/i.test(event.status);
                        const showFinishedStyle = !!isFinished;
                        
                        let tooltipText = event.title;
                        if (event.isUrgent && !isFinished && event.daysParecer !== null && event.daysParecer !== undefined) {
                          if (event.daysParecer < 0) {
                            tooltipText = `${event.title} (Parecer VENCIDO há ${Math.abs(event.daysParecer)} dias)`;
                          } else if (event.daysParecer === 0) {
                            tooltipText = `${event.title} (Parecer Vence HOJE)`;
                          } else {
                            tooltipText = `${event.title} (Parecer Vencendo em ${event.daysParecer} dias)`;
                          }
                        }
                        
                        return (
                          <div 
                            key={event.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-grab active:cursor-grabbing hover:brightness-90 transition-all truncate shadow-sm flex items-center justify-between gap-1
                              ${showFinishedStyle 
                                ? 'bg-slate-200 text-slate-500 line-through border border-slate-300' 
                                : `${event.color} text-white`
                              }`}
                            title={tooltipText}
                          >
                            <span className="truncate flex-1">{event.title}</span>
                            {event.hasAttachments && (
                              <Paperclip className={`w-3 h-3 shrink-0 ${showFinishedStyle ? 'text-slate-400' : 'text-white/80'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Visualização Semanal (Colunas Verticais) */
          <div className="p-6 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-h-[350px] md:min-h-[500px]">
              {calendarDays.map((day) => {
                const dayEvents = events.filter(e => isSameDay(e.date as Date, day));
                const isTodayDay = isToday(day);
                const dayStr = format(day, 'yyyy-MM-dd');
                const isHovered = dragHoveredDay === dayStr;

                return (
                  <div 
                    key={day.toString()}
                    onDragOver={(e) => handleDragOver(e, dayStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                    onDoubleClick={() => handleDayDoubleClick(day)}
                    className={`bg-white rounded-3xl border-2 p-4 transition-all flex flex-col gap-3 min-h-[350px] md:min-h-[500px] shadow-sm
                      ${isTodayDay ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-100 hover:border-slate-200'}
                      ${isHovered ? 'border-dashed border-blue-500 bg-blue-50/50 scale-[1.02] z-10 shadow-lg' : ''}
                    `}
                  >
                    {/* Header do dia */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isTodayDay ? 'text-blue-600' : 'text-slate-400'}`}>
                          {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                        </span>
                        <span className={`text-base font-black ${isTodayDay ? 'text-blue-600' : 'text-slate-800'}`}>
                          {format(day, 'dd/MM')}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDayDoubleClick(day)}
                        className={`p-1.5 rounded-xl transition-colors ${isTodayDay ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'hover:bg-slate-100 text-slate-400'}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Lista de Atividades */}
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                      {dayEvents.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200/50 rounded-2xl p-4 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-normal">
                            Sem Atividades
                          </p>
                        </div>
                      ) : (
                        dayEvents.map(event => {
                          const isFinished = event.status && /conclu/i.test(event.status);
                          const showFinishedStyle = !!isFinished;
                          
                          let tooltipText = event.title;
                          if (event.isUrgent && !isFinished && event.daysParecer !== null && event.daysParecer !== undefined) {
                            if (event.daysParecer < 0) {
                              tooltipText = `${event.title} (Parecer VENCIDO há ${Math.abs(event.daysParecer)} dias)`;
                            } else if (event.daysParecer === 0) {
                              tooltipText = `${event.title} (Parecer Vence HOJE)`;
                            } else {
                              tooltipText = `${event.title} (Parecer Vencendo em ${event.daysParecer} dias)`;
                            }
                          }

                          return (
                            <div 
                              key={event.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, event)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                              className={`px-3 py-2.5 rounded-2xl text-xs font-bold cursor-grab active:cursor-grabbing hover:brightness-95 transition-all shadow-sm flex flex-col gap-1.5 border
                                ${showFinishedStyle 
                                  ? 'bg-slate-100 text-slate-500 line-through border border-slate-200' 
                                  : `${event.color} text-white border-transparent`
                                }`}
                              title={tooltipText}
                            >
                              <div className="flex items-start justify-between gap-1 w-full">
                                <span className="font-extrabold truncate flex-1 leading-tight">{event.title}</span>
                                {event.hasAttachments && (
                                  <Paperclip className={`w-3.5 h-3.5 shrink-0 ${showFinishedStyle ? 'text-slate-400' : 'text-white/80'}`} />
                                )}
                              </div>
                              
                              <div className={`text-[9px] font-semibold flex items-center justify-between gap-1 opacity-90
                                ${showFinishedStyle ? 'text-slate-400' : 'text-white/85'}`}>
                                <span className="truncate">
                                  {event.type === 'instalacao' 
                                    ? (event.original.cidade || event.original.cidadeSheet || 'Instalação') 
                                    : (event.original.usina?.localizacao || 'O&M')}
                                </span>
                                <span className="uppercase shrink-0 text-[8px] tracking-widest font-black bg-white/20 px-1 py-0.25 rounded-md">
                                  {event.type === 'instalacao' ? 'INST' : 'OM'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        ÁREA DE IMPRESSÃO - GESTÃO À VISTA (6 COLUNAS: SEGUNDA A SÁBADO)
        ========================================================================
      */}
      <div className="hidden print:block bg-white text-black p-1 w-full overflow-hidden">
        {/* Cabeçalho do Relatório Compactado ao Máximo */}
        <div className="border-b border-slate-550 pb-1 mb-2.5 flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[14px] font-black tracking-tight text-slate-900 leading-none">CORDEIRO ENERGIA</h1>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">CRONOGRAMA SEMANAL - GESTÃO À VISTA</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-700 leading-none">
              {format(mondayOfCurrentWeek, 'dd/MM/yyyy')} a {format(addDays(mondayOfCurrentWeek, 5), 'dd/MM/yyyy')}
            </span>
          </div>
        </div>

        {/* Grade de 6 Colunas Horizontais */}
        <div className="grid grid-cols-6 gap-2 w-full items-start">
          {printDays.map((day) => {
            const dayEvents = events.filter(e => isSameDay(e.date as Date, day));
            const totalEvents = dayEvents.length;
            const useCompactMode = totalEvents > 1; // Comprime automaticamente caso tenha mais de 1 atividade para caber perfeito!

            return (
              <div key={day.toString()} className="border border-slate-700 rounded-lg overflow-hidden flex flex-col bg-white break-inside-avoid">
                {/* Cabeçalho do dia */}
                <div className="bg-slate-900 text-white py-1 px-2 text-center flex flex-col border-b border-slate-700 shrink-0">
                  <span className="font-black text-[9px] uppercase tracking-wider leading-none">
                    {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                  </span>
                  <span className="font-extrabold text-[8px] opacity-80 mt-0.5 leading-none">
                    {format(day, 'dd/MM/yyyy')}
                  </span>
                </div>

                {/* Eventos da coluna */}
                <div className={`p-1 space-y-1.5 flex-1 min-h-[360px] bg-slate-50/20`}>
                  {totalEvents === 0 ? (
                    <div className="h-full flex items-center justify-center text-center py-6">
                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic">
                        Sem Atividades
                      </p>
                    </div>
                  ) : (
                    dayEvents.map((event) => {
                      const isInst = event.type === 'instalacao';
                      return (
                        <div 
                          key={event.id} 
                          className={`rounded border border-slate-400 bg-white shadow-sm flex flex-col
                            ${useCompactMode ? 'p-1.5 space-y-1 text-[7.5px]' : 'p-2 space-y-1.5 text-[9px]'}`}
                        >
                          {/* Tipo / Status */}
                          <div className="flex justify-between items-center border-b border-slate-200 pb-0.5 shrink-0 leading-none">
                            <span className={`font-black uppercase rounded ${
                              useCompactMode ? 'text-[7px] px-1' : 'text-[8px] px-1.5 py-0.25'
                            } ${
                              isInst ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-orange-50 text-orange-950 border border-orange-200'
                            }`}>
                              {isInst ? 'INST' : 'OM'}
                            </span>
                            <span className="text-[7px] font-extrabold text-slate-500 uppercase tracking-wide">
                              {event.status || 'Pendente'}
                            </span>
                          </div>

                          {/* Nome da Instalação / Título */}
                          <div className={`font-black text-slate-950 break-words leading-tight
                            ${useCompactMode ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
                            {event.title}
                          </div>

                          {/* Detalhes Técnicos Exigidos em Formato Ultra-Compacto */}
                          {isInst ? (
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-900 flex-1 space-y-0.5">
                              <div className="leading-tight">
                                <span className="font-extrabold text-slate-500 mr-0.5">Cli:</span>
                                <span className="font-bold text-slate-800 break-all">{event.original.instalacao || '-'}</span>
                              </div>
                              <div className="flex justify-between gap-1 border-t border-slate-150 pt-0.5 mt-0.5 leading-tight">
                                <div>
                                  <span className="font-extrabold text-slate-500 mr-0.5">Cid:</span>
                                  <span className="font-bold text-slate-800">{event.original.cidade || event.original.cidadeSheet || '-'}</span>
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-500 mr-0.5">Inv:</span>
                                  <span className="font-bold text-slate-800">{event.original.inversor || '-'}</span>
                                </div>
                              </div>
                              <div className="border-t border-slate-150 pt-0.5 mt-0.5 flex justify-between items-center leading-tight">
                                <div>
                                  <span className="font-extrabold text-slate-500 mr-0.5">Módulos:</span>
                                  <span className="font-black text-slate-950">{event.original.numMod || event.original.modulo || '-'}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-900 flex-1 space-y-0.5">
                              <div className="leading-tight">
                                <span className="font-extrabold text-slate-500 mr-0.5">Usi:</span>
                                <span className="font-bold text-slate-800 break-all">{event.original.usina?.nome || '-'}</span>
                              </div>
                              <div className="flex justify-between gap-1 border-t border-slate-150 pt-0.5 mt-0.5 leading-tight">
                                <div>
                                  <span className="font-extrabold text-slate-500 mr-0.5">Loc:</span>
                                  <span className="font-bold text-slate-800">{event.original.usina?.localizacao || '-'}</span>
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-500 mr-0.5">Resp:</span>
                                  <span className="font-bold text-slate-850">{event.original.responsavel || '-'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Observações da Atividade */}
                          {!useCompactMode && (event.original.obsInstalacao || event.original.observacao || event.original.descricao) && (
                            <div className="text-[7.5px] text-slate-500 italic border-l border-slate-350 pl-1 leading-tight pt-0.5 mt-0.5 border-t border-slate-100/50 break-words max-h-[35px] overflow-hidden">
                              Obs: {isInst ? (event.original.obsInstalacao || event.original.observacao) : event.original.descricao}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`p-8 text-white flex justify-between items-start ${selectedEvent.color}`}>
              <div>
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase mb-3 inline-block">
                  {selectedEvent.type === 'instalacao' ? '📦 Instalação' : '🔧 Manutenção O&M'}
                </div>
                <h2 className="text-2xl font-black leading-tight">{selectedEvent.title}</h2>
                <p className="opacity-80 font-bold mt-1">
                  {format(selectedEvent.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors border-0 cursor-pointer text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</p>
                  <p className="font-bold text-slate-700">{selectedEvent.status || 'Pendente'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                  <p className="font-bold text-slate-700 truncate">
                    {selectedEvent.type === 'instalacao' 
                      ? (selectedEvent.original.cidade || selectedEvent.original.cidadeSheet || '-') 
                      : (selectedEvent.original.usina?.localizacao || '-')}
                  </p>
                </div>
              </div>

              {selectedEvent.type === 'instalacao' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Observações da Instalação</p>
                    <p className="text-sm text-slate-650 font-medium italic">"{selectedEvent.original.obsInstalacao || selectedEvent.original.observacao || 'Sem observações.'}"</p>
                  </div>
                  
                  {/* Dados Técnicos Rápidos */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-800">
                    <div>
                      <p className="font-black text-[9px] text-slate-400 uppercase tracking-wider">Inversor</p>
                      <p className="font-bold mt-0.5">{selectedEvent.original.inversor || '-'}</p>
                    </div>
                    <div>
                      <p className="font-black text-[9px] text-slate-400 uppercase tracking-wider">Módulos</p>
                      <p className="font-bold mt-0.5">{selectedEvent.original.numMod || selectedEvent.original.modulo || '-'}</p>
                    </div>
                  </div>

                  {selectedEvent.hasAttachments && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Anexos Disponíveis</p>
                      <div className="flex flex-col gap-2">
                        {selectedEvent.original.anexoFotos?.map((url: string, idx: number) => (
                          <button
                            type="button"
                            key={`foto-${idx}`}
                            onClick={() => downloadFile(url, `foto-${idx + 1}-${selectedEvent.original.instalacao || 'anexo'}.jpg`)}
                            className="flex items-center gap-2 text-xs font-bold text-[#00BFA5] hover:text-[#009b86] transition-colors text-left bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Foto {idx + 1} (Imagem)</span>
                          </button>
                        ))}
                        {selectedEvent.original.anexoArquivos?.map((url: string, idx: number) => {
                          const filename = url.split('/').pop() || `arquivo-${idx + 1}`;
                          return (
                            <button
                              type="button"
                              key={`arq-${idx}`}
                              onClick={() => downloadFile(url, `${selectedEvent.original.instalacao || 'anexo'}-${filename}`)}
                              className="flex items-center gap-2 text-xs font-bold text-[#00BFA5] hover:text-[#009b86] transition-colors text-left bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="truncate flex-1">{filename}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <Link 
                    href={`/atividades/editar/${selectedEvent.original.id}`}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    <Zap className="w-4 h-4" /> Acessar Atividade
                  </Link>
                </div>
              )}

              {selectedEvent.type === 'manutencao' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Descrição da Manutenção</p>
                    <p className="text-sm text-slate-650 font-medium italic">"{selectedEvent.original.descricao || 'Sem descrição.'}"</p>
                  </div>
                  <Link 
                    href={`/engenharia/om/${selectedEvent.original.usinaId}`}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-[#F25C27] text-white rounded-2xl font-black text-sm hover:bg-[#d44815] transition-all shadow-lg shadow-orange-200"
                  >
                    <Hammer className="w-4 h-4" /> Acessar O&M da Usina
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Atividade */}
      {novaAtividade.open && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-3"
          onClick={() => setNovaAtividade({ open: false, date: null })}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header compacto */}
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#015299] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 rounded-lg p-1.5">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block leading-none mb-0.5">Nova Atividade</span>
                  <span className="text-sm font-black capitalize leading-none">
                    {novaAtividade.date
                      ? format(novaAtividade.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setNovaAtividade({ open: false, date: null })}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors border-0 cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo */}
            {novaSuccess ? (
              <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800">Atividade Registrada!</h3>
                <p className="text-slate-500 mt-1 text-sm">Atualizando o calendário...</p>
              </div>
            ) : (
              <form onSubmit={handleNovaSubmit} className="p-5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className={labelClass}>Cliente (Instalação) *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      placeholder="Ex: João Silva"
                      value={novaForm.instalacao}
                      onChange={e => setNovaForm({ ...novaForm, instalacao: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Solicitação *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      placeholder="Título da solicitação"
                      value={novaForm.solicitacao}
                      onChange={e => setNovaForm({ ...novaForm, solicitacao: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Cidade</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Cidade"
                      value={novaForm.cidade}
                      onChange={e => setNovaForm({ ...novaForm, cidade: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Vendedor</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Vendedor"
                      value={novaForm.vendedor}
                      onChange={e => setNovaForm({ ...novaForm, vendedor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="(XX) XXXXX-XXXX"
                      value={novaForm.telefoneCliente}
                      onChange={e => setNovaForm({ ...novaForm, telefoneCliente: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      className={inputClass}
                      value={novaForm.status}
                      onChange={e => setNovaForm({ ...novaForm, status: e.target.value })}
                    >
                      <option>Pendente</option>
                      <option>Em Andamento</option>
                      <option>Concluído</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Data Prevista</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={novaForm.dataPrevista}
                      onChange={e => setNovaForm({ ...novaForm, dataPrevista: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className={labelClass}>Observação</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Detalhes técnicos ou da obra..."
                    value={novaForm.observacao}
                    onChange={e => setNovaForm({ ...novaForm, observacao: e.target.value })}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNovaAtividade({ open: false, date: null })}
                    className="flex-1 py-3 border border-slate-200 text-slate-650 font-bold rounded-xl hover:bg-slate-55 transition-all text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={novaLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#015299] text-white font-black rounded-xl hover:brightness-110 transition-all shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer border-0"
                  >
                    {novaLoading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {novaLoading ? 'Salvando...' : 'Registrar Atividade'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        @media print {
          @page {
            size: landscape;
            margin: 0.4cm !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
