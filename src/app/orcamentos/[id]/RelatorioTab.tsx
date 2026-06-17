"use client";

import { useState, useMemo } from "react";
import { 
  FileText, Printer, Package, Wrench, Coins, LayoutList, BarChart2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function RelatorioTab({ orcamento }: { orcamento: any }) {
  const [reportView, setReportView] = useState<"analitico" | "simplificado">("analitico");

  // 1. Processar dados do orçamento
  const analysisData = useMemo(() => {
    let totalMateriais = 0;
    let totalMaoDeObra = 0;
    let totalGeral = 0;

    const etapasResumo = (orcamento.etapas || []).map((etapa: any, idx: number) => {
      let materiaisEtapa = 0;
      let maoDeObraEtapa = 0;

      etapa.itens?.forEach((item: any) => {
        const totalItem = (item.quantidade || 0) * (item.precoBaseUnitario || 0);
        const tipoLimpo = (item.tipo || "").toLowerCase().trim();
        
        if (tipoLimpo === "mão de obra") {
          maoDeObraEtapa += totalItem;
        } else {
          materiaisEtapa += totalItem;
        }
      });

      const totalEtapa = materiaisEtapa + maoDeObraEtapa;
      totalMateriais += materiaisEtapa;
      totalMaoDeObra += maoDeObraEtapa;
      totalGeral += totalEtapa;

      return {
        numero: idx + 1,
        nome: etapa.nome,
        materiais: materiaisEtapa,
        maoDeObra: maoDeObraEtapa,
        total: totalEtapa
      };
    });

    const pctMateriais = totalGeral > 0 ? (totalMateriais / totalGeral) * 100 : 0;
    const pctMaoDeObra = totalGeral > 0 ? (totalMaoDeObra / totalGeral) * 100 : 0;

    return {
      totalMateriais,
      totalMaoDeObra,
      totalGeral,
      pctMateriais,
      pctMaoDeObra,
      etapasResumo
    };
  }, [orcamento]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString("pt-BR");

    if (reportView === "simplificado") {
      // Relatório Simplificado
      const stagesList = analysisData.etapasResumo.map((e: any) => `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; font-size: 14px;">
          <span style="font-weight: 700; background: #fff; padding-right: 5px; color: #334155;">${e.numero}. ${e.nome}</span>
          <span style="flex-grow: 1; border-bottom: 2px dotted #cbd5e1; margin: 0 5px 3px 5px; min-width: 50px;"></span>
          <span style="font-weight: 900; background: #fff; padding-left: 5px; color: #0f172a; min-width: 120px; text-align: right;">R$ ${e.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      `).join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório CAPEX Simplificado - ${orcamento.nome}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
              body {
                font-family: 'Montserrat', sans-serif;
                color: #0f172a;
                background: #fff;
                padding: 50px;
                margin: 0;
              }
              .header {
                border-bottom: 2px solid #0f172a;
                padding-bottom: 20px;
                margin-bottom: 40px;
              }
              .title {
                font-size: 22px;
                font-weight: 900;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: -0.5px;
              }
              .meta {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                font-weight: 700;
                color: #475569;
                margin-top: 15px;
              }
              .summary-box {
                margin-top: 50px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 24px;
                border-radius: 16px;
                max-width: 450px;
                margin-left: auto;
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 13px;
                color: #475569;
                font-weight: 700;
              }
              .summary-row.total {
                margin-bottom: 0;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 2px solid #cbd5e1;
                font-size: 16px;
                color: #0f172a;
                font-weight: 900;
              }
              .footer {
                text-align: center;
                font-size: 9px;
                color: #94a3b8;
                font-weight: 700;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-top: 100px;
                border-top: 1px solid #f1f5f9;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Relatório Simplificado de CAPEX</div>
              <div class="meta">
                <div>Projeto: <strong style="color: #0f172a;">${orcamento.nome.toUpperCase()}</strong></div>
                <div>Cliente: <strong style="color: #0f172a;">${orcamento.cliente || "Geral"}</strong></div>
                <div>Emissão: <strong style="color: #0f172a;">${dateStr}</strong></div>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 25px;">Custos por Etapas</h3>
              ${stagesList}
            </div>

            <div class="summary-box">
              <div class="summary-row">
                <span>Total de Insumos / Materiais:</span>
                <span>R$ ${analysisData.totalMateriais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row">
                <span>Total de Mão de Obra / Serviços:</span>
                <span>R$ ${analysisData.totalMaoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row total">
                <span>TOTAL GERAL DO PROJETO:</span>
                <span>R$ ${analysisData.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div class="footer">
              Cordeiro Energia - Sistema de Gestão de CAPEX
            </div>

            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
    } else {
      // Relatório Analítico (Completo)
      const stagesRows = analysisData.etapasResumo.map((e: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: 700; color: #1e293b;">${e.numero}. ${e.nome}</td>
          <td style="padding: 12px; text-align: right;">R$ ${e.materiais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 12px; text-align: right;">R$ ${e.maoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 12px; text-align: right; font-weight: 900; color: #1e3a8a;">R$ ${e.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 12px; text-align: right; font-weight: 700;">${analysisData.totalGeral > 0 ? ((e.total / analysisData.totalGeral) * 100).toFixed(1) : "0.0"}%</td>
        </tr>
      `).join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório CAPEX Analítico - ${orcamento.nome}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
              body {
                font-family: 'Montserrat', sans-serif;
                color: #0f172a;
                background: #fff;
                padding: 40px;
                margin: 0;
              }
              .header {
                border-bottom: 3px solid #1e3a8a;
                padding-bottom: 20px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .title {
                font-size: 24px;
                font-weight: 900;
                color: #1e3a8a;
                text-transform: uppercase;
              }
              .subtitle {
                font-size: 12px;
                color: #64748b;
                font-weight: 700;
                margin-top: 5px;
              }
              .kpi-container {
                display: grid;
                grid-template-cols: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 40px;
              }
              .kpi-card {
                border: 1px solid #e2e8f0;
                padding: 20px;
                border-radius: 16px;
                background: #f8fafc;
              }
              .kpi-title {
                font-size: 10px;
                font-weight: 900;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .kpi-val {
                font-size: 20px;
                font-weight: 900;
                color: #1e3a8a;
                margin-top: 8px;
              }
              .kpi-sub {
                font-size: 11px;
                color: #00bfa5;
                font-weight: 700;
                margin-top: 4px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
              }
              th {
                background: #1e3a8a;
                color: #fff;
                text-align: left;
                padding: 12px;
                font-weight: 900;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              td {
                padding: 12px;
                font-size: 12px;
              }
              .total-row {
                background: #f1f5f9;
                font-weight: 950;
                border-top: 2px solid #1e3a8a;
              }
              .footer {
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                font-weight: 700;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-top: 50px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">Cordeiro Energia | CAPEX</div>
                <div class="subtitle">Relatório Analítico de Custos de Projeto</div>
              </div>
              <div style="text-align: right; font-size: 11px; font-weight: 700; color: #64748b;">
                <div>Projeto: ${orcamento.nome.toUpperCase()}</div>
                <div>Cliente: ${orcamento.cliente || "Geral"}</div>
                <div>Data de Emissão: ${dateStr}</div>
              </div>
            </div>

            <div class="kpi-container">
              <div class="kpi-card">
                <div class="kpi-title">Materiais & Equipamentos</div>
                <div class="kpi-val">R$ ${analysisData.totalMateriais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div class="kpi-sub">${analysisData.pctMateriais.toFixed(1)}% do projeto</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Mão de Obra & Serviços</div>
                <div class="kpi-val">R$ ${analysisData.totalMaoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div class="kpi-sub" style="color: #1e3a8a;">${analysisData.pctMaoDeObra.toFixed(1)}% do projeto</div>
              </div>
              <div class="kpi-card" style="background: #1e3a8a; border-color: #1e3a8a; color: #fff;">
                <div class="kpi-title" style="color: #93c5fd;">Total Geral do Projeto</div>
                <div class="kpi-val" style="color: #fff; font-size: 22px;">R$ ${analysisData.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div class="kpi-sub" style="color: #38bdf8;">100% CAPEX</div>
              </div>
            </div>

            <table style="width: 100%;">
              <thead>
                <tr>
                  <th>Etapa</th>
                  <th style="text-align: right;">Materiais (R$)</th>
                  <th style="text-align: right;">Mão de Obra (R$)</th>
                  <th style="text-align: right;">Total da Etapa (R$)</th>
                  <th style="text-align: right;">Peso (%)</th>
                </tr>
              </thead>
              <tbody>
                ${stagesRows}
                <tr class="total-row">
                  <td style="padding: 12px; font-weight: 900;">TOTAL CONSOLIDADO</td>
                  <td style="padding: 12px; text-align: right; font-weight: 900;">R$ ${analysisData.totalMateriais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 900;">R$ ${analysisData.totalMaoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 900; color: #1e3a8a;">R$ ${analysisData.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 900;">100.0%</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              Cordeiro Energia - Sistema Integrado de Gestão
            </div>

            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
    }

    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1E3A8A]" /> Relatório de CAPEX
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {reportView === "analitico" 
              ? "Análise de custos consolidada por etapas e distribuição entre insumos e serviços." 
              : "Visualização simplificada das etapas físicas e totalizações do projeto."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle View */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportView("analitico")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                reportView === "analitico"
                  ? "bg-white text-slate-900 shadow-sm scale-105"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Analítico
            </button>
            <button
              onClick={() => setReportView("simplificado")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                reportView === "simplificado"
                  ? "bg-white text-slate-900 shadow-sm scale-105"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Simplificado
            </button>
          </div>

          <button 
            onClick={handlePrint}
            className="bg-[#1E3A8A] hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Printer className="w-4 h-4" /> Exportar {reportView === "analitico" ? "Completo" : "Simplificado"}
          </button>
        </div>
      </div>

      {reportView === "simplificado" ? (
        // ── LAYOUT SIMPLIFICADO ───────────────────────────────────────────
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-10 space-y-8 max-w-3xl mx-auto shadow-sm">
          {/* Report Header */}
          <div className="border-b border-slate-100 pb-6">
            <span className="text-[10px] font-black text-[#00BFA5] uppercase tracking-widest">Relatório Simplificado</span>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mt-1">{orcamento.nome}</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
              Cliente: <span className="text-slate-700">{orcamento.cliente || "Geral"}</span>
            </p>
          </div>

          {/* Dotted Stages List */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Etapas do Projeto e Custos</h3>
            {analysisData.etapasResumo.map((e: any) => (
              <div key={e.numero} className="flex justify-between items-end text-sm">
                <span className="font-bold text-slate-700 bg-white pr-2 z-10">{e.numero}. {e.nome}</span>
                <span className="flex-grow border-b-2 border-slate-200 border-dotted mx-2 mb-1"></span>
                <span className="font-black text-[#1E3A8A] bg-white pl-2 z-10 min-w-[120px] text-right">
                  R$ {e.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          {/* Totals Summary Box */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 max-w-md ml-auto mt-10">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1E3A8A]" /> Total de Materiais:
              </span>
              <span className="text-slate-700 font-extrabold text-sm">
                R$ {analysisData.totalMateriais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#00BFA5]" /> Total de Mão de Obra:
              </span>
              <span className="text-slate-700 font-extrabold text-sm">
                R$ {analysisData.totalMaoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#00BFA5]" /> TOTAL GERAL:
              </span>
              <span className="text-xl font-black text-[#1E3A8A]">
                R$ {analysisData.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        // ── LAYOUT ANALÍTICO COMPLETO ──────────────────────────────────────
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Materials Card */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insumos & Materiais</span>
                <Package className="w-5 h-5 text-[#1E3A8A]" />
              </div>
              <div className="my-4">
                <p className="text-3xl font-black text-slate-800 tracking-tighter">
                  R$ {analysisData.totalMateriais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E3A8A] uppercase">
                <span>{analysisData.pctMateriais.toFixed(1)}% do orçamento</span>
              </div>
            </div>

            {/* Labor Card */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mão de Obra & Serviços</span>
                <Wrench className="w-5 h-5 text-[#00BFA5]" />
              </div>
              <div className="my-4">
                <p className="text-3xl font-black text-slate-800 tracking-tighter">
                  R$ {analysisData.totalMaoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#00BFA5] uppercase">
                <span>{analysisData.pctMaoDeObra.toFixed(1)}% do orçamento</span>
              </div>
            </div>

            {/* Grand Total Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-[2rem] border border-slate-800 flex flex-col justify-between text-white shadow-lg shadow-slate-950/20">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">CAPEX Consolidado</span>
                <Coins className="w-5 h-5 text-[#00BFA5]" />
              </div>
              <div className="my-4">
                <p className="text-3xl font-black text-[#00BFA5] tracking-tighter">
                  R$ {analysisData.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Meta Base (EAP)
              </div>
            </div>

          </div>

          {/* Visual Cost split progress meter */}
          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Divisão Geral do Orçamento</h3>
            <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${analysisData.pctMateriais}%` }} 
                className="bg-[#1E3A8A] flex items-center justify-center text-[10px] font-black text-white"
                title={`Materiais: ${analysisData.pctMateriais.toFixed(1)}%`}
              >
                {analysisData.pctMateriais > 15 && `Materiais: ${analysisData.pctMateriais.toFixed(1)}%`}
              </div>
              <div 
                style={{ width: `${analysisData.pctMaoDeObra}%` }} 
                className="bg-[#00BFA5] flex items-center justify-center text-[10px] font-black text-white"
                title={`Mão de Obra: ${analysisData.pctMaoDeObra.toFixed(1)}%`}
              >
                {analysisData.pctMaoDeObra > 15 && `Mão de Obra: ${analysisData.pctMaoDeObra.toFixed(1)}%`}
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A]"></div>
                <span>Materiais: R$ {analysisData.totalMateriais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00BFA5]"></div>
                <span>Mão de Obra: R$ {analysisData.totalMaoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Double Column Chart by Stage & Breakdown card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recharts Bar Chart */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] space-y-6">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-base">Composição de Custos por Etapa</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Comparação visual do custo de Insumos vs Serviços</p>
              </div>

              <div className="h-[280px]">
                {analysisData.etapasResumo.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData.etapasResumo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="nome" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: any) => `R$ ${parseFloat(value).toFixed(2)}`} contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }} />
                      <Bar name="Materiais" dataKey="materiais" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                      <Bar name="Mão de Obra" dataKey="maoDeObra" fill="#00BFA5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-xl">
                    Sem etapas para exibição gráfica
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Breakdown List */}
            <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] flex flex-col justify-between">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-base">Representatividade EAP</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Peso de cada etapa no total do CAPEX</p>
              </div>

              <div className="my-6 space-y-3 overflow-y-auto max-h-[200px] pr-1 custom-scrollbar">
                {analysisData.etapasResumo.map((e: any) => {
                  const weight = analysisData.totalGeral > 0 ? (e.total / analysisData.totalGeral) * 100 : 0;
                  return (
                    <div key={e.numero} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 uppercase truncate">{e.numero}. {e.nome}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                          Mat: R$ {e.materiais.toFixed(0)} | M.O: R$ {e.maoDeObra.toFixed(0)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-black text-[#1E3A8A]">R$ {e.total.toFixed(0)}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">{weight.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status do Relatório</span>
                <p className="text-xs font-bold text-slate-600 mt-1 italic">Mapeamento concluído com base nos itens cadastrados na planilha do projeto.</p>
              </div>
            </div>

          </div>

          {/* Stage Breakdown Summary Table */}
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#1E3A8A] uppercase tracking-widest">Resumo Detalhado por Etapa</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Estrutura consolidada de custos e faturamento da obra</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-4">Etapa</th>
                    <th className="px-6 py-4 text-right">Custos Materiais (R$)</th>
                    <th className="px-6 py-4 text-right">Custos Mão de Obra (R$)</th>
                    <th className="px-6 py-4 text-right">Total Acumulado (R$)</th>
                    <th className="px-6 py-4 text-right">Representação (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analysisData.etapasResumo.map((e: any) => {
                    const weight = analysisData.totalGeral > 0 ? (e.total / analysisData.totalGeral) * 100 : 0;
                    return (
                      <tr key={e.numero} className="hover:bg-slate-50/30">
                        <td className="px-6 py-4 font-black text-slate-800">{e.numero}. {e.nome}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">
                          R$ {e.materiais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">
                          R$ {e.maoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-[#1E3A8A]">
                          R$ {e.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-400">
                          {weight.toFixed(2)} %
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                    <td className="px-6 py-4 font-black text-slate-900">TOTAL CONSOLIDADO</td>
                    <td className="px-6 py-4 text-right font-black text-slate-700">
                      R$ {analysisData.totalMateriais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700">
                      R$ {analysisData.totalMaoDeObra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-[#1E3A8A] text-base">
                      R$ {analysisData.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      100.00 %
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
