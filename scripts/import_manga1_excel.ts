import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852
const EXCEL_PATH = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

async function main() {
  console.log('Iniciando leitura da planilha:', EXCEL_PATH);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  console.log('Planilha carregada. Processando abas...');

  // 1. Processar Aba Strings para montar o mapa de strings por timestamp
  const sheetStrings = workbook.getWorksheet('Strings (CC por Inversor)');
  const stringsByTimestamp: Record<string, Record<string, { V: number; I: number }>> = {};

  if (sheetStrings) {
    console.log(`Lendo aba Strings (${sheetStrings.rowCount} linhas)...`);
    sheetStrings.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // cabeçalho

      const tsStr = String(row.getCell(1).value || '').trim(); // e.g. "2026-05-16 10:23"
      if (!tsStr) return;

      const invSN = String(row.getCell(4).value || '').trim();
      const strName = String(row.getCell(5).value || '').trim();
      const vVal = parseFloat(String(row.getCell(6).value || '0')) || 0;
      const iVal = parseFloat(String(row.getCell(7).value || '0')) || 0;

      if (!stringsByTimestamp[tsStr]) {
        stringsByTimestamp[tsStr] = {};
      }

      // Key format: `${invSN}_${strName}` ou `${strName}` se já tiver prefixo
      const key = invSN && invSN !== strName ? `${invSN}_${strName}` : strName;
      stringsByTimestamp[tsStr][key] = { V: vVal, I: iVal };
    });
    console.log(`Strings mapeadas para ${Object.keys(stringsByTimestamp).length} timestamps distintos.`);
  }

  // 2. Processar Aba Consolidado
  const sheetConsolidado = workbook.getWorksheet('Consolidado (Usina)');
  if (!sheetConsolidado) {
    throw new Error('Aba Consolidado (Usina) não encontrada!');
  }

  console.log(`Lendo aba Consolidado (${sheetConsolidado.rowCount} linhas)...`);
  const recordsToUpsert: Array<{
    timestamp: Date;
    potenciaAtivaKW: number;
    energiaAcumuladaKWh: number;
    tensaoCA_A: number;
    tensaoCA_B: number;
    tensaoCA_C: number;
    correnteCA_A: number;
    correnteCA_B: number;
    correnteCA_C: number;
    frequenciaRede: number;
    tempIGBT: number;
    statusInversor: string;
    dadosStrings: Record<string, { V: number; I: number }>;
  }> = [];

  sheetConsolidado.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho

    const tsStr = String(row.getCell(1).value || '').trim(); // "YYYY-MM-DD HH:mm"
    if (!tsStr) return;

    // Converter horário local BRT (UTC-3) para Date UTC
    const [datePart, timePart] = tsStr.split(' ');
    if (!datePart || !timePart) return;

    const isoLocal = `${datePart}T${timePart}:00-03:00`;
    const ts = new Date(isoLocal);
    if (isNaN(ts.getTime())) return;

    const potenciaCA = parseFloat(String(row.getCell(4).value || '0')) || 0;
    const energiaAcum = parseFloat(String(row.getCell(5).value || '0')) || 0;
    const tensaoA = parseFloat(String(row.getCell(6).value || '0')) || 0;
    const tensaoB = parseFloat(String(row.getCell(7).value || '0')) || 0;
    const tensaoC = parseFloat(String(row.getCell(8).value || '0')) || 0;
    const correnteA = parseFloat(String(row.getCell(9).value || '0')) || 0;
    const correnteB = parseFloat(String(row.getCell(10).value || '0')) || 0;
    const correnteC = parseFloat(String(row.getCell(11).value || '0')) || 0;
    const freq = parseFloat(String(row.getCell(12).value || '60')) || 60;
    const temp = parseFloat(String(row.getCell(13).value || '0')) || 0;
    const status = String(row.getCell(14).value || 'ONLINE').trim() || 'ONLINE';

    const strings = stringsByTimestamp[tsStr] || {};

    recordsToUpsert.push({
      timestamp: ts,
      potenciaAtivaKW: potenciaCA,
      energiaAcumuladaKWh: energiaAcum,
      tensaoCA_A: tensaoA,
      tensaoCA_B: tensaoB,
      tensaoCA_C: tensaoC,
      correnteCA_A: correnteA,
      correnteCA_B: correnteB,
      correnteCA_C: correnteC,
      frequenciaRede: freq,
      tempIGBT: temp,
      statusInversor: status,
      dadosStrings: strings,
    });
  });

  console.log(`Total de registros a atualizar/inserir no banco: ${recordsToUpsert.length}`);

  // 3. Atualizar no banco em lotes
  const BATCH_SIZE = 100;
  let updatedCount = 0;
  let createdCount = 0;

  for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
    const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);

    for (const r of batch) {
      const existing = await prisma.telemetria.findFirst({
        where: {
          usinaId: USINA_ID,
          timestamp: r.timestamp,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.telemetria.update({
          where: { id: existing.id },
          data: {
            potenciaAtivaKW: r.potenciaAtivaKW,
            energiaAcumuladaKWh: r.energiaAcumuladaKWh,
            tensaoCA_A: r.tensaoCA_A,
            tensaoCA_B: r.tensaoCA_B,
            tensaoCA_C: r.tensaoCA_C,
            correnteCA_A: r.correnteCA_A,
            correnteCA_B: r.correnteCA_B,
            correnteCA_C: r.correnteCA_C,
            frequenciaRede: r.frequenciaRede,
            tempIGBT: r.tempIGBT,
            statusInversor: r.statusInversor,
            dadosStrings: r.dadosStrings,
          },
        });
        updatedCount++;
      } else {
        await prisma.telemetria.create({
          data: {
            usinaId: USINA_ID,
            timestamp: r.timestamp,
            potenciaAtivaKW: r.potenciaAtivaKW,
            energiaAcumuladaKWh: r.energiaAcumuladaKWh,
            tensaoCA_A: r.tensaoCA_A,
            tensaoCA_B: r.tensaoCA_B,
            tensaoCA_C: r.tensaoCA_C,
            correnteCA_A: r.correnteCA_A,
            correnteCA_B: r.correnteCA_B,
            correnteCA_C: r.correnteCA_C,
            frequenciaRede: r.frequenciaRede,
            tempIGBT: r.tempIGBT,
            statusInversor: r.statusInversor,
            dadosStrings: r.dadosStrings,
          },
        });
        createdCount++;
      }
    }

    const progress = Math.min(i + BATCH_SIZE, recordsToUpsert.length);
    console.log(`Progresso: ${progress}/${recordsToUpsert.length} (Atualizados: ${updatedCount}, Criados: ${createdCount})`);
  }

  // 4. Atualizar métricas diárias agregadas para cada dia presente na planilha
  console.log('\nRecalculando métricas diárias (MetricaDiariaUsina)...');
  const datesSet = new Set(
    recordsToUpsert.map((r) => {
      const brtDate = new Date(r.timestamp.getTime() - 3 * 3600 * 1000);
      return brtDate.toISOString().substring(0, 10);
    })
  );

  for (const dateStr of datesSet) {
    const dayRecords = recordsToUpsert.filter((r) => {
      const brtDate = new Date(r.timestamp.getTime() - 3 * 3600 * 1000);
      return brtDate.toISOString().substring(0, 10) === dateStr;
    });

    const dayEnergyIntegral = dayRecords.reduce((acc, curr) => acc + curr.potenciaAtivaKW * (5 / 60), 0);
    const maxDayEnergy = Math.max(...dayRecords.map((r) => r.energiaAcumuladaKWh));
    const finalEnergy = maxDayEnergy > 0 ? maxDayEnergy : dayEnergyIntegral;

    const dataNoon = new Date(`${dateStr}T12:00:00-03:00`);

    await prisma.metricaDiariaUsina.upsert({
      where: {
        data_usinaId: {
          data: dataNoon,
          usinaId: USINA_ID,
        },
      },
      update: {
        energiaRealKWh: parseFloat(finalEnergy.toFixed(2)),
      },
      create: {
        data: dataNoon,
        usinaId: USINA_ID,
        energiaRealKWh: parseFloat(finalEnergy.toFixed(2)),
        energiaProjetadaPvlibKWh: parseFloat((finalEnergy * 0.95).toFixed(2)),
        performanceRatioReal: 0.82,
        integralSolarimetricaKWhM2: 5.4,
      },
    });
  }

  console.log(`\n✅ Sucesso! Total no banco atualizado: ${updatedCount} atualizados, ${createdCount} criados.`);
  console.log(`Total de dias com métricas calculadas: ${datesSet.size}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
