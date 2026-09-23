import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Relatório da instalação_USINA MANGA GRANDE UFV 1 1852_2026 huawei.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  for (const sheetName of ['Sheet2', 'Sheet3']) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;
    console.log(`\n=== ${sheetName} (${ws.rowCount} rows) ===`);
    console.log('Row 1:', ws.getRow(1).values);
    console.log('Row 2:', ws.getRow(2).values);
    console.log('Row 3:', ws.getRow(3).values);
    console.log('Row 4:', ws.getRow(4).values);
  }
}

main().catch(console.error);
