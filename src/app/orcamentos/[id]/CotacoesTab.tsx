import { useState } from "react";
import { Users, Mail, Copy, Loader, UserPlus, ExternalLink, Plus } from "lucide-react";

export default function CotacoesTab({ orcamento, onUpdate }: { orcamento: any, onUpdate: () => void }) {
  const [form, setForm] = useState({ razaoSocial: "", contatoNome: "", contatoEmail: "", contatoTelefone: "" });
  const [xmlItems, setXmlItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddFornecedor = async () => {
    if (!form.razaoSocial) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orcamentos/${orcamento.id}/fornecedores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, xmlItems }),
      });
      if (res.ok) {
        setForm({ razaoSocial: "", contatoNome: "", contatoEmail: "", contatoTelefone: "" });
        setXmlItems([]);
        onUpdate();
      } else {
        alert("Erro ao adicionar fornecedor");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/portal-fornecedor/${token}`;
    navigator.clipboard.writeText(link);
    alert("Link do Portal do Fornecedor copiado!");
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#1E3A8A]" /> Portal de Fornecedores e Convites
        </h2>
        <p className="text-sm text-slate-500 mt-1">Convide fornecedores para preencherem os preços diretamente no sistema, sem planilhas soltas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Adicionar Fornecedor
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Razão Social *</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    value={form.razaoSocial} onChange={e => setForm({...form, razaoSocial: e.target.value})}
                  />
                  <label className="bg-[#00BFA5] text-white px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#00a892] flex items-center justify-center shrink-0" title="Importar XML da Nota Fiscal">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <input type="file" accept=".xml" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      const parser = new DOMParser();
                      const xml = parser.parseFromString(text, "text/xml");
                      
                      // Tentar pegar dados do Emitente (Fornecedor)
                      const emit = xml.getElementsByTagName("emit")[0];
                      if (emit) {
                        const razao = emit.getElementsByTagName("xNome")[0]?.textContent || "";
                        const cnpj = emit.getElementsByTagName("CNPJ")[0]?.textContent || "";
                        const fone = emit.getElementsByTagName("fone")[0]?.textContent || "";
                        
                        const detElements = Array.from(xml.getElementsByTagName("det"));
                        const items = detElements.map(det => {
                          const prod = det.getElementsByTagName("prod")[0];
                          if (!prod) return null;
                          return {
                            descricao: prod.getElementsByTagName("xProd")[0]?.textContent || "",
                            quantidade: parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0"),
                            unidade: prod.getElementsByTagName("uCom")[0]?.textContent || "un",
                            precoUnitario: parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0"),
                          };
                        }).filter(Boolean);
                        setXmlItems(items);
                        
                        setForm({
                          ...form,
                          razaoSocial: razao,
                          contatoTelefone: fone || form.contatoTelefone
                        });
                        
                        alert(`XML Lido! Fornecedor: ${razao} com ${items.length} itens. Agora você pode cadastrá-lo.`);
                      } else {
                        alert("Não foi possível encontrar a tag <emit> (Emitente) no XML.");
                      }
                    }} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Contato</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  value={form.contatoNome} onChange={e => setForm({...form, contatoNome: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  value={form.contatoEmail} onChange={e => setForm({...form, contatoEmail: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">WhatsApp / Telefone</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  value={form.contatoTelefone} onChange={e => setForm({...form, contatoTelefone: e.target.value})}
                />
              </div>
              <button 
                onClick={handleAddFornecedor}
                disabled={loading || !form.razaoSocial}
                className="w-full bg-[#1E3A8A] text-white px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-blue-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Plus />}
                CADASTRAR E GERAR LINK
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {orcamento.fornecedores?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-10 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
              <Mail className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Nenhum fornecedor convidado</p>
              <p className="text-xs text-slate-400 mt-2 text-center max-w-sm">
                Adicione fornecedores ao lado para gerar links exclusivos de cotação. Eles acessarão um portal simplificado para inserir os preços.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orcamento.fornecedores?.map((fo: any) => (
                <div key={fo.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-slate-800 text-lg">{fo.fornecedor.razaoSocial}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        fo.statusConvite === "Respondido" ? "bg-green-100 text-green-700" :
                        fo.statusConvite === "Pendente" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {fo.statusConvite}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-1 flex flex-wrap gap-4">
                      {fo.fornecedor.contatoNome && <span>👤 {fo.fornecedor.contatoNome}</span>}
                      {fo.fornecedor.contatoEmail && <span>✉️ {fo.fornecedor.contatoEmail}</span>}
                      {fo.fornecedor.contatoTelefone && <span>📱 {fo.fornecedor.contatoTelefone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyLink(fo.tokenAcesso)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-3 h-3" /> COPIAR LINK
                    </button>
                    <a 
                      href={`/portal-fornecedor/${fo.tokenAcesso}`}
                      target="_blank"
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" /> VER PORTAL
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

