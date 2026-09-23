import 'dotenv/config';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma';

const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\STRINGS LIGADAS.xlsx';
const workbook = XLSX.readFile(filePath);

interface StringConfig {
  usinaSheet: string;
  inversorNum: number;
  inversorSN: string;
  stringNum: number;
  status: 'LIGADA' | 'VAZIA';
}

const allConfigs: StringConfig[] = [];

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find inverter header row
  let invRowIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('inversor'))) {
      invRowIdx = r;
      break;
    }
  }

  if (invRowIdx === -1) {
    console.warn(`Could not find Inversor header in ${sheetName}`);
    continue;
  }

  const invRow = rows[invRowIdx];
  // Detect columns for each inverter
  // Typically: Col 1 = Str label, Col 2 = Status (Inv 1); Col 4 = Str label, Col 5 = Status (Inv 2)...
  interface InvColMap {
    invNum: number;
    invSN: string;
    strCol: number;
    statusCol: number;
  }
  const invCols: InvColMap[] = [];

  for (let c = 0; c < invRow.length; c++) {
    const cell = invRow[c];
    if (typeof cell === 'string' && cell.toLowerCase().includes('inversor')) {
      const matchNum = cell.match(/inversor\s*(\d+)/i);
      const matchSN = cell.match(/sn\s*:\s*([^\s,]+)/i);
      const invNum = matchNum ? parseInt(matchNum[1], 10) : invCols.length + 1;
      const invSN = matchSN ? matchSN[1].trim() : cell.trim();
      
      // Look at the next few rows to see where the string number and status (LIGADA/VAZIA) are
      let strCol = c;
      let statusCol = c + 1;
      // If cell itself is at c, check row below
      const nextRow = rows[invRowIdx + 1];
      if (nextRow) {
        if (typeof nextRow[c] === 'string' && nextRow[c].toLowerCase().includes('string')) {
          strCol = c;
          statusCol = c + 1;
        } else if (typeof nextRow[c + 1] === 'string' && nextRow[c + 1].toLowerCase().includes('string')) {
          strCol = c + 1;
          statusCol = c + 2;
        }
      }
      invCols.push({ invNum, invSN, strCol, statusCol });
    }
  }

  console.log(`\nSheet: ${sheetName} -> Found ${invCols.length} inverters:`, invCols.map(i => `Inv ${i.invNum} (${i.invSN}) cols: [${i.strCol}, ${i.statusCol}]`));

  // Now scan string rows
  for (let r = invRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    for (const inv of invCols) {
      const strCell = row[inv.strCol];
      const statusCell = row[inv.statusCol];
      if (typeof strCell === 'string' && strCell.toLowerCase().includes('string')) {
        const strNumMatch = strCell.match(/string\s*(\d+)/i);
        if (strNumMatch) {
          const strNum = parseInt(strNumMatch[1], 10);
          const statusText = typeof statusCell === 'string' ? statusCell.trim().toUpperCase() : 'DESCONHECIDO';
          const status: 'LIGADA' | 'VAZIA' = statusText.includes('VAZIA') ? 'VAZIA' : 'LIGADA';
          allConfigs.push({
            usinaSheet: sheetName,
            inversorNum: inv.invNum,
            inversorSN: inv.invSN,
            stringNum: strNum,
            status,
          });
        }
      }
    }
  }
}

console.log(`\nTotal String Configs Extracted: ${allConfigs.length}`);
const ligadas = allConfigs.filter(c => c.status === 'LIGADA');
const vazias = allConfigs.filter(c => c.status === 'VAZIA');
console.log(`LIGADAS: ${ligadas.length}, VAZIAS: ${vazias.length}`);

// Group by Sheet and Inverter
const summary: Record<string, Record<number, { ligadas: number[]; vazias: number[]; sn: string }>> = {};
for (const c of allConfigs) {
  if (!summary[c.usinaSheet]) summary[c.usinaSheet] = {};
  if (!summary[c.usinaSheet][c.inversorNum]) {
    summary[c.usinaSheet][c.inversorNum] = { ligadas: [], vazias: [], sn: c.inversorSN };
  }
  if (c.status === 'LIGADA') {
    summary[c.usinaSheet][c.inversorNum].ligadas.push(c.stringNum);
  } else {
    summary[c.usinaSheet][c.inversorNum].vazias.push(c.stringNum);
  }
}

for (const [sheet, invs] of Object.entries(summary)) {
  console.log(`\n=== ${sheet} ===`);
  for (const [invNum, data] of Object.entries(invs)) {
    console.log(`  Inversor ${invNum} (SN: ${data.sn}):`);
    console.log(`    Ligadas (${data.ligadas.length}): ${data.ligadas.join(', ')}`);
    console.log(`    Vazias  (${data.vazias.length}): ${data.vazias.join(', ')}`);
  }
}
