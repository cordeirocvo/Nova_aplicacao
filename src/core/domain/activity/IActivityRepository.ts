import { Activity, CreateActivityDTO, UpdateActivityDTO } from './Activity';

/**
 * Contrato de persistência para Atividades (DIP - Dependency Inversion Principle)
 */
export interface IActivityRepository {
  findById(id: string): Promise<Activity | null>;
  create(data: CreateActivityDTO, historyEntry?: string): Promise<Activity>;
  update(id: string, data: UpdateActivityDTO, historyMessage?: string): Promise<Activity>;
  list(options?: { status?: string; limit?: number }): Promise<Activity[]>;
  delete(id: string): Promise<boolean>;
}
