/**
 * CoenergyGO — Motor de Infraestrutura Eletrotécnica para Mobilidade Elétrica
 * Cordeiro Energia
 * 
 * Implementa as diretrizes compulsórias de dimensionamento elétrico:
 * 1. NBR 5410: Instalações elétricas de baixa tensão (Capacidade de condução, queda de tensão e condutor de proteção).
 * 2. ABNT NBR 17019: Alimentação de veículos elétricos (Regime contínuo Fs=1.0, DR Tipo B / RDC-DD 6mA, DPS Classe II).
 * 3. Integração com dados reais de medição (SmartMeter / Analisadores) para balanço de carga do alimentador geral.
 * 4. Dimensionamento físico do Quadro de Distribuição do Carregador (QDC-VE) e Lista de Materiais (BOM).
 */

import {
  ElectricalInfrastructureInput,
  ElectricalInfrastructureSizing,
  BillOfMaterialItem,
  ProtectionDeviceSpec
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
  { gaugeMM2: 2.5, b1_2cond: 24, b1_3cond: 21, b2_2cond: 21, b2_3cond: 18.5, c_2cond: 27, c_3cond: 24 },
  { gaugeMM2: 4.0, b1_2cond: 32, b1_3cond: 28, b2_2cond: 28, b2_3cond: 25,   c_2cond: 37, c_3cond: 32 },
  { gaugeMM2: 6.0, b1_2cond: 41, b1_3cond: 36, b2_2cond: 36, b2_3cond: 32,   c_2cond: 48, c_3cond: 41 },
  { gaugeMM2: 10.0, b1_2cond: 57, b1_3cond: 50, b2_2cond: 50, b2_3cond: 44,  c_2cond: 66, c_3cond: 57 },
  { gaugeMM2: 16.0, b1_2cond: 76, b1_3cond: 68, b2_2cond: 68, b2_3cond: 60,  c_2cond: 89, c_3cond: 76 },
  { gaugeMM2: 25.0, b1_2cond: 101, b1_3cond: 89, b2_2cond: 89, b2_3cond: 77, c_2cond: 118, c_3cond: 101 },
  { gaugeMM2: 35.0, b1_2cond: 125, b1_3cond: 110, b2_2cond: 110, b2_3cond: 97, c_2cond: 145, c_3cond: 125 },
  { gaugeMM2: 50.0, b1_2cond: 151, b1_3cond: 134, b2_2cond: 134, b2_3cond: 118, c_2cond: 175, c_3cond: 151 }
];

const STANDARD_BREAKERS = [16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125];

