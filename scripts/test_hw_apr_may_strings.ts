import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

const DEV_IDS = ['1000000045877644', '1000000045877645', '1000000045877642', '1000000045877643'];

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  console.log('Consultando Huawei getDevHistoryKpi para 15/04/2026 e 15/05/2026...');

  for (const dStr of ['2026-04-15', '2026-05-15', '2026-05-02', '2026-04-20']) {
    const startMs = new Date(`${dStr}T11:45:00-03:00`).getTime();
    const endMs = new Date(`${dStr}T12:15:00-03:00`).getTime();

    console.log(`\n--- Testando data ${dStr} (12:00 BRT) ---`);
    for (const devId of DEV_IDS) {
      try {
        const res = await hw.hwRequest(
          '/getDevHistoryKpi',
          {
            devIds: devId,
            devTypeId: 1,
            startTime: startMs,
            endTime: endMs,
          },
          session.token,
          session.cookie
        );

        const pts = res.data || [];
        console.log(`Dev ${devId}: ${pts.length} pontos`);
        if (pts.length > 0) {
          const first = pts[0];
          const map = first.dataItemMap || {};
          const pvKeys = Object.keys(map).filter((k) => k.startsWith('pv') && k.endsWith('_i'));
          console.log(`  Chaves pv_i (${pvKeys.length}):`);
          const stringsWithValues: string[] = [];
          for (let s = 1; s <= 24; s++) {
            const u = map[`pv${s}_u`];
            const i = map[`pv${s}_i`];
            if (u !== undefined || i !== undefined) {
              stringsWithValues.push(`S${s}: V=${u}V, I=${i}A`);
            }
          }
          console.log(`  ${stringsWithValues.slice(0, 14).join(' | ')}`);
        }
      } catch (e: any) {
        console.error(`Erro dev ${devId}:`, e.message);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

main().catch(console.error);
