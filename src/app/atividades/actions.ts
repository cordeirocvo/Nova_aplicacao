"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function togglePrioridade(id: string, currentState: boolean) {
  await prisma.planilhaInstalacao.update({
    where: { id },
    data: { prioridade: !currentState },
  });
  revalidatePath("/atividades");
}

export async function toggleAtividadeExtra(id: string, currentState: boolean) {
  await prisma.planilhaInstalacao.update({
    where: { id },
    data: { atividadeExtra: !currentState },
  });
  revalidatePath("/atividades");
}
