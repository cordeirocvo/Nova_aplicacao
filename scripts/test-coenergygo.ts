/**
 * Suíte de Testes Automatizados — CoenergyGO Passo 1
 * Executa testes de estresse e conformidade eletrotécnica
 */

import { 
  BRAZIL_ELECTRIC_VEHICLES_CATALOG, 
  getVehicleById, 
  simulateVehicleCharging,
  evaluateCEMIG,
  evaluateCPFL,
  evaluateEnergisa,
  evaluateNBR17019,
  evaluateUtility
} from '../src/lib/coenergygo';

function runTestSuite() {
  console.log('========================================================');
  console.log('⚡ COENERGYGO — SUÍTE DE TESTES E ENGENHARIA NORMATIVA ⚡');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Detalhes: ${details}`);
    }
  }

  // ─── TESTE 1: BANCO DE VEÍCULOS E GARGALO DE BORDO ─────────────────────────
  console.log('\n--- 1. Testes de Veículos e Simulação de Carga ---');
  
  assert(BRAZIL_ELECTRIC_VEHICLES_CATALOG.length >= 20, 'Catálogo possui mais de 20 modelos homologados no Brasil', `Total: ${BRAZIL_ELECTRIC_VEHICLES_CATALOG.length}`);
  
  const dolphinMini = getVehicleById('byd-dolphin-mini');
  assert(!!dolphinMini, 'BYD Dolphin Mini encontrado no catálogo');
  
  if (dolphinMini) {
    // Simular com carregador trifásico de 22 kW
    const sim22kW = simulateVehicleCharging(dolphinMini, 22.0, 3, 'AC');
    assert(sim22kW.isBottleneckedByCar, 'Detectou que o Dolphin Mini limita o carregador de 22 kW');
    assert(sim22kW.effectiveChargingPowerKW === 6.6, `Potência efetiva limitada a 6.6 kW (obtido: ${sim22kW.effectiveChargingPowerKW} kW)`);
    assert(sim22kW.timeHours20to80 > 0, `Tempo 20-80% calculado: ${sim22kW.timeFormatted20to80}`);
    console.log(`   ⏱️ BYD Dolphin Mini em Wallbox 22kW: Tempo 20-80%: ${sim22kW.timeFormatted20to80} | Alcance: +${sim22kW.kmAddedPerHour} km/h`);
  }

  const volvoEx30Ultra = getVehicleById('volvo-ex30-ultra');
  if (volvoEx30Ultra) {
    const simVolvo = simulateVehicleCharging(volvoEx30Ultra, 22.0, 3, 'AC');
    assert(!simVolvo.isBottleneckedByCar, 'Volvo EX30 Ultra suporta integralmente 22 kW AC trifásico sem gargalo');
    assert(simVolvo.effectiveChargingPowerKW === 22.0, `Potência efetiva é 22.0 kW`);
  }

  // ─── TESTE 2: MOTOR CEMIG ND-5.1 (BT INDIVIDUAL) ───────────────────────────
  console.log('\n--- 2. Testes do Motor CEMIG (ND-5.1 e REN 1000 Art. 550) ---');
  
  const cemigIndividual = evaluateCEMIG({
    utility: 'CEMIG',
    chargers: [{ powerKW: 7.4, quantity: 1, phases: 1, chargerType: 'AC' }],
    existingLoadKW: 10,
    location: 'urbano',
    installationType: 'individual'
  });

  assert(cemigIndividual.supplyLevel === 'BT', 'Atendimento residencial individual em Baixa Tensão (BT)');
  assert(cemigIndividual.category.categoryId === 'C1', `Enquadramento CEMIG C1 (obtido: ${cemigIndividual.category.categoryId} - ${cemigIndividual.category.categoryName})`);
  assert(cemigIndividual.category.breakerCurrentA === 63, `Disjuntor geral de 63A recomendado`);
  assert(cemigIndividual.actions.some(a => a.normReference.includes('Art. 550')), 'Ação obrigatória do Art. 550 da REN 1000 presente');

  // ─── TESTE 3: MOTOR CEMIG ND-5.2 / ND-5.3 (CONDOMÍNIO / MT) ───────────────
  console.log('\n--- 3. Testes do Motor CEMIG Coletivo & Média Tensão (ND-5.2 / ND-5.3) ---');
  
  const cemigCondo = evaluateCEMIG({
    utility: 'CEMIG',
    chargers: [{ powerKW: 7.4, quantity: 15, phases: 1, chargerType: 'AC' }], // 111 kW brutos
    existingLoadKW: 40,
    location: 'urbano',
    installationType: 'coletivo_condominio'
  });

  assert(cemigCondo.simultaneityFactorApplied < 1.0, `Fator de simultaneidade aplicado: ${cemigCondo.simultaneityFactorApplied}`);
  assert(cemigCondo.supplyLevel === 'MT', 'Superou 75 kW -> Classificado em Média Tensão (MT)');
  assert(cemigCondo.requiresTransformer, 'Exige subestação particular com transformador');
  assert((cemigCondo.recommendedTransformerKVA || 0) >= 112.5, `Transformador normalizado selecionado: ${cemigCondo.recommendedTransformerKVA} kVA`);

  // ─── TESTE 4: MOTORES CPFL (GED-150030) E ENERGISA (NDU 042) ───────────────
  console.log('\n--- 4. Testes dos Motores CPFL e ENERGISA ---');

  const cpflResult = evaluateCPFL({
    utility: 'CPFL',
    chargers: [{ powerKW: 11.0, quantity: 2, phases: 3, chargerType: 'AC' }],
    existingLoadKW: 15,
    location: 'urbano',
    installationType: 'individual'
  });
  assert(cpflResult.actions.some(a => a.normReference.includes('GED-150030')), 'CPFL exige explicitamente norma GED-150030');
  assert(cpflResult.category.phases === 3, 'Padrão trifásico selecionado');

  const energisaResult = evaluateEnergisa({
    utility: 'ENERGISA',
    chargers: [{ powerKW: 7.4, quantity: 1, phases: 1, chargerType: 'AC' }],
    existingLoadKW: 8,
    location: 'urbano',
    installationType: 'individual'
  });
  assert(energisaResult.actions.some(a => a.normReference.includes('NDU 042')), 'Energisa exige explicitamente norma NDU 042');
  assert(energisaResult.category.categoryId.startsWith('T-') || energisaResult.category.categoryId.startsWith('B-'), 'Categoria NDU 001 definida');

  // ─── TESTE 5: MOTOR MANDATÓRIO NBR 17019 / NBR 5410 & BOMBEIROS ───────────
  console.log('\n--- 5. Testes do Motor ABNT NBR 17019 & Corpo de Bombeiros ---');

  const nbrResult = evaluateNBR17019({
    powerKW: 7.4,
    voltage: 220,
    phases: 1,
    cableLengthMeters: 30,
    installationMethod: 'B1',
    hasBuiltinRDCDD: true,
    hasEmergencyButtonWithin5m: true,
    hasMechanicalBollards: true,
    hasPhotoluminescentSignaling: true
  });

  assert(nbrResult.nominalCurrentA > 32 && nbrResult.nominalCurrentA < 35, `Corrente nominal calculada ~34.3A (obtido: ${nbrResult.nominalCurrentA}A)`);
  assert(nbrResult.recommendedBreakerA === 40, `Disjuntor recomendado de 40A para carga contínua (obtido: ${nbrResult.recommendedBreakerA}A)`);
  assert(nbrResult.cableGaugePhaseMM2 >= 10, `Bitola do cabo dimensionada para queda <= 2.0% (obtido: ${nbrResult.cableGaugePhaseMM2} mm²)`);
  assert(nbrResult.voltageDropPercent <= 2.0, `Queda de tensão conforme NBR 17019 (obtido: ${nbrResult.voltageDropPercent}%)`);
  assert(nbrResult.cableGaugeProtectionPEMM2 >= 10, `Condutor de proteção PE exclusivo dimensionado (obtido: ${nbrResult.cableGaugeProtectionPEMM2} mm²)`);
  assert(nbrResult.residualProtection.type === 'Tipo A + RDC-DD', 'Proteção residual com RDC-DD 6mA validada');
  assert(nbrResult.fireSafetyStatus.isApproved, 'Checklist do Corpo de Bombeiros (IT-41/IT-30) 100% aprovado');

  console.log('\n========================================================');
  console.log(`🏁 RESULTADO DOS TESTES: ${passedTests}/${totalTests} PASSARAM (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('========================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite();
