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

    // If supervisor, get all logs. Otherwise, get only logs belonging to the user's assigned activities.
    const logs = await prisma.rdoLancamento.findMany({
      where: isSupervisor 
        ? {} 
        : {
            atividade: {
              responsavelId: (session.user as any).id
            }
          },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        atividade: {
          include: {
            projeto: true
          }
        }
      },
      orderBy: { data: "desc" }
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("Error fetching logs:", error);
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

    const body = await req.json();
    const { atividadeId, descricao, progresso, fotos, audios, data } = body;

    if (!atividadeId || !descricao) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const activity = await prisma.atividadeDiario.findUnique({
      where: { id: atividadeId }
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const isAssignedExecutor = activity.responsavelId === (session.user as any).id;

    if (!isSupervisor && !isAssignedExecutor) {
      return NextResponse.json({ error: "Forbidden: Not assigned to this activity" }, { status: 403 });
    }

    const logData = new Date(data || Date.now());

    // Create RDO log entry
    const newLog = await prisma.rdoLancamento.create({
      data: {
        atividadeId,
        usuarioId: (session.user as any).id,
        data: logData,
        descricao,
        progresso: parseFloat(progresso || 0),
        fotos: fotos || [],
        audios: audios || [],
        statusRevisao: "PENDENTE"
      },
      include: {
        atividade: true
      }
    });

    // Automatically update the main activity's status if it hits 100% or is in progress
    let newStatus = "EM_ANDAMENTO";
    if (parseFloat(progresso) >= 100) {
      newStatus = "CONCLUIDA";
    }

    await prisma.atividadeDiario.update({
      where: { id: atividadeId },
      data: { status: newStatus }
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("Error creating RDO log:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
