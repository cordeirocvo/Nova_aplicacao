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
    max: 4, // Supabase limita a 15 conexões totais em modo Session; reduzir evita EMAXCONNSESSION
    idleTimeoutMillis: 1000, // Fecha conexões ociosas após 1s para evitar dead sockets do PgBouncer
    connectionTimeoutMillis: 15000,
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
