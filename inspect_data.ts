import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  // Buscar todas as telemetrias do dia 18 de Junho (local) que ocorrem entre 22:00 e 05:00 da manhã
  // E que tenham potenciaAtivaKW > 0
  const startUTC = new Date("2026-06-18T00:00:00.000Z"); // cobre o dia inteiro
  const endUTC = new Date("2026-06-19T03:00:00.000Z");

  const teles = await prisma.telemetria.findMany({
    where: {
      timestamp: { gte: startUTC, lte: endUTC }
    },
    include: { usina: true },
    orderBy: { timestamp: "asc" }
  });

  console.log(`Total de registros de telemetria no período: ${teles.length}`);

  // Filtrar registros onde a hora local é entre 19:00 e 05:00 (noite/madrugada) e potencia > 0
  const nightTeles = teles.filter(t => {
    const localDate = new Date(new Date(t.timestamp).getTime() - 3 * 60 * 60 * 1000); // simplificação BRT
    const hour = localDate.getUTCHours();
    return (hour >= 18 || hour < 5) && t.potenciaAtivaKW > 0;
  });

  console.log(`\nRegistros com potência positiva à NOITE (Total: ${nightTeles.length}):`);
  nightTeles.forEach(t => {
    const localStr = new Date(t.timestamp).toLocaleString("pt-BR", {timeZone: "America/Sao_Paulo"});
    console.log(`Usina: ${t.usina.nome} | TS Local: ${localStr} | Potência: ${t.potenciaAtivaKW} kW | Energia: ${t.energiaAcumuladaKWh} kWh`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
