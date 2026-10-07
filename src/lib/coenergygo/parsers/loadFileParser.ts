/**
 * CoenergyGO — Leitor e Parser Universal de Memória de Massa e Planilhas Excel
 * Cordeiro Energia
 * 
 * Processa:
 * 1. Arquivos Excel (.xlsx, .xls) de Smart Meters e analisadores (ex: SmartMeter.xlsx).
 * 2. Memórias de massa de concessionárias (CEMIG, CPFL, Energisa) em formato CSV ou TXT.
 * 3. Analisadores de grandezas elétricas (Schneider, Kron, Carlo Gavazzi, CCK).
 * 
 * Fornece:
 * - Resumo analítico do período medido (demanda de pico, média, energia acumulada, intervalo).
 * - Pontos em alta resolução (ex: 5 em 5 minutos) para exibição e acompanhamento gráfico.
 * - Curva agregada de 24 horas normalizada para os motores de folga (Headroom) e DLM.
 */

import * as XLSX from 'xlsx';
import { TypicalHourlyPoint } from '../database/typicalLoadProfiles';
import { MeasuredIntervalPoint, PeriodMeasurementSummary } from '../types';

export interface ParsedLoadFileResult {
  fileName: string;
  totalRowsRead: number;
  validPointsCount: number;
  periodStart?: string;
  periodEnd?: string;
  maxRecordedDemandKW: number;
  averageDemandKW: number;
  hourlyCurve24h: TypicalHourlyPoint[];
  periodSummary?: PeriodMeasurementSummary;
}

// ─── PARSER PARA ARQUIVOS EXCEL (.XLSX / .XLS) ───────────────────────────────

/**
 * Lê e analisa buffers de arquivos Excel (.xlsx / .xls), identificando automaticamente
 * colunas de Data, Hora e Potência Consumida (kW).
 */
