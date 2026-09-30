/**
 * CoenergyGO — Motor Normativo CEMIG (ND-5.1, ND-5.2, ND-5.3)
 * Cordeiro Energia
 * 
 * Normas Implementadas:
 * - ND-5.1: Fornecimento em Baixa Tensão a Edificações Individuais
 * - ND-5.2: Fornecimento a Edificações Coletivas (Condomínios) e Fatores de Simultaneidade
 * - ND-5.3: Fornecimento em Média Tensão (13.8 kV a 34.5 kV) e Subestações Particulares
 * - Resolução Normativa ANEEL nº 1000/2021 (Art. 550: Comunicação Prévia Obrigatória)
 */

import { UtilitySizingInput, UtilitySizingOutput, ComplianceAction, UtilityCategorySpec } from '../types';
import { CEMIG_CATEGORIES, selectNormalizedTransformer } from '../database/utilities';

export function calculateCEMIGSimultaneity(chargerCount: number, hasDLM: boolean = false): number {
  if (chargerCount <= 1) return 1.0;
  if (hasDLM) {
    if (chargerCount <= 4) return 0.70;
    if (chargerCount <= 10) return 0.50;
    if (chargerCount <= 25) return 0.35;
    return 0.25;
  }
  // Curva de demanda para VE sem gerenciamento dinâmico
  if (chargerCount === 2) return 0.90;
  if (chargerCount === 3) return 0.85;
  if (chargerCount <= 5) return 0.80;
  if (chargerCount <= 10) return 0.70;
  if (chargerCount <= 20) return 0.60;
  return 0.50;
}

