import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projetoId = searchParams.get("projetoId");

    if (id) {
      const usina = await prisma.usinaFotovoltaica.findUnique({
        where: { id },
        include: { equipamentos: true, manutencoes: true, projeto: true },
      });
      return NextResponse.json(usina);
    }

    if (projetoId) {
      const usina = await prisma.usinaFotovoltaica.findUnique({
        where: { projetoId },
        include: { equipamentos: true, manutencoes: true, projeto: true },
      });
      return NextResponse.json(usina);
    }

    const usinas = await prisma.usinaFotovoltaica.findMany({
      include: {
        projeto: { select: { nome: true, cliente: true } },
        _count: { select: { equipamentos: true, manutencoes: true } },
      },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(usinas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const usina = await prisma.usinaFotovoltaica.create({
      data: {
        projetoId: data.projetoId,
        nome: data.nome,
        localizacao: data.localizacao,
      },
    });
    return NextResponse.json(usina);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const usina = await prisma.usinaFotovoltaica.update({
      where: { id: data.id },
      data: {
        nome: data.nome,
        localizacao: data.localizacao,
      },
    });
    return NextResponse.json(usina);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.usinaFotovoltaica.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
