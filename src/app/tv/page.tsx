import { prisma } from "@/lib/prisma";
import { calcDaysLate } from "@/lib/dateUtils";
import AtividadesClientView from "@/app/atividades/AtividadesClientView";

export const metadata = {
  title: "NOC TV • Cordeiro Energia",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DedicatedTvPage() {
  const CONCLUDED_KEYWORDS = ["concluí", "conclui", "finaliz", "execut"];

  const [atividadesRaw, settingsRaw] = await Promise.all([
    prisma.planilhaInstalacao.findMany({
      where: {
        AND: [
          {
            AND: CONCLUDED_KEYWORDS.map((kw) => ({
              NOT: { status: { contains: kw, mode: "insensitive" as const } },
            })),
          },
          {
            NOT: {
              AND: [
                { manualInstalacao: true },
                { idInterno: { not: null } },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        idInterno: true,
        instalacao: true,
        obsInstalacao: true,
        vencimentoParecer: true,
        automaticoPrevInstala: true,
        dataPrevista: true,
        status: true,
        prioridade: true,
        atividadeExtra: true,
        vendedor: true,
        cidade: true,
        anexoFotos: true,
        anexoArquivos: true,
        historico: true,
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.systemSettings.findUnique({ where: { id: "default" } }),
  ]);

  const settings = settingsRaw || { limiteVerde: 40, limiteAmarelo: 20, limiteParecer: 30 };

  const atividadesWithDays = atividadesRaw
    .map((atv) => {
      const daysPrev = calcDaysLate(atv.dataPrevista || atv.automaticoPrevInstala);
      const daysParecer = calcDaysLate(atv.vencimentoParecer);
      return { ...atv, daysPrev, daysParecer };
    })
    .filter((atv) => {
      if (atv.daysPrev !== null && atv.daysPrev <= -208) {
        return false;
      }
      return true;
    });

  atividadesWithDays.sort((a, b) => {
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

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background-color: #0A192F !important;
              color: #FFFFFF !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }
          `,
        }}
      />
      <div 
        data-tv="true"
        id="tv-container"
        style={{ 
          backgroundColor: "#0A192F", 
          minHeight: "100vh", 
          maxHeight: "100vh", 
          width: "100vw", 
          overflow: "hidden" 
        }}
      >
        <AtividadesClientView
          atividades={atividadesWithDays}
          settings={settings}
          isAdmin={false}
          isTV={true}
        />
      </div>
    </>
  );
}
