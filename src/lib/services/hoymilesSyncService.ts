import { prisma } from "../prisma";
import { HoymilesService } from "./hoymilesService";
import { TelemetryIngestionService } from "./telemetryIngestionService";
import { CryptoService } from "../security/cryptoService";

export class HoymilesSyncService {
  static async syncAll() {
    console.log("[HOYMILES SYNC] Iniciando sincronização Hoymiles...");

    try {
      const hoymilesConfig = await prisma.manufacturerAPI.findUnique({
        where: { name: "HOYMILES" }
      }).catch(() => null);

      const usinasHoymiles = await prisma.usina.findMany({
        where: { apiFornecedor: "HOYMILES" }
      });

      if (usinasHoymiles.length === 0) {
        console.log("[HOYMILES SYNC] Nenhuma usina Hoymiles cadastrada para sincronização.");
        return;
      }

      const key = CryptoService.decrypt(hoymilesConfig?.userKey || "");
      const secret = CryptoService.decrypt(hoymilesConfig?.secretKey || "");

      for (const usina of usinasHoymiles) {
        const realtimeData = await HoymilesService.getRealtimeData(usina.apiId, key, secret);
        if (realtimeData) {
          const now = new Date();
          const pKW = realtimeData.activePowerKW || 0;
          const eKWh = realtimeData.dailyEnergyKWh || 0;

          await TelemetryIngestionService.ingestPlantTelemetry({
            usinaId: usina.id,
            timestamp: now,
            potenciaAtivaKW: pKW,
            energiaAcumuladaKWh: eKWh,
            tempAmbiente: realtimeData.temperature || undefined,
            dadosInversores: {
              [usina.apiId || "MI_01"]: {
                potenciaKW: pKW,
                energiaDiaKWh: eKWh,
                status: "ONLINE"
              }
            }
          });

          console.log(`[HOYMILES SYNC] Telemetria registrada para usina ${usina.nome}: ${pKW} kW, ${eKWh} kWh`);
        }
      }
    } catch (error) {
      console.error("[HOYMILES SYNC] Erro ao sincronizar:", error);
    }
  }
}
