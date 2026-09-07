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
  page: {
    paddingTop: 24,
    paddingBottom: 34,
    paddingHorizontal: 26,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#334155",
    backgroundColor: "#ffffff",
  } as any,

  // Discrete & Modern Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#f15a24",
  } as any,
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  } as any,
  logo: {
    width: 140,
    height: 42,
    objectFit: "contain",
  } as any,
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  } as any,
  brandTag: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#f15a24",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 1,
  } as any,
  rdoTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  } as any,
  metaText: {
    fontSize: 7.5,
    color: "#64748b",
  } as any,
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  } as any,

  // KPI Metrics Banner
  kpiRow: {
    flexDirection: "row",
    marginBottom: 10,
  } as any,
  kpiCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 3,
    borderLeftColor: "#f15a24",
  } as any,
  kpiCardLast: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 3,
    borderLeftColor: "#0f172a",
  } as any,
  kpiTitle: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  } as any,
  kpiVal: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 2,
  } as any,

  // Modern Section Styles
  sec: {
    marginBottom: 10,
  } as any,
  stitContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#f15a24",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 5,
  } as any,
  stit: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  } as any,

  // Weather Grid Cards
  weatherGrid: {
    flexDirection: "row",
    marginBottom: 4,
  } as any,
  weatherCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 5,
    marginRight: 6,
  } as any,
  weatherCardLast: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 5,
  } as any,
  weatherPeriod: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#f15a24",
    textTransform: "uppercase",
    marginBottom: 2,
  } as any,
  weatherText: {
    fontSize: 7.5,
    color: "#334155",
    fontFamily: "Helvetica-Bold",
  } as any,
  weatherSubText: {
    fontSize: 6.5,
    color: "#64748b",
    marginTop: 1,
  } as any,

  // Modern Clean Table Formatting
  table: {
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  } as any,
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 20,
    alignItems: "center",
  } as any,
  trLast: {
    flexDirection: "row",
    minHeight: 20,
    alignItems: "center",
  } as any,
  trEven: {
    backgroundColor: "#ffffff",
  } as any,
  trOdd: {
    backgroundColor: "#f8fafc",
  } as any,
  trHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    minHeight: 20,
    alignItems: "center",
  } as any,
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#ffffff",
    paddingVertical: 3,
    paddingHorizontal: 5,
  } as any,
  tc: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    fontSize: 7.5,
    color: "#334155",
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  } as any,
  tcLast: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    fontSize: 7.5,
    color: "#334155",
  } as any,

  // Occurrences & Text Callouts
  oc: {
    backgroundColor: "#fff7ed",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#f97316",
    borderWidth: 1,
    borderColor: "#ffedd5",
    padding: 6,
    marginBottom: 4,
  } as any,
  oct: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#c2410c",
    marginBottom: 2,
  } as any,
  ocBody: {
    fontSize: 7.5,
    color: "#431407",
  } as any,

  textCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 6,
    fontSize: 7.5,
    color: "#334155",
    lineHeight: 1.3,
  } as any,

  nodata: {
    color: "#94a3b8",
    fontFamily: "Helvetica-Oblique",
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  } as any,

  // Discrete & Sleek Footer
  foot: {
    position: "absolute",
    bottom: 12,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 6.5,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
  } as any,
});

const statusColor: Record<string, string> = { RASCUNHO: "#64748b", PENDENTE: "#d97706", APROVADO: "#16a34a", RECUSADO: "#dc2626" };
const statusBg: Record<string, string> = { RASCUNHO: "#f1f5f9", PENDENTE: "#fef3c7", APROVADO: "#dcfce7", RECUSADO: "#fee2e2" };

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

function isValidImgSrc(src: any): boolean {
  return typeof src === "string" && src.length > 10 && (src.startsWith("data:image/") || src.startsWith("http://") || src.startsWith("https://"));
}

