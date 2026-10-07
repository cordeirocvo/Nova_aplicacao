import axios from 'axios';
import { PvlibService, PvlibMeteoRecord } from '../src/lib/services/pvlibService';
import { prisma } from '../src/lib/prisma';

async function testAlvaroWeather() {
  const lat = -18.647791;
  const lon = -44.055744;
  const dateStr = '2026-10-04';
  const capKWp = 108.0;
  const capCA = 75.0;

  console.log(`Buscando dados meteorológicos de alta resolução para Pres. Juscelino (${lat}, ${lon}) em ${dateStr}...`);

  // 1. Consultar radiação e nuvens em 15 minutos
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&minutely_15=shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,wind_speed_10m&timezone=America%2FSao_Paulo&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await axios.get(url);
  const m15 = res.data.minutely_15;

  const meteoRecords: PvlibMeteoRecord[] = [];

  for (let i = 0; i < m15.time.length; i++) {
    const timeIso = m15.time[i]; // "2026-10-04T12:00"
    const ghi = m15.shortwave_radiation[i];
    const dni = m15.direct_normal_irradiance[i];
    const tempAmb = m15.temperature_2m[i];
    const wind = m15.wind_speed_10m?.[i] || 2.0;

    // POA aproximado para inclinação ~15°
    const poa = ghi != null ? (ghi > 10 ? ghi * 1.05 : ghi) : 0;
    const tempMod = tempAmb != null ? tempAmb + (poa / 800) * 28 : 25;

    meteoRecords.push({
      timestamp: `${timeIso}:00-03:00`,
      ghi,
      poa,
      tempAmbiente: tempAmb,
      tempModulos: tempMod,
      velocidadeVento: wind,
    });
  }

  // 2. Simular pvlib
  const sim = await PvlibService.simulate({
    date: dateStr,
    latitude: lat,
    longitude: lon,
    capacidadeKWp: capKWp,
    capacidadeCA: capCA,
    tilt: 15,
    azimuth: 0,
    meteo_data: meteoRecords,
  });

  console.log('\nResultado pvlib com meteorologia real:');
  console.log('  Energia Esperada Full Day:', sim.energiaEsperadaKWh, 'kWh');
  console.log('  Perda Ceifamento:', sim.perdaCeifamentoKWh, 'kWh');

  // 3. Buscar telemetria real de Álvaro Palhares para comparar até o último registro
  const startDay = new Date(`${dateStr}T00:00:00-03:00`);
  const endDay = new Date(`${dateStr}T23:59:59.999-03:00`);

  const tels = await prisma.telemetria.findMany({
    where: {
      usinaId: 'cmtuluuvg008cl4v5tlqt0wib',
      timestamp: { gte: startDay, lte: endDay },
    },
    orderBy: { timestamp: 'asc' },
  });

  const lastTel = tels[tels.length - 1];
  const lastTimeStr = lastTel
    ? lastTel.timestamp.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    : '23:55';

  console.log(`\nÚltimo ponto de telemetria recebido: ${lastTimeStr}`);

  // Calcular energia esperada ATE o momento da telemetria
  const dtHours = 5 / 60;
  let esperadaAteAgoraKWh = 0;
  for (const pt of sim.curvaEsperada) {
    if (pt.time <= lastTimeStr) {
      esperadaAteAgoraKWh += pt.expectedKW * dtHours;
    }
  }

  // Integral da geração real
  const energiaRealKWh = tels.reduce((acc, t) => acc + (t.potenciaAtivaKW || 0) * dtHours, 0);

  console.log('Comparativo Alinhado até', lastTimeStr, ':');
  console.log('  Energia Real Entregue:', energiaRealKWh.toFixed(2), 'kWh');
  console.log('  Energia Esperada até', lastTimeStr, ':', esperadaAteAgoraKWh.toFixed(2), 'kWh');
  console.log('  PR Alinhado:', ((energiaRealKWh / esperadaAteAgoraKWh) * 100).toFixed(1), '%');
}

testAlvaroWeather().catch(console.error).finally(() => (prisma as any).$disconnect());
