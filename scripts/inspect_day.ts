import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const points = await prisma.telemetria.findMany({
    where: {
      usinaId: 'cmp8hqv4400h9wgv5c9f2tdbh',
      timestamp: {
        gte: new Date('2026-09-11T03:00:00Z'),
        lt: new Date('2026-09-12T03:00:00Z')
      }
    },
    orderBy: { timestamp: 'asc' }
  });

  console.log('Total points:', points.length);

  // Group by local hour (UTC-3)
  const hourly: Record<number, { sumP: number; count: number; minE: number; maxE: number; points: any[] }> = {};
  for (let h = 0; h < 24; h++) {
    hourly[h] = { sumP: 0, count: 0, minE: Infinity, maxE: -Infinity, points: [] };
  }

  for (const p of points) {
    const localHour = new Date(p.timestamp.getTime() - 3 * 3600 * 1000).getUTCHours();
    hourly[localHour].sumP += p.potenciaAtivaKW;
    hourly[localHour].count++;
    hourly[localHour].minE = Math.min(hourly[localHour].minE, p.energiaAcumuladaKWh);
    hourly[localHour].maxE = Math.max(hourly[localHour].maxE, p.energiaAcumuladaKWh);
    hourly[localHour].points.push(p);
  }

  console.log('Hour | Points | Avg Power (kW) | Energy approx (kWh) | Delta E (kWh)');
  for (let h = 0; h < 24; h++) {
    const item = hourly[h];
    if (item.count > 0) {
      const avgP = item.sumP / item.count;
      const approxE = (item.sumP * (5 / 60));
      const deltaE = item.maxE - item.minE;
      console.log(`${String(h).padStart(2, '0')}:00 | ${String(item.count).padStart(6, ' ')} | ${avgP.toFixed(2).padStart(14, ' ')} | ${approxE.toFixed(2).padStart(19, ' ')} | ${deltaE.toFixed(2).padStart(12, ' ')}`);
    }
  }

  // Total daily energy
  const totalIntegral = points.reduce((acc, p) => acc + p.potenciaAtivaKW * (5 / 60), 0);
  const minDayE = points[0]?.energiaAcumuladaKWh || 0;
  const maxDayE = points[points.length - 1]?.energiaAcumuladaKWh || 0;
  console.log(`\nTotal Daily Integral: ${totalIntegral.toFixed(2)} kWh`);
  console.log(`Delta Day Energy: ${(maxDayE - minDayE).toFixed(2)} kWh`);
  console.log(`Max Day Energy: ${maxDayE.toFixed(2)} kWh`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