/**
 * Dimensiona toda a infraestrutura eletrotécnica do ponto de recarga de VE.
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
    isOutdoor = false
  } = input;

  const cosPhi = 0.98;

  // 1. Corrente de Projeto do Carregador (Ib)
  const chargerDesignCurrentA = chargerPhases === 3
    ? Number(((chargerPowerKW * 1000) / (Math.sqrt(3) * chargerVoltage * cosPhi)).toFixed(1))
    : Number(((chargerPowerKW * 1000) / (chargerVoltage * cosPhi)).toFixed(1));

  // 2. Fator de Serviço Contínuo (Fs = 1.0 conforme NBR 17019) e Disjuntor Recomendado (In)
  // Aplica margem contínua de 15% para evitar disparo térmico espúrio em dias quentes
  const minBreakerRating = chargerDesignCurrentA * 1.15;
  const recommendedBreakerA = STANDARD_BREAKERS.find(b => b >= minBreakerRating) || 63;

  // 3. Fatores de Correção de Temperatura e Agrupamento
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

  // 4. Seleção da Bitola pelo Critério de Ampacidade (Iz >= In / (Ft * Fg))
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

  // 5. Verificação do Critério de Máxima Queda de Tensão (Delta V <= 2.0% conforme NBR 17019)
  const maxAllowedVoltageDropPercent = 2.0;
  let calculatedVoltageDropPercent = 0;
  let cableGaugePhaseMM2 = selectedGaugeMM2;

  while (cableGaugePhaseMM2 <= 50.0) {
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

    // Se ultrapassa 2%, aumenta a bitola
    const nextIdx = AMPACITY_TABLE_PVC.findIndex(e => e.gaugeMM2 > cableGaugePhaseMM2);
    if (nextIdx !== -1) {
      cableGaugePhaseMM2 = AMPACITY_TABLE_PVC[nextIdx].gaugeMM2;
    } else {
      break;
    }
  }

  const isVoltageDropCompliant = calculatedVoltageDropPercent <= maxAllowedVoltageDropPercent;

  // 6. Condutor de Neutro e Condutor de Proteção (PE - Tabela 58 NBR 5410)
  const cableGaugeNeutralMM2 = cableGaugePhaseMM2;
  let cableGaugeGroundMM2 = cableGaugePhaseMM2;
  if (cableGaugePhaseMM2 > 16.0 && cableGaugePhaseMM2 <= 35.0) {
    cableGaugeGroundMM2 = 16.0;
  } else if (cableGaugePhaseMM2 > 35.0) {
    cableGaugeGroundMM2 = 25.0;
  }

  // 7. Proteção Diferencial Residual (DR) e DPS Conforme NBR 17019
  const residualCurrentProtection: ProtectionDeviceSpec = {
    code: 'DR-VE-30MA',
    name: isThreePhase ? 'Interruptor DR Tetrapolar 40A / 30mA Tipo B' : 'Interruptor DR Bipolar 40A / 30mA Tipo B',
    type: 'Tipo B (ou Tipo A com RDC-DD 6mA CC)',
    rating: `40A, In=30mA, ${isThreePhase ? '4P' : '2P'}`,
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

  // 8. Especificação do Quadro de Distribuição do Carregador (QDC-VE)
  const polesBreaker = isThreePhase ? 3 : 2;
  const polesDR = isThreePhase ? 4 : 2;
  const polesDPS = isThreePhase ? 4 : 2;
  const requiredDinModules = polesBreaker + polesDR + polesDPS;
  // Margem de reserva técnica de 30% conforme NBR 5410 Item 6.5.4.7
  const dinModulesCount = Math.max(12, Math.ceil(requiredDinModules * 1.3));

  const panelSpecification = {
    enclosureType: isOutdoor ? 'Quadro de Sobrepor em Termoplástico com proteção UV e vedação reforçada' : 'Quadro de Sobrepor/Embutir DIN Termoplástico',
    ipRating: isOutdoor ? 'IP65' : 'IP40',
    dinModulesCount,
    recommendedModel: `Quadro Steck/Brum/Tigre ${dinModulesCount} módulos DIN ${isOutdoor ? 'IP65' : 'IP40'}`
  };

  // 9. Eletrodutos / Infraestrutura de Passagem
  let nominalDiameterMM = 25;
  let nominalInches = '3/4"';
  if (cableGaugePhaseMM2 >= 10.0 && cableGaugePhaseMM2 <= 16.0) {
    nominalDiameterMM = 32;
    nominalInches = '1"';
  } else if (cableGaugePhaseMM2 > 16.0) {
    nominalDiameterMM = 40;
    nominalInches = '1.1/4"';
  }

  const conduitSpecification = {
    type: isOutdoor ? 'Eletroduto em PVC Rígido Roscável / Eletroduto Metálico Galvanizado' : 'Eletroduto Corrugado Reforçado / PVC Rígido',
    nominalDiameterMM,
    nominalInches
  };

  // 10. Balanço com a Demanda Real Medida (SmartMeter)
  const totalSimultaneousDemandKW = Number((existingPeakDemandKW + chargerPowerKW).toFixed(2));
  const isGridLimitExceeded = totalSimultaneousDemandKW > gridStandardLimitKW;
  const gridHeadroomKW = Number(Math.max(0, gridStandardLimitKW - existingPeakDemandKW).toFixed(2));

  // Alimentador Geral Estimado para a instalação conjunta (Local + VE)
  const feederCurrentA = isThreePhase
    ? Number(((totalSimultaneousDemandKW * 1000) / (Math.sqrt(3) * chargerVoltage * cosPhi)).toFixed(1))
    : Number(((totalSimultaneousDemandKW * 1000) / (chargerVoltage * cosPhi)).toFixed(1));

  const feederGeneralBreakerRecommendedA = STANDARD_BREAKERS.find(b => b >= feederCurrentA * 1.1) || 100;
  
  // Bitola do alimentador geral da instalação
  let feederCableGaugePhaseMM2 = 16.0;
  for (const entry of AMPACITY_TABLE_PVC) {
    const cap = isThreePhase ? entry.b1_3cond : entry.b1_2cond;
    if (cap >= feederGeneralBreakerRecommendedA) {
      feederCableGaugePhaseMM2 = entry.gaugeMM2;
      break;
    }
  }
  const feederCableGaugeGroundMM2 = feederCableGaugePhaseMM2 <= 16 ? feederCableGaugePhaseMM2 : 16;

  // 11. Lista de Materiais Quantitativa (BOM)
  const numConductors = isThreePhase ? 5 : 3; // 3F+N+PE ou 2F+PE (ou F+N+PE)
  const totalCableLengthMeters = Math.ceil(cableLengthMeters * 1.1); // 10% sobra para derivações

  const billOfMaterials: BillOfMaterialItem[] = [
    {
      id: 'BOM-01',
      category: 'quadro',
      description: panelSpecification.recommendedModel,
      quantity: 1,
      unit: 'pç',
      spec: `Trilho DIN TH35, barramento de neutro e terra inclusos, ${panelSpecification.ipRating}`,
      normReference: 'NBR IEC 60670 / NBR 5410'
    },
    {
      id: 'BOM-02',
      category: 'protecao',
      description: `Disjuntor Termomagnético Curva C ${recommendedBreakerA}A ${isThreePhase ? 'Tripolar' : 'Bipolar'}`,
      quantity: 1,
      unit: 'pç',
      spec: `Capacidade de ruptura Icu >= 5kA (NBR IEC 60947-2) ou 4,5kA (NBR NM 60898), curva C`,
      normReference: 'ABNT NBR 17019 Item 5.3'
    },
    {
      id: 'BOM-03',
      category: 'protecao',
      description: residualCurrentProtection.name,
      quantity: 1,
      unit: 'pç',
      spec: residualCurrentProtection.rating,
      normReference: residualCurrentProtection.normativeReference
    },
    {
      id: 'BOM-04',
      category: 'protecao',
      description: surgeProtectionDPS.name,
      quantity: 1,
      unit: 'cj',
      spec: surgeProtectionDPS.rating,
      normReference: surgeProtectionDPS.normativeReference
    },
    {
      id: 'BOM-05',
      category: 'condutores',
      description: `Cabo Flexível de Cobre 750V/1kV ${cableGaugePhaseMM2} mm² - Fase(s)`,
      quantity: totalCableLengthMeters * (isThreePhase ? 3 : (chargerPhases === 1 ? 1 : 2)),
      unit: 'm',
      spec: `Condutor classe 5 têmpera mole, isolação PVC 70°C antichama (Cores Preto/Vermelho)`,
      normReference: 'NBR NM 247-3 / NBR 5410'
    },
    {
      id: 'BOM-06',
      category: 'condutores',
      description: `Cabo Flexível de Cobre 750V/1kV ${cableGaugeNeutralMM2} mm² - Neutro`,
      quantity: totalCableLengthMeters,
      unit: 'm',
      spec: `Condutor classe 5, cor estritamente AZUL CLARO`,
      normReference: 'NBR 5410 Item 6.1.5.3.1'
    },
    {
      id: 'BOM-07',
      category: 'condutores',
      description: `Cabo Flexível de Cobre 750V/1kV ${cableGaugeGroundMM2} mm² - Terra (PE)`,
      quantity: totalCableLengthMeters,
      unit: 'm',
      spec: `Condutor classe 5 exclusivo para o carregador, cor VERDE ou VERDE-AMARELO`,
      normReference: 'ABNT NBR 17019 Item 5.4 / NBR 5410 Tabela 58'
    },
    {
      id: 'BOM-08',
      category: 'infraestrutura',
      description: `${conduitSpecification.type} ${conduitSpecification.nominalInches} (${conduitSpecification.nominalDiameterMM}mm)`,
      quantity: Math.ceil(cableLengthMeters),
      unit: 'm',
      spec: `Com conexões, luvas e abraçadeiras tipo D com parafuso e bucha`,
      normReference: 'NBR 15465 / NBR 5410'
    },
    {
      id: 'BOM-09',
      category: 'seguranca',
      description: 'Botoeira de Emergência tipo Cogumelo com trava (EPO - Emergency Power Off)',
      quantity: 1,
      unit: 'cj',
      spec: 'Caixa de sobrepor amarela, botão vermelho com destrave por rotação (distância <= 5m do VE)',
      normReference: 'Instrução Técnica IT-41 CBPMESP / IT-30 CBMMG'
    },
    {
      id: 'BOM-10',
      category: 'infraestrutura',
      description: 'Kit Terminais Ilhós Tubulares e Acessórios de Montagem DIN',
      quantity: 1,
      unit: 'kit',
      spec: `Terminais ilhós de compressão para bitola ${cableGaugePhaseMM2}mm², barramento pente e prensa-cabos`,
      normReference: 'NBR 5410'
    }
  ];

  const technicalNotes: string[] = [
    `Circuito terminal do carregador dimensionado para ${chargerPowerKW} kW (${chargerDesignCurrentA}A). Queda de tensão calculada: ${calculatedVoltageDropPercent}% (limite normativo estrito: 2.0%).`,
    `A bitola de ${cableGaugePhaseMM2} mm² atende simultaneamente aos critérios de condução de corrente (regime contínuo Fs=1.0) e queda de tensão para o comprimento de ${cableLengthMeters} metros.`,
    `A demanda de pico do local registrada no medidor inteligente foi de ${existingPeakDemandKW} kW. Somada à potência do carregador (${chargerPowerKW} kW), a demanda simultânea estimada é de ${totalSimultaneousDemandKW} kW.`,
    isGridLimitExceeded
      ? `ATENÇÃO: A demanda simultânea estimada (${totalSimultaneousDemandKW} kW) supera a capacidade do padrão da concessionária (${gridStandardLimitKW} kW). É obrigatório utilizar Gestão Dinâmica de Carga (DLM) ou solicitar aumento de padrão.`
      : `O padrão atual de ${gridStandardLimitKW} kW comporta a inserção do carregador com margem de folga remanescente de ${gridHeadroomKW} kW.`,
    `O condutor de proteção (PE) de ${cableGaugeGroundMM2} mm² deve ser exclusivo para a estação de recarga, conectado à barra de equipotencialização principal (BEP).`,
    `A proteção contra corrente diferencial-residual exige DR Tipo B ou DR Tipo A associado a dispositivo detector de corrente contínua RDC-DD 6mA (IEC 62955). DR Tipo AC comum é PROIBIDO pela NBR 17019.`
  ];

  return {
    chargerDesignCurrentA,
    recommendedBreakerA,
    cableGaugePhaseMM2,
    cableGaugeNeutralMM2,
    cableGaugeGroundMM2,
    calculatedVoltageDropPercent,
    isVoltageDropCompliant,
    maxAllowedVoltageDropPercent,
    residualCurrentProtection,
    surgeProtectionDPS,
    panelSpecification,
    conduitSpecification,
    measuredPeakDemandKW: existingPeakDemandKW,
    totalSimultaneousDemandKW,
    feederGeneralBreakerRecommendedA,
    feederCableGaugePhaseMM2,
    feederCableGaugeGroundMM2,
    isGridLimitExceeded,
    gridHeadroomKW,
    billOfMaterials,
    technicalNotes
  };
}
