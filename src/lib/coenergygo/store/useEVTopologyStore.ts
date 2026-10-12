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
  section1InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
  section2DistanceM: number;       // Painel 220V -> Trafo
  section2MarginPercent: number;
  section2ConductorMaterial?: 'copper' | 'aluminum';
  section2InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
  section3DistanceM: number;       // Trafo -> Painel 380V
  section3MarginPercent: number;
  section3ConductorMaterial?: 'copper' | 'aluminum';
  section3InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';

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
  customTransformerEfficiencyPercent?: number;
  customTransformerLossesKW?: number;

  // Circuitos Customizados dos Painéis
  customCircuits220V: Array<{
    id: string;
    name: string;
    powerW: number;
    voltageV: 127 | 220;
    breakerA: number;
    cableMM2: number;
    circuitCategory?: 'lighting' | 'outlet_tug' | 'outlet_tue' | 'electronics_cctv' | 'transformer_feeder' | 'ev_charger' | 'custom';
    curve?: 'B' | 'C' | 'D';
    drRequired?: boolean;
    drType?: string;
    dpsClass?: 'Classe II' | 'Classe III' | 'Dispensado';
    notes?: string;
  }>;
  customCircuits380V: Array<{
    id: string;
    name: string;
    powerW: number;
    voltageV: 220 | 380;
    breakerA: number;
    cableMM2: number;
    circuitCategory?: 'lighting' | 'outlet_tug' | 'outlet_tue' | 'electronics_cctv' | 'transformer_feeder' | 'ev_charger' | 'custom';
    curve?: 'B' | 'C' | 'D';
    drRequired?: boolean;
    drType?: string;
    dpsClass?: 'Classe II' | 'Classe III' | 'Dispensado';
    notes?: string;
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
    customCircuits220V?: Array<any>;
    customCircuits380V?: Array<any>;
    section1DistanceM?: number;
    section1MarginPercent?: number;
    section1ConductorMaterial?: 'copper' | 'aluminum';
    section1InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
    section2DistanceM?: number;
    section2MarginPercent?: number;
    section2ConductorMaterial?: 'copper' | 'aluminum';
    section2InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
    section3DistanceM?: number;
    section3MarginPercent?: number;
    section3ConductorMaterial?: 'copper' | 'aluminum';
    section3InstallationMethod?: 'B1' | 'B2' | 'C' | 'D';
    customTransformerKVA?: number;
    customTransformerEfficiencyPercent?: number;
    customTransformerLossesKW?: number;
  }) => void;
  setDLMSettings: (hasDLM: boolean, maxCapKW?: number) => void;
  setCustomTransformerKVA: (kva: number | undefined) => void;
  setTransformerEfficiencyAndLosses: (efficiencyPercent?: number, lossesKW?: number) => void;
  addCustomCircuit: (panel: '220v' | '380v', circuit: { 
    name: string; 
    powerW: number; 
    voltageV: 127 | 220 | 380;
    circuitCategory?: 'lighting' | 'outlet_tug' | 'outlet_tue' | 'electronics_cctv' | 'transformer_feeder' | 'ev_charger' | 'custom';
  }) => void;
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
  updateSectionInstallationMethod: (
    section: 'trecho_1' | 'trecho_2' | 'trecho_3',
    method: 'B1' | 'B2' | 'C' | 'D'
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
  // Ler circuitos customizados salvos no localStorage para persistência imediata
  let initialSaved220V: any[] = [];
  let initialSaved380V: any[] = [];
  if (typeof window !== 'undefined') {
    try {
      const s220 = localStorage.getItem('coenergygo_custom_circuits_220v');
      if (s220) initialSaved220V = JSON.parse(s220);
      const s380 = localStorage.getItem('coenergygo_custom_circuits_380v');
      if (s380) initialSaved380V = JSON.parse(s380);
    } catch (e) {
      console.warn('Erro ao carregar circuitos auxiliares do localStorage:', e);
    }
  }

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
      section1InstallationMethod: currentState.section1InstallationMethod ?? 'B1',
      section2DistanceM: currentState.section2DistanceM ?? 5,
      section2MarginPercent: currentState.section2MarginPercent ?? 10,
      section2ConductorMaterial: currentState.section2ConductorMaterial ?? 'copper',
      section2InstallationMethod: currentState.section2InstallationMethod ?? 'B1',
      section3DistanceM: currentState.section3DistanceM ?? 5,
      section3MarginPercent: currentState.section3MarginPercent ?? 10,
      section3ConductorMaterial: currentState.section3ConductorMaterial ?? 'copper',
      section3InstallationMethod: currentState.section3InstallationMethod ?? 'B1',
      auxiliaryConfig: currentState.auxiliaryConfig || {
        cctvEnabled: true,
        cctvPowerW: 300,
        outletEnabled: true,
        outletPowerW: 1000,
        lightingEnabled: true,
        lightingPowerW: 400
      },
      customCircuits220V: currentState.customCircuits220V || initialSaved220V,
      customCircuits380V: currentState.customCircuits380V || initialSaved380V,
      customTransformerKVA: currentState.customTransformerKVA,
      customTransformerEfficiencyPercent: currentState.customTransformerEfficiencyPercent,
      customTransformerLossesKW: currentState.customTransformerLossesKW,
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
    section1InstallationMethod: 'B1',
    section2DistanceM: 5,
    section2MarginPercent: 10,
    section2ConductorMaterial: 'copper',
    section2InstallationMethod: 'B1',
    section3DistanceM: 5,
    section3MarginPercent: 10,
    section3ConductorMaterial: 'copper',
    section3InstallationMethod: 'B1',
    auxiliaryConfig: {
      cctvEnabled: true,
      cctvPowerW: 300,
      outletEnabled: true,
      outletPowerW: 1000,
      lightingEnabled: true,
      lightingPowerW: 400
    },
    customCircuits220V: initialSaved220V,
    customCircuits380V: initialSaved380V
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
    section1InstallationMethod: 'B1',
    section2DistanceM: 5,
    section2MarginPercent: 10,
    section2ConductorMaterial: 'copper',
    section2InstallationMethod: 'B1',
    section3DistanceM: 5,
    section3MarginPercent: 10,
    section3ConductorMaterial: 'copper',
    section3InstallationMethod: 'B1',

    customCircuits220V: initialSaved220V,
    customCircuits380V: initialSaved380V,
    customTransformerKVA: undefined,
    customTransformerEfficiencyPercent: undefined,
    customTransformerLossesKW: undefined,

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
          maxChargerCapKW: data.maxChargerCapKW !== undefined ? data.maxChargerCapKW : state.maxChargerCapKW,
          customCircuits220V: data.customCircuits220V && data.customCircuits220V.length > 0 ? data.customCircuits220V : state.customCircuits220V,
          customCircuits380V: data.customCircuits380V && data.customCircuits380V.length > 0 ? data.customCircuits380V : state.customCircuits380V,
          section1DistanceM: data.section1DistanceM ?? state.section1DistanceM,
          section1MarginPercent: data.section1MarginPercent ?? state.section1MarginPercent,
          section1ConductorMaterial: data.section1ConductorMaterial ?? state.section1ConductorMaterial,
          section1InstallationMethod: data.section1InstallationMethod ?? state.section1InstallationMethod,
          section2DistanceM: data.section2DistanceM ?? state.section2DistanceM,
          section2MarginPercent: data.section2MarginPercent ?? state.section2MarginPercent,
          section2ConductorMaterial: data.section2ConductorMaterial ?? state.section2ConductorMaterial,
          section2InstallationMethod: data.section2InstallationMethod ?? state.section2InstallationMethod,
          section3DistanceM: data.section3DistanceM ?? state.section3DistanceM,
          section3MarginPercent: data.section3MarginPercent ?? state.section3MarginPercent,
          section3ConductorMaterial: data.section3ConductorMaterial ?? state.section3ConductorMaterial,
          section3InstallationMethod: data.section3InstallationMethod ?? state.section3InstallationMethod,
          customTransformerKVA: data.customTransformerKVA !== undefined ? data.customTransformerKVA : state.customTransformerKVA,
          customTransformerEfficiencyPercent: data.customTransformerEfficiencyPercent !== undefined ? data.customTransformerEfficiencyPercent : state.customTransformerEfficiencyPercent,
          customTransformerLossesKW: data.customTransformerLossesKW !== undefined ? data.customTransformerLossesKW : state.customTransformerLossesKW
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

    setTransformerEfficiencyAndLosses: (efficiencyPercent, lossesKW) => {
      set((state) => {
        const nextState: Partial<EVTopologyStoreState> = {
          customTransformerEfficiencyPercent: efficiencyPercent,
          customTransformerLossesKW: lossesKW
        };
        return {
          ...nextState,
          topologyOutput: computeOutput(nextState)
        };
      });
    },

    addCustomCircuit: (panel, circuit) => {
      set((state) => {
        const cat = circuit.circuitCategory || 'custom';
        let minGauge = 2.5;
        let defaultCurve: 'B' | 'C' | 'D' = 'C';
        let drReq = true;
        let drType = 'Bipolar 25A / 30mA Tipo AC';
        let dpsCl: 'Classe II' | 'Classe III' | 'Dispensado' = 'Dispensado';

        if (cat === 'lighting') {
          minGauge = 1.5;
          defaultCurve = 'B';
          drReq = false;
        } else if (cat === 'outlet_tug' || cat === 'outlet_tue') {
          minGauge = 2.5;
          defaultCurve = 'C';
          drReq = true; // NBR 5410 item 5.1.3.2.2 mandatório <= 30mA
          drType = circuit.voltageV === 380 ? 'Tetrapolar 40A / 30mA' : 'Bipolar 25A / 30mA Tipo A/AC';
        } else if (cat === 'electronics_cctv') {
          minGauge = 2.5;
          defaultCurve = 'C';
          drReq = true;
          dpsCl = 'Classe III'; // Proteção fina para equipamentos sensíveis
        } else if (cat === 'transformer_feeder') {
          minGauge = 10.0;
          defaultCurve = 'D'; // Suporte inrush
          drReq = false;
        } else if (cat === 'ev_charger') {
          minGauge = 6.0;
          defaultCurve = 'C';
          drReq = true;
          drType = 'DR Tipo B 30mA (NBR 17019)';
          dpsCl = 'Classe II';
        }

        const calcCurrent = circuit.voltageV === 380 
          ? (circuit.powerW / (Math.sqrt(3) * 380 * 0.92))
          : (circuit.powerW / circuit.voltageV);
        const calcBreaker = STANDARD_BREAKERS.find(b => b >= calcCurrent * 1.25) || (cat === 'lighting' ? 10 : 16);
        const calcCable = Math.max(minGauge, calcBreaker <= 10 ? 1.5 : calcBreaker <= 16 ? 2.5 : calcBreaker <= 25 ? 4.0 : 6.0);

        const newCircuit = {
          id: `circ-${Date.now()}`,
          name: circuit.name,
          powerW: circuit.powerW,
          voltageV: circuit.voltageV as any,
          breakerA: calcBreaker,
          cableMM2: calcCable,
          circuitCategory: cat,
          curve: defaultCurve,
          drRequired: drReq,
          drType: drType,
          dpsClass: dpsCl,
          notes: `Dimensionado conforme NBR 5410 (Categoria ${cat.toUpperCase()})`
        };

        const nextCircuits220V = panel === '220v' ? [...state.customCircuits220V, newCircuit] : state.customCircuits220V;
        const nextCircuits380V = panel === '380v' ? [...state.customCircuits380V, newCircuit] : state.customCircuits380V;

        if (typeof window !== 'undefined') {
          try {
            if (panel === '220v') localStorage.setItem('coenergygo_custom_circuits_220v', JSON.stringify(nextCircuits220V));
            if (panel === '380v') localStorage.setItem('coenergygo_custom_circuits_380v', JSON.stringify(nextCircuits380V));
          } catch (e) {
            console.warn('Erro ao salvar circuitos auxiliares no localStorage:', e);
          }
        }

        const nextState: Partial<EVTopologyStoreState> = {
          customCircuits220V: nextCircuits220V,
          customCircuits380V: nextCircuits380V
        };

        return {
          ...nextState,
          topologyOutput: computeOutput(nextState)
        };
      });
    },

    removeCustomCircuit: (panel, id) => {
      set((state) => {
        const nextCircuits220V = panel === '220v' ? state.customCircuits220V.filter(c => c.id !== id) : state.customCircuits220V;
        const nextCircuits380V = panel === '380v' ? state.customCircuits380V.filter(c => c.id !== id) : state.customCircuits380V;

        if (typeof window !== 'undefined') {
          try {
            if (panel === '220v') localStorage.setItem('coenergygo_custom_circuits_220v', JSON.stringify(nextCircuits220V));
            if (panel === '380v') localStorage.setItem('coenergygo_custom_circuits_380v', JSON.stringify(nextCircuits380V));
          } catch (e) {
            console.warn('Erro ao salvar circuitos auxiliares no localStorage:', e);
          }
        }

        const nextState: Partial<EVTopologyStoreState> = {
          customCircuits220V: nextCircuits220V,
          customCircuits380V: nextCircuits380V
        };

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

    updateSectionInstallationMethod: (section, method) => {
      set((state) => {
        const updates: Partial<EVTopologyStoreState> = {};
        if (section === 'trecho_1') {
          updates.section1InstallationMethod = method;
        } else if (section === 'trecho_2') {
          updates.section2InstallationMethod = method;
        } else if (section === 'trecho_3') {
          updates.section3InstallationMethod = method;
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
