"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, Download, Edit2, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function ComissionamentoTab({ usinaId, usina, onRefresh }: { usinaId: string, usina: any, onRefresh: () => void }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [report, setReport] = useState<any>({
    id: "",
    tipo: "Frio",
    data: format(new Date(), "yyyy-MM-dd"),
    responsavel: "",
    numero: "",
    observacoes: "",
    dadosTecnicos: []
  });

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/engenharia/om/comissionamento?usinaId=${usinaId}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [usinaId]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/engenharia/om/comissionamento", {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...report, usinaId }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchReports();
        setReport({ id: "", tipo: "Frio", data: format(new Date(), "yyyy-MM-dd"), responsavel: "", numero: "", observacoes: "", dadosTecnicos: [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addStringRow = () => {
    const newRow = {
      string: (report.dadosTecnicos.length + 1).toString().padStart(2, '0'),
      mppt: "",
      tensao: "",
      polaridade: "OK",
      contPos: "OK",
      contNeg: "OK",
      meggerPos: "5.5 GΩ",
      meggerNeg: "5.5 GΩ"
    };
    setReport({ ...report, dadosTecnicos: [...report.dadosTecnicos, newRow] });
  };

  const updateRow = (index: number, field: string, value: string) => {
    const newDados = [...report.dadosTecnicos];
    newDados[index][field] = value;
    setReport({ ...report, dadosTecnicos: newDados });
  };

  const removeRow = (index: number) => {
    const newDados = report.dadosTecnicos.filter((_: any, i: number) => i !== index);
    setReport({ ...report, dadosTecnicos: newDados });
  };

  const openEdit = (r: any) => {
    setReport({
      id: r.id,
      tipo: r.tipo,
      data: format(new Date(r.data), "yyyy-MM-dd"),
      responsavel: r.responsavel || "",
      numero: r.numero || "",
      observacoes: r.observacoes || "",
      dadosTecnicos: r.dadosTecnicos || []
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este relatório?")) return;
    try {
      await fetch(`/api/engenharia/om/comissionamento?id=${id}`, { method: "DELETE" });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Relatórios de Comissionamento e Entrega
          <span className="bg-slate-100 text-slate-500 text-sm px-2 py-1 rounded-full">{reports.length}</span>
        </h2>
        <button 
          onClick={() => {
            setEditMode(false);
            setReport({ id: "", tipo: "Frio", data: format(new Date(), "yyyy-MM-dd"), responsavel: "", numero: "", observacoes: "", dadosTecnicos: [] });
            setShowModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Relatório
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                r.tipo === 'Frio' ? 'bg-blue-50 text-blue-600' : 
                r.tipo === 'Quente' ? 'bg-orange-50 text-orange-600' : 
                'bg-emerald-50 text-emerald-600'
              }`}>
                Comissionamento a {r.tipo}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-black text-slate-800 text-lg mb-1">Relatório Nº {r.numero || "S/N"}</h3>
            <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
              <FileText className="w-3 h-3" /> {format(new Date(r.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <div className="text-xs text-slate-400">
                Responsável: <span className="font-bold text-slate-600">{r.responsavel || "-"}</span>
              </div>
              <Link 
                href={`/engenharia/om/${usinaId}/comissionamento/${r.id}/relatorio`}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> PDF
              </Link>
            </div>
          </div>
        ))}
        {reports.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum relatório de comissionamento cadastrado para esta usina.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black text-slate-800">
                {editMode ? "Editar Relatório de Comissionamento" : "Novo Relatório de Comissionamento"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Relatório</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={report.tipo}
                    onChange={e => setReport({...report, tipo: e.target.value})}
                  >
                    <option value="Frio">Comissionamento a Frio</option>
                    <option value="Quente">Comissionamento a Quente</option>
                    <option value="Entrega">Entrega Técnica de Usina</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data do Teste</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={report.data}
                    onChange={e => setReport({...report, data: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Relatório Nº</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 01"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={report.numero}
                    onChange={e => setReport({...report, numero: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Responsável Técnico</label>
                  <input 
                    type="text" 
                    placeholder="Nome do inspetor"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={report.responsavel}
                    onChange={e => setReport({...report, responsavel: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Testes de Inspeção (Strings CC)</h3>
                    <p className="text-sm text-slate-500">Insira os dados medidos em campo para cada série fotovoltaica.</p>
                  </div>
                  <button 
                    onClick={addStringRow}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-200"
                  >
                    <Plus className="w-4 h-4" /> Adicionar String
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="p-3">String</th>
                        <th className="p-3">MPPT</th>
                        <th className="p-3">Tensão (V)</th>
                        <th className="p-3">Polaridade</th>
                        <th className="p-3 text-center" colSpan={2}>Cont. e Flutuação (+/-)</th>
                        <th className="p-3 text-center" colSpan={2}>Megger (+/-)</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.dadosTecnicos.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-2"><input className="w-12 p-2 rounded-lg border-none bg-transparent font-bold text-center" value={row.string} onChange={e => updateRow(idx, 'string', e.target.value)} /></td>
                          <td className="p-2"><input className="w-12 p-2 rounded-lg border border-slate-100 bg-white" placeholder="1" value={row.mppt} onChange={e => updateRow(idx, 'mppt', e.target.value)} /></td>
                          <td className="p-2"><input className="w-20 p-2 rounded-lg border border-slate-100 bg-white" placeholder="980" value={row.tensao} onChange={e => updateRow(idx, 'tensao', e.target.value)} /></td>
                          <td className="p-2">
                            <select className="p-2 rounded-lg border border-slate-100 bg-white text-xs font-bold" value={row.polaridade} onChange={e => updateRow(idx, 'polaridade', e.target.value)}>
                              <option value="OK">OK</option>
                              <option value="X">X</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <select className="p-2 rounded-lg border border-slate-100 bg-white text-xs font-bold" value={row.contPos} onChange={e => updateRow(idx, 'contPos', e.target.value)}>
                              <option value="OK">OK</option>
                              <option value="X">X</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <select className="p-2 rounded-lg border border-slate-100 bg-white text-xs font-bold" value={row.contNeg} onChange={e => updateRow(idx, 'contNeg', e.target.value)}>
                              <option value="OK">OK</option>
                              <option value="X">X</option>
                            </select>
                          </td>
                          <td className="p-2"><input className="w-24 p-2 rounded-lg border border-slate-100 bg-white text-xs" value={row.meggerPos} onChange={e => updateRow(idx, 'meggerPos', e.target.value)} /></td>
                          <td className="p-2"><input className="w-24 p-2 rounded-lg border border-slate-100 bg-white text-xs" value={row.meggerNeg} onChange={e => updateRow(idx, 'meggerNeg', e.target.value)} /></td>
                          <td className="p-2">
                            <button onClick={() => removeRow(idx)} className="p-2 text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {report.dadosTecnicos.length === 0 && (
                        <tr><td colSpan={9} className="p-6 text-center text-slate-400 italic">Nenhuma medição adicionada.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Observações Adicionais</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 min-h-[100px] focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Descreva anomalias ou detalhes observados durante os testes..."
                  value={report.observacoes}
                  onChange={e => setReport({...report, observacoes: e.target.value})}
                ></textarea>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 text-slate-500 font-black border-2 border-slate-200 rounded-2xl hover:bg-white transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> {editMode ? "ATUALIZAR RELATÓRIO" : "SALVAR E CONCLUIR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
