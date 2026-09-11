import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * API para Relatório e Gráficos Consolidados Multi-Fabricante (Huawei, Solis, Hoymiles, Canadian, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId") || "";
    const periodo = (searchParams.get("periodo") || "DIA").toUpperCase();
    const dateParam = searchParams.get("date"); // Ex: "2026-08-10"

    const now = new Date();
    const anoDefault = dateParam ? parseInt(dateParam.split("-")[0], 10) : now.getFullYear();
    const mesDefault = dateParam ? parseInt(dateParam.split("-")[1], 10) : now.getMonth() + 1;
    const diaDefault = dateParam ? parseInt(dateParam.split("-")[2], 10) : now.getDate();

    const ano = parseInt(searchParams.get("ano") || anoDefault.toString(), 10);
    const mes = parseInt(searchParams.get("mes") || mesDefault.toString(), 10);
    const dia = parseInt(searchParams.get("dia") || diaDefault.toString(), 10);

    // 1. Filtrar usinas e inversores
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

    // 2. Agregação Diária (Curva de Geração em intervalos de 15min/5min para o dia selecionado)
    if (periodo === "DIA" || periodo === "TUDO") {
      const targetDateStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const startDay = new Date(`${targetDateStr}T00:00:00-03:00`);
      const endDay = new Date(`${targetDateStr}T23:59:59-03:00`);

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

      // Se houverem leituras suficientes na telemetria, agrupa por horário (HH:MM)
      if (telemetriasDia.length >= 5) {
        const porHoraMap = new Map<string, { hora: string; potenciaTotalKW: number; tensaoA: number; tensaoB: number; tensaoC: number; porFornecedor: Record<string, number> }>();

        telemetriasDia.forEach((t) => {
          const horaStr = new Date(t.timestamp).toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
          });

          const fornecedor = t.usina?.apiFornecedor || "OUTROS";
          const potencia = t.potenciaAtivaKW || 0;

          if (!porHoraMap.has(horaStr)) {
            porHoraMap.set(horaStr, {
              hora: horaStr,
              potenciaTotalKW: 0,
              tensaoA: t.tensaoCA_A || 220,
              tensaoB: t.tensaoCA_B || 220,
              tensaoC: t.tensaoCA_C || 220,
              porFornecedor: {},
            });
          }

          const point = porHoraMap.get(horaStr)!;
          point.potenciaTotalKW += potencia;
          point.porFornecedor[fornecedor] = (point.porFornecedor[fornecedor] || 0) + potencia;

          distribuicaoFabricante[fornecedor] = (distribuicaoFabricante[fornecedor] || 0) + (t.energiaAcumuladaKWh || 0);
        });

        serieDiaria = Array.from(porHoraMap.values());
      } else {
        // Se para a data selecionada houver poucas leituras brutas (dias históricos), buscar MetricaDiariaUsina e gerar a curva parabólica de 15min
        const metricasDia = await prisma.metricaDiariaUsina.findMany({
          where: {
            usinaId: { in: usinaIds },
            data: { gte: startDay, lte: endDay },
          },
        });

        const energiaTotalDiaKWh = metricasDia.reduce((acc, m) => acc + (m.energiaRealKWh || 0), 0) || (capTotalKWp * 4.4);
        const potPicoEstimadaKW = (energiaTotalDiaKWh / 5.2);

        // Sintetizar curva das 06:00 às 18:30 em passos de 15 min (51 pontos)
        for (let minutes = 360; minutes <= 1110; minutes += 15) {
          const h = Math.floor(minutes / 60);
          const m = minutes % 60;
          const horaStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

          const normTime = (minutes - 360) / 750; // 0 a 1
          const powerFactor = Math.pow(Math.sin(Math.PI * normTime), 1.8);
          const potKW = parseFloat((potPicoEstimadaKW * powerFactor).toFixed(2));

          const porFornecedor: Record<string, number> = {};
          usinas.forEach(u => {
            const f = u.apiFornecedor || "OUTROS";
            const ratio = (u.capacidadeKWp || 1) / capTotalKWp;
            porFornecedor[f] = parseFloat((potKW * ratio).toFixed(2));
            distribuicaoFabricante[f] = (distribuicaoFabricante[f] || 0) + (energiaTotalDiaKWh * ratio);
          });

          serieDiaria.push({
            hora: horaStr,
            potenciaTotalKW: potKW,
            tensaoA: 220,
            tensaoB: 220,
            tensaoC: 220,
            porFornecedor,
          });
        }
      }
    }

    // 3. Agregação Mensal (Geração Diária Acumulada no Mês em kWh/dia)
    if (periodo === "MES" || periodo === "TUDO" || periodo === "DIA") {
      const daysInMonth = new Date(ano, mes, 0).getDate();
      const firstDayMonth = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
      const lastDayMonth = new Date(Date.UTC(ano, mes - 1, daysInMonth, 23, 59, 59));

      const metricasMes = await prisma.metricaDiariaUsina.findMany({
        where: {
          usinaId: { in: usinaIds },
          data: { gte: firstDayMonth, lte: lastDayMonth },
        },
        include: {
          usina: { select: { apiFornecedor: true } },
        },
        orderBy: { data: "asc" },
      });

      // Inicializar todos os dias do mês de 01 a daysInMonth
      const porDiaMap = new Map<string, { dia: string; totalKWh: number; porFornecedor: Record<string, number> }>();
      for (let d = 1; d <= daysInMonth; d++) {
        const diaStr = `${String(d).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
        porDiaMap.set(diaStr, {
          dia: diaStr,
          totalKWh: 0,
          porFornecedor: {},
        });
      }

      // Preencher com métricas reais por dia
      metricasMes.forEach((m) => {
        const dObj = new Date(m.data);
        const dayNum = dObj.getUTCDate();
        const diaStr = `${String(dayNum).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;

        if (porDiaMap.has(diaStr)) {
          const item = porDiaMap.get(diaStr)!;
          const fornecedor = m.usina?.apiFornecedor || "OUTROS";
          const valKWh = m.energiaRealKWh || 0;

          item.totalKWh = parseFloat((item.totalKWh + valKWh).toFixed(2));
          item.porFornecedor[fornecedor] = parseFloat(((item.porFornecedor[fornecedor] || 0) + valKWh).toFixed(2));

          if (periodo === "MES") {
            distribuicaoFabricante[fornecedor] = (distribuicaoFabricante[fornecedor] || 0) + valKWh;
          }
        }
      });

      serieMensal = Array.from(porDiaMap.values());
    }

    // 4. Agregação Anual (Comparativo Mês a Mês em MWh para o ano selecionado vs ano anterior)
    if (periodo === "ANO" || periodo === "TUDO") {
      const startYear = new Date(Date.UTC(ano - 1, 0, 1, 0, 0, 0));
      const endYear = new Date(Date.UTC(ano, 11, 31, 23, 59, 59));

      const metricasAnuais = await prisma.metricaDiariaUsina.findMany({
        where: {
          usinaId: { in: usinaIds },
          data: { gte: startYear, lte: endYear },
        },
        include: {
          usina: { select: { apiFornecedor: true } },
        },
      });

      const mesesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const geracaoPorMesAtual = new Array(12).fill(0);
      const geracaoPorMesAnterior = new Array(12).fill(0);

      metricasAnuais.forEach((m) => {
        const dObj = new Date(m.data);
        const y = dObj.getUTCFullYear();
        const mIdx = dObj.getUTCMonth();
        const valMWh = (m.energiaRealKWh || 0) / 1000;

        if (y === ano) {
          geracaoPorMesAtual[mIdx] += valMWh;
          const f = m.usina?.apiFornecedor || "OUTROS";
          distribuicaoFabricante[f] = (distribuicaoFabricante[f] || 0) + (m.energiaRealKWh || 0);
        } else if (y === ano - 1) {
          geracaoPorMesAnterior[mIdx] += valMWh;
        }
      });

      serieAnual = mesesNome.map((mNome, idx) => {
        return {
          mes: mNome,
          mesNumero: idx + 1,
          geracaoMWh: parseFloat(geracaoPorMesAtual[idx].toFixed(2)),
          geracaoAnoAnteriorMWh: parseFloat(geracaoPorMesAnterior[idx].toFixed(2)),
        };
      });
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
      serieDiaria,
      serieMensal,
      serieAnual,
    });
  } catch (error: any) {
    console.error("[RELATORIOS-CONSOLIDADO] Erro ao gerar dados:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro na geração do relatório." }, { status: 500 });
  }
}
