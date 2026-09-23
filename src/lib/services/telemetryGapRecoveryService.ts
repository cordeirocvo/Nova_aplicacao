import { prisma } from "../prisma";
import { TelemetryIngestionService } from "./telemetryIngestionService";
import { HuaweiIntegration } from "./huaweiIntegration";
import { CryptoService } from "../security/cryptoService";
import { CircuitBreakerService } from "./circuitBreakerService";

export interface TelemetryGap {
  start: Date;
  end: Date;
  startHoraStr: string;
  endHoraStr: string;
  durationMinutes: number;
}

export interface GapScanResult {
  usinaId: string;
  usinaNome: string;
  data: string;
  totalPontosEncontrados: number;
  pontosEsperados: number;
  coberturaPct: number;
  gaps: TelemetryGap[];
  precisaAutoCura: boolean;
}

export class TelemetryGapRecoveryService {
  /**
   * Converte data ISO ("YYYY-MM-DD") e hora ("HH:mm:ss") em Date no fuso de Brasília (UTC-3)
   */
  private static makeBrtDate(dateStr: string, timeStr: string): Date {
    return new Date(`${dateStr}T${timeStr}-03:00`);
  }

  /**
   * Identifica lacunas (gaps > 15 minutos) na telemetria entre 06:00 e 18:00 BRT
   */
  static async scanGaps(usinaId: string, dateStr: string): Promise<GapScanResult> {
    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      select: { id: true, nome: true, apiFornecedor: true, apiId: true, apiKey: true, apiSecret: true },
    });

    if (!usina) {
      throw new Error(`Usina não encontrada com o ID: ${usinaId}`);
    }

    const startWindow = this.makeBrtDate(dateStr, "06:00:00");
    const endWindow = this.makeBrtDate(dateStr, "18:00:00");

    // Limita janela até o horário atual se a data analisada for hoje
    const now = new Date();
    const effectiveEnd = now.getTime() < endWindow.getTime() && now.getTime() > startWindow.getTime()
      ? now
      : endWindow;

    const telemetrias = await prisma.telemetria.findMany({
      where: {
        usinaId,
        timestamp: {
          gte: startWindow,
          lte: effectiveEnd,
        },
      },
      orderBy: { timestamp: "asc" },
      select: { timestamp: true, potenciaAtivaKW: true },
    });

    const gaps: TelemetryGap[] = [];
    const expectedPointsCount = Math.max(
      1,
      Math.floor((effectiveEnd.getTime() - startWindow.getTime()) / (5 * 60 * 1000))
    );

    if (telemetrias.length === 0) {
      if (effectiveEnd.getTime() > startWindow.getTime()) {
        const durationMin = Math.round((effectiveEnd.getTime() - startWindow.getTime()) / 60000);
        if (durationMin >= 15) {
          gaps.push({
            start: startWindow,
            end: effectiveEnd,
            startHoraStr: "06:00",
            endHoraStr: effectiveEnd.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
            durationMinutes: durationMin,
          });
        }
      }
    } else {
      // 1. Verifica gap entre início da janela (06:00) e primeiro ponto
      const firstTimestamp = telemetrias[0].timestamp;
      const initialDiffMin = Math.round((firstTimestamp.getTime() - startWindow.getTime()) / 60000);
      if (initialDiffMin > 15) {
        gaps.push({
          start: startWindow,
          end: firstTimestamp,
          startHoraStr: "06:00",
          endHoraStr: firstTimestamp.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
          durationMinutes: initialDiffMin,
        });
      }

      // 2. Verifica gaps intermediários entre pontos consecutivos
      for (let i = 0; i < telemetrias.length - 1; i++) {
        const curr = telemetrias[i].timestamp;
        const next = telemetrias[i + 1].timestamp;
        const diffMinutes = Math.round((next.getTime() - curr.getTime()) / 60000);

        if (diffMinutes > 15) {
          gaps.push({
            start: curr,
            end: next,
            startHoraStr: curr.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
            endHoraStr: next.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
            durationMinutes: diffMinutes,
          });
        }
      }

      // 3. Verifica gap entre o último ponto e o fim da janela (se for dia anterior ou fim do horário comercial)
      const lastTimestamp = telemetrias[telemetrias.length - 1].timestamp;
      const finalDiffMin = Math.round((effectiveEnd.getTime() - lastTimestamp.getTime()) / 60000);
      if (finalDiffMin > 20) {
        gaps.push({
          start: lastTimestamp,
          end: effectiveEnd,
          startHoraStr: lastTimestamp.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
          endHoraStr: effectiveEnd.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
          durationMinutes: finalDiffMin,
        });
      }
    }

    const coberturaPct = parseFloat(
      Math.min(100, (telemetrias.length / expectedPointsCount) * 100).toFixed(1)
    );

    return {
      usinaId,
      usinaNome: usina.nome,
      data: dateStr,
      totalPontosEncontrados: telemetrias.length,
      pontosEsperados: expectedPointsCount,
      coberturaPct,
      gaps,
      precisaAutoCura: gaps.length > 0,
    };
  }

  /**
   * Executa a auto-cura de gaps: busca pontos faltantes nas nuvens dos fabricantes e ingere no banco
   */
  static async recoverGaps(usinaId: string, dateStr: string) {
    const scan = await this.scanGaps(usinaId, dateStr);
    if (!scan.precisaAutoCura || scan.gaps.length === 0) {
      return {
        success: true,
        mensagem: "Nenhum gap significativo detectado. Telemetria íntegra!",
        scan,
        pontosRecuperados: 0,
      };
    }

    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: { inversores: true },
    });

    if (!usina) throw new Error("Usina não encontrada");

    const provider = usina.apiFornecedor.toUpperCase();
    const circuit = CircuitBreakerService.canExecute(provider);
    if (!circuit.allowed) {
      return {
        success: false,
        error: circuit.reason,
        scan,
        pontosRecuperados: 0,
      };
    }

    let pontosCurados = 0;
    console.log(`[Auto-Cura] Iniciando recuperação de ${scan.gaps.length} gaps para ${usina.nome} (${dateStr})...`);

    try {
      // 1. Caso seja HUAWEI: buscar na API histórica diária da usina/inversores
      if (provider === "HUAWEI") {
        const rawUser = usina.apiKey || "";
        const rawPass = usina.apiSecret || "";
        const user = CryptoService.decrypt(rawUser);
        const pass = CryptoService.decrypt(rawPass);

        if (user && pass && user !== "default") {
          const session = await HuaweiIntegration.login(user, pass);
          if (session && session.token) {
            // Busca dados do dia inteiro para restaurar qualquer ponto intermediário
            const dateMs = this.makeBrtDate(dateStr, "12:00:00").getTime();
            const stationCode = usina.apiId.startsWith("NE=") ? usina.apiId : `NE=${usina.apiId}`;
            const stationData = await HuaweiIntegration.getPlantData(stationCode, session.token, session.cookie);

            if (stationData && stationData.length > 0) {
              for (const p of stationData) {
                const dataItem = p.dataItemMap || p;
                const activePower = dataItem.activePower !== undefined ? Number(dataItem.activePower) : undefined;
                const dayPower = dataItem.day_power !== undefined ? Number(dataItem.day_power) : undefined;
                if (activePower !== undefined) {
                  await TelemetryIngestionService.ingestPlantTelemetry({
                    usinaId: usina.id,
                    timestamp: p.collectTime || dateMs,
                    potenciaAtivaKW: activePower,
                    energiaAcumuladaKWh: dayPower,
                  });
                  pontosCurados++;
                }
              }
            }
          }
        }
      }

      // 2. Registrar na Trilha de Auditoria
      await prisma.auditoriaTelemetria.create({
        data: {
          usinaId,
          usuarioEmail: "AUTO_CURA_SISTEMA",
          tipoAcao: "BACKFILL_GAP",
          dataReferencia: dateStr,
          totalPontos: pontosCurados,
          detalhes: {
            gapsDetectados: scan.gaps.length,
            duracaoTotalGapsMinutos: scan.gaps.reduce((acc, g) => acc + g.durationMinutes, 0),
            provedor: provider,
          },
        },
      });

      CircuitBreakerService.recordSuccess(provider);

      // Reavalia o status após a auto-cura
      const posScan = await this.scanGaps(usinaId, dateStr);

      return {
        success: true,
        mensagem: `✓ Processo de auto-cura executado! ${pontosCurados} registros restaurados.`,
        scanAnterior: scan,
        scanAtual: posScan,
        pontosRecuperados: pontosCurados,
      };
    } catch (err: any) {
      CircuitBreakerService.recordFailure(provider, err);
      console.error("[Auto-Cura] Erro durante backfill de gaps:", err);
      return {
        success: false,
        error: err.message || "Erro durante execução de auto-cura de gaps.",
        scan,
        pontosRecuperados: 0,
      };
    }
  }

  /**
   * Executa varredura noturna em todas as usinas cadastradas para o dia anterior
   */
  static async runMidnightHealingForAllPlants() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateStr = yesterday.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

    console.log(`[Auto-Cura Noturna] Iniciando varredura para a data: ${dateStr}`);
    const usinas = await prisma.usina.findMany({ select: { id: true, nome: true } });

    const relatorio: any[] = [];
    for (const u of usinas) {
      try {
        const res = await this.recoverGaps(u.id, dateStr);
        relatorio.push({ usina: u.nome, ...res });
      } catch (e: any) {
        relatorio.push({ usina: u.nome, error: e.message });
      }
    }

    console.log(`[Auto-Cura Noturna] Varredura concluída para ${usinas.length} usinas.`);
    return relatorio;
  }
}
