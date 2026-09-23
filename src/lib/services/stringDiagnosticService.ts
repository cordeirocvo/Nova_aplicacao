/**
 * Serviço de Diagnóstico Inteligente de Strings CC e Detecção de Falhas (Cordeiro Energia)
 * Motor especializado em comparação de correntes (Imp) em paralelo por MPPT
 * Base de Calibração: Baseline 16/09/2026 e Topologia "STRINGS LIGADAS.xlsx"
 */

import { StringTopologyService, StringOperationalStatus } from './stringTopologyService';

export type StringDiagnosticStatus =
  | 'NORMAL'
  | 'VAZIA_PROJETO'
  | 'FUSIVEL_QUEIMADO'
  | 'SUBPERFORMANCE'
  | 'DESLIGADO_SEM_SOL';

export interface StringMeasurement {
  stringNum: number;
  correnteA: number;
  tensaoV?: number;
  potenciaW?: number;
  statusProjeto: StringOperationalStatus;
  diagnostico: StringDiagnosticStatus;
  detalhe: string;
}

export interface MpptDiagnostic {
  mppt: number;
  stringA: StringMeasurement;
  stringB: StringMeasurement;
  deltaCorrentePct?: number;
  statusGeral: 'OK' | 'ALERTA_FUSIVEL' | 'ALERTA_DESBALANCEAMENTO' | 'INATIVO';
}

export interface InverterDiagnosticResult {
  inversorSN: string;
  inversorNome?: string;
  potenciaAtivaKW?: number;
  mppts: MpptDiagnostic[];
  totalStringsLigadas: number;
  totalStringsVazias: number;
  totalNormais: number;
  totalFusivelQueimado: number;
  totalSubperformance: number;
  alertas: Array<{
    tipo: 'FUSIVEL_QUEIMADO' | 'SUBPERFORMANCE';
    severidade: 'ALTA' | 'MEDIA';
    stringNum: number;
    mppt: number;
    mensagem: string;
    recomendacao: string;
  }>;
}

export interface PlantDiagnosticSummary {
  usinaId: string;
  usinaNome: string;
  timestamp: string;
  condicaoSolarPlena: boolean;
  irradianciaWM2?: number;
  inversores: InverterDiagnosticResult[];
  kpis: {
    totalStrings: number;
    totalLigadas: number;
    totalVazias: number;
    totalNormais: number;
    totalFusivelQueimado: number;
    totalSubperformance: number;
    taxaSaudePct: number;
  };
  alertasGerais: Array<{
    usinaNome: string;
    inversorSN: string;
    mppt: number;
    stringNum: number;
    severidade: 'ALTA' | 'MEDIA';
    mensagem: string;
    recomendacao: string;
  }>;
}

