import { NextResponse } from 'next/server';
import { 
  BRAZIL_ELECTRIC_VEHICLES, 
  searchVehicles, 
  getVehicleById, 
  calculateChargingTime 
} from '@/lib/ev/vehiclesDatabase';
import { 
  analyzeUtilityCompliance, 
  CEMIG_BT_CATEGORIES, 
  CPFL_CATEGORIES, 
  ENERGISA_CATEGORIES 
} from '@/lib/ev/utilityEngines';
import { calculateNBR17019Compliance } from '@/lib/ev/nbr17019Engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const vehicleId = searchParams.get('vehicleId');

    if (vehicleId) {
      const vehicle = getVehicleById(vehicleId);
      if (!vehicle) {
        return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ vehicle });
    }

    const filteredVehicles = searchVehicles(query);

    return NextResponse.json({
      totalVehicles: BRAZIL_ELECTRIC_VEHICLES.length,
      vehicles: filteredVehicles,
      utilitiesSupported: ['CEMIG', 'CPFL', 'ENERGISA', 'ENEL_SP', 'ENEL_RJ'],
      standards: [
        { code: 'ABNT NBR 17019:2022', desc: 'Instalações elétricas para alimentação de veículos elétricos' },
        { code: 'ABNT NBR 5410:2004', desc: 'Instalações elétricas de baixa tensão' },
        { code: 'CEMIG ND-5.1 / ND-5.2 / ND-5.3', desc: 'Padrões de Baixa e Média Tensão CEMIG' },
        { code: 'CPFL GED-150030', desc: 'Critérios de Acesso para Estações de Recarga de VE CPFL' },
        { code: 'ENERGISA NDU 042', desc: 'Fornecimento para Estações de Recarga de VE Energisa' },
        { code: 'IT-41 CBPMESP / IT-30 CBMMG', desc: 'Segurança contra Incêndio em Garagens e Subsolos' }
      ]
    });
  } catch (error: any) {
    console.error('Erro na API CoenergyGO:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      vehicleId,
      chargerPowerKW = 7.4,
      chargerPhases = 1,
      chargerType = 'AC',
      utility = 'CEMIG',
      chargersList = [{ powerKW: chargerPowerKW, quantity: 1, phases: chargerPhases, chargerType }],
      existingLoadKW = 0,
      installationType = 'individual',
      cableLengthMeters = 20,
      installationMethod = 'B1',
      ambientTemperature = 30,
      hasBuiltinRDCDD = true,
      hasEmergencyButtonWithin5m = true,
      hasMechanicalBollards = true,
      hasPhotoluminescentSignaling = true,
      voltage = chargerPhases === 3 ? 380 : 220
    } = body;

    // 1. Simulação do Veículo (se fornecido)
    let vehicleSimulation = null;
    if (vehicleId) {
      const vehicle = getVehicleById(vehicleId);
      if (vehicle) {
        vehicleSimulation = calculateChargingTime(
          vehicle,
          Number(chargerPowerKW),
          chargerPhases as 1 | 3,
          chargerType as 'AC' | 'DC'
        );
      }
    }

    // 2. Análise da Concessionária (CEMIG, CPFL, ENERGISA, ENEL)
    const utilityAnalysis = analyzeUtilityCompliance({
      utility: utility as any,
      chargers: chargersList,
      existingLoadKW: Number(existingLoadKW),
      location: 'urbano',
      installationType: installationType as any
    });

    // 3. Motor NBR 17019 & Checklist de Bombeiros
    const nbrCompliance = calculateNBR17019Compliance({
      powerKW: Number(chargerPowerKW),
      voltage: Number(voltage),
      phases: chargerPhases as 1 | 2 | 3,
      cableLengthMeters: Number(cableLengthMeters),
      installationMethod: installationMethod as any,
      ambientTemperature: Number(ambientTemperature),
      hasBuiltinRDCDD: Boolean(hasBuiltinRDCDD),
      hasEmergencyButtonWithin5m: Boolean(hasEmergencyButtonWithin5m),
      hasMechanicalBollards: Boolean(hasMechanicalBollards),
      hasPhotoluminescentSignaling: Boolean(hasPhotoluminescentSignaling)
    });

    return NextResponse.json({
      success: true,
      brand: 'CoenergyGO',
      timestamp: new Date().toISOString(),
      vehicleSimulation,
      utilityAnalysis,
      nbrCompliance
    });
  } catch (error: any) {
    console.error('Erro no processamento CoenergyGO:', error);
    return NextResponse.json({ error: error.message || 'Erro no dimensionamento' }, { status: 500 });
  }
}
