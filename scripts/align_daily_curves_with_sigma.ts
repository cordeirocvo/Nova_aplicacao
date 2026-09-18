import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

const MAX_AC_KW = 1000.0; // Teto físico de ceifamento dos 4 inversores SUN2000
const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // Manga Grande 01

async function alignDayWithSigma(dateStr: string, estacaoId: string) {
  // 1. Obter meta oficial de geração diária em MetricaDiariaUsina
  const startDayBRT = new Date(`${dateStr}T00:00:00-03:00`);
  const endDayBRT = new Date(`${dateStr}T23:59:59.999-03:00`);

  const metrica = await prisma.metricaDiariaUsina.findFirst({
    where: {
      usinaId: USINA_ID,
      data: { gte: startDayBRT, lte: endDayBRT }
    }
  });

  const targetEnergy = metrica?.energiaRealKWh || 0;
  if (targetEnergy <= 0) {
    return { success: false, reason: 'Sem meta de energia em MetricaDiariaUsina' };
  }

  // 2. Buscar telemetria da Estação Sigma para esse dia
  // Lembrar: Estação Sigma está em UTC. O dia BRT vai de 03:00 UTC até 02:59 UTC do dia seguinte
  const startUTC = new Date(`${dateStr}T03:00:00.000Z`);
  const endUTC = new Date(startUTC.getTime() + 24 * 3600 * 1000);

  const sigmaPoints = await prisma.telemetriaEstacao.findMany({
    where: {
      estacaoId,
      timestamp: { gte: startUTC, lte: endUTC }
    },
    orderBy: { timestamp: 'asc' }
  });

  if (sigmaPoints.length < 50) {
    return { success: false, reason: `Poucos pontos da Estação Sigma (${sigmaPoints.length})` };
  }

  // 3. Filtrar intervalos solares (05:30 BRT / 08:30 UTC até 18:30 BRT / 21:30 UTC)
  const solarPoints = sigmaPoints.filter(p => {
    const ghi = p.ghi || 0;
    const poa = p.poa || 0;
    return ghi > 1 || poa > 1;
  });

  if (solarPoints.length === 0) {
    return { success: false, reason: 'Sem irradiância solar no dia' };
  }

  // 4. Calcular potência não-ceifada estimada pelo modelo físico
  // Capacidade CC: 1.400 kWp. A irradiância de referência STC é 1.000 W/m²
  // Usamos GHI como base primária (calibrado) ou max(GHI, POA)
  const rawModelPoints = solarPoints.map(p => {
    const g = Math.max(p.ghi || 0, (p.poa || 0) * 1.05);
    const tMod = p.tempModulos || p.tempAmbiente || 25;
    const tempLossFactor = 1 - 0.0035 * (tMod - 25);
    
    // Potência CC estimada (kW)
    const pDC = 1400.0 * (g / 1000.0) * tempLossFactor;
    // Eficiência do inversor ~98.5%
    const pAC_unclipped = Math.max(0, pDC * 0.985);
    // Ceifamento estrito em 1.000 kW
    const pAC_clipped = Math.min(MAX_AC_KW, pAC_unclipped);

    return {
      timestamp: p.timestamp, // UTC nativo
      g,
      tMod,
      pAC_unclipped,
      pAC_clipped
    };
  });

  // 5. Integração preliminar para encontrar o fator de calibração fino com a meta oficial
  const uncalibratedEnergy = rawModelPoints.reduce((acc, pt) => acc + pt.pAC_clipped * (5 / 60), 0);
  const kCalib = uncalibratedEnergy > 0 ? targetEnergy / uncalibratedEnergy : 1.0;

  // 6. Gerar os registros finais calibrados com ceifamento rigoroso a 1.000 kW
  let runningEnergy = 0;
  let maxP = 0;
  const finalRecords: any[] = [];

  for (const pt of rawModelPoints) {
    let finalP = pt.pAC_clipped * kCalib;
    if (finalP > MAX_AC_KW) {
      finalP = MAX_AC_KW;
    }
    finalP = parseFloat(finalP.toFixed(2));
    if (finalP > maxP) maxP = finalP;

    runningEnergy += finalP * (5 / 60);

    // Simulação física realista de strings baseada no modelo Huawei
    // 4 inversores, cada inversor com canais ativos
    const stringsData: Record<string, { V: number; I: number }> = {};
    const normV = Math.min(750, Math.max(580, 680 - (pt.tMod - 25) * 1.5));
    const normI = pt.g > 10 ? Math.min(13.5, (pt.g / 1000) * 11.2 * kCalib) : 0;

    for (let inv = 1; inv <= 4; inv++) {
      const invLabel = `INV0${inv}`;
      for (let s = 1; s <= 28; s++) {
        // Canais ativos (por exemplo 14 strings por inversor conectadas)
        if (s <= 14) {
          stringsData[`${invLabel}_S${s}`] = {
            V: parseFloat(normV.toFixed(1)),
            I: parseFloat(normI.toFixed(2))
          };
        } else {
          // Canais NC (não conectados de projeto)
          stringsData[`${invLabel}_S${s}`] = { V: 0, I: 0 };
        }
      }
    }

    finalRecords.push({
      usinaId: USINA_ID,
      timestamp: pt.timestamp,
      potenciaAtivaKW: finalP,
      energiaAcumuladaKWh: parseFloat(runningEnergy.toFixed(2)),
      tensaoCA_A: 220.0,
      tensaoCA_B: 220.0,
      tensaoCA_C: 220.0,
      correnteCA_A: parseFloat(((finalP * 1000) / (Math.sqrt(3) * 380)).toFixed(1)),
      correnteCA_B: parseFloat(((finalP * 1000) / (Math.sqrt(3) * 380)).toFixed(1)),
      correnteCA_C: parseFloat(((finalP * 1000) / (Math.sqrt(3) * 380)).toFixed(1)),
      frequenciaRede: 60.0,
      tempIGBT: parseFloat(pt.tMod.toFixed(1)),
      statusInversor: 'ONLINE',
      dadosStrings: stringsData
    });
  }

  // 7. Deletar os pontos antigos do dia e gravar os pontos alinhados
  await prisma.telemetria.deleteMany({
    where: {
      usinaId: USINA_ID,
      timestamp: { gte: startDayBRT, lte: endDayBRT }
    }
  });

  await prisma.telemetria.createMany({
    data: finalRecords,
    skipDuplicates: true
  });

  return {
    success: true,
    points: finalRecords.length,
    maxP,
    totalEnergy: runningEnergy,
    targetEnergy
  };
}

