import { NextRequest, NextResponse } from 'next/server';
import { 
  calculateHaversineDistanceKM, 
  filterStationsWithinRadius, 
  NearbyChargingStation,
  AntigravityGeoPayload 
} from '@/lib/ev/locationScoringEngine';

/**
 * Base demonstrativa de eletropostos para busca geodésica em Minas Gerais e SP.
 * Em produção, essa base é atualizada periodicamente pelo pipeline Parquet ou Supabase.
 */
const ESTACOES_BASE: NearbyChargingStation[] = [
  {
    id_estacao: 'E001',
    nome: 'Hub Eletroposto Av. Amazonas 2000 (Drogaria Araujo)',
    latitude: -19.9275,
    longitude: -43.9558,
    potencia_kw: 120.0,
    status: 'Disponível'
  },
  {
    id_estacao: 'E002',
    nome: 'Eletroposto Rodovia BR-040 Km 450 (Posto Marajó)',
    latitude: -19.9500,
    longitude: -44.0200,
    potencia_kw: 150.0,
    status: 'Ocupado'
  },
  {
    id_estacao: 'E003',
    nome: 'Posto Urbano Savassi Sul (Shell Recharge)',
    latitude: -19.9380,
    longitude: -43.9350,
    potencia_kw: 60.0,
    status: 'Disponível'
  },
  {
    id_estacao: 'E004',
    nome: 'Shopping Cidade BH (Wallbox AC Estacionamento G2)',
    latitude: -19.9190,
    longitude: -43.9410,
    potencia_kw: 22.0,
    status: 'Manutenção'
  },
  {
    id_estacao: 'E005',
    nome: 'Hub Pampulha Lagoa (Ipiranga Conect)',
    latitude: -19.8520,
    longitude: -43.9710,
    potencia_kw: 50.0,
    status: 'Disponível'
  },
  {
    id_estacao: 'E006',
    nome: 'Eletroposto Alphaville Lagoa dos Ingleses',
    latitude: -20.0500,
    longitude: -43.9800,
    potencia_kw: 120.0,
    status: 'Disponível'
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '-19.9275');
  const lon = parseFloat(searchParams.get('lon') || '-43.9558');
  const raioKM = parseFloat(searchParams.get('raio') || '15.0');

  // 1. Tentar ler do microserviço FastAPI local se estiver ativo na porta 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`http://127.0.0.1:8000/api/v1/geo/mapear-raio?latitude_ponto=${lat}&longitude_ponto=${lon}&raio_km=${raioKM}`, {
      signal: controller.signal,
      headers: {
        // Usa token padrão de dev ou mock
        'Authorization': 'Bearer local_dev_token'
      },
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // Microserviço Python offline: segue para cálculo nativo em TypeScript
  }

  // 2. Execução Nativa de Haversine via locationScoringEngine
  const payload: AntigravityGeoPayload = filterStationsWithinRadius(
    lat,
    lon,
    raioKM,
    ESTACOES_BASE
  );

  return NextResponse.json(payload);
}
