import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh';
  const start = new Date('2026-09-04T00:00:00-03:00');
  const end = new Date('2026-09-04T23:59:59.999-03:00');

  const teles = await prisma.telemetria.findMany({
    where: {
      usinaId: USINA_ID,
      timestamp: { gte: start, lte: end },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`Total de pontos em 04/09/2026 no banco: ${teles.length}`);

  // Simular o que o Extrator / Relatório Consolidado monta:
  const porHoraMap = new Map<string, number>();
  teles.forEach((t) => {
    const hora = new Date(t.timestamp).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    });
    porHoraMap.set(hora, t.potenciaAtivaKW);
  });

  console.log('\n--- AMOSTRA DA CURVA DO EXTRATOR EM 04/09/2026 ---');
  console.log('06:00 ->', porHoraMap.get('06:00') || 0, 'kW');
  console.log('08:00 ->', porHoraMap.get('08:00') || 0, 'kW');
  console.log('10:00 ->', porHoraMap.get('10:00') || 0, 'kW (início do platô de 1 MW)');
  console.log('11:00 ->', porHoraMap.get('11:00') || 0, 'kW');
  console.log('12:00 ->', porHoraMap.get('12:00') || 0, 'kW');
  console.log('13:00 ->', porHoraMap.get('13:00') || 0, 'kW');
  console.log('13:10 ->', porHoraMap.get('13:10') || 0, 'kW (queda 1)');
  console.log('13:35 ->', porHoraMap.get('13:35') || 0, 'kW (🎯 QUEDA EXATA DO USUÁRIO: 226,989 kW)');
  console.log('14:00 ->', porHoraMap.get('14:00') || 0, 'kW');
  console.log('14:30 ->', porHoraMap.get('14:30') || 0, 'kW (queda 2)');
  console.log('15:40 ->', porHoraMap.get('15:40') || 0, 'kW (queda 3)');
  console.log('16:15 ->', porHoraMap.get('16:15') || 0, 'kW (queda 4)');
  console.log('17:00 ->', porHoraMap.get('17:00') || 0, 'kW');
  console.log('18:00 ->', porHoraMap.get('18:00') || 0, 'kW');

  const maxPower = Math.max(...teles.map((t) => t.potenciaAtivaKW));
  const finalEnergy = teles[teles.length - 1]?.energiaAcumuladaKWh;
  console.log('\nPotência Máxima (Clipping):', maxPower, 'kW (~1.0 MW)');
  console.log('Energia Total no Dia:', finalEnergy, 'kWh (7,78 MWh)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
