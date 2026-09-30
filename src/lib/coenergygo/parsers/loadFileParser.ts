/**
 * CoenergyGO — Leitor e Parser de Memória de Massa e Arquivos de Medição
 * Cordeiro Energia
 * 
 * Processa arquivos de analisadores (Schneider, Kron, Carlo Gavazzi, CCK) e
 * memórias de massa de concessionárias (CEMIG, CPFL, Energisa) em formato CSV ou TXT.
 * Extrai a curva de carga horária média de 24 horas.
 */

import { TypicalHourlyPoint } from '../database/typicalLoadProfiles';

export interface ParsedLoadFileResult {
  fileName: string;
  totalRowsRead: number;
  validPointsCount: number;
  periodStart?: string;
  periodEnd?: string;
  maxRecordedDemandKW: number;
  averageDemandKW: number;
  hourlyCurve24h: TypicalHourlyPoint[];
}

/**
 * Faz o parsing de string CSV/TXT e calcula o perfil médio de 24 horas da edificação.
 */
export function parseLoadDataFile(fileContent: string, fileName: string = 'medicao.csv'): ParsedLoadFileResult {
  const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('Arquivo de medição vazio ou com linhas insuficientes.');
  }

  // Detectar delimitador (ponto-e-vírgula é comum no Brasil, vírgula no padrão internacional)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';

  // Identificar colunas prováveis de Data/Hora e de Potência Ativa (kW)
  const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());
  
  let timeColIndex = -1;
  let powerColIndex = -1;

  for (let i = 0; i < headers.length; i++) {
    const col = headers[i];
    // Preferência para coluna explícita de hora/tempo sobre apenas data
    if (col.includes('hora') || col.includes('hour') || col.includes('time') || col.includes('timestamp')) {
      timeColIndex = i;
    } else if (timeColIndex === -1 && (col.includes('data') || col.includes('date'))) {
      timeColIndex = i;
    }

    if (col.includes('demanda') || col.includes('kw') || col.includes('ativa') || col.includes('potencia') || col.includes('power')) {
      if (powerColIndex === -1 || col.includes('demanda_ativa') || col.includes('ativa')) {
        powerColIndex = i;
      }
    }
  }

  // Fallback caso não encontre por nome: coluna 0 = data/hora, coluna 1 ou 2 = potência
  if (timeColIndex === -1) timeColIndex = 0;
  if (powerColIndex === -1) powerColIndex = headers.length > 1 ? 1 : 0;

  // Acumuladores de 24 horas (hora -> soma de kW e contagem de medições)
  const hourlySums = new Array(24).fill(0);
  const hourlyCounts = new Array(24).fill(0);

  let maxKW = 0;
  let totalKW = 0;
  let validPoints = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map(cell => cell.trim());
    if (row.length <= Math.max(timeColIndex, powerColIndex)) continue;

    const timeRaw = row[timeColIndex];
    const powerRaw = row[powerColIndex];

    // Tratar número com vírgula decimal brasileira (ex: "45,8" -> 45.8)
    const cleanedPower = powerRaw.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const valKW = parseFloat(cleanedPower);

    if (isNaN(valKW) || valKW < 0) continue;

    // Extrair hora: primeiro busca formato HH:mm na coluna de tempo; se não houver, busca em qualquer coluna da linha
    let hour = -1;
    let timeMatch = timeRaw.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) {
      for (const cell of row) {
        const m = cell.match(/(\d{1,2}):(\d{2})/);
        if (m) {
          timeMatch = m;
          break;
        }
      }
    }

    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
    } else {
      const parsedDate = new Date(timeRaw);
      if (!isNaN(parsedDate.getTime())) {
        hour = parsedDate.getHours();
      }
    }

    if (hour >= 0 && hour < 24) {
      hourlySums[hour] += valKW;
      hourlyCounts[hour] += 1;
      totalKW += valKW;
      validPoints++;

      if (valKW > maxKW) {
        maxKW = valKW;
      }
    }
  }

  if (validPoints === 0) {
    throw new Error('Nenhum dado numérico de potência válido pôde ser extraído do arquivo.');
  }

  // Montar curva de 24 horas normalizada
  const hourlyCurve24h: TypicalHourlyPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const avgKW = hourlyCounts[h] > 0 ? hourlySums[h] / hourlyCounts[h] : (totalKW / validPoints);
    const roundedKW = Number(avgKW.toFixed(1));
    hourlyCurve24h.push({
      hour: h,
      hourLabel: `${String(h).padStart(2, '0')}:00`,
      baseLoadKW: roundedKW,
      solarGenerationKW: 0,
      netBuildingLoadKW: roundedKW
    });
  }

  return {
    fileName,
    totalRowsRead: lines.length - 1,
    validPointsCount: validPoints,
    maxRecordedDemandKW: Number(maxKW.toFixed(1)),
    averageDemandKW: Number((totalKW / validPoints).toFixed(1)),
    hourlyCurve24h
  };
}
