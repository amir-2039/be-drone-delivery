import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserType } from '../types/user.types';
import { OrderStatus, DroneStatus } from '@prisma/client';
import { ValidationError } from '../utils/errors.util';

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  lat: z
    .number({
      required_error: 'Latitude is required',
      invalid_type_error: 'Latitude must be a number',
    })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number({
      required_error: 'Longitude is required',
      invalid_type_error: 'Longitude must be a number',
    })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Create order request validation
 */
const createOrderSchema = z
  .object({
    origin: locationSchema,
    destination: locationSchema,
  })
  .refine(
    (data) =>
      !(data.origin.lat === data.destination.lat && data.origin.lng === data.destination.lng),
    {
      message: 'Origin and destination cannot be the same',
      path: ['destination'],
    }
  );

/**
 * Update order origin/destination validation
 */
const updateLocationSchema = z.object({
  lat: z
    .number({
      required_error: 'Latitude is required',
      invalid_type_error: 'Latitude must be a number',
    })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number({
      required_error: 'Longitude is required',
      invalid_type_error: 'Longitude must be a number',
    })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Update drone location validation
 */
const updateDroneLocationSchema = z.object({
  latitude: z
    .number({
      required_error: 'Latitude is required',
      invalid_type_error: 'Latitude must be a number',
    })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number({
      required_error: 'Longitude is required',
      invalid_type_error: 'Longitude must be a number',
    })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Bulk orders query validation
 */
const bulkOrdersQuerySchema = z.object({
  status: z
    .nativeEnum(OrderStatus, {
      errorMap: () => ({
        message: `Status must be one of: ${Object.values(OrderStatus).join(', ')}`,
      }),
    })
    .optional(),
  assignedDroneId: z.string().regex(UUID_REGEX, 'assignedDroneId must be a valid UUID').optional(),
  createdBy: z.string().regex(UUID_REGEX, 'createdBy must be a valid UUID').optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform(Number)
    .pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100'))
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/, 'Offset must be a non-negative integer')
    .transform(Number)
    .pipe(z.number().int().min(0, 'Offset cannot be negative'))
    .optional(),
});

/**
 * Admin drones query validation
 */
const adminDronesQuerySchema = z.object({
  status: z
    .nativeEnum(DroneStatus, {
      errorMap: () => ({
        message: `Status must be one of: ${Object.values(DroneStatus).join(', ')}`,
      }),
    })
    .optional(),
  isBroken: z
    .string()
    .toLowerCase()
    .refine((val) => val === 'true' || val === 'false', {
      message: 'isBroken must be "true" or "false"',
    })
    .transform((val) => val === 'true')
    .optional(),
});

/**
 * UUID parameter validation schema
 */
const uuidParamSchema = z.object({
  id: z.string().regex(UUID_REGEX, 'Invalid UUID format'),
});

/**
 * Generic validation middleware factory
 */
function createValidator<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body);
      // Replace req.body with validated and transformed data
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const errorMessage = fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
        return next(new ValidationError(errorMessage, 'VALIDATION_ERROR'));
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
      const result = schema.parse(req.query);
      // Replace req.query with validated and transformed data
      req.query = result as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const errorMessage = fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
        return next(new ValidationError(errorMessage, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  };
}

/**
 * Parameter validation middleware factory
 */
function createParamValidator<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const errorMessage = fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
        return next(new ValidationError(errorMessage, 'VALIDATION_ERROR'));
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
      const fieldErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      const errorMessage = fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
      return next(new ValidationError(errorMessage, 'VALIDATION_ERROR'));
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

/**
 * Middleware to validate admin drones query
 */
export const validateAdminDronesQuery = createQueryValidator(adminDronesQuerySchema);

/**
 * Middleware to validate UUID parameter
 */
export const validateUUIDParam = createParamValidator(uuidParamSchema);
