import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndSendAlarm } from "@/lib/services/whatsappService";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();

    const atividade = await prisma.planilhaInstalacao.update({
      where: { id },
      data: {
        instalacao: body.instalacao,
        solicitacao: body.solicitacao,
        obsInstalacao: body.obsInstalacao,
        status: body.status,
        vendedor: body.vendedor,
        telefoneCliente: body.telefoneCliente,
        cidade: body.cidade,
        diaPrev: body.diaPrev,
        automaticoPrevInstala: body.automaticoPrevInstala,
        telefoneVendedor: body.telefoneVendedor,
        anexoFotos: body.anexoFotos,
        anexoArquivos: body.anexoArquivos,
      },
    });

    await checkAndSendAlarm(id);

    return NextResponse.json({ success: true, atividade });
  } catch (error) {
    console.error("Erro ao atualizar atividade:", error);
    return NextResponse.json({ success: false, error: "Falha na atualização" }, { status: 500 });
  }
}
