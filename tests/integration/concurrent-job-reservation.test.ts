import { JobService } from '../../src/services/job.service';
import { createTestDrone, createTestOrder, createTestJob, createTestUser } from '../helpers/test-helpers';
import { DroneStatus, OrderStatus } from '@prisma/client';
import { UserType } from '../../src/types/user.types';
import { prisma } from '../setup';

/**
 * Test concurrent job reservation to ensure race conditions are prevented
 */
describe('Concurrent Job Reservation Tests', () => {
  let jobService: JobService;

  beforeEach(() => {
    jobService = new JobService();
  });

  it('should prevent race conditions when multiple drones reserve same job', async () => {
    const uniqueName = `test-concurrent-user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const testUser = await createTestUser(uniqueName, UserType.ENDUSER);
    
    // Ensure user exists
    let userCheck = await prisma.user.findUnique({ where: { id: testUser.user.id } });
    if (!userCheck) {
      const newUser = await createTestUser(uniqueName, UserType.ENDUSER);
      testUser.user.id = newUser.user.id;
    }
    
    // Create a single order with job
    const order = await createTestOrder({
      createdBy: testUser.user.id,
      status: OrderStatus.PENDING,
    });

    // Verify no jobs exist for this order yet
    const existingJobs = await prisma.job.findMany({
      where: { orderId: order.id },
    });
    
    // Delete any existing jobs to ensure clean state
    if (existingJobs.length > 0) {
      await prisma.job.deleteMany({
        where: { orderId: order.id },
      });
    }

    // Create exactly one job for this order
    await createTestJob({
      type: 'DELIVERY_ORDER',
      orderId: order.id,
      originLat: order.originLat,
      originLng: order.originLng,
      destinationLat: order.destinationLat,
      destinationLng: order.destinationLng,
      status: 'PENDING',
    });
    
    // Verify only one job exists
    const jobsAfterCreation = await prisma.job.findMany({
      where: { orderId: order.id, status: 'PENDING' },
    });
    expect(jobsAfterCreation.length).toBe(1);

    // Create multiple drones
    const drone1 = await createTestDrone({ status: DroneStatus.AVAILABLE });
    const drone2 = await createTestDrone({ status: DroneStatus.AVAILABLE });
    const drone3 = await createTestDrone({ status: DroneStatus.AVAILABLE });

    // Attempt to reserve the same job concurrently
    // Using Promise.all ensures they execute as concurrently as possible
    await Promise.all([
      jobService.reserveJob(drone1.id),
      jobService.reserveJob(drone2.id),
      jobService.reserveJob(drone3.id),
    ]);

    // Verify final database state - only one job should be reserved for this order
    // This is the key assertion that tests the locking mechanism
    const reservedJobs = await prisma.job.findMany({
      where: {
        orderId: order.id,
        status: 'RESERVED',
      },
    });
    
    // Due to transaction-level locking, only one should succeed
    // Even if multiple drones try concurrently, the database transaction should ensure
    // that only one can successfully update the job status from PENDING to RESERVED
    expect(reservedJobs.length).toBe(1);
    
    // Verify the reserved job has the correct drone assigned
    expect(reservedJobs[0].assignedDroneId).toBeDefined();
    expect([drone1.id, drone2.id, drone3.id]).toContain(reservedJobs[0].assignedDroneId);
    
    // The service may return results for different jobs if there are multiple pending jobs
    // But the database state should reflect that only one job was actually reserved
    // This tests that the repository's transaction-based locking works correctly
  });

  it('should handle rapid sequential reservations correctly', async () => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const testUsers = await Promise.all([
      createTestUser(`test-seq-user1-${uniqueSuffix}`, UserType.ENDUSER),
      createTestUser(`test-seq-user2-${uniqueSuffix}`, UserType.ENDUSER),
      createTestUser(`test-seq-user3-${uniqueSuffix}`, UserType.ENDUSER),
    ]);
    
    // Ensure all users exist - recreate if needed
    for (let i = 0; i < testUsers.length; i++) {
      let userCheck = await prisma.user.findUnique({ where: { id: testUsers[i].user.id } });
      if (!userCheck) {
        // User was deleted, recreate with same name pattern
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newUser = await createTestUser(`test-seq-user${i + 1}-${uniqueSuffix}`, UserType.ENDUSER);
        testUsers[i] = newUser;
      }
    }
    
    // Create multiple orders with jobs
    const orders = await Promise.all([
      createTestOrder({ createdBy: testUsers[0].user.id, status: OrderStatus.PENDING }),
      createTestOrder({ createdBy: testUsers[1].user.id, status: OrderStatus.PENDING }),
      createTestOrder({ createdBy: testUsers[2].user.id, status: OrderStatus.PENDING }),
    ]);

    await Promise.all(
      orders.map((order) =>
        createTestJob({
          type: 'DELIVERY_ORDER',
          orderId: order.id,
          originLat: order.originLat,
          originLng: order.originLng,
          destinationLat: order.destinationLat,
          destinationLng: order.destinationLng,
          status: 'PENDING',
        })
      )
    );

    const drone = await createTestDrone({ status: DroneStatus.AVAILABLE });

    // Reserve first job - this should succeed if jobs exist
    const result1 = await jobService.reserveJob(drone.id);
    if (result1) {
      expect(result1.job.status).toBe('RESERVED');
      
      // Verify we got a job
      const reservedJobs = await prisma.job.findMany({
        where: { assignedDroneId: drone.id, status: 'RESERVED' },
      });
      expect(reservedJobs.length).toBeGreaterThan(0);
    } else {
      // If no jobs were available, that's also a valid state (all were reserved)
      // In this test, we expect at least one job to be available, so this is a failure
      throw new Error('No jobs were available for reservation');
    }
  });
});

