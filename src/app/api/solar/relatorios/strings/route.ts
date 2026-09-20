import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Mapeamento de números de série para apelidos padronizados de inversores
const INVERTER_MAPPING: Record<string, { nome: string; modelo: string }> = {
  // Manga Grande 01
  INV01: { nome: "Inversor 01", modelo: "SUN2000-100KTL-M1" },
  INV02: { nome: "Inversor 02", modelo: "SUN2000-100KTL-M1" },
  INV03: { nome: "Inversor 03", modelo: "SUN2000-100KTL-M1" },
  INV04: { nome: "Inversor 04", modelo: "SUN2000-100KTL-M1" },
  ES2380071220: { nome: "Inversor 01", modelo: "SUN2000-100KTL-M1" },
  ES2380071249: { nome: "Inversor 02", modelo: "SUN2000-100KTL-M1" },
  ES2450052227: { nome: "Inversor 03", modelo: "SUN2000-100KTL-M1" },
  ES2450054367: { nome: "Inversor 04", modelo: "SUN2000-100KTL-M1" },

  // Manga Grande 02
  ES2390024603: { nome: "Inversor 01", modelo: "SUN2000-100KTL-M1" },
  ES2390024605: { nome: "Inversor 02", modelo: "SUN2000-100KTL-M1" },
  ES2390025439: { nome: "Inversor 03", modelo: "SUN2000-100KTL-M1" },
  ES2390025524: { nome: "Inversor 04", modelo: "SUN2000-100KTL-M1" },

  // Manga Grande 03
  ES2470039558: { nome: "Inversor 01", modelo: "SUN2000-100KTL-M1" },
  ES2470040155: { nome: "Inversor 02", modelo: "SUN2000-100KTL-M1" },
  ES24B0086037: { nome: "Inversor 03", modelo: "SUN2000-100KTL-M1" },
  ES24B0086039: { nome: "Inversor 04", modelo: "SUN2000-100KTL-M1" },
};

function extrairInfoInversor(invKey: string, dbInversores?: any[]) {
  const mapeado = INVERTER_MAPPING[invKey];
  if (mapeado) {
    return {
      inversorId: invKey,
      inversorNome: `${mapeado.nome} (${invKey})`,
      rotulo: mapeado.nome,
      serial: invKey,
      modelo: mapeado.modelo,
    };
  }

  // Tentar encontrar nos inversores da usina cadastrados no banco
  if (dbInversores && dbInversores.length > 0) {
    const invDb = dbInversores.find(
      (inv: any) =>
        inv.numeroSerie === invKey ||
        inv.id === invKey ||
        (inv.numeroSerie && invKey.includes(inv.numeroSerie))
    );
    if (invDb) {
      return {
        inversorId: invDb.id,
        inversorNome: `${invDb.modelo || 'Inversor'} (${invDb.numeroSerie || invKey})`,
        rotulo: invDb.modelo || 'Inversor',
        serial: invDb.numeroSerie || invKey,
        modelo: invDb.modelo || 'Inversor Solar',
      };
    }
  }

  // Fallback se não for mapeado diretamente
  return {
    inversorId: invKey,
    inversorNome: `Inversor ${invKey}`,
    rotulo: invKey,
    serial: invKey,
    modelo: "Inversor Solar",
  };
}

