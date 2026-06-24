/**
 * Engine de Simulação Fotovoltaica (Solar PV)
 * Implementa dimensionamento energético, compatibilidade elétrica e busca PVGIS.
 */

export interface SolarSizingParams {
  metaGeracaoMensalKWh: number;
  hspCity: number;
  pr: number; // ex: 0.75
}

export interface ElectricalMatchingParams {
  inversor: any;
  modulo: any;
  quantidadeModulos: number;
  numStrings: number;
}

/**
 * Dimensionamento Energético: Calcula kWp necessário
 */
export function calcularPotenciaNecessaria(params: SolarSizingParams): number {
  const { metaGeracaoMensalKWh, hspCity, pr } = params;
  if (!hspCity || !pr) return 0;
  // Pkwp = E_mensal / (HSP * 30 * PR)
  const kwp = metaGeracaoMensalKWh / (hspCity * 30 * pr);
  return parseFloat(kwp.toFixed(2));
}

/**
 * Busca irradiação média mensal (HSP) via API do PVGIS (JRC EU)
 */
export async function buscarDadosPVGIS(lat: number, lon: number, tilt: number = 0, azimuth: number = 0): Promise<{ hspMedia: number; mensal: any[] } | null> {
  try {
    // API MRcalc para médias mentais (HSP)
    // tilt: 0 to 90
    // azimuth: -180 to 180 (0=S, -90=E, 90=W, 180=N)
    const url = `https://re.jrc.ec.europa.eu/api/v5_2/MRcalc?lat=${lat}&lon=${lon}&raddatabase=PVGIS-SARAH2&usehorizon=1&angle=${tilt}&aspect=${azimuth}&outputformat=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro na API PVGIS");

    const data = await res.json();
    const monthly = data.outputs.monthly;
    
    // H_m_gh: Irradiation on a fixed plane during the month (kWh/m2/mo)
    // Convertendo para HSP diária média
    const mensal = monthly.map((m: any) => ({
      mes: m.month,
      hsp: m.H_m_gh / 30, // Aproximação diária
    }));

    const hspMedia = mensal.reduce((acc: number, cur: any) => acc + cur.hsp, 0) / 12;

    return { hspMedia: parseFloat(hspMedia.toFixed(2)), mensal };
  } catch (error) {
    console.error("PVGIS Fetch Error:", error);
    return null;
  }
}

/**
 * Verifica compatibilidade elétrica entre strings e MPPTs
 */
export function verificarCompatibilidadeEletrica(params: ElectricalMatchingParams) {
  const { inversor, modulo, quantidadeModulos, numStrings } = params;
  if (!inversor || !modulo || !quantidadeModulos || !numStrings) return null;

  const modulosPorString = Math.ceil(quantidadeModulos / numStrings);
  
  // Tensão da String (STC)
  const vocTotal = modulosPorString * modulo.Voc;
  const vmpTotal = modulosPorString * modulo.Vmp;
  
  // Corrente da String (STC)
  const iscTotal = modulo.Isc; // Strings em paralelo mantêm a corrente do módulo por string nas MPPTs
  // Depende de como as strings são distribuídas nas MPPTs. 
  // Simplificação: Assumimos 1 MPPT por string ou strings paralelas na mesma MPPT.

  const warnings: string[] = [];
  
  if (vocTotal > (inversor.tensaoEntradaMaxV || 1000)) {
    warnings.push(`⚠️ Tensão de circuito aberto (${vocTotal.toFixed(1)}V) excede o limite do inversor (${inversor.tensaoEntradaMaxV}V). Perigo de queima!`);
  }
  
  if (vmpTotal < (inversor.tensaoEntradaMinV || 100)) {
    warnings.push(`💡 Tensão de operação (${vmpTotal.toFixed(1)}V) está abaixo do mínimo da MPPT (${inversor.tensaoEntradaMinV}V). O inversor pode não dar partida.`);
  }

  return {
    modulosPorString,
    vocTotal,
    vmpTotal,
    iscTotal,
    warnings
  };
}

/**
 * PVLib-inspired Solar Simulation Engine (JS/TS Port)
 * Estimates instantaneous AC power output (kW) based on astronomical calculations, 
 * temperature losses (Faiman model), transposition, and inverter clipping.
 */
export interface PVSimulationInput {
  timestamp: Date;
  irradianciaGHI: number;       // Irradiância medida da estação (W/m²)
  tempAmbiente: number;         // Temperatura ambiente (°C)
  tempModulos?: number | null;  // Temp. medida do módulo (°C) - se nula, é estimada
  vento?: number;               // Velocidade do vento (m/s)
  capacidadeKWp: number;        // Potência pico da usina (kWp)
  inclinacao?: number;          // Inclinação dos painéis (graus)
  orientacao?: number;          // Azimute dos painéis (graus, 180 = Norte no Hemisfério Sul)
  coefTemperatura?: number;     // Coef. temperatura de potência (%/°C ou decimal, ex: -0.0035)
  coefSujidade?: number;        // Coef. sujidade (ex: 0.03 para 3% de perda)
  latitude?: number;            // Latitude local da usina
  longitude?: number;           // Longitude local da usina
  timeShiftMinutes?: number;    // Desvio de tempo (calibração de relógio do inversor)
  lowSunElevationCap?: number;  // Ângulo limite para atenuação de sol baixo (graus)
  lowSunExponent?: number;      // Expoente de atenuação de sol baixo
}

function getBrazilLocalTimeInfo(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return {
    year: parseInt(map.year),
    month: parseInt(map.month),
    day: parseInt(map.day),
    hour: parseInt(map.hour),
    minute: parseInt(map.minute),
    second: parseInt(map.second)
  };
}

export function pvlibSimulate(params: PVSimulationInput): number {
  const {
    timestamp,
    irradianciaGHI,
    tempAmbiente,
    tempModulos,
    vento = 2.0,
    capacidadeKWp,
    inclinacao = 10,
    orientacao = 180,
    coefTemperatura = -0.0035,
    coefSujidade = 0.03,
    latitude = -14.855, // Matias Cardoso, MG (Padrão)
    longitude = -43.922,
    timeShiftMinutes = 0,
    lowSunElevationCap = 10,
    lowSunExponent = 1.0
  } = params;

  if (irradianciaGHI <= 5) return 0; // Sem geração relevante à noite

  // 1. Ajuste de Desvio de Tempo (Calibração)
  const adjustedTime = new Date(timestamp.getTime() + timeShiftMinutes * 60 * 1000);

  // 2. Cálculos Astronômicos (Posição Solar) de forma segura em America/Sao_Paulo
  const localInfo = getBrazilLocalTimeInfo(adjustedTime);
  const localYear = localInfo.year;
  const localMonth = localInfo.month;
  const localDay = localInfo.day;
  
  // Dia do ano (1 a 365)
  const startOfYear = new Date(localYear, 0, 1);
  const diffMs = new Date(localYear, localMonth - 1, localDay).getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  
  // Declinação Solar (delta) em radianos
  const delta = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * (Math.PI / 180);
  
  // Equação do Tempo (EoT) em minutos
  const B = (360 * (dayOfYear - 81)) / 365 * (Math.PI / 180);
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  
  // Hora do dia em decimal (Hora Local)
  const localHours = localInfo.hour + localInfo.minute / 60 + localInfo.second / 3600;
  
  // Hora Solar Local (LST) e Ângulo Horário (H)
  const LSTM = -45; // Meridiano padrão para UTC-3
  const TC = 4 * (longitude - LSTM) + EoT; // Correção de tempo
  const LST = localHours + TC / 60;
  const H = 15 * (LST - 12) * (Math.PI / 180); // Ângulo horarário em radianos

  const latRad = latitude * (Math.PI / 180);
  
  // Elevação solar (a) em radianos
  const sinElevation = Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(H);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation)));
  const zenith = Math.PI / 2 - elevation; // Ângulo Zenital em radianos

  if (elevation <= 0) return 0; // Sol abaixo do horizonte

  // 3. Transposição de Irradiação (GHI para POA - Plane of Array)
  // Ângulo de Incidência na superfície inclinada (theta)
  const tiltRad = inclinacao * (Math.PI / 180);
  const azimuthRad = orientacao * (Math.PI / 180); // 180 = Norte
  
  // Azimute Solar aproximado
  const cosSolarAzimuth = (Math.sin(elevation) * Math.sin(latRad) - Math.sin(delta)) / (Math.cos(elevation) * Math.cos(latRad));
  const solarAzimuth = H > 0 
    ? 2 * Math.PI - Math.acos(Math.max(-1, Math.min(1, cosSolarAzimuth)))
    : Math.acos(Math.max(-1, Math.min(1, cosSolarAzimuth)));

  // Ângulo de Incidência (theta)
  const cosTheta = Math.cos(zenith) * Math.cos(tiltRad) + 
                    Math.sin(zenith) * Math.sin(tiltRad) * Math.cos(solarAzimuth - azimuthRad);
  const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

  // Plane of Array (POA) Irradiance (Transposta)
  const cosZenithLimit = Math.max(0.1, Math.cos(zenith));
  const cosThetaLimit = Math.max(0, cosTheta);
  
  // Transposição de GHI para POA
  let POA = irradianciaGHI * (cosThetaLimit / cosZenithLimit);
  
  // Limitação técnica para evitar picos exorbitantes por erros numéricos com sol muito baixo
  POA = Math.min(POA, irradianciaGHI * 1.6);
  POA = Math.max(0, POA);

  // 4. Modelo de Temperatura da Célula (Faiman / Sandia Modificada)
  let cellTemp = 25;
  if (tempModulos !== undefined && tempModulos !== null && tempModulos > 0) {
    cellTemp = tempModulos;
  } else {
    cellTemp = tempAmbiente + POA * 0.028;
  }

  // 5. Cálculo da Potência Gerada CC (DC)
  // Perda por temperatura (coefTemperatura, ex: -0.35%/°C)
  const tempLossFactor = 1 + coefTemperatura * (cellTemp - 25);
  
  // Geração CC bruta
  const P_dc = capacidadeKWp * (POA / 1000) * tempLossFactor;

  // 6. Cálculo da Potência AC Líquida
  // Inclui perdas de sujidade, degradação natural das placas e eficiência do inversor
  const soilingFactor = 1 - coefSujidade;
  const degradationFactor = 0.985; // Placa com leve envelhecimento
  const inverterEfficiency = 0.972; // Eficiência média de conversão CA-CC (Solis/Huawei)
  
  let P_ac = P_dc * soilingFactor * degradationFactor * inverterEfficiency;
  P_ac = Math.max(0, P_ac);

  // 7. Atenuação Física de Sol Baixo (Airmass/Horizonte)
  const elDeg = elevation * (180 / Math.PI);
  if (elDeg > 0 && elDeg < lowSunElevationCap) {
    const attenuationFactor = Math.pow(Math.sin((elDeg / lowSunElevationCap) * Math.PI / 2), lowSunExponent);
    P_ac = P_ac * attenuationFactor;
  }

  // 8. Inverter Clipping (Corte do Inversor)
  const capInversorLimit = capacidadeKWp * 1.05;
  if (P_ac > capInversorLimit) {
    P_ac = capInversorLimit;
  }

  return parseFloat(P_ac.toFixed(2));
}
