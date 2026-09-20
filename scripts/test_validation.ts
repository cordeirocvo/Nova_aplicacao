import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function testComplete() {
  console.log('================================================================');
  console.log('VALIDAÇÃO COMPLETA: DADOS RESTAURADOS, FUSÍVEL & ENDPOINTS');
  console.log('================================================================\n');

  const MANGA_1_ID = 'cmp8hqv4400h9wgv5c9f2tdbh';

  // 1. Verificar registros no banco para Abril e Maio de 2026
  console.log('1. Verificando telemetrias de Manga Grande 1 em Abril e Maio de 2026:');
  const countApr = await prisma.telemetria.count({
    where: {
      usinaId: MANGA_1_ID,
      timestamp: {
        gte: new Date('2026-04-01T00:00:00-03:00'),
        lte: new Date('2026-04-30T23:59:59-03:00'),
      },
    },
  });
  const countMay = await prisma.telemetria.count({
    where: {
      usinaId: MANGA_1_ID,
      timestamp: {
        gte: new Date('2026-05-01T00:00:00-03:00'),
        lte: new Date('2026-05-31T23:59:59-03:00'),
      },
    },
  });
  console.log(`  -> Pontos em Abril/2026: ${countApr}`);
  console.log(`  -> Pontos em Maio/2026:  ${countMay}`);

  // 2. Inspecionar uma amostra de pico em 15/04/2026 e 16/05/2026
  console.log('\n2. Inspecionando strings no pico de 15/04/2026:');
  const picoApr = await prisma.telemetria.findFirst({
    where: {
      usinaId: MANGA_1_ID,
      timestamp: {
        gte: new Date('2026-04-15T11:00:00-03:00'),
        lte: new Date('2026-04-15T13:00:00-03:00'),
      },
    },
    orderBy: { potenciaAtivaKW: 'desc' },
  });

  if (picoApr && picoApr.dadosStrings) {
    const sMap = picoApr.dadosStrings as Record<string, { V: number; I: number }>;
    console.log(`  Potência da Usina no pico: ${picoApr.potenciaAtivaKW} kW`);
    console.log(`  INV01_S13 (Normal):           V = ${sMap['INV01_S13']?.V} V | I = ${sMap['INV01_S13']?.I} A`);
    console.log(`  INV01_S14 (Fusível Queimado): V = ${sMap['INV01_S14']?.V} V | I = ${sMap['INV01_S14']?.I} A`);
    console.log(`  INV01_S15 (Porta Vazia NC):   V = ${sMap['INV01_S15']?.V} V | I = ${sMap['INV01_S15']?.I} A`);
  }

  // 3. Testar API Interna: relatorios/strings
  console.log('\n3. Testando Endpoint /api/solar/relatorios/strings:');
  try {
    const resStrings = await fetch('http://localhost:3000/api/solar/relatorios/strings?usinaId=' + MANGA_1_ID + '&date=2026-04-15');
    if (resStrings.ok) {
      const data = await resStrings.json();
      console.log(`  Status HTTP: ${resStrings.status}`);
      console.log(`  Consolidado Complexo:`);
      console.log(`    - Fusíveis Queimados: ${data.consolidadoComplexo?.totalFusivelQueimado}`);
      console.log(`    - Séries Desconectadas: ${data.consolidadoComplexo?.totalDesligadas}`);
      console.log(`    - Portas Vazias NC: ${data.consolidadoComplexo?.totalNaoConectadas}`);
      console.log(`    - Strings Normais: ${data.consolidadoComplexo?.totalStringsNormais}`);
      console.log(`    - Perda Diária R$: R$ ${data.consolidadoComplexo?.perdaTotalRSDia}`);
      
      const u0 = data.usinas?.[0];
      if (u0) {
        const inv1 = u0.inversores?.find((i: any) => i.rotulo === 'Inversor 01' || i.inversorId === 'INV01' || i.serial === 'ES2380071220');
        if (inv1) {
          console.log(`  Inversor 01 Resumo:`);
          console.log(`    - Status: ${inv1.status}`);
          console.log(`    - Fusíveis Queimados: ${inv1.resumo?.fusivelQueimado}`);
          console.log(`    - Portas NC: ${inv1.resumo?.naoConectadas}`);
          const s14 = inv1.stringsAfetadas?.find((s: any) => s.stringName === 'INV01_S14');
          if (s14) {
            console.log(`    -> Detalhe INV01_S14: Status = ${s14.status} | Severidade = ${s14.severidade} | Perda R$ = ${s14.perdaRSDia}`);
          }
        }
      }
    } else {
      console.log(`  Falha HTTP: ${resStrings.status} ${resStrings.statusText}`);
    }
  } catch (err: any) {
    console.log(`  Erro ao chamar API relatorios/strings: ${err.message}`);
  }

  // 4. Testar API Interna: preditiva para Manga Grande 1
  console.log('\n4. Testando Endpoint /api/solar/preditiva para Manga Grande 1:');
  try {
    const resPreditiva = await fetch('http://localhost:3000/api/solar/preditiva?usinaId=' + MANGA_1_ID + '&date=2026-04-15');
    if (resPreditiva.ok) {
      const dataPred = await resPreditiva.json();
      console.log(`  Status HTTP: ${resPreditiva.status}`);
      console.log(`  Geração Real: ${dataPred.resumo?.energiaRealKWh} kWh`);
      console.log(`  pvlib Digital Twin: ${dataPred.resumo?.energiaEsperadaKWh} kWh`);
      console.log(`  PR Real: ${dataPred.resumo?.performanceRatioReal}%`);
      console.log(`  Strings Analisadas no Diagnóstico: ${dataPred.diagnosticoStrings?.totalMonitoradas} (Ativas: ${dataPred.diagnosticoStrings?.instaladasAtivas}, Falhas Fusível: ${dataPred.diagnosticoStrings?.falhasFusivel}, Vazias NC: ${dataPred.diagnosticoStrings?.naoConectadasNC})`);
      const s14Diag = dataPred.diagnosticoStrings?.detalhes?.find((s: any) => s.stringName === 'INV01_S14');
      if (s14Diag) {
        console.log(`  -> Diagnóstico INV01_S14: status = ${s14Diag.status}, tensao = ${s14Diag.tensao}V, corrente = ${s14Diag.correnteMedia}A`);
      }
      const s15Diag = dataPred.diagnosticoStrings?.detalhes?.find((s: any) => s.stringName === 'INV01_S15');
      if (s15Diag) {
        console.log(`  -> Diagnóstico INV01_S15: status = ${s15Diag.status}, tensao = ${s15Diag.tensao}V, corrente = ${s15Diag.correnteMedia}A`);
      }
    } else {
      console.log(`  Falha HTTP: ${resPreditiva.status} ${resPreditiva.statusText}`);
    }
  } catch (err: any) {
    console.log(`  Erro ao chamar API preditiva: ${err.message}`);
  }

  // 5. Testar API Interna: preditiva para Usina Solis
  console.log('\n5. Testando Endpoint /api/solar/preditiva para Usina Solis:');
  try {
    const resUsinas = await fetch('http://localhost:3000/api/solar/usinas');
    const usinasList = await resUsinas.json();
    console.log(`  Total de usinas cadastradas no sistema: ${usinasList.length}`);
    const usinaSolis = usinasList.find((u: any) => (u.apiFornecedor || '').toLowerCase().includes('solis'));
    if (usinaSolis) {
      console.log(`  Usina Solis encontrada: ${usinaSolis.nome} (ID: ${usinaSolis.id}, kWp: ${usinaSolis.capacidadeKWp})`);
      const resSolis = await fetch(`http://localhost:3000/api/solar/preditiva?usinaId=${usinaSolis.id}&date=2026-09-18`);
      if (resSolis.ok) {
        const dSolis = await resSolis.json();
        console.log(`  Status HTTP Solis: ${resSolis.status}`);
        console.log(`  Capacidade Dinâmica: ${dSolis.resumo?.potenciaNominalKW} kW CA / ${usinaSolis.capacidadeKWp} kWp CC`);
        console.log(`  pvlib Digital Twin: ${dSolis.resumo?.energiaEsperadaKWh} kWh`);
      } else {
        console.log(`  Falha HTTP Solis: ${resSolis.status}`);
      }
    } else {
      console.log('  Nenhuma usina Solis encontrada no retorno de /api/solar/usinas.');
      console.log('  Usinas disponíveis:', usinasList.map((u: any) => `[${u.apiFornecedor}] ${u.nome}`));
    }
  } catch (err: any) {
    console.log(`  Erro Solis: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('VALIDAÇÃO CONCLUÍDA!');
  console.log('================================================================');
}

testComplete()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
