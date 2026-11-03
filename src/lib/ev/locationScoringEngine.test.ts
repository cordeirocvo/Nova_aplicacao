import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistanceKM,
  parseLocationInput,
  filterStationsWithinRadius,
  calculateLocationScore,
  LocationInputData,
  NearbyChargingStation
} from './locationScoringEngine';

describe('Location Scoring & Competitor Filtering Engine Tests', () => {
  it('Deve calcular com precisão a distância Haversine em km entre dois pontos geográficos', () => {
    // Ponto A: Centro de Sete Lagoas (-19.4600, -44.2400)
    // Ponto B: Shopping Sete Lagoas (-19.4750, -44.2550)
    const distanceKM = calculateHaversineDistanceKM(-19.4600, -44.2400, -19.4750, -44.2550);
    assert.ok(distanceKM > 2.0 && distanceKM < 3.0, `Distância calculada (${distanceKM} km) deve estar na faixa esperada de ~2.3 km`);
  });

  it('Deve fazer o parsing correto de coordenadas geográficas no formato texto', () => {
    const rawCoords = "-19.4703402, -44.2634043";
    const result = parseLocationInput(rawCoords);
    assert.strictEqual(result.type, 'coordinates');
    if (result.type === 'coordinates') {
      assert.ok(Math.abs(result.lat - (-19.4703402)) < 0.0001);
      assert.ok(Math.abs(result.lon - (-44.2634043)) < 0.0001);
    }
  });

  it('Deve reconhecer endereços em texto e retornar tipo address', () => {
    const rawAddress = "Rua Carlos Antônio Giordani, 1580, Sete Lagoas - MG";
    const result = parseLocationInput(rawAddress);
    assert.strictEqual(result.type, 'address');
    if (result.type === 'address') {
      assert.strictEqual(result.query, rawAddress);
    }
  });

  it('Deve filtrar estações dentro do raio e permitir identificar e isolar o Hub próprio (< 250m ou Cordeiro/Coenergy)', () => {
    const targetLat = -19.4703402;
    const targetLon = -44.2634043;

    const mockStations: NearbyChargingStation[] = [
      {
        id_estacao: 'HUB_PROPRIO',
        nome: 'Hub Urbano Olavo Bilac Canaã (Cordeiro Energia)',
        operador: 'CoenergyGO',
        latitude: -19.4705,
        longitude: -44.2633, // ~20 metros de distância
        potencia_kw: 60,
        distancia_km: 0.02,
        status: 'Disponível'
      },
      {
        id_estacao: 'CONCORRENTE_1',
        nome: 'Eletroposto Shopping Sete Lagoas',
        operador: 'Tupinambá',
        latitude: -19.4820,
        longitude: -44.2580, // ~1.5 km
        potencia_kw: 50,
        distancia_km: 1.5,
        status: 'Disponível'
      },
      {
        id_estacao: 'CONCORRENTE_DISTANTE',
        nome: 'Eletroposto Rodovia BR-040',
        operador: 'Shell Recharge',
        latitude: -19.5500,
        longitude: -44.3000, // ~10 km
        potencia_kw: 150,
        distancia_km: 10.2,
        status: 'Disponível'
      }
    ];

    // Chamada com assinatura correta: (centerLat, centerLon, radiusKM, stations)
    const result = filterStationsWithinRadius(targetLat, targetLon, 5.0, mockStations);
    assert.strictEqual(result.status, 'sucesso');
    assert.strictEqual(result.estacoes.length, 2, 'Apenas 2 estações devem estar no raio de 5 km');

    // Regra de negócio: Excluir hub próprio da lista de concorrência
    const competitorsOnly = result.estacoes.filter(st => {
      const isCoenergy = (st.operador || '').toLowerCase().includes('coenergy') ||
                         (st.nome || '').toLowerCase().includes('cordeiro');
      const isVeryClose = (st.distancia_km || 0) < 0.25;
      return !isCoenergy && !isVeryClose;
    });

    assert.strictEqual(competitorsOnly.length, 1, 'Apenas o concorrente real deve permanecer na análise de concorrência');
    assert.strictEqual(competitorsOnly[0].id_estacao, 'CONCORRENTE_1');
  });

  it('Deve calcular o score locacional AHP (0 a 100) com dados consistentes', () => {
    const input: LocationInputData = {
      niche: 'urban_hub',
      vdmVehiclesPerDay: 18500,
      evFleetDensityPercent: 2.5,
      commercialAnchor: 'comercio_geral',
      gridCategory: 'bt_grupo_f_disponivel',
      availablePowerKW: 100,
      competitorDistanceKM: 1.5,
      totalChargerPowerKW: 60,
      averageDwellTimeMinutes: 40
    };

    const breakdown = calculateLocationScore(input);
    assert.ok(breakdown.totalScore >= 0 && breakdown.totalScore <= 100, `Score final (${breakdown.totalScore}) deve estar entre 0 e 100`);
    assert.ok(breakdown.rating.length > 0, 'Deve emitir uma classificação de viabilidade');
  });
});
