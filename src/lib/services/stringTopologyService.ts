/**
 * Serviço de Topologia e Configuração Física de Strings CC (Cordeiro Energia)
 * Base de Verdade: Planilha de Campo "STRINGS LIGADAS.xlsx" e Baseline Auditado de 16/09/2026.
 */

export type StringOperationalStatus = 'LIGADA' | 'VAZIA';

export interface InverterTopology {
  invNum: number;
  invSN: string;
  strings: Record<number, StringOperationalStatus>;
}

export interface PlantTopology {
  plantKey: string;
  sheetName: string;
  nomeUsinaPadrao: string;
  inversores: InverterTopology[];
}

export interface MpptPair {
  mppt: number;
  stringA: number;
  stringB: number;
}

export const MANGA_GRANDE_TOPOLOGY: Record<string, PlantTopology> = {
  MANGA_GRANDE_1: {
    plantKey: 'MANGA_GRANDE_1',
    sheetName: 'Manga Grande UFV1',
    nomeUsinaPadrao: 'USINA MANGA GRANDE UFV 1 1852',
    inversores: [
      {
        invNum: 1,
        invSN: 'ES2380071249',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'VAZIA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'VAZIA', 28: 'VAZIA'
        }
      },
      {
        invNum: 2,
        invSN: 'ES2380071220',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'LIGADA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'VAZIA', 15: 'VAZIA', 16: 'LIGADA',
          17: 'VAZIA', 18: 'VAZIA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'LIGADA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 3,
        invSN: 'ES2450052227',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'LIGADA', 10: 'LIGADA', 11: 'LIGADA', 12: 'VAZIA', 13: 'VAZIA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'LIGADA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'VAZIA', 28: 'VAZIA'
        }
      },
      {
        invNum: 4,
        invSN: 'ES2450054367',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'LIGADA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'VAZIA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'LIGADA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'VAZIA', 28: 'VAZIA'
        }
      }
    ]
  },
  MANGA_GRANDE_2: {
    plantKey: 'MANGA_GRANDE_2',
    sheetName: 'Manga Grande UFV2',
    nomeUsinaPadrao: 'USINA MANGA GRANDE UFV 2 2243',
    inversores: [
      {
        invNum: 1,
        invSN: 'ES2390025439',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'VAZIA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'VAZIA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 2,
        invSN: 'ES2390024605',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'VAZIA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 3,
        invSN: 'ES2390025524',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'VAZIA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 4,
        invSN: 'ES2390024603',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      }
    ]
  },
  MANGA_GRANDE_3: {
    plantKey: 'MANGA_GRANDE_3',
    sheetName: 'Manga Grande UFV3',
    nomeUsinaPadrao: 'USINA MANGA GRANDE 3 2565',
    inversores: [
      {
        invNum: 1,
        invSN: 'ES24B0086037',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'VAZIA', 28: 'VAZIA'
        }
      },
      {
        invNum: 2,
        invSN: 'ES2470039558',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'VAZIA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 3,
        invSN: 'ES24B0086039',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'VAZIA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 4,
        invSN: 'ES2470040155',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'VAZIA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'VAZIA', 28: 'VAZIA'
        }
      }
    ]
  },
  MANGA_GRANDE_5: {
    plantKey: 'MANGA_GRANDE_5',
    sheetName: 'Manga Grande UFV5',
    nomeUsinaPadrao: 'USINA MANGA GRANDE UFV 5',
    inversores: [
      {
        invNum: 1,
        invSN: 'ES2530107932',
        strings: {
          1: 'LIGADA', 2: 'VAZIA', 3: 'VAZIA', 4: 'VAZIA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'LIGADA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'LIGADA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 2,
        invSN: 'ES25301007920',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'VAZIA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'VAZIA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'VAZIA', 28: 'VAZIA'
        }
      },
      {
        invNum: 3,
        invSN: 'GR2579042020',
        strings: {
          1: 'LIGADA', 2: 'VAZIA', 3: 'VAZIA', 4: 'VAZIA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'LIGADA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'LIGADA', 14: 'LIGADA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'LIGADA', 28: 'VAZIA'
        }
      },
      {
        invNum: 4,
        invSN: 'ES2570106075',
        strings: {
          1: 'LIGADA', 2: 'LIGADA', 3: 'LIGADA', 4: 'LIGADA', 5: 'LIGADA', 6: 'LIGADA', 7: 'LIGADA', 8: 'LIGADA',
          9: 'VAZIA', 10: 'LIGADA', 11: 'LIGADA', 12: 'LIGADA', 13: 'VAZIA', 14: 'VAZIA', 15: 'LIGADA', 16: 'LIGADA',
          17: 'LIGADA', 18: 'LIGADA', 19: 'LIGADA', 20: 'LIGADA', 21: 'LIGADA', 22: 'LIGADA', 23: 'VAZIA', 24: 'LIGADA',
          25: 'LIGADA', 26: 'LIGADA', 27: 'VAZIA', 28: 'VAZIA'
        }
      }
    ]
  }
};

