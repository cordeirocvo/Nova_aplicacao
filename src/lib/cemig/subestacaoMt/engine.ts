/**
 * Motor de Estudo de Proteção e Dimensionamento de Subestação de Entrada MT — CEMIG
 * Fontes: ND-5.3 (SET/2023) Anexo A + Cap. 4/5 · ND-5.31 (JUN/2024) Anexo 6 / Tabela 4.
 * Conhecimento normativo detalhado: .agents/skills/cemig-subestacao-mt/references/
 */

// ─── Constantes normativas (SSOT) ──────────────────────────────────────────────
/** A CEMIG usa 1,73 nas fórmulas do Anexo A — manter para bater com os estudos aprovados. */
export const RAIZ3_CEMIG = 1.73;
export const FP_REFERENCIA = 0.92;
export const FATOR_PARTIDA = 1.05; // Ip = 1,05·In (9.1.1.3)
export const LIMITE_NEUTRO_A = 40; // Ipn ≤ 40 A (9.1.1.3)
export const FATOR_INRUSH = 8; // Im = 8·In, 0,1 s (9.1.2.1)
export const T_INRUSH_S = 0.1;
export const RTC_PRIMARIOS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];

/** Tabela 9.1.3.4 — ponto ANSI por Z%. */
const TABELA_ANSI = [
  { zMax: 4, fator: 25, t: 2 },
  { zMax: 5, fator: 20, t: 3 },
  { zMax: 6, fator: 16.6, t: 4 },
  { zMax: 7, fator: 14.3, t: 5 },
];

/** Disjuntor MT mínimo (4.4.3). */
const DISJUNTOR_MT: Record<string, { tensaoKV: number; correnteA: number; icckA: number; pararaiosKV: number; cabo: string }> = {
  "13.8": { tensaoKV: 15, correnteA: 350, icckA: 12.5, pararaiosKV: 12, cabo: "8,7/15 kV" },
  "22": { tensaoKV: 25, correnteA: 350, icckA: 12.5, pararaiosKV: 21, cabo: "15/25 kV" },
  "34.5": { tensaoKV: 35, correnteA: 600, icckA: 12.5, pararaiosKV: 30, cabo: "20/35 kV" },
};

/** Tabelas 12b/13b/14b — cabo Cu XLPE/EPR do ramal de entrada (mm² → kVA máx.). */
const CABO_RAMAL: Record<string, [number, number][]> = {
  "13.8": [[25, 3100], [35, 3700], [50, 4300], [70, 5400], [95, 6500], [120, 7300], [150, 8300], [240, 10800]],
  "22": [[50, 3300], [70, 4100], [95, 4900], [120, 5600], [150, 6300], [185, 7100], [240, 8200]],
  "34.5": [[50, 6000], [70, 7600], [95, 9100], [120, 10300], [150, 11700], [185, 13100], [240, 15300]],
};

/** Tabelas 16/17/18 — fusível da chave tripolar sob carga por trafo (kVA → A). */
const FUSIVEL_TRAFO: Record<string, Record<number, number>> = {
  "13.8": { 75: 6, 112.5: 8, 150: 10, 225: 16, 300: 25, 500: 40, 750: 63, 1000: 80 },
  "22": { 75: 4, 112.5: 6, 150: 8, 225: 10, 300: 16, 500: 25, 750: 32, 1000: 50 },
  "34.5": { 75: 4, 112.5: 4, 150: 6, 225: 8, 300: 10, 500: 16, 750: 25, 1000: 32 },
};

/** ND-5.31 Anexo 4 — reator de aterramento 13,8 kV (kVA máx → Ω, A regime, A 10 s). */
const REATOR_13_8 = [
  { kvaMax: 500, ohm: 50.8, iReg: 6.3, i10s: 126 },
  { kvaMax: 1000, ohm: 25.4, iReg: 12.6, i10s: 251 },
  { kvaMax: 2000, ohm: 12.7, iReg: 25.1, i10s: 502 },
  { kvaMax: 3000, ohm: 8.5, iReg: 37.7, i10s: 753 },
  { kvaMax: 4000, ohm: 7.1, iReg: 50.2, i10s: 1004 },
  { kvaMax: 5000, ohm: 5.7, iReg: 62.8, i10s: 1255 },
];

// ─── Curvas (IEC 60255-151 / IEEE C37.112) ────────────────────────────────────
export type CurvaId = "IEC_NI" | "IEC_VI" | "IEC_EI" | "IEC_LTI" | "IEEE_MI" | "IEEE_VI" | "IEEE_EI" | "DT";

