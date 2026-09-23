import { prisma } from "../prisma";

export interface InverterTelemetryPayload {
  inversorSn: string;
  modelo?: string;
  potenciaKW: number;
  energiaDiaKWh?: number;
  tempIGBT?: number;
  status?: string;
  tensaoCA_A?: number;
  tensaoCA_B?: number;
  tensaoCA_C?: number;
  correnteCA_A?: number;
  correnteCA_B?: number;
  correnteCA_C?: number;
  strings?: Record<string, { V: number; I: number }>;
}

export interface PlantTelemetryPayload {
  usinaId: string;
  timestamp: Date | string | number;
  potenciaAtivaKW?: number;
  energiaAcumuladaKWh?: number;
  irradiancia?: number;
  tempAmbiente?: number;
  tempModulos?: number;
  frequenciaRede?: number;
  tensaoCA_A?: number;
  tensaoCA_B?: number;
  tensaoCA_C?: number;
  correnteCA_A?: number;
  correnteCA_B?: number;
  correnteCA_C?: number;
  tempIGBT?: number;
  inversores?: InverterTelemetryPayload[];
  dadosStrings?: Record<string, { V: number; I: number }>;
  dadosInversores?: Record<string, { potenciaKW: number; energiaDiaKWh?: number; tempIGBT?: number; status?: string }>;
}

export class TelemetryIngestionService {
  /**
   * Alinha qualquer timestamp para o balde estrito de 5 minutos (ex: 13:22:15 -> 13:20:00)
   */
  static alignTo5MinBucket(dateInput: Date | string | number): Date {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const ms = d.getTime();
    if (isNaN(ms)) {
      return new Date();
    }
    const alignedMs = Math.floor(ms / (5 * 60 * 1000)) * (5 * 60 * 1000);
    return new Date(alignedMs);
  }

