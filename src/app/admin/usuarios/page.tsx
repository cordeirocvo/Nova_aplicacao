"use client";

import { useState, useEffect } from "react";
import { UserPlus, Edit2, Trash2, Shield, User, Monitor, X, Check, Loader2 } from "lucide-react";

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "USER" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setForm({ email: user.email, name: user.name || "", password: "", role: user.role });
    } else {
      setEditingUser(null);
      setForm({ email: "", name: "", password: "", role: "USER" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
    const method = editingUser ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao salvar usuário");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Erro sistêmico");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><Shield className="w-3 h-3" /> Administrador</span>;
      case "TV":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Monitor className="w-3 h-3" /> Acesso TV</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><User className="w-3 h-3" /> Usuário Comum</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestão de Usuários</h1>
          <p className="text-slate-500">Cadastre e configure permissões de acesso ao sistema.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-[#1E3A8A] to-[#015299] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all font-medium"
        >
          <UserPlus className="w-5 h-5" />
          <span className="hidden sm:inline">Novo Usuário</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#00BFA5]" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nível de Acesso</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{u.name || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal(u)} className="p-2 text-slate-400 hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/5 rounded-lg transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Senha {editingUser && <span className="text-xs font-normal text-slate-400">(deixe em branco para não alterar)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="******"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nível de Acesso</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all bg-white"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="ADMIN">Administrador (Acesso Total)</option>
                  <option value="USER">Usuário Comum (Visualiza e Cria)</option>
                  <option value="TV">Acesso TV (Apenas Visualização)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#015299] text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {editingUser ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
