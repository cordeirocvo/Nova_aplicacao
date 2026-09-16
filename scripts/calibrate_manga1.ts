import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

// Official hourly inverter yield targets from Plant Report_USINA MANGA GRANDE UFV 1 1852_11-09-2026.xlsx
const HOURLY_TARGETS: Record<number, number> = {
  5: 0.01,
  6: 60.26,
  7: 124.51,
  8: 588.0, // Gap in report, realistic intermediate level
  9: 897.69,
  10: 991.26,
  11: 993.84,
  12: 921.03,
  13: 772.30,
  14: 653.17,
  15: 491.54,
  16: 310.17,
  17: 80.77,
};

// Key points specified by user from Huawei screen
const FIXED_POINTS: Record<string, number> = {
  '11:00': 722.97,
  '12:35': 873.00,
  '13:20': 175.80,
};

async function main() {
  const usinaId = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852

  // Ensure 17:00 to 17:55 points exist
  // Decay curve for 17:00 (sunset decay from 220 kW down to 0 kW)
  const decayWeights = [0.22, 0.19, 0.16, 0.13, 0.10, 0.07, 0.05, 0.03, 0.02, 0.015, 0.01, 0.005];
  const sumWeights = decayWeights.reduce((a, b) => a + b, 0);

  for (let min = 0; min < 60; min += 5) {
    const minStr = String(min).padStart(2, '0');
    const localTimeStr = `2026-09-11T17:${minStr}:00-03:00`;
    const ts = new Date(localTimeStr);

    const existing = await prisma.telemetria.findFirst({
      where: { usinaId, timestamp: ts },
    });

    const weight = decayWeights[min / 5];
    // target is 80.77 kWh in 1 hour -> sum(P * 5/60) = 80.77
    // Total sum P = 80.77 * 12 = 969.24 kW across 12 intervals
    const power = (weight / sumWeights) * (80.77 * 12);

    if (!existing) {
      await prisma.telemetria.create({
        data: {
          usinaId,
          timestamp: ts,
          potenciaAtivaKW: parseFloat(power.toFixed(2)),
          energiaAcumuladaKWh: 0,
          tensaoCA_A: 220,
          tensaoCA_B: 220,
          tensaoCA_C: 220,
          correnteCA_A: 10,
          correnteCA_B: 10,
          correnteCA_C: 10,
          tempIGBT: 42,
          dadosStrings: {},
        },
      });
    } else {
      await prisma.telemetria.update({
        where: { id: existing.id },
        data: {
          potenciaAtivaKW: parseFloat(power.toFixed(2)),
        },
      });
    }
  }

  // Load all points for 11/09/2026
  const points = await prisma.telemetria.findMany({
    where: {
      usinaId,
      timestamp: {
        gte: new Date('2026-09-11T03:00:00Z'),
        lte: new Date('2026-09-11T23:59:59Z'),
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`Found ${points.length} points for Manga Grande 1 on 11/09/2026`);

  // Group by local hour
  const hourMap: Record<number, typeof points> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = [];

  points.forEach((p) => {
    const localHour = new Date(p.timestamp.getTime() - 3 * 3600 * 1000).getUTCHours();
    hourMap[localHour].push(p);
  });

  const calibratedUpdates: Array<{ id: string; power: number; timeStr: string }> = [];

  for (let h = 0; h < 24; h++) {
    const hPoints = hourMap[h];
    if (hPoints.length === 0) continue;

    const targetKWh = HOURLY_TARGETS[h];

    if (targetKWh === undefined || targetKWh === 0) {
      // Night hours: 0 kW
      hPoints.forEach((p) => {
        const timeStr = new Date(p.timestamp.getTime() - 3 * 3600 * 1000).toISOString().substring(11, 16);
        calibratedUpdates.push({ id: p.id, power: 0, timeStr });
      });
      continue;
    }

    // Check if any point in this hour is fixed
    const fixedInHour: Array<{ id: string; power: number; timeStr: string }> = [];
    const nonFixedInHour: Array<{ p: (typeof points)[0]; timeStr: string }> = [];

    hPoints.forEach((p) => {
      const timeStr = new Date(p.timestamp.getTime() - 3 * 3600 * 1000).toISOString().substring(11, 16);
      if (FIXED_POINTS[timeStr] !== undefined) {
        fixedInHour.push({ id: p.id, power: FIXED_POINTS[timeStr], timeStr });
      } else {
        nonFixedInHour.push({ p, timeStr });
      }
    });

    const fixedEnergyKWh = fixedInHour.reduce((acc, f) => acc + f.power * (5 / 60), 0);
    const remainingEnergyKWh = Math.max(0, targetKWh - fixedEnergyKWh);

    const nonFixedCurrentEnergy = nonFixedInHour.reduce((acc, nf) => acc + nf.p.potenciaAtivaKW * (5 / 60), 0);

    const scale = nonFixedCurrentEnergy > 0 ? remainingEnergyKWh / nonFixedCurrentEnergy : 1;

    fixedInHour.forEach((f) => {
      calibratedUpdates.push(f);
    });

    nonFixedInHour.forEach((nf) => {
      let scaledP = nf.p.potenciaAtivaKW * scale;
      scaledP = Math.max(0, Math.min(1050, scaledP));
      calibratedUpdates.push({ id: nf.p.id, power: scaledP, timeStr: nf.timeStr });
    });
  }

  // Sort updates by timestamp order
  const pointOrderMap = new Map(points.map((p, idx) => [p.id, idx]));
  calibratedUpdates.sort((a, b) => (pointOrderMap.get(a.id) || 0) - (pointOrderMap.get(b.id) || 0));

  // Compute running cumulative energy
  let runningEnergy = 0;
  const finalUpdates: Array<{ id: string; power: number; energy: number; timeStr: string }> = [];

  for (const u of calibratedUpdates) {
    runningEnergy += u.power * (5 / 60);
    finalUpdates.push({
      id: u.id,
      power: parseFloat(u.power.toFixed(2)),
      energy: parseFloat(runningEnergy.toFixed(2)),
      timeStr: u.timeStr,
    });
  }

  // Verify key times
  console.log('\n--- VERIFICATION OF KEY USER TIMES ---');
  for (const t of ['11:00', '12:35', '13:20']) {
    const item = finalUpdates.find((u) => u.timeStr === t);
    console.log(`Time ${t} -> Power: ${item?.power} kW (Target: ${FIXED_POINTS[t]} kW), Cumulative Energy: ${item?.energy} kWh`);
  }

  // Verify hourly sums
  console.log('\n--- VERIFICATION OF HOURLY ENERGY (kWh) ---');
  const hourlySum: Record<number, number> = {};
  finalUpdates.forEach((u) => {
    const h = parseInt(u.timeStr.substring(0, 2), 10);
    hourlySum[h] = (hourlySum[h] || 0) + u.power * (5 / 60);
  });

  for (let h = 5; h <= 18; h++) {
    const target = HOURLY_TARGETS[h] ?? 0;
    const actual = hourlySum[h] || 0;
    console.log(`Hour ${String(h).padStart(2, '0')}:00 -> Actual: ${actual.toFixed(2).padStart(8, ' ')} kWh | Target: ${target.toFixed(2).padStart(8, ' ')} kWh`);
  }

  console.log(`\nFinal Cumulative Daily Energy: ${runningEnergy.toFixed(2)} kWh (~${(runningEnergy / 1000).toFixed(2)} MWh)`);

  // Apply to database
  console.log('\nApplying updates to database...');
  for (const item of finalUpdates) {
    const origPoint = points.find((p) => p.id === item.id);
    if (!origPoint) continue;

    // Scale strings if present
    const origStrings = (origPoint.dadosStrings as Record<string, { V: number; I: number }>) || {};
    const scaleFactor = origPoint.potenciaAtivaKW > 0 ? item.power / origPoint.potenciaAtivaKW : 1;

    const newStrings: Record<string, { V: number; I: number }> = {};
    Object.entries(origStrings).forEach(([k, v]) => {
      newStrings[k] = {
        V: v.V,
        I: parseFloat((v.I * scaleFactor).toFixed(2)),
      };
    });

    await prisma.telemetria.update({
      where: { id: item.id },
      data: {
        potenciaAtivaKW: item.power,
        energiaAcumuladaKWh: item.energy,
        dadosStrings: Object.keys(newStrings).length > 0 ? newStrings : origPoint.dadosStrings,
      },
    });
  }

  console.log('Database updated successfully for all points on 11/09/2026!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
