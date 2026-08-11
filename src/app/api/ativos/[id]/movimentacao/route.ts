import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { tipo, responsavel, destino, observacoes, data } = body;

    if (!tipo || !responsavel) {
      return NextResponse.json({ error: "Tipo de movimentação (SAIDA/RETORNO) e responsável são obrigatórios." }, { status: 400 });
    }

    const asset = await prisma.ativo.findUnique({
      where: { id }
    });

    if (!asset) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    const movement = await prisma.movimentacaoAtivo.create({
      data: {
        ativoId: id,
        tipo,
        responsavel,
        destino: tipo === "SAIDA" ? (destino || "Obra") : "Almoxarifado",
        observacoes: observacoes || null,
        data: data ? new Date(data) : new Date()
      }
    });

    const updatedAsset = await prisma.ativo.update({
      where: { id },
      data: {
        status: tipo === "SAIDA" ? "EM_USO" : "DISPONIVEL",
        responsavel: tipo === "SAIDA" ? responsavel : null,
        localizacao: tipo === "SAIDA" ? (destino || "Obra") : "Almoxarifado"
      }
    });

    return NextResponse.json({ movement, asset: updatedAsset });
  } catch (error: any) {
    console.error("Error logging asset movement:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