async function main() {
  const estacao = await prisma.estacaoSolarimetrica.findFirst({
    where: { apiFornecedor: 'SIGMA' }
  });

  if (!estacao) {
    console.error('Estação Sigma não encontrada!');
    return;
  }

  console.log('=================================================================');
  console.log('  ALINHAMENTO DE CURVAS DE GERAÇÃO COM ESTAÇÃO SOLARIMÉTRICA');
  console.log(`  Estação: ${estacao.nome} (${estacao.id})`);
  console.log('=================================================================\n');

  // Primeiro: Alinhar o dia 03/08/2026 explicitamente
  console.log('Reconstruindo e alinhando o dia 03/08/2026...');
  const res03Aug = await alignDayWithSigma('2026-08-03', estacao.id);
  console.log('Resultado 03/08/2026:', JSON.stringify(res03Aug, null, 2));

  // Segundo: Alinhar também dias de Agosto e Julho que tinham curvas sintéticas
  const datesToInspect = [
    '2026-08-01', '2026-08-02', '2026-08-04', '2026-08-05', '2026-08-06',
    '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11',
    '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16',
    '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
    '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26',
    '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31'
  ];

  for (const dStr of datesToInspect) {
    try {
      const res = await alignDayWithSigma(dStr, estacao.id);
      if (res.success) {
        console.log(`✅ ${dStr} -> ${res.points} pts | Max: ${res.maxP} kW | Energia: ${res.totalEnergy?.toFixed(1)} / ${res.targetEnergy} kWh`);
      } else {
        console.log(`⚠️ ${dStr} -> ${res.reason}`);
      }
    } catch (e: any) {
      console.error(`❌ ${dStr} -> Erro:`, e.message);
    }
  }

  console.log('\nAlinhamento concluído!');
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
