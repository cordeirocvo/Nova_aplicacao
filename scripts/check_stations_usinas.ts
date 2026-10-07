import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function checkStationsAndUsinas() {
  console.log('=== USINAS ===');
  const usinas = await prisma.usina.findMany({
    include: {
      estacao: true,
    }
  });

  for (const u of usinas) {
    console.log(`\nUsina: ${u.nome} (ID: ${u.id})`);
    console.log(`  Capacidade: ${u.capacidadeKWp} kWp`);
    console.log(`  Localizacao: ${u.localizacao} | Lat: ${u.latitude}, Lon: ${u.longitude}`);
    console.log(`  Modo Irradiancia: ${u.modoIrradiancia}`);
    console.log(`  Estacao ID: ${u.estacaoId} -> ${u.estacao ? u.estacao.nome + ' (' + u.estacao.apiFornecedor + ')' : 'SEM ESTAÇÃO'}`);
  }

  console.log('\n=== ESTACOES SOLARIMETRICAS ===');
  const estacoes = await prisma.estacaoSolarimetrica.findMany({
    include: {
      _count: {
        select: {
          telemetrias: true,
          usinas: true
        }
      }
    }
  });

  for (const est of estacoes) {
    console.log(`\nEstação: ${est.nome} (ID: ${est.id})`);
    console.log(`  Fornecedor: ${est.apiFornecedor} | Modo Coleta: ${est.modoColeta}`);
    console.log(`  Localizacao: ${est.localizacao}`);
    console.log(`  Usinas vinculadas: ${est._count.usinas}`);
    console.log(`  Total telemetrias registradas: ${est._count.telemetrias}`);

    // Sample latest telemetria
    const latestTele = await prisma.telemetriaEstacao.findFirst({
      where: { estacaoId: est.id },
      orderBy: { timestamp: 'desc' }
    });
    if (latestTele) {
      console.log(`  Última telemetria: ${latestTele.timestamp.toISOString()} | GHI: ${latestTele.ghi} | POA: ${latestTele.poa} | Temp: ${latestTele.tempAmbiente}`);
    }
  }
}

checkStationsAndUsinas().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
