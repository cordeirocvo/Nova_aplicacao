"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Settings2 } from "lucide-react";

const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5";
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] text-sm transition-all";

export interface MesConsumo {
  mes: string;
  kwh: number;
  injetadoKWh: number;
  bandeira: string;
}

interface ConsumoFormPreviewProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  isModal?: boolean;
}

export function initialMeses(): MesConsumo[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, kwh: 0, injetadoKWh: 0, bandeira: "Verde" };
  });
}

export default function ConsumoFormPreview({ 
  initialData, 
  onSave, 
  onCancel, 
  title = "Conferir Dados da Fatura",
  subtitle = "Verifique os dados antes de prosseguir com a simulação",
  isModal = false
}: ConsumoFormPreviewProps) {
  const [tempData, setTempData] = useState<any>(() => {
    if (!initialData || Object.keys(initialData).length === 0) {
      return { consumoMeses: initialMeses() };
    }
    return { ...initialData };
  });
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onSave(tempData);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Settings2 className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{title}</h2>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 font-bold">✕ Cancelar</button>
        )}
      </div>

      <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Nome do Cliente</label>
            <input type="text" className={inputCls} value={tempData.nomeCliente || ""} onChange={e => setTempData({...tempData, nomeCliente: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Endereço</label>
            <input type="text" className={inputCls} value={tempData.endereco || ""} onChange={e => setTempData({...tempData, endereco: e.target.value})} />
          </div>
          <div>
            <label className={labelCls}>Concessionária</label>
            <input type="text" className={inputCls} value={tempData.concessionaria || ""} onChange={e => setTempData({...tempData, concessionaria: e.target.value})} />
          </div>
          <div>
            <label className={labelCls}>Instalação / UC</label>
            <input type="text" className={inputCls} value={tempData.numeroInstalacao || ""} onChange={e => setTempData({...tempData, numeroInstalacao: e.target.value})} />
          </div>
          <div>
            <label className={labelCls}>Subgrupo</label>
            <input type="text" className={inputCls} value={tempData.subgrupo || ""} onChange={e => setTempData({...tempData, subgrupo: e.target.value})} />
          </div>
          <div>
            <label className={labelCls}>Modalidade</label>
            <select className={inputCls} value={tempData.modalidadeTarifaria || ""} onChange={e => setTempData({...tempData, modalidadeTarifaria: e.target.value})}>
              <option value="CONVENCIONAL">CONVENCIONAL</option>
              <option value="HORARIA_AZUL">AZUL</option>
              <option value="HORARIA_VERDE">VERDE</option>
              <option value="BRANCA">BRANCA</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Mês Referência</label>
            <input type="text" className={inputCls} placeholder="MMM/YYYY" value={tempData.mesReferencia || ""} onChange={e => setTempData({...tempData, mesReferencia: e.target.value})} />
          </div>
          <div>
            <label className={labelCls}>Energia Ativa Reativa (HR)</label>
            <input type="number" className={inputCls} placeholder="kWh" value={tempData.energiaAtivaHRKWh || ""} onChange={e => setTempData({...tempData, energiaAtivaHRKWh: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <label className={labelCls}>Demanda Ativa HFP</label>
            <input type="number" className={inputCls} placeholder="kW" value={tempData.demandaMedidaHFPKW || ""} onChange={e => setTempData({...tempData, demandaMedidaHFPKW: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <label className={labelCls}>Desconto Irrigante</label>
            <input type="number" className={inputCls} placeholder="R$" value={tempData.descontoIrrigante || ""} onChange={e => setTempData({...tempData, descontoIrrigante: parseFloat(e.target.value) || 0})} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Histórico de Consumo (Últimos 12 meses)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tempData.consumoMeses?.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 w-16">{m.mes}</span>
                <input type="number" className="flex-1 text-xs font-bold focus:outline-none" value={m.kwh || ""} placeholder="kWh" onChange={e => {
                  const novo = [...tempData.consumoMeses]; 
                  novo[i] = { ...m, kwh: parseFloat(e.target.value) || 0 }; 
                  setTempData({...tempData, consumoMeses: novo});
                }} />
                <span className="text-[10px] text-slate-300">kWh</span>
                <input type="number" className="w-16 text-xs text-[#00BFA5] font-bold focus:outline-none text-right" value={m.injetadoKWh || 0} placeholder="Inj." onChange={e => {
                    const novo = [...tempData.consumoMeses]; 
                    novo[i] = { ...m, injetadoKWh: parseFloat(e.target.value) || 0 }; 
                    setTempData({...tempData, consumoMeses: novo});
                }} />
                <span className="text-[10px] text-slate-300">Inj.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>TUSD (R$/kWh)</label>
            <input type="number" step="0.0001" className={inputCls} value={tempData.tusd || ""} onChange={e => setTempData({...tempData, tusd: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <label className={labelCls}>TE (R$/kWh)</label>
            <input type="number" step="0.0001" className={inputCls} value={tempData.te || ""} onChange={e => setTempData({...tempData, te: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <label className={labelCls}>Demanda (kW)</label>
            <input type="number" className={inputCls} value={tempData.demandaContratadaKW || ""} onChange={e => setTempData({...tempData, demandaContratadaKW: parseFloat(e.target.value) || 0})} />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 flex gap-3">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
        )}
        <button onClick={handleConfirm} disabled={saving}
          className="flex-[2] py-3 bg-[#00BFA5] text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 px-8 transition-colors hover:bg-emerald-500">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Salvar Dados e Simular BESS</>}
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh]">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
