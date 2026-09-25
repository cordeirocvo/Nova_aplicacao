"use client";

import React, { useRef } from "react";
import { Printer, Download, X, Zap, ShieldCheck, CheckCircle2, Building2, MapPin, Phone, Mail, Calendar, FileText } from "lucide-react";

interface PropostaModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposta: {
    numeroProposta: string;
    clienteNome: string;
    clienteTelefone?: string;
    clienteEmail?: string;
    clienteDocumento?: string;
    cidade?: string;
    endereco?: string;
    finalidade: string;
    potenciaCarregadorKW?: number;
    modeloCarregador?: string;
    tipoPadrao: string;
    disjuntorAmperes: number;
    faixaDemanda: string;
    ladoRede: string;
    tipoSaida?: string;
    localizacao?: string;
    caixaMedicao?: string;
    tipoEstrutura: string;
    posteHomologado?: string;
    caboEntrada?: string;
    eletroduto?: string;
    hastesQtde?: number;
    valorMateriais: number;
    valorMaoDeObra: number;
    bdiMargem: number;
    valorDesconto: number;
    valorTotal: number;
    observacoes?: string;
    itens: {
      codigo?: string;
      descricao: string;
      categoria?: string;
      unidade: string;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    }[];
  };
}

export default function PropostaModal({ isOpen, onClose, proposta }: PropostaModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const validadeData = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const isBifasico = proposta.tipoPadrao === "BIFASICO";
  const aFavor = proposta.ladoRede === "MESMO_LADO" || proposta.ladoRede === "A_FAVOR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto border border-slate-200">
        
        {/* Barra Superior de Ações (oculta na impressão) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase px-2.5 py-1 bg-[#00BFA5]/20 text-[#00BFA5] rounded-md border border-[#00BFA5]/30">
              Proposta Comercial & CAPEX
            </span>
            <span className="text-sm font-bold text-slate-300">
              {proposta.numeroProposta || "PROP-CEMIG"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-[#00BFA5] hover:bg-[#009688] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR / SALVAR PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Imprimível */}
        <div className="p-8 md:p-12 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible" id="printable-proposta">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[#00BFA5] font-black text-xl shadow-sm">
                  CE
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">CORDEIRO ENERGIA</h1>
                  <p className="text-xs font-bold text-[#00BFA5] uppercase tracking-wider">Engenharia Elétrica & Mobilidade Sustentável</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                CNPJ: Especialistas em Infraestrutura de Recarga e Padrões CEMIG ND 5.1<br />
                Belo Horizonte - Minas Gerais | contato@cordeiroenergia.com.br
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block bg-slate-100 text-slate-900 font-mono text-xs font-black px-3 py-1.5 rounded-lg border border-slate-300 mb-1">
                {proposta.numeroProposta || "PROP-CEMIG-001"}
              </span>
              <p className="text-xs text-slate-500">Emissão: <strong className="text-slate-700">{dataAtual}</strong></p>
              <p className="text-xs text-slate-500">Validade da Proposta: <strong className="text-emerald-700">{validadeData} (15 dias)</strong></p>
            </div>
          </div>

          {/* Dados do Cliente e Local */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">DADOS DO CLIENTE / PROPONENTE</p>
              <p className="text-sm font-black text-slate-900">{proposta.clienteNome}</p>
              {proposta.clienteDocumento && <p className="text-slate-600">CPF/CNPJ: {proposta.clienteDocumento}</p>}
              {proposta.clienteTelefone && <p className="text-slate-600">Telefone / WhatsApp: {proposta.clienteTelefone}</p>}
              {proposta.clienteEmail && <p className="text-slate-600">E-mail: {proposta.clienteEmail}</p>}
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">LOCAL DA INSTALAÇÃO & FINALIDADE</p>
              <p className="text-sm font-bold text-slate-900">{proposta.cidade || "Minas Gerais"}</p>
              {proposta.endereco && <p className="text-slate-600">Endereço: {proposta.endereco}</p>}
              <p className="text-slate-700 font-medium mt-1">
                Finalidade: <span className="font-bold text-[#009688]">
                  {proposta.finalidade === "CARREGADOR_VE"
                    ? `Posto de Carregamento Veicular (Capex EV${proposta.potenciaCarregadorKW ? ` - ${proposta.potenciaCarregadorKW} kW` : ""})`
                    : proposta.finalidade === "AUMENTO_CARGA"
                    ? "Aumento de Carga / Reforma Padrão CEMIG"
                    : "Padrão de Entrada Geral"}
                </span>
              </p>
              {proposta.modeloCarregador && (
                <p className="text-slate-600">Equipamento de Recarga: <strong>{proposta.modeloCarregador}</strong></p>
              )}
            </div>
          </div>

          {/* Especificações Técnicas CEMIG ND 5.1 */}
          <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase flex items-center justify-between">
              <span>Especificações Técnicas da Entrada de Serviço (Norma CEMIG ND 5.1)</span>
              <span className="text-[#00BFA5]">127/220V - 60 Hz</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/50 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Tipo / Categoria</span>
                <span className="text-sm font-black text-slate-900">
                  {isBifasico ? "Bifásico (Faixa B1)" : `Trifásico (${proposta.faixaDemanda || "C"})`}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Disjuntor Geral IEC</span>
                <span className="text-sm font-black text-emerald-700">
                  {proposta.disjuntorAmperes} A (Curva C)
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Posição da Rede</span>
                <span className="text-sm font-black text-slate-800">
                  {aFavor ? "A Favor (Mesmo Lado)" : "Contra (Lado Oposto)"}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Saída / Local</span>
                <span className="text-sm font-black text-slate-800">
                  {proposta.tipoSaida === "SUBTERRANEA" ? "Subterrânea" : "Aérea"} | {proposta.localizacao === "RURAL" ? "Rural" : "Urbana"}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Poste Homologado</span>
                <span className="text-sm font-black text-blue-700">
                  {proposta.posteHomologado || "PC1"}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Condutores Entrada</span>
                <span className="text-sm font-black text-slate-900">
                  {proposta.caboEntrada || "16 mm²"}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Aterramento CEMIG</span>
                <span className="text-sm font-black text-slate-900">
                  {proposta.hastesQtde || 2} Haste(s) Galvanizada(s)
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Caixa de Medição</span>
                <span className="text-sm font-black text-slate-900">
                  {proposta.caixaMedicao || (proposta.disjuntorAmperes >= 150 ? "CM-3 (Indireta)" : "CM-14 (Direta)")}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela Discriminada de Materiais e Capex */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Planilha Orçamentária Discriminada de Materiais e Instalação (CAPEX)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {proposta.itens.length} itens orçados
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-300">
                  <th className="p-2 border border-slate-200 w-12 text-center">Item</th>
                  <th className="p-2 border border-slate-200">Descrição do Material / Serviço</th>
                  <th className="p-2 border border-slate-200 w-16 text-center">Unid.</th>
                  <th className="p-2 border border-slate-200 w-16 text-right">Qtd.</th>
                  <th className="p-2 border border-slate-200 w-28 text-right">Preço Unit.</th>
                  <th className="p-2 border border-slate-200 w-28 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proposta.itens.map((it, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="p-2 border border-slate-200 text-center font-mono text-slate-400">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="p-2 border border-slate-200">
                      <span className="font-bold text-slate-800">{it.descricao}</span>
                      {it.codigo && (
                        <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {it.codigo}
                        </span>
                      )}
                    </td>
                    <td className="p-2 border border-slate-200 text-center text-slate-600">{it.unidade}</td>
                    <td className="p-2 border border-slate-200 text-right font-black text-slate-800">{it.quantidade}</td>
                    <td className="p-2 border border-slate-200 text-right text-slate-600">
                      {it.precoUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="p-2 border border-slate-200 text-right font-black text-slate-900">
                      {it.precoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumo Financeiro & Totais */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-200 pt-4 mb-8">
            <div className="text-xs text-slate-500 max-w-md space-y-1">
              <p className="font-bold text-slate-800 uppercase">Observações & Condições Gerais:</p>
              <p>• Todos os materiais cotados são rigorosamente homologados pela concessionária CEMIG (PEC-11).</p>
              <p>• Instalação em conformidade com as normas ABNT NBR 5410, NBR 17019 e CEMIG ND 5.1.</p>
              <p>• Prazos: Entrega de materiais em até 5 dias úteis; Montagem e pedido de ligação em 3 dias úteis.</p>
              {proposta.observacoes && <p className="font-medium text-slate-700 mt-2">Nota: {proposta.observacoes}</p>}
            </div>

            <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal de Materiais:</span>
                <span className="font-bold">
                  {proposta.valorMateriais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>

              {proposta.valorMaoDeObra > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Mão de Obra e ART:</span>
                  <span className="font-bold">
                    {proposta.valorMaoDeObra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              )}

              {proposta.bdiMargem > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Margem / BDI ({proposta.bdiMargem}%):</span>
                  <span className="font-bold">
                    {(((proposta.valorMateriais + proposta.valorMaoDeObra) * proposta.bdiMargem) / 100).toLocaleString(
                      "pt-BR",
                      { style: "currency", currency: "BRL" }
                    )}
                  </span>
                </div>
              )}

              {proposta.valorDesconto > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Desconto Comercial:</span>
                  <span>- {proposta.valorDesconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}

              <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm">
                <span className="font-black text-slate-900 uppercase">INVESTIMENTO TOTAL:</span>
                <span className="text-lg font-black text-emerald-600">
                  {proposta.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          </div>

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-12 pt-8 mt-6 border-t border-slate-200 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 mb-2 w-3/4 mx-auto" />
              <p className="font-bold text-slate-800">CORDEIRO ENERGIA</p>
              <p className="text-[11px] text-slate-500">Engenharia e Gestão Técnica</p>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-2 w-3/4 mx-auto" />
              <p className="font-bold text-slate-800">{proposta.clienteNome}</p>
              <p className="text-[11px] text-slate-500">De acordo do Cliente</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
