import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    
    if (!usinaId) return NextResponse.json({ error: "usinaId required" }, { status: 400 });

    const data = await prisma.comissionamentoUsina.findMany({
      where: { usinaId },
      include: { profissional: true },
      orderBy: { data: "desc" },
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const comissionamento = await prisma.comissionamentoUsina.create({
      data: {
        usinaId: data.usinaId,
        tipo: data.tipo,
        data: new Date(data.data),
        responsavel: data.responsavel,
        crea: data.crea,
        profissionalId: data.profissionalId || null,
        numero: data.numero,
        dadosTecnicos: data.dadosTecnicos || [],
        observacoes: data.observacoes,
        status: data.status || "Concluído",
      },
    });
    return NextResponse.json(comissionamento);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const comissionamento = await prisma.comissionamentoUsina.update({
      where: { id: data.id },
      data: {
        tipo: data.tipo,
        data: data.data ? new Date(data.data) : undefined,
        responsavel: data.responsavel,
        crea: data.crea,
        profissionalId: data.profissionalId || null,
        numero: data.numero,
        dadosTecnicos: data.dadosTecnicos,
        observacoes: data.observacoes,
        status: data.status,
      },
    });
    return NextResponse.json(comissionamento);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.comissionamentoUsina.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
