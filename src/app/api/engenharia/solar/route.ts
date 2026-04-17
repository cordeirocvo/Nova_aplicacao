import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const projetoId = req.nextUrl.searchParams.get('projetoId');
  const action = req.nextUrl.searchParams.get('action'); // 'pvgis' | 'get'
  
  if (action === 'pvgis') {
    const lat = req.nextUrl.searchParams.get('lat');
    const lon = req.nextUrl.searchParams.get('lon');
    const tilt = req.nextUrl.searchParams.get('tilt') || '0';
    const azimuth = req.nextUrl.searchParams.get('azimuth') || '0';

    if (!lat || !lon) return NextResponse.json({ error: 'Lat/Lon obrigatórios' }, { status: 400 });
    
    try {
      // PVcalc é mais preciso pois considera temperatura e perdas por reflexão
      // aspect: 0=South, 90=West, -90=East, 180=North.
      const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${lat}&lon=${lon}&peakpower=1&loss=14&angle=${tilt}&aspect=${azimuth}&outputformat=json`;
      const res = await fetch(url);
      const data = await res.json();
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao buscar dados PVcalc' }, { status: 500 });
    }
  }

  if (!projetoId) return NextResponse.json({ error: 'projetoId obrigatório' }, { status: 400 });

  try {
    const estudo = await prisma.estudoSolar.findUnique({
      where: { projetoId },
      include: {
        projeto: {
          include: { analiseFatura: true }
        }
      }
    });

    if (!estudo) {
      const projeto = await prisma.engeProjeto.findUnique({
        where: { id: projetoId },
        include: { analiseFatura: true, analiseMassa: { take: 1, orderBy: { createdAt: 'desc' } } }
      });
      return NextResponse.json({ projeto });
    }

    return NextResponse.json({ estudo });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projetoId, ...data } = body;

  try {
    const estudo = await prisma.estudoSolar.upsert({
      where: { projetoId },
      update: data,
      create: { projetoId, ...data },
    });
    return NextResponse.json(estudo);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
