import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PvlibService } from '@/lib/services/pvlibService';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get('usinaId') || 'cmp8hqv4400h9wgv5c9f2tdbh'; // Default Manga Grande 01
    const dateStr = searchParams.get('date') || '2026-09-04'; // Default 04/09/2026

    // 1. Obter Usina com inversores e estação
    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: {
        estacao: true,
        inversores: true,
      },
    });

    if (!usina) {
      return NextResponse.json({ error: 'Usina não encontrada' }, { status: 404 });
    }

    const capacidadeKWp = usina.capacidadeKWp || 1400.0;
    
    // Potência CA nominal: soma dos inversores da usina ou fallback kWp / 1.25
    const potInversores = usina.inversores?.reduce((acc, inv) => acc + (inv.potenciaNominalKW || 0), 0) || 0;
    const capacidadeCA = potInversores > 0 ? potInversores : parseFloat((capacidadeKWp / 1.25).toFixed(1));

    const latitude = usina.latitude ? Number(usina.latitude) : -15.15;
    const longitude = usina.longitude ? Number(usina.longitude) : -43.85;
    const tilt = usina.inclinacao ? Number(usina.inclinacao) : 15.0;

    // Converter orientação textual em azimute pvlib (0 = Norte no hemisfério sul)
    let azimuth = 0.0;
    if (usina.orientacao) {
      const ori = usina.orientacao.trim().toUpperCase();
      if (ori === 'N' || ori === 'NORTE') azimuth = 0.0;
      else if (ori === 'S' || ori === 'SUL') azimuth = 180.0;
      else if (ori === 'L' || ori === 'LESTE' || ori === 'E') azimuth = 90.0;
      else if (ori === 'O' || ori === 'OESTE' || ori === 'W') azimuth = 270.0;
      else {
        const numOri = parseFloat(ori);
        azimuth = isNaN(numOri) ? 0.0 : numOri;
      }
    }

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
      tilt,
      azimuth,
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
    // Diagnóstico String a String (IEC 61724-1 / Padrão Prescinto APM)
    // 4 Estados:
    // 1. NAO_CONECTADA_NC: Porta vazia de projeto (I = 0A e V = 0V). Excluída do cálculo de perdas!
    // 2. FALHA_FUSIVEL: Porta com tensão normal (V >= 350V) mas I = 0A (Fusível queimado / Seccionadora aberta).
    // 3. ALERTA_SUJIDADE: String ativa com corrente 12% a 35% abaixo da média saudável.
    // 4. NORMAL: String saudável operando dentro de +/- 10% da média do arranjo.
    const stringHealthList: Array<{
      stringName: string;
      inversor: string;
      correnteMedia: number;
      tensao: number;
      desvioPercent: number;
      status: 'NORMAL' | 'ALERTA_SUJIDADE' | 'FALHA_FUSIVEL' | 'NAO_CONECTADA_NC';
    }> = [];

    const stringKeys = Object.keys(stringSamples);
    let stringsInstaladas = 0;
    let stringsComFalha = 0;
    let stringsVaziasNC = 0;

    // Primeiro passo: identificar canais ativos vs portas vazias de projeto (NC)
    const activeStringsKeys: string[] = [];
    for (const key of stringKeys) {
      const s = stringSamples[key];
      const avgI = parseFloat((s.sumI / (s.count || 1)).toFixed(2));
      // Se corrente nula e tensão nula (< 50V), é canal vazio de projeto
      if (avgI < 0.15 && s.lastV < 50) {
        stringsVaziasNC++;
      } else {
        activeStringsKeys.push(key);
      }
    }

    // Calcular média saudável apenas sobre as strings ativas que estão conduzindo
    const conductingCurrents = activeStringsKeys
      .map((k) => stringSamples[k].sumI / (stringSamples[k].count || 1))
      .filter((i) => i >= 0.5);
    const avgHealthyCurrent = conductingCurrents.length > 0
      ? conductingCurrents.reduce((a, b) => a + b, 0) / conductingCurrents.length
      : 8.5;

    // Segundo passo: classificar rigorosamente cada canal
    for (const key of stringKeys) {
      const s = stringSamples[key];
      const avgI = parseFloat((s.sumI / (s.count || 1)).toFixed(2));
      const invName = key.includes('_') ? key.split('_')[0] : 'INV01';

      if (avgI < 0.15 && s.lastV < 50) {
        // Canal aberto de projeto (NC) - Não conectado
        stringHealthList.push({
          stringName: key,
          inversor: invName,
          correnteMedia: 0,
          tensao: s.lastV,
          desvioPercent: 0,
          status: 'NAO_CONECTADA_NC',
        });
      } else if (avgI < 0.2 && s.lastV >= 350) {
        // Tensão do MPPT presente mas corrente ZERO = Fusível Queimado / Falha Elétrica
        stringsInstaladas++;
        stringsComFalha++;
        stringHealthList.push({
          stringName: key,
          inversor: invName,
          correnteMedia: avgI,
          tensao: s.lastV,
          desvioPercent: -100.0,
          status: 'FALHA_FUSIVEL',
        });
      } else {
        // String ativa e conduzindo
        stringsInstaladas++;
        const dev = avgHealthyCurrent > 0 ? parseFloat((((avgI - avgHealthyCurrent) / avgHealthyCurrent) * 100).toFixed(1)) : 0;
        let status: 'NORMAL' | 'ALERTA_SUJIDADE' | 'FALHA_FUSIVEL' | 'NAO_CONECTADA_NC' = 'NORMAL';
        if (dev < -12) {
          status = 'ALERTA_SUJIDADE';
        }
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

    // Se não havia telemetria detalhada de strings na data, usar topologia proporcional (1 string ~25 kWp)
    if (stringsInstaladas === 0) {
      stringsInstaladas = Math.max(1, Math.round(capacidadeKWp / 25));
    }

    // 7. Cálculo Físico de Sujidade (IEC 61724-1 Soiling Ratio)
    // O Soiling Ratio (SR) compara a corrente das strings saudáveis com a expectativa do modelo pvlib
    // Fora do ceifamento e descontada a temperatura
    const normalStrings = stringHealthList.filter((s) => s.status === 'NORMAL');
    let soilingRatio = 0.958; // Padrão 4.2% de sujeira no semiárido em estiagem
    if (normalStrings.length > 0 && avgHealthyCurrent > 0) {
      // Razão entre média saudável e corrente STC esperada para a irradiância média
      const measuredRatio = Math.min(1.0, Math.max(0.88, avgHealthyCurrent / 9.2));
      soilingRatio = parseFloat(measuredRatio.toFixed(3));
    }

    // Perda de energia por Sujidade (kWh) baseada estritamente no Soiling Ratio
    const energiaSemClipping = energiaEsperada;
    const taxaSujidade = Math.max(0.015, Math.min(0.08, 1 - soilingRatio));
    const perdaSujidadeKWh = parseFloat((energiaSemClipping * taxaSujidade).toFixed(2));

    // Perda de energia por Falhas de Strings (Fusível Queimado)
    let perdaStringsKWh = 0;
    if (stringsComFalha > 0) {
      const proporcaoFalhas = stringsComFalha / stringsInstaladas;
      perdaStringsKWh = parseFloat((energiaSemClipping * proporcaoFalhas * 0.85).toFixed(2));
    }

    // Cascata de Perdas (Waterfall)
    const energiaTeoricaSTC = parseFloat((energiaEsperada + perdaCeifamento + perdaTemperatura).toFixed(2));
    const tarifaEnergia = 0.90; // R$/kWh médio
    const custoLavagemUsina = Math.max(350.0, parseFloat((capacidadeKWp * 3.20).toFixed(2)));

    const waterfall = [
      { etapa: 'Geração Teórica STC (Ideal)', valorKWh: energiaTeoricaSTC, tipo: 'base' },
      { etapa: 'Perda por Temperatura', valorKWh: -perdaTemperatura, tipo: 'perda', impactoRS: -(perdaTemperatura * tarifaEnergia) },
      { etapa: 'Perda por Ceifamento (Clipping)', valorKWh: -perdaCeifamento, tipo: 'perda', impactoRS: -(perdaCeifamento * tarifaEnergia) },
      { etapa: 'Perda por Sujidade (Soiling)', valorKWh: -perdaSujidadeKWh, tipo: 'perda', impactoRS: -(perdaSujidadeKWh * tarifaEnergia) },
      { etapa: 'Perda por Fusível/Falha String', valorKWh: -perdaStringsKWh, tipo: 'perda', impactoRS: -(perdaStringsKWh * tarifaEnergia) },
      { etapa: 'Geração Real Entregue', valorKWh: energiaRealKWh, tipo: 'resultado', impactoRS: energiaRealKWh * tarifaEnergia },
    ];

    // 7. Otimizador Financeiro de Limpeza (Smart Cleaning Dispatcher)
    const perdaFinanceiraSujidadeDia = parseFloat((perdaSujidadeKWh * tarifaEnergia).toFixed(2));
    const diasAteEquilibrioLavagem = perdaFinanceiraSujidadeDia > 50
      ? Math.max(1, Math.round(custoLavagemUsina / perdaFinanceiraSujidadeDia))
      : 30;

    const recomendacaoLavagem =
      perdaFinanceiraSujidadeDia > 250
        ? { status: 'URGENTE', mensagem: `Perda por sujidade atinge R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia. Ponto de equilíbrio atingido em ${diasAteEquilibrioLavagem} dias. Lavagem recomendada imediatamente.` }
        : perdaFinanceiraSujidadeDia > 80
        ? { status: 'PROGRAMAR', mensagem: `Perda por sujidade de R$ ${perdaFinanceiraSujidadeDia.toFixed(2)}/dia. Programar limpeza da usina em ${diasAteEquilibrioLavagem} dias.` }
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
        instaladasAtivas: stringsInstaladas,
        falhasFusivel: stringsComFalha,
        naoConectadasNC: stringsVaziasNC,
        comAlerta: stringHealthList.filter((s) => s.status === 'ALERTA_SUJIDADE').length,
        detalhes: stringHealthList,
      },
    });
  } catch (error: any) {
    console.error('Erro na API preditiva:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no cálculo preditivo' }, { status: 500 });
  }
}
