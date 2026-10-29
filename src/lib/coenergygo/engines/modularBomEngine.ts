/**
 * CoenergyGO — Motor de Geração da Lista de Materiais (BOM) Modular por Etapas
 * Cordeiro Energia — Engenharia Elétrica & Gestão Orçamentária (CAPEX)
 * 
 * Normas de Referência:
 * - ABNT NBR 5410 (Instalações Elétricas de Baixa Tensão)
 * - ABNT NBR 17019 (Instalações Elétricas em Locais Especiais - Alimentação de VE)
 * - CEMIG ND-5.1 e ND-5.3 (Fornecimento de Energia Elétrica em Tensão Secundária)
 * - Instruções Técnicas CBMMG (IT-41 e IT-30 - Segurança Contra Incêndio em Eletropostos)
 * - IEC 61851 (EV Conductive Charging System)
 * - IEC 62955 (Residual Direct Current Detecting Device - RDC-DD)
 */

import {
  ChainTopologyOutput,
  BillOfMaterialItem,
  SectionCableConduitSizing
} from '../types';
import { ItemMaterialSugerido } from '../../cemig/padraoEngine';
import { MARKET_PRICING_CATALOG } from '../database/bomPricingDatabase';

export type InstallationStageId =
  | 'ETAPA_1_PADRAO_CEMIG'
  | 'ETAPA_2_TRECHO_1_PADRAO_220V'
  | 'ETAPA_3_PAINEL_220V'
  | 'ETAPA_4_TRECHO_2_220V_TRAFO'
  | 'ETAPA_5_SUBESTACAO_TRAFO'
  | 'ETAPA_6_TRECHO_3_TRAFO_380V'
  | 'ETAPA_7_PAINEL_380V_QGBT'
  | 'ETAPA_8_TRECHO_4_RAMAIS_VE'
  | 'ETAPA_9_PONTO_RECARGA'
  | 'ETAPA_10_SEGURANCA_EMERGENCIA'
  | 'ETAPA_9_PONTO_RECARGA_SEGURANCA';

export type LaborCalculationMode = 'TABELADO' | 'PERCENTUAL';

export interface StageLaborOverride {
  mode?: LaborCalculationMode;
  percent?: number;
  fixedAmountBRL?: number;
}

export interface ModularBOMItem extends BillOfMaterialItem {
  stageId: InstallationStageId;
  codigo?: string;
  pricingSource: 'CEMIG_DB' | 'CAPEX_DB' | 'ESTIMATIVA_WEB' | 'MANUAL' | 'DEFAULT';
  laborCostBRL?: number;
  isMandatoryNorm?: boolean;
  isService?: boolean;
}

export interface ModularBOMStage {
  stageId: InstallationStageId;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  items: ModularBOMItem[];
  subtotalMaterialsBRL: number;
  subtotalLaborBRL: number;
  totalStageBRL: number;
  laborMode: LaborCalculationMode;
  tabeladoLaborBRL: number;
  percentLaborBRL: number;
}

export interface ModularBOMOutput {
  stages: ModularBOMStage[];
  totalMaterialsNetBRL: number;
  totalLaborNetBRL: number;
  globalBdiPercent: number;
  globalBdiAmountBRL: number;
  totalProjectInvestmentBRL: number;
  totalItemsCount: number;
  laborMode: LaborCalculationMode;
  syncedOrcamentoProjetoId?: string;
  syncedAt?: string;
}

export interface ModularBOMOptions {
  includeEntranceStandardInBOM?: boolean;
  includeEmergencyShutdown?: boolean;
  terminalType?: 'COMPRESSAO_OLHAL' | 'TUBULAR';
  globalBdiPercent?: number;       // Margem BDI global (ex: 20%)
  laborPercent?: number;           // Mão de obra global estimada (% dos materiais, ex: 25%)
  laborMode?: LaborCalculationMode; // 'TABELADO' (default) | 'PERCENTUAL'
  stageLaborOverrides?: Record<string, StageLaborOverride>;
  userBOMOverrides?: Record<string, { quantity?: number; unitPriceBRL?: number }>;
  deletedItemIds?: string[];
  customAddedItems?: BillOfMaterialItem[];
  pricingCatalog?: Record<string, {
    unitPrice: number;
    supplier?: string;
    source?: 'CEMIG_DB' | 'CAPEX_DB' | 'ESTIMATIVA_WEB';
    dataUltimaCotacao?: string | null;
    numeroOrcamento?: string | null;
  }>;
}

/**
 * Metadados estáticos descritivos das 9 etapas físicas da obra
 */
export const STAGE_METADATA: Record<InstallationStageId, { order: number; title: string; shortTitle: string; description: string }> = {
  ETAPA_1_PADRAO_CEMIG: {
    order: 1,
    title: '1. Padrão de Entrada CEMIG ND-5.1',
    shortTitle: 'Padrão CEMIG',
    description: 'Poste homologado, caixas de medição e proteção (CM-1 a CM-18 ou Tabela 4), disjuntor de entrada PEC-11, aterramento e ferragens normatizadas.'
  },
  ETAPA_2_TRECHO_1_PADRAO_220V: {
    order: 2,
    title: '2. Linha Alimentadora (Padrão ➔ Painel 220V)',
    shortTitle: 'Trecho 1 (Padrão ➔ QG 220V)',
    description: 'Cabos de potência BT 0,6/1kV dimensionados por ampacidade e queda de tensão (≤ 2%), eletrodutos corrugados reforçados/PEAD, vala técnica e fita de aviso.'
  },
  ETAPA_3_PAINEL_220V: {
    order: 3,
    title: '3. Painel Geral de Proteção & Medição 220V',
    shortTitle: 'Painel 220V Hub',
    description: 'Quadro sobrepor metálico IP54/IP65, disjuntor geral caixa moldada Curva D, barramento de cobre dimensionado, DPS Classe I+II (12,5kA), medidor Modbus e circuitos auxiliares.'
  },
  ETAPA_4_TRECHO_2_220V_TRAFO: {
    order: 4,
    title: '4. Alimentador Primário (Painel 220V ➔ Trafo Dyn1)',
    shortTitle: 'Trecho 2 (220V ➔ Trafo)',
    description: 'Condutores EPR/XLPE para alta densidade de corrente primária, calhas/eletrodutos metálicos rígidos e equipotencialização de carcaça.'
  },
  ETAPA_5_SUBESTACAO_TRAFO: {
    order: 5,
    title: '5. Subestação / Trafo Elevador Dyn1 220/380V',
    shortTitle: 'Transformador Elevador',
    description: 'Transformador a seco classe F/H Dyn1 (220/380V Yn) com blindagem eletrostática aterrada, relé digital com sondas térmicas PT100, base civil e coxins antivibração.'
  },
  ETAPA_6_TRECHO_3_TRAFO_380V: {
    order: 6,
    title: '6. Alimentador Secundário (Trafo ➔ QGBT 380V)',
    shortTitle: 'Trecho 3 (Trafo ➔ QGBT 380V)',
    description: 'Condutores de cobre 0,6/1kV para 380V trifásico com neutro e terra acessíveis, dutos metálicos e prensa-cabos IP68.'
  },
  ETAPA_7_PAINEL_380V_QGBT: {
    order: 7,
    title: '7. Painel Geral 380V (QGBT-VE)',
    shortTitle: 'QGBT 380V (Estações)',
    description: 'Quadro de comando industrial, disjuntor geral secundário, barramento 380V, disjuntores dedicados por carregador, DRs Tipo B 30mA (ou Tipo A + RDC-DD) e DPS Classe II 40kA.'
  },
  ETAPA_8_TRECHO_4_RAMAIS_VE: {
    order: 8,
    title: '8. Ramais Terminais dos Carregadores',
    shortTitle: 'Trecho 4 (Ramais VE)',
    description: 'Cabos flexíveis de potência para cada vaga separados em Fase (Preto), Neutro (Azul) e Terra (Verde), eletrodutos por diâmetro e cabo de comunicação blindado Cat6 para DLM.'
  },
  ETAPA_9_PONTO_RECARGA: {
    order: 9,
    title: '9. Ponto de Recarga, Infra Civil & Demarcação',
    shortTitle: 'Ponto Recarga & Civil',
    description: 'Totens estruturais de fixação, pedestal dos carregadores, bases de ancoragem em concreto armado e demarcação viária de solo em resina antiderrapante verde (NBR 17019).'
  },
  ETAPA_9_PONTO_RECARGA_SEGURANCA: {
    order: 9,
    title: '9. Ponto de Recarga, Infra Civil & Demarcação',
    shortTitle: 'Ponto Recarga & Civil',
    description: 'Totens estruturais de fixação, pedestal dos carregadores, bases de ancoragem em concreto armado e demarcação viária de solo em resina antiderrapante verde (NBR 17019).'
  },
  ETAPA_10_SEGURANCA_EMERGENCIA: {
    order: 10,
    title: '10. Itens de Segurança, Proteção contra Incêndio & Emergência',
    shortTitle: 'Itens de Segurança & Normas',
    description: 'Botão de parada de emergência cogumelo com trava (≤ 5m NBR 17019), bobina de disparo MX no QGBT, extintores CO2/ABC, bate-rodas (bollards) tubulares e sinalização fotoluminescente.'
  }
};

/**
 * Regra Obrigatória Cordeiro Energia / NBR 5410:
 * - Circuito Trifásico (3F): 3 pernas de fase + 1 perna de neutro + 1 perna de terra (PE) = 5 vias
 * - Circuito Bifásico (2F): 2 pernas de fase + 1 perna de neutro + 1 perna de terra (PE) = 4 vias
 * - Circuito Monofásico (1F): 1 perna de fase + 1 perna de neutro + 1 perna de terra (PE) = 3 vias
 * Caso haja múltiplos condutores por fase (condutores em paralelo), as pernas de fase e neutro
 * são multiplicadas por conductorsPerPhase.
 */
export function calculateConductorLegs(
  phases: number,
  conductorsPerPhase: number = 1
): {
  phaseLegs: number;
  neutralLegs: number;
  groundLegs: number;
  totalVias: number;
  viasDescription: string;
} {
  const nFases = phases === 3 ? 3 : phases === 2 ? 2 : 1;
  const nParalelo = Math.max(1, conductorsPerPhase);
  const phaseLegs = nFases * nParalelo;
  const neutralLegs = 1 * nParalelo;
  const groundLegs = 1; // Condutor de Proteção (PE) interligado ao BEP
  const totalVias = phaseLegs + neutralLegs + groundLegs;

  const viasDescription = phases === 3
    ? (nParalelo > 1 ? `${nParalelo}x (3F + 1N) + 1PE (${totalVias} vias)` : `3F + 1N + 1PE (5 vias)`)
    : phases === 2
    ? (nParalelo > 1 ? `${nParalelo}x (2F + 1N) + 1PE (${totalVias} vias)` : `2F + 1N + 1PE (4 vias)`)
    : `1F + 1N + 1PE (3 vias)`;

  return { phaseLegs, neutralLegs, groundLegs, totalVias, viasDescription };
}

/**
 * Função utilitária para buscar preço unitário no catálogo do CAPEX ou nos fallbacks
 */
export interface ResolvedPriceResult {
  price: number;
  supplier: string;
  source: 'CEMIG_DB' | 'CAPEX_DB' | 'ESTIMATIVA_WEB' | 'DEFAULT';
  dataUltimaCotacao?: string | null;
  numeroOrcamento?: string | null;
  isPrecoDesatualizado: boolean;
}

