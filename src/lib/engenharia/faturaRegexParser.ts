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
    // Ler todas as páginas para capturar dados completos (medidor, contrato TUSD na página 2)
    const data = await pdfParse(pdfInput);
    const texto = data.text;

    // Detectar Concessionária
    const isEnel = /Ampla Energia/i.test(texto) || /Enel/i.test(texto);
    const isCpfl = /CPFL/i.test(texto);
    const isEnergisa = /Energisa/i.test(texto);
    const isCopel = /Copel/i.test(texto);
    const isCemig = /Cemig/i.test(texto) || (!isEnel && !isCpfl && !isEnergisa && !isCopel);

    if (isEnel) extracted.concessionaria = "Enel";
    else if (isCpfl) extracted.concessionaria = "CPFL";
    else if (isEnergisa) extracted.concessionaria = "Energisa";
    else if (isCopel) extracted.concessionaria = "COPEL";
    else extracted.concessionaria = "CEMIG";

    if (isEnel) {
       // Extração para Enel Brasil
       const ucMatch = texto.match(/No\.\s*da\s*UC\s*(\d+)/i) || texto.match(/UC[\s\S]*?(\d{6,8})/);
       if (ucMatch) extracted.numeroInstalacao = ucMatch[1];
       
       const vencMatch = texto.match(/Vencimento\s*(\d{2}\/\d{2}\/\d{4})/i) || texto.match(/Vencimento[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
       if (vencMatch) extracted.vencimento = vencMatch[1].trim();

       const totalMatch = texto.match(/Valor Total \(R\$\)\s*([\d\.]+(?:,\d{2}))/i) || texto.match(/TOTAL\s+A\s+PAGAR[\s\S]*?([\d\.]+(?:,\d{2}))/i);
       if (totalMatch) extracted.valorUltimaFatura = parseNumberExtracted(totalMatch[1]);

       const mesRefMatch = texto.match(/Fatura de\s*(\d{2}\/\d{4})/i) || texto.match(/MÊS\/ANO[\s\S]*?(\d{2}\/\d{4})/i);
       if (mesRefMatch) extracted.mesReferencia = mesRefMatch[1].trim();

       const demContratadaMatch = texto.match(/DEMANDA FORA PONTA - KW\s*([\d\.,]+)/i);
       if (demContratadaMatch) extracted.demandaContratadaKW = parseNumberExtracted(demContratadaMatch[1]);

       const demHFPMatch = texto.match(/Demanda Faturada-kW\s*FORA PONTA[\s\d\.,]+?([\d\.,]+)/i);
       if (demHFPMatch) extracted.demandaMedidaHFPKW = parseNumberExtracted(demHFPMatch[1]);

       const demHPMatch = texto.match(/Demanda Faturada-kW\s*PONTA[\s\d\.,]+?([\d\.,]+)/i);
       if (demHPMatch) extracted.demandaMedidaHPKW = parseNumberExtracted(demHPMatch[1]);

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
             kwh: Math.round(eHP + eHFP),
             injetadoKWh: 0,
             bandeira: "Verde"
          });
       }

       if (historico.length > 0) {
          extracted.consumoMeses = historico;
          if (!extracted.demandaMedidaHPKW) extracted.demandaMedidaHPKW = historico[0].demandaHP;
          if (!extracted.demandaMedidaHFPKW) extracted.demandaMedidaHFPKW = historico[0].demandaHFP;
          const kwhs = historico.map(x => x.kwh).filter(x => x > 0);
          if (kwhs.length > 0) {
            extracted.consumoMedioMensalKWh = Math.round(kwhs.reduce((a, b) => a + b, 0) / kwhs.length);
            extracted.consumoMaximoKWh = Math.max(...kwhs);
            extracted.demandaEstimadaHistoricoKW = Number((extracted.consumoMedioMensalKWh / (720 * 0.30)).toFixed(1));
          }
       }

       const cnpjCpfMatch = texto.match(/CPF\/CNPJ:\s*(\d{2,3}\.\d{3}\.\d{3}\/?\d{0,4}-?\d{2})/i);
       if (cnpjCpfMatch) extracted.cnpjCpfTitular = cnpjCpfMatch[1];

       const linhas = texto.split('\n');
       const linhaCnpjIdx = linhas.findIndex((l: string) => l.includes('CPF/CNPJ:'));
       if (linhaCnpjIdx > 2) {
          extracted.endereco = linhas[linhaCnpjIdx - 2].trim() + " " + linhas[linhaCnpjIdx - 1].trim();
          extracted.nomeCliente = linhas[linhaCnpjIdx - 3].trim();
       }

       return extracted;
    }

    // ----- Regras CEMIG e Padrão Nacional -----
    // Nº DA UNIDADE CONSUMIDORA / INSTALAÇÃO (Novo e antigo layout)
    const ucMatch = texto.match(/N[º°\.]*\s*DA\s*UNIDADE\s*CONSUMIDORA[\s:\n]*([\d\.\-]+)/i) ||
                    texto.match(/UNIDADE\s*CONSUMIDORA[\s:\n]*([\d\.\-]+)/i) ||
                    texto.match(/N[º°\.]*\s*DA\s*INSTALA[ÇC][ÃA]O[\s:\n]*([\d\.\-]+)/i) ||
                    texto.match(/INSTALA[ÇC][ÃA]O[\s:\n]*([\d\.\-]+)/i) ||
                    texto.match(/CÓDIGO\s*DO\s*CLIENTE[\s:\n]*([\d\.\-]+)/i);
    if (ucMatch) extracted.numeroInstalacao = ucMatch[1].trim();

    // Número do Medidor (busca na página 1 e página 2)
    const medidorMatch = texto.match(/Medidor:\s*([A-Za-z0-9\-]+)/i) ||
                         texto.match(/N[º°\.]*\s*do\s*Medidor[:\s]*([A-Za-z0-9\-]+)/i) ||
                         texto.match(/(?:Energia\s+kWh|Medição)\s*([A-Za-z]{3}\d{8}|[A-Za-z0-9\-]{6,14})/i) ||
                         texto.match(/N[º°\.]*\s*DO\s*MEDIDOR[\s:\n]*([A-Za-z0-9\-]+)/i) ||
                         texto.match(/MEDIDOR[\s:\n]*([A-Za-z0-9\-]+)/i);
    if (medidorMatch) extracted.numeroMedidor = medidorMatch[1].trim();

    // Nome do cliente e endereço
    const clienteExplicitMatch = texto.match(/Cliente:\s*([^\n\r,]+)/i);
    if (clienteExplicitMatch) {
      extracted.nomeCliente = clienteExplicitMatch[1].replace(/Unidade:.*$/i, '').trim();
    }

    const compMatch = texto.match(/(?:Comprovante de Pagamento|D[ÉE]BITO AUTOM[ÁA]TICO)\s*\n([^\n]+)\s*\n([^\n]+)\s*\n([^\n]+)\s*\n([^\n]+)/i);
    if (compMatch) {
      if (!extracted.nomeCliente) extracted.nomeCliente = compMatch[1].trim();
      extracted.endereco = `${compMatch[2].trim()}, ${compMatch[3].trim()}, ${compMatch[4].trim()}`.replace(/\s+/g, ' ');
    } else {
      // Bloco de cabeçalho da fatura CEMIG (acima de CNPJ/CPF ou de Unidade Consumidora)
      const enderecoBlock = texto.match(/Grandezas Contratadas[\s\S]*?(?:Demanda[^\n]*\n)?([A-Z0-9\s\.\-]{3,60}?(?:LTDA|S\.A\.|ME|EPP|EIRELI|POSTO|COMERCIO|SERVICOS|INDUSTRIA|[A-Z\s]{4,}))\n([\s\S]*?)(?:CNPJ|CPF|N[º°\.]*\s*DA\s*UNIDADE)/i);
      if (enderecoBlock) {
        if (!extracted.nomeCliente) extracted.nomeCliente = enderecoBlock[1].trim();
        const linhasEnd = enderecoBlock[2].split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0 && !l.toUpperCase().includes('CONTRATADA'));
        if (linhasEnd.length > 0) {
          extracted.endereco = linhasEnd.join(', ');
        }
      } else {
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
            if (!extracted.nomeCliente) extracted.nomeCliente = blocoAcima[startIdx];
            if (endIdx >= startIdx + 1) {
               extracted.endereco = blocoAcima.slice(startIdx + 1, endIdx + 1).join(', ');
            }
          }
        }
      }
    }

    // CNPJ / CPF do titular
    const cnpjMatch = texto.match(/CNPJ[:\s]*([\d\.\-\/\*]+)/i) || texto.match(/CPF[:\s]*([\d\.\-\/\*]+)/i);
    if (cnpjMatch) extracted.cnpjCpfTitular = cnpjMatch[1].trim();

    // Vencimento
    const vencMatch = texto.match(/(?:Vencimento|VENCIMENTO)[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
    if (vencMatch) extracted.vencimento = vencMatch[1].trim();

    // Total a pagar
    const totalMatch = texto.match(/Total\s+a\s+pagar[\s\S]*?R\$\s*([\d\.]+(?:,\d{2})?)/i) || 
                       texto.match(/Valor\s+a\s+pagar\s*\(R\$\)[\s\S]*?([\d\.]+(?:,\d{2})?)/i) ||
                       texto.match(/R\$\s*([\d\.]+(?:,\d{2})?)/i);
    if (totalMatch) extracted.valorUltimaFatura = parseNumberExtracted(totalMatch[1]);

    // Mês de Referência
    const mesRefMatch = texto.match(/Referente a\s+([A-Za-z]{3}\/\d{4})/i) || 
                        texto.match(/M[êe]s\s+Refer[êe]ncia[:\s]+([A-Za-z]{3}\/\d{4})/i) ||
                        texto.match(/Agosto\/\d{4}|Setembro\/\d{4}|Outubro\/\d{4}|Novembro\/\d{4}|Dezembro\/\d{4}|Janeiro\/\d{4}|Fevereiro\/\d{4}|Março\/\d{4}|Abril\/\d{4}|Maio\/\d{4}|Junho\/\d{4}|Julho\/\d{4}/i);
    if (mesRefMatch) extracted.mesReferencia = mesRefMatch[1] ? mesRefMatch[1].trim() : mesRefMatch[0].trim();

    // Demanda Contratada e Medida
    const demContratadaMatch = texto.match(/Demanda\s*Fora\s*Ponta\s*([\d\.,]+)/i) ||
                               texto.match(/(?:Demanda Contratada|Demanda Fora Ponta)[^\d]+([\d\.]+)/i);
    if (demContratadaMatch) extracted.demandaContratadaKW = parseNumberExtracted(demContratadaMatch[1]);

    const demandaHFPMatch = texto.match(/Demanda Ativa HFP\D*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
    if (demandaHFPMatch) extracted.demandaMedidaHFPKW = parseNumberExtracted(demandaHFPMatch[1]);

    // Geração Distribuída (GD Solar Fotovoltaica)
    const energiaCompMatch = texto.match(/Energia\s*(?:compensada|Injetada)[^\d]*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i) ||
                             texto.match(/Compensa[çc][ãa]o\s*GD[^\d]*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i) ||
                             texto.match(/Energia\s*Injetada\s*HFP[^\d]*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
    if (energiaCompMatch) extracted.energiaCompensadaKWh = parseNumberExtracted(energiaCompMatch[1]);

    const saldoGdMatch = texto.match(/SALDO\s*(?:ATUAL\s*DE\s*GERAÇÃO|Atual|Total|de\s*Gera[çc][ãa]o|de\s*Energia|Acumulado)[^\d]*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i) ||
                         texto.match(/Cr[ée]dito\s*(?:Acumulado|a\s*Compensar)[^\d]*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i) ||
                         texto.match(/Saldo\s*em\s*kwh[^\d]*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
    if (saldoGdMatch) extracted.saldoGeracaoKWh = parseNumberExtracted(saldoGdMatch[1]);

    // Descontos de Compensação GD
    const compFioMatch = texto.match(/Desconto\s*Comp\.\s*Fio[^\d\-]*?(-?[\d\.]+(?:,\d{2})?)/i);
    if (compFioMatch) extracted.descontoCompFio = parseNumberExtracted(compFioMatch[1]);
    const compEncMatch = texto.match(/Desconto\s*Comp\.\s*Encargo[^\d\-]*?(-?[\d\.]+(?:,\d{2})?)/i);
    if (compEncMatch) extracted.descontoCompEncargo = parseNumberExtracted(compEncMatch[1]);

    // Modalidade/Subgrupo Explícitos no rodapé superior
    const headerMatch = texto.match(/Classe\s*Subclasse\s*Modalidade\s*Tarifária[^\n]*\n([^\n]+)/i);
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
      
      if (extracted.subgrupo) {
         extracted.grupoTarifario = extracted.subgrupo.startsWith('A') ? 'A' : 'B';
      }
      
      const linhaUp = linha.toUpperCase();
      if (linhaUp.includes("RURAL")) extracted.classeConsumo = "Rural";
      else if (linhaUp.includes("RESID")) extracted.classeConsumo = "Residencial";
      else if (linhaUp.includes("COMERCI")) extracted.classeConsumo = "Comercial";
      else if (linhaUp.includes("INDUST")) extracted.classeConsumo = "Industrial";
    }

    // Identificação de Grupo A vs Grupo B
    const isGrupoA = extracted.grupoTarifario === 'A' || 
                     /Demanda\(kW\)[\s\S]*?Energia\(kWh\)/i.test(texto) ||
                     /TUSD\s*Livre|Tarifa\s*Verde|Tarifa\s*Azul|Subgrupo\s*A/i.test(texto) ||
                     (extracted.demandaContratadaKW && extracted.demandaContratadaKW > 75);

    if (isGrupoA) {
      extracted.grupoTarifario = 'A';
      extracted.subgrupo = extracted.subgrupo || 'A4';
      extracted.categoriaPadrao = extracted.subgrupo;
      extracted.padraoConexao = 'MEDIA_TENSAO';
      extracted.disjuntorAmperes = null; // Grupo A é atendido por Subestação / Cabine de Média Tensão

      // Parser Histórico Grupo A (composto por HP, HFP, HR)
      const regexConsumoA = /\b([A-Z]{3}\/\d{2,4})\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\b/gi;
      let ma;
      const historicoA = [];
      while ((ma = regexConsumoA.exec(texto)) !== null) {
        const eHP = parseNumberExtracted(ma[4]) || 0;
        const eHFP = parseNumberExtracted(ma[5]) || 0;
        historicoA.push({
          mes: ma[1],
          demandaHP: parseNumberExtracted(ma[2]) || 0,
          demandaHFP: parseNumberExtracted(ma[3]) || 0,
          energiaHP: eHP,
          energiaHFP: eHFP,
          energiaHR: parseNumberExtracted(ma[6]) || 0,
          kwh: Math.round(eHP + eHFP),
          injetadoKWh: 0,
          bandeira: "Verde"
        });
      }

      if (historicoA.length > 0) {
        extracted.consumoMeses = historicoA;
        const kwhs = historicoA.map(x => x.kwh).filter(x => x > 0);
        if (kwhs.length > 0) {
          extracted.consumoMedioMensalKWh = Math.round(kwhs.reduce((a, b) => a + b, 0) / kwhs.length);
          extracted.consumoMaximoKWh = Math.max(...kwhs);
          extracted.demandaEstimadaHistoricoKW = Number((extracted.consumoMedioMensalKWh / (720 * 0.30)).toFixed(1));
        }
      }
    } else {
      // Grupo B (Baixa Tensão)
      extracted.grupoTarifario = 'B';

      // Identificação de Categoria do Padrão e Disjuntor CEMIG ND-5.1
      const catMatch = texto.match(/\b(B1|B2|C1|C2|C3|C4|C5|C6|F[1-9])\b/i);
      if (catMatch) {
        extracted.categoriaPadrao = catMatch[1].toUpperCase();
      } else if (texto.match(/Monof[áa]sico/i)) {
        extracted.categoriaPadrao = 'A';
      } else if (texto.match(/Bif[áa]sico/i)) {
        extracted.categoriaPadrao = 'B1';
      } else if (texto.match(/Trif[áa]sico/i)) {
        extracted.categoriaPadrao = 'C1';
      }

      if (extracted.categoriaPadrao === 'B1') {
        extracted.disjuntorAmperes = 63;
        extracted.padraoConexao = 'BIFASICO';
      } else if (extracted.categoriaPadrao === 'A') {
        extracted.disjuntorAmperes = 40;
        extracted.padraoConexao = 'MONOFASICO';
      } else if (extracted.categoriaPadrao === 'C1') {
        extracted.disjuntorAmperes = 63;
        extracted.padraoConexao = 'TRIFASICO';
      } else if (extracted.categoriaPadrao === 'C2') {
        extracted.disjuntorAmperes = 80;
        extracted.padraoConexao = 'TRIFASICO';
      } else if (extracted.categoriaPadrao === 'C3') {
        extracted.disjuntorAmperes = 100;
        extracted.padraoConexao = 'TRIFASICO';
      } else if (extracted.categoriaPadrao?.startsWith('F')) {
        extracted.disjuntorAmperes = 225;
        extracted.padraoConexao = 'TRIFASICO';
      }

      // Histórico de Consumo (Grupo B - Baixa Tensão Residencial / Comercial)
      const regexConsumoB = /\b([A-Z]{3}\/\d{2,4})\s+(\d{1,4}(?:\.\d{3})*)\s+([\d,]+)\s+(\d{1,2})\b/gi;
      let mb;
      const historicoB = [];
      while ((mb = regexConsumoB.exec(texto)) !== null) {
        const kwh = parseInt(mb[2].replace(/\./g, ''), 10) || 0;
        historicoB.push({
          mes: mb[1],
          kwh,
          demandaHP: 0,
          demandaHFP: 0,
          energiaHP: 0,
          energiaHFP: kwh,
          energiaHR: 0,
          injetadoKWh: 0,
          bandeira: "Verde"
        });
      }

      if (historicoB.length > 0) {
        extracted.consumoMeses = historicoB;
        const kwhs = historicoB.map(x => x.kwh).filter(x => x > 0);
        if (kwhs.length > 0) {
          extracted.consumoMedioMensalKWh = Math.round(kwhs.reduce((a, b) => a + b, 0) / kwhs.length);
          extracted.consumoMaximoKWh = Math.max(...kwhs);
          extracted.demandaEstimadaHistoricoKW = Number((extracted.consumoMedioMensalKWh / (720 * 0.30)).toFixed(1));
        }
      }
    }

    // Fallback: verificar consumo faturado no ciclo atual caso o histórico não tenha sido lido
    if (!extracted.consumoMeses || extracted.consumoMeses.length === 0) {
      const consumoCicloMatch = texto.match(/(?:Energia\s+kWh|Energia\s+SCEE\s+ISENTA|Energia\s+Ativa)[^\d]*?(\d{1,4}(?:\.\d{3})*(?:,\d+)?)/i);
      const kwhCiclo = consumoCicloMatch ? parseNumberExtracted(consumoCicloMatch[1]) : null;
      if (kwhCiclo && kwhCiclo > 0) {
        extracted.consumoMeses = [{ mes: extracted.mesReferencia || "Atual", kwh: Math.round(kwhCiclo), injetadoKWh: 0, bandeira: "Verde" }];
        extracted.consumoMedioMensalKWh = Math.round(kwhCiclo);
        extracted.consumoMaximoKWh = Math.round(kwhCiclo);
        extracted.demandaEstimadaHistoricoKW = Number((kwhCiclo / (720 * 0.30)).toFixed(1));
      }
    }
    
    // Desconto Irrigante
    const irriganteMatch = texto.match(/Desconto Irrigante[^-\d]*?(?:-|\s)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i);
    if (irriganteMatch) extracted.descontoIrrigante = parseNumberExtracted(irriganteMatch[1]);
    
    // Tarifas e Tensão
    const tensionMatch = texto.match(/(?:Tensão\s+Fornecimento|TENSÃO DE FORNECIMENTO).*?([\d\.,]{2,}\s*[kK]*[Vv]+)/i);
    if (tensionMatch) extracted.tensaoFornecimento = tensionMatch[1].trim();

    return extracted;

  } catch (err: any) {
    console.error('Erro ao ler PDF offline com Regex:', err);
    throw new Error('Falha na extração de texto nativa. ' + (password ? 'Verifique a senha.' : ''));
  }
}
