import { PrismaClient } from '../prisma/generated-client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Testing Prisma connection...");
    const usinas = await prisma.usinaFotovoltaica.findMany({ take: 1 });
    console.log("Connection successful. Found usinas:", usinas.length);
    
    console.log("Testing RelatorioTermografia query...");
    const termografias = await prisma.relatorioTermografia.findMany({
      include: { itens: true }
    });
    console.log("Query successful. Found reports:", termografias.length);
    
  } catch (error) {
    console.error("Prisma test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
