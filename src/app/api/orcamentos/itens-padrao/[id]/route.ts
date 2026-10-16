import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      codigo,
      descricao,
      tipo,
      unidade,
      precoBaseUnitario,
      menorPreco,
      fornecedorMenorPreco,
      numeroOrcamentoMenorPreco
    } = body;

    const data: any = {};
    if (codigo !== undefined) data.codigo = codigo ? String(codigo).trim() : null;
    if (descricao !== undefined) data.descricao = String(descricao).trim();
    if (tipo !== undefined) data.tipo = String(tipo).trim();
    if (unidade !== undefined) data.unidade = String(unidade).trim();
    if (precoBaseUnitario !== undefined) {
      data.precoBaseUnitario = precoBaseUnitario !== null && precoBaseUnitario !== "" ? Number(precoBaseUnitario) : null;
    }
    if (menorPreco !== undefined) {
      data.menorPreco = menorPreco !== null && menorPreco !== "" ? Number(menorPreco) : null;
    }
    if (fornecedorMenorPreco !== undefined) {
      data.fornecedorMenorPreco = fornecedorMenorPreco ? String(fornecedorMenorPreco).trim() : null;
    }
    if (numeroOrcamentoMenorPreco !== undefined) {
      data.numeroOrcamentoMenorPreco = numeroOrcamentoMenorPreco ? String(numeroOrcamentoMenorPreco).trim() : null;
    }

    const itemAtualizado = await prisma.orcamentoItemPadrao.update({
      where: { id },
      data
    });

    // Sincronizar com CemigMaterialPreco se houver correspondência por código ou descrição
    try {
      const codigoBusca = itemAtualizado.codigo;
      if (codigoBusca) {
        const materialCemig = await prisma.cemigMaterialPreco.findUnique({
          where: { codigo: codigoBusca }
        });

        if (materialCemig && itemAtualizado.precoBaseUnitario !== null) {
          const novoPreco = itemAtualizado.precoBaseUnitario;
          const eMenor = !materialCemig.menorPreco || novoPreco <= materialCemig.menorPreco;

          await prisma.cemigMaterialPreco.update({
            where: { codigo: codigoBusca },
            data: {
              precoUnitario: novoPreco,
              menorPreco: eMenor ? novoPreco : materialCemig.menorPreco,
              fornecedorMenorPreco: itemAtualizado.fornecedorMenorPreco || materialCemig.fornecedorMenorPreco,
              numeroOrcamentoMenorPreco: itemAtualizado.numeroOrcamentoMenorPreco || materialCemig.numeroOrcamentoMenorPreco,
              dataUltimaCotacao: new Date()
            }
          });
        }
      }
    } catch (cemigSyncErr) {
      console.warn("Aviso ao sincronizar CEMIG:", cemigSyncErr);
    }

    return NextResponse.json({ success: true, item: itemAtualizado });
  } catch (error: any) {
    console.error("Erro ao atualizar item padrão:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao atualizar item padrão" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.orcamentoItemPadrao.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting standard item:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao excluir item" },
      { status: 500 }
    );
  }
}
