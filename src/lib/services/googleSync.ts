import axios from 'axios';
import { prisma } from '../prisma';
import { checkAndSendAlarm } from './whatsappService';
import { appendHistory } from '../historyUtils';

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
    
    // Busca todas as atividades com idInterno do banco em uma chamada única
    const existingList = await prisma.planilhaInstalacao.findMany({
      where: { idInterno: { not: null } },
      select: {
        id: true,
        idInterno: true,
        instalacao: true,
        diaPrev: true,
        manualInstalacao: true,
        status: true,
        obsInstalacao: true,
        vencimentoParecer: true,
        vencimentoContrato: true,
        automaticoPrevInstala: true,
        dataPrevista: true,
        dataVenda: true,
        statusProtocolo: true,
        statusCompra: true,
        inversor: true,
        numMod: true,
        modulo: true,
        cidadeSheet: true,
        bairro: true,
        rua: true,
        numRua: true,
        telhado: true,
        telefoneSheet: true,
        vendedorSheet: true,
      }
    });

    const existingMap = new Map<string, typeof existingList[number]>();
    for (const item of existingList) {
      if (item.idInterno) {
        existingMap.set(item.idInterno, item);
      }
    }

    const hasChanged = (val1: any, val2: any) => {
      const str1 = (val1 === null || val1 === undefined) ? "" : String(val1).trim();
      const str2 = (val2 === null || val2 === undefined) ? "" : String(val2).trim();
      return str1 !== str2;
    };

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

        try {
          const existing = existingMap.get(idInterno);
          let updated = null;
          const targetStatus = concluiuNaPlanilha ? 'Concluído' : undefined;

          if (existing) {
            // Se o usuário alterou a data manualmente no app (dataPrevista preenchida),
            // a data manual tem prioridade total e não é revertida pela planilha.
            const finalPrevInstala = existing.dataPrevista || row[8] || null;

            const updateData: any = {};
            if (hasChanged(existing.instalacao, row[1])) updateData.instalacao = row[1];
            if (hasChanged(existing.diaPrev, row[2])) updateData.diaPrev = row[2];
            if (existing.manualInstalacao !== isManual) updateData.manualInstalacao = isManual;
            if (targetStatus && existing.status !== targetStatus) updateData.status = targetStatus;
            if (hasChanged(existing.obsInstalacao, row[5])) updateData.obsInstalacao = row[5];
            if (hasChanged(existing.vencimentoParecer, row[6])) updateData.vencimentoParecer = row[6];
            if (hasChanged(existing.vencimentoContrato, row[7])) updateData.vencimentoContrato = row[7];
            if (hasChanged(existing.automaticoPrevInstala, finalPrevInstala)) {
              updateData.automaticoPrevInstala = finalPrevInstala;
            }
            if (hasChanged(existing.dataVenda, row[9])) updateData.dataVenda = row[9];
            if (hasChanged(existing.statusProtocolo, row[10])) updateData.statusProtocolo = row[10];
            if (hasChanged(existing.statusCompra, row[11])) updateData.statusCompra = row[11];
            if (hasChanged(existing.inversor, row[12])) updateData.inversor = row[12];
            if (hasChanged(existing.numMod, row[13])) updateData.numMod = row[13];
            if (hasChanged(existing.modulo, row[14])) updateData.modulo = row[14];
            if (hasChanged(existing.cidadeSheet, row[15])) updateData.cidadeSheet = row[15];
            if (hasChanged(existing.bairro, row[16])) updateData.bairro = row[16];
            if (hasChanged(existing.rua, row[17])) updateData.rua = row[17];
            if (hasChanged(existing.numRua, row[18])) updateData.numRua = row[18];
            if (hasChanged(existing.telhado, row[19])) updateData.telhado = row[19];
            if (hasChanged(existing.telefoneSheet, row[20])) updateData.telefoneSheet = row[20];
            if (hasChanged(existing.vendedorSheet, row[21])) updateData.vendedorSheet = row[21];

            // Só executa o update se algum campo realmente mudou
            if (Object.keys(updateData).length > 0) {
              updated = await prisma.planilhaInstalacao.update({
                where: { idInterno: idInterno },
                data: updateData
              });
            }
          } else {
            updated = await prisma.planilhaInstalacao.create({
              data: {
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
                historico: appendHistory([], "Criado via Sincronização Sheets")
              }
            });
          }

          if (updated) {
            await checkAndSendAlarm(updated.id);
          }
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
