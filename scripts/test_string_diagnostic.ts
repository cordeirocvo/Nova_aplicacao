import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { StringDiagnosticService } from '../src/lib/services/stringDiagnosticService';

async function testDiagnosticEngine() {
  const dateStr = '2026-09-16';
  console.log(`=== TESTANDO MOTOR DE DIAGNÓSTICO DE STRINGS (Baseline: ${dateStr}) ===`);

  const usinas = await prisma.usina.findMany({
    where: { nome: { contains: 'Manga', mode: 'insensitive' } },
    include: { inversores: true },
  });

  for (const u of usinas) {
    console.log(`\n--------------------------------------------------------------`);
    console.log(`USINA: ${u.nome} (ID: ${u.id})`);

    const peakRecord = await prisma.telemetria.findFirst({
      where: {
        usinaId: u.id,
        timestamp: {
          gte: new Date(`${dateStr}T11:00:00-03:00`),
          lte: new Date(`${dateStr}T14:30:00-03:00`),
        },
        dadosStrings: { not: null },
      },
      orderBy: { potenciaAtivaKW: 'desc' },
    });

    if (!peakRecord) {
      console.log(`Nenhum registro com strings encontrado para ${u.nome}`);
      continue;
    }

    const diag = StringDiagnosticService.diagnosePlant(u.id, u.nome, peakRecord, u.inversores);

    console.log(`Timestamp do Pico: ${diag.timestamp} | Potência: ${peakRecord.potenciaAtivaKW} kW`);
    console.log(`KPIS:`);
    console.log(`  - Total de Strings: ${diag.kpis.totalStrings}`);
    console.log(`  - Strings Ligadas de Projeto: ${diag.kpis.totalLigadas}`);
    console.log(`  - Strings Vazias de Projeto:  ${diag.kpis.totalVazias}`);
    console.log(`  - Strings em Operação Normal: ${diag.kpis.totalNormais}`);
    console.log(`  - Falhas Críticas (Fusível):  ${diag.kpis.totalFusivelQueimado}`);
    console.log(`  - Subperformances / Desvios:  ${diag.kpis.totalSubperformance}`);
    console.log(`  - Taxa de Saúde da Usina:    ${diag.kpis.taxaSaudePct}%`);

    if (diag.alertasGerais.length > 0) {
      console.log(`\n  ALERTAS DETECTADOS (${diag.alertasGerais.length}):`);
      for (const al of diag.alertasGerais) {
        console.log(`    [${al.severidade}] Inv ${al.inversorSN} - MPPT ${al.mppt} (String ${al.stringNum}): ${al.mensagem}`);
        console.log(`      -> Ação Recomendada: ${al.recomendacao}`);
      }
    } else {
      console.log(`\n  ✓ NENHUM ALERTA: Usina operando com 100% de integridade!`);
    }
  }
}

testDiagnosticEngine().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
