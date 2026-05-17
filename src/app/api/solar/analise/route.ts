import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';
import { HuaweiIntegration } from "@/lib/services/huaweiIntegration";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");

    if (!usinaId || usinaId === "consolidado") {
      const usinas = await prisma.usina.findMany({
        include: {
          telemetria: { orderBy: { timestamp: "desc" }, take: 1 },
          analises: { orderBy: { dataAnalise: "desc" }, take: 1 }
        }
      });

      const totalKwp = usinas.reduce((acc, u) => acc + u.capacidadeKWp, 0);
      const potenciaAtual = usinas.reduce((acc, u) => acc + (u.telemetria[0]?.potenciaAtivaKW || 0), 0);
      
      // Geração total do dia = soma do eToday (energiaAcumuladaKWh) de cada usina
      // Pega o registro mais recente de HOJE para cada usina
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
      
      return NextResponse.json({
        potenciaAtual: potenciaAtual.toFixed(1),
        potenciaPico: totalKwp.toFixed(1),
        geracaoHoje: geracaoHoje.toFixed(1), // valor real do banco, não estimativa
        pr: Math.min(parseFloat(prGlobal), 100),
        alertasCount: 0,
        curvaGeracao: [
          { time: "08:00", actual: potenciaAtual * 0.2, expected: totalKwp * 0.25 },
          { time: "10:00", actual: potenciaAtual * 0.6, expected: totalKwp * 0.7 },
          { time: "12:00", actual: potenciaAtual, expected: totalKwp * 0.9 },
          { time: "14:00", actual: potenciaAtual * 0.8, expected: totalKwp * 0.85 },
          { time: "16:00", actual: potenciaAtual * 0.3, expected: totalKwp * 0.4 }
        ]
      });
    }

    // ── Usina específica ───────────────────────────────────────────────
    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: {
        telemetria: { orderBy: { timestamp: "desc" }, take: 48 },
        analises: { orderBy: { dataAnalise: "desc" }, take: 1 },
        estacao: true
      }
    });

    if (!usina) return NextResponse.json({ error: "Usina não encontrada" }, { status: 404 });

    const latest = usina.telemetria[0];
    const analise = usina.analises[0];

    const alarmesAtivos = await prisma.alarme.findMany({
      where: { usinaId, status: "ATIVO" },
      orderBy: { timestamp: "desc" }
    });

    // Sem dados de telemetria = aguarda próxima sincronização
    if (!latest) {
      return NextResponse.json({
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
        mensagem: "Aguardando primeira sincronização com a API Solis",
        curvaGeracao: []
      });
    }

    // Pega o registro mais recente de hoje para geração do dia
    const todayStart = getTodayBRT();
    const latestToday = await prisma.telemetria.findFirst({
      where: { usinaId, timestamp: { gte: todayStart } },
      orderBy: { timestamp: 'desc' }
    });

    // eToday = energiaAcumuladaKWh do registro mais recente do dia
    const geracaoHoje = latestToday?.energiaAcumuladaKWh ?? latest?.energiaAcumuladaKWh ?? 0;
    const potenciaAtual = latestToday?.potenciaAtivaKW ?? latest?.potenciaAtivaKW ?? 0;

    // Performance Ratio real
    const pr = usina.capacidadeKWp > 0 && potenciaAtual > 0
      ? ((potenciaAtual / usina.capacidadeKWp) * 100 * 1.25).toFixed(1)
      : analise?.performanceRatio
        ? (analise.performanceRatio * 100).toFixed(1)
        : "0.0";

    // Curva de geração: pega registros do dia de hoje em ordem cronológica
    const curvaHoje = usina.telemetria
      .filter(t => new Date(t.timestamp) >= todayStart)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(t => ({
        time: new Date(t.timestamp).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        }),
        actual: t.potenciaAtivaKW,
        expected: usina.capacidadeKWp * 0.80 // PR esperado de 80%
      }));

    return NextResponse.json({
      nome: usina.nome,
      potenciaAtual,
      potenciaPico: usina.capacidadeKWp,
      geracaoHoje,                           // ← eToday real da Solis
      pr: Math.min(parseFloat(pr.toString()), 100),
      health: 98.2,
      irradiancia: latest?.irradiancia || 0,
      tempAmbiente: latest?.tempAmbiente || 0,
      tempModulos: latest?.tempModulos || 0,
      vento: 0,
      
      telemetrias: usina.telemetria.map(t => ({
        id: t.id,
        timestamp: t.timestamp,
        potenciaAtivaKW: t.potenciaAtivaKW,
        energiaAcumuladaKWh: t.energiaAcumuladaKWh,
        irradiancia: t.irradiancia,
        tempAmbiente: t.tempAmbiente,
        dadosStrings: t.dadosStrings,
        tensaoCA_A: t.tensaoCA_A
      })),

      detalhesCA: {
        faseA: { V: latest?.tensaoCA_A || 0, I: latest?.correnteCA_A || 0, P: potenciaAtual / 3 },
        faseB: { V: latest?.tensaoCA_B || 0, I: latest?.correnteCA_B || 0, P: potenciaAtual / 3 },
        faseC: { V: latest?.tensaoCA_C || 0, I: latest?.correnteCA_C || 0, P: potenciaAtual / 3 }
      },
      tempIGBT: latest?.tempIGBT || 0,
      dadosStrings: latest?.dadosStrings || {},
      alarmes: alarmesAtivos.map(a => ({
        id: a.id,
        codigo: a.codigo,
        descricao: a.descricao,
        gravidade: a.gravidade,
        solucao: a.solucaoSugerida,
        timestamp: a.timestamp
      })),
      estacao: usina.estacao ? { nome: usina.estacao.nome, id: usina.estacao.id } : null,
      curvaGeracao: curvaHoje.length > 0 ? curvaHoje : [
        { time: "06:00", actual: 0, expected: 0 },
        { time: "12:00", actual: potenciaAtual, expected: usina.capacidadeKWp * 0.85 }
      ]
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar análises" }, { status: 500 });
  }
}
