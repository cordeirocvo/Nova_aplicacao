/**
 * CoenergyGO — Motor de Gestão Dinâmica de Carga (DLM / Smart Charging)
 * Cordeiro Energia
 * 
 * Implementação Eletrotécnica em Malha Fechada conforme IEC 61851-1 / OCPP 2.0.1:
 * 1. Modulação Dinâmica de Corrente entre 6A (mínimo normativo) e 32A (nominal)
 * 2. Prevenção absoluta de sobrecarga e desarme térmico do disjuntor geral
 * 3. Maximização do aproveitamento da folga noturna e do excedente solar fotovoltaico
 * 4. Estimativa de economia de CAPEX ao viabilizar múltiplos SAVE no padrão existente
 */

import { DLMConfiguration, DLMSimulationResult, HourlyLoadPoint } from '../types';
import { TypicalHourlyPoint } from '../database/typicalLoadProfiles';
import { analyzeLoadAndUncontrolledCharging } from './loadCurveEngine';

/**
 * Executa a simulação completa de Curva de Carga comparando operação SEM DLM vs COM DLM.
 */
export function simulateDLM(
  baseCurve: TypicalHourlyPoint[],
  config: DLMConfiguration
): DLMSimulationResult {
  const uncontrolled = analyzeLoadAndUncontrolledCharging(baseCurve, config);
  const {
    gridLimitKW,
    safetyMarginPercent,
    voltage,
    phases,
    chargerCount,
    chargerUnitPowerKW,
    chargeStartHour,
    chargeDurationHours,
    enableDLM,
    enableSolarSurplus
  } = config;

  const gridEffectiveLimitKW = uncontrolled.gridEffectiveLimitKW;
  const cosPhi = 0.98;

  // Corrente nominal de 1 carregador
  const maxCurrentA = phases === 3 
    ? (chargerUnitPowerKW * 1000) / (Math.sqrt(3) * voltage * cosPhi)
    : (chargerUnitPowerKW * 1000) / (voltage * cosPhi);

  // Potência consumida por 1 carregador na corrente mínima normativa de 6A (IEC 61851-1)
  const minCurrentA = 6.0;
  const minPowerPerChargerKW = phases === 3
    ? (Math.sqrt(3) * voltage * minCurrentA * cosPhi) / 1000
    : (voltage * minCurrentA * cosPhi) / 1000;
  const minTotalChargersKW = minPowerPerChargerKW * chargerCount;

  let totalEnergyDeliveredControlledKWh = 0;
  let peakWithDLMKW = 0;
  let isOverloadedWithDLM = false;
  let sumModulatedCurrentA = 0;
  let countChargingHours = 0;
  let minModulatedCurrentObservedA = maxCurrentA;
  let solarEnergyUsedKWh = 0;

  const isChargingHour = (h: number): boolean => {
    for (let d = 0; d < chargeDurationHours; d++) {
      if ((chargeStartHour + d) % 24 === h) return true;
    }
    return false;
  };

  const hourlyPoints: HourlyLoadPoint[] = uncontrolled.hourlyPoints.map((point) => {
    const { hour, netBuildingLoadKW, solarGenerationKW, evLoadUncontrolledKW } = point;
    const inChargingWindow = isChargingHour(hour);

    let evLoadControlledKW = 0;
    let perChargerCurrentA = 0;
    let isThrottled = false;

    if (!inChargingWindow) {
      return {
        ...point,
        evLoadControlledKW: 0,
        totalControlledKW: netBuildingLoadKW,
        isOverloadedWithDLM: netBuildingLoadKW > gridEffectiveLimitKW,
        perChargerCurrentA: 0,
        isThrottled: false
      };
    }

    countChargingHours++;

    if (!enableDLM) {
      // Se DLM desativado, o comportamento controlado é idêntico ao descontrolado
      evLoadControlledKW = evLoadUncontrolledKW;
      perChargerCurrentA = Number(maxCurrentA.toFixed(1));
    } else {
      // DLM ATIVADO: Calcula a potência máxima que os carros podem puxar sem estourar o padrão
      const availablePowerKW = Math.max(0, gridEffectiveLimitKW - netBuildingLoadKW);

      if (availablePowerKW >= evLoadUncontrolledKW) {
        // Há folga plena: todos os veículos carregam na potência máxima
        evLoadControlledKW = evLoadUncontrolledKW;
        perChargerCurrentA = Number(maxCurrentA.toFixed(1));
      } else if (availablePowerKW >= minTotalChargersKW) {
        // Folga intermediária: modula a corrente de todos proporcionalmente (entre 6A e maxCurrentA)
        evLoadControlledKW = Number(availablePowerKW.toFixed(1));
        const powerPerCharger = availablePowerKW / chargerCount;
        perChargerCurrentA = phases === 3
          ? (powerPerCharger * 1000) / (Math.sqrt(3) * voltage * cosPhi)
          : (powerPerCharger * 1000) / (voltage * cosPhi);
        isThrottled = true;
      } else {
        // Folga crítica: nem todos conseguem carregar a 6A simultaneamente.
        // O algoritmo mantém a potência no limite de segurança permitindo rotatividade
        evLoadControlledKW = Number(availablePowerKW.toFixed(1));
        perChargerCurrentA = minCurrentA;
        isThrottled = true;
      }
    }

    const totalControlledKW = Number((netBuildingLoadKW + evLoadControlledKW).toFixed(1));
    if (totalControlledKW > peakWithDLMKW) {
      peakWithDLMKW = totalControlledKW;
    }

    const overloaded = totalControlledKW > gridEffectiveLimitKW;
    if (overloaded) {
      isOverloadedWithDLM = true;
    }

    totalEnergyDeliveredControlledKWh += evLoadControlledKW;
    sumModulatedCurrentA += perChargerCurrentA;
    if (perChargerCurrentA < minModulatedCurrentObservedA && perChargerCurrentA > 0) {
      minModulatedCurrentObservedA = perChargerCurrentA;
    }

    // Calcular energia solar aproveitada diretamente pelos carregadores
    if (enableSolarSurplus && solarGenerationKW > 0) {
      const solarSurplusAvailable = Math.max(0, solarGenerationKW - point.baseLoadKW);
      solarEnergyUsedKWh += Math.min(solarSurplusAvailable, evLoadControlledKW);
    }

    return {
      ...point,
      evLoadControlledKW,
      totalControlledKW,
      isOverloadedWithDLM: overloaded,
      perChargerCurrentA: Number(perChargerCurrentA.toFixed(1)),
      isThrottled
    };
  });

  const averageModulatedCurrentA = countChargingHours > 0
    ? Number((sumModulatedCurrentA / countChargingHours).toFixed(1))
    : Number(maxCurrentA.toFixed(1));

  const energyDeliveryEfficiencyPercent = uncontrolled.totalEnergyDeliveredUncontrolledKWh > 0
    ? Number(((totalEnergyDeliveredControlledKWh / uncontrolled.totalEnergyDeliveredUncontrolledKWh) * 100).toFixed(1))
    : 100;

  // ─── AVALIAÇÃO DE STATUS E PARECER TÉCNICO ──────────────────────────────────

  let status: DLMSimulationResult['status'] = 'approved_without_dlm';
  let statusLabel = 'Viável Sem Restrições (Padrão Existente Suporta Plenamente)';
  let statusColor: DLMSimulationResult['statusColor'] = 'green';
  let capexSavingsEstimateBRL = 0;
  const recommendations: string[] = [];

  if (!uncontrolled.isOverloadedWithoutDLM) {
    status = 'approved_without_dlm';
    statusLabel = 'Viabilidade Plena: Padrão suporta os carregadores mesmo sem modulação DLM.';
    statusColor = 'green';
    recommendations.push('A folga da edificação comporta a carga total nominal dos carregadores sem risco de sobrecarga.');
    recommendations.push('O DLM ainda pode ser instalado para contingência futura e gestão de tarifas horárias.');
  } else if (enableDLM && !isOverloadedWithDLM && (energyDeliveryEfficiencyPercent >= 30 || averageModulatedCurrentA >= 6.0)) {
    status = 'approved_with_dlm';
    statusLabel = 'Viável com DLM (Gestão Dinâmica de Carga Elimina a Sobrecarga)';
    statusColor = 'yellow';
    
    // Estimativa de economia de CAPEX: troca de transformador / cabine primária custa R$ 120k a R$ 250k
    capexSavingsEstimateBRL = chargerCount >= 4 ? 160000 : 45000;

    recommendations.push(`Sem DLM, a edificação ultrapassaria o limite do padrão em até ${uncontrolled.maxOverloadWithoutDLMKW} kW por ${uncontrolled.overloadHoursCount} horas.`);
    recommendations.push(`Com o DLM ativo, a corrente é modulada de forma segura (média de ${averageModulatedCurrentA}A), entregando ${energyDeliveryEfficiencyPercent}% da energia nominal sem desarmar o disjuntor.`);
    if (energyDeliveryEfficiencyPercent < 70) {
      recommendations.push('Como a folga no horário de pico é estreita, o tempo total de recarga será prolongado até as horas de madrugada, quando a folga se expande.');
    }
    recommendations.push(`Economia estimada de aproximadamente R$ ${capexSavingsEstimateBRL.toLocaleString('pt-BR')} ao evitar aumento de padrão ou subestação particular.`);
  } else {
    status = 'requires_infrastructure_upgrade';
    statusLabel = 'Inviável no Padrão Atual (Exige Aumento de Carga ou Subestação MT)';
    statusColor = 'red';
    recommendations.push('A demanda da edificação já atinge o limite do padrão nos horários de pico, não havendo margem suficiente mesmo com DLM reduzido ao mínimo de 6A.');
    recommendations.push('Recomenda-se solicitar aumento de demanda à concessionária ou instalar subestação dedicada de Média Tensão para os carregadores.');
  }

  return {
    hourlyPoints,
    peakBaseLoadKW: uncontrolled.peakBaseLoadKW,
    peakWithoutDLMKW: uncontrolled.peakWithoutDLMKW,
    peakWithDLMKW: Number(peakWithDLMKW.toFixed(1)),
    gridEffectiveLimitKW,
    isOverloadedWithoutDLM: uncontrolled.isOverloadedWithoutDLM,
    maxOverloadWithoutDLMKW: uncontrolled.maxOverloadWithoutDLMKW,
    overloadHoursCount: uncontrolled.overloadHoursCount,
    isOverloadedWithDLM,
    totalEnergyDeliveredUncontrolledKWh: uncontrolled.totalEnergyDeliveredUncontrolledKWh,
    totalEnergyDeliveredControlledKWh: Number(totalEnergyDeliveredControlledKWh.toFixed(1)),
    averageModulatedCurrentA,
    minModulatedCurrentA: Number(minModulatedCurrentObservedA.toFixed(1)),
    energyDeliveryEfficiencyPercent,
    solarEnergyUsedKWh: Number(solarEnergyUsedKWh.toFixed(1)),
    status,
    statusLabel,
    statusColor,
    capexSavingsEstimateBRL,
    recommendations
  };
}
