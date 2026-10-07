import { CresesbSolarService } from '../src/lib/services/cresesbSolarService';

async function test() {
  console.log('--- TESTANDO CRESESB SOLAR SERVICE ---');

  // Teste 1: Presidente Juscelino
  const resPJ = await CresesbSolarService.generateDailyMeteo({
    dateStr: '2026-09-04',
    latitude: -18.647791,
    longitude: -44.055744,
  });

  const ghiSumPJ = resPJ.meteoRecords.reduce((acc, r) => acc + (r.ghi || 0), 0) * (5 / 60) / 1000;
  const poaSumPJ = resPJ.meteoRecords.reduce((acc, r) => acc + (r.poa || 0), 0) * (5 / 60) / 1000;
  const maxPoaPJ = Math.max(...resPJ.meteoRecords.map(r => r.poa || 0));
  const maxTmodPJ = Math.max(...resPJ.meteoRecords.map(r => r.tempModulos || 0));

  console.log('Presidente Juscelino (04/09/2026):');
  console.log('  Região:', resPJ.regiaoNome);
  console.log('  Fonte:', resPJ.fonte);
  console.log('  HSP Alvo:', resPJ.hspUtilizado, 'kWh/m²/dia');
  console.log('  GHI Integral:', ghiSumPJ.toFixed(3), 'kWh/m²/dia');
  console.log('  POA Integral:', poaSumPJ.toFixed(3), 'kWh/m²/dia');
  console.log('  Pico POA:', maxPoaPJ, 'W/m²');
  console.log('  Pico Temp Módulo:', maxTmodPJ, '°C');

  // Teste 2: Jaíba
  const resJaiba = await CresesbSolarService.generateDailyMeteo({
    dateStr: '2026-09-04',
    latitude: -15.162704,
    longitude: -43.664700,
  });

  const ghiSumJaiba = resJaiba.meteoRecords.reduce((acc, r) => acc + (r.ghi || 0), 0) * (5 / 60) / 1000;
  const poaSumJaiba = resJaiba.meteoRecords.reduce((acc, r) => acc + (r.poa || 0), 0) * (5 / 60) / 1000;
  const maxPoaJaiba = Math.max(...resJaiba.meteoRecords.map(r => r.poa || 0));
  const maxTmodJaiba = Math.max(...resJaiba.meteoRecords.map(r => r.tempModulos || 0));

  console.log('\nJaíba (04/09/2026):');
  console.log('  Região:', resJaiba.regiaoNome);
  console.log('  Fonte:', resJaiba.fonte);
  console.log('  HSP Alvo:', resJaiba.hspUtilizado, 'kWh/m²/dia');
  console.log('  GHI Integral:', ghiSumJaiba.toFixed(3), 'kWh/m²/dia');
  console.log('  POA Integral:', poaSumJaiba.toFixed(3), 'kWh/m²/dia');
  console.log('  Pico POA:', maxPoaJaiba, 'W/m²');
  console.log('  Pico Temp Módulo:', maxTmodJaiba, '°C');
}

test().catch(console.error);
