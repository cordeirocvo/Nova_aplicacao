import 'dotenv/config';
import { GET } from '../src/app/api/solar/preditiva/route';
import { NextRequest } from 'next/server';

async function testEndpoint() {
  console.log('--- TESTANDO ROTA PREDITIVA PARA ÁLVARO PALHARES EM 04/10/2026 ---');

  const reqAlvaro = new NextRequest('http://localhost:3000/api/solar/preditiva?usinaId=cmtuluuvg008cl4v5tlqt0wib&date=2026-10-04');
  const resAlvaro = await GET(reqAlvaro);
  const dataAlvaro = await resAlvaro.json();

  console.log('\n[Álvaro Palhares em 04/10/2026]:');
  console.log('  Nome:', dataAlvaro.usina?.nome);
  console.log('  Estação Selecionada:', dataAlvaro.usina?.estacaoNome);
  console.log('  Capacidade:', dataAlvaro.usina?.capacidadeKWp, 'kWp CC /', dataAlvaro.usina?.capacidadeCA, 'kW CA');
  console.log('  Relação CC/CA:', dataAlvaro.usina?.razaoCCCA);
  console.log('  Energia Real Entregue:', dataAlvaro.resumo?.energiaRealKWh, 'kWh');
  console.log('  Energia Esperada Full Day (pvlib):', dataAlvaro.resumo?.energiaEsperadaKWh, 'kWh');
  console.log('  Energia Esperada até Momento:', dataAlvaro.resumo?.energiaEsperadaAteMomentoKWh, 'kWh');
  console.log('  Momento de Corte Telemetria:', dataAlvaro.resumo?.momentoCorteTelemetria);
  console.log('  Dia em Andamento:', dataAlvaro.resumo?.diaEmAndamento);
  console.log('  PR Real:', dataAlvaro.resumo?.performanceRatioReal, '% | PR Esp:', dataAlvaro.resumo?.performanceRatioEsperado, '%');
  console.log('  Perda por Sujidade Estimada:', dataAlvaro.resumo?.perdaSujidadeKWh, 'kWh');
  console.log('  Impacto Sujidade R$/dia:', dataAlvaro.otimizacaoLimpeza?.perdaDiariaRS);
}

testEndpoint().catch(console.error);
