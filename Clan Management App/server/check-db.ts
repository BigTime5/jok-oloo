import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.member.count();
  console.log(`There are ${count} members in local dev.db`);
  const members = await prisma.member.findMany();
  console.log(members.slice(0, 5));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
