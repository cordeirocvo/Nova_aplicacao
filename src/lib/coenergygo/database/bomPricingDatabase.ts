/**
 * CoenergyGO — Banco de Dados de Preços de Mercado, Fabricantes Homologados CEMIG PEC-11
 * e Componentes de Segurança e Desligamento de Emergência (NBR 17019 / CEMIG)
 * Cordeiro Energia
 */

import { BillOfMaterialItem } from '../types';

export interface EnrichedBOMSummary {
  items: BillOfMaterialItem[];
  totalMaterialsCostBRL: number;
  estimatedLaborCostBRL: number;
  totalProjectInvestmentBRL: number;
  categoryBreakdown: Record<string, { totalBRL: number; count: number }>;
}

/**
 * Tabela de Preços e Fabricantes Homologados de Referência do Mercado Brasileiro (2025/2026)
 */
export const MARKET_PRICING_CATALOG = {
  // Disjuntores Caixa Moldada (Entrada e Alimentador Trafo)
  breaker_mccb: {
    low: { manufacturer: 'Soprano', line: 'ASM GII / DS (Homologado CEMIG PEC-11)', pricePerAmp: 3.5, base: 280 },
    standard: { manufacturer: 'WEG', line: 'DWB / AGW (Homologado CEMIG PEC-11)', pricePerAmp: 4.8, base: 360 },
    premium: { manufacturer: 'Schneider Electric', line: 'EasyPact EZC / Compact NSX', pricePerAmp: 6.2, base: 450 }
  },

  // Disjuntores DIN (Terminais VE e Auxiliares)
  breaker_din: {
    singlePole: { manufacturer: 'Soprano / WEG', model: 'SHB / MDW Curva B/C (PEC-11)', unitPrice: 22.0 },
    twoPole: { manufacturer: 'Soprano / WEG', model: 'SHB / MDW 2P Curva C (PEC-11)', unitPrice: 48.0 },
    threePole: { manufacturer: 'Soprano / WEG', model: 'SHB / MDW 3P Curva C (PEC-11)', unitPrice: 85.0 }
  },

  // Dispositivos Diferenciais Residuais (DR)
  residual_current: {
    typeB_4P_40A: { manufacturer: 'WEG / Schneider', model: 'DR Tetrapolar 40A / 30mA Tipo B (Imunidade DC > 6mA)', unitPrice: 790.0 },
    typeB_4P_63A: { manufacturer: 'WEG / Schneider', model: 'DR Tetrapolar 63A / 30mA Tipo B (Imunidade DC > 6mA)', unitPrice: 940.0 },
    typeAC_2P_25A: { manufacturer: 'Soprano / WEG', model: 'DR Bipolar 25A / 30mA Tipo AC (Tomadas de Serviço)', unitPrice: 95.0 }
  },

  // Proteção contra Surtos (DPS)
  surge_protection: {
    clamper_45ka_275v: { manufacturer: 'Clamper', model: 'VCL / Frontitec 45kA 275V Cl. II Plugue Extraível', unitPrice: 98.0 },
    clamper_40ka_385v: { manufacturer: 'Clamper', model: 'VCL / Frontitec 40kA 385V Cl. II Plugue Extraível', unitPrice: 115.0 },
    weg_spw_45ka: { manufacturer: 'WEG', model: 'SPW02 45kA 275V/385V Classe II', unitPrice: 92.0 }
  },

  // Sistema Obrigatório de Desligamento de Emergência (NBR 17019 / CEMIG)
  emergency_shutdown: {
    mushroom_button: {
      manufacturer: 'Soprano / Schneider / WEG',
      model: 'Botão de Emergência Cogumelo com Trava/Giro IP65 (Distância ≥ 5m do Carregador)',
      unitPrice: 145.0
    },
    shunt_trip_coil: {
      manufacturer: 'Soprano / WEG / Schneider',
      model: 'Bobina de Disparo MX (Shunt Trip) 220V CA acoplada ao Disjuntor Geral dos Carregadores',
      unitPrice: 285.0
    },
    control_breaker: {
      manufacturer: 'Soprano / WEG',
      model: 'Minidisjuntor Bipolar 2A Curva C de Proteção do Circuito da Bobina',
      unitPrice: 38.0
    },
    control_cable_per_meter: {
      manufacturer: 'Prysmian / Sil',
      model: 'Cabo de Comando 2x 1.5mm² 750V Flexível',
      unitPrice: 4.8
    },
    aux_contact: {
      manufacturer: 'Soprano / WEG',
      model: 'Contato Auxiliar 1NAF de Sinalização de Disparo',
      unitPrice: 65.0
    }
  },

  // Quadros e Caixas de Montagem
  enclosures: {
    metal_cemar: {
      manufacturer: 'Cemar Legrand',
      model: 'Caixa de Montagem Metálica Sobrepor IP54/IP65 com Placa Laranja (Sob Medida)',
      basePrice: 680.0
    },
    strahl_padrao: {
      manufacturer: 'Strahl (Homologado CEMIG)',
      model: 'Caixa em Policarbonato Anti-Chamas com Visor Padrão CEMIG',
      basePrice: 520.0
    },
    distribution_panel_din: {
      manufacturer: 'Tigre / Strahl / Cemar',
      model: 'Quadro de Distribuição Embutir/Sobrepor com Barramento de Cobre',
      basePrice: 380.0
    }
  },

  // Cabos de Potência por metro (Prysmian Afumex / Sil HEPR 90°C)
  cables_per_meter_brl: {
    1.5: 2.8,
    2.5: 4.5,
    4.0: 6.9,
    6.0: 10.2,
    10.0: 17.5,
    16.0: 27.0,
    25.0: 42.0,
    35.0: 58.0,
    50.0: 82.0,
    70.0: 115.0,
    95.0: 158.0,
    120.0: 198.0,
    150.0: 245.0,
    185.0: 310.0,
    240.0: 410.0
  } as Record<number, number>,

  // Padrões de Entrada Homologados CEMIG / Concessionárias
  entrance_standards: {
    single_phase_A: {
      name: 'Kit Padrão Monofásico Homologado (Caixa Policarbonato + Disjuntor 63A + Haste + Aterramento)',
      price: 1450.00,
      manufacturer: 'Strahl / CEMIG PEC-11'
    },
    two_phase_B: {
      name: 'Kit Padrão Bifásico Homologado (Caixa Policarbonato + Disjuntor 63A + Haste + Aterramento)',
      price: 2100.00,
      manufacturer: 'Strahl / CEMIG PEC-11'
    },
    three_phase_C1_C2: {
      name: 'Kit Padrão Trifásico BT C1/C2 (Caixa Policarbonato + Disjuntor 40-50A + Haste + Aterramento)',
      price: 2850.00,
      manufacturer: 'Strahl / CEMIG PEC-11'
    },
    three_phase_C3_C4: {
      name: 'Kit Padrão Trifásico BT C3/C4 (Caixa Policarbonato + Disjuntor 63-80A + Haste + Aterramento)',
      price: 3850.00,
      manufacturer: 'Strahl / CEMIG PEC-11'
    },
    three_phase_C5_C6: {
      name: 'Kit Padrão Trifásico BT C5/C6 (Caixa Policarbonato + Disjuntor 125-200A Caixa Moldada + Aterramento)',
      price: 6800.00,
      manufacturer: 'Strahl / CEMIG PEC-11'
    },
    high_demand_group_F: {
      name: 'Kit Padrão Alta Demanda BT Grupo F (Caixa Medição Indireta TC + Disjuntor 250A-800A)',
      price: 12500.00,
      manufacturer: 'Strahl / CEMIG PEC-11'
    },
    substation_MT: {
      name: 'Subestação Particular de Média Tensão 75-300 kVA (Poste, Cabine/Trafo, Cubículo e Aterramento)',
      price: 45000.00,
      manufacturer: 'WEG / Romagnole'
    },
    upgrade_reforma_padrao: {
      name: 'Kit Adequação / Aumento de Padrão (Substituição de Disjuntor Geral + Ramal de Cabos de Entrada)',
      price: 2450.00,
      manufacturer: 'Soprano / WEG PEC-11'
    },
    kit_cm09_cm04_busbar: {
      codigo: 'KIT-PADRAO-CM09-CM04',
      name: 'Conjunto Padrão Caixa CM-09 + Caixa CM-04 com Barramento sem disjuntor',
      description: 'Conjunto montado de fábrica com Caixa CM-09 + Caixa CM-04 com barramento de cobre dimensionado homologado CEMIG ND-5.1 sem disjuntor',
      price: 1250.00,
      manufacturer: 'Strahl / Cemar (PEC-11)'
    },
    kit_cm18_cm04_busbar: {
      codigo: 'KIT-PADRAO-CM18-CM04',
      name: 'Conjunto Padrão Caixa CM-18 + Caixa CM-04 com Barramento sem disjuntor',
      description: 'Conjunto montado de fábrica com Caixa CM-18 reforçada + Caixa CM-04 com barramento de cobre dimensionado homologado CEMIG ND-5.1 sem disjuntor',
      price: 1480.00,
      manufacturer: 'Strahl / Cemar (PEC-11)'
    },
    material_civil_base_concreto: {
      codigo: 'MAT-BASE-CONCRETO',
      name: 'Material Civil para Base Concretada do Poste (Cimento, Areia, Brita)',
      description: 'Material para engastamento e base concretada de postes conforme Desenho 57 da CEMIG ND-5.1',
      price: 220.00,
      manufacturer: 'Distribuidor Local Materiais de Construção'
    }
  }
};

