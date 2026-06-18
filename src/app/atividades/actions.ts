"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAndSendAlarm } from "@/lib/services/whatsappService";
import { appendHistory } from "@/lib/historyUtils";

export async function togglePrioridade(id: string, currentState: boolean) {
  const atv = await prisma.planilhaInstalacao.findUnique({
    where: { id },
    select: { historico: true }
  });

  const description = !currentState ? "Prioridade ativada" : "Prioridade desativada";
  const newHistorico = appendHistory(atv?.historico, description);

  const updatedAtv = await prisma.planilhaInstalacao.update({
    where: { id },
    data: { 
      prioridade: !currentState,
      notificadoWhatsapp: currentState ? false : undefined, // Se desativar prioridade, permitir notificar de novo no futuro
      historico: newHistorico
    },
  });
  
  if (!currentState) {
    await checkAndSendAlarm(updatedAtv);
  }

  revalidatePath("/atividades");
  revalidatePath("/atividades/teste-groner");
}

export async function toggleAtividadeExtra(id: string, currentState: boolean) {
  const atv = await prisma.planilhaInstalacao.findUnique({
    where: { id },
    select: { historico: true }
  });

  const description = !currentState ? "Marcada como atividade extra" : "Desmarcada como atividade extra";
  const newHistorico = appendHistory(atv?.historico, description);

  await prisma.planilhaInstalacao.update({
    where: { id },
    data: { 
      atividadeExtra: !currentState,
      historico: newHistorico
    },
  });
  revalidatePath("/atividades");
  revalidatePath("/atividades/teste-groner");
}
