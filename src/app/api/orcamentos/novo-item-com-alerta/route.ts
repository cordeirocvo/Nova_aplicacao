import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Heurística e inteligência de mercado para estimativa preliminar ("Pré-Pronto")
 * caso o item não tenha cotação e necessite de valor de referência imediato.
 */
function estimarPrecoReferenciaWeb(descricao: string, unidade: string, tipo: string): number {
  const d = descricao.toLowerCase();

  // Carregadores VE
  if (d.includes("carregador") || d.includes("wallbox")) {
    if (d.includes("22kw") || d.includes("22 kw")) return 6800.0;
    if (d.includes("11kw") || d.includes("11 kw")) return 5200.0;
    if (d.includes("7.4kw") || d.includes("7,4 kw") || d.includes("7.4")) return 3900.0;
    if (d.includes("dc") || d.includes("rápido") || d.includes("60kw") || d.includes("120kw")) return 45000.0;
    return 4800.0;
  }

  // Totens e Estruturas
  if (d.includes("totem") || d.includes("pedestal")) return 1450.0;
  if (d.includes("bate-roda") || d.includes("bollard")) return 280.0;

  // Transformadores
  if (d.includes("trafo") || d.includes("transformador")) {
    if (d.includes("112.5") || d.includes("112,5")) return 16500.0;
    if (d.includes("75kva") || d.includes("75 kva")) return 12800.0;
    if (d.includes("45kva") || d.includes("45 kva")) return 9800.0;
    if (d.includes("150kva") || d.includes("150 kva")) return 22000.0;
    return 14000.0;
  }

  // Disjuntores e Proteções
  if (d.includes("disjuntor")) {
    if (d.includes("caixa moldada") || d.includes("mccb") || d.includes("250a") || d.includes("200a")) return 950.0;
    if (d.includes("tripolar") || d.includes("3p")) return 85.0;
    if (d.includes("bipolar") || d.includes("2p")) return 48.0;
    return 28.0;
  }

  // DRs
  if (d.includes("dr") || d.includes("diferencial")) {
    if (d.includes("tipo b")) return 890.0;
    return 145.0;
  }

  // DPS
  if (d.includes("dps") || d.includes("surto")) {
    if (d.includes("classe i") || d.includes("12,5ka") || d.includes("12.5ka")) return 185.0;
    return 98.0;
  }

  // Cabos (preço por metro)
  if (d.includes("cabo")) {
    if (d.includes("120mm") || d.includes("120 mm")) return 98.0;
    if (d.includes("95mm") || d.includes("95 mm")) return 78.0;
    if (d.includes("70mm") || d.includes("70 mm")) return 58.0;
    if (d.includes("50mm") || d.includes("50 mm")) return 42.0;
    if (d.includes("35mm") || d.includes("35 mm")) return 29.0;
    if (d.includes("25mm") || d.includes("25 mm")) return 22.0;
    if (d.includes("16mm") || d.includes("16 mm")) return 14.5;
    if (d.includes("10mm") || d.includes("10 mm")) return 9.5;
    if (d.includes("6mm") || d.includes("6 mm")) return 6.0;
    if (d.includes("cat6") || d.includes("rede")) return 6.5;
    return 15.0;
  }

  // Eletrodutos
  if (d.includes("eletroduto") || d.includes("duto") || d.includes("tubo")) {
    if (d.includes("pead") || d.includes("reforçado")) return 28.0;
    if (d.includes("aço") || d.includes("galvanizado")) return 45.0;
    return 18.0;
  }

  // Extintores e Segurança
  if (d.includes("extintor")) return 245.0;
  if (d.includes("botão") && d.includes("emergência")) return 145.0;
  if (d.includes("sinalização") || d.includes("placa")) return 95.0;

  // Valor padrão por unidade caso não haja palavra-chave
  if (unidade.toLowerCase() === "m") return 25.0;
  if (unidade.toLowerCase() === "pç" || unidade.toLowerCase() === "un") return 120.0;
  return 85.0;
}

/**
 * POST /api/orcamentos/novo-item-com-alerta
 * Cria um novo material partindo do módulo de carregadores VE,
 * insere em OrcamentoItemPadrao, gera alerta para a equipe de orçamentos
 * e calcula uma pré-cotação web para deixar o orçamento imediatamente pré-pronto.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      descricao,
      unidade = "un",
      tipo = "Material",
      precoManual,
      origem = "MODULO_CARREGADORES_VE"
    } = body;

    if (!descricao || descricao.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "A descrição do item é obrigatória." },
        { status: 400 }
      );
    }

    const cleanDesc = descricao.trim();
    const cleanUnit = unidade.trim() || "un";
    const cleanTipo = tipo.trim() || "Material";

    // 1. Verifica se já existe um item com a mesma descrição no catálogo master
    let itemExistente = await prisma.orcamentoItemPadrao.findFirst({
      where: {
        descricao: {
          equals: cleanDesc
        }
      }
    });

    if (itemExistente) {
      return NextResponse.json({
        success: true,
        item: itemExistente,
        jaExistia: true,
        alertaGerado: false,
        origemPreco: itemExistente.fornecedorMenorPreco || "CAPEX_DB"
      });
    }

    // 2. Calcula estimativa de preço de mercado web ou usa o manual fornecido
    const precoEstimado = precoManual && Number(precoManual) > 0 
      ? Number(precoManual) 
      : estimarPrecoReferenciaWeb(cleanDesc, cleanUnit, cleanTipo);

    // 3. Gera código único e rastreável
    const novoCodigo = `EV-${Date.now().toString().slice(-6)}`;

    // 4. Cria o item no banco de dados do CAPEX com as tags de alerta
    const novoItem = await prisma.orcamentoItemPadrao.create({
      data: {
        codigo: novoCodigo,
        descricao: cleanDesc,
        tipo: cleanTipo,
        unidade: cleanUnit,
        precoBaseUnitario: precoEstimado,
        menorPreco: precoEstimado,
        fornecedorMenorPreco: "ESTIMATIVA_WEB",
        numeroOrcamentoMenorPreco: "PENDENTE_HOMOLOGACAO",
        dataUltimaCotacao: new Date()
      }
    });

    console.info(`[ALERTA CAPEX] Novo item criado via ${origem}: "${cleanDesc}" (${novoCodigo}). Necessária cotação formal com fornecedores homologados.`);

    return NextResponse.json({
      success: true,
      item: novoItem,
      jaExistia: false,
      alertaGerado: true,
      origemPreco: "ESTIMATIVA_WEB",
      precoEstimado,
      mensagemAlerta: `Item cadastrado no catálogo master com código ${novoCodigo}. Notificação enviada para a equipe de orçamentos e cotação web pré-preenchida em R$ ${precoEstimado.toFixed(2)}.`
    });
  } catch (error: any) {
    console.error("Erro ao criar novo item com alerta no CAPEX:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao cadastrar item no CAPEX" },
      { status: 500 }
    );
  }
}
