/**
 * Custom error classes for the application
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string, details?: unknown) {
    super(message, 400, code || 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, 401, code || 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, 403, code || 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code || 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string, details?: unknown) {
    super(message, 409, code || 'CONFLICT', details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code || 'BAD_REQUEST');
  }
}
