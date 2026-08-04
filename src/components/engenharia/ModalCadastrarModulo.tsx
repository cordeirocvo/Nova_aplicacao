"use client";
import React, { useState } from "react";
import { X, Sun, Upload, FileText, Loader, CheckCircle } from "lucide-react";

interface ModalCadastrarModuloProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newModule: any) => void;
}

export function ModalCadastrarModulo({ isOpen, onClose, onSuccess }: ModalCadastrarModuloProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fabricante: "",
    modelo: "",
    potenciaPicoWp: 550,
    Vmp: 41.5,
    Imp: 13.25,
    Voc: 49.8,
    Isc: 14.0,
    eficiencia: 21.3,
    dimensoes: "2278x1134x35",
    pesoKg: 27.5,
    coefTempVoc: -0.27,
    coefTempIsc: 0.04,
    garantiaAnos: 12,
    datasheetUrl: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fabricante || !formData.modelo || !formData.potenciaPicoWp) {
      alert("Por favor, preencha os campos obrigatórios (Fabricante, Modelo e Potência Pico Wp).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fabricante: formData.fabricante,
        modelo: formData.modelo,
        potenciaPicoWp: Number(formData.potenciaPicoWp),
        Vmp: formData.Vmp ? Number(formData.Vmp) : null,
        Imp: formData.Imp ? Number(formData.Imp) : null,
        Voc: formData.Voc ? Number(formData.Voc) : null,
        Isc: formData.Isc ? Number(formData.Isc) : null,
        eficiencia: formData.eficiencia ? Number(formData.eficiencia) : null,
        dimensoes: formData.dimensoes || null,
        pesoKg: formData.pesoKg ? Number(formData.pesoKg) : null,
        coefTempVoc: formData.coefTempVoc ? Number(formData.coefTempVoc) : null,
        coefTempIsc: formData.coefTempIsc ? Number(formData.coefTempIsc) : null,
        garantiaAnos: formData.garantiaAnos ? Number(formData.garantiaAnos) : null,
        datasheetUrl: formData.datasheetUrl || null,
      };

      const res = await fetch("/api/engenharia/equipamentos/modulos", {
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
        alert(`Erro ao cadastrar módulo: ${err.error || 'Falha na requisição'}`);
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
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black">Cadastrar Módulo Fotovoltaico</h2>
              <p className="text-amber-100 text-xs font-medium">Insira as especificações do Datasheet</p>
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
                placeholder="Ex: Jinko Solar, Canadian, Trina"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                value={formData.fabricante}
                onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Modelo *</label>
              <input
                type="text"
                required
                placeholder="Ex: JKM550M-72HL4-V"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/60">
            <div>
              <label className="block text-[10px] font-black text-amber-800 uppercase mb-1">Potência (Wp) *</label>
              <input
                type="number"
                step="1"
                required
                className="w-full px-3 py-2 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-amber-900 bg-white"
                value={formData.potenciaPicoWp}
                onChange={(e) => setFormData({ ...formData, potenciaPicoWp: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Vmp (V)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium bg-white"
                value={formData.Vmp}
                onChange={(e) => setFormData({ ...formData, Vmp: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Imp (A)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium bg-white"
                value={formData.Imp}
                onChange={(e) => setFormData({ ...formData, Imp: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Voc (V)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium bg-white"
                value={formData.Voc}
                onChange={(e) => setFormData({ ...formData, Voc: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Isc (A)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                value={formData.Isc}
                onChange={(e) => setFormData({ ...formData, Isc: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Eficiência (%)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                value={formData.eficiencia}
                onChange={(e) => setFormData({ ...formData, eficiencia: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                value={formData.pesoKg}
                onChange={(e) => setFormData({ ...formData, pesoKg: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Garantia (anos)</label>
              <input
                type="number"
                step="1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                value={formData.garantiaAnos}
                onChange={(e) => setFormData({ ...formData, garantiaAnos: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Dimensões (mm: LxAxE)</label>
              <input
                type="text"
                placeholder="Ex: 2278x1134x35"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                value={formData.dimensoes}
                onChange={(e) => setFormData({ ...formData, dimensoes: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Link/URL do Datasheet (PDF)</label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://exemplo.com/datasheet.pdf"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
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
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Salvar Módulo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
