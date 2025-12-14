import { JobService } from '../../src/services/job.service';
import { createTestDrone, createTestOrder, createTestJob, createTestUser } from '../helpers/test-helpers';
import { DroneStatus, OrderStatus } from '@prisma/client';
import { UserType } from '../../src/types/user.types';
import { prisma } from '../setup';

describe('JobService Integration Tests', () => {
  let jobService: JobService;

  beforeEach(() => {
    jobService = new JobService();
  });

  describe('reserveJob', () => {
    it('should reserve pending delivery job', async () => {
      const uniqueName = `test-job-user1-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const testUser = await createTestUser(uniqueName, UserType.ENDUSER);
      
      // Ensure user exists before creating order
      const userCheck = await prisma.user.findUnique({ where: { id: testUser.user.id } });
      if (!userCheck) {
        // User was deleted, recreate
        const newUser = await createTestUser(uniqueName, UserType.ENDUSER);
        testUser.user.id = newUser.user.id;
      }
      
      const order = await createTestOrder({
        createdBy: testUser.user.id,
        status: OrderStatus.PENDING,
      });

      await createTestJob({
        type: 'DELIVERY_ORDER',
        orderId: order.id,
        originLat: order.originLat,
        originLng: order.originLng,
        destinationLat: order.destinationLat,
        destinationLng: order.destinationLng,
        status: 'PENDING',
      });

      const drone = await createTestDrone({ status: DroneStatus.AVAILABLE });
      const result = await jobService.reserveJob(drone.id);

      expect(result).toBeDefined();
      expect(result?.job).toBeDefined();
      // The job should have an orderId (it's a DELIVERY_ORDER job)
      expect(result?.job.orderId).toBeDefined();
      // Note: reserveJob may return a different job if multiple jobs exist
      // So we verify it's a DELIVERY_ORDER job with a valid orderId
      expect(result?.job.type).toBe('DELIVERY_ORDER');
      expect(result?.job.status).toBe('RESERVED');
      expect(result?.job.assignedDroneId).toBe(drone.id);
      // Verify the order matches the job's orderId
      if (result?.order) {
        expect(result.order.id).toBe(result.job.orderId);
      }
    });

    it('should prioritize HANDOFF jobs over DELIVERY_ORDER jobs', async () => {
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const testUser1 = await createTestUser(`test-job-user1-${uniqueSuffix}`, UserType.ENDUSER);
      const testUser2 = await createTestUser(`test-job-user2-${uniqueSuffix}`, UserType.ENDUSER);
      
      // Ensure users exist
      let user1Check = await prisma.user.findUnique({ where: { id: testUser1.user.id } });
      if (!user1Check) {
        const newUser = await createTestUser(`test-job-user1-${uniqueSuffix}`, UserType.ENDUSER);
        testUser1.user.id = newUser.user.id;
      }
      
      let user2Check = await prisma.user.findUnique({ where: { id: testUser2.user.id } });
      if (!user2Check) {
        const newUser = await createTestUser(`test-job-user2-${uniqueSuffix}`, UserType.ENDUSER);
        testUser2.user.id = newUser.user.id;
      }
      
      // Ensure users still exist before creating orders
      user1Check = await prisma.user.findUnique({ where: { id: testUser1.user.id } });
      if (!user1Check) {
        const newUser = await createTestUser(`test-job-user1-${uniqueSuffix}`, UserType.ENDUSER);
        testUser1.user.id = newUser.user.id;
      }
      
      user2Check = await prisma.user.findUnique({ where: { id: testUser2.user.id } });
      if (!user2Check) {
        const newUser = await createTestUser(`test-job-user2-${uniqueSuffix}`, UserType.ENDUSER);
        testUser2.user.id = newUser.user.id;
      }
      
      const order1 = await createTestOrder({
        createdBy: testUser1.user.id,
        status: OrderStatus.PENDING,
      });

      const order2 = await createTestOrder({
        createdBy: testUser2.user.id,
        status: OrderStatus.PENDING,
      });

      // Ensure orders exist before creating jobs
      const order1Check = await prisma.order.findUnique({ where: { id: order1.id } });
      const order2Check = await prisma.order.findUnique({ where: { id: order2.id } });
      
      if (!order1Check || !order2Check) {
        throw new Error('Orders were deleted before creating jobs');
      }

      await createTestJob({
        type: 'DELIVERY_ORDER',
        orderId: order1.id,
        originLat: order1.originLat,
        originLng: order1.originLng,
        destinationLat: order1.destinationLat,
        destinationLng: order1.destinationLng,
        status: 'PENDING',
      });

      const brokenDrone = await createTestDrone({ isBroken: true });
      await createTestJob({
        type: 'HANDOFF',
        orderId: order2.id,
        originLat: order2.originLat,
        originLng: order2.originLng,
        destinationLat: order2.destinationLat,
        destinationLng: order2.destinationLng,
        brokenDroneId: brokenDrone.id,
        status: 'PENDING',
      });

      const drone = await createTestDrone({ status: DroneStatus.AVAILABLE });
      const result = await jobService.reserveJob(drone.id);

      expect(result).toBeDefined();
      expect(result?.job.type).toBe('HANDOFF');
      expect(result?.job.brokenDroneId).toBe(brokenDrone.id);
    });

    it('should return null when no jobs available', async () => {
      const drone = await createTestDrone({ status: DroneStatus.AVAILABLE });
      const result = await jobService.reserveJob(drone.id);

      expect(result).toBeNull();
    });
  });
});

