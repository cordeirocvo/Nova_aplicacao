import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import fs from "fs";
import path from "path";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

// ─── Cores Cordeiro ──────────────────────────────────────────────────────────
const ORANGE = "#f15a24";
const NAVY   = "#0f172a";
const SLATE  = "#334155";
const LIGHT  = "#f8fafc";
const BORDER = "#e2e8f0";

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 36,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: SLATE,
    backgroundColor: "#ffffff",
  } as any,

  // ── Topo colorido ──────────────────────────────────────────────────────────
  topBar: {
    backgroundColor: NAVY,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  } as any,
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  } as any,
  logo: {
    width: 100,
    height: 30,
    objectFit: "contain",
  } as any,
  logoSep: {
    width: 1,
    height: 28,
    backgroundColor: "#475569",
    marginHorizontal: 14,
  } as any,
  topTexts: {
    flexDirection: "column",
  } as any,
  topLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  } as any,
  topTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  } as any,
  topRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  } as any,
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  } as any,
  statusText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as any,
  topMeta: {
    fontSize: 6.5,
    color: "#94a3b8",
    textAlign: "right",
  } as any,

  // ── Faixa laranja fina ────────────────────────────────────────────────────
  accentBar: {
    height: 4,
    backgroundColor: ORANGE,
    marginBottom: 0,
  } as any,

  // ── KPI Cards ─────────────────────────────────────────────────────────────
  kpiStrip: {
    flexDirection: "row",
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 16,
  } as any,
  kpiCard: {
    flex: 1,
    flexDirection: "column",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    marginRight: 12,
  } as any,
  kpiCardLast: {
    flex: 1,
    flexDirection: "column",
  } as any,
  kpiLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  } as any,
  kpiValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  } as any,
  kpiValueAccent: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: ORANGE,
  } as any,

  // ── Content ────────────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: 28,
  } as any,

  section: {
    marginBottom: 14,
  } as any,

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: ORANGE,
  } as any,
  sectionAccent: {
    width: 3,
    height: 12,
    backgroundColor: ORANGE,
    borderRadius: 2,
    marginRight: 6,
  } as any,
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  } as any,

  // ── Campos ─────────────────────────────────────────────────────────────────
  fieldRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  } as any,
  fieldLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    width: 110,
    paddingTop: 0.5,
  } as any,
  fieldValue: {
    fontSize: 7.5,
    color: NAVY,
    flex: 1,
    fontFamily: "Helvetica",
  } as any,
  fieldValueBold: {
    fontSize: 7.5,
    color: NAVY,
    flex: 1,
    fontFamily: "Helvetica-Bold",
  } as any,

  // ── Caixa de texto ─────────────────────────────────────────────────────────
  textBox: {
    backgroundColor: LIGHT,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
    padding: 9,
    fontSize: 8,
    color: SLATE,
    lineHeight: 1.5,
  } as any,

  // ── Equipamento ────────────────────────────────────────────────────────────
  eqpBox: {
    backgroundColor: "#fffbf7",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 8,
    marginBottom: 6,
  } as any,
  eqpRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  } as any,
  eqpBadge: {
    backgroundColor: "#ffedd5",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 8,
  } as any,
  eqpBadgeText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#c2410c",
    textTransform: "uppercase",
  } as any,
  eqpName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    flex: 1,
  } as any,
  horimetroRow: {
    flexDirection: "row",
    backgroundColor: "#fff7ed",
    borderRadius: 3,
    padding: 5,
    marginTop: 4,
  } as any,
  hItem: {
    flex: 1,
    alignItems: "center",
  } as any,
  hSep: {
    width: 1,
    backgroundColor: "#fed7aa",
    marginHorizontal: 8,
  } as any,
  hLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 2,
  } as any,
  hValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#c2410c",
  } as any,
  hTotal: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
  } as any,

  // ── Comentário Supervisor ──────────────────────────────────────────────────
  commentBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    padding: 8,
    fontSize: 8,
    color: "#92400e",
    lineHeight: 1.4,
  } as any,

  // ── Foto Grid (2 colunas grandes) ─────────────────────────────────────────
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  } as any,
  photoItem: {
    width: 258,
    height: 175,
    borderRadius: 5,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: BORDER,
  } as any,

  // ── Fotos Horímetro ────────────────────────────────────────────────────────
  hPhotoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  } as any,
  hPhotoBlock: {
    flexDirection: "column",
  } as any,
  hPhotoLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    marginBottom: 3,
    textTransform: "uppercase",
  } as any,
  hPhoto: {
    width: 118,
    height: 82,
    borderRadius: 4,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: BORDER,
  } as any,

  // ── Contexto do Canteiro ───────────────────────────────────────────────────
  contextRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 3,
  } as any,
  contextChip: {
    backgroundColor: LIGHT,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 3,
  } as any,
  contextChipText: {
    fontSize: 7,
    color: SLATE,
  } as any,

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
  } as any,
  footerLeft: {
    fontSize: 6.5,
    color: "#94a3b8",
  } as any,
  footerRight: {
    fontSize: 6.5,
    color: "#94a3b8",
  } as any,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dateFmt(d: any): string {
  if (!d) return "-";
  const iso = typeof d === "string" ? d : (d as Date).toISOString();
  const [y, m, day] = iso.split("T")[0].split("-");
  return `${day}/${m}/${y}`;
}

