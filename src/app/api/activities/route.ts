import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndSendAlarm } from "@/lib/services/whatsappService";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!prisma) {
      console.error("FATAL: Prisma client is undefined in API route");
      return new NextResponse("Database initialization failed", { status: 500 });
    }

    if (!prisma.planilhaInstalacao) {
       console.error("FATAL: PlanilhaInstalacao model missing from Prisma client", Object.keys(prisma));
       return new NextResponse("Database model missing", { status: 500 });
    }
    
    const newActivity = await prisma.planilhaInstalacao.create({
      data: {
        instalacao: data.instalacao,
        solicitacao: data.solicitacao,
        observacao: data.observacao,
        status: data.status,
        vendedor: data.vendedor,
        telefoneCliente: data.telefoneCliente,
        cidade: data.cidade,
        dataPrevista: data.dataPrevista,
        telefoneVendedor: data.telefoneVendedor,
        anexoFotos: data.anexoFotos || [],
        anexoArquivos: data.anexoArquivos || [],
        manualInstalacao: true 
      }
    });

    try {
      await checkAndSendAlarm(newActivity.id);
    } catch (alarmError) {
      console.error("ALARM_ERROR", alarmError);
      // Don't fail the request if only the alarm fails
    }

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_ACTIVITY_ERROR", {
       message: error.message,
       stack: error.stack
    });
    return new NextResponse(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
