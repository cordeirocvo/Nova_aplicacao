import 'dotenv/config';
import { GET } from '../src/app/api/solar/preditiva/route';
import { NextRequest } from 'next/server';

async function testJaiba() {
  console.log('--- TESTANDO ROTA PREDITIVA PARA JAÍBA EM 04/10/2026 ---');

  const reqJaiba = new NextRequest('http://localhost:3000/api/solar/preditiva?usinaId=cmp9lv1da01lobsv5v2cl3khy&date=2026-10-04');
  const resJaiba = await GET(reqJaiba);
  const dataJaiba = await resJaiba.json();

  console.log('\n[Evandro Diniz Jaíba em 04/10/2026]:');
  console.log('  Nome:', dataJaiba.usina?.nome);
  console.log('  Estação Selecionada:', dataJaiba.usina?.estacaoNome);
  console.log('  Capacidade:', dataJaiba.usina?.capacidadeKWp, 'kWp CC /', dataJaiba.usina?.capacidadeCA, 'kW CA');
  console.log('  Energia Esperada Full Day (pvlib):', dataJaiba.resumo?.energiaEsperadaKWh, 'kWh');
  console.log('  PR Esp:', dataJaiba.resumo?.performanceRatioEsperado, '%');
}

testJaiba().catch(console.error);
