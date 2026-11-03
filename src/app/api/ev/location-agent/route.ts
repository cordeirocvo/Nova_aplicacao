import { NextRequest, NextResponse } from 'next/server';
import { 
  getCityDemographicData, 
  analyzeCompetition, 
  calculateIdleFeeProjection, 
  buildLocationExecutiveSummary,
  LocationDiagnosticOutput,
  RoadAndPoiData
} from '@/core/services/locationAgentService';
import { calculateHaversineDistanceKM } from '@/lib/ev/locationScoringEngine';

export const dynamic = 'force-dynamic';

/**
 * Consulta o OpenStreetMap Overpass para identificar tipo de via e POIs comerciais em 500m
 */
async function fetchOverpassRoadAndPOIs(lat: number, lon: number): Promise<RoadAndPoiData> {
  const query = `
    [out:json][timeout:4];
    (
      way(around:80,${lat},${lon})["highway"];
      node(around:500,${lat},${lon})["amenity"~"pharmacy|fuel|restaurant|bank|fast_food"];
      node(around:500,${lat},${lon})["shop"~"convenience|supermarket|mall"];
    );
    out tags 20;
  `;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const elements: any[] = data.elements || [];

      let tipoVia: RoadAndPoiData['tipoVia'] = 'arterial';
      let nomeVia = 'Avenida / Corredor Principal';
      let maxspeed = 60;

      const pois: RoadAndPoiData['pontosInteresse500m'] = [];

      for (const el of elements) {
        if (el.tags?.highway) {
          const hw = el.tags.highway;
          nomeVia = el.tags.name || nomeVia;
          if (hw === 'motorway' || hw === 'trunk') {
            tipoVia = 'rodovia';
            maxspeed = 80;
          } else if (hw === 'primary' || hw === 'secondary') {
            tipoVia = 'arterial';
            maxspeed = 60;
          } else if (hw === 'tertiary') {
            tipoVia = 'coletora';
            maxspeed = 50;
          } else {
            tipoVia = 'local';
            maxspeed = 40;
          }
        }

        if (el.tags?.amenity || el.tags?.shop) {
          const am = el.tags.amenity;
          const sh = el.tags.shop;
          const nome = el.tags.name || 'Estabelecimento Comercial';
          
          let tipo: any = 'outro';
          if (am === 'pharmacy') tipo = 'farmacia';
          else if (am === 'fuel') tipo = 'posto';
          else if (am === 'restaurant' || am === 'fast_food') tipo = 'restaurante';
          else if (sh === 'convenience' || sh === 'supermarket') tipo = 'conveniencia';
          else if (am === 'bank') tipo = 'banco';

          pois.push({ tipo, nome });
        }
      }

      return {
        tipoVia,
        nomeVia,
        velocidadeEstimadaKmh: maxspeed,
        pontosInteresse500m: pois.slice(0, 10),
        totalComercios500m: Math.max(pois.length, 2)
      };
    }
  } catch (err) {
    console.warn('[LOCATION_AGENT] Overpass indisponível ou timeout, usando estimativa de fallback:', err);
  }

  // Fallback padrão
  return {
    tipoVia: 'arterial',
    nomeVia: 'Via Arterial Estruturante',
    velocidadeEstimadaKmh: 60,
    pontosInteresse500m: [
      { tipo: 'conveniencia', nome: 'Galeria de Lojas Comerciais' },
      { tipo: 'farmacia', nome: 'Farmácia & Conveniência' }
    ],
    totalComercios500m: 4
  };
}

/**
 * Consulta estações de recarga concorrentes em múltiplas fontes (OpenChargeMap e Google Places)
 */
