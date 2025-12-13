import { NextFunction } from 'express';
import { UserType } from '../types/user.types';
import { ForbiddenError } from '../utils/errors.util';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Middleware to authorize requests based on user type
 * @param allowedTypes - Array of user types that are allowed to access the route
 */
export function authorize(...allowedTypes: UserType[]) {
  return (req: AuthenticatedRequest, _res: unknown, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }

    if (!allowedTypes.includes(req.user.type)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role: ${allowedTypes.join(' or ')}`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = authorize(UserType.ADMIN);

/**
 * Middleware to check if user is enduser
 */
export const requireEndUser = authorize(UserType.ENDUSER);

/**
 * Middleware to check if user is drone
 */
export const requireDrone = authorize(UserType.DRONE);
