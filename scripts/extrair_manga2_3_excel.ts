import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as os from 'os';

interface UsinaConfig {
  id: string;
  nome: string;
  nomeArquivo: string;
}

const USINAS: UsinaConfig[] = [
  {
    id: 'cmp8qki8u00050wv5m092pu9g',
    nome: 'USINA MANGA GRANDE UFV 2 2243',
    nomeArquivo: 'Manga_Grande_02_Jan-Set2026_Telemetria',
  },
  {
    id: 'cmtur27em00nel4v55jwzfpah',
    nome: 'USINA MANGA GRANDE 3 2565',
    nomeArquivo: 'Manga_Grande_03_Jan-Set2026_Telemetria',
  },
];

async function extrairUsina(usina: UsinaConfig) {
  console.log(`\n=== Extraindo: ${usina.nome} ===`);

  const records = await prisma.telemetria.findMany({
    where: {
      usinaId: usina.id,
      timestamp: {
        gte: new Date('2026-01-01T00:00:00Z'),
        lte: new Date('2026-09-15T23:59:59Z'),
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  console.log(`  Registros carregados: ${records.length}`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cordeiro Energia';
  workbook.created = new Date();
  workbook.modified = new Date();

  // --- Aba 1: Consolidado ---
  const sheetCons = workbook.addWorksheet('Consolidado (Usina)');
  sheetCons.columns = [
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

  const hdr1 = sheetCons.getRow(1);
  hdr1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdr1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  hdr1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hdr1.height = 36;

  for (const rec of records) {
    const local = new Date(rec.timestamp.getTime() - 3 * 3600 * 1000);
    const dateStr = local.toISOString().substring(0, 10);
    const timeStr = local.toISOString().substring(11, 16);

    sheetCons.addRow({
      timestamp: `${dateStr} ${timeStr}`,
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
  }
  console.log(`  Aba Consolidado: ${records.length} linhas`);

  // --- Aba 2: Strings CC por Inversor ---
  const sheetStr = workbook.addWorksheet('Strings (CC por Inversor)');
  sheetStr.columns = [
    { header: 'Data/Hora (BRT)', key: 'timestamp', width: 22 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Inversor SN', key: 'inversorSN', width: 24 },
    { header: 'String', key: 'string', width: 14 },
    { header: 'Tensão CC (V)', key: 'tensaoCC', width: 15 },
    { header: 'Corrente CC (A)', key: 'correnteCC', width: 16 },
    { header: 'Potência CC (kW)', key: 'potenciaCC', width: 17 },
  ];

  const hdr2 = sheetStr.getRow(1);
  hdr2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdr2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  hdr2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hdr2.height = 36;

  let strLines = 0;
  for (const rec of records) {
    const strings = (rec.dadosStrings as Record<string, { V: number; I: number }>) || {};
    if (Object.keys(strings).length === 0) continue;

    const local = new Date(rec.timestamp.getTime() - 3 * 3600 * 1000);
    const dateStr = local.toISOString().substring(0, 10);
    const timeStr = local.toISOString().substring(11, 16);

    for (const [key, val] of Object.entries(strings)) {
      const parts = key.split('_');
      const invSN = parts[0] || 'INV';
      const strName = parts.slice(1).join('_') || key;
      const V = val.V ?? 0;
      const I = val.I ?? 0;

      sheetStr.addRow({
        timestamp: `${dateStr} ${timeStr}`,
        data: dateStr,
        hora: timeStr,
        inversorSN: invSN,
        string: strName,
        tensaoCC: V,
        correnteCC: I,
        potenciaCC: parseFloat(((V * I) / 1000).toFixed(3)),
      });
      strLines++;
    }
  }
  console.log(`  Aba Strings: ${strLines} linhas`);

  // --- Aba 3: Potência CC por Inversor ---
  const sheetInv = workbook.addWorksheet('Pot. CC por Inversor');
  sheetInv.columns = [
    { header: 'Data/Hora (BRT)', key: 'timestamp', width: 22 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Inversor SN', key: 'inversorSN', width: 24 },
    { header: 'Pot. CC Total Inv (kW)', key: 'potCC', width: 22 },
    { header: 'Pot. CA Inv (kW)', key: 'potCA', width: 18 },
    { header: 'Num Strings', key: 'numStrings', width: 12 },
  ];

  const hdr3 = sheetInv.getRow(1);
  hdr3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdr3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF78350F' } };
  hdr3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hdr3.height = 36;

  let invLines = 0;
  for (const rec of records) {
    const strings = (rec.dadosStrings as Record<string, { V: number; I: number }>) || {};
    if (Object.keys(strings).length === 0) continue;

    const local = new Date(rec.timestamp.getTime() - 3 * 3600 * 1000);
    const dateStr = local.toISOString().substring(0, 10);
    const timeStr = local.toISOString().substring(11, 16);

    const invGroups: Record<string, { P: number; count: number }> = {};
    for (const [key, val] of Object.entries(strings)) {
      const invSN = key.split('_')[0];
      if (!invGroups[invSN]) invGroups[invSN] = { P: 0, count: 0 };
      invGroups[invSN].P += ((val.V ?? 0) * (val.I ?? 0)) / 1000;
      invGroups[invSN].count++;
    }

    const numInv = Object.keys(invGroups).length || 1;
    const potCAPerInv = (rec.potenciaAtivaKW ?? 0) / numInv;

    for (const [invSN, g] of Object.entries(invGroups)) {
      sheetInv.addRow({
        timestamp: `${dateStr} ${timeStr}`,
        data: dateStr,
        hora: timeStr,
        inversorSN: invSN,
        potCC: parseFloat(g.P.toFixed(2)),
        potCA: parseFloat(potCAPerInv.toFixed(2)),
        numStrings: g.count,
      });
      invLines++;
    }
  }
  console.log(`  Aba Pot. CC por Inversor: ${invLines} linhas`);

  // Alternating row colors
  for (const sheet of [sheetCons, sheetStr, sheetInv]) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        });
      }
    });
  }

  const outPath = path.join(os.homedir(), 'Downloads', `${usina.nomeArquivo}.xlsx`);
  await workbook.xlsx.writeFile(outPath);
  console.log(`  ✅ Salvo em: ${outPath}`);
}

async function main() {
  for (const usina of USINAS) {
    await extrairUsina(usina);
  }
  console.log('\n✅ Todas as planilhas geradas!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