export const CURVAS: Record<Exclude<CurvaId, "DT">, { nome: string; k: number; alfa: number; b: number }> = {
  IEC_NI: { nome: "IEC Normal Inversa (k=0,14; a=0,02)", k: 0.14, alfa: 0.02, b: 0 },
  IEC_VI: { nome: "IEC Muito Inversa (k=13,5; a=1)", k: 13.5, alfa: 1, b: 0 },
  IEC_EI: { nome: "IEC Extremamente Inversa (k=80; a=2)", k: 80, alfa: 2, b: 0 },
  IEC_LTI: { nome: "IEC Inversa Longa (k=120; a=1)", k: 120, alfa: 1, b: 0 },
  IEEE_MI: { nome: "IEEE Moderadamente Inversa", k: 0.0515, alfa: 0.02, b: 0.114 },
  IEEE_VI: { nome: "IEEE Muito Inversa", k: 19.61, alfa: 2, b: 0.491 },
  IEEE_EI: { nome: "IEEE Extremamente Inversa", k: 28.2, alfa: 2, b: 0.1217 },
};

/** Tempo de atuação (s) de uma curva inversa. Retorna Infinity abaixo do pickup. */
export function tempoCurva(curva: CurvaId, tms: number, i: number, ip: number, tDefinido = 0): number {
  const m = i / ip;
  if (m <= 1) return Infinity;
  if (curva === "DT") return tDefinido;
  const c = CURVAS[curva];
  return tms * (c.k / (Math.pow(m, c.alfa) - 1) + c.b);
}

/** Inverso: TMS que produz o tempo t na corrente i. */
export function tmsParaTempo(curva: Exclude<CurvaId, "DT">, t: number, i: number, ip: number): number {
  return t / tempoCurva(curva, 1, i, ip);
}

// ─── Tipos de entrada/saída ──────────────────────────────────────────────────
export interface Trafo {
  id: string;
  kva: number;
  zPercent: number;
  isolacao: "OLEO" | "SECO";
  /** Im informado pelo fabricante (A) — obrigatório para > 2000 kVA. */
  imFabricanteA?: number;
}

export interface Motor {
  nome: string;
  /** Corrente de partida referida à MT (A). */
  correntePartidaA: number;
  tempoPartidaS: number;
}

export interface Geracao {
  potenciaKW: number;
  tipo: "INVERSOR" | "SINCRONO" | "ASSINCRONO";
  /** true = GD com injeção (ND-5.31); false = paralelismo permanente sem injeção. */
  injecao: boolean;
}

export interface EntradaEstudo {
  tensaoKV: number;
  demandaKW: number;
  trafos: Trafo[];
  iccTrifasicoA: number;
  iccFaseTerraA?: number;
  /** Menor curto no ponto (default = menor entre 3F e FT). */
  iccMinimoA?: number;
  geracao?: Geracao;
  motores?: Motor[];
  /** Ajustes opcionais (override do projetista) */
  rtcPrimarioA?: number;
  tcSecundarioA?: 1 | 5;
  curvaFase?: CurvaId;
  tmsFase?: number;
  tempoNeutroS?: number; // 51N consumo, 1–3 s
  fatorInstantaneo?: number; // 1,00–1,05
  curvaInjecao?: CurvaId;
  tmsInjecao?: number;
  tempoNeutroInjecaoS?: number; // 5–9 s
  compartilhada?: boolean;
  usoExterno?: boolean;
}

export type Severidade = "OK" | "ATENCAO" | "INTERVENCAO";

export interface Verificacao {
  id: string;
  descricao: string;
  valor: string;
  limite: string;
  status: Severidade;
  ref: string;
}

export interface PontoTrafo {
  trafo: Trafo;
  inA: number;
  ansiFaseA: number;
  ansiNeutroA: number;
  tAnsiS: number;
}

export interface CenarioProtecao {
  id: "CONSUMO" | "INJECAO";
  titulo: string;
  funcaoFase: string; // "50/51" | "67"
  funcaoNeutro: string; // "50N/51N" | "67N"
  potenciaBaseKW: number;
  inA: number;
  ipFaseA: number;
  curvaFase: CurvaId;
  tmsFase: number;
  instFaseA: number | null;
  ipNeutroA: number;
  tempoNeutroS: number;
  instNeutroA: number | null;
  /** Direção quando direcional (67): sentido do fluxo que a função enxerga. */
  direcao?: "CONSUMO" | "INJECAO";
  verificacoes: Verificacao[];
  justificativas: string[];
}

export interface FuncaoAdicional {
  ansi: string;
  descricao: string;
  ajuste: string;
  valor: number;
  unidade: "kW" | "pu" | "Hz" | "Hz/s" | "s";
  tempoS: number | null;
  pu?: number; // 32 em pu de Sn
  ref: string;
}

export interface TcProtecao {
  primarioA: number;
  secundarioA: 1 | 5;
  rtc: number;
  classe: string;
  criterios: string[];
}

