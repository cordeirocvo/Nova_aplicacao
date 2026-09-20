import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { HuaweiSyncService } from '../src/lib/services/huaweiSyncService';
import { SolisSyncService } from '../src/lib/services/solisSyncService';

async function main() {
  console.log("===============================================================");
  console.log("  SINCRONIZAÇÃO COMPLETA: HUAWEI & SOLIS (17/09 A 20/09/2026)  ");
  console.log("===============================================================\n");

  console.log("1. Executando Sincronização Huawei...");
  try {
    await HuaweiSyncService.syncAll();
    console.log("-> Sincronização Huawei finalizada com sucesso!");
  } catch (err) {
    console.error("-> Erro na sincronização Huawei:", err);
  }

  console.log("\n2. Executando Sincronização Solis...");
  try {
    await SolisSyncService.syncAll();
    console.log("-> Sincronização Solis finalizada com sucesso!");
  } catch (err) {
    console.error("-> Erro na sincronização Solis:", err);
  }

  console.log("\n===============================================================");
  console.log("  RELATÓRIO DE VALIDAÇÃO: TELEMETRIAS E MÉTRICAS POR USINA     ");
  console.log("===============================================================\n");

  const usinas = await prisma.usina.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, apiFornecedor: true, capacidadeKWp: true }
  });

  const dates = ['2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'];

  for (const dt of dates) {
    console.log(`\n------------------ DATA: ${dt} ------------------`);
    const dayStart = new Date(`${dt}T00:00:00-03:00`);
    const dayEnd = new Date(`${dt}T23:59:59.999-03:00`);

    for (const u of usinas) {
      const telCount = await prisma.telemetria.count({
        where: { usinaId: u.id, timestamp: { gte: dayStart, lte: dayEnd } }
      });

      const maxE = await prisma.telemetria.findFirst({
        where: { usinaId: u.id, timestamp: { gte: dayStart, lte: dayEnd } },
        orderBy: { energiaAcumuladaKWh: 'desc' },
        select: { energiaAcumuladaKWh: true, potenciaAtivaKW: true }
      });

      const metrica = await prisma.metricaDiariaUsina.findFirst({
        where: { usinaId: u.id, data: { gte: dayStart, lte: dayEnd } }
      });

      const metStr = metrica 
        ? `${metrica.energiaRealKWh.toFixed(1)} kWh (PR: ${metrica.performanceRatioReal})`
        : 'SEM MÉTRICA';

      console.log(`[${u.apiFornecedor}] ${u.nome.padEnd(38)} | Teles: ${String(telCount).padStart(3)} | Max E: ${(maxE?.energiaAcumuladaKWh || 0).toFixed(1).padStart(7)} kWh | Métrica: ${metStr}`);
    }
  }

  console.log("\nProcesso de sincronização e validação concluído!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
