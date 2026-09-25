import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndSendAlarm } from "@/lib/services/whatsappService";
import { appendHistory } from "@/lib/historyUtils";

export const dynamic = "force-dynamic";

/** Remove base64 Data URLs e URLs inválidas — evita estourar o PostgreSQL */
function sanitizeUrls(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (u): u is string =>
      typeof u === "string" &&
      u.length > 0 &&
      u.length < 4096 &&
      !u.startsWith("data:")
  );
}

/** Normaliza string de data: "" ou "undefined" → null */
function nullIfEmpty(val: unknown): string | null {
  if (typeof val !== "string" || val.trim() === "" || val === "undefined") return null;
  return val.trim();
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const currentAtv = await prisma.planilhaInstalacao.findUnique({
      where: { id },
      select: { status: true, historico: true },
    });

    if (!currentAtv) {
      return NextResponse.json(
        { success: false, error: "Atividade não encontrada" },
        { status: 404 }
      );
    }

    let newHistory: any = currentAtv.historico;

    // Detecta mudança de status
    if (body.status && currentAtv.status !== body.status) {
      newHistory = appendHistory(newHistory, `Status alterado para ${body.status}`);
    }

    // Ação manual opcional
    if (body.novaAcao && typeof body.novaAcao === "string" && body.novaAcao.trim()) {
      newHistory = appendHistory(newHistory, body.novaAcao.trim());
    }

    // Fallback: nenhuma das anteriores
    if (
      !body.novaAcao?.trim() &&
      (!body.status || currentAtv.status === body.status)
    ) {
      newHistory = appendHistory(newHistory, "Atividade editada");
    }

    const obsValue = nullIfEmpty(body.obsInstalacao ?? body.observacao ?? body.observacoes) ?? "";

    // Sanitiza arrays de fotos/arquivos — rejeita base64 e strings muito longas
    const safeFotos = sanitizeUrls(body.anexoFotos);
    const safeArquivos = sanitizeUrls(body.anexoArquivos);

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
        automaticoPrevInstala: nullIfEmpty(body.automaticoPrevInstala),
        dataPrevista: nullIfEmpty(body.automaticoPrevInstala),
        telefoneVendedor: body.telefoneVendedor,
        anexoFotos: safeFotos,
        anexoArquivos: safeArquivos,
        historico: newHistory,
      },
    });

    // Alarme WhatsApp isolado — falha aqui NÃO bloqueia a resposta de sucesso
    try {
      await checkAndSendAlarm(atividade);
    } catch (alarmErr) {
      console.warn("[ALARM_WARN] checkAndSendAlarm falhou (não critico):", alarmErr);
    }

    return NextResponse.json({ success: true, atividade });
  } catch (error: any) {
    console.error("[PUT /api/activities/:id] Erro:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { success: false, error: "Falha na atualização: " + (error?.message ?? "Erro desconhecido") },
      { status: 500 }
    );
  }
}
