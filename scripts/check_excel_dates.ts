import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  for (const ws of wb.worksheets) {
    const dates = new Set<string>();
    ws.eachRow((row, rNum) => {
      if (rNum === 1) return;
      const v = row.getCell(1).value;
      const s = String(v instanceof Date ? v.toISOString() : v || '').trim();
      if (s) {
        dates.add(s.substring(0, 10));
      }
    });
    const sorted = Array.from(dates).sort();
    console.log(`\nSheet: ${ws.name} (${ws.rowCount} rows)`);
    console.log(`  Datas (${sorted.length}): de ${sorted[0]} até ${sorted[sorted.length - 1]}`);
    console.log(`  Lista de datas:`, sorted);
  }
}

main().catch(console.error);
