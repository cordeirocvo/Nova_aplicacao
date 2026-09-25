import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposta = await prisma.cemigPropostaPadrao.findUnique({
      where: { id },
      include: {
        itens: {
          orderBy: { ordem: "asc" }
        }
      }
    });

    if (!proposta) {
      return NextResponse.json({ success: false, error: "Proposta não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, proposta });
  } catch (error: any) {
    console.error("Erro ao buscar proposta:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      clienteNome,
      clienteTelefone,
      clienteEmail,
      clienteDocumento,
      cidade,
      endereco,
      finalidade,
      potenciaCarregadorKW,
      modeloCarregador,
      tipoPadrao,
      disjuntorAmperes,
      faixaDemanda,
      ladoRede,
      tipoEstrutura,
      posteHomologado,
      caboEntrada,
      eletroduto,
      hastesQtde,
      valorMateriais,
      valorMaoDeObra,
      bdiMargem,
      valorDesconto,
      valorTotal,
      status,
      observacoes,
      itens
    } = body;

    // Atualiza a proposta principal
    const proposta = await prisma.cemigPropostaPadrao.update({
      where: { id },
      data: {
        clienteNome,
        clienteTelefone,
        clienteEmail,
        clienteDocumento,
        cidade,
        endereco,
        finalidade,
        potenciaCarregadorKW: potenciaCarregadorKW ? Number(potenciaCarregadorKW) : null,
        modeloCarregador,
        tipoPadrao,
        disjuntorAmperes: Number(disjuntorAmperes),
        faixaDemanda,
        ladoRede,
        tipoEstrutura,
        posteHomologado,
        caboEntrada,
        eletroduto,
        hastesQtde: Number(hastesQtde || 2),
        valorMateriais: Number(valorMateriais || 0),
        valorMaoDeObra: Number(valorMaoDeObra || 0),
        bdiMargem: Number(bdiMargem || 0),
        valorDesconto: Number(valorDesconto || 0),
        valorTotal: Number(valorTotal || 0),
        status,
        observacoes
      }
    });

    // Se itens foram fornecidos, recria os itens vinculados
    if (Array.isArray(itens)) {
      await prisma.cemigPropostaItem.deleteMany({
        where: { propostaId: id }
      });

      await prisma.cemigPropostaItem.createMany({
        data: itens.map((item: any, idx: number) => ({
          propostaId: id,
          codigo: item.codigo || null,
          descricao: item.descricao,
          categoria: item.categoria || "GERAL",
          unidade: item.unidade || "un",
          quantidade: Number(item.quantidade || 1),
          precoUnitario: Number(item.precoUnitario || 0),
          precoTotal: Number(item.precoTotal || (Number(item.quantidade || 1) * Number(item.precoUnitario || 0))),
          ordem: idx
        }))
      });
    }

    const propostaCompleta = await prisma.cemigPropostaPadrao.findUnique({
      where: { id },
      include: {
        itens: {
          orderBy: { ordem: "asc" }
        }
      }
    });

    return NextResponse.json({ success: true, proposta: propostaCompleta });
  } catch (error: any) {
    console.error("Erro ao atualizar proposta:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar proposta" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.cemigPropostaPadrao.delete({
      where: { id }
    });
    return NextResponse.json({ success: true, message: "Proposta excluída com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir proposta:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir proposta" }, { status: 500 });
  }
}