export interface DimensionamentoSE {
  tiposPermitidos: { tipo: string; obs: string }[];
  recomendado: string;
  disjuntor: string;
  caboRamal: string;
  tpProtecao: string;
  tcProtecao: string;
  nobreak: string;
  pararaios: string;
  hastesMin: number;
  resistenciaMalha: string;
  ventilacao: string;
  fusiveisTrafo: { trafo: string; fusivelA: number | null }[];
  reatorAterramento?: string;
  alertas: string[];
}

export interface ResultadoEstudo {
  entrada: EntradaEstudo;
  kvaTotal: number;
  imA: number;
  pontosTrafo: PontoTrafo[];
  iccMinA: number;
  tc: TcProtecao;
  snKVA: number; // base para funções de potência = √3·V·Iprim TC
  cenarios: CenarioProtecao[];
  funcoesAdicionais: FuncaoAdicional[];
  dimensionamento: DimensionamentoSE;
  alertas: string[];
}

// ─── Cálculos básicos ────────────────────────────────────────────────────────
const r2 = (x: number) => Math.round(x * 100) / 100;
const fmt = (x: number, d = 2) => x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const correnteNominal = (kW: number, kV: number, fp = FP_REFERENCIA) => kW / (RAIZ3_CEMIG * kV * fp);
export const correnteTrafo = (kva: number, kV: number) => kva / (RAIZ3_CEMIG * kV);

export function pontoAnsi(trafo: Trafo, kV: number): PontoTrafo {
  const inA = correnteTrafo(trafo.kva, kV);
  const linha = TABELA_ANSI.find((l) => trafo.zPercent <= l.zMax);
  const fator = linha ? linha.fator : 100 / trafo.zPercent;
  const tAnsiS = linha ? linha.t : 5;
  const ansiFaseA = fator * inA;
  return { trafo, inA, ansiFaseA, ansiNeutroA: 0.58 * ansiFaseA, tAnsiS };
}

/** Im = 8·In(maior) + Σ In(demais) (9.1.2.4). Usa Im do fabricante se informado. */
export function correnteMagnetizacao(trafos: Trafo[], kV: number): number {
  if (!trafos.length) return 0;
  const ims = trafos.map((t) => t.imFabricanteA ?? FATOR_INRUSH * correnteTrafo(t.kva, kV));
  const ins = trafos.map((t) => correnteTrafo(t.kva, kV));
  const iMaior = ims.indexOf(Math.max(...ims));
  return ims[iMaior] + ins.reduce((s, x, i) => (i === iMaior ? s : s + x), 0);
}

/** Seleciona o menor primário de TC que atende 9.1.4.2 (50×Icc, 20×I50) e avisa se Ip < 10%. */
export function selecionarTc(iccMaxA: number, instMaxA: number, ipMinA: number, secundario: 1 | 5 = 5, forcado?: number): TcProtecao {
  const minPorIcc = iccMaxA / 50;
  const minPorInst = instMaxA / 20;
  const primarioA = forcado ?? (RTC_PRIMARIOS.find((p) => p >= minPorIcc && p >= minPorInst) ?? RTC_PRIMARIOS[RTC_PRIMARIOS.length - 1]);
  return {
    primarioA,
    secundarioA: secundario,
    rtc: primarioA / secundario,
    classe: "10P20 · 12,5 VA (mín. ND-5.3 4.4.11) — verificar saturação com a carga real",
    criterios: [
      `Icc máx / 50 = ${fmt(minPorIcc, 1)} A ≤ ${primarioA} A (9.1.4.2.2)`,
      `I instantâneo / 20 = ${fmt(minPorInst, 1)} A ≤ ${primarioA} A (9.1.4.2.3)`,
      `10% do primário = ${fmt(0.1 * primarioA, 1)} A < menor partida ${fmt(ipMinA, 1)} A (9.1.4.2.4)`,
    ],
  };
}

/** Menor TMS (passo 0,01) com t(Im) ≥ 0,1 s × 1,2 de margem, mín. 0,05. */
function tmsMinimo(curva: CurvaId, imA: number, ipA: number): number {
  if (curva === "DT" || imA <= ipA) return 0.05;
  const lo = tmsParaTempo(curva, T_INRUSH_S * 1.2, imA, ipA);
  return Math.max(0.05, Math.ceil(lo * 100) / 100);
}

function status(ok: boolean, grave = true): Severidade {
  return ok ? "OK" : grave ? "INTERVENCAO" : "ATENCAO";
}

// ─── Cenários ────────────────────────────────────────────────────────────────
interface ContextoCenario {
  kV: number;
  imA: number;
  pontos: PontoTrafo[];
  iccMinA: number;
  iccMaxA: number;
  tc: TcProtecao;
  motores: Motor[];
}

