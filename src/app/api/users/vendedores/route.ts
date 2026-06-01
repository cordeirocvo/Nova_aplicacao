import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar todos os usuários para poder escolher (podem ser ADMIN, USER ou VENDEDOR)
    const vendedores = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(vendedores);
  } catch (error: any) {
    console.error("Erro ao buscar vendedores/consultores:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
