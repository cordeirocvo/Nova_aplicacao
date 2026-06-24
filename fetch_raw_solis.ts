import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import { SolisService } from "./src/lib/services/solisService";

async function main() {
  const usinas = await prisma.usina.findMany({
    where: { apiFornecedor: "SOLIS" }
  });
  
  if (usinas.length === 0) {
    console.log("Nenhuma usina Solis encontrada");
    return;
  }
  
  const usina = usinas[0];
  console.log(`Usina selecionada: ${usina.nome} (API ID: ${usina.apiId})`);
  
  const manufacturers = await prisma.manufacturerAPI.findMany();
  const globalSolis = manufacturers.find(m => m.name === "SOLIS");
  
  const key = (usina.apiKey && usina.apiKey !== '********' && usina.apiKey.trim() !== '') 
    ? usina.apiKey.trim() 
    : (globalSolis?.userKey || '').trim();
    
  const secret = (usina.apiSecret && usina.apiSecret !== '********' && usina.apiSecret.trim() !== '') 
    ? usina.apiSecret.trim() 
    : (globalSolis?.secretKey || '').trim();

  // Vamos pegar a data de hoje formatada yyyy-MM-dd
  const today = new Date();
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const dateStr = formatDate(today);

  console.log(`Buscando dados históricos de ${dateStr} para usina ${usina.nome}...`);
  const data = await SolisService.getStationDay(usina.apiId, dateStr, key, secret);
  
  if (data) {
    console.log(`Retorno com sucesso! Total de pontos: ${data.length || 0}`);
    console.log("Primeiros 5 pontos:");
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
    
    console.log("Pontos do meio (geração máxima):");
    const mid = Math.floor(data.length / 2);
    console.log(JSON.stringify(data.slice(mid - 2, mid + 3), null, 2));
  } else {
    console.log("Erro ou retorno vazio");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
