import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSupervisor = (session.user as any).role === "ADMIN";
    const allowed = (session.user as any).allowedRoutes || [];
    if (!isSupervisor && allowed.length > 0 && !allowed.includes("/diario")) {
      return NextResponse.json({ error: "Forbidden: RDO access required" }, { status: 403 });
    }

    const projects = await prisma.orcamentoProjeto.findMany({
      select: {
        id: true,
        nome: true
      },
      orderBy: { nome: "asc" }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error listing projects for RDO:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
