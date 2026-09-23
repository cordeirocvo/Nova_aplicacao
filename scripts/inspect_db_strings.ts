import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh';

  const sample = await prisma.telemetria.findMany({
    where: {
      usinaId: USINA_ID,
      timestamp: {
        gte: new Date('2026-04-01T00:00:00-03:00'),
        lte: new Date('2026-05-31T23:59:59-03:00'),
      },
    },
    take: 20,
    orderBy: { timestamp: 'desc' },
  });

  console.log(`Amostra de 20 registros:`);
  for (const s of sample) {
    const keys = s.dadosStrings && typeof s.dadosStrings === 'object' ? Object.keys(s.dadosStrings as object) : [];
    console.log(`TS: ${s.timestamp.toISOString()} | Pot: ${s.potenciaAtivaKW} kW | Strings: ${keys.length} keys`);
  }

  // Verificar quantos têm strings com chaves > 0
  const allInInterval = await prisma.telemetria.findMany({
    where: {
      usinaId: USINA_ID,
      timestamp: {
        gte: new Date('2026-04-01T00:00:00-03:00'),
        lte: new Date('2026-05-31T23:59:59-03:00'),
      },
    },
    select: { id: true, timestamp: true, dadosStrings: true },
  });

  let withNonEmptyStrings = 0;
  for (const t of allInInterval) {
    if (t.dadosStrings && typeof t.dadosStrings === 'object') {
      const k = Object.keys(t.dadosStrings as object);
      if (k.length > 0) withNonEmptyStrings++;
    }
  }

  console.log(`Total em Abr-Mai: ${allInInterval.length} telemetrias. Com dadosStrings não-vazio: ${withNonEmptyStrings}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
