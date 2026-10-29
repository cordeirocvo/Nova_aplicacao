/**
 * Catálogo de relés secundários e tradutor de ajustes.
 * O estudo é feito uma vez (A primário, curva normalizada, TMS IEC, s) e traduzido
 * para os parâmetros nativos de cada relé. Faixas marcadas `confirmado: false` vieram
 * de fontes secundárias — conferir no manual do firmware (ver skill 04-reles-parametros.md).
 */
import { CurvaId, ResultadoEstudo, Severidade, tempoCurva, formatarNumero as fmt } from "./engine";

export type FormaPickup = "A_SEC" | "X_IN" | "A_PRIM" | "X_CT";
export interface Faixa { min: number; max: number; passo: number }

export interface ReleModelo {
  id: string;
  fabricante: string;
  modelo: string;
  formaPickup: FormaPickup;
  /** TMS IEC puro, ou Sepam (T = tempo a 10×Is). */
  escalaTempo: "TMS" | "SEPAM_T10";
  /** Faixas de corrente expressas na forma nativa (A sec, ×In, ×CT ou ×TC primário quando A_PRIM). */
  pickupFase: Faixa;
  pickupNeutro: Faixa;
  instantaneo: Faixa;
  tms: Faixa;
  tempoDefinido: Faixa;
  curvas: Partial<Record<CurvaId, string>>;
  /** Nomes nativos. `{n}` = elemento (1 = 1º cenário, 2 = 2º cenário). */
  nomes: {
    pickup51: string; curva51: string; tms51: string;
    pickup50: string; tempo50?: string;
    pickup51N: string; tempo51N: string; pickup50N: string;
    direcao?: string; angulo?: string; anguloN?: string;
    p32?: string; t32?: string; v27?: string; t27?: string; v59?: string; t59?: string; f81?: string; t81?: string;
  };
  funcoes: ("67" | "32" | "27" | "59" | "81")[];
  potencia32?: { forma: "X_SN" | "KW_PRIM" | "W_SEC"; faixa: Faixa };
  confirmado: boolean;
  obs: string;
}

const F = (min: number, max: number, passo: number): Faixa => ({ min, max, passo });
const IEC4 = (ni: string, vi: string, ei: string, lti: string) => ({ IEC_NI: ni, IEC_VI: vi, IEC_EI: ei, IEC_LTI: lti, DT: "DT" });

