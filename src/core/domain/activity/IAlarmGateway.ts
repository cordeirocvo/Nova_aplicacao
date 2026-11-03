/**
 * Gateway de Disparo de Alarmes e Notificações (DIP)
 */
export interface IAlarmGateway {
  sendAlarm(activityId: string): Promise<boolean>;
}
