import { HuaweiSyncService } from "./huaweiSyncService";
import { SolisSyncService } from "./solisSyncService";

/**
 * Coordenador de Sincronização Solar Decoplado e Isolado
 * Executa as buscas de forma sequencial com tratamento de erro independente.
 * Isso garante que problemas ou latências em um fabricante (como Solis) 
 * nunca afetem ou travem o motor do outro fabricante (como Huawei).
 */
export class SolarSyncService {
  /**
   * Executa a sincronização de todas as usinas sequencialmente
   */
  static async syncAllPlants() {
    console.log(`[${new Date().toISOString()}] Iniciando sincronização solar isolada...`);
    
    // 1. Executa a sincronização da Huawei de forma isolada
    try {
      console.log(`[${new Date().toISOString()}] [COORDINATOR] Iniciando motor HUAWEI...`);
      await HuaweiSyncService.syncAll();
      console.log(`[${new Date().toISOString()}] [COORDINATOR] Motor HUAWEI concluído.`);
    } catch (e) {
      console.error(`[COORDINATOR] Erro crítico no motor HUAWEI:`, e);
    }

    // 2. Executa a sincronização da Solis de forma isolada
    try {
      console.log(`[${new Date().toISOString()}] [COORDINATOR] Iniciando motor SOLIS...`);
      await SolisSyncService.syncAll();
      console.log(`[${new Date().toISOString()}] [COORDINATOR] Motor SOLIS concluído.`);
    } catch (e) {
      console.error(`[COORDINATOR] Erro crítico no motor SOLIS:`, e);
    }
    
    console.log(`[${new Date().toISOString()}] Sincronização global concluída.`);
  }

  /**
   * Inicia o agendador automático (15 em 15 minutos)
   */
  static startScheduler() {
    const INTERVAL = 15 * 60 * 1000;
    console.log(`[${new Date().toISOString()}] Agendador Solar iniciado (Intervalo: 15min)`);
    
    // Execução imediata ao iniciar
    this.syncAllPlants();

    setInterval(() => {
      this.syncAllPlants();
    }, INTERVAL);
  }
}
