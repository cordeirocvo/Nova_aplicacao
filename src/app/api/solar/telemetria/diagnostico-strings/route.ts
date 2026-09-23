import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StringDiagnosticService } from '@/lib/services/stringDiagnosticService';
import { StringTopologyService } from '@/lib/services/stringTopologyService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get('usinaId');
    const dateParam = searchParams.get('date'); // "YYYY-MM-DD"
    const inversorSNParam = searchParams.get('inversorSN');

    if (!usinaId || usinaId === 'consolidado') {
      return NextResponse.json(
        { success: false, error: 'Selecione uma usina individual para o diagnóstico detalhado de strings.' },
        { status: 400 }
      );
    }

    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: { inversores: true },
    });

    if (!usina) {
      return NextResponse.json(
        { success: false, error: 'Usina não encontrada no cadastro.' },
        { status: 404 }
      );
    }

    // Determina a data alvo (fuso Brasília UTC-3)
    const targetDateStr = dateParam || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const startOfDay = new Date(`${targetDateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59-03:00`);

    // Busca o ponto de telemetria mais representativo do dia (pico de potência entre 11h e 14h ou pico absoluto)
    const peakMidday = await prisma.telemetria.findFirst({
      where: {
        usinaId: usina.id,
        timestamp: {
          gte: new Date(`${targetDateStr}T11:00:00-03:00`),
          lte: new Date(`${targetDateStr}T14:30:00-03:00`),
        },
        dadosStrings: { not: null as any },
      },
      orderBy: { potenciaAtivaKW: 'desc' },
    });

    const targetPoint =
      peakMidday ||
      (await prisma.telemetria.findFirst({
        where: {
          usinaId: usina.id,
          timestamp: { gte: startOfDay, lte: endOfDay },
          dadosStrings: { not: null as any },
        },
        orderBy: { potenciaAtivaKW: 'desc' },
      })) ||
      (await prisma.telemetria.findFirst({
        where: {
          usinaId: usina.id,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { timestamp: 'desc' },
      }));

    if (!targetPoint) {
      return NextResponse.json({
        success: true,
        usinaId: usina.id,
        usinaNome: usina.nome,
        date: targetDateStr,
        temDados: false,
        mensagem: `Nenhum registro de telemetria encontrado para a data ${targetDateStr}.`,
        diagnostico: null,
      });
    }

    const diagnostico = StringDiagnosticService.diagnosePlant(
      usina.id,
      usina.nome,
      targetPoint,
      usina.inversores
    );

    // Se filtrado por um inversor específico
    if (inversorSNParam) {
      const cleanParam = inversorSNParam.replace(/\s+/g, '').toUpperCase();
      diagnostico.inversores = diagnostico.inversores.filter(
        (inv) => inv.inversorSN === cleanParam
      );
    }

    return NextResponse.json({
      success: true,
      usinaId: usina.id,
      usinaNome: usina.nome,
      date: targetDateStr,
      pontoTimestamp: targetPoint.timestamp,
      potenciaPicoKW: targetPoint.potenciaAtivaKW,
      temDados: true,
      diagnostico,
    });
  } catch (error: any) {
    console.error('Erro na API de diagnóstico de strings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao processar diagnóstico de strings.' },
      { status: 500 }
    );
  }
}
