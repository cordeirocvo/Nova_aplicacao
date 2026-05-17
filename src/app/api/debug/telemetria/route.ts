import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const usinas = await prisma.usina.findMany({
      include: {
        _count: {
          select: { telemetria: true }
        }
      }
    });

    const lastTelemetria = await prisma.telemetria.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
      include: { usina: true }
    });

    return NextResponse.json({ usinas, lastTelemetria });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao consultar telemetria" }, { status: 500 });
  }
}
