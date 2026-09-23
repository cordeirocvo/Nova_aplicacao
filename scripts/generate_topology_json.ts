import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\STRINGS LIGADAS.xlsx';
const workbook = XLSX.readFile(filePath);

const sheetToPlantKey: Record<string, string> = {
  'Manga Grande UFV1': 'MANGA_GRANDE_1',
  'Manga Grande UFV2': 'MANGA_GRANDE_2',
  'Manga Grande UFV3': 'MANGA_GRANDE_3',
  'Manga Grande UFV5': 'MANGA_GRANDE_5',
};

const topology: Record<string, {
  plantKey: string;
  sheetName: string;
  inversores: Array<{
    invNum: number;
    invSN: string;
    strings: Record<number, 'LIGADA' | 'VAZIA'>;
  }>;
}> = {};

for (const [sheetName, plantKey] of Object.entries(sheetToPlantKey)) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) continue;
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let invRowIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    if (rows[r] && rows[r].some(c => typeof c === 'string' && c.toLowerCase().includes('inversor'))) {
      invRowIdx = r;
      break;
    }
  }
  if (invRowIdx === -1) continue;

  const invRow = rows[invRowIdx];
  const invCols: { invNum: number; invSN: string; strCol: number; statusCol: number }[] = [];

  for (let c = 0; c < invRow.length; c++) {
    const cell = invRow[c];
    if (typeof cell === 'string' && cell.toLowerCase().includes('inversor')) {
      const matchNum = cell.match(/inversor\s*(\d+)/i);
      const invNum = matchNum ? parseInt(matchNum[1], 10) : invCols.length + 1;
      const cleanCell = cell.replace(/\s+/g, '');
      const matchSN = cleanCell.match(/SN:?([A-Z0-9]+)/i);
      let invSN = matchSN ? matchSN[1] : '';
      if (invSN.includes('ES23900025524')) invSN = 'ES2390025524'; // typo in excel

      let strCol = c;
      let statusCol = c + 1;
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

  const invertersData: typeof topology[string]['inversores'] = [];
  for (const inv of invCols) {
    const strings: Record<number, 'LIGADA' | 'VAZIA'> = {};
    for (let r = invRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const strCell = row[inv.strCol];
      const statusCell = row[inv.statusCol];
      if (typeof strCell === 'string' && strCell.toLowerCase().includes('string')) {
        const match = strCell.match(/string\s*(\d+)/i);
        if (match) {
          const strNum = parseInt(match[1], 10);
          const statusText = typeof statusCell === 'string' ? statusCell.trim().toUpperCase() : 'DESCONHECIDO';
          const status = statusText.includes('VAZIA') ? 'VAZIA' : 'LIGADA';
          strings[strNum] = status;
        }
      }
    }
    invertersData.push({
      invNum: inv.invNum,
      invSN: inv.invSN,
      strings
    });
  }

  topology[plantKey] = {
    plantKey,
    sheetName,
    inversores: invertersData
  };
}

console.log('Topology extraction successful. Plants:', Object.keys(topology));
console.log(JSON.stringify(topology, null, 2));