export function evaluateCEMIG(input: UtilitySizingInput): UtilitySizingOutput {
  const { chargers, existingLoadKW, installationType, hasDedicatedTransformer, hasSmartChargingDLM } = input;

  const totalChargersKW = chargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0);
  const totalChargersCount = chargers.reduce((sum, c) => sum + c.quantity, 0);
  const hasDCCharger = chargers.some(c => c.chargerType === 'DC');

  // Fator de simultaneidade
  let fSimult = 1.0;
  if (installationType === 'coletivo_condominio' || installationType === 'comercial_eletroposto') {
    fSimult = calculateCEMIGSimultaneity(totalChargersCount, hasSmartChargingDLM);
  }

  const diversifiedChargersKW = totalChargersKW * fSimult;
  const totalInstallationLoadKW = existingLoadKW + diversifiedChargersKW;
  const avgPF = hasDCCharger ? 0.98 : 0.95;
  const calculatedDemandKVA = Number((totalInstallationLoadKW / avgPF).toFixed(1));

  let supplyLevel: 'BT' | 'MT' = 'BT';
  let requiresTransformer = false;
  let recommendedTrafo: number | undefined = undefined;

  // Limite regulatório CEMIG BT é 75 kW
  if (totalInstallationLoadKW > 75 || hasDedicatedTransformer) {
    supplyLevel = 'MT';
    requiresTransformer = true;
    recommendedTrafo = selectNormalizedTransformer(calculatedDemandKVA);
  }

  const actions: ComplianceAction[] = [];
  const notes: string[] = [];

  // Ação Compulsória ANEEL 1000 Art. 550
  actions.push({
    type: 'obrigatoria',
    title: 'Comunicação Prévia Obrigatória à CEMIG (Art. 550 REN 1000/2021)',
    description: 'A instalação de estações de recarga de VE deve ser formalmente comunicada à CEMIG antes da energização para avaliação de carregamento do transformador de rua e ramal.',
    normReference: 'Art. 550 da Resolução Normativa ANEEL nº 1000/2021'
  });

  let category: UtilityCategorySpec;
  let meteringScheme = 'Medição Individual Direta (ND-5.1)';

  if (installationType === 'coletivo_condominio') {
    meteringScheme = 'Centro de Medição Coletiva ou Prumada Dedicada VE (ND-5.2)';
    actions.push({
      type: 'obrigatoria',
      title: 'Adequação do Padrão Agrupado — CEMIG ND-5.2',
      description: 'Em condomínios, a carga dos carregadores pode ser conectada ao painel de serviço geral (com submedição inteligente) ou derivar novo centro de medição agrupada homologado pela CEMIG.',
      normReference: 'CEMIG ND-5.2 § 4 e § 6'
    });
  }

  if (supplyLevel === 'BT') {
    if (totalInstallationLoadKW <= 8) category = CEMIG_CATEGORIES['A'];
    else if (totalInstallationLoadKW <= 12) category = CEMIG_CATEGORIES['B1'];
    else if (totalInstallationLoadKW <= 16) category = CEMIG_CATEGORIES['B2'];
    else if (totalInstallationLoadKW <= 24) category = CEMIG_CATEGORIES['C1'];
    else if (totalInstallationLoadKW <= 30) category = CEMIG_CATEGORIES['C2'];
    else if (totalInstallationLoadKW <= 38) category = CEMIG_CATEGORIES['C3'];
    else if (totalInstallationLoadKW <= 47) category = CEMIG_CATEGORIES['C4'];
    else category = CEMIG_CATEGORIES['C5'];
  } else {
    category = {
      categoryId: 'MT-ND5.3',
      categoryName: `Subestação Particular de Média Tensão CEMIG (${recommendedTrafo} kVA)`,
      phases: 3,
      voltage: '13.8 kV ou 23.1 kV / 380-220V',
      maxLimitKW: (recommendedTrafo || 150) * 0.95,
      breakerCurrentA: Math.round(((recommendedTrafo || 150) * 1000) / (Math.sqrt(3) * 380)),
      cableGaugePhaseMM2: 120,
      cableGaugeNeutralMM2: 120,
      cableGaugeGroundMM2: 70,
      meterBoxType: 'Cubículo Blindado / Cabine Abrigada de Média Tensão com Relé 50/51'
    };

    actions.push({
      type: 'obrigatoria',
      title: 'Projeto Elétrico de Subestação MT CEMIG (ND-5.3)',
      description: `Demanda calculada de ${calculatedDemandKVA} kVA excede o limite máximo de BT da CEMIG (75 kW). Exige projeto elétrico de subestação com transformador de ${recommendedTrafo} kVA e ART.`,
      normReference: 'CEMIG ND-5.3'
    });
  }

  if (hasDCCharger) {
    actions.push({
      type: 'alerta',
      title: 'Carregador Rápido DC — Avaliação de Harmônicos (PRODIST Módulo 8)',
      description: 'Estações de recarga rápida em corrente contínua são consideradas cargas potencialmente perturbadoras. Deve ser assegurado limite de THD-I <= 5% na conexão.',
      normReference: 'PRODIST Módulo 8 e CEMIG ND-5.30'
    });
  }

  const needsStandardUpgrade = totalInstallationLoadKW > existingLoadKW && existingLoadKW > 0;
  if (needsStandardUpgrade) {
    actions.push({
      type: 'alerta',
      title: 'Aumento de Demanda / Troca de Padrão CEMIG',
      description: `A inclusão dos carregadores eleva a carga total de ${existingLoadKW} kW para ${totalInstallationLoadKW.toFixed(1)} kW, exigindo substituição do disjuntor geral e cabos de entrada.`,
      normReference: 'CEMIG ND-5.1 / ND-5.2'
    });
  }

  return {
    utility: 'CEMIG',
    utilityFullName: 'Companhia Energética de Minas Gerais S.A. (CEMIG)',
    applicableStandards: ['ND-5.1', 'ND-5.2', 'ND-5.3', 'ND-5.30', 'REN ANEEL 1000/2021 Art. 550'],
    voltageSupply: '127/220V ou 220/380V (Secundário) / 13.8kV ou 23.1kV (Primário)',
    totalChargersKW,
    simultaneityFactorApplied: fSimult,
    diversifiedChargersKW: Number(diversifiedChargersKW.toFixed(1)),
    totalInstallationLoadKW: Number(totalInstallationLoadKW.toFixed(1)),
    calculatedDemandKVA,
    supplyLevel,
    category,
    requiresTransformer,
    recommendedTransformerKVA: recommendedTrafo,
    meteringScheme,
    needsStandardUpgrade,
    actions,
    notes
  };
}
