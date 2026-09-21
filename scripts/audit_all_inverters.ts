import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const usinas = await prisma.usina.findMany({
    include: { inversores: true },
    orderBy: { nome: 'asc' },
  });

  console.log(`=== AUDITORIA DE USINAS E INVERSORES (${usinas.length} USINAS) ===`);
  for (const u of usinas) {
    const somaKW = u.inversores.reduce((acc, i) => acc + (i.potenciaNominalKW || 0), 0);
    console.log(`\nUsina: ${u.nome} (ID: ${u.id})`);
    console.log(`- Capacidade CC (kWp): ${u.capacidadeKWp}`);
    console.log(`- Inversores no banco (${u.inversores.length}): soma = ${somaKW} kW`);
    for (const inv of u.inversores) {
      console.log(`   * SN: ${inv.numeroSerie} | Modelo: ${inv.modelo} | Potência: ${inv.potenciaNominalKW} kW`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
