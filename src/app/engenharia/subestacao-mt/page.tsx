"use client";

import { useMemo, useRef, useState } from "react";
import { Zap, Download, FileText, Upload, Save, Plus, Trash2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Cpu } from "lucide-react";
import {
  calcularEstudo, statusGlobal, EntradaEstudo, Trafo, CurvaId, CURVAS, Severidade, formatarNumero as fmt,
  CATALOGO_RELES, releGenerico, traduzirEstudo, ReleModelo, FormaPickup, Faixa,
  coordenograma, unifilarSE4, desenhoParaSvg, desenhoParaDxf, gerarMemorialPdf, DadosProjeto,
} from "@/lib/cemig/subestacaoMt";

// ─── Estado inicial: estudo de referência aprovado NS 1154922565 ─────────────
const ENTRADA_REFERENCIA: EntradaEstudo = {
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
  usoExterno: true,
};
const DADOS_INICIAIS: DadosProjeto = {
  proprietario: "", cpfCnpj: "", empreendimento: "", finalidade: "Comercial", endereco: "", cidade: "",
  rtNome: "", rtCrea: "", dataProjeto: new Date().toLocaleDateString("pt-BR"), versaoND53: "SET/2023",
};
const KVA_PADRAO = [75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500];
const CURVA_OPCOES: CurvaId[] = ["IEC_EI", "IEC_VI", "IEC_NI", "IEC_LTI", "IEEE_EI", "IEEE_VI", "IEEE_MI"];
const STATUS_UI: Record<Severidade, { txt: string; cls: string; Icon: typeof CheckCircle2 }> = {
  OK: { txt: "Ideal", cls: "bg-[#00B356]/10 text-[#00B356] border-[#00B356]/30", Icon: CheckCircle2 },
  ATENCAO: { txt: "Atenção", cls: "bg-amber-50 text-amber-700 border-amber-300", Icon: AlertTriangle },
  INTERVENCAO: { txt: "Intervenção", cls: "bg-red-50 text-red-700 border-red-300", Icon: XCircle },
};

