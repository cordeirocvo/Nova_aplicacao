import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getCityDemographicData, 
  analyzeCompetition, 
  calculateIdleFeeProjection, 
  buildLocationExecutiveSummary,
  normalizeCityName
} from './locationAgentService';

describe('Location Agent Service — Demographic, Competition & Idle Fee Engine', () => {
  it('Deve normalizar nomes de municípios removendo acentos e espaços', () => {
    assert.strictEqual(normalizeCityName('Sete Lagoas '), 'SETE LAGOAS');
    assert.strictEqual(normalizeCityName('Uberlândia'), 'UBERLANDIA');
    assert.strictEqual(normalizeCityName('Belo Horizonte - MG'), 'BELO HORIZONTE - MG');
  });

  it('Deve retornar dados demográficos do IBGE para Sete Lagoas e Uberlândia', async () => {
    const seteLagoas = await getCityDemographicData('Sete Lagoas', 'MG');
    assert.strictEqual(seteLagoas.populacaoEstimada, 241835);
    assert.ok(seteLagoas.frotaEletricaEstimada >= 700);

    const uberlandia = await getCityDemographicData('Uberlândia', 'MG');
    assert.strictEqual(uberlandia.populacaoEstimada, 713224);
    assert.ok(uberlandia.frotaEletricaEstimada > 3000);
  });

  it('Deve detectar Monopólio Natural DC quando há apenas carregadores AC lentos no raio', () => {
    const apiStations = [
      { id: '1', name: 'Posto Shell AC', lat: -19.46, lon: -44.25, powerKW: 7.4, isDC: false, distanceKm: 1.2 },
      { id: '2', name: 'Hotel Wallbox', lat: -19.47, lon: -44.26, powerKW: 22, isDC: false, distanceKm: 2.5 },
    ];

    const result = analyzeCompetition(apiStations, [], 5.0);
    assert.strictEqual(result.monopolioNaturalDC, true);
    assert.strictEqual(result.temConcorrenciaDCRaio, false);
    assert.strictEqual(result.totalCarregadoresLentosAC, 2);
    assert.strictEqual(result.totalCarregadoresRapidosDC, 0);
    assert.match(result.vereditoConcorrencia, /Monopólio Natural de Recarga Rápida DC/);
  });

  it('Deve considerar carregadores inseridos manualmente e identificar concorrente DC mais próximo com observação', () => {
    const apiStations = [
      { id: '1', name: 'Shopping AC', lat: -19.46, lon: -44.25, powerKW: 11, isDC: false, distanceKm: 1.5, observacao: 'Vagas no subsolo' },
    ];

    const manualStations = [
      { name: 'Eletroposto Rápido Ipiranga', powerKW: 60, isDC: true, distanceKm: 2.1, observacao: 'Acesso 24h na rodovia' },
      { name: 'Hotel Fazenda Wallbox', powerKW: 7.4, isDC: false, distanceKm: 3.2, observacao: 'Exclusivo para hóspedes' }
    ];

    const result = analyzeCompetition(apiStations, manualStations, 5.0);
    assert.strictEqual(result.monopolioNaturalDC, false);
    assert.strictEqual(result.temConcorrenciaDCRaio, true);
    assert.strictEqual(result.totalCarregadoresRapidosDC, 1);
    assert.strictEqual(result.totalCarregadoresLentosAC, 2);
    assert.strictEqual(result.concorrenteDCProximo?.nome, 'Eletroposto Rápido Ipiranga');
    assert.strictEqual(result.concorrenteDCProximo?.potenciaKW, 60);
    assert.strictEqual(result.concorrenteDCProximo?.distanciaKm, 2.1);
    assert.strictEqual(result.concorrenteDCProximo?.observacao, 'Acesso 24h na rodovia');
    assert.match(result.vereditoConcorrencia, /Acesso 24h na rodovia/);

    const hotelAc = result.concorrentesMapeados.find(s => s.nome === 'Hotel Fazenda Wallbox');
    assert.ok(hotelAc);
    assert.strictEqual(hotelAc?.potenciaKW, 7.4);
    assert.strictEqual(hotelAc?.isDC, false);
    assert.strictEqual(hotelAc?.observacao, 'Exclusivo para hóspedes');
  });

  it('Deve manter Monopólio Natural DC e detalhar potências e observações quando houver apenas concorrentes manuais AC de 7.4 kW', () => {
    const manualStations = [
      { name: 'Carregador Concessionária', powerKW: 7.4, isDC: false, distanceKm: 1.8, observacao: 'Uso restrito para clientes da marca' }
    ];

    const result = analyzeCompetition([], manualStations, 5.0);
    assert.strictEqual(result.monopolioNaturalDC, true);
    assert.strictEqual(result.totalCarregadoresLentosAC, 1);
    assert.strictEqual(result.totalCarregadoresRapidosDC, 0);
    assert.match(result.vereditoConcorrencia, /Monopólio Natural de Recarga Rápida DC/);
    assert.match(result.vereditoConcorrencia, /7\.4 kW/);
    assert.match(result.vereditoConcorrencia, /Uso restrito para clientes da marca/);
  });

  it('Deve permitir modificar o valor do Idle Fee e tolerância conforme configurado pelo usuário', () => {
    // Padrão (R$ 1,50/min e 15 min)
    const defaultFee = calculateIdleFeeProjection(20);
    assert.strictEqual(defaultFee.feePerMinute, 1.50);
    assert.strictEqual(defaultFee.graceMinutes, 15);
    assert.match(defaultFee.regraTexto, /R\$ 1\.50\/minuto/);
    assert.match(defaultFee.regraTexto, /15 minutos/);

    // Customizado pelo usuário (R$ 2,00/min e 10 min)
    const customFee = calculateIdleFeeProjection(25, { feePerMinute: 2.00, graceMinutes: 10 });
    assert.strictEqual(customFee.feePerMinute, 2.00);
    assert.strictEqual(customFee.graceMinutes, 10);
    assert.match(customFee.regraTexto, /R\$ 2\.00\/minuto/);
    assert.match(customFee.regraTexto, /10 minutos/);
    assert.ok(customFee.receitaMensalEstimadaBRL > 0);
  });

  it('Deve sintetizar o diagnóstico executivo completo com score AHP e veredito GO', async () => {
    const ibge = await getCityDemographicData('Sete Lagoas', 'MG');
    const concorrencia = analyzeCompetition([], [], 5.0); // monopólio
    const idleFee = calculateIdleFeeProjection(20, { feePerMinute: 1.50, graceMinutes: 15 });

    const summary = buildLocationExecutiveSummary({
      enderecoFormatado: 'Rua Carlos Antônio Giordani, 1580, Sete Lagoas - MG',
      lat: -19.47034,
      lon: -44.2634,
      cidade: 'Sete Lagoas',
      uf: 'MG',
      ibge,
      via: {
        tipoVia: 'arterial',
        nomeVia: 'Rua Carlos Antônio Giordani',
        velocidadeEstimadaKmh: 60,
        pontosInteresse500m: [{ tipo: 'conveniencia', nome: 'Galeria 24h', distanciaMetros: 20 }],
        totalComercios500m: 4
      },
      concorrencia,
      idleFee,
      ancoraComercialTipo: 'Galeria de Lojas 24h',
      proprietarioImovel: 'Sr. Saint Clair',
      clienteContratante: 'Coenergy'
    });

    assert.ok(summary.scoreAHP >= 8.5);
    assert.strictEqual(summary.vereditoGeral, 'GO — ALTAMENTE RECOMENDADO');
    assert.match(summary.resumoExecutivoTexto, /Sr\. Saint Clair/);
    assert.match(summary.resumoExecutivoTexto, /Coenergy/);
    assert.match(summary.resumoExecutivoTexto, /Sete Lagoas/);
    assert.match(summary.resumoExecutivoTexto, /Monopólio Natural de Recarga Rápida DC/);
    assert.ok(Array.isArray(summary.resumoExecutivoParagrafos));
    assert.strictEqual(summary.resumoExecutivoParagrafos?.length, 4);
    assert.doesNotMatch(summary.resumoExecutivoTexto, /regra de Aplicação compulsória de Sobretaxa de Ociosidade/i);
  });
});
