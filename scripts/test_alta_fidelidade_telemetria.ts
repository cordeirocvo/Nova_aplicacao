import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { TelemetryIngestionService } from '../src/lib/services/telemetryIngestionService';

async function testAltaFidelidade() {
  console.log("=== TESTE DE TELEMETRIA DE ALTA FIDELIDADE ===");

  // 1. Localizar Manga Grande 01
  const manga1 = await prisma.usina.findFirst({
    where: { nome: { contains: "MANGA GRANDE UFV 1", mode: "insensitive" } },
    include: { inversores: true }
  });

  if (!manga1) {
    console.error("Usina Manga Grande 01 não encontrada!");
    return;
  }

  console.log(`Usina encontrada: ${manga1.nome} (ID: ${manga1.id}, Inversores: ${manga1.inversores.length})`);

  // 2. Testar Ingestion Service com múltiplos inversores
  const testTime = new Date("2026-05-16T12:35:18-03:00");
  const aligned = TelemetryIngestionService.alignTo5MinBucket(testTime);
  console.log(`Timestamp original: ${testTime.toISOString()} -> Balde Alinhado: ${aligned.toISOString()}`);

  const testPayload = {
    usinaId: manga1.id,
    timestamp: testTime,
    potenciaAtivaKW: 985.4,
    energiaAcumuladaKWh: 4520.8,
    dadosInversores: {
      "INV01": { potenciaKW: 198.2, energiaDiaKWh: 910.2, tempIGBT: 48.5, status: "ONLINE" },
      "INV02": { potenciaKW: 197.8, energiaDiaKWh: 905.1, tempIGBT: 47.9, status: "ONLINE" },
      "INV03": { potenciaKW: 196.5, energiaDiaKWh: 901.3, tempIGBT: 48.2, status: "ONLINE" },
      "INV04": { potenciaKW: 195.9, energiaDiaKWh: 899.4, tempIGBT: 48.0, status: "ONLINE" },
      "INV05": { potenciaKW: 197.0, energiaDiaKWh: 904.8, tempIGBT: 48.3, status: "ONLINE" }
    },
    dadosStrings: {
      "INV01_S1": { V: 685.2, I: 8.5 },
      "INV01_S2": { V: 684.0, I: 8.4 },
      "INV02_S1": { V: 683.5, I: 8.3 }
    }
  };

  const saved = await TelemetryIngestionService.ingestPlantTelemetry(testPayload);
  console.log(`✓ Telemetria inserida com sucesso (ID: ${saved.id}, Potência: ${saved.potenciaAtivaKW} kW, CC: ${saved.potenciaCC_TotalKW} kW)`);

  // 3. Testar upsert idempotente no mesmo balde de 5min (não deve duplicar!)
  const updatedPayload = {
    ...testPayload,
    potenciaAtivaKW: 988.0
  };
  const updated = await TelemetryIngestionService.ingestPlantTelemetry(updatedPayload);
  console.log(`✓ Upsert idempotente testado (ID: ${updated.id}, Nova Potência: ${updated.potenciaAtivaKW} kW)`);
  if (saved.id === updated.id) {
    console.log("✓ Garantia de ID único confirmada: nenhum registro duplicado criado!");
  } else {
    console.error("ERRO: IDs diferentes gerados para o mesmo balde de tempo!");
  }

  // 4. Verificar se existem registros no dia 16/05/2026
  const count16May = await prisma.telemetria.count({
    where: {
      usinaId: manga1.id,
      timestamp: {
        gte: new Date("2026-05-16T00:00:00-03:00"),
        lte: new Date("2026-05-16T23:59:59.999-03:00")
      }
    }
  });
  console.log(`Total de pontos de telemetria em 16/05/2026 para ${manga1.nome}: ${count16May} pontos.`);
}

testAltaFidelidade()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
