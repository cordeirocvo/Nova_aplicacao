/**
 * Gerador do memorial (PDF A4, pronto para protocolo CEMIG) — jsPDF.
 * Estrutura: capa/selo (Anexo C) · memorial descritivo · memória de cálculo · verificações ·
 * parametrização do relé · coordenogramas · unifilar · notas obrigatórias.
 */
import { jsPDF } from "jspdf";
import { ResultadoEstudo, CURVAS, CurvaId, formatarNumero as fmt, statusGlobal } from "./engine";
import { Traducao } from "./reles";
import { Desenho, coordenograma, unifilarSE4 } from "./desenho";

export interface DadosProjeto {
  proprietario: string;
  cpfCnpj: string;
  telefone?: string;
  empreendimento: string;
  finalidade: string;
  endereco: string;
  cidade: string;
  coordenadas?: string;
  rtNome: string;
  rtCrea: string;
  artNumero?: string;
  dataProjeto: string;
  cargaInstaladaKW?: number;
  fabricanteSE?: string;
  modeloSE?: string;
  iacKA?: number;
  versaoND53?: string;
}

/** Fontes padrão do PDF usam WinAnsi: troca símbolos fora do Latin-1. */
export const pdfTxt = (s: string) =>
  s.replace(/√3/g, "1,73").replace(/√/g, "raiz ").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/Ω/g, " ohm").replace(/[●]/g, "*").replace(/[○]/g, "o")
    .replace(/→/g, "->").replace(/Δ/g, "delta ").replace(/φ/g, "f").replace(/✓/g, "OK").replace(/[✗❌]/g, "X").replace(/≈/g, "~").replace(/[^\x00-\xFF—–·×°²³µ]/g, "");

const NAVY: [number, number, number] = [10, 25, 47];
const LARANJA: [number, number, number] = [228, 83, 24];
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Desenha um `Desenho` (mm) no PDF com origem (x0, y0) e escala. */
export function desenharNoPdf(doc: jsPDF, d: Desenho, x0: number, y0: number, esc: number) {
  for (const it of d.itens) {
    if (it.tipo === "linha") {
      doc.setDrawColor(...hex(it.cor));
      doc.setLineWidth((it.espessura ?? 0.3) * esc);
      doc.setLineDashPattern(it.tracejado ? [2 * esc, 1.2 * esc] : [], 0);
      for (let k = 1; k < it.pts.length; k++) doc.line(x0 + it.pts[k - 1][0] * esc, y0 + it.pts[k - 1][1] * esc, x0 + it.pts[k][0] * esc, y0 + it.pts[k][1] * esc);
    } else if (it.tipo === "texto") {
      doc.setTextColor(...hex(it.cor));
      doc.setFont("helvetica", it.negrito ? "bold" : "normal");
      doc.setFontSize((it.tamanho * esc) / 0.3528);
      doc.text(pdfTxt(it.texto), x0 + it.x * esc, y0 + it.y * esc, { align: it.ancora === "middle" ? "center" : it.ancora === "end" ? "right" : "left" });
    } else if (it.tipo === "circulo") {
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(...hex(it.cor));
      doc.setFillColor(...(it.preenchido ? hex(it.cor) : ([255, 255, 255] as [number, number, number])));
      doc.setLineWidth(0.3 * esc);
      doc.circle(x0 + it.x * esc, y0 + it.y * esc, it.r * esc, "FD");
    } else {
      doc.setDrawColor(...hex(it.cor));
      doc.setLineWidth(0.35 * esc);
      doc.setLineDashPattern(it.tracejado ? [2 * esc, 1.2 * esc] : [], 0);
      doc.rect(x0 + it.x * esc, y0 + it.y * esc, it.w * esc, it.h * esc, "S");
    }
  }
  doc.setLineDashPattern([], 0);
}

