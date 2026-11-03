import { IAlarmGateway } from '@/core/domain/activity/IAlarmGateway';
import { checkAndSendAlarm } from '@/lib/services/whatsappService';

/**
 * Gateway concreto para envio de alarmes via WhatsApp
 */
export class WhatsAppAlarmGateway implements IAlarmGateway {
  async sendAlarm(activityId: string): Promise<boolean> {
    if (!activityId) return false;
    try {
      await checkAndSendAlarm(activityId);
      return true;
    } catch (error) {
      console.error('Falha não-bloqueante no envio do alarme WhatsApp:', error);
      return false;
    }
  }
}