export const CATALOGO_RELES: ReleModelo[] = [
  {
    id: "PEXTRON_URP6000",
    fabricante: "Pextron",
    modelo: "URP 6000 / 6100",
    formaPickup: "A_SEC",
    escalaTempo: "TMS",
    pickupFase: F(0.04, 6.5, 0.01),
    pickupNeutro: F(0.04, 6.5, 0.01),
    instantaneo: F(0.2, 100, 0.01),
    tms: F(0.01, 3.0, 0.01),
    tempoDefinido: F(0.1, 250, 0.01),
    curvas: { ...IEC4("NI", "MI", "EI", "LI"), DT: "FLAT (tempo definido)" },
    nomes: { pickup51: "I>F{n} ip", curva51: "I>F{n} curva", tms51: "I>F{n} dt", pickup50: "I>>F{n} ip", tempo50: "I>>F{n} t", pickup51N: "I>N{n} ip", tempo51N: "I>N{n} t (FLAT)", pickup50N: "I>>N{n} ip", direcao: "67F{n} sentido", angulo: "67F ângulo", anguloN: "67N ângulo", p32: "P>{n} pp", t32: "P>{n} t", v27: "V<F vp", t27: "V<F t", v59: "V>F vp", t59: "V>F t", f81: "F</F> fp", t81: "F</F> t" },
    funcoes: ["67", "32", "27", "59", "81"],
    potencia32: { forma: "KW_PRIM", faixa: F(1, 99999, 1) },
    confirmado: false,
    obs: "Pickup em A secundário × RTC (o relé exibe o primário após programar RTC/RTP). 'MI' = Muito Inversa (IEC VI). 4 grupos de ajuste. Conferir faixas no manual do firmware.",
  },
  {
    id: "PEXTRON_URP1439TU",
    fabricante: "Pextron",
    modelo: "URP 1439TU",
    formaPickup: "A_SEC",
    escalaTempo: "TMS",
    pickupFase: F(0.047, 16, 0.001),
    pickupNeutro: F(0.047, 6.5, 0.001),
    instantaneo: F(1, 100, 0.01),
    tms: F(0.1, 2.0, 0.01),
    tempoDefinido: F(0.1, 250, 0.01),
    curvas: { ...IEC4("NI", "MI", "EI", "LONG"), DT: "DT" },
    nomes: { pickup51: "I> F (ip)", curva51: "Curva F", tms51: "dt F", pickup50: "I>>> F", pickup51N: "I> N (ip)", tempo51N: "t N (DT)", pickup50N: "I>>> N" },
    funcoes: [],
    confirmado: false,
    obs: "Somente sobrecorrente (50/51, 50N/51N, 51GS): NÃO atende GD/paralelismo (sem 67/32/27/59/81). Dial mínimo 0,10.",
  },
  {
    id: "PEXTRON_URPE7104",
    fabricante: "Pextron",
    modelo: "URPE 7104",
    formaPickup: "A_SEC",
    escalaTempo: "TMS",
    pickupFase: F(0.047, 16, 0.001),
    pickupNeutro: F(0.047, 6.5, 0.001),
    instantaneo: F(1, 100, 0.01),
    tms: F(0.1, 2.0, 0.01),
    tempoDefinido: F(0.1, 250, 0.01),
    curvas: { ...IEC4("NI", "MI", "EI", "LONG"), DT: "DT" },
    nomes: { pickup51: "I> F (ip)", curva51: "Curva F", tms51: "dt F", pickup50: "I>>> F", pickup51N: "I> N (ip)", tempo51N: "t N (DT)", pickup50N: "I>>> N" },
    funcoes: [],
    confirmado: false,
    obs: "Sobrecorrente com fonte capacitiva interna (conferir). Para GD use URP 6000/6100.",
  },
  {
    id: "SIEMENS_7SR1004",
    fabricante: "Siemens Reyrolle",
    modelo: "7SR1004 (Argus 7SR10 direcional)",
    formaPickup: "X_IN",
    escalaTempo: "TMS",
    pickupFase: F(0.05, 4.0, 0.01),
    pickupNeutro: F(0.05, 4.0, 0.01),
    instantaneo: F(0.05, 50, 0.01),
    tms: F(0.01, 100, 0.005),
    tempoDefinido: F(0, 14400, 0.01),
    curvas: { IEC_NI: "IEC-NI", IEC_VI: "IEC-VI", IEC_EI: "IEC-EI", IEC_LTI: "IEC-LTI", IEEE_MI: "ANSI-MI", IEEE_VI: "ANSI-VI", IEEE_EI: "ANSI-EI", DT: "DTL" },
    nomes: { pickup51: "Gn 51-{n} Setting", curva51: "Gn 51-{n} Char", tms51: "Gn 51-{n} Time Mult", pickup50: "Gn 50-{n} Setting", tempo50: "Gn 50-{n} Delay", pickup51N: "Gn 50N-{n} Setting", tempo51N: "Gn 50N-{n} Delay", pickup50N: "Gn 50N-{n}i Setting", direcao: "Gn 51-{n} Dir. Control", angulo: "Gn 67 Char Angle", anguloN: "Gn 67N Char Angle", p32: "Gn 32-{n} Setting", t32: "Gn 32-{n} Delay" },
    funcoes: ["67", "32"],
    potencia32: { forma: "X_SN", faixa: F(0.05, 2, 0.01) },
    confirmado: true,
    obs: "Formato do estudo aprovado NS 1154922565. Pickups em ×In; 32 em ×Sn. 27/59/81 dependem da variante — conferir código de pedido.",
  },
  {
    id: "SEL_751A",
    fabricante: "SEL",
    modelo: "SEL-751A / 751",
    formaPickup: "A_SEC",
    escalaTempo: "TMS",
    pickupFase: F(0.5, 16, 0.01),
    pickupNeutro: F(0.5, 16, 0.01),
    instantaneo: F(0.5, 100, 0.01),
    tms: F(0.05, 1.0, 0.01),
    tempoDefinido: F(0, 400, 0.01),
    curvas: { IEC_NI: "C1", IEC_VI: "C2", IEC_EI: "C3", IEC_LTI: "C4", IEEE_MI: "U1", IEEE_VI: "U3", IEEE_EI: "U4", DT: "DT (50x + 50xD)" },
    nomes: { pickup51: "51P{n}P", curva51: "51P{n}C", tms51: "51P{n}TD", pickup50: "50P{n}P", tempo50: "50P{n}D", pickup51N: "50G{n}P", tempo51N: "50G{n}D", pickup50N: "50G{n}2P", direcao: "E67 / DIR{n}", angulo: "Z1ANG", p32: "32P{n}P", t32: "32P{n}D", v27: "27P1P", t27: "27P1D", v59: "59P1P", t59: "59P1D", f81: "81D{n}TP", t81: "81D{n}TD" },
    funcoes: ["67", "32", "27", "59", "81"],
    potencia32: { forma: "W_SEC", faixa: F(1, 9999, 1) },
    confirmado: false,
    obs: "Pickup em A secundário (5 A: 0,50–16 A ✅; TD curvas C 0,05–1,00 ✅). Direcional/32/27/59/81 exigem placa de tensão. Curvas U usam escala US (≈5× IEEE).",
  },
  {
    id: "SCHNEIDER_SEPAM_S40",
    fabricante: "Schneider",
    modelo: "Sepam S40 / S20",
    formaPickup: "A_PRIM",
    escalaTempo: "SEPAM_T10",
    pickupFase: F(0.1, 2.4, 0.01),
    pickupNeutro: F(0.01, 15, 0.01),
    instantaneo: F(0.1, 24, 0.01),
    tms: F(0.1, 12.5, 0.01),
    tempoDefinido: F(0.05, 300, 0.01),
    curvas: { IEC_NI: "SIT", IEC_VI: "VIT", IEC_EI: "EIT", IEC_LTI: "LTI", IEEE_MI: "IEEE MI", IEEE_VI: "IEEE VI", IEEE_EI: "IEEE EI", DT: "DT" },
    nomes: { pickup51: "50/51-{n} Is", curva51: "50/51-{n} Curva", tms51: "50/51-{n} T (a 10×Is)", pickup50: "50/51-{n}b Is (DT)", tempo50: "50/51-{n}b T", pickup51N: "50N/51N-{n} Is0", tempo51N: "50N/51N-{n} T", pickup50N: "50N/51N-{n}b Is0", direcao: "67-{n} direção", angulo: "67 ângulo característico", p32: "32P Ps", t32: "32P T", v27: "27 Us", t27: "27 T", v59: "59 Us", t59: "59 T", f81: "81 Fs", t81: "81 T" },
    funcoes: ["67", "32", "27", "59", "81"],
    potencia32: { forma: "KW_PRIM", faixa: F(1, 99999, 1) },
    confirmado: false,
    obs: "Is em A primário (faixas em ×In do TC). Tempo T = tempo a 10×Is = TMS × f(10). S20 não tem 67/32/27/59/81.",
  },
  {
    id: "ABB_REF615",
    fabricante: "ABB",
    modelo: "REF615 / REF620",
    formaPickup: "X_IN",
    escalaTempo: "TMS",
    pickupFase: F(0.05, 5.0, 0.01),
    pickupNeutro: F(0.01, 5.0, 0.005),
    instantaneo: F(0.1, 40, 0.01),
    tms: F(0.025, 15, 0.005),
    tempoDefinido: F(0.04, 200, 0.01),
    curvas: { IEC_NI: "9 = IEC Norm. inv.", IEC_VI: "10 = IEC Very inv.", IEC_EI: "12 = IEC Ext. inv.", IEC_LTI: "14 = IEC L.T. inv.", IEEE_MI: "4 = ANSI Mod. inv.", IEEE_VI: "2 = ANSI Very inv.", IEEE_EI: "1 = ANSI Ext. inv.", DT: "15 = IEC Def. Time" },
    nomes: { pickup51: "PHLPTOC{n} Start value", curva51: "PHLPTOC{n} Operating curve type", tms51: "PHLPTOC{n} Time multiplier", pickup50: "PHHPTOC{n} Start value", tempo50: "PHHPTOC{n} Operate delay time", pickup51N: "EFLPTOC{n} Start value", tempo51N: "EFLPTOC{n} Operate delay time", pickup50N: "EFHPTOC{n} Start value", direcao: "DPHLPDOC{n} Directional mode", angulo: "DPHLPDOC Characteristic angle", p32: "DOPPDPR{n} Start value", t32: "DOPPDPR{n} Operate delay", v27: "PHPTUV1 Start value", t27: "PHPTUV1 Operate delay", v59: "PHPTOV1 Start value", t59: "PHPTOV1 Operate delay", f81: "FRPFRQ{n} Start value", t81: "FRPFRQ{n} Operate delay" },
    funcoes: ["67", "32", "27", "59", "81"],
    potencia32: { forma: "X_SN", faixa: F(0.01, 2, 0.01) },
    confirmado: false,
    obs: "PHLPTOC Start value 0,05–5,00 ×In ✅. Funções conforme configuração padrão adquirida.",
  },
  {
    id: "EASERGY_P3U",
    fabricante: "Schneider",
    modelo: "Easergy P3U30",
    formaPickup: "X_IN",
    escalaTempo: "TMS",
    pickupFase: F(0.05, 5.0, 0.01),
    pickupNeutro: F(0.005, 8.0, 0.005),
    instantaneo: F(0.1, 40, 0.01),
    tms: F(0.025, 20, 0.005),
    tempoDefinido: F(0.04, 300, 0.01),
    curvas: { IEC_NI: "IEC NI", IEC_VI: "IEC VI", IEC_EI: "IEC EI", IEC_LTI: "IEC LTI", IEEE_MI: "IEEE MI", IEEE_VI: "IEEE VI", IEEE_EI: "IEEE EI", DT: "DT" },
    nomes: { pickup51: "I> {n}", curva51: "Delay curve family / type", tms51: "Inv. time coefficient k", pickup50: "I>> {n}", tempo50: "t>>", pickup51N: "I0> {n}", tempo51N: "t0>", pickup50N: "I0>> {n}", direcao: "Idir> mode", angulo: "Idir> base angle", p32: "P< / reverse power", v27: "U<", t27: "t<", v59: "U>", t59: "t>", f81: "f< / f>", t81: "t" },
    funcoes: ["67", "32", "27", "59", "81"],
    potencia32: { forma: "X_SN", faixa: F(0.01, 2, 0.01) },
    confirmado: false,
    obs: "Faixas de resumo do fabricante — conferir no manual.",
  },
  {
    id: "SIEMENS_7SJ80",
    fabricante: "Siemens",
    modelo: "SIPROTEC Compact 7SJ80",
    formaPickup: "A_SEC",
    escalaTempo: "TMS",
    pickupFase: F(0.5, 20, 0.01),
    pickupNeutro: F(0.25, 20, 0.01),
    instantaneo: F(0.5, 175, 0.01),
    tms: F(0.05, 3.2, 0.01),
    tempoDefinido: F(0, 60, 0.01),
    curvas: { IEC_NI: "Normal Inverse", IEC_VI: "Very Inverse", IEC_EI: "Extremely Inverse", IEC_LTI: "Long Inverse", DT: "Definite Time" },
    nomes: { pickup51: "51 PICKUP (Ip)", curva51: "IEC CURVE", tms51: "51 TIME DIAL (T Ip)", pickup50: "50-2 PICKUP", tempo50: "50-2 DELAY", pickup51N: "50N-1 PICKUP", tempo51N: "50N-1 DELAY", pickup50N: "50N-2 PICKUP", direcao: "67 DIRECTION", angulo: "67 ROTATION ANGLE", p32: "32 P> PICKUP", t32: "32 DELAY", v27: "27-1 PICKUP", t27: "27-1 DELAY", v59: "59-1 PICKUP", t59: "59-1 DELAY", f81: "81-x PICKUP", t81: "81-x DELAY" },
    funcoes: ["67", "32", "27", "59", "81"],
    potencia32: { forma: "W_SEC", faixa: F(1, 9999, 1) },
    confirmado: false,
    obs: "Valores em A secundário (DIGSI). Funções conforme MLFB.",
  },
];

