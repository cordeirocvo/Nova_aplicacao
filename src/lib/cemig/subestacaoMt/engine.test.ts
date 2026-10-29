/**
 * Testes do motor de proteção MT — referências:
 *  (1) Exemplo resolvido da ND-5.3 9.1.11 (1200 kW, 750 + 2×500 kVA, Icc 2000 A)
 *  (2) Estudo aprovado NS 1154922565 (UFV 1000 kW, consumo 220 kW, 1000 kVA Z 6%, Icc 5000 A, 7SR1004)
 * Executar: npm run test:cemig
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularEstudo, tempoCurva, statusGlobal, EntradaEstudo } from "./engine";
import { CATALOGO_RELES, traduzirEstudo, releGenerico } from "./reles";
import { coordenograma, unifilarSE4, desenhoParaSvg, desenhoParaDxf } from "./desenho";
import { gerarMemorialPdf } from "./memorialPdf";

const perto = (real: number, esperado: number, tol = 0.02) => assert.ok(Math.abs(real - esperado) <= tol, `esperado ${esperado}, obtido ${real}`);

const exemploND: EntradaEstudo = {
  tensaoKV: 13.8,
  demandaKW: 1200,
  trafos: [
    { id: "TR1", kva: 750, zPercent: 5, isolacao: "OLEO" },
    { id: "TR2", kva: 500, zPercent: 5, isolacao: "OLEO" },
    { id: "TR3", kva: 500, zPercent: 5, isolacao: "OLEO" },
  ],
  iccTrifasicoA: 2000,
  iccFaseTerraA: 1500,
  fatorInstantaneo: 1.01,
  tempoNeutroS: 2,
};

const ufvNS: EntradaEstudo = {
  tensaoKV: 13.8,
  demandaKW: 220,
  trafos: [{ id: "TR1", kva: 1000, zPercent: 6, isolacao: "OLEO" }],
  iccTrifasicoA: 5000,
  geracao: { potenciaKW: 1000, tipo: "INVERSOR", injecao: true },
  curvaFase: "IEC_VI",
  tmsFase: 0.3,
  tempoNeutroS: 1,
  tmsInjecao: 0.2,
  tempoNeutroInjecaoS: 5,
};

test("curvas IEC 60255-151", () => {
  perto(tempoCurva("IEC_EI", 1, 2, 1), 80 / 3, 1e-9);
  perto(tempoCurva("IEC_VI", 0.3, 10, 1), 0.45, 1e-9);
  assert.equal(tempoCurva("IEC_EI", 1, 0.9, 1), Infinity);
});

test("ND-5.3 9.1.11 — exemplo da norma", () => {
  const r = calcularEstudo(exemploND);
  const c = r.cenarios[0];
  perto(c.inA, 54.64);
  perto(c.ipFaseA, 57.37);
  perto(c.ipNeutroA, 57.37 / 3);
  perto(r.imA, 293.24, 0.05);
  perto(c.instFaseA!, 296.17, 0.05);
  const p500 = r.pontosTrafo.find((p) => p.trafo.id === "TR2")!;
  perto(p500.ansiFaseA, 418.8, 0.2);
  assert.equal(p500.tAnsiS, 3);
  perto(p500.ansiNeutroA, 242.9, 0.2);
  assert.equal(r.tc.primarioA, 40); // Icc/50 = 40 A (a norma adotou 100/5 por folga)
  assert.ok(c.tmsFase >= 0.05);
  assert.ok(c.verificacoes.every((v) => v.status !== "INTERVENCAO"), JSON.stringify(c.verificacoes.filter((v) => v.status === "INTERVENCAO")));
  assert.equal(r.dimensionamento.hastesMin, 12);
  assert.ok(r.dimensionamento.recomendado.includes("nº 4"));
});

test("ND-5.3 exemplo com TC 100/5 forçado (como na norma)", () => {
  const r = calcularEstudo({ ...exemploND, rtcPrimarioA: 100 });
  assert.equal(r.tc.rtc, 20);
  assert.ok(r.cenarios[0].verificacoes.find((v) => v.id === "ip_tc")!.status === "OK");
});

test("NS 1154922565 — UFV 1000 kW (consumo + injeção)", () => {
  const r = calcularEstudo(ufvNS);
  assert.equal(r.tc.primarioA, 100); // 5000/50
  const [cons, inj] = r.cenarios;
  assert.equal(cons.funcaoFase, "67");
  perto(cons.ipFaseA, 10.5, 0.05);
  perto(cons.instFaseA!, 351.4, 0.6);
  perto(inj.inA, 45.5, 0.05);
  perto(inj.ipFaseA, 47.7, 0.15);
  perto(inj.ipNeutroA, 15.9, 0.05);
  assert.equal(inj.instFaseA, null);
  assert.equal(inj.tempoNeutroS, 5);
  perto(r.snKVA, 2387, 5);
  const p32inj = r.funcoesAdicionais.find((f) => f.ansi === "32 (injeção)")!;
  perto(p32inj.valor, 1050, 0.01);
  perto(p32inj.pu!, 0.44, 0.005);
  const p32c = r.funcoesAdicionais.find((f) => f.ansi === "32 (consumo)")!;
  perto(p32c.valor, 231, 0.01);
  perto(p32c.pu!, 0.1, 0.005);
  assert.ok(!r.funcoesAdicionais.some((f) => f.ansi === "81U-1"), "58,5 Hz só para conexão sem inversor");
  assert.ok(r.dimensionamento.reatorAterramento?.includes("25,4"));
  // t(Im) com VI dial 0,3 > 0,1 s
  assert.equal(cons.verificacoes.find((v) => v.id === "inrush")!.status, "OK");
});

test("Tradução 7SR1004 reproduz o estudo aprovado", () => {
  const r = calcularEstudo(ufvNS);
  const t = traduzirEstudo(r, CATALOGO_RELES.find((x) => x.id === "SIEMENS_7SR1004")!);
  const inj = t.linhas.find((l) => l.parametro === "Gn 51-2 Setting")!;
  assert.equal(inj.ajuste, "0,48 ×In");
  const cons = t.linhas.find((l) => l.parametro === "Gn 51-1 Setting")!;
  assert.equal(cons.ajuste, "0,11 ×In");
  const inst = t.linhas.find((l) => l.parametro === "Gn 50-1 Setting")!;
  assert.equal(inst.ajuste, "3,52 ×In"); // estudo usou √3=1,732 → 3,51
  const p32 = t.linhas.find((l) => l.funcao === "32 (injeção)" && l.parametro.includes("Setting"))!;
  assert.equal(p32.ajuste, "0,44 ×Sn");
  // neutro de consumo 3,5 A < 0,05×In (5 A) → adota mínimo com ATENÇÃO
  const n = t.linhas.find((l) => l.parametro === "Gn 50N-1 Setting")!;
  assert.equal(n.status, "ATENCAO");
});

test("Tradução Pextron URP 6000 e genérico (A sec / ×In)", () => {
  const r = calcularEstudo({ ...exemploND, rtcPrimarioA: 100 });
  const tp = traduzirEstudo(r, CATALOGO_RELES.find((x) => x.id === "PEXTRON_URP6000")!);
  assert.equal(tp.linhas.find((l) => l.parametro === "I>F1 ip")!.ajuste, "2,87 A sec");
  assert.equal(tp.linhas.find((l) => l.parametro === "I>F1 curva")!.ajuste, "EI");
  const tg = traduzirEstudo(r, releGenerico({ formaPickup: "A_PRIM" }));
  assert.equal(tg.linhas.find((l) => l.parametro === "51-1 pickup")!.ajuste, "57,37 A prim");
  const sepam = traduzirEstudo(r, CATALOGO_RELES.find((x) => x.id === "SCHNEIDER_SEPAM_S40")!);
  assert.ok(sepam.linhas.find((l) => l.parametro.includes("T (a 10×Is)"))!.ajuste.endsWith(" s"));
  const p1439 = traduzirEstudo(calcularEstudo(ufvNS), CATALOGO_RELES.find((x) => x.id === "PEXTRON_URP1439TU")!);
  assert.ok(p1439.avisos.some((a) => a.includes("67")));
});

test("Desenhos SVG/DXF e memorial PDF são gerados", () => {
  const r = calcularEstudo(ufvNS);
  const svg = desenhoParaSvg(coordenograma(r, r.cenarios[0]));
  assert.ok(svg.startsWith("<svg") && svg.includes("polyline"));
  const dxf = desenhoParaDxf(unifilarSE4(r, "7SR1004"));
  assert.ok(dxf.includes("SECTION") && dxf.trim().endsWith("EOF"));
  assert.ok(/^[\x00-\x7F]*$/.test(dxf), "DXF deve ser ASCII");
  const t = traduzirEstudo(r, CATALOGO_RELES.find((x) => x.id === "SIEMENS_7SR1004")!);
  const pdf = gerarMemorialPdf(r, t, { proprietario: "Teste", cpfCnpj: "000", empreendimento: "UFV Teste", finalidade: "GD", endereco: "Rua A", cidade: "BH", rtNome: "Eng. X", rtCrea: "0000/D", dataProjeto: "29/10/2026" });
  assert.ok(pdf.byteLength > 20000);
  assert.notEqual(statusGlobal(r), undefined);
});
