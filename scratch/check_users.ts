import { prisma } from "../src/lib/prisma";

async function checkUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
  } catch (error) {
    console.error("Failed to fetch users:", error);
  }
}

checkUsers().finally(() => process.exit());
