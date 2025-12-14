import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../src/utils/errors.util';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create AppError with default status code', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('should create AppError with custom status code', () => {
      const error = new AppError('Test error', 400);
      expect(error.statusCode).toBe(400);
    });

    it('should create AppError with code', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should create AppError with details', () => {
      const details = { field: 'test' };
      const error = new AppError('Test error', 400, 'TEST_ERROR', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with 400 status', () => {
      const error = new ValidationError('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should allow custom code', () => {
      const error = new ValidationError('Validation failed', 'CUSTOM_ERROR');
      expect(error.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create UnauthorizedError with 401 status', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Unauthorized');
    });

    it('should allow custom message and code', () => {
      const error = new UnauthorizedError('Custom message', 'CUSTOM_CODE');
      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });

  describe('ForbiddenError', () => {
    it('should create ForbiddenError with 403 status', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with 404 status', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with 409 status', () => {
      const error = new ConflictError('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('BadRequestError', () => {
    it('should create BadRequestError with 400 status', () => {
      const error = new BadRequestError('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });
  });
});


