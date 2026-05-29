import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { razaoSocial, contatoNome, contatoEmail, contatoTelefone, xmlItems } = await req.json();

    if (!razaoSocial) {
      return NextResponse.json({ error: "Razão social é obrigatória" }, { status: 400 });
    }

    // Cria o fornecedor e já vincula ao projeto
    const fornecedor = await prisma.fornecedor.create({
      data: {
        razaoSocial,
        contatoNome,
        contatoEmail,
        contatoTelefone,
        projetos: {
          create: {
            projetoId: id,
          }
        }
      },
    });

    if (xmlItems && xmlItems.length > 0) {
      // Fetch existing EAP items for this project
      const etapas = await prisma.orcamentoEtapa.findMany({
        where: { projetoId: id },
        include: { itens: true }
      });
      const allEapItems = etapas.flatMap(e => e.itens);

      const propostasToCreate = [];

      for (const xmlItem of xmlItems) {
        // Try to find a match by description
        const xmlDesc = xmlItem.descricao.toLowerCase();
        const match = allEapItems.find(i => 
          xmlDesc.includes(i.descricao.toLowerCase()) || i.descricao.toLowerCase().includes(xmlDesc)
        );

        if (match) {
          propostasToCreate.push({
            itemId: match.id,
            fornecedorId: fornecedor.id,
            precoUnitario: xmlItem.precoUnitario,
            observacao: "Importado via XML"
          });
        }
      }

      if (propostasToCreate.length > 0) {
        await prisma.propostaItem.createMany({
          data: propostasToCreate
        });
      }
    }

    return NextResponse.json({ success: true, fornecedor });
  } catch (error) {
    console.error("Erro ao adicionar fornecedor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { fornecedorId, propostas } = await req.json(); // array de { itemId, precoUnitario }

    if (!fornecedorId || !propostas) {
      return NextResponse.json({ error: "Fornecedor ID e propostas são obrigatórios" }, { status: 400 });
    }

    // Salvar/atualizar cada proposta enviada
    for (const p of propostas) {
      await prisma.propostaItem.upsert({
        where: {
          itemId_fornecedorId_versao: {
            itemId: p.itemId,
            fornecedorId,
            versao: 1
          }
        },
        update: {
          precoUnitario: parseFloat(String(p.precoUnitario).replace(",", ".")) || 0,
          dataProposta: new Date()
        },
        create: {
          itemId: p.itemId,
          fornecedorId,
          precoUnitario: parseFloat(String(p.precoUnitario).replace(",", ".")) || 0,
        }
      });
    }

    // Garantir que o status do convite esteja como Respondido
    await prisma.fornecedorOrcamento.updateMany({
      where: {
        projetoId: id,
        fornecedorId
      },
      data: {
        statusConvite: "Respondido"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao atualizar cotação do fornecedor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const fornecedorId = searchParams.get("fornecedorId");

    if (!fornecedorId) {
      return NextResponse.json({ error: "Fornecedor ID é obrigatório" }, { status: 400 });
    }

    // Excluir todas as propostas desse fornecedor nos itens desse projeto
    await prisma.propostaItem.deleteMany({
      where: {
        fornecedorId,
        item: { etapa: { projetoId: id } }
      }
    });

    // Resetar o status do convite para Pendente
    await prisma.fornecedorOrcamento.updateMany({
      where: {
        projetoId: id,
        fornecedorId
      },
      data: {
        statusConvite: "Pendente"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar cotação do fornecedor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