function calcularMPPT(stringName: string): string {
  // Suporta _S14, _PV2, S14, PV2
  const match = stringName.match(/(?:_S|_PV|PV|S)(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const mpptNum = Math.ceil(num / 2);
    return `MPPT ${mpptNum}`;
  }
  return "MPPT --";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usinaIdParam = searchParams.get("usinaId"); // 'TODAS' ou ID específico
    const dateParam = searchParams.get("date") || "2026-09-14";
    const apenasFalhas = searchParams.get("apenasFalhas") !== "false"; // padrão true

    // Buscar usinas (todas ou filtrada por id)
    let usinasQuery = {};
    if (usinaIdParam && usinaIdParam !== "TODAS") {
      usinasQuery = { id: usinaIdParam };
    }

    const usinas = await prisma.usina.findMany({
      where: usinasQuery,
      include: { estacao: true, inversores: true },
      orderBy: { nome: "asc" },
    });

    if (usinas.length === 0) {
      return NextResponse.json({ error: "Nenhuma usina encontrada" }, { status: 404 });
    }

    const TARIFA_ENERGIA_RS = 0.90; // R$ 0,90/kWh
    const ENERGIA_MEDIA_STRING_KWH_DIA = 65.0; // ~65 kWh/dia por string de 12,5 kWp

    const relatorioUsinas = [];
    let complexoTotalFusivel = 0;
    let complexoTotalDesligadas = 0;
    let complexoTotalNaoConectadas = 0;
    let complexoTotalSubgeracao = 0;
    let complexoTotalNormais = 0;
    let complexoPerdaRSDia = 0;

    for (const u of usinas) {
      // 1. Tentar encontrar telemetria no dia solicitado com dados de strings
      let startDay = new Date(`${dateParam}T00:00:00-03:00`);
      let endDay = new Date(`${dateParam}T23:59:59-03:00`);

      let teles = await prisma.telemetria.findMany({
        where: {
          usinaId: u.id,
          timestamp: { gte: startDay, lte: endDay },
          potenciaAtivaKW: { gt: 350 },
        },
        orderBy: { potenciaAtivaKW: "desc" },
        take: 10,
      });

      let dataEfetiva = dateParam;

      // Se não houver telemetria na data solicitada para esta usina, buscar a data mais recente com dados de strings
      if (teles.length === 0 || !teles[0].dadosStrings) {
        const fallbackTele = await prisma.telemetria.findFirst({
          where: {
            usinaId: u.id,
            potenciaAtivaKW: { gt: 400 },
            dadosStrings: { not: null as any },
          },
          orderBy: { timestamp: "desc" },
        });

        if (fallbackTele) {
          const brtFallback = new Date(fallbackTele.timestamp.getTime() - 3 * 3600 * 1000);
          dataEfetiva = brtFallback.toISOString().split("T")[0];
          startDay = new Date(`${dataEfetiva}T00:00:00-03:00`);
          endDay = new Date(`${dataEfetiva}T23:59:59-03:00`);

          teles = await prisma.telemetria.findMany({
            where: {
              usinaId: u.id,
              timestamp: { gte: startDay, lte: endDay },
              potenciaAtivaKW: { gt: 350 },
            },
            orderBy: { potenciaAtivaKW: "desc" },
            take: 10,
          });
        }
      }

      if (teles.length === 0 || !teles[0]?.dadosStrings) {
        relatorioUsinas.push({
          usinaId: u.id,
          usinaNome: u.nome,
          capacidadeKWp: u.capacidadeKWp || 1400,
          capacidadeCA: (u as any).capacidadeCA || 1000,
          dataAnalisada: dataEfetiva,
          aviso: "Sem dados individualizados de strings na data solicitada.",
          resumo: {
            totalInversores: 0,
            totalStringsMonitoradas: 0,
            stringsNormais: 0,
            fusivelQueimadoCount: 0,
            desligadasCount: 0,
            subgeracaoCount: 0,
            perdaTotalKWhDia: 0,
            perdaTotalRSDia: 0,
            perdaTotalRSMes: 0,
          },
          inversores: [],
        });
        continue;
      }

      // Amostra de maior potência (pico de insolação)
      const picoTele = teles[0];
      const horaPicoBRT = new Date(picoTele.timestamp.getTime() - 3 * 3600 * 1000)
        .toISOString()
        .substring(11, 16);

      const stringsDict = picoTele.dadosStrings as Record<string, { V: number; I: number }>;

      // Agrupar por Inversor
      const inversoresMap: Record<
        string,
        {
          inversorInfo: ReturnType<typeof extrairInfoInversor>;
          stringsList: any[];
          normais: number;
          fusivel: number;
          desligadas: number;
          naoConectadas: number;
          subgeracao: number;
        }
      > = {};

      let plantFusivel = 0;
      let plantDesligadas = 0;
      let plantNaoConectadas = 0;
      let plantSubgeracao = 0;
      let plantNormais = 0;

      for (const [stringKey, val] of Object.entries(stringsDict)) {
        let invKey = "INV_GERAL";
        if (stringKey.includes("_")) {
          invKey = stringKey.split("_")[0];
        }

        if (!inversoresMap[invKey]) {
          inversoresMap[invKey] = {
            inversorInfo: extrairInfoInversor(invKey, u.inversores),
            stringsList: [],
            normais: 0,
            fusivel: 0,
            desligadas: 0,
            naoConectadas: 0,
            subgeracao: 0,
          };
        }

        const V = val.V || 0;
        const I = val.I || 0;
        const mppt = calcularMPPT(stringKey);

        let status: "FUSIVEL_QUEIMADO" | "DESLIGADA_ABERTA" | "NAO_CONECTADA_NC" | "SUBGERACAO" | "NORMAL" = "NORMAL";
        let severidade: "CRITICA" | "ALTA" | "MEDIA" | "OK" | "INFORMATIVO" = "OK";
        let diagnostico = "Operação fotovoltaica normal e gerando potência nominal.";
        let acaoRecomendada = "Nenhuma ação necessária.";
        let perdaKWh = 0;
        let perdaRS = 0;

        // Regras físicas precisas:
        if (I < 0.2 && V >= 350) {
          // Fusível Queimado / Chave gPV Aberta: Tensão alta do barramento MPPT presente, mas corrente nula!
          status = "FUSIVEL_QUEIMADO";
          severidade = "CRITICA";
          diagnostico = `Tensão de circuito aberto alta (${V.toFixed(1)} V) e corrente zero (${I.toFixed(2)} A) sob pleno sol. Fusível gPV de 15A aberto ou chave CC desarmada.`;
          acaoRecomendada = "Substituir fusível cerâmico gPV 15A 1000V DC e verificar seccionadora CC.";
          perdaKWh = ENERGIA_MEDIA_STRING_KWH_DIA;
          perdaRS = parseFloat((ENERGIA_MEDIA_STRING_KWH_DIA * TARIFA_ENERGIA_RS).toFixed(2));

          inversoresMap[invKey].fusivel++;
          plantFusivel++;
        } else if (I < 0.15 && V < 50) {
          // Porta Não Conectada de Projeto (NC - Not Connected)
          // Em inversores com 18 a 24 entradas onde nem todas são utilizadas pela usina (sem perda financeira!)
          status = "NAO_CONECTADA_NC";
          severidade = "INFORMATIVO";
          diagnostico = `Canal CC não conectado no inversor (NC de projeto). Tensão e corrente nulas (${V.toFixed(1)} V / ${I.toFixed(2)} A).`;
          acaoRecomendada = "Porta sobressalente de projeto sem cabeamento fotovoltaico. Nenhuma perda.";
          perdaKWh = 0;
          perdaRS = 0;

          inversoresMap[invKey].naoConectadas++;
          plantNaoConectadas++;
        } else if (I < 0.2 && V >= 50 && V < 350) {
          // Série Desconectada / Conector MC4 Aberto / Tensão Residual
          status = "DESLIGADA_ABERTA";
          severidade = "ALTA";
          diagnostico = `Tensão residual atípica (${V.toFixed(1)} V) e corrente zero (${I.toFixed(2)} A). String desconectada fisicamente, cabo interrompido ou conector solto.`;
          acaoRecomendada = "Inspecionar engate dos conectores MC4 e verificar continuidade dos cabos do arranjo.";
          perdaKWh = ENERGIA_MEDIA_STRING_KWH_DIA;
          perdaRS = parseFloat((ENERGIA_MEDIA_STRING_KWH_DIA * TARIFA_ENERGIA_RS).toFixed(2));

          inversoresMap[invKey].desligadas++;
          plantDesligadas++;
        } else if (I < 4.0 && V >= 350) {
          // Subgeração Severa / Degradação / Sombra
          status = "SUBGERACAO";
          severidade = "MEDIA";
          diagnostico = `Corrente anormalmente baixa (${I.toFixed(2)} A) com tensão presente (${V.toFixed(1)} V). Possível sombreamento localizado, sujeira concentrada ou diodo de bypass em curto.`;
          acaoRecomendada = "Inspecionar termografia da string e verificar sujidade localizada ou diodos da caixa de junção.";
          perdaKWh = parseFloat((ENERGIA_MEDIA_STRING_KWH_DIA * 0.5).toFixed(1));
          perdaRS = parseFloat((perdaKWh * TARIFA_ENERGIA_RS).toFixed(2));

          inversoresMap[invKey].subgeracao++;
          plantSubgeracao++;
        } else {
          plantNormais++;
          inversoresMap[invKey].normais++;
        }

        const stringObj = {
          stringName: stringKey,
          mppt,
          tensaoV: parseFloat(V.toFixed(1)),
          correnteA: parseFloat(I.toFixed(2)),
          potenciaKW: parseFloat(((V * I) / 1000).toFixed(2)),
          status,
          severidade,
          diagnostico,
          acaoRecomendada,
          perdaKWhDia: perdaKWh,
          perdaRSDia: perdaRS,
        };

        if (!apenasFalhas || (status !== "NORMAL" && status !== "NAO_CONECTADA_NC")) {
          inversoresMap[invKey].stringsList.push(stringObj);
        }
      }

      // Ordenar inversores por número (Inversor 01, Inversor 02, etc.)
      const listaInversores = Object.values(inversoresMap).map((inv) => {
        const totalAfetadas = inv.fusivel + inv.desligadas + inv.subgeracao;
        let statusGeral: "CRITICO" | "ALERTA" | "NORMAL" = "NORMAL";
        if (inv.fusivel > 0) statusGeral = "CRITICO";
        else if (inv.desligadas > 0 || inv.subgeracao > 0) statusGeral = "ALERTA";

        const perdaKWhInv = parseFloat(
          (
            inv.fusivel * ENERGIA_MEDIA_STRING_KWH_DIA +
            inv.desligadas * ENERGIA_MEDIA_STRING_KWH_DIA +
            inv.subgeracao * (ENERGIA_MEDIA_STRING_KWH_DIA * 0.5)
          ).toFixed(1)
        );
        const perdaRSInv = parseFloat((perdaKWhInv * TARIFA_ENERGIA_RS).toFixed(2));

        // Ordenar strings afetadas por criticidade e nome
        inv.stringsList.sort((a, b) => {
          if (a.status === "FUSIVEL_QUEIMADO" && b.status !== "FUSIVEL_QUEIMADO") return -1;
          if (b.status === "FUSIVEL_QUEIMADO" && a.status !== "FUSIVEL_QUEIMADO") return 1;
          return a.stringName.localeCompare(b.stringName);
        });

        return {
          inversorId: inv.inversorInfo.inversorId,
          inversorNome: inv.inversorInfo.inversorNome,
          rotulo: inv.inversorInfo.rotulo,
          serial: inv.inversorInfo.serial,
          modelo: inv.inversorInfo.modelo,
          status: statusGeral,
          resumo: {
            totalStringsMonitoradas: inv.normais + totalAfetadas,
            normais: inv.normais,
            fusivelQueimado: inv.fusivel,
            desligadas: inv.desligadas,
            naoConectadas: inv.naoConectadas,
            subgeracao: inv.subgeracao,
            totalComFalha: totalAfetadas,
            perdaKWhDia: perdaKWhInv,
            perdaRSDia: perdaRSInv,
            perdaRSMes: parseFloat((perdaRSInv * 30).toFixed(2)),
          },
          stringsAfetadas: inv.stringsList,
        };
      });

      listaInversores.sort((a, b) => a.rotulo.localeCompare(b.rotulo));

      const plantPerdaKWhDia = parseFloat(
        (
          plantFusivel * ENERGIA_MEDIA_STRING_KWH_DIA +
          plantDesligadas * ENERGIA_MEDIA_STRING_KWH_DIA +
          plantSubgeracao * (ENERGIA_MEDIA_STRING_KWH_DIA * 0.5)
        ).toFixed(1)
      );
      const plantPerdaRSDia = parseFloat((plantPerdaKWhDia * TARIFA_ENERGIA_RS).toFixed(2));
      const plantPerdaRSMes = parseFloat((plantPerdaRSDia * 30).toFixed(2));

      complexoTotalFusivel += plantFusivel;
      complexoTotalDesligadas += plantDesligadas;
      complexoTotalNaoConectadas += plantNaoConectadas;
      complexoTotalSubgeracao += plantSubgeracao;
      complexoTotalNormais += plantNormais;
      complexoPerdaRSDia += plantPerdaRSDia;

      relatorioUsinas.push({
        usinaId: u.id,
        usinaNome: u.nome,
        capacidadeKWp: u.capacidadeKWp || 1400,
        capacidadeCA: (u as any).capacidadeCA || 1000,
        dataAnalisada: dataEfetiva,
        horaPicoBRT,
        potenciaPicoKW: picoTele.potenciaAtivaKW,
        resumo: {
          totalInversores: listaInversores.length,
          totalStringsMonitoradas: plantNormais + plantFusivel + plantDesligadas + plantSubgeracao,
          stringsNormais: plantNormais,
          fusivelQueimadoCount: plantFusivel,
          desligadasCount: plantDesligadas,
          naoConectadasCount: plantNaoConectadas,
          subgeracaoCount: plantSubgeracao,
          totalComFalha: plantFusivel + plantDesligadas + plantSubgeracao,
          perdaTotalKWhDia: plantPerdaKWhDia,
          perdaTotalRSDia: plantPerdaRSDia,
          perdaTotalRSMes: plantPerdaRSMes,
        },
        inversores: listaInversores,
      });
    }

    return NextResponse.json({
      success: true,
      dataReferencia: dateParam,
      consolidadoComplexo: {
        totalUsinas: relatorioUsinas.length,
        totalStringsNormais: complexoTotalNormais,
        totalFusivelQueimado: complexoTotalFusivel,
        totalDesligadas: complexoTotalDesligadas,
        totalNaoConectadas: complexoTotalNaoConectadas,
        totalSubgeracao: complexoTotalSubgeracao,
        totalComFalha: complexoTotalFusivel + complexoTotalDesligadas + complexoTotalSubgeracao,
        perdaTotalRSDia: parseFloat(complexoPerdaRSDia.toFixed(2)),
        perdaTotalRSMes: parseFloat((complexoPerdaRSDia * 30).toFixed(2)),
      },
      usinas: relatorioUsinas,
    });
  } catch (error: any) {
    console.error("Erro no relatório de strings por inversor:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao gerar relatório de strings" },
      { status: 500 }
    );
  }
}
