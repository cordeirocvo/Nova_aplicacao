import { create } from 'zustand';
import {
  TopologyChargerNode,
  UtilityId,
  ChainTopologyOutput
} from '../types';
import { calculateChainTopology } from '../engines/chainTopologyEngine';

const STANDARD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 160, 175, 200, 225, 250, 300, 350, 400, 500, 630];

interface EVTopologyStoreState {
  // Estado dos Carregadores na Ponta
  chargers: TopologyChargerNode[];
  
  // Parâmetros da Rede e Concessionária
  gridSupplyVoltage: 220 | 380;
  utility: UtilityId;
  clientBaseLoadKW: number;
  currentStandardCategory: string;
  currentStandardBreakerA?: number;

  // Distâncias e Margens dos Trechos Gerais
  section1DistanceM: number;       // Padrão -> Painel 220V
  section1MarginPercent: number;
  section1ConductorMaterial?: 'copper' | 'aluminum';
  section2DistanceM: number;       // Painel 220V -> Trafo
  section2MarginPercent: number;
  section2ConductorMaterial?: 'copper' | 'aluminum';
  section3DistanceM: number;       // Trafo -> Painel 380V
  section3MarginPercent: number;
  section3ConductorMaterial?: 'copper' | 'aluminum';

  // Cargas Auxiliares
  auxiliaryConfig: {
    cctvEnabled: boolean;
    cctvPowerW: number;
    outletEnabled: boolean;
    outletPowerW: number;
    lightingEnabled: boolean;
    lightingPowerW: number;
  };

  // Customização do Transformador
  customTransformerKVA?: number;

  // Circuitos Customizados dos Painéis
  customCircuits220V: Array<{
    id: string;
    name: string;
    powerW: number;
    voltageV: 127 | 220;
    breakerA: number;
    cableMM2: number;
  }>;
  customCircuits380V: Array<{
    id: string;
    name: string;
    powerW: number;
    voltageV: 220 | 380;
    breakerA: number;
    cableMM2: number;
  }>;

  // Gaveta/Modal de Inspeção do Componente Selecionado
  selectedDrawerNodeId: string | null;

  // Inteligência de Gestão de Carga DLM
  hasSmartChargingDLM?: boolean;
  maxChargerCapKW?: number;

  // Saída Calculada em Tempo Real
  topologyOutput: ChainTopologyOutput;

  // Ações Atômicas
  syncFromProjectData: (data: {
    clientBaseLoadKW: number;
    currentStandardCategory: string;
    currentStandardBreakerA?: number;
    gridSupplyVoltage?: 220 | 380;
    chargers?: TopologyChargerNode[];
    hasSmartChargingDLM?: boolean;
    maxChargerCapKW?: number;
  }) => void;
  setDLMSettings: (hasDLM: boolean, maxCapKW?: number) => void;
  setCustomTransformerKVA: (kva: number | undefined) => void;
  addCustomCircuit: (panel: '220v' | '380v', circuit: { name: string; powerW: number; voltageV: 127 | 220 | 380 }) => void;
  removeCustomCircuit: (panel: '220v' | '380v', id: string) => void;
  addCharger: (charger: Omit<TopologyChargerNode, 'id'>) => void;
  removeCharger: (id: string) => void;
  updateCharger: (id: string, updates: Partial<TopologyChargerNode>) => void;
  setGridSupplyVoltage: (voltage: 220 | 380) => void;
  setClientBaseLoadKW: (kw: number) => void;
  setCurrentStandardCategory: (cat: string, breakerA?: number) => void;
  updateSectionDistanceAndMargin: (
    section: 'trecho_1' | 'trecho_2' | 'trecho_3',
    distanceM: number,
    marginPercent: number
  ) => void;
  updateSectionMaterial: (
    section: 'trecho_1' | 'trecho_2' | 'trecho_3',
    material: 'copper' | 'aluminum'
  ) => void;
  updateAuxiliaryConfig: (updates: Partial<EVTopologyStoreState['auxiliaryConfig']>) => void;
  setSelectedDrawerNodeId: (nodeId: string | null) => void;
}

const INITIAL_CHARGERS: TopologyChargerNode[] = [
  {
    id: 'ch-1',
    name: 'WEMOB Station 22kW #1',
    brand: 'WEG',
    model: 'WEMOB-STATION-22',
    powerKW: 22,
    phases: 3,
    voltageV: 380,
    currentInA: 32,
    connector: 'Tipo 2',
    type: 'AC',
    distanceMeters: 15,
    marginPercent: 10,
    photoUrl: '/images/chargers/weg-station.png'
  }
];

