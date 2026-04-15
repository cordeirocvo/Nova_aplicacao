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
export async function buscarDadosPVGIS(lat: number, lon: number): Promise<{ hspMedia: number; mensal: any[] } | null> {
  try {
    // API MRcalc para médias mentais (HSP)
    // Usamos raddatabase=PVGIS-SARAH2 para melhor precisão nas Américas
    const url = `https://re.jrc.ec.europa.eu/api/v5_2/MRcalc?lat=${lat}&lon=${lon}&raddatabase=PVGIS-SARAH2&usehorizon=1&outputformat=json`;
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
