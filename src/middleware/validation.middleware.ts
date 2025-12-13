import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserType } from '../types/user.types';
import { OrderStatus } from '@prisma/client';
import { ValidationError } from '../utils/errors.util';

/**
 * Validation schema for login request
 */
const loginSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  type: z.nativeEnum(UserType, {
    errorMap: () => ({ message: `Type must be one of: ${Object.values(UserType).join(', ')}` }),
  }),
});

/**
 * Location validation schema
 */
const locationSchema = z.object({
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Create order request validation
 */
const createOrderSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
});

/**
 * Update order origin/destination validation
 */
const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Update drone location validation
 */
const updateDroneLocationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Bulk orders query validation
 */
const bulkOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  assignedDroneId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0))
    .optional(),
});

/**
 * Generic validation middleware factory
 */
function createValidator<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
        return next(new ValidationError(errors, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  };
}

/**
 * Query validation middleware factory
 */
function createQueryValidator<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
        return next(new ValidationError(errors, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  };
}

/**
 * Middleware to validate login request
 */
export function validateLoginRequest(req: Request, _res: Response, next: NextFunction) {
  try {
    loginSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return next(new ValidationError(errors, 'VALIDATION_ERROR'));
    }
    next(error);
  }
}

/**
 * Middleware to validate create order request
 */
export const validateCreateOrder = createValidator(createOrderSchema);

/**
 * Middleware to validate update order origin/destination
 */
export const validateUpdateLocation = createValidator(updateLocationSchema);

/**
 * Middleware to validate update drone location
 */
export const validateUpdateDroneLocation = createValidator(updateDroneLocationSchema);

/**
 * Middleware to validate bulk orders query
 */
export const validateBulkOrdersQuery = createQueryValidator(bulkOrdersQuerySchema);
