import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoria = searchParams.get("categoria");
    const busca = searchParams.get("q");

    const where: any = { ativo: true };
    if (categoria && categoria !== "TODAS") {
      where.categoria = categoria;
    }
    if (busca) {
      where.OR = [
        { descricao: { contains: busca, mode: "insensitive" } },
        { codigo: { contains: busca, mode: "insensitive" } },
        { observacao: { contains: busca, mode: "insensitive" } }
      ];
    }

    const materiais = await prisma.cemigMaterialPreco.findMany({
      where,
      orderBy: [{ categoria: "asc" }, { descricao: "asc" }]
    });

    return NextResponse.json({ success: true, materiais });
  } catch (error: any) {
    console.error("Erro ao listar materiais CEMIG:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar materiais CEMIG" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { codigo, descricao, categoria, unidade, precoUnitario, observacao } = body;

    if (!codigo || !descricao || !categoria || precoUnitario === undefined) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios faltando (codigo, descricao, categoria, precoUnitario)" },
        { status: 400 }
      );
    }

    const material = await prisma.cemigMaterialPreco.upsert({
      where: { codigo },
      update: {
        descricao,
        categoria,
        unidade: unidade || "un",
        precoUnitario: Number(precoUnitario),
        observacao: observacao || null,
        ativo: true
      },
      create: {
        codigo,
        descricao,
        categoria,
        unidade: unidade || "un",
        precoUnitario: Number(precoUnitario),
        observacao: observacao || null,
        ativo: true
      }
    });

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("Erro ao salvar material CEMIG:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao salvar material" },
      { status: 500 }
    );
  }
}