function verificarCenario(c: CenarioProtecao, ctx: ContextoCenario): Verificacao[] {
  const v: Verificacao[] = [];
  const menor = ctx.pontos.reduce((a, b) => (b.ansiFaseA < a.ansiFaseA ? b : a), ctx.pontos[0]);
  const tAt = (i: number) => tempoCurva(c.curvaFase, c.tmsFase, i, c.ipFaseA);
  v.push({ id: "ip_tc", descricao: "Partida de fase > 10% do primário do TC", valor: `${fmt(c.ipFaseA)} A`, limite: `> ${fmt(0.1 * ctx.tc.primarioA)} A`, status: status(c.ipFaseA > 0.1 * ctx.tc.primarioA - 1e-9), ref: "ND-5.3 9.1.4.2.4" });
  v.push({ id: "ipn", descricao: "Partida de neutro ≤ Ip/3 e ≤ 40 A", valor: `${fmt(c.ipNeutroA)} A`, limite: `≤ ${fmt(Math.min(c.ipFaseA / 3, LIMITE_NEUTRO_A))} A`, status: status(c.ipNeutroA <= Math.min(c.ipFaseA / 3, LIMITE_NEUTRO_A) + 0.05, false), ref: "ND-5.3 9.1.6.11" });
  if (c.ipNeutroA < 0.1 * ctx.tc.primarioA) {
    v.push({ id: "ipn_tc", descricao: "Partida de neutro abaixo de 10% do TC — usar o mínimo do relé e justificar", valor: `${fmt(c.ipNeutroA)} A`, limite: `≥ ${fmt(0.1 * ctx.tc.primarioA)} A (exatidão)`, status: "ATENCAO", ref: "ND-5.3 9.1.4.2.4 / ND-5.31 Anexo 6" });
  }
  if (c.id === "CONSUMO") {
    const tIm = tAt(ctx.imA);
    v.push({ id: "inrush", descricao: "Curva não atua no inrush (Im @ 0,1 s)", valor: `t(${fmt(ctx.imA, 1)} A) = ${fmt(tIm, 3)} s`, limite: "> 0,100 s", status: status(tIm > T_INRUSH_S), ref: "ND-5.3 9.1.2.3" });
    v.push({ id: "tn", descricao: "51N em tempo definido entre 1 e 3 s", valor: `${fmt(c.tempoNeutroS)} s`, limite: "1 – 3 s", status: status(c.tempoNeutroS >= 1 && c.tempoNeutroS <= 3), ref: c.funcaoNeutro === "67N" ? "ND-5.31 Anexo 6" : "ND-5.3 9.1.6.11" });
    if (c.instFaseA !== null) {
      v.push({ id: "i50_im", descricao: "Instantâneo entre Im e 1,05·Im", valor: `${fmt(c.instFaseA, 1)} A`, limite: `${fmt(ctx.imA, 1)} – ${fmt(1.05 * ctx.imA, 1)} A`, status: status(c.instFaseA >= ctx.imA - 1e-6 && c.instFaseA <= 1.05 * ctx.imA + 0.05), ref: "ND-5.3 9.1.6.10" });
      v.push({ id: "i50_icc", descricao: "Instantâneo abaixo do menor curto-circuito", valor: `${fmt(c.instFaseA, 1)} A`, limite: `< ${fmt(ctx.iccMinA, 0)} A`, status: status(c.instFaseA < ctx.iccMinA), ref: "ND-5.3 9.1.6.10" });
      v.push({ id: "i50_ansi", descricao: "Instantâneo abaixo do ANSI do menor trafo", valor: `${fmt(c.instFaseA, 1)} A`, limite: `< ${fmt(menor.ansiFaseA, 1)} A`, status: status(c.instFaseA < menor.ansiFaseA), ref: "ND-5.3 9.1.6.10" });
      v.push({ id: "i50_tc", descricao: "Instantâneo ≤ 20× primário do TC", valor: `${fmt(c.instFaseA, 1)} A`, limite: `≤ ${fmt(20 * ctx.tc.primarioA, 0)} A`, status: status(c.instFaseA <= 20 * ctx.tc.primarioA), ref: "ND-5.3 9.1.4.2.3" });
    }
    for (const p of ctx.pontos) {
      const tA = c.instFaseA !== null && p.ansiFaseA >= c.instFaseA ? 0.05 : tAt(p.ansiFaseA);
      v.push({ id: `ansi_${p.trafo.id}`, descricao: `Curva de fase abaixo do ANSI do trafo ${p.trafo.id} (${p.trafo.kva} kVA)`, valor: `t(${fmt(p.ansiFaseA, 1)} A) = ${fmt(tA, 3)} s`, limite: `< ${p.tAnsiS} s`, status: status(tA < p.tAnsiS), ref: "ND-5.3 9.1.3.3" });
      const tN = p.ansiNeutroA > c.ipNeutroA ? (c.instNeutroA !== null && p.ansiNeutroA >= c.instNeutroA ? 0.05 : c.tempoNeutroS) : Infinity;
      v.push({ id: `ansiN_${p.trafo.id}`, descricao: `Neutro abaixo do ANSI de neutro do trafo ${p.trafo.id}`, valor: `${Number.isFinite(tN) ? fmt(tN, 2) + " s" : "não sensibiliza"}`, limite: `< ${p.tAnsiS} s @ ${fmt(p.ansiNeutroA, 1)} A`, status: status(tN < p.tAnsiS), ref: "ND-5.3 9.1.3.3" });
    }
    for (const m of ctx.motores) {
      const t = c.instFaseA !== null && m.correntePartidaA >= c.instFaseA ? 0 : tAt(m.correntePartidaA);
      v.push({ id: `motor_${m.nome}`, descricao: `Partida do motor ${m.nome} não atua a proteção`, valor: `t(${fmt(m.correntePartidaA, 1)} A) = ${Number.isFinite(t) ? fmt(t, 2) + " s" : "∞"}`, limite: `> ${fmt(m.tempoPartidaS, 1)} s`, status: status(t > m.tempoPartidaS, false), ref: "ND-5.3 9.1.6.17" });
    }
  } else {
    v.push({ id: "tn_inj", descricao: "67N injeção em tempo definido entre 5 e 9 s", valor: `${fmt(c.tempoNeutroS)} s`, limite: "5 – 9 s", status: status(c.tempoNeutroS >= 5 && c.tempoNeutroS <= 9), ref: "ND-5.31 Anexo 6" });
    v.push({ id: "inst_inj", descricao: "Instantâneos desativados no sentido da rede", valor: c.instFaseA === null ? "Desativado" : "Ativo", limite: "Desativado (recomendado)", status: status(c.instFaseA === null, false), ref: "ND-5.31 Anexo 6" });
  }
  v.push({ id: "icc_tc", descricao: "Icc máximo ≤ 50× primário do TC", valor: `${fmt(ctx.iccMaxA, 0)} A`, limite: `≤ ${fmt(50 * ctx.tc.primarioA, 0)} A`, status: status(ctx.iccMaxA <= 50 * ctx.tc.primarioA), ref: "ND-5.3 9.1.4.2.2" });
  return v;
}

