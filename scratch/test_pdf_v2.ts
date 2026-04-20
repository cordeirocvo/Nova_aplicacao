import fs from 'fs';
import { extrairDadosCemigRegex } from '../src/lib/engenharia/faturaRegexParser';
const pdfParse = require('pdf-parse');

async function run() {
  try {
    const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\Conta CEMIG Condomínio Pirapora.pdf';
    console.log(`Lendo arquivo: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    
    console.log("---- COMEÇANDO EXTRAÇÃO DE TEXTO ----");
    const data = await pdfParse(buffer, { max: 1 });
    fs.writeFileSync('./scratch/raw_cemig.txt', data.text);
    console.log("TEXTO BRUTO DA PRIMEIRA PÁGINA SALVO EM raw_cemig.txt");
    
    console.log("---- APLICANDO O PARSER (REGEX) ----");
    const extracted = await extrairDadosCemigRegex(buffer);
    console.log("Dados Extraídos (Regex):", JSON.stringify(extracted, null, 2));

  } catch (error) {
    console.error("ERRO:", error);
  }
}

run();
