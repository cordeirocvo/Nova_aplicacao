import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Keys in prisma client:");
  console.log(Object.keys(prisma).filter(k => !k.startsWith("_")));
}

main().catch(console.error);
