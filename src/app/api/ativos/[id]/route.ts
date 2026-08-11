import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const ativo = await prisma.ativo.findUnique({
      where: { id },
      include: {
        movimentacoes: {
          orderBy: { data: "desc" }
        },
        historicoUso: {
          orderBy: { dataUso: "desc" }
        }
      }
    });

    if (!ativo) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    return NextResponse.json(ativo);
  } catch (error: any) {
    console.error("Error fetching asset detail:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { nome, codigo, categoria, taxaHoraria, horasUso, horasManutencaoPreventiva, responsavel, localizacao, status } = body;

    const existing = await prisma.ativo.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    const updated = await prisma.ativo.update({
      where: { id },
      data: {
        nome,
        codigo,
        categoria,
        taxaHoraria: taxaHoraria !== undefined ? (taxaHoraria ? parseFloat(String(taxaHoraria)) : null) : undefined,
        horasUso: horasUso !== undefined ? parseFloat(String(horasUso)) : undefined,
        horasManutencaoPreventiva: horasManutencaoPreventiva !== undefined ? (horasManutencaoPreventiva ? parseFloat(String(horasManutencaoPreventiva)) : null) : undefined,
        responsavel,
        localizacao,
        status
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating asset:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.ativo.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
