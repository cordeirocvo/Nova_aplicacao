import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const chargers = await prisma.carregador.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(chargers);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const charger = await prisma.carregador.create({ data });
    return NextResponse.json({ success: true, charger });
  } catch (error) {
    console.error("Error creating charger:", error);
    return NextResponse.json({ error: "Erro ao cadastrar carregador" }, { status: 500 });
  }
}
