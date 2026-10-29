import { NextResponse } from "next/server";
import { sincronizarCatalogoMaster } from "@/lib/orcamentos/sincronizarCatalogoMaster";

export async function POST() {
  try {
    const relatorio = await sincronizarCatalogoMaster();
    return NextResponse.json({
      success: true,
      mensagem: "Itens de Padrão CEMIG e CoenergyGO sincronizados com sucesso no Catálogo Master!",
      relatorio
    });
  } catch (error: any) {
    console.error("Erro na sincronização automática do Catálogo Master:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao sincronizar catálogo" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
