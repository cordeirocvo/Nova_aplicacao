/**
 * CoenergyGO — Motor de Análise de Curva de Carga e Folga de Demanda (Headroom)
 * Cordeiro Energia
 * 
 * Executa:
 * 1. Mapeamento hora a hora da folga de potência (Headroom) da edificação
 * 2. Simulação de recarga descontrolada (Uncontrolled Charging)
 * 3. Identificação matemática de sobrecarga, risco de desarme do disjuntor e multas
 */

import { DLMConfiguration, HourlyLoadPoint } from '../types';
import { TypicalHourlyPoint } from '../database/typicalLoadProfiles';

export interface UncontrolledSimulationResult {
  hourlyPoints: HourlyLoadPoint[];
  peakBaseLoadKW: number;
  peakWithoutDLMKW: number;
  gridEffectiveLimitKW: number;
  isOverloadedWithoutDLM: boolean;
  maxOverloadWithoutDLMKW: number;
  overloadHoursCount: number;
  totalEnergyDeliveredUncontrolledKWh: number;
}

/**
 * Calcula a folga disponível e simula a inserção dos carregadores sem controle dinâmico.
 */
export function analyzeLoadAndUncontrolledCharging(
  baseCurve: TypicalHourlyPoint[],
  config: DLMConfiguration
): UncontrolledSimulationResult {
  const {
    gridLimitKW,
    safetyMarginPercent,
    chargerCount,
    chargerUnitPowerKW,
    chargeStartHour,
    chargeDurationHours
  } = config;

  // Limite efetivo da rede/padrão descontando a margem de segurança operacional (ex: 10%)
  const gridEffectiveLimitKW = Number((gridLimitKW * (1 - safetyMarginPercent)).toFixed(1));
  const rawEvLoadKW = Number((chargerCount * chargerUnitPowerKW).toFixed(1));

  let peakBaseLoadKW = 0;
  let peakWithoutDLMKW = 0;
  let maxOverloadWithoutDLMKW = 0;
  let overloadHoursCount = 0;
  let totalEnergyDeliveredUncontrolledKWh = 0;

  // Determinar quais horas do dia estão dentro do intervalo de recarga
  const isChargingHour = (h: number): boolean => {
    for (let d = 0; d < chargeDurationHours; d++) {
      if ((chargeStartHour + d) % 24 === h) {
        return true;
      }
    }
    return false;
  };

  const hourlyPoints: HourlyLoadPoint[] = baseCurve.map((point) => {
    const { hour, hourLabel, baseLoadKW, solarGenerationKW, netBuildingLoadKW } = point;

    if (netBuildingLoadKW > peakBaseLoadKW) {
      peakBaseLoadKW = netBuildingLoadKW;
    }

    // Folga disponível antes de inserir os veículos
    const headroomKW = Number(Math.max(0, gridEffectiveLimitKW - netBuildingLoadKW).toFixed(1));

    // Carga VE sem controle (conecta à potência nominal no horário agendado)
    const inChargingWindow = isChargingHour(hour);
    const evLoadUncontrolledKW = inChargingWindow ? rawEvLoadKW : 0;
    const totalUncontrolledKW = Number((netBuildingLoadKW + evLoadUncontrolledKW).toFixed(1));

    if (totalUncontrolledKW > peakWithoutDLMKW) {
      peakWithoutDLMKW = totalUncontrolledKW;
    }

    const isOverloadedWithoutDLM = totalUncontrolledKW > gridEffectiveLimitKW;
    const overloadAmountKW = isOverloadedWithoutDLM 
      ? Number((totalUncontrolledKW - gridEffectiveLimitKW).toFixed(1)) 
      : 0;

    if (isOverloadedWithoutDLM) {
      overloadHoursCount++;
      if (overloadAmountKW > maxOverloadWithoutDLMKW) {
        maxOverloadWithoutDLMKW = overloadAmountKW;
      }
    }

    totalEnergyDeliveredUncontrolledKWh += evLoadUncontrolledKW;

    return {
      hour,
      hourLabel,
      baseLoadKW,
      solarGenerationKW,
      netBuildingLoadKW,
      gridLimitKW: gridEffectiveLimitKW,
      headroomKW,
      evLoadUncontrolledKW,
      totalUncontrolledKW,
      isOverloadedWithoutDLM,
      overloadAmountKW,
      
      // Placeholders que serão preenchidos pelo motor DLM
      evLoadControlledKW: 0,
      totalControlledKW: netBuildingLoadKW,
      isOverloadedWithDLM: false,
      perChargerCurrentA: 0,
      isThrottled: false
    };
  });

  return {
    hourlyPoints,
    peakBaseLoadKW: Number(peakBaseLoadKW.toFixed(1)),
    peakWithoutDLMKW: Number(peakWithoutDLMKW.toFixed(1)),
    gridEffectiveLimitKW,
    isOverloadedWithoutDLM: maxOverloadWithoutDLMKW > 0,
    maxOverloadWithoutDLMKW,
    overloadHoursCount,
    totalEnergyDeliveredUncontrolledKWh: Number(totalEnergyDeliveredUncontrolledKWh.toFixed(1))
  };
}
