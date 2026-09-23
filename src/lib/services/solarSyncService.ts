import { HuaweiSyncService } from "./huaweiSyncService";
import { SolisSyncService } from "./solisSyncService";
import { HoymilesSyncService } from "./hoymilesSyncService";
import { CircuitBreakerService } from "./circuitBreakerService";

/**
 * Coordenador de Sincronização Solar Decoplado e Isolado
 * Executa as buscas de forma sequencial com tratamento de erro independente e Circuit Breaker.
 * Isso garante que problemas ou latências em um fabricante (como Solis ou Hoymiles) 
 * nunca afetem ou travem o motor do outro fabricante (como Huawei).
 */
export class SolarSyncService {
  /**
   * Executa a sincronização de todas as usinas sequencialmente com proteção de Circuit Breaker
   */
  static async syncAllPlants() {
    console.log(`[${new Date().toISOString()}] Iniciando sincronização solar com Circuit Breaker...`);
    
    // 1. Executa a sincronização da Huawei com Circuit Breaker
    const hwCheck = CircuitBreakerService.canExecute("HUAWEI");
    if (!hwCheck.allowed) {
      console.warn(`[COORDINATOR] ${hwCheck.reason}`);
    } else {
      try {
        console.log(`[${new Date().toISOString()}] [COORDINATOR] Iniciando motor HUAWEI...`);
        await HuaweiSyncService.syncAll();
        CircuitBreakerService.recordSuccess("HUAWEI");
        console.log(`[${new Date().toISOString()}] [COORDINATOR] Motor HUAWEI concluído.`);
      } catch (e) {
        CircuitBreakerService.recordFailure("HUAWEI", e);
        console.error(`[COORDINATOR] Erro crítico no motor HUAWEI:`, e);
      }
    }

    // 2. Executa a sincronização da Solis com Circuit Breaker
    const solisCheck = CircuitBreakerService.canExecute("SOLIS");
    if (!solisCheck.allowed) {
      console.warn(`[COORDINATOR] ${solisCheck.reason}`);
    } else {
      try {
        console.log(`[${new Date().toISOString()}] [COORDINATOR] Iniciando motor SOLIS...`);
        await SolisSyncService.syncAll();
        CircuitBreakerService.recordSuccess("SOLIS");
        console.log(`[${new Date().toISOString()}] [COORDINATOR] Motor SOLIS concluído.`);
      } catch (e) {
        CircuitBreakerService.recordFailure("SOLIS", e);
        console.error(`[COORDINATOR] Erro crítico no motor SOLIS:`, e);
      }
    }

    // 3. Executa a sincronização da Hoymiles com Circuit Breaker
    const hoyCheck = CircuitBreakerService.canExecute("HOYMILES");
    if (!hoyCheck.allowed) {
      console.warn(`[COORDINATOR] ${hoyCheck.reason}`);
    } else {
      try {
        console.log(`[${new Date().toISOString()}] [COORDINATOR] Iniciando motor HOYMILES...`);
        await HoymilesSyncService.syncAll();
        CircuitBreakerService.recordSuccess("HOYMILES");
        console.log(`[${new Date().toISOString()}] [COORDINATOR] Motor HOYMILES concluído.`);
      } catch (e) {
        CircuitBreakerService.recordFailure("HOYMILES", e);
        console.error(`[COORDINATOR] Erro crítico no motor HOYMILES:`, e);
      }
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
