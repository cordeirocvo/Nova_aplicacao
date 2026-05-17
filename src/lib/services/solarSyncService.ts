import { HuaweiSyncService } from "./huaweiSyncService";
import { SolisSyncService } from "./solisSyncService";

/**
 * Coordenador de Sincronização Solar
 * Delega para serviços independentes por fabricante
 * Isso garante que ajustes em um fabricante não afetem o outro.
 */
export class SolarSyncService {
  /**
   * Executa a sincronização de todas as usinas delegando para serviços especializados
   */
  static async syncAllPlants() {
    console.log(`[${new Date().toISOString()}] Iniciando sincronização global delegada...`);
    
    try {
      // Executa as sincronizações em paralelo, mas com tratamento de erro independente
      await Promise.all([
        HuaweiSyncService.syncAll().catch(e => console.error("[COORDINATOR] Erro HuaweiSync:", e)),
        SolisSyncService.syncAll().catch(e => console.error("[COORDINATOR] Erro SolisSync:", e))
      ]);
      
      console.log(`[${new Date().toISOString()}] Sincronização global concluída.`);
    } catch (error) {
      console.error("[COORDINATOR] Erro crítico no coordenador SolarSyncService:", error);
    }
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
