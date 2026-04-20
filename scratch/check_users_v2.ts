// sync-check.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Checking users...")
  const users = await prisma.user.findMany()
  console.log("Found users:", users.length)
  users.forEach(u => {
    console.log(`- ${u.email} (${u.role}) - Name: ${u.name}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
