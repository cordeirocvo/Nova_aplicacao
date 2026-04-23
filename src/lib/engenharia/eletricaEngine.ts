// src/lib/engenharia/eletricaEngine.ts

export type MaterialCondutor = 'COBRE' | 'ALUMINIO';
export type Isolacao = 'PVC' | 'EPR_XLPE';
export type MetodoInstalacao = 'B1' | 'B2' | 'C' | 'E' | 'F';

export interface TabelaCondutor {
  secao: number;
  // Ampacidades por método (Cobre PVC) - Tabela 36 e similares simplificadas para 3 condutores carregados (Trifásico)
  ampacidade: {
    [metodo in MetodoInstalacao]: number;
  };
  r_km: number; // Resistência CA Ohms/km a 70C/90C
  x_km: number; // Reatância Ohms/km
}

// Dados aproximados base NBR-5410/Fabricantes para COBRE (para 3 condutores carregados)
export const TABELA_COBRE_PVC: TabelaCondutor[] = [
  { secao: 1.5, ampacidade: { B1: 13.5, B2: 13, C: 15.5, E: 16.5, F: 17 }, r_km: 15.42, x_km: 0.115 },
  { secao: 2.5, ampacidade: { B1: 18.5, B2: 17.5, C: 21, E: 23, F: 23 }, r_km: 9.38, x_km: 0.110 },
  { secao: 4, ampacidade: { B1: 24, B2: 23, C: 28, E: 30, F: 31 }, r_km: 5.85, x_km: 0.106 },
  { secao: 6, ampacidade: { B1: 31, B2: 29, C: 36, E: 39, F: 40 }, r_km: 3.91, x_km: 0.100 },
  { secao: 10, ampacidade: { B1: 42, B2: 39, C: 50, E: 54, F: 55 }, r_km: 2.33, x_km: 0.096 },
  { secao: 16, ampacidade: { B1: 56, B2: 52, C: 68, E: 73, F: 75 }, r_km: 1.47, x_km: 0.091 },
  { secao: 25, ampacidade: { B1: 73, B2: 68, C: 89, E: 95, F: 98 }, r_km: 0.941, x_km: 0.090 },
  { secao: 35, ampacidade: { B1: 89, B2: 83, C: 110, E: 117, F: 122 }, r_km: 0.673, x_km: 0.086 },
  { secao: 50, ampacidade: { B1: 108, B2: 99, C: 134, E: 141, F: 149 }, r_km: 0.495, x_km: 0.086 },
  { secao: 70, ampacidade: { B1: 136, B2: 125, C: 171, E: 179, F: 192 }, r_km: 0.342, x_km: 0.082 },
  { secao: 95, ampacidade: { B1: 164, B2: 150, C: 207, E: 216, F: 235 }, r_km: 0.252, x_km: 0.082 },
  { secao: 120, ampacidade: { B1: 188, B2: 172, C: 239, E: 249, F: 273 }, r_km: 0.201, x_km: 0.080 },
  { secao: 150, ampacidade: { B1: 216, B2: 196, C: 275, E: 285, F: 316 }, r_km: 0.165, x_km: 0.080 },
  { secao: 185, ampacidade: { B1: 245, B2: 223, C: 314, E: 324, F: 363 }, r_km: 0.136, x_km: 0.080 },
  { secao: 240, ampacidade: { B1: 286, B2: 261, C: 369, E: 380, F: 430 }, r_km: 0.105, x_km: 0.079 },
  { secao: 300, ampacidade: { B1: 328, B2: 298, C: 420, E: 431, F: 497 }, r_km: 0.085, x_km: 0.078 }
];

export const TABELA_COBRE_XLPE: TabelaCondutor[] = TABELA_COBRE_PVC.map(c => ({
  ...c,
  // Approximate +20% capacity for 90C insulators relative to PVC for standard sizes
  ampacidade: {
    B1: c.ampacidade.B1 * 1.25,
    B2: c.ampacidade.B2 * 1.25,
    C: c.ampacidade.C * 1.20,
    E: c.ampacidade.E * 1.25,
    F: c.ampacidade.F * 1.20,
  }
}));

