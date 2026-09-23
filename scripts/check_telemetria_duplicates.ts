import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const dups: any[] = await prisma.$queryRaw`
    SELECT "usinaId", "timestamp", COUNT(*)::int as c 
    FROM "Telemetria" 
    GROUP BY "usinaId", "timestamp" 
    HAVING COUNT(*) > 1 
    LIMIT 10
  `;

  console.log(`Duplicatas encontradas em Telemetria: ${dups.length}`);
  for (const d of dups) {
    console.log(`- Usina: ${d.usinaId} | Timestamp: ${d.timestamp} | Contagem: ${d.c}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
