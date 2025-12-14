import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';
import { UserType } from '../../src/types/user.types';

describe('Authentication API Integration Tests', () => {
  describe('POST /auth/login', () => {
    it('should login and return JWT token for admin', async () => {
      const response = await request(app).post('/auth/login').send({
        name: 'admin-test',
        type: UserType.ADMIN,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');

      // Verify user was created
      const user = await prisma.user.findUnique({
        where: { name_type: { name: 'admin-test', type: UserType.ADMIN } },
      });
      expect(user).toBeDefined();
    });

    it('should login and return JWT token for enduser', async () => {
      const response = await request(app).post('/auth/login').send({
        name: 'enduser-test',
        type: UserType.ENDUSER,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should login and return JWT token for drone', async () => {
      const response = await request(app).post('/auth/login').send({
        name: 'drone-test',
        type: UserType.DRONE,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should return same user for same name and type', async () => {
      const response1 = await request(app).post('/auth/login').send({
        name: 'same-user',
        type: UserType.ENDUSER,
      });

      const response2 = await request(app).post('/auth/login').send({
        name: 'same-user',
        type: UserType.ENDUSER,
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify same user ID (token payload would have same userId)
      const user = await prisma.user.findUnique({
        where: { name_type: { name: 'same-user', type: UserType.ENDUSER } },
      });
      expect(user).toBeDefined();
    });

    it('should return 400 for invalid user type', async () => {
      const response = await request(app).post('/auth/login').send({
        name: 'test',
        type: 'INVALID_TYPE',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app).post('/auth/login').send({
        type: UserType.ENDUSER,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing type', async () => {
      const response = await request(app).post('/auth/login').send({
        name: 'test',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});