export class StringDiagnosticService {
  /**
   * Avalia a telemetria de um inversor e gera o diagnóstico detalhado por MPPT.
   */
  public static diagnoseInverter(
    inversorSN: string,
    stringsData: Record<string, { I?: number; V?: number } | number>,
    potenciaAtivaKW = 0,
    irradianciaWM2?: number
  ): InverterDiagnosticResult {
    const cleanSN = inversorSN.replace(/\s+/g, '').toUpperCase();
    const mpptPairs = StringTopologyService.getMpptPairs(28);

    // 1. Extrair correntes e tensões para cada string (1 a 28)
    const rawMeasurements: Record<number, { I: number; V: number }> = {};
    let maxCurrentInInverter = 0;
    let sumCurrentActive = 0;
    let countActiveMeasuring = 0;

    for (let s = 1; s <= 28; s++) {
      // Formatos possíveis de chave: ES2380071249_S1, S1, String 1, pv1_i
      const candidates = [
        `${cleanSN}_S${s}`,
        `S${s}`,
        `String ${s}`,
        `String${s}`,
        `s${s}`,
        `pv${s}`,
        `pv${s}_i`,
      ];

      let current = 0;
      let voltage = 0;

      for (const k of candidates) {
        if (stringsData[k] !== undefined) {
          const val = stringsData[k];
          if (typeof val === 'number') {
            current = val;
          } else if (typeof val === 'object' && val !== null) {
            current = val.I ?? 0;
            voltage = val.V ?? 0;
          }
          break;
        }
      }

      rawMeasurements[s] = { I: Math.max(0, current), V: Math.max(0, voltage) };

      const statusProj = StringTopologyService.getStringStatus(cleanSN, s);
      if (statusProj === 'LIGADA') {
        if (current > maxCurrentInInverter) maxCurrentInInverter = current;
        if (current > 0.5) {
          sumCurrentActive += current;
          countActiveMeasuring++;
        }
      }
    }

    // Condição de Sol Pleno para o inversor:
    // Se irradiancia >= 300 W/m² OU a média das strings ativas for > 2.0 A OU a máxima for > 3.5 A
    const avgCurrentActive = countActiveMeasuring > 0 ? sumCurrentActive / countActiveMeasuring : 0;
    const isFullSun =
      (irradianciaWM2 !== undefined && irradianciaWM2 >= 250) ||
      avgCurrentActive >= 2.0 ||
      maxCurrentInInverter >= 3.5;

    const mppts: MpptDiagnostic[] = [];
    const alertas: InverterDiagnosticResult['alertas'] = [];

    let totalStringsLigadas = 0;
    let totalStringsVazias = 0;
    let totalNormais = 0;
    let totalFusivelQueimado = 0;
    let totalSubperformance = 0;

    for (const pair of mpptPairs) {
      const { mppt, stringA: sA, stringB: sB } = pair;
      const statusA = StringTopologyService.getStringStatus(cleanSN, sA);
      const statusB = StringTopologyService.getStringStatus(cleanSN, sB);

      if (statusA === 'LIGADA') totalStringsLigadas++;
      else totalStringsVazias++;

      if (statusB === 'LIGADA') totalStringsLigadas++;
      else totalStringsVazias++;

      const measA = rawMeasurements[sA];
      const measB = rawMeasurements[sB];

      let diagA: StringDiagnosticStatus = 'NORMAL';
      let diagB: StringDiagnosticStatus = 'NORMAL';
      let detalheA = 'Operação em conformidade';
      let detalheB = 'Operação em conformidade';
      let mpptStatus: MpptDiagnostic['statusGeral'] = 'OK';
      let deltaPct: number | undefined = undefined;

      // Se ambas são VAZIAS por projeto
      if (statusA === 'VAZIA' && statusB === 'VAZIA') {
        diagA = 'VAZIA_PROJETO';
        diagB = 'VAZIA_PROJETO';
        detalheA = 'String vazia por projeto (sem cabeamento CC)';
        detalheB = 'String vazia por projeto (sem cabeamento CC)';
        mpptStatus = 'INATIVO';
      }
      // Se apenas uma é LIGADA
      else if (statusA === 'LIGADA' && statusB === 'VAZIA') {
        diagB = 'VAZIA_PROJETO';
        detalheB = 'String vazia por projeto';

        if (!isFullSun) {
          diagA = 'DESLIGADO_SEM_SOL';
          detalheA = 'Sem irradiação suficiente para geração ativa';
          mpptStatus = 'INATIVO';
        } else if (measA.I <= 0.5 && (maxCurrentInInverter >= 3.0 || avgCurrentActive >= 2.0)) {
          diagA = 'FUSIVEL_QUEIMADO';
          detalheA = `Corrente zerada (${measA.I.toFixed(2)} A) sob sol pleno. Provável fusível rompido ou chave CC aberta.`;
          mpptStatus = 'ALERTA_FUSIVEL';
          totalFusivelQueimado++;
          alertas.push({
            tipo: 'FUSIVEL_QUEIMADO',
            severidade: 'ALTA',
            stringNum: sA,
            mppt,
            mensagem: `Inversor ${cleanSN}: String ${sA} (MPPT ${mppt}) está com corrente nula (${measA.I.toFixed(2)} A) enquanto o inversor gera sob sol pleno.`,
            recomendacao: `Inspecionar o fusível CC e conexões MC4 da String ${sA} no quadro de proteção do Inversor ${cleanSN}.`,
          });
        } else {
          diagA = 'NORMAL';
          detalheA = `Geração ativa normal (${measA.I.toFixed(2)} A)`;
          totalNormais++;
        }
      } else if (statusA === 'VAZIA' && statusB === 'LIGADA') {
        diagA = 'VAZIA_PROJETO';
        detalheA = 'String vazia por projeto';

        if (!isFullSun) {
          diagB = 'DESLIGADO_SEM_SOL';
          detalheB = 'Sem irradiação suficiente para geração ativa';
          mpptStatus = 'INATIVO';
        } else if (measB.I <= 0.5 && (maxCurrentInInverter >= 3.0 || avgCurrentActive >= 2.0)) {
          diagB = 'FUSIVEL_QUEIMADO';
          detalheB = `Corrente zerada (${measB.I.toFixed(2)} A) sob sol pleno. Provável fusível rompido ou chave CC aberta.`;
          mpptStatus = 'ALERTA_FUSIVEL';
          totalFusivelQueimado++;
          alertas.push({
            tipo: 'FUSIVEL_QUEIMADO',
            severidade: 'ALTA',
            stringNum: sB,
            mppt,
            mensagem: `Inversor ${cleanSN}: String ${sB} (MPPT ${mppt}) está com corrente nula (${measB.I.toFixed(2)} A) sob sol pleno.`,
            recomendacao: `Inspecionar fusível CC da String ${sB} e verificar chave seccionadora do Inversor ${cleanSN}.`,
          });
        } else {
          diagB = 'NORMAL';
          detalheB = `Geração ativa normal (${measB.I.toFixed(2)} A)`;
          totalNormais++;
        }
      }
      // Ambas são LIGADAS (Caso mais comum: 2 strings em paralelo no mesmo MPPT)
      else {
        if (!isFullSun) {
          diagA = 'DESLIGADO_SEM_SOL';
          diagB = 'DESLIGADO_SEM_SOL';
          detalheA = 'Baixa irradiação';
          detalheB = 'Baixa irradiação';
          mpptStatus = 'INATIVO';
        } else {
          const maxI = Math.max(measA.I, measB.I);
          const minI = Math.min(measA.I, measB.I);

          if (maxI > 0) {
            deltaPct = ((maxI - minI) / maxI) * 100;
          }

          // Caso 1: Uma gerando bem e a outra zerada -> FUSÍVEL QUEIMADO
          if (measA.I > 2.0 && measB.I <= 0.5) {
            diagA = 'NORMAL';
            detalheA = `Geração ativa plena (${measA.I.toFixed(2)} A)`;
            diagB = 'FUSIVEL_QUEIMADO';
            detalheB = `String par gerando ${measA.I.toFixed(2)} A, mas esta está zerada (${measB.I.toFixed(2)} A). Fusível rompido.`;
            mpptStatus = 'ALERTA_FUSIVEL';
            totalNormais++;
            totalFusivelQueimado++;
            alertas.push({
              tipo: 'FUSIVEL_QUEIMADO',
              severidade: 'ALTA',
              stringNum: sB,
              mppt,
              mensagem: `MPPT ${mppt}: String ${sB} com corrente nula (${measB.I.toFixed(2)} A), enquanto a String ${sA} gera ${measA.I.toFixed(2)} A.`,
              recomendacao: `Substituir fusível CC gPV da String ${sB} no Inversor ${cleanSN} e testar continuidade dos conectores.`,
            });
          } else if (measB.I > 2.0 && measA.I <= 0.5) {
            diagB = 'NORMAL';
            detalheB = `Geração ativa plena (${measB.I.toFixed(2)} A)`;
            diagA = 'FUSIVEL_QUEIMADO';
            detalheA = `String par gerando ${measB.I.toFixed(2)} A, mas esta está zerada (${measA.I.toFixed(2)} A). Fusível rompido.`;
            mpptStatus = 'ALERTA_FUSIVEL';
            totalNormais++;
            totalFusivelQueimado++;
            alertas.push({
              tipo: 'FUSIVEL_QUEIMADO',
              severidade: 'ALTA',
              stringNum: sA,
              mppt,
              mensagem: `MPPT ${mppt}: String ${sA} com corrente nula (${measA.I.toFixed(2)} A), enquanto a String ${sB} gera ${measB.I.toFixed(2)} A.`,
              recomendacao: `Substituir fusível CC gPV da String ${sA} no Inversor ${cleanSN} e testar continuidade dos conectores.`,
            });
          }
          // Caso 2: Ambas gerando, mas com desvio > 30% em sol pleno -> SUBPERFORMANCE
          else if (maxI >= 3.0 && deltaPct !== undefined && deltaPct > 30) {
            const isALower = measA.I < measB.I;
            const lowerStr = isALower ? sA : sB;
            const higherStr = isALower ? sB : sA;
            const lowerI = isALower ? measA.I : measB.I;
            const higherI = isALower ? measB.I : measA.I;

            if (isALower) {
              diagA = 'SUBPERFORMANCE';
              detalheA = `Corrente ${measA.I.toFixed(2)} A está ${deltaPct.toFixed(1)}% abaixo da String ${sB} (${measB.I.toFixed(2)} A).`;
              diagB = 'NORMAL';
              detalheB = `Geração de referência (${measB.I.toFixed(2)} A)`;
            } else {
              diagB = 'SUBPERFORMANCE';
              detalheB = `Corrente ${measB.I.toFixed(2)} A está ${deltaPct.toFixed(1)}% abaixo da String ${sA} (${measA.I.toFixed(2)} A).`;
              diagA = 'NORMAL';
              detalheA = `Geração de referência (${measA.I.toFixed(2)} A)`;
            }

            mpptStatus = 'ALERTA_DESBALANCEAMENTO';
            totalNormais++;
            totalSubperformance++;
            alertas.push({
              tipo: 'SUBPERFORMANCE',
              severidade: 'MEDIA',
              stringNum: lowerStr,
              mppt,
              mensagem: `MPPT ${mppt}: Desbalanceamento de ${deltaPct.toFixed(1)}% entre String ${lowerStr} (${lowerI.toFixed(2)} A) e String ${higherStr} (${higherI.toFixed(2)} A).`,
              recomendacao: `Verificar sujidade acumulada, sombreamento parcial ou diodos de bypass avariados na String ${lowerStr}.`,
            });
          }
          // Caso 3: Ambas com corrente equilibrada ou ambas em sol fraco
          else {
            diagA = 'NORMAL';
            diagB = 'NORMAL';
            detalheA = `Simetria normal de MPPT (${measA.I.toFixed(2)} A)`;
            detalheB = `Simetria normal de MPPT (${measB.I.toFixed(2)} A)`;
            totalNormais += 2;
            mpptStatus = 'OK';
          }
        }
      }

      mppts.push({
        mppt,
        deltaCorrentePct: deltaPct ? parseFloat(deltaPct.toFixed(1)) : undefined,
        statusGeral: mpptStatus,
        stringA: {
          stringNum: sA,
          correnteA: measA.I,
          tensaoV: measA.V > 0 ? measA.V : undefined,
          potenciaW: measA.I > 0 && measA.V > 0 ? parseFloat((measA.I * measA.V).toFixed(1)) : undefined,
          statusProjeto: statusA,
          diagnostico: diagA,
          detalhe: detalheA,
        },
        stringB: {
          stringNum: sB,
          correnteA: measB.I,
          tensaoV: measB.V > 0 ? measB.V : undefined,
          potenciaW: measB.I > 0 && measB.V > 0 ? parseFloat((measB.I * measB.V).toFixed(1)) : undefined,
          statusProjeto: statusB,
          diagnostico: diagB,
          detalhe: detalheB,
        },
      });
    }

    return {
      inversorSN: cleanSN,
      potenciaAtivaKW,
      mppts,
      totalStringsLigadas,
      totalStringsVazias,
      totalNormais,
      totalFusivelQueimado,
      totalSubperformance,
      alertas,
    };
  }

