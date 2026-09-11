import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Helper to get date boundaries in Brazil Timezone (America/Sao_Paulo: UTC-3)
 */
function getBrazilDateBoundaries(ano: number, mes: number, dia: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDay = new Date(`${ano}-${pad(mes)}-${pad(dia)}T00:00:00-03:00`);
  const endDay = new Date(`${ano}-${pad(mes)}-${pad(dia)}T23:59:59.999-03:00`);
  return { startDay, endDay };
}

/**
 * Calculate energy (kWh) from telemetry records for a given plant
 */
function calculateUsinaEnergyKWh(records: Array<{ energiaAcumuladaKWh: number; potenciaAtivaKW: number; timestamp: Date }>): number {
  if (!records || records.length === 0) return 0;

  // Método 1: Diferença entre max e min da energia acumulada no dia
  const energias = records.map((r) => r.energiaAcumuladaKWh || 0).filter((v) => v > 0);
  if (energias.length > 0) {
    const max = Math.max(...energias);
    const min = Math.min(...energias);
    const delta = max - min;
    // Em telemetrias de inversores onde a energia zera à meia-noite, max representa a geração do dia
    if (delta > 0.5 * max) return max;
    if (delta > 0) return delta;
    if (max > 0) return max;
  }

  // Método 2: Integração trapezoidal aproximada da potência ativa (kWh = kW * horas)
  let totalKWh = 0;
  for (let i = 1; i < records.length; i++) {
    const dtHours = (new Date(records[i].timestamp).getTime() - new Date(records[i - 1].timestamp).getTime()) / (1000 * 3600);
    if (dtHours > 0 && dtHours <= 1) { // ignora gaps de mais de 1 hora
      const avgKW = ((records[i].potenciaAtivaKW || 0) + (records[i - 1].potenciaAtivaKW || 0)) / 2;
      totalKWh += avgKW * dtHours;
    }
  }
  return totalKWh;
}

