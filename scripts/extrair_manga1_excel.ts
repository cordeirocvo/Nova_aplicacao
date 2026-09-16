import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as os from 'os';

const USINA_ID = 'cmp8hqv4400h9wgv5c9f2tdbh'; // USINA MANGA GRANDE UFV 1 1852

async function main() {
  console.log('Iniciando extração de dados da Usina Manga Grande 01...');

  // Check total records available
  const count = await prisma.telemetria.count({
    where: {
      usinaId: USINA_ID,
      timestamp: {
        gte: new Date('2026-01-01T00:00:00Z'),
        lte: new Date('2026-09-15T23:59:59Z'),
      },
    },
  });
  console.log(`Total de registros desde Jan/2026: ${count}`);

  // Fetch all telemetry records from January 2026
  const records = await prisma.telemetria.findMany({
    where: {
      usinaId: USINA_ID,
      timestamp: {
        gte: new Date('2026-01-01T00:00:00Z'),
        lte: new Date('2026-09-15T23:59:59Z'),
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`Registros carregados: ${records.length}`);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cordeiro Energia';
  workbook.created = new Date();
  workbook.modified = new Date();

  // --- Sheet 1: Consolidated ---
  const sheetConsolidado = workbook.addWorksheet('Consolidado (Usina)');
  sheetConsolidado.columns = [
    { header: 'Data/Hora (BRT)', key: 'timestamp', width: 22 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Potência CA Total (kW)', key: 'potenciaCA', width: 22 },
    { header: 'Energia Acumulada Dia (kWh)', key: 'energiaAcum', width: 28 },
    { header: 'Tensão CA A-B (V)', key: 'tensaoCA_A', width: 18 },
    { header: 'Tensão CA B-C (V)', key: 'tensaoCA_B', width: 18 },
    { header: 'Tensão CA C-A (V)', key: 'tensaoCA_C', width: 18 },
    { header: 'Corrente CA A (A)', key: 'correnteCA_A', width: 17 },
    { header: 'Corrente CA B (A)', key: 'correnteCA_B', width: 17 },
    { header: 'Corrente CA C (A)', key: 'correnteCA_C', width: 17 },
    { header: 'Frequência Rede (Hz)', key: 'freq', width: 20 },
    { header: 'Temp. IGBT (°C)', key: 'tempIGBT', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  // Style header
  const headerRow = sheetConsolidado.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 36;

  let addedCount = 0;
  for (const rec of records) {
    const localDate = new Date(rec.timestamp.getTime() - 3 * 3600 * 1000);
    const dateStr = localDate.toISOString().substring(0, 10);
    const timeStr = localDate.toISOString().substring(11, 16);
    const fullStr = `${dateStr} ${timeStr}`;

    sheetConsolidado.addRow({
      timestamp: fullStr,
      data: dateStr,
      hora: timeStr,
      potenciaCA: rec.potenciaAtivaKW ?? 0,
      energiaAcum: rec.energiaAcumuladaKWh ?? 0,
      tensaoCA_A: rec.tensaoCA_A ?? '',
      tensaoCA_B: rec.tensaoCA_B ?? '',
      tensaoCA_C: rec.tensaoCA_C ?? '',
      correnteCA_A: rec.correnteCA_A ?? '',
      correnteCA_B: rec.correnteCA_B ?? '',
      correnteCA_C: rec.correnteCA_C ?? '',
      freq: rec.frequenciaRede ?? '',
      tempIGBT: rec.tempIGBT ?? '',
      status: rec.statusInversor ?? 'ONLINE',
    });
    addedCount++;
  }
  console.log(`Aba Consolidado: ${addedCount} linhas`);

  // --- Sheet 2: Strings (one row per string entry) ---
  const sheetStrings = workbook.addWorksheet('Strings (CC por Inversor)');
  sheetStrings.columns = [
    { header: 'Data/Hora (BRT)', key: 'timestamp', width: 22 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Inversor SN', key: 'inversorSN', width: 24 },
    { header: 'String', key: 'string', width: 14 },
    { header: 'Tensão CC (V)', key: 'tensaoCC', width: 15 },
    { header: 'Corrente CC (A)', key: 'correnteCC', width: 16 },
    { header: 'Potência CC (kW)', key: 'potenciaCC', width: 17 },
  ];

  const hdrStrings = sheetStrings.getRow(1);
  hdrStrings.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdrStrings.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  hdrStrings.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hdrStrings.height = 36;

  let stringsAdded = 0;
  for (const rec of records) {
    const strings = (rec.dadosStrings as Record<string, { V: number; I: number }>) || {};
    if (Object.keys(strings).length === 0) continue;

    const localDate = new Date(rec.timestamp.getTime() - 3 * 3600 * 1000);
    const dateStr = localDate.toISOString().substring(0, 10);
    const timeStr = localDate.toISOString().substring(11, 16);
    const fullStr = `${dateStr} ${timeStr}`;

    for (const [key, val] of Object.entries(strings)) {
      const parts = key.split('_');
      const invSN = parts[0] || 'INV';
      const strName = parts.slice(1).join('_') || key;
      const V = val.V ?? 0;
      const I = val.I ?? 0;
      const P = parseFloat(((V * I) / 1000).toFixed(3));

      sheetStrings.addRow({
        timestamp: fullStr,
        data: dateStr,
        hora: timeStr,
        inversorSN: invSN,
        string: strName,
        tensaoCC: V,
        correnteCC: I,
        potenciaCC: P,
      });
      stringsAdded++;
    }
  }
  console.log(`Aba Strings: ${stringsAdded} linhas`);

  // --- Sheet 3: Inversor por inversor (CC) ---
  const sheetPorInv = workbook.addWorksheet('Potência CC por Inversor');
  sheetPorInv.columns = [
    { header: 'Data/Hora (BRT)', key: 'timestamp', width: 22 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Inversor SN', key: 'inversorSN', width: 24 },
    { header: 'Pot. CC Total Inv (kW)', key: 'potCC', width: 22 },
    { header: 'Pot. CA Inv (kW)', key: 'potCA', width: 18 },
    { header: 'Num Strings', key: 'numStrings', width: 12 },
  ];

  const hdrInv = sheetPorInv.getRow(1);
  hdrInv.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdrInv.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF78350F' } };
  hdrInv.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hdrInv.height = 36;

  let invLinesAdded = 0;
  for (const rec of records) {
    const strings = (rec.dadosStrings as Record<string, { V: number; I: number }>) || {};
    if (Object.keys(strings).length === 0) continue;

    const localDate = new Date(rec.timestamp.getTime() - 3 * 3600 * 1000);
    const dateStr = localDate.toISOString().substring(0, 10);
    const timeStr = localDate.toISOString().substring(11, 16);
    const fullStr = `${dateStr} ${timeStr}`;

    const invGroups: Record<string, { P: number; count: number }> = {};
    for (const [key, val] of Object.entries(strings)) {
      const invSN = key.split('_')[0];
      if (!invGroups[invSN]) invGroups[invSN] = { P: 0, count: 0 };
      const V = val.V ?? 0;
      const I = val.I ?? 0;
      invGroups[invSN].P += (V * I) / 1000;
      invGroups[invSN].count++;
    }

    const numInversores = Object.keys(invGroups).length || 1;
    const potCAPerInv = (rec.potenciaAtivaKW ?? 0) / numInversores;

    for (const [invSN, g] of Object.entries(invGroups)) {
      sheetPorInv.addRow({
        timestamp: fullStr,
        data: dateStr,
        hora: timeStr,
        inversorSN: invSN,
        potCC: parseFloat(g.P.toFixed(2)),
        potCA: parseFloat(potCAPerInv.toFixed(2)),
        numStrings: g.count,
      });
      invLinesAdded++;
    }
  }
  console.log(`Aba por Inversor: ${invLinesAdded} linhas`);

  // Add alternating row colors to each sheet
  for (const sheet of [sheetConsolidado, sheetStrings, sheetPorInv]) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        });
      }
    });
  }

  // Save file to Downloads
  const outPath = path.join(os.homedir(), 'Downloads', 'Manga_Grande_01_Jan-Set2026_Telemetria.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`\n✅ Planilha salva em: ${outPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
