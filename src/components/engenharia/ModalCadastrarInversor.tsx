"use client";
import React, { useState } from "react";
import { X, Zap, FileText, Loader, CheckCircle } from "lucide-react";

interface ModalCadastrarInversorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInverter: any) => void;
}

export function ModalCadastrarInversor({ isOpen, onClose, onSuccess }: ModalCadastrarInversorProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fabricante: "",
    modelo: "",
    potenciaNominalKW: 75,
    tipoConexao: "ON_GRID", // ON_GRID, HYBRID, OFF_GRID
    tensaoEntradaMinV: 200,
    tensaoEntradaMaxV: 1000,
    correnteMaxCC: 30,
    numeroStringsMPPT: 4,
    potenciaMPPTKW: 75,
    tensaoSaidaVAC: 380,
    fatorPotencia: 1.0,
    eficiencia: 98.6,
    fase: 3, // 1=Monofásico, 2=Bifásico, 3=Trifásico
    datasheetUrl: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fabricante || !formData.modelo || !formData.potenciaNominalKW) {
      alert("Por favor, preencha os campos obrigatórios (Fabricante, Modelo e Potência Nominal kW).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fabricante: formData.fabricante,
        modelo: formData.modelo,
        potenciaNominalKW: Number(formData.potenciaNominalKW),
        tipoConexao: formData.tipoConexao,
        tensaoEntradaMinV: formData.tensaoEntradaMinV ? Number(formData.tensaoEntradaMinV) : null,
        tensaoEntradaMaxV: formData.tensaoEntradaMaxV ? Number(formData.tensaoEntradaMaxV) : null,
        correnteMaxCC: formData.correnteMaxCC ? Number(formData.correnteMaxCC) : null,
        numeroStringsMPPT: formData.numeroStringsMPPT ? Number(formData.numeroStringsMPPT) : null,
        potenciaMPPTKW: formData.potenciaMPPTKW ? Number(formData.potenciaMPPTKW) : null,
        tensaoSaidaVAC: formData.tensaoSaidaVAC ? Number(formData.tensaoSaidaVAC) : null,
        fatorPotencia: formData.fatorPotencia ? Number(formData.fatorPotencia) : null,
        eficiencia: formData.eficiencia ? Number(formData.eficiencia) : null,
        fase: Number(formData.fase),
        datasheetUrl: formData.datasheetUrl || null,
      };

      const res = await fetch("/api/engenharia/equipamentos/inversores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        onSuccess(created);
        onClose();
      } else {
        const err = await res.json();
        alert(`Erro ao cadastrar inversor: ${err.error || 'Falha na requisição'}`);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-[#1E3A8A] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black">Cadastrar Inversor Fotovoltaico</h2>
              <p className="text-blue-100 text-xs font-medium">Insira as especificações do Datasheet</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Fabricante *</label>
              <input
                type="text"
                required
                placeholder="Ex: Huawei, Solis, Sungrow, Deye"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                value={formData.fabricante}
                onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Modelo *</label>
              <input
                type="text"
                required
                placeholder="Ex: SUN2000-75KTL-M1"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
            <div>
              <label className="block text-[10px] font-black text-blue-900 uppercase mb-1">Potência (kW) *</label>
              <input
                type="number"
                step="0.1"
                required
                className="w-full px-3 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-bold text-blue-900 bg-white"
                value={formData.potenciaNominalKW}
                onChange={(e) => setFormData({ ...formData, potenciaNominalKW: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Fases / Conexão</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium bg-white"
                value={formData.fase}
                onChange={(e) => setFormData({ ...formData, fase: parseInt(e.target.value) })}
              >
                <option value={1}>Monofásico (220V)</option>
                <option value={2}>Bifásico (127/220V)</option>
                <option value={3}>Trifásico (220/380V)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de Sistema</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium bg-white"
                value={formData.tipoConexao}
                onChange={(e) => setFormData({ ...formData, tipoConexao: e.target.value })}
              >
                <option value="ON_GRID">On-Grid (Conectado)</option>
                <option value="HYBRID">Híbrido (Com Bateria)</option>
                <option value="OFF_GRID">Off-Grid (Isolado)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Eficiência (%)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium bg-white"
                value={formData.eficiencia}
                onChange={(e) => setFormData({ ...formData, eficiencia: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tensão Mín MPPT (V)</label>
              <input
                type="number"
                step="1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                value={formData.tensaoEntradaMinV}
                onChange={(e) => setFormData({ ...formData, tensaoEntradaMinV: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tensão Máx Ent. (V)</label>
              <input
                type="number"
                step="1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                value={formData.tensaoEntradaMaxV}
                onChange={(e) => setFormData({ ...formData, tensaoEntradaMaxV: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Corrente Máx CC (A)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                value={formData.correnteMaxCC}
                onChange={(e) => setFormData({ ...formData, correnteMaxCC: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nº MPPTs</label>
              <input
                type="number"
                step="1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                value={formData.numeroStringsMPPT}
                onChange={(e) => setFormData({ ...formData, numeroStringsMPPT: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tensão Saída (VAC)</label>
              <input
                type="number"
                step="1"
                placeholder="Ex: 380, 220"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                value={formData.tensaoSaidaVAC}
                onChange={(e) => setFormData({ ...formData, tensaoSaidaVAC: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Link/URL do Datasheet (PDF)</label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://exemplo.com/inversor_datasheet.pdf"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1E3A8A] outline-none text-sm font-medium"
                  value={formData.datasheetUrl}
                  onChange={(e) => setFormData({ ...formData, datasheetUrl: e.target.value })}
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-700 to-[#1E3A8A] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Salvar Inversor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
