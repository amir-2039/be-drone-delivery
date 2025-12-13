import { PrismaClient } from '@prisma/client';

/**
 * Shared PrismaClient instance
 * Create a single instance to be reused across all repositories
 * This ensures connection pooling and prevents multiple database connections
 */
export const prisma = new PrismaClient();

// Optional: Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
