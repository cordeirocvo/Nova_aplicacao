import 'dotenv/config';
import * as XLSX from 'xlsx';

const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\STRINGS LIGADAS.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('ALL Sheet Names:', workbook.SheetNames);

for (const name of workbook.SheetNames) {
  const sheet = workbook.Sheets[name];
  const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n======================================================`);
  console.log(`SHEET: "${name}" (${json.length} rows)`);
  // Print row 1, 2, 3, 4 (headers and inverters)
  for (let r = 0; r < Math.min(6, json.length); r++) {
    if (json[r]) {
      console.log(`  Row ${r + 1}:`, json[r].filter((c: any) => c !== null && c !== undefined && c !== ''));
    }
  }
}
