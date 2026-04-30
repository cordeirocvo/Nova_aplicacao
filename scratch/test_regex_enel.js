const fs = require('fs');

async function main() {
    const text = fs.readFileSync('C:\\Users\\BRUNO CORDEIRO\\.gemini\\antigravity\\scratch\\cordeiro-energia\\scratch\\enel_text.txt', 'utf-8');
    
    // Concessionária
    const isEnel = /Ampla Energia/i.test(text) || /Enel/i.test(text);
    console.log("Is Enel:", isEnel);
    
    // UC
    const ucMatch = text.match(/No\.\s*da\s*UC\s*(\d+)/i) || text.match(/UC[\s\S]*?(\d{6,8})/);
    console.log("UC:", ucMatch ? ucMatch[1] : null);
    
    // Vencimento
    const vencMatch = text.match(/Vencimento[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
    console.log("Vencimento:", vencMatch ? vencMatch[1] : null);
    
    // Total a pagar
    const totalMatch = text.match(/Valor Total \(R\$\)[\s\S]*?([\d\.]+(?:,\d{2}))/i) || text.match(/TOTAL\s+A\s+PAGAR[\s\S]*?([\d\.]+(?:,\d{2}))/i);
    console.log("Total a Pagar:", totalMatch ? totalMatch[1] : null);

    // Mês Referência
    const mesRefMatch = text.match(/Fatura de\s*(\d{2}\/\d{4})/i) || text.match(/MÊS\/ANO[\s\S]*?(\d{2}\/\d{4})/);
    console.log("Mês Ref:", mesRefMatch ? mesRefMatch[1] : null);

    // Demanda Contratada
    const demContratadaMatch = text.match(/DEMANDA FORA PONTA - KW\s*([\d\.,]+)/i);
    console.log("Demanda Contratada:", demContratadaMatch ? demContratadaMatch[1] : null);

    // Consumo Histórico
    const regexConsumo = /\b([A-Z]{3} \/ \d{4})(\d+,\d{2})(\d+,\d{2})(\d+,\d{2})(\d+,\d{2})(\d{2,3})\b/g;
    let m;
    const historico = [];
    while ((m = regexConsumo.exec(text)) !== null) {
        historico.push({
            mes: m[1],
            demandaHP: m[2],
            demandaHFP: m[3],
            consumoHP: m[4],
            consumoHFP: m[5],
            dias: m[6]
        });
    }
    console.log("Histórico:", historico);
}

main();
