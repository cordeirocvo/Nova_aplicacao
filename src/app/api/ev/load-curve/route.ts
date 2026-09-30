import { NextRequest, NextResponse } from 'next/server';
import { 
  generateScaledHourlyCurve, 
  simulateDLM, 
  parseLoadDataFile, 
  DLMConfiguration,
  TypicalProfileType
} from '@/lib/coenergygo';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Caso 1: Upload de Arquivo (CSV / TXT / Memória de Massa)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      const text = await file.text();
      const parsed = parseLoadDataFile(text, file.name);

      return NextResponse.json({
        success: true,
        type: 'file_parsed',
        parsed
      });
    }

    // Caso 2: Simulação JSON de Curva e DLM
    const body = await req.json();
    const {
      profileType = 'condominio_residencial' as TypicalProfileType,
      peakDemandKW = 50,
      solarPeakKW = 0,
      customHourlyCurve,
      config = {}
    } = body;

    const dlmConfig: DLMConfiguration = {
      gridLimitKW: Number(config.gridLimitKW || 75),
      safetyMarginPercent: Number(config.safetyMarginPercent !== undefined ? config.safetyMarginPercent : 0.10),
      voltage: Number(config.voltage || 220),
      phases: Number(config.phases || 1) as 1 | 3,
      chargerCount: Number(config.chargerCount || 4),
      chargerUnitPowerKW: Number(config.chargerUnitPowerKW || 7.4),
      chargeStartHour: Number(config.chargeStartHour !== undefined ? config.chargeStartHour : 18),
      chargeDurationHours: Number(config.chargeDurationHours || 8),
      enableDLM: Boolean(config.enableDLM !== undefined ? config.enableDLM : true),
      enableSolarSurplus: Boolean(config.enableSolarSurplus || false),
      solarPeakKW: Number(solarPeakKW || 0)
    };

    // Usar curva customizada enviada ou gerar a partir do perfil típico
    const baseCurve = Array.isArray(customHourlyCurve) && customHourlyCurve.length === 24
      ? customHourlyCurve
      : generateScaledHourlyCurve(profileType, Number(peakDemandKW), Number(solarPeakKW));

    const simulation = simulateDLM(baseCurve, dlmConfig);

    return NextResponse.json({
      success: true,
      type: 'dlm_simulation',
      profileType,
      peakDemandKW,
      solarPeakKW,
      dlmConfig,
      simulation
    });
  } catch (error: any) {
    console.error('Erro na API de Curva de Carga / DLM:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao processar análise de curva de carga.' 
    }, { status: 500 });
  }
}
