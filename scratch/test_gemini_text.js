const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
    const text = fs.readFileSync('C:\\Users\\BRUNO CORDEIRO\\.gemini\\antigravity\\scratch\\cordeiro-energia\\scratch\\enel_text.txt', 'utf-8');
    
    // We need dotenv to load the API key from the environment
    require('dotenv').config({ path: 'C:\\Users\\BRUNO CORDEIRO\\.gemini\\antigravity\\scratch\\cordeiro-energia\\.env' });
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Você é um especialista em análise de faturas de energia elétrica brasileiras.
Analise o texto desta fatura e extraia TODOS os dados possíveis no formato JSON exato abaixo.
Se algum campo não estiver disponível na fatura, retorne null para ele.

{
  "concessionaria": "nome da distribuidora (ex: CEMIG-D, CPFL, CELESC, Enel)",
  "nomeCliente": "nome completo do titular da conta",
  "endereco": "endereço completo do imóvel da instalação",
  "numeroInstalacao": "número da instalação/UC",
  "cnpjCpfTitular": "cpf ou cnpj do titular",
  "grupoTarifario": "A ou B",
  "subgrupo": "ex: A4, B3, B1, AS",
  "modalidadeTarifaria": "CONVENCIONAL ou AZUL ou VERDE ou BRANCA",
  "classeConsumo": "Residencial | Comercial | Industrial | Rural | Iluminação Pública",
  "padraoConexao": "MONOFASICO | BIFASICO | TRIFASICO",
  "tensaoFornecimento": "tensão em kV ou 'baixa tensão'",
  "demandaContratadaKW": número,
  "demandaMedidaHPKW": número,
  "demandaMedidaHFPKW": número (procure por 'Demanda Ativa HFP' ou 'Demanda Faturada-kW FORA PONTA'),
  "energiaAtivaHRKWh": número (procure por 'Energia Ativa HR'),
  "descontoIrrigante": número,
  "vencimento": "DD/MM/YYYY",
  "mesReferencia": "MMM/YYYY",
  "consumoMeses": [
    {"mes": "MM/YYYY", "kwh": número, "injetadoKWh": número ou 0, "bandeira": "Verde|Amarela|Vermelha 1|Vermelha 2"}
  ],
  "valorUltimaFatura": número em reais,
  "bandeiraTarifaria": "Verde|Amarela|Vermelha 1|Vermelha 2",
  "tusd": número em R$/kWh,
  "te": número em R$/kWh
}

TEXTO DA FATURA:
${text}

Retorne APENAS o JSON, sem texto adicional.`;

    try {
        const result = await model.generateContent(prompt);
        console.log(result.response.text());
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