function getWeekDay(d: any): string {
  const days = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  if (!d) return "";
  return days[new Date(d).getUTCDay()] || "";
}

async function resolveImageToBase64(srcUrl: string): Promise<string | null> {
  if (!srcUrl) return null;
  try {
    if (srcUrl.startsWith("data:image")) return srcUrl;
    if (srcUrl.startsWith("/") || srcUrl.startsWith("uploads/")) {
      const clean = srcUrl.startsWith("/") ? srcUrl.slice(1) : srcUrl;
      const local = path.join(process.cwd(), "public", clean);
      if (fs.existsSync(local)) {
        const buf = fs.readFileSync(local);
        const ext = path.extname(local).toLowerCase().replace(".", "");
        const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
        return `data:${mime};base64,${buf.toString("base64")}`;
      }
    }
    if (srcUrl.startsWith("http://") || srcUrl.startsWith("https://")) {
      if (srcUrl.includes("/uploads/")) {
        const seg = srcUrl.substring(srcUrl.indexOf("/uploads/")).slice(1);
        const local = path.join(process.cwd(), "public", seg);
        if (fs.existsSync(local)) {
          const buf = fs.readFileSync(local);
          const ext = path.extname(local).toLowerCase().replace(".", "");
          const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
          return `data:${mime};base64,${buf.toString("base64")}`;
        }
      }
      const r = await fetch(srcUrl);
      if (r.ok) {
        const ab = await r.arrayBuffer();
        const ct = r.headers.get("content-type") || "image/jpeg";
        return `data:${ct};base64,${Buffer.from(ab).toString("base64")}`;
      }
    }
  } catch (e) { console.error("resolveImg err:", srcUrl, e); }
  return null;
}

function el(type: any, props: any, ...children: any[]): any {
  return React.createElement(type, props, ...children);
}
function isValid(src: any): boolean {
  return typeof src === "string" && src.length > 10 &&
    (src.startsWith("data:image/") || src.startsWith("http://") || src.startsWith("https://"));
}

