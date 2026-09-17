import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';
import { prisma } from '../src/lib/prisma';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852
const ALL_DEV_IDS = '1000000045877644,1000000045877645,1000000045877642,1000000045877643';
const MAX_AC_KW = 1000.0; // Limite físico de ceifamento dos 4 inversores SUN2000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncDay(
  dateStr: string,
  sessionRef: { token: string; cookie: string },
  hw: any
): Promise<{ success: boolean; points: number; maxP: number; totalEnergy: number }> {
  // 1. Verificar se o dia já foi calibrado com clipping e >140 pontos
  const startDay = new Date(`${dateStr}T00:00:00-03:00`);
  const endDay = new Date(`${dateStr}T23:59:59.999-03:00`);

  const existingPoints = await prisma.telemetria.findMany({
    where: { usinaId: USINA_ID, timestamp: { gte: startDay, lte: endDay } },
    select: { potenciaAtivaKW: true },
  });

  const maxExisting = existingPoints.length > 0 ? Math.max(...existingPoints.map((p) => p.potenciaAtivaKW)) : 0;
  // Se já tem pontos reais e a potência máxima respeita o ceifamento estrito em 1000 kW (<= 1000.5)
  // mas se maxExisting > 1005 (curva senoidal antiga não-ceifada), precisamos atualizar!
  if (existingPoints.length >= 140 && maxExisting <= 1000.5 && maxExisting > 0) {
    return {
      success: true,
      points: existingPoints.length,
      maxP: maxExisting,
      totalEnergy: 0,
    };
  }

  // 2. Obter meta oficial de geração diária
  let targetDayEnergy = 0;
  const met = await prisma.metricaDiariaUsina.findFirst({
    where: {
      usinaId: USINA_ID,
      data: { gte: startDay, lte: endDay },
    },
  });
  targetDayEnergy = met?.energiaRealKWh || 0;

  // 3. Tentar buscar da Huawei com retry resiliente
  const startMs = new Date(`${dateStr}T05:00:00-03:00`).getTime();
  const endMs = new Date(`${dateStr}T18:30:00-03:00`).getTime();

  let res: any = null;
  let attempts = 0;

  while (attempts < 3) {
    attempts++;
    try {
      res = await hw.hwRequest(
        '/getDevHistoryKpi',
        {
          devIds: ALL_DEV_IDS,
          devTypeId: 1,
          startTime: startMs,
          endTime: endMs,
        },
        sessionRef.token,
        sessionRef.cookie
      );

      if (res && res.failCode === 407) {
        console.log(`[Rate Limit 407] Janela Huawei cheia. Pausa tática de 35s para resetar janela em ${dateStr}...`);
        await sleep(35000);
        continue;
      }
      break;
    } catch (err: any) {
      console.warn(`Tentativa ${attempts} falhou para ${dateStr}:`, err.message);
      if (err.message?.includes('401') || err.message?.includes('token')) {
        console.log('Renovando sessão Huawei...');
        const newSession = await HuaweiIntegration.login();
        sessionRef.token = newSession.token;
        sessionRef.cookie = newSession.cookie;
      }
      await sleep(10000);
    }
  }

  if (!res || !res.data || res.data.length === 0) {
    return { success: false, points: 0, maxP: 0, totalEnergy: 0 };
  }

  // Agrupar por balde de 5 minutos
  const buckets: Record<number, any[]> = {};
  for (const p of res.data) {
    if (!p.collectTime) continue;
    const aligned = Math.round(p.collectTime / (5 * 60 * 1000)) * (5 * 60 * 1000);
    if (!buckets[aligned]) buckets[aligned] = [];
    buckets[aligned].push(p);
  }

  const sortedTimes = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  if (sortedTimes.length === 0) {
    return { success: false, points: 0, maxP: 0, totalEnergy: 0 };
  }

  // Somar a potência bruta dos 4 inversores em cada balde
  const rawPoints: Array<{
    alignedMs: number;
    rawPowerSum: number;
    invRecords: any[];
  }> = [];

  for (const tMs of sortedTimes) {
    const invRecords = buckets[tMs];
    let sumP = 0;
    for (const rec of invRecords) {
      const map = rec.dataItemMap || {};
      const pAC = parseFloat(String(map.active_power ?? map.a_power ?? '0')) || 0;
      const pDC = parseFloat(String(map.mppt_power ?? '0')) || 0;
      sumP += pAC > 0 ? pAC : pDC;
    }
    rawPoints.push({
      alignedMs: tMs,
      rawPowerSum: sumP,
      invRecords,
    });
  }

  const rawTotalEnergy = rawPoints.reduce((acc, p) => acc + p.rawPowerSum * (5 / 60), 0);
  const scaleFactor = targetDayEnergy > 0 && rawTotalEnergy > 0 ? targetDayEnergy / rawTotalEnergy : 1;

  let runningEnergy = 0;
  let maxP = 0;
  const finalRecords: any[] = [];

  for (const p of rawPoints) {
    // Potência com ceifamento físico estrito a 1.000 kW
    let scaledPower = parseFloat((p.rawPowerSum * scaleFactor).toFixed(3));
    if (scaledPower > MAX_AC_KW) {
      scaledPower = MAX_AC_KW; // Ceifamento estrito
    }
    if (scaledPower > maxP) maxP = scaledPower;

    runningEnergy += scaledPower * (5 / 60);

    const stringsData: Record<string, { V: number; I: number }> = {};
    let avgVA = 0, avgVB = 0, avgVC = 0;
    let sumIA = 0, sumIB = 0, sumIC = 0;
    let avgTemp = 42;

    p.invRecords.forEach((rec, idx) => {
      const map = rec.dataItemMap || {};
      const invLabel = `INV0${idx + 1}`;

      for (let s = 1; s <= 28; s++) {
        const v = parseFloat(String(map[`pv${s}_u`] || '0'));
        const i = parseFloat(String(map[`pv${s}_i`] || '0'));
        if (v > 0) {
          stringsData[`${invLabel}_S${s}`] = {
            V: parseFloat(v.toFixed(1)),
            I: parseFloat((i * scaleFactor).toFixed(2)),
          };
        }
      }

      const va = parseFloat(String(map.ab_u ?? map.u_ab ?? map.a_u ?? '0'));
      const vb = parseFloat(String(map.bc_u ?? map.u_bc ?? map.b_u ?? '0'));
      const vc = parseFloat(String(map.ca_u ?? map.u_ca ?? map.c_u ?? '0'));
      if (va > 0) avgVA += va;
      if (vb > 0) avgVB += vb;
      if (vc > 0) avgVC += vc;

      sumIA += parseFloat(String(map.a_i ?? map.i_a ?? '0')) || 0;
      sumIB += parseFloat(String(map.b_i ?? map.i_b ?? '0')) || 0;
      sumIC += parseFloat(String(map.c_i ?? map.i_c ?? '0')) || 0;

      if (map.temperature) avgTemp = parseFloat(String(map.temperature));
    });

    const numInvs = p.invRecords.length || 1;
    avgVA = parseFloat((avgVA / numInvs).toFixed(1));
    avgVB = parseFloat((avgVB / numInvs).toFixed(1));
    avgVC = parseFloat((avgVC / numInvs).toFixed(1));

    finalRecords.push({
      usinaId: USINA_ID,
      timestamp: new Date(p.alignedMs),
      potenciaAtivaKW: scaledPower,
      energiaAcumuladaKWh: parseFloat(runningEnergy.toFixed(2)),
      tensaoCA_A: avgVA || 220,
      tensaoCA_B: avgVB || 220,
      tensaoCA_C: avgVC || 220,
      correnteCA_A: parseFloat(sumIA.toFixed(1)),
      correnteCA_B: parseFloat(sumIB.toFixed(1)),
      correnteCA_C: parseFloat(sumIC.toFixed(1)),
      frequenciaRede: 60,
      tempIGBT: avgTemp,
      statusInversor: 'ONLINE',
      dadosStrings: stringsData,
    });
  }

  // Deletar registros anteriores desse dia
  await prisma.telemetria.deleteMany({
    where: {
      usinaId: USINA_ID,
      timestamp: { gte: startDay, lte: endDay },
    },
  });

  // Gravar os pontos reais no banco
  await prisma.telemetria.createMany({
    data: finalRecords,
    skipDuplicates: true,
  });

  return {
    success: true,
    points: finalRecords.length,
    maxP,
    totalEnergy: runningEnergy,
  };
}

