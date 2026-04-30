
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fields = Object.keys(prisma.projetoDimensionamento);
  console.log("Fields in ProjetoDimensionamento:", fields);
  process.exit(0);
}

main();
