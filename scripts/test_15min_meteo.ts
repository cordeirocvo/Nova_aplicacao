import axios from 'axios';

async function test15Min() {
  const lat = -18.647791;
  const lon = -44.055744;
  const dateStr = '2026-10-04';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&minutely_15=shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m&timezone=America%2FSao_Paulo&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await axios.get(url);
  const m15 = res.data.minutely_15;

  console.log(`Open-Meteo 15-min para ${dateStr} (${lat}, ${lon}):`);
  console.log('Total pontos:', m15.time.length);
  for (let i = 24; i <= 64; i += 2) {
    const time = m15.time[i].substring(11);
    const ghi = m15.shortwave_radiation[i];
    const dni = m15.direct_normal_irradiance[i];
    const temp = m15.temperature_2m[i];
    console.log(`  ${time} | GHI: ${String(ghi).padStart(5, ' ')} W/m² | DNI: ${String(dni).padStart(5, ' ')} W/m² | Temp: ${temp}°C`);
  }
}

test15Min().catch(console.error);
