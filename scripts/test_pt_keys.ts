import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  const startMs = new Date('2026-05-15T11:55:00-03:00').getTime();
  const endMs = new Date('2026-05-15T12:20:00-03:00').getTime();

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

  console.log('res success:', res.success, 'failCode:', res.failCode);
  console.log('typeof res.data:', typeof res.data);
  if (typeof res.data === 'string') {
    console.log('res.data string first 200 chars:', res.data.substring(0, 200));
  } else if (Array.isArray(res.data)) {
    console.log('res.data is array length:', res.data.length);
    console.log('first element:', res.data[0]);
  }
}

main().catch(console.error);