export function releGenerico(base?: Partial<ReleModelo>): ReleModelo {
  return {
    id: "GENERICO",
    fabricante: "Genérico",
    modelo: "Qualquer relé (faixas editáveis)",
    formaPickup: "X_IN",
    escalaTempo: "TMS",
    pickupFase: F(0.05, 4, 0.01),
    pickupNeutro: F(0.05, 4, 0.01),
    instantaneo: F(0.05, 50, 0.01),
    tms: F(0.01, 10, 0.01),
    tempoDefinido: F(0, 300, 0.01),
    curvas: { IEC_NI: "IEC NI", IEC_VI: "IEC VI", IEC_EI: "IEC EI", IEC_LTI: "IEC LTI", IEEE_MI: "IEEE MI", IEEE_VI: "IEEE VI", IEEE_EI: "IEEE EI", DT: "DT" },
    nomes: { pickup51: "51-{n} pickup", curva51: "51-{n} curva", tms51: "51-{n} dial", pickup50: "50-{n} pickup", tempo50: "50-{n} tempo", pickup51N: "51N-{n} pickup", tempo51N: "51N-{n} tempo definido", pickup50N: "50N-{n} pickup", direcao: "67-{n} direção", angulo: "67 ângulo", anguloN: "67N ângulo", p32: "32-{n} ajuste", t32: "32-{n} tempo", v27: "27 ajuste", t27: "27 tempo", v59: "59 ajuste", t59: "59 tempo", f81: "81 ajuste", t81: "81 tempo" },
    funcoes: ["67", "32", "27", "59", "81"],
    potencia32: { forma: "X_SN", faixa: F(0.05, 2, 0.01) },
    confirmado: false,
    obs: "Preencha forma de ajuste, faixas e passos conforme o catálogo do relé escolhido.",
    ...base,
  };
}

