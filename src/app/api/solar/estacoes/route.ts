import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const estacoes = await prisma.estacaoSolarimetrica.findMany({
      orderBy: { nome: "asc" }
    });
    return NextResponse.json(estacoes);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar estações" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      nome, apiFornecedor, apiId, localizacao
    } = body;

    const estacao = await prisma.estacaoSolarimetrica.create({
      data: {
        nome,
        apiFornecedor: apiFornecedor || "ISOFEN",
        apiId,
        localizacao
      }
    });

    return NextResponse.json(estacao);
  } catch (error) {
    console.error("Erro ao criar estação:", error);
    return NextResponse.json({ error: "Erro interno ao cadastrar estação" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const data = await req.json();

    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    const estacao = await prisma.estacaoSolarimetrica.update({
      where: { id },
      data: {
        nome: data.nome,
        apiFornecedor: data.apiFornecedor,
        apiId: data.apiId,
        localizacao: data.localizacao
      }
    });

    return NextResponse.json(estacao);
  } catch (error) {
    console.error("Erro ao atualizar estação:", error);
    return NextResponse.json({ error: "Falha ao atualizar estação" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    await prisma.estacaoSolarimetrica.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir estação" }, { status: 500 });
  }
}
