import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    
    if (!usinaId) return NextResponse.json({ error: "usinaId required" }, { status: 400 });

    const equipamentos = await prisma.equipamentoUsina.findMany({
      where: { usinaId },
      orderBy: { tag: "asc" },
    });
    return NextResponse.json(equipamentos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const equipamento = await prisma.equipamentoUsina.create({
      data: {
        usinaId: data.usinaId,
        nome: data.nome,
        tag: data.tag,
        localizacao: data.localizacao,
        criticidade: data.criticidade,
        periodicidadeDias: data.periodicidadeDias ? parseInt(data.periodicidadeDias) : null,
        fotoBase64: data.fotoBase64 || null,
        anexos: data.anexos || null,
      },
    });
    return NextResponse.json(equipamento);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const equipamento = await prisma.equipamentoUsina.update({
      where: { id: data.id },
      data: {
        nome: data.nome,
        tag: data.tag,
        localizacao: data.localizacao,
        criticidade: data.criticidade,
        periodicidadeDias: data.periodicidadeDias ? parseInt(data.periodicidadeDias) : null,
        fotoBase64: data.fotoBase64 !== undefined ? data.fotoBase64 : undefined,
        anexos: data.anexos !== undefined ? data.anexos : undefined,
      },
    });
    return NextResponse.json(equipamento);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.equipamentoUsina.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
