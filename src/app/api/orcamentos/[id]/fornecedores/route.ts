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
