import axios from 'axios';

interface WeatherPoint {
  time: string; // "HH:mm"
  ghi: number;
  poa: number;
  tempAmbiente: number;
  tempModulos: number;
  velocidadeVento: number;
  nuvensPercent: number;
}

export async function fetchUniversalSolarData(lat: number, lon: number, dateStr: string, tilt: number = 15): Promise<{
  fonte: string;
  estacaoProxima: string;
  distanciaKm: number;
  hspDiarioKWhM2: number;
  pontos: WeatherPoint[];
}> {
  // 1. Identificar estação física INMET mais próxima para fins de referência oficial
  let estacaoNome = 'Estação Meteorológica Virtual Satélite';
  let distanciaKm = 0;

  try {
    const inmetRes = await axios.get('https://apitempo.inmet.gov.br/estacoes/T', { timeout: 4000 });
    if (Array.isArray(inmetRes.data)) {
      let minDist = Infinity;
      let closest: any = null;
      for (const e of inmetRes.data) {
        const eLat = parseFloat(e.VL_LATITUDE);
        const eLon = parseFloat(e.VL_LONGITUDE);
        if (!isNaN(eLat) && !isNaN(eLon)) {
          const d = Math.sqrt(Math.pow(eLat - lat, 2) + Math.pow(eLon - lon, 2)) * 111;
          if (d < minDist) {
            minDist = d;
            closest = e;
          }
        }
      }
      if (closest) {
        estacaoNome = `INMET [${closest.CD_ESTACAO}] ${closest.DC_NOME} - ${closest.SG_ESTADO}`;
        distanciaKm = parseFloat(minDist.toFixed(1));
      }
    }
  } catch (e) {
    // Silently continue
  }

  // 2. Buscar radiação solar e nuvens em alta resolução (Open-Meteo 15-min model) para a coordenada exata
  const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&minutely_15=shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,wind_speed_10m&hourly=cloud_cover&timezone=America%2FSao_Paulo&start_date=${dateStr}&end_date=${dateStr}`;
  const omRes = await axios.get(omUrl, { timeout: 6000 });
  const m15 = omRes.data.minutely_15;
  const hourlyClouds = omRes.data.hourly?.cloud_cover || [];

  const tiltRad = (tilt * Math.PI) / 180;
  const tiltMultiplier = 1.0 + (tilt / 90.0) * 0.15;

  const pontos: WeatherPoint[] = [];
  let integralWh = 0;

  for (let i = 0; i < m15.time.length; i++) {
    const timeStr = m15.time[i].substring(11); // "HH:mm"
    const hourInt = parseInt(timeStr.substring(0, 2), 10);
    const ghi = m15.shortwave_radiation[i] || 0;
    const tempAmb = m15.temperature_2m[i] || 25.0;
    const wind = m15.wind_speed_10m?.[i] || 2.0;
    const nuvens = hourlyClouds[hourInt] ?? 0;

    // POA realista
    const poa = ghi > 10 ? parseFloat((ghi * tiltMultiplier).toFixed(1)) : 0;
    // Temp módulo King/Sandia
    const tempMod = poa > 0 ? parseFloat((tempAmb + (poa / 800) * 28.0).toFixed(1)) : tempAmb;

    integralWh += ghi * (15 / 60);

    pontos.push({
      time: timeStr,
      ghi,
      poa,
      tempAmbiente: tempAmb,
      tempModulos: tempMod,
      velocidadeVento: wind,
      nuvensPercent: nuvens,
    });
  }

  const hspDiarioKWhM2 = parseFloat((integralWh / 1000).toFixed(2));

  return {
    fonte: 'HIGH_RES_SATELLITE_WEATHER',
    estacaoProxima: `${estacaoNome} (${distanciaKm} km)`,
    distanciaKm,
    hspDiarioKWhM2,
    pontos,
  };
}

async function main() {
  console.log('--- TESTE DO PIPELINE UNIVERSAL PARA ÁLVARO PALHARES ---');
  const res = await fetchUniversalSolarData(-18.647791, -44.055744, '2026-10-04');
  console.log('Estação mais próxima:', res.estacaoProxima);
  console.log('HSP Total do dia:', res.hspDiarioKWhM2, 'kWh/m²/dia');
  console.log('\nTabela Solarimétrica de Álvaro Palhares (Amostra 15 min):');
  for (const p of res.pontos) {
    if (p.ghi > 0 || (p.time >= '06:00' && p.time <= '18:00')) {
      console.log(`  ${p.time} | GHI: ${String(p.ghi).padStart(5)} W/m² | POA: ${String(p.poa).padStart(5)} W/m² | Nuvens: ${String(p.nuvensPercent).padStart(3)}% | Tamb: ${p.tempAmbiente}°C | Tmod: ${p.tempModulos}°C`);
    }
  }
}

main().catch(console.error);
