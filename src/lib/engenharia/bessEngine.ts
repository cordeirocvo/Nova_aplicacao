/**
 * Engine de Simulação BESS (Battery Energy Storage System)
 * Implementa lógicas de Peak Shaving, Time Shifting e Simulação Dinâmica Horária.
 */

export type BESSStrategy = 'SOLAR_ONLY' | 'HYBRID' | 'ARBITRAGE';

export interface BESSConfig {
  capacidadeKWh: number;
  potenciaInversorKW: number;
  dodMax: number; // Profundidade de descarga (ex: 0.9 para 90%)
  eficienciaRTE: number; // Round-trip efficiency (ex: 0.85 ou 85%)
  custoSistema: number;
  estratégia?: BESSStrategy;
}

export interface BESSSimResult {
  hora: number;
  geracaoSolar: number;
  consumoOriginal: number;
  consumoComBESS: number;
  potenciaBateria: number; // + para carga, - para descarga
  soc: number; // %
  posto: string;
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
 * Simulação Dinâmica Horária (Energy Balance)
 * Considera Geração Solar, Consumo e Estratégia BESS
 */
export function simularDinamicamenteBESS(
  curvaConsumo: Array<{ hora: number; kw: number; posto?: string }>,
  solarKWp: number,
  hspCity: number,
  config: BESSConfig
): { series: BESSSimResult[]; economiaKWh: number; autonomiaHoras: number } {
  const { capacidadeKWh, potenciaInversorKW, dodMax, eficienciaRTE, estratégia = 'SOLAR_ONLY' } = config;
  const socMin = (1 - dodMax) * 100;
  let currentSoC = socMin; // Inicia em SoC Min ou 100 conforme estratégia? Vamos iniciar em SoC Min.
  if (estratégia === 'ARBITRAGE' || estratégia === 'HYBRID') currentSoC = 100; // Assume carregado da madrugada

  const capUtilKWh = capacidadeKWh * dodMax;
  const efChg = Math.sqrt(eficienciaRTE); // Aproximação: perdas iguais na carga e descarga
  const efDis = Math.sqrt(eficienciaRTE);

  const series: BESSSimResult[] = [];
  let economiaKWh = 0;

  // Gerção Solar Sintética (Bell Curve simplificada)
  // Total dia = solarKWp * hspCity
  const solarPerHour = (h: number) => {
    if (h < 6 || h > 18) return 0;
    // Função seno para distribuir HSP ao longo das 12h de sol
    const peak = (solarKWp * hspCity) / 7.6; // 7.6 é aprox integral de sen(x)*12h
    return peak * Math.sin((Math.PI * (h - 6)) / 12);
  };

  for (let h = 0; h < 24; h++) {
    const gen = solarPerHour(h);
    const cons = curvaConsumo.find(c => c.hora === h)?.kw || 0;
    const posto = curvaConsumo.find(c => c.hora === h)?.posto || 'HFP';
    const isHFP = posto === 'HFP' || posto === 'HR';

    let potBat = 0;
    let net = gen - cons;

    // Lógica de CARGA
    if (net > 0 || (isHFP && (estratégia === 'HYBRID' || estratégia === 'ARBITRAGE'))) {
      let chargeLimit = 0;
      
      if (net > 0) {
        // Carga com excedente solar
        chargeLimit = net;
      } else if (isHFP && (estratégia === 'HYBRID' || estratégia === 'ARBITRAGE')) {
        // Carga da rede (se habilitado)
        chargeLimit = potenciaInversorKW; 
      }

      const canChargeKWh = ((100 - currentSoC) / 100) * capacidadeKWh / efChg;
      const actualChgKWh = Math.min(chargeLimit, potenciaInversorKW, canChargeKWh);
      
      potBat = actualChgKWh;
      currentSoC += (actualChgKWh * efChg / capacidadeKWh) * 100;
      if (currentSoC > 100) currentSoC = 100;
    } 
    // Lógica de DESCARGA
    else if (net < 0) {
      // Prioridade: Cobrir déficit solar (Auto-consumo) 
      // e opcionalmente Peak Shaving (se implementado aqui)
      const canDischargeKWh = ((currentSoC - socMin) / 100) * capacidadeKWh * efDis;
      const actualDisKWh = Math.min(Math.abs(net), potenciaInversorKW, canDischargeKWh);

      potBat = -actualDisKWh;
      currentSoC -= (actualDisKWh / efDis / capacidadeKWh) * 100;
      if (currentSoC < socMin) currentSoC = socMin;
      
      economiaKWh += actualDisKWh;
    }

    const consFinal = Math.max(0, cons - gen + potBat);

    series.push({
      hora: h,
      geracaoSolar: parseFloat(gen.toFixed(2)),
      consumoOriginal: parseFloat(cons.toFixed(2)),
      consumoComBESS: parseFloat(consFinal.toFixed(2)),
      potenciaBateria: parseFloat(potBat.toFixed(2)),
      soc: parseFloat(currentSoC.toFixed(1)),
      posto
    });
  }

  // Autonomia: Horas de descarga se houver queda de energia com consumo médio
  const mediaCons = series.reduce((acc, s) => acc + s.consumoOriginal, 0) / 24;
  const autonomia = (capUtilKWh * efDis) / (mediaCons || 1);

  return { series, economiaKWh, autonomiaHoras: parseFloat(autonomia.toFixed(1)) };
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

  let vpl = -investimento;
  for (let ano = 1; ano <= vidaUtilAnos; ano++) {
    vpl += economiaAnual / Math.pow(1 + taxaDescontoAnual, ano);
  }

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
