import { prisma } from "@/lib/prisma";
import DashboardCharts from "./DashboardCharts";
import { CheckCircle, Clock, Zap, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Dashboard | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let total = 0, pendentes = 0, concluidas = 0, emAndamento = 0;

  try {
    const [counts, totalCount] = await Promise.all([
      prisma.planilhaInstalacao.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.planilhaInstalacao.count()
    ]);

    total = totalCount;
    counts.forEach((c: any) => {
      if (c.status === "Pendente") pendentes = c._count.id;
      if (c.status === "Concluído") concluidas = c._count.id;
      if (c.status === "Em Andamento") emAndamento = c._count.id;
    });
  } catch (error) {
    console.error("Dashboard DB Error:", error);
  }

  const chartData = [
    { name: "Pendentes", value: pendentes },
    { name: "Em Andamento", value: emAndamento },
    { name: "Concluídas", value: concluidas },
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-96 mt-6">
        <DashboardCharts data={chartData} />
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
