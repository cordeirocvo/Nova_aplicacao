import { Activity, UpdateActivityDTO } from '@/core/domain/activity/Activity';
import { IActivityRepository } from '@/core/domain/activity/IActivityRepository';
import { IAlarmGateway } from '@/core/domain/activity/IAlarmGateway';

export interface UpdateActivityOptions {
  novaAcao?: string;
}

/** Remove base64 Data URLs e URLs inválidas para evitar estourar o PostgreSQL */
export function sanitizeUrls(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (u): u is string =>
      typeof u === 'string' &&
      u.length > 0 &&
      u.length < 4096 &&
      !u.startsWith('data:')
  );
}

/** Normaliza string de data */
export function nullIfEmpty(val: unknown): string | null {
  if (typeof val !== 'string' || val.trim() === '' || val === 'undefined') return null;
  return val.trim();
}

/**
 * Caso de Uso: Atualização de Atividade com Auditoria de Histórico e Alarme
 */
export class UpdateActivityUseCase {
  constructor(
    private readonly activityRepository: IActivityRepository,
    private readonly alarmGateway?: IAlarmGateway
  ) {}

  async execute(id: string, dto: UpdateActivityDTO, options?: UpdateActivityOptions): Promise<Activity> {
    if (!id) throw new Error('ID da atividade é obrigatório');

    const existing = await this.activityRepository.findById(id);
    if (!existing) throw new Error('Atividade não encontrada');

    let historyMessage: string | undefined;
    if (options?.novaAcao?.trim()) {
      historyMessage = options.novaAcao.trim();
    } else if (dto.status && dto.status !== existing.status) {
      historyMessage = `Status alterado para ${dto.status}`;
    } else {
      historyMessage = 'Atividade editada';
    }

    const sanitizedData: UpdateActivityDTO = {
      ...dto,
      anexoFotos: dto.anexoFotos ? sanitizeUrls(dto.anexoFotos) : undefined,
      anexoArquivos: dto.anexoArquivos ? sanitizeUrls(dto.anexoArquivos) : undefined,
      dataPrevista: dto.dataPrevista ? nullIfEmpty(dto.dataPrevista) || undefined : undefined
    };

    const updated = await this.activityRepository.update(id, sanitizedData, historyMessage);

    if (this.alarmGateway && updated.id) {
      this.alarmGateway.sendAlarm(updated.id).catch(() => {});
    }

    return updated;
  }
}
