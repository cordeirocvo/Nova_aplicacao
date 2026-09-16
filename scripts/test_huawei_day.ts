import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

async function main() {
  console.log('Testando /getKpiStationDay com collectTime para 07/09/2026...');
  const session = await HuaweiIntegration.login();

  const stationCode = 'NE=45877638'; // Manga Grande 1
  const hw: any = HuaweiIntegration;

  // 07/09/2026 in BRT (midnight)
  const d07 = new Date('2026-09-07T00:00:00-03:00').getTime();

  console.log('Chamando /getKpiStationDay com collectTime =', d07, '(', new Date(d07).toISOString(), ')');

  const resDay = await hw.hwRequest(
    '/getKpiStationDay',
    { stationCodes: stationCode, collectTime: d07 },
    session.token,
    session.cookie
  );

  console.log('Resultado:');
  console.log(JSON.stringify(resDay, null, 2));

  // Also test /getKpiStationMonth for September 2026
  console.log('\nChamando /getKpiStationMonth para Set/2026...');
  const resMonth = await hw.hwRequest(
    '/getKpiStationMonth',
    { stationCodes: stationCode, collectTime: d07 },
    session.token,
    session.cookie
  );
  console.log('Resultado Month:');
  console.log(JSON.stringify(resMonth, null, 2).slice(0, 2000));
}

main().catch(console.error);
