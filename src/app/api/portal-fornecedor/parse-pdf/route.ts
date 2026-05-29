import { NextResponse } from "next/server";
import axios from "axios";
// @ts-ignore
import pdf from "pdf-parse";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ error: "Chave do Gemini ausente" }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Extrair texto do PDF usando o pdf-parse
    const pdfData = await pdf(buffer);
    const extractedText = pdfData.text;

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({ error: "Não foi possível extrair texto do PDF. O PDF pode estar em formato de imagem." }, { status: 400 });
    }

    // 2. Enviar texto para o Gemini extrair os itens
    const prompt = `
Você é uma inteligência artificial especialista em análise de propostas comerciais de fornecedores.
Abaixo está o texto extraído de um arquivo PDF de orçamento comercial.
Extraia todos os itens de insumos, materiais ou serviços orçados, com suas respectivas quantidades e preços unitários.
Ignore informações de impostos globais, cabeçalhos, rodapés e condições de pagamento que não representem itens da matriz.

Retorne EXCLUSIVAMENTE um array JSON contendo objetos no seguinte formato, sem formatação markdown (como \`\`\`json) e sem explicações de texto adicionais:
[
  { "descricao": "Nome exato ou completo do item no PDF", "quantidade": 1.0, "precoUnitario": 150.00 }
]

Texto do PDF:
---
${extractedText}
---
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extrair o array JSON de dentro da resposta do Gemini
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("Retorno da IA:", responseText);
      return NextResponse.json({ error: "Falha ao estruturar os dados do PDF." }, { status: 500 });
    }

    const parsedItems = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, items: parsedItems });
  } catch (error: any) {
    console.error("Erro ao analisar PDF:", error);
    return NextResponse.json({ error: "Erro interno ao processar cotação em PDF." }, { status: 500 });
  }
}
