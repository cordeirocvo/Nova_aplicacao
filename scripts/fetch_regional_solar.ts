import axios from 'axios';

async function fetchSolarData(name: string, lat: number, lon: number) {
  console.log(`\n======================================================`);
  console.log(`CONSULTANDO DADOS SOLARIMÉTRICOS: ${name}`);
  console.log(`Coordenadas: Lat ${lat}, Lon ${lon}`);
  
  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${lat}&lon=${lon}&peakpower=1&loss=14&outputformat=json`;
  try {
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;
    const monthly = data.outputs?.monthly?.fixed || [];
    const totals = data.outputs?.totals?.fixed || {};

    console.log(`✓ Dados obtidos com sucesso!`);
    console.log(`Geração anual estimada (1 kWp): ${totals.E_y?.toFixed(1)} kWh/ano`);
    console.log(`Irradiação anual no plano: ${totals.H_y?.toFixed(1)} kWh/m²`);
    console.log(`HSP Médio Diário Anual: ${(totals.H_y / 365).toFixed(2)} h/dia`);
    console.log('\nDados Mensais (HSP Diário em kWh/m²/dia e Geração E_d em kWh/dia por kWp):');
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    monthly.forEach((m: any) => {
      const mesNome = meses[m.month - 1];
      const h_d = (m.H_m / 30.4).toFixed(2); // irradiação diária média
      console.log(`  ${mesNome.padEnd(4)}: Irradiação=${h_d} kWh/m²/dia | Yield=${m.E_d?.toFixed(2)} kWh/kWp/dia`);
    });
  } catch (err: any) {
    console.error(`Erro ao consultar dados para ${name}:`, err.message);
  }
}

async function main() {
  // 1. Usina Álvaro Palhares - Presidente Juscelino / MG
  await fetchSolarData('Usina Álvaro Palhares (Presidente Juscelino - MG)', -18.6478, -44.0557);

  // 2. Usinas Evandro Diniz - Jaíba / MG
  await fetchSolarData('Usinas Evandro Diniz (Jaíba - MG)', -15.1627, -43.6647);

  // 3. Manga Grande - Caetanópolis / MG (para comparação)
  await fetchSolarData('Complexo Manga Grande (Caetanópolis - MG)', -19.29, -44.42);
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
