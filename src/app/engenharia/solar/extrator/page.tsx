"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sun,
  Database,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Filter,
  AlertTriangle,
  Zap,
  TrendingUp,
  Thermometer,
  Activity,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Layers,
  Cpu,
  Plus,
  Save,
  Loader,
  Settings,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import clsx from "clsx";
import * as XLSX from "xlsx";
import CardFabricantesConsolidado from "@/components/solar/CardFabricantesConsolidado";

interface TelemetriaItem {
  id: string;
  telemetriaId: string;
  usinaId: string;
  usinaNome: string;
  apiFornecedor: string;
  tipoLinha: "INDIVIDUAL" | "CONSOLIDADO";
  inversorSN: string;
  inversorModelo: string;
  timestamp: string;
  timestampFormatted: string;
  hora: string;
  potenciaAtivaKW: number;
  potenciaCCTotalKW: number;
  energiaAcumuladaKWh: number;
  tensaoCA_A: number;
  tensaoCA_B: number;
  tensaoCA_C: number;
  correnteCA_A: number;
  correnteCA_B: number;
  correnteCA_C: number;
  frequenciaRede: number;
  tempIGBT: number;
  statusInversor: string;
  dadosStrings: Record<string, { V: number; I: number }>;
}

interface AlarmeItem {
  id: string;
  usinaId: string;
  usinaNome: string;
  apiFornecedor: string;
  codigo: string;
  descricao: string;
  gravidade: string;
  status: string;
  solucaoSugerida: string;
  timestamp: string;
  timestampFormatted: string;
}

interface InversorItem {
  id: string;
  numeroSerie: string;
  modelo: string;
  usinaId: string;
  usinaNome: string;
  apiFornecedor: string;
}

interface UsinaItem {
  id: string;
  nome: string;
  apiFornecedor: string;
  inversores: Array<{
    id: string;
    numeroSerie: string;
    modelo: string;
  }>;
}