function montarCenarioConsumo(e: EntradaEstudo, ctx: ContextoCenario, direcional: boolean): CenarioProtecao {
  const inA = correnteNominal(e.demandaKW, e.tensaoKV);
  const ipCalc = FATOR_PARTIDA * inA;
  const just: string[] = [];
  const minTc = 0.1 * ctx.tc.primarioA;
  let ipFaseA = ipCalc;
  if (ipCalc <= minTc) {
    ipFaseA = minTc;
    just.push(`Partida calculada (${fmt(ipCalc)} A) abaixo de 10% do primário do TC: adotado o mínimo ${fmt(minTc)} A pela resolução do TC/relé (ND-5.31 Anexo 6 — carga nula ou muito pequena).`);
  }
  const curvaFase = e.curvaFase ?? "IEC_EI";
  const tmsFase = e.tmsFase ?? tmsMinimo(curvaFase, ctx.imA, ipFaseA);
  const fator = Math.min(1.05, Math.max(1.0, e.fatorInstantaneo ?? 1.05));
  const instFaseA = fator * ctx.imA;
  const ipNeutroA = Math.min(ipFaseA / 3, LIMITE_NEUTRO_A);
  just.push(`Curva ${CURVAS[curvaFase as Exclude<CurvaId, "DT">]?.nome ?? curvaFase} com o menor dial que não atua na magnetização (t(Im) ≥ 0,12 s) — ND-5.3 9.1.6.2/9.1.6.8.`);
  just.push(`Instantâneo = ${fmt(fator)} × Im = ${fmt(instFaseA, 1)} A (entre Im e 1,05·Im) — ND-5.3 9.1.6.10.`);
  const c: CenarioProtecao = {
    id: "CONSUMO",
    titulo: direcional ? "Sentido consumo (rede → acessante)" : "Proteção geral de sobrecorrente",
    funcaoFase: direcional ? "67" : "50/51",
    funcaoNeutro: direcional ? "67N" : "50N/51N",
    potenciaBaseKW: e.demandaKW,
    inA,
    ipFaseA,
    curvaFase,
    tmsFase,
    instFaseA,
    ipNeutroA,
    tempoNeutroS: e.tempoNeutroS ?? 2,
    instNeutroA: instFaseA / 3,
    direcao: direcional ? "CONSUMO" : undefined,
    verificacoes: [],
    justificativas: just,
  };
  c.verificacoes = verificarCenario(c, ctx);
  return c;
}

