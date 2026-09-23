import * as ExcelJS from 'exceljs';

const EXCEL_PATH = String.raw`C:\Users\BRUNO CORDEIRO\Downloads\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx`;

async function main() {
  console.log('Lendo planilha:', EXCEL_PATH);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  console.log('Worksheets encontradas:');
  workbook.worksheets.forEach((ws) => {
    console.log(`- ${ws.name} (${ws.rowCount} linhas, ${ws.columnCount} colunas)`);
  });

  const sheetStrings = workbook.getWorksheet('Strings (CC por Inversor)');
  if (sheetStrings) {
    console.log('\n--- Amostra de Strings (CC por Inversor) ---');
    const headerRow = sheetStrings.getRow(1).values;
    console.log('Header:', headerRow);

    const dates = new Set<string>();
    let countBlownCandidates = 0;
    const blownExamples: any[] = [];

    sheetStrings.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rawDate = row.getCell(1).value;
      const tsStr = String(rawDate instanceof Date ? rawDate.toISOString() : rawDate || '').trim();
      if (tsStr) {
        dates.add(tsStr.substring(0, 10));
      }

      // V e I
      const vVal = parseFloat(String(row.getCell(6).value || '0')) || 0;
      const iVal = parseFloat(String(row.getCell(7).value || '0')) || 0;
      const invSN = String(row.getCell(4).value || '').trim();
      const strName = String(row.getCell(5).value || '').trim();

      // Fusível queimado: V >= 350V e I == 0 durante horas de sol
      if (vVal >= 350 && iVal === 0) {
        countBlownCandidates++;
        if (blownExamples.length < 15) {
          blownExamples.push({ tsStr, invSN, strName, vVal, iVal });
        }
      }
    });

    const sortedDates = Array.from(dates).sort();
    console.log(`Datas encontradas (${sortedDates.length}): primeira = ${sortedDates[0]}, última = ${sortedDates[sortedDates.length - 1]}`);
    console.log(`Candidatos a fusível queimado (V>=350 e I=0): ${countBlownCandidates}`);
    console.log('Exemplos de fusível queimado:', blownExamples);
  }

  const sheetConsolidado = workbook.getWorksheet('Consolidado (Usina)');
  if (sheetConsolidado) {
    console.log('\n--- Amostra de Consolidado (Usina) ---');
    console.log('Header:', sheetConsolidado.getRow(1).values);
    const row2 = sheetConsolidado.getRow(2).values;
    console.log('Linha 2:', row2);
  }
}

main().catch(console.error);
