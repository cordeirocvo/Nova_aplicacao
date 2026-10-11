"use client";

import React, { useState, useMemo } from "react";
import { Download, FileCode, CheckCircle2, Shield, Zap, Layers, Copy, Check } from "lucide-react";
import {
  QuadroEletricoModel,
  criarQuadroExemplo,
  gerarListaDeMateriais,
  exportarQuadroParaDxf,
  calcularDimensionamentoQuadro,
  criarCargasExemplo,
  CircuitoCargaInput,
} from "@/lib/cad/electricalDimensioning";

export default function ElectricalPanelVisualizer() {
  const [cargas, setCargas] = useState<CircuitoCargaInput[]>(criarCargasExemplo);
  const [quadro, setQuadro] = useState<QuadroEletricoModel>(criarQuadroExemplo);
  const [activeTab, setActiveTab] = useState<"VISUAL" | "QUADRO_CARGAS" | "MATERIAIS">("VISUAL");
  const [uiMode, setUiMode] = useState<"STUDIO_DARK" | "CLASSIC">("STUDIO_DARK");
  const [copiedBom, setCopiedBom] = useState(false);

  // Dimensionamento rigoroso em tempo real NBR 5410 / NBR 17019
  const quadroDimensionado = useMemo(() => {
    return calcularDimensionamentoQuadro("QDF/QGBT Principal Cordeiro", 380, cargas);
  }, [cargas]);

  const materiais = gerarListaDeMateriais(quadro);

  // Download do arquivo DXF nativo do AutoCAD
  const handleDownloadDxf = () => {
    const dxfContent = exportarQuadroParaDxf(quadro);
    const blob = new Blob([dxfContent], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quadro_Eletrico_${quadro.nome.replace(/[^a-zA-Z0-9]/g, "_")}.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyBom = () => {
    const text = quadroDimensionado.resumoMateriais
      .map((m, i) => `${i + 1}. ${m.item} - Qtd: ${m.quantidade} ${m.unidade} (${m.especificacao})`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedBom(true);
    setTimeout(() => setCopiedBom(false), 2000);
  };

  const isDark = uiMode === "STUDIO_DARK";

  return (
    <div
      className={`w-full rounded-2xl transition-colors duration-200 border ${
        isDark
          ? "bg-[#0b1329] border-slate-800 text-slate-100 shadow-xl"
          : "bg-white border-slate-200 text-slate-800 shadow-sm"
      } overflow-hidden`}
    >
      {/* ── Topo do Visualizador ────────────────────────────────────────── */}
      <div
        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${
          isDark ? "bg-[#0a0f1d] border-slate-800" : "bg-slate-900 border-slate-800"
        } text-white`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#f15a24] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
              Engenharia Cordeiro
            </span>
            <span className="text-xs text-slate-400 font-bold">NBR 5410 • NBR 17019 • AutoCAD Ready</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            {quadroDimensionado.nome}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            3F+N+PE {quadroDimensionado.tensaoLinhaV}V • Geral: {quadroDimensionado.disjuntorGeral.correnteNominalA}A (
            {quadroDimensionado.disjuntorGeral.tipo === "CAIXA_MOLDADA" ? "Caixa Moldada MCCB 25kA" : "Mini-Disjuntor DIN"}
            ) • Desbalanceamento: {quadroDimensionado.desbalanceamentoFasesPct}%
          </p>
        </div>

        {/* Abas, Alternador de Tema Ergonômico e Botão CAD */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor do Modo de Exibição (Reversível) */}
          <div className="bg-slate-800/80 p-1 rounded-xl flex gap-1 border border-slate-700">
            <button
              onClick={() => setUiMode("STUDIO_DARK")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                isDark ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
              }`}
              title="Interface escura ergonômica com contraste WCAG AAA para menor fadiga visual"
            >
              🌙 Studio Ergonômico
            </button>
            <button
              onClick={() => setUiMode("CLASSIC")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                !isDark ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Voltar ao layout clássico original a qualquer momento"
            >
              ☀️ Modo Clássico
            </button>
          </div>

          <div className="bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-700">
            <button
              onClick={() => setActiveTab("VISUAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "VISUAL" ? "bg-[#00BFA5] text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Layout Físico (QDF)
            </button>
            <button
              onClick={() => setActiveTab("QUADRO_CARGAS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "QUADRO_CARGAS" ? "bg-[#00BFA5] text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Quadro de Cargas NBR 5410 ({quadroDimensionado.circuitos.length})
            </button>
            <button
              onClick={() => setActiveTab("MATERIAIS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "MATERIAIS" ? "bg-[#00BFA5] text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              BOM ({quadroDimensionado.resumoMateriais.length})
            </button>
          </div>

          <button
            onClick={handleDownloadDxf}
            className="flex items-center gap-1.5 bg-[#f15a24] hover:bg-[#d94816] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02]"
            title="Exportar arquivo DXF nativo para abrir no AutoCAD"
          >
            <FileCode className="w-4 h-4" />
            AutoCAD (.DXF)
          </button>
        </div>
      </div>

      {/* ── Conteúdo Principal ───────────────────────────────────────────── */}
      {activeTab === "VISUAL" && (
        <div className="p-6 bg-slate-50 flex flex-col items-center justify-center">
          {/* Legenda de Fiação NBR 5410 */}
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-3 mb-6 flex items-center justify-between text-xs font-semibold text-slate-600 shadow-sm flex-wrap gap-2">
            <span className="font-bold text-slate-800">Cores Normatizadas NBR 5410:</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0284c7]" /> Neutro (Azul)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#16a34a]" /> Terra (Verde)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0f172a]" /> Fase R (Preto)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#dc2626]" /> Fase S (Vermelho)
              </span>
            </div>
          </div>

          {/* SVG DO QUADRO ELÉTRICO REALISTA (Estilo Steck / Foto do Usuário) */}
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border-4 border-slate-200 relative">
            <svg viewBox="0 0 540 760" className="w-full h-auto select-none font-sans drop-shadow-sm">
              <defs>
                {/* Textura do Trilho Metálico DIN */}
                <pattern id="trilhoDinPattern" width="10" height="30" patternUnits="userSpaceOnUse">
                  <rect width="10" height="30" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
                  <ellipse cx="5" cy="15" rx="2" ry="6" fill="#94a3b8" />
                </pattern>
                {/* Gradiente do Disjuntor */}
                <linearGradient id="disjuntorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
                {/* Gradiente DPS Vermelho */}
                <linearGradient id="dpsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
                {/* Gradiente Barramento Cobre */}
                <linearGradient id="cobreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>

              {/* Fundo da Caixa do Quadro */}
              <rect x="10" y="10" width="520" height="740" rx="28" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3" />
              <rect x="25" y="25" width="490" height="710" rx="20" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />

              {/* Marcações de Parafuso e Cantos do Quadro */}
              <circle cx="35" cy="35" r="5" fill="#cbd5e1" />
              <circle cx="505" cy="35" r="5" fill="#cbd5e1" />
              <circle cx="35" cy="725" r="5" fill="#cbd5e1" />
              <circle cx="505" cy="725" r="5" fill="#cbd5e1" />

              {/* Barramento Neutro Lateral Esquerdo (Azul) */}
              <g transform="translate(32, 100)">
                <rect x="0" y="0" width="16" height="540" rx="4" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
                <text x="8" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0284c7">N</text>
                {Array.from({ length: 22 }).map((_, i) => (
                  <circle key={i} cx="8" cy={20 + i * 23} r="3" fill="#0284c7" />
                ))}
              </g>

              {/* Barramento Terra Lateral Direito (Verde) */}
              <g transform="translate(492, 100)">
                <rect x="0" y="0" width="16" height="540" rx="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" />
                <text x="8" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#16a34a">PE</text>
                {Array.from({ length: 22 }).map((_, i) => (
                  <circle key={i} cx="8" cy={20 + i * 23} r="3" fill="#16a34a" />
                ))}
              </g>

              {/* FIOS DE ALIMENTAÇÃO PRINCIPAL ENTRANDO PELO TOPO */}
              {/* Fio Neutro Azul */}
              <path d="M 60 0 L 60 70 L 40 70 L 40 100" fill="none" stroke="#0284c7" strokeWidth="4" />
              {/* Fases Entrando no DPS e Geral */}
              <path d="M 120 0 L 120 170" fill="none" stroke="#0f172a" strokeWidth="4" />
              <path d="M 135 0 L 135 170" fill="none" stroke="#dc2626" strokeWidth="4" />
              <path d="M 150 0 L 150 170" fill="none" stroke="#64748b" strokeWidth="4" />

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TRILHO 01 (SUPERIOR) - DPS + GERAL + CIRCUITOS C1..C4      */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <g transform="translate(65, 170)">
                {/* Trilho Metálico DIN */}
                <rect x="0" y="30" width="410" height="35" rx="3" fill="url(#trilhoDinPattern)" />

                {/* 1. DPS Tetrapolar (Vermelho) */}
                <g transform="translate(10, 0)">
                  <rect x="0" y="0" width="76" height="100" rx="4" fill="url(#dpsGrad)" stroke="#991b1b" strokeWidth="1.5" />
                  {/* Etiqueta Amarela DPS */}
                  <rect x="18" y="16" width="40" height="16" rx="3" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                  <text x="38" y="28" textAnchor="middle" fontSize="9" fontWeight="900" fill="#713f12">DPS</text>
                  {/* 4 Módulos de Cartuchos Plugáveis com Status Verde */}
                  {[0, 19, 38, 57].map((offset, idx) => (
                    <g key={idx} transform={`translate(${offset + 2}, 42)`}>
                      <rect x="0" y="0" width="15" height="42" rx="2" fill="#b91c1c" stroke="#7f1d1d" />
                      <rect x="3" y="10" width="9" height="12" rx="1" fill="#22c55e" />
                      <text x="7.5" y="34" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#ffffff">45kA</text>
                    </g>
                  ))}
                  <text x="38" y="93" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fecaca">CLASSE II</text>
                </g>

                {/* 2. Disjuntor Geral Tripolar (Branco com Manopla Preta) */}
                <g transform="translate(100, 0)">
                  <rect x="0" y="0" width="58" height="100" rx="4" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
                  {/* Manoplas */}
                  <rect x="8" y="40" width="42" height="18" rx="3" fill="#0f172a" />
                  {/* Etiqueta Amarela GERAL */}
                  <rect x="8" y="14" width="42" height="16" rx="3" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                  <text x="29" y="26" textAnchor="middle" fontSize="8" fontWeight="900" fill="#713f12">GERAL</text>
                  <text x="29" y="80" textAnchor="middle" fontSize="10" fontWeight="900" fill="#0f172a">C63</text>
                  <text x="29" y="92" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#64748b">3P 380V</text>
                </g>

                {/* 3. Disjuntores C1, C2, C3, C4 */}
                <g transform="translate(170, 0)">
                  {/* C1 (1P) */}
                  <g transform="translate(0, 0)">
                    <rect x="0" y="0" width="20" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="4" y="42" width="12" height="16" rx="2" fill="#0f172a" />
                    <rect x="2" y="16" width="16" height="14" rx="2" fill="#facc15" />
                    <text x="10" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill="#713f12">C1</text>
                    <text x="10" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">B10</text>
                  </g>

                  {/* C2 (1P) */}
                  <g transform="translate(26, 0)">
                    <rect x="0" y="0" width="20" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="4" y="42" width="12" height="16" rx="2" fill="#0f172a" />
                    <rect x="2" y="16" width="16" height="14" rx="2" fill="#facc15" />
                    <text x="10" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill="#713f12">C2</text>
                    <text x="10" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">B16</text>
                  </g>

                  {/* C3 (2P) */}
                  <g transform="translate(52, 0)">
                    <rect x="0" y="0" width="38" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="6" y="42" width="26" height="16" rx="2" fill="#0f172a" />
                    <rect x="5" y="16" width="28" height="14" rx="2" fill="#facc15" />
                    <text x="19" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill="#713f12">C3</text>
                    <text x="19" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">C20</text>
                    <text x="19" y="90" textAnchor="middle" fontSize="6" fill="#64748b">AR 01</text>
                  </g>

                  {/* C4 (2P) */}
                  <g transform="translate(96, 0)">
                    <rect x="0" y="0" width="38" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="6" y="42" width="26" height="16" rx="2" fill="#0f172a" />
                    <rect x="5" y="16" width="28" height="14" rx="2" fill="#facc15" />
                    <text x="19" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill="#713f12">C4</text>
                    <text x="19" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">C20</text>
                    <text x="19" y="90" textAnchor="middle" fontSize="6" fill="#64748b">AR 02</text>
                  </g>
                </g>
              </g>

              {/* BARRAMENTO PENTE PRETO E VERMELHO INTERLIGANDO TRILHO 01 E 02 */}
              <path d="M 180 270 L 180 370 L 220 370 L 220 440" fill="none" stroke="#0f172a" strokeWidth="6" />
              <path d="M 210 270 L 210 390 L 320 390 L 320 440" fill="none" stroke="#dc2626" strokeWidth="6" />

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TRILHO 02 (INFERIOR) - DR + CARREGADOR EV + TOMADAS / C5..C7 */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <g transform="translate(65, 440)">
                {/* Trilho Metálico DIN */}
                <rect x="0" y="30" width="410" height="35" rx="3" fill="url(#trilhoDinPattern)" />

                {/* 1. Interruptor DR Tetrapolar (com botão teste vermelho) */}
                <g transform="translate(20, 0)">
                  <rect x="0" y="0" width="76" height="100" rx="4" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
                  {/* Botão de Teste DR (Vermelho) */}
                  <rect x="10" y="44" width="14" height="14" rx="2" fill="#dc2626" />
                  <text x="17" y="54" textAnchor="middle" fontSize="7" fontWeight="black" fill="#ffffff">T</text>
                  {/* Alavanca DR */}
                  <rect x="32" y="40" width="36" height="18" rx="2" fill="#0f172a" />
                  {/* Etiqueta Amarela DR */}
                  <rect x="18" y="14" width="40" height="16" rx="3" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                  <text x="38" y="26" textAnchor="middle" fontSize="9" fontWeight="900" fill="#713f12">DR</text>
                  <text x="44" y="80" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">63A</text>
                  <text x="44" y="92" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#dc2626">30mA</text>
                </g>

                {/* 2. Disjuntor Dedicado WALLBOX EV (Carregador Veicular) */}
                <g transform="translate(110, 0)">
                  <rect x="0" y="0" width="44" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#00BFA5" strokeWidth="2" />
                  <rect x="8" y="40" width="28" height="18" rx="2" fill="#00BFA5" />
                  {/* Etiqueta Verde/Amarela EV */}
                  <rect x="4" y="14" width="36" height="16" rx="3" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                  <text x="22" y="25" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#713f12">WALLBOX</text>
                  <text x="22" y="78" textAnchor="middle" fontSize="9" fontWeight="900" fill="#0f172a">C32</text>
                  <text x="22" y="90" textAnchor="middle" fontSize="6.5" fontWeight="black" fill="#00BFA5">7.4 kW</text>
                </g>

                {/* 3. Disjuntores C5, C6, C7 */}
                <g transform="translate(168, 0)">
                  {/* C5 (1P) */}
                  <g transform="translate(0, 0)">
                    <rect x="0" y="0" width="20" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="4" y="42" width="12" height="16" rx="2" fill="#0f172a" />
                    <rect x="2" y="16" width="16" height="14" rx="2" fill="#facc15" />
                    <text x="10" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill="#713f12">C5</text>
                    <text x="10" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">B20</text>
                  </g>

                  {/* C6 (1P) */}
                  <g transform="translate(26, 0)">
                    <rect x="0" y="0" width="20" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="4" y="42" width="12" height="16" rx="2" fill="#0f172a" />
                    <rect x="2" y="16" width="16" height="14" rx="2" fill="#facc15" />
                    <text x="10" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill="#713f12">C6</text>
                    <text x="10" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">B16</text>
                  </g>

                  {/* C7 - Chuveiro (2P) */}
                  <g transform="translate(52, 0)">
                    <rect x="0" y="0" width="38" height="100" rx="3" fill="url(#disjuntorGrad)" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="6" y="42" width="26" height="16" rx="2" fill="#0f172a" />
                    <rect x="5" y="16" width="28" height="14" rx="2" fill="#facc15" />
                    <text x="19" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill="#713f12">C7</text>
                    <text x="19" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">B32</text>
                    <text x="19" y="90" textAnchor="middle" fontSize="6" fill="#64748b">CHUVEIRO</text>
                  </g>
                </g>
              </g>

              {/* Fios de Saída dos Circuitos (Indo para Cargas) */}
              <path d="M 245 540 L 245 700 L 485 700" fill="none" stroke="#16a34a" strokeWidth="3" strokeDasharray="4,2" />
              <path d="M 235 540 L 235 680 L 50 680" fill="none" stroke="#0284c7" strokeWidth="3" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Aba de Quadro de Cargas Balanceado NBR 5410 ───────────────── */}
      {activeTab === "QUADRO_CARGAS" && (
        <div className={`p-6 ${isDark ? "bg-[#0b1329]" : "bg-white"}`}>
          {/* Card de Resumo de Balanço de Fases e Proteção Geral */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div
              className={`p-4 rounded-xl border ${
                isDark ? "bg-[#111c3a] border-slate-700/60" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Potência Total</div>
              <div className="text-xl font-black font-mono mt-1 text-[#00BFA5]">
                {(quadroDimensionado.potenciaTotalInstaladaW / 1000).toFixed(1)} kW
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Ib Geral: {quadroDimensionado.correnteGeralCalculadaA} A
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isDark ? "bg-[#111c3a] border-slate-700/60" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Balanço por Fase (R / S / T)</div>
              <div className="text-xs font-mono font-bold mt-1.5 flex justify-between gap-1">
                <span className="text-slate-200">R: {(quadroDimensionado.potenciaPorFaseW.R / 1000).toFixed(1)}kW</span>
                <span className="text-red-400">S: {(quadroDimensionado.potenciaPorFaseW.S / 1000).toFixed(1)}kW</span>
                <span className="text-blue-400">T: {(quadroDimensionado.potenciaPorFaseW.T / 1000).toFixed(1)}kW</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-bold mt-1">
                Desbalanceamento: {quadroDimensionado.desbalanceamentoFasesPct}% (Ideal &lt; 10%)
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isDark ? "bg-[#111c3a] border-slate-700/60" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Disjuntor Geral</div>
              <div className="text-lg font-black font-mono mt-1 text-amber-400 flex items-center gap-1.5">
                {quadroDimensionado.disjuntorGeral.correnteNominalA}A Tripolar
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {quadroDimensionado.disjuntorGeral.tipo === "CAIXA_MOLDADA"
                  ? "Caixa Moldada (MCCB 25kA) Barramento"
                  : "Mini-Disjuntor DIN 10kA"}
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isDark ? "bg-[#111c3a] border-slate-700/60" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Coordenação DPS Classe II</div>
              <div className="text-lg font-black font-mono mt-1 text-red-400">4x 45kA / 275V</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                Ligação Equipotencial PE Direta
              </div>
            </div>
          </div>

          {/* Tabela de Cargas Estruturada NBR 5410 com Zebra Striping e Fontes Numéricas Tabulares */}
          <div
            className={`overflow-x-auto rounded-xl border ${
              isDark ? "border-slate-800 bg-[#0f172a]" : "border-slate-200 bg-white"
            }`}
          >
            <table className="w-full text-left text-xs font-sans">
              <thead
                className={`uppercase font-bold text-[11px] tracking-wider border-b ${
                  isDark
                    ? "bg-[#16223f] text-slate-300 border-slate-800"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <tr>
                  <th className="p-3">Circ.</th>
                  <th className="p-3">Descrição da Carga</th>
                  <th className="p-3 text-right">Potência</th>
                  <th className="p-3 text-center">Fase</th>
                  <th className="p-3 text-right">Ib (A)</th>
                  <th className="p-3 text-center">Disjuntor In</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3 text-center">Cabo (mm²)</th>
                  <th className="p-3 text-right">ΔV%</th>
                  <th className="p-3 text-center">Proteção DR</th>
                </tr>
              </thead>
              <tbody className={isDark ? "divide-y divide-slate-800/80" : "divide-y divide-slate-100"}>
                {quadroDimensionado.circuitos.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`transition-colors font-mono text-[11px] ${
                      isDark
                        ? i % 2 === 0
                          ? "bg-[#0b1329]/80 hover:bg-[#16223f]"
                          : "bg-[#0f172a]/80 hover:bg-[#16223f]"
                        : i % 2 === 0
                        ? "bg-white hover:bg-slate-50"
                        : "bg-slate-50/60 hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-3 font-bold text-amber-500">{c.tag}</td>
                    <td className="p-3 font-sans font-medium text-slate-200">{c.descricao}</td>
                    <td className="p-3 text-right font-bold text-slate-300">
                      {(c.potenciaW || 0) >= 1000
                        ? `${((c.potenciaW || 0) / 1000).toFixed(1)} kW`
                        : `${c.potenciaW || 0} W`}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          c.faseAlocada === "R"
                            ? "bg-slate-700 text-slate-200"
                            : c.faseAlocada === "S"
                            ? "bg-red-900/60 text-red-300"
                            : c.faseAlocada === "T"
                            ? "bg-blue-900/60 text-blue-300"
                            : "bg-purple-900/60 text-purple-300"
                        }`}
                      >
                        {c.faseAlocada}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-200">{c.correnteNominalA} A</td>
                    <td className="p-3 text-center font-black text-amber-400">
                      {c.curvaDisjuntor}
                      {c.correnteNominalA} ({c.polos}P)
                    </td>
                    <td className="p-3 text-center text-[10px] text-slate-400 font-sans">
                      {c.aparato === "CAIXA_MOLDADA" ? "Caixa Moldada" : "DIN"}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-400">
                      {c.bitolaCaboMm2} mm²
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        (c.quedaTensaoPct || 0) <= 2.5
                          ? "text-emerald-400"
                          : (c.quedaTensaoPct || 0) <= 4.0
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {c.quedaTensaoPct}%
                    </td>
                    <td className="p-3 text-center">
                      {c.drProtecao ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800">
                          DR {c.sensibilidadeDrMA}mA
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Aba de Lista de Materiais (BOM) ──────────────────────────────── */}
      {activeTab === "MATERIAIS" && (
        <div className={`p-6 ${isDark ? "bg-[#0b1329]" : "bg-white"}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Lista Quantitativa de Materiais Elétricos
              </h3>
              <p className="text-xs text-slate-400">
                Pronta para cotação em distribuidores (Steck, Schneider, Weg, Clamper)
              </p>
            </div>
            <button
              onClick={handleCopyBom}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {copiedBom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedBom ? "Copiado!" : "Copiar Lista"}
            </button>
          </div>

          <div
            className={`overflow-x-auto rounded-xl border ${
              isDark ? "border-slate-800 bg-[#0f172a]" : "border-slate-200 bg-white"
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead
                className={`uppercase font-bold border-b ${
                  isDark
                    ? "bg-[#16223f] text-slate-300 border-slate-800"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item / Componente</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-center">Unid.</th>
                  <th className="p-3">Especificação Técnica</th>
                </tr>
              </thead>
              <tbody className={isDark ? "divide-y divide-slate-800/80" : "divide-y divide-slate-100"}>
                {quadroDimensionado.resumoMateriais.map((mat, i) => (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      isDark
                        ? i % 2 === 0
                          ? "bg-[#0b1329]/80 hover:bg-[#16223f]"
                          : "bg-[#0f172a]/80 hover:bg-[#16223f]"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                    <td className={`p-3 font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{mat.item}</td>
                    <td className="p-3 text-center font-black text-[#f15a24]">{mat.quantidade}</td>
                    <td className="p-3 text-center font-semibold text-slate-400">{mat.unidade}</td>
                    <td className={`p-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{mat.especificacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
