import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import fs from "fs";
import path from "path";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

const s = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica", fontSize: 8.5, color: "#1e293b" } as any,
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottomWidth: 3, borderBottomColor: "#f15a24" } as any,
  logo: { width: 100, height: 35, objectFit: "contain", marginRight: 10 } as any,
  brand: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1e3a8a", marginBottom: 1 } as any,
  subbrand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#f15a24", letterSpacing: 1, marginBottom: 3 } as any,
  rt: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 1 } as any,
  rs: { fontSize: 7.5, color: "#64748b" } as any,
  badge: { padding: "4 8", borderRadius: 4, fontSize: 8.5, fontFamily: "Helvetica-Bold" } as any,

  // Metric Cards (CAPEX Standard matching Web Foto 02)
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 12 } as any,
  kpiCard: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 4, padding: "6 8", borderLeftWidth: 3, borderLeftColor: "#f15a24" } as any,
  kpiTitle: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#64748b" } as any,
  kpiVal: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: "#0f172a", marginTop: 2 } as any,

  sec: { marginBottom: 12 } as any,
  stit: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#1e3a8a", marginBottom: 4, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: "#cbd5e1" } as any,
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", minHeight: 22 } as any,
  tc: { borderRightWidth: 1, borderRightColor: "#e2e8f0", padding: "4 5", flex: 1 } as any,
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#ffffff", backgroundColor: "#0f172a" } as any,
  nodata: { color: "#94a3b8", fontFamily: "Helvetica-Oblique", fontSize: 8 } as any,
  oc: { backgroundColor: "#fff7ed", borderLeftWidth: 3, borderLeftColor: "#f97316", padding: "5 7", marginBottom: 4 } as any,
  oct: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#c2410c", marginBottom: 1 } as any,
  foot: { position: "absolute", bottom: 20, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between", color: "#94a3b8", fontSize: 7, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 4 } as any,
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

async function resolveImageToBase64(srcUrl: string): Promise<string | null> {
  if (!srcUrl) return null;
  try {
    if (srcUrl.startsWith("data:image")) return srcUrl;

    if (srcUrl.startsWith("/") || srcUrl.startsWith("uploads/")) {
      const cleanPath = srcUrl.startsWith("/") ? srcUrl.slice(1) : srcUrl;
      const localFilePath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(localFilePath)) {
        const fileBuf = fs.readFileSync(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase().replace(".", "");
        const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
        return `data:${mime};base64,${fileBuf.toString("base64")}`;
      }
    }

    if (srcUrl.startsWith("http://") || srcUrl.startsWith("https://")) {
      if (srcUrl.includes("/uploads/")) {
        const uploadSegment = srcUrl.substring(srcUrl.indexOf("/uploads/"));
        const cleanPath = uploadSegment.startsWith("/") ? uploadSegment.slice(1) : uploadSegment;
        const localFilePath = path.join(process.cwd(), "public", cleanPath);
        if (fs.existsSync(localFilePath)) {
          const fileBuf = fs.readFileSync(localFilePath);
          const ext = path.extname(localFilePath).toLowerCase().replace(".", "");
          const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
          return `data:${mime};base64,${fileBuf.toString("base64")}`;
        }
      }

      const res = await fetch(srcUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return `data:${contentType};base64,${buf.toString("base64")}`;
      }
    }
  } catch (err) {
    console.error("Image resolution error:", srcUrl, err);
  }
  return null;
}

function el(type: any, props: any, ...children: any[]): any { return React.createElement(type, props, ...children); }

function buildPdf(rdo: any, atividadesExecutadasDia: any[] = [], todasAtividadesObra: any[] = [], logoBase64: string = "", resolvedPhotoMap: Record<string, string> = {}): any {
  const status = rdo.status || "RASCUNHO";
  const rdoNum = String(rdo.numeroRdo).padStart(3, "0");
  const totalMDO = (rdo.maoDeObra || []).reduce((a: number, m: any) => a + (m.quantidade || 1), 0);
  const totalH = (rdo.maoDeObra || []).reduce((a: number, m: any) => a + (m.horasTrab || 0) * (m.quantidade || 1), 0);
  const weekDay = getWeekDay(rdo.data);

  // Totais do Projeto (CAPEX - Contabilização Total da Obra)
  const totalObra = todasAtividadesObra.length || 1;
  const sumProgress = todasAtividadesObra.reduce((acc: number, a: any) => acc + (a.status === "CONCLUIDA" ? 100 : (a.lancamentos?.[0]?.progresso || 0)), 0);
  const pctMedia = Math.round(sumProgress / totalObra);

  const climaEls = rdo.climas?.length > 0
    ? (rdo.climas as any[]).map((c: any, i: number) => el(View, { key: i, style: { flexDirection: "row", marginBottom: 2 } },
        el(Text, { style: { width: 50, fontFamily: "Helvetica-Bold", color: "#475569" } }, c.periodo === "MANHA" ? "Manhã:" : c.periodo === "TARDE" ? "Tarde:" : "Noite:"),
        el(Text, {}, String(c.condicao || "").replace("_", " ") + (c.impacto ? " - " + c.impacto : ""))
      ))
    : [el(Text, { style: s.nodata }, "Não informado")];

  const tbl = (rows: any[] | null) => rows
    ? el(View, { style: { borderTopWidth: 1, borderTopColor: "#cbd5e1", borderLeftWidth: 1, borderLeftColor: "#cbd5e1" } }, ...rows)
    : el(Text, { style: s.nodata }, "Não informado");

  // Header da Tabela com Estilo Escuro #0F172A (Padrão Web Foto 02)
  const ativHdr = el(View, { key: "ath", style: [s.tr, { backgroundColor: "#0f172a" }] },
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "OBRA")),
    el(View, { style: [s.tc, s.th, { flex: 3 }] }, el(Text, { style: s.th }, "ATIVIDADE")),
    el(View, { style: [s.tc, s.th, { flex: 1.5 }] }, el(Text, { style: s.th }, "STATUS")),
    el(View, { style: [s.tc, s.th, { flex: 1 }] }, el(Text, { style: s.th }, "PROGRESSO")),
    el(View, { style: [s.tc, s.th, { flex: 4 }] }, el(Text, { style: s.th }, "RELATO / APONTAMENTO")),
  );

  // Collect all photos from all launches today
  const allTodayPhotos: { url: string; title: string }[] = [];

  const ativRows = atividadesExecutadasDia.length > 0
    ? [ativHdr, ...atividadesExecutadasDia.map((act: any, i: number) => {
        const latestLog = act.lancamentos?.[0];
        const prog = latestLog ? latestLog.progresso : (act.status === "CONCLUIDA" ? 100 : 0);
        const isFinalized = prog >= 100 || act.status === "CONCLUIDA";
        const isImpedimento = act.status === "IMPEDIMENTO";
        const isPausada = act.status === "PAUSADA" || act.status === "AGUARDANDO_MATERIAL";

        const statusLabel = isFinalized ? "FINALIZADA" : isImpedimento ? "IMPEDIMENTO" : isPausada ? "PARALISADA" : "EM ANDAMENTO";
        const statusBg = isFinalized ? "#dcfce7" : isImpedimento ? "#fee2e2" : isPausada ? "#fef3c7" : "#dbeafe";
        const statusTxt = isFinalized ? "#15803d" : isImpedimento ? "#b91c1c" : isPausada ? "#b45309" : "#1d4ed8";

        const logDesc = latestLog?.descricao || "Atividade executada no canteiro.";
        const obs = act.observacao ? " [Obs: " + act.observacao + "]" : "";

        // Photos attached to this activity log
        const photos: string[] = latestLog?.fotos || [];
        photos.forEach(p => {
          const resolvedUrl = resolvedPhotoMap[p] || p;
          allTodayPhotos.push({ url: resolvedUrl, title: act.descricao });
        });

        const photoGrid = photos.length > 0
          ? el(View, { style: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 } },
              ...photos.slice(0, 4).map((pUrl: string, pIdx: number) => {
                const imgSrc = resolvedPhotoMap[pUrl] || pUrl;
                return el(Image, { key: pIdx, src: imgSrc, style: { width: 45, height: 45, borderRadius: 3, marginRight: 4, marginTop: 4, objectFit: "cover" } });
              })
            )
          : null;

        return el(View, { key: i, style: s.tr },
          el(View, { style: [s.tc, { flex: 2 }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, act.projeto?.nome || rdo.projeto?.nome || "-")),
          el(View, { style: [s.tc, { flex: 3 }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, act.descricao)),
          el(View, { style: [s.tc, { flex: 1.5, alignItems: "center", justifyContent: "center" }] },
            el(View, { style: { backgroundColor: statusBg, padding: "2 5", borderRadius: 3 } },
              el(Text, { style: { color: statusTxt, fontSize: 6.5, fontFamily: "Helvetica-Bold" } }, statusLabel)
            )
          ),
          el(View, { style: [s.tc, { flex: 1, textAlign: "center" }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, prog + "%")),
          el(View, { style: [s.tc, { flex: 4 }] },
            el(Text, {}, logDesc + obs),
            photoGrid
          ),
        );
      })]
    : null;

  const maoHdr = el(View, { key: "mh", style: [s.tr, { backgroundColor: "#0f172a" }] },
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "COLABORADOR")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "FUNÇÃO")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "EMPRESA")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "QTD")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "HORAS")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "FALTA")),
  );
  const maoRows = rdo.maoDeObra?.length > 0
    ? [maoHdr, ...(rdo.maoDeObra as any[]).map((m: any, i: number) => el(View, { key: i, style: s.tr },
        el(View, { style: [s.tc, { flex: 2 }] }, el(Text, {}, m.funcionario?.nome || m.nomeAvulso || "-")),
        el(View, { style: s.tc }, el(Text, {}, m.funcao || m.funcionario?.funcao || "-")),
        el(View, { style: s.tc }, el(Text, {}, m.empresa === "PROPRIA" ? "Própria" : "Terceiro")),
        el(View, { style: s.tc }, el(Text, {}, String(m.quantidade))),
        el(View, { style: s.tc }, el(Text, {}, String(m.horasTrab) + "h")),
        el(View, { style: s.tc }, el(Text, {}, m.falta ? "Sim" : "Não")),
      ))]
    : null;

  const matHdr = el(View, { key: "mth", style: [s.tr, { backgroundColor: "#0f172a" }] },
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "MATERIAL")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "QTD")),
    el(View, { style: [s.tc, s.th] }, el(Text, { style: s.th }, "UNIDADE")),
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "FORNECEDOR")),
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
      
      // Header Corporativo com Logo
      el(View, { style: s.header },
        logoBase64 ? el(Image, { src: logoBase64, style: s.logo }) : null,
        el(View, { style: { flex: 1 } },
          el(Text, { style: s.brand }, "CORDEIRO ENERGIA / CORDEIRO SERVICE"),
          el(Text, { style: s.subbrand }, "RELATÓRIO DIÁRIO DE OBRA (RDO)"),
          el(Text, { style: s.rt }, "Relatório Diário de Obra — RDO-" + rdoNum),
          el(Text, { style: s.rs }, "Obra: " + (rdo.projeto?.nome || "-") + " | Data: " + dateFmt(rdo.data) + " (" + weekDay + ")"),
          el(Text, { style: s.rs }, "Responsável Técnico: " + (rdo.responsavel?.name || rdo.responsavel?.email || "-")),
        ),
        el(View, { style: [s.badge, { backgroundColor: badgeColor + "22", color: badgeColor }] }, el(Text, {}, status)),
      ),

      // KPI Cards Banner (Foto 02 Standard)
      el(View, { style: s.kpiRow },
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "APONTAMENTOS REALIZADOS"),
          el(Text, { style: s.kpiVal }, atividadesExecutadasDia.length + " lançamento(s)"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "MÃO DE OBRA NO CANTEIRO"),
          el(Text, { style: s.kpiVal }, totalMDO + " colaborador(es)"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "AVANÇO FÍSICO MÉDIO"),
          el(Text, { style: s.kpiVal }, pctMedia + "%"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "OBRA VINCULADA"),
          el(Text, { style: [s.kpiVal, { fontSize: 8.5 }] }, rdo.projeto?.nome || "-"),
        ),
      ),

      el(View, { style: s.sec, wrap: false }, el(Text, { style: s.stit }, "Condições Climáticas do Canteiro"), ...climaEls),

      el(View, { style: s.sec, wrap: false },
        el(Text, { style: s.stit }, "Atividades Executadas no Dia (" + atividadesExecutadasDia.length + ")"),
        ativRows ? tbl(ativRows) : el(Text, { style: s.nodata }, "Nenhuma atividade teve lançamento ou execução nesta data.")
      ),

      rdo.outrasAtividades ? el(View, { style: s.sec, wrap: false },
        el(Text, { style: s.stit }, "📌 Outras Atividades Executadas (Serviços Avulsos / Não Listados)"),
        el(Text, { style: { leading: 1.4 } }, String(rdo.outrasAtividades))
      ) : null,

      el(View, { style: s.sec, wrap: false }, el(Text, { style: s.stit }, "Mão de Obra no Canteiro (" + totalMDO + " pessoas / " + totalH + "h)"), tbl(maoRows)),
      el(View, { style: s.sec, wrap: false }, el(Text, { style: s.stit }, "Materiais Recebidos / Utilizados"), matRows ? tbl(matRows) : el(Text, { style: s.nodata }, "Nenhum material registrado nesta data.")),
      ocEls && ocEls.length > 0 ? el(View, { style: s.sec, wrap: false }, el(Text, { style: s.stit }, "Ocorrências e Paralisações"), ...ocEls) : null,
      rdo.observacoes ? el(View, { style: s.sec, wrap: false }, el(Text, { style: s.stit }, "Observações Gerais do Canteiro"), el(Text, {}, String(rdo.observacoes))) : null,

      // Galeria de Evidências Fotográficas do Dia
      allTodayPhotos.length > 0 ? el(View, { style: s.sec, wrap: false },
        el(Text, { style: s.stit }, "📸 Evidências Fotográficas do Canteiro (" + allTodayPhotos.length + " foto(s))"),
        el(View, { style: { flexDirection: "row", flexWrap: "wrap", gap: 6 } },
          ...allTodayPhotos.map((item, pIdx) =>
            el(View, { key: pIdx, style: { width: 120, marginBottom: 8 }, wrap: false },
              el(Image, { src: item.url, style: { width: 120, height: 90, borderRadius: 4, objectFit: "cover" } }),
              el(Text, { style: { fontSize: 6.5, color: "#64748b", marginTop: 2 } }, item.title)
            )
          )
        )
      ) : null,

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

    // 3. Carrega o logo corporativo como base64
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      if (fs.existsSync(logoPath)) {
        const fileBuf = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${fileBuf.toString("base64")}`;
      }
    } catch (err) {
      console.error("Logo load error:", err);
    }

    // 4. Resolve todas as fotos anexadas para Base64 Data URIs
    const resolvedPhotoMap: Record<string, string> = {};
    const photoUrlsToResolve: string[] = [];

    atividadesExecutadasDia.forEach(act => {
      act.lancamentos?.forEach((l: any) => {
        if (Array.isArray(l.fotos)) {
          l.fotos.forEach((pUrl: string) => {
            if (pUrl && !photoUrlsToResolve.includes(pUrl)) photoUrlsToResolve.push(pUrl);
          });
        }
      });
    });

    rdo.ocorrencias?.forEach((o: any) => {
      if (Array.isArray(o.fotos)) {
        o.fotos.forEach((pUrl: string) => {
          if (pUrl && !photoUrlsToResolve.includes(pUrl)) photoUrlsToResolve.push(pUrl);
        });
      }
    });

    await Promise.all(
      photoUrlsToResolve.map(async (url) => {
        const b64 = await resolveImageToBase64(url);
        if (b64) resolvedPhotoMap[url] = b64;
      })
    );

    const rawBuffer = await renderToBuffer(buildPdf(rdo, atividadesExecutadasDia, todasAtividadesObra, logoBase64, resolvedPhotoMap));
    const buffer = new Uint8Array(rawBuffer);
    const safeName = (rdo.projeto?.nome || "obra").replace(/\s+/g, "-");
    return new Response(buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=\"RDO-" + String(rdo.numeroRdo).padStart(3,"0") + "-" + safeName + ".pdf\"" } });
  } catch (e: any) {
    console.error("[PDF RDO ERROR]", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}


