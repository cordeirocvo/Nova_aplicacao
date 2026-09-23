import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function checkDate() {
  const dateStr = '2026-09-16';
  console.log(`Checking data for date: ${dateStr}`);

  const usinas = await prisma.usina.findMany({
    where: {
      nome: { contains: 'Manga', mode: 'insensitive' }
    },
    include: {
      inversores: true
    }
  });

  console.log(`Found ${usinas.length} Manga Grande usinas:`);
  for (const u of usinas) {
    console.log(`\n======================================================`);
    console.log(`Usina: "${u.nome}" (ID: ${u.id}, Cap: ${u.capacidadeKWp} kWp, Inversores: ${u.inversores.length})`);
    for (const inv of u.inversores) {
      console.log(`    Inv: ${inv.modelo} | SN: ${inv.numeroSerie}`);
    }

    // Check telemetria records on 2026-09-16
    const count = await prisma.telemetria.count({
      where: {
        usinaId: u.id,
        timestamp: {
          gte: new Date(`${dateStr}T00:00:00-03:00`),
          lte: new Date(`${dateStr}T23:59:59-03:00`)
        }
      }
    });

    console.log(`    Telemetria points on ${dateStr}: ${count}`);

    if (count > 0) {
      const sample = await prisma.telemetria.findFirst({
        where: {
          usinaId: u.id,
          timestamp: {
            gte: new Date(`${dateStr}T11:00:00-03:00`),
            lte: new Date(`${dateStr}T13:00:00-03:00`)
          }
        },
        orderBy: { potenciaAtivaKW: 'desc' }
      });
      if (sample) {
        console.log(`    Sample point at ${sample.timestamp.toISOString()}: Potencia=${sample.potenciaAtivaKW} kW`);
        if (sample.dadosStrings) {
          const sObj = sample.dadosStrings as any;
          console.log(`    dadosStrings keys (${Object.keys(sObj).length}):`, Object.keys(sObj).slice(0, 5));
          const firstKey = Object.keys(sObj)[0];
          console.log(`    dadosStrings[${firstKey}]:`, JSON.stringify(sObj[firstKey]));
        } else {
          console.log(`    dadosStrings is null or empty`);
        }
        if (sample.dadosInversores) {
          const invObj = sample.dadosInversores as any;
          console.log(`    dadosInversores keys (${Object.keys(invObj).length}):`, Object.keys(invObj));
          const firstKey = Object.keys(invObj)[0];
          console.log(`    dadosInversores[${firstKey}]:`, JSON.stringify(invObj[firstKey]));
        }
      }
    }
  }
}

checkDate().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
