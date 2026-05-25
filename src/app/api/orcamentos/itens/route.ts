import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { etapaId, codigo, descricao, tipo, unidade, quantidade, precoBaseUnitario, bdiPercent, imagemUrl } = await req.json();

    if (!etapaId || !descricao || !tipo || !unidade || !quantidade) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const item = await prisma.orcamentoItem.create({
      data: {
        etapaId,
        codigo,
        descricao,
        tipo,
        unidade,
        quantidade: parseFloat(String(quantidade).replace(",", ".")),
        precoBaseUnitario: precoBaseUnitario ? parseFloat(String(precoBaseUnitario).replace(",", ".")) : null,
        bdiPercent: bdiPercent ? parseFloat(String(bdiPercent).replace(",", ".")) : 0,
        imagemUrl: imagemUrl || null,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Erro ao criar item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