function montarCenarioInjecao(e: EntradaEstudo, g: Geracao, ctx: ContextoCenario): CenarioProtecao {
  const inA = correnteNominal(g.potenciaKW, e.tensaoKV);
  const ipFaseA = Math.max(FATOR_PARTIDA * inA, 0.1 * ctx.tc.primarioA);
  const ipNeutroA = Math.min(ipFaseA / 3, LIMITE_NEUTRO_A);
  const curvaFase = e.curvaInjecao ?? "IEC_EI";
  const c: CenarioProtecao = {
    id: "INJECAO",
    titulo: "Sentido injeção (acessante → rede)",
    funcaoFase: "67",
    funcaoNeutro: "67N",
    potenciaBaseKW: g.potenciaKW,
    inA,
    ipFaseA,
    curvaFase,
    tmsFase: e.tmsInjecao ?? 0.2,
    instFaseA: null,
    ipNeutroA,
    tempoNeutroS: e.tempoNeutroInjecaoS ?? 5,
    instNeutroA: null,
    direcao: "INJECAO",
    verificacoes: [],
    justificativas: [
      `In = ${fmt(g.potenciaKW, 0)} kW / (1,73 × ${fmt(e.tensaoKV, 1)} × 0,92) = ${fmt(inA)} A; Ip = 1,05 × In — ND-5.31 Anexo 6.`,
      "Curva IEC EI ou MI com dial e pickup mínimos que coordenem com a rede; instantâneos de fase e neutro desativados (recomendação ND-5.31).",
      "67N em tempo definido de 5 a 9 s, pickup ≤ Ip/3 e ≤ 40 A.",
    ],
  };
  c.verificacoes = verificarCenario(c, ctx);
  return c;
}

function funcoesGeracao(e: EntradaEstudo, g: Geracao, snKVA: number): FuncaoAdicional[] {
  const f: FuncaoAdicional[] = [];
  const pu = (kw: number) => Math.round((kw / snKVA) * 100) / 100;
  if (g.injecao) {
    const pInj = FATOR_PARTIDA * g.potenciaKW;
    const pCons = FATOR_PARTIDA * e.demandaKW;
    f.push({ ansi: "32 (injeção)", descricao: "Direcional de potência — acessante → rede", ajuste: `1,05 × ${fmt(g.potenciaKW, 0)} kW`, valor: r2(pInj), unidade: "kW", tempoS: 15, pu: pu(pInj), ref: "ND-5.31 Tabela 4" });
    f.push({ ansi: "32 (consumo)", descricao: "Direcional de potência — rede → acessante", ajuste: `1,05 × ${fmt(e.demandaKW, 0)} kW`, valor: r2(pCons), unidade: "kW", tempoS: 15, pu: Math.max(0.05, pu(pCons)), ref: "ND-5.31 Tabela 4" });
  } else {
    const p32 = 0.05 * g.potenciaKW;
    f.push({ ansi: "32", descricao: "Potência inversa — paralelismo permanente sem injeção", ajuste: `5% × ${fmt(g.potenciaKW, 0)} kW`, valor: r2(p32), unidade: "kW", tempoS: 5, pu: Math.max(0.05, pu(p32)), ref: "ND-5.31 Tabela 4 / ND-5.3 9.1.6.13" });
  }
  f.push({ ansi: "27-1", descricao: "Subtensão (trifásico)", ajuste: "0,80 pu", valor: 0.8, unidade: "pu", tempoS: 3, ref: "ND-5.31 Tabela 4" });
  f.push({ ansi: "27-2", descricao: "Subtensão (por fase)", ajuste: "0,50 pu", valor: 0.5, unidade: "pu", tempoS: 1, ref: "ND-5.31 Tabela 4" });
  f.push({ ansi: "59-1", descricao: "Sobretensão", ajuste: "1,10 pu", valor: 1.1, unidade: "pu", tempoS: 3, ref: "ND-5.31 Tabela 4" });
  f.push({ ansi: "59-2", descricao: "Sobretensão", ajuste: "1,18 pu", valor: 1.18, unidade: "pu", tempoS: 0.5, ref: "ND-5.31 Tabela 4" });
  if (g.tipo !== "INVERSOR") f.push({ ansi: "81U-1", descricao: "Subfrequência (conexão sem inversor)", ajuste: "58,5 Hz", valor: 58.5, unidade: "Hz", tempoS: 20.5, ref: "ND-5.31 Tabela 4" });
  f.push({ ansi: "81U-2", descricao: "Subfrequência", ajuste: "57,4 Hz", valor: 57.4, unidade: "Hz", tempoS: 5.5, ref: "ND-5.31 Tabela 4" });
  f.push({ ansi: "81U-3", descricao: "Subfrequência", ajuste: "56,9 Hz", valor: 56.9, unidade: "Hz", tempoS: 0.2, ref: "ND-5.31 Tabela 4" });
  f.push({ ansi: "81O-1", descricao: "Sobrefrequência", ajuste: "62,6 Hz", valor: 62.6, unidade: "Hz", tempoS: 10.5, ref: "ND-5.31 Tabela 4" });
  f.push({ ansi: "81O-2", descricao: "Sobrefrequência", ajuste: "63,1 Hz", valor: 63.1, unidade: "Hz", tempoS: 0.2, ref: "ND-5.31 Tabela 4" });
  if (g.tipo !== "INVERSOR") f.push({ ansi: "25", descricao: "Verificação de sincronismo", ajuste: "≤ 10° · ΔV ≤ 10% · Δf ≤ 0,3 Hz", valor: 10, unidade: "pu", tempoS: null, ref: "ND-5.31 Tabela 4" });
  return f;
}

