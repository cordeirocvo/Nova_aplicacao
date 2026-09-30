/**
 * Motores de Cálculo Normativo de Concessionárias para Estações de Recarga VE
 * CoenergyGO — Mobilidade Elétrica Inteligente (Cordeiro Energia)
 * 
 * Normas Implementadas com Rigor Técnico:
 * 1. CEMIG: ND-5.1 (BT Individual), ND-5.2 (Edificações Coletivas), ND-5.3 (Média Tensão) e REN 1000/2021 Art. 550
 * 2. CPFL Energia: GED-150030 (Acesso VE), GED-13 (BT Individual), GED-119 (Uso Coletivo)
 * 3. ENERGISA: NDU 042 (Estações de Recarga VE), NDU 001 (BT) e NDU 002 (MT)
 * 4. ENEL: Regulamento LIG BT / LIG MT e Diretrizes de Acesso para SAVE
 */

export interface ChargerItem {
  powerKW: number;
  quantity: number;
  phases: 1 | 3;
  chargerType: 'AC' | 'DC';
}

export interface UtilityAnalysisInput {
  utility: 'CEMIG' | 'CPFL' | 'ENERGISA' | 'ENEL_SP' | 'ENEL_RJ';
  chargers: ChargerItem[];
  existingLoadKW: number; // Demanda/carga instalada atual da edificação
  location: 'urbano' | 'rural';
  installationType: 'individual' | 'coletivo_condominio' | 'comercial_eletroposto';
  hasDedicatedTransformer?: boolean;
  contractedDemandKVA?: number; // Para clientes do Grupo A (MT)
}

export interface UtilityCategoryResult {
  categoryId: string;
  categoryName: string;
  phases: 1 | 2 | 3;
  voltage: string;
  maxLimitKW: number;
  breakerCurrentA: number;
  cableGaugeMM2: number;
  neutralGaugeMM2: number;
  groundGaugeMM2: number;
  meterBoxType: string;
}

export interface ComplianceAction {
  type: 'obrigatoria' | 'recomendada' | 'alerta';
  title: string;
  description: string;
  normReference: string;
}

export interface UtilityAnalysisResult {
  utility: string;
  utilityFullName: string;
  applicableStandards: string[];
  voltageSupply: string;
  
  // Potências e Cargas
  totalChargersKW: number;
  simultaneityFactorApplied: number;
  diversifiedChargersKW: number;
  totalInstallationLoadKW: number;
  calculatedDemandKVA: number;
  
  // Nível de Atendimento
  supplyLevel: 'BT' | 'MT' | 'AT';
  category: UtilityCategoryResult;
  requiresTransformer: boolean;
  recommendedTransformerKVA?: number;
  
  // Diretrizes Específicas
  meteringScheme: string; // Individualizada, agrupamento ou medição exclusiva
  isApprovedInCurrentStandard: boolean;
  needsStandardUpgrade: boolean;
  actions: ComplianceAction[];
  notes: string[];
}

// ─── TABELAS CEMIG (ND-5.1, ND-5.2, ND-5.3) ──────────────────────────────────

