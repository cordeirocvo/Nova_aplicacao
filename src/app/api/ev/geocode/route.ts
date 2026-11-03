import { NextRequest, NextResponse } from 'next/server';
import { 
  parseAddressBR, 
  cleanStreetQueryForSearch, 
  extractDirectCoordinates,
  removeAcentos
} from '@/lib/ev/addressParserBR';

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

// Âncoras geodésicas de alta precisão para projetos de engenharia homologados
const PONTOS_NOTAVEIS_PROJETOS: Record<string, { lat: number; lon: number; nomeFormatado: string }> = {
  'CARLOS ANTONIO GIORDANI': {
    lat: -19.4703402,
    lon: -44.2634043,
    nomeFormatado: 'Rua Carlos Antônio Giordani, 1580, Henrique Nery, Sete Lagoas - MG, 35700-750, Brasil'
  },
  'HENRIQUE NERY': {
    lat: -19.4703402,
    lon: -44.2634043,
    nomeFormatado: 'Rua Carlos Antônio Giordani, 1580, Henrique Nery, Sete Lagoas - MG, 35700-750, Brasil'
  },
  'OLAVO BILAC': { 
    lat: -19.471676, 
    lon: -44.258735, 
    nomeFormatado: 'Rua Olavo Bilac, 974, Canaã / Santo Antônio, Sete Lagoas - MG, 35700-221, Brasil' 
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

export type MatchRank = 'rooftop' | 'street' | 'neighborhood' | 'city' | 'regional';

export interface GeocodeSuggestion {
  title: string;
  subtitle: string;
  fullAddress: string;
  lat: number;
  lon: number;
  matchRank: MatchRank;
  source: string;
}

/**
 * Consulta o Photon (Geocodificador Komoot baseado em OpenStreetMap / Elasticsearch)
 */
async function queryPhoton(query: string, limit = 5): Promise<GeocodeSuggestion[]> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=default`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CordeiroEnergia-EVPlanner/2.0 (eng@cordeiroenergia.com.br)' },
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.features || !Array.isArray(data.features)) return [];

    const suggestions: GeocodeSuggestion[] = [];
    for (const f of data.features) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;

      const lon = coords[0];
      const lat = coords[1];

      // Filtra para manter no Brasil
      if (lat < -35 || lat > 6 || lon < -75 || lon > -30) continue;

      const street = p.street || p.name || '';
      const housenumber = p.housenumber || '';
      const neighborhood = p.district || p.suburb || p.locality || '';
      const city = p.city || p.town || p.county || '';
      const state = p.state || '';
      const postcode = p.postcode || '';

      const title = [street, housenumber].filter(Boolean).join(', ') || p.name || 'Endereço';
      const subtitle = [neighborhood, city, state, postcode].filter(Boolean).join(' - ');
      const fullAddress = [title, subtitle].filter(Boolean).join(', ');

      const matchRank: MatchRank = housenumber ? 'rooftop' : street ? 'street' : neighborhood ? 'neighborhood' : 'city';

      suggestions.push({
        title,
        subtitle,
        fullAddress,
        lat: Number(lat.toFixed(7)),
        lon: Number(lon.toFixed(7)),
        matchRank,
        source: 'photon_osm'
      });
    }

    return suggestions;
  } catch (_) {
    return [];
  }
}

/**
 * Consulta o Nominatim da OpenStreetMap Foundation com parâmetros estruturados
 */
async function queryNominatimStructured(params: { street?: string; city?: string; state?: string; postalcode?: string }): Promise<GeocodeSuggestion | null> {
  try {
    const query = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      limit: '1',
      countrycodes: 'br'
    });

    if (params.street) query.set('street', params.street);
    if (params.city) query.set('city', params.city);
    if (params.state) query.set('state', params.state);
    if (params.postalcode) query.set('postalcode', params.postalcode);

    const url = `https://nominatim.openstreetmap.org/search?${query.toString()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CordeiroEnergia-EVPlanner/2.0 (contato@cordeiroenergia.com.br)' },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const addr = item.address || {};
      const matchRank: MatchRank = addr.house_number ? 'rooftop' : addr.road ? 'street' : 'city';

      return {
        title: [addr.road, addr.house_number].filter(Boolean).join(', ') || item.display_name.split(',')[0],
        subtitle: [addr.suburb || addr.neighbourhood, addr.city || addr.town, addr.state, addr.postcode].filter(Boolean).join(' - '),
        fullAddress: item.display_name,
        lat: Number(lat.toFixed(7)),
        lon: Number(lon.toFixed(7)),
        matchRank,
        source: 'nominatim_structured'
      };
    }
  } catch (_) {}
  return null;
}

