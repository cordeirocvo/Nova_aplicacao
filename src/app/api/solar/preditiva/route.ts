import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PvlibService } from '@/lib/services/pvlibService';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get('usinaId') || 'cmp8hqv4400h9wgv5c9f2tdbh'; // Default Manga Grande 01
    const dateStr = searchParams.get('date') || '2026-09-04'; // Default 04/09/2026

    // 1. Obter Usina
    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: { estacao: true },
    });

    if (!usina) {
      return NextResponse.json({ error: 'Usina não encontrada' }, { status: 404 });
    }

    const capacidadeKWp = usina.capacidadeKWp || 1400.0;
    const capacidadeCA = 1000.0; // 4 inversores SUN2000 = 1.000 kW CA nominal
    const latitude = usina.latitude ? Number(usina.latitude) : -15.15;
    const longitude = usina.longitude ? Number(usina.longitude) : -43.85;

    // 2. Buscar Dados da Estação Solarimétrica para a data (se houver)
    let meteoData: any[] = [];
    if (usina.estacaoId) {
      const startDay = new Date(`${dateStr}T00:00:00-03:00`);
      const endDay = new Date(`${dateStr}T23:59:59.999-03:00`);

      const telemetriasEst = await prisma.telemetriaEstacao.findMany({
        where: {
          estacaoId: usina.estacaoId,
          timestamp: { gte: startDay, lte: endDay },
        },
        orderBy: { timestamp: 'asc' },
      });

      meteoData = telemetriasEst.map((t) => ({
        timestamp: t.timestamp,
        ghi: t.ghi,
        poa: t.poa,
        tempAmbiente: t.tempAmbiente,
        tempModulos: t.tempModulos,
        velocidadeVento: t.velocidadeVento,
      }));
    }

    // 3. Executar Simulação Científica do Digital Twin pvlib
    const pvlibResult = await PvlibService.simulate({
      date: dateStr,
      latitude,
      longitude,
      capacidadeKWp,
      capacidadeCA,
      tilt: 15.0,
      azimuth: 0.0,
      meteo_data: meteoData,
    });

    // 4. Buscar Telemetria Real da Usina no Banco
    const startDayBRT = new Date(`${dateStr}T00:00:00-03:00`);
    const endDayBRT = new Date(`${dateStr}T23:59:59.999-03:00`);

    const telemetriasUsina = await prisma.telemetria.findMany({
      where: {
        usinaId,
        timestamp: { gte: startDayBRT, lte: endDayBRT },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Buscar meta diária se cadastrada
    const metricaDiaria = await prisma.metricaDiariaUsina.findFirst({
      where: {
        usinaId,
        data: { gte: startDayBRT, lte: endDayBRT },
      },
    });

    // 5. Consolidar Curvas e Pontos Reais
    const mapRealByTime = new Map<string, any>();
    let maxTempIGBT = 0;
    const stringSamples: Record<string, { sumI: number; count: number; lastV: number }> = {};

    for (const tel of telemetriasUsina) {
      const localTime = new Date(tel.timestamp.getTime() - 3 * 3600 * 1000);
      const timeStr = localTime.toISOString().substring(11, 16);
      mapRealByTime.set(timeStr, tel);

      if (tel.tempIGBT && tel.tempIGBT > maxTempIGBT) {
        maxTempIGBT = tel.tempIGBT;
      }

      // Amostrar strings durante horário de pico solar (10:00 às 14:00)
      const hour = localTime.getHours();
      if (hour >= 10 && hour <= 14 && tel.dadosStrings && typeof tel.dadosStrings === 'object') {
        const strings = tel.dadosStrings as Record<string, { V: number; I: number }>;
        for (const [key, val] of Object.entries(strings)) {
          if (!stringSamples[key]) {
            stringSamples[key] = { sumI: 0, count: 0, lastV: val.V };
          }
          stringSamples[key].sumI += val.I;
          stringSamples[key].count += 1;
          stringSamples[key].lastV = val.V;
        }
      }
    }

    // Calcular energia real do dia
    let energiaRealKWh = metricaDiaria?.energiaRealKWh || 0;
    if (energiaRealKWh <= 0 && telemetriasUsina.length > 0) {
      energiaRealKWh = telemetriasUsina.reduce((acc, t) => acc + (t.potenciaAtivaKW || 0) * (5 / 60), 0);
    }
    energiaRealKWh = parseFloat(energiaRealKWh.toFixed(2));

    // Montar curva combinada para o frontend: Real vs pvlib Expected vs Unclipped
    const combinedCurve = pvlibResult.curvaEsperada.map((pt) => {
      const realTel = mapRealByTime.get(pt.time);
      return {
        time: pt.time,
        realKW: realTel ? parseFloat(realTel.potenciaAtivaKW.toFixed(2)) : null,
        expectedKW: pt.expectedKW,
        unclippedKW: pt.unclippedKW,
        poa: pt.poa,
        cellTemp: pt.cellTemp,
      };
    });

    // 6. Decomposição de Perdas Prescinto (Loss Waterfall)
    const energiaEsperada = pvlibResult.energiaEsperadaKWh;
    const perdaCeifamento = pvlibResult.perdaCeifamentoKWh;
    const perdaTemperatura = pvlibResult.perdaTemperaturaKWh;

    // Diagnóstico String a String e perda por strings inativas
    const stringHealthList: Array<{
      stringName: string;
      inversor: string;
      correnteMedia: number;
      tensao: number;
      desvioPercent: number;
      status: 'NORMAL' | 'ALERTA_SUJIDADE' | 'FALHA_FUSIVEL' | 'DESCONECTADA';
    }> = [];

    const stringKeys = Object.keys(stringSamples);
    let totalStrings = stringKeys.length || 112; // 4 invs x 28 strings
    let stringsInativas = 0;

    if (stringKeys.length > 0) {
      // Calcular média geral de corrente
      const avgCurrents = stringKeys.map((k) => stringSamples[k].sumI / (stringSamples[k].count || 1));
      const overallAvgCurrent = avgCurrents.reduce((a, b) => a + b, 0) / (avgCurrents.length || 1);

      for (const key of stringKeys) {
        const s = stringSamples[key];
        const avgI = parseFloat((s.sumI / (s.count || 1)).toFixed(2));
        const dev = overallAvgCurrent > 0 ? parseFloat((((avgI - overallAvgCurrent) / overallAvgCurrent) * 100).toFixed(1)) : 0;

        let status: 'NORMAL' | 'ALERTA_SUJIDADE' | 'FALHA_FUSIVEL' | 'DESCONECTADA' = 'NORMAL';
        if (dev < -80 || avgI < 0.2) {
          status = 'DESCONECTADA';
          stringsInativas++;
        } else if (dev < -25) {
          status = 'FALHA_FUSIVEL';
        } else if (dev < -10) {
          status = 'ALERTA_SUJIDADE';
        }

        const invName = key.includes('_') ? key.split('_')[0] : 'INV01';
        stringHealthList.push({
          stringName: key,
          inversor: invName,
          correnteMedia: avgI,
          tensao: s.lastV,
          desvioPercent: dev,
          status,
        });
      }
    }

    // Perda estimada por strings desconectadas
    const fracStringsInativas = totalStrings > 0 ? stringsInativas / totalStrings : 0;
    const perdaStringsKWh = parseFloat((energiaEsperada * fracStringsInativas).toFixed(2));

    // Perda por Sujidade (Soiling)
    const gapGeracao = Math.max(0, energiaEsperada - energiaRealKWh);
    const perdaSujidadeKWh = parseFloat(Math.max(0, gapGeracao - perdaStringsKWh).toFixed(2));

    // Outras perdas / Sombras / Conexão
    const outrasPerdasKWh = parseFloat(Math.max(0, gapGeracao - perdaStringsKWh - perdaSujidadeKWh).toFixed(2));

    // Cascata de Perdas (Waterfall)
    const energiaTeoricaSTC = parseFloat((energiaEsperada + perdaCeifamento + perdaTemperatura).toFixed(2));
    const tarifaEnergia = 0.90; // R$/kWh médio
    const custoLavagemUsina = 4500.0; // Custo estimado para usina de 1.4 MWp

    const waterfall = [
      { etapa: 'Geração Teórica STC (Ideal)', valorKWh: energiaTeoricaSTC, tipo: 'base' },
      { etapa: 'Perda por Temperatura', valorKWh: -perdaTemperatura, tipo: 'perda', impactoRS: -(perdaTemperatura * tarifaEnergia) },
      { etapa: 'Perda por Ceifamento (Clipping)', valorKWh: -perdaCeifamento, tipo: 'perda', impactoRS: -(perdaCeifamento * tarifaEnergia) },
      { etapa: 'Perda por Sujidade (Soiling)', valorKWh: -perdaSujidadeKWh, tipo: 'perda', impactoRS: -(perdaSujidadeKWh * tarifaEnergia) },
      { etapa: 'Perda por Strings/Falhas', valorKWh: -perdaStringsKWh, tipo: 'perda', impactoRS: -(perdaStringsKWh * tarifaEnergia) },
      { etapa: 'Geração Real Entregue', valorKWh: energiaRealKWh, tipo: 'resultado', impactoRS: energiaRealKWh * tarifaEnergia },
    ];

    // 7. Otimizador Financeiro de Limpeza (Smart Cleaning Dispatcher)
    const perdaFinanceiraSujidadeDia = perdaSujidadeKWh * tarifaEnergia;
    const diasAteEquilibrioLavagem = perdaFinanceiraSujidadeDia > 50
      ? Math.round(custoLavagemUsina / perdaFinanceiraSujidadeDia)
      : 30;

    const recomendacaoLavagem =
      perdaFinanceiraSujidadeDia > 200
        ? { status: 'URGENTE', mensagem: `Perda por sujidade atinge R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia. Lavagem recomendada imediatamente.` }
        : perdaFinanceiraSujidadeDia > 80
        ? { status: 'PROGRAMAR', mensagem: `Perda de R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia. Ponto ótimo de lavagem em ${diasAteEquilibrioLavagem} dias.` }
        : { status: 'OK', mensagem: `Módulos em condições aceitáveis (perda de R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia). Nenhuma ação necessária no momento.` };

    // 8. Performance Ratio Real vs Esperado
    const prReal = metricaDiaria?.performanceRatioReal
      ? metricaDiaria.performanceRatioReal * 100
      : energiaRealKWh > 0 && pvlibResult.energiaEsperadaKWh > 0
      ? (energiaRealKWh / pvlibResult.energiaEsperadaKWh) * pvlibResult.prEsperado
      : 80.0;

    return NextResponse.json({
      success: true,
      usina: {
        id: usina.id,
        nome: usina.nome,
        capacidadeKWp,
        capacidadeCA,
        estacaoNome: usina.estacao?.nome || 'Estação Sigma',
      },
      data: dateStr,
      resumo: {
        energiaRealKWh,
        energiaEsperadaKWh: energiaEsperada,
        energiaTeoricaSTCKWh: energiaTeoricaSTC,
        performanceRatioReal: parseFloat(prReal.toFixed(1)),
        performanceRatioEsperado: pvlibResult.prEsperado,
        perdaTemperaturaKWh: perdaTemperatura,
        perdaCeifamentoKWh: perdaCeifamento,
        perdaSujidadeKWh,
        perdaStringsKWh,
        perdaFinanceiraDiariaRS: parseFloat((perdaSujidadeKWh * tarifaEnergia + perdaStringsKWh * tarifaEnergia).toFixed(2)),
        maxTempIGBT,
        statusEstresseTermico: maxTempIGBT > 75 ? 'ALERTA_AQUECIMENTO' : 'NORMAL',
        fonteMotor: pvlibResult.fonte,
      },
      otimizacaoLimpeza: {
        perdaDiariaRS: parseFloat(perdaFinanceiraSujidadeDia.toFixed(2)),
        custoLavagemEstimadoRS: custoLavagemUsina,
        diasSugeridosParaLavagem: diasAteEquilibrioLavagem,
        recomendacao: recomendacaoLavagem,
      },
      waterfall,
      curvaComparativa: combinedCurve,
      diagnosticoStrings: {
        totalMonitoradas: stringHealthList.length,
        inativas: stringsInativas,
        comAlerta: stringHealthList.filter((s) => s.status !== 'NORMAL').length,
        detalhes: stringHealthList.slice(0, 40), // Amostra das strings principais
      },
    });
  } catch (error: any) {
    console.error('Erro na API preditiva:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no cálculo preditivo' }, { status: 500 });
  }
}
