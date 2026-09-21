import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { SolarAiEngine } from '../src/lib/services/solarAiEngine';

async function main() {
  console.log('🧪 Iniciando teste do Cordeiro Solar AI Engine...');

  const usinas = await prisma.usina.findMany({
    select: { id: true, nome: true, capacidadeKWp: true },
  });
  console.log(`Usinas cadastradas no banco (${usinas.length}):`);
  usinas.forEach(u => console.log(` - [${u.id}] ${u.nome}`));

  const usina = usinas.find(u => u.nome.toLowerCase().includes('manga') || u.nome.toLowerCase().includes('01')) || usinas[0];

  if (!usina) {
    console.error('❌ Nenhuma usina encontrada no banco!');
    return;
  }

  console.log(`📍 Usina identificada: ${usina.nome} (${usina.id})`);
  
  // Testar com data de 04/09/2026 (onde temos telemetria)
  const testDate = '2026-09-04';
  console.log(`⏱️ Executando diagnóstico para data: ${testDate}...`);

  const diag = await SolarAiEngine.executarDiagnostico(usina.id, testDate, {
    gerarParecerGemini: false,
  });

  console.log('\n📊 RESULTADOS DO DIAGNÓSTICO:');
  console.log('----------------------------------------------------');
  console.log(`Geração Real: ${diag.desempenho.energiaRealKWh} kWh | Esperada pvlib: ${diag.desempenho.energiaEsperadaKWh} kWh`);
  console.log(`Yield Real (Yf): ${diag.desempenho.yieldRealKWhKWp} kWh/kWp | PR Real: ${diag.desempenho.performanceRatioReal}%`);
  console.log(`Perda Financeira Diária Total: R$ ${diag.desempenho.perdaFinanceiraDiariaRS}`);
  
  console.log('\n⚡ NÍVEL 1 - CABINE ELÉTRICA & PRODIST:');
  console.log(`Desbalanço de Tensão: ${diag.cabine.desbalancoTensaoPercent}% (Status: ${diag.cabine.conformidadeProdist})`);
  console.log(`Fator de Potência: ${diag.cabine.fatorPotencia} | Temp Óleo: ${diag.cabine.tempOleoTrafo}°C`);

  console.log('\n🔍 NÍVEL 3 - INVERSORES:');
  console.log(`Total Inversores analisados: ${diag.inversores.length}`);
  for (const inv of diag.inversores) {
    console.log(`- ${inv.nome}: Pico ${inv.potenciaPicoKW} kW | Temp IGBT: ${inv.maxTempIGBT}°C (${inv.statusTermico})`);
  }

  console.log('\n🧵 NÍVEL 4 - STRINGS:');
  console.log(`Strings monitoradas: ${diag.strings.totalMonitoradas} | Ativas: ${diag.strings.ativasConduzindo} | Vazias (NC): ${diag.strings.naoConectadasNC}`);
  console.log(`Falhas Fusível Queimado: ${diag.strings.falhasFusivel} | Alertas Sujidade: ${diag.strings.alertasSujidade}`);

  console.log('\n📜 COMPLIANCE NORMATIVO (NBRs & PRODIST):');
  console.log(`Score Geral de Conformidade: ${diag.complianceNormativo.scoreConformidadePercent}%`);
  console.log(`Conformes: ${diag.complianceNormativo.conformes} | Alertas: ${diag.complianceNormativo.alertas} | Não Conformes: ${diag.complianceNormativo.naoConformes}`);
  for (const a of diag.complianceNormativo.auditorias) {
    console.log(`  [${a.norma} ${a.itemNorma}] ${a.parametroAvaliado}: Medido ${a.valorMedido}${a.unidade} (Limite ${a.valorLimite}${a.unidade}) -> ${a.statusConformidade}`);
  }

  console.log('\n📋 ORDENS DE SERVIÇO SUGERIDAS (CAMPO):');
  console.log(`Total O.S. geradas: ${diag.ordensServicoSugeridas.length}`);
  for (const os of diag.ordensServicoSugeridas) {
    console.log(`- [${os.gravidade}] ${os.titulo}`);
    console.log(`  Local: ${os.localizacaoFisica}`);
    console.log(`  Peça: ${os.pecaSugerida}`);
    console.log(`  Norma: ${os.normaReferencia}`);
    console.log(`  Impacto: R$ ${os.impactoFinanceiroDia}/dia | Perda: ${os.perdaPotenciaKW} kW`);
  }

  console.log('\n✅ Teste do motor de IA finalizado com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
