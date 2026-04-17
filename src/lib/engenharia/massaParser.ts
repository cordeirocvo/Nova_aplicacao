/**
 * Parser de Memória de Massa CEMIG (XLS) - Versão Limpa [Build 2026-04-16-v5]
 * Analisa arquivos complexos da CEMIG (Grid, List, Multi-Sheet).
 */

import * as XLSX from 'xlsx';

export interface PostoConfig {
  hp_inicio: string;
  hp_fim: string;
  hfp_inicio: string;
  hfp_fim: string;
  hr_inicio?: string;
  hr_fim?: string;
  diasUteis: number[];
}

export interface RegistroMassa {
  timestamp: Date;
  consumoKWh: number;
  demandaKW: number;
  posto: 'HP' | 'HFP' | 'HR';
  diaUtil: boolean;
}

export interface ResultadoMassa {
  periodoInicio: Date;
  periodoFim: Date;
  totalRegistros: number;
  maxDemandaHP: number;
  maxDemandaHFP: number;
  maxDemandaHR: number;
  maxDemandaTotal: number;
  diaCriticoData: Date;
  diaCriticoDemandaKW: number;
  diaCriticoCurva: Array<{ hora: number; kw: number; kwh: number; posto: string }>;
  mediaDiaCritico: number;
  maxDemandaTotalData: Date;
  minDemandaTotal: number;
  minDemandaTotalData: Date;
  consumoHP_kWh: number;
  consumoHFP_kWh: number;
  consumoHR_kWh: number;
  curvaMediaDiaria: Array<{ hora: number; kw: number; kwh: number }>;
  curvaHP: Array<{ hora: number; kw: number }>;
  curvaHFP: Array<{ hora: number; kw: number }>;
  resumoMensal: Array<{
    mes: string;
    maxDemandaHP: number;
    maxDemandaHFP: number;
    consumoHP: number;
    consumoHFP: number;
    consumoHR: number;
    consumoTotal: number;
  }>;
  abaProcessada?: string;
  amostraDados?: Array<{ ts: string; v: number; posto: string }>;
}

function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function identificarPosto(date: Date, config: PostoConfig, isDemanda: boolean): 'HP' | 'HFP' | 'HR' {
  const diaSemana = date.getDay() || 7; // 1-7
  const minutos = date.getHours() * 60 + date.getMinutes();
  
  const hpIni = toMinutes(config.hp_inicio);
  const hpFim = toMinutes(config.hp_fim);
  const hrIni = config.hr_inicio ? toMinutes(config.hr_inicio) : -1;
  const hrFim = config.hr_fim ? toMinutes(config.hr_fim) : -1;
  const temHR = hrIni >= 0 && hrFim >= 0 && hrIni !== hrFim;

  const isFimDeSemana = !(config.diasUteis || [1,2,3,4,5]).includes(diaSemana);

  // Se não tem HR e é fim de semana, vira HFP
  if (isFimDeSemana) {
    return temHR ? 'HR' : 'HFP';
  }

  // Dias úteis:
  // Primeiro checa Reservado (ex: irrigação matinal)
  if (temHR) {
    if (hrIni < hrFim) {
      if (minutos >= hrIni && minutos < hrFim) return 'HR';
    } else {
      // Horário cruzando meia-noite
      if (minutos >= hrIni || minutos < hrFim) return 'HR';
    }
  }

  // Depois checa Ponta
  if (minutos >= hpIni && minutos < hpFim) return 'HP';

  // Por fim, Fora Ponta
  return 'HFP';
}

