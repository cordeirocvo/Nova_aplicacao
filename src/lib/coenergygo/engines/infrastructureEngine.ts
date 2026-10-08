/**
 * CoenergyGO — Motor de Infraestrutura Eletrotécnica para Mobilidade Elétrica
 * Cordeiro Energia
 * 
 * Implementa as diretrizes compulsórias de dimensionamento elétrico:
 * 1. NBR 5410: Instalações elétricas de baixa tensão (Capacidade de condução, queda de tensão e condutor de proteção).
 * 2. ABNT NBR 17019: Alimentação de veículos elétricos (Regime contínuo Fs=1.0, DR Tipo B / RDC-DD 6mA, DPS Classe II).
 * 3. Integração com dados reais de medição (SmartMeter / Analisadores) para balanço de carga do alimentador geral.
 * 4. Dimensionamento físico do Quadro Geral de Baixa Tensão (QGBT / QDC-VE) com barramentos 380V e 220V.
 * 5. Diagnóstico explícito de desarme de disjuntor e parecer técnico de subestação/transformador.
 * 6. Lista de Materiais Quantitativa (BOM) e consolidação com o padrão CEMIG ND-5.1 / ND-5.3.
 */

import {
  ElectricalInfrastructureInput,
  ElectricalInfrastructureSizing,
  BillOfMaterialItem,
  ProtectionDeviceSpec,
  AuxiliaryCircuitsConfig,
  AuxiliaryCircuitItem,
  BreakerTripDiagnosis,
  TransformerRecommendation,
  TransformerSizingDetails,
  TransformerBeforeAfterAnalysis,
  Panel220VSpec,
  Panel380VSpec
} from '../types';

// Resistividade do cobre a 70°C (NBR 5410): ~0.0213 ohm*mm²/m
const COPPER_RESISTIVITY_70C = 0.0213;

// Tabela de capacidade de condução de corrente (A) para condutores de cobre com isolação PVC 70°C
// Métodos B1 (eletroduto em alvenaria), B2 (eletroduto aparente), C (eletrocalha), D (subterrâneo)
interface AmpacityEntry {
  gaugeMM2: number;
  b1_2cond: number;
  b1_3cond: number;
  b2_2cond: number;
  b2_3cond: number;
  c_2cond: number;
  c_3cond: number;
}

const AMPACITY_TABLE_PVC: AmpacityEntry[] = [
  { gaugeMM2: 1.5, b1_2cond: 17.5, b1_3cond: 15.5, b2_2cond: 15.5, b2_3cond: 13.5, c_2cond: 19.5, c_3cond: 17.5 },
  { gaugeMM2: 2.5, b1_2cond: 24, b1_3cond: 21, b2_2cond: 21, b2_3cond: 18.5, c_2cond: 27, c_3cond: 24 },
  { gaugeMM2: 4.0, b1_2cond: 32, b1_3cond: 28, b2_2cond: 28, b2_3cond: 25,   c_2cond: 37, c_3cond: 32 },
  { gaugeMM2: 6.0, b1_2cond: 41, b1_3cond: 36, b2_2cond: 36, b2_3cond: 32,   c_2cond: 48, c_3cond: 41 },
  { gaugeMM2: 10.0, b1_2cond: 57, b1_3cond: 50, b2_2cond: 50, b2_3cond: 44,  c_2cond: 66, c_3cond: 57 },
  { gaugeMM2: 16.0, b1_2cond: 76, b1_3cond: 68, b2_2cond: 68, b2_3cond: 60,  c_2cond: 89, c_3cond: 76 },
  { gaugeMM2: 25.0, b1_2cond: 101, b1_3cond: 89, b2_2cond: 89, b2_3cond: 77, c_2cond: 118, c_3cond: 101 },
  { gaugeMM2: 35.0, b1_2cond: 125, b1_3cond: 110, b2_2cond: 110, b2_3cond: 97, c_2cond: 145, c_3cond: 125 },
  { gaugeMM2: 50.0, b1_2cond: 151, b1_3cond: 134, b2_2cond: 134, b2_3cond: 118, c_2cond: 175, c_3cond: 151 },
  { gaugeMM2: 70.0, b1_2cond: 192, b1_3cond: 171, b2_2cond: 171, b2_3cond: 151, c_2cond: 222, c_3cond: 192 },
  { gaugeMM2: 95.0, b1_2cond: 232, b1_3cond: 207, b2_2cond: 207, b2_3cond: 182, c_2cond: 269, c_3cond: 232 },
  { gaugeMM2: 120.0, b1_2cond: 269, b1_3cond: 239, b2_2cond: 239, b2_3cond: 210, c_2cond: 312, c_3cond: 269 },
  { gaugeMM2: 150.0, b1_2cond: 300, b1_3cond: 272, b2_2cond: 272, b2_3cond: 240, c_2cond: 358, c_3cond: 309 },
  { gaugeMM2: 185.0, b1_2cond: 341, b1_3cond: 310, b2_2cond: 310, b2_3cond: 273, c_2cond: 408, c_3cond: 353 },
  { gaugeMM2: 240.0, b1_2cond: 400, b1_3cond: 364, b2_2cond: 364, b2_3cond: 321, c_2cond: 481, c_3cond: 415 }
];

const STANDARD_BREAKERS = [16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 160, 175, 200, 225, 250, 300, 350, 400, 500, 630];
const STANDARD_TRAFOS_KVA = [45, 75, 112.5, 150, 225, 300, 500, 750, 1000];

/**
 * Dimensiona toda a infraestrutura eletrotécnica do ponto de recarga de VE e QGBT integrado.
 */
