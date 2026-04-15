/**
 * Parser de Memória de Massa CEMIG (XLS)
 * Analisa múltiplos arquivos de um mesmo cliente em períodos diferentes.
 * Identifica o período crítico (maior demanda) e gera curva de carga.
 */

import * as XLSX from 'xlsx';

export interface PostoConfig {
  hp_inicio: string;   // "18:00"
  hp_fim: string;      // "21:00"
  hfp_inicio: string;
  hfp_fim: string;
  hr_inicio?: string;  // Horário Reservado (opcional)
  hr_fim?: string;
  diasUteis: number[]; // 1=Seg..7=Dom (1-5 = Seg-Sex por padrão)
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

  // Demanda máxima por posto
  maxDemandaHP: number;
  maxDemandaHFP: number;
  maxDemandaHR: number;
  maxDemandaTotal: number;

  // Registro do momento mais crítico
  diaCriticoData: Date;
  diaCriticoDemandaKW: number;
  diaCriticoCurva: Array<{ hora: number; kw: number; kwh: number; posto: string }>;

  // Consumo total por posto (kWh)
  consumoHP_kWh: number;
  consumoHFP_kWh: number;
  consumoHR_kWh: number;

  // Curva de carga média diária (24 pontos horários)
  curvaMediaDiaria: Array<{ hora: number; kw: number; kwh: number }>;
  curvaHP: Array<{ hora: number; kw: number }>;
  curvaHFP: Array<{ hora: number; kw: number }>;

  // Resumo mensal
  resumoMensal: Array<{
    mes: string; // "2024-01"
    maxDemandaHP: number;
    maxDemandaHFP: number;
    consumoHP: number;
    consumoHFP: number;
    consumoTotal: number;
  }>;
}

/** Converte "HH:MM" para minutos desde meia-noite */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Identifica o posto tarifário de uma data/hora */
function identificarPosto(
  date: Date,
  config: PostoConfig,
  registrosDemanda: boolean
): 'HP' | 'HFP' | 'HR' {
  const diaSemana = date.getDay() || 7; // 1=Seg..7=Dom
  const minutos = date.getHours() * 60 + date.getMinutes();

  if (!config.diasUteis.includes(diaSemana)) return 'HFP'; // Finais de semana e feriados = HFP

  const hpIni = toMinutes(config.hp_inicio);
  const hpFim = toMinutes(config.hp_fim);
  const hrIni = config.hr_inicio ? toMinutes(config.hr_inicio) : -1;
  const hrFim = config.hr_fim ? toMinutes(config.hr_fim) : -1;

  if (hrIni >= 0 && minutos >= hrIni && minutos < hrFim) return 'HR';
  if (minutos >= hpIni && minutos < hpFim) return 'HP';
  return 'HFP';
}

/** 
 * Detecta automaticamente as colunas do XLS da CEMIG.
 * O arquivo tem variações: pode ter "Consumo kWh", "Demanda kW", "Data/Hora", etc.
 */
