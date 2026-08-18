import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

const s = StyleSheet.create({
  page:   { padding: 36, fontFamily: "Helvetica", fontSize: 9, color: "#1e293b" } as any,
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#f15a24" } as any,
  brand:  { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1e3a8a", marginBottom: 2 } as any,
  subbrand:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#f15a24", letterSpacing: 1.5, marginBottom: 4 } as any,
  rt:     { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 2 } as any,
  rs:     { fontSize: 8, color: "#64748b" } as any,
  badge:  { padding: "4 10", borderRadius: 4, fontSize: 9, fontFamily: "Helvetica-Bold" } as any,
  
  // KPI Metrics Box (CAPEX Standard)
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 14 } as any,
  kpiCard:{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 4, padding: "8 10", borderLeftWidth: 3, borderLeftColor: "#1e3a8a" } as any,
  kpiTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#64748b" } as any,
  kpiVal: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#0f172a", marginTop: 2 } as any,

  sec:    { marginBottom: 14 } as any,
  stit:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a8a", marginBottom: 5, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: "#cbd5e1" } as any,
  tr:     { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" } as any,
  tc:     { borderRightWidth: 1, borderRightColor: "#e2e8f0", padding: "4 6", flex: 1 } as any,
  th:     { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#475569", backgroundColor: "#f1f5f9" } as any,
  nodata: { color: "#94a3b8", fontFamily: "Helvetica-Oblique", fontSize: 8 } as any,
  oc:     { backgroundColor: "#fff7ed", borderLeftWidth: 3, borderLeftColor: "#f97316", padding: "6 8", marginBottom: 5 } as any,
  oct:    { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#c2410c", marginBottom: 2 } as any,
  foot:   { position: "absolute", bottom: 25, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", color: "#94a3b8", fontSize: 7, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 5 } as any,
});

const statusColor: Record<string, string> = { RASCUNHO: "#94a3b8", PENDENTE: "#f59e0b", APROVADO: "#22c55e", RECUSADO: "#ef4444" };

function dateFmt(d: any): string {
  if (!d) return "-";
  const iso = typeof d === "string" ? d : (d as Date).toISOString();
  const parts = iso.split("T")[0].split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function getWeekDay(d: any): string {
  if (!d) return "";
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dt = new Date(d);
  return days[dt.getUTCDay()] || "";
}

function el(type: any, props: any, ...children: any[]): any { return React.createElement(type, props, ...children); }

function buildPdf(rdo: any, atividadesExecutadasDia: any[] = [], todasAtividadesObra: any[] = []): any {
  const status = rdo.status || "RASCUNHO";
  const rdoNum = String(rdo.numeroRdo).padStart(3, "0");
  const totalMDO = (rdo.maoDeObra || []).reduce((a: number, m: any) => a + (m.quantidade || 1), 0);
  const totalH = (rdo.maoDeObra || []).reduce((a: number, m: any) => a + (m.horasTrab || 0) * (m.quantidade || 1), 0);
  const weekDay = getWeekDay(rdo.data);

  // Totais do Projeto (CAPEX)
  const totalObra = todasAtividadesObra.length || 1;
  const qtdEmAndamento = todasAtividadesObra.filter((a: any) => a.status === "EM_ANDAMENTO").length;
  const qtdConcluidas = todasAtividadesObra.filter((a: any) => a.status === "CONCLUIDA").length;
  const qtdPausadas = todasAtividadesObra.filter((a: any) => a.status === "PAUSADA" || a.status === "AGUARDANDO_MATERIAL").length;

  const pctAndamento = Math.round((qtdEmAndamento / totalObra) * 100);
  const pctConcluidas = Math.round((qtdConcluidas / totalObra) * 100);
  const pctPausadas = Math.round((qtdPausadas / totalObra) * 100);

  const climaEls = rdo.climas?.length > 0
    ? (rdo.climas as any[]).map((c: any, i: number) => el(View, { key: i, style: { flexDirection: "row", marginBottom: 2 } },
        el(Text, { style: { width: 55, fontFamily: "Helvetica-Bold", color: "#475569" } }, c.periodo === "MANHA" ? "Manha:" : c.periodo === "TARDE" ? "Tarde:" : "Noite:"),
        el(Text, {}, String(c.condicao || "").replace("_", " ") + (c.impacto ? " - " + c.impacto : ""))
      ))
    : [el(Text, { style: s.nodata }, "Nao informado")];

  const tbl = (rows: any[] | null) => rows
    ? el(View, { style: { borderTopWidth: 1, borderTopColor: "#cbd5e1", borderLeftWidth: 1, borderLeftColor: "#cbd5e1" } }, ...rows)
    : el(Text, { style: s.nodata }, "Nao informado");

  // Tabela de Atividades Estritamente Executadas no Dia
  const ativHdr = el(View, { key: "ath", style: s.tr },
    el(View, { style: [s.tc, s.th, { flex: 3 }] }, el(Text, { style: s.th }, "Atividade Executada Hoje")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Progresso")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Status")),
    el(View, { style: [s.tc, s.th, { flex: 3 }] }, el(Text, { style: s.th }, "Relato Operacional do Dia")),
  );

  const ativRows = atividadesExecutadasDia.length > 0
    ? [ativHdr, ...atividadesExecutadasDia.map((act: any, i: number) => {
        const latestLog = act.lancamentos?.[0];
        const prog = latestLog ? latestLog.progresso : (act.status === "CONCLUIDA" ? 100 : 0);
        const logDesc = latestLog?.descricao || "Executado no canteiro.";
        const obs = act.observacao ? " [Obs: " + act.observacao + "]" : "";
        const photoCount = latestLog?.fotos?.length ? " (" + latestLog.fotos.length + " foto(s) anexada(s))" : "";
        const fullRelato = logDesc + obs + photoCount;
        return el(View, { key: i, style: s.tr },
          el(View, { style: [s.tc, { flex: 3 }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, act.descricao)),
          el(View, { style: s.tc }, el(Text, {}, prog + "%")),
          el(View, { style: s.tc }, el(Text, {}, act.status === "CONCLUIDA" ? "Concluiida" : "Em andamento")),
          el(View, { style: [s.tc, { flex: 3 }] }, el(Text, {}, fullRelato)),
        );
      })]
    : null;

  const maoHdr = el(View, { key: "mh", style: s.tr },
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "Funcionario")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Funcao")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Empresa")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Qtd")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Horas")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Falta")),
  );
  const maoRows = rdo.maoDeObra?.length > 0
    ? [maoHdr, ...(rdo.maoDeObra as any[]).map((m: any, i: number) => el(View, { key: i, style: s.tr },
        el(View, { style: [s.tc, { flex: 2 }] }, el(Text, {}, m.funcionario?.nome || m.nomeAvulso || "-")),
        el(View, { style: s.tc }, el(Text, {}, m.funcao || m.funcionario?.funcao || "-")),
        el(View, { style: s.tc }, el(Text, {}, m.empresa === "PROPRIA" ? "Propria" : "Terceiro")),
        el(View, { style: s.tc }, el(Text, {}, String(m.quantidade))),
        el(View, { style: s.tc }, el(Text, {}, String(m.horasTrab) + "h")),
        el(View, { style: s.tc }, el(Text, {}, m.falta ? "Sim" : "Nao")),
      ))]
    : null;

  const matHdr = el(View, { key: "mth", style: s.tr },
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "Material")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Qtd")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "Unidade")),
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "Fornecedor")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "NF")),
  );
  const matRows = rdo.materiais?.length > 0
    ? [matHdr, ...(rdo.materiais as any[]).map((m: any, i: number) => el(View, { key: i, style: s.tr },
        el(View, { style: [s.tc, { flex: 2 }] }, el(Text, {}, String(m.material))),
        el(View, { style: s.tc }, el(Text, {}, String(m.quantidade))),
        el(View, { style: s.tc }, el(Text, {}, String(m.unidade))),
        el(View, { style: [s.tc, { flex: 2 }] }, el(Text, {}, m.fornecedor || "-")),
        el(View, { style: s.tc }, el(Text, {}, m.notaFiscal || "-")),
      ))]
    : null;

  const ocEls = rdo.ocorrencias?.length > 0
    ? (rdo.ocorrencias as any[]).map((o: any, i: number) => el(View, { key: i, style: s.oc },
        el(Text, { style: s.oct }, String(o.tipo || "").replace("_", " ")),
        el(Text, {}, String(o.descricao || "")),
        o.impacto ? el(Text, { style: { marginTop: 1, color: "#78350f" } }, "Impacto: " + o.impacto) : null,
        o.medidaTomada ? el(Text, { style: { marginTop: 1, color: "#166534" } }, "Medida: " + o.medidaTomada) : null,
      ))
    : null;

  const badgeColor = statusColor[status] || "#94a3b8";

  return el(Document, { title: "RDO-" + rdoNum + " - " + (rdo.projeto?.nome || ""), author: "Cordeiro Energia" },
    el(Page, { size: "A4", style: s.page },
      el(View, { style: s.header },
        el(View, { style: { flex: 1 } },
          el(Text, { style: s.brand }, "CORDEIRO ENERGIA / CORDEIRO SERVICE"),
          el(Text, { style: s.subbrand }, "DIÁRIO DE OBRAS (RDO)"),
          el(Text, { style: s.rt }, "Relatório Diário de Obra — RDO-" + rdoNum),
          el(Text, { style: s.rs }, "Obra: " + (rdo.projeto?.nome || "-") + " | Data: " + dateFmt(rdo.data) + " (" + weekDay + ")"),
          el(Text, { style: s.rs }, "Responsável Técnico: " + (rdo.responsavel?.name || rdo.responsavel?.email || "-")),
        ),
        el(View, { style: [s.badge, { backgroundColor: badgeColor + "22", color: badgeColor }] }, el(Text, {}, status)),
      ),

      el(View, { style: s.kpiRow },
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "Executadas Hoje"),
          el(Text, { style: s.kpiVal }, atividadesExecutadasDia.length + " atividades"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "% Em Andamento"),
          el(Text, { style: s.kpiVal }, pctAndamento + "% (" + qtdEmAndamento + "/" + totalObra + ")"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "% Concluídas"),
          el(Text, { style: s.kpiVal }, pctConcluidas + "% (" + qtdConcluidas + "/" + totalObra + ")"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "% Paralisadas / Mat."),
          el(Text, { style: s.kpiVal }, pctPausadas + "% (" + qtdPausadas + "/" + totalObra + ")"),
        ),
      ),

      el(View, { style: s.sec }, el(Text, { style: s.stit }, "Condições Climáticas"), ...climaEls),

      el(View, { style: s.sec },
        el(Text, { style: s.stit }, "Atividades Executadas no Dia (" + atividadesExecutadasDia.length + ")"),
        ativRows ? tbl(ativRows) : el(Text, { style: s.nodata }, "Nenhuma atividade teve lançamento ou execução nesta data.")
      ),

      el(View, { style: s.sec }, el(Text, { style: s.stit }, "Mão de Obra (" + totalMDO + " pessoas / " + totalH + "h)"), tbl(maoRows)),
      el(View, { style: s.sec }, el(Text, { style: s.stit }, "Materiais Recebidos"), matRows ? tbl(matRows) : el(Text, { style: s.nodata }, "Nenhum material registrado nesta data.")),
      ocEls && ocEls.length > 0 ? el(View, { style: s.sec }, el(Text, { style: s.stit }, "Ocorrências / Incidentes"), ...ocEls) : null,
      rdo.observacoes ? el(View, { style: s.sec }, el(Text, { style: s.stit }, "Observações Gerais"), el(Text, {}, String(rdo.observacoes))) : null,

      el(View, { style: s.foot, fixed: true },
        el(Text, {}, "Cordeiro Energia / Cordeiro Service - Diário de Obras"),
        el(Text, {}, "RDO-" + rdoNum + " | Gerado em " + dateFmt(new Date())),
        el(Text, { render: ({ pageNumber, totalPages }: any) => "Página " + pageNumber + " de " + totalPages }),
      ),
    )
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const rdo = await prisma.rdoDiario.findUnique({
      where: { id },
      include: { projeto: true, responsavel: { select: { id: true, name: true, email: true } }, climas: true, maoDeObra: { include: { funcionario: true } }, materiais: true, ocorrencias: true },
    });
    if (!rdo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rdoDate = new Date(rdo.data);
    const dateStart = new Date(rdoDate);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(rdoDate);
    dateEnd.setUTCHours(23, 59, 59, 999);

    // 1. Busca estrita apenas das atividades executadas no dia
    const atividadesExecutadasDia = await prisma.atividadeDiario.findMany({
      where: {
        projetoId: rdo.projetoId,
        lancamentos: { some: { data: { gte: dateStart, lte: dateEnd } } }
      },
      include: {
        lancamentos: {
          where: { data: { gte: dateStart, lte: dateEnd } },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    // 2. Busca de todas as atividades da obra para métricas CAPEX
    const todasAtividadesObra = await prisma.atividadeDiario.findMany({
      where: { projetoId: rdo.projetoId }
    });

    const rawBuffer = await renderToBuffer(buildPdf(rdo, atividadesExecutadasDia, todasAtividadesObra));
    const buffer = new Uint8Array(rawBuffer);
    const safeName = (rdo.projeto?.nome || "obra").replace(/\s+/g, "-");
    return new Response(buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=\"RDO-" + String(rdo.numeroRdo).padStart(3,"0") + "-" + safeName + ".pdf\"" } });
  } catch (e: any) {
    console.error("[PDF RDO ERROR]", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

