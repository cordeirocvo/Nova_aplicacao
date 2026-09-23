import * as ExcelJS from 'exceljs';

const file1 = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

function to5m(tsStr: string): string {
  const [datePart, timePart] = tsStr.split(' ');
  if (!datePart || !timePart) return tsStr;
  const [h, m] = timePart.split(':').map(Number);
  const roundedM = Math.round(m / 5) * 5;
  const finalH = roundedM === 60 ? h + 1 : h;
  const finalM = roundedM === 60 ? 0 : roundedM;
  return `${datePart} ${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file1);

  const sheetStrings = wb.getWorksheet('Strings (CC por Inversor)');
  const sheetConsolidado = wb.getWorksheet('Consolidado (Usina)');

  if (!sheetStrings || !sheetConsolidado) return;

  const stringTimes = new Set<string>();
  sheetStrings.eachRow((r, i) => {
    if (i === 1) return;
    const s = String(r.getCell(1).value || '').trim();
    if (s) stringTimes.add(to5m(s));
  });

  console.log(`Tempos 5m na aba Strings: ${stringTimes.size}`);

  let matches = 0;
  let totalConsol = 0;
  sheetConsolidado.eachRow((r, i) => {
    if (i === 1) return;
    totalConsol++;
    const s = String(r.getCell(1).value || '').trim();
    if (stringTimes.has(to5m(s))) {
      matches++;
    }
  });

  console.log(`Total em Consolidado: ${totalConsol} | Matches com arredondamento 5m: ${matches} (${((matches / totalConsol) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
