/**
 * Base de Dados de Concessionárias de Energia do Brasil — Padrões de Entrada BT
 * Cordeiro Energia — Módulo de Carregadores VE
 */

export interface UtilityCategory {
  id: string;
  phases: 1 | 2 | 3;
  limitKW: number;
  breakerA: number;
  desc: string;
}

export interface UtilityInfo {
  name: string;
  fullName: string;
  region: string;
  tensions: string; // ex: "127/220V" ou "220/380V"
  maxBTLimitKW: number; // limite para atendimento em BT
  categories: UtilityCategory[];
  standardsDocName: string;
}

export const UTILITY_DATABASE: Record<string, UtilityInfo> = {
  CEMIG: {
    name: "CEMIG",
    fullName: "Companhia Energética de Minas Gerais S.A.",
    region: "Minas Gerais",
    tensions: "127/220V ou 220/380V",
    maxBTLimitKW: 75,
    standardsDocName: "ND-5.1, ND-5.2 e ND-5.3",
    categories: [
      { id: "A", phases: 1, limitKW: 8, breakerA: 40, desc: "Monofásico até 8 kW (Disjuntor 40A)" },
      { id: "B1", phases: 2, limitKW: 12, breakerA: 50, desc: "Bifásico até 12 kW (Disjuntor 50A)" },
      { id: "B2", phases: 2, limitKW: 16, breakerA: 63, desc: "Bifásico até 16 kW (Disjuntor 63A)" },
      { id: "C1", phases: 3, limitKW: 24, breakerA: 63, desc: "Trifásico até 24 kW (Disjuntor 63A)" },
      { id: "C2", phases: 3, limitKW: 30, breakerA: 80, desc: "Trifásico até 30 kW (Disjuntor 80A)" },
      { id: "C3", phases: 3, limitKW: 38, breakerA: 100, desc: "Trifásico até 38 kW (Disjuntor 100A)" },
      { id: "C4", phases: 3, limitKW: 47, breakerA: 125, desc: "Trifásico até 47 kW (Disjuntor 125A)" },
      { id: "C5", phases: 3, limitKW: 75, breakerA: 200, desc: "Trifásico até 75 kW (Disjuntor 200A)" },
      { id: "F", phases: 3, limitKW: 304, breakerA: 400, desc: "Tipo F - Trifásico BT por opção (até 304 kVA)" }
    ]
  },
  CPFL: {
    name: "CPFL",
    fullName: "CPFL Energia (Paulista / Piratininga / Santa Cruz)",
    region: "São Paulo / Rio Grande do Sul",
    tensions: "127/220V ou 220/380V",
    maxBTLimitKW: 75,
    standardsDocName: "GED-13 e GED-119",
    categories: [
      { id: "M1", phases: 1, limitKW: 12, breakerA: 50, desc: "Monofásico até 12 kW (Disjuntor 50A)" },
      { id: "B1", phases: 2, limitKW: 25, breakerA: 70, desc: "Bifásico até 25 kW (Disjuntor 70A)" },
      { id: "T1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "T2", phases: 3, limitKW: 50, breakerA: 80, desc: "Trifásico até 50 kW (Disjuntor 80A)" },
      { id: "T3", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  },
  ENEL_SP: {
    name: "ENEL_SP",
    fullName: "Enel Distribuição São Paulo",
    region: "São Paulo Metropolitana",
    tensions: "115/230V ou 120/240V",
    maxBTLimitKW: 75,
    standardsDocName: "LIG BT 2024",
    categories: [
      { id: "Mono", phases: 1, limitKW: 12, breakerA: 50, desc: "Monofásico até 12 kW (Disjuntor 50A)" },
      { id: "Bi", phases: 2, limitKW: 25, breakerA: 70, desc: "Bifásico até 25 kW (Disjuntor 70A)" },
      { id: "Tri_1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "Tri_2", phases: 3, limitKW: 50, breakerA: 80, desc: "Trifásico até 50 kW (Disjuntor 80A)" },
      { id: "Tri_3", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  },
  ENEL_RJ: {
    name: "ENEL_RJ",
    fullName: "Enel Distribuição Rio",
    region: "Rio de Janeiro (Interior)",
    tensions: "127/220V",
    maxBTLimitKW: 75,
    standardsDocName: "CNC-OM-002",
    categories: [
      { id: "M1", phases: 1, limitKW: 8, breakerA: 40, desc: "Monofásico até 8 kW (Disjuntor 40A)" },
      { id: "B1", phases: 2, limitKW: 15, breakerA: 50, desc: "Bifásico até 15 kW (Disjuntor 50A)" },
      { id: "T1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "T2", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  },
  LIGHT: {
    name: "LIGHT",
    fullName: "Light Serviços de Eletricidade S.A.",
    region: "Rio de Janeiro Metropolitana",
    tensions: "127/220V",
    maxBTLimitKW: 75,
    standardsDocName: "Recon-BT",
    categories: [
      { id: "M1", phases: 1, limitKW: 8, breakerA: 40, desc: "Monofásico até 8 kW (Disjuntor 40A)" },
      { id: "B1", phases: 2, limitKW: 15, breakerA: 50, desc: "Bifásico até 15 kW (Disjuntor 50A)" },
      { id: "T1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "T2", phases: 3, limitKW: 50, breakerA: 80, desc: "Trifásico até 50 kW (Disjuntor 80A)" },
      { id: "T3", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  },
  NEOENERGIA: {
    name: "NEOENERGIA",
    fullName: "Neoenergia (Coelba / Elektro / Cosern / Pernambuco / Brasília)",
    region: "BA, SP/MS, RN, PE, DF",
    tensions: "120/240V ou 220/380V",
    maxBTLimitKW: 75,
    standardsDocName: "DIS-NOR-001 / Elektro ND-201",
    categories: [
      { id: "M1", phases: 1, limitKW: 10, breakerA: 40, desc: "Monofásico até 10 kW (Disjuntor 40A)" },
      { id: "B1", phases: 2, limitKW: 15, breakerA: 50, desc: "Bifásico até 15 kW (Disjuntor 50A)" },
      { id: "T1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "T2", phases: 3, limitKW: 50, breakerA: 80, desc: "Trifásico até 50 kW (Disjuntor 80A)" },
      { id: "T3", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  },
  EQUATORIAL: {
    name: "EQUATORIAL",
    fullName: "Equatorial Energia (MA / PA / AL / PI)",
    region: "Maranhão, Pará, Alagoas, Piauí",
    tensions: "127/220V ou 220/380V",
    maxBTLimitKW: 75,
    standardsDocName: "NT-01.EQ",
    categories: [
      { id: "M1", phases: 1, limitKW: 10, breakerA: 40, desc: "Monofásico até 10 kW (Disjuntor 40A)" },
      { id: "B1", phases: 2, limitKW: 15, breakerA: 50, desc: "Bifásico até 15 kW (Disjuntor 50A)" },
      { id: "T1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "T2", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  },
  COPEL: {
    name: "COPEL",
    fullName: "Copel Distribuição S.A.",
    region: "Paraná",
    tensions: "127/220V",
    maxBTLimitKW: 75,
    standardsDocName: "NTC 901100",
    categories: [
      { id: "M1", phases: 1, limitKW: 10, breakerA: 40, desc: "Monofásico até 10 kW (Disjuntor 40A)" },
      { id: "B1", phases: 2, limitKW: 20, breakerA: 63, desc: "Bifásico até 20 kW (Disjuntor 63A)" },
      { id: "T1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "T2", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  },
  CELESC: {
    name: "CELESC",
    fullName: "Celesc Distribuição S.A.",
    region: "Santa Catarina",
    tensions: "220/380V",
    maxBTLimitKW: 75,
    standardsDocName: "N-321.0001",
    categories: [
      { id: "Mono", phases: 1, limitKW: 15, breakerA: 70, desc: "Monofásico até 15 kW (Disjuntor 70A)" },
      { id: "Bi", phases: 2, limitKW: 25, breakerA: 90, desc: "Bifásico até 25 kW (Disjuntor 90A)" },
      { id: "Tri_1", phases: 3, limitKW: 38, breakerA: 63, desc: "Trifásico até 38 kW (Disjuntor 63A)" },
      { id: "Tri_2", phases: 3, limitKW: 75, breakerA: 100, desc: "Trifásico até 75 kW (Disjuntor 100A)" }
    ]
  }
};

/**
 * Retorna as especificações de uma concessionária pelo seu código/id
 */
export function getUtilityInfo(name: string): UtilityInfo {
  return UTILITY_DATABASE[name] || UTILITY_DATABASE.CEMIG;
}

/**
 * Busca a categoria de padrão de entrada recomendada com base na demanda calculada
 */
export function findRecommendedCategory(utilityName: string, demandKVA: number): UtilityCategory | null {
  const utility = getUtilityInfo(utilityName);
  // Encontra a menor categoria onde limitKW >= demandKVA (aproximação conservadora de kW/kVA)
  const sorted = [...utility.categories].sort((a, b) => a.limitKW - b.limitKW);
  for (const cat of sorted) {
    if (cat.limitKW >= demandKVA) {
      return cat;
    }
  }
  return null; // Se passar do limite de BT
}