export function sizeElectricalInfrastructure(
  input: ElectricalInfrastructureInput
): ElectricalInfrastructureSizing {
  const {
    chargerPowerKW,
    chargerVoltage,
    chargerPhases,
    cableLengthMeters,
    installationMethod = 'B1',
    ambientTemperatureC = 30,
    groupedCircuits = 1,
    existingPeakDemandKW,
    gridStandardLimitKW,
    currentStandardBreakerA = 200,
    hasSmartChargingDLM = false,
    isOutdoor = false,
    auxiliaryConfig,
    cemigStandardBOM,
    chargerModelName,
    chargerBrand,
    chargerCurrentInA
  } = input;

  const cosPhi = 0.98;

  // ─── 1. CIRCUITO TERMINAL DO CARREGADOR (EV) ────────────────────────────────
  const chargerDesignCurrentA = chargerCurrentInA || (chargerPhases === 3
    ? Number(((chargerPowerKW * 1000) / (Math.sqrt(3) * chargerVoltage * cosPhi)).toFixed(1))
    : Number(((chargerPowerKW * 1000) / (chargerVoltage * cosPhi)).toFixed(1)));

  // Margem contínua de 15% a 25% (Fs = 1.0 NBR 17019 e manuais dos fabricantes WEG/BENY)
  const minBreakerRating = chargerDesignCurrentA * 1.15;
  const recommendedBreakerA = STANDARD_BREAKERS.find(b => b >= minBreakerRating) || 63;

  // Fatores de Correção de Temperatura e Agrupamento
  let tempFactor = 1.00;
  if (ambientTemperatureC > 30) {
    if (ambientTemperatureC <= 35) tempFactor = 0.94;
    else if (ambientTemperatureC <= 40) tempFactor = 0.87;
    else tempFactor = 0.79;
  }

  let groupFactor = 1.00;
  if (groupedCircuits === 2) groupFactor = 0.80;
  else if (groupedCircuits === 3) groupFactor = 0.70;
  else if (groupedCircuits >= 4) groupFactor = 0.65;

  const requiredAmpacityA = recommendedBreakerA / (tempFactor * groupFactor);

  // Seleção da Bitola de Fase
  const isThreePhase = chargerPhases === 3;
  let selectedGaugeMM2 = 2.5;

  for (const entry of AMPACITY_TABLE_PVC) {
    let tableCurrent = entry.b1_2cond;
    if (installationMethod === 'B1') {
      tableCurrent = isThreePhase ? entry.b1_3cond : entry.b1_2cond;
    } else if (installationMethod === 'B2') {
      tableCurrent = isThreePhase ? entry.b2_3cond : entry.b2_2cond;
    } else {
      tableCurrent = isThreePhase ? entry.c_3cond : entry.c_2cond;
    }

    if (tableCurrent >= requiredAmpacityA) {
      selectedGaugeMM2 = entry.gaugeMM2;
      break;
    }
  }

  // Verificação de Queda de Tensão (Delta V <= 2.0% conforme NBR 17019)
  const maxAllowedVoltageDropPercent = 2.0;
  let calculatedVoltageDropPercent = 0;
  let cableGaugePhaseMM2 = selectedGaugeMM2;

  while (cableGaugePhaseMM2 <= 240.0) {
    if (isThreePhase) {
      calculatedVoltageDropPercent = Number((
        (Math.sqrt(3) * COPPER_RESISTIVITY_70C * cableLengthMeters * chargerDesignCurrentA * cosPhi) /
        (chargerVoltage * cableGaugePhaseMM2) * 100
      ).toFixed(2));
    } else {
      calculatedVoltageDropPercent = Number((
        (2 * COPPER_RESISTIVITY_70C * cableLengthMeters * chargerDesignCurrentA * cosPhi) /
        (chargerVoltage * cableGaugePhaseMM2) * 100
      ).toFixed(2));
    }

    if (calculatedVoltageDropPercent <= maxAllowedVoltageDropPercent) {
      break;
    }

    const nextIdx = AMPACITY_TABLE_PVC.findIndex(e => e.gaugeMM2 > cableGaugePhaseMM2);
    if (nextIdx !== -1) {
      cableGaugePhaseMM2 = AMPACITY_TABLE_PVC[nextIdx].gaugeMM2;
    } else {
      break;
    }
  }

  const isVoltageDropCompliant = calculatedVoltageDropPercent <= maxAllowedVoltageDropPercent;

  // Condutores de Neutro e Proteção (PE - Tabela 58 NBR 5410)
  const cableGaugeNeutralMM2 = cableGaugePhaseMM2;
  let cableGaugeGroundMM2 = cableGaugePhaseMM2;
  if (cableGaugePhaseMM2 > 16.0 && cableGaugePhaseMM2 <= 35.0) {
    cableGaugeGroundMM2 = 16.0;
  } else if (cableGaugePhaseMM2 > 35.0) {
    cableGaugeGroundMM2 = Number((cableGaugePhaseMM2 / 2).toFixed(1));
    const standardPe = [16, 25, 35, 50, 70, 95, 120].find(g => g >= cableGaugeGroundMM2);
    cableGaugeGroundMM2 = standardPe || 25.0;
  }

  // Proteção DR e DPS Conforme NBR 17019
  const residualCurrentProtection: ProtectionDeviceSpec = {
    code: 'DR-VE-30MA',
    name: isThreePhase ? 'Interruptor DR Tetrapolar 40A / 30mA Tipo B' : 'Interruptor DR Bipolar 40A / 30mA Tipo B',
    type: 'Tipo B (ou Tipo A com RDC-DD 6mA CC)',
    rating: `${Math.max(40, recommendedBreakerA)}A, In=30mA, ${isThreePhase ? '4P' : '2P'}`,
    normativeReference: 'ABNT NBR 17019 / IEC 62423 / IEC 62955',
    isMandatory: true,
    technicalJustification: 'Obrigatório para proteger contra fugas de corrente alternada e componente contínua pura (CC > 6mA) geradas pelos inversores de bordo dos veículos elétricos.'
  };

  const surgeProtectionDPS: ProtectionDeviceSpec = {
    code: 'DPS-CL2-40KA',
    name: `Dispositivo de Proteção contra Surtos (DPS) Classe II (${isThreePhase ? '4' : '2'} polos)`,
    type: 'Classe II (Varistor de Óxido Metálico)',
    rating: 'Uc=275V, In=20kA, Imax=40kA',
    normativeReference: 'ABNT NBR 5410 Item 6.3.5 / ABNT NBR 17019',
    isMandatory: true,
    technicalJustification: 'Protege a eletrônica sensível da estação de recarga e o veículo contra sobretensões transitórias originadas na rede elétrica.'
  };

  // ─── 2. CIRCUITOS AUXILIARES DO QGBT (LADO 220V) ─────────────────────────────
  const effectiveAuxConfig: AuxiliaryCircuitsConfig = auxiliaryConfig || {
    enableOutlets: true,
    outletsCount: 2,
    enableLighting: true,
    lightingPowerW: 800,
    enableCCTV: true,
    cctvPowerW: 400,
    enableCustomerTap: false,
    customerTapPowerKW: existingPeakDemandKW || 0,
    enableEnergyMeter: true
  };

  const auxiliaryCircuits: AuxiliaryCircuitItem[] = [];
  let auxTotalPowerW = 0;

  // Circuito 1: Tomadas de Manutenção e Serviço (TUG 220V 20A)
  if (effectiveAuxConfig.enableOutlets && effectiveAuxConfig.outletsCount > 0) {
    const powerW = effectiveAuxConfig.outletsCount * 1200; // 1200W por ponto de tomada industrial/serviço
    const currentA = Number((powerW / 220).toFixed(1));
    auxTotalPowerW += powerW;
    auxiliaryCircuits.push({
      id: 'AUX-OUTLETS',
      name: `Tomadas de Manutenção e Serviço (${effectiveAuxConfig.outletsCount}x 20A 2P+T)`,
      voltageV: 220,
      phases: 1,
      powerW,
      currentA,
      breakerA: 20,
      cableMM2: 4.0,
      protectionType: 'Disjuntor Termomagnético 1P+N Curva C 20A + DR 30mA',
      normReference: 'NBR 5410 Item 9.5.3',
      description: 'Alimentação para equipamentos de teste, calibração de carregador, aspiradores e manutenção geral.'
    });
  }

  // Circuito 2: Iluminação de Pátio / Canopy do Eletroposto (LED 220V)
  if (effectiveAuxConfig.enableLighting && effectiveAuxConfig.lightingPowerW > 0) {
    const powerW = effectiveAuxConfig.lightingPowerW;
    const currentA = Number((powerW / 220).toFixed(1));
    auxTotalPowerW += powerW;
    auxiliaryCircuits.push({
      id: 'AUX-LIGHTING',
      name: 'Iluminação de Pátio e Cobertura (Canopy LED)',
      voltageV: 220,
      phases: 1,
      powerW,
      currentA,
      breakerA: 10,
      cableMM2: 2.5,
      protectionType: 'Disjuntor Termomagnético 1P+N Curva B 10A + Relé Fotoelétrico/Timer',
      normReference: 'NBR 5410 Item 6.2.8 / NBR 8995-1',
      description: 'Refletores LED e luminárias sob a cobertura de recarga com acionamento crepuscular.'
    });
  }

  // Circuito 3: CFTV, Câmeras de Segurança, Wi-Fi e Totem de Pagamento (220V)
  if (effectiveAuxConfig.enableCCTV && effectiveAuxConfig.cctvPowerW > 0) {
    const powerW = effectiveAuxConfig.cctvPowerW;
    const currentA = Number((powerW / 220).toFixed(1));
    auxTotalPowerW += powerW;
    auxiliaryCircuits.push({
      id: 'AUX-CCTV',
      name: 'CFTV, Telecom, Wi-Fi e Totem de Tarifação',
      voltageV: 220,
      phases: 1,
      powerW,
      currentA,
      breakerA: 16,
      cableMM2: 2.5,
      protectionType: 'Disjuntor Termomagnético 1P+N Curva C 16A + DPS Fino Classe III',
      normReference: 'NBR 5410 Item 6.3.5.2',
      description: 'Circuito dedicado para câmeras IP, NVR/DVR, switch PoE, roteador 4G/Wi-Fi e totem OCPP.'
    });
  }

  // Circuito 4: Derivação de Carga do Cliente (Subquadro Loja/Imóvel)
  if (effectiveAuxConfig.enableCustomerTap && effectiveAuxConfig.customerTapPowerKW > 0) {
    const powerW = effectiveAuxConfig.customerTapPowerKW * 1000;
    const currentA = Number(((powerW) / (Math.sqrt(3) * 380 * 0.95)).toFixed(1));
    auxTotalPowerW += powerW;
    const breakerA = STANDARD_BREAKERS.find(b => b >= currentA * 1.15) || 63;
    let cableMM2 = 16.0;
    for (const entry of AMPACITY_TABLE_PVC) {
      if (entry.b1_3cond >= breakerA) {
        cableMM2 = entry.gaugeMM2;
        break;
      }
    }
    auxiliaryCircuits.push({
      id: 'AUX-CUSTOMER-TAP',
      name: `Derivação para Carga Existente do Imóvel / Loja (${effectiveAuxConfig.customerTapPowerKW} kW)`,
      voltageV: 380,
      phases: 3,
      powerW,
      currentA,
      breakerA,
      cableMM2,
      protectionType: `Disjuntor Termomagnético 3P Curva C ${breakerA}A`,
      normReference: 'NBR 5410 Item 6.2',
      description: 'Alimentador secundário derivado do QGBT para alimentar o subquadro do prédio comercial/residencial.'
    });
  }

  // Circuito 5: Multimedidor Digital de Energia Modbus RS-485
  if (effectiveAuxConfig.enableEnergyMeter) {
    auxiliaryCircuits.push({
      id: 'AUX-METER',
      name: 'Multimedidor Digital de Grandezas Elétricas (Modbus/RS485)',
      voltageV: 220,
      phases: 1,
      powerW: 15,
      currentA: 0.1,
      breakerA: 6,
      cableMM2: 1.5,
      protectionType: 'Disjuntor Bipolar de Comando 6A Curva C + 3x TCs de Medição',
      normReference: 'NBR IEC 61557-12 / NBR 5410',
      description: 'Medição em tempo real de Tensão (V), Corrente (A), Fator de Potência, Demanda (kW) e THD para DLM e rateio.'
    });
  }

  // ─── 3. DIMENSIONAMENTO TOTAL DO QGBT (BARRAMENTO 380V & 220V) ──────────────
  const auxTotalPowerKW = Number((auxTotalPowerW / 1000).toFixed(2));
  const qgbtTotalInstalledKW = Number((chargerPowerKW + auxTotalPowerKW).toFixed(2));
  
  // Corrente total do QGBT (trifásico 380V)
  const qgbtTotalDesignCurrentA = Number(
    ((qgbtTotalInstalledKW * 1000) / (Math.sqrt(3) * 380 * cosPhi)).toFixed(1)
  );

  const qgbtMainBreakerA = STANDARD_BREAKERS.find(b => b >= qgbtTotalDesignCurrentA * 1.15) || 125;

  // Barramentos de Cobre
  const busbar380VRatingA = STANDARD_BREAKERS.find(b => b >= qgbtMainBreakerA * 1.25) || 250;
  const auxCurrentSumA = auxiliaryCircuits.reduce((acc, c) => acc + c.currentA, 0);
  const busbar220VRatingA = Math.max(63, STANDARD_BREAKERS.find(b => b >= auxCurrentSumA * 1.3) || 100);

  // Módulos DIN do Painel
  const polesBreaker = isThreePhase ? 3 : 2;
  const polesDR = isThreePhase ? 4 : 2;
  const polesDPS = isThreePhase ? 4 : 2;
  let requiredDinModules = polesBreaker + polesDR + polesDPS;

  // Somar módulos dos circuitos auxiliares
  auxiliaryCircuits.forEach(c => {
    if (c.id === 'AUX-METER') requiredDinModules += 6; // Multimedidor DIN (4 mod) + proteção (2 mod)
    else if (c.phases === 3) requiredDinModules += 4; // 3P/4P
    else requiredDinModules += 2; // 1P+N
  });
  requiredDinModules += 4; // Disjuntor Geral QGBT

  // Reserva técnica de 30% conforme NBR 5410
  const dinModulesCount = Math.max(24, Math.ceil(requiredDinModules * 1.3));

  const panelSpecification = {
    enclosureType: isOutdoor 
      ? 'Painel Autoportante ou Sobrepor Metálico IP65 com Pintura Eletrostática a Pó e Porta com Vedação' 
      : 'Quadro Geral de Baixa Tensão (QGBT) DIN Modular Termoplástico ou Metálico',
    ipRating: isOutdoor ? 'IP65' : 'IP54',
    dinModulesCount,
    recommendedModel: `Painel QGBT Industrial ${dinModulesCount} Módulos DIN ${isOutdoor ? 'IP65' : 'IP54'} com Barramento Pente/Cobre`,
    busbar380VRatingA,
    busbar220VRatingA
  };

  // Eletrodutos / Infraestrutura de Passagem
  let nominalDiameterMM = 25;
  let nominalInches = '3/4"';
  if (cableGaugePhaseMM2 >= 10.0 && cableGaugePhaseMM2 <= 16.0) {
    nominalDiameterMM = 32;
    nominalInches = '1"';
  } else if (cableGaugePhaseMM2 > 16.0 && cableGaugePhaseMM2 <= 35.0) {
    nominalDiameterMM = 40;
    nominalInches = '1.1/4"';
  } else if (cableGaugePhaseMM2 > 35.0) {
    nominalDiameterMM = 50;
    nominalInches = '2"';
  }

  const conduitSpecification = {
    type: isOutdoor ? 'Eletrocalha Perfurada Zincada a Fogo / Eletroduto Metálico Galvanizado Pesado' : 'Eletroduto PVC Rígido Antichama / Perfilado Perfurado',
    nominalDiameterMM,
    nominalInches
  };

  // ─── 4. DIAGNÓSTICO DE DESARME DO DISJUNTOR GERAL ───────────────────────────
  // Demanda simultânea total: carga existente + carregadores (+ auxiliares se não incluídos no existingPeak)
  const totalSimultaneousDemandKW = Number((existingPeakDemandKW + chargerPowerKW + (effectiveAuxConfig.enableCustomerTap ? 0 : auxTotalPowerKW)).toFixed(2));
  const isGridLimitExceeded = totalSimultaneousDemandKW > gridStandardLimitKW;
  const gridHeadroomKW = Number(Math.max(0, gridStandardLimitKW - existingPeakDemandKW).toFixed(2));

  const overloadAmountKW = isGridLimitExceeded ? Number((totalSimultaneousDemandKW - gridStandardLimitKW).toFixed(2)) : 0;
  const overloadAmountA = isGridLimitExceeded 
    ? Number(((overloadAmountKW * 1000) / (Math.sqrt(3) * 380 * cosPhi)).toFixed(1))
    : 0;

  const currentBreakerA = currentStandardBreakerA;
  const requiredCurrentA = Number(((totalSimultaneousDemandKW * 1000) / (Math.sqrt(3) * 380 * cosPhi)).toFixed(1));
  const requiredBreakerA = STANDARD_BREAKERS.find(b => b >= requiredCurrentA * 1.15) || 200;

  const willTripWithoutDLM = isGridLimitExceeded;
  const willTripWithDLM = false; // Com DLM a corrente é modulada dinamicamente

  let summaryMessage = '';
  let actionRequired = '';

  if (willTripWithoutDLM) {
    summaryMessage = `⚠️ SIM, O DISJUNTOR GERAL IRÁ CAIR POR SOBRECARGA CONTÍNUA sem o sistema DLM. A demanda total simultânea (${totalSimultaneousDemandKW} kW) supera a capacidade do padrão contratado (${gridStandardLimitKW} kW / ${currentBreakerA}A) em ${overloadAmountKW} kW (sobrecorrente estimada de +${overloadAmountA}A).`;
    actionRequired = hasSmartChargingDLM
      ? 'A Gestão Dinâmica de Carga (DLM) já está ativa e modulará automaticamente a potência de recarga nos momentos de pico, impedindo o desarme do disjuntor.'
      : 'Ativar o Sistema de Gestão Dinâmica de Carga (DLM) ou solicitar Aumento de Carga / Padrão junto à concessionária (CEMIG).';
  } else {
    summaryMessage = `✅ NÃO, O DISJUNTOR GERAL NÃO IRÁ CAIR. O padrão atual comporta a inserção da estação de recarga com folga de ${gridHeadroomKW} kW em relação ao limite contratado de ${gridStandardLimitKW} kW.`;
    actionRequired = 'Instalação liberada no padrão atual. Recomenda-se manter o DLM como segurança redundante contra picos simultâneos imprevisíveis.';
  }

  const breakerTripDiagnosis: BreakerTripDiagnosis = {
    willTripWithoutDLM,
    overloadAmountKW,
    overloadAmountA,
    currentBreakerA,
    requiredBreakerA,
    willTripWithDLM,
    summaryMessage,
    actionRequired
  };

  // ─── 5. RECOMENDAÇÃO DE TRANSFORMADOR / NÍVEL DE TENSÃO (BT vs MT) ──────────
  const utility = input.utility || 'CEMIG';
  // Tensão de fornecimento local da rede de BT (220V Fase-Fase na CEMIG ou conforme selecionado pelo usuário)
  const gridSupplyVoltage = input.gridSupplyVoltage || (utility === 'CEMIG' || utility === 'ENERGISA' || utility === 'ENEL_RJ' ? 220 : 380);
  const is220VGrid = gridSupplyVoltage === 220;
  const isCharger380V = chargerVoltage >= 380 || (chargerPhases === 3 && chargerPowerKW >= 11);

  // Limite de atendimento em BT individual CEMIG ND-5.1: até 75 kW / 200A (Cat C6)
  const isAboveIndividualBT = totalSimultaneousDemandKW > 75.0;
  const isHighDemand = totalSimultaneousDemandKW > 100.0;

  let transformerRecommendation: TransformerRecommendation;
  let transformerDetails: TransformerSizingDetails;

  // CASO A: Média Tensão por Demanda Alta (> 75 kW / > 100 kW)
  if (isAboveIndividualBT) {
    const requiredTrafoKVA = Number((totalSimultaneousDemandKW / 0.92).toFixed(1));
    const suggestedTrafoRatingKVA = STANDARD_TRAFOS_KVA.find(t => t >= requiredTrafoKVA * 1.15) || 150;

    transformerRecommendation = {
      needed: true,
      recommendedKVA: suggestedTrafoRatingKVA,
      supplyLevel: isHighDemand ? 'MT' : 'BT',
      reason: isHighDemand
        ? `A demanda total calculada de ${totalSimultaneousDemandKW} kW excede o limite convencional da rede pública de Baixa Tensão da CEMIG (75 kW). É obrigatória a implantação de Subestação Particular de Média Tensão 13,8 kV (Trafo de ${suggestedTrafoRatingKVA} kVA).`
        : `A demanda de ${totalSimultaneousDemandKW} kW excede a Categoria C6 (75 kW / 200A). Pode ser atendida por Padrão de Alta Demanda BT (Tabela 4 CEMIG F1..F4 com medição indireta) ou por Transformador Próprio de ${suggestedTrafoRatingKVA} kVA (ND-5.3).`,
      suggestedTrafoRatingKVA,
      applicableNorm: isHighDemand ? 'CEMIG ND-5.3 / ABNT NBR 14039 (Média Tensão)' : 'CEMIG ND-5.1 Tabela 4 / ND-5.3'
    };

    transformerDetails = {
      needed: true,
      type: 'subestacao_mt',
      nominalKVA: suggestedTrafoRatingKVA,
      primaryVoltageV: 13800,
      primaryPhases: 3,
      primaryCurrentA: Number((suggestedTrafoRatingKVA / (Math.sqrt(3) * 13.8)).toFixed(1)),
      secondaryVoltageV: 380,
      secondaryPhases: 3,
      secondaryCurrentA: Number(((suggestedTrafoRatingKVA * 1000) / (Math.sqrt(3) * 380)).toFixed(1)),
      connectionGroup: 'Delta-Estrela Aterrada (Dyn1) com Neutro acessível',
      coolingType: 'A seco (AN) ou a Óleo Mineral',
      enclosureIp: isOutdoor ? 'IP54 (Externo/Poste/Cabine)' : 'IP23 (Abrigado)',
      reason: `Subestação Particular de Média Tensão necessária devido à demanda total (${totalSimultaneousDemandKW} kW) superar o limite de fornecimento BT da concessionária.`,
      applicableNorm: 'CEMIG ND-5.3 / ABNT NBR 14039',
      inrushMultiplier: 10,
      lossesEstimatedKW: Number((suggestedTrafoRatingKVA * 0.02).toFixed(1))
    };
  } 
  // CASO B: Carregador 380V em Rede BT 220V (ex: 22 kW ou 11 kW na CEMIG)
  else if (is220VGrid && isCharger380V) {
    const charger380VKW = chargerPowerKW;
    const requiredTrafoKVA = (charger380VKW / 0.95) * 1.20; // 20% margem regime contínuo Fs=1.0
    const suggestedKVA = STANDARD_TRAFOS_KVA.find(t => t >= requiredTrafoKVA) || (requiredTrafoKVA <= 30 ? 30 : 45);

    const primaryVoltage = 220;
    const secondaryVoltage = 380;
    const primaryCurrent = Number(((charger380VKW * 1000) / (Math.sqrt(3) * primaryVoltage * 0.98 * 0.97)).toFixed(1)); // rendimento 97%
    const secondaryCurrent = Number(((charger380VKW * 1000) / (Math.sqrt(3) * secondaryVoltage * 0.98)).toFixed(1));

    transformerRecommendation = {
      needed: true,
      recommendedKVA: suggestedKVA,
      supplyLevel: 'BT',
      reason: `O carregador selecionado opera em 380V trifásico (${chargerPowerKW} kW), porém a rede pública de Baixa Tensão da CEMIG disponibiliza 220V Fase-Fase (e 127V Fase-Neutro). É OBRIGATÓRIO o emprego de um Transformador/Autotransformador Elevador Trifásico a Seco 220V -> 380V/220V de ${suggestedKVA} kVA para elevação e compatibilização da tensão.`,
      suggestedTrafoRatingKVA: suggestedKVA,
      applicableNorm: 'ABNT NBR 5410 / ABNT NBR 17019 / NBR 5356'
    };

    transformerDetails = {
      needed: true,
      type: 'elevador_seco',
      nominalKVA: suggestedKVA,
      primaryVoltageV: 220,
      primaryPhases: 3,
      primaryCurrentA: primaryCurrent,
      secondaryVoltageV: 380,
      secondaryPhases: 3,
      secondaryCurrentA: secondaryCurrent,
      connectionGroup: 'Triângulo (Primário 220V Δ) - Estrela com Neutro Acessível e Aterrado (Secundário 380V/220V Y)',
      coolingType: 'A seco (AN) - Classe de Isolação F (155°C) ou H (180°C)',
      enclosureIp: isOutdoor ? 'IP54 com ventilação labirinto' : 'IP23 metálico abrigado',
      reason: `Elevação de tensão de 220V (rede CEMIG) para 380V (tensão nominal do carregador ${chargerPowerKW} kW). O secundário estrela recria o condutor Neutro com aterramento sólido para proteção TN-S e operação do DR Tipo B.`,
      applicableNorm: 'ABNT NBR 17019 / NBR 5410 / NBR 5356',
      inrushMultiplier: 8,
      lossesEstimatedKW: Number((charger380VKW * 0.025).toFixed(2)) // 2.5% de perdas típicas a seco
    };
  } 
  // CASO C: Carregador 220V (7.4 kW / 3.7 kW bifásico ou monofásico) ou rede compatível
  else {
    transformerRecommendation = {
      needed: false,
      recommendedKVA: 0,
      supplyLevel: 'BT',
      reason: `O carregador selecionado opera em ${chargerVoltage}V (${chargerPowerKW} kW), tensão plenamente compatível com o fornecimento em Baixa Tensão da concessionária (${utility === 'CEMIG' ? 'CEMIG 220V Bifásico Fase-Fase ou Monofásico 220V' : '220V'}). NÃO HÁ NECESSIDADE DE TRANSFORMADOR ELEVADOR.`,
      applicableNorm: 'ABNT NBR 17019 / CEMIG ND-5.1'
    };

    transformerDetails = {
      needed: false,
      type: 'dispensado_rede_compativel',
      nominalKVA: 0,
      primaryVoltageV: chargerVoltage,
      primaryPhases: chargerPhases,
      primaryCurrentA: chargerDesignCurrentA,
      secondaryVoltageV: chargerVoltage,
      secondaryPhases: chargerPhases,
      secondaryCurrentA: chargerDesignCurrentA,
      connectionGroup: 'Alimentação Direta da Concessionária (Sem Trafo)',
      coolingType: 'N/A (Dispensado)',
      enclosureIp: 'N/A',
      reason: `A tensão da rede ${utility} (${chargerVoltage}V) atende diretamente aos requisitos nominais do carregador de ${chargerPowerKW} kW. A ligação direta elimina perdas a vazio e reduz o custo global da instalação.`,
      applicableNorm: 'ABNT NBR 17019 / NBR 5410',
      inrushMultiplier: 1,
      lossesEstimatedKW: 0
    };
  }

  // ─── ESPECIFICAÇÃO DOS PAINÉIS SEGREGADOS LADO 220V & LADO 380V ─────────────
  const isTransformerActive = transformerDetails.needed && (transformerDetails.type === 'elevador_seco' || transformerDetails.type === 'subestacao_mt');
  const isElevadorSeco = transformerDetails.needed && transformerDetails.type === 'elevador_seco';

  // Painel Lado 220V (Entrada / Primário do Trafo & Auxiliares)
  const primaryBreakerRatingA = isElevadorSeco
    ? (STANDARD_BREAKERS.find(b => b >= transformerDetails.primaryCurrentA * 1.25) || 80)
    : qgbtMainBreakerA;

  const panel220VSpec: Panel220VSpec = {
    name: isElevadorSeco
      ? 'Painel de Proteção Lado 220V (Entrada & Primário)'
      : transformerDetails.type === 'subestacao_mt'
      ? 'Painel Auxiliar 220V (Serviços Gerais)'
      : 'Quadro Geral QGBT 220V (Unificado)',
    mainBreakerA: isElevadorSeco ? primaryBreakerRatingA : Math.max(63, STANDARD_BREAKERS.find(b => b >= (auxTotalPowerKW * 1000 / 220) * 1.25) || 63),
    mainBreakerPoles: isElevadorSeco ? 3 : (isThreePhase ? 3 : 2),
    mainBreakerCurve: isElevadorSeco ? 'D' : 'C', // Curva D suporta o inrush do transformador elevador
    dpsSpec: 'Classe II Uc=275V In=20kA Imax=40kA (3 Fases + Terra / Neutro)',
    busbarRatingA: busbar220VRatingA,
    dinModulesCount: Math.max(18, Math.ceil((auxiliaryCircuits.length * 2 + 10) * 1.3)),
    cableGaugeMM2: isElevadorSeco
      ? (AMPACITY_TABLE_PVC.find(e => e.b1_3cond >= primaryBreakerRatingA)?.gaugeMM2 || 25)
      : 16,
    circuitsCount: auxiliaryCircuits.length + (isElevadorSeco ? 1 : 1),
    voltageV: 220,
    phases: isElevadorSeco ? 3 : (isThreePhase ? 3 : 2),
    description: isElevadorSeco
      ? 'Acomoda a proteção primária do transformador elevador com disjuntor curva D contra inrush, DPS 275V, multimedidor Modbus e circuitos auxiliares de 220V (iluminação, tomadas, totem).'
      : 'Quadro de serviços auxiliares em 220V/127V alimentando iluminação, tomadas de manutenção e periféricos do eletroposto.'
  };

  // Painel Lado 380V (Secundário do Trafo & Potência dos Carregadores VE)
  const secondaryBreakerRatingA = STANDARD_BREAKERS.find(b => b >= chargerDesignCurrentA * 1.15) || 40;

  const panel380VSpec: Panel380VSpec = {
    active: isTransformerActive || chargerVoltage >= 380,
    name: 'Painel de Proteção Lado 380V (Secundário & Potência VE)',
    mainBreakerA: Math.max(secondaryBreakerRatingA, STANDARD_BREAKERS.find(b => b >= (transformerDetails.secondaryCurrentA || chargerDesignCurrentA) * 1.15) || 40),
    mainBreakerPoles: 3,
    mainBreakerCurve: 'C',
    dpsSpec: 'Classe II Uc=385V/400V In=20kA Imax=40kA (4 Polos: 3F + N)',
    drType: 'Tetrapolar 40A / 30mA Tipo B (ou Tipo A com RDC-DD 6mA CC)',
    busbarRatingA: busbar380VRatingA,
    dinModulesCount: 18,
    cableGaugeMM2: cableGaugePhaseMM2,
    terminalBreakerA: recommendedBreakerA,
    groundingSystem: 'Sistema TN-S com Neutro da Estrela do Trafo Aterrado no BEP',
    voltageV: 380,
    phases: 3,
    description: 'Acomoda o barramento de 380V trifásico + Neutro + PE criado pelo secundário do transformador, com disjuntor tripolar, DR Tipo B 30mA e DPS Classe II 385V dedicados à estação de recarga.'
  };

  // ─── ANÁLISE COMPARATIVA ANTES E DEPOIS DO TRANSFORMADOR ELEVADOR ───────────
  let transformerBeforeAfter: TransformerBeforeAfterAnalysis | undefined;

  if (isTransformerActive) {
    const primaryVoltDrop = Number((
      (Math.sqrt(3) * COPPER_RESISTIVITY_70C * 15 * transformerDetails.primaryCurrentA * 0.98) /
      (220 * panel220VSpec.cableGaugeMM2) * 100
    ).toFixed(2));
    const primaryVoltDropV = Number(((primaryVoltDrop / 100) * 220).toFixed(1));

    const secondaryVoltDrop = calculatedVoltageDropPercent;
    const secondaryVoltDropV = Number(((secondaryVoltDrop / 100) * 380).toFixed(1));

    // Curto-circuito no secundário do trafo: Icc2 = I2n / Zcc (com Zcc = 4.0%)
    const trafoIcc2KA = Number((((transformerDetails.secondaryCurrentA || 34.1) / 0.04) / 1000).toFixed(2));

    transformerBeforeAfter = {
      needed: true,
      reason: transformerDetails.reason,
      primary: {
        voltageV: 220,
        phases: 3,
        connection: 'Triângulo Delta (Δ)',
        nominalCurrentA: transformerDetails.primaryCurrentA,
        inrushCurrentA: Number((transformerDetails.primaryCurrentA * 8.5).toFixed(1)),
        breakerRatingA: panel220VSpec.mainBreakerA,
        breakerPoles: 3,
        breakerCurve: 'D',
        breakerType: 'Disjuntor Termomagnético 3P Curva D (Suporta inrush transitório 8x In)',
        cableGaugePhaseMM2: panel220VSpec.cableGaugeMM2,
        cableGaugeGroundMM2: panel220VSpec.cableGaugeMM2 <= 16 ? panel220VSpec.cableGaugeMM2 : 16,
        voltageDropPercent: primaryVoltDrop,
        voltageDropVolts: primaryVoltDropV,
        shortCircuitCurrentKA: 10.0,
        dpsSpec: 'DPS Classe II monopolar (3x), Uc = 275V, In = 20kA, Imax = 40kA',
        dpsUcVolts: 275,
        groundingSystem: 'Equipotencialização da carcaça metálica ao BEP (NBR 5410)'
      },
      transformer: {
        nominalKVA: transformerDetails.nominalKVA,
        efficiencyPercent: 97.5,
        lossesKW: transformerDetails.lossesEstimatedKW,
        impedanceZccPercent: 4.0,
        coolingType: transformerDetails.coolingType,
        isolationClass: 'Classe F (155°C) ou H (180°C)',
        ipRating: transformerDetails.enclosureIp,
        connectionGroup: 'Dyn1 (Triângulo no primário 220V - Estrela aterrada no secundário 380V)',
        standards: ['ABNT NBR 5356', 'ABNT NBR 10295', 'ABNT NBR 17019']
      },
      secondary: {
        voltageV: 380,
        phases: 3,
        connection: 'Estrela Aterrada com Neutro Acessível (Yn)',
        nominalCurrentA: transformerDetails.secondaryCurrentA,
        breakerRatingA: panel380VSpec.terminalBreakerA,
        breakerPoles: 4,
        breakerCurve: 'C',
        breakerType: 'Disjuntor Termomagnético 4P Curva C (3F + Neutro Seccionado)',
        drSpec: 'DR Tetrapolar 40A / 30mA Tipo B (Detecção de corrente residual CC e CA)',
        cableGaugePhaseMM2: cableGaugePhaseMM2,
        cableGaugeNeutralMM2: cableGaugeNeutralMM2,
        cableGaugeGroundMM2: cableGaugeGroundMM2,
        voltageDropPercent: secondaryVoltDrop,
        voltageDropVolts: secondaryVoltDropV,
        shortCircuitCurrentKA: trafoIcc2KA,
        dpsSpec: 'DPS Classe II tetrapolar (4P), Uc = 385V / 400V, In = 20kA, Imax = 40kA',
        dpsUcVolts: 385,
        groundingSystem: 'Sistema TN-S com Neutro Aterrado no BEP (ABNT NBR 17019)'
      },
      neutralGroundingCompliance: {
        system: 'TN-S',
        standard: 'ABNT NBR 17019 Item 5.1 & ABNT NBR 5410 Item 6.3.3',
        description: 'O centro-estrela do secundário do transformador recria o neutro e é rigidamente conectado ao Barramento de Equipotencialização Principal (BEP). Os condutores Neutro (azul-claro) e Proteção PE (verde-amarelo) partem rigorosamente separados em todo o circuito terminal da estação, viabilizando a atuação precisa do DR Tipo B de 30mA.',
        bepConnectionRequired: true
      }
    };

    transformerDetails.beforeAfterAnalysis = transformerBeforeAfter;
  }

  // ─── 6. ALIMENTADOR GERAL E CONDUTORES ────────────────────────────────────────
  const feederCurrentA = isThreePhase
    ? Number(((totalSimultaneousDemandKW * 1000) / (Math.sqrt(3) * 380 * cosPhi)).toFixed(1))
    : Number(((totalSimultaneousDemandKW * 1000) / (220 * cosPhi)).toFixed(1));

  const feederGeneralBreakerRecommendedA = STANDARD_BREAKERS.find(b => b >= feederCurrentA * 1.1) || 100;
  
  let feederCableGaugePhaseMM2 = 16.0;
  for (const entry of AMPACITY_TABLE_PVC) {
    const cap = isThreePhase ? entry.b1_3cond : entry.b1_2cond;
    if (cap >= feederGeneralBreakerRecommendedA) {
      feederCableGaugePhaseMM2 = entry.gaugeMM2;
      break;
    }
  }
  const feederCableGaugeGroundMM2 = feederCableGaugePhaseMM2 <= 16 ? feederCableGaugePhaseMM2 : 16;

  // ─── 7. LISTA DE MATERIAIS QUANTITATIVA DO QGBT E INTERNOS (BOM) ────────────
  const totalCableLengthMeters = Math.ceil(cableLengthMeters * 1.1); // 10% sobra

  const billOfMaterials: BillOfMaterialItem[] = [
    {
      id: 'BOM-01',
      category: 'quadro',
      description: panelSpecification.recommendedModel,
      quantity: 1,
      unit: 'pç',
      spec: `Barramento de cobre 380V (${busbar380VRatingA}A), barramento 220V (${busbar220VRatingA}A), trilho DIN TH35, grau de proteção ${panelSpecification.ipRating}`,
      normReference: 'NBR IEC 61439-1 / NBR 5410'
    },
    {
      id: 'BOM-02',
      category: 'protecao',
      description: `Disjuntor Geral do QGBT ${qgbtMainBreakerA}A Tripolar Caixa Moldada/DIN`,
      quantity: 1,
      unit: 'pç',
      spec: `Capacidade de interrupção Icu >= 10kA / 16kA, curva C, 3P 380V`,
      normReference: 'NBR IEC 60947-2'
    },
    {
      id: 'BOM-03',
      category: 'protecao',
      description: chargerModelName 
        ? `Disjuntor Termomagnético Curva C ${recommendedBreakerA}A ${isThreePhase ? 'Tripolar' : 'Bipolar'} (Dedicado ao ${chargerBrand || 'WEG'} ${chargerModelName})`
        : `Disjuntor Termomagnético do Carregador Curva C ${recommendedBreakerA}A ${isThreePhase ? 'Tripolar' : 'Bipolar'}`,
      quantity: 1,
      unit: 'pç',
      spec: `Capacidade de ruptura Icu >= 5kA (NBR IEC 60947-2) ou 4,5kA (NBR NM 60898), curva C (Recomendação manual ${chargerBrand || 'WEG'} / NBR 5410)`,
      normReference: 'ABNT NBR 17019 Item 5.3'
    },
    {
      id: 'BOM-04',
      category: 'protecao',
      description: chargerModelName 
        ? `${residualCurrentProtection.name} (Compatível com ${chargerBrand || 'WEG'} ${chargerModelName})`
        : residualCurrentProtection.name,
      quantity: 1,
      unit: 'pç',
      spec: residualCurrentProtection.rating,
      normReference: residualCurrentProtection.normativeReference
    },
    {
      id: 'BOM-05',
      category: 'protecao',
      description: surgeProtectionDPS.name,
      quantity: 1,
      unit: 'cj',
      spec: surgeProtectionDPS.rating,
      normReference: surgeProtectionDPS.normativeReference
    },
    {
      id: 'BOM-06',
      category: 'condutores',
      description: `Cabo Flexível de Cobre 750V/1kV ${cableGaugePhaseMM2} mm² - Fase(s) Carregador`,
      quantity: totalCableLengthMeters * (isThreePhase ? 3 : (chargerPhases === 1 ? 1 : 2)),
      unit: 'm',
      spec: `Condutor classe 5 têmpera mole, isolação PVC 70°C antichama (Cores Preto/Vermelho)`,
      normReference: 'NBR NM 247-3 / NBR 5410'
    },
    {
      id: 'BOM-07',
      category: 'condutores',
      description: `Cabo Flexível de Cobre 750V/1kV ${cableGaugeNeutralMM2} mm² - Neutro Carregador`,
      quantity: totalCableLengthMeters,
      unit: 'm',
      spec: `Condutor classe 5, cor estritamente AZUL CLARO`,
      normReference: 'NBR 5410 Item 6.1.5.3.1'
    },
    {
      id: 'BOM-08',
      category: 'condutores',
      description: `Cabo Flexível de Cobre 750V/1kV ${cableGaugeGroundMM2} mm² - Terra (PE) Carregador`,
      quantity: totalCableLengthMeters,
      unit: 'm',
      spec: `Condutor classe 5 exclusivo para o carregador, cor VERDE ou VERDE-AMARELO`,
      normReference: 'ABNT NBR 17019 Item 5.4 / NBR 5410 Tabela 58'
    },
    {
      id: 'BOM-09',
      category: 'infraestrutura',
      description: `${conduitSpecification.type} ${conduitSpecification.nominalInches} (${conduitSpecification.nominalDiameterMM}mm)`,
      quantity: Math.ceil(cableLengthMeters),
      unit: 'm',
      spec: `Com conexões, curvas, luvas e abraçadeiras tipo D com parafuso e bucha`,
      normReference: 'NBR 15465 / NBR 5410'
    },
    {
      id: 'BOM-10',
      category: 'seguranca',
      description: 'Botoeira de Emergência tipo Cogumelo com trava (EPO - Emergency Power Off)',
      quantity: 1,
      unit: 'cj',
      spec: 'Caixa de sobrepor amarela, botão vermelho com destrave por rotação (distância <= 5m do VE)',
      normReference: 'Instrução Técnica IT-41 CBPMESP / IT-30 CBMMG'
    },
    {
      id: 'BOM-11',
      category: 'infraestrutura',
      description: 'Kit Terminais Ilhós Tubulares e Barramentos Pente DIN',
      quantity: 1,
      unit: 'kit',
      spec: `Terminais ilhós de compressão para bitola ${cableGaugePhaseMM2}mm², barramento pente e prensa-cabos`,
      normReference: 'NBR 5410'
    }
  ];

  // Adicionar itens dos circuitos auxiliares na BOM
  if (effectiveAuxConfig.enableOutlets) {
    billOfMaterials.push({
      id: 'BOM-AUX-01',
      category: 'auxiliares',
      description: `Conjunto Tomadas Industriais/Serviço 2P+T 20A 250V (${effectiveAuxConfig.outletsCount}x)`,
      quantity: effectiveAuxConfig.outletsCount,
      unit: 'pç',
      spec: 'Tomadas de embutir/sobrepor 20A padrão NBR 14136 com tampa protetora',
      normReference: 'NBR 5410 / NBR 14136'
    });
    billOfMaterials.push({
      id: 'BOM-AUX-02',
      category: 'protecao',
      description: 'Disjuntor Bipolar 20A Curva C + DR 25A 30mA para Tomadas',
      quantity: 1,
      unit: 'cj',
      spec: 'Proteção diferencial-residual obrigatória para tomadas de serviço',
      normReference: 'NBR 5410 Item 5.1.3.2.2'
    });
  }

  if (effectiveAuxConfig.enableLighting) {
    billOfMaterials.push({
      id: 'BOM-AUX-03',
      category: 'auxiliares',
      description: `Disjuntor Unipolar/Bipolar 10A Curva B para Iluminação Canopy LED (${effectiveAuxConfig.lightingPowerW}W)`,
      quantity: 1,
      unit: 'pç',
      spec: 'Proteção dedicada para iluminação do eletroposto com relé fotoelétrico',
      normReference: 'NBR 5410'
    });
  }

  if (effectiveAuxConfig.enableCCTV) {
    billOfMaterials.push({
      id: 'BOM-AUX-04',
      category: 'auxiliares',
      description: `Disjuntor 16A Curva C + DPS Fino Classe III para CFTV e Wi-Fi (${effectiveAuxConfig.cctvPowerW}W)`,
      quantity: 1,
      unit: 'cj',
      spec: 'Proteção contra surtos finos para eletrônica de segurança e comunicação',
      normReference: 'NBR 5410 / NBR IEC 61643-1'
    });
  }

  if (effectiveAuxConfig.enableEnergyMeter) {
    billOfMaterials.push({
      id: 'BOM-MED-01',
      category: 'medicao',
      description: 'Multimedidor Digital de Energia Trilho DIN RS-485 Modbus RTU',
      quantity: 1,
      unit: 'pç',
      spec: 'Medição V, I, P, Q, S, FP, kWh, THD com display LCD e porta RS485 para DLM',
      normReference: 'NBR IEC 61557-12'
    });
    billOfMaterials.push({
      id: 'BOM-MED-02',
      category: 'medicao',
      description: `Transformadores de Corrente (TC) Bipartidos/Janela (${qgbtMainBreakerA}/5A)`,
      quantity: 3,
      unit: 'pç',
      spec: 'Classe de exatidão 0.5s para medição indireta das 3 fases do QGBT',
      normReference: 'NBR IEC 61869-2'
    });
  }

  // Se transformador elevador estiver ativo, adicionar na lista de materiais
  if (isTransformerActive) {
    billOfMaterials.push({
      id: 'BOM-TRAFO-01',
      category: 'infraestrutura',
      description: `Transformador / Autotransformador Elevador Trifásico a Seco ${transformerDetails.nominalKVA} kVA (220V Δ / 380V Y)`,
      quantity: 1,
      unit: 'pç',
      spec: `Primário 220V trifásico, Secundário 380V/220V trifásico com Neutro acessível aterrado no BEP (Sistema TN-S). Classe F/H, enrolamento cobre/alumínio, grau ${transformerDetails.enclosureIp}`,
      normReference: 'ABNT NBR 5356 / ABNT NBR 17019'
    });
    billOfMaterials.push({
      id: 'BOM-TRAFO-02',
      category: 'protecao',
      description: `Disjuntor Termomagnético Primário ${panel220VSpec.mainBreakerA}A Tripolar Curva D (Proteção Inrush do Trafo)`,
      quantity: 1,
      unit: 'pç',
      spec: `Curva D com disparo magnético 10x a 14x In para absorção da corrente de magnetização do transformador sem desarme intempestivo`,
      normReference: 'NBR IEC 60947-2'
    });
    billOfMaterials.push({
      id: 'BOM-TRAFO-03',
      category: 'protecao',
      description: `DPS Classe II Tetrapolar Uc=385V/400V In=20kA Imax=40kA (Proteção Secundário 380V)`,
      quantity: 1,
      unit: 'cj',
      spec: `Proteção das 3 fases de 380V e neutro contra transitórios originados no enrolamento secundário`,
      normReference: 'ABNT NBR 5410 / NBR IEC 61643-1'
    });
  }

  const technicalNotes: string[] = [
    `Circuito terminal do carregador dimensionado para ${chargerPowerKW} kW (${chargerDesignCurrentA}A). Queda de tensão calculada: ${calculatedVoltageDropPercent}% (limite normativo estrito: 2.0%).`,
    `A bitola de ${cableGaugePhaseMM2} mm² atende simultaneamente aos critérios de condução de corrente (regime contínuo Fs=1.0) e queda de tensão para o comprimento de ${cableLengthMeters} metros.`,
    isTransformerActive
      ? `TRANSFORMADOR ELEVADOR ATIVO: ${transformerDetails.nominalKVA} kVA a seco para elevar a tensão da rede CEMIG (220V F-F) para a tensão nominal do carregador (380V F-F). Primário protegido com disjuntor ${panel220VSpec.mainBreakerA}A Curva D e secundário com barramento 380V + TN-S.`
      : `ALIMENTAÇÃO DIRETA EM 220V: O carregador opera na mesma tensão fornecida pela concessionária (${utility} 220V). Transformador dispensado.`,
    `Painel 220V: ${panel220VSpec.name} com Disjuntor ${panel220VSpec.mainBreakerA}A Curva ${panel220VSpec.mainBreakerCurve} e barramento ${panel220VSpec.busbarRatingA}A.`,
    panel380VSpec.active ? `Painel 380V: ${panel380VSpec.name} ativo com ${panel380VSpec.mainBreakerA}A e DR Tipo B.` : `Painel 380V: Não aplicável (instalação direta 220V).`,
    summaryMessage,
    transformerRecommendation.reason,
    `O condutor de proteção (PE) de ${cableGaugeGroundMM2} mm² deve ser exclusivo para a estação de recarga, conectado à barra de equipotencialização principal (BEP).`,
    `A proteção contra corrente diferencial-residual exige DR Tipo B ou DR Tipo A associado a dispositivo detector de corrente contínua RDC-DD 6mA (IEC 62955). DR Tipo AC comum é PROIBIDO pela NBR 17019.`
  ];

  return {
    chargerDesignCurrentA,
    recommendedBreakerA,
    chargerModelName,
    chargerBrand,
    chargerCurrentInA: chargerDesignCurrentA,
    cableGaugePhaseMM2,
    cableGaugeNeutralMM2,
    cableGaugeGroundMM2,
    calculatedVoltageDropPercent,
    isVoltageDropCompliant,
    maxAllowedVoltageDropPercent,
    residualCurrentProtection,
    surgeProtectionDPS,
    panelSpecification,
    panel220VSpec,
    panel380VSpec,
    conduitSpecification,
    measuredPeakDemandKW: existingPeakDemandKW,
    totalSimultaneousDemandKW,
    feederGeneralBreakerRecommendedA,
    feederCableGaugePhaseMM2,
    feederCableGaugeGroundMM2,
    isGridLimitExceeded,
    gridHeadroomKW,
    qgbtMainBreakerA,
    qgbtTotalInstalledKW,
    qgbtTotalDesignCurrentA,
    auxiliaryCircuits,
    auxiliaryConfig: effectiveAuxConfig,
    breakerTripDiagnosis,
    transformerRecommendation,
    transformerDetails,
    transformerBeforeAfter,
    billOfMaterials,
    cemigStandardBOM: cemigStandardBOM || [],
    technicalNotes
  };
}
