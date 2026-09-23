import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Relatório da instalação_USINA MANGA GRANDE UFV 1 1852_2026 huawei.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  console.log('Worksheets:');
  wb.worksheets.forEach((ws) => console.log(ws.name));

  const ws = wb.worksheets[0];
  for (let r = 1; r <= Math.min(25, ws.rowCount); r++) {
    console.log(`Row ${r}:`, ws.getRow(r).values);
  }
}

main().catch(console.error);
