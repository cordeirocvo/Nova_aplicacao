import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Carregar variáveis de ambiente ANTES de importar qualquer serviço do Prisma
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valParts] = trimmed.split("=");
      process.env[key.trim()] = valParts.join("=").trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  console.log("==================================================");
  console.log("INICIANDO CARGA HISTÓRICA DE 3 ANOS DAS USINAS");
  console.log("==================================================");

  const { HistoricalBackfillService } = await import("../lib/services/historicalBackfillService");
  await HistoricalBackfillService.backfillAllUsinas(3);

  console.log("==================================================");
  console.log("CARGA HISTÓRICA DE 3 ANOS CONCLUÍDA COM SUCESSO!");
  console.log("==================================================");
  process.exit(0);
}

main().catch(err => {
  console.error("Erro durante execução do backfill:", err);
  process.exit(1);
});
