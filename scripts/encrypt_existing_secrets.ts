import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { CryptoService } from "../src/lib/security/cryptoService";

async function main() {
  console.log("=================================================");
  console.log(" INICIANDO MIGRAÇÃO: CRIPTOGRAFIA DE SEGREDOS");
  console.log("=================================================");

  let totalEncrypted = 0;

  // 1. ManufacturerAPI
  const manufacturers = await prisma.manufacturerAPI.findMany();
  console.log(`\n[1/3] Verificando ${manufacturers.length} fabricantes em ManufacturerAPI...`);
  for (const m of manufacturers) {
    let shouldUpdate = false;
    let newUserKey = m.userKey;
    let newSecretKey = m.secretKey;

    if (m.userKey && !CryptoService.isEncrypted(m.userKey)) {
      newUserKey = CryptoService.encrypt(m.userKey);
      shouldUpdate = true;
    }

    if (m.secretKey && !CryptoService.isEncrypted(m.secretKey)) {
      newSecretKey = CryptoService.encrypt(m.secretKey);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await prisma.manufacturerAPI.update({
        where: { id: m.id },
        data: {
          userKey: newUserKey,
          secretKey: newSecretKey,
        },
      });
      totalEncrypted++;
      console.log(`  ✓ Fabricante ${m.name} criptografado com sucesso.`);
    } else {
      console.log(`  - Fabricante ${m.name} já protegido ou sem segredos.`);
    }
  }

  // 2. Usinas
  const usinas = await prisma.usina.findMany();
  console.log(`\n[2/3] Verificando ${usinas.length} usinas em Usina...`);
  for (const u of usinas) {
    let shouldUpdate = false;
    let newApiKey = u.apiKey;
    let newApiSecret = u.apiSecret;

    if (u.apiKey && !CryptoService.isEncrypted(u.apiKey)) {
      newApiKey = CryptoService.encrypt(u.apiKey);
      shouldUpdate = true;
    }

    if (u.apiSecret && !CryptoService.isEncrypted(u.apiSecret)) {
      newApiSecret = CryptoService.encrypt(u.apiSecret);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await prisma.usina.update({
        where: { id: u.id },
        data: {
          apiKey: newApiKey,
          apiSecret: newApiSecret,
        },
      });
      totalEncrypted++;
      console.log(`  ✓ Usina ${u.nome} criptografada com sucesso.`);
    } else {
      console.log(`  - Usina ${u.nome} já protegida ou sem segredos.`);
    }
  }

  // 3. Estações Solarimétricas
  const estacoes = await prisma.estacaoSolarimetrica.findMany();
  console.log(`\n[3/3] Verificando ${estacoes.length} estações solarimétricas...`);
  for (const e of estacoes) {
    let shouldUpdate = false;
    let newApiKey = e.apiKey;
    let newApiSecret = e.apiSecret;
    let newSenha = e.senha;

    if (e.apiKey && !CryptoService.isEncrypted(e.apiKey)) {
      newApiKey = CryptoService.encrypt(e.apiKey);
      shouldUpdate = true;
    }

    if (e.apiSecret && !CryptoService.isEncrypted(e.apiSecret)) {
      newApiSecret = CryptoService.encrypt(e.apiSecret);
      shouldUpdate = true;
    }

    if (e.senha && !CryptoService.isEncrypted(e.senha)) {
      newSenha = CryptoService.encrypt(e.senha);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await prisma.estacaoSolarimetrica.update({
        where: { id: e.id },
        data: {
          apiKey: newApiKey,
          apiSecret: newApiSecret,
          senha: newSenha,
        },
      });
      totalEncrypted++;
      console.log(`  ✓ Estação ${e.nome} criptografada com sucesso.`);
    } else {
      console.log(`  - Estação ${e.nome} já protegida ou sem segredos.`);
    }
  }

  console.log("\n=================================================");
  console.log(` MIGRAÇÃO CONCLUÍDA! Total de registros protegidos: ${totalEncrypted}`);
  console.log("=================================================\n");
}

main()
  .catch((err) => {
    console.error("Erro durante a migração:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
