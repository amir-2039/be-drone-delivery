import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createTestDrone } from '../helpers/test-helpers';
import { UserType } from '../../src/types/user.types';
import { OrderStatus, DroneStatus } from '@prisma/client';
import { prisma } from '../setup';
import { generateToken } from '../../src/utils/jwt.util';

/**
 * E2E Test: Complete Order Delivery Workflow
 * Tests the full flow: Order submission → Job reservation → Order grabbing → Delivery
 */
describe('E2E: Order Delivery Workflow', () => {
  let endUserToken: string;
  let droneToken: string;
  let droneId: string;

  beforeEach(async () => {
    const endUser = await createTestUser('e2e-enduser', UserType.ENDUSER);
    endUserToken = endUser.token;

    // Create drone first
    const drone = await createTestDrone({ status: DroneStatus.AVAILABLE });
    droneId = drone.id;

    // Create user with same ID as drone
    await prisma.user.deleteMany({ where: { name: 'e2e-drone', type: UserType.DRONE } });
    const droneUser = await prisma.user.create({
      data: { id: droneId, name: 'e2e-drone', type: UserType.DRONE },
    });

    droneToken = generateToken({
      userId: droneUser.id,
      name: droneUser.name,
      type: droneUser.type as UserType,
    });
  });

  it('should complete full order delivery workflow', async () => {
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

    // Step 2: Drone reserves job (this also assigns the order to the drone)
    const reserveJobResponse = await request(app)
      .post('/api/drones/jobs/reserve')
      .set('Authorization', `Bearer ${droneToken}`);

    expect(reserveJobResponse.status).toBe(200);
    expect(reserveJobResponse.body.job).toBeDefined();
    expect(reserveJobResponse.body.job.orderId).toBe(orderId);
    expect(reserveJobResponse.body.job.type).toBe('DELIVERY_ORDER');

    // Verify order was assigned to drone by reserveJob
    // Note: reserveJob assigns the order to the drone and sets status to ASSIGNED
    const orderAfterReserve = await prisma.order.findUnique({ where: { id: orderId } });
    expect(orderAfterReserve?.assignedDroneId).toBe(droneId);
    expect(orderAfterReserve?.status).toBe(OrderStatus.ASSIGNED);

    // Step 3: Drone grabs order (changes status from ASSIGNED to IN_TRANSIT)
    const grabOrderResponse = await request(app)
      .post(`/api/drones/orders/${orderId}/grab`)
      .set('Authorization', `Bearer ${droneToken}`);

    expect(grabOrderResponse.status).toBe(204);

    // Verify order status changed
    const orderAfterGrab = await prisma.order.findUnique({ where: { id: orderId } });
    expect(orderAfterGrab?.status).toBe(OrderStatus.IN_TRANSIT);
    expect(orderAfterGrab?.assignedDroneId).toBe(droneId);

    // Step 4: Drone updates location (multiple times)
    const locationUpdate1 = await request(app)
      .put('/api/drones/location')
      .set('Authorization', `Bearer ${droneToken}`)
      .send({
        latitude: 37.7799,
        longitude: -122.4144,
      });

    expect(locationUpdate1.status).toBe(200);
    expect(locationUpdate1.body.status).toBe('ok');
    expect(locationUpdate1.body.assigned_order).toBeDefined();
    expect(locationUpdate1.body.assigned_order.id).toBe(orderId);

    // Step 5: Drone marks order as delivered
    const deliverResponse = await request(app)
      .put(`/api/drones/orders/${orderId}/delivered`)
      .set('Authorization', `Bearer ${droneToken}`);

    expect(deliverResponse.status).toBe(204);

    // Verify final state
    const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(finalOrder?.status).toBe(OrderStatus.DELIVERED);
    expect(finalOrder?.currentLat).toBe(37.7849); // destination
    expect(finalOrder?.currentLng).toBe(-122.4094);

    const finalDrone = await prisma.drone.findUnique({ where: { id: droneId } });
    expect(finalDrone?.status).toBe(DroneStatus.AVAILABLE);

    // Verify enduser can see delivered order
    const orderDetailsResponse = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${endUserToken}`);

    expect(orderDetailsResponse.status).toBe(200);
    expect(orderDetailsResponse.body.status).toBe(OrderStatus.DELIVERED);
    expect(orderDetailsResponse.body.progress).toBe('Delivered');
  });
});
