import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';
import { HuaweiIntegration } from "@/lib/services/huaweiIntegration";
import { pvlibSimulate } from "@/lib/engenharia/solarEngine";

// Fuso horário BRT = UTC-3
function getTodayBRT() {
  const now = new Date();
  const brtOffset = -3 * 60 * 60 * 1000;
  const brtNow = new Date(now.getTime() + brtOffset);
  brtNow.setUTCHours(0, 0, 0, 0);
  return brtNow;
}

export async function POST(req: Request) {
  try {
    const { usinaId } = await req.json();
    if (!usinaId) {
      return NextResponse.json({ error: "ID da usina é obrigatório" }, { status: 400 });
    }
    const analise = await HuaweiIntegration.calculateLosses(usinaId);
    return NextResponse.json(analise);
  } catch (error: any) {
    console.error("Erro na análise solar:", error);
    return NextResponse.json({ error: "Falha ao processar análise preditiva" }, { status: 500 });
  }
}

interface CacheEntry {
  timestamp: number;
  data: any;
}

const apiCache: Record<string, CacheEntry> = {};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    const range = searchParams.get("range") || "24h";
    const cacheKey = `${usinaId || "consolidado"}_${range}`;

    // Verificar cache local (1 minuto TTL)
    const cached = apiCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < 60 * 1000)) {
      return NextResponse.json(cached.data);
    }

    // Base date para os gráficos de últimas 24 horas (96 pontos de 15 minutos)
    const nowTime = Date.now();
    const roundedNow = new Date(Math.floor(nowTime / (15 * 60 * 1000)) * (15 * 60 * 1000));
    const baseDate = new Date(roundedNow.getTime() - 24 * 60 * 60 * 1000);

    // ── Filtros Dinâmicos de Períodos Maiores (7d e 30d) ───────────────────
    if (range === "7d" || range === "30d") {
      const daysCount = range === "7d" ? 7 : 30;
      const daysArray: any[] = [];
      const now = new Date();

      for (let i = daysCount - 1; i >= 0; i--) {
        const dStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(dStart.getTime() + 24 * 60 * 60 * 1000);

        let telemetriasDoDia;
        if (!usinaId || usinaId === "consolidado") {
          telemetriasDoDia = await prisma.telemetria.findMany({
            where: { timestamp: { gte: dStart, lt: dEnd } },
            orderBy: { timestamp: "asc" }
          });
        } else {
          telemetriasDoDia = await prisma.telemetria.findMany({
            where: { usinaId, timestamp: { gte: dStart, lt: dEnd } },
            orderBy: { timestamp: "asc" }
          });
        }

        const dateStr = dStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        let actual = 0;

        if (telemetriasDoDia.length > 0) {
          if (usinaId && usinaId !== "consolidado") {
            const minEng = telemetriasDoDia[0].energiaAcumuladaKWh;
            const maxEng = telemetriasDoDia[telemetriasDoDia.length - 1].energiaAcumuladaKWh;
            actual = Math.max(0, maxEng - minEng);
            if (actual === 0 || actual > 500) {
              actual = telemetriasDoDia.reduce((acc, curr) => acc + (curr.potenciaAtivaKW * 5 / 60), 0);
            }
          } else {
            const usinasMap: Record<string, number> = {};
            const usinasMinMap: Record<string, number> = {};
            telemetriasDoDia.forEach(t => {
              if (usinasMinMap[t.usinaId] === undefined) {
                usinasMinMap[t.usinaId] = t.energiaAcumuladaKWh;
              }
              usinasMap[t.usinaId] = t.energiaAcumuladaKWh;
            });
            Object.keys(usinasMap).forEach(uid => {
              const diff = Math.max(0, usinasMap[uid] - usinasMinMap[uid]);
              actual += diff > 500 ? 0 : diff;
            });
            if (actual === 0) {
              actual = telemetriasDoDia.reduce((acc, curr) => acc + (curr.potenciaAtivaKW * 5 / 60), 0);
            }
          }
        }

        // HSP estimado (média 4.2h por dia * rendimento médio 80%)
        const cap = usinaId && usinaId !== "consolidado"
          ? (await prisma.usina.findUnique({ where: { id: usinaId } }))?.capacidadeKWp || 24
          : (await prisma.usina.findMany()).reduce((acc, u) => acc + u.capacidadeKWp, 0);

        const expected = cap * 4.2 * 0.8;

        daysArray.push({
          time: dateStr,
          actual: parseFloat(actual.toFixed(1)),
          expected: parseFloat(expected.toFixed(1))
        });
      }

      if (!usinaId || usinaId === "consolidado") {
        const usinas = await prisma.usina.findMany({
          include: {
            telemetria: { orderBy: { timestamp: "desc" }, take: 1 },
            analises: { orderBy: { dataAnalise: "desc" }, take: 1 }
          }
        });

        const totalKwp = usinas.reduce((acc, u) => acc + u.capacidadeKWp, 0);
        const potenciaAtual = usinas.reduce((acc, u) => acc + (u.telemetria[0]?.potenciaAtivaKW || 0), 0);
        const todayStart = getTodayBRT();
        const geracaoHojeTotal = await prisma.telemetria.findMany({
          where: {
            timestamp: { gte: todayStart },
            usinaId: { in: usinas.map(u => u.id) }
          },
          orderBy: { timestamp: 'desc' },
          distinct: ['usinaId'],
        });
        const geracaoHoje = geracaoHojeTotal.reduce((acc, t) => acc + (t.energiaAcumuladaKWh || 0), 0);
        const prGlobal = totalKwp > 0 ? ((potenciaAtual / totalKwp) * 100 * 1.25).toFixed(1) : "0.0";

        const telemetriaHistoricoConsolidado = await prisma.telemetria.findMany({
          where: { usinaId: { in: usinas.map(u => u.id) } },
          orderBy: { timestamp: "desc" },
          take: 100
        });

        const latestTelemetriaCadaUsina = await Promise.all(
          usinas.map(async (u) => {
            return prisma.telemetria.findFirst({
              where: { usinaId: u.id },
              orderBy: { timestamp: "desc" }
            });
          })
        );

        const validTeles = latestTelemetriaCadaUsina.filter(Boolean) as any[];
        const combinedStrings: Record<string, any> = {};
        let totalTempIGBT = 0;
        let countTempIGBT = 0;
        let avgPhaseV = { a: 0, b: 0, c: 0 };
        let sumPhaseI = { a: 0, b: 0, c: 0 };
        let sumPhaseP = { a: 0, b: 0, c: 0 };

        for (const t of validTeles) {
          let stringsObj = t.dadosStrings && typeof t.dadosStrings === 'object' ? t.dadosStrings : {};
          if (Object.keys(stringsObj).length === 0) {
            const histWithStrings = await prisma.telemetria.findFirst({
              where: { usinaId: t.usinaId, NOT: { dadosStrings: {} } },
              orderBy: { timestamp: "desc" }
            });
            if (histWithStrings?.dadosStrings && typeof histWithStrings.dadosStrings === 'object') {
              stringsObj = histWithStrings.dadosStrings;
            }
          }

          const usinaNome = usinas.find(u => u.id === t.usinaId)?.nome || "Usina";
          Object.entries(stringsObj).forEach(([key, val]: any) => {
            combinedStrings[`${usinaNome.substring(0, 5)}_${key}`] = val;
          });

          if (t.tempIGBT) {
            totalTempIGBT += t.tempIGBT;
            countTempIGBT++;
          }

          avgPhaseV.a += t.tensaoCA_A || 0;
          avgPhaseV.b += t.tensaoCA_B || 0;
          avgPhaseV.c += t.tensaoCA_C || 0;

          sumPhaseI.a += t.correnteCA_A || 0;
          sumPhaseI.b += t.correnteCA_B || 0;
          sumPhaseI.c += t.correnteCA_C || 0;

          sumPhaseP.a += (t.potenciaAtivaKW || 0) / 3;
          sumPhaseP.b += (t.potenciaAtivaKW || 0) / 3;
          sumPhaseP.c += (t.potenciaAtivaKW || 0) / 3;
        }

        const numUsinasComTele = validTeles.length || 1;
        avgPhaseV.a = avgPhaseV.a / numUsinasComTele;
        avgPhaseV.b = avgPhaseV.b / numUsinasComTele;
        avgPhaseV.c = avgPhaseV.c / numUsinasComTele;

        const resData = {
          nome: "VISÃO GLOBAL",
          potenciaAtual,
          potenciaPico: totalKwp,
          geracaoHoje,
          pr: Math.min(parseFloat(prGlobal), 100),
          health: 98.5,
          irradiancia: validTeles[0]?.irradiancia || 0,
          tempAmbiente: validTeles[0]?.tempAmbiente || 0,
          tempModulos: validTeles[0]?.tempModulos || 0,
          vento: 0,
          telemetrias: telemetriaHistoricoConsolidado.map(t => ({
            id: t.id,
            timestamp: t.timestamp,
            potenciaAtivaKW: t.potenciaAtivaKW,
            energiaAcumuladaKWh: t.energiaAcumuladaKWh,
            irradiancia: t.irradiancia,
            tempAmbiente: t.tempAmbiente,
            tempModulos: t.tempModulos,
            dadosStrings: t.dadosStrings,
            tensaoCA_A: t.tensaoCA_A,
            tensaoCA_B: t.tensaoCA_B,
            tensaoCA_C: t.tensaoCA_C,
            correnteCA_A: t.correnteCA_A,
            correnteCA_B: t.correnteCA_B,
            correnteCA_C: t.correnteCA_C,
            tempIGBT: t.tempIGBT
          })),
          detalhesCA: {
            faseA: { V: avgPhaseV.a, I: sumPhaseI.a, P: sumPhaseP.a },
            faseB: { V: avgPhaseV.b, I: sumPhaseI.b, P: sumPhaseP.b },
            faseC: { V: avgPhaseV.c, I: sumPhaseI.c, P: sumPhaseP.c }
          },
          tempIGBT: countTempIGBT > 0 ? totalTempIGBT / countTempIGBT : 45,
          dadosStrings: combinedStrings,
          alarmes: [],
          curvaGeracao: daysArray
        };

        apiCache[cacheKey] = { timestamp: Date.now(), data: resData };
        return NextResponse.json(resData);
      } else {
        const usina = await prisma.usina.findUnique({
          where: { id: usinaId },
          include: {
            analises: { orderBy: { dataAnalise: "desc" }, take: 1 },
            estacao: true
          }
        });

        if (!usina) return NextResponse.json({ error: "Usina não encontrada" }, { status: 404 });

        const telemetriaHistorico = await prisma.telemetria.findMany({
          where: { usinaId },
          orderBy: { timestamp: "desc" },
          take: 100
        });

        const latest = telemetriaHistorico[0];
        const analise = usina.analises[0];

        const alarmesAtivos = await prisma.alarme.findMany({
          where: { usinaId, status: "ATIVO" },
          orderBy: { timestamp: "desc" }
        });

        const geracaoHoje = latest?.energiaAcumuladaKWh ?? 0;
        const potenciaAtual = latest?.potenciaAtivaKW ?? 0;

        const pr = usina.capacidadeKWp > 0 && potenciaAtual > 0
          ? ((potenciaAtual / usina.capacidadeKWp) * 100 * 1.25).toFixed(1)
          : analise?.performanceRatio
            ? (analise.performanceRatio * 100).toFixed(1)
            : "0.0";

        const latestWithStrings = telemetriaHistorico.find(t => 
          t.dadosStrings && typeof t.dadosStrings === 'object' && Object.keys(t.dadosStrings).length > 0
        );
        const dadosStrings = latest?.dadosStrings && Object.keys(latest.dadosStrings).length > 0
          ? latest.dadosStrings
          : latestWithStrings?.dadosStrings || {};

        const resData = {
          nome: usina.nome,
          potenciaAtual,
          potenciaPico: usina.capacidadeKWp,
          geracaoHoje,
          pr: Math.min(parseFloat(pr.toString()), 100),
          health: 98.2,
          irradiancia: latest?.irradiancia || 0,
          tempAmbiente: latest?.tempAmbiente || 0,
          tempModulos: latest?.tempModulos || 0,
          vento: 0,
          telemetrias: telemetriaHistorico.map(t => ({
            id: t.id,
            timestamp: t.timestamp,
            potenciaAtivaKW: t.potenciaAtivaKW,
            energiaAcumuladaKWh: t.energiaAcumuladaKWh,
            irradiancia: t.irradiancia,
            tempAmbiente: t.tempAmbiente,
            tempModulos: t.tempModulos,
            dadosStrings: t.dadosStrings,
            tensaoCA_A: t.tensaoCA_A,
            tensaoCA_B: t.tensaoCA_B,
            tensaoCA_C: t.tensaoCA_C,
            correnteCA_A: t.correnteCA_A,
            correnteCA_B: t.correnteCA_B,
            correnteCA_C: t.correnteCA_C,
            tempIGBT: t.tempIGBT
          })),
          detalhesCA: {
            faseA: { V: latest?.tensaoCA_A || 0, I: latest?.correnteCA_A || 0, P: potenciaAtual / 3 },
            faseB: { V: latest?.tensaoCA_B || 0, I: latest?.correnteCA_B || 0, P: potenciaAtual / 3 },
            faseC: { V: latest?.tensaoCA_C || 0, I: latest?.correnteCA_C || 0, P: potenciaAtual / 3 }
          },
          tempIGBT: latest?.tempIGBT || 0,
          dadosStrings,
          alarmes: alarmesAtivos.map(a => ({
            id: a.id,
            codigo: a.codigo,
            descricao: a.descricao,
            gravidade: a.gravidade,
            solucao: a.solucaoSugerida,
            timestamp: a.timestamp
          })),
          estacao: usina.estacao ? { nome: usina.estacao.nome, id: usina.estacao.id } : null,
          curvaGeracao: daysArray
        };

        apiCache[cacheKey] = { timestamp: Date.now(), data: resData };
        return NextResponse.json(resData);
      }
    }

    if (!usinaId || usinaId === "consolidado") {
      const usinas = await prisma.usina.findMany({
        include: {
          telemetria: { orderBy: { timestamp: "desc" }, take: 1 },
          analises: { orderBy: { dataAnalise: "desc" }, take: 1 }
        }
      });

      const totalKwp = usinas.reduce((acc, u) => acc + u.capacidadeKWp, 0);
      const potenciaAtual = usinas.reduce((acc, u) => acc + (u.telemetria[0]?.potenciaAtivaKW || 0), 0);
      
      const todayStart = getTodayBRT();
      const geracaoHojeTotal = await prisma.telemetria.findMany({
        where: {
          timestamp: { gte: todayStart },
          usinaId: { in: usinas.map(u => u.id) }
        },
        orderBy: { timestamp: 'desc' },
        distinct: ['usinaId'],
      });
      const geracaoHoje = geracaoHojeTotal.reduce((acc, t) => acc + (t.energiaAcumuladaKWh || 0), 0);

      const prGlobal = totalKwp > 0 ? ((potenciaAtual / totalKwp) * 100 * 1.25).toFixed(1) : "0.0";
      
      // Busca telemetrias de 24h para todas as usinas para consolidar a curva
      const telemetriaTodas = await prisma.telemetria.findMany({
        where: {
          timestamp: { gte: baseDate },
          usinaId: { in: usinas.map(u => u.id) }
        },
        orderBy: { timestamp: "asc" }
      });

      const curvaGlobal: any[] = [];

      // Gerar pontos a cada 15 minutos para cobrir as últimas 24 horas (96 pontos)
      for (let i = 0; i < 96; i++) {
        const slotTime = new Date(baseDate.getTime() + i * 15 * 60 * 1000);
        const timeStr = slotTime.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });

        // Filtrar telemetrias próximas a este slot (+/- 7.5 min)
        const telemetriasNoSlot = telemetriaTodas.filter(t => {
          const diffMin = Math.abs(new Date(t.timestamp).getTime() - slotTime.getTime()) / (60 * 1000);
          return diffMin <= 7.5;
        });

        let actualSum = 0;
        let expectedSum = 0;
        let hasTelemetry = false;

        for (const u of usinas) {
          const tUsina = telemetriasNoSlot.find(t => t.usinaId === u.id);
          if (tUsina) {
            actualSum += tUsina.potenciaAtivaKW;
            hasTelemetry = true;
          }

          let irr = tUsina?.irradiancia || 0;
          if (irr === 0) {
            const hour = slotTime.getHours();
            if (hour >= 6 && hour <= 18) {
              const peakIrr = 800;
              const x = (hour - 12) / 3;
              irr = Math.max(0, peakIrr * Math.exp(-x * x));
            }
          }

          const expectedVal = pvlibSimulate({
            timestamp: slotTime,
            irradianciaGHI: irr,
            tempAmbiente: tUsina?.tempAmbiente || 25,
            tempModulos: tUsina?.tempModulos,
            capacidadeKWp: u.capacidadeKWp,
            inclinacao: u.inclinacao || 10,
            orientacao: u.orientacao ? (isNaN(parseFloat(u.orientacao)) ? 180 : parseFloat(u.orientacao)) : 180,
            coefTemperatura: u.coefTemperatura || -0.0035,
            coefSujidade: u.coefSujidade || 0.03
          });
          expectedSum += expectedVal;
        }

        let actualValue: number | null = null;
        if (hasTelemetry) {
          actualValue = parseFloat(actualSum.toFixed(2));
        } else if (slotTime.getTime() > nowTime) {
          actualValue = null; // Recharts interrompe a linha real no horário atual
        } else {
          actualValue = 0;
        }

        curvaGlobal.push({
          time: timeStr,
          actual: actualValue,
          expected: parseFloat(expectedSum.toFixed(2))
        });
      }

      // Buscar histórico completo consolidado (últimas 24h de todas as usinas)
      const telemetriaHistoricoConsolidado = await prisma.telemetria.findMany({
        where: {
          usinaId: { in: usinas.map(u => u.id) }
        },
        orderBy: { timestamp: "desc" },
        take: 100
      });

      // Obter a última telemetria de cada usina para consolidar CA e Strings
      const latestTelemetriaCadaUsina = await Promise.all(
        usinas.map(async (u) => {
          return prisma.telemetria.findFirst({
            where: { usinaId: u.id },
            orderBy: { timestamp: "desc" }
          });
        })
      );

      const validTeles = latestTelemetriaCadaUsina.filter(Boolean) as any[];
      const combinedStrings: Record<string, any> = {};
      let totalTempIGBT = 0;
      let countTempIGBT = 0;
      let avgPhaseV = { a: 0, b: 0, c: 0 };
      let sumPhaseI = { a: 0, b: 0, c: 0 };
      let sumPhaseP = { a: 0, b: 0, c: 0 };

      for (const t of validTeles) {
        let stringsObj = t.dadosStrings && typeof t.dadosStrings === 'object' ? t.dadosStrings : {};
        if (Object.keys(stringsObj).length === 0) {
          // Fallback para último com strings válidas na história dessa usina específica
          const histWithStrings = await prisma.telemetria.findFirst({
            where: { 
              usinaId: t.usinaId,
              NOT: { dadosStrings: {} }
            },
            orderBy: { timestamp: "desc" }
          });
          if (histWithStrings?.dadosStrings && typeof histWithStrings.dadosStrings === 'object') {
            stringsObj = histWithStrings.dadosStrings;
          }
        }

        const usinaNome = usinas.find(u => u.id === t.usinaId)?.nome || "Usina";
        Object.entries(stringsObj).forEach(([key, val]: any) => {
          // Identificador amigável de String combinando o nome da Usina
          combinedStrings[`${usinaNome.substring(0, 5)}_${key}`] = val;
        });

        if (t.tempIGBT) {
          totalTempIGBT += t.tempIGBT;
          countTempIGBT++;
        }

        avgPhaseV.a += t.tensaoCA_A || 0;
        avgPhaseV.b += t.tensaoCA_B || 0;
        avgPhaseV.c += t.tensaoCA_C || 0;

        sumPhaseI.a += t.correnteCA_A || 0;
        sumPhaseI.b += t.correnteCA_B || 0;
        sumPhaseI.c += t.correnteCA_C || 0;

        sumPhaseP.a += (t.potenciaAtivaKW || 0) / 3;
        sumPhaseP.b += (t.potenciaAtivaKW || 0) / 3;
        sumPhaseP.c += (t.potenciaAtivaKW || 0) / 3;
      }

      const numUsinasComTele = validTeles.length || 1;
      avgPhaseV.a = avgPhaseV.a / numUsinasComTele;
      avgPhaseV.b = avgPhaseV.b / numUsinasComTele;
      avgPhaseV.c = avgPhaseV.c / numUsinasComTele;

      const resPayload = {
        nome: "VISÃO GLOBAL",
        potenciaAtual,
        potenciaPico: totalKwp,
        geracaoHoje,
        pr: Math.min(parseFloat(prGlobal), 100),
        health: 98.5,
        irradiancia: validTeles[0]?.irradiancia || 0,
        tempAmbiente: validTeles[0]?.tempAmbiente || 0,
        tempModulos: validTeles[0]?.tempModulos || 0,
        vento: 0,
        
        telemetrias: telemetriaHistoricoConsolidado.map(t => ({
          id: t.id,
          timestamp: t.timestamp,
          potenciaAtivaKW: t.potenciaAtivaKW,
          energiaAcumuladaKWh: t.energiaAcumuladaKWh,
          irradiancia: t.irradiancia,
          tempAmbiente: t.tempAmbiente,
          tempModulos: t.tempModulos,
          dadosStrings: t.dadosStrings,
          tensaoCA_A: t.tensaoCA_A,
          tensaoCA_B: t.tensaoCA_B,
          tensaoCA_C: t.tensaoCA_C,
          correnteCA_A: t.correnteCA_A,
          correnteCA_B: t.correnteCA_B,
          correnteCA_C: t.correnteCA_C,
          tempIGBT: t.tempIGBT
        })),

        detalhesCA: {
          faseA: { V: avgPhaseV.a, I: sumPhaseI.a, P: sumPhaseP.a },
          faseB: { V: avgPhaseV.b, I: sumPhaseI.b, P: sumPhaseP.b },
          faseC: { V: avgPhaseV.c, I: sumPhaseI.c, P: sumPhaseP.c }
        },
        tempIGBT: countTempIGBT > 0 ? totalTempIGBT / countTempIGBT : 45,
        dadosStrings: combinedStrings,
        alarmes: [],
        curvaGeracao: curvaGlobal
      };

      apiCache[cacheKey] = { timestamp: Date.now(), data: resPayload };
      return NextResponse.json(resPayload);
    }

    // ── Usina específica ───────────────────────────────────────────────
    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: {
        analises: { orderBy: { dataAnalise: "desc" }, take: 1 },
        estacao: true
      }
    });

    if (!usina) return NextResponse.json({ error: "Usina não encontrada" }, { status: 404 });

    const todayStart = getTodayBRT();
    
    // Busca telemetrias da usina nas últimas 24 horas (intervalos de 5 minutos)
    const telemetriaHoje = await prisma.telemetria.findMany({
      where: { 
        usinaId,
        timestamp: { gte: baseDate }
      },
      orderBy: { timestamp: "asc" }
    });

    // Histórico de auditoria técnica (últimos 100 registros em ordem decrescente)
    const telemetriaHistorico = await prisma.telemetria.findMany({
      where: { usinaId },
      orderBy: { timestamp: "desc" },
      take: 100
    });

    const latest = telemetriaHistorico[0];
    const analise = usina.analises[0];

    const alarmesAtivos = await prisma.alarme.findMany({
      where: { usinaId, status: "ATIVO" },
      orderBy: { timestamp: "desc" }
    });

    if (!latest) {
      const resPayloadEmpty = {
        nome: usina.nome,
        potenciaAtual: 0,
        potenciaPico: usina.capacidadeKWp,
        geracaoHoje: 0,
        pr: 0,
        health: 0,
        irradiancia: 0,
        tempAmbiente: 0,
        tempModulos: 0,
        alarmes: [],
        mensagem: "Aguardando sincronização de telemetria",
        curvaGeracao: [],
        telemetrias: []
      };
      apiCache[cacheKey] = { timestamp: Date.now(), data: resPayloadEmpty };
      return NextResponse.json(resPayloadEmpty);
    }

    const geracaoHoje = latest?.energiaAcumuladaKWh ?? 0;
    const potenciaAtual = latest?.potenciaAtivaKW ?? 0;

    const pr = usina.capacidadeKWp > 0 && potenciaAtual > 0
      ? ((potenciaAtual / usina.capacidadeKWp) * 100 * 1.25).toFixed(1)
      : analise?.performanceRatio
        ? (analise.performanceRatio * 100).toFixed(1)
        : "0.0";

    // Curva de geração completa de 24 horas (96 pontos de 15 minutos)
    const curvaHoje: any[] = [];

    for (let i = 0; i < 96; i++) {
      const slotTime = new Date(baseDate.getTime() + i * 15 * 60 * 1000);
      const timeStr = slotTime.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });

      // Encontrar telemetria correspondente (+/- 7.5 min)
      const telemetryInSlot = telemetriaHoje.find(t => {
        const diffMin = Math.abs(new Date(t.timestamp).getTime() - slotTime.getTime()) / (60 * 1000);
        return diffMin <= 7.5;
      });

      let actual: number | null = null;
      if (telemetryInSlot) {
        actual = parseFloat(telemetryInSlot.potenciaAtivaKW.toFixed(2));
      } else if (slotTime.getTime() > nowTime) {
        actual = null; // Linha real interrompida no horário atual
      } else {
        actual = 0;
      }

      let irr = telemetryInSlot?.irradiancia || 0;
      if (irr === 0) {
        const hour = slotTime.getHours();
        if (hour >= 6 && hour <= 18) {
          const peakIrr = 800;
          const x = (hour - 12) / 3;
          irr = Math.max(0, peakIrr * Math.exp(-x * x));
        }
      }

      const expectedVal = pvlibSimulate({
        timestamp: slotTime,
        irradianciaGHI: irr,
        tempAmbiente: telemetryInSlot?.tempAmbiente || 25,
        tempModulos: telemetryInSlot?.tempModulos,
        capacidadeKWp: usina.capacidadeKWp,
        inclinacao: usina.inclinacao || 10,
        orientacao: usina.orientacao ? (isNaN(parseFloat(usina.orientacao)) ? 180 : parseFloat(usina.orientacao)) : 180,
        coefTemperatura: usina.coefTemperatura || -0.0035,
        coefSujidade: usina.coefSujidade || 0.03
      });

      curvaHoje.push({
        time: timeStr,
        actual,
        expected: parseFloat(expectedVal.toFixed(2))
      });
    }

    // Buscar o último registro de telemetria que contém dados de strings válidos se o mais recente estiver vazio (noite)
    const latestWithStrings = telemetriaHistorico.find(t => 
      t.dadosStrings && typeof t.dadosStrings === 'object' && Object.keys(t.dadosStrings).length > 0
    );
    const dadosStrings = latest?.dadosStrings && Object.keys(latest.dadosStrings).length > 0
      ? latest.dadosStrings
      : latestWithStrings?.dadosStrings || {};

    const resPayload = {
      nome: usina.nome,
      potenciaAtual,
      potenciaPico: usina.capacidadeKWp,
      geracaoHoje,
      pr: Math.min(parseFloat(pr.toString()), 100),
      health: 98.2,
      irradiancia: latest?.irradiancia || 0,
      tempAmbiente: latest?.tempAmbiente || 0,
      tempModulos: latest?.tempModulos || 0,
      vento: 0,
      
      telemetrias: telemetriaHistorico.map(t => ({
        id: t.id,
        timestamp: t.timestamp,
        potenciaAtivaKW: t.potenciaAtivaKW,
        energiaAcumuladaKWh: t.energiaAcumuladaKWh,
        irradiancia: t.irradiancia,
        tempAmbiente: t.tempAmbiente,
        tempModulos: t.tempModulos,
        dadosStrings: t.dadosStrings,
        tensaoCA_A: t.tensaoCA_A,
        tensaoCA_B: t.tensaoCA_B,
        tensaoCA_C: t.tensaoCA_C,
        correnteCA_A: t.correnteCA_A,
        correnteCA_B: t.correnteCA_B,
        correnteCA_C: t.correnteCA_C,
        tempIGBT: t.tempIGBT
      })),

      detalhesCA: {
        faseA: { V: latest?.tensaoCA_A || 0, I: latest?.correnteCA_A || 0, P: potenciaAtual / 3 },
        faseB: { V: latest?.tensaoCA_B || 0, I: latest?.correnteCA_B || 0, P: potenciaAtual / 3 },
        faseC: { V: latest?.tensaoCA_C || 0, I: latest?.correnteCA_C || 0, P: potenciaAtual / 3 }
      },
      tempIGBT: latest?.tempIGBT || 0,
      dadosStrings,
      alarmes: alarmesAtivos.map(a => ({
        id: a.id,
        codigo: a.codigo,
        descricao: a.descricao,
        gravidade: a.gravidade,
        solucao: a.solucaoSugerida,
        timestamp: a.timestamp
      })),
      estacao: usina.estacao ? { nome: usina.estacao.nome, id: usina.estacao.id } : null,
      curvaGeracao: curvaHoje
    };

    apiCache[cacheKey] = { timestamp: Date.now(), data: resPayload };
    return NextResponse.json(resPayload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar análises" }, { status: 500 });
  }
}


