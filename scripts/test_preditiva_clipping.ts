async function test() {
  const url = 'http://localhost:3000/api/solar/preditiva?usinaId=cmp8hqv4400h9wgv5c9f2tdbh&date=2026-09-04';
  const res = await fetch(url);
  const data = await res.json();

  console.log('--- TESTE DA CURVA PREDITIVA COM 1.000 kW CA ---');
  console.log('Usina:', data.usina.nome);
  console.log('Capacidade CC:', data.usina.capacidadeKWp, 'kWp');
  console.log('Capacidade CA:', data.usina.capacidadeCA, 'kW CA');
  console.log('Perda por Ceifamento (dia):', data.resumo.perdaCeifamentoKWh, 'kWh');

  const pt1145 = data.curvaComparativa.find((p: any) => p.time === '11:45');
  console.log('\nHorário 11:45 (Pico Solar):', pt1145);
  if (pt1145) {
    console.log(`- Geração Real: ${pt1145.realKW} kW`);
    console.log(`- Esperada pvlib (ceifada no teto): ${pt1145.expectedKW} kW`);
    console.log(`- Sem Ceifamento (potência CC dos módulos): ${pt1145.unclippedKW} kW`);
    console.log(`- Ceifamento visível: ${(pt1145.unclippedKW - pt1145.expectedKW).toFixed(1)} kW`);
  }
}

test().catch(console.error);
