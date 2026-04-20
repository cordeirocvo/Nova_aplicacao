const fs = require('fs');
const texto = fs.readFileSync('scratch/pdf_text_full.txt', 'utf8');

const numInstLineIndex = texto.indexOf("Nº DA INSTALAÇÃO");
if (numInstLineIndex !== -1) {
  const blocoAcima = texto.substring(0, numInstLineIndex).trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const cnpjIndex = blocoAcima.findIndex(l => l.toUpperCase().includes('CNPJ') || l.toUpperCase().includes('CPF'));
  if (cnpjIndex !== -1) {
    let endIdx = cnpjIndex - 1;
    let startIdx = endIdx;
    while (startIdx > 0 && 
           !blocoAcima[startIdx-1].includes('Demanda') &&
           !blocoAcima[startIdx-1].includes('Contratadas') &&
           !blocoAcima[startIdx-1].includes('Grandezas') &&
           !/^[0-9\.,]+$/.test(blocoAcima[startIdx-1]) ) {
      startIdx--;
    }
    const nomeCliente = blocoAcima[startIdx];
    const endereco = blocoAcima.slice(startIdx + 1, endIdx + 1).join(', ');
    console.log("Nome Cliente:", nomeCliente);
    console.log("Endereço:", endereco);
  }
}
