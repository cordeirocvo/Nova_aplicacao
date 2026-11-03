import { NextResponse } from 'next/server';
import { PrismaActivityRepository } from '@/infrastructure/database/repositories/PrismaActivityRepository';
import { WhatsAppAlarmGateway } from '@/infrastructure/gateways/WhatsAppAlarmGateway';
import { UpdateActivityUseCase } from '@/core/use-cases/activity/UpdateActivityUseCase';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID não informado' }, { status: 400 });
    }

    const body = await req.json();
    const repository = new PrismaActivityRepository();
    const alarmGateway = new WhatsAppAlarmGateway();
    const useCase = new UpdateActivityUseCase(repository, alarmGateway);

    const atividade = await useCase.execute(id, body, { novaAcao: body.novaAcao });
    return NextResponse.json({ success: true, atividade });
  } catch (error: any) {
    const isNotFound = error.message?.includes('não encontrada');
    const statusCode = isNotFound ? 404 : 500;
    
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao atualizar atividade' },
      { status: statusCode }
    );
  }
}
