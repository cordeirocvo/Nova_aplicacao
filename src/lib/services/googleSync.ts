import axios from 'axios';
import { prisma } from '../prisma';
import { checkAndSendAlarm } from './whatsappService';

// Aba 'Instalação' padrão via Export CSV (gid=0)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1esS5CGW5uYLHOhLc_Bd1B_0A3_DIYsjcw8wSmy3dvyc/export?format=csv&gid=0';

export async function syncGoogleSheets() {
  try {
    const response = await axios.get(SHEET_URL);
    const csvData = response.data;
    
    // Parser universal para CSV com ou sem aspas de escape
    const rows: string[][] = [];
    const lines = csvData.split(/\r?\n/);
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const cols: string[] = [];
      let inQuotes = false;
      let currentCol = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i+1] === '"') {
          currentCol += '"';
          i++; // skip escaped quote
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(currentCol.trim());
          currentCol = '';
        } else {
          currentCol += char;
        }
      }
      cols.push(currentCol.trim());
      rows.push(cols);
    }

    // O CSV padrão exportado tem sempre um cabeçalho na linha 0
    const dataRows = rows.slice(1);
    
    // Função auxiliar de chunk para não explodir max_connections do banco
    const chunkArray = (arr: any[], size: number) => 
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );

    const chunkedRows = chunkArray(dataRows, 50);

    for (const chunk of chunkedRows) {
      await Promise.all(chunk.map(async (row) => {
        if (row.length < 2) return; // Skip empty rows

        const idInterno = row[0]; // Coluna 'x'
        const instalacao = row[1]; // Coluna 'Instalação - Pedro Cliente'
        
        if (!instalacao || instalacao === '#N/A' || idInterno === 'x ') return;

        const isManual = row[3] === 'TRUE';
        const sheetStatus = row[4] ? row[4].trim().toLowerCase() : '';
        const concluiuNaPlanilha = sheetStatus.includes('conclu');

        // Upsert into Local DB
        try {
          const updated = await prisma.planilhaInstalacao.upsert({
            where: { idInterno: idInterno },
            update: {
              instalacao: row[1],
              diaPrev: row[2],
              manualInstalacao: isManual,
              ...(concluiuNaPlanilha ? { status: 'Concluído' } : {}),
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
              manualInstalacao: isManual,
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
              status: concluiuNaPlanilha ? 'Concluído' : 'Pendente',
              dataSolicitacao: new Date(),
            },
          });

          await checkAndSendAlarm(updated.id);
        } catch (e) {
           console.error("Erro upsert planilha", e);
        }
      }));
    }

    return { success: true, count: dataRows.length };
  } catch (error) {
    console.error('Sync Error:', error);
    return { success: false, error: (error as Error).message };
  }
}
