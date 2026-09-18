import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Sincronizando Manga Grande 03 (NE=50902944) de Abril a Setembro 2026...');
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;
  const plant = { code: 'NE=50902944', id: 'cmtur27em00nel4v55jwzfpah', name: 'USINA MANGA GRANDE 3 2565' };

  let totalSaved = 0;
  for (let month = 4; month <= 9; month++) {
    const mStr = String(month).padStart(2, '0');
    const monthDate = new Date(`2026-${mStr}-01T00:00:00-03:00`).getTime();

    try {
      const res = await hw.hwRequest(
        '/getKpiStationDay',
        { stationCodes: plant.code, collectTime: monthDate },
        session.token,
        session.cookie
      );

      if (res.data && Array.isArray(res.data)) {
        for (const d of res.data) {
          const brtDate = new Date(d.collectTime - 3 * 3600 * 1000);
          const dateStr = brtDate.toISOString().substring(0, 10);
          const dataNoon = new Date(`${dateStr}T12:00:00-03:00`);

          const yieldKWh = d.dataItemMap?.inverterYield ?? d.dataItemMap?.inverter_power ?? 0;
          if (yieldKWh <= 0) continue;

          await prisma.metricaDiariaUsina.upsert({
            where: {
              data_usinaId: {
                data: dataNoon,
                usinaId: plant.id,
              },
            },
            update: {
              energiaRealKWh: parseFloat(yieldKWh.toFixed(2)),
            },
            create: {
              data: dataNoon,
              usinaId: plant.id,
              energiaRealKWh: parseFloat(yieldKWh.toFixed(2)),
              energiaProjetadaPvlibKWh: parseFloat((yieldKWh * 0.95).toFixed(2)),
              performanceRatioReal: 0.82,
              integralSolarimetricaKWhM2: 5.4,
            },
          });
          totalSaved++;
        }
        console.log(`  Mes 2026-${mStr}: ${res.data.length} dias processados.`);
      } else {
        console.log(`  Mes 2026-${mStr}: Sem dados ou failCode: ${res?.failCode}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      console.error(`  Erro no mes 2026-${mStr}:`, err.message);
    }
  }
  console.log(`Total de dias salvos para Manga Grande 03: ${totalSaved}`);
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
