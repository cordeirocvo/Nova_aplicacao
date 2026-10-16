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

    // Puxar dados mestre atualizados do CAPEX (OrcamentoItemPadrao) como Fonte Única da Verdade
    try {
      const capexItens = await prisma.orcamentoItemPadrao.findMany({
        where: {
          codigo: { in: materiais.map(m => m.codigo) }
        }
      });
      const mapCapex = new Map(capexItens.map(c => [c.codigo, c]));
      materiais.forEach((m: any) => {
        const c = mapCapex.get(m.codigo);
        if (c) {
          if (c.precoBaseUnitario !== null && c.precoBaseUnitario > 0) {
            m.precoUnitario = c.precoBaseUnitario;
          }
          if (c.menorPreco !== null && c.menorPreco > 0) {
            m.menorPreco = c.menorPreco;
            m.fornecedorMenorPreco = c.fornecedorMenorPreco || m.fornecedorMenorPreco;
            m.numeroOrcamentoMenorPreco = c.numeroOrcamentoMenorPreco || m.numeroOrcamentoMenorPreco;
            m.dataUltimaCotacao = c.dataUltimaCotacao || m.dataUltimaCotacao;
          }
        }
      });
    } catch (e) {
      console.warn("Aviso ao sincronizar dados mestre do CAPEX com CEMIG:", e);
    }

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

    // Verificar menor preço existente
    const existing = await prisma.cemigMaterialPreco.findUnique({ where: { codigo } });
    const novoPrecoNum = Number(precoUnitario);
    const eMenor = !existing?.menorPreco || novoPrecoNum <= existing.menorPreco;

    const material = await prisma.cemigMaterialPreco.upsert({
      where: { codigo },
      update: {
        descricao,
        categoria,
        unidade: unidade || "un",
        precoUnitario: novoPrecoNum,
        menorPreco: eMenor ? novoPrecoNum : existing?.menorPreco,
        dataUltimaCotacao: new Date(),
        observacao: observacao || null,
        ativo: true
      },
      create: {
        codigo,
        descricao,
        categoria,
        unidade: unidade || "un",
        precoUnitario: novoPrecoNum,
        menorPreco: novoPrecoNum,
        dataUltimaCotacao: new Date(),
        observacao: observacao || null,
        ativo: true
      }
    });

    // Sincronizar simultaneamente com a base oficial do CAPEX (OrcamentoItemPadrao)
    try {
      const existingCapex = await prisma.orcamentoItemPadrao.findFirst({
        where: {
          OR: [
            { codigo },
            { descricao: { equals: descricao, mode: "insensitive" } }
          ]
        }
      });

      if (existingCapex) {
        await prisma.orcamentoItemPadrao.update({
          where: { id: existingCapex.id },
          data: {
            precoBaseUnitario: novoPrecoNum,
            menorPreco: !existingCapex.menorPreco || novoPrecoNum <= existingCapex.menorPreco ? novoPrecoNum : existingCapex.menorPreco,
            dataUltimaCotacao: new Date()
          }
        });
      } else {
        await prisma.orcamentoItemPadrao.create({
          data: {
            codigo,
            descricao,
            tipo: categoria === "MAO_DE_OBRA" ? "Mão de Obra" : "Material",
            unidade: unidade || "un",
            precoBaseUnitario: novoPrecoNum,
            menorPreco: novoPrecoNum,
            dataUltimaCotacao: new Date()
          }
        });
      }
    } catch (syncCapexErr) {
      console.warn("Aviso ao sincronizar material com CAPEX:", syncCapexErr);
    }

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("Erro ao salvar material CEMIG:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao salvar material" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { codigo, precoUnitario, observacao } = body;

    if (!codigo || precoUnitario === undefined) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios faltando (codigo, precoUnitario)" },
        { status: 400 }
      );
    }

    const novoPrecoNum = Number(precoUnitario);
    if (isNaN(novoPrecoNum) || novoPrecoNum < 0) {
      return NextResponse.json(
        { success: false, error: "Preço unitário inválido" },
        { status: 400 }
      );
    }

    const existing = await prisma.cemigMaterialPreco.findUnique({ where: { codigo } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Material com código ${codigo} não encontrado no catálogo CEMIG` },
        { status: 404 }
      );
    }

    const eMenor = !existing.menorPreco || novoPrecoNum <= existing.menorPreco;

    const material = await prisma.cemigMaterialPreco.update({
      where: { codigo },
      data: {
        precoUnitario: novoPrecoNum,
        menorPreco: eMenor ? novoPrecoNum : existing.menorPreco,
        dataUltimaCotacao: new Date(),
        ...(observacao ? { observacao } : {})
      }
    });

    // Sincronizar com OrcamentoItemPadrao (CAPEX)
    try {
      const existingCapex = await prisma.orcamentoItemPadrao.findFirst({
        where: {
          OR: [
            { codigo },
            { descricao: { equals: existing.descricao, mode: "insensitive" } }
          ]
        }
      });

      if (existingCapex) {
        await prisma.orcamentoItemPadrao.update({
          where: { id: existingCapex.id },
          data: {
            precoBaseUnitario: novoPrecoNum,
            menorPreco: !existingCapex.menorPreco || novoPrecoNum <= existingCapex.menorPreco ? novoPrecoNum : existingCapex.menorPreco,
            dataUltimaCotacao: new Date()
          }
        });
      }
    } catch (syncErr) {
      console.warn("Aviso ao sincronizar PATCH de preço com CAPEX:", syncErr);
    }

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("Erro no PATCH de material CEMIG:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar preço do material" },
      { status: 500 }
    );
  }
}

