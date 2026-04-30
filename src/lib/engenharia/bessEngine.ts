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
  lcos?: number; // Levelized Cost of Storage (R$/kWh)
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
  energiaDescarregadaDiariaKWh: number = 0,
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

  // Cálculo do LCOS (Levelized Cost of Storage)
  // LCOS Simplificado = Investimento / Somatório(Energia Descarregada Descontada)
  let lcos = 0;
  if (energiaDescarregadaDiariaKWh > 0) {
     const energiaAnual = energiaDescarregadaDiariaKWh * 365;
     let energiaDescontadaTotal = 0;
     for (let ano = 1; ano <= vidaUtilAnos; ano++) {
        energiaDescontadaTotal += energiaAnual / Math.pow(1 + taxaDescontoAnual, ano);
     }
     lcos = investimento / energiaDescontadaTotal;
  }

  return {
    paybackAnos: parseFloat(payback.toFixed(1)),
    vpl: parseFloat(vpl.toFixed(2)),
    tir: parseFloat((tir * 100).toFixed(2)),
    economiaMensalEstimada: parseFloat(economiaMensal.toFixed(2)),
    lcos: lcos > 0 ? parseFloat(lcos.toFixed(2)) : undefined
  };
}

/**
 * Simulação BESS de Alta Precisão (Minuto a Minuto - 1440 pontos/dia)
 * Permite capturar transições exatas e limites de potência na ordem de minutos.
 */
export interface BESSMinutoResult {
  minutoDoDia: number; // 0 a 1439
  horaFormatada: string;
  geracaoSolarKW: number;
  consumoOriginalKW: number;
  consumoRedeKW: number;
  potenciaBateriaKW: number; // + Carga, - Descarga
  soc: number; // %
}

