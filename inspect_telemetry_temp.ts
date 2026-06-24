import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  const latest6 = await prisma.telemetria.findMany({
    orderBy: { timestamp: "desc" },
    take: 10
  });
  console.log("Últimas 10 telemetrias no banco:");
  latest6.forEach(t => {
    console.log(`ID: ${t.id}, UsinaId: ${t.usinaId}, Timestamp: ${t.timestamp.toISOString()}, Potencia: ${t.potenciaAtivaKW}`);
  });

  const timestampsCount = await prisma.$queryRaw`
    SELECT date_trunc('hour', timestamp) as hr, count(*)::int as cnt 
    FROM "Telemetria" 
    GROUP BY hr 
    ORDER BY hr DESC 
    LIMIT 20
  `;
  console.log("Contagem de telemetrias por hora:", timestampsCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