export const DISJUNTORES_COMERCIAIS = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200
];

export interface ParametrosCircuito {
  nome: string;
  potenciaKW: number;
  tensaoFN: number;      // Tensão Fase-Neutro (Ex: 220, 127)
  tensaoFF: number;      // Tensão Fase-Fase (Ex: 380, 220)
  fases: 1 | 2 | 3;
  fatorPotencia: number;
  comprimentoMetros: number;
  quedaTensaoMaxPorcento: number; // Ex: 4 para 4%
  metodoInstalacao: MetodoInstalacao;
  isolacao: Isolacao;
  material: MaterialCondutor;
  temperaturaAmbiente: number; // 30 Padrao
  numCircuitosAgrupados: number; // 1 (Fca = 1)
}

export interface ResultadoEletrico {
  correnteProjetoIb: number;
  secaoEscolhidaMM: number;
  capacidadeCaboIz: number;
  fatorCorrecaoTotal: number;
  disjuntorIn: number;
  quedaTensaoRealVolts: number;
  quedaTensaoRealPorcento: number;
  impedanciaZ_Ohms: number; // Para cálculo posterior da malha de curto
}

function getFatorCorrecaoTemperatura(temp: number, isolacao: Isolacao): number {
  if (temp <= 30) return 1.0;
  if (isolacao === 'PVC') {
    if (temp <= 35) return 0.94;
    if (temp <= 40) return 0.87;
    if (temp <= 45) return 0.79;
    return 0.71;
  } else {
    // EPR / XLPE (90C)
    if (temp <= 35) return 0.96;
    if (temp <= 40) return 0.91;
    if (temp <= 45) return 0.87;
    if (temp <= 50) return 0.82;
    return 0.76;
  }
}

function getFatorCorrecaoAgrupamento(agrup: number): number {
  if (agrup <= 1) return 1.0;
  if (agrup === 2) return 0.80;
  if (agrup === 3) return 0.70;
  if (agrup === 4) return 0.65;
  if (agrup === 5) return 0.60;
  if (agrup === 6) return 0.57;
  if (agrup <= 8) return 0.52;
  return 0.45;
}

/**
 * Motor de Dimensionamento de Cabo e Disjuntor
 */
