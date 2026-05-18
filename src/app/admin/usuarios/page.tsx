"use client";

import { useState, useEffect } from "react";
import { UserPlus, Edit, Trash, Shield, User, Monitor, X, Check, Loader } from "lucide-react";

const PERMISSION_SECTIONS = [
  {
    title: 'Acompanhamento',
    items: [
      { name: 'Dashboard', href: '/dashboard', desc: 'Painel geral de metas e resumos operacionais.' },
      { name: 'Atividades', href: '/atividades', desc: 'Acompanhamento do quadro geral de atividades.' },
      { name: 'Cronograma Semanal', href: '/cronograma', desc: 'Visualização da agenda de cronograma semanal.' },
      { name: 'Nova Atividade', href: '/atividades/nova', desc: 'Cadastro de novas atividades no sistema.' },
      { name: 'Gestão de Usuários', href: '/admin/usuarios', desc: 'Gerenciamento de usuários e permissões.' },
      { name: 'Config. de Status', href: '/admin/status', desc: 'Gerenciamento de opções de status do sistema.' },
    ]
  },
  {
    title: 'Comercial & CRM',
    items: [
      { name: 'App Vendedor (Campo)', href: '/app-vendedor', desc: 'Aplicativo móvel de captura de leads.' },
      { name: 'Gestão de Leads (CRM)', href: '/crm', desc: 'Gerenciamento do funil de vendas e leads.' },
    ]
  },
  {
    title: 'Engenharia & Cálculos',
    items: [
      { name: 'Projetos', href: '/engenharia', desc: 'Listagem de projetos de engenharia e faturas.' },
      { name: 'Análise de Consumo', href: '/engenharia/analise-consumo', desc: 'Análise de consumo de faturas.' },
      { name: 'Dimensionamento BESS', href: '/engenharia/bess', desc: 'Estudos de armazenamento de bateria BESS.' },
      { name: 'Sistema Fotovoltaico', href: '/engenharia/solar', desc: 'Dimensionamento de sistemas solares.' },
      { name: 'Solar Intelligence (SIE)', href: '/engenharia/solar/monitoramento', desc: 'Painel de telemetria e insights de IA.' },
      { name: 'Operação & Manutenção', href: '/engenharia/om', desc: 'Inspeções, preventivas e relatórios.' },
      { name: 'Equipamentos', href: '/engenharia/equipamentos', desc: 'Inventário de equipamentos das usinas.' },
      { name: 'Carregadores VE', href: '/carregamento', desc: 'Dimensionamento de recarga veicular.' },
      { name: 'Dimensionamento Elétrico', href: '/engenharia/eletrica', desc: 'Cálculos de cabos, disjuntores e queda de tensão.' },
      { name: 'Gestão de Orçamentos (CAPEX)', href: '/orcamentos', desc: 'Visualização do painel de orçamentos.' },
      { name: 'Criar/Editar Orçamentos (CAPEX)', href: 'canEditBudgets', desc: 'Permissões para gerenciar insumos e equalizar propostas.' },
    ]
  }
];

