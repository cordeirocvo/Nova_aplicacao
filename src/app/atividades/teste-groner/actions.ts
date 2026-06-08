"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { appendHistory } from "@/lib/historyUtils";

// Clear all test records
export async function clearTestRecords() {
  try {
    if (!prisma) {
      throw new Error("Database not initialized");
    }

    const result = await prisma.planilhaInstalacao.deleteMany({
      where: {
        idInterno: {
          startsWith: "GRONNER-"
        }
      }
    });

    revalidatePath("/atividades/teste-groner");
    revalidatePath("/atividades");

    return { success: true, count: result.count };
  } catch (error: any) {
    console.error("CLEAR_TEST_RECORDS_ERROR:", error);
    return { success: false, error: error.message || "Failed to clear test records" };
  }
}

// Create an extra test activity (independent of Google Sheets)
export async function createTestActivityExtra(form: {
  instalacao: string;
  solicitacao: string;
  observacao: string;
  status: string;
  vendedor: string;
  telefoneCliente: string;
  cidade: string;
  dataPrevista: string;
  telefoneVendedor?: string;
  anexoFotos?: string[];
  anexoArquivos?: string[];
}) {
  try {
    if (!prisma) throw new Error("Database not initialized");

    const randomId = Math.floor(1000 + Math.random() * 9000);
    const idInterno = `GRONNER-EXTRA-${randomId}`;

    const created = await prisma.planilhaInstalacao.create({
      data: {
        idInterno,
        instalacao: form.instalacao,
        solicitacao: form.solicitacao,
        observacao: form.observacao,
        obsInstalacao: form.observacao,
        status: form.status,
        vendedor: form.vendedor,
        vendedorSheet: form.vendedor,
        telefoneCliente: form.telefoneCliente,
        telefoneSheet: form.telefoneCliente,
        cidade: form.cidade,
        cidadeSheet: form.cidade,
        dataPrevista: form.dataPrevista,
        dataVenda: new Date().toLocaleDateString("pt-BR"),
        telefoneVendedor: form.telefoneVendedor || "",
        anexoFotos: form.anexoFotos || [],
        anexoArquivos: form.anexoArquivos || [],
        manualInstalacao: true, // Hides from production list
        atividadeExtra: true,   // Mark as extra activity
      }
    });

    revalidatePath("/atividades/teste-groner");
    return { success: true, record: created };
  } catch (err: any) {
    console.error("CREATE_EXTRA_ERROR:", err);
    return { success: false, error: err.message || "Failed to create extra test record" };
  }
}

// Create a matched test activity for parity comparison
export async function createTestActivityParity(googleId: string, form: {
  instalacao: string;
  vendedor: string;
  telefoneCliente: string;
  cidade: string;
  status: string;
  inversor: string;
  modulo: string;
  numMod: string;
  observacao: string;
  dataVenda: string;
}) {
  try {
    if (!prisma) throw new Error("Database not initialized");

    const idInterno = `GRONNER-${googleId}`;

    const created = await prisma.planilhaInstalacao.upsert({
      where: { idInterno: idInterno },
      update: {
        instalacao: form.instalacao,
        vendedor: form.vendedor,
        vendedorSheet: form.vendedor,
        telefoneCliente: form.telefoneCliente,
        telefoneSheet: form.telefoneCliente,
        cidade: form.cidade,
        cidadeSheet: form.cidade,
        status: form.status,
        inversor: form.inversor,
        modulo: form.modulo,
        numMod: form.numMod,
        observacao: form.observacao,
        obsInstalacao: form.observacao,
        dataVenda: form.dataVenda,
      },
      create: {
        idInterno: idInterno,
        instalacao: form.instalacao,
        vendedor: form.vendedor,
        vendedorSheet: form.vendedor,
        telefoneCliente: form.telefoneCliente,
        telefoneSheet: form.telefoneCliente,
        cidade: form.cidade,
        cidadeSheet: form.cidade,
        status: form.status,
        inversor: form.inversor,
        modulo: form.modulo,
        numMod: form.numMod,
        observacao: form.observacao,
        obsInstalacao: form.observacao,
        dataVenda: form.dataVenda,
        manualInstalacao: true, // Hides from production list
        dataSolicitacao: new Date(),
      }
    });

    revalidatePath("/atividades/teste-groner");
    return { success: true, record: created };
  } catch (err: any) {
    console.error("CREATE_PARITY_ERROR:", err);
    return { success: false, error: err.message || "Failed to create parity test record" };
  }
}