export function parseLoadExcelBuffer(
  buffer: ArrayBuffer | Buffer | Uint8Array,
  fileName: string = 'SmartMeter.xlsx'
): PeriodMeasurementSummary {
  const wb = XLSX.read(buffer, { type: buffer instanceof Buffer ? 'buffer' : 'array' });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('A pasta de trabalho Excel não contém nenhuma planilha.');
  }

  // Usa a primeira aba (ex: "Potência Consumida (kW)")
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet || !sheet['!ref']) {
    throw new Error(`A planilha "${sheetName}" está vazia ou sem dados.`);
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // 1. Identificar índices das colunas a partir do cabeçalho (linha range.s.r)
  let dateCol = -1;
  let timeCol = -1;
  let powerCol = -1;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    if (!headerCell || headerCell.v === undefined) continue;

    const valStr = String(headerCell.v).trim().toLowerCase();
    if (valStr.includes('hora') || valStr.includes('hour') || valStr.includes('time')) {
      timeCol = c;
    } else if (dateCol === -1 && (valStr.includes('data') || valStr.includes('date'))) {
      dateCol = c;
    }

    if (
      valStr.includes('consumida') ||
      valStr.includes('potencia') ||
      valStr.includes('potência') ||
      valStr.includes('demanda') ||
      valStr.includes('kw') ||
      valStr.includes('power')
    ) {
      powerCol = c;
    }
  }

  // Fallbacks caso cabeçalho não seja conclusivo
  if (dateCol === -1) dateCol = 0;
  if (timeCol === -1) timeCol = range.e.c >= 1 ? 1 : 0;
  if (powerCol === -1) powerCol = range.e.c >= 2 ? 2 : (range.e.c >= 1 ? 1 : 0);

  const intervalPoints: MeasuredIntervalPoint[] = [];
  let minPowerKW = Infinity;
  let maxPowerKW = -Infinity;
  let peakTimestamp = '';
  let sumPowerKW = 0;

  // 2. Iterar sobre as linhas de medição
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const cDate = sheet[XLSX.utils.encode_cell({ r, c: dateCol })];
    const cTime = sheet[XLSX.utils.encode_cell({ r, c: timeCol })];
    const cPower = sheet[XLSX.utils.encode_cell({ r, c: powerCol })];

    if (!cPower || cPower.v === undefined || cPower.v === null) continue;

    // Extrair potência (kW) com máxima precisão
    let powerKW = 0;
    if (typeof cPower.v === 'number') {
      powerKW = cPower.v;
    } else {
      const clean = String(cPower.v).replace(/[^0-9,.-]/g, '').replace(',', '.');
      powerKW = parseFloat(clean);
    }

    if (isNaN(powerKW) || powerKW < 0) continue;
    powerKW = Number(powerKW.toFixed(3));

    // Extrair data formatada
    let dateStr = '';
    if (cDate) {
      dateStr = cDate.w ? cDate.w.trim() : String(cDate.v).trim();
    }

    // Extrair hora formatada (ex: "12:40:00" ou "12:40")
    let timeStr = '';
    if (cTime) {
      if (cTime.w) {
        timeStr = cTime.w.trim();
      } else if (typeof cTime.v === 'number') {
        // Conversão de número de fração do dia do Excel (ex: 0.5277777777777778 -> 12:40:00)
        const totalSec = Math.round(cTime.v * 86400);
        const h = Math.floor(totalSec / 3600) % 24;
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else {
        timeStr = String(cTime.v).trim();
      }
    }

    // Corrente estimada a 220V com fp 0.98
    const estimatedCurrentA = Number(((powerKW * 1000) / (220 * 0.98)).toFixed(1));

    if (powerKW < minPowerKW) minPowerKW = powerKW;
    if (powerKW > maxPowerKW) {
      maxPowerKW = powerKW;
      peakTimestamp = `${dateStr} ${timeStr}`.trim();
    }
    sumPowerKW += powerKW;

    intervalPoints.push({
      index: intervalPoints.length + 1,
      dateStr,
      timeStr,
      powerKW,
      voltageV: 220,
      estimatedCurrentA
    });
  }

  if (intervalPoints.length === 0) {
    throw new Error('Nenhum registro de potência válido foi encontrado na planilha.');
  }

  // 3. Identificar intervalo em minutos (passo de tempo)
  let intervalMinutes = 5;
  if (intervalPoints.length >= 2) {
    const t0 = parseTimeToMinutes(intervalPoints[0].timeStr);
    const t1 = parseTimeToMinutes(intervalPoints[1].timeStr);
    const delta = t1 - t0;
    if (delta > 0 && delta <= 120) {
      intervalMinutes = delta;
    }
  }

  const totalReadings = intervalPoints.length;
  const durationMinutes = totalReadings * intervalMinutes;
  const averagePowerKW = Number((sumPowerKW / totalReadings).toFixed(3));
  // Energia total integrada: P * dt (kW * h)
  const totalEnergyKWh = Number((sumPowerKW * (intervalMinutes / 60)).toFixed(2));

  return {
    fileName,
    fileType: 'xlsx',
    periodStart: `${intervalPoints[0].dateStr} ${intervalPoints[0].timeStr}`.trim(),
    periodEnd: `${intervalPoints[totalReadings - 1].dateStr} ${intervalPoints[totalReadings - 1].timeStr}`.trim(),
    durationMinutes,
    intervalMinutes,
    totalReadings,
    minPowerKW: Number(minPowerKW.toFixed(3)),
    maxPowerKW: Number(maxPowerKW.toFixed(3)),
    peakTimestamp,
    averagePowerKW,
    totalEnergyKWh,
    intervalPoints
  };
}

// ─── PARSER PARA ARQUIVOS CSV / TXT COM SUPORTE A PERÍODO ────────────────────

/**
 * Lê e analisa strings CSV ou TXT de memórias de massa.
 */
