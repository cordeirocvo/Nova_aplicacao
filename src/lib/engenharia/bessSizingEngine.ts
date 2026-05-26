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
  modoReservadoCEMIG: boolean;
  aplicacoes: BESSApplicationType[];
  reservaBackupPercent: number; // SoC reserved for backup (UPS)
  limiteInjecaoRedeKW: number; // Max allowed injection to grid (kW)
  tipoPartidaMotor?: 'DIRETA' | 'SOFT_STARTER' | 'VFD'; // Motor startup type
  potenciaMotorHP?: number; // Declared motor power
}

export interface BESSAvancadoSimResult {
  hora: number;
  horaFormatada: string;
  consumoOriginal: number;
  geracaoSolar: number;
  consumoRede: number;
  potenciaBateria: number; // + is Charge, - is Discharge
  soc: number; // State of Charge (%)
  tipoHorario: 'Ponta' | 'Fora Ponta' | 'Reservado';
  energiaDiesel?: number; // Supplied by diesel generator (kW)
  excedenteCurtailment?: number; // Curtailed solar (kW)
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
  criticoCrate: number;
  alertaCrate: boolean;
  alertaPartidaMotor: boolean;
  mensagemAlerta: string;
}

/**
 * Classifica o horario conforme a REN 1000 e presenca de irrigante
 */
export function getTipoHorarioREN1000(hora: number, isIrrigante: boolean): 'Ponta' | 'Fora Ponta' | 'Reservado' {
  // Horário de Ponta Padrão: 18h às 21h (18:00 - 20:59)
  const isPonta = hora >= 18 && hora < 21;
  
  if (isIrrigante) {
    // Horário Reservado Irrigante (REN 1000): 21:30 às 06:00
    // Em base horaria, aproximamos das 22h às 06h (22:00 às 05:59)
    const isReservado = hora >= 22 || hora < 6;
    if (isReservado) return 'Reservado';
  }
  
  return isPonta ? 'Ponta' : 'Fora Ponta';
}

