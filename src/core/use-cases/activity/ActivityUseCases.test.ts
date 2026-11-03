import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CreateActivityUseCase } from './CreateActivityUseCase';
import { UpdateActivityUseCase } from './UpdateActivityUseCase';
import { IActivityRepository } from '@/core/domain/activity/IActivityRepository';
import { IAlarmGateway } from '@/core/domain/activity/IAlarmGateway';
import { Activity, CreateActivityDTO, UpdateActivityDTO } from '@/core/domain/activity/Activity';

// In-Memory Repository Mock (Sem dependência de banco de dados real)
class InMemoryActivityRepository implements IActivityRepository {
  private activities: Activity[] = [];

  async findById(id: string): Promise<Activity | null> {
    return this.activities.find(a => a.id === id) || null;
  }

  async create(data: CreateActivityDTO, historyEntry = 'Criada'): Promise<Activity> {
    const activity: Activity = {
      id: `act-${this.activities.length + 1}`,
      instalacao: data.instalacao || null,
      solicitacao: data.solicitacao || null,
      observacao: data.observacao || null,
      obsInstalacao: data.observacao || null,
      status: data.status || 'PENDENTE',
      vendedor: data.vendedor || null,
      telefoneCliente: data.telefoneCliente || null,
      cidade: data.cidade || null,
      dataPrevista: data.dataPrevista || null,
      automaticoPrevInstala: data.dataPrevista || null,
      telefoneVendedor: data.telefoneVendedor || null,
      anexoFotos: data.anexoFotos || [],
      anexoArquivos: data.anexoArquivos || [],
      manualInstalacao: true,
      historico: [{ data: new Date().toISOString(), descricao: historyEntry }],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.activities.push(activity);
    return activity;
  }

  async update(id: string, data: UpdateActivityDTO, historyMessage?: string): Promise<Activity> {
    const index = this.activities.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Atividade não encontrada');

    const current = this.activities[index];
    const updatedHistory = Array.isArray(current.historico) ? [...current.historico] : [];
    if (historyMessage) {
      updatedHistory.push({ data: new Date().toISOString(), descricao: historyMessage });
    }

    const updated: Activity = {
      ...current,
      ...data,
      historico: updatedHistory,
      updatedAt: new Date()
    };
    this.activities[index] = updated;
    return updated;
  }

  async list(): Promise<Activity[]> {
    return [...this.activities];
  }

  async delete(id: string): Promise<boolean> {
    const initialLen = this.activities.length;
    this.activities = this.activities.filter(a => a.id !== id);
    return this.activities.length < initialLen;
  }
}

// In-Memory Alarm Gateway Mock
class MockAlarmGateway implements IAlarmGateway {
  public sentAlarmIds: string[] = [];

  async sendAlarm(activityId: string): Promise<boolean> {
    this.sentAlarmIds.push(activityId);
    return true;
  }
}

describe('Activity Use Cases — Inversion of Dependency & Business Rules', () => {
  it('Deve criar atividade isoladamente e acionar o gateway de alarme via injeção de dependência', async () => {
    const repository = new InMemoryActivityRepository();
    const alarmGateway = new MockAlarmGateway();
    const useCase = new CreateActivityUseCase(repository, alarmGateway);

    const result = await useCase.execute({
      instalacao: 'INST-12345',
      solicitacao: 'Instalação Padrão CEMIG 200A',
      status: 'AGENDADA',
      cidade: 'Sete Lagoas'
    });

    assert.ok(result.id, 'Atividade deve ter ID gerado');
    assert.strictEqual(result.instalacao, 'INST-12345');
    assert.strictEqual(result.status, 'AGENDADA');
    assert.strictEqual(alarmGateway.sentAlarmIds.length, 1, 'Gateway de alarme deve ter sido acionado');
    assert.strictEqual(alarmGateway.sentAlarmIds[0], result.id);
  });

  it('Deve registrar alteração de status no histórico ao atualizar a atividade', async () => {
    const repository = new InMemoryActivityRepository();
    const created = await repository.create({
      instalacao: 'INST-555',
      status: 'PENDENTE'
    });

    const updateUseCase = new UpdateActivityUseCase(repository);
    const updated = await updateUseCase.execute(created.id, {
      status: 'CONCLUIDA'
    });

    assert.strictEqual(updated.status, 'CONCLUIDA');
    assert.ok(Array.isArray(updated.historico));
    assert.strictEqual(updated.historico.length, 2);
    assert.ok(updated.historico[1].descricao.includes('Status alterado'));
  });

  it('Deve lançar erro com cláusula de guarda caso a atividade não exista para atualização', async () => {
    const repository = new InMemoryActivityRepository();
    const updateUseCase = new UpdateActivityUseCase(repository);

    await assert.rejects(
      async () => updateUseCase.execute('id-inexistente', { status: 'CANCELADA' }),
      { message: 'Atividade não encontrada' }
    );
  });
});
