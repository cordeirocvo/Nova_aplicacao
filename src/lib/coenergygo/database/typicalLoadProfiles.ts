/**
 * CoenergyGO — Banco de Perfis de Curva de Carga 24h e Geração Solar Típica
 * Cordeiro Energia
 * 
 * Fornece modelos calibrados para análise de folga e dimensionamento de SAVE:
 * 1. Condomínio Residencial: Pico noturno das 18h às 22h, vale na madrugada.
 * 2. Edifício Comercial: Pico diurno contínuo das 09h às 17h, vale noturno.
 * 3. Centro Comercial / Shopping: Pico estendido das 14h às 21h.
 * 4. Geração Solar Fotovoltaica: Curva de sino solar das 06h às 18h com pico às 12h.
 */

import { TypicalProfileType } from '../types';

export interface TypicalHourlyPoint {
  hour: number;
  hourLabel: string;
  baseLoadKW: number;
  solarGenerationKW: number;
  netBuildingLoadKW: number;
}

// ─── PERFIS NORMALIZADOS (0.0 A 1.0 DO PICO) ─────────────────────────────────

export const TYPICAL_PROFILES_NORMALIZED: Record<TypicalProfileType, number[]> = {
  // Condomínio Residencial: Pico acentuado 19h-21h
  condominio_residencial: [
    0.28, 0.24, 0.22, 0.21, 0.22, 0.28, // 00h - 05h
    0.42, 0.58, 0.50, 0.38, 0.35, 0.38, // 06h - 11h
    0.44, 0.42, 0.40, 0.42, 0.52, 0.70, // 12h - 17h
    0.88, 1.00, 0.96, 0.85, 0.60, 0.40  // 18h - 23h
  ],

  // Edifício Comercial: Pico comercial diurno 09h-17h
  edificio_comercial: [
    0.15, 0.14, 0.14, 0.14, 0.15, 0.20, // 00h - 05h
    0.35, 0.65, 0.88, 0.98, 1.00, 0.95, // 06h - 11h
    0.82, 0.88, 0.96, 0.95, 0.92, 0.75, // 12h - 17h
    0.50, 0.35, 0.26, 0.20, 0.18, 0.16  // 18h - 23h
  ],

  // Centro Comercial / Varejo
  centro_comercial: [
    0.20, 0.18, 0.18, 0.18, 0.18, 0.20, // 00h - 05h
    0.25, 0.35, 0.50, 0.70, 0.80, 0.85, // 06h - 11h
    0.88, 0.85, 0.92, 0.96, 0.98, 1.00, // 12h - 17h
    0.98, 0.95, 0.85, 0.65, 0.40, 0.25  // 18h - 23h
  ],

  // Indústria / Turnos contínuos
  industrial: [
    0.60, 0.58, 0.58, 0.60, 0.75, 0.90, // 00h - 05h
    0.95, 1.00, 0.98, 0.95, 0.95, 0.90, // 06h - 11h
    0.85, 0.95, 0.98, 0.96, 0.92, 0.85, // 12h - 17h
    0.80, 0.75, 0.70, 0.68, 0.65, 0.62  // 18h - 23h
  ]
};

// Curva de Geração Solar Fotovoltaica Típica (0.0 a 1.0 do pico kWp)
export const SOLAR_GENERATION_NORMALIZED: number[] = [
  0.00, 0.00, 0.00, 0.00, 0.00, 0.00, // 00h - 05h
  0.04, 0.18, 0.42, 0.68, 0.88, 0.98, // 06h - 11h
  1.00, 0.96, 0.85, 0.65, 0.38, 0.12, // 12h - 17h
  0.01, 0.00, 0.00, 0.00, 0.00, 0.00  // 18h - 23h
];

/**
 * Gera os 24 pontos horários escalados para a demanda de pico e potência solar desejada.
 */
export function generateScaledHourlyCurve(
  profileType: TypicalProfileType,
  peakDemandKW: number,
  solarPeakKW: number = 0
): TypicalHourlyPoint[] {
  const normLoad = TYPICAL_PROFILES_NORMALIZED[profileType] || TYPICAL_PROFILES_NORMALIZED.condominio_residencial;
  const result: TypicalHourlyPoint[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourLabel = `${String(hour).padStart(2, '0')}:00`;
    const baseLoadKW = Number((normLoad[hour] * peakDemandKW).toFixed(1));
    const solarGenerationKW = Number((SOLAR_GENERATION_NORMALIZED[hour] * solarPeakKW).toFixed(1));
    const netBuildingLoadKW = Number(Math.max(0, baseLoadKW - solarGenerationKW).toFixed(1));

    result.push({
      hour,
      hourLabel,
      baseLoadKW,
      solarGenerationKW,
      netBuildingLoadKW
    });
  }

  return result;
}
