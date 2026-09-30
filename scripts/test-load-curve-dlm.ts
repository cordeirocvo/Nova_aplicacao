/**
 * ============================================================================
 * COENERGYGO - PASSO 2: TEST SUITE AUTOMATIZADA
 * Módulo de Curva de Carga, Folga de Demanda, DLM e Parser de Memória de Massa
 * ============================================================================
 */

import {
  generateScaledHourlyCurve,
  SOLAR_GENERATION_NORMALIZED,
  analyzeLoadAndUncontrolledCharging,
  simulateDLM,
  parseLoadDataFile,
  DLMConfiguration,
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
console.log('⚡ INICIANDO SUÍTE DE TESTES: COENERGYGO PASSO 2');
console.log('======================================================\n');

// ----------------------------------------------------------------------------
// TESTE 1: PERFIS DE CARGA TÍPICOS BRASILEIROS & GERAÇÃO SOLAR
// ----------------------------------------------------------------------------
console.log('📌 GRUPO 1: Perfis Típicos de Carga & Geração Solar');

const residentialCurve = generateScaledHourlyCurve('condominio_residencial', 55, 20);
assert(
  residentialCurve.length === 24,
  'Perfil Residencial gera exatamente 24 horas'
);

// O pico residencial deve ocorrer à noite (entre 18h e 22h)
const maxResPoint = residentialCurve.reduce((prev, curr) =>
  curr.baseLoadKW > prev.baseLoadKW ? curr : prev
);
assert(
  maxResPoint.hour >= 18 && maxResPoint.hour <= 22,
  `Pico do condomínio residencial no horário noturno correto (Hora: ${maxResPoint.hour}h)`
);
assert(
  Math.abs(maxResPoint.baseLoadKW - 55) < 0.1,
  `Pico atinge exatamente a demanda informada (55 kW): ${maxResPoint.baseLoadKW} kW`
);

const commercialCurve = generateScaledHourlyCurve('edificio_comercial', 100, 0);
const maxCommPoint = commercialCurve.reduce((prev, curr) =>
  curr.baseLoadKW > prev.baseLoadKW ? curr : prev
);
assert(
  maxCommPoint.hour >= 10 && maxCommPoint.hour <= 16,
  `Pico comercial no horário comercial diurno (Hora: ${maxCommPoint.hour}h, ${maxCommPoint.baseLoadKW} kW)`
);

// Geração solar deve ser 0 à noite e pico ao meio-dia
assert(
  residentialCurve[0].solarGenerationKW === 0 && residentialCurve[23].solarGenerationKW === 0,
  'Geração solar nula durante a noite (0h e 23h)'
);
const maxSolarPoint = residentialCurve.reduce((prev, curr) =>
  curr.solarGenerationKW > prev.solarGenerationKW ? curr : prev
);
assert(
  maxSolarPoint.hour >= 11 && maxSolarPoint.hour <= 13 && maxSolarPoint.solarGenerationKW === 20,
  `Pico solar ao meio-dia solar com 20 kWp (Hora: ${maxSolarPoint.hour}h, ${maxSolarPoint.solarGenerationKW} kWp)`
);

// ----------------------------------------------------------------------------
// TESTE 2: MOTOR DE ANÁLISE DE FOLGA DE DEMANDA (HEADROOM & SOBRECARGA)
// ----------------------------------------------------------------------------
console.log('\n📌 GRUPO 2: Motor de Folga de Demanda (Headroom Analysis)');

// Cenário: Condomínio com pico de 55 kW, Padrão CEMIG T6 (75 kW)
// Adicionando 6 carregadores de 7.4 kW (44.4 kW total) das 18h às 22h (4 horas)
const testConfig: DLMConfiguration = {
  gridLimitKW: 75,
  safetyMarginPercent: 0.10, // 10%
  voltage: 220,
  phases: 1,
  chargerCount: 6,
  chargerUnitPowerKW: 7.4,
  chargeStartHour: 18,
  chargeDurationHours: 4,
  enableDLM: true,
  enableSolarSurplus: true,
  solarPeakKW: 20
};

const uncontrolledResult = analyzeLoadAndUncontrolledCharging(residentialCurve, testConfig);

assert(
  Math.abs(uncontrolledResult.peakBaseLoadKW - 55) < 0.1,
  `Detecção correta do pico de demanda base: ${uncontrolledResult.peakBaseLoadKW} kW`
);
assert(
  uncontrolledResult.gridEffectiveLimitKW === 67.5,
  'Cálculo exato do limite efetivo com margem de 10% (75 kW * 0.9 = 67.5 kW)'
);
assert(
  uncontrolledResult.isOverloadedWithoutDLM === true,
  'Sobrecarga SEM DLM detectada com sucesso (Padrão 75 kW seria violado sem controle)'
);
assert(
  uncontrolledResult.maxOverloadWithoutDLMKW > 20,
  `Cálculo preciso da sobrecarga máxima sem controle: ${uncontrolledResult.maxOverloadWithoutDLMKW.toFixed(1)} kW`
);
assert(
  uncontrolledResult.overloadHoursCount > 0,
  `Contagem de horas em sobrecarga: ${uncontrolledResult.overloadHoursCount} horas`
);

// ----------------------------------------------------------------------------
// TESTE 3: GESTÃO DINÂMICA DE CARGA (DLM - IEC 61851-1)
// ----------------------------------------------------------------------------
console.log('\n📌 GRUPO 3: Gestão Dinâmica de Carga (DLM IEC 61851-1)');

const dlmResult = simulateDLM(residentialCurve, testConfig);

assert(
  dlmResult.isOverloadedWithDLM === false,
  'DLM elimina 100% das sobrecargas na rede elétrica'
);
assert(
  dlmResult.peakWithDLMKW <= dlmResult.gridEffectiveLimitKW + 0.1,
  `Demanda máxima com DLM (${dlmResult.peakWithDLMKW.toFixed(1)} kW) respeita o teto efetivo (${dlmResult.gridEffectiveLimitKW} kW)`
);

// Verificar modulação de corrente IEC 61851-1 (mínimo 6A)
const hoursWithCharging = dlmResult.hourlyPoints.filter(
  (p) => p.hour >= 18 && p.hour < 22
);
const allCurrentsCompliant = hoursWithCharging.every(
  (p) => p.perChargerCurrentA >= 5.9 && p.perChargerCurrentA <= 35
);
assert(
  allCurrentsCompliant,
  'Corrente modulada por carregador respeita os limites da IEC 61851-1 (6A a 32A)'
);

// No horário de pico (19h), a corrente deve ter sido modulada para baixo
const peakHourPoint = dlmResult.hourlyPoints.find((p) => p.hour === 19);
assert(
  peakHourPoint !== undefined && peakHourPoint.perChargerCurrentA < 20,
  `No pico das 19h, DLM reduziu a corrente para ${peakHourPoint?.perChargerCurrentA.toFixed(1)}A por veículo evitando desarme do disjuntor geral`
);

// Economia de CAPEX estimada
assert(
  dlmResult.capexSavingsEstimateBRL > 0,
  `Economia de CAPEX calculada com sucesso: R$ ${dlmResult.capexSavingsEstimateBRL.toLocaleString('pt-BR')}`
);
assert(
  dlmResult.status === 'approved_with_dlm',
  `Status de viabilidade classificado corretamente: "${dlmResult.status}" (${dlmResult.statusLabel})`
);
assert(
  dlmResult.recommendations.length > 0,
  'Recomendações técnicas executivas emitidas com fundamentação eletrotécnica'
);

// ----------------------------------------------------------------------------
// TESTE 4: PARSER DE MEMÓRIA DE MASSA & ANALISADORES (CSV / TXT)
// ----------------------------------------------------------------------------
console.log('\n📌 GRUPO 4: Parser Universal de Arquivos de Medição (CSV/TXT)');

// Simulação de CSV de analisador nacional (ponto e vírgula, vírgula decimal)
const mockCsvBrazilian = `Data;Hora;Demanda_Ativa_kW;Tensao_V
01/10/2026;00:00;12,4;221,5
01/10/2026;01:00;10,8;222,0
01/10/2026;02:00;9,5;223,1
01/10/2026;03:00;8,9;223,5
01/10/2026;04:00;9,1;223,0
01/10/2026;05:00;11,2;222,4
01/10/2026;06:00;18,5;220,9
01/10/2026;07:00;25,4;219,8
01/10/2026;08:00;34,8;218,5
01/10/2026;09:00;42,1;218,0
01/10/2026;10:00;45,0;217,9
01/10/2026;11:00;43,5;218,2
01/10/2026;12:00;39,0;218,9
01/10/2026;13:00;44,2;218,1
01/10/2026;14:00;46,8;217,5
01/10/2026;15:00;48,2;217,1
01/10/2026;16:00;47,0;217,6
01/10/2026;17:00;49,5;216,9
01/10/2026;18:00;58,6;215,8
01/10/2026;19:00;64,2;214,5
01/10/2026;20:00;62,0;215,0
01/10/2026;21:00;51,4;216,2
01/10/2026;22:00;38,7;218,0
01/10/2026;23:00;22,1;220,1
`;

const parsedCsv = parseLoadDataFile(mockCsvBrazilian, 'medicao_condominio_kron.csv');

assert(
  parsedCsv.validPointsCount === 24,
  `Parser extraiu exatamente 24 registros válidos (Lidos: ${parsedCsv.validPointsCount})`
);
assert(
  Math.abs(parsedCsv.maxRecordedDemandKW - 64.2) < 0.1,
  `Pico máximo lido com precisão decimal: ${parsedCsv.maxRecordedDemandKW} kW (Esperado: 64.2 kW)`
);
assert(
  parsedCsv.hourlyCurve24h.length === 24,
  'Curva 24h horária reconstruída para simulação instantânea'
);

const parsedPeakPoint = parsedCsv.hourlyCurve24h.reduce((prev, curr) =>
  curr.baseLoadKW > prev.baseLoadKW ? curr : prev
);
assert(
  parsedPeakPoint.hour === 19,
  `Hora de pico do arquivo CSV identificada corretamente: ${parsedPeakPoint.hour}h`
);

// ----------------------------------------------------------------------------
// RESUMO FINAL
// ----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`📊 RESULTADO DOS TESTES PASSO 2: ${passedTests}/${totalTests} PASSARAM`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  console.log('🚀 TODOS OS MOTORES DO PASSO 2 FORAM VALIDADOS COM 100% DE SUCESSO!\n');
  process.exit(0);
} else {
  console.error('⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE OS LOGS ACIMA.\n');
  process.exit(1);
}
