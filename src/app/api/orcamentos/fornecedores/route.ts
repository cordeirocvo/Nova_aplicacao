import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const busca = searchParams.get("q");

    const where: any = {};
    if (busca) {
      where.OR = [
        { razaoSocial: { contains: busca, mode: "insensitive" } },
        { contatoNome: { contains: busca, mode: "insensitive" } },
        { contatoEmail: { contains: busca, mode: "insensitive" } },
        { contatoTelefone: { contains: busca, mode: "insensitive" } }
      ];
    }

    const fornecedores = await prisma.fornecedor.findMany({
      where,
      orderBy: { razaoSocial: "asc" },
      include: {
        _count: {
          select: {
            projetos: true,
            propostas: true
          }
        }
      }
    });

    // Enriquecer com estatísticas de cotações da IA (CotacaoHistorico)
    const cotacoesPorFornecedor = await prisma.cotacaoHistorico.groupBy({
      by: ["fornecedorNome"],
      _count: {
        id: true
      },
      _max: {
        createdAt: true
      }
    });

    const mapaCotacoes = new Map<string, { total: number; ultimaData: Date | null }>();
    cotacoesPorFornecedor.forEach(c => {
      if (c.fornecedorNome) {
        mapaCotacoes.set(c.fornecedorNome.toLowerCase().trim(), {
          total: c._count.id,
          ultimaData: c._max.createdAt
        });
      }
    });

    const enriquecidos = fornecedores.map(f => {
      const stats = mapaCotacoes.get(f.razaoSocial.toLowerCase().trim());
      return {
        ...f,
        totalCotacoesIA: stats?.total || 0,
        ultimaCotacaoIA: stats?.ultimaData || null
      };
    });

    return NextResponse.json({ success: true, fornecedores: enriquecidos });
  } catch (error: any) {
    console.error("Erro ao listar fornecedores:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao buscar fornecedores" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razaoSocial, contatoNome, contatoEmail, contatoTelefone } = body;

    if (!razaoSocial || !razaoSocial.trim()) {
      return NextResponse.json(
        { success: false, error: "Razão Social é obrigatória" },
        { status: 400 }
      );
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        razaoSocial: razaoSocial.trim(),
        contatoNome: contatoNome?.trim() || null,
        contatoEmail: contatoEmail?.trim() || null,
        contatoTelefone: contatoTelefone?.trim() || null
      }
    });

    return NextResponse.json({ success: true, fornecedor });
  } catch (error: any) {
    console.error("Erro ao cadastrar fornecedor:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao cadastrar fornecedor" },
      { status: 500 }
    );
  }
}
