import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserType } from '../types/user.types';
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
