import request from 'supertest';
import app from '../../src/app';
import { createTestUser } from '../helpers/test-helpers';
import { UserType } from '../../src/types/user.types';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../setup';

describe('Orders API Integration Tests', () => {
  let endUserToken: string;
  let endUserId: string;
  let adminToken: string;

  beforeEach(async () => {
    // Create users with unique names to avoid conflicts
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const endUser = await createTestUser(`test-enduser-api-${uniqueSuffix}`, UserType.ENDUSER);
    endUserToken = endUser.token;
    endUserId = endUser.user.id;

    const admin = await createTestUser(`test-admin-api-${uniqueSuffix}`, UserType.ADMIN);
    adminToken = admin.token;
    
    // Defensive check - verify users exist
    const endUserCheck = await prisma.user.findUnique({ where: { id: endUserId } });
    if (!endUserCheck) {
      const newEndUser = await createTestUser(`test-enduser-api-${uniqueSuffix}`, UserType.ENDUSER);
      endUserId = newEndUser.user.id;
      endUserToken = newEndUser.token;
    }
  });

  describe('POST /api/orders', () => {
    it('should create order with valid data', async () => {
      // Ensure user exists - check and recreate if needed
      let userCheck = await prisma.user.findUnique({ where: { id: endUserId } });
      if (!userCheck) {
        // User was deleted, recreate with unique name
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newUser = await createTestUser(`test-enduser-api-${uniqueSuffix}`, UserType.ENDUSER);
        endUserId = newUser.user.id;
        endUserToken = newUser.token;
      }
      
      // Double-check user exists right before API call
      userCheck = await prisma.user.findUnique({ where: { id: endUserId } });
      if (!userCheck) {
        // Recreate one more time
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newUser = await createTestUser(`test-enduser-api-${uniqueSuffix}`, UserType.ENDUSER);
        endUserId = newUser.user.id;
        endUserToken = newUser.token;
      }

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${endUserToken}`)
        .send({
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(OrderStatus.PENDING);
      expect(response.body.createdBy).toBe(endUserId);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).post('/api/orders').send({
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.7849, lng: -122.4094 },
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${endUserToken}`)
        .send({
          origin: { lat: 200, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 403 for non-enduser', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/orders', () => {
    it('should return user orders', async () => {
      // Recreate user if needed (defensive)
      let userCheck = await prisma.user.findUnique({ where: { id: endUserId } });
      if (!userCheck) {
        const newUser = await createTestUser('test-enduser-api', UserType.ENDUSER);
        endUserId = newUser.user.id;
        endUserToken = newUser.token;
      }

      // Create order
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${endUserToken}`)
        .send({
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
        });

      if (createResponse.status !== 201) {
        console.error('Failed to create order in GET test:', createResponse.status, createResponse.body);
      }
      expect(createResponse.status).toBe(201);

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details with progress', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${endUserToken}`)
        .send({
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
        });

      const orderId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('currentLocation');
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/orders/invalid-uuid')
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('should withdraw pending order', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${endUserToken}`)
        .send({
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
        });

      const orderId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${endUserToken}`);

      expect(response.status).toBe(204);
    });
  });
});

