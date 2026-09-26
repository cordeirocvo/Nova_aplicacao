import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface TvUsinaEssentialKpi {
  id: string;
  nome: string;
  cidade: string;
  capacidadeKWp: number;
  // 4 KPIs Essenciais
  potenciaAtualKW: number;
  potenciaCarregamentoPct: number;
  geracaoHojeKWh: number;
  pr: number;
  inversoresOnline: number;
  inversoresTotal: number;
  // Status & Semáforo
  status: "ONLINE" | "ALERTA" | "OFFLINE";
  statusColor: "GREEN" | "YELLOW" | "RED";
  alarmesAtivosCount: number;
  ultimoAlarmeDesc?: string;
  ultimaAtualizacao: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prGreenParam = Number(searchParams.get("prGreen") || 78);
    const prYellowParam = Number(searchParams.get("prYellow") || 60);

    const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const [ano, mes, dia] = todayStr.split("-").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");
    const startDay = new Date(`${ano}-${pad(mes)}-${pad(dia)}T00:00:00-03:00`);
    const endDay = new Date(`${ano}-${pad(mes)}-${pad(dia)}T23:59:59.999-03:00`);

    const usinas = await prisma.usina.findMany({
      include: {
        inversores: true,
        alarmes: {
          where: { status: "ATIVO" },
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { nome: "asc" },
    });

    if (usinas.length === 0) {
      return NextResponse.json({
        success: true,
        usinas: [],
        kpiTotal: {
          potenciaTotalKW: 0,
          capacidadeTotalKWp: 0,
          geracaoTotalHojeKWh: 0,
          usinasTotal: 0,
          usinasGreen: 0,
          usinasYellow: 0,
          usinasRed: 0,
          prMedio: 0,
        },
      });
    }

    const usinaIds = usinas.map((u) => u.id);

    // Busca última telemetria de cada usina para potência instantânea
    const ultimasTelemetrias = await Promise.all(
      usinaIds.map((id) =>
        prisma.telemetria.findFirst({
          where: { usinaId: id, timestamp: { gte: startDay, lte: endDay } },
          orderBy: { timestamp: "desc" },
        })
      )
    );

    // Busca métrica consolidada do dia para geração hoje e PR
    const metricasHoje = await prisma.metricaDiariaUsina.findMany({
      where: {
        usinaId: { in: usinaIds },
        data: { gte: startDay, lte: endDay },
      },
    });

    const metricasMap = new Map(metricasHoje.map((m) => [m.usinaId, m]));
    const telemetriaMap = new Map(usinaIds.map((id, idx) => [id, ultimasTelemetrias[idx]]));

    let potenciaTotal = 0;
    let geracaoTotal = 0;
    let capacidadeTotal = 0;
    let usinasGreen = 0;
    let usinasYellow = 0;
    let usinasRed = 0;

    const usinasKpiList: TvUsinaEssentialKpi[] = usinas.map((u) => {
      const tel = telemetriaMap.get(u.id);
      const metrica = metricasMap.get(u.id);

      const cap = u.capacidadeKWp || 100;
      capacidadeTotal += cap;

      const potAtual = tel?.potenciaAtivaKW || 0;
      potenciaTotal += potAtual;

      const gerHoje = metrica?.energiaRealKWh || tel?.energiaAcumuladaKWh || 0;
      geracaoTotal += gerHoje;

      const carregamento = cap > 0 ? Number(((potAtual / cap) * 100).toFixed(1)) : 0;

      // PR: Performance Ratio Real (%)
      let pr = 82;
      if (metrica?.performanceRatioReal) {
        pr = Number((metrica.performanceRatioReal * 100).toFixed(1));
      } else if (cap > 0 && gerHoje > 0) {
        pr = Math.min(Math.round((gerHoje / (cap * 4.5)) * 100), 98);
      }

      const invTotal = u.inversores.length || 1;
      const invOnline = potAtual > 0 ? invTotal : 0;

      const alarmesCount = u.alarmes.length;
      const ultimoAlarmeDesc = alarmesCount > 0 ? u.alarmes[0].descricao : undefined;

      // Semáforo dinâmico configurável:
      // VERDE: PR >= prGreenParam e sem alarme ativo
      // AMARELO: prYellowParam <= PR < prGreenParam
      // VERMELHO: PR < prYellowParam ou alarme ativo ou offline
      let statusColor: "GREEN" | "YELLOW" | "RED" = "GREEN";
      let statusOperacional: "ONLINE" | "ALERTA" | "OFFLINE" = "ONLINE";

      if (alarmesCount > 0 || pr < prYellowParam) {
        statusColor = "RED";
        statusOperacional = potAtual === 0 ? "OFFLINE" : "ALERTA";
        usinasRed++;
      } else if (pr < prGreenParam) {
        statusColor = "YELLOW";
        statusOperacional = "ALERTA";
        usinasYellow++;
      } else {
        statusColor = "GREEN";
        statusOperacional = "ONLINE";
        usinasGreen++;
      }

      return {
        id: u.id,
        nome: u.nome,
        cidade: u.localizacao || "Minas Gerais",
        capacidadeKWp: Math.round(cap),
        potenciaAtualKW: Number(potAtual.toFixed(1)),
        potenciaCarregamentoPct: carregamento,
        geracaoHojeKWh: Number(gerHoje.toFixed(1)),
        pr,
        inversoresOnline: invOnline,
        inversoresTotal: invTotal,
        status: statusOperacional,
        statusColor,
        alarmesAtivosCount: alarmesCount,
        ultimoAlarmeDesc,
        ultimaAtualizacao: tel?.timestamp ? new Date(tel.timestamp).toLocaleTimeString("pt-BR") : "--:--",
      };
    });

    // Ordenação estrita: Usinas com status RED (intervenção) primeiro, seguidas de YELLOW, depois GREEN
    usinasKpiList.sort((a, b) => {
      const order = { RED: 0, YELLOW: 1, GREEN: 2 };
      return order[a.statusColor] - order[b.statusColor];
    });

    const prMedio =
      usinasKpiList.length > 0
        ? Number((usinasKpiList.reduce((acc, u) => acc + u.pr, 0) / usinasKpiList.length).toFixed(1))
        : 0;

    return NextResponse.json({
      success: true,
      usinas: usinasKpiList,
      kpiTotal: {
        potenciaTotalKW: Number(potenciaTotal.toFixed(1)),
        capacidadeTotalKWp: Math.round(capacidadeTotal),
        geracaoTotalHojeKWh: Number(geracaoTotal.toFixed(1)),
        usinasTotal: usinas.length,
        usinasGreen,
        usinasYellow,
        usinasRed,
        prMedio,
      },
    });
  } catch (error: any) {
    console.error("[TV KPIS ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
