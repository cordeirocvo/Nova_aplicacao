import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const usinaId = "cmp8hqv4400h9wgv5c9f2tdbh"; // Manga Grande 01
  
  // Buscar todas as ações corretivas de Manga Grande 01
  const acoes = await prisma.acaoCorretiva.findMany({
    where: { usinaId },
    orderBy: { createdAt: "desc" }
  });

  console.log(`Total de ações encontradas: ${acoes.length}`);
  
  // Deletar as criadas nos últimos minutos de teste que duplicaram
  const idsToDelete = [
    "cmu6u27wg00004kv5myzs884v",
    "cmu6u4dv500014kv5ijsrz9cn",
    "cmu6u5v1c00024kv5e66qe46u"
  ];

  for (const id of idsToDelete) {
    try {
      await prisma.acaoCorretiva.delete({ where: { id } });
      console.log(`Deletado teste: ${id}`);
    } catch (e) {
      console.log(`Não foi possível deletar ${id}: ${e}`);
    }
  }

  // Criar uma ação realista de Troca de Fusíveis
  const fusivelOS = await prisma.acaoCorretiva.create({
    data: {
      usinaId,
      tipoAcao: "troca_fusivel",
      dataExecucao: new Date("2026-09-05T00:00:00.000Z"),
      executadoPor: "Equipe Cordeiro O&M - Elétrica",
      observacoes: JSON.stringify({
        texto: "Substituição de 20 fusíveis gPV 15A 1000V DC e rearme das seccionadoras dos inversores 01 e 02.",
        custoIntervencaoRS: 850.0,
        status: "CONCLUIDO",
        energiaRecuperadaDiaKWh: 237.5,
        valorSalvoDiaRS: 213.75,
      })
    }
  });
  console.log(`Criada OS realista de Troca de Fusíveis: ${fusivelOS.id}`);

  // Verificar estado final
  const acoesFinais = await prisma.acaoCorretiva.findMany({
    where: { usinaId },
    orderBy: { createdAt: "desc" }
  });
  console.log(`\nEstado final das ações sanadas (${acoesFinais.length}):`);
  for (const a of acoesFinais) {
    console.log(`  - [${a.tipoAcao}] em ${a.dataExecucao.toISOString().split("T")[0]} por ${a.executadoPor}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
