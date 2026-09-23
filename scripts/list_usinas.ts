import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function listAllUsinas() {
  const usinas = await prisma.usina.findMany({
    select: { id: true, nome: true, capacidadeKWp: true, apiFornecedor: true, apiId: true }
  });
  console.log(`Total usinas: ${usinas.length}`);
  for (const u of usinas) {
    console.log(`- [${u.id}] ${u.nome} | Cap: ${u.capacidadeKWp} kWp | API: ${u.apiFornecedor} (${u.apiId})`);
  }
}

listAllUsinas().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
