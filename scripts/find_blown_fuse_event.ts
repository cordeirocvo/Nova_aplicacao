import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh';

async function main() {
  console.log('Analisando strings da Usina Manga Grande 1 entre 01/04/2026 e 31/05/2026...');

  // Vamos pegar dias representativos (ex: a cada 2 ou 3 dias, ou todos os dias ao meio-dia)
  const days: string[] = [];
  const start = new Date('2026-04-01T12:00:00-03:00');
  const end = new Date('2026-05-31T12:00:00-03:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().substring(0, 10));
  }

  console.log(`Verificando ${days.length} dias ao meio-dia (11:30 - 12:30 BRT)...`);

  // Rastrear histórico por string: stringName -> { datesWithZeroI: string[], datesWithNormalI: string[], sampleV: number }
  const stringStats: Record<
    string,
    {
      datesZero: string[];
      datesNormal: string[];
      sampleV: number;
      sampleI: number;
    }
  > = {};

  for (const dateStr of days) {
    const noonStart = new Date(`${dateStr}T11:45:00-03:00`);
    const noonEnd = new Date(`${dateStr}T12:15:00-03:00`);

    const teles = await prisma.telemetria.findMany({
      where: {
        usinaId: USINA_ID,
        timestamp: { gte: noonStart, lte: noonEnd },
        potenciaAtivaKW: { gt: 300 }, // Usina operando em alta potência
      },
      orderBy: { potenciaAtivaKW: 'desc' },
      take: 1,
    });

    if (teles.length === 0 || !teles[0].dadosStrings) continue;

    const t = teles[0];
    const strings = t.dadosStrings as Record<string, { V: number; I: number }>;

    for (const [key, val] of Object.entries(strings)) {
      if (!stringStats[key]) {
        stringStats[key] = { datesZero: [], datesNormal: [], sampleV: val.V, sampleI: val.I };
      }

      // Se tensão >= 350V
      if (val.V >= 350) {
        if (val.I < 0.2) {
          stringStats[key].datesZero.push(dateStr);
        } else if (val.I >= 4.0) {
          stringStats[key].datesNormal.push(dateStr);
        }
      }
    }
  }

  console.log('\n=== RESULTADO DA ANÁLISE DE STRINGS (01/04 a 31/05/2026) ===');
  const candidates: any[] = [];

  for (const [strKey, stat] of Object.entries(stringStats)) {
    // Um fusível queimado tem dias com corrente zero COM TENSÃO ALTA,
    // especialmente se ele funcionava antes e parou, ou parou e depois voltou a funcionar (consertado)!
    if (stat.datesZero.length > 0) {
      candidates.push({
        string: strKey,
        totalDiasZeroI: stat.datesZero.length,
        totalDiasNormalI: stat.datesNormal.length,
        primeiroDiaZero: stat.datesZero[0],
        ultimoDiaZero: stat.datesZero[stat.datesZero.length - 1],
        primeiroDiaNormal: stat.datesNormal[0] || 'NENHUM',
        ultimoDiaNormal: stat.datesNormal[stat.datesNormal.length - 1] || 'NENHUM',
      });
    }
  }

  // Ordenar por relevância (dias com zero)
  candidates.sort((a, b) => b.totalDiasZeroI - a.totalDiasZeroI);

  console.table(candidates);

  // Detalhar se alguma string mudou de status (estava normal -> queimou -> foi consertada)
  console.log('\nStrings com comportamento de FALHA TRANSITÓRIA / FUSÍVEL QUEIMADO (queimou ou foi consertada):');
  const transitorias = candidates.filter((c) => c.totalDiasZeroI > 0 && c.totalDiasNormalI > 0);
  console.table(transitorias);
}

main().catch(console.error).finally(() => prisma.$disconnect());
