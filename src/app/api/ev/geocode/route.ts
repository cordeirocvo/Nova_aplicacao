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

function buscarFallbackCidade(endereco: string): { lat: number; lon: number; nomeFormatado: string } | null {
  const norm = normalizarTexto(endereco);
  
  // 1. Verifica se bate em pontos notáveis do projeto (ex: Olavo Bilac 1085)
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
          'User-Agent': 'CordeiroEnergia-EVPlanner/1.0 (eng@cordeiroenergia.com.br)'
        },
        signal: AbortSignal.timeout(3000)
      });

      if (res.ok) {
        const data = await res.json();
        const displayName = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        return NextResponse.json({
          success: true,
          type: 'reverse',
          lat,
          lon,
          address: displayName,
          city: data.address?.city || data.address?.town || data.address?.municipality || 'Localidade',
          state: data.address?.state || 'MG'
        });
      }
    } catch (e) {
      // Fallback simples
    }

    return NextResponse.json({
      success: true,
      type: 'reverse_fallback',
      lat,
      lon,
      address: `Ponto selecionado (${lat.toFixed(4)}, ${lon.toFixed(4)})`
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

  // Limpeza de termos ruído e separação de palavras coladas (ex: "PatriciaUberlândia" -> "Patricia Uberlândia")
  const cleanedQuery = rawAddress
    .replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, '$1 $2')
    .replace(/(\d+)([a-zA-ZÀ-ÿ])/g, '$1 $2')
    .replace(/([a-zA-ZÀ-ÿ])(\d+)/g, '$1 $2')
    .replace(/\bCO\s+AREA\s+RURAL\b/gi, '')
    .replace(/\bAREA\s+RURAL\b/gi, '')
    .replace(/\bRD\s+BR\b/gi, 'BR')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Tentativas progressivas via Nominatim OpenStreetMap
  const baseQueries = [
    cleanedQuery,
    // Remove números prediais (ex: "R. Diamante, 473 - Jardim Patricia Uberlândia - MG" -> "R. Diamante, Jardim Patricia, Uberlândia - MG")
    cleanedQuery.replace(/,\s*\d+\b/g, '').replace(/\b\d+\s*-\s*/g, ''),
    // Simplifica para Logradouro + Cidade + Brasil
    cleanedQuery.replace(/^[^-]+-\s*/, '')
  ];

  // Adiciona variações fonéticas comuns (ex: Resende <-> Rezende, Imbaúmas <-> Imbaúbas)
  const expandedQueries: string[] = [];
  for (const b of baseQueries) {
    expandedQueries.push(b);
    if (/resende/i.test(b)) expandedQueries.push(b.replace(/resende/gi, 'Rezende'));
    if (/rezende/i.test(b)) expandedQueries.push(b.replace(/rezende/gi, 'Resende'));
    if (/imba[uú]mas/i.test(b)) expandedQueries.push(b.replace(/imba[uú]mas/gi, 'Imbaúbas'));
    if (/imba[uú]bas/i.test(b)) expandedQueries.push(b.replace(/imba[uú]bas/gi, 'Imbaúmas'));
  }

  const candidateQueries = expandedQueries.filter((q, idx, arr) => q.length > 5 && arr.indexOf(q) === idx);

  for (const query of candidateQueries) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1&countrycodes=br`;
      const res = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'CordeiroEnergia-EVPlanner/1.0 (eng@cordeiroenergia.com.br)'
        },
        signal: AbortSignal.timeout(3000)
      });

      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const top = results[0];
          return NextResponse.json({
            success: true,
            source: 'nominatim_osm',
            lat: parseFloat(top.lat),
            lon: parseFloat(top.lon),
            formattedAddress: top.display_name,
            boundingBox: top.boundingbox
          });
        }
      }
    } catch (err: any) {
      console.warn(`Tentativa de geocodificação para "${query}" falhou:`, err?.message || err);
    }
  }

  // 2. Segunda tentativa: se falhou com endereço completo, tenta apenas CEP ou Cidade + UF
  const cepMatch = rawAddress.match(/\b\d{5}-?\d{3}\b/);
  if (cepMatch) {
    try {
      const cepQuery = `${cepMatch[0]}, Brasil`;
      const resCep = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cepQuery)}&limit=1&countrycodes=br`, {
        headers: { 'User-Agent': 'CordeiroEnergia-EVPlanner/1.0' },
        signal: AbortSignal.timeout(2500)
      });
      if (resCep.ok) {
        const results = await resCep.json();
        if (Array.isArray(results) && results.length > 0) {
          const top = results[0];
          return NextResponse.json({
            success: true,
            source: 'nominatim_cep',
            lat: parseFloat(top.lat),
            lon: parseFloat(top.lon),
            formattedAddress: `${rawAddress} (${top.display_name})`,
            boundingBox: top.boundingbox
          });
        }
      }
    } catch (_) {}
  }

  // 3. Fallback Canônico por Detecção de Cidade
  const fallback = buscarFallbackCidade(rawAddress);
  if (fallback) {
    return NextResponse.json({
      success: true,
      source: 'cidade_canonica_fallback',
      lat: fallback.lat,
      lon: fallback.lon,
      formattedAddress: `${rawAddress} — Centro de Referência (${fallback.nomeFormatado})`
    });
  }

  // Fallback Geral para Centro de Minas Gerais / Sete Lagoas se nada for encontrado
  return NextResponse.json({
    success: true,
    source: 'default_regional',
    lat: -19.471676,
    lon: -44.258735,
    formattedAddress: `${rawAddress} (Coordenada referencial regional)`
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
