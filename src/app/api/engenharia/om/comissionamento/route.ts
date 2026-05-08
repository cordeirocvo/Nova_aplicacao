import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    const id = searchParams.get("id");
    
    if (id) {
      const report = await prisma.comissionamentoUsina.findUnique({
        where: { id },
        include: { profissional: true },
      });
      return NextResponse.json(report);
    }

    if (!usinaId) return NextResponse.json({ error: "usinaId or id required" }, { status: 400 });

    const data = await prisma.comissionamentoUsina.findMany({
      where: { usinaId },
      include: { profissional: true },
      orderBy: { data: "desc" },
    });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /comissionamento error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("POST /comissionamento payload:", data);

    // Validação de data para evitar crash do Prisma
    const reportDate = data.data ? new Date(data.data) : new Date();
    if (isNaN(reportDate.getTime())) {
       return NextResponse.json({ error: "Data inválida fornecida." }, { status: 400 });
    }

    const comissionamento = await prisma.comissionamentoUsina.create({
      data: {
        usinaId: data.usinaId,
        tipo: data.tipo || "Frio",
        data: reportDate,
        responsavel: data.responsavel || "",
        crea: data.crea || "",
        profissionalId: data.profissionalId || null,
        numero: data.numero || "",
        dadosTecnicos: Array.isArray(data.dadosTecnicos) ? data.dadosTecnicos : [],
        observacoes: data.observacoes || "",
        status: data.status || "Concluído",
      },
    });
    
    return NextResponse.json(comissionamento);
  } catch (error: any) {
    console.error("POST /comissionamento CRITICAL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    console.log("PATCH /comissionamento payload:", data);

    const reportDate = data.data ? new Date(data.data) : undefined;

    const comissionamento = await prisma.comissionamentoUsina.update({
      where: { id: data.id },
      data: {
        tipo: data.tipo,
        data: reportDate && !isNaN(reportDate.getTime()) ? reportDate : undefined,
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
    console.error("PATCH /comissionamento error:", error);
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
    console.error("DELETE /comissionamento error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