function SectionTitle(title: string): any {
  return el(View, { style: s.stitContainer },
    el(Text, { style: s.stit }, title)
  );
}

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

  // Formatting Clima as clean 3-period horizontal cards
  const climasArr = (rdo.climas as any[]) || [];
  const climaManha = climasArr.find((c: any) => c.periodo === "MANHA");
  const climaTarde = climasArr.find((c: any) => c.periodo === "TARDE");
  const climaNoite = climasArr.find((c: any) => c.periodo === "NOITE");

  const renderClimaCard = (label: string, data: any, isLast: boolean = false) => {
    const cardStyle = isLast ? s.weatherCardLast : s.weatherCard;
    if (!data) {
      return el(View, { style: cardStyle },
        el(Text, { style: s.weatherPeriod }, label),
        el(Text, { style: s.nodata }, "Não informado")
      );
    }
    const condStr = String(data.condicao || "").replace("_", " ");
    return el(View, { style: cardStyle },
      el(Text, { style: s.weatherPeriod }, label),
      el(Text, { style: s.weatherText }, condStr),
      data.impacto ? el(Text, { style: s.weatherSubText }, "Impacto: " + data.impacto) : null
    );
  };

  const climaBlock = climasArr.length > 0
    ? el(View, { style: s.weatherGrid },
        renderClimaCard("Manhã", climaManha),
        renderClimaCard("Tarde", climaTarde),
        renderClimaCard("Noite", climaNoite, true)
      )
    : el(Text, { style: s.nodata }, "Nenhuma condição climática registrada nesta data.");

  // Table Header Atividades (Dark Navy `#0f172a`)
  const ativHdr = el(View, { key: "ath", style: s.trHeader },
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "OBRA / SUBESTAÇÃO")),
    el(View, { style: [s.tc, s.th, { flex: 3 }] }, el(Text, { style: s.th }, "ATIVIDADE DA ETAPA")),
    el(View, { style: [s.tc, s.th, { flex: 1.4, textAlign: "center" }] }, el(Text, { style: s.th }, "STATUS")),
    el(View, { style: [s.tc, s.th, { flex: 0.9, textAlign: "center" }] }, el(Text, { style: s.th }, "PROG.")),
    el(View, { style: [s.tcLast, s.th, { flex: 4 }] }, el(Text, { style: s.th }, "RELATO / APONTAMENTO DA EXECUÇÃO")),
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
        const statusBgColor = isFinalized ? "#dcfce7" : isImpedimento ? "#fee2e2" : isPausada ? "#fef3c7" : "#dbeafe";
        const statusTxtColor = isFinalized ? "#15803d" : isImpedimento ? "#b91c1c" : isPausada ? "#b45309" : "#1d4ed8";

        const logDesc = latestLog?.descricao || "Atividade executada no canteiro.";
        const obs = act.observacao ? " [Obs: " + act.observacao + "]" : "";

        // Photos attached to this activity log (only render valid image sources)
        const photos: string[] = latestLog?.fotos || [];
        const validPhotosForAct: string[] = [];
        photos.forEach(p => {
          const resolvedUrl = resolvedPhotoMap[p];
          if (isValidImgSrc(resolvedUrl)) {
            validPhotosForAct.push(resolvedUrl!);
            allTodayPhotos.push({ url: resolvedUrl!, title: act.descricao });
          }
        });

        const photoGrid = validPhotosForAct.length > 0
          ? el(View, { style: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 } },
              ...validPhotosForAct.slice(0, 4).map((imgSrc: string, pIdx: number) => {
                return el(Image, { key: pIdx, src: imgSrc, style: { width: 42, height: 42, borderRadius: 3, marginRight: 4, marginTop: 4, objectFit: "cover" } });
              })
            )
          : null;

        const rowStyle = [i === atividadesExecutadasDia.length - 1 ? s.trLast : s.tr, i % 2 === 0 ? s.trEven : s.trOdd];

        return el(View, { key: i, style: rowStyle },
          el(View, { style: [s.tc, { flex: 2 }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, act.projeto?.nome || rdo.projeto?.nome || "-")),
          el(View, { style: [s.tc, { flex: 3 }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, act.descricao)),
          el(View, { style: [s.tc, { flex: 1.4, alignItems: "center", justifyContent: "center" }] },
            el(View, { style: { backgroundColor: statusBgColor, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 3 } },
              el(Text, { style: { color: statusTxtColor, fontSize: 6, fontFamily: "Helvetica-Bold" } }, statusLabel)
            )
          ),
          el(View, { style: [s.tc, { flex: 0.9, textAlign: "center" }] }, el(Text, { style: { fontFamily: "Helvetica-Bold", color: "#0f172a" } }, prog + "%")),
          el(View, { style: [s.tcLast, { flex: 4 }] },
            el(Text, {}, logDesc + obs),
            photoGrid
          ),
        );
      })]
    : null;

  const maoHdr = el(View, { key: "mh", style: s.trHeader },
    el(View, { style: [s.tc, s.th, { flex: 2.5 }] }, el(Text, { style: s.th }, "COLABORADOR")),
    el(View, { style: [s.tc, s.th, { flex: 2 }] }, el(Text, { style: s.th }, "FUNÇÃO")),
    el(View, { style: [s.tc, s.th, { flex: 1.5 }] }, el(Text, { style: s.th }, "VÍNCULO")),
    el(View, { style: [s.tc, s.th, { flex: 0.8, textAlign: "center" }] }, el(Text, { style: s.th }, "QTD")),
    el(View, { style: [s.tc, s.th, { flex: 1, textAlign: "center" }] }, el(Text, { style: s.th }, "HORAS")),
    el(View, { style: [s.tcLast, s.th, { flex: 0.8, textAlign: "center" }] }, el(Text, { style: s.th }, "FALTA")),
  );
  const maoRows = rdo.maoDeObra?.length > 0
    ? [maoHdr, ...(rdo.maoDeObra as any[]).map((m: any, i: number) => {
        const rowStyle = [i === rdo.maoDeObra.length - 1 ? s.trLast : s.tr, i % 2 === 0 ? s.trEven : s.trOdd];
        return el(View, { key: i, style: rowStyle },
          el(View, { style: [s.tc, { flex: 2.5 }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, m.funcionario?.nome || m.nomeAvulso || "-")),
          el(View, { style: [s.tc, { flex: 2 }] }, el(Text, {}, m.funcao || m.funcionario?.funcao || "-")),
          el(View, { style: [s.tc, { flex: 1.5 }] }, el(Text, {}, m.empresa === "PROPRIA" ? "Própria" : "Terceiro")),
          el(View, { style: [s.tc, { flex: 0.8, textAlign: "center" }] }, el(Text, {}, String(m.quantidade))),
          el(View, { style: [s.tc, { flex: 1, textAlign: "center" }] }, el(Text, {}, String(m.horasTrab) + "h")),
          el(View, { style: [s.tcLast, { flex: 0.8, textAlign: "center" }] }, el(Text, { style: { color: m.falta ? "#dc2626" : "#16a34a", fontFamily: "Helvetica-Bold" } }, m.falta ? "Sim" : "Não")),
        );
      })]
    : null;

  const matHdr = el(View, { key: "mth", style: s.trHeader },
    el(View, { style: [s.tc, s.th, { flex: 3 }] }, el(Text, { style: s.th }, "MATERIAL / INSUMO")),
    el(View, { style: [s.tc, s.th, { flex: 0.9, textAlign: "center" }] }, el(Text, { style: s.th }, "QTD")),
    el(View, { style: [s.tc, s.th, { flex: 1, textAlign: "center" }] }, el(Text, { style: s.th }, "UNIDADE")),
    el(View, { style: [s.tc, s.th, { flex: 2.5 }] }, el(Text, { style: s.th }, "FORNECEDOR")),
    el(View, { style: [s.tcLast, s.th, { flex: 1.5 }] }, el(Text, { style: s.th }, "NOTA FISCAL")),
  );
  const matRows = rdo.materiais?.length > 0
    ? [matHdr, ...(rdo.materiais as any[]).map((m: any, i: number) => {
        const rowStyle = [i === rdo.materiais.length - 1 ? s.trLast : s.tr, i % 2 === 0 ? s.trEven : s.trOdd];
        return el(View, { key: i, style: rowStyle },
          el(View, { style: [s.tc, { flex: 3 }] }, el(Text, { style: { fontFamily: "Helvetica-Bold" } }, String(m.material))),
          el(View, { style: [s.tc, { flex: 0.9, textAlign: "center" }] }, el(Text, {}, String(m.quantidade))),
          el(View, { style: [s.tc, { flex: 1, textAlign: "center" }] }, el(Text, {}, String(m.unidade))),
          el(View, { style: [s.tc, { flex: 2.5 }] }, el(Text, {}, m.fornecedor || "-")),
          el(View, { style: [s.tcLast, { flex: 1.5 }] }, el(Text, {}, m.notaFiscal || "-")),
        );
      })]
    : null;

  const ocEls = rdo.ocorrencias?.length > 0
    ? (rdo.ocorrencias as any[]).map((o: any, i: number) => {
        const isNenhuma = o.tipo === "NENHUMA" || String(o.descricao || "").toLowerCase().includes("nenhuma ocorrência");
        if (isNenhuma) {
          return el(View, { key: i, style: { backgroundColor: "#f0fdf4", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#16a34a", borderWidth: 1, borderColor: "#bbf7d0", padding: 6, marginBottom: 4 } },
            el(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#15803d", marginBottom: 2 } }, "✅ Nenhuma Ocorrência Registrada"),
            el(Text, { style: { fontSize: 7.5, color: "#166534", leading: 1.3 } }, o.descricao || "Nenhuma ocorrência foi registrada no canteiro de obras nesta data que tenha impactado o andamento dos serviços ou exigido intervenção."),
          );
        }
        return el(View, { key: i, style: s.oc },
          el(Text, { style: s.oct }, "⚠️ " + String(o.tipo || "").replace("_", " ")),
          el(Text, { style: s.ocBody }, String(o.descricao || "")),
          o.impacto ? el(Text, { style: { marginTop: 2, fontSize: 7, color: "#9a3412" } }, "Impacto: " + o.impacto) : null,
          o.medidaTomada ? el(Text, { style: { marginTop: 2, fontSize: 7, color: "#166534", fontFamily: "Helvetica-Bold" } }, "Medida Adotada: " + o.medidaTomada) : null,
        );
      })
    : null;

  const badgeColor = statusColor[status] || "#64748b";
  const badgeBg = statusBg[status] || "#f1f5f9";

  return el(Document, { title: "RDO-" + rdoNum + " - " + (rdo.projeto?.nome || ""), author: "Cordeiro Energia" },
    el(Page, { size: "A4", style: s.page },
      
      // Discrete & Prominent Branding Header
      el(View, { style: s.header },
        el(View, { style: s.logoContainer },
          isValidImgSrc(logoBase64) ? el(Image, { src: logoBase64, style: s.logo }) : null,
        ),
        el(View, { style: s.headerInfo },
          el(Text, { style: s.brandTag }, "CORDEIRO ENERGIA / CORDEIRO SERVICE"),
          el(Text, { style: s.rdoTitle }, "Relatório Diário de Obra — RDO-" + rdoNum),
          el(Text, { style: s.metaText }, "Obra: " + (rdo.projeto?.nome || "-") + " • Data: " + dateFmt(rdo.data) + " (" + weekDay + ")"),
          el(Text, { style: s.metaText }, "Responsável Técnico: " + (rdo.responsavel?.name || rdo.responsavel?.email || "-")),
        ),
        el(View, { style: [s.badge, { backgroundColor: badgeBg, color: badgeColor }] }, el(Text, {}, status)),
      ),

      // KPI Metrics Cards Banner
      el(View, { style: s.kpiRow },
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "APONTAMENTOS DO DIA"),
          el(Text, { style: s.kpiVal }, atividadesExecutadasDia.length + " lançamento(s)"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "MÃO DE OBRA ATIVA"),
          el(Text, { style: s.kpiVal }, totalMDO + " pessoa(s) / " + totalH + "h"),
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "AVANÇO FÍSICO MÉDIO"),
          el(Text, { style: s.kpiVal }, pctMedia + "%"),
        ),
        el(View, { style: s.kpiCardLast },
          el(Text, { style: s.kpiTitle }, "OBRA VINCULADA"),
          el(Text, { style: [s.kpiVal, { fontSize: 8 }] }, rdo.projeto?.nome || "-"),
        ),
      ),

      // Condições Climáticas
      el(View, { style: s.sec, wrap: false },
        SectionTitle("Condições Climáticas no Canteiro"),
        climaBlock
      ),

      // Atividades Executadas no Dia
      el(View, { style: s.sec, wrap: false },
        SectionTitle("Atividades Executadas no Dia (" + atividadesExecutadasDia.length + ")"),
        ativRows
          ? el(View, { style: s.table }, ...ativRows)
          : el(Text, { style: s.nodata }, "Nenhuma atividade teve lançamento ou execução nesta data.")
      ),

      // Outras Atividades Executadas (Serviços Avulsos)
      rdo.outrasAtividades ? el(View, { style: s.sec, wrap: false },
        SectionTitle("📌 Outras Atividades Executadas (Serviços Avulsos / Não Listados)"),
        el(View, { style: s.textCard }, el(Text, {}, String(rdo.outrasAtividades)))
      ) : null,

      // Mão de Obra no Canteiro
      el(View, { style: s.sec, wrap: false },
        SectionTitle("Mão de Obra no Canteiro (" + totalMDO + " pessoas / " + totalH + "h trabalhadas)"),
        maoRows
          ? el(View, { style: s.table }, ...maoRows)
          : el(Text, { style: s.nodata }, "Nenhum colaborador registrado nesta data.")
      ),

      // Materiais Recebidos / Utilizados
      el(View, { style: s.sec, wrap: false },
        SectionTitle("Materiais Recebidos / Utilizados no Canteiro"),
        matRows
          ? el(View, { style: s.table }, ...matRows)
          : el(Text, { style: s.nodata }, "Nenhum material entregue ou utilizado na obra nesta data.")
      ),

      // Ocorrências e Paralisações
      el(View, { style: s.sec, wrap: false },
        SectionTitle("Ocorrências e Paralisações Registradas"),
        ocEls && ocEls.length > 0
          ? el(View, {}, ...ocEls)
          : el(View, { style: { backgroundColor: "#f0fdf4", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#16a34a", borderWidth: 1, borderColor: "#bbf7d0", padding: 6 } },
              el(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#15803d", marginBottom: 2 } }, "✅ Nenhuma Ocorrência Registrada"),
              el(Text, { style: { fontSize: 7.5, color: "#166534" } }, "Nenhuma ocorrência foi registrada no canteiro de obras nesta data que tenha impactado o andamento dos serviços ou exigido intervenção.")
            )
      ),

      // Observações Gerais
      rdo.observacoes ? el(View, { style: s.sec, wrap: false },
        SectionTitle("Observações Gerais do Canteiro"),
        el(View, { style: s.textCard }, el(Text, {}, String(rdo.observacoes)))
      ) : null,

      // Galeria de Evidências Fotográficas (safely render only valid Data URIs/URLs)
      allTodayPhotos.length > 0 ? el(View, { style: s.sec, wrap: false },
        SectionTitle("📸 Evidências Fotográficas do Canteiro (" + allTodayPhotos.length + " foto(s))"),
        el(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
          ...allTodayPhotos.map((item, pIdx) =>
            el(View, { key: pIdx, style: { width: 125, marginRight: 8, marginBottom: 8 }, wrap: false },
              el(Image, { src: item.url, style: { width: 125, height: 92, borderRadius: 4, objectFit: "cover", borderWidth: 1, borderColor: "#e2e8f0" } }),
              el(Text, { style: { fontSize: 6.5, color: "#64748b", marginTop: 3 } }, item.title)
            )
          )
        )
      ) : null,

      // Discrete Footer
      el(View, { style: s.foot, fixed: true },
        el(Text, {}, "Cordeiro Energia / Cordeiro Service — Diário de Obras (SGO)"),
        el(Text, {}, "RDO-" + rdoNum + " • Emissão: " + dateFmt(new Date())),
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

    const pdfDoc = buildPdf(rdo, atividadesExecutadasDia, todasAtividadesObra, logoBase64, resolvedPhotoMap);
    const rawBuffer = await renderToBuffer(pdfDoc);
    const buffer = new Uint8Array(rawBuffer);
    const safeName = (rdo.projeto?.nome || "obra").replace(/\s+/g, "-");
    return new Response(buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=\"RDO-" + String(rdo.numeroRdo).padStart(3,"0") + "-" + safeName + ".pdf\"" } });
  } catch (e: any) {
    console.error("[PDF RDO ERROR]", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}



