/**
 * Motor de Proteção e Dimensionamento Mandatório ABNT NBR 17019 / NBR 5410
 * CoenergyGO — Mobilidade Elétrica Inteligente (Cordeiro Energia)
 * 
 * Implementação das Regras Técnicas:
 * 1. Circuito Terminal Exclusivo para cada ponto de conexão (Item 722.311 NBR 17019)
 * 2. Proteção Diferencial Residual: DR Tipo B ou DR Tipo A + RDC-DD 6mA CC (Item 531.3.3 / IEC 62955)
 * 3. Proibição Expressa de DR Tipo AC comum (cegueira magnética por corrente de fuga CC)
 * 4. Proteção Coordenada contra Surtos (DPS Classe I e Classe II - NBR 5419 / NBR 17019)
 * 5. Condutor de Proteção (PE) Exclusivo dimensionado pela Tabela 58 da NBR 5410
 * 6. Fator Contínuo de 100% (Fs = 1.0) para cargas de VE (Item 722.311)
 * 7. Limite Máximo de Queda de Tensão: 2.0% no circuito terminal e 4.0% total
 * 8. Requisitos de Segurança contra Incêndio dos Bombeiros (IT-41 CBPMESP / IT-30 CBMMG)
 */

export interface NBR17019Input {
  powerKW: number;
  voltage: number; // 220V (F-F ou F-N) ou 380V (F-F)
  phases: 1 | 2 | 3;
  cableLengthMeters: number;
  installationMethod: 'B1' | 'B2' | 'C' | 'D'; // NBR 5410
  conductorMaterial?: 'copper' | 'aluminum';
  ambientTemperature?: number; // padrão 30°C
  groupedCircuits?: number; // circuitos agrupados na mesma calha/conduíte
  hasBuiltinRDCDD?: boolean; // Se o Wallbox já possui RDC-DD 6mA interno
  hasEmergencyButtonWithin5m: boolean;
  hasMechanicalBollards: boolean;
  hasPhotoluminescentSignaling: boolean;
}

export interface ProtectionSpec {
  code: string;
  name: string;
  type: string;
  rating: string;
  normativeReference: string;
  isMandatory: boolean;
  technicalJustification: string;
}

export interface NBR17019ComplianceResult {
  // Dados nominais de projeto
  nominalCurrentA: number;
  designCurrentA: number; // Com Fs = 1.0 e fatores de correção
  recommendedBreakerA: number;
  
  // Condutores
  cableGaugePhaseMM2: number;
  cableGaugeNeutralMM2: number;
  cableGaugeProtectionPEMM2: number;
  conduitRecommendedInch: string;
  
  // Queda de tensão
  voltageDropPercent: number;
  voltageDropVolts: number;
  isVoltageDropCompliant: boolean;
  
  // Proteções Obrigatórias
  residualProtection: ProtectionSpec;
  surgeProtection: ProtectionSpec;
  breakerProtection: ProtectionSpec;
  
  // Checklist de Conformidade Normativa
  checklistItems: {
    rule: string;
    standard: string;
    isCompliant: boolean;
    severity: 'critico' | 'atencao' | 'ok';
    recommendation: string;
  }[];

  // Bombeiros (IT-41 / IT-30)
  fireSafetyStatus: {
    isApproved: boolean;
    missingRequirements: string[];
  };
}

// Ampacidades NBR 5410 Tabela 36 (Cobre, PVC 70°C)
const AMPACITY_PVC: Record<string, Record<number, number>> = {
  'B1-2': { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232, 120: 268, 150: 308, 185: 352, 240: 415 },
  'B1-3': { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134, 70: 171, 95: 207, 120: 239, 150: 272, 185: 311, 240: 366 },
  'C-2': { 1.5: 22, 2.5: 30, 4: 40, 6: 51, 10: 71, 16: 96, 25: 127, 35: 157, 50: 190, 70: 242, 95: 293, 120: 339, 150: 389, 185: 444, 240: 522 },
  'C-3': { 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213, 95: 258, 120: 299, 150: 344, 185: 392, 240: 461 },
};

const GAUGES = [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
const STANDARD_BREAKERS = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];

// Fatores de correção de temperatura (NBR 5410 Tabela 40 para PVC 70°C)
function getTempFactor(temp: number): number {
  if (temp <= 25) return 1.06;
  if (temp <= 30) return 1.00;
  if (temp <= 35) return 0.94;
  if (temp <= 40) return 0.87;
  if (temp <= 45) return 0.79;
  return 0.71;
}

