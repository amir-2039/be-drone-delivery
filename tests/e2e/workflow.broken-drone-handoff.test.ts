import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createTestDrone } from '../helpers/test-helpers';
import { UserType } from '../../src/types/user.types';
import { OrderStatus, DroneStatus, JobType } from '@prisma/client';
import { prisma } from '../setup';
import { generateToken } from '../../src/utils/jwt.util';

/**
 * E2E Test: Broken Drone Handoff Workflow
 * Tests: Drone breaks with order → Handoff job created → Another drone picks it up → Delivers
 */
describe('E2E: Broken Drone Handoff Workflow', () => {
  let endUserToken: string;
  let drone1Token: string;
  let drone1Id: string;
  let drone2Token: string;
  let drone2Id: string;

  beforeEach(async () => {
    const endUser = await createTestUser('e2e-handoff-enduser', UserType.ENDUSER);
    endUserToken = endUser.token;

    // Create drone 1
    const drone1 = await createTestDrone({ status: DroneStatus.AVAILABLE });
    drone1Id = drone1.id;
    const drone1User = await prisma.user.create({
      data: { id: drone1Id, name: 'e2e-drone1', type: UserType.DRONE },
    });
    drone1Token = generateToken({
      userId: drone1User.id,
      name: drone1User.name,
      type: drone1User.type as UserType,
    });

    // Create drone 2
    const drone2 = await createTestDrone({ status: DroneStatus.AVAILABLE });
    drone2Id = drone2.id;
    const drone2User = await prisma.user.create({
      data: { id: drone2Id, name: 'e2e-drone2', type: UserType.DRONE },
    });
    drone2Token = generateToken({
      userId: drone2User.id,
      name: drone2User.name,
      type: drone2User.type as UserType,
    });
  });

  it('should complete broken drone handoff workflow', async () => {
    // Step 1: EndUser submits order
    const createOrderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${endUserToken}`)
      .send({
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.7849, lng: -122.4094 },
      });

    expect(createOrderResponse.status).toBe(201);
    expect(createOrderResponse.body.status).toBe(OrderStatus.PENDING);

    const orderId = createOrderResponse.body.id;

    // Step 2: Drone 1 reserves and grabs order
    const reserveResponse = await request(app)
      .post('/api/drones/jobs/reserve')
      .set('Authorization', `Bearer ${drone1Token}`);

    expect(reserveResponse.status).toBe(200);
    expect(reserveResponse.body.job).toBeDefined();
    expect(reserveResponse.body.job.orderId).toBe(orderId);

    // Verify order was assigned during reservation
    let order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.assignedDroneId).toBe(drone1Id);
    expect(order?.status).toBe(OrderStatus.ASSIGNED);

    await request(app)
      .post(`/api/drones/orders/${orderId}/grab`)
      .set('Authorization', `Bearer ${drone1Token}`);

    // Verify drone 1 has the order (now IN_TRANSIT)
    order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.assignedDroneId).toBe(drone1Id);
    expect(order?.status).toBe(OrderStatus.IN_TRANSIT);

    // Step 3: Drone 1 marks itself as broken
    const breakResponse = await request(app)
      .put('/api/drones/status/broken')
      .set('Authorization', `Bearer ${drone1Token}`);

    expect(breakResponse.status).toBe(204);

    // Verify drone 1 is broken
    const brokenDrone = await prisma.drone.findUnique({ where: { id: drone1Id } });
    expect(brokenDrone?.isBroken).toBe(true);
    expect(brokenDrone?.status).toBe(DroneStatus.BROKEN);

    // Verify handoff job was created
    const handoffJob = await prisma.job.findFirst({
      where: {
        type: JobType.HANDOFF,
        brokenDroneId: drone1Id,
        status: 'PENDING',
      },
    });
    expect(handoffJob).toBeDefined();
    expect(handoffJob?.orderId).toBe(orderId);
    expect(handoffJob?.originLat).toBe(brokenDrone?.currentLat);
    expect(handoffJob?.originLng).toBe(brokenDrone?.currentLng);

    // Verify order was reset
    order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.PENDING);
    expect(order?.assignedDroneId).toBeNull();

    // Step 4: Drone 2 reserves handoff job
    const reserveHandoffResponse = await request(app)
      .post('/api/drones/jobs/reserve')
      .set('Authorization', `Bearer ${drone2Token}`);

    expect(reserveHandoffResponse.status).toBe(200);
    expect(reserveHandoffResponse.body.job).toBeDefined();
    expect(reserveHandoffResponse.body.job.type).toBe('HANDOFF');
    expect(reserveHandoffResponse.body.job.brokenDroneId).toBe(drone1Id);
    expect(reserveHandoffResponse.body.job.orderId).toBe(orderId);

    // Step 5: Drone 2 grabs order from broken drone location
    const grabHandoffResponse = await request(app)
      .post(`/api/drones/orders/${orderId}/grab`)
      .set('Authorization', `Bearer ${drone2Token}`);

    expect(grabHandoffResponse.status).toBe(204);

    // Verify drone 2 now has the order
    order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.assignedDroneId).toBe(drone2Id);
    expect(order?.status).toBe(OrderStatus.IN_TRANSIT);

    // Step 6: Drone 2 delivers order
    const deliverResponse = await request(app)
      .put(`/api/drones/orders/${orderId}/delivered`)
      .set('Authorization', `Bearer ${drone2Token}`);

    expect(deliverResponse.status).toBe(204);

    // Verify final state
    const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(finalOrder?.status).toBe(OrderStatus.DELIVERED);

    const finalDrone2 = await prisma.drone.findUnique({ where: { id: drone2Id } });
    expect(finalDrone2?.status).toBe(DroneStatus.AVAILABLE);
  });
});
