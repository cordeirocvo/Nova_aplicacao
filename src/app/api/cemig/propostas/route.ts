import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const busca = searchParams.get("q");

    const where: any = {};
    if (status && status !== "TODOS") {
      where.status = status;
    }
    if (busca) {
      where.OR = [
        { clienteNome: { contains: busca, mode: "insensitive" } },
        { numeroProposta: { contains: busca, mode: "insensitive" } },
        { cidade: { contains: busca, mode: "insensitive" } },
        { observacoes: { contains: busca, mode: "insensitive" } }
      ];
    }

    const propostas = await prisma.cemigPropostaPadrao.findMany({
      where,
      include: {
        itens: {
          orderBy: { ordem: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, propostas });
  } catch (error: any) {
    console.error("Erro ao listar propostas CEMIG:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar propostas salvas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      clienteNome,
      clienteTelefone,
      clienteEmail,
      clienteDocumento,
      cidade,
      endereco,
      finalidade,
      potenciaCarregadorKW,
      modeloCarregador,
      tipoPadrao,
      disjuntorAmperes,
      faixaDemanda,
      ladoRede,
      tipoEstrutura,
      posteHomologado,
      caboEntrada,
      eletroduto,
      hastesQtde,
      valorMateriais,
      valorMaoDeObra,
      bdiMargem,
      valorDesconto,
      valorTotal,
      status,
      observacoes,
      itens
    } = body;

    if (!clienteNome || !tipoPadrao || !disjuntorAmperes || !ladoRede) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios faltando (clienteNome, tipoPadrao, disjuntorAmperes, ladoRede)" },
        { status: 400 }
      );
    }

    // Gerar código único da proposta (ex: PROP-CEMIG-2026-0001)
    const count = await prisma.cemigPropostaPadrao.count();
    const ano = new Date().getFullYear();
    const numeroProposta = `PROP-CEMIG-${ano}-${String(count + 1).padStart(4, "0")}`;

    const novaProposta = await prisma.cemigPropostaPadrao.create({
      data: {
        numeroProposta,
        clienteNome,
        clienteTelefone: clienteTelefone || null,
        clienteEmail: clienteEmail || null,
        clienteDocumento: clienteDocumento || null,
        cidade: cidade || "Belo Horizonte - MG",
        endereco: endereco || null,
        finalidade: finalidade || "CARREGADOR_VE",
        potenciaCarregadorKW: potenciaCarregadorKW ? Number(potenciaCarregadorKW) : null,
        modeloCarregador: modeloCarregador || null,
        tipoPadrao,
        disjuntorAmperes: Number(disjuntorAmperes),
        faixaDemanda: faixaDemanda || (tipoPadrao === "BIFASICO" ? "B1" : "C1"),
        ladoRede,
        tipoEstrutura: tipoEstrutura || "POSTE_CONCRETO",
        posteHomologado: posteHomologado || null,
        caboEntrada: caboEntrada || null,
        eletroduto: eletroduto || null,
        hastesQtde: Number(hastesQtde || 2),
        valorMateriais: Number(valorMateriais || 0),
        valorMaoDeObra: Number(valorMaoDeObra || 0),
        bdiMargem: Number(bdiMargem || 0),
        valorDesconto: Number(valorDesconto || 0),
        valorTotal: Number(valorTotal || 0),
        status: status || "RASCUNHO",
        observacoes: observacoes || null,
        itens: {
          create: (itens || []).map((item: any, idx: number) => ({
            codigo: item.codigo || null,
            descricao: item.descricao,
            categoria: item.categoria || "GERAL",
            unidade: item.unidade || "un",
            quantidade: Number(item.quantidade || 1),
            precoUnitario: Number(item.precoUnitario || 0),
            precoTotal: Number(item.precoTotal || (Number(item.quantidade || 1) * Number(item.precoUnitario || 0))),
            ordem: idx
          }))
        }
      },
      include: {
        itens: true
      }
    });

    return NextResponse.json({ success: true, proposta: novaProposta });
  } catch (error: any) {
    console.error("Erro ao salvar proposta CEMIG:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao salvar proposta" },
      { status: 500 }
    );
  }
}
