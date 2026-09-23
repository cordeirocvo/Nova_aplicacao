import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Telemetria_Solar_2026-09-08_HUAWEI.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  console.log('Worksheets:');
  for (const ws of wb.worksheets) {
    console.log(`- ${ws.name} (${ws.rowCount} rows)`);
  }

  const ws = wb.worksheets[0];
  console.log('Row 1:', ws.getRow(1).values);
  console.log('Row 2:', ws.getRow(2).values);
  console.log('Row 3:', ws.getRow(3).values);
}

main().catch(console.error);