export const CEMIG_BT_CATEGORIES: Record<string, UtilityCategoryResult> = {
  'A': {
    categoryId: 'A',
    categoryName: 'Monofásico até 8 kW',
    phases: 1,
    voltage: '127/220V',
    maxLimitKW: 8,
    breakerCurrentA: 40,
    cableGaugeMM2: 10,
    neutralGaugeMM2: 10,
    groundGaugeMM2: 10,
    meterBoxType: 'CM-1 (Caixa Monofásica de Sobrepor ou Embutir)'
  },
  'B1': {
    categoryId: 'B1',
    categoryName: 'Bifásico até 12 kW',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 12,
    breakerCurrentA: 50,
    cableGaugeMM2: 10,
    neutralGaugeMM2: 10,
    groundGaugeMM2: 10,
    meterBoxType: 'CM-2 (Caixa Polifásica)'
  },
  'B2': {
    categoryId: 'B2',
    categoryName: 'Bifásico até 16 kW',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 16,
    breakerCurrentA: 63,
    cableGaugeMM2: 16,
    neutralGaugeMM2: 16,
    groundGaugeMM2: 10,
    meterBoxType: 'CM-2 (Caixa Polifásica)'
  },
  'C1': {
    categoryId: 'C1',
    categoryName: 'Trifásico até 24 kW',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 24,
    breakerCurrentA: 63,
    cableGaugeMM2: 16,
    neutralGaugeMM2: 16,
    groundGaugeMM2: 10,
    meterBoxType: 'CM-2 / CM-3 (Medição Direta)'
  },
  'C2': {
    categoryId: 'C2',
    categoryName: 'Trifásico até 30 kW',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 30,
    breakerCurrentA: 80,
    cableGaugeMM2: 25,
    neutralGaugeMM2: 25,
    groundGaugeMM2: 16,
    meterBoxType: 'CM-3 (Medição Direta com Visor)'
  },
  'C3': {
    categoryId: 'C3',
    categoryName: 'Trifásico até 38 kW',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 38,
    breakerCurrentA: 100,
    cableGaugeMM2: 35,
    neutralGaugeMM2: 35,
    groundGaugeMM2: 16,
    meterBoxType: 'CM-3'
  },
  'C4': {
    categoryId: 'C4',
    categoryName: 'Trifásico até 47 kW',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 47,
    breakerCurrentA: 125,
    cableGaugeMM2: 50,
    neutralGaugeMM2: 50,
    groundGaugeMM2: 25,
    meterBoxType: 'CM-4 / CM-13 (Medição Indireta com TCs)'
  },
  'C5': {
    categoryId: 'C5',
    categoryName: 'Trifásico até 75 kW',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 75,
    breakerCurrentA: 200,
    cableGaugeMM2: 95,
    neutralGaugeMM2: 95,
    groundGaugeMM2: 50,
    meterBoxType: 'CM-14 (Medição Indireta com TCs e Painel)'
  },
  'F': {
    categoryId: 'F',
    categoryName: 'Tipo F - Trifásico BT por Opção (até 304 kVA)',
    phases: 3,
    voltage: '220/380V',
    maxLimitKW: 304,
    breakerCurrentA: 400,
    cableGaugeMM2: 240,
    neutralGaugeMM2: 240,
    groundGaugeMM2: 120,
    meterBoxType: 'Cubículo Modular Blindado BT com TC e TP'
  }
};

// ─── TABELAS CPFL (GED-150030 / GED-13 / GED-119) ───────────────────────────

export const CPFL_CATEGORIES: Record<string, UtilityCategoryResult> = {
  'M1': {
    categoryId: 'M1',
    categoryName: 'Monofásico até 12 kW (Disjuntor 50A)',
    phases: 1,
    voltage: '127/220V',
    maxLimitKW: 12,
    breakerCurrentA: 50,
    cableGaugeMM2: 10,
    neutralGaugeMM2: 10,
    groundGaugeMM2: 10,
    meterBoxType: 'Caixa Tipo H / Padrão CPFL'
  },
  'B1': {
    categoryId: 'B1',
    categoryName: 'Bifásico até 25 kW (Disjuntor 70A)',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 25,
    breakerCurrentA: 70,
    cableGaugeMM2: 16,
    neutralGaugeMM2: 16,
    groundGaugeMM2: 10,
    meterBoxType: 'Caixa Tipo P / Polifásica CPFL'
  },
  'T1': {
    categoryId: 'T1',
    categoryName: 'Trifásico até 38 kW (Disjuntor 63A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 38,
    breakerCurrentA: 63,
    cableGaugeMM2: 16,
    neutralGaugeMM2: 16,
    groundGaugeMM2: 10,
    meterBoxType: 'Caixa Tipo T / CPFL'
  },
  'T2': {
    categoryId: 'T2',
    categoryName: 'Trifásico até 50 kW (Disjuntor 80A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 50,
    breakerCurrentA: 80,
    cableGaugeMM2: 25,
    neutralGaugeMM2: 25,
    groundGaugeMM2: 16,
    meterBoxType: 'Caixa Tipo T com TC'
  },
  'T3': {
    categoryId: 'T3',
    categoryName: 'Trifásico até 75 kW (Disjuntor 100A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 75,
    breakerCurrentA: 100,
    cableGaugeMM2: 35,
    neutralGaugeMM2: 35,
    groundGaugeMM2: 16,
    meterBoxType: 'Painel de Medição Indireta CPFL'
  }
};