export function parseLoadCsvWithPeriod(
  fileContent: string,
  fileName: string = 'medicao.csv'
): PeriodMeasurementSummary {
  const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('Arquivo de medição vazio ou com linhas insuficientes.');
  }

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());

  let dateCol = -1;
  let timeCol = -1;
  let powerCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const col = headers[i];
    if (col.includes('hora') || col.includes('hour') || col.includes('time') || col.includes('timestamp')) {
      timeCol = i;
    } else if (dateCol === -1 && (col.includes('data') || col.includes('date'))) {
      dateCol = i;
    }

    if (
      col.includes('demanda') ||
      col.includes('consumida') ||
      col.includes('kw') ||
      col.includes('ativa') ||
      col.includes('potencia') ||
      col.includes('potência') ||
      col.includes('power')
    ) {
      if (powerCol === -1 || col.includes('demanda_ativa') || col.includes('consumida')) {
        powerCol = i;
      }
    }
  }

  if (timeCol === -1) timeCol = 0;
  if (powerCol === -1) powerCol = headers.length > 1 ? 1 : 0;
  if (dateCol === -1) dateCol = 0;

  const intervalPoints: MeasuredIntervalPoint[] = [];
  let minPowerKW = Infinity;
  let maxPowerKW = -Infinity;
  let peakTimestamp = '';
  let sumPowerKW = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map(c => c.trim());
    if (row.length <= Math.max(timeCol, powerCol)) continue;

    const dateRaw = row[dateCol] || '';
    const timeRaw = row[timeCol] || '';
    const powerRaw = row[powerCol] || '';

    const cleanedPower = powerRaw.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const valKW = parseFloat(cleanedPower);
    if (isNaN(valKW) || valKW < 0) continue;

    let timeStr = timeRaw;
    let timeMatch = timeRaw.match(/(\d{1,2}):(\d{2})(:(\d{2}))?/);
    if (!timeMatch) {
      for (const cell of row) {
        const m = cell.match(/(\d{1,2}):(\d{2})(:(\d{2}))?/);
        if (m) {
          timeMatch = m;
          timeStr = cell;
          break;
        }
      }
    }

    const roundedKW = Number(valKW.toFixed(3));
    if (roundedKW < minPowerKW) minPowerKW = roundedKW;
    if (roundedKW > maxPowerKW) {
      maxPowerKW = roundedKW;
      peakTimestamp = `${dateRaw} ${timeStr}`.trim();
    }
    sumPowerKW += roundedKW;

    intervalPoints.push({
      index: intervalPoints.length + 1,
      dateStr: dateRaw,
      timeStr,
      powerKW: roundedKW,
      voltageV: 220,
      estimatedCurrentA: Number(((roundedKW * 1000) / (220 * 0.98)).toFixed(1))
    });
  }

  if (intervalPoints.length === 0) {
    throw new Error('Nenhum dado numérico de potência válido pôde ser extraído do arquivo CSV.');
  }

  let intervalMinutes = 5;
  if (intervalPoints.length >= 2) {
    const t0 = parseTimeToMinutes(intervalPoints[0].timeStr);
    const t1 = parseTimeToMinutes(intervalPoints[1].timeStr);
    const delta = t1 - t0;
    if (delta > 0 && delta <= 120) {
      intervalMinutes = delta;
    }
  }

  const totalReadings = intervalPoints.length;
  const durationMinutes = totalReadings * intervalMinutes;
  const averagePowerKW = Number((sumPowerKW / totalReadings).toFixed(3));
  const totalEnergyKWh = Number((sumPowerKW * (intervalMinutes / 60)).toFixed(2));

  return {
    fileName,
    fileType: fileName.endsWith('.txt') ? 'txt' : 'csv',
    periodStart: `${intervalPoints[0].dateStr} ${intervalPoints[0].timeStr}`.trim(),
    periodEnd: `${intervalPoints[totalReadings - 1].dateStr} ${intervalPoints[totalReadings - 1].timeStr}`.trim(),
    durationMinutes,
    intervalMinutes,
    totalReadings,
    minPowerKW: Number(minPowerKW.toFixed(3)),
    maxPowerKW: Number(maxPowerKW.toFixed(3)),
    peakTimestamp,
    averagePowerKW,
    totalEnergyKWh,
    intervalPoints
  };
}

// ─── GERADOR DA CURVA DE 24 HORAS NORMALIZADA A PARTIR DAS MEDIÇÕES ───────────

/**
 * Converte as medições de um período em uma curva horária de 24 horas contínua.
 * Horários sem medição no arquivo são preenchidos de forma coerente a partir da
 * média do período e do perfil típico da madrugada.
 */
export function build24hCurveFromPeriodSummary(
  summary: PeriodMeasurementSummary
): TypicalHourlyPoint[] {
  const hourlySums = new Array(24).fill(0);
  const hourlyCounts = new Array(24).fill(0);

  for (const pt of summary.intervalPoints) {
    const hour = parseHourFromTimeStr(pt.timeStr);
    if (hour >= 0 && hour < 24) {
      hourlySums[hour] += pt.powerKW;
      hourlyCounts[hour] += 1;
    }
  }

  // Preenchimento inteligente para horas fora da janela de medição
  const baselineDayKW = summary.averagePowerKW;
  const baselineNightKW = summary.minPowerKW > 0 ? summary.minPowerKW : Math.max(0.2, summary.averagePowerKW * 0.25);

  const curve24h: TypicalHourlyPoint[] = [];

  for (let h = 0; h < 24; h++) {
    let kw = 0;
    if (hourlyCounts[h] > 0) {
      kw = hourlySums[h] / hourlyCounts[h];
    } else {
      // Madrugada (00h-06h): carga mínima do local
      // Manhã (07h-11h): rampa até a média do dia
      if (h < 6 || h === 23) {
        kw = baselineNightKW;
      } else {
        kw = baselineDayKW;
      }
    }

    const roundedKW = Number(kw.toFixed(1));
    curve24h.push({
      hour: h,
      hourLabel: `${String(h).padStart(2, '0')}:00`,
      baseLoadKW: roundedKW,
      solarGenerationKW: 0,
      netBuildingLoadKW: roundedKW
    });
  }

  return curve24h;
}