  /**
   * Diagnostica uma usina inteira a partir do registro de telemetria mais expressivo do dia.
   */
  public static diagnosePlant(
    usinaId: string,
    usinaNome: string,
    telemetriaRecord: {
      timestamp: Date | string;
      potenciaAtivaKW: number;
      irradiancia?: number | null;
      dadosStrings?: any;
      dadosInversores?: any;
    },
    inversoresCadastrados: Array<{ numeroSerie: string; nome?: string }> = []
  ): PlantDiagnosticSummary {
    const rawStrings = (telemetriaRecord.dadosStrings || {}) as Record<string, any>;
    const irrad = telemetriaRecord.irradiancia ?? undefined;

    // Detecta os números de série presentes nos inversores cadastrados ou na topologia da usina
    const plantTopology = StringTopologyService.getPlantTopology(usinaNome);
    const snList: string[] = [];

    if (inversoresCadastrados.length > 0) {
      for (const inv of inversoresCadastrados) {
        const clean = inv.numeroSerie.replace(/\s+/g, '').toUpperCase();
        if (!clean.startsWith('INV') && !snList.includes(clean)) {
          snList.push(clean);
        }
      }
    }

    if (plantTopology) {
      for (const inv of plantTopology.inversores) {
        const clean = inv.invSN.replace(/\s+/g, '').toUpperCase();
        if (!snList.includes(clean)) {
          snList.push(clean);
        }
      }
    }

    // Se ainda não encontrou, extrai chaves de dadosStrings
    if (snList.length === 0) {
      const keys = Object.keys(rawStrings);
      for (const k of keys) {
        const parts = k.split('_');
        if (parts.length >= 2 && !snList.includes(parts[0])) {
          snList.push(parts[0]);
        }
      }
    }

    const inverterResults: InverterDiagnosticResult[] = [];
    const alertasGerais: PlantDiagnosticSummary['alertasGerais'] = [];

    let totalStrings = 0;
    let totalLigadas = 0;
    let totalVazias = 0;
    let totalNormais = 0;
    let totalFusivelQueimado = 0;
    let totalSubperformance = 0;

    for (const sn of snList) {
      const res = this.diagnoseInverter(sn, rawStrings, undefined, irrad);
      inverterResults.push(res);

      totalStrings += res.mppts.length * 2;
      totalLigadas += res.totalStringsLigadas;
      totalVazias += res.totalStringsVazias;
      totalNormais += res.totalNormais;
      totalFusivelQueimado += res.totalFusivelQueimado;
      totalSubperformance += res.totalSubperformance;

      for (const a of res.alertas) {
        alertasGerais.push({
          usinaNome,
          inversorSN: sn,
          mppt: a.mppt,
          stringNum: a.stringNum,
          severidade: a.severidade,
          mensagem: a.mensagem,
          recomendacao: a.recomendacao,
        });
      }
    }

    const taxaSaudePct = totalLigadas > 0 ? (totalNormais / totalLigadas) * 100 : 100;

    return {
      usinaId,
      usinaNome,
      timestamp: new Date(telemetriaRecord.timestamp).toISOString(),
      condicaoSolarPlena: (irrad !== undefined && irrad >= 250) || telemetriaRecord.potenciaAtivaKW > 200,
      irradianciaWM2: irrad,
      inversores: inverterResults,
      kpis: {
        totalStrings,
        totalLigadas,
        totalVazias,
        totalNormais,
        totalFusivelQueimado,
        totalSubperformance,
        taxaSaudePct: parseFloat(taxaSaudePct.toFixed(1)),
      },
      alertasGerais,
    };
  }
}
