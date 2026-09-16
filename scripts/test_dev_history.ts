import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Testando /getDevHistoryKpi para 07/09/2026 na Manga Grande 1...');
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  // Manga Grande 1 inverters
  const usina = await prisma.usina.findUnique({
    where: { id: 'cmp8hqv4400h9wgv5c9f2tdbh' },
    include: { inversores: true },
  });

  const devListRes = await hw.hwRequest(
    '/getDevList',
    { stationCodes: 'NE=45877638' },
    session.token,
    session.cookie
  );

  console.log('Dispositivos encontrados:', devListRes.data?.length);
  const inverters = (devListRes.data || []).filter((d: any) => d.devTypeId === 1 || d.devTypeId === 38);
  const devIds = inverters.map((d: any) => d.id).join(',');
  console.log('Inverter devIds:', devIds);

  // Test 07/09/2026
  const start07 = new Date('2026-09-07T05:00:00-03:00').getTime();
  const end07 = new Date('2026-09-07T18:00:00-03:00').getTime();

  console.log(`Chamando /getDevHistoryKpi de ${new Date(start07).toISOString()} até ${new Date(end07).toISOString()}...`);

  const resHist = await hw.hwRequest(
    '/getDevHistoryKpi',
    {
      devIds: devIds.split(',')[0], // Test 1st inverter
      devTypeId: 1,
      startTime: start07,
      endTime: end07,
    },
    session.token,
    session.cookie
  );

  console.log('Resultado /getDevHistoryKpi:');
  console.log(JSON.stringify(resHist, null, 2).slice(0, 1500));
}

main().catch(console.error);