function parseDateCemig(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    date.setUTCHours(0, 0, 0, 0); 
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  const s = String(val).trim().toLowerCase();
  if (!s || s.length < 5) return null;

  // Tenta formato DD/MM/YYYY ou DD/MMM/YYYY
  const parts = s.split(/[\s/:\-.]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0]);
    let mo = parseInt(parts[1]) - 1;
    
    // Suporte a meses em PT-BR (jan, fev, mar...)
    if (isNaN(mo)) {
      const m = parts[1];
      if (m.startsWith('jan')) mo = 0;
      else if (m.startsWith('fev')) mo = 1;
      else if (m.startsWith('mar')) mo = 2;
      else if (m.startsWith('abr')) mo = 3;
      else if (m.startsWith('mai')) mo = 4;
      else if (m.startsWith('jun')) mo = 5;
      else if (m.startsWith('jul')) mo = 6;
      else if (m.startsWith('ago')) mo = 7;
      else if (m.startsWith('set')) mo = 8;
      else if (m.startsWith('out')) mo = 9;
      else if (m.startsWith('nov')) mo = 10;
      else if (m.startsWith('dez')) mo = 11;
    }

    let yr = parseInt(parts[2]);
    if (yr < 100) yr += 2000;
    const d = new Date(yr, mo, day);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function cleanNumeric(val: any): number {
  if (typeof val === 'number') return val;
  const s = String(val || '0').trim();
  if (!s || s === '-' || s === 'nan') return 0;
  if (s.includes('.') && s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0;
  return parseFloat(s) || 0;
}

function scanForGrid(rows: any[][]): { headerRow: number; dataCol: number; count: number } | null {
  for (let i = 0; i < Math.min(60, rows.length); i++) {
    const row = rows[i];
    if (!row || row.length < 20) continue;
    let hourCols = 0;
    let startCol = -1;
    let consecutiveHours = 0;
    for (let j = 0; j < row.length; j++) {
      const v = String(row[j] || '').toLowerCase();
      // Verifica se é um cabeçalho de hora (00:00 ou número sequencial de 1-96)
      const isH = v.includes(':') || (/^\d+$/.test(v) && parseInt(v) >= 0 && parseInt(v) <= 96);
      if (isH) {
        if (startCol === -1) startCol = j;
        consecutiveHours++;
      } else if (consecutiveHours > 4) {
        // Se quebrou a sequência mas já tínhamos algumas, e não chegamos em 22, desconsidera
        break;
      }
    }
    if (consecutiveHours >= 22) return { headerRow: i, dataCol: startCol, count: consecutiveHours };
  }
  return null;
}

function unpivotCemigGrid(rows: any[][], info: { headerRow: number; dataCol: number; count: number }): RegistroMassa[] {
  const regs: RegistroMassa[] = [];
  for (let i = info.headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const base = parseDateCemig(row[0] || row[1] || row[2]);
    if (!base) continue;
    for (let c = 0; c < info.count; c++) {
      const val = cleanNumeric(row[info.dataCol + c]);
      // Não pula zeros na grade para manter a continuidade do gráfico
      const ts = new Date(base);
      ts.setMinutes(ts.getMinutes() + (info.count > 30 ? c * 15 : c * 60));
      regs.push({ timestamp: ts, consumoKWh: val, demandaKW: val, posto: 'HFP', diaUtil: true });
    }
  }
  return regs;
}

function analyzeCemigSheet(sheetName: string, rows: any[][], config: PostoConfig): RegistroMassa[] {
  // Try Grid
  const grid = scanForGrid(rows.slice(0, 60));
  if (grid) return unpivotCemigGrid(rows, grid);

  // Try List
  let hrIdx = -1;
  const matchKeys = ['data', 'dt', 'dta', 'hora', 'hr', 'kwh', 'recebido', 'consumo', 'valor', 'potencia', 'demanda', 'ativa', 'passo'];
  
  for (let i = 0; i < Math.min(40, rows.length); i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;
    
    // Exige que encontre pelo menos 2 cabeçalhos conhecidos na mesma linha
    const matches = r.filter(c => {
      const sc = String(c || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return matchKeys.some(k => sc.includes(k));
    }).length;

    if (matches >= 2) {
      hrIdx = i; break;
    }
  }
  
  if (hrIdx === -1) {
    // try auto scan (mais agressivo)
    for (let i = 0; i < Math.min(60, rows.length); i++) {
      if (parseDateCemig(rows[i]?.[0])) { hrIdx = i - 1; break; }
    }
  }

  if (hrIdx < 0) hrIdx = 0; // Fallback para a primeira linha se tudo falhar

  const headers = rows[hrIdx] || [];
  const norm = headers.map(h => String(h || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  
  const colTs = norm.findIndex(h => h && (h.includes('data') || h === 'dt' || h === 'dta'));
  const colHora = norm.findIndex(h => h && (h.includes('hora') || h.includes('instante') || h.includes('periodo') || h === 'hr' || h === 'h'));
  const colV = norm.findIndex(h => h && (h.includes('demanda') || h.includes('kw') || h.includes('consumo') || h.includes('kwh') || h.includes('recebido') || h.includes('valor') || h.includes('potencia') || h.includes('ativa')));
  const colPosto = norm.findIndex(h => h && (h.includes('posto') || h.includes('tarif')));
  
  // Se não encontrou coluna de data, tenta usar a coluna 0
  const realColTs = colTs === -1 ? 0 : colTs;
  
  const res: RegistroMassa[] = [];
  let lastValidDate: Date | null = null;
  for (let i = hrIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const valTs = row[realColTs];
    let tsBase = parseDateCemig(valTs);
    if (!tsBase && lastValidDate) tsBase = lastValidDate;
    if (!tsBase) continue;
    lastValidDate = tsBase;
    
    // Fusão inteligente de Data + Hora (Suporte a String e Número Serial do Excel)
    let ts = new Date(tsBase);
    if (colHora !== -1 && colHora !== colTs) {
      const valH = row[colHora];
      if (valH instanceof Date) {
        ts.setHours(valH.getHours(), valH.getMinutes(), 0, 0);
      } else if (typeof valH === 'number') {
        if (valH >= 0 && valH < 1) {
          // Horário serial do Excel (ex: 0.5 = 12:00)
          const totalMinutes = Math.round(valH * 24 * 60);
          ts.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
        } else if (valH >= 1 && valH <= 24) {
          // Hora inteira (ex: 1, 2, 3...)
          ts.setHours(valH === 24 ? 0 : valH, 0, 0, 0);
        }
      } else {
        const hStr = String(valH || '').trim();
        if (hStr.includes(':')) {
          const partsH = hStr.split(':').map(Number);
          ts.setHours(partsH[0] || 0, partsH[1] || 0, 0, 0);
        } else if (hStr !== '' && !isNaN(Number(hStr))) {
          // Trata número simples como hora (ex: "1" ou 1)
          ts.setHours(parseInt(hStr), 0, 0, 0);
        }
      }
    }

    const v = cleanNumeric(row[colV === -1 ? realColTs + 1 : colV]);
    // Removida a filtragem de zeros para garantir que apareçam na amostra
    // if (v === 0) continue; 
    
    let posto: 'HP' | 'HFP' | 'HR' = 'HFP';
    if (colPosto !== -1) {
      const pStr = String(row[colPosto] || '').toLowerCase();
      if (pStr.includes('pon') || pStr.includes('hp')) posto = 'HP';
      else if (pStr.includes('res') || pStr.includes('hr')) posto = 'HR';
    } else {
      posto = identificarPosto(ts, config, true);
    }

    res.push({ timestamp: ts, consumoKWh: v, demandaKW: v, posto, diaUtil: true });
  }
  return res;
}

function getWorksheetData(buffer: Buffer, config: PostoConfig): { regs: RegistroMassa[], sheets: string[] } {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  let bestRegs: RegistroMassa[] = [];
  let bestSheetName = '';
  let bestScore = -1;
  const names: string[] = [];

  for (const name of wb.SheetNames) {
    names.push(name);
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1 });
    const regs = analyzeCemigSheet(name, rows, config);
    
    // Score inteligente:
    // Pesa fortemente a presença de colunas de horário e a quantidade de registros
    const normH = (rows.find(r => r && r.length > 5) || []).map(c => String(c || '').toLowerCase());
    const hasHora = normH.some(h => h.includes('hora') || h === 'hr');
    
    const countNonZero = regs.filter(r => Math.abs(r.consumoKWh) > 0.0001).length;
    const score = (countNonZero * 1000) + (hasHora ? 5000 : 0) + regs.length;

    if (score > bestScore && regs.length > 0) {
      bestScore = score;
      bestRegs = regs;
      bestSheetName = name;
    }
  }
  return { regs: bestRegs, sheets: [bestSheetName] };
}

export function processarMemoriaMassa(buffers: Buffer[], config: PostoConfig): ResultadoMassa | null {
  let all: RegistroMassa[] = [];
  let sheetNames: string[] = [];

  for (const b of buffers) {
    const { regs, sheets } = getWorksheetData(b, config);
    all = all.concat(regs);
    sheetNames = sheetNames.concat(sheets);
  }

  if (all.length === 0) return null;

  const seen = new Set<string>();
  all = all.filter(r => {
    const k = r.timestamp.getTime().toString();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  all = all.map(r => ({
    ...r,
    posto: identificarPosto(r.timestamp, config, r.demandaKW > 0),
    diaUtil: config.diasUteis.includes(r.timestamp.getDay() || 7)
  }));

  const hp = all.filter(r => r.posto === 'HP' && r.diaUtil);
  const hfp = all.filter(r => r.posto === 'HFP');
  const hr = all.filter(r => r.posto === 'HR');

  const maxHP = hp.length ? Math.max(...hp.map(r => r.demandaKW)) : 0;
  const maxHFP = hfp.length ? Math.max(...hfp.map(r => r.demandaKW)) : 0;
  const maxHRValue = hr.length ? Math.max(...hr.map(r => r.demandaKW)) : 0;
  const maxTotal = Math.max(maxHP, maxHFP, maxHRValue);

  if (maxTotal === 0) {
    const sample = JSON.stringify(all.slice(0, 5).map(r => ({ ts: r.timestamp.toISOString(), v: r.demandaKW })));
    throw new Error(`DADOS_ZERADOS: Nenhuma demanda > 0 encontrada nas abas [${sheetNames.join(', ')}]. Amostra: ${sample}`);
  }

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const critico = all.reduce((max, r) => r.demandaKW > max.demandaKW ? r : max, all[0]);
  const diaStr = formatDate(critico.timestamp);
  const regsCritico = all.filter(r => formatDate(r.timestamp) === diaStr);
  const curvaCritica = Array.from({ length: 24 }, (_, h) => {
    const rh = regsCritico.filter(r => r.timestamp.getHours() === h);
    return { 
      hora: h, 
      kw: parseFloat((rh.reduce((s, r) => s + r.demandaKW, 0) / (rh.length || 1)).toFixed(3)), 
      kwh: parseFloat(rh.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4)), 
      posto: identificarPosto(new Date(`${diaStr}T${String(h).padStart(2,'0')}:00`), config, true) 
    };
  });

  const curvaMedia = Array.from({ length: 24 }, (_, h) => {
    const rh = all.filter(r => r.timestamp.getHours() === h);
    return { hora: h, kw: parseFloat((rh.reduce((s, r) => s + r.demandaKW, 0) / (rh.length || 1)).toFixed(2)), kwh: parseFloat((rh.reduce((s, r) => s + r.consumoKWh, 0) / (rh.length || 1)).toFixed(3)) };
  });

  const meses = new Map<string, RegistroMassa[]>();
  all.forEach(r => {
    const y = r.timestamp.getFullYear();
    const m = String(r.timestamp.getMonth() + 1).padStart(2, '0');
    const mesKey = `${y}-${m}`;
    if (!meses.has(mesKey)) meses.set(mesKey, []);
    meses.get(mesKey)!.push(r);
  });

  const resumo = Array.from(meses.entries()).map(([mes, rs]) => {
    const hpr = rs.filter(r => r.posto === 'HP');
    const hfpr = rs.filter(r => r.posto === 'HFP');
    const hrr = rs.filter(r => r.posto === 'HR');
    return {
      mes,
      maxDemandaHP: parseFloat((hpr.length ? Math.max(...hpr.map(r => r.demandaKW)) : 0).toFixed(3)),
      maxDemandaHFP: parseFloat((hfpr.length ? Math.max(...hfpr.map(r => r.demandaKW)) : 0).toFixed(3)),
      consumoHP: parseFloat(hpr.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4)),
      consumoHFP: parseFloat(hfpr.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4)),
      consumoHR: parseFloat(hrr.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4)),
      consumoTotal: parseFloat(rs.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4))
    };
  }).sort((a, b) => a.mes.localeCompare(b.mes));

  const minTotal = all.reduce((min, r) => (r.demandaKW > 0.1 && r.demandaKW < min.demandaKW) ? r : min, all[0]);

  // Pega uma amostra de qualidade (pula zeros se existirem)
  const amostra = all.filter(r => Math.abs(r.consumoKWh) > 0).slice(0, 15);
  
  return {
    periodoInicio: all[0].timestamp,
    periodoFim: all[all.length - 1].timestamp,
    totalRegistros: all.length,
    maxDemandaHP: parseFloat(maxHP.toFixed(3)),
    maxDemandaHFP: parseFloat(maxHFP.toFixed(3)),
    maxDemandaHR: parseFloat(maxHRValue.toFixed(3)),
    maxDemandaTotal: parseFloat(maxTotal.toFixed(3)),
    diaCriticoData: critico.timestamp,
    diaCriticoDemandaKW: parseFloat(critico.demandaKW.toFixed(2)),
    diaCriticoCurva: curvaCritica,
    mediaDiaCritico: parseFloat((regsCritico.reduce((s, r) => s + r.demandaKW, 0) / (regsCritico.length || 1)).toFixed(2)),
    maxDemandaTotalData: critico.timestamp,
    minDemandaTotal: parseFloat(minTotal.demandaKW.toFixed(2)),
    minDemandaTotalData: minTotal.timestamp,
    consumoHP_kWh: parseFloat(hp.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4)),
    consumoHFP_kWh: parseFloat(hfp.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4)),
    consumoHR_kWh: parseFloat(hr.reduce((s, r) => s + r.consumoKWh, 0).toFixed(4)),
    curvaMediaDiaria: curvaMedia,
    curvaHP: curvaMedia.filter(p => identificarPosto(new Date(`2024-01-01T${String(p.hora).padStart(2,'0')}:00`), config, true) === 'HP'),
    curvaHFP: curvaMedia.filter(p => identificarPosto(new Date(`2024-01-01T${String(p.hora).padStart(2,'0')}:00`), config, true) === 'HFP'),
    resumoMensal: resumo,
    abaProcessada: sheetNames.join(', '),
    amostraDados: all.slice(0, 20).map(r => ({ 
      ts: r.timestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), 
      v: r.consumoKWh, 
      posto: r.posto 
    }))
  };
}
