import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.util';
import { Prisma } from '@prisma/client';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Convert Prisma errors to appropriate application errors
 */
function handlePrismaError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (error.meta?.target as string[]) || [];
        const field = target.join('.');
        return new AppError(
          `A record with this ${field} already exists`,
          409,
          'UNIQUE_CONSTRAINT_VIOLATION',
          { field }
        );
      }
      case 'P2003': {
        // Foreign key constraint violation
        const field = error.meta?.field_name as string;
        return new AppError(
          `Invalid reference: ${field || 'foreign key constraint failed'}`,
          400,
          'FOREIGN_KEY_CONSTRAINT_VIOLATION',
          { field }
        );
      }
      case 'P2025': {
        // Record not found
        return new AppError('Record not found', 404, 'NOT_FOUND');
      }
      case 'P2001': {
        // Record not found (query)
        return new AppError('Record not found', 404, 'NOT_FOUND');
      }
      default:
        return new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR', {
          code: error.code,
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Invalid data format', 400, 'VALIDATION_ERROR', {
      message: error.message,
    });
  }

  return null;
}

/**
 * Global error handler middleware
 * Must have exactly 4 parameters (err, req, res, next) for Express to recognize it as an error handler
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Handle Prisma errors first
  const prismaError = handlePrismaError(err);
  if (prismaError) {
    const response: ErrorResponse = {
      error: {
        code: prismaError.code || prismaError.name,
        message: prismaError.message,
        details: prismaError.details,
      },
    };
    res.status(prismaError.statusCode).json(response);
    return;
  }

  // Handle known application errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        code: err.code || err.name,
        message: err.message,
      },
    };

    if (err.details) {
      response.error.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle validation errors from Zod
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      },
    });
    return;
  }

  // Log unexpected errors with stack trace in development
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    console.error('Unexpected error:', err);
    console.error('Stack:', err.stack);
  } else {
    console.error('Unexpected error:', err.message);
  }

  // Handle unknown errors
  const errorResponse: ErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? err.message : 'Internal server error',
    },
  };

  if (isDevelopment && err.stack) {
    errorResponse.error.details = { stack: err.stack };
  }

  res.status(500).json(errorResponse);
}