// Fatores de agrupamento (NBR 5410 Tabela 42)
function getGroupingFactor(circuits: number): number {
  if (circuits <= 1) return 1.00;
  if (circuits === 2) return 0.80;
  if (circuits === 3) return 0.70;
  if (circuits === 4) return 0.65;
  if (circuits <= 6) return 0.57;
  return 0.50;
}

// Dimensionamento de condutor PE (NBR 5410 Tabela 58)
export function calculatePEConductorGauge(phaseGauge: number): number {
  if (phaseGauge <= 16) return phaseGauge; // Se S <= 16mm², PE = S
  if (phaseGauge <= 35) return 16;         // Se 16 < S <= 35mm², PE = 16mm²
  return phaseGauge / 2;                   // Se S > 35mm², PE = S / 2
}

/**
 * Motor Principal NBR 17019
 */
export function calculateNBR17019Compliance(input: NBR17019Input): NBR17019ComplianceResult {
  const {
    powerKW,
    voltage,
    phases,
    cableLengthMeters,
    installationMethod,
    ambientTemperature = 30,
    groupedCircuits = 1,
    hasBuiltinRDCDD = true,
    hasEmergencyButtonWithin5m,
    hasMechanicalBollards,
    hasPhotoluminescentSignaling
  } = input;

  // 1. Corrente nominal de projeto Ib (com Fs = 1.0 contínuo)
  const cosPhi = 0.98; // Carregadores com PFC ativo
  let nominalCurrent = 0;
  if (phases === 3) {
    nominalCurrent = (powerKW * 1000) / (Math.sqrt(3) * voltage * cosPhi);
  } else {
    nominalCurrent = (powerKW * 1000) / (voltage * cosPhi);
  }

  // 2. Fatores de correção
  const fTemp = getTempFactor(ambientTemperature);
  const fGroup = getGroupingFactor(groupedCircuits);
  const totalCorrection = fTemp * fGroup;

  // Corrente fictícia de dimensionamento para Tabela 36
  const designCurrentForAmpacity = nominalCurrent / totalCorrection;

  // 3. Selecionar Disjuntor Padronizado (In >= Ib)
  let recommendedBreaker = STANDARD_BREAKERS[0];
  for (const b of STANDARD_BREAKERS) {
    if (b >= nominalCurrent * 1.15) { // Margem de segurança de 15% para cargas contínuas
      recommendedBreaker = b;
      break;
    }
  }

  // 4. Selecionar Bitola por Capacidade de Corrente (Iz >= In >= Ib)
  const methodKey = `${installationMethod === 'C' ? 'C' : 'B1'}-${phases >= 3 ? '3' : '2'}`;
  const table = AMPACITY_PVC[methodKey] || AMPACITY_PVC['B1-3'];

  let chosenGauge = 2.5;
  for (const g of GAUGES) {
    const rawAmpacity = table[g] || 0;
    const correctedAmpacity = rawAmpacity * totalCorrection;
    if (correctedAmpacity >= recommendedBreaker) {
      chosenGauge = g;
      break;
    }
  }

  // 5. Verificação e Correção por Queda de Tensão (máximo 2% no circuito terminal)
  const resistivity = 0.0178; // Cobre (ohm.mm²/m a 20°C / corrigido para 70°C ~ 0.021)
  const rho70 = 0.021;
  const maxVoltageDropPercent = 2.0;

  let voltageDropPercent = 0;
  let voltageDropVolts = 0;

  for (let i = GAUGES.indexOf(chosenGauge); i < GAUGES.length; i++) {
    const g = GAUGES[i];
    if (phases === 3) {
      // Trifásico: deltaV = sqrt(3) * I * (L/1000) * (rho / S)
      voltageDropVolts = Math.sqrt(3) * nominalCurrent * cableLengthMeters * (rho70 / g);
    } else {
      // Monofásico/Bifásico (vai e volta): deltaV = 2 * I * (L/1000) * (rho / S)
      voltageDropVolts = 2 * nominalCurrent * cableLengthMeters * (rho70 / g);
    }
    voltageDropPercent = (voltageDropVolts / voltage) * 100;

    if (voltageDropPercent <= maxVoltageDropPercent) {
      chosenGauge = g;
      break;
    }
    chosenGauge = g; // Se for o último cabo
  }

  const isVoltageDropCompliant = voltageDropPercent <= maxVoltageDropPercent;

  // 6. Condutores de Neutro e PE
  const cableGaugePhaseMM2 = chosenGauge;
  const cableGaugeNeutralMM2 = chosenGauge; // Carregadores com retificador podem ter harmônicos de 3ª ordem
  const cableGaugeProtectionPEMM2 = calculatePEConductorGauge(chosenGauge);

  // 7. Eletroduto recomendado
  let conduitRecommendedInch = '3/4"';
  if (chosenGauge >= 6 && chosenGauge <= 10) conduitRecommendedInch = '1"';
  else if (chosenGauge === 16) conduitRecommendedInch = '1.1/4"';
  else if (chosenGauge >= 25 && chosenGauge <= 35) conduitRecommendedInch = '1.1/2"';
  else if (chosenGauge >= 50) conduitRecommendedInch = '2"';

  // 8. Proteção Residual Obrigatória (DR Tipo B vs Tipo A + RDC-DD)
  let residualProtection: ProtectionSpec;
  if (hasBuiltinRDCDD) {
    residualProtection = {
      code: 'IDR-TIPO-A-RDC-DD',
      name: 'Interruptor Diferencial Residual Tipo A 30mA (Associado a RDC-DD 6mA)',
      type: 'Tipo A + RDC-DD',
      rating: `${recommendedBreaker}A / 30mA`,
      normativeReference: 'ABNT NBR 17019 Item 531.3.3 e IEC 62955',
      isMandatory: true,
      technicalJustification: 'Como o Wallbox dispõe de sensor RDC-DD interno de 6mA CC, a NBR 17019 permite o uso de DR Tipo A externo de 30mA para proteção contra contatos indiretos.'
    };
  } else {
    residualProtection = {
      code: 'IDR-TIPO-B',
      name: 'Interruptor Diferencial Residual Tipo B 30mA (Universal CA + CC pura)',
      type: 'Tipo B',
      rating: `${recommendedBreaker}A / 30mA`,
      normativeReference: 'ABNT NBR 17019 Item 531.3.3 e IEC 62423',
      isMandatory: true,
      technicalJustification: 'Obrigatório DR Tipo B completo caso o carregador não possua sensor interno RDC-DD 6mA, para prevenir a cegueira magnética do relé causada por correntes de fuga CC.'
    };
  }

  // 9. Proteção contra Surtos (DPS)
  const surgeProtection: ProtectionSpec = {
    code: 'DPS-CLASSE-II-40KA',
    name: 'Dispositivo de Proteção contra Surtos Classe II (QDC-VE)',
    type: 'Classe II (Varistor de Óxido Metálico)',
    rating: `In = 20 kA / Imax = 40 kA / Up <= 1.5 kV (${phases === 3 ? '3P+N' : '1P+N ou 2P'})`,
    normativeReference: 'ABNT NBR 17019 Item 534 e ABNT NBR 5419',
    isMandatory: true,
    technicalJustification: 'Protege a eletrônica sensível de controle (BMS, placas microcontroladas e módulos IGBT/SiC) contra sobretensões transitórias induzidas da rede.'
  };

  // 10. Disjuntor Termomagnético
  const breakerProtection: ProtectionSpec = {
    code: `DJ-${phases}P-${recommendedBreaker}A-CURVA-C`,
    name: `Disjuntor Termomagnético ${phases === 3 ? 'Tripolar' : phases === 2 ? 'Bipolar' : 'Monopolar'} Curva C`,
    type: 'Curva C (5 a 10 In)',
    rating: `${recommendedBreaker}A / Capacidade de Interrupção Icn >= 5 kA`,
    normativeReference: 'ABNT NBR 5410 Item 5.3 e NBR IEC 60898',
    isMandatory: true,
    technicalJustification: 'Proteção dedicada exclusiva contra sobrecorrentes e curtos-circuitos com curva C para suportar correntes de partida de capacitores internos do carregador.'
  };

  // 11. Checklist de Conformidade Normativa
  const checklistItems = [
    {
      rule: 'Circuito Terminal Exclusivo para Cada Ponto de Recarga',
      standard: 'ABNT NBR 17019 Item 722.311',
      isCompliant: true,
      severity: 'ok' as const,
      recommendation: 'Circuito dimensionado exclusivamente do QDC até o carregador, sem derivação para tomadas comuns ou iluminação.'
    },
    {
      rule: 'Proteção Diferencial Residual Tipo B ou Tipo A com RDC-DD 6mA',
      standard: 'ABNT NBR 17019 Item 531.3.3',
      isCompliant: true,
      severity: 'ok' as const,
      recommendation: 'Proibido expressamente o uso de DR Tipo AC comum que satura com corrente contínua.'
    },
    {
      rule: 'Condutor de Proteção (PE - Terra) Exclusivo',
      standard: 'ABNT NBR 5410 Tabela 58 e NBR 17019',
      isCompliant: true,
      severity: 'ok' as const,
      recommendation: `Condutor de proteção exclusivo de ${cableGaugeProtectionPEMM2} mm² de cobre, garantindo equipotencialização com o chassis do veículo.`
    },
    {
      rule: 'Queda de Tensão Máxima no Circuito do Carregador (<= 2.0%)',
      standard: 'ABNT NBR 17019 / NBR 5410',
      isCompliant: isVoltageDropCompliant,
      severity: isVoltageDropCompliant ? ('ok' as const) : ('critico' as const),
      recommendation: isVoltageDropCompliant 
        ? `Queda calculada de ${voltageDropPercent.toFixed(2)}% está dentro do limite máximo de 2.0%.`
        : `Queda calculada de ${voltageDropPercent.toFixed(2)}% excede o limite normativo. Recomenda-se aumentar a bitola para reduzir perdas.`
    },
    {
      rule: 'Botoeira de Desligamento de Emergência (EPO) a <= 5 metros',
      standard: 'IT-41 CBPMESP e IT-30 CBMMG (Bombeiros)',
      isCompliant: hasEmergencyButtonWithin5m,
      severity: hasEmergencyButtonWithin5m ? ('ok' as const) : ('critico' as const),
      recommendation: hasEmergencyButtonWithin5m
        ? 'Botoeira cogumelo instalada com desligamento por bobina de disparo e sinalização fotoluminescente.'
        : 'OBRIGATÓRIO: Instalar botoeira de emergência com trava e rearme por chave a no máximo 5 metros do ponto de recarga.'
    },
    {
      rule: 'Proteção Física contra Impacto Mecânico (Defensas / Balizadores)',
      standard: 'IT-41 CBPMESP / NBR 17019',
      isCompliant: hasMechanicalBollards,
      severity: hasMechanicalBollards ? ('ok' as const) : ('atencao' as const),
      recommendation: hasMechanicalBollards
        ? 'Defensas tubulares ou bate-rodas de concreto instalados para evitar choques veiculares no carregador.'
        : 'Recomenda-se instalação de bate-rodas de piso ou defensas para proteger o carregador contra colisões de estacionamento.'
    },
    {
      rule: 'Sinalização Fotoluminescente de Vaga e Emergência',
      standard: 'NBR 13434 e Instruções Técnicas dos Bombeiros',
      isCompliant: hasPhotoluminescentSignaling,
      severity: hasPhotoluminescentSignaling ? ('ok' as const) : ('atencao' as const),
      recommendation: hasPhotoluminescentSignaling
        ? 'Sinalização de solo e parede em conformidade.'
        : 'Instalar placa fotoluminescente indicativa de ponto de recarga VE e chave de emergência.'
    }
  ];

  // 12. Status de Aprovação pelos Bombeiros
  const missingRequirements: string[] = [];
  if (!hasEmergencyButtonWithin5m) missingRequirements.push('Botoeira de Desligamento de Emergência (EPO) a até 5m');
  if (!hasMechanicalBollards) missingRequirements.push('Defensas mecânicas ou bate-rodas contra colisão');
  if (!hasPhotoluminescentSignaling) missingRequirements.push('Sinalização fotoluminescente padronizada');

  return {
    nominalCurrentA: Number(nominalCurrent.toFixed(1)),
    designCurrentA: Number((nominalCurrent * 1.15).toFixed(1)),
    recommendedBreakerA: recommendedBreaker,
    cableGaugePhaseMM2,
    cableGaugeNeutralMM2,
    cableGaugeProtectionPEMM2,
    conduitRecommendedInch,
    voltageDropPercent: Number(voltageDropPercent.toFixed(2)),
    voltageDropVolts: Number(voltageDropVolts.toFixed(1)),
    isVoltageDropCompliant,
    residualProtection,
    surgeProtection,
    breakerProtection,
    checklistItems,
    fireSafetyStatus: {
      isApproved: missingRequirements.length === 0,
      missingRequirements
    }
  };
}
