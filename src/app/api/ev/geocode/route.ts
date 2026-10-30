import { NextRequest, NextResponse } from 'next/server';

// Coordenadas canônicas de cidades frequentes em MG/SP como fallback de resiliência
const CIDADES_CANONICAS: Record<string, { lat: number; lon: number; nomeFormatado: string }> = {
  'MONTES CLAROS': { lat: -16.7285, lon: -43.8578, nomeFormatado: 'Montes Claros - MG, Brasil' },
  'CURVELO': { lat: -18.7564, lon: -44.4308, nomeFormatado: 'Curvelo - MG, Brasil' },
  'SETE LAGOAS': { lat: -19.4658, lon: -44.2467, nomeFormatado: 'Sete Lagoas - MG, Brasil' },
  'BELO HORIZONTE': { lat: -19.9275, lon: -43.9558, nomeFormatado: 'Belo Horizonte - MG, Brasil' },
  'CONTAGEM': { lat: -19.9386, lon: -44.0539, nomeFormatado: 'Contagem - MG, Brasil' },
  'BETIM': { lat: -19.9678, lon: -44.1986, nomeFormatado: 'Betim - MG, Brasil' },
  'UBERLANDIA': { lat: -18.9186, lon: -48.2772, nomeFormatado: 'Uberlândia - MG, Brasil' },
  'JUIZ DE FORA': { lat: -21.7642, lon: -43.3496, nomeFormatado: 'Juiz de Fora - MG, Brasil' },
  'SAO PAULO': { lat: -23.5505, lon: -46.6333, nomeFormatado: 'São Paulo - SP, Brasil' },
  'CAMPINAS': { lat: -22.9099, lon: -47.0626, nomeFormatado: 'Campinas - SP, Brasil' }
};

// Âncoras geodésicas de alta precisão para projetos de engenharia conhecidos
const PONTOS_NOTAVEIS_PROJETOS: Record<string, { lat: number; lon: number; nomeFormatado: string }> = {
  'OLAVO BILAC': { 
    lat: -19.471676, 
    lon: -44.258735, 
    nomeFormatado: 'Rua Olavo Bilac 1085, Canaã, Sete Lagoas - MG, 35700-221, Brasil' 
  },
  'CARLOS ANTONIO GIORDANI': {
    lat: -19.4703402,
    lon: -44.2634043,
    nomeFormatado: 'Rua Carlos Antônio Giordani, 1580, Henrique Nery, Sete Lagoas - MG, 35700-750, Brasil'
  },
  'DANGELIS': { 
    lat: -16.657055, 
    lon: -43.740725, 
    nomeFormatado: "Rodovia BR-251 Km 514, Posto D'Angelis, Montes Claros - MG, Brasil" 
  },
  'BIAS FORTES': { 
    lat: -18.763554, 
    lon: -44.422256, 
    nomeFormatado: 'Avenida Bias Fortes, 1928, Curvelo - MG, Brasil' 
  },
  'DIAMANTE': { 
    lat: -18.9077034, 
    lon: -48.3258897, 
    nomeFormatado: 'Rua Diamante, 473, Jardim Patrícia, Uberlândia - MG, 38414-070, Brasil' 
  },
  'ESPIGAO': { 
    lat: -18.9104592, 
    lon: -48.3037299, 
    nomeFormatado: 'Rua Indianópolis, 10, Posto Espigão, Osvaldo Rezende, Uberlândia - MG, Brasil' 
  },
  'IMBAUBAS': { 
    lat: -18.9291881, 
    lon: -48.319956, 
    nomeFormatado: 'Avenida Imbaúbas, 1676, Posto Tem Tem, Chácaras Tubalina, Uberlândia - MG, Brasil' 
  }
};

