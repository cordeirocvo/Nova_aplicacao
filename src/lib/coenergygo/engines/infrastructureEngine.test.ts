import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sizeElectricalInfrastructure } from './infrastructureEngine';
import { ElectricalInfrastructureInput } from '../types';

describe('Electrical Infrastructure Sizing Engine — NBR 5410 & NBR 17019', () => {
  it('Deve calcular corretamente a corrente e disjuntor para carregador trifásico de 60 kW (380V)', () => {
    const input: ElectricalInfrastructureInput = {
      utility: 'CEMIG',
      chargerPowerKW: 60,
      chargerVoltage: 380,
      chargerPhases: 3,
      cableLengthMeters: 20,
      installationMethod: 'B1',
      ambientTemperatureC: 30,
      groupedCircuits: 1,
      existingPeakDemandKW: 0,
      gridStandardLimitKW: 75,
      currentStandardBreakerA: 200
    };

    const result = sizeElectricalInfrastructure(input);

    // Ib = 60000 / (sqrt(3) * 380 * 0.98) ≈ 93.0 A
    assert.ok(Math.abs(result.chargerDesignCurrentA - 93.0) <= 2.0, `Corrente Ib calculada (${result.chargerDesignCurrentA}A) deve estar próxima de 93A`);
    
    // Disjuntor recomendado deve ser >= 1.15 * Ib (>= 107A) -> Disjuntor padronizado 125A
    assert.ok(result.recommendedBreakerA >= 100, `Disjuntor (${result.recommendedBreakerA}A) deve ser adequado para o carregador de 60 kW`);
    
    // Bitola do cabo de fase deve atender a corrente e ter queda de tensão <= 4%
    assert.ok(result.cableGaugePhaseMM2 >= 25, `Bitola (${result.cableGaugePhaseMM2} mm²) deve ser de pelo menos 25 mm² ou 35 mm²`);
    assert.ok(result.calculatedVoltageDropPercent <= 4.0, `Queda de tensão (${result.calculatedVoltageDropPercent}%) deve ser <= 4%`);
  });

  it('Deve calcular corretamente a corrente e disjuntor para carregador monofásico de 7.4 kW (220V)', () => {
    const input: ElectricalInfrastructureInput = {
      utility: 'CEMIG',
      chargerPowerKW: 7.4,
      chargerVoltage: 220,
      chargerPhases: 1,
      cableLengthMeters: 15,
      installationMethod: 'B1',
      ambientTemperatureC: 30,
      groupedCircuits: 1,
      existingPeakDemandKW: 0,
      gridStandardLimitKW: 75,
      currentStandardBreakerA: 200
    };

    const result = sizeElectricalInfrastructure(input);

    // Ib = 7400 / (220 * 0.98) ≈ 34.3 A
    assert.ok(Math.abs(result.chargerDesignCurrentA - 34.3) <= 1.0, `Corrente Ib calculada (${result.chargerDesignCurrentA}A) deve estar próxima de 34.3A`);
    
    // Disjuntor padronizado deve ser 40A ou 50A
    assert.ok(result.recommendedBreakerA >= 40, `Disjuntor (${result.recommendedBreakerA}A) deve ser >= 40A`);
    
    // Bitola mínima do condutor de cobre NBR 5410
    assert.ok(result.cableGaugePhaseMM2 >= 6, `Bitola (${result.cableGaugePhaseMM2} mm²) deve ser de pelo menos 6 mm² ou 10 mm²`);
    assert.ok(result.calculatedVoltageDropPercent <= 2.0, `Queda de tensão (${result.calculatedVoltageDropPercent}%) deve ser <= 2%`);
  });

  it('Deve aplicar fator de correção de temperatura e manter conformidade de queda de tensão', () => {
    const inputPadrao: ElectricalInfrastructureInput = {
      chargerPowerKW: 22,
      chargerVoltage: 380,
      chargerPhases: 3,
      cableLengthMeters: 30,
      installationMethod: 'B1',
      ambientTemperatureC: 30,
      groupedCircuits: 1,
      existingPeakDemandKW: 0,
      gridStandardLimitKW: 75
    };

    const inputQuente: ElectricalInfrastructureInput = {
      ...inputPadrao,
      ambientTemperatureC: 40 // Fator de temperatura = 0.87
    };

    const resultPadrao = sizeElectricalInfrastructure(inputPadrao);
    const resultQuente = sizeElectricalInfrastructure(inputQuente);

    assert.ok(
      resultQuente.cableGaugePhaseMM2 >= resultPadrao.cableGaugePhaseMM2,
      'A bitola sob temperaturas elevadas deve ser igual ou superior à temperatura padrão'
    );
    assert.ok(resultQuente.isVoltageDropCompliant, 'Deve cumprir o critério de queda de tensão NBR 5410');
  });
});
