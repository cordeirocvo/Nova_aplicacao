import { pvlibSimulate } from "./solarEngine";

export type BESSApplicationType = 
  | 'PEAK_SHAVING_ARBITRAGE' 
  | 'BACKUP_CRITICAL' 
  | 'RENEWABLE_INTEGRATION' 
  | 'GRID_SERVICES' 
  | 'DIESEL_OPTIMIZATION';

export interface BESSAvancadoConfig {
  capacidadeKWh: number;
  potenciaInversorKW: number;
  dodMax: number;
  eficienciaRTE: number;
  tecnologiaBateria: 'LFP' | 'NMC' | 'LeadAcid';
  tipoInversor: 'HYBRID' | 'GRID_FORMING' | 'GRID_TIED';
  custoSistema: number;
  isIrrigante: boolean;
  modoReservadoCEMIG: boolean; // REN 1000 reserved hours (21:30 - 06:00)
  aplicacoes: BESSApplicationType[];
  reservaBackupPercent: number; // Porcentagem de capacidade reservada para UPS (ex: 20%)
  limiteInjecaoRedeKW: number; // Limite de injeção da concessionária
}

export interface BESSAvancadoSimResult {
  hora: number;
  horaFormatada: string;
  consumoOriginal: number;
  geracaoSolar: number;
  consumoRede: number;
  potenciaBateria: number; // + Carga, - Descarga
  soc: number; // %
  tipoHorario: 'Ponta' | 'Fora Ponta' | 'Reservado';
  energiaDiesel?: number; // Se houver simulação de gerador diesel
  excedenteCurtailment?: number; // Energia solar perdida se não houver BESS
}

export interface ApplicationReport {
  id: BESSApplicationType;
  nome: string;
  adequado: boolean;
  justificativa: string;
  dimensionamentoSugerido: string;
  economiaMensalEstimada: number;
  impactoTecnico: string;
}

export interface BESSAvancadoEstudoResult {
  series: BESSAvancadoSimResult[];
  relatoriosAplicacoes: ApplicationReport[];
  economiaMensalTotal: number;
  paybackAnos: number;
  vpl: number;
  tir: number;
  lcos: number;
  autonomiaBackupHoras: number;
  reducaoDieselPercent?: number;
}

/**
 * Retorna o tipo de horário de acordo com a REN 1000 e presença de irrigante
 */
export function getTipoHorarioREN1000(hora: number, isIrrigante: boolean): 'Ponta' | 'Fora Ponta' | 'Reservado' {
  // Horário de Ponta padrão: 18h às 21h (18:00 - 20:59)
  const isPonta = hora >= 18 && hora < 21;
  
  if (isIrrigante) {
    // Horário Reservado Irrigante (REN 1000): 21:30 às 06:00
    // Em base horária, aproximamos de 22h às 06h (22:00 - 05:59)
    const isReservado = hora >= 22 || hora < 6;
    if (isReservado) return 'Reservado';
  }
  
  return isPonta ? 'Ponta' : 'Fora Ponta';
}

/**
 * Executa a simulação avançada de BESS de ponta a ponta
 */
