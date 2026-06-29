import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPool = globalThis as unknown as { pgPool?: Pool }

const getOrCreatePool = () => {
  if (globalForPool.pgPool) {
    return globalForPool.pgPool;
  }

  // Usar DATABASE_URL (porta 6543 - pooler em modo Transaction com ?pgbouncer=true) para evitar EMAXCONNSESSION (limite de 15 conexões do modo Session / DIRECT_URL)
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 4, // Limita o número de conexões simultâneas por container do Next.js
    idleTimeoutMillis: 10000, // Mantém a conexão por até 10s para reutilização, evitando reconexões agressivas
    connectionTimeoutMillis: 30000, // Limite de 30s para obter uma conexão (tolera picos de carga e cold starts)
    keepAlive: true, // Habilita TCP Keep-Alive para evitar desconexões silenciosas por firewalls/PgBouncer
  })

  pool.on('error', (err) => {
    console.error('Unexpected error on idle pg client:', err)
  })

  // Salvar no escopo global para reaproveitar conexões entre warm starts no ambiente serverless (produção/desenvolvimento)
  globalForPool.pgPool = pool;

  return pool;
}

const prismaClientSingleton = () => {
  const pool = getOrCreatePool()
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof prismaClientSingleton> }

export const prisma = globalForPrisma.prisma || prismaClientSingleton()

globalForPrisma.prisma = prisma
