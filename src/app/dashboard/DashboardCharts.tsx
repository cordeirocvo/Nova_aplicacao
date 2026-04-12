"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export default function DashboardCharts({ data }: { data: any[] }) {
  if (data.every(d => d.value === 0)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
        <p>Nenhum dado suficiente para gráficos.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
        <Tooltip 
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
