import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

async function fetchWithRetry(hw: any, url: string, body: any, session: any, maxRetries = 5): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await hw.hwRequest(url, body, session.token, session.cookie);
      if (res.failCode === 407) {
        console.warn(`  [Rate Limit 407] Aguardando 25s (tentativa ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, 25000));
        const newSession = await HuaweiIntegration.login();
        session.token = newSession.token;
        session.cookie = newSession.cookie;
        continue;
      }
      return res;
    } catch (e: any) {
      console.warn(`  [Erro rede] ${e.message}. Aguardando 10s...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  return { data: null, success: false };
}

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  const startMs = new Date('2026-05-15T11:45:00-03:00').getTime();
  const endMs = new Date('2026-05-15T12:15:00-03:00').getTime();

  console.log('Testando devIds múltiplos em /getDevHistoryKpi...');
  const res = await fetchWithRetry(
    hw,
    '/getDevHistoryKpi',
    {
      devIds: '1000000045877644,1000000045877645,1000000045877642,1000000045877643',
      devTypeId: 1,
      startTime: startMs,
      endTime: endMs,
    },
    session
  );

  console.log('Sucesso:', res.success, 'failCode:', res.failCode);
  if (Array.isArray(res.data)) {
    console.log(`Retornou ${res.data.length} pontos!`);
    const devIdsInRes = new Set(res.data.map((d: any) => d.devId));
    console.log('Dispositivos retornados:', Array.from(devIdsInRes));
  } else {
    console.log('Data:', typeof res.data, res.data);
  }
}

main().catch(console.error);
