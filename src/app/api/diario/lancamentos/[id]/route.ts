import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { 
      descricao, 
      progresso, 
      fotos, 
      audios, 
      statusRevisao, 
      comentariosSupervisor,
      ativoId,
      horimetroInicio,
      horimetroFim,
      fotoHorimetroInicioUrl,
      fotoHorimetroFimUrl,
      statusLancamento
    } = body;

    const log = await prisma.rdoLancamento.findUnique({
      where: { id },
      include: {
        atividade: true
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const isSupervisor = (session.user as any).role === "ADMIN";
    const isAssignedExecutor = log.atividade.responsavelId === (session.user as any).id;

    if (!isSupervisor && !isAssignedExecutor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {};

    if (isSupervisor) {
      if (descricao !== undefined) updateData.descricao = descricao;
      if (progresso !== undefined) updateData.progresso = parseFloat(progresso);
      if (fotos !== undefined) updateData.fotos = fotos;
      if (audios !== undefined) updateData.audios = audios;
      if (statusRevisao !== undefined) updateData.statusRevisao = statusRevisao;
      if (comentariosSupervisor !== undefined) updateData.comentariosSupervisor = comentariosSupervisor;
      if (ativoId !== undefined) updateData.ativoId = ativoId || null;
      if (horimetroInicio !== undefined) updateData.horimetroInicio = horimetroInicio ? parseFloat(horimetroInicio) : null;
      if (horimetroFim !== undefined) updateData.horimetroFim = horimetroFim ? parseFloat(horimetroFim) : null;
      if (fotoHorimetroInicioUrl !== undefined) updateData.fotoHorimetroInicioUrl = fotoHorimetroInicioUrl || null;
      if (fotoHorimetroFimUrl !== undefined) updateData.fotoHorimetroFimUrl = fotoHorimetroFimUrl || null;
      if (statusLancamento !== undefined) updateData.statusLancamento = statusLancamento;
    } else {
      // Executor updates
      if (descricao !== undefined) updateData.descricao = descricao;
      if (progresso !== undefined) updateData.progresso = parseFloat(progresso);
      if (fotos !== undefined) updateData.fotos = fotos;
      if (audios !== undefined) updateData.audios = audios;
      if (ativoId !== undefined) updateData.ativoId = ativoId || null;
      if (horimetroInicio !== undefined) updateData.horimetroInicio = horimetroInicio ? parseFloat(horimetroInicio) : null;
      if (horimetroFim !== undefined) updateData.horimetroFim = horimetroFim ? parseFloat(horimetroFim) : null;
      if (fotoHorimetroInicioUrl !== undefined) updateData.fotoHorimetroInicioUrl = fotoHorimetroInicioUrl || null;
      if (fotoHorimetroFimUrl !== undefined) updateData.fotoHorimetroFimUrl = fotoHorimetroFimUrl || null;
      if (statusLancamento !== undefined) updateData.statusLancamento = statusLancamento;
      updateData.statusRevisao = "PENDENTE";
    }

    const updatedLog = await prisma.rdoLancamento.update({
      where: { id },
      data: updateData,
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
      }
    });

    // If progress was modified, update status of the parent activity accordingly
    if (progresso !== undefined) {
      let newStatus = "EM_ANDAMENTO";
      if (parseFloat(progresso) >= 100) {
        newStatus = "CONCLUIDA";
      }
      await prisma.atividadeDiario.update({
        where: { id: log.atividadeId },
        data: { status: newStatus }
      });
    }

    // Manage asset status and usage history logic upon update
    const logAny = log as any;
    const currentAtivoId = ativoId !== undefined ? ativoId : logAny.ativoId;
    const currentStatusLancamento = statusLancamento !== undefined ? statusLancamento : logAny.statusLancamento;
    const currentHorimetroInicio = horimetroInicio !== undefined ? (horimetroInicio ? parseFloat(horimetroInicio) : null) : logAny.horimetroInicio;
    const currentHorimetroFim = horimetroFim !== undefined ? (horimetroFim ? parseFloat(horimetroFim) : null) : logAny.horimetroFim;
    const currentFotoHorimetroInicioUrl = fotoHorimetroInicioUrl !== undefined ? fotoHorimetroInicioUrl : logAny.fotoHorimetroInicioUrl;
    const currentFotoHorimetroFimUrl = fotoHorimetroFimUrl !== undefined ? fotoHorimetroFimUrl : logAny.fotoHorimetroFimUrl;

    if (currentAtivoId) {
      const responsavelNome = session.user.name || session.user.email || "Operador";
      const obraNome = updatedLog.atividade?.projeto?.nome || "Obra Geral";

      if (currentStatusLancamento === "FINALIZADO") {
        const hInicio = currentHorimetroInicio || 0;
        const hFim = currentHorimetroFim || 0;
        const horasTrabalhadas = Math.max(0, hFim - hInicio);
        
        const asset = await prisma.ativo.findUnique({
          where: { id: currentAtivoId }
        });
        
        const custoCalculado = horasTrabalhadas * (asset?.taxaHoraria || 0);

        // Find if usage history record already exists for this RDO entry
        const existingUso = await prisma.historicoUsoAtivo.findUnique({
          where: { rdoLancamentoId: id }
        });

        if (existingUso) {
          // Calculate differences to increment/decrement accurately
          const diffHoras = horasTrabalhadas - existingUso.horasTrabalhadas;
          const diffCusto = custoCalculado - existingUso.custoCalculado;

          await prisma.historicoUsoAtivo.update({
            where: { id: existingUso.id },
            data: {
              ativoId: currentAtivoId,
              horasTrabalhadas,
              horimetroInicio: hInicio,
              horimetroFim: hFim,
              custoCalculado,
              fotoHorimetroInicioUrl: currentFotoHorimetroInicioUrl || null,
              fotoHorimetroFimUrl: currentFotoHorimetroFimUrl || null,
              responsavel: responsavelNome,
              obra: obraNome,
              observacoes: `Apontamento via RDO Diário (Atualizado) - Atividade: ${updatedLog.atividade.descricao}`
            }
          });

          await prisma.ativo.update({
            where: { id: currentAtivoId },
            data: {
              horasUso: { increment: diffHoras },
              ultimoCustoHoras: { increment: diffCusto },
              status: "DISPONIVEL"
            }
          });
        } else {
          // If not existing, create a new one!
          await prisma.historicoUsoAtivo.create({
            data: {
              ativoId: currentAtivoId,
              horasTrabalhadas,
              horimetroInicio: hInicio,
              horimetroFim: hFim,
              custoCalculado,
              obra: obraNome,
              responsavel: responsavelNome,
              observacoes: `Apontamento via RDO Diário - Atividade: ${updatedLog.atividade.descricao}`,
              fotoHorimetroInicioUrl: currentFotoHorimetroInicioUrl || null,
              fotoHorimetroFimUrl: currentFotoHorimetroFimUrl || null,
              rdoLancamentoId: id,
              dataUso: updatedLog.data
            }
          });

          await prisma.ativo.update({
            where: { id: currentAtivoId },
            data: {
              horasUso: { increment: horasTrabalhadas },
              ultimoCustoHoras: { increment: custoCalculado },
              status: "DISPONIVEL"
            }
          });
        }
      } else if (currentStatusLancamento === "INICIADO") {
        // If it is in INICIADO status, set the asset as EM_USO
        await prisma.ativo.update({
          where: { id: currentAtivoId },
          data: {
            status: "EM_USO",
            responsavel: responsavelNome,
            localizacao: obraNome
          }
        });
      }
    }

    return NextResponse.json(updatedLog);
  } catch (error: any) {
    console.error("Error updating log:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const log = await prisma.rdoLancamento.findUnique({
      where: { id },
      include: {
        atividade: true
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const isSupervisor = (session.user as any).role === "ADMIN";
    const isAssignedExecutor = log.atividade.responsavelId === (session.user as any).id;

    if (!isSupervisor && !isAssignedExecutor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Clean up asset usage history before deleting RDO log
    const existingUso = await prisma.historicoUsoAtivo.findUnique({
      where: { rdoLancamentoId: id }
    });

    if (existingUso) {
      await prisma.ativo.update({
        where: { id: existingUso.ativoId },
        data: {
          horasUso: { decrement: existingUso.horasTrabalhadas },
          ultimoCustoHoras: { decrement: existingUso.custoCalculado },
          status: "DISPONIVEL"
        }
      });

      await prisma.historicoUsoAtivo.delete({
        where: { id: existingUso.id }
      });
    }

    await prisma.rdoLancamento.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting log:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