function detectarColunas(headers: string[]): {
  colTimestamp: number;
  colConsumo: number;
  colDemanda: number;
} | null {
  const norm = headers.map(h => (h || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  
  const colTimestamp = norm.findIndex(h =>
    h.includes('data') || h.includes('hora') || h.includes('timestamp') || h.includes('datetime')
  );
  const colConsumo = norm.findIndex(h =>
    h.includes('consumo') || h.includes('kwh') || h.includes('energia')
  );
  const colDemanda = norm.findIndex(h =>
    h.includes('demanda') || h.includes('kw') || (h.includes('potencia') && !h.includes('kwh'))
  );

  if (colTimestamp < 0) return null;
  return { colTimestamp, colConsumo: colConsumo >= 0 ? colConsumo : -1, colDemanda: colDemanda >= 0 ? colDemanda : -1 };
}

/** Parseia um buffer XLS e retorna registros crus */
function parseXls(buffer: Buffer): RegistroMassa[] | null {
  try {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    if (rows.length < 3) return null;

    // Encontrar a linha de cabeçalho (procurar por "data" ou "hora")
    let headerRow = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const r = rows[i].map((c: any) => String(c || '').toLowerCase());
      if (r.some(c => c.includes('data') || c.includes('hora') || c.includes('timestamp'))) {
        headerRow = i;
        break;
      }
    }

    const headers = rows[headerRow].map((c: any) => String(c || ''));
    const cols = detectarColunas(headers);
    if (!cols) return null;

    const registros: RegistroMassa[] = [];

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[cols.colTimestamp]) continue;

      let ts: Date;
      const tsRaw = row[cols.colTimestamp];
      if (tsRaw instanceof Date) {
        ts = tsRaw;
      } else if (typeof tsRaw === 'number') {
        // Excel serial date
        ts = XLSX.SSF.parse_date_code(tsRaw) as any;
        if (!ts) continue;
      } else {
        ts = new Date(String(tsRaw));
        if (isNaN(ts.getTime())) continue;
      }

      const consumo = cols.colConsumo >= 0 ? parseFloat(String(row[cols.colConsumo] || 0)) : 0;
      const demanda = cols.colDemanda >= 0 ? parseFloat(String(row[cols.colDemanda] || 0)) : 0;

      if (isNaN(consumo) && isNaN(demanda)) continue;

      registros.push({
        timestamp: ts,
        consumoKWh: isNaN(consumo) ? 0 : consumo,
        demandaKW: isNaN(demanda) ? 0 : demanda,
        posto: 'HFP', // preenchido depois
        diaUtil: true,
      });
    }

    return registros;
  } catch (e) {
    console.error('Erro ao parsear XLS:', e);
    return null;
  }
}

/** 
 * Processa múltiplos buffers XLS do mesmo cliente.
 * Combina os períodos, identifica postos e calcula estatísticas.
 */