function baixar(nome: string, conteudo: BlobPart, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

// ─── Campos ──────────────────────────────────────────────────────────────────
const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums text-[#0A192F] focus:border-[#E45318] focus:outline-none focus:ring-2 focus:ring-[#E45318]/20";

function Campo({ label, children, dica }: { label: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {dica && <span className="mt-0.5 block text-[10px] text-slate-400">{dica}</span>}
    </label>
  );
}

function Num({ value, onChange, step = "any", placeholder }: { value: number | undefined; onChange: (v: number | undefined) => void; step?: string; placeholder?: string }) {
  return (
    <input type="number" step={step} className={inputCls} placeholder={placeholder} value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
  );
}

function Texto({ value, onChange, placeholder }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string }) {
  return <input className={inputCls} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function Secao({ titulo, children, aberta = true }: { titulo: string; children: React.ReactNode; aberta?: boolean }) {
  return (
    <details open={aberta} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer select-none px-4 py-3 text-xs font-black uppercase tracking-wider text-[#0A192F]">{titulo}</summary>
      <div className="space-y-3 border-t border-slate-100 px-4 py-3">{children}</div>
    </details>
  );
}

function FaixaEditor({ label, faixa, onChange }: { label: string; faixa: Faixa; onChange: (f: Faixa) => void }) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{label} (mín · máx · passo)</span>
      <div className="grid grid-cols-3 gap-1.5">
        {(["min", "max", "passo"] as const).map((k) => (
          <Num key={k} value={faixa[k]} onChange={(v) => onChange({ ...faixa, [k]: v ?? 0 })} />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function SubestacaoMtPage() {
  const [entrada, setEntrada] = useState<EntradaEstudo>(ENTRADA_REFERENCIA);
  const [dados, setDados] = useState<DadosProjeto>(DADOS_INICIAIS);
  const [releId, setReleId] = useState("PEXTRON_URP6000");
  const [generico, setGenerico] = useState<ReleModelo>(releGenerico());
  const [aba, setAba] = useState<"coord" | "unifilar" | "rele" | "verif" | "dim">("coord");
  const [cenarioIdx, setCenarioIdx] = useState(0);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EntradaEstudo>(k: K, v: EntradaEstudo[K]) => setEntrada((e) => ({ ...e, [k]: v }));
  const setTrafo = (i: number, t: Partial<Trafo>) => set("trafos", entrada.trafos.map((x, k) => (k === i ? { ...x, ...t } : x)));
  const rele = releId === "GENERICO" ? generico : CATALOGO_RELES.find((r) => r.id === releId) ?? CATALOGO_RELES[0];

  const calc = useMemo(() => {
    try {
      const r = calcularEstudo(entrada);
      return { r, t: traduzirEstudo(r, rele), erro: null as string | null };
    } catch (e) {
      return { r: null, t: null, erro: (e as Error).message };
    }
  }, [entrada, rele]);
  const { r, t, erro } = calc;
  const cenario = r?.cenarios[Math.min(cenarioIdx, (r?.cenarios.length ?? 1) - 1)];
  const desenhoAtual = r && cenario ? (aba === "unifilar" ? unifilarSE4(r, `${rele.fabricante} ${rele.modelo}`) : coordenograma(r, cenario)) : null;
  const status = r ? statusGlobal(r) : "INTERVENCAO";
  const nomeBase = (dados.empreendimento || "subestacao-mt").replace(/[^\w-]+/g, "_");

  const salvarJson = () => baixar(`${nomeBase}.estudo.json`, JSON.stringify({ versao: 1, entrada, dados, releId, generico }, null, 2), "application/json");
  const abrirJson = async (f: File) => {
    const j = JSON.parse(await f.text());
    if (j.entrada) setEntrada(j.entrada);
    if (j.dados) setDados(j.dados);
    if (j.releId) setReleId(j.releId);
    if (j.generico) setGenerico(j.generico);
  };

  const S = STATUS_UI[status];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 font-[Montserrat,sans-serif] text-[#0A192F] md:p-6">
      {/* Cabeçalho */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0A192F] px-5 py-4 text-white shadow">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#E45318] p-2"><Zap className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Subestação MT &amp; Estudo de Proteção</h1>
            <p className="text-xs text-slate-300">CEMIG ND-5.3 (SET/2023) · ND-5.31 (JUN/2024) · SE nº 4 blindada · coordenograma · relé</p>
          </div>
          <span className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${S.cls}`}><S.Icon className="h-3.5 w-3.5" />{S.txt}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button onClick={() => setEntrada(ENTRADA_REFERENCIA)} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Exemplo NS 1154922565</button>
          <button onClick={salvarJson} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"><Save className="h-3.5 w-3.5" />Salvar</button>
          <button onClick={() => arquivoRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"><Upload className="h-3.5 w-3.5" />Abrir</button>
          <input ref={arquivoRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && abrirJson(e.target.files[0])} />
          <button disabled={!r || !t} onClick={() => r && t && baixar(`${nomeBase}-memorial.pdf`, gerarMemorialPdf(r, t, dados), "application/pdf")} className="inline-flex items-center gap-1 rounded-lg bg-[#E45318] px-3 py-2 hover:brightness-110 disabled:opacity-40"><FileText className="h-3.5 w-3.5" />Memorial PDF</button>
          <button disabled={!r} onClick={() => r && r.cenarios.forEach((c, k) => baixar(`${nomeBase}-coordenograma-${k + 1}.dxf`, desenhoParaDxf(coordenograma(r, c)), "application/dxf"))} className="inline-flex items-center gap-1 rounded-lg bg-[#00B356] px-3 py-2 hover:brightness-110 disabled:opacity-40"><Download className="h-3.5 w-3.5" />DXF coordenograma</button>
          <button disabled={!r} onClick={() => r && baixar(`${nomeBase}-unifilar-se4.dxf`, desenhoParaDxf(unifilarSE4(r, `${rele.fabricante} ${rele.modelo}`)), "application/dxf")} className="inline-flex items-center gap-1 rounded-lg bg-[#00B356] px-3 py-2 hover:brightness-110 disabled:opacity-40"><Download className="h-3.5 w-3.5" />DXF unifilar</button>
          <button disabled={!desenhoAtual} onClick={() => desenhoAtual && baixar(`${nomeBase}-${aba === "unifilar" ? "unifilar" : "coordenograma"}.svg`, desenhoParaSvg(desenhoAtual), "image/svg+xml")} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 disabled:opacity-40"><Download className="h-3.5 w-3.5" />SVG</button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* ── Coluna de entrada ── */}
        <aside className="space-y-3">
          <Secao titulo="1 · Fornecimento">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tensão (kV)">
                <select className={inputCls} value={entrada.tensaoKV} onChange={(e) => set("tensaoKV", Number(e.target.value))}>
                  {[13.8, 22, 34.5].map((v) => <option key={v} value={v}>{fmt(v, 1)} kV</option>)}
                </select>
              </Campo>
              <Campo label="Demanda contratada (kW)"><Num value={entrada.demandaKW} onChange={(v) => set("demandaKW", v ?? 0)} /></Campo>
              <Campo label="Icc trifásico (A)" dica="Informado pela CEMIG"><Num value={entrada.iccTrifasicoA} onChange={(v) => set("iccTrifasicoA", v ?? 0)} /></Campo>
              <Campo label="Icc fase-terra (A)"><Num value={entrada.iccFaseTerraA} onChange={(v) => set("iccFaseTerraA", v)} /></Campo>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!entrada.usoExterno} onChange={(e) => set("usoExterno", e.target.checked)} />Uso externo</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!entrada.compartilhada} onChange={(e) => set("compartilhada", e.target.checked)} />Compartilhada</label>
            </div>
          </Secao>

          <Secao titulo="2 · Transformadores">
            {entrada.trafos.map((tr, i) => (
              <div key={i} className="grid grid-cols-[52px_1fr_64px_80px_28px] items-end gap-1.5">
                <Campo label="ID"><Texto value={tr.id} onChange={(v) => setTrafo(i, { id: v })} /></Campo>
                <Campo label="kVA">
                  <input list="kva-padrao" type="number" className={inputCls} value={tr.kva} onChange={(e) => setTrafo(i, { kva: Number(e.target.value) })} />
                </Campo>
                <Campo label="Z %"><Num value={tr.zPercent} onChange={(v) => setTrafo(i, { zPercent: v ?? 5 })} /></Campo>
                <Campo label="Isolação">
                  <select className={inputCls} value={tr.isolacao} onChange={(e) => setTrafo(i, { isolacao: e.target.value as Trafo["isolacao"] })}>
                    <option value="OLEO">Óleo</option><option value="SECO">Seco</option>
                  </select>
                </Campo>
                <button aria-label="Remover transformador" disabled={entrada.trafos.length === 1} onClick={() => set("trafos", entrada.trafos.filter((_, k) => k !== i))} className="mb-1 rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <datalist id="kva-padrao">{KVA_PADRAO.map((k) => <option key={k} value={k} />)}</datalist>
            <button onClick={() => set("trafos", [...entrada.trafos, { id: `TR${entrada.trafos.length + 1}`, kva: 500, zPercent: 5, isolacao: "OLEO" }])} className="inline-flex items-center gap-1 text-xs font-bold text-[#E45318]"><Plus className="h-3.5 w-3.5" />Adicionar trafo</button>
          </Secao>

          <Secao titulo="3 · Geração própria (ND-5.31)" aberta={!!entrada.geracao}>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={!!entrada.geracao} onChange={(e) => set("geracao", e.target.checked ? { potenciaKW: 500, tipo: "INVERSOR", injecao: true } : undefined)} />
              Possui geração (UFV, gerador, BESS)
            </label>
            {entrada.geracao && (
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Potência de geração (kW)"><Num value={entrada.geracao.potenciaKW} onChange={(v) => set("geracao", { ...entrada.geracao!, potenciaKW: v ?? 0 })} /></Campo>
                <Campo label="Tipo">
                  <select className={inputCls} value={entrada.geracao.tipo} onChange={(e) => set("geracao", { ...entrada.geracao!, tipo: e.target.value as "INVERSOR" })}>
                    <option value="INVERSOR">Inversor (UFV/BESS)</option><option value="SINCRONO">Síncrono</option><option value="ASSINCRONO">Assíncrono</option>
                  </select>
                </Campo>
                <label className="col-span-2 flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" checked={entrada.geracao.injecao} onChange={(e) => set("geracao", { ...entrada.geracao!, injecao: e.target.checked })} />
                  Com injeção na rede (GD). Desmarcado = paralelismo sem injeção (32 = 5% / 5 s)
                </label>
              </div>
            )}
          </Secao>

          <Secao titulo="4 · Relé e ajustes">
            <Campo label="Relé secundário">
              <select className={inputCls} value={releId} onChange={(e) => setReleId(e.target.value)}>
                {CATALOGO_RELES.map((x) => <option key={x.id} value={x.id}>{x.fabricante} {x.modelo}</option>)}
                <option value="GENERICO">Outro relé (faixas editáveis)</option>
              </select>
            </Campo>
            <p className="text-[11px] leading-snug text-slate-500"><Cpu className="mr-1 inline h-3 w-3" />{rele.obs}</p>
            {releId === "GENERICO" && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                <Texto value={generico.fabricante + " " + generico.modelo} onChange={(v) => setGenerico({ ...generico, fabricante: v, modelo: "" })} placeholder="Fabricante e modelo" />
                <select className={inputCls} value={generico.formaPickup} onChange={(e) => setGenerico({ ...generico, formaPickup: e.target.value as FormaPickup })}>
                  <option value="X_IN">Pickup em × In do relé</option><option value="A_SEC">Pickup em A secundário</option><option value="A_PRIM">Pickup em A primário (faixa em × TC)</option><option value="X_CT">Pickup em × primário do TC</option>
                </select>
                <FaixaEditor label="51 fase" faixa={generico.pickupFase} onChange={(f) => setGenerico({ ...generico, pickupFase: f })} />
                <FaixaEditor label="51N neutro" faixa={generico.pickupNeutro} onChange={(f) => setGenerico({ ...generico, pickupNeutro: f })} />
                <FaixaEditor label="50 instantâneo" faixa={generico.instantaneo} onChange={(f) => setGenerico({ ...generico, instantaneo: f })} />
                <FaixaEditor label="Dial (TMS)" faixa={generico.tms} onChange={(f) => setGenerico({ ...generico, tms: f })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Campo label="TC primário (A)" dica="Vazio = automático (9.1.4.2)"><Num value={entrada.rtcPrimarioA} onChange={(v) => set("rtcPrimarioA", v)} placeholder="auto" /></Campo>
              <Campo label="TC secundário">
                <select className={inputCls} value={entrada.tcSecundarioA ?? 5} onChange={(e) => set("tcSecundarioA", Number(e.target.value) as 1 | 5)}><option value={5}>5 A</option><option value={1}>1 A</option></select>
              </Campo>
              <Campo label={`Curva ${entrada.geracao?.injecao ? "67 consumo" : "51 fase"}`}>
                <select className={inputCls} value={entrada.curvaFase ?? "IEC_EI"} onChange={(e) => set("curvaFase", e.target.value as CurvaId)}>
                  {CURVA_OPCOES.map((c) => <option key={c} value={c}>{CURVAS[c as Exclude<CurvaId, "DT">].nome}</option>)}
                </select>
              </Campo>
              <Campo label="Dial (TMS)" dica="Vazio = mínimo automático"><Num value={entrada.tmsFase} onChange={(v) => set("tmsFase", v)} placeholder="auto" /></Campo>
              <Campo label="Tempo 51N (s)" dica="1 a 3 s"><Num value={entrada.tempoNeutroS} onChange={(v) => set("tempoNeutroS", v)} placeholder="2" /></Campo>
              <Campo label="Fator do 50 × Im" dica="1,00 a 1,05"><Num value={entrada.fatorInstantaneo} onChange={(v) => set("fatorInstantaneo", v)} placeholder="1,05" /></Campo>
              {entrada.geracao?.injecao && (
                <>
                  <Campo label="Curva 67 injeção">
                    <select className={inputCls} value={entrada.curvaInjecao ?? "IEC_EI"} onChange={(e) => set("curvaInjecao", e.target.value as CurvaId)}>
                      {(["IEC_EI", "IEC_VI"] as CurvaId[]).map((c) => <option key={c} value={c}>{CURVAS[c as Exclude<CurvaId, "DT">].nome}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Dial 67 injeção"><Num value={entrada.tmsInjecao} onChange={(v) => set("tmsInjecao", v)} placeholder="0,2" /></Campo>
                  <Campo label="Tempo 67N injeção (s)" dica="5 a 9 s"><Num value={entrada.tempoNeutroInjecaoS} onChange={(v) => set("tempoNeutroInjecaoS", v)} placeholder="5" /></Campo>
                </>
              )}
            </div>
          </Secao>

          <Secao titulo="5 · Partidas de motores (opcional)" aberta={false}>
            {(entrada.motores ?? []).map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_70px_28px] items-end gap-1.5">
                <Campo label="Motor"><Texto value={m.nome} onChange={(v) => set("motores", entrada.motores!.map((x, k) => (k === i ? { ...x, nome: v } : x)))} /></Campo>
                <Campo label="Ip MT (A)"><Num value={m.correntePartidaA} onChange={(v) => set("motores", entrada.motores!.map((x, k) => (k === i ? { ...x, correntePartidaA: v ?? 0 } : x)))} /></Campo>
                <Campo label="t (s)"><Num value={m.tempoPartidaS} onChange={(v) => set("motores", entrada.motores!.map((x, k) => (k === i ? { ...x, tempoPartidaS: v ?? 0 } : x)))} /></Campo>
                <button aria-label="Remover motor" onClick={() => set("motores", entrada.motores!.filter((_, k) => k !== i))} className="mb-1 p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => set("motores", [...(entrada.motores ?? []), { nome: `M${(entrada.motores?.length ?? 0) + 1}`, correntePartidaA: 50, tempoPartidaS: 5 }])} className="inline-flex items-center gap-1 text-xs font-bold text-[#E45318]"><Plus className="h-3.5 w-3.5" />Adicionar partida</button>
          </Secao>

          <Secao titulo="6 · Identificação (selo Anexo C)" aberta={false}>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["empreendimento", "Empreendimento"], ["proprietario", "Proprietário"], ["cpfCnpj", "CPF/CNPJ"], ["telefone", "Telefone"],
                ["finalidade", "Finalidade"], ["endereco", "Endereço"], ["cidade", "Cidade/UF"], ["coordenadas", "Coordenadas"],
                ["rtNome", "Responsável técnico"], ["rtCrea", "CREA"], ["artNumero", "ART nº"], ["dataProjeto", "Data"],
                ["fabricanteSE", "Fabricante da SE"], ["modeloSE", "Modelo (PEC-11)"], ["versaoND53", "Versão ND-5.3"],
              ] as [keyof DadosProjeto, string][]).map(([k, l]) => (
                <Campo key={k} label={l}><Texto value={dados[k] as string | undefined} onChange={(v) => setDados({ ...dados, [k]: v })} /></Campo>
              ))}
              <Campo label="IAC (kA)"><Num value={dados.iacKA} onChange={(v) => setDados({ ...dados, iacKA: v })} /></Campo>
              <Campo label="Carga instalada (kW)"><Num value={dados.cargaInstaladaKW} onChange={(v) => setDados({ ...dados, cargaInstaladaKW: v })} /></Campo>
            </div>
          </Secao>
        </aside>

        {/* ── Coluna de resultados ── */}
        <main className="space-y-4">
          {erro && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{erro}</div>}
          {r && t && cenario && (
            <>
              <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["SE recomendada", r.dimensionamento.recomendado.split(" — ")[0], r.dimensionamento.recomendado.split(" — ")[1] ?? ""],
                  ["In (consumo)", `${fmt(r.cenarios[0].inA)} A`, `${fmt(entrada.demandaKW, 0)} kW · FP 0,92`],
                  ["Partida fase", `${fmt(r.cenarios[0].ipFaseA)} A`, "1,05 × In"],
                  ["Inrush Im", `${fmt(r.imA, 1)} A`, "@ 0,1 s"],
                  ["Instantâneo", r.cenarios[0].instFaseA ? `${fmt(r.cenarios[0].instFaseA, 1)} A` : "—", "Im … 1,05·Im"],
                  ["TC proteção", `${r.tc.primarioA}-${r.tc.secundarioA} A`, "10P20 12,5 VA"],
                ].map(([l, v, s]) => (
                  <div key={l} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{l}</p>
                    <p className="mt-1 text-lg font-black tabular-nums">{v}</p>
                    <p className="text-[10px] text-slate-400">{s}</p>
                  </div>
                ))}
              </section>

              {[...r.alertas, ...r.dimensionamento.alertas, ...t.avisos].length > 0 && (
                <section className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {[...r.alertas, ...r.dimensionamento.alertas, ...t.avisos].map((a) => <p key={a}><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{a}</p>)}
                </section>
              )}

              <nav className="flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm">
                {([["coord", "Coordenograma"], ["unifilar", "Unifilar SE nº 4"], ["rele", `Parâmetros ${rele.fabricante}`], ["verif", "Verificações"], ["dim", "Dimensionamento"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setAba(k)} className={`rounded-lg px-3 py-2 text-xs font-bold ${aba === k ? "bg-[#0A192F] text-white" : "text-slate-600 hover:bg-slate-100"}`}>{l}</button>
                ))}
                {aba === "coord" && r.cenarios.length > 1 && r.cenarios.map((c, k) => (
                  <button key={c.id} onClick={() => setCenarioIdx(k)} className={`ml-auto rounded-lg px-3 py-2 text-xs font-bold ${cenarioIdx === k ? "bg-[#E45318] text-white" : "text-slate-600 hover:bg-slate-100"}`}>{c.id === "CONSUMO" ? "Consumo" : "Injeção"}</button>
                ))}
              </nav>

              {(aba === "coord" || aba === "unifilar") && desenhoAtual && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" dangerouslySetInnerHTML={{ __html: desenhoParaSvg(desenhoAtual) }} />
              )}

              {aba === "rele" && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0A192F] text-white"><tr>{["Grupo", "Função", "Parâmetro nativo", "Ajuste", "Primário", "Faixa", ""].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
                    <tbody>
                      {t.linhas.map((l, k) => {
                        const st = STATUS_UI[l.status];
                        return (
                          <tr key={k} className="border-t border-slate-100">
                            <td className="px-3 py-1.5 text-slate-500">{l.grupo}</td>
                            <td className="px-3 py-1.5 font-semibold">{l.funcao}</td>
                            <td className="px-3 py-1.5 font-mono">{l.parametro}</td>
                            <td className="px-3 py-1.5 font-bold tabular-nums">{l.ajuste}</td>
                            <td className="px-3 py-1.5 tabular-nums text-slate-600">{l.primario}</td>
                            <td className="px-3 py-1.5 tabular-nums text-slate-500">{l.faixa}</td>
                            <td className="px-3 py-1.5"><span title={l.nota} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.cls}`}><st.Icon className="h-3 w-3" />{l.nota ? l.nota : st.txt}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {aba === "verif" && (
                <div className="space-y-4">
                  {r.cenarios.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-[#00B356]" />{c.titulo}</h3>
                      <ul className="divide-y divide-slate-100 text-xs">
                        {c.verificacoes.map((v) => {
                          const st = STATUS_UI[v.status];
                          return (
                            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                              <span className="flex items-center gap-2"><st.Icon className={`h-4 w-4 ${v.status === "OK" ? "text-[#00B356]" : v.status === "ATENCAO" ? "text-amber-600" : "text-red-600"}`} />{v.descricao}</span>
                              <span className="tabular-nums text-slate-600">{v.valor} <span className="text-slate-400">({v.limite} · {v.ref})</span></span>
                            </li>
                          );
                        })}
                      </ul>
                      {c.justificativas.map((j) => <p key={j} className="mt-2 text-[11px] text-slate-500">• {j}</p>)}
                    </div>
                  ))}
                  {r.funcoesAdicionais.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
                      <h3 className="mb-2 text-sm font-black">Funções de geração (ND-5.31 Tabela 4)</h3>
                      {r.funcoesAdicionais.map((f) => <p key={f.ansi} className="py-0.5"><b>{f.ansi}</b> — {f.descricao}: {f.ajuste}{f.unidade === "kW" ? ` = ${fmt(f.valor, 1)} kW (${fmt(f.pu ?? 0, 2)} × Sn)` : ""}{f.tempoS !== null ? ` · ${fmt(f.tempoS, 1)} s` : ""}</p>)}
                    </div>
                  )}
                </div>
              )}

              {aba === "dim" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
                    <h3 className="mb-2 text-sm font-black">Tipos de subestação permitidos</h3>
                    {r.dimensionamento.tiposPermitidos.map((x) => <p key={x.tipo} className="py-1"><b>{x.tipo}</b><br /><span className="text-slate-500">{x.obs}</span></p>)}
                    <p className="mt-2 text-[11px] text-slate-400">SE nº 1, 3 e 6 não são aceitas para ligação nova; SE nº 2 vedada em 13,8 kV.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
                    <h3 className="mb-2 text-sm font-black">Equipamentos</h3>
                    {([
                      ["Disjuntor", r.dimensionamento.disjuntor], ["Ramal de entrada", r.dimensionamento.caboRamal], ["TC proteção", r.dimensionamento.tcProtecao],
                      ["TP proteção", r.dimensionamento.tpProtecao], ["Nobreak", r.dimensionamento.nobreak], ["Para-raios", r.dimensionamento.pararaios],
                      ["Malha", `≥ ${r.dimensionamento.hastesMin} hastes · ${r.dimensionamento.resistenciaMalha}`], ["Ventilação", r.dimensionamento.ventilacao],
                      ...(r.dimensionamento.reatorAterramento ? [["Aterramento GD", r.dimensionamento.reatorAterramento]] : []),
                      ...r.dimensionamento.fusiveisTrafo.filter(() => entrada.trafos.length > 1).map((f) => [`Fusível ${f.trafo}`, f.fusivelA ? `${f.fusivelA} A` : "ver tabela"]),
                    ] as [string, string][]).map(([k, v]) => <p key={k} className="py-1"><b>{k}:</b> <span className="text-slate-600">{v}</span></p>)}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
