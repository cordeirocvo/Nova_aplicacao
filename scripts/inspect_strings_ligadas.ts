import 'dotenv/config';
import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\STRINGS LIGADAS.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheet names:', workbook.SheetNames);

for (const name of workbook.SheetNames) {
  const sheet = workbook.Sheets[name];
  const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n======================================================`);
  console.log(`SHEET: ${name} (Total rows: ${json.length})`);
  console.log(`======================================================`);
  
  // Show non-empty rows up to 40
  const sample = json.slice(0, 35);
  sample.forEach((row, i) => {
    if (row && row.some(cell => cell !== undefined && cell !== '')) {
      console.log(`Row ${i + 1}:`, JSON.stringify(row));
    }
  });
}
