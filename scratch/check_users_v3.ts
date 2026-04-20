import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env from root
dotenv.config({ path: path.join(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log("DB URL:", process.env.DATABASE_URL)
  console.log("Checking users...")
  const users = await prisma.user.findMany()
  console.log("Found users:", users.length)
  users.forEach(u => {
    console.log(`- ${u.email} (${u.role}) - Name: ${u.name}`)
  })
}

main().catch(e => {
  console.error("ERROR:", e.message)
}).finally(() => prisma.$disconnect())
