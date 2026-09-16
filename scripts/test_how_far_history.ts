import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  const datesToTest = [
    '2026-09-01',
    '2026-08-15',
    '2026-07-15',
    '2026-06-15',
    '2026-05-15',
    '2026-01-15',
  ];

  console.log('Testando alcance do histórico /getDevHistoryKpi na Huawei...');

  for (const dStr of datesToTest) {
    const start = new Date(`${dStr}T10:00:00-03:00`).getTime();
    const end = new Date(`${dStr}T14:00:00-03:00`).getTime();

    try {
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

      console.log(`Data ${dStr}: sucesso = ${res.success}, failCode = ${res.failCode}, pontos = ${res.data?.length || 0}`);
      await new Promise((r) => setTimeout(r, 600));
    } catch (e: any) {
      console.log(`Data ${dStr}: erro = ${e.message}`);
    }
  }
}

main().catch(console.error);
