import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

async function main() {
  console.log('Testando /getDevHistoryKpi para 04/09/2026 na Manga Grande 1...');
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  const devIds = ['1000000045877644', '1000000045877645', '1000000045877642', '1000000045877643'];

  const start04 = new Date('2026-09-04T05:00:00-03:00').getTime();
  const end04 = new Date('2026-09-04T18:00:00-03:00').getTime();

  console.log(`Buscando histórico de 04/09/2026 (${new Date(start04).toISOString()} a ${new Date(end04).toISOString()})...`);

  for (const devId of devIds) {
    const res = await hw.hwRequest(
      '/getDevHistoryKpi',
      {
        devIds: devId,
        devTypeId: 1,
        startTime: start04,
        endTime: end04,
      },
      session.token,
      session.cookie
    );

    console.log(`Inversor ${devId}: total pontos = ${res.data?.length || 0}`);
    if (res.data && res.data.length > 0) {
      // Find point at 13:35
      const p1335 = res.data.find((d: any) => {
        const t = new Date(d.collectTime - 3 * 3600 * 1000).toISOString().substring(11, 16);
        return t === '13:35';
      });
      console.log(`  Ponto 13:35 no inv ${devId}: active_power =`, p1335?.dataItemMap?.active_power, 'a_power =', p1335?.dataItemMap?.a_power);
    }
  }
}

main().catch(console.error);
