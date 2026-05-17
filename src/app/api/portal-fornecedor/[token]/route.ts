import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const convite = await prisma.fornecedorOrcamento.findUnique({
      where: { tokenAcesso: token },
      include: {
        fornecedor: true,
        projeto: {
          include: {
            etapas: {
              orderBy: { ordem: "asc" },
              include: {
                itens: {
                  include: {
                    propostas: {
                      where: { fornecedorId: undefined } // Preenchido no processamento abaixo
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!convite) {
      return NextResponse.json({ error: "Token inválido" }, { status: 404 });
    }

    // Buscar as propostas deste fornecedor específico para os itens do projeto
    const propostas = await prisma.propostaItem.findMany({
      where: {
        fornecedorId: convite.fornecedorId,
        item: { etapa: { projetoId: convite.projetoId } }
      }
    });

    return NextResponse.json({ convite, propostas });
  } catch (error) {
    console.error("Erro no portal:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { propostas, finalizar } = await req.json(); // array of { itemId, precoUnitario, observacao }

    const convite = await prisma.fornecedorOrcamento.findUnique({
      where: { tokenAcesso: token },
    });

    if (!convite) return NextResponse.json({ error: "Token inválido" }, { status: 404 });

    // Salva/atualiza cada proposta
    for (const p of propostas) {
      await prisma.propostaItem.upsert({
        where: {
          itemId_fornecedorId_versao: {
            itemId: p.itemId,
            fornecedorId: convite.fornecedorId,
            versao: 1
          }
        },
        update: {
          precoUnitario: Number(p.precoUnitario) || 0,
          observacao: p.observacao,
          dataProposta: new Date()
        },
        create: {
          itemId: p.itemId,
          fornecedorId: convite.fornecedorId,
          precoUnitario: Number(p.precoUnitario) || 0,
          observacao: p.observacao,
        }
      });
    }

    if (finalizar) {
      await prisma.fornecedorOrcamento.update({
        where: { id: convite.id },
        data: { statusConvite: "Respondido" }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao salvar propostas:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
