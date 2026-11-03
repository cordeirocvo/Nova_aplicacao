import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDesignCurrentA,
  selectRecommendedBreakerA,
  calculateVoltageDropPercent,
  sizeCableSegment
} from './cableSizingService';

describe('Core Domain Cable Sizing Service — NBR 5410', () => {
  it('Deve calcular a corrente Ib trifásica de 60 kW em 380V corretamente (~93A)', () => {
    const currentA = calculateDesignCurrentA(60, 380, 3, 0.98);
    assert.ok(Math.abs(currentA - 93.0) <= 1.0, `Ib (${currentA}A) deve estar próximo de 93.0A`);
  });

  it('Deve calcular a corrente Ib monofásica de 7.4 kW em 220V corretamente (~34.3A)', () => {
    const currentA = calculateDesignCurrentA(7.4, 220, 1, 0.98);
    assert.ok(Math.abs(currentA - 34.3) <= 0.5, `Ib (${currentA}A) deve estar próximo de 34.3A`);
  });

  it('Deve selecionar o disjuntor de proteção com margem >= 1.15', () => {
    const breakerA = selectRecommendedBreakerA(93.0);
    assert.strictEqual(breakerA, 125, 'Para 93A * 1.15 = 106.9A, o disjuntor padronizado comercial deve ser 125A');
  });

  it('Deve dimensionar o trecho de cabo respeitando o limite de queda de tensão de 4%', () => {
    const result = sizeCableSegment({
      powerKW: 60,
      voltageV: 380,
      phases: 3,
      distanceMeters: 40,
      maxVoltageDropPercent: 4.0
    });

    assert.ok(result.isCompliant, 'O trecho dimensionado deve estar em conformidade');
    assert.ok(result.voltageDropPercent <= 4.0, `Queda de tensão (${result.voltageDropPercent}%) deve ser <= 4%`);
    assert.ok(result.recommendedGaugeMM2 >= 25, `Bitola (${result.recommendedGaugeMM2} mm²) deve ser condizente com a corrente e distância`);
  });
});
