import "dotenv/config";
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding Dyness DL5.0C...");
  
  const battery = await prisma.bateriaSistema.upsert({
    where: { id: "dyness-dl50c" },
    update: {},
    create: {
      id: "dyness-dl50c",
      fabricante: "Dyness",
      modelo: "DL5.0C",
      tecnologia: "LFP",
      capacidadeNomKWh: 5.12,
      tensaoNominalV: 51.2,
      profundidadeDescarga: 0.90,
      ciclosVida: 6000,
      correnteMaxCarga: 50,
      correnteMaxDescarga: 100,
      tempOperacaoMin: -20,
      tempOperacaoMax: 55,
      datasheetUrl: "https://www.dyness.com/product/dl5-0c"
    }
  });

  console.log("Battery seeded:", battery.modelo);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
