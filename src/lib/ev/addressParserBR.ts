/**
 * Utilitário de Normalização e Parsing de Endereços Brasileiros (CNEFE / IBGE / Correios)
 * Inspirado nas melhores práticas do pacote geocodebr (IPEA) e padrões GeoJSON.
 */

export interface ParsedAddressBR {
  raw: string;
  streetType?: string;      // Rua, Avenida, Rodovia, etc.
  streetName?: string;      // Nome do logradouro sem o tipo
  fullStreet?: string;      // Tipo + Nome
  number?: string;          // Número predial ou km
  complement?: string;      // Apto, Bloco, Galpão, Loja
  neighborhood?: string;    // Bairro
  city?: string;            // Município
  state?: string;           // UF (MG, SP, etc.)
  postalCode?: string;      // CEP normalizado (00000-000)
  directCoords?: { lat: number; lon: number };
}

// Dicionário de padronização de tipos de logradouros (Referência CNEFE / IBGE)
const LOGRADOUROS_MAP: Record<string, string> = {
  'R': 'Rua',
  'R.': 'Rua',
  'RUA': 'Rua',
  'AV': 'Avenida',
  'AV.': 'Avenida',
  'AVENIDA': 'Avenida',
  'AL': 'Alameda',
  'AL.': 'Alameda',
  'ALAMEDA': 'Alameda',
  'TR': 'Travessa',
  'TV': 'Travessa',
  'TV.': 'Travessa',
  'TRAVESSA': 'Travessa',
  'ROD': 'Rodovia',
  'ROD.': 'Rodovia',
  'RODOVIA': 'Rodovia',
  'ESTR': 'Estrada',
  'ESTR.': 'Estrada',
  'ESTRADA': 'Estrada',
  'PC': 'Praça',
  'PCA': 'Praça',
  'PÇA': 'Praça',
  'PÇA.': 'Praça',
  'PRACA': 'Praça',
  'PRAÇA': 'Praça',
  'LGO': 'Largo',
  'LARGO': 'Largo',
  'VL': 'Vila',
  'VILA': 'Vila'
};

// Siglas de Estados Brasileiros
const UFS_BRASIL = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

/**
 * Remove acentuação e converte para maiúsculas para comparações semânticas
 */
