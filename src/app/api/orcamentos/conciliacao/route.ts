import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Normalização de texto para comparação técnica
function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extração de grandezas de engenharia elétrica
function extrairGrandezas(desc: string) {
  const norm = normalizarTexto(desc);
  
  // Bitolas de cabo: 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240 mm2
  const bitolaMatch = desc.match(/(\d{1,3})\s*(?:mm|mm²|mm2)/i);
  const bitola = bitolaMatch ? bitolaMatch[1] : null;

  // Cor do cabo: preto, azul, verde, vermelho, branco
  let cor = null;
  if (/preto|pt\b/i.test(desc)) cor = "PRETO";
  else if (/azul/i.test(desc)) cor = "AZUL";
  else if (/verde|vd\b|terra/i.test(desc)) cor = "VERDE";

  // Disjuntor: corrente (ex: 40A, 50A, 63A, 80A, 100A, 125A, 150A, 200A, 225A, 250A, 300A, 400A, 500A, 600A, 700A, 800A)
  const disjMatch = desc.match(/(?:disjuntor|disj|dij|dsjn)?\s*(?:3x|tripolar|3p)?\s*(\d{2,3})\s*a\b/i);
  const correnteDisj = disjMatch ? disjMatch[1] : null;

  // Caixas CEMIG: CM-1, CM-2, CM-3, CM-4, CM-13, CM-14, CM-18, CM-9, ZC, ZD
  let caixa = null;
  if (/cm\s*[-_]?\s*4\b/i.test(desc)) caixa = "CM-4";
  else if (/cm\s*[-_]?\s*14\b/i.test(desc)) caixa = "CM-14";
  else if (/cm\s*[-_]?\s*18\b/i.test(desc)) caixa = "CM-18";
  else if (/cm\s*[-_]?\s*3\b/i.test(desc)) caixa = "CM-3";
  else if (/cm\s*[-_]?\s*2\b/i.test(desc)) caixa = "CM-2";
  else if (/cm\s*[-_]?\s*1\b/i.test(desc)) caixa = "CM-1";
  else if (/\bzc\b/i.test(desc)) caixa = "ZC";
  else if (/\bzd\b/i.test(desc)) caixa = "ZD";

  // Eletroduto / Duto PEAD / Tubo
  let duto = null;
  if (/pead/i.test(desc) || (/duto/i.test(desc) && /3/i.test(desc))) duto = "PEAD-3";
  else if (/2\s*[\.,\/]\s*1\s*[\.,\/]\s*2|2\.5"|2\s*1\/2/i.test(desc)) duto = "PVC-2.5";
  else if (/3\/4/i.test(desc)) duto = "PVC-3/4";

  // Haste cantoneira
  const isHaste = /haste\s*cantoneira/i.test(desc) || (/haste/i.test(desc) && /cantoneira/i.test(desc));

  // Tampão / Tampa ZC
  const isTampaoZC = (/tampao|tampa/i.test(desc) && /zc/i.test(desc)) || (/caixa.*concreto.*zc/i.test(desc));

  return { bitola, cor, correnteDisj, caixa, duto, isHaste, isTampaoZC };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 1: CONFIRMAR VÍNCULOS DE-PARA (Salvar na memória e atualizar preços)
    // ─────────────────────────────────────────────────────────────────────────────
    if (action === "CONFIRMAR") {
      const {
        vinculos,
        fornecedorNome,
        fornecedorCnpj,
        numeroOrcamento,
        dataOrcamento,
        arquivoUrl
      } = body;

      if (!Array.isArray(vinculos) || vinculos.length === 0) {
        return NextResponse.json({ error: "Nenhum vínculo para confirmar" }, { status: 400 });
      }

      const atualizados: any[] = [];
      const novosCadastrados: any[] = [];

      for (const v of vinculos) {
        if (!v.codigoOficial || !v.descricaoFornecedor) continue;

        const isNovoCadastro = v.codigoOficial === "__NOVO_ITEM__" || v.cadastrarComoNovo === true;
        let codigoFinal = v.codigoOficial;
        let descricaoFinal = v.descricaoOficial && v.descricaoOficial !== "__NOVO_ITEM__"
          ? v.descricaoOficial
          : v.descricaoFornecedor;

        // ─────────────────────────────────────────────────────────────────────────
        // SE FOR NOVO ITEM A CADASTRAR NO SISTEMA:
        // ─────────────────────────────────────────────────────────────────────────
        if (isNovoCadastro) {
          try {
            const baseCod = v.codigoFornecedor && v.codigoFornecedor.trim().length > 0
              ? `FORN-${v.codigoFornecedor.trim().replace(/[^A-Za-z0-9_-]/g, "")}`
              : `ITEM-${Math.floor(100000 + Math.random() * 900000)}`;

            let codCandidate = baseCod;
            let counter = 1;
            while (await prisma.orcamentoItemPadrao.findFirst({ where: { codigo: codCandidate } })) {
              codCandidate = `${baseCod}-${counter++}`;
            }

            codigoFinal = codCandidate;
            descricaoFinal = v.descricaoPersonalizada || v.descricaoFornecedor;

            const novoItemCriado = await prisma.orcamentoItemPadrao.create({
              data: {
                codigo: codigoFinal,
                descricao: descricaoFinal,
                tipo: v.categoria || "GERAL",
                unidade: v.unidade || v.unidadeFornecedor || "un",
                precoBaseUnitario: Number(v.precoUnitario) || 0,
                menorPreco: Number(v.precoUnitario) || 0,
                fornecedorMenorPreco: fornecedorNome || "Fornecedor",
                numeroOrcamentoMenorPreco: numeroOrcamento || null,
                dataUltimaCotacao: new Date()
              }
            });

            novosCadastrados.push(novoItemCriado);
          } catch (createErr) {
            console.error("Erro ao cadastrar novo item no catálogo master:", createErr);
          }
        }

        // 1. Salvar ou atualizar na memória De-Para (MaterialAlias)
        try {
          await prisma.materialAlias.upsert({
            where: {
              // Buscar se já existe por fornecedor + descrição
              id: v.aliasId || "novo-alias"
            },
            update: {
              codigoOficial: codigoFinal,
              descricaoOficial: descricaoFinal,
              confianca: 1.0,
              origem: "USUARIO"
            },
            create: {
              fornecedorNome: fornecedorNome || null,
              fornecedorCnpj: fornecedorCnpj || null,
              codigoFornecedor: v.codigoFornecedor || null,
              descricaoFornecedor: v.descricaoFornecedor,
              codigoOficial: codigoFinal,
              descricaoOficial: descricaoFinal,
              confianca: 1.0,
              origem: "USUARIO"
            }
          });
        } catch (aliasErr) {
          // Fallback se não encontrar por ID: criar novo alias
          await prisma.materialAlias.create({
            data: {
              fornecedorNome: fornecedorNome || null,
              fornecedorCnpj: fornecedorCnpj || null,
              codigoFornecedor: v.codigoFornecedor || null,
              descricaoFornecedor: v.descricaoFornecedor,
              codigoOficial: codigoFinal,
              descricaoOficial: descricaoFinal,
              confianca: 1.0,
              origem: "USUARIO"
            }
          });
        }

        // 2. Registrar no Histórico de Cotações
        if (v.precoUnitario) {
          try {
            await prisma.cotacaoHistorico.create({
              data: {
                codigoOficial: codigoFinal,
                fornecedorNome: fornecedorNome || "Fornecedor Não Informado",
                fornecedorCnpj: fornecedorCnpj || null,
                numeroOrcamento: numeroOrcamento || null,
                dataOrcamento: dataOrcamento ? new Date(dataOrcamento) : new Date(),
                precoUnitario: Number(v.precoUnitario),
                quantidade: v.quantidade ? Number(v.quantidade) : null,
                unidade: v.unidade || null,
                marca: v.marca || null,
                arquivoUrl: arquivoUrl || null
              }
            });
          } catch (histErr) {
            console.warn("Aviso ao salvar histórico de cotação:", histErr);
          }
        }

        // 3. Se não for item novo (já existia no catálogo), atualizar Catálogo Master CAPEX (OrcamentoItemPadrao)
        if (!isNovoCadastro) {
          try {
            const existingCapex = await prisma.orcamentoItemPadrao.findFirst({
              where: {
                OR: [
                  { codigo: codigoFinal },
                  { id: codigoFinal.startsWith("CAPEX-") ? codigoFinal.replace("CAPEX-", "") : undefined },
                  { descricao: { equals: descricaoFinal || codigoFinal, mode: "insensitive" } }
                ]
              }
            });

            if (existingCapex && v.precoUnitario) {
              const novoPreco = Number(v.precoUnitario);
              const menorPrecoAtual = existingCapex.menorPreco;
              const eMenorPreco = menorPrecoAtual === null || novoPreco <= menorPrecoAtual;

              const updatedCapex = await prisma.orcamentoItemPadrao.update({
                where: { id: existingCapex.id },
                data: {
                  precoBaseUnitario: novoPreco,
                  menorPreco: eMenorPreco ? novoPreco : menorPrecoAtual,
                  fornecedorMenorPreco: eMenorPreco ? fornecedorNome : existingCapex.fornecedorMenorPreco,
                  numeroOrcamentoMenorPreco: eMenorPreco ? numeroOrcamento : existingCapex.numeroOrcamentoMenorPreco,
                  dataUltimaCotacao: new Date()
                }
              });
              atualizados.push(updatedCapex);
            }
          } catch (capexErr) {
            console.warn("Aviso ao atualizar catálogo master CAPEX:", capexErr);
          }
        }

        // 4. Sincronizar simultaneamente com Catálogo CEMIG (CemigMaterialPreco) se existir
        if (!isNovoCadastro) {
          try {
            const materialCemig = await prisma.cemigMaterialPreco.findFirst({
              where: {
                OR: [
                  { codigo: codigoFinal },
                  { descricao: { equals: descricaoFinal || codigoFinal, mode: "insensitive" } }
                ]
              }
            });

            if (materialCemig && v.precoUnitario) {
              const novoPreco = Number(v.precoUnitario);
              const menorPrecoAtual = materialCemig.menorPreco;
              const eMenorPreco = menorPrecoAtual === null || novoPreco <= menorPrecoAtual;

              const updatedCemig = await prisma.cemigMaterialPreco.update({
                where: { id: materialCemig.id },
                data: {
                  precoUnitario: novoPreco,
                  menorPreco: eMenorPreco ? novoPreco : menorPrecoAtual,
                  fornecedorMenorPreco: eMenorPreco ? fornecedorNome : materialCemig.fornecedorMenorPreco,
                  numeroOrcamentoMenorPreco: eMenorPreco ? numeroOrcamento : materialCemig.numeroOrcamentoMenorPreco,
                  dataUltimaCotacao: new Date()
                }
              });
              if (atualizados.every(a => a.id !== updatedCemig.id)) {
                atualizados.push(updatedCemig);
              }
            }
          } catch (cemigErr) {
            console.warn("Aviso ao sincronizar CEMIG:", cemigErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        confirmadosCount: vinculos.length,
        materiaisCriados: novosCadastrados.length,
        materiaisAtualizados: atualizados.length
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 2: ANALISAR E CONCILIAR ITENS DO ORÇAMENTO (De-Para com IA e Regras)
    // ─────────────────────────────────────────────────────────────────────────────
    const { itens, fornecedorNome, fornecedorCnpj, numeroOrcamento } = body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: "Nenhum item para conciliar." }, { status: 400 });
    }

    console.log("DEBUG PRISMA KEYS:", {
      hasCemig: !!(prisma as any).cemigMaterialPreco,
      hasCapex: !!(prisma as any).orcamentoItemPadrao,
      hasAlias: !!(prisma as any).materialAlias,
      hasCotacao: !!(prisma as any).cotacaoHistorico,
    });

    const materiaisCemigPromise = (prisma as any).cemigMaterialPreco
      ? (prisma as any).cemigMaterialPreco.findMany({
          where: { ativo: true },
          select: {
            id: true,
            codigo: true,
            descricao: true,
            categoria: true,
            unidade: true,
            precoUnitario: true,
            menorPreco: true,
            fornecedorMenorPreco: true
          }
        })
      : Promise.resolve([]);

    const itensPadraoCapexPromise = (prisma as any).orcamentoItemPadrao
      ? (prisma as any).orcamentoItemPadrao.findMany({
          select: {
            id: true,
            codigo: true,
            descricao: true,
            tipo: true,
            unidade: true,
            precoBaseUnitario: true,
            menorPreco: true,
            fornecedorMenorPreco: true
          }
        })
      : Promise.resolve([]);

    const aliasesExistentesPromise = (prisma as any).materialAlias
      ? (prisma as any).materialAlias.findMany({
          where: fornecedorNome
            ? {
                OR: [
                  { fornecedorNome: { contains: fornecedorNome, mode: "insensitive" } },
                  { fornecedorCnpj: fornecedorCnpj || undefined }
                ]
              }
            : undefined
        })
      : Promise.resolve([]);

    // Carregar todos os materiais cadastrados no sistema (CEMIG + CAPEX)
    const [materiaisCemig, itensPadraoCapex, aliasesExistentes]: [any[], any[], any[]] = await Promise.all([
      materiaisCemigPromise,
      itensPadraoCapexPromise,
      aliasesExistentesPromise
    ]);

    // Combinar catálogo de materiais priorizando CAPEX Master e complementando com CEMIG
    const codigosVistos = new Set<string>();
    const catalogoOficial: any[] = [];

    // 1. Inserir itens master do CAPEX (OrcamentoItemPadrao)
    itensPadraoCapex.forEach((item: any) => {
      const cod = item.codigo || `CAPEX-${item.id}`;
      codigosVistos.add(cod);
      catalogoOficial.push({
        id: item.id,
        codigo: cod,
        descricao: item.descricao,
        categoria: item.tipo || "GERAL",
        unidade: item.unidade,
        precoAtual: item.precoBaseUnitario || 0,
        menorPrecoHistorico: item.menorPreco,
        fornecedorMenorPreco: item.fornecedorMenorPreco
      });
    });

    // 2. Complementar com itens CEMIG que não estejam no catálogo
    materiaisCemig.forEach((m: any) => {
      if (!codigosVistos.has(m.codigo)) {
        codigosVistos.add(m.codigo);
        catalogoOficial.push({
          id: m.id,
          codigo: m.codigo,
          descricao: m.descricao,
          categoria: m.categoria,
          unidade: m.unidade,
          precoAtual: m.precoUnitario,
          menorPrecoHistorico: m.menorPreco,
          fornecedorMenorPreco: m.fornecedorMenorPreco
        });
      }
    });

    // Conciliação de cada item
    const itensConciliados: any[] = [];
    const itensParaAvaliacaoIA: any[] = [];

    for (const it of itens) {
      const descFornecedor = it.descricaoFornecedor || "";
      const codFornecedor = it.codigoFornecedor || "";
      const precoUnitFornecedor = Number(it.precoUnitario) || 0;

      // 1. Procurar na Memória De-Para prévia (Alias)
      const aliasMatch = aliasesExistentes.find(
        (a: any) =>
          (a.codigoFornecedor && a.codigoFornecedor === codFornecedor) ||
          normalizarTexto(a.descricaoFornecedor) === normalizarTexto(descFornecedor)
      );

      if (aliasMatch) {
        const materialOficial = catalogoOficial.find((c: any) => c.codigo === aliasMatch.codigoOficial);
        if (materialOficial) {
          const eMenor = materialOficial.menorPrecoHistorico
            ? precoUnitFornecedor < materialOficial.menorPrecoHistorico
            : precoUnitFornecedor < materialOficial.precoAtual;

          itensConciliados.push({
            itemNumero: it.itemNumero,
            codigoFornecedor: codFornecedor,
            descricaoFornecedor: descFornecedor,
            unidadeFornecedor: it.unidade,
            quantidade: it.quantidade,
            precoUnitarioFornecedor: precoUnitFornecedor,
            marca: it.marca,
            status: "CONCILIADO_MEMORIA",
            confianca: 100,
            origemMatch: "MEMORIA_HISTORICA",
            explicacao: `Vínculo aprendido de cotação anterior para ${fornecedorNome || "este fornecedor"}.`,
            sugestao: {
              codigoOficial: materialOficial.codigo,
              descricaoOficial: materialOficial.descricao,
              categoria: materialOficial.categoria,
              unidade: materialOficial.unidade,
              precoAtual: materialOficial.precoAtual,
              menorPrecoHistorico: materialOficial.menorPrecoHistorico,
              fornecedorMenorPreco: materialOficial.fornecedorMenorPreco
            },
            isMenorPreco: eMenor,
            diferencaPreco: materialOficial.precoAtual - precoUnitFornecedor,
            percentualEconomia:
              materialOficial.precoAtual > 0
                ? Math.round(((materialOficial.precoAtual - precoUnitFornecedor) / materialOficial.precoAtual) * 100)
                : 0
          });
          continue;
        }
      }

      // 2. Regras Eletrotécnicas Estritas de Engenharia
      const grandezas = extrairGrandezas(descFornecedor);
      let matchRegra: any = null;
      let explicacaoRegra = "";

      // Regra de Caixa
      if (grandezas.caixa) {
        if (grandezas.caixa === "CM-4") {
          matchRegra = catalogoOficial.find((c: any) => c.codigo === "CX-CM4");
          explicacaoRegra = "Caixa de Medição Indireta CEMIG CM-4 identificada.";
        } else if (grandezas.caixa === "CM-14") {
          matchRegra = catalogoOficial.find((c: any) => c.codigo === "CX-CM14");
          explicacaoRegra = "Caixa Polifásica com visor CEMIG CM-14 identificada.";
        } else if (grandezas.caixa === "CM-18") {
          matchRegra = catalogoOficial.find((c: any) => c.codigo === "CX-CM18");
          explicacaoRegra = "Caixa de Proteção para Disjuntor CEMIG CM-18 identificada.";
        } else if (grandezas.caixa === "CM-3") {
          matchRegra = catalogoOficial.find((c: any) => c.codigo === "CX-CM3");
          explicacaoRegra = "Caixa de Medição CEMIG CM-3 identificada.";
        }
      }

      // Regra de Cabos (Bitola + Cor)
      if (!matchRegra && grandezas.bitola && grandezas.cor) {
        const codigoBuscado = `CABO-${grandezas.cor}-${grandezas.bitola}`;
        matchRegra = catalogoOficial.find((c: any) => c.codigo === codigoBuscado);
        if (matchRegra) {
          explicacaoRegra = `Cabo ${grandezas.cor} de ${grandezas.bitola} mm² (0,6/1kV) identificado.`;
        }
      }

      // Regra de Disjuntor por Amperagem
      if (!matchRegra && grandezas.correnteDisj) {
        const codDisj = `DISJ-3P-${grandezas.correnteDisj}A`;
        matchRegra = catalogoOficial.find((c: any) => c.codigo === codDisj || c.descricao.includes(`${grandezas.correnteDisj}A`));
        if (matchRegra) {
          explicacaoRegra = `Disjuntor tripolar de ${grandezas.correnteDisj}A homologado CEMIG identificado.`;
        }
      }

      // Regra de Haste Cantoneira
      if (!matchRegra && grandezas.isHaste) {
        matchRegra = catalogoOficial.find((c: any) => c.codigo === "HASTE-ATERRAMENTO-CANTONEIRA-GALV" || c.codigo === "HASTE-CANTONEIRA" || c.descricao.includes("Cantoneira"));
        if (matchRegra) {
          explicacaoRegra = "Haste Cantoneira de Aço Galvanizado a Fogo 2.40m identificada.";
        }
      }

      // Regra de Duto PEAD 3"
      if (!matchRegra && grandezas.duto === "PEAD-3") {
        matchRegra = catalogoOficial.find((c: any) => c.codigo === "DUTO-PEAD-3" || c.descricao.includes("PEAD"));
        if (matchRegra) {
          explicacaoRegra = 'Duto Corrugado PEAD Flexível 3" (85 mm) identificado.';
        }
      }

      // Regra de Caixa Subterrânea ZC / Tampão
      if (!matchRegra && grandezas.isTampaoZC) {
        if (/tampao|tampa/i.test(descFornecedor)) {
          matchRegra = catalogoOficial.find((c: any) => c.codigo === "TAMPA-FOFO-ZC");
          explicacaoRegra = "Tampão de Ferro Fundido Articulado para Caixa ZC identificado.";
        } else {
          matchRegra = catalogoOficial.find((c: any) => c.codigo === "CX-SUBTERRANEA-ZC");
          explicacaoRegra = "Caixa de Passagem Subterrânea Tipo ZC identificada.";
        }
      }

      // Regra de Terminal de Compressão
      if (!matchRegra && /terminal.*compressao/i.test(descFornecedor) && grandezas.bitola) {
        matchRegra = catalogoOficial.find(
          (c: any) => c.codigo.startsWith("TERM-COMPRESSAO-") && c.codigo.includes(grandezas.bitola!)
        );
        if (matchRegra) {
          explicacaoRegra = `Terminal de compressão tipo olhal para cabo ${grandezas.bitola} mm² identificado.`;
        }
      }

      if (matchRegra) {
        const eMenor = matchRegra.menorPrecoHistorico
          ? precoUnitFornecedor < matchRegra.menorPrecoHistorico
          : precoUnitFornecedor < matchRegra.precoAtual;

        itensConciliados.push({
          itemNumero: it.itemNumero,
          codigoFornecedor: codFornecedor,
          descricaoFornecedor: descFornecedor,
          unidadeFornecedor: it.unidade,
          quantidade: it.quantidade,
          precoUnitarioFornecedor: precoUnitFornecedor,
          marca: it.marca,
          status: "SUGESTAO_ALTA",
          confianca: 96,
          origemMatch: "REGRA_TECNICA",
          explicacao: explicacaoRegra,
          sugestao: {
            codigoOficial: matchRegra.codigo,
            descricaoOficial: matchRegra.descricao,
            categoria: matchRegra.categoria,
            unidade: matchRegra.unidade,
            precoAtual: matchRegra.precoAtual,
            menorPrecoHistorico: matchRegra.menorPrecoHistorico,
            fornecedorMenorPreco: matchRegra.fornecedorMenorPreco
          },
          isMenorPreco: eMenor,
          diferencaPreco: matchRegra.precoAtual - precoUnitFornecedor,
          percentualEconomia:
            matchRegra.precoAtual > 0
              ? Math.round(((matchRegra.precoAtual - precoUnitFornecedor) / matchRegra.precoAtual) * 100)
              : 0
        });
        continue;
      }

      // Se não caiu nas regras fixas, enviar para avaliação semântica inteligente
      itensParaAvaliacaoIA.push(it);
    }

    // 3. Avaliação com IA Multimodal / Semântica para os itens divergentes
    if (itensParaAvaliacaoIA.length > 0) {
      const rawKey = process.env.GEMINI_API_KEY || "";
      const cleanApiKey = rawKey.replace(/^["']|["']$/g, "").trim();

      if (cleanApiKey) {
        try {
          const client = new GoogleGenerativeAI(cleanApiKey);
          const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

          const promptIA = `Você é um engenheiro eletricista sênior do sistema Cordeiro Energia e especialista em conciliação de suprimentos no estilo Conta Azul.
Temos itens vindos de um orçamento comercial com descrições do fornecedor que precisam ser correlacionados com o nosso catálogo oficial de materiais elétricos/padrão CEMIG.

CATÁLOGO OFICIAL DISPONÍVEL (códigos e descrições):
${catalogoOficial.map((c: any) => `- [${c.codigo}] ${c.descricao} (Cat: ${c.categoria}, Un: ${c.unidade}, Preço: R$ ${c.precoAtual})`).join("\n")}

ITENS DO ORÇAMENTO DO FORNECEDOR PARA CONCILIAR:
${itensParaAvaliacaoIA.map((it: any) => `- Item ${it.itemNumero}: Cód: "${it.codigoFornecedor || ""}", Descrição: "${it.descricaoFornecedor}", Un: "${it.unidade}", Qtd: ${it.quantidade}, Preço: R$ ${it.precoUnitario}, Marca: "${it.marca || ""}"`).join("\n")}

TAREFA:
Para cada um dos itens do orçamento:
1. Avalie se ele corresponde a algum item do catálogo oficial, mesmo que com nome/termo diferente (ex: "CX.POLIFASICA CM-4" = "Caixa Metálica de Medição Tipo CM-4...").
2. Estipule a confiança de 0 a 100%.
3. Dê uma justificativa técnica concisa para a decisão em 1 linha.
4. Se realmente for um material inédito que não existe no catálogo, retorne codigoOficial como null e confianca 0.

Responda APENAS com JSON no formato:
[
  {
    "itemNumero": 1,
    "codigoOficial": "string ou null",
    "confianca": 95,
    "explicacao": "Disjuntor Soprano 200A 22kA correspondente ao disjuntor da norma CEMIG."
  }
]`;

          const aiResult = await model.generateContent(promptIA);
          const aiText = aiResult.response.text().trim();
          const cleanJson = aiText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          const matchesIA: any[] = JSON.parse(cleanJson);

          for (const it of itensParaAvaliacaoIA) {
            const matchInfo = matchesIA.find((m: any) => m.itemNumero === it.itemNumero);
            const precoUnitFornecedor = Number(it.precoUnitario) || 0;

            if (matchInfo && matchInfo.codigoOficial) {
              const materialOficial = catalogoOficial.find((c: any) => c.codigo === matchInfo.codigoOficial);
              if (materialOficial) {
                const eMenor = materialOficial.menorPrecoHistorico
                  ? precoUnitFornecedor < materialOficial.menorPrecoHistorico
                  : precoUnitFornecedor < materialOficial.precoAtual;

                itensConciliados.push({
                  itemNumero: it.itemNumero,
                  codigoFornecedor: it.codigoFornecedor,
                  descricaoFornecedor: it.descricaoFornecedor,
                  unidadeFornecedor: it.unidade,
                  quantidade: it.quantidade,
                  precoUnitarioFornecedor: precoUnitFornecedor,
                  marca: it.marca,
                  status: matchInfo.confianca >= 80 ? "SUGESTAO_ALTA" : "SUGESTAO_MEDIA",
                  confianca: matchInfo.confianca || 75,
                  origemMatch: "IA_SEMANTICA",
                  explicacao: matchInfo.explicacao || "Correspondência semântica sugerida pela IA.",
                  sugestao: {
                    codigoOficial: materialOficial.codigo,
                    descricaoOficial: materialOficial.descricao,
                    categoria: materialOficial.categoria,
                    unidade: materialOficial.unidade,
                    precoAtual: materialOficial.precoAtual,
                    menorPrecoHistorico: materialOficial.menorPrecoHistorico,
                    fornecedorMenorPreco: materialOficial.fornecedorMenorPreco
                  },
                  isMenorPreco: eMenor,
                  diferencaPreco: materialOficial.precoAtual - precoUnitFornecedor,
                  percentualEconomia:
                    materialOficial.precoAtual > 0
                      ? Math.round(((materialOficial.precoAtual - precoUnitFornecedor) / materialOficial.precoAtual) * 100)
                      : 0
                });
                continue;
              }
            }

            // Caso a IA não tenha casado
            itensConciliados.push({
              itemNumero: it.itemNumero,
              codigoFornecedor: it.codigoFornecedor,
              descricaoFornecedor: it.descricaoFornecedor,
              unidadeFornecedor: it.unidade,
              quantidade: it.quantidade,
              precoUnitarioFornecedor: precoUnitFornecedor,
              marca: it.marca,
              status: "NAO_ENCONTRADO",
              confianca: 0,
              origemMatch: "NENHUM",
              explicacao: "Material inédito ou sem correspondente evidente no catálogo atual.",
              sugestao: null,
              isMenorPreco: false,
              diferencaPreco: 0,
              percentualEconomia: 0
            });
          }
        } catch (iaErr) {
          console.warn("Avaliação semântica por IA falhou, usando itens não conciliados:", iaErr);
          for (const it of itensParaAvaliacaoIA) {
            itensConciliados.push({
              itemNumero: it.itemNumero,
              codigoFornecedor: it.codigoFornecedor,
              descricaoFornecedor: it.descricaoFornecedor,
              unidadeFornecedor: it.unidade,
              quantidade: it.quantidade,
              precoUnitarioFornecedor: Number(it.precoUnitario) || 0,
              marca: it.marca,
              status: "NAO_ENCONTRADO",
              confianca: 0,
              origemMatch: "NENHUM",
              explicacao: "Não vinculado automaticamente. Selecione manualmente.",
              sugestao: null,
              isMenorPreco: false,
              diferencaPreco: 0,
              percentualEconomia: 0
            });
          }
        }
      }
    }

    // Ordenar por itemNumero
    itensConciliados.sort((a, b) => a.itemNumero - b.itemNumero);

    return NextResponse.json({
      success: true,
      fornecedorNome,
      fornecedorCnpj,
      numeroOrcamento,
      totalItens: itensConciliados.length,
      conciliadosAutomaticamente: itensConciliados.filter((i) => i.confianca >= 80).length,
      catalogoOficial,
      itens: itensConciliados
    });
  } catch (error: any) {
    console.error("Erro na rota de conciliação:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno na conciliação de materiais" },
      { status: 500 }
    );
  }
}
