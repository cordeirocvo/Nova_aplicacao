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
    fontSize: 8.5,
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

  // Content Cards
  textCard: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 8,
    fontSize: 8,
    color: "#1e293b",
    lineHeight: 1.4,
  } as any,

  infoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 6,
    marginBottom: 6,
  } as any,

  row: {
    flexDirection: "row",
    marginBottom: 4,
  } as any,
  fieldLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#475569",
    width: 130,
  } as any,
  fieldValue: {
    fontSize: 7.5,
    color: "#0f172a",
    flex: 1,
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

function buildLancamentoPdf(
  log: any,
  logoBase64: string = "",
  resolvedPhotoMap: Record<string, string> = {},
  rdoDiario: any = null
): any {
  const ativ = log.atividade || {};
  const proj = ativ.projeto || {};
  const user = log.usuario || {};
  const ativo = log.ativo || {};

  const dateStr = dateFmt(log.data);
  const weekDay = getWeekDay(log.data);
  const progPct = Math.round(log.progresso || 0);

  const isConcluida = progPct >= 100 || ativ.status === "CONCLUIDA";
  const statusLabel = isConcluida ? "CONCLUÍDA" : "EM ANDAMENTO";
  const statusBg = isConcluida ? "#dcfce7" : "#dbeafe";
  const statusTxt = isConcluida ? "#15803d" : "#1d4ed8";

  const statusRevisao = log.statusRevisao || "PENDENTE";
  const revisaoBg = statusRevisao === "APROVADO" ? "#dcfce7" : statusRevisao === "COM_QUESTIONAMENTOS" ? "#fee2e2" : "#fef3c7";
  const revisaoTxt = statusRevisao === "APROVADO" ? "#15803d" : statusRevisao === "COM_QUESTIONAMENTOS" ? "#b91c1c" : "#b45309";

  // Collect valid photos
  const validPhotos: string[] = [];
  (log.fotos || []).forEach((urlStr: string) => {
    const resolved = resolvedPhotoMap[urlStr];
    if (isValidImgSrc(resolved)) {
      validPhotos.push(resolved!);
    }
  });

  // Collect horimetro photos
  const resolvedHInicio = resolvedPhotoMap[log.fotoHorimetroInicioUrl];
  const resolvedHFim = resolvedPhotoMap[log.fotoHorimetroFimUrl];

  // Calculate hours worked on equipment
  const hInicio = log.horimetroInicio ?? null;
  const hFim = log.horimetroFim ?? null;
  const horasEqp = (hInicio !== null && hFim !== null && hFim >= hInicio) ? (hFim - hInicio).toFixed(1) : null;

  return el(Document, {},
    el(Page, { size: "A4", style: s.page },
      // Discrete Header
      el(View, { style: s.header },
        el(View, { style: s.logoContainer },
          logoBase64 ? el(Image, { src: logoBase64, style: s.logo }) : null,
          el(View, { style: s.headerInfo },
            el(Text, { style: s.brandTag }, "CORDEIRO ENERGIA • GESTÃO DE OBRAS"),
            el(Text, { style: s.rdoTitle }, "RELATÓRIO DE APONTAMENTO DE ATIVIDADE"),
            el(Text, { style: s.metaText }, `Data: ${dateStr} (${weekDay}) • Obra: ${proj.nome || "Obra Geral"}`)
          )
        ),
        el(View, { style: [s.badge, { backgroundColor: revisaoBg }] },
          el(Text, { style: { color: revisaoTxt } }, `STATUS: ${statusRevisao.replace("_", " ")}`)
        )
      ),

      // KPI Cards Banner
      el(View, { style: s.kpiRow },
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "OBRA / SUBESTAÇÃO"),
          el(Text, { style: s.kpiVal }, proj.nome || "Não informada")
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "EXECUTOR / APONTADOR"),
          el(Text, { style: s.kpiVal }, user.name || user.email || ativ.responsavel?.name || "Operador")
        ),
        el(View, { style: s.kpiCard },
          el(Text, { style: s.kpiTitle }, "PROGRESSO ATUAL"),
          el(Text, { style: [s.kpiVal, { color: statusTxt }] }, `${progPct}% (${statusLabel})`)
        ),
        el(View, { style: s.kpiCardLast },
          el(Text, { style: s.kpiTitle }, "DATA DO APONTAMENTO"),
          el(Text, { style: s.kpiVal }, dateStr)
        )
      ),

      // Detalhamento da Atividade
      el(View, { style: s.sec },
        SectionTitle("DETALHAMENTO DA ATIVIDADE EXECUTADA"),
        el(View, { style: s.infoBox },
          el(View, { style: s.row },
            el(Text, { style: s.fieldLabel }, "Atividade de Referência:"),
            el(Text, { style: [s.fieldValue, { fontFamily: "Helvetica-Bold" }] }, ativ.descricao || "Atividade de Canteiro")
          ),
          ativ.observacao ? el(View, { style: s.row },
            el(Text, { style: s.fieldLabel }, "Instrução / Observação:"),
            el(Text, { style: s.fieldValue }, ativ.observacao)
          ) : null
        ),
        el(Text, { style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase", marginBottom: 3 } }, "RELATO DETALHADO DO DIA:"),
        el(View, { style: s.textCard },
          el(Text, {}, log.descricao || "Sem relato descritivo informado para esta atividade.")
        )
      ),

      // Comentários do Supervisor (se houver)
      log.comentariosSupervisor ? el(View, { style: s.sec },
        SectionTitle("COMENTÁRIOS DA SUPERVISÃO / AUDITORIA"),
        el(View, { style: [s.textCard, { backgroundColor: "#fffbebf5", borderColor: "#fcd34d" }] },
          el(Text, { style: { color: "#92400e", fontFamily: "Helvetica-Bold" } }, log.comentariosSupervisor)
        )
      ) : null,

      // Equipamento e Horímetro (se houver)
      (ativo.nome || log.ativoId || hInicio !== null) ? el(View, { style: s.sec },
        SectionTitle("UTILIZAÇÃO DE EQUIPAMENTO / ATIVO NO DIA"),
        el(View, { style: s.infoBox },
          el(View, { style: s.row },
            el(Text, { style: s.fieldLabel }, "Equipamento / Maquinário:"),
            el(Text, { style: [s.fieldValue, { fontFamily: "Helvetica-Bold" }] }, `${ativo.nome || "Equipamento de Canteiro"} ${ativo.codigo ? `[${ativo.codigo}]` : ""}`)
          ),
          (hInicio !== null || hFim !== null) ? el(View, { style: s.row },
            el(Text, { style: s.fieldLabel }, "Horímetro Inicial / Final:"),
            el(Text, { style: s.fieldValue }, `${hInicio ?? "-"} h  ➡️  ${hFim ?? "-"} h ${horasEqp ? `(${horasEqp} h trabalhadas)` : ""}`)
          ) : null
        ),
        // Photos of Horimeter
        (isValidImgSrc(resolvedHInicio) || isValidImgSrc(resolvedHFim)) ? el(View, { style: { flexDirection: "row", marginTop: 4 } },
          isValidImgSrc(resolvedHInicio) ? el(View, { style: { marginRight: 10 } },
            el(Text, { style: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#64748b", marginBottom: 2 } }, "HORÍMETRO INICIAL:"),
            el(Image, { src: resolvedHInicio, style: { width: 120, height: 85, borderRadius: 4, objectFit: "cover", borderWidth: 1, borderColor: "#cbd5e1" } })
          ) : null,
          isValidImgSrc(resolvedHFim) ? el(View, {},
            el(Text, { style: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#64748b", marginBottom: 2 } }, "HORÍMETRO FINAL:"),
            el(Image, { src: resolvedHFim, style: { width: 120, height: 85, borderRadius: 4, objectFit: "cover", borderWidth: 1, borderColor: "#cbd5e1" } })
          ) : null
        ) : null
      ) : null,

      // Evidências Fotográficas do Apontamento (Large 2-column Grid)
      validPhotos.length > 0 ? el(View, { style: s.sec },
        SectionTitle(`EVIDÊNCIAS FOTOGRÁFICAS DA ATIVIDADE (${validPhotos.length} foto(s))`),
        el(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
          ...validPhotos.map((imgSrc: string, pIdx: number) => {
            const isRightCol = pIdx % 2 === 1;
            return el(View, { key: pIdx, style: { width: 264, height: 180, marginBottom: 8, marginRight: isRightCol ? 0 : 8 } },
              el(Image, { src: imgSrc, style: { width: "100%", height: "100%", borderRadius: 5, objectFit: "cover", borderWidth: 1, borderColor: "#cbd5e1" } })
            );
          })
        )
      ) : null,

      // Contexto do Canteiro (Clima / Equipe se disponível do RDO Geral do dia)
      rdoDiario ? el(View, { style: s.sec },
        SectionTitle("CONTEXTO GERAL DO CANTEIRO NA DATA"),
        el(View, { style: s.infoBox },
          rdoDiario.climas && rdoDiario.climas.length > 0 ? el(View, { style: s.row },
            el(Text, { style: s.fieldLabel }, "Condições Climáticas:"),
            el(Text, { style: s.fieldValue }, rdoDiario.climas.map((c: any) => `${c.periodo}: ${c.condicao}`).join(" | "))
          ) : null,
          rdoDiario.maoDeObra && rdoDiario.maoDeObra.length > 0 ? el(View, { style: s.row },
            el(Text, { style: s.fieldLabel }, "Mão de Obra Presente:"),
            el(Text, { style: s.fieldValue }, `${rdoDiario.maoDeObra.reduce((acc: number, m: any) => acc + (m.quantidade || 1), 0)} colaborador(es) no canteiro`)
          ) : null
        )
      ) : null,

      // Sleek Footer
      el(View, { style: s.foot, fixed: true },
        el(Text, {}, `Cordeiro Energia • Relatório de Apontamento de Atividade • Apontador: ${user.name || user.email || "Operador"}`),
        el(Text, { render: ({ pageNumber, totalPages }: any) => `Página ${pageNumber} de ${totalPages}` })
      )
    )
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const log = await prisma.rdoLancamento.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        atividade: {
          include: {
            projeto: true,
            responsavel: true,
          }
        },
        ativo: true
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Apontamento de atividade não encontrado." }, { status: 404 });
    }

    // Try to find matching RdoDiario for the same project and date
    let rdoDiario = null;
    if (log.atividade?.projetoId && log.data) {
      const dateStart = new Date(log.data);
      dateStart.setUTCHours(0, 0, 0, 0);
      const dateEnd = new Date(log.data);
      dateEnd.setUTCHours(23, 59, 59, 999);

      rdoDiario = await prisma.rdoDiario.findFirst({
        where: {
          projetoId: log.atividade.projetoId,
          data: {
            gte: dateStart,
            lte: dateEnd,
          }
        },
        include: {
          climas: true,
          maoDeObra: true,
        }
      });
    }

    // Load Cordeiro Logo
    let logoBase64 = "";
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBuf = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuf.toString("base64")}`;
    }

    // Resolve all photos
    const resolvedPhotoMap: Record<string, string> = {};
    const photoUrlsToResolve: string[] = [...(log.fotos || [])];
    if (log.fotoHorimetroInicioUrl) photoUrlsToResolve.push(log.fotoHorimetroInicioUrl);
    if (log.fotoHorimetroFimUrl) photoUrlsToResolve.push(log.fotoHorimetroFimUrl);

    for (const urlStr of photoUrlsToResolve) {
      if (urlStr && !resolvedPhotoMap[urlStr]) {
        const b64 = await resolveImageToBase64(urlStr);
        if (b64) resolvedPhotoMap[urlStr] = b64;
      }
    }

    // Build PDF
    const pdfDoc = buildLancamentoPdf(log, logoBase64, resolvedPhotoMap, rdoDiario);
    const pdfBuffer = await renderToBuffer(pdfDoc);

    const safeDesc = (log.atividade?.descricao || "Atividade").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 30);
    const safeDate = dateFmt(log.data).replace(/\//g, "-");
    const fileName = `Apontamento_${safeDate}_${safeDesc}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF do apontamento:", error);
    return NextResponse.json(
      { error: "Falha ao gerar o PDF do apontamento: " + (error.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
