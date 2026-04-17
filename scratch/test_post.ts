import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log("Tentando criar engeProjeto...");
    const p = await prisma.engeProjeto.create({
      data: {
        nome: "Teste Script",
        tipo: "SOLAR"
      }
    });
    console.log("Sucesso:", p);
    await prisma.engeProjeto.delete({ where: { id: p.id } });
    console.log("Limpeza concluída.");
  } catch (err) {
    console.error("ERRO:", err);
  } finally {
    process.exit(0);
  }
}

main();
