import "dotenv/config";
import { PrismaClient } from '../../prisma/generated-client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare global {
  var prisma_v2: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma_v2 ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma_v2 = prisma