export function dimensionarCircuitoBT(params: ParametrosCircuito): ResultadoEletrico {
  const S_VA = params.potenciaKW * 1000 / params.fatorPotencia;
  
  let VBase = params.tensaoFF;
  let Ib = 0;
  const isTrifasico = params.fases === 3;
  
  if (isTrifasico) {
    Ib = S_VA / (Math.sqrt(3) * params.tensaoFF);
  } else if (params.fases === 2) {
    Ib = S_VA / params.tensaoFF; // Bifásico (Fase-Fase)
  } else {
    Ib = S_VA / params.tensaoFN; // Monofásico (Fase-Neutro)
    VBase = params.tensaoFN;
  }

  // Fatores de Correção
  const fct = getFatorCorrecaoTemperatura(params.temperaturaAmbiente, params.isolacao);
  const fca = getFatorCorrecaoAgrupamento(params.numCircuitosAgrupados);
  const fcTotal = fct * fca;

  const ibCorrigida = Ib / fcTotal;

  const tabelaBase = params.isolacao === 'PVC' ? TABELA_COBRE_PVC : TABELA_COBRE_XLPE;
  
  let caboTabela: TabelaCondutor | null = null;
  let quedaVolts = 0;
  let quedaPorcento = 0;

  // Busca iterativa: Capacidade e depois Queda de Tensão
  for (const c of tabelaBase) {
    const iz_tabelado = c.ampacidade[params.metodoInstalacao];
    if (iz_tabelado >= ibCorrigida) {
      
      // Checar Queda de Tensão
      const senPhi = Math.sin(Math.acos(params.fatorPotencia));
      const distKm = params.comprimentoMetros / 1000;
      
      if (isTrifasico) {
        quedaVolts = Math.sqrt(3) * distKm * Ib * (c.r_km * params.fatorPotencia + c.x_km * senPhi);
        quedaPorcento = (quedaVolts / params.tensaoFF) * 100;
      } else {
        // Monofásico / Bifásico L-L (considerando o vai e volta e L-L como 2 condutores)
        quedaVolts = 2 * distKm * Ib * (c.r_km * params.fatorPotencia + c.x_km * senPhi);
        quedaPorcento = (quedaVolts / VBase) * 100;
      }

      if (quedaPorcento <= params.quedaTensaoMaxPorcento) {
        caboTabela = c;
        break;
      }
    }
  }

  if (!caboTabela) {
    // Se não passou em nenhum, usa o maior disponivel simulando condutores em paralelo
    // (Apenas um fallback simples para o MPV)
    caboTabela = tabelaBase[tabelaBase.length - 1];
    const senPhi = Math.sin(Math.acos(params.fatorPotencia));
    const distKm = params.comprimentoMetros / 1000;
    if (isTrifasico) {
      quedaVolts = Math.sqrt(3) * distKm * Ib * (caboTabela.r_km * params.fatorPotencia + caboTabela.x_km * senPhi);
    } else {
      quedaVolts = 2 * distKm * Ib * (caboTabela.r_km * params.fatorPotencia + caboTabela.x_km * senPhi);
    }
    quedaPorcento = (quedaVolts / VBase) * 100;
  }

  // Dimensionamento do Disjuntor Ib <= In <= Iz
  let In = DISJUNTORES_COMERCIAIS[0];
  const Iz_real = caboTabela.ampacidade[params.metodoInstalacao] * fcTotal;
  
  for (const d of DISJUNTORES_COMERCIAIS) {
    if (d >= Ib && d <= Iz_real) {
      In = d;
      break;
    }
  }

  if (In < Ib) {
    // Caso especial onde Ib ~ Iz real, disjuntor pula
    const filtered = DISJUNTORES_COMERCIAIS.filter(d => d >= Ib);
    In = filtered.length > 0 ? filtered[0] : Ib; 
  }

  const distKm = params.comprimentoMetros / 1000;
  const Z_cabo = Math.sqrt(Math.pow(caboTabela.r_km * distKm, 2) + Math.pow(caboTabela.x_km * distKm, 2));

  return {
    correnteProjetoIb: Ib,
    fatorCorrecaoTotal: fcTotal,
    secaoEscolhidaMM: caboTabela.secao,
    capacidadeCaboIz: Iz_real,
    disjuntorIn: In,
    quedaTensaoRealVolts: quedaVolts,
    quedaTensaoRealPorcento: quedaPorcento,
    impedanciaZ_Ohms: Z_cabo
  };
}

/**
 *  Curto-Circuito IEC 60909 (Método das Impedâncias) - Valor Simétrico Trifásico Fólido
 */
export interface ParametrosMalhaCurto {
  tensaoSecundarioFF: number;
  sccRede_MVA?: number; // Ex: 500 MVA da concessionária.
  potenciaTrafo_KVA: number; // Ex: 112.5
  impTrafo_Perc: number;     // Zcc% Ex: 4.0
  zExtra_Ohms: number;       // Impedância de trechos de cabos ACUMULADOS até a falta
}

export function calcularCurtoMalhaEletrica(params: ParametrosMalhaCurto) {
  const V = params.tensaoSecundarioFF;
  
  // Z da Rede (referido ao secundario)
  let Z_rede = 0;
  if (params.sccRede_MVA && params.sccRede_MVA > 0) {
    Z_rede = (Math.pow(V, 2)) / (params.sccRede_MVA * 1e6);
  }

  // Z do Trafo (referido ao secundario)
  const z_pu = params.impTrafo_Perc / 100;
  const Z_trafo = (z_pu * Math.pow(V, 2)) / (params.potenciaTrafo_KVA * 1000);

  // Z Total Equivalente no ponto
  const ZTotal = Z_rede + Z_trafo + params.zExtra_Ohms;

  // Icc simetrica 
  const iccA = V / (Math.sqrt(3) * ZTotal);
  
  return {
    impedanciaRede: Z_rede,
    impedanciaTrafo: Z_trafo,
    impedanciaEquivalente: ZTotal,
    curtoCircuitoA: iccA,
    curtoCircuitoKA: iccA / 1000
  };
}
