import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  const sheetStrings = wb.getWorksheet('Strings (CC por Inversor)');
  if (!sheetStrings) return;

  const invSN = 'ES2380071220'; // Inversor 01
  const targetString = 'S14';

  const samplesByDate: Record<string, any[]> = {};

  sheetStrings.eachRow((row, rNum) => {
    if (rNum === 1) return;
    const rawDate = row.getCell(1).value;
    const tsStr = String(rawDate instanceof Date ? rawDate.toISOString() : rawDate || '').trim();
    const sn = String(row.getCell(4).value || '').trim();
    const str = String(row.getCell(5).value || '').trim();

    if (sn === invSN && str === targetString) {
      const date = tsStr.substring(0, 10);
      const v = parseFloat(String(row.getCell(6).value || '0')) || 0;
      const i = parseFloat(String(row.getCell(7).value || '0')) || 0;

      if (!samplesByDate[date]) samplesByDate[date] = [];
      if (samplesByDate[date].length < 5) {
        samplesByDate[date].push({ tsStr, v, i });
      }
    }
  });

  console.log('Resultados para INV01 (ES2380071220) - String 14 na planilha:');
  for (const [date, list] of Object.entries(samplesByDate)) {
    console.log(`\nData ${date}:`);
    list.forEach((s) => console.log(`  ${s.tsStr}: V = ${s.v} V, I = ${s.i} A`));
  }
}

main().catch(console.error);
