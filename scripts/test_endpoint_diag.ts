import axios from 'axios';

async function testEndpoint() {
  const usinaId = 'cmtur27em00nel4v55jwzfpah'; // USINA MANGA GRANDE 3 2565
  const date = '2026-09-16';
  const url = `http://localhost:3000/api/solar/telemetria/diagnostico-strings?usinaId=${usinaId}&date=${date}`;

  console.log(`Testing endpoint: ${url}`);
  try {
    const res = await axios.get(url);
    console.log('Status:', res.status);
    console.log('Response summary:');
    console.log('Success:', res.data.success);
    console.log('Usina:', res.data.usinaNome);
    console.log('KPIS:', res.data.diagnostico?.kpis);
    console.log('Inversores analisados:', res.data.diagnostico?.inversores?.length);
    console.log('Total de alertas detectados:', res.data.diagnostico?.alertasGerais?.length);
  } catch (err: any) {
    console.error('Error fetching endpoint:', err.response?.data || err.message);
  }
}

testEndpoint().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