// ─── Builder PDF ─────────────────────────────────────────────────────────────
function buildPdf(
  log: any,
  logoB64: string,
  photos: Record<string, string>,
  rdoDiario: any
): any {
  const ativ  = log.atividade || {};
  const proj  = ativ.projeto   || {};
  const user  = log.usuario    || {};
  const ativo = log.ativo      || {};

  const dateStr  = dateFmt(log.data);
  const weekDay  = getWeekDay(log.data);
  const progPct  = Math.round(log.progresso || 0);
  const concluida = progPct >= 100 || ativ.status === "CONCLUIDA";
  const statusLabel = concluida ? "CONCLUÍDA" : "EM ANDAMENTO";
  const statusBg    = concluida ? "#dcfce7" : "#dbeafe";
  const statusTxt   = concluida ? "#15803d" : "#1d4ed8";

  const revisao    = log.statusRevisao || "PENDENTE";
  const revisaoBg  = revisao === "APROVADO" ? "#dcfce7" : revisao === "COM_QUESTIONAMENTOS" ? "#fee2e2" : "#fef3c7";
  const revisaoTxt = revisao === "APROVADO" ? "#15803d" : revisao === "COM_QUESTIONAMENTOS" ? "#b91c1c" : "#b45309";
  const revisaoLabel = revisao === "APROVADO" ? "Aprovado" : revisao === "COM_QUESTIONAMENTOS" ? "Com Ajustes" : "Pendente";

  // Valid photos
  const validPhotos = (log.fotos || [])
    .map((u: string) => photos[u])
    .filter((u: any) => isValid(u));

  const hInicioSrc = photos[log.fotoHorimetroInicioUrl];
  const hFimSrc    = photos[log.fotoHorimetroFimUrl];

  const hI = log.horimetroInicio ?? null;
  const hF = log.horimetroFim ?? null;
  const hTrab = (hI !== null && hF !== null && hF >= hI) ? (hF - hI).toFixed(1) : null;

  const apontador = user.name || user.email || ativ.responsavel?.name || "Operador";

  return el(Document, {},
    el(Page, { size: "A4", style: s.page },

      // ── TOPO ESCURO ──────────────────────────────────────────────────────
      el(View, { style: s.topBar },
        // Esquerda: logo + divisor + textos
        el(View, { style: s.topLeft },
          logoB64 ? el(Image, { src: logoB64, style: s.logo }) : null,
          el(View, { style: s.logoSep }),
          el(View, { style: s.topTexts },
            el(Text, { style: s.topLabel }, "Gestão de Obras • Cordeiro Energia"),
            el(Text, { style: s.topTitle }, "Relatório de Apontamento")
          )
        ),
        // Direita: status + data
        el(View, { style: s.topRight },
          el(View, { style: [s.statusPill, { backgroundColor: revisaoBg }] },
            el(Text, { style: [s.statusText, { color: revisaoTxt }] }, revisaoLabel)
          ),
          el(Text, { style: s.topMeta }, dateStr + " • " + weekDay)
        )
      ),

      // ── FAIXA LARANJA ─────────────────────────────────────────────────────
      el(View, { style: s.accentBar }),

      // ── KPI STRIP ─────────────────────────────────────────────────────────
      el(View, { style: s.kpiStrip },
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiLabel }, "Obra / Subestação"),
          el(Text, { style: s.kpiValue }, proj.nome || "—")
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiLabel }, "Executor / Apontador"),
          el(Text, { style: s.kpiValue }, apontador)
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiLabel }, "Progresso Atual"),
          el(Text, { style: concluida ? s.kpiValue : s.kpiValueAccent }, `${progPct}%  ${statusLabel}`)
        ),
        el(View, { style: s.kpiCardLast },
          el(Text, { style: s.kpiLabel }, "Data do Apontamento"),
          el(Text, { style: s.kpiValue }, dateStr)
        )
      ),

      // ── CONTEÚDO ─────────────────────────────────────────────────────────
      el(View, { style: s.content },

        // ── 1. Detalhamento da Atividade ───────────────────────────────────
        el(View, { style: s.section },
          el(View, { style: s.sectionHeader },
            el(View, { style: s.sectionAccent }),
            el(Text, { style: s.sectionTitle }, "Detalhamento da Atividade Executada")
          ),
          el(View, { style: s.fieldRow },
            el(Text, { style: s.fieldLabel }, "Atividade:"),
            el(Text, { style: s.fieldValueBold }, ativ.descricao || "—")
          ),
          ativ.observacao ? el(View, { style: s.fieldRow },
            el(Text, { style: s.fieldLabel }, "Instrução / Obs:"),
            el(Text, { style: s.fieldValue }, ativ.observacao)
          ) : null,
          el(View, { style: s.fieldRow },
            el(Text, { style: s.fieldLabel }, "Progresso Acumulado:"),
            el(Text, { style: [s.fieldValueBold, { color: concluida ? "#15803d" : ORANGE }] }, `${progPct}% — ${statusLabel}`)
          ),
          el(Text, { style: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 } }, "Relato do Dia:"),
          el(View, { style: s.textBox },
            el(Text, {}, log.descricao || "Sem relato informado para esta atividade.")
          )
        ),

        // ── 2. Comentário do Supervisor ────────────────────────────────────
        log.comentariosSupervisor ? el(View, { style: s.section },
          el(View, { style: s.sectionHeader },
            el(View, { style: s.sectionAccent }),
            el(Text, { style: s.sectionTitle }, "Comentário da Supervisão")
          ),
          el(View, { style: s.commentBox },
            el(Text, {}, log.comentariosSupervisor)
          )
        ) : null,

        // ── 3. Equipamento / Horímetro ─────────────────────────────────────
        (ativo.nome || log.ativoId || hI !== null) ? el(View, { style: s.section },
          el(View, { style: s.sectionHeader },
            el(View, { style: s.sectionAccent }),
            el(Text, { style: s.sectionTitle }, "Equipamento / Horímetro")
          ),
          el(View, { style: s.eqpBox },
            el(View, { style: s.eqpRow },
              el(View, { style: s.eqpBadge },
                el(Text, { style: s.eqpBadgeText }, "Maquinário")
              ),
              el(Text, { style: s.eqpName }, `${ativo.nome || "Equipamento de Canteiro"}${ativo.codigo ? `  [${ativo.codigo}]` : ""}`)
            ),
            (hI !== null || hF !== null) ? el(View, { style: s.horimetroRow },
              el(View, { style: s.hItem },
                el(Text, { style: s.hLabel }, "Horímetro Inicial"),
                el(Text, { style: s.hValue }, `${hI ?? "—"} h`)
              ),
              el(View, { style: s.hSep }),
              el(View, { style: s.hItem },
                el(Text, { style: s.hLabel }, "Horímetro Final"),
                el(Text, { style: s.hValue }, `${hF ?? "—"} h`)
              ),
              hTrab ? [
                el(View, { key: "sep2", style: s.hSep }),
                el(View, { key: "total", style: s.hItem },
                  el(Text, { style: s.hLabel }, "Total Trabalhado"),
                  el(Text, { style: s.hTotal }, `${hTrab} h`)
                )
              ] : null
            ) : null
          ),
          // Fotos Horímetro
          (isValid(hInicioSrc) || isValid(hFimSrc)) ? el(View, { style: s.hPhotoRow },
            isValid(hInicioSrc) ? el(View, { style: s.hPhotoBlock },
              el(Text, { style: s.hPhotoLabel }, "Foto Horímetro Inicial"),
              el(Image, { src: hInicioSrc, style: s.hPhoto })
            ) : null,
            isValid(hFimSrc) ? el(View, { style: s.hPhotoBlock },
              el(Text, { style: s.hPhotoLabel }, "Foto Horímetro Final"),
              el(Image, { src: hFimSrc, style: s.hPhoto })
            ) : null
          ) : null
        ) : null,

        // ── 4. Evidências Fotográficas ─────────────────────────────────────
        validPhotos.length > 0 ? el(View, { style: s.section },
          el(View, { style: s.sectionHeader },
            el(View, { style: s.sectionAccent }),
            el(Text, { style: s.sectionTitle }, `Evidências Fotográficas  (${validPhotos.length} foto${validPhotos.length > 1 ? "s" : ""})`)
          ),
          el(View, { style: s.photoGrid },
            ...validPhotos.map((src: string, i: number) =>
              el(Image, { key: i, src, style: s.photoItem })
            )
          )
        ) : null,

        // ── 5. Contexto do Canteiro ────────────────────────────────────────
        rdoDiario ? el(View, { style: s.section },
          el(View, { style: s.sectionHeader },
            el(View, { style: s.sectionAccent }),
            el(Text, { style: s.sectionTitle }, "Contexto do Canteiro na Data")
          ),
          rdoDiario.climas && rdoDiario.climas.length > 0 ? el(View, { style: s.fieldRow },
            el(Text, { style: s.fieldLabel }, "Condições Climáticas:"),
            el(Text, { style: s.fieldValue }, rdoDiario.climas.map((c: any) =>
              `${c.periodo === "MANHA" ? "Manhã" : c.periodo === "TARDE" ? "Tarde" : "Noite"}: ${c.condicao}`
            ).join("  |  "))
          ) : null,
          rdoDiario.maoDeObra && rdoDiario.maoDeObra.length > 0 ? el(View, { style: s.fieldRow },
            el(Text, { style: s.fieldLabel }, "Mão de Obra Presente:"),
            el(Text, { style: s.fieldValue }, `${rdoDiario.maoDeObra.reduce((acc: number, m: any) => acc + (m.quantidade || 1), 0)} colaborador(es)`)
          ) : null
        ) : null

      ), // fim content

      // ── RODAPÉ ─────────────────────────────────────────────────────────────
      el(View, { style: s.footer, fixed: true },
        el(Text, { style: s.footerLeft }, `Cordeiro Energia  •  Apontador: ${apontador}  •  ${proj.nome || ""}`),
        el(Text, {
          style: s.footerRight,
          render: ({ pageNumber, totalPages }: any) => `Pág. ${pageNumber} / ${totalPages}`
        })
      )
    )
  );
}

