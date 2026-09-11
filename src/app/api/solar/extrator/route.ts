import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HuaweiSyncService } from "@/lib/services/huaweiSyncService";
import { SolisSyncService } from "@/lib/services/solisSyncService";
import { HoymilesSyncService } from "@/lib/services/hoymilesSyncService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId") || "";
    const inverterSn = searchParams.get("inverterSn") || "";
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const startTime = searchParams.get("startTime") || "00:00";
    const endTime = searchParams.get("endTime") || "23:59";
    const plataforma = (searchParams.get("plataforma") || "TODAS").toUpperCase();
    const limit = parseInt(searchParams.get("limit") || "2000", 10);

    // 1. Buscar Usinas do banco
    const usinasWhere: any = {};
    if (plataforma !== "TODAS") {
      usinasWhere.apiFornecedor = { equals: plataforma, mode: "insensitive" };
    }

    const usinas = await prisma.usina.findMany({
      where: usinasWhere,
      select: {
        id: true,
        nome: true,
        capacidadeKWp: true,
        localizacao: true,
        apiFornecedor: true,
        apiId: true,
        inversores: {
          select: {
            id: true,
            numeroSerie: true,
            modelo: true,
            potenciaNominalKW: true,
            status: true,
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    // 2. Construir filtro de datas para a busca (Horário de Brasília America/Sao_Paulo UTC-3)
    const dayStartUTC = new Date(`${dateStr}T${startTime}:00-03:00`);
    const dayEndUTC = new Date(`${dateStr}T${endTime}:59-03:00`);

    const telemetriaWhere: any = {
      timestamp: {
        gte: dayStartUTC,
        lte: dayEndUTC,
      },
    };

    if (usinaId) {
      telemetriaWhere.usinaId = usinaId;
    } else if (plataforma !== "TODAS") {
      const usinasPlataforma = usinas.map((u) => u.id);
      telemetriaWhere.usinaId = { in: usinasPlataforma };
    }

    // Buscar telemetrias do banco de dados
    const rawTelemetria = await prisma.telemetria.findMany({
      where: telemetriaWhere,
      include: {
        usina: {
          select: {
            id: true,
            nome: true,
            capacidadeKWp: true,
            apiFornecedor: true,
            inversores: {
              select: {
                id: true,
                numeroSerie: true,
                modelo: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    // Auto-Descoberta de Inversores via Strings no banco se a lista de inversores da usina estiver incompleta
    const discoveredInvertersMap = new Map<string, Set<string>>(); // usinaId -> Set(SNs)
    rawTelemetria.forEach((t) => {
      const stringsData = (t.dadosStrings as Record<string, { V: number; I: number }>) || {};
      Object.keys(stringsData).forEach((key) => {
        const parts = key.split("_");
        if (parts.length >= 2) {
          const sn = parts[0];
          if (sn && sn !== "N/A" && sn !== "Inv1" && sn !== "Inv2") {
            if (!discoveredInvertersMap.has(t.usinaId)) {
              discoveredInvertersMap.set(t.usinaId, new Set());
            }
            discoveredInvertersMap.get(t.usinaId)!.add(sn);
          }
        }
      });
    });

    // Auto-upsert dos inversores descobertos no Prisma
    for (const [uId, snSet] of discoveredInvertersMap.entries()) {
      for (const sn of Array.from(snSet)) {
        await prisma.inversor
          .upsert({
            where: { numeroSerie: sn },
            update: { usinaId: uId, status: "ONLINE" },
            create: {
              usinaId: uId,
              numeroSerie: sn,
              modelo: "Inversor Fotovoltaico",
              potenciaNominalKW: 100,
              status: "ONLINE",
            },
          })
          .catch(() => {});
      }
    }

    // Atualiza a lista de inversores para o seletor da UI
    const usinasAtualizadas = await prisma.usina.findMany({
      where: usinasWhere,
      select: {
        id: true,
        nome: true,
        capacidadeKWp: true,
        localizacao: true,
        apiFornecedor: true,
        apiId: true,
        inversores: {
          select: {
            id: true,
            numeroSerie: true,
            modelo: true,
            potenciaNominalKW: true,
            status: true,
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    const todosInversores = usinasAtualizadas.flatMap((u) =>
      u.inversores.map((i) => ({
        ...i,
        usinaId: u.id,
        usinaNome: u.nome,
        apiFornecedor: u.apiFornecedor,
      }))
    );

    // 3. Processar telemetrias desmembrando por INVERSOR INDIVIDUAL e TOTAL CONSOLIDADO
    const telemetriaProcessada: any[] = [];

    rawTelemetria.forEach((item) => {
      const stringsData = (item.dadosStrings as Record<string, { V: number; I: number }>) || {};
      const tsISO = item.timestamp.toISOString();
      const tsFormatted = new Date(item.timestamp).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const horaStr = new Date(item.timestamp).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Agrupar strings por prefixo de SN de Inversor
      const stringsPorInversor: Record<string, Record<string, { V: number; I: number }>> = {};

      Object.entries(stringsData).forEach(([fullKey, val]) => {
        const parts = fullKey.split("_");
        let sn = parts[0];
        let stringName = parts.slice(1).join("_") || fullKey;

        if (!sn || sn === "Inv1" || sn === "Inv2") {
          if (item.usina.inversores && item.usina.inversores.length > 0) {
            sn = item.usina.inversores[0].numeroSerie;
          } else {
            sn = "INVERSOR-01";
          }
        }

        if (!stringsPorInversor[sn]) {
          stringsPorInversor[sn] = {};
        }
        stringsPorInversor[sn][stringName] = val;
      });

      const invSNs = Object.keys(stringsPorInversor);
      const numInversores = invSNs.length > 0 ? invSNs.length : Math.max(item.usina.inversores.length, 1);

      // A) Adicionar Linhas de Inversores Individuais
      if (invSNs.length > 0) {
        invSNs.forEach((sn, idx) => {
          const invStrings = stringsPorInversor[sn];
          let invP_DC = 0;
          Object.values(invStrings).forEach((s) => {
            if (s && s.V && s.I) invP_DC += (s.V * s.I) / 1000;
          });

          const modeloInversor =
            item.usina.inversores.find((i) => i.numeroSerie === sn)?.modelo || `Inversor 0${idx + 1}`;

          telemetriaProcessada.push({
            id: `${item.id}_${sn}`,
            telemetriaId: item.id,
            usinaId: item.usinaId,
            usinaNome: item.usina.nome,
            apiFornecedor: item.usina.apiFornecedor,
            tipoLinha: "INDIVIDUAL",
            inversorSN: sn,
            inversorModelo: modeloInversor,
            timestamp: tsISO,
            timestampFormatted: tsFormatted,
            hora: horaStr,
            potenciaAtivaKW: parseFloat(((item.potenciaAtivaKW || 0) / numInversores).toFixed(2)),
            potenciaCCTotalKW: parseFloat(invP_DC.toFixed(2)),
            energiaAcumuladaKWh: parseFloat(((item.energiaAcumuladaKWh || 0) / numInversores).toFixed(1)),
            tensaoCA_A: item.tensaoCA_A || 0,
            tensaoCA_B: item.tensaoCA_B || 0,
            tensaoCA_C: item.tensaoCA_C || 0,
            correnteCA_A: parseFloat(((item.correnteCA_A || 0) / numInversores).toFixed(1)),
            correnteCA_B: parseFloat(((item.correnteCA_B || 0) / numInversores).toFixed(1)),
            correnteCA_C: parseFloat(((item.correnteCA_C || 0) / numInversores).toFixed(1)),
            frequenciaRede: item.frequenciaRede || 60,
            tempIGBT: item.tempIGBT || 0,
            statusInversor: item.statusInversor || "ONLINE",
            dadosStrings: invStrings,
          });
        });
      } else {
        const invSN = item.usina.inversores[0]?.numeroSerie || "INVERSOR-01";
        telemetriaProcessada.push({
          id: `${item.id}_single`,
          telemetriaId: item.id,
          usinaId: item.usinaId,
          usinaNome: item.usina.nome,
          apiFornecedor: item.usina.apiFornecedor,
          tipoLinha: "INDIVIDUAL",
          inversorSN: invSN,
          inversorModelo: item.usina.inversores[0]?.modelo || "Inversor Solar",
          timestamp: tsISO,
          timestampFormatted: tsFormatted,
          hora: horaStr,
          potenciaAtivaKW: item.potenciaAtivaKW || 0,
          potenciaCCTotalKW: item.potenciaAtivaKW || 0,
          energiaAcumuladaKWh: item.energiaAcumuladaKWh || 0,
          tensaoCA_A: item.tensaoCA_A || 0,
          tensaoCA_B: item.tensaoCA_B || 0,
          tensaoCA_C: item.tensaoCA_C || 0,
          correnteCA_A: item.correnteCA_A || 0,
          correnteCA_B: item.correnteCA_B || 0,
          correnteCA_C: item.correnteCA_C || 0,
          frequenciaRede: item.frequenciaRede || 60,
          tempIGBT: item.tempIGBT || 0,
          statusInversor: item.statusInversor || "ONLINE",
          dadosStrings: stringsData,
        });
      }

      // B) Adicionar Linha de Total Consolidado da Usina
      let totalP_DC = 0;
      Object.values(stringsData).forEach((s) => {
        if (s && s.V && s.I) totalP_DC += (s.V * s.I) / 1000;
      });

      telemetriaProcessada.push({
        id: `${item.id}_CONSOLIDADO`,
        telemetriaId: item.id,
        usinaId: item.usinaId,
        usinaNome: item.usina.nome,
        apiFornecedor: item.usina.apiFornecedor,
        tipoLinha: "CONSOLIDADO",
        inversorSN: `TOTAL CONSOLIDADO (${numInversores} INVERSORES)`,
        inversorModelo: `Usina Total (${numInversores} Inversores)`,
        timestamp: tsISO,
        timestampFormatted: tsFormatted,
        hora: horaStr,
        potenciaAtivaKW: item.potenciaAtivaKW || 0,
        potenciaCCTotalKW: parseFloat(totalP_DC.toFixed(2)),
        energiaAcumuladaKWh: item.energiaAcumuladaKWh || 0,
        tensaoCA_A: item.tensaoCA_A || 0,
        tensaoCA_B: item.tensaoCA_B || 0,
        tensaoCA_C: item.tensaoCA_C || 0,
        correnteCA_A: item.correnteCA_A || 0,
        correnteCA_B: item.correnteCA_B || 0,
        correnteCA_C: item.correnteCA_C || 0,
        frequenciaRede: item.frequenciaRede || 60,
        tempIGBT: item.tempIGBT || 0,
        statusInversor: item.statusInversor || "ONLINE",
        dadosStrings: stringsData,
      });
    });

    // 4. Filtrar por Inversor (SN ou CONSOLIDADO) se selecionado
    let telemetriaFiltrada = telemetriaProcessada;
    if (inverterSn) {
      if (inverterSn === "CONSOLIDADO") {
        telemetriaFiltrada = telemetriaProcessada.filter((t) => t.tipoLinha === "CONSOLIDADO");
      } else {
        telemetriaFiltrada = telemetriaProcessada.filter(
          (t) => t.inversorSN.toLowerCase().includes(inverterSn.toLowerCase())
        );
      }
    }

    // 5. Buscar Alarmes e Logs de Erro
    const alarmesWhere: any = {
      timestamp: {
        gte: dayStartUTC,
        lte: dayEndUTC,
      },
    };
    if (usinaId) {
      alarmesWhere.usinaId = usinaId;
    } else if (plataforma !== "TODAS") {
      const usinasPlataforma = usinas.map((u) => u.id);
      alarmesWhere.usinaId = { in: usinasPlataforma };
    }

    const rawAlarmes = await prisma.alarme.findMany({
      where: alarmesWhere,
      include: {
        usina: {
          select: {
            nome: true,
            apiFornecedor: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    const alarmesFormatados = rawAlarmes.map((a) => ({
      id: a.id,
      usinaId: a.usinaId,
      usinaNome: a.usina.nome,
      apiFornecedor: a.usina.apiFornecedor,
      codigo: a.codigo,
      descricao: a.descricao,
      gravidade: a.gravidade,
      status: a.status,
      solucaoSugerida: a.solucaoSugerida || "Verificar conexões e manual do fabricante.",
      timestamp: a.timestamp.toISOString(),
      timestampFormatted: new Date(a.timestamp).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    // 6. KPIs do Período baseados no escopo selecionado (se um inversor específico for selecionado ou consolidados)
    let linhasParaKPIs = telemetriaFiltrada;
    if (!inverterSn || inverterSn === "") {
      linhasParaKPIs = telemetriaProcessada.filter((t) => t.tipoLinha === "CONSOLIDADO");
    } else if (inverterSn !== "CONSOLIDADO") {
      linhasParaKPIs = telemetriaProcessada.filter((t) => t.tipoLinha === "INDIVIDUAL" && t.inversorSN === inverterSn);
    } else {
      linhasParaKPIs = telemetriaProcessada.filter((t) => t.tipoLinha === "CONSOLIDADO");
    }

    // Energia gerada acumulada até o momento atual do dia (leitura mais recente do período selecionado)
    let energiaTotalKWh = 0;
    if (linhasParaKPIs.length > 0) {
      if (usinaId) {
        energiaTotalKWh = linhasParaKPIs[0]?.energiaAcumuladaKWh || 0;
      } else {
        const latestByUsina = new Map<string, number>();
        linhasParaKPIs.forEach((t) => {
          if (!latestByUsina.has(t.usinaId)) {
            latestByUsina.set(t.usinaId, t.energiaAcumuladaKWh || 0);
          }
        });
        energiaTotalKWh = Array.from(latestByUsina.values()).reduce((acc, val) => acc + val, 0);
      }
    }

    const maxPotencia = linhasParaKPIs.reduce((max, t) => Math.max(max, t.potenciaAtivaKW), 0);
    const maxTemp = telemetriaFiltrada.reduce((max, t) => Math.max(max, t.tempIGBT), 0);
    
    let somaTensao = 0;
    let countTensao = 0;
    telemetriaFiltrada.forEach((t) => {
      if (t.tensaoCA_A > 0) { somaTensao += t.tensaoCA_A; countTensao++; }
      if (t.tensaoCA_B > 0) { somaTensao += t.tensaoCA_B; countTensao++; }
      if (t.tensaoCA_C > 0) { somaTensao += t.tensaoCA_C; countTensao++; }
    });
    const mediaTensaoCA = countTensao > 0 ? (somaTensao / countTensao).toFixed(1) : "0.0";

    return NextResponse.json({
      success: true,
      usinas: usinasAtualizadas,
      todosInversores,
      telemetria: telemetriaFiltrada,
      alarmes: alarmesFormatados,
      summary: {
        energiaTotalKWh,
        potenciaPicoKW: maxPotencia,
        temperaturaMaxC: maxTemp,
        mediaTensaoCA,
        totalLeituras: telemetriaFiltrada.length,
        totalAlarmes: alarmesFormatados.length,
      },
      meta: {
        date: dateStr,
        startTime,
        endTime,
        plataforma,
        usinaId,
        inverterSn,
      },
    });
  } catch (error: any) {
    console.error("[EXTRATOR-API-GET] Erro ao buscar dados de telemetria:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar consulta de telemetria." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { plataforma = "TODAS" } = body;

    console.log(`[EXTRATOR-API-POST] Disparando sincronização ao vivo para plataforma: ${plataforma}`);

    const results: Record<string, string> = {};

    if (plataforma === "TODAS" || plataforma === "HUAWEI") {
      try {
        await HuaweiSyncService.syncAll();
        results.huawei = "Sincronização Huawei executada com sucesso.";
      } catch (err: any) {
        console.error("Erro no sync Huawei:", err);
        results.huawei = `Erro ao sincronizar Huawei: ${err.message}`;
      }
    }

    if (plataforma === "TODAS" || plataforma === "SOLIS") {
      try {
        await SolisSyncService.syncAll();
        results.solis = "Sincronização Solis executada com sucesso.";
      } catch (err: any) {
        console.error("Erro no sync Solis:", err);
        results.solis = `Erro ao sincronizar Solis: ${err.message}`;
      }
    }

    if (plataforma === "TODAS" || plataforma === "HOYMILES") {
      try {
        await HoymilesSyncService.syncAll();
        results.hoymiles = "Sincronização Hoymiles executada com sucesso.";
      } catch (err: any) {
        console.error("Erro no sync Hoymiles:", err);
        results.hoymiles = `Erro ao sincronizar Hoymiles: ${err.message}`;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sincronização de telemetria e alarmes finalizada.",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[EXTRATOR-API-POST] Erro ao sincronizar ao vivo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao disparar sincronização ao vivo." },
      { status: 500 }
    );
  }
}