export function processarMemoriaMassa(
  buffers: Buffer[],
  config: PostoConfig
): ResultadoMassa | null {
  // 1. Parsear todos os arquivos e combinar
  let todosRegistros: RegistroMassa[] = [];
  for (const buf of buffers) {
    const regs = parseXls(buf);
    if (regs) todosRegistros = todosRegistros.concat(regs);
  }

  if (todosRegistros.length === 0) return null;

  // 2. Remover duplicatas e ordenar por timestamp
  const seen = new Set<string>();
  todosRegistros = todosRegistros.filter(r => {
    const key = r.timestamp.getTime().toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  todosRegistros.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // 3. Identificar posto tarifário e dia útil
  todosRegistros = todosRegistros.map(r => ({
    ...r,
    posto: identificarPosto(r.timestamp, config, r.demandaKW > 0),
    diaUtil: config.diasUteis.includes(r.timestamp.getDay() || 7),
  }));

  // 4. Calcular estatísticas por posto
  const hp = todosRegistros.filter(r => r.posto === 'HP' && r.diaUtil);
  const hfp = todosRegistros.filter(r => r.posto === 'HFP');
  const hr = todosRegistros.filter(r => r.posto === 'HR');

  const maxDemandaHP = hp.length ? Math.max(...hp.map(r => r.demandaKW)) : 0;
  const maxDemandaHFP = hfp.length ? Math.max(...hfp.map(r => r.demandaKW)) : 0;
  const maxDemandaHR = hr.length ? Math.max(...hr.map(r => r.demandaKW)) : 0;
  const maxDemandaTotal = Math.max(maxDemandaHP, maxDemandaHFP, maxDemandaHR);

  const consumoHP_kWh = hp.reduce((s, r) => s + r.consumoKWh, 0);
  const consumoHFP_kWh = hfp.reduce((s, r) => s + r.consumoKWh, 0);
  const consumoHR_kWh = hr.reduce((s, r) => s + r.consumoKWh, 0);

  // 5. Dia crítico
  const registroCritico = todosRegistros.reduce((max, r) => r.demandaKW > max.demandaKW ? r : max, todosRegistros[0]);
  const diaCriticoData = registroCritico.timestamp;

  // Pegar todos os registros do dia crítico
  const diaStr = diaCriticoData.toISOString().slice(0, 10);
  const registrosDiaCritico = todosRegistros.filter(r => r.timestamp.toISOString().slice(0, 10) === diaStr);
  const diaCriticoCurva = Array.from({ length: 24 }, (_, h) => {
    const regsHora = registrosDiaCritico.filter(r => r.timestamp.getHours() === h);
    const kw = regsHora.length ? regsHora.reduce((s, r) => s + r.demandaKW, 0) / regsHora.length : 0;
    const kwh = regsHora.reduce((s, r) => s + r.consumoKWh, 0);
    return { hora: h, kw: parseFloat(kw.toFixed(2)), kwh: parseFloat(kwh.toFixed(3)), posto: identificarPosto(new Date(`${diaStr}T${String(h).padStart(2,'0')}:00`), config, true) };
  });

  // 6. Curva de carga média diária (24 pontos)
  const curvaMediaDiaria = Array.from({ length: 24 }, (_, h) => {
    const regsHora = todosRegistros.filter(r => r.timestamp.getHours() === h);
    const kw = regsHora.length ? regsHora.reduce((s, r) => s + r.demandaKW, 0) / regsHora.length : 0;
    const kwh = regsHora.length ? regsHora.reduce((s, r) => s + r.consumoKWh, 0) / regsHora.length : 0;
    return { hora: h, kw: parseFloat(kw.toFixed(2)), kwh: parseFloat(kwh.toFixed(3)) };
  });

  const curvaHP = curvaMediaDiaria.filter(p => identificarPosto(new Date(`2024-01-01T${String(p.hora).padStart(2,'0')}:00`), config, true) === 'HP');
  const curvaHFP = curvaMediaDiaria.filter(p => identificarPosto(new Date(`2024-01-01T${String(p.hora).padStart(2,'0')}:00`), config, true) === 'HFP');

  // 7. Resumo mensal
  const meses = new Map<string, RegistroMassa[]>();
  for (const r of todosRegistros) {
    const mes = r.timestamp.toISOString().slice(0, 7);
    if (!meses.has(mes)) meses.set(mes, []);
    meses.get(mes)!.push(r);
  }

  const resumoMensal = Array.from(meses.entries()).map(([mes, regs]) => {
    const hpRegs = regs.filter(r => r.posto === 'HP');
    const hfpRegs = regs.filter(r => r.posto === 'HFP');
    return {
      mes,
      maxDemandaHP: hpRegs.length ? Math.max(...hpRegs.map(r => r.demandaKW)) : 0,
      maxDemandaHFP: hfpRegs.length ? Math.max(...hfpRegs.map(r => r.demandaKW)) : 0,
      consumoHP: parseFloat(hpRegs.reduce((s, r) => s + r.consumoKWh, 0).toFixed(1)),
      consumoHFP: parseFloat(hfpRegs.reduce((s, r) => s + r.consumoKWh, 0).toFixed(1)),
      consumoTotal: parseFloat(regs.reduce((s, r) => s + r.consumoKWh, 0).toFixed(1)),
    };
  }).sort((a, b) => a.mes.localeCompare(b.mes));

  return {
    periodoInicio: todosRegistros[0].timestamp,
    periodoFim: todosRegistros[todosRegistros.length - 1].timestamp,
    totalRegistros: todosRegistros.length,
    maxDemandaHP: parseFloat(maxDemandaHP.toFixed(2)),
    maxDemandaHFP: parseFloat(maxDemandaHFP.toFixed(2)),
    maxDemandaHR: parseFloat(maxDemandaHR.toFixed(2)),
    maxDemandaTotal: parseFloat(maxDemandaTotal.toFixed(2)),
    diaCriticoData,
    diaCriticoDemandaKW: parseFloat(registroCritico.demandaKW.toFixed(2)),
    diaCriticoCurva,
    consumoHP_kWh: parseFloat(consumoHP_kWh.toFixed(1)),
    consumoHFP_kWh: parseFloat(consumoHFP_kWh.toFixed(1)),
    consumoHR_kWh: parseFloat(consumoHR_kWh.toFixed(1)),
    curvaMediaDiaria,
    curvaHP,
    curvaHFP,
    resumoMensal,
  };
}