async function fetchNearbyCompetitorStations(lat: number, lon: number, radiusKm: number = 5.0) {
  const stations: Array<{ id: string; name: string; lat: number; lon: number; powerKW: number; isDC: boolean; distanceKm: number }> = [];

  // 1. Consulta OpenChargeMap se conectividade estiver disponível
  try {
    const ocmKey = process.env.OPENCHARGEMAP_API_KEY || '1e345fc5-d143-4416-8f3b-550ff1f22e86';
    const ocmUrl = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lon}&distance=${radiusKm}&distanceunit=KM&maxresults=25&key=${ocmKey}`;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(ocmUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const itemLat = item.AddressInfo?.Latitude;
          const itemLon = item.AddressInfo?.Longitude;
          if (itemLat === undefined || itemLon === undefined) continue;

          const dist = calculateHaversineDistanceKM(lat, lon, itemLat, itemLon);
          let maxKW = 0;
          let isDC = false;

          if (Array.isArray(item.Connections)) {
            for (const c of item.Connections) {
              const kw = c.PowerKW || 0;
              if (kw > maxKW) maxKW = kw;
              const typeTitle = (c.ConnectionType?.Title || '').toUpperCase();
              if (typeTitle.includes('CCS') || typeTitle.includes('CHADEMO') || kw >= 30) {
                isDC = true;
              }
            }
          }

          stations.push({
            id: `OCM_${item.ID}`,
            name: item.AddressInfo?.Title || 'Eletroposto OCM',
            lat: itemLat,
            lon: itemLon,
            powerKW: maxKW || (isDC ? 60 : 7.4),
            isDC,
            distanceKm: dist
          });
        }
      }
    }
  } catch (err) {
    console.warn('[LOCATION_AGENT] Erro na consulta OpenChargeMap:', err);
  }

  // 2. Consulta Google Places se API Key configurada
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.location'
        },
        body: JSON.stringify({
          includedTypes: ['electric_vehicle_charging_station'],
          maxResultCount: 15,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lon },
              radius: radiusKm * 1000
            }
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.places)) {
          for (const p of data.places) {
            const pLat = p.location?.latitude;
            const pLon = p.location?.longitude;
            if (pLat === undefined || pLon === undefined) continue;

            const dist = calculateHaversineDistanceKM(lat, lon, pLat, pLon);
            // Evita duplicar se já foi adicionado pelo OCM com distância < 50m
            const alreadyExists = stations.some(s => calculateHaversineDistanceKM(s.lat, s.lon, pLat, pLon) < 0.05);
            if (!alreadyExists) {
              stations.push({
                id: `GOOGLE_${p.id}`,
                name: p.displayName?.text || 'Eletroposto Google Places',
                lat: pLat,
                lon: pLon,
                powerKW: 22, // padrão conservador Google se conector não especificado
                isDC: false,
                distanceKm: dist
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[LOCATION_AGENT] Erro na consulta Google Places:', err);
    }
  }

  return stations;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      address = '',
      lat = -19.4703402,
      lon = -44.2634043,
      cityName = 'Sete Lagoas',
      stateUF = 'MG',
      commercialAnchorType = 'Galeria de Lojas 24 Horas',
      propertyOwner = 'Sr. Saint Clair',
      clientName = 'Coenergy',
      idleFeePerMinute = 1.50,
      idleFeeGraceMinutes = 15,
      manualStations = []
    } = body;

    // ─── CONSULTAS PARALELAS DE ALTA PERFORMANCE ─────────────────────────────
    const [ibgeResult, roadResult, stationsResult] = await Promise.allSettled([
      getCityDemographicData(cityName, stateUF),
      fetchOverpassRoadAndPOIs(lat, lon),
      fetchNearbyCompetitorStations(lat, lon, 5.0)
    ]);

    const ibgeData = ibgeResult.status === 'fulfilled' 
      ? ibgeResult.value 
      : await getCityDemographicData(cityName, stateUF);

    const roadData = roadResult.status === 'fulfilled' 
      ? roadResult.value 
      : {
          tipoVia: 'arterial' as const,
          nomeVia: address.split(',')[0] || 'Avenida Comercial',
          velocidadeEstimadaKmh: 60,
          pontosInteresse500m: [],
          totalComercios500m: 3
        };

    const apiStations = stationsResult.status === 'fulfilled' ? stationsResult.value : [];

    // ─── ANÁLISE DE CONCORRÊNCIA DC COM CARREGADORES MANUAIS ─────────────────
    const competition = analyzeCompetition(apiStations, manualStations, 5.0);

    // ─── MODELAGEM DE IDLE FEE COM PARÂMETROS DO USUÁRIO ─────────────────────
    const idleFee = calculateIdleFeeProjection(20, {
      feePerMinute: Number(idleFeePerMinute),
      graceMinutes: Number(idleFeeGraceMinutes)
    });

    // ─── SÍNTESE EXECUTIVA DO DIAGNÓSTICO TERRITORIAL ────────────────────────
    const diagnostic: LocationDiagnosticOutput = buildLocationExecutiveSummary({
      enderecoFormatado: address || `${roadData.nomeVia}, ${cityName} - ${stateUF}`,
      lat,
      lon,
      cidade: cityName,
      uf: stateUF,
      ibge: ibgeData,
      via: roadData,
      concorrencia: competition,
      idleFee,
      ancoraComercialTipo: commercialAnchorType,
      proprietarioImovel: propertyOwner,
      clienteContratante: clientName
    });

    return NextResponse.json({
      success: true,
      diagnostic
    });
  } catch (error: any) {
    console.error('[LOCATION_AGENT_ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao processar diagnóstico locacional' },
      { status: 500 }
    );
  }
}
