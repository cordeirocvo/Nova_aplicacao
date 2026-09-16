import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // Manga Grande 1

  console.log('=== TESTANDO BUSCA DE TELEMETRIA NO DIA 07/09/2026 ===');

  const startDay = new Date('2026-09-07T00:00:00-03:00');
  const endDay = new Date('2026-09-07T23:59:59.999-03:00');

  const telemetriasDia = await prisma.telemetria.findMany({
    where: {
      usinaId: USINA_ID,
      timestamp: { gte: startDay, lte: endDay },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`Pontos encontrados para 07/09/2026: ${telemetriasDia.length}`);
  if (telemetriasDia.length > 0) {
    const p1 = telemetriasDia[0];
    const pMid = telemetriasDia[Math.floor(telemetriasDia.length / 2)];
    const pLast = telemetriasDia[telemetriasDia.length - 1];

    console.log(`  Primeiro ponto: ${p1.timestamp.toISOString()} | Potência: ${p1.potenciaAtivaKW} kW | Acum: ${p1.energiaAcumuladaKWh} kWh`);
    console.log(`  Pico Solar:     ${pMid.timestamp.toISOString()} | Potência: ${pMid.potenciaAtivaKW} kW | Acum: ${pMid.energiaAcumuladaKWh} kWh`);
    console.log(`  Último ponto:   ${pLast.timestamp.toISOString()} | Potência: ${pLast.potenciaAtivaKW} kW | Acum: ${pLast.energiaAcumuladaKWh} kWh`);
  }

  // Check 01/08/2026 (August)
  const startAug = new Date('2026-08-01T00:00:00-03:00');
  const endAug = new Date('2026-08-01T23:59:59.999-03:00');
  const telemetriasAug = await prisma.telemetria.findMany({
    where: {
      usinaId: USINA_ID,
      timestamp: { gte: startAug, lte: endAug },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`\nPontos encontrados para 01/08/2026: ${telemetriasAug.length}`);
  if (telemetriasAug.length > 0) {
    const pLastAug = telemetriasAug[telemetriasAug.length - 1];
    console.log(`  Energia final em 01/08/2026: ${pLastAug.energiaAcumuladaKWh} kWh`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
