import fs from 'fs';

async function testApi() {
  console.log("Iniciando requisição POST para a API local...");
  const start = Date.now();
  try {
    const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\Conta CEMIG Condomínio Pirapora.pdf';
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', blob, 'fatura.pdf');
    formData.append('projetoId', 'teste-id'); // fake id para testar
    
    const response = await fetch('http://localhost:3000/api/engenharia/fatura', {
      method: 'POST',
      body: formData
    });
    
    const end = Date.now();
    console.log(`Resposta em ${end - start}ms`);
    console.log(`Status: ${response.status}`);
    
    const text = await response.text();
    console.log("Response Text:", text);
    
  } catch (err) {
    console.error("ERRO ao fazer fetch:", err);
  }
}

testApi();
