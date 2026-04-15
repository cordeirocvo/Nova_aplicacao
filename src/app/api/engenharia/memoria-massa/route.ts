import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processarMemoriaMassa, type PostoConfig } from '@/lib/engenharia/massaParser';

export const maxDuration = 60; // 60s timeout for large files
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const projetoId = formData.get('projetoId') as string;
    const postoConfig: PostoConfig = {
      hp_inicio: (formData.get('hp_inicio') as string) || '18:00',
      hp_fim: (formData.get('hp_fim') as string) || '21:00',
      hfp_inicio: (formData.get('hfp_inicio') as string) || '21:00',
      hfp_fim: (formData.get('hfp_fim') as string) || '18:00',
      hr_inicio: (formData.get('hr_inicio') as string) || undefined,
      hr_fim: (formData.get('hr_fim') as string) || undefined,
      diasUteis: [1, 2, 3, 4, 5], // Seg a Sex
    };

    if (!projetoId) {
      return NextResponse.json({ error: 'projetoId obrigatório.' }, { status: 400 });
    }

    // Coletar todos os arquivos enviados
    const files = formData.getAll('files') as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffers: Buffer[] = [];
    const nomes: string[] = [];
    for (const f of files) {
      const bytes = await f.arrayBuffer();
      buffers.push(Buffer.from(bytes));
      nomes.push(f.name);
    }

    // Processar memória de massa
    const resultado = processarMemoriaMassa(buffers, postoConfig);
    if (!resultado) {
      return NextResponse.json({
        error: 'Não foi possível processar os arquivos. Verifique se são arquivos XLS/XLSX de memória de massa CEMIG.',
      }, { status: 422 });
    }

    // Salvar no banco
    const analise = await prisma.analiseMassaDados.create({
      data: {
        projetoId,
        nomeArquivos: nomes,
        rawXlsUrls: [], // TODO: upload para Supabase Storage
        postoHP_inicio: postoConfig.hp_inicio,
        postoHP_fim: postoConfig.hp_fim,
        postoHFP_inicio: postoConfig.hfp_inicio,
        postoHFP_fim: postoConfig.hfp_fim,
        postoHR_inicio: postoConfig.hr_inicio || null,
        postoHR_fim: postoConfig.hr_fim || null,
        periodoInicio: resultado.periodoInicio,
        periodoFim: resultado.periodoFim,
        totalRegistros: resultado.totalRegistros,
        maxDemandaHP: resultado.maxDemandaHP,
        maxDemandaHFP: resultado.maxDemandaHFP,
        maxDemandaHR: resultado.maxDemandaHR,
        maxDemandaTotal: resultado.maxDemandaTotal,
        consumoHP_kWh: resultado.consumoHP_kWh,
        consumoHFP_kWh: resultado.consumoHFP_kWh,
        consumoHR_kWh: resultado.consumoHR_kWh,
        curvaMediaDiaria: resultado.curvaMediaDiaria,
        curvaHP: resultado.curvaHP,
        curvaHFP: resultado.curvaHFP,
        diaCriticoData: resultado.diaCriticoData,
        diaCriticoDemandaKW: resultado.diaCriticoDemandaKW,
        diaCriticoCurva: resultado.diaCriticoCurva,
        processado: true,
      },
    });

    return NextResponse.json({
      success: true,
      analise,
      resumoMensal: resultado.resumoMensal,
    });
  } catch (error: any) {
    console.error('Erro ao processar memória de massa:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projetoId = searchParams.get('projetoId');
  if (!projetoId) return NextResponse.json({ error: 'projetoId required' }, { status: 400 });

  const analises = await prisma.analiseMassaDados.findMany({
    where: { projetoId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(analises);
}
