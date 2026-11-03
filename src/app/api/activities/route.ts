import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaActivityRepository } from '@/infrastructure/database/repositories/PrismaActivityRepository';
import { WhatsAppAlarmGateway } from '@/infrastructure/gateways/WhatsAppAlarmGateway';
import { CreateActivityUseCase } from '@/core/use-cases/activity/CreateActivityUseCase';

const createActivitySchema = z.object({
  instalacao: z.string().optional(),
  solicitacao: z.string().optional(),
  observacao: z.string().optional(),
  obsInstalacao: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.string().optional(),
  vendedor: z.string().optional(),
  telefoneCliente: z.string().optional(),
  cidade: z.string().optional(),
  dataPrevista: z.string().optional(),
  telefoneVendedor: z.string().optional(),
  anexoFotos: z.array(z.string()).optional(),
  anexoArquivos: z.array(z.string()).optional()
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const validation = createActivitySchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.format() }, { status: 400 });
    }

    const repository = new PrismaActivityRepository();
    const alarmGateway = new WhatsAppAlarmGateway();
    const useCase = new CreateActivityUseCase(repository, alarmGateway);

    const newActivity = await useCase.execute(validation.data);
    return NextResponse.json(newActivity, { status: 201 });
  } catch (error: any) {
    console.error('CREATE_ACTIVITY_ERROR', { message: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message || 'Erro interno ao criar atividade' }, { status: 500 });
  }
}
