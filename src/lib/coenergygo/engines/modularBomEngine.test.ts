import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildModularBOM } from './modularBomEngine';
import { ChainTopologyOutput } from '../types';
import { ItemMaterialSugerido } from '../../cemig/padraoEngine';

function createMockTopology(): ChainTopologyOutput {
  const mock = {
    chargers: [
      {
        id: 'CH-1',
        name: 'Carregador Rápido 60kW DC',
        powerKW: 60,
        voltageV: 380,
        phases: 3,
        cableGaugeMM2: 35,
        conduitDiameterMM: 50,
        distanceMeters: 15,
        status: 'OK',
        currentA: 91.2
      }
    ],
    gridSupplyVoltage: 220,
    utility: 'CEMIG',
    standardAlert: {
      alertType: 'ADEQUATE',
      isOverloaded: false,
      standardMaxKW: 75,
      totalHubPeakKW: 60,
      clientBaseLoadKW: 0,
      spareCapacityKW: 15
    },
    panel220V: {
      active: true,
      inputBreakerA: 200,
      transformerProtectionBreakerA: 200,
      isOverloaded: false,
      recommendedIncomingGaugeMM2: 120,
      recommendedConduitDiameterMM: 75,
      internalCircuits: []
    },
    transformer: {
      needed: true,
      primaryVoltageV: 220,
      secondaryVoltageV: 380,
      nominalKVA: 75,
      primaryCurrentA: 196.8,
      secondaryCurrentA: 113.9,
      connectionGroup: 'Dyn1'
    },
    panel380V: {
      active: true,
      mainBreakerA: 125,
      isOverloaded: false,
      recommendedIncomingGaugeMM2: 35,
      recommendedConduitDiameterMM: 50,
      internalCircuits: []
    },
    sections: {
      section1_standardToPanel220: {
        from: 'PADRAO_CEMIG',
        to: 'PAINEL_220V',
        distanceMeters: 10,
        distanceTotalM: 10,
        phaseConductorGaugeMM2: 120,
        cableGaugePhaseMM2: 120,
        neutralConductorGaugeMM2: 120,
        groundConductorGaugeMM2: 70,
        conduitDiameterMM: 75,
        conduitInches: '3"',
        currentA: 196.8,
        voltageDropPercent: 0.8
      },
      section2_panel220ToTrafo: {
        from: 'PAINEL_220V',
        to: 'TRANSFORMADOR',
        distanceMeters: 5,
        distanceTotalM: 5,
        phaseConductorGaugeMM2: 120,
        cableGaugePhaseMM2: 120,
        neutralConductorGaugeMM2: 120,
        groundConductorGaugeMM2: 70,
        conduitDiameterMM: 75,
        conduitInches: '3"',
        currentA: 196.8,
        voltageDropPercent: 0.4
      },
      section3_trafoToPanel380: {
        from: 'TRANSFORMADOR',
        to: 'PAINEL_380V',
        distanceMeters: 5,
        distanceTotalM: 5,
        phaseConductorGaugeMM2: 35,
        cableGaugePhaseMM2: 35,
        neutralConductorGaugeMM2: 35,
        groundConductorGaugeMM2: 16,
        conduitDiameterMM: 50,
        conduitInches: '2"',
        currentA: 113.9,
        voltageDropPercent: 0.5
      },
      section4_chargersFeeders: [
        {
          from: 'PAINEL_380V',
          to: 'CARREGADOR_CH-1',
          distanceMeters: 15,
          distanceTotalM: 15,
          phaseConductorGaugeMM2: 35,
          cableGaugePhaseMM2: 35,
          neutralConductorGaugeMM2: 35,
          groundConductorGaugeMM2: 16,
          conduitDiameterMM: 50,
          conduitInches: '2"',
          currentA: 91.2,
          voltageDropPercent: 0.9
        }
      ]
    },
    hubDedicatedMeterKWhEstimatedMonthly: 4500,
    totalBOM: []
  };

  return mock as unknown as ChainTopologyOutput;
}

const mockCemigItems: ItemMaterialSugerido[] = [
  {
    codigo: '01.001.001',
    descricao: 'Caixa de Medição Tipo CM-4 CEMIG',
    unidade: 'UN',
    quantidade: 1,
    precoUnitarioEstimado: 1200,
    precoTotal: 1200,
    obrigatorioNorma: true,
    categoria: 'CAIXA'
  },
  {
    codigo: '01.001.002',
    descricao: 'Disjuntor Termomagnético Tripolar 200A 220V',
    unidade: 'UN',
    quantidade: 1,
    precoUnitarioEstimado: 850,
    precoTotal: 850,
    obrigatorioNorma: true,
    categoria: 'DISJUNTOR'
  }
];

