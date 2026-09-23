import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Plant Report_USINA MANGA GRANDE UFV 1 1852_11-09-2026.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  console.log('Worksheets in Plant Report:');
  wb.worksheets.forEach((ws) => console.log(`- ${ws.name} (${ws.rowCount} rows)`));

  const ws = wb.worksheets[0];
  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    console.log(`Row ${r}:`, ws.getRow(r).values);
  }
}

main().catch(console.error);
