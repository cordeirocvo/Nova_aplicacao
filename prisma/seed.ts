import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({})

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cordeiroenergia.com.br' },
    update: {},
    create: {
      email: 'admin@cordeiroenergia.com.br',
      name: 'Administrador',
      password: 'admin123', // Em uma app real, deve ser hashed
      role: 'ADMIN',
    },
  })

  const tv = await prisma.user.upsert({
    where: { email: 'tv@cordeiroenergia.com.br' },
    update: {},
    create: {
      email: 'tv@cordeiroenergia.com.br',
      name: 'Dashboard TV',
      password: 'tv123',
      role: 'TV',
    },
  })

  console.log({ admin, tv })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
