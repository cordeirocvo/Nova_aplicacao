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
    const { 
      atividadeId, 
      descricao, 
      progresso, 
      fotos, 
      audios, 
      data,
      ativoId,
      horimetroInicio,
      horimetroFim,
      fotoHorimetroInicioUrl,
      fotoHorimetroFimUrl,
      statusLancamento
    } = body;

    if (!atividadeId || !descricao) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const activity = await prisma.atividadeDiario.findUnique({
      where: { id: atividadeId },
      include: {
        projeto: true
      }
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const isAssignedExecutor = activity.responsavelId === (session.user as any).id;

    if (!isSupervisor && !isAssignedExecutor) {
      return NextResponse.json({ error: "Forbidden: Not assigned to this activity" }, { status: 403 });
    }

    const parseLocalDate = (dateStr?: string) => {
      if (!dateStr) return new Date();
      if (dateStr.includes("T")) return new Date(dateStr);
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    };

    const logData = parseLocalDate(data);

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
        statusRevisao: "PENDENTE",
        ativoId: ativoId || null,
        horimetroInicio: horimetroInicio ? parseFloat(horimetroInicio) : null,
        horimetroFim: horimetroFim ? parseFloat(horimetroFim) : null,
        fotoHorimetroInicioUrl: fotoHorimetroInicioUrl || null,
        fotoHorimetroFimUrl: fotoHorimetroFimUrl || null,
        statusLancamento: statusLancamento || "FINALIZADO"
      },
      include: {
        atividade: {
          include: {
            projeto: true
          }
        }
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

    // Manage asset status and usage history logging
    if (ativoId) {
      const responsavelNome = session.user.name || session.user.email || "Operador";
      const obraNome = activity.projeto?.nome || "Obra Geral";

      if (statusLancamento === "FINALIZADO" || !statusLancamento) {
        const hInicio = horimetroInicio ? parseFloat(horimetroInicio) : 0;
        const hFim = horimetroFim ? parseFloat(horimetroFim) : 0;
        const horasTrabalhadas = Math.max(0, hFim - hInicio);
        
        const asset = await prisma.ativo.findUnique({
          where: { id: ativoId }
        });
        
        let custoCalculado = 0;
        if (asset) {
          const tipo = asset.tipoCusto || "HORARIO";
          const taxaH = asset.taxaHoraria || 0;
          const cDiario = asset.custoDiario || (tipo === "DIARIO" ? asset.valorCusto : null) || (taxaH * 8);
          const cSemanal = asset.custoSemanal || (tipo === "SEMANAL" ? asset.valorCusto : null) || (taxaH * 44);
          const cMensal = asset.custoMensal || (tipo === "MENSAL" ? asset.valorCusto : null) || (taxaH * 176);

          if (tipo === "DIARIO") {
            custoCalculado = horasTrabalhadas > 0 ? (horasTrabalhadas / 8) * cDiario : cDiario;
          } else if (tipo === "SEMANAL") {
            custoCalculado = horasTrabalhadas > 0 ? (horasTrabalhadas / 44) * cSemanal : (cSemanal / 5);
          } else if (tipo === "MENSAL") {
            custoCalculado = horasTrabalhadas > 0 ? (horasTrabalhadas / 176) * cMensal : (cMensal / 22);
          } else {
            custoCalculado = horasTrabalhadas * taxaH;
          }
        }

        await prisma.historicoUsoAtivo.create({
          data: {
            ativoId,
            horasTrabalhadas,
            horimetroInicio: hInicio,
            horimetroFim: hFim,
            custoCalculado,
            obra: obraNome,
            responsavel: responsavelNome,
            observacoes: `Apontamento via RDO Diário - Atividade: ${activity.descricao}`,
            fotoHorimetroInicioUrl: fotoHorimetroInicioUrl || null,
            fotoHorimetroFimUrl: fotoHorimetroFimUrl || null,
            rdoLancamentoId: newLog.id,
            dataUso: logData
          }
        });

        // Update Ativo accumulated parameters and set status to DISPONIVEL
        await prisma.ativo.update({
          where: { id: ativoId },
          data: {
            horasUso: { increment: horasTrabalhadas },
            ultimoCustoHoras: { increment: custoCalculado },
            status: "DISPONIVEL",
            responsavel: null,
            localizacao: null
          }
        });
      } else if (statusLancamento === "INICIADO") {
        // If RDO started in the morning, set status of equipment to EM_USO
        await prisma.ativo.update({
          where: { id: ativoId },
          data: {
            status: "EM_USO",
            responsavel: responsavelNome,
            localizacao: obraNome
          }
        });
      }
    }

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("Error creating RDO log:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
