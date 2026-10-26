import { NextRequest, NextResponse } from 'next/server';

export interface OsmRoadInspectionResult {
  success: boolean;
  roadName: string;
  roadRef?: string;
  osmHighwayTag: string;
  mappedHierarchyKey:
    | 'rodovia_dupla'
    | 'rodovia_simples'
    | 'arterial_primaria'
    | 'coletora_secundaria'
    | 'coletora_bairro'
    | 'via_local';
  lanes: number;
  isOneway: boolean;
  maxSpeedKmh: number;
  source: 'overpass_osm_live' | 'heuristic_fallback';
}

function mapOsmTagToHierarchy(
  highway: string,
  lanes: number,
  isOneway: boolean
): OsmRoadInspectionResult['mappedHierarchyKey'] {
  const tag = (highway || '').toLowerCase();
  if (tag === 'motorway' || tag === 'motorway_link') {
    return 'rodovia_dupla';
  }
  if (tag === 'trunk' || tag === 'trunk_link') {
    return lanes >= 3 ? 'rodovia_dupla' : 'rodovia_simples';
  }
  if (tag === 'primary' || tag === 'primary_link') {
    return 'arterial_primaria';
  }
  if (tag === 'secondary' || tag === 'secondary_link') {
    return 'coletora_secundaria';
  }
  if (tag === 'tertiary' || tag === 'tertiary_link' || tag === 'unclassified') {
    return 'coletora_bairro';
  }
  return 'via_local';
}

function inferDefaultLanes(highway: string, isOneway: boolean): number {
  const tag = (highway || '').toLowerCase();
  if (tag === 'motorway') return 4;
  if (tag === 'trunk') return isOneway ? 2 : 4;
  if (tag === 'primary') return isOneway ? 2 : 4;
  if (tag === 'secondary') return isOneway ? 2 : 3;
  if (tag === 'tertiary' || tag === 'unclassified') return 2;
  return isOneway ? 1 : 2;
}

function inferDefaultMaxSpeed(highway: string): number {
  const tag = (highway || '').toLowerCase();
  if (tag === 'motorway') return 100;
  if (tag === 'trunk') return 80;
  if (tag === 'primary') return 60;
  if (tag === 'secondary') return 50;
  if (tag === 'tertiary') return 40;
  return 30;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '-19.471676');
  const lon = parseFloat(searchParams.get('lon') || '-44.258735');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
  }

  try {
    // Consulta Overpass API num raio de 55 metros para obter a via mais próxima com tag highway
    const overpassQuery = `[out:json][timeout:4];way(around:55,${lat},${lon})["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"];out tags;`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3800);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CoenergyGO-CordeiroEnergia/2.0'
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];

      if (elements.length > 0) {
        // Priorizar a via de maior hierarquia caso haja cruzamento
        const rankOrder: Record<string, number> = {
          motorway: 6,
          trunk: 5,
          primary: 4,
          secondary: 3,
          tertiary: 2,
          unclassified: 1,
          residential: 0
        };

        elements.sort((a: any, b: any) => {
          const rA = rankOrder[a?.tags?.highway] ?? 0;
          const rB = rankOrder[b?.tags?.highway] ?? 0;
          return rB - rA;
        });

        const bestWay = elements[0];
        const tags = bestWay.tags || {};
        const osmHighwayTag = tags.highway || 'tertiary';
        const isOneway = tags.oneway === 'yes' || tags.oneway === '1' || tags.oneway === 'true';
        const parsedLanes = parseInt(tags.lanes, 10);
        const lanes = !isNaN(parsedLanes) && parsedLanes > 0
          ? parsedLanes
          : inferDefaultLanes(osmHighwayTag, isOneway);
        const parsedSpeed = parseInt(tags.maxspeed, 10);
        const maxSpeedKmh = !isNaN(parsedSpeed) && parsedSpeed > 0
          ? parsedSpeed
          : inferDefaultMaxSpeed(osmHighwayTag);

        const result: OsmRoadInspectionResult = {
          success: true,
          roadName: tags.name || tags.ref || 'Via Identificada no OpenStreetMap',
          roadRef: tags.ref || undefined,
          osmHighwayTag,
          mappedHierarchyKey: mapOsmTagToHierarchy(osmHighwayTag, lanes, isOneway),
          lanes,
          isOneway,
          maxSpeedKmh,
          source: 'overpass_osm_live'
        };

        return NextResponse.json(result);
      }
    }
  } catch (err) {
    // Fallback silencioso se Overpass estiver indisponível ou atingir timeout
  }

  const fallback: OsmRoadInspectionResult = {
    success: false,
    roadName: 'Via Urbana Local / Coletora',
    osmHighwayTag: 'tertiary',
    mappedHierarchyKey: 'coletora_bairro',
    lanes: 2,
    isOneway: false,
    maxSpeedKmh: 40,
    source: 'heuristic_fallback'
  };

  return NextResponse.json(fallback);
}
