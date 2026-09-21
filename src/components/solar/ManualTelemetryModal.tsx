"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader,
  Zap,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ManualTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  defaultUsinaId?: string;
  usinasList?: Array<{ id: string; nome: string; apiFornecedor: string }>;
}

export default function ManualTelemetryModal({
  isOpen,
  onClose,
  onSuccess,
  defaultUsinaId,
  usinasList = [],
}: ManualTelemetryModalProps) {
  const [usinaId, setUsinaId] = useState<string>(defaultUsinaId || "");
  const [activeTab, setActiveTab] = useState<"clipboard" | "file">("clipboard");
  const [clipboardText, setClipboardText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Preview dos dados analisados
  const [preview, setPreview] = useState<{
    totalRows: number;
    headers: string[];
    samples: any[][];
    datesFound: string[];
    maxKW: number;
    totalKWhEst: number;
  } | null>(null);

  useEffect(() => {
    if (defaultUsinaId) {
      setUsinaId(defaultUsinaId);
    } else if (usinasList.length > 0 && !usinaId) {
      setUsinaId(usinasList[0].id);
    }
  }, [defaultUsinaId, usinasList]);

  if (!isOpen) return null;

  // Analisa texto colado do Excel no frontend para dar feedback imediato
  const handleAnalyzeClipboard = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!clipboardText.trim()) {
      setErrorMsg("Cole o conteúdo copiado da tabela do Excel no campo abaixo.");
      return;
    }

    setIsParsing(true);
    try {
      const isTab = clipboardText.includes("\t");
      const isSemicolon = !isTab && clipboardText.includes(";");
      const lines = clipboardText.trim().split(/\r?\n/);

      if (lines.length < 2) {
        throw new Error("O texto colado deve ter pelo menos a linha de cabeçalho e uma linha de dados.");
      }

      const rows: string[][] = lines.map((l) => {
        if (isTab) return l.split("\t").map((c) => c.trim());
        if (isSemicolon) return l.split(";").map((c) => c.trim());
        return l.split(",").map((c) => c.trim());
      });

      processRowsForPreview(rows);
    } catch (e: any) {
      setErrorMsg(e.message || "Erro ao interpretar o texto colado.");
    } finally {
      setIsParsing(false);
    }
  };

  // Analisa arquivo Excel selecionado no frontend
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      let targetSheet = wb.SheetNames[0];
      for (const name of wb.SheetNames) {
        const n = name.toLowerCase();
        if (n.includes("consolidado") || n.includes("telemetria") || n.includes("usina") || n.includes("dados")) {
          targetSheet = name;
          break;
        }
      }

      const ws = wb.Sheets[targetSheet];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd hh:mm:ss" });

      if (data.length < 2) {
        throw new Error("A planilha deve conter cabeçalho e dados de telemetria.");
      }

      processRowsForPreview(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao ler o arquivo Excel.");
    } finally {
      setIsParsing(false);
    }
  };

  const processRowsForPreview = (rows: any[][]) => {
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = rows[i].map((c) => String(c).toLowerCase()).join(" ");
      if (
        rowStr.includes("hora") ||
        rowStr.includes("tempo") ||
        rowStr.includes("time") ||
        rowStr.includes("data") ||
        rowStr.includes("poten") ||
        rowStr.includes("saída") ||
        rowStr.includes("saida") ||
        rowStr.includes("power")
      ) {
        headerIdx = i;
        break;
      }
    }

    const headers = rows[headerIdx].map((h: any) => String(h || "").trim());
    const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length > 0 && r.some((c) => String(c).trim()));

    // Identifica coluna de tempo e potência
    let colTime = 0;
    let colPot = 1;
    headers.forEach((h, idx) => {
      const hLow = h.toLowerCase();
      if (hLow.includes("hora") || hLow.includes("tempo") || hLow.includes("time") || hLow.includes("data")) {
        colTime = idx;
      }
      if (
        hLow.includes("potência") ||
        hLow.includes("potencia") ||
        hLow.includes("power") ||
        hLow.includes("saída pv") ||
        hLow.includes("saida pv") ||
        hLow.includes("ativa")
      ) {
        colPot = idx;
      }
    });

    const datesFound = new Set<string>();
    let maxKW = 0;
    let sumKW = 0;

    dataRows.forEach((r) => {
      const tVal = String(r[colTime] || "");
      const dMatch = tVal.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/) || tVal.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{4})/);
      if (dMatch) datesFound.add(dMatch[1]);

      let potVal = parseFloat(String(r[colPot] || "0").replace(",", ".")) || 0;
      if (potVal > 3000) potVal = potVal / 1000;
      if (potVal > maxKW) maxKW = potVal;
      sumKW += potVal;
    });

    // Estimativa de energia (assumindo 5 min = 1/12 hora por ponto)
    const totalKWhEst = sumKW * (5 / 60);

    setPreview({
      totalRows: dataRows.length,
      headers: headers.slice(0, 8),
      samples: dataRows.slice(0, 5).map((r) => r.slice(0, 8)),
      datesFound: Array.from(datesFound),
      maxKW: parseFloat(maxKW.toFixed(2)),
      totalKWhEst: parseFloat(totalKWhEst.toFixed(1)),
    });
  };

  const handleSaveToDatabase = async () => {
    if (!usinaId) {
      setErrorMsg("Selecione a usina solar correspondente.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let res: Response;

      if (activeTab === "clipboard") {
        res = await fetch("/api/solar/telemetria/import-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usinaId,
            clipboardText,
            defaultDate,
          }),
        });
      } else {
        if (!selectedFile) {
          throw new Error("Selecione um arquivo Excel para enviar.");
        }
        const fd = new FormData();
        fd.append("file", selectedFile);
        fd.append("usinaId", usinaId);
        fd.append("defaultDate", defaultDate);

        res = await fetch("/api/solar/telemetria/import-manual", {
          method: "POST",
          body: fd,
        });
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha ao gravar no banco de dados.");
      }

      setSuccessMsg(json.mensagem || "Dados importados e gravados com sucesso!");
      onSuccess(json);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao salvar telemetria.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-slate-100">
        {/* Cabeçalho */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Importação Manual de Telemetria (Excel)
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Huawei FusionSolar & SolisCloud
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cole diretamente a tabela do Excel ou faça upload de relatórios baixados para gravar minuto a minuto no banco de dados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 font-sans text-xs">
          {/* Seletor de Usina */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Usina Solar de Destino *
              </label>
              <select
                value={usinaId}
                onChange={(e) => setUsinaId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="">Selecione a Usina...</option>
                {usinasList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.apiFornecedor})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Data Padrão (caso a planilha tenha apenas Horários)
              </label>
              <input
                type="date"
                value={defaultDate}
                onChange={(e) => setDefaultDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Abas: Colar vs Upload */}
          <div className="flex border-b border-slate-800 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("clipboard");
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "clipboard"
                  ? "border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clipboard className="w-4 h-4" />
              📋 Colar do Excel (Ctrl+V)
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("file");
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "file"
                  ? "border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Upload className="w-4 h-4" />
              📁 Upload de Planilha (.xlsx, .csv)
            </button>
          </div>

          {/* Conteúdo da Aba 1: Colar do Excel */}
          {activeTab === "clipboard" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Abra a tabela no Excel, selecione as linhas e colunas (incluindo o cabeçalho), dê <strong>Ctrl+C</strong> e cole abaixo com <strong>Ctrl+V</strong>:
                </span>
                <button
                  type="button"
                  onClick={handleAnalyzeClipboard}
                  disabled={isParsing || !clipboardText.trim()}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isParsing ? <Loader className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                  Analisar Conteúdo Colado
                </button>
              </div>

              <textarea
                rows={8}
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                placeholder="Exemplo colado do Excel:&#10;Horário&#9;Potência de saída (kW)&#9;Rendimento do dia (kWh)&#10;2026-05-07 06:00:00&#9;0,000&#9;0,00&#10;2026-05-07 13:25:00&#9;209,297&#9;5120,40&#10;2026-05-07 18:00:00&#9;0,000&#9;8030,00"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3.5 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Conteúdo da Aba 2: Upload de Arquivo */}
          {activeTab === "file" && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Selecione o arquivo Excel exportado do portal <strong>FusionSolar</strong> (Huawei) ou <strong>SolisCloud</strong>:
              </p>

              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-6 text-center transition-all bg-slate-950/50">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  id="excel-file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="excel-file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer gap-2"
                >
                  <Upload className="w-8 h-8 text-amber-400 animate-bounce" />
                  <span className="text-xs font-bold text-white">
                    {selectedFile ? selectedFile.name : "Clique para selecionar a planilha Excel (.xlsx, .csv)"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Compatível com relatórios de telemetria de 5 minutos da Huawei e Solis
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Painel de Pré-visualização (Data Preview) */}
          {preview && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Pré-visualização dos Dados
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-amber-400">
                    📊 <strong>{preview.totalRows}</strong> medições
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-emerald-400">
                    ⚡ Pico: <strong>{preview.maxKW} kW</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-cyan-400">
                    ☀️ Energia Est.: <strong>{preview.totalKWhEst} kWh</strong>
                  </span>
                </div>
              </div>

              {preview.datesFound.length > 0 && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Datas identificadas:</span>
                  {preview.datesFound.slice(0, 5).map((d) => (
                    <span key={d} className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white text-[10px]">
                      {d}
                    </span>
                  ))}
                  {preview.datesFound.length > 5 && <span>(+{preview.datesFound.length - 5} datas)</span>}
                </div>
              )}

              {/* Tabela de Amostra */}
              <div className="overflow-x-auto max-h-44 border border-slate-800 rounded-xl">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      {preview.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 font-semibold">
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                    {preview.samples.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 text-slate-300 truncate max-w-[160px]">
                            {String(cell ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensagens de Alerta ou Sucesso */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Rodapé com Botões */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSaving || !preview || preview.totalRows === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isSaving ? "Gravando no Banco de Dados..." : "💾 Gravar Telemetria no Banco de Dados"}
          </button>
        </div>
      </div>
    </div>
  );
}