const ALL_ROUTE_HREFS = PERMISSION_SECTIONS.flatMap(s => s.items.map(i => i.href));

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({ 
    email: "", 
    name: "", 
    password: "", 
    role: "USER", 
    allowedRoutes: [] as string[] 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) return; // Silencioso pois o MainLayout cuidará do redirecionamento
        throw new Error(`Erro HTTP: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("API Error fetching users:", data);
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      let routes = user.allowedRoutes || [];
      
      // Sincronização retrocompatível de permissões legadas se allowedRoutes estiver vazio
      if (routes.length === 0) {
        if (user.role === 'ADMIN') {
          routes = ALL_ROUTE_HREFS;
        } else {
          routes = ['/atividades', '/atividades/nova', '/cronograma'];
          if (user.canAccessBudgets) routes.push('/orcamentos');
          if (user.canEditBudgets) routes.push('canEditBudgets');
          if (user.canAccessAppLeads) routes.push('/app-vendedor');
          if (user.canManageCRM) routes.push('/crm');
          if (user.canAccessSIE) routes.push('/engenharia/solar/monitoramento');
        }
      }
      
      setForm({ 
        email: user.email, 
        name: user.name || "", 
        password: "", 
        role: user.role, 
        allowedRoutes: routes,
      });
    } else {
      setEditingUser(null);
      setForm({ 
        email: "", 
        name: "", 
        password: "", 
        role: "USER", 
        allowedRoutes: ['/atividades', '/atividades/nova', '/cronograma'],
      });
    }
    setModalOpen(true);
  };

  const handleToggleRoute = (href: string) => {
    setForm(prev => {
      const allowed = [...prev.allowedRoutes];
      const index = allowed.indexOf(href);
      if (index > -1) {
        allowed.splice(index, 1);
      } else {
        allowed.push(href);
      }
      return { ...prev, allowedRoutes: allowed };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
    const method = editingUser ? "PUT" : "POST";

    // Enviar todas as rotas se for ADMIN
    const payload = {
      ...form,
      allowedRoutes: form.role === 'ADMIN' ? ALL_ROUTE_HREFS : form.allowedRoutes
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          <Loader className="w-10 h-10 animate-spin text-[#00BFA5]" />
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
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">Acessos Liberados</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const routes = u.allowedRoutes || [];
                  const totalAllowed = u.role === 'ADMIN' ? ALL_ROUTE_HREFS.length : routes.length;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{u.name || "-"}</td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4 text-center">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase">Acesso Total ({totalAllowed})</span>
                        ) : totalAllowed === 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 uppercase">Nenhum Acesso</span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 uppercase">{totalAllowed} Permitidas</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openModal(u)} className="p-2 text-slate-400 hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/5 rounded-lg transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal responsivo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] mx-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Coluna da Esquerda: Campos Gerais */}
                <div className="md:col-span-5 space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Dados Cadastrais</p>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all text-slate-800 placeholder:text-slate-400"
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
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all text-slate-800 placeholder:text-slate-400"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Senha {editingUser && <span className="text-xs font-normal text-slate-400">(em branco para manter)</span>}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all text-slate-800 placeholder:text-slate-400"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="******"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nível de Acesso</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent outline-none transition-all bg-white text-slate-800"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    >
                      <option value="ADMIN">Administrador (Acesso Total)</option>
                      <option value="USER">Usuário Comum (Visualiza e Cria)</option>
                      <option value="TV">Acesso TV (Apenas Visualização)</option>
                    </select>
                  </div>
                </div>

                {/* Coluna da Direita: Permissões Dinâmicas */}
                <div className="md:col-span-7 flex flex-col">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Permissões de Acesso</p>
                  <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[380px] pr-2 space-y-5">
                    {PERMISSION_SECTIONS.map((section) => (
                      <div key={section.title} className="space-y-2">
                        <h3 className="text-[10px] font-black text-[#E45318] uppercase tracking-wider">{section.title}</h3>
                        <div className="space-y-2">
                          {section.items.map((item) => {
                            const isChecked = form.role === 'ADMIN' || form.allowedRoutes.includes(item.href);
                            const isDisabled = form.role === 'ADMIN';
                            return (
                              <div
                                key={item.href}
                                onClick={() => { if (!isDisabled) handleToggleRoute(item.href); }}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                  isChecked 
                                    ? 'bg-[#1E3A8A]/5 border-[#1E3A8A]/20' 
                                    : 'bg-white hover:bg-slate-50 border-slate-100'
                                } ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  className="w-5 h-5 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] mt-0.5 cursor-pointer"
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => {}} // Lida no onClick do container
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                                  <span className="text-xs text-slate-500 mt-0.5 leading-tight">{item.desc}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#015299] text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
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
