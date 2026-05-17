import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const manufacturers = await prisma.manufacturerAPI.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(manufacturers);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar fabricantes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, userKey, secretKey, apiUrl } = body;

    const manufacturer = await prisma.manufacturerAPI.upsert({
      where: { name: name.toUpperCase() },
      update: {
        userKey,
        secretKey: secretKey && !secretKey.includes("*") ? secretKey : undefined,
        apiUrl
      },
      create: {
        name: name.toUpperCase(),
        userKey,
        secretKey,
        apiUrl
      }
    });

    return NextResponse.json(manufacturer);
  } catch (error) {
    console.error("Save Manufacturer Error:", error);
    return NextResponse.json({ error: "Erro ao salvar fabricante" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    await prisma.manufacturerAPI.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir fabricante" }, { status: 500 });
  }
}
