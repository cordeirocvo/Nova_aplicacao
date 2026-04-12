import { PDFParse } from "pdf-parse";
import fs from "fs";

async function testPdf() {
  try {
    // We don't have a real PDF, so we'll try to "simulate" one with a small buffer
    // Actually, PDFParse might fail if the buffer is not a valid PDF
    const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    console.log("Success! Text:", result.text);
  } catch (error: any) {
    console.error("PDFParse Failed:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }
}

testPdf().finally(() => process.exit());
