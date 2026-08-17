import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    if ((prisma as any).funcionarioCanteiro) {
      const funcionarios = await (prisma as any).funcionarioCanteiro.findMany({
        where: { ativo: true },
        orderBy: { nome: "asc" }
      });
      return NextResponse.json(funcionarios);
    }

    const rows: any = await prisma.$queryRaw`
      SELECT * FROM "FuncionarioCanteiro" WHERE "ativo" = true ORDER BY "nome" ASC
    `;
    return NextResponse.json(rows || []);
  } catch (e: any) {
    console.error("[GET FUNCIONARIOS ERROR]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { nome, funcao, empresa, contato } = await req.json();
    if (!nome || !funcao)
      return NextResponse.json({ error: "Nome e função são obrigatórios" }, { status: 400 });

    if ((prisma as any).funcionarioCanteiro) {
      const f = await (prisma as any).funcionarioCanteiro.create({
        data: { nome, funcao, empresa: empresa || "PROPRIA", contato: contato || null }
      });
      return NextResponse.json(f, { status: 201 });
    }

    const cuid = "c" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const emp = empresa || "PROPRIA";
    const cont = contato || null;

    await prisma.$queryRaw`
      INSERT INTO "FuncionarioCanteiro" ("id", "nome", "funcao", "empresa", "contato", "ativo", "createdAt")
      VALUES (${cuid}, ${nome}, ${funcao}, ${emp}, ${cont}, true, NOW())
    `;

    const f = { id: cuid, nome, funcao, empresa: emp, contato: cont, ativo: true };
    return NextResponse.json(f, { status: 201 });
  } catch (e: any) {
    console.error("[POST FUNCIONARIO ERROR]", e);
    return NextResponse.json({ error: e.message || "Erro interno ao cadastrar funcionário" }, { status: 500 });
  }
}
