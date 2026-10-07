/**
 * CoenergyGO — Motor Normativo Grupo Energisa (NDU 042, NDU 001, NDU 002)
 * Cordeiro Energia
 * 
 * Normas Implementadas:
 * - NDU 042: Fornecimento de Energia para Estações de Recarga de Veículo Elétrico
 * - NDU 001: Fornecimento em Baixa Tensão (Padrões de Entrada BT)
 * - NDU 002: Fornecimento em Média Tensão (Subestações Aéreas e Abrigadas MT)
 */

import { UtilitySizingInput, UtilitySizingOutput, ComplianceAction, UtilityCategorySpec } from '../types';
import { ENERGISA_CATEGORIES, selectNormalizedTransformer } from '../database/utilities';

export function evaluateEnergisa(input: UtilitySizingInput): UtilitySizingOutput {
  const { chargers, existingLoadKW, installationType, hasDedicatedTransformer, hasSmartChargingDLM } = input;

  const totalChargersKW = Number(chargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0).toFixed(1));
  const totalChargersCount = chargers.reduce((sum, c) => sum + c.quantity, 0);
  const hasDCCharger = chargers.some(c => c.chargerType === 'DC');
  const nominalTotalLoadKW = Number((existingLoadKW + totalChargersKW).toFixed(1));
  const isNominalLoadAboveBTLimit = nominalTotalLoadKW > 75;

  let fSimult = 1.0;
  if (installationType === 'coletivo_condominio') {
    if (hasSmartChargingDLM) {
      fSimult = totalChargersCount <= 4 ? 0.70 : totalChargersCount <= 10 ? 0.50 : 0.35;
    } else {
      fSimult = totalChargersCount <= 2 ? 0.90 : totalChargersCount <= 5 ? 0.80 : totalChargersCount <= 10 ? 0.70 : 0.50;
    }
  } else if (installationType === 'comercial_eletroposto') {
    fSimult = hasSmartChargingDLM
      ? (totalChargersCount <= 4 ? 0.70 : totalChargersCount <= 10 ? 0.50 : 0.35)
      : 1.0;
  }

  const diversifiedChargersKW = Number((totalChargersKW * fSimult).toFixed(1));
  const totalInstallationLoadKW = Number((existingLoadKW + diversifiedChargersKW).toFixed(1));
  const avgPF = hasDCCharger ? 0.98 : 0.95;
  const calculatedDemandKVA = Number((totalInstallationLoadKW / avgPF).toFixed(1));

  let supplyLevel: 'BT' | 'MT' = 'BT';
  let requiresTransformer = false;
  let recommendedTrafo: number | undefined = undefined;

  // Limite BT Energisa NDU 001 é 75 kW
  const effectiveDemandForSupply = hasSmartChargingDLM ? totalInstallationLoadKW : nominalTotalLoadKW;
  if (effectiveDemandForSupply > 75 || totalInstallationLoadKW > 75 || hasDedicatedTransformer) {
    supplyLevel = 'MT';
    requiresTransformer = true;
    recommendedTrafo = selectNormalizedTransformer(calculatedDemandKVA);
  }

  const actions: ComplianceAction[] = [];
  const notes: string[] = [];

  actions.push({
    type: 'obrigatoria',
    title: 'Aplicação da Norma Específica Energisa NDU 042',
    description: 'A instalação deve atender integralmente à norma NDU 042 para estações de recarga de VE, prevendo proteção termomagnética e diferencial residual Tipo B ou Tipo A com RDC-DD.',
    normReference: 'Energisa NDU 042'
  });

  let category: UtilityCategorySpec;
  let meteringScheme = 'Medição Individual NDU 001';

  if (installationType === 'coletivo_condominio') {
    meteringScheme = 'Centro de Medição Coletiva ou Painel de Serviços Comuns (NDU 001/042)';
    actions.push({
      type: 'obrigatoria',
      title: 'Adequação Coletiva — Energisa NDU 042 / NDU 001',
      description: 'Em condomínios coletivos na concessão da Energisa, deve ser apresentado diagrama unifilar detalhando a divisão de circuitos dos pontos de recarga e o estudo de carga do ramal geral.',
      normReference: 'Energisa NDU 042 § 5'
    });
  }

  if (supplyLevel === 'BT') {
    if (totalInstallationLoadKW <= 10) category = ENERGISA_CATEGORIES['M-1'];
    else if (totalInstallationLoadKW <= 15) category = ENERGISA_CATEGORIES['B-1'];
    else if (totalInstallationLoadKW <= 38) category = ENERGISA_CATEGORIES['T-1'];
    else if (totalInstallationLoadKW <= 50) category = ENERGISA_CATEGORIES['T-2'];
    else category = ENERGISA_CATEGORIES['T-3'];
  } else {
    category = {
      categoryId: 'MT-NDU002',
      categoryName: `Posto de Transformação / Subestação Energisa NDU 002 (${recommendedTrafo} kVA)`,
      phases: 3,
      voltage: '13.8 kV ou 34.5 kV / 380-220V',
      maxLimitKW: (recommendedTrafo || 150) * 0.95,
      breakerCurrentA: Math.round(((recommendedTrafo || 150) * 1000) / (Math.sqrt(3) * 380)),
      cableGaugePhaseMM2: 120,
      cableGaugeNeutralMM2: 120,
      cableGaugeGroundMM2: 70,
      meterBoxType: 'Subestação Aérea em Poste ou Cabine Abrigada (NDU 002)'
    };

    actions.push({
      type: 'obrigatoria',
      title: 'Projeto Elétrico de Subestação MT Energisa (NDU 002)',
      description: `Demanda calculada de ${calculatedDemandKVA} kVA excede 75 kW. Exige subestação particular de MT com transformador de ${recommendedTrafo} kVA e ART.`,
      normReference: 'Energisa NDU 002'
    });
  }

  // Comparação com o Padrão Atual do Cliente (Energisa)
  let currentCategory: UtilityCategorySpec | undefined = undefined;
  if (input.currentStandardCategoryId && ENERGISA_CATEGORIES[input.currentStandardCategoryId]) {
    currentCategory = ENERGISA_CATEGORIES[input.currentStandardCategoryId];
  }

  const effectiveCurrentLimitKW = input.currentStandardLimitKW || currentCategory?.maxLimitKW || 0;
  
  let isExistingStandardAdequate = true;
  let needsStandardUpgrade = false;
  let headroomInCurrentStandardKW = 0;

  if (effectiveCurrentLimitKW > 0) {
    if (totalInstallationLoadKW <= effectiveCurrentLimitKW) {
      isExistingStandardAdequate = true;
      needsStandardUpgrade = false;
      headroomInCurrentStandardKW = Number((effectiveCurrentLimitKW - totalInstallationLoadKW).toFixed(1));
      
      actions.push({
        type: 'recomendada',
        title: 'Padrão Atual Energisa Atende Integralmente',
        description: `O padrão atual informado (${currentCategory ? currentCategory.categoryName : `${effectiveCurrentLimitKW} kW`}) possui capacidade para absorver a nova demanda. Folga restante no disjuntor: ${headroomInCurrentStandardKW} kW.`,
        normReference: 'Energisa NDU 001'
      });
    } else {
      isExistingStandardAdequate = false;
      needsStandardUpgrade = true;
      headroomInCurrentStandardKW = 0;

      actions.push({
        type: 'alerta',
        title: 'Necessidade de Adequação / Aumento de Padrão Energisa',
        description: `A demanda calculada (${totalInstallationLoadKW.toFixed(1)} kW) excede o padrão atual informado (${effectiveCurrentLimitKW} kW). É necessário solicitar aumento de carga para a Categoria ${category.categoryId} (${category.breakerCurrentA}A) ou acionar o DLM.`,
        normReference: 'Energisa NDU 001 / NDU 042'
      });
    }
  } else {
    isExistingStandardAdequate = totalInstallationLoadKW <= category.maxLimitKW;
    needsStandardUpgrade = totalInstallationLoadKW > existingLoadKW && existingLoadKW > 0;
    headroomInCurrentStandardKW = Math.max(0, category.maxLimitKW - totalInstallationLoadKW);

    if (needsStandardUpgrade) {
      actions.push({
        type: 'alerta',
        title: 'Solicitação de Aumento de Carga na Energisa',
        description: `A inclusão dos carregadores eleva a carga total para ${totalInstallationLoadKW.toFixed(1)} kW. Recomendado adequar para a Categoria ${category.categoryId} (${category.breakerCurrentA}A).`,
        normReference: 'Energisa NDU 001'
      });
    }
  }

  return {
    utility: 'ENERGISA',
    utilityFullName: 'Grupo Energisa (Cataguases, PB, MS, MT, TO, SE, RO, AC)',
    applicableStandards: ['NDU 042 (Estações de Recarga VE)', 'NDU 001 (BT)', 'NDU 002 (MT)'],
    voltageSupply: supplyLevel === 'BT' ? '127/220V ou 220/380V (Secundário)' : '13.8kV ou 34.5kV (Primário)',
    totalChargersKW,
    nominalTotalLoadKW,
    isNominalLoadAboveBTLimit,
    simultaneityFactorApplied: fSimult,
    diversifiedChargersKW: Number(diversifiedChargersKW.toFixed(1)),
    totalInstallationLoadKW: Number(totalInstallationLoadKW.toFixed(1)),
    calculatedDemandKVA,
    supplyLevel,
    category,
    currentCategory,
    isExistingStandardAdequate,
    headroomInCurrentStandardKW,
    requiresTransformer,
    recommendedTransformerKVA: recommendedTrafo,
    meteringScheme,
    needsStandardUpgrade,
    actions,
    notes
  };
}
