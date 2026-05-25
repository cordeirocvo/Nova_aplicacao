import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
// @ts-ignore
import pdf from "pdf-parse";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.canEditBudgets && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  // ──── CASE 1: JSON BULK INSERT ──────────────────────────────────────────
  if (contentType.includes("application/json")) {
    try {
      const { items } = await req.json();
      if (!items || !Array.isArray(items)) {
        return NextResponse.json({ error: "Lista de itens inválida" }, { status: 400 });
      }

      // Validar e formatar cada item antes do bulk insert
      const formattedItems = items.map((item: any) => ({
        codigo: item.codigo ? String(item.codigo).trim() : null,
        descricao: String(item.descricao || "Item sem descrição").trim(),
        tipo: String(item.tipo || "Material").trim(),
        unidade: String(item.unidade || "un").trim(),
        precoBaseUnitario: item.precoBaseUnitario ? Number(item.precoBaseUnitario) : null
      }));

      // Inserção em massa no banco Postgres
      const result = await prisma.orcamentoItemPadrao.createMany({
        data: formattedItems,
        skipDuplicates: true // Ignora se houver duplicidade exata
      });

      return NextResponse.json({ success: true, count: result.count });
    } catch (error: any) {
      console.error("Erro ao importar itens no banco:", error);
      return NextResponse.json({ error: "Erro interno no servidor ao salvar itens" }, { status: 500 });
    }
  }

  // ──── CASE 2: FILE UPLOAD (HYBRID PDF EXTRACTION VIA GEMINI) ─────────────
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 1. Tentar extração de texto nativo com pdf-parse para economizar 99% de tokens e evitar 429
      let pdfText = "";
      let parsedSuccessfully = false;
      try {
        const parsedPdf = await pdf(buffer);
        pdfText = parsedPdf.text || "";
        if (pdfText.trim().length > 10) {
          parsedSuccessfully = true;
        }
      } catch (err) {
        console.warn("pdf-parse falhou ou retornou texto insuficiente. Usando fallback multimodal...", err);
      }

      // Inicializar o modelo Gemini
      const prompt = `Você é um engenheiro orçamentista sênior especialista em CAPEX e orçamentos para obras e projetos elétricos/solares.
Analise os dados técnicos, propostas técnicas, planilhas de custos ou listas de materiais fornecidos abaixo.
Extraia TODOS os itens de custos, insumos, materiais, mão de obra e equipamentos listados que contenham preços ou quantidades de referência.

Gere exatamente um array JSON contendo objetos com o formato do exemplo abaixo.
ATENÇÃO: Retorne APENAS o JSON cru. Não inclua bloco markdown (como \`\`\`json ou \`\`\`), explicações ou introdução. 

Formato JSON esperado:
[
  {
    "codigo": "string ou null (ex: 'CAB-SOLAR-01', ou null se não houver)",
    "descricao": "descrição clara e completa do item",
    "tipo": "Material ou Mão de Obra ou Equipamentos (deve classificar rigorosamente em um desses três)",
    "unidade": "unidade de medida abreviada (ex: 'un', 'm', 'kg', 'vb', 'h', 'par', ou 'un' por padrão se não houver)",
    "precoBaseUnitario": número (preço unitário, ex: 154.32, ou null se não houver no PDF)"
  }
]
`;

      let parsedItems = [];
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        let result;
        if (parsedSuccessfully) {
          // Enviar apenas o texto extraído (extremamente leve, rápido e livre de 429)
          const textPrompt = `${prompt}\n\nTexto extraído do PDF:\n${pdfText.slice(0, 45000)}`;
          result = await model.generateContent(textPrompt);
        } else {
          // Fallback Multimodal (para PDFs escaneados ou imagens)
          const base64 = buffer.toString("base64");
          result = await model.generateContent([
            { inlineData: { mimeType: file.type || "application/pdf", data: base64 } },
            prompt,
          ]);
        }

        const textResponse = result.response.text().trim();

        // Extrair o JSON caso haja qualquer wrapper markdown remanescente
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedItems = JSON.parse(jsonMatch[0]);
        } else {
          parsedItems = JSON.parse(textResponse);
        }
      } catch (geminiError) {
        console.warn("Erro na API do Gemini (limite de cota 429 ou similar). Utilizando fallback local...", geminiError);
        if (parsedSuccessfully && pdfText.trim().length > 10) {
          parsedItems = parsePdfFallback(pdfText);
        } else {
          throw geminiError;
        }
      }

      return NextResponse.json({ success: true, items: parsedItems });
    } catch (error: any) {
      console.error("Erro na extração de PDF via Gemini:", error);
      return NextResponse.json({ error: error?.message || "Falha ao processar o arquivo PDF" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Content-Type não suportado" }, { status: 400 });
}

// Resove a aglutinação matemática reversa (Q + Unit + Total) de preços
function solveTail(tail: string): { quantidade: number; precoUnitario: number; precoTotal: number } | null {
  tail = tail.replace(/\s/g, ""); // "433,49133,96"
  
  const commas = [];
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] === ",") commas.push(i);
  }
  
  if (commas.length < 2) return null;
  
  const lastComma = commas[commas.length - 1];
  const prevComma = commas[commas.length - 2];
  
  const totalEnd = lastComma + 3;
  const unitEnd = prevComma + 3;
  
  // Testar comprimentos da quantidade (Q) dinamicamente
  for (let qLen = 1; qLen <= tail.length - 10; qLen++) {
    const qStr = tail.slice(0, qLen);
    const qty = parseInt(qStr);
    if (isNaN(qty) || qty <= 0) continue;
    
    const unitStr = tail.slice(qLen, unitEnd).replace(",", ".");
    const unitVal = parseFloat(unitStr);
    if (isNaN(unitVal)) continue;
    
    const totalStr = tail.slice(unitEnd, totalEnd).replace(",", ".");
    const totalVal = parseFloat(totalStr);
    if (isNaN(totalVal)) continue;
    
    // Satisfação matemática estrita Q * Unit = Total
    if (Math.abs(qty * unitVal - totalVal) < 0.1) {
      return { quantidade: qty, precoUnitario: unitVal, precoTotal: totalVal };
    }
  }
  
  // Fallback baseado nas posições das vírgulas
  try {
    const totalStr = tail.slice(prevComma + 3).replace(",", ".");
    const totalVal = parseFloat(totalStr);
    
    const secondComma = prevComma;
    const firstComma = secondComma - 4 > 0 ? tail.lastIndexOf(",", secondComma - 1) : -1;
    
    let unitVal = totalVal;
    let qty = 1;
    
    if (firstComma !== -1) {
      const unitStr = tail.slice(firstComma + 3, secondComma + 3).replace(",", ".");
      unitVal = parseFloat(unitStr);
      const qtyStr = tail.slice(0, firstComma + 3 - unitStr.length);
      qty = parseInt(qtyStr) || 1;
    } else {
      const qtyStr = tail.slice(0, secondComma - 2);
      qty = parseInt(qtyStr) || 1;
    }
    
    return { quantidade: qty, precoUnitario: unitVal, precoTotal: totalVal };
  } catch (e) {
    return null;
  }
}

