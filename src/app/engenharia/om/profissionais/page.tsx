'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  X, 
  CheckCircle, 
  Phone, 
  Mail, 
  Award,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfissionaisPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    id: '',
    nome: '',
    telefone: '',
    email: '',
    crea: '',
    observacao: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch('/api/engenharia/om/profissionais');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.nome) return alert("O nome é obrigatório");
    setSaving(true);
    try {
      const method = form.id ? 'PATCH' : 'POST';
      const res = await fetch('/api/engenharia/om/profissionais', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        fetchItems();
      }
    } catch (error) {
      alert("Erro ao salvar profissional");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este profissional?")) return;
    try {
      const res = await fetch(`/api/engenharia/om/profissionais?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchItems();
    } catch (error) {
      alert("Erro ao excluir");
    }
  }

  const filtered = items.filter(i => 
    i.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.crea?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-all border border-slate-200"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-[900] text-slate-800 tracking-tight uppercase">Profissionais Técnicos</h1>
              <p className="text-slate-500 font-medium">Gestão de responsáveis pelo comissionamento e laudos.</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setForm({ id: '', nome: '', telefone: '', email: '', crea: '', observacao: '' });
              setShowModal(true);
            }}
            className="w-full md:w-auto bg-[#EB5E28] text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-100 hover:scale-[1.02] transition-all border-none"
          >
            <Plus className="w-5 h-5" /> NOVO PROFISSIONAL
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou CREA..." 
              className="bg-transparent border-none outline-none font-bold text-slate-600 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="p-6">Profissional</th>
                  <th className="p-6">Contato</th>
                  <th className="p-6">Registro</th>
                  <th className="p-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-[#EB5E28]">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 uppercase text-sm">{item.nome}</p>
                          <p className="text-xs text-slate-400 italic">{item.observacao || 'Sem observações'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Phone className="w-3 h-3 text-slate-300" /> {item.telefone || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Mail className="w-3 h-3 text-slate-300" /> {item.email || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-slate-700">CREA: {item.crea || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setForm(item); setShowModal(true); }}
                          className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-[900] text-slate-800 uppercase tracking-tight">Cadastro</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Informações do Profissional</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Nome Completo</label>
                <input 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 focus:ring-4 focus:ring-orange-500/10 focus:border-[#EB5E28] outline-none transition-all"
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  placeholder="Ex: Bruno Cordeiro"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Telefone</label>
                  <input 
                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none"
                    value={form.telefone}
                    onChange={e => setForm({...form, telefone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">CREA</label>
                  <input 
                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none"
                    value={form.crea}
                    onChange={e => setForm({...form, crea: e.target.value})}
                    placeholder="Registro CREA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Email</label>
                <input 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="profissional@email.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Observações</label>
                <textarea 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none min-h-[80px]"
                  value={form.observacao}
                  onChange={e => setForm({...form, observacao: e.target.value})}
                  placeholder="Especialidades ou anotações..."
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-white transition-all border-none cursor-pointer uppercase text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] py-4 bg-[#EB5E28] text-white font-black rounded-2xl shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer uppercase text-xs"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> {form.id ? "Atualizar" : "Cadastrar"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
