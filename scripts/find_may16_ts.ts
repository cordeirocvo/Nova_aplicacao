import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  const sheetStrings = wb.getWorksheet('Strings (CC por Inversor)');
  if (!sheetStrings) return;

  const timestamps = new Set<string>();
  const invSNs = new Set<string>();

  sheetStrings.eachRow((row, rNum) => {
    if (rNum === 1) return;
    const rawDate = String(row.getCell(1).value || '').trim();
    if (rawDate.startsWith('2026-05-16')) {
      timestamps.add(rawDate);
      invSNs.add(String(row.getCell(4).value || '').trim());
    }
  });

  console.log('Timestamps em 2026-05-16:', Array.from(timestamps).sort());
  console.log('Inversores em 2026-05-16:', Array.from(invSNs));
}

main().catch(console.error);
