/**
 * CoenergyGO — Motor Normativo CPFL Energia (GED-150030, GED-13, GED-119)
 * Cordeiro Energia
 * 
 * Normas Implementadas:
 * - GED-150030: Critérios de Acesso ao Sistema Elétrico da CPFL com Estação de Recarga de VE
 * - GED-13: Fornecimento em Tensão Secundária de Distribuição (BT Individual)
 * - GED-119: Fornecimento a Edificações de Uso Coletivo
 * - GED-11: Fornecimento em Média Tensão (Subestações Aéreas e Abrigadas)
 */

import { UtilitySizingInput, UtilitySizingOutput, ComplianceAction, UtilityCategorySpec } from '../types';
import { CPFL_CATEGORIES, selectNormalizedTransformer } from '../database/utilities';

export function evaluateCPFL(input: UtilitySizingInput): UtilitySizingOutput {
  const { chargers, existingLoadKW, installationType, hasDedicatedTransformer, hasSmartChargingDLM } = input;

  const totalChargersKW = Number(chargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0).toFixed(1));
  const totalChargersCount = chargers.reduce((sum, c) => sum + c.quantity, 0);
  const hasDCCharger = chargers.some(c => c.chargerType === 'DC');
  const nominalTotalLoadKW = Number((existingLoadKW + totalChargersKW).toFixed(1));
  const isNominalLoadAboveBTLimit = nominalTotalLoadKW > 75;

  // Fator de simultaneidade conforme CPFL GED-150030
  let fSimult = 1.0;
  if (installationType === 'coletivo_condominio') {
    if (hasSmartChargingDLM) {
      fSimult = totalChargersCount <= 4 ? 0.70 : totalChargersCount <= 10 ? 0.50 : 0.35;
    } else {
      fSimult = totalChargersCount <= 2 ? 0.90 : totalChargersCount <= 5 ? 0.80 : totalChargersCount <= 10 ? 0.70 : 0.55;
    }
  } else if (installationType === 'comercial_eletroposto') {
    fSimult = hasSmartChargingDLM
      ? (totalChargersCount <= 4 ? 0.70 : totalChargersCount <= 10 ? 0.50 : 0.35)
      : 1.0; // Sem DLM em eletroposto comercial, 100%
  }

  const diversifiedChargersKW = Number((totalChargersKW * fSimult).toFixed(1));
  const totalInstallationLoadKW = Number((existingLoadKW + diversifiedChargersKW).toFixed(1));
  const avgPF = hasDCCharger ? 0.98 : 0.95;
  const calculatedDemandKVA = Number((totalInstallationLoadKW / avgPF).toFixed(1));

  let supplyLevel: 'BT' | 'MT' = 'BT';
  let requiresTransformer = false;
  let recommendedTrafo: number | undefined = undefined;

  // Limite BT CPFL GED-13 é 75 kW
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
    title: 'Conformidade com a Norma CPFL GED-150030',
    description: 'A estação de recarga deve atender aos critérios de acesso da norma técnica GED-150030, incluindo dispositivo de seccionamento visível e coordenação de proteções.',
    normReference: 'CPFL GED-150030'
  });

  let category: UtilityCategorySpec;
  let meteringScheme = 'Medição Individual BT (GED-13)';

  if (installationType === 'coletivo_condominio') {
    meteringScheme = 'Quadro Coletivo de Medição Agrupada (GED-119)';
    actions.push({
      type: 'obrigatoria',
      title: 'Adequação Coletiva — CPFL GED-119',
      description: 'Em condomínios verticais ou horizontais, o ponto de conexão deve derivar do quadro geral de distribuição do condomínio ou de prumada com centro de medição individualizada.',
      normReference: 'CPFL GED-119'
    });
  }

  if (supplyLevel === 'BT') {
    if (totalInstallationLoadKW <= 12) category = CPFL_CATEGORIES['M1'];
    else if (totalInstallationLoadKW <= 25) category = CPFL_CATEGORIES['B1'];
    else if (totalInstallationLoadKW <= 38) category = CPFL_CATEGORIES['T1'];
    else if (totalInstallationLoadKW <= 50) category = CPFL_CATEGORIES['T2'];
    else category = CPFL_CATEGORIES['T3'];
  } else {
    category = {
      categoryId: 'MT-GED11',
      categoryName: `Subestação Primária de Média Tensão CPFL (${recommendedTrafo} kVA)`,
      phases: 3,
      voltage: '13.8 kV ou 34.5 kV',
      maxLimitKW: (recommendedTrafo || 150) * 0.95,
      breakerCurrentA: Math.round(((recommendedTrafo || 150) * 1000) / (Math.sqrt(3) * 380)),
      cableGaugePhaseMM2: 120,
      cableGaugeNeutralMM2: 120,
      cableGaugeGroundMM2: 70,
      meterBoxType: 'Cabine de Alvenaria ou Subestação Aérea em Poste (GED-11)'
    };

    actions.push({
      type: 'obrigatoria',
      title: 'Projeto Elétrico de Subestação MT CPFL (GED-11)',
      description: `Demanda de ${calculatedDemandKVA} kVA exige subestação primária com transformador de ${recommendedTrafo} kVA conforme norma GED-11.`,
      normReference: 'CPFL GED-11'
    });
  }

  // Comparação com o Padrão Atual do Cliente (CPFL)
  let currentCategory: UtilityCategorySpec | undefined = undefined;
  if (input.currentStandardCategoryId && CPFL_CATEGORIES[input.currentStandardCategoryId]) {
    currentCategory = CPFL_CATEGORIES[input.currentStandardCategoryId];
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
        title: 'Padrão Atual CPFL Atende Integralmente',
        description: `O padrão atual (${currentCategory ? currentCategory.categoryName : `${effectiveCurrentLimitKW} kW`}) possui capacidade suficiente para absorver a nova demanda. Folga restante: ${headroomInCurrentStandardKW} kW.`,
        normReference: 'CPFL GED-13'
      });
    } else {
      isExistingStandardAdequate = false;
      needsStandardUpgrade = true;
      headroomInCurrentStandardKW = 0;

      actions.push({
        type: 'alerta',
        title: 'Necessidade de Adequação / Aumento de Padrão CPFL',
        description: `A demanda calculada (${totalInstallationLoadKW.toFixed(1)} kW) excede o padrão atual informado (${effectiveCurrentLimitKW} kW). Necessário solicitar aumento de carga para a Categoria ${category.categoryId} (${category.breakerCurrentA}A) ou acionar o DLM.`,
        normReference: 'CPFL GED-13 / GED-119'
      });
    }
  } else {
    isExistingStandardAdequate = totalInstallationLoadKW <= category.maxLimitKW;
    needsStandardUpgrade = totalInstallationLoadKW > existingLoadKW && existingLoadKW > 0;
    headroomInCurrentStandardKW = Math.max(0, category.maxLimitKW - totalInstallationLoadKW);

    if (needsStandardUpgrade) {
      actions.push({
        type: 'alerta',
        title: 'Aumento de Carga Solicitado na CPFL',
        description: `Carga total estimada em ${totalInstallationLoadKW.toFixed(1)} kW. Recomendado adequar para a Categoria ${category.categoryId} (${category.breakerCurrentA}A).`,
        normReference: 'CPFL GED-13 / GED-119'
      });
    }
  }

  return {
    utility: 'CPFL',
    utilityFullName: 'CPFL Energia (Paulista / Piratininga / Santa Cruz / RGE)',
    applicableStandards: ['GED-150030 (Acesso VE)', 'GED-13 (BT Individual)', 'GED-119 (Edificações Coletivas)', 'GED-11 (MT)'],
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