export const useEVTopologyStore = create<EVTopologyStoreState>((set, get) => {
  const computeOutput = (state: Partial<EVTopologyStoreState>): ChainTopologyOutput => {
    const currentState = { ...get(), ...state };
    return calculateChainTopology({
      chargers: currentState.chargers || INITIAL_CHARGERS,
      gridSupplyVoltage: currentState.gridSupplyVoltage || 220,
      utility: currentState.utility || 'CEMIG',
      clientBaseLoadKW: currentState.clientBaseLoadKW || 5.0,
      currentStandardCategory: currentState.currentStandardCategory || 'B1',
      currentStandardBreakerA: currentState.currentStandardBreakerA,
      section1DistanceM: currentState.section1DistanceM ?? 20,
      section1MarginPercent: currentState.section1MarginPercent ?? 10,
      section1ConductorMaterial: currentState.section1ConductorMaterial ?? 'copper',
      section2DistanceM: currentState.section2DistanceM ?? 5,
      section2MarginPercent: currentState.section2MarginPercent ?? 10,
      section2ConductorMaterial: currentState.section2ConductorMaterial ?? 'copper',
      section3DistanceM: currentState.section3DistanceM ?? 5,
      section3MarginPercent: currentState.section3MarginPercent ?? 10,
      section3ConductorMaterial: currentState.section3ConductorMaterial ?? 'copper',
      auxiliaryConfig: currentState.auxiliaryConfig || {
        cctvEnabled: true,
        cctvPowerW: 300,
        outletEnabled: true,
        outletPowerW: 1000,
        lightingEnabled: true,
        lightingPowerW: 400
      },
      customCircuits220V: currentState.customCircuits220V || [],
      customCircuits380V: currentState.customCircuits380V || [],
      customTransformerKVA: currentState.customTransformerKVA,
      hasSmartChargingDLM: currentState.hasSmartChargingDLM,
      maxChargerCapKW: currentState.maxChargerCapKW
    });
  };

  const initialOutput = calculateChainTopology({
    chargers: INITIAL_CHARGERS,
    gridSupplyVoltage: 220,
    utility: 'CEMIG',
    clientBaseLoadKW: 5.0,
    currentStandardCategory: 'B1',
    currentStandardBreakerA: 63,
    section1DistanceM: 20,
    section1MarginPercent: 10,
    section1ConductorMaterial: 'copper',
    section2DistanceM: 5,
    section2MarginPercent: 10,
    section2ConductorMaterial: 'copper',
    section3DistanceM: 5,
    section3MarginPercent: 10,
    section3ConductorMaterial: 'copper',
    auxiliaryConfig: {
      cctvEnabled: true,
      cctvPowerW: 300,
      outletEnabled: true,
      outletPowerW: 1000,
      lightingEnabled: true,
      lightingPowerW: 400
    },
    customCircuits220V: [],
    customCircuits380V: []
  });

  return {
    chargers: INITIAL_CHARGERS,
    gridSupplyVoltage: 220,
    utility: 'CEMIG',
    clientBaseLoadKW: 5.0,
    currentStandardCategory: 'B1',
    currentStandardBreakerA: 63,

    section1DistanceM: 20,
    section1MarginPercent: 10,
    section1ConductorMaterial: 'copper',
    section2DistanceM: 5,
    section2MarginPercent: 10,
    section2ConductorMaterial: 'copper',
    section3DistanceM: 5,
    section3MarginPercent: 10,
    section3ConductorMaterial: 'copper',

    customCircuits220V: [],
    customCircuits380V: [],
    customTransformerKVA: undefined,

    auxiliaryConfig: {
      cctvEnabled: true,
      cctvPowerW: 300,
      outletEnabled: true,
      outletPowerW: 1000,
      lightingEnabled: true,
      lightingPowerW: 400
    },

    selectedDrawerNodeId: null,
    topologyOutput: initialOutput,

    syncFromProjectData: (data) => {
      set((state) => {
        const nextState: Partial<EVTopologyStoreState> = {
          clientBaseLoadKW: data.clientBaseLoadKW ?? state.clientBaseLoadKW,
          currentStandardCategory: data.currentStandardCategory ?? state.currentStandardCategory,
          currentStandardBreakerA: data.currentStandardBreakerA ?? state.currentStandardBreakerA,
          gridSupplyVoltage: data.gridSupplyVoltage ?? state.gridSupplyVoltage,
          chargers: data.chargers && data.chargers.length > 0 ? data.chargers : state.chargers,
          hasSmartChargingDLM: data.hasSmartChargingDLM !== undefined ? data.hasSmartChargingDLM : state.hasSmartChargingDLM,
          maxChargerCapKW: data.maxChargerCapKW !== undefined ? data.maxChargerCapKW : state.maxChargerCapKW
        };
        return {
          ...nextState,
          topologyOutput: computeOutput(nextState)
        };
      });
    },

    setDLMSettings: (hasDLM, maxCapKW) => {
      set((state) => {
        const nextState: Partial<EVTopologyStoreState> = {
          hasSmartChargingDLM: hasDLM,
          maxChargerCapKW: maxCapKW
        };
        return {
          ...nextState,
          topologyOutput: computeOutput(nextState)
        };
      });
    },

    setCustomTransformerKVA: (kva) => {
      set((state) => {
        const nextState: Partial<EVTopologyStoreState> = {
          customTransformerKVA: kva
        };
        return {
          ...nextState,
          topologyOutput: computeOutput(nextState)
        };
      });
    },

    addCustomCircuit: (panel, circuit) => {
      set((state) => {
        const calcBreaker = STANDARD_BREAKERS.find(b => b >= (circuit.powerW / (circuit.voltageV === 380 ? (Math.sqrt(3) * 380 * 0.92) : circuit.voltageV)) * 1.25) || 16;
        const calcCable = calcBreaker <= 16 ? 2.5 : calcBreaker <= 25 ? 4.0 : 6.0;
        const newCircuit = {
          id: `circ-${Date.now()}`,
          name: circuit.name,
          powerW: circuit.powerW,
          voltageV: circuit.voltageV as any,
          breakerA: calcBreaker,
          cableMM2: calcCable
        };

        const nextState: Partial<EVTopologyStoreState> = panel === '220v'
          ? { customCircuits220V: [...state.customCircuits220V, newCircuit] }
          : { customCircuits380V: [...state.customCircuits380V, newCircuit] };

        return {
          ...nextState,
          topologyOutput: computeOutput(nextState)
        };
      });
    },

    removeCustomCircuit: (panel, id) => {
      set((state) => {
        const nextState: Partial<EVTopologyStoreState> = panel === '220v'
          ? { customCircuits220V: state.customCircuits220V.filter(c => c.id !== id) }
          : { customCircuits380V: state.customCircuits380V.filter(c => c.id !== id) };

        return {
          ...nextState,
          topologyOutput: computeOutput(nextState)
        };
      });
    },

    addCharger: (charger) => {
      const newId = `ch-${Date.now()}`;
      const newCharger: TopologyChargerNode = { ...charger, id: newId };
      set((state) => {
        const updatedChargers = [...state.chargers, newCharger];
        return {
          chargers: updatedChargers,
          topologyOutput: computeOutput({ chargers: updatedChargers })
        };
      });
    },

    removeCharger: (id) => {
      set((state) => {
        const updatedChargers = state.chargers.filter((c) => c.id !== id);
        return {
          chargers: updatedChargers,
          topologyOutput: computeOutput({ chargers: updatedChargers })
        };
      });
    },

    updateCharger: (id, updates) => {
      set((state) => {
        const updatedChargers = state.chargers.map((c) => (c.id === id ? { ...c, ...updates } : c));
        return {
          chargers: updatedChargers,
          topologyOutput: computeOutput({ chargers: updatedChargers })
        };
      });
    },

    setGridSupplyVoltage: (voltage) => {
      set((state) => ({
        gridSupplyVoltage: voltage,
        topologyOutput: computeOutput({ gridSupplyVoltage: voltage })
      }));
    },

    setClientBaseLoadKW: (kw) => {
      set((state) => ({
        clientBaseLoadKW: kw,
        topologyOutput: computeOutput({ clientBaseLoadKW: kw })
      }));
    },

    setCurrentStandardCategory: (cat, breakerA) => {
      set((state) => ({
        currentStandardCategory: cat,
        currentStandardBreakerA: breakerA,
        topologyOutput: computeOutput({ currentStandardCategory: cat, currentStandardBreakerA: breakerA })
      }));
    },

    updateSectionDistanceAndMargin: (section, distanceM, marginPercent) => {
      set((state) => {
        const updates: Partial<EVTopologyStoreState> = {};
        if (section === 'trecho_1') {
          updates.section1DistanceM = distanceM;
          updates.section1MarginPercent = marginPercent;
        } else if (section === 'trecho_2') {
          updates.section2DistanceM = distanceM;
          updates.section2MarginPercent = marginPercent;
        } else if (section === 'trecho_3') {
          updates.section3DistanceM = distanceM;
          updates.section3MarginPercent = marginPercent;
        }
        return {
          ...updates,
          topologyOutput: computeOutput(updates)
        };
      });
    },

    updateSectionMaterial: (section, material) => {
      set((state) => {
        const updates: Partial<EVTopologyStoreState> = {};
        if (section === 'trecho_1') {
          updates.section1ConductorMaterial = material;
        } else if (section === 'trecho_2') {
          updates.section2ConductorMaterial = material;
        } else if (section === 'trecho_3') {
          updates.section3ConductorMaterial = material;
        }
        return {
          ...updates,
          topologyOutput: computeOutput(updates)
        };
      });
    },

    updateAuxiliaryConfig: (updates) => {
      set((state) => {
        const updatedConfig = { ...state.auxiliaryConfig, ...updates };
        return {
          auxiliaryConfig: updatedConfig,
          topologyOutput: computeOutput({ auxiliaryConfig: updatedConfig })
        };
      });
    },

    setSelectedDrawerNodeId: (nodeId) => {
      set({ selectedDrawerNodeId: nodeId });
    }
  };
});