function resolvePrice(
  codigo: string | undefined,
  description: string,
  fallbackPrice: number,
  fallbackSupplier: string,
  pricingCatalog?: Record<string, {
    unitPrice: number;
    supplier?: string;
    source?: 'CEMIG_DB' | 'CAPEX_DB' | 'ESTIMATIVA_WEB';
    dataUltimaCotacao?: string | null;
    numeroOrcamento?: string | null;
  }>
): ResolvedPriceResult {
  if (pricingCatalog) {
    // 1. Busca exata por código oficial CEMIG / CAPEX
    if (codigo && pricingCatalog[codigo] && pricingCatalog[codigo].unitPrice > 0) {
      const entry = pricingCatalog[codigo];
      const isOutdated = !entry.dataUltimaCotacao || entry.source === 'ESTIMATIVA_WEB' || entry.numeroOrcamento === 'PENDENTE_HOMOLOGACAO';
      return {
        price: entry.unitPrice,
        supplier: entry.supplier || 'Fornecedor Homologado',
        source: entry.source || 'CAPEX_DB',
        dataUltimaCotacao: entry.dataUltimaCotacao || null,
        numeroOrcamento: entry.numeroOrcamento || null,
        isPrecoDesatualizado: isOutdated
      };
    }

    // 2. Busca por descrição limpa
    const cleanDesc = description.trim().toLowerCase();
    if (pricingCatalog[cleanDesc] && pricingCatalog[cleanDesc].unitPrice > 0) {
      const entry = pricingCatalog[cleanDesc];
      const isOutdated = !entry.dataUltimaCotacao || entry.source === 'ESTIMATIVA_WEB' || entry.numeroOrcamento === 'PENDENTE_HOMOLOGACAO';
      return {
        price: entry.unitPrice,
        supplier: entry.supplier || 'Fornecedor Homologado',
        source: entry.source || 'CAPEX_DB',
        dataUltimaCotacao: entry.dataUltimaCotacao || null,
        numeroOrcamento: entry.numeroOrcamento || null,
        isPrecoDesatualizado: isOutdated
      };
    }
  }

  // 3. Fallback de referência de mercado pré-cadastrada
  return {
    price: fallbackPrice,
    supplier: fallbackSupplier,
    source: 'DEFAULT',
    dataUltimaCotacao: null,
    numeroOrcamento: null,
    isPrecoDesatualizado: true
  };
}

/**
 * Gera os 3 condutores separados: Fase (Preta), Neutro (Azul Claro) e Terra (Verde)
 * em cumprimento estrito à NBR 5410 e solicitação da Cordeiro Energia
 */
function generatePhaseNeutralGroundCables({
  stageId,
  idPrefix,
  material,
  phases,
  conductorsPerPhase,
  gaugePhaseMM2,
  gaugeNeutralMM2,
  gaugeGroundMM2,
  distanceTotalM,
  voltageDropPercent,
  pricingCatalog
}: {
  stageId: InstallationStageId;
  idPrefix: string;
  material: 'copper' | 'aluminum';
  phases: 1 | 2 | 3;
  conductorsPerPhase: number;
  gaugePhaseMM2: number;
  gaugeNeutralMM2?: number;
  gaugeGroundMM2: number;
  distanceTotalM: number;
  voltageDropPercent?: number;
  pricingCatalog?: any;
}): ModularBOMItem[] {
  const isAl = material === 'aluminum';
  const legs = calculateConductorLegs(phases, conductorsPerPhase);
  const matName = isAl ? 'Alumínio' : 'Cobre';
  const supplierDefault = isAl ? 'Alubar / Cordeiro Cabos' : 'Prysmian / Sil';
  
  const actualNeutralGauge = gaugeNeutralMM2 || gaugePhaseMM2;
  const actualGroundGauge = gaugeGroundMM2 || (gaugePhaseMM2 <= 16 ? gaugePhaseMM2 : gaugePhaseMM2 <= 35 ? 16 : Math.ceil(gaugePhaseMM2 / 2));

  // 1. Condutor de Fase (Cor: Preta)
  const phaseMeters = Math.ceil(distanceTotalM * legs.phaseLegs);
  const pricePhase = isAl ? Math.max(12, gaugePhaseMM2 * 0.35) : Math.max(18, gaugePhaseMM2 * 0.85);
  const resPhase = resolvePrice(
    `CABO-${isAl ? 'AL' : 'CU'}-${gaugePhaseMM2}-PT`,
    `Cabo ${matName} Flexível 0,6/1kV ${gaugePhaseMM2}mm² Preto`,
    pricePhase,
    supplierDefault,
    pricingCatalog
  );

  const phaseItem: ModularBOMItem = {
    id: `${idPrefix}-cabo-fase-preto`,
    stageId,
    codigo: `CABO-${isAl ? 'AL' : 'CU'}-${gaugePhaseMM2}MM-PT`,
    category: 'condutores',
    description: `Cabo de ${matName} Flexível 0,6/1kV EPR/XLPE 90°C ${gaugePhaseMM2} mm² — Condutor de Fase (Cor: Preta)`,
    quantity: phaseMeters,
    unit: 'm',
    spec: `${legs.phaseLegs} pernas de fase (${phases === 3 ? '3 Fases R, S, T' : phases === 2 ? '2 Fases' : '1 Fase'}${conductorsPerPhase > 1 ? ` com ${conductorsPerPhase} cabos em paralelo por fase` : ''}) na cor PRETA • Comprimento total: ${phaseMeters}m (distância ${distanceTotalM}m) • Bitola: ${gaugePhaseMM2} mm²${voltageDropPercent ? ` • Queda: ${voltageDropPercent}%` : ''}`,
    normReference: 'NBR 5410 / NBR 7286',
    manufacturer: resPhase.supplier,
    unitPriceBRL: resPhase.price,
    totalPriceBRL: Number((phaseMeters * resPhase.price).toFixed(2)),
    pricingSource: resPhase.source,
    isMandatoryNorm: true
  };

  // 2. Condutor de Neutro (Cor: Azul Claro)
  const neutralMeters = Math.ceil(distanceTotalM * legs.neutralLegs);
  const priceNeutral = isAl ? Math.max(10, actualNeutralGauge * 0.35) : Math.max(15, actualNeutralGauge * 0.85);
  const resNeutral = resolvePrice(
    `CABO-${isAl ? 'AL' : 'CU'}-${actualNeutralGauge}-AZ`,
    `Cabo ${matName} Flexível 0,6/1kV ${actualNeutralGauge}mm² Azul`,
    priceNeutral,
    supplierDefault,
    pricingCatalog
  );

  const neutralItem: ModularBOMItem = {
    id: `${idPrefix}-cabo-neutro-azul`,
    stageId,
    codigo: `CABO-${isAl ? 'AL' : 'CU'}-${actualNeutralGauge}MM-AZ`,
    category: 'condutores',
    description: `Cabo de ${matName} Flexível 0,6/1kV EPR/XLPE 90°C ${actualNeutralGauge} mm² — Condutor de Neutro (Cor: Azul Claro)`,
    quantity: neutralMeters,
    unit: 'm',
    spec: `${legs.neutralLegs} perna(s) de neutro na cor AZUL CLARO (NBR 5410 item 6.1.5.3.1) • Comprimento total: ${neutralMeters}m (distância ${distanceTotalM}m) • Bitola: ${actualNeutralGauge} mm²`,
    normReference: 'NBR 5410 item 6.1.5.3.1',
    manufacturer: resNeutral.supplier,
    unitPriceBRL: resNeutral.price,
    totalPriceBRL: Number((neutralMeters * resNeutral.price).toFixed(2)),
    pricingSource: resNeutral.source,
    isMandatoryNorm: true
  };

  // 3. Condutor de Proteção / Terra (Cor: Verde)
  const groundMeters = Math.ceil(distanceTotalM * legs.groundLegs);
  const priceGround = isAl ? Math.max(8, actualGroundGauge * 0.35) : Math.max(12, actualGroundGauge * 0.85);
  const resGround = resolvePrice(
    `CABO-${isAl ? 'AL' : 'CU'}-${actualGroundGauge}-VD`,
    `Cabo ${matName} Flexível 0,6/1kV ${actualGroundGauge}mm² Verde`,
    priceGround,
    supplierDefault,
    pricingCatalog
  );

  const groundItem: ModularBOMItem = {
    id: `${idPrefix}-cabo-terra-verde`,
    stageId,
    codigo: `CABO-${isAl ? 'AL' : 'CU'}-${actualGroundGauge}MM-VD`,
    category: 'condutores',
    description: `Cabo de ${matName} Flexível 0,6/1kV EPR/XLPE 90°C ${actualGroundGauge} mm² — Condutor de Proteção / Terra (Cor: Verde)`,
    quantity: groundMeters,
    unit: 'm',
    spec: `${legs.groundLegs} perna de terra (PE) na cor VERDE (NBR 5410 item 6.1.5.3.2) • Comprimento total: ${groundMeters}m (distância ${distanceTotalM}m) • Bitola: ${actualGroundGauge} mm² • Interligado ao BEP`,
    normReference: 'NBR 5410 item 6.1.5.3.2',
    manufacturer: resGround.supplier,
    unitPriceBRL: resGround.price,
    totalPriceBRL: Number((groundMeters * resGround.price).toFixed(2)),
    pricingSource: resGround.source,
    isMandatoryNorm: true
  };

  return [phaseItem, neutralItem, groundItem];
}

/**
 * Gera o item de eletroduto / duto com diâmetro nominal em polegadas e milímetros externos
 */
function generateConduitItem({
  stageId,
  idPrefix,
  conduitInches,
  conduitDiameterMM,
  distanceTotalM,
  conduitFillingRatePercent,
  conduitQuantity = 1,
  pricingCatalog
}: {
  stageId: InstallationStageId;
  idPrefix: string;
  conduitInches: string;
  conduitDiameterMM: number;
  distanceTotalM: number;
  conduitFillingRatePercent: number;
  conduitQuantity?: number;
  pricingCatalog?: any;
}): ModularBOMItem {
  const cleanInches = conduitInches.replace('/', '_').replace('"', '');
  const totalMeters = Math.ceil(distanceTotalM * Math.max(1, conduitQuantity));
  const resConduit = resolvePrice(
    `DUTO-PEAD-${cleanInches}`,
    `Eletroduto PEAD Corrugado Reforçado Ø ${conduitInches}`,
    Math.max(22, conduitDiameterMM * 0.45),
    'Kanalex / Tigre',
    pricingCatalog
  );

  return {
    id: `${idPrefix}-eletroduto`,
    stageId,
    codigo: `DUTO-${cleanInches}`,
    category: 'infraestrutura',
    description: `Eletroduto / Duto PEAD Corrugado Reforçado Ø ${conduitInches} (${conduitDiameterMM}mm ext) com Arame Guia`,
    quantity: totalMeters,
    unit: 'm',
    spec: `Diâmetro nominal: ${conduitInches} (Diâmetro Externo: ${conduitDiameterMM}mm) • ${conduitQuantity > 1 ? `${conduitQuantity} dutos em paralelo • ` : ''}Taxa de ocupação calculada: ${conduitFillingRatePercent}% (NBR 5410 ≤ 40%) • Distância: ${distanceTotalM}m`,
    normReference: 'NBR 15715 / NBR 5410',
    manufacturer: resConduit.supplier,
    unitPriceBRL: resConduit.price,
    totalPriceBRL: Number((totalMeters * resConduit.price).toFixed(2)),
    pricingSource: resConduit.source,
    isMandatoryNorm: true
  };
}

/**
 * Gera os terminais dos condutores separados por bitola conforme o tipo de terminal selecionado no projeto:
 * - 'COMPRESSAO_OLHAL' (padrão): Terminal Olhal de Compressão em Cobre Estanhado
 * - 'TUBULAR': Terminal Tubular em Cobre Estanhado
 * - Item 1: Fase e Neutro (compartilham a bitola gaugePhaseMM2):
 *   Quantidade = 2 pontas x (nFases + 1 neutro) x nParalelo
 *   (Ex: Trifásico singelo 120mm²: 2 pontas x 4 condutores = 8 peças; se dobrado: 16 peças; se triplicado: 24 peças)
 * - Item 2: Proteção / Terra (bitola gaugeGroundMM2):
 *   Quantidade = 2 pontas x 1 terra = 2 peças
 */
