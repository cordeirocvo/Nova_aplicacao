import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseDateCell(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  const str = String(val).trim();
  // Formatos: YYYY-MM-DD HH:mm:ss, DD/MM/YYYY HH:mm:ss, etc.
  if (str.includes('/')) {
    const parts = str.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = (parts[1] || '00:00:00').split(':');

    if (dateParts.length === 3) {
      // DD/MM/YYYY
      const d = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10) - 1;
      const y = parseInt(dateParts[2], 10);
      const hh = parseInt(timeParts[0] || '0', 10);
      const mm = parseInt(timeParts[1] || '0', 10);
      const ss = parseInt(timeParts[2] || '0', 10);
      // Salva no fuso de Brasília (UTC-3)
      return new Date(Date.UTC(y, m, d, hh + 3, mm, ss));
    }
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumberCell(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const clean = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let estacaoId = (formData.get('estacaoId') as string | null) || '';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Se não informou estação, buscar ou criar Estação Sigma padrão
    if (!estacaoId) {
      let estacao = await prisma.estacaoSolarimetrica.findFirst({
        where: { apiFornecedor: 'SIGMA' },
      });
      if (!estacao) {
        estacao = await prisma.estacaoSolarimetrica.create({
          data: {
            nome: 'Estação Solarimétrica Sigma - Manga Grande',
            apiFornecedor: 'SIGMA',
            apiId: 'SIGMA-MG01',
            modoColeta: 'EXCEL',
            localizacao: 'Usina Manga Grande 01',
          },
        });
      }
      estacaoId = estacao.id;
    }

    // Vincular à Usina Manga Grande 01 se ainda não estiver vinculada
    const usinaMG1 = await prisma.usina.findFirst({
      where: { id: 'cmp8hqv4400h9wgv5c9f2tdbh' },
    });
    if (usinaMG1 && !usinaMG1.estacaoId) {
      await prisma.usina.update({
        where: { id: usinaMG1.id },
        data: { estacaoId },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'Planilha sem abas encontradas' }, { status: 400 });
    }
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    if (!rawRows || rawRows.length < 2) {
      return NextResponse.json({ error: 'Planilha vazia ou sem linhas de dados' }, { status: 400 });
    }

    // Mapear cabeçalhos
    const headerRow = rawRows[0] || [];
    const colMap: Record<string, number> = {};

    headerRow.forEach((val: any, colIndex: number) => {
      const norm = normalizeHeader(String(val || ''));
      if (norm.includes('data') || norm.includes('time') || norm.includes('hora')) {
        if (colMap['timestamp'] === undefined) colMap['timestamp'] = colIndex;
      }
      if (norm.includes('ghi') || norm.includes('global') || (norm.includes('rad') && !norm.includes('poa'))) {
        colMap['ghi'] = colIndex;
      }
      if (norm.includes('poa') || norm.includes('plano') || norm.includes('modulo')) {
        colMap['poa'] = colIndex;
      }
      if (norm.includes('temp_amb') || norm.includes('temperatura_amb') || norm === 'ta' || norm === 'tamb') {
        colMap['tempAmbiente'] = colIndex;
      }
      if (norm.includes('temp_mod') || norm.includes('temp_painel') || norm === 'tmod') {
        colMap['tempModulos'] = colIndex;
      }
      if (norm.includes('vento') || norm.includes('wind') || norm === 'ws') {
        if (norm.includes('dir')) {
          colMap['direcaoVento'] = colIndex;
        } else {
          colMap['velocidadeVento'] = colIndex;
        }
      }
      if (norm.includes('umidade') || norm.includes('rh') || norm.includes('humidity')) {
        colMap['umidadeRelativa'] = colIndex;
      }
      if (norm.includes('pressao') || norm.includes('baro') || norm.includes('pressure')) {
        colMap['pressao'] = colIndex;
      }
      if (norm.includes('chuva') || norm.includes('rain') || norm.includes('precipitacao')) {
        colMap['chuvaAcumulada'] = colIndex;
      }
      if (norm.includes('sujidade') || norm.includes('soiling')) {
        colMap['indiceSujidade'] = colIndex;
      }
    });

    if (colMap['timestamp'] === undefined) {
      // Fallback: se coluna 0 tem data
      colMap['timestamp'] = 0;
    }

    const recordsToInsert: any[] = [];

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const tsVal = row[colMap['timestamp']];
      const ts = parseDateCell(tsVal);
      if (!ts) continue;

      const ghi = colMap['ghi'] !== undefined ? parseNumberCell(row[colMap['ghi']]) : null;
      const poa = colMap['poa'] !== undefined ? parseNumberCell(row[colMap['poa']]) : null;
      const tempAmb = colMap['tempAmbiente'] !== undefined ? parseNumberCell(row[colMap['tempAmbiente']]) : null;
      const tempMod = colMap['tempModulos'] !== undefined ? parseNumberCell(row[colMap['tempModulos']]) : null;
      const velVento = colMap['velocidadeVento'] !== undefined ? parseNumberCell(row[colMap['velocidadeVento']]) : null;
      const dirVento = colMap['direcaoVento'] !== undefined ? parseNumberCell(row[colMap['direcaoVento']]) : null;
      const umidade = colMap['umidadeRelativa'] !== undefined ? parseNumberCell(row[colMap['umidadeRelativa']]) : null;
      const pressao = colMap['pressao'] !== undefined ? parseNumberCell(row[colMap['pressao']]) : null;
      const chuva = colMap['chuvaAcumulada'] !== undefined ? parseNumberCell(row[colMap['chuvaAcumulada']]) : null;
      const soiling = colMap['indiceSujidade'] !== undefined ? parseNumberCell(row[colMap['indiceSujidade']]) : null;

      recordsToInsert.push({
        estacaoId,
        timestamp: ts,
        ghi,
        poa: poa ?? (ghi ? ghi * 1.05 : null), // Estimativa de POA se só tiver GHI
        tempAmbiente: tempAmb,
        tempModulos: tempMod ?? (tempAmb ? tempAmb + 15 : null),
        velocidadeVento: velVento,
        direcaoVento: dirVento,
        umidadeRelativa: umidade,
        pressao,
        chuvaAcumulada: chuva,
        indiceSujidade: soiling,
      });
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json({ error: 'Nenhum registro válido de data/hora encontrado' }, { status: 400 });
    }

    // Gravar em lotes no banco
    const BATCH_SIZE = 1000;
    let savedCount = 0;

    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      await prisma.telemetriaEstacao.createMany({
        data: batch,
        skipDuplicates: true,
      });
      savedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      estacaoId,
      totalProcessado: recordsToInsert.length,
      salvos: savedCount,
      colunasMapeadas: colMap,
      mensagem: `Importação da Estação Sigma concluída com sucesso! ${savedCount} registros gravados.`,
    });
  } catch (error: any) {
    console.error('Erro no upload da estação:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar arquivo' }, { status: 500 });
  }
}