/**
 * Gera os itens de material do Padrão de Entrada conforme as regras de negócio:
 * 1. Padrão já existe e atende à carga: NÃO entra no custo (R$ 0,00).
 * 2. Padrão já existe mas precisa ser alterado (aumento de carga): ENTRA no custo como Adequação de Padrão.
 * 3. Ligação Nova (sem padrão prévio): ENTRA no custo como Padrão Completo Novo Homologado.
 */
export function generateStandardEntranceBOM(params: {
  isNewConnection: boolean;
  isExistingStandardAdequate: boolean;
  standardCategory: string;
  currentCategory?: string;
  utility?: string;
}): BillOfMaterialItem[] {
  const { isNewConnection, isExistingStandardAdequate, standardCategory, currentCategory, utility = 'CEMIG' } = params;

  // CASO 1: Padrão já existe e atende plenamente à carga total -> NÃO ENTRA NO CUSTO
  if (!isNewConnection && isExistingStandardAdequate) {
    return [];
  }

  const items: BillOfMaterialItem[] = [];

  // CASO 2: Padrão já existe mas requer aumento de carga / alteração -> CUSTO DE ADEQUAÇÃO
  if (!isNewConnection && !isExistingStandardAdequate) {
    items.push({
      id: 'bom-adequacao-padrao',
      category: 'padrao_entrada',
      description: `Adequação e Aumento de Carga do Padrão (${currentCategory || 'Atual'} ➔ ${standardCategory})`,
      quantity: 1,
      unit: 'kit',
      spec: `Substituição do disjuntor geral de entrada, reforço de fiação e readequação da caixa de medição para homologação na ${utility}`,
      normReference: `${utility} ND-5.1 / ABNT NBR 5410`,
      manufacturer: 'Soprano / WEG (Homologado PEC-11)',
      modelRef: 'Kit Reforma e Upgrade de Padrão BT',
      unitPriceBRL: 2450.00,
      totalPriceBRL: 2450.00
    });
    return items;
  }

  // CASO 3: Ligação Nova (sem padrão existente no local) -> CUSTO INTEGRAL DO NOVO PADRÃO
  if (isNewConnection) {
    const cat = (standardCategory || 'C3').toUpperCase();
    let price = 3850.00;
    let desc = `Kit Padrão de Entrada Novo Homologado ${utility} — Categoria ${standardCategory || 'C3'}`;
    let spec = `Caixa de medição em policarbonato com visor, disjuntor geral, cabos de descida, barramento e kit de aterramento`;
    let mfg = 'Strahl / Tigre (Homologado PEC-11)';

    if (cat.startsWith('A')) {
      price = 1450.00;
      desc = `Padrão de Entrada Monofásico ${standardCategory} Homologado ${utility}`;
      spec = 'Caixa monofásica em policarbonato, disjuntor bipolar 63A, condutores 10mm² e haste 5/8"';
    } else if (cat.startsWith('B')) {
      price = 2100.00;
      desc = `Padrão de Entrada Bifásico ${standardCategory} Homologado ${utility}`;
      spec = 'Caixa bifásica em policarbonato, disjuntor bipolar 63A, condutores 16mm² e haste de aterramento';
    } else if (cat === 'C1' || cat === 'C2') {
      price = 2850.00;
      desc = `Padrão de Entrada Trifásico BT ${standardCategory} Homologado ${utility} (40-50A)`;
      spec = 'Caixa CM-3 policarbonato, disjuntor tripolar, condutores 10-16mm² e aterramento completo';
    } else if (cat === 'C3' || cat === 'C4') {
      price = 3850.00;
      desc = `Padrão de Entrada Trifásico BT ${standardCategory} Homologado ${utility} (63-80A)`;
      spec = 'Caixa CM-3 policarbonato, disjuntor tripolar caixa moldada, cabos 25-35mm² e aterramento';
    } else if (cat === 'C5' || cat === 'C6') {
      price = 6800.00;
      desc = `Padrão de Entrada Trifásico BT ${standardCategory} Homologado ${utility} (125-200A)`;
      spec = 'Caixa CM-4 policarbonato, disjuntor 200A caixa moldada homologado PEC-11, cabos 70-95mm² e aterramento';
    } else if (cat.startsWith('F')) {
      price = 12500.00;
      desc = `Padrão de Entrada Alta Demanda BT ${standardCategory} (Medição Indireta por TCs)`;
      spec = 'Painel de medição indireta com TCs 200/5 a 800/5, disjuntor caixa moldada e barramento de cobre';
    } else if (cat === 'A4' || cat === 'A3A' || cat.includes('MT') || cat.includes('SUBESTACAO')) {
      price = 45000.00;
      desc = `Subestação Particular de Média Tensão 13.8kV / 380-220V Nova`;
      spec = 'Posteamento particular, cabine/cubículo de proteção, transformador a seco Dyn1 e ART de projeto';
      mfg = 'WEG / Romagnole';
    }

    items.push({
      id: 'bom-padrao-novo',
      category: 'padrao_entrada',
      description: desc,
      quantity: 1,
      unit: 'cj',
      spec: spec,
      normReference: `${utility} ND-5.1 / ND-5.3 / NBR 5410`,
      manufacturer: mfg,
      modelRef: `Padrão Homologado ${standardCategory || 'C3'}`,
      unitPriceBRL: price,
      totalPriceBRL: price
    });
  }

  return items;
}

