const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// Funções auxiliares de parser
function parseNumberExtracted(valStr: string | undefined | null): number | null {
  if (!valStr) return null;
  // Converter '1.234,56' para '1234.56' ou '1234,56' para '1234.56'
  const cleanStr = valStr.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
}

export async function extrairDadosCemigRegex(fileBuffer: Buffer): Promise<any> {
  const extracted: any = {
    concessionaria: "CEMIG-D", // Sabemos que é CEMIG se chegou até aqui
    extraidoPorRegex: true // flag
  };

  try {
    const data = await pdfParse(fileBuffer, { max: 1 }); // A primeira página costuma ter tudo
    const texto = data.text;

    // ----- Regras Sugeridas pelo Usuário + Adaptações para o Frontend -----
    // Nome do cliente e endereço
    const numInstLineIndex = texto.indexOf("Nº DA INSTALAÇÃO");
    if (numInstLineIndex !== -1) {
      const blocoAcima = texto.substring(0, numInstLineIndex).trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const cnpjIndex = blocoAcima.findIndex(l => l.toUpperCase().includes('CNPJ') || l.toUpperCase().includes('CPF'));
      if (cnpjIndex !== -1) {
        let endIdx = cnpjIndex - 1;
        let startIdx = endIdx;
        while (startIdx > 0 && 
               !blocoAcima[startIdx-1].toUpperCase().includes('DEMANDA') &&
               !blocoAcima[startIdx-1].toUpperCase().includes('CONTRATADAS') &&
               !blocoAcima[startIdx-1].toUpperCase().includes('GRANDEZAS') &&
               !/^[0-9\.,]+$/.test(blocoAcima[startIdx-1]) ) {
          startIdx--;
        }
        extracted.nomeCliente = blocoAcima[startIdx];
        if (endIdx >= startIdx + 1) {
           extracted.endereco = blocoAcima.slice(startIdx + 1, endIdx + 1).join(', ');
        }
      }
    }

    // Nº DA INSTALAÇÃO
    const instMatch = texto.match(/N[º°]\s+DA\s+INSTALA[ÇC][ÃA]O\s+(\d+)/i) || texto.match(/INSTALA[ÇC][ÃA]O:?\s+(\d+)/i);
    if (instMatch) extracted.numeroInstalacao = instMatch[1].trim();

    // Vencimento
    const vencMatch = texto.match(/(?:Vencimento|VENCIMENTO).*?(\d{2}\/\d{2}\/\d{4})/is);
    if (vencMatch) extracted.vencimento = vencMatch[1].trim();

    // Total a pagar
    const totalMatch = texto.match(/R\$\s*([\d\.]+(?:,\d{2})?)/i) || texto.match(/(?:Total a pagar|TOTAL\s+A\s+PAGAR).*?([\d\.]+(?:,\d{2})?)/is);
    if (totalMatch) extracted.valorUltimaFatura = parseNumberExtracted(totalMatch[1]);

    // Mês de Referência
    const mesRefMatch = texto.match(/Referente a\s+([A-Za-z]{3}\/\d{4})/i) || texto.match(/M[êe]s\s+Refer[êe]ncia[:\s]+([A-Za-z]{3}\/\d{4})/i);
    if (mesRefMatch) extracted.mesReferencia = mesRefMatch[1].trim();

    // Demanda Ativa HFP / Demanda Contratada
    const demandaHFPMatch = texto.match(/Demanda Ativa HFP\D*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
    if (demandaHFPMatch) extracted.demandaMedidaHFPKW = parseNumberExtracted(demandaHFPMatch[1]);

    const demandaContratadaMatch = texto.match(/(?:Demanda Contratada|Demanda Fora Ponta)[^\d]+([\d\.]+)/i);
    if (demandaContratadaMatch) extracted.demandaContratadaKW = parseNumberExtracted(demandaContratadaMatch[1]);

    // Energia Ativa
    let energiaHFP = 0;
    const energiaHFPMatch = texto.match(/Energia Ativa HFP\D*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
    if (energiaHFPMatch) energiaHFP = parseNumberExtracted(energiaHFPMatch[1]) || 0;

    const energiaHRMatch = texto.match(/Energia Ativa HR\D*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
    if (energiaHRMatch) extracted.energiaAtivaHRKWh = parseNumberExtracted(energiaHRMatch[1]);

    // Modalidade/Subgrupo Explícitos no rodapé superior
    const headerMatch = texto.match(/ClasseSubclasseModalidade Tarifária[^\n]*\n([^\n]+)/i);
    if (headerMatch) {
      const linha = headerMatch[1];
      const subMatch = linha.match(/(A[1-4]|A3a|AS|B[1-4])/i);
      if (subMatch) extracted.subgrupo = subMatch[1].toUpperCase();

      const modMatch = linha.match(/(Verde|Azul|Branca|Convencional)/i);
      if (modMatch) {
         const mStr = modMatch[1].toUpperCase();
         extracted.modalidadeTarifaria = mStr === 'VERDE' ? 'HORARIA_VERDE' : 
                                         mStr === 'AZUL' ? 'HORARIA_AZUL' : 
                                         mStr === 'BRANCA' ? 'BRANCA' : 'CONVENCIONAL';
      }
      
      if(extracted.subgrupo) {
         extracted.grupoTarifario = extracted.subgrupo.startsWith('A') ? 'A' : 'B';
      }
      
      const linhaUp = linha.toUpperCase();
      if(linhaUp.includes("RURAL")) extracted.classeConsumo = "Rural";
      else if(linhaUp.includes("RESID")) extracted.classeConsumo = "Residencial";
      else if(linhaUp.includes("COMERCI")) extracted.classeConsumo = "Comercial";
      else if(linhaUp.includes("INDUST")) extracted.classeConsumo = "Industrial";
    }

    // Histórico de Consumo (Tabela)
    const regexConsumo = /\b([A-Z]{3}\/\d{2,4})\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\b/gi;
    let m;
    const historico = [];
    while ((m = regexConsumo.exec(texto)) !== null) {
      const eHP = parseFloat(m[4].replace(/\./g, '').replace(/,/g, '.')) || 0;
      const eHFP = parseFloat(m[5].replace(/\./g, '').replace(/,/g, '.')) || 0;
      historico.push({
        mes: m[1],
        demandaHP: parseFloat(m[2].replace(/\./g, '').replace(/,/g, '.')) || 0,
        demandaHFP: parseFloat(m[3].replace(/\./g, '').replace(/,/g, '.')) || 0,
        energiaHP: eHP,
        energiaHFP: eHFP,
        energiaHR: parseFloat(m[6].replace(/\./g, '').replace(/,/g, '.')) || 0,
        kwh: eHP + eHFP,
        injetadoKWh: 0,
        bandeira: "Verde"
      });
    }

    if(historico.length > 0) {
       // A Cemig agrupa dos mais recentes pros mais antigos, o que é perfeito
       extracted.consumoMeses = historico;
    } else if(energiaHFP > 0) {
       extracted.consumoMeses = [{ mes: extracted.mesReferencia || "Atual", kwh: energiaHFP, injetadoKWh: 0, bandeira: "Verde" }];
    }
    
    // Desconto Irrigante
    const irriganteMatch = texto.match(/Desconto Irrigante[^-\d]*?(?:-|\s)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i);
    if (irriganteMatch) extracted.descontoIrrigante = parseNumberExtracted(irriganteMatch[1]);
    
    // Tentativa rudimentar de ler nome e outras sub-categorias que a IA lería, para não ficar zerado
    // Se falharem e o cliente quiser dados refinados, a IA atuaria de fallback
    const cnpjCpfMatch = texto.match(/(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjCpfMatch) extracted.cnpjCpfTitular = cnpjCpfMatch[1];
    
    // Tarifas
    const tensionMatch = texto.match(/(?:Tensão\s+Fornecimento|TENSÃO DE FORNECIMENTO).*?([\d\.,]{2,}\s*[kK]*[Vv]+)/i);
    if (tensionMatch) extracted.tensaoFornecimento = tensionMatch[1].trim();

    return extracted;

  } catch (err: any) {
    console.error('Erro ao ler PDF offline com Regex:', err);
    throw new Error('Falha na extração de texto nativa.');
  }
}
