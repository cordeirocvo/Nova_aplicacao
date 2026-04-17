import { prisma } from '../src/lib/prisma';

async function check() {
  console.log("Keys on prisma object:", Object.keys(prisma));
  console.log("Model projetoEngenharia exists:", !!(prisma as any).projetoEngenharia);
  
  try {
    const count = await (prisma as any).projetoEngenharia.count();
    console.log("Count for projetoEngenharia:", count);
  } catch (e) {
    console.log("Error accessing projetoEngenharia:", e);
  }
}

check();
