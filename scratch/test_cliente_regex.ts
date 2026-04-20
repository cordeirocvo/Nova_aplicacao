const fs = require('fs');
const texto = fs.readFileSync('scratch/pdf_text_full.txt', 'utf8');

const instMatch = texto.match(/Nº DA INSTALAÇÃO/i);
if (instMatch) {
  const index = instMatch.index;
  const before = texto.substring(0, index).trim().split('\n');
  const ultimas = before.slice(-5);
  console.log("Ultimas 5 linhas antes de Nº Instalação:");
  console.log(ultimas.join('\n'));
}

// Another way: CNPJ CNPJ XX.XXX.XXX/YYYY-ZZ
const cnpjMatch = texto.match(/CNPJ\s+[\d\.\*/-]+/i);
if (cnpjMatch) {
  console.log("Achou CNPJ:", cnpjMatch[0]);
}