function normalizarTexto(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

/**
 * Tenta extrair coordenadas numéricas diretamente do texto ou de URLs do Google Maps / OpenStreetMap
 */
function extrairCoordenadasDiretas(texto: string): { lat: number; lon: number } | null {
  if (!texto) return null;

  // 1. Padrão "lat, lon" direto (ex: -19.4703402, -44.2634043 ou -19.4703402,-44.2634043)
  const regexCoord = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/;
  const matchCoord = texto.match(regexCoord);
  if (matchCoord) {
    const lat = parseFloat(matchCoord[1]);
    const lon = parseFloat(matchCoord[2]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  // 2. URL do Google Maps com @lat,lon ou ?q=lat,lon
  const regexGoogleMaps = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)|[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;
  const matchG = texto.match(regexGoogleMaps);
  if (matchG) {
    const lat = parseFloat(matchG[1] || matchG[3]);
    const lon = parseFloat(matchG[2] || matchG[4]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  return null;
}

function buscarFallbackCidade(endereco: string): { lat: number; lon: number; nomeFormatado: string } | null {
  const norm = normalizarTexto(endereco);
  
  // 1. Verifica se bate em pontos notáveis do projeto (ex: Olavo Bilac, Carlos Antonio Giordani)
  for (const [chave, coords] of Object.entries(PONTOS_NOTAVEIS_PROJETOS)) {
    if (norm.includes(chave)) {
      return coords;
    }
  }

  // 2. Fallback por cidade
  for (const [cidade, coords] of Object.entries(CIDADES_CANONICAS)) {
    if (norm.includes(cidade)) {
      return coords;
    }
  }
  return null;
}

/**
 * Consulta o Photon (Geocodificador de Alta Performance da Komoot baseado em OpenStreetMap / Elasticsearch)
 */
async function geocodeViaPhoton(query: string): Promise<{ lat: number; lon: number; formattedAddress: string } | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=4&lang=default`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CordeiroEnergia-EVPlanner/1.0 (eng@cordeiroenergia.com.br)'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.features) || data.features.length === 0) return null;

    // Prioriza features no Brasil
    const brFeatures = data.features.filter((f: any) => 
      f.properties?.countrycode === 'BR' || 
      (f.properties?.country && f.properties.country.toLowerCase().includes('brasil'))
    );
    const chosen = brFeatures.length > 0 ? brFeatures[0] : data.features[0];

    if (chosen && chosen.geometry && Array.isArray(chosen.geometry.coordinates)) {
      const [lon, lat] = chosen.geometry.coordinates;
      const p = chosen.properties || {};
      const parts = [
        p.name || p.street,
        p.housenumber,
        p.district || p.locality,
        p.city,
        p.state,
        'Brasil'
      ].filter(Boolean);

      return {
        lat: Number(lat.toFixed(7)),
        lon: Number(lon.toFixed(7)),
        formattedAddress: parts.join(', ') || p.name || query
      };
    }
  } catch (err: any) {
    // console.warn("Photon geocode falhou:", err?.message || err);
  }
  return null;
}

/**
 * Consulta o Nominatim (OpenStreetMap) com consulta estruturada ou livre
 */
async function geocodeViaNominatim(query: string, structured?: { street?: string; city?: string; state?: string }): Promise<{ lat: number; lon: number; formattedAddress: string } | null> {
  try {
    let url = '';
    if (structured && structured.street && structured.city) {
      url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(structured.street)}&city=${encodeURIComponent(structured.city)}&country=Brazil&addressdetails=1&limit=1`;
    } else {
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1&countrycodes=br`;
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CordeiroEnergia-EVPlanner/2.0 (contato@cordeiroenergia.com.br)'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) return null;
    const results = await res.json();
    if (Array.isArray(results) && results.length > 0) {
      const top = results[0];
      return {
        lat: parseFloat(top.lat),
        lon: parseFloat(top.lon),
        formattedAddress: top.display_name
      };
    }
  } catch (err: any) {
    // console.warn("Nominatim geocode falhou:", err?.message || err);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const addressParam = searchParams.get('address') || searchParams.get('q');
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const isReverse = searchParams.get('reverse') === 'true' || (latParam && lonParam && !addressParam);

  // ─── REVERSE GEOCODING (Lat, Lon -> Endereço) ──────────────────────────────
  if (isReverse && latParam && lonParam) {
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'CordeiroEnergia-EVPlanner/2.0 (eng@cordeiroenergia.com.br)'
        },
        signal: AbortSignal.timeout(3500)
      });

      if (res.ok) {
        const data = await res.json();
        const road = data.address?.road || data.address?.street;
        const houseNumber = data.address?.house_number;
        const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.district;
        const city = data.address?.city || data.address?.town || data.address?.municipality || 'Sete Lagoas';
        const state = data.address?.state || 'Minas Gerais';
        const cep = data.address?.postcode;

        let cleanAddress = '';
        if (road) {
          cleanAddress = `${road}${houseNumber ? `, ${houseNumber}` : ''}${suburb ? ` – ${suburb}` : ''}, ${city} - ${state}`;
          if (cep) cleanAddress += `, ${cep}`;
        } else {
          cleanAddress = data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }

        return NextResponse.json({
          success: true,
          type: 'reverse',
          lat,
          lon,
          address: cleanAddress,
          city,
          state
        });
      }
    } catch (e) {
      // Fallback
    }

    return NextResponse.json({
      success: true,
      type: 'reverse_fallback',
      lat,
      lon,
      address: `Ponto Calibrado (${lat.toFixed(6)}, ${lon.toFixed(6)})`
    });
  }

  // ─── FORWARD GEOCODING (Endereço -> Lat, Lon) ──────────────────────────────
  if (!addressParam || addressParam.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Parâmetro de endereço "address" é obrigatório' },
      { status: 400 }
    );
  }

  const rawAddress = addressParam.trim();

  // 0. Detecção Imediata de Coordenadas Numéricas inseridas na barra de busca (Google Maps / Decimais)
  const coordsDiretas = extrairCoordenadasDiretas(rawAddress);
  if (coordsDiretas) {
    return NextResponse.json({
      success: true,
      source: 'direct_coordinates',
      precision: 'exact_coordinates',
      lat: coordsDiretas.lat,
      lon: coordsDiretas.lon,
      formattedAddress: `Coordenadas Calibradas: ${coordsDiretas.lat}, ${coordsDiretas.lon}`
    });
  }

  // 1. Limpeza de termos ruído comuns em endereços de faturas e concessionárias
  const cleanedQuery = rawAddress
    .replace(/[–—]/g, '-')
    .replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, '$1 $2')
    .replace(/(\d+)([a-zA-ZÀ-ÿ])/g, '$1 $2')
    .replace(/([a-zA-ZÀ-ÿ])(\d+)/g, '$1 $2')
    .replace(/\bCO\s+AREA\s+RURAL\b/gi, '')
    .replace(/\bAREA\s+RURAL\b/gi, '')
    .replace(/\bRD\s+BR\b/gi, 'BR')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Extração de Componentes do Endereço Brasileiro
  // Ex: "Rua Carlos Antônio Giordani, 1580 - Bairro Henrique Nery, Sete Lagoas - MG"
  const cidadeDetectadaMatch = cleanedQuery.match(/(Sete Lagoas|Uberlândia|Uberlandia|Montes Claros|Curvelo|Belo Horizonte|Contagem|Betim|Juiz de Fora|São Paulo|Campinas)/i);
  const cidadeDetectada = cidadeDetectadaMatch ? cidadeDetectadaMatch[1] : '';

  // Remove o sufixo de bairro com traço para o geocodificador não engasgar
  const querySemBairro = cleanedQuery
    .replace(/-\s*bairro\s*[^,-]+/gi, '')
    .replace(/bairro\s*[^,-]+/gi, '')
    .trim();

  // 3. Nível 1: Photon Komoot (Elasticsearch OSM) — Resiliente, ultra-rápido e tolerante a números e acentos
  const photonCandidateQueries = [
    querySemBairro,
    cleanedQuery,
    `${cleanedQuery.replace(/,\s*\d+/, '')}` // Sem número predial se falhar
  ];

  for (const q of photonCandidateQueries) {
    if (!q || q.length < 4) continue;
    const resPhoton = await geocodeViaPhoton(q);
    if (resPhoton) {
      return NextResponse.json({
        success: true,
        source: 'photon_osm',
        precision: 'street',
        lat: resPhoton.lat,
        lon: resPhoton.lon,
        formattedAddress: resPhoton.formattedAddress
      });
    }
  }

  // 4. Nível 2: Nominatim com Busca Estruturada (Separação Logradouro e Cidade)
  if (cidadeDetectada) {
    const logradouroPart = cleanedQuery.split(new RegExp(cidadeDetectada, 'i'))[0].replace(/[-,]+$/, '').trim();
    if (logradouroPart.length > 5) {
      const resNominatimStructured = await geocodeViaNominatim('', { street: logradouroPart, city: cidadeDetectada });
      if (resNominatimStructured) {
        return NextResponse.json({
          success: true,
          source: 'nominatim_structured',
          precision: 'street',
          lat: resNominatimStructured.lat,
          lon: resNominatimStructured.lon,
          formattedAddress: resNominatimStructured.formattedAddress
        });
      }
    }
  }

  // 5. Nível 3: Nominatim Livre
  const resNominatim = await geocodeViaNominatim(querySemBairro);
  if (resNominatim) {
    return NextResponse.json({
      success: true,
      source: 'nominatim_osm',
      precision: 'street',
      lat: resNominatim.lat,
      lon: resNominatim.lon,
      formattedAddress: resNominatim.formattedAddress
    });
  }

  // 6. Nível 4: Detecção de CEP Brasileiro (BrasilAPI / ViaCEP)
  const cepMatch = rawAddress.match(/\b\d{5}-?\d{3}\b/);
  if (cepMatch) {
    try {
      const cleanCep = cepMatch[0].replace(/\D/g, '');
      const resCep = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (resCep.ok) {
        const cepData = await resCep.json();
        if (cepData?.location?.coordinates?.latitude && cepData?.location?.coordinates?.longitude) {
          const lat = parseFloat(cepData.location.coordinates.latitude);
          const lon = parseFloat(cepData.location.coordinates.longitude);
          if (!isNaN(lat) && !isNaN(lon)) {
            return NextResponse.json({
              success: true,
              source: 'brasilapi_cep',
              precision: 'cep_zone',
              lat: Number(lat.toFixed(7)),
              lon: Number(lon.toFixed(7)),
              formattedAddress: `${cepData.street || ''}, ${cepData.neighborhood || ''}, ${cepData.city} - ${cepData.state}, CEP ${cepData.cep}`
            });
          }
        }
      }
    } catch (_) {}
  }

  // 7. Nível 5: Fallback Canônico por Detecção de Pontos Notáveis e Cidade
  const fallback = buscarFallbackCidade(rawAddress);
  if (fallback) {
    return NextResponse.json({
      success: true,
      source: 'cidade_canonica_fallback',
      precision: 'city',
      lat: fallback.lat,
      lon: fallback.lon,
      formattedAddress: `${rawAddress} — Centro de Referência (${fallback.nomeFormatado})`
    });
  }

  // 8. Fallback Geral (Centro de Minas Gerais / Sete Lagoas como referência)
  const defaultCity = CIDADES_CANONICAS['SETE LAGOAS'];
  return NextResponse.json({
    success: true,
    source: 'default_regional',
    precision: 'regional',
    lat: defaultCity.lat,
    lon: defaultCity.lon,
    formattedAddress: `${rawAddress} (Centro de Sete Lagoas - MG)`
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = body.address || body.query;
    const lat = body.lat;
    const lon = body.lon;

    const url = new URL(request.url);
    if (lat && lon) {
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));
      url.searchParams.set('reverse', 'true');
    } else if (address) {
      url.searchParams.set('address', address);
    }

    return GET(new NextRequest(url.toString(), { headers: request.headers }));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
