import { PrismaClient } from '@prisma/client';

export default async function globalTeardown() {
  // Clean up any open Prisma connections so Jest can exit cleanly
  const prisma = new PrismaClient();
  await prisma.$disconnect();
}
