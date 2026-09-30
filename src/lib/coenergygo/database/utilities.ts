/**
 * CoenergyGO — Base de Dados Normativa de Concessionárias de Energia
 * Cordeiro Energia
 * 
 * Normas Oficiais:
 * - CEMIG: ND-5.1 (BT Individual), ND-5.2 (Edificações Coletivas), ND-5.3 (Média Tensão)
 * - CPFL: GED-150030 (Acesso VE), GED-13 (BT Individual), GED-119 (Uso Coletivo)
 * - ENERGISA: NDU 042 (Estações de Recarga VE), NDU 001 (BT), NDU 002 (MT)
 */

import { UtilityCategorySpec, UtilityId } from '../types';

// ─── CEMIG (MINAS GERAIS) ────────────────────────────────────────────────────

export const CEMIG_CATEGORIES: Record<string, UtilityCategorySpec> = {
  'A': {
    categoryId: 'A',
    categoryName: 'Tipo A — Monofásico até 8 kW (Disjuntor 40A)',
    phases: 1,
    voltage: '127/220V',
    maxLimitKW: 8,
    breakerCurrentA: 40,
    cableGaugePhaseMM2: 10,
    cableGaugeNeutralMM2: 10,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'CM-1 (Caixa Monofásica Policarbonato)'
  },
  'B1': {
    categoryId: 'B1',
    categoryName: 'Tipo B1 — Bifásico até 12 kW (Disjuntor 50A)',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 12,
    breakerCurrentA: 50,
    cableGaugePhaseMM2: 10,
    cableGaugeNeutralMM2: 10,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'CM-2 (Caixa Polifásica Policarbonato)'
  },
  'B2': {
    categoryId: 'B2',
    categoryName: 'Tipo B2 — Bifásico até 16 kW (Disjuntor 63A)',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 16,
    breakerCurrentA: 63,
    cableGaugePhaseMM2: 16,
    cableGaugeNeutralMM2: 16,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'CM-2 (Caixa Polifásica Policarbonato)'
  },
  'C1': {
    categoryId: 'C1',
    categoryName: 'Tipo C1 — Trifásico até 24 kW (Disjuntor 63A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 24,
    breakerCurrentA: 63,
    cableGaugePhaseMM2: 16,
    cableGaugeNeutralMM2: 16,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'CM-2 / CM-3 (Medição Direta)'
  },
  'C2': {
    categoryId: 'C2',
    categoryName: 'Tipo C2 — Trifásico até 30 kW (Disjuntor 80A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 30,
    breakerCurrentA: 80,
    cableGaugePhaseMM2: 25,
    cableGaugeNeutralMM2: 25,
    cableGaugeGroundMM2: 16,
    meterBoxType: 'CM-3 (Medição Direta com Visor)'
  },
  'C3': {
    categoryId: 'C3',
    categoryName: 'Tipo C3 — Trifásico até 38 kW (Disjuntor 100A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 38,
    breakerCurrentA: 100,
    cableGaugePhaseMM2: 35,
    cableGaugeNeutralMM2: 35,
    cableGaugeGroundMM2: 16,
    meterBoxType: 'CM-3'
  },
  'C4': {
    categoryId: 'C4',
    categoryName: 'Tipo C4 — Trifásico até 47 kW (Disjuntor 125A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 47,
    breakerCurrentA: 125,
    cableGaugePhaseMM2: 50,
    cableGaugeNeutralMM2: 50,
    cableGaugeGroundMM2: 25,
    meterBoxType: 'CM-4 / CM-13 (Medição Indireta com TCs)'
  },
  'C5': {
    categoryId: 'C5',
    categoryName: 'Tipo C5 — Trifásico até 75 kW (Disjuntor 200A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 75,
    breakerCurrentA: 200,
    cableGaugePhaseMM2: 95,
    cableGaugeNeutralMM2: 95,
    cableGaugeGroundMM2: 50,
    meterBoxType: 'CM-14 (Medição Indireta com TCs e Painel)'
  },
  'F': {
    categoryId: 'F',
    categoryName: 'Tipo F — Trifásico BT por Opção Técnica (até 304 kVA / 400A)',
    phases: 3,
    voltage: '220/380V',
    maxLimitKW: 304,
    breakerCurrentA: 400,
    cableGaugePhaseMM2: 240,
    cableGaugeNeutralMM2: 240,
    cableGaugeGroundMM2: 120,
    meterBoxType: 'Cubículo Blindado Modular BT com TCs'
  }
};

// ─── CPFL ENERGIA ────────────────────────────────────────────────────────────

