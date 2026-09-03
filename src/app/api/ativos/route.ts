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
        },
        combustiveis: {
          orderBy: { data: "desc" },
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
    const { 
      nome, 
      codigo, 
      categoria, 
      taxaHoraria, 
      tipoCusto = "HORARIO",
      valorCusto,
      custoDiario,
      custoSemanal,
      custoMensal,
      horasUso, 
      horasManutencaoPreventiva, 
      responsavel, 
      localizacao, 
      tipoPropriedade, 
      contratoAluguelUrl 
    } = body;

    if (!nome || !codigo || !categoria) {
      return NextResponse.json({ error: "Nome, código e categoria são obrigatórios." }, { status: 400 });
    }

    const existing = await prisma.ativo.findUnique({
      where: { codigo }
    });

    if (existing) {
      return NextResponse.json({ error: `Código de ativo "${codigo}" já cadastrado.` }, { status: 400 });
    }

    let valCustoNum = valorCusto !== undefined && valorCusto !== null && valorCusto !== "" ? parseFloat(String(valorCusto)) : null;
    let tHoraria = taxaHoraria !== undefined && taxaHoraria !== null && taxaHoraria !== "" ? parseFloat(String(taxaHoraria)) : null;
    let cDiario = custoDiario !== undefined && custoDiario !== null && custoDiario !== "" ? parseFloat(String(custoDiario)) : null;
    let cSemanal = custoSemanal !== undefined && custoSemanal !== null && custoSemanal !== "" ? parseFloat(String(custoSemanal)) : null;
    let cMensal = custoMensal !== undefined && custoMensal !== null && custoMensal !== "" ? parseFloat(String(custoMensal)) : null;

    if (valCustoNum !== null && !isNaN(valCustoNum)) {
      if (tipoCusto === "DIARIO") {
        cDiario = cDiario ?? valCustoNum;
        cSemanal = cSemanal ?? (valCustoNum * 5);
        cMensal = cMensal ?? (valCustoNum * 22);
        tHoraria = tHoraria ?? (valCustoNum / 8);
      } else if (tipoCusto === "SEMANAL") {
        cSemanal = cSemanal ?? valCustoNum;
        cDiario = cDiario ?? (valCustoNum / 5);
        cMensal = cMensal ?? (valCustoNum * 4.4);
        tHoraria = tHoraria ?? (valCustoNum / 44);
      } else if (tipoCusto === "MENSAL") {
        cMensal = cMensal ?? valCustoNum;
        cSemanal = cSemanal ?? (valCustoNum / 4.4);
        cDiario = cDiario ?? (valCustoNum / 22);
        tHoraria = tHoraria ?? (valCustoNum / 176);
      } else { // HORARIO
        tHoraria = tHoraria ?? valCustoNum;
        cDiario = cDiario ?? (valCustoNum * 8);
        cSemanal = cSemanal ?? (valCustoNum * 44);
        cMensal = cMensal ?? (valCustoNum * 176);
      }
    }

    const ativo = await prisma.ativo.create({
      data: {
        nome,
        codigo,
        categoria,
        tipoCusto,
        valorCusto: valCustoNum,
        taxaHoraria: tHoraria,
        custoDiario: cDiario,
        custoSemanal: cSemanal,
        custoMensal: cMensal,
        horasUso: horasUso ? parseFloat(String(horasUso)) : 0,
        horasManutencaoPreventiva: horasManutencaoPreventiva ? parseFloat(String(horasManutencaoPreventiva)) : null,
        responsavel: responsavel || null,
        localizacao: localizacao || null,
        tipoPropriedade: tipoPropriedade || "PROPRIO",
        contratoAluguelUrl: contratoAluguelUrl || null,
        status: "DISPONIVEL"
      }
    });

    return NextResponse.json(ativo);
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
