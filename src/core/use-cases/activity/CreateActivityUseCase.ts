import { Activity, CreateActivityDTO } from '@/core/domain/activity/Activity';
import { IActivityRepository } from '@/core/domain/activity/IActivityRepository';
import { IAlarmGateway } from '@/core/domain/activity/IAlarmGateway';

/**
 * Caso de Uso: Criação de Nova Atividade de Instalação (SRP & DIP)
 */
export class CreateActivityUseCase {
  constructor(
    private readonly activityRepository: IActivityRepository,
    private readonly alarmGateway?: IAlarmGateway
  ) {}

  async execute(dto: CreateActivityDTO): Promise<Activity> {
    const activity = await this.activityRepository.create(dto, 'Atividade criada manualmente');

    if (this.alarmGateway && activity.id) {
      // Notificação assíncrona não-bloqueante
      this.alarmGateway.sendAlarm(activity.id).catch(() => {});
    }

    return activity;
  }
}
