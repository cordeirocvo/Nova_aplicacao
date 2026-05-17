"use client";

import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Loader, CheckCircle, Plus, Zap, Hammer
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, parseISO, isValid, parse
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function CronogramaClient({ atividades, manutencoes }: any) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

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

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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

  // Transformar dados em eventos de calendário
  const events = [
    ...atividades.map((a: any) => ({
      id: `inst-${a.id}`,
      type: 'instalacao',
      title: a.instalacao || 'Sem nome',
      date: parseDate(a.automaticoPrevInstala || a.vencimentoParecer),
      original: a,
      color: a.prioridade ? 'bg-purple-600' : a.atividadeExtra ? 'bg-blue-800' : 'bg-blue-500',
      status: a.status
    })),
    ...manutencoes.map((m: any) => ({
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

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

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
        body: JSON.stringify({ ...novaForm, anexoFotos: [], anexoArquivos: [] }),
      });
      if (res.ok) {
        setNovaSuccess(true);
        setTimeout(() => {
          setNovaAtividade({ open: false, date: null });
          setNovaSuccess(false);
          // Recarrega a página para mostrar o novo evento
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
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-black text-slate-800 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
            Hoje
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
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
        <div className="flex items-center gap-2 ml-auto text-slate-300 font-medium normal-case tracking-normal">
          <span>Clique duplo no dia para nova atividade</span>
        </div>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50/30">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-3 border-r border-slate-100 last:border-0">{day}</div>
        ))}
      </div>

      {/* Grade dos dias */}
      <div className="grid grid-cols-7 auto-rows-[140px]">
        {calendarDays.map((day, idx) => {
          const dayEvents = events.filter(e => isSameDay(e.date as Date, day));
          const isSelectedMonth = isSameMonth(day, monthStart);
          const isTodayDay = isToday(day);

          return (
            <div 
              key={day.toString()} 
              onDoubleClick={() => handleDayDoubleClick(day)}
              className={`border-r border-b border-slate-100 p-2 transition-colors flex flex-col gap-1 group
                ${!isSelectedMonth ? 'bg-slate-50/50 opacity-40' : 'bg-white hover:bg-blue-50/30 cursor-pointer'}
                ${isTodayDay ? 'ring-2 ring-inset ring-blue-500/20' : ''}
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
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold text-white cursor-pointer hover:brightness-90 transition-all truncate shadow-sm ${event.color}`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
              <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
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
                  <p className="font-bold text-slate-700 truncate">{selectedEvent.original.instalacao || selectedEvent.original.usina?.localizacao || '-'}</p>
                </div>
              </div>

              {selectedEvent.type === 'instalacao' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Observações da Instalação</p>
                    <p className="text-sm text-slate-600 font-medium italic">"{selectedEvent.original.obsInstalacao || 'Sem observações.'}"</p>
                  </div>
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
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Descrição da Manutenção</p>
                    <p className="text-sm text-slate-600 font-medium italic">"{selectedEvent.original.descricao || 'Sem descrição.'}"</p>
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

      {/* Modal de Nova Atividade (double-click no dia) */}
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
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
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
                {/* Linha 1: Cliente + Solicitação */}
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

                {/* Linha 2: Cidade | Vendedor | Telefone */}
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

                {/* Linha 3: Status | Data Prevista */}
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

                {/* Observação */}
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

                {/* Botões */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNovaAtividade({ open: false, date: null })}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={novaLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#015299] text-white font-black rounded-xl hover:brightness-110 transition-all shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-70"
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
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
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
