import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Carregar o projeto original com etapas, itens, propostas e fornecedores
    const original = await prisma.orcamentoProjeto.findUnique({
      where: { id },
      include: {
        etapas: {
          include: {
            itens: {
              include: {
                propostas: true
              }
            }
          }
        },
        fornecedores: true
      }
    });

    if (!original) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    // Executar a duplicação dentro de uma transação Prisma
    const novoProjeto = await prisma.$transaction(async (tx) => {
      // 1. Criar o novo projeto duplicado
      const projetoDuplicado = await tx.orcamentoProjeto.create({
        data: {
          nome: `${original.nome} (Cópia)`,
          cliente: original.cliente,
          status: "Rascunho",
          idContaAzul: original.idContaAzul,
        }
      });

      // 2. Vincular os mesmos fornecedores ao novo projeto com tokens novos e únicos
      for (const f of original.fornecedores) {
        await tx.fornecedorOrcamento.create({
          data: {
            projetoId: projetoDuplicado.id,
            fornecedorId: f.fornecedorId,
            status: f.status,
            statusConvite: f.statusConvite,
            // Forçar a geração de um token único para evitar colisões em transações
            tokenAcesso: crypto.randomBytes(24).toString("hex"),
          }
        });
      }

      // 3. Duplicar etapas, itens e as propostas dos fornecedores
      for (const e of original.etapas) {
        const etapaDuplicada = await tx.orcamentoEtapa.create({
          data: {
            projetoId: projetoDuplicado.id,
            nome: e.nome,
            ordem: e.ordem,
          }
        });

        for (const item of e.itens) {
          const itemDuplicado = await tx.orcamentoItem.create({
            data: {
              etapaId: etapaDuplicada.id,
              codigo: item.codigo,
              descricao: item.descricao,
              tipo: item.tipo,
              unidade: item.unidade,
              quantidade: item.quantidade,
              precoBaseUnitario: item.precoBaseUnitario,
              bdiPercent: item.bdiPercent,
              imagemUrl: item.imagemUrl,
            }
          });

          // Duplicar as propostas vinculadas a este item
          for (const prop of item.propostas) {
            await tx.propostaItem.create({
              data: {
                itemId: itemDuplicado.id,
                fornecedorId: prop.fornecedorId,
                precoUnitario: prop.precoUnitario,
                observacao: prop.observacao,
                versao: prop.versao,
              }
            });
          }
        }
      }

      return projetoDuplicado;
    });

    return NextResponse.json({ success: true, id: novoProjeto.id });
  } catch (error: any) {
    console.error("Erro ao duplicar orçamento:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