class Pagina {
  y = 20;
  constructor(public doc: jsPDF, private rodape: string) {}
  get w() { return this.doc.internal.pageSize.getWidth(); }
  get h() { return this.doc.internal.pageSize.getHeight(); }
  nova(orientacao: "p" | "l" = "p") { this.doc.addPage("a4", orientacao); this.y = 20; this.moldura(); }
  moldura() {
    const { doc } = this;
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.setLineDashPattern([], 0);
    doc.rect(10, 10, this.w - 20, this.h - 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text(pdfTxt(this.rodape), 12, this.h - 12.5);
    doc.text(`Folha ${doc.getNumberOfPages()}`, this.w - 12, this.h - 12.5, { align: "right" });
  }
  garantir(alt: number): boolean {
    if (this.y + alt > this.h - 18) { this.nova(this.w > this.h ? "l" : "p"); return true; }
    return false;
  }
  titulo(t: string) {
    this.y += 3;
    this.garantir(12);
    const { doc } = this;
    doc.setFillColor(...NAVY); doc.rect(14, this.y - 4.5, this.w - 28, 7, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(pdfTxt(t), 16, this.y);
    this.y += 7;
  }
  par(t: string, tam = 9, negrito = false) {
    const { doc } = this;
    doc.setFont("helvetica", negrito ? "bold" : "normal"); doc.setFontSize(tam); doc.setTextColor(...NAVY);
    const linhas = doc.splitTextToSize(pdfTxt(t), this.w - 32) as string[];
    for (const l of linhas) { this.garantir(5); doc.text(l, 16, this.y); this.y += tam * 0.45; }
    this.y += 1.2;
  }
  tabela(cab: string[], larguras: number[], linhas: string[][], destaque?: (row: string[]) => [number, number, number] | null) {
    const { doc } = this;
    const total = larguras.reduce((a, b) => a + b, 0);
    const esc = (this.w - 28) / total;
    const ws = larguras.map((l) => l * esc);
    const desenharLinha = (cells: string[], header: boolean) => {
      doc.setFont("helvetica", header ? "bold" : "normal"); doc.setFontSize(7.5);
      const quebras = cells.map((c, i) => doc.splitTextToSize(pdfTxt(c), ws[i] - 2) as string[]);
      const alt = Math.max(...quebras.map((q) => q.length)) * 3.3 + 2;
      if (this.garantir(alt) && !header) { desenharLinha(cab, true); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); }
      let x = 14;
      const cor = header ? NAVY : destaque?.(cells) ?? null;
      if (header) { doc.setFillColor(...NAVY); doc.rect(14, this.y, this.w - 28, alt, "F"); }
      else if (cor) { doc.setFillColor(...cor); doc.rect(14, this.y, this.w - 28, alt, "F"); }
      quebras.forEach((q, i) => {
        doc.setTextColor(...(header ? ([255, 255, 255] as [number, number, number]) : NAVY));
        doc.text(q, x + 1, this.y + 3.4);
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.1); doc.rect(x, this.y, ws[i], alt);
        x += ws[i];
      });
      this.y += alt;
    };
    desenharLinha(cab, true);
    linhas.forEach((l) => desenharLinha(l, false));
    this.y += 3;
  }
}

const COR_STATUS: Record<string, [number, number, number] | null> = { OK: null, ATENCAO: [254, 243, 199], INTERVENCAO: [254, 226, 226] };