// ─── Tradução ────────────────────────────────────────────────────────────────
export interface LinhaParametro {
  grupo: string;
  funcao: string;
  parametro: string;
  ajuste: string;
  primario: string;
  faixa: string;
  status: Severidade;
  nota?: string;
}

export interface Traducao {
  rele: ReleModelo;
  rtc: number;
  inRele: number;
  linhas: LinhaParametro[];
  avisos: string[];
}

const UNID: Record<FormaPickup, string> = { A_SEC: "A sec", X_IN: "×In", A_PRIM: "A prim", X_CT: "×CT" };
const casas = (passo: number) => Math.max(0, Math.min(4, Math.ceil(-Math.log10(passo) - 1e-9)));
const arred = (x: number, passo: number) => Math.round(x / passo) * passo;
const nome = (tpl: string | undefined, n: number) => (tpl ?? "—").replace(/\{n\}/g, String(n));

/** Converte corrente primária para a forma nativa. */
function paraNativo(iPrim: number, rele: ReleModelo, rtc: number, inRele: number, tcPrim: number): number {
  switch (rele.formaPickup) {
    case "A_SEC": return iPrim / rtc;
    case "X_IN": return iPrim / (rtc * inRele);
    case "X_CT": return iPrim / tcPrim;
    case "A_PRIM": return iPrim;
  }
}
function deNativo(v: number, rele: ReleModelo, rtc: number, inRele: number, tcPrim: number): number {
  switch (rele.formaPickup) {
    case "A_SEC": return v * rtc;
    case "X_IN": return v * rtc * inRele;
    case "X_CT": return v * tcPrim;
    case "A_PRIM": return v;
  }
}
/** Faixa nativa absoluta (Sepam: faixa em ×TC primário → A prim). */
function faixaAbs(f: Faixa, rele: ReleModelo, tcPrim: number): Faixa {
  return rele.formaPickup === "A_PRIM" ? { min: f.min * tcPrim, max: f.max * tcPrim, passo: f.passo } : f;
}