export function removeAcentos(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Extrai coordenadas geográficas diretas (lat, lon) de texto ou link do Google Maps
 */
export function extractDirectCoordinates(text: string): { lat: number; lon: number } | null {
  if (!text) return null;

  // 1. Padrão numérico decimal: "-19.4703402, -44.2634043" ou "-19.4703402 -44.2634043"
  const regexCoord = /(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/;
  const matchCoord = text.match(regexCoord);
  if (matchCoord) {
    const lat = parseFloat(matchCoord[1]);
    const lon = parseFloat(matchCoord[2]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -35 && lat <= 6 && lon >= -75 && lon <= -30) {
      return { lat, lon };
    }
  }

  // 2. Links do Google Maps (@lat,lon ou ?q=lat,lon)
  const regexGmaps = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)|[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;
  const matchG = text.match(regexGmaps);
  if (matchG) {
    const lat = parseFloat(matchG[1] || matchG[3]);
    const lon = parseFloat(matchG[2] || matchG[4]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -35 && lat <= 6 && lon >= -75 && lon <= -30) {
      return { lat, lon };
    }
  }

  return null;
}

/**
 * Analisa e estrutura um endereço no formato padrão brasileiro (CNEFE / IBGE)
 */
export function parseAddressBR(rawAddress: string): ParsedAddressBR {
  const result: ParsedAddressBR = { raw: rawAddress.trim() };
  if (!rawAddress) return result;

  // 1. Checa coordenadas diretas
  const coords = extractDirectCoordinates(rawAddress);
  if (coords) {
    result.directCoords = coords;
  }

  // 2. Extrai CEP se presente (ex: 35700-750 ou 35700750)
  const cepMatch = rawAddress.match(/\b(\d{5})[-.\s]?(\d{3})\b/);
  if (cepMatch) {
    result.postalCode = `${cepMatch[1]}-${cepMatch[2]}`;
  }

  // 3. Limpa o CEP e caracteres especiais do texto principal
  let cleanText = rawAddress
    .replace(/\b\d{5}[-.\s]?\d{3}\b/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Extrai UF (ex: "- MG", "/MG", ", MG")
  const ufMatch = cleanText.match(/[-/,]\s*([A-Za-z]{2})\b/);
  if (ufMatch) {
    const candidateUf = ufMatch[1].toUpperCase();
    if (UFS_BRASIL.has(candidateUf)) {
      result.state = candidateUf;
      cleanText = cleanText.replace(ufMatch[0], '').trim();
    }
  }

  // 5. Extrai Bairro (identificado por "Bairro ...", "Jardim ...", "Vila ...", etc)
  const bairroMatch = cleanText.match(/[-–]\s*(?:Bairro\s+)?([A-Za-zÀ-ÿ0-9\s]+?)(?:,\s*|\s*[-–]\s*|$)/i);
  if (bairroMatch && bairroMatch[1]) {
    const candidateBairro = bairroMatch[1].trim();
    if (!candidateBairro.toLowerCase().includes('lagoas') && !candidateBairro.toLowerCase().includes('uberlandia')) {
      result.neighborhood = candidateBairro.replace(/^Bairro\s+/i, '');
    }
  }

  // 6. Extrai Número Predial
  const numberMatch = cleanText.match(/,\s*(\d+[A-Za-z]?|\b[sS]\/[nN]\b|\bKM\s*\d+\b)/i);
  if (numberMatch) {
    result.number = numberMatch[1].trim();
  }

  // 7. Extrai Logradouro e Tipo
  const parts = cleanText.split(/[,–-]/);
  const mainPart = parts[0].trim();
  const words = mainPart.split(/\s+/);
  const firstWordUpper = removeAcentos(words[0].toUpperCase());

  if (LOGRADOUROS_MAP[firstWordUpper]) {
    result.streetType = LOGRADOUROS_MAP[firstWordUpper];
    result.streetName = words.slice(1).join(' ').trim();
    result.fullStreet = `${result.streetType} ${result.streetName}`;
  } else {
    result.fullStreet = mainPart;
  }

  // 8. Extrai Cidade se presente no final
  const cidadesComuns = [
    'Sete Lagoas', 'Uberlândia', 'Uberlandia', 'Montes Claros',
    'Curvelo', 'Belo Horizonte', 'Contagem', 'Betim',
    'Juiz de Fora', 'São Paulo', 'Campinas'
  ];
  for (const cid of cidadesComuns) {
    if (new RegExp(`\\b${cid}\\b`, 'i').test(rawAddress)) {
      result.city = cid === 'Uberlandia' ? 'Uberlândia' : cid;
      break;
    }
  }

  return result;
}

/**
 * Prepara uma query limpa e precisa para envio aos motores de busca (Photon / Nominatim)
 * Remove ruídos como "Bairro ...", traços ou complementos desnecessários
 */
export function cleanStreetQueryForSearch(parsed: ParsedAddressBR): string {
  const parts: string[] = [];

  if (parsed.fullStreet) {
    let streetWithNumber = parsed.fullStreet;
    if (parsed.number && parsed.number.toLowerCase() !== 's/n') {
      streetWithNumber += `, ${parsed.number}`;
    }
    parts.push(streetWithNumber);
  }

  if (parsed.neighborhood && parts.length === 0) {
    parts.push(parsed.neighborhood);
  }

  if (parsed.city) {
    parts.push(parsed.city);
  }

  if (parsed.state) {
    parts.push(parsed.state);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback para raw sem caracteres especiais
  return parsed.raw
    .replace(/[-–]\s*bairro\s*[^,-]+/gi, '')
    .replace(/bairro\s*[^,-]+/gi, '')
    .trim();
}

/**
 * Blindagem de Sistemas de Coordenadas (CRS):
 * - Leaflet espera: [latitude, longitude]
 * - GeoJSON espera: [longitude, latitude]
 */
export function toLeafletCoords(lat: number, lon: number): [number, number] {
  return [Number(lat.toFixed(7)), Number(lon.toFixed(7))];
}

export function toGeoJSONCoords(lat: number, lon: number): [number, number] {
  return [Number(lon.toFixed(7)), Number(lat.toFixed(7))];
}
