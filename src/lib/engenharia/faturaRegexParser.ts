const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// Funções auxiliares de parser
function parseNumberExtracted(valStr: string | undefined | null): number | null {
  if (!valStr) return null;
  // Converter '1.234,56' para '1234.56' ou '1234,56' para '1234.56'
  const cleanStr = valStr.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
}

export async function extrairDadosCemigRegex(fileBuffer: Buffer, password?: string): Promise<any> {
  const extracted: any = {
    concessionaria: "CEMIG-D", // Default, pode ser alterado abaixo
    extraidoPorRegex: true // flag
  };

  try {
    const pdfInput = password ? { data: fileBuffer, password } : fileBuffer;
    const data = await pdfParse(pdfInput, { max: 1 }); // A primeira página costuma ter tudo
    const texto = data.text;

    // Detectar Concessionária
    const isEnel = /Ampla Energia/i.test(texto) || /Enel/i.test(texto);
    if (isEnel) {
       extracted.concessionaria = "Enel";
    }

    if (isEnel) {
       // Extração para Enel Brasil
       // UC
       const ucMatch = texto.match(/No\.\s*da\s*UC\s*(\d+)/i) || texto.match(/UC[\s\S]*?(\d{6,8})/);
       if (ucMatch) extracted.numeroInstalacao = ucMatch[1];
       
       // Vencimento
       const vencMatch = texto.match(/Vencimento\s*(\d{2}\/\d{2}\/\d{4})/i) || texto.match(/Vencimento[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
       if (vencMatch) extracted.vencimento = vencMatch[1].trim();

       // Total a pagar
       const totalMatch = texto.match(/Valor Total \(R\$\)\s*([\d\.]+(?:,\d{2}))/i) || texto.match(/TOTAL\s+A\s+PAGAR[\s\S]*?([\d\.]+(?:,\d{2}))/i);
       if (totalMatch) extracted.valorUltimaFatura = parseNumberExtracted(totalMatch[1]);

       // Mês de Referência
       const mesRefMatch = texto.match(/Fatura de\s*(\d{2}\/\d{4})/i) || texto.match(/MÊS\/ANO[\s\S]*?(\d{2}\/\d{4})/i);
       if (mesRefMatch) extracted.mesReferencia = mesRefMatch[1].trim();

       // Demanda Contratada
       const demContratadaMatch = texto.match(/DEMANDA FORA PONTA - KW\s*([\d\.,]+)/i);
       if (demContratadaMatch) extracted.demandaContratadaKW = parseNumberExtracted(demContratadaMatch[1]);

       // Demanda Medida HFP e HP
       const demHFPMatch = texto.match(/Demanda Faturada-kW\s*FORA PONTA[\s\d\.,]+?([\d\.,]+)/i);
       if (demHFPMatch) extracted.demandaMedidaHFPKW = parseNumberExtracted(demHFPMatch[1]);

       const demHPMatch = texto.match(/Demanda Faturada-kW\s*PONTA[\s\d\.,]+?([\d\.,]+)/i);
       if (demHPMatch) extracted.demandaMedidaHPKW = parseNumberExtracted(demHPMatch[1]);

       // Histórico de Consumo
       const regexConsumoEnel = /\b([A-Z]{3} \/ \d{4})(\d+,\d{2})(\d+,\d{2})(\d+,\d{2})(\d+,\d{2})(\d{2,3})\b/gi;
       let m;
       const historico = [];
       while ((m = regexConsumoEnel.exec(texto)) !== null) {
          const eHP = parseNumberExtracted(m[4]) || 0;
          const eHFP = parseNumberExtracted(m[5]) || 0;
          historico.push({
             mes: m[1],
             demandaHP: parseNumberExtracted(m[2]) || 0,
             demandaHFP: parseNumberExtracted(m[3]) || 0,
             energiaHP: eHP,
             energiaHFP: eHFP,
             kwh: eHP + eHFP,
             injetadoKWh: 0,
             bandeira: "Verde"
          });
       }

       if (historico.length > 0) {
          extracted.consumoMeses = historico;
          // Se não encontrou as demandas medidas em outro lugar, pega do mês mais recente
          if (!extracted.demandaMedidaHPKW) extracted.demandaMedidaHPKW = historico[0].demandaHP;
          if (!extracted.demandaMedidaHFPKW) extracted.demandaMedidaHFPKW = historico[0].demandaHFP;
       }

       // CNPJ/CPF Titular
       const cnpjCpfMatch = texto.match(/CPF\/CNPJ:\s*(\d{2,3}\.\d{3}\.\d{3}\/?\d{0,4}-?\d{2})/i);
       if (cnpjCpfMatch) extracted.cnpjCpfTitular = cnpjCpfMatch[1];

       // Nome Cliente (tentativa de capturar a linha antes do endereço ou usando Regex)
       // Para a Enel geralmente fica logo acima do CPF/CNPJ
       const linhas = texto.split('\n');
       const linhaCnpjIdx = linhas.findIndex((l: string) => l.includes('CPF/CNPJ:'));
       if (linhaCnpjIdx > 2) {
          // A Enel costuma colocar o endereço logo acima e o nome acima do endereço
          extracted.endereco = linhas[linhaCnpjIdx - 2].trim() + " " + linhas[linhaCnpjIdx - 1].trim();
          extracted.nomeCliente = linhas[linhaCnpjIdx - 3].trim();
       }

       return extracted;
    }

    // ----- Regras CEMIG (Mantidas) -----
    // Nome do cliente e endereço
    const numInstLineIndex = texto.indexOf("Nº DA INSTALAÇÃO");
    if (numInstLineIndex !== -1) {
      const blocoAcima = texto.substring(0, numInstLineIndex).trim().split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      const cnpjIndex = blocoAcima.findIndex((l: string) => l.toUpperCase().includes('CNPJ') || l.toUpperCase().includes('CPF'));
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
    const vencMatch = texto.match(/(?:Vencimento|VENCIMENTO)[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
    if (vencMatch) extracted.vencimento = vencMatch[1].trim();

    // Total a pagar
    const totalMatch = texto.match(/R\$\s*([\d\.]+(?:,\d{2})?)/i) || texto.match(/(?:Total a pagar|TOTAL\s+A\s+PAGAR)[\s\S]*?([\d\.]+(?:,\d{2})?)/i);
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
    throw new Error('Falha na extração de texto nativa. ' + (password ? 'Verifique a senha.' : ''));
  }
}