/**
 * Função de enriquecimento da BOM com precificação de mercado, fabricantes e itens normativos de emergência
 */
export function enrichBillOfMaterialsWithPricing(
  rawBOM: BillOfMaterialItem[],
  options?: {
    includeEmergencyCircuit?: boolean;
    useMetalEnclosureCemar?: boolean;
    customLaborPercent?: number; // Percentual de mão de obra (padrão 25% a 30%)
  }
): EnrichedBOMSummary {
  const includeEmergency = options?.includeEmergencyCircuit !== false;
  const useMetalCemar = options?.useMetalEnclosureCemar ?? true;
  const laborPercent = options?.customLaborPercent ?? 28; // 28% média Brasil

  const enrichedItems: BillOfMaterialItem[] = [];

  // 1. Processar itens existentes e atribuir preços e fabricantes de referência
  rawBOM.forEach((item) => {
    let mfg = item.manufacturer || 'Nacional Homologado';
    let model = item.modelRef || item.spec;
    let unitPrice = item.unitPriceBRL || 0;

    const descLower = item.description.toLowerCase();

    // Condutores
    if (item.category === 'condutores') {
      mfg = 'Prysmian (Afumex) / Sil';
      // Extrair bitola
      const matchGauge = item.description.match(/(\d+(?:\.\d+)?)\s*mm²/i) || item.spec.match(/(\d+(?:\.\d+)?)\s*mm²/i);
      if (matchGauge) {
        const gauge = parseFloat(matchGauge[1]);
        const pricePerM = MARKET_PRICING_CATALOG.cables_per_meter_brl[gauge] || (gauge * 1.6);
        unitPrice = Number(pricePerM.toFixed(2));
      } else {
        unitPrice = 18.0;
      }
    }
    // Eletrodutos e Infra
    else if (item.category === 'infraestrutura') {
      mfg = 'Tigre / Kanaflex / Perfilados Real';
      if (descLower.includes('eletroduto')) {
        unitPrice = descLower.includes('2"') ? 28.0 : (descLower.includes('1"') ? 16.0 : 22.0);
      } else {
        unitPrice = 35.0;
      }
    }
    // Quadros
    else if (item.category === 'quadro') {
      if (useMetalCemar) {
        mfg = 'Cemar Legrand (Linha Industrial)';
        model = 'Caixa Metálica Sobrepor IP65 com Placa Laranja e Barramento Eletrolítico';
        unitPrice = MARKET_PRICING_CATALOG.enclosures.metal_cemar.basePrice;
      } else {
        mfg = 'Strahl / Tigre (Homologado CEMIG PEC-11)';
        model = MARKET_PRICING_CATALOG.enclosures.strahl_padrao.model;
        unitPrice = MARKET_PRICING_CATALOG.enclosures.strahl_padrao.basePrice;
      }
    }
    // Disjuntores e Proteções
    else if (item.category === 'protecao' || descLower.includes('disjuntor')) {
      if (descLower.includes('caixa moldada')) {
        mfg = 'Soprano (ASM GII) / WEG (DWB) [Homologado CEMIG PEC-11]';
        const matchAmp = item.description.match(/(\d+)\s*a/i);
        const amp = matchAmp ? parseInt(matchAmp[1]) : 125;
        unitPrice = MARKET_PRICING_CATALOG.breaker_mccb.standard.base + (amp * 1.8);
      } else {
        mfg = 'Soprano / WEG (Homologado CEMIG PEC-11)';
        unitPrice = descLower.includes('3p') || descLower.includes('tripolar')
          ? MARKET_PRICING_CATALOG.breaker_din.threePole.unitPrice
          : MARKET_PRICING_CATALOG.breaker_din.singlePole.unitPrice;
      }
    }
    // Transformador
    else if (item.category === 'transformador') {
      mfg = 'WEG / Romagnole / Tamura';
      model = 'Transformador a Seco Dyn1 Fator K-4 p/ Estações VE';
      const matchKVA = item.description.match(/(\d+(?:\.\d+)?)\s*kva/i);
      const kva = matchKVA ? parseFloat(matchKVA[1]) : 45;
      unitPrice = Math.round(kva * 420.0 + 3500.0); // Estimativa empírica de mercado trafo a seco
    }

    const totalPrice = Number((unitPrice * item.quantity).toFixed(2));

    enrichedItems.push({
      ...item,
      manufacturer: mfg,
      modelRef: model,
      unitPriceBRL: unitPrice,
      totalPriceBRL: totalPrice
    });
  });

  // 2. Inserir Sistema Obrigatório de Desligamento de Emergência (Botão + Bobina Shunt Trip)
  if (includeEmergency && !enrichedItems.some(i => i.id === 'bom-emergencia-botao')) {
    const em = MARKET_PRICING_CATALOG.emergency_shutdown;

    // A. Botão de emergência cogumelo
    enrichedItems.push({
      id: 'bom-emergencia-botao',
      category: 'segurança_emergencia',
      description: 'Botão de Emergência Cogumelo Vermelho com Retenção Mecânica e Desbloqueio por Giro (IP65)',
      quantity: 1,
      unit: 'pç',
      spec: 'Instalação obrigatória a no mínimo 5 metros dos carregadores para desligamento seguro imediato',
      normReference: 'ABNT NBR 17019 / Norma CEMIG / IT-41 CBMMG',
      manufacturer: em.mushroom_button.manufacturer,
      modelRef: em.mushroom_button.model,
      unitPriceBRL: em.mushroom_button.unitPrice,
      totalPriceBRL: em.mushroom_button.unitPrice
    });

    // B. Bobina de disparo MX acoplada ao disjuntor geral
    enrichedItems.push({
      id: 'bom-emergencia-bobina',
      category: 'segurança_emergencia',
      description: 'Bobina de Disparo Shunt Trip (MX) 220V CA p/ Acoplamento ao Disjuntor Geral dos Carregadores',
      quantity: 1,
      unit: 'pç',
      spec: 'Provoca a abertura mecânica instantânea (< 50ms) do disjuntor ao pressionar o botão de emergência',
      normReference: 'ABNT NBR 5410 / NBR IEC 60947-2',
      manufacturer: em.shunt_trip_coil.manufacturer,
      modelRef: em.shunt_trip_coil.model,
      unitPriceBRL: em.shunt_trip_coil.unitPrice,
      totalPriceBRL: em.shunt_trip_coil.unitPrice
    });

    // C. Minidisjuntor de proteção do comando
    enrichedItems.push({
      id: 'bom-emergencia-disj-comando',
      category: 'segurança_emergencia',
      description: 'Minidisjuntor Bipolar DIN 2A Curva C de Proteção do Circuito de Comando da Bobina',
      quantity: 1,
      unit: 'pç',
      spec: 'Protege a linha de alimentação auxiliar da bobina contra curtos-circuitos',
      normReference: 'NBR 5410',
      manufacturer: em.control_breaker.manufacturer,
      modelRef: em.control_breaker.model,
      unitPriceBRL: em.control_breaker.unitPrice,
      totalPriceBRL: em.control_breaker.unitPrice
    });

    // D. Cabo de comando 2x1.5mm²
    const distMetros = 15; // Distância padrão recomendada com sobras
    enrichedItems.push({
      id: 'bom-emergencia-cabo-comando',
      category: 'segurança_emergencia',
      description: 'Cabo de Comando 2x 1.5mm² 750V Flexível para Interligação do Botão à Bobina de Disparo',
      quantity: distMetros,
      unit: 'm',
      spec: `Lançamento em eletroduto exclusivo interligando o botão de emergência externo ao painel (${distMetros}m)`,
      normReference: 'NBR 5410',
      manufacturer: em.control_cable_per_meter.manufacturer,
      modelRef: em.control_cable_per_meter.model,
      unitPriceBRL: em.control_cable_per_meter.unitPrice,
      totalPriceBRL: Number((em.control_cable_per_meter.unitPrice * distMetros).toFixed(2))
    });

    // E. Dispositivo DR Tipo B Tetrapolar para cada carregador 380V
    enrichedItems.push({
      id: 'bom-dr-tipo-b',
      category: 'protecao',
      description: 'Interruptor Diferencial Residual (DR) Tetrapolar 40A / 30mA Tipo B com Imunidade a Fuga DC > 6mA',
      quantity: 1,
      unit: 'pç',
      spec: 'Exigência compulsória NBR 17019 para estações de recarga VE contra correntes residuais contínuas',
      normReference: 'ABNT NBR 17019 / IEC 62423',
      manufacturer: MARKET_PRICING_CATALOG.residual_current.typeB_4P_40A.manufacturer,
      modelRef: MARKET_PRICING_CATALOG.residual_current.typeB_4P_40A.model,
      unitPriceBRL: MARKET_PRICING_CATALOG.residual_current.typeB_4P_40A.unitPrice,
      totalPriceBRL: MARKET_PRICING_CATALOG.residual_current.typeB_4P_40A.unitPrice
    });
  }

  // 3. Cálculos de Totalização e Mão de Obra
  const totalMaterialsCostBRL = Number(
    enrichedItems.reduce((acc, curr) => acc + (curr.totalPriceBRL || 0), 0).toFixed(2)
  );

  const estimatedLaborCostBRL = Number(
    ((totalMaterialsCostBRL * laborPercent) / 100).toFixed(2)
  );

  const totalProjectInvestmentBRL = Number(
    (totalMaterialsCostBRL + estimatedLaborCostBRL).toFixed(2)
  );

  // 4. Divisão por Categorias
  const categoryBreakdown: Record<string, { totalBRL: number; count: number }> = {};
  enrichedItems.forEach((it) => {
    const cat = it.category;
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { totalBRL: 0, count: 0 };
    }
    categoryBreakdown[cat].totalBRL = Number((categoryBreakdown[cat].totalBRL + (it.totalPriceBRL || 0)).toFixed(2));
    categoryBreakdown[cat].count += 1;
  });

  return {
    items: enrichedItems,
    totalMaterialsCostBRL,
    estimatedLaborCostBRL,
    totalProjectInvestmentBRL,
    categoryBreakdown
  };
}
