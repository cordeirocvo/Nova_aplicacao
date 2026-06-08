import { prisma } from "@/lib/prisma";
import { calcDaysLate } from "@/lib/dateUtils";
import GronnerTestView from "./GronnerTestView";

export const metadata = {
  title: "Integração Gronner | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function TesteGronerPage() {
  if (!prisma) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Erro: Cliente Prisma não inicializado.
      </div>
    );
  }

  const allRecords = await prisma.planilhaInstalacao.findMany({
    where: {
      NOT: {
        OR: [
          { status: { contains: "Conclu", mode: "insensitive" } },
          { status: { contains: "Finaliz", mode: "insensitive" } },
          { status: { contains: "Execut", mode: "insensitive" } },
        ]
      }
    },
    orderBy: { createdAt: "desc" },
  });

  const settingsRaw = await prisma.systemSettings.findUnique({ where: { id: "default" } });
  const settings = settingsRaw || { limiteVerde: 40, limiteAmarelo: 20, limiteParecer: 30 };

  // Helper to calculate days and sort records
  const processRecords = (records: any[]) => {
    const withDays = records
      .map(atv => {
        const daysPrev = calcDaysLate(atv.automaticoPrevInstala);
        const daysParecer = calcDaysLate(atv.vencimentoParecer);
        return { ...atv, daysPrev, daysParecer };
      })
      .filter(atv => {
        // Clientes com mais de 208 dias de atraso (ex: -208 a -1663) são considerados concluídos/finalizados
        if (atv.daysPrev !== null && atv.daysPrev <= -208) {
          return false;
        }
        return true;
      });

    withDays.sort((a, b) => {
      if (a.prioridade && !b.prioridade) return -1;
      if (!a.prioridade && b.prioridade) return 1;
      if (a.atividadeExtra && !b.atividadeExtra) return -1;
      if (!a.atividadeExtra && b.atividadeExtra) return 1;

      const aUrgent = a.daysParecer !== null && a.daysParecer <= settings.limiteParecer;
      const bUrgent = b.daysParecer !== null && b.daysParecer <= settings.limiteParecer;

      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      if (a.daysPrev !== null && b.daysPrev !== null) return a.daysPrev - b.daysPrev;
      if (a.daysPrev !== null) return -1;
      if (b.daysPrev !== null) return 1;

      return 0;
    });

    return withDays;
  };

  // Filter records based on their source (determined by idInterno prefix)
  const rawGoogle = allRecords.filter(
    (r) => !r.idInterno || !r.idInterno.startsWith("GRONNER-")
  );
  const rawGronner = allRecords.filter(
    (r) => r.idInterno && r.idInterno.startsWith("GRONNER-")
  );

  const googleRecords = processRecords(rawGoogle);
  const gronnerRecords = processRecords(rawGronner);

  return (
    <GronnerTestView
      initialGoogleRecords={googleRecords}
      initialGronnerRecords={gronnerRecords}
      settings={settings}
    />
  );
}
