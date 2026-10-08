"use client";

import React, { useState } from "react";
import { 
  Building2, User, Phone, Mail, MapPin, Zap, 
  Upload, FileText, CheckCircle2, AlertCircle, 
  Loader2, Sparkles, Shield, Eye, Trash2, HelpCircle,
  Sun, BarChart3, TrendingUp, ArrowRight,
  AlertTriangle, Flame, ShieldAlert
} from "lucide-react";
import { ClientProjectData, UtilityId } from "@/lib/coenergygo";

interface ClientProjectFormProps {
  data: ClientProjectData;
  onChange: (updated: Partial<ClientProjectData>) => void;
  availableCategories: string[];
  onApplyEstimatedLoadToStep1B?: (kw: number) => void;
}

export default function ClientProjectForm({
  data,
  onChange,
  availableCategories,
  onApplyEstimatedLoadToStep1B
}: ClientProjectFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<any | null>(null);

  // Helper para limpar automaticamente dados de exemplo quando o usuário clica/foca no campo
  const clearIfExample = (fieldName: keyof ClientProjectData, exampleValues: string[]) => {
    const current = data[fieldName];
    if (typeof current === 'string' && exampleValues.some(ex => ex.toLowerCase() === current.trim().toLowerCase())) {
      onChange({ [fieldName]: '' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadStatus("Lendo e analisando fatura via leitor inteligente...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ev/utility-bill-parser", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao processar arquivo");
      }

      const result = await res.json();
      if (result.success && result.extracted) {
        const ext = result.extracted;
        setExtractedPreview(ext);
        setUploadStatus("Dados extraídos com sucesso!");

        // Auto-preencher os campos identificados
        // Se o disjuntor não foi informado na conta, deixar em branco (undefined) para que o usuário informe
        onChange({
          clientName: ext.nomeCliente && ext.nomeCliente !== 'Cliente CEMIG' && ext.nomeCliente !== 'Cliente Informado na Fatura' 
            ? ext.nomeCliente 
            : data.clientName,
          address: ext.endereco || data.address,
          installationNumber: ext.numeroInstalacao || data.installationNumber,
          meterNumber: ext.numeroMedidor || data.meterNumber,
          standardBreakerA: (ext.disjuntorAmperes !== null && ext.disjuntorAmperes !== undefined && ext.disjuntorAmperes > 0)
            ? ext.disjuntorAmperes
            : undefined,
          standardCategory: ext.categoriaPadrao || (ext.padraoConexao === 'TRIFASICO' ? 'C1' : ext.padraoConexao === 'BIFASICO' ? 'B1' : 'A1'),
          contractedDemandKW: ext.demandaContratadaKW || ext.demandaMedidaPicoKW || data.contractedDemandKW,
          utilityBillFileName: file.name,
          utilityBillFileUrl: result.fileUrl || undefined,
          utilityBillFileType: file.type.includes('image') || file.name.match(/\.(jpe?g|png|webp)$/i) ? 'image' : 'pdf',
          utility: (ext.concessionaria && ext.concessionaria.toUpperCase().includes('CEMIG')) ? 'CEMIG'
            : (ext.concessionaria && ext.concessionaria.toUpperCase().includes('CPFL')) ? 'CPFL'
            : (ext.concessionaria && ext.concessionaria.toUpperCase().includes('ENERGISA')) ? 'ENERGISA'
            : (ext.concessionaria && ext.concessionaria.toUpperCase().includes('ENEL')) ? 'ENEL_SP'
            : data.utility,
          // Novos Dados de Histórico e GD Solar
          consumoMedioKWh: ext.consumoMedioKWh || data.consumoMedioKWh,
          consumoMaximoKWh: ext.consumoMaximoKWh || data.consumoMaximoKWh,
          demandaEstimadaHistoricoKW: ext.demandaEstimadaHistoricoKW || (ext.consumoMedioKWh ? Number((ext.consumoMedioKWh / (720 * 0.30)).toFixed(1)) : data.demandaEstimadaHistoricoKW),
          saldoGeracaoKWh: ext.saldoGeracaoKWh ?? data.saldoGeracaoKWh,
          energiaCompensadaKWh: ext.energiaCompensadaKWh ?? data.energiaCompensadaKWh,
          historicoConsumo: ext.historicoConsumo || data.historicoConsumo
        });
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao ler fatura de energia: " + (err.message || "Verifique o formato do arquivo"));
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachedBill = () => {
    onChange({
      utilityBillFileName: undefined,
      utilityBillFileUrl: undefined,
      utilityBillFileType: undefined,
      consumoMedioKWh: undefined,
      consumoMaximoKWh: undefined,
      demandaEstimadaHistoricoKW: undefined,
      saldoGeracaoKWh: undefined,
      energiaCompensadaKWh: undefined,
      historicoConsumo: undefined
    });
    setExtractedPreview(null);
    setUploadStatus(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
              Identificação & Entrada
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Dados Cadastrais do Cliente e Padrão da Concessionária
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-800 mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#E45318]" />
            Cadastro do Projeto, Cliente e Padrão de Entrada
          </h3>
          <p className="text-xs text-slate-500">
            Preencha os dados do cliente ou anexe a conta de luz para preenchimento automático das especificações do padrão.
          </p>
        </div>

        {/* Status da Fatura Anexada */}
        {data.utilityBillFileName && (
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#00B356]" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Conta Anexada</span>
              <span className="text-xs font-bold text-emerald-950 truncate max-w-[180px] block">
                {data.utilityBillFileName}
              </span>
            </div>
            <button
              onClick={handleRemoveAttachedBill}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
              title="Remover anexo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ÁREA DE ANEXO DA CONTA DE ENERGIA (DRAG & DROP COM LEITOR INTELIGENTE) */}
      <div className="bg-gradient-to-r from-orange-50/70 via-slate-50 to-emerald-50/50 p-5 rounded-2xl border border-dashed border-orange-300 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E45318]" />
              <h4 className="text-sm font-bold text-slate-800">
                Leitor Inteligente de Conta de Concessionária (PDF ou Foto)
              </h4>
              <span className="bg-orange-100 text-orange-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Multi-Concessionárias
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Anexe a conta em PDF ou foto (CEMIG, CPFL, ENEL, ENERGISA, etc.). O sistema identificará automaticamente o 
              <strong> número da instalação, número do medidor, disjuntor de entrada</strong> e a demanda contratada.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className={`cursor-pointer px-4 py-2.5 rounded-xl font-bold text-xs shadow transition-all flex items-center gap-2 ${
              isUploading 
                ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                : "bg-gradient-to-r from-[#E45318] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white hover:shadow-orange-500/20"
            }`}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisando Fatura...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Anexar Conta de Energia</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {uploadStatus && (
          <div className="mt-3 pt-3 border-t border-orange-200/60 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B356]" />
              {uploadStatus}
            </span>
            {extractedPreview && (
              <span className="text-[11px] text-slate-500">
                Distribuidora: <strong className="text-slate-800">{extractedPreview.concessionaria || 'Identificada'}</strong> | Disjuntor: {extractedPreview.disjuntorAmperes ? (
                  <strong className="text-[#00B356]">{extractedPreview.disjuntorAmperes}A</strong>
                ) : (
                  <strong className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Não informado (confirmar no local)</strong>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* PAINEL DE INTELIGÊNCIA ENERGÉTICA DA FATURA (HISTÓRICO DE CONSUMO & GERAÇÃO SOLAR GD) */}
      {(data.consumoMedioKWh || data.saldoGeracaoKWh || (data.historicoConsumo && data.historicoConsumo.length > 0)) && (
        <div className="bg-gradient-to-br from-slate-900 to-[#0A192F] text-white p-5 md:p-6 rounded-3xl border border-slate-800 shadow-md space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/20 text-[#E45318]">
                <BarChart3 className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">
                  Inteligência da Fatura de Energia
                </span>
                <h4 className="text-sm font-bold text-white">
                  Histórico de Consumo & Estimativa da Carga Existente
                </h4>
              </div>
            </div>
            {data.saldoGeracaoKWh ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Unidade com Geração Solar (GD)
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Distribuidora: <strong className="text-white">{data.utility}</strong>
              </span>
            )}
          </div>

          {/* Métricas Energéticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Consumo Médio */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Consumo Médio Faturado</span>
              <div className="text-lg font-black text-white mt-0.5">
                {data.consumoMedioKWh ? `${data.consumoMedioKWh} kWh` : "—"}
              </div>
              <span className="text-[10px] text-slate-400">Média líquida dos 13 meses</span>
            </div>

            {/* Consumo Máximo */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Mês de Maior Consumo</span>
              <div className="text-lg font-black text-amber-400 mt-0.5">
                {data.consumoMaximoKWh ? `${data.consumoMaximoKWh} kWh` : "—"}
              </div>
              <span className="text-[10px] text-slate-400">Pico faturado: {(data.consumoMaximoKWh ? (data.consumoMaximoKWh / (720 * 0.30)).toFixed(1) : 0)} kW</span>
            </div>

            {/* Demanda Estimada Equivalente */}
            <div className="bg-orange-500/10 p-3.5 rounded-2xl border border-orange-500/30">
              <span className="text-[10px] font-bold uppercase text-orange-300 block">Demanda Estimada (Pico)</span>
              <div className="text-lg font-black text-[#E45318] mt-0.5">
                {data.demandaEstimadaHistoricoKW || (data.consumoMedioKWh ? Number((data.consumoMedioKWh / (720 * 0.30)).toFixed(1)) : 0)} kW
              </div>
              <span className="text-[10px] text-orange-200/80">Fator de Carga FC = 0.30</span>
            </div>

            {/* Ação de Aplicar no Passo 1B com Opções de Carga */}
            <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-300 block">Carga para Passo 1B</span>
              {onApplyEstimatedLoadToStep1B ? (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Usar média faturada da conta"
                      onClick={() => {
                        const kw = data.consumoMedioKWh ? Number((data.consumoMedioKWh / (720 * 0.30)).toFixed(1)) : 1.0;
                        onApplyEstimatedLoadToStep1B(kw);
                        onChange({ demandaEstimadaHistoricoKW: kw });
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      {data.consumoMedioKWh ? Number((data.consumoMedioKWh / (720 * 0.30)).toFixed(1)) : 1.0} kW (Base)
                    </button>
                    <button
                      type="button"
                      title="Usar pico faturado no histórico anual"
                      onClick={() => {
                        const kw = data.consumoMaximoKWh ? Number((data.consumoMaximoKWh / (720 * 0.30)).toFixed(1)) : 1.8;
                        onApplyEstimatedLoadToStep1B(kw);
                        onChange({ demandaEstimadaHistoricoKW: kw });
                      }}
                      className="px-2 py-1 bg-[#E45318] hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      {data.consumoMaximoKWh ? Number((data.consumoMaximoKWh / (720 * 0.30)).toFixed(1)) : 1.8} kW (Pico)
                    </button>
                    <button
                      type="button"
                      title="Demanda típica residencial com chuveiro elétrico"
                      onClick={() => {
                        onApplyEstimatedLoadToStep1B(5.0);
                        onChange({ demandaEstimadaHistoricoKW: 5.0 });
                      }}
                      className="px-2 py-1 bg-[#00B356] hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      5.0 kW (Chuveiro)
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-xs font-bold text-emerald-400 mt-1">Estimativa Pronta</span>
              )}
              <span className="text-[9px] text-emerald-200/70 mt-1">Clique para aplicar ao Passo 1B</span>
            </div>
          </div>

          {/* Seção de Geração Solar GD se houver */}
          {(data.saldoGeracaoKWh || data.energiaCompensadaKWh) && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <Sun className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-amber-200 flex items-center gap-2">
                    <span>Microgeração Fotovoltaica Identificada na Fatura</span>
                  </div>
                  <div className="text-[11px] text-amber-300/80 mt-0.5 space-x-3">
                    {data.saldoGeracaoKWh && (
                      <span>Saldo Acumulado de Créditos: <strong className="text-white">{data.saldoGeracaoKWh} kWh</strong></span>
                    )}
                    {data.energiaCompensadaKWh && (
                      <span>• Energia Compensada no Ciclo: <strong className="text-white">{data.energiaCompensadaKWh} kWh</strong></span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-300 max-w-sm leading-tight">
                ⚠️ <em>Atenção: como o cliente possui usina solar, o consumo diurno real é maior que o faturado pela CEMIG devido ao autoconsumo local. Recomenda-se selecionar <strong>1.8 kW (Pico)</strong> ou <strong>5.0 kW (Chuveiro)</strong> para teste seguro do disjuntor.</em>
              </div>
            </div>
          )}

          {/* Histórico Mensal Visual */}
          {data.historicoConsumo && data.historicoConsumo.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                Histórico de Consumo Mensal Faturado (Últimos Ciclos):
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {data.historicoConsumo.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80 text-center shrink-0">
                    <div className="text-[10px] text-slate-400 font-semibold">{item.mes}</div>
                    <div className="font-bold text-white">{item.kwh} kWh</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FORMULÁRIO DIVIDIDO EM 2 BLOCOS: DADOS DO PROJETO/CLIENTE + DADOS DO PADRÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BLOCO 1: DADOS DO PROJETO & CLIENTE */}
        <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#E45318]" />
              Dados do Projeto e Titular
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Memorial & ART</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="text-slate-600 font-semibold block mb-1">Nome do Projeto:</label>
              <input
                type="text"
                value={data.projectName}
                onFocus={() => clearIfExample('projectName', ['Novo Dimensionamento', 'Novo Dimensionamento VE', 'Eletroposto Rápido Shopping Sul'])}
                onChange={(e) => onChange({ projectName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E45318]"
                placeholder="Ex: Eletroposto Rápido Shopping Sul"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Responsável Técnico:</label>
              <input
                type="text"
                value={data.technicalResponsible}
                onFocus={() => clearIfExample('technicalResponsible', ['Eng. Responsável Técnico', 'Eng. Responsável'])}
                onChange={(e) => onChange({ technicalResponsible: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#E45318]"
                placeholder="Eng. Responsável"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Registro CREA / CFT:</label>
              <input
                type="text"
                value={data.creaCft}
                onFocus={() => clearIfExample('creaCft', ['CREA-MG / CFT', 'CREA-MG', 'CFT', 'CREA-MG 123456/D'])}
                onChange={(e) => onChange({ creaCft: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#E45318]"
                placeholder="Ex: CREA-MG 123456/D"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-600 font-semibold block mb-1">Nome / Razão Social do Cliente:</label>
              <input
                type="text"
                value={data.clientName}
                onFocus={() => clearIfExample('clientName', ['Cliente Particular', 'Cliente CEMIG', 'Cliente Informado na Fatura', 'Cliente Geral'])}
                onChange={(e) => onChange({ clientName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E45318]"
                placeholder="Nome do cliente ou empresa"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Telefone / WhatsApp:</label>
              <input
                type="text"
                value={data.clientPhone || ''}
                onFocus={() => clearIfExample('clientPhone', ['(31) 99999-9999'])}
                onChange={(e) => onChange({ clientPhone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#E45318]"
                placeholder="(31) 99999-9999"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">E-mail de Contato:</label>
              <input
                type="email"
                value={data.clientEmail || ''}
                onFocus={() => clearIfExample('clientEmail', ['cliente@email.com'])}
                onChange={(e) => onChange({ clientEmail: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#E45318]"
                placeholder="cliente@email.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-600 font-semibold block mb-1">Endereço da Instalação:</label>
              <input
                type="text"
                value={data.address || ''}
                onFocus={() => clearIfExample('address', ['Rua, Número, Bairro, Cidade - UF', 'Endereço da Unidade Consumidora'])}
                onChange={(e) => onChange({ address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#E45318]"
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: DADOS DO PADRÃO & CONCESSIONÁRIA */}
        <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#00B356]" />
              Dados do Padrão de Entrada da Concessionária
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">ND-5.1 / Padrão de Entrada</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Concessionária:</label>
              <select
                value={data.utility}
                onChange={(e) => onChange({ utility: e.target.value as UtilityId })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00B356]"
              >
                <option value="CEMIG">CEMIG (Minas Gerais)</option>
                <option value="CPFL">CPFL (Paulista / Piratininga / Santa Cruz)</option>
                <option value="ENERGISA">ENERGISA</option>
                <option value="ENEL_SP">ENEL (São Paulo)</option>
                <option value="ENEL_RJ">ENEL (Rio de Janeiro)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                {data.utility === 'CEMIG' ? 'N.º da Unidade Consumidora (UC):' : 'Nº Instalação / UC / PN:'}
              </label>
              <input
                type="text"
                value={data.installationNumber || ''}
                onFocus={() => clearIfExample('installationNumber', ['3000000000', '9.019.799.018-64', '811.109.018-18'])}
                onChange={(e) => onChange({ installationNumber: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:border-[#00B356]"
                placeholder={data.utility === 'CEMIG' ? 'Ex: 811.109.018-18' : 'Ex: 3001234567'}
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Nº do Medidor de Energia:</label>
              <input
                type="text"
                value={data.meterNumber || ''}
                onFocus={() => clearIfExample('meterNumber', ['MED-889922', 'Consulte no visor do medidor', 'Consulte padrão físico'])}
                onChange={(e) => onChange({ meterNumber: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:border-[#00B356]"
                placeholder="Ex: MED-889922 ou GPA190007823"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Disjuntor Atual do Padrão:</label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={data.standardBreakerA !== undefined && data.standardBreakerA !== null ? data.standardBreakerA : ''}
                    onFocus={(e) => {
                      if (data.standardBreakerA === 63 || data.standardBreakerA === 0) {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => onChange({ standardBreakerA: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:border-[#00B356]"
                    placeholder="Não consta na fatura"
                  />
                  <span className="text-xs font-bold text-slate-500">Amperes</span>
                </div>
                {(!data.standardBreakerA || data.standardBreakerA === 0) && (
                  <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    Não consta na conta — confirmar na vistoria
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Categoria Atual do Padrão:</label>
              <select
                value={data.standardCategory}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const catBreakerMap: Record<string, number> = {
                    'A1': 63, 'A_LEGADO_40A': 40, 'B1': 63, 'B2': 63,
                    'C1': 63, 'C2': 80, 'C3': 100, 'C4': 125, 'C5': 150, 'C6': 200,
                    'F1': 225, 'F2': 250, 'F3': 300, 'F4': 400, 'F5': 450, 'F6': 500, 'F7': 630, 'F8': 700, 'F9': 800
                  };
                  const defaultBreaker = catBreakerMap[newCat] || (newCat.startsWith('F') ? 225 : (newCat.startsWith('C') ? 63 : 63));
                  const defaultGaugeMap: Record<string, number> = {
                    'A1': 16, 'A_LEGADO_40A': 10, 'B1': 16, 'B2': 16,
                    'C1': 16, 'C2': 25, 'C3': 35, 'C4': 50, 'C5': 70, 'C6': 95,
                    'F1': 120, 'F2': 150, 'F3': 240, 'F4': 120, 'F5': 150, 'F6': 185, 'F7': 240, 'F8': 150, 'F9': 185
                  };
                  const suggestedGauge = defaultGaugeMap[newCat] || 16;
                  const confirmedPhases = (newCat.startsWith('C') || newCat.startsWith('F')) ? '3F' : (newCat.startsWith('B') ? '2F' : '1F');
                  onChange({ 
                    standardCategory: newCat,
                    standardBreakerA: defaultBreaker,
                    fieldBreakerConfirmedA: defaultBreaker,
                    fieldCableGaugeMM2: suggestedGauge,
                    fieldPhasesConfirmed: confirmedPhases
                  });
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00B356]"
              >
                {availableCategories.map(cat => {
                  const catBreakerMap: Record<string, number> = {
                    'A1': 63, 'A_LEGADO_40A': 40, 'B1': 63, 'B2': 63,
                    'C1': 63, 'C2': 80, 'C3': 100, 'C4': 125, 'C5': 150, 'C6': 200,
                    'F1': 225, 'F2': 250, 'F3': 300, 'F4': 400, 'F5': 450, 'F6': 500, 'F7': 630, 'F8': 700, 'F9': 800
                  };
                  const brk = catBreakerMap[cat] || (cat.startsWith('F') ? 225 : 63);
                  const typeLabel = cat.startsWith('C') ? 'Trifásico BT' : cat.startsWith('B') ? 'Bifásico BT' : cat.startsWith('F') ? 'Alta Demanda BT' : 'Monofásico BT';
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({typeLabel} — Disjuntor {brk}A)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Demanda Contratada / Limite:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={data.contractedDemandKW || 0}
                  onChange={(e) => onChange({ contractedDemandKW: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00B356]"
                  placeholder="Ex: 38"
                />
                <span className="text-xs font-bold text-slate-500">kW</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
            <Shield className="w-4 h-4 text-[#00B356] shrink-0" />
            <p className="text-[11px] leading-relaxed">
              O disjuntor de <strong>{data.standardBreakerA}A ({data.standardCategory})</strong> será o parâmetro de referência no Passo 1B para o teste de desarme térmico.
            </p>
          </div>
        </div>
      </div>

      {/* ─── BLOCO 3: VISTORIA TÉCNICA OBRIGATÓRIA DE CAMPO (INSPEÇÃO FÍSICA DO PADRÃO) ─── */}
      <div className="p-6 rounded-3xl bg-slate-50 border-2 border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E45318]/10 text-[#E45318]">
              <ShieldAlert className="w-5 h-5 text-[#E45318]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#E45318] tracking-wider">
                Procedimento Obrigatório de Segurança • NBR 5410 & CEMIG ND-5.1
              </span>
              <h4 className="text-base font-black text-slate-800">
                Vistoria Física de Campo do Padrão de Entrada
              </h4>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            Confirmação Obrigatória em 100% dos Projetos
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Nas normas anteriores da CEMIG, o padrão monofásico era montado com <strong>disjuntor de 40A e cabo de 10 mm²</strong>. Na norma atual (<strong>ND-5.1 MAR/2026</strong>), o padrão compulsório é <strong>63A com cabo de 16 mm²</strong>. É imprescindível checar se o cliente não substituiu apenas o disjuntor de forma irregular sem trocar a fiação, o que gera severo risco de incêndio em recarga veicular contínua.
        </p>

        {/* Grade de Inspeção Física */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* 1. Confirmação de Fases Reais */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
            <label className="text-[11px] font-bold text-slate-700 block uppercase">
              1. Fases Reais Inspecionadas no Local:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: '1F', label: '1F+N', title: 'Monofásico' },
                { id: '2F', label: '2F+N', title: 'Bifásico' },
                { id: '3F', label: '3F+N', title: 'Trifásico' }
              ].map(f => {
                const isSelected = (data.fieldPhasesConfirmed || (data.standardCategory.startsWith('C') ? '3F' : data.standardCategory === 'B1' ? '2F' : '1F')) === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      const newPhases = f.id as '1F' | '2F' | '3F';
                      const newCat = newPhases === '1F' ? 'A1' : newPhases === '2F' ? 'B1' : 'C1';
                      onChange({
                        fieldPhasesConfirmed: newPhases,
                        standardCategory: newCat,
                        standardBreakerA: newPhases === '3F' ? (data.standardBreakerA || 63) : 63
                      });
                    }}
                    className={`py-2 px-1 text-center rounded-xl font-bold transition-all border ${
                      isSelected
                        ? "bg-[#0A192F] text-white border-[#0A192F] shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs">{f.label}</span>
                    <span className="block text-[9px] font-normal opacity-80">{f.title}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-400 block">
              Confirmar se chegam 2, 3 ou 4 condutores no medidor
            </span>
          </div>

          {/* 2. Disjuntor Real Instalado no Padrão */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
            <label className="text-[11px] font-bold text-slate-700 block uppercase">
              2. Disjuntor Físico Instalado no Padrão:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={data.fieldBreakerConfirmedA || data.standardBreakerA || 63}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  // Mapeamento de categoria e cabo por amperagem de disjuntor
                  const breakerMap: Record<number, { cat: string; gauge: number; phases: '1F' | '2F' | '3F' }> = {
                    40: { cat: 'A_LEGADO_40A', gauge: 10, phases: '1F' },
                    50: { cat: 'B1', gauge: 16, phases: '2F' },
                    63: { cat: 'C1', gauge: 16, phases: '3F' },
                    70: { cat: 'C1', gauge: 16, phases: '3F' },
                    80: { cat: 'C2', gauge: 25, phases: '3F' },
                    100: { cat: 'C3', gauge: 35, phases: '3F' },
                    125: { cat: 'C4', gauge: 50, phases: '3F' },
                    150: { cat: 'C5', gauge: 70, phases: '3F' },
                    200: { cat: 'C6', gauge: 95, phases: '3F' },
                    225: { cat: 'F1', gauge: 120, phases: '3F' },
                    250: { cat: 'F2', gauge: 150, phases: '3F' },
                    300: { cat: 'F3', gauge: 240, phases: '3F' },
                    400: { cat: 'F4', gauge: 120, phases: '3F' },
                    450: { cat: 'F5', gauge: 150, phases: '3F' },
                    500: { cat: 'F6', gauge: 185, phases: '3F' },
                    630: { cat: 'F7', gauge: 240, phases: '3F' },
                    700: { cat: 'F8', gauge: 150, phases: '3F' },
                    800: { cat: 'F9', gauge: 185, phases: '3F' }
                  };
                  const matched = breakerMap[val] || {
                    cat: val >= 225 ? 'F1' : val >= 80 ? 'C2' : 'C1',
                    gauge: val >= 225 ? 120 : val >= 200 ? 95 : val >= 150 ? 70 : val >= 125 ? 50 : val >= 100 ? 35 : val >= 80 ? 25 : val >= 63 ? 16 : 10,
                    phases: '3F'
                  };

                  onChange({
                    fieldBreakerConfirmedA: val,
                    standardBreakerA: val,
                    standardCategory: matched.cat,
                    fieldCableGaugeMM2: matched.gauge,
                    fieldPhasesConfirmed: matched.phases
                  });
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E45318]"
              >
                <option value={40}>40A (Padrão Monofásico Antigo CEMIG)</option>
                <option value={50}>50A (Padrão Bifásico Legado)</option>
                <option value={63}>63A (Padrão Atual ND-5.1 C1/B1/A1)</option>
                <option value={70}>70A (Disjuntor Caixa Moldada/Comum)</option>
                <option value={80}>80A (Padrão C2 — 25 mm²)</option>
                <option value={100}>100A (Padrão C3 — 35 mm²)</option>
                <option value={125}>125A (Padrão C4 — 50 mm²)</option>
                <option value={150}>150A (Padrão C5 — 70 mm²)</option>
                <option value={200}>200A (Padrão C6 — 95 mm²)</option>
                <option value={225}>225A (Alta Demanda F1 — 120 mm²)</option>
                <option value={250}>250A (Alta Demanda F2 — 150 mm²)</option>
                <option value={300}>300A (Alta Demanda F3 — 240 mm²)</option>
                <option value={400}>400A (Alta Demanda F4 — 2x120 mm²)</option>
                <option value={450}>450A (Alta Demanda F5 — 2x150 mm²)</option>
                <option value={500}>500A (Alta Demanda F6 — 2x185 mm²)</option>
                <option value={630}>630A (Alta Demanda F7 — 2x240 mm²)</option>
                <option value={700}>700A (Alta Demanda F8 — 3x150 mm²)</option>
                <option value={800}>800A (Alta Demanda F9 — 3x185 mm²)</option>
              </select>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Valor impresso na carcaça do disjuntor dentro da caixa (atribui automaticamente categoria e cabo sugerido)
            </span>
          </div>

          {/* 3. Bitola Real dos Cabos de Entrada */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
            <label className="text-[11px] font-bold text-slate-700 block uppercase">
              3. Bitola dos Cabos do Ramal de Entrada:
            </label>
            <select
              value={data.fieldCableGaugeMM2 || (
                (data.standardBreakerA || 63) >= 225 ? 120 :
                (data.standardBreakerA || 63) >= 200 ? 95 :
                (data.standardBreakerA || 63) >= 150 ? 70 :
                (data.standardBreakerA || 63) >= 125 ? 50 :
                (data.standardBreakerA || 63) >= 100 ? 35 :
                (data.standardBreakerA || 63) >= 80 ? 25 :
                (data.standardBreakerA || 63) >= 63 ? 16 : 10
              )}
              onChange={(e) => onChange({ fieldCableGaugeMM2: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E45318]"
            >
              <option value={6}>6 mm² (Alerta: Subdimensionado para VE)</option>
              <option value={10}>10 mm² (Padrão Antigo Monofásico 40A)</option>
              <option value={16}>16 mm² (Compulsório ND-5.1 p/ 63A A1/B1/C1)</option>
              <option value={25}>25 mm² (Padrão C2 80A)</option>
              <option value={35}>35 mm² (Padrão C3 100A)</option>
              <option value={50}>50 mm² (Padrão C4 125A)</option>
              <option value={70}>70 mm² (Padrão C5 150A)</option>
              <option value={95}>95 mm² (Padrão C6 200A — Normativo CEMIG ND-5.1)</option>
              <option value={120}>120 mm² (Padrão F1 225A)</option>
              <option value={150}>150 mm² (Padrão F2 250A)</option>
              <option value={185}>185 mm² (Padrão F3 300A)</option>
              <option value={240}>240 mm²+ (Padrão F4..F9 350A+)</option>
            </select>
            <span className="text-[10px] text-slate-400 block">
              Identificado na marcação do cabo ou paquímetro
            </span>
          </div>
        </div>

        {/* ─── PAINEL DE DIAGNÓSTICO E ALERTAS DE RISCO ELÉTRICO ─── */}
        {(() => {
          const currentBreaker = data.fieldBreakerConfirmedA || data.standardBreakerA || 63;
          const defaultNormativeGauge = 
            currentBreaker >= 225 ? 120 :
            currentBreaker >= 200 ? 95 :
            currentBreaker >= 150 ? 70 :
            currentBreaker >= 125 ? 50 :
            currentBreaker >= 100 ? 35 :
            currentBreaker >= 80 ? 25 :
            currentBreaker >= 63 ? 16 : 10;
          const currentGauge = data.fieldCableGaugeMM2 || defaultNormativeGauge;
          const currentPhases = data.fieldPhasesConfirmed || (data.standardCategory.startsWith('C') ? '3F' : data.standardCategory === 'B1' ? '2F' : '1F');

          // Verificação de conformidade de bitola mínima exigida pela CEMIG ND-5.1 MAR/2026
          const minNormativeGauge: Record<number, number> = {
            40: 10,
            50: 10,
            63: 16,
            70: 25,
            80: 25,
            100: 35,
            125: 50,
            150: 70,
            200: 95,
            225: 120
          };
          const requiredGauge = minNormativeGauge[currentBreaker] || (currentBreaker > 200 ? 120 : 16);
          const isBreakerOversizedForCable = currentGauge < requiredGauge;

          // Caso 1: Risco Crítico de Incêndio (Disjuntor aumentado ou cabo inferior ao padrão)
          if (isBreakerOversizedForCable) {
            return (
              <div className="bg-red-50 border-2 border-red-500 p-5 rounded-2xl flex items-start gap-3.5 text-red-950 animate-pulse shadow-sm">
                <Flame className="w-7 h-7 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-black uppercase text-[10px] px-2 py-0.5 rounded-md">
                      Perigo Extremo
                    </span>
                    <h5 className="text-sm font-black text-red-900">
                      Risco Crítico de Incêndio: Disjuntor de {currentBreaker}A com Condutor de {currentGauge} mm² (Mínimo Normativo: {requiredGauge} mm²)
                    </h5>
                  </div>
                  <p className="text-red-900 leading-relaxed">
                    Identificado condutor subdimensionado para a proteção existente. Na norma <strong>CEMIG ND-5.1 MAR/2026</strong>, um disjuntor de <strong>{currentBreaker}A</strong> exige cabo de cobre mínimo de <strong>{requiredGauge} mm²</strong> (no padrão C6 200A, o cabo normativo é <strong>95 mm²</strong>). Se o disjuntor foi trocado sem substituir a fiação, o cabo operará em sobrecarga severa.
                  </p>
                  <p className="text-red-950 font-bold bg-white/70 p-2.5 rounded-xl border border-red-200">
                    🚨 <strong>Efeito na Recarga de Veículo Elétrico:</strong> A recarga de VE opera em regime contínuo prolongado (Fs = 1.0 NBR 17019). O cabo de {currentGauge} mm² atingirá temperaturas superiores ao limite admissível da isolação (70°C em PVC), gerando risco iminente de fusão dos condutores e curto-circuito antes da atuação térmica do disjuntor de {currentBreaker}A!
                  </p>
                  <p className="text-[11px] text-red-800 font-semibold">
                    Ação Obrigatória: Adequar a bitola dos condutores para {requiredGauge} mm² e verificar eletroduto, caixa e aterramento conforme a norma CEMIG ND-5.1 MAR/2026.
                  </p>
                </div>
              </div>
            );
          }

          // Caso 2: Padrão Monofásico Antigo da CEMIG (40A com cabo de 10 mm²)
          if (currentPhases === '1F' && currentBreaker <= 50) {
            return (
              <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-white font-black uppercase text-[10px] px-2 py-0.5 rounded-md">
                      Padrão Legado CEMIG
                    </span>
                    <h5 className="text-sm font-black text-amber-900">
                      Padrão Monofásico de {currentBreaker}A com Cabo de {currentGauge} mm² (Norma Anterior)
                    </h5>
                  </div>
                  <p className="text-amber-900 leading-relaxed">
                    Nas normas anteriores da CEMIG, o padrão monofásico residencial era entregue com disjuntor de 40A (limite de 8,8 kW em 220V). Este padrão <strong>não comporta com segurança um carregador de 7,4 kW (32A)</strong>, pois o veículo consumirá sozinho 80% de toda a corrente do imóvel, derrubando o disjuntor geral ao ligar qualquer outro aparelho.
                  </p>
                  <p className="text-amber-950 font-bold bg-white/70 p-2 rounded-xl border border-amber-200">
                    💡 <strong>Orientação ao Cliente:</strong> Solicitar aumento de carga junto à CEMIG para <strong>Categoria B1 (Bifásico 63A / 16 mm²)</strong> ou <strong>C1 (Trifásico 63A / 16 mm²)</strong> conforme a nova CEMIG ND-5.1 MAR/2026. A aplicação CoenergyGO já gera a Lista de Materiais Oficial (BOM) para esta reforma no Passo 3.
                  </p>
                </div>
              </div>
            );
          }

          // Caso 3: Padrão Regular Conforme Norma Atual
          return (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-start gap-3 text-emerald-950 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-[#00B356] shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <h5 className="font-black text-emerald-900 flex items-center gap-1.5">
                  Padrão Regular Conforme CEMIG ND-5.1 ver. MAR/2026
                </h5>
                <p className="text-emerald-900 leading-relaxed">
                  Disjuntor de <strong>{currentBreaker}A</strong> com condutores de entrada de <strong>{currentGauge} mm²</strong> ({currentPhases}). A fiação atende plenamente aos critérios de ampacidade da NBR 5410 e aos requisitos de regime contínuo da NBR 17019 para alimentação da estação de recarga.
                </p>
              </div>
            </div>
          );
        })()}

        {/* Termo de Confirmação Técnica de Campo */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <input
            type="checkbox"
            id="fieldInspectionConfirmed"
            checked={Boolean(data.fieldInspectionConfirmed)}
            onChange={(e) => onChange({ fieldInspectionConfirmed: e.target.checked })}
            className="w-4 h-4 rounded text-[#E45318] focus:ring-[#E45318] cursor-pointer"
          />
          <label htmlFor="fieldInspectionConfirmed" className="text-xs text-slate-700 font-medium cursor-pointer leading-tight">
            <strong>Confirmo que verifiquei fisicamente o padrão de entrada do imóvel</strong> ou orientei formalmente o cliente sobre a necessidade de adequação integral dos cabos, caixa, terminais e aterramento conforme as normas vigentes.
          </label>
        </div>
      </div>
    </div>
  );
}

