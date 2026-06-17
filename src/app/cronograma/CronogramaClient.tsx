"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { calcDaysLate } from '@/lib/dateUtils';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Loader, CheckCircle, Plus, Zap, Hammer, Paperclip, Download,
  Printer, MapPin, FileText, X
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, parseISO, isValid, parse,
  addWeeks, subWeeks, addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  type: 'instalacao' | 'manutencao';
  title: string;
  date: Date;
  original: any;
  color: string;
  status?: string;
  hasAttachments?: boolean;
  isUrgent?: boolean;
  daysParecer?: number | null;
}

// ─── Gerador de PDF (client-side via jsPDF) ─────────────────────────────────

async function gerarOSPdf(event: CalendarEvent) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const o = event.original;

  // Cabeçalho timbrado — paleta Cordeiro Energia
  doc.setFillColor(30, 58, 138); // #1E3A8A
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(0, 191, 165); // #00BFA5
  doc.rect(0, 35, 210, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CORDEIRO ENERGIA', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 255);
  doc.text('ORDEM DE SERVIÇO — CALENDÁRIO DE ATIVIDADES', 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(200, 230, 255);
  doc.text(`OS Nº: ${o.id?.slice(0, 8)?.toUpperCase() || 'N/D'}`, 14, 29);
  doc.text(`Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 120, 29);

  // ── Seção: Dados da Atividade ──
  let y = 52;
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DADOS DA ATIVIDADE', 14, y);
  doc.setDrawColor(0, 191, 165);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 196, y + 2);
  y += 10;

  doc.setTextColor(50, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const isInst = event.type === 'instalacao';

  const linhas: [string, string][] = isInst ? [
    ['Tipo', 'Instalação Fotovoltaica'],
    ['Cliente', o.instalacao || '—'],
    ['Solicitação', o.solicitacao || '—'],
    ['Cidade', o.cidade || o.cidadeSheet || '—'],
    ['Status', event.status || 'Pendente'],
    ['Data Prevista', format(event.date, 'dd/MM/yyyy')],
    ['Inversor', o.inversor || '—'],
    ['Módulos', `${o.numMod || o.modulo || '—'}`],
    ['Vendedor', o.vendedor || '—'],
    ['Telefone Cliente', o.telefoneCliente || '—'],
  ] : [
    ['Tipo', `Manutenção O&M — ${o.tipo || '—'}`],
    ['Usina', o.usina?.nome || '—'],
    ['Localização', o.usina?.localizacao || '—'],
    ['Responsável', o.responsavel || '—'],
    ['Status', event.status || 'Agendada'],
    ['Data Prevista', format(event.date, 'dd/MM/yyyy')],
  ];

  linhas.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(value, 70, y);
    y += 8;
  });

  // ── Seção: Observações ──
  const obs = isInst 
    ? (o.obsInstalacao || o.observacao || '') 
    : (o.descricao || '');
  if (obs) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.text('OBSERVAÇÕES / ESCOPO', 14, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 65, 85);
    doc.setFontSize(9);
    const linhasObs = doc.splitTextToSize(obs, 180);
    doc.text(linhasObs, 14, y);
    y += linhasObs.length * 5 + 8;
  }

  // ── Seção: Assinaturas ──
  y = Math.max(y + 10, 220);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(14, y, 90, y);
  doc.line(120, y, 196, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Técnico Responsável / Executor', 22, y + 5);
  doc.text('Aprovação / Supervisão', 135, y + 5);

  // ── Rodapé ──
  doc.setFontSize(7);
  doc.setTextColor(150, 160, 180);
  doc.text('Cordeiro Energia — Documento gerado automaticamente pelo Sistema de Gestão de Atividades', 14, 285);
  doc.text(`Ref. Interna: ${o.id || ''}`, 165, 285);

  doc.save(`OS_${isInst ? 'Instalacao' : 'OM'}_${o.id?.slice(0, 8) || 'doc'}.pdf`);
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function CronogramaClient({ atividades, manutencoes }: any) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [osModalEvent, setOsModalEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Estado local para atualizações otimistas
  const [localAtividades, setLocalAtividades] = useState(atividades);
  const [localManutencoes, setLocalManutencoes] = useState(manutencoes);

  // Drag & Drop
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragHoveredDay, setDragHoveredDay] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal de nova atividade
  const [novaAtividade, setNovaAtividade] = useState<{ open: boolean; date: Date | null }>({ open: false, date: null });
  const [novaForm, setNovaForm] = useState({
    instalacao: '', solicitacao: '', observacao: '', status: 'Pendente',
    vendedor: '', telefoneCliente: '', telefoneVendedor: '', cidade: '', dataPrevista: '',
    latitude: '', longitude: '',
  });
  const [novaLoading, setNovaLoading] = useState(false);
  const [novaSuccess, setNovaSuccess] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Geração de PDF
  const [pdfLoading, setPdfLoading] = useState(false);

  // Tooltip flutuante (JS-based) para evitar corte de overflow
  const [tooltip, setTooltip] = useState<{
    event: CalendarEvent;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent, event: CalendarEvent) => {
    setTooltip({
      event,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Double-click detection refs
  const clickTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => { setLocalAtividades(atividades); }, [atividades]);
  useEffect(() => { setLocalManutencoes(manutencoes); }, [manutencoes]);

  // ─── Navegação ──────────────────────────────────────────────────────────────

  const prevPeriod = () => {
    if (viewMode === 'month') setCurrentMonth(subMonths(currentMonth, 1));
    else setCurrentMonth(subWeeks(currentMonth, 1));
  };
  const nextPeriod = () => {
    if (viewMode === 'month') setCurrentMonth(addMonths(currentMonth, 1));
    else setCurrentMonth(addWeeks(currentMonth, 1));
  };
  const handleToday = () => setCurrentMonth(new Date());

  // ─── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, eventObj: CalendarEvent) => {
    setDraggedEvent(eventObj);
    setSaveError(null);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dayStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragHoveredDay(dayStr);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Evitar flicker ao passar sobre filhos do dia
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragHoveredDay(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragHoveredDay(null);

    if (!draggedEvent) return;

    const targetDateStr = format(targetDay, 'yyyy-MM-dd');
    const originalDateStr = format(draggedEvent.date, 'yyyy-MM-dd');

    if (originalDateStr === targetDateStr) {
      setDraggedEvent(null);
      return;
    }

    const eventId = draggedEvent.original.id;
    const eventType = draggedEvent.type;

    // Snapshot para rollback
    const prevAtividades = localAtividades;
    const prevManutencoes = localManutencoes;

    // Atualização otimista imediata
    if (eventType === 'instalacao') {
      setLocalAtividades((prev: any[]) =>
        prev.map(a => a.id === eventId ? { ...a, automaticoPrevInstala: targetDateStr } : a)
      );
    } else {
      setLocalManutencoes((prev: any[]) =>
        prev.map(m => m.id === eventId ? { ...m, dataAgendada: targetDateStr } : m)
      );
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      let res: Response;

      if (eventType === 'instalacao') {
        // ✅ API dedicada — só atualiza o campo de data, sem risco de sobrescrever outros campos
        res = await fetch('/api/activities/reagendar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: eventId, novaData: targetDateStr }),
        });
      } else {
        res = await fetch('/api/engenharia/om/manutencoes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: eventId, dataAgendada: targetDateStr }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      // ✅ router.refresh() — re-fetch server-side sem piscar a tela
      router.refresh();

    } catch (err: any) {
      console.error('DROP_ERROR', err);
      // Rollback da atualização otimista
      setLocalAtividades(prevAtividades);
      setLocalManutencoes(prevManutencoes);
      setSaveError(`Erro ao reagendar: ${err.message}`);
    } finally {
      setDraggedEvent(null);
      setIsSaving(false);
    }
  }, [draggedEvent, localAtividades, localManutencoes, router]);

  // ─── Click / Double-click nos eventos ───────────────────────────────────────

  const handleEventClick = useCallback((e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();

    const key = event.id;
    if (clickTimers.current[key]) {
      // Duplo clique detectado
      clearTimeout(clickTimers.current[key]);
      delete clickTimers.current[key];
      setOsModalEvent(event);
    } else {
      // Aguarda possível segundo clique (250ms)
      clickTimers.current[key] = setTimeout(() => {
        delete clickTimers.current[key];
        setSelectedEvent(event);
      }, 250);
    }
  }, []);

  // ─── Parse de datas ─────────────────────────────────────────────────────────

  const parseDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isValid(dateStr) ? dateStr : null;
    let d = parseISO(dateStr);
    if (isValid(d)) return d;
    d = parse(dateStr, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return d;
    return null;
  };

  // ─── Download de anexos ─────────────────────────────────────────────────────

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
    }
  };

  // ─── GPS ────────────────────────────────────────────────────────────────────

  const capturarGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste navegador.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNovaForm(f => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGpsLoading(false);
      },
      () => {
        alert('Não foi possível obter localização. Ative o GPS/permissão no navegador.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ─── Nova Atividade ─────────────────────────────────────────────────────────

  const handleDayDoubleClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    setNovaForm({
      instalacao: '', solicitacao: '', observacao: '', status: 'Pendente',
      vendedor: '', telefoneCliente: '', telefoneVendedor: '', cidade: '',
      dataPrevista: dateStr, latitude: '', longitude: '',
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
          anexoFotos: [], anexoArquivos: [],
        }),
      });
      if (res.ok) {
        setNovaSuccess(true);
        setTimeout(() => {
          setNovaAtividade({ open: false, date: null });
          setNovaSuccess(false);
          router.refresh();
        }, 1500);
      } else {
        alert('Erro ao salvar atividade.');
      }
    } catch {
      alert('Erro ao salvar atividade.');
    } finally {
      setNovaLoading(false);
    }
  };

  // ─── Eventos do Calendário ──────────────────────────────────────────────────

  const events: CalendarEvent[] = [
    ...localAtividades.map((a: any) => {
      const daysParecer = a.vencimentoParecer ? calcDaysLate(a.vencimentoParecer) : null;
      const isUrgent = daysParecer !== null && daysParecer <= 30;
      return {
        id: `inst-${a.id}`,
        type: 'instalacao' as const,
        title: a.instalacao || 'Sem nome',
        date: parseDate(a.automaticoPrevInstala || a.vencimentoParecer)!,
        original: a,
        color: isUrgent ? 'bg-red-600' : (a.prioridade ? 'bg-purple-600' : a.atividadeExtra ? 'bg-blue-800' : 'bg-blue-500'),
        status: a.status,
        hasAttachments: (a.anexoFotos?.length > 0) || (a.anexoArquivos?.length > 0),
        isUrgent, daysParecer,
      };
    }),
    ...localManutencoes.map((m: any) => ({
      id: `om-${m.id}`,
      type: 'manutencao' as const,
      title: `${m.usina?.nome || 'Usina'} — ${m.tipo}`,
      date: parseDate(m.dataAgendada)!,
      original: m,
      color: 'bg-[#F25C27]',
      status: m.status,
    })),
  ].filter(e => e.date !== null && isValid(e.date));

  // ─── Datas do calendário ────────────────────────────────────────────────────

  const monthStart = startOfMonth(currentMonth);
  const calendarDays = viewMode === 'month'
    ? eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) })
    : eachDayOfInterval({ start: startOfWeek(currentMonth), end: endOfWeek(currentMonth) });

  const mondayOfCurrentWeek = startOfWeek(currentMonth, { weekStartsOn: 1 });
  const printDays = Array.from({ length: 6 }).map((_, idx) => addDays(mondayOfCurrentWeek, idx));

  // ─── Classes utilitárias ─────────────────────────────────────────────────────

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm shadow-sm";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* ═══════════════════════════════════════════════════════════════════════
          INTERFACE INTERATIVA (oculta na impressão)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:hidden">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-slate-800 capitalize leading-tight">
                {viewMode === 'month'
                  ? format(currentMonth, 'MMMM yyyy', { locale: ptBR })
                  : `Semana de ${format(startOfWeek(currentMonth), 'dd/MM')} a ${format(endOfWeek(currentMonth), 'dd/MM')}`
                }
              </h2>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider mt-0.5">
                {viewMode === 'month' ? 'Calendário de Atividades — Visão Mensal' : 'Calendário de Atividades — Visão Semanal'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Indicador de salvamento */}
            {isSaving && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-xl border border-blue-100 font-bold shrink-0 animate-pulse">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span>Reagendando...</span>
              </div>
            )}
            {/* Erro de salvamento */}
            {saveError && !isSaving && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs px-3 py-1.5 rounded-xl border border-red-100 font-bold shrink-0">
                <span>⚠ {saveError}</span>
                <button onClick={() => setSaveError(null)} className="hover:text-red-900">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Alternância de view */}
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

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all shadow-sm shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

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

        {/* ── Legenda ── */}
        <div className="flex flex-wrap gap-4 px-6 py-3 border-b border-slate-100 bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> Instalação</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-600" /> Prioridade</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-800" /> Extra</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F25C27]" /> Manutenção O&M</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600" /> Parecer Vencendo (≤ 30 dias)</div>
          <div className="flex items-center gap-2 ml-auto text-slate-300 font-medium normal-case tracking-normal">
            <span>Arraste para reagendar • Clique para detalhes • Duplo clique para OS</span>
          </div>
        </div>

        {/* ── Grade Mensal ── */}
        {viewMode === 'month' ? (
          <>
            <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50/30">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 border-r border-slate-100 last:border-0">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[140px]">
              {calendarDays.map((day) => {
                const dayEvents = events.filter(e => isSameDay(e.date, day));
                const isSelectedMonth = isSameMonth(day, currentMonth);
                const isTodayDay = isToday(day);
                const dayStr = format(day, 'yyyy-MM-dd');
                const isHovered = dragHoveredDay === dayStr;
                const isDragging = !!draggedEvent;

                return (
                  <div
                    key={day.toString()}
                    onDoubleClick={() => isSelectedMonth && handleDayDoubleClick(day)}
                    onDragOver={(e) => handleDragOver(e, dayStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`border-r border-b border-slate-100 p-2 transition-colors flex flex-col gap-1 group relative
                      ${!isSelectedMonth ? 'bg-slate-50/50 opacity-40' : 'bg-white cursor-pointer'}
                      ${isTodayDay ? 'ring-2 ring-inset ring-blue-500/20' : ''}
                      ${isHovered && isDragging ? 'bg-blue-50 border border-dashed border-blue-400 z-10 scale-[1.01] shadow-md' : ''}
                      ${isSelectedMonth && !isHovered ? 'hover:bg-blue-50/20' : ''}
                    `}
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
                      {dayEvents.map(event => (
                        <EventChip
                          key={event.id}
                          event={event}
                          compact
                          onDragStart={(e) => handleDragStart(e, event)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => handleEventClick(e, event)}
                          onMouseEnter={handleMouseEnter}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ── Grade Semanal ── */
          <div className="p-6 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-h-[350px] md:min-h-[500px]">
              {calendarDays.map((day) => {
                const dayEvents = events.filter(e => isSameDay(e.date, day));
                const isTodayDay = isToday(day);
                const dayStr = format(day, 'yyyy-MM-dd');
                const isHovered = dragHoveredDay === dayStr;
                const isDragging = !!draggedEvent;

                return (
                  <div
                    key={day.toString()}
                    onDragOver={(e) => handleDragOver(e, dayStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                    onDoubleClick={() => handleDayDoubleClick(day)}
                    className={`bg-white rounded-3xl border-2 p-4 transition-all flex flex-col gap-3 min-h-[350px] md:min-h-[500px] shadow-sm
                      ${isTodayDay ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-100 hover:border-slate-200'}
                      ${isHovered && isDragging ? 'border-dashed border-blue-500 bg-blue-50/50 scale-[1.02] z-10 shadow-lg' : ''}
                    `}
                  >
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

                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                      {dayEvents.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200/50 rounded-2xl p-4 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-normal">
                            Sem Atividades
                          </p>
                        </div>
                      ) : (
                        dayEvents.map(event => (
                          <EventChip
                            key={event.id}
                            event={event}
                            compact={false}
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => handleEventClick(e, event)}
                            onMouseEnter={handleMouseEnter}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ÁREA DE IMPRESSÃO — GESTÃO À VISTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block bg-white text-black p-1 w-full overflow-hidden">
        <div className="border-b border-slate-550 pb-1 mb-2.5 flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[14px] font-black tracking-tight text-slate-900 leading-none">CORDEIRO ENERGIA</h1>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">CALENDÁRIO DE ATIVIDADES — GESTÃO À VISTA</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-700 leading-none">
              {format(mondayOfCurrentWeek, 'dd/MM/yyyy')} a {format(addDays(mondayOfCurrentWeek, 5), 'dd/MM/yyyy')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 w-full items-start">
          {printDays.map((day) => {
            const dayEvents = events.filter(e => isSameDay(e.date, day));
            const useCompactMode = dayEvents.length > 1;

            return (
              <div key={day.toString()} className="border border-slate-700 rounded-lg overflow-hidden flex flex-col bg-white break-inside-avoid">
                <div className="bg-slate-900 text-white py-1 px-2 text-center flex flex-col border-b border-slate-700 shrink-0">
                  <span className="font-black text-[9px] uppercase tracking-wider leading-none">
                    {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                  </span>
                  <span className="font-extrabold text-[8px] opacity-80 mt-0.5 leading-none">
                    {format(day, 'dd/MM/yyyy')}
                  </span>
                </div>

                <div className="p-1 space-y-1.5 flex-1 min-h-[360px] bg-slate-50/20">
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center py-6">
                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic">Sem Atividades</p>
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
                          <div className="flex justify-between items-center border-b border-slate-200 pb-0.5 shrink-0 leading-none">
                            <span className={`font-black uppercase rounded ${useCompactMode ? 'text-[7px] px-1' : 'text-[8px] px-1.5 py-0.25'} ${isInst ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-orange-50 text-orange-950 border border-orange-200'}`}>
                              {isInst ? 'INST' : 'OM'}
                            </span>
                            <span className="text-[7px] font-extrabold text-slate-500 uppercase tracking-wide">{event.status || 'Pendente'}</span>
                          </div>
                          <div className={`font-black text-slate-950 break-words leading-tight ${useCompactMode ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
                            {event.title}
                          </div>
                          {isInst ? (
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-900 flex-1 space-y-0.5">
                              <div className="leading-tight"><span className="font-extrabold text-slate-500 mr-0.5">Cli:</span><span className="font-bold text-slate-800 break-all">{event.original.instalacao || '-'}</span></div>
                              <div className="flex justify-between gap-1 border-t border-slate-150 pt-0.5 mt-0.5 leading-tight">
                                <div><span className="font-extrabold text-slate-500 mr-0.5">Cid:</span><span className="font-bold text-slate-800">{event.original.cidade || event.original.cidadeSheet || '-'}</span></div>
                                <div><span className="font-extrabold text-slate-500 mr-0.5">Inv:</span><span className="font-bold text-slate-800">{event.original.inversor || '-'}</span></div>
                              </div>
                              <div className="border-t border-slate-150 pt-0.5 mt-0.5 flex justify-between items-center leading-tight">
                                <div><span className="font-extrabold text-slate-500 mr-0.5">Módulos:</span><span className="font-black text-slate-950">{event.original.numMod || event.original.modulo || '-'}</span></div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-900 flex-1 space-y-0.5">
                              <div className="leading-tight"><span className="font-extrabold text-slate-500 mr-0.5">Usi:</span><span className="font-bold text-slate-800 break-all">{event.original.usina?.nome || '-'}</span></div>
                              <div className="flex justify-between gap-1 border-t border-slate-150 pt-0.5 mt-0.5 leading-tight">
                                <div><span className="font-extrabold text-slate-500 mr-0.5">Loc:</span><span className="font-bold text-slate-800">{event.original.usina?.localizacao || '-'}</span></div>
                                <div><span className="font-extrabold text-slate-500 mr-0.5">Resp:</span><span className="font-bold text-slate-850">{event.original.responsavel || '-'}</span></div>
                              </div>
                            </div>
                          )}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: DETALHES DO EVENTO (clique simples)
      ═══════════════════════════════════════════════════════════════════════ */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
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
                      ? (selectedEvent.original.cidade || selectedEvent.original.cidadeSheet || '—')
                      : (selectedEvent.original.usina?.localizacao || '—')}
                  </p>
                </div>
              </div>

              {selectedEvent.type === 'instalacao' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Observações da Instalação</p>
                    <p className="text-sm text-slate-650 font-medium italic">
                      "{selectedEvent.original.obsInstalacao || selectedEvent.original.observacao || 'Sem observações.'}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-800">
                    <div>
                      <p className="font-black text-[9px] text-slate-400 uppercase tracking-wider">Inversor</p>
                      <p className="font-bold mt-0.5">{selectedEvent.original.inversor || '—'}</p>
                    </div>
                    <div>
                      <p className="font-black text-[9px] text-slate-400 uppercase tracking-wider">Módulos</p>
                      <p className="font-bold mt-0.5">{selectedEvent.original.numMod || selectedEvent.original.modulo || '—'}</p>
                    </div>
                  </div>

                  {selectedEvent.hasAttachments && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Anexos Disponíveis</p>
                      <div className="flex flex-col gap-2">
                        {selectedEvent.original.anexoFotos?.map((url: string, idx: number) => (
                          <button key={`foto-${idx}`} type="button"
                            onClick={() => downloadFile(url, `foto-${idx + 1}-${selectedEvent.original.instalacao || 'anexo'}.jpg`)}
                            className="flex items-center gap-2 text-xs font-bold text-[#00BFA5] hover:text-[#009b86] transition-colors text-left bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /><span>Foto {idx + 1}</span>
                          </button>
                        ))}
                        {selectedEvent.original.anexoArquivos?.map((url: string, idx: number) => {
                          const filename = url.split('/').pop() || `arquivo-${idx + 1}`;
                          return (
                            <button key={`arq-${idx}`} type="button"
                              onClick={() => downloadFile(url, `${selectedEvent.original.instalacao || 'anexo'}-${filename}`)}
                              className="flex items-center gap-2 text-xs font-bold text-[#00BFA5] hover:text-[#009b86] transition-colors text-left bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" /><span className="truncate flex-1">{filename}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setSelectedEvent(null); setOsModalEvent(selectedEvent); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-200"
                    >
                      <FileText className="w-4 h-4" /> Gerar OS
                    </button>
                    <Link
                      href={`/atividades/editar/${selectedEvent.original.id}`}
                      prefetch={false}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-200"
                    >
                      <Zap className="w-4 h-4" /> Editar
                    </Link>
                  </div>
                </div>
              )}

              {selectedEvent.type === 'manutencao' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Descrição da Manutenção</p>
                    <p className="text-sm text-slate-650 font-medium italic">
                      "{selectedEvent.original.descricao || 'Sem descrição.'}"
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setSelectedEvent(null); setOsModalEvent(selectedEvent); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-200"
                    >
                      <FileText className="w-4 h-4" /> Gerar OS
                    </button>
                    <Link
                      href={`/engenharia/om/${selectedEvent.original.usinaId}`}
                      prefetch={false}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#F25C27] hover:bg-[#d44815] text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-200"
                    >
                      <Hammer className="w-4 h-4" /> Acessar O&M
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: GERAR ORDEM DE SERVIÇO (duplo clique)
      ═══════════════════════════════════════════════════════════════════════ */}
      {osModalEvent && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={() => setOsModalEvent(null)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header OS */}
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#015299] p-6 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 block mb-1">
                  {osModalEvent.type === 'instalacao' ? '📦 Instalação' : '🔧 Manutenção O&M'}
                </span>
                <h3 className="text-xl font-black leading-tight">{osModalEvent.title}</h3>
                <p className="text-blue-200 text-sm mt-1">
                  {format(osModalEvent.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <button onClick={() => setOsModalEvent(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white border-0 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dados resumo */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {osModalEvent.type === 'instalacao' ? (
                  <>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cliente</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{osModalEvent.original.instalacao || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cidade</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{osModalEvent.original.cidade || osModalEvent.original.cidadeSheet || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Inversor</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{osModalEvent.original.inversor || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Módulos</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{osModalEvent.original.numMod || osModalEvent.original.modulo || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 col-span-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Observações</p>
                      <p className="font-medium text-slate-700 text-sm mt-0.5 italic">
                        {osModalEvent.original.obsInstalacao || osModalEvent.original.observacao || 'Sem observações.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Usina</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{osModalEvent.original.usina?.nome || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Responsável</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{osModalEvent.original.responsavel || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 col-span-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Descrição</p>
                      <p className="font-medium text-slate-700 text-sm mt-0.5 italic">
                        {osModalEvent.original.descricao || 'Sem descrição.'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs text-amber-700 font-medium flex gap-2 items-start">
                <span className="text-base leading-none">💡</span>
                <span>O PDF será gerado com o timbrado Cordeiro Energia e baixado automaticamente. Você pode também editar a atividade antes de gerar.</span>
              </div>
            </div>

            {/* Footer OS */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between gap-3 border-t border-slate-100">
              <button
                onClick={() => setOsModalEvent(null)}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <div className="flex gap-2">
                {osModalEvent.type === 'instalacao' && (
                  <Link
                    href={`/atividades/editar/${osModalEvent.original.id}`}
                    prefetch={false}
                    className="px-4 py-2.5 text-sm font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Editar Atividade
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setPdfLoading(true);
                    try { await gerarOSPdf(osModalEvent); }
                    finally { setPdfLoading(false); }
                  }}
                  disabled={pdfLoading}
                  className="px-5 py-2.5 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {pdfLoading
                    ? <><Loader className="w-4 h-4 animate-spin" /> Gerando...</>
                    : <><FileText className="w-4 h-4" /> Baixar OS (PDF)</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: NOVA ATIVIDADE
      ═══════════════════════════════════════════════════════════════════════ */}
      {novaAtividade.open && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-3"
          onClick={() => setNovaAtividade({ open: false, date: null })}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#015299] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 rounded-lg p-1.5"><Plus className="w-4 h-4" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block leading-none mb-0.5">Nova Atividade</span>
                  <span className="text-sm font-black capitalize leading-none">
                    {novaAtividade.date ? format(novaAtividade.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
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
                    <input required type="text" className={inputClass} placeholder="Ex: João Silva"
                      value={novaForm.instalacao} onChange={e => setNovaForm({ ...novaForm, instalacao: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Solicitação *</label>
                    <input required type="text" className={inputClass} placeholder="Título da solicitação"
                      value={novaForm.solicitacao} onChange={e => setNovaForm({ ...novaForm, solicitacao: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Cidade</label>
                    <input type="text" className={inputClass} placeholder="Cidade"
                      value={novaForm.cidade} onChange={e => setNovaForm({ ...novaForm, cidade: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Vendedor</label>
                    <input type="text" className={inputClass} placeholder="Vendedor"
                      value={novaForm.vendedor} onChange={e => setNovaForm({ ...novaForm, vendedor: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input type="text" className={inputClass} placeholder="(XX) XXXXX-XXXX"
                      value={novaForm.telefoneCliente} onChange={e => setNovaForm({ ...novaForm, telefoneCliente: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select className={inputClass} value={novaForm.status}
                      onChange={e => setNovaForm({ ...novaForm, status: e.target.value })}>
                      <option>Pendente</option>
                      <option>Em Andamento</option>
                      <option>Concluído</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Data Prevista</label>
                    <input type="date" className={inputClass} value={novaForm.dataPrevista}
                      onChange={e => setNovaForm({ ...novaForm, dataPrevista: e.target.value })} />
                  </div>
                </div>

                {/* GPS */}
                <div className="mb-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass + ' mb-0'}>Geolocalização (opcional)</label>
                    <button type="button" onClick={capturarGPS} disabled={gpsLoading}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors">
                      {gpsLoading ? <Loader className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                      {gpsLoading ? 'Capturando...' : 'Capturar GPS'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" className={inputClass} placeholder="Latitude" readOnly
                      value={novaForm.latitude} />
                    <input type="text" className={inputClass} placeholder="Longitude" readOnly
                      value={novaForm.longitude} />
                  </div>
                </div>

                <div className="mb-4">
                  <label className={labelClass}>Observação</label>
                  <textarea rows={2} className={inputClass} placeholder="Detalhes técnicos ou da obra..."
                    value={novaForm.observacao} onChange={e => setNovaForm({ ...novaForm, observacao: e.target.value })} />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setNovaAtividade({ open: false, date: null })}
                    className="flex-1 py-3 border border-slate-200 text-slate-650 font-bold rounded-xl hover:bg-slate-55 transition-all text-sm cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" disabled={novaLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#015299] text-white font-black rounded-xl hover:brightness-110 transition-all shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer border-0">
                    {novaLoading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {novaLoading ? 'Salvando...' : 'Registrar Atividade'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tooltip flutuante premium (JS-based) posicionado fora de containers com overflow */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y + 12,
          }}
          className="z-[9999] bg-slate-900 text-white rounded-xl shadow-2xl p-3 w-60 pointer-events-none border border-slate-700/50 flex flex-col gap-1 select-none animate-in fade-in duration-100"
        >
          <p className="font-black text-[11px] border-b border-slate-700 pb-1.5 mb-0.5 truncate">
            {tooltip.event.title}
          </p>
          {(tooltip.event.type === 'instalacao' ? [
            { label: 'Cliente', value: tooltip.event.original.instalacao || '—' },
            { label: 'Cidade', value: tooltip.event.original.cidade || tooltip.event.original.cidadeSheet || '—' },
            { label: 'Status', value: tooltip.event.status || 'Pendente' },
            { label: 'Inversor', value: tooltip.event.original.inversor || '—' },
            { label: 'Módulos', value: tooltip.event.original.numMod || tooltip.event.original.modulo || '—' },
            ...(tooltip.event.original.vendedor ? [{ label: 'Vendedor', value: tooltip.event.original.vendedor }] : []),
            ...(tooltip.event.isUrgent && tooltip.event.daysParecer !== null && tooltip.event.daysParecer !== undefined
              ? [{ label: '⚠ Parecer', value: tooltip.event.daysParecer < 0 ? `Vencido há ${Math.abs(tooltip.event.daysParecer)}d` : tooltip.event.daysParecer === 0 ? 'Vence HOJE' : `Vence em ${tooltip.event.daysParecer}d` }]
              : []
            ),
          ] : [
            { label: 'Usina', value: tooltip.event.original.usina?.nome || '—' },
            { label: 'Localização', value: tooltip.event.original.usina?.localizacao || '—' },
            { label: 'Tipo', value: tooltip.event.original.tipo || '—' },
            { label: 'Responsável', value: tooltip.event.original.responsavel || '—' },
            { label: 'Status', value: tooltip.event.status || 'Agendada' },
          ]).map(({ label, value }) => (
            <div key={label} className="flex gap-1.5 text-[10px] leading-tight">
              <span className="text-slate-400 font-bold shrink-0">{label}:</span>
              <span className="text-slate-100 font-medium truncate">{value}</span>
            </div>
          ))}
          <p className="text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-700/50">
            Duplo clique → Gerar OS
          </p>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @media print {
          @page { size: landscape; margin: 0.4cm !important; }
          body { background-color: white !important; color: black !important; }
          .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-componente: EventChip ───────────────────────────────────────────────

interface EventChipProps {
  event: CalendarEvent;
  compact: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: (e: React.MouseEvent, event: CalendarEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

function EventChip({ event, compact, onDragStart, onDragEnd, onClick, onMouseEnter, onMouseMove, onMouseLeave }: EventChipProps) {
  const isFinished = event.status && /conclu/i.test(event.status);
  const o = event.original;

  if (compact) {
    return (
      <div
        className="relative"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        onMouseEnter={(e) => onMouseEnter(e, event)}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-grab active:cursor-grabbing hover:brightness-90 transition-all truncate shadow-sm flex items-center justify-between gap-1
          ${isFinished ? 'bg-slate-200 text-slate-500 line-through border border-slate-300' : `${event.color} text-white`}`}
        >
          <span className="truncate flex-1">{event.title}</span>
          {event.hasAttachments && <Paperclip className={`w-3 h-3 shrink-0 ${isFinished ? 'text-slate-400' : 'text-white/80'}`} />}
        </div>
      </div>
    );
  }

  // Versão semanal (expandida)
  return (
    <div
      className="relative"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={(e) => onMouseEnter(e, event)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className={`px-3 py-2.5 rounded-2xl text-xs font-bold cursor-grab active:cursor-grabbing hover:brightness-95 transition-all shadow-sm flex flex-col gap-1.5 border
        ${isFinished ? 'bg-slate-100 text-slate-500 line-through border border-slate-200' : `${event.color} text-white border-transparent`}`}
      >
        <div className="flex items-start justify-between gap-1 w-full">
          <span className="font-extrabold truncate flex-1 leading-tight">{event.title}</span>
          {event.hasAttachments && <Paperclip className={`w-3.5 h-3.5 shrink-0 ${isFinished ? 'text-slate-400' : 'text-white/80'}`} />}
        </div>
        <div className={`text-[9px] font-semibold flex items-center justify-between gap-1 opacity-90 ${isFinished ? 'text-slate-400' : 'text-white/85'}`}>
          <span className="truncate">
            {event.type === 'instalacao'
              ? (o.cidade || o.cidadeSheet || 'Instalação')
              : (o.usina?.localizacao || 'O&M')}
          </span>
          <span className="uppercase shrink-0 text-[8px] tracking-widest font-black bg-white/20 px-1 py-0.5 rounded-md">
            {event.type === 'instalacao' ? 'INST' : 'OM'}
          </span>
        </div>
      </div>
    </div>
  );
}
