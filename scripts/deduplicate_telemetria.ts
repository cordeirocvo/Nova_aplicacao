import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function deduplicate() {
  console.log("Iniciando auditoria de duplicatas na tabela Telemetria...");

  const duplicates: any[] = await prisma.$queryRaw`
    SELECT "usinaId", "timestamp", COUNT(*)::int as qtd
    FROM "Telemetria"
    GROUP BY "usinaId", "timestamp"
    HAVING COUNT(*) > 1
  `;

  console.log(`Total de grupos duplicados encontrados: ${duplicates.length}`);

  let totalRemovidos = 0;

  for (const group of duplicates) {
    const records = await prisma.telemetria.findMany({
      where: {
        usinaId: group.usinaId,
        timestamp: new Date(group.timestamp)
      },
      orderBy: { id: "asc" }
    });

    if (records.length <= 1) continue;

    // Critério para eleger o melhor registro:
    // 1. Maior número de chaves em dadosStrings
    // 2. Maior potência ativa
    // 3. Maior energia acumulada
    let bestRecord = records[0];
    let bestScore = -1;

    for (const rec of records) {
      const stringsKeysCount = rec.dadosStrings && typeof rec.dadosStrings === 'object'
        ? Object.keys(rec.dadosStrings as object).length
        : 0;
      
      const score = (stringsKeysCount * 1000) + (rec.potenciaAtivaKW || 0) + (rec.energiaAcumuladaKWh || 0);

      if (score > bestScore) {
        bestScore = score;
        bestRecord = rec;
      }
    }

    // Identificar IDs a remover
    const idsToRemove = records.filter(r => r.id !== bestRecord.id).map(r => r.id);

    if (idsToRemove.length > 0) {
      await prisma.telemetria.deleteMany({
        where: {
          id: { in: idsToRemove }
        }
      });
      totalRemovidos += idsToRemove.length;
    }
  }

  console.log(`✓ Deduplicação concluída com sucesso! Total de registros redundantes removidos: ${totalRemovidos}`);
}

deduplicate()
  .catch((err) => {
    console.error("Erro na deduplicação:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
