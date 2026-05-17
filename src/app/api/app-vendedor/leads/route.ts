import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const vendedorId = session.user.id;

    const leads = await prisma.lead.findMany({
      where: { vendedorId },
      include: {
        midias: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Erro ao buscar leads do vendedor:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