export default function SolarExtratorPage() {
  const router = useRouter();
  const getTodayStr = () => new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>(getTodayStr());
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [selectedUsina, setSelectedUsina] = useState<string>("");
  const [selectedInversor, setSelectedInversor] = useState<string>("");
  const [plataforma, setPlataforma] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [usinas, setUsinas] = useState<UsinaItem[]>([]);
  const [todosInversores, setTodosInversores] = useState<InversorItem[]>([]);
  const [telemetria, setTelemetria] = useState<TelemetriaItem[]>([]);
  const [alarmes, setAlarmes] = useState<AlarmeItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"planilha" | "alarmes" | "graficos">("planilha");
  const [selectedRow, setSelectedRow] = useState<TelemetriaItem | null>(null);
  const [isTableMaximized, setIsTableMaximized] = useState<boolean>(false);

  // Estados para Agregação e Relatórios Consolidados (Dia / Mês / Ano)
  const [viewPeriod, setViewPeriod] = useState<"DIA" | "MES" | "ANO">("DIA");
  const [consolidadoData, setConsolidadoData] = useState<any>(null);
  const [loadingConsolidado, setLoadingConsolidado] = useState<boolean>(false);

  // Configuração do Auto-Sync
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(180); // 180s = 3 minutos padrão
  const [countdown, setCountdown] = useState<number>(180);

  // Estados para o Modal de Cadastro de Usina
  const [isUsinaModalOpen, setIsUsinaModalOpen] = useState<boolean>(false);
  const [editingUsina, setEditingUsina] = useState<any>(null);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [estacoes, setEstacoes] = useState<any[]>([]);
  const [discoveredUsinas, setDiscoveredUsinas] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoverySearch, setDiscoverySearch] = useState<string>("");
  const [discoveryStatusMsg, setDiscoveryStatusMsg] = useState<string | null>(null);
  const [savingUsina, setSavingUsina] = useState<boolean>(false);
  const [usinaErrorMsg, setUsinaErrorMsg] = useState<string | null>(null);

  const initialUsinaForm = {
    nome: "",
    capacidadeKWp: 0,
    apiFornecedor: "HUAWEI",
    apiId: "",
    apiKey: "",
    apiSecret: "",
    coefSujidade: 0.03,
    coefTemperatura: -0.0035,
    taxaDegradacao: 0.005,
    estacaoId: "",
    latitude: "",
    longitude: "",
    modoIrradiancia: "ESTACAO",
    localizacao: "",
    inclinacao: 10,
    orientacao: "180",
  };

  const [newUsinaForm, setNewUsinaForm] = useState(initialUsinaForm);

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const [mRes, eRes] = await Promise.all([
        fetch("/api/solar/manufacturers"),
        fetch("/api/solar/estacoes"),
      ]);
      if (mRes.ok) {
        const mData = await mRes.json();
        setManufacturers(Array.isArray(mData) ? mData : []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEstacoes(Array.isArray(eData) ? eData : []);
      }
    } catch (e) {
      console.warn("Erro ao buscar dados auxiliares:", e);
    }
  }, []);

  const [seedingManufacturers, setSeedingManufacturers] = useState<boolean>(false);

  const handleSeedManufacturers = async () => {
    setSeedingManufacturers(true);
    try {
      const res = await fetch("/api/solar/manufacturers/seed");
      if (res.ok) {
        await fetchAuxiliaryData();
        setDiscoveryStatusMsg("✓ Lista padrão de 13 fabricantes (Hoymiles, Huawei, Solis, Canadian, Sungrow, etc.) restaurada com sucesso!");
      } else {
        setDiscoveryStatusMsg("❌ Falha ao restaurar lista padrão de fabricantes.");
      }
    } catch (e) {
      setDiscoveryStatusMsg("❌ Erro de conexão ao restaurar fabricantes.");
    } finally {
      setSeedingManufacturers(false);
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData]);

  const openNewUsinaModal = (usinaToEdit?: any) => {
    fetchAuxiliaryData();
    setUsinaErrorMsg(null);
    setDiscoveryStatusMsg(null);
    setDiscoveredUsinas([]);
    setDiscoverySearch("");

    if (usinaToEdit) {
      setEditingUsina(usinaToEdit);
      setNewUsinaForm({
        nome: usinaToEdit.nome || "",
        capacidadeKWp: usinaToEdit.capacidadeKWp || 0,
        apiFornecedor: usinaToEdit.apiFornecedor || "HUAWEI",
        apiId: usinaToEdit.apiId || "",
        apiKey: usinaToEdit.apiKey || "",
        apiSecret: usinaToEdit.apiSecret ? "********" : "",
        coefSujidade: usinaToEdit.coefSujidade ?? 0.03,
        coefTemperatura: usinaToEdit.coefTemperatura ?? -0.0035,
        taxaDegradacao: usinaToEdit.taxaDegradacao ?? 0.005,
        estacaoId: usinaToEdit.estacaoId || "",
        latitude: usinaToEdit.latitude !== null && usinaToEdit.latitude !== undefined ? usinaToEdit.latitude.toString() : "",
        longitude: usinaToEdit.longitude !== null && usinaToEdit.longitude !== undefined ? usinaToEdit.longitude.toString() : "",
        modoIrradiancia: usinaToEdit.modoIrradiancia || "ESTACAO",
        localizacao: usinaToEdit.localizacao || "",
        inclinacao: usinaToEdit.inclinacao !== null && usinaToEdit.inclinacao !== undefined ? usinaToEdit.inclinacao : 10,
        orientacao: usinaToEdit.orientacao || "180",
      });
    } else {
      setEditingUsina(null);
      setNewUsinaForm(initialUsinaForm);
    }
    setIsUsinaModalOpen(true);
  };

  const handleDiscoverUsinaPortal = async (vendor?: string) => {
    const fornecedor = vendor || newUsinaForm.apiFornecedor || "ALL";
    setIsDiscovering(true);
    setDiscoveredUsinas([]);
    setDiscoverySearch("");
    setDiscoveryStatusMsg(null);
    try {
      let queryUrl = `/api/solar/usinas/discover?fornecedor=${encodeURIComponent(fornecedor)}&t=${Date.now()}`;

      if (newUsinaForm.apiKey && !newUsinaForm.apiKey.includes("*")) {
        queryUrl += `&user=${encodeURIComponent(newUsinaForm.apiKey.trim())}`;
      }
      if (newUsinaForm.apiSecret && !newUsinaForm.apiSecret.includes("*")) {
        queryUrl += `&pass=${encodeURIComponent(newUsinaForm.apiSecret.trim())}`;
      }

      const res = await fetch(queryUrl);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setDiscoveredUsinas(data);
        setDiscoveryStatusMsg(`✓ ${data.length} usina(s) localizada(s) nos portais.`);
      } else {
        setDiscoveryStatusMsg("⚠️ Nenhuma usina encontrada nos portais. Certifique-se de que as APIs (Huawei/Solis) possuem credenciais salvas em Configurações.");
      }
    } catch (e) {
      setDiscoveryStatusMsg("❌ Falha na conexão com os portais de monitoramento.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSaveUsina = async (formDataOverride?: any) => {
    const payload = formDataOverride || newUsinaForm;
    if (!payload.nome || !payload.nome.trim()) {
      setUsinaErrorMsg("Preencha o Nome da Usina.");
      return;
    }
    setSavingUsina(true);
    setUsinaErrorMsg(null);

    try {
      const url = editingUsina ? `/api/solar/usinas?id=${editingUsina.id}` : "/api/solar/usinas";
      const method = editingUsina ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        setIsUsinaModalOpen(false);
        await fetchData(false);
        if (saved && saved.id) {
          setSelectedUsina(saved.id);
        }
        fetch("/api/solar/sync").catch(() => {});
      } else {
        const errorData = await res.json().catch(() => ({}));
        setUsinaErrorMsg(errorData.error || "Erro ao salvar usina.");
      }
    } catch (err) {
      setUsinaErrorMsg("Erro de conexão ao salvar usina.");
    } finally {
      setSavingUsina(false);
    }
  };

  const handleSelectDiscoveredUsina = (d: any, autoSubmit: boolean = false) => {
    const rawCap = parseFloat(d.capacidade) || 0;
    const capKWp = rawCap > 0 
      ? (rawCap < 100 ? Math.round(rawCap * 1000 * 100) / 100 : rawCap)
      : newUsinaForm.capacidadeKWp;

    const updatedForm = {
      ...newUsinaForm,
      nome: d.nome || `Usina ${d.id}`,
      capacidadeKWp: capKWp,
      apiId: d.id,
      apiFornecedor: d.fornecedor || newUsinaForm.apiFornecedor || "HUAWEI",
      localizacao: d.localizacao || newUsinaForm.localizacao || "",
    };

    setNewUsinaForm(updatedForm);
    setDiscoveryStatusMsg(`✓ Usina "${updatedForm.nome}" selecionada (${capKWp > 0 ? capKWp + " kWp" : "ID " + d.id})! Dados preenchidos abaixo.`);

    if (autoSubmit) {
      handleSaveUsina(updatedForm);
    } else {
      setTimeout(() => {
        const el = document.getElementById("usina-form-fields");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  };

  // Carregar dados da API
  const fetchData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const params = new URLSearchParams({
          date,
          startTime,
          endTime,
          usinaId: selectedUsina,
          inverterSn: selectedInversor,
          plataforma,
        });

        const res = await fetch(`/api/solar/extrator?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setUsinas(data.usinas || []);
          setTodosInversores(data.todosInversores || []);
          setTelemetria(data.telemetria || []);
          setAlarmes(data.alarmes || []);
        }
      } catch (err) {
        console.error("Erro ao carregar dados de telemetria:", err);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [date, startTime, endTime, selectedUsina, selectedInversor, plataforma]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchConsolidadoData = useCallback(async () => {
    setLoadingConsolidado(true);
    try {
      const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
      const month = date ? new Date(date).getMonth() + 1 : new Date().getMonth() + 1;

      const params = new URLSearchParams({
        usinaId: selectedUsina,
        periodo: viewPeriod,
        ano: year.toString(),
        mes: month.toString(),
      });

      const res = await fetch(`/api/solar/relatorios/consolidado?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setConsolidadoData(data);
      }
    } catch (e) {
      console.warn("Erro ao buscar relatório consolidado:", e);
    } finally {
      setLoadingConsolidado(false);
    }
  }, [selectedUsina, viewPeriod, date]);

  useEffect(() => {
    if (activeTab === "graficos") {
      fetchConsolidadoData();
    }
  }, [activeTab, fetchConsolidadoData]);

  // Sincronização ao vivo manual
  const handleLiveSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/solar/extrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plataforma, usinaId: selectedUsina }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData(false);
        setCountdown(autoSyncInterval);
      }
    } catch (err) {
      console.error("Erro ao sincronizar ao vivo:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Cronômetro do Auto-Sync
  useEffect(() => {
    if (autoSyncInterval <= 0) return;

    setCountdown(autoSyncInterval);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData(false);
          return autoSyncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSyncInterval, fetchData]);

  // Inversores disponíveis da usina selecionada
  const availableInverters = React.useMemo(() => {
    if (!selectedUsina) {
      return todosInversores;
    }
    return todosInversores.filter((inv) => inv.usinaId === selectedUsina);
  }, [todosInversores, selectedUsina]);

  // Filtragem na busca textual
  const filteredTelemetria = React.useMemo(() => {
    if (!searchQuery.trim()) return telemetria;
    const q = searchQuery.toLowerCase();
    return telemetria.filter(
      (t) =>
        t.usinaNome.toLowerCase().includes(q) ||
        t.inversorSN.toLowerCase().includes(q) ||
        t.apiFornecedor.toLowerCase().includes(q) ||
        t.statusInversor.toLowerCase().includes(q) ||
        t.tipoLinha.toLowerCase().includes(q)
    );
  }, [telemetria, searchQuery]);

  // Cálculo Dinâmico de KPIs do Mostrador baseado no Inversor ou Usina Consolidada Selecionada
  const dynamicSummary = React.useMemo(() => {
    if (filteredTelemetria.length === 0) {
      return {
        energiaTotalKWh: 0,
        potenciaPicoKW: 0,
        temperaturaMaxC: 0,
        mediaTensaoCA: "0.0",
        totalLeituras: 0,
        totalAlarmes: alarmes.length,
        scopeLabel: selectedInversor
          ? selectedInversor === "CONSOLIDADO"
            ? "Total Consolidado da Usina"
            : `Inversor ${selectedInversor}`
          : "Usina Consolidada",
      };
    }

    let targetRows = filteredTelemetria;
    let scopeLabel = "Total Consolidado da Usina";

    if (selectedInversor && selectedInversor !== "CONSOLIDADO") {
      targetRows = filteredTelemetria.filter((t) => t.tipoLinha === "INDIVIDUAL" && t.inversorSN === selectedInversor);
      scopeLabel = `Inversor SN: ${selectedInversor}`;
    } else {
      const consolidadas = filteredTelemetria.filter((t) => t.tipoLinha === "CONSOLIDADO");
      if (consolidadas.length > 0) targetRows = consolidadas;
      scopeLabel = "Total Consolidado da Usina";
    }

    // Energia gerada acumulada no momento atual do dia (leitura mais recente do período selecionado)
    let energiaTotalKWh = 0;
    if (targetRows.length > 0) {
      if (selectedUsina) {
        energiaTotalKWh = targetRows[0]?.energiaAcumuladaKWh || 0;
      } else {
        const latestByUsina = new Map<string, number>();
        targetRows.forEach((t) => {
          if (!latestByUsina.has(t.usinaId)) {
            latestByUsina.set(t.usinaId, t.energiaAcumuladaKWh || 0);
          }
        });
        energiaTotalKWh = Array.from(latestByUsina.values()).reduce((acc, val) => acc + val, 0);
      }
    }

    const maxPotencia = targetRows.reduce((max, t) => Math.max(max, t.potenciaAtivaKW), 0);
    const maxTemp = targetRows.reduce((max, t) => Math.max(max, t.tempIGBT), 0);

    let somaTensao = 0;
    let countTensao = 0;
    targetRows.forEach((t) => {
      if (t.tensaoCA_A > 0) { somaTensao += t.tensaoCA_A; countTensao++; }
      if (t.tensaoCA_B > 0) { somaTensao += t.tensaoCA_B; countTensao++; }
      if (t.tensaoCA_C > 0) { somaTensao += t.tensaoCA_C; countTensao++; }
    });
    const mediaTensaoCA = countTensao > 0 ? (somaTensao / countTensao).toFixed(1) : "0.0";

    return {
      energiaTotalKWh,
      potenciaPicoKW: maxPotencia,
      temperaturaMaxC: maxTemp,
      mediaTensaoCA,
      totalLeituras: filteredTelemetria.length,
      totalAlarmes: alarmes.length,
      scopeLabel,
    };
  }, [filteredTelemetria, alarmes, selectedInversor, selectedUsina]);

  // Exportar para Excel (.xlsx)
  const exportToExcel = () => {
    const telemetriaRows = filteredTelemetria.map((t) => {
      const row: any = {
        "Data/Hora": t.timestampFormatted,
        Usina: t.usinaNome,
        Plataforma: t.apiFornecedor,
        Tipo: t.tipoLinha === "CONSOLIDADO" ? "TOTAL USINA" : "INVERSOR INDIVIDUAL",
        "SN Inversor": t.inversorSN,
        Modelo: t.inversorModelo,
        "Potência CA (kW)": t.potenciaAtivaKW,
        "Potência CC (kW)": t.potenciaCCTotalKW,
        "Energia (kWh)": t.energiaAcumuladaKWh,
        "Tensão CA F-A (V)": t.tensaoCA_A,
        "Tensão CA F-B (V)": t.tensaoCA_B,
        "Tensão CA F-C (V)": t.tensaoCA_C,
        "Corrente CA F-A (A)": t.correnteCA_A,
        "Corrente CA F-B (A)": t.correnteCA_B,
        "Corrente CA F-C (A)": t.correnteCA_C,
        "Frequência (Hz)": t.frequenciaRede,
        "Temp. Inversor (°C)": t.tempIGBT,
        Status: t.statusInversor,
      };

      Object.entries(t.dadosStrings || {}).forEach(([stName, val]) => {
        row[`${stName}_Tensao_V`] = val.V;
        row[`${stName}_Corrente_A`] = val.I;
      });

      return row;
    });

    const alarmesRows = alarmes.map((a) => ({
      "Data/Hora": a.timestampFormatted,
      Usina: a.usinaNome,
      Plataforma: a.apiFornecedor,
      Código: a.codigo,
      Descrição: a.descricao,
      Gravidade: a.gravidade,
      Status: a.status,
      "Solução Sugerida": a.solucaoSugerida,
    }));

    const wb = XLSX.utils.book_new();
    const wsTelemetria = XLSX.utils.json_to_sheet(telemetriaRows);
    const wsAlarmes = XLSX.utils.json_to_sheet(alarmesRows);

    XLSX.utils.book_append_sheet(wb, wsTelemetria, "Telemetria Inversores");
    XLSX.utils.book_append_sheet(wb, wsAlarmes, "Logs de Erro e Alarmes");

    XLSX.writeFile(wb, `Telemetria_Solar_${date}_${plataforma}.xlsx`);
  };

  // Exportar para CSV
  const exportToCSV = () => {
    const telemetriaRows = filteredTelemetria.map((t) => ({
      DataHora: t.timestampFormatted,
      Usina: t.usinaNome,
      Plataforma: t.apiFornecedor,
      Tipo: t.tipoLinha,
      SNInversor: t.inversorSN,
      PotenciaCA_kW: t.potenciaAtivaKW,
      PotenciaCC_kW: t.potenciaCCTotalKW,
      EnergiaDia_kWh: t.energiaAcumuladaKWh,
      TensaoCA_A: t.tensaoCA_A,
      TensaoCA_B: t.tensaoCA_B,
      TensaoCA_C: t.tensaoCA_C,
      CorrenteCA_A: t.correnteCA_A,
      CorrenteCA_B: t.correnteCA_B,
      CorrenteCA_C: t.correnteCA_C,
      TempInversor_C: t.tempIGBT,
      Status: t.statusInversor,
    }));

    const ws = XLSX.utils.json_to_sheet(telemetriaRows);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Telemetria_Solar_${date}.csv`;
    link.click();
  };

  // Exportar para JSON
  const exportToJSON = () => {
    const jsonStr = JSON.stringify({ telemetria: filteredTelemetria, alarmes, summary: dynamicSummary }, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Telemetria_Solar_${date}.json`;
    link.click();
  };

  // Dados para gráficos
  const chartData = React.useMemo(() => {
    if (consolidadoData?.serieDiaria && consolidadoData.serieDiaria.length > 0) {
      return consolidadoData.serieDiaria.map((s: any) => ({
        hora: s.hora,
        potenciaCA: s.potenciaTotalKW,
        tensaoA: s.tensaoA || 220,
        tensaoB: s.tensaoB || 220,
        tensaoC: s.tensaoC || 220,
      }));
    }

    const consolidadosOnly = filteredTelemetria.filter((t) => t.tipoLinha === "CONSOLIDADO");
    const sourceData = consolidadosOnly.length > 0 ? consolidadosOnly : filteredTelemetria;

    return [...sourceData]
      .reverse()
      .map((t) => ({
        hora: t.hora,
        potenciaCA: t.potenciaAtivaKW,
        potenciaCC: t.potenciaCCTotalKW,
        energia: t.energiaAcumuladaKWh,
        temp: t.tempIGBT,
        tensaoA: t.tensaoCA_A,
        tensaoB: t.tensaoCA_B,
        tensaoC: t.tensaoCA_C,
      }));
  }, [filteredTelemetria, consolidadoData]);

  return (
    <div className="min-h-screen bg-[#0A192F] text-slate-100 p-4 md:p-6 space-y-6">
      {/* Cabeçalho da Aplicação com Botão Voltar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700/80 shadow-md"
              title="Voltar para a página anterior"
            >
              <ArrowLeft className="w-4 h-4 text-[#F59E0B]" />
              Voltar
            </button>

            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#F59E0B]/20 to-[#EAB308]/10 border border-[#F59E0B]/30 text-[#F59E0B]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                Extrator de Telemetria Solar
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-medium">
                  Huawei & Solis
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Extração de dados por Usina, por Inversor individual e Total Consolidado com leitura completa de Strings.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação Principal, Cadastro e Exportação */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openNewUsinaModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-semibold text-sm transition-all shadow-lg shadow-[#10B981]/20"
            title="Cadastrar nova usina solar fotovoltaica"
          >
            <Plus className="w-4 h-4" />
            Nova Usina
          </button>

          <button
            onClick={() => {
              const u = usinas.find((x) => x.id === selectedUsina) || usinas[0];
              openNewUsinaModal(u);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#F59E0B] font-semibold text-sm transition-all border border-[#F59E0B]/40 shadow-sm"
            title="Editar configurações e credenciais de usinas"
          >
            <Settings className="w-4 h-4 text-[#F59E0B]" />
            ⚙️ Configurar Usina
          </button>

          <button
            onClick={handleSeedManufacturers}
            disabled={seedingManufacturers}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-sm transition-all border border-amber-500/40 shadow-sm disabled:opacity-50"
            title="Restaurar a lista padrão com as credenciais de 13 fabricantes (Hoymiles, Huawei, Solis, Canadian, etc.)"
          >
            <Sparkles className={`w-4 h-4 text-amber-400 ${seedingManufacturers ? "animate-spin" : ""}`} />
            {seedingManufacturers ? "Restaurando..." : "Restaurar Fabricantes Padrão"}
          </button>

          <button
            onClick={() => {
              openNewUsinaModal();
              setTimeout(() => handleDiscoverUsinaPortal(), 100);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white font-semibold text-sm transition-all border border-indigo-700/60 shadow-sm"
            title="Pesquisar usinas nas contas registradas da Huawei e Solis"
          >
            <Search className="w-4 h-4 text-indigo-400" />
            🔍 Pesquisar Portais
          </button>

          <button
            onClick={handleLiveSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-[#F59E0B]/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando APIs..." : "Sincronizar API Agora"}
          </button>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-1">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 text-xs font-medium text-emerald-400 transition-colors"
              title="Exportar em Planilha Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 text-xs font-medium text-amber-400 transition-colors"
              title="Exportar formato CSV"
            >
              <FileText className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportToJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 text-xs font-medium text-sky-400 transition-colors"
              title="Exportar formato JSON"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Reformulada e Espaçosa */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Linha 1: Seletores Principais */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Usina Solar</label>
              <button
                onClick={() => {
                  const u = usinas.find((x) => x.id === selectedUsina) || usinas[0];
                  openNewUsinaModal(u);
                }}
                className="text-xs bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] px-2.5 py-0.5 rounded-md border border-[#F59E0B]/40 font-bold flex items-center gap-1 transition-all shadow-sm"
                title="Editar configurações e credenciais de usinas"
              >
                <Settings className="w-3.5 h-3.5 text-[#F59E0B]" /> ⚙️ Configurar Usina
              </button>
            </div>
            <select
              value={selectedUsina}
              onChange={(e) => {
                setSelectedUsina(e.target.value);
                setSelectedInversor("");
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B] shadow-inner"
            >
              <option value="">Todas as Usinas</option>
              {usinas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.apiFornecedor})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[280px]">
            <label className="text-xs font-semibold text-slate-300 block mb-1">Inversor (SN)</label>
            <select
              value={selectedInversor}
              onChange={(e) => setSelectedInversor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B] shadow-inner"
            >
              <option value="">Todos (Consolidado + Inversores)</option>
              <option value="CONSOLIDADO">Apenas Total Consolidado da Usina</option>
              {availableInverters.map((inv) => (
                <option key={inv.id} value={inv.numeroSerie}>
                  SN: {inv.numeroSerie} ({inv.modelo || inv.usinaNome})
                </option>
              ))}
            </select>
          </div>

          <div className="w-52">
            <label className="text-xs font-semibold text-slate-300 block mb-1">Plataforma API</label>
            <select
              value={plataforma}
              onChange={(e) => setPlataforma(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B] shadow-inner"
            >
              <option value="TODAS">Todas (Huawei & Solis)</option>
              <option value="HUAWEI">Huawei FusionSolar</option>
              <option value="SOLIS">SolisCloud</option>
            </select>
          </div>

          <div className="w-48">
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Auto-Sync</span>
              {autoSyncInterval > 0 && (
                <span className="text-[10px] text-[#F59E0B] font-mono font-bold bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">
                  ({countdown}s)
                </span>
              )}
            </label>
            <select
              value={autoSyncInterval}
              onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B] shadow-inner"
            >
              <option value={180}>3 Minutos (Padrão)</option>
              <option value={60}>1 Minuto</option>
              <option value={300}>5 Minutos</option>
              <option value={600}>10 Minutos</option>
              <option value={0}>Desativado</option>
            </select>
          </div>
        </div>

        {/* Linha 2: Data, Horário e Busca */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800">
          <div className="w-44">
            <label className="text-xs font-semibold text-slate-400 block mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="w-60">
            <label className="text-xs font-semibold text-slate-400 block mb-1">Horário (Início - Fim)</label>
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
              />
              <span className="text-slate-500 text-xs">-</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 self-end pb-1">
            <span className="font-semibold text-slate-300">Atalhos:</span>
            <button
              onClick={() => setDate(getTodayStr())}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                date === getTodayStr()
                  ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setDate(d.toISOString().split("T")[0]);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Ontem
            </button>
          </div>

          <div className="flex-1 min-w-[240px] self-end">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Usina, SN de Inversor, Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Header Indicativo do Escopo Atual dos KPIs */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mostradores Dinâmicos:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            {dynamicSummary.scopeLabel}
          </span>
        </div>

        <span className="text-xs text-slate-400">
          Valores atualizados dinamicamente conforme o inversor selecionado
        </span>
      </div>

      {/* Cards de KPIs Dinâmicos do Período */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Energia Gerada (Hoje)
          </span>
          <div className="text-xl font-bold text-white tracking-tight">
            {dynamicSummary.energiaTotalKWh >= 1000 ? (
              <span title={`${dynamicSummary.energiaTotalKWh.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh`}>
                {(dynamicSummary.energiaTotalKWh / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                <span className="text-xs text-amber-400 font-bold">MWh</span>
              </span>
            ) : (
              <>
                {dynamicSummary.energiaTotalKWh.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                <span className="text-xs text-slate-400 font-normal">kWh</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Potência Pico
          </span>
          <div className="text-xl font-bold text-white tracking-tight">
            {dynamicSummary.potenciaPicoKW.toFixed(2)}{" "}
            <span className="text-xs text-slate-400 font-normal">kW</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" /> Tensão Média CA
          </span>
          <div className="text-xl font-bold text-white tracking-tight">
            {dynamicSummary.mediaTensaoCA} <span className="text-xs text-slate-400 font-normal">V</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Temp. Máxima
          </span>
          <div className="text-xl font-bold text-white tracking-tight">
            {dynamicSummary.temperaturaMaxC.toFixed(1)} °C
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-purple-400" /> Leituras Exibidas
          </span>
          <div className="text-xl font-bold text-white tracking-tight">
            {dynamicSummary.totalLeituras}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Alarmes
          </span>
          <div className="text-xl font-bold text-rose-400 tracking-tight">
            {dynamicSummary.totalAlarmes}
          </div>
        </div>
      </div>

      {/* Navegação por Abas + Botão de Maximizar Tabela */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("planilha")}
              className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 ${
                activeTab === "planilha"
                  ? "bg-[#F59E0B] text-slate-950 shadow-md shadow-[#F59E0B]/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Planilha de Telemetria ({filteredTelemetria.length})
            </button>

            <button
              onClick={() => setActiveTab("alarmes")}
              className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 ${
                activeTab === "alarmes"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Logs de Erro & Alarmes ({alarmes.length})
            </button>

            <button
              onClick={() => setActiveTab("graficos")}
              className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 ${
                activeTab === "graficos"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Activity className="w-4 h-4" />
              Gráficos de Análise
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTableMaximized(!isTableMaximized)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#F59E0B] text-xs font-semibold transition-all border border-[#F59E0B]/40 shadow-sm"
              title={isTableMaximized ? "Sair da Tela Cheia" : "Maximizar Tabela na Tela Cheia"}
            >
              {isTableMaximized ? (
                <>
                  <Minimize2 className="w-4 h-4" /> Sair da Tela Cheia
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" /> Maximizar Tabela
                </>
              )}
            </button>
            <div className="text-xs text-slate-400 hidden sm:block">
              Mostrando <span className="font-semibold text-white">{filteredTelemetria.length}</span> leituras
            </div>
          </div>
        </div>

        {/* Conteúdo da Aba 1: Planilha de Telemetria com Sticky Header e Scroll Lateral */}
        {activeTab === "planilha" && (
          <div
            className={clsx(
              "overflow-auto rounded-xl border border-slate-800 relative transition-all duration-300 shadow-xl",
              isTableMaximized
                ? "fixed inset-0 z-50 bg-[#0A192F] p-4 md:p-6 flex flex-col h-screen w-screen rounded-none overflow-hidden"
                : "max-h-[620px] min-h-[420px]"
            )}
          >
            {isTableMaximized && (
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsTableMaximized(false)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#F59E0B]" />
                    Voltar
                  </button>
                  <span className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#F59E0B]" /> Modo Tela Cheia - Telemetria Solar
                  </span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 hidden sm:inline-flex">
                    {dynamicSummary.scopeLabel}
                  </span>
                </div>
                <button
                  onClick={() => setIsTableMaximized(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F59E0B] text-slate-950 font-bold text-xs hover:bg-[#D97706] transition-colors shadow-md"
                >
                  <Minimize2 className="w-4 h-4" /> Sair da Tela Cheia
                </button>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#F59E0B]" />
                <p className="text-sm">Carregando dados da planilha de telemetria...</p>
              </div>
            ) : filteredTelemetria.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Database className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Nenhum registro de telemetria encontrado para a data e filtros selecionados.</p>
                <p className="text-xs text-slate-500">Clique em &quot;Sincronizar API Agora&quot; para consultar leituras diretamente nas plataformas da Huawei ou Solis.</p>
              </div>
            ) : (
              <div className={clsx("overflow-auto flex-1 w-full", isTableMaximized ? "h-full" : "")}>
                <table className="w-full text-left border-collapse text-xs min-w-[1300px]">
                  {/* Cabeçalho Fixo (Sticky Header) com Z-Index Alto */}
                  <thead className="bg-[#0f172a] text-slate-300 uppercase text-[10px] font-bold sticky top-0 z-30 border-b border-slate-800 shadow-md">
                    <tr>
                      <th className="p-3 bg-[#0f172a] sticky top-0 left-0 z-40 border-r border-slate-800/80 min-w-[140px]">Data/Hora</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 min-w-[180px]">Usina</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 min-w-[100px]">Plataforma</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 min-w-[160px]">Inversor (SN)</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-right min-w-[110px]">Pot. CA (kW)</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-right min-w-[110px]">Pot. CC (kW)</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-right min-w-[110px]">Energia (kWh)</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-center min-w-[140px]">Tensões CA (V)</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-center min-w-[140px]">Correntes CA (A)</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-right min-w-[100px]">Temp. (°C)</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-center min-w-[110px]">Strings CC</th>
                      <th className="p-3 bg-[#0f172a] sticky top-0 z-30 text-center min-w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredTelemetria.map((t) => (
                      <tr
                        key={t.id}
                        className={`transition-colors ${
                          t.tipoLinha === "CONSOLIDADO"
                            ? "bg-slate-900/95 hover:bg-slate-800/90 font-bold border-l-4 border-l-blue-500"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="p-3 whitespace-nowrap font-sans text-slate-200 sticky left-0 z-20 bg-[#0A192F] border-r border-slate-800/80 shadow-md">
                          {t.timestampFormatted}
                        </td>
                        <td className="p-3 whitespace-nowrap font-sans font-medium text-slate-100">{t.usinaNome}</td>
                        <td className="p-3 whitespace-nowrap font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.apiFornecedor.toUpperCase() === "HUAWEI"
                                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {t.apiFornecedor}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-sans">
                          {t.tipoLinha === "CONSOLIDADO" ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 w-max">
                              <Layers className="w-3 h-3" />
                              {t.inversorSN}
                            </span>
                          ) : (
                            <span className="text-slate-200 font-mono flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-amber-400" />
                              {t.inversorSN}
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right font-bold text-amber-400">
                          {t.potenciaAtivaKW.toFixed(2)}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right text-emerald-400">
                          {t.potenciaCCTotalKW.toFixed(2)}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right text-sky-400">
                          {t.energiaAcumuladaKWh.toFixed(1)}
                        </td>
                        <td className="p-3 whitespace-nowrap text-center text-slate-300">
                          {t.tensaoCA_A > 0 ? `${t.tensaoCA_A.toFixed(0)} | ${t.tensaoCA_B.toFixed(0)} | ${t.tensaoCA_C.toFixed(0)}` : "N/A"}
                        </td>
                        <td className="p-3 whitespace-nowrap text-center text-slate-300">
                          {t.correnteCA_A > 0 ? `${t.correnteCA_A.toFixed(1)} | ${t.correnteCA_B.toFixed(1)} | ${t.correnteCA_C.toFixed(1)}` : "N/A"}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right text-orange-400">
                          {t.tempIGBT > 0 ? `${t.tempIGBT.toFixed(1)} °C` : "N/A"}
                        </td>
                        <td className="p-3 whitespace-nowrap text-center font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {Object.keys(t.dadosStrings || {}).length} Strings
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-center font-sans">
                          <button
                            onClick={() => setSelectedRow(t)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors text-[11px] flex items-center gap-1 mx-auto"
                            title="Ver Strings e parâmetros deste inversor"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba 2: Logs de Erro e Alarmes */}
        {activeTab === "alarmes" && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[600px]">
            {alarmes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Nenhum log de alarme ou erro registrado para o período.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0f172a] text-slate-300 uppercase text-[10px] font-bold sticky top-0 z-20 border-b border-slate-800">
                  <tr>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20">Data/Hora</th>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20">Usina</th>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20">Plataforma</th>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20">Código</th>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20">Descrição da Falha</th>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20 text-center">Gravidade</th>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20 text-center">Status</th>
                    <th className="p-3 bg-[#0f172a] sticky top-0 z-20">Solução Sugerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {alarmes.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 whitespace-nowrap font-mono text-slate-300">{a.timestampFormatted}</td>
                      <td className="p-3 whitespace-nowrap font-medium text-slate-100">{a.usinaNome}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {a.apiFornecedor}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono font-bold text-amber-400">{a.codigo}</td>
                      <td className="p-3 text-slate-200">{a.descricao}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.gravidade === "CRITICA" || a.gravidade === "ALTA"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {a.gravidade}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{a.solucaoSugerida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Conteúdo da Aba 3: Gráficos de Análise e Consolidado Multi-Fabricante */}
        {activeTab === "graficos" && (
          <div className="space-y-6 pt-2">
            {/* Seletor de Período (Diário, Mensal, Anual) e Controles de Navegação por Data */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-300">Visualização de Geração:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setViewPeriod("DIA")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewPeriod === "DIA"
                        ? "bg-[#F59E0B] text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Diário (24h)
                  </button>
                  <button
                    onClick={() => setViewPeriod("MES")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewPeriod === "MES"
                        ? "bg-[#F59E0B] text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Mensal (kWh/dia)
                  </button>
                  <button
                    onClick={() => setViewPeriod("ANO")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewPeriod === "ANO"
                        ? "bg-[#F59E0B] text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Anual (MWh/mês)
                  </button>
                </div>
              </div>

              {/* Navegador Interativo por Dia / Mês / Ano */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                {viewPeriod === "DIA" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const d = new Date(date + "T12:00:00");
                        d.setDate(d.getDate() - 1);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
                      title="Dia Anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Anterior
                    </button>

                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-[#F59E0B] font-bold focus:outline-none focus:border-[#F59E0B]"
                    />

                    <button
                      onClick={() => {
                        const d = new Date(date + "T12:00:00");
                        d.setDate(d.getDate() + 1);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
                      title="Próximo Dia"
                    >
                      Próximo
                      <ChevronRight className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </button>
                  </div>
                )}

                {viewPeriod === "MES" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const d = new Date(date + "T12:00:00");
                        d.setMonth(d.getMonth() - 1);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
                      title="Mês Anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Mês Ant.
                    </button>

                    <select
                      value={new Date(date + "T12:00:00").getMonth() + 1}
                      onChange={(e) => {
                        const m = parseInt(e.target.value, 10);
                        const d = new Date(date + "T12:00:00");
                        d.setMonth(m - 1);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-[#F59E0B] font-bold focus:outline-none"
                    >
                      {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((mNome, idx) => (
                        <option key={idx} value={idx + 1}>
                          {mNome}
                        </option>
                      ))}
                    </select>

                    <select
                      value={new Date(date + "T12:00:00").getFullYear()}
                      onChange={(e) => {
                        const y = parseInt(e.target.value, 10);
                        const d = new Date(date + "T12:00:00");
                        d.setFullYear(y);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-[#F59E0B] font-bold focus:outline-none"
                    >
                      {[2023, 2024, 2025, 2026, 2027].map((yNum) => (
                        <option key={yNum} value={yNum}>
                          {yNum}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        const d = new Date(date + "T12:00:00");
                        d.setMonth(d.getMonth() + 1);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
                      title="Próximo Mês"
                    >
                      Próximo Mês
                      <ChevronRight className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </button>
                  </div>
                )}

                {viewPeriod === "ANO" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const d = new Date(date + "T12:00:00");
                        d.setFullYear(d.getFullYear() - 1);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
                      title="Ano Anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Ano Ant.
                    </button>

                    <select
                      value={new Date(date + "T12:00:00").getFullYear()}
                      onChange={(e) => {
                        const y = parseInt(e.target.value, 10);
                        const d = new Date(date + "T12:00:00");
                        d.setFullYear(y);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-[#F59E0B] font-bold focus:outline-none"
                    >
                      {[2023, 2024, 2025, 2026, 2027].map((yNum) => (
                        <option key={yNum} value={yNum}>
                          {yNum}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        const d = new Date(date + "T12:00:00");
                        d.setFullYear(d.getFullYear() + 1);
                        setDate(d.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
                      title="Próximo Ano"
                    >
                      Próximo Ano
                      <ChevronRight className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Card de Resumo e Composição por Fabricante */}
            <CardFabricantesConsolidado
              participacao={consolidadoData?.participacaoFabricantes || []}
              capacidadeTotalKWp={consolidadoData?.capacidadeInstaladaTotalKWp || dynamicSummary.potenciaPicoKW}
              periodoStr={viewPeriod === "DIA" ? "do Dia" : viewPeriod === "MES" ? "do Mês" : "do Ano"}
            />

            {/* Renderização Condicional do Gráfico Baseado no Período */}
            {viewPeriod === "DIA" && (
              <>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Curva de Geração de Potência (kW) - {dynamicSummary.scopeLabel}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="hora" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                        <Area type="monotone" dataKey="potenciaCA" stroke="#F59E0B" fillOpacity={1} fill="url(#colorPower)" name="Potência CA (kW)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" /> Curva de Tensões CA por Fase (V)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="hora" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                        <Legend />
                        <Line type="monotone" dataKey="tensaoA" stroke="#38bdf8" name="Tensão Fase A (V)" dot={false} />
                        <Line type="monotone" dataKey="tensaoB" stroke="#818cf8" name="Tensão Fase B (V)" dot={false} />
                        <Line type="monotone" dataKey="tensaoC" stroke="#c084fc" name="Tensão Fase C (V)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {viewPeriod === "MES" && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Geração Diária Acumulada no Mês (kWh/dia) - Consolidado
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consolidadoData?.serieMensal || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="dia" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Bar dataKey="totalKWh" fill="#10B981" radius={[4, 4, 0, 0]} name="Energia Acumulada (kWh)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {viewPeriod === "ANO" && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" /> Geração Mensal no Ano (MWh/mês) - Ano Atual vs Ano Anterior
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consolidadoData?.serieAnual || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Legend />
                      <Bar dataKey="geracaoMWh" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Ano Atual (MWh)" />
                      <Bar dataKey="geracaoAnoAnteriorMWh" fill="#475569" radius={[4, 4, 0, 0]} name="Ano Anterior (MWh)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalhes de Strings por Inversor */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedRow.tipoLinha === "CONSOLIDADO" ? (
                    <span className="text-blue-400 flex items-center gap-1.5">
                      <Layers className="w-5 h-5" /> Total Consolidado da Usina
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <Cpu className="w-5 h-5" /> Inversor SN: {selectedRow.inversorSN}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Usina: <span className="text-white font-medium">{selectedRow.usinaNome}</span> | Horário:{" "}
                  <span className="text-white font-mono">{selectedRow.timestampFormatted}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Potência CA</span>
                  <span className="text-amber-400 font-bold font-mono text-sm">
                    {selectedRow.potenciaAtivaKW.toFixed(2)} kW
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Potência CC Strings</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    {selectedRow.potenciaCCTotalKW.toFixed(2)} kW
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Energia Acumulada</span>
                  <span className="text-sky-400 font-bold font-mono text-sm">
                    {selectedRow.energiaAcumuladaKWh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Temp. Inversor</span>
                  <span className="text-orange-400 font-bold font-mono text-sm">
                    {selectedRow.tempIGBT > 0 ? `${selectedRow.tempIGBT.toFixed(1)} °C` : "N/A"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                  <span>Leituras das Strings CC ({Object.keys(selectedRow.dadosStrings || {}).length} Strings)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tensão (V) & Corrente (A)</span>
                </h4>
                {Object.keys(selectedRow.dadosStrings || {}).length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg">
                    Nenhum dado individual de string registrado para esta leitura.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {Object.entries(selectedRow.dadosStrings).map(([stKey, val]) => (
                      <div
                        key={stKey}
                        className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-lg text-xs font-mono"
                      >
                        <span className="text-slate-400 block font-sans font-semibold text-[11px] mb-1 truncate">
                          {stKey}
                        </span>
                        <div className="flex items-center justify-between text-slate-200 pt-0.5 border-t border-slate-900">
                          <span className="text-sky-300">{val.V} V</span>
                          <span className="text-emerald-400 font-bold">{val.I} A</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Cadastro e Configuração de Usinas */}
      {isUsinaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Sun className="w-5 h-5 text-[#F59E0B]" />
                  {editingUsina ? `Editar Usina: ${editingUsina.nome}` : "Cadastrar Nova Usina Solar"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Integração Multi-Fabricante (Huawei, Solis, Canadian, Hoymiles, Fronius, Sungrow, Deye, etc.)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {usinas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Usina:</span>
                    <select
                      value={editingUsina?.id || ""}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (!targetId) {
                          openNewUsinaModal();
                        } else {
                          const u = usinas.find((x) => x.id === targetId);
                          if (u) openNewUsinaModal(u);
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-[#F59E0B] font-bold focus:outline-none focus:border-[#F59E0B]"
                    >
                      <option value="">+ Nova Usina</option>
                      {usinas.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.apiFornecedor})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => setIsUsinaModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans text-xs">
              {/* Descoberta Automática via API */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Descoberta Automática em Portais (Huawei, Solis, etc.)
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDiscoverUsinaPortal("ALL")}
                      disabled={isDiscovering}
                      className="px-3 py-1.5 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 border border-[#F59E0B]/40 text-[#F59E0B] rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Pesquisar em todos os portais cadastrados no sistema"
                    >
                      {isDiscovering ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Pesquisar Todos
                    </button>
                    <button
                      onClick={() => handleDiscoverUsinaPortal("HUAWEI")}
                      disabled={isDiscovering}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold uppercase transition-colors"
                    >
                      Huawei
                    </button>
                    <button
                      onClick={() => handleDiscoverUsinaPortal("SOLIS")}
                      disabled={isDiscovering}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold uppercase transition-colors"
                    >
                      Solis
                    </button>
                    <button
                      onClick={() => handleDiscoverUsinaPortal("HOYMILES")}
                      disabled={isDiscovering}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-semibold uppercase border border-amber-500/30 transition-colors"
                    >
                      Hoymiles
                    </button>

                    <button
                      type="button"
                      onClick={handleSeedManufacturers}
                      disabled={seedingManufacturers}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/30 flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Restaurar a lista padrão de 13 fabricantes solares (Hoymiles, Huawei, Solis, Canadian, etc.)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Restaurar Lista Padrão
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Consulte instantaneamente a lista de todas as usinas registradas nas suas contas da Huawei, Solis e outros fabricantes para preencher o formulário em 1-clique.
                </p>

                {discoveryStatusMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${discoveryStatusMsg.startsWith("✓") ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border border-amber-500/30 text-amber-300"}`}>
                    {discoveryStatusMsg}
                  </div>
                )}

                {discoveredUsinas.length > 0 && (
                  <div className="bg-slate-900 rounded-xl p-3 space-y-2 border border-slate-800">
                    <input
                      type="text"
                      placeholder="🔍 Filtrar usina por nome, ID ou fornecedor..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                      value={discoverySearch}
                      onChange={(e) => setDiscoverySearch(e.target.value)}
                    />

                    <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {discoveredUsinas
                        .filter(
                          (d: any) =>
                            (d.nome || "").toLowerCase().includes(discoverySearch.toLowerCase()) ||
                            (d.id || "").toLowerCase().includes(discoverySearch.toLowerCase()) ||
                            (d.fornecedor || "").toLowerCase().includes(discoverySearch.toLowerCase())
                        )
                        .map((d: any) => {
                          const isSelected = newUsinaForm.apiId === d.id;
                          const rawCap = parseFloat(d.capacidade) || 0;
                          const capKWp = rawCap > 0 
                            ? (rawCap < 100 ? Math.round(rawCap * 1000 * 100) / 100 : rawCap)
                            : 0;

                          return (
                            <div
                              key={`${d.fornecedor}_${d.id}`}
                              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl transition-all border gap-2 ${
                                isSelected
                                  ? "bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-900/20 ring-1 ring-emerald-500/50"
                                  : "bg-slate-950 hover:bg-slate-800/80 border-slate-800/80"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400">
                                    {d.fornecedor || "HUAWEI"}
                                  </span>
                                  <p className={`text-xs font-bold uppercase transition-colors ${isSelected ? "text-emerald-400" : "text-white"}`}>
                                    {d.nome || "NOME NÃO IDENTIFICADO"}
                                  </p>
                                  {isSelected && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 animate-pulse">
                                      ✓ Selecionada
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                  ID: {d.id} | {capKWp > 0 ? `${capKWp} kWp` : "Potência não informada"} | {d.localizacao || "Brasil"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleSelectDiscoveredUsina(d, false)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                      : "bg-slate-800 text-[#F59E0B] border-[#F59E0B]/40 hover:bg-[#F59E0B]/20"
                                  }`}
                                >
                                  {isSelected ? "✓ Preenchido" : "Selecionar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSelectDiscoveredUsina(d, true)}
                                  disabled={savingUsina}
                                  className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 shadow-md shadow-emerald-900/30 flex items-center gap-1.5 disabled:opacity-50"
                                  title="Cadastrar esta usina imediatamente na base"
                                >
                                  {savingUsina && isSelected ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                  Cadastrar Agora
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Informações Básicas da Usina */}
              <div id="usina-form-fields" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nome da Usina Solar *</label>
                  <input
                    type="text"
                    placeholder="Ex: Usina Manga Grande 01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.nome}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, nome: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Capacidade Instalada (kWp)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 250.0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.capacidadeKWp}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, capacidadeKWp: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Credenciais e API */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Plataforma API / Fabricante</label>
                    <a
                      href="/engenharia/solar/monitoramento/configuracoes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#F59E0B] hover:underline font-bold flex items-center gap-1"
                      title="Abrir gerenciador de credenciais de APIs (Hoymiles, Solis, Huawei, etc.)"
                    >
                      <Settings className="w-3 h-3" /> Gerenciar APIs
                    </a>
                  </div>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.apiFornecedor}
                    onChange={(e) => {
                      const mName = e.target.value;
                      const m = manufacturers.find((x) => x.name === mName);
                      setNewUsinaForm({
                        ...newUsinaForm,
                        apiFornecedor: mName,
                        apiKey: m?.userKey || newUsinaForm.apiKey,
                        apiSecret: m?.secretKey ? "********" : newUsinaForm.apiSecret,
                      });
                    }}
                  >
                    <option value="HUAWEI">Huawei FusionSolar</option>
                    <option value="SOLIS">SolisCloud</option>
                    <option value="CANADIAN_SOLAR">Canadian Solar (CSI Cloud)</option>
                    <option value="HOYMILES">Hoymiles (S-Miles Cloud)</option>
                    <option value="FRONIUS">Fronius (Solar.web API)</option>
                    <option value="FOXESS">FoxESS Cloud</option>
                    <option value="SOLAX">SolaX Cloud</option>
                    <option value="SUNGROW">Sungrow (iSolarCloud)</option>
                    <option value="NEP">NEP (NEPViewer Cloud)</option>
                    <option value="SMA">SMA (Sunny Portal)</option>
                    <option value="DEYE">Deye / Solarman Cloud</option>
                    <option value="GROWATT">Growatt (ShineServer)</option>
                    <option value="OUTROS">Outros / API Customizada</option>
                    {manufacturers.filter(m => ![
                      "HUAWEI","SOLIS","CANADIAN_SOLAR","HOYMILES","FRONIUS",
                      "FOXESS","SOLAX","SUNGROW","NEP","SMA","DEYE","GROWATT","OUTROS"
                    ].includes(m.name)).map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#F59E0B] block mb-1">ID da Estação na API (stationCode / stationId)</label>
                  <input
                    type="text"
                    placeholder="Ex: 2243 ou NE=321456"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.apiId}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, apiId: e.target.value })}
                  />
                </div>
              </div>

              {/* Fonte de Irradiação e Geometria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fonte de Irradiação</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.modoIrradiancia}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, modoIrradiancia: e.target.value })}
                  >
                    <option value="ESTACAO">Estação Solarimétrica Local</option>
                    <option value="SATELITE">Satélite / Climatológico (CRECESB / PVGIS)</option>
                  </select>
                </div>

                {newUsinaForm.modoIrradiancia === "ESTACAO" ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Estação Solarimétrica</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                      value={newUsinaForm.estacaoId}
                      onChange={(e) => setNewUsinaForm({ ...newUsinaForm, estacaoId: e.target.value })}
                    >
                      <option value="">Sem vínculo / Nenhuma</option>
                      {estacoes.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Localização (Cidade/UF)</label>
                    <input
                      type="text"
                      placeholder="Ex: Barreiras - BA"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                      value={newUsinaForm.localizacao}
                      onChange={(e) => setNewUsinaForm({ ...newUsinaForm, localizacao: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Coordenadas e Geometria */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-12.1524"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.latitude}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, latitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-44.9961"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.longitude}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, longitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Inclinação (°)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.inclinacao}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, inclinacao: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Azimute (180°=Norte)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.orientacao}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, orientacao: e.target.value })}
                  />
                </div>
              </div>

              {/* Coeficientes de Perdas */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Perda Sujidade (Ex: 0.03)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.coefSujidade}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, coefSujidade: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Coef. Temp (Ex: -0.0035)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.coefTemperatura}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, coefTemperatura: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Degradação (Ex: 0.005)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                    value={newUsinaForm.taxaDegradacao}
                    onChange={(e) => setNewUsinaForm({ ...newUsinaForm, taxaDegradacao: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {usinaErrorMsg && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold text-center">
                  {usinaErrorMsg}
                </div>
              )}
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setIsUsinaModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUsina}
                disabled={savingUsina}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-slate-950 font-bold text-xs hover:from-[#D97706] hover:to-[#B45309] transition-all shadow-md shadow-[#F59E0B]/20 disabled:opacity-50"
              >
                {savingUsina ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingUsina ? "Salvar Alterações" : "Cadastrar Usina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
