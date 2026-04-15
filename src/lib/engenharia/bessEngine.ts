/**
 * Engine de Simulação BESS (Battery Energy Storage System)
 * Implementa lógicas de Peak Shaving, Time Shifting e Back-of-the-envelope ROI.
 */

export interface BESSConfig {
  capacidadeKWh: number;
  potenciaInversorKW: number;
  dodMax: number; // Profundidade de descarga (ex: 0.9 para 90%)
  eficienciaRTE: number; // Round-trip efficiency (ex: 0.85 ou 85%)
  custoSistema: number;
}

export interface PeakShavingSim {
  demandaAlvoKW: number;
  excursoesEncontradas: number;
  energiaNecessariaCicloKWh: number;
  picoReduzidoKW: number;
  shavedCurve: Array<{ hora: number; originalKW: number; batteryKW: number; finalKW: number }>;
}

export interface TimeShiftingSim {
  energiaDeslocadaDiariaKWh: number;
  economiaDiariaBruta: number; // (Preço Ponta - Preço Fora Ponta) * kWh
}

export interface FinanceiroBESS {
  paybackAnos: number;
  vpl: number;
  tir: number;
  economiaMensalEstimada: number;
}

/**
 * Simula o Peak Shaving baseado em uma curva de carga diária (24h).
 */
export function simularPeakShaving(
  curva: Array<{ hora: number; kw: number }>,
  config: BESSConfig,
  demandaAlvoKW: number
): PeakShavingSim {
  let energiaTotalKWh = 0;
  let excursoes = 0;
  
  const shavedCurve = curva.map(p => {
    let batteryKW = 0;
    if (p.kw > demandaAlvoKW) {
      excursoes++;
      batteryKW = Math.min(p.kw - demandaAlvoKW, config.potenciaInversorKW);
      energiaTotalKWh += batteryKW * 1; // assumindo 1 hora por ponto se for curva 24h
    }
    return {
      hora: p.hora,
      originalKW: p.kw,
      batteryKW: batteryKW,
      finalKW: p.kw - batteryKW
    };
  });

  const maxReduzido = Math.max(...shavedCurve.map(c => c.finalKW));

  return {
    demandaAlvoKW,
    excursoesEncontradas: excursoes,
    energiaNecessariaCicloKWh: parseFloat(energiaTotalKWh.toFixed(2)),
    picoReduzidoKW: parseFloat(maxReduzido.toFixed(2)),
    shavedCurve
  };
}

/**
 * Calcula economia de Time Shifting.
 */
export function simularTimeShifting(
  capacidadeUtilKWh: number,
  tarifaHP: number,
  tarifaHFP: number,
  rte: number
): TimeShiftingSim {
  // Economía por kWh deslocado: (Tarifa Ponta) - (Tarifa Fora Ponta / Eficiência)
  // Nota: A carga ocorre no HFP, a descarga no HP.
  const economiaPorKWh = tarifaHP - (tarifaHFP / rte);
  const economiaDiaria = Math.max(0, economiaPorKWh * capacidadeUtilKWh);

  return {
    energiaDeslocadaDiariaKWh: capacidadeUtilKWh,
    economiaDiariaBruta: parseFloat(economiaDiaria.toFixed(2))
  };
}

/**
 * Cálculo simplificado de viabilidade financeira.
 */
export function calcularFinanceiroBESS(
  investimento: number,
  economiaMensal: number,
  vidaUtilAnos: number = 10,
  taxaDescontoAnual: number = 0.12
): FinanceiroBESS {
  const economiaAnual = economiaMensal * 12;
  const payback = investimento / economiaAnual;

  // Cálculo VPL simplificado
  let vpl = -investimento;
  for (let ano = 1; ano <= vidaUtilAnos; ano++) {
    vpl += economiaAnual / Math.pow(1 + taxaDescontoAnual, ano);
  }

  // TIR Simplificada (Iterativa rápida para fins de UI)
  let tir = 0.1;
  for (let i = 0; i < 20; i++) {
    let npv = -investimento;
    for (let ano = 1; ano <= vidaUtilAnos; ano++) {
      npv += economiaAnual / Math.pow(1 + tir, ano);
    }
    if (Math.abs(npv) < 1) break;
    tir = tir + (npv / investimento) * 0.1;
  }

  return {
    paybackAnos: parseFloat(payback.toFixed(1)),
    vpl: parseFloat(vpl.toFixed(2)),
    tir: parseFloat((tir * 100).toFixed(2)),
    economiaMensalEstimada: parseFloat(economiaMensal.toFixed(2))
  };
}
