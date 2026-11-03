import { prisma } from '@/lib/prisma';
import { Activity, CreateActivityDTO, UpdateActivityDTO } from '@/core/domain/activity/Activity';
import { IActivityRepository } from '@/core/domain/activity/IActivityRepository';
import { appendHistory } from '@/lib/historyUtils';

/**
 * Implementação do repositório de atividades utilizando Prisma (PostgreSQL)
 * Alta coesão: isola qualquer query do banco de dados das regras de negócio.
 */
export class PrismaActivityRepository implements IActivityRepository {
  async findById(id: string): Promise<Activity | null> {
    if (!id || !prisma) return null;
    const found = await prisma.planilhaInstalacao.findUnique({
      where: { id }
    });
    return (found as unknown as Activity) || null;
  }

  async create(data: CreateActivityDTO, historyEntry = 'Atividade criada'): Promise<Activity> {
    if (!prisma) throw new Error('Database client not initialized');

    const obsValue = data.observacao || data.obsInstalacao || data.observacoes || '';
    const created = await prisma.planilhaInstalacao.create({
      data: {
        instalacao: data.instalacao,
        solicitacao: data.solicitacao,
        observacao: obsValue,
        obsInstalacao: obsValue,
        status: data.status,
        vendedor: data.vendedor,
        telefoneCliente: data.telefoneCliente,
        cidade: data.cidade,
        dataPrevista: data.dataPrevista,
        automaticoPrevInstala: data.dataPrevista || null,
        telefoneVendedor: data.telefoneVendedor,
        anexoFotos: data.anexoFotos || [],
        anexoArquivos: data.anexoArquivos || [],
        manualInstalacao: true,
        historico: appendHistory([], historyEntry)
      }
    });

    return created as unknown as Activity;
  }

  async update(id: string, data: UpdateActivityDTO, historyMessage?: string): Promise<Activity> {
    if (!prisma) throw new Error('Database client not initialized');

    const existing = await this.findById(id);
    if (!existing) throw new Error(`Activity with id ${id} not found`);

    let updatedHistory = existing.historico;
    if (historyMessage) {
      updatedHistory = appendHistory(updatedHistory, historyMessage);
    }

    const updated = await prisma.planilhaInstalacao.update({
      where: { id },
      data: {
        ...(data.instalacao !== undefined && { instalacao: data.instalacao }),
        ...(data.solicitacao !== undefined && { solicitacao: data.solicitacao }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.vendedor !== undefined && { vendedor: data.vendedor }),
        ...(data.telefoneCliente !== undefined && { telefoneCliente: data.telefoneCliente }),
        ...(data.cidade !== undefined && { cidade: data.cidade }),
        ...(data.dataPrevista !== undefined && { dataPrevista: data.dataPrevista }),
        ...(data.telefoneVendedor !== undefined && { telefoneVendedor: data.telefoneVendedor }),
        ...(data.anexoFotos !== undefined && { anexoFotos: data.anexoFotos }),
        ...(data.anexoArquivos !== undefined && { anexoArquivos: data.anexoArquivos }),
        ...(data.observacao !== undefined && {
          observacao: data.observacao,
          obsInstalacao: data.observacao
        }),
        historico: updatedHistory
      }
    });

    return updated as unknown as Activity;
  }

  async list(options?: { status?: string; limit?: number }): Promise<Activity[]> {
    if (!prisma) return [];
    const activities = await prisma.planilhaInstalacao.findMany({
      where: options?.status ? { status: options.status } : undefined,
      take: options?.limit,
      orderBy: { createdAt: 'desc' }
    });
    return activities as unknown as Activity[];
  }

  async delete(id: string): Promise<boolean> {
    if (!prisma || !id) return false;
    await prisma.planilhaInstalacao.delete({
      where: { id }
    });
    return true;
  }
}