export function simularBESSMinutoAMinuto(
  curvaConsumoHoraria: Array<{ hora: number; kw: number }>,
  solarKWp: number,
  hspCity: number,
  config: BESSConfig & { standbyLossesKW?: number }
): { series: BESSMinutoResult[]; energiaInjetadaRedeKWh: number; energiaImportadaRedeKWh: number; ciclosEstimadosDia: number } {
  const { capacidadeKWh, potenciaInversorKW, dodMax, eficienciaRTE, estratégia = 'HYBRID', standbyLossesKW = 0.1 } = config;
  
  const socMin = (1 - dodMax) * 100;
  let currentSoCKWh = (socMin / 100) * capacidadeKWh; 
  if (estratégia === 'ARBITRAGE' || estratégia === 'HYBRID') {
    currentSoCKWh = capacidadeKWh; // Começa o dia em 100% (assumindo carga noturna)
  }

  const efChg = Math.sqrt(eficienciaRTE);
  const efDis = Math.sqrt(eficienciaRTE);

  const series: BESSMinutoResult[] = [];
  let totalInjetadoKWh = 0;
  let totalImportadoKWh = 0;
  let totalDescargakWh = 0; // Para calcular ciclos

  // Helper para curva solar contínua inspirada em Clear Sky (pvlib)
  // Utiliza seno elevado a 1.5 para uma curva mais sino/realista que o seno puro.
  const solarPerMinute = (minuto: number) => {
    const horaDecimal = minuto / 60;
    const nascerSol = 6.0;
    const porDoSol = 18.0;
    if (horaDecimal < nascerSol || horaDecimal > porDoSol) return 0;
    
    // Normaliza o tempo do dia entre 0 e PI
    const tNorm = Math.PI * ((horaDecimal - nascerSol) / (porDoSol - nascerSol));
    
    // Fator de escala para garantir que a integral(G) = hspCity * solarKWp
    // Integral de sin(x)^1.5 de 0 a PI é aprox 1.75.
    // Duração do dia = 12 horas.
    const peakPower = (solarKWp * hspCity * Math.PI) / (12 * 1.75);
    
    return peakPower * Math.pow(Math.sin(tNorm), 1.5);
  };

  // Interpolação Linear de Consumo
  const consumoPerMinute = (minuto: number) => {
    const horaFloor = Math.floor(minuto / 60);
    const horaNext = (horaFloor + 1) % 24;
    const fraction = (minuto % 60) / 60;
    
    const kwA = curvaConsumoHoraria.find(c => c.hora === horaFloor)?.kw || 0;
    const kwB = curvaConsumoHoraria.find(c => c.hora === horaNext)?.kw || kwA; // Assume kwA se não achar o próximo
    
    return kwA + (kwB - kwA) * fraction;
  };

  const deltaHoras = 1 / 60; // 1 minuto em horas

  for (let m = 0; m < 1440; m++) {
    const genKW = solarPerMinute(m);
    const consKW = consumoPerMinute(m);
    const isHFP = m < (17 * 60) || m >= (20 * 60); // Simplificação de Ponta (17h-20h)

    let netKW = genKW - consKW;
    let potBatKW = 0;

    // Carga
    if (netKW > 0 || (isHFP && (estratégia === 'HYBRID' || estratégia === 'ARBITRAGE'))) {
      let chargeLimitKW = 0;
      if (netKW > 0) {
         chargeLimitKW = netKW; // Carrega com excedente solar
      } else if (isHFP && (estratégia === 'HYBRID' || estratégia === 'ARBITRAGE')) {
         chargeLimitKW = potenciaInversorKW; // Carrega da rede no HFP se não estiver cheio
      }

      // Quanto posso carregar fisicamente?
      const capDisponivelKWh = capacidadeKWh - currentSoCKWh;
      const powerLimitToFullKW = (capDisponivelKWh / efChg) / deltaHoras;
      
      // Simulação da Fase CV (Constant Voltage) a partir de 80% de SoC
      let dynamicChargeLimit = potenciaInversorKW;
      const socPerc = currentSoCKWh / capacidadeKWh;
      if (socPerc > 0.8) {
         // Fator de degradação linear: 100% de potência a 80%, reduzindo a 0% a 100% de SoC.
         const throttleFactor = Math.max(0, (1.0 - socPerc) / 0.2);
         dynamicChargeLimit = potenciaInversorKW * throttleFactor;
      }
      
      const actualChgKW = Math.max(0, Math.min(chargeLimitKW, dynamicChargeLimit, powerLimitToFullKW));
      
      potBatKW = actualChgKW;
      currentSoCKWh += actualChgKW * efChg * deltaHoras;
    } 
    // Descarga
    else if (netKW < 0) {
      const deficitKW = Math.abs(netKW);
      
      // Quanto posso descarregar fisicamente?
      const capMinKWh = (socMin / 100) * capacidadeKWh;
      const energyAvailKWh = currentSoCKWh - capMinKWh;
      const powerLimitToEmptyKW = (energyAvailKWh * efDis) / deltaHoras;

      const actualDisKW = Math.max(0, Math.min(deficitKW, potenciaInversorKW, powerLimitToEmptyKW));
      
      potBatKW = -actualDisKW;
      currentSoCKWh -= (actualDisKW / efDis) * deltaHoras;
      totalDescargakWh += (actualDisKW / efDis) * deltaHoras;
    }

    // Calcular o fluxo de rede final (Grid)
    // Consumo Final = ConsumoOriginal - Geracao + PotenciaBateria(Carga=+, Descarga=-)
    const consumoRedeInstKW = consKW - genKW + potBatKW;

    if (consumoRedeInstKW > 0) {
      totalImportadoKWh += consumoRedeInstKW * deltaHoras;
    } else {
      totalInjetadoKWh += Math.abs(consumoRedeInstKW) * deltaHoras;
    }

    // Aplicação de Perdas em Stand-by (IEC 62933) - Auto-consumo eletrônico do Inversor/BMS
    currentSoCKWh = Math.max((socMin / 100) * capacidadeKWh, currentSoCKWh - (standbyLossesKW * deltaHoras));

    // Salvar no array (Downsampling leve no futuro, se necessário. Mas aqui retornamos tudo)
    const hStr = Math.floor(m / 60).toString().padStart(2, '0');
    const mStr = (m % 60).toString().padStart(2, '0');

    series.push({
      minutoDoDia: m,
      horaFormatada: `${hStr}:${mStr}`,
      geracaoSolarKW: Number(genKW.toFixed(2)),
      consumoOriginalKW: Number(consKW.toFixed(2)),
      consumoRedeKW: Number(consumoRedeInstKW.toFixed(2)),
      potenciaBateriaKW: Number(potBatKW.toFixed(2)),
      soc: Number(((currentSoCKWh / capacidadeKWh) * 100).toFixed(2))
    });
  }

  const ciclosEstimadosDia = totalDescargakWh / capacidadeKWh;

  return { 
    series, 
    energiaInjetadaRedeKWh: Number(totalInjetadoKWh.toFixed(2)), 
    energiaImportadaRedeKWh: Number(totalImportadoKWh.toFixed(2)),
    ciclosEstimadosDia: Number(ciclosEstimadosDia.toFixed(2))
  };
}
