import { prisma } from "../src/lib/prisma";

async function test() {
  try {
    console.log("Prisma keys:", Object.keys(prisma));
    const count = await (prisma as any).planilhaInstalacao.count();
    console.log("Count:", count);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
