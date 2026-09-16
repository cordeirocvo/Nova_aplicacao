import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  const start = new Date('2026-09-06T10:00:00-03:00').getTime();
  const end = new Date('2026-09-06T14:00:00-03:00').getTime();

  const res = await hw.hwRequest(
    '/getDevHistoryKpi',
    {
      devIds: '1000000045877644',
      devTypeId: 1,
      startTime: start,
      endTime: end,
    },
    session.token,
    session.cookie
  );

  console.log('Resposta para 06/09/2026:');
  console.log('success:', res.success, 'failCode:', res.failCode, 'message:', res.message);
  console.log('data length:', res.data?.length);
}

main().catch(console.error);
