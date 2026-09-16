import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // Manga Grande 1

  console.log('=== VERIFICANDO DATAS DISPONÍVEIS NO BANCO (MANGA GRANDE 1) ===');

  // 1. MetricaDiariaUsina
  const metricas = await prisma.metricaDiariaUsina.findMany({
    where: { usinaId: USINA_ID },
    orderBy: { data: 'asc' },
  });
  console.log(`Total de registros em MetricaDiariaUsina: ${metricas.length}`);
  metricas.forEach((m) => {
    const dStr = m.data.toISOString().substring(0, 10);
    console.log(`  Metrica: ${dStr} -> ${m.energiaRealKWh} kWh (PR: ${m.performanceRatioReal})`);
  });

  // 2. Distinct dates in Telemetria
  const teles = await prisma.telemetria.findMany({
    where: { usinaId: USINA_ID },
    select: { timestamp: true, potenciaAtivaKW: true, energiaAcumuladaKWh: true },
    orderBy: { timestamp: 'asc' },
  });
  console.log(`\nTotal de registros em Telemetria: ${teles.length}`);

  const dateCounts: Record<string, { count: number; maxE: number; integral: number }> = {};
  teles.forEach((t) => {
    const brt = new Date(t.timestamp.getTime() - 3 * 3600 * 1000);
    const dStr = brt.toISOString().substring(0, 10);
    if (!dateCounts[dStr]) {
      dateCounts[dStr] = { count: 0, maxE: 0, integral: 0 };
    }
    dateCounts[dStr].count++;
    dateCounts[dStr].maxE = Math.max(dateCounts[dStr].maxE, t.energiaAcumuladaKWh || 0);
    dateCounts[dStr].integral += (t.potenciaAtivaKW || 0) * (5 / 60);
  });

  console.log(`Total de datas distintas com telemetria: ${Object.keys(dateCounts).length}`);
  for (const [dStr, info] of Object.entries(dateCounts)) {
    console.log(`  Data ${dStr}: ${info.count} pontos | Max Acumulada: ${info.maxE.toFixed(2)} kWh | Integral 5m: ${info.integral.toFixed(2)} kWh`);
  }

  // 3. Check specifically 07/09/2026 across ALL usinas
  console.log('\n=== BUSCA POR 07/09/2026 EM TODAS AS USINAS ===');
  const allUsinas = await prisma.usina.findMany({
    select: { id: true, nome: true },
  });

  for (const u of allUsinas) {
    const teles07 = await prisma.telemetria.findMany({
      where: {
        usinaId: u.id,
        timestamp: {
          gte: new Date('2026-09-07T00:00:00-03:00'),
          lte: new Date('2026-09-07T23:59:59-03:00'),
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    const met07 = await prisma.metricaDiariaUsina.findFirst({
      where: {
        usinaId: u.id,
        data: {
          gte: new Date('2026-09-07T00:00:00-03:00'),
          lte: new Date('2026-09-07T23:59:59-03:00'),
        },
      },
    });

    console.log(`Usina: ${u.nome} (ID: ${u.id})`);
    console.log(`  Telemetrias em 07/09/2026: ${teles07.length}`);
    if (teles07.length > 0) {
      const maxE = Math.max(...teles07.map((t) => t.energiaAcumuladaKWh || 0));
      const integral = teles07.reduce((acc, t) => acc + (t.potenciaAtivaKW || 0) * (5 / 60), 0);
      console.log(`  Max Energia Acumulada: ${maxE.toFixed(2)} kWh | Integral: ${integral.toFixed(2)} kWh`);
    }
    if (met07) {
      console.log(`  Métrica diária (energiaRealKWh): ${met07.energiaRealKWh} kWh`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
