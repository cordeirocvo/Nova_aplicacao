import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // PDFParse v2.4.5 usage
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text;

    // Expert Logic: Extract key specs from text using Regex
    // Looking for Power (kW), Voltage (V), Phase, Current (A)
    const specs = {
      brand: extractRegex(text, /(?:brand|marca|fabricante)[:\s]+(\w+)/i) || "Desconhecida",
      model: extractRegex(text, /(?:model|modelo)[:\s]+([\w\d-]+)/i) || "Não identificado",
      power: parseFloat(extractRegex(text, /(\d+(?:[.,]\d+)?)\s*kW/i) || "0"),
      voltage: parseInt(extractRegex(text, /(\d{3})\s*V/i) || "220"),
      phases: text.toLowerCase().includes("trifásico") || text.toLowerCase().includes("3-phase") || text.toLowerCase().includes("3p") ? 3 : 1,
      current: parseFloat(extractRegex(text, /(\d+)\s*A/i) || "16"),
      connectorType: extractRegex(text, /(Tipo\s*2|Type\s*2|T2|GB\/T)/i) || "T2",
    };

    return NextResponse.json({ success: true, specs, rawText: text.substring(0, 500) });
  } catch (error: any) {
    console.error("Error analyzing PDF detail:", {
      message: error.message,
      stack: error.stack,
      error
    });
    return NextResponse.json({ 
      error: "Falha ao analisar o PDF", 
      details: error.message 
    }, { status: 500 });
  }
}

function extractRegex(text: string, regex: RegExp) {
  const match = text.match(regex);
  return match ? match[1] : null;
}
