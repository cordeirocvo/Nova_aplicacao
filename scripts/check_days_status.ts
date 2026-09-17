import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function checkDays() {
  const usinaId = 'cmp8hqv4400h9wgv5c9f2tdbh';
  const metrics = await prisma.metricaDiariaUsina.findMany({
    where: { usinaId },
    orderBy: { data: 'asc' },
    select: { data: true, energiaRealKWh: true },
  });

  console.log(`Total metricas diarias cadastradas: ${metrics.length}`);
  if (metrics.length > 0) {
    console.log(`Primeiro dia: ${metrics[0].data.toISOString().slice(0, 10)} (${metrics[0].energiaRealKWh} kWh)`);
    console.log(`Ultimo dia: ${metrics[metrics.length - 1].data.toISOString().slice(0, 10)} (${metrics[metrics.length - 1].energiaRealKWh} kWh)`);
  }

  // Verificar quantos dias tem telemetria
  const distinctDays = await prisma.$queryRaw<Array<{ dia: string; total_pontos: bigint; max_potencia: number }>>`
    SELECT 
      TO_CHAR("timestamp" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as dia,
      COUNT(*) as total_pontos,
      MAX("potenciaAtivaKW") as max_potencia
    FROM "Telemetria"
    WHERE "usinaId" = ${usinaId}
    GROUP BY dia
    ORDER BY dia ASC
  `;

  console.log(`\nDias com telemetria gravada: ${distinctDays.length}`);
  console.log(`Amostra dos 5 primeiros dias:`, distinctDays.slice(0, 5).map(d => ({
    dia: d.dia,
    pontos: Number(d.total_pontos),
    maxP: d.max_potencia
  })));
  console.log(`Amostra dos 5 ultimos dias:`, distinctDays.slice(-5).map(d => ({
    dia: d.dia,
    pontos: Number(d.total_pontos),
    maxP: d.max_potencia
  })));

  // Verificar dias com maxP > 1005 (onde a curva teorica senoidal ultrapassou 1000 kW sem clipping)
  const clippingViolations = distinctDays.filter(d => d.max_potencia > 1005);
  console.log(`\nDias com curva teórica não-ceifada (> 1005 kW): ${clippingViolations.length}`);
  if (clippingViolations.length > 0) {
    console.log(`Exemplos de dias com curva teórica não-ceifada:`, clippingViolations.slice(0, 10).map(d => `${d.dia} (${d.max_potencia} kW)`));
  }
}

checkDays()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
