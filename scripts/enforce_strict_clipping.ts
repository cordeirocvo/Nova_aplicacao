import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh';

async function enforceClipping() {
  console.log('Iniciando verificação de ceifamento físico (1.000 kW)...');

  const countOver = await prisma.telemetria.count({
    where: {
      usinaId: USINA_ID,
      potenciaAtivaKW: { gt: 1000.0 },
    },
  });

  console.log(`Total de pontos acima de 1.000 kW encontrados: ${countOver}`);

  if (countOver > 0) {
    const updated = await prisma.telemetria.updateMany({
      where: {
        usinaId: USINA_ID,
        potenciaAtivaKW: { gt: 1000.0 },
      },
      data: {
        potenciaAtivaKW: 1000.0,
      },
    });

    console.log(`✅ Ceifamento estrito aplicado a ${updated.count} pontos no banco!`);
  } else {
    console.log('✅ Nenhum ponto viola o ceifamento físico de 1.000 kW.');
  }
}

enforceClipping()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
