"use client";

import React, { useState } from "react";
import { 
  Zap, Plus, Trash2, FileText, CheckCircle2, 
  AlertCircle, Sparkles, Upload, Loader2, Info, 
  Sliders, Shield, ChevronRight, X, Search, 
  ExternalLink, ArrowUpRight, Cpu
} from "lucide-react";
import { ConfiguredCharger, ChargerDatasheet } from "@/lib/coenergygo";
import { 
  HOMOLOGATED_CHARGERS, 
  searchChargers, 
  filterChargersByType 
} from "@/lib/ev/chargersDatabase";

interface ChargerCatalogSelectorProps {
  chargers: ConfiguredCharger[];
  onAddCharger: (charger: ConfiguredCharger) => void;
  onUpdateCharger: (id: string, updated: Partial<ConfiguredCharger>) => void;
  onRemoveCharger: (id: string) => void;
}

export default function ChargerCatalogSelector({
  chargers,
  onAddCharger,
  onUpdateCharger,
  onRemoveCharger
}: ChargerCatalogSelectorProps) {
  // Estados de navegação e filtros
  const [activeBrandFilter, setActiveBrandFilter] = useState<"ALL" | "WEG" | "BENY" | "AC" | "DC">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatasheet, setSelectedDatasheet] = useState<ChargerDatasheet | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Estados do upload de datasheet
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadStatus, setPdfUploadStatus] = useState<string | null>(null);
  const [extractedCharger, setExtractedCharger] = useState<Partial<ChargerDatasheet> | null>(null);

  // Estado do formulário manual
  const [manualForm, setManualForm] = useState({
    brand: "WEG",
    model: "Carregador Customizado",
    powerKW: 22,
    phases: 3 as 1 | 3,
    voltageV: 380,
    currentInA: 32,
    efficiencyPercent: 98.5,
    powerFactor: 0.98,
    thdiPercent: 3.5,
    connectorType: "Tipo 2",
    type: "AC" as "AC" | "DC",
    ipRating: "IP54",
    ikRating: "IK10",
    hasBuiltinRDCDD: true,
    hasBuiltinEPO: false,
    protocolOCPP: "OCPP 1.6J"
  });

  // Filtragem dos carregadores do catálogo
  const filteredCatalog = HOMOLOGATED_CHARGERS.filter(item => {
    // Filtro de marca / tipo
    if (activeBrandFilter === "WEG" && item.brand !== "WEG") return false;
    if (activeBrandFilter === "BENY" && item.brand !== "BENY") return false;
    if (activeBrandFilter === "AC" && (item.powerKW > 44 || item.connectorType.includes("CCS"))) return false;
    if (activeBrandFilter === "DC" && (item.powerKW <= 44 && !item.connectorType.includes("CCS"))) return false;

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBrand = item.brand.toLowerCase().includes(q);
      const matchModel = item.model.toLowerCase().includes(q);
      const matchPower = item.powerKW.toString().includes(q);
      const matchConnector = item.connectorType.toLowerCase().includes(q);
      return matchBrand || matchModel || matchPower || matchConnector;
    }
    return true;
  });

  // Manipulador para adicionar modelo do catálogo
  const handleAddFromCatalog = (model: ChargerDatasheet) => {
    const isDC = model.powerKW >= 30 || model.connectorType.includes("CCS");
    const newCharger: ConfiguredCharger = {
      id: "chg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: `${model.brand} ${model.model}`,
      brand: model.brand,
      model: model.model,
      powerKW: model.powerKW,
      phases: model.phases,
      voltage: model.voltageV,
      type: isDC ? "DC" : "AC",
      quantity: 1,
      connector: model.connectorType,
      currentInA: model.currentInA,
      efficiencyPercent: model.efficiencyPercent,
      powerFactor: model.powerFactor,
      thdiPercent: model.thdiPercent,
      datasheet: model
    };
    onAddCharger(newCharger);
  };

  // Manipulador para envio do PDF de Datasheet
  const handleUploadDatasheetPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPdf(true);
      setPdfUploadStatus("Lendo e analisando parâmetros elétricos do datasheet com IA...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ev/charger-datasheet-parser", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao processar datasheet em PDF");
      }

      const result = await res.json();
      if (result.success && result.datasheet) {
        setExtractedCharger(result.datasheet);
        setPdfUploadStatus("Datasheet processado com sucesso!");
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao ler datasheet: " + (err.message || "Verifique o arquivo PDF"));
      setPdfUploadStatus(null);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Confirmar adição do carregador extraído por PDF
  const handleConfirmExtractedCharger = () => {
    if (!extractedCharger) return;

    const power = extractedCharger.powerKW || 22;
    const isDC = power >= 30 || (extractedCharger.connectorType && extractedCharger.connectorType.includes("CCS"));

    const fullDatasheet: ChargerDatasheet = {
      id: "pdf_" + Date.now(),
      brand: extractedCharger.brand || "Importado",
      model: extractedCharger.model || "Carregador Importado",
      series: extractedCharger.series || "Linha Comercial",
      powerKW: power,
      phases: extractedCharger.phases || 3,
      voltageV: extractedCharger.voltageV || (isDC ? 380 : 220),
      currentInA: extractedCharger.currentInA || Math.round((power * 1000) / (Math.sqrt(3) * 380 * 0.98)),
      efficiencyPercent: extractedCharger.efficiencyPercent || 95.5,
      powerFactor: extractedCharger.powerFactor || 0.98,
      thdiPercent: extractedCharger.thdiPercent || 4.5,
      connectorType: extractedCharger.connectorType || (isDC ? "CCS2" : "Tipo 2"),
      connectorsCount: extractedCharger.connectorsCount || 1,
      coolingType: extractedCharger.coolingType || (isDC ? "ar_forcado" : "natural"),
      ipRating: extractedCharger.ipRating || "IP54",
      ikRating: extractedCharger.ikRating || "IK10",
      hasBuiltinRDCDD: Boolean(extractedCharger.hasBuiltinRDCDD ?? true),
      hasBuiltinEPO: Boolean(extractedCharger.hasBuiltinEPO ?? isDC),
      protocolOCPP: extractedCharger.protocolOCPP || "OCPP 1.6J"
    };

    const newCharger: ConfiguredCharger = {
      id: "chg_" + Date.now(),
      name: `${fullDatasheet.brand} ${fullDatasheet.model}`,
      brand: fullDatasheet.brand,
      model: fullDatasheet.model,
      powerKW: fullDatasheet.powerKW,
      phases: fullDatasheet.phases,
      voltage: fullDatasheet.voltageV,
      type: isDC ? "DC" : "AC",
      quantity: 1,
      connector: fullDatasheet.connectorType,
      currentInA: fullDatasheet.currentInA,
      efficiencyPercent: fullDatasheet.efficiencyPercent,
      powerFactor: fullDatasheet.powerFactor,
      thdiPercent: fullDatasheet.thdiPercent,
      datasheet: fullDatasheet
    };

    onAddCharger(newCharger);
    setShowPdfModal(false);
    setExtractedCharger(null);
    setPdfUploadStatus(null);
  };

  // Confirmar adição manual
  const handleConfirmManualCharger = () => {
    const isDC = manualForm.type === "DC" || manualForm.powerKW >= 30;
    const fullDatasheet: ChargerDatasheet = {
      id: "man_" + Date.now(),
      brand: manualForm.brand,
      model: manualForm.model,
      series: "Personalizado",
      powerKW: manualForm.powerKW,
      phases: manualForm.phases,
      voltageV: manualForm.voltageV,
      currentInA: manualForm.currentInA,
      efficiencyPercent: manualForm.efficiencyPercent,
      powerFactor: manualForm.powerFactor,
      thdiPercent: manualForm.thdiPercent,
      connectorType: manualForm.connectorType,
      connectorsCount: 1,
      coolingType: isDC ? "ar_forcado" : "natural",
      ipRating: manualForm.ipRating,
      ikRating: manualForm.ikRating,
      hasBuiltinRDCDD: manualForm.hasBuiltinRDCDD,
      hasBuiltinEPO: manualForm.hasBuiltinEPO,
      protocolOCPP: manualForm.protocolOCPP
    };

    const newCharger: ConfiguredCharger = {
      id: "chg_" + Date.now(),
      name: `${manualForm.brand} ${manualForm.model}`,
      brand: manualForm.brand,
      model: manualForm.model,
      powerKW: manualForm.powerKW,
      phases: manualForm.phases,
      voltage: manualForm.voltageV,
      type: isDC ? "DC" : "AC",
      quantity: 1,
      connector: manualForm.connectorType,
      currentInA: manualForm.currentInA,
      efficiencyPercent: manualForm.efficiencyPercent,
      powerFactor: manualForm.powerFactor,
      thdiPercent: manualForm.thdiPercent,
      datasheet: fullDatasheet
    };

    onAddCharger(newCharger);
    setShowManualModal(false);
  };

  const totalInstalledKW = chargers.reduce((acc, c) => acc + (c.powerKW * c.quantity), 0);
  const totalPoints = chargers.reduce((acc, c) => acc + c.quantity, 0);

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
              Parque de Recarga
            </span>
            <span className="text-xs text-slate-400">Passo 1A.3</span>
          </div>
          <h2 className="text-xl font-bold text-[#0A192F] mt-1">
            Catálogo Técnico & Configuração dos Carregadores
          </h2>
          <p className="text-xs text-slate-500">
            Adicione estações de recarga WEG / BENY homologadas, cadastre modelos personalizados ou importe o PDF do datasheet via IA.
          </p>
        </div>

        {/* Resumo da Potência Configurada */}
        <div className="flex items-center gap-3 bg-slate-50 p-2 px-3.5 rounded-2xl border border-slate-200/80">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Potência Total</div>
            <div className="text-lg font-black text-[#E45318]">{totalInstalledKW.toFixed(1)} kW</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Pontos / Conectores</div>
            <div className="text-lg font-black text-[#0A192F]">{totalPoints} un.</div>
          </div>
        </div>
      </div>

      {/* ─── 1. LISTA DOS CARREGADORES SELECIONADOS NO PROJETO ───────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#E45318]" />
            Carregadores Alocados no Projeto ({chargers.length})
          </h3>
          <div className="flex items-center gap-2">
            {/* Botão Adicionar Manual */}
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              Adicionar Manualmente
            </button>

            {/* Botão Upload Datasheet IA */}
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-[#E45318] hover:bg-orange-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E45318]" />
              Importar Datasheet PDF (IA)
            </button>
          </div>
        </div>

        {chargers.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Nenhum carregador adicionado ainda.</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Selecione um dos modelos WEG ou BENY homologados abaixo, utilize um modelo rápido ou faça upload do PDF do fabricante.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {chargers.map((chg) => {
              const itemTotalKW = chg.powerKW * chg.quantity;
              const isDC = chg.type === "DC" || chg.powerKW >= 30;

              return (
                <div 
                  key={chg.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between gap-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isDC ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {isDC ? "DC Rápido" : "AC Semi-rápido"}
                        </span>
                        {chg.brand && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {chg.brand}
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#E45318]">
                          {chg.powerKW} kW cada
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#0A192F] mt-1.5 leading-snug">
                        {chg.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {chg.connector} • {chg.voltage}V • {chg.phases === 3 ? "Trifásico" : "Monofásico"}
                        {chg.currentInA ? ` • Corrente máx: ${chg.currentInA}A` : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveCharger(chg.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remover carregador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Parâmetros Elétricos do Datasheet & Controles */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      {chg.datasheet ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDatasheet(chg.datasheet!)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer underline decoration-dotted"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ficha Técnica / Datasheet
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {chg.efficiencyPercent ? `η: ${chg.efficiencyPercent}%` : ""} 
                          {chg.powerFactor ? ` • FP: ${chg.powerFactor}` : ""}
                        </span>
                      )}
                    </div>

                    {/* Controle de Quantidade */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Qtd:</span>
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => onUpdateCharger(chg.id, { quantity: Math.max(1, chg.quantity - 1) })}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-bold text-[#0A192F] bg-white border-x border-slate-200">
                          {chg.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateCharger(chg.id, { quantity: chg.quantity + 1 })}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-black text-[#0A192F] min-w-[55px] text-right">
                        = {itemTotalKW.toFixed(1)} kW
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 2. CATÁLOGO DE CARREGADORES HOMOLOGADOS (WEG & BENY) ───────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#00B356]" />
              Catálogo Oficial Homologado (WEG WEMOB & BENY Electric)
            </h3>
            <p className="text-[11px] text-slate-500">
              Modelos com parâmetros elétricos certificados (eficiência, corrente máxima de entrada e distorção harmônica).
            </p>
          </div>

          {/* Campo de Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar modelo ou potência..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#0A192F] focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Filtros por Fabricante e Tipo */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2">
          {[
            { id: "ALL", label: "Todos os Modelos" },
            { id: "WEG", label: "WEG WEMOB (Easy / Wall / Parking / Station / HPC)" },
            { id: "BENY", label: "BENY Electric (BCP / BDC Fast)" },
            { id: "AC", label: "Somente AC (7.4 kW a 44 kW)" },
            { id: "DC", label: "Somente DC Rápido (30 kW a 320 kW)" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveBrandFilter(tab.id as any)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeBrandFilter === tab.id
                  ? "bg-[#0A192F] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grade de Modelos Homologados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filteredCatalog.map((item) => {
            const isDC = item.powerKW >= 30 || item.connectorType.includes("CCS");

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {item.brand} • {item.series}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      isDC ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {item.powerKW} kW {isDC ? "DC" : "AC"}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-[#0A192F] mt-1.5 line-clamp-1">
                    {item.model}
                  </h4>

                  <div className="text-[10px] text-slate-500 space-y-0.5 mt-1">
                    <div>Entrada: {item.currentInA}A • {item.voltageV}V ({item.phases === 3 ? "Trifásico" : "Monofásico"})</div>
                    <div>Conector: {item.connectorType}</div>
                    <div>Eficiência: {item.efficiencyPercent}% • FP: {item.powerFactor} • THDi: {item.thdiPercent}%</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDatasheet(item)}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3 h-3" /> Ficha Técnica
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddFromCatalog(item)}
                    className="text-xs font-bold px-2.5 py-1 bg-[#00B356] hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MODAL 1: FICHA TÉCNICA DETALHADA DO DATASHEET ───────────────────── */}
      {selectedDatasheet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Ficha Técnica Certificada
                </span>
                <h3 className="text-lg font-bold text-[#0A192F] mt-0.5">
                  {selectedDatasheet.brand} {selectedDatasheet.model}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDatasheet(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Potência Nominal</span>
                <div className="text-sm font-black text-[#E45318]">{selectedDatasheet.powerKW} kW</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Corrente Máx. Entrada</span>
                <div className="text-sm font-black text-[#0A192F]">{selectedDatasheet.currentInA} A</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tensão & Fases</span>
                <div className="text-sm font-bold text-slate-700">
                  {selectedDatasheet.voltageV}V • {selectedDatasheet.phases === 3 ? "Trifásico" : "Monofásico"}
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Eficiência Elétrica (η)</span>
                <div className="text-sm font-bold text-emerald-600">{selectedDatasheet.efficiencyPercent}%</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Fator de Potência (cos φ)</span>
                <div className="text-sm font-bold text-slate-700">≥ {selectedDatasheet.powerFactor}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Distorção Harmônica (THDi)</span>
                <div className="text-sm font-bold text-slate-700">≤ {selectedDatasheet.thdiPercent}%</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Conector</span>
                <div className="text-sm font-bold text-slate-700">{selectedDatasheet.connectorType}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Grau de Proteção</span>
                <div className="text-sm font-bold text-slate-700">{selectedDatasheet.ipRating} / {selectedDatasheet.ikRating}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div><strong>Refrigeração:</strong> {selectedDatasheet.coolingType}</div>
              <div><strong>Proteção RDC-DD 6mA CC:</strong> {selectedDatasheet.hasBuiltinRDCDD ? "Embutida de Fábrica (IEC 62955)" : "Externa no QGBT"}</div>
              <div><strong>Botão EPO de Emergência:</strong> {selectedDatasheet.hasBuiltinEPO ? "Integrado no Painel Frontal" : "Externo via botoeira"}</div>
              <div><strong>Protocolo de Gerenciamento:</strong> {selectedDatasheet.protocolOCPP}</div>
              {selectedDatasheet.datasheetPdfUrl && (
                <div className="pt-1 text-slate-500">
                  <em>Manual de Referência: {selectedDatasheet.datasheetPdfUrl}</em>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDatasheet(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddFromCatalog(selectedDatasheet);
                  setSelectedDatasheet(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-[#00B356] hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Adicionar à Instalação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CADASTRO MANUAL DE NOVO CARREGADOR ─────────────────────── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-50 px-2 py-0.5 rounded-full">
                  Novo Equipamento
                </span>
                <h3 className="text-lg font-bold text-[#0A192F] mt-0.5">
                  Cadastrar Carregador Manualmente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Fabricante:</label>
                <input
                  type="text"
                  value={manualForm.brand}
                  onChange={(e) => setManualForm({ ...manualForm, brand: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Modelo Comercial:</label>
                <input
                  type="text"
                  value={manualForm.model}
                  onChange={(e) => setManualForm({ ...manualForm, model: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Potência Nominal (kW):</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.powerKW}
                  onChange={(e) => {
                    const kw = parseFloat(e.target.value) || 0;
                    const calculatedA = Math.round((kw * 1000) / (manualForm.phases === 3 ? (Math.sqrt(3) * manualForm.voltageV) : manualForm.voltageV));
                    setManualForm({ 
                      ...manualForm, 
                      powerKW: kw, 
                      currentInA: calculatedA || manualForm.currentInA,
                      type: kw >= 30 ? "DC" : "AC"
                    });
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Corrente Máx. Entrada (A):</label>
                <input
                  type="number"
                  value={manualForm.currentInA}
                  onChange={(e) => setManualForm({ ...manualForm, currentInA: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Fases & Alimentação:</label>
                <select
                  value={manualForm.phases}
                  onChange={(e) => setManualForm({ ...manualForm, phases: parseInt(e.target.value) as 1 | 3 })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value={1}>Monofásico / Bifásico (220V)</option>
                  <option value={3}>Trifásico (380V)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Recarga:</label>
                <select
                  value={manualForm.type}
                  onChange={(e) => setManualForm({ ...manualForm, type: e.target.value as "AC" | "DC" })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="AC">AC (Corrente Alternada)</option>
                  <option value="DC">DC (Corrente Contínua Rápida)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Conector:</label>
                <select
                  value={manualForm.connectorType}
                  onChange={(e) => setManualForm({ ...manualForm, connectorType: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="Tipo 2">Tipo 2 (Mennekes - Padrão AC Brasil)</option>
                  <option value="CCS2">CCS2 (Combo 2 - Padrão DC Brasil)</option>
                  <option value="GB/T">GB/T (Chinês)</option>
                  <option value="CHAdeMO">CHAdeMO (Japonês)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Eficiência Elétrica (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.efficiencyPercent}
                  onChange={(e) => setManualForm({ ...manualForm, efficiencyPercent: parseFloat(e.target.value) || 98 })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmManualCharger}
                className="px-4 py-2 text-xs font-bold bg-[#E45318] hover:bg-orange-600 text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" /> Salvar Carregador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: IMPORTAÇÃO DE DATASHEET EM PDF VIA IA ─────────────────── */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#E45318]" /> Leitor Inteligente Gemini Vision
                </span>
                <h3 className="text-lg font-bold text-[#0A192F] mt-0.5">
                  Importar Datasheet do Fabricante em PDF
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPdfModal(false);
                  setExtractedCharger(null);
                  setPdfUploadStatus(null);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Área de Upload */}
            <div className="p-6 border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-2xl text-center space-y-3">
              <input
                type="file"
                id="datasheet-pdf-file"
                accept=".pdf,application/pdf"
                onChange={handleUploadDatasheetPdf}
                disabled={isUploadingPdf}
                className="hidden"
              />
              <label
                htmlFor="datasheet-pdf-file"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                {isUploadingPdf ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-[#E45318] animate-spin mb-2" />
                    <span className="text-xs font-bold text-[#0A192F]">{pdfUploadStatus}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#E45318] mb-2" />
                    <span className="text-xs font-bold text-[#0A192F]">
                      Clique para selecionar o PDF do Datasheet
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Compatível com catálogos WEG, BENY, ABB, Schneider, Wallbox, etc.
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Preview dos dados extraídos pela IA */}
            {extractedCharger && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Parâmetros Identificados
                  </span>
                  <span>{extractedCharger.brand} {extractedCharger.model}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200">
                  <div><strong>Potência:</strong> {extractedCharger.powerKW} kW</div>
                  <div><strong>Corrente Entrada:</strong> {extractedCharger.currentInA} A</div>
                  <div><strong>Tensão / Fases:</strong> {extractedCharger.voltageV}V ({extractedCharger.phases}F)</div>
                  <div><strong>Eficiência:</strong> {extractedCharger.efficiencyPercent}%</div>
                  <div><strong>Fator Potência:</strong> {extractedCharger.powerFactor}</div>
                  <div><strong>THDi:</strong> {extractedCharger.thdiPercent}%</div>
                  <div><strong>Conector:</strong> {extractedCharger.connectorType}</div>
                  <div><strong>Grau IP/IK:</strong> {extractedCharger.ipRating} / {extractedCharger.ikRating}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowPdfModal(false);
                  setExtractedCharger(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              {extractedCharger && (
                <button
                  type="button"
                  onClick={handleConfirmExtractedCharger}
                  className="px-4 py-2 text-xs font-bold bg-[#00B356] hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Adicionar Carregador ao Projeto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

