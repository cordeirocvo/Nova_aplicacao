import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * Endpoint de Telemetria da Estação Solarimétrica
 * Suporta POST (ingestão contínua via Gateway/IoT) e GET (consulta de medições)
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
    const body = await req.json();

    // Se houver chave, validar estação
    let estacao = null;
    if (apiKey) {
      estacao = await prisma.estacaoSolarimetrica.findFirst({
        where: { apiKey },
      });
    }

    if (!estacao) {
      // Fallback para estação Sigma padrão
      estacao = await prisma.estacaoSolarimetrica.findFirst({
        where: { apiFornecedor: 'SIGMA' },
      });
      if (!estacao) {
        estacao = await prisma.estacaoSolarimetrica.create({
          data: {
            nome: 'Estação Solarimétrica Sigma - Manga Grande',
            apiFornecedor: 'SIGMA',
            apiId: 'SIGMA-MG01',
            modoColeta: 'API',
          },
        });
      }
    }

    const payload = Array.isArray(body) ? body : [body];
    const recordsToInsert = [];

    for (const item of payload) {
      const ts = item.timestamp ? new Date(item.timestamp) : new Date();
      if (isNaN(ts.getTime())) continue;

      recordsToInsert.push({
        estacaoId: estacao.id,
        timestamp: ts,
        ghi: item.ghi !== undefined ? parseFloat(item.ghi) : null,
        poa: item.poa !== undefined ? parseFloat(item.poa) : (item.ghi ? parseFloat(item.ghi) * 1.05 : null),
        tempAmbiente: item.tempAmbiente !== undefined ? parseFloat(item.tempAmbiente) : null,
        tempModulos: item.tempModulos !== undefined ? parseFloat(item.tempModulos) : null,
        velocidadeVento: item.velocidadeVento !== undefined ? parseFloat(item.velocidadeVento) : null,
        direcaoVento: item.direcaoVento !== undefined ? parseFloat(item.direcaoVento) : null,
        umidadeRelativa: item.umidadeRelativa !== undefined ? parseFloat(item.umidadeRelativa) : null,
        pressao: item.pressao !== undefined ? parseFloat(item.pressao) : null,
        chuvaAcumulada: item.chuvaAcumulada !== undefined ? parseFloat(item.chuvaAcumulada) : null,
        indiceSujidade: item.indiceSujidade !== undefined ? parseFloat(item.indiceSujidade) : null,
      });
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json({ error: 'Nenhum registro válido fornecido' }, { status: 400 });
    }

    await prisma.telemetriaEstacao.createMany({
      data: recordsToInsert,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      estacaoId: estacao.id,
      inseridos: recordsToInsert.length,
      mensagem: 'Telemetria da Estação Solarimétrica gravada com sucesso',
    });
  } catch (error: any) {
    console.error('Erro na ingestão de telemetria da estação:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estacaoId = searchParams.get('estacaoId') || '';
    const dateParam = searchParams.get('date'); // Ex: '2026-09-04'

    const whereClause: any = {};
    if (estacaoId) whereClause.estacaoId = estacaoId;

    if (dateParam) {
      const start = new Date(`${dateParam}T00:00:00-03:00`);
      const end = new Date(`${dateParam}T23:59:59.999-03:00`);
      whereClause.timestamp = { gte: start, lte: end };
    }

    const telemetrias = await prisma.telemetriaEstacao.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      take: 2000,
    });

    return NextResponse.json({
      success: true,
      total: telemetrias.length,
      dados: telemetrias,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
