"use client";

import React, { useState, useRef } from "react";
import {
  Printer,
  X,
  Copy,
  Check,
  FileText,
  Package,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar
} from "lucide-react";
import { ItemMaterialSugerido, DisjuntorSopranoInfo, BarramentoCopperbarrasInfo } from "@/lib/cemig/padraoEngine";

export interface CotacaoDistribuidoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  dadosPadrao: {
    clienteNome?: string;
    clienteTelefone?: string;
    clienteEmail?: string;
    cidade?: string;
    endereco?: string;
    tipoPadrao: string;
    faixaDemanda?: string;
    disjuntorAmperes: number;
    categoriaDemanda?: string;
    tipoSaida?: string;
    localizacao?: string;
    ladoRede?: string;
    caixaMedicao?: string;
    caixaDisjuntor?: string;
    tipoCaixaSubterranea?: string;
    posteHomologado?: string;
    sopranoInfo?: DisjuntorSopranoInfo;
    barramentoCM18Info?: BarramentoCopperbarrasInfo;
    tipoTerminalDisjuntor?: string;
    usaTerminalBandeira?: boolean;
    observacoes?: string;
  };
  itens: ItemMaterialSugerido[];
}

export default function CotacaoDistribuidoresModal({
  isOpen,
  onClose,
  dadosPadrao,
  itens
}: CotacaoDistribuidoresModalProps) {
  // Modo de exibição: "COTACAO" (campos em branco para preenchimento pelo lojista) ou "REFERENCIA" (preços médios do sistema)
  const [modoExibicao, setModoExibicao] = useState<"COTACAO" | "REFERENCIA">("COTACAO");
  const [copiado, setCopiado] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Filtrar estritamente itens que NÃO são serviço (remove MAO_DE_OBRA e códigos iniciando com SRV-)
  const materiaisApenas = itens.filter(
    (it) => it.categoria !== "MAO_DE_OBRA" && !it.codigo.startsWith("SRV-")
  );

  const totalQuantidadeItens = materiaisApenas.reduce((acc, curr) => acc + curr.quantidade, 0);
  const subtotalReferencia = materiaisApenas.reduce((acc, curr) => acc + curr.precoTotal, 0);

  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const validadeData = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    const refNome = (dadosPadrao.clienteNome || "CEMIG").replace(/[^a-zA-Z0-9_-]/g, "_");
    document.title = `Lista_Materiais_${refNome}_${dadosPadrao.disjuntorAmperes}A_Cotacao`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleCopiarTexto = () => {
    const linhas: string[] = [];
    linhas.push(`*CORDEIRO ENERGIA - LISTA DE MATERIAIS PARA COTAÇÃO*`);
    linhas.push(`Data: ${new Date().toLocaleDateString("pt-BR")}`);
    linhas.push(`Obra/Ref: ${dadosPadrao.clienteNome || "Padrão de Entrada CEMIG"}`);
    linhas.push(`Padrão: ${dadosPadrao.tipoPadrao === "BIFASICO" ? "Bifásico" : "Trifásico"} ${dadosPadrao.disjuntorAmperes}A (CEMIG ND 5.1)`);
    linhas.push(``);
    linhas.push(`*LISTA DE MATERIAIS:*`);
    materiaisApenas.forEach((m, idx) => {
      linhas.push(`${idx + 1}. [${m.quantidade} ${m.unidade}] ${m.descricao} (Cód: ${m.codigo})`);
    });

    navigator.clipboard.writeText(linhas.join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div
      id="printable-cotacao-distribuidor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:m-0 print:static print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
    >
      {/* Estilos específicos de impressão para A4 com cores fiéis e isolamento estrito */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 6mm 8mm 6mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-hide,
            .print\\:hidden {
              display: none !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .break-inside-avoid {
              break-inside: avoid !important;
            }
          }
        `
        }}
      />

      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto border border-slate-200 print:border-none print:shadow-none print:max-h-none print:w-full print:max-w-none print:rounded-none print:overflow-visible print:block print:m-0 print:p-0">
        
        {/* Barra Superior de Ações (Oculta na Impressão) */}
        <div className="p-4 bg-[#0A192F] text-white flex flex-col sm:flex-row items-center justify-between gap-3 print-hide print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black uppercase px-2.5 py-1 bg-[#E45318] text-white rounded-md shadow-sm flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Lista de Materiais
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Envio para Lojas e Distribuidores de Materiais Elétricos
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle de Modo Cotação / Referência */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center text-[11px] font-bold border border-slate-700">
              <button
                type="button"
                onClick={() => setModoExibicao("COTACAO")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  modoExibicao === "COTACAO"
                    ? "bg-[#E45318] text-white shadow-sm font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Modo Cotação (Em Branco)
              </button>
              <button
                type="button"
                onClick={() => setModoExibicao("REFERENCIA")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  modoExibicao === "REFERENCIA"
                    ? "bg-[#00B356] text-white shadow-sm font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Modo Referência (C/ Preços)
              </button>
            </div>

            {/* Botão Copiar WhatsApp */}
            <button
              type="button"
              onClick={handleCopiarTexto}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              title="Copiar lista de texto para WhatsApp ou e-mail"
            >
              {copiado ? <Check className="w-4 h-4 text-[#00B356]" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado!" : "Copiar Texto"}
            </button>

            {/* Botão Imprimir PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#E45318] hover:bg-[#c94512] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR / SALVAR PDF
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── CORPO IMPRIMÍVEL DO DOCUMENTO (SOMENTE LISTA DE MATERIAIS) ───────────── */}
        <div
          ref={printRef}
          id="printable-cotacao-distribuidor"
          className="p-8 md:p-10 overflow-y-auto flex-1 bg-white print:p-0 print:m-0 print:w-full print:overflow-visible font-sans text-slate-800"
        >
          
          {/* Cabeçalho Institucional Cordeiro Energia */}
          <div className="flex justify-between items-start border-b-2 border-[#0A192F] pb-4 mb-4">
            <div className="flex items-center gap-4">
              {/* Logo Oficial Cordeiro Energia */}
              <div className="h-14 w-auto flex items-center">
                <img
                  src="/logo.svg"
                  alt="Cordeiro Energia"
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div>
                <h1 className="text-lg font-black text-[#0A192F] tracking-tight">CORDEIRO ENERGIA</h1>
                <p className="text-xs font-bold text-[#E45318] uppercase tracking-wider">
                  Engenharia Elétrica & Mobilidade Sustentável
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Belo Horizonte - Minas Gerais | compras@cordeiroenergia.com.br
                </p>
              </div>
            </div>

            {/* Identificação da Cotação */}
            <div className="text-right">
              <span className="inline-block bg-[#0A192F] text-white font-mono text-xs font-black px-3 py-1 rounded-lg mb-1 border-b-2 border-[#E45318]">
                RFQ-CEMIG-{dadosPadrao.disjuntorAmperes}A-{new Date().getFullYear()}
              </span>
              <p className="text-[11px] text-slate-500">
                Data: <strong className="text-slate-800">{dataAtual}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Validade Solicitada: <strong className="text-[#00B356]">{validadeData} (5 dias úteis)</strong>
              </p>
            </div>
          </div>

          {/* Faixa Compacta de Identificação da Obra / Referência (Sem Textos Analíticos) */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-[#F8FAFC] px-4 py-2.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Obra / Referência: </span>
              <strong className="text-slate-900">{dadosPadrao.clienteNome || "Padrão de Entrada CEMIG"}</strong>
              {dadosPadrao.cidade && <span className="text-slate-600"> ({dadosPadrao.cidade})</span>}
            </div>

            <div>
              <span className="text-slate-500 font-medium">Padrão: </span>
              <strong className="text-[#E45318]">
                {dadosPadrao.tipoPadrao === "BIFASICO" ? "Bifásico" : "Trifásico"} {dadosPadrao.disjuntorAmperes}A
                {dadosPadrao.faixaDemanda ? ` (Faixa ${dadosPadrao.faixaDemanda})` : ""} - CEMIG ND 5.1
              </strong>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Total de Materiais: </span>
              <strong className="text-[#00B356]">{materiaisApenas.length} itens físicos</strong>
            </div>
          </div>

          {/* Tabela de Materiais (Sem Serviços e Sem Textos de Análise Técnica) */}
          <div className="mb-4">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#0A192F] text-white font-black text-[10px] uppercase">
                  <th className="p-2 border border-slate-400 w-10 text-center">Item</th>
                  <th className="p-2 border border-slate-400 w-28">Cód. / Ref.</th>
                  <th className="p-2 border border-slate-400">Material / Equipamento</th>
                  <th className="p-2 border border-slate-400 w-24 text-center">Categoria</th>
                  <th className="p-2 border border-slate-400 w-14 text-center">Unid.</th>
                  <th className="p-2 border border-slate-400 w-14 text-right">Qtd.</th>
                  {modoExibicao === "COTACAO" ? (
                    <>
                      <th className="p-2 border border-slate-400 w-32 text-center bg-slate-800">Marca Cotada</th>
                      <th className="p-2 border border-slate-400 w-28 text-right bg-slate-800">Preço Unit. (R$)</th>
                      <th className="p-2 border border-slate-400 w-28 text-right bg-slate-800">Total (R$)</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 border border-slate-400 w-28 text-right bg-slate-800">Preço Ref. (R$)</th>
                      <th className="p-2 border border-slate-400 w-28 text-right bg-slate-800">Subtotal (R$)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {materiaisApenas.map((m, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}
                    style={{ pageBreakInside: "avoid" }}
                  >
                    <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-500">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="p-2 border border-slate-300 font-mono text-[10px] text-slate-700 font-bold">
                      {m.codigo}
                    </td>
                    <td className="p-2 border border-slate-300">
                      <span className="font-bold text-slate-900 block leading-tight">{m.descricao}</span>
                    </td>
                    <td className="p-2 border border-slate-300 text-center">
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {m.categoria}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">{m.unidade}</td>
                    <td className="p-2 border border-slate-300 text-right font-black text-sm text-[#0A192F]">
                      {m.quantidade}
                    </td>

                    {modoExibicao === "COTACAO" ? (
                      <>
                        <td className="p-2 border border-slate-300 text-center text-slate-300 text-[10px] italic">
                          ........................
                        </td>
                        <td className="p-2 border border-slate-300 text-right text-slate-300 text-[10px] italic">
                          R$ _________
                        </td>
                        <td className="p-2 border border-slate-300 text-right text-slate-300 text-[10px] italic">
                          R$ _________
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border border-slate-300 text-right text-slate-600 font-medium">
                          {m.precoUnitarioEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-black text-slate-900">
                          {m.precoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumo e Fechamento da Cotação (Compacto) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t-2 border-slate-300 pt-3 mb-4 break-inside-avoid">
            <div className="text-[10px] text-slate-500 space-y-1">
              <p className="font-black text-[#0A192F] uppercase text-xs">Instruções para o Fornecedor:</p>
              <p>• Todos os materiais elétricos devem possuir homologação formal da CEMIG (ND 5.1 / PEC-11).</p>
              <p>• Informar marcas cotadas, prazo de entrega no canteiro da obra e condições de pagamento.</p>
              <p>• Enviar proposta preenchida para: <strong>compras@cordeiroenergia.com.br</strong>.</p>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-700">
                <span>Total de Itens Físicos:</span>
                <span className="font-bold">{materiaisApenas.length} itens ({totalQuantidadeItens} un.)</span>
              </div>

              {modoExibicao === "REFERENCIA" ? (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900 font-black">
                  <span>Subtotal Referência (Estimado):</span>
                  <span className="text-base text-[#00B356]">
                    {subtotalReferencia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Total Ofertado pela Loja:</span>
                    <span className="font-bold text-slate-700">R$ _________________</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prazo de Entrega Estimado:</span>
                    <span className="font-bold text-slate-700">_____ dias úteis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Condições de Pagamento:</span>
                    <span className="font-bold text-slate-700">_________________</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bloco de Assinaturas e Carimbo */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-center text-xs break-inside-avoid">
            <div>
              <div className="border-b border-slate-400 mb-1.5 w-3/4 mx-auto" />
              <p className="font-black text-[#0A192F] text-[11px]">CORDEIRO ENERGIA</p>
              <p className="text-[10px] text-slate-500">Compras & Suprimentos</p>
            </div>

            <div>
              <div className="border-b border-slate-400 mb-1.5 w-3/4 mx-auto" />
              <p className="font-black text-slate-800 text-[11px]">LOJA / DISTRIBUIDORA DE MATERIAIS</p>
              <p className="text-[10px] text-slate-500">Vendedor / Carimbo Comercial</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
