import { prisma } from './src/lib/prisma';

async function main() {
  const inverters = await prisma.inversorSolar.findMany({
    select: { id: true, fabricante: true, modelo: true, potenciaNominalKW: true, fase: true }
  });
  console.log(JSON.stringify(inverters, null, 2));
}

main();