export class StringTopologyService {
  /**
   * Retorna os pares padrão de MPPT para inversores Huawei SUN2000-250KTL (14 MPPTs, 2 strings cada).
   */
  public static getMpptPairs(totalStrings = 28): MpptPair[] {
    const pairs: MpptPair[] = [];
    const totalMppts = Math.floor(totalStrings / 2);
    for (let m = 1; m <= totalMppts; m++) {
      pairs.push({
        mppt: m,
        stringA: 2 * m - 1,
        stringB: 2 * m,
      });
    }
    return pairs;
  }

  /**
   * Encontra a topologia de um inversor pelo seu número de série (SN).
   */
  public static getInverterTopologyBySN(sn: string): InverterTopology | null {
    const cleanSN = sn.replace(/\s+/g, '').toUpperCase();
    for (const plant of Object.values(MANGA_GRANDE_TOPOLOGY)) {
      const found = plant.inversores.find(
        (inv) => inv.invSN.replace(/\s+/g, '').toUpperCase() === cleanSN
      );
      if (found) return found;
    }
    return null;
  }

  /**
   * Retorna o status de projeto de uma string (LIGADA ou VAZIA).
   * Padrão caso não mapeado: 'LIGADA'.
   */
  public static getStringStatus(invSN: string, stringNum: number): StringOperationalStatus {
    const inv = this.getInverterTopologyBySN(invSN);
    if (!inv || !inv.strings[stringNum]) {
      return 'LIGADA'; // Se não tiver cadastro de vazia, assume que está ligada por segurança
    }
    return inv.strings[stringNum];
  }

  /**
   * Retorna se a string é declarada como VAZIA no projeto.
   */
  public static isStringVazia(invSN: string, stringNum: number): boolean {
    return this.getStringStatus(invSN, stringNum) === 'VAZIA';
  }

  /**
   * Retorna a topologia completa de uma usina pelo seu nome ou chave.
   */
  public static getPlantTopology(usinaNomeOuKey: string): PlantTopology | null {
    const search = usinaNomeOuKey.toLowerCase();
    for (const [key, plant] of Object.entries(MANGA_GRANDE_TOPOLOGY)) {
      if (
        key.toLowerCase() === search ||
        plant.sheetName.toLowerCase().includes(search) ||
        plant.nomeUsinaPadrao.toLowerCase().includes(search)
      ) {
        return plant;
      }
      if (search.includes('ufv 1') || search.includes('ufv1') || search.includes('manga 1')) {
        if (key === 'MANGA_GRANDE_1') return plant;
      }
      if (search.includes('ufv 2') || search.includes('ufv2') || search.includes('manga 2')) {
        if (key === 'MANGA_GRANDE_2') return plant;
      }
      if (search.includes('ufv 3') || search.includes('ufv3') || search.includes('manga 3')) {
        if (key === 'MANGA_GRANDE_3') return plant;
      }
      if (search.includes('ufv 5') || search.includes('ufv5') || search.includes('manga 5')) {
        if (key === 'MANGA_GRANDE_5') return plant;
      }
    }
    return null;
  }
}
