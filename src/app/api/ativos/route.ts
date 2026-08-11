import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ativos = await prisma.ativo.findMany({
      include: {
        movimentacoes: {
          orderBy: { data: "desc" },
          take: 5
        },
        historicoUso: {
          orderBy: { dataUso: "desc" },
          take: 5
        }
      },
      orderBy: { nome: "asc" }
    });

    return NextResponse.json(ativos);
  } catch (error: any) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { nome, codigo, categoria, taxaHoraria, horasUso, horasManutencaoPreventiva, responsavel, localizacao } = body;

    if (!nome || !codigo || !categoria) {
      return NextResponse.json({ error: "Nome, código e categoria são obrigatórios." }, { status: 400 });
    }

    const existing = await prisma.ativo.findUnique({
      where: { codigo }
    });

    if (existing) {
      return NextResponse.json({ error: `Código de ativo "${codigo}" já cadastrado.` }, { status: 400 });
    }

    const ativo = await prisma.ativo.create({
      data: {
        nome,
        codigo,
        categoria,
        taxaHoraria: taxaHoraria ? parseFloat(String(taxaHoraria)) : null,
        horasUso: horasUso ? parseFloat(String(horasUso)) : 0,
        horasManutencaoPreventiva: horasManutencaoPreventiva ? parseFloat(String(horasManutencaoPreventiva)) : null,
        responsavel: responsavel || null,
        localizacao: localizacao || null,
        status: "DISPONIVEL"
      }
    });

    return NextResponse.json(ativo);
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
