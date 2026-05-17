import { BarChart, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

export default function EqualizacaoTab({ orcamento }: { orcamento: any }) {
  // Extrair todos os itens de todas as etapas para formar as linhas da matriz
  const allItens = orcamento.etapas?.flatMap((e: any) => e.itens) || [];
  
  // Extrair fornecedores que responderam
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

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <BarChart className="w-5 h-5 text-[#00BFA5]" /> Mapa de Coleta e Equalização
        </h2>
        <p className="text-sm text-slate-500 mt-1">Comparativo lado a lado das propostas recebidas vs. orçamento base.</p>
      </div>

      {fornecedoresAtivos.length === 0 ? (
        <div className="text-center p-10 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
          <BarChart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aguardando Propostas</p>
          <p className="text-xs text-slate-400 mt-1">Nenhum fornecedor enviou preços ainda. O mapa será gerado automaticamente.</p>
        </div>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orçamento Base (Meta)</p>
              <h3 className="text-2xl font-black text-slate-800">
                R$ {totalBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {fornecedoresAtivos.map((fo: any) => {
              const totalFornecedor = calcularTotalFornecedor(fo.fornecedorId);
              const diff = totalBase > 0 ? ((totalBase - totalFornecedor) / totalBase) * 100 : 0;
              const isSaving = diff >= 0;

              return (
                <div key={fo.id} className={`border p-5 rounded-2xl ${isSaving ? "bg-[#00BFA5]/10 border-[#00BFA5]/30" : "bg-red-50 border-red-200"}`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate" title={fo.fornecedor.razaoSocial}>
                    {fo.fornecedor.razaoSocial}
                  </p>
                  <h3 className="text-2xl font-black text-slate-800">
                    R$ {totalFornecedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </h3>
                  <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${isSaving ? "text-[#00BFA5]" : "text-red-500"}`}>
                    {isSaving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {Math.abs(diff).toFixed(1)}% {isSaving ? "Saving" : "Acima"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matriz de Preços */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4 sticky left-0 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 w-64">Item</th>
                  <th className="px-6 py-4 text-center">Qtd</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200">Preço Base</th>
                  {fornecedoresAtivos.map((fo: any) => (
                    <th key={fo.id} className="px-6 py-4 text-right bg-blue-50/50">
                      <div className="truncate w-32 ml-auto" title={fo.fornecedor.razaoSocial}>
                        {fo.fornecedor.razaoSocial}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allItens.map((item: any) => {
                  const custoBase = item.precoBaseUnitario || 0;
                  
                  // Calcular média das propostas válidas (maiores que zero)
                  const precosValidos = fornecedoresAtivos
                    .map((fo: any) => item.propostas?.find((p: any) => p.fornecedorId === fo.fornecedorId)?.precoUnitario || 0)
                    .filter((p: number) => p > 0);
                  
                  const mediaPrecos = precosValidos.length > 0 
                    ? precosValidos.reduce((a: number, b: number) => a + b, 0) / precosValidos.length 
                    : 0;
                  
                  const menorPreco = precosValidos.length > 0 ? Math.min(...precosValidos) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">
                        <p className="font-semibold text-slate-700 truncate w-64" title={item.descricao}>{item.descricao}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.codigo || "S/C"}</p>
                      </td>
                      <td className="px-6 py-3 text-center font-black text-slate-600">{item.quantidade} <span className="text-[10px] font-normal text-slate-400">{item.unidade}</span></td>
                      <td className="px-6 py-3 text-right font-medium text-slate-500 border-r border-slate-200">
                        {custoBase > 0 ? `R$ ${custoBase.toFixed(2)}` : "-"}
                      </td>
                      
                      {fornecedoresAtivos.map((fo: any) => {
                        const proposta = item.propostas?.find((p: any) => p.fornecedorId === fo.fornecedorId);
                        const preco = proposta?.precoUnitario || 0;
                        
                        // Detectar Outlier (> 40% do desvio da média ou da base)
                        const isOutlierHigh = (mediaPrecos > 0 && preco > mediaPrecos * 1.4) || (custoBase > 0 && preco > custoBase * 1.5);
                        const isOutlierLow = preco > 0 && ((mediaPrecos > 0 && preco < mediaPrecos * 0.6) || (custoBase > 0 && preco < custoBase * 0.5));
                        const isLowest = preco > 0 && preco === menorPreco;

                        return (
                          <td key={fo.id} className={`px-6 py-3 text-right relative group ${isLowest ? "bg-[#00BFA5]/5" : ""}`}>
                            {preco > 0 ? (
                              <div className="flex items-center justify-end gap-2">
                                {isLowest && (
                                  <span className="text-[9px] font-black text-[#00BFA5] border border-[#00BFA5]/30 px-1.5 rounded uppercase tracking-tighter">Melhor</span>
                                )}
                                {(isOutlierHigh || isOutlierLow) && (
                                  <span title={isOutlierHigh ? "Preço muito acima da média" : "Preço muito abaixo da média"}>
                                    <AlertTriangle className={`w-3 h-3 ${isOutlierHigh ? "text-red-400" : "text-amber-400"}`} />
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
