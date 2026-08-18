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

    // If supervisor, fetch all. Otherwise, only activities assigned to the user
    const activities = await prisma.atividadeDiario.findMany({
      where: isSupervisor ? {} : { responsavelId: (session.user as any).id },
      include: {
        projeto: true,
        responsavel: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        lancamentos: {
          orderBy: { data: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    if (!isSupervisor) {
      return NextResponse.json({ error: "Forbidden: Supervisors only" }, { status: 403 });
    }

    const body = await req.json();
    const { projetoId, descricao, responsavelId, status, dataInicio, dataFim, observacao } = body;

    if (!projetoId || !descricao || !responsavelId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newActivity = await prisma.atividadeDiario.create({
      data: {
        projetoId,
        descricao,
        responsavelId,
        status: status || "PLANEJADA",
        dataInicio: dataInicio ? new Date(`${dataInicio}T12:00:00`) : null,
        dataFim: dataFim ? new Date(`${dataFim}T12:00:00`) : null,
        observacao: observacao || null
      },
      include: {
        projeto: true,
        responsavel: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error: any) {
    console.error("Error creating activity:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
