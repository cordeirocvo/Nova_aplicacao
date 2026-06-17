import { prisma } from "@/lib/prisma";
import DashboardCharts from "./DashboardCharts";
import { CheckCircle, Clock, Zap, AlertTriangle } from "lucide-react";
import { 
  startOfWeek, endOfWeek, subWeeks, 
  startOfMonth, endOfMonth, parseISO, 
  isValid, parse, isWithinInterval 
} from 'date-fns';

export const metadata = {
  title: "Dashboard | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let total = 0, pendentes = 0, concluidas = 0, emAndamento = 0;
  let curWeekProg = 0, curWeekFin = 0;
  let prevWeekProg = 0, prevWeekFin = 0;
  let monthProg = 0, monthFin = 0;

  try {
    const activities = await prisma.planilhaInstalacao.findMany({
      select: {
        status: true,
        automaticoPrevInstala: true,
        dataPrevista: true,
        vencimentoParecer: true,
        createdAt: true
      }
    });

    total = activities.length;
    activities.forEach((a: any) => {
      if (a.status === "Pendente") pendentes++;
      else if (a.status === "Concluído") concluidas++;
      else if (a.status === "Em Andamento") emAndamento++;
    });

    const parseDate = (dateStr: any) => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) return dateStr;
      
      let d = parseISO(dateStr);
      if (isValid(d)) return d;

      d = parse(dateStr, 'dd/MM/yyyy', new Date());
      if (isValid(d)) return d;

      return null;
    };

    const now = new Date();

    // Semana Atual (de Domingo a Sábado)
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 0 });
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 0 });

    // Semana Anterior
    const startOfPrevWeek = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
    const endOfPrevWeek = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });

    // Mês Atual
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    activities.forEach((a: any) => {
      const dateStr = a.automaticoPrevInstala || a.dataPrevista || a.vencimentoParecer;
      const date = parseDate(dateStr);
      if (!date) return;

      const isFinished = a.status && /conclu/i.test(a.status);

      // Verificar Semana Atual
      if (isWithinInterval(date, { start: startOfCurrentWeek, end: endOfCurrentWeek })) {
        curWeekProg++;
        if (isFinished) curWeekFin++;
      }

      // Verificar Semana Anterior
      if (isWithinInterval(date, { start: startOfPrevWeek, end: endOfPrevWeek })) {
        prevWeekProg++;
        if (isFinished) prevWeekFin++;
      }

      // Verificar Mês Atual
      if (isWithinInterval(date, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
        monthProg++;
        if (isFinished) monthFin++;
      }
    });

  } catch (error) {
    console.error("Dashboard DB Error:", error);
  }

  const chartData = [
    { name: "Pendentes", value: pendentes },
    { name: "Em Andamento", value: emAndamento },
    { name: "Concluídas", value: concluidas },
  ];

  const curWeekData = [
    { name: "Programadas", value: curWeekProg },
    { name: "Finalizadas", value: curWeekFin },
  ];

  const prevWeekData = [
    { name: "Programadas", value: prevWeekProg },
    { name: "Finalizadas", value: prevWeekFin },
  ];

  const monthData = [
    { name: "Programadas", value: monthProg },
    { name: "Finalizadas", value: monthFin },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5]">
          Metas & Resumo Operacional
        </h1>
        <p className="text-slate-500">Acompanhe os indicadores de desempenho das instalações.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Atividades" value={total} icon={Zap} color="text-yellow-500" bg="bg-yellow-50" />
        <StatCard title="Pendentes" value={pendentes} icon={Clock} color="text-red-500" bg="bg-red-50" />
        <StatCard title="Em Andamento" value={emAndamento} icon={AlertTriangle} color="text-amber-500" bg="bg-amber-50" />
        <StatCard title="Concluídas" value={concluidas} icon={CheckCircle} color="text-green-500" bg="bg-green-50" />
      </div>

      {/* Gráficos das Semanas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between h-96">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Semana Atual</h3>
            <p className="text-xs text-slate-500 mb-4">Progresso de atividades agendadas para esta semana</p>
          </div>
          <div className="h-64">
            <DashboardCharts data={curWeekData} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between h-96">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Semana Anterior</h3>
            <p className="text-xs text-slate-500 mb-4">Resumo operacional consolidado da semana passada</p>
          </div>
          <div className="h-64">
            <DashboardCharts data={prevWeekData} />
          </div>
        </div>
      </div>

      {/* Gráficos do Mês e Consolidado Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between h-[28rem]">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Mês Atual</h3>
            <p className="text-xs text-slate-500 mb-4">Atividades agendadas e concluídas no mês corrente</p>
          </div>
          <div className="h-80">
            <DashboardCharts data={monthData} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between h-[28rem]">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Resumo Geral Histórico</h3>
            <p className="text-xs text-slate-500 mb-4">Distribuição geral de status de todas as atividades registradas</p>
          </div>
          <div className="h-80">
            <DashboardCharts data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: { title: string, value: number, icon: any, color: string, bg: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  );
}
