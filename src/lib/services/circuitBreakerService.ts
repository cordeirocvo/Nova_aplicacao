export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface ProviderCircuit {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastErrorMessage?: string;
  totalCalls: number;
  totalFailures: number;
}

/**
 * CircuitBreakerService
 * Protege a aplicação contra travamentos em cascata e bloqueios de IP de fornecedores.
 * Caso um fornecedor (Huawei, Solis, Hoymiles) retorne 3 falhas consecutivas ou timeouts,
 * o circuito abre por 5 minutos antes de permitir uma sondagem (half-open).
 */
export class CircuitBreakerService {
  private static readonly MAX_FAILURES = 3;
  private static readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos (300.000 ms)

  private static circuits = new Map<string, ProviderCircuit>();

  private static getOrCreateCircuit(provider: string): ProviderCircuit {
    const key = provider.toUpperCase().trim();
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: "CLOSED",
        consecutiveFailures: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        totalCalls: 0,
        totalFailures: 0,
      });
    }
    return this.circuits.get(key)!;
  }

  /**
   * Verifica se uma chamada à API externa é permitida
   */
  static canExecute(provider: string): { allowed: boolean; reason?: string; waitTimeSeconds?: number } {
    const circuit = this.getOrCreateCircuit(provider);
    const now = Date.now();

    if (circuit.state === "CLOSED") {
      return { allowed: true };
    }

    if (circuit.state === "OPEN") {
      const elapsed = now - (circuit.lastFailureTime || 0);
      if (elapsed >= this.COOLDOWN_MS) {
        // Tempo de repouso concluído -> Transição para HALF_OPEN para testar 1 requisição
        circuit.state = "HALF_OPEN";
        console.log(`[CircuitBreaker] Provedor ${provider} entrou em estado HALF_OPEN (testando recuperação).`);
        return { allowed: true };
      }

      const remainingSec = Math.ceil((this.COOLDOWN_MS - elapsed) / 1000);
      return {
        allowed: false,
        reason: `Circuit Breaker ABERTO para ${provider} devido a ${circuit.consecutiveFailures} falhas consecutivas. Aguardando recuperação (${remainingSec}s restantes).`,
        waitTimeSeconds: remainingSec,
      };
    }

    if (circuit.state === "HALF_OPEN") {
      // Já está em teste de sondagem
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Registra sucesso na chamada externa
   */
  static recordSuccess(provider: string): void {
    const circuit = this.getOrCreateCircuit(provider);
    circuit.totalCalls++;
    circuit.lastSuccessTime = Date.now();

    if (circuit.state === "HALF_OPEN" || circuit.consecutiveFailures > 0) {
      console.log(`[CircuitBreaker] Provedor ${provider} recuperado com sucesso! Circuito FECHADO.`);
    }

    circuit.state = "CLOSED";
    circuit.consecutiveFailures = 0;
    circuit.lastErrorMessage = undefined;
  }

  /**
   * Registra falha ou timeout na chamada externa
   */
  static recordFailure(provider: string, error?: any): void {
    const circuit = this.getOrCreateCircuit(provider);
    circuit.totalCalls++;
    circuit.totalFailures++;
    circuit.consecutiveFailures++;
    circuit.lastFailureTime = Date.now();
    circuit.lastErrorMessage = error?.message || String(error);

    console.warn(
      `[CircuitBreaker] Falha registrada para ${provider} (${circuit.consecutiveFailures}/${this.MAX_FAILURES}):`,
      circuit.lastErrorMessage
    );

    if (circuit.consecutiveFailures >= this.MAX_FAILURES || circuit.state === "HALF_OPEN") {
      circuit.state = "OPEN";
      console.error(
        `[CircuitBreaker] ALERTA: Circuito ABERTO para ${provider}! Pausando chamadas automáticas por 5 minutos para evitar bloqueio de IP.`
      );
    }
  }

  /**
   * Retorna o estado atual de um provedor
   */
  static getStatus(provider: string) {
    const circuit = this.getOrCreateCircuit(provider);
    const now = Date.now();
    let waitTimeSeconds = 0;

    if (circuit.state === "OPEN" && circuit.lastFailureTime) {
      const elapsed = now - circuit.lastFailureTime;
      waitTimeSeconds = Math.max(0, Math.ceil((this.COOLDOWN_MS - elapsed) / 1000));
    }

    return {
      provider: provider.toUpperCase(),
      state: circuit.state,
      consecutiveFailures: circuit.consecutiveFailures,
      waitTimeSeconds,
      lastFailureTime: circuit.lastFailureTime ? new Date(circuit.lastFailureTime).toISOString() : null,
      lastSuccessTime: circuit.lastSuccessTime ? new Date(circuit.lastSuccessTime).toISOString() : null,
      lastErrorMessage: circuit.lastErrorMessage,
    };
  }

  /**
   * Retorna o status consolidado de todos os provedores monitorados
   */
  static getAllStatus(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of this.circuits.keys()) {
      result[key] = this.getStatus(key);
    }
    return result;
  }

  /**
   * Força o reset manual do circuito para CLOSED (ex: acionado por botão na interface)
   */
  static reset(provider: string): void {
    const circuit = this.getOrCreateCircuit(provider);
    circuit.state = "CLOSED";
    circuit.consecutiveFailures = 0;
    circuit.lastErrorMessage = undefined;
    console.log(`[CircuitBreaker] Circuito ${provider} resetado manualmente para CLOSED.`);
  }
}
