import axios from 'axios';

async function testNasaPower() {
  const lat = -18.6478;
  const lon = -44.0557;
  // Test September 2026 daily irradiance
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,T2M&community=RE&longitude=${lon}&latitude=${lat}&start=20260901&end=20260920&format=JSON`;
  console.log('Testing NASA POWER API:', url);
  try {
    const res = await axios.get(url, { timeout: 10000 });
    console.log('NASA POWER Status:', res.status);
    const sw = res.data.properties.parameter.ALLSKY_SFC_SW_DWN;
    console.log('Daily SW (kWh/m²/day):', sw);
  } catch (e: any) {
    console.error('NASA POWER Error:', e.message);
  }
}

testNasaPower();
