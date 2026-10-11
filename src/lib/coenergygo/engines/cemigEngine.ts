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

export function calculateCEMIGSimultaneity(chargerCount: number, hasDLM: boolean = false, isCommercialHub: boolean = false): number {
  if (chargerCount <= 1) return 1.0;
  // Em eletropostos comerciais sem DLM, o fator de simultaneidade é 100% (1.0)
  if (isCommercialHub && !hasDLM) return 1.0;

  if (hasDLM) {
    if (chargerCount <= 4) return 0.70;
    if (chargerCount <= 10) return 0.50;
    if (chargerCount <= 25) return 0.35;
    return 0.25;
  }
  // Curva de demanda para VE sem gerenciamento dinâmico (ND-5.2)
  if (chargerCount === 2) return 0.90;
  if (chargerCount === 3) return 0.85;
  if (chargerCount <= 5) return 0.80;
  if (chargerCount <= 10) return 0.70;
  if (chargerCount <= 20) return 0.60;
  return 0.50;
}

export function evaluateCEMIG(input: UtilitySizingInput): UtilitySizingOutput {
  const { chargers, existingLoadKW, installationType, hasDedicatedTransformer, hasSmartChargingDLM } = input;

  const totalChargersKW = Number(chargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0).toFixed(1));
  const totalChargersCount = chargers.reduce((sum, c) => sum + c.quantity, 0);
  const hasDCCharger = chargers.some(c => c.chargerType === 'DC');
  const isCommercialHub = installationType === 'comercial_eletroposto';
  const nominalTotalLoadKW = Number((existingLoadKW + totalChargersKW).toFixed(1));
  const isNominalLoadAboveBTLimit = nominalTotalLoadKW > 75;

  // Fator de simultaneidade NBR 17019 (Regime Contínuo = 100% / Fs = 1.0)
  // Somente reduz se expressamente habilitado Smart Charging DLM em condomínios
  let fSimult = 1.0;
  if (hasSmartChargingDLM && installationType === 'coletivo_condominio') {
    fSimult = calculateCEMIGSimultaneity(totalChargersCount, true, false);
  } else {
    fSimult = 1.0; // Regime contínuo pleno sem diversificação artificial
  }

  const diversifiedChargersKW = Number((totalChargersKW * fSimult).toFixed(1));
  const totalInstallationLoadKW = Number((existingLoadKW + diversifiedChargersKW).toFixed(1));
  const avgPF = hasDCCharger ? 0.98 : 0.95;
  const calculatedDemandKVA = Number((totalInstallationLoadKW / avgPF).toFixed(1));

  let supplyLevel: 'BT' | 'MT' = 'BT';
  let requiresTransformer = false;
  let recommendedTrafo: number | undefined = undefined;

  // Limite regulatório CEMIG BT é 75 kW (ND-5.1 / ND-5.2). Se demanda > 75 kW ou sem DLM quando carga bruta > 75 kW
  const effectiveDemandForSupply = hasSmartChargingDLM ? totalInstallationLoadKW : nominalTotalLoadKW;
  if (effectiveDemandForSupply > 75 || totalInstallationLoadKW > 75 || hasDedicatedTransformer) {
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

  if (calculatedDemandKVA <= 75.0 && totalInstallationLoadKW <= 75.0) {
    // Tabela 1 e 2 - Baixa Tensão Individual até 75 kVA (CEMIG ND-5.1 MAR/2026)
    if (totalInstallationLoadKW <= 8) category = CEMIG_CATEGORIES['A1'] || CEMIG_CATEGORIES['A'];
    else if (totalInstallationLoadKW <= 16) category = CEMIG_CATEGORIES['B1'];
    else if (totalInstallationLoadKW <= 24) category = CEMIG_CATEGORIES['C1'];
    else if (totalInstallationLoadKW <= 30) category = CEMIG_CATEGORIES['C2'];
    else if (totalInstallationLoadKW <= 38) category = CEMIG_CATEGORIES['C3'];
    else if (totalInstallationLoadKW <= 47.6) category = CEMIG_CATEGORIES['C4'];
    else if (totalInstallationLoadKW <= 57.1) category = CEMIG_CATEGORIES['C5'];
    else category = CEMIG_CATEGORIES['C6'];
  } else {
    // Tabela 4 - Alta Demanda em Baixa Tensão (75.1 a 304 kVA) / Categorias F1 a F9
    let matchedF = CEMIG_CATEGORIES['F2'];
    if (calculatedDemandKVA <= 86.0) matchedF = CEMIG_CATEGORIES['F1'];
    else if (calculatedDemandKVA <= 95.0) matchedF = CEMIG_CATEGORIES['F2'];
    else if (calculatedDemandKVA <= 114.0) matchedF = CEMIG_CATEGORIES['F3'];
    else if (calculatedDemandKVA <= 152.0) matchedF = CEMIG_CATEGORIES['F4'];
    else if (calculatedDemandKVA <= 171.0) matchedF = CEMIG_CATEGORIES['F5'];
    else if (calculatedDemandKVA <= 217.2) matchedF = CEMIG_CATEGORIES['F7_600'] || CEMIG_CATEGORIES['F7_630'];
    else if (calculatedDemandKVA <= 228.0) matchedF = CEMIG_CATEGORIES['F7_630'] || CEMIG_CATEGORIES['F7_600'];
    else if (calculatedDemandKVA <= 266.0) matchedF = CEMIG_CATEGORIES['F8'];
    else matchedF = CEMIG_CATEGORIES['F9'];

    category = {
      ...matchedF,
      categoryName: `${matchedF.categoryName}${requiresTransformer ? ` [Trafo MT ${recommendedTrafo} kVA]` : ''}`
    };

    meteringScheme = `Medição Indireta com 3 TCs (Caixa CM-4) + Caixa Disjuntor ${matchedF.caixaDisjuntor} (ND-5.1 Tabela 4)`;

    actions.push({
      type: 'obrigatoria',
      title: `Padrão Homologado CEMIG: Categoria ${matchedF.categoryId} (${matchedF.maxLimitKW} kVA / Disjuntor ${matchedF.breakerCurrentA}A)`,
      description: `Para a demanda calculada de ${calculatedDemandKVA} kVA (${totalInstallationLoadKW} kW), a norma CEMIG ND-5.1 (Tabela 4) padroniza a Categoria ${matchedF.categoryId}. A instalação exige: Medição indireta em Caixa CM-4 com 3 TCs relação ${matchedF.tcRelacao}A (FT 2,0), Caixa de Disjuntor ${matchedF.caixaDisjuntor} em chapa de aço com disjuntor caixa moldada de ${matchedF.breakerCurrentA}A, condutores de entrada de ${matchedF.cableGaugePhaseMM2} mm² cobre (ou ${matchedF.caboFaseAlMM2} mm² alumínio) e eletroduto de ${matchedF.eletrodutoPol}.`,
      normReference: 'CEMIG ND-5.1 Tabela 4 / ND-5.3'
    });

    if (requiresTransformer) {
      actions.push({
        type: 'alerta',
        title: `Modalidade de Atendimento: Subestação Particular MT (${recommendedTrafo} kVA)`,
        description: `Como a carga calculada (${calculatedDemandKVA} kVA) ultrapassa o limite convencional de 75 kW de Baixa Tensão, o atendimento pode exigir Subestação Particular de Média Tensão (ND-5.3) com transformador de ${recommendedTrafo} kVA. A proteção geral e a medição no secundário do transformador adotam integralmente o padrão padronizado da Categoria ${matchedF.categoryId} (Caixas CM-4 + ${matchedF.caixaDisjuntor} e Disjuntor ${matchedF.breakerCurrentA}A).`,
        normReference: 'CEMIG ND-5.3'
      });
    }
  }

  if (hasDCCharger) {
    actions.push({
      type: 'alerta',
      title: 'Carregador Rápido DC — Avaliação de Harmônicos (PRODIST Módulo 8)',
      description: 'Estações de recarga rápida em corrente contínua são consideradas cargas potencialmente perturbadoras. Deve ser assegurado limite de THD-I <= 5% na conexão.',
      normReference: 'PRODIST Módulo 8 e CEMIG ND-5.30'
    });
  }

  // Comparação com o Padrão Atual do Cliente (CEMIG)
  let currentCategory: UtilityCategorySpec | undefined = undefined;
  if (input.currentStandardCategoryId && CEMIG_CATEGORIES[input.currentStandardCategoryId]) {
    currentCategory = CEMIG_CATEGORIES[input.currentStandardCategoryId];
  }

  const effectiveCurrentLimitKW = input.currentStandardLimitKW || currentCategory?.maxLimitKW || 0;
  
  let isExistingStandardAdequate = true;
  let needsStandardUpgrade = false;
  let headroomInCurrentStandardKW = 0;

  if (effectiveCurrentLimitKW > 0) {
    if (totalInstallationLoadKW <= effectiveCurrentLimitKW) {
      headroomInCurrentStandardKW = Number((effectiveCurrentLimitKW - totalInstallationLoadKW).toFixed(1));
      if (isNominalLoadAboveBTLimit) {
        // Carga bruta ultrapassa 75 kW, mas DLM / simultaneidade reduz a demanda
        isExistingStandardAdequate = true;
        needsStandardUpgrade = false;

        actions.push({
          type: 'alerta',
          title: 'Atenção Normativa: Carga Bruta Excede Limite de BT (75 kW)',
          description: `A soma nominal instalada (${nominalTotalLoadKW} kW = ${totalChargersKW} kW estações + ${existingLoadKW} kW local) supera o limite máximo de Baixa Tensão da CEMIG (75 kW / C6). O atendimento com o padrão atual (${effectiveCurrentLimitKW} kW) só será deferido pela CEMIG mediante apresentação de projeto de Gestão Dinâmica de Carga (DLM) com bloqueio físico em ${effectiveCurrentLimitKW} kW. Sem DLM homologado, a CEMIG exigirá Subestação de Média Tensão (ND-5.3).`,
          normReference: 'CEMIG ND-5.1 § 4.1 e ND-5.3'
        });
      } else {
        isExistingStandardAdequate = true;
        needsStandardUpgrade = false;
        
        actions.push({
          type: 'recomendada',
          title: 'Padrão Atual CEMIG Atende Integralmente',
          description: `O padrão atual do cliente (${currentCategory ? currentCategory.categoryName : `${effectiveCurrentLimitKW} kW`}) possui capacidade suficiente para absorver a nova carga. Folga restante no disjuntor de entrada: ${headroomInCurrentStandardKW} kW. Nenhuma obra de entrada é necessária.`,
          normReference: 'CEMIG ND-5.1'
        });
      }
    } else {
      isExistingStandardAdequate = false;
      needsStandardUpgrade = true;
      headroomInCurrentStandardKW = 0;

      actions.push({
        type: 'alerta',
        title: isNominalLoadAboveBTLimit && totalInstallationLoadKW > 75
          ? 'Carga Excede Baixa Tensão — Exige Média Tensão CEMIG (ND-5.3)'
          : 'Necessidade de Adequação / Aumento de Padrão CEMIG',
        description: isNominalLoadAboveBTLimit && totalInstallationLoadKW > 75
          ? `A demanda total calculada (${totalInstallationLoadKW.toFixed(1)} kW) excede a capacidade máxima de Baixa Tensão da CEMIG (75 kW). Exige projeto de Subestação Particular de Média Tensão (ND-5.3) com transformador de ${recommendedTrafo || 150} kVA ou redução de simultaneidade via DLM.`
          : `A demanda total calculada (${totalInstallationLoadKW.toFixed(1)} kW) excede o limite do padrão atual informado (${effectiveCurrentLimitKW} kW). É necessário solicitar aumento de carga para a Categoria ${category.categoryId} (${category.breakerCurrentA}A) ou aplicar DLM (Gestão Dinâmica) para modular no horário de pico.`,
        normReference: totalInstallationLoadKW > 75 ? 'CEMIG ND-5.3' : 'CEMIG ND-5.1 / ND-5.2'
      });
    }
  } else {
    isExistingStandardAdequate = totalInstallationLoadKW <= category.maxLimitKW;
    needsStandardUpgrade = totalInstallationLoadKW > existingLoadKW && existingLoadKW > 0;
    headroomInCurrentStandardKW = Math.max(0, category.maxLimitKW - totalInstallationLoadKW);
    
    if (needsStandardUpgrade) {
      actions.push({
        type: 'alerta',
        title: 'Aumento de Demanda / Troca de Padrão CEMIG',
        description: `A inclusão dos carregadores eleva a carga total de ${existingLoadKW} kW para ${totalInstallationLoadKW.toFixed(1)} kW. Recomendado adequar para a Categoria ${category.categoryId} (${category.breakerCurrentA}A).`,
        normReference: 'CEMIG ND-5.1 / ND-5.2'
      });
    }
  }

  return {
    utility: 'CEMIG',
    utilityFullName: 'Companhia Energética de Minas Gerais S.A. (CEMIG)',
    applicableStandards: ['ND-5.1', 'ND-5.2', 'ND-5.3', 'ND-5.30', 'REN ANEEL 1000/2021 Art. 550'],
    voltageSupply: supplyLevel === 'BT' ? '127/220V ou 220/380V (Secundário)' : '13.8kV ou 23.1kV (Primário)',
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
