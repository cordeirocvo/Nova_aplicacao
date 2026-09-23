import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const u = await prisma.usina.findUnique({
    where: { id: 'cmp8hqv4400h9wgv5c9f2tdbh' },
    include: { inversores: true },
  });
  console.log('USINA:', {
    nome: u?.nome,
    capacidadeKWp: u?.capacidadeKWp,
    inversoresCount: u?.inversores.length,
    inversores: u?.inversores.map(i => ({ sn: i.numeroSerie, kw: i.potenciaNominalKW })),
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
