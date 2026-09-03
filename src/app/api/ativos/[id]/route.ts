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
        },
        combustiveis: {
          orderBy: { data: "desc" }
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
    const { 
      nome, 
      codigo, 
      categoria, 
      taxaHoraria, 
      tipoCusto,
      valorCusto,
      custoDiario,
      custoSemanal,
      custoMensal,
      horasUso, 
      horasManutencaoPreventiva, 
      responsavel, 
      localizacao, 
      status, 
      tipoPropriedade, 
      contratoAluguelUrl 
    } = body;

    const existing = await prisma.ativo.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    function cleanFloat(val: any): number | null {
      if (val === undefined || val === null || val === "") return null;
      const str = String(val).replace(/\s/g, "").replace(",", ".").trim();
      const num = parseFloat(str);
      return isNaN(num) ? null : num;
    }

    let tCusto = tipoCusto !== undefined ? tipoCusto : existing.tipoCusto;
    let valCustoNum = valorCusto !== undefined ? cleanFloat(valorCusto) : existing.valorCusto;
    let tHoraria = taxaHoraria !== undefined ? cleanFloat(taxaHoraria) : existing.taxaHoraria;
    let cDiario = custoDiario !== undefined ? cleanFloat(custoDiario) : existing.custoDiario;
    let cSemanal = custoSemanal !== undefined ? cleanFloat(custoSemanal) : existing.custoSemanal;
    let cMensal = custoMensal !== undefined ? cleanFloat(custoMensal) : existing.custoMensal;

    if (valCustoNum !== null && valorCusto !== undefined) {
      if (tCusto === "DIARIO") {
        cDiario = valCustoNum;
        cSemanal = valCustoNum * 5;
        cMensal = valCustoNum * 22;
        tHoraria = valCustoNum / 8;
      } else if (tCusto === "SEMANAL") {
        cSemanal = valCustoNum;
        cDiario = valCustoNum / 5;
        cMensal = valCustoNum * 4.4;
        tHoraria = valCustoNum / 44;
      } else if (tCusto === "MENSAL") {
        cMensal = valCustoNum;
        cSemanal = valCustoNum / 4.4;
        cDiario = valCustoNum / 22;
        tHoraria = valCustoNum / 176;
      } else { // HORARIO
        tHoraria = valCustoNum;
        cDiario = valCustoNum * 8;
        cSemanal = valCustoNum * 44;
        cMensal = valCustoNum * 176;
      }
    }

    const updated = await prisma.ativo.update({
      where: { id },
      data: {
        nome,
        codigo,
        categoria,
        tipoCusto: tCusto,
        valorCusto: valCustoNum,
        taxaHoraria: tHoraria,
        custoDiario: cDiario,
        custoSemanal: cSemanal,
        custoMensal: cMensal,
        horasUso: horasUso !== undefined ? (cleanFloat(horasUso) ?? undefined) : undefined,
        horasManutencaoPreventiva: horasManutencaoPreventiva !== undefined ? cleanFloat(horasManutencaoPreventiva) : undefined,
        responsavel,
        localizacao,
        status,
        tipoPropriedade,
        contratoAluguelUrl
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating asset:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar ativo." }, { status: 500 });
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