export function gerarMemorialPdf(r: ResultadoEstudo, t: Traducao, p: DadosProjeto): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
  const versao = p.versaoND53 ?? "SET/2023";
  const pg = new Pagina(doc, `${p.empreendimento} · Memorial de proteção · ND-5.3 ${versao} · RT ${p.rtNome} CREA ${p.rtCrea}`);
  const e = r.entrada;
  const kvaDem = (e.demandaKW / 0.92);
  pg.moldura();

  // ── Capa / selo (Anexo C)
  doc.setFillColor(...LARANJA); doc.rect(14, 16, pg.w - 28, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...NAVY);
  doc.text("MEMORIAL DESCRITIVO E MEMÓRIA DE CÁLCULO", pg.w / 2, 32, { align: "center" });
  doc.setFontSize(11);
  doc.text(pdfTxt("PROTEÇÃO SECUNDÁRIA E SUBESTAÇÃO DE ENTRADA EM MÉDIA TENSÃO"), pg.w / 2, 39, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(pdfTxt(`${r.dimensionamento.recomendado} · ${fmt(e.tensaoKV, 1)} kV · CEMIG ND-5.3 ${versao}${e.geracao ? " + ND-5.31" : ""}`), pg.w / 2, 45, { align: "center" });
  pg.y = 54;
  pg.tabela(["Campo", "Informação"], [45, 135], [
    ["Nome do empreendimento", p.empreendimento],
    ["Proprietário / CPF-CNPJ", `${p.proprietario} · ${p.cpfCnpj}${p.telefone ? " · " + p.telefone : ""}`],
    ["Finalidade", p.finalidade],
    ["Endereço / cidade", `${p.endereco} · ${p.cidade}`],
    ["Coordenadas", p.coordenadas ?? "—"],
    ["Carga instalada (kW)", p.cargaInstaladaKW ? fmt(p.cargaInstaladaKW, 2) : "—"],
    ["Demanda da instalação (kVA)", fmt(kvaDem, 2)],
    ["Demanda de contrato (kW)", fmt(e.demandaKW, 2)],
    ...(e.geracao ? [["Geração própria (kW)", `${fmt(e.geracao.potenciaKW, 2)} · ${e.geracao.tipo} · ${e.geracao.injecao ? "com injeção" : "sem injeção"}`]] : []),
    ["Responsável técnico", `${p.rtNome} · CREA ${p.rtCrea}`],
    ["ART de projeto", p.artNumero ?? "—"],
    ["Data", p.dataProjeto],
  ]);
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.rect(14, pg.y, pg.w - 28, 40);
  doc.setFontSize(8); doc.setTextColor(...NAVY);
  doc.text(pdfTxt("ANÁLISE DE CONFORMIDADE COM AS NORMAS DA CEMIG E ABNT — PARA USO DA CEMIG"), 16, pg.y + 5);
  pg.y += 46;
  pg.par(`Status interno do estudo: ${statusGlobal(r) === "OK" ? "IDEAL — todas as verificações atendidas" : statusGlobal(r) === "ATENCAO" ? "ATENÇÃO — ver itens destacados e justificativas" : "INTERVENÇÃO — corrigir itens em vermelho antes de protocolar"}`, 8.5, true);

  // ── Memorial descritivo
  pg.nova();
  pg.titulo("1. OBJETIVO E NORMAS");
  pg.par(`Este memorial descreve a subestação de entrada de energia em ${fmt(e.tensaoKV, 1)} kV e apresenta a metodologia de ajuste da proteção secundária do disjuntor geral, conforme ND-5.3 (${versao}) Anexo A${e.geracao ? " e ND-5.31 Anexo 6 (geração própria)" : ""}.`);
  pg.par("Normas: CEMIG ND-5.3; CEMIG ND-5.31 (quando aplicável); ABNT NBR 14039, NBR 5410, NBR 5419, NBR 15751, NBR IEC 62271-200, NBR 6855, NBR 6856; REN ANEEL 1000/2021.");
  pg.titulo("2. CARACTERÍSTICAS DO FORNECIMENTO");
  pg.par(`Tensão nominal ${fmt(e.tensaoKV, 1)} kV, trifásico, 60 Hz. Demanda contratada ${fmt(e.demandaKW, 0)} kW (${fmt(kvaDem, 1)} kVA a FP 0,92). Capacidade de transformação ${fmt(r.kvaTotal, 1)} kVA. Curto-circuito no ponto de derivação (informado pela CEMIG): trifásico ${fmt(e.iccTrifasicoA, 0)} A${e.iccFaseTerraA ? `, fase-terra ${fmt(e.iccFaseTerraA, 0)} A` : ""}.`);
  pg.par(`Ramal de entrada: ${r.dimensionamento.caboRamal}.`);
  pg.titulo("3. SUBESTAÇÃO");
  pg.par(`${r.dimensionamento.recomendado}${p.fabricanteSE ? ` — ${p.fabricanteSE} ${p.modeloSE ?? ""}` : ""}, modelo aprovado pela CEMIG e listado no PEC-11, ensaios de tipo NBR IEC 62271-200, classificação de arco interno IAC ${p.iacKA ? fmt(p.iacKA, 1) : ">= 12,5"} kA / 1 s, uso ${e.usoExterno ? "externo" : "interno"}${e.compartilhada ? ", compartilhada" : ", individual"}.`);
  pg.par("Sequência (DESENHO 10): entrada -> TP e TC de medição (módulo exclusivo CEMIG) -> chave seccionadora tripolar sob carga -> TP de proteção -> TC de proteção -> disjuntor -> saída. Medidor em compartimento tipo CM-4 ou CM-4 a no máximo 2 m.");
  pg.tabela(["Equipamento", "Especificação"], [40, 140], [
    ["Disjuntor geral", r.dimensionamento.disjuntor],
    ["TC de proteção", r.dimensionamento.tcProtecao],
    ["TP de proteção", r.dimensionamento.tpProtecao],
    ["Relé secundário", `${t.rele.fabricante} ${t.rele.modelo} — trifásico, microprocessado, funções ${Array.from(new Set(t.linhas.map((l) => l.funcao.split(" ")[0]).filter((f) => /^\d/.test(f)))).join(", ")}`],
    ["Alimentação auxiliar", r.dimensionamento.nobreak],
    ["Para-raios", r.dimensionamento.pararaios],
    ["Aterramento", `Malha com no mínimo ${r.dimensionamento.hastesMin} hastes; ${r.dimensionamento.resistenciaMalha}`],
    ["Ventilação", r.dimensionamento.ventilacao],
    ...(r.dimensionamento.reatorAterramento ? [["Aterramento GD", r.dimensionamento.reatorAterramento]] : []),
  ]);
  pg.tabela(["Trafo", "kVA", "Z%", "Isolação", "In (A)", "Proteção individual"], [16, 18, 14, 20, 18, 94], e.trafos.map((tr, k) => [tr.id, fmt(tr.kva, 1), fmt(tr.zPercent, 2), tr.isolacao === "SECO" ? "Seco (epóxi)" : "Óleo", fmt(r.pontosTrafo[k].inA, 2), r.dimensionamento.fusiveisTrafo[k]?.fusivelA ? `Chave tripolar sob carga + fusível ${r.dimensionamento.fusiveisTrafo[k].fusivelA} A (Tab. 16-18)` : "Relé geral"]));

  // ── Memória de cálculo
  pg.nova();
  pg.titulo("4. MEMÓRIA DE CÁLCULO DA PROTEÇÃO (ND-5.3 ANEXO A)");
  pg.tabela(["Grandeza", "Fórmula / critério", "Valor"], [45, 95, 40], [
    ["Corrente de magnetização", "Im = 8 x In(maior) + soma In(demais), 0,1 s (9.1.2)", `${fmt(r.imA, 2)} A`],
    ...r.pontosTrafo.map((pt) => [`Ponto ANSI ${pt.trafo.id}`, `(100/Z%) x In = ${fmt(pt.inA, 2)} A x ${fmt(pt.ansiFaseA / pt.inA, 1)} (9.1.3)`, `${fmt(pt.ansiFaseA, 1)} A @ ${pt.tAnsiS} s · N ${fmt(pt.ansiNeutroA, 1)} A`]),
    ["TC de proteção", r.tc.criterios.join(" · "), `${r.tc.primarioA}-${r.tc.secundarioA} A`],
    ...(r.funcoesAdicionais.length ? [["Base de potência", "Sn = 1,73 x V x I primário TC", `${fmt(r.snKVA, 2)} kVA`]] : []),
  ]);
  for (const c of r.cenarios) {
    pg.par(c.titulo.toUpperCase(), 9.5, true);
    const curva = c.curvaFase === "DT" ? "Tempo definido" : CURVAS[c.curvaFase as Exclude<CurvaId, "DT">].nome;
    pg.tabela(["Grandeza", "Fórmula / critério", "Valor"], [45, 95, 40], [
      ["Corrente nominal", `In = ${fmt(c.potenciaBaseKW, 0)} / (1,73 x ${fmt(e.tensaoKV, 1)} x 0,92)`, `${fmt(c.inA, 2)} A`],
      [`Partida ${c.funcaoFase}`, "Ip = 1,05 x In (mín. 10% do primário do TC)", `${fmt(c.ipFaseA, 2)} A`],
      [`Curva ${c.funcaoFase}`, curva, `TMS ${fmt(c.tmsFase, 3)}`],
      [`Instantâneo ${c.funcaoFase}`, c.instFaseA !== null ? "Im < I50 <= 1,05 x Im; < Icc mín.; < ANSI menor trafo" : "Desativado (ND-5.31)", c.instFaseA !== null ? `${fmt(c.instFaseA, 1)} A` : "—"],
      [`Partida ${c.funcaoNeutro}`, "Ipn = Ip/3, <= 40 A", `${fmt(c.ipNeutroA, 2)} A`],
      [`Tempo ${c.funcaoNeutro}`, c.id === "CONSUMO" ? "Tempo definido 1 a 3 s" : "Tempo definido 5 a 9 s", `${fmt(c.tempoNeutroS, 1)} s`],
      [`Instantâneo ${c.funcaoNeutro}`, c.instNeutroA !== null ? "1/3 do instantâneo de fase" : "Desativado", c.instNeutroA !== null ? `${fmt(c.instNeutroA, 1)} A` : "—"],
    ]);
    c.justificativas.forEach((j) => pg.par("• " + j, 8));
  }
  if (r.funcoesAdicionais.length) {
    pg.par("FUNÇÕES DE GERAÇÃO / PARALELISMO (ND-5.31 TABELA 4)", 9.5, true);
    pg.tabela(["ANSI", "Descrição", "Ajuste", "Tempo", "Ref."], [22, 60, 48, 18, 32], r.funcoesAdicionais.map((f) => [f.ansi, f.descricao, `${f.ajuste}${f.unidade === "kW" ? ` = ${fmt(f.valor, 1)} kW (${fmt(f.pu ?? 0, 2)} x Sn)` : ""}`, f.tempoS !== null ? `${fmt(f.tempoS, 1)} s` : "—", f.ref]));
  }

  // ── Verificações
  pg.titulo("5. VERIFICAÇÕES NORMATIVAS");
  for (const c of r.cenarios) {
    pg.par(c.titulo, 8.5, true);
    pg.tabela(["Verificação", "Valor", "Limite", "Status", "Ref."], [62, 34, 34, 20, 30], c.verificacoes.map((v) => [v.descricao, v.valor, v.limite, v.status === "OK" ? "IDEAL" : v.status === "ATENCAO" ? "ATENÇÃO" : "INTERVENÇÃO", v.ref]), (row) => COR_STATUS[row[3] === "IDEAL" ? "OK" : row[3] === "ATENÇÃO" ? "ATENCAO" : "INTERVENCAO"]);
  }
  [...r.alertas, ...r.dimensionamento.alertas].forEach((a) => pg.par("! " + a, 8));

  // ── Parametrização do relé
  pg.nova();
  pg.titulo(`6. PARAMETRIZAÇÃO DO RELÉ — ${t.rele.fabricante.toUpperCase()} ${t.rele.modelo.toUpperCase()}`);
  pg.par(`RTC ${t.rtc} (${r.tc.primarioA}/${t.inRele} A). Todos os parâmetros programáveis com seus valores (ND-5.3 9.1.6.15). Programação de responsabilidade do RT, acompanhada e lacrada pela CEMIG.`, 8);
  pg.tabela(["Grupo", "Função", "Parâmetro", "Ajuste", "Primário", "Faixa"], [38, 22, 38, 30, 26, 26], t.linhas.map((l) => [l.grupo, l.funcao, l.parametro, l.ajuste + (l.nota ? ` (${l.nota})` : ""), l.primario, l.faixa]), (row) => {
    const l = t.linhas.find((x) => x.parametro === row[2] && x.grupo === row[0]);
    return l ? COR_STATUS[l.status] : null;
  });
  t.avisos.forEach((a) => pg.par("! " + a, 8));

  // ── Desenhos (paisagem)
  for (const c of r.cenarios) {
    pg.nova("l");
    desenharNoPdf(doc, coordenograma(r, c), 12, 6, 0.93);
  }
  pg.nova("l");
  desenharNoPdf(doc, unifilarSE4(r, `${t.rele.fabricante} ${t.rele.modelo}`), 12, 6, 0.93);

  // ── Notas obrigatórias
  pg.nova();
  pg.titulo("7. NOTAS OBRIGATÓRIAS (ND-5.3 2.6.5.3.4 e 2.6.5.4.6)");
  [
    "a) A CEMIG fica autorizada a reproduzir cópias desse projeto para uso interno, se necessário, bem como fazer arquivamento pelo processo que lhe for conveniente.",
    `b) Este projeto foi desenvolvido de acordo com a norma CEMIG ND-5.3, versão ${versao}.`,
    `c) Eu, ${p.proprietario}, declaro que estou ciente das responsabilidades legais inerentes à energização acidental de circuitos elétricos da concessionária por equipamentos de geração própria existentes na instalação, ou que vierem a ser instalados dentro de minha propriedade.`,
    "d) Eu, responsável técnico por este projeto, declaro conhecer o disposto na Lei Federal 5194/66 de 24-12-1966, na Lei 9610/98 de 19-02-1998 e nas Resoluções, Instruções Normativas e Atos do CONFEA e do CREA-MG, responsabilizando-me, única e exclusivamente, administrativa ou judicialmente, em caso de arguição de violação dos direitos autorais.",
    "e) Os ajustes poderão ser alterados pela CEMIG para coordenação com a proteção da derivação (ND-5.3 9.1.6.19). Portas de comunicação do relé desabilitadas; parametrização bloqueada por senha/lacre.",
  ].forEach((n) => pg.par(n, 8.5));
  pg.y += 18;
  doc.setDrawColor(...NAVY); doc.line(30, pg.y, 95, pg.y); doc.line(pg.w - 95, pg.y, pg.w - 30, pg.y);
  doc.setFontSize(8); doc.setTextColor(...NAVY);
  doc.text(pdfTxt(p.proprietario), 62.5, pg.y + 4, { align: "center" });
  doc.text(pdfTxt(`${p.rtNome} · CREA ${p.rtCrea}`), pg.w - 62.5, pg.y + 4, { align: "center" });

  return doc.output("arraybuffer");
}