/**
 * API para Relatório e Gráficos Consolidados Multi-Fabricante (Huawei, Solis, Hoymiles, Canadian, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId") || "";
    const periodo = (searchParams.get("periodo") || "DIA").toUpperCase();
    const dateParam = searchParams.get("date"); // Ex: "2026-09-11"

    const now = new Date();
    // Default data no fuso de Brasília
    const nowBRL = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const anoDefault = dateParam ? parseInt(dateParam.split("-")[0], 10) : nowBRL.getFullYear();
    const mesDefault = dateParam ? parseInt(dateParam.split("-")[1], 10) : nowBRL.getMonth() + 1;
    const diaDefault = dateParam ? parseInt(dateParam.split("-")[2], 10) : nowBRL.getDate();

    const ano = parseInt(searchParams.get("ano") || anoDefault.toString(), 10);
    const mes = parseInt(searchParams.get("mes") || mesDefault.toString(), 10);
    const dia = parseInt(searchParams.get("dia") || diaDefault.toString(), 10);

    // 1. Filtrar usinas
    const usinasWhere: any = {};
    if (usinaId) usinasWhere.id = usinaId;

    const usinas = await prisma.usina.findMany({
      where: usinasWhere,
      include: {
        inversores: true,
      },
    });

    const usinaIds = usinas.map((u) => u.id);
    const capTotalKWp = usinas.reduce((acc, u) => acc + (u.capacidadeKWp || 0), 0) || 100;

    let serieDiaria: any[] = [];
    let serieMensal: any[] = [];
    let serieAnual: any[] = [];
    let distribuicaoFabricante: Record<string, number> = {};

    // 2. Agregação Diária (Curva de Geração em intervalos para o dia selecionado)
    const { startDay, endDay } = getBrazilDateBoundaries(ano, mes, dia);

    // Buscar telemetria real do dia selecionado
    const telemetriasDia = await prisma.telemetria.findMany({
      where: {
        usinaId: { in: usinaIds },
        timestamp: { gte: startDay, lte: endDay },
      },
      include: {
        usina: { select: { apiFornecedor: true, nome: true } },
      },
      orderBy: { timestamp: "asc" },
    });

    // Agrupamento por horário (HH:MM) desduplicando leituras da mesma usina no mesmo minuto
    if (telemetriasDia.length > 0) {
      const porHoraUsinaMap = new Map<string, Map<string, { potencia: number; fornecedor: string; tensaoA: number; tensaoB: number; tensaoC: number }>>();

      telemetriasDia.forEach((t) => {
        const horaStr = new Date(t.timestamp).toLocaleTimeString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
        });

        const fornecedor = t.usina?.apiFornecedor || "OUTROS";
        const potencia = Math.max(0, t.potenciaAtivaKW || 0);

        if (!porHoraUsinaMap.has(horaStr)) {
          porHoraUsinaMap.set(horaStr, new Map());
        }

        const usinaMap = porHoraUsinaMap.get(horaStr)!;
        // Se houver mais de uma leitura para a mesma usina no mesmo horário, seleciona a de maior precisão/potência
        if (!usinaMap.has(t.usinaId) || usinaMap.get(t.usinaId)!.potencia < potencia) {
          usinaMap.set(t.usinaId, {
            potencia,
            fornecedor,
            tensaoA: t.tensaoCA_A || 220,
            tensaoB: t.tensaoCA_B || 220,
            tensaoC: t.tensaoCA_C || 220,
          });
        }
      });

      const porHoraArray: any[] = [];
      porHoraUsinaMap.forEach((usinaMap, horaStr) => {
        let potenciaTotal = 0;
        let vA = 0, vB = 0, vC = 0;
        const porFornecedor: Record<string, number> = {};

        usinaMap.forEach((data) => {
          potenciaTotal += data.potencia;
          porFornecedor[data.fornecedor] = (porFornecedor[data.fornecedor] || 0) + data.potencia;
          if (data.tensaoA > 0) vA = data.tensaoA;
          if (data.tensaoB > 0) vB = data.tensaoB;
          if (data.tensaoC > 0) vC = data.tensaoC;
        });

        porHoraArray.push({
          hora: horaStr,
          potenciaTotalKW: parseFloat(potenciaTotal.toFixed(2)),
          tensaoA: vA || 220,
          tensaoB: vB || 220,
          tensaoC: vC || 220,
          porFornecedor,
        });
      });

      serieDiaria = porHoraArray.sort((a, b) => a.hora.localeCompare(b.hora));
    } else {
      serieDiaria = [];
    }

    // Cálculo da Produção Real do Dia (kWh) por usina
    let producaoDiariaTotalKWh = 0;
    usinas.forEach((u) => {
      const telemUsina = telemetriasDia.filter((t) => t.usinaId === u.id);
      const energiaKWh = calculateUsinaEnergyKWh(telemUsina);
      producaoDiariaTotalKWh += energiaKWh;

      const f = u.apiFornecedor || "OUTROS";
      distribuicaoFabricante[f] = (distribuicaoFabricante[f] || 0) + energiaKWh;
    });

    // Buscar telemetria de ontem para comparação percentual (Solis Style KPI)
    const startYesterday = new Date(startDay.getTime() - 24 * 3600 * 1000);
    const endYesterday = new Date(endDay.getTime() - 24 * 3600 * 1000);

    const telemetriasOntem = await prisma.telemetria.findMany({
      where: {
        usinaId: { in: usinaIds },
        timestamp: { gte: startYesterday, lte: endYesterday },
      },
      select: {
        usinaId: true,
        energiaAcumuladaKWh: true,
        potenciaAtivaKW: true,
        timestamp: true,
      },
      orderBy: { timestamp: "asc" },
    });

    let producaoOntemTotalKWh = 0;
    usinas.forEach((u) => {
      const telemUsinaOntem = telemetriasOntem.filter((t) => t.usinaId === u.id);
      producaoOntemTotalKWh += calculateUsinaEnergyKWh(telemUsinaOntem);
    });

    const diffOntem = producaoDiariaTotalKWh - producaoOntemTotalKWh;
    const comparativoOntemPct = producaoOntemTotalKWh > 0
      ? parseFloat(((diffOntem / producaoOntemTotalKWh) * 100).toFixed(2))
      : 0;

    // Tarifa média de R$ 0,90 / kWh para Ganho Diário (Solis Style)
    const tarifaKWh = 0.90;
    const ganhoDiarioBRL = parseFloat((producaoDiariaTotalKWh * tarifaKWh).toFixed(2));

    // Horas Carga Completa Diárias (HSP = kWh / kWp)
    const horasCargaCompletaHSP = capTotalKWp > 0
      ? parseFloat((producaoDiariaTotalKWh / capTotalKWp).toFixed(2))
      : 0;

    // 3. Agregação Mensal (Dias do Mês)
    if (periodo === "MES" || periodo === "TUDO" || periodo === "DIA") {
      const pad = (n: number) => String(n).padStart(2, "0");
      const daysInMonth = new Date(ano, mes, 0).getDate();
      const firstDayMonth = new Date(`${ano}-${pad(mes)}-01T00:00:00-03:00`);
      const lastDayMonth = new Date(`${ano}-${pad(mes)}-${pad(daysInMonth)}T23:59:59.999-03:00`);

      const telemetriasMes = await prisma.telemetria.findMany({
        where: {
          usinaId: { in: usinaIds },
          timestamp: { gte: firstDayMonth, lte: lastDayMonth },
        },
        select: {
          usinaId: true,
          timestamp: true,
          energiaAcumuladaKWh: true,
          potenciaAtivaKW: true,
          usina: { select: { apiFornecedor: true } },
        },
        orderBy: { timestamp: "asc" },
      });

      // Inicializar mapa de todos os dias do mês de 01 a daysInMonth
      const porDiaMap = new Map<number, { dia: string; diaNumero: number; totalKWh: number; porFornecedor: Record<string, number> }>();
      for (let d = 1; d <= daysInMonth; d++) {
        const diaStr = `${pad(d)}/${pad(mes)}`;
        porDiaMap.set(d, {
          dia: diaStr,
          diaNumero: d,
          totalKWh: 0,
          porFornecedor: {},
        });
      }

      // Agrupar telemetrias por dia do mês no fuso de Brasília
      const telemPorDiaUsina = new Map<string, Array<{ energiaAcumuladaKWh: number; potenciaAtivaKW: number; timestamp: Date; fornecedor: string }>>();

      telemetriasMes.forEach((t) => {
        const dStr = new Date(t.timestamp).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
        const dayNum = parseInt(dStr.split("-")[2], 10);
        const key = `${dayNum}_${t.usinaId}`;

        if (!telemPorDiaUsina.has(key)) {
          telemPorDiaUsina.set(key, []);
        }
        telemPorDiaUsina.get(key)!.push({
          energiaAcumuladaKWh: t.energiaAcumuladaKWh,
          potenciaAtivaKW: t.potenciaAtivaKW,
          timestamp: t.timestamp,
          fornecedor: t.usina?.apiFornecedor || "OUTROS",
        });
      });

      // Calcular energia real para cada dia
      telemPorDiaUsina.forEach((records, key) => {
        const dayNum = parseInt(key.split("_")[0], 10);
        const fornecedor = records[0]?.fornecedor || "OUTROS";
        const energiaKWh = calculateUsinaEnergyKWh(records);

        if (porDiaMap.has(dayNum)) {
          const item = porDiaMap.get(dayNum)!;
          item.totalKWh = parseFloat((item.totalKWh + energiaKWh).toFixed(2));
          item.porFornecedor[fornecedor] = parseFloat(((item.porFornecedor[fornecedor] || 0) + energiaKWh).toFixed(2));

          if (periodo === "MES") {
            distribuicaoFabricante[fornecedor] = (distribuicaoFabricante[fornecedor] || 0) + energiaKWh;
          }
        }
      });

      serieMensal = Array.from(porDiaMap.values());
    }

    // 4. Agregação Anual (Comparativo Mês a Mês em MWh)
    if (periodo === "ANO" || periodo === "TUDO") {
      const firstDayCurYear = new Date(`${ano}-01-01T00:00:00-03:00`);
      const lastDayCurYear = new Date(`${ano}-12-31T23:59:59.999-03:00`);

      const firstDayPrevYear = new Date(`${ano - 1}-01-01T00:00:00-03:00`);
      const lastDayPrevYear = new Date(`${ano - 1}-12-31T23:59:59.999-03:00`);

      const [telemCurYear, telemPrevYear] = await Promise.all([
        prisma.telemetria.findMany({
          where: {
            usinaId: { in: usinaIds },
            timestamp: { gte: firstDayCurYear, lte: lastDayCurYear },
          },
          select: {
            usinaId: true,
            timestamp: true,
            energiaAcumuladaKWh: true,
            potenciaAtivaKW: true,
            usina: { select: { apiFornecedor: true } },
          },
          orderBy: { timestamp: "asc" },
        }),
        prisma.telemetria.findMany({
          where: {
            usinaId: { in: usinaIds },
            timestamp: { gte: firstDayPrevYear, lte: lastDayPrevYear },
          },
          select: {
            usinaId: true,
            timestamp: true,
            energiaAcumuladaKWh: true,
            potenciaAtivaKW: true,
          },
          orderBy: { timestamp: "asc" },
        }),
      ]);

      const mesesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const geracaoPorMesAtual = new Array(12).fill(0);
      const geracaoPorMesAnterior = new Array(12).fill(0);

      // Agrupar ano atual
      const curGroup = new Map<string, Array<{ energiaAcumuladaKWh: number; potenciaAtivaKW: number; timestamp: Date; fornecedor: string }>>();
      telemCurYear.forEach((t) => {
        const dStr = new Date(t.timestamp).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const mIdx = parseInt(dStr.split("-")[1], 10) - 1;
        const dNum = parseInt(dStr.split("-")[2], 10);
        const key = `${mIdx}_${dNum}_${t.usinaId}`;
        if (!curGroup.has(key)) curGroup.set(key, []);
        curGroup.get(key)!.push({
          energiaAcumuladaKWh: t.energiaAcumuladaKWh,
          potenciaAtivaKW: t.potenciaAtivaKW,
          timestamp: t.timestamp,
          fornecedor: t.usina?.apiFornecedor || "OUTROS",
        });
      });

      curGroup.forEach((records, key) => {
        const mIdx = parseInt(key.split("_")[0], 10);
        const energiaKWh = calculateUsinaEnergyKWh(records);
        geracaoPorMesAtual[mIdx] += energiaKWh / 1000; // MWh

        const fornecedor = records[0]?.fornecedor || "OUTROS";
        if (periodo === "ANO") {
          distribuicaoFabricante[fornecedor] = (distribuicaoFabricante[fornecedor] || 0) + energiaKWh;
        }
      });

      // Agrupar ano anterior
      const prevGroup = new Map<string, Array<{ energiaAcumuladaKWh: number; potenciaAtivaKW: number; timestamp: Date }>>();
      telemPrevYear.forEach((t) => {
        const dStr = new Date(t.timestamp).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const mIdx = parseInt(dStr.split("-")[1], 10) - 1;
        const dNum = parseInt(dStr.split("-")[2], 10);
        const key = `${mIdx}_${dNum}_${t.usinaId}`;
        if (!prevGroup.has(key)) prevGroup.set(key, []);
        prevGroup.get(key)!.push({
          energiaAcumuladaKWh: t.energiaAcumuladaKWh,
          potenciaAtivaKW: t.potenciaAtivaKW,
          timestamp: t.timestamp,
        });
      });

      prevGroup.forEach((records, key) => {
        const mIdx = parseInt(key.split("_")[0], 10);
        const energiaKWh = calculateUsinaEnergyKWh(records);
        geracaoPorMesAnterior[mIdx] += energiaKWh / 1000; // MWh
      });

      serieAnual = mesesNome.map((mNome, idx) => ({
        mes: mNome,
        mesNumero: idx + 1,
        geracaoMWh: parseFloat(geracaoPorMesAtual[idx].toFixed(2)),
        geracaoAnoAnteriorMWh: parseFloat(geracaoPorMesAnterior[idx].toFixed(2)),
      }));
    }

    // Calcular percentuais por fabricante
    const totalGeralFabricantes = Object.values(distribuicaoFabricante).reduce((acc, val) => acc + val, 0);
    const participacaoFabricantes = Object.entries(distribuicaoFabricante).map(([nome, val]) => ({
      fornecedor: nome,
      totalKWh: parseFloat(val.toFixed(1)),
      percentual: totalGeralFabricantes > 0 ? parseFloat(((val / totalGeralFabricantes) * 100).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      success: true,
      usinasCount: usinas.length,
      capacidadeInstaladaTotalKWp: capTotalKWp,
      participacaoFabricantes,
      metaData: { ano, mes, dia },
      // Solis Style KPIs
      producaoDiariaKWh: parseFloat(producaoDiariaTotalKWh.toFixed(2)),
      producaoOntemKWh: parseFloat(producaoOntemTotalKWh.toFixed(2)),
      comparativoOntemPct,
      ganhoDiarioBRL,
      horasCargaCompletaHSP,
      serieDiaria,
      serieMensal,
      serieAnual,
    });
  } catch (error: any) {
    console.error("[RELATORIOS-CONSOLIDADO] Erro ao gerar dados:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro na geração do relatório." }, { status: 500 });
  }
}
