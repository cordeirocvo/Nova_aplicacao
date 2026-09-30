import { NextResponse } from 'next/server';
import { calcularAvancoFisicoObra } from '@/lib/rdo/curvaSEngine';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projetoId = searchParams.get('projetoId') || searchParams.get('obraId');

    if (!projetoId) {
      return NextResponse.json({ success: false, error: 'Parâmetro projetoId é obrigatório' }, { status: 400 });
    }

    const resultado = await calcularAvancoFisicoObra(projetoId);

    return NextResponse.json({
      success: true,
      ...resultado
    });
  } catch (error: any) {
    console.error('[API CURVA-S] Erro:', error?.message);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projetoId, etapas } = body;

    if (!projetoId || !Array.isArray(etapas)) {
      return NextResponse.json({ success: false, error: 'Dados inválidos' }, { status: 400 });
    }

    // Atualiza os pesos e progressos das etapas no banco
    for (const item of etapas) {
      if (item.id) {
        await prisma.orcamentoEtapa.update({
          where: { id: item.id },
          data: {
            pesoPercentual: item.pesoPercentual ? parseFloat(String(item.pesoPercentual)) : 0,
            progressoAcumulado: item.progressoAcumulado ? parseFloat(String(item.progressoAcumulado)) : 0
          }
        });
      }
    }

    const resultadoAtualizado = await calcularAvancoFisicoObra(projetoId);

    return NextResponse.json({
      success: true,
      message: 'Pesos e progressos das etapas atualizados com sucesso!',
      ...resultadoAtualizado
    });
  } catch (error: any) {
    console.error('[API CURVA-S POST] Erro:', error?.message);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
