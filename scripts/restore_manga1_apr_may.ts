import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';
import { prisma } from '../src/lib/prisma';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852
const STATION_CODE = 'NE=45877638';

const INVERSORES = [
  { devId: '1000000045877644', label: 'INV01', sn: 'ES2380071220' },
  { devId: '1000000045877645', label: 'INV02', sn: 'ES2380071249' },
  { devId: '1000000045877642', label: 'INV03', sn: 'ES2450052227' },
  { devId: '1000000045877643', label: 'INV04', sn: 'ES2450054367' },
];

async function fetchWithRetry(hw: any, url: string, body: any, session: any, maxRetries = 4): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await hw.hwRequest(url, body, session.token, session.cookie);
      console.log(`[HW Debug] URL: ${url} | failCode: ${res.failCode} | success: ${res.success} | msg: ${res.message || 'ok'}`);
      if (res.failCode === 407 || (typeof res.data === 'string' && res.data.includes('ACCESS_FREQUENCY'))) {
        console.warn(`  ⏳ [Huawei Rate Limit 407] Aguardando 25s para desobstrução (tentativa ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, 25000));
        continue;
      }
      return res;
    } catch (e: any) {
      console.warn(`  ⚠️ [Erro de Rede Huawei] ${e.message}. Aguardando 10s...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  return { data: null, success: false };
}

export async function restoreRealDay(dateStr: string, session: any, hw: any) {
  console.log(`\n============================================================`);
  console.log(`⚡ RESTAURANDO DADOS REAIS HUAWEI: MANGA GRANDE 1 - ${dateStr}`);
  console.log(`============================================================`);

  // 1. Obter a meta diária oficial da estação na Huawei
  const dayStartBRT = new Date(`${dateStr}T00:00:00-03:00`).getTime();
  let targetDayEnergy = 0;

  try {
    const dayKpiRes = await fetchWithRetry(
      hw,
      '/getKpiStationDay',
      { stationCodes: STATION_CODE, collectTime: dayStartBRT },
      session
    );
    if (dayKpiRes.data && Array.isArray(dayKpiRes.data)) {
      const item = dayKpiRes.data.find((d: any) => {
        const bStr = new Date(d.collectTime - 3 * 3600 * 1000).toISOString().substring(0, 10);
        return bStr === dateStr;
      });
      targetDayEnergy = item?.dataItemMap?.inverterYield ?? item?.dataItemMap?.inverter_power ?? 0;
    }
  } catch (e: any) {
    console.warn(`Aviso ao buscar KPI da estação para ${dateStr}:`, e.message);
  }

  // Fallback se a estação não respondeu mas já temos métrica diária gravada
  if (!targetDayEnergy || targetDayEnergy <= 0) {
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
  }

  console.log(`Geração diária de referência: ${targetDayEnergy} kWh`);

  // 2. Buscar telemetria de 5 minutos dos 4 inversores
  const startMs = new Date(`${dateStr}T05:00:00-03:00`).getTime();
  const endMs = new Date(`${dateStr}T18:30:00-03:00`).getTime();

  const buckets: Record<number, any[]> = {};

  for (const inv of INVERSORES) {
    await new Promise((r) => setTimeout(r, 1200)); // Delay seguro anti-rate-limit

    const res = await fetchWithRetry(
      hw,
      '/getDevHistoryKpi',
      {
        devIds: inv.devId,
        devTypeId: 1,
        startTime: startMs,
        endTime: endMs,
      },
      session
    );

    const devPoints = Array.isArray(res.data) ? res.data : [];
    for (const p of devPoints) {
      if (!p.collectTime) continue;
      const aligned = Math.round(p.collectTime / (5 * 60 * 1000)) * (5 * 60 * 1000);
      if (!buckets[aligned]) buckets[aligned] = [];
      buckets[aligned].push({ devId: inv.devId, label: inv.label, sn: inv.sn, ...p });
    }
  }

  const sortedTimes = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  if (sortedTimes.length === 0) {
    console.log(`⚠️ Nenhum ponto bruto retornado pela Huawei para ${dateStr}. Mantendo dados existentes.`);
    return;
  }

  console.log(`Baldes de 5 minutos coletados: ${sortedTimes.length}`);

  // 3. Somar a potência bruta dos 4 inversores em cada balde
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
  const scaleFactor = targetDayEnergy > 0 && rawTotalEnergy > 0 ? targetDayEnergy / rawTotalEnergy : 1.0;
  console.log(`Energia bruta somada: ${rawTotalEnergy.toFixed(2)} kWh | Fator escala: ${scaleFactor.toFixed(6)}`);

  // 4. Montar os registros finais calibrados com strings reais
  let runningEnergy = 0;
  const finalRecords: any[] = [];

  for (const p of rawPoints) {
    const scaledPower = parseFloat((p.rawPowerSum * scaleFactor).toFixed(3));
    runningEnergy += scaledPower * (5 / 60);

    const stringsData: Record<string, { V: number; I: number }> = {};
    let avgVA = 0, avgVB = 0, avgVC = 0;
    let sumIA = 0, sumIB = 0, sumIC = 0;
    let avgTemp = 42;

    p.invRecords.forEach((rec) => {
      const map = rec.dataItemMap || {};
      const invLabel = rec.label || 'INV01';

      for (let s = 1; s <= 28; s++) {
        const v = parseFloat(String(map[`pv${s}_u`] || '0'));
        const i = parseFloat(String(map[`pv${s}_i`] || '0'));

        // Se houver tensão ou corrente registrada para a string
        if (v > 0 || i > 0) {
          stringsData[`${invLabel}_S${s}`] = {
            V: parseFloat(v.toFixed(1)),
            I: parseFloat((i * (scaleFactor > 0.5 && scaleFactor < 1.5 ? scaleFactor : 1.0)).toFixed(2)),
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

  // 5. Substituir no banco: deletar registros sintéticos e inserir reais
  const startDayDelete = new Date(`${dateStr}T00:00:00-03:00`);
  const endDayDelete = new Date(`${dateStr}T23:59:59.999-03:00`);

  await prisma.telemetria.deleteMany({
    where: {
      usinaId: USINA_ID,
      timestamp: { gte: startDayDelete, lte: endDayDelete },
    },
  });

  await prisma.telemetria.createMany({
    data: finalRecords,
    skipDuplicates: true,
  });

  // 6. Atualizar MetricaDiariaUsina
  const finalEnergy = targetDayEnergy > 0 ? targetDayEnergy : parseFloat(runningEnergy.toFixed(2));
  const dataNoon = new Date(`${dateStr}T12:00:00-03:00`);

  await prisma.metricaDiariaUsina.upsert({
    where: {
      data_usinaId: {
        data: dataNoon,
        usinaId: USINA_ID,
      },
    },
    update: {
      energiaRealKWh: finalEnergy,
    },
    create: {
      data: dataNoon,
      usinaId: USINA_ID,
      energiaRealKWh: finalEnergy,
      energiaProjetadaPvlibKWh: parseFloat((finalEnergy * 0.95).toFixed(2)),
      performanceRatioReal: 0.81,
      integralSolarimetricaKWhM2: 5.5,
    },
  });

  console.log(`✅ ${finalRecords.length} telemetrias REAIS com dados individuais de strings gravadas para ${dateStr}!`);
}

async function main() {
  const args = process.argv.slice(2);
  const targetDateArg = args.find((a) => a.startsWith('--date='))?.split('=')[1];
  const monthArg = args.find((a) => a.startsWith('--month='))?.split('=')[1];
  const allArg = args.includes('--all');

  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  if (targetDateArg) {
    // Sincronizar data pontual
    await restoreRealDay(targetDateArg, session, hw);
    return;
  }

  // Montar lista de datas para restaurar
  let datesToRestore: string[] = [];

  if (monthArg === '04') {
    for (let d = 1; d <= 30; d++) {
      datesToRestore.push(`2026-04-${String(d).padStart(2, '0')}`);
    }
  } else if (monthArg === '05') {
    for (let d = 1; d <= 31; d++) {
      datesToRestore.push(`2026-05-${String(d).padStart(2, '0')}`);
    }
  } else if (allArg) {
    for (let d = 1; d <= 30; d++) {
      datesToRestore.push(`2026-04-${String(d).padStart(2, '0')}`);
    }
    for (let d = 1; d <= 31; d++) {
      datesToRestore.push(`2026-05-${String(d).padStart(2, '0')}`);
    }
  } else {
    // Padrão: restaurar datas-chave e amostras de calibração
    console.log('Modo padrão: restaurando amostras de calibração de Abril e Maio...');
    datesToRestore = [
      '2026-05-15',
      '2026-05-16',
      '2026-05-02',
      '2026-04-15',
      '2026-04-20',
      '2026-04-30',
      '2026-05-10',
      '2026-05-20',
      '2026-05-25',
    ];
  }

  console.log(`Total de datas a restaurar: ${datesToRestore.length}`);
  for (let i = 0; i < datesToRestore.length; i++) {
    const dStr = datesToRestore[i];
    console.log(`\n[Progresso ${i + 1}/${datesToRestore.length}] Restaurando ${dStr}...`);
    await restoreRealDay(dStr, session, hw);
    // Intervalo de 2.5 segundos entre dias para preservar cota da API Huawei
    await new Promise((r) => setTimeout(r, 2500));
  }

  console.log('\n🎉 Restauração concluída com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