// ─── TABELAS ENERGISA (NDU 042 / NDU 001 / NDU 002) ──────────────────────────

export const ENERGISA_CATEGORIES: Record<string, UtilityCategoryResult> = {
  'M-1': {
    categoryId: 'M-1',
    categoryName: 'Monofásico até 10 kW (Disjuntor 40A)',
    phases: 1,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 10,
    breakerCurrentA: 40,
    cableGaugeMM2: 10,
    neutralGaugeMM2: 10,
    groundGaugeMM2: 10,
    meterBoxType: 'Caixa Monofásica NDU 001'
  },
  'B-1': {
    categoryId: 'B-1',
    categoryName: 'Bifásico até 15 kW (Disjuntor 50A)',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 15,
    breakerCurrentA: 50,
    cableGaugeMM2: 10,
    neutralGaugeMM2: 10,
    groundGaugeMM2: 10,
    meterBoxType: 'Caixa Polifásica NDU 001'
  },
  'T-1': {
    categoryId: 'T-1',
    categoryName: 'Trifásico até 38 kW (Disjuntor 63A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 38,
    breakerCurrentA: 63,
    cableGaugeMM2: 16,
    neutralGaugeMM2: 16,
    groundGaugeMM2: 10,
    meterBoxType: 'Caixa Polifásica Trifásica NDU 001'
  },
  'T-2': {
    categoryId: 'T-2',
    categoryName: 'Trifásico até 50 kW (Disjuntor 80A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 50,
    breakerCurrentA: 80,
    cableGaugeMM2: 25,
    neutralGaugeMM2: 25,
    groundGaugeMM2: 16,
    meterBoxType: 'Caixa de Medição NDU 001 com TC'
  },
  'T-3': {
    categoryId: 'T-3',
    categoryName: 'Trifásico até 75 kW (Disjuntor 100A / 125A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 75,
    breakerCurrentA: 125,
    cableGaugeMM2: 50,
    neutralGaugeMM2: 50,
    groundGaugeMM2: 25,
    meterBoxType: 'Painel Modular de Medição Indireta NDU 001'
  }
};

// ─── TABELAS TRANSFORMADORES PADRONIZADOS (MÉDIA TENSÃO) ─────────────────────

export const STANDARD_TRANSFORMERS_KVA = [45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000];

export function selectStandardTransformer(demandKVA: number): number {
  for (const trafo of STANDARD_TRANSFORMERS_KVA) {
    if (trafo * 0.95 >= demandKVA) { // Margem de segurança de 5%
      return trafo;
    }
  }
  return Math.ceil(demandKVA / 500) * 500;
}

// ─── FATOR DE SIMULTANEIDADE PARA EDIFICAÇÕES COLETIVAS (NBR 17019 / ND-5.2) ─

export function calculateEVSimultaneityFactor(
  chargersCount: number,
  hasSmartChargingDLM: boolean = false
): number {
  if (chargersCount <= 1) return 1.0;
  if (hasSmartChargingDLM) {
    // Com Gestão Dinâmica de Carga (DLM / Smart Charging), o fator pode ser reduzido com segurança
    if (chargersCount <= 4) return 0.70;
    if (chargersCount <= 10) return 0.50;
    if (chargersCount <= 25) return 0.35;
    return 0.25;
  }
  // Sem DLM (pior caso conforme NBR 17019 e tabelas de concessionárias)
  if (chargersCount === 2) return 0.90;
  if (chargersCount === 3) return 0.85;
  if (chargersCount <= 5) return 0.80;
  if (chargersCount <= 10) return 0.70;
  if (chargersCount <= 20) return 0.60;
  return 0.50;
}

