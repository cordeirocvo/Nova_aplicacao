import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endereco = searchParams.get('endereco');
    let latParam = searchParams.get('lat');
    let lngParam = searchParams.get('lng');

    let finalLat = parseFloat(latParam || '0');
    let finalLng = parseFloat(lngParam || '0');

    // 1. Obter Geo-Coordenadas (OpenStreetMap Nominatim)
    if (endereco && (!finalLat || !finalLng)) {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1`;
      const resGeo = await fetch(geoUrl, {
        headers: { 'User-Agent': 'CordeiroEnergia-App/1.0' }
      });
      if (resGeo.ok) {
        const geoData = await resGeo.json();
        if (geoData && geoData.length > 0) {
          finalLat = parseFloat(geoData[0].lat);
          finalLng = parseFloat(geoData[0].lon);
        } else {
          return NextResponse.json({ error: 'Endereço não encontrado para gerar as coordenadas.' }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: 'Falha na busca de coordenadas (Nominatim).' }, { status: 502 });
      }
    }

    if (!finalLat || !finalLng) {
      return NextResponse.json({ error: 'Lat/Lng não providenciados e endereço não encontrado.' }, { status: 400 });
    }

    // 2. Extrair Irradiação/HSP (PVGIS)
    // loss=14 é o default do sistema, peakpower=1 kWp (para o calculo diário virar HSP cru).
    const pvUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${finalLat}&lon=${finalLng}&peakpower=1&loss=14&outputformat=json`;
    const resPv = await fetch(pvUrl, {
      // Importante pra evitar bloqueios simples
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!resPv.ok) {
      const textError = await resPv.text();
      console.error("PVGIS API Error", textError);
      return NextResponse.json({ error: 'Falha na comunicação com PVGIS.', details: textError }, { status: 502 });
    }

    const pvData = await resPv.json();
    
    // O PVGIS retorna uma produção diária agregada (E_d) numa array de mensais, ou nos 'totals.fixed'
    // O valor Anual Diário Médio (Average daily energy production) é o HSP Exato do local.
    const hsp = pvData.outputs?.totals?.fixed?.E_d;

    return NextResponse.json({
      lat: finalLat,
      lng: finalLng,
      hsp: parseFloat(Number(hsp || 0).toFixed(2)),
      mensal: pvData.outputs?.monthly?.fixed || []
    }, { status: 200 });

  } catch (err: any) {
    console.error("Erro Irradiação API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
