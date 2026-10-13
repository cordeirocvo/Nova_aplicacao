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
  } as Record<number, number>
};

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
