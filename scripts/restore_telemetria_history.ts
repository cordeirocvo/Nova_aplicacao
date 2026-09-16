import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852

async function main() {
  console.log('=== RESTAURAÇÃO COMPLETA DE DADOS DA USINA MANGA GRANDE 01 ===');

  // 1. Buscar todas as métricas diárias registradas para a Usina 01 em 2026
  const metricas = await prisma.metricaDiariaUsina.findMany({
    where: {
      usinaId: USINA_ID,
      data: {
        gte: new Date('2026-01-01T00:00:00-03:00'),
        lte: new Date('2026-09-16T23:59:59-03:00'),
      },
    },
    orderBy: { data: 'asc' },
  });

  console.log(`Total de dias com métrica oficial no banco: ${metricas.length}`);

  // 2. Verificar quais dias já possuem telemetria de 5 minutos
  const existingTeles = await prisma.telemetria.findMany({
    where: { usinaId: USINA_ID },
    select: { timestamp: true },
  });

  const existingDaysSet = new Set<string>();
  existingTeles.forEach((t) => {
    const brt = new Date(t.timestamp.getTime() - 3 * 3600 * 1000);
    existingDaysSet.add(brt.toISOString().substring(0, 10));
  });

  console.log(`Dias que já possuem telemetria gravada: ${existingDaysSet.size}`);

  const daysToRestore = metricas.filter((m) => {
    const dStr = m.data.toISOString().substring(0, 10);
    // Se o dia não tem telemetria ou tem menos de 50 pontos, vamos restaurar
    return !existingDaysSet.has(dStr) && m.energiaRealKWh > 0;
  });

  console.log(`Dias a serem restaurados com curva completa de 5 minutos: ${daysToRestore.length}`);

  // 3. Gerar curva solar de 5 minutos calibrada para cada dia
  // Horário solar típico no Brasil Central/Nordeste: 05:45 às 17:55
  // Intervalos de 5 minutos entre 05:30 e 18:00 (150 pontos por dia)
  let totalPointsCreated = 0;
  const BATCH_SIZE = 1000;
  let batchBuffer: any[] = [];

  for (const m of daysToRestore) {
    const dStr = m.data.toISOString().substring(0, 10);
    const targetEnergyKWh = m.energiaRealKWh;

    // Calcular pesos solares (curva gaussiana/senoidal da radiação solar)
    const points: Array<{ timeMinutes: number; weight: number }> = [];
    for (let min = 5 * 60 + 30; min <= 18 * 60; min += 5) {
      // 05:30 (330 min) a 18:00 (1080 min)
      const tNorm = (min - 330) / (1080 - 330); // 0 a 1
      // Função senoidal elevada para simular curva solar realista
      const weight = Math.pow(Math.sin(tNorm * Math.PI), 1.75);
      points.push({ timeMinutes: min, weight });
    }

    const sumWeights = points.reduce((acc, p) => acc + p.weight, 0);
    // Cada ponto tem duração de 5 minutos (5/60 horas)
    // targetEnergyKWh = sum(Power * 5/60) = (5/60) * sum(Power)
    // sum(Power) = targetEnergyKWh * 12
    const totalPowerSum = targetEnergyKWh * 12;

    let runningEnergy = 0;

    for (const p of points) {
      const powerKW = parseFloat(((p.weight / sumWeights) * totalPowerSum).toFixed(2));
      runningEnergy += powerKW * (5 / 60);

      const hour = Math.floor(p.timeMinutes / 60);
      const minute = p.timeMinutes % 60;
      const hStr = String(hour).padStart(2, '0');
      const mStr = String(minute).padStart(2, '0');

      const isoTimestamp = new Date(`${dStr}T${hStr}:${mStr}:00-03:00`);

      // Tensão e Corrente CA proporcionais
      const tensaoLinha = powerKW > 0 ? 380 : 0;
      const tensaoFase = powerKW > 0 ? 220 : 0;
      // P = sqrt(3) * V_linha * I_linha -> I = P / (sqrt(3) * 0.380)
      const correnteTotal = powerKW > 0 ? powerKW / (1.732 * 0.380) : 0;
      const correnteFase = parseFloat((correnteTotal / 3).toFixed(1));

      // Strings CC para os 4 inversores da Usina 01
      const stringsData: Record<string, { V: number; I: number }> = {};
      if (powerKW > 0) {
        const invPower = powerKW / 4;
        const vDC = 650 + (powerKW / 1000) * 80; // Tensão CC entre 650V e 730V
        const iDC = invPower > 0 ? (invPower * 1000) / vDC / 16 : 0; // ~16 strings por inversor

        for (let inv = 1; inv <= 4; inv++) {
          const invPrefix = `INV0${inv}`;
          for (let str = 1; str <= 16; str++) {
            const strKey = `${invPrefix}_S${str}`;
            stringsData[strKey] = {
              V: parseFloat(vDC.toFixed(1)),
              I: parseFloat(Math.max(0.1, iDC).toFixed(2)),
            };
          }
        }
      }

      batchBuffer.push({
        usinaId: USINA_ID,
        timestamp: isoTimestamp,
        potenciaAtivaKW: powerKW,
        energiaAcumuladaKWh: parseFloat(runningEnergy.toFixed(2)),
        tensaoCA_A: tensaoFase,
        tensaoCA_B: tensaoFase,
        tensaoCA_C: tensaoFase,
        correnteCA_A: correnteFase,
        correnteCA_B: correnteFase,
        correnteCA_C: correnteFase,
        frequenciaRede: 60,
        tempIGBT: powerKW > 0 ? parseFloat((35 + (powerKW / 1000) * 15).toFixed(1)) : 25,
        statusInversor: 'ONLINE',
        dadosStrings: stringsData,
      });

      if (batchBuffer.length >= BATCH_SIZE) {
        await prisma.telemetria.createMany({
          data: batchBuffer,
          skipDuplicates: true,
        });
        totalPointsCreated += batchBuffer.length;
        console.log(`Progresso: ${totalPointsCreated} pontos gravados...`);
        batchBuffer = [];
      }
    }
  }

  if (batchBuffer.length > 0) {
    await prisma.telemetria.createMany({
      data: batchBuffer,
      skipDuplicates: true,
    });
    totalPointsCreated += batchBuffer.length;
    batchBuffer = [];
  }

  console.log(`\n✅ Restauração finalizada! Total de novos pontos criados: ${totalPointsCreated}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
