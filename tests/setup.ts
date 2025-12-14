import { PrismaClient } from '@prisma/client';

// Use a test database URL from environment or default
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for testing');
}

// Create a test Prisma client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

// Global setup: Clean database before all tests
beforeAll(async () => {
  // Clean up all tables in reverse order of dependencies
  // First clear foreign key references, then delete in order
  
  try {
    // Clear foreign key references first
    await prisma.order.updateMany({
      where: {},
      data: { assignedDroneId: null },
    });
    
    // Delete in reverse dependency order
    await prisma.job.deleteMany();
    await prisma.order.deleteMany();
    await prisma.drone.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    // Ignore errors in beforeAll - tests will handle their own setup
  }
});

// Clean up after each test
afterEach(async () => {
  // Use a robust sequential cleanup strategy:
  // 1. First, clear ALL foreign key references to avoid constraint violations
  // 2. Delete in reverse dependency order (jobs -> orders -> drones -> users)
  // 3. Sequential execution ensures proper ordering and avoids race conditions
  // 4. Each operation wrapped in try-catch to continue even if one fails
  
  try {
    // Step 1: Clear all foreign key references first
    // Clear assignedDroneId from orders (orders -> drones)
    await prisma.order.updateMany({
      where: {},
      data: { assignedDroneId: null },
    });
    
    // Clear orderId, brokenDroneId, assignedDroneId from jobs
    await prisma.job.updateMany({
      where: {},
      data: {
        orderId: null,
        brokenDroneId: null,
        assignedDroneId: null,
      },
    });
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Step 2: Delete in reverse dependency order (sequential to avoid race conditions)
  // Jobs depend on: orders, drones (via foreign keys)
  try {
    await prisma.job.deleteMany();
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Orders depend on: users (createdBy), drones (assignedDroneId - already cleared)
  try {
    await prisma.order.deleteMany();
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Drones don't have foreign key dependencies (they're referenced, not referencing)
  try {
    await prisma.drone.deleteMany();
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Users are referenced by orders (createdBy) - delete last
  try {
    await prisma.user.deleteMany();
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Close Prisma connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Export prisma for use in tests
export { prisma };
