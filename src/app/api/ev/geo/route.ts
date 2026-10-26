import { NextRequest, NextResponse } from 'next/server';
import { 
  calculateHaversineDistanceKM, 
  filterStationsWithinRadius, 
  NearbyChargingStation,
  AntigravityGeoPayload 
} from '@/lib/ev/locationScoringEngine';

export interface EnrichedChargingStation extends NearbyChargingStation {
  operador?: string;
  conectores?: string[];
  endereco?: string;
  cidade?: string;
}

/**
 * Base geodésica de eletropostos para Minas Gerais e SP.
 * Em produção, essa base é enriquecida via OpenChargeMap / Overpass OSM e cache Parquet/DuckDB.
 */
const ESTACOES_BASE: EnrichedChargingStation[] = [
  // ─── MONTES CLAROS & NORTE DE MINAS (CORREDOR BR-251 / BR-135) ───
  {
    id_estacao: 'MOC_001',
    nome: "Hub Rápido Posto D'Angelis (BR-251)",
    latitude: -16.657055,
    longitude: -43.740725,
    potencia_kw: 160.0,
    status: 'Disponível',
    operador: 'Rede D\'Angelis / Cordeiro',
    conectores: ['CCS2 (160 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Rodovia BR-251 Km 514, Zona Rural',
    cidade: 'Montes Claros - MG'
  },
  {
    id_estacao: 'MOC_002',
    nome: 'Montes Claros Shopping (Estacionamento Lazer)',
    latitude: -16.742434,
    longitude: -43.869302,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Enel X Way',
    conectores: ['CCS2 (60 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Av. Donato Quintino, 90 - Canelas',
    cidade: 'Montes Claros - MG'
  },
  {
    id_estacao: 'MOC_003',
    nome: 'Posto Três Garças (Trevo BR-135 Sul)',
    latitude: -16.7620,
    longitude: -43.8820,
    potencia_kw: 120.0,
    status: 'Ocupado',
    operador: 'Shell Recharge',
    conectores: ['CCS2 (120 kW)', 'CHAdeMO (50 kW)'],
    endereco: 'Rodovia BR-135 Km 368',
    cidade: 'Montes Claros - MG'
  },
  {
    id_estacao: 'MOC_004',
    nome: 'Ibituruna Center Shopping (Wallbox AC)',
    latitude: -16.7210,
    longitude: -43.8490,
    potencia_kw: 22.0,
    status: 'Disponível',
    operador: 'Volvo Recharge',
    conectores: ['Tipo 2 (22 kW)'],
    endereco: 'Av. José Corrêa Machado, 1079 - Ibituruna',
    cidade: 'Montes Claros - MG'
  },

  // ─── CURVELO & CORREDOR CENTRAL ───
  {
    id_estacao: 'CUR_001',
    nome: 'Posto Décio Curvelo (Trevo BR-040 / BR-135)',
    latitude: -18.7500,
    longitude: -44.4300,
    potencia_kw: 180.0,
    status: 'Disponível',
    operador: 'Rede Décio / Raízen Power',
    conectores: ['CCS2 (180 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Rodovia BR-040 Km 415',
    cidade: 'Curvelo - MG'
  },
  {
    id_estacao: 'CUR_002',
    nome: 'Hub Eletroposto Av. Bias Fortes (Centro Curvelo)',
    latitude: -18.763554,
    longitude: -44.422256,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Cordeiro Energia',
    conectores: ['CCS2 (60 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Avenida Bias Fortes, 1928 - Centro',
    cidade: 'Curvelo - MG'
  },

  // ─── SETE LAGOAS & ENTORNO IMEDIATO ───
  {
    id_estacao: 'SL_001',
    nome: 'Hub Urbano Olavo Bilac Canaã (Cordeiro Energia)',
    latitude: -19.471676,
    longitude: -44.258735,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Cordeiro Energia',
    conectores: ['CCS2 (60 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Rua Olavo Bilac, 1085 - Canaã',
    cidade: 'Sete Lagoas - MG'
  },
  {
    id_estacao: 'SL_002',
    nome: 'Shopping Sete Lagoas (Estacionamento Lazer)',
    latitude: -19.473734,
    longitude: -44.271598,
    potencia_kw: 22.0,
    status: 'Disponível',
    operador: 'PlugShare Network',
    conectores: ['Tipo 2 (22 kW)'],
    endereco: 'Rua Otávio Campelo Ribeiro, 2801 - Eldorado',
    cidade: 'Sete Lagoas - MG'
  },
  {
    id_estacao: 'SL_003',
    nome: 'Posto Shell Rápido Centro (Av. Antônio Olinto)',
    latitude: -19.454817,
    longitude: -44.244584,
    potencia_kw: 50.0,
    status: 'Ocupado',
    operador: 'Shell Recharge',
    conectores: ['CCS2 (50 kW)', 'CHAdeMO (50 kW)'],
    endereco: 'Av. Antônio Olinto, 450 - Centro',
    cidade: 'Sete Lagoas - MG'
  },
  {
    id_estacao: 'SL_004',
    nome: 'Posto Ipiranga Rota Gruta Rei do Mato (BR-040 Sul)',
    latitude: -19.495040,
    longitude: -44.283044,
    potencia_kw: 120.0,
    status: 'Disponível',
    operador: 'Ipiranga Conect',
    conectores: ['CCS2 (120 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Rodovia BR-040 Km 472',
    cidade: 'Sete Lagoas - MG'
  },
  {
    id_estacao: 'SL_005',
    nome: 'Posto Três Marias / Graal Sete Lagoas (BR-040 Norte)',
    latitude: -19.4350,
    longitude: -44.2210,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Rede Graal',
    conectores: ['CCS2 (60 kW)'],
    endereco: 'Rodovia BR-040 Km 458',
    cidade: 'Sete Lagoas - MG'
  },

  // ─── RMBH & CORREDOR BR-040 ───
  {
    id_estacao: 'MG_002',
    nome: 'Hub Pedro Leopoldo / Aeroporto Confins',
    latitude: -19.6200,
    longitude: -44.0500,
    potencia_kw: 150.0,
    status: 'Disponível',
    operador: 'Raízen Power',
    conectores: ['CCS2 (150 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Rodovia LMG-800 Km 8',
    cidade: 'Confins - MG'
  },
  {
    id_estacao: 'MG_003',
    nome: 'Hub Eletroposto Av. Amazonas 2000 (Drogaria Araujo)',
    latitude: -19.9275,
    longitude: -43.9558,
    potencia_kw: 120.0,
    status: 'Disponível',
    operador: 'Drogaria Araujo / Cordeiro',
    conectores: ['CCS2 (120 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Av. Amazonas, 2000 - Prado',
    cidade: 'Belo Horizonte - MG'
  },
  {
    id_estacao: 'MG_004',
    nome: 'Posto Urbano Savassi Sul (Shell Recharge)',
    latitude: -19.9380,
    longitude: -43.9350,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Shell Recharge',
    conectores: ['CCS2 (60 kW)'],
    endereco: 'Av. do Contorno, 5800 - Savassi',
    cidade: 'Belo Horizonte - MG'
  },
  {
    id_estacao: 'MG_007',
    nome: 'Hub Itaú Power Shopping (Contagem)',
    latitude: -19.9510,
    longitude: -44.0250,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'EDP Smart',
    conectores: ['CCS2 (60 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Av. General David Sarnoff, 5160 - Cidade Industrial',
    cidade: 'Contagem - MG'
  },
  {
    id_estacao: 'MG_008',
    nome: 'Partage Shopping Betim (Rodovia Fernão Dias)',
    latitude: -19.9720,
    longitude: -44.1850,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Volvo Recharge',
    conectores: ['CCS2 (60 kW)'],
    endereco: 'Rod. Fernão Dias, 601 - São João',
    cidade: 'Betim - MG'
  },

  // ─── TRIÂNGULO MINEIRO & UBERLÂNDIA ───
  {
    id_estacao: 'UDI_001',
    nome: 'Hub Center Shopping Uberlândia (Tibery)',
    latitude: -18.9130,
    longitude: -48.2610,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Raízen Power / Shell Recharge',
    conectores: ['CCS2 (60 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Av. João Naves de Ávila, 1331 - Tibery',
    cidade: 'Uberlândia - MG'
  },
  {
    id_estacao: 'UDI_002',
    nome: 'Uberlândia Shopping (Estacionamento G1)',
    latitude: -18.9600,
    longitude: -48.2780,
    potencia_kw: 60.0,
    status: 'Disponível',
    operador: 'Volvo Recharge',
    conectores: ['CCS2 (60 kW)', 'Tipo 2 (22 kW)'],
    endereco: 'Av. Paulo Gracindo, 15 - Morada da Colina',
    cidade: 'Uberlândia - MG'
  },
  {
    id_estacao: 'UDI_003',
    nome: 'Posto Rondon Rápido (Av. Rondon Pacheco)',
    latitude: -18.9240,
    longitude: -48.2720,
    potencia_kw: 50.0,
    status: 'Ocupado',
    operador: 'Enel X Way',
    conectores: ['CCS2 (50 kW)', 'CHAdeMO (50 kW)'],
    endereco: 'Av. Rondon Pacheco, 2100 - Saraiva',
    cidade: 'Uberlândia - MG'
  }
];

/**
 * Consulta em tempo real na Overpass API (OpenStreetMap) por estações de recarga VE (amenity=charging_station)
 * Busca num raio de X metros ao redor das coordenadas alvo (Zero-Config, sem API key).
 */
async function fetchOverpassChargingStations(lat: number, lon: number, radiusMeters: number): Promise<EnrichedChargingStation[]> {
  const query = `[out:json][timeout:15];(node["amenity"="charging_station"](around:${radiusMeters},${lat},${lon});way["amenity"="charging_station"](around:${radiusMeters},${lat},${lon}););out center body;`;
  
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter'
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'CordeiroEnergiaEVPlanner/2.0'
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
        next: { revalidate: 3600 } // Cache Next.js por 1 hora
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.elements) && data.elements.length > 0) {
          return data.elements.map((el: any) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            const tags = el.tags || {};
            
            const rawName = tags.name || tags.operator || tags.brand || 'Eletroposto de Recarga VE';
            const operador = tags.operator || tags.brand || tags.network || 'Rede Pública / Concorrente';
            
            const conectores: string[] = [];
            if (tags['socket:type2'] || tags['socket:type2_combo']) conectores.push('Tipo 2 (AC)');
            if (tags['socket:type2_combo'] || tags['socket:ccs']) conectores.push('CCS2 (DC Rápido)');
            if (tags['socket:chademo']) conectores.push('CHAdeMO');
            if (tags['socket:gbt'] || tags['socket:gb_t']) conectores.push('GB/T');
            if (conectores.length === 0) conectores.push('Padrão Brasileiro (CCS2/Tipo 2)');

            let potencia_kw = 22.0;
            if (tags.output) {
              potencia_kw = parseFloat(tags.output) || 22.0;
            } else if (tags.capacity) {
              potencia_kw = parseFloat(tags.capacity) || 22.0;
            } else if (conectores.some(c => c.includes('DC') || c.includes('CCS2'))) {
              potencia_kw = 60.0;
            }

            const rua = tags['addr:street'] ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}` : '';
            const bairro = tags['addr:suburb'] || '';
            const cidade = tags['addr:city'] || '';
            const endereco = [rua, bairro].filter(Boolean).join(' - ') || 'Mapeado via OpenStreetMap';

            return {
              id_estacao: `OSM_${el.id}`,
              nome: rawName,
              latitude: Number(elLat),
              longitude: Number(elLon),
              potencia_kw,
              status: 'Disponível',
              operador,
              conectores,
              endereco,
              cidade: cidade || 'Região Metropolitana'
            };
          }).filter((item: any) => typeof item.latitude === 'number' && typeof item.longitude === 'number' && !isNaN(item.latitude));
        }
      }
    } catch (e) {
      // Tenta próximo endpoint em caso de timeout
    }
  }
  return [];
}

/**
 * Consulta opcional na Google Places API (New) por eletropostos no raio (se GOOGLE_MAPS_API_KEY configurada)
 */
async function fetchGooglePlacesChargingStations(lat: number, lon: number, radiusMeters: number): Promise<EnrichedChargingStation[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
      },
      body: JSON.stringify({
        includedTypes: ['electric_vehicle_charging_station'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: radiusMeters
          }
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.places)) {
        return data.places.map((p: any) => ({
          id_estacao: `GOOGLE_${p.id}`,
          nome: p.displayName?.text || 'Eletroposto Google Maps',
          latitude: p.location?.latitude,
          longitude: p.location?.longitude,
          potencia_kw: 50.0,
          status: 'Disponível' as const,
          operador: 'Google Maps / Concorrente Comercial',
          conectores: ['CCS2', 'Tipo 2'],
          endereco: p.formattedAddress || 'Localizado via Google Maps',
          cidade: 'Local'
        })).filter((item: any) => typeof item.latitude === 'number' && typeof item.longitude === 'number');
      }
    }
  } catch (e) {
    // Fallback gracioso
  }
  return [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '-19.471676');
  const lon = parseFloat(searchParams.get('lon') || '-44.258735');
  const raioKM = parseFloat(searchParams.get('raio') || '20.0');
  const format = searchParams.get('format') || 'json';
  const targetName = searchParams.get('nome') || 'Ponto Proposto Cordeiro Energia';

  // 1. Tentar ler do microserviço FastAPI local se estiver ativo na porta 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`http://127.0.0.1:8000/api/v1/geo/mapear-raio?latitude_ponto=${lat}&longitude_ponto=${lon}&raio_km=${raioKM}`, {
      signal: controller.signal,
      headers: {
        'Authorization': 'Bearer local_dev_token'
      },
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (format === 'geojson') {
        return NextResponse.json(converterParaGeoJSON(data.estacoes, lat, lon, targetName));
      }
      return NextResponse.json(data);
    }
  } catch (err) {
    // Microserviço Python offline: segue para busca em tempo real via OpenStreetMap e catálogo curado
  }

  // 2. Consulta em Tempo Real via Overpass API (OpenStreetMap) e Google Places API (se disponível)
  const radiusMeters = Math.round(raioKM * 1000);
  const [liveOsmStations, googlePlacesStations] = await Promise.all([
    fetchOverpassChargingStations(lat, lon, radiusMeters),
    fetchGooglePlacesChargingStations(lat, lon, radiusMeters)
  ]);

  // 3. Mesclar postos em tempo real com o catálogo curado ESTACOES_BASE
  const combinedRaw: EnrichedChargingStation[] = [...googlePlacesStations, ...liveOsmStations, ...ESTACOES_BASE];

  // 4. Execução de Haversine e filtragem pelo raio selecionado
  const withDistance = combinedRaw.map(estacao => {
    const d = calculateHaversineDistanceKM(lat, lon, estacao.latitude, estacao.longitude);
    return {
      ...estacao,
      status: (estacao.status || 'Disponível') as 'Disponível' | 'Ocupado' | 'Manutenção',
      distancia_km: Number(d.toFixed(2))
    };
  })
  .filter(e => e.distancia_km <= raioKM)
  .sort((a, b) => a.distancia_km - b.distancia_km);

  // 5. Deduplicação espacial por proximidade (postos com menos de 120 metros são unificados)
  const deduplicated: AntigravityGeoPayload['estacoes'] = [];
  for (const st of withDistance) {
    const isDuplicate = deduplicated.some(d => {
      const distBetween = calculateHaversineDistanceKM(st.latitude, st.longitude, d.latitude, d.longitude);
      return distBetween < 0.12;
    });
    if (!isDuplicate) {
      deduplicated.push(st);
    }
  }

  const payload: AntigravityGeoPayload = {
    status: 'sucesso',
    ponto_referencia: { lat, lon },
    raio_busca_km: raioKM,
    total_encontrado: deduplicated.length,
    estacoes: deduplicated
  };

  // Se o frontend solicitar formato GeoJSON estruturado
  if (format === 'geojson') {
    return NextResponse.json(converterParaGeoJSON(deduplicated, lat, lon, targetName));
  }

  return NextResponse.json(payload);
}

/**
 * Converte a lista de estações e o ponto alvo no padrão RFC 7946 GeoJSON FeatureCollection
 */
function converterParaGeoJSON(estacoes: any[], targetLat: number, targetLon: number, targetName: string) {
  const features = [];

  // Ponto Alvo (Cordeiro Energia Proposto)
  features.push({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [targetLon, targetLat]
    },
    properties: {
      id: 'target-proposed-site',
      role: 'target',
      nome: targetName,
      markerColor: '#E45318',
      isTarget: true,
      description: 'Ponto selecionado para implantação do eletroposto Cordeiro Energia'
    }
  });

  // Estações Concorrentes
  for (const st of estacoes) {
    const color = st.status === 'Disponível' ? '#00B356' : st.status === 'Ocupado' ? '#F59E0B' : '#EF4444';
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [st.longitude, st.latitude]
      },
      properties: {
        id: st.id_estacao,
        role: 'competitor',
        nome: st.nome,
        operador: st.operador || 'Rede de Recarga',
        potencia_kw: st.potencia_kw,
        status: st.status,
        distancia_km: st.distancia_km,
        conectores: st.conectores || ['CCS2', 'Tipo 2'],
        endereco: st.endereco || '',
        cidade: st.cidade || '',
        markerColor: color,
        isTarget: false
      }
    });
  }

  return {
    type: 'FeatureCollection',
    features
  };
}
