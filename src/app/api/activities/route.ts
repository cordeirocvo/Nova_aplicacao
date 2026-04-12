import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Since in the schema Google ID column expects some unique fields,
    // we bypass it by ignoring idInterno for manually created local tasks.
    
    const newActivity = await prisma.planilhaInstalacao.create({
      data: {
        instalacao: data.instalacao,
        solicitacao: data.solicitacao,
        observacao: data.observacao,
        status: data.status,
        vendedor: data.vendedor,
        telefoneCliente: data.telefoneCliente,
        cidade: data.cidade,
        dataPrevista: data.dataPrevista,
        anexoFotos: data.anexoFotos || [],
        anexoArquivos: data.anexoArquivos || [],
        manualInstalacao: true // Identifies it as internally created, not synced
      }
    });

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error("CREATE_ACTIVITY_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