export function simularBESSAvancado(
  curvaConsumo: Array<{ hora: number; kw: number }>,
  solarKWp: number,
  hspCity: number,
  config: BESSAvancadoConfig,
  fatura: any
): BESSAvancadoEstudoResult {
  const { 
    capacidadeKWh, 
    potenciaInversorKW, 
    dodMax, 
    eficienciaRTE, 
    tecnologiaBateria, 
    tipoInversor, 
    isIrrigante, 
    aplicacoes, 
    reservaBackupPercent = 20,
    limiteInjecaoRedeKW = 0
  } = config;

  const socMin = (1 - dodMax) * 100;
  const socMinReal = Math.max(socMin, reservaBackupPercent); // Se houver backup crítico, o SoC mínimo aumenta
  
  let currentSoC = 100; // Inicia o dia totalmente carregado
  const efChg = Math.sqrt(eficienciaRTE);
  const efDis = Math.sqrt(eficienciaRTE);
  
  const series: BESSAvancadoSimResult[] = [];
  let economiaDiariaKWh = 0;
  let economiaDiariaTarifa = 0;
  let totalSolarCurtailment = 0;
  let totalDieselKW = 0;
  let totalDieselReduzidoKW = 0;

  // 1. Simulação Solar de Alta Precisão usando o Modelo PVLIB portado
  const solarPerHour = (h: number): number => {
    if (h < 6 || h > 18) return 0;
    
    // Modelagem astronômica sintética baseada na HSP e inclinação padrão
    const timestamp = new Date(2026, 2, 21, h, 0, 0); // Equinócio médio
    
    // Estima irradiância GHI a partir do pico da curva senoidal da HSP local
    const peakGHI = (hspCity * 1000) / 7.6; // W/m² peak
    const GHI = peakGHI * Math.sin((Math.PI * (h - 6)) / 12);
    
    return pvlibSimulate({
      timestamp,
      irradianciaGHI: GHI,
      tempAmbiente: 25, // Temperatura ambiente média nacional
      capacidadeKWp: solarKWp,
      inclinacao: 15, // Inclinação ótima brasileira
      orientacao: 180, // Norte
      coefTemperatura: tecnologiaBateria === 'LFP' ? -0.0035 : -0.004, // Coeficiente térmico por tecnologia
    });
  };

  // Tarifas para economia financeira
  const tarifaHFP = fatura?.tarifaHFP || 0.65;
  const tarifaHP = fatura?.tarifaHP || 1.45;
  // Irrigantes têm desconto pesado na tarifa durante o horário reservado (até 70% a 90% na TUSD/TE)
  const tarifaReservada = isIrrigante ? tarifaHFP * 0.25 : tarifaHFP; // Desconto médio de 75% na tarifa do irrigante

  // 2. Simulação Dinâmica de Fluxo de Energia hora por hora
  for (let h = 0; h < 24; h++) {
    const genSolar = solarPerHour(h);
    const consOriginal = curvaConsumo.find(c => c.hora === h)?.kw || 0;
    const tipoHorario = getTipoHorarioREN1000(h, isIrrigante);
    
    let net = genSolar - consOriginal;
    let potBat = 0;
    let dieselGen = 0;
    let curtailment = 0;

    // A. Arbitragem e Carga com Excedente ou Tarifas Baratas (Time-Shifting)
    // Carga é otimizada se houver "Arbitragem" e estivermos no Horário Reservado (extremamente barato) ou Fora de Ponta com sol
    const isTarifaBarata = tipoHorario === 'Reservado' || (tipoHorario === 'Fora Ponta' && genSolar > consOriginal);
    const querCarregarDaRede = (aplicacoes.includes('PEAK_SHAVING_ARBITRAGE') && tipoHorario === 'Reservado');
    
    if (net > 0 || querCarregarDaRede) {
      let limitCargaKW = 0;
      if (net > 0) {
        limitCargaKW = net; // Carga prioritária com excedente solar
      } else if (querCarregarDaRede) {
        limitCargaKW = potenciaInversorKW; // Carga da rede na tarifa reservada super barata
      }

      const canChargeKWh = ((100 - currentSoC) / 100) * capacidadeKWh / efChg;
      const actualChgKW = Math.min(limitCargaKW, potenciaInversorKW, canChargeKWh);
      
      potBat = actualChgKW;
      currentSoC += (actualChgKW * efChg / capacidadeKWh) * 100;
      if (currentSoC > 100) currentSoC = 100;
    } 
    // B. Descarga no Horário de Ponta (Evitar consumo caro) ou Déficit Solar
    else if (net < 0) {
      const querDescarregar = tipoHorario === 'Ponta' || aplicacoes.includes('PEAK_SHAVING_ARBITRAGE');
      
      if (querDescarregar) {
        const canDischargeKWh = ((currentSoC - socMinReal) / 100) * capacidadeKWh * efDis;
        const actualDisKW = Math.min(Math.abs(net), potenciaInversorKW, canDischargeKWh);
        
        potBat = -actualDisKW;
        currentSoC -= (actualDisKW / efDis / capacidadeKWh) * 100;
        if (currentSoC < socMinReal) currentSoC = socMinReal;
        
        economiaDiariaKWh += actualDisKW;
        
        // Calcula ganho financeiro direto baseado na tarifa correspondente
        const tarifaAtual = tipoHorario === 'Ponta' ? tarifaHP : (tipoHorario === 'Reservado' ? tarifaReservada : tarifaHFP);
        economiaDiariaTarifa += actualDisKW * tarifaAtual;
      }
    }

    // C. Modelagem do Backup e UPS
    // Se ativado BACKUP, mantemos a energia reservada intocável (já garantida por socMinReal)
    
    // D. Modelagem do Zero Export / Curtailment (Renewable Integration)
    // Se a injeção na rede exceder o limite permitido pela concessionária:
    const injecaoPreBESS = genSolar - consOriginal - potBat;
    if (injecaoPreBESS > limiteInjecaoRedeKW) {
      curtailment = injecaoPreBESS - limiteInjecaoRedeKW;
      totalSolarCurtailment += curtailment;
    }

    // E. Modelagem do Gerador Diesel (Diesel Optimization)
    // Em sistemas híbridos, se houver falta de solar + bateria, o gerador a diesel liga
    if (consOriginal > (genSolar + Math.abs(potBat < 0 ? potBat : 0))) {
      const faltaKW = consOriginal - genSolar - (potBat < 0 ? Math.abs(potBat) : 0);
      dieselGen = faltaKW;
      totalDieselKW += dieselGen;
      
      // O BESS otimiza o diesel evitando que ele funcione em carga parcial
      // Se houvesse BESS adequado, ele evitaria cerca de 30% a 50% de funcionamento do diesel
      totalDieselReduzidoKW += dieselGen * 0.4; 
    }

    const consFinal = Math.max(0, consOriginal - genSolar + potBat);

    series.push({
      hora: h,
      horaFormatada: `${String(h).padStart(2, '0')}:00`,
      consumoOriginal: parseFloat(consOriginal.toFixed(2)),
      geracaoSolar: parseFloat(genSolar.toFixed(2)),
      consumoRede: parseFloat(consFinal.toFixed(2)),
      potenciaBateria: parseFloat(potBat.toFixed(2)),
      soc: parseFloat(currentSoC.toFixed(1)),
      tipoHorario,
      energiaDiesel: dieselGen > 0 ? parseFloat(dieselGen.toFixed(2)) : undefined,
      excedenteCurtailment: curtailment > 0 ? parseFloat(curtailment.toFixed(2)) : undefined
    });
  }

  // 3. Relatórios detalhados para as 5 aplicações requisitadas
  const relatoriosAplicacoes: ApplicationReport[] = [];

  // APP 1: Peak Shaving e Arbitragem
  const temPS = aplicacoes.includes('PEAK_SHAVING_ARBITRAGE');
  const difTarifa = tarifaHP - (tarifaReservada / eficienciaRTE);
  const psAdequado = temPS && difTarifa > 0.15;
  relatoriosAplicacoes.push({
    id: 'PEAK_SHAVING_ARBITRAGE',
    nome: '1. Arbitragem de Energia & Peak Shaving',
    adequado: psAdequado,
    justificativa: psAdequado 
      ? `Extremamente viável! Spread tarifário de R$ ${difTarifa.toFixed(2)}/kWh entre Ponta e Reservado. O sistema carregará na tarifa ultra barata do irrigante (REN 1000) e descarregará na Ponta.`
      : `Pouco atrativo financeiramente devido ao baixo spread tarifário ou ausência de tarifa horária configurada.`,
    dimensionamentoSugerido: `Bateria LFP de ${capacidadeKWh}kWh com inversor híbrido de ${potenciaInversorKW}kW (suporta descarga contínua durante as 3h de Ponta).`,
    economiaMensalEstimada: psAdequado ? economiaDiariaTarifa * 30 : 0,
    impactoTecnico: `Deslocamento de carga do horário de pico (18h-21h) reduzindo a demanda contratada e a fatura de energia.`
  });

  // APP 2: Backup
  const temBackup = aplicacoes.includes('BACKUP_CRITICAL');
  const backupAdequado = temBackup && tipoInversor === 'GRID_FORMING';
  const mediaConsumo = curvaConsumo.reduce((acc, c) => acc + c.kw, 0) / 24;
  const autonomia = ((capacidadeKWh * (reservaBackupPercent / 100)) * efDis) / (mediaConsumo || 1);
  relatoriosAplicacoes.push({
    id: 'BACKUP_CRITICAL',
    nome: '2. Backup de Cargas Críticas (UPS/Nobreak)',
    adequado: backupAdequado,
    justificativa: backupAdequado
      ? `Totalmente adequado! O inversor GRID-FORMING configurado permite isolar a instalação e fornecer rede de referência em milissegundos caso haja apagão.`
      : temBackup 
        ? `Atenção: Requer inversor tipo GRID-FORMING ou Multimode para operar como UPS off-grid em quedas de energia. Inversores convencionais Grid-Tied desligam por segurança (anti-ilhamento).`
        : `Não selecionado, mas tecnicamente viável caso haja interesse em segurança de rede.`,
    dimensionamentoSugerido: `Reserva de SoC configurada em ${reservaBackupPercent}%. Garante autonomia contínua em emergências.`,
    economiaMensalEstimada: temBackup ? 1500 : 0, // Estimativa intangível de prejuízos evitados
    impactoTecnico: `Formação de micro-rede (Grid-Forming) com transição rápida e proteção total para equipamentos industriais ou hospitalares.`
  });

  // APP 3: Renewable Integration
  const temRI = aplicacoes.includes('RENEWABLE_INTEGRATION');
  const riAdequado = temRI && totalSolarCurtailment > 0;
  relatoriosAplicacoes.push({
    id: 'RENEWABLE_INTEGRATION',
    nome: '3. Controle de Injeção & Integração Solar',
    adequado: riAdequado,
    justificativa: riAdequado
      ? `Altamente adequado! O sistema evitou o desperdício de ${totalSolarCurtailment.toFixed(1)} kWh/dia de energia solar excedente que a distribuidora não permitiria injetar.`
      : temRI
        ? `Adequado para futuras expansões. Atualmente a geração solar local não excede a capacidade de injeção da concessionária.`
        : `Não selecionado.`,
    dimensionamentoSugerido: `Capacidade de ${capacidadeKWh}kWh dimensionada para armazenar o excesso de geração do meio-dia (Zero Export).`,
    economiaMensalEstimada: riAdequado ? (totalSolarCurtailment * tarifaHFP) * 30 : 0,
    impactoTecnico: `Eliminação do curtailment solar através do armazenamento direto do excedente de energia fotovoltaica.`
  });

  // APP 4: Grid Services
  const temGS = aplicacoes.includes('GRID_SERVICES');
  const gsAdequado = temGS && tecnologiaBateria === 'LFP' && tipoInversor === 'GRID_FORMING';
  relatoriosAplicacoes.push({
    id: 'GRID_SERVICES',
    nome: '4. Suporte e Estabilização da Rede (Grid Services)',
    adequado: gsAdequado,
    justificativa: gsAdequado
      ? `Compatível. A tecnologia de Lítio (LFP) oferece alto número de ciclos rápidos e o inversor fornece inércia sintética ativa para suporte de tensão e regulação de frequência.`
      : temGS
        ? `Requer baterias de Lítio LFP (alta taxa C) e inversor GRID-FORMING. Baterias de chumbo ou inversores Grid-Tied simples não conseguem atuar na estabilização de frequência do grid.`
        : `Não selecionado.`,
    dimensionamentoSugerido: `Baterias LFP de alta performance com inversor com capacidade de Grid-Forming ativo.`,
    economiaMensalEstimada: temGS ? 3000 : 0, // Estimativa de receita de serviços ancilares ou créditos
    impactoTecnico: `Absorção/Injeção de potência reativa e ativa em milissegundos para manter estabilidade da rede interna.`
  });

  // APP 5: Diesel Optimization
  const temDO = aplicacoes.includes('DIESEL_OPTIMIZATION');
  const doAdequado = temDO && totalDieselKW > 0;
  relatoriosAplicacoes.push({
    id: 'DIESEL_OPTIMIZATION',
    nome: '5. Substituição & Otimização de Geradores a Diesel',
    adequado: doAdequado,
    justificativa: doAdequado
      ? `Excelente viabilidade! O BESS atuará reduzindo o consumo de óleo diesel do gerador em aproximadamente 40%, evitando operação em baixas cargas (ineficiente).`
      : temDO
        ? `Sistema não isolado. Recomendado apenas para redes em locais remotos ou indústrias que usem geradores a diesel frequentemente.`
        : `Não selecionado.`,
    dimensionamentoSugerido: `Capacidade dimensionada para cobrir a base de consumo noturno, permitindo desligar completamente o gerador a diesel à noite.`,
    economiaMensalEstimada: doAdequado ? (totalDieselReduzidoKW * 5.8) * 30 : 0, // Diesel estimado a R$ 5,80/L
    impactoTecnico: `Operação em paralelo com gerador a diesel, maximizando a eficiência de queima do motor e reduzindo emissões e horas de manutenção.`
  });

  // 4. Indicadores Financeiros Totais do Estudo
  const economiaMensalTotal = relatoriosAplicacoes.reduce((acc, r) => acc + r.economiaMensalEstimada, 0);
  const investimentoTotal = config.custoSistema;
  const economiaAnual = economiaMensalTotal * 12;
  const payback = economiaAnual > 0 ? (investimentoTotal / economiaAnual) : 99;

  let vpl = -investimentoTotal;
  const taxaDesconto = 0.12; // 12% a.a.
  for (let ano = 1; ano <= 10; ano++) {
    vpl += (economiaMensalTotal * 12) / Math.pow(1 + taxaDesconto, ano);
  }

  let tir = 0.05;
  for (let i = 0; i < 20; i++) {
    let npv = -investimentoTotal;
    for (let ano = 1; ano <= 10; ano++) {
      npv += (economiaMensalTotal * 12) / Math.pow(1 + tir, ano);
    }
    if (Math.abs(npv) < 10) break;
    tir = tir + (npv / investimentoTotal) * 0.1;
  }

  // LCOS (Levelized Cost of Storage) em R$/kWh
  const energiaCicloAnual = economiaDiariaKWh * 365;
  let somaEnergiaDescontada = 0;
  for (let ano = 1; ano <= 10; ano++) {
    somaEnergiaDescontada += energiaCicloAnual / Math.pow(1 + taxaDesconto, ano);
  }
  const lcos = somaEnergiaDescontada > 0 ? (investimentoTotal / somaEnergiaDescontada) : 0;

  return {
    series,
    relatoriosAplicacoes,
    economiaMensalTotal: parseFloat(economiaMensalTotal.toFixed(2)),
    paybackAnos: parseFloat(payback.toFixed(1)),
    vpl: parseFloat(vpl.toFixed(2)),
    tir: parseFloat((tir * 100).toFixed(2)),
    lcos: parseFloat(lcos.toFixed(2)),
    autonomiaBackupHoras: parseFloat(autonomia.toFixed(1)),
    reducaoDieselPercent: totalDieselKW > 0 ? 40 : undefined
  };
}
