const fs = require('fs');

const filePath = 'c:/Users/BRUNO CORDEIRO/.gemini/antigravity/scratch/cordeiro-energia/src/app/engenharia/solar/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const detailCardCode = `
                        {/* Detalhes do Inversor Selecionado */}
                        {!isCustomInversor && config.selectedInversorId && (
                          (() => {
                            const inv = inversores.find(i => i.id === config.selectedInversorId);
                            if (!inv) return null;
                            return (
                              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 mt-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3 text-[#00BFA5]" /> Especificações Técnicas
                                  </h4>
                                  <div className="w-2 h-2 rounded-full bg-[#00BFA5] animate-pulse" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[8px] text-white/30 uppercase font-black">Potência CA</p>
                                    <p className="text-xs font-bold text-white tracking-wide">{inv.potenciaNominalKW} kW</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-white/30 uppercase font-black">MPPTs / Strings</p>
                                    <p className="text-xs font-bold text-white tracking-wide">{inv.numeroStringsMPPT || 2} / {inv.numeroStringsMPPT || 2}</p>
                                  </div>
                                  <div className="col-span-2 py-2 border-t border-white/5 space-y-1">
                                     <div className="flex justify-between">
                                        <span className="text-[8px] text-white/30 uppercase">Tensão Ent. CC</span>
                                        <span className="text-[10px] text-white font-medium">{inv.tensaoEntradaMinV || 100}V — {inv.tensaoEntradaMaxV || 1000}V</span>
                                     </div>
                                     <div className="flex justify-between">
                                        <span className="text-[8px] text-white/30 uppercase">Corr. Máx. CC (A)</span>
                                        <span className="text-[10px] text-white font-medium">{inv.correnteMaxCC || 12.5}A </span>
                                     </div>
                                     <div className="flex justify-between">
                                        <span className="text-[8px] text-white/30 uppercase">Fator Pot. / Efic.</span>
                                        <span className="text-[10px] text-white font-medium">{inv.fatorPotencia || 1.0} / {((inv.eficiencia || 0.98)*100).toFixed(1)}%</span>
                                     </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        )}`;

if (!content.includes('Especificações Técnicas')) {
  // Padrão de busca mais seguro: o fechamento do bloco de sugestões
  const pattern = /<\/div>\s+\)\s+}\s+<\/div>/; 
  // Isso corresponde a:
  // </div> (do card de sugestão)
  // ) (do if calculado.sugestoes.length > 0)
  // }
  // </div> (que fecha o seletor de inversor)
  
  // Vamos usar o fechamento do seletor de inversor como âncora
  content = content.replace(/<\/div>\s+\)\s+}\s+<\/div>/, '</div>\n)\n}\n' + detailCardCode + '\n</div>');
}

fs.writeFileSync(filePath, content);
console.log('Inverter technical details card injected!');