  /**
   * Ingere um ponto consolidado de telemetria de uma usina com suporte a múltiplos inversores.
   * Utiliza upsert atômico na chave composta [usinaId, timestamp].
   */
  static async ingestPlantTelemetry(payload: PlantTelemetryPayload) {
    const alignedTime = this.alignTo5MinBucket(payload.timestamp);
    const usinaId = payload.usinaId;

    let totalPotenciaCA = payload.potenciaAtivaKW ?? 0;
    let totalEnergiaKWh = payload.energiaAcumuladaKWh ?? 0;
    let totalPotenciaCC = 0;

    const stringsConsolidadas: Record<string, { V: number; I: number }> = {
      ...(payload.dadosStrings || {})
    };

    const inversoresConsolidados: Record<string, { potenciaKW: number; energiaDiaKWh?: number; tempIGBT?: number; status?: string }> = {
      ...(payload.dadosInversores || {})
    };

    let tensaoCA_A = payload.tensaoCA_A || 0;
    let tensaoCA_B = payload.tensaoCA_B || 0;
    let tensaoCA_C = payload.tensaoCA_C || 0;
    let correnteCA_A = payload.correnteCA_A || 0;
    let correnteCA_B = payload.correnteCA_B || 0;
    let correnteCA_C = payload.correnteCA_C || 0;
    let tempIGBT = payload.tempIGBT || 45;

    // Se vierem inversores individuais detalhados
    if (payload.inversores && payload.inversores.length > 0) {
      let sumPotCA = 0;
      let sumEnergia = 0;

      payload.inversores.forEach((inv, idx) => {
        const invSn = inv.inversorSn || `INV_${idx + 1}`;
        sumPotCA += inv.potenciaKW || 0;
        sumEnergia += inv.energiaDiaKWh || 0;

        inversoresConsolidados[invSn] = {
          potenciaKW: parseFloat((inv.potenciaKW || 0).toFixed(2)),
          energiaDiaKWh: parseFloat((inv.energiaDiaKWh || 0).toFixed(2)),
          tempIGBT: inv.tempIGBT || 45,
          status: inv.status || "ONLINE"
        };

        if (inv.strings) {
          Object.entries(inv.strings).forEach(([strKey, val]) => {
            const normalizedKey = strKey.startsWith(invSn) ? strKey : `${invSn}_${strKey}`;
            stringsConsolidadas[normalizedKey] = val;
            if (val.V > 0 && val.I > 0) {
              totalPotenciaCC += (val.V * val.I) / 1000;
            }
          });
        }

        if (idx === 0) {
          tensaoCA_A = inv.tensaoCA_A || 0;
          tensaoCA_B = inv.tensaoCA_B || 0;
          tensaoCA_C = inv.tensaoCA_C || 0;
          correnteCA_A = inv.correnteCA_A || 0;
          correnteCA_B = inv.correnteCA_B || 0;
          correnteCA_C = inv.correnteCA_C || 0;
          tempIGBT = inv.tempIGBT || 45;
        }
      });

      if (totalPotenciaCA <= 0 && sumPotCA > 0) {
        totalPotenciaCA = sumPotCA;
      }
      if (totalEnergiaKWh <= 0 && sumEnergia > 0) {
        totalEnergiaKWh = sumEnergia;
      }
    }

    // Se calculou CC através das strings consolidadas
    if (totalPotenciaCC <= 0 && Object.keys(stringsConsolidadas).length > 0) {
      Object.values(stringsConsolidadas).forEach(str => {
        if (str.V > 0 && str.I > 0) {
          totalPotenciaCC += (str.V * str.I) / 1000;
        }
      });
    }

    const upsertData = {
      potenciaAtivaKW: parseFloat(totalPotenciaCA.toFixed(2)),
      energiaAcumuladaKWh: parseFloat(totalEnergiaKWh.toFixed(2)),
      irradiancia: payload.irradiancia ?? null,
      tempAmbiente: payload.tempAmbiente ?? null,
      tempModulos: payload.tempModulos ?? null,
      frequenciaRede: payload.frequenciaRede ?? 60.0,
      tensaoCA_A: tensaoCA_A > 0 ? tensaoCA_A : undefined,
      tensaoCA_B: tensaoCA_B > 0 ? tensaoCA_B : undefined,
      tensaoCA_C: tensaoCA_C > 0 ? tensaoCA_C : undefined,
      correnteCA_A: correnteCA_A > 0 ? correnteCA_A : undefined,
      correnteCA_B: correnteCA_B > 0 ? correnteCA_B : undefined,
      correnteCA_C: correnteCA_C > 0 ? correnteCA_C : undefined,
      tempIGBT,
      dadosStrings: Object.keys(stringsConsolidadas).length > 0 ? stringsConsolidadas : undefined,
      dadosInversores: Object.keys(inversoresConsolidados).length > 0 ? inversoresConsolidados : undefined,
      potenciaCC_TotalKW: totalPotenciaCC > 0 ? parseFloat(totalPotenciaCC.toFixed(2)) : undefined,
      statusInversor: totalPotenciaCA > 0 ? "ONLINE" : "STANDBY",
    };

    return await prisma.telemetria.upsert({
      where: {
        usinaId_timestamp: {
          usinaId,
          timestamp: alignedTime
        }
      },
      update: upsertData,
      create: {
        usinaId,
        timestamp: alignedTime,
        ...upsertData
      }
    });
  }

  /**
   * Ingestão em lote resiliente (ideal para sincronização de histórico de 24h ou planilhas)
   */
  static async ingestBatch(items: PlantTelemetryPayload[]): Promise<number> {
    let successCount = 0;
    for (const item of items) {
      try {
        await this.ingestPlantTelemetry(item);
        successCount++;
      } catch (err) {
        console.warn(`[TELEMETRY INGESTION] Falha ao ingerir ponto em ${item.timestamp}:`, err);
      }
    }
    return successCount;
  }
}
