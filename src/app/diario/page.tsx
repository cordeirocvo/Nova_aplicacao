"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Building, Calendar, Clock, CheckCircle2, User, Mic, Play, 
  Trash2, FileText, Check, X, ShieldAlert, Plus, Search, 
  Sparkles, BarChart3, Upload, HardHat, Square, AlertCircle, MessageSquare
} from "lucide-react";

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
    status: "PLANEJADA"
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

  const isSupervisor = session?.user && (session.user as any).role === "ADMIN";

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

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Obras (OrcamentoProjeto)
      const resProjects = await fetch("/api/diario/projetos");
      if (resProjects.ok) {
        const data = await resProjects.json();
        setAtivos(data);
      }

      // 2. Fetch Users
      const resUsers = await fetch("/api/users");
      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsers(data);
      }

      // 3. Fetch Activities
      const resAct = await fetch("/api/diario/atividades");
      if (resAct.ok) {
        const data = await resAct.json();
        setActivities(data);
      }

      // 4. Fetch Daily Logs
      const resLogs = await fetch("/api/diario/lancamentos");
      if (resLogs.ok) {
        const data = await resLogs.json();
        setLogs(data);
      }

      // 5. Fetch Assets (Equipamentos)
      const resEquip = await fetch("/api/ativos");
      if (resEquip.ok) {
        const data = await resEquip.json();
        setEquipamentos(data);
      }
    } catch (err) {
      console.error("Error loading RDO data:", err);
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
          status: "PLANEJADA"
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
          <div className="flex gap-4 border-b border-slate-200 pb-1">
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

                  <button
                    type="submit"
                    className="w-full bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Atribuir Atividade
                  </button>
                </form>
              </div>

              {/* Table/List column */}
              <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Quadro de Atividades</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Buscar atividade..."
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b border-slate-100">
                        <th className="p-3 text-left">Obra</th>
                        <th className="p-3 text-left">Atividade</th>
                        <th className="p-3 text-left">Responsável</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center w-[60px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map((act) => (
                        <tr key={act.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{act.projeto?.nome}</td>
                          <td className="p-3 text-slate-600 font-semibold">{act.descricao}</td>
                          <td className="p-3 text-slate-600 font-medium">{act.responsavel?.name || act.responsavel?.email}</td>
                          <td className="p-3 text-center">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              act.status === "CONCLUIDA" 
                                ? "bg-green-50 text-green-700 border border-green-100" 
                                : act.status === "EM_ANDAMENTO" 
                                ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              {act.status === "CONCLUIDA" ? "Concluída" : act.status === "EM_ANDAMENTO" ? "Em Andamento" : "Planejada"}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedActivityForLog(act);
                                  setLogForm({
                                    descricao: "",
                                    progresso: String(act.lancamentos?.[0]?.progresso || 0),
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
                                }}
                                className="p-1 text-[#f15a24] hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                title="Lançar Relatório Diário de Obra (RDO)"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir Atividade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredActivities.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                            Nenhuma atividade encontrada.
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
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-md print:hidden">
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
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase block">Taxa de Conclusão Geral</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-[#f15a24]">{completionRate}%</span>
                          <span className="text-xs text-slate-500 font-bold">das atividades</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-[#f15a24] h-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase block">Status das Atividades</span>
                        <div className="flex gap-4 text-xs font-black">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> {plannedActivities} Planejadas
                          </div>
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {inProgressActivities} Em Andamento
                          </div>
                          <div className="flex items-center gap-1.5 text-green-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {completedActivities} Concluídas
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                          <div className="bg-slate-400 h-full" style={{ width: `${totalActivities > 0 ? (plannedActivities / totalActivities) * 100 : 0}%` }} />
                          <div className="bg-blue-500 h-full" style={{ width: `${totalActivities > 0 ? (inProgressActivities / totalActivities) * 100 : 0}%` }} />
                          <div className="bg-green-500 h-full" style={{ width: `${totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase block">Diários RDO Reportados</span>
                        <div className="flex justify-between items-center">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-800">{logs.length}</span>
                            <span className="text-xs text-slate-400 font-bold">apontamentos</span>
                          </div>
                          <button
                            onClick={() => window.print()}
                            className="bg-[#0a192f] hover:bg-slate-800 text-white font-black text-[9px] uppercase px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 print:hidden"
                          >
                            <FileText className="w-3 h-3" /> Imprimir Tudo
                          </button>
                        </div>
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
                  const dailyLogs = logs.filter(l => l.data.startsWith(reportDate));
                  const formattedDate = new Date(reportDate + "T12:00:00").toLocaleDateString("pt-BR", { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  });

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
                        <button
                          onClick={() => window.print()}
                          className="bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs uppercase px-5 py-3 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4" /> Exportar RDO do Dia
                        </button>
                      </div>

                      {/* PDF Print Target Container */}
                      <div id="print-rdo-diario" className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
                        {/* Header logo / Title */}
                        <div className="border-b-2 border-slate-100 pb-4 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-[#f15a24] font-black uppercase tracking-wider block">Relatório Diário de Obra</span>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{formattedDate}</h2>
                          </div>
                          <div className="text-right text-[10px] text-slate-450 font-bold">
                            <span>Emissão: {new Date().toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-6">
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="text-[8px] text-slate-455 font-black uppercase block">Apontamentos Realizados</span>
                            <span className="text-xl font-black text-slate-850">{dailyLogs.length}</span>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="text-[8px] text-slate-455 font-black uppercase block">Total de Obras Ativas</span>
                            <span className="text-xl font-black text-[#f15a24]">
                              {new Set(dailyLogs.map(l => l.atividade?.projeto?.nome).filter(Boolean)).size}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="text-[8px] text-slate-455 font-black uppercase block">Média de Avanço</span>
                            <span className="text-xl font-black text-green-600">
                              {dailyLogs.length > 0 ? Math.round(dailyLogs.reduce((acc, curr) => acc + curr.progresso, 0) / dailyLogs.length) : 0}%
                            </span>
                          </div>
                        </div>

                        {/* Log Entries Dossier */}
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Atividades Desenvolvidas no Dia</h3>
                          
                          {dailyLogs.map((log: any) => (
                            <div key={log.id} className="p-5 rounded-2xl border border-slate-150 bg-slate-50/50 space-y-4 print:break-inside-avoid">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[8px] text-[#f15a24] font-black uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                    {log.atividade?.projeto?.nome || "Sem Obra"}
                                  </span>
                                  <h4 className="text-xs font-black text-slate-800 uppercase mt-1">
                                    {log.atividade?.descricao}
                                  </h4>
                                  <span className="text-[9px] text-slate-450 font-bold block mt-0.5">
                                    Apontado por: {log.usuario?.name || log.usuario?.email || "Colaborador"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-black text-slate-800 block">Avanço Físico</span>
                                  <span className="text-sm font-black text-[#f15a24]">{log.progresso}%</span>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Serviços Executados:</span>
                                <p className="text-xs text-slate-600 font-medium whitespace-pre-line leading-relaxed">
                                  {log.descricao}
                                </p>
                              </div>

                              {/* Audios */}
                              {log.audios && log.audios.length > 0 && (
                                <div className="space-y-1 print:hidden">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Relato por Voz (Áudio):</span>
                                  <div className="flex gap-2 flex-wrap">
                                    {log.audios.map((aud: string, idx: number) => (
                                      <audio key={idx} src={aud} controls className="h-8 max-w-xs scale-90 -ml-4" />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Media Grid of Photos */}
                              {log.fotos && log.fotos.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Registros Fotográficos:</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {log.fotos.map((foto: string, idx: number) => (
                                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={foto} alt={`Registro ${idx + 1}`} className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {dailyLogs.length === 0 && (
                            <div className="text-center py-12 text-slate-400 italic text-xs bg-slate-50 rounded-2xl">
                              Nenhum apontamento de diário de obra foi registrado para esta data.
                            </div>
                          )}
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
                        className="w-full bg-[#f15a24] hover:bg-orange-600 text-white font-black text-[10px] py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        {(() => {
                          const todayStr = new Date().toISOString().split("T")[0];
                          const logHoje = logs.find(l => {
                            const logDateStr = new Date(l.data).toISOString().split("T")[0];
                            return l.atividadeId === act.id && logDateStr === todayStr && l.usuarioId === (session?.user as any)?.id;
                          });
                          
                          if (logHoje) {
                            return logHoje.statusLancamento === "INICIADO" ? "🌅 Finalizar RDO do Dia" : "📝 Editar RDO de Hoje";
                          }
                          return lastLog && lastLog.statusRevisao === "COM_QUESTIONAMENTOS" ? "Responder Questionamentos" : "Lançar Progresso Diário";
                        })()}
                      </button>
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
                  
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-200">
                    <span>{new Date(log.data).toLocaleDateString("pt-BR")}</span>
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
                    {new Date(log.data).toLocaleDateString("pt-BR")}
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
                            <span className="block text-[9px] text-[#f15a24] font-black uppercase">
                              ⏱️ H: {log.horimetroInicio} - {log.statusLancamento === "INICIADO" ? "Em uso" : log.horimetroFim}
                            </span>
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
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      log.statusRevisao === "APROVADO" 
                        ? "bg-green-50 text-green-700 border border-green-100" 
                        : log.statusRevisao === "COM_QUESTIONAMENTOS" 
                        ? "bg-red-50 text-red-700 border border-red-100" 
                        : "bg-yellow-50 text-yellow-700 border border-yellow-100"
                    }`}>
                      {log.statusRevisao === "APROVADO" ? "Aprovado" : log.statusRevisao === "COM_QUESTIONAMENTOS" ? "Ajustes" : "Pendente"}
                    </span>
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
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        <div className="fixed inset-0 z-50 bg-[#0a192f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 relative animate-in slide-in-from-bottom-8 duration-300">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] font-black uppercase text-[#f15a24] bg-[#f15a24]/10 px-2 py-0.5 rounded-md">
                  {selectedActivityForLog.projeto?.nome}
                </span>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mt-1">
                  <HardHat className="w-5 h-5 text-[#f15a24]" /> 
                  Lançar Diário de Obra (RDO)
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Atividade: {selectedActivityForLog.descricao}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedActivityForLog(null)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogProgress} className="space-y-4">
              
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
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Selecionar Equipamento</label>
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedActivityForLog(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="flex-1 bg-[#f15a24] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  Salvar Diário RDO
                </button>
              </div>
            </form>
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
                  Data: {new Date(reviewingLog.data).toLocaleDateString("pt-BR")} | Progresso Indicado: <strong className="text-slate-700">{reviewingLog.progresso}%</strong>
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

    </div>
  );
}
