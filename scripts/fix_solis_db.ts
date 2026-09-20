import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("=== ATUALIZANDO CREDENCIAIS SOLIS NO BANCO DE DADOS ===");
  const validKey = "1300319277300416147";
  const validSecret = "f5ad8e6d759d469fb8610e2155f9a20c";
  const apiUrl = "https://www.soliscloud.com:13333";

  // 1. Atualiza ManufacturerAPI
  const m = await prisma.manufacturerAPI.upsert({
    where: { name: "SOLIS" },
    update: {
      userKey: validKey,
      secretKey: validSecret,
      apiUrl: apiUrl,
      active: true
    },
    create: {
      name: "SOLIS",
      userKey: validKey,
      secretKey: validSecret,
      apiUrl: apiUrl,
      active: true
    }
  });
  console.log("ManufacturerAPI SOLIS atualizado com sucesso:", {
    name: m.name,
    userKey: m.userKey,
    secretKey: m.secretKey ? m.secretKey.slice(0, 6) + '...' : null,
    apiUrl: m.apiUrl
  });

  // 2. Limpa apiSecret corrompido ('********') nas usinas Solis para herdarem o secret oficial do fabricante
  const solisUsinas = await prisma.usina.findMany({
    where: { apiFornecedor: { equals: 'SOLIS', mode: 'insensitive' } }
  });

  for (const u of solisUsinas) {
    await prisma.usina.update({
      where: { id: u.id },
      data: {
        apiKey: validKey,
        apiSecret: null // null garante que usará o secretKey centralizado do ManufacturerAPI
      }
    });
    console.log(`Usina ${u.nome} atualizada: apiKey=${validKey}, apiSecret=null (usa global)`);
  }

  console.log("Atualização concluída com sucesso!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
