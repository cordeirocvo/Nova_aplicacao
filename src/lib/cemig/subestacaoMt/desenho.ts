/**
 * Desenhos vetoriais do estudo (coordenograma e unifilar SE nº 4) em um modelo único de
 * primitivas (mm, origem no canto superior esquerdo) com renderizadores SVG e DXF.
 * O PDF reaproveita as mesmas primitivas (ver memorialPdf.ts).
 */
import { DxfDocument } from "@/lib/cad/dxfGenerator";
import { CenarioProtecao, ResultadoEstudo, tempoCurva, CURVAS, CurvaId, formatarNumero as fmt } from "./engine";

export const CORES = {
  navy: "#0A192F",
  laranja: "#E45318",
  verde: "#00B356",
  vermelho: "#DC2626",
  azul: "#1D4ED8",
  ambar: "#D97706",
  cinza: "#94A3B8",
  grade: "#E2E8F0",
};

export type Item =
  | { tipo: "linha"; pts: [number, number][]; cor: string; espessura?: number; tracejado?: boolean; camada: string }
  | { tipo: "texto"; x: number; y: number; texto: string; tamanho: number; cor: string; ancora?: "start" | "middle" | "end"; negrito?: boolean; camada: string }
  | { tipo: "circulo"; x: number; y: number; r: number; cor: string; preenchido?: boolean; camada: string }
  | { tipo: "retangulo"; x: number; y: number; w: number; h: number; cor: string; tracejado?: boolean; camada: string };

export interface Desenho {
  titulo: string;
  largura: number;
  altura: number;
  itens: Item[];
}

// ─── Coordenograma ───────────────────────────────────────────────────────────
const T_MIN = 0.01;
const T_MAX = 1000;
const T_INST = 0.03; // tempo de plotagem dos instantâneos

