"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Edit2, Camera, Paperclip, FileText, Download, X } from "lucide-react";

export default function EquipamentosTab({ usinaId, usina, onRefresh }: { usinaId: string, usina: any, onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [equip, setEquip] = useState<any>({
    id: "", usinaId, nome: "", tag: "", localizacao: "", criticidade: "B", periodicidadeDias: "180", fotoBase64: "", anexos: []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!equip.nome || !equip.tag) return;
    try {
      await fetch("/api/engenharia/om/equipamentos", {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(equip),
      });
      setShowModal(false);
      setEquip({ id: "", usinaId, nome: "", tag: "", localizacao: "", criticidade: "B", periodicidadeDias: "180", fotoBase64: "", anexos: [] });
      setEditMode(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (e: any) => {
    setEquip({
      id: e.id,
      usinaId,
      nome: e.nome,
      tag: e.tag,
      localizacao: e.localizacao || "",
      criticidade: e.criticidade || "B",
      periodicidadeDias: e.periodicidadeDias?.toString() || "",
      fotoBase64: e.fotoBase64 || "",
      anexos: e.anexos || []
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL("image/jpeg", 0.7);
          setEquip(prev => ({ ...prev, fotoBase64: base64 }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setEquip((prev: any) => ({
          ...prev,
          anexos: [...(prev.anexos || []), { name: file.name, type: file.type, urlBase64: base64 }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setEquip((prev: any) => ({
      ...prev,
      anexos: prev.anexos.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;
    try {
      await fetch(`/api/engenharia/om/equipamentos?id=${id}`, { method: "DELETE" });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getCriticidadeColor = (c: string) => {
    if (c === "A") return "bg-red-100 text-red-700 border-red-200";
    if (c === "B") return "bg-amber-100 text-amber-700 border-amber-200";
    if (c === "C") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Lista de Equipamentos 
          <span className="bg-slate-100 text-slate-500 text-sm px-2 py-1 rounded-full">{usina.equipamentos?.length || 0}</span>
        </h2>
        <button 
          onClick={() => {
            setEquip({ id: "", usinaId, nome: "", tag: "", localizacao: "", criticidade: "B", periodicidadeDias: "180", fotoBase64: "", anexos: [] });
            setEditMode(false);
            setShowModal(true);
          }}
          className="bg-[#F25C27] hover:bg-[#d44815] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Cadastrar Equipamento
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-bold">Foto</th>
              <th className="p-4 font-bold">TAG</th>
              <th className="p-4 font-bold">Equipamento</th>
              <th className="p-4 font-bold">Localização</th>
              <th className="p-4 font-bold">Criticidade (ABC)</th>
              <th className="p-4 font-bold">Plano Manutenção (Dias)</th>
              <th className="p-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usina.equipamentos?.map((eq: any) => (
              <tr 
                key={eq.id} 
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => openEdit(eq)}
              >
                <td className="p-4">
                  {eq.fotoBase64 ? (
                    <img src={eq.fotoBase64} alt={eq.nome} className="w-12 h-12 rounded object-cover border border-slate-200" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                </td>
                <td className="p-4"><span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 text-sm">{eq.tag}</span></td>
                <td className="p-4 font-bold text-slate-700">{eq.nome}</td>
                <td className="p-4 text-slate-500">{eq.localizacao || "-"}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded border text-xs font-bold ${getCriticidadeColor(eq.criticidade)}`}>Classe {eq.criticidade || "?"}</span>
                </td>
                <td className="p-4 text-slate-600 font-medium">{eq.periodicidadeDias ? `A cada ${eq.periodicidadeDias} dias` : "-"}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(eq); }} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(eq.id); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!usina.equipamentos || usina.equipamentos.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Nenhum equipamento cadastrado. Use o botão acima para inserir.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">{editMode ? "Editar Equipamento" : "Cadastrar Equipamento"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Equipamento</label>
                  <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50" placeholder="Ex: Transformador" value={equip.nome} onChange={e => setEquip({...equip, nome: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TAG</label>
                  <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50" placeholder="Ex: CE-TFX-0001" value={equip.tag} onChange={e => setEquip({...equip, tag: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localização (Área)</label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50" value={equip.localizacao} onChange={e => setEquip({...equip, localizacao: e.target.value})}>
                    <option value="">Selecione...</option>
                    <option value="Cabine de Entrada">Cabine de Entrada</option>
                    <option value="Subestação Secundária">Subestação Secundária</option>
                    <option value="Painéis Solares">Painéis Solares</option>
                    <option value="Sala de Controle">Sala de Controle</option>
                    <option value="SPDA / Aterramento">SPDA / Aterramento</option>
                    <option value="Área Externa">Área Externa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Criticidade (A, B, C)</label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50" value={equip.criticidade} onChange={e => setEquip({...equip, criticidade: e.target.value})}>
                    <option value="A">A - Muito Crítico</option>
                    <option value="B">B - Crítico</option>
                    <option value="C">C - Pouco Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periodicidade Preventiva (Dias)</label>
                  <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50" placeholder="Ex: 180" value={equip.periodicidadeDias} onChange={e => setEquip({...equip, periodicidadeDias: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto do Equipamento</label>
                  <div className="flex gap-4 items-center">
                    {equip.fotoBase64 && (
                      <img src={equip.fotoBase64} alt="Preview" className="w-16 h-16 rounded object-cover border border-slate-200" />
                    )}
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-200"
                    >
                      <Camera className="w-4 h-4" /> Escolher Foto
                    </button>
                    {equip.fotoBase64 && (
                      <button type="button" onClick={() => setEquip({...equip, fotoBase64: ""})} className="text-red-500 text-sm font-medium hover:underline">Remover</button>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arquivos Anexos (PDF, DOC, Fotos)</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input type="file" multiple className="hidden" ref={attachmentInputRef} onChange={handleAttachmentUpload} />
                      <button 
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-200 w-full justify-center"
                      >
                        <Paperclip className="w-4 h-4" /> Anexar Arquivos
                      </button>
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                      {equip.anexos?.map((file: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate text-slate-600 font-medium">{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold border border-slate-200 rounded-xl">Cancelar</button>
              <button onClick={handleSave} disabled={!equip.nome || !equip.tag} className="flex-1 py-3 bg-[#F25C27] text-white font-bold rounded-xl disabled:opacity-50 hover:bg-[#d44815]">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
