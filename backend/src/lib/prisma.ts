import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // This helps us see what SQL Prisma is running in the terminal
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