// ─── FUNÇÃO UNIFICADA DE DISPARO DE PARSER (UNIVERSAL) ───────────────────────

/**
 * Detecta o tipo de arquivo (Excel buffer ou CSV string) e executa o parsing unificado.
 */
export function parseUniversalLoadFile(
  data: string | ArrayBuffer | Buffer | Uint8Array,
  fileName: string
): { summary: PeriodMeasurementSummary; parsedResult: ParsedLoadFileResult } {
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || !(typeof data === 'string');

  let summary: PeriodMeasurementSummary;
  if (isExcel) {
    summary = parseLoadExcelBuffer(data as ArrayBuffer | Buffer, fileName);
  } else {
    summary = parseLoadCsvWithPeriod(data as string, fileName);
  }

  const hourlyCurve24h = build24hCurveFromPeriodSummary(summary);

  const parsedResult: ParsedLoadFileResult = {
    fileName,
    totalRowsRead: summary.totalReadings,
    validPointsCount: summary.totalReadings,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    maxRecordedDemandKW: summary.maxPowerKW,
    averageDemandKW: summary.averagePowerKW,
    hourlyCurve24h,
    periodSummary: summary
  };

  return { summary, parsedResult };
}

/**
 * Wrapper de compatibilidade com Passo 2 para leitura de string CSV.
 */
export function parseLoadDataFile(fileContent: string, fileName: string = 'medicao.csv'): ParsedLoadFileResult {
  const { parsedResult } = parseUniversalLoadFile(fileContent, fileName);
  return parsedResult;
}

// ─── UTILITÁRIOS INTERNOS DE HORA ───────────────────────────────────────────

function parseHourFromTimeStr(timeStr: string): number {
  const m = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    return parseInt(m[1], 10);
  }
  return -1;
}

function parseTimeToMinutes(timeStr: string): number {
  const m = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  return 0;
}

// ─── AGREGADOR E COMPILADOR MULTI-PLANILHA E DIÁRIO ─────────────────────────

import { DailyPeakPoint, MultiSheetMeasurementSummary } from '../types';

/**
 * Extrai o pico máximo registrado para cada dia a partir de um conjunto de pontos de medição.
 * Suporta tanto uma única planilha com múltiplos dias quanto arquivos diários separados.
 */
export function extractDailyPeaks(intervalPoints: MeasuredIntervalPoint[], defaultSourceFileName?: string): DailyPeakPoint[] {
  const dayMap = new Map<string, {
    maxPowerKW: number;
    peakTimeStr: string;
    sumPowerKW: number;
    readingsCount: number;
    sourceFileName?: string;
  }>();

  for (const pt of intervalPoints) {
    let dateKey = pt.dateStr.trim();
    if (!dateKey) dateKey = 'Dia Único';

    const current = dayMap.get(dateKey) || {
      maxPowerKW: -Infinity,
      peakTimeStr: pt.timeStr,
      sumPowerKW: 0,
      readingsCount: 0,
      sourceFileName: defaultSourceFileName
    };

    if (pt.powerKW > current.maxPowerKW) {
      current.maxPowerKW = pt.powerKW;
      current.peakTimeStr = pt.timeStr;
    }
    current.sumPowerKW += pt.powerKW;
    current.readingsCount += 1;

    dayMap.set(dateKey, current);
  }

  // Converter para array ordenado
  const result: DailyPeakPoint[] = [];
  dayMap.forEach((val, dateStr) => {
    // Formatar rótulo curto do dia (ex: '29/09' ou '29/09/2026')
    const parts = dateStr.split('/');
    const dayLabel = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dateStr;

    const avg = val.readingsCount > 0 ? Number((val.sumPowerKW / val.readingsCount).toFixed(3)) : 0;
    // Estimativa de energia integrada: assumindo ~5 min por leitura (dt = 5/60 h)
    const energy = Number((val.sumPowerKW * (5 / 60)).toFixed(2));

    result.push({
      dateStr,
      dayLabel,
      maxPowerKW: Number(val.maxPowerKW.toFixed(3)),
      peakTimeStr: val.peakTimeStr,
      averagePowerKW: avg,
      totalEnergyKWh: energy,
      readingsCount: val.readingsCount,
      sourceFileName: val.sourceFileName
    });
  });

  // Ordenação cronológica simples (se formato DD/MM/AAAA)
  return result.sort((a, b) => {
    const pA = a.dateStr.split('/');
    const pB = b.dateStr.split('/');
    if (pA.length === 3 && pB.length === 3) {
      const dtA = new Date(parseInt(pA[2]), parseInt(pA[1]) - 1, parseInt(pA[0])).getTime();
      const dtB = new Date(parseInt(pB[2]), parseInt(pB[1]) - 1, parseInt(pB[0])).getTime();
      return dtA - dtB;
    }
    return a.dateStr.localeCompare(b.dateStr);
  });
}

