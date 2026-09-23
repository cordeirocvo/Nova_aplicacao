import 'dotenv/config';

async function testFetchApi() {
  console.log("=== TESTANDO ENDPOINT /api/solar/telemetria/alta-fidelidade ===");
  try {
    const res = await fetch("http://localhost:3000/api/solar/telemetria/alta-fidelidade?usinaId=cmp8hqv4400h9wgv5c9f2tdbh&date=2026-05-16&periodo=DIA");
    console.log(`HTTP Status: ${res.status}`);
    const data = await res.json();
    console.log(`Success: ${data.success}`);
    console.log(`Usina: ${data.usina?.nome}`);
    console.log(`KPIs: Potência Atual=${data.kpis?.potenciaAtualKW} kW, Energia=${data.kpis?.energiaDiaKWh} kWh, Pico=${data.kpis?.picoPotenciaKW} kW às ${data.kpis?.horarioPico}`);
    console.log(`Série Diária: ${data.serieDiaria?.length} baldes de 5 minutos`);
    const activePoints = data.serieDiaria?.filter((p: any) => p.potenciaTotalKW > 0);
    console.log(`Pontos com geração no dia: ${activePoints?.length}`);
    if (activePoints?.length > 0) {
      console.log(`Amostra ponto ativo:`, JSON.stringify(activePoints[0], null, 2));
    }
  } catch (err: any) {
    console.error("Erro ao chamar endpoint:", err.message);
  }
}

testFetchApi();
