import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  const sheetStrings = wb.getWorksheet('Strings (CC por Inversor)');
  if (!sheetStrings) return;

  const targetTS = '2026-05-16 10:34';

  const rows: any[] = [];
  sheetStrings.eachRow((row, rNum) => {
    if (rNum === 1) return;
    const rawDate = String(row.getCell(1).value || '').trim();
    if (rawDate === targetTS) {
      const inv = String(row.getCell(4).value || '').trim();
      const str = String(row.getCell(5).value || '').trim();
      const v = parseFloat(String(row.getCell(6).value || '0')) || 0;
      const i = parseFloat(String(row.getCell(7).value || '0')) || 0;
      rows.push({ inv, str, v, i });
    }
  });

  console.log(`Linhas em ${targetTS}: ${rows.length}`);
  // Agrupar por inversor
  const byInv: Record<string, any[]> = {};
  rows.forEach((r) => {
    if (!byInv[r.inv]) byInv[r.inv] = [];
    byInv[r.inv].push(r);
  });

  for (const [inv, list] of Object.entries(byInv)) {
    console.log(`\nInversor ${inv} (${list.length} strings):`);
    list.sort((a, b) => parseInt(a.str.replace(/\D/g, '') || '0') - parseInt(b.str.replace(/\D/g, '') || '0'));
    list.forEach((s) => {
      console.log(`  ${s.str}: V = ${s.v.toFixed(1)} V | I = ${s.i.toFixed(2)} A`);
    });
  }
}

main().catch(console.error);
