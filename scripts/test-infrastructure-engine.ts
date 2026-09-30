/**
 * ============================================================================
 * COENERGYGO - PASSO 3: TEST SUITE AUTOMATIZADA
 * Ingestão de Dados SmartMeter (.xlsx / .csv) & Motor de Infraestrutura Eletrotécnica
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import {
  parseUniversalLoadFile,
  parseLoadExcelBuffer,
  sizeElectricalInfrastructure,
  ElectricalInfrastructureInput,
} from '../src/lib/coenergygo';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detalhes: ${detail}`);
  }
}

console.log('\n======================================================');
console.log('⚡ INICIANDO SUÍTE DE TESTES: COENERGYGO PASSO 3');
console.log('======================================================\n');

// ----------------------------------------------------------------------------
// TESTE 1: LEITURA E PARSING DO ARQUIVO REAL SmartMeter.xlsx
// ----------------------------------------------------------------------------
console.log('📌 GRUPO 1: Leitura Nativa do Arquivo SmartMeter.xlsx');

const excelPath = 'C:/Users/BRUNO CORDEIRO/Downloads/SmartMeter.xlsx';
const fileExists = fs.existsSync(excelPath);
assert(fileExists, 'Arquivo SmartMeter.xlsx encontrado na pasta Downloads');

if (fileExists) {
  const fileBuffer = fs.readFileSync(excelPath);
  const { summary, parsedResult } = parseUniversalLoadFile(fileBuffer, 'SmartMeter.xlsx');

  assert(summary.fileName === 'SmartMeter.xlsx', 'Nome do arquivo preservado');
  assert(summary.fileType === 'xlsx', 'Tipo de arquivo identificado como XLSX');
  assert(summary.totalReadings === 136, `Total de 136 leituras no período (Lido: ${summary.totalReadings})`);
  assert(summary.intervalMinutes === 5, `Intervalo de amostragem detectado como 5 minutos (Lido: ${summary.intervalMinutes} min)`);
  
  assert(
    Math.abs(summary.maxPowerKW - 6.442) < 0.01,
    `Pico de potência máxima medido com precisão: ${summary.maxPowerKW} kW (Esperado: 6.442 kW)`
  );
  assert(
    summary.peakTimestamp.includes('14:35'),
    `Horário do pico registrado às 14:35: ${summary.peakTimestamp}`
  );
  assert(
    Math.abs(summary.minPowerKW - 0.194) < 0.01,
    `Potência mínima do período lida corretamente: ${summary.minPowerKW} kW (Esperado: 0.194 kW)`
  );
  assert(
    summary.averagePowerKW >= 1.5 && summary.averagePowerKW <= 1.65,
    `Demanda média do período calculada: ${summary.averagePowerKW} kW (Esperado: ~1.58 kW)`
  );
  assert(
    summary.totalEnergyKWh >= 17 && summary.totalEnergyKWh <= 19,
    `Energia total integrada no período: ${summary.totalEnergyKWh} kWh`
  );
  assert(
    summary.intervalPoints.length === 136,
    'Todos os 136 pontos em alta resolução preservados para plotagem gráfica'
  );
  assert(
    parsedResult.hourlyCurve24h.length === 24,
    'Curva de 24 horas sintetizada para integração com o motor DLM'
  );
}

// ----------------------------------------------------------------------------
// TESTE 2: DIMENSIONAMENTO DE INFRAESTRUTURA - WALLBOX 7.4 kW (MONOFÁSICO 220V)
// ----------------------------------------------------------------------------
console.log('\n📌 GRUPO 2: Infraestrutura Eletrotécnica - Wallbox 7.4 kW (220V Monofásico/Bifásico)');

const input74: ElectricalInfrastructureInput = {
  chargerPowerKW: 7.4,
  chargerVoltage: 220,
  chargerPhases: 1,
  cableLengthMeters: 25,
  installationMethod: 'B1',
  ambientTemperatureC: 30,
  groupedCircuits: 1,
  existingPeakDemandKW: 6.442, // Demanda de pico do SmartMeter
  gridStandardLimitKW: 75,     // Padrão CEMIG T6
  isOutdoor: false
};

const sizing74 = sizeElectricalInfrastructure(input74);

assert(
  sizing74.chargerDesignCurrentA >= 34.0 && sizing74.chargerDesignCurrentA <= 34.5,
  `Corrente de projeto calculada corretamente: ${sizing74.chargerDesignCurrentA}A`
);
assert(
  sizing74.recommendedBreakerA === 40,
  `Disjuntor termomagnético recomendado: ${sizing74.recommendedBreakerA}A (Curva C, Fs=1.0)`
);
assert(
  sizing74.cableGaugePhaseMM2 >= 6.0,
  `Bitola do condutor de fase: ${sizing74.cableGaugePhaseMM2} mm²`
);
assert(
  sizing74.cableGaugeGroundMM2 === sizing74.cableGaugePhaseMM2,
  `Condutor de proteção (PE) dimensionado conforme NBR 5410 Tabela 58: ${sizing74.cableGaugeGroundMM2} mm²`
);
assert(
  sizing74.calculatedVoltageDropPercent <= 2.0,
  `Queda de tensão calculada dentro do limite estrito da NBR 17019: ${sizing74.calculatedVoltageDropPercent}% (<= 2.0%)`
);
assert(
  sizing74.isVoltageDropCompliant === true,
  'Status de conformidade da queda de tensão aprovado'
);
assert(
  sizing74.residualCurrentProtection.type.includes('Tipo B'),
  'DR Tipo B ou Tipo A com RDC-DD 6mA especificado compulsoriamente'
);
assert(
  sizing74.surgeProtectionDPS.type.includes('Classe II'),
  'DPS Classe II especificado'
);
assert(
  Math.abs(sizing74.totalSimultaneousDemandKW - 13.84) < 0.05,
  `Balanço de carga somando SmartMeter (6.44 kW) + Carregador (7.4 kW): ${sizing74.totalSimultaneousDemandKW} kW`
);
assert(
  sizing74.isGridLimitExceeded === false,
  `Padrão de 75 kW comporta a demanda simultânea sem sobrecarga (Folga restante: ${sizing74.gridHeadroomKW} kW)`
);

// ----------------------------------------------------------------------------
// TESTE 3: DIMENSIONAMENTO DE INFRAESTRUTURA - WALLBOX 11 kW (TRIFÁSICO 380V)
// ----------------------------------------------------------------------------
console.log('\n📌 GRUPO 3: Infraestrutura Eletrotécnica - Wallbox 11 kW (380V Trifásico)');

const input11: ElectricalInfrastructureInput = {
  chargerPowerKW: 11.0,
  chargerVoltage: 380,
  chargerPhases: 3,
  cableLengthMeters: 30,
  installationMethod: 'B1',
  ambientTemperatureC: 30,
  groupedCircuits: 1,
  existingPeakDemandKW: 6.442,
  gridStandardLimitKW: 75,
  isOutdoor: true
};

const sizing11 = sizeElectricalInfrastructure(input11);

assert(
  sizing11.chargerDesignCurrentA >= 17.0 && sizing11.chargerDesignCurrentA <= 17.5,
  `Corrente de projeto trifásica calculada: ${sizing11.chargerDesignCurrentA}A`
);
assert(
  sizing11.recommendedBreakerA === 20 || sizing11.recommendedBreakerA === 25,
  `Disjuntor tripolar recomendado: ${sizing11.recommendedBreakerA}A`
);
assert(
  sizing11.calculatedVoltageDropPercent <= 2.0,
  `Queda de tensão trifásica em conformidade: ${sizing11.calculatedVoltageDropPercent}% (<= 2.0%)`
);
assert(
  sizing11.panelSpecification.ipRating === 'IP65',
  `Quadro externo especificado com grau de proteção IP65 contra intempéries`
);

// ----------------------------------------------------------------------------
// TESTE 4: CRITÉRIO DA MÁXIMA QUEDA DE TENSÃO COM GRANDE DISTÂNCIA (100m)
// ----------------------------------------------------------------------------
console.log('\n📌 GRUPO 4: Auto-Dimensionamento por Queda de Tensão em Longa Distância');

const inputLongDistance: ElectricalInfrastructureInput = {
  chargerPowerKW: 7.4,
  chargerVoltage: 220,
  chargerPhases: 1,
  cableLengthMeters: 80, // 80 metros
  installationMethod: 'B1',
  ambientTemperatureC: 30,
  groupedCircuits: 1,
  existingPeakDemandKW: 6.442,
  gridStandardLimitKW: 75,
  isOutdoor: false
};

const sizingLongDistance = sizeElectricalInfrastructure(inputLongDistance);

assert(
  sizingLongDistance.cableGaugePhaseMM2 >= 16.0,
  `Bitola aumentada automaticamente para compensar distância de 80m: ${sizingLongDistance.cableGaugePhaseMM2} mm²`
);
assert(
  sizingLongDistance.calculatedVoltageDropPercent <= 2.0,
  `Queda de tensão mantida estritamente <= 2.0%: ${sizingLongDistance.calculatedVoltageDropPercent}%`
);

// ----------------------------------------------------------------------------
// TESTE 5: LISTA DE MATERIAIS QUANTITATIVA (BOM)
// ----------------------------------------------------------------------------
console.log('\n📌 GRUPO 5: Lista Quantitativa de Materiais Elétricos (BOM)');

assert(
  sizing74.billOfMaterials.length >= 8,
  `Lista de materiais gerou ${sizing74.billOfMaterials.length} itens comerciais completos`
);

const hasBreaker = sizing74.billOfMaterials.some(i => i.category === 'protecao' && i.description.includes('Disjuntor'));
const hasDR = sizing74.billOfMaterials.some(i => i.category === 'protecao' && i.description.includes('DR'));
const hasDPS = sizing74.billOfMaterials.some(i => i.category === 'protecao' && i.description.includes('DPS'));
const hasPhaseCable = sizing74.billOfMaterials.some(i => i.category === 'condutores' && i.description.includes('Fase'));
const hasNeutralCable = sizing74.billOfMaterials.some(i => i.category === 'condutores' && i.description.includes('Neutro'));
const hasPECable = sizing74.billOfMaterials.some(i => i.category === 'condutores' && i.description.includes('Terra'));
const hasPanel = sizing74.billOfMaterials.some(i => i.category === 'quadro');
const hasEPO = sizing74.billOfMaterials.some(i => i.category === 'seguranca' && i.description.includes('Botoeira'));

assert(hasBreaker, 'BOM inclui Disjuntor termomagnético dimensionado');
assert(hasDR, 'BOM inclui Dispositivo DR Tipo B / RDC-DD');
assert(hasDPS, 'BOM inclui DPS Classe II');
assert(hasPhaseCable, 'BOM inclui Cabos de Fase com metragem e sobras');
assert(hasNeutralCable, 'BOM inclui Cabo de Neutro Azul Claro');
assert(hasPECable, 'BOM inclui Condutor de Proteção PE Verde exclusivo');
assert(hasPanel, 'BOM inclui Quadro de Distribuição DIN com reserva');
assert(hasEPO, 'BOM inclui Botoeira de Emergência tipo cogumelo (EPO & Bombeiros)');

// ----------------------------------------------------------------------------
// RESUMO FINAL
// ----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`📊 RESULTADO DOS TESTES PASSO 3: ${passedTests}/${totalTests} PASSARAM`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  console.log('🚀 TODOS OS MOTORES DO PASSO 3 FORAM VALIDADOS COM 100% DE SUCESSO!\n');
  process.exit(0);
} else {
  console.error('⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE OS LOGS ACIMA.\n');
  process.exit(1);
}
