const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function extractFull() {
  const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\Conta CEMIG Condomínio Pirapora.pdf';
  const nodeBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(nodeBuffer, { max: 1 });
  fs.writeFileSync('scratch/pdf_text_full.txt', data.text);
  console.log("Salvo completo em pdf_text_full.txt");
}

extractFull();
