"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Edit2, Check, X } from "lucide-react";

export default function StatusManager({ initialStatuses }: { initialStatuses: any[] }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initialStatuses);
  const [newStatus, setNewStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = async () => {
    if (!newStatus.trim()) return;
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStatus.trim() })
      });
      if (res.ok) {
        const added = await res.json();
        setStatuses([...statuses, added]);
        setNewStatus("");
        router.refresh();
      } else {
        alert("Erro ao adicionar. Pode já existir um status com esse nome.");
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este status?")) return;
    try {
      const res = await fetch(`/api/status/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStatuses(statuses.filter(s => s.id !== id));
        router.refresh();
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setStatuses(statuses.map(s => s.id === id ? updated : s));
        setEditingId(null);
        router.refresh();
      } else {
         alert("Erro ao editar. Nome duplicado?");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      
      {/* ADD NEW */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Novo Status</label>
          <input 
             type="text" 
             value={newStatus} 
             onChange={e => setNewStatus(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleAdd()}
             placeholder="Ex: Em Análise..." 
             className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00BFA5] focus:outline-none" 
          />
        </div>
        <button 
           onClick={handleAdd}
           className="w-full md:w-auto px-6 py-3 bg-[#00BFA5] hover:bg-[#00a891] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Adicionar
        </button>
      </div>

      {/* LIST */}
      <ul className="divide-y divide-slate-100">
        {statuses.map(st => (
          <li key={st.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            {editingId === st.id ? (
              <div className="flex items-center gap-3 flex-1 mr-4">
                <input 
                  type="text" 
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(st.id)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00BFA5]"
                />
                <button onClick={() => handleUpdate(st.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <div className="font-medium text-slate-800">{st.name}</div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingId(st.id); setEditName(st.name); }}
                    className="p-2 text-slate-400 hover:text-[#00BFA5] hover:bg-[#00BFA5]/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(st.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {statuses.length === 0 && (
          <div className="p-8 text-center text-slate-500">Nenhum status cadastrado.</div>
        )}
      </ul>
    </div>
  );
}
