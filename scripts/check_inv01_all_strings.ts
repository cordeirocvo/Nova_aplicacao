import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  const sheetStrings = wb.getWorksheet('Strings (CC por Inversor)');
  if (!sheetStrings) return;

  const invSN = 'ES2380071220'; // Inversor 01
  const targetTime = '2026-05-16 12:00'; // ou próximo do meio-dia

  const stringsAtTime: Record<string, { V: number; I: number }> = {};

  sheetStrings.eachRow((row, rNum) => {
    if (rNum === 1) return;
    const rawDate = String(row.getCell(1).value || '').trim();
    const sn = String(row.getCell(4).value || '').trim();
    const str = String(row.getCell(5).value || '').trim();

    if (sn === invSN && rawDate.startsWith('2026-05-16 11:3')) {
      const v = parseFloat(String(row.getCell(6).value || '0')) || 0;
      const i = parseFloat(String(row.getCell(7).value || '0')) || 0;
      stringsAtTime[str] = { V: v, I: i };
    }
  });

  console.log('Strings do Inversor 01 em 2026-05-16 ~11:30 BRT:');
  for (let s = 1; s <= 24; s++) {
    const key = `S${s}`;
    const val = stringsAtTime[key];
    if (val) {
      console.log(`  ${key}: V = ${val.V.toFixed(1)} V | I = ${val.I.toFixed(2)} A | P = ${(val.V * val.I / 1000).toFixed(2)} kW`);
    } else {
      console.log(`  ${key}: não presente`);
    }
  }
}

main().catch(console.error);
