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
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
      let parsedItems = [];
      if (jsonMatch) {
        parsedItems = JSON.parse(jsonMatch[0]);
      } else {
        parsedItems = JSON.parse(textResponse);
      }

      return NextResponse.json({ success: true, items: parsedItems });
    } catch (error: any) {
      console.error("Erro na extração de PDF via Gemini:", error);
      return NextResponse.json({ error: error?.message || "Falha ao processar o arquivo PDF" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Content-Type não suportado" }, { status: 400 });
}