/**
 * Compila uma lista de resumos de medições (de uma ou múltiplas planilhas anexadas)
 * em uma estrutura unificada, consolidando todos os picos de cada dia.
 */
export function compileMultipleLoadSummaries(summaries: PeriodMeasurementSummary[]): MultiSheetMeasurementSummary {
  if (summaries.length === 0) {
    throw new Error('Nenhuma medição fornecida para compilação.');
  }

  // Se houver apenas 1 resumo
  if (summaries.length === 1) {
    const s = summaries[0];
    const dailyPeaks = extractDailyPeaks(s.intervalPoints, s.fileName);
    return {
      files: summaries,
      consolidatedSummary: s,
      dailyPeaks,
      globalMaxPowerKW: s.maxPowerKW,
      globalPeakTimestamp: s.peakTimestamp,
      totalDays: Math.max(1, dailyPeaks.length)
    };
  }

  // Múltiplos arquivos: mesclar pontos e extrair picos diários
  let allPoints: MeasuredIntervalPoint[] = [];
  let globalMaxPowerKW = -Infinity;
  let globalPeakTimestamp = '';
  let sumPowerTotal = 0;
  let totalReadingsCount = 0;
  let totalEnergySum = 0;

  for (const s of summaries) {
    for (const pt of s.intervalPoints) {
      allPoints.push(pt);
      if (pt.powerKW > globalMaxPowerKW) {
        globalMaxPowerKW = pt.powerKW;
        globalPeakTimestamp = `${pt.dateStr} ${pt.timeStr}`.trim();
      }
      sumPowerTotal += pt.powerKW;
    }
    totalReadingsCount += s.totalReadings;
    totalEnergySum += s.totalEnergyKWh;
  }

  const dailyPeaks = extractDailyPeaks(allPoints);
  const avgTotal = totalReadingsCount > 0 ? Number((sumPowerTotal / totalReadingsCount).toFixed(3)) : 0;

  const consolidatedSummary: PeriodMeasurementSummary = {
    fileName: `${summaries.length} Planilhas Compiladas (${dailyPeaks.length} dias)`,
    fileType: 'xlsx',
    periodStart: dailyPeaks[0]?.dateStr || summaries[0].periodStart,
    periodEnd: dailyPeaks[dailyPeaks.length - 1]?.dateStr || summaries[summaries.length - 1].periodEnd,
    durationMinutes: totalReadingsCount * 5,
    intervalMinutes: 5,
    totalReadings: totalReadingsCount,
    minPowerKW: Math.min(...summaries.map(s => s.minPowerKW)),
    maxPowerKW: Number(globalMaxPowerKW.toFixed(3)),
    peakTimestamp: globalPeakTimestamp,
    averagePowerKW: avgTotal,
    totalEnergyKWh: Number(totalEnergySum.toFixed(2)),
    intervalPoints: allPoints
  };

  return {
    files: summaries,
    consolidatedSummary,
    dailyPeaks,
    globalMaxPowerKW: Number(globalMaxPowerKW.toFixed(3)),
    globalPeakTimestamp,
    totalDays: dailyPeaks.length
  };
}
