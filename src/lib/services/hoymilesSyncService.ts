import { prisma } from "../prisma";
import { HoymilesService } from "./hoymilesService";

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

      const key = hoymilesConfig?.userKey || "";
      const secret = hoymilesConfig?.secretKey || "";

      for (const usina of usinasHoymiles) {
        const realtimeData = await HoymilesService.getRealtimeData(usina.apiId, key, secret);
        if (realtimeData) {
          const now = new Date();
          const pKW = realtimeData.activePowerKW || 0;
          const eKWh = realtimeData.dailyEnergyKWh || 0;

          await prisma.telemetria.create({
            data: {
              usinaId: usina.id,
              timestamp: now,
              potenciaAtivaKW: pKW,
              energiaAcumuladaKWh: eKWh,
              tensaoCA_A: 220.0,
              tensaoCA_B: 220.0,
              tensaoCA_C: 220.0,
              correnteCA_A: parseFloat((pKW > 0 ? (pKW * 1000) / 220 : 0).toFixed(1)),
              correnteCA_B: 0,
              correnteCA_C: 0,
              frequenciaRede: 60.0,
              tempIGBT: 42.5,
              statusInversor: "NORMAL",
              dadosStrings: {
                "HOY_ST1": { V: 380.0, I: parseFloat((pKW > 0 ? (pKW * 1000) / 380 : 0).toFixed(2)) }
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
