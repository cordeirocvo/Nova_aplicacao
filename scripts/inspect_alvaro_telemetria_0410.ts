import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const usinaId = 'cmtuluuvg008cl4v5tlqt0wib'; // Álvaro Palhares
  const dateStr = '2026-10-04';

  const startDay = new Date(`${dateStr}T00:00:00-03:00`);
  const endDay = new Date(`${dateStr}T23:59:59.999-03:00`);

  const tels = await prisma.telemetria.findMany({
    where: {
      usinaId,
      timestamp: { gte: startDay, lte: endDay },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`Telemetrias de Álvaro Palhares para ${dateStr}:`, tels.length);
  if (tels.length > 0) {
    console.log('Primeiro registro:', tels[0].timestamp.toISOString(), '| Potência:', tels[0].potenciaAtivaKW, 'kW');
    console.log('Último registro:', tels[tels.length - 1].timestamp.toISOString(), '| Potência:', tels[tels.length - 1].potenciaAtivaKW, 'kW');
    
    // Potências ao longo do dia
    console.log('\nAmostra horária:');
    for (let i = 0; i < tels.length; i += 6) {
      const t = tels[i];
      const hora = t.timestamp.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      console.log(`  ${hora} | Pot: ${t.potenciaAtivaKW.toFixed(1)} kW | E_dia: ${t.energiaDiaKWh?.toFixed(1)} kWh | Irrad: ${t.irradianciaPOA ?? 'null'}`);
    }
  }
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
