import axios from 'axios';
import { prisma } from '../prisma';

// Aba 'Instalação' (gid=0)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1esS5CGW5uYLHOhLc_Bd1B_0A3_DIYsjcw8wSmy3dvyc/gviz/tq?tqx=out:csv&gid=0';

export async function syncGoogleSheets() {
  try {
    const response = await axios.get(SHEET_URL);
    const csvData = response.data;
    
    // Parse CSV more robustly (Standard Gviz CSV uses quotes and commas)
    const rows = csvData.split('\n').map((row: string) => {
      // Handles values like "Value","Another Value"
      const cleanedRow = row.trim();
      if (!cleanedRow) return [];
      
      // Split by "," (quote-comma-quote) then clean outer quotes
      return cleanedRow.split('","').map(cell => cell.replace(/^"|"$/g, ''));
    });

    // Validar se temos dados (Gviz retorna header na linha 0)
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      if (row.length < 2) continue; // Skip empty rows

      const idInterno = row[0]; // Coluna 'x'
      const instalacao = row[1]; // Coluna 'Instalação - Pedro Cliente'
      
      if (!instalacao || instalacao === '#N/A' || idInterno === 'x ') continue;

      // Upsert into Local DB
      await prisma.planilhaInstalacao.upsert({
        where: { idInterno: idInterno },
        update: {
          instalacao: row[1],
          diaPrev: row[2],
          manualInstalacao: row[3] === 'TRUE',
          obsInstalacao: row[5],
          vencimentoParecer: row[6],
          vencimentoContrato: row[7],
          automaticoPrevInstala: row[8],
          dataVenda: row[9],
          statusProtocolo: row[10],
          statusCompra: row[11],
          inversor: row[12],
          numMod: row[13],
          modulo: row[14],
          cidadeSheet: row[15],
          bairro: row[16],
          rua: row[17],
          numRua: row[18],
          telhado: row[19],
          telefoneSheet: row[20],
          vendedorSheet: row[21],
        },
        create: {
          idInterno: idInterno,
          instalacao: row[1],
          diaPrev: row[2],
          manualInstalacao: row[3] === 'TRUE',
          obsInstalacao: row[5],
          vencimentoParecer: row[6],
          vencimentoContrato: row[7],
          automaticoPrevInstala: row[8],
          dataVenda: row[9],
          statusProtocolo: row[10],
          statusCompra: row[11],
          inversor: row[12],
          numMod: row[13],
          modulo: row[14],
          cidadeSheet: row[15],
          bairro: row[16],
          rua: row[17],
          numRua: row[18],
          telhado: row[19],
          telefoneSheet: row[20],
          vendedorSheet: row[21],
          // Default values for additional fields
          status: 'Pendente',
          dataSolicitacao: new Date(),
        },
      });
    }

    return { success: true, count: dataRows.length };
  } catch (error) {
    console.error('Sync Error:', error);
    return { success: false, error: (error as Error).message };
  }
}
