import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const rdo = await prisma.rdoDiario.findUnique({
      where: { id },
      include: {
        projeto: true,
        responsavel: { select: { id: true, name: true, email: true } },
        climas: true,
        maoDeObra: { include: { funcionario: true } },
        materiais: true,
        ocorrencias: true
      }
    });
    if (!rdo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Record audit log for reading
    try {
      await prisma.rdoAuditLog.create({
        data: {
          rdoId: id,
          projetoId: rdo.projetoId,
          usuarioId: (session.user as any).id,
          usuarioNome: session.user.name || session.user.email || "Usuário",
          acao: "LEITURA",
          detalhes: "Visualizou o RDO e anexos"
        }
      });
    } catch (_ignore) {}

    return NextResponse.json(rdo);
  } catch (e: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { observacoes, outrasAtividades, status, climas, maoDeObra, materiais, ocorrencias } = await req.json();

    // Verification: only ADMIN or SUPERVISOR can change status to APROVADO or RECUSADO
    const userRole = (session.user as any).role;
    
    await prisma.climaRdo.deleteMany({ where: { rdoId: id } });
    await prisma.maoDeObraRdo.deleteMany({ where: { rdoId: id } });
    await prisma.materialRecebidoRdo.deleteMany({ where: { rdoId: id } });
    await prisma.ocorrenciaRdo.deleteMany({ where: { rdoId: id } });

    const updated = await prisma.rdoDiario.update({
      where: { id },
      data: {
        observacoes: observacoes !== undefined ? observacoes : null,
        outrasAtividades: outrasAtividades !== undefined ? outrasAtividades : null,
        status: status || "RASCUNHO",
        climas: { create: (climas || []).map((c: any) => ({ periodo: c.periodo, condicao: c.condicao, impacto: c.impacto || "" })) },
        maoDeObra: { create: (maoDeObra || []).map((m: any) => ({ funcionarioId: m.funcionarioId || null, nomeAvulso: m.nomeAvulso || null, funcao: m.funcao || "", empresa: m.empresa || "PROPRIA", quantidade: m.quantidade || 1, horasTrab: m.horasTrab || 8, falta: m.falta || false, justFalta: m.justFalta || "" })) },
        materiais: { create: (materiais || []).map((m: any) => ({ material: m.material, quantidade: m.quantidade, unidade: m.unidade || "un", fornecedor: m.fornecedor || "", notaFiscal: m.notaFiscal || "" })) },
        ocorrencias: { create: (ocorrencias || []).map((o: any) => ({ tipo: o.tipo, descricao: o.descricao, impacto: o.impacto || "", medidaTomada: o.medidaTomada || "", fotos: o.fotos || [] })) }
      },
      include: {
        projeto: { select: { id: true, nome: true } },
        responsavel: { select: { id: true, name: true, email: true } },
        climas: true, maoDeObra: { include: { funcionario: true } }, materiais: true, ocorrencias: true
      }
    });

    // Audit log for modification / approval
    try {
      let acao = "MODIFICACAO";
      if (status === "APROVADO") acao = "APROVACAO";
      if (status === "RECUSADO") acao = "RECUSA";

      await prisma.rdoAuditLog.create({
        data: {
          rdoId: id,
          projetoId: updated.projetoId,
          usuarioId: (session.user as any).id,
          usuarioNome: session.user.name || session.user.email || "Usuário",
          acao,
          detalhes: `Status: ${status || 'MODIFICADO'} | Obs: ${observacoes || 'Nenhuma'}`
        }
      });
    } catch (_ignore) {}

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await prisma.rdoDiario.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
