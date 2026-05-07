"use client";

import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Clock, Info, CheckCircle2, AlertTriangle, 
  Settings, Zap, Hammer
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

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Função para parsear datas em formatos variados
  const parseDate = (dateStr: any) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    // Tenta ISO
    let d = parseISO(dateStr);
    if (isValid(d)) return d;

    // Tenta DD/MM/YYYY
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
      color: 'bg-[#F25C27]', // Laranja Cordeiro
      status: m.status
    }))
  ].filter(e => e.date !== null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

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
      </div>

      {/* Grade do Calendário */}
      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50/30">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-3 border-r border-slate-100 last:border-0">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[140px]">
        {calendarDays.map((day, idx) => {
          const dayEvents = events.filter(e => isSameDay(e.date as Date, day));
          const isSelectedMonth = isSameMonth(day, monthStart);
          const isTodayDay = isToday(day);

          return (
            <div 
              key={day.toString()} 
              className={`border-r border-b border-slate-100 p-2 transition-colors flex flex-col gap-1
                ${!isSelectedMonth ? 'bg-slate-50/50 opacity-40' : 'bg-white'}
                ${isTodayDay ? 'ring-2 ring-inset ring-blue-500/20' : ''}
              `}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-black ${isTodayDay ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
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

      {/* Modal de Detalhes */}
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