export function traduzirEstudo(r: ResultadoEstudo, rele: ReleModelo): Traducao {
  const tcPrim = r.tc.primarioA;
  const rtc = r.tc.rtc;
  const inRele = r.tc.secundarioA;
  const linhas: LinhaParametro[] = [];
  const avisos: string[] = [];
  const gd = r.cenarios.length > 1 || r.funcoesAdicionais.length > 0;
  if (gd && !rele.funcoes.includes("67") && r.cenarios.length > 1) avisos.push(`${rele.modelo} não possui função 67 direcional: inadequado para GD com injeção.`);
  if (gd && !rele.funcoes.includes("32")) avisos.push(`${rele.modelo} não possui função 32: inadequado para geração própria.`);
  if (!rele.confirmado) avisos.push("Faixas deste modelo não confirmadas no manual — conferir antes de emitir o memorial.");

  const corrente = (grupo: string, n: number, funcao: string, tpl: string, iPrim: number, faixa: Faixa, podeSubir: boolean): void => {
    const fx = faixaAbs(faixa, rele, tcPrim);
    let v = arred(paraNativo(iPrim, rele, rtc, inRele, tcPrim), fx.passo);
    let st: Severidade = "OK";
    let nota: string | undefined;
    if (v < fx.min) {
      if (podeSubir) { v = fx.min; st = "ATENCAO"; nota = "Abaixo do mínimo do relé: adotado o mínimo (justificar no memorial)"; }
      else { st = "INTERVENCAO"; nota = "Abaixo da faixa: reduzir RTC"; }
    } else if (v > fx.max) { st = "INTERVENCAO"; nota = "Acima da faixa: aumentar RTC ou trocar relé"; }
    const d = casas(fx.passo);
    linhas.push({ grupo, funcao, parametro: nome(tpl, n), ajuste: `${fmt(v, d)} ${UNID[rele.formaPickup]}`, primario: `${fmt(deNativo(v, rele, rtc, inRele, tcPrim), 1)} A`, faixa: `${fmt(fx.min, d)} – ${fmt(fx.max, d)}`, status: st, nota });
  };
  const tempo = (grupo: string, n: number, funcao: string, tpl: string | undefined, t: number, faixa: Faixa) => {
    const v = arred(t, faixa.passo);
    const ok = v >= faixa.min && v <= faixa.max;
    linhas.push({ grupo, funcao, parametro: nome(tpl, n), ajuste: `${fmt(v, casas(faixa.passo))} s`, primario: "—", faixa: `${faixa.min} – ${faixa.max} s`, status: ok ? "OK" : "INTERVENCAO", nota: ok ? undefined : "Tempo fora da faixa do relé" });
  };

  r.cenarios.forEach((c, idx) => {
    const n = idx + 1;
    const G = `${c.titulo} · elemento ${n}`;
    corrente(G, n, c.funcaoFase + " (temp.)", rele.nomes.pickup51, c.ipFaseA, rele.pickupFase, false);
    const curvaNome = rele.curvas[c.curvaFase];
    linhas.push({ grupo: G, funcao: c.funcaoFase + " (temp.)", parametro: nome(rele.nomes.curva51, n), ajuste: curvaNome ?? "N/D", primario: c.curvaFase, faixa: "—", status: curvaNome ? "OK" : "INTERVENCAO", nota: curvaNome ? undefined : "Curva indisponível no relé" });
    if (rele.escalaTempo === "SEPAM_T10") {
      tempo(G, n, c.funcaoFase + " (temp.)", rele.nomes.tms51, tempoCurva(c.curvaFase, c.tmsFase, 10, 1), rele.tms);
    } else {
      const v = arred(c.tmsFase, rele.tms.passo);
      const ok = v >= rele.tms.min && v <= rele.tms.max;
      linhas.push({ grupo: G, funcao: c.funcaoFase + " (temp.)", parametro: nome(rele.nomes.tms51, n), ajuste: fmt(v, casas(rele.tms.passo)), primario: `TMS ${fmt(c.tmsFase, 3)}`, faixa: `${fmt(rele.tms.min, casas(rele.tms.passo))} – ${fmt(rele.tms.max, casas(rele.tms.passo))}`, status: ok ? "OK" : "INTERVENCAO", nota: ok ? undefined : "Dial fora da faixa do relé" });
    }
    if (c.instFaseA !== null) {
      corrente(G, n, c.funcaoFase + " (inst.)", rele.nomes.pickup50, c.instFaseA, rele.instantaneo, false);
      if (rele.nomes.tempo50) tempo(G, n, c.funcaoFase + " (inst.)", rele.nomes.tempo50, 0, { ...rele.tempoDefinido, min: 0 });
    } else {
      linhas.push({ grupo: G, funcao: c.funcaoFase + " (inst.)", parametro: nome(rele.nomes.pickup50, n), ajuste: "DESABILITADO", primario: "—", faixa: "—", status: "OK" });
    }
    corrente(G, n, c.funcaoNeutro + " (DT)", rele.nomes.pickup51N, c.ipNeutroA, rele.pickupNeutro, true);
    tempo(G, n, c.funcaoNeutro + " (DT)", rele.nomes.tempo51N, c.tempoNeutroS, rele.tempoDefinido);
    if (c.instNeutroA !== null) corrente(G, n, c.funcaoNeutro + " (inst.)", rele.nomes.pickup50N, c.instNeutroA, rele.instantaneo, true);
    else linhas.push({ grupo: G, funcao: c.funcaoNeutro + " (inst.)", parametro: nome(rele.nomes.pickup50N, n), ajuste: "DESABILITADO", primario: "—", faixa: "—", status: "OK" });
    if (c.direcao) {
      linhas.push({ grupo: G, funcao: c.funcaoFase, parametro: nome(rele.nomes.direcao, n), ajuste: c.direcao === "INJECAO" ? "Forward" : "Reverse", primario: c.direcao === "INJECAO" ? "acessante → CEMIG" : "CEMIG → acessante", faixa: "—", status: "OK", nota: "Polaridade do TC de proteção no sentido acessante → CEMIG" });
    }
  });
  if (r.cenarios.some((c) => c.direcao)) {
    linhas.push({ grupo: "Direcional", funcao: "67", parametro: rele.nomes.angulo ?? "Ângulo 67", ajuste: "45°", primario: "—", faixa: "—", status: "OK", nota: "Prática aprovada (NS 1154922565); ND-5.31 não especifica" });
    linhas.push({ grupo: "Direcional", funcao: "67N", parametro: rele.nomes.anguloN ?? "Ângulo 67N", ajuste: "-45°", primario: "—", faixa: "—", status: "OK" });
  }

  // Funções adicionais (32, 27, 59, 81, 25)
  const vSecFF = 115;
  const rtp = (r.entrada.tensaoKV * 1000) / vSecFF;
  for (const f of r.funcoesAdicionais) {
    if (f.ansi.startsWith("32")) {
      const n = f.ansi.includes("consumo") ? 2 : 1;
      let ajuste = `${fmt(f.valor, 1)} kW prim`;
      let st: Severidade = rele.funcoes.includes("32") ? "OK" : "INTERVENCAO";
      if (rele.potencia32?.forma === "X_SN") {
        const pu = Math.max(rele.potencia32.faixa.min, arred(f.valor / r.snKVA, rele.potencia32.faixa.passo));
        if (f.valor / r.snKVA < rele.potencia32.faixa.min) st = "ATENCAO";
        ajuste = `${fmt(pu, 2)} ×Sn`;
      } else if (rele.potencia32?.forma === "W_SEC") {
        ajuste = `${fmt((f.valor * 1000) / (rtc * rtp), 1)} W sec (3φ)`;
      }
      linhas.push({ grupo: "Potência", funcao: f.ansi, parametro: nome(rele.nomes.p32, n), ajuste, primario: `${fmt(f.valor, 1)} kW · Sn = ${fmt(r.snKVA, 1)} kVA`, faixa: rele.potencia32 ? `${rele.potencia32.faixa.min} – ${rele.potencia32.faixa.max}` : "—", status: st, nota: st === "ATENCAO" ? "Abaixo do mínimo do relé: adotado o mínimo" : undefined });
      if (f.tempoS !== null) linhas.push({ grupo: "Potência", funcao: f.ansi, parametro: nome(rele.nomes.t32, n), ajuste: `${fmt(f.tempoS, 1)} s`, primario: "—", faixa: "—", status: st });
      continue;
    }
    const fam = f.ansi.slice(0, 2) as "27" | "59" | "81" | "25";
    const suportado = fam === "25" || rele.funcoes.includes(fam as "27" | "59" | "81");
    const tplV = fam === "27" ? rele.nomes.v27 : fam === "59" ? rele.nomes.v59 : fam === "81" ? rele.nomes.f81 : "25 sincronismo";
    const tplT = fam === "27" ? rele.nomes.t27 : fam === "59" ? rele.nomes.t59 : fam === "81" ? rele.nomes.t81 : undefined;
    const ajuste = f.unidade === "pu" && fam !== "25" ? `${fmt(f.valor, 2)} pu (${fmt(f.valor * vSecFF, 1)} V sec FF)` : f.ajuste;
    linhas.push({ grupo: "Tensão/Frequência", funcao: f.ansi, parametro: tplV ?? f.ansi, ajuste, primario: f.unidade === "pu" && fam !== "25" ? `${fmt(f.valor * r.entrada.tensaoKV, 2)} kV` : "—", faixa: "—", status: suportado ? "OK" : "ATENCAO", nota: suportado ? undefined : "Função não disponível neste relé — prever no painel de interface/inversores" });
    if (f.tempoS !== null && tplT) linhas.push({ grupo: "Tensão/Frequência", funcao: f.ansi, parametro: tplT, ajuste: `${fmt(f.tempoS, 1)} s`, primario: "—", faixa: "—", status: suportado ? "OK" : "ATENCAO" });
  }

  linhas.push({ grupo: "Geral", funcao: "RTC", parametro: "Relação TC", ajuste: `${tcPrim}/${inRele} (${rtc})`, primario: "—", faixa: "—", status: "OK" });
  if (r.funcoesAdicionais.length || r.cenarios.some((c) => c.direcao)) linhas.push({ grupo: "Geral", funcao: "RTP", parametro: "Relação TP", ajuste: `${fmt(r.entrada.tensaoKV * 1000, 0)}/${vSecFF} V (${fmt(rtp, 0)})`, primario: "—", faixa: "—", status: "OK" });
  linhas.push({ grupo: "Geral", funcao: "Segurança", parametro: "Comunicação remota", ajuste: "DESABILITADA (sem fios nos bornes)", primario: "—", faixa: "—", status: "OK", nota: "ND-5.3 3.3.1 b" });
  linhas.push({ grupo: "Geral", funcao: "Segurança", parametro: "Senha / bloqueio de ajuste", ajuste: "HABILITADO", primario: "—", faixa: "—", status: "OK", nota: "ND-5.3 9.1.5.12" });

  return { rele, rtc, inRele, linhas, avisos };
}
