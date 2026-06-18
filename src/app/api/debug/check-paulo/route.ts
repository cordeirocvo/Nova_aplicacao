import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.planilhaInstalacao.findMany({
      where: {
        instalacao: {
          contains: "Paulo Henrique",
          mode: "insensitive"
        }
      }
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
