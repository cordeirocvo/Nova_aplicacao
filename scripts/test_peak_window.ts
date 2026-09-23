import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  // Janela de pico: 10:00 às 14:00 BRT (onde se diagnostica fusível e sujidade)
  const startMs = new Date('2026-05-15T10:00:00-03:00').getTime();
  const endMs = new Date('2026-05-15T14:00:00-03:00').getTime();

  console.log('Testando /getDevHistoryKpi das 10:00 às 14:00 BRT para Inversor 01...');
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

  console.log('Resultado:', res.failCode, res.message, 'Pontos:', res.data?.length);
  if (Array.isArray(res.data) && res.data.length > 0) {
    const pt = res.data[0];
    console.log('Primeiro ponto S14:', pt.dataItemMap?.pv14_u, 'V |', pt.dataItemMap?.pv14_i, 'A');
    console.log('Primeiro ponto S13:', pt.dataItemMap?.pv13_u, 'V |', pt.dataItemMap?.pv13_i, 'A');
  }
}

main().catch(console.error);
