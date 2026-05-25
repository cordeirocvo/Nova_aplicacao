import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const vendedorId = session.user.id;

    // Verificar se o lead pertence ao vendedor autenticado
    const leadExistente = await prisma.lead.findFirst({
      where: { id, vendedorId }
    });

    if (!leadExistente) {
      return NextResponse.json({ error: "Lead não encontrado ou não pertence a você" }, { status: 404 });
    }

    const body = await req.json();
    const { nome, telefone, email, endereco, observacoes, midias } = body;

    // Validação básica
    if (!nome || !telefone) {
      return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
    }

    // Se midias for fornecido no body, vamos sincronizá-lo!
    if (Array.isArray(midias)) {
      // 1. Deletar mídias existentes
      await prisma.leadMidia.deleteMany({
        where: { leadId: id }
      });
      
      // 2. Criar mídias novas
      if (midias.length > 0) {
        await prisma.leadMidia.createMany({
          data: midias.map((m: any) => ({
            leadId: id,
            arquivoUrl: m.arquivoUrl || m.url,
            tipo: m.tipo || "OUTRO"
          }))
        });
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        nome: String(nome).trim(),
        telefone: String(telefone).trim(),
        email: email ? String(email).trim() : null,
        endereco: endereco ? String(endereco).trim() : null,
        observacoes: observacoes ? String(observacoes).trim() : null,
      },
      include: {
        midias: true
      }
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Erro ao atualizar lead do vendedor:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