export function coordenograma(r: ResultadoEstudo, c: CenarioProtecao): Desenho {
  const W = 297, H = 210;
  const px = 22, py = 16, pw = 185, ph = 160; // área do gráfico
  const itens: Item[] = [];
  const iccMax = Math.max(r.entrada.iccTrifasicoA, r.entrada.iccFaseTerraA ?? 0);
  const iMinBase = Math.min(c.ipNeutroA, c.inA, ...r.pontosTrafo.map((p) => p.inA));
  const dMin = Math.floor(Math.log10(Math.max(0.1, iMinBase / 2)));
  const dMax = Math.ceil(Math.log10(iccMax * 1.2));
  const X = (i: number) => px + ((Math.log10(i) - dMin) / (dMax - dMin)) * pw;
  const Y = (t: number) => py + ((Math.log10(T_MAX) - Math.log10(t)) / (Math.log10(T_MAX) - Math.log10(T_MIN))) * ph;
  const clampT = (t: number) => Math.min(T_MAX, Math.max(T_MIN, t));
  const iMaxPlot = Math.pow(10, dMax);

  // Grade log-log
  for (let d = dMin; d <= dMax; d++) {
    for (let k = 1; k <= 9; k++) {
      const i = k * Math.pow(10, d);
      if (i > iMaxPlot) break;
      itens.push({ tipo: "linha", pts: [[X(i), py], [X(i), py + ph]], cor: k === 1 ? CORES.cinza : CORES.grade, espessura: k === 1 ? 0.25 : 0.12, camada: "COORD_GRADE" });
      if (k === 1) itens.push({ tipo: "texto", x: X(i), y: py + ph + 4.5, texto: fmt(i, i < 1 ? 1 : 0), tamanho: 2.6, cor: CORES.navy, ancora: "middle", camada: "COORD_TEXTOS" });
    }
  }
  for (let d = -2; d <= 3; d++) {
    for (let k = 1; k <= 9; k++) {
      const t = k * Math.pow(10, d);
      if (t > T_MAX) break;
      itens.push({ tipo: "linha", pts: [[px, Y(t)], [px + pw, Y(t)]], cor: k === 1 ? CORES.cinza : CORES.grade, espessura: k === 1 ? 0.25 : 0.12, camada: "COORD_GRADE" });
      if (k === 1) itens.push({ tipo: "texto", x: px - 1.5, y: Y(t) + 1, texto: fmt(t, t < 1 ? 2 : 0), tamanho: 2.6, cor: CORES.navy, ancora: "end", camada: "COORD_TEXTOS" });
    }
  }
  itens.push({ tipo: "retangulo", x: px, y: py, w: pw, h: ph, cor: CORES.navy, camada: "COORD_GRADE" });
  itens.push({ tipo: "texto", x: px + pw / 2, y: py + ph + 10, texto: `CORRENTE (A) referida a ${fmt(r.entrada.tensaoKV, 1)} kV`, tamanho: 3, cor: CORES.navy, ancora: "middle", negrito: true, camada: "COORD_TEXTOS" });
  itens.push({ tipo: "texto", x: 6, y: py + ph / 2, texto: "TEMPO (s)", tamanho: 3, cor: CORES.navy, ancora: "middle", negrito: true, camada: "COORD_TEXTOS" });
  itens.push({ tipo: "texto", x: px, y: 10, texto: `COORDENOGRAMA — ${c.titulo.toUpperCase()}`, tamanho: 4.2, cor: CORES.navy, negrito: true, camada: "COORD_TEXTOS" });

  // Curva de fase (51 + 50)
  const fimCurva = c.instFaseA ?? iccMax;
  const pts: [number, number][] = [];
  const i0 = c.ipFaseA * 1.03;
  for (let k = 0; k <= 80; k++) {
    const i = i0 * Math.pow(fimCurva / i0, k / 80);
    const t = tempoCurva(c.curvaFase, c.tmsFase, i, c.ipFaseA);
    if (t <= T_MAX) pts.push([X(i), Y(clampT(t))]);
  }
  if (c.instFaseA !== null) {
    pts.push([X(c.instFaseA), Y(T_INST)], [X(iccMax), Y(T_INST)]);
  }
  itens.push({ tipo: "linha", pts, cor: CORES.laranja, espessura: 0.6, camada: "COORD_FASE" });

  // Neutro (tempo definido + instantâneo)
  const fimN = c.instNeutroA ?? iccMax;
  const nPts: [number, number][] = [[X(c.ipNeutroA), Y(T_MAX)], [X(c.ipNeutroA), Y(c.tempoNeutroS)], [X(fimN), Y(c.tempoNeutroS)]];
  if (c.instNeutroA !== null) nPts.push([X(c.instNeutroA), Y(T_INST)], [X(iccMax), Y(T_INST)]);
  itens.push({ tipo: "linha", pts: nPts, cor: CORES.verde, espessura: 0.6, camada: "COORD_NEUTRO" });

  // Verticais de referência (rótulos escalonados para não sobrepor)
  let nVert = 0;
  const vertical = (i: number, cor: string, rot: string, camada: string, tracejado = true) => {
    itens.push({ tipo: "linha", pts: [[X(i), py], [X(i), py + ph]], cor, espessura: 0.3, tracejado, camada });
    itens.push({ tipo: "texto", x: X(i) - 0.8, y: py + 4 + 3.4 * nVert++, texto: rot, tamanho: 2.3, cor, ancora: "end", camada: "COORD_TEXTOS" });
  };
  vertical(c.inA, CORES.navy, `In ${fmt(c.inA, 1)}`, "COORD_REF");
  vertical(r.entrada.iccTrifasicoA, CORES.vermelho, `Icc3F ${fmt(r.entrada.iccTrifasicoA, 0)}`, "COORD_ICC", false);
  if (r.entrada.iccFaseTerraA) vertical(r.entrada.iccFaseTerraA, CORES.vermelho, `IccFT ${fmt(r.entrada.iccFaseTerraA, 0)}`, "COORD_ICC");

  // Pontos: Im e ANSI
  const ponto = (i: number, t: number, cor: string, rot: string, cheio: boolean, camada: string, abaixo = false) => {
    itens.push({ tipo: "circulo", x: X(i), y: Y(t), r: 1.1, cor, preenchido: cheio, camada });
    itens.push({ tipo: "texto", x: X(i) + 1.8, y: Y(t) + (abaixo ? 3.6 : -1.2), texto: rot, tamanho: 2.3, cor, camada: "COORD_TEXTOS" });
  };
  if (c.id === "CONSUMO") {
    ponto(r.imA, 0.1, CORES.ambar, `Im ${fmt(r.imA, 1)} A`, true, "COORD_INRUSH");
    for (const p of r.pontosTrafo) {
      ponto(p.ansiFaseA, p.tAnsiS, CORES.azul, `ANSI ${p.trafo.id} ${fmt(p.ansiFaseA, 0)} A`, true, "COORD_ANSI");
      ponto(p.ansiNeutroA, p.tAnsiS, CORES.azul, `ANSI-N ${fmt(p.ansiNeutroA, 0)} A`, false, "COORD_ANSI", true);
    }
    for (const m of r.entrada.motores ?? []) ponto(m.correntePartidaA, m.tempoPartidaS, CORES.navy, `Partida ${m.nome}`, false, "COORD_CARGAS");
  }

  // Legenda
  const lx = px + pw + 8;
  let ly = py + 4;
  const leg = (cor: string, txt: string[]) => {
    itens.push({ tipo: "linha", pts: [[lx, ly - 1], [lx + 7, ly - 1]], cor, espessura: 0.8, camada: "COORD_TEXTOS" });
    txt.forEach((t, k) => itens.push({ tipo: "texto", x: lx + 9, y: ly + k * 3.6, texto: t, tamanho: 2.5, cor: CORES.navy, camada: "COORD_TEXTOS" }));
    ly += txt.length * 3.6 + 3;
  };
  const curvaNome = c.curvaFase === "DT" ? "Tempo definido" : CURVAS[c.curvaFase as Exclude<CurvaId, "DT">].nome.split(" (")[0];
  leg(CORES.laranja, [`${c.funcaoFase} fase: Ip ${fmt(c.ipFaseA)} A`, `${curvaNome}`, `Dial (TMS) ${fmt(c.tmsFase, 3)}`, c.instFaseA !== null ? `Inst. ${fmt(c.instFaseA, 1)} A` : "Instantâneo desativado"]);
  leg(CORES.verde, [`${c.funcaoNeutro} neutro: ${fmt(c.ipNeutroA)} A`, `Tempo definido ${fmt(c.tempoNeutroS, 1)} s`, c.instNeutroA !== null ? `Inst. ${fmt(c.instNeutroA, 1)} A` : "Instantâneo desativado"]);
  if (c.id === "CONSUMO") {
    leg(CORES.ambar, [`Inrush Im ${fmt(r.imA, 1)} A @ 0,1 s`]);
    leg(CORES.azul, ["Pontos ANSI (● fase / ○ neutro)", ...r.pontosTrafo.map((p) => `${p.trafo.id}: ${p.trafo.kva} kVA Z${fmt(p.trafo.zPercent, 1)}% @ ${p.tAnsiS} s`)]);
  }
  leg(CORES.vermelho, [`Icc 3F ${fmt(r.entrada.iccTrifasicoA, 0)} A`, r.entrada.iccFaseTerraA ? `Icc FT ${fmt(r.entrada.iccFaseTerraA, 0)} A` : "Icc FT: informar"]);
  leg(CORES.navy, [`In ${fmt(c.inA)} A (${fmt(c.potenciaBaseKW, 0)} kW, FP 0,92)`, `TC ${r.tc.primarioA}-${r.tc.secundarioA} A`]);
  itens.push({ tipo: "texto", x: lx, y: py + ph + 4, texto: "ND-5.3 Anexo A 9.1.10 / ND-5.31 Anexo 6", tamanho: 2.2, cor: CORES.cinza, camada: "COORD_TEXTOS" });

  return { titulo: `Coordenograma - ${c.titulo}`, largura: W, altura: H, itens };
}