// ─── GET handler ─────────────────────────────────────────────────────────────
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const log = await prisma.rdoLancamento.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        atividade: { include: { projeto: true, responsavel: true } },
        ativo: true,
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Apontamento não encontrado." }, { status: 404 });
    }

    // Busca RdoDiario da mesma data/projeto
    let rdoDiario = null;
    if (log.atividade?.projetoId && log.data) {
      const d0 = new Date(log.data); d0.setUTCHours(0, 0, 0, 0);
      const d1 = new Date(log.data); d1.setUTCHours(23, 59, 59, 999);
      rdoDiario = await prisma.rdoDiario.findFirst({
        where: { projetoId: log.atividade.projetoId, data: { gte: d0, lte: d1 } },
        include: { climas: true, maoDeObra: true }
      });
    }

    // Logo
    let logoB64 = "";
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      logoB64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
    }

    // Resolve fotos
    const resolvedPhotos: Record<string, string> = {};
    const urls: string[] = [...(log.fotos || [])];
    if (log.fotoHorimetroInicioUrl) urls.push(log.fotoHorimetroInicioUrl);
    if (log.fotoHorimetroFimUrl)    urls.push(log.fotoHorimetroFimUrl);
    for (const u of urls) {
      if (u && !resolvedPhotos[u]) {
        const b64 = await resolveImageToBase64(u);
        if (b64) resolvedPhotos[u] = b64;
      }
    }

    // Gera PDF
    const doc = buildPdf(log, logoB64, resolvedPhotos, rdoDiario);
    const raw = await renderToBuffer(doc);
    const buf = new Uint8Array(raw);

    const safeDesc = (log.atividade?.descricao || "Atividade").replace(/[^a-zA-Z0-9\-_]/g, "_").slice(0, 30);
    const safeDate = dateFmt(log.data).replace(/\//g, "-");
    const fileName = `Apontamento_${safeDate}_${safeDesc}.pdf`;

    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store, max-age=0",
      }
    });
  } catch (err: any) {
    console.error("[PDF ATIVIDADE ERROR]", err);
    return NextResponse.json(
      { error: "Falha ao gerar PDF: " + (err.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
