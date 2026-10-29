import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      itens = [],
      projetoNome = "Projeto Eletroposto VE",
      solicitante = "Engenharia Cordeiro",
      observacao = ""
    } = body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum item informado para solicitação de cotação." },
        { status: 400 }
      );
    }

    let novosCadastrados = 0;
    let atualizados = 0;

    for (const it of itens) {
      const desc = it.descricao?.trim();
      if (!desc) continue;

      const existing = await prisma.orcamentoItemPadrao.findFirst({
        where: {
          OR: [
            it.codigo ? { codigo: it.codigo } : undefined,
            { descricao: { equals: desc, mode: "insensitive" } }
          ].filter(Boolean) as any
        }
      });

      if (!existing) {
        const codNovo = it.codigo || `SOLIC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        await prisma.orcamentoItemPadrao.create({
          data: {
            codigo: codNovo,
            descricao: desc,
            tipo: "Material",
            unidade: it.unidade || "un",
            precoBaseUnitario: it.precoAtual || null,
            menorPreco: it.precoAtual || null,
            fornecedorMenorPreco: "SOLICITADO_COMPRAS",
            numeroOrcamentoMenorPreco: "PENDENTE_COMPRAS",
            dataUltimaCotacao: new Date()
          }
        });
        novosCadastrados++;
      } else {
        await prisma.orcamentoItemPadrao.update({
          where: { id: existing.id },
          data: {
            fornecedorMenorPreco: existing.fornecedorMenorPreco || "SOLICITADO_COMPRAS",
            numeroOrcamentoMenorPreco: "PENDENTE_COMPRAS",
            dataUltimaCotacao: new Date()
          }
        });
        atualizados++;
      }
    }

    console.info(`[COMPRAS & SUPRIMENTOS] Solicitação de cotação recebida para ${itens.length} itens do projeto "${projetoNome}" por ${solicitante}.`);

    return NextResponse.json({
      success: true,
      totalItens: itens.length,
      novosCadastrados,
      atualizados,
      message: `Solicitação com ${itens.length} itens encaminhada à equipe de compras com sucesso!`
    });
  } catch (error: any) {
    console.error("Erro ao solicitar cotação em lote:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar solicitação de compras." },
      { status: 500 }
    );
  }
}
