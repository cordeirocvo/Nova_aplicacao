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
});
