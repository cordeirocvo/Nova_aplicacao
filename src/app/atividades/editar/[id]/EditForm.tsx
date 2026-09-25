"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader, Camera, CheckCircle, ArrowLeft, Trash, FileText,
  Download, AlertCircle, ImageIcon, UploadCloud, X
} from "lucide-react";

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadState {
  total: number;
  done: number;
  errors: string[];
}

export default function EditForm({
  initialData,
  statuses,
}: {
  initialData: any;
  statuses: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [novaAcao, setNovaAcao] = useState("");

  // Fotos/arquivos já salvos no banco
  const [fotosSalvas, setFotosSalvas] = useState<string[]>(
    initialData.anexoFotos || []
  );
  const [arquivosSalvos, setArquivosSalvos] = useState<string[]>(
    initialData.anexoArquivos || []
  );

  // Novos arquivos selecionados (ainda não enviados)
  const [fotosNovas, setFotosNovas] = useState<File[]>([]);
  const [arquivosNovos, setArquivosNovos] = useState<File[]>([]);
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);

  // Erros de validação de arquivo
  const [fotoErros, setFotoErros] = useState<string[]>([]);

  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Campos do formulário
  const [form, setForm] = useState({
    instalacao: initialData.instalacao || "",
    solicitacao: initialData.solicitacao || "",
    obsInstalacao: initialData.obsInstalacao || "",
    status: initialData.status || "Pendente",
    vendedor: initialData.vendedor || initialData.vendedorSheet || "",
    telefoneCliente:
      initialData.telefoneCliente || initialData.telefoneSheet || "",
    telefoneVendedor: initialData.telefoneVendedor || "",
    cidade: initialData.cidade || initialData.cidadeSheet || "",
    diaPrev: initialData.diaPrev || "",
    automaticoPrevInstala:
      initialData.dataPrevista || initialData.automaticoPrevInstala || "",
  });

  // ── Seleção de fotos com validação e preview ────────────────────────────────
  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const erros: string[] = [];
    const validos: File[] = [];
    const previews: string[] = [];

    const totalJa = fotosSalvas.length + fotosNovas.length;
    if (totalJa + files.length > MAX_FILES) {
      erros.push(`Máximo de ${MAX_FILES} fotos. Você já tem ${totalJa} foto(s).`);
    } else {
      for (const f of files) {
        if (f.size > MAX_FILE_SIZE) {
          erros.push(`"${f.name}" excede ${MAX_FILE_SIZE_MB} MB.`);
        } else if (!f.type.startsWith("image/")) {
          erros.push(`"${f.name}" não é uma imagem válida.`);
        } else {
          validos.push(f);
          previews.push(URL.createObjectURL(f));
        }
      }
    }

    setFotoErros(erros);
    if (validos.length > 0) {
      setFotosNovas((prev) => [...prev, ...validos]);
      setFotosPreview((prev) => [...prev, ...previews]);
    }
    // Limpa o input para permitir reselecionar mesmos arquivos
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  };

  const removeFotoNova = (idx: number) => {
    setFotosNovas((prev) => prev.filter((_, i) => i !== idx));
    setFotosPreview((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Upload sequencial com progresso ────────────────────────────────────────
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    const erros: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setUploadState({ total: files.length, done: i, errors: erros });
      const f = files[i];
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          if (data.url && !data.url.startsWith("data:")) {
            urls.push(data.url);
          } else if (data.error) {
            erros.push(`"${f.name}": ${data.error}`);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          erros.push(`"${f.name}": ${err.error || "Falha no upload"}`);
        }
      } catch (ex: any) {
        erros.push(`"${f.name}": ${ex.message || "Erro de conexão"}`);
      }
    }

    setUploadState({ total: files.length, done: files.length, errors: erros });
    return urls;
  };

  // ── Submissão ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fotoErros.length > 0) return;
    setLoading(true);
    setUploadState(null);

    try {
      let finalFotos = [...fotosSalvas];
      let finalArquivos = [...arquivosSalvos];

      if (fotosNovas.length > 0) {
        const urls = await uploadFiles(fotosNovas);
        finalFotos = [...finalFotos, ...urls];
      }
      if (arquivosNovos.length > 0) {
        const urls = await uploadFiles(arquivosNovos);
        finalArquivos = [...finalArquivos, ...urls];
      }

      const payload = {
        ...form,
        anexoFotos: finalFotos,
        anexoArquivos: finalArquivos,
        novaAcao: novaAcao.trim(),
      };

      const res = await fetch(`/api/activities/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(true);
        fotosPreview.forEach(URL.revokeObjectURL);
        setTimeout(() => router.push("/atividades"), 1800);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Erro ao salvar: ${err.error || "Tente novamente."}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro inesperado: ${err.message || "Verifique sua conexão."}`);
    } finally {
      setLoading(false);
      setUploadState(null);
    }
  };

  // ── Tela de sucesso ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Atividade Atualizada!</h2>
        <p className="text-slate-500 mt-2">Retornando para as atividades...</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent transition-all shadow-sm";
  const labelClass = "text-sm font-semibold text-slate-700 mb-1 block";

  const uploadLabel = uploadState
    ? uploadState.done < uploadState.total
      ? `Enviando foto ${uploadState.done + 1} de ${uploadState.total}...`
      : uploadState.errors.length > 0
      ? `${uploadState.errors.length} erro(s) no upload`
      : "Upload concluído"
    : loading
    ? "Salvando..."
    : "Atualizar Atividade";

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Editar Atividade</h1>
          <p className="text-slate-500 text-sm">
            {initialData.instalacao || "Instalação"} — altere status, fotos e informações
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
        {/* Campos principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Status da Instalação (*)</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Pendente">Pendente (Padrão)</option>
              {statuses.map((st) => (
                <option key={st.id} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Nome do Cliente (Instalação)</label>
            <input
              required
              type="text"
              className={inputClass}
              value={form.instalacao}
              onChange={(e) => setForm({ ...form, instalacao: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Telefone Cliente</label>
            <input
              type="text"
              className={inputClass}
              value={form.telefoneCliente}
              onChange={(e) => setForm({ ...form, telefoneCliente: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Cidade</label>
            <input
              type="text"
              className={inputClass}
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Vendedor</label>
            <input
              type="text"
              className={inputClass}
              value={form.vendedor}
              onChange={(e) => setForm({ ...form, vendedor: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>WhatsApp Vendedor (p/ Alarme)</label>
            <input
              type="text"
              className={inputClass}
              value={form.telefoneVendedor}
              onChange={(e) => setForm({ ...form, telefoneVendedor: e.target.value })}
              placeholder="+55 (XX) XXXXX-XXXX"
            />
          </div>

          <div>
            <label className={labelClass}>Dia Prev</label>
            <input
              type="text"
              className={inputClass}
              value={form.diaPrev}
              onChange={(e) => setForm({ ...form, diaPrev: e.target.value })}
              placeholder="Ex: DD/MM"
            />
          </div>

          <div>
            <label className={labelClass}>Prev. Instalação / Execução</label>
            <input
              type="date"
              className={inputClass}
              value={form.automaticoPrevInstala}
              onChange={(e) => setForm({ ...form, automaticoPrevInstala: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Obs Instalação / Detalhes</label>
          <textarea
            rows={8}
            className={inputClass}
            placeholder="Detalhes técnicos da obra..."
            value={form.obsInstalacao}
            onChange={(e) => setForm({ ...form, obsInstalacao: e.target.value })}
          />
        </div>

        {/* ── Upload de Fotos ──────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between mb-3">
            <label className={labelClass + " mb-0"}>
              Fotos da Instalação
              <span className="text-xs font-normal text-slate-400 ml-2">
                (máx. {MAX_FILES} fotos, {MAX_FILE_SIZE_MB} MB cada)
              </span>
            </label>
            <span className="text-xs text-slate-500">
              {fotosSalvas.length + fotosNovas.length}/{MAX_FILES} foto(s)
            </span>
          </div>

          {/* Botão de seleção */}
          {fotosSalvas.length + fotosNovas.length < MAX_FILES && (
            <label className="flex items-center gap-2 px-4 py-3 bg-[#EAFBF8] text-[#00BFA5] rounded-xl cursor-pointer hover:bg-[#D4F7F1] transition-colors border border-[#00BFA5]/20 font-medium w-fit mb-4">
              <Camera className="w-5 h-5" />
              <span>Escolher Fotos</span>
              <input
                ref={fotoInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFotoSelect}
              />
            </label>
          )}

          {/* Erros de validação */}
          {fotoErros.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              {fotoErros.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {e}
                </div>
              ))}
            </div>
          )}

          {/* Preview das fotos novas */}
          {fotosNovas.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Novas fotos selecionadas (serão enviadas ao salvar)
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {fotosNovas.map((f, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl overflow-hidden border-2 border-[#00BFA5]/40 aspect-square bg-slate-50 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotosPreview[idx]}
                      alt={f.name}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeFotoNova(idx)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-lg"
                        title="Remover"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-[10px] text-white truncate">{f.name}</p>
                      <p className="text-[9px] text-slate-300">
                        {(f.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    {/* Badge "Nova" */}
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-[#00BFA5] text-white px-1.5 py-0.5 rounded">
                      NOVA
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos salvas no banco */}
          {fotosSalvas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Fotos salvas ({fotosSalvas.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {fotosSalvas.map((url, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50 shadow-sm"
                  >
                    {url.startsWith("/") || url.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <a
                        href={url}
                        download={`foto-${idx + 1}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white hover:bg-slate-100 rounded-full shadow-lg text-slate-800 transition-all hover:scale-110"
                        title="Baixar Foto"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setFotosSalvas(fotosSalvas.filter((_, i) => i !== idx))
                        }
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-full shadow-lg text-white transition-all hover:scale-110"
                        title="Remover Foto"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Upload de Arquivos ─────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-8">
          <label className={labelClass}>
            Arquivos / Documentos
            <span className="text-xs font-normal text-slate-400 ml-2">(PDF, DOC, DOCX)</span>
          </label>
          <div className="mt-2 flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors border border-slate-200 font-medium">
              <UploadCloud className="w-5 h-5" />
              <span>Escolher Arquivos</span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setArquivosNovos((prev) => [...prev, ...files]);
                }}
              />
            </label>
            <span className="text-sm text-slate-500">
              {arquivosNovos.length} novo(s) / {arquivosSalvos.length} salvo(s)
            </span>
          </div>

          {/* Novos arquivos */}
          {arquivosNovos.length > 0 && (
            <div className="mt-3 space-y-2">
              {arquivosNovos.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800 font-medium">{f.name}</span>
                    <span className="text-xs text-blue-500">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      NOVO
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setArquivosNovos((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Arquivos salvos */}
          {arquivosSalvos.length > 0 && (
            <div className="mt-3 space-y-2">
              {arquivosSalvos.map((url, idx) => {
                const filename =
                  url.split("/").pop()?.replace(/^[0-9]+-/, "") || `Documento-${idx + 1}`;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-[#E45318]/10 text-[#E45318] rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span
                        className="text-sm font-medium text-slate-700 truncate max-w-[200px]"
                        title={filename}
                      >
                        {filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <a
                        href={url}
                        download={filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-[#00BFA5] hover:bg-[#00BFA5]/10 rounded-lg transition-all"
                        title="Baixar"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setArquivosSalvos(arquivosSalvos.filter((_, i) => i !== idx))
                        }
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Remover"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Histórico ────────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-8 space-y-6">
          <div>
            <label className={labelClass}>Histórico de Ações (Leitura)</label>
            {initialData.historico &&
            Array.isArray(initialData.historico) &&
            initialData.historico.length > 0 ? (
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto text-xs text-slate-700 shadow-inner">
                {(initialData.historico as any[]).map((h: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <span className="font-bold text-slate-500 min-w-[110px]">
                      {h.date}:
                    </span>
                    <span className="break-words leading-tight">{h.action}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 border border-slate-100 rounded-xl p-4">
                Nenhuma ação registrada ainda.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Adicionar Ação Manual ao Histórico</label>
            <textarea
              rows={3}
              className={inputClass}
              placeholder="Ex: Ligado para o cliente para agendar a visita..."
              value={novaAcao}
              onChange={(e) => setNovaAcao(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Ao salvar, este texto será adicionado ao histórico com a data/hora atual.
            </p>
          </div>
        </div>

        {/* ── Progress de upload ───────────────────────────────────────────── */}
        {uploadState && uploadState.done < uploadState.total && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Loader className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">
                Enviando foto {uploadState.done + 1} de {uploadState.total}...
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.round((uploadState.done / uploadState.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {uploadState && uploadState.errors.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <p className="text-sm font-semibold text-amber-700">
              Alguns arquivos não foram enviados:
            </p>
            {uploadState.errors.map((e, i) => (
              <p key={i} className="text-xs text-amber-600">
                • {e}
              </p>
            ))}
          </div>
        )}

        {/* ── Botão submit ─────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={loading || fotoErros.length > 0}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#015299] hover:from-[#1e3470] hover:to-[#01417a] text-white font-medium rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] border-none flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {uploadLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