function generateConductorTerminals({
  stageId,
  idPrefix,
  phases,
  conductorsPerPhase = 1,
  gaugePhaseMM2,
  gaugeGroundMM2,
  terminalType = 'COMPRESSAO_OLHAL',
  fromLocationDesc = 'extremidade inicial',
  toLocationDesc = 'extremidade final',
  pricingCatalog
}: {
  stageId: InstallationStageId;
  idPrefix: string;
  phases: number;
  conductorsPerPhase?: number;
  gaugePhaseMM2: number;
  gaugeGroundMM2: number;
  terminalType?: 'COMPRESSAO_OLHAL' | 'TUBULAR';
  fromLocationDesc?: string;
  toLocationDesc?: string;
  pricingCatalog?: any;
}): ModularBOMItem[] {
  const nFases = phases === 3 ? 3 : phases === 2 ? 2 : 1;
  const nParalelo = Math.max(1, conductorsPerPhase);
  const isTubular = terminalType === 'TUBULAR';

  // 1. Terminais de Fase e Neutro (mesma bitola gaugePhaseMM2)
  // 2 pontas x (nFases + 1N) x nParalelo
  const phaseNeutralTerminalsQty = 2 * (nFases + 1) * nParalelo;

  // 2. Terminais de Proteção / Terra (bitola gaugeGroundMM2)
  // 2 pontas x 1 terra
  const groundTerminalsQty = 2;

  const getTerminalPrice = (gauge: number, tubular: boolean) => {
    const base =
      gauge <= 10 ? 3.5 :
      gauge <= 16 ? 4.5 :
      gauge <= 25 ? 6.5 :
      gauge <= 35 ? 8.5 :
      gauge <= 50 ? 12.0 :
      gauge <= 70 ? 15.5 :
      gauge <= 95 ? 19.0 :
      gauge <= 120 ? 24.0 :
      gauge <= 150 ? 29.0 :
      gauge <= 185 ? 36.0 : 48.0;
    return tubular ? Number((base * 0.9).toFixed(2)) : base;
  };

  const phaseCode = isTubular ? `TERM-TUBULAR-${gaugePhaseMM2}` : `TERM-COMPRESSAO-${gaugePhaseMM2}`;
  const phaseTypeLabel = isTubular ? 'Terminal Tubular em Cobre Estanhado' : 'Terminal Olhal de Compressão em Cobre Estanhado';
  const pricePhaseTerm = getTerminalPrice(gaugePhaseMM2, isTubular);
  const resPhase = resolvePrice(
    phaseCode,
    `${phaseTypeLabel} ${gaugePhaseMM2} mm²`,
    pricePhaseTerm,
    'Intelli / Magnet',
    pricingCatalog
  );

  const groundCode = isTubular ? `TERM-TUBULAR-${gaugeGroundMM2}` : `TERM-COMPRESSAO-${gaugeGroundMM2}`;
  const priceGroundTerm = getTerminalPrice(gaugeGroundMM2, isTubular);
  const resGround = resolvePrice(
    groundCode,
    `${phaseTypeLabel} ${gaugeGroundMM2} mm²`,
    priceGroundTerm,
    'Intelli / Magnet',
    pricingCatalog
  );

  const phaseNeutralItem: ModularBOMItem = {
    id: `${idPrefix}-terminal-fase-neutro`,
    stageId,
    codigo: phaseCode,
    category: 'acessorios',
    description: `${phaseTypeLabel} ${gaugePhaseMM2} mm² para Cabos de Fase e Neutro (com Termoencolhível)`,
    quantity: phaseNeutralTerminalsQty,
    unit: 'pç',
    spec: `${phaseNeutralTerminalsQty} terminais (${isTubular ? 'Tipo Tubular' : 'Tipo Olhal de Compressão'}) para bitola ${gaugePhaseMM2} mm²: 2 pontas x (${nFases} fases + 1 neutro) x ${nParalelo} condutor(es) em paralelo (${(nFases + 1) * nParalelo} na ${fromLocationDesc} e ${(nFases + 1) * nParalelo} na ${toLocationDesc})`,
    normReference: 'NBR 5410 item 6.2.8.2 / NBR 5370',
    manufacturer: resPhase.supplier,
    unitPriceBRL: resPhase.price,
    totalPriceBRL: Number((phaseNeutralTerminalsQty * resPhase.price).toFixed(2)),
    pricingSource: resPhase.source,
    isMandatoryNorm: true
  };

  const groundItem: ModularBOMItem = {
    id: `${idPrefix}-terminal-terra`,
    stageId,
    codigo: groundCode,
    category: 'acessorios',
    description: `${phaseTypeLabel} ${gaugeGroundMM2} mm² para Cabo de Proteção / Terra (com Termoencolhível)`,
    quantity: groundTerminalsQty,
    unit: 'pç',
    spec: `${groundTerminalsQty} terminais (${isTubular ? 'Tipo Tubular' : 'Tipo Olhal de Compressão'}) para bitola ${gaugeGroundMM2} mm²: 2 pontas x 1 condutor de terra PE (1 na ${fromLocationDesc} interligado ao BEP e 1 na ${toLocationDesc} no barramento de terra)`,
    normReference: 'NBR 5410 item 6.2.8.2 / NBR 5370',
    manufacturer: resGround.supplier,
    unitPriceBRL: resGround.price,
    totalPriceBRL: Number((groundTerminalsQty * resGround.price).toFixed(2)),
    pricingSource: resGround.source,
    isMandatoryNorm: true
  };

  return [phaseNeutralItem, groundItem];
}

/**
 * Construtor principal da Lista de Materiais Modular
 */