// ─── Dimensionamento físico da SE ────────────────────────────────────────────
export function dimensionarSubestacao(e: EntradaEstudo, kvaTotal: number, tc: TcProtecao): DimensionamentoSE {
  const kv = String(e.tensaoKV);
  const alertas: string[] = [];
  const disj = DISJUNTOR_MT[kv] ?? DISJUNTOR_MT["13.8"];
  const d = e.demandaKW;
  const tipos: { tipo: string; obs: string }[] = [];
  if (d > 2500) alertas.push("Demanda > 2500 kW: atendimento objeto de avaliação da CEMIG (ND-5.3 2.3.2).");
  tipos.push({ tipo: "SE nº 4 — Blindada metálica", obs: `Até 2500 kW · modelo do PEC-11 · uso ${e.usoExterno ? "externo" : "interno"}${e.compartilhada ? " · compartilhada" : ""}` });
  if (e.tensaoKV !== 13.8) tipos.push({ tipo: "SE nº 2 — Alvenaria", obs: "Permitida em 22/34,5 kV (vedada em 13,8 kV desde 03/07/2023)" });
  if (d <= 300 && !e.compartilhada) {
    if (e.trafos.length === 1 && e.trafos[0].kva >= 75 && e.trafos[0].kva <= 300) tipos.push({ tipo: "SE nº 5 — Alvenaria c/ trafo", obs: "Até 300 kW, 1 trafo 75–300 kVA, chave fusível MT + disjuntor BT (Tab. 19)" });
    tipos.push({ tipo: "SE nº 8 — SEBS", obs: "Até 300 kW, chave fusível MT + disjuntor BT (Tab. 19)" });
  }
  if (e.tensaoKV === 13.8 && e.compartilhada) alertas.push("SE nº 2 compartilhada vedada em 13,8 kV desde 01/01/2024 — usar SE nº 4 compartilhada.");
  if (d > 300) alertas.push("Demanda > 300 kW: proteção por disjuntor em MT obrigatória (ND-5.3 2.4.1.2).");
  if (kvaTotal < 75) alertas.push("Capacidade de transformação mínima 75 kVA (ND-5.3 4.3.7).");

  const kvaCabo = Math.max(kvaTotal, (d / FP_REFERENCIA) * FATOR_PARTIDA);
  const cabo = (CABO_RAMAL[kv] ?? CABO_RAMAL["13.8"]).find(([, k]) => k >= kvaCabo);
  const hastesMin = kvaTotal <= 150 ? 4 : kvaTotal < 500 ? 9 : 12;
  const fusiveis = e.trafos.map((t) => ({ trafo: `${t.id} (${t.kva} kVA)`, fusivelA: FUSIVEL_TRAFO[kv]?.[t.kva] ?? null }));
  if (e.trafos.length > 1) alertas.push("Mais de um transformador: proteção primária individual + chave tripolar sob carga por trafo, plotadas no coordenograma (ND-5.3 4.4.12).");
  if (e.trafos.some((t) => t.kva > 2000 && !t.imFabricanteA)) alertas.push("Trafo > 2000 kVA: informar Im e duração do fabricante (ND-5.3 9.1.2.1).");

  let reatorAterramento: string | undefined;
  if (e.geracao?.injecao && e.geracao.potenciaKW > 300) {
    const base = Math.max(kvaTotal, e.geracao.potenciaKW);
    const r = e.tensaoKV === 13.8 ? REATOR_13_8.find((x) => base <= x.kvaMax) : undefined;
    reatorAterramento = r
      ? `Trafo de acoplamento Yg (MT) aterrado por reator ${fmt(r.ohm, 1)} Ω · ${fmt(r.iReg, 1)} A regime · ${r.i10s} A/10 s (ND-5.31 Anexo 4) — ou Δ + trafo de aterramento`
      : "GD > 300 kW: referência de terra no lado MT (reator/zig-zag) conforme ND-5.31 Anexo 4 (tabelas 22/34,5 kV)";
  }

  return {
    tiposPermitidos: tipos,
    recomendado: tipos[0].tipo,
    disjuntor: `Tripolar a vácuo/SF6, ${disj.tensaoKV} kV, ≥ ${disj.correnteA} A, ≥ ${disj.icckA} kA, bobina de abertura + contato NA em série (ND-5.3 4.4.3)`,
    caboRamal: cabo ? `Cu XLPE/EPR 90 °C ${disj.cabo}, 3×1×${cabo[0]} mm² (≤ ${cabo[1]} kVA) + neutro Cu nu 70 mm², eletroduto Ø100 mm` : "Consultar CEMIG (acima da Tabela 12b)",
    tpProtecao: `${e.geracao ? 3 : 1} TP ${fmt(e.tensaoKV, 1)}/√3 kV – 115/√3 V (ou 115 V), 0,6P75, 400 VA térmica, secundário protegido por disjuntor (ND-5.3 4.12.14)`,
    tcProtecao: `3 TC ${tc.primarioA}-${tc.secundarioA} A, ${tc.classe}`,
    nobreak: "Senoidal ≥ 600 VA, autonomia ≥ 2 h @ 30 VA, saída = secundário do TP, comutação automática TP↔nobreak + trip capacitivo (ND-5.3 4.12.13)",
    pararaios: `${disj.pararaiosKV} kV / 10 kA, ZnO polimérico com desligador — no poste da derivação, nunca dentro do cubículo`,
    hastesMin,
    resistenciaMalha: "≤ 10 Ω (preferencial) — valor previsto deve constar no projeto (ND-5.3 4.7.9)",
    ventilacao: `Natural ≥ ${fmt(Math.max(1, kvaTotal / 300), 2)} m² (1 m²/300 kVA) ou forçada ≥ ${fmt((kvaTotal / 500) * 2500, 0)} m³/h (ND-5.3 4.12.18)`,
    fusiveisTrafo: fusiveis,
    reatorAterramento,
    alertas,
  };
}