// Parser Fallback Local Robusto para PDFs Orçamentários
function parsePdfFallback(text: string): any[] {
  const items: any[] = [];
  
  // TIER 1: Advanced regex matcher for standard numbered detailed PDF lists
  try {
    // Regex que encontra itens numerados com código interno de 5 ou 6 dígitos
    const itemRegex = /(?:^|\n)(\d)(\d{5,6})([\s\S]*?)(?=(?:\n\d\d{5,6})|\nObservações:|\nTotal\d+Itens|$)/g;
    let match;
    
    while ((match = itemRegex.exec(text)) !== null) {
      const index = match[1];
      const codigo = match[2];
      const body = match[3].trim();
      
      // Encontrar NCM de 8 dígitos na sequência de dígitos
      const ncmMatch = body.match(/\d{8,15}/);
      let ncm = "";
      let textBeforeNcm = body;
      let textAfterNcm = "";
      
      if (ncmMatch) {
        ncm = ncmMatch[0].slice(-8);
        const ncmIndex = body.indexOf(ncmMatch[0]);
        textBeforeNcm = body.slice(0, ncmIndex).trim();
        textAfterNcm = body.slice(ncmIndex + ncmMatch[0].length).trim();
      }
      
      // Limpar a descrição
      const descricao = textBeforeNcm.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
      
      // Encontrar o tail numérico no final da linha
      const tailMatch = textAfterNcm.match(/[\d\.,\s]+$/);
      let marca = "";
      let afterNcmClean = textAfterNcm;
      
      if (tailMatch) {
        const tailStr = tailMatch[0];
        const tailIndex = textAfterNcm.lastIndexOf(tailStr);
        marca = textAfterNcm.slice(0, tailIndex).trim();
        afterNcmClean = tailStr.replace(/\s/g, "");
      }
      
      let quantidade = 1;
      let precoBaseUnitario: number | null = null;
      
      if (afterNcmClean) {
        const solved = solveTail(afterNcmClean);
        if (solved) {
          quantidade = solved.quantidade;
          precoBaseUnitario = solved.precoUnitario;
        }
      }
      
      // Classificação automática do tipo
      let tipo = "Material";
      const descLower = descricao.toLowerCase();
      if (descLower.includes("mão de obra") || descLower.includes("serviço") || descLower.includes("instalacao") || descLower.includes("montagem")) {
        tipo = "Mão de Obra";
      } else if (descLower.includes("inversor") || descLower.includes("quadro") || descLower.includes("modulo") || descLower.includes("painel") || descLower.includes("camera") || descLower.includes("disjuntor") || descLower.includes("canaleta") || descLower.includes("trilho")) {
        tipo = "Equipamento";
      }
      
      const finalDesc = marca ? `${descricao} (${marca})` : descricao;
      
      items.push({
        codigo: codigo,
        descricao: finalDesc,
        tipo: tipo,
        unidade: "un",
        precoBaseUnitario: precoBaseUnitario,
        quantidade: quantidade
      });
    }
  } catch (err) {
    console.error("Erro no parser avançado de PDF:", err);
  }
  
  if (items.length > 0) {
    return items;
  }
  
  // TIER 2: Line-by-line fallback parser (original)
  const lines = text.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    const ncmMatch = line.match(/\b\d{8}\b/);
    if (ncmMatch) {
      const ncm = ncmMatch[0];
      const ncmIndex = line.indexOf(ncm);
      
      const beforeNcm = line.slice(0, ncmIndex).trim();
      const afterNcm = line.slice(ncmIndex + 8).trim();
      
      const startNumbersMatch = beforeNcm.match(/^(\d+)/);
      let codigo = "";
      let descricao = beforeNcm;
      
      if (startNumbersMatch) {
        const fullNum = startNumbersMatch[1];
        if (fullNum.length > 3) {
          codigo = fullNum.slice(-5);
        } else {
          codigo = fullNum;
        }
        descricao = beforeNcm.slice(fullNum.length).trim();
      }
      
      const numberMatches = [...afterNcm.matchAll(/(\d+[\.,]\d{2})/g)].map(m => m[0]);
      let precoBaseUnitario: number | null = null;
      let quantidade = 1;
      
      if (numberMatches.length >= 2) {
        const totalStr = numberMatches[numberMatches.length - 1].replace(",", ".");
        const unitStr = numberMatches[numberMatches.length - 2].replace(",", ".");
        
        const totalVal = parseFloat(totalStr);
        const unitVal = parseFloat(unitStr);
        
        precoBaseUnitario = unitVal;
        
        const unitPriceStr = numberMatches[numberMatches.length - 2];
        const unitPriceIndex = afterNcm.indexOf(unitPriceStr);
        
        const beforeUnitPrice = afterNcm.slice(0, unitPriceIndex).trim();
        const qtyMatch = beforeUnitPrice.match(/(\d+)$/);
        if (qtyMatch) {
          quantidade = parseInt(qtyMatch[1]);
        } else if (unitVal > 0) {
          quantidade = Math.round(totalVal / unitVal);
        }
      } else if (numberMatches.length === 1) {
        precoBaseUnitario = parseFloat(numberMatches[0].replace(",", "."));
        quantidade = 1;
      }
      
      let tipo = "Material";
      const descLower = descricao.toLowerCase();
      if (descLower.includes("mão de obra") || descLower.includes("serviço") || descLower.includes("instalacao") || descLower.includes("montagem")) {
        tipo = "Mão de Obra";
      } else if (descLower.includes("inversor") || descLower.includes("quadro") || descLower.includes("modulo") || descLower.includes("painel") || descLower.includes("camera") || descLower.includes("disjuntor")) {
        tipo = "Equipamento";
      }
      
      items.push({
        codigo: codigo || null,
        descricao: descricao,
        tipo: tipo,
        unidade: "un",
        precoBaseUnitario: precoBaseUnitario,
        quantidade: quantidade
      });
    } else {
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length >= 4) {
        const desc = parts[0].trim();
        if (desc.toLowerCase().includes("descri") || desc.toLowerCase().includes("item") || desc.toLowerCase().includes("empresa") || desc.toLowerCase().includes("cnpj")) {
          continue;
        }
        
        const lastPart = parts[parts.length - 1].replace(/\s/g, "");
        const prevPart = parts[parts.length - 2].replace(/\s/g, "");
        const lastNumMatch = lastPart.match(/(\d+[\.,]\d{2})/);
        const prevNumMatch = prevPart.match(/(\d+[\.,]\d{2})/);
        
        if (lastNumMatch && prevNumMatch) {
          const totalVal = parseFloat(lastNumMatch[0].replace(",", "."));
          const unitVal = parseFloat(prevNumMatch[0].replace(",", "."));
          
          let precoBaseUnitario = unitVal;
          let quantidade = 1;
          if (unitVal > 0) {
            quantidade = Math.round(totalVal / unitVal);
          }
          
          const startNum = desc.match(/^(\d+)/);
          let codigo = "";
          let finalDesc = desc;
          if (startNum) {
            codigo = startNum[1];
            finalDesc = desc.slice(codigo.length).trim();
          }
          
          let tipo = "Material";
          const descLower = finalDesc.toLowerCase();
          if (descLower.includes("mão de obra") || descLower.includes("serviço") || descLower.includes("instalacao") || descLower.includes("montagem")) {
            tipo = "Mão de Obra";
          } else if (descLower.includes("inversor") || descLower.includes("quadro") || descLower.includes("modulo") || descLower.includes("painel") || descLower.includes("camera") || descLower.includes("disjuntor")) {
            tipo = "Equipamento";
          }
          
          items.push({
            codigo: codigo || null,
            descricao: finalDesc,
            tipo: tipo,
            unidade: "un",
            precoBaseUnitario: precoBaseUnitario,
            quantidade: quantidade
          });
        }
      }
    }
  }
  
  return items;
}
