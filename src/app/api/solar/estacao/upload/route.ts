import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as ExcelJS from 'exceljs';

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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      return NextResponse.json({ error: 'Planilha vazia ou sem linhas de dados' }, { status: 400 });
    }

    // Mapear cabeçalhos
    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      const norm = normalizeHeader(String(cell.value || ''));
      if (norm.includes('data') || norm.includes('time') || norm.includes('hora')) {
        if (!colMap['timestamp']) colMap['timestamp'] = colNumber;
      }
      if (norm.includes('ghi') || norm.includes('global') || (norm.includes('rad') && !norm.includes('poa'))) {
        colMap['ghi'] = colNumber;
      }
      if (norm.includes('poa') || norm.includes('plano') || norm.includes('modulo')) {
        colMap['poa'] = colNumber;
      }
      if (norm.includes('temp_amb') || norm.includes('temperatura_amb') || norm === 'ta' || norm === 'tamb') {
        colMap['tempAmbiente'] = colNumber;
      }
      if (norm.includes('temp_mod') || norm.includes('temp_painel') || norm === 'tmod') {
        colMap['tempModulos'] = colNumber;
      }
      if (norm.includes('vento') || norm.includes('wind') || norm === 'ws') {
        if (norm.includes('dir')) {
          colMap['direcaoVento'] = colNumber;
        } else {
          colMap['velocidadeVento'] = colNumber;
        }
      }
      if (norm.includes('umidade') || norm.includes('rh') || norm.includes('humidity')) {
        colMap['umidadeRelativa'] = colNumber;
      }
      if (norm.includes('pressao') || norm.includes('baro') || norm.includes('pressure')) {
        colMap['pressao'] = colNumber;
      }
      if (norm.includes('chuva') || norm.includes('rain') || norm.includes('precipitacao')) {
        colMap['chuvaAcumulada'] = colNumber;
      }
      if (norm.includes('sujidade') || norm.includes('soiling')) {
        colMap['indiceSujidade'] = colNumber;
      }
    });

    if (!colMap['timestamp']) {
      // Fallback: se coluna 1 tem data
      colMap['timestamp'] = 1;
    }

    const recordsToInsert: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // ignora cabeçalho

      const tsVal = row.getCell(colMap['timestamp']).value;
      const ts = parseDateCell(tsVal);
      if (!ts) return;

      const ghi = colMap['ghi'] ? parseNumberCell(row.getCell(colMap['ghi']).value) : null;
      const poa = colMap['poa'] ? parseNumberCell(row.getCell(colMap['poa']).value) : null;
      const tempAmb = colMap['tempAmbiente'] ? parseNumberCell(row.getCell(colMap['tempAmbiente']).value) : null;
      const tempMod = colMap['tempModulos'] ? parseNumberCell(row.getCell(colMap['tempModulos']).value) : null;
      const velVento = colMap['velocidadeVento'] ? parseNumberCell(row.getCell(colMap['velocidadeVento']).value) : null;
      const dirVento = colMap['direcaoVento'] ? parseNumberCell(row.getCell(colMap['direcaoVento']).value) : null;
      const umidade = colMap['umidadeRelativa'] ? parseNumberCell(row.getCell(colMap['umidadeRelativa']).value) : null;
      const pressao = colMap['pressao'] ? parseNumberCell(row.getCell(colMap['pressao']).value) : null;
      const chuva = colMap['chuvaAcumulada'] ? parseNumberCell(row.getCell(colMap['chuvaAcumulada']).value) : null;
      const soiling = colMap['indiceSujidade'] ? parseNumberCell(row.getCell(colMap['indiceSujidade']).value) : null;

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
    });

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
