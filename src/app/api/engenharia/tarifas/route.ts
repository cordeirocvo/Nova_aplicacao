import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ANEEL_API_BASE = 'https://dadosabertos.aneel.gov.br/api/3/action/datastore_search';
// Resource ID público dos dados de tarifas homologadas ANEEL
const TARIFAS_RESOURCE_ID = 'fcf2906c-7c32-4b9b-a637-054e7a5234f4';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const distribuidora = searchParams.get('distribuidora') || 'CEMIG-D';
  const subgrupo = searchParams.get('subgrupo') || '';
  const modalidade = searchParams.get('modalidade') || '';
  const postoTarifario = searchParams.get('posto') || '';

  try {
    // 1. Verificar cache no banco (7 dias)
    const cached = await prisma.tarifas.findMany({
      where: {
        distribuidora: { contains: distribuidora, mode: 'insensitive' },
        ...(subgrupo ? { subGrupo: subgrupo } : {}),
        ...(modalidade ? { modalidade: { contains: modalidade, mode: 'insensitive' } } : {}),
        ...(postoTarifario ? { postoTarifario: { contains: postoTarifario, mode: 'insensitive' } } : {}),
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { dataInicio: 'desc' },
      take: 20,
    });

    if (cached.length > 0) {
      return NextResponse.json({ source: 'cache', tarifas: cached });
    }

    // 2. Buscar na API ANEEL
    const filters: Record<string, string> = {
      SigAgente: distribuidora,
      ...(subgrupo ? { DscSubGrupo: subgrupo } : {}),
      ...(modalidade ? { DscModalidadeTarifaria: modalidade } : {}),
      ...(postoTarifario ? { NomPostoTarifario: postoTarifario } : {}),
    };

    const params = new URLSearchParams({
      resource_id: TARIFAS_RESOURCE_ID,
      limit: '50',
      filters: JSON.stringify(filters),
    });

    const resp = await fetch(`${ANEEL_API_BASE}?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      // Retornar dados do cache mesmo que antigos
      const anyCache = await prisma.tarifas.findMany({
        where: { distribuidora: { contains: distribuidora, mode: 'insensitive' } },
        orderBy: { dataInicio: 'desc' },
        take: 20,
      });
      return NextResponse.json({ source: 'cache_stale', tarifas: anyCache });
    }

    const data = await resp.json();
    const records = data?.result?.records || [];

    if (records.length === 0) {
      return NextResponse.json({ source: 'api', tarifas: [], message: 'Nenhuma tarifa encontrada.' });
    }

    // 3. Salvar no cache
    const tarifas = [];
    for (const r of records) {
      try {
        const valorTUSD = parseFloat(r.VlrTUSD || r.vlrTUSD || '0');
        const valorTE = parseFloat(r.VlrTE || r.vlrTE || '0');
        if (isNaN(valorTUSD) || isNaN(valorTE)) continue;

        const t = await prisma.tarifas.upsert({
          where: {
            distribuidora_subGrupo_modalidade_postoTarifario: {
              distribuidora: r.SigAgente || distribuidora,
              subGrupo: r.DscSubGrupo || subgrupo,
              modalidade: r.DscModalidadeTarifaria || modalidade,
              postoTarifario: r.NomPostoTarifario || 'NA',
            },
          },
          create: {
            distribuidora: r.SigAgente || distribuidora,
            subGrupo: r.DscSubGrupo || subgrupo,
            modalidade: r.DscModalidadeTarifaria || modalidade,
            postoTarifario: r.NomPostoTarifario || 'NA',
            valorTUSD,
            valorTE,
            dataInicio: new Date(r.DatInicioVigencia || Date.now()),
            resolution: r.DscREH || null,
          },
          update: { valorTUSD, valorTE, dataInicio: new Date(r.DatInicioVigencia || Date.now()) },
        });
        tarifas.push(t);
      } catch {}
    }

    return NextResponse.json({ source: 'api', tarifas });
  } catch (error: any) {
    console.error('Erro ao buscar tarifas:', error);
    return NextResponse.json({ error: 'Erro ao buscar tarifas', detail: error?.message }, { status: 500 });
  }
}