export function buildModularBOM(
  chainOutput: ChainTopologyOutput,
  cemigPadraoItems: ItemMaterialSugerido[] = [],
  options: ModularBOMOptions = {}
): ModularBOMOutput {
  const {
    includeEntranceStandardInBOM = true,
    includeEmergencyShutdown = true,
    terminalType = 'COMPRESSAO_OLHAL',
    globalBdiPercent = 20,
    laborPercent = 25,
    laborMode = 'TABELADO',
    stageLaborOverrides = {},
    userBOMOverrides = {},
    deletedItemIds = [],
    customAddedItems = [],
    pricingCatalog
  } = options;

  const deletedSet = new Set(deletedItemIds);
  const rawItemsByStage: Record<InstallationStageId, ModularBOMItem[]> = {
    ETAPA_1_PADRAO_CEMIG: [],
    ETAPA_2_TRECHO_1_PADRAO_220V: [],
    ETAPA_3_PAINEL_220V: [],
    ETAPA_4_TRECHO_2_220V_TRAFO: [],
    ETAPA_5_SUBESTACAO_TRAFO: [],
    ETAPA_6_TRECHO_3_TRAFO_380V: [],
    ETAPA_7_PAINEL_380V_QGBT: [],
    ETAPA_8_TRECHO_4_RAMAIS_VE: [],
    ETAPA_9_PONTO_RECARGA: [],
    ETAPA_10_SEGURANCA_EMERGENCIA: [],
    ETAPA_9_PONTO_RECARGA_SEGURANCA: []
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Padrão de Entrada CEMIG ND-5.1
  // ─────────────────────────────────────────────────────────────────────────────
  if (includeEntranceStandardInBOM && cemigPadraoItems && cemigPadraoItems.length > 0) {
    cemigPadraoItems.forEach((cItem, idx) => {
      const isMaterialCivilBase =
        cItem.codigo === 'MAT-BASE-CONCRETO' ||
        cItem.codigo === 'SRV-BASE-CONCRETO' ||
        cItem.descricao.toLowerCase().includes('base concretada') ||
        cItem.descricao.toLowerCase().includes('material civil');

      const isService = !isMaterialCivilBase && (
        cItem.categoria === 'MAO_DE_OBRA' ||
        cItem.unidade === 'sv' ||
        (cItem.codigo && (cItem.codigo.startsWith('SRV-') || cItem.codigo.startsWith('SERV-'))) ||
        cItem.descricao.toLowerCase().includes('mão de obra') ||
        cItem.descricao.toLowerCase().includes('mao de obra') ||
        cItem.descricao.toLowerCase().includes('projeto elétrico') ||
        cItem.descricao.toLowerCase().includes('acompanhamento técnico') ||
        cItem.descricao.toLowerCase().includes('vistoria')
      );

      const defaultSupplier = isMaterialCivilBase
        ? 'Distribuidor Materiais de Construção'
        : isService
        ? 'Cordeiro Engenharia & Serviços'
        : 'Distribuidor CEMIG PEC-11';

      const resolved = resolvePrice(
        cItem.codigo,
        cItem.descricao,
        cItem.precoUnitarioEstimado || (isMaterialCivilBase ? 220 : 0),
        defaultSupplier,
        pricingCatalog
      );

      rawItemsByStage.ETAPA_1_PADRAO_CEMIG.push({
        id: `bom-etapa1-${idx}-${cItem.codigo || idx}`,
        stageId: 'ETAPA_1_PADRAO_CEMIG',
        codigo: cItem.codigo,
        category: isService ? 'MAO_DE_OBRA' : 'PADRAO_CEMIG',
        description: cItem.descricao,
        quantity: cItem.quantidade || 1,
        unit: cItem.unidade || (isService ? 'sv' : 'un'),
        spec: cItem.nota || (isService ? 'Serviço técnico especializado Cordeiro Energia' : isMaterialCivilBase ? 'Materiais para construção civil da base concretada do poste (cimento, areia, brita)' : `Material normatizado CEMIG ND-5.1 (${cItem.categoria})`),
        normReference: isService ? 'CREA-MG / CEMIG ND-5.1' : 'CEMIG ND-5.1',
        manufacturer: isService ? 'Cordeiro Energia' : resolved.supplier,
        unitPriceBRL: resolved.price,
        totalPriceBRL: Number(((cItem.quantidade || 1) * resolved.price).toFixed(2)),
        pricingSource: resolved.source,
        isMandatoryNorm: cItem.obrigatorioNorma,
        isService
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Trecho 1 (Padrão ➔ Painel 220V)
  // ─────────────────────────────────────────────────────────────────────────────
  const sec1 = chainOutput.sections.section1_standardToPanel220;
  if (sec1) {
    // Condutores separados: Fase (Preta), Neutro (Azul Claro) e Terra (Verde)
    const cables1 = generatePhaseNeutralGroundCables({
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      idPrefix: 'bom-etapa2',
      material: sec1.conductorMaterial,
      phases: sec1.phases || 3,
      conductorsPerPhase: sec1.conductorsPerPhase || 1,
      gaugePhaseMM2: sec1.cableGaugePhaseMM2,
      gaugeNeutralMM2: sec1.cableGaugeNeutralMM2,
      gaugeGroundMM2: sec1.cableGaugeGroundMM2,
      distanceTotalM: sec1.distanceTotalM,
      voltageDropPercent: sec1.voltageDropPercent,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push(...cables1);

    // Eletroduto / Duto PEAD separado por diâmetro
    const conduit1 = generateConduitItem({
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      idPrefix: 'bom-etapa2',
      conduitInches: sec1.conduitInches,
      conduitDiameterMM: sec1.conduitDiameterMM,
      distanceTotalM: sec1.distanceTotalM,
      conduitFillingRatePercent: sec1.conduitFillingRatePercent,
      conduitQuantity: sec1.conduitQuantity,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push(conduit1);

    // Terminais separados por bitola (Fases/Neutro vs Terra) conforme tipo selecionado
    const terminals1 = generateConductorTerminals({
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      idPrefix: 'bom-etapa2',
      phases: sec1.phases || 3,
      conductorsPerPhase: sec1.conductorsPerPhase || 1,
      gaugePhaseMM2: sec1.cableGaugePhaseMM2,
      gaugeGroundMM2: sec1.cableGaugeGroundMM2,
      terminalType,
      fromLocationDesc: 'saída do padrão CEMIG',
      toLocationDesc: 'entrada do painel 220V',
      pricingCatalog
    });
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push(...terminals1);

    // Caixas de Passagem Subterrâneas Tipo ZB (2 unidades por padrão no Trecho 2: Padrão ➔ Painel 220V)
    const qtdeCaixasZB = 2;
    const conduitDN1 = sec1.conduitDiameterMM || 50;
    const conduitPol1 = sec1.conduitInches || '2"';
    const conduitVias1 = Math.max(1, sec1.conduitQuantity || 1);

    const resCxZB = resolvePrice(
      'CX-SUBTERRANEA-ZB',
      'Caixa Subterrânea de Passagem Tipo ZB em Alvenaria/Concreto (50 x 50 x 60 cm - Norma CEMIG ND-5.1)',
      420.0,
      'Pré-Moldados / Alvenaria CEMIG',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push({
      id: 'bom-etapa2-caixa-zb',
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      codigo: 'CX-SUBTERRANEA-ZB',
      category: 'infraestrutura',
      description: 'Caixa Subterrânea de Passagem Tipo ZB em Alvenaria/Concreto (50 x 50 x 60 cm - Norma CEMIG ND-5.1)',
      quantity: qtdeCaixasZB,
      unit: 'un',
      spec: `${qtdeCaixasZB} caixas subterrâneas de passagem Tipo ZB ao longo da linha alimentadora (Padrão ➔ Painel 220V)`,
      normReference: 'CEMIG ND-5.1 / NBR 5410',
      manufacturer: resCxZB.supplier,
      unitPriceBRL: resCxZB.price,
      totalPriceBRL: Number((qtdeCaixasZB * resCxZB.price).toFixed(2)),
      pricingSource: resCxZB.source,
      isMandatoryNorm: true
    });

    const resTampaZB = resolvePrice(
      'TAMPA-FOFO-ZB',
      'Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZB (Padrão CEMIG)',
      320.0,
      'Fundição Homologada CEMIG',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push({
      id: 'bom-etapa2-tampa-zb',
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      codigo: 'TAMPA-FOFO-ZB',
      category: 'infraestrutura',
      description: 'Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZB (Padrão CEMIG)',
      quantity: qtdeCaixasZB,
      unit: 'un',
      spec: `${qtdeCaixasZB} tampas e aros de ferro fundido nodular acompanhando as ${qtdeCaixasZB} caixas de passagem Tipo ZB`,
      normReference: 'CEMIG ND-5.1',
      manufacturer: resTampaZB.supplier,
      unitPriceBRL: resTampaZB.price,
      totalPriceBRL: Number((qtdeCaixasZB * resTampaZB.price).toFixed(2)),
      pricingSource: resTampaZB.source,
      isMandatoryNorm: true
    });

    const qtdeNiplesZB = 2 * qtdeCaixasZB * conduitVias1;
    const nipleCod1 = `NIPLE-PVC-ROSCAVEL-${conduitDN1}`;
    const resNiple1 = resolvePrice(
      nipleCod1,
      `Niple Roscável de PVC Rígido Ø ${conduitDN1} mm (${conduitPol1}) para Acoplamento de Caixas`,
      conduitDN1 <= 40 ? 12.0 : conduitDN1 <= 50 ? 15.0 : conduitDN1 <= 60 ? 19.0 : conduitDN1 <= 85 ? 24.0 : 36.0,
      'Tigre / Amanco',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push({
      id: 'bom-etapa2-niple-pvc',
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      codigo: nipleCod1,
      category: 'eletrodutos',
      description: `Niple Roscável de PVC Rígido Ø ${conduitDN1} mm (${conduitPol1}) para Acoplamento nas Caixas ZB`,
      quantity: qtdeNiplesZB,
      unit: 'un',
      spec: `${qtdeNiplesZB} niples PVC Ø ${conduitDN1} mm (${2 * conduitVias1} niples por caixa ZB x ${qtdeCaixasZB} caixas ZB)`,
      normReference: 'NBR 15465 / NBR 5410',
      manufacturer: resNiple1.supplier,
      unitPriceBRL: resNiple1.price,
      totalPriceBRL: Number((qtdeNiplesZB * resNiple1.price).toFixed(2)),
      pricingSource: resNiple1.source,
      isMandatoryNorm: true
    });

    const qtdeBuchasZB = 2 * qtdeCaixasZB * conduitVias1;
    const buchaCod1 = `BUCHA-ARRUELA-PVC-${conduitDN1}`;
    const resBucha1 = resolvePrice(
      buchaCod1,
      `Conjunto Bucha e Arruela de PVC Roscável Ø ${conduitDN1} mm (${conduitPol1}) para Terminação de Eletroduto`,
      conduitDN1 <= 40 ? 14.0 : conduitDN1 <= 50 ? 18.0 : conduitDN1 <= 60 ? 24.0 : conduitDN1 <= 85 ? 32.0 : 45.0,
      'Tigre / Wetzel',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push({
      id: 'bom-etapa2-bucha-arruela-pvc',
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      codigo: buchaCod1,
      category: 'eletrodutos',
      description: `Conjunto Bucha e Arruela de PVC Roscável Ø ${conduitDN1} mm (${conduitPol1}) para Fixação nas Caixas ZB`,
      quantity: qtdeBuchasZB,
      unit: 'cj',
      spec: `${qtdeBuchasZB} conjuntos bucha e arruela PVC Ø ${conduitDN1} mm (${2 * conduitVias1} cj por caixa ZB x ${qtdeCaixasZB} caixas ZB)`,
      normReference: 'NBR 5410',
      manufacturer: resBucha1.supplier,
      unitPriceBRL: resBucha1.price,
      totalPriceBRL: Number((qtdeBuchasZB * resBucha1.price).toFixed(2)),
      pricingSource: resBucha1.source,
      isMandatoryNorm: true
    });

    const qtdeBritaZB = 3 * qtdeCaixasZB;
    const resBritaZB = resolvePrice(
      'BRITA-1-DRAIN',
      'Brita nº 1 para Drenagem de Caixa de Passagem/Inspeção (Saco 20kg)',
      18.0,
      'Depósito Material Civil',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_2_TRECHO_1_PADRAO_220V.push({
      id: 'bom-etapa2-brita-drenagem',
      stageId: 'ETAPA_2_TRECHO_1_PADRAO_220V',
      codigo: 'BRITA-1-DRAIN',
      category: 'infraestrutura',
      description: 'Brita nº 1 para Drenagem de Caixa de Passagem/Inspeção (Saco 20kg)',
      quantity: qtdeBritaZB,
      unit: 'un',
      spec: `${qtdeBritaZB} sacos de brita nº 1 (3 sacos por caixa de passagem ZB) para camada drenante de fundo`,
      normReference: 'CEMIG ND-5.1 Desenho 36',
      manufacturer: resBritaZB.supplier,
      unitPriceBRL: resBritaZB.price,
      totalPriceBRL: Number((qtdeBritaZB * resBritaZB.price).toFixed(2)),
      pricingSource: resBritaZB.source,
      isMandatoryNorm: true
    });

    // Fita plástica de advertência subterrânea (Aba 10: Segurança)
    rawItemsByStage.ETAPA_10_SEGURANCA_EMERGENCIA.push({
      id: 'bom-etapa10-fita-advertencia',
      stageId: 'ETAPA_10_SEGURANCA_EMERGENCIA',
      codigo: 'FITA-ADVERT-ALTA-TENSAO',
      category: 'seguranca',
      description: 'Fita Plástica de Advertência de Perigo Alta Tensão Subterrânea 20cm (Instalada a 20cm de profundidade sobre os eletrodutos)',
      quantity: Math.ceil(sec1.distanceTotalM),
      unit: 'm',
      spec: 'Sinalização visual de segurança obrigatória para prevenção de acidentes em escavações futuras (NBR 5410 item 6.2.11.1)',
      normReference: 'NBR 5410 item 6.2.11.1',
      manufacturer: 'Magnet / Intelli',
      unitPriceBRL: 4.5,
      totalPriceBRL: Number((Math.ceil(sec1.distanceTotalM) * 4.5).toFixed(2)),
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 3: Painel de Proteção e Medição 220V (Quadro Geral do Hub)
  // ─────────────────────────────────────────────────────────────────────────────
  const p220 = chainOutput.panel220V;
  if (p220) {
    // 1. Invólucro Metálico
    const resolvedEnclosure = resolvePrice(
      'QUADRO-220V-IP54',
      'Quadro de Montagem Metálico Sobrepor IP54/IP65',
      MARKET_PRICING_CATALOG.enclosures.metal_cemar.basePrice,
      MARKET_PRICING_CATALOG.enclosures.metal_cemar.manufacturer,
      pricingCatalog
    );
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-quadro-enclosure',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: 'QUADRO-220V-IP54',
      category: 'quadro',
      description: `Quadro Geral de Distribuição Metálico Sobrepor com Placa Laranja IP54/IP65 (Hub 220V)`,
      quantity: 1,
      unit: 'pç',
      spec: `Dimensões compatíveis com barramento ${p220.busbarRatingA}A e disjuntor caixa moldada`,
      normReference: 'NBR IEC 61439-1/2',
      manufacturer: resolvedEnclosure.supplier,
      unitPriceBRL: resolvedEnclosure.price,
      totalPriceBRL: resolvedEnclosure.price,
      pricingSource: resolvedEnclosure.source,
      isMandatoryNorm: true
    });

    // 2. Disjuntor Geral Caixa Moldada 220V
    const resolvedMccb = resolvePrice(
      `DISJ-MCCB-${p220.mainBreakerA}A`,
      `Disjuntor Caixa Moldada Tripolar ${p220.mainBreakerA}A Curva ${p220.mainBreakerCurve}`,
      MARKET_PRICING_CATALOG.breaker_mccb.standard.base + (p220.mainBreakerA * MARKET_PRICING_CATALOG.breaker_mccb.standard.pricePerAmp),
      'WEG / Soprano (PEC-11)',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-disjuntor-geral',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: `DISJ-MCCB-${p220.mainBreakerA}A`,
      category: 'protecao',
      description: `Disjuntor Caixa Moldada Tripolar ${p220.mainBreakerA}A Curva ${p220.mainBreakerCurve} (Icu ≥ 25kA em 220V)`,
      quantity: 1,
      unit: 'pç',
      spec: `Corrente Nominal: ${p220.mainBreakerA}A • Curva de Disparo: Curva ${p220.mainBreakerCurve} (Suporta Inrush do Trafo) • Icu: 25kA • Disparador térmico e magnético ajustável`,
      normReference: 'NBR IEC 60947-2',
      manufacturer: resolvedMccb.supplier,
      unitPriceBRL: resolvedMccb.price,
      totalPriceBRL: resolvedMccb.price,
      pricingSource: resolvedMccb.source,
      isMandatoryNorm: true
    });

    // 2B. Disjuntor Caixa Moldada de Proteção do Transformador Elevador (se houver trafo)
    if (chainOutput.transformer.needed) {
      const trafoPrimaryBreakerA = p220.transformerProtectionBreakerA || 250;
      const trafoKVA = chainOutput.transformer.nominalKVA || 75;
      const resolvedMccbTrafo = resolvePrice(
        `DISJ-MCCB-${trafoPrimaryBreakerA}A`,
        `Disjuntor Caixa Moldada Tripolar de Proteção do Transformador ${trafoPrimaryBreakerA}A Curva D`,
        MARKET_PRICING_CATALOG.breaker_mccb.standard.base + (trafoPrimaryBreakerA * MARKET_PRICING_CATALOG.breaker_mccb.standard.pricePerAmp),
        'WEG / Schneider Electric',
        pricingCatalog
      );
      rawItemsByStage.ETAPA_3_PAINEL_220V.push({
        id: 'bom-etapa3-disjuntor-protecao-trafo',
        stageId: 'ETAPA_3_PAINEL_220V',
        codigo: `DISJ-MCCB-${trafoPrimaryBreakerA}A`,
        category: 'protecao',
        description: `Disjuntor Caixa Moldada Tripolar de Proteção do Transformador ${trafoPrimaryBreakerA}A Curva D (Icu ≥ 25kA em 220V)`,
        quantity: 1,
        unit: 'pç',
        spec: `Corrente Nominal: ${trafoPrimaryBreakerA}A • Curva D (Suporta Inrush de energização do trafo Dyn1 ${trafoKVA}kVA) • Icu: 25kA • NBR 5410 e NBR IEC 60947-2`,
        normReference: 'NBR IEC 60947-2',
        manufacturer: resolvedMccbTrafo.supplier,
        unitPriceBRL: resolvedMccbTrafo.price,
        totalPriceBRL: resolvedMccbTrafo.price,
        pricingSource: resolvedMccbTrafo.source,
        isMandatoryNorm: true
      });
    }

    // 3. Barramento de Cobre Eletrolítico 250A com 12 derivações
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-barramento-cobre',
      stageId: 'ETAPA_3_PAINEL_220V',
      category: 'quadro',
      description: `Conjunto de Barramento Trifásico em Cobre Eletrolítico 250A com Isoladores Bujão e Termoencolhível de Cores com 12 derivações`,
      quantity: 1,
      unit: 'cj',
      spec: `Densidade de corrente ≤ 2 A/mm² • R, S, T, Neutro e Terra identificados • 12 derivações para conexões dos disjuntores gerais, trafo, circuitos auxiliares e medição`,
      normReference: 'NBR 5410 / NBR IEC 61439-1',
      manufacturer: 'Cobrecon / Termotécnica',
      unitPriceBRL: 420.0,
      totalPriceBRL: 420.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });

    // 4. DPS Classe I+II Combinado
    const resolvedDps = resolvePrice(
      'DPS-CL1-CL2-45KA',
      'DPS Combinado Classe I+II 45kA 275V Plugável',
      MARKET_PRICING_CATALOG.surge_protection.clamper_45ka_275v.unitPrice,
      'Clamper / WEG',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-dps-combinado',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: 'DPS-CL1-CL2-45KA',
      category: 'protecao',
      description: 'DPS Combinado Classe I+II (10/350µs Iimp ≥ 12,5kA, 8/20µs In ≥ 40kA, Uc 275V) com Contato de Alarme Remoto',
      quantity: 3,
      unit: 'pç',
      spec: 'Proteção contra surtos atmosféricos diretos e indiretos de entrada',
      normReference: 'NBR 5410 / NBR 5419-4 / IEC 61643-11',
      manufacturer: resolvedDps.supplier,
      unitPriceBRL: resolvedDps.price,
      totalPriceBRL: Number((3 * resolvedDps.price).toFixed(2)),
      pricingSource: resolvedDps.source,
      isMandatoryNorm: true
    });

    // 5. Medição Inteligente do Hub
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-medidor-modbus',
      stageId: 'ETAPA_3_PAINEL_220V',
      category: 'medicao',
      description: 'Medidor Multifunção Trifásico Digital com Comunicação RS-485 Modbus RTU para Telemetria Dedicada do Hub',
      quantity: 1,
      unit: 'pç',
      spec: 'Leitura de kWh, V, I, FP e THD integrada ao sistema de gestão Cordeiro',
      normReference: 'IEC 62053-21',
      manufacturer: 'Kron / Schneider Electric',
      unitPriceBRL: 680.0,
      totalPriceBRL: 680.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: false
    });

    // 6. Circuitos Auxiliares e Proteção Dedicada (Iluminação 10A, Tomada 25A, CFTV 16A, DR Bipolar e Carga Cliente)
    // 6.1 Disjuntor Monofásico 10A Curva C para Iluminação
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-disjuntor-iluminacao',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: 'DISJ-DIN-1P-10A',
      category: 'protecao',
      description: 'Disjuntor Monofásico DIN 10A Curva C para Iluminação',
      quantity: 1,
      unit: 'pç',
      spec: 'Corrente Nominal: 10A • Curva C • Icu: 4,5kA/6kA • Proteção do circuito de iluminação LED do pátio e hub',
      normReference: 'NBR NM 60898 / NBR 5410',
      manufacturer: 'WEG / Soprano',
      unitPriceBRL: 32.0,
      totalPriceBRL: 32.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });

    // 6.2 Disjuntor Monofásico 25A Curva C para Tomada
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-disjuntor-tomada',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: 'DISJ-DIN-1P-25A',
      category: 'protecao',
      description: 'Disjuntor Monofásico DIN 25A Curva C para Tomada',
      quantity: 1,
      unit: 'pç',
      spec: 'Corrente Nominal: 25A • Curva C • Icu: 4,5kA/6kA • Proteção de tomada de serviço e manutenção TUG/TUE',
      normReference: 'NBR NM 60898 / NBR 5410',
      manufacturer: 'WEG / Soprano',
      unitPriceBRL: 35.0,
      totalPriceBRL: 35.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });

    // 6.3 Disjuntor Monofásico 16A Curva C para CFTV
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-disjuntor-cftv',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: 'DISJ-DIN-1P-16A',
      category: 'protecao',
      description: 'Disjuntor Monofásico DIN 16A Curva C para CFTV',
      quantity: 1,
      unit: 'pç',
      spec: 'Corrente Nominal: 16A • Curva C • Icu: 4,5kA/6kA • Proteção de CFTV, Telecomunicações e Monitoramento',
      normReference: 'NBR NM 60898 / NBR 5410',
      manufacturer: 'WEG / Soprano',
      unitPriceBRL: 34.0,
      totalPriceBRL: 34.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });

    // 6.4 Dispositivo DR Bipolar 25A / 30mA para Circuitos Auxiliares
    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-dr-bipolar-aux',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: 'DR-BIPOLAR-25A-30MA',
      category: 'protecao',
      description: 'Dispositivo Diferencial Residual (DR) Bipolar 25A / 30mA para Circuitos Auxiliares',
      quantity: 1,
      unit: 'pç',
      spec: 'Sensibilidade IΔn: 30mA • In: 25A • Proteção contra choques humanos em circuitos de tomadas e iluminação (NBR 5410)',
      normReference: 'ABNT NBR 5410 / NBR NM 61008',
      manufacturer: 'WEG / Soprano',
      unitPriceBRL: 125.0,
      totalPriceBRL: 125.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });

    // 6.5 Disjuntor Trifásico para Carga do Cliente Dimensionada na Aplicação
    const clientBreakerA = p220.auxiliaryLoads?.clientBaseBreaker?.breakerA || 40;
    const clientKW = p220.calculationBreakdown?.clientLoadKW || chainOutput.standardAlert?.clientBaseLoadKW || 0;
    const isMccbClient = clientBreakerA > 63;
    const clientBreakerDesc = isMccbClient
      ? `Disjuntor Caixa Moldada Tripolar ${clientBreakerA}A Curva C para Carga do Cliente (${clientKW.toFixed(1)} kW)`
      : `Disjuntor Tripolar DIN ${clientBreakerA}A Curva C para Carga do Cliente (${clientKW.toFixed(1)} kW)`;
    const clientBreakerCode = isMccbClient ? `DISJ-MCCB-${clientBreakerA}A` : `DISJ-DIN-3P-${clientBreakerA}A`;
    const clientBreakerPrice = isMccbClient
      ? resolvePrice(clientBreakerCode, clientBreakerDesc, 340.0, 'WEG / Soprano', pricingCatalog).price
      : resolvePrice(clientBreakerCode, clientBreakerDesc, 115.0, 'WEG / Soprano', pricingCatalog).price;

    rawItemsByStage.ETAPA_3_PAINEL_220V.push({
      id: 'bom-etapa3-disjuntor-carga-cliente',
      stageId: 'ETAPA_3_PAINEL_220V',
      codigo: clientBreakerCode,
      category: 'protecao',
      description: clientBreakerDesc,
      quantity: 1,
      unit: 'pç',
      spec: `Corrente Nominal: ${clientBreakerA}A • Curva C • Tripolar • Proteção dedicada para alimentação da carga do imóvel dimensionada na aplicação (${clientKW.toFixed(1)} kW)`,
      normReference: isMccbClient ? 'NBR IEC 60947-2' : 'NBR NM 60898',
      manufacturer: 'WEG / Soprano',
      unitPriceBRL: clientBreakerPrice,
      totalPriceBRL: clientBreakerPrice,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 4: Trecho 2 (Painel 220V ➔ Trafo Dyn1)
  // ─────────────────────────────────────────────────────────────────────────────
  const sec2 = chainOutput.sections.section2_panel220ToTrafo;
  if (sec2 && chainOutput.transformer.needed) {
    const cables2 = generatePhaseNeutralGroundCables({
      stageId: 'ETAPA_4_TRECHO_2_220V_TRAFO',
      idPrefix: 'bom-etapa4',
      material: sec2.conductorMaterial,
      phases: sec2.phases || 3,
      conductorsPerPhase: sec2.conductorsPerPhase || 1,
      gaugePhaseMM2: sec2.cableGaugePhaseMM2,
      gaugeNeutralMM2: sec2.cableGaugeNeutralMM2,
      gaugeGroundMM2: sec2.cableGaugeGroundMM2,
      distanceTotalM: sec2.distanceTotalM,
      voltageDropPercent: sec2.voltageDropPercent,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_4_TRECHO_2_220V_TRAFO.push(...cables2);

    const conduit2 = generateConduitItem({
      stageId: 'ETAPA_4_TRECHO_2_220V_TRAFO',
      idPrefix: 'bom-etapa4',
      conduitInches: sec2.conduitInches,
      conduitDiameterMM: sec2.conduitDiameterMM,
      distanceTotalM: sec2.distanceTotalM,
      conduitFillingRatePercent: sec2.conduitFillingRatePercent,
      conduitQuantity: sec2.conduitQuantity,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_4_TRECHO_2_220V_TRAFO.push(conduit2);

    // Terminais separados por bitola do Trecho 2
    const terminals2 = generateConductorTerminals({
      stageId: 'ETAPA_4_TRECHO_2_220V_TRAFO',
      idPrefix: 'bom-etapa4',
      phases: sec2.phases || 3,
      conductorsPerPhase: sec2.conductorsPerPhase || 1,
      gaugePhaseMM2: sec2.cableGaugePhaseMM2,
      gaugeGroundMM2: sec2.cableGaugeGroundMM2,
      terminalType,
      fromLocationDesc: 'saída do painel 220V',
      toLocationDesc: 'primário do transformador elevador',
      pricingCatalog
    });
    rawItemsByStage.ETAPA_4_TRECHO_2_220V_TRAFO.push(...terminals2);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Subestação / Transformador Elevador 220/380V (Dyn1 Yn)
  // ─────────────────────────────────────────────────────────────────────────────
  const trafo = chainOutput.transformer;
  if (trafo && trafo.needed) {
    const kva = trafo.nominalKVA;
    const estTrafoPrice = Math.max(9500, kva * 145);
    const resolvedTrafo = resolvePrice(
      `TRAFO-${kva}KVA-220-380`,
      `Transformador Elevador a Seco ${kva}kVA Dyn1 220/380V`,
      estTrafoPrice,
      'WEG / Romagnole / Tamura',
      pricingCatalog
    );

    rawItemsByStage.ETAPA_5_SUBESTACAO_TRAFO.push({
      id: 'bom-etapa5-transformador-elevador',
      stageId: 'ETAPA_5_SUBESTACAO_TRAFO',
      codigo: `TRAFO-${kva}KVA-220-380`,
      category: 'transformador',
      description: `Transformador Elevador Trifásico a Seco Encapsulado em Resina Epóxi ${kva} kVA (Primário 220V Δ / Secundário 380V/220V Yn)`,
      quantity: 1,
      unit: 'pç',
      spec: `Classe F/H (155°C/180°C) • Blindagem eletrostática aterrada entre enrolamentos • Grau de proteção IP00/IP23`,
      normReference: 'ABNT NBR 5356 / NBR 10295',
      manufacturer: resolvedTrafo.supplier,
      unitPriceBRL: resolvedTrafo.price,
      totalPriceBRL: resolvedTrafo.price,
      pricingSource: resolvedTrafo.source,
      isMandatoryNorm: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 6: Trecho 3 (Trafo ➔ Painel Geral 380V / QGBT-VE)
  // ─────────────────────────────────────────────────────────────────────────────
  const sec3 = chainOutput.sections.section3_trafoToPanel380;
  if (sec3 && chainOutput.transformer.needed) {
    const cables3 = generatePhaseNeutralGroundCables({
      stageId: 'ETAPA_6_TRECHO_3_TRAFO_380V',
      idPrefix: 'bom-etapa6',
      material: sec3.conductorMaterial,
      phases: sec3.phases || 3,
      conductorsPerPhase: sec3.conductorsPerPhase || 1,
      gaugePhaseMM2: sec3.cableGaugePhaseMM2,
      gaugeNeutralMM2: sec3.cableGaugeNeutralMM2,
      gaugeGroundMM2: sec3.cableGaugeGroundMM2,
      distanceTotalM: sec3.distanceTotalM,
      voltageDropPercent: sec3.voltageDropPercent,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_6_TRECHO_3_TRAFO_380V.push(...cables3);

    const conduit3 = generateConduitItem({
      stageId: 'ETAPA_6_TRECHO_3_TRAFO_380V',
      idPrefix: 'bom-etapa6',
      conduitInches: sec3.conduitInches,
      conduitDiameterMM: sec3.conduitDiameterMM,
      distanceTotalM: sec3.distanceTotalM,
      conduitFillingRatePercent: sec3.conduitFillingRatePercent,
      conduitQuantity: sec3.conduitQuantity,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_6_TRECHO_3_TRAFO_380V.push(conduit3);

    // Terminais separados por bitola do Trecho 3
    const terminals3 = generateConductorTerminals({
      stageId: 'ETAPA_6_TRECHO_3_TRAFO_380V',
      idPrefix: 'bom-etapa6',
      phases: sec3.phases || 3,
      conductorsPerPhase: sec3.conductorsPerPhase || 1,
      gaugePhaseMM2: sec3.cableGaugePhaseMM2,
      gaugeGroundMM2: sec3.cableGaugeGroundMM2,
      terminalType,
      fromLocationDesc: 'secundário do transformador 380V',
      toLocationDesc: 'entrada do QGBT 380V',
      pricingCatalog
    });
    rawItemsByStage.ETAPA_6_TRECHO_3_TRAFO_380V.push(...terminals3);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 7: Painel Geral 380V (QGBT-VE)
  // ─────────────────────────────────────────────────────────────────────────────
  const p380 = chainOutput.panel380V;
  if (p380 && p380.active) {
    const chargersCount = chainOutput.chargers.length || 1;
    const branchBreakerA = p380.individualBreakers?.[0]?.breakerA || 40;

    // 1. Invólucro Metálico Sobrepor do QGBT (Mesmo padrão do painel 220V)
    const resolvedEnclosure380 = resolvePrice(
      'QUADRO-QGBT-380V-IP54',
      'Quadro de Montagem Metálico Sobrepor IP54/IP65',
      MARKET_PRICING_CATALOG.enclosures.metal_cemar.basePrice,
      'Cemar Legrand / WEG',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_7_PAINEL_380V_QGBT.push({
      id: 'bom-etapa7-quadro-qgbt',
      stageId: 'ETAPA_7_PAINEL_380V_QGBT',
      codigo: 'QUADRO-QGBT-380V-IP54',
      category: 'quadro',
      description: 'Quadro Geral de Distribuição Metálico Sobrepor com Placa Laranja IP54/IP65 (QGBT 380V)',
      quantity: 1,
      unit: 'pç',
      spec: 'Quadro de montagem metálico sobrepor com chapa de aço e placa de montagem laranja • Grau de proteção IP54/IP65',
      normReference: 'NBR IEC 61439-1/2',
      manufacturer: resolvedEnclosure380.supplier,
      unitPriceBRL: resolvedEnclosure380.price,
      totalPriceBRL: resolvedEnclosure380.price,
      pricingSource: resolvedEnclosure380.source,
      isMandatoryNorm: true
    });

    // 2. Proteção: Se houver apenas 1 carregador, o disjuntor geral passa a ser o próprio disjuntor do carregador (sem disjuntor geral redundante nem barramento)
    if (chargersCount === 1) {
      rawItemsByStage.ETAPA_7_PAINEL_380V_QGBT.push({
        id: 'bom-etapa7-disjuntor-carregador-geral',
        stageId: 'ETAPA_7_PAINEL_380V_QGBT',
        codigo: `DISJ-DIN-3P-${branchBreakerA}A`,
        category: 'protecao',
        description: `Disjuntor Geral / Proteção do Carregador VE: ${branchBreakerA}A Curva C (Icu ≥ 10kA em 380V)`,
        quantity: 1,
        unit: 'pç',
        spec: `Corrente Nominal: ${branchBreakerA}A • Curva C • Tripolar • Atua unificadamente como proteção geral do quadro e da estação de recarga (sem barramento nem disjuntor redundante conforme NBR 17019)`,
        normReference: 'NBR IEC 60947-2 / NBR NM 60898',
        manufacturer: 'WEG / Soprano',
        unitPriceBRL: 85.0,
        totalPriceBRL: 85.0,
        pricingSource: 'DEFAULT',
        isMandatoryNorm: true
      });
    } else {
      // Para 2 ou mais carregadores: Disjuntor Geral QGBT + Barramento + Disjuntores Individuais
      rawItemsByStage.ETAPA_7_PAINEL_380V_QGBT.push({
        id: 'bom-etapa7-disjuntor-geral-secundario',
        stageId: 'ETAPA_7_PAINEL_380V_QGBT',
        codigo: `DISJ-QGBT-${p380.mainBreakerA}A`,
        category: 'protecao',
        description: `Disjuntor Geral de Proteção do QGBT 380V: ${p380.mainBreakerA}A Curva C (Icu ≥ 10kA em 380V)`,
        quantity: 1,
        unit: 'pç',
        spec: `Corrente Nominal: ${p380.mainBreakerA}A • Curva C • Capacidade de Ruptura Icu: 10kA • Proteção geral dos carregadores`,
        normReference: 'NBR IEC 60947-2 / NBR NM 60898',
        manufacturer: 'WEG / Soprano',
        unitPriceBRL: 290.0,
        totalPriceBRL: 290.0,
        pricingSource: 'DEFAULT',
        isMandatoryNorm: true
      });

      rawItemsByStage.ETAPA_7_PAINEL_380V_QGBT.push({
        id: 'bom-etapa7-barramento-cobre-380v',
        stageId: 'ETAPA_7_PAINEL_380V_QGBT',
        category: 'quadro',
        description: `Conjunto de Barramento Trifásico em Cobre Eletrolítico ${p380.busbarRatingA || p380.mainBreakerA}A com Isoladores Bujão`,
        quantity: 1,
        unit: 'cj',
        spec: 'Distribuição trifásica R, S, T, Neutro e Terra para múltiplos carregadores',
        normReference: 'NBR 5410 / NBR IEC 61439-1',
        manufacturer: 'Cobrecon / Termotécnica',
        unitPriceBRL: 380.0,
        totalPriceBRL: 380.0,
        pricingSource: 'DEFAULT',
        isMandatoryNorm: true
      });

      rawItemsByStage.ETAPA_7_PAINEL_380V_QGBT.push({
        id: 'bom-etapa7-disjuntores-individuais',
        stageId: 'ETAPA_7_PAINEL_380V_QGBT',
        category: 'protecao',
        description: `Disjuntores DIN Curva C ${branchBreakerA}A Dedicados por Estação de Recarga (Circuitos Terminais Individuais NBR 17019)`,
        quantity: chargersCount,
        unit: 'pç',
        spec: `Corrente Nominal: ${branchBreakerA}A • Curva C • Icu: 10kA • 1 disjuntor exclusivo por ponto de recarga (NBR 17019)`,
        normReference: 'NBR 17019 Item 722.533.101',
        manufacturer: 'WEG / Soprano',
        unitPriceBRL: 85.0,
        totalPriceBRL: Number((chargersCount * 85.0).toFixed(2)),
        pricingSource: 'DEFAULT',
        isMandatoryNorm: true
      });
    }

    // 3. Dispositivos DR Tipo B por Carregador (Compulsório NBR 17019)
    const resolvedDr = resolvePrice(
      'DR-TIPO-B-4P-40A',
      'Dispositivo DR Tetrapolar Tipo B 40A/30mA',
      MARKET_PRICING_CATALOG.residual_current.typeB_4P_40A.unitPrice,
      'WEG / Schneider Electric',
      pricingCatalog
    );

    rawItemsByStage.ETAPA_7_PAINEL_380V_QGBT.push({
      id: 'bom-etapa7-dr-tipo-b',
      stageId: 'ETAPA_7_PAINEL_380V_QGBT',
      codigo: 'DR-TIPO-B-4P-40A',
      category: 'protecao',
      description: `Dispositivo Diferencial Residual (DR) Tetrapolar Tipo B 40A / Sensibilidade IΔn = 30mA (Imunidade a fuga CC > 6mA) — 1 por Carregador`,
      quantity: chargersCount,
      unit: 'pç',
      spec: `Sensibilidade de Disparo IΔn: 30mA (Proteção contra Choque Humano) • Tipo B (Proteção contra Fuga CC Lisa > 6mA) • NBR 17019 item 722.531.2`,
      normReference: 'ABNT NBR 17019 / IEC 62423 / IEC 62955',
      manufacturer: resolvedDr.supplier,
      unitPriceBRL: resolvedDr.price,
      totalPriceBRL: Number((chargersCount * resolvedDr.price).toFixed(2)),
      pricingSource: resolvedDr.source,
      isMandatoryNorm: true
    });

    // 4. DPS Classe II 40kA 385V (3 Fases + Neutro)
    const resolvedDps380 = resolvePrice(
      'DPS-CL2-40KA-385V',
      'DPS Classe II 40kA 385V',
      MARKET_PRICING_CATALOG.surge_protection.clamper_40ka_385v.unitPrice,
      'Clamper / WEG',
      pricingCatalog
    );
    rawItemsByStage.ETAPA_7_PAINEL_380V_QGBT.push({
      id: 'bom-etapa7-dps-380v',
      stageId: 'ETAPA_7_PAINEL_380V_QGBT',
      codigo: 'DPS-CL2-40KA-385V',
      category: 'protecao',
      description: 'DPS Secundário Classe II 40kA / 385V Plugável para QGBT 380V (3 Fases + Neutro)',
      quantity: 4,
      unit: 'pç',
      spec: 'Proteção contra surtos secundários e manobras na rede',
      normReference: 'NBR 5410 / IEC 61643-11',
      manufacturer: resolvedDps380.supplier,
      unitPriceBRL: resolvedDps380.price,
      totalPriceBRL: Number((4 * resolvedDps380.price).toFixed(2)),
      pricingSource: resolvedDps380.source,
      isMandatoryNorm: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 8: Trecho 4 (Ramais Terminais dos Carregadores)
  // ─────────────────────────────────────────────────────────────────────────────
  const sec4List = chainOutput.sections.section4_chargersFeeders || [];
  sec4List.forEach((feeder: SectionCableConduitSizing, idx: number) => {
    // Cabos do Ramal VE separados: Fase (Preta), Neutro (Azul Claro) e Terra (Verde)
    const feederCables = generatePhaseNeutralGroundCables({
      stageId: 'ETAPA_8_TRECHO_4_RAMAIS_VE',
      idPrefix: `bom-etapa8-feeder-${idx}`,
      material: feeder.conductorMaterial || 'copper',
      phases: feeder.phases || 3,
      conductorsPerPhase: feeder.conductorsPerPhase || 1,
      gaugePhaseMM2: feeder.cableGaugePhaseMM2,
      gaugeNeutralMM2: feeder.cableGaugeNeutralMM2,
      gaugeGroundMM2: feeder.cableGaugeGroundMM2,
      distanceTotalM: feeder.distanceTotalM,
      voltageDropPercent: feeder.voltageDropPercent,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_8_TRECHO_4_RAMAIS_VE.push(...feederCables);

    // Eletroduto / Duto de encaminhamento separado por diâmetro
    const feederConduit = generateConduitItem({
      stageId: 'ETAPA_8_TRECHO_4_RAMAIS_VE',
      idPrefix: `bom-etapa8-feeder-${idx}`,
      conduitInches: feeder.conduitInches,
      conduitDiameterMM: feeder.conduitDiameterMM,
      distanceTotalM: feeder.distanceTotalM,
      conduitFillingRatePercent: feeder.conduitFillingRatePercent,
      conduitQuantity: feeder.conduitQuantity,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_8_TRECHO_4_RAMAIS_VE.push(feederConduit);

    // Terminais separados por bitola do Ramal VE
    const feederTerminals = generateConductorTerminals({
      stageId: 'ETAPA_8_TRECHO_4_RAMAIS_VE',
      idPrefix: `bom-etapa8-feeder-${idx}`,
      phases: feeder.phases || (feeder.cableGaugePhaseMM2 ? 3 : 1),
      conductorsPerPhase: feeder.conductorsPerPhase || 1,
      gaugePhaseMM2: feeder.cableGaugePhaseMM2,
      gaugeGroundMM2: feeder.cableGaugeGroundMM2,
      terminalType,
      fromLocationDesc: 'disjuntor dedicado no QGBT 380V',
      toLocationDesc: `borne de conexão do Carregador #${idx + 1}`,
      pricingCatalog
    });
    rawItemsByStage.ETAPA_8_TRECHO_4_RAMAIS_VE.push(...feederTerminals);
  });

  // Cabo de Rede para Balanceamento Dinâmico (DLM)
  rawItemsByStage.ETAPA_8_TRECHO_4_RAMAIS_VE.push({
    id: 'bom-etapa8-cabo-dados-dlm',
    stageId: 'ETAPA_8_TRECHO_4_RAMAIS_VE',
    category: 'infraestrutura',
    description: 'Cabo de Rede Par Trançado Blindado Cat6 STP (Comunicação DLM / OCPP / Modbus entre Carregadores)',
    quantity: Math.ceil(sec4List.reduce((acc, f) => acc + f.distanceTotalM, 0) || 30),
    unit: 'm',
    spec: 'Blindagem contra interferência eletromagnética dos inversores e trafo',
    normReference: 'TIA/EIA 568-C',
    manufacturer: 'Furukawa / Prysmian',
    unitPriceBRL: 6.5,
    totalPriceBRL: Number(((Math.ceil(sec4List.reduce((acc, f) => acc + f.distanceTotalM, 0) || 30)) * 6.5).toFixed(2)),
    pricingSource: 'DEFAULT',
    isMandatoryNorm: false
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 9: Ponto de Recarga, Infra Civil & Segurança de Emergência
  // ─────────────────────────────────────────────────────────────────────────────
  const chargersList = chainOutput.chargers || [];
  chargersList.forEach((ch, idx) => {
    const estPrice = ch.powerKW >= 30 ? ch.powerKW * 850 : (ch.powerKW >= 22 ? 6800 : (ch.powerKW >= 11 ? 5200 : 3800));
    const resolvedCharger = resolvePrice(
      `CHARGER-${ch.powerKW}KW`,
      ch.name || `Carregador VE ${ch.powerKW} kW`,
      estPrice,
      'WEG / ABB / Enel X',
      pricingCatalog
    );

    // Estação de Recarga de VE (Etapa 9: Ponto de Recarga)
    rawItemsByStage.ETAPA_9_PONTO_RECARGA.push({
      id: `bom-etapa9-charger-${idx}`,
      stageId: 'ETAPA_9_PONTO_RECARGA',
      codigo: `CHARGER-${ch.powerKW}KW`,
      category: 'equipamentos',
      description: `Estação de Recarga de Veículo Elétrico: ${ch.name || `${ch.powerKW} kW`}`,
      quantity: 1,
      unit: 'pç',
      spec: `Potência: ${ch.powerKW} kW • Tensão: ${ch.voltageV}V • Cabo e Plugue Tipo 2 / CCS2 integrados`,
      normReference: 'ABNT NBR IEC 61851-1 / NBR 17019',
      manufacturer: resolvedCharger.supplier,
      unitPriceBRL: resolvedCharger.price,
      totalPriceBRL: resolvedCharger.price,
      pricingSource: resolvedCharger.source,
      isMandatoryNorm: true
    });

    // Totem estrutural de montagem (Etapa 9: Ponto de Recarga)
    rawItemsByStage.ETAPA_9_PONTO_RECARGA.push({
      id: `bom-etapa9-totem-${idx}`,
      stageId: 'ETAPA_9_PONTO_RECARGA',
      codigo: `TOTEM-ESTRUTURAL-${idx + 1}`,
      category: 'infraestrutura',
      description: `Totem Metálico Estrutural Galvanizado com Pintura Eletrostática a Pó e Suporte de Cabo`,
      quantity: 1,
      unit: 'pç',
      spec: 'Fixação por chumbadores parabolt em base de concreto',
      normReference: 'NBR 17019',
      manufacturer: 'Cordeiro Estruturas / Homologado',
      unitPriceBRL: 1450.0,
      totalPriceBRL: 1450.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: false
    });

    // Bate-rodas mecânico / Bollards tubulares de proteção contra impacto (Etapa 10: Segurança)
    rawItemsByStage.ETAPA_10_SEGURANCA_EMERGENCIA.push({
      id: `bom-etapa10-bollard-${idx}`,
      stageId: 'ETAPA_10_SEGURANCA_EMERGENCIA',
      codigo: 'BOLLARD-ACO-4POL',
      category: 'seguranca',
      description: `Bate-rodas (Bollards) Tubulares em Aço Galvanizado 4" com Pintura Zebrada Refletiva Amarela/Preta`,
      quantity: 2,
      unit: 'pç',
      spec: 'Proteção física compulsória contra impacto mecânico acidental de veículos nos carregadores (NBR 17019 item 722.512.2)',
      normReference: 'NBR 17019 item 722.512.2',
      manufacturer: 'Metalúrgica Cordeiro',
      unitPriceBRL: 280.0,
      totalPriceBRL: 560.0,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });
  });

  // Demarcação visual e pintura de solo (Etapa 9: Ponto de Recarga & Infra Civil)
  rawItemsByStage.ETAPA_9_PONTO_RECARGA.push({
    id: 'bom-etapa9-sinalizacao-viaria',
    stageId: 'ETAPA_9_PONTO_RECARGA',
    codigo: 'PINTURA-SOLO-VAGA-VE',
    category: 'infraestrutura',
    description: 'Demarcação de Vagas VE: Pintura Epóxi de Vaga com Resina Antiderrapante Verde + Pictograma Internacional VE',
    quantity: chargersList.length || 1,
    unit: 'cj',
    spec: 'Demarcação visual e identificação de vaga exclusiva para carregamento de veículos elétricos',
    normReference: 'Resolução CONTRAN / NBR 17019',
    manufacturer: 'Cordeiro Sinalização',
    unitPriceBRL: 380.0,
    totalPriceBRL: Number(((chargersList.length || 1) * 380.0).toFixed(2)),
    pricingSource: 'DEFAULT',
    isMandatoryNorm: true
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ETAPA 10: Itens de Segurança, Proteção contra Incêndio & Desligamento de Emergência
  // ─────────────────────────────────────────────────────────────────────────────
  if (includeEmergencyShutdown) {
    const emergConfig = MARKET_PRICING_CATALOG.emergency_shutdown;
    
    // Botão de Emergência Cogumelo
    rawItemsByStage.ETAPA_10_SEGURANCA_EMERGENCIA.push({
      id: 'bom-etapa10-botao-emergencia',
      stageId: 'ETAPA_10_SEGURANCA_EMERGENCIA',
      codigo: 'BOTAO-EMERG-COGUMELO',
      category: 'seguranca',
      description: emergConfig.mushroom_button.model,
      quantity: 1,
      unit: 'cj',
      spec: 'Caixa amarela IP65 montada a ≤ 5m das vagas de recarga com trava e destravamento por giro (NBR 17019)',
      normReference: 'NBR 17019 / IT-41 CBMMG',
      manufacturer: emergConfig.mushroom_button.manufacturer,
      unitPriceBRL: emergConfig.mushroom_button.unitPrice,
      totalPriceBRL: emergConfig.mushroom_button.unitPrice,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });

    // Bobina de Disparo MX Shunt Trip
    rawItemsByStage.ETAPA_10_SEGURANCA_EMERGENCIA.push({
      id: 'bom-etapa10-bobina-disparo-mx',
      stageId: 'ETAPA_10_SEGURANCA_EMERGENCIA',
      codigo: 'BOBINA-DISPARO-MX-220V',
      category: 'seguranca',
      description: emergConfig.shunt_trip_coil.model,
      quantity: 1,
      unit: 'pç',
      spec: 'Acoplamento mecânico direto ao disjuntor geral de proteção do hub/carregadores',
      normReference: 'NBR 17019 / NBR IEC 60947-2',
      manufacturer: emergConfig.shunt_trip_coil.manufacturer,
      unitPriceBRL: emergConfig.shunt_trip_coil.unitPrice,
      totalPriceBRL: emergConfig.shunt_trip_coil.unitPrice,
      pricingSource: 'DEFAULT',
      isMandatoryNorm: true
    });
  }

  // Prevenção contra Incêndio (Extintores de Incêndio IT-41 / IT-30 CBMMG)
  rawItemsByStage.ETAPA_10_SEGURANCA_EMERGENCIA.push({
    id: 'bom-etapa10-extintores-incendio',
    stageId: 'ETAPA_10_SEGURANCA_EMERGENCIA',
    codigo: 'EXTINTORES-CO2-ABC',
    category: 'seguranca',
    description: 'Conjunto de Extintores de Incêndio: 1x CO2 6kg (Equipamentos Energizados Classe C) + 1x Pó ABC 6kg com Suporte e Demarcação de Solo',
    quantity: 1,
    unit: 'cj',
    spec: 'Exigência técnica do Corpo de Bombeiros Militar para eletropostos',
    normReference: 'IT-41 / IT-30 CBMMG / NBR 12693',
    manufacturer: 'Mocelin / Extang',
    unitPriceBRL: 490.0,
    totalPriceBRL: 490.0,
    pricingSource: 'DEFAULT',
    isMandatoryNorm: true
  });

  // Placas de Sinalização Fotoluminescente de Emergência e Rota de Fuga
  rawItemsByStage.ETAPA_10_SEGURANCA_EMERGENCIA.push({
    id: 'bom-etapa10-placas-fotoluminescentes',
    stageId: 'ETAPA_10_SEGURANCA_EMERGENCIA',
    codigo: 'SINAL-FOTOLUMINESCENTE',
    category: 'seguranca',
    description: 'Kit de Placas Fotoluminescentes: Alerta de Risco Elétrico / Alta Tensão, Indicação de Botão de Emergência e Rota de Fuga',
    quantity: 1,
    unit: 'kit',
    spec: 'Sinalização fotoluminescente conforme normas dos Bombeiros (IT-41 CBMMG / NBR 13434)',
    normReference: 'IT-41 CBMMG / NBR 13434',
    manufacturer: 'Cordeiro Sinalização',
    unitPriceBRL: 180.0,
    totalPriceBRL: 180.0,
    pricingSource: 'DEFAULT',
    isMandatoryNorm: true
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // APLICAÇÃO DE ITENS CUSTOMIZADOS DO USUÁRIO
  // ─────────────────────────────────────────────────────────────────────────────
  customAddedItems.forEach((cItem) => {
    let targetStage: InstallationStageId = (cItem as any).stageId || 'ETAPA_9_PONTO_RECARGA';
    if (targetStage === 'ETAPA_9_PONTO_RECARGA_SEGURANCA') {
      targetStage = 'ETAPA_9_PONTO_RECARGA';
    }
    if (rawItemsByStage[targetStage]) {
      rawItemsByStage[targetStage].push({
        ...cItem,
        stageId: targetStage,
        pricingSource: 'MANUAL',
        totalPriceBRL: Number((cItem.quantity * (cItem.unitPriceBRL || 0)).toFixed(2))
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CONSOLIDAÇÃO DOS 10 ESTÁGIOS E CÁLCULO DE TOTAIS E BDI GLOBAL
  // ─────────────────────────────────────────────────────────────────────────────
  const stageIds: InstallationStageId[] = [
    'ETAPA_1_PADRAO_CEMIG',
    'ETAPA_2_TRECHO_1_PADRAO_220V',
    'ETAPA_3_PAINEL_220V',
    'ETAPA_4_TRECHO_2_220V_TRAFO',
    'ETAPA_5_SUBESTACAO_TRAFO',
    'ETAPA_6_TRECHO_3_TRAFO_380V',
    'ETAPA_7_PAINEL_380V_QGBT',
    'ETAPA_8_TRECHO_4_RAMAIS_VE',
    'ETAPA_9_PONTO_RECARGA',
    'ETAPA_10_SEGURANCA_EMERGENCIA'
  ];

  let totalMaterialsNetBRL = 0;
  let totalLaborNetBRL = 0;
  let totalItemsCount = 0;

  const stages: ModularBOMStage[] = stageIds.map((sId) => {
    const meta = STAGE_METADATA[sId];
    const rawStageItems = rawItemsByStage[sId] || [];

    // Identificador de Caixas de Passagem Subterrâneas Tipo Z (ZA, ZB, ZC, ZD)
    const isZBoxItem = (it: ModularBOMItem) =>
      /^CX-SUBTERRANEA-Z[ABCD]$/i.test(it.codigo || '') ||
      /caixa\s+subterr[aâ]nea.*tipo\s+z[abcd]|caixa\s+de\s+passagem.*tipo\s+z[abcd]/i.test(it.description || '');

    // Quantidade base de caixas Z geradas pelo motor nesta etapa (antes de edições/exclusões/adições manuais)
    const baseZBoxesCount = rawStageItems
      .filter((it) => !it.id.startsWith('custom-') && isZBoxItem(it))
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    const mappedItems = rawStageItems
      .filter((it) => !deletedSet.has(it.id))
      .map((it) => {
        const override = userBOMOverrides[it.id] || (it.codigo ? userBOMOverrides[it.codigo] : undefined);
        const qty = override?.quantity !== undefined ? override.quantity : it.quantity;
        const price = override?.unitPriceBRL !== undefined ? override.unitPriceBRL : (it.unitPriceBRL || 0);
        const pricingSource = override?.unitPriceBRL !== undefined ? 'MANUAL' : it.pricingSource;

        let fornecedor = it.fornecedor;
        let dataUltimaCotacao = it.dataUltimaCotacao;
        let numeroOrcamento = it.numeroOrcamento;
        let isPrecoDesatualizado = it.isPrecoDesatualizado;

        if (pricingCatalog) {
          const entry = (it.codigo && pricingCatalog[it.codigo] && pricingCatalog[it.codigo].unitPrice > 0)
            ? pricingCatalog[it.codigo]
            : (pricingCatalog[it.description.trim().toLowerCase()] && pricingCatalog[it.description.trim().toLowerCase()].unitPrice > 0)
              ? pricingCatalog[it.description.trim().toLowerCase()]
              : null;

          if (entry) {
            fornecedor = entry.supplier || fornecedor || 'Fornecedor Homologado Cordeiro';
            dataUltimaCotacao = entry.dataUltimaCotacao || dataUltimaCotacao || null;
            numeroOrcamento = entry.numeroOrcamento || numeroOrcamento || null;
            isPrecoDesatualizado = !entry.dataUltimaCotacao || entry.source === 'ESTIMATIVA_WEB' || entry.numeroOrcamento === 'PENDENTE_HOMOLOGACAO';
          }
        }

        if (price <= 0 || !dataUltimaCotacao) {
          isPrecoDesatualizado = true;
        }

        return {
          ...it,
          quantity: qty,
          unitPriceBRL: price,
          totalPriceBRL: Number((qty * price).toFixed(2)),
          pricingSource,
          fornecedor: fornecedor || (it.manufacturer || 'Cordeiro / Não informado'),
          dataUltimaCotacao: dataUltimaCotacao || null,
          numeroOrcamento: numeroOrcamento || null,
          isPrecoDesatualizado: Boolean(isPrecoDesatualizado)
        };
      });

    // Quantidade ativa de caixas Z após edições/exclusões/adições do projetista
    const activeZBoxesCount = mappedItems
      .filter((it) => isZBoxItem(it))
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    const deltaZBoxes = activeZBoxesCount - baseZBoxesCount;

    // Acoplamento reativo: ao inserir, remover ou alterar quantidade de caixas Z (ZA, ZB, ZC, ZD),
    // atualizar automaticamente Tampa FºFº (1:1), Brita nº 1 (3 sacos/caixa), Niples PVC e Buchas/Arruelas PVC
    const items = deltaZBoxes === 0
      ? mappedItems
      : mappedItems.map((it) => {
          // Respeitar override manual explícito feito diretamente no próprio item acessório
          if (userBOMOverrides[it.id]?.quantity !== undefined || (it.codigo && userBOMOverrides[it.codigo]?.quantity !== undefined)) {
            return it;
          }
          const cod = it.codigo || '';
          if (/^TAMPA-FOFO-Z[ABCD]$/i.test(cod)) {
            const newQty = Math.max(0, activeZBoxesCount);
            return {
              ...it,
              quantity: newQty,
              totalPriceBRL: Number((newQty * (it.unitPriceBRL || 0)).toFixed(2))
            };
          }
          if (cod === 'BRITA-1-DRAIN') {
            const newQty = Math.max(0, 3 * activeZBoxesCount);
            return {
              ...it,
              quantity: newQty,
              totalPriceBRL: Number((newQty * (it.unitPriceBRL || 0)).toFixed(2))
            };
          }
          if (/^NIPLE-PVC-ROSCAVEL-\d+$/i.test(cod)) {
            const divisor = sId === 'ETAPA_1_PADRAO_CEMIG' ? Math.max(1, baseZBoxesCount + 1) : Math.max(1, baseZBoxesCount);
            const perBox = baseZBoxesCount > 0 ? Math.max(2, Math.round(it.quantity / divisor)) : 2;
            const minQty = sId === 'ETAPA_1_PADRAO_CEMIG' ? perBox : 0;
            const newQty = Math.max(minQty, it.quantity + deltaZBoxes * perBox);
            return {
              ...it,
              quantity: newQty,
              totalPriceBRL: Number((newQty * (it.unitPriceBRL || 0)).toFixed(2))
            };
          }
          if (/^BUCHA-ARRUELA-PVC-\d+$/i.test(cod) && cod !== 'BUCHA-ARRUELA-PVC-34') {
            const divisor = sId === 'ETAPA_1_PADRAO_CEMIG' ? Math.max(1, baseZBoxesCount + 1) : Math.max(1, baseZBoxesCount);
            const perBox = baseZBoxesCount > 0 ? Math.max(2, Math.round(it.quantity / divisor)) : 2;
            const minQty = sId === 'ETAPA_1_PADRAO_CEMIG' ? perBox : 0;
            const newQty = Math.max(minQty, it.quantity + deltaZBoxes * perBox);
            return {
              ...it,
              quantity: newQty,
              totalPriceBRL: Number((newQty * (it.unitPriceBRL || 0)).toFixed(2))
            };
          }
          return it;
        });

    // Helper para identificar itens de base civil (cimento, areia, brita) - Não são serviços
    const isMaterialCivilBase = (it: ModularBOMItem) => {
      if (it.codigo === 'MAT-BASE-CONCRETO' || it.codigo === 'SRV-BASE-CONCRETO') return true;
      const desc = (it.description || '').toLowerCase();
      return desc.includes('base concretada') || desc.includes('material civil');
    };

    // Helper para identificar itens de serviço / mão de obra
    const isService = (it: ModularBOMItem) => {
      if (isMaterialCivilBase(it)) return false;
      if (it.isService) return true;
      if (it.category === 'MAO_DE_OBRA' || it.category === 'SERVICO' || it.category === 'SERVICOS') return true;
      if (it.unit === 'sv' || it.unit === 'serv') return true;
      if (it.codigo && (it.codigo.startsWith('SRV-') || it.codigo.startsWith('SERV-'))) return true;
      const desc = (it.description || '').toLowerCase();
      if (
        desc.includes('mão de obra') ||
        desc.includes('mao de obra') ||
        desc.includes('projeto elétrico de entrada') ||
        desc.includes('acompanhamento técnico') ||
        desc.includes('vistoria')
      ) return true;
      return false;
    };

    const materialItems = items.filter((it) => !isService(it));
    const serviceItems = items.filter((it) => isService(it));

    // Insumos Líquidos (exclusivamente materiais físicos: postes, caixas, disjuntores, cabos, etc.)
    const subtotalMaterialsBRL = Number(
      materialItems.reduce((acc, it) => acc + (it.totalPriceBRL || 0), 0).toFixed(2)
    );

    // Mão de Obra e Serviços:
    // Modo TABELADO (Padrão CEMIG R$ 10.000 + R$ 1.500 + R$ 450 = R$ 11.950) vs Modo PERCENTUAL (% sobre materiais)
    const stageOverride = stageLaborOverrides?.[sId];
    const effectiveStageMode: LaborCalculationMode = stageOverride?.mode || laborMode || 'TABELADO';
    const effectiveStagePercent: number = stageOverride?.percent !== undefined ? stageOverride.percent : laborPercent;

    const tabeladoLaborBRL = Number(
      serviceItems.reduce((acc, it) => acc + (it.totalPriceBRL || 0), 0).toFixed(2)
    );
    const percentLaborBRL = Number(
      (subtotalMaterialsBRL * (effectiveStagePercent / 100)).toFixed(2)
    );

    let subtotalLaborBRL = 0;
    if (effectiveStageMode === 'TABELADO') {
      if (stageOverride?.fixedAmountBRL !== undefined) {
        subtotalLaborBRL = stageOverride.fixedAmountBRL;
      } else if (tabeladoLaborBRL > 0) {
        // Ex: Padrão CEMIG = R$ 10.000 (instalação) + R$ 1.500 (projeto) + R$ 450 (vistoria) = R$ 11.950,00
        subtotalLaborBRL = tabeladoLaborBRL;
      } else {
        // Para etapas sem serviços tabelados explícitos, adota a taxa percentual padrão
        subtotalLaborBRL = percentLaborBRL;
      }
    } else {
      // Modo PERCENTUAL: Alíquota estrita sobre materiais físicos
      subtotalLaborBRL = percentLaborBRL;
    }

    // Itens finais para exibição na tabela da etapa:
    // Se o modo for PERCENTUAL, os itens de serviço devem ficar com valores unitários e totais ZERADOS (R$ 0,00),
    // evitando cobrança visual dupla já que o valor está computado no subtotalLaborBRL.
    // Se o modo for TABELADO, os valores tabelados reais ficam visíveis.
    const finalItems = items.map((it) => {
      if (isService(it) && effectiveStageMode === 'PERCENTUAL') {
        return {
          ...it,
          unitPriceBRL: 0,
          totalPriceBRL: 0,
          pricingSource: 'DEFAULT' as const,
          spec: it.spec
            ? `${it.spec} (Valor zerado na tabela pois a mão de obra está calculada pela taxa de ${effectiveStagePercent}% sobre os materiais)`
            : `(Valor zerado na tabela: incluso na taxa de ${effectiveStagePercent}% sobre materiais)`
        };
      }
      return it;
    });

    const totalStageBRL = Number((subtotalMaterialsBRL + subtotalLaborBRL).toFixed(2));

    totalMaterialsNetBRL += subtotalMaterialsBRL;
    totalLaborNetBRL += subtotalLaborBRL;
    totalItemsCount += items.length;

    return {
      stageId: sId,
      order: meta.order,
      title: meta.title,
      shortTitle: meta.shortTitle,
      description: meta.description,
      items: finalItems,
      subtotalMaterialsBRL,
      subtotalLaborBRL,
      totalStageBRL,
      laborMode: effectiveStageMode,
      tabeladoLaborBRL,
      percentLaborBRL
    };
  });

  totalMaterialsNetBRL = Number(totalMaterialsNetBRL.toFixed(2));
  totalLaborNetBRL = Number(totalLaborNetBRL.toFixed(2));
  const globalBdiAmountBRL = Number((totalMaterialsNetBRL * (globalBdiPercent / 100)).toFixed(2));
  const totalProjectInvestmentBRL = Number(
    (totalMaterialsNetBRL + globalBdiAmountBRL + totalLaborNetBRL).toFixed(2)
  );

  return {
    stages,
    totalMaterialsNetBRL,
    totalLaborNetBRL,
    globalBdiPercent,
    globalBdiAmountBRL,
    totalProjectInvestmentBRL,
    totalItemsCount,
    laborMode: laborMode || 'TABELADO'
  };
}
