import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const estacaoId = 'cmu5tx1rm0000vov58nlowxdk'; // Estação Sigma Manga Grande

  // 1. Vincular Manga Grande 02
  const u2 = await prisma.usina.update({
    where: { id: 'cmp8qki8u00050wv5m092pu9g' },
    data: {
      estacao: { connect: { id: estacaoId } },
      capacidadeKWp: 1400.0,
    }
  });
  console.log('Manga Grande 02 atualizada:', u2.nome, '| Capacidade:', u2.capacidadeKWp);

  // 2. Vincular Manga Grande 03
  const u3 = await prisma.usina.update({
    where: { id: 'cmtur27em00nel4v55jwzfpah' },
    data: {
      estacao: { connect: { id: estacaoId } },
      capacidadeKWp: 1400.0,
    }
  });
  console.log('Manga Grande 03 atualizada:', u3.nome, '| Capacidade:', u3.capacidadeKWp);
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
