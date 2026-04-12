import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const newStatus = await prisma.statusOption.create({
      data: { name },
    });

    return NextResponse.json(newStatus);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar status. Verifica se o nome já existe." }, { status: 500 });
  }
}