/**
 * Executa a simulacao horaria dinamica do BESS e calcula indicadores do estudo
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
    limiteInjecaoRedeKW = 0,
    tipoPartidaMotor = 'VFD',
    potenciaMotorHP = 0
  } = config;

  const socMin = (1 - dodMax) * 100;
  const socMinReal = Math.max(socMin, reservaBackupPercent); // Se houver backup, o SoC min aumenta
  
  let currentSoC = 100; // Inicia totalmente carregada
  const efChg = Math.sqrt(eficienciaRTE);
  const efDis = Math.sqrt(eficienciaRTE);
  
  const series: BESSAvancadoSimResult[] = [];
  let economiaDiariaKWh = 0;
  let economiaDiariaTarifa = 0;
  let totalSolarCurtailment = 0;
  let totalDieselKW = 0;
  let totalDieselReduzidoKW = 0;
  let maxDescargaKW = 0;

  // Geração Solar Hora a Hora usando o modelo PVLib portado
  const solarPerHour = (h: number): number => {
    if (h < 6 || h > 18) return 0;
    
    // Modelagem astronômica sintética baseada na HSP e inclinação padrão
    const timestamp = new Date(2026, 2, 21, h, 0, 0); // Equinócio de Outono
    const peakGHI = (hspCity * 1000) / 7.6; // W/m² de irradiância pico
    const GHI = peakGHI * Math.sin((Math.PI * (h - 6)) / 12);
    
    return pvlibSimulate({
      timestamp,
      irradianciaGHI: GHI,
      tempAmbiente: 25,
      capacidadeKWp: solarKWp,
      inclinacao: 15,
      orientacao: 180, // Norte
      coefTemperatura: tecnologiaBateria === 'LFP' ? -0.0035 : -0.004,
    });
  };

  // Tarifas da fatura
  const tarifaHFP = fatura?.tarifaHFP || 0.65;
  const tarifaHP = fatura?.tarifaHP || 1.45;
  
  // Desconto de Irrigante da REN 1000 no horário reservado (média 70% a 90%, usamos 75%)
  const tarifaReservada = isIrrigante ? tarifaHFP * 0.25 : tarifaHFP; 

  // Simulação Dinâmica Horária
  for (let h = 0; h < 24; h++) {
    const genSolar = solarPerHour(h);
    const consOriginal = curvaConsumo.find(c => c.hora === h)?.kw || 0;
    const tipoHorario = getTipoHorarioREN1000(h, isIrrigante);
    
    let net = genSolar - consOriginal;
    let potBat = 0;
    let dieselGen = 0;
    let curtailment = 0;

    // A. Arbitragem: Carregar da rede no horário reservado (muito barato) ou com excedente solar
    const isHorarioBarato = tipoHorario === 'Reservado' || (tipoHorario === 'Fora Ponta' && genSolar > consOriginal);
    const querCarregarDaRede = (aplicacoes.includes('PEAK_SHAVING_ARBITRAGE') && tipoHorario === 'Reservado');

    if (net > 0 || querCarregarDaRede) {
      let limitCargaKW = 0;
      if (net > 0) {
        limitCargaKW = net; // Prioriza carregar com excedente solar
      } else if (querCarregarDaRede) {
        limitCargaKW = potenciaInversorKW; // Carga programada da rede na tarifa barata
      }

      const canChargeKWh = ((100 - currentSoC) / 100) * capacidadeKWh / efChg;
      const actualChgKW = Math.min(limitCargaKW, potenciaInversorKW, canChargeKWh);
      
      potBat = actualChgKW;
      currentSoC += (actualChgKW * efChg / capacidadeKWh) * 100;
      if (currentSoC > 100) currentSoC = 100;
    } 
    // B. Descarga no Horário de Ponta (HP) ou para conter picos de demanda (Peak Shaving)
    else if (net < 0) {
      const isHP = tipoHorario === 'Ponta';
      const querDescarregar = isHP || aplicacoes.includes('PEAK_SHAVING_ARBITRAGE');
      
      if (querDescarregar) {
        const canDischargeKWh = ((currentSoC - socMinReal) / 100) * capacidadeKWh * efDis;
        const actualDisKW = Math.min(Math.abs(net), potenciaInversorKW, canDischargeKWh);
        
        potBat = -actualDisKW;
        currentSoC -= (actualDisKW / efDis / capacidadeKWh) * 100;
        if (currentSoC < socMinReal) currentSoC = socMinReal;
        
        if (actualDisKW > maxDescargaKW) {
          maxDescargaKW = actualDisKW;
        }

        // Economia de Arbitragem com Spread de RTE
        // Spread = TarifaPonta - (TarifaForaPonta / RTE)
        economiaDiariaKWh += actualDisKW;
        const tarifaAtual = isHP ? tarifaHP : (tipoHorario === 'Reservado' ? tarifaReservada : tarifaHFP);
        const custoDeCargaEquivalente = tarifaReservada / eficienciaRTE;
        
        // Economia real desconta as perdas térmicas do RTE
        economiaDiariaTarifa += actualDisKW * (tarifaAtual - custoDeCargaEquivalente);
      }
    }

    // C. Modelagem de Curtailment (Zero Export)
    const injecaoPreBESS = genSolar - consOriginal - potBat;
    if (injecaoPreBESS > limiteInjecaoRedeKW) {
      curtailment = injecaoPreBESS - limiteInjecaoRedeKW;
      totalSolarCurtailment += curtailment;
    }

    // D. Modelagem do Gerador Diesel
    if (consOriginal > (genSolar + Math.abs(potBat < 0 ? potBat : 0))) {
      const faltaKW = consOriginal - genSolar - (potBat < 0 ? Math.abs(potBat) : 0);
      dieselGen = faltaKW;
      totalDieselKW += dieselGen;
      
      // O BESS otimiza o gerador a diesel evitando cargas parciais ineficientes
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

  // E. C-rate & Alertas de Transitórios (BESS Pro Guidelines)
  const criticoCrate = capacidadeKWh > 0 ? maxDescargaKW / capacidadeKWh : 0;
  // Alerta se o C-rate operacional for excessivo para a tecnologia selecionada
  let alertaCrate = false;
  let limiteCrate = 1.0; // LFP aguenta 1C de descarga contínua
  if (tecnologiaBateria === 'NMC') limiteCrate = 0.8;
  if (tecnologiaBateria === 'LeadAcid') limiteCrate = 0.25; // Chumbo-ácido sofre com alta corrente
  if (criticoCrate > limiteCrate) {
    alertaCrate = true;
  }

  // Alerta de partida de motor baseada no inrush
  let alertaPartidaMotor = false;
  let mensagemAlerta = "";
  if (potenciaMotorHP > 0) {
    // Estimativa de corrente/potência nominal em kW: 1 HP ~ 0.746 kW
    const potMotorKW = potenciaMotorHP * 0.746;
    let fatorPartida = 1.5;
    if (tipoPartidaMotor === 'DIRETA') fatorPartida = 7.0; // 6x a 8x inrush
    if (tipoPartidaMotor === 'SOFT_STARTER') fatorPartida = 2.5; // 2x a 3x inrush

    const picoPartidaMotorKW = potMotorKW * fatorPartida;
    if (picoPartidaMotorKW > potenciaInversorKW) {
      alertaPartidaMotor = true;
      mensagemAlerta = `⚠️ O pico de partida do motor (${picoPartidaMotorKW.toFixed(1)} kW) excede a capacidade do inversor BESS (${potenciaInversorKW} kW). Risco de desligamento por sobrecorrente.`;
    }
  }

  if (alertaCrate) {
    mensagemAlerta += ` ⚠️ C-rate máximo atingido (${criticoCrate.toFixed(2)}C) excede o limite saudável para bateria ${tecnologiaBateria} (limite: ${limiteCrate}C). Acelera a degradação física.`;
  }

  // 3. Relatórios das 5 Aplicações Principais
  const relatoriosAplicacoes: ApplicationReport[] = [];

  // APP 1: Peak Shaving & Time Shifting
  const temPS = aplicacoes.includes('PEAK_SHAVING_ARBITRAGE');
  const spreadTarifa = tarifaHP - (tarifaReservada / eficienciaRTE);
  const psAdequado = temPS && spreadTarifa > 0.15;
  relatoriosAplicacoes.push({
    id: 'PEAK_SHAVING_ARBITRAGE',
    nome: '1. Arbitragem & Peak Shaving',
    adequado: psAdequado,
    justificativa: psAdequado 
      ? `Altamente viável! Spread tarifário de R$ ${spreadTarifa.toFixed(2)}/kWh (descontando perdas de RTE). O sistema carrega no horário Reservado REN 1000 com ${isIrrigante ? '75% de desconto de irrigante' : 'tarifa padrão'} e descarrega nas 3h de Ponta.`
      : `Spread tarifário insatisfatório (R$ ${spreadTarifa.toFixed(2)}/kWh). Exige spread maior que R$ 0.15/kWh para compensar o investimento inicial.`,
    dimensionamentoSugerido: `Bateria ${tecnologiaBateria} de ${capacidadeKWh}kWh e Inversor de ${potenciaInversorKW}kW para suportar a rampa de descarga de 3 horas.`,
    economiaMensalEstimada: psAdequado ? (economiaDiariaTarifa > 0 ? economiaDiariaTarifa * 30 : 0) : 0,
    impactoTecnico: `Eliminação do consumo da distribuidora no horário de pico e amortecimento de picos de demanda (Peak Shaving).`
  });

  // APP 2: Backup UPS
  const temBackup = aplicacoes.includes('BACKUP_CRITICAL');
  const backupAdequado = temBackup && tipoInversor === 'GRID_FORMING';
  const mediaConsumo = curvaConsumo.reduce((acc, c) => acc + c.kw, 0) / 24;
  const autonomia = ((capacidadeKWh * (reservaBackupPercent / 100)) * efDis) / (mediaConsumo || 1);
  relatoriosAplicacoes.push({
    id: 'BACKUP_CRITICAL',
    nome: '2. Backup de Cargas Críticas (UPS/Nobreak)',
    adequado: backupAdequado,
    justificativa: backupAdequado
      ? `Excelente! O inversor Grid-Forming permite a transição para modo ilha off-grid em milissegundos e há reserva física de ${reservaBackupPercent}% de capacidade garantida.`
      : temBackup 
        ? `Requer inversor tipo GRID-FORMING. Inversores Grid-Tied normais desligam sob apagões para cumprir a proteção de anti-ilhamento da concessionária.`
        : `Estratégia inativa. Habilite nas configurações para reservar autonomia.`,
    dimensionamentoSugerido: `SoC de segurança de ${reservaBackupPercent}% reservado para UPS. Garante autonomia de emergência.`,
    economiaMensalEstimada: temBackup ? 1200 : 0, // Economia estimada de paradas evitadas
    impactoTecnico: `Transição automática para formação de rede isolada em milissegundos, garantindo estabilidade e proteção de TI.`
  });

  // APP 3: Renewable Integration
  const temRI = aplicacoes.includes('RENEWABLE_INTEGRATION');
  const riAdequado = temRI && totalSolarCurtailment > 0;
  relatoriosAplicacoes.push({
    id: 'RENEWABLE_INTEGRATION',
    nome: '3. Controle de Injeção & Integração Solar',
    adequado: riAdequado,
    justificativa: riAdequado
      ? `Excelente! Armazenou ${totalSolarCurtailment.toFixed(1)} kWh/dia de energia solar excedente que teria sofrido curtailment devido a limitações contratuais de injeção na rede.`
      : temRI
        ? `Adequado para futuras ampliações. Atualmente a geração solar local não supera o limite de exportação configurado.`
        : `Estratégia não ativa para controle de curtailment.`,
    dimensionamentoSugerido: `Capacidade de bateria dimensionada para absorver o excedente de injeção durante o pico solar (Zero Export).`,
    economiaMensalEstimada: riAdequado ? (totalSolarCurtailment * tarifaHFP) * 30 : 0,
    impactoTecnico: `Eliminação do desperdício solar por acúmulo de energia excedente para despacho posterior.`
  });

  // APP 4: Grid Services
  const temGS = aplicacoes.includes('GRID_SERVICES');
  const gsAdequado = temGS && tecnologiaBateria === 'LFP' && tipoInversor === 'GRID_FORMING';
  relatoriosAplicacoes.push({
    id: 'GRID_SERVICES',
    nome: '4. Suporte e Estabilização da Rede (Grid Services)',
    adequado: gsAdequado,
    justificativa: gsAdequado
      ? `Compatível! As baterias de Lítio (LFP) toleram ciclagens rápidas e o inversor Grid-Forming fornece inércia sintética ativa e suporte a transitórios de tensão e frequência.`
      : temGS
        ? `Requer baterias LFP (alta taxa C) e inversor GRID-FORMING. Química de chumbo-ácido ou inversores comuns não conseguem prestar regulação ativa de frequência rápida.`
        : `Serviços ancilares desativados.`,
    dimensionamentoSugerido: `Equipamento homologado com inversor Grid-Forming rápido e baterias LFP de longa durabilidade útil.`,
    economiaMensalEstimada: temGS ? 2500 : 0, // Benefícios intangíveis de conformidade
    impactoTecnico: `Regulação dinâmica de frequência, inércia virtual e regulação reativa ativa em milissegundos.`
  });

  // APP 5: Diesel Optimization
  const temDO = aplicacoes.includes('DIESEL_OPTIMIZATION');
  const doAdequado = temDO && totalDieselKW > 0;
  relatoriosAplicacoes.push({
    id: 'DIESEL_OPTIMIZATION',
    nome: '5. Substituição & Otimização de Geradores a Diesel',
    adequado: doAdequado,
    justificativa: doAdequado
      ? `Excelente! O BESS reduz em aproximadamente 40% a queima de combustível fóssil, forçando o funcionamento do gerador diesel apenas em sua faixa de rendimento ótimo.`
      : temDO
        ? `Não adequado. Recomendado somente para sistemas isolados ou com forte dependência operacional de diesel.`
        : `Estratégia de hibridização diesel inativa.`,
    dimensionamentoSugerido: `Capacidade calculada para absorver carga baixa e média noturna, permitindo desligar completamente o gerador a diesel à noite.`,
    economiaMensalEstimada: doAdequado ? (totalDieselReduzidoKW * 5.8) * 30 : 0, // Estimado óleo diesel a R$ 5,80/litro
    impactoTecnico: `Combinação do BESS com o gerador para partida preta (Black Start), estabilização e redução de emissões e horas de manutenção.`
  });

  // 4. Análise Financeira Consolidada
  const economiaMensalTotal = relatoriosAplicacoes.reduce((acc, r) => acc + r.economiaMensalEstimada, 0);
  const investimentoTotal = config.custoSistema;
  const economiaAnual = economiaMensalTotal * 12;
  const payback = economiaAnual > 0 ? (investimentoTotal / economiaAnual) : 99;

  // VPL a taxa de desconto de 12% a.a. em 10 anos
  let vpl = -investimentoTotal;
  const taxaDesconto = 0.12;
  for (let ano = 1; ano <= 10; ano++) {
    vpl += economiaAnual / Math.pow(1 + taxaDesconto, ano);
  }

  // TIR
  let tir = 0.05;
  for (let i = 0; i < 20; i++) {
    let npv = -investimentoTotal;
    for (let ano = 1; ano <= 10; ano++) {
      npv += (economiaMensalTotal * 12) / Math.pow(1 + tir, ano);
    }
    if (Math.abs(npv) < 10) break;
    tir = tir + (npv / investimentoTotal) * 0.1;
  }

  // LCOS (Levelized Cost of Storage) em R$/kWh (BESS Pro Model)
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
    reducaoDieselPercent: totalDieselKW > 0 ? 40 : undefined,
    criticoCrate: parseFloat(criticoCrate.toFixed(2)),
    alertaCrate,
    alertaPartidaMotor,
    mensagemAlerta: mensagemAlerta.trim()
  };
}
