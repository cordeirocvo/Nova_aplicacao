import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
// @ts-ignore
import pdf from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name || "orcamento";
    const mimeType = file.type || (fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

    // 1. Salvar arquivo localmente para auditoria e histórico
    let arquivoUrl: string | null = null;
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "orcamentos");
      await fs.mkdir(uploadDir, { recursive: true });
      const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const uniqueFileName = `${Date.now()}_${safeName}`;
      await fs.writeFile(path.join(uploadDir, uniqueFileName), buffer);
      arquivoUrl = `/uploads/orcamentos/${uniqueFileName}`;
    } catch (saveErr) {
      console.warn("Aviso: Não foi possível salvar arquivo localmente:", saveErr);
    }

    // 2. Extração de texto preliminar se for PDF nativo
    let pdfText = "";
    let parsedWithPdfParse = false;
    if (fileName.toLowerCase().endsWith(".pdf")) {
      try {
        const parsed = await pdf(buffer);
        pdfText = parsed.text || "";
        if (pdfText.trim().length > 20) {
          parsedWithPdfParse = true;
        }
      } catch (err) {
        console.warn("pdf-parse não conseguiu extrair texto. Usando extração multimodal Gemini:", err);
      }
    }

    // 3. Processamento com Gemini Vision Multimodal
    const rawKey = process.env.GEMINI_API_KEY || "";
    const cleanApiKey = rawKey.replace(/^["']|["']$/g, "").trim();

    if (!cleanApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const client = new GoogleGenerativeAI(cleanApiKey);
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest",
      "gemini-1.5-flash"
    ];

    const prompt = `Você é um engenheiro eletricista sênior especialista em suprimentos, orçamentos e cotações de materiais elétricos (normas CEMIG, média e baixa tensão, infraestrutura de eletromobilidade e engenharia solar).
Analise com extrema precisão este documento de orçamento comercial / pedido de cotação de materiais (pode ser PDF ou imagem/foto).

DIRETRIZES DE EXTRAÇÃO:
1. Identifique os dados do FORNECEDOR / EMITENTE:
   - razaoSocial: Nome fantasia ou Razão Social da empresa vendedora (ex: "UNIVERSO ELETRICO LTDA").
   - cnpj: CNPJ formatado ou apenas dígitos.
   - telefone: Telefone ou WhatsApp de contato.
   - email: E-mail de contato ou do vendedor.
   - vendedor: Nome do vendedor responsável que assina o orçamento.
   - numeroOrcamento: Número de identificação do orçamento / cotação / pedido (ex: "2.282.821" ou "2286514").
   - data: Data de emissão no formato DD/MM/AAAA ou YYYY-MM-DD.
   - validade: Validade da proposta (ex: "5 dias", "Preço do dia").
   - condicoesPagamento: Condições ofertadas (ex: "30/60/90 DIAS", "À vista").

2. Identifique e extraia TODOS os ITENS DE MATERIAIS / PRODUTOS listados:
   Para cada item da lista/tabela:
   - itemNumero: Número sequencial do item (1, 2, 3...).
   - codigoFornecedor: Código interno ou referência do fornecedor (ex: "42030", "12268", "60021"). Se não houver, deixe null.
   - descricaoFornecedor: Descrição exata e completa do material conforme impressa no orçamento (ex: "CX.POLIFASICA S/DISJ. PADRAO CEMIG CM-4", "CABO FLEXIVEL 0,6/1KV 150MM² PRETO", "HASTE CANTONEIRA GALV. C/CONECTOR 2.40MT").
   - unidade: Unidade de medida (ex: "un", "m", "pc", "cj", "rl", "kg"). Padronize para siglas comuns em minúsculo.
   - quantidade: Quantidade orçada (número, ex: 1, 60, 24, 0.5).
   - precoUnitario: Preço unitário em Reais (número em formato decimal com ponto, ex: 296.30, 159.04, 67.32).
   - precoTotal: Preço total do item (número, ex: 9542.40).
   - marca: Marca ou fabricante do produto se informada na linha (ex: "SOPRANO", "KRONA", "AMANCO", "DIVERSOS").
   - ncm: NCM se informado, ou null.

3. Identifique os TOTAIS:
   - subtotalProdutos: Soma dos produtos.
   - valorFrete: Frete se houver, ou 0.
   - valorTotalGeral: Total geral da proposta.

ATENÇÃO RIGOROSA:
- Retorne APENAS um JSON válido no formato abaixo, sem texto antes ou depois, sem blocos markdown (\`\`\`json).
- Números decimais devem usar ponto (ex: 15.05).
- Não omita nenhum item da lista.

Formato do JSON esperado:
{
  "fornecedor": {
    "razaoSocial": "string",
    "cnpj": "string ou null",
    "telefone": "string ou null",
    "email": "string ou null",
    "vendedor": "string ou null",
    "numeroOrcamento": "string ou null",
    "data": "string ou null",
    "validade": "string ou null",
    "condicoesPagamento": "string ou null"
  },
  "totais": {
    "subtotalProdutos": number,
    "valorFrete": number,
    "valorTotalGeral": number
  },
  "itens": [
    {
      "itemNumero": 1,
      "codigoFornecedor": "string ou null",
      "descricaoFornecedor": "string",
      "unidade": "string",
      "quantidade": number,
      "precoUnitario": number,
      "precoTotal": number,
      "marca": "string ou null",
      "ncm": "string ou null"
    }
  ]
}`;

    let lastError: any = null;
    let extractedJson: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = client.getGenerativeModel({ model: modelName });
        let responseText = "";

        if (parsedWithPdfParse && pdfText.length > 50) {
          // Extração híbrida com texto cru + prompt
          const combinedPrompt = `${prompt}\n\nCONTEÚDO TEXTUAL DO ORÇAMENTO:\n${pdfText.slice(0, 40000)}`;
          const genResult = await model.generateContent(combinedPrompt);
          responseText = genResult.response.text().trim();
        } else {
          // Extração direta multimodal (PDF ou Imagem)
          const base64 = buffer.toString("base64");
          const genResult = await model.generateContent([
            {
              inlineData: {
                data: base64,
                mimeType
              }
            },
            prompt
          ]);
          responseText = genResult.response.text().trim();
        }

        // Limpar possíveis marcadores markdown
        const cleanJsonStr = responseText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        extractedJson = JSON.parse(cleanJsonStr);
        if (extractedJson && Array.isArray(extractedJson.itens) && extractedJson.itens.length > 0) {
          break; // Sucesso com este modelo
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com modelo ${modelName} falhou:`, err?.message || err);
        continue;
      }
    }

    if (!extractedJson || !Array.isArray(extractedJson.itens)) {
      throw lastError || new Error("Não foi possível extrair os itens do documento.");
    }

    return NextResponse.json({
      success: true,
      arquivoUrl,
      arquivoNome: fileName,
      fornecedor: extractedJson.fornecedor || {},
      totais: extractedJson.totais || {},
      itens: extractedJson.itens || []
    });
  } catch (error: any) {
    console.error("Erro na leitura de orçamento via IA:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao processar e ler o orçamento com IA."
      },
      { status: 500 }
    );
  }
}
