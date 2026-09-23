import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

const DEV_IDS = [
  { sn: 'ES2380071220', id: '1000000045877644', label: 'INV01' },
  { sn: 'ES2380071249', id: '1000000045877645', label: 'INV02' },
  { sn: 'ES2450052227', id: '1000000045877642', label: 'INV03' },
  { sn: 'ES2450054367', id: '1000000045877643', label: 'INV04' },
];

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  // Vamos testar datas em Abril, Maio, Junho, Julho e Setembro para o Inversor 01
  const testDates = [
    '2026-04-01',
    '2026-04-10',
    '2026-04-20',
    '2026-04-30',
    '2026-05-10',
    '2026-05-15',
    '2026-05-20',
    '2026-05-25',
    '2026-05-30',
    '2026-06-05',
    '2026-06-15',
    '2026-07-01',
    '2026-08-01',
    '2026-09-04',
    '2026-09-14',
  ];

  console.log('Verificando status das strings do INV01 (1000000045877644) ao longo do tempo:');

  for (const dStr of testDates) {
    const startMs = new Date(`${dStr}T12:00:00-03:00`).getTime();
    const endMs = new Date(`${dStr}T12:15:00-03:00`).getTime();

    try {
      const res = await hw.hwRequest(
        '/getDevHistoryKpi',
        {
          devIds: '1000000045877644',
          devTypeId: 1,
          startTime: startMs,
          endTime: endMs,
        },
        session.token,
        session.cookie
      );

      const pts = res.data || [];
      if (pts.length > 0) {
        const m = pts[0].dataItemMap || {};
        const s13_i = m['pv13_i'];
        const s14_i = m['pv14_i'];
        const s14_v = m['pv14_u'];
        console.log(`Data ${dStr}: S13=${s13_i}A | S14=${s14_i}A (V=${s14_v}V)`);
      } else {
        console.log(`Data ${dStr}: sem pontos`);
      }
    } catch (e: any) {
      console.log(`Data ${dStr}: erro ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

main().catch(console.error);
