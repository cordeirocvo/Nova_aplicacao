import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  try {
    let items;
    switch (tipo) {
      case 'inversores': items = await prisma.inversorSolar.findMany({ orderBy: { fabricante: 'asc' } }); break;
      case 'modulos': items = await prisma.moduloFotovoltaico.findMany({ orderBy: { fabricante: 'asc' } }); break;
      case 'baterias': items = await prisma.bateriaSistema.findMany({ orderBy: { fabricante: 'asc' } }); break;
      case 'estruturas': items = await prisma.estruturaFotovoltaica.findMany({ orderBy: { fabricante: 'asc' } }); break;
      case 'carregadores': items = await prisma.carregador.findMany({ orderBy: { brand: 'asc' } }); break;
      default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const data = await req.json();
  try {
    let item;
    switch (tipo) {
      case 'inversores': item = await prisma.inversorSolar.create({ data }); break;
      case 'modulos': item = await prisma.moduloFotovoltaico.create({ data }); break;
      case 'baterias': item = await prisma.bateriaSistema.create({ data }); break;
      case 'estruturas': item = await prisma.estruturaFotovoltaica.create({ data }); break;
      case 'carregadores': 
        const chargerData = {
          brand: data.fabricante,
          model: data.modelo,
          power: data.power,
          voltage: data.voltage,
          phases: data.phases,
          current: data.current,
          connectorType: data.connectorType,
          datasheetUrl: data.datasheetUrl
        };
        item = await prisma.carregador.create({ data: chargerData }); 
        break;
      default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error('API ERROR [POST]:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  try {
    let item;
    switch (tipo) {
      case 'inversores': item = await prisma.inversorSolar.update({ where: { id }, data }); break;
      case 'modulos': item = await prisma.moduloFotovoltaico.update({ where: { id }, data }); break;
      case 'baterias': item = await prisma.bateriaSistema.update({ where: { id }, data }); break;
      case 'estruturas': item = await prisma.estruturaFotovoltaica.update({ where: { id }, data }); break;
      case 'carregadores':
        const chargerUpdate = {
          brand: data.fabricante,
          model: data.modelo,
          power: data.power,
          voltage: data.voltage,
          phases: data.phases,
          current: data.current,
          connectorType: data.connectorType,
          datasheetUrl: data.datasheetUrl
        };
        item = await prisma.carregador.update({ where: { id }, data: chargerUpdate });
        break;
      default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  try {
    switch (tipo) {
      case 'inversores': await prisma.inversorSolar.delete({ where: { id } }); break;
      case 'modulos': await prisma.moduloFotovoltaico.delete({ where: { id } }); break;
      case 'baterias': await prisma.bateriaSistema.delete({ where: { id } }); break;
      case 'estruturas': await prisma.estruturaFotovoltaica.delete({ where: { id } }); break;
      case 'carregadores': await prisma.carregador.delete({ where: { id } }); break;
      default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