// ─── MOTOR PRINCIPAL DE ANÁLISE DE CONCESSIONÁRIA ────────────────────────────

export function analyzeUtilityCompliance(input: UtilityAnalysisInput): UtilityAnalysisResult {
  const { utility, chargers, existingLoadKW, location, installationType, hasDedicatedTransformer } = input;
  
  // 1. Totalizar carregadores
  const totalChargersKW = chargers.reduce((sum, c) => sum + (c.powerKW * c.quantity), 0);
  const totalChargersCount = chargers.reduce((sum, c) => sum + c.quantity, 0);
  const hasDCCharger = chargers.some(c => c.chargerType === 'DC');

  // 2. Fator de simultaneidade conforme o tipo de instalação
  let fSimult = 1.0;
  if (installationType === 'coletivo_condominio' || installationType === 'comercial_eletroposto') {
    fSimult = calculateEVSimultaneityFactor(totalChargersCount, false);
  }
  const diversifiedChargersKW = totalChargersKW * fSimult;
  const totalInstallationLoadKW = existingLoadKW + diversifiedChargersKW;

  // 3. Fator de potência médio (0.95 em AC, 0.98 em DC)
  const avgPF = hasDCCharger ? 0.98 : 0.95;
  const calculatedDemandKVA = Number((totalInstallationLoadKW / avgPF).toFixed(1));

  // 4. Determinar se é Baixa Tensão (BT <= 75 kW) ou Média Tensão (MT > 75 kW)
  let supplyLevel: 'BT' | 'MT' | 'AT' = 'BT';
  let requiresTransformer = false;
  let recommendedTrafo: number | undefined = undefined;

  const maxBTAllowed = 75; // Limite padrão regulatório ANEEL para atendimento em BT
  if (totalInstallationLoadKW > maxBTAllowed || hasDedicatedTransformer) {
    supplyLevel = 'MT';
    requiresTransformer = true;
    recommendedTrafo = selectStandardTransformer(calculatedDemandKVA);
  }

  // 5. Configurar regras e categorias da concessionária selecionada
  const actions: ComplianceAction[] = [];
  const notes: string[] = [];
  let applicableStandards: string[] = [];
  let utilityFullName = '';
  let voltageSupply = '127/220V ou 220/380V';
  let category: UtilityCategoryResult;
  let meteringScheme = 'Individual Convencional';

  if (utility === 'CEMIG') {
    utilityFullName = 'Companhia Energética de Minas Gerais S.A. (CEMIG)';
    applicableStandards = ['ND-5.1 (BT Individual)', 'ND-5.2 (Edificações Coletivas)', 'ND-5.3 (Média Tensão)', 'ND-5.30', 'Resolução ANEEL 1000/2021 Art. 550'];
    
    // Ação mandatória de comunicação prévia Art. 550
    actions.push({
      type: 'obrigatoria',
      title: 'Comunicação Prévia Obrigatória à CEMIG (Art. 550 REN 1000)',
      description: 'A instalação de estações de recarga de veículos elétricos deve ser informada previamente à CEMIG para avaliação do transformador de distribuição da rua e impacto no faturamento.',
      normReference: 'Art. 550 da Resolução Normativa ANEEL nº 1000/2021'
    });

    if (installationType === 'coletivo_condominio') {
      meteringScheme = 'Quadro Geral Coletivo de Medição com Ramais Derivados (ND-5.2)';
      actions.push({
        type: 'obrigatoria',
        title: 'Adequação de Padrão Agrupado — CEMIG ND-5.2',
        description: 'Em condomínios, a alimentação das estações de recarga pode ser feita por medição coletiva da administração (com submedição interna) ou por prumada com módulos adicionais de medição homologados.',
        normReference: 'CEMIG ND-5.2 § 4.8 e § 6.2'
      });
    }

    if (supplyLevel === 'BT') {
      // Selecionar menor categoria ND-5.1 que atende
      if (totalInstallationLoadKW <= 8) category = CEMIG_BT_CATEGORIES['A'];
      else if (totalInstallationLoadKW <= 12) category = CEMIG_BT_CATEGORIES['B1'];
      else if (totalInstallationLoadKW <= 16) category = CEMIG_BT_CATEGORIES['B2'];
      else if (totalInstallationLoadKW <= 24) category = CEMIG_BT_CATEGORIES['C1'];
      else if (totalInstallationLoadKW <= 30) category = CEMIG_BT_CATEGORIES['C2'];
      else if (totalInstallationLoadKW <= 38) category = CEMIG_BT_CATEGORIES['C3'];
      else if (totalInstallationLoadKW <= 47) category = CEMIG_BT_CATEGORIES['C4'];
      else category = CEMIG_BT_CATEGORIES['C5'];
    } else {
      category = {
        categoryId: 'MT-CEMIG',
        categoryName: `Subestação Particular de Média Tensão (${recommendedTrafo} kVA)`,
        phases: 3,
        voltage: '13.8 kV / 380-220V',
        maxLimitKW: (recommendedTrafo || 150) * 0.95,
        breakerCurrentA: Math.round(((recommendedTrafo || 150) * 1000) / (Math.sqrt(3) * 380)),
        cableGaugeMM2: 120,
        neutralGaugeMM2: 120,
        groundGaugeMM2: 70,
        meterBoxType: 'Cabine de Medição e Proteção MT (ND-5.3) com Disjuntor a Vácuo/SF6 e Relé 50/51'
      };
      actions.push({
        type: 'obrigatoria',
        title: 'Projeto Elétrico de Subestação de Média Tensão CEMIG (ND-5.3)',
        description: `Demanda de ${calculatedDemandKVA} kVA excede o limite de BT (75 kW). Exige projeto completo de subestação com transformador de ${recommendedTrafo} kVA e ART.`,
        normReference: 'CEMIG ND-5.3'
      });
    }

  } else if (utility === 'CPFL') {
    utilityFullName = 'CPFL Energia (Paulista / Piratininga / Santa Cruz / RGE)';
    applicableStandards = ['GED-150030 (Acesso Estações de Recarga VE)', 'GED-13 (BT Individual)', 'GED-119 (Edificações Coletivas)', 'GED-11 (Média Tensão)'];

    actions.push({
      type: 'obrigatoria',
      title: 'Conformidade com a Norma CPFL GED-150030',
      description: 'O projeto deve seguir a norma GED-150030 específica para pontos de recarga de VE, prevendo proteção contra harmônicos de retificadores e dispositivo de seccionamento visível.',
      normReference: 'CPFL GED-150030'
    });

    if (supplyLevel === 'BT') {
      if (totalInstallationLoadKW <= 12) category = CPFL_CATEGORIES['M1'];
      else if (totalInstallationLoadKW <= 25) category = CPFL_CATEGORIES['B1'];
      else if (totalInstallationLoadKW <= 38) category = CPFL_CATEGORIES['T1'];
      else if (totalInstallationLoadKW <= 50) category = CPFL_CATEGORIES['T2'];
      else category = CPFL_CATEGORIES['T3'];
    } else {
      category = {
        categoryId: 'MT-CPFL',
        categoryName: `Subestação Primária CPFL GED-11 (${recommendedTrafo} kVA)`,
        phases: 3,
        voltage: '13.8 kV ou 34.5 kV',
        maxLimitKW: (recommendedTrafo || 150) * 0.95,
        breakerCurrentA: Math.round(((recommendedTrafo || 150) * 1000) / (Math.sqrt(3) * 380)),
        cableGaugeMM2: 120,
        neutralGaugeMM2: 120,
        groundGaugeMM2: 70,
        meterBoxType: 'Cabine de Entrada e Medição em Alvenaria ou Blindada (GED-11)'
      };
    }

  } else if (utility === 'ENERGISA') {
    utilityFullName = 'Grupo Energisa (Cataguases, PB, MS, MT, TO, SE, RO, AC)';
    applicableStandards = ['NDU 042 (Fornecimento de Energia para Estações de Recarga VE)', 'NDU 001 (BT)', 'NDU 002 (MT)'];

    actions.push({
      type: 'obrigatoria',
      title: 'Aplicação da Norma Específica Energisa NDU 042',
      description: 'A instalação de recarga de VE no território Energisa exige cumprimento integral da NDU 042, com apresentação de memorial de cálculo e laudo elétrico de capacidade do ponto de entrega.',
      normReference: 'Energisa NDU 042'
    });

    if (supplyLevel === 'BT') {
      if (totalInstallationLoadKW <= 10) category = ENERGISA_CATEGORIES['M-1'];
      else if (totalInstallationLoadKW <= 15) category = ENERGISA_CATEGORIES['B-1'];
      else if (totalInstallationLoadKW <= 38) category = ENERGISA_CATEGORIES['T-1'];
      else if (totalInstallationLoadKW <= 50) category = ENERGISA_CATEGORIES['T-2'];
      else category = ENERGISA_CATEGORIES['T-3'];
    } else {
      category = {
        categoryId: 'MT-ENERGISA',
        categoryName: `Posto de Transformação / Subestação NDU 002 (${recommendedTrafo} kVA)`,
        phases: 3,
        voltage: '13.8 kV / 380V',
        maxLimitKW: (recommendedTrafo || 150) * 0.95,
        breakerCurrentA: Math.round(((recommendedTrafo || 150) * 1000) / (Math.sqrt(3) * 380)),
        cableGaugeMM2: 120,
        neutralGaugeMM2: 120,
        groundGaugeMM2: 70,
        meterBoxType: 'Subestação Aérea em Poste ou Abrigada Conforme NDU 002'
      };
    }

  } else {
    // ENEL
    utilityFullName = 'Enel Distribuição (SP / RJ / CE)';
    applicableStandards = ['Regulamento LIG BT 2024', 'LIG MT', 'Diretrizes Técnicas Enel X'];
    category = CPFL_CATEGORIES['T3']; // Equivalente em faixas
  }

  // 6. Verificar se necessita aumento de padrão
  const needsStandardUpgrade = totalInstallationLoadKW > existingLoadKW && existingLoadKW > 0;
  if (needsStandardUpgrade) {
    actions.push({
      type: 'alerta',
      title: 'Solicitação de Aumento de Carga na Concessionária',
      description: `A inclusão dos carregadores de VE (${totalChargersKW} kW) eleva a carga total para ${totalInstallationLoadKW.toFixed(1)} kW, exigindo adequação de padrão de entrada.`,
      normReference: 'Procedimentos de Distribuição (PRODIST / ANEEL)'
    });
  }

  // 7. Alerta de Carregadores DC Rápidos
  if (hasDCCharger) {
    actions.push({
      type: 'alerta',
      title: 'Carregador Rápido DC — Distorção Harmônica e Aterramento',
      description: 'Estações de recarga rápida em Corrente Contínua operam com pontes retificadoras de alta frequência. Deve ser verificado o filtro de harmônicos e o laudo de malha de aterramento com resistência <= 10 Ohms.',
      normReference: 'PRODIST Módulo 8 (Qualidade da Energia Elétrica) e NBR 17019'
    });
  }

  return {
    utility,
    utilityFullName,
    applicableStandards,
    voltageSupply,
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
    isApprovedInCurrentStandard: !needsStandardUpgrade,
    needsStandardUpgrade,
    actions,
    notes
  };
}
