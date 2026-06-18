import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndSendAlarm } from "@/lib/services/whatsappService";
import { appendHistory } from "@/lib/historyUtils";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();

    const currentAtv = await prisma.planilhaInstalacao.findUnique({
      where: { id },
      select: { status: true, historico: true }
    });

    let newHistory: any = currentAtv?.historico;

    // Detect status change
    if (currentAtv && body.status && currentAtv.status !== body.status) {
      newHistory = appendHistory(newHistory, `Status alterado para ${body.status}`);
    }

    // Append custom manual action if provided
    if (body.novaAcao) {
      newHistory = appendHistory(newHistory, body.novaAcao);
    }

    // Fallback if neither status changed nor manual action was provided
    if (!body.novaAcao && (!currentAtv || !body.status || currentAtv.status === body.status)) {
      newHistory = appendHistory(newHistory, "Atividade editada");
    }

    const obsValue = body.obsInstalacao || body.observacao || body.observacoes || "";
    const atividade = await prisma.planilhaInstalacao.update({
      where: { id },
      data: {
        instalacao: body.instalacao,
        solicitacao: body.solicitacao,
        obsInstalacao: obsValue,
        observacao: obsValue,
        status: body.status,
        vendedor: body.vendedor,
        telefoneCliente: body.telefoneCliente,
        cidade: body.cidade,
        diaPrev: body.diaPrev,
        automaticoPrevInstala: body.automaticoPrevInstala,
        dataPrevista: body.dataPrevista !== undefined ? body.dataPrevista : undefined,
        telefoneVendedor: body.telefoneVendedor,
        anexoFotos: body.anexoFotos,
        anexoArquivos: body.anexoArquivos,
        historico: newHistory
      },
    });

    await checkAndSendAlarm(atividade);

    return NextResponse.json({ success: true, atividade });
  } catch (error) {
    console.error("Erro ao atualizar atividade:", error);
    return NextResponse.json({ success: false, error: "Falha na atualização" }, { status: 500 });
  }
}