export const CPFL_CATEGORIES: Record<string, UtilityCategorySpec> = {
  'M1': {
    categoryId: 'M1',
    categoryName: 'Tipo M1 — Monofásico até 12 kW (Disjuntor 50A)',
    phases: 1,
    voltage: '127/220V',
    maxLimitKW: 12,
    breakerCurrentA: 50,
    cableGaugePhaseMM2: 10,
    cableGaugeNeutralMM2: 10,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'Caixa Tipo H (Padrão CPFL)'
  },
  'B1': {
    categoryId: 'B1',
    categoryName: 'Tipo B1 — Bifásico até 25 kW (Disjuntor 70A)',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 25,
    breakerCurrentA: 70,
    cableGaugePhaseMM2: 16,
    cableGaugeNeutralMM2: 16,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'Caixa Tipo P (Polifásica CPFL)'
  },
  'T1': {
    categoryId: 'T1',
    categoryName: 'Tipo T1 — Trifásico até 38 kW (Disjuntor 63A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 38,
    breakerCurrentA: 63,
    cableGaugePhaseMM2: 16,
    cableGaugeNeutralMM2: 16,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'Caixa Tipo T (Trifásica CPFL)'
  },
  'T2': {
    categoryId: 'T2',
    categoryName: 'Tipo T2 — Trifásico até 50 kW (Disjuntor 80A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 50,
    breakerCurrentA: 80,
    cableGaugePhaseMM2: 25,
    cableGaugeNeutralMM2: 25,
    cableGaugeGroundMM2: 16,
    meterBoxType: 'Caixa Tipo T com TC'
  },
  'T3': {
    categoryId: 'T3',
    categoryName: 'Tipo T3 — Trifásico até 75 kW (Disjuntor 100A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 75,
    breakerCurrentA: 100,
    cableGaugePhaseMM2: 35,
    cableGaugeNeutralMM2: 35,
    cableGaugeGroundMM2: 16,
    meterBoxType: 'Painel Modular de Medição Indireta CPFL'
  }
};

// ─── GRUPO ENERGISA ──────────────────────────────────────────────────────────

export const ENERGISA_CATEGORIES: Record<string, UtilityCategorySpec> = {
  'M-1': {
    categoryId: 'M-1',
    categoryName: 'Categoria M-1 — Monofásico até 10 kW (Disjuntor 40A)',
    phases: 1,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 10,
    breakerCurrentA: 40,
    cableGaugePhaseMM2: 10,
    cableGaugeNeutralMM2: 10,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'Caixa Monofásica NDU 001'
  },
  'B-1': {
    categoryId: 'B-1',
    categoryName: 'Categoria B-1 — Bifásico até 15 kW (Disjuntor 50A)',
    phases: 2,
    voltage: '127/220V',
    maxLimitKW: 15,
    breakerCurrentA: 50,
    cableGaugePhaseMM2: 10,
    cableGaugeNeutralMM2: 10,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'Caixa Polifásica NDU 001'
  },
  'T-1': {
    categoryId: 'T-1',
    categoryName: 'Categoria T-1 — Trifásico até 38 kW (Disjuntor 63A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 38,
    breakerCurrentA: 63,
    cableGaugePhaseMM2: 16,
    cableGaugeNeutralMM2: 16,
    cableGaugeGroundMM2: 10,
    meterBoxType: 'Caixa Trifásica NDU 001'
  },
  'T-2': {
    categoryId: 'T-2',
    categoryName: 'Categoria T-2 — Trifásico até 50 kW (Disjuntor 80A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 50,
    breakerCurrentA: 80,
    cableGaugePhaseMM2: 25,
    cableGaugeNeutralMM2: 25,
    cableGaugeGroundMM2: 16,
    meterBoxType: 'Caixa de Medição NDU 001 com TC'
  },
  'T-3': {
    categoryId: 'T-3',
    categoryName: 'Categoria T-3 — Trifásico até 75 kW (Disjuntor 125A)',
    phases: 3,
    voltage: '127/220V ou 220/380V',
    maxLimitKW: 75,
    breakerCurrentA: 125,
    cableGaugePhaseMM2: 50,
    cableGaugeNeutralMM2: 50,
    cableGaugeGroundMM2: 25,
    meterBoxType: 'Painel Modular de Medição Indireta NDU 001'
  }
};

// ─── TRANSFORMADORES PADRONIZADOS (MÉDIA TENSÃO) ─────────────────────────────

export const NORMALIZED_TRANSFORMERS_KVA = [
  45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000
];

export function selectNormalizedTransformer(demandKVA: number): number {
  for (const trafo of NORMALIZED_TRANSFORMERS_KVA) {
    // Margem operacional recomendada de 5% a 10%
    if (trafo * 0.95 >= demandKVA) {
      return trafo;
    }
  }
  return Math.ceil(demandKVA / 500) * 500;
}
