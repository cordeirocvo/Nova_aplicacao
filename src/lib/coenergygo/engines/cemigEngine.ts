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

  // Limite de atendimento CEMIG em Baixa Tensão (ND-5.1):
  // - Categoria C1..C6: até 75 kW / 200A (Medição Direta)
  // - Categoria F1..F9 (Tabela 4): de 75.1 kW a 304 kVA / 800A (Alta Demanda BT com Medição Indireta por TCs, SEM subestação MT obrigatória)
  // Somente migra compulsoriamente para Média Tensão (MT / ND-5.3) se a demanda ultrapassar 304 kVA (800A BT) ou se houver transformador dedicado explicitamente configurado.
  const isAboveMaxBT800A = calculatedDemandKVA > 304.0;
  if (isAboveMaxBT800A || hasDedicatedTransformer) {
    supplyLevel = 'MT';
    requiresTransformer = true;
    recommendedTrafo = selectNormalizedTransformer(calculatedDemandKVA);
  } else {
    supplyLevel = 'BT';
    requiresTransformer = false;
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

  if (input.currentStandardCategoryId === 'A4' || input.currentStandardCategoryId === 'A3a') {
    supplyLevel = 'MT';
    requiresTransformer = false;
    category = CEMIG_CATEGORIES[input.currentStandardCategoryId] || CEMIG_CATEGORIES['A4'];
    meteringScheme = 'Medição em Média Tensão (CEMIG ND-5.3 / Medidor 4 Quadrantes)';
    actions.push({
      type: 'obrigatoria',
      title: `Instalação Atendida em Média Tensão (Grupo ${category.categoryId} — CEMIG ND-5.3)`,
      description: `A unidade consumidora é atendida em Média Tensão com subestação/transformador particular existente. A potência dos carregadores é alimentada diretamente a partir do quadro geral de baixa tensão (QGBT) derivado do transformador do cliente, sem necessidade de novo padrão de baixa tensão na rua.`,
      normReference: 'CEMIG ND-5.3 / ABNT NBR 14039'
    });
  } else if (calculatedDemandKVA <= 75.0 && totalInstallationLoadKW <= 75.0) {
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
        description: `Como a carga calculada (${calculatedDemandKVA} kVA) ultrapassa o limite máximo de 304 kVA de Baixa Tensão (800A), o atendimento exige Subestação Particular de Média Tensão 13.8kV (ND-5.3) com transformador de ${recommendedTrafo} kVA.`,
        normReference: 'CEMIG ND-5.3'
      });
    } else {
      actions.push({
        type: 'recomendada',
        title: `Atendimento em Baixa Tensão 127/220V ou 220/380V (Sem Subestação MT)`,
        description: `Esta instalação é plenamente atendida na rede secundária de Baixa Tensão da CEMIG via Categoria ${matchedF.categoryId} (Tabela 4 da ND-5.1), dispensando construção de subestação particular de média tensão ou compra de transformador de 13.8 kV.`,
        normReference: 'CEMIG ND-5.1 Tabela 4'
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

// ─── 4. MOTOR DE VIABILIDADE FINANCEIRA DE ELETROPOSTOS (HUB DC/AC) ───────────
import { 
  CommercialHubOperationalData, 
  ConfiguredCharger, 
  HubFinancialViabilityResult, 
  ScenarioFinancialProjection 
} from '../types';

export interface CalculateHubViabilityParams {
  chargers: ConfiguredCharger[];
  operationalData?: CommercialHubOperationalData;
  existingPeakKW?: number;
  totalInfrastructureCostBRL?: number;
}

export function calculateHubFinancialViability(params: CalculateHubViabilityParams): HubFinancialViabilityResult {
  const { chargers, operationalData, totalInfrastructureCostBRL = 25000 } = params;

  const totalPowerKW = chargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0) || 120;
  const chargersCount = chargers.reduce((sum, c) => sum + c.quantity, 0) || 2;
  
  const pointsCount = chargers.reduce((sum, c) => {
    const isDual = (c.powerKW >= 60 && c.type === 'DC') || (c.connector && c.connector.includes('2x'));
    return sum + ((isDual ? 2 : 1) * c.quantity);
  }, 0) || chargersCount;

  const sellingPricePerKWh = operationalData?.sellingPricePerKWh || 2.00;
  const gridEnergyCostPerKWh = operationalData?.gridEnergyCostPerKWh || 1.00;
  const solarEnergyCostPerKWh = operationalData?.solarEnergyCostPerKWh || 0.50;
  const variableOpexRate = (operationalData?.variableOpexPercent || 14) / 100;
  const fixedOpexPerPointMonth = operationalData?.fixedOpexPerPointBRL || 474;
  const realEstateModel = operationalData?.realEstateModel || 'comodato';
  const realEstateFixedRent = operationalData?.realEstateFixedRentBRL || 0;
  const realEstateRevenueShareRate = (operationalData?.realEstateRevenueSharePercent || 0) / 100;

  const calculatedEquipmentCapex = chargers.reduce((acc, c) => {
    if (c.powerKW === 80) return acc + (100000 * c.quantity);
    if (c.powerKW === 40) return acc + (55000 * c.quantity);
    if (c.powerKW === 60) return acc + (85000 * c.quantity);
    if (c.type === 'DC') return acc + (c.powerKW * 1250 * c.quantity);
    return acc + (7000 * c.quantity);
  }, 0);

  const equipmentCapexBRL = operationalData?.estimatedSetupCapexBRL 
    ? (operationalData.estimatedSetupCapexBRL * 0.75) 
    : calculatedEquipmentCapex;

  const infrastructureCapexBRL = totalInfrastructureCostBRL;
  const launchMarketingBRL = operationalData?.marketingLaunchBRL || 15000;
  const operationalReserveBRL = (operationalData?.operationalReserveMonths || 3) * (fixedOpexPerPointMonth * pointsCount + 2000);

  const totalCapexBRL = operationalData?.estimatedSetupCapexBRL || (
    equipmentCapexBRL + infrastructureCapexBRL + launchMarketingBRL + operationalReserveBRL
  );

  const buildScenario = (
    scenarioName: 'conservador_4h' | 'realista_6h' | 'agressivo_9h',
    label: string,
    dailyHoursPerPoint: number
  ): ScenarioFinancialProjection => {
    const daysInMonth = 30;
    const monthlyDeliveredKWh = Math.round(totalPowerKW * dailyHoursPerPoint * daysInMonth * 0.90);
    const monthlyGrossRevenueBRL = Number((monthlyDeliveredKWh * sellingPricePerKWh).toFixed(2));
    const energyCostGridBRL = Number((monthlyDeliveredKWh * gridEnergyCostPerKWh).toFixed(2));
    const energyCostSolarBRL = Number((monthlyDeliveredKWh * solarEnergyCostPerKWh).toFixed(2));
    const variableOpexBRL = Number((monthlyGrossRevenueBRL * variableOpexRate).toFixed(2));
    const fixedOpexBRL = Number((fixedOpexPerPointMonth * pointsCount).toFixed(2));

    let realEstateCostBRL = 0;
    if (realEstateModel === 'aluguel_fixo') realEstateCostBRL = realEstateFixedRent;
    else if (realEstateModel === 'revenue_share') realEstateCostBRL = Number((monthlyGrossRevenueBRL * realEstateRevenueShareRate).toFixed(2));
    else if (realEstateModel === 'misto') realEstateCostBRL = Number((realEstateFixedRent + (monthlyGrossRevenueBRL * realEstateRevenueShareRate)).toFixed(2));

    const monthlyNetProfitGridBRL = Number((monthlyGrossRevenueBRL - energyCostGridBRL - variableOpexBRL - fixedOpexBRL - realEstateCostBRL).toFixed(2));
    const monthlyNetProfitSolarBRL = Number((monthlyGrossRevenueBRL - energyCostSolarBRL - variableOpexBRL - fixedOpexBRL - realEstateCostBRL).toFixed(2));
    const annualNetProfitGridBRL = Number((monthlyNetProfitGridBRL * 12).toFixed(2));
    const annualNetProfitSolarBRL = Number((monthlyNetProfitSolarBRL * 12).toFixed(2));

    const paybackMonthsGrid = monthlyNetProfitGridBRL > 0 ? Number((totalCapexBRL / monthlyNetProfitGridBRL).toFixed(1)) : 999;
    const paybackMonthsSolar = monthlyNetProfitSolarBRL > 0 ? Number((totalCapexBRL / monthlyNetProfitSolarBRL).toFixed(1)) : 999;
    const netMarginGridPercent = monthlyGrossRevenueBRL > 0 ? Number(((monthlyNetProfitGridBRL / monthlyGrossRevenueBRL) * 100).toFixed(1)) : 0;
    const netMarginSolarPercent = monthlyGrossRevenueBRL > 0 ? Number(((monthlyNetProfitSolarBRL / monthlyGrossRevenueBRL) * 100).toFixed(1)) : 0;

    return {
      scenarioName, label, dailyHoursPerPoint, monthlyDeliveredKWh, monthlyGrossRevenueBRL,
      energyCostGridBRL, energyCostSolarBRL, variableOpexBRL, fixedOpexBRL, realEstateCostBRL,
      monthlyNetProfitGridBRL, monthlyNetProfitSolarBRL, annualNetProfitGridBRL, annualNetProfitSolarBRL,
      paybackMonthsGrid, paybackMonthsSolar, netMarginGridPercent, netMarginSolarPercent
    };
  };

  const conservative4h = buildScenario('conservador_4h', 'Cenário Conservador (4h/dia)', 4.0);
  const realistic6h = buildScenario('realista_6h', 'Cenário Realista (6h/dia)', 6.0);
  const aggressive9h = buildScenario('agressivo_9h', 'Cenário Otimista (9h/dia)', 9.0);

  const fiveYearsProjection = [
    {
      year: 1,
      activePoints: pointsCount,
      averageDailyHours: 4.5,
      energySource: 'solar_mista' as const,
      annualDeliveredKWh: Math.round(totalPowerKW * 4.5 * 365 * 0.90),
      annualGrossRevenueBRL: Math.round(totalPowerKW * 4.5 * 365 * 0.90 * sellingPricePerKWh),
      annualNetProfitBRL: Math.round((conservative4h.monthlyNetProfitGridBRL * 8) + (conservative4h.monthlyNetProfitSolarBRL * 4)),
      cumulativeCashFlowBRL: Math.round(((conservative4h.monthlyNetProfitGridBRL * 8) + (conservative4h.monthlyNetProfitSolarBRL * 4)) - totalCapexBRL)
    },
    {
      year: 2,
      activePoints: pointsCount + 1,
      averageDailyHours: 6.0,
      energySource: 'solar_integral' as const,
      annualDeliveredKWh: Math.round((totalPowerKW * 1.5) * 6.0 * 365 * 0.90),
      annualGrossRevenueBRL: Math.round((totalPowerKW * 1.5) * 6.0 * 365 * 0.90 * sellingPricePerKWh),
      annualNetProfitBRL: Math.round(realistic6h.annualNetProfitSolarBRL * 1.25),
      cumulativeCashFlowBRL: 0
    },
    {
      year: 3,
      activePoints: pointsCount + 3,
      averageDailyHours: 6.0,
      energySource: 'solar_integral' as const,
      annualDeliveredKWh: Math.round((totalPowerKW * 2.5) * 6.0 * 365 * 0.90),
      annualGrossRevenueBRL: Math.round((totalPowerKW * 2.5) * 6.0 * 365 * 0.90 * sellingPricePerKWh),
      annualNetProfitBRL: Math.round(realistic6h.annualNetProfitSolarBRL * 2.2),
      cumulativeCashFlowBRL: 0
    },
    {
      year: 4,
      activePoints: pointsCount + 6,
      averageDailyHours: 6.5,
      energySource: 'solar_integral' as const,
      annualDeliveredKWh: Math.round((totalPowerKW * 4.0) * 6.5 * 365 * 0.90),
      annualGrossRevenueBRL: Math.round((totalPowerKW * 4.0) * 6.5 * 365 * 0.90 * sellingPricePerKWh),
      annualNetProfitBRL: Math.round(realistic6h.annualNetProfitSolarBRL * 3.8),
      cumulativeCashFlowBRL: 0
    },
    {
      year: 5,
      activePoints: pointsCount + 10,
      averageDailyHours: 7.0,
      energySource: 'solar_integral' as const,
      annualDeliveredKWh: Math.round((totalPowerKW * 6.0) * 7.0 * 365 * 0.90),
      annualGrossRevenueBRL: Math.round((totalPowerKW * 6.0) * 7.0 * 365 * 0.90 * sellingPricePerKWh),
      annualNetProfitBRL: Math.round(realistic6h.annualNetProfitSolarBRL * 5.8),
      cumulativeCashFlowBRL: 0
    }
  ];

  let runningCashFlow = -totalCapexBRL;
  for (let i = 0; i < fiveYearsProjection.length; i++) {
    runningCashFlow += fiveYearsProjection[i].annualNetProfitBRL;
    fiveYearsProjection[i].cumulativeCashFlowBRL = Math.round(runningCashFlow);
  }

  const discountRate = 0.12;
  let npvGrid = -totalCapexBRL;
  let npvSolar = -totalCapexBRL;
  for (let yr = 1; yr <= 5; yr++) {
    const cfGrid = conservative4h.annualNetProfitGridBRL;
    const cfSolar = (yr === 1 ? fiveYearsProjection[0].annualNetProfitBRL : realistic6h.annualNetProfitSolarBRL);
    npvGrid += cfGrid / Math.pow(1 + discountRate, yr);
    npvSolar += cfSolar / Math.pow(1 + discountRate, yr);
  }

  const annualReturnRateGrid = (conservative4h.annualNetProfitGridBRL / totalCapexBRL);
  const irrPercentGrid = Number((annualReturnRateGrid * 100 * 0.85).toFixed(1));
  const annualReturnRateSolar = (conservative4h.annualNetProfitSolarBRL / totalCapexBRL);
  const irrPercentSolar = Number((annualReturnRateSolar * 100 * 0.88).toFixed(1));

  const trafficFlow = 9.0;
  const visibility = 9.0;
  const accessibility = 9.0;
  const anchorConvenience = 8.5;
  const energyCapacityBT = totalPowerKW <= 304 ? 9.5 : 7.0; // Até 304 kVA atendido em BT pela Tabela 4 CEMIG Grupo F
  const overallScore = Number(((trafficFlow + visibility + accessibility + anchorConvenience + energyCapacityBT) / 5).toFixed(1));

  return {
    totalPowerKW, chargersCount, pointsCount, totalCapexBRL, equipmentCapexBRL, infrastructureCapexBRL,
    launchMarketingBRL, operationalReserveBRL,
    scenarios: { conservative4h, realistic6h, aggressive9h },
    fiveYearsProjection, irrPercentGrid, irrPercentSolar,
    npvGridBRL: Math.round(npvGrid), npvSolarBRL: Math.round(npvSolar),
    locationScore: {
      trafficFlow, visibility, accessibility, anchorConvenience, energyCapacityBT, overallScore,
      verdict: overallScore >= 8.5 ? 'EXCELENTE' : overallScore >= 7.0 ? 'BOM' : 'REGULAR'
    }
  };
}
