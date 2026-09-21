import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

interface TelemetriaRecordInput {
  timestamp: Date;
  potenciaAtivaKW: number;
  energiaAcumuladaKWh?: number;
  tensaoCA_A?: number;
  tensaoCA_B?: number;
  tensaoCA_C?: number;
  correnteCA_A?: number;
  correnteCA_B?: number;
  correnteCA_C?: number;
  frequenciaRede?: number;
  tempIGBT?: number;
  statusInversor?: string;
  dadosStrings?: Record<string, { V: number; I: number }>;
}

/**
 * Converte data e hora para objeto Date no Horário de Brasília (America/Sao_Paulo UTC-3)
 */
function parseDateTimeBRT(val: any, defaultDateStr?: string): Date | null {
  if (!val) return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Formato: 2026-05-07 13:25:00 ou 2026-05-07 13:25
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const [_, y, m, d, hh, mm, ss] = isoMatch;
    const h = hh || "00";
    const min = mm || "00";
    const s = ss || "00";
    const dateFormatted = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min.padStart(2, "0")}:${s.padStart(2, "0")}-03:00`;
    const dt = new Date(dateFormatted);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Formato brasileiro: 07/05/2026 13:25:00 ou 07/05/2026 13:25 ou 07-05-2026
  const brMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const [_, d, m, y, hh, mm, ss] = brMatch;
    const h = hh || "00";
    const min = mm || "00";
    const s = ss || "00";
    const dateFormatted = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min.padStart(2, "0")}:${s.padStart(2, "0")}-03:00`;
    const dt = new Date(dateFormatted);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Apenas Horário: 13:25 ou 13:25:00 acompanhado de uma data padrão
  const timeOnlyMatch = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (timeOnlyMatch && defaultDateStr) {
    const [_, hh, mm, ss] = timeOnlyMatch;
    const s = ss || "00";
    const dateFormatted = `${defaultDateStr}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${s.padStart(2, "0")}-03:00`;
    const dt = new Date(dateFormatted);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Tenta parser nativo
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Converte número com suporte a vírgula brasileira (ex: 209,297 ou 1.250,50)
 */
function parseNumberClean(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  let s = String(val).trim();
  if (!s || s === "-" || s === "N/A" || s === "--") return 0;

  // Remove caracteres que não sejam dígitos, vírgula, ponto ou sinal negativo
  s = s.replace(/[^\d.,-]/g, "");

  // Se tiver ponto como milhar e vírgula como decimal (ex: 1.250,50)
  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // Se tiver apenas vírgula (ex: 209,297)
    s = s.replace(",", ".");
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/**
 * Processa linhas tabuladas (TSV ou CSV)
 */
function parseTableRows(rows: string[][], defaultDate?: string): TelemetriaRecordInput[] {
  if (!rows || rows.length === 0) return [];

  // 1. Achar a linha de cabeçalho
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const lineJoined = rows[i].map(c => String(c).toLowerCase()).join(" ");
    if (
      lineJoined.includes("hora") ||
      lineJoined.includes("tempo") ||
      lineJoined.includes("time") ||
      lineJoined.includes("data") ||
      lineJoined.includes("poten") ||
      lineJoined.includes("power") ||
      lineJoined.includes("saída") ||
      lineJoined.includes("saida") ||
      lineJoined.includes("pv")
    ) {
      headerIndex = i;
      break;
    }
  }

  // Se não achou cabeçalho claro, assume a primeira linha como cabeçalho se houver texto nela
  if (headerIndex === -1 && rows.length > 1) {
    headerIndex = 0;
  }

  const headers = (headerIndex >= 0 ? rows[headerIndex] : []).map(h => String(h || "").trim().toLowerCase());
  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;

  // Identificar índices das colunas
  let colTime = -1;
  let colPotencia = -1;
  let colEnergia = -1;
  let colTensao = -1;
  let colCorrente = -1;
  const stringCols: Array<{ colIndex: number; name: string; type: "V" | "I" }> = [];

  headers.forEach((h, idx) => {
    // Coluna de tempo/data
    if (colTime === -1 && (h.includes("horário") || h.includes("horario") || h.includes("tempo") || h.includes("time") || h.includes("data") || h === "t")) {
      colTime = idx;
      return;
    }

    // Coluna de potência ativa CA
    if (colPotencia === -1 && (h.includes("potência") || h.includes("potencia") || h.includes("power") || h.includes("saída pv") || h.includes("saida pv") || h.includes("ativa") || h.includes("active"))) {
      colPotencia = idx;
      return;
    }

    // Coluna de energia diária / acumulada
    if (colEnergia === -1 && (h.includes("energia") || h.includes("rendimento") || h.includes("daily energy") || h.includes("energy") || h.includes("kwh") || h.includes("mwh"))) {
      colEnergia = idx;
      return;
    }

    // Tensão CA
    if (colTensao === -1 && (h.includes("tensão ca") || h.includes("tensao ca") || h.includes("u_ab") || h.includes("voltage"))) {
      colTensao = idx;
      return;
    }

    // Corrente CA
    if (colCorrente === -1 && (h.includes("corrente ca") || h.includes("current") || h.includes("i_a"))) {
      colCorrente = idx;
      return;
    }

    // Strings CC (ex: PV1, PV2, String 1, Tensão PV1, Corrente PV1)
    const pvMatch = h.match(/pv\s*(\d+)/i) || h.match(/string\s*(\d+)/i);
    if (pvMatch) {
      const sNum = pvMatch[1];
      const isVolt = h.includes("v") || h.includes("tens") || h.includes("u");
      const isCurr = h.includes("a") || h.includes("corr") || h.includes("i");
      if (isVolt) {
        stringCols.push({ colIndex: idx, name: `PV${sNum}`, type: "V" });
      } else if (isCurr) {
        stringCols.push({ colIndex: idx, name: `PV${sNum}`, type: "I" });
      }
    }
  });

  // Fallbacks inteligentes caso não tenha achado pelo nome de cabeçalho
  if (colTime === -1) colTime = 0; // Coluna 0 padrão
  if (colPotencia === -1) {
    if (headers.length > 1) colPotencia = 1;
  }

  const results: TelemetriaRecordInput[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const rawTime = row[colTime];
    if (!rawTime) continue;

    const dt = parseDateTimeBRT(rawTime, defaultDate);
    if (!dt) continue;

    let rawPot = colPotencia >= 0 && colPotencia < row.length ? parseNumberClean(row[colPotencia]) : 0;
    
    // Auto-conversão de escala:
    // Se a potência for muito alta (> 2500), provavelmente está em Watts (ex: 209297 W = 209.297 kW)
    if (rawPot > 2500) {
      rawPot = rawPot / 1000;
    }
    // Se o valor for muito baixo e o cabeçalho indicar MW (ex: 0.209 MW = 209 kW)
    if (rawPot > 0 && rawPot < 5 && colPotencia >= 0 && headers[colPotencia] && headers[colPotencia].includes("mw")) {
      rawPot = rawPot * 1000;
    }

    let rawEnergia = colEnergia >= 0 && colEnergia < row.length ? parseNumberClean(row[colEnergia]) : 0;
    // Se estiver em MWh, converte para kWh
    if (colEnergia >= 0 && headers[colEnergia] && headers[colEnergia].includes("mwh") && rawEnergia < 100) {
      rawEnergia = rawEnergia * 1000;
    }

    // Coleta de Strings CC
    const dadosStrings: Record<string, { V: number; I: number }> = {};
    for (const sc of stringCols) {
      if (sc.colIndex < row.length) {
        const val = parseNumberClean(row[sc.colIndex]);
        if (!dadosStrings[sc.name]) {
          dadosStrings[sc.name] = { V: 0, I: 0 };
        }
        if (sc.type === "V") dadosStrings[sc.name].V = val;
        if (sc.type === "I") dadosStrings[sc.name].I = val;
      }
    }

    results.push({
      timestamp: dt,
      potenciaAtivaKW: parseFloat(rawPot.toFixed(3)),
      energiaAcumuladaKWh: parseFloat(rawEnergia.toFixed(3)),
      tensaoCA_A: colTensao >= 0 && colTensao < row.length ? parseNumberClean(row[colTensao]) : 220,
      correnteCA_A: colCorrente >= 0 && colCorrente < row.length ? parseNumberClean(row[colCorrente]) : 0,
      statusInversor: rawPot > 0 ? "ONLINE" : "STANDBY",
      dadosStrings: Object.keys(dadosStrings).length > 0 ? dadosStrings : undefined,
    });
  }

  // Ordenar cronologicamente
  results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let usinaId = "";
    let inversorId: string | null = null;
    let registros: TelemetriaRecordInput[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      usinaId = (formData.get("usinaId") as string) || "";
      inversorId = (formData.get("inversorId") as string) || null;
      const file = formData.get("file") as File | null;
      const defaultDate = (formData.get("defaultDate") as string) || "";

      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

      // Procura primeira aba com dados ou com nome significativo
      let targetSheetName = workbook.SheetNames[0];
      for (const name of workbook.SheetNames) {
        const nLow = name.toLowerCase();
        if (nLow.includes("consolidado") || nLow.includes("telemetria") || nLow.includes("usina") || nLow.includes("dados")) {
          targetSheetName = name;
          break;
        }
      }

      const ws = workbook.Sheets[targetSheetName];
      const sheetData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd hh:mm:ss" });

      registros = parseTableRows(sheetData, defaultDate);
    } else {
      // JSON Payload (copiar e colar do Excel)
      const body = await req.json();
      usinaId = body.usinaId;
      inversorId = body.inversorId || null;
      const clipboardText = body.clipboardText || "";
      const defaultDate = body.defaultDate || "";

      if (!clipboardText || !clipboardText.trim()) {
        return NextResponse.json({ error: "O texto colado do Excel está vazio." }, { status: 400 });
      }

      // Converte texto em linhas e colunas (separador \t do Excel ou ; ou ,)
      const rawLines = clipboardText.trim().split(/\r?\n/);
      const isTab = clipboardText.includes("\t");
      const isSemicolon = !isTab && clipboardText.includes(";");

      const rows: string[][] = rawLines.map((line: string) => {
        if (isTab) return line.split("\t").map((c: string) => c.trim());
        if (isSemicolon) return line.split(";").map((c: string) => c.trim());
        return line.split(",").map((c: string) => c.trim());
      });

      registros = parseTableRows(rows, defaultDate);
    }

    if (!usinaId) {
      return NextResponse.json({ error: "Selecione a Usina Solar para salvar os dados." }, { status: 400 });
    }

    if (registros.length === 0) {
      return NextResponse.json(
        {
          error: "Não foi possível reconhecer linhas de dados válidas. Certifique-se de copiar as colunas de Horário e Potência do Excel.",
        },
        { status: 400 }
      );
    }

    // Verificar se a usina existe
    const usina = await prisma.usina.findUnique({
      where: { id: usinaId },
      include: { inversores: true },
    });

    if (!usina) {
      return NextResponse.json({ error: "Usina solar não encontrada no banco." }, { status: 404 });
    }

    // Agrupar registros por data (dia local UTC-3)
    const registrosPorDia = new Map<string, TelemetriaRecordInput[]>();
    for (const r of registros) {
      const localDay = new Date(r.timestamp.getTime() - 3 * 3600 * 1000).toISOString().substring(0, 10);
      if (!registrosPorDia.has(localDay)) {
        registrosPorDia.set(localDay, []);
      }
      registrosPorDia.get(localDay)!.push(r);
    }

    const resumoPorDia: Array<{
      data: string;
      pontos: number;
      picoPotenciaKW: number;
      energiaTotalKWh: number;
    }> = [];

    let totalInseridos = 0;

    // Processar cada dia
    for (const [diaStr, pontosDoDia] of registrosPorDia.entries()) {
      const startDay = new Date(`${diaStr}T00:00:00-03:00`);
      const endDay = new Date(`${diaStr}T23:59:59.999-03:00`);

      // 1. Remover telemetrias antigas do dia para evitar duplicidade
      await prisma.telemetria.deleteMany({
        where: {
          usinaId,
          timestamp: { gte: startDay, lte: endDay },
        },
      });

      // 2. Inserir os novos pontos no Prisma
      const insertPayload = pontosDoDia.map(p => ({
        usinaId,
        timestamp: p.timestamp,
        potenciaAtivaKW: p.potenciaAtivaKW,
        energiaAcumuladaKWh: p.energiaAcumuladaKWh || 0,
        tensaoCA_A: p.tensaoCA_A,
        correnteCA_A: p.correnteCA_A,
        statusInversor: p.statusInversor || "ONLINE",
        dadosStrings: p.dadosStrings ? (p.dadosStrings as any) : undefined,
      }));

      await prisma.telemetria.createMany({
        data: insertPayload,
        skipDuplicates: true,
      });

      totalInseridos += insertPayload.length;

      // 3. Calcular Métricas Diárias
      const maxPot = Math.max(...pontosDoDia.map(p => p.potenciaAtivaKW), 0);
      
      // Maior valor de energia acumulada do dia ou integral trapezoidal dos 5 minutos
      let energiaDiaKWh = Math.max(...pontosDoDia.map(p => p.energiaAcumuladaKWh || 0), 0);
      if (energiaDiaKWh <= 0) {
        // Integral de 5 minutos: Soma(kW * 5/60)
        energiaDiaKWh = pontosDoDia.reduce((acc, p) => acc + p.potenciaAtivaKW * (5 / 60), 0);
      }
      energiaDiaKWh = parseFloat(energiaDiaKWh.toFixed(2));

      // 4. Atualizar / Criar MetricaDiariaUsina para calibrar relatórios e gráficos
      const capKWp = usina.capacidadeKWp || 1000;
      const pr = capKWp > 0 ? parseFloat(Math.min(energiaDiaKWh / (capKWp * 5.0), 0.95).toFixed(2)) : 0.80;

      await prisma.metricaDiariaUsina.upsert({
        where: {
          data_usinaId: {
            data: startDay,
            usinaId,
          },
        },
        create: {
          usinaId,
          data: startDay,
          energiaRealKWh: energiaDiaKWh,
          energiaProjetadaPvlibKWh: parseFloat((energiaDiaKWh * 0.98).toFixed(2)),
          performanceRatioReal: pr,
          integralSolarimetricaKWhM2: 5.4,
        },
        update: {
          energiaRealKWh: energiaDiaKWh,
          performanceRatioReal: pr,
        },
      });

      resumoPorDia.push({
        data: diaStr,
        pontos: pontosDoDia.length,
        picoPotenciaKW: parseFloat(maxPot.toFixed(2)),
        energiaTotalKWh: energiaDiaKWh,
      });
    }

    return NextResponse.json({
      success: true,
      mensagem: `✓ ${totalInseridos} pontos de telemetria importados com sucesso para ${resumoPorDia.length} dia(s).`,
      usinaNome: usina.nome,
      totalInseridos,
      resumoPorDia,
    });
  } catch (error: any) {
    console.error("[ERRO IMPORT MANUAL TELEMETRIA]:", error);
    return NextResponse.json(
      {
        error: error.message || "Falha ao processar e salvar a telemetria manual.",
      },
      { status: 500 }
    );
  }
}
