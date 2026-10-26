import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ev/bom/sync-capex
 * Retorna o catálogo unificado de preços da Cordeiro Energia (CemigMaterialPreco + OrcamentoItemPadrao)
 */
export async function GET() {
  try {
    const [cemigItems, orcamentoItems] = await Promise.all([
      prisma.cemigMaterialPreco.findMany({
        where: { ativo: true },
        select: {
          codigo: true,
          descricao: true,
          categoria: true,
          unidade: true,
          precoUnitario: true,
          menorPreco: true,
          fornecedorMenorPreco: true
        }
      }),
      prisma.orcamentoItemPadrao.findMany({
        select: {
          codigo: true,
          descricao: true,
          tipo: true,
          unidade: true,
          precoBaseUnitario: true,
          menorPreco: true,
          fornecedorMenorPreco: true
        }
      })
    ]);

    const catalog: Record<string, {
      unitPrice: number;
      supplier: string;
      source: 'CEMIG_DB' | 'CAPEX_DB' | 'ESTIMATIVA_WEB';
      codigo?: string;
      unidade?: string;
    }> = {};

    const itemsList: Array<{
      codigo: string;
      descricao: string;
      categoria: string;
      unidade: string;
      precoUnitario: number;
      fornecedor: string;
      source: 'CEMIG_DB' | 'CAPEX_DB' | 'ESTIMATIVA_WEB';
    }> = [];

    // 1. Mapeia itens normativos da CEMIG
    cemigItems.forEach(item => {
      const price = item.menorPreco && item.menorPreco > 0 ? item.menorPreco : item.precoUnitario;
      const supplier = item.fornecedorMenorPreco || "Distribuidor CEMIG Homologado";
      
      if (item.codigo) {
        catalog[item.codigo] = {
          unitPrice: price,
          supplier,
          source: 'CEMIG_DB',
          codigo: item.codigo,
          unidade: item.unidade
        };
      }
      catalog[item.descricao.trim().toLowerCase()] = {
        unitPrice: price,
        supplier,
        source: 'CEMIG_DB',
        codigo: item.codigo,
        unidade: item.unidade
      };

      itemsList.push({
        codigo: item.codigo || `CEMIG-${itemsList.length + 1}`,
        descricao: item.descricao,
        categoria: item.categoria || 'PADRAO_CEMIG',
        unidade: item.unidade || 'un',
        precoUnitario: price,
        fornecedor: supplier,
        source: 'CEMIG_DB'
      });
    });

    // 2. Mapeia itens do catálogo master de orçamentos (CAPEX)
    orcamentoItems.forEach(item => {
      const price = item.menorPreco && item.menorPreco > 0 ? item.menorPreco : (item.precoBaseUnitario || 0);
      const isWeb = item.fornecedorMenorPreco === 'ESTIMATIVA_WEB';
      const supplier = item.fornecedorMenorPreco || "Fornecedor Homologado Cordeiro";

      if (item.codigo) {
        catalog[item.codigo] = {
          unitPrice: price,
          supplier,
          source: isWeb ? 'ESTIMATIVA_WEB' : 'CAPEX_DB',
          codigo: item.codigo,
          unidade: item.unidade
        };
      }
      catalog[item.descricao.trim().toLowerCase()] = {
        unitPrice: price,
        supplier,
        source: isWeb ? 'ESTIMATIVA_WEB' : 'CAPEX_DB',
        codigo: item.codigo || undefined,
        unidade: item.unidade
      };

      itemsList.push({
        codigo: item.codigo || `CAPEX-${itemsList.length + 1}`,
        descricao: item.descricao,
        categoria: item.tipo || 'Material',
        unidade: item.unidade || 'un',
        precoUnitario: price,
        fornecedor: supplier,
        source: isWeb ? 'ESTIMATIVA_WEB' : 'CAPEX_DB'
      });
    });

    // 3. Garante a presença dos kits prontos e materiais normativos recentes no catálogo
    const extraEssentialItems = [
      {
        codigo: 'KIT-PADRAO-CM09-CM04',
        descricao: 'Conjunto Padrão Caixa CM-09 + Caixa CM-04 com Barramento sem disjuntor',
        categoria: 'Padrão de Entrada',
        unidade: 'cj',
        precoUnitario: 1250.0,
        fornecedor: 'Strahl / Cemar (PEC-11)',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'KIT-PADRAO-CM18-CM04',
        descricao: 'Conjunto Padrão Caixa CM-18 + Caixa CM-04 com Barramento sem disjuntor',
        categoria: 'Padrão de Entrada',
        unidade: 'cj',
        precoUnitario: 1480.0,
        fornecedor: 'Strahl / Cemar (PEC-11)',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'MAT-BASE-CONCRETO',
        descricao: 'Material Civil para Base Concretada do Poste (Cimento, Areia, Brita)',
        categoria: 'Civil / Padrão',
        unidade: 'cj',
        precoUnitario: 220.0,
        fornecedor: 'Distribuidor Local Materiais de Construção',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'TERM-COMP-120MM',
        descricao: 'Terminal Tubular de Compressão Estanhado 120 mm² para Cabos de Fase e Neutro (com Termoencolhível)',
        categoria: 'Acessórios',
        unidade: 'pç',
        precoUnitario: 24.0,
        fornecedor: 'Intelli / Magnet',
        source: 'CAPEX_DB' as const
      },
      {
        codigo: 'TERM-COMP-70MM',
        descricao: 'Terminal Tubular de Compressão Estanhado 70 mm² para Cabo de Proteção / Terra (com Termoencolhível)',
        categoria: 'Acessórios',
        unidade: 'pç',
        precoUnitario: 15.5,
        fornecedor: 'Intelli / Magnet',
        source: 'CAPEX_DB' as const
      },
      {
        codigo: 'ELETRODUTO-ACO-GALV-FOGO-80',
        descricao: 'Eletroduto de Aço Carbono Galvanizado a Fogo NBR 5598 Ø 80 mm (3") - Barra 3m',
        categoria: 'Eletrodutos',
        unidade: 'br',
        precoUnitario: 220.0,
        fornecedor: 'Apolo Tubos / Tuper (Homologado CEMIG)',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'ELETRODUTO-ACO-GALV-FOGO-100',
        descricao: 'Eletroduto de Aço Carbono Galvanizado a Fogo NBR 5598 Ø 100 mm (4") - Barra 3m',
        categoria: 'Eletrodutos',
        unidade: 'br',
        precoUnitario: 295.0,
        fornecedor: 'Apolo Tubos / Tuper (Homologado CEMIG)',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'CURVA-90-ACO-GALV-FOGO-80',
        descricao: 'Curva 90º de Aço Galvanizado a Fogo Roscável Ø 80 mm (3")',
        categoria: 'Eletrodutos',
        unidade: 'un',
        precoUnitario: 95.0,
        fornecedor: 'Apolo Tubos / Daisa',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'CURVA-90-ACO-GALV-FOGO-100',
        descricao: 'Curva 90º de Aço Galvanizado a Fogo Roscável Ø 100 mm (4")',
        categoria: 'Eletrodutos',
        unidade: 'un',
        precoUnitario: 145.0,
        fornecedor: 'Apolo Tubos / Daisa',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'MAT-MASSA-CALAFETAR-1KG',
        descricao: 'Massa de Calafetar para Vedação contra Umidade (Embalagem 1 kg) - Norma CEMIG ND-5.1',
        categoria: 'Acessórios',
        unidade: 'kg',
        precoUnitario: 28.0,
        fornecedor: 'Poliplás / Vedacit',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'FITA-FUSIMEC-ALTA-ISOLACAO',
        descricao: 'Fita de Autofusão Fusimec para Alta Isolação Dielétrica',
        categoria: 'Acessórios',
        unidade: 'm',
        precoUnitario: 16.5,
        fornecedor: '3M / Fusimec',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'PRESILHA-FITA-FUSIMEC',
        descricao: 'Presilha Metálica para Fixação e Amarração de Fita Fusimec',
        categoria: 'Acessórios',
        unidade: 'un',
        precoUnitario: 2.5,
        fornecedor: 'Fusimec / Intelli',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'CX-SUBTERRANEA-ZA',
        descricao: 'Caixa Subterrânea de Passagem Tipo ZA em Alvenaria/Concreto (30 x 30 x 40 cm - Norma CEMIG ND-5.1)',
        categoria: 'Infraestrutura',
        unidade: 'un',
        precoUnitario: 280.0,
        fornecedor: 'Pré-Moldados / Alvenaria CEMIG',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'TAMPA-FOFO-ZA',
        descricao: 'Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZA (Padrão CEMIG)',
        categoria: 'Infraestrutura',
        unidade: 'un',
        precoUnitario: 210.0,
        fornecedor: 'Fundição Homologada CEMIG',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'CX-SUBTERRANEA-ZB',
        descricao: 'Caixa Subterrânea de Passagem Tipo ZB em Alvenaria/Concreto (50 x 50 x 60 cm - Norma CEMIG ND-5.1)',
        categoria: 'Infraestrutura',
        unidade: 'un',
        precoUnitario: 420.0,
        fornecedor: 'Pré-Moldados / Alvenaria CEMIG',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'TAMPA-FOFO-ZB',
        descricao: 'Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZB (Padrão CEMIG)',
        categoria: 'Infraestrutura',
        unidade: 'un',
        precoUnitario: 320.0,
        fornecedor: 'Fundição Homologada CEMIG',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'NIPLE-PVC-ROSCAVEL-50',
        descricao: 'Niple Roscável de PVC Rígido Ø 50 mm (1.1/2") para Acoplamento de Caixas',
        categoria: 'Eletrodutos',
        unidade: 'un',
        precoUnitario: 15.0,
        fornecedor: 'Tigre / Amanco',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'NIPLE-PVC-ROSCAVEL-60',
        descricao: 'Niple Roscável de PVC Rígido Ø 60 mm (2") para Acoplamento de Caixas',
        categoria: 'Eletrodutos',
        unidade: 'un',
        precoUnitario: 19.0,
        fornecedor: 'Tigre / Amanco',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'NIPLE-PVC-ROSCAVEL-80',
        descricao: 'Niple Roscável de PVC Rígido Ø 80 mm (3") para Acoplamento de Caixas',
        categoria: 'Eletrodutos',
        unidade: 'un',
        precoUnitario: 24.0,
        fornecedor: 'Tigre / Amanco',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'NIPLE-PVC-ROSCAVEL-100',
        descricao: 'Niple Roscável de PVC Rígido Ø 100 mm (4") para Acoplamento de Caixas',
        categoria: 'Eletrodutos',
        unidade: 'un',
        precoUnitario: 36.0,
        fornecedor: 'Tigre / Amanco',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'BUCHA-ARRUELA-PVC-80',
        descricao: 'Conjunto Bucha e Arruela de PVC Roscável Ø 80 mm (3") para Terminação de Eletroduto',
        categoria: 'Eletrodutos',
        unidade: 'cj',
        precoUnitario: 32.0,
        fornecedor: 'Tigre / Daisa',
        source: 'CEMIG_DB' as const
      },
      {
        codigo: 'BUCHA-ARRUELA-PVC-100',
        descricao: 'Conjunto Bucha e Arruela de PVC Roscável Ø 100 mm (4") para Terminação de Eletroduto',
        categoria: 'Eletrodutos',
        unidade: 'cj',
        precoUnitario: 45.0,
        fornecedor: 'Tigre / Daisa',
        source: 'CEMIG_DB' as const
      }
    ];

    extraEssentialItems.forEach(it => {
      if (!catalog[it.codigo]) {
        catalog[it.codigo] = {
          unitPrice: it.precoUnitario,
          supplier: it.fornecedor,
          source: it.source,
          codigo: it.codigo,
          unidade: it.unidade
        };
        itemsList.push(it);
      }
    });

    return NextResponse.json({
      success: true,
      totalItens: itemsList.length,
      catalog,
      itemsList
    });
  } catch (error: any) {
    console.error("Erro ao carregar catálogo unificado CAPEX:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao carregar dados do CAPEX" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ev/bom/sync-capex
 * Sincroniza em segundo plano a BOM modular com a tabela OrcamentoProjeto e suas OrcamentoEtapas
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      projectName,
      clientName,
      stages,
      globalBdiPercent = 20
    } = body;

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json(
        { success: false, error: "Estrutura de etapas inválida" },
        { status: 400 }
      );
    }

    const titleProject = projectName || clientName 
      ? `Eletroposto - ${projectName || clientName}` 
      : `Eletroposto VE Hub - ${new Date().toLocaleDateString('pt-BR')}`;

    // 1. Localiza ou cria o OrcamentoProjeto em modo "Rascunho"
    let orcamentoProjeto;
    if (projectId) {
      orcamentoProjeto = await prisma.orcamentoProjeto.findUnique({
        where: { id: projectId }
      });
    }

    if (!orcamentoProjeto) {
      orcamentoProjeto = await prisma.orcamentoProjeto.findFirst({
        where: {
          nome: titleProject,
          status: "Rascunho"
        }
      });
    }

    if (!orcamentoProjeto) {
      orcamentoProjeto = await prisma.orcamentoProjeto.create({
        data: {
          nome: titleProject,
          cliente: clientName || "Cliente Particular",
          status: "Rascunho"
        }
      });
    } else {
      orcamentoProjeto = await prisma.orcamentoProjeto.update({
        where: { id: orcamentoProjeto.id },
        data: {
          dataAtualizacao: new Date()
        }
      });
    }

    // 2. Itera sobre cada uma das 9 etapas físicas e sincroniza com OrcamentoEtapa
    for (const stage of stages) {
      let etapa = await prisma.orcamentoEtapa.findFirst({
        where: {
          projetoId: orcamentoProjeto.id,
          nome: stage.title
        }
      });

      if (!etapa) {
        etapa = await prisma.orcamentoEtapa.create({
          data: {
            projetoId: orcamentoProjeto.id,
            nome: stage.title,
            ordem: stage.order,
            pesoPercentual: 0
          }
        });
      } else {
        etapa = await prisma.orcamentoEtapa.update({
          where: { id: etapa.id },
          data: {
            ordem: stage.order
          }
        });
      }

      // Limpa os itens antigos desta etapa para sincronizar os itens redimensionados
      await prisma.orcamentoItem.deleteMany({
        where: { etapaId: etapa.id }
      });

      // Cria os itens atualizados da etapa
      if (stage.items && stage.items.length > 0) {
        await prisma.orcamentoItem.createMany({
          data: stage.items.map((it: any) => ({
            etapaId: etapa.id,
            codigo: it.codigo || null,
            descricao: it.description,
            tipo: it.category || "Material",
            unidade: it.unit || "un",
            quantidade: Number(it.quantity) || 1,
            precoBaseUnitario: it.unitPriceBRL ? Number(it.unitPriceBRL) : null,
            bdiPercent: Number(globalBdiPercent) || 0
          }))
        });
      }
    }

    return NextResponse.json({
      success: true,
      orcamentoProjetoId: orcamentoProjeto.id,
      nomeProjeto: orcamentoProjeto.nome,
      status: orcamentoProjeto.status,
      synchronizedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Erro na sincronização em segundo plano com o CAPEX:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro na sincronização CAPEX" },
      { status: 500 }
    );
  }
}
