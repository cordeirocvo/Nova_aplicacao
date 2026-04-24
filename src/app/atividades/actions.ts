"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAndSendAlarm } from "@/lib/services/whatsappService";

export async function togglePrioridade(id: string, currentState: boolean) {
  await prisma.planilhaInstalacao.update({
    where: { id },
    data: { 
      prioridade: !currentState,
      notificadoWhatsapp: currentState ? false : undefined // Se desativar prioridade, permitir notificar de novo no futuro
    },
  });
  
  if (!currentState) {
    await checkAndSendAlarm(id);
  }

  revalidatePath("/atividades");
}

export async function toggleAtividadeExtra(id: string, currentState: boolean) {
  await prisma.planilhaInstalacao.update({
    where: { id },
    data: { atividadeExtra: !currentState },
  });
  revalidatePath("/atividades");
}
