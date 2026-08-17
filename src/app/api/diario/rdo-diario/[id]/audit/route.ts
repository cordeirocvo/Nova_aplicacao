import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const logs = await prisma.rdoAuditLog.findMany({
      where: { rdoId: id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(logs);
  } catch (e: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
