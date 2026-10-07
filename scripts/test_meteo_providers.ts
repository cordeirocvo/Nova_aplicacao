import axios from 'axios';

async function testProviders() {
  console.log('=== TESTANDO PROVEDORES METEOROLÓGICOS / SOLARIMÉTRICOS ===\n');

  // Coordenadas de Álvaro Palhares (Presidente Juscelino - MG)
  const lat = -18.647791;
  const lon = -44.055744;

  // 1. Testar Estações do INMET mais próximas
  console.log('1. Buscando estações automáticas do INMET próximas a Pres. Juscelino (-18.65, -44.06)...');
  try {
    const inmetEstacoes = await axios.get('https://apitempo.inmet.gov.br/estacoes/T', { timeout: 6000 });
    if (Array.isArray(inmetEstacoes.data)) {
      // Calcular distância de cada estação
      const comDist = inmetEstacoes.data.map((est: any) => {
        const eLat = parseFloat(est.VL_LATITUDE);
        const eLon = parseFloat(est.VL_LONGITUDE);
        const d = Math.sqrt(Math.pow(eLat - lat, 2) + Math.pow(eLon - lon, 2)) * 111; // ~km
        return { ...est, distKm: d };
      }).sort((a: any, b: any) => a.distKm - b.distKm);

      console.log('Top 5 estações INMET mais próximas:');
      for (const e of comDist.slice(0, 5)) {
        console.log(`  - [${e.CD_ESTACAO}] ${e.DC_NOME} - ${e.SG_ESTADO} | Dist: ${e.distKm.toFixed(1)} km | Lat: ${e.VL_LATITUDE}, Lon: ${e.VL_LONGITUDE} | Tipo: ${e.TP_ESTACAO}`);
      }

      // Testar dados da estação mais próxima (ex: Curvelo ou Diamantina ou Sete Lagoas)
      const closestInmet = comDist[0];
      if (closestInmet) {
        console.log(`\nConsultando dados recentes da estação INMET ${closestInmet.CD_ESTACAO} (${closestInmet.DC_NOME})...`);
        const todayStr = '2026-10-04';
        const inmetData = await axios.get(`https://apitempo.inmet.gov.br/estacao/${todayStr}/${todayStr}/${closestInmet.CD_ESTACAO}`, { timeout: 6000 });
        console.log(`Pontos retornados do INMET para ${todayStr}:`, inmetData.data?.length || 0);
        if (Array.isArray(inmetData.data) && inmetData.data.length > 0) {
          const sample = inmetData.data.filter((d: any) => d.RAD_GLO != null).slice(-3);
          console.log('Amostra de radiação solar INMET (kJ/m²):', sample.map((s: any) => ({ hora: s.HR_MEDICAO, rad_glo: s.RAD_GLO, temp: s.TEM_INS, umid: s.UMD_INS })));
        }
      }
    }
  } catch (err: any) {
    console.error('Erro ao consultar INMET:', err.message);
  }

  // 2. Testar Open-Meteo Solar API (resolução horária e 15 minutos em qualquer coordenada)
  console.log('\n2. Testando Open-Meteo Solar API para Pres. Juscelino...');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,cloud_cover,relative_humidity_2m,wind_speed_10m&minutely_15=shortwave_radiation,direct_normal_irradiance,temperature_2m&timezone=America%2FSao_Paulo&start_date=2026-10-04&end_date=2026-10-04`;
    const omRes = await axios.get(url, { timeout: 6000 });
    const h = omRes.data.hourly;
    console.log('Open-Meteo Hourly Dados para 04/10/2026:');
    for (let i = 6; i <= 17; i++) {
      console.log(`  ${h.time[i].substring(11)} | GHI: ${h.shortwave_radiation[i]} W/m² | DNI: ${h.direct_normal_irradiance[i]} W/m² | Nuvens: ${h.cloud_cover[i]}% | Temp: ${h.temperature_2m[i]}°C`);
    }

    // Calcular integral de GHI do dia em kWh/m²
    const ghiSum = h.shortwave_radiation.reduce((a: number, b: number) => a + (b || 0), 0) / 1000;
    console.log(`\nIntegral GHI do dia (Open-Meteo): ${ghiSum.toFixed(2)} kWh/m²`);
  } catch (err: any) {
    console.error('Erro ao consultar Open-Meteo:', err.message);
  }
}

testProviders().catch(console.error);
