import { useState } from "react";
import { BarChart, TrendingDown, TrendingUp, AlertTriangle, ArrowLeft, Trash, Edit, X, Check, Loader, FileText, Printer } from "lucide-react";

export default function EqualizacaoTab({ 
  orcamento, 
  onUpdate 
}: { 
  orcamento: any; 
  onUpdate: () => void; 
}) {
  // Estados para edição/atualização manual das cotações
  const [editingFornecedor, setEditingFornecedor] = useState<any>(null);
  const [pricesForm, setPricesForm] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [transferringItem, setTransferringItem] = useState<string | null>(null);

  // Estados para importação via PDF direto na tela de equalização (pelo Administrador)
  const [parsingAdminPdf, setParsingAdminPdf] = useState<string | null>(null); // Armazena o ID do fornecedor em processamento
  const [divergentItems, setDivergentItems] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<number, string>>({});
  const [mappingFornecedor, setMappingFornecedor] = useState<any>(null);

  // Estados para geração de relatórios / RFQ
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [rfqSelectionType, setRfqSelectionType] = useState<"itens" | "etapas">("itens");
  const [selectedRfqItems, setSelectedRfqItems] = useState<Record<string, boolean>>({});
  const [selectedRfqEtapas, setSelectedRfqEtapas] = useState<Record<string, boolean>>({});
  const [rfqPrintItems, setRfqPrintItems] = useState<any[] | null>(null);

  // Extrair todos os itens de todas as etapas para formar as linhas da matriz
  const allItens = orcamento.etapas?.flatMap((e: any) => e.itens) || [];
  
  // Extrair fornecedores que responderam ou que têm cotações parciais
  const fornecedoresAtivos = orcamento.fornecedores?.filter((f: any) => f.statusConvite === "Respondido") || [];

  const calcularTotalBase = () => {
    return allItens.reduce((acc: number, item: any) => {
      return acc + (item.quantidade * (item.precoBaseUnitario || 0));
    }, 0);
  };

  const calcularTotalFornecedor = (fornecedorId: string) => {
    return allItens.reduce((acc: number, item: any) => {
      const proposta = item.propostas?.find((p: any) => p.fornecedorId === fornecedorId);
      return acc + (item.quantidade * (proposta?.precoUnitario || 0));
    }, 0);
  };

  const totalBase = calcularTotalBase();

  // Excluir cotação de fornecedor
  const handleDeleteFornecedorCotacao = async (fornecedorId: string, razaoSocial: string) => {
    if (typeof window !== "undefined" && !window.confirm(`ATENÇÃO: Isso excluirá todos os preços enviados pelo fornecedor "${razaoSocial}" neste projeto e resetará o status para Pendente. Deseja continuar?`)) {
      return;
    }
    
    setIsDeleting(fornecedorId);
    try {
      const res = await fetch(`/api/orcamentos/${orcamento.id}/fornecedores?fornecedorId=${fornecedorId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        onUpdate();
      } else {
        alert(data.error || "Erro ao excluir cotação");
      }
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setIsDeleting(null);
    }
  };

  // Abrir modal de atualização manual de cotação
  const handleOpenUpdateModal = (fo: any) => {
    const initialPrices: Record<string, string> = {};
    allItens.forEach((item: any) => {
      const prop = item.propostas?.find((p: any) => p.fornecedorId === fo.fornecedorId);
      initialPrices[item.id] = prop ? String(prop.precoUnitario) : "";
    });
    setPricesForm(initialPrices);
    setEditingFornecedor(fo);
  };

  // Salvar cotação editada manualmente
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFornecedor) return;

    setSavingPrices(true);
    try {
      const propostas = Object.entries(pricesForm).map(([itemId, value]) => ({
        itemId,
        precoUnitario: parseFloat(String(value).replace(",", ".")) || 0
      }));

      const res = await fetch(`/api/orcamentos/${orcamento.id}/fornecedores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedorId: editingFornecedor.fornecedorId,
          propostas
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingFornecedor(null);
        onUpdate();
      } else {
        alert(data.error || "Erro ao atualizar cotação");
      }
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setSavingPrices(false);
    }
  };

  // Upload e Parse de PDF feito pelo Administrador para um fornecedor específico
  const handleAdminPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, fo: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingAdminPdf(fo.fornecedorId);
    setDivergentItems([]);
    setMappings({});
    setMappingFornecedor(fo);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/portal-fornecedor/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error || "Erro ao ler PDF de orçamento");
        return;
      }

      if (resData.items && Array.isArray(resData.items)) {
        const newPrecos: Record<string, string> = {};
        const newDivergent: any[] = [];

        // Pré-carregar preços existentes do fornecedor
        allItens.forEach((item: any) => {
          const prop = item.propostas?.find((p: any) => p.fornecedorId === fo.fornecedorId);
          if (prop) newPrecos[item.id] = String(prop.precoUnitario);
        });

        resData.items.forEach((pdfItem: any) => {
          const pdfItemDesc = (pdfItem.descricao || "").toLowerCase().trim();
          
          // Buscar correspondência exata ou por inclusão inteligente
          const match = allItens.find((pi: any) => {
            const piDesc = (pi.descricao || "").toLowerCase().trim();
            return piDesc === pdfItemDesc || piDesc.includes(pdfItemDesc) || pdfItemDesc.includes(piDesc);
          });

          if (match) {
            newPrecos[match.id] = String(pdfItem.precoUnitario);
          } else {
            newDivergent.push(pdfItem);
          }
        });

        setPricesForm(newPrecos);

        if (newDivergent.length > 0) {
          setDivergentItems(newDivergent);
          alert(`PDF processado! ${resData.items.length - newDivergent.length} itens foram mapeados automaticamente para o fornecedor "${fo.fornecedor.razaoSocial}". Identificamos ${newDivergent.length} itens com nomes divergentes para você associar manualmente.`);
          // Abrir modal de edição com os preços já preenchidos
          setEditingFornecedor(fo);
        } else {
          // Sem divergências, salvar direto
          const propostas = Object.entries(newPrecos).map(([itemId, value]) => ({
            itemId,
            precoUnitario: parseFloat(String(value).replace(",", ".")) || 0
          }));

          const saveRes = await fetch(`/api/orcamentos/${orcamento.id}/fornecedores`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fornecedorId: fo.fornecedorId,
              propostas
            }),
          });

          if (saveRes.ok) {
            alert(`PDF lido com sucesso! Todos os ${resData.items.length} itens foram mapeados e preenchidos automaticamente para "${fo.fornecedor.razaoSocial}".`);
            onUpdate();
          } else {
            alert("Erro ao salvar propostas importadas.");
          }
        }
      }
    } catch (err) {
      alert("Erro de conexão ao enviar PDF.");
    } finally {
      setParsingAdminPdf(null);
    }
  };

  // Aplicar mapeamentos manuais de itens do PDF feitos pelo Admin
  const applyAdminMappings = () => {
    const newPrices = { ...pricesForm };
    
    Object.entries(mappings).forEach(([idxStr, itemId]) => {
      const idx = parseInt(idxStr);
      const pdfItem = divergentItems[idx];
      
      if (pdfItem && itemId && itemId !== "ignore") {
        newPrices[itemId] = String(pdfItem.precoUnitario);
      }
    });

    setPricesForm(newPrices);
    setDivergentItems([]);
    setMappings({});
    alert("Associações manuais aplicadas ao formulário! Lembre-se de clicar em 'Salvar Cotação' para persistir no banco.");
  };

  // Transferir o menor preço para o EAP & Escopo Base
  const handleTransferPrice = async (itemId: string, menorPreco: number, precoBaseAtual: number) => {
    if (menorPreco <= 0) return;
    if (menorPreco === precoBaseAtual) return;

    setTransferringItem(itemId);
    try {
      const item = allItens.find((i: any) => i.id === itemId);
      if (!item) return;

      const res = await fetch(`/api/orcamentos/itens/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: item.codigo,
          descricao: item.descricao,
          tipo: item.tipo,
          unidade: item.unidade,
          quantidade: item.quantidade,
          precoBaseUnitario: menorPreco,
          imagemUrl: item.imagemUrl
        })
      });

      if (res.ok) {
        onUpdate();
      } else {
        alert("Erro ao transferir o preço");
      }
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setTransferringItem(null);
    }
  };

  // Atualizar quantidade de um item diretamente na matriz
  const handleUpdateQuantity = async (item: any, newQty: number) => {
    try {
      const res = await fetch(`/api/orcamentos/itens/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: item.codigo,
          descricao: item.descricao,
          tipo: item.tipo,
          unidade: item.unidade,
          quantidade: newQty,
          precoBaseUnitario: item.precoBaseUnitario,
          imagemUrl: item.imagemUrl
        })
      });

      if (res.ok) {
        onUpdate();
      } else {
        console.error("Erro ao atualizar quantidade");
      }
    } catch (err) {
      console.error("Erro de conexão ao atualizar quantidade", err);
    }
  };

  // Abrir modal de criação de relatório RFQ
  const handleOpenRfqModal = () => {
    const initialItemSelection: Record<string, boolean> = {};
    const initialEtapaSelection: Record<string, boolean> = {};
    
    allItens.forEach((item: any) => {
      initialItemSelection[item.id] = true; // selecionados por padrão
    });
    orcamento.etapas?.forEach((etapa: any) => {
      initialEtapaSelection[etapa.id] = true;
    });

    setSelectedRfqItems(initialItemSelection);
    setSelectedRfqEtapas(initialEtapaSelection);
    setRfqSelectionType("itens");
    setIsRfqModalOpen(true);
  };

  // Tocar seleção de todos os itens de uma vez
  const toggleSelectAllItems = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    allItens.forEach((item: any) => {
      newSelection[item.id] = checked;
    });
    setSelectedRfqItems(newSelection);
  };

  // Alternar seleção de etapa (e marcar/desmarcar todos os seus itens)
  const handleToggleEtapaSelection = (etapaId: string, checked: boolean) => {
    setSelectedRfqEtapas({ ...selectedRfqEtapas, [etapaId]: checked });
    
    const etapa = orcamento.etapas?.find((e: any) => e.id === etapaId);
    if (etapa?.itens) {
      const newItems = { ...selectedRfqItems };
      etapa.itens.forEach((item: any) => {
        newItems[item.id] = checked;
      });
      setSelectedRfqItems(newItems);
    }
  };

  // Gerar e exibir a visualização de impressão do relatório RFQ
  const generateRfqReport = () => {
    const itemsToPrint = allItens.filter((item: any) => selectedRfqItems[item.id]);
    
    if (itemsToPrint.length === 0) {
      alert("Selecione pelo menos um item para incluir no relatório.");
      return;
    }

    setRfqPrintItems(itemsToPrint);
    setIsRfqModalOpen(false);
  };

  // Renderizar visualização de impressão (RFQ)
  if (rfqPrintItems) {
    return (
      <div className="bg-white min-h-screen p-8 max-w-4xl mx-auto space-y-6 text-slate-800 font-sans print:p-0">
        {/* Painel de Controle de Impressão (Oculto ao Imprimir) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl print:hidden shadow-sm">
          <div>
            <h3 className="font-black text-slate-800">Visualização de Solicitação de Cotação (RFQ)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Esta folha está formatada sem preços de concorrentes para envio limpo ao fornecedor.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#00BFA5] hover:bg-[#00a891] text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR / PDF
            </button>
            <button
              onClick={() => setRfqPrintItems(null)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer"
            >
              VOLTAR AO MAPA
            </button>
          </div>
        </div>

        {/* Folha de Orçamento / RFQ (Pronta para imprimir ou salvar como PDF) */}
        <div className="border border-slate-200 p-8 rounded-3xl bg-white shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-2xl font-black text-[#1E3A8A] tracking-tight uppercase">Cordeiro Energia</h1>
              <p className="text-xs font-bold text-[#00BFA5] uppercase tracking-wider mt-1">Solicitação de Proposta Comercial (RFQ)</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Data de Emissão</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl print:bg-white print:border print:border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor Destinatário</p>
            <p className="text-sm font-black text-slate-600 mt-1">___________________________________________________</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Por favor, preencha os preços e condições abaixo.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                  <th className="py-3 pr-2 w-10 text-center">Item</th>
                  <th className="py-3 px-2 w-24">Código</th>
                  <th className="py-3 px-2">Descrição Técnica / Especificação</th>
                  <th className="py-3 px-2 text-center w-16">Qtd</th>
                  <th className="py-3 px-2 text-center w-12">Un</th>
                  <th className="py-3 pl-2 w-36 text-right border-l border-slate-100 bg-slate-50/50 print:bg-transparent">Preço Unitário (R$)</th>
                  <th className="py-3 pl-2 w-36 text-right border-l border-slate-100 bg-slate-50/50 print:bg-transparent">Preço Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfqPrintItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/30">
                    <td className="py-3.5 pr-2 font-bold text-slate-400 text-center">{idx + 1}</td>
                    <td className="py-3.5 px-2 font-mono text-slate-500 text-[10px]">{item.codigo || "-"}</td>
                    <td className="py-3.5 px-2 font-semibold text-slate-700">{item.descricao}</td>
                    <td className="py-3.5 px-2 text-center font-black text-slate-600">{item.quantidade}</td>
                    <td className="py-3.5 px-2 text-center text-slate-500 font-medium">{item.unidade}</td>
                    <td className="py-3.5 pl-2 text-right border-l border-slate-100 text-slate-300 font-medium">R$ _________________</td>
                    <td className="py-3.5 pl-2 text-right border-l border-slate-100 text-slate-300 font-medium">R$ _________________</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-8 border-t border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Termos e Condições Gerais de Fornecimento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10px] text-slate-500 leading-relaxed">
              <div className="space-y-3">
                <p><b>Prazo de Entrega Estimado:</b> ___________________________ dias úteis após o pedido.</p>
                <p><b>Validade da Proposta Enviada:</b> ___________________________ dias.</p>
                <p><b>Condições / Forma de Pagamento:</b> __________________________________________________.</p>
              </div>
              <div className="space-y-3">
                <p><b>Garantia do Fabricante Oferecida:</b> _________________________________________________.</p>
                <p><b>Valores e Impostos Inclusos no Preço?</b> ( ) Sim  ( ) Não</p>
                <p><b>Assinatura Autorizada / Carimbo do Fornecedor:</b> ____________________________________.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in relative">
      {/* CSS para ocultar fornecedor na impressão */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print-supplier {
            display: none !important;
          }
        }
      `}} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-[#00BFA5]" /> Mapa de Coleta e Equalização
          </h2>
          <p className="text-sm text-slate-500 mt-1">Comparativo lado a lado das propostas recebidas vs. orçamento base.</p>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto print:hidden">
          {/* Botão de relatório para fornecedores */}
          <button 
            onClick={handleOpenRfqModal}
            className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-1.5 shadow-md shadow-slate-800/10 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> GERAR RELATÓRIO / RFQ
          </button>
          
          {/* Botão de atualização rápida */}
          <button 
            onClick={onUpdate}
            className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Loader className="w-3.5 h-3.5" /> ATUALIZAR DADOS
          </button>
        </div>
      </div>

      {fornecedoresAtivos.length === 0 ? (
        <div className="text-center p-10 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
          <BarChart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aguardando Propostas</p>
          <p className="text-xs text-slate-400 mt-1">Nenhum fornecedor enviou preços ainda. O mapa será gerado automaticamente.</p>
        </div>
      ) : (
        <>
          {/* Cards de Resumo dos Fornecedores */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orçamento Base (Meta)</p>
                <h3 className="text-2xl font-black text-slate-800">
                  R$ {totalBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mt-4">Meta Interna</div>
            </div>

            {fornecedoresAtivos.map((fo: any) => {
              const totalFornecedor = calcularTotalFornecedor(fo.fornecedorId);
              const diff = totalBase > 0 ? ((totalBase - totalFornecedor) / totalBase) * 100 : 0;
              const isSaving = diff >= 0;

              return (
                <div key={fo.id} className={`border p-5 rounded-2xl flex flex-col justify-between transition-all hover:shadow-sm ${isSaving ? "bg-[#00BFA5]/10 border-[#00BFA5]/30" : "bg-red-50 border-red-200"}`}>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate" title={fo.fornecedor.razaoSocial}>
                      {fo.fornecedor.razaoSocial}
                    </p>
                    <h3 className="text-2xl font-black text-slate-800">
                      R$ {totalFornecedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </h3>
                    <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${isSaving ? "text-[#00BFA5]" : "text-red-500"}`}>
                      {isSaving ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      {Math.abs(diff).toFixed(1)}% {isSaving ? "Saving" : "Acima"}
                    </div>
                  </div>

                  {/* Botões de Ação na Proposta do Fornecedor */}
                  <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 print:hidden">
                    <button
                      onClick={() => handleOpenUpdateModal(fo)}
                      disabled={isDeleting !== null || parsingAdminPdf !== null}
                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-[#1E3A8A] hover:text-white text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      title="Atualizar preços manualmente"
                    >
                      <Edit className="w-3.5 h-3.5" /> Atualizar
                    </button>

                    {/* Botão de Inserir PDF da Proposta diretamente na equalização */}
                    {parsingAdminPdf === fo.fornecedorId ? (
                      <div className="flex-1 py-1.5 bg-white border border-slate-200 text-[#00BFA5] rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm">
                        <Loader className="w-3.5 h-3.5 animate-spin" /> PDF...
                      </div>
                    ) : (
                      <label className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-[#00BFA5] hover:text-white text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer text-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        PDF
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          onChange={(e) => handleAdminPdfUpload(e, fo)} 
                        />
                      </label>
                    )}

                    <button
                      onClick={() => handleDeleteFornecedorCotacao(fo.fornecedorId, fo.fornecedor.razaoSocial)}
                      disabled={isDeleting !== null || parsingAdminPdf !== null}
                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-red-500 hover:text-white text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      title="Deletar orçamento do fornecedor"
                    >
                      {isDeleting === fo.fornecedorId ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash className="w-3.5 h-3.5" />
                      )}
                      Deletar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matriz de Preços */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm bg-white">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4 sticky left-0 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 w-64">Item</th>
                  <th className="px-6 py-4 text-center">Qtd</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200">Preço Base</th>
                  {fornecedoresAtivos.map((fo: any) => (
                    <th key={fo.id} className="px-6 py-4 text-right bg-blue-50/20">
                      <div className="truncate w-32 ml-auto" title={fo.fornecedor.razaoSocial}>
                        {fo.fornecedor.razaoSocial}
                      </div>
                    </th>
                  ))}
                  {/* Nova coluna de Menor Preço */}
                  <th className="px-6 py-4 text-right border-l border-slate-200 bg-emerald-50/40 text-[#00BFA5] font-black w-48">
                    Menor Preço
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allItens.map((item: any) => {
                  const custoBase = item.precoBaseUnitario || 0;
                  
                  // Calcular preços válidos dos fornecedores (maiores que zero)
                  const precosValidos = fornecedoresAtivos
                    .map((fo: any) => {
                      const prop = item.propostas?.find((p: any) => p.fornecedorId === fo.fornecedorId);
                      return prop?.precoUnitario || 0;
                    })
                    .filter((p: number) => p > 0);
                  
                  // Incluir o preço base para a comparação do menor preço
                  if (custoBase > 0) {
                    precosValidos.push(custoBase);
                  }
                  
                  const mediaPrecos = precosValidos.length > 0 
                    ? precosValidos.reduce((a: number, b: number) => a + b, 0) / precosValidos.length 
                    : 0;
                  
                  const menorPreco = precosValidos.length > 0 ? Math.min(...precosValidos) : 0;

                  // Encontrar o fornecedor que enviou o menor valor ou se é o preço base
                  const fornecedorMenorObj = fornecedoresAtivos.find((fo: any) => {
                    const prop = item.propostas?.find((p: any) => p.fornecedorId === fo.fornecedorId);
                    return prop && prop.precoUnitario > 0 && prop.precoUnitario === menorPreco;
                  });
                  const fornecedorMenorNome = fornecedorMenorObj 
                    ? fornecedorMenorObj.fornecedor.razaoSocial 
                    : (menorPreco === custoBase ? "Orçamento Base" : "");

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">
                        <p className="font-semibold text-slate-700 truncate w-64" title={item.descricao}>{item.descricao}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.codigo || "S/C"}</p>
                      </td>
                      <td className="px-6 py-3.5 text-center font-black text-slate-600">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="w-16 px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent focus:bg-white transition-all inline-block print:hidden"
                            value={item.quantidade}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateQuantity(item, isNaN(val) ? 0 : val);
                            }}
                          />
                          <span className="hidden print:inline">{item.quantidade}</span>
                          <span className="text-[10px] font-normal text-slate-400">{item.unidade}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-slate-500 border-r border-slate-200">
                        {custoBase > 0 ? `R$ ${custoBase.toFixed(2)}` : "-"}
                      </td>
                      
                      {fornecedoresAtivos.map((fo: any) => {
                        const proposta = item.propostas?.find((p: any) => p.fornecedorId === fo.fornecedorId);
                        const preco = proposta?.precoUnitario || 0;
                        
                        // Outliers
                        const isOutlierHigh = (mediaPrecos > 0 && preco > mediaPrecos * 1.4) || (custoBase > 0 && preco > custoBase * 1.5);
                        const isOutlierLow = preco > 0 && ((mediaPrecos > 0 && preco < mediaPrecos * 0.6) || (custoBase > 0 && preco < custoBase * 0.5));
                        const isLowest = preco > 0 && preco === menorPreco;

                        return (
                          <td key={fo.id} className={`px-6 py-3.5 text-right relative group ${isLowest ? "bg-[#00BFA5]/5" : ""}`}>
                            {preco > 0 ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {isLowest && (
                                  <span className="text-[8px] font-black text-[#00BFA5] border border-[#00BFA5]/30 bg-[#00BFA5]/5 px-1 rounded uppercase tracking-tighter">Melhor</span>
                                )}
                                {(isOutlierHigh || isOutlierLow) && (
                                  <span title={isOutlierHigh ? "Preço muito acima da média" : "Preço muito abaixo da média"}>
                                    <AlertTriangle className={`w-3.5 h-3.5 ${isOutlierHigh ? "text-red-400" : "text-amber-400"}`} />
                                  </span>
                                )}
                                <span className={`font-bold ${
                                  isLowest ? "text-[#00BFA5]" :
                                  isOutlierHigh ? "text-red-600" : 
                                  isOutlierLow ? "text-amber-600" : 
                                  "text-slate-800"
                                }`}>
                                  R$ {preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Coluna final de Menor Preço com botão de transferência */}
                      <td className="px-6 py-3.5 text-right border-l border-slate-200 bg-emerald-50/10 font-bold w-48">
                        {menorPreco > 0 ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center justify-end gap-2">
                              {/* Botão sutil de transferência */}
                              {custoBase === menorPreco ? (
                                <span className="p-1 text-emerald-600 bg-emerald-50 rounded-lg print:hidden" title="Preço base já está igual ao menor preço">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleTransferPrice(item.id, menorPreco, custoBase)}
                                  disabled={transferringItem !== null}
                                  className="p-1 bg-[#00BFA5]/10 hover:bg-[#00BFA5] text-[#00BFA5] hover:text-white rounded-lg transition-all shadow-sm flex items-center justify-center print:hidden cursor-pointer"
                                  title="Transferir menor preço para EAP & Escopo Base"
                                >
                                  {transferringItem === item.id ? (
                                    <Loader className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                              <span className="font-black text-emerald-600">
                                R$ {menorPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Nome do fornecedor de forma sutil (com classe para sumir na impressão) */}
                            <div 
                              className="text-[9.5px] text-slate-400 font-medium mt-0.5 no-print-supplier truncate max-w-[120px]" 
                              title={fornecedorMenorNome}
                            >
                              {fornecedorMenorNome}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal de Atualização Manual da Cotação do Fornecedor */}
      {editingFornecedor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-800">Atualizar Cotação Manual</h2>
                <p className="text-xs font-bold text-[#00BFA5] uppercase tracking-wider mt-0.5">{editingFornecedor.fornecedor.razaoSocial}</p>
              </div>
              <button 
                onClick={() => {
                  setEditingFornecedor(null);
                  setDivergentItems([]);
                  setMappings({});
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mapeamentos de PDF pendentes específicos do Administrador (quando importados via PDF na equalização) */}
            {divergentItems.length > 0 && (
              <div className="m-4 p-4 bg-amber-50/50 border border-amber-200 border-l-4 border-l-amber-400 rounded-xl space-y-3 max-h-60 overflow-y-auto">
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                  ⚠️ Itens Divergentes Encontrados no PDF
                </h4>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Por favor, indique em qual item do projeto cada item divergente do PDF deve ser inserido:
                </p>
                <div className="grid gap-2">
                  {divergentItems.map((pdfItem, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-slate-150 rounded-lg shadow-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate">{pdfItem.descricao}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Qtd: {pdfItem.quantidade} • Unitário: R$ {pdfItem.precoUnitario.toFixed(2)}</p>
                      </div>
                      <div className="w-full sm:w-64 shrink-0">
                        <select
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                          value={mappings[idx] || ""}
                          onChange={(e) => setMappings({ ...mappings, [idx]: e.target.value })}
                        >
                          <option value="">-- Associar ao produto --</option>
                          <option value="ignore">❌ Desconsiderar este valor</option>
                          {allItens.map((pi: any) => (
                            <option key={pi.id} value={pi.id}>{pi.descricao} ({pi.quantidade} {pi.unidade})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={applyAdminMappings}
                    className="px-3 py-1.5 bg-[#00BFA5] text-white text-[10px] font-black rounded-lg hover:bg-[#00a891] transition-all cursor-pointer"
                  >
                    APLICAR MAPAS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDivergentItems([]);
                      setMappings({});
                    }}
                    className="px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-black rounded-lg hover:bg-slate-350 transition-all cursor-pointer"
                  >
                    IGNORAR DIVERGÊNCIAS
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSavePrices} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
                {orcamento.etapas?.map((etapa: any) => (
                  <div key={etapa.id} className="space-y-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-l-2 border-[#1E3A8A] pl-2">{etapa.nome}</h4>
                    <div className="grid gap-2 pl-2">
                      {etapa.itens?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-700 truncate">{item.descricao}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.codigo || "Sem Código"} • Qtd: {item.quantidade} {item.unidade}</p>
                          </div>
                          <div className="w-40 flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-[#00BFA5] focus-within:border-transparent transition-all">
                            <span className="text-xs font-bold text-slate-400">R$</span>
                            <input 
                              type="text" 
                              className="w-full text-sm font-black text-slate-700 outline-none text-right"
                              placeholder="0,00"
                              value={pricesForm[item.id] || ""}
                              onChange={e => setPricesForm({
                                ...pricesForm,
                                [item.id]: e.target.value
                              })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFornecedor(null);
                    setDivergentItems([]);
                    setMappings({});
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPrices}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#00BFA5] text-white font-bold hover:shadow-lg hover:bg-[#00a892] transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingPrices ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar Cotação"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração do Relatório RFQ para Fornecedores */}
      {isRfqModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800">Gerar Relatório / RFQ para Fornecedores</h2>
                <p className="text-xs text-slate-500 mt-0.5">Selecione quais itens farão parte da folha de cotação.</p>
              </div>
              <button 
                onClick={() => setIsRfqModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternância de Modo de Seleção (Itens ou Etapas) */}
            <div className="flex gap-2 my-4 shrink-0 bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setRfqSelectionType("itens")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rfqSelectionType === "itens" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Selecionar por Itens
              </button>
              <button
                type="button"
                onClick={() => setRfqSelectionType("etapas")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rfqSelectionType === "etapas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Selecionar por Etapas
              </button>
            </div>

            {/* Corpo de Seleção com Scroll */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {rfqSelectionType === "itens" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Marcar / Desmarcar todos os itens da obra</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-[#00BFA5] focus:ring-[#00BFA5]"
                      checked={allItens.every((item: any) => selectedRfqItems[item.id])}
                      onChange={(e) => toggleSelectAllItems(e.target.checked)}
                    />
                  </div>
                  
                  {orcamento.etapas?.map((etapa: any) => (
                    <div key={etapa.id} className="space-y-2">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{etapa.nome}</h4>
                      <div className="grid gap-1.5 pl-1">
                        {etapa.itens?.map((item: any) => (
                          <label key={item.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-150 rounded-xl cursor-pointer transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-700 truncate">{item.descricao}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.codigo || "S/C"} • {item.quantidade} {item.unidade}</p>
                            </div>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-[#00BFA5] focus:ring-[#00BFA5] shrink-0 ml-4"
                              checked={!!selectedRfqItems[item.id]}
                              onChange={(e) => setSelectedRfqItems({ ...selectedRfqItems, [item.id]: e.target.checked })}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2">
                  {orcamento.etapas?.map((etapa: any) => (
                    <label key={etapa.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-black text-slate-700">{etapa.nome}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{etapa.itens?.length || 0} produtos vinculados</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-[#00BFA5] focus:ring-[#00BFA5] shrink-0 ml-4"
                        checked={!!selectedRfqEtapas[etapa.id]}
                        onChange={(e) => handleToggleEtapaSelection(etapa.id, e.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsRfqModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={generateRfqReport}
                className="flex-1 px-4 py-3 rounded-xl bg-[#00BFA5] text-white font-black hover:shadow-lg hover:bg-[#00a892] transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Gerar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
