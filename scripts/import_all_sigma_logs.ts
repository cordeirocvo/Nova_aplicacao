import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import glob from 'glob';
import { prisma } from '../src/lib/prisma';

const SIGMA_DIR = String.raw`E:\Antigravity\Sigma\Mass_Storage\Datalogger`;
const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852

interface BucketAccumulator {
  count: number;
  sumGhi: number;
  sumPoa: number;
  sumTempAmb: number;
  sumTempMod: number;
  sumVento: number;
  sumUmidade: number;
  validGhi: number;
  validPoa: number;
  validTempAmb: number;
  validTempMod: number;
  validVento: number;
  validUmidade: number;
}

async function main() {
  console.log(`\n=============================================================`);
  console.log(`  IMPORTADOR AUTOMÁTICO DE DADOS DA ESTAÇÃO SIGMA (DATALOGGER)`);
  console.log(`  Origem: ${SIGMA_DIR}`);
  console.log(`=============================================================\n`);

  // 1. Garantir que a Estação Sigma existe e está vinculada à Usina Manga Grande 01
  let estacao = await prisma.estacaoSolarimetrica.findFirst({
    where: { apiFornecedor: 'SIGMA' },
  });

  if (!estacao) {
    estacao = await prisma.estacaoSolarimetrica.create({
      data: {
        nome: 'Estação Solarimétrica Sigma - Manga Grande',
        apiFornecedor: 'SIGMA',
        apiId: 'SIGMA-MG01',
        modoColeta: 'DATALOGGER_MASS_STORAGE',
        localizacao: 'Usina Manga Grande UFV 1',
      },
    });
    console.log(`Estação Sigma criada: ID ${estacao.id}`);
  } else {
    console.log(`Estação Sigma encontrada: ID ${estacao.id} (${estacao.nome})`);
  }

  // Vincular à usina se necessário
  await prisma.usina.update({
    where: { id: USINA_ID },
    data: { estacaoId: estacao.id },
  });
  console.log(`Usina Manga Grande 01 vinculada à Estação Sigma (${estacao.id}).`);

  // 2. Localizar todos os arquivos logging_*.csv em 2026
  const pattern = path.join(SIGMA_DIR, '*', 'logging_*.csv').replace(/\\/g, '/');
  const allFiles = glob.sync(pattern);

  // Filtrar pastas de 2026
  const files2026 = allFiles.filter((f) => f.includes('/2026_') || f.includes('\\2026_'));
  console.log(`Arquivos de log da Estação Sigma encontrados para 2026: ${files2026.length}`);

  // Mapa global de agregados por balde de 5 minutos: key = 'YYYY-MM-DD HH:mm'
  const buckets = new Map<string, BucketAccumulator>();

  for (const filePath of files2026) {
    const folder = path.basename(path.dirname(filePath));
    console.log(`\nLendo arquivo: ${folder} ...`);

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let header: string[] = [];
    let linesInFile = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;
      if (header.length === 0) {
        header = line.split(';').map((h) => h.trim());
        continue;
      }

      linesInFile++;
      const parts = line.split(';');
      if (parts.length < 15) continue;

      const dateRaw = parts[1]?.trim(); // e.g. "2026/09/04"
      const timeRaw = parts[2]?.trim(); // e.g. "12:34:59,510"
      if (!dateRaw || !timeRaw || !dateRaw.startsWith('2026')) continue;

      const dateClean = dateRaw.replace(/\//g, '-'); // "2026-09-04"
      const timeOnly = timeRaw.split(',')[0]; // "12:34:59"
      const [hhStr, mmStr] = timeOnly.split(':');
      const hh = parseInt(hhStr, 10);
      const mm = parseInt(mmStr, 10);
      if (isNaN(hh) || isNaN(mm)) continue;

      // Alinhar ao balde de 5 minutos mais próximo (00, 05, 10, 15, 20...)
      const mmBucket = Math.floor(mm / 5) * 5;
      const bucketTimeStr = `${String(hh).padStart(2, '0')}:${String(mmBucket).padStart(2, '0')}`;
      const bucketKey = `${dateClean} ${bucketTimeStr}`;

      // Extrair valores numéricos (tratar separador decimal com vírgula)
      const ghi = parseFloat((parts[3] || '').replace(',', '.'));
      const poa = parseFloat((parts[6] || '').replace(',', '.'));
      const tempAmb = parseFloat((parts[12] || '').replace(',', '.'));
      const umidade = parseFloat((parts[15] || '').replace(',', '.'));
      const velVento = parseFloat((parts[18] || '').replace(',', '.'));
      const tempMod = parseFloat((parts[21] || '').replace(',', '.'));

      let b = buckets.get(bucketKey);
      if (!b) {
        b = {
          count: 0,
          sumGhi: 0,
          sumPoa: 0,
          sumTempAmb: 0,
          sumTempMod: 0,
          sumVento: 0,
          sumUmidade: 0,
          validGhi: 0,
          validPoa: 0,
          validTempAmb: 0,
          validTempMod: 0,
          validVento: 0,
          validUmidade: 0,
        };
        buckets.set(bucketKey, b);
      }

      b.count++;
      if (!isNaN(ghi)) {
        b.sumGhi += Math.max(0, ghi);
        b.validGhi++;
      }
      if (!isNaN(poa)) {
        b.sumPoa += Math.max(0, poa);
        b.validPoa++;
      }
      if (!isNaN(tempAmb)) {
        b.sumTempAmb += tempAmb;
        b.validTempAmb++;
      }
      if (!isNaN(tempMod)) {
        b.sumTempMod += tempMod;
        b.validTempMod++;
      }
      if (!isNaN(velVento)) {
        b.sumVento += Math.max(0, velVento);
        b.validVento++;
      }
      if (!isNaN(umidade)) {
        b.sumUmidade += Math.max(0, Math.min(100, umidade));
        b.validUmidade++;
      }
    }

    console.log(`-> ${linesInFile} linhas processadas em ${folder}. Total de baldes acumulados: ${buckets.size}`);
  }

  console.log(`\n=============================================================`);
  console.log(`  CONVERTENDO ${buckets.size} BALDES DE 5 MINUTOS PARA GRAVAÇÃO`);
  console.log(`=============================================================\n`);

  const recordsToUpsert: Array<{
    estacaoId: string;
    timestamp: Date;
    ghi: number | null;
    poa: number | null;
    tempAmbiente: number | null;
    tempModulos: number | null;
    velocidadeVento: number | null;
    umidadeRelativa: number | null;
  }> = [];

  for (const [bucketKey, b] of buckets.entries()) {
    const [datePart, timePart] = bucketKey.split(' ');
    // Fuso horário de Brasília (UTC-3)
    const isoLocal = `${datePart}T${timePart}:00-03:00`;
    const ts = new Date(isoLocal);
    if (isNaN(ts.getTime())) continue;

    const ghiMean = b.validGhi > 0 ? parseFloat((b.sumGhi / b.validGhi).toFixed(2)) : null;
    const poaMean = b.validPoa > 0 ? parseFloat((b.sumPoa / b.validPoa).toFixed(2)) : null;
    const tempAmbMean = b.validTempAmb > 0 ? parseFloat((b.sumTempAmb / b.validTempAmb).toFixed(2)) : null;
    const tempModMean = b.validTempMod > 0 ? parseFloat((b.sumTempMod / b.validTempMod).toFixed(2)) : null;
    const ventoMean = b.validVento > 0 ? parseFloat((b.sumVento / b.validVento).toFixed(2)) : null;
    const umidadeMean = b.validUmidade > 0 ? parseFloat((b.sumUmidade / b.validUmidade).toFixed(1)) : null;

    recordsToUpsert.push({
      estacaoId: estacao.id,
      timestamp: ts,
      ghi: ghiMean,
      poa: poaMean ?? (ghiMean ? parseFloat((ghiMean * 1.05).toFixed(2)) : null),
      tempAmbiente: tempAmbMean,
      tempModulos: tempModMean ?? (tempAmbMean ? parseFloat((tempAmbMean + 15).toFixed(2)) : null),
      velocidadeVento: ventoMean,
      umidadeRelativa: umidadeMean,
    });
  }

  // Ordenar por timestamp
  recordsToUpsert.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  console.log(`Total de registros prontos para gravação: ${recordsToUpsert.length}`);

  // Inserir no banco em lotes de 1.000 com skipDuplicates
  const BATCH_SIZE = 1000;
  let saved = 0;

  for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
    const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);
    await prisma.telemetriaEstacao.createMany({
      data: batch,
      skipDuplicates: true,
    });
    saved += batch.length;
    const pct = Math.round((saved / recordsToUpsert.length) * 100);
    process.stdout.write(`\rProgresso de gravação: ${saved}/${recordsToUpsert.length} (${pct}%)`);
  }

  console.log(`\n\n✅ SUCESSO! ${saved} registros de telemetria da Estação Sigma gravados no banco!`);

  // Verificar cobertura de datas gravadas
  const countInDb = await prisma.telemetriaEstacao.count({ where: { estacaoId: estacao.id } });
  console.log(`Total de registros da Estação Sigma agora no banco: ${countInDb}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
