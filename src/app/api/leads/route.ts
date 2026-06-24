import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendLeadToGronner } from "@/lib/services/gronner";

import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const logPath = path.join(process.cwd(), "api_leads_debug.log");
  const log = (msg: string) => {
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {
      console.error("Erro ao escrever no log de depuração:", e);
    }
  };

  try {
    log("GET /api/leads request started");
    const session: any = await getServerSession(authOptions as any);
    if (!session) {
      log("No session found");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    log(`Session found: email=${session.user.email}, role=${session.user.role}, canManageCRM=${session.user.canManageCRM}`);

    if (!session.user.canManageCRM && session.user.role !== "ADMIN" && session.user.role !== "VENDEDOR") {
      log("User not authorized based on permissions");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const whereClause: any = {};
    if (session.user.role === "VENDEDOR") {
      whereClause.vendedorId = session.user.id;
      log(`Restricting query to Vendedor ID: ${session.user.id}`);
    }

    try {
      const leads = await prisma.lead.findMany({
        where: whereClause,
        include: {
          midias: true,
          vendedor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      log(`Query successful, found ${leads.length} leads`);
      return NextResponse.json(leads);
    } catch (dbErr: any) {
      log(`Database query error: ${dbErr.message}`);
      throw dbErr;
    }
  } catch (error: any) {
    log(`ERRO CRÍTICO no GET /api/leads: ${error.message}`);
    console.error("Erro ao buscar leads:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 401 });
    }

    const vendedorId = session.user.id;

    if (!vendedorId) {
      return NextResponse.json({ 
        error: "Identificador do vendedor não encontrado na sessão.", 
        details: "Por favor, saia do sistema (Logout) e entre novamente para atualizar sua sessão." 
      }, { status: 401 });
    }

    const body = await req.json();
    const { 
      nome, 
      telefone, 
      email, 
      empresa,
      tipo, 
      latitude, 
      longitude, 
      observacoes, 
      midias, 
      endereco 
    } = body;

    console.log("Criando lead para vendedor:", vendedorId, "Tipo:", tipo);

    // Validação básica
    if (!nome || !telefone) {
      return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
    }

    const lead = await (prisma.lead as any).create({
      data: {
        nome,
        telefone,
        email: email || null,
        empresa: empresa || null,
        tipo: tipo || "DESCONTO_CONTA",
        endereco: endereco || null,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        observacoes: observacoes || null,
        vendedorId: vendedorId,
        midias: {
          create: (Array.isArray(midias) ? midias : [])
            .filter((m: any) => m && (m.url || m.arquivoUrl))
            .map((m: any) => ({
              arquivoUrl: m.url || m.arquivoUrl,
              tipo: m.tipo || "OUTRO"
            }))
        }
      },
      include: {
        midias: true
      }
    });

    console.log("Lead criado com sucesso:", lead.id);

    // Integração com Gronner (não deve travar o retorno se falhar)
    try {
      await sendLeadToGronner(lead);
    } catch (gronnerError) {
      console.error("Erro não-crítico na integração Gronner:", gronnerError);
    }

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error("ERRO CRÍTICO AO CRIAR LEAD:", error);
    return NextResponse.json({ 
      error: "Erro interno ao processar o lead", 
      details: error.message 
    }, { status: 500 });
  }
}
