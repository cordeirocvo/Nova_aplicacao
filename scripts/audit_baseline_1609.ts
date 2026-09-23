import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as XLSX from 'xlsx';

const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\STRINGS LIGADAS.xlsx';
const workbook = XLSX.readFile(filePath);

const sheetToPlantKeywords: Record<string, string> = {
  'Manga Grande UFV1': 'UFV 1',
  'Manga Grande UFV2': 'UFV 2',
  'Manga Grande UFV3': 'MANGA GRANDE 3',
};

const stringStatusMap = new Map<string, 'LIGADA' | 'VAZIA'>();

for (const sheetName of Object.keys(sheetToPlantKeywords)) {
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
  const invCols: { invSN: string; strCol: number; statusCol: number }[] = [];

  for (let c = 0; c < invRow.length; c++) {
    const cell = invRow[c];
    if (typeof cell === 'string' && cell.toLowerCase().includes('inversor')) {
      // Extract alphanumeric string after SN: or matching ES/GR
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
      invCols.push({ invSN, strCol, statusCol });
    }
  }

  for (let r = invRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    for (const inv of invCols) {
      if (!inv.invSN) continue;
      const strCell = row[inv.strCol];
      const statusCell = row[inv.statusCol];
      if (typeof strCell === 'string' && strCell.toLowerCase().includes('string')) {
        const match = strCell.match(/string\s*(\d+)/i);
        if (match) {
          const strNum = parseInt(match[1], 10);
          const statusText = typeof statusCell === 'string' ? statusCell.trim().toUpperCase() : 'DESCONHECIDO';
          const status = statusText.includes('VAZIA') ? 'VAZIA' : 'LIGADA';
          stringStatusMap.set(`${inv.invSN}_S${strNum}`, status);
        }
      }
    }
  }
}

console.log(`Loaded ${stringStatusMap.size} cleaned string configurations.`);

async function auditBaseline() {
  const dateStr = '2026-09-16';
  const usinas = await prisma.usina.findMany({
    where: { nome: { contains: 'Manga', mode: 'insensitive' } }
  });

  for (const u of usinas) {
    console.log(`\n======================================================`);
    console.log(`AUDITING BASELINE: ${u.nome} (Date: ${dateStr})`);
    
    const peakRecord = await prisma.telemetria.findFirst({
      where: {
        usinaId: u.id,
        timestamp: {
          gte: new Date(`${dateStr}T11:30:00-03:00`),
          lte: new Date(`${dateStr}T13:00:00-03:00`),
        }
      },
      orderBy: { potenciaAtivaKW: 'desc' }
    });

    if (!peakRecord) continue;
    console.log(`Peak: ${peakRecord.potenciaAtivaKW} kW at ${peakRecord.timestamp.toISOString()}`);
    const stringsData = (peakRecord.dadosStrings || {}) as Record<string, { I?: number; V?: number }>;

    let countLigadasOk = 0;
    let countLigadasZero = 0;
    let countVaziasZero = 0;
    let countVaziasGerando = 0;

    const zeroLigadasList: string[] = [];
    const gerandoVaziasList: string[] = [];

    for (const [key, val] of Object.entries(stringsData)) {
      const current = typeof val === 'number' ? val : (val?.I ?? 0);
      const expectedStatus = stringStatusMap.get(key) || 'LIGADA';

      if (expectedStatus === 'LIGADA') {
        if (current > 0.5) {
          countLigadasOk++;
        } else {
          countLigadasZero++;
          zeroLigadasList.push(`${key} (I=${current}A)`);
        }
      } else {
        if (current <= 0.5) {
          countVaziasZero++;
        } else {
          countVaziasGerando++;
          gerandoVaziasList.push(`${key} (I=${current}A)`);
        }
      }
    }

    console.log(`  ✓ LIGADAS Gerando (>0.5A): ${countLigadasOk}`);
    console.log(`  ⚠ LIGADAS Zeradas (I<=0.5A): ${countLigadasZero} ${zeroLigadasList.length > 0 ? '-> ' + zeroLigadasList.join(', ') : ''}`);
    console.log(`  ✓ VAZIAS Corretamente Zeradas: ${countVaziasZero}`);
    console.log(`  ⚠ VAZIAS com Corrente (>0.5A): ${countVaziasGerando} ${gerandoVaziasList.length > 0 ? '-> ' + gerandoVaziasList.join(', ') : ''}`);
  }
}

auditBaseline().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