// ─── Unifilar SE nº 4 (DESENHO 10) ───────────────────────────────────────────
export function unifilarSE4(r: ResultadoEstudo, releNome = "Relé secundário"): Desenho {
  const W = 297, H = 210;
  const itens: Item[] = [];
  const y = 70;
  const L = (pts: [number, number][], cor = CORES.navy, esp = 0.5, tracejado = false, camada = "UNI_BARRA") => itens.push({ tipo: "linha", pts, cor, espessura: esp, tracejado, camada });
  const T = (x: number, yy: number, texto: string, tam = 2.6, ancora: "start" | "middle" | "end" = "middle", negrito = false) => itens.push({ tipo: "texto", x, y: yy, texto, tamanho: tam, cor: CORES.navy, ancora, negrito, camada: "UNI_TEXTOS" });
  const tpSimbolo = (x: number, rot: string[]) => {
    L([[x, y], [x, y + 10]]);
    itens.push({ tipo: "circulo", x, y: y + 13, r: 3, cor: CORES.navy, camada: "UNI_EQUIP" });
    itens.push({ tipo: "circulo", x, y: y + 17.5, r: 3, cor: CORES.navy, camada: "UNI_EQUIP" });
    rot.forEach((t, k) => T(x, y + 25 + k * 3.2, t, 2.3));
  };
  const tcSimbolo = (x: number, rot: string[]) => {
    itens.push({ tipo: "circulo", x, y, r: 3.2, cor: CORES.navy, camada: "UNI_EQUIP" });
    rot.forEach((t, k) => T(x, y - 8 - (rot.length - 1 - k) * 3.2, t, 2.3));
  };
  const kv = fmt(r.entrada.tensaoKV, 1);
  const g = r.entrada.geracao;
  const nTp = g ? 3 : 1;

  T(W / 2, 12, "DIAGRAMA UNIFILAR — SUBESTAÇÃO Nº 4 (BLINDADA) — ND-5.3 DESENHO 10", 4, "middle", true);
  // Entrada
  itens.push({ tipo: "linha", pts: [[14, y - 3], [18, y], [14, y + 3], [14, y - 3]], cor: CORES.navy, espessura: 0.5, camada: "UNI_EQUIP" });
  T(14, y + 9, "Entrada", 2.4); T(14, y + 12.5, `${kv} kV`, 2.4);
  // Compartimento de medição
  itens.push({ tipo: "retangulo", x: 24, y: 30, w: 62, h: 75, cor: CORES.cinza, tracejado: true, camada: "UNI_COMPART" });
  T(55, 34, "COL. 01 — MEDIÇÃO (EXCLUSIVO CEMIG)", 2.5, "middle", true);
  tpSimbolo(40, ["3 TP medição", "(CEMIG)"]);
  tcSimbolo(68, ["3 TC medição", "(CEMIG)"]);
  T(55, 100, "Medidor em CM-4 (≤ 2 m)", 2.2);
  // Compartimento de proteção
  itens.push({ tipo: "retangulo", x: 92, y: 30, w: 160, h: 75, cor: CORES.cinza, tracejado: true, camada: "UNI_COMPART" });
  T(172, 34, "COL. 02 — PROTEÇÃO", 2.5, "middle", true);
  // Chave seccionadora (lâmina aberta) — barra interrompida entre 100 e 116 mm
  L([[18, y], [100, y]], CORES.navy, 0.7);
  L([[116, y], [262, y]], CORES.navy, 0.7);
  L([[104, y], [112, y - 5]], CORES.navy, 0.6, false, "UNI_EQUIP");
  L([[100, y], [104, y]]);
  L([[112, y], [116, y]]);
  T(108, y - 10, "Chave seccionadora", 2.2); T(108, y - 7, "tripolar sob carga", 2.2);
  tpSimbolo(132, [`${nTp} TP proteção`, `${kv}kV/√3 - 115/√3 V`, "0,6P75 · 400 VA"]);
  tcSimbolo(158, [`3 TC proteção`, `${r.tc.primarioA}-${r.tc.secundarioA} A`, "10P20 · 12,5 VA"]);
  // Disjuntor
  itens.push({ tipo: "retangulo", x: 180, y: y - 5, w: 10, h: 10, cor: CORES.navy, camada: "UNI_EQUIP" });
  L([[180, y - 5], [190, y + 5]], CORES.navy, 0.4, false, "UNI_EQUIP");
  T(185, y - 14, "Disjuntor MT", 2.3); T(185, y - 10.8, r.dimensionamento.disjuntor.split(",").slice(1, 4).join(",").trim(), 2);
  // Relé + alimentação auxiliar
  itens.push({ tipo: "retangulo", x: 190, y: 82, w: 60, h: 16, cor: CORES.laranja, camada: "UNI_PROTECAO" });
  T(220, 87, releNome, 2.4, "middle", true);
  const funcs = ["50/51", "50N/51N", ...(r.cenarios.length > 1 ? ["67", "67N"] : []), ...r.funcoesAdicionais.map((f) => f.ansi.split(" ")[0].split("-")[0])];
  T(220, 91, Array.from(new Set(funcs)).join(" · "), 2);
  T(220, 95, "Nobreak ≥ 600 VA 2 h + trip capacitivo", 1.9);
  L([[132, y + 21], [132, 101], [190, 101], [190, 95]], CORES.laranja, 0.3, true, "UNI_PROTECAO");
  L([[158, y + 3.2], [158, 90], [190, 90]], CORES.laranja, 0.3, true, "UNI_PROTECAO");
  L([[220, 82], [220, 76], [185, 76], [185, y + 5]], CORES.laranja, 0.3, true, "UNI_PROTECAO");
  T(194, 79, "trip", 2, "start");
  // Saída e transformação
  L([[262, y], [262, 120]]);
  T(266, y - 2, "Saída", 2.4, "start");
  let tx = 262;
  r.entrada.trafos.forEach((t, k) => {
    tx = 70 + k * 60;
    L([[262, 120], [tx, 120], [tx, 128]]);
    itens.push({ tipo: "circulo", x: tx, y: 132, r: 4, cor: CORES.navy, camada: "UNI_EQUIP" });
    itens.push({ tipo: "circulo", x: tx, y: 137.5, r: 4, cor: CORES.navy, camada: "UNI_EQUIP" });
    T(tx, 146, `${t.id}: ${t.kva} kVA Dyn1`, 2.3); T(tx, 149.5, `Z ${fmt(t.zPercent, 1)}% · ${t.isolacao === "SECO" ? "seco" : "óleo"}`, 2.2);
    const fus = r.dimensionamento.fusiveisTrafo[k];
    if (r.entrada.trafos.length > 1) T(tx, 153, `Chave tripolar + fusível ${fus?.fusivelA ?? "?"} A`, 2.1);
  });
  if (r.dimensionamento.reatorAterramento) T(70, 160, r.dimensionamento.reatorAterramento.split(" (ND-5.31")[0].trim(), 2.2, "start");
  // Notas
  const notas = [
    "NOTAS: 1. Subestação de modelo aprovado pela CEMIG (PEC-11), arco interno IAC ≥ 12,5 kA/1 s.",
    "2. Módulo de TC/TP de medição exclusivo da CEMIG. 3. TC de proteção podem ficar antes ou após o disjuntor.",
    "4. TP de proteção do lado da CEMIG, após a chave e antes do disjuntor; secundário protegido por disjuntor (sem fusível).",
    "5. Para-raios no poste da derivação (proibidos dentro do cubículo). Malha ≥ " + r.dimensionamento.hastesMin + " hastes, R ≤ 10 Ω.",
  ];
  notas.forEach((n, k) => T(14, 172 + k * 4.5, n, 2.4, "start"));
  return { titulo: "Unifilar SE4", largura: W, altura: H, itens };
}