describe('Modular BOM Engine — Sizing and Budgeting Tests', () => {
  it('Deve zerar materiais e mão de obra da ETAPA 1 quando includeEntranceStandardInBOM for falso (padrão existente adequado)', () => {
    const topology = createMockTopology();
    const bomOutput = buildModularBOM(topology, mockCemigItems, {
      includeEntranceStandardInBOM: false,
      laborMode: 'TABELADO'
    });

    const etapa1 = bomOutput.stages.find(s => s.stageId === 'ETAPA_1_PADRAO_CEMIG');
    assert.ok(etapa1, 'Etapa 1 deve existir no retorno de estágios');
    assert.strictEqual(etapa1.items.length, 0, 'Etapa 1 não deve conter itens quando desconsiderada');
    assert.strictEqual(etapa1.subtotalMaterialsBRL, 0, 'Subtotal de materiais da Etapa 1 deve ser R$ 0,00');
    assert.strictEqual(etapa1.subtotalLaborBRL, 0, 'Subtotal de mão de obra da Etapa 1 deve ser R$ 0,00');
    assert.strictEqual(etapa1.totalStageBRL, 0, 'Total da Etapa 1 deve ser R$ 0,00');
  });

  it('Deve incluir materiais e mão de obra na ETAPA 1 quando includeEntranceStandardInBOM for verdadeiro (ligação nova ou reforma)', () => {
    const topology = createMockTopology();
    const bomOutput = buildModularBOM(topology, mockCemigItems, {
      includeEntranceStandardInBOM: true,
      laborMode: 'TABELADO'
    });

    const etapa1 = bomOutput.stages.find(s => s.stageId === 'ETAPA_1_PADRAO_CEMIG');
    assert.ok(etapa1, 'Etapa 1 deve existir no retorno de estágios');
    assert.ok(etapa1.items.length > 0, 'Etapa 1 deve conter itens');
    assert.ok(etapa1.subtotalMaterialsBRL > 0, 'Subtotal de materiais da Etapa 1 deve ser maior que zero');
    assert.ok(etapa1.totalStageBRL > 0, 'Total da Etapa 1 deve ser maior que zero');
  });

  it('Deve calcular corretamente o BDI Global sobre materiais e mão de obra', () => {
    const topology = createMockTopology();
    const bdiPercent = 20;
    const bomOutput = buildModularBOM(topology, mockCemigItems, {
      includeEntranceStandardInBOM: true,
      globalBdiPercent: bdiPercent
    });

    const expectedBdiValue = Number((bomOutput.totalMaterialsNetBRL * (bdiPercent / 100)).toFixed(2));
    assert.strictEqual(bomOutput.globalBdiAmountBRL, expectedBdiValue, 'BDI total deve bater com a margem aplicada');
    assert.ok(bomOutput.totalProjectInvestmentBRL > bomOutput.totalMaterialsNetBRL + bomOutput.totalLaborNetBRL, 'CAPEX final deve conter BDI');
  });

  it('Deve conter itens de CFTV do orçamento CEITEL Sete Lagoas na ETAPA 10 com título atualizado', () => {
    const topology = createMockTopology();
    const bomOutput = buildModularBOM(topology, mockCemigItems);

    const etapa10 = bomOutput.stages.find(s => s.stageId === 'ETAPA_10_SEGURANCA_EMERGENCIA');
    assert.ok(etapa10, 'Etapa 10 de segurança deve existir');
    assert.ok(etapa10.title.includes('CFTV'), 'Título da etapa 10 deve conter CFTV');
    assert.ok(etapa10.shortTitle.includes('CFTV'), 'Título curto da etapa 10 deve conter CFTV');

    // Verificar itens de CFTV da cotação CEITEL Sete Lagoas (Orçamento 5501561)
    const hasDvr = etapa10.items.some(it => it.description.toLowerCase().includes('mhdx 1304') || it.codigo === '15552');
    const hasCamera = etapa10.items.some(it => it.description.toLowerCase().includes('vhd 1220') || it.codigo === '4560182');
    const hasCabo = etapa10.items.some(it => it.description.toLowerCase().includes('utp') || it.codigo === '14161');
    const hasBalun = etapa10.items.some(it => it.description.toLowerCase().includes('balun') || it.codigo === '12428');

    assert.ok(hasDvr, 'Deve incluir DVR Intelbras MHDX 1304');
    assert.ok(hasCamera, 'Deve incluir Câmera Intelbras VHD 1220');
    assert.ok(hasCabo, 'Deve incluir Cabo UTP Cat5e Megatron');
    assert.ok(hasBalun, 'Deve incluir Balun Passivo Intelbras');
  });

  it('Deve permitir ajuste individual de mão de obra (porcentagem ou valor fixo) e BDI por etapa', () => {
    const topology = createMockTopology();
    const bomOutput = buildModularBOM(topology, mockCemigItems, {
      includeEntranceStandardInBOM: true,
      stageBudgetOverrides: {
        ETAPA_2_TRECHO_1_PADRAO_220V: {
          laborType: 'VALOR',
          laborAmountBRL: 1500,
          bdiType: 'PERCENTUAL',
          bdiPercent: 18
        },
        ETAPA_3_PAINEL_220V: {
          laborType: 'PERCENTUAL',
          laborPercent: 35,
          bdiType: 'VALOR',
          bdiAmountBRL: 750
        }
      }
    });

    const etapa2 = bomOutput.stages.find(s => s.stageId === 'ETAPA_2_TRECHO_1_PADRAO_220V');
    assert.ok(etapa2);
    assert.strictEqual(etapa2.laborType, 'VALOR');
    assert.strictEqual(etapa2.subtotalLaborBRL, 1500);
    assert.strictEqual(etapa2.bdiType, 'PERCENTUAL');
    assert.strictEqual(etapa2.stageBdiPercent, 18);
    const expectedBdi2 = Number((etapa2.subtotalMaterialsBRL * 0.18).toFixed(2));
    assert.strictEqual(etapa2.subtotalBdiBRL, expectedBdi2);

    const etapa3 = bomOutput.stages.find(s => s.stageId === 'ETAPA_3_PAINEL_220V');
    assert.ok(etapa3);
    assert.strictEqual(etapa3.laborType, 'PERCENTUAL');
    assert.strictEqual(etapa3.stageLaborPercent, 35);
    const expectedLabor3 = Number((etapa3.subtotalMaterialsBRL * 0.35).toFixed(2));
    assert.strictEqual(etapa3.subtotalLaborBRL, expectedLabor3);
    assert.strictEqual(etapa3.bdiType, 'VALOR');
    assert.strictEqual(etapa3.subtotalBdiBRL, 750);
  });

  it('Deve alternar entre percentual geral ou individual para as etapas conforme budgetScope', () => {
    const topology = createMockTopology();
    const overrides = {
      ETAPA_2_TRECHO_1_PADRAO_220V: {
        laborType: 'PERCENTUAL' as const,
        laborPercent: 40,
        bdiType: 'PERCENTUAL' as const,
        bdiPercent: 30
      }
    };

    // Modo GERAL: segue alíquotas globais (25% e 20%)
    const bomGeral = buildModularBOM(topology, mockCemigItems, {
      budgetScope: 'GERAL',
      laborPercent: 25,
      globalBdiPercent: 20,
      stageBudgetOverrides: overrides
    });
    const etapa2Geral = bomGeral.stages.find(s => s.stageId === 'ETAPA_2_TRECHO_1_PADRAO_220V');
    assert.strictEqual(etapa2Geral?.stageLaborPercent, 25, 'No modo GERAL, deve usar o percentual global');
    assert.strictEqual(etapa2Geral?.stageBdiPercent, 20, 'No modo GERAL, deve usar o BDI global');

    // Modo INDIVIDUAL: segue override da etapa (40% e 30%)
    const bomIndividual = buildModularBOM(topology, mockCemigItems, {
      budgetScope: 'INDIVIDUAL',
      laborPercent: 25,
      globalBdiPercent: 20,
      stageBudgetOverrides: overrides
    });
    const etapa2Individual = bomIndividual.stages.find(s => s.stageId === 'ETAPA_2_TRECHO_1_PADRAO_220V');
    assert.strictEqual(etapa2Individual?.stageLaborPercent, 40, 'No modo INDIVIDUAL, deve usar o percentual customizado da etapa');
    assert.strictEqual(etapa2Individual?.stageBdiPercent, 30, 'No modo INDIVIDUAL, deve usar o BDI customizado da etapa');
  });
});
