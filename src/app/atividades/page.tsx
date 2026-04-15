import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import Link from "next/link";
import { Edit2, ShieldAlert } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { calcDaysLate } from "@/lib/dateUtils";
import { TagToggler } from "./TagToggler";

export const metadata = {
  title: "Acompanhamento | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function AcompanhamentoPage() {
  const session: any = await getServerSession(authOptions as any);
  const isAdmin = session?.user?.role === "ADMIN";
  const isTV = session?.user?.role === "TV";

  const atividades = await prisma.planilhaInstalacao.findMany({
    orderBy: { createdAt: "desc" },
  });

  const settingsRaw = await prisma.systemSettings.findUnique({ where: { id: "default" } });
  const settings = settingsRaw || { limiteVerde: 40, limiteAmarelo: 20, limiteParecer: 30 };

  // Phase 1: Mapear e calcular dias de atraso dinamicamente
  const atividadesWithDays = atividades.map(atv => {
    const daysPrev = calcDaysLate(atv.automaticoPrevInstala);
    const daysParecer = calcDaysLate(atv.vencimentoParecer);
    return { ...atv, daysPrev, daysParecer };
  });

  // Phase 2: Ordenador avançado
  atividadesWithDays.sort((a, b) => {
    // Top Priority: Atividade Priorizada
    if (a.prioridade && !b.prioridade) return -1;
    if (!a.prioridade && b.prioridade) return 1;

    // Second Priority: Atividade Extra
    if (a.atividadeExtra && !b.atividadeExtra) return -1;
    if (!a.atividadeExtra && b.atividadeExtra) return 1;

    // Normal Urgent Checks
    const aUrgent = a.daysParecer !== null && a.daysParecer < settings.limiteParecer;
    const bUrgent = b.daysParecer !== null && b.daysParecer < settings.limiteParecer;

    // Regra 1: Alerta Máximo primeiro
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;

    // Regra 2: Do mais atrasado para o menos atrasado (Valores mais negativos / menores primeiro)
    if (a.daysPrev !== null && b.daysPrev !== null) return a.daysPrev - b.daysPrev;
    if (a.daysPrev !== null) return -1;
    if (b.daysPrev !== null) return 1;

    return 0; // Se tudo falhar, mantém a ordem cronológica
  });

  return (
    <div className="space-y-4">
      {/* Search/Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5]">
            Acompanhamento de Atividades
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Monitoramento em tempo real • Cordeiro Energia</p>
        </div>
        
        {!isTV && isAdmin && <SettingsModal initialSettings={settings} />}
      </div>

      {/* Table Desktop / TV View */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-[13px] text-left table-fixed">
          <thead className="text-[11px] text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="w-1/4 px-3 py-3 font-bold tracking-wider">Cliente / Instalação</th>
              <th className="w-[100px] px-3 py-3 font-bold tracking-wider">Atraso</th>
              <th className="px-3 py-3 font-bold tracking-wider">Observações</th>
              <th className="w-[120px] px-3 py-3 font-bold tracking-wider">Venc. Parecer</th>
              <th className="w-[120px] px-3 py-3 font-bold tracking-wider">Prev. Instala</th>
              <th className="w-[110px] px-3 py-3 font-bold tracking-wider">Status</th>
              {!isTV && <th className="w-[80px] px-3 py-3 font-bold tracking-wider text-right">Ação</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {atividadesWithDays.map((atv) => {
              const isUrgentParecer = atv.daysParecer !== null && atv.daysParecer < settings.limiteParecer;
              
              let bgColorCss = "hover:bg-slate-50/50 transition-colors";
              let diaPrevRender = "-";
              
              if (atv.daysPrev !== null) {
                 if (atv.daysPrev >= settings.limiteVerde) {
                    bgColorCss = "bg-green-50/60 hover:bg-green-100/50 text-green-900";
                 } else if (atv.daysPrev >= settings.limiteAmarelo) {
                    bgColorCss = "bg-yellow-50/60 hover:bg-yellow-100/50 text-yellow-900";
                 } else {
                    bgColorCss = "bg-red-50/60 hover:bg-red-100/50 text-red-900";
                 }
                 diaPrevRender = `${atv.daysPrev} dias`;
              }

              if (isUrgentParecer) {
                 bgColorCss = "animate-pulse bg-red-600 hover:bg-red-500 text-white font-medium shadow-md z-10";
              }

              const fontColor = isUrgentParecer ? "text-red-50" : "text-slate-600";

              return (
                <tr key={atv.id} className={bgColorCss}>
                  <td className="px-3 py-3 font-bold leading-tight break-words">
                    {isUrgentParecer && <ShieldAlert className="inline-block w-4 h-4 mr-1 mb-0.5 text-red-200" />}
                    <span className="text-sm">{atv.instalacao || "N/A"}</span>
                    <TagToggler id={atv.id} prioridade={atv.prioridade} atividadeExtra={atv.atividadeExtra} isAdmin={!!isAdmin} />
                  </td>
                  <td className="px-3 py-3 font-black text-xs">
                    {diaPrevRender}
                  </td>
                  <td className={`px-3 py-3 text-[12px] leading-tight line-clamp-2 ${fontColor}`} title={atv.obsInstalacao || ""}>
                    {atv.obsInstalacao || "-"}
                  </td>
                  <td className={`px-3 py-3 font-medium whitespace-nowrap ${fontColor}`}>
                    {atv.vencimentoParecer || "-"}
                  </td>
                  <td className={`px-3 py-3 font-medium whitespace-nowrap ${fontColor}`}>
                    {atv.automaticoPrevInstala || "-"}
                  </td>
                  <td className="px-3 py-3">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter ${isUrgentParecer ? 'bg-white/20 text-white' : 'bg-[#0A192F]/5 text-[#0A192F]'}`}>
                        {atv.status || "Pendente"}
                     </span>
                  </td>
                  {!isTV && (
                    <td className="px-3 py-3 text-right">
                      {isAdmin ? (
                        <Link 
                          href={`/atividades/editar/${atv.id}`}
                          className={`inline-flex items-center p-1.5 rounded-lg transition-all ${isUrgentParecer ? 'bg-white text-red-700 hover:bg-white/90' : 'text-[#00BFA5] hover:bg-[#00BFA5]/10'}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="text-[10px] opacity-50">Admin Only</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (and Tablet/Laptop) */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {atividadesWithDays.map((atv) => {
          const isUrgentParecer = atv.daysParecer !== null && atv.daysParecer < settings.limiteParecer;
          let urgencyColor = "border-slate-100 bg-white";
          
          if (atv.daysPrev !== null) {
             if (atv.daysPrev >= settings.limiteVerde) urgencyColor = "border-green-200 bg-green-50";
             else if (atv.daysPrev >= settings.limiteAmarelo) urgencyColor = "border-yellow-200 bg-yellow-50";
             else urgencyColor = "border-red-200 bg-red-50";
          }
          if (isUrgentParecer) urgencyColor = "bg-red-600 border-red-800 text-white";

          return (
            <div key={atv.id} className={`p-4 rounded-xl border-2 shadow-sm relative ${urgencyColor}`}>
              {isUrgentParecer && <ShieldAlert className="absolute top-2 right-2 w-5 h-5 text-white animate-bounce" />}
              <div className="flex justify-between items-start mb-2">
                <div className="w-2/3">
                  <h3 className="font-bold text-lg leading-tight">{atv.instalacao}</h3>
                  <TagToggler id={atv.id} prioridade={atv.prioridade} atividadeExtra={atv.atividadeExtra} isAdmin={!!isAdmin} />
                </div>
                <span className="text-xs font-black px-2 py-1 bg-black/5 rounded uppercase tracking-widest">{atv.status || "Pendente"}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 border-t border-black/5 pt-3">
                <div>
                  <p className="text-[10px] opacity-70 uppercase font-bold">Venc. Parecer</p>
                  <p className="font-semibold">{atv.vencimentoParecer || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] opacity-70 uppercase font-bold">Prev. Instala</p>
                  <p className="font-semibold">{atv.automaticoPrevInstala || "-"}</p>
                </div>
                <div className="col-span-2">
                   <p className="text-[10px] opacity-70 uppercase font-bold">Atraso Semáforo</p>
                   <p className="font-black text-[#1E3A8A]">{atv.daysPrev !== null ? `${atv.daysPrev} dias` : "-"}</p>
                </div>
              </div>

              {!isTV && isAdmin && (
                <Link 
                  href={`/atividades/editar/${atv.id}`}
                  className="mt-4 w-full flex items-center justify-center py-2 bg-[#00BFA5] text-white rounded-lg font-bold text-sm shadow-md"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Editar Atividade
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {atividadesWithDays.length === 0 && (
         <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium italic">Nenhuma atividade registrada no sistema.</p>
         </div>
      )}
    </div>
  );
}