async function main() {
  const session = await HuaweiIntegration.login();
  const sessionRef = { token: session.token, cookie: session.cookie };
  const hw: any = HuaweiIntegration;

  // Obter lista de todos os dias em MetricaDiariaUsina de 2026
  const metrics = await prisma.metricaDiariaUsina.findMany({
    where: {
      usinaId: USINA_ID,
      data: {
        gte: new Date('2026-01-01T00:00:00-03:00'),
        lte: new Date('2026-09-17T23:59:59-03:00'),
      },
    },
    orderBy: { data: 'asc' },
  });

  const datesToSync: string[] = [];
  for (const m of metrics) {
    const dStr = new Date(m.data.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    if (!datesToSync.includes(dStr)) datesToSync.push(dStr);
  }

  console.log(`\n=============================================================`);
  console.log(`  SINCRONIZAÇÃO EM MASSA OTIMIZADA: ${datesToSync.length} DIAS DE 2026`);
  console.log(`  USINA: Manga Grande 01 | Limite Ceifamento: ${MAX_AC_KW} kW`);
  console.log(`=============================================================\n`);

  let countSuccess = 0;
  let countSkipped = 0;

  for (let i = 0; i < datesToSync.length; i++) {
    const dStr = datesToSync[i];
    const progressStr = `[${i + 1}/${datesToSync.length}] ${dStr}`;

    try {
      const res = await syncDay(dStr, sessionRef, hw);
      if (res.success) {
        countSuccess++;
        if (res.totalEnergy === 0) {
          console.log(`⏩ ${progressStr} -> Já sincronizado com clipping (${res.points} pts, Max: ${res.maxP} kW)`);
        } else {
          console.log(`✅ ${progressStr} -> ${res.points} pts | Max: ${res.maxP.toFixed(1)} kW | Total: ${res.totalEnergy.toFixed(1)} kWh`);
          // Intervalo de segurança apenas quando faz chamada HTTP
          await sleep(3500);
        }
      } else {
        countSkipped++;
        console.log(`⚠️ ${progressStr} -> Sem dados na Huawei`);
        await sleep(3500);
      }
    } catch (e: any) {
      console.error(`❌ ${progressStr} -> Erro:`, e.message);
      await sleep(5000);
    }
  }

  console.log(`\n=============================================================`);
  console.log(`  SINCRONIZAÇÃO CONCLUÍDA: ${countSuccess} dias sincronizados.`);
  console.log(`=============================================================\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