// ─── Renderizadores ──────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function desenhoParaSvg(d: Desenho): string {
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.largura} ${d.altura}" width="100%" font-family="Montserrat, Arial, sans-serif">`);
  out.push(`<rect width="${d.largura}" height="${d.altura}" fill="#FFFFFF"/>`);
  for (const it of d.itens) {
    if (it.tipo === "linha") {
      out.push(`<polyline points="${it.pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")}" fill="none" stroke="${it.cor}" stroke-width="${it.espessura ?? 0.3}"${it.tracejado ? ' stroke-dasharray="2 1.2"' : ""} stroke-linejoin="round"/>`);
    } else if (it.tipo === "texto") {
      out.push(`<text x="${it.x.toFixed(2)}" y="${it.y.toFixed(2)}" font-size="${it.tamanho}" fill="${it.cor}" text-anchor="${it.ancora ?? "start"}"${it.negrito ? ' font-weight="700"' : ""}>${esc(it.texto)}</text>`);
    } else if (it.tipo === "circulo") {
      out.push(`<circle cx="${it.x.toFixed(2)}" cy="${it.y.toFixed(2)}" r="${it.r}" stroke="${it.cor}" stroke-width="0.35" fill="${it.preenchido ? it.cor : "#FFFFFF"}"/>`);
    } else {
      out.push(`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="none" stroke="${it.cor}" stroke-width="0.35"${it.tracejado ? ' stroke-dasharray="2 1.2"' : ""}/>`);
    }
  }
  out.push("</svg>");
  return out.join("\n");
}

