import { prisma } from "../src/lib/prisma";

async function testQuery() {
  try {
    const chargers = await (prisma as any).carregador.findMany();
    console.log("Success! Found chargers:", chargers.length);
  } catch (error: any) {
    console.error("Prisma Query Failed:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
  }
}

testQuery().finally(() => process.exit());
