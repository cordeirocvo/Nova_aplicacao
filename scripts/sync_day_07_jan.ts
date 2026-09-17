import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';
import { prisma } from '../src/lib/prisma';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852
const ALL_DEV_IDS = '1000000045877644,1000000045877645,1000000045877642,1000000045877643';

export async function syncSingleDayReal(dateStr: string, session: any, hw: any) {
  console.log(`\n======================================================`);
  console.log(`  SINCRONIZANDO LEITURAS REAIS DA HUAWEI: ${dateStr}`);
  console.log(`======================================================`);

  // 1. Obter meta oficial de geração diária da estação
  let targetDayEnergy = 0;
  const met = await prisma.metricaDiariaUsina.findFirst({
    where: {
      usinaId: USINA_ID,
      data: {
        gte: new Date(`${dateStr}T00:00:00-03:00`),
        lte: new Date(`${dateStr}T23:59:59-03:00`),
      },
    },
  });
  targetDayEnergy = met?.energiaRealKWh || 0;

  if (targetDayEnergy <= 0) {
    try {
      const dayStartBRT = new Date(`${dateStr}T00:00:00-03:00`).getTime();
      const dayKpiRes = await hw.hwRequest(
        '/getKpiStationDay',
        { stationCodes: 'NE=45877638', collectTime: dayStartBRT },
        session.token,
        session.cookie
      );
      if (dayKpiRes.data && Array.isArray(dayKpiRes.data)) {
        const item = dayKpiRes.data.find((d: any) => {
          const bStr = new Date(d.collectTime - 3 * 3600 * 1000).toISOString().substring(0, 10);
          return bStr === dateStr;
        });
        targetDayEnergy = item?.dataItemMap?.inverterYield ?? item?.dataItemMap?.inverter_power ?? 0;
      }
    } catch (e: any) {}
  }

  console.log(`Meta oficial para ${dateStr}: ${targetDayEnergy} kWh`);

  // 2. Buscar dados dos 4 inversores em UMA ÚNICA chamada
  const startMs = new Date(`${dateStr}T05:00:00-03:00`).getTime();
  const endMs = new Date(`${dateStr}T18:30:00-03:00`).getTime();

  const res = await hw.hwRequest(
    '/getDevHistoryKpi',
    {
      devIds: ALL_DEV_IDS,
      devTypeId: 1,
      startTime: startMs,
      endTime: endMs,
    },
    session.token,
    session.cookie
  );

  if (!res.data || res.data.length === 0) {
    console.log(`Sem dados retornados para ${dateStr}`);
    return;
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
  console.log(`Baldes de 5 min: ${sortedTimes.length}`);

  // Somar a potência bruta dos 4 inversores em cada balde
  const rawPoints: Array<{
    alignedMs: number;
    timeStr: string;
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
    const localTimeStr = new Date(tMs - 3 * 3600 * 1000).toISOString().substring(11, 16);
    rawPoints.push({
      alignedMs: tMs,
      timeStr: localTimeStr,
      rawPowerSum: sumP,
      invRecords,
    });
  }

  const rawTotalEnergy = rawPoints.reduce((acc, p) => acc + p.rawPowerSum * (5 / 60), 0);
  const scaleFactor = (targetDayEnergy > 0 && rawTotalEnergy > 0) ? targetDayEnergy / rawTotalEnergy : 1;
  console.log(`Energia bruta: ${rawTotalEnergy.toFixed(2)} kWh | Meta: ${targetDayEnergy} kWh | Fator: ${scaleFactor.toFixed(6)}`);

  let runningEnergy = 0;
  const finalRecords: any[] = [];

  for (const p of rawPoints) {
    const scaledPower = parseFloat((p.rawPowerSum * scaleFactor).toFixed(3));
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
  const startDayDelete = new Date(`${dateStr}T00:00:00-03:00`);
  const endDayDelete = new Date(`${dateStr}T23:59:59.999-03:00`);
  await prisma.telemetria.deleteMany({
    where: {
      usinaId: USINA_ID,
      timestamp: { gte: startDayDelete, lte: endDayDelete },
    },
  });

  // Gravar os pontos reais no banco
  await prisma.telemetria.createMany({
    data: finalRecords,
    skipDuplicates: true,
  });

  console.log(`✅ ${finalRecords.length} pontos REAIS da Huawei gravados no banco para ${dateStr}!`);
}

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;
  await syncSingleDayReal('2026-01-07', session, hw);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
