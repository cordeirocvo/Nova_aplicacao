import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const usinas = await prisma.usina.findMany({
    where: {
      nome: { contains: 'MANGA GRANDE', mode: 'insensitive' }
    },
    select: { id: true, nome: true, apiFornecedor: true, apiId: true, capacidadeKWp: true }
  });
  console.log('Usinas Manga Grande encontradas:');
  usinas.forEach(u => console.log(JSON.stringify(u)));
}
main().catch(console.error).finally(() => prisma.$disconnect());
