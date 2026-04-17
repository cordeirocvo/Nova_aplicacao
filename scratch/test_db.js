const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Tentando criar projeto...");
    const p = await prisma.projetoEngenharia.create({
      data: {
        nome: "Teste Script",
        cliente: "Cliente Script",
        tipo: "SOLAR"
      }
    });
    console.log("Sucesso:", p);
  } catch (e) {
    console.error("ERRO DETALHADO:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
