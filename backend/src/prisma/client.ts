import { PrismaClient } from '@prisma/client';
import { applyPrismaEventGuard } from '../middleware/prismaEventGuard';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Apply event guard middleware
    applyPrismaEventGuard(prisma);
  }

  return prisma;
}

export { PrismaClient };












