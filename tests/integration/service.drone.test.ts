import { DroneService } from '../../src/services/drone.service';
import { prisma } from '../setup';
import { createTestUser, createTestDrone, createTestOrder } from '../helpers/test-helpers';
import { UserType } from '../../src/types/user.types';
import { DroneStatus, OrderStatus, JobType } from '@prisma/client';

describe('DroneService Integration Tests', () => {
  let droneService: DroneService;
  let drone: any;

  beforeEach(async () => {
    droneService = new DroneService();
    // Create drone first
    drone = await createTestDrone({ status: DroneStatus.AVAILABLE });
  });

  describe('markDroneBroken', () => {
    it('should create handoff job when drone breaks with assigned order', async () => {
      const testUser = await createTestUser('test-order-user', UserType.ENDUSER);
      const order = await createTestOrder({
        createdBy: testUser.user.id,
        status: OrderStatus.IN_TRANSIT,
        assignedDroneId: drone.id,
      });

      await prisma.drone.update({
        where: { id: drone.id },
        data: { status: DroneStatus.BUSY },
      });

      await droneService.markDroneBroken(drone.id);

      const brokenDrone = await prisma.drone.findUnique({ where: { id: drone.id } });
      expect(brokenDrone?.isBroken).toBe(true);
      expect(brokenDrone?.status).toBe(DroneStatus.BROKEN);

      // Verify handoff job was created
      const handoffJob = await prisma.job.findFirst({
        where: {
          type: JobType.HANDOFF,
          brokenDroneId: drone.id,
          status: 'PENDING',
        },
      });
      expect(handoffJob).toBeDefined();

      // Verify order was reset
      const resetOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(resetOrder?.status).toBe(OrderStatus.PENDING);
      expect(resetOrder?.assignedDroneId).toBeNull();
    });

    it('should mark drone as broken without creating job if no assigned order', async () => {
      // Ensure drone exists (created in beforeEach)
      const droneCheck = await prisma.drone.findUnique({ where: { id: drone.id } });
      if (!droneCheck) {
        drone = await createTestDrone({ status: DroneStatus.AVAILABLE });
      }
      await droneService.markDroneBroken(drone.id);

      const brokenDrone = await prisma.drone.findUnique({ where: { id: drone.id } });
      expect(brokenDrone?.isBroken).toBe(true);

      // Verify no handoff job was created
      const handoffJob = await prisma.job.findFirst({
        where: { type: JobType.HANDOFF, brokenDroneId: drone.id },
      });
      expect(handoffJob).toBeNull();
    });
  });

  describe('grabOrder', () => {
    it('should assign order to drone and set status to IN_TRANSIT', async () => {
      const testUser = await createTestUser('test-grab-user', UserType.ENDUSER);
      const order = await createTestOrder({
        createdBy: testUser.user.id,
        status: OrderStatus.ASSIGNED,
        assignedDroneId: drone.id,
      });

      await droneService.grabOrder(order.id, drone.id);

      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder?.status).toBe(OrderStatus.IN_TRANSIT);
      expect(updatedOrder?.currentLat).toBe(order.originLat);
      expect(updatedOrder?.currentLng).toBe(order.originLng);
      expect(updatedOrder?.eta).toBeDefined();

      const updatedDrone = await prisma.drone.findUnique({ where: { id: drone.id } });
      expect(updatedDrone?.status).toBe(DroneStatus.BUSY);
    });
  });

  describe('markOrderDelivered', () => {
    it('should mark order as delivered and free drone', async () => {
      const uniqueName = `test-deliver-user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const testUser = await createTestUser(uniqueName, UserType.ENDUSER);
      
      // Ensure user and drone exist
      let userCheck = await prisma.user.findUnique({ where: { id: testUser.user.id } });
      if (!userCheck) {
        const newUser = await createTestUser(uniqueName, UserType.ENDUSER);
        testUser.user.id = newUser.user.id;
      }
      
      const droneCheck = await prisma.drone.findUnique({ where: { id: drone.id } });
      if (!droneCheck) {
        drone = await createTestDrone({ status: DroneStatus.AVAILABLE });
      }
      
      // Create order first
      const order = await createTestOrder({
        createdBy: testUser.user.id,
        status: OrderStatus.PENDING,
      });

      // Update order to IN_TRANSIT and assign to drone
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.IN_TRANSIT,
          assignedDroneId: drone.id,
        },
      });

      await prisma.drone.update({
        where: { id: drone.id },
        data: { status: DroneStatus.BUSY },
      });

      await droneService.markOrderDelivered(order.id, drone.id);

      const deliveredOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(deliveredOrder?.status).toBe(OrderStatus.DELIVERED);
      expect(deliveredOrder?.currentLat).toBe(order.destinationLat);
      expect(deliveredOrder?.currentLng).toBe(order.destinationLng);

      const freedDrone = await prisma.drone.findUnique({ where: { id: drone.id } });
      expect(freedDrone?.status).toBe(DroneStatus.AVAILABLE);
    });
  });
});

