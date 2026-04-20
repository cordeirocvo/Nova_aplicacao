const fs = require('fs');

const texto = fs.readFileSync('scratch/pdf_text_full.txt', 'utf8');

const regexConsumo = /\b([A-Z]{3}\/\d{2})\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\b/gi;

const extracted = { consumoMeses: [] };
let m;
while ((m = regexConsumo.exec(texto)) !== null) {
  extracted.consumoMeses.push({
    mes: m[1],
    demandaHP: parseFloat(m[2].replace(/\./g, '')) || 0,
    demandaHFP: parseFloat(m[3].replace(/\./g, '')) || 0,
    energiaHP: parseFloat(m[4].replace(/\./g, '')) || 0,
    energiaHFP: parseFloat(m[5].replace(/\./g, '')) || 0,
    energiaHR: parseFloat(m[6].replace(/\./g, '')) || 0,
  });
}

console.log("Grid Meses:", extracted.consumoMeses);
console.log("Total Meses:", extracted.consumoMeses.length);

// Also test Classe/Subclasse
const headerMatch = texto.match(/ClasseSubclasseModalidade Tarifária[^\n]*\n([^\n]+)/i);
if (headerMatch) {
  const linhaHeader = headerMatch[1];
  console.log("Linha Header:", linhaHeader);
  // Extract subclass (A4, A3, etc)
  const subMatch = linhaHeader.match(/(A[1-4]a?|AS|B[1-4])/i);
  console.log("Subclasse:", subMatch ? subMatch[1] : null);
  // Modalidade
  const modMatch = linhaHeader.match(/(Verde|Azul|Branca|Convencional)/i);
  console.log("Modalidade:", modMatch ? modMatch[1] : null);
}

