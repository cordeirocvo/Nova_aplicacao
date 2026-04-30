"use client";
import { useState, useEffect } from "react";
import { Package, Zap, Sun, Battery, Box, Plus, Settings2, Trash2, Edit3, Loader2, BatteryCharging } from "lucide-react";

type TipoEquipamento = 'inversores' | 'modulos' | 'baterias' | 'estruturas' | 'carregadores';

const TABS: { id: TipoEquipamento; label: string; icon: React.ElementType }[] = [
  { id: 'inversores', label: 'Inversores', icon: Zap },
  { id: 'modulos', label: 'Módulos FV', icon: Sun },
  { id: 'baterias', label: 'Baterias', icon: Battery },
  { id: 'carregadores', label: 'Carregadores VE', icon: BatteryCharging },
  { id: 'estruturas', label: 'Estruturas', icon: Box },
];

export default function EquipamentosPage() {
  const [activeTab, setActiveTab] = useState<TipoEquipamento>('inversores');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/engenharia/equipamentos/${activeTab}`);
    if (res.ok) {
      const json = await res.json();
      // Map brand/model to fabricante/modelo for chargers
      const normalized = json.map((item: any) => ({
        ...item,
        fabricante: item.brand || item.fabricante,
        modelo: item.model || item.modelo
      }));
      setData(normalized);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Lista de campos válidos por modelo
    const validFields: Record<string, string[]> = {
      inversores: ['fabricante', 'modelo', 'potenciaNominalKW', 'tipoConexao', 'tensaoEntradaMinV', 'tensaoEntradaMaxV', 'correnteMaxCC', 'numeroStringsMPPT', 'potenciaMPPTKW', 'tensaoSaidaVAC', 'fatorPotencia', 'eficiencia', 'comunicacao', 'ipBD', 'datasheetUrl', 'fase'],
      modulos: ['fabricante', 'modelo', 'potenciaPicoWp', 'Vmp', 'Imp', 'Voc', 'Isc', 'eficiencia', 'dimensoes', 'pesoKg', 'coefTempVoc', 'coefTempIsc', 'garantiaAnos', 'datasheetUrl'],
      baterias: ['fabricante', 'modelo', 'tecnologia', 'capacidadeNomKWh', 'tensaoNominalV', 'profundidadeDescarga', 'ciclosVida', 'correnteMaxCarga', 'correnteMaxDescarga', 'tempOperacaoMin', 'tempOperacaoMax', 'datasheetUrl'],
      estruturas: ['fabricante', 'modelo', 'tipoTelhado', 'materialEstrutura', 'cargaMaxVentoKNm2', 'modulosMaxFileira', 'anguloMin', 'anguloMax', 'datasheetUrl'],
      carregadores: ['fabricante', 'modelo', 'power', 'voltage', 'phases', 'current', 'connectorType', 'datasheetUrl']
    };

    const numericFields: Record<string, string[]> = {
      inversores: ['potenciaNominalKW', 'tensaoEntradaMinV', 'tensaoEntradaMaxV', 'correnteMaxCC', 'numeroStringsMPPT', 'potenciaMPPTKW', 'tensaoSaidaVAC', 'fatorPotencia', 'eficiencia', 'fase'],
      modulos: ['potenciaPicoWp', 'Vmp', 'Imp', 'Voc', 'Isc', 'eficiencia', 'pesoKg', 'coefTempVoc', 'coefTempIsc', 'garantiaAnos'],
      baterias: ['capacidadeNomKWh', 'tensaoNominalV', 'profundidadeDescarga', 'ciclosVida', 'correnteMaxCarga', 'correnteMaxDescarga', 'tempOperacaoMin', 'tempOperacaoMax'],
      estruturas: ['cargaMaxVentoKNm2', 'modulosMaxFileira', 'anguloMin', 'anguloMax'],
      carregadores: ['power', 'voltage', 'phases', 'current']
    };

    const allowed = validFields[activeTab] || [];
    const fieldsToConvert = numericFields[activeTab] || [];

    const finalData: any = {};
    if (formData.id) finalData.id = formData.id;

    allowed.forEach(key => {
      if (formData[key] !== undefined) {
        let val = formData[key];
        if (fieldsToConvert.includes(key) && val !== null && val !== '') {
          val = parseFloat(val.toString().replace(',', '.'));
          if (isNaN(val)) val = null;
        }
        finalData[key] = val;
      }
    });

    const method = formData.id ? "PATCH" : "POST";
    const res = await fetch(`/api/engenharia/equipamentos/${activeTab}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalData),
    });
    
    if (res.ok) {
      setShowModal(false);
      fetchData();
    } else {
      const err = await res.json();
      alert(`Erro ao salvar: ${err.error}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este equipamento?")) return;
    await fetch(`/api/engenharia/equipamentos/${activeTab}?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const openModal = (item?: any) => {
    if (item) {
      setFormData(item);
    } else {
      const defaults: any = {};
      if (activeTab === 'baterias') defaults.tecnologia = 'LFP';
      if (activeTab === 'inversores') defaults.tipoConexao = 'ON_GRID';
      if (activeTab === 'estruturas') defaults.tipoTelhado = 'CERAMICO';
      if (activeTab === 'carregadores') {
         defaults.voltage = 220;
         defaults.phases = 1;
         defaults.connectorType = 'TIPO_2';
      }
      setFormData(defaults);
    }
    setShowModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
            <Package className="w-8 h-8 text-[#00BFA5]" /> Equipamentos
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Biblioteca de componentes para dimensionamento (Solar, BESS e EV)</p>
        </div>
        <button onClick={() => openModal()} className="bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5] text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg font-bold text-sm">
          <Plus className="w-5 h-5" /> Adicionar {TABS.find(t => t.id === activeTab)?.label}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === tab.id ? 'border-[#00BFA5] text-[#1E3A8A]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela de Dados */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" /></div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
          <Settings2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nenhum equipamento cadastrado nesta categoria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-4">Fabricante / Modelo</th>
                {activeTab === 'inversores' && <th className="p-4">Potência (kW)</th>}
                {activeTab === 'inversores' && <th className="p-4">Tipo Conexão</th>}
                {activeTab === 'inversores' && <th className="p-4">Eficiência</th>}
                {activeTab === 'modulos' && <th className="p-4">Potência (Wp)</th>}
                {activeTab === 'modulos' && <th className="p-4">Tensão Voc</th>}
                {activeTab === 'baterias' && <th className="p-4">Tecnologia</th>}
                {activeTab === 'baterias' && <th className="p-4">Capacidade (kWh)</th>}
                {activeTab === 'baterias' && <th className="p-4">Tensão Nominal (V)</th>}
                {activeTab === 'carregadores' && <th className="p-4">Potência (kW)</th>}
                {activeTab === 'carregadores' && <th className="p-4">Corrente (A)</th>}
                {activeTab === 'carregadores' && <th className="p-4">Fases</th>}
                {activeTab === 'estruturas' && <th className="p-4">Tipo Telhado</th>}
                {activeTab === 'estruturas' && <th className="p-4">Material</th>}
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{item.fabricante}</p>
                    <p className="text-xs text-slate-500">{item.modelo}</p>
                  </td>
                  {activeTab === 'inversores' && <td className="p-4 font-medium">{item.potenciaNominalKW} kW</td>}
                  {activeTab === 'inversores' && <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{item.tipoConexao}</span></td>}
                  {activeTab === 'inversores' && <td className="p-4">{item.eficiencia ? `${item.eficiencia}%` : '-'}</td>}
                  
                  {activeTab === 'modulos' && <td className="p-4 font-medium">{item.potenciaPicoWp} Wp</td>}
                  {activeTab === 'modulos' && <td className="p-4">{item.Voc ? `${item.Voc}V` : '-'}</td>}
                  
                  {activeTab === 'baterias' && <td className="p-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs">{item.tecnologia}</span></td>}
                  {activeTab === 'baterias' && <td className="p-4 font-medium">{item.capacidadeNomKWh} kWh</td>}
                  {activeTab === 'baterias' && <td className="p-4">{item.tensaoNominalV ? `${item.tensaoNominalV}V` : '-'}</td>}

                  {activeTab === 'carregadores' && <td className="p-4 font-medium text-[#00BFA5]">{item.power} kW</td>}
                  {activeTab === 'carregadores' && <td className="p-4 font-bold">{item.current}A</td>}
                  {activeTab === 'carregadores' && <td className="p-4">{item.phases}F ({item.voltage}V)</td>}
                  
                  {activeTab === 'estruturas' && <td className="p-4 font-medium"><span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs">{item.tipoTelhado}</span></td>}
                  {activeTab === 'estruturas' && <td className="p-4">{item.materialEstrutura || '-'}</td>}
                  
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:text-[#1E3A8A] rounded-lg hover:bg-blue-50 transition-all"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Genérico */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-xl font-black text-slate-800 mb-6">{formData.id ? 'Editar' : 'Novo'} {TABS.find(t => t.id === activeTab)?.label}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fabricante *</label>
                  <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.fabricante || ''} onChange={e => setFormData({ ...formData, fabricante: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo *</label>
                  <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.modelo || ''} onChange={e => setFormData({ ...formData, modelo: e.target.value })} />
                </div>

                {activeTab === 'inversores' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Potência Nominal (kW) *</label>
                      <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.potenciaNominalKW || ''} onChange={e => setFormData({ ...formData, potenciaNominalKW: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Conexão *</label>
                      <select required className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.tipoConexao || 'ON_GRID'} onChange={e => setFormData({ ...formData, tipoConexao: e.target.value })}>
                        <option value="ON_GRID">ON_GRID</option><option value="OFF_GRID">OFF_GRID</option><option value="HYBRID">HYBRID</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tensao Entrada Max (V)</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.tensaoEntradaMaxV || ''} onChange={e => setFormData({ ...formData, tensaoEntradaMaxV: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Eficiência (%)</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.eficiencia || ''} onChange={e => setFormData({ ...formData, eficiencia: e.target.value })} /></div>
                  </>
                )}

                {activeTab === 'modulos' && (
                  <>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Potência Pico (Wp) *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.potenciaPicoWp || ''} onChange={e => setFormData({ ...formData, potenciaPicoWp: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tensão Aberta (Voc) *</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.Voc || ''} onChange={e => setFormData({ ...formData, Voc: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tensão Nominal (Vmp) *</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.Vmp || ''} onChange={e => setFormData({ ...formData, Vmp: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Corrente Curto (Isc) *</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.Isc || ''} onChange={e => setFormData({ ...formData, Isc: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Corrente Nominal (Imp)</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.Imp || ''} onChange={e => setFormData({ ...formData, Imp: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Eficiência (%)</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.eficiencia || ''} onChange={e => setFormData({ ...formData, eficiencia: e.target.value })} /></div>
                  </>
                )}

                {activeTab === 'baterias' && (
                  <>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacidade Nominal (kWh) *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.capacidadeNomKWh || ''} onChange={e => setFormData({ ...formData, capacidadeNomKWh: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tecnologia *</label><select required className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.tecnologia || 'LFP'} onChange={e => setFormData({ ...formData, tecnologia: e.target.value })}><option value="LFP">LFP (LiFePO4)</option><option value="NMC">NMC</option><option value="AGM">Chumbo-Ácido (AGM)</option><option value="VRLA">Chumbo-Ácido (VRLA)</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tensão Nominal (V)</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.tensaoNominalV || ''} onChange={e => setFormData({ ...formData, tensaoNominalV: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profundidade de Descarga (DOD %)</label><input type="text" placeholder="0.80 para 80%" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.profundidadeDescarga || ''} onChange={e => setFormData({ ...formData, profundidadeDescarga: e.target.value })} /></div>
                  </>
                )}

                {activeTab === 'carregadores' && (
                  <>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Potência (kW) *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.power || ''} onChange={e => setFormData({ ...formData, power: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tensão (V) *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.voltage || ''} onChange={e => setFormData({ ...formData, voltage: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fases (1 ou 3) *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.phases || ''} onChange={e => setFormData({ ...formData, phases: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Corrente Nominal (A) *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.current || ''} onChange={e => setFormData({ ...formData, current: e.target.value })} /></div>
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Conector</label><input type="text" placeholder="Ex: Tipo 2, CCS-2, GB/T" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.connectorType || ''} onChange={e => setFormData({ ...formData, connectorType: e.target.value })} /></div>
                  </>
                )}

                {activeTab === 'estruturas' && (
                  <>
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Telhado *</label><select required className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.tipoTelhado || 'CERAMICO'} onChange={e => setFormData({ ...formData, tipoTelhado: e.target.value })}><option value="CERAMICO">Cerâmico / Colonial</option><option value="METALICO">Metálico / Trapezoidal</option><option value="FIBROCIMENTO">Fibrocimento</option><option value="LAJE">Laje (Triângulo)</option><option value="SOLO">Solo</option><option value="CARPORT">Carport / Garagem</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Material</label><input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={formData.materialEstrutura || ''} onChange={e => setFormData({ ...formData, materialEstrutura: e.target.value })} /></div>
                  </>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-[#00BFA5] text-white rounded-xl font-bold text-sm disabled:opacity-50 flex justify-center">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
