import axios from 'axios';
import { PvlibService, PvlibMeteoRecord } from '../src/lib/services/pvlibService';

async function testWithClouds() {
  const lat = -18.647791;
  const lon = -44.055744;
  const dateStr = '2026-10-04';
  const capKWp = 108.0;
  const capCA = 75.0;

  // 1. Buscar radiação em 15 minutos na Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&minutely_15=shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,wind_speed_10m&timezone=America%2FSao_Paulo&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await axios.get(url);
  const m15 = res.data.minutely_15;

  // Criar mapa de 15 minutos
  const m15Map = new Map<number, { ghi: number; dni: number; temp: number; wind: number }>();
  for (let i = 0; i < m15.time.length; i++) {
    const timeStr = m15.time[i].substring(11); // "HH:mm"
    const [hh, mm] = timeStr.split(':').map(Number);
    const minuteOfDay = hh * 60 + mm;
    m15Map.set(minuteOfDay, {
      ghi: m15.shortwave_radiation[i] || 0,
      dni: m15.direct_normal_irradiance[i] || 0,
      temp: m15.temperature_2m[i] || 25,
      wind: m15.wind_speed_10m?.[i] || 2,
    });
  }

  // 2. Interpolação linear para 5 minutos (288 pontos)
  const meteo5min: PvlibMeteoRecord[] = [];
  const tiltMultiplier = 1.05;

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const minOfDay = h * 60 + m;
      const prev15Min = Math.floor(minOfDay / 15) * 15;
      const next15Min = Math.min(24 * 60 - 15, prev15Min + 15);
      const frac = (minOfDay - prev15Min) / 15;

      const p0 = m15Map.get(prev15Min) || { ghi: 0, dni: 0, temp: 25, wind: 2 };
      const p1 = m15Map.get(next15Min) || p0;

      const ghi = p0.ghi + (p1.ghi - p0.ghi) * frac;
      const tempAmb = p0.temp + (p1.temp - p0.temp) * frac;
      const wind = p0.wind + (p1.wind - p0.wind) * frac;

      const poa = ghi > 10 ? ghi * tiltMultiplier : 0;
      const tempMod = poa > 0 ? tempAmb + (poa / 800) * 28 : tempAmb;

      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      meteo5min.push({
        timestamp: `${dateStr}T${timeStr}:00-03:00`,
        ghi: parseFloat(ghi.toFixed(1)),
        poa: parseFloat(poa.toFixed(1)),
        tempAmbiente: parseFloat(tempAmb.toFixed(1)),
        tempModulos: parseFloat(tempMod.toFixed(1)),
        velocidadeVento: parseFloat(wind.toFixed(1)),
      });
    }
  }

  // 3. Executar pvlib
  const sim = await PvlibService.simulate({
    date: dateStr,
    latitude: lat,
    longitude: lon,
    capacidadeKWp: capKWp,
    capacidadeCA: capCA,
    tilt: 15,
    azimuth: 0,
    meteo_data: meteo5min,
  });

  console.log('Simulação pvlib com dados meteorológicos reais interpolados em 5 min:');
  console.log('  Energia Esperada Full Day:', sim.energiaEsperadaKWh, 'kWh');
  console.log('  Perda Ceifamento:', sim.perdaCeifamentoKWh, 'kWh');
  console.log('  PR Esperado:', sim.prEsperado, '%');

  console.log('\nCurva de Potência Esperada (amostra com nuvens entre 11:30 e 14:30):');
  for (const pt of sim.curvaEsperada) {
    if (['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'].includes(pt.time)) {
      console.log(`  ${pt.time} | Pot. Esperada: ${pt.expectedKW.toFixed(1)} kW (Sem ceif: ${pt.unclippedKW.toFixed(1)} kW) | POA: ${pt.poa} W/m² | Tmod: ${pt.cellTemp}°C`);
    }
  }
}

testWithClouds().catch(console.error);
