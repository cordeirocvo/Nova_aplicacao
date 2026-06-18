import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/activities/reagendar
 * Atualiza SOMENTE a data de execução de uma atividade de instalação.
 * Endpoint dedicado para drag & drop do calendário — evita sobrescrever campos
 * com valores undefined ou incorretos que o PUT geral pode causar.
 */
export async function PATCH(req: Request) {
  try {
    const { id, novaData } = await req.json();

    if (!id || !novaData) {
      return NextResponse.json(
        { error: "Parâmetros inválidos: id e novaData são obrigatórios." },
        { status: 400 }
      );
    }

    // Valida formato de data yyyy-MM-dd
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(novaData)) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use yyyy-MM-dd." },
        { status: 400 }
      );
    }

    const updated = await prisma.planilhaInstalacao.update({
      where: { id },
      data: {
        automaticoPrevInstala: novaData,
        dataPrevista: novaData,
      },
      select: {
        id: true,
        instalacao: true,
        automaticoPrevInstala: true,
        dataPrevista: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, atividade: updated });
  } catch (error: any) {
    console.error("REAGENDAR_ERROR", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Atividade não encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Falha ao reagendar atividade." },
      { status: 500 }
    );
  }
}
