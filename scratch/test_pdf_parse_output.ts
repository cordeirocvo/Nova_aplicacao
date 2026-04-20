const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function extrair() {
  const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\Conta CEMIG Condomínio Pirapora.pdf';
  const nodeBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(nodeBuffer, { max: 1 });
  const texto = data.text;
  
  console.log("----- TEXT START -----");
  console.log(texto.substring(0, 1000)); // print parts of it to see spacing
  console.log("----- TEXT END -----");
  
  const instMatch = texto.match(/Nº DA INSTALAÇÃO[^\d]+([\d]+)/i);
  console.log("Instalação Match:", instMatch ? instMatch[1] : "NÃO ACHOU");
}

extrair();
