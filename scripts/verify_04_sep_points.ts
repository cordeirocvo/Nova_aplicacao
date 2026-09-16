import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const points = await prisma.telemetria.findMany({
    where: {
      usinaId: 'cmp8hqv4400h9wgv5c9f2tdbh',
      timestamp: {
        gte: new Date('2026-09-04T00:00:00-03:00'),
        lte: new Date('2026-09-04T23:59:59-03:00'),
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`Total de pontos em 04/09/2026: ${points.length}`);

  const p1335 = points.find((p) => {
    const t = new Date(p.timestamp.getTime() - 3 * 3600 * 1000).toISOString().substring(11, 16);
    return t === '13:35';
  });

  console.log('\n🎯 Ponto das 13:35h no banco:');
  console.log('  Timestamp:', p1335?.timestamp.toISOString());
  console.log('  Potência ativa (kW):', p1335?.potenciaAtivaKW, '(Alvo usuário: 226,989 kW)');
  console.log('  Energia acumulada (kWh):', p1335?.energiaAcumuladaKWh);

  console.log('\nPontos ao redor do meio-dia e início da tarde (10:00 às 14:00):');
  points
    .filter((p) => {
      const h = new Date(p.timestamp.getTime() - 3 * 3600 * 1000).getHours();
      return h >= 10 && h <= 14;
    })
    .forEach((p) => {
      const t = new Date(p.timestamp.getTime() - 3 * 3600 * 1000).toISOString().substring(11, 16);
      console.log(`  ${t} -> ${p.potenciaAtivaKW} kW`);
    });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