// ─── Estudo completo ─────────────────────────────────────────────────────────
export function calcularEstudo(e: EntradaEstudo): ResultadoEstudo {
  if (!(e.tensaoKV > 0) || !(e.demandaKW > 0) || !e.trafos.length || !(e.iccTrifasicoA > 0)) {
    throw new Error("Informe tensão, demanda, ao menos um transformador e o curto-circuito trifásico.");
  }
  const kV = e.tensaoKV;
  const kvaTotal = e.trafos.reduce((s, t) => s + t.kva, 0);
  const imA = correnteMagnetizacao(e.trafos, kV);
  const pontosTrafo = e.trafos.map((t) => pontoAnsi(t, kV));
  const iccMaxA = Math.max(e.iccTrifasicoA, e.iccFaseTerraA ?? 0);
  const iccMinA = e.iccMinimoA ?? Math.min(e.iccTrifasicoA, e.iccFaseTerraA ?? e.iccTrifasicoA);
  const fatorInst = Math.min(1.05, Math.max(1.0, e.fatorInstantaneo ?? 1.05));
  const ipConsumo = FATOR_PARTIDA * correnteNominal(e.demandaKW, kV);
  const tc = selecionarTc(iccMaxA, fatorInst * imA, ipConsumo, e.tcSecundarioA ?? 5, e.rtcPrimarioA);
  const snKVA = RAIZ3_CEMIG * kV * tc.primarioA;
  const ctx: ContextoCenario = { kV, imA, pontos: pontosTrafo, iccMinA, iccMaxA, tc, motores: e.motores ?? [] };

  const g = e.geracao && e.geracao.potenciaKW > 0 ? e.geracao : undefined;
  const direcional = !!g?.injecao;
  const cenarios = [montarCenarioConsumo(e, ctx, direcional)];
  if (g?.injecao) cenarios.push(montarCenarioInjecao(e, g, ctx));

  const alertas: string[] = [];
  if (!e.iccFaseTerraA) alertas.push("Curto fase-terra não informado — solicitar à CEMIG (9.1.4.1).");
  if (g?.injecao && g.potenciaKW > e.demandaKW * 10) alertas.push("Verifique: potência de geração limitada à demanda contratada no grupo A (ND-5.31).");
  if (g && !g.injecao) alertas.push("Paralelismo permanente sem injeção: painel de interface + painel interno (ND-5.31 Anexo 3).");
  if (ipConsumo <= 0.1 * tc.primarioA) alertas.push("Demanda baixa para o TC exigido pelo curto: partida ajustada em 10% do primário do TC (justificar no memorial).");

  return {
    entrada: e,
    kvaTotal,
    imA,
    pontosTrafo,
    iccMinA,
    tc,
    snKVA,
    cenarios,
    funcoesAdicionais: g ? funcoesGeracao(e, g, snKVA) : [],
    dimensionamento: dimensionarSubestacao(e, kvaTotal, tc),
    alertas,
  };
}

/** Status global (semáforo) do estudo. */
export function statusGlobal(r: ResultadoEstudo): Severidade {
  const todos = r.cenarios.flatMap((c) => c.verificacoes.map((v) => v.status));
  if (todos.includes("INTERVENCAO")) return "INTERVENCAO";
  if (todos.includes("ATENCAO") || r.alertas.length) return "ATENCAO";
  return "OK";
}

export { fmt as formatarNumero };
