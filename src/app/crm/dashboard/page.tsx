"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, LayoutDashboard, TrendingUp, Users, Zap, Sun, Car, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#00BFA5", "#1E3A8A", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function CRMDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/leads");
      const leads = await res.json();
      
      // Process metrics
      const total = leads.length;
      const porTipo = [
        { name: "Desconto", value: leads.filter((l: any) => l.tipo === "DESCONTO_CONTA").length },
        { name: "Usina Solar", value: leads.filter((l: any) => l.tipo === "USINA_SOLAR").length },
        { name: "Recarga VE", value: leads.filter((l: any) => l.tipo === "PONTO_RECARGA").length },
      ].filter(v => v.value > 0);

      const porVendedor = Object.entries(
        leads.reduce((acc: any, l: any) => {
          const nome = l.vendedor?.name || "Desconhecido";
          acc[nome] = (acc[nome] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }));

      setData({ total, porTipo, porVendedor });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader className="w-10 h-10 animate-spin text-[#1E3A8A]" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push("/crm")}
          className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-[#1E3A8A] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#00BFA5]" /> Dashboard Comercial
          </h1>
          <p className="text-sm text-slate-500 font-medium">Análise de desempenho e modalidades de leads.</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total de Leads" value={data.total} icon={<Users className="w-5 h-5" />} color="bg-blue-500" />
        <MetricCard title="Desconto Conta" value={data.porTipo.find((t: any) => t.name === "Desconto")?.value || 0} icon={<Zap className="w-5 h-5" />} color="bg-emerald-500" />
        <MetricCard title="Usina Solar" value={data.porTipo.find((t: any) => t.name === "Usina Solar")?.value || 0} icon={<Sun className="w-5 h-5" />} color="bg-blue-800" />
        <MetricCard title="Recarga VE" value={data.porTipo.find((t: any) => t.name === "Recarga VE")?.value || 0} icon={<Car className="w-5 h-5" />} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Modalidade Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Leads por Modalidade</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.porTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.porTipo.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {data.porTipo.map((t: any, i: number) => (
              <div key={t.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{t.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendedores Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Ranking de Vendedores</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.porVendedor}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#1E3A8A" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{title}</span>
        <span className="text-2xl font-black text-[#1E3A8A] leading-tight">{value}</span>
      </div>
    </div>
  );
}
