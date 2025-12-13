import { Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.util';
import { UnauthorizedError } from '../utils/errors.util';
import { TokenPayload } from '../types/user.types';

export interface AuthenticatedRequest {
  user?: TokenPayload;
  headers: {
    authorization?: string;
  };
}

/**
 * Middleware to authenticate requests using JWT
 * Extracts and verifies JWT token from Authorization header
 */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = verifyToken(token);
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }

    if (error instanceof Error && error.message === 'Token has expired') {
      return next(new UnauthorizedError('Token has expired', 'TOKEN_EXPIRED'));
    }

    if (error instanceof Error && error.message === 'Invalid token') {
      return next(new UnauthorizedError('Invalid token', 'INVALID_TOKEN'));
    }

    next(new UnauthorizedError('Authentication failed'));
  }
}
