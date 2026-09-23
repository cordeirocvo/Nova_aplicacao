import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh';

async function main() {
  const tele = await prisma.telemetria.findFirst({
    where: {
      usinaId: USINA_ID,
      timestamp: {
        gte: new Date('2026-04-15T14:00:00.000Z'),
        lte: new Date('2026-04-15T16:00:00.000Z'),
      },
      potenciaAtivaKW: { gt: 100 },
    },
  });

  if (!tele) {
    console.log('Nenhuma telemetria encontrada em 15/04');
    return;
  }

  console.log('Telemetria encontrada em:', tele.timestamp.toISOString());
  console.log('Potencia:', tele.potenciaAtivaKW, 'kW');
  console.log('Tipo de dadosStrings:', typeof tele.dadosStrings);
  const ds = tele.dadosStrings as any;
  console.log('Primeiras 10 chaves e valores:', Object.entries(ds).slice(0, 10));

  // Vamos escanear 5 dias em abril e 5 dias em maio para ver o que tem
  const sampleDays = ['2026-04-05', '2026-04-15', '2026-04-25', '2026-05-05', '2026-05-15', '2026-05-25'];
  for (const d of sampleDays) {
    const t = await prisma.telemetria.findFirst({
      where: {
        usinaId: USINA_ID,
        timestamp: {
          gte: new Date(`${d}T15:00:00.000Z`), // 12:00 BRT
          lte: new Date(`${d}T15:30:00.000Z`),
        },
      },
    });
    if (t) {
      const keys = t.dadosStrings ? Object.keys(t.dadosStrings as object) : [];
      console.log(`Dia ${d} 12:00 BRT: pot = ${t.potenciaAtivaKW} kW, strings = ${keys.length}`);
      if (keys.length > 0) {
        const entries = Object.entries(t.dadosStrings as any);
        const zeroCur = entries.filter(([k, v]: any) => v.I === 0 || v.I < 0.2);
        console.log(`  Strings com I < 0.2: ${zeroCur.length}`, zeroCur.map(([k, v]: any) => `${k}: V=${v.V}, I=${v.I}`).slice(0, 8));
      }
    } else {
      console.log(`Dia ${d} 12:00 BRT: NENHUMA telemetria encontrada`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