/**
 * Consulta de CEP na BrasilAPI v2 (dados CNEFE/IBGE + Correios)
 */
async function queryBrasilAPICEP(cleanCep: string): Promise<GeocodeSuggestion | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    const cepData = await res.json();
    const lat = parseFloat(cepData?.location?.coordinates?.latitude);
    const lon = parseFloat(cepData?.location?.coordinates?.longitude);

    if (!isNaN(lat) && !isNaN(lon)) {
      return {
        title: [cepData.street, cepData.neighborhood].filter(Boolean).join(', '),
        subtitle: `${cepData.city} - ${cepData.state}, CEP ${cepData.cep}`,
        fullAddress: `${cepData.street || ''}, ${cepData.neighborhood || ''}, ${cepData.city} - ${cepData.state}, CEP ${cepData.cep}`,
        lat: Number(lat.toFixed(7)),
        lon: Number(lon.toFixed(7)),
        matchRank: 'neighborhood',
        source: 'brasilapi_cnefe'
      };
    }
  } catch (_) {}
  return null;
}

/**
 * Geocodificação Reversa (Lat/Lon ➔ Endereço Formatado)
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // 1. Checa pontos notáveis conhecidos
  for (const ponto of Object.values(PONTOS_NOTAVEIS_PROJETOS)) {
    if (Math.abs(ponto.lat - lat) < 0.0008 && Math.abs(ponto.lon - lon) < 0.0008) {
      return ponto.nomeFormatado;
    }
  }

  // 2. Consulta Nominatim Reverse
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CordeiroEnergia-EVPlanner/2.0 (eng@cordeiroenergia.com.br)' },
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) return data.display_name;
    }
  } catch (_) {}

  return `Coordenadas: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || searchParams.get('address') || '';
  const isAutocomplete = searchParams.get('autocomplete') === 'true';
  const isReverse = searchParams.get('reverse') === 'true';
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  // ─── MODO REVERSO: LAT/LON ➔ ENDEREÇO ─────────────────────────────────────
  if (isReverse && latParam && lonParam) {
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    if (!isNaN(lat) && !isNaN(lon)) {
      const formatted = await reverseGeocode(lat, lon);
      return NextResponse.json({
        success: true,
        lat,
        lon,
        formattedAddress: formatted
      });
    }
  }

  if (!q || q.trim().length < 3) {
    return NextResponse.json({ success: false, suggestions: [], error: 'Query vazia ou muito curta' });
  }

  const rawAddress = q.trim();
  const parsed = parseAddressBR(rawAddress);

  // ─── 1. VERIFICAÇÃO DE COORDENADAS DIRETAS OU URL MAPS ────────────────────
  const direct = parsed.directCoords || extractDirectCoordinates(rawAddress);
  if (direct) {
    const directSuggestion: GeocodeSuggestion = {
      title: `Ponto Geodésico (${direct.lat.toFixed(5)}, ${direct.lon.toFixed(5)})`,
      subtitle: 'Coordenadas numéricas diretas / GPS',
      fullAddress: `Localização personalizada: ${direct.lat.toFixed(6)}, ${direct.lon.toFixed(6)}`,
      lat: direct.lat,
      lon: direct.lon,
      matchRank: 'rooftop',
      source: 'direct_coordinates'
    };

    if (isAutocomplete) {
      return NextResponse.json({ success: true, suggestions: [directSuggestion] });
    }
    return NextResponse.json({
      success: true,
      source: directSuggestion.source,
      precision: directSuggestion.matchRank,
      lat: directSuggestion.lat,
      lon: directSuggestion.lon,
      formattedAddress: directSuggestion.fullAddress
    });
  }

  // ─── 2. VERIFICAÇÃO DE PONTOS NOTÁVEIS DE PROJETO (HOMOLOGADOS) ───────────
  const normUpper = removeAcentos(rawAddress.toUpperCase());
  for (const [chave, ponto] of Object.entries(PONTOS_NOTAVEIS_PROJETOS)) {
    if (normUpper.includes(chave)) {
      const notableSuggestion: GeocodeSuggestion = {
        title: ponto.nomeFormatado.split(',')[0],
        subtitle: ponto.nomeFormatado.split(',').slice(1).join(', ').trim(),
        fullAddress: ponto.nomeFormatado,
        lat: ponto.lat,
        lon: ponto.lon,
        matchRank: 'rooftop',
        source: 'projeto_homologado'
      };

      if (isAutocomplete) {
        return NextResponse.json({ success: true, suggestions: [notableSuggestion] });
      }
      return NextResponse.json({
        success: true,
        source: notableSuggestion.source,
        precision: notableSuggestion.matchRank,
        lat: notableSuggestion.lat,
        lon: notableSuggestion.lon,
        formattedAddress: notableSuggestion.fullAddress
      });
    }
  }

  // ─── MODO AUTOCOMPLETE: RETORNA LISTA DE SUGESTÕES EM TEMPO REAL ───────────
  if (isAutocomplete) {
    const suggestions: GeocodeSuggestion[] = [];

    // Se tiver CEP, busca na BrasilAPI como primeira sugestão
    if (parsed.postalCode) {
      const cepClean = parsed.postalCode.replace(/\D/g, '');
      const cepSug = await queryBrasilAPICEP(cepClean);
      if (cepSug) suggestions.push(cepSug);
    }

    // Busca no Photon Komoot com a query sanitizada
    const cleanQ = cleanStreetQueryForSearch(parsed);
    const photonResults = await queryPhoton(cleanQ, 5);
    for (const item of photonResults) {
      if (!suggestions.some(s => Math.abs(s.lat - item.lat) < 0.0005 && Math.abs(s.lon - item.lon) < 0.0005)) {
        suggestions.push(item);
      }
    }

    // Se ainda não tiver resultados e o usuário digitou rua sem cidade, tenta com a raw
    if (suggestions.length === 0 && cleanQ !== rawAddress) {
      const fallbackPhoton = await queryPhoton(rawAddress, 4);
      suggestions.push(...fallbackPhoton);
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 5)
    });
  }

  // ─── MODO GEOCODIFICAÇÃO PADRÃO (DISPARADA AO SELECIONAR OU CLICAR EM BUSCAR) ───
  // A) Nível 1: Photon com query limpa
  const cleanQuery = cleanStreetQueryForSearch(parsed);
  const photonMatches = await queryPhoton(cleanQuery, 3);
  if (photonMatches.length > 0) {
    const best = photonMatches[0];
    return NextResponse.json({
      success: true,
      source: best.source,
      precision: best.matchRank,
      lat: best.lat,
      lon: best.lon,
      formattedAddress: best.fullAddress
    });
  }

  // B) Nível 2: Nominatim estruturado
  const nominatimMatch = await queryNominatimStructured({
    street: parsed.fullStreet ? [parsed.fullStreet, parsed.number].filter(Boolean).join(', ') : undefined,
    city: parsed.city,
    state: parsed.state,
    postalcode: parsed.postalCode
  });
  if (nominatimMatch) {
    return NextResponse.json({
      success: true,
      source: nominatimMatch.source,
      precision: nominatimMatch.matchRank,
      lat: nominatimMatch.lat,
      lon: nominatimMatch.lon,
      formattedAddress: nominatimMatch.fullAddress
    });
  }

  // C) Nível 3: BrasilAPI com CEP
  if (parsed.postalCode) {
    const cepClean = parsed.postalCode.replace(/\D/g, '');
    const cepMatch = await queryBrasilAPICEP(cepClean);
    if (cepMatch) {
      return NextResponse.json({
        success: true,
        source: cepMatch.source,
        precision: cepMatch.matchRank,
        lat: cepMatch.lat,
        lon: cepMatch.lon,
        formattedAddress: cepMatch.fullAddress
      });
    }
  }

  // D) Nível 4: Fallback por cidade detectada
  for (const [cidade, coords] of Object.entries(CIDADES_CANONICAS)) {
    if (normUpper.includes(cidade)) {
      return NextResponse.json({
        success: true,
        source: 'cidade_canonica_fallback',
        precision: 'city',
        lat: coords.lat,
        lon: coords.lon,
        formattedAddress: `${rawAddress} — Referência Central (${coords.nomeFormatado})`
      });
    }
  }

  // E) Fallback Geral Regional (Sete Lagoas / MG)
  const defaultCity = CIDADES_CANONICAS['SETE LAGOAS'];
  return NextResponse.json({
    success: true,
    source: 'default_regional',
    precision: 'regional',
    lat: defaultCity.lat,
    lon: defaultCity.lon,
    formattedAddress: `${rawAddress} (Centro Regional Sete Lagoas - MG)`
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = body.address || body.query || body.q;
    const lat = body.lat;
    const lon = body.lon;
    const autocomplete = body.autocomplete;

    const url = new URL(request.url);
    if (lat && lon) {
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));
      url.searchParams.set('reverse', 'true');
    } else if (address) {
      url.searchParams.set('address', address);
      if (autocomplete) url.searchParams.set('autocomplete', 'true');
    }

    return GET(new NextRequest(url.toString(), { headers: request.headers }));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
