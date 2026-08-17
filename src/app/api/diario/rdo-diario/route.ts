import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const projetoId = searchParams.get("projetoId");
    const data = searchParams.get("data");
    const where: any = {};
    if (projetoId) where.projetoId = projetoId;
    if (data) {
      const dateStart = new Date(`${data}T00:00:00.000Z`);
      const dateEnd = new Date(`${data}T23:59:59.999Z`);
      where.data = { gte: dateStart, lte: dateEnd };
    }
    const rdos = await prisma.rdoDiario.findMany({
      where,
      include: {
        projeto: { select: { id: true, nome: true } },
        responsavel: { select: { id: true, name: true, email: true } },
        climas: true,
        maoDeObra: { include: { funcionario: true } },
        materiais: true,
        ocorrencias: true
      },
      orderBy: [{ data: "desc" }, { numeroRdo: "desc" }]
    });
    return NextResponse.json(rdos);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { projetoId, data, observacoes, status, climas, maoDeObra, materiais, ocorrencias } = body;
    const parseLocalDate = (dateStr?: string) => {
      if (!dateStr) return new Date();
      if (dateStr.includes("T")) return new Date(dateStr);
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    };
    const dateVal = parseLocalDate(data);
    const responsavelId = (session.user as any).id;

    // Upsert: verifica se ja existe RDO para esse projeto+data
    const existing = await prisma.rdoDiario.findFirst({
      where: { projetoId, data: { gte: new Date(`${data}T00:00:00.000Z`), lte: new Date(`${data}T23:59:59.999Z`) } }
    });

    if (existing) {
      // Atualiza o existente + recria sub-registros
      await prisma.climaRdo.deleteMany({ where: { rdoId: existing.id } });
      await prisma.maoDeObraRdo.deleteMany({ where: { rdoId: existing.id } });
      await prisma.materialRecebidoRdo.deleteMany({ where: { rdoId: existing.id } });
      await prisma.ocorrenciaRdo.deleteMany({ where: { rdoId: existing.id } });

      const updated = await prisma.rdoDiario.update({
        where: { id: existing.id },
        data: {
          observacoes: observacoes || null,
          status: status || existing.status,
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
      return NextResponse.json(updated);
    }

    // Conta RDOs anteriores da obra para gerar numero sequencial
    const count = await prisma.rdoDiario.count({ where: { projetoId } });
    const numeroRdo = count + 1;

    const rdo = await prisma.rdoDiario.create({
      data: {
        projetoId, data: dateVal, numeroRdo, responsavelId,
        observacoes: observacoes || null,
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
    return NextResponse.json(rdo, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
