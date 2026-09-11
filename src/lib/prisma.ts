import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPool = globalThis as unknown as { pgPool?: Pool }

export const getOrCreatePool = () => {
  if (globalForPool.pgPool) {
    return globalForPool.pgPool;
  }

  let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const pool = new Pool({
    connectionString,
    ssl: false,
    max: 4,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
  })

  pool.on('error', (err) => {
    console.error('Unexpected error on idle pg client:', err)
  })

  globalForPool.pgPool = pool;
  return pool;
}

const prismaClientSingleton = () => {
  const pool = getOrCreatePool()
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof prismaClientSingleton> }

const getPrismaInstance = () => {
  if (globalForPrisma.prisma && (globalForPrisma.prisma as any).funcionarioCanteiro) {
    return globalForPrisma.prisma;
  }
  const client = prismaClientSingleton();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaInstance()