/** Mapa cor → ACI (AutoCAD Color Index). */
const ACI: Record<string, number> = { [CORES.navy]: 7, [CORES.laranja]: 30, [CORES.verde]: 3, [CORES.vermelho]: 1, [CORES.azul]: 5, [CORES.ambar]: 40, [CORES.cinza]: 8, [CORES.grade]: 9, "#FFFFFF": 7 };
/** DXF não aceita acentos de forma confiável em R12: normaliza para ASCII. */
const ascii = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/√/g, "raiz").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[●]/g, "*").replace(/[○]/g, "o").replace(/—/g, "-").replace(/[^\x20-\x7E]/g, "");

export function desenhoParaDxf(d: Desenho): string {
  const dxf = new DxfDocument();
  const camadas = new Map<string, number>();
  for (const it of d.itens) if (!camadas.has(it.camada)) camadas.set(it.camada, ACI[it.cor] ?? 7);
  camadas.forEach((cor, nomeCamada) => dxf.addLayer(nomeCamada, cor));
  const fy = (y: number) => d.altura - y;
  for (const it of d.itens) {
    if (it.tipo === "linha") {
      for (let k = 1; k < it.pts.length; k++) dxf.addLine(it.pts[k - 1][0], fy(it.pts[k - 1][1]), it.pts[k][0], fy(it.pts[k][1]), it.camada);
    } else if (it.tipo === "texto") {
      const largura = it.texto.length * it.tamanho * 0.55;
      const x = it.ancora === "middle" ? it.x - largura / 2 : it.ancora === "end" ? it.x - largura : it.x;
      dxf.addText(ascii(it.texto), x, fy(it.y), it.tamanho * 0.8, it.camada);
    } else if (it.tipo === "circulo") {
      dxf.addCircle(it.x, fy(it.y), it.r, it.camada);
    } else {
      dxf.addRect(it.x, fy(it.y + it.h), it.w, it.h, it.camada);
    }
  }
  return dxf.toDxfString();
}
