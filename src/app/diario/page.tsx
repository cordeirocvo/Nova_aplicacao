"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Building, Calendar, Clock, CheckCircle2, User, Mic, Play, 
  Trash2, FileText, Check, X, ShieldAlert, Plus, Search, 
  Sparkles, BarChart3, Upload, HardHat, Square, AlertCircle, MessageSquare, Pencil,
  Wind, Users, Package, AlertTriangle, FileDown, UserPlus, ChevronDown, ChevronUp, Eye, Printer
} from "lucide-react";

// Formats a date string/ISO from DB without UTC→local timezone shift
// (new Date("2026-08-17") parses as UTC midnight → shows 16/08 in UTC-3)
const fmtDate = (val: string | Date | null | undefined): string => {
  if (!val) return "—";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${d}/${m}/${y}`;
  }
  const iso = String(val);
  const datePart = iso.split("T")[0]; // "2026-08-16"
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
};

export default function DiarioObrasPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Redirect if not logged in or doesn't have route access
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    } else if (sessionStatus === "authenticated" && session?.user) {
      const user = session.user as any;
      if (user.role !== "ADMIN") {
        const allowed = user.allowedRoutes || [];
        if (allowed.length > 0 && !allowed.includes("/diario")) {
          router.push(allowed[0]);
        }
      }
    }
  }, [sessionStatus, session, router]);

  // RDO States
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"diario" | "atividades" | "historico">("diario");
  const [obrasSubTab, setObrasSubTab] = useState<"revisoes" | "gerenciamento" | "relatorios">("revisoes");
  const [activeReportType, setActiveReportType] = useState<"geral" | "diario" | "mensal">("geral");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [ativos, setAtivos] = useState<any[]>([]); // To list projects (OrcamentoProjeto)
  const [users, setUsers] = useState<any[]>([]); // To list users for assignments
  const [activities, setActivities] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]); // Para listar os Ativos da gestão de ativos
  
  // Search and Filter States
  const [selectedObraFilter, setSelectedObraFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Feedback Messages
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Modals & Form States
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    projetoId: "",
    descricao: "",
    responsavelId: "",
    status: "PLANEJADA",
    dataInicio: "",
    dataFim: "",
    observacao: ""
  });

  const [selectedActivityForLog, setSelectedActivityForLog] = useState<any | null>(null);
  const [logForm, setLogForm] = useState({
    descricao: "",
    progresso: "0",
    fotos: [] as string[],
    audios: [] as string[],
    data: new Date().toISOString().split("T")[0],
    ativoId: "",
    horimetroInicio: "",
    horimetroFim: "",
    fotoHorimetroInicioUrl: "",
    fotoHorimetroFimUrl: "",
    statusLancamento: "FINALIZADO" // "INICIADO" ou "FINALIZADO"
  });

  const [reviewingLog, setReviewingLog] = useState<any | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [activeLogIdToday, setActiveLogIdToday] = useState<string | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Upload progress state
  const [uploadingFile, setUploadingFile] = useState(false);

  const isSupervisor = session?.user && ((session.user as any).role === "ADMIN" || (session.user as any).role === "SUPERVISOR");
  const isAdmin = session?.user && (session.user as any).role === "ADMIN";

  // RDO Review & Audit Log States
  const [selectedRdoForReview, setSelectedRdoForReview] = useState<any>(null);
  const [reviewAuditLogs, setReviewAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [reviewTab, setReviewTab] = useState<"detalhes" | "audit">("detalhes");
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);

  const openRdoReviewModal = async (logOrRdo: any) => {
    setSelectedRdoForReview(logOrRdo);
    setReviewTab("detalhes");
    setLoadingAuditLogs(true);
    try {
      const res = await fetch(`/api/diario/rdo-diario/${logOrRdo.id}/audit`);
      if (res.ok) {
        const data = await res.json();
        setReviewAuditLogs(data);
      } else {
        setReviewAuditLogs([]);
      }
    } catch (_e) {
      setReviewAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // Helper para dia da semana
  const getWeekDayName = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const dt = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0));
    const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return days[dt.getUTCDay()] || "";
  };

  // ─── RDO Diário Completo (novas seções) ───────────────────────────────────
  const [quadroTab, setQuadroTab] = useState<"execucao" | "finalizadas">("execucao");
  const [funcionariosCanteiro, setFuncionariosCanteiro] = useState<any[]>([]);
  const [rdosDiarios, setRdosDiarios] = useState<any[]>([]);
  const [rdoDiarioAtivo, setRdoDiarioAtivo] = useState<any | null>(null);
  const [rdoFormTab, setRdoFormTab] = useState<"progresso" | "atividades_auto" | "clima" | "mao_de_obra" | "materiais" | "ocorrencias">("atividades_auto");
  const [showFuncionariosManager, setShowFuncionariosManager] = useState(false);
  const [newFuncionario, setNewFuncionario] = useState({ nome: "", funcao: "", empresa: "PROPRIA", contato: "" });
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);

  // RDO Diário form sections state
  const [rdoClimas, setRdoClimas] = useState<Array<{ periodo: string; condicao: string; impacto: string }>>([
    { periodo: "MANHA", condicao: "ENSOLARADO", impacto: "" },
    { periodo: "TARDE", condicao: "ENSOLARADO", impacto: "" },
  ]);
  const [rdoMaoDeObra, setRdoMaoDeObra] = useState<Array<{
    funcionarioId: string; nomeAvulso: string; funcao: string; empresa: string;
    quantidade: number; horasTrab: number; falta: boolean; justFalta: string;
  }>>([])
  const [rdoMateriais, setRdoMateriais] = useState<Array<{
    material: string; quantidade: number; unidade: string; fornecedor: string; notaFiscal: string;
  }>>([])
  const [rdoOcorrencias, setRdoOcorrencias] = useState<Array<{
    tipo: string; descricao: string; impacto: string; medidaTomada: string;
  }>>([])
  const [rdoObservacoes, setRdoObservacoes] = useState("");
  const [showCapexReportModal, setShowCapexReportModal] = useState(false);
  const [capexLocalObra, setCapexLocalObra] = useState("Canteiro de Obras");
  const [capexObs, setCapexObs] = useState("");

  const isDateMatch = (logDateRaw: any, targetDateStr: string): boolean => {
    if (!logDateRaw || !targetDateStr) return false;
    const isoStr = typeof logDateRaw === "string" ? logDateRaw : logDateRaw.toISOString();
    if (isoStr.startsWith(targetDateStr) || isoStr.includes(targetDateStr)) return true;
    
    const dt = new Date(logDateRaw);
    if (isNaN(dt.getTime())) return false;
    
    const utcDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    const localDateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

    return utcDateStr === targetDateStr || localDateStr === targetDateStr;
  };

  // Busca automática de atividades do dia / em andamento para o RDO
  const atividadesDoDia = React.useMemo(() => {
    const projId = selectedActivityForLog?.projetoId || selectedActivityForLog?.projeto?.id || selectedObraFilter;
    if (!projId) return activities.slice(0, 5); // Fallback: primeiras 5 se nenhuma selecionada
    const targetDateStr = logForm.data || new Date().toISOString().split("T")[0];

    return activities.filter(act => {
      if (act.projetoId !== projId) return false;
      const hasLogToday = logs.some(l => {
        const lDate = new Date(l.data).toISOString().split("T")[0];
        return l.atividadeId === act.id && lDate === targetDateStr;
      });
      return hasLogToday || act.status === "EM_ANDAMENTO" || act.status === "CONCLUIDA";
    });
  }, [selectedActivityForLog, selectedObraFilter, logForm.data, activities, logs]);

  // Identify pending RDO logs for today for the logged-in executor
  const pendingRdosToday = React.useMemo(() => {
    if (isSupervisor || !session?.user) return [];
    
    const todayStr = new Date().toISOString().split("T")[0];
    const userId = (session.user as any).id;
    
    // Filter activities where current user is responsible and status is not CONCLUIDA
    const myActivities = activities.filter(act => act.responsavelId === userId && act.status !== "CONCLUIDA");
    
    // Find activities that do NOT have a FINALIZADO log entry today
    return myActivities.filter(act => {
      const activityLogsToday = logs.filter(log => {
        const logDateStr = new Date(log.data).toISOString().split("T")[0];
        return log.atividadeId === act.id && logDateStr === todayStr && log.statusLancamento === "FINALIZADO";
      });
      return activityLogsToday.length === 0;
    });
  }, [activities, logs, session, isSupervisor]);

  // Calculate RDO and equipment utilization pending logs for supervisor
  const pendingSupervisorList = React.useMemo(() => {
    if (!isSupervisor) return [];
    
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Get all activities not completed
    const activeActivities = activities.filter(act => act.status !== "CONCLUIDA");
    
    return activeActivities.map(act => {
      // Find logs created for this activity today
      const logsToday = logs.filter(log => {
        const logDateStr = new Date(log.data).toISOString().split("T")[0];
        return log.atividadeId === act.id && logDateStr === todayStr;
      });
      
      const hasFinalized = logsToday.some(log => log.statusLancamento === "FINALIZADO");
      const hasStarted = logsToday.some(log => log.statusLancamento === "INICIADO");
      
      if (hasFinalized) {
        return null; // Not pending
      }
      
      let status = "NÃO INICIADO";
      let details = "Nenhum apontamento feito hoje.";
      let buttonText = "Cobrar Início";
      let logId = null;

      if (hasStarted) {
        status = "INICIADO (PENDENTE FECHAMENTO)";
        const startedLog = logsToday.find(log => log.statusLancamento === "INICIADO");
        logId = startedLog?.id;
        details = `Turno iniciado às ${startedLog ? new Date(startedLog.createdAt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'}) : ""}.`;
        if (startedLog?.ativoId) {
          const asset = equipamentos.find(eq => eq.id === startedLog.ativoId);
          details += ` Usando: ${asset ? `${asset.nome} (${asset.codigo})` : "equipamento"} (H. inicial: ${startedLog.horimetroInicio}).`;
        }
        buttonText = "Cobrar Fechamento";
      }

      return {
        id: act.id,
        atividade: act.descricao,
        projeto: act.projeto?.nome || "Sem Projeto",
        responsavel: act.responsavel?.name || act.responsavel?.email || "Sem Responsável",
        status,
        details,
        buttonText,
        logId
      };
    }).filter(Boolean) as any[];
  }, [activities, logs, equipamentos, isSupervisor]);

  // Fetch initial data concurrently in parallel
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProj, resUsers, resAct, resLogs, resEquip, resFuncs, resRdos] = await Promise.all([
        fetch("/api/diario/projetos"),
        fetch("/api/users"),
        fetch("/api/diario/atividades"),
        fetch("/api/diario/lancamentos"),
        fetch("/api/ativos"),
        fetch("/api/diario/funcionarios"),
        fetch("/api/diario/rdo-diario")
      ]);

      if (resProj.ok) {
        const pList = await resProj.json();
        setAtivos(pList);
        if (pList.length > 0 && !selectedObraFilter) {
          setSelectedObraFilter(pList[0].id);
        }
      }
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resAct.ok) setActivities(await resAct.json());
      if (resLogs.ok) setLogs(await resLogs.json());
      if (resEquip.ok) setEquipamentos(await resEquip.json());
      if (resFuncs.ok) setFuncionariosCanteiro(await resFuncs.json());
      if (resRdos.ok) setRdosDiarios(await resRdos.json());
    } catch (err) {
      console.error("Error fetching data:", err);
      setFormError("Erro ao carregar dados do diário de obras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus]);

  // Audio Capture Methods
  const startRecording = async () => {
    try {
      const stream = navigator.mediaDevices && await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!stream) {
        alert("Nenhum microfone encontrado.");
        return;
      }
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([audioBlob], `rdo-nota-voz-${Date.now()}.webm`, { type: "audio/webm" });
        
        const uploadedUrl = await handleFileUpload(file);
        if (uploadedUrl) {
          setLogForm(prev => ({ ...prev, audios: [...prev.audios, uploadedUrl] }));
        }
      };
      
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting mic capture:", err);
      alert("Permissão para gravação de áudio negada ou dispositivo indisponível.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Format recording timer: SS -> MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // General uploader to /api/upload
  const handleFileUpload = async (file: File): Promise<string | null> => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        return data.url;
      } else {
        alert(data.error || "Erro ao carregar arquivo.");
        return null;
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar arquivo.");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // Register New Activity (Supervisor only)
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!newActivity.projetoId || !newActivity.descricao || !newActivity.responsavelId) {
      setFormError("Todos os campos obrigatórios precisam ser preenchidos.");
      return;
    }

    try {
      const res = await fetch("/api/diario/atividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActivity)
      });

      if (res.ok) {
        setFormSuccess("Nova atividade atribuída com sucesso!");
        setNewActivity({
          projetoId: "",
          descricao: "",
          responsavelId: "",
          status: "PLANEJADA",
          dataInicio: "",
          dataFim: "",
          observacao: ""
        });
        setShowAddActivityForm(false);
        fetchData();
      } else {
        const data = await res.json();
        setFormError(data.error || "Erro ao atribuir atividade.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Activity (Supervisor only)
  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    setFormError("");
    setFormSuccess("");

    if (!editingActivity.projetoId || !editingActivity.descricao || !editingActivity.responsavelId) {
      setFormError("Todos os campos obrigatórios precisam ser preenchidos.");
      return;
    }

    try {
      const res = await fetch(`/api/diario/atividades/${editingActivity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingActivity)
      });

      if (res.ok) {
        setFormSuccess("Atividade atualizada com sucesso!");
        setEditingActivity(null);
        fetchData();
      } else {
        const data = await res.json();
        setFormError(data.error || "Erro ao atualizar atividade.");
      }
    } catch (err) {
      setFormError("Erro de conexão.");
    }
  };

  // Delete Activity (Supervisor only)
  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade? Todos os diários vinculados serão removidos!")) return;
    try {
      const res = await fetch(`/api/diario/atividades/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        alert("Erro ao remover atividade.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle activity status (Executor or Supervisor)
  const handleToggleActivityCompletion = async (activityId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "CONCLUIDA" ? "EM_ANDAMENTO" : "CONCLUIDA";
      const res = await fetch(`/api/diario/atividades/${activityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao alterar status da atividade.");
      }
    } catch (err) {
      alert("Erro ao conectar ao servidor.");
    }
  };

  // Executor submit RDO log entry
  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!selectedActivityForLog || !logForm.descricao) {
      setFormError("A descrição do trabalho diário é obrigatória.");
      return;
    }

    // Validate horímetro ranges if an asset requires it and status is FINALIZADO
    if (logForm.ativoId) {
      const selectedAsset = equipamentos.find(eq => eq.id === logForm.ativoId);
      if (selectedAsset && selectedAsset.categoria === "PESADO") {
        if (!logForm.horimetroInicio) {
          setFormError("O horímetro inicial é obrigatório para este equipamento pesado.");
          return;
        }
        if (logForm.statusLancamento === "FINALIZADO") {
          if (!logForm.horimetroFim) {
            setFormError("O horímetro final é obrigatório para fechar o turno deste equipamento pesado.");
            return;
          }
          if (parseFloat(logForm.horimetroFim) < parseFloat(logForm.horimetroInicio)) {
            setFormError("O horímetro final não pode ser menor do que o horímetro inicial.");
            return;
          }
        }
      }
    }

    try {
      const payload = {
        atividadeId: selectedActivityForLog.id,
        ...logForm
      };
      
      const url = activeLogIdToday
        ? `/api/diario/lancamentos/${activeLogIdToday}`
        : "/api/diario/lancamentos";
      const method = activeLogIdToday ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess(activeLogIdToday ? "Lançamento de diário RDO atualizado com sucesso!" : "Lançamento de diário RDO registrado com sucesso!");
        setLogForm({
          descricao: "",
          progresso: "0",
          fotos: [],
          audios: [],
          data: new Date().toISOString().split("T")[0],
          ativoId: "",
          horimetroInicio: "",
          horimetroFim: "",
          fotoHorimetroInicioUrl: "",
          fotoHorimetroFimUrl: "",
          statusLancamento: "FINALIZADO"
        });
        setSelectedActivityForLog(null);
        setActiveLogIdToday(null);
        fetchData();
      } else {
        setFormError(data.error || "Erro ao registrar diário.");
      }
    } catch (err) {
      setFormError("Erro de conexão.");
    }
  };

  // ─── Salva RDO Diário Completo ─────────────────────────────────────────────
  const handleSaveRdoDiario = async (projetoId: string, data: string, status = "RASCUNHO") => {
    if (!projetoId || !data) return null;
    try {
      const payload = { projetoId, data, status, observacoes: rdoObservacoes, climas: rdoClimas, maoDeObra: rdoMaoDeObra, materiais: rdoMateriais, ocorrencias: rdoOcorrencias };
      const res = await fetch("/api/diario/rdo-diario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const saved = await res.json();
        setRdoDiarioAtivo(saved);
        fetchData();
        return saved;
      }
    } catch (e) { console.error(e); }
    return null;
  };

  // Exporta PDF do RDO Diário
  const handleExportPdf = async (rdoId: string) => {
    setExportingPdf(rdoId);
    try {
      const res = await fetch(`/api/diario/rdo-diario/${rdoId}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `RDO-${rdoId}.pdf`;
        a.click(); URL.revokeObjectURL(url);
      } else { alert("Erro ao gerar PDF."); }
    } catch { alert("Erro ao gerar PDF."); } finally { setExportingPdf(null); }
  };

  // CRUD Funcionários de Canteiro
  const handleCreateFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFuncionario.nome || !newFuncionario.funcao) {
      alert("Informe o nome e a função do colaborador.");
      return;
    }
    try {
      const res = await fetch("/api/diario/funcionarios", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(newFuncionario) 
      });
      if (res.ok) { 
        const saved = await res.json();
        setFuncionariosCanteiro(prev => [...prev, saved]);
        setNewFuncionario({ nome: "", funcao: "", empresa: "PROPRIA", contato: "" }); 
        fetchData(); 
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar funcionário.");
      }
    } catch (e: any) { 
      console.error(e); 
      alert("Erro ao salvar colaborador no canteiro.");
    }
  };

  const handleDeleteFuncionario = async (id: string) => {
    if (!confirm("Desativar este funcionário?")) return;
    await fetch(`/api/diario/funcionarios/${id}`, { method: "DELETE" });
    fetchData();
  };

  // Update specific daily log (Supervisor edits or Executor updates)
  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setFormError("");
    setFormSuccess("");

    // Validate horímetro ranges on edit
    if (editingLog.ativoId) {
      const selectedAsset = equipamentos.find(eq => eq.id === editingLog.ativoId);
      if (selectedAsset && selectedAsset.categoria === "PESADO") {
        if (editingLog.horimetroInicio === undefined || editingLog.horimetroInicio === null || editingLog.horimetroInicio === "") {
          setFormError("O horímetro inicial é obrigatório para este equipamento pesado.");
          return;
        }
        if (editingLog.statusLancamento === "FINALIZADO") {
          if (editingLog.horimetroFim === undefined || editingLog.horimetroFim === null || editingLog.horimetroFim === "") {
            setFormError("O horímetro final é obrigatório para fechar o turno deste equipamento pesado.");
            return;
          }
          if (parseFloat(editingLog.horimetroFim) < parseFloat(editingLog.horimetroInicio)) {
            setFormError("O horímetro final não pode ser menor do que o horímetro inicial.");
            return;
          }
        }
      }
    }

    try {
      const res = await fetch(`/api/diario/lancamentos/${editingLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLog)
      });
      if (res.ok) {
        setFormSuccess("Lançamento atualizado com sucesso!");
        setEditingLog(null);
        fetchData();
      } else {
        const data = await res.json();
        setFormError(data.error || "Erro ao atualizar.");
      }
    } catch (err) {
      setFormError("Erro de conexão.");
    }
  };

  // Supervisor reviews log
  const handleReviewLog = async (id: string, approve: boolean) => {
    try {
      const statusRevisao = approve ? "APROVADO" : "COM_QUESTIONAMENTOS";
      const res = await fetch(`/api/diario/lancamentos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusRevisao,
          comentariosSupervisor: reviewComment
        })
      });
      if (res.ok) {
        setReviewComment("");
        setReviewingLog(null);
        fetchData();
      } else {
        alert("Erro ao registrar avaliação.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete log entry
  const handleDeleteLog = async (id: string) => {
    if (!confirm("Excluir este lançamento de diário?")) return;
    try {
      const res = await fetch(`/api/diario/lancamentos/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        alert("Erro ao excluir lançamento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-[#f15a24] border-slate-200"></div>
        <p className="text-sm font-bold text-slate-500">Carregando Diário de Obras...</p>
      </div>
    );
  }

  // Filter tasks based on search or project filter
  const filteredActivities = activities.filter(act => {
    const matchesObra = !selectedObraFilter || act.projetoId === selectedObraFilter;
    const matchesSearch = !searchQuery || 
      act.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.projeto.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.responsavel.name && act.responsavel.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesObra && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      
      {/* Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            <Building className="w-8 h-8 text-[#f15a24]" /> Diário de Obras (RDO)
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão diária de canteiros, apontamentos técnicos, notas de voz e fotos operacionais.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Obra / Usina Selector Dropdown */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center gap-2.5 shadow-xs">
            <Building className="w-4 h-4 text-[#f15a24]" />
            <span className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Usina / Obra:</span>
            <select
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24] cursor-pointer"
              value={selectedObraFilter}
              onChange={(e) => setSelectedObraFilter(e.target.value)}
            >
              <option value="">Todas as Usinas / Obras</option>
              {ativos.map(a => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              const firstAct = activities.find(a => !selectedObraFilter || a.projetoId === selectedObraFilter) || activities[0] || { id: "temp", projeto: ativos[0], descricao: "Apontamento Diário da Obra" };
              setSelectedActivityForLog(firstAct);
            }}
            className="bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3 px-5 rounded-2xl shadow-md uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105"
          >
            <FileText className="w-4 h-4" /> 📋 Preencher RDO do Dia
          </button>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100">
            <HardHat className="w-5 h-5 text-slate-500" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {isSupervisor ? "Supervisor Engenharia" : "Executor Canteiro"}
              </span>
              <span className="text-xs font-black text-slate-800">{session?.user?.name || session?.user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {(formError || formSuccess) && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 font-bold text-xs ${
          formError ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>{formError || formSuccess}</div>
        </div>
      )}

      {/* Pending RDOs Operator Alert */}
      {!isSupervisor && pendingRdosToday.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-4 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">
              ⚠️ RDO PENDENTE PARA HOJE!
            </h4>
            <p className="text-xs text-amber-700 font-medium">
              Você ainda não finalizou o preenchimento do Diário de Obra (RDO) de hoje para as seguintes atividades:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pendingRdosToday.map(act => (
                <button
                  key={act.id}
                  onClick={() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const logHoje = logs.find(l => {
                      const logDateStr = new Date(l.data).toISOString().split("T")[0];
                      return l.atividadeId === act.id && logDateStr === todayStr && l.usuarioId === (session?.user as any)?.id;
                    });
                    setSelectedActivityForLog(act);
                    if (logHoje) {
                      setActiveLogIdToday(logHoje.id);
                      setLogForm({
                        descricao: logHoje.descricao,
                        progresso: logHoje.progresso.toString(),
                        fotos: logHoje.fotos || [],
                        audios: logHoje.audios || [],
                        data: todayStr,
                        ativoId: logHoje.ativoId || "",
                        horimetroInicio: logHoje.horimetroInicio !== null ? logHoje.horimetroInicio.toString() : "",
                        horimetroFim: logHoje.horimetroFim !== null ? logHoje.horimetroFim.toString() : "",
                        fotoHorimetroInicioUrl: logHoje.fotoHorimetroInicioUrl || "",
                        fotoHorimetroFimUrl: logHoje.fotoHorimetroFimUrl || "",
                        statusLancamento: logHoje.statusLancamento || "FINALIZADO"
                      });
                    } else {
                      setActiveLogIdToday(null);
                      setLogForm({
                        descricao: "",
                        progresso: "0",
                        fotos: [],
                        audios: [],
                        data: todayStr,
                        ativoId: "",
                        horimetroInicio: "",
                        horimetroFim: "",
                        fotoHorimetroInicioUrl: "",
                        fotoHorimetroFimUrl: "",
                        statusLancamento: "FINALIZADO"
                      });
                    }
                  }}
                  className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> {act.descricao} ({act.projeto?.nome})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= SUPERVISOR DASHBOARD VIEW ======================= */}
      {/* ========================================================================= */}
      {isSupervisor ? (
        <div className="space-y-6">
          
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase block">Obras Ativas</span>
                <span className="text-xl font-black text-slate-800">{ativos.length}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-orange-50 rounded-2xl text-orange-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase block">Total Atividades</span>
                <span className="text-xl font-black text-slate-800">{activities.length}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-yellow-50 rounded-2xl text-yellow-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase block">Pendentes Revisão</span>
                <span className="text-xl font-black text-slate-800">
                  {logs.filter(l => l.statusRevisao === "PENDENTE").length}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-green-50 rounded-2xl text-green-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase block">Concluídas</span>
                <span className="text-xl font-black text-slate-800">
                  {activities.filter(a => a.status === "CONCLUIDA").length}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-tab navigation inside Supervisor panel */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-b border-slate-200 pb-1">
            <button
              onClick={() => setObrasSubTab("revisoes")}
              className={`pb-2.5 px-2 text-xs uppercase font-black tracking-wider transition-all relative border-b-2 ${
                obrasSubTab === "revisoes" 
                  ? "text-[#f15a24] border-[#f15a24]" 
                  : "text-slate-400 border-transparent hover:text-slate-600"
              }`}
            >
              Revisar Diários ({logs.filter(l => l.statusRevisao === "PENDENTE").length})
            </button>
            <button
              onClick={() => setObrasSubTab("gerenciamento")}
              className={`pb-2.5 px-2 text-xs uppercase font-black tracking-wider transition-all relative border-b-2 ${
                obrasSubTab === "gerenciamento" 
                  ? "text-[#f15a24] border-[#f15a24]" 
                  : "text-slate-400 border-transparent hover:text-slate-600"
              }`}
            >
              Gerenciar Atividades & Equipe ({activities.length})
            </button>
            <button
              onClick={() => setObrasSubTab("relatorios")}
              className={`pb-2.5 px-2 text-xs uppercase font-black tracking-wider transition-all relative border-b-2 ${
                obrasSubTab === "relatorios" 
                  ? "text-[#f15a24] border-[#f15a24]" 
                  : "text-slate-400 border-transparent hover:text-slate-600"
              }`}
            >
              Relatórios & Gráficos
            </button>
          </div>

          {/* Tab 1: Revisões Pendentes */}
          {obrasSubTab === "revisoes" && (
            <div className="space-y-6">
              
              {/* Cobrança de RDO & Equipamentos Pendentes */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#f15a24]" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      Cobrança de Pendências - RDO & Utilização de Equipamentos (Hoje)
                    </h3>
                  </div>
                  <span className="text-[10px] font-black text-[#f15a24] bg-[#f15a24]/10 px-2.5 py-1 rounded-full">
                    {pendingSupervisorList.length} Pendentes
                  </span>
                </div>
                
                {pendingSupervisorList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingSupervisorList.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-100/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all gap-3">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[8px] font-black uppercase text-[#f15a24] bg-[#f15a24]/5 px-2 py-0.5 rounded">
                              {item.projeto}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                              item.status.startsWith("INICIADO") 
                                ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-800 uppercase mt-2">{item.atividade}</h4>
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Executor: <strong className="text-slate-700">{item.responsavel}</strong></span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100/50 leading-relaxed">
                            {item.details}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            const message = `Olá ${item.responsavel.split(" ")[0]}, favor preencher e finalizar o apontamento do RDO da atividade '${item.atividade}' (${item.projeto}) referente ao dia de hoje. Abraços!`;
                            navigator.clipboard.writeText(message);
                            alert(`Mensagem de cobrança copiada para a área de transferência:\n\n"${message}"`);
                          }}
                          className="w-full bg-[#f15a24]/5 hover:bg-[#f15a24]/10 text-[#f15a24] font-black text-[9px] py-2 rounded-xl uppercase tracking-wider transition-colors cursor-pointer border border-[#f15a24]/10"
                        >
                          📢 {item.buttonText}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center text-[10px] text-slate-400 italic font-medium">
                    🎉 Excelente! Todos os executores iniciaram e finalizaram seus RDOs hoje.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Building className="w-5 h-5 text-slate-400" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Lançamentos aguardando revisão
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {logs.filter(l => l.statusRevisao === "PENDENTE").map((log) => (
                  <div key={log.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                            {log.atividade?.projeto?.nome || "Sem Obra"}
                          </span>
                          <h4 className="text-xs font-black text-slate-800 uppercase mt-1.5">{log.atividade?.descricao}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold font-mono">
                          {new Date(log.data).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      {/* Log text description */}
                      <p className="text-xs font-medium text-slate-600 line-clamp-3 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                        {log.descricao}
                      </p>

                      {/* Progress update metric */}
                      <div className="mt-3 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">Apontado:</span>
                        <span className="text-slate-700 font-black">{log.progresso}% de progresso</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      {/* Quick counts for assets */}
                      <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
                        <span>📸 {log.fotos?.length || 0} Fotos</span>
                        <span>🎵 {log.audios?.length || 0} Notas de Voz</span>
                      </div>

                      <button
                        onClick={() => { setReviewingLog(log); setReviewComment(log.comentariosSupervisor || ""); }}
                        className="w-full bg-[#0a192f] hover:bg-slate-800 text-white font-black text-[10px] py-2.5 rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Avaliar & Comentar
                      </button>
                    </div>
                  </div>
                ))}

                {logs.filter(l => l.statusRevisao === "PENDENTE").length === 0 && (
                  <div className="col-span-full bg-white p-12 text-center text-slate-400 italic rounded-3xl border border-slate-100">
                    Nenhum lançamento aguardando revisão no momento.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Gerenciar Atividades e Responsáveis */}
          {obrasSubTab === "gerenciamento" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form column */}
              <div className="col-span-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#f15a24]" /> Nova Atividade
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Atribua tarefas específicas de canteiro aos executores.</p>
                </div>

                <form onSubmit={handleCreateActivity} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Obra / Projeto *</label>
                    <select
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newActivity.projetoId}
                      onChange={e => setNewActivity({...newActivity, projetoId: e.target.value})}
                    >
                      <option value="">Selecione a Obra...</option>
                      {ativos.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Descrição da Atividade *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Instalação das placas fotovoltaicas"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newActivity.descricao}
                      onChange={e => setNewActivity({...newActivity, descricao: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Executor Responsável *</label>
                    <select
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                      value={newActivity.responsavelId}
                      onChange={e => setNewActivity({...newActivity, responsavelId: e.target.value})}
                    >
                      <option value="">Selecione o Responsável...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Início</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={newActivity.dataInicio}
                        onChange={e => setNewActivity({...newActivity, dataInicio: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Fim</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                        value={newActivity.dataFim}
                        onChange={e => setNewActivity({...newActivity, dataFim: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações da Atividade</label>
                    <textarea
                      rows={2}
                      placeholder="Observações técnicas ou especificações da tarefa..."
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                      value={newActivity.observacao}
                      onChange={e => setNewActivity({...newActivity, observacao: e.target.value})}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Atribuir Atividade
                  </button>
                </form>

                {/* Equipe de Canteiro (Card expansível) */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div 
                    onClick={() => setShowFuncionariosManager(!showFuncionariosManager)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all select-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">Equipe de Canteiro</p>
                        <p className="text-[10px] text-slate-500 font-bold">{funcionariosCanteiro.length} funcionário(s) cadastrado(s)</p>
                      </div>
                    </div>
                    <button type="button" className="text-slate-400 cursor-pointer">
                      {showFuncionariosManager ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  {showFuncionariosManager && (
                    <div className="border-t border-slate-100 p-4 space-y-3 animate-in fade-in">
                      <form onSubmit={handleCreateFuncionario} className="grid grid-cols-2 gap-2">
                        <input required value={newFuncionario.nome} onChange={e => setNewFuncionario({...newFuncionario, nome: e.target.value})} placeholder="Nome" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400" />
                        <input required value={newFuncionario.funcao} onChange={e => setNewFuncionario({...newFuncionario, funcao: e.target.value})} placeholder="Função" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400" />
                        <select value={newFuncionario.empresa} onChange={e => setNewFuncionario({...newFuncionario, empresa: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 cursor-pointer">
                          <option value="PROPRIA">Própria</option>
                          <option value="TERCEIRO">Terceiro</option>
                        </select>
                        <button type="submit" className="bg-[#f15a24] text-white font-black text-xs py-2 rounded-xl uppercase tracking-wider cursor-pointer hover:bg-orange-600 transition-all">+ Adicionar</button>
                      </form>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {funcionariosCanteiro.length === 0 && <p className="text-center text-slate-400 text-xs py-4">Nenhum funcionário cadastrado</p>}
                        {funcionariosCanteiro.map(f => (
                          <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                            <div>
                              <span className="text-xs font-bold text-slate-800">{f.nome}</span>
                              <span className="text-[10px] text-slate-500 ml-2">{f.funcao} · {f.empresa === "PROPRIA" ? "Própria" : "Terceiro"}</span>
                            </div>
                            <button type="button" onClick={() => handleDeleteFuncionario(f.id)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Table/List column */}
              <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Quadro de Atividades</h3>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setQuadroTab("execucao")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          quadroTab === "execucao"
                            ? "bg-[#f15a24] text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        ⚡ Em Execução ({filteredActivities.filter(a => a.status !== "CONCLUIDA").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuadroTab("finalizadas")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          quadroTab === "finalizadas"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        ✅ Finalizadas ({filteredActivities.filter(a => a.status === "CONCLUIDA").length})
                      </button>
                    </div>
                  </div>

                  <input 
                    type="text"
                    placeholder="Buscar atividade..."
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none w-full sm:w-auto"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                        <th className="p-3 text-left">Obra</th>
                        <th className="p-3 text-left">Atividade</th>
                        <th className="p-3 text-left">Responsável</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center w-[80px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities
                        .filter(act => quadroTab === "execucao" ? act.status !== "CONCLUIDA" : act.status === "CONCLUIDA")
                        .map((act) => (
                        <tr key={act.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{act.projeto?.nome}</td>
                          <td className="p-3 text-slate-600 font-semibold">
                            <div>{act.descricao}</div>
                            {(act.dataInicio || act.dataFim) && (
                              <div className="text-[9.5px] text-[#f15a24] font-black uppercase mt-1 flex items-center gap-1">
                                <span>📅</span>
                                <span>
                                  {fmtDate(act.dataInicio)} 
                                  {" até "} 
                                  {fmtDate(act.dataFim)}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{act.responsavel?.name || act.responsavel?.email}</td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                act.status === "CONCLUIDA" 
                                  ? "bg-green-50 text-green-700 border border-green-100" 
                                  : act.status === "EM_ANDAMENTO" 
                                  ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                                {act.status === "CONCLUIDA" ? "Concluída" : act.status === "EM_ANDAMENTO" ? "Em Andamento" : "Planejada"}
                              </span>
                              {act.status === "CONCLUIDA" && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleActivityCompletion(act.id, act.status)}
                                  className="text-[8px] font-bold text-red-650 hover:text-red-800 underline bg-transparent border-0 cursor-pointer p-0"
                                  title="Reverter conclusão desta atividade"
                                >
                                  Reverter
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingActivity({
                                    id: act.id,
                                    projetoId: act.projetoId,
                                    descricao: act.descricao,
                                    responsavelId: act.responsavelId,
                                    status: act.status,
                                    dataInicio: act.dataInicio ? fmtDate(act.dataInicio).split("/").reverse().join("-") : "",
                                    dataFim: act.dataFim ? fmtDate(act.dataFim).split("/").reverse().join("-") : ""
                                  });
                                }}
                                className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="Editar Atividade"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Excluir Atividade"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredActivities.filter(act => quadroTab === "execucao" ? act.status !== "CONCLUIDA" : act.status === "CONCLUIDA").length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                            {quadroTab === "execucao" ? "Nenhuma atividade em execução." : "Nenhuma atividade finalizada."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Tab 3: Relatórios & Gráficos */}
          {obrasSubTab === "relatorios" && (() => {
            const totalActivities = activities.length;
            const completedActivities = activities.filter(a => a.status === "CONCLUIDA").length;
            const inProgressActivities = activities.filter(a => a.status === "EM_ANDAMENTO").length;
            const plannedActivities = activities.filter(a => a.status === "PLANEJADA").length;
            const completionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

            const projectAnalytics = ativos.map(p => {
              const projectActs = activities.filter(a => a.projetoId === p.id);
              const totalActs = projectActs.length;
              const completed = projectActs.filter(a => a.status === "CONCLUIDA").length;
              let sumProgress = 0;
              projectActs.forEach(a => {
                const logsForAct = logs.filter(l => l.atividadeId === a.id);
                const lastLog = logsForAct[0];
                if (lastLog) {
                  sumProgress += lastLog.progresso;
                } else if (a.status === "CONCLUIDA") {
                  sumProgress += 100;
                } else if (a.status === "EM_ANDAMENTO") {
                  sumProgress += 50;
                }
              });
              const avgProgress = totalActs > 0 ? Math.round(sumProgress / totalActs) : 0;
              return {
                ...p,
                totalActs,
                completed,
                avgProgress
              };
            });

            // Generate Months Options
            const last12Months = Array.from({ length: 12 }).map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
              const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
              return { label: label.charAt(0).toUpperCase() + label.slice(1), value };
            });

            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Internal Reports Selector tabs */}
                <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-md print:hidden">
                  <button
                    onClick={() => setActiveReportType("geral")}
                    className={`flex-1 py-2 px-3 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeReportType === "geral" ? "bg-[#0a192f] text-white shadow" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Geral & CAPEX
                  </button>
                  <button
                    onClick={() => setActiveReportType("diario")}
                    className={`flex-1 py-2 px-3 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeReportType === "diario" ? "bg-[#0a192f] text-white shadow" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Relatório Diário
                  </button>
                  <button
                    onClick={() => setActiveReportType("mensal")}
                    className={`flex-1 py-2 px-3 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeReportType === "mensal" ? "bg-[#0a192f] text-white shadow" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Relatório Mensal
                  </button>
                </div>

                {/* VIEW 1: GENERAL DASHBOARD */}
                {activeReportType === "geral" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Card 1: Taxa de Conclusão */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Taxa de Conclusão Geral</span>
                          <span className="text-xs font-bold text-slate-400">{completedActivities} de {totalActivities} concluídas</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-[#f15a24]">{completionRate}%</span>
                          <span className="text-xs text-slate-500 font-bold">progresso global</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-[#f15a24] h-full transition-all duration-500 rounded-full" style={{ width: `${completionRate}%` }} />
                        </div>
                      </div>

                      {/* Card 2: Status das Atividades */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Status das Atividades</span>
                        <div className="grid grid-cols-3 gap-2 text-xs font-black">
                          <div className="bg-slate-50 p-2 rounded-xl text-center">
                            <span className="block text-slate-400 text-[10px]">Planejadas</span>
                            <span className="text-base text-slate-700 font-black">{plannedActivities}</span>
                          </div>
                          <div className="bg-blue-50 p-2 rounded-xl text-center">
                            <span className="block text-blue-600 text-[10px]">Em Andamento</span>
                            <span className="text-base text-blue-700 font-black">{inProgressActivities}</span>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-xl text-center">
                            <span className="block text-emerald-600 text-[10px]">Concluídas</span>
                            <span className="text-base text-emerald-700 font-black">{completedActivities}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                          <div className="bg-slate-400 h-full" style={{ width: `${totalActivities > 0 ? (plannedActivities / totalActivities) * 100 : 0}%` }} />
                          <div className="bg-blue-500 h-full" style={{ width: `${totalActivities > 0 ? (inProgressActivities / totalActivities) * 100 : 0}%` }} />
                          <div className="bg-emerald-500 h-full" style={{ width: `${totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0}%` }} />
                        </div>
                      </div>

                      {/* Card 3: Diários RDO Reportados */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Diários RDO Reportados</span>
                        <div className="flex justify-between items-center gap-3">
                          <div>
                            <span className="text-3xl font-black text-slate-800">{logs.length}</span>
                            <span className="text-xs text-slate-400 font-bold ml-1.5">apontamento(s)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="bg-[#0a192f] hover:bg-slate-800 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0 print:hidden"
                          >
                            <FileText className="w-4 h-4 text-orange-400" /> Imprimir Tudo
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Consolidado histórico de lançamentos das obras.</p>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Progresso por Obra (CAPEX)</h3>
                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                          {projectAnalytics.map((p: any) => (
                            <div key={p.id} className="space-y-1.5 border-b border-slate-50 pb-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800 uppercase">{p.nome}</span>
                                <span className="font-black text-[#f15a24]">{p.avgProgress}% médio</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-[#f15a24] h-full transition-all duration-500" style={{ width: `${p.avgProgress}%` }} />
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                                <span>{p.totalActs} atividades vinculadas</span>
                                <span>{p.completed} concluídas</span>
                              </div>
                            </div>
                          ))}
                          {projectAnalytics.length === 0 && (
                            <div className="text-center italic text-slate-400 text-xs py-8">Nenhuma obra cadastrada.</div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Status e Avanço Físico de Atividades</h3>
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                          {activities.map((act: any) => {
                            const actLogs = logs.filter(l => l.atividadeId === act.id);
                            const progressVal = actLogs[0] ? actLogs[0].progresso : (act.status === "CONCLUIDA" ? 100 : 0);
                            
                            return (
                              <div key={act.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-150/50 flex flex-col justify-between gap-2.5">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[9px] text-[#f15a24] font-black uppercase">{act.projeto?.nome}</span>
                                    <h4 className="text-xs font-black text-slate-700 uppercase mt-0.5">{act.descricao}</h4>
                                  </div>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    act.status === "CONCLUIDA" 
                                      ? "bg-green-100 text-green-700" 
                                      : act.status === "EM_ANDAMENTO" 
                                      ? "bg-blue-100 text-blue-700" 
                                      : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {act.status === "CONCLUIDA" ? "Concluída" : act.status === "EM_ANDAMENTO" ? "Em Andamento" : "Planejada"}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                                    <span>Avanço Físico</span>
                                    <span className="text-slate-700 font-black">{progressVal}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#0a192f] h-full transition-all duration-300" style={{ width: `${progressVal}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {activities.length === 0 && (
                            <div className="text-center italic text-slate-400 text-xs py-8">Nenhuma atividade cadastrada.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 2: DAILY REPORT DOSSIER */}
                {activeReportType === "diario" && (() => {
                  const targetDailyRdo = rdosDiarios.find(r => isDateMatch(r.data, reportDate) && (!selectedObraFilter || r.projetoId === selectedObraFilter));
                  const directLogs = logs.filter(l => {
                    const matchesDate = isDateMatch(l.data, reportDate);
                    if (!selectedObraFilter) return matchesDate;
                    return matchesDate && l.atividade?.projetoId === selectedObraFilter;
                  });

                  const dailyLogs = directLogs.length > 0 ? directLogs : activities
                    .filter(act => (!selectedObraFilter || act.projetoId === selectedObraFilter) && (act.status === "EM_ANDAMENTO" || act.status === "CONCLUIDA"))
                    .map(act => ({
                      id: `auto-${act.id}`,
                      atividade: act,
                      progresso: act.status === "CONCLUIDA" ? 100 : 50,
                      descricao: `Atividade ${act.status === "CONCLUIDA" ? "concluída" : "em andamento"} no canteiro de obras.`,
                      usuario: act.responsavel || { name: "Responsável Técnico" },
                      data: reportDate
                    }));

                  // Unified Data Fallbacks
                  const climasData = targetDailyRdo?.climas && targetDailyRdo.climas.length > 0
                    ? targetDailyRdo.climas
                    : [
                        { periodo: "MANHA", condicao: "ENSOLARADO", impacto: "Sem impactos na produtividade." },
                        { periodo: "TARDE", condicao: "ENSOLARADO", impacto: "Sem impactos na produtividade." },
                        { periodo: "NOITE", condicao: "SEM_CHUVA", impacto: "" }
                      ];

                  const maoDeObraData = targetDailyRdo?.maoDeObra && targetDailyRdo.maoDeObra.length > 0
                    ? targetDailyRdo.maoDeObra
                    : funcionariosCanteiro.map(f => ({
                        id: f.id,
                        funcionario: f,
                        nomeAvulso: f.nome,
                        funcao: f.funcao,
                        empresa: f.empresa || "PROPRIA",
                        horasTrab: 8,
                        falta: false
                      }));

                  const equipLogs = directLogs.filter(l => l.ativoId || l.ativo);
                  const equipData = equipLogs.length > 0
                    ? equipLogs
                    : equipamentos
                        .filter(e => !selectedObraFilter || e.projetoId === selectedObraFilter)
                        .map(e => ({
                          id: `auto-eq-${e.id}`,
                          ativo: e,
                          horimetroInicio: e.horimetroAtual || 0,
                          horimetroFim: e.horimetroAtual || 0,
                          descricao: "Equipamento disponível no canteiro."
                        }));

                  const materiaisData = targetDailyRdo?.materiais || [];
                  const ocorrenciasData = targetDailyRdo?.ocorrencias || [];

                  const photosData: string[] = [];
                  if (targetDailyRdo?.fotos) photosData.push(...targetDailyRdo.fotos);
                  directLogs.forEach(l => {
                    if (Array.isArray(l.fotos)) photosData.push(...l.fotos);
                  });

                  const obsData = targetDailyRdo?.observacoes || (directLogs.length > 0 ? "Serviços executados conforme programação do canteiro." : "");

                  const formattedDate = reportDate ? `${fmtDate(reportDate)} — ${getWeekDayName(reportDate)}` : "-";
                  const workforceCount = maoDeObraData.length;
                  const avgProgress = dailyLogs.length > 0 ? Math.round(dailyLogs.reduce((a: number, c: any) => a + (c.progresso || 0), 0) / dailyLogs.length) : 0;

                  return (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Controls header */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-black text-slate-400 uppercase">Selecione o Dia:</label>
                          <input
                            type="date"
                            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCapexReportModal(true)}
                            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black text-xs uppercase px-5 py-3 rounded-2xl transition-all cursor-pointer flex items-center gap-2 shadow-md"
                          >
                            <Eye className="w-4 h-4 text-sky-400" /> Visualizar Relatório
                          </button>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs uppercase px-5 py-3 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                          >
                            <FileText className="w-4 h-4" /> Exportar RDO do Dia
                          </button>
                        </div>
                      </div>

                      {/* PDF Print Target Container */}
                      <div id="print-rdo-diario" className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
                        
                        {/* Header logo / Title */}
                        <div className="border-b-4 border-[#f15a24] pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center gap-4">
                            <img src="/logo.png" alt="Cordeiro Energia" className="h-12 object-contain" />
                            <div>
                              <h1 className="text-xl font-black text-[#1E3A8A] tracking-tight">
                                CORDEIRO ENERGIA / CORDEIRO SERVICE
                              </h1>
                              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight mt-0.5">
                                RELATÓRIO DIÁRIO DE OBRA (RDO)
                              </h2>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase block">Emissão Oficial</span>
                            <span className="text-sm font-black text-slate-800 block">
                              {formattedDate}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 block">Local: Canteiro de Obras</span>
                          </div>
                        </div>

                        {/* Resumo Executivo / KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Apontamentos Realizados</span>
                            <span className="text-lg font-black text-[#1E3A8A]">
                              {dailyLogs.length} lançamento(s)
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Mão de Obra no Canteiro</span>
                            <span className="text-lg font-black text-slate-800">
                              {workforceCount} colaborador(es)
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Avanço Físico Médio</span>
                            <span className="text-lg font-black text-emerald-600">
                              {avgProgress}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Obra Vinculada</span>
                            <span className="text-xs font-black text-[#f15a24] truncate block">
                              {ativos.find(a => a.id === selectedObraFilter)?.nome || targetDailyRdo?.projeto?.nome || "Todas as Obras"}
                            </span>
                          </div>
                        </div>

                        {/* Condições Climáticas (Clima) */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            🌤️ Condições Climáticas do Canteiro
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {climasData.map((c: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                                <span className="text-[9px] font-black uppercase text-slate-400 block">
                                  {c.periodo === "MANHA" ? "🌅 Manhã" : c.periodo === "TARDE" ? "☀️ Tarde" : "🌙 Noite"}
                                </span>
                                <strong className="text-slate-800 uppercase block mt-0.5">{c.condicao}</strong>
                                {c.impacto && <p className="text-[10px] text-amber-700 font-medium mt-1">Impacto: {c.impacto}</p>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tabela Formatada de Atividades Executadas (Com Badges Coloridos) */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            📋 Atividades Executadas no Dia (Finalizadas e Em Andamento)
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-[#0F172A] text-white text-[9px] font-black uppercase tracking-wider">
                                  <th className="p-3 text-left">Obra</th>
                                  <th className="p-3 text-left">Atividade</th>
                                  <th className="p-3 text-center">Status</th>
                                  <th className="p-3 text-center">Progresso</th>
                                  <th className="p-3 text-left">Relato / Apontamento</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {dailyLogs.map((log: any) => {
                                  const prog = log.progresso ?? (log.atividade?.status === "CONCLUIDA" ? 100 : 0);
                                  const isFinalized = prog >= 100 || log.atividade?.status === "CONCLUIDA" || log.statusLancamento === "FINALIZADO";
                                  const isPausada = log.atividade?.status === "PAUSADA" || log.atividade?.status === "AGUARDANDO_MATERIAL";
                                  const isImpedimento = log.atividade?.status === "IMPEDIMENTO";

                                  return (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                      <td className="p-3 font-bold text-slate-800">{log.atividade?.projeto?.nome || "-"}</td>
                                      <td className="p-3 font-bold text-slate-700">{log.atividade?.descricao}</td>
                                      <td className="p-3 text-center">
                                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                                          isFinalized
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : isImpedimento
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : isPausada
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                        }`}>
                                          {isFinalized ? "🟢 Finalizada" : isImpedimento ? "🔴 Impedimento" : isPausada ? "🟡 Paralisada" : "🔵 Em Andamento"}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center font-black text-slate-800">{prog}%</td>
                                      <td className="p-3 text-slate-600 space-y-1.5">
                                        <div>
                                          <strong className="block text-slate-800 font-bold">{log.descricao || "Atividade em andamento no canteiro."}</strong>
                                          {log.atividade?.observacao && (
                                            <span className="block text-[10px] text-slate-500 font-medium italic mt-0.5">
                                              📝 Obs: {log.atividade.observacao}
                                            </span>
                                          )}
                                        </div>
                                        {log.fotos && log.fotos.length > 0 && (
                                          <div className="flex gap-1.5 flex-wrap pt-1">
                                            {log.fotos.map((imgUrl: string, fIdx: number) => (
                                              <a key={fIdx} href={imgUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 block shadow-xs hover:opacity-90 transition-opacity">
                                                <img src={imgUrl} alt={`Foto ${fIdx+1}`} className="w-full h-full object-cover" />
                                              </a>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {dailyLogs.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                      Nenhum apontamento registrado para {fmtDate(reportDate)}.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Mão de Obra Registrada / Equipe Padrão */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            👷 Equipe de Mão de Obra no Dia
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                                  <th className="p-2.5 text-left">Nome / Colaborador</th>
                                  <th className="p-2.5 text-left">Função</th>
                                  <th className="p-2.5 text-center">Empresa</th>
                                  <th className="p-2.5 text-center">Horas Trab.</th>
                                  <th className="p-2.5 text-center">Falta</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {maoDeObraData.map((m: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-2.5 font-bold text-slate-800">{m.funcionario?.nome || m.nomeAvulso || "-"}</td>
                                    <td className="p-2.5 text-slate-600">{m.funcao || m.funcionario?.funcao || "-"}</td>
                                    <td className="p-2.5 text-center text-slate-600">{m.empresa === "PROPRIA" ? "Própria" : "Terceiro"}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-800">{m.horasTrab || 8}h</td>
                                    <td className="p-2.5 text-center font-bold">{m.falta ? <span className="text-red-600">Sim</span> : <span className="text-emerald-600">Não</span>}</td>
                                  </tr>
                                ))}
                                {maoDeObraData.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                                      Nenhum colaborador registrado.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Equipamentos Utilizados (Gestão de Ativos) */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            🛠️ Utilização de Equipamentos (Gestão de Ativos)
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                                  <th className="p-2.5 text-left">Equipamento / Máquina</th>
                                  <th className="p-2.5 text-center">Horímetro Inicial</th>
                                  <th className="p-2.5 text-center">Horímetro Final</th>
                                  <th className="p-2.5 text-center">Horas Trabalhadas</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {equipData.map((l: any, idx: number) => {
                                  const eq = l.ativo || equipamentos.find(e => e.id === l.ativoId);
                                  const hIni = l.horimetroInicio ?? "-";
                                  const hFim = l.horimetroFim ?? "-";
                                  const hDiff = l.horimetroInicio && l.horimetroFim && l.horimetroFim > l.horimetroInicio
                                    ? (parseFloat(l.horimetroFim) - parseFloat(l.horimetroInicio)).toFixed(1) + "h"
                                    : "8.0h";
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-bold text-slate-800">{eq?.nome || "Máquina do Canteiro"} ({eq?.codigo || "N/A"})</td>
                                      <td className="p-2.5 text-center font-semibold text-slate-700">{hIni}</td>
                                      <td className="p-2.5 text-center font-semibold text-slate-700">{hFim}</td>
                                      <td className="p-2.5 text-center font-black text-emerald-600">{hDiff}</td>
                                    </tr>
                                  );
                                })}
                                {equipData.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                                      Nenhum equipamento registrado para esta data.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Materiais Recebidos */}
                        {materiaisData.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                              📦 Materiais Recebidos / Utilizados
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                                    <th className="p-2.5 text-left">Material</th>
                                    <th className="p-2.5 text-center">Qtd.</th>
                                    <th className="p-2.5 text-center">Unidade</th>
                                    <th className="p-2.5 text-left">Fornecedor</th>
                                    <th className="p-2.5 text-center">Nº Nota Fiscal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {materiaisData.map((mat: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-bold text-slate-800">{mat.material}</td>
                                      <td className="p-2.5 text-center font-bold text-slate-800">{mat.quantidade}</td>
                                      <td className="p-2.5 text-center text-slate-600">{mat.unidade}</td>
                                      <td className="p-2.5 text-slate-600">{mat.fornecedor || "-"}</td>
                                      <td className="p-2.5 text-center font-bold text-slate-800">{mat.notaFiscal || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Ocorrências & Incidentes */}
                        {ocorrenciasData.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-black text-red-700 uppercase tracking-wider border-b border-red-200 pb-1 flex items-center gap-1.5">
                              ⚠️ Ocorrências e Paralisações Registradas
                            </h3>
                            <div className="space-y-2">
                              {ocorrenciasData.map((oc: any, idx: number) => (
                                <div key={idx} className="bg-red-50/70 border border-red-200 p-3 rounded-xl text-xs space-y-1">
                                  <div className="flex justify-between items-center">
                                    <strong className="font-black text-red-800 uppercase">{oc.tipo}</strong>
                                  </div>
                                  <p className="text-slate-700 font-medium">{oc.descricao}</p>
                                  {oc.impacto && <p className="text-[10px] text-amber-800 font-bold">Impacto: {oc.impacto}</p>}
                                  {oc.medidaTomada && <p className="text-[10px] text-emerald-800 font-bold">Medida Tomada: {oc.medidaTomada}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Observações Gerais */}
                        {obsData && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
                            <strong className="text-[10px] font-black uppercase text-slate-400 block mb-1">Observações Gerais do Dia:</strong>
                            <p className="whitespace-pre-line font-medium">{obsData}</p>
                          </div>
                        )}

                        {/* Galeria de Fotos do Canteiro */}
                        {photosData.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                              📸 Registros Fotográficos do Canteiro ({photosData.length} fotos)
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                              {photosData.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-slate-200 block shadow-sm hover:opacity-90 transition-opacity">
                                  <img src={url} alt={`Foto Canteiro ${idx + 1}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assinaturas Oficiais */}
                        <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-600">
                          <div className="border-t border-slate-300 pt-2">
                            Responsável Técnico pelo Canteiro
                          </div>
                          <div className="border-t border-slate-300 pt-2">
                            Engenharia & Fiscalização
                          </div>
                        </div>

                        <div className="text-center text-[10px] font-black text-slate-500 uppercase pt-4 border-t border-slate-200">
                          Cordeiro Energia / Cordeiro Service - Diário de Obras
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* VIEW 3: MONTHLY REPORT DOSSIER */}
                {activeReportType === "mensal" && (() => {
                  const filteredLogs = logs.filter(l => l.data.startsWith(reportMonth));
                  
                  // Compute net progress evolution of activities during this month
                  const activitiesEvolved = activities.filter(act => {
                    const actLogs = filteredLogs.filter(l => l.atividadeId === act.id);
                    return actLogs.length > 0;
                  }).map(act => {
                    const actLogs = filteredLogs.filter(l => l.atividadeId === act.id).sort((a,b) => a.data.localeCompare(b.data));
                    const startProgress = actLogs[0].progresso;
                    const endProgress = actLogs[actLogs.length - 1].progresso;
                    const netGrowth = Math.max(0, endProgress - startProgress);
                    return {
                      ...act,
                      startProgress,
                      endProgress,
                      netGrowth
                    };
                  });

                  // Generate formatted Month Title
                  const [year, month] = reportMonth.split("-");
                  const monthDate = new Date(Number(year), Number(month) - 1, 15);
                  const monthName = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                  const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

                  return (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Month picker controls */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-black text-slate-400 uppercase">Selecione o Mês:</label>
                          <select
                            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                            value={reportMonth}
                            onChange={(e) => setReportMonth(e.target.value)}
                          >
                            {last12Months.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => window.print()}
                          className="bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs uppercase px-5 py-3 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4" /> Exportar RDO Mensal
                        </button>
                      </div>

                      {/* Dossier Display */}
                      <div id="print-rdo-mensal" className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
                        <div className="border-b-2 border-slate-100 pb-4 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-[#f15a24] font-black uppercase tracking-wider block">Relatório Consolidado Mensal</span>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{formattedMonthName}</h2>
                          </div>
                          <span className="text-[10px] text-slate-450 font-bold">
                            Emissão: {new Date().toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        {/* Consolidated KPI Grid */}
                        <div className="grid grid-cols-4 gap-4 border-b border-slate-100 pb-6 text-center">
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="text-[8px] text-slate-450 font-black uppercase block">Diários Postados</span>
                            <span className="text-xl font-black text-slate-800">{filteredLogs.length}</span>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="text-[8px] text-slate-455 font-black uppercase block">Frentes de Trabalho</span>
                            <span className="text-xl font-black text-[#f15a24]">{activitiesEvolved.length}</span>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="text-[8px] text-slate-455 font-black uppercase block">Média de Evolução</span>
                            <span className="text-xl font-black text-green-600">
                              {activitiesEvolved.length > 0 
                                ? Math.round(activitiesEvolved.reduce((acc, curr) => acc + curr.netGrowth, 0) / activitiesEvolved.length)
                                : 0}%
                            </span>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="text-[8px] text-slate-455 font-black uppercase block">Obras com Movimentação</span>
                            <span className="text-xl font-black text-blue-600">
                              {new Set(filteredLogs.map(l => l.atividade?.projetoId).filter(Boolean)).size}
                            </span>
                          </div>
                        </div>

                        {/* Activities list with net progress gains */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Evolução de Atividades no Período</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-150 text-[9px] font-black text-slate-450 uppercase">
                                  <th className="py-2.5">Obra / Projeto</th>
                                  <th className="py-2.5">Atividade</th>
                                  <th className="py-2.5 text-center">Início do Mês</th>
                                  <th className="py-2.5 text-center">Final do Mês</th>
                                  <th className="py-2.5 text-center">Net Evolução</th>
                                  <th className="py-2.5">Gráfico de Evolução</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activitiesEvolved.map((act: any) => (
                                  <tr key={act.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">{act.projeto?.nome}</td>
                                    <td className="py-3 font-semibold text-slate-650">{act.descricao}</td>
                                    <td className="py-3 text-center font-bold text-slate-500">{act.startProgress}%</td>
                                    <td className="py-3 text-center font-bold text-slate-800">{act.endProgress}%</td>
                                    <td className="py-3 text-center font-black text-green-600">+{act.netGrowth}%</td>
                                    <td className="py-3 w-1/4">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-full bg-slate-150 h-2.5 rounded-full overflow-hidden flex border border-slate-200">
                                          <div className="bg-slate-350 h-full" style={{ width: `${act.startProgress}%` }} />
                                          <div className="bg-[#f15a24] h-full" style={{ width: `${act.netGrowth}%` }} />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {activitiesEvolved.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                      Nenhuma atividade registrou progresso neste mês.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>
              );
            })()}

          </div>
        ) : (
        // =========================================================================
        // ======================== EXECUTOR DASHBOARD VIEW ========================
        // =========================================================================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main activities assigned to user list */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <HardHat className="w-5 h-5 text-[#f15a24]" /> Minhas Atividades Designadas
              </h3>
              <select
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none"
                value={selectedObraFilter}
                onChange={e => setSelectedObraFilter(e.target.value)}
              >
                <option value="">Filtrar Obra...</option>
                {ativos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActivities.map((act) => {
                const lastLog = act.lancamentos?.[0];

                return (
                  <div key={act.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black uppercase text-[#f15a24] bg-[#f15a24]/10 px-2 py-0.5 rounded-md">
                          {act.projeto?.nome}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          act.status === "CONCLUIDA" 
                            ? "bg-green-50 text-green-700" 
                            : act.status === "EM_ANDAMENTO" 
                            ? "bg-blue-50 text-blue-700" 
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {act.status === "CONCLUIDA" ? "Concluída" : act.status === "EM_ANDAMENTO" ? "Em Progresso" : "Pendente"}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-black text-slate-800 uppercase">{act.descricao}</h4>
                      {(act.dataInicio || act.dataFim) && (
                        <div className="text-[9.5px] text-[#f15a24] font-black uppercase flex items-center gap-1 mt-1">
                          <span>📅</span>
                          <span>
                            {fmtDate(act.dataInicio)} 
                            {" até "} 
                            {fmtDate(act.dataFim)}
                          </span>
                        </div>
                      )}

                      {/* Display last feedback notes from supervisor */}
                      {lastLog && lastLog.statusRevisao === "COM_QUESTIONAMENTOS" && (
                        <div className="bg-red-50 p-3 rounded-xl border border-red-100 space-y-1">
                          <span className="text-[9px] text-red-600 font-black uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> Supervisor Questionou:
                          </span>
                          <p className="text-[10px] text-red-800 font-bold leading-relaxed">{lastLog.comentariosSupervisor}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-200/50">
                      {lastLog && (
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                          <span>Último diário: {new Date(lastLog.data).toLocaleDateString("pt-BR")}</span>
                          <span className="text-slate-600">{lastLog.progresso}% concluído</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const todayStr = new Date().toISOString().split("T")[0];
                            const logHoje = logs.find(l => {
                              const logDateStr = new Date(l.data).toISOString().split("T")[0];
                              return l.atividadeId === act.id && logDateStr === todayStr && l.usuarioId === (session?.user as any)?.id;
                            });

                            setSelectedActivityForLog(act);

                            if (logHoje) {
                              setActiveLogIdToday(logHoje.id);
                              setLogForm({
                                descricao: logHoje.descricao,
                                progresso: logHoje.progresso.toString(),
                                fotos: logHoje.fotos || [],
                                audios: logHoje.audios || [],
                                data: todayStr,
                                ativoId: logHoje.ativoId || "",
                                horimetroInicio: logHoje.horimetroInicio !== null ? logHoje.horimetroInicio.toString() : "",
                                horimetroFim: logHoje.horimetroFim !== null ? logHoje.horimetroFim.toString() : "",
                                fotoHorimetroInicioUrl: logHoje.fotoHorimetroInicioUrl || "",
                                fotoHorimetroFimUrl: logHoje.fotoHorimetroFimUrl || "",
                                statusLancamento: logHoje.statusLancamento || "FINALIZADO"
                              });
                            } else {
                              setActiveLogIdToday(null);
                              setLogForm({
                                descricao: lastLog ? lastLog.descricao : "",
                                progresso: lastLog ? lastLog.progresso.toString() : "0",
                                fotos: [],
                                audios: [],
                                data: todayStr,
                                ativoId: "",
                                horimetroInicio: "",
                                horimetroFim: "",
                                fotoHorimetroInicioUrl: "",
                                fotoHorimetroFimUrl: "",
                                statusLancamento: "FINALIZADO"
                              });
                            }
                          }}
                          className="flex-1 bg-[#f15a24] hover:bg-orange-600 text-white font-black text-[10px] py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer text-center border-0"
                        >
                          {(() => {
                            const todayStr = new Date().toISOString().split("T")[0];
                            const logHoje = logs.find(l => {
                              const logDateStr = new Date(l.data).toISOString().split("T")[0];
                              return l.atividadeId === act.id && logDateStr === todayStr && l.usuarioId === (session?.user as any)?.id;
                            });
                            
                            if (logHoje) {
                              return logHoje.statusLancamento === "INICIADO" ? "🌅 Finalizar RDO" : "📝 Editar RDO";
                            }
                            return lastLog && lastLog.statusRevisao === "COM_QUESTIONAMENTOS" ? "Responder" : "Lançar RDO";
                          })()}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleToggleActivityCompletion(act.id, act.status)}
                          className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border flex items-center justify-center ${
                            act.status === "CONCLUIDA"
                              ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                              : "bg-green-500 text-white hover:bg-green-600 border-green-600 shadow-sm shadow-green-100"
                          }`}
                          title={act.status === "CONCLUIDA" ? "Reabrir Atividade" : "Concluir Atividade"}
                        >
                          {act.status === "CONCLUIDA" ? "Reabrir" : "Concluir"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredActivities.length === 0 && (
                <div className="col-span-full p-12 text-center text-slate-400 italic bg-slate-50 border border-slate-100 rounded-2xl">
                  Nenhuma atividade atribuída a você no momento.
                </div>
              )}
            </div>
          </div>

          {/* Quick history of own logs */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" /> Meu Histórico Recente
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Lançamentos de diários RDO enviados por você.</p>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
              {logs.slice(0, 8).map((log) => (
                <div key={log.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black uppercase text-slate-500">{log.atividade?.projeto?.nome}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                      log.statusRevisao === "APROVADO" 
                        ? "bg-green-100 text-green-700" 
                        : log.statusRevisao === "COM_QUESTIONAMENTOS" 
                        ? "bg-red-100 text-red-700" 
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {log.statusRevisao === "APROVADO" ? "Aprovado" : log.statusRevisao === "COM_QUESTIONAMENTOS" ? "Ajustar" : "Pendente"}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-slate-700 uppercase text-xs">{log.atividade?.descricao}</h4>
                  
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold italic">"{log.descricao}"</p>

                  {log.ativoId && (() => {
                    const asset = equipamentos.find(eq => eq.id === log.ativoId);
                    if (!asset) return null;
                    const isPesado = asset.categoria === "PESADO";
                    return (
                      <div className="text-[9px] bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-650 flex flex-col gap-0.5 mt-1 text-left leading-none font-bold">
                        <span>🛠️ {asset.nome} ({asset.codigo})</span>
                        {isPesado && log.horimetroInicio !== null && (
                          <div className="flex justify-between items-center text-[8px] font-black text-[#f15a24] uppercase mt-0.5">
                            <span>⏱️ H: {log.horimetroInicio} - {log.statusLancamento === "INICIADO" ? "Uso" : log.horimetroFim}</span>
                            {log.statusLancamento === "FINALIZADO" && log.horimetroFim !== null && (
                              <span className="text-emerald-600 font-extrabold">⌛ {(parseFloat(log.horimetroFim.toString()) - parseFloat(log.horimetroInicio.toString())).toFixed(2)}h</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-200">
                    <span>{fmtDate(log.data)}</span>
                    <span className="text-slate-600">{log.progresso}% progresso</span>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  Nenhum diário preenchido ainda.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= HISTÓRICO RDO COMPLETO TAB ======================= */}
      {/* ========================================================================= */}

      {/* RDOs Diários Completos */}
      {rdosDiarios.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#f15a24]" /> RDOs Diários Completos
          </h3>
          {rdosDiarios.slice(0, 10).map((rdo: any) => (
            <div key={rdo.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-[#f15a24]">RDO-{String(rdo.numeroRdo).padStart(3,"0")}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      rdo.status === "APROVADO" ? "bg-emerald-100 text-emerald-700" :
                      rdo.status === "PENDENTE" ? "bg-amber-100 text-amber-700" :
                      rdo.status === "RECUSADO" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{rdo.status}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{rdo.projeto?.nome}</p>
                  <p className="text-xs text-slate-500">{fmtDate(rdo.data)} · {rdo.responsavel?.name || rdo.responsavel?.email}</p>
                  <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                    {rdo.climas?.length > 0 && <span>🌤 {rdo.climas.length} período(s)</span>}
                    {rdo.maoDeObra?.length > 0 && <span>👷 {rdo.maoDeObra.reduce((s: number, m: any) => s + m.quantidade, 0)} pessoa(s)</span>}
                    {rdo.materiais?.length > 0 && <span>📦 {rdo.materiais.length} material(is)</span>}
                    {rdo.ocorrencias?.length > 0 && <span className="text-orange-500">⚠️ {rdo.ocorrencias.length} ocorrência(s)</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleExportPdf(rdo.id)}
                  disabled={exportingPdf === rdo.id}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-3 h-3" />
                  {exportingPdf === rdo.id ? "Gerando..." : "PDF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" /> Histórico RDO Geral
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Histórico consolidado de apontamentos de diários de obra.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Obra / Projeto</th>
                <th className="p-3 text-left">Atividade</th>
                <th className="p-3 text-left">Equipamento</th>
                <th className="p-3 text-left">Preenchido Por</th>
                <th className="p-3 text-left">Descrição Apontamento</th>
                <th className="p-3 text-center">Progresso</th>
                <th className="p-3 text-center">Revisão</th>
                <th className="p-3 text-center w-[120px]">Evidências</th>
                {isSupervisor && <th className="p-3 text-center w-[60px]">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 text-slate-400 font-bold font-mono whitespace-nowrap">
                    {fmtDate(log.data)}
                  </td>
                  <td className="p-3 font-bold text-slate-800">{log.atividade?.projeto?.nome}</td>
                  <td className="p-3 text-slate-600 font-semibold">{log.atividade?.descricao}</td>
                  <td className="p-3 text-slate-600 font-semibold">
                    {(() => {
                      if (!log.ativoId) return <span className="text-slate-400 italic font-medium">Nenhum</span>;
                      const asset = equipamentos.find(eq => eq.id === log.ativoId);
                      const assetLabel = asset ? `${asset.nome} (${asset.codigo})` : "Equipamento";
                      const isPesado = asset?.categoria === "PESADO";
                      
                      return (
                        <div className="space-y-0.5 text-left leading-normal">
                          <span className="font-bold text-slate-700">{assetLabel}</span>
                          {isPesado && log.horimetroInicio !== null && (
                            <div className="space-y-0.5 mt-0.5 text-left leading-none">
                              <span className="block text-[9px] text-[#f15a24] font-black uppercase">
                                ⏱️ H: {log.horimetroInicio} - {log.statusLancamento === "INICIADO" ? "Em uso" : log.horimetroFim}
                              </span>
                              {log.statusLancamento === "FINALIZADO" && log.horimetroFim !== null && (
                                <span className="block text-[9px] text-emerald-600 font-extrabold uppercase">
                                  ⌛ Trab: {(parseFloat(log.horimetroFim.toString()) - parseFloat(log.horimetroInicio.toString())).toFixed(2)}h
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-slate-600 font-medium">{log.usuario?.name || log.usuario?.email}</td>
                  <td className="p-3 text-slate-600 italic font-semibold leading-relaxed max-w-[200px] truncate" title={log.descricao}>
                    {log.descricao}
                  </td>
                  <td className="p-3 text-center font-black text-slate-800">{log.progresso}%</td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => openRdoReviewModal(log)}
                      className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-sm hover:scale-105 ${
                        log.statusRevisao === "APROVADO" 
                          ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100" 
                          : log.statusRevisao === "COM_QUESTIONAMENTOS" 
                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" 
                          : "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                      }`}
                      title="Clique para revisar RDO e consultar log de auditoria"
                    >
                      🔍 {log.statusRevisao === "APROVADO" ? "Aprovado" : log.statusRevisao === "COM_QUESTIONAMENTOS" ? "Ajustes" : "Pendente (Revisar)"}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {log.fotos.map((url: string, fIdx: number) => (
                        <a key={fIdx} href={url} target="_blank" rel="noreferrer" className="text-[9px] bg-blue-50 text-blue-700 hover:bg-blue-100 px-1.5 py-0.5 rounded font-black">
                          📸 Foto {fIdx + 1}
                        </a>
                      ))}
                      {log.audios.map((url: string, aIdx: number) => (
                        <a key={aIdx} href={url} target="_blank" rel="noreferrer" className="text-[9px] bg-purple-50 text-purple-700 hover:bg-purple-100 px-1.5 py-0.5 rounded font-black flex items-center gap-1">
                          <Mic className="w-2.5 h-2.5" /> Voz {aIdx + 1}
                        </a>
                      ))}
                      {log.fotos.length === 0 && log.audios.length === 0 && (
                        <span className="text-slate-400 italic text-[10px]">Sem anexos</span>
                      )}
                    </div>
                  </td>
                  {isSupervisor && (
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setEditingLog({
                            id: log.id,
                            data: log.data ? new Date(log.data).toISOString().split("T")[0] : "",
                            progresso: log.progresso,
                            descricao: log.descricao,
                            ativoId: log.ativoId || "",
                            horimetroInicio: log.horimetroInicio !== null && log.horimetroInicio !== undefined ? log.horimetroInicio.toString() : "",
                            horimetroFim: log.horimetroFim !== null && log.horimetroFim !== undefined ? log.horimetroFim.toString() : "",
                            statusLancamento: log.statusLancamento,
                          })}
                          className="p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="Editar Apontamento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Excluir Apontamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={isSupervisor ? 10 : 9} className="p-12 text-center text-slate-400 italic">
                    Nenhum diário de obra lançado até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ===================== MODAL EXECUTOR LANÇAMENTO RDO ===================== */}
      {/* ========================================================================= */}
      {selectedActivityForLog && (
        <div className="fixed inset-0 z-50 bg-[#0a192f]/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl h-[94vh] rounded-[2rem] border border-slate-100 shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-6 duration-300">
            
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-[#f15a24] bg-[#f15a24]/10 px-2.5 py-1 rounded-lg">
                    {selectedActivityForLog.projeto?.nome || "Obra"}
                  </span>
                  {logForm.data && (
                    <span className="text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1">
                      📅 {fmtDate(logForm.data)} — <strong className="text-[#f15a24]">{getWeekDayName(logForm.data)}</strong>
                    </span>
                  )}
                </div>
                <h2 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mt-1.5">
                  <Building className="w-5 h-5 text-[#f15a24]" /> 
                  Preenchimento do Relatório Diário de Obra (RDO)
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Atividade de referência: <strong className="text-slate-700">{selectedActivityForLog.descricao}</strong>
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedActivityForLog(null)}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-base cursor-pointer transition-all shadow-sm shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleLogProgress} className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data do Apontamento *</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={logForm.data}
                    onChange={e => setLogForm({...logForm, data: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Progresso Total (%) *</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#f15a24]"
                      value={logForm.progresso}
                      onChange={e => setLogForm({...logForm, progresso: e.target.value})}
                    />
                    <span className="text-xs font-black text-slate-800 w-[45px] text-right">{logForm.progresso}%</span>
                  </div>

                  {(() => {
                    const prevProgress = selectedActivityForLog.lancamentos?.[0]?.progresso || 0;
                    const currentProgress = Number(logForm.progresso);
                    const progressIncrease = Math.max(0, currentProgress - prevProgress);
                    const remaining = Math.max(0, 100 - currentProgress);
                    return (
                      <div className="mt-2 space-y-1.5">
                        {/* Visual Segmented Progress Bar */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-100">
                          <div className="bg-slate-400 h-full transition-all duration-300" style={{ width: `${prevProgress}%` }} title={`Realizado Anteriormente: ${prevProgress}%`} />
                          <div className="bg-[#f15a24] h-full transition-all duration-300" style={{ width: `${progressIncrease}%` }} title={`Avanço Hoje: +${progressIncrease}%`} />
                          <div className="bg-slate-50 h-full transition-all duration-300" style={{ width: `${remaining}%` }} title={`Restante: ${remaining}%`} />
                        </div>
                        {/* Labels row */}
                        <div className="flex justify-between items-center text-[8px] font-black tracking-tight text-slate-400 uppercase">
                          <span>Realizado: <strong className="text-slate-600">{prevProgress}%</strong></span>
                          {progressIncrease > 0 && <span className="text-[#f15a24]">Hoje: <strong>+{progressIncrease}%</strong></span>}
                          <span>A Concluir: <strong className="text-slate-600">{remaining}%</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Atividades Executadas no Dia *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Descreva em detalhes os serviços realizados, pessoal envolvido e status das frentes de trabalho..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                  value={logForm.descricao}
                  onChange={e => setLogForm({...logForm, descricao: e.target.value})}
                />
              </div>

              {/* Uploads gallery / Audio note */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Anexar Fotos Canteiro</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input 
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="rdo-photo-input"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        for (const file of files) {
                          const url = await handleFileUpload(file);
                          if (url) {
                            setLogForm(prev => ({ ...prev, fotos: [...prev.fotos, url] }));
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="rdo-photo-input"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all flex items-center gap-2 border border-slate-200 flex-1 justify-center"
                    >
                      <Upload className="w-4 h-4 text-slate-500" />
                      Escolher Imagens
                    </label>
                  </div>
                  {/* Small files grid */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {logForm.fotos.map((url, index) => (
                      <div key={index} className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
                        <img src={url} alt="canteiro" className="object-cover w-full h-full" />
                        <button
                          type="button"
                          onClick={() => setLogForm(prev => ({ ...prev, fotos: prev.fotos.filter((_, idx) => idx !== index) }))}
                          className="absolute inset-0 bg-red-500/80 text-white font-black text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Gravar Relato de Voz</label>
                  <div className="flex gap-2">
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="bg-red-500 text-white font-black text-[10px] py-2.5 px-4 rounded-xl flex items-center gap-1.5 flex-1 justify-center animate-pulse"
                      >
                        <Square className="w-4 h-4" /> Parar ({formatTime(recordingSeconds)})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-black text-[10px] py-2.5 px-4 rounded-xl flex items-center gap-1.5 flex-1 justify-center"
                      >
                        <Mic className="w-4 h-4 text-[#f15a24]" /> Gravar Áudio (Mic)
                      </button>
                    )}
                  </div>
                  
                  {/* Upload status indicator */}
                  {uploadingFile && (
                    <span className="text-[9px] text-[#f15a24] font-bold block mt-1.5 animate-pulse">Enviando arquivos...</span>
                  )}

                  {/* Recorded list playback */}
                  <div className="space-y-1.5 mt-2">
                    {logForm.audios.map((url, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-250/50">
                        <audio controls src={url} className="h-6 w-full max-w-[200px]" />
                        <button
                          type="button"
                          onClick={() => setLogForm(prev => ({ ...prev, audios: prev.audios.filter((_, idx) => idx !== index) }))}
                          className="text-red-500 font-bold text-[9px] hover:underline"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Utilização de Equipamentos (Opcional) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3 text-left">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  🛠️ Utilização de Equipamento (Gestão de Ativos)
                </h4>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Selecionar Equipamento</label>
                    <button
                      type="button"
                      onClick={() => router.push("/ativos")}
                      className="text-[9px] font-black text-[#f15a24] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Cadastrar Novo Equipamento
                    </button>
                  </div>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-705 outline-none focus:ring-2 focus:ring-[#f15a24] text-slate-800"
                    value={logForm.ativoId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setLogForm(prev => ({
                        ...prev,
                        ativoId: id,
                        horimetroInicio: "",
                        horimetroFim: "",
                        fotoHorimetroInicioUrl: "",
                        fotoHorimetroFimUrl: ""
                      }));
                    }}
                  >
                    <option value="">-- Nenhum Equipamento Utilizado --</option>
                    {equipamentos.map(eq => (
                      <option key={eq.id} value={eq.id} className="text-slate-800">
                        {eq.nome} ({eq.codigo}) - {eq.categoria === "PESADO" ? "Máquina" : "Ferramenta"} [{eq.status}]
                      </option>
                    ))}
                  </select>
                </div>

                {logForm.ativoId && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/50">
                    {/* Status do Turno / RDO */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status da Utilização Hoje</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setLogForm(prev => ({ ...prev, statusLancamento: "INICIADO" }))}
                          className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border cursor-pointer ${
                            logForm.statusLancamento === "INICIADO"
                              ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          🌅 Início do Turno
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogForm(prev => ({ ...prev, statusLancamento: "FINALIZADO" }))}
                          className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border cursor-pointer ${
                            logForm.statusLancamento === "FINALIZADO"
                              ? "bg-[#f15a24] border-[#f15a24] text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          🌇 Fim do Turno
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-400 mt-1 font-semibold">
                        {logForm.statusLancamento === "INICIADO" 
                          ? "Registra o início da utilização e marca o ativo como 'EM USO' na gestão."
                          : "Calcula as horas trabalhadas, registra no histórico de uso e libera o ativo."}
                      </p>
                    </div>

                    {/* Mostrar campos de horímetro caso seja Máquina Pesada */}
                    {(() => {
                      const selectedAsset = equipamentos.find(eq => eq.id === logForm.ativoId);
                      const isPesado = selectedAsset?.categoria === "PESADO";
                      
                      if (!isPesado) return null;

                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Horímetro Inicial *</label>
                              <input
                                type="number"
                                step="any"
                                required
                                placeholder={`Acumulado: ${selectedAsset.horasUso}h`}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                                value={logForm.horimetroInicio}
                                onChange={e => setLogForm(prev => ({ ...prev, horimetroInicio: e.target.value }))}
                              />
                            </div>
                            
                            {logForm.statusLancamento === "FINALIZADO" && (
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Horímetro Final *</label>
                                <input
                                  type="number"
                                  step="any"
                                  required
                                  placeholder="Ex: 1250.5"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                                  value={logForm.horimetroFim}
                                  onChange={e => setLogForm(prev => ({ ...prev, horimetroFim: e.target.value }))}
                                />
                              </div>
                            )}
                          </div>

                          {/* Foto dos Horímetros */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Foto Horímetro Inicial</label>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id="rdo-h-inicio-photo"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await handleFileUpload(file);
                                    if (url) setLogForm(prev => ({ ...prev, fotoHorimetroInicioUrl: url }));
                                  }
                                }}
                              />
                              <label
                                htmlFor="rdo-h-inicio-photo"
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-650 rounded-xl text-[9px] font-black uppercase text-center block cursor-pointer hover:bg-slate-50 transition-all truncate"
                              >
                                {logForm.fotoHorimetroInicioUrl ? "📸 Foto Salva" : "📸 Anexar Foto"}
                              </label>
                              {logForm.fotoHorimetroInicioUrl && (
                                <img src={logForm.fotoHorimetroInicioUrl} alt="H. Inicio" className="w-full h-12 object-cover rounded-lg mt-1 border border-slate-200" />
                              )}
                            </div>

                            {logForm.statusLancamento === "FINALIZADO" && (
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Foto Horímetro Final</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  id="rdo-h-fim-photo"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const url = await handleFileUpload(file);
                                      if (url) setLogForm(prev => ({ ...prev, fotoHorimetroFimUrl: url }));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="rdo-h-fim-photo"
                                  className="px-3 py-2 bg-white border border-slate-200 text-slate-650 rounded-xl text-[9px] font-black uppercase text-center block cursor-pointer hover:bg-slate-50 transition-all truncate"
                                >
                                  {logForm.fotoHorimetroFimUrl ? "📸 Foto Salva" : "📸 Anexar Foto"}
                                </label>
                                {logForm.fotoHorimetroFimUrl && (
                                  <img src={logForm.fotoHorimetroFimUrl} alt="H. Fim" className="w-full h-12 object-cover rounded-lg mt-1 border border-slate-200" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ─── Tabs do RDO Completo ─────────────────────────────────── */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                  <span>📋 RDO Completo do Dia</span>
                  {logForm.data && (
                    <span className="text-[#f15a24] bg-orange-50 px-2 py-0.5 rounded-md font-bold text-[9px]">
                      {getWeekDayName(logForm.data)}
                    </span>
                  )}
                </p>
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 overflow-x-auto">
                  {([
                    { key: "atividades_auto", label: "⚡ Atividades (Auto)" },
                    { key: "clima", label: "🌤 Clima" },
                    { key: "mao_de_obra", label: "👷 Equipe" },
                    { key: "materiais", label: "📦 Materiais" },
                    { key: "ocorrencias", label: "⚠️ Ocorrências" },
                  ] as { key: any; label: string }[]).map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setRdoFormTab(t.key)}
                      className={`flex-1 text-[10px] font-bold px-2.5 py-2 rounded-lg whitespace-nowrap transition-all cursor-pointer ${rdoFormTab === t.key ? "bg-white shadow text-[#f15a24]" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Atividades Automáticas do Dia */}
                {rdoFormTab === "atividades_auto" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tight flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Atividades Inclusas Automática no RDO
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                        As atividades abaixo com lançamento no dia ou em andamento serão anexadas ao relatório final.
                      </p>
                    </div>

                    {atividadesDoDia.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                        Nenhuma atividade ativa no canteiro para esta data.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {atividadesDoDia.map(act => {
                          const latestLog = act.lancamentos?.[0];
                          const prog = latestLog ? latestLog.progresso : (act.status === "CONCLUIDA" ? 100 : 0);
                          return (
                            <div key={act.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-slate-800 truncate">{act.descricao}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                  act.status === "CONCLUIDA" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                }`}>
                                  {prog}% {act.status === "CONCLUIDA" ? "Concluída" : "Em andamento"}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[#f15a24] h-full transition-all duration-300" style={{ width: `${prog}%` }} />
                              </div>
                              {latestLog?.descricao && (
                                <p className="text-[10px] text-slate-500 font-medium italic truncate">
                                  💬 Relato: "{latestLog.descricao}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Clima */}
                {rdoFormTab === "clima" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {rdoClimas.map((c, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] font-black text-slate-500 uppercase w-14">
                            {c.periodo === "MANHA" ? "Manhã" : c.periodo === "TARDE" ? "Tarde" : "Noite"}
                          </span>
                          <select
                            value={c.condicao}
                            onChange={e => { const n = [...rdoClimas]; n[i].condicao = e.target.value; setRdoClimas(n); }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 cursor-pointer"
                          >
                            <option value="ENSOLARADO">☀️ Ensolarado</option>
                            <option value="PARCIALMENTE_NUBLADO">⛅ Parcialmente Nublado</option>
                            <option value="NUBLADO">☁️ Nublado</option>
                            <option value="CHUVOSO">🌧️ Chuvoso</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={c.impacto}
                          onChange={e => { const n = [...rdoClimas]; n[i].impacto = e.target.value; setRdoClimas(n); }}
                          placeholder="Impacto nas atividades (opcional)"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRdoClimas([...rdoClimas, { periodo: "NOITE", condicao: "ENSOLARADO", impacto: "" }])}
                      className="w-full text-[10px] font-bold text-slate-500 border-2 border-dashed border-slate-200 rounded-xl py-2 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      + Adicionar período
                    </button>
                  </div>
                )}

                {/* Mão de Obra */}
                {rdoFormTab === "mao_de_obra" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (funcionariosCanteiro.length > 0) {
                            setRdoMaoDeObra(funcionariosCanteiro.map(f => ({
                              funcionarioId: f.id,
                              nomeAvulso: f.nome,
                              funcao: f.funcao,
                              empresa: f.empresa,
                              quantidade: 1,
                              horasTrab: 8,
                              falta: false,
                              justFalta: ""
                            })));
                          } else {
                            // Default preset matching RDO.pdf model:
                            setRdoMaoDeObra([
                              { funcionarioId: "", nomeAvulso: "Eletricista", funcao: "Eletricista", empresa: "PROPRIA", quantidade: 2, horasTrab: 8, falta: false, justFalta: "" },
                              { funcionarioId: "", nomeAvulso: "Montador", funcao: "Montador", empresa: "PROPRIA", quantidade: 6, horasTrab: 8, falta: false, justFalta: "" },
                              { funcionarioId: "", nomeAvulso: "Servente", funcao: "Servente", empresa: "PROPRIA", quantidade: 2, horasTrab: 8, falta: false, justFalta: "" },
                              { funcionarioId: "", nomeAvulso: "Ajudante", funcao: "Ajudante", empresa: "TERCEIRO", quantidade: 5, horasTrab: 8, falta: false, justFalta: "" }
                            ]);
                          }
                        }}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[10px] py-2 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-blue-100"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" /> ⚡ Carregar Equipe Padrão
                      </button>
                    </div>

                    {rdoMaoDeObra.map((m, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={m.funcionarioId}
                            onChange={e => {
                              const n = [...rdoMaoDeObra];
                              n[i].funcionarioId = e.target.value;
                              const f = funcionariosCanteiro.find(f => f.id === e.target.value);
                              if (f) { n[i].funcao = f.funcao; n[i].empresa = f.empresa; }
                              setRdoMaoDeObra(n);
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 cursor-pointer"
                          >
                            <option value="">Avulso / Selecione</option>
                            {funcionariosCanteiro.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.funcao}</option>)}
                          </select>
                          <button type="button" onClick={() => { const n = [...rdoMaoDeObra]; n.splice(i, 1); setRdoMaoDeObra(n); }} className="text-red-400 hover:text-red-600 cursor-pointer p-1">✕</button>
                        </div>
                        {!m.funcionarioId && (
                          <input type="text" value={m.nomeAvulso} onChange={e => { const n = [...rdoMaoDeObra]; n[i].nomeAvulso = e.target.value; setRdoMaoDeObra(n); }} placeholder="Nome avulso" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Qtd</label>
                            <input type="number" min="1" value={m.quantidade} onChange={e => { const n = [...rdoMaoDeObra]; n[i].quantidade = parseInt(e.target.value) || 1; setRdoMaoDeObra(n); }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Horas</label>
                            <input type="number" min="0" step="0.5" value={m.horasTrab} onChange={e => { const n = [...rdoMaoDeObra]; n[i].horasTrab = parseFloat(e.target.value) || 0; setRdoMaoDeObra(n); }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Empresa</label>
                            <select value={m.empresa} onChange={e => { const n = [...rdoMaoDeObra]; n[i].empresa = e.target.value; setRdoMaoDeObra(n); }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs cursor-pointer">
                              <option value="PROPRIA">Própria</option>
                              <option value="TERCEIRO">Terceiro</option>
                            </select>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={m.falta} onChange={e => { const n = [...rdoMaoDeObra]; n[i].falta = e.target.checked; setRdoMaoDeObra(n); }} className="rounded" />
                          <span className="text-xs text-slate-600">Falta</span>
                        </label>
                      </div>
                    ))}
                    <button type="button" onClick={() => setRdoMaoDeObra([...rdoMaoDeObra, { funcionarioId: "", nomeAvulso: "", funcao: "", empresa: "PROPRIA", quantidade: 1, horasTrab: 8, falta: false, justFalta: "" }])} className="w-full text-[10px] font-bold text-slate-500 border-2 border-dashed border-slate-200 rounded-xl py-2 hover:border-slate-300 transition-all cursor-pointer">
                      + Adicionar funcionário
                    </button>
                  </div>
                )}

                {/* Materiais */}
                {rdoFormTab === "materiais" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {rdoMateriais.map((m, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <div className="flex gap-2">
                          <input type="text" value={m.material} onChange={e => { const n = [...rdoMateriais]; n[i].material = e.target.value; setRdoMateriais(n); }} placeholder="Material / descrição" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                          <button type="button" onClick={() => { const n = [...rdoMateriais]; n.splice(i, 1); setRdoMateriais(n); }} className="text-red-400 hover:text-red-600 cursor-pointer p-1">✕</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" min="0" step="0.01" value={m.quantidade} onChange={e => { const n = [...rdoMateriais]; n[i].quantidade = parseFloat(e.target.value) || 0; setRdoMateriais(n); }} placeholder="Qtd" className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                          <input type="text" value={m.unidade} onChange={e => { const n = [...rdoMateriais]; n[i].unidade = e.target.value; setRdoMateriais(n); }} placeholder="Unidade (un, m, kg)" className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                          <input type="text" value={m.notaFiscal} onChange={e => { const n = [...rdoMateriais]; n[i].notaFiscal = e.target.value; setRdoMateriais(n); }} placeholder="NF" className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                        <input type="text" value={m.fornecedor} onChange={e => { const n = [...rdoMateriais]; n[i].fornecedor = e.target.value; setRdoMateriais(n); }} placeholder="Fornecedor" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                      </div>
                    ))}
                    <button type="button" onClick={() => setRdoMateriais([...rdoMateriais, { material: "", quantidade: 0, unidade: "un", fornecedor: "", notaFiscal: "" }])} className="w-full text-[10px] font-bold text-slate-500 border-2 border-dashed border-slate-200 rounded-xl py-2 hover:border-slate-300 transition-all cursor-pointer">
                      + Adicionar material
                    </button>
                  </div>
                )}

                {/* Ocorrências */}
                {rdoFormTab === "ocorrencias" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {rdoOcorrencias.map((o, i) => (
                      <div key={i} className="bg-orange-50 rounded-xl p-3 space-y-2 border border-orange-100">
                        <div className="flex gap-2">
                          <select value={o.tipo} onChange={e => { const n = [...rdoOcorrencias]; n[i].tipo = e.target.value; setRdoOcorrencias(n); }} className="flex-1 bg-white border border-orange-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <option value="ACIDENTE">🚨 Acidente</option>
                            <option value="QUASE_ACIDENTE">⚠️ Quase-Acidente</option>
                            <option value="ATRASO">⏰ Atraso</option>
                            <option value="PROBLEMA_TECNICO">🔧 Problema Técnico</option>
                            <option value="FALTA_MATERIAL">📭 Falta de Material</option>
                            <option value="CLIMA">🌧️ Condição Climática</option>
                            <option value="OUTRO">📋 Outro</option>
                          </select>
                          <button type="button" onClick={() => { const n = [...rdoOcorrencias]; n.splice(i, 1); setRdoOcorrencias(n); }} className="text-red-400 hover:text-red-600 cursor-pointer p-1">✕</button>
                        </div>
                        <textarea value={o.descricao} onChange={e => { const n = [...rdoOcorrencias]; n[i].descricao = e.target.value; setRdoOcorrencias(n); }} placeholder="Descrição da ocorrência" rows={2} className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-xs resize-none" />
                        <input type="text" value={o.impacto} onChange={e => { const n = [...rdoOcorrencias]; n[i].impacto = e.target.value; setRdoOcorrencias(n); }} placeholder="Impacto nas atividades" className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-xs" />
                        <input type="text" value={o.medidaTomada} onChange={e => { const n = [...rdoOcorrencias]; n[i].medidaTomada = e.target.value; setRdoOcorrencias(n); }} placeholder="Medida tomada" className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-xs" />
                      </div>
                    ))}
                    <button type="button" onClick={() => setRdoOcorrencias([...rdoOcorrencias, { tipo: "ATRASO", descricao: "", impacto: "", medidaTomada: "" }])} className="w-full text-[10px] font-bold text-orange-400 border-2 border-dashed border-orange-200 rounded-xl py-2 hover:border-orange-300 transition-all cursor-pointer">
                      + Registrar ocorrência
                    </button>
                  </div>
                )}

                {/* Observações gerais */}
                <div className="mt-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Observações Gerais do Dia</label>
                  <textarea
                    value={rdoObservacoes}
                    onChange={e => setRdoObservacoes(e.target.value)}
                    rows={2}
                    placeholder="Observações livres sobre o dia de obras..."
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#f15a24]/30"
                  />
                </div>
              </div>

            </form>

            {/* Modal Fixed Footer Actions Bar */}
            <div className="p-4 md:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedActivityForLog(null)}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={async () => {
                    const projetoId = selectedActivityForLog?.projetoId || selectedActivityForLog?.projeto?.id || selectedObraFilter || (activities.length > 0 ? activities[0].projetoId : null);
                    if (!projetoId) { alert("Selecione uma obra ou atividade válida para salvar o RDO."); return; }
                    const saved = await handleSaveRdoDiario(projetoId, logForm.data || new Date().toISOString().split("T")[0], "PENDENTE");
                    if (saved) { alert("RDO do dia salvo com sucesso! Número: RDO-" + String(saved.numeroRdo).padStart(3,"0")); }
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> 💾 Salvar RDO Completo do Dia
                </button>
                <button
                  type="button"
                  onClick={handleLogProgress}
                  disabled={uploadingFile}
                  className="w-full sm:w-auto px-6 py-3 bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Salvar Apontamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== MODAL SUPERVISOR AVALIAR DIÁRIO ==================== */}
      {/* ========================================================================= */}
      {reviewingLog && (
        <div className="fixed inset-0 z-50 bg-[#0a192f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 relative animate-in slide-in-from-bottom-8 duration-300">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  {reviewingLog.atividade?.projeto?.nome}
                </span>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mt-1">
                  <ShieldAlert className="w-5 h-5 text-[#f15a24]" /> 
                  Avaliação de Apontamento RDO
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Executor: {reviewingLog.usuario?.name || reviewingLog.usuario?.email}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setReviewingLog(null)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Relato do Canteiro:</span>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed font-mono">"{reviewingLog.descricao}"</p>
                <div className="text-[10px] font-bold text-slate-400">
                  Data: {fmtDate(reviewingLog.data)} | Progresso Indicado: <strong className="text-slate-700">{reviewingLog.progresso}%</strong>
                </div>
              </div>

              {/* Photos Grid Review */}
              {reviewingLog.fotos.length > 0 && (
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Fotos Anexadas</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {reviewingLog.fotos.map((url: string, index: number) => (
                      <a key={index} href={url} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 block relative">
                        <img src={url} alt="apontamento canteiro" className="object-cover w-full h-full" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice playback list */}
              {reviewingLog.audios.length > 0 && (
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Notas de Voz Relatadas</span>
                  <div className="space-y-2">
                    {reviewingLog.audios.map((url: string, index: number) => (
                      <div key={index} className="flex gap-2 items-center bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
                        <Mic className="w-4 h-4 text-purple-600 shrink-0" />
                        <audio controls src={url} className="h-6 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Comentários ou Questionamentos do Supervisor</label>
                <textarea 
                  rows={3}
                  placeholder="Escreva orientações técnicas, questionamentos sobre prazos, etc..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleReviewLog(reviewingLog.id, false)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-red-200/50"
                >
                  <X className="w-4 h-4" /> Com Questionamentos
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewLog(reviewingLog.id, true)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Aprovar Lançamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= MODAL REVISÃO, EDIÇÃO E AUDITORIA RDO ================= */}
      {/* ========================================================================= */}
      {selectedRdoForReview && (
        <div className="fixed inset-0 z-50 bg-[#0a192f]/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto space-y-6 animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#f15a24] bg-orange-100/70 px-2.5 py-1 rounded-lg">
                  {selectedRdoForReview.atividade?.projeto?.nome || "Obra"}
                </span>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-1 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#f15a24]" />
                  Revisão e Auditoria de RDO
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Apontamento de {fmtDate(selectedRdoForReview.data)} — Preenchido por <strong className="text-slate-700">{selectedRdoForReview.usuario?.name || selectedRdoForReview.usuario?.email || "Colaborador"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRdoForReview(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-sm flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setReviewTab("detalhes")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  reviewTab === "detalhes" ? "bg-[#0a192f] text-white shadow" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📋 Detalhes do RDO
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("audit")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  reviewTab === "audit" ? "bg-[#0a192f] text-white shadow" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📜 Log de Auditoria ({reviewAuditLogs.length})
              </button>
            </div>

            {/* TAB 1: DETALHES */}
            {reviewTab === "detalhes" && (
              <div className="space-y-4 text-left text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <strong className="text-[10px] font-black uppercase text-slate-400 block">Atividade / Relato do Canteiro:</strong>
                  <h4 className="font-bold text-slate-800 uppercase">{selectedRdoForReview.atividade?.descricao}</h4>
                  <p className="text-slate-700 font-medium whitespace-pre-line leading-relaxed">{selectedRdoForReview.descricao}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-500">
                    <span>Avanço Indicado: <strong className="text-emerald-600 font-black">{selectedRdoForReview.progresso}%</strong></span>
                    <span>Status de Revisão: <strong className="text-[#f15a24] uppercase">{selectedRdoForReview.statusRevisao || "PENDENTE"}</strong></span>
                  </div>
                </div>

                {/* Photos */}
                {selectedRdoForReview.fotos && selectedRdoForReview.fotos.length > 0 && (
                  <div>
                    <strong className="text-[10px] font-black uppercase text-slate-400 block mb-2">📸 Fotos do Canteiro:</strong>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedRdoForReview.fotos.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 block shrink-0 shadow-sm hover:opacity-90">
                          <img src={url} alt="Foto RDO" className="object-cover w-full h-full" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voice Audios */}
                {selectedRdoForReview.audios && selectedRdoForReview.audios.length > 0 && (
                  <div>
                    <strong className="text-[10px] font-black uppercase text-slate-400 block mb-2">🎙️ Gravações de Voz:</strong>
                    <div className="space-y-2">
                      {selectedRdoForReview.audios.map((url: string, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center bg-purple-50 p-3 rounded-xl border border-purple-100">
                          <Mic className="w-4 h-4 text-purple-600 shrink-0" />
                          <audio controls src={url} className="h-7 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleReviewLog(selectedRdoForReview.id, false);
                      setSelectedRdoForReview(null);
                    }}
                    className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-red-200 flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> ⚠️ Solicitar Ajustes
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLog({
                          id: selectedRdoForReview.id,
                          data: selectedRdoForReview.data ? new Date(selectedRdoForReview.data).toISOString().split("T")[0] : "",
                          progresso: selectedRdoForReview.progresso,
                          descricao: selectedRdoForReview.descricao,
                          ativoId: selectedRdoForReview.ativoId || "",
                          horimetroInicio: selectedRdoForReview.horimetroInicio?.toString() || "",
                          horimetroFim: selectedRdoForReview.horimetroFim?.toString() || "",
                          statusLancamento: selectedRdoForReview.statusLancamento,
                        });
                        setSelectedRdoForReview(null);
                      }}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-4 h-4" /> ✏️ Editar RDO (Admin)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      handleReviewLog(selectedRdoForReview.id, true);
                      setSelectedRdoForReview(null);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> ✅ Aprovar RDO
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: AUDIT LOGS */}
            {reviewTab === "audit" && (
              <div className="space-y-3 text-left">
                <p className="text-[10px] text-slate-500 font-medium">Histórico registrado de quem acessou, leu ou modificou este RDO com data e hora exatas.</p>
                {loadingAuditLogs ? (
                  <div className="p-8 text-center text-slate-400 animate-pulse text-xs font-bold">Carregando logs de auditoria...</div>
                ) : reviewAuditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs border border-slate-100 rounded-2xl bg-slate-50">
                    Nenhum acesso prévio registrado no log de auditoria.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                          <th className="p-3 text-left">Data & Hora</th>
                          <th className="p-3 text-left">Usuário</th>
                          <th className="p-3 text-center">Ação</th>
                          <th className="p-3 text-left">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reviewAuditLogs.map((logItem: any) => (
                          <tr key={logItem.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-700 whitespace-nowrap">
                              {new Date(logItem.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td className="p-3 font-bold text-slate-800">{logItem.usuarioNome}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                logItem.acao === "APROVACAO" ? "bg-green-100 text-green-800" :
                                logItem.acao === "MODIFICACAO" ? "bg-blue-100 text-blue-800" :
                                logItem.acao === "RECUSA" ? "bg-red-100 text-red-800" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {logItem.acao}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-medium">{logItem.detalhes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-[#0a192f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 relative animate-in slide-in-from-bottom-8 duration-300">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#f15a24]" /> 
                  Editar Atividade de Canteiro
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Modifique os parâmetros da tarefa atribuída.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateActivity} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Obra / Projeto *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={editingActivity.projetoId}
                  onChange={e => setEditingActivity({...editingActivity, projetoId: e.target.value})}
                >
                  {ativos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Descrição da Atividade *</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={editingActivity.descricao}
                  onChange={e => setEditingActivity({...editingActivity, descricao: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Executor Responsável *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={editingActivity.responsavelId}
                  onChange={e => setEditingActivity({...editingActivity, responsavelId: e.target.value})}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Início</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingActivity.dataInicio}
                    onChange={e => setEditingActivity({...editingActivity, dataInicio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Fim</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingActivity.dataFim}
                    onChange={e => setEditingActivity({...editingActivity, dataFim: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status da Atividade *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                  value={editingActivity.status}
                  onChange={e => setEditingActivity({...editingActivity, status: e.target.value})}
                >
                  <option value="PLANEJADA">Planejada</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="CONCLUIDA">Concluída</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações da Atividade</label>
                <textarea
                  rows={3}
                  placeholder="Observações técnicas, especificações ou detalhes da execução..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                  value={editingActivity.observacao || ""}
                  onChange={e => setEditingActivity({...editingActivity, observacao: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= MODAL EDITAR RDO (GESTOR) ======================= */}
      {/* ========================================================================= */}
      {editingLog && (
        <div className="fixed inset-0 z-50 bg-[#0a192f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 relative animate-in slide-in-from-bottom-8 duration-300">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#f15a24]" /> 
                  Editar Lançamento RDO Geral
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Modifique os detalhes do apontamento diário e horímetros.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingLog(null)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateLog} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data do Lançamento *</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingLog.data ? new Date(editingLog.data).toISOString().split("T")[0] : ""}
                    onChange={e => setEditingLog({...editingLog, data: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Progresso Declarado (%) *</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    value={editingLog.progresso}
                    onChange={e => setEditingLog({...editingLog, progresso: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Descrição dos Serviços Executados *</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                  value={editingLog.descricao}
                  onChange={e => setEditingLog({...editingLog, descricao: e.target.value})}
                />
              </div>

              {/* Equipamentos & Horímetro inputs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Vínculo de Equipamento</h4>
                <div>
                  <select
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    value={editingLog.ativoId || ""}
                    onChange={e => setEditingLog({
                      ...editingLog,
                      ativoId: e.target.value || null,
                      horimetroInicio: "",
                      horimetroFim: ""
                    })}
                  >
                    <option value="">Nenhum Equipamento</option>
                    {equipamentos.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.nome} ({eq.codigo})</option>
                    ))}
                  </select>
                </div>

                {editingLog.ativoId && (() => {
                  const asset = equipamentos.find(eq => eq.id === editingLog.ativoId);
                  if (asset?.categoria !== "PESADO") return null;

                  return (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Horímetro Inicial *</label>
                        <input 
                          type="number"
                          step="any"
                          required
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850"
                          value={editingLog.horimetroInicio || ""}
                          onChange={e => setEditingLog({...editingLog, horimetroInicio: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Horímetro Final</label>
                        <input 
                          type="number"
                          step="any"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850"
                          value={editingLog.horimetroFim || ""}
                          onChange={e => setEditingLog({...editingLog, horimetroFim: e.target.value})}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= MODAL VISUALIZAR RELATÓRIO CAPEX ====================== */}
      {/* ========================================================================= */}
      {showCapexReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
          <div className="bg-white w-full max-w-6xl h-[95vh] rounded-[2rem] border border-slate-100 shadow-2xl flex flex-col md:flex-row overflow-hidden relative print:h-auto print:max-w-none print:shadow-none print:border-none print:rounded-none">
            
            {/* Painel Esquerdo: Personalização e Ações (Oculto na impressão) */}
            <div className="w-full md:w-80 bg-slate-50 p-6 border-r border-slate-200 flex flex-col justify-between shrink-0 space-y-4 print:hidden">
              <div>
                <span className="text-[10px] font-black uppercase text-[#f15a24] bg-orange-100/70 px-2.5 py-1 rounded-lg">
                  Gestão de CAPEX
                </span>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mt-2">
                  Pré-visualização do Relatório
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Personalize as informações antes da impressão ou exportação em PDF.
                </p>

                <div className="space-y-3 mt-5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Local da Obra</label>
                    <input
                      type="text"
                      value={capexLocalObra}
                      onChange={e => setCapexLocalObra(e.target.value)}
                      placeholder="Ex: Curvelo - MG"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Instruções / Observações</label>
                    <textarea
                      rows={3}
                      value={capexObs}
                      onChange={e => setCapexObs(e.target.value)}
                      placeholder="Observações técnicas do relatório de canteiro..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#f15a24] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> 🖨️ Confirmar e Imprimir
                </button>

                {rdosDiarios.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const rdo = rdosDiarios.find(r => isDateMatch(r.data, reportDate));
                      if (rdo) handleExportPdf(rdo.id);
                      else alert("Salve o RDO do dia antes de baixar o PDF oficial.");
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Baixar PDF Oficial (Server)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCapexReportModal(false)}
                  className="w-full py-2.5 bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Painel Direito: Documento Estilizado Padrão CAPEX */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-200/50 print:p-0 print:bg-white">
              <div id="capex-print-document" className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto space-y-6 text-slate-800 print:shadow-none print:border-none print:p-0">
                
                {/* Header Corporativo Cordeiro Energia / Cordeiro Service */}
                <div className="border-b-4 border-[#f15a24] pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Cordeiro Energia" className="h-12 object-contain" />
                    <div>
                      <h1 className="text-xl font-black text-[#1E3A8A] tracking-tight">
                        CORDEIRO ENERGIA / CORDEIRO SERVICE
                      </h1>
                      <h2 className="text-base font-black text-slate-800 uppercase tracking-tight mt-0.5">
                        RELATÓRIO DIÁRIO DE OBRA (RDO)
                      </h2>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Emissão Oficial</span>
                    <span className="text-sm font-black text-slate-800 block">
                      {fmtDate(reportDate)} — {getWeekDayName(reportDate)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 block">Local: {capexLocalObra}</span>
                  </div>
                </div>

                {/* Resumo Executivo / KPIs */}
                {(() => {
                  const targetDailyRdo = rdosDiarios.find(r => isDateMatch(r.data, reportDate) && (!selectedObraFilter || r.projetoId === selectedObraFilter));
                  const directLogs = logs.filter(l => isDateMatch(l.data, reportDate) && (!selectedObraFilter || l.atividade?.projetoId === selectedObraFilter));
                  const targetLogs = directLogs.length > 0 ? directLogs : activities
                    .filter(a => (!selectedObraFilter || a.projetoId === selectedObraFilter) && (a.status === "EM_ANDAMENTO" || a.status === "CONCLUIDA"))
                    .map(a => ({
                      id: `auto-${a.id}`,
                      atividade: a,
                      progresso: a.status === "CONCLUIDA" ? 100 : 50,
                      descricao: `Atividade ${a.status === "CONCLUIDA" ? "concluída" : "em andamento"} no canteiro de obras.`
                    }));
                  const workforceCount = targetDailyRdo?.maoDeObra?.length || funcionariosCanteiro.length;
                  const avgProgress = targetLogs.length > 0 ? Math.round(targetLogs.reduce((a: number, c: any) => a + (c.progresso || 0), 0) / targetLogs.length) : 0;

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Apontamentos no Dia</span>
                          <span className="text-lg font-black text-[#1E3A8A]">
                            {targetLogs.length} lançamento(s)
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Mão de Obra Total</span>
                          <span className="text-lg font-black text-slate-800">
                            {workforceCount} colaborador(es)
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Avanço Físico Médio</span>
                          <span className="text-lg font-black text-emerald-600">
                            {avgProgress}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Obra Vinculada</span>
                          <span className="text-xs font-black text-[#f15a24] truncate block">
                            {ativos.find(a => a.id === selectedObraFilter)?.nome || targetDailyRdo?.projeto?.nome || "Todas as Obras"}
                          </span>
                        </div>
                      </div>

                      {/* Condições Climáticas (Clima) */}
                      {targetDailyRdo?.climas && targetDailyRdo.climas.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            🌤️ Condições Climáticas do Canteiro
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
                            {targetDailyRdo.climas.map((c: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                                <span className="text-[9px] font-black uppercase text-slate-400 block">
                                  {c.periodo === "MANHA" ? "🌅 Manhã" : c.periodo === "TARDE" ? "☀️ Tarde" : "🌙 Noite"}
                                </span>
                                <strong className="text-slate-800 uppercase block mt-0.5">{c.condicao}</strong>
                                {c.impacto && <p className="text-[10px] text-amber-700 font-medium mt-1">Impacto: {c.impacto}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tabela Formatada de Atividades (Header Escuro #0F172A + Status Colorido) */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                          📋 Atividades Executadas no Dia (Finalizadas e Em Andamento)
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-[#0F172A] text-white text-[9px] font-black uppercase tracking-wider">
                                <th className="p-3 text-left">Obra</th>
                                <th className="p-3 text-left">Atividade</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Progresso</th>
                                <th className="p-3 text-left">Relato / Apontamento</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {targetLogs.map((log: any) => {
                                const prog = log.progresso ?? (log.atividade?.status === "CONCLUIDA" ? 100 : 0);
                                const isFinalized = prog >= 100 || log.atividade?.status === "CONCLUIDA" || log.statusLancamento === "FINALIZADO";
                                const isPausada = log.atividade?.status === "PAUSADA" || log.atividade?.status === "AGUARDANDO_MATERIAL";
                                const isImpedimento = log.atividade?.status === "IMPEDIMENTO";

                                return (
                                  <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-bold text-slate-800">{log.atividade?.projeto?.nome || "-"}</td>
                                    <td className="p-3 font-bold text-slate-700">{log.atividade?.descricao}</td>
                                    <td className="p-3 text-center">
                                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                                        isFinalized
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : isImpedimento
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : isPausada
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-blue-50 text-blue-700 border-blue-200"
                                      }`}>
                                        {isFinalized ? "🟢 Finalizada" : isImpedimento ? "🔴 Impedimento" : isPausada ? "🟡 Paralisada" : "🔵 Em Andamento"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center font-black text-slate-800">{prog}%</td>
                                    <td className="p-3 text-slate-600">{log.descricao || "Atividade executada no canteiro."}</td>
                                  </tr>
                                );
                              })}
                              {targetLogs.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                    Nenhum apontamento registrado para {fmtDate(reportDate)}.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mão de Obra Registrada */}
                      {targetDailyRdo?.maoDeObra && targetDailyRdo.maoDeObra.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            👷 Equipe de Mão de Obra no Dia
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                                  <th className="p-2.5 text-left">Nome / Colaborador</th>
                                  <th className="p-2.5 text-left">Função</th>
                                  <th className="p-2.5 text-center">Empresa</th>
                                  <th className="p-2.5 text-center">Horas Trab.</th>
                                  <th className="p-2.5 text-center">Falta</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {targetDailyRdo.maoDeObra.map((m: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-2.5 font-bold text-slate-800">{m.funcionario?.nome || m.nomeAvulso || "-"}</td>
                                    <td className="p-2.5 text-slate-600">{m.funcao || m.funcionario?.funcao || "-"}</td>
                                    <td className="p-2.5 text-center text-slate-600">{m.empresa === "PROPRIA" ? "Própria" : "Terceiro"}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-800">{m.horasTrab || 8}h</td>
                                    <td className="p-2.5 text-center font-bold">{m.falta ? <span className="text-red-600">Sim</span> : <span className="text-emerald-600">Não</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Equipamentos Utilizados */}
                      {(() => {
                        const equipLogs = directLogs.filter(l => l.ativoId || l.ativo);
                        if (equipLogs.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                              🛠️ Utilização de Equipamentos no Dia
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                                    <th className="p-2.5 text-left">Equipamento</th>
                                    <th className="p-2.5 text-center">Horímetro Inicial</th>
                                    <th className="p-2.5 text-center">Horímetro Final</th>
                                    <th className="p-2.5 text-center">Horas Trabalhadas</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {equipLogs.map((l: any, idx: number) => {
                                    const eq = l.ativo || equipamentos.find(e => e.id === l.ativoId);
                                    const hIni = l.horimetroInicio ?? "-";
                                    const hFim = l.horimetroFim ?? "-";
                                    const hDiff = l.horimetroInicio && l.horimetroFim ? (parseFloat(l.horimetroFim) - parseFloat(l.horimetroInicio)).toFixed(1) + "h" : "-";
                                    return (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2.5 font-bold text-slate-800">{eq?.nome || "Equipamento"} ({eq?.codigo || "N/A"})</td>
                                        <td className="p-2.5 text-center font-semibold text-slate-700">{hIni}</td>
                                        <td className="p-2.5 text-center font-semibold text-slate-700">{hFim}</td>
                                        <td className="p-2.5 text-center font-black text-emerald-600">{hDiff}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Materiais Recebidos */}
                      {targetDailyRdo?.materiais && targetDailyRdo.materiais.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            📦 Materiais Recebidos / Utilizados
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                                  <th className="p-2.5 text-left">Material</th>
                                  <th className="p-2.5 text-center">Qtd.</th>
                                  <th className="p-2.5 text-center">Unidade</th>
                                  <th className="p-2.5 text-left">Fornecedor</th>
                                  <th className="p-2.5 text-center">Nº Nota Fiscal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {targetDailyRdo.materiais.map((mat: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-2.5 font-bold text-slate-800">{mat.material}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-800">{mat.quantidade}</td>
                                    <td className="p-2.5 text-center text-slate-600">{mat.unidade}</td>
                                    <td className="p-2.5 text-slate-600">{mat.fornecedor || "-"}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-800">{mat.notaFiscal || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Ocorrências & Incidentes */}
                      {targetDailyRdo?.ocorrencias && targetDailyRdo.ocorrencias.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-red-700 uppercase tracking-wider border-b border-red-200 pb-1 flex items-center gap-1.5">
                            ⚠️ Ocorrências e Paralisações Registradas
                          </h3>
                          <div className="space-y-2">
                            {targetDailyRdo.ocorrencias.map((oc: any, idx: number) => (
                              <div key={idx} className="bg-red-50/70 border border-red-200 p-3 rounded-xl text-xs space-y-1">
                                <div className="flex justify-between items-center">
                                  <strong className="font-black text-red-800 uppercase">{oc.tipo}</strong>
                                </div>
                                <p className="text-slate-700 font-medium">{oc.descricao}</p>
                                {oc.impacto && <p className="text-[10px] text-amber-800 font-bold">Impacto: {oc.impacto}</p>}
                                {oc.medidaTomada && <p className="text-[10px] text-emerald-800 font-bold">Medida Tomada: {oc.medidaTomada}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Galeria de Fotos do Canteiro */}
                      {(() => {
                        const allPhotos: string[] = [];
                        directLogs.forEach(l => {
                          if (Array.isArray(l.fotos)) allPhotos.push(...l.fotos);
                        });
                        if (allPhotos.length === 0) return null;

                        return (
                          <div className="space-y-2">
                            <h3 className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                              📸 Registros Fotográficos do Canteiro ({allPhotos.length} fotos)
                            </h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              {allPhotos.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-slate-200 block shadow-sm hover:opacity-90 transition-opacity">
                                  <img src={url} alt={`Foto Canteiro ${idx + 1}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Seção de Observações e Assinaturas */}
                {capexObs && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <strong className="text-[10px] font-black uppercase text-slate-400 block mb-1">Observações do Engenheiro:</strong>
                    <p>{capexObs}</p>
                  </div>
                )}

                <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-600">
                  <div className="border-t border-slate-300 pt-2">
                    Responsável Técnico pelo Canteiro
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    Engenharia & Fiscalização
                  </div>
                </div>

                <div className="text-center text-[10px] font-black text-slate-500 uppercase pt-4 border-t border-slate-200">
                  Cordeiro Energia / Cordeiro Service - Diário de Obras
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
