import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SettingsModal from "./SettingsModal";
import { calcDaysLate } from "@/lib/dateUtils";
import SyncButton from "./SyncButton";
import AtividadesClientView from "./AtividadesClientView";

export const metadata = {
  title: "Acompanhamento | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function AcompanhamentoPage() {
  const session: any = await getServerSession(authOptions as any);
  const isAdmin = session?.user?.role === "ADMIN";
  const isTV = session?.user?.role === "TV";
  const atividades = await prisma.planilhaInstalacao.findMany({
    where: {
      NOT: {
        OR: [
          { status: { contains: "Conclu", mode: "insensitive" } },
          { manualInstalacao: true, idInterno: { not: null } }
        ]
      }
    },
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
        
        {!isTV && isAdmin && (
          <div className="flex items-center gap-3">
            <SyncButton />
            <SettingsModal initialSettings={settings} />
          </div>
        )}
      </div>

      <AtividadesClientView 
        atividades={atividadesWithDays} 
        settings={settings} 
        isAdmin={isAdmin} 
        isTV={isTV} 
      />
    </div>
  );
}
