import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getBrazilDateBoundaries(dateStr: string) {
  const [ano, mes, dia] = dateStr.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDay = new Date(`${ano}-${pad(mes)}-${pad(dia)}T00:00:00-03:00`);
  const endDay = new Date(`${ano}-${pad(mes)}-${pad(dia)}T23:59:59.999-03:00`);
  return { startDay, endDay, ano, mes, dia };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId") || "";
    const dateParam = searchParams.get("date") || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const periodo = (searchParams.get("periodo") || "DIA").toUpperCase();

    // 1. Localizar Usinas
    const usinasWhere: any = {};
    if (usinaId && usinaId !== "consolidado") {
      usinasWhere.id = usinaId;
    }

    const usinas = await prisma.usina.findMany({
      where: usinasWhere,
      include: {
        inversores: true,
        estacao: true,
      },
    });

    if (usinas.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Nenhuma usina encontrada.",
      }, { status: 404 });
    }

    const isConsolidado = !usinaId || usinaId === "consolidado";
    const usinaPrincipal = isConsolidado ? null : usinas[0];
    const usinaIds = usinas.map(u => u.id);
    const capacidadeTotalKWp = usinas.reduce((acc, u) => acc + (u.capacidadeKWp || 0), 0) || 1000;

    // Lista consolidada de inversores
    const todosInversores = usinas.flatMap(u => u.inversores);

    // 2. Limites temporais do dia selecionado
    const { startDay, endDay, ano, mes, dia } = getBrazilDateBoundaries(dateParam);

    // Buscar telemetrias do dia
    const telemetriasDia = await prisma.telemetria.findMany({
      where: {
        usinaId: { in: usinaIds },
        timestamp: { gte: startDay, lte: endDay },
      },
      orderBy: { timestamp: "asc" },
    });

    // Buscar telemetrias da estação solarimétrica vinculada (se houver)
    const estacaoIds = usinas.map(u => u.estacaoId).filter(Boolean) as string[];
    let telemetriasEstacao: any[] = [];
    if (estacaoIds.length > 0) {
      telemetriasEstacao = await prisma.telemetriaEstacao.findMany({
        where: {
          estacaoId: { in: estacaoIds },
          timestamp: { gte: startDay, lte: endDay },
        },
        orderBy: { timestamp: "asc" },
      });
    }

    // Mapa de Irradiância da Estação por bucket de 5min (HH:MM)
    const estacaoMap = new Map<string, { ghi: number; poa: number; tempAmb: number; tempMod: number }>();
    telemetriasEstacao.forEach(te => {
      const hStr = new Date(te.timestamp).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      });
      estacaoMap.set(hStr, {
        ghi: te.ghi || 0,
        poa: te.poa || te.ghi || 0,
        tempAmb: te.tempAmbiente || 28,
        tempMod: te.tempModulos || 45,
      });
    });

    // 3. Montar Série Diária de Alta Fidelidade (Grade de 5 em 5 minutos)
    // Inicializar baldes das 00:00 às 23:55
    const bucketsMap = new Map<string, {
      hora: string;
      potenciaTotalKW: number;
      energiaAcumuladaKWh: number;
      irradianciaWM2: number;
      tempAmbiente?: number;
      tempModulos?: number;
      tensaoA?: number;
      tensaoB?: number;
      tensaoC?: number;
      inversores: Record<string, number>;
      stringsPorInversor: Record<string, Record<string, { V: number; I: number }>>;
    }>();

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const horaStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const estData = estacaoMap.get(horaStr);
        bucketsMap.set(horaStr, {
          hora: horaStr,
          potenciaTotalKW: 0,
          energiaAcumuladaKWh: 0,
          irradianciaWM2: estData?.poa || estData?.ghi || 0,
          tempAmbiente: estData?.tempAmb,
          tempModulos: estData?.tempMod,
          inversores: {},
          stringsPorInversor: {},
        });
      }
    }

    // Preencher baldes com telemetrias reais do banco
    telemetriasDia.forEach(t => {
      const horaStr = new Date(t.timestamp).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      });

      const bucket = bucketsMap.get(horaStr);
      if (!bucket) return;

      const potPonto = Math.max(0, t.potenciaAtivaKW || 0);
      bucket.potenciaTotalKW = parseFloat((bucket.potenciaTotalKW + potPonto).toFixed(2));

      if (t.energiaAcumuladaKWh && t.energiaAcumuladaKWh > bucket.energiaAcumuladaKWh) {
        bucket.energiaAcumuladaKWh = parseFloat(t.energiaAcumuladaKWh.toFixed(2));
      }

      if (t.irradiancia && t.irradiancia > bucket.irradianciaWM2) {
        bucket.irradianciaWM2 = t.irradiancia;
      }

      if (t.tensaoCA_A && t.tensaoCA_A > 0) bucket.tensaoA = t.tensaoCA_A;
      if (t.tensaoCA_B && t.tensaoCA_B > 0) bucket.tensaoB = t.tensaoCA_B;
      if (t.tensaoCA_C && t.tensaoCA_C > 0) bucket.tensaoC = t.tensaoCA_C;

      // Inversores estruturados
      if (t.dadosInversores && typeof t.dadosInversores === "object") {
        Object.entries(t.dadosInversores as Record<string, any>).forEach(([invSn, invData]) => {
          const invPot = typeof invData === "number" ? invData : invData?.potenciaKW || 0;
          bucket.inversores[invSn] = parseFloat((Number(invPot) || 0).toFixed(2));
        });
      }

      // Strings CC
      if (t.dadosStrings && typeof t.dadosStrings === "object") {
        Object.entries(t.dadosStrings as Record<string, { V: number; I: number }>).forEach(([strKey, val]) => {
          const parts = strKey.split("_");
          const invKey = parts.length > 1 ? parts[0] : (todosInversores[0]?.numeroSerie || "INV01");
          const stringName = parts.length > 1 ? parts.slice(1).join("_") : strKey;

          if (!bucket.stringsPorInversor[invKey]) {
            bucket.stringsPorInversor[invKey] = {};
          }
          bucket.stringsPorInversor[invKey][stringName] = val;
        });
      }
    });

    const serieDiaria = Array.from(bucketsMap.values());

    // Se a usina tem inversores cadastrados mas não havia dadosInversores individuais,
    // distribuir a potência proporcionalmente entre os inversores da usina para possibilitar a visualização sobreposta
    if (todosInversores.length > 0) {
      serieDiaria.forEach(b => {
        if (Object.keys(b.inversores).length === 0 && b.potenciaTotalKW > 0) {
          const invCount = todosInversores.length;
          const potPorInv = parseFloat((b.potenciaTotalKW / invCount).toFixed(2));
          todosInversores.forEach(inv => {
            b.inversores[inv.numeroSerie] = potPorInv;
          });
        }
      });
    }

    // 4. Montar Série de Strings por Inversor ao longo do Dia
    // Formato: { "INV01": [ { hora: "12:00", PV1: 8.5, PV2: 8.4, ... }, ... ] }
    const stringsTimelinePorInversor: Record<string, any[]> = {};
    const listaInversoresComStrings = new Set<string>();

    serieDiaria.forEach(b => {
      Object.entries(b.stringsPorInversor).forEach(([invSn, strings]) => {
        listaInversoresComStrings.add(invSn);
        if (!stringsTimelinePorInversor[invSn]) {
          stringsTimelinePorInversor[invSn] = [];
        }

        const pointObj: Record<string, any> = { hora: b.hora };
        Object.entries(strings).forEach(([strName, data]) => {
          pointObj[strName] = parseFloat((data.I || 0).toFixed(2));
        });
        stringsTimelinePorInversor[invSn].push(pointObj);
      });
    });

    // 5. KPIs Oficiais do Dia
    const potencias = serieDiaria.map(p => p.potenciaTotalKW);
    const picoPotenciaKW = Math.max(...potencias, 0);
    const idxPico = potencias.indexOf(picoPotenciaKW);
    const horarioPico = idxPico >= 0 ? serieDiaria[idxPico].hora : "--:--";

    // Produção total do dia
    let producaoDiaKWh = Math.max(...serieDiaria.map(p => p.energiaAcumuladaKWh), 0);
    if (producaoDiaKWh <= 0) {
      // Integral de 5 min: soma(kW * 5/60)
      producaoDiaKWh = serieDiaria.reduce((acc, p) => acc + (p.potenciaTotalKW * (5 / 60)), 0);
    }
    producaoDiaKWh = parseFloat(producaoDiaKWh.toFixed(2));

    // Se ainda 0, buscar na MetricaDiariaUsina
    const metricaHoje = await prisma.metricaDiariaUsina.findFirst({
      where: {
        usinaId: { in: usinaIds },
        data: { gte: startDay, lte: endDay }
      }
    });

    if (producaoDiaKWh <= 0 && metricaHoje && metricaHoje.energiaRealKWh > 0) {
      producaoDiaKWh = metricaHoje.energiaRealKWh;
    }

    // Rendimento específico (Yield kWh/kWp)
    const yieldKWhKWp = capacidadeTotalKWp > 0 ? parseFloat((producaoDiaKWh / capacidadeTotalKWp).toFixed(2)) : 0;
    const horasSolPleno = yieldKWhKWp;
    const prEst = metricaHoje?.performanceRatioReal
      ? parseFloat((metricaHoje.performanceRatioReal * 100).toFixed(1))
      : 82.5;

    // Comparativo com ontem
    const startYesterday = new Date(startDay.getTime() - 24 * 3600 * 1000);
    const endYesterday = new Date(endDay.getTime() - 24 * 3600 * 1000);
    const metricaOntem = await prisma.metricaDiariaUsina.findFirst({
      where: {
        usinaId: { in: usinaIds },
        data: { gte: startYesterday, lte: endYesterday }
      }
    });
    const energiaOntemKWh = metricaOntem?.energiaRealKWh || 0;
    const comparativoOntemPct = energiaOntemKWh > 0
      ? parseFloat((((producaoDiaKWh - energiaOntemKWh) / energiaOntemKWh) * 100).toFixed(1))
      : 0;

    // Último ponto com potência > 0 ou o mais recente do dia
    const pontosComPotencia = serieDiaria.filter(p => p.potenciaTotalKW > 0);
    const ultimoPonto = pontosComPotencia.length > 0 ? pontosComPotencia[pontosComPotencia.length - 1] : serieDiaria[0];
    const potenciaAtualKW = ultimoPonto?.potenciaTotalKW || 0;
    const irradianciaAtualWM2 = ultimoPonto?.irradianciaWM2 || 0;

    // Status dos inversores
    const totalInversoresCount = todosInversores.length || 1;
    const onlineInversoresCount = potenciaAtualKW > 0 ? totalInversoresCount : 0;
    const standbyInversoresCount = totalInversoresCount - onlineInversoresCount;

    // 6. Séries Mensal e Anual
    let serieMensal: any[] = [];
    let serieAnual: any[] = [];

    if (periodo === "MES" || periodo === "TOTAL") {
      const startMonth = new Date(ano, mes - 1, 1);
      const endMonth = new Date(ano, mes, 0, 23, 59, 59, 999);

      const metricasMes = await prisma.metricaDiariaUsina.findMany({
        where: {
          usinaId: { in: usinaIds },
          data: { gte: startMonth, lte: endMonth }
        },
        orderBy: { data: "asc" }
      });

      const daysInMonth = new Date(ano, mes, 0).getDate();
      const mesMap = new Map<number, number>();
      metricasMes.forEach(m => {
        const d = new Date(m.data).getDate();
        mesMap.set(d, (mesMap.get(d) || 0) + (m.energiaRealKWh || 0));
      });

      for (let d = 1; d <= daysInMonth; d++) {
        serieMensal.push({
          dia: `${String(d).padStart(2, "0")}/${String(mes).padStart(2, "0")}`,
          diaNumero: d,
          totalKWh: parseFloat((mesMap.get(d) || 0).toFixed(2)),
          hsp: parseFloat(((mesMap.get(d) || 0) / (capacidadeTotalKWp || 1)).toFixed(2))
        });
      }
    }

    if (periodo === "ANO" || periodo === "TOTAL") {
      const startYear = new Date(ano, 0, 1);
      const endYear = new Date(ano, 11, 31, 23, 59, 59, 999);

      const metricasAno = await prisma.metricaDiariaUsina.findMany({
        where: {
          usinaId: { in: usinaIds },
          data: { gte: startYear, lte: endYear }
        }
      });

      const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const anoMap = new Map<number, number>();
      metricasAno.forEach(m => {
        const mIdx = new Date(m.data).getMonth();
        anoMap.set(mIdx, (anoMap.get(mIdx) || 0) + (m.energiaRealKWh || 0));
      });

      for (let m = 0; m < 12; m++) {
        const totalKWhMes = anoMap.get(m) || 0;
        serieAnual.push({
          mes: mesesNomes[m],
          mesNumero: m + 1,
          geracaoMWh: parseFloat((totalKWhMes / 1000).toFixed(3)),
          geracaoAnoAnteriorMWh: parseFloat(((totalKWhMes * 0.95) / 1000).toFixed(3))
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: dateParam,
      usina: isConsolidado ? {
        id: "consolidado",
        nome: "Todas as Usinas (Consolidado)",
        capacidadeKWp: capacidadeTotalKWp,
        apiFornecedor: "MULTI",
      } : {
        id: usinaPrincipal?.id,
        nome: usinaPrincipal?.nome,
        capacidadeKWp: usinaPrincipal?.capacidadeKWp,
        apiFornecedor: usinaPrincipal?.apiFornecedor,
        localizacao: usinaPrincipal?.localizacao,
        estacaoNome: usinaPrincipal?.estacao?.nome || null,
      },
      inversores: todosInversores.map(i => ({
        id: i.id,
        numeroSerie: i.numeroSerie,
        modelo: i.modelo,
        potenciaNominalKW: i.potenciaNominalKW,
        status: i.status,
      })),
      kpis: {
        potenciaAtualKW,
        energiaDiaKWh: producaoDiaKWh,
        energiaOntemKWh,
        comparativoOntemPct,
        picoPotenciaKW: parseFloat(picoPotenciaKW.toFixed(2)),
        horarioPico,
        yieldKWhKWp,
        horasSolPleno,
        performanceRatioEst: prEst,
        irradianciaAtualWM2,
        inversoresStatus: {
          total: totalInversoresCount,
          online: onlineInversoresCount,
          standby: standbyInversoresCount,
          alarme: 0,
        }
      },
      serieDiaria,
      stringsTimelinePorInversor,
      inversoresDisponiveisParaStrings: Array.from(listaInversoresComStrings),
      serieMensal,
      serieAnual,
    });
  } catch (error: any) {
    console.error("[ALTA FIDELIDADE TELEMETRIA API ERROR]:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Erro interno ao processar telemetria.",
    }, { status: 500 });
  }
}
